import { createJob, getJobStatus } from "@/queue/worker";
import type { TemplateId, SourceType } from "./types";
import { extractYouTubeId } from "./youtube";
import { parseGitHubUrl } from "./github";

const POLL_INTERVAL_MS = 5_000;
const MAX_WAIT_MS = 10 * 60 * 1000;

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Store pending inputs per chat: user sends text/images, then picks a template
interface PendingInput {
  input: string;       // full user message (used as prompt context)
  sourceUrl?: string;  // extracted URL (YouTube/GitHub) — separate from prompt text
  inputType: SourceType;
  assets: string[];
}

declare global {
  // eslint-disable-next-line no-var
  var __pendingInputs: Map<number, PendingInput> | undefined;
}

const pendingInputs: Map<number, PendingInput> =
  global.__pendingInputs ?? (global.__pendingInputs = new Map());

// -- Telegram API helpers --

async function sendMessage(chatId: number, text: string, extra?: Record<string, unknown>) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await fetch(`${API_BASE}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", ...extra }),
        signal: AbortSignal.timeout(15_000),
      });
      return;
    } catch (err) {
      if (attempt === 3) {
        console.warn("sendMessage failed after 3 attempts:", err);
      } else {
        await new Promise((r) => setTimeout(r, attempt * 1000));
      }
    }
  }
}

async function sendVideo(chatId: number, videoUrl: string, caption?: string) {
  const MAX_RETRIES = 4;
  const RETRY_DELAY_MS = 5_000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${API_BASE}/sendVideo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          video: videoUrl,
          caption,
          supports_streaming: true,
        }),
        signal: AbortSignal.timeout(60_000),
      });

      if (res.ok) return;

      const err = await res.json().catch(() => ({}));
      console.warn(`sendVideo attempt ${attempt} failed (HTTP ${res.status}):`, err);
    } catch (err) {
      console.warn(`sendVideo attempt ${attempt} failed (network):`, err);
    }

    if (attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }

  // All retries exhausted — send the URL as a text message fallback
  console.warn("sendVideo exhausted retries, falling back to text message");
  await sendMessage(chatId, `✅ Your video is ready:\n${videoUrl}`);
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  try {
    await fetch(`${API_BASE}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    console.warn("answerCallbackQuery failed:", err);
  }
}

// -- Input type detection --

// Extracts the first URL found in a string
function extractUrl(text: string): string | undefined {
  const match = text.match(/https?:\/\/\S+/);
  return match?.[0];
}

function detectInputType(text: string): { type: SourceType; url?: string } {
  const url = extractUrl(text);
  if (url && extractYouTubeId(url)) {
    return { type: "youtube", url };
  }
  if (url && parseGitHubUrl(url)) {
    return { type: "github", url };
  }
  return { type: "prompt" };
}

// -- Template selection keyboard --

function sendTemplateKeyboard(chatId: number) {
  return sendMessage(chatId, "Choose a video template:", {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "Product Launch", callback_data: "template:product-launch" },
          { text: "Explainer", callback_data: "template:explainer" },
        ],
        [
          { text: "Social Media", callback_data: "template:social-promo" },
          { text: "Brand Story", callback_data: "template:brand-story" },
        ],
      ],
    },
  });
}

// -- Job processing and status updates --

async function processAndSendVideo(
  chatId: number,
  templateId: TemplateId,
  pending: PendingInput
) {
  await sendMessage(
    chatId,
    `Generating <b>${templateId}</b> video...\nThis takes about 30-60 seconds, please wait.`
  );

  const jobId = createJob(pending.input, "720p", 5, {
    templateId,
    sourceType: pending.inputType,
    sourceUrl: pending.sourceUrl,
    assets: pending.assets.length > 0 ? pending.assets : undefined,
  });

  const start = Date.now();
  let lastStage = "";

  while (Date.now() - start < MAX_WAIT_MS) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const status = getJobStatus(jobId);
    if (!status) continue;

    if (status.stage !== lastStage) {
      lastStage = status.stage;
      const stageLabel: Record<string, string> = {
        generating_script: "✍️ Analyzing content and writing script...",
        generating_clips: "🎥 Generating video clips...",
        uploading_assets: "☁️ Uploading assets...",
        composing_video: "🎞️ Composing final video...",
      };
      if (stageLabel[status.stage]) {
        await sendMessage(chatId, stageLabel[status.stage]);
      }
    }

    if (status.stage === "completed" && status.downloadUrl) {
      await sendVideo(
        chatId,
        status.downloadUrl,
        status.generatedScript?.title
          ? `${status.generatedScript.title}`
          : "Your AI-generated video"
      );
      return;
    }

    if (status.stage === "failed") {
      await sendMessage(chatId, `Generation failed: ${status.error ?? "Unknown error"}`);
      return;
    }
  }

  await sendMessage(chatId, "Generation timed out. Please try again.");
}

// -- Webhook handler --

export async function handleTelegramUpdate(update: Record<string, unknown>) {
  // Handle callback queries (template selection)
  if (update.callback_query) {
    const cq = update.callback_query as {
      id: string;
      data?: string;
      message?: { chat?: { id: number } };
    };

    const chatId = cq.message?.chat?.id;
    const data = cq.data;

    if (!chatId || !data?.startsWith("template:")) {
      await answerCallbackQuery(cq.id);
      return;
    }

    const templateId = data.replace("template:", "") as TemplateId;
    await answerCallbackQuery(cq.id, `Selected: ${templateId}`);

    const pending = pendingInputs.get(chatId);
    if (!pending) {
      await sendMessage(chatId, "No pending input found. Please send a prompt, YouTube URL, or GitHub URL first.");
      return;
    }

    pendingInputs.delete(chatId);

    // Process in background
    processAndSendVideo(chatId, templateId, pending);
    return;
  }

  // Handle regular messages
  if (!update.message) return;

  const message = update.message as {
    chat: { id: number };
    text?: string;
    photo?: { file_id: string }[];
  };

  const chatId = message.chat.id;

  // Handle image uploads: collect as assets
  if (message.photo && message.photo.length > 0) {
    // Get the highest resolution photo
    const photo = message.photo[message.photo.length - 1];

    // Get file URL from Telegram
    const fileRes = await fetch(`${API_BASE}/getFile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_id: photo.file_id }),
      signal: AbortSignal.timeout(15_000),
    });
    const fileData = await fileRes.json() as { result?: { file_path?: string } };
    const filePath = fileData.result?.file_path;

    if (filePath) {
      const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

      const pending = pendingInputs.get(chatId);
      if (pending) {
        pending.assets.push(fileUrl);
        await sendMessage(chatId, `Image added (${pending.assets.length} total). Send more images or a text prompt when ready.`);
      } else {
        pendingInputs.set(chatId, {
          input: "",
          inputType: "prompt",
          assets: [fileUrl],
        });
        await sendMessage(chatId, "Image received. Send more images or a text prompt to continue.");
      }
    }
    return;
  }

  // Handle text messages
  const text = message.text?.replace(/^\/start\s*/i, "").trim();
  if (!text) {
    await sendMessage(chatId, "Send me a description, YouTube URL, or GitHub URL and I'll generate a video for you.");
    return;
  }

  const { type, url } = detectInputType(text);

  const existing = pendingInputs.get(chatId);
  pendingInputs.set(chatId, {
    input: text,
    sourceUrl: url,
    inputType: type,
    assets: existing?.assets ?? [],
  });

  const sourceLabel = type === "youtube" ? "YouTube video" : type === "github" ? "GitHub repo" : "prompt";
  await sendMessage(chatId, `Got your ${sourceLabel}. Now choose a template:`);
  await sendTemplateKeyboard(chatId);
}

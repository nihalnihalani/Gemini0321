import { Chat } from "chat";
import { createTelegramAdapter } from "@chat-adapter/telegram";
import { createRedisState } from "@chat-adapter/state-redis";
import type { Thread, Message } from "chat";
import type { TelegramMessage } from "@chat-adapter/telegram";
import { createJob, getJobStatus } from "@/queue/worker";

export const bot = new Chat({
  userName: "gemini_vercel_bot",
  adapters: {
    telegram: createTelegramAdapter(),
  },
  state: createRedisState(),
});

const POLL_INTERVAL_MS = 5_000;
const MAX_WAIT_MS = 10 * 60 * 1000; // 10 minutes

async function generateAndSendVideo(
  thread: Thread,
  message: Message,
  prompt: string
) {
  const chatId = (message.raw as TelegramMessage).chat.id;

  await thread.post(
    `🎬 Generating video for:\n"${prompt}"\n\nThis takes about 30–60 seconds, please wait...`
  );

  const jobId = createJob(prompt, "720p", 3);
  const start = Date.now();
  let lastStage = "";

  while (Date.now() - start < MAX_WAIT_MS) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const status = getJobStatus(jobId);
    if (!status) continue;

    // Send a progress update when the stage changes
    if (status.stage !== lastStage) {
      lastStage = status.stage;
      const stageLabel: Record<string, string> = {
        generating_script: "✍️ Writing script...",
        generating_clips: "🎥 Generating video clips...",
        uploading_assets: "☁️ Uploading assets...",
        composing_video: "🎞️ Composing final video...",
      };
      if (stageLabel[status.stage]) {
        await thread.post(stageLabel[status.stage]);
      }
    }

    if (status.stage === "completed" && status.downloadUrl) {
      await thread.post(
        `✅ Done! Your video is ready:\n${status.downloadUrl}`
      );

      // Send the actual video file via Telegram sendVideo
      const telegramRes = await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendVideo`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            video: status.downloadUrl,
            caption: status.generatedScript?.title
              ? `🎬 ${status.generatedScript.title}`
              : "🎬 Your AI-generated video",
            supports_streaming: true,
          }),
        }
      );

      if (!telegramRes.ok) {
        // sendVideo can fail if Telegram can't fetch the URL (e.g. too large)
        const err = await telegramRes.json().catch(() => ({}));
        console.warn("sendVideo failed:", err);
      }
      return;
    }

    if (status.stage === "failed") {
      await thread.post(`❌ Generation failed: ${status.error ?? "Unknown error"}`);
      return;
    }
  }

  await thread.post("⏰ Generation timed out. Please try again.");
}

// First mention / DM — subscribe thread and start generating
bot.onNewMention(async (thread, message) => {
  await thread.subscribe();

  const prompt = message.text.replace(/^\/start\s*/i, "").trim();
  if (!prompt) {
    await thread.post(
      "Hello! Send me a description of the video you want to create and I'll generate it for you. 🎬"
    );
    return;
  }

  await generateAndSendVideo(thread, message, prompt);
});

// Follow-up messages in subscribed threads — treat each as a new generation request
bot.onSubscribedMessage(async (thread, message) => {
  const prompt = message.text.trim();
  if (!prompt) return;
  await generateAndSendVideo(thread, message, prompt);
});

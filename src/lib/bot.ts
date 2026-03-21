/* eslint-disable @typescript-eslint/no-explicit-any */

let _bot: any = null;
let _handlersRegistered = false;

export async function getBot(): Promise<any> {
  if (_bot) return _bot;

  const { Chat } = await import("chat");
  const { createTelegramAdapter } = await import("@chat-adapter/telegram");
  const { createRedisState } = await import("@chat-adapter/state-redis");

  _bot = new Chat({
    userName: "gemini_vercel_bot",
    adapters: {
      telegram: createTelegramAdapter(),
    },
    state: createRedisState(),
  });

  return _bot;
}

const POLL_INTERVAL_MS = 5_000;
const MAX_WAIT_MS = 10 * 60 * 1000;

async function generateAndSendVideo(
  thread: any,
  message: any,
  prompt: string
) {
  const { createJob, getJobStatus } = await import("@/queue/worker");
  const chatId = message.raw?.chat?.id;

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

      if (chatId && process.env.TELEGRAM_BOT_TOKEN) {
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
          const err = await telegramRes.json().catch(() => ({}));
          console.warn("sendVideo failed:", err);
        }
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

export async function registerBotHandlers() {
  if (_handlersRegistered) return;
  _handlersRegistered = true;

  const bot = await getBot();

  bot.onNewMention(async (thread: any, message: any) => {
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

  bot.onSubscribedMessage(async (thread: any, message: any) => {
    const prompt = message.text.trim();
    if (!prompt) return;
    await generateAndSendVideo(thread, message, prompt);
  });
}

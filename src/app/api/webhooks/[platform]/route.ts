import { after } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return new Response("Bot not configured", { status: 503 });
  }

  const { getBot, registerBotHandlers } = await import("@/lib/bot");
  await registerBotHandlers();
  const bot = await getBot();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handler = (bot as any).webhooks?.[platform];

  if (!handler) {
    return new Response(`Unknown platform adapter: ${platform}`, { status: 404 });
  }

  return handler(request, {
    waitUntil: (task: Promise<unknown>) => after(() => task),
  });
}

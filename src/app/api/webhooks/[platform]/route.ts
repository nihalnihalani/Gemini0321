import { after } from "next/server";
import { bot } from "@/lib/bot";

type Platform = keyof typeof bot.webhooks;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;
  const handler = bot.webhooks[platform as Platform];

  if (!handler) {
    return new Response(`Unknown platform adapter: ${platform}`, { status: 404 });
  }

  // Respond 200 immediately to Telegram, process the message asynchronously
  return handler(request, {
    waitUntil: (task) => after(() => task),
  });
}

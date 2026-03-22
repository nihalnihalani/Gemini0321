import { handleTelegramUpdate } from "@/lib/bot";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;

  if (platform !== "telegram") {
    return new Response(`Unknown platform: ${platform}`, { status: 404 });
  }

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return new Response("Bot not configured", { status: 503 });
  }

  try {
    const update = await request.json();
    await handleTelegramUpdate(update);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }
}

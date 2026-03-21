import { NextResponse } from "next/server";
import { getJobStatus as getInMemoryStatus } from "@/queue/worker";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const { videoId } = await params;
  let status;

  try {
    if (process.env.ENABLE_BULLMQ === "true" && process.env.REDIS_URL) {
      const { getJobStatus: getBullStatus } = await import("@/queue/bull-queue");
      status = await getBullStatus(videoId);
    }
  } catch {
    // Ignore and fall back to in-memory
  }

  if (!status) {
    status = getInMemoryStatus(videoId);
  }

  if (!status) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (status.stage !== "completed" || !status.downloadUrl) {
    return NextResponse.json(
      { error: "Video is not ready yet", stage: status.stage },
      { status: 404 }
    );
  }

  return NextResponse.redirect(status.downloadUrl);
}

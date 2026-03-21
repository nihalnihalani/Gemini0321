import { NextResponse } from "next/server";
import { getJobStatus as getInMemoryStatus } from "@/queue/worker";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  // Try BullMQ (Redis) first, fall back to in-memory
  let status;
  try {
    if (process.env.ENABLE_BULLMQ === "true" && process.env.REDIS_URL) {
      const { getJobStatus: getBullStatus } = await import("@/queue/bull-queue");
      status = await getBullStatus(jobId);
    }
  } catch {
    // Redis not available, use in-memory
  }

  if (!status) {
    status = getInMemoryStatus(jobId);
  }

  if (!status) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json(status, {
    headers: { "Cache-Control": "no-cache" },
  });
}

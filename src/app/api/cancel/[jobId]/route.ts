import { NextRequest, NextResponse } from "next/server";
import { jobs } from "@/queue/worker";
import { terminateTask } from "@/lib/rocketride";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  const job = jobs.get(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.stage === "completed" || job.stage === "failed") {
    return NextResponse.json(
      { error: `Job already ${job.stage}` },
      { status: 400 }
    );
  }

  // Terminate RocketRide pipeline if a token exists
  if (job.rocketrideToken) {
    try {
      await terminateTask(job.rocketrideToken);
      console.log(`[RocketRide] Terminated pipeline for job ${jobId}`);
    } catch (err) {
      console.warn(
        `[RocketRide] Failed to terminate pipeline: ${err instanceof Error ? err.message : err}`
      );
    }
  }

  // Update job status to failed/cancelled
  Object.assign(job, {
    stage: "failed",
    message: "Cancelled by user",
    error: "Cancelled by user",
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({ jobId, status: "cancelled" });
}

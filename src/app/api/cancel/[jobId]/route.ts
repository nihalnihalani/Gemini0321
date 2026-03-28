import { NextRequest, NextResponse } from "next/server";
import { jobs } from "@/queue/worker";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  // Validate jobId format
  if (!UUID_RE.test(jobId)) {
    return NextResponse.json({ error: "Invalid job ID format" }, { status: 400 });
  }

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

  // Mark as failed synchronously so concurrent requests see the updated state
  Object.assign(job, {
    stage: "failed",
    message: "Cancelled by user",
    error: "Cancelled by user",
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({ jobId, status: "cancelled" });
}

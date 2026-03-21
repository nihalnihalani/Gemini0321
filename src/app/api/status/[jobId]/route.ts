import { NextResponse } from "next/server";
import { getJobStatus } from "@/queue/worker";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const status = getJobStatus(jobId);

  if (!status) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json(status, {
    headers: { "Cache-Control": "no-cache" },
  });
}

import { NextResponse } from "next/server";
import { getJobStatus } from "@/queue/worker";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const { videoId } = await params;
  const status = getJobStatus(videoId);

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

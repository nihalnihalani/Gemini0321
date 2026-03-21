import { NextResponse } from "next/server";
import { GenerateRequestSchema } from "@/lib/schemas";
import { createJob } from "@/queue/worker";
import type { GenerateResponse } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = GenerateRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { prompt, resolution, sceneCount } = parsed.data;
    const jobId = createJob(prompt, resolution, sceneCount);

    const response: GenerateResponse = {
      jobId,
      message: "Video generation started",
    };

    return NextResponse.json(response, { status: 202 });
  } catch (error) {
    console.error("Generate API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

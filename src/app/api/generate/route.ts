import { NextResponse } from "next/server";
import { GenerateRequestSchema } from "@/lib/schemas";
import { createJob as createInMemoryJob } from "@/queue/worker";
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

    const { prompt, templateId, sourceType, sourceUrl, assets, enableVeo, resolution, sceneCount } = parsed.data;

    let jobId: string;
    try {
      if (!(process.env.ENABLE_BULLMQ === "true" && process.env.REDIS_URL)) {
        throw new Error("BullMQ disabled");
      }

      const { createJob: createBullJob } = await import("@/queue/bull-queue");
      jobId = await createBullJob(prompt, resolution, sceneCount);
    } catch {
      // Fall back to in-memory
      jobId = createInMemoryJob(prompt, resolution, sceneCount, {
        templateId,
        sourceType,
        sourceUrl,
        assets,
        enableVeo,
      });
    }

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

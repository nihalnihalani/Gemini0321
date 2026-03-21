// GET /api/ws?jobId=xxx
// Returns a Server-Sent Events stream with job status updates

export async function GET(request: Request) {
  const url = new URL(request.url);
  const jobId = url.searchParams.get("jobId");

  if (!jobId) {
    return new Response("Missing jobId", { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Poll job status and stream updates
      let lastStage = "";
      let lastProgress = -1;

      const interval = setInterval(async () => {
        try {
          // Try BullMQ first, fall back to in-memory
          let status;
          try {
            if (process.env.ENABLE_BULLMQ === "true" && process.env.REDIS_URL) {
              const { getJobStatus: getBullStatus } = await import("@/queue/bull-queue");
              status = await getBullStatus(jobId);
            }
          } catch {
            // Ignore and fall back to in-memory
          }

          if (!status) {
            const { getJobStatus: getMemStatus } = await import("@/queue/worker");
            status = getMemStatus(jobId);
          }

          if (!status) {
            sendEvent({ error: "Job not found" });
            clearInterval(interval);
            controller.close();
            return;
          }

          // Only send if something changed
          if (status.stage !== lastStage || status.progress !== lastProgress) {
            lastStage = status.stage;
            lastProgress = status.progress;
            sendEvent(status);
          }

          if (status.stage === "completed" || status.stage === "failed") {
            clearInterval(interval);
            controller.close();
          }
        } catch {
          clearInterval(interval);
          controller.close();
        }
      }, 1000); // Check every second

      // Clean up on client disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

import { Worker } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

// Cast needed: top-level ioredis and bullmq's bundled ioredis have incompatible types
const worker = new Worker("video-generation", async (job) => {
  const { jobId, prompt, resolution, sceneCount } = job.data;
  const { processJob } = await import("./worker");
  await processJob(jobId, prompt, resolution, sceneCount);
}, { connection: connection as never, concurrency: 1 });

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

console.log("BullMQ worker started, waiting for jobs...");

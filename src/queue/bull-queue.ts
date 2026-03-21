import { Queue } from "bullmq";
import IORedis from "ioredis";
import type { JobStatus } from "@/lib/types";

export function isBullQueueEnabled(): boolean {
  return process.env.ENABLE_BULLMQ === "true" && Boolean(process.env.REDIS_URL);
}

// Redis connection (lazy init)
let connection: IORedis | null = null;
let redisAvailable = true;

function getConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      retryStrategy(times) {
        if (times > 3) {
          redisAvailable = false;
          return null; // stop retrying
        }
        return Math.min(times * 500, 2000);
      },
    });
    connection.on("error", () => {
      redisAvailable = false;
    });
    connection.connect().catch(() => {
      redisAvailable = false;
    });
  }
  return connection;
}

// Job queue
let queue: Queue | null = null;

export function getQueue(): Queue {
  if (!queue) {
    // Cast needed: top-level ioredis and bullmq's bundled ioredis have incompatible types
    // but are functionally identical at runtime
    queue = new Queue("video-generation", { connection: getConnection() as never });
  }
  return queue;
}

// Job status store (backed by Redis)
export async function setJobStatus(jobId: string, status: JobStatus): Promise<void> {
  await getConnection().set(`job:${jobId}`, JSON.stringify(status), "EX", 86400); // 24h TTL
}

export async function getJobStatus(jobId: string): Promise<JobStatus | null> {
  const data = await getConnection().get(`job:${jobId}`);
  return data ? JSON.parse(data) : null;
}

export async function createJob(prompt: string, resolution: string, sceneCount: number): Promise<string> {
  const jobId = crypto.randomUUID();
  const now = new Date().toISOString();

  const status: JobStatus = {
    jobId,
    stage: "queued",
    progress: 0,
    message: "Job queued",
    createdAt: now,
    updatedAt: now,
  };

  await setJobStatus(jobId, status);
  await getQueue().add("generate-video", { jobId, prompt, resolution, sceneCount });

  return jobId;
}

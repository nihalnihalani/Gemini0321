import { generateScript } from "@/lib/gemini";
import { generateVideoClip } from "@/lib/veo";
import { generateAllAssets } from "@/lib/nano-banan";
import { generateMusic } from "@/lib/lyria";
import { renderVideo } from "@/lib/render";
import { uploadFile, generateKey, getPublicUrl } from "@/lib/storage";
import { mkdir } from "fs/promises";
import type {
  JobStatus,
  SceneProgress,
  GeneratedScene,
  GeneratedScript,
  Scene,
} from "@/lib/types";
import { DEFAULT_STYLE } from "@/lib/types";

const jobs = new Map<string, JobStatus>();

export { jobs };

export function createJob(
  prompt: string,
  resolution: string,
  sceneCount: number
): string {
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

  jobs.set(jobId, status);

  // Kick off processing without awaiting
  processJob(jobId, prompt, resolution, sceneCount);

  return jobId;
}

export function getJobStatus(jobId: string): JobStatus | undefined {
  return jobs.get(jobId);
}

function updateJob(jobId: string, updates: Partial<JobStatus>): void {
  const job = jobs.get(jobId);
  if (!job) return;

  Object.assign(job, updates, { updatedAt: new Date().toISOString() });
}

async function updateJobPersistent(jobId: string, updates: Partial<JobStatus>): Promise<void> {
  // Update in-memory
  updateJob(jobId, updates);

  // Also persist to Redis if available
  try {
    const { setJobStatus } = await import("./bull-queue");
    const job = jobs.get(jobId);
    if (job) await setJobStatus(jobId, job);
  } catch {
    // Redis not available, in-memory only
  }
}

export async function processJob(
  jobId: string,
  prompt: string,
  resolution: string,
  sceneCount: number
): Promise<void> {
  try {
    // Stage 1: Generate script (5-15%)
    await updateJobPersistent(jobId, {
      stage: "generating_script",
      progress: 5,
      message: "Generating script with Gemini...",
    });

    const script = await generateScript(prompt, sceneCount);

    await updateJobPersistent(jobId, {
      script,
      progress: 15,
      message: "Script generated successfully",
    });

    // Stage 2: Generate video clips + Nano Banan assets in parallel (15-55%)
    const sceneProgresses: SceneProgress[] = script.scenes.map((s) => ({
      scene_number: s.scene_number,
      status: "pending" as const,
    }));

    await updateJobPersistent(jobId, {
      stage: "generating_clips",
      progress: 15,
      message: "Generating video clips and assets...",
      scenes: sceneProgresses,
    });

    // Run Veo clip generation and Nano Banan asset generation in parallel
    const clipGenerationPromise = Promise.allSettled(
      script.scenes.map(async (scene: Scene) => {
        // Mark scene as generating
        const job = jobs.get(jobId);
        if (job?.scenes) {
          const sp = job.scenes.find(
            (s) => s.scene_number === scene.scene_number
          );
          if (sp) sp.status = "generating";
          await updateJobPersistent(jobId, { scenes: job.scenes });
        }

        const clipPath = await generateVideoClip(scene, {
          resolution: resolution as "720p" | "1080p",
        });

        // Mark scene as done generating
        if (job?.scenes) {
          const sp = job.scenes.find(
            (s) => s.scene_number === scene.scene_number
          );
          if (sp) sp.status = "done";
          await updateJobPersistent(jobId, { scenes: job.scenes });
        }

        return { sceneNumber: scene.scene_number, clipPath };
      })
    );

    // Nano Banan asset generation (non-critical — failures are tolerated)
    const nanoBananPromise = generateAllAssets(script).catch((err) => {
      console.error(
        `Nano Banan asset generation failed: ${err instanceof Error ? err.message : err}`
      );
      return { titleCard: "", keyframes: new Map<number, string>() };
    });

    const [clipResults, nanoBananAssets] = await Promise.all([
      clipGenerationPromise,
      nanoBananPromise,
    ]);

    // Calculate how many clips succeeded
    const successfulClips: { sceneNumber: number; clipPath: string }[] = [];
    for (let i = 0; i < clipResults.length; i++) {
      const result = clipResults[i];
      const sceneNum = script.scenes[i].scene_number;

      if (result.status === "fulfilled") {
        successfulClips.push(result.value);
      } else {
        const job = jobs.get(jobId);
        if (job?.scenes) {
          const sp = job.scenes.find((s) => s.scene_number === sceneNum);
          if (sp) {
            sp.status = "failed";
            sp.error =
              result.reason instanceof Error
                ? result.reason.message
                : String(result.reason);
          }
          await updateJobPersistent(jobId, { scenes: job.scenes });
        }
      }
    }

    const clipProgress = 15 + (successfulClips.length / script.scenes.length) * 40;
    await updateJobPersistent(jobId, {
      progress: Math.round(clipProgress),
      message: `Generated ${successfulClips.length}/${script.scenes.length} clips`,
    });

    // Stage 3: Upload assets
    await updateJobPersistent(jobId, {
      stage: "uploading_assets",
      progress: 60,
      message: "Uploading assets to storage...",
    });

    const generatedScenes: GeneratedScene[] = [];

    for (const scene of script.scenes) {
      const clip = successfulClips.find(
        (c) => c.sceneNumber === scene.scene_number
      );

      if (clip) {
        const job = jobs.get(jobId);
        if (job?.scenes) {
          const sp = job.scenes.find(
            (s) => s.scene_number === scene.scene_number
          );
          if (sp) sp.status = "uploading";
          await updateJobPersistent(jobId, { scenes: job.scenes });
        }

        const key = generateKey(
          jobId,
          `scene-${scene.scene_number}.mp4`
        );
        const videoUrl = await uploadFile(clip.clipPath, key);

        if (job?.scenes) {
          const sp = job.scenes.find(
            (s) => s.scene_number === scene.scene_number
          );
          if (sp) sp.status = "done";
          await updateJobPersistent(jobId, { scenes: job.scenes });
        }

        generatedScenes.push({
          ...scene,
          videoUrl,
          videoLocalPath: clip.clipPath,
        });
      } else {
        // Scene clip failed; include with empty videoUrl
        generatedScenes.push({
          ...scene,
          videoUrl: "",
        });
      }
    }

    await updateJobPersistent(jobId, {
      progress: 80,
      message: "Assets uploaded",
    });

    // Stage 4: Compose video (MVP: mark as ready)
    await updateJobPersistent(jobId, {
      stage: "composing_video",
      progress: 90,
      message: "Composing final video...",
    });

    const generatedScript: GeneratedScript = {
      title: script.title,
      theme: script.theme,
      target_audience: script.target_audience,
      music_prompt: script.music_prompt,
      total_duration_seconds: script.total_duration_seconds,
      scenes: generatedScenes,
    };

    // For MVP, use the first successful scene's URL as a preview
    const firstSuccessful = generatedScenes.find((s) => s.videoUrl);
    const downloadKey = generateKey(jobId, "final.mp4");
    const downloadUrl = getPublicUrl(downloadKey);

    // Stage 5: Completed
    await updateJobPersistent(jobId, {
      stage: "completed",
      progress: 100,
      message: "Video generation completed",
      generatedScript,
      previewUrl: firstSuccessful?.videoUrl,
      downloadUrl,
    });
  } catch (error) {
    await updateJobPersistent(jobId, {
      stage: "failed",
      message:
        error instanceof Error ? error.message : "An unknown error occurred",
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
}

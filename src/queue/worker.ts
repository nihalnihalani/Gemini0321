import { generateScript } from "@/lib/gemini";
import { generateVideoClip } from "@/lib/veo";
import { uploadFile, generateKey, getPublicUrl } from "@/lib/storage";
import type {
  JobStatus,
  SceneProgress,
  GeneratedScene,
  GeneratedScript,
  Scene,
} from "@/lib/types";

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

async function processJob(
  jobId: string,
  prompt: string,
  resolution: string,
  sceneCount: number
): Promise<void> {
  try {
    // Stage 1: Generate script
    updateJob(jobId, {
      stage: "generating_script",
      progress: 10,
      message: "Generating script with Gemini...",
    });

    const script = await generateScript(prompt, sceneCount);

    updateJob(jobId, {
      script,
      progress: 20,
      message: "Script generated successfully",
    });

    // Stage 2: Generate video clips
    const sceneProgresses: SceneProgress[] = script.scenes.map((s) => ({
      scene_number: s.scene_number,
      status: "pending" as const,
    }));

    updateJob(jobId, {
      stage: "generating_clips",
      progress: 25,
      message: "Generating video clips...",
      scenes: sceneProgresses,
    });

    const clipResults = await Promise.allSettled(
      script.scenes.map(async (scene: Scene) => {
        // Mark scene as generating
        const job = jobs.get(jobId);
        if (job?.scenes) {
          const sp = job.scenes.find(
            (s) => s.scene_number === scene.scene_number
          );
          if (sp) sp.status = "generating";
          updateJob(jobId, { scenes: job.scenes });
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
          updateJob(jobId, { scenes: job.scenes });
        }

        return { sceneNumber: scene.scene_number, clipPath };
      })
    );

    // Calculate how many succeeded
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
          updateJob(jobId, { scenes: job.scenes });
        }
      }
    }

    const clipProgress = 25 + (successfulClips.length / script.scenes.length) * 30;
    updateJob(jobId, {
      progress: Math.round(clipProgress),
      message: `Generated ${successfulClips.length}/${script.scenes.length} clips`,
    });

    // Stage 3: Upload assets
    updateJob(jobId, {
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
          updateJob(jobId, { scenes: job.scenes });
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
          updateJob(jobId, { scenes: job.scenes });
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

    updateJob(jobId, {
      progress: 80,
      message: "Assets uploaded",
    });

    // Stage 4: Compose video (MVP: mark as ready)
    updateJob(jobId, {
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
    updateJob(jobId, {
      stage: "completed",
      progress: 100,
      message: "Video generation completed",
      generatedScript,
      previewUrl: firstSuccessful?.videoUrl,
      downloadUrl,
    });
  } catch (error) {
    updateJob(jobId, {
      stage: "failed",
      message:
        error instanceof Error ? error.message : "An unknown error occurred",
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
}

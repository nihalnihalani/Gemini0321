import { generateScript, generateTemplateContent, analyzeYouTubeVideo } from "@/lib/gemini";
// rocketride imported dynamically where used to avoid ESM resolution errors
import { generateVideoClip } from "@/lib/veo";
import { generateAllAssets } from "@/lib/nano-banan";
import { generateAllNarrations, generateAllSFX } from "@/lib/elevenlabs";
import { renderVideo, renderTemplateVideo } from "@/lib/render";
import { uploadFile, generateKey } from "@/lib/storage";
import { extractGitHubContent } from "@/lib/github";
import { getTemplate } from "@/lib/templates";
import { mkdir } from "fs/promises";
import path from "path";
import type {
  JobStatus,
  SceneProgress,
  GeneratedScene,
  GeneratedScript,
  Scene,
  TemplateId,
  SourceType,
  TemplateInput,
  GenerationEngine,
} from "@/lib/types";
import { DEFAULT_STYLE } from "@/lib/types";

// Persist the jobs Map on global so it survives Next.js hot module reloads in dev.
declare global {
  // eslint-disable-next-line no-var
  var __jobsMap: Map<string, JobStatus> | undefined;
}

const jobs: Map<string, JobStatus> =
  global.__jobsMap ?? (global.__jobsMap = new Map());

export { jobs };

interface TemplateOptions {
  templateId?: TemplateId;
  sourceType?: SourceType;
  sourceUrl?: string;
  assets?: string[];
  enableVeo?: boolean;
  engine?: GenerationEngine;
}

export function createJob(
  prompt: string,
  resolution: string,
  sceneCount: number,
  options?: TemplateOptions
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

  const engine: GenerationEngine = options?.engine ?? "auto";

  // Use template pipeline if templateId provided, otherwise freestyle/custom
  if (options?.templateId) {
    processTemplateJob(jobId, prompt, resolution, options);
  } else {
    processJob(jobId, prompt, resolution, sceneCount, engine);
  }

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

/** Throw if the cancel endpoint has already marked this job as failed. */
function checkCancelled(jobId: string): void {
  const job = jobs.get(jobId);
  if (job?.stage === "failed") {
    throw new Error(job.message ?? "Cancelled by user");
  }
}

async function updateJobPersistent(jobId: string, updates: Partial<JobStatus>): Promise<void> {
  // Update in-memory
  updateJob(jobId, updates);

  // Also persist to Redis if available
  try {
    if (!(process.env.ENABLE_BULLMQ === "true" && process.env.REDIS_URL)) {
      return;
    }
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
  sceneCount: number,
  engine: GenerationEngine = "auto"
): Promise<void> {
  try {
    // Stage 1: Generate script (5-15%)
    await updateJobPersistent(jobId, {
      stage: "generating_script",
      progress: 5,
      message: "Generating script with Gemini...",
    });

    // Try RocketRide pipeline first, fall back to direct Gemini on connection errors only
    let script;
    try {
      try {
        const { runScriptPipeline } = await import("@/lib/rocketride");
        script = await runScriptPipeline(prompt, sceneCount, (token: string) => {
          // Synchronous — must stay sync to avoid race with cancel endpoint
          updateJob(jobId, { rocketrideToken: token });
        });
        console.log(`[RocketRide] Script generated via pipeline for job ${jobId}`);
      } catch (rrError) {
        // Only fall back for connection/network errors — not for schema or parse errors
        const isDataError = rrError instanceof SyntaxError
          || (rrError && typeof rrError === "object" && "issues" in rrError); // ZodError
        if (isDataError) throw rrError;

        console.warn(
          `[RocketRide] Pipeline unavailable, falling back to direct Gemini: ${rrError instanceof Error ? rrError.message : rrError}`
        );
        script = await generateScript(prompt, sceneCount);
      }
    } finally {
      updateJob(jobId, { rocketrideToken: undefined });
    }

    checkCancelled(jobId);
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

    const useVeo = engine === "veo3" || engine === "auto";
    const useNanoBanan = engine === "nano-banan" || engine === "auto";

    // Run Veo clip generation and Nano Banan asset generation in parallel
    const clipGenerationPromise = useVeo
      ? Promise.allSettled(
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
        )
      : Promise.resolve([] as PromiseSettledResult<{ sceneNumber: number; clipPath: string }>[]);

    // Nano Banan asset generation (non-critical in auto mode — failures are tolerated)
    const nanoBananPromise = useNanoBanan
      ? generateAllAssets(script).catch((err) => {
          console.error(
            `Nano Banan asset generation failed: ${err instanceof Error ? err.message : err}`
          );
          return { titleCard: "", keyframes: new Map<number, string>() };
        })
      : Promise.resolve({ titleCard: "", keyframes: new Map<number, string>() });

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

    // Generate narration and sound effects in parallel (non-critical)
    let narrationMap = new Map<number, string>();
    let sfxMap = new Map<number, string>();

    await updateJobPersistent(jobId, {
      progress: 53,
      message: "Generating narration and sound effects...",
    });

    const [legacyNarrationResult, legacySfxResult] = await Promise.allSettled([
      generateAllNarrations(script.scenes),
      generateAllSFX(script.scenes),
    ]);

    if (legacyNarrationResult.status === "fulfilled") {
      narrationMap = legacyNarrationResult.value;
      console.log(`Narration generation complete: ${narrationMap.size}/${script.scenes.length} scenes`);
    } else {
      console.error(`Narration generation failed: ${legacyNarrationResult.reason instanceof Error ? legacyNarrationResult.reason.message : legacyNarrationResult.reason}`);
    }

    if (legacySfxResult.status === "fulfilled") {
      sfxMap = legacySfxResult.value;
      console.log(`SFX generation complete: ${sfxMap.size}/${script.scenes.length} scenes`);
    } else {
      console.error(`SFX generation failed: ${legacySfxResult.reason instanceof Error ? legacySfxResult.reason.message : legacySfxResult.reason}`);
    }

    // Stage 3: Upload assets (55-70%)
    checkCancelled(jobId);
    await updateJobPersistent(jobId, {
      stage: "uploading_assets",
      progress: 55,
      message: "Uploading assets to storage...",
    });

    const generatedScenes: GeneratedScene[] = [];
    let titleCardUrl = "";
    const keyframeUrls = new Map<number, string>();

    // Upload Nano Banan title card if available
    if (nanoBananAssets.titleCard) {
      try {
        const titleCardExt = path.extname(nanoBananAssets.titleCard) || ".png";
        const titleCardKey = generateKey(jobId, `title-card${titleCardExt}`);
        titleCardUrl = await uploadFile(nanoBananAssets.titleCard, titleCardKey);
        console.log(`Title card uploaded: ${titleCardUrl}`);
      } catch (err) {
        console.error(
          `Title card upload failed: ${err instanceof Error ? err.message : err}`
        );
      }
    }

    // Upload Nano Banan keyframes if available
    for (const [sceneNum, keyframePath] of nanoBananAssets.keyframes) {
      try {
        const keyframeExt = path.extname(keyframePath) || ".png";
        const keyframeKey = generateKey(jobId, `keyframe-${sceneNum}${keyframeExt}`);
        const keyframeUrl = await uploadFile(keyframePath, keyframeKey);
        keyframeUrls.set(sceneNum, keyframeUrl);
      } catch (err) {
        console.error(
          `Keyframe upload for scene ${sceneNum} failed: ${err instanceof Error ? err.message : err}`
        );
      }
    }

    // Upload narration audio files
    const narrationUrls = new Map<number, string>();
    for (const [sceneNum, narrationPath] of narrationMap) {
      try {
        const narrationKey = generateKey(jobId, `narration-${sceneNum}.mp3`);
        const narrationUrl = await uploadFile(narrationPath, narrationKey);
        narrationUrls.set(sceneNum, narrationUrl);
        console.log(`Narration for scene ${sceneNum} uploaded: ${narrationUrl}`);
      } catch (err) {
        console.error(
          `Narration upload for scene ${sceneNum} failed: ${err instanceof Error ? err.message : err}`
        );
      }
    }

    // Upload SFX audio files
    const sfxUrls = new Map<number, string>();
    for (const [sceneNum, sfxPath] of sfxMap) {
      try {
        const sfxKey = generateKey(jobId, `sfx-${sceneNum}.mp3`);
        const sfxUrl = await uploadFile(sfxPath, sfxKey);
        sfxUrls.set(sceneNum, sfxUrl);
        console.log(`SFX for scene ${sceneNum} uploaded: ${sfxUrl}`);
      } catch (err) {
        console.error(
          `SFX upload for scene ${sceneNum} failed: ${err instanceof Error ? err.message : err}`
        );
      }
    }

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

        const clipExt = path.extname(clip.clipPath) || ".mp4";
        const key = generateKey(jobId, `scene-${scene.scene_number}${clipExt}`);
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
          narrationAudioUrl: narrationUrls.get(scene.scene_number),
          soundEffectUrl: sfxUrls.get(scene.scene_number),
        });
      } else {
        // Fall back to a keyframe image if Veo did not produce a clip.
        generatedScenes.push({
          ...scene,
          videoUrl: keyframeUrls.get(scene.scene_number) ?? "",
          narrationAudioUrl: narrationUrls.get(scene.scene_number),
          soundEffectUrl: sfxUrls.get(scene.scene_number),
        });
      }
    }

    // Stage 4: Generate music (70-75%)
    checkCancelled(jobId);
    await updateJobPersistent(jobId, {
      progress: 70,
      message: "Assets uploaded, generating background music...",
    });

    const generatedScript: GeneratedScript = {
      title: script.title,
      theme: script.theme,
      target_audience: script.target_audience,
      music_prompt: script.music_prompt,
      total_duration_seconds: script.total_duration_seconds,
      scenes: generatedScenes,
      titleCardUrl,
    };

    try {
      const musicPath = "/Users/charlie/Downloads/product-launch-advertising-commercial-music-301409.mp3";
      const musicKey = generateKey(jobId, "music.mp3");
      const musicUrl = await uploadFile(musicPath, musicKey);
      generatedScript.musicUrl = musicUrl;
      console.log(`Music uploaded: ${musicUrl}`);
    } catch (err) {
      const musicError = err instanceof Error ? err.message : String(err);
      console.error(`Music upload failed: ${musicError}`);
      await updateJobPersistent(jobId, {
        message: `Music generation failed (video will have no background music): ${musicError}`,
      });
    }

    await updateJobPersistent(jobId, {
      progress: 75,
      message: "Music generated",
    });

    // Stage 5: Compose video with Remotion (75-95%)
    checkCancelled(jobId);
    await updateJobPersistent(jobId, {
      stage: "composing_video",
      progress: 75,
      message: "Composing final video with Remotion...",
    });

    const renderDir = "/tmp/renders";
    await mkdir(renderDir, { recursive: true });
    const outputPath = `${renderDir}/${jobId}.mp4`;

    let downloadUrl: string;
    const firstSuccessful = generatedScenes.find((s) => s.videoUrl);

    try {
      const renderStart = Date.now();
      console.log(`Starting Remotion render for job ${jobId}...`);

      await renderVideo(generatedScript, DEFAULT_STYLE, outputPath);

      const renderDuration = ((Date.now() - renderStart) / 1000).toFixed(1);
      console.log(`Remotion render completed in ${renderDuration}s for job ${jobId}`);

      await updateJobPersistent(jobId, {
        progress: 95,
        message: "Uploading final video...",
      });

      const downloadKey = generateKey(jobId, "final.mp4");
      downloadUrl = await uploadFile(outputPath, downloadKey);
    } catch (err) {
      console.error(
        `Remotion render failed: ${err instanceof Error ? err.message : err}. Using preview fallback.`
      );
      downloadUrl = firstSuccessful?.videoUrl ?? "";
    }

    // Stage 6: Completed
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

/**
 * Template-based generation pipeline.
 * Stages: extract content -> generate template content -> generate music -> render -> upload
 */
async function processTemplateJob(
  jobId: string,
  prompt: string,
  resolution: string,
  options: TemplateOptions
): Promise<void> {
  const templateId = options.templateId!;
  const sourceType = options.sourceType || "prompt";
  const sourceUrl = options.sourceUrl;

  try {
    // Stage 1: Extract content from source (0-15%)
    await updateJobPersistent(jobId, {
      stage: "generating_script",
      progress: 5,
      message: "Extracting content from source...",
    });

    let sourceContent = prompt;

    if (sourceType === "youtube" && sourceUrl) {
      console.log(`Analyzing YouTube video with Gemini: ${sourceUrl}`);
      const ytAnalysis = await analyzeYouTubeVideo(sourceUrl);
      sourceContent = `YouTube Video Analysis:\n${ytAnalysis}\n\nUser prompt: ${prompt}`;
    } else if (sourceType === "github" && sourceUrl) {
      const ghMeta = await extractGitHubContent(sourceUrl);
      sourceContent = `Repository: ${ghMeta.name}\nDescription: ${ghMeta.description}\nLanguage: ${ghMeta.language}\nStars: ${ghMeta.stars}\nTopics: ${ghMeta.topics.join(", ")}\nFeatures: ${ghMeta.features.join(", ")}\nREADME:\n${ghMeta.readmeContent.slice(0, 2000)}\n\nUser prompt: ${prompt}`;
    }

    await updateJobPersistent(jobId, {
      progress: 15,
      message: "Content extracted",
    });

    // Stage 2: Generate template content via Gemini (15-40%)
    await updateJobPersistent(jobId, {
      progress: 20,
      message: "Generating template content with Gemini...",
    });

    // Try RocketRide pipeline first, fall back to direct Gemini on connection errors only
    let templateContent: TemplateInput;
    try {
      try {
        const { runTemplateContentPipeline } = await import("@/lib/rocketride");
        templateContent = await runTemplateContentPipeline(templateId, sourceContent, sourceType, (token: string) => {
          updateJob(jobId, { rocketrideToken: token });
        });
        console.log(`[RocketRide] Template content generated via pipeline for job ${jobId}`);
      } catch (rrError) {
        const isDataError = rrError instanceof SyntaxError
          || (rrError && typeof rrError === "object" && "issues" in rrError);
        if (isDataError) throw rrError;

        console.warn(
          `[RocketRide] Pipeline unavailable, falling back to direct Gemini: ${rrError instanceof Error ? rrError.message : rrError}`
        );
        templateContent = await generateTemplateContent(templateId, sourceContent, sourceType);
      }
    } finally {
      updateJob(jobId, { rocketrideToken: undefined });
    }

    // Merge user-provided assets into template content
    const enrichedContent = { ...templateContent } as Record<string, unknown>;
    if (options.assets?.length) {
      // Assign assets to the appropriate image field based on template
      if (templateId === "product-launch") {
        enrichedContent.productImages = options.assets;
      } else if (templateId === "social-promo" && options.assets[0]) {
        enrichedContent.productImage = options.assets[0];
      } else if (templateId === "brand-story") {
        enrichedContent.teamPhotos = options.assets;
      }
    }

    checkCancelled(jobId);
    await updateJobPersistent(jobId, {
      progress: 40,
      message: "Template content generated",
    });

    // Stage 3: Generate music, narration, and SFX in parallel (40-60%)
    await updateJobPersistent(jobId, {
      progress: 45,
      message: "Generating audio (music, narration, sound effects)...",
    });

    const template = getTemplate(templateId);
    const moodMap: Record<TemplateId, string> = {
      "product-launch": "energetic, exciting, modern electronic",
      "explainer": "calm, educational, light ambient",
      "social-promo": "bold, upbeat, trendy pop",
      "brand-story": "inspiring, cinematic, emotional orchestral",
    };

    // Build scenes for narration + SFX from template content
    const templateScenes: Scene[] = [];
    if (templateId === "product-launch") {
      const pl = enrichedContent as Record<string, unknown>;
      const features = (pl.features as string[]) || [];
      features.forEach((f, i) => {
        templateScenes.push({
          scene_number: i + 1,
          title: String(pl.brandName || ""),
          visual_description: f,
          narration_text: f,
          duration_seconds: 5,
          camera_direction: "static",
          mood: "energetic",
          transition: "cut" as const,
        });
      });
    } else if (templateId === "explainer") {
      const ex = enrichedContent as Record<string, unknown>;
      const steps = (ex.steps as { title: string; description: string }[]) || [];
      const introNarration = (ex.introNarration as string) || `Let's explore ${ex.title}. Here's what you need to know.`;
      const summaryNarration = (ex.summaryNarration as string) || String(ex.conclusion || "And that's a wrap.");

      // Write narration text back so it reaches the Explainer component for captions
      enrichedContent.introNarration = introNarration;
      enrichedContent.summaryNarration = summaryNarration;

      // Scene 0: Intro narration — hook the viewer
      templateScenes.push({
        scene_number: 0,
        title: "Introduction",
        visual_description: String(ex.title || ""),
        narration_text: introNarration,
        duration_seconds: 7,
        camera_direction: "static",
        mood: "welcoming",
        transition: "fade" as const,
      });

      // Scene 1..N: Step narrations — teach each concept
      steps.forEach((step, i) => {
        const stepNarration = `Step ${i + 1}: ${step.title}. ${step.description}`;
        templateScenes.push({
          scene_number: i + 1,
          title: step.title,
          visual_description: step.description,
          narration_text: stepNarration,
          duration_seconds: 10,
          camera_direction: "static",
          mood: "educational",
          transition: "fade" as const,
        });
      });

      // Final scene: Summary narration — wrap up with conclusion
      templateScenes.push({
        scene_number: steps.length + 1,
        title: "Summary",
        visual_description: String(ex.conclusion || ""),
        narration_text: summaryNarration,
        duration_seconds: 8,
        camera_direction: "static",
        mood: "concluding",
        transition: "fade" as const,
      });
    } else if (templateId === "social-promo") {
      const sp = enrichedContent as Record<string, unknown>;
      const features = (sp.features as string[]) || [];
      templateScenes.push({
        scene_number: 1,
        title: "Hook",
        visual_description: String(sp.hook || ""),
        narration_text: String(sp.hook || ""),
        duration_seconds: 3,
        camera_direction: "static",
        mood: "bold",
        transition: "cut" as const,
      });
      features.forEach((f, i) => {
        templateScenes.push({
          scene_number: i + 2,
          title: f,
          visual_description: f,
          narration_text: f,
          duration_seconds: 3,
          camera_direction: "static",
          mood: "upbeat",
          transition: "cut" as const,
        });
      });
    } else if (templateId === "brand-story") {
      const bs = enrichedContent as Record<string, unknown>;
      templateScenes.push({
        scene_number: 1,
        title: String(bs.companyName || ""),
        visual_description: String(bs.mission || ""),
        narration_text: String(bs.mission || ""),
        duration_seconds: 6,
        camera_direction: "slow pan",
        mood: "inspiring",
        transition: "fade" as const,
      });
      const milestones = (bs.milestones as { year: string; event: string }[]) || [];
      milestones.forEach((m, i) => {
        templateScenes.push({
          scene_number: i + 2,
          title: m.year,
          visual_description: m.event,
          narration_text: `In ${m.year}, ${m.event}`,
          duration_seconds: 5,
          camera_direction: "static",
          mood: "cinematic",
          transition: "dissolve" as const,
        });
      });
    }

    // Run music, narration, and SFX generation in parallel
    let musicUrl: string | undefined;
    let narrationUrls = new Map<number, string>();
    let sfxUrls = new Map<number, string>();

    const [musicResult, narrationResult, sfxResult] = await Promise.allSettled([
      // Music: use local MP3 directly
      uploadFile(
        "/Users/charlie/Downloads/product-launch-advertising-commercial-music-301409.mp3",
        generateKey(jobId, "music.mp3")
      ),
      // Narration generation
      templateScenes.length > 0 ? generateAllNarrations(templateScenes) : Promise.resolve(new Map<number, string>()),
      // SFX generation
      templateScenes.length > 0 ? generateAllSFX(templateScenes) : Promise.resolve(new Map<number, string>()),
    ]);

    // Process music result
    if (musicResult.status === "fulfilled") {
      musicUrl = musicResult.value;
      console.log(`Music uploaded: ${musicUrl}`);
    } else {
      console.error(`Music upload failed: ${musicResult.reason instanceof Error ? musicResult.reason.message : musicResult.reason}`);
    }

    // Process narration result
    if (narrationResult.status === "fulfilled") {
      const narrationMap = narrationResult.value;
      for (const [sceneNum, narrationPath] of narrationMap) {
        try {
          const narrationKey = generateKey(jobId, `narration-${sceneNum}.mp3`);
          const url = await uploadFile(narrationPath, narrationKey);
          narrationUrls.set(sceneNum, url);
          console.log(`Narration for scene ${sceneNum} uploaded: ${url}`);
        } catch (err) {
          console.error(`Narration upload for scene ${sceneNum} failed: ${err instanceof Error ? err.message : err}`);
        }
      }
    } else {
      console.error(`Narration generation failed: ${narrationResult.reason instanceof Error ? narrationResult.reason.message : narrationResult.reason}`);
    }

    // Process SFX result
    if (sfxResult.status === "fulfilled") {
      const sfxMap = sfxResult.value;
      for (const [sceneNum, sfxPath] of sfxMap) {
        try {
          const sfxKey = generateKey(jobId, `sfx-${sceneNum}.mp3`);
          const url = await uploadFile(sfxPath, sfxKey);
          sfxUrls.set(sceneNum, url);
          console.log(`SFX for scene ${sceneNum} uploaded: ${url}`);
        } catch (err) {
          console.error(`SFX upload for scene ${sceneNum} failed: ${err instanceof Error ? err.message : err}`);
        }
      }
    } else {
      console.error(`SFX generation failed: ${sfxResult.reason instanceof Error ? sfxResult.reason.message : sfxResult.reason}`);
    }

    await updateJobPersistent(jobId, {
      progress: 60,
      message: `Audio generated — music: ${musicUrl ? "yes" : "no"}, narrations: ${narrationUrls.size}, sfx: ${sfxUrls.size}`,
    });

    // Stage 4: Render via Remotion (60-90%)
    checkCancelled(jobId);
    await updateJobPersistent(jobId, {
      stage: "composing_video",
      progress: 65,
      message: "Composing video with Remotion...",
    });

    const renderDir = "/tmp/renders";
    await mkdir(renderDir, { recursive: true });
    const outputPath = `${renderDir}/${jobId}.mp4`;

    const renderProps = {
      ...enrichedContent,
      musicUrl,
      narrationUrls: Object.fromEntries(narrationUrls),
      sfxUrls: Object.fromEntries(sfxUrls),
    } as TemplateInput & { musicUrl?: string; narrationUrls?: Record<number, string>; sfxUrls?: Record<number, string> };

    let downloadUrl: string;
    try {
      const renderStart = Date.now();
      console.log(`Starting Remotion template render for job ${jobId} (${templateId})...`);

      await renderTemplateVideo(templateId, renderProps, outputPath);

      const renderDuration = ((Date.now() - renderStart) / 1000).toFixed(1);
      console.log(`Remotion render completed in ${renderDuration}s for job ${jobId}`);

      await updateJobPersistent(jobId, {
        progress: 90,
        message: "Uploading final video...",
      });

      const downloadKey = generateKey(jobId, "final.mp4");
      downloadUrl = await uploadFile(outputPath, downloadKey);
    } catch (err) {
      console.error(`Remotion render failed: ${err instanceof Error ? err.message : err}`);
      downloadUrl = "";
    }

    // Stage 5: Completed
    await updateJobPersistent(jobId, {
      stage: "completed",
      progress: 100,
      message: "Video generation completed",
      downloadUrl,
    });
  } catch (error) {
    await updateJobPersistent(jobId, {
      stage: "failed",
      message: error instanceof Error ? error.message : "An unknown error occurred",
      error: error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
}

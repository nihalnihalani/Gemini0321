import { GoogleGenAI } from "@google/genai";
import { mkdir, access } from "fs/promises";
import path from "path";
import type { Scene } from "./types";

export interface VeoConfig {
  aspectRatio?: "16:9" | "9:16";
  resolution?: "720p" | "1080p";
  model?: string;
}

const DEFAULT_MODEL = "veo-3.1-fast-generate-preview";
const POLL_INTERVAL_MS = 10_000;
const MAX_POLL_DURATION_MS = 10 * 60 * 1000; // 10 minutes
const CLIP_DIR = "/tmp/veo-clips";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

async function ensureClipDir(): Promise<void> {
  try {
    await access(CLIP_DIR);
  } catch {
    await mkdir(CLIP_DIR, { recursive: true });
  }
}

export async function generateVideoClip(
  scene: Scene,
  config?: VeoConfig
): Promise<string> {
  await ensureClipDir();

  const model = config?.model ?? DEFAULT_MODEL;
  const aspectRatio = config?.aspectRatio ?? "16:9";
  const resolution = config?.resolution ?? "720p";

  let operation = await ai.models.generateVideos({
    model,
    prompt: scene.visual_description,
    config: {
      aspectRatio,
      resolution,
      numberOfVideos: 1,
      personGeneration: "allow_all",
    },
  });

  const startTime = Date.now();

  while (!operation.done) {
    if (Date.now() - startTime > MAX_POLL_DURATION_MS) {
      throw new Error(
        `Veo generation timed out after 10 minutes for scene ${scene.scene_number}`
      );
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    operation = await ai.operations.getVideosOperation({ operation });
  }

  const generatedVideos = operation.response?.generatedVideos;
  if (!generatedVideos || generatedVideos.length === 0) {
    throw new Error(
      `Veo returned no videos for scene ${scene.scene_number} — possible safety filter rejection`
    );
  }

  const videoFile = generatedVideos[0].video;
  if (!videoFile) {
    throw new Error(
      `Veo returned empty video reference for scene ${scene.scene_number}`
    );
  }

  const downloadPath = path.join(CLIP_DIR, `scene-${scene.scene_number}.mp4`);

  await ai.files.download({ file: videoFile, downloadPath });

  return downloadPath;
}

export async function generateAllClips(
  scenes: Scene[],
  config?: VeoConfig
): Promise<Map<number, string>> {
  const results = await Promise.allSettled(
    scenes.map((scene) => generateVideoClip(scene, config))
  );

  const clipMap = new Map<number, string>();

  for (let i = 0; i < scenes.length; i++) {
    const result = results[i];
    const sceneNum = scenes[i].scene_number;

    if (result.status === "fulfilled") {
      clipMap.set(sceneNum, result.value);
      console.log(`Scene ${sceneNum}: clip saved to ${result.value}`);
    } else {
      console.error(`Scene ${sceneNum}: generation failed —`, result.reason);
    }
  }

  console.log(
    `Video generation complete: ${clipMap.size}/${scenes.length} scenes succeeded`
  );

  return clipMap;
}

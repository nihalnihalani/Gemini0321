import { GoogleGenAI } from "@google/genai";
import { mkdir, access, writeFile } from "fs/promises";
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

function isStubMode(): boolean {
  return process.env.VEO_STUB_MODE !== "off";
}

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.VEO_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing Veo/Gemini API key");
  }
  return new GoogleGenAI({ apiKey });
}

async function ensureClipDir(): Promise<void> {
  try {
    await access(CLIP_DIR);
  } catch {
    await mkdir(CLIP_DIR, { recursive: true });
  }
}

async function createStubSceneAsset(scene: Scene): Promise<string> {
  await ensureClipDir();

  const filePath = path.join(CLIP_DIR, `scene-${scene.scene_number}.svg`);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="50%" stop-color="#1d4ed8" />
          <stop offset="100%" stop-color="#020617" />
        </linearGradient>
      </defs>
      <rect width="1920" height="1080" fill="url(#bg)" />
      <text x="960" y="450" text-anchor="middle" fill="#ffffff" font-size="76" font-family="Arial, sans-serif" font-weight="700">
        ${escapeXml(scene.title)}
      </text>
      <text x="960" y="560" text-anchor="middle" fill="#dbeafe" font-size="36" font-family="Arial, sans-serif">
        ${escapeXml(scene.mood)}
      </text>
    </svg>
  `.trim();

  await writeFile(filePath, svg, "utf8");
  return filePath;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function generateVideoClip(
  scene: Scene,
  config?: VeoConfig
): Promise<string> {
  if (isStubMode()) {
    return createStubSceneAsset(scene);
  }

  await ensureClipDir();

  const model = config?.model ?? DEFAULT_MODEL;
  const aspectRatio = config?.aspectRatio ?? "16:9";
  const resolution = config?.resolution ?? "720p";

  const ai = getAiClient();

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

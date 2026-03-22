import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { writeFile, mkdir, access } from "fs/promises";
import path from "path";
import type { Scene } from "./types";

export interface ElevenLabsConfig {
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
}

const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // George
const DEFAULT_MODEL_ID = "eleven_multilingual_v2";
const NARRATION_DIR = "/tmp/narration";
const SFX_DIR = "/tmp/sfx";

let client: ElevenLabsClient | null = null;

function getClient(): ElevenLabsClient {
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error(
      "ELEVENLABS_API_KEY is not set. Please set it in your environment variables."
    );
  }
  if (!client) {
    client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
  }
  return client;
}

async function ensureDir(dir: string): Promise<void> {
  try {
    await access(dir);
  } catch {
    await mkdir(dir, { recursive: true });
  }
}

export async function generateNarration(
  text: string,
  outputPath: string,
  config?: ElevenLabsConfig
): Promise<string> {
  const elevenlabs = getClient();

  const voiceId = config?.voiceId ?? DEFAULT_VOICE_ID;
  const modelId = config?.modelId ?? DEFAULT_MODEL_ID;
  const stability = config?.stability ?? 0.6;
  const similarityBoost = config?.similarityBoost ?? 0.75;

  const audio = await elevenlabs.textToSpeech.convert(voiceId, {
    text,
    modelId,
    voiceSettings: {
      stability,
      similarityBoost,
    },
  });

  const reader = audio.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  await writeFile(outputPath, result);

  return outputPath;
}

export async function generateSceneNarration(
  scene: Scene,
  config?: ElevenLabsConfig
): Promise<string> {
  await ensureDir(NARRATION_DIR);

  const outputPath = path.join(
    NARRATION_DIR,
    `scene-${scene.scene_number}.mp3`
  );

  return generateNarration(scene.narration_text, outputPath, config);
}

export async function generateAllNarrations(
  scenes: Scene[],
  config?: ElevenLabsConfig
): Promise<Map<number, string>> {
  const results = await Promise.allSettled(
    scenes.map((scene) => generateSceneNarration(scene, config))
  );

  const narrationMap = new Map<number, string>();

  for (let i = 0; i < scenes.length; i++) {
    const result = results[i];
    const sceneNum = scenes[i].scene_number;

    if (result.status === "fulfilled") {
      narrationMap.set(sceneNum, result.value);
      console.log(`Scene ${sceneNum}: narration saved to ${result.value}`);
    } else {
      console.error(
        `Scene ${sceneNum}: narration generation failed —`,
        result.reason
      );
    }
  }

  console.log(
    `Narration generation complete: ${narrationMap.size}/${scenes.length} scenes succeeded`
  );

  return narrationMap;
}

// --- Sound Effects ---

export function buildSFXPrompt(scene: Scene): string {
  const visual = scene.visual_description;
  const mood = scene.mood;
  return `Ambient sounds for: ${visual}. Mood: ${mood}`;
}

export async function generateSoundEffect(
  prompt: string,
  durationSeconds: number,
  outputPath: string
): Promise<string> {
  const elevenlabs = getClient();

  const audio = await elevenlabs.textToSoundEffects.convert({
    text: prompt,
    durationSeconds,
  });

  const reader = audio.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  await writeFile(outputPath, result);

  return outputPath;
}

export async function generateSceneSFX(
  scene: Scene,
  durationSeconds?: number
): Promise<string> {
  await ensureDir(SFX_DIR);

  const outputPath = path.join(SFX_DIR, `scene-${scene.scene_number}.mp3`);
  const prompt = buildSFXPrompt(scene);
  const duration = durationSeconds ?? scene.duration_seconds;

  return generateSoundEffect(prompt, duration, outputPath);
}

export async function generateAllSFX(
  scenes: Scene[]
): Promise<Map<number, string>> {
  const results = await Promise.allSettled(
    scenes.map((scene) => generateSceneSFX(scene))
  );

  const sfxMap = new Map<number, string>();

  for (let i = 0; i < scenes.length; i++) {
    const result = results[i];
    const sceneNum = scenes[i].scene_number;

    if (result.status === "fulfilled") {
      sfxMap.set(sceneNum, result.value);
      console.log(`Scene ${sceneNum}: SFX saved to ${result.value}`);
    } else {
      console.error(
        `Scene ${sceneNum}: SFX generation failed —`,
        result.reason
      );
    }
  }

  console.log(
    `SFX generation complete: ${sfxMap.size}/${scenes.length} scenes succeeded`
  );

  return sfxMap;
}

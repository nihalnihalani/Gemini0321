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

async function ensureNarrationDir(): Promise<void> {
  try {
    await access(NARRATION_DIR);
  } catch {
    await mkdir(NARRATION_DIR, { recursive: true });
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
  const stability = config?.stability ?? 0.5;
  const similarityBoost = config?.similarityBoost ?? 0.75;

  const audio = await elevenlabs.textToSpeech.convert(voiceId, {
    text,
    model_id: modelId,
    voice_settings: {
      stability,
      similarity_boost: similarityBoost,
    },
  });

  const chunks: Buffer[] = [];
  for await (const chunk of audio) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  await writeFile(outputPath, Buffer.concat(chunks));

  return outputPath;
}

export async function generateSceneNarration(
  scene: Scene,
  config?: ElevenLabsConfig
): Promise<string> {
  await ensureNarrationDir();

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

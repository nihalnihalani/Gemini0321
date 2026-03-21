import { GoogleGenAI } from "@google/genai";
import { mkdir, access, writeFile } from "fs/promises";
import path from "path";
import type { Scene, Script } from "./types";

const MODEL = "gemini-3-pro-image-preview";
const OUTPUT_DIR = "/tmp/nano-banan";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

async function ensureOutputDir(): Promise<void> {
  try {
    await access(OUTPUT_DIR);
  } catch {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }
}

async function generateAndSaveImage(
  prompt: string,
  filename: string
): Promise<string> {
  await ensureOutputDir();

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: { responseModalities: ["IMAGE"] },
  });

  const part = response.candidates?.[0]?.content?.parts?.[0];
  if (!part?.inlineData?.data) {
    throw new Error("Gemini returned no image data");
  }

  const filePath = path.join(OUTPUT_DIR, filename);
  await writeFile(filePath, Buffer.from(part.inlineData.data, "base64"));

  return filePath;
}

export async function generateKeyframe(scene: Scene): Promise<string> {
  const prompt = [
    `Generate a cinematic keyframe image for a video scene.`,
    `Visual description: ${scene.visual_description}`,
    `Camera direction: ${scene.camera_direction}`,
    `Mood: ${scene.mood}`,
    `Style: photorealistic, high quality, cinematic lighting.`,
  ].join("\n");

  const filePath = await generateAndSaveImage(
    prompt,
    `${scene.scene_number}.png`
  );
  console.log(`Keyframe for scene ${scene.scene_number} saved to ${filePath}`);
  return filePath;
}

export async function generateTitleCard(
  title: string,
  theme: string
): Promise<string> {
  const prompt = `A cinematic title card for a video titled '${title}', theme: ${theme}. Professional, clean typography on a cinematic background. The text '${title}' should be clearly visible and legible.`;

  const filePath = await generateAndSaveImage(prompt, "title-card.png");
  console.log(`Title card saved to ${filePath}`);
  return filePath;
}

export async function generateAllAssets(
  script: Script
): Promise<{ titleCard: string; keyframes: Map<number, string> }> {
  const results = await Promise.allSettled([
    generateTitleCard(script.title, script.theme),
    ...script.scenes.map((scene) => generateKeyframe(scene)),
  ]);

  const titleCardResult = results[0];
  let titleCard = "";
  if (titleCardResult.status === "fulfilled") {
    titleCard = titleCardResult.value;
  } else {
    console.error("Title card generation failed:", titleCardResult.reason);
  }

  const keyframes = new Map<number, string>();
  for (let i = 0; i < script.scenes.length; i++) {
    const result = results[i + 1];
    const sceneNum = script.scenes[i].scene_number;

    if (result.status === "fulfilled") {
      keyframes.set(sceneNum, result.value);
    } else {
      console.error(
        `Keyframe for scene ${sceneNum} failed:`,
        result.reason
      );
    }
  }

  console.log(
    `Asset generation complete: title card ${titleCard ? "OK" : "FAILED"}, ${keyframes.size}/${script.scenes.length} keyframes succeeded`
  );

  return { titleCard, keyframes };
}

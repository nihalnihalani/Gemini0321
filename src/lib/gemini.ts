import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { ScriptSchema } from "./schemas";
import type { Script } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const SYSTEM_PROMPT = `You are a professional cinematic video script writer. Your job is to generate structured video scripts for AI-powered video generation.

When given a topic or concept, create a compelling, visually rich video script. Each scene must have:
- A vivid, detailed visual description suitable for AI video generation (include setting, subjects, actions, lighting, colors, atmosphere)
- Concise narration text for voiceover or captions
- Appropriate camera direction (wide shot, close-up, tracking shot, slow pan, aerial, etc.)
- A mood that matches the scene's emotional tone
- A duration between 4 and 8 seconds
- A transition type to the next scene (cut, fade, dissolve, or wipe)

Guidelines:
- Create a cohesive narrative arc across all scenes
- Vary camera angles and movements for visual interest
- Make visual descriptions specific and concrete, not abstract
- Keep narration concise and impactful
- Ensure total_duration_seconds equals the sum of all scene durations
- Scene numbers must be sequential starting from 1
- Choose a fitting title, theme, target audience, and music prompt for the overall video`;

export async function generateScript(
  prompt: string,
  sceneCount: number = 5
): Promise<Script> {
  const jsonSchema = z.toJSONSchema(ScriptSchema, { target: "draft-7" });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Create a video script with exactly ${sceneCount} scenes for the following concept:\n\n${prompt}`,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseJsonSchema: jsonSchema,
      temperature: 0.8,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  const parsed = JSON.parse(text);
  const script = ScriptSchema.parse(parsed);

  return script;
}

import { z } from "zod";

export const SceneSchema = z.object({
  scene_number: z.number().describe("Sequential scene number starting from 1"),
  title: z.string().describe("Short descriptive title for this scene"),
  visual_description: z
    .string()
    .describe(
      "Detailed visual description for AI video generation. Include setting, subjects, actions, lighting, camera angle, and atmosphere. Be specific and cinematic."
    ),
  narration_text: z
    .string()
    .describe("Narration or caption text to overlay on this scene"),
  duration_seconds: z
    .number()
    .min(4)
    .max(8)
    .describe("Scene duration in seconds (4, 6, or 8)"),
  camera_direction: z
    .string()
    .describe(
      "Camera movement and framing: e.g. wide shot, close-up, slow pan left, tracking shot, static"
    ),
  mood: z
    .string()
    .describe(
      "Emotional tone of the scene: e.g. dramatic, upbeat, calm, tense, inspiring"
    ),
  transition: z
    .enum(["cut", "fade", "dissolve", "wipe"])
    .describe("Transition type to the next scene"),
});

export const ScriptSchema = z.object({
  title: z.string().describe("Title of the video"),
  theme: z
    .string()
    .describe("Overall theme or genre: e.g. documentary, promotional, educational"),
  target_audience: z
    .string()
    .describe("Who this video is intended for"),
  music_prompt: z
    .string()
    .describe(
      "Prompt for background music generation. Describe genre, mood, tempo, instruments."
    ),
  scenes: z
    .array(SceneSchema)
    .min(3)
    .max(8)
    .describe("Array of scenes that make up the video"),
  total_duration_seconds: z
    .number()
    .describe("Total estimated duration of the video in seconds"),
});

export const GenerateRequestSchema = z.object({
  prompt: z.string().min(10).max(2000),
  resolution: z.enum(["720p", "1080p"]).optional().default("720p"),
  sceneCount: z.number().min(3).max(8).optional().default(5),
});

export type ScriptOutput = z.infer<typeof ScriptSchema>;
export type SceneOutput = z.infer<typeof SceneSchema>;

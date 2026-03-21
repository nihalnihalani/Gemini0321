import React from "react";
import { Composition, registerRoot } from "remotion";
import { z } from "zod";
import { AIVideo, type AIVideoProps } from "./compositions/AIVideo";
import { type GeneratedScript, DEFAULT_STYLE } from "../lib/types";
import { CompositionStyleSchema } from "../lib/schemas";

const sceneSchema = z.object({
  scene_number: z.number(),
  title: z.string(),
  visual_description: z.string(),
  narration_text: z.string(),
  duration_seconds: z.number(),
  camera_direction: z.string(),
  mood: z.string(),
  transition: z.enum(["cut", "fade", "dissolve", "wipe"]),
  videoUrl: z.string(),
  videoLocalPath: z.string().optional(),
});

const scriptSchema = z.object({
  title: z.string(),
  theme: z.string(),
  target_audience: z.string(),
  music_prompt: z.string(),
  scenes: z.array(sceneSchema),
  total_duration_seconds: z.number(),
  musicUrl: z.string().optional(),
});

const propsSchema = z.object({
  script: scriptSchema,
  compositionStyle: CompositionStyleSchema.optional(),
});

const FPS = 30;
const INTRO_OUTRO_SECONDS = 6; // 3s intro + 3s outro

const defaultScript: GeneratedScript = {
  title: "Sample AI Video",
  theme: "technology",
  target_audience: "general",
  music_prompt: "upbeat electronic background music",
  total_duration_seconds: 10,
  scenes: [
    {
      scene_number: 1,
      title: "Introduction",
      visual_description: "A futuristic cityscape at sunset",
      narration_text: "Welcome to the future of AI-generated video.",
      duration_seconds: 5,
      camera_direction: "slow zoom in",
      mood: "inspiring",
      transition: "fade",
      videoUrl: "https://example.com/placeholder.mp4",
    },
    {
      scene_number: 2,
      title: "Conclusion",
      visual_description: "A montage of technology innovations",
      narration_text: "The possibilities are endless.",
      duration_seconds: 5,
      camera_direction: "pan right",
      mood: "hopeful",
      transition: "cut",
      videoUrl: "https://example.com/placeholder2.mp4",
    },
  ],
};

const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition<typeof propsSchema, AIVideoProps>
        id="AIVideo"
        component={AIVideo}
        fps={FPS}
        width={1920}
        height={1080}
        schema={propsSchema}
        defaultProps={{ script: defaultScript, compositionStyle: DEFAULT_STYLE }}
        calculateMetadata={({ props }) => {
          return {
            durationInFrames: Math.round(
              (props.script.total_duration_seconds + INTRO_OUTRO_SECONDS) * FPS
            ),
          };
        }}
      />
    </>
  );
};

registerRoot(RemotionRoot);

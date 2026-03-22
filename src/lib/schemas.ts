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

export const ProductLaunchInputSchema = z.object({
  brandName: z.string().describe("Brand or product name"),
  tagline: z.string().describe("Short tagline or slogan"),
  productImages: z.array(z.string()).describe("URLs of product images"),
  features: z.array(z.string()).min(2).max(6).describe("Key product features"),
  brandColor: z.string().optional().describe("Primary brand color as hex"),
  logoUrl: z.string().optional().describe("Brand logo URL"),
});

export const ExplainerInputSchema = z.object({
  title: z.string().describe("Video title"),
  steps: z.array(z.object({
    title: z.string().describe("Step title"),
    description: z.string().describe("Step description written in conversational narration style, as if spoken by a great teacher explaining to a curious student"),
    iconUrl: z.string().optional().describe("Optional icon/diagram URL"),
  })).min(2).max(6).describe("Explanation steps"),
  conclusion: z.string().describe("Summary or conclusion text"),
  introNarration: z.string().optional().describe("A 2-3 sentence spoken introduction that hooks the viewer and sets up the topic. Conversational, engaging, like a great teacher. Example: 'Have you ever wondered how your phone knows what you're saying? Today, we're going to break down speech recognition in 4 simple steps.'"),
  summaryNarration: z.string().optional().describe("A 2-3 sentence spoken conclusion that wraps up the learning memorably. Example: 'And there you have it — from sound waves to text on your screen. Speech recognition isn't magic, it's just math, data, and a lot of practice.'"),
  narrationUrls: z.record(z.string(), z.string()).optional().describe("Map of scene number to narration audio URL"),
  sfxUrls: z.record(z.string(), z.string()).optional().describe("Map of scene number to sound effect URL"),
  musicUrl: z.string().optional().describe("Background music URL"),
});

export const SocialPromoInputSchema = z.object({
  hook: z.string().describe("Attention-grabbing hook text"),
  productImage: z.string().describe("Main product image URL"),
  features: z.array(z.string()).min(2).max(4).describe("Quick feature highlights"),
  cta: z.string().describe("Call to action text"),
  aspectRatio: z.enum(["16:9", "9:16"]).describe("Video aspect ratio"),
});

export const BrandStoryInputSchema = z.object({
  companyName: z.string().describe("Company name"),
  mission: z.string().describe("Company mission statement"),
  teamPhotos: z.array(z.string()).describe("Team member photo URLs"),
  milestones: z.array(z.object({
    year: z.string().describe("Year of milestone"),
    event: z.string().describe("What happened"),
  })).min(2).max(6).describe("Company milestones"),
  vision: z.string().describe("Vision statement for the future"),
  logoUrl: z.string().optional().describe("Company logo URL"),
});

export const GenerateRequestSchema = z.object({
  prompt: z.string().min(10).max(2000),
  templateId: z.enum(["custom", "product-launch", "explainer", "social-promo", "brand-story", "editorial"]).optional().default("product-launch"),
  sourceType: z.enum(["prompt", "youtube", "github"]).optional().default("prompt"),
  sourceUrl: z.string().optional(),
  assets: z.array(z.string()).optional(),
  enableVeo: z.boolean().optional().default(false),
  engine: z.enum(["veo3", "nano-banan", "auto"]).optional().default("auto"),
  resolution: z.enum(["720p", "1080p"]).optional().default("720p"),
  sceneCount: z.number().min(3).max(8).optional().default(5),
});

export const CompositionStyleSchema = z.object({
  titleFontSize: z.number().min(12).max(200).describe("Title text font size in pixels"),
  titleColor: z.string().describe("Title text color as hex (e.g. #ffffff)"),
  titleFontFamily: z.string().describe("Title font family (e.g. sans-serif, serif, monospace)"),
  showTitle: z.boolean().describe("Whether to show the title overlay on the first scene"),
  subtitleFontSize: z.number().min(12).max(100).describe("Subtitle text font size in pixels"),
  subtitleColor: z.string().describe("Subtitle text color as hex"),
  subtitleBgColor: z.string().describe("Subtitle background color as hex"),
  subtitleBgOpacity: z.number().min(0).max(1).describe("Subtitle background opacity (0-1)"),
  subtitlePosition: z.enum(["top", "center", "bottom"]).describe("Subtitle vertical position"),
  showSubtitles: z.boolean().describe("Whether to show subtitle overlays"),
  transitionType: z
    .enum(["cut", "fade", "dissolve", "wipe", "per-scene"])
    .describe("Transition type between scenes. 'per-scene' uses each scene's own transition setting"),
  transitionDurationFrames: z
    .number()
    .min(0)
    .max(60)
    .describe("Transition duration in frames (at 30fps)"),
  musicVolume: z.number().min(0).max(1).describe("Background music volume (0-1)"),
  overlayColor: z.string().describe("Color overlay/tint on video as hex"),
  overlayOpacity: z.number().min(0).max(0.8).describe("Color overlay opacity (0 = no overlay, 0.8 = heavy tint)"),
  watermarkText: z.string().describe("Watermark text to display"),
  showWatermark: z.boolean().describe("Whether to show watermark"),
});

export const EditRequestSchema = z.object({
  instruction: z.string().min(1).max(1000),
  currentStyle: CompositionStyleSchema,
});

export type ScriptOutput = z.infer<typeof ScriptSchema>;
export type SceneOutput = z.infer<typeof SceneSchema>;
export type CompositionStyleOutput = z.infer<typeof CompositionStyleSchema>;

export interface Scene {
  scene_number: number;
  title: string;
  visual_description: string;
  narration_text: string;
  duration_seconds: number;
  camera_direction: string;
  mood: string;
  transition: "cut" | "fade" | "dissolve" | "wipe";
}

export interface Script {
  title: string;
  theme: string;
  target_audience: string;
  music_prompt: string;
  scenes: Scene[];
  total_duration_seconds: number;
}

export interface GeneratedScene extends Scene {
  videoUrl: string;
  videoLocalPath?: string;
  narrationAudioUrl?: string;
  soundEffectUrl?: string;
}

export interface GeneratedScript extends Omit<Script, "scenes"> {
  scenes: GeneratedScene[];
  musicUrl?: string;
  titleCardUrl?: string;
}

export type JobStage =
  | "queued"
  | "generating_script"
  | "generating_clips"
  | "uploading_assets"
  | "composing_video"
  | "completed"
  | "failed";

export interface SceneProgress {
  scene_number: number;
  status: "pending" | "generating" | "uploading" | "done" | "failed";
  error?: string;
}

export interface JobStatus {
  jobId: string;
  stage: JobStage;
  progress: number; // 0-100
  message: string;
  scenes?: SceneProgress[];
  script?: Script;
  generatedScript?: GeneratedScript;
  previewUrl?: string;
  downloadUrl?: string;
  error?: string;

  createdAt: string;
  updatedAt: string;
}

export interface CompositionStyle {
  // Title overlay
  titleFontSize: number;
  titleColor: string;
  titleFontFamily: string;
  showTitle: boolean;

  // Subtitle overlay
  subtitleFontSize: number;
  subtitleColor: string;
  subtitleBgColor: string;
  subtitleBgOpacity: number;
  subtitlePosition: "top" | "center" | "bottom";
  showSubtitles: boolean;

  // Transition overrides
  transitionType: "cut" | "fade" | "dissolve" | "wipe" | "per-scene";
  transitionDurationFrames: number;

  // Music
  musicVolume: number;

  // Color overlay / tint
  overlayColor: string;
  overlayOpacity: number;

  // Watermark
  watermarkText: string;
  showWatermark: boolean;
}

export const DEFAULT_STYLE: CompositionStyle = {
  titleFontSize: 72,
  titleColor: "#ffffff",
  titleFontFamily: "sans-serif",
  showTitle: true,
  subtitleFontSize: 36,
  subtitleColor: "#ffffff",
  subtitleBgColor: "#000000",
  subtitleBgOpacity: 0.6,
  subtitlePosition: "bottom",
  showSubtitles: true,
  transitionType: "per-scene",
  transitionDurationFrames: 15,
  musicVolume: 0.3,
  overlayColor: "#000000",
  overlayOpacity: 0,
  watermarkText: "",
  showWatermark: false,
};

export interface EditRequest {
  instruction: string;
  currentStyle: CompositionStyle;
}

export interface EditResponse {
  style: CompositionStyle;
  explanation: string;
}

export interface EditHistoryEntry {
  instruction: string;
  style: CompositionStyle;
  explanation: string;
  timestamp: string;
}

export type GenerationEngine = "veo3" | "nano-banan" | "auto";

export interface GenerateRequest {
  prompt: string;
  templateId?: TemplateId;
  sourceType?: SourceType;
  sourceUrl?: string;
  assets?: string[];
  enableVeo?: boolean;
  engine?: GenerationEngine;
  resolution?: "720p" | "1080p";
  sceneCount?: number;
}

export const ENGINE_INFO: Record<GenerationEngine, { name: string; description: string; icon: string }> = {
  veo3: {
    name: "Veo 3",
    description: "AI-generated video clips per scene. Best for motion-heavy content.",
    icon: "film",
  },
  "nano-banan": {
    name: "Nano Banan Pro",
    description: "AI-generated images per scene. Best for presentations and visual stories.",
    icon: "image",
  },
  auto: {
    name: "Auto",
    description: "AI picks the best engine per scene. Recommended for most projects.",
    icon: "sparkles",
  },
};

export interface GenerateResponse {
  jobId: string;
  message: string;
}

// Template system types
export type TemplateId = 'product-launch' | 'explainer' | 'social-promo' | 'brand-story' | 'editorial';
export type TemplateIdOrCustom = TemplateId | 'custom';

export interface ProductLaunchInput {
  brandName: string;
  tagline: string;
  productImages: string[];
  features: string[];
  brandColor?: string;
  logoUrl?: string;
}

export interface ExplainerInput {
  title: string;
  steps: { title: string; description: string; iconUrl?: string }[];
  conclusion: string;
  introNarration?: string;
  summaryNarration?: string;
  narrationUrls?: Record<number, string>;
  sfxUrls?: Record<number, string>;
  musicUrl?: string;
}

export interface SocialPromoInput {
  hook: string;
  productImage: string;
  features: string[];
  cta: string;
  aspectRatio: '16:9' | '9:16';
}

export interface BrandStoryInput {
  companyName: string;
  mission: string;
  teamPhotos: string[];
  milestones: { year: string; event: string }[];
  vision: string;
  logoUrl?: string;
}

export interface EditorialInput {
  prompt: string;
  brainMode?: 'rule-based' | 'llm';
  resolution?: '1080p' | '4k';
}

export type TemplateInput = ProductLaunchInput | ExplainerInput | SocialPromoInput | BrandStoryInput | EditorialInput;

export interface TemplateConfig {
  id: TemplateId;
  name: string;
  description: string;
  defaultDurationSeconds: number;
  defaultAspectRatio: '16:9' | '9:16';
  compositionId: string;
}

export interface YouTubeMetadata {
  title: string;
  description: string;
  thumbnailUrl: string;
  channelName: string;
  viewCount?: string;
  publishedAt?: string;
}

export interface GitHubMetadata {
  name: string;
  description: string;
  stars: number;
  language: string;
  topics: string[];
  readmeContent: string;
  ownerAvatarUrl: string;
  features: string[];
}

export type SourceType = 'prompt' | 'youtube' | 'github';

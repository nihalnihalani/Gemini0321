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

export interface GenerateRequest {
  prompt: string;
  resolution?: "720p" | "1080p";
  sceneCount?: number;
}

export interface GenerateResponse {
  jobId: string;
  message: string;
}

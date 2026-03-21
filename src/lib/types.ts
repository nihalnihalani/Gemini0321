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
  previewUrl?: string;
  downloadUrl?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
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

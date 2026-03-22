"use client";

import type { JobStatus, JobStage, SceneProgress } from "@/lib/types";

interface GenerationProgressProps {
  status: JobStatus;
}

const PIPELINE_STEPS = [
  { key: "queued", label: "Queue" },
  { key: "generating_script", label: "Script" },
  { key: "generating_clips", label: "Clips" },
  { key: "uploading_assets", label: "Assets" },
  { key: "composing_video", label: "Render" },
  { key: "completed", label: "Complete" },
] as const;

const STAGE_ORDER: JobStage[] = [
  "queued",
  "generating_script",
  "generating_clips",
  "uploading_assets",
  "composing_video",
  "completed",
];

function getStepIndex(stage: JobStage): number {
  if (stage === "failed") return -1;
  return STAGE_ORDER.indexOf(stage);
}

function getStepState(
  stepIndex: number,
  currentStage: JobStage
): "completed" | "active" | "pending" {
  const currentIndex = getStepIndex(currentStage);
  if (currentStage === "failed") return "pending";
  if (stepIndex < currentIndex) return "completed";
  if (stepIndex === currentIndex) return "active";
  return "pending";
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function SceneCard({
  scene,
  index,
  sceneTitle,
}: {
  scene: SceneProgress;
  index: number;
  sceneTitle?: string;
}) {
  const statusConfig: Record<
    string,
    { dot: string; label: string; animate?: boolean; spinner?: boolean }
  > = {
    done: { dot: "bg-[#7ddc8e]", label: "Complete" },
    generating: {
      dot: "bg-[#cdbdff]",
      label: "Generating...",
      spinner: true,
    },
    uploading: { dot: "bg-[#9ccaff]", label: "Uploading..." },
    pending: { dot: "bg-[#958da2]", label: "Pending" },
    failed: { dot: "bg-[#ffb4ab]", label: "Failed" },
  };

  const config = statusConfig[scene.status] || statusConfig.pending;

  return (
    <div
      className="rounded-xl bg-[#1b1b20] p-5 animate-fade-in-up transition-colors duration-200 hover:bg-[#22222a]"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: "both" }}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-medium uppercase tracking-wider text-[#958da2]">
            Scene {scene.scene_number}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {config.spinner ? (
            <span className="text-[#cdbdff]">
              <SpinnerIcon />
            </span>
          ) : (
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${config.dot}`}
            />
          )}
          <span
            className={`text-xs font-medium ${
              scene.status === "done"
                ? "text-[#7ddc8e]"
                : scene.status === "generating"
                  ? "text-[#cdbdff]"
                  : scene.status === "uploading"
                    ? "text-[#9ccaff]"
                    : scene.status === "failed"
                      ? "text-[#ffb4ab]"
                      : "text-[#958da2]"
            }`}
          >
            {config.label}
          </span>
        </div>
      </div>
      {sceneTitle && (
        <p className="mt-2 text-xs text-[#cbc3d9] truncate opacity-70">
          {sceneTitle}
        </p>
      )}
      {scene.status === "failed" && scene.error && (
        <p className="mt-3 text-xs text-[#ffb4ab] truncate">{scene.error}</p>
      )}
    </div>
  );
}

export default function GenerationProgress({
  status,
}: GenerationProgressProps) {
  const isCompleted = status.stage === "completed";
  const isFailed = status.stage === "failed";

  return (
    <div className="w-full max-w-2xl space-y-8 animate-fade-in-up">
      {/* Pipeline Stepper */}
      <div className="flex items-start justify-between">
        {PIPELINE_STEPS.map((step, i) => {
          const state = getStepState(i, status.stage);
          return (
            <div key={step.key} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-2">
                {/* Step dot */}
                <div
                  className={`relative flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                    state === "completed"
                      ? "bg-[#5c1fde] text-[#e4e1e9]"
                      : state === "active"
                        ? "bg-[#cdbdff] text-[#370096]"
                        : "bg-[#2a292f] text-[#958da2]"
                  }`}
                >
                  {state === "active" && (
                    <span className="absolute inset-0 rounded-full bg-[#cdbdff] opacity-40 animate-pulse-glow" />
                  )}
                  <span className="relative z-10">
                    {state === "completed" ? <CheckIcon /> : i + 1}
                  </span>
                </div>
                {/* Step label */}
                <span
                  className={`text-[11px] font-medium tracking-wide ${
                    state === "active"
                      ? "text-[#cdbdff]"
                      : state === "completed"
                        ? "text-[#e4e1e9]"
                        : "text-[#958da2]"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {/* Connecting line */}
              {i < PIPELINE_STEPS.length - 1 && (
                <div className="relative mx-1 mt-[-12px] h-[2px] flex-1 self-start top-[18px]">
                  <div className="absolute inset-0 bg-[#2a292f] rounded-full" />
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                      state === "completed"
                        ? "w-full bg-[#5c1fde]"
                        : "w-0"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      {!isCompleted && !isFailed && (
        <div className="space-y-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#2a292f]">
            <div
              className="relative h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${status.progress}%`,
                background:
                  "linear-gradient(90deg, #5c1fde 0%, #cdbdff 60%, #9ccaff 100%)",
              }}
            >
              <div
                className="absolute inset-0 rounded-full animate-pulse"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 2s ease-in-out infinite",
                }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#cbc3d9]">{status.message}</p>
            <span className="text-xs font-medium tracking-wider text-[#958da2]">
              {status.progress}%
            </span>
          </div>
        </div>
      )}

      {/* Scene Cards Grid */}
      {status.scenes && status.scenes.length > 0 && !isCompleted && (
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#958da2]">
            Scenes
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {status.scenes.map((scene, i) => (
              <SceneCard
                key={scene.scene_number}
                scene={scene}
                index={i}
                sceneTitle={status.script?.scenes?.[i]?.title}
              />
            ))}
          </div>
        </div>
      )}

      {/* Failed State */}
      {isFailed && status.error && (
        <div className="rounded-xl bg-[#93000a]/20 p-5 ring-1 ring-inset ring-[#ffb4ab]/20">
          <p className="text-sm font-semibold text-[#ffb4ab]">
            Generation Failed
          </p>
          <div className="mt-3 space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-[#ffb4ab]/60">
              What went wrong
            </p>
            <p className="text-sm text-[#ffb4ab]/80">{status.error}</p>
          </div>
        </div>
      )}

      {/* Completed State */}
      {isCompleted && (
        <div className="space-y-5 animate-fade-in-up">
          <div className="text-center space-y-2">
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#5c1fde]"
              style={{
                animation: "scale-spring 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both",
              }}
            >
              <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-[#e4e1e9]">
              Video Ready
            </h2>
            <p className="text-sm text-[#cbc3d9]">
              Your video has been generated successfully.
            </p>
          </div>

          {status.previewUrl && (
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: "#0e0e13",
                boxShadow: "0 4px 40px rgba(79, 0, 208, 0.08), 0 2px 20px rgba(0, 0, 0, 0.4)",
                border: "1px solid rgba(73, 68, 86, 0.2)",
              }}
            >
              <video
                src={status.previewUrl}
                controls
                className="w-full rounded-lg"
              />
            </div>
          )}

          {(status.downloadUrl || status.previewUrl) && (
            <div className="flex justify-center">
              <a
                href={status.downloadUrl || status.previewUrl}
                className="inline-flex items-center gap-2 rounded-xl bg-[#5c1fde] px-8 py-3 text-sm font-semibold text-[#e4e1e9] transition-all hover:bg-[#7640f0] hover:shadow-[0_0_24px_rgba(92,31,222,0.4)]"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                Download Video
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

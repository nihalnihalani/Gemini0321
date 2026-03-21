"use client";

import type { JobStatus, SceneProgress } from "@/lib/types";

interface GenerationProgressProps {
  status: JobStatus;
}

const PIPELINE_STEPS = [
  { key: "generating_script", label: "Script" },
  { key: "generating_clips", label: "Clips" },
  { key: "uploading_assets", label: "Upload" },
  { key: "composing_video", label: "Compose" },
  { key: "completed", label: "Done" },
] as const;

function getStepState(
  stepKey: string,
  currentStage: string
): "completed" | "active" | "pending" {
  const stageOrder = [
    "queued",
    "generating_script",
    "generating_clips",
    "uploading_assets",
    "composing_video",
    "completed",
  ];
  const currentIndex = stageOrder.indexOf(currentStage);
  const stepIndex = stageOrder.indexOf(stepKey);

  if (currentStage === "failed") {
    // Mark steps before the failure as completed, current as active
    return stepIndex < currentIndex ? "completed" : "pending";
  }
  if (stepIndex < currentIndex) return "completed";
  if (stepIndex === currentIndex) return "active";
  return "pending";
}

function SceneCard({ scene }: { scene: SceneProgress }) {
  const statusColors: Record<string, string> = {
    pending: "border-gray-700 text-gray-500",
    generating: "border-blue-500 text-blue-400",
    uploading: "border-yellow-500 text-yellow-400",
    done: "border-green-500 text-green-400",
    failed: "border-red-500 text-red-400",
  };

  const statusIcons: Record<string, string> = {
    pending: "...",
    generating: "~",
    uploading: "^",
    done: "ok",
    failed: "!",
  };

  return (
    <div
      className={`rounded-lg border bg-white/5 px-3 py-2 text-center text-sm ${statusColors[scene.status]}`}
    >
      <div className="font-medium text-gray-300">Scene {scene.scene_number}</div>
      <div className="mt-1 text-xs capitalize">
        {statusIcons[scene.status]} {scene.status}
      </div>
      {scene.error && (
        <div className="mt-1 truncate text-xs text-red-400">{scene.error}</div>
      )}
    </div>
  );
}

export default function GenerationProgress({ status }: GenerationProgressProps) {
  return (
    <div className="w-full max-w-2xl space-y-8">
      {/* Step indicator */}
      <div className="flex items-center justify-between">
        {PIPELINE_STEPS.map((step, i) => {
          const state = getStepState(step.key, status.stage);
          return (
            <div key={step.key} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
                    state === "completed"
                      ? "border-green-500 bg-green-500/20 text-green-400"
                      : state === "active"
                        ? "border-blue-500 bg-blue-500/20 text-blue-400"
                        : "border-gray-700 bg-gray-900 text-gray-600"
                  }`}
                >
                  {state === "completed" ? (
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={`text-xs ${
                    state === "active" ? "text-blue-400" : "text-gray-500"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < PIPELINE_STEPS.length - 1 && (
                <div
                  className={`mx-2 h-0.5 flex-1 ${
                    state === "completed" ? "bg-green-500/50" : "bg-gray-800"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div>
        <div className="mb-1 flex justify-between text-sm">
          <span className="text-gray-400">{status.message}</span>
          <span className="text-gray-500">{status.progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-500"
            style={{ width: `${status.progress}%` }}
          />
        </div>
      </div>

      {/* Scene grid */}
      {status.scenes && status.scenes.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-gray-400">Scene Progress</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {status.scenes.map((scene) => (
              <SceneCard key={scene.scene_number} scene={scene} />
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {status.stage === "failed" && status.error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400">
          <p className="font-medium">Generation Failed</p>
          <p className="mt-1 text-sm">{status.error}</p>
        </div>
      )}

      {/* Completed state */}
      {status.stage === "completed" && (
        <div className="space-y-4 rounded-xl border border-green-500/30 bg-green-500/10 p-4">
          <p className="font-medium text-green-400">Video generated successfully!</p>
          {status.previewUrl && (
            <video
              src={status.previewUrl}
              controls
              className="w-full rounded-lg"
            />
          )}
          {status.downloadUrl && (
            <a
              href={status.downloadUrl}
              className="inline-block rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-6 py-3 font-medium text-white transition hover:from-blue-600 hover:to-violet-600"
            >
              Download Video
            </a>
          )}
        </div>
      )}
    </div>
  );
}

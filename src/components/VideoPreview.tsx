"use client";

import { Player } from "@remotion/player";
import { AIVideo } from "@/remotion/compositions/AIVideo";
import type { GeneratedScript, CompositionStyle } from "@/lib/types";

interface VideoPreviewProps {
  script: GeneratedScript;
  style: CompositionStyle;
}

export default function VideoPreview({ script, style }: VideoPreviewProps) {
  const durationInFrames = Math.round(script.total_duration_seconds * 30);

  return (
    <div className="animate-fade-in">
      <span
        className="text-label-md mb-3 block uppercase tracking-widest"
        style={{ color: "var(--outline)", fontSize: "0.6875rem", letterSpacing: "0.12em" }}
      >
        PREVIEW
      </span>
      <div
        className="rounded-xl p-1.5"
        style={{
          background: "#0e0e13",
          border: "1px solid rgba(73, 68, 86, 0.25)",
          boxShadow:
            "0 4px 40px rgba(79, 0, 208, 0.08), 0 8px 60px rgba(79, 0, 208, 0.1), 0 2px 20px rgba(0, 0, 0, 0.4)",
        }}
      >
        <div className="relative overflow-hidden rounded-lg">
          <Player
            component={AIVideo}
            inputProps={{ script, compositionStyle: style }}
            compositionWidth={1920}
            compositionHeight={1080}
            fps={30}
            controls
            style={{ width: "100%" }}
            durationInFrames={durationInFrames || 300}
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-8"
            style={{
              background: "linear-gradient(to top, rgba(14, 14, 19, 0.3), transparent)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

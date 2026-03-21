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
    <div className="overflow-hidden rounded-xl shadow-2xl shadow-black/50">
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
    </div>
  );
}

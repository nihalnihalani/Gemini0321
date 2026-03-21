import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  useCurrentFrame,
  interpolate,
} from "remotion";
import { TextOverlay } from "../components/TextOverlay";
import { CaptionRenderer } from "../components/CaptionRenderer";
import { type GeneratedScene, type CompositionStyle, DEFAULT_STYLE } from "../../lib/types";

interface SceneSequenceProps {
  scene: GeneratedScene;
  compositionStyle?: CompositionStyle;
  useCaptions?: boolean;
}

export const SceneSequence: React.FC<SceneSequenceProps> = ({
  scene,
  compositionStyle = DEFAULT_STYLE,
  useCaptions = false,
}) => {
  const frame = useCurrentFrame();

  const titleOpacity =
    scene.scene_number === 1
      ? interpolate(frame, [0, 30, 50, 60], [0, 1, 1, 0], {
          extrapolateRight: "clamp",
        })
      : 0;

  return (
    <AbsoluteFill>
      <AbsoluteFill>
        <OffthreadVideo
          src={scene.videoUrl}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>

      {compositionStyle.overlayOpacity > 0 && (
        <AbsoluteFill
          style={{
            backgroundColor: compositionStyle.overlayColor,
            opacity: compositionStyle.overlayOpacity,
          }}
        />
      )}

      {useCaptions ? (
        <CaptionRenderer text={scene.narration_text} style={compositionStyle} />
      ) : (
        <TextOverlay text={scene.narration_text} style="subtitle" compositionStyle={compositionStyle} />
      )}

      {scene.scene_number === 1 && (
        <AbsoluteFill style={{ opacity: titleOpacity }}>
          <TextOverlay text={scene.title} style="title" compositionStyle={compositionStyle} />
        </AbsoluteFill>
      )}

      {compositionStyle.showWatermark && compositionStyle.watermarkText && (
        <AbsoluteFill
          style={{
            justifyContent: "flex-end",
            alignItems: "flex-end",
            padding: 20,
          }}
        >
          <div
            style={{
              color: "rgba(255, 255, 255, 0.5)",
              fontSize: 14,
              fontFamily: "sans-serif",
            }}
          >
            {compositionStyle.watermarkText}
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

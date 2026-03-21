import React from "react";
import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Img,
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
  const isImageAsset =
    !!scene.videoUrl &&
    /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(scene.videoUrl);

  const titleOpacity =
    scene.scene_number === 1
      ? interpolate(frame, [0, 30, 50, 60], [0, 1, 1, 0], {
          extrapolateRight: "clamp",
        })
      : 0;

  return (
    <AbsoluteFill>
      <AbsoluteFill>
        {scene.videoUrl ? (
          isImageAsset ? (
            <Img
              src={scene.videoUrl}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <OffthreadVideo
              src={scene.videoUrl}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )
        ) : (
          <AbsoluteFill
            style={{
              background:
                "linear-gradient(135deg, #0f172a 0%, #1d4ed8 45%, #0f172a 100%)",
              justifyContent: "center",
              alignItems: "center",
              padding: 80,
            }}
          >
            <div
              style={{
                color: "#ffffff",
                fontSize: 56,
                fontWeight: 700,
                textAlign: "center",
                textShadow: "0 4px 16px rgba(0,0,0,0.45)",
              }}
            >
              {scene.title}
            </div>
          </AbsoluteFill>
        )}
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

      {scene.narrationAudioUrl && (
        <Audio src={scene.narrationAudioUrl} volume={1} />
      )}

      {scene.soundEffectUrl && (
        <Audio src={scene.soundEffectUrl} volume={0.4} />
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

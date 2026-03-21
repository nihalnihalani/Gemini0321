import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
} from "remotion";
import { type CompositionStyle } from "../../lib/types";

interface TitleSequenceProps {
  title: string;
  theme: string;
  imageUrl?: string;
  compositionStyle: CompositionStyle;
}

export const TitleSequence: React.FC<TitleSequenceProps> = ({
  title,
  theme,
  imageUrl,
  compositionStyle,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const themeOpacity = interpolate(frame, [20, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      {imageUrl ? (
        <AbsoluteFill>
          <Img
            src={imageUrl}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          <AbsoluteFill
            style={{
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.7) 100%)",
            }}
          />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 40%, #16213e 70%, #0f3460 100%)",
          }}
        />
      )}

      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <div
          style={{
            transform: `scale(${titleScale})`,
            color: compositionStyle.titleColor,
            fontSize: compositionStyle.titleFontSize,
            fontFamily: compositionStyle.titleFontFamily,
            fontWeight: "bold",
            textAlign: "center",
            textShadow: "0 4px 16px rgba(0, 0, 0, 0.8)",
            padding: "0 80px",
          }}
        >
          {title}
        </div>

        <div
          style={{
            opacity: themeOpacity,
            color: compositionStyle.subtitleColor,
            fontSize: Math.round(compositionStyle.titleFontSize * 0.4),
            fontFamily: compositionStyle.titleFontFamily,
            textAlign: "center",
            textTransform: "uppercase",
            letterSpacing: 4,
            textShadow: "0 2px 8px rgba(0, 0, 0, 0.6)",
          }}
        >
          {theme}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

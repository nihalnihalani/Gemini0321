import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { type CompositionStyle, DEFAULT_STYLE } from "../../lib/types";

interface TextOverlayProps {
  text: string;
  style?: "subtitle" | "title";
  compositionStyle?: CompositionStyle;
}

export const TextOverlay: React.FC<TextOverlayProps> = ({
  text,
  style = "subtitle",
  compositionStyle = DEFAULT_STYLE,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (style === "title") {
    if (!compositionStyle.showTitle) return null;

    const scale = spring({
      frame,
      fps,
      config: { damping: 12, stiffness: 100 },
    });

    return (
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            transform: `scale(${scale})`,
            color: compositionStyle.titleColor,
            fontSize: compositionStyle.titleFontSize,
            fontFamily: compositionStyle.titleFontFamily,
            fontWeight: "bold",
            textAlign: "center",
            textShadow: "0 4px 12px rgba(0, 0, 0, 0.7)",
            padding: "0 80px",
          }}
        >
          {text}
        </div>
      </AbsoluteFill>
    );
  }

  // Subtitle style
  if (!compositionStyle.showSubtitles) return null;

  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  const positionStyles: React.CSSProperties =
    compositionStyle.subtitlePosition === "top"
      ? { justifyContent: "flex-start", paddingTop: 80 }
      : compositionStyle.subtitlePosition === "center"
        ? { justifyContent: "center" }
        : { justifyContent: "flex-end", paddingBottom: 80 };

  return (
    <AbsoluteFill
      style={{
        ...positionStyles,
        alignItems: "center",
      }}
    >
      <div
        style={{
          opacity,
          backgroundColor: `rgba(${parseInt(compositionStyle.subtitleBgColor.slice(1, 3), 16)}, ${parseInt(compositionStyle.subtitleBgColor.slice(3, 5), 16)}, ${parseInt(compositionStyle.subtitleBgColor.slice(5, 7), 16)}, ${compositionStyle.subtitleBgOpacity})`,
          color: compositionStyle.subtitleColor,
          fontSize: compositionStyle.subtitleFontSize,
          padding: "16px 32px",
          borderRadius: 8,
          maxWidth: "80%",
          textAlign: "center",
          lineHeight: 1.4,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

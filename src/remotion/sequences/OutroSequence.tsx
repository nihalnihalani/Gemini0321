import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
} from "remotion";
import { type CompositionStyle } from "../../lib/types";

interface OutroSequenceProps {
  title: string;
  compositionStyle: CompositionStyle;
}

export const OutroSequence: React.FC<OutroSequenceProps> = ({
  title,
  compositionStyle,
}) => {
  const frame = useCurrentFrame();

  const creditOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
  });

  const titleOpacity = interpolate(frame, [20, 50], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)",
      }}
    >
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 32,
        }}
      >
        <div
          style={{
            opacity: creditOpacity,
            color: compositionStyle.subtitleColor,
            fontSize: 28,
            fontFamily: compositionStyle.titleFontFamily,
            textAlign: "center",
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          Created with AI Video Generator
        </div>

        <div
          style={{
            opacity: titleOpacity,
            color: compositionStyle.titleColor,
            fontSize: Math.round(compositionStyle.titleFontSize * 0.6),
            fontFamily: compositionStyle.titleFontFamily,
            fontWeight: "bold",
            textAlign: "center",
            textShadow: "0 2px 8px rgba(0, 0, 0, 0.6)",
            padding: "0 80px",
          }}
        >
          {title}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

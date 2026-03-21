import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from "remotion";
import { type CompositionStyle } from "../../lib/types";

interface CaptionRendererProps {
  text: string;
  style: CompositionStyle;
}

export const CaptionRenderer: React.FC<CaptionRendererProps> = ({
  text,
  style,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;

  const framesPerWord = durationInFrames / words.length;
  const currentWordIndex = Math.min(
    Math.floor(frame / framesPerWord),
    words.length - 1
  );

  const positionStyles: React.CSSProperties =
    style.subtitlePosition === "top"
      ? { justifyContent: "flex-start", paddingTop: 80 }
      : style.subtitlePosition === "center"
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
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "8px 12px",
          maxWidth: "80%",
          padding: "16px 32px",
        }}
      >
        {words.map((word, index) => {
          const isActive = index === currentWordIndex;
          const isPast = index < currentWordIndex;

          const wordStartFrame = index * framesPerWord;
          const localFrame = frame - wordStartFrame;

          const bounce = isActive
            ? spring({
                frame: Math.max(0, localFrame),
                fps,
                config: { damping: 15, stiffness: 120 },
              })
            : 1;

          const scale = isActive ? 1 + 0.15 * bounce : 1;
          const color = isActive
            ? style.subtitleColor
            : isPast
              ? style.subtitleColor
              : `${style.subtitleColor}66`;

          return (
            <span
              key={index}
              style={{
                fontSize: style.subtitleFontSize,
                fontFamily: "sans-serif",
                fontWeight: isActive ? "bold" : "normal",
                color,
                transform: `scale(${scale})`,
                display: "inline-block",
                textShadow: "0 2px 8px rgba(0, 0, 0, 0.8)",
                transition: "color 0.1s",
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

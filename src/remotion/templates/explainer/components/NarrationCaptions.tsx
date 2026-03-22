import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";

interface NarrationCaptionsProps {
  text: string;
  fontSize?: number;
  color?: string;
  activeColor?: string;
  position?: "bottom" | "center";
  showBackground?: boolean;
}

export const NarrationCaptions: React.FC<NarrationCaptionsProps> = ({
  text,
  fontSize = 30,
  color = "rgba(255, 255, 255, 0.5)",
  activeColor = "#a855f7",
  position = "bottom",
  showBackground = true,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;

  // Timing: words distributed across scene with buffers
  const startBuffer = 20;
  const endBuffer = 20;
  const activeFrames = Math.max(1, durationInFrames - startBuffer - endBuffer);
  const framesPerWord = Math.max(1, activeFrames / words.length);

  const adjustedFrame = Math.max(0, frame - startBuffer);
  const currentWordIndex = Math.min(
    Math.floor(adjustedFrame / framesPerWord),
    words.length - 1
  );

  // Don't show before start buffer
  if (frame < startBuffer) return null;

  // Group visible words into lines of ~6 words
  const wordsPerLine = 6;
  const currentLineStart =
    Math.floor(currentWordIndex / wordsPerLine) * wordsPerLine;
  const currentLineEnd = Math.min(currentLineStart + wordsPerLine, words.length);
  const visibleWords = words.slice(currentLineStart, currentLineEnd);
  const lineOffset = currentLineStart;

  // Caption container fade-in
  const captionOpacity = interpolate(frame, [startBuffer, startBuffer + 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  const positionStyle: React.CSSProperties =
    position === "bottom"
      ? { justifyContent: "flex-end", paddingBottom: 48 }
      : { justifyContent: "center" };

  return (
    <AbsoluteFill
      style={{
        ...positionStyle,
        alignItems: "center",
        opacity: captionOpacity,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "4px 8px",
          maxWidth: "75%",
          padding: showBackground ? "14px 28px" : "14px 0",
          borderRadius: showBackground ? 14 : 0,
          backgroundColor: showBackground ? "rgba(0, 0, 0, 0.55)" : "transparent",
        }}
      >
        {visibleWords.map((word, idx) => {
          const globalIdx = lineOffset + idx;
          const isActive = globalIdx === currentWordIndex;
          const isPast = globalIdx < currentWordIndex;

          const wordStartFrame = startBuffer + globalIdx * framesPerWord;
          const localFrame = Math.max(0, frame - wordStartFrame);

          const wordScale = isActive
            ? 1.0 +
              0.08 *
                spring({
                  frame: localFrame,
                  fps,
                  config: { damping: 18, stiffness: 200 },
                })
            : 1.0;

          return (
            <span
              key={globalIdx}
              style={{
                fontSize,
                fontFamily: "'Inter', system-ui, sans-serif",
                fontWeight: isActive ? 700 : isPast ? 500 : 400,
                color: isActive
                  ? activeColor
                  : isPast
                    ? "rgba(255, 255, 255, 0.8)"
                    : color,
                transform: `scale(${wordScale})`,
                display: "inline-block",
                lineHeight: 1.5,
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

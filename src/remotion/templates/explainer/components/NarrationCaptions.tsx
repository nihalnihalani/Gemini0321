import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
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
  fontSize = 32,
  color = "rgba(255, 255, 255, 0.6)",
  activeColor = "#a855f7",
  position = "bottom",
  showBackground = true,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;

  // Calculate timing: distribute words evenly across the scene duration
  // Leave a small buffer at start (15 frames) and end (15 frames)
  const startBuffer = 15;
  const endBuffer = 15;
  const activeFrames = durationInFrames - startBuffer - endBuffer;
  const framesPerWord = Math.max(1, activeFrames / words.length);

  // Current word index based on frame
  const adjustedFrame = Math.max(0, frame - startBuffer);
  const currentWordIndex = Math.min(
    Math.floor(adjustedFrame / framesPerWord),
    words.length - 1
  );

  // Only show words that have been "revealed" so far
  const revealedCount = frame < startBuffer ? 0 : currentWordIndex + 1;

  // Group words into lines of 6-8 words for readability
  const wordsPerLine = 7;
  const currentLineStart =
    Math.floor(currentWordIndex / wordsPerLine) * wordsPerLine;
  const visibleWords = words.slice(
    currentLineStart,
    currentLineStart + wordsPerLine
  );
  const lineOffset = currentLineStart;

  const positionStyle: React.CSSProperties =
    position === "bottom"
      ? { justifyContent: "flex-end", paddingBottom: 60 }
      : { justifyContent: "center" };

  return (
    <AbsoluteFill style={{ ...positionStyle, alignItems: "center" }}>
      {showBackground && revealedCount > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: position === "bottom" ? 40 : "auto",
            left: "10%",
            right: "10%",
            padding: "16px 24px",
            borderRadius: 12,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(8px)",
          }}
        />
      )}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "6px 10px",
          maxWidth: "80%",
          padding: "16px 32px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {visibleWords.map((word, idx) => {
          const globalIdx = lineOffset + idx;
          const isActive = globalIdx === currentWordIndex;
          const isPast = globalIdx < currentWordIndex;
          const isFuture = globalIdx > currentWordIndex;

          // Don't show future words
          if (isFuture && globalIdx >= revealedCount) return null;

          const wordStartFrame = startBuffer + globalIdx * framesPerWord;
          const localFrame = Math.max(0, frame - wordStartFrame);

          const wordScale = isActive
            ? spring({
                frame: localFrame,
                fps,
                config: { damping: 15, stiffness: 200 },
              }) *
                0.1 +
              1.0
            : 1.0;

          return (
            <span
              key={globalIdx}
              style={{
                fontSize,
                fontFamily: "'Inter', sans-serif",
                fontWeight: isActive ? 700 : 500,
                color: isActive ? activeColor : isPast ? color : "transparent",
                transform: `scale(${wordScale})`,
                display: "inline-block",
                lineHeight: 1.6,
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

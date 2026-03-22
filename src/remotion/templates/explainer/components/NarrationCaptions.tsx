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

/**
 * NarrationCaptions — Synchronized word-highlight captions for narration.
 *
 * Accessibility and readability improvements based on research:
 * - Max 2 lines of ~5-6 words (under 32 chars per line guideline)
 * - Positioned in the lower third to avoid obstructing content
 * - High-contrast background with rounded corners for readability
 * - Active word highlighted with color + bold + subtle scale (not too bouncy)
 * - Past words shown at medium brightness to maintain reading context
 * - Future words dimmed but visible so viewers can read ahead slightly
 * - Smooth crossfade when advancing to the next line of words
 * - Start/end buffers aligned with natural speech pacing (~150 wpm)
 */
export const NarrationCaptions: React.FC<NarrationCaptionsProps> = ({
  text,
  fontSize = 30,
  color = "rgba(255, 255, 255, 0.45)",
  activeColor = "#a855f7",
  position = "bottom",
  showBackground = true,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;

  // Timing: words distributed across scene with buffers
  // Start buffer lets the scene settle; end buffer prevents captions
  // from rushing at the end
  const startBuffer = 22;
  const endBuffer = 18;
  const activeFrames = Math.max(1, durationInFrames - startBuffer - endBuffer);
  const framesPerWord = Math.max(1, activeFrames / words.length);

  const adjustedFrame = Math.max(0, frame - startBuffer);
  const currentWordIndex = Math.min(
    Math.floor(adjustedFrame / framesPerWord),
    words.length - 1
  );

  // Don't show before start buffer
  if (frame < startBuffer) return null;

  // Group visible words into lines of ~5 words for readability
  // (keeps under 32-character line recommendation when using average word length)
  const wordsPerLine = 5;
  const currentLineStart =
    Math.floor(currentWordIndex / wordsPerLine) * wordsPerLine;
  const currentLineEnd = Math.min(currentLineStart + wordsPerLine, words.length);
  const visibleWords = words.slice(currentLineStart, currentLineEnd);
  const lineOffset = currentLineStart;

  // Caption container fade-in (smooth entrance)
  const captionEntrance = interpolate(
    frame,
    [startBuffer, startBuffer + 12],
    [0, 1],
    { extrapolateRight: "clamp" }
  );

  // Caption container fade-out at end of scene
  const captionExit = interpolate(
    frame,
    [durationInFrames - endBuffer - 8, durationInFrames - endBuffer],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const captionOpacity = captionEntrance * captionExit;

  // Line crossfade — when the line group changes, fade the container
  const lineStartFrame = startBuffer + currentLineStart * framesPerWord;
  const lineFade = interpolate(
    frame,
    [lineStartFrame, lineStartFrame + 6],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const positionStyle: React.CSSProperties =
    position === "bottom"
      ? { justifyContent: "flex-end", paddingBottom: 52 }
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
          gap: "5px 9px",
          maxWidth: "72%",
          padding: showBackground ? "14px 30px" : "14px 0",
          borderRadius: showBackground ? 16 : 0,
          backgroundColor: showBackground
            ? "rgba(0, 0, 0, 0.6)"
            : "transparent",
          backdropFilter: showBackground ? "blur(8px)" : "none",
          border: showBackground
            ? "1px solid rgba(255, 255, 255, 0.06)"
            : "none",
          opacity: lineFade,
        }}
      >
        {visibleWords.map((word, idx) => {
          const globalIdx = lineOffset + idx;
          const isActive = globalIdx === currentWordIndex;
          const isPast = globalIdx < currentWordIndex;

          const wordStartFrame = startBuffer + globalIdx * framesPerWord;
          const localFrame = Math.max(0, frame - wordStartFrame);

          // Subtle scale on active word — gentle enough not to distract
          const wordScale = isActive
            ? 1.0 +
              0.06 *
                spring({
                  frame: localFrame,
                  fps,
                  config: { damping: 20, stiffness: 180 },
                })
            : 1.0;

          // Active word gets a subtle underline that draws in
          const underlineWidth = isActive
            ? interpolate(localFrame, [0, 6], [0, 100], {
                extrapolateRight: "clamp",
              })
            : 0;

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
                    ? "rgba(255, 255, 255, 0.78)"
                    : color,
                transform: `scale(${wordScale})`,
                display: "inline-block",
                lineHeight: 1.55,
                position: "relative",
                borderBottom: isActive
                  ? `2px solid ${activeColor}`
                  : "2px solid transparent",
                borderImage: isActive
                  ? `linear-gradient(90deg, ${activeColor} ${underlineWidth}%, transparent ${underlineWidth}%) 1`
                  : "none",
                paddingBottom: 2,
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

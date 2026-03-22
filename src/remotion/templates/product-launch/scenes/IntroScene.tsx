import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";

interface IntroSceneProps {
  brandName: string;
  tagline: string;
  brandColor: string;
}

export const IntroScene: React.FC<IntroSceneProps> = ({
  brandName,
  tagline,
  brandColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ── Brand name: word-by-word pop-in with staccato rhythm ──
  const brandWords = brandName.split(" ");
  const wordDelay = 8; // frames between each word — punchy rhythm

  // ── Tagline: smooth slide-up after brand name lands ──
  const taglineDelay = brandWords.length * wordDelay + 20;
  const taglineFrame = Math.max(0, frame - taglineDelay);
  const taglineProgress = spring({
    frame: taglineFrame,
    fps,
    config: { damping: 200, stiffness: 100, mass: 0.8 },
  });
  const taglineTranslateY = interpolate(taglineProgress, [0, 1], [24, 0]);
  const taglineOpacity = interpolate(taglineProgress, [0, 1], [0, 1]);

  // ── Decorative pill accent — fades in behind tagline ──
  const pillDelay = taglineDelay + 8;
  const pillFrame = Math.max(0, frame - pillDelay);
  const pillProgress = spring({
    frame: pillFrame,
    fps,
    config: { damping: 200, stiffness: 120 },
  });
  const pillScaleX = interpolate(pillProgress, [0, 1], [0, 1]);
  const pillOpacity = interpolate(pillProgress, [0, 1], [0, 0.12]);

  // ── Decorative line — expands precisely between brand and tagline ──
  const lineDelay = brandWords.length * wordDelay + 10;
  const lineFrame = Math.max(0, frame - lineDelay);
  const lineProgress = spring({
    frame: lineFrame,
    fps,
    config: { damping: 200, stiffness: 80 },
  });
  const lineWidth = interpolate(lineProgress, [0, 1], [0, 80]);
  const lineOpacity = interpolate(lineProgress, [0, 1], [0, 0.35]);

  // ── Exit animation — subtle scale-down + fade at end of scene ──
  const exitStart = durationInFrames - 15;
  const exitOpacity = interpolate(
    frame,
    [exitStart, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#faf8f5",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          opacity: exitOpacity,
        }}
      >
        {/* Brand name — word-by-word staccato reveal */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 16,
            padding: "0 60px",
          }}
        >
          {brandWords.map((word, i) => {
            const wordFrame = Math.max(0, frame - i * wordDelay);
            const wordScale = spring({
              frame: wordFrame,
              fps,
              config: { damping: 14, stiffness: 180, mass: 0.6 },
            });
            const wordOpacity = interpolate(wordScale, [0, 0.4], [0, 1], {
              extrapolateRight: "clamp",
            });

            return (
              <div
                key={i}
                style={{
                  fontSize: 84,
                  fontWeight: 800,
                  color: brandColor,
                  fontFamily: "sans-serif",
                  transform: `scale(${wordScale})`,
                  opacity: wordOpacity,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.1,
                  willChange: "transform, opacity",
                }}
              >
                {word}
              </div>
            );
          })}
        </div>

        {/* Decorative line */}
        <div
          style={{
            width: lineWidth,
            height: 2,
            backgroundColor: brandColor,
            opacity: lineOpacity,
            borderRadius: 1,
          }}
        />

        {/* Tagline with pill accent behind it */}
        <div
          style={{
            position: "relative",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {/* Pill accent background */}
          <div
            style={{
              position: "absolute",
              inset: "-8px -28px",
              backgroundColor: brandColor,
              opacity: pillOpacity,
              borderRadius: 999,
              transform: `scaleX(${pillScaleX})`,
              willChange: "transform, opacity",
            }}
          />

          {/* Tagline text */}
          <div
            style={{
              fontSize: 30,
              fontWeight: 400,
              color: "#4a4a4a",
              fontFamily: "sans-serif",
              transform: `translateY(${taglineTranslateY}px)`,
              opacity: taglineOpacity,
              textAlign: "center",
              padding: "0 60px",
              lineHeight: 1.5,
              letterSpacing: "0.01em",
              position: "relative",
              willChange: "transform, opacity",
            }}
          >
            {tagline}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

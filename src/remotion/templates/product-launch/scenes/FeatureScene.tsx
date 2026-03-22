import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";

interface FeatureSceneProps {
  features: string[];
  brandColor: string;
}

export const FeatureScene: React.FC<FeatureSceneProps> = ({
  features,
  brandColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ── "Features" header — subtle fade-in ──
  const headerOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateRight: "clamp",
  });
  const headerTranslateY = interpolate(frame, [0, 18], [12, 0], {
    extrapolateRight: "clamp",
  });

  // ── Stagger features with rhythmic delay — each word within a feature
  //    gets its own micro-delay for a premium word-by-word cascade ──
  const featureBaseDelay = 22; // first feature starts after header
  const featureStagger = 35; // frames between each feature line

  // ── Exit animation ──
  const exitStart = durationInFrames - 18;
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
        padding: 80,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 36,
          maxWidth: "82%",
          opacity: exitOpacity,
        }}
      >
        {/* Section header */}
        <div
          style={{
            fontSize: 18,
            fontWeight: 500,
            color: brandColor,
            fontFamily: "sans-serif",
            textTransform: "uppercase" as const,
            letterSpacing: "0.15em",
            opacity: headerOpacity,
            transform: `translateY(${headerTranslateY}px)`,
            marginBottom: 8,
          }}
        >
          What makes it different
        </div>

        {features.map((feature, index) => {
          const delay = featureBaseDelay + index * featureStagger;
          const words = feature.split(" ");

          return (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 20,
              }}
            >
              {/* Animated pill indicator — expands on arrival */}
              <div style={{ paddingTop: 14, flexShrink: 0 }}>
                <PillIndicator
                  frame={frame}
                  delay={delay}
                  fps={fps}
                  color={brandColor}
                />
              </div>

              {/* Feature text — word-by-word reveal */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0 10px",
                  lineHeight: 1.4,
                }}
              >
                {words.map((word, wordIndex) => {
                  const wordDelay = delay + wordIndex * 3; // 3-frame micro-stagger
                  const wordFrame = Math.max(0, frame - wordDelay);

                  const wordProgress = spring({
                    frame: wordFrame,
                    fps,
                    config: { damping: 200, stiffness: 120, mass: 0.5 },
                  });

                  const wordOpacity = interpolate(
                    wordProgress,
                    [0, 0.6],
                    [0, 1],
                    { extrapolateRight: "clamp" }
                  );
                  const wordTranslateY = interpolate(
                    wordProgress,
                    [0, 1],
                    [18, 0]
                  );

                  return (
                    <div
                      key={wordIndex}
                      style={{
                        fontSize: 38,
                        fontWeight: 600,
                        color: "#1a1a1a",
                        fontFamily: "sans-serif",
                        opacity: wordOpacity,
                        transform: `translateY(${wordTranslateY}px)`,
                        willChange: "transform, opacity",
                      }}
                    >
                      {word}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/**
 * Animated pill-shaped indicator that scales in from center
 */
const PillIndicator: React.FC<{
  frame: number;
  delay: number;
  fps: number;
  color: string;
}> = ({ frame, delay, fps, color }) => {
  const localFrame = Math.max(0, frame - delay);

  const scaleProgress = spring({
    frame: localFrame,
    fps,
    config: { damping: 14, stiffness: 180, mass: 0.5 },
  });

  const pillWidth = interpolate(scaleProgress, [0, 1], [0, 28]);
  const pillOpacity = interpolate(scaleProgress, [0, 0.3], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width: pillWidth,
        height: 6,
        borderRadius: 3,
        backgroundColor: color,
        opacity: pillOpacity,
        willChange: "width, opacity",
      }}
    />
  );
};

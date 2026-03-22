import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

interface FeatureSceneProps {
  features: string[];
  brandColor: string;
}

export const FeatureScene: React.FC<FeatureSceneProps> = ({
  features,
  brandColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Stagger features with ~15 frame delay between each
  const staggerDelay = 15;

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
          gap: 32,
          maxWidth: "80%",
        }}
      >
        {features.map((feature, index) => {
          const delay = index * staggerDelay;
          const localFrame = Math.max(0, frame - delay);

          const slideProgress = spring({
            frame: localFrame,
            fps,
            config: { damping: 14, stiffness: 80 },
          });

          const translateX = interpolate(slideProgress, [0, 1], [100, 0]);
          const opacity = interpolate(slideProgress, [0, 1], [0, 1]);

          return (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 24,
                transform: `translateX(${translateX}px)`,
                opacity,
              }}
            >
              {/* Bullet indicator */}
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: brandColor,
                  flexShrink: 0,
                }}
              />

              {/* Feature text */}
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 600,
                  color: "#2a2a2a",
                  fontFamily: "sans-serif",
                  lineHeight: 1.3,
                }}
              >
                {feature}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

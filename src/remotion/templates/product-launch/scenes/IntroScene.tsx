import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

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
  const { fps } = useVideoConfig();

  // Brand name spring animation
  const nameScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  // Tagline appears after brand name with delay
  const taglineDelay = 20;
  const taglineFrame = Math.max(0, frame - taglineDelay);
  const taglineProgress = spring({
    frame: taglineFrame,
    fps,
    config: { damping: 14, stiffness: 80 },
  });
  const taglineTranslateY = interpolate(taglineProgress, [0, 1], [30, 0]);
  const taglineOpacity = interpolate(taglineProgress, [0, 1], [0, 1]);

  // Subtle decorative line
  const lineWidth = interpolate(frame, [15, 40], [0, 120], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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
          gap: 20,
        }}
      >
        {/* Brand name */}
        <div
          style={{
            fontSize: 80,
            fontWeight: 800,
            color: brandColor,
            fontFamily: "sans-serif",
            transform: `scale(${nameScale})`,
            letterSpacing: "-0.02em",
            textAlign: "center",
            padding: "0 40px",
          }}
        >
          {brandName}
        </div>

        {/* Decorative line */}
        <div
          style={{
            width: lineWidth,
            height: 3,
            backgroundColor: brandColor,
            opacity: 0.4,
            borderRadius: 2,
          }}
        />

        {/* Tagline */}
        <div
          style={{
            fontSize: 32,
            fontWeight: 400,
            color: "#555555",
            fontFamily: "sans-serif",
            transform: `translateY(${taglineTranslateY}px)`,
            opacity: taglineOpacity,
            textAlign: "center",
            padding: "0 80px",
            lineHeight: 1.4,
          }}
        >
          {tagline}
        </div>
      </div>
    </AbsoluteFill>
  );
};

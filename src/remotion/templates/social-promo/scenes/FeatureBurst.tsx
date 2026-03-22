import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

interface FeatureBurstProps {
  features: string[];
}

export const FeatureBurst: React.FC<FeatureBurstProps> = ({ features }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ~30 frames per feature (0.5s each at 30fps = 15 frames, but spec says ~30)
  const framesPerFeature = Math.floor(durationInFrames / features.length);
  const currentIndex = Math.min(
    Math.floor(frame / framesPerFeature),
    features.length - 1
  );
  const localFrame = frame - currentIndex * framesPerFeature;

  // Each feature punches in fast
  const featureScale = spring({
    frame: localFrame,
    fps,
    config: { damping: 8, stiffness: 250, mass: 0.5 },
  });

  // Quick fade out near end of each feature's slot
  const fadeOut = interpolate(
    localFrame,
    [framesPerFeature - 6, framesPerFeature],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Alternating background colors (dark / accent-tinted dark)
  const bgColors = ["#0a0a0a", "#111018", "#0a0a0a", "#0f1118"];
  const bgColor = bgColors[currentIndex % bgColors.length];

  // Accent colors cycle
  const accentColors = ["#cdbdff", "#9ccaff", "#ffabf3", "#7ddc8e"];
  const accentColor = accentColors[currentIndex % accentColors.length];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: bgColor,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Feature counter */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 80,
          fontSize: 24,
          fontWeight: 600,
          color: accentColor,
          fontFamily: "'Inter', sans-serif",
          opacity: featureScale,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        {String(currentIndex + 1).padStart(2, "0")} / {String(features.length).padStart(2, "0")}
      </div>

      {/* Feature text - bold, uppercase, full-screen flash */}
      <div
        style={{
          fontSize: 72,
          fontWeight: 900,
          color: "#ffffff",
          fontFamily: "'Inter', sans-serif",
          transform: `scale(${featureScale})`,
          opacity: fadeOut,
          textAlign: "center",
          padding: "0 80px",
          lineHeight: 1.2,
          textTransform: "uppercase",
          letterSpacing: "0.02em",
          textShadow: `0 0 40px ${accentColor}50`,
        }}
      >
        {features[currentIndex]}
      </div>

      {/* Accent bar */}
      <div
        style={{
          position: "absolute",
          bottom: 120,
          width: interpolate(featureScale, [0, 1], [0, 240]),
          height: 4,
          backgroundColor: accentColor,
          borderRadius: 2,
          boxShadow: `0 0 20px ${accentColor}80`,
        }}
      />
    </AbsoluteFill>
  );
};

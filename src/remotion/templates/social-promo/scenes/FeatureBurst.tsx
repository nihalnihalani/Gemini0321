import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

interface FeatureBurstProps {
  features: string[];
}

export const FeatureBurst: React.FC<FeatureBurstProps> = ({ features }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Rapid cycle through features
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
    config: { damping: 8, stiffness: 200, mass: 0.5 },
  });

  // Quick fade out near end of each feature's slot
  const fadeOut = interpolate(
    localFrame,
    [framesPerFeature - 5, framesPerFeature],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Accent colors cycle
  const accentColors = ["#cdbdff", "#9ccaff", "#ffabf3", "#7ddc8e"];
  const accentColor = accentColors[currentIndex % accentColors.length];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0f",
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
          fontFamily: "sans-serif",
          opacity: featureScale,
          letterSpacing: "0.1em",
        }}
      >
        {String(currentIndex + 1).padStart(2, "0")} / {String(features.length).padStart(2, "0")}
      </div>

      {/* Feature text */}
      <div
        style={{
          fontSize: 56,
          fontWeight: 800,
          color: "#ffffff",
          fontFamily: "sans-serif",
          transform: `scale(${featureScale})`,
          opacity: fadeOut,
          textAlign: "center",
          padding: "0 80px",
          lineHeight: 1.2,
          textShadow: `0 0 30px ${accentColor}40`,
        }}
      >
        {features[currentIndex]}
      </div>

      {/* Accent bar */}
      <div
        style={{
          position: "absolute",
          bottom: 120,
          width: interpolate(featureScale, [0, 1], [0, 200]),
          height: 4,
          backgroundColor: accentColor,
          borderRadius: 2,
        }}
      />
    </AbsoluteFill>
  );
};

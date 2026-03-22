import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";

interface FeatureBurstProps {
  features: string[];
}

export const FeatureBurst: React.FC<FeatureBurstProps> = ({ features }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const framesPerFeature = Math.floor(durationInFrames / features.length);
  const currentIndex = Math.min(
    Math.floor(frame / framesPerFeature),
    features.length - 1,
  );
  const localFrame = frame - currentIndex * framesPerFeature;

  // --- Slam-down spring: very high stiffness for impact ---
  const slamScale = spring({
    frame: localFrame,
    fps,
    config: { damping: 7, stiffness: 400, mass: 0.35 },
  });

  // --- Y-axis slam (drops from above) ---
  const slamY = interpolate(slamScale, [0, 1], [-40, 0]);

  // --- Quick fade out near slot end ---
  const fadeOut = interpolate(
    localFrame,
    [framesPerFeature - 5, framesPerFeature],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // --- Color flash on entry (brief bright accent bg that fades) ---
  const flashBg = interpolate(localFrame, [0, 2, 6], [0.25, 0.12, 0], {
    extrapolateRight: "clamp",
  });

  // Accent colors cycle — vibrant neons
  const accentColors = ["#cdbdff", "#00e5ff", "#ff3366", "#7ddc8e"];
  const accentColor = accentColors[currentIndex % accentColors.length];

  // --- Side accent bars that wipe in ---
  const barWidth = interpolate(slamScale, [0, 1], [0, 6]);
  const barHeight = interpolate(slamScale, [0, 1], [0, 60]);

  // --- Counter slide-in ---
  const counterSlide = spring({
    frame: localFrame,
    fps,
    config: { damping: 12, stiffness: 200, mass: 0.5 },
  });
  const counterX = interpolate(counterSlide, [0, 1], [-40, 0]);

  // --- Bottom progress bar showing how far through features we are ---
  const overallProgress =
    ((currentIndex + localFrame / framesPerFeature) / features.length) * 100;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Color flash overlay on each feature entry */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: accentColor,
          opacity: flashBg,
          zIndex: 0,
        }}
      />

      {/* Left accent bar */}
      <div
        style={{
          position: "absolute",
          left: 40,
          top: "50%",
          width: barWidth,
          height: `${barHeight}%`,
          transform: "translateY(-50%)",
          backgroundColor: accentColor,
          borderRadius: 3,
          boxShadow: `0 0 16px ${accentColor}80, 0 0 32px ${accentColor}40`,
          zIndex: 1,
        }}
      />

      {/* Right accent bar */}
      <div
        style={{
          position: "absolute",
          right: 40,
          top: "50%",
          width: barWidth,
          height: `${barHeight}%`,
          transform: "translateY(-50%)",
          backgroundColor: accentColor,
          borderRadius: 3,
          boxShadow: `0 0 16px ${accentColor}80, 0 0 32px ${accentColor}40`,
          zIndex: 1,
        }}
      />

      {/* Feature counter — slides in from left */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 80,
          fontSize: 26,
          fontWeight: 800,
          color: accentColor,
          fontFamily: "'Inter', sans-serif",
          opacity: counterSlide,
          transform: `translateX(${counterX}px)`,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          textShadow: `0 0 12px ${accentColor}60`,
          zIndex: 2,
        }}
      >
        {String(currentIndex + 1).padStart(2, "0")} /{" "}
        {String(features.length).padStart(2, "0")}
      </div>

      {/* Feature text — slam-down with scale + translateY */}
      <div
        style={{
          fontSize: 76,
          fontWeight: 900,
          color: "#ffffff",
          fontFamily: "'Inter', sans-serif",
          transform: `scale(${slamScale}) translateY(${slamY}px)`,
          opacity: fadeOut,
          textAlign: "center",
          padding: "0 90px",
          lineHeight: 1.15,
          textTransform: "uppercase",
          letterSpacing: "0.03em",
          textShadow: `0 0 30px ${accentColor}70, 0 4px 20px rgba(0,0,0,0.5)`,
          zIndex: 2,
        }}
      >
        {features[currentIndex]}
      </div>

      {/* Bottom progress bar */}
      <div
        style={{
          position: "absolute",
          bottom: 100,
          left: 80,
          right: 80,
          height: 4,
          backgroundColor: "rgba(255,255,255,0.1)",
          borderRadius: 2,
          overflow: "hidden",
          zIndex: 2,
        }}
      >
        <div
          style={{
            width: `${overallProgress}%`,
            height: "100%",
            backgroundColor: accentColor,
            borderRadius: 2,
            boxShadow: `0 0 12px ${accentColor}80`,
            transition: "width 0.1s linear",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

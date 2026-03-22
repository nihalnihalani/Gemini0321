import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

interface HookSceneProps {
  hook: string;
  accentColor?: string;
}

export const HookScene: React.FC<HookSceneProps> = ({
  hook,
  accentColor = "#9ccaff",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fast spring animation with high stiffness, low damping
  const scale = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 300, mass: 0.6 },
  });

  // Neon glow pulse
  const glowIntensity = interpolate(
    frame,
    [5, 12, 20],
    [0, 1, 0.7],
    { extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          fontSize: 96,
          fontWeight: 900,
          color: "#ffffff",
          fontFamily: "'Inter', sans-serif",
          transform: `scale(${scale})`,
          textAlign: "center",
          padding: "0 60px",
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
          textShadow: `0 0 ${40 * glowIntensity}px ${accentColor}, 0 0 ${80 * glowIntensity}px ${accentColor}66, 0 0 ${120 * glowIntensity}px ${accentColor}33`,
        }}
      >
        {hook}
      </div>
    </AbsoluteFill>
  );
};

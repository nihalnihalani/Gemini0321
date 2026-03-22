import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";

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

  // --- Screen flash on entry (white flash that fades instantly) ---
  const flashOpacity = interpolate(frame, [0, 2, 6], [1, 0.8, 0], {
    extrapolateRight: "clamp",
  });

  // --- Screen shake for first ~8 frames ---
  const shakeIntensity = interpolate(frame, [0, 3, 8], [0, 8, 0], {
    extrapolateRight: "clamp",
  });
  const shakeX =
    shakeIntensity * Math.sin(frame * 17.3) * (frame % 2 === 0 ? 1 : -1);
  const shakeY =
    shakeIntensity * Math.cos(frame * 13.7) * (frame % 3 === 0 ? 1 : -1);

  // --- Ultra-fast slam spring (high stiffness, low mass for snappy feel) ---
  const slamScale = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 400, mass: 0.4 },
  });

  // --- Glitch offset for chromatic aberration layers (first 12 frames) ---
  const glitchActive = frame < 12;
  const glitchOffset = glitchActive
    ? interpolate(frame, [0, 4, 8, 12], [6, -4, 3, 0], {
        extrapolateRight: "clamp",
      })
    : 0;
  const glitchOpacity = glitchActive ? 0.6 : 0;

  // --- Neon glow pulse (ramps up, then sustains with breathing) ---
  const glowRamp = interpolate(frame, [3, 10, 18], [0, 1.2, 0.85], {
    extrapolateRight: "clamp",
  });
  const glowBreath = frame > 18 ? 0.85 + 0.15 * Math.sin(frame * 0.18) : glowRamp;

  // --- Radial gradient burst behind text ---
  const burstRadius = interpolate(frame, [0, 15, 30], [0, 55, 65], {
    extrapolateRight: "clamp",
  });
  const burstOpacity = interpolate(frame, [0, 6, 25, 40], [0, 0.35, 0.2, 0.12], {
    extrapolateRight: "clamp",
  });

  // --- Horizontal scan line sweep ---
  const scanLineY = interpolate(frame, [0, 20], [-5, 105], {
    extrapolateRight: "clamp",
  });

  const textStyle: React.CSSProperties = {
    fontSize: 96,
    fontWeight: 900,
    color: "#ffffff",
    fontFamily: "'Inter', sans-serif",
    transform: `scale(${slamScale})`,
    textAlign: "center",
    padding: "0 60px",
    lineHeight: 1.1,
    letterSpacing: "-0.02em",
    textShadow: `0 0 ${40 * glowBreath}px ${accentColor}, 0 0 ${80 * glowBreath}px ${accentColor}88, 0 0 ${140 * glowBreath}px ${accentColor}44`,
    position: "relative" as const,
    zIndex: 2,
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        justifyContent: "center",
        alignItems: "center",
        transform: `translate(${shakeX}px, ${shakeY}px)`,
      }}
    >
      {/* Radial gradient burst */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 50% 50%, ${accentColor}${Math.round(burstOpacity * 255).toString(16).padStart(2, "0")} 0%, transparent ${burstRadius}%)`,
          zIndex: 0,
        }}
      />

      {/* Horizontal scan line */}
      {frame < 20 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: `${scanLineY}%`,
            height: 3,
            background: `linear-gradient(90deg, transparent, ${accentColor}80, transparent)`,
            zIndex: 3,
            opacity: 0.7,
          }}
        />
      )}

      {/* Chromatic aberration layer — red shift */}
      <div
        style={{
          ...textStyle,
          position: "absolute",
          color: "#ff3366",
          transform: `scale(${slamScale}) translate(${glitchOffset}px, ${-glitchOffset * 0.5}px)`,
          opacity: glitchOpacity,
          mixBlendMode: "screen",
          zIndex: 1,
          textShadow: "none",
        }}
      >
        {hook}
      </div>

      {/* Chromatic aberration layer — cyan shift */}
      <div
        style={{
          ...textStyle,
          position: "absolute",
          color: "#00e5ff",
          transform: `scale(${slamScale}) translate(${-glitchOffset}px, ${glitchOffset * 0.5}px)`,
          opacity: glitchOpacity,
          mixBlendMode: "screen",
          zIndex: 1,
          textShadow: "none",
        }}
      >
        {hook}
      </div>

      {/* Main text */}
      <div style={textStyle}>{hook}</div>

      {/* Screen flash overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "#ffffff",
          opacity: flashOpacity,
          zIndex: 10,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};

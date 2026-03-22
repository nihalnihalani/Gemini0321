import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

interface CTASceneProps {
  cta: string;
}

export const CTAScene: React.FC<CTASceneProps> = ({ cta }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // CTA scales in with bounce
  const ctaScale = spring({
    frame,
    fps,
    config: { damping: 6, stiffness: 150, mass: 0.8 },
  });

  const ctaOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Pulsing glow effect after initial animation
  const pulsePhase = Math.max(0, frame - 20);
  const pulse = 0.5 + 0.5 * Math.sin(pulsePhase * 0.15);
  const glowSize = 20 + pulse * 30;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0f",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* CTA text with glow */}
      <div
        style={{
          fontSize: 64,
          fontWeight: 900,
          color: "#ffffff",
          fontFamily: "sans-serif",
          transform: `scale(${ctaScale})`,
          opacity: ctaOpacity,
          textAlign: "center",
          padding: "0 60px",
          lineHeight: 1.2,
          textShadow: frame > 15
            ? `0 0 ${glowSize}px rgba(205, 189, 255, ${0.4 + pulse * 0.3}), 0 0 ${glowSize * 2}px rgba(92, 31, 222, ${0.2 + pulse * 0.2})`
            : "none",
        }}
      >
        {cta}
      </div>

      {/* Decorative accent line below */}
      <div
        style={{
          position: "absolute",
          bottom: 140,
          display: "flex",
          gap: 8,
          opacity: ctaOpacity,
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#cdbdff",
              opacity: 0.3 + pulse * 0.7 * (i === 1 ? 1 : 0.5),
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

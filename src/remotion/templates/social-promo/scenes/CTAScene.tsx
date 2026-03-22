import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

interface CTASceneProps {
  cta: string;
  brandName?: string;
}

export const CTAScene: React.FC<CTASceneProps> = ({ cta, brandName }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // CTA scales in with bounce
  const ctaScale = spring({
    frame,
    fps,
    config: { damping: 8, stiffness: 180, mass: 0.7 },
  });

  const ctaOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Pulsing scale effect (1.0 -> 1.05 loop)
  const pulsePhase = Math.max(0, frame - 20);
  const pulse = Math.sin(pulsePhase * 0.12);
  const pulseScale = 1 + 0.05 * Math.max(0, pulse);
  const glowSize = 20 + (0.5 + 0.5 * pulse) * 40;

  // Brand name fade in after CTA
  const brandProgress = spring({
    frame: Math.max(0, frame - 30),
    fps,
    config: { damping: 14, stiffness: 100 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* CTA text with pulsing glow */}
      <div
        style={{
          fontSize: 72,
          fontWeight: 900,
          color: "#ffffff",
          fontFamily: "'Inter', sans-serif",
          transform: `scale(${ctaScale * (frame > 20 ? pulseScale : 1)})`,
          opacity: ctaOpacity,
          textAlign: "center",
          padding: "0 60px",
          lineHeight: 1.2,
          textShadow: frame > 15
            ? `0 0 ${glowSize}px rgba(205, 189, 255, ${0.5 + 0.3 * pulse}), 0 0 ${glowSize * 2}px rgba(92, 31, 222, ${0.2 + 0.2 * pulse})`
            : "none",
        }}
      >
        {cta}
      </div>

      {/* Brand name / URL below */}
      {brandName && (
        <div
          style={{
            position: "absolute",
            bottom: 140,
            fontSize: 28,
            fontWeight: 600,
            color: "#9ccaff",
            fontFamily: "'Inter', sans-serif",
            opacity: brandProgress,
            transform: `translateY(${interpolate(brandProgress, [0, 1], [20, 0])}px)`,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            textShadow: "0 0 20px rgba(156, 202, 255, 0.4)",
          }}
        >
          {brandName}
        </div>
      )}

      {/* Decorative pulsing dots */}
      <div
        style={{
          position: "absolute",
          bottom: 100,
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
              opacity: 0.3 + (0.5 + 0.5 * pulse) * 0.7 * (i === 1 ? 1 : 0.5),
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

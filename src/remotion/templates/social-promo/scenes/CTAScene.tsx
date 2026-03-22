import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";

interface CTASceneProps {
  cta: string;
  brandName?: string;
}

export const CTAScene: React.FC<CTASceneProps> = ({ cta, brandName }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // --- CTA slam entrance (fast, bouncy) ---
  const ctaScale = spring({
    frame,
    fps,
    config: { damping: 7, stiffness: 350, mass: 0.4 },
  });

  const ctaOpacity = interpolate(frame, [0, 6], [0, 1], {
    extrapolateRight: "clamp",
  });

  // --- Urgency pulse (faster rhythm for urgency feel) ---
  const pulsePhase = Math.max(0, frame - 15);
  const pulse = Math.sin(pulsePhase * 0.18);
  const pulseScale = 1 + 0.06 * Math.max(0, pulse);
  const glowSize = 25 + (0.5 + 0.5 * pulse) * 50;

  // --- Expanding ring burst on entrance ---
  const ringProgress = interpolate(frame, [0, 25], [0, 1], {
    extrapolateRight: "clamp",
  });
  const ringScale = interpolate(ringProgress, [0, 1], [0.3, 2.5]);
  const ringOpacity = interpolate(ringProgress, [0, 0.3, 1], [0, 0.6, 0]);

  // --- Second ring (delayed) ---
  const ring2Progress = interpolate(frame, [8, 35], [0, 1], {
    extrapolateRight: "clamp",
  });
  const ring2Scale = interpolate(ring2Progress, [0, 1], [0.3, 2.2]);
  const ring2Opacity = interpolate(ring2Progress, [0, 0.3, 1], [0, 0.4, 0]);

  // --- Sweeping light beam across text ---
  const sweepX = interpolate(frame, [10, 30, 55, 75], [-120, 120, -120, 120], {
    extrapolateRight: "clamp",
  });
  const sweepOpacity = interpolate(
    frame,
    [10, 15, 28, 30, 55, 60, 73, 75],
    [0, 0.3, 0.3, 0, 0, 0.25, 0.25, 0],
    { extrapolateRight: "clamp" },
  );

  // --- Animated arrow indicator (bounces up and down below CTA) ---
  const arrowDelay = 25;
  const arrowProgress = spring({
    frame: Math.max(0, frame - arrowDelay),
    fps,
    config: { damping: 12, stiffness: 150 },
  });
  const arrowBounce =
    frame > arrowDelay ? Math.sin((frame - arrowDelay) * 0.25) * 6 : 0;

  // --- Brand name entrance ---
  const brandProgress = spring({
    frame: Math.max(0, frame - 20),
    fps,
    config: { damping: 10, stiffness: 180 },
  });

  // --- Background radial gradient pulse ---
  const bgPulse = frame > 10 ? 0.08 + 0.04 * Math.sin(frame * 0.12) : 0;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Pulsing radial background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 50% 45%, rgba(205, 189, 255, ${bgPulse}) 0%, transparent 55%)`,
          zIndex: 0,
        }}
      />

      {/* Ring burst 1 */}
      <div
        style={{
          position: "absolute",
          width: 200,
          height: 200,
          borderRadius: "50%",
          border: "2px solid rgba(205, 189, 255, 0.6)",
          transform: `scale(${ringScale})`,
          opacity: ringOpacity,
          boxShadow:
            "0 0 20px rgba(205, 189, 255, 0.3), inset 0 0 20px rgba(205, 189, 255, 0.1)",
          zIndex: 1,
        }}
      />

      {/* Ring burst 2 (delayed) */}
      <div
        style={{
          position: "absolute",
          width: 200,
          height: 200,
          borderRadius: "50%",
          border: "1.5px solid rgba(156, 202, 255, 0.5)",
          transform: `scale(${ring2Scale})`,
          opacity: ring2Opacity,
          zIndex: 1,
        }}
      />

      {/* CTA text with urgency pulse glow */}
      <div
        style={{
          fontSize: 76,
          fontWeight: 900,
          color: "#ffffff",
          fontFamily: "'Inter', sans-serif",
          transform: `scale(${ctaScale * (frame > 15 ? pulseScale : 1)})`,
          opacity: ctaOpacity,
          textAlign: "center",
          padding: "0 60px",
          lineHeight: 1.15,
          textShadow:
            frame > 10
              ? `0 0 ${glowSize}px rgba(205, 189, 255, ${0.6 + 0.3 * pulse}), 0 0 ${glowSize * 2}px rgba(92, 31, 222, ${0.25 + 0.2 * pulse}), 0 4px 20px rgba(0,0,0,0.4)`
              : "0 4px 20px rgba(0,0,0,0.4)",
          position: "relative",
          zIndex: 3,
          overflow: "hidden",
        }}
      >
        {cta}

        {/* Sweeping light beam */}
        <div
          style={{
            position: "absolute",
            top: "-20%",
            bottom: "-20%",
            width: 60,
            left: `calc(50% + ${sweepX}px)`,
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
            transform: "skewX(-15deg)",
            opacity: sweepOpacity,
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Animated down arrow */}
      <div
        style={{
          position: "absolute",
          bottom: 200,
          opacity: arrowProgress * 0.7,
          transform: `translateY(${arrowBounce}px)`,
          zIndex: 2,
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#cdbdff"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {/* Brand name / URL */}
      {brandName && (
        <div
          style={{
            position: "absolute",
            bottom: 150,
            fontSize: 30,
            fontWeight: 700,
            color: "#9ccaff",
            fontFamily: "'Inter', sans-serif",
            opacity: brandProgress,
            transform: `translateY(${interpolate(brandProgress, [0, 1], [15, 0])}px)`,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            textShadow: "0 0 24px rgba(156, 202, 255, 0.5)",
            zIndex: 2,
          }}
        >
          {brandName}
        </div>
      )}

      {/* Decorative pulsing dots — urgency indicator */}
      <div
        style={{
          position: "absolute",
          bottom: 110,
          display: "flex",
          gap: 10,
          opacity: ctaOpacity,
          zIndex: 2,
        }}
      >
        {[0, 1, 2, 3, 4].map((i) => {
          const dotPhase = Math.sin(pulsePhase * 0.18 + i * 0.8);
          return (
            <div
              key={i}
              style={{
                width: i === 2 ? 10 : 7,
                height: i === 2 ? 10 : 7,
                borderRadius: "50%",
                backgroundColor: "#cdbdff",
                opacity: 0.3 + 0.7 * Math.max(0, dotPhase),
                boxShadow:
                  dotPhase > 0.5
                    ? `0 0 8px rgba(205, 189, 255, ${dotPhase * 0.6})`
                    : "none",
              }}
            />
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

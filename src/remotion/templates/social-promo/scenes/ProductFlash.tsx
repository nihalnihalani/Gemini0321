import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Img,
  spring,
  interpolate,
} from "remotion";

interface ProductFlashProps {
  productImage: string;
  features: string[];
}

export const ProductFlash: React.FC<ProductFlashProps> = ({
  productImage,
  features,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // --- Product entrance: fast spring pop-in ---
  const entranceScale = spring({
    frame,
    fps,
    config: { damping: 9, stiffness: 350, mass: 0.4 },
  });

  // --- Slow zoom drift + floating bob ---
  const zoomDrift = interpolate(frame, [0, durationInFrames], [1, 1.08], {
    extrapolateRight: "clamp",
  });
  const floatY = Math.sin(frame * 0.1) * 6;
  const productScale = entranceScale * zoomDrift;

  const fadeIn = interpolate(frame, [0, 6], [0, 1], {
    extrapolateRight: "clamp",
  });

  // --- Neon ring glow pulse ---
  const glowPhase = frame * 0.12;
  const ringGlow1 = 0.5 + 0.5 * Math.sin(glowPhase);
  const ringGlow2 = 0.5 + 0.5 * Math.sin(glowPhase + 2.1);

  // --- Rotating hue for glow ring border ---
  const hueRotate = interpolate(frame, [0, durationInFrames], [0, 45], {
    extrapolateRight: "clamp",
  });

  // --- Scan line sweeping over product ---
  const scanY = interpolate(frame, [5, 25, 50, 70], [-10, 110, -10, 110], {
    extrapolateRight: "clamp",
  });
  const scanOpacity = interpolate(frame, [5, 8, 68, 72], [0, 0.5, 0.5, 0], {
    extrapolateRight: "clamp",
  });

  // Badge positions (placed in safe zones — upper-center region)
  const badgePositions: React.CSSProperties[] = [
    { top: "10%", left: "6%" },
    { top: "10%", right: "6%" },
    { bottom: "22%", left: "6%" },
    { bottom: "22%", right: "6%" },
  ];

  const accentColors = ["#cdbdff", "#9ccaff", "#ffabf3", "#7ddc8e"];

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      {/* Ambient radial glow behind product */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 50%, rgba(92, 31, 222, ${0.15 * ringGlow1}) 0%, transparent 60%)`,
          zIndex: 0,
        }}
      />

      {/* Product image with neon glow ring */}
      {productImage && (
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            opacity: fadeIn,
            zIndex: 1,
          }}
        >
          {/* Outer glow ring */}
          <div
            style={{
              position: "absolute",
              width: "62%",
              height: "62%",
              borderRadius: 20,
              border: `2px solid rgba(156, 202, 255, ${0.3 + 0.3 * ringGlow1})`,
              boxShadow: `
                0 0 ${20 + 25 * ringGlow1}px rgba(156, 202, 255, ${0.25 * ringGlow1}),
                0 0 ${40 + 40 * ringGlow2}px rgba(92, 31, 222, ${0.15 * ringGlow2}),
                inset 0 0 ${15 + 20 * ringGlow1}px rgba(156, 202, 255, ${0.08 * ringGlow1})
              `,
              transform: `scale(${entranceScale}) translateY(${floatY}px)`,
              filter: `hue-rotate(${hueRotate}deg)`,
              zIndex: 0,
            }}
          />

          <Img
            src={productImage}
            style={{
              maxWidth: "55%",
              maxHeight: "55%",
              objectFit: "contain",
              transform: `scale(${productScale}) translateY(${floatY}px)`,
              borderRadius: 12,
              boxShadow: `
                0 0 ${30 * ringGlow1}px rgba(156, 202, 255, ${0.35 * ringGlow1}),
                0 0 ${60 * ringGlow2}px rgba(92, 31, 222, ${0.2 * ringGlow2}),
                0 20px 40px rgba(0, 0, 0, 0.4)
              `,
              zIndex: 1,
            }}
          />

          {/* Scan line over product */}
          <div
            style={{
              position: "absolute",
              left: "20%",
              right: "20%",
              top: `${scanY}%`,
              height: 2,
              background:
                "linear-gradient(90deg, transparent, rgba(156, 202, 255, 0.8), transparent)",
              opacity: scanOpacity,
              zIndex: 2,
            }}
          />
        </AbsoluteFill>
      )}

      {/* Feature badges with pop-in and connector glow dots */}
      {features.slice(0, 4).map((feature, index) => {
        const badgeDelay = 8 + index * 6;
        const badgeProgress = spring({
          frame: Math.max(0, frame - badgeDelay),
          fps,
          config: { damping: 9, stiffness: 280, mass: 0.4 },
        });

        const accent = accentColors[index % accentColors.length];
        const badgePulse = 0.7 + 0.3 * Math.sin((frame - badgeDelay) * 0.15);

        return (
          <div
            key={index}
            style={{
              position: "absolute",
              ...badgePositions[index],
              transform: `scale(${badgeProgress})`,
              opacity: badgeProgress,
              zIndex: 3,
            }}
          >
            {/* Glow dot connector */}
            <div
              style={{
                position: "absolute",
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: accent,
                boxShadow: `0 0 8px ${accent}, 0 0 16px ${accent}80`,
                top: "50%",
                ...(index % 2 === 0
                  ? { right: -16, transform: "translateY(-50%)" }
                  : { left: -16, transform: "translateY(-50%)" }),
                opacity: badgePulse,
              }}
            />
            <div
              style={{
                backgroundColor: `${accent}18`,
                border: `1.5px solid ${accent}50`,
                borderRadius: 10,
                padding: "10px 18px",
                fontSize: 18,
                fontWeight: 700,
                color: accent,
                fontFamily: "'Inter', sans-serif",
                textShadow: `0 0 14px ${accent}90`,
                letterSpacing: "0.04em",
                textTransform: "uppercase" as const,
                boxShadow: `0 0 ${12 * badgePulse}px ${accent}30`,
              }}
            >
              {feature}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

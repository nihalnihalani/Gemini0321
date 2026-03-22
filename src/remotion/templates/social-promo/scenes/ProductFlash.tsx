import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, Img, spring, interpolate } from "remotion";

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

  // Zoom-in pulse effect on product image
  const zoomBase = interpolate(
    frame,
    [0, durationInFrames],
    [1, 1.15],
    { extrapolateRight: "clamp" }
  );
  const pulse = 1 + 0.03 * Math.sin(frame * 0.2);
  const zoomScale = zoomBase * pulse;

  const fadeIn = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Border glow intensity
  const glowPulse = 0.6 + 0.4 * Math.sin(frame * 0.15);

  // Badge positions around the image (top-left, top-right, bottom-left, bottom-right)
  const badgePositions: React.CSSProperties[] = [
    { top: "12%", left: "8%" },
    { top: "12%", right: "8%" },
    { bottom: "18%", left: "8%" },
    { bottom: "18%", right: "8%" },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      {/* Product image with glow border */}
      {productImage && (
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            opacity: fadeIn,
          }}
        >
          <Img
            src={productImage}
            style={{
              maxWidth: "55%",
              maxHeight: "55%",
              objectFit: "contain",
              transform: `scale(${zoomScale})`,
              borderRadius: 12,
              boxShadow: `0 0 ${30 * glowPulse}px rgba(156, 202, 255, ${0.4 * glowPulse}), 0 0 ${60 * glowPulse}px rgba(92, 31, 222, ${0.2 * glowPulse})`,
            }}
          />
        </AbsoluteFill>
      )}

      {/* Feature badges around the image */}
      {features.slice(0, 4).map((feature, index) => {
        const badgeDelay = 10 + index * 8;
        const badgeProgress = spring({
          frame: Math.max(0, frame - badgeDelay),
          fps,
          config: { damping: 12, stiffness: 200 },
        });

        const accentColors = ["#cdbdff", "#9ccaff", "#ffabf3", "#7ddc8e"];
        const accent = accentColors[index % accentColors.length];

        return (
          <div
            key={index}
            style={{
              position: "absolute",
              ...badgePositions[index],
              transform: `scale(${badgeProgress})`,
              opacity: badgeProgress,
              backgroundColor: `${accent}20`,
              border: `1px solid ${accent}60`,
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 18,
              fontWeight: 700,
              color: accent,
              fontFamily: "'Inter', sans-serif",
              textShadow: `0 0 12px ${accent}80`,
              letterSpacing: "0.03em",
            }}
          >
            {feature}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

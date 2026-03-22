import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, Img, spring, interpolate } from "remotion";

interface ProductFlashProps {
  productImage: string;
  featureText?: string;
}

export const ProductFlash: React.FC<ProductFlashProps> = ({
  productImage,
  featureText,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Zoom-in on the product
  const zoomScale = interpolate(
    frame,
    [0, durationInFrames],
    [1, 1.2],
    { extrapolateRight: "clamp" }
  );

  const fadeIn = interpolate(frame, [0, 8], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Feature text slides up
  const textProgress = spring({
    frame: Math.max(0, frame - 8),
    fps,
    config: { damping: 10, stiffness: 150 },
  });
  const textTranslateY = interpolate(textProgress, [0, 1], [40, 0]);
  const textOpacity = interpolate(textProgress, [0, 1], [0, 1]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>
      {/* Product image */}
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
            maxWidth: "65%",
            maxHeight: "65%",
            objectFit: "contain",
            transform: `scale(${zoomScale})`,
          }}
        />
      </AbsoluteFill>

      {/* Overlay feature text */}
      {featureText && (
        <AbsoluteFill
          style={{
            justifyContent: "flex-end",
            alignItems: "center",
            paddingBottom: 100,
          }}
        >
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: "#9ccaff",
              fontFamily: "sans-serif",
              transform: `translateY(${textTranslateY}px)`,
              opacity: textOpacity,
              textShadow: "0 0 20px rgba(156, 202, 255, 0.5)",
              textAlign: "center",
              padding: "0 40px",
            }}
          >
            {featureText}
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

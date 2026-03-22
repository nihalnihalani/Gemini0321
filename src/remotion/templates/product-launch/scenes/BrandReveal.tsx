import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Img } from "remotion";

interface BrandRevealProps {
  brandName: string;
  logoUrl?: string;
  productImage?: string;
  brandColor: string;
}

export const BrandReveal: React.FC<BrandRevealProps> = ({
  brandName,
  logoUrl,
  productImage,
  brandColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo / brand scale-up
  const brandScale = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 80 },
  });

  const brandOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Product image fades in after brand
  const productDelay = 25;
  const productFrame = Math.max(0, frame - productDelay);
  const productOpacity = interpolate(productFrame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });
  const productScale = spring({
    frame: productFrame,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#faf8f5",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 40,
        }}
      >
        {/* Logo + Brand name */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
            transform: `scale(${brandScale})`,
            opacity: brandOpacity,
          }}
        >
          {logoUrl && (
            <Img
              src={logoUrl}
              style={{
                width: 80,
                height: 80,
                objectFit: "contain",
              }}
            />
          )}
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: brandColor,
              fontFamily: "sans-serif",
              letterSpacing: "-0.02em",
              textAlign: "center",
            }}
          >
            {brandName}
          </div>
        </div>

        {/* Hero product image */}
        {productImage && (
          <Img
            src={productImage}
            style={{
              maxWidth: "50%",
              maxHeight: 300,
              objectFit: "contain",
              opacity: productOpacity,
              transform: `scale(${productScale})`,
              borderRadius: 12,
            }}
          />
        )}
      </div>
    </AbsoluteFill>
  );
};

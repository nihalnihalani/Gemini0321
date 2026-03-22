import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, Img, interpolate, spring } from "remotion";

interface ShowcaseSceneProps {
  productImage: string;
  brandColor: string;
}

export const ShowcaseScene: React.FC<ShowcaseSceneProps> = ({
  productImage,
  brandColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Slow zoom on the product image
  const zoomScale = interpolate(
    frame,
    [0, durationInFrames],
    [1, 1.1],
    { extrapolateRight: "clamp" }
  );

  // Fade in
  const fadeIn = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Parallax text overlays that slide in
  const textProgress = spring({
    frame: Math.max(0, frame - 10),
    fps,
    config: { damping: 14, stiffness: 60 },
  });

  const textOpacity = interpolate(textProgress, [0, 1], [0, 0.15]);
  const textTranslateX = interpolate(textProgress, [0, 1], [200, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#faf8f5" }}>
      {/* Product image with zoom */}
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
              maxWidth: "70%",
              maxHeight: "70%",
              objectFit: "contain",
              transform: `scale(${zoomScale})`,
              borderRadius: 12,
            }}
          />
        </AbsoluteFill>
      )}

      {/* Large decorative text overlay */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "flex-end",
          padding: 60,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            fontSize: 120,
            fontWeight: 900,
            color: brandColor,
            opacity: textOpacity,
            transform: `translateX(${textTranslateX}px)`,
            fontFamily: "sans-serif",
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          SEE
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

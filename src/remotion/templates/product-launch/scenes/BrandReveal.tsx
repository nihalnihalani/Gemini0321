import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Img,
} from "remotion";

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
  const { fps, durationInFrames } = useVideoConfig();

  // ── Background: smooth transition from warm beige to clean white ──
  const bgTransition = interpolate(frame, [0, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Interpolate RGB channels: #f5f3f0 (245,243,240) → #ffffff (255,255,255)
  const bgR = Math.round(interpolate(bgTransition, [0, 1], [245, 255]));
  const bgG = Math.round(interpolate(bgTransition, [0, 1], [243, 255]));
  const bgB = Math.round(interpolate(bgTransition, [0, 1], [240, 255]));
  const backgroundColor = `rgb(${bgR}, ${bgG}, ${bgB})`;

  // ── Logo: smooth scale from 0.6 → 1.0, no bounce ──
  const logoProgress = spring({
    frame,
    fps,
    config: { damping: 200, stiffness: 80, mass: 0.8 },
  });
  const logoScale = interpolate(logoProgress, [0, 1], [0.6, 1]);
  const logoOpacity = interpolate(logoProgress, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  // ── Brand name: word-by-word reveal, delayed after logo ──
  const nameDelay = 18;
  const nameWords = brandName.split(" ");
  const nameWordDelay = 6; // frames between each word

  // ── Product image: rises from below after brand name ──
  const productDelay = nameDelay + nameWords.length * nameWordDelay + 15;
  const productFrame = Math.max(0, frame - productDelay);
  const productProgress = spring({
    frame: productFrame,
    fps,
    config: { damping: 200, stiffness: 80, mass: 0.7 },
  });
  const productOpacity = interpolate(productProgress, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });
  const productTranslateY = interpolate(productProgress, [0, 1], [40, 0]);
  const productScale = interpolate(productProgress, [0, 1], [0.9, 1]);

  // ── Decorative ring — subtle circular accent behind logo ──
  const ringDelay = 8;
  const ringFrame = Math.max(0, frame - ringDelay);
  const ringProgress = spring({
    frame: ringFrame,
    fps,
    config: { damping: 200, stiffness: 60, mass: 1.2 },
  });
  const ringScale = interpolate(ringProgress, [0, 1], [0, 1]);
  const ringOpacity = interpolate(ringProgress, [0, 1], [0, 0.08]);

  // ── Final hold — everything stays visible, no exit fade ──
  // The last scene should linger for brand recall

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Decorative ring behind logo */}
      <div
        style={{
          position: "absolute",
          width: 200,
          height: 200,
          borderRadius: "50%",
          border: `2px solid ${brandColor}`,
          opacity: ringOpacity,
          transform: `scale(${ringScale})`,
          willChange: "transform, opacity",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 32,
        }}
      >
        {/* Logo */}
        {logoUrl && (
          <div
            style={{
              transform: `scale(${logoScale})`,
              opacity: logoOpacity,
              willChange: "transform, opacity",
            }}
          >
            <Img
              src={logoUrl}
              style={{
                width: 72,
                height: 72,
                objectFit: "contain",
              }}
            />
          </div>
        )}

        {/* Brand name — word-by-word reveal */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "0 14px",
          }}
        >
          {nameWords.map((word, i) => {
            const wordFrame = Math.max(
              0,
              frame - (nameDelay + i * nameWordDelay)
            );
            const wordProgress = spring({
              frame: wordFrame,
              fps,
              config: { damping: 200, stiffness: 140, mass: 0.5 },
            });
            const wordOpacity = interpolate(
              wordProgress,
              [0, 0.4],
              [0, 1],
              { extrapolateRight: "clamp" }
            );
            const wordTranslateY = interpolate(
              wordProgress,
              [0, 1],
              [16, 0]
            );

            return (
              <div
                key={i}
                style={{
                  fontSize: 68,
                  fontWeight: 800,
                  color: brandColor,
                  fontFamily: "sans-serif",
                  letterSpacing: "-0.025em",
                  textAlign: "center",
                  opacity: wordOpacity,
                  transform: `translateY(${wordTranslateY}px)`,
                  willChange: "transform, opacity",
                }}
              >
                {word}
              </div>
            );
          })}
        </div>

        {/* Decorative line under brand name */}
        <BrandLine
          frame={frame}
          delay={nameDelay + nameWords.length * nameWordDelay + 5}
          fps={fps}
          color={brandColor}
        />

        {/* Hero product image — rises into place */}
        {productImage && (
          <div
            style={{
              opacity: productOpacity,
              transform: `translateY(${productTranslateY}px) scale(${productScale})`,
              willChange: "transform, opacity",
            }}
          >
            <Img
              src={productImage}
              style={{
                maxWidth: "45%",
                maxHeight: 280,
                objectFit: "contain",
                borderRadius: 12,
              }}
            />
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

/**
 * Thin decorative line that expands from center
 */
const BrandLine: React.FC<{
  frame: number;
  delay: number;
  fps: number;
  color: string;
}> = ({ frame, delay, fps, color }) => {
  const localFrame = Math.max(0, frame - delay);

  const progress = spring({
    frame: localFrame,
    fps,
    config: { damping: 200, stiffness: 100 },
  });

  const width = interpolate(progress, [0, 1], [0, 60]);
  const opacity = interpolate(progress, [0, 0.5], [0, 0.3], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width,
        height: 2,
        backgroundColor: color,
        borderRadius: 1,
        opacity,
        willChange: "width, opacity",
      }}
    />
  );
};

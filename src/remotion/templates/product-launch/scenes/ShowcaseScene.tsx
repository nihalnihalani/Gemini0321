import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Img,
  interpolate,
  spring,
} from "remotion";

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

  // ── Ken Burns: slow zoom + subtle horizontal pan ──
  const zoomScale = interpolate(
    frame,
    [0, durationInFrames],
    [1.02, 1.12],
    { extrapolateRight: "clamp" }
  );
  const panX = interpolate(
    frame,
    [0, durationInFrames],
    [-8, 8],
    { extrapolateRight: "clamp" }
  );
  const panY = interpolate(
    frame,
    [0, durationInFrames],
    [4, -4],
    { extrapolateRight: "clamp" }
  );

  // ── Fade in with spring — smooth entrance, no harsh cut ──
  const entranceProgress = spring({
    frame,
    fps,
    config: { damping: 200, stiffness: 80, mass: 0.8 },
  });
  const entranceOpacity = interpolate(entranceProgress, [0, 1], [0, 1]);
  const entranceScale = interpolate(entranceProgress, [0, 1], [0.92, 1]);

  // ── Subtle vignette corners — draws eye to center ──
  const vignetteOpacity = interpolate(frame, [0, 30], [0, 0.35], {
    extrapolateRight: "clamp",
  });

  // ── Decorative accent text — large, muted watermark ──
  const accentDelay = 12;
  const accentFrame = Math.max(0, frame - accentDelay);
  const accentProgress = spring({
    frame: accentFrame,
    fps,
    config: { damping: 200, stiffness: 60, mass: 1 },
  });
  const accentOpacity = interpolate(accentProgress, [0, 1], [0, 0.06]);
  const accentTranslateX = interpolate(accentProgress, [0, 1], [60, 0]);

  // ── Exit fade ──
  const exitStart = durationInFrames - 12;
  const exitOpacity = interpolate(
    frame,
    [exitStart, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#f5f3f0" }}>
      {/* Product image with Ken Burns pan + zoom */}
      {productImage && (
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            opacity: entranceOpacity * exitOpacity,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              transform: `scale(${entranceScale})`,
              willChange: "transform",
            }}
          >
            <Img
              src={productImage}
              style={{
                maxWidth: "68%",
                maxHeight: "68%",
                objectFit: "contain",
                transform: `scale(${zoomScale}) translate3d(${panX}px, ${panY}px, 0)`,
                borderRadius: 16,
                willChange: "transform",
              }}
            />
          </div>
        </AbsoluteFill>
      )}

      {/* Subtle radial vignette overlay */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 50%, rgba(245, 243, 240, 0.9) 100%)",
          opacity: vignetteOpacity,
          pointerEvents: "none",
        }}
      />

      {/* Large decorative watermark text */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "flex-end",
          padding: 60,
          pointerEvents: "none",
          opacity: exitOpacity,
        }}
      >
        <div
          style={{
            fontSize: 140,
            fontWeight: 900,
            color: brandColor,
            opacity: accentOpacity,
            transform: `translateX(${accentTranslateX}px)`,
            fontFamily: "sans-serif",
            letterSpacing: "-0.05em",
            lineHeight: 0.9,
            willChange: "transform, opacity",
          }}
        >
          SEE
        </div>
      </AbsoluteFill>

      {/* Top-left accent pill */}
      <AbsoluteFill
        style={{
          padding: 60,
          pointerEvents: "none",
          opacity: exitOpacity,
        }}
      >
        <AccentPill
          frame={frame}
          delay={20}
          fps={fps}
          color={brandColor}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/**
 * Small pill-shaped accent element in the corner
 * Adds visual sophistication without distracting from the product
 */
const AccentPill: React.FC<{
  frame: number;
  delay: number;
  fps: number;
  color: string;
}> = ({ frame, delay, fps, color }) => {
  const localFrame = Math.max(0, frame - delay);

  const progress = spring({
    frame: localFrame,
    fps,
    config: { damping: 200, stiffness: 100, mass: 0.6 },
  });

  const width = interpolate(progress, [0, 1], [0, 48]);
  const opacity = interpolate(progress, [0, 0.5], [0, 0.25], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width,
        height: 4,
        borderRadius: 2,
        backgroundColor: color,
        opacity,
        willChange: "width, opacity",
      }}
    />
  );
};

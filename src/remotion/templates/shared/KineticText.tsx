import React, { useMemo } from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";

/**
 * Safe font stack for server-side rendering.
 * Since @remotion/google-fonts is not installed, we use a comprehensive
 * system font stack that renders well across all platforms.
 */
const SAFE_FONT_STACK =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/**
 * Curated spring configs for different animation personalities.
 * Based on Remotion best practices:
 * - Higher damping = snappier, more professional feel
 * - Lower damping = bouncier, more playful
 * - overshootClamping prevents scale from exceeding target (avoids visual glitches)
 */
const SPRING_CONFIGS = {
  /** Snappy entrance — settles quickly with minimal overshoot */
  snappy: { damping: 20, stiffness: 200, mass: 0.8, overshootClamping: false },
  /** Gentle entrance — smooth deceleration, no bounce */
  gentle: { damping: 26, stiffness: 120, mass: 1, overshootClamping: true },
  /** Bouncy entrance — playful with visible overshoot */
  bouncy: { damping: 8, stiffness: 150, mass: 0.6, overshootClamping: false },
  /** Slide entrance — natural slide with soft landing */
  slide: { damping: 18, stiffness: 90, mass: 1, overshootClamping: true },
} as const;

interface KineticTextProps {
  text: string;
  animationType: "spring" | "fade" | "typewriter" | "slide-up";
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  fontWeight?: number;
  delay?: number;
  position?: "center" | "top" | "bottom" | "left" | "right";
  textAlign?: "left" | "center" | "right";
}

export const KineticText: React.FC<KineticTextProps> = ({
  text,
  animationType,
  fontSize = 64,
  color = "#ffffff",
  fontFamily = SAFE_FONT_STACK,
  fontWeight = 700,
  delay = 0,
  position = "center",
  textAlign = "center",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const delayedFrame = Math.max(0, frame - delay);

  // Memoize position styles to avoid recalculating on every frame
  const positionStyles: React.CSSProperties = useMemo(() => {
    switch (position) {
      case "top":
        return { justifyContent: "flex-start", paddingTop: 80 };
      case "bottom":
        return { justifyContent: "flex-end", paddingBottom: 80 };
      case "left":
        return { justifyContent: "center", alignItems: "flex-start", paddingLeft: 80 };
      case "right":
        return { justifyContent: "center", alignItems: "flex-end", paddingRight: 80 };
      default:
        return { justifyContent: "center", alignItems: "center" };
    }
  }, [position]);

  // Memoize base text style — only recalculate when props change, not every frame
  const baseStyle: React.CSSProperties = useMemo(
    () => ({
      fontSize,
      color,
      fontFamily,
      fontWeight,
      textAlign,
      textShadow: "0 2px 8px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 0, 0, 0.3)",
      maxWidth: "80%",
      lineHeight: 1.2,
      letterSpacing: "-0.01em",
    }),
    [fontSize, color, fontFamily, fontWeight, textAlign]
  );

  if (frame < delay) {
    return null;
  }

  if (animationType === "spring") {
    // Use snappy spring for scale-in — overshoot gives a satisfying pop
    const scale = spring({
      frame: delayedFrame,
      fps,
      config: SPRING_CONFIGS.snappy,
    });

    // Separate opacity fade using Easing.out(Easing.cubic) for a premium feel
    const opacity = interpolate(delayedFrame, [0, 12], [0, 1], {
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });

    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", ...positionStyles }}>
        <div style={{ ...baseStyle, transform: `scale(${scale})`, opacity }}>
          {text}
        </div>
      </div>
    );
  }

  if (animationType === "fade") {
    // Use easeInOut cubic for a premium, smooth fade
    const opacity = interpolate(delayedFrame, [0, 24], [0, 1], {
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    });

    // Subtle upward drift during fade for added depth
    const translateY = interpolate(delayedFrame, [0, 24], [8, 0], {
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });

    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", ...positionStyles }}>
        <div
          style={{
            ...baseStyle,
            opacity,
            transform: `translateY(${translateY}px)`,
          }}
        >
          {text}
        </div>
      </div>
    );
  }

  if (animationType === "typewriter") {
    // Use 1.5 frames per character for natural reading pace
    const charsToShow = Math.floor(
      interpolate(delayedFrame, [0, text.length * 1.5], [0, text.length], {
        extrapolateRight: "clamp",
      })
    );

    // Smooth cursor blink using sine wave instead of harsh on/off
    const cursorOpacity = interpolate(
      Math.sin(delayedFrame * 0.4),
      [-1, 1],
      [0.2, 1]
    );

    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", ...positionStyles }}>
        <div style={baseStyle}>
          {text.slice(0, charsToShow)}
          {charsToShow < text.length && (
            <span
              style={{
                opacity: cursorOpacity,
                marginLeft: 2,
                fontWeight: 300,
              }}
            >
              |
            </span>
          )}
        </div>
      </div>
    );
  }

  // slide-up: use the dedicated slide spring config for natural motion
  const progress = spring({
    frame: delayedFrame,
    fps,
    config: SPRING_CONFIGS.slide,
  });

  const translateY = interpolate(progress, [0, 1], [50, 0]);
  const opacity = interpolate(progress, [0, 0.6], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", ...positionStyles }}>
      <div
        style={{
          ...baseStyle,
          transform: `translateY(${translateY}px)`,
          opacity,
        }}
      >
        {text}
      </div>
    </div>
  );
};

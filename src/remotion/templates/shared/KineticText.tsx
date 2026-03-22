import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

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
  fontFamily = "sans-serif",
  fontWeight = 700,
  delay = 0,
  position = "center",
  textAlign = "center",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const delayedFrame = Math.max(0, frame - delay);

  const positionStyles: React.CSSProperties = (() => {
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
  })();

  const baseStyle: React.CSSProperties = {
    fontSize,
    color,
    fontFamily,
    fontWeight,
    textAlign,
    textShadow: "0 4px 12px rgba(0, 0, 0, 0.7)",
    maxWidth: "80%",
    lineHeight: 1.2,
  };

  if (frame < delay) {
    return null;
  }

  if (animationType === "spring") {
    const scale = spring({
      frame: delayedFrame,
      fps,
      config: { damping: 12, stiffness: 100 },
    });

    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", ...positionStyles }}>
        <div style={{ ...baseStyle, transform: `scale(${scale})`, opacity: scale }}>
          {text}
        </div>
      </div>
    );
  }

  if (animationType === "fade") {
    const opacity = interpolate(delayedFrame, [0, 20], [0, 1], {
      extrapolateRight: "clamp",
    });

    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", ...positionStyles }}>
        <div style={{ ...baseStyle, opacity }}>{text}</div>
      </div>
    );
  }

  if (animationType === "typewriter") {
    const charsToShow = Math.floor(
      interpolate(delayedFrame, [0, text.length * 2], [0, text.length], {
        extrapolateRight: "clamp",
      })
    );

    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", ...positionStyles }}>
        <div style={baseStyle}>
          {text.slice(0, charsToShow)}
          {charsToShow < text.length && (
            <span
              style={{
                opacity: Math.round(delayedFrame / 8) % 2 === 0 ? 1 : 0,
                marginLeft: 2,
              }}
            >
              |
            </span>
          )}
        </div>
      </div>
    );
  }

  // slide-up
  const progress = spring({
    frame: delayedFrame,
    fps,
    config: { damping: 14, stiffness: 80 },
  });

  const translateY = interpolate(progress, [0, 1], [60, 0]);
  const opacity = interpolate(progress, [0, 1], [0, 1]);

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

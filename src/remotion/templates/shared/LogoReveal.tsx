import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
} from "remotion";

interface LogoRevealProps {
  logoSrc?: string;
  brandName: string;
  animationType?: "scale-fade" | "slide-up" | "bounce";
  fontSize?: number;
  color?: string;
}

export const LogoReveal: React.FC<LogoRevealProps> = ({
  logoSrc,
  brandName,
  animationType = "scale-fade",
  fontSize = 48,
  color = "#ffffff",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const containerStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
  };

  const textStyle: React.CSSProperties = {
    fontSize,
    fontWeight: 700,
    color,
    fontFamily: "sans-serif",
    textShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
  };

  const logoStyle: React.CSSProperties = {
    width: 120,
    height: 120,
    objectFit: "contain",
  };

  if (animationType === "scale-fade") {
    const scaleVal = spring({
      frame,
      fps,
      config: { damping: 10, stiffness: 80 },
    });
    const opacity = interpolate(frame, [0, 20], [0, 1], {
      extrapolateRight: "clamp",
    });

    return (
      <div style={containerStyle}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 24,
            transform: `scale(${scaleVal})`,
            opacity,
          }}
        >
          {logoSrc && <Img src={logoSrc} style={logoStyle} />}
          <div style={textStyle}>{brandName}</div>
        </div>
      </div>
    );
  }

  if (animationType === "slide-up") {
    const progress = spring({
      frame,
      fps,
      config: { damping: 14, stiffness: 80 },
    });
    const translateY = interpolate(progress, [0, 1], [80, 0]);
    const opacity = interpolate(progress, [0, 1], [0, 1]);

    return (
      <div style={containerStyle}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 24,
            transform: `translateY(${translateY}px)`,
            opacity,
          }}
        >
          {logoSrc && <Img src={logoSrc} style={logoStyle} />}
          <div style={textStyle}>{brandName}</div>
        </div>
      </div>
    );
  }

  // bounce
  const bounceVal = spring({
    frame,
    fps,
    config: { damping: 6, stiffness: 120, mass: 0.8 },
  });
  const opacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div style={containerStyle}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          transform: `scale(${bounceVal})`,
          opacity,
        }}
      >
        {logoSrc && <Img src={logoSrc} style={logoStyle} />}
        <div style={textStyle}>{brandName}</div>
      </div>
    </div>
  );
};

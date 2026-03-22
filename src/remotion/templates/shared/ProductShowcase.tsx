import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
} from "remotion";

interface ProductShowcaseProps {
  src: string;
  animationType?: "zoom-in" | "parallax" | "fade-in" | "slide";
  scale?: number;
  borderRadius?: number;
  shadow?: boolean;
}

export const ProductShowcase: React.FC<ProductShowcaseProps> = ({
  src,
  animationType = "zoom-in",
  scale = 1,
  borderRadius = 0,
  shadow = true,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const containerStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  };

  const shadowStyle = shadow
    ? "0 20px 60px rgba(0, 0, 0, 0.5)"
    : "none";

  if (animationType === "zoom-in") {
    const zoomScale = interpolate(
      frame,
      [0, durationInFrames],
      [scale, scale * 1.15],
      { extrapolateRight: "clamp" }
    );
    const opacity = interpolate(frame, [0, 15], [0, 1], {
      extrapolateRight: "clamp",
    });

    return (
      <div style={containerStyle}>
        <Img
          src={src}
          style={{
            transform: `scale(${zoomScale})`,
            opacity,
            borderRadius,
            boxShadow: shadowStyle,
            maxWidth: "80%",
            maxHeight: "80%",
            objectFit: "contain",
          }}
        />
      </div>
    );
  }

  if (animationType === "parallax") {
    const translateY = interpolate(
      frame,
      [0, durationInFrames],
      [30, -30],
      { extrapolateRight: "clamp" }
    );

    return (
      <div style={containerStyle}>
        <Img
          src={src}
          style={{
            transform: `scale(${scale}) translateY(${translateY}px)`,
            borderRadius,
            boxShadow: shadowStyle,
            maxWidth: "80%",
            maxHeight: "80%",
            objectFit: "contain",
          }}
        />
      </div>
    );
  }

  if (animationType === "fade-in") {
    const opacity = interpolate(frame, [0, 25], [0, 1], {
      extrapolateRight: "clamp",
    });
    const springVal = spring({
      frame,
      fps,
      config: { damping: 12, stiffness: 80 },
    });

    return (
      <div style={containerStyle}>
        <Img
          src={src}
          style={{
            transform: `scale(${scale * springVal})`,
            opacity,
            borderRadius,
            boxShadow: shadowStyle,
            maxWidth: "80%",
            maxHeight: "80%",
            objectFit: "contain",
          }}
        />
      </div>
    );
  }

  // slide
  const slideProgress = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 80 },
  });
  const translateX = interpolate(slideProgress, [0, 1], [200, 0]);
  const opacity = interpolate(slideProgress, [0, 1], [0, 1]);

  return (
    <div style={containerStyle}>
      <Img
        src={src}
        style={{
          transform: `scale(${scale}) translateX(${translateX}px)`,
          opacity,
          borderRadius,
          boxShadow: shadowStyle,
          maxWidth: "80%",
          maxHeight: "80%",
          objectFit: "contain",
        }}
      />
    </div>
  );
};

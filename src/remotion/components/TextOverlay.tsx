import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

interface TextOverlayProps {
  text: string;
  style?: "subtitle" | "title";
}

export const TextOverlay: React.FC<TextOverlayProps> = ({
  text,
  style = "subtitle",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (style === "title") {
    const scale = spring({
      frame,
      fps,
      config: { damping: 12, stiffness: 100 },
    });

    return (
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            transform: `scale(${scale})`,
            color: "white",
            fontSize: 72,
            fontWeight: "bold",
            textAlign: "center",
            textShadow: "0 4px 12px rgba(0, 0, 0, 0.7)",
            padding: "0 80px",
          }}
        >
          {text}
        </div>
      </AbsoluteFill>
    );
  }

  // Subtitle style
  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 80,
      }}
    >
      <div
        style={{
          opacity,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          color: "white",
          fontSize: 36,
          padding: "16px 32px",
          borderRadius: 8,
          maxWidth: "80%",
          textAlign: "center",
          lineHeight: 1.4,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

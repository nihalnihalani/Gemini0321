import React from "react";
import {
  AbsoluteFill,
  Img,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";

interface DiagramSceneProps {
  imageUrl: string;
  labels: string[];
}

export const DiagramScene: React.FC<DiagramSceneProps> = ({
  imageUrl,
  labels,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Image zoom-in
  const imageScale = interpolate(frame, [0, 60], [1.1, 1.0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const imageOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Label stagger delay
  const labelStagger = 20;

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #1a1a4e 0%, #2d1b69 50%, #1a3a5e 100%)",
        justifyContent: "center",
        alignItems: "center",
        padding: 60,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 60,
          alignItems: "center",
          maxWidth: "90%",
        }}
      >
        {/* Diagram image */}
        <div
          style={{
            flex: 1,
            borderRadius: 20,
            overflow: "hidden",
            opacity: imageOpacity,
            transform: `scale(${imageScale})`,
            boxShadow: "0 12px 40px rgba(0, 0, 0, 0.4)",
          }}
        >
          <Img
            src={imageUrl}
            style={{
              width: "100%",
              height: "auto",
              display: "block",
            }}
          />
        </div>

        {/* Labels / annotations */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          {labels.map((label, index) => {
            const delay = 15 + index * labelStagger;
            const localFrame = Math.max(0, frame - delay);
            const progress = spring({
              frame: localFrame,
              fps,
              config: { damping: 14, stiffness: 80 },
            });
            const translateX = interpolate(progress, [0, 1], [40, 0]);
            const opacity = interpolate(progress, [0, 1], [0, 1]);

            return (
              <div
                key={index}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  transform: `translateX(${translateX}px)`,
                  opacity,
                }}
              >
                {/* Dot indicator */}
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #6366f1, #a855f7)",
                    flexShrink: 0,
                  }}
                />

                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 500,
                    color: "rgba(255, 255, 255, 0.9)",
                    fontFamily: "sans-serif",
                    lineHeight: 1.4,
                  }}
                >
                  {label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

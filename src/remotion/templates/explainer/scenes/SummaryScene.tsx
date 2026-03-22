import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";

interface SummarySceneProps {
  conclusion: string;
  stepTitles: string[];
}

export const SummaryScene: React.FC<SummarySceneProps> = ({
  conclusion,
  stepTitles,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // "Key Takeaways" header
  const headerScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  // Takeaway items stagger
  const itemStagger = 12;

  // Conclusion text fades in after items
  const conclusionDelay = 15 + stepTitles.length * itemStagger;
  const conclusionFrame = Math.max(0, frame - conclusionDelay);
  const conclusionOpacity = interpolate(conclusionFrame, [0, 25], [0, 1], {
    extrapolateRight: "clamp",
  });
  const conclusionTranslateY = interpolate(conclusionFrame, [0, 25], [20, 0], {
    extrapolateRight: "clamp",
  });

  // Decorative line
  const lineWidth = interpolate(frame, [5, 30], [0, 120], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #1a1a4e 0%, #2d1b69 50%, #1a3a5e 100%)",
        justifyContent: "center",
        alignItems: "center",
        padding: 80,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 36,
          maxWidth: "80%",
        }}
      >
        {/* Header */}
        <div
          style={{
            fontSize: 52,
            fontWeight: 800,
            color: "#ffffff",
            fontFamily: "sans-serif",
            transform: `scale(${headerScale})`,
            textShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
          }}
        >
          Key Takeaways
        </div>

        {/* Decorative line */}
        <div
          style={{
            width: lineWidth,
            height: 4,
            background: "linear-gradient(90deg, #6366f1, #a855f7)",
            borderRadius: 2,
          }}
        />

        {/* Step titles as takeaway items */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            width: "100%",
          }}
        >
          {stepTitles.map((title, index) => {
            const delay = 10 + index * itemStagger;
            const localFrame = Math.max(0, frame - delay);
            const progress = spring({
              frame: localFrame,
              fps,
              config: { damping: 14, stiffness: 80 },
            });
            const translateX = interpolate(progress, [0, 1], [60, 0]);
            const opacity = interpolate(progress, [0, 1], [0, 1]);

            return (
              <div
                key={index}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  transform: `translateX(${translateX}px)`,
                  opacity,
                }}
              >
                {/* Checkmark */}
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #22c55e, #16a34a)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    flexShrink: 0,
                    boxShadow: "0 4px 12px rgba(34, 197, 94, 0.3)",
                  }}
                >
                  <span
                    style={{
                      color: "#ffffff",
                      fontSize: 18,
                      fontWeight: 700,
                    }}
                  >
                    ✓
                  </span>
                </div>

                <div
                  style={{
                    fontSize: 30,
                    fontWeight: 600,
                    color: "rgba(255, 255, 255, 0.9)",
                    fontFamily: "sans-serif",
                  }}
                >
                  {title}
                </div>
              </div>
            );
          })}
        </div>

        {/* Conclusion */}
        <div
          style={{
            fontSize: 26,
            fontWeight: 400,
            color: "rgba(255, 255, 255, 0.7)",
            fontFamily: "sans-serif",
            textAlign: "center",
            lineHeight: 1.5,
            opacity: conclusionOpacity,
            transform: `translateY(${conclusionTranslateY}px)`,
            marginTop: 12,
            fontStyle: "italic",
          }}
        >
          {conclusion}
        </div>
      </div>
    </AbsoluteFill>
  );
};

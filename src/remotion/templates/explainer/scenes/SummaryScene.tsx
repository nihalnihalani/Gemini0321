import React from "react";
import {
  AbsoluteFill,
  Audio,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { NarrationCaptions } from "../components/NarrationCaptions";

interface SummarySceneProps {
  conclusion: string;
  stepTitles: string[];
  narrationUrl?: string;
  summaryNarration?: string;
}

export const SummaryScene: React.FC<SummarySceneProps> = ({
  conclusion,
  stepTitles,
  narrationUrl,
  summaryNarration,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Scene fade-in
  const sceneOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Scene fade-out
  const fadeOutStart = durationInFrames - 20;
  const sceneExit = interpolate(frame, [fadeOutStart, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // "Key Takeaways" header
  const headerProgress = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 80 },
  });
  const headerTranslateY = interpolate(headerProgress, [0, 1], [30, 0]);
  const headerOpacity = interpolate(headerProgress, [0, 1], [0, 1]);

  // Takeaway items stagger
  const itemStagger = 15;

  // Conclusion text fades in after items
  const conclusionDelay = 20 + stepTitles.length * itemStagger;
  const conclusionFrame = Math.max(0, frame - conclusionDelay);
  const conclusionOpacity = interpolate(conclusionFrame, [0, 25], [0, 1], {
    extrapolateRight: "clamp",
  });
  const conclusionTranslateY = interpolate(conclusionFrame, [0, 25], [15, 0], {
    extrapolateRight: "clamp",
  });

  // Decorative line
  const lineDelay = 10;
  const lineFrame = Math.max(0, frame - lineDelay);
  const lineWidth = interpolate(lineFrame, [0, 25], [0, 80], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(160deg, #0f0f2e 0%, #1a1145 40%, #0d1f3c 100%)",
        opacity: sceneOpacity * sceneExit,
      }}
    >
      {/* Completed progress bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: "linear-gradient(90deg, #6366f1, #a855f7, #ec4899)",
        }}
      />

      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: "80px 100px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 28,
            maxWidth: "80%",
          }}
        >
          {/* Header */}
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "#22c55e",
              fontFamily: "'Inter', system-ui, sans-serif",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              opacity: headerOpacity,
              transform: `translateY(${headerTranslateY}px)`,
            }}
          >
            Summary
          </div>

          <div
            style={{
              fontSize: 44,
              fontWeight: 800,
              color: "#ffffff",
              fontFamily: "'Inter', system-ui, sans-serif",
              opacity: headerOpacity,
              transform: `translateY(${headerTranslateY}px)`,
              letterSpacing: "-0.02em",
            }}
          >
            Key Takeaways
          </div>

          {/* Decorative line */}
          <div
            style={{
              width: lineWidth,
              height: 3,
              background: "linear-gradient(90deg, transparent, #22c55e, transparent)",
              borderRadius: 2,
            }}
          />

          {/* Step titles as takeaway items */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              width: "100%",
              marginTop: 8,
            }}
          >
            {stepTitles.map((stepTitle, index) => {
              const delay = 15 + index * itemStagger;
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
                    padding: "10px 16px",
                    borderRadius: 10,
                    backgroundColor: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                  }}
                >
                  {/* Checkmark */}
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #22c55e, #16a34a)",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      flexShrink: 0,
                      boxShadow: "0 2px 8px rgba(34, 197, 94, 0.25)",
                    }}
                  >
                    <span
                      style={{
                        color: "#ffffff",
                        fontSize: 15,
                        fontWeight: 700,
                      }}
                    >
                      ✓
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 600,
                      color: "rgba(255, 255, 255, 0.9)",
                      fontFamily: "'Inter', system-ui, sans-serif",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {stepTitle}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Conclusion */}
          <div
            style={{
              fontSize: 22,
              fontWeight: 400,
              color: "rgba(255, 255, 255, 0.6)",
              fontFamily: "'Inter', system-ui, sans-serif",
              textAlign: "center",
              lineHeight: 1.6,
              opacity: conclusionOpacity,
              transform: `translateY(${conclusionTranslateY}px)`,
              marginTop: 8,
              maxWidth: "90%",
            }}
          >
            {conclusion}
          </div>
        </div>
      </AbsoluteFill>

      {/* Narration audio */}
      {narrationUrl && <Audio src={narrationUrl} volume={1} />}

      {/* Captions for summary narration — only when narration audio exists */}
      {summaryNarration && narrationUrl && (
        <NarrationCaptions
          text={summaryNarration}
          position="bottom"
          activeColor="#4ade80"
          fontSize={26}
        />
      )}
    </AbsoluteFill>
  );
};

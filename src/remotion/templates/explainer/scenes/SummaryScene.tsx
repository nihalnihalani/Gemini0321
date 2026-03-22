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

/**
 * SummaryScene — Closing scene that recaps key takeaways.
 *
 * Design principles applied:
 * - Full progress bar signals completion (leverages Zeigarnik completion satisfaction)
 * - Animated checkmarks with SVG stroke-dashoffset for a satisfying "drawn" reveal
 * - Staggered item reveal builds recall by reviewing each concept
 * - Completion celebration: expanding ring burst + confetti particles
 * - Green accent color signals success/completion (color psychology)
 * - Conclusion text enters last — the final mental anchor
 */
export const SummaryScene: React.FC<SummarySceneProps> = ({
  conclusion,
  stepTitles,
  narrationUrl,
  summaryNarration,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Scene fade-in
  const sceneOpacity = interpolate(frame, [0, 14], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Scene fade-out
  const fadeOutStart = durationInFrames - 22;
  const sceneExit = interpolate(frame, [fadeOutStart, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // "Key Takeaways" header — spring entrance
  const headerProgress = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 80 },
  });
  const headerTranslateY = interpolate(headerProgress, [0, 1], [30, 0]);
  const headerOpacity = interpolate(headerProgress, [0, 1], [0, 1]);
  const headerScale = interpolate(headerProgress, [0, 1], [0.94, 1]);

  // Decorative line under header
  const lineDelay = 12;
  const lineFrame = Math.max(0, frame - lineDelay);
  const lineWidth = interpolate(lineFrame, [0, 25], [0, 90], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lineOpacity = interpolate(lineFrame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Takeaway items stagger — generous spacing for comprehension
  const itemStagger = 18;

  // Conclusion text — enters after all items have appeared
  const conclusionDelay = 24 + stepTitles.length * itemStagger;
  const conclusionFrame = Math.max(0, frame - conclusionDelay);
  const conclusionProgress = spring({
    frame: conclusionFrame,
    fps,
    config: { damping: 16, stiffness: 70 },
  });
  const conclusionOpacity = interpolate(conclusionProgress, [0, 1], [0, 1]);
  const conclusionTranslateY = interpolate(conclusionProgress, [0, 1], [18, 0]);

  // Celebration ring burst — triggers after all items are revealed
  const celebrationDelay = 18 + stepTitles.length * itemStagger;
  const celebrationFrame = Math.max(0, frame - celebrationDelay);
  const ringScale = spring({
    frame: celebrationFrame,
    fps,
    config: { damping: 6, stiffness: 40 },
  });
  const ringOpacity = interpolate(ringScale, [0, 0.3, 1], [0, 0.25, 0]);

  // Celebration particles
  const particleCount = 12;
  const celebrationParticles = Array.from({ length: particleCount }, (_, i) => {
    const angle = (i / particleCount) * Math.PI * 2;
    const distance = ringScale * 180 + 40;
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;
    const particleOpacity = interpolate(
      ringScale,
      [0, 0.2, 0.7, 1],
      [0, 0.6, 0.3, 0]
    );
    const size = 4 + (i % 3) * 2;
    const colors = ["#4ade80", "#22c55e", "#818cf8", "#a78bfa", "#fbbf24"];
    const color = colors[i % colors.length];

    return (
      <div
        key={i}
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: "50%",
          backgroundColor: color,
          opacity: particleOpacity,
          transform: `translate(${x}px, ${y}px)`,
          left: "50%",
          top: "40%",
        }}
      />
    );
  });

  // Subtle background grid
  const gridOpacity = interpolate(frame, [0, 20], [0, 0.025], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Success glow behind header
  const glowOpacity = interpolate(
    Math.sin(frame * 0.025),
    [-1, 1],
    [0.04, 0.08]
  );

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(160deg, #0f0f2e 0%, #1a1145 40%, #0d1f3c 100%)",
        opacity: sceneOpacity * sceneExit,
      }}
    >
      {/* Background grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: gridOpacity,
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Success glow */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "50%",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, #22c55e, transparent 70%)",
          opacity: glowOpacity,
          transform: "translateX(-50%) translateY(-50%)",
        }}
      />

      {/* Celebration ring burst */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          width: ringScale * 400,
          height: ringScale * 400,
          borderRadius: "50%",
          border: "2px solid rgba(74, 222, 128, 0.3)",
          opacity: ringOpacity,
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* Celebration particles */}
      {celebrationParticles}

      {/* Completed progress bar — full width with glow */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: "linear-gradient(90deg, #6366f1, #a855f7, #22c55e)",
          boxShadow: "0 0 12px rgba(34, 197, 94, 0.3)",
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
            gap: 24,
            maxWidth: "80%",
          }}
        >
          {/* "Summary" label */}
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#4ade80",
              fontFamily: "'Inter', system-ui, sans-serif",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              opacity: headerOpacity,
              transform: `translateY(${headerTranslateY}px) scale(${headerScale})`,
            }}
          >
            Summary
          </div>

          {/* "Key Takeaways" heading */}
          <div
            style={{
              fontSize: 46,
              fontWeight: 800,
              color: "#ffffff",
              fontFamily: "'Inter', system-ui, sans-serif",
              opacity: headerOpacity,
              transform: `translateY(${headerTranslateY}px) scale(${headerScale})`,
              letterSpacing: "-0.02em",
              textShadow: "0 2px 20px rgba(34, 197, 94, 0.15)",
            }}
          >
            Key Takeaways
          </div>

          {/* Decorative line */}
          <div
            style={{
              width: lineWidth,
              height: 3,
              background: "linear-gradient(90deg, transparent, #4ade80, transparent)",
              borderRadius: 2,
              opacity: lineOpacity,
            }}
          />

          {/* Step titles as takeaway items */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              width: "100%",
              marginTop: 6,
            }}
          >
            {stepTitles.map((stepTitle, index) => {
              const delay = 16 + index * itemStagger;
              const localFrame = Math.max(0, frame - delay);
              const progress = spring({
                frame: localFrame,
                fps,
                config: { damping: 14, stiffness: 80 },
              });
              const translateX = interpolate(progress, [0, 1], [30, 0]);
              const opacity = interpolate(progress, [0, 1], [0, 1]);

              // Checkmark draw animation (SVG stroke-dashoffset)
              const checkDelay = delay + 8;
              const checkFrame = Math.max(0, frame - checkDelay);
              const checkProgress = interpolate(checkFrame, [0, 12], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });

              // Circle fill behind checkmark
              const circleScale = spring({
                frame: Math.max(0, frame - delay - 2),
                fps,
                config: { damping: 12, stiffness: 100 },
              });

              return (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 18,
                    transform: `translateX(${translateX}px)`,
                    opacity,
                    padding: "12px 20px",
                    borderRadius: 12,
                    backgroundColor: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                  }}
                >
                  {/* Animated checkmark circle */}
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #22c55e, #16a34a)",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      flexShrink: 0,
                      boxShadow: "0 3px 10px rgba(34, 197, 94, 0.3)",
                      transform: `scale(${circleScale})`,
                    }}
                  >
                    {/* SVG checkmark with stroke animation */}
                    <svg
                      width="16"
                      height="12"
                      viewBox="0 0 16 12"
                      fill="none"
                    >
                      <path
                        d="M2 6L6 10L14 2"
                        stroke="#ffffff"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray="20"
                        strokeDashoffset={20 * (1 - checkProgress)}
                      />
                    </svg>
                  </div>

                  {/* Step title text */}
                  <div
                    style={{
                      fontSize: 25,
                      fontWeight: 600,
                      color: "rgba(255, 255, 255, 0.92)",
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

          {/* Conclusion text */}
          <div
            style={{
              fontSize: 22,
              fontWeight: 400,
              color: "rgba(255, 255, 255, 0.65)",
              fontFamily: "'Inter', system-ui, sans-serif",
              textAlign: "center",
              lineHeight: 1.65,
              opacity: conclusionOpacity,
              transform: `translateY(${conclusionTranslateY}px)`,
              marginTop: 10,
              maxWidth: "90%",
              letterSpacing: "0.01em",
            }}
          >
            {conclusion}
          </div>
        </div>
      </AbsoluteFill>

      {/* Narration audio */}
      {narrationUrl && <Audio src={narrationUrl} volume={1} />}

      {/* Captions for summary narration */}
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

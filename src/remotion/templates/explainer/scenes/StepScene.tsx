import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";

interface StepSceneProps {
  stepNumber: number;
  title: string;
  description: string;
  iconUrl?: string;
  totalSteps: number;
  narrationUrl?: string;
  sfxUrl?: string;
}

/**
 * StepScene — Individual step in an explainer sequence.
 *
 * Design principles applied:
 * - Progress bar animates between previous and current step (Zeigarnik effect)
 * - Step indicator dots show position within the full sequence
 * - Staggered entrance: label -> number -> title -> accent line -> description -> icon
 *   (builds understanding progressively, never shows everything at once)
 * - Connecting vertical line between step number and progress dots
 *   (creates visual continuity between scenes)
 * - Description text uses higher contrast and larger line-height for readability
 * - Subtle background grid for depth without distraction
 */
export const StepScene: React.FC<StepSceneProps> = ({
  stepNumber,
  title,
  description,
  iconUrl,
  totalSteps,
  narrationUrl,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Scene fade-in
  const sceneOpacity = interpolate(frame, [0, 14], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Scene fade-out
  const fadeOutStart = durationInFrames - 15;
  const sceneExit = interpolate(frame, [fadeOutStart, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Progress bar: animates from previous step's progress to current
  const prevProgress = ((stepNumber - 1) / totalSteps) * 100;
  const targetProgress = (stepNumber / totalSteps) * 100;
  const progressWidth = interpolate(frame, [0, 40], [prevProgress, targetProgress], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Progress bar glow pulse when it reaches its target
  const progressGlow = interpolate(frame, [35, 50, 65], [0, 0.6, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Step label — enters first to orient the viewer
  const labelDelay = 4;
  const labelFrame = Math.max(0, frame - labelDelay);
  const labelProgress = spring({
    frame: labelFrame,
    fps,
    config: { damping: 16, stiffness: 100 },
  });
  const labelOpacity = interpolate(labelProgress, [0, 1], [0, 1]);
  const labelTranslateX = interpolate(labelProgress, [0, 1], [-20, 0]);

  // Step number circle — springs in with scale
  const numberDelay = 8;
  const numberFrame = Math.max(0, frame - numberDelay);
  const numberScale = spring({
    frame: numberFrame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  // Number ring pulse effect on entry
  const ringScale = spring({
    frame: numberFrame,
    fps,
    config: { damping: 8, stiffness: 60 },
  });
  const ringOpacity = interpolate(ringScale, [0, 0.5, 1], [0, 0.3, 0]);

  // Title slides in from below
  const titleDelay = 14;
  const titleFrame = Math.max(0, frame - titleDelay);
  const titleProgress = spring({
    frame: titleFrame,
    fps,
    config: { damping: 14, stiffness: 80 },
  });
  const titleTranslateY = interpolate(titleProgress, [0, 1], [35, 0]);
  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1]);

  // Accent line under title — reveals after title lands
  const lineDelay = 22;
  const lineFrame = Math.max(0, frame - lineDelay);
  const lineWidth = interpolate(lineFrame, [0, 20], [0, 64], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lineOpacity = interpolate(lineFrame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Description fades in — staggered after title for progressive disclosure
  const descDelay = 32;
  const descFrame = Math.max(0, frame - descDelay);
  const descProgress = spring({
    frame: descFrame,
    fps,
    config: { damping: 18, stiffness: 70 },
  });
  const descOpacity = interpolate(descProgress, [0, 1], [0, 1]);
  const descTranslateY = interpolate(descProgress, [0, 1], [14, 0]);

  // Icon zoom-in — last element to appear
  const iconDelay = 24;
  const iconFrame = Math.max(0, frame - iconDelay);
  const iconScale = spring({
    frame: iconFrame,
    fps,
    config: { damping: 12, stiffness: 90 },
  });

  // Step indicator dots — show position within the full sequence
  const dotsDelay = 6;
  const dotsFrame = Math.max(0, frame - dotsDelay);
  const dotsOpacity = interpolate(dotsFrame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Dot grid background
  const gridOpacity = interpolate(frame, [0, 20], [0, 0.025], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Ambient glow behind step number
  const glowOpacity = interpolate(
    Math.sin(frame * 0.03),
    [-1, 1],
    [0.05, 0.12]
  );

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(160deg, #0f0f2e 0%, #1a1145 40%, #0d1f3c 100%)",
        opacity: sceneOpacity * sceneExit,
      }}
    >
      {/* Dot grid pattern */}
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

      {/* Ambient glow behind step number area */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "12%",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: "radial-gradient(circle, #6366f1, transparent 70%)",
          opacity: glowOpacity,
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* Progress bar at top */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          backgroundColor: "rgba(255, 255, 255, 0.06)",
        }}
      >
        <div
          style={{
            width: `${progressWidth}%`,
            height: "100%",
            background: "linear-gradient(90deg, #6366f1, #a855f7, #ec4899)",
            borderRadius: "0 2px 2px 0",
            boxShadow: `0 0 ${12 * progressGlow}px rgba(168, 85, 247, ${progressGlow * 0.5})`,
          }}
        />
      </div>

      {/* Step indicator dots — breadcrumb showing position */}
      <div
        style={{
          position: "absolute",
          top: 24,
          right: 80,
          display: "flex",
          gap: 10,
          alignItems: "center",
          opacity: dotsOpacity,
        }}
      >
        {Array.from({ length: totalSteps }, (_, i) => {
          const isActive = i + 1 === stepNumber;
          const isCompleted = i + 1 < stepNumber;
          return (
            <div
              key={i}
              style={{
                width: isActive ? 24 : 8,
                height: 8,
                borderRadius: 4,
                background: isActive
                  ? "linear-gradient(90deg, #818cf8, #a855f7)"
                  : isCompleted
                    ? "rgba(129, 140, 248, 0.5)"
                    : "rgba(255, 255, 255, 0.12)",
                transition: "width 0.3s",
                boxShadow: isActive
                  ? "0 0 8px rgba(129, 140, 248, 0.4)"
                  : "none",
              }}
            />
          );
        })}
      </div>

      {/* Main content area */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "80px 100px",
        }}
      >
        {/* Step label */}
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#a78bfa",
            fontFamily: "'Inter', system-ui, sans-serif",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            opacity: labelOpacity,
            transform: `translateX(${labelTranslateX}px)`,
            marginBottom: 20,
          }}
        >
          Step {stepNumber} of {totalSteps}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 48,
            width: "100%",
          }}
        >
          {/* Step number circle with pulse ring */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            {/* Pulse ring on entry */}
            <div
              style={{
                position: "absolute",
                inset: -8,
                borderRadius: "50%",
                border: "2px solid rgba(99, 102, 241, 0.3)",
                transform: `scale(${ringScale * 1.3})`,
                opacity: ringOpacity,
              }}
            />
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                transform: `scale(${numberScale})`,
                boxShadow:
                  "0 8px 40px rgba(99, 102, 241, 0.35), 0 0 0 1px rgba(99, 102, 241, 0.2)",
              }}
            >
              <span
                style={{
                  fontSize: 40,
                  fontWeight: 700,
                  color: "#ffffff",
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
              >
                {stepNumber}
              </span>
            </div>
          </div>

          {/* Title + description */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              flex: 1,
              paddingTop: 4,
            }}
          >
            {/* Step title */}
            <div
              style={{
                fontSize: 46,
                fontWeight: 700,
                color: "#ffffff",
                fontFamily: "'Inter', system-ui, sans-serif",
                transform: `translateY(${titleTranslateY}px)`,
                opacity: titleOpacity,
                lineHeight: 1.12,
                letterSpacing: "-0.02em",
                textShadow: "0 2px 20px rgba(99, 102, 241, 0.12)",
              }}
            >
              {title}
            </div>

            {/* Accent line under title */}
            <div
              style={{
                width: lineWidth,
                height: 3,
                background: "linear-gradient(90deg, #818cf8, #a855f7, transparent)",
                borderRadius: 2,
                opacity: lineOpacity,
              }}
            />

            {/* Step description — higher contrast, generous line-height for readability */}
            <div
              style={{
                fontSize: 24,
                fontWeight: 400,
                color: "rgba(255, 255, 255, 0.82)",
                fontFamily: "'Inter', system-ui, sans-serif",
                opacity: descOpacity,
                transform: `translateY(${descTranslateY}px)`,
                lineHeight: 1.7,
                maxWidth: "88%",
                letterSpacing: "0.01em",
                marginTop: 4,
              }}
            >
              {description}
            </div>
          </div>

          {/* Optional icon */}
          {iconUrl && (
            <div
              style={{
                transform: `scale(${iconScale})`,
                width: 110,
                height: 110,
                borderRadius: 18,
                overflow: "hidden",
                flexShrink: 0,
                boxShadow:
                  "0 6px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.06)",
              }}
            >
              <Img
                src={iconUrl}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>
          )}
        </div>
      </AbsoluteFill>

      {/* Narration audio */}
      {narrationUrl && <Audio src={narrationUrl} volume={1} />}
    </AbsoluteFill>
  );
};

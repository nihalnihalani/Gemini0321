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
  const sceneOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Scene fade-out
  const fadeOutStart = durationInFrames - 15;
  const sceneExit = interpolate(frame, [fadeOutStart, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Step number counter animation
  const numberScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  // "Step N" label slides in
  const labelDelay = 5;
  const labelFrame = Math.max(0, frame - labelDelay);
  const labelOpacity = interpolate(labelFrame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Title slides in from right
  const titleDelay = 12;
  const titleFrame = Math.max(0, frame - titleDelay);
  const titleProgress = spring({
    frame: titleFrame,
    fps,
    config: { damping: 14, stiffness: 80 },
  });
  const titleTranslateY = interpolate(titleProgress, [0, 1], [40, 0]);
  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1]);

  // Description fades in word by word
  const descDelay = 30;
  const descFrame = Math.max(0, frame - descDelay);
  const descOpacity = interpolate(descFrame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });
  const descTranslateY = interpolate(descFrame, [0, 20], [12, 0], {
    extrapolateRight: "clamp",
  });

  // Icon zoom-in
  const iconDelay = 20;
  const iconFrame = Math.max(0, frame - iconDelay);
  const iconScale = spring({
    frame: iconFrame,
    fps,
    config: { damping: 12, stiffness: 90 },
  });

  // Progress bar animated width
  const prevProgress = ((stepNumber - 1) / totalSteps) * 100;
  const targetProgress = (stepNumber / totalSteps) * 100;
  const progressWidth = interpolate(frame, [0, 30], [prevProgress, targetProgress], {
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
          }}
        />
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
            fontSize: 14,
            fontWeight: 600,
            color: "#a78bfa",
            fontFamily: "'Inter', system-ui, sans-serif",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            opacity: labelOpacity,
            marginBottom: 16,
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
          {/* Step number circle */}
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
              boxShadow: "0 8px 40px rgba(99, 102, 241, 0.35), 0 0 0 1px rgba(99, 102, 241, 0.2)",
              flexShrink: 0,
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

          {/* Title + description */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              flex: 1,
              paddingTop: 4,
            }}
          >
            {/* Step title */}
            <div
              style={{
                fontSize: 44,
                fontWeight: 700,
                color: "#ffffff",
                fontFamily: "'Inter', system-ui, sans-serif",
                transform: `translateY(${titleTranslateY}px)`,
                opacity: titleOpacity,
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
              }}
            >
              {title}
            </div>

            {/* Accent line under title */}
            <div
              style={{
                width: interpolate(titleProgress, [0, 1], [0, 60]),
                height: 3,
                background: "linear-gradient(90deg, #a855f7, transparent)",
                borderRadius: 2,
                opacity: titleOpacity,
              }}
            />

            {/* Step description */}
            <div
              style={{
                fontSize: 24,
                fontWeight: 400,
                color: "rgba(255, 255, 255, 0.75)",
                fontFamily: "'Inter', system-ui, sans-serif",
                opacity: descOpacity,
                transform: `translateY(${descTranslateY}px)`,
                lineHeight: 1.65,
                maxWidth: "85%",
                letterSpacing: "0.01em",
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
                width: 100,
                height: 100,
                borderRadius: 16,
                overflow: "hidden",
                flexShrink: 0,
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
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

      {/* Narration audio only — no SFX to keep it clean */}
      {narrationUrl && <Audio src={narrationUrl} volume={1} />}
    </AbsoluteFill>
  );
};

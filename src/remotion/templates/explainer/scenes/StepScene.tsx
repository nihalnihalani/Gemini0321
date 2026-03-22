import React from "react";
import {
  AbsoluteFill,
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
}

export const StepScene: React.FC<StepSceneProps> = ({
  stepNumber,
  title,
  description,
  iconUrl,
  totalSteps,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Step number counter animation
  const numberScale = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 120 },
  });

  // Title slides in from right
  const titleDelay = 10;
  const titleFrame = Math.max(0, frame - titleDelay);
  const titleProgress = spring({
    frame: titleFrame,
    fps,
    config: { damping: 14, stiffness: 80 },
  });
  const titleTranslateX = interpolate(titleProgress, [0, 1], [80, 0]);
  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1]);

  // Description fades in
  const descDelay = 25;
  const descFrame = Math.max(0, frame - descDelay);
  const descOpacity = interpolate(descFrame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });
  const descTranslateY = interpolate(descFrame, [0, 20], [15, 0], {
    extrapolateRight: "clamp",
  });

  // Icon zoom-in
  const iconDelay = 15;
  const iconFrame = Math.max(0, frame - iconDelay);
  const iconScale = spring({
    frame: iconFrame,
    fps,
    config: { damping: 12, stiffness: 90 },
  });

  // Progress bar
  const progressWidth = (stepNumber / totalSteps) * 100;

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #1a1a4e 0%, #2d1b69 50%, #1a3a5e 100%)",
        justifyContent: "center",
        alignItems: "center",
        padding: 80,
      }}
    >
      {/* Progress bar at top */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 6,
          backgroundColor: "rgba(255, 255, 255, 0.1)",
        }}
      >
        <div
          style={{
            width: `${progressWidth}%`,
            height: "100%",
            background: "linear-gradient(90deg, #6366f1, #a855f7)",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 60,
          maxWidth: "90%",
        }}
      >
        {/* Left side: number + optional icon */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 24,
            flexShrink: 0,
          }}
        >
          {/* Step number circle */}
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #6366f1, #a855f7)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              transform: `scale(${numberScale})`,
              boxShadow: "0 8px 32px rgba(99, 102, 241, 0.4)",
            }}
          >
            <span
              style={{
                fontSize: 56,
                fontWeight: 800,
                color: "#ffffff",
                fontFamily: "sans-serif",
              }}
            >
              {stepNumber}
            </span>
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

        {/* Right side: title + description */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            flex: 1,
          }}
        >
          {/* Step title */}
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: "#ffffff",
              fontFamily: "sans-serif",
              transform: `translateX(${titleTranslateX}px)`,
              opacity: titleOpacity,
              lineHeight: 1.2,
              textShadow: "0 2px 12px rgba(0, 0, 0, 0.3)",
            }}
          >
            {title}
          </div>

          {/* Step description */}
          <div
            style={{
              fontSize: 28,
              fontWeight: 400,
              color: "rgba(255, 255, 255, 0.85)",
              fontFamily: "sans-serif",
              opacity: descOpacity,
              transform: `translateY(${descTranslateY}px)`,
              lineHeight: 1.5,
              maxWidth: "90%",
            }}
          >
            {description}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

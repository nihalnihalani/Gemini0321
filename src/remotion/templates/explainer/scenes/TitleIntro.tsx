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

interface TitleIntroProps {
  title: string;
  stepCount: number;
  narrationUrl?: string;
  introNarration?: string;
}

export const TitleIntro: React.FC<TitleIntroProps> = ({
  title,
  stepCount,
  narrationUrl,
  introNarration,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Scene fade-in
  const sceneOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Scene fade-out
  const fadeOutStart = durationInFrames - 15;
  const sceneExit = interpolate(frame, [fadeOutStart, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Title spring animation
  const titleProgress = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 80 },
  });
  const titleTranslateY = interpolate(titleProgress, [0, 1], [50, 0]);
  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1]);

  // Subtitle fade-in with delay
  const subtitleDelay = 30;
  const subtitleFrame = Math.max(0, frame - subtitleDelay);
  const subtitleOpacity = interpolate(subtitleFrame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });
  const subtitleTranslateY = interpolate(subtitleFrame, [0, 20], [15, 0], {
    extrapolateRight: "clamp",
  });

  // Decorative line grows in
  const lineWidth = interpolate(frame, [15, 40], [0, 120], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Ambient glow pulse
  const glowOpacity = interpolate(
    Math.sin(frame * 0.03),
    [-1, 1],
    [0.03, 0.08]
  );

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(160deg, #0f0f2e 0%, #1a1145 40%, #0d1f3c 100%)",
        opacity: sceneOpacity * sceneExit,
      }}
    >
      {/* Subtle radial glow */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, #6366f1, transparent 70%)",
          opacity: glowOpacity,
          transform: "translateX(-50%) translateY(-50%)",
        }}
      />

      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
            padding: "0 100px",
            maxWidth: "90%",
          }}
        >
          {/* Title */}
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              color: "#ffffff",
              fontFamily: "'Inter', system-ui, sans-serif",
              transform: `translateY(${titleTranslateY}px)`,
              opacity: titleOpacity,
              textAlign: "center",
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
            }}
          >
            {title}
          </div>

          {/* Decorative line */}
          <div
            style={{
              width: lineWidth,
              height: 3,
              background: "linear-gradient(90deg, transparent, #a855f7, transparent)",
              borderRadius: 2,
            }}
          />

          {/* Step count badge */}
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "#a78bfa",
              fontFamily: "'Inter', system-ui, sans-serif",
              opacity: subtitleOpacity,
              transform: `translateY(${subtitleTranslateY}px)`,
              textAlign: "center",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              padding: "8px 20px",
              borderRadius: 20,
              border: "1px solid rgba(167, 139, 250, 0.2)",
              backgroundColor: "rgba(167, 139, 250, 0.06)",
            }}
          >
            {stepCount} steps
          </div>
        </div>
      </AbsoluteFill>

      {/* Narration audio */}
      {narrationUrl && <Audio src={narrationUrl} volume={1} />}

      {/* Captions for intro narration — only if narration exists */}
      {introNarration && narrationUrl && (
        <NarrationCaptions
          text={introNarration}
          position="bottom"
          activeColor="#c4b5fd"
          fontSize={28}
        />
      )}
    </AbsoluteFill>
  );
};

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
  const { fps } = useVideoConfig();

  // Title spring animation
  const titleScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  // Subtitle fade-in with delay
  const subtitleDelay = 25;
  const subtitleFrame = Math.max(0, frame - subtitleDelay);
  const subtitleProgress = spring({
    frame: subtitleFrame,
    fps,
    config: { damping: 14, stiffness: 80 },
  });
  const subtitleTranslateY = interpolate(subtitleProgress, [0, 1], [20, 0]);
  const subtitleOpacity = interpolate(subtitleProgress, [0, 1], [0, 1]);

  // Decorative line grows in
  const lineWidth = interpolate(frame, [10, 35], [0, 160], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #1a1a4e 0%, #2d1b69 50%, #1a3a5e 100%)",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          padding: "0 80px",
        }}
      >
        {/* Title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "#ffffff",
            fontFamily: "sans-serif",
            transform: `scale(${titleScale})`,
            textAlign: "center",
            lineHeight: 1.2,
            textShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
          }}
        >
          {title}
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

        {/* Step count subtitle */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 400,
            color: "rgba(255, 255, 255, 0.7)",
            fontFamily: "sans-serif",
            transform: `translateY(${subtitleTranslateY}px)`,
            opacity: subtitleOpacity,
            textAlign: "center",
          }}
        >
          {introNarration || `${stepCount} steps to understand`}
        </div>
      </div>

      {narrationUrl && <Audio src={narrationUrl} volume={1} />}
      {introNarration && (
        <NarrationCaptions
          text={introNarration}
          position="bottom"
          activeColor="#a855f7"
        />
      )}
    </AbsoluteFill>
  );
};

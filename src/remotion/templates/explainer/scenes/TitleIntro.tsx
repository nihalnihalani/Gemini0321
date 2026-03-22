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

/**
 * TitleIntro — Opening scene for explainer videos.
 *
 * Design principles applied:
 * - Subtle animated dot-grid background (Kurzgesagt-inspired layered depth)
 * - Clear visual hierarchy: title > decorative line > step badge
 * - Staggered entrance animations that guide the eye top-to-bottom
 * - Ambient glow in trust/learning blue-purple tones (color psychology)
 * - Gentle floating particles for visual richness without distraction
 */
export const TitleIntro: React.FC<TitleIntroProps> = ({
  title,
  stepCount,
  narrationUrl,
  introNarration,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Scene fade-in (slightly slower for a more cinematic open)
  const sceneOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Scene fade-out
  const fadeOutStart = durationInFrames - 18;
  const sceneExit = interpolate(frame, [fadeOutStart, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Title spring animation — slightly softer for educational tone
  const titleProgress = spring({
    frame,
    fps,
    config: { damping: 16, stiffness: 70 },
  });
  const titleTranslateY = interpolate(titleProgress, [0, 1], [60, 0]);
  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1]);
  const titleScale = interpolate(titleProgress, [0, 1], [0.92, 1]);

  // Decorative line grows in (delayed slightly after title settles)
  const lineDelay = 18;
  const lineFrame = Math.max(0, frame - lineDelay);
  const lineWidth = interpolate(lineFrame, [0, 30], [0, 140], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lineOpacity = interpolate(lineFrame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Subtitle / step count badge — staggered after line
  const subtitleDelay = 35;
  const subtitleFrame = Math.max(0, frame - subtitleDelay);
  const subtitleProgress = spring({
    frame: subtitleFrame,
    fps,
    config: { damping: 14, stiffness: 90 },
  });
  const subtitleOpacity = interpolate(subtitleProgress, [0, 1], [0, 1]);
  const subtitleTranslateY = interpolate(subtitleProgress, [0, 1], [20, 0]);
  const subtitleScale = interpolate(subtitleProgress, [0, 1], [0.9, 1]);

  // Ambient glow pulse — breathing effect for depth
  const glowOpacity = interpolate(
    Math.sin(frame * 0.025),
    [-1, 1],
    [0.04, 0.1]
  );

  // Secondary glow for layered depth (Kurzgesagt-style)
  const glow2Opacity = interpolate(
    Math.sin(frame * 0.018 + 1.5),
    [-1, 1],
    [0.02, 0.06]
  );

  // Floating particles — 8 subtle dots for visual richness
  const particles = Array.from({ length: 8 }, (_, i) => {
    const seed = i * 137.5; // golden angle spread
    const baseX = (seed % 100);
    const baseY = ((seed * 2.3) % 100);
    const floatY = Math.sin(frame * 0.02 + i * 0.8) * 12;
    const floatX = Math.cos(frame * 0.015 + i * 1.1) * 8;
    const particleOpacity = interpolate(
      frame,
      [10 + i * 5, 30 + i * 5],
      [0, 0.15 + (i % 3) * 0.05],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    const size = 3 + (i % 3) * 2;

    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left: `${baseX}%`,
          top: `${baseY}%`,
          width: size,
          height: size,
          borderRadius: "50%",
          backgroundColor: i % 2 === 0 ? "#818cf8" : "#a78bfa",
          opacity: particleOpacity,
          transform: `translate(${floatX}px, ${floatY}px)`,
        }}
      />
    );
  });

  // Subtle dot grid pattern — gives the background a textured, crafted feel
  const gridOpacity = interpolate(frame, [5, 35], [0, 0.03], {
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
      {/* Dot grid pattern overlay */}
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

      {/* Primary ambient glow — centered blue-purple */}
      <div
        style={{
          position: "absolute",
          top: "25%",
          left: "50%",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: "radial-gradient(circle, #6366f1, transparent 70%)",
          opacity: glowOpacity,
          transform: "translateX(-50%) translateY(-50%)",
        }}
      />

      {/* Secondary ambient glow — offset for depth */}
      <div
        style={{
          position: "absolute",
          top: "60%",
          left: "35%",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, #a855f7, transparent 70%)",
          opacity: glow2Opacity,
          transform: "translateX(-50%) translateY(-50%)",
        }}
      />

      {/* Floating particles */}
      {particles}

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
            gap: 24,
            padding: "0 100px",
            maxWidth: "90%",
          }}
        >
          {/* Title — largest element, enters first for clear hierarchy */}
          <div
            style={{
              fontSize: 68,
              fontWeight: 800,
              color: "#ffffff",
              fontFamily: "'Inter', system-ui, sans-serif",
              transform: `translateY(${titleTranslateY}px) scale(${titleScale})`,
              opacity: titleOpacity,
              textAlign: "center",
              lineHeight: 1.12,
              letterSpacing: "-0.03em",
              textShadow: "0 4px 30px rgba(99, 102, 241, 0.2)",
            }}
          >
            {title}
          </div>

          {/* Decorative gradient line — visual separator */}
          <div
            style={{
              width: lineWidth,
              height: 3,
              background: "linear-gradient(90deg, transparent, #818cf8, #a855f7, transparent)",
              borderRadius: 2,
              opacity: lineOpacity,
            }}
          />

          {/* Step count badge — secondary info, enters last */}
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#a78bfa",
              fontFamily: "'Inter', system-ui, sans-serif",
              opacity: subtitleOpacity,
              transform: `translateY(${subtitleTranslateY}px) scale(${subtitleScale})`,
              textAlign: "center",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              padding: "10px 24px",
              borderRadius: 24,
              border: "1px solid rgba(167, 139, 250, 0.2)",
              backgroundColor: "rgba(167, 139, 250, 0.06)",
              backdropFilter: "blur(8px)",
            }}
          >
            {stepCount} {stepCount === 1 ? "step" : "steps"}
          </div>
        </div>
      </AbsoluteFill>

      {/* Narration audio */}
      {narrationUrl && <Audio src={narrationUrl} volume={1} />}

      {/* Captions for intro narration */}
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

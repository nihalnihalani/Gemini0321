import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Img,
} from "remotion";

interface OpeningNarrativeProps {
  companyName: string;
  mission: string;
  logoUrl?: string;
}

export const OpeningNarrative: React.FC<OpeningNarrativeProps> = ({
  companyName,
  mission,
  logoUrl,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Company name spring animation
  const nameScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  // Logo fades in alongside name
  const logoOpacity = interpolate(frame, [0, 25], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Decorative line expands
  const lineWidth = interpolate(frame, [20, 50], [0, 200], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Mission statement fades in after name
  const missionDelay = 40;
  const missionFrame = Math.max(0, frame - missionDelay);
  const missionProgress = spring({
    frame: missionFrame,
    fps,
    config: { damping: 14, stiffness: 60 },
  });
  const missionTranslateY = interpolate(missionProgress, [0, 1], [40, 0]);
  const missionOpacity = interpolate(missionProgress, [0, 1], [0, 1]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#1a1510",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Warm amber gradient overlay */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(212, 165, 116, 0.15) 0%, transparent 70%)",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          zIndex: 1,
        }}
      >
        {/* Logo */}
        {logoUrl && (
          <Img
            src={logoUrl}
            style={{
              width: 100,
              height: 100,
              objectFit: "contain",
              opacity: logoOpacity,
              marginBottom: 8,
            }}
          />
        )}

        {/* Company name */}
        <div
          style={{
            fontSize: 84,
            fontWeight: 700,
            color: "#d4a574",
            fontFamily: "Georgia, serif",
            transform: `scale(${nameScale})`,
            letterSpacing: "0.02em",
            textAlign: "center",
            padding: "0 60px",
            textShadow: "0 4px 20px rgba(212, 165, 116, 0.3)",
          }}
        >
          {companyName}
        </div>

        {/* Decorative line */}
        <div
          style={{
            width: lineWidth,
            height: 2,
            backgroundColor: "#d4a574",
            opacity: 0.5,
            borderRadius: 1,
          }}
        />

        {/* Mission statement */}
        <div
          style={{
            fontSize: 30,
            fontWeight: 400,
            color: "#f0e6d8",
            fontFamily: "Georgia, serif",
            transform: `translateY(${missionTranslateY}px)`,
            opacity: missionOpacity,
            textAlign: "center",
            padding: "0 120px",
            lineHeight: 1.5,
            maxWidth: "80%",
          }}
        >
          {mission}
        </div>
      </div>
    </AbsoluteFill>
  );
};

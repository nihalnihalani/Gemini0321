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

  // --- Cinematic slow-reveal animations (low stiffness = deliberate, premium) ---

  // Logo fades in first with gentle breathing pulse
  const logoOpacity = interpolate(frame, [10, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const logoPulse = interpolate(
    Math.sin(frame * 0.04),
    [-1, 1],
    [0.97, 1.03]
  );

  // Company name: slow, stately spring (low stiffness for weight)
  const nameDelay = 20;
  const nameFrame = Math.max(0, frame - nameDelay);
  const nameProgress = spring({
    frame: nameFrame,
    fps,
    config: { damping: 20, stiffness: 40, mass: 1.2 },
  });
  const nameTranslateY = interpolate(nameProgress, [0, 1], [30, 0]);
  const nameOpacity = interpolate(nameProgress, [0, 1], [0, 1]);

  // Decorative line expands slowly from center
  const lineWidth = interpolate(frame, [40, 80], [0, 280], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lineOpacity = interpolate(frame, [40, 60], [0, 0.6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Mission statement: delayed, deliberate reveal
  const missionDelay = 65;
  const missionFrame = Math.max(0, frame - missionDelay);
  const missionProgress = spring({
    frame: missionFrame,
    fps,
    config: { damping: 22, stiffness: 35, mass: 1.1 },
  });
  const missionTranslateY = interpolate(missionProgress, [0, 1], [50, 0]);
  const missionOpacity = interpolate(missionProgress, [0, 1], [0, 1]);

  // Slow ambient zoom for cinematic depth (Ken Burns on the whole scene)
  const ambientZoom = interpolate(frame, [0, 300], [1, 1.04], {
    extrapolateRight: "clamp",
  });

  // Film grain noise seed (pseudo-random per frame)
  const grainOpacity = interpolate(
    Math.sin(frame * 1.7) + Math.cos(frame * 2.3),
    [-2, 2],
    [0.03, 0.07]
  );

  // Vignette intensifies slightly over time
  const vignetteIntensity = interpolate(frame, [0, 60], [0.5, 0.75], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0f0c08",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Layered cinematic gradient: warm amber core with dark edges */}
      <AbsoluteFill
        style={{
          background: [
            "radial-gradient(ellipse at 50% 45%, rgba(212, 165, 116, 0.18) 0%, transparent 55%)",
            "radial-gradient(ellipse at 30% 60%, rgba(180, 120, 60, 0.08) 0%, transparent 50%)",
            "radial-gradient(ellipse at 70% 35%, rgba(200, 150, 90, 0.06) 0%, transparent 45%)",
          ].join(", "),
        }}
      />

      {/* Cinematic vignette overlay */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, ${vignetteIntensity}) 100%)`,
        }}
      />

      {/* Film grain texture overlay */}
      <AbsoluteFill
        style={{
          opacity: grainOpacity,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")",
          backgroundSize: "128px 128px",
          mixBlendMode: "overlay",
          pointerEvents: "none",
        }}
      />

      {/* Main content container with ambient zoom */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 28,
          zIndex: 1,
          transform: `scale(${ambientZoom})`,
        }}
      >
        {/* Logo with soft glow */}
        {logoUrl && (
          <div
            style={{
              opacity: logoOpacity,
              transform: `scale(${logoPulse})`,
              marginBottom: 12,
              filter: "drop-shadow(0 0 20px rgba(212, 165, 116, 0.25))",
            }}
          >
            <Img
              src={logoUrl}
              style={{
                width: 110,
                height: 110,
                objectFit: "contain",
              }}
            />
          </div>
        )}

        {/* Company name with cinematic weight */}
        <div
          style={{
            fontSize: 88,
            fontWeight: 700,
            color: "#e8c9a0",
            fontFamily: "Georgia, serif",
            transform: `translateY(${nameTranslateY}px)`,
            opacity: nameOpacity,
            letterSpacing: "0.04em",
            textAlign: "center",
            padding: "0 60px",
            textShadow: [
              "0 2px 8px rgba(0, 0, 0, 0.5)",
              "0 4px 24px rgba(212, 165, 116, 0.2)",
              "0 0 60px rgba(212, 165, 116, 0.1)",
            ].join(", "),
          }}
        >
          {companyName}
        </div>

        {/* Decorative line with warm glow */}
        <div
          style={{
            width: lineWidth,
            height: 1.5,
            background:
              "linear-gradient(90deg, transparent, #d4a574, transparent)",
            opacity: lineOpacity,
            borderRadius: 1,
            boxShadow: "0 0 12px rgba(212, 165, 116, 0.3)",
          }}
        />

        {/* Mission statement with elegant serif */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 400,
            color: "rgba(240, 230, 216, 0.9)",
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            transform: `translateY(${missionTranslateY}px)`,
            opacity: missionOpacity,
            textAlign: "center",
            padding: "0 140px",
            lineHeight: 1.65,
            maxWidth: "75%",
            letterSpacing: "0.01em",
            textShadow: "0 2px 12px rgba(0, 0, 0, 0.4)",
          }}
        >
          {mission}
        </div>
      </div>
    </AbsoluteFill>
  );
};

import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
} from "remotion";

interface VisionSceneProps {
  vision: string;
  logoUrl?: string;
  companyName: string;
}

export const VisionScene: React.FC<VisionSceneProps> = ({
  vision,
  logoUrl,
  companyName,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Split vision into words for emotional word-by-word reveal
  const words = vision.split(" ");
  // Allow more breathing room per word (slower reveal = more emotional weight)
  const totalRevealFrames = Math.min(durationInFrames * 0.55, 110);
  const framesPerWord = Math.max(3, Math.floor(totalRevealFrames / words.length));

  // After all words revealed, calculate logo entry
  const allWordsRevealedAt = words.length * framesPerWord + 15;
  const logoDelay = Math.max(allWordsRevealedAt + 10, durationInFrames * 0.6);

  // Logo and company name: spring reveal for gravitas
  const logoFrame = Math.max(0, frame - logoDelay);
  const logoProgress = spring({
    frame: logoFrame,
    fps,
    config: { damping: 22, stiffness: 30, mass: 1.2 },
  });
  const logoOpacity = interpolate(logoProgress, [0, 1], [0, 1]);
  const logoTranslateY = interpolate(logoProgress, [0, 1], [25, 0]);

  // Ambient light sweep across the scene (cinematic flare)
  const lightSweepX = interpolate(frame, [0, durationInFrames], [-20, 120], {
    extrapolateRight: "clamp",
  });

  // Slow ambient zoom for cinematic depth
  const ambientZoom = interpolate(frame, [0, durationInFrames], [1, 1.06], {
    extrapolateRight: "clamp",
  });

  // Gradient warmth intensifies as vision builds (crescendo)
  const gradientIntensity = interpolate(frame, [0, durationInFrames * 0.7], [0.6, 1], {
    extrapolateRight: "clamp",
  });

  // Film grain
  const grainOpacity = interpolate(
    Math.sin(frame * 1.7) + Math.cos(frame * 2.3),
    [-2, 2],
    [0.02, 0.06]
  );

  // Decorative line under vision text
  const lineDelay = allWordsRevealedAt - 5;
  const lineWidth = interpolate(frame, [lineDelay, lineDelay + 25], [0, 180], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0806",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Deep cinematic gradient that builds in warmth */}
      <AbsoluteFill
        style={{
          background: [
            `radial-gradient(ellipse at 50% 50%, rgba(184, 134, 11, ${0.2 * gradientIntensity}) 0%, transparent 60%)`,
            `radial-gradient(ellipse at 30% 70%, rgba(139, 69, 19, ${0.12 * gradientIntensity}) 0%, transparent 50%)`,
            `radial-gradient(ellipse at 70% 30%, rgba(180, 120, 50, ${0.08 * gradientIntensity}) 0%, transparent 45%)`,
            "linear-gradient(180deg, rgba(15, 12, 8, 0) 0%, rgba(15, 12, 8, 0.3) 100%)",
          ].join(", "),
        }}
      />

      {/* Cinematic light sweep / flare */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at ${lightSweepX}% 40%, rgba(255, 230, 180, 0.04) 0%, transparent 40%)`,
          pointerEvents: "none",
        }}
      />

      {/* Vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 35%, rgba(0, 0, 0, 0.7) 100%)",
        }}
      />

      {/* Film grain */}
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

      {/* Main content with ambient zoom */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 36,
          padding: "0 120px",
          zIndex: 1,
          transform: `scale(${ambientZoom})`,
        }}
      >
        {/* Vision statement with emotional word-by-word reveal */}
        <div
          style={{
            fontSize: 54,
            fontWeight: 700,
            color: "#ffffff",
            fontFamily: "Georgia, serif",
            textAlign: "center",
            lineHeight: 1.5,
            maxWidth: "85%",
            textShadow: [
              "0 2px 8px rgba(0, 0, 0, 0.5)",
              "0 4px 24px rgba(184, 134, 11, 0.15)",
            ].join(", "),
          }}
        >
          {words.map((word, index) => {
            const wordStart = index * framesPerWord + 12;

            // Each word springs in with vertical lift for emotional weight
            const wordFrame = Math.max(0, frame - wordStart);
            const wordSpring = spring({
              frame: wordFrame,
              fps,
              config: { damping: 16, stiffness: 50, mass: 0.9 },
            });

            const wordOpacity = interpolate(wordSpring, [0, 1], [0, 1]);
            const wordTranslateY = interpolate(wordSpring, [0, 1], [18, 0]);

            return (
              <span
                key={index}
                style={{
                  opacity: wordOpacity,
                  transform: `translateY(${wordTranslateY}px)`,
                  display: "inline-block",
                  marginRight: "0.3em",
                }}
              >
                {word}
              </span>
            );
          })}
        </div>

        {/* Decorative line that appears after text reveal */}
        <div
          style={{
            width: lineWidth,
            height: 1.5,
            background:
              "linear-gradient(90deg, transparent, rgba(212, 165, 116, 0.6), transparent)",
            borderRadius: 1,
            boxShadow: "0 0 12px rgba(212, 165, 116, 0.2)",
          }}
        />

        {/* Logo and company name at bottom */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
            opacity: logoOpacity,
            transform: `translateY(${logoTranslateY}px)`,
            marginTop: 8,
          }}
        >
          {logoUrl && (
            <div
              style={{
                filter: "drop-shadow(0 0 16px rgba(212, 165, 116, 0.2))",
              }}
            >
              <Img
                src={logoUrl}
                style={{
                  width: 80,
                  height: 80,
                  objectFit: "contain",
                }}
              />
            </div>
          )}
          <div
            style={{
              fontSize: 26,
              fontWeight: 600,
              color: "rgba(232, 201, 160, 0.85)",
              fontFamily: "Georgia, serif",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              textShadow: "0 2px 12px rgba(0, 0, 0, 0.4)",
            }}
          >
            {companyName}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
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
  const { fps } = useVideoConfig();

  // Split vision into words for word-by-word reveal
  const words = vision.split(" ");
  const framesPerWord = Math.max(2, Math.floor(80 / words.length));

  // Logo and company name fade in at the bottom
  const logoDelay = 90;
  const logoOpacity = interpolate(
    frame,
    [logoDelay, logoDelay + 20],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #b8860b 0%, #8b4513 50%, #6b3410 100%)",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Subtle light overlay */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 30% 30%, rgba(255, 255, 255, 0.1) 0%, transparent 60%)",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
          padding: "0 120px",
          zIndex: 1,
        }}
      >
        {/* Vision statement with word-by-word reveal */}
        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            color: "#ffffff",
            fontFamily: "Georgia, serif",
            textAlign: "center",
            lineHeight: 1.4,
            maxWidth: "90%",
            textShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
          }}
        >
          {words.map((word, index) => {
            const wordStart = index * framesPerWord + 10;
            const wordOpacity = interpolate(
              frame,
              [wordStart, wordStart + 8],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );

            return (
              <span key={index} style={{ opacity: wordOpacity }}>
                {word}{" "}
              </span>
            );
          })}
        </div>

        {/* Logo and company name at bottom */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            opacity: logoOpacity,
            marginTop: 20,
          }}
        >
          {logoUrl && (
            <Img
              src={logoUrl}
              style={{
                width: 80,
                height: 80,
                objectFit: "contain",
              }}
            />
          )}
          <div
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: "rgba(255, 255, 255, 0.85)",
              fontFamily: "Georgia, serif",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            {companyName}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

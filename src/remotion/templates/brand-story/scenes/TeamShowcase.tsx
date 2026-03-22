import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Img,
} from "remotion";

interface TeamShowcaseProps {
  teamPhotos: string[];
}

/**
 * Ken Burns direction presets - each photo gets a different slow pan/zoom
 * to create visual variety and documentary-style intimacy.
 */
const KEN_BURNS_PRESETS = [
  { startScale: 1.0, endScale: 1.15, startX: 0, endX: -3, startY: 0, endY: -2 },
  { startScale: 1.1, endScale: 1.0, startX: -3, endX: 2, startY: -1, endY: 1 },
  { startScale: 1.0, endScale: 1.12, startX: 2, endX: -1, startY: 1, endY: -1 },
  { startScale: 1.08, endScale: 1.0, startX: -2, endX: 3, startY: -2, endY: 0 },
  { startScale: 1.0, endScale: 1.1, startX: 1, endX: -2, startY: -1, endY: 2 },
  { startScale: 1.12, endScale: 1.02, startX: -1, endX: 1, startY: 2, endY: -1 },
];

export const TeamShowcase: React.FC<TeamShowcaseProps> = ({ teamPhotos }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Show up to 6 photos
  const photos = teamPhotos.slice(0, 6);

  // Determine grid layout: 2x2 for 4 or fewer, 3-across for more
  const columns = photos.length > 4 ? 3 : 2;

  // Title: slow fade + gentle slide
  const titleProgress = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 40 },
  });
  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1]);
  const titleTranslateY = interpolate(titleProgress, [0, 1], [15, 0]);

  // Subtitle line expands
  const subtitleLineWidth = interpolate(frame, [15, 50], [0, 120], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Film grain
  const grainOpacity = interpolate(
    Math.sin(frame * 1.7) + Math.cos(frame * 2.3),
    [-2, 2],
    [0.02, 0.05]
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0f0c08",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Layered warm ambience */}
      <AbsoluteFill
        style={{
          background: [
            "radial-gradient(ellipse at 40% 40%, rgba(212, 165, 116, 0.1) 0%, transparent 50%)",
            "radial-gradient(ellipse at 65% 65%, rgba(180, 130, 70, 0.06) 0%, transparent 45%)",
          ].join(", "),
        }}
      />

      {/* Vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 45%, rgba(0, 0, 0, 0.65) 100%)",
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

      {/* Title section */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          zIndex: 2,
        }}
      >
        <div
          style={{
            fontSize: 42,
            fontWeight: 700,
            color: "#e8c9a0",
            fontFamily: "Georgia, serif",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            opacity: titleOpacity,
            transform: `translateY(${titleTranslateY}px)`,
            textShadow: "0 2px 16px rgba(212, 165, 116, 0.2)",
          }}
        >
          Our Team
        </div>
        <div
          style={{
            width: subtitleLineWidth,
            height: 1.5,
            background:
              "linear-gradient(90deg, transparent, #d4a574, transparent)",
            opacity: 0.5,
          }}
        />
      </div>

      {/* Photo grid */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: 28,
          padding: "140px 80px 60px",
          maxWidth: 1200,
          zIndex: 1,
        }}
      >
        {photos.map((photo, index) => {
          // Staggered cascade entry (top-left to bottom-right feel)
          const row = Math.floor(index / columns);
          const col = index % columns;
          const entryDelay = (row + col) * 12 + 15;
          const entryFrame = Math.max(0, frame - entryDelay);

          // Slower, more deliberate spring for photo reveal
          const revealProgress = spring({
            frame: entryFrame,
            fps,
            config: { damping: 18, stiffness: 40, mass: 1.1 },
          });

          const opacity = interpolate(revealProgress, [0, 1], [0, 1]);
          const containerScale = interpolate(
            revealProgress,
            [0, 1],
            [0.92, 1]
          );

          // Ken Burns: slow continuous zoom + pan on each photo
          const kb = KEN_BURNS_PRESETS[index % KEN_BURNS_PRESETS.length];
          const kbProgress = interpolate(
            frame,
            [0, durationInFrames],
            [0, 1],
            { extrapolateRight: "clamp" }
          );
          const kbScale = interpolate(
            kbProgress,
            [0, 1],
            [kb.startScale, kb.endScale]
          );
          const kbX = interpolate(
            kbProgress,
            [0, 1],
            [kb.startX, kb.endX]
          );
          const kbY = interpolate(
            kbProgress,
            [0, 1],
            [kb.startY, kb.endY]
          );

          const photoSize = columns === 3 ? 280 : 340;

          return (
            <div
              key={index}
              style={{
                width: photoSize,
                height: photoSize,
                borderRadius: 12,
                overflow: "hidden",
                opacity,
                transform: `scale(${containerScale})`,
                boxShadow: [
                  "0 8px 32px rgba(0, 0, 0, 0.5)",
                  "0 2px 8px rgba(0, 0, 0, 0.3)",
                ].join(", "),
                border: "2px solid rgba(212, 165, 116, 0.2)",
                position: "relative",
              }}
            >
              {/* Photo with Ken Burns pan/zoom */}
              <Img
                src={photo}
                style={{
                  width: "120%",
                  height: "120%",
                  objectFit: "cover",
                  position: "absolute",
                  top: "-10%",
                  left: "-10%",
                  transform: `scale(${kbScale}) translate(${kbX}%, ${kbY}%)`,
                }}
              />

              {/* Warm sepia-tone overlay for cohesive look */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(180deg, transparent 50%, rgba(15, 12, 8, 0.4) 100%)",
                  mixBlendMode: "multiply",
                  pointerEvents: "none",
                }}
              />

              {/* Subtle warm color grading overlay */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundColor: "rgba(212, 165, 116, 0.06)",
                  mixBlendMode: "overlay",
                  pointerEvents: "none",
                }}
              />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

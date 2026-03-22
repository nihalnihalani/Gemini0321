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

export const TeamShowcase: React.FC<TeamShowcaseProps> = ({ teamPhotos }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Show up to 6 photos
  const photos = teamPhotos.slice(0, 6);

  // Determine grid layout: 2x2 for 4 or fewer, 3-across for more
  const columns = photos.length > 4 ? 3 : 2;

  // Title fade in
  const titleOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#2a1f15",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Warm overlay */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(212, 165, 116, 0.1) 0%, transparent 70%)",
        }}
      />

      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 44,
          fontWeight: 700,
          color: "#f0e6d8",
          fontFamily: "Georgia, serif",
          opacity: titleOpacity,
        }}
      >
        Our Team
      </div>

      {/* Photo grid */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: 30,
          padding: "120px 80px 60px",
          maxWidth: 1200,
          zIndex: 1,
        }}
      >
        {photos.map((photo, index) => {
          const entryDelay = index * 15 + 10;
          const entryFrame = Math.max(0, frame - entryDelay);

          const scaleProgress = spring({
            frame: entryFrame,
            fps,
            config: { damping: 12, stiffness: 80 },
          });

          const opacity = interpolate(scaleProgress, [0, 1], [0, 1]);
          const scale = interpolate(scaleProgress, [0, 1], [1.1, 1]);

          const photoSize = columns === 3 ? 280 : 340;

          return (
            <div
              key={index}
              style={{
                width: photoSize,
                height: photoSize,
                borderRadius: 16,
                overflow: "hidden",
                opacity,
                transform: `scale(${scale})`,
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
                border: "3px solid rgba(212, 165, 116, 0.3)",
              }}
            >
              <Img
                src={photo}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

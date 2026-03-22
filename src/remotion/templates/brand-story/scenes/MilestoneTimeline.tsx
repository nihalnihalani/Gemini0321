import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";

interface MilestoneTimelineProps {
  milestones: { year: string; event: string }[];
}

// Spacing between milestone items (px)
const ITEM_SPACING = 110;

export const MilestoneTimeline: React.FC<MilestoneTimelineProps> = ({
  milestones,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Limit to 6 milestones
  const displayMilestones = milestones.slice(0, 6);

  // Title fade + slide up
  const titleProgress = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 40 },
  });
  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1]);
  const titleTranslateY = interpolate(titleProgress, [0, 1], [20, 0]);

  // Continuous vertical trunk line that draws down as milestones appear
  const lastMilestoneDelay =
    (displayMilestones.length - 1) * 25 + 20;
  const trunkLineHeight = interpolate(
    frame,
    [15, lastMilestoneDelay + 30],
    [0, (displayMilestones.length - 1) * ITEM_SPACING + 10],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  // Film grain
  const grainOpacity = interpolate(
    Math.sin(frame * 1.7) + Math.cos(frame * 2.3),
    [-2, 2],
    [0.02, 0.05]
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#12100d",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Warm ambient gradient */}
      <AbsoluteFill
        style={{
          background: [
            "radial-gradient(ellipse at 25% 30%, rgba(180, 130, 70, 0.1) 0%, transparent 55%)",
            "radial-gradient(ellipse at 75% 70%, rgba(160, 110, 60, 0.06) 0%, transparent 50%)",
          ].join(", "),
        }}
      />

      {/* Vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 50%, rgba(0, 0, 0, 0.6) 100%)",
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

      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 70,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 42,
          fontWeight: 700,
          color: "#e8c9a0",
          fontFamily: "Georgia, serif",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          opacity: titleOpacity,
          transform: `translateY(${titleTranslateY}px)`,
          textShadow: "0 2px 16px rgba(212, 165, 116, 0.2)",
          zIndex: 1,
        }}
      >
        Our Journey
      </div>

      {/* Timeline container */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          position: "relative",
          marginLeft: 60,
          marginTop: 60,
          zIndex: 1,
        }}
      >
        {/* Continuous trunk line (draws down over time) */}
        <div
          style={{
            position: "absolute",
            left: 10,
            top: 14,
            width: 2,
            height: trunkLineHeight,
            background:
              "linear-gradient(180deg, #d4a574, rgba(196, 149, 106, 0.3))",
            borderRadius: 1,
            boxShadow: "0 0 8px rgba(212, 165, 116, 0.15)",
          }}
        />

        {displayMilestones.map((milestone, index) => {
          const entryDelay = index * 25 + 20;
          const entryFrame = Math.max(0, frame - entryDelay);

          // Slower, more deliberate spring for each milestone
          const slideProgress = spring({
            frame: entryFrame,
            fps,
            config: { damping: 18, stiffness: 45, mass: 1.1 },
          });

          const translateX = interpolate(slideProgress, [0, 1], [-40, 0]);
          const opacity = interpolate(slideProgress, [0, 1], [0, 1]);

          // Dot glow intensifies as it appears
          const dotGlow = interpolate(slideProgress, [0, 1], [0, 1]);

          return (
            <div
              key={index}
              style={{
                position: "relative",
                height: ITEM_SPACING,
              }}
            >
              {/* Milestone dot with glow ring */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 4,
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  backgroundColor: "#d4a574",
                  border: "3px solid #1a1510",
                  boxShadow: [
                    `0 0 0 2px rgba(212, 165, 116, ${dotGlow * 0.5})`,
                    `0 0 ${12 * dotGlow}px rgba(212, 165, 116, ${dotGlow * 0.3})`,
                  ].join(", "),
                  opacity,
                  transform: `scale(${slideProgress})`,
                }}
              />

              {/* Milestone content */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  marginLeft: 55,
                  transform: `translateX(${translateX}px)`,
                  opacity,
                }}
              >
                {/* Year badge */}
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "#d4a574",
                    fontFamily: "Georgia, serif",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    marginBottom: 6,
                    textShadow: "0 0 10px rgba(212, 165, 116, 0.2)",
                  }}
                >
                  {milestone.year}
                </div>

                {/* Event description */}
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 400,
                    color: "rgba(240, 230, 216, 0.88)",
                    fontFamily: "Georgia, serif",
                    lineHeight: 1.45,
                    maxWidth: 750,
                    textShadow: "0 1px 8px rgba(0, 0, 0, 0.3)",
                  }}
                >
                  {milestone.event}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

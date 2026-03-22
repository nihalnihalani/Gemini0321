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

const FRAMES_PER_MILESTONE = 60;

export const MilestoneTimeline: React.FC<MilestoneTimelineProps> = ({
  milestones,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Limit to 6 milestones
  const displayMilestones = milestones.slice(0, 6);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#faf5ee",
        justifyContent: "center",
        alignItems: "center",
        padding: 80,
      }}
    >
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
          color: "#3d2e1f",
          fontFamily: "Georgia, serif",
          opacity: interpolate(frame, [0, 15], [0, 1], {
            extrapolateRight: "clamp",
          }),
        }}
      >
        Our Journey
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          position: "relative",
          marginLeft: 100,
          marginTop: 40,
        }}
      >
        {displayMilestones.map((milestone, index) => {
          const entryDelay = index * 20 + 15;
          const entryFrame = Math.max(0, frame - entryDelay);

          const slideProgress = spring({
            frame: entryFrame,
            fps,
            config: { damping: 14, stiffness: 80 },
          });

          const translateX = interpolate(slideProgress, [0, 1], [-60, 0]);
          const opacity = interpolate(slideProgress, [0, 1], [0, 1]);

          // Connecting line grows down from previous milestone
          const lineHeight =
            index > 0
              ? interpolate(frame, [entryDelay - 10, entryDelay + 5], [0, 60], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                })
              : 0;

          return (
            <div key={index} style={{ position: "relative" }}>
              {/* Connecting line from above */}
              {index > 0 && (
                <div
                  style={{
                    position: "absolute",
                    left: 10,
                    top: -lineHeight,
                    width: 3,
                    height: lineHeight,
                    backgroundColor: "#c4956a",
                    borderRadius: 2,
                  }}
                />
              )}

              {/* Milestone dot */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 8,
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  backgroundColor: "#d4a574",
                  border: "3px solid #faf5ee",
                  boxShadow: "0 0 0 3px #c4956a",
                  opacity,
                  transform: `scale(${slideProgress})`,
                }}
              />

              {/* Milestone content */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  marginLeft: 50,
                  marginBottom: 38,
                  transform: `translateX(${translateX}px)`,
                  opacity,
                }}
              >
                {/* Year */}
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 800,
                    color: "#8b5e3c",
                    fontFamily: "Georgia, serif",
                    lineHeight: 1,
                  }}
                >
                  {milestone.year}
                </div>

                {/* Event description */}
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 400,
                    color: "#5a4633",
                    fontFamily: "Georgia, serif",
                    lineHeight: 1.4,
                    maxWidth: 700,
                    marginTop: 6,
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

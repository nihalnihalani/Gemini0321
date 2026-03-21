import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

interface TransitionEffectProps {
  type: "fade" | "dissolve" | "wipe";
  durationInFrames: number;
  direction: "in" | "out";
}

export const TransitionEffect: React.FC<TransitionEffectProps> = ({
  type,
  durationInFrames,
  direction,
}) => {
  const frame = useCurrentFrame();

  if (type === "fade") {
    const opacity =
      direction === "in"
        ? interpolate(frame, [0, durationInFrames], [1, 0], {
            extrapolateRight: "clamp",
          })
        : interpolate(
            frame,
            [0, durationInFrames],
            [0, 1],
            { extrapolateLeft: "clamp" }
          );

    return (
      <AbsoluteFill
        style={{
          backgroundColor: "black",
          opacity,
        }}
      />
    );
  }

  if (type === "dissolve") {
    const opacity =
      direction === "in"
        ? interpolate(frame, [0, durationInFrames], [0.7, 0], {
            extrapolateRight: "clamp",
          })
        : interpolate(
            frame,
            [0, durationInFrames],
            [0, 0.7],
            { extrapolateLeft: "clamp" }
          );

    return (
      <AbsoluteFill
        style={{
          backgroundColor: "black",
          opacity,
        }}
      />
    );
  }

  if (type === "wipe") {
    const translateX =
      direction === "in"
        ? interpolate(frame, [0, durationInFrames], [0, -100], {
            extrapolateRight: "clamp",
          })
        : interpolate(
            frame,
            [0, durationInFrames],
            [-100, 0],
            { extrapolateLeft: "clamp" }
          );

    return (
      <AbsoluteFill
        style={{
          backgroundColor: "black",
          transform: `translateX(${translateX}%)`,
        }}
      />
    );
  }

  return null;
};

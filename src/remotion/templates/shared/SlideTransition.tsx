import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

interface SlideTransitionProps {
  type: "slide" | "zoom" | "fade" | "wipe";
  direction?: "left" | "right" | "up" | "down";
  durationInFrames: number;
  color?: string;
}

export const SlideTransition: React.FC<SlideTransitionProps> = ({
  type,
  direction = "left",
  durationInFrames,
  color = "#000000",
}) => {
  const frame = useCurrentFrame();

  if (type === "fade") {
    const opacity = interpolate(
      frame,
      [0, durationInFrames / 2, durationInFrames],
      [0, 1, 0],
      { extrapolateRight: "clamp" }
    );

    return <AbsoluteFill style={{ backgroundColor: color, opacity }} />;
  }

  if (type === "zoom") {
    const scale = interpolate(
      frame,
      [0, durationInFrames / 2, durationInFrames],
      [0, 1.2, 0],
      { extrapolateRight: "clamp" }
    );
    const opacity = interpolate(
      frame,
      [0, durationInFrames / 2, durationInFrames],
      [0, 1, 0],
      { extrapolateRight: "clamp" }
    );

    return (
      <AbsoluteFill
        style={{
          backgroundColor: color,
          transform: `scale(${scale})`,
          opacity,
          borderRadius: "50%",
        }}
      />
    );
  }

  if (type === "wipe") {
    const progress = interpolate(frame, [0, durationInFrames], [0, 200], {
      extrapolateRight: "clamp",
    });

    const gradientDirection = (() => {
      switch (direction) {
        case "left":
          return "to left";
        case "right":
          return "to right";
        case "up":
          return "to top";
        case "down":
          return "to bottom";
      }
    })();

    return (
      <AbsoluteFill
        style={{
          background: `linear-gradient(${gradientDirection}, ${color} ${progress - 100}%, transparent ${progress}%)`,
        }}
      />
    );
  }

  // slide: enters from direction, covers screen, then exits
  const halfDuration = durationInFrames / 2;
  let translateValue: string;

  if (frame <= halfDuration) {
    // Entering
    const progress = interpolate(frame, [0, halfDuration], [0, 100], {
      extrapolateRight: "clamp",
    });
    switch (direction) {
      case "left":
        translateValue = `translateX(${-100 + progress}%)`;
        break;
      case "right":
        translateValue = `translateX(${100 - progress}%)`;
        break;
      case "up":
        translateValue = `translateY(${-100 + progress}%)`;
        break;
      case "down":
        translateValue = `translateY(${100 - progress}%)`;
        break;
    }
  } else {
    // Exiting
    const progress = interpolate(frame, [halfDuration, durationInFrames], [0, 100], {
      extrapolateRight: "clamp",
    });
    switch (direction) {
      case "left":
        translateValue = `translateX(${-progress}%)`;
        break;
      case "right":
        translateValue = `translateX(${progress}%)`;
        break;
      case "up":
        translateValue = `translateY(${-progress}%)`;
        break;
      case "down":
        translateValue = `translateY(${progress}%)`;
        break;
    }
  }

  return (
    <AbsoluteFill
      style={{
        backgroundColor: color,
        transform: translateValue,
      }}
    />
  );
};

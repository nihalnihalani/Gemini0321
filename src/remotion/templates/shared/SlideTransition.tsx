import React, { useMemo } from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";

interface SlideTransitionProps {
  type: "slide" | "zoom" | "fade" | "wipe";
  direction?: "left" | "right" | "up" | "down";
  durationInFrames: number;
  color?: string;
}

/**
 * SlideTransition component with premium easing curves.
 *
 * Best practices applied:
 * - Uses Easing.bezier() for cinematic transition curves
 * - spring() for physics-based slide animations (natural deceleration)
 * - Memoized static styles to avoid per-frame recalculation
 * - Smooth easeInOut for symmetrical transitions (fade, zoom)
 * - Easing.out(Easing.cubic) for wipe reveals (fast start, soft finish)
 */
export const SlideTransition: React.FC<SlideTransitionProps> = ({
  type,
  direction = "left",
  durationInFrames,
  color = "#000000",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const halfDuration = durationInFrames / 2;

  // Memoize gradient direction string to avoid recalculation per frame
  const gradientDirection = useMemo(() => {
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
  }, [direction]);

  if (type === "fade") {
    // Cinematic fade: ease-in to peak, ease-out from peak
    // Uses a bezier curve that feels like a natural light change
    const opacity = interpolate(
      frame,
      [0, halfDuration, durationInFrames],
      [0, 1, 0],
      {
        extrapolateRight: "clamp",
        easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
      }
    );

    return <AbsoluteFill style={{ backgroundColor: color, opacity }} />;
  }

  if (type === "zoom") {
    // Zoom uses spring physics for organic scale-up, then eased scale-down
    const isFirstHalf = frame <= halfDuration;

    let scale: number;
    let opacity: number;

    if (isFirstHalf) {
      // Spring-driven zoom in for organic acceleration
      const springVal = spring({
        frame,
        fps,
        config: {
          damping: 20,
          stiffness: 120,
          mass: 0.8,
          overshootClamping: true,
        },
        durationInFrames: halfDuration,
      });
      scale = interpolate(springVal, [0, 1], [0, 1.15]);
      opacity = interpolate(springVal, [0, 1], [0, 1]);
    } else {
      // Eased zoom out
      const exitProgress = interpolate(
        frame,
        [halfDuration, durationInFrames],
        [0, 1],
        {
          extrapolateRight: "clamp",
          easing: Easing.in(Easing.cubic),
        }
      );
      scale = interpolate(exitProgress, [0, 1], [1.15, 0]);
      opacity = interpolate(exitProgress, [0, 1], [1, 0]);
    }

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
    // Wipe uses easeOut for a fast reveal that decelerates naturally
    const progress = interpolate(frame, [0, durationInFrames], [0, 200], {
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });

    return (
      <AbsoluteFill
        style={{
          background: `linear-gradient(${gradientDirection}, ${color} ${progress - 100}%, transparent ${progress}%)`,
        }}
      />
    );
  }

  // Slide: uses spring physics for natural enter/exit with momentum
  let translateValue: string;

  if (frame <= halfDuration) {
    // Entering: spring-driven for organic deceleration
    const enterSpring = spring({
      frame,
      fps,
      config: {
        damping: 22,
        stiffness: 100,
        mass: 0.9,
        overshootClamping: true,
      },
      durationInFrames: halfDuration,
    });
    const progress = interpolate(enterSpring, [0, 1], [0, 100]);

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
    // Exiting: eased acceleration for clean departure
    const exitProgress = interpolate(
      frame,
      [halfDuration, durationInFrames],
      [0, 100],
      {
        extrapolateRight: "clamp",
        easing: Easing.in(Easing.cubic),
      }
    );

    switch (direction) {
      case "left":
        translateValue = `translateX(${-exitProgress}%)`;
        break;
      case "right":
        translateValue = `translateX(${exitProgress}%)`;
        break;
      case "up":
        translateValue = `translateY(${-exitProgress}%)`;
        break;
      case "down":
        translateValue = `translateY(${exitProgress}%)`;
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

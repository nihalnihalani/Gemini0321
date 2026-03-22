import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface StatsCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  fontSize?: number;
  color?: string;
}

export const StatsCounter: React.FC<StatsCounterProps> = ({
  value,
  prefix = "",
  suffix = "",
  duration = 60,
  fontSize = 72,
  color = "#ffffff",
}) => {
  const frame = useCurrentFrame();

  const progress = interpolate(frame, [0, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Ease-out cubic for a satisfying deceleration
  const eased = 1 - Math.pow(1 - progress, 3);
  const currentValue = Math.round(eased * value);

  const opacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  const scale = interpolate(frame, [0, 10], [0.8, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <span
        style={{
          fontSize,
          fontWeight: 800,
          color,
          fontFamily: "sans-serif",
          fontVariantNumeric: "tabular-nums",
          textShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
        }}
      >
        {prefix}
        {currentValue.toLocaleString()}
        {suffix}
      </span>
    </div>
  );
};

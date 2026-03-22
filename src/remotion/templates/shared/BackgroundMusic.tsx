import React, { useCallback } from "react";
import { Audio, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

interface BackgroundMusicProps {
  src: string;
  volume?: number;
  fadeInFrames?: number;
  fadeOutFrames?: number;
  startFrom?: number;
}

export const BackgroundMusic: React.FC<BackgroundMusicProps> = ({
  src,
  volume = 0.3,
  fadeInFrames = 30,
  fadeOutFrames = 30,
  startFrom = 0,
}) => {
  const { durationInFrames } = useVideoConfig();

  const volumeCallback = useCallback(
    (f: number) => {
      const fadeIn = interpolate(f, [0, fadeInFrames], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });

      const fadeOut = interpolate(
        f,
        [durationInFrames - fadeOutFrames, durationInFrames],
        [1, 0],
        {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }
      );

      return Math.min(fadeIn, fadeOut) * volume;
    },
    [fadeInFrames, fadeOutFrames, durationInFrames, volume]
  );

  return <Audio src={src} volume={volumeCallback} startFrom={startFrom} />;
};

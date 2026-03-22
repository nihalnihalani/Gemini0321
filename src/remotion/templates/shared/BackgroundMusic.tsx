import React, { useCallback } from "react";
import { Audio, useVideoConfig, interpolate, Easing } from "remotion";

interface BackgroundMusicProps {
  src: string;
  /** Base volume level (0-1). Default: 0.3 */
  volume?: number;
  /** Number of frames for the fade-in. Default: 45 (~1.5s at 30fps) */
  fadeInFrames?: number;
  /** Number of frames for the fade-out. Default: 45 (~1.5s at 30fps) */
  fadeOutFrames?: number;
  /** Frame offset to start playing from in the audio file */
  startFrom?: number;
  /**
   * Narration ducking configuration.
   * When narration is active, music volume ducks to `duckLevel`.
   * Each entry is a [startFrame, endFrame] tuple for when narration is playing.
   */
  narrationRanges?: [number, number][];
  /** Volume level during narration ducking (0-1). Default: 0.12 */
  duckLevel?: number;
  /** Number of frames to transition into/out of ducking. Default: 10 */
  duckTransitionFrames?: number;
}

/**
 * BackgroundMusic component with professional volume automation.
 *
 * Best practices applied:
 * - Uses volume callback function (recommended by Remotion for Studio curve
 *   visualization and better performance vs static values)
 * - Smooth fade-in/out with Easing.inOut(Easing.cubic) for premium feel
 * - Narration ducking support: automatically lowers music when voice is active
 * - All volume transitions use eased curves to avoid abrupt changes
 */
export const BackgroundMusic: React.FC<BackgroundMusicProps> = ({
  src,
  volume = 0.3,
  fadeInFrames = 45,
  fadeOutFrames = 45,
  startFrom = 0,
  narrationRanges = [],
  duckLevel = 0.12,
  duckTransitionFrames = 10,
}) => {
  const { durationInFrames } = useVideoConfig();

  const volumeCallback = useCallback(
    (f: number) => {
      // 1. Fade-in envelope with smooth easing
      const fadeIn = interpolate(f, [0, fadeInFrames], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.inOut(Easing.cubic),
      });

      // 2. Fade-out envelope with smooth easing
      const fadeOut = interpolate(
        f,
        [durationInFrames - fadeOutFrames, durationInFrames],
        [1, 0],
        {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.inOut(Easing.cubic),
        }
      );

      // 3. Combine fade-in and fade-out into a single envelope
      const envelope = Math.min(fadeIn, fadeOut);

      // 4. Calculate narration ducking multiplier
      let duckMultiplier = 1;

      if (narrationRanges.length > 0) {
        for (const [start, end] of narrationRanges) {
          // Transition into duck (smooth ramp down before narration)
          const duckIn = interpolate(
            f,
            [start - duckTransitionFrames, start],
            [1, duckLevel / volume],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.inOut(Easing.quad),
            }
          );

          // Transition out of duck (smooth ramp up after narration)
          const duckOut = interpolate(
            f,
            [end, end + duckTransitionFrames],
            [duckLevel / volume, 1],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.inOut(Easing.quad),
            }
          );

          // During narration, use the lower of duck-in and duck-out
          if (f >= start - duckTransitionFrames && f <= end + duckTransitionFrames) {
            duckMultiplier = Math.min(duckMultiplier, Math.min(duckIn, duckOut));
          }
        }
      }

      // 5. Final volume = base volume * envelope * ducking
      return Math.max(0, volume * envelope * duckMultiplier);
    },
    [
      fadeInFrames,
      fadeOutFrames,
      durationInFrames,
      volume,
      narrationRanges,
      duckLevel,
      duckTransitionFrames,
    ]
  );

  return <Audio src={src} volume={volumeCallback} startFrom={startFrom} />;
};

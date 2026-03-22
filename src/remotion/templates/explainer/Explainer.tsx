import React from "react";
import { AbsoluteFill, Series, Sequence, interpolate, useCurrentFrame } from "remotion";
import { z } from "zod";
import { ExplainerSchema } from "./schema";
import { TitleIntro } from "./scenes/TitleIntro";
import { StepScene } from "./scenes/StepScene";
import { SummaryScene } from "./scenes/SummaryScene";
import { BackgroundMusic } from "../shared";

const FPS = 30;

// Scene durations in frames
// Research: hold each concept long enough for comprehension.
// 7s intro gives time for title + context without overstaying.
// 12s per step balances depth vs. attention span.
// 10s summary allows staggered takeaway review + conclusion.
const INTRO_DURATION = 7 * FPS; // 7s
const STEP_DURATION = 12 * FPS; // 12s per step
const SUMMARY_DURATION = 10 * FPS; // 10s (slightly longer for celebration + recap)

/**
 * Brief cross-fade transition overlay between scenes.
 * Smooths scene boundaries so content flows rather than cuts.
 */
const SceneTransition: React.FC<{ durationInFrames: number }> = ({
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, durationInFrames / 2, durationInFrames],
    [0, 0.6, 0],
    { extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0f0f2e",
        opacity,
        pointerEvents: "none",
      }}
    />
  );
};

const TRANSITION_FRAMES = 8; // ~0.27s gentle crossfade

export const Explainer: React.FC<z.infer<typeof ExplainerSchema>> = ({
  title,
  steps,
  conclusion,
  introNarration,
  summaryNarration,
  narrationUrls,
  musicUrl,
}) => {
  const stepTitles = steps.map((s) => s.title);

  // Lower background music when narration is present
  const hasNarration =
    narrationUrls && Object.keys(narrationUrls).length > 0;
  const musicVolume = hasNarration ? 0.04 : 0.12;

  // Calculate transition offsets for each scene boundary
  // Transitions overlap scene boundaries for a smooth feel
  const introEnd = INTRO_DURATION;
  const transitionOffsets: number[] = [];
  let runningOffset = introEnd;
  for (let i = 0; i < steps.length; i++) {
    transitionOffsets.push(runningOffset);
    runningOffset += STEP_DURATION;
  }
  transitionOffsets.push(runningOffset); // before summary

  return (
    <AbsoluteFill style={{ backgroundColor: "#0f0f2e" }}>
      <Series>
        {/* Title intro */}
        <Series.Sequence durationInFrames={INTRO_DURATION}>
          <TitleIntro
            title={title}
            stepCount={steps.length}
            narrationUrl={narrationUrls?.["0"]}
            introNarration={introNarration}
          />
        </Series.Sequence>

        {/* One scene per step */}
        {steps.map((step, index) => (
          <Series.Sequence key={index} durationInFrames={STEP_DURATION}>
            <StepScene
              stepNumber={index + 1}
              title={step.title}
              description={step.description}
              iconUrl={step.iconUrl}
              totalSteps={steps.length}
              narrationUrl={narrationUrls?.[String(index + 1)]}
            />
          </Series.Sequence>
        ))}

        {/* Summary / conclusion */}
        <Series.Sequence durationInFrames={SUMMARY_DURATION}>
          <SummaryScene
            conclusion={conclusion}
            stepTitles={stepTitles}
            narrationUrl={narrationUrls?.[String(steps.length + 1)]}
            summaryNarration={summaryNarration}
          />
        </Series.Sequence>
      </Series>

      {/* Cross-fade transitions at scene boundaries */}
      {transitionOffsets.map((offset, i) => (
        <Sequence key={`transition-${i}`} from={offset - 4} durationInFrames={TRANSITION_FRAMES}>
          <SceneTransition durationInFrames={TRANSITION_FRAMES} />
        </Sequence>
      ))}

      {/* Background music — very subtle under narration */}
      {musicUrl && (
        <BackgroundMusic
          src={musicUrl}
          volume={musicVolume}
          fadeInFrames={45}
          fadeOutFrames={60}
        />
      )}
    </AbsoluteFill>
  );
};

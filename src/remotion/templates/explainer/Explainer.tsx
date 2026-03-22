import React from "react";
import { AbsoluteFill, Series } from "remotion";
import { z } from "zod";
import { ExplainerSchema } from "./schema";
import { TitleIntro } from "./scenes/TitleIntro";
import { StepScene } from "./scenes/StepScene";
import { SummaryScene } from "./scenes/SummaryScene";
import { BackgroundMusic } from "../shared";

const FPS = 30;

// Scene durations in frames (extended for narration)
const INTRO_DURATION = 7 * FPS; // 7s
const STEP_DURATION = 12 * FPS; // 12s per step
const SUMMARY_DURATION = 9 * FPS; // 9s

export const Explainer: React.FC<z.infer<typeof ExplainerSchema>> = ({
  title,
  steps,
  conclusion,
  introNarration,
  summaryNarration,
  narrationUrls,
  sfxUrls,
  musicUrl,
}) => {
  const stepTitles = steps.map((s) => s.title);

  // Lower background music when narration is present
  const hasNarration =
    narrationUrls && Object.keys(narrationUrls).length > 0;
  const musicVolume = hasNarration ? 0.06 : 0.15;

  return (
    <AbsoluteFill style={{ backgroundColor: "#1a1a4e" }}>
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
              sfxUrl={sfxUrls?.[String(index + 1)]}
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

      {/* Background music across entire composition */}
      {musicUrl && (
        <BackgroundMusic
          src={musicUrl}
          volume={musicVolume}
          fadeInFrames={30}
          fadeOutFrames={45}
        />
      )}
    </AbsoluteFill>
  );
};

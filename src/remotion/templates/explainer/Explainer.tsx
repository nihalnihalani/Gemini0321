import React from "react";
import { AbsoluteFill, Series } from "remotion";
import { z } from "zod";
import { ExplainerSchema } from "./schema";
import { TitleIntro } from "./scenes/TitleIntro";
import { StepScene } from "./scenes/StepScene";
import { SummaryScene } from "./scenes/SummaryScene";
import { BackgroundMusic } from "../shared";

const FPS = 30;

// Scene durations in frames
const INTRO_DURATION = 4 * FPS; // 4s
const STEP_DURATION = 8 * FPS; // 8s per step
const SUMMARY_DURATION = 6 * FPS; // 6s

export const Explainer: React.FC<z.infer<typeof ExplainerSchema>> = ({
  title,
  steps,
  conclusion,
  musicUrl,
}) => {
  const stepTitles = steps.map((s) => s.title);

  return (
    <AbsoluteFill style={{ backgroundColor: "#1a1a4e" }}>
      <Series>
        {/* Title intro */}
        <Series.Sequence durationInFrames={INTRO_DURATION}>
          <TitleIntro title={title} stepCount={steps.length} />
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
            />
          </Series.Sequence>
        ))}

        {/* Summary / conclusion */}
        <Series.Sequence durationInFrames={SUMMARY_DURATION}>
          <SummaryScene conclusion={conclusion} stepTitles={stepTitles} />
        </Series.Sequence>
      </Series>

      {/* Background music across entire composition */}
      {musicUrl && (
        <BackgroundMusic
          src={musicUrl}
          volume={0.15}
          fadeInFrames={30}
          fadeOutFrames={45}
        />
      )}
    </AbsoluteFill>
  );
};

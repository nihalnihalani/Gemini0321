import React from "react";
import { AbsoluteFill, Series } from "remotion";
import { z } from "zod";
import { BrandStorySchema } from "./schema";
import { OpeningNarrative } from "./scenes/OpeningNarrative";
import { MilestoneTimeline } from "./scenes/MilestoneTimeline";
import { TeamShowcase } from "./scenes/TeamShowcase";
import { VisionScene } from "./scenes/VisionScene";
import { BackgroundMusic } from "../shared";

const FPS = 30;

// Scene durations in frames — generous timing for cinematic pacing
const OPENING_DURATION = 6 * FPS;           // 6s — slow reveal needs breathing room
const MILESTONE_DURATION_PER = 2.5 * FPS;   // 2.5s per milestone (75 frames) — deliberate pace
const TEAM_DURATION = 6 * FPS;              // 6s — Ken Burns effect needs time to read
const VISION_DURATION = 7 * FPS;            // 7s — climactic finale deserves weight

export const BrandStory: React.FC<z.infer<typeof BrandStorySchema>> = ({
  companyName,
  mission,
  teamPhotos,
  milestones,
  vision,
  logoUrl,
  musicUrl,
}) => {
  // Calculate milestone scene duration based on number of milestones
  const milestoneDuration = Math.max(
    4 * FPS,
    milestones.length * MILESTONE_DURATION_PER
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#0f0c08" }}>
      <Series>
        {/* Opening: company name + mission with cinematic feel */}
        <Series.Sequence durationInFrames={OPENING_DURATION}>
          <OpeningNarrative
            companyName={companyName}
            mission={mission}
            logoUrl={logoUrl}
          />
        </Series.Sequence>

        {/* Timeline of company milestones */}
        <Series.Sequence durationInFrames={milestoneDuration}>
          <MilestoneTimeline milestones={milestones} />
        </Series.Sequence>

        {/* Team photo showcase */}
        <Series.Sequence durationInFrames={TEAM_DURATION}>
          <TeamShowcase teamPhotos={teamPhotos} />
        </Series.Sequence>

        {/* Vision statement finale */}
        <Series.Sequence durationInFrames={VISION_DURATION}>
          <VisionScene
            vision={vision}
            logoUrl={logoUrl}
            companyName={companyName}
          />
        </Series.Sequence>
      </Series>

      {/* Background music across entire composition */}
      {musicUrl && (
        <BackgroundMusic
          src={musicUrl}
          volume={0.25}
          fadeInFrames={30}
          fadeOutFrames={45}
        />
      )}
    </AbsoluteFill>
  );
};

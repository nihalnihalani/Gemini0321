import React from "react";
import { AbsoluteFill, Series } from "remotion";
import { z } from "zod";
import { SocialPromoSchema } from "./schema";
import { HookScene } from "./scenes/HookScene";
import { ProductFlash } from "./scenes/ProductFlash";
import { FeatureBurst } from "./scenes/FeatureBurst";
import { CTAScene } from "./scenes/CTAScene";
import { BackgroundMusic } from "../shared";

const FPS = 30;

// ────────────────────────────────────────────────────────────────
// Scene durations — tuned for scroll-stopping social pacing.
//
// Research shows 71% of retention decisions happen in the first
// 3 seconds.  The hook must land fast (1.5s).  Features fire at
// ~0.8s each to match the 2-3s scene-change cadence that keeps
// attention on dark-feed vertical content.  CTA gets a full 3s
// for the urgency pulse to land.
// ────────────────────────────────────────────────────────────────
const HOOK_DURATION = Math.round(1.5 * FPS);       // 1.5s - fast attention grab
const PRODUCT_FLASH_DURATION = Math.round(2.5 * FPS); // 2.5s - product showcase
const FEATURE_FRAMES_EACH = 24;                     // ~0.8s per feature (rapid-fire)
const CTA_DURATION = 3 * FPS;                       // 3s   - call to action

export const SocialPromo: React.FC<z.infer<typeof SocialPromoSchema>> = ({
  hook,
  productImage,
  features,
  cta,
  musicUrl,
}) => {
  const featureBurstDuration = features.length * FEATURE_FRAMES_EACH;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      <Series>
        {/* Hook: slam-in text with flash + glitch (scroll-stopper) */}
        <Series.Sequence durationInFrames={HOOK_DURATION}>
          <HookScene hook={hook} />
        </Series.Sequence>

        {/* Product Flash: floating image with neon glow ring + badges */}
        <Series.Sequence durationInFrames={PRODUCT_FLASH_DURATION}>
          <ProductFlash productImage={productImage} features={features} />
        </Series.Sequence>

        {/* Feature Burst: rapid-fire slam-down highlights */}
        <Series.Sequence durationInFrames={featureBurstDuration}>
          <FeatureBurst features={features} />
        </Series.Sequence>

        {/* CTA: urgency pulse with ring bursts + sweep */}
        <Series.Sequence durationInFrames={CTA_DURATION}>
          <CTAScene cta={cta} />
        </Series.Sequence>
      </Series>

      {/* Background music across entire composition */}
      {musicUrl && (
        <BackgroundMusic
          src={musicUrl}
          volume={0.35}
          fadeInFrames={10}
          fadeOutFrames={25}
        />
      )}
    </AbsoluteFill>
  );
};

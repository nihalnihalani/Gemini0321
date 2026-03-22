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

// Scene durations in frames
const HOOK_DURATION = 2 * FPS;           // 2s - attention grab
const PRODUCT_FLASH_DURATION = 3 * FPS;  // 3s - product showcase
const FEATURE_FRAMES_EACH = 30;          // ~1s per feature
const CTA_DURATION = 3 * FPS;            // 3s - call to action

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
        {/* Hook: bold, attention-grabbing text */}
        <Series.Sequence durationInFrames={HOOK_DURATION}>
          <HookScene hook={hook} />
        </Series.Sequence>

        {/* Product Flash: image with feature badges */}
        <Series.Sequence durationInFrames={PRODUCT_FLASH_DURATION}>
          <ProductFlash productImage={productImage} features={features} />
        </Series.Sequence>

        {/* Feature Burst: rapid-fire feature highlights */}
        <Series.Sequence durationInFrames={featureBurstDuration}>
          <FeatureBurst features={features} />
        </Series.Sequence>

        {/* CTA: call to action with pulsing glow */}
        <Series.Sequence durationInFrames={CTA_DURATION}>
          <CTAScene cta={cta} />
        </Series.Sequence>
      </Series>

      {/* Background music across entire composition */}
      {musicUrl && (
        <BackgroundMusic src={musicUrl} volume={0.3} fadeInFrames={15} fadeOutFrames={30} />
      )}
    </AbsoluteFill>
  );
};

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

// Fast-paced scene durations
const HOOK_DURATION = 2 * FPS;          // 2s — grab attention
const PRODUCT_FLASH_DURATION = 3 * FPS; // 3s — show the product
const FEATURE_BURST_DURATION = 6 * FPS; // 6s — rapid features
const CTA_DURATION = 3 * FPS;           // 3s — call to action
// Total: ~14s default

export const SocialPromo: React.FC<z.infer<typeof SocialPromoSchema>> = ({
  hook,
  productImage,
  features,
  cta,
  musicUrl,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>
      <Series>
        {/* Hook: bold attention grabber */}
        <Series.Sequence durationInFrames={HOOK_DURATION}>
          <HookScene hook={hook} />
        </Series.Sequence>

        {/* Product flash with first feature */}
        <Series.Sequence durationInFrames={PRODUCT_FLASH_DURATION}>
          <ProductFlash
            productImage={productImage}
            featureText={features[0]}
          />
        </Series.Sequence>

        {/* Rapid feature burst */}
        <Series.Sequence durationInFrames={FEATURE_BURST_DURATION}>
          <FeatureBurst features={features} />
        </Series.Sequence>

        {/* CTA */}
        <Series.Sequence durationInFrames={CTA_DURATION}>
          <CTAScene cta={cta} />
        </Series.Sequence>
      </Series>

      {/* Background music */}
      {musicUrl && (
        <BackgroundMusic src={musicUrl} volume={0.3} fadeInFrames={10} fadeOutFrames={20} />
      )}
    </AbsoluteFill>
  );
};

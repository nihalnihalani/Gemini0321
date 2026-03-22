import React from "react";
import { AbsoluteFill, Series, useCurrentFrame, interpolate } from "remotion";
import { z } from "zod";
import { ProductLaunchSchema } from "./schema";
import { IntroScene } from "./scenes/IntroScene";
import { FeatureScene } from "./scenes/FeatureScene";
import { ShowcaseScene } from "./scenes/ShowcaseScene";
import { BrandReveal } from "./scenes/BrandReveal";
import { BackgroundMusic } from "../shared";

const FPS = 30;

// ── Scene durations — tuned for premium pacing ──
// Intro: 3.5s — quick, punchy hook (research: hook within 3 seconds)
// Features: 9s — room for word-by-word reveals with breathing space
// Showcase: 5s per image — Ken Burns needs time to read
// Reveal: 5.5s — brand lingers for recall
const INTRO_DURATION = Math.round(3.5 * FPS);     // 105 frames
const FEATURE_DURATION = 9 * FPS;                   // 270 frames
const SHOWCASE_DURATION = 5 * FPS;                   // 150 frames
const REVEAL_DURATION = Math.round(5.5 * FPS);     // 165 frames

export const ProductLaunch: React.FC<z.infer<typeof ProductLaunchSchema>> = ({
  brandName,
  tagline,
  productImages,
  features,
  brandColor = "#1a1a2e",
  logoUrl,
  musicUrl,
}) => {
  // Show up to 2 showcase scenes for the first 2 product images
  const showcaseImages = productImages.slice(0, 2);

  return (
    <AbsoluteFill style={{ backgroundColor: "#faf8f5" }}>
      <Series>
        {/* Intro: brand name + tagline — punchy word-by-word hook */}
        <Series.Sequence durationInFrames={INTRO_DURATION}>
          <IntroScene
            brandName={brandName}
            tagline={tagline}
            brandColor={brandColor}
          />
        </Series.Sequence>

        {/* Features list — word-by-word cascade with pill indicators */}
        <Series.Sequence durationInFrames={FEATURE_DURATION}>
          <FeatureScene features={features} brandColor={brandColor} />
        </Series.Sequence>

        {/* Product showcase scenes — Ken Burns pan + zoom */}
        {showcaseImages.map((image, index) => (
          <Series.Sequence key={index} durationInFrames={SHOWCASE_DURATION}>
            <ShowcaseScene productImage={image} brandColor={brandColor} />
          </Series.Sequence>
        ))}

        {/* Brand reveal finale — smooth bg transition, word reveal, product rise */}
        <Series.Sequence durationInFrames={REVEAL_DURATION}>
          <BrandReveal
            brandName={brandName}
            logoUrl={logoUrl}
            productImage={productImages[0]}
            brandColor={brandColor}
          />
        </Series.Sequence>
      </Series>

      {/* Background music across entire composition */}
      {musicUrl && (
        <BackgroundMusic
          src={musicUrl}
          volume={0.2}
          fadeInFrames={30}
          fadeOutFrames={45}
        />
      )}
    </AbsoluteFill>
  );
};

import React from "react";
import { AbsoluteFill, Series } from "remotion";
import { z } from "zod";
import { ProductLaunchSchema } from "./schema";
import { IntroScene } from "./scenes/IntroScene";
import { FeatureScene } from "./scenes/FeatureScene";
import { ShowcaseScene } from "./scenes/ShowcaseScene";
import { BrandReveal } from "./scenes/BrandReveal";
import { BackgroundMusic } from "../shared";

const FPS = 30;

// Scene durations in frames
const INTRO_DURATION = 4 * FPS;       // 4s
const FEATURE_DURATION = 8 * FPS;     // 8s
const SHOWCASE_DURATION = 6 * FPS;    // 6s per image (up to 2)
const REVEAL_DURATION = 5 * FPS;      // 5s

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
        {/* Intro: brand name + tagline */}
        <Series.Sequence durationInFrames={INTRO_DURATION}>
          <IntroScene
            brandName={brandName}
            tagline={tagline}
            brandColor={brandColor}
          />
        </Series.Sequence>

        {/* Features list */}
        <Series.Sequence durationInFrames={FEATURE_DURATION}>
          <FeatureScene features={features} brandColor={brandColor} />
        </Series.Sequence>

        {/* Product showcase scenes */}
        {showcaseImages.map((image, index) => (
          <Series.Sequence key={index} durationInFrames={SHOWCASE_DURATION}>
            <ShowcaseScene productImage={image} brandColor={brandColor} />
          </Series.Sequence>
        ))}

        {/* Brand reveal finale */}
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
        <BackgroundMusic src={musicUrl} volume={0.2} fadeInFrames={30} fadeOutFrames={45} />
      )}
    </AbsoluteFill>
  );
};

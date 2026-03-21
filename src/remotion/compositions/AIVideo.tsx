import React from "react";
import { Series, Audio } from "remotion";
import { SceneSequence } from "../sequences/SceneSequence";
import { TitleSequence } from "../sequences/TitleSequence";
import { OutroSequence } from "../sequences/OutroSequence";
import { TransitionEffect } from "../components/TransitionEffect";
import { type GeneratedScript, type CompositionStyle, DEFAULT_STYLE } from "../../lib/types";

const FPS = 30;
const INTRO_FRAMES = 90; // 3 seconds
const OUTRO_FRAMES = 90; // 3 seconds

export type AIVideoProps = {
  script: GeneratedScript;
  compositionStyle?: CompositionStyle;
};

export const AIVideo: React.FC<AIVideoProps> = ({
  script,
  compositionStyle = DEFAULT_STYLE,
}) => {
  const shouldApplyTransitions =
    compositionStyle.transitionType !== "cut" &&
    compositionStyle.transitionDurationFrames > 0;

  const getTransitionType = (scene: (typeof script.scenes)[number]) => {
    if (compositionStyle.transitionType === "per-scene") {
      return scene.transition === "cut" ? null : scene.transition;
    }
    return compositionStyle.transitionType === "cut"
      ? null
      : compositionStyle.transitionType;
  };

  return (
    <>
      <Series>
        <Series.Sequence durationInFrames={INTRO_FRAMES}>
          <TitleSequence
            title={script.title}
            theme={script.theme}
            imageUrl={script.titleCardUrl}
            compositionStyle={compositionStyle}
          />
        </Series.Sequence>

        {script.scenes.map((scene) => {
          const sceneDuration = Math.round(scene.duration_seconds * FPS);
          const transitionType = getTransitionType(scene);

          return (
            <Series.Sequence
              key={scene.scene_number}
              durationInFrames={sceneDuration}
            >
              <SceneSequence
                scene={scene}
                compositionStyle={compositionStyle}
                useCaptions={compositionStyle.showSubtitles}
              />
              {shouldApplyTransitions && transitionType && (
                <TransitionEffect
                  type={transitionType}
                  durationInFrames={compositionStyle.transitionDurationFrames}
                  direction="in"
                />
              )}
            </Series.Sequence>
          );
        })}

        <Series.Sequence durationInFrames={OUTRO_FRAMES}>
          <OutroSequence
            title={script.title}
            compositionStyle={compositionStyle}
          />
        </Series.Sequence>
      </Series>

      {script.musicUrl && (
        <Audio src={script.musicUrl} volume={compositionStyle.musicVolume} />
      )}
    </>
  );
};

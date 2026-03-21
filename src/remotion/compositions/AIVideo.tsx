import React from "react";
import { Series, Audio } from "remotion";
import { SceneSequence } from "../sequences/SceneSequence";
import { type GeneratedScript, type CompositionStyle, DEFAULT_STYLE } from "../../lib/types";

const FPS = 30;

export type AIVideoProps = {
  script: GeneratedScript;
  compositionStyle?: CompositionStyle;
};

export const AIVideo: React.FC<AIVideoProps> = ({
  script,
  compositionStyle = DEFAULT_STYLE,
}) => {
  return (
    <>
      <Series>
        {script.scenes.map((scene) => (
          <Series.Sequence
            key={scene.scene_number}
            durationInFrames={Math.round(scene.duration_seconds * FPS)}
          >
            <SceneSequence scene={scene} compositionStyle={compositionStyle} />
          </Series.Sequence>
        ))}
      </Series>

      {script.musicUrl && (
        <Audio src={script.musicUrl} volume={compositionStyle.musicVolume} />
      )}
    </>
  );
};

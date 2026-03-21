import React from "react";
import { Series, Audio } from "remotion";
import { SceneSequence } from "../sequences/SceneSequence";
import type { GeneratedScript } from "../../lib/types";

const FPS = 30;

export type AIVideoProps = {
  script: GeneratedScript;
};

export const AIVideo: React.FC<AIVideoProps> = ({ script }) => {
  return (
    <>
      <Series>
        {script.scenes.map((scene) => (
          <Series.Sequence
            key={scene.scene_number}
            durationInFrames={Math.round(scene.duration_seconds * FPS)}
          >
            <SceneSequence scene={scene} />
          </Series.Sequence>
        ))}
      </Series>

      {script.musicUrl && <Audio src={script.musicUrl} volume={0.3} />}
    </>
  );
};

import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  useCurrentFrame,
  interpolate,
} from "remotion";
import { TextOverlay } from "../components/TextOverlay";
import type { GeneratedScene } from "../../lib/types";

interface SceneSequenceProps {
  scene: GeneratedScene;
}

export const SceneSequence: React.FC<SceneSequenceProps> = ({ scene }) => {
  const frame = useCurrentFrame();

  const titleOpacity =
    scene.scene_number === 1
      ? interpolate(frame, [0, 30, 50, 60], [0, 1, 1, 0], {
          extrapolateRight: "clamp",
        })
      : 0;

  return (
    <AbsoluteFill>
      <AbsoluteFill>
        <OffthreadVideo
          src={scene.videoUrl}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>

      <TextOverlay text={scene.narration_text} style="subtitle" />

      {scene.scene_number === 1 && (
        <AbsoluteFill style={{ opacity: titleOpacity }}>
          <TextOverlay text={scene.title} style="title" />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

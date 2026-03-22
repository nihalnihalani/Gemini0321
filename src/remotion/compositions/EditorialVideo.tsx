import { AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig, Easing, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/Manrope";
import { quietMotionPreset, referenceTokens } from "../../editorial/tokens";

const { fontFamily: manropeFontFamily } = loadFont("normal", {
  weights: ["400", "600", "700"],
  subsets: ["latin"],
});
import type {
  EditorialAsset,
  EditorialBeat,
  EditorialVideoSpec,
  FrameSequenceBeat,
  LineSequenceState,
  MotionCurve,
  MotionPreset,
  PhraseTier,
  TextPhrase,
  TextTrackSegment,
} from "../../editorial/types";

const mergeMotion = (motion?: Partial<MotionPreset>): MotionPreset => ({
  ...quietMotionPreset,
  ...motion,
});

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const estimateTextWidth = (text: string, fontSize: number) =>
  Math.round(Math.max(fontSize * 0.7, text.trim().length * fontSize * 0.54));

const getEasing = (curve: MotionCurve) => {
  switch (curve) {
    case "linear":
      return Easing.linear;
    case "ease-out-cubic":
      return Easing.out(Easing.cubic);
    case "ease-in-out-cubic":
      return Easing.inOut(Easing.cubic);
    case "ease-out-expo":
      return Easing.out(Easing.exp);
    case "ease-in-out-expo":
      return Easing.inOut(Easing.exp);
    default:
      return Easing.inOut(Easing.cubic);
  }
};

const sampleTrack = (
  keyframes: Array<{ frame: number; value: number; easing?: MotionCurve }> | undefined,
  frame: number,
  fallback: number,
) => {
  if (!keyframes || keyframes.length === 0) {
    return fallback;
  }

  const ordered = keyframes;
  if (frame < ordered[0].frame) {
    return fallback;
  }

  for (let index = 0; index < ordered.length - 1; index += 1) {
    const current = ordered[index];
    const next = ordered[index + 1];
    if (frame <= next.frame) {
      if (current.frame === next.frame) {
        return next.value;
      }

      return interpolate(frame, [current.frame, next.frame], [current.value, next.value], {
        easing: getEasing(next.easing ?? current.easing ?? "ease-in-out-cubic"),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    }
  }

  return ordered[ordered.length - 1].value;
};

const getPhraseSize = (tier: PhraseTier) => {
  switch (tier) {
    case "display":
      return referenceTokens.typography.display;
    case "editorial":
      return referenceTokens.typography.editorial;
    case "micro":
      return referenceTokens.typography.micro;
    default:
      return referenceTokens.typography.editorial;
  }
};

const resolveAsset = (assets: EditorialAsset[], id: string) => {
  const asset = assets.find((item) => item.id === id);
  if (!asset) {
    throw new Error(`Missing asset ${id}`);
  }
  return asset;
};

const formatFrameSequencePath = (beat: FrameSequenceBeat, frame: number) => {
  const clampedFrame = clamp(frame, 0, beat.frameCount - 1);
  const imageNumber = beat.startNumber + clampedFrame;
  const padded = String(imageNumber).padStart(beat.zeroPad, "0");
  return staticFile(`${beat.frameDir}/${beat.framePrefix}${padded}.${beat.extension}`);
};

const getPresence = (frame: number, durationInFrames: number, motion: MotionPreset) => {
  const enter = interpolate(frame, [0, motion.enterDurationFrames], [0, 1], {
    easing: Easing.out(Easing.exp),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exit = interpolate(
    frame,
    [durationInFrames - motion.exitDurationFrames, durationInFrames],
    [1, 0],
    {
      easing: Easing.inOut(Easing.ease),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const fadeIn = interpolate(frame, [0, motion.fadeInFrames], [0, 1], {
    easing: Easing.out(Easing.exp),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - motion.fadeOutFrames, durationInFrames],
    [1, 0],
    {
      easing: Easing.inOut(Easing.ease),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  return clamp(enter * exit * fadeIn * fadeOut, 0, 1);
};

const getStatePresence = (frame: number, state: LineSequenceState) => {
  const duration = Math.max(1, state.endFrame - state.startFrame);
  const local = clamp(frame - state.startFrame, 0, duration);
  const fadeFrames = Math.min(12, Math.max(6, Math.floor(duration * 0.25)));
  const enter = interpolate(local, [0, fadeFrames], [0, 1], {
    easing: Easing.out(Easing.exp),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exit = interpolate(local, [duration - fadeFrames, duration], [1, 0], {
    easing: Easing.inOut(Easing.ease),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return {
    duration,
    local,
    presence: clamp(enter * exit, 0, 1),
  };
};

const Phrase: React.FC<{
  frame: number;
  durationInFrames: number;
  phrase: TextPhrase;
  motion: MotionPreset;
  ink: string;
  fontFamily: string;
}> = ({ durationInFrames, fontFamily, frame, ink, motion, phrase }) => {
  const localFrame = Math.max(0, frame - (phrase.cueFrame ?? 0));
  const defaultPresence = getPresence(localFrame, durationInFrames, motion);
  const presence = sampleTrack(phrase.track?.opacity, localFrame, defaultPresence);
  const translateY = sampleTrack(
    phrase.track?.translateY,
    localFrame,
    interpolate(defaultPresence, [0, 1], [16, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const translateX = sampleTrack(phrase.track?.translateX, localFrame, 0);
  const scale = sampleTrack(phrase.track?.scale, localFrame, 1);
  const blur = sampleTrack(phrase.track?.blur, localFrame, 0);

  return (
    <div
      style={{
        position: "absolute",
        left: phrase.x,
        top: phrase.y,
        width: phrase.width,
        opacity: phrase.tier === "micro" ? presence * 0.74 : presence,
        transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
        color: ink,
        textAlign: phrase.align ?? "left",
        fontFamily,
        fontSize: getPhraseSize(phrase.tier),
        fontWeight: phrase.emphasisWeight ?? 600,
        letterSpacing: phrase.tier === "micro" ? "0.08em" : "-0.06em",
        lineHeight: 0.96,
        filter: blur > 0 ? `blur(${blur}px)` : "none",
        whiteSpace: "pre-wrap",
        textTransform: phrase.tier === "micro" ? "uppercase" : "none",
      }}
    >
      {phrase.text}
    </div>
  );
};

const TextTrackLayer: React.FC<{
  frame: number;
  ink: string;
  fontFamily: string;
  segments: TextTrackSegment[];
}> = ({ frame, fontFamily, ink, segments }) => {
  const activeSegments = segments
    .map((segment) => {
      const opacity = sampleTrack(segment.track?.opacity, frame, 0);
      if (opacity <= 0.001) {
        return null;
      }

      const translateX = sampleTrack(segment.track?.translateX, frame, 0);
      const translateY = sampleTrack(segment.track?.translateY, frame, 0);
      const scale = sampleTrack(segment.track?.scale, frame, 1);
      const blur = sampleTrack(segment.track?.blur, frame, 0);
      const mutedOpacity = sampleTrack(segment.track?.mutedOpacity, frame, 1);
      const pillOpacity = segment.pill
        ? sampleTrack(segment.track?.pillOpacity, frame, 1)
        : 0;
      const pillScale = segment.pill
        ? sampleTrack(segment.track?.pillScale, frame, 1)
        : 1;
      const clipProgress = sampleTrack(segment.track?.clipProgress, frame, 1);
      const fontSize = segment.fontSize ?? referenceTokens.typography.editorial;
      const lineHeight = segment.lineHeight ?? 0.96;
      const width = segment.width ?? estimateTextWidth(segment.text, fontSize);
      const paddingX = segment.pill ? (segment.pill.paddingX ?? 28) * 2 : 0;
      const paddingY = segment.pill ? (segment.pill.paddingY ?? 12) * 2 : 0;
      const scaledWidth = (width + paddingX) * Math.max(scale, pillScale);
      const scaledHeight = (fontSize * lineHeight + paddingY) * Math.max(scale, pillScale);
      const anchor = segment.anchor ?? segment.align ?? "left";
      const left =
        segment.x +
        translateX -
        (anchor === "center" ? scaledWidth / 2 : anchor === "right" ? scaledWidth : 0);
      const top = segment.y + translateY;
      const overlapScore =
        (segment.priority ?? 0) * 0.2 +
        opacity * 10 +
        pillOpacity * 4 +
        clipProgress * 2 +
        mutedOpacity +
        (segment.spacer ? -20 : 0) +
        (segment.pill ? 2 : 0) +
        (segment.fontWeight ?? 560) / 1000;

      return {
        segment,
        opacity,
        translateX,
        translateY,
        scale,
        blur,
        mutedOpacity,
        pillOpacity,
        pillScale,
        clipProgress,
        fontSize,
        lineHeight,
        width,
        left,
        top,
        boxWidth: scaledWidth,
        boxHeight: scaledHeight,
        overlapScore,
      };
    })
    .filter((segment): segment is NonNullable<typeof segment> => Boolean(segment));

  const visibleOpacities = activeSegments.map((current, index) => {
    let resolvedOpacity = current.opacity;

    if (current.segment.spacer) {
      return 0;
    }

    activeSegments.forEach((other, otherIndex) => {
      if (index === otherIndex) {
        return;
      }

      if (other.segment.spacer) {
        return;
      }

      const horizontalOverlap =
        Math.min(current.left + current.boxWidth, other.left + other.boxWidth) -
        Math.max(current.left, other.left);
      const verticalOverlap =
        Math.min(current.top + current.boxHeight, other.top + other.boxHeight) -
        Math.max(current.top, other.top);

      if (horizontalOverlap <= 0 || verticalOverlap <= 0) {
        return;
      }

      const overlapArea = horizontalOverlap * verticalOverlap;
      const currentArea = current.boxWidth * current.boxHeight;
      const overlapRatio = overlapArea / Math.max(1, currentArea);
      if (overlapRatio < 0.18) {
        return;
      }

      const currentWins =
        current.overlapScore > other.overlapScore ||
        (current.overlapScore === other.overlapScore && index > otherIndex);

      if (!currentWins) {
        resolvedOpacity *= clamp(1 - overlapRatio * 1.35, 0, 1);
      }
    });

    return resolvedOpacity;
  });

  return (
    <>
      {activeSegments.map((model, index) => {
        const {
          segment,
          translateX,
          translateY,
          scale,
          blur,
          mutedOpacity,
          pillOpacity,
          pillScale,
          clipProgress,
          fontSize,
          lineHeight,
        } = model;
      const opacity = visibleOpacities[index];
      if (opacity <= 0.001) {
        return null;
      }

        const transformOrigin =
          segment.align === "center"
            ? "center center"
            : segment.align === "right"
              ? "right center"
              : "left center";

        return (
          <div
            key={segment.id}
            style={{
              position: "absolute",
              left: segment.x,
              top: segment.y,
              width: segment.width,
              opacity,
              textAlign: segment.align ?? "left",
              fontFamily,
              fontSize,
              fontWeight: segment.fontWeight ?? 560,
              letterSpacing: segment.letterSpacing ?? "-0.06em",
              lineHeight,
              color: segment.color ?? ink,
              transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
              transformOrigin,
              filter: blur > 0 ? `blur(${blur}px)` : "none",
              whiteSpace: "nowrap",
              zIndex: Math.round(model.overlapScore * 100),
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent:
                  segment.align === "center"
                    ? "center"
                    : segment.align === "right"
                      ? "flex-end"
                      : "flex-start",
                padding: segment.pill
                  ? `${segment.pill.paddingY ?? 12}px ${segment.pill.paddingX ?? 28}px`
                  : 0,
                borderRadius: segment.pill?.radius ?? 999,
                backgroundColor: segment.pill
                  ? `rgba(255,255,255,${(segment.pill.backgroundOpacity ?? 0.66) * pillOpacity})`
                  : "transparent",
                boxShadow: segment.pill
                  ? `0 0 0 2px rgba(29,25,21,${(segment.pill.borderOpacity ?? 0.08) * pillOpacity}), 0 8px 24px rgba(29,25,21,${(segment.pill.shadowOpacity ?? 0.08) * pillOpacity})`
                  : "none",
                backdropFilter: segment.pill ? `blur(${(segment.pill.blur ?? 18) * pillOpacity}px)` : "none",
                transform: segment.pill ? `scale(${pillScale})` : "none",
                clipPath:
                  clipProgress < 1
                    ? `inset(0 ${clamp((1 - clipProgress) * 100, 0, 100)}% 0 0 round ${segment.pill?.radius ?? 999}px)`
                    : undefined,
              }}
            >
              <span style={{ opacity: mutedOpacity }}>{segment.spacer ? "\u00A0" : segment.text}</span>
            </span>
          </div>
        );
      })}
    </>
  );
};

const LineSequence: React.FC<{
  frame: number;
  ink: string;
  fontFamily: string;
  states: LineSequenceState[];
}> = ({ frame, fontFamily, ink, states }) => {
  return (
    <>
      {states.map((state) => {
        const { duration, local, presence } = getStatePresence(frame, state);
        const translateY = interpolate(
          local,
          [0, duration],
          [state.enterOffsetY ?? 10, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );
        const translateXIn = interpolate(
          local,
          [0, Math.min(14, duration)],
          [state.enterOffsetX ?? 0, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );
        const translateXOut = interpolate(
          local,
          [Math.max(0, duration - 14), duration],
          [0, state.exitOffsetX ?? 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );

        return (
          <div
            key={state.id}
            style={{
              position: "absolute",
              left: state.x,
              top: state.y,
              width: state.width,
              display: "flex",
              justifyContent:
                state.align === "center"
                  ? "center"
                  : state.align === "right"
                    ? "flex-end"
                    : "flex-start",
              gap: state.gap ?? 18,
              opacity: presence,
              transform: `translate(${translateXIn + translateXOut}px, ${translateY}px)`,
              color: ink,
              fontFamily,
              fontSize: state.fontSize ?? 42,
              fontWeight: state.fontWeight ?? 600,
              letterSpacing: state.letterSpacing ?? "-0.06em",
              lineHeight: 0.96,
              whiteSpace: "nowrap",
            }}
          >
            {state.segments.map((segment, index) => (
              <span
                key={`${state.id}-${index}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  opacity: segment.muted ? 0.12 : 1,
                  color: ink,
                  borderRadius: segment.pill ? 999 : 0,
                  padding: segment.pill ? "12px 28px 14px" : 0,
                  background: segment.pill ? "rgba(255,255,255,0.62)" : "transparent",
                  boxShadow: segment.pill
                    ? "0 0 0 2px rgba(29,25,21,0.08), 0 8px 24px rgba(29,25,21,0.08)"
                    : "none",
                  backdropFilter: segment.pill ? "blur(18px)" : "none",
                }}
              >
                {segment.text}
              </span>
            ))}
          </div>
        );
      })}
    </>
  );
};

const AssetCard: React.FC<{
  asset: EditorialAsset;
  box: { x: number; y: number; width: number; height: number };
  frame: number;
  durationInFrames: number;
  motion?: Partial<MotionPreset>;
}> = ({ asset, box, durationInFrames, frame, motion }) => {
  const mergedMotion = mergeMotion(motion);
  const presence = getPresence(frame, durationInFrames, mergedMotion);
  const fromX = asset.drift?.fromX ?? mergedMotion.driftX;
  const toX = asset.drift?.toX ?? 0;
  const fromY = asset.drift?.fromY ?? mergedMotion.driftY;
  const toY = asset.drift?.toY ?? 0;
  const scaleFrom = asset.drift?.scaleFrom ?? mergedMotion.scaleFrom;
  const scaleTo = asset.drift?.scaleTo ?? mergedMotion.scaleTo;
  const driftEasing = Easing.inOut(Easing.cubic);

  const translateX = interpolate(frame, [0, durationInFrames], [fromX, toX], {
    easing: driftEasing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const translateY = interpolate(frame, [0, durationInFrames], [fromY, toY], {
    easing: driftEasing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(frame, [0, durationInFrames], [scaleFrom, scaleTo], {
    easing: driftEasing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: box.x,
        top: box.y,
        width: box.width,
        height: box.height,
        overflow: "hidden",
        borderRadius: asset.treatment?.radius ?? referenceTokens.radii.image,
        opacity: presence,
      }}
    >
      <Img
        src={asset.src.startsWith("http") || asset.src.startsWith("/tmp") ? asset.src : staticFile(asset.src)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: asset.crop?.objectPosition ?? "center center",
          transform: `translate(${translateX}px, ${translateY}px) scale(${scale * (asset.crop?.scale ?? 1)})`,
          filter: `saturate(${asset.treatment?.saturation ?? 0.82}) blur(${(asset.treatment?.blur ?? 0) + mergedMotion.blur}px)`,
          opacity: asset.treatment?.opacity ?? 1,
        }}
      />
    </div>
  );
};

const BeatLayer: React.FC<{
  beat: EditorialBeat;
  spec: EditorialVideoSpec;
}> = ({ beat, spec }) => {
  const frame = useCurrentFrame();
  const motion = mergeMotion(beat.motion);

  switch (beat.kind) {
    case "source-video":
      return (
        <OffthreadVideo
          src={staticFile(beat.src)}
          muted={beat.muted ?? true}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      );
    case "frame-sequence":
      return (
        <Img
          src={formatFrameSequencePath(beat, frame)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      );
    case "text-track":
      return (
        <TextTrackLayer
          frame={frame}
          ink={spec.meta.ink}
          fontFamily={spec.meta.fontFamily}
          segments={beat.segments}
        />
      );
    case "line-sequence":
      return (
        <LineSequence
          frame={frame}
          ink={spec.meta.ink}
          fontFamily={spec.meta.fontFamily}
          states={beat.states}
        />
      );
    case "blank-hold":
      return null;
    case "text-scatter":
      return (
        <>
          {beat.phrases.map((phrase) => (
            <Phrase
              key={phrase.id}
              frame={frame}
              durationInFrames={beat.durationInFrames}
              phrase={phrase}
              motion={motion}
              ink={spec.meta.ink}
              fontFamily={spec.meta.fontFamily}
            />
          ))}
        </>
      );
    case "image-card": {
      const asset = resolveAsset(spec.assets, beat.assetId);
      return (
        <>
          <AssetCard
            asset={asset}
            box={beat.frameBox}
            frame={frame}
            durationInFrames={beat.durationInFrames}
            motion={motion}
          />
          {beat.kicker ? (
            <Phrase
              frame={frame}
              durationInFrames={beat.durationInFrames}
              phrase={beat.kicker}
              motion={motion}
              ink={spec.meta.ink}
              fontFamily={spec.meta.fontFamily}
            />
          ) : null}
          {beat.caption ? (
            <Phrase
              frame={frame}
              durationInFrames={beat.durationInFrames}
              phrase={beat.caption}
              motion={motion}
              ink={spec.meta.ink}
              fontFamily={spec.meta.fontFamily}
            />
          ) : null}
        </>
      );
    }
    case "soft-pan-still": {
      const asset = resolveAsset(spec.assets, beat.assetId);
      return (
        <>
          <AssetCard
            asset={asset}
            box={beat.frameBox}
            frame={frame}
            durationInFrames={beat.durationInFrames}
            motion={motion}
          />
          {beat.hazeOpacity ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `radial-gradient(circle at 50% 40%, rgba(255,255,255,${beat.hazeOpacity}), transparent 45%)`,
              }}
            />
          ) : null}
          {beat.kicker ? (
            <Phrase
              frame={frame}
              durationInFrames={beat.durationInFrames}
              phrase={beat.kicker}
              motion={motion}
              ink={spec.meta.ink}
              fontFamily={spec.meta.fontFamily}
            />
          ) : null}
          {beat.caption ? (
            <Phrase
              frame={frame}
              durationInFrames={beat.durationInFrames}
              phrase={beat.caption}
              motion={motion}
              ink={spec.meta.ink}
              fontFamily={spec.meta.fontFamily}
            />
          ) : null}
        </>
      );
    }
    case "split-word-object": {
      const asset = resolveAsset(spec.assets, beat.assetId);
      return (
        <>
          <AssetCard
            asset={asset}
            box={beat.frameBox}
            frame={frame}
            durationInFrames={beat.durationInFrames}
            motion={motion}
          />
          <Phrase
            frame={frame}
            durationInFrames={beat.durationInFrames}
            phrase={beat.leftPhrase}
            motion={motion}
            ink={spec.meta.ink}
            fontFamily={spec.meta.fontFamily}
          />
          <Phrase
            frame={frame}
            durationInFrames={beat.durationInFrames}
            phrase={beat.rightPhrase}
            motion={motion}
            ink={spec.meta.ink}
            fontFamily={spec.meta.fontFamily}
          />
        </>
      );
    }
    case "end-fade":
      return beat.closingPhrase ? (
        <Phrase
          frame={frame}
          durationInFrames={beat.durationInFrames}
          phrase={beat.closingPhrase}
          motion={motion}
          ink={spec.meta.ink}
          fontFamily={spec.meta.fontFamily}
        />
      ) : null;
    default:
      return null;
  }
};

export const EditorialVideo: React.FC<{
  spec: EditorialVideoSpec;
}> = ({ spec }) => {
  const resolvedSpec = spec;
  const videoConfig = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: resolvedSpec.meta.background,
        color: resolvedSpec.meta.ink,
        fontFamily: resolvedSpec.meta.fontFamily,
      }}
    >
      {resolvedSpec.beats.map((beat) => (
        <Sequence
          key={beat.id}
          from={beat.startFrame}
          durationInFrames={beat.durationInFrames}
          name={beat.id}
          layout="none"
        >
          <BeatLayer beat={beat} spec={resolvedSpec} />
        </Sequence>
      ))}
      <div
        style={{
          position: "absolute",
          inset: 0,
          border: `0px solid ${videoConfig.width > 0 ? "transparent" : "transparent"}`,
        }}
      />
    </AbsoluteFill>
  );
};

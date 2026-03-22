import type { EditorialVideoSpec, EditorialBeat, TextPhrase, SegmentTrack } from "./types";

/**
 * Scale an editorial spec from its native resolution (typically 4K 60fps)
 * to a target resolution. Preserves wall-clock duration and visual layout.
 */
export function adaptSpecToResolution(
  spec: EditorialVideoSpec,
  target: "1080p" | "4k"
): EditorialVideoSpec {
  if (target === "4k") return spec;

  const tw = 1920, th = 1080, tfps = 30;
  if (spec.meta.width === tw && spec.meta.height === th && spec.meta.fps === tfps) return spec;

  const sx = tw / spec.meta.width;
  const sy = th / spec.meta.height;
  const fr = tfps / spec.meta.fps;

  return {
    meta: { ...spec.meta, width: tw, height: th, fps: tfps, durationInFrames: Math.round(spec.meta.durationInFrames * fr) },
    assets: spec.assets,
    beats: spec.beats.map((beat) => scaleBeat(beat, sx, sy, fr)),
    anchors: spec.anchors.map((a) => ({ ...a, frame: Math.round(a.frame * fr) })),
  };
}

const sf = (v: number, r: number) => Math.round(v * r);

function scalePhrase(p: TextPhrase, sx: number, sy: number): TextPhrase {
  return { ...p, x: sf(p.x, sx), y: sf(p.y, sy) };
}

function scaleTrack(track: SegmentTrack, fr: number): SegmentTrack {
  const result: SegmentTrack = {};
  for (const [key, kfs] of Object.entries(track) as [keyof SegmentTrack, unknown][]) {
    if (Array.isArray(kfs)) {
      (result as Record<string, unknown>)[key] = kfs.map((kf: { frame: number; value: number; easing?: string }) => ({
        ...kf,
        frame: sf(kf.frame, fr),
      }));
    }
  }
  return result;
}

function scaleBeat(beat: EditorialBeat, sx: number, sy: number, fr: number): EditorialBeat {
  const base = { ...beat, startFrame: sf(beat.startFrame, fr), durationInFrames: sf(beat.durationInFrames, fr) };
  const box = (b: { x: number; y: number; width: number; height: number }) => ({
    x: sf(b.x, sx), y: sf(b.y, sy), width: sf(b.width, sx), height: sf(b.height, sy),
  });

  switch (beat.kind) {
    case "text-track":
      return {
        ...base, kind: "text-track",
        segments: beat.segments.map((s) => ({
          ...s,
          x: sf(s.x, sx), y: sf(s.y, sy),
          width: s.width ? sf(s.width, sx) : undefined,
          fontSize: s.fontSize ? sf(s.fontSize, sx) : undefined,
          track: s.track ? scaleTrack(s.track, fr) : undefined,
        })),
      };
    case "image-card":
      return {
        ...base, kind: "image-card", assetId: beat.assetId,
        frameBox: box(beat.frameBox),
        caption: beat.caption ? scalePhrase(beat.caption, sx, sy) : undefined,
        kicker: beat.kicker ? scalePhrase(beat.kicker, sx, sy) : undefined,
      };
    case "soft-pan-still":
      return {
        ...base, kind: "soft-pan-still", assetId: beat.assetId,
        frameBox: box(beat.frameBox), hazeOpacity: beat.hazeOpacity,
        caption: beat.caption ? scalePhrase(beat.caption, sx, sy) : undefined,
        kicker: beat.kicker ? scalePhrase(beat.kicker, sx, sy) : undefined,
      };
    case "split-word-object":
      return {
        ...base, kind: "split-word-object", assetId: beat.assetId,
        frameBox: box(beat.frameBox),
        leftPhrase: scalePhrase(beat.leftPhrase, sx, sy),
        rightPhrase: scalePhrase(beat.rightPhrase, sx, sy),
      };
    case "line-sequence":
      return {
        ...base, kind: "line-sequence",
        states: beat.states.map((st) => ({
          ...st,
          startFrame: sf(st.startFrame, fr),
          endFrame: sf(st.endFrame, fr),
          x: sf(st.x, sx),
          y: sf(st.y, sy),
          width: st.width ? sf(st.width, sx) : undefined,
          fontSize: st.fontSize ? sf(st.fontSize, sx) : undefined,
        })),
      };
    case "end-fade":
      return {
        ...base, kind: "end-fade",
        closingPhrase: beat.closingPhrase ? scalePhrase(beat.closingPhrase, sx, sy) : undefined,
      };
    default:
      return base;
  }
}

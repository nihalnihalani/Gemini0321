export type AudioMode = "silent" | "music-only" | "narration";
export type EditorialPresetName = "reference-replica" | "editorial-generator";
export type SourceInputKind = "idea" | "file" | "repo";
export type BrainMode = "rule-based" | "llm";
export type AssetRole =
  | "hero_object"
  | "detail_crop"
  | "context_frame"
  | "closing_object";
export type RhythmTag =
  | "whisper"
  | "hold"
  | "reveal"
  | "contrast"
  | "blank";
export type PhraseTier = "display" | "editorial" | "micro";
export type TextAlign = "left" | "center" | "right";
export type TokenGranularity = "phrase" | "word" | "letter";
export type SectionKind =
  | "overview"
  | "setup"
  | "usage"
  | "commands"
  | "api"
  | "architecture"
  | "performance"
  | "help"
  | "closing"
  | "detail";
export type LayoutHint =
  | "center"
  | "hero-top"
  | "gallery-left"
  | "gallery-right"
  | "full-bleed"
  | "contrast-split";
export type TransitionHint = "gentle" | "crisp" | "glide" | "lift";
export type MotionCurve =
  | "linear"
  | "ease-out-cubic"
  | "ease-in-out-cubic"
  | "ease-out-expo"
  | "ease-in-out-expo";
export type BeatKind =
  | "source-video"
  | "frame-sequence"
  | "text-track"
  | "line-sequence"
  | "text-scatter"
  | "image-card"
  | "soft-pan-still"
  | "split-word-object"
  | "blank-hold"
  | "end-fade";

export interface MotionPreset {
  enterDurationFrames: number;
  exitDurationFrames: number;
  fadeInFrames: number;
  fadeOutFrames: number;
  driftX: number;
  driftY: number;
  scaleFrom: number;
  scaleTo: number;
  blur: number;
}

export interface TextPhrase {
  id: string;
  text: string;
  x: number;
  y: number;
  tier: PhraseTier;
  align?: TextAlign;
  width?: number;
  cueFrame?: number;
  emphasisWeight?: number;
  track?: SegmentTrack;
}

export interface InlineSegment {
  text: string;
  muted?: boolean;
  pill?: boolean;
}

export interface NumericKeyframe {
  frame: number;
  value: number;
  easing?: MotionCurve;
}

export interface SegmentTrack {
  opacity?: NumericKeyframe[];
  translateX?: NumericKeyframe[];
  translateY?: NumericKeyframe[];
  scale?: NumericKeyframe[];
  blur?: NumericKeyframe[];
  mutedOpacity?: NumericKeyframe[];
  pillOpacity?: NumericKeyframe[];
  pillScale?: NumericKeyframe[];
  clipProgress?: NumericKeyframe[];
}

export interface PillStyle {
  paddingX?: number;
  paddingY?: number;
  radius?: number;
  backgroundOpacity?: number;
  borderOpacity?: number;
  shadowOpacity?: number;
  blur?: number;
}

export interface TextTrackSegment {
  id: string;
  text: string;
  x: number;
  y: number;
  anchor?: TextAlign;
  granularity?: TokenGranularity;
  carryKey?: string;
  lane?: number;
  priority?: number;
  spacer?: boolean;
  width?: number;
  align?: TextAlign;
  fontSize?: number;
  fontWeight?: number;
  letterSpacing?: number;
  lineHeight?: number;
  color?: string;
  track?: SegmentTrack;
  pill?: PillStyle;
}

export interface LineSequenceState {
  id: string;
  startFrame: number;
  endFrame: number;
  x: number;
  y: number;
  segments: InlineSegment[];
  align?: TextAlign;
  fontSize?: number;
  fontWeight?: number;
  width?: number;
  gap?: number;
  letterSpacing?: number;
  enterOffsetY?: number;
  enterOffsetX?: number;
  exitOffsetX?: number;
}

export interface EditorialAsset {
  id: string;
  role: AssetRole;
  src: string;
  semanticTags?: string[];
  crop?: {
    objectPosition?: string;
    scale?: number;
  };
  treatment?: {
    radius?: number;
    blur?: number;
    saturation?: number;
    opacity?: number;
  };
  drift?: {
    fromX?: number;
    toX?: number;
    fromY?: number;
    toY?: number;
    scaleFrom?: number;
    scaleTo?: number;
  };
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface BaseBeat {
  id: string;
  kind: BeatKind;
  startFrame: number;
  durationInFrames: number;
  motion?: Partial<MotionPreset>;
}

export interface TextScatterBeat extends BaseBeat {
  kind: "text-scatter";
  phrases: TextPhrase[];
}

export interface LineSequenceBeat extends BaseBeat {
  kind: "line-sequence";
  states: LineSequenceState[];
}

export interface TextTrackBeat extends BaseBeat {
  kind: "text-track";
  segments: TextTrackSegment[];
}

export interface SourceVideoBeat extends BaseBeat {
  kind: "source-video";
  src: string;
  muted?: boolean;
}

export interface FrameSequenceBeat extends BaseBeat {
  kind: "frame-sequence";
  frameDir: string;
  framePrefix: string;
  extension: "jpg" | "jpeg" | "png" | "webp";
  startNumber: number;
  zeroPad: number;
  frameCount: number;
}

export interface ImageCardBeat extends BaseBeat {
  kind: "image-card";
  assetId: string;
  frameBox: Box;
  kicker?: TextPhrase;
  caption?: TextPhrase;
}

export interface SoftPanStillBeat extends BaseBeat {
  kind: "soft-pan-still";
  assetId: string;
  frameBox: Box;
  kicker?: TextPhrase;
  caption?: TextPhrase;
  hazeOpacity?: number;
}

export interface SplitWordObjectBeat extends BaseBeat {
  kind: "split-word-object";
  assetId: string;
  frameBox: Box;
  leftPhrase: TextPhrase;
  rightPhrase: TextPhrase;
}

export interface BlankHoldBeat extends BaseBeat {
  kind: "blank-hold";
}

export interface EndFadeBeat extends BaseBeat {
  kind: "end-fade";
  closingPhrase?: TextPhrase;
}

export type EditorialBeat =
  | SourceVideoBeat
  | FrameSequenceBeat
  | TextTrackBeat
  | LineSequenceBeat
  | TextScatterBeat
  | ImageCardBeat
  | SoftPanStillBeat
  | SplitWordObjectBeat
  | BlankHoldBeat
  | EndFadeBeat;

export interface EditorialMeta {
  title: string;
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  durationSec: number;
  audioMode: AudioMode;
  preset: EditorialPresetName;
  background: string;
  ink: string;
  fontFamily: string;
}

export interface AnchorFrame {
  frame: number;
  source: string;
  label: string;
}

export interface EditorialVideoSpec {
  meta: EditorialMeta;
  assets: EditorialAsset[];
  beats: EditorialBeat[];
  anchors: AnchorFrame[];
}

export interface NarrativeBeat {
  id: string;
  rhythm: RhythmTag;
  copyFragments: string[];
  assetRole?: AssetRole;
  assetId?: string;
  durationSec: number;
  granularity?: TokenGranularity;
  layoutHint?: LayoutHint;
  transitionHint?: TransitionHint;
  sectionId?: string;
  sectionTitle?: string;
  sectionSummary?: string;
  visualQuery?: string;
}

export interface NarrativeBeatSheet {
  style: "reference-editorial";
  sourceText: string;
  durationSec: number;
  beats: NarrativeBeat[];
  assetRequests: AssetRole[];
}

export interface BeatDirective {
  id: string;
  role: "hook" | "hero" | "detail" | "contrast" | "close" | "breather";
  sectionId?: string;
  rhythm: RhythmTag;
  copyFragments: string[];
  assetRole?: AssetRole;
  granularity?: TokenGranularity;
  layoutHint?: LayoutHint;
  transitionHint?: TransitionHint;
  durationSec: number;
  sectionTitle?: string;
  sectionSummary?: string;
  visualQuery?: string;
}

export interface EditorialPlan {
  sourceTitle: string;
  sourceKind: SourceInputKind;
  plannerModel?: string;
  intent: {
    promise: string;
    tone: string;
    visualAnchor: string;
    audience: string;
  };
  orderedSectionIds: string[];
  directives: BeatDirective[];
  brainMode: BrainMode;
}

export interface CompilationDiagnostics {
  warnings: string[];
  notes: string[];
}

export interface EditorialSource {
  kind: SourceInputKind;
  input: string;
  title: string;
  abstract: string;
  body: string;
  highlights: string[];
  keywords: string[];
  files: string[];
  sections: EditorialSection[];
}

export interface EditorialSection {
  id: string;
  title: string;
  summary: string;
  points: string[];
  order: number;
  kind: SectionKind;
}

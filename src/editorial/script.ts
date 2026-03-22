import type { TextTrackSegment, TokenGranularity } from "./types";

type TokenSpec = {
  id: string;
  text: string;
  carryKey: string;
  spacer?: boolean;
};

type BuildTokenTrackOptions = {
  beatId: string;
  fragments: string[];
  granularity?: TokenGranularity;
  durationInFrames: number;
  fontSize: number;
  fontWeight?: number;
  layout: "center-line" | "scatter";
  centerX: number;
  baselineY: number;
  cueStart?: number;
  cueStep?: number;
  holdEnd?: number;
  exitEnd?: number;
  scatterOffsets?: Array<{ x: number; y: number }>;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const estimateTokenWidth = (text: string, fontSize: number) => {
  const trimmed = text.trim();
  if (!trimmed) {
    return Math.round(fontSize * 0.34);
  }

  return Math.round(Math.max(fontSize * 0.7, trimmed.length * fontSize * 0.54));
};

export const tokenizeEditorialText = (
  fragments: string[],
  granularity: TokenGranularity = "word",
): TokenSpec[] => {
  const source = fragments.join(" ").replace(/\s+/g, " ").trim();
  if (!source) {
    return [];
  }

  if (granularity === "phrase") {
    return fragments
      .map((fragment) => fragment.trim())
      .filter(Boolean)
      .map((fragment, index) => ({
        id: `phrase-${index}`,
        text: fragment,
        carryKey: fragment.toLowerCase(),
      }));
  }

  if (granularity === "letter") {
    let letterIndex = 0;
    let spaceIndex = 0;

    return source
      .split(/(\s+)/)
      .flatMap((fragment) => {
        if (!fragment) {
          return [];
        }

        if (/^\s+$/.test(fragment)) {
          return [
            {
              id: `space-${spaceIndex++}`,
              text: " ",
              carryKey: "space",
              spacer: true,
            },
          ];
        }

        return fragment.split("").map((character) => ({
          id: `letter-${letterIndex}`,
          text: character,
          carryKey: `${character.toLowerCase()}-${letterIndex++}`,
          spacer: false,
        }));
      })
      .map((character, index) => ({
        id: character.id || `letter-${index}`,
        text: character.text,
        carryKey: character.carryKey,
        spacer: character.spacer,
      }));
  }

  return source
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .map((word, index) => ({
      id: `word-${index}`,
      text: word,
      carryKey: word.toLowerCase(),
    }));
};

export const buildTokenTrackSegments = ({
  beatId,
  fragments,
  granularity = "word",
  durationInFrames,
  fontSize,
  fontWeight = 540,
  layout,
  centerX,
  baselineY,
  cueStart = 8,
  cueStep = granularity === "letter" ? 3 : 10,
  holdEnd,
  exitEnd,
  scatterOffsets = [],
}: BuildTokenTrackOptions): TextTrackSegment[] => {
  const tokens = tokenizeEditorialText(fragments, granularity);
  if (tokens.length === 0) {
    return [];
  }

  const widths = tokens.map((token) => estimateTokenWidth(token.text, fontSize));
  const gap = granularity === "letter" ? Math.round(fontSize * 0.06) : Math.round(fontSize * 0.24);
  const totalWidth =
    widths.reduce((sum, width) => sum + width, 0) + gap * Math.max(0, tokens.length - 1);
  const lineStartX = Math.round(centerX - totalWidth / 2);
  const safeHoldEnd = holdEnd ?? Math.max(cueStart + cueStep * tokens.length + 20, durationInFrames - 18);
  const safeExitEnd = exitEnd ?? durationInFrames;

  let cursorX = lineStartX;

  return tokens.map((token, index) => {
    const width = widths[index];
    const x = cursorX;
    cursorX += width + gap;

    const cueFrame = cueStart + index * cueStep;
    const lane = layout === "scatter" ? index % 3 : 0;
    const laneYOffset = layout === "scatter" ? [-132, 0, 128][lane] ?? 0 : 0;
    const scatter = scatterOffsets[index] ?? {
      x: (index % 2 === 0 ? -1 : 1) * (48 + index * 18),
      y: laneYOffset + (index % 2 === 0 ? -18 : 18),
    };
    const enterSpan = granularity === "letter" ? 10 : 14;
    const exitSpan = granularity === "letter" ? 12 : 18;
    const staggeredHold = token.spacer ? cueFrame + 2 : safeHoldEnd - (tokens.length - 1 - index) * (granularity === "letter" ? 1 : 4);
    const exitStart = clamp(
      staggeredHold,
      cueFrame + enterSpan + (token.spacer ? 0 : 10),
      Math.max(cueFrame + enterSpan + 2, safeExitEnd - exitSpan),
    );
    const exitFrame = clamp(exitStart + exitSpan, exitStart + 2, safeExitEnd);
    const settleFrame = cueFrame + enterSpan;
    const baseOpacity = token.spacer ? 0 : 1;
    const startScale = granularity === "letter" ? 0.98 : 0.985;

    return {
      id: `${beatId}-${token.id}`,
      text: token.text,
      x,
      y: baselineY + laneYOffset,
      width,
      align: "left",
      anchor: "left",
      fontSize,
      fontWeight,
      lane,
      granularity,
      carryKey: token.carryKey,
      priority: tokens.length - index,
      spacer: token.spacer,
      track: {
        opacity: [
          { frame: Math.max(0, cueFrame - 4), value: 0 },
          { frame: cueFrame, value: 0 },
          { frame: settleFrame, value: baseOpacity, easing: "ease-out-expo" },
          { frame: exitStart, value: baseOpacity },
          { frame: exitFrame, value: 0, easing: "ease-in-out-cubic" },
        ],
        translateX: [
          { frame: 0, value: layout === "scatter" ? scatter.x : 0 },
          { frame: cueFrame, value: layout === "scatter" ? scatter.x : 0 },
          { frame: settleFrame + 6, value: 0, easing: "ease-out-cubic" },
          { frame: exitFrame, value: layout === "scatter" ? -scatter.x * 0.12 : 0, easing: "ease-in-out-cubic" },
        ],
        translateY: [
          { frame: 0, value: layout === "scatter" ? scatter.y : 12 },
          { frame: cueFrame, value: layout === "scatter" ? scatter.y : 12 },
          { frame: settleFrame + 4, value: 0, easing: "ease-out-cubic" },
          { frame: exitFrame, value: token.spacer ? 0 : -8, easing: "ease-in-out-cubic" },
        ],
        scale: [
          { frame: 0, value: startScale },
          { frame: cueFrame, value: startScale },
          { frame: settleFrame, value: 1.01, easing: "ease-out-expo" },
          { frame: settleFrame + 8, value: 1, easing: "ease-in-out-cubic" },
          { frame: exitFrame, value: token.spacer ? 1 : 0.994, easing: "ease-in-out-cubic" },
        ],
        blur: [
          { frame: 0, value: token.spacer ? 0 : layout === "scatter" ? 1.1 : 0.5 },
          { frame: cueFrame, value: token.spacer ? 0 : layout === "scatter" ? 1.1 : 0.5 },
          { frame: settleFrame + 2, value: 0, easing: "ease-out-cubic" },
          { frame: exitFrame, value: token.spacer ? 0 : 0.4, easing: "ease-in-out-cubic" },
        ],
      },
    };
  });
};

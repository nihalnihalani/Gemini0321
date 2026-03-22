import type {
  AssetRole,
  BeatDirective,
  EditorialPlan,
  EditorialSource,
  LayoutHint,
  NarrativeBeat,
  NarrativeBeatSheet,
  TokenGranularity,
  TransitionHint,
} from "./types";

const clampWords = (text: string, maxWords: number) =>
  text
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maxWords)
    .join(" ");

const cleanInput = (input: string) =>
  input
    .replace(/\s+/g, " ")
    .replace(/[^\w\s\-.,]/g, " ")
    .trim();

const toFragments = (input: string): string[] => {
  const source = cleanInput(input);
  const sentences = source
    .split(/[.!,;:]/)
    .map((part) => part.trim())
    .filter(Boolean);
  const parts = sentences.length > 0 ? sentences : [source];

  return parts
    .flatMap((part) => {
      const words = part.split(/\s+/).filter(Boolean);
      if (words.length <= 4) {
        return [part];
      }

      return [
        clampWords(part, 2),
        clampWords(words.slice(2).join(" "), 3),
      ];
    })
    .map((part) => clampWords(part, 4))
    .filter(Boolean)
    .slice(0, 8);
};

const buildBeat = (
  id: string,
  rhythm: NarrativeBeat["rhythm"],
  durationSec: number,
  copyFragments: string[],
  assetRole?: AssetRole,
  assetId?: string,
  granularity?: TokenGranularity,
  layoutHint?: LayoutHint,
  transitionHint?: TransitionHint,
  sectionId?: string,
  sectionTitle?: string,
  sectionSummary?: string,
  visualQuery?: string,
): NarrativeBeat => ({
  id,
  rhythm,
  durationSec,
  copyFragments: copyFragments.filter(Boolean).slice(0, 3),
  assetRole,
  assetId,
  granularity,
  layoutHint,
  transitionHint,
  sectionId,
  sectionTitle,
  sectionSummary,
  visualQuery,
});

export const generateBeatSheet = (
  projectInput: string | EditorialSource,
  style: "reference-editorial" = "reference-editorial",
  options?: {
    textGranularity?: TokenGranularity;
  },
): NarrativeBeatSheet => {
  const sourcePromptText = (source: EditorialSource) =>
    [
      source.title,
      source.abstract,
      ...source.highlights,
      source.body,
      source.keywords.join(" "),
    ]
      .join("\n\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  const source =
    typeof projectInput === "string"
      ? {
          kind: "idea" as const,
          input: projectInput,
          title: projectInput,
          abstract: projectInput,
          body: projectInput,
          highlights: [],
          keywords: [],
          files: [],
          sections: [],
        }
      : projectInput;
  const sourceText =
    typeof projectInput === "string"
      ? projectInput
      : sourcePromptText(projectInput);
  const fragments = toFragments(
    [
      source.title,
      source.abstract,
      ...source.highlights.slice(0, 4),
      source.body,
      source.keywords.slice(0, 5).join(" "),
    ]
      .filter(Boolean)
      .join(". "),
  );
  const headline = clampWords(source.title || fragments[0] || "quiet systems", 4);
  const support = clampWords(source.abstract || fragments[1] || "clearer systems", 4);
  const contrastLead = clampWords(fragments[1] ?? support ?? "less friction", 3);
  const contrastEnd = clampWords(fragments[2] ?? source.keywords[0] ?? "more signal", 2);
  const closing = clampWords(source.highlights[0] ?? fragments[3] ?? "stays with you", 4);
  const orderedSections = source.sections?.slice(0, 3) ?? [];
  const sectionA = orderedSections[0];
  const sectionB = orderedSections[1];
  const sectionC = orderedSections[2];
  const sectionAHeadline = clampWords(sectionA?.title ?? support, 4);
  const sectionASummary = clampWords(sectionA?.summary ?? support, 4);
  const sectionBHeadline = clampWords(sectionB?.title ?? contrastLead, 4);
  const sectionBSummary = clampWords(sectionB?.summary ?? contrastEnd, 4);
  const finalHook = clampWords(sectionC?.summary ?? closing, 4);
  const textGranularity =
    options?.textGranularity ??
    (headline.replace(/\s+/g, "").length <= 12 ? "letter" : "word");

  const beats: NarrativeBeat[] = [
    buildBeat("beat-1", "blank", 3.4, [], undefined, undefined, undefined, "center", "gentle"),
    buildBeat("beat-2", "whisper", 5.0, headline.split(" ").slice(0, 2), undefined, undefined, textGranularity, "center", "lift"),
    buildBeat(
      "beat-3",
      "reveal",
      6.4,
      [headline],
      "hero_object",
      undefined,
      "word",
      "hero-top",
      "glide",
      sectionA?.id,
      source.title,
      source.abstract,
      `${source.title} ${source.abstract}`.trim(),
    ),
    buildBeat(
      "beat-4",
      "hold",
      5.6,
      [sectionAHeadline || support, sectionASummary].filter(Boolean),
      "detail_crop",
      undefined,
      "word",
      "gallery-right",
      "gentle",
      sectionA?.id,
      sectionA?.title,
      sectionA?.summary,
      `${sectionA?.title ?? ""} ${sectionA?.summary ?? ""}`.trim(),
    ),
    buildBeat(
      "beat-5",
      "reveal",
      5.8,
      [sectionBHeadline || contrastLead, sectionBSummary].filter(Boolean),
      "hero_object",
      undefined,
      "word",
      "gallery-left",
      "glide",
      sectionB?.id,
      sectionB?.title,
      sectionB?.summary,
      `${sectionB?.title ?? ""} ${sectionB?.summary ?? ""}`.trim(),
    ),
    buildBeat(
      "beat-6",
      "contrast",
      7.0,
      [
        clampWords(contrastLead, 1),
        clampWords(contrastEnd, 1),
      ],
      "context_frame",
      undefined,
      "word",
      "contrast-split",
      "crisp",
      sectionB?.id,
      sectionB?.title,
      sectionB?.summary,
      `${sectionB?.title ?? ""} ${sectionB?.summary ?? ""}`.trim(),
    ),
    buildBeat(
      "beat-7",
      "hold",
      5.8,
      [finalHook],
      "closing_object",
      undefined,
      "word",
      "full-bleed",
      "gentle",
      sectionC?.id,
      sectionC?.title,
      sectionC?.summary,
      `${sectionC?.title ?? ""} ${sectionC?.summary ?? ""}`.trim(),
    ),
    buildBeat("beat-8", "blank", 3.4, [], undefined, undefined, undefined, "center", "gentle"),
  ];

  return {
    style,
    sourceText,
    durationSec: beats.reduce((total, beat) => total + beat.durationSec, 0),
    beats,
    assetRequests: [
      "hero_object",
      "detail_crop",
      "context_frame",
      "closing_object",
    ],
  };
};

export const generateBeatSheetFromPlan = (
  plan: EditorialPlan,
  source: EditorialSource | string,
): NarrativeBeatSheet => {
  const sourceText =
    typeof source === "string"
      ? source
      : [
          source.title,
          source.abstract,
          ...source.highlights,
          ...source.sections.map((section) => `${section.title}. ${section.summary}`),
        ]
          .filter(Boolean)
          .join("\n\n");
  const sectionLookup =
    typeof source === "string"
      ? new Map<string, EditorialSource["sections"][number]>()
      : new Map(source.sections.map((section) => [section.id, section]));
  const beats: NarrativeBeat[] = plan.directives.map((directive: BeatDirective) => {
    const section = directive.sectionId ? sectionLookup.get(directive.sectionId) : undefined;
    const needsAsset = directive.rhythm !== "whisper" && directive.rhythm !== "blank";
    const defaultAssetRole: Record<string, AssetRole> = {
      hook: "hero_object",
      hero: "hero_object",
      detail: "detail_crop",
      contrast: "context_frame",
      close: "closing_object",
      breather: "context_frame",
    };
    const effectiveAssetRole = needsAsset
      ? directive.assetRole ?? defaultAssetRole[directive.role] ?? "hero_object"
      : undefined;
    return buildBeat(
      directive.id,
      directive.rhythm,
      directive.durationSec,
      directive.copyFragments,
      effectiveAssetRole,
      undefined,
      directive.granularity,
      directive.layoutHint,
      directive.transitionHint,
      directive.sectionId,
      directive.sectionTitle ?? section?.title,
      directive.sectionSummary ?? section?.summary,
      directive.visualQuery ??
        [directive.role, section?.title, section?.summary, ...directive.copyFragments]
          .filter(Boolean)
          .join(" "),
    );
  });

  const assetRequests = Array.from(
    new Set(beats.map((beat) => beat.assetRole).filter((role): role is AssetRole => Boolean(role))),
  );

  return {
    style: "reference-editorial",
    sourceText,
    durationSec: beats.reduce((total, beat) => total + beat.durationSec, 0),
    beats,
    assetRequests,
  };
};

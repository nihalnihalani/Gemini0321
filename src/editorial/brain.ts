import type {
  BeatDirective,
  BrainMode,
  EditorialPlan,
  EditorialSection,
  EditorialSource,
  LayoutHint,
  TokenGranularity,
  TransitionHint,
} from "./types";

type PlanOptions = {
  textGranularity?: TokenGranularity;
  brainMode?: BrainMode;
};

const clampWords = (text: string, maxWords: number) =>
  text
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maxWords)
    .join(" ");

const makeDirective = (
  directive: BeatDirective,
): BeatDirective => ({
  ...directive,
  copyFragments: directive.copyFragments.filter(Boolean).slice(0, 3),
});

const sectionSummary = (section: EditorialSection | undefined, fallback: string) =>
  clampWords(section?.summary ?? fallback, 4);

const sectionTitle = (section: EditorialSection | undefined, fallback: string) =>
  clampWords(section?.title ?? fallback, 4);

const detectAudience = (source: EditorialSource) => {
  const corpus = `${source.title} ${source.abstract} ${source.keywords.join(" ")}`.toLowerCase();
  if (/\b(api|repo|sdk|cli|typescript|python|package|module)\b/.test(corpus)) return "builders";
  if (/\b(team|workflow|workspace|system|platform)\b/.test(corpus)) return "operators";
  return "curious experts";
};

const detectTone = (source: EditorialSource) => {
  if (source.kind === "repo") return "precise, technical, calm";
  if (source.kind === "file") return "editorial, neat, assured";
  return "focused, elegant, restrained";
};

const detectVisualAnchor = (source: EditorialSource) =>
  source.keywords[0] ?? source.title.split(/\s+/)[0] ?? "system";

const sectionCorpus = (section: EditorialSection | undefined) =>
  `${section?.kind ?? ""} ${section?.title ?? ""} ${section?.summary ?? ""} ${section?.points?.join(" ") ?? ""}`.toLowerCase();

const inferSectionMood = (section: EditorialSection | undefined): TransitionHint => {
  switch (section?.kind) {
    case "commands": case "api": case "setup": return "crisp";
    case "architecture": case "performance": return "glide";
    case "help": case "closing": case "overview": return "gentle";
    default: break;
  }
  const corpus = sectionCorpus(section);
  if (/\b(command|install|setup|api|cli|script|build|run|config)\b/.test(corpus)) return "crisp";
  if (/\b(docs|help|guide|overview|intro|welcome|license)\b/.test(corpus)) return "gentle";
  if (/\b(architecture|system|performance|benchmark|pipeline|flow)\b/.test(corpus)) return "glide";
  return "gentle";
};

const inferLayout = (role: BeatDirective["role"], section: EditorialSection | undefined): LayoutHint => {
  switch (section?.kind) {
    case "commands": case "api": case "setup":
      return role === "hero" ? "hero-top" : "gallery-left";
    case "help": case "overview":
      return role === "hero" ? "hero-top" : "gallery-right";
    case "architecture": case "performance":
      return role === "close" ? "full-bleed" : "hero-top";
    case "closing": return "full-bleed";
    default: break;
  }
  if (role === "contrast") return "contrast-split";
  if (role === "hero") return "hero-top";
  if (role === "close") return "full-bleed";
  return "gallery-right";
};

const inferAssetRole = (role: BeatDirective["role"], section: EditorialSection | undefined): BeatDirective["assetRole"] => {
  switch (section?.kind) {
    case "commands": case "api": case "setup": return "context_frame";
    case "help": case "closing": return role === "hero" ? "detail_crop" : "closing_object";
    case "architecture": case "performance": return role === "hero" ? "hero_object" : "detail_crop";
    default: break;
  }
  if (role === "close") return "closing_object";
  if (role === "contrast") return "context_frame";
  return role === "hero" ? "hero_object" : "detail_crop";
};

const buildVisualQuery = (source: EditorialSource, section: EditorialSection | undefined, role: BeatDirective["role"]) =>
  clampWords(
    [role, section?.title, section?.summary, ...(section?.points ?? []), source.keywords.slice(0, 3).join(" ")]
      .filter(Boolean)
      .join(" "),
    12,
  );

const sanitizeDirective = (directive: BeatDirective): BeatDirective =>
  makeDirective((() => {
    const normalizedRhythm =
      directive.role === "breather"
        ? directive.copyFragments.length === 0 ? "blank" : "whisper"
        : directive.rhythm;
    const normalizedCopyFragments =
      normalizedRhythm === "blank"
        ? []
        : directive.copyFragments
            .map((fragment) => clampWords(fragment, directive.role === "contrast" ? 1 : 4))
            .filter(Boolean);
    return {
      ...directive,
      rhythm: normalizedRhythm,
      assetRole: normalizedRhythm === "blank" || normalizedRhythm === "whisper" ? undefined : directive.assetRole,
      layoutHint: directive.role === "breather" && normalizedRhythm === "whisper" ? "center" : directive.layoutHint,
      transitionHint: directive.role === "breather" && normalizedRhythm === "whisper" ? "gentle" : directive.transitionHint,
      copyFragments: normalizedCopyFragments,
    };
  })());

const buildRuleBasedPlan = (source: EditorialSource, options: PlanOptions = {}): EditorialPlan => {
  const textGranularity = options.textGranularity ?? (source.title.replace(/\s+/g, "").length <= 12 ? "letter" : "word");
  const sections = source.sections.slice(0, 3);
  const [sectionA, sectionB, sectionC] = sections;
  const promise = clampWords(source.abstract || source.title, 6);
  const lead = clampWords(source.title, 4);
  const contrastLead = clampWords(sectionA?.title ?? source.keywords[0] ?? source.title, 1);
  const contrastEnd = clampWords(sectionB?.title ?? source.keywords[1] ?? "signal", 1);
  const close = sectionSummary(sectionC, source.highlights[0] ?? source.abstract);

  const directives = [
    makeDirective({ id: "directive-breather-open", role: "breather", rhythm: "blank", copyFragments: [], durationSec: 3.2, layoutHint: "center", transitionHint: "gentle" }),
    sanitizeDirective({ id: "directive-hook", role: "hook", rhythm: "whisper", copyFragments: lead.split(" ").slice(0, 2), granularity: textGranularity, durationSec: 5.0, layoutHint: "center", transitionHint: source.kind === "repo" ? "crisp" : "lift", visualQuery: buildVisualQuery(source, sectionA, "hook") }),
    sanitizeDirective({ id: "directive-hero", role: "hero", sectionId: sectionA?.id, sectionTitle: sectionA?.title, sectionSummary: sectionA?.summary, rhythm: "reveal", copyFragments: [lead], assetRole: inferAssetRole("hero", sectionA), granularity: "word", durationSec: 6.2, layoutHint: inferLayout("hero", sectionA), transitionHint: inferSectionMood(sectionA), visualQuery: buildVisualQuery(source, sectionA, "hero") }),
    sanitizeDirective({ id: "directive-detail-a", role: "detail", sectionId: sectionA?.id, sectionTitle: sectionA?.title, sectionSummary: sectionA?.summary, rhythm: "hold", copyFragments: [sectionTitle(sectionA, lead), sectionSummary(sectionA, promise)], assetRole: inferAssetRole("detail", sectionA), granularity: "word", durationSec: 5.6, layoutHint: inferLayout("detail", sectionA), transitionHint: inferSectionMood(sectionA), visualQuery: buildVisualQuery(source, sectionA, "detail") }),
    sanitizeDirective({ id: "directive-detail-b", role: "detail", sectionId: sectionB?.id, sectionTitle: sectionB?.title, sectionSummary: sectionB?.summary, rhythm: "reveal", copyFragments: [sectionTitle(sectionB, promise), sectionSummary(sectionB, promise)], assetRole: inferAssetRole("detail", sectionB), granularity: "word", durationSec: 5.6, layoutHint: inferLayout("detail", sectionB), transitionHint: inferSectionMood(sectionB), visualQuery: buildVisualQuery(source, sectionB, "detail") }),
    sanitizeDirective({ id: "directive-contrast", role: "contrast", sectionId: sectionB?.id, sectionTitle: sectionB?.title, sectionSummary: sectionB?.summary, rhythm: "contrast", copyFragments: [contrastLead, contrastEnd], assetRole: inferAssetRole("contrast", sectionB), granularity: "word", durationSec: 6.8, layoutHint: inferLayout("contrast", sectionB), transitionHint: "crisp", visualQuery: buildVisualQuery(source, sectionB, "contrast") }),
    sanitizeDirective({ id: "directive-close", role: "close", sectionId: sectionC?.id, sectionTitle: sectionC?.title, sectionSummary: sectionC?.summary, rhythm: "hold", copyFragments: [close], assetRole: inferAssetRole("close", sectionC), granularity: "word", durationSec: 5.8, layoutHint: inferLayout("close", sectionC), transitionHint: inferSectionMood(sectionC), visualQuery: buildVisualQuery(source, sectionC, "close") }),
    makeDirective({ id: "directive-breather-close", role: "breather", rhythm: "blank", copyFragments: [], durationSec: 3.2, layoutHint: "center", transitionHint: "gentle" }),
  ];

  return {
    sourceTitle: source.title,
    sourceKind: source.kind,
    plannerModel: "rule-based/default",
    brainMode: options.brainMode ?? "rule-based",
    intent: { promise, tone: detectTone(source), visualAnchor: detectVisualAnchor(source), audience: detectAudience(source) },
    orderedSectionIds: sections.map((section) => section.id),
    directives,
  };
};

/**
 * Plan an editorial source using rule-based planning.
 */
export const planEditorialSource = async (
  source: EditorialSource,
  options: PlanOptions = {},
): Promise<EditorialPlan> => {
  return buildRuleBasedPlan(source, options);
};


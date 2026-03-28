import { planEditorialSource } from "./brain";
import { compileBeatSheetToSpec } from "./compiler";
import { generateBeatSheetFromPlan } from "./director";
import { referenceAssets } from "./reference";
import { resolveEditorialSource } from "./source";
import {
  validateBeatSheet,
  validateEditorialPlan,
  validateEditorialSpecStructure,
} from "./validator";
import type {
  AssetRole,
  BrainMode,
  EditorialAsset,
  EditorialPlan,
  EditorialPresetName,
  EditorialSource,
  EditorialVideoSpec,
  NarrativeBeat,
  NarrativeBeatSheet,
  TokenGranularity,
} from "./types";

type EngineOptions = {
  preset?: EditorialPresetName;
  textGranularity?: TokenGranularity;
  brainMode?: BrainMode;
  assets?: EditorialAsset[];
};

export type EditorialEngineResult = {
  source: EditorialSource;
  plan: EditorialPlan;
  beatSheet: NarrativeBeatSheet;
  spec: EditorialVideoSpec;
  diagnostics: {
    plan: ReturnType<typeof validateEditorialPlan>;
    beatSheet: ReturnType<typeof validateBeatSheet>;
    spec: ReturnType<typeof validateEditorialSpecStructure>;
  };
};

const semanticTokens = (value: string) =>
  value.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

const dedupeAssets = (assets: EditorialAsset[]) => {
  const seen = new Set<string>();
  return assets.filter((asset) => {
    if (seen.has(asset.id)) return false;
    seen.add(asset.id);
    return true;
  });
};

const getAssetLibrary = (custom?: EditorialAsset[]) =>
  custom && custom.length > 0 ? custom : referenceAssets;

const fallbackAssetForRole = (role: AssetRole, library: EditorialAsset[]) =>
  library.find((asset) => asset.role === role);

const scoreAsset = (asset: EditorialAsset, context: string, useCount: number, recentAssetIds: string[]) => {
  const tags = asset.semanticTags ?? [];
  const contextTokens = new Set(semanticTokens(context));
  const semanticScore = tags.reduce((score, tag) => {
    if (contextTokens.has(tag.toLowerCase())) return score + 5;
    if (semanticTokens(tag).some((token) => contextTokens.has(token))) return score + 2;
    return score;
  }, 0);
  const recencyPenalty = recentAssetIds.includes(asset.id) ? 6 : 0;
  const repetitionPenalty = useCount * 4;
  return semanticScore - recencyPenalty - repetitionPenalty;
};

const pickAssetForBeat = (
  beat: NarrativeBeat,
  source: EditorialSource,
  plan: EditorialPlan,
  useCounts: Map<string, number>,
  recentAssetIds: string[],
  library: EditorialAsset[],
) => {
  if (!beat.assetRole) return undefined;
  const section = beat.sectionId ? source.sections.find((s) => s.id === beat.sectionId) : undefined;
  const context = [source.title, source.abstract, plan.intent.visualAnchor, plan.intent.tone, beat.sectionTitle ?? section?.title, beat.sectionSummary ?? section?.summary, beat.visualQuery, ...beat.copyFragments].filter(Boolean).join(" ");
  const candidates = library.filter((asset) => asset.role === beat.assetRole);
  const selected = candidates
    .map((asset) => ({ asset, score: scoreAsset(asset, context, useCounts.get(asset.id) ?? 0, recentAssetIds) }))
    .sort((left, right) => right.score - left.score)[0]?.asset ?? fallbackAssetForRole(beat.assetRole, library);
  if (!selected) return undefined;
  useCounts.set(selected.id, (useCounts.get(selected.id) ?? 0) + 1);
  return selected;
};

const assignAssetsToBeatSheet = (beatSheet: NarrativeBeatSheet, source: EditorialSource, plan: EditorialPlan, library: EditorialAsset[]) => {
  const useCounts = new Map<string, number>();
  const recentAssetIds: string[] = [];
  const assets: EditorialAsset[] = [];

  const beats = beatSheet.beats.map((beat) => {
    if (beat.assetId || !beat.assetRole || beat.rhythm === "whisper" || beat.rhythm === "blank") return beat;
    const asset = pickAssetForBeat(beat, source, plan, useCounts, recentAssetIds, library);
    if (!asset) return beat;
    assets.push(asset);
    recentAssetIds.push(asset.id);
    if (recentAssetIds.length > 2) recentAssetIds.shift();
    return { ...beat, assetId: asset.id };
  });

  return { beatSheet: { ...beatSheet, beats }, assets: dedupeAssets(assets) };
};

export const buildEditorialEngineResult = async (
  input: string,
  options: EngineOptions = {},
): Promise<EditorialEngineResult> => {
  const source = resolveEditorialSource(input);
  const library = getAssetLibrary(options.assets);

  const plan = await planEditorialSource(source, {
    brainMode: options.brainMode,
    textGranularity: options.textGranularity,
  });

  const plannedBeatSheet = generateBeatSheetFromPlan(plan, source);
  const { beatSheet, assets } = assignAssetsToBeatSheet(plannedBeatSheet, source, plan, library);
  const spec = compileBeatSheetToSpec(
    beatSheet,
    assets.length > 0 ? assets : library,
    options.preset ?? "editorial-generator",
  );

  return {
    source,
    plan,
    beatSheet,
    spec,
    diagnostics: {
      plan: validateEditorialPlan(plan, source),
      beatSheet: validateBeatSheet(beatSheet),
      spec: validateEditorialSpecStructure(spec),
    },
  };
};

export const buildEditorialSpecFromInput = async (
  input: string,
  options: EngineOptions = {},
): Promise<EditorialVideoSpec> => {
  const result = await buildEditorialEngineResult(input, options);
  return result.spec;
};


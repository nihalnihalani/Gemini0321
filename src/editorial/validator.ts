import type {
  CompilationDiagnostics,
  EditorialPlan,
  EditorialSource,
  EditorialVideoSpec,
  NarrativeBeatSheet,
} from "./types";

const countWords = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .length;

export const validateEditorialPlan = (
  plan: EditorialPlan,
  source: EditorialSource,
): CompilationDiagnostics => {
  const warnings: string[] = [];
  const notes: string[] = [];
  const sectionIds = new Set(source.sections.map((section) => section.id));
  let lastSectionOrder = -1;

  if (plan.directives.length < 5 || plan.directives.length > 8) {
    warnings.push(`Planner produced ${plan.directives.length} directives; expected 5-8.`);
  }

  if (source.sections.length > 0 && plan.orderedSectionIds.length === 0) {
    warnings.push("Source has sections, but planner did not preserve section order.");
  }

  if (!plan.intent.promise) {
    warnings.push("Planner promise is empty.");
  }

  plan.directives.forEach((directive) => {
    if (directive.sectionId && !sectionIds.has(directive.sectionId)) {
      warnings.push(`Directive ${directive.id} references unknown section ${directive.sectionId}.`);
    }

    if (directive.sectionId) {
      const currentSectionOrder = source.sections.findIndex((section) => section.id === directive.sectionId);
      if (currentSectionOrder !== -1 && currentSectionOrder < lastSectionOrder) {
        warnings.push(`Directive ${directive.id} breaks source section order.`);
      }
      lastSectionOrder = Math.max(lastSectionOrder, currentSectionOrder);
    }

    directive.copyFragments.forEach((fragment) => {
      if (countWords(fragment) > 6) {
        warnings.push(`Directive ${directive.id} copy is too dense: "${fragment}"`);
      }
    });
  });

  notes.push(`Brain mode: ${plan.brainMode}`);
  if (plan.plannerModel) {
    notes.push(`Planner model: ${plan.plannerModel}`);
  }
  notes.push(`Audience: ${plan.intent.audience}`);
  notes.push(`Tone: ${plan.intent.tone}`);

  return { warnings, notes };
};

export const validateBeatSheet = (
  beatSheet: NarrativeBeatSheet,
): CompilationDiagnostics => {
  const warnings: string[] = [];
  const notes: string[] = [];
  let consecutiveVisualBeats = 0;
  let previousLayout: string | undefined;
  let repeatedLayoutCount = 0;

  if (beatSheet.beats.length < 5 || beatSheet.beats.length > 8) {
    warnings.push(`Beat sheet count ${beatSheet.beats.length} is outside expected range.`);
  }

  if (beatSheet.durationSec < 30 || beatSheet.durationSec > 45) {
    warnings.push(`Beat sheet duration ${beatSheet.durationSec.toFixed(1)}s is outside the 30-45s target.`);
  }

  beatSheet.beats.forEach((beat) => {
    if (beat.rhythm !== "blank" && beat.copyFragments.length === 0) {
      warnings.push(`Beat ${beat.id} has no copy fragments.`);
    }

    if (beat.durationSec <= 0) {
      warnings.push(`Beat ${beat.id} has invalid duration.`);
    }

    if (beat.assetRole || beat.assetId) {
      consecutiveVisualBeats += 1;
      if (consecutiveVisualBeats > 3) {
        warnings.push(`Beat ${beat.id} extends a run of visual beats without a textual breather.`);
      }
    } else {
      consecutiveVisualBeats = 0;
    }

    if (beat.layoutHint && beat.layoutHint === previousLayout) {
      repeatedLayoutCount += 1;
      if (repeatedLayoutCount >= 2) {
        warnings.push(`Layout ${beat.layoutHint} repeats too many times in a row.`);
      }
    } else {
      repeatedLayoutCount = 0;
      previousLayout = beat.layoutHint;
    }
  });

  notes.push(`Total duration: ${beatSheet.durationSec.toFixed(1)}s`);
  return { warnings, notes };
};

export const validateEditorialSpecStructure = (
  spec: EditorialVideoSpec,
): CompilationDiagnostics => {
  const warnings: string[] = [];
  const notes: string[] = [];
  let expectedStart = 0;
  let previousAssetId: string | undefined;
  let repeatedAssetCount = 0;

  if (spec.beats.length === 0) {
    warnings.push("Spec has no beats.");
  }

  spec.beats.forEach((beat, index) => {
    if (index === 0 && beat.startFrame !== 0) {
      warnings.push("First beat does not start at frame 0.");
    }

    if (beat.durationInFrames <= 0) {
      warnings.push(`Beat ${beat.id} has invalid durationInFrames.`);
    }

    if (beat.startFrame !== expectedStart) {
      warnings.push(`Beat ${beat.id} starts at ${beat.startFrame}, expected ${expectedStart}.`);
    }
    expectedStart = beat.startFrame + beat.durationInFrames;

    const assetId =
      beat.kind === "image-card" || beat.kind === "soft-pan-still" || beat.kind === "split-word-object"
        ? beat.assetId
        : undefined;
    if (assetId && assetId === previousAssetId) {
      repeatedAssetCount += 1;
      if (repeatedAssetCount >= 2) {
        warnings.push(`Asset ${assetId} repeats across too many consecutive beats.`);
      }
    } else {
      repeatedAssetCount = 0;
      previousAssetId = assetId;
    }
  });

  notes.push(`Spec duration: ${spec.meta.durationSec.toFixed(1)}s`);
  notes.push(`Spec preset: ${spec.meta.preset}`);

  return { warnings, notes };
};

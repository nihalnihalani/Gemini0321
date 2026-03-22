# Explainer Narration Integration - Devil's Advocate Review

**Date:** 2026-03-22
**Reviewer:** scene-builder (agent)
**Scope:** Tasks #1-3 (schema, scene components, worker pipeline)

---

## 1. Audio Sync: Caption Timing vs. ElevenLabs Output Speed

**Severity: Medium**

NarrationCaptions distributes words evenly across `durationInFrames` (minus 30 frames of buffer). This is a uniform distribution — every word gets the same screen time regardless of syllable count or natural speech pacing.

ElevenLabs narration has variable word timing — short words like "a", "the" are spoken faster than "educational" or "understanding". The captions will drift out of sync with the audio by mid-sentence.

**Current math for a 12s step scene (360 frames):**
- Active caption frames: 360 - 15 - 15 = 330
- Typical step description: ~20-30 words
- Frames per word: 330 / 25 = ~13.2 frames = ~0.44s per word
- ElevenLabs default speed: ~150 WPM = ~0.4s per word average

The average rate is close, but variance per-word will cause noticeable desync on longer texts. Acceptable for v1, but a word-level timestamp API from ElevenLabs would be ideal for v2.

**Verdict:** Acceptable for initial release. The uniform distribution is a reasonable approximation.

---

## 2. Duration Math: Do Scene Durations Accommodate Narration?

**Severity: Low**

- **Intro (7s):** introNarration is typically 1-2 sentences (~10-20 words). At 150 WPM, that's 4-8 seconds. 7s is sufficient.
- **Step scenes (12s):** Step narration is "Step N: {title}. {description}" — typically 15-40 words. At 150 WPM, that's 6-16 seconds. For longer descriptions (~40 words), 12s could be tight. However, the worker sets `duration_seconds: 10` for step scenes, suggesting narration is meant to fit within that window. The 12s scene duration provides a 2s buffer which is adequate.
- **Summary (9s):** Summary narration is the conclusion text — usually 1-2 sentences. 9s is sufficient.

**Verdict:** Durations are well-sized. Edge case: if a step description exceeds ~35 words, narration may be clipped. Consider adding a max word count validation in the schema or Gemini prompt.

---

## 3. Volume Balance: Narration vs. Music vs. SFX

**Severity: Low**

- Narration: `volume={1}` (full)
- Background music: `0.06` when narration present, `0.15` when not
- SFX: `volume={0.3}`

The 0.06 music level is quite low — practically inaudible. This is fine for educational content where clarity is paramount. The SFX at 0.3 could briefly compete with narration during transitions, but since SFX are typically short bursts (whoosh, click), this is acceptable.

**Verdict:** Good balance. The aggressive music ducking (0.06) ensures narration clarity.

---

## 4. Edge Cases: Graceful Degradation Without Audio

**Severity: Low - GOOD**

All narration props are optional throughout the chain:
- Schema: `narrationUrls`, `sfxUrls`, `introNarration`, `summaryNarration` are all `.optional()`
- TitleIntro: `{narrationUrl && <Audio .../>}` — conditional render
- StepScene: Same conditional pattern for narrationUrl and sfxUrl
- SummaryScene: Same conditional pattern

StepScene always renders `<NarrationCaptions text={description} />` even without narration audio. This is actually fine — captions act as animated text overlay regardless of audio presence.

TitleIntro and SummaryScene only show captions when `introNarration`/`summaryNarration` text is provided, which is correct behavior.

**Verdict:** Graceful degradation works correctly. Scenes are fully usable without audio.

---

## 5. Type Safety: Props Flow from Worker to Render to Scenes

**Severity: Medium - BUG FOUND**

### Issue A: introNarration/summaryNarration may not reach Explainer component

In `worker.ts` (lines 550-551), `introNarration` and `summaryNarration` are computed as local variables with fallback defaults:
```ts
const introNarration = (ex.introNarration as string) || `Let's explore ${ex.title}...`;
const summaryNarration = (ex.summaryNarration as string) || String(ex.conclusion || "...");
```

These local variables are used for `templateScenes[].narration_text` (sent to ElevenLabs), but they are **never written back** onto `enrichedContent`. The `renderProps` at line 723 spreads `...enrichedContent`, so if Gemini did not return `introNarration`/`summaryNarration`, those fields will be `undefined` in the render props, and the Explainer component will not show intro/summary captions.

**Fix:** After computing the fallbacks, write them back:
```ts
enrichedContent.introNarration = introNarration;
enrichedContent.summaryNarration = summaryNarration;
```

### Issue B: narrationUrls type mismatch (cosmetic)

The worker casts `narrationUrls` as `Record<number, string>` but the Zod schema expects `Record<string, string>`. At runtime this works because JS object keys are always strings, but the TypeScript type is misleading.

**Verdict:** Issue A is a real bug that will cause missing captions in most renders. Issue B is cosmetic.

---

## 6. Caption Readability at 1080p

**Severity: Low**

- **Font size:** 32px default on a 1080p canvas is equivalent to roughly 1.67% of vertical height. This is readable but on the smaller side for video captions. For comparison, YouTube's auto-captions render at approximately 36-42px equivalent.
- **Contrast:** Active word is `#a855f7` (purple) on a `rgba(0, 0, 0, 0.65)` background — good contrast ratio (~7:1). Past words are `rgba(255, 255, 255, 0.6)` — adequate.
- **Background:** The glassmorphic background (`rgba(0, 0, 0, 0.65)` + `backdrop-filter: blur(8px)`) provides good text separation from the scene content.
- **Line grouping:** 7 words per line at 32px fits comfortably within the 80% max-width container on 1920px width.

One note: `backdrop-filter: blur(8px)` is supported in Remotion's Chromium renderer, so this will work in server-side renders. No compatibility concern.

**Verdict:** Readable. Could increase to 36px for better visibility on mobile playback, but 32px is acceptable for 1080p desktop viewing.

---

## 7. Memory / Performance: Audio Component Count

**Severity: Low**

For a typical 5-step Explainer:
- 1 BackgroundMusic `<Audio>` (entire composition)
- 1 TitleIntro `<Audio>` (narration)
- 5 StepScene `<Audio>` (narration) + up to 5 `<Audio>` (SFX)
- 1 SummaryScene `<Audio>` (narration)

**Total: up to 13 `<Audio>` components.**

However, Remotion's `<Series>` ensures only one `<Series.Sequence>` is active at any frame. Audio components inside inactive sequences are unmounted. So at any given frame, there are at most:
- 1 BackgroundMusic (always mounted, top-level)
- 1-2 Audio components from the active scene (narration + possibly SFX)

**Total concurrent Audio components: 2-3 max.**

This is well within Remotion's capabilities and will not cause performance issues during rendering.

**Verdict:** No performance concern.

---

## Summary of Findings

| # | Area | Severity | Action Needed |
|---|------|----------|---------------|
| 1 | Caption-audio sync | Medium | Acceptable for v1; consider word-level timestamps in v2 |
| 2 | Duration math | Low | Adequate; consider max word count guardrail |
| 3 | Volume balance | Low | Good as-is |
| 4 | Graceful degradation | Low | Works correctly |
| 5A | **introNarration/summaryNarration not written back to enrichedContent** | **Medium** | **BUG - Fix in worker.ts** |
| 5B | narrationUrls type cast | Low | Cosmetic, no runtime impact |
| 6 | Caption readability | Low | Acceptable at 32px |
| 7 | Audio component count | Low | No concern |

### Recommended Immediate Fix (for Task #5)

In `src/queue/worker.ts`, after line 551, add:
```ts
enrichedContent.introNarration = introNarration;
enrichedContent.summaryNarration = summaryNarration;
```

This ensures the narration text always reaches the Explainer component for caption rendering.

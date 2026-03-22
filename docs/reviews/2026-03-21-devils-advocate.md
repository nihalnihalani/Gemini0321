# Devils Advocate Review - Template System Implementation

**Date**: 2026-03-21
**Scope**: Tasks #1-#12 (template types, compositions, Gemini, worker, bot, frontend)

---

## 1. Security Issues

### 1.1 Bot Token Exposed at Module Level
**File**: `src/lib/bot.ts:9`
```
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
```
The `!` assertion means if `TELEGRAM_BOT_TOKEN` is unset, `API_BASE` becomes `https://api.telegram.org/botundefined` and all API calls silently fail or leak error details. Should guard at function entry or lazily initialize.

### 1.2 No URL Validation on User-Provided Asset URLs
**File**: `src/lib/bot.ts:170-175`
Image file URLs from Telegram are passed directly into the worker pipeline and eventually into Remotion's `<Img>` component without sanitization. While Telegram URLs are trusted, the `assets[]` field in `GenerateRequestSchema` (`src/lib/schemas.ts:69`) accepts arbitrary string arrays with no URL validation — an attacker could inject non-HTTP URIs or internal network URLs via the API.

### 1.3 GitHub API URL Injection
**File**: `src/lib/github.ts:20`
```
const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
```
The `owner` and `repo` values come from regex extraction (`parseGitHubUrl`) which allows `.` in names. While GitHub's API handles path traversal safely, the regex at line 4 doesn't constrain length, meaning very long inputs could be used for resource exhaustion.

### 1.4 User Content Rendered Without Sanitization in Remotion
**Files**: All template scene components (e.g., `StepScene.tsx:135`, `SummaryScene.tsx:129`)
User-provided text (from Gemini generation based on user prompts) is rendered directly in React JSX. While React auto-escapes strings in JSX, any future change to use `dangerouslySetInnerHTML` would create XSS. This is currently safe but fragile.

---

## 2. Performance Issues

### 2.1 No Remotion Bundle Caching
**File**: `src/lib/render.ts:17,54`
Every call to `renderVideo()` or `renderTemplateVideo()` runs `bundle()` from scratch. Remotion bundling is expensive (webpack compilation). The bundle output should be cached in a module-level variable and reused across renders.

### 2.2 Duplicate Import Statement
**File**: `src/queue/worker.ts:1-2`
```
import { generateScript } from "@/lib/gemini";
import { generateTemplateContent } from "@/lib/gemini";
```
Should be combined: `import { generateScript, generateTemplateContent } from "@/lib/gemini";`

### 2.3 SocialPromo Duration Mismatch
**File**: `src/remotion/templates/social-promo/SocialPromo.tsx:14-17`
Total duration calculation: `HOOK(60) + PRODUCT_FLASH(90) + FEATURE_BURST(features.length * 30) + CTA(90)` = 240 + (features * 30) frames.
With 2 features = 300 frames (10s). With 4 features = 360 frames (12s).
But `src/lib/templates.ts:26` declares `defaultDurationSeconds: 20` and Root.tsx registers it with `durationInFrames: 20 * FPS = 600`.
The registered duration (600 frames) is always longer than the actual content (max 360 frames), leaving up to 8 seconds of dead frames (blank screen).

### 2.4 BrandStory Duration Mismatch
**File**: `src/remotion/templates/brand-story/BrandStory.tsx:14-17`
Total: `OPENING(150) + MILESTONE(max(120, milestones*60)) + TEAM(120) + VISION(150)` = 540 frames (18s) with 2 milestones.
But registered as 50s (1500 frames) in Root.tsx — over 30 seconds of dead frames.

### 2.5 Explainer Duration Mismatch
**File**: `src/remotion/templates/explainer/Explainer.tsx:13-15`
Total: `INTRO(120) + steps * STEP(240) + SUMMARY(180)` = 300 + (steps * 240) frames.
With 2 steps = 780 frames (26s), with 6 steps = 1740 frames (58s).
Registered as 50s (1500 frames) — could overflow with 6+ steps.

---

## 3. Error Handling Issues

### 3.1 processTemplateJob Swallows Content Extraction Errors
**File**: `src/queue/worker.ts` (processTemplateJob function)
If `extractYouTubeContent()` or `extractGitHubContent()` throws, the outer try/catch sets the job to "failed" — but the user-facing error message may be cryptic (e.g., "YOUTUBE_API_KEY is not set"). Should provide user-friendly messages for common failures.

### 3.2 Bot processAndSendVideo Fire-and-Forget
**File**: `src/lib/bot.ts:163`
```
processAndSendVideo(chatId, templateId, pending);
```
This is called without `await` and without `.catch()`. If it throws synchronously (unlikely but possible), the error is unhandled. Should add `.catch()` for safety.

### 3.3 Silent Failure in Gemini Template Content Generation
**File**: `src/lib/gemini.ts` (generateTemplateContent)
If Gemini returns malformed JSON that doesn't match the template schema, `schema.parse(parsed)` throws a Zod error. The error message will be Zod's verbose validation output, not a user-friendly message. Consider wrapping with a friendlier error.

---

## 4. Edge Cases

### 4.1 Empty Product Images Array
**File**: `src/remotion/templates/product-launch/ProductLaunch.tsx:29-30`
```
const showcaseImages = productImages.slice(0, 2);
```
If `productImages` is empty (which Gemini's PRODUCT_LAUNCH_PROMPT instructs: "Leave as empty array"), no ShowcaseScene renders. The BrandReveal at line 60 accesses `productImages[0]` which will be `undefined` — passed as `productImage` prop to `BrandReveal`, which may cause a Remotion render error if it tries to use `<Img>`.

### 4.2 Empty Product Image in Social Promo
**File**: `src/remotion/templates/social-promo/SocialPromo.tsx`
`productImage` is passed to `ProductFlash`. If it's an empty string (Gemini instructs "Leave as empty string"), the `<Img>` component in ProductFlash will likely fail to load, causing a render error.

### 4.3 Empty Team Photos in Brand Story
**File**: `src/remotion/templates/brand-story/BrandStory.tsx:52-53`
If `teamPhotos` is empty (Gemini instructs "Leave as empty array"), the TeamShowcase scene renders for 4 seconds with nothing to show.

### 4.4 SocialPromo aspectRatio Not Propagated to Root.tsx Composition
**File**: `src/remotion/Root.tsx:138-147`
SocialPromo is registered with fixed `width={1920} height={1080}`. The `renderTemplateVideo` in render.ts handles aspect ratio override at render time, but the Remotion Studio preview will always show 16:9 regardless of the `aspectRatio` prop.

### 4.5 Pending Inputs Never Expire
**File**: `src/lib/bot.ts:25`
`pendingInputs` map grows unbounded. If a user sends a prompt but never picks a template, the entry persists forever. Should implement TTL or max size.

---

## 5. Architecture Issues

### 5.1 Schema Duplication
There are three separate schema definitions for each template type:
- `src/lib/schemas.ts` (e.g., `ProductLaunchInputSchema`) — used by Gemini
- `src/remotion/templates/product-launch/schema.ts` (`ProductLaunchSchema`) — used by Remotion
- `src/lib/types.ts` (`ProductLaunchInput` interface) — TypeScript types

These can drift. The Remotion schemas include `musicUrl` which the lib schemas don't. The lib schemas include `.describe()` annotations that Remotion schemas omit. If a field is added to one, it must be manually synced to all three.

### 5.2 Gemini Prompts Tell AI to Leave Fields Empty
**File**: `src/lib/gemini.ts`
The template prompts instruct Gemini to return empty arrays/strings for image fields (e.g., "productImages: Leave as empty array"). This means the pipeline always requires a second step to merge user-provided assets. Consider not including these fields in the Gemini schema at all and merging them post-generation.

### 5.3 Template Worker Does Not Generate Veo Clips
**File**: `src/queue/worker.ts` (processTemplateJob)
The legacy pipeline generates Veo clips per scene. The template pipeline skips Veo entirely (despite `enableVeo` being accepted in the schema). The `enableVeo` option in `GenerateRequestSchema` is accepted but never acted upon in `processTemplateJob`.

### 5.4 Gemini Live Session Has No Reconnection Logic
**File**: `src/lib/gemini-live.ts:163-244`
The WebSocket session has `onclose` and `onerror` callbacks but no automatic reconnection. If the connection drops (common with long-running WebSocket sessions), the user must manually restart.

---

## 6. Type Safety Issues

### 6.1 Template Content Cast to Record in Worker
**File**: `src/queue/worker.ts` (processTemplateJob)
```
const enrichedContent = { ...templateContent } as Record<string, unknown>;
```
This casts away all type safety. The property assignments below (e.g., `enrichedContent.productImages = options.assets`) are unchecked. If assets are assigned to the wrong template type, it silently produces invalid data.

### 6.2 Render Props Double Cast
**File**: `src/lib/render.ts:59`
```
const props = inputProps as unknown as Record<string, unknown>;
```
The `unknown` intermediate cast is a code smell indicating the type system doesn't naturally accommodate Remotion's expected prop type. Consider using Remotion's generic `SerializedInputProps` type.

### 6.3 GenerateRequest Type vs Schema Mismatch
**File**: `src/lib/types.ts:132-136` vs `src/lib/schemas.ts:57-61`
The `GenerateRequest` interface has `templateId?: TemplateId` but the schema has `.default("product-launch")` — meaning after schema parsing, `templateId` is always defined but the TypeScript type says it's optional. Consumer code must handle both cases.

---

## 7. Design Consistency Issues

### 7.1 Inconsistent Background Colors
- ProductLaunch: `#faf8f5` (warm white)
- Explainer: `#1a1a4e` (dark blue gradient)
- SocialPromo: `#0a0a0a` (near-black)
- BrandStory: `#1a1510` (dark brown)

This is intentional per-template differentiation, which is fine. But scene components within templates don't always match their parent's background. For example, ProductLaunch scenes use `#faf8f5` (good), but the Explainer gradient is hardcoded in each scene separately (fragile — changing the gradient requires updating 4 files).

### 7.2 Font Sizes Not Responsive to Aspect Ratio
All templates use absolute pixel font sizes (e.g., `fontSize: 72`). When SocialPromo renders at 9:16 (1080x1920), the same font sizes will appear proportionally smaller relative to the viewport height. Text may look undersized on vertical video.

### 7.3 StepScene Progress Bar Uses CSS Transition
**File**: `src/remotion/templates/explainer/scenes/StepScene.tsx:100`
```
transition: "width 0.3s",
```
CSS transitions don't work in Remotion's server-side renderer. The progress bar width should be animated using Remotion's `interpolate` or `spring` instead of CSS transitions.

---

## Summary

**Critical** (should fix before shipping):
- 2.1: Bundle caching — renders will be 10x slower than necessary
- 2.3/2.4/2.5: Duration mismatches — dead frames or content overflow
- 4.1/4.2: Empty image fields cause render failures
- 7.3: CSS transition doesn't work in Remotion renderer

**Important** (fix soon):
- 1.2: No URL validation on assets
- 3.2: Unhandled promise in bot
- 4.5: Pending inputs memory leak
- 5.1: Schema duplication risks drift
- 5.3: enableVeo flag is dead code

**Minor** (clean up when convenient):
- 2.2: Duplicate import
- 1.1: Bot token assertion
- 6.3: Type/schema mismatch
- 7.1/7.2: Design consistency

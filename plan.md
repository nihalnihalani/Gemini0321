# AI Video Generator — Comprehensive Implementation Plan

## 1. Project Vision

Build a Next.js web application that generates fully composed, AI-powered videos from a single text prompt. The user provides a topic, and the system generates a scene-by-scene video with AI-generated clips, visual assets, background music, text overlays, and captions — exported as a final MP4.

---

## 2. Architecture Overview

### Approach A: Remotion + Gemini Ecosystem

```
User Prompt
    |
    v
[Gemini 2.5 Flash] -- Structured scene-by-scene script (JSON via Zod schema)
    |
    +---> [Nano Banan Pro] -- Keyframe images, title cards, overlays (per scene)
    |
    +---> [Veo 3.1] -- AI video clips (per scene, 4-8 seconds each)
    |
    +---> [Lyria 2 / RealTime] -- Background music / soundtrack
    |
    v
[Asset Storage (S3/GCS/R2)] -- Download & host all generated assets
    |
    v
[Remotion Composition] -- Compose: Veo clips + Nano Banan assets + text overlays + Lyria audio
    |
    +---> [<Player>] -- In-browser preview
    |
    +---> [renderMedia() via Job Queue] -- Server-side MP4 export
    |
    v
Final MP4 delivered to user
```

### Core Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js (App Router) | UI, API routes, hosting |
| Video Composition | Remotion | Compose clips, overlays, audio; preview & export |
| Script Generation | Gemini 2.5 Flash | Structured scene scripts via Zod schemas |
| Image Generation | Nano Banan Pro (`gemini-3-pro-image-preview`) | Keyframes, title cards, transparent overlays |
| Video Generation | Veo 3.1 (`veo-3.1-generate-preview` / `veo-3.1-fast-generate-preview`) | AI video clips per scene |
| Music Generation | Lyria 2 (`lyria-002` on Vertex AI) / Lyria RealTime (experimental) | Background soundtrack |
| Asset Storage | S3 / GCS / Cloudflare R2 | Store downloaded Veo clips, images, audio |
| Job Queue | BullMQ + Redis | Orchestrate async pipeline & render jobs |
| SDK | `@google/genai` | Unified SDK for Gemini, Veo, Nano Banan Pro |

---

## 3. Detailed Component Specifications

### 3.1 Script Generation — Gemini 2.5 Flash

**Model:** `gemini-2.5-flash` (GA, free tier available)
**Pricing:** $0.30 input / $2.50 output per 1M tokens (~$0.01 per script)

**Structured Output Schema (Zod):**

```typescript
import { z } from "zod";

const SceneSchema = z.object({
  scene_number: z.number(),
  title: z.string().describe("Short scene title"),
  visual_description: z.string().describe("Detailed visual description for Veo video prompt"),
  image_prompt: z.string().describe("Prompt for Nano Banan Pro keyframe/overlay generation"),
  narration_text: z.string().describe("Narration or caption text for this scene"),
  duration_seconds: z.number().min(4).max(8).describe("Scene duration (4, 6, or 8 seconds)"),
  camera_direction: z.string().describe("Camera movement: pan, zoom, static, tracking, etc."),
  mood: z.string().describe("Emotional tone: dramatic, upbeat, calm, tense, etc."),
  transition: z.enum(["cut", "fade", "dissolve", "wipe"]).describe("Transition to next scene"),
});

const ScriptSchema = z.object({
  title: z.string(),
  theme: z.string().describe("Overall theme/genre of the video"),
  target_audience: z.string(),
  music_prompt: z.string().describe("Prompt for Lyria background music generation"),
  scenes: z.array(SceneSchema).min(3).max(8),
  total_duration_seconds: z.number(),
});
```

**API Call Pattern:**

```typescript
import { GoogleGenAI } from "@google/genai";
import { zodToJsonSchema } from "zod-to-json-schema";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: `Generate a cinematic video script about: ${userPrompt}`,
  config: {
    responseMimeType: "application/json",
    responseJsonSchema: zodToJsonSchema(ScriptSchema),
  },
});

const script = ScriptSchema.parse(JSON.parse(response.text));
```

**Important Notes:**
- Gemini 2.0 models retiring June 1, 2026 — do NOT use them
- Property ordering in output matches schema key ordering (Gemini 2.5+)
- Free tier available for development

---

### 3.2 Image Generation — Nano Banan Pro

**Model:** `gemini-3-pro-image-preview` (or faster variant `gemini-3.1-flash-image`)
**Pricing:** $0.134/image (1K/2K), $0.24/image (4K)

**Capabilities:**
- Text-to-image with industry-leading text rendering
- Up to 4K resolution
- Transparent background generation (for overlays)
- Multi-image blending (up to 14 reference images)
- Identity preservation across up to 5 subjects

**Role in Pipeline:**
- Generate keyframe images per scene (can be used as Veo reference frames)
- Generate title cards and intro/outro frames with legible text
- Generate transparent overlay assets (logos, lower-thirds, watermarks)
- NOT a video model — purely for static visual assets

**API Call Pattern:**

```typescript
const response = await ai.models.generateContent({
  model: "gemini-3-pro-image-preview",
  contents: [{ text: scene.image_prompt }],
});
// Extract image from response, upload to asset storage
```

**Limitations:**
- All outputs watermarked (visible + SynthID)
- Aggressive content filtering (famous IP, safety policies)
- Consistency drift across multiple generations
- Fine detail struggles with complex scenes
- Billing must be enabled (no free tier on Google Cloud)

---

### 3.3 Video Generation — Veo 3.1

**Models:**

| Model | ID | Cost | Best For |
|-------|-----|------|----------|
| Veo 3.1 Standard | `veo-3.1-generate-preview` | $0.40/sec | Final quality |
| Veo 3.1 Fast | `veo-3.1-fast-generate-preview` | $0.15/sec | Development, iteration |
| Veo 3 | `veo-3-generate` | $0.40/sec | Stable fallback |

**Specifications:**

| Spec | Options |
|------|---------|
| Duration | 4, 6, or 8 seconds per clip |
| Resolution | 720p (default), 1080p, 4K |
| Aspect Ratio | 16:9 (landscape), 9:16 (portrait) |
| Frame Rate | 24 fps |
| Audio | Native audio generation (Veo 3+) |
| Extensions | Up to 20 extensions (+7 sec each, max ~148 sec total) |

**Async Generation Workflow:**

```typescript
// 1. Submit generation job
let operation = await ai.models.generateVideos({
  model: "veo-3.1-fast-generate-preview",  // Use fast for dev
  prompt: scene.visual_description,
  config: {
    aspectRatio: "16:9",
    resolution: "720p",
    numberOfVideos: 1,
    personGeneration: "allow_all",
  },
});

// 2. Poll until complete (10-second intervals)
while (!operation.done) {
  await new Promise((resolve) => setTimeout(resolve, 10000));
  operation = await ai.operations.getVideosOperation({ operation });
}

// 3. Download immediately (48-hour retention!)
const videoFile = operation.response.generatedVideos[0].video;
await ai.files.download({
  file: videoFile,
  downloadPath: `./tmp/${scene.scene_number}.mp4`,
});

// 4. Upload to persistent storage (S3/GCS/R2)
const permanentUrl = await uploadToStorage(`./tmp/${scene.scene_number}.mp4`);
```

**Critical Limitations & Gotchas:**
1. **48-hour retention** — Videos deleted after 2 days. MUST download immediately and re-host.
2. **8-second max per clip** — Longer scenes need video extension (adds 7s per hop, max 20 extensions)
3. **Latency variance** — 11 seconds to 6 minutes per clip. Pipeline bottleneck.
4. **Text rendering is poor** — Avoid prompts requiring readable text in video. Use Remotion text overlays instead.
5. **Hand/finger anomalies** — Fine motor details look unnatural in close-ups.
6. **Safety filters are aggressive** — Words like "fire", "shot", "strike" can trigger rejection. Have prompt sanitization.
7. **Only 1 video per request** — Cannot batch.
8. **personGeneration required** — Must set to "allow_all" for text-to-video.
9. **No free tier** — Every API call is billed.
10. **Video extensions limited to 720p** — Cannot extend at higher resolutions.
11. **SynthID watermark** — All outputs watermarked.

**Cost Estimates:**

| Scenario | Calculation | Total |
|----------|-------------|-------|
| 5 scenes x 6s (Fast, 720p) | 30s x $0.15 | $4.50 |
| 5 scenes x 8s (Fast, 720p) | 40s x $0.15 | $6.00 |
| 5 scenes x 6s (Standard, 720p) | 30s x $0.40 | $12.00 |
| 5 scenes x 8s (Standard, 1080p) | 40s x $0.40 | $16.00 |

---

### 3.4 Music Generation — Lyria

**Current API Options (March 2026):**

| Model | Access | Quality | Features | Price | Status |
|-------|--------|---------|----------|-------|--------|
| Lyria 3 | Gemini App only | Best | Vocals, lyrics, multilingual | Free (consumer) | **NO API** |
| Lyria 2 | Vertex AI API | Good | Instrumental only | $0.06/30s clip | Production (allowlist) |
| Lyria RealTime | Gemini API v1alpha | Streaming | Real-time steering | Free | Experimental |

**Recommended: Lyria 2 on Vertex AI for v1**

```
POST https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/publishers/google/models/lyria-002:predict
```

- Input: text prompt, optional negative_prompt, optional seed
- Output: base64-encoded WAV, 30 seconds, 48 kHz, instrumental only
- Requires allowlist request (not instant self-service)

**Lyria RealTime API (Alternative / Experimental):**

```
WebSocket: wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateMusic
Model: models/lyria-realtime-exp
```

- Generates continuous streaming music in 2-second chunks at 48kHz stereo
- Real-time steering: change genre, instruments, mood, key, tempo on the fly
- Currently free
- Best for: interactive use, not batch video rendering

**30-Second Limit Problem:**
- All Lyria models cap at 30 seconds per generation
- For videos > 30 seconds: generate multiple clips with matching style prompts
- Use Remotion's `<Audio>` crossfading to blend clips at transitions
- Alternative: use royalty-free music library as fallback

**Specifications:**
- Audio Quality: 24-bit, 48 kHz sample rate
- Duration: 30 seconds max per generation
- Output: WAV (Lyria 2) or streaming chunks (RealTime)
- Languages: 8 languages for vocals (Lyria 3 only, no API)

---

### 3.5 Video Composition — Remotion

**Core Architecture:**

```
remotion/
  Root.tsx                    # registerRoot() entry point
  compositions/
    AIVideo.tsx               # Main composition: assembles scenes
  sequences/
    SceneSequence.tsx          # Single scene: Veo clip + overlay
    TitleSequence.tsx          # Intro title card (Nano Banan image)
    OutroSequence.tsx          # Outro/credits
  components/
    TextOverlay.tsx            # Animated text/caption overlay
    CaptionRenderer.tsx        # Word-by-word captions
    TransitionEffect.tsx       # Scene transitions (fade, dissolve)
```

**Key Remotion APIs:**

| API | Purpose |
|-----|---------|
| `<Composition>` | Register a video with id, component, dimensions, fps, duration |
| `<Sequence>` / `<Series>` | Time-shift scenes, arrange clips back-to-back |
| `<OffthreadVideo src={url}>` | Embed Veo video clips (supports remote URLs) |
| `<Audio src={url}>` | Embed Lyria music tracks (supports remote URLs) |
| `interpolate()` | Animate CSS properties (opacity, position, scale) |
| `spring()` | Natural bounce animations |
| `calculateMetadata()` | Dynamically compute duration from AI-generated content |
| `<Player>` | In-browser preview component |
| `renderMedia()` | Server-side MP4 export |

**Composition Pattern:**

```tsx
import { AbsoluteFill, Sequence, OffthreadVideo, Audio, useCurrentFrame, interpolate } from "remotion";

const AIVideo: React.FC<{ script: Script }> = ({ script }) => {
  let currentFrame = 0;

  return (
    <AbsoluteFill>
      {/* Background music (full duration) */}
      <Audio src={script.musicUrl} volume={0.3} />

      {/* Scenes arranged sequentially */}
      {script.scenes.map((scene, i) => {
        const durationInFrames = scene.duration_seconds * 30; // 30fps
        const from = currentFrame;
        currentFrame += durationInFrames;

        return (
          <Sequence key={i} from={from} durationInFrames={durationInFrames}>
            {/* Veo video clip */}
            <OffthreadVideo src={scene.videoUrl} />

            {/* Text overlay with animation */}
            <TextOverlay text={scene.narration_text} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
```

**Dynamic Duration with calculateMetadata():**

```tsx
<Composition
  id="AIVideo"
  component={AIVideo}
  fps={30}
  width={1920}
  height={1080}
  calculateMetadata={async ({ props }) => {
    const totalSeconds = props.script.scenes.reduce(
      (sum, s) => sum + s.duration_seconds, 0
    );
    return { durationInFrames: totalSeconds * 30 };
  }}
/>
```

**Configuration Defaults:**
- Resolution: 1920x1080 (1080p)
- Frame Rate: 30 fps
- Codec: h264 (MP4)
- Image Format: jpeg (faster than png unless transparency needed)

**Licensing:**
- Free for individuals and teams of 3 or fewer
- Company License (4+ people): $25/month per developer, minimum $100/month

---

### 3.6 Asset Storage (REQUIRED)

**Problem:** Veo deletes generated videos after 48 hours. All assets must be downloaded and re-hosted immediately.

**Recommended: Cloudflare R2** (S3-compatible, no egress fees)

**Storage Pipeline:**
1. Veo generates clip -> download to temp directory
2. Upload to R2/S3/GCS -> get permanent public URL
3. Pass permanent URL to Remotion's `<OffthreadVideo src={permanentUrl}>`
4. Same for Nano Banan Pro images and Lyria audio
5. Clean up temp directory
6. Set TTL on stored assets (7-30 days) to manage costs

**Estimated Storage per Video:**
- 5 Veo clips (6s each, 720p): ~50-100 MB
- 5 Nano Banan images: ~5-10 MB
- 1 Lyria audio clip: ~5 MB
- Final rendered MP4: ~30-60 MB
- **Total: ~100-175 MB per video**

---

### 3.7 Job Queue & Pipeline Orchestration

**Problem:** The pipeline is async (Veo polling), CPU-intensive (Remotion rendering), and multi-step. A simple API route cannot handle this.

**Recommended: BullMQ + Redis**

**Job Flow:**

```
[API Route: POST /api/generate]
    |
    v
[Job: generate-script] -- Gemini 2.5 Flash
    |
    v (on completion)
[Jobs: generate-assets] -- Parallel:
    +-- [generate-image-1..N] -- Nano Banan Pro (per scene)
    +-- [generate-video-1..N] -- Veo 3.1 (per scene, with polling)
    +-- [generate-music]      -- Lyria 2
    |
    v (when all assets ready)
[Job: compose-video] -- Remotion renderMedia()
    |
    v
[Job: deliver] -- Notify user, provide download URL
```

**Progress Updates:**
- WebSocket connection from client to server
- Each job emits progress events (% complete, current step)
- Client shows real-time progress UI with scene-by-scene status

---

## 4. Risk Analysis & Mitigations

### 4.1 Showstoppers Identified

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | **Visual consistency across Veo clips** — characters, lighting, color grading vary between scenes | Critical | Constrain v1 to abstract/motion-graphics style; use consistent Remotion color grading overlays; explore Veo image-to-video anchoring; add style-locking prompt patterns |
| 2 | **Lyria API uncertainty** — no Lyria 3 API, Lyria 2 requires allowlist, RealTime is v1alpha | High | Default to royalty-free music library for v1; Lyria as premium opt-in; monitor Lyria 3 API announcement |
| 3 | **48-hour Veo retention** — clips deleted if not downloaded | High | Immediate download + upload to R2/S3 in pipeline; retry logic; never reference Veo URLs in Remotion |
| 4 | **Rendering infrastructure** — renderMedia() too heavy for serverless | High | Dedicated render worker (VM with 8GB+ RAM); or Remotion Lambda; never render in Next.js API routes |

### 4.2 Serious Risks

| # | Risk | Impact | Mitigation |
|---|------|--------|------------|
| 1 | **Cost: $5-13+ per video** | Freemium model not viable | Charge per video ($2-5 markup); tiered pricing; per-user daily limits; use Veo Fast for drafts |
| 2 | **Latency: 1-10 minutes** | Poor UX, user abandonment | Async UX (email/push notification when ready); real-time progress via WebSocket; parallelize all asset generation |
| 3 | **Veo vendor lock-in** | No fallback if Veo goes down | Abstract video generation behind interface; monitor Runway/Kling as potential fallbacks |
| 4 | **Architecture complexity** | Development overhead, debugging difficulty | Phase the rollout (see Section 6); start with Gemini + Veo + Remotion only |

### 4.3 SynthID Watermarking

All AI-generated content (Nano Banan images, Veo clips) contains SynthID watermarks:
- Invisible to humans in most cases
- Detectable by Google's classifier
- Cannot be reliably removed
- **Commercial impact:** Must disclose to users that content is AI-generated. Not a blocker for social media / marketing use cases. May be a concern for broadcast / professional video.

---

## 5. Cost Model

### Per-Video Cost Breakdown (5 scenes, 6 seconds each, Fast tier)

| Component | Cost |
|-----------|------|
| Gemini 2.5 Flash (script) | $0.01 |
| Nano Banan Pro (5 keyframes) | $0.67 |
| Veo 3.1 Fast (30 sec total) | $4.50 |
| Lyria 2 (1 music clip) | $0.06 |
| R2 Storage (~150 MB, 30 days) | $0.002 |
| Compute (render worker) | ~$0.10 |
| **Total API + Infrastructure** | **~$5.34** |

### Suggested Pricing Tiers

| Tier | Price | Includes | Margin |
|------|-------|----------|--------|
| Free Trial | $0 | 1 video (720p, 3 scenes) | Loss leader (~$2.50) |
| Basic | $9.99/mo | 5 videos (720p) | ~$24 margin |
| Pro | $29.99/mo | 20 videos (1080p) | ~$60 margin |
| Pay-as-you-go | $3.99/video | 1 video (720p) | ~$1.50 margin |

---

## 6. Phased Implementation Roadmap

### Phase 1: Core Pipeline (MVP)

**Goal:** Text prompt -> AI video with clips and text overlays -> MP4 download

**Components:**
- Next.js App Router (UI + API routes)
- Gemini 2.5 Flash (script generation with Zod schema)
- Veo 3.1 Fast (video clip generation, 720p)
- Remotion (composition + rendering)
- Asset storage (R2 or S3)
- Basic job queue (BullMQ + Redis)

**NOT included in Phase 1:** Nano Banan Pro, Lyria, advanced overlays

**Deliverables:**
- [ ] Next.js project setup with Remotion integration
- [ ] Gemini script generation API route with Zod schema
- [ ] Veo video generation with async polling + download pipeline
- [ ] Asset storage upload/retrieval (R2)
- [ ] Remotion composition: Veo clips + basic text overlays
- [ ] Remotion Player preview in browser
- [ ] BullMQ job queue for pipeline orchestration
- [ ] Render worker (dedicated process or Lambda)
- [ ] Basic progress UI (WebSocket)
- [ ] MP4 download endpoint

### Phase 2: Visual Assets & Polish

**Goal:** Add AI-generated images, better overlays, captions, transitions

**Components:**
- Nano Banan Pro (keyframe images, title cards, transparent overlays)
- Enhanced Remotion compositions (animated captions, transitions, intro/outro)
- Style consistency improvements (prompt engineering, color grading overlays)

**Deliverables:**
- [ ] Nano Banan Pro integration for keyframe generation
- [ ] Title card / intro sequence using Nano Banan images
- [ ] Animated caption system (word-by-word, TikTok-style)
- [ ] Scene transition effects (fade, dissolve, wipe)
- [ ] Consistent color grading overlay across all scenes
- [ ] Image-to-video anchoring exploration (Veo reference frames)

### Phase 3: Audio & Music

**Goal:** Add AI-generated background music and sound design

**Components:**
- Lyria 2 (Vertex AI) or Lyria RealTime for background music
- Royalty-free music library as fallback
- Audio mixing in Remotion (music + narration + Veo native audio)

**Deliverables:**
- [ ] Lyria 2 integration (Vertex AI allowlist request)
- [ ] Music generation from script mood/theme
- [ ] Audio mixing: background music volume ducking under narration
- [ ] Fallback: curated royalty-free music library
- [ ] Handle 30-second limit (crossfade multiple clips for longer videos)
- [ ] Explore Lyria RealTime API for continuous soundtrack

### Phase 4: Scale & Production

**Goal:** Handle concurrent users, cost controls, production hardening

**Deliverables:**
- [ ] Render queue scaling (multiple workers, auto-scaling)
- [ ] Per-user generation limits and usage tracking
- [ ] Stripe billing integration (subscription + pay-per-video)
- [ ] CDN for delivered videos
- [ ] Error recovery (retry failed scenes, partial regeneration)
- [ ] Monitoring & alerting (API costs, failure rates, latency)
- [ ] Asset cleanup (TTL-based deletion of stored clips)
- [ ] Rate limit handling for all external APIs

---

## 7. Project Structure

```
src/
  app/
    page.tsx                          # Landing page / prompt input
    generate/
      page.tsx                        # Generation progress & preview page
    api/
      generate/
        route.ts                      # POST: Start video generation pipeline
      status/
        [jobId]/
          route.ts                    # GET: Poll job status
      download/
        [videoId]/
          route.ts                    # GET: Download final MP4
  components/
    PromptInput.tsx                    # User prompt input form
    GenerationProgress.tsx            # Real-time progress UI
    VideoPreview.tsx                   # Remotion Player wrapper
    SceneCard.tsx                      # Individual scene preview card
  remotion/
    Root.tsx                          # Remotion registerRoot()
    compositions/
      AIVideo.tsx                     # Main video composition
    sequences/
      SceneSequence.tsx               # Scene: Veo clip + overlay
      TitleSequence.tsx               # Intro title card
      OutroSequence.tsx               # Outro/credits
    components/
      TextOverlay.tsx                 # Animated text overlay
      CaptionRenderer.tsx             # Word-by-word captions
      TransitionEffect.tsx            # Scene transitions
  lib/
    gemini.ts                         # Gemini API client + prompt templates
    veo.ts                            # Veo API client + polling logic
    nano-banan.ts                     # Nano Banan Pro client
    lyria.ts                          # Lyria API client
    storage.ts                        # R2/S3 upload/download
    types.ts                          # Shared TypeScript types (Script, Scene)
    schemas.ts                        # Zod schemas for structured output
  queue/
    worker.ts                         # BullMQ worker process
    jobs/
      generate-script.ts              # Gemini script generation job
      generate-video.ts               # Veo video generation job
      generate-image.ts               # Nano Banan Pro image job
      generate-music.ts               # Lyria music generation job
      compose-video.ts                # Remotion renderMedia job
      deliver.ts                      # Final delivery job
  styles/
    globals.css                       # Global styles / Tailwind
remotion.config.ts                    # Remotion bundler configuration
docker-compose.yml                    # Redis + render worker
```

---

## 8. Dependencies

```json
{
  "dependencies": {
    "next": "^15",
    "react": "^19",
    "react-dom": "^19",
    "remotion": "^4",
    "@remotion/cli": "^4",
    "@remotion/renderer": "^4",
    "@remotion/player": "^4",
    "@remotion/bundler": "^4",
    "@google/genai": "latest",
    "zod": "^3",
    "zod-to-json-schema": "^3",
    "bullmq": "^5",
    "ioredis": "^5",
    "@aws-sdk/client-s3": "^3",
    "tailwindcss": "^4"
  }
}
```

---

## 9. Environment Variables

```env
# Google AI
GEMINI_API_KEY=                       # Google AI Studio API key (Gemini + Veo + Nano Banan)

# Vertex AI (for Lyria 2)
GOOGLE_CLOUD_PROJECT_ID=
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=       # Service account JSON path

# Asset Storage (R2 example)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

# Redis (for BullMQ)
REDIS_URL=redis://localhost:6379

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 10. Key API Reference

| API | SDK | Model ID | Endpoint |
|-----|-----|----------|----------|
| Gemini 2.5 Flash | `@google/genai` | `gemini-2.5-flash` | `ai.models.generateContent()` |
| Nano Banan Pro | `@google/genai` | `gemini-3-pro-image-preview` | `ai.models.generateContent()` |
| Nano Banan 2 (faster) | `@google/genai` | `gemini-3.1-flash-image` | `ai.models.generateContent()` |
| Veo 3.1 Standard | `@google/genai` | `veo-3.1-generate-preview` | `ai.models.generateVideos()` |
| Veo 3.1 Fast | `@google/genai` | `veo-3.1-fast-generate-preview` | `ai.models.generateVideos()` |
| Lyria 2 | Vertex AI REST | `lyria-002` | Vertex AI predict endpoint |
| Lyria RealTime | `@google/genai` | `lyria-realtime-exp` | WebSocket streaming |

---

## 11. Devil's Advocate Summary

### What Could Go Wrong

1. **Visual inconsistency is the #1 product risk.** Each Veo clip is generated independently — characters, lighting, and style will vary across scenes. No proven solution exists today. Mitigation: constrain to motion-graphics/abstract style for v1, or invest in prompt engineering for style-locking.

2. **$5-13 per video makes free tiers impossible.** Must charge from day one or eat costs. This is a premium product, not a mass-market tool.

3. **1-10 minute generation time.** Users will not wait on a loading spinner. Must design for async delivery (email/push notification when ready) with real-time progress updates.

4. **Veo is a single point of failure.** No alternative AI video API at comparable quality/price. If Veo goes down, pricing changes, or rate limits tighten, the product is blocked.

5. **Lyria is not production-ready for this use case.** Lyria 3 has no API. Lyria 2 needs allowlist approval and is instrumental-only. RealTime is experimental. Default to royalty-free music.

6. **renderMedia() cannot run in serverless.** Need a dedicated render worker or Remotion Lambda. This adds infrastructure complexity.

7. **7 external dependencies for the full pipeline.** Start with 3 (Gemini + Veo + Remotion) and add incrementally.

### What's Surprisingly Strong

1. **Single SDK** (`@google/genai`) covers Gemini, Veo, and Nano Banan Pro. Clean integration.
2. **Remotion's AI support** is excellent — official LLM prompts, agent skills, calculateMetadata for dynamic content.
3. **Veo 3.1 Fast at $0.15/sec** is competitively priced for AI video.
4. **Gemini structured output with Zod** is reliable and well-documented.
5. **The phased approach** (MVP with 3 deps, then add) manages complexity well.

---

## 12. Success Criteria

### MVP (Phase 1)
- [ ] User can enter a text prompt and receive a composed MP4 video
- [ ] Video contains 3-5 AI-generated scenes with text overlays
- [ ] Generation completes within 5 minutes (p90)
- [ ] Real-time progress shown to user
- [ ] Video preview available before download
- [ ] All assets stored persistently (not reliant on Veo 48h retention)

### Production (Phase 4)
- [ ] Supports 50+ concurrent users
- [ ] Per-user billing and usage limits
- [ ] Average cost per video under $6
- [ ] Generation failure rate under 5%
- [ ] Automated retry for failed scenes
- [ ] Music integration (Lyria or royalty-free fallback)

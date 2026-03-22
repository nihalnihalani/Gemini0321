# Remotion-Core Video Generator v2 — Design Document

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the video generator with Remotion as the core motion graphics engine, 4 templates, Gemini Live chat, content extraction from YouTube/GitHub, optional Veo finale, and Telegram bot with inline keyboards.

**Architecture:** Remotion composes all video via React components (animated text, product showcases, transitions). Gemini generates structured content per template schema. Lyria RealTime generates background music. Veo is an optional cinematic finale. Gemini Live enables conversational editing with function calling.

**Tech Stack:** Next.js, Remotion, Google Gemini API, Gemini Live API, Lyria RealTime, Veo 3.1, ElevenLabs, Supabase Storage, BullMQ/Redis, Telegram Bot API

---

## 1. Architecture

```
Input Layer (Web UI / Telegram Bot / Gemini Live Chat)
    |
Content Extraction
  - Text prompt -> Gemini generates structured content
  - YouTube link -> Extract metadata/thumbnails via API
  - GitHub link -> Extract README/description/stats via API
  - Uploads/URLs -> Store in Supabase
    |
Template Engine
  - Product Launch (kinetic text + product images + brand reveal)
  - Explainer (step-by-step + animated diagrams + flow)
  - Social Media Promo (bold text, fast cuts, 9:16 support)
  - Brand Story (narrative arc + team photos + mission)
    |
Remotion Composition (React components)
  - Animated text sequences
  - Image/asset placement with motion
  - Transitions
  - [Optional] Veo cinematic finale clip
  - Lyria RealTime background music
    |
renderMedia -> MP4 -> Supabase -> Download
```

## 2. Template System

Each template has: schema (required inputs), composition (React), scene sequences.

### Product Launch
- Schema: brandName, tagline, productImages[], features[], brandColor
- Scenes: IntroText -> FeatureHighlights -> ProductShowcase -> BrandReveal
- Duration: 30-45s

### Explainer
- Schema: title, steps[], diagrams[], conclusion
- Scenes: TitleIntro -> StepByStep (animated) -> DiagramScene -> Summary
- Duration: 45-60s

### Social Media Promo
- Schema: hook, productImage, cta, aspectRatio (16:9 or 9:16)
- Scenes: HookText -> ProductFlash -> FeatureBurst -> CTA
- Duration: 15-30s

### Brand Story
- Schema: companyName, mission, teamPhotos[], milestones[], vision
- Scenes: OpeningNarrative -> MilestoneTimeline -> TeamShowcase -> VisionStatement
- Duration: 45-60s

## 3. Content Extraction

- YouTube: YouTube Data API v3 (videos.list) -> title, description, thumbnails
- GitHub: REST API (/repos/:owner/:repo) + raw README -> name, description, features, stats
- Uploads: Supabase Storage -> public URLs
- URLs: Fetch and store in Supabase

## 4. Gemini Live Chat

- Model: gemini-live-2.5-flash-preview
- Chat-first with optional voice (mic button)
- Function calling tools: updateScene, changeStyle, addAsset, switchTemplate, regenerateMusic, toggleVeoFinale
- Real-time preview via Remotion Player

## 5. Telegram Bot

- Inline keyboard template selection after user sends prompt/link
- Stage update messages during generation
- Asset uploads supported (images sent before/after prompt)
- Video file + download link sent on completion

## 6. File Structure

```
src/
  remotion/
    templates/
      product-launch/
        schema.ts
        ProductLaunch.tsx
        scenes/ (IntroScene, FeatureScene, ShowcaseScene, BrandReveal)
      explainer/
        schema.ts
        Explainer.tsx
        scenes/
      social-promo/
        schema.ts
        SocialPromo.tsx
        scenes/
      brand-story/
        schema.ts
        BrandStory.tsx
        scenes/
      shared/
        KineticText.tsx
        ProductShowcase.tsx
        StatsCounter.tsx
        LogoReveal.tsx
        BackgroundMusic.tsx
        SlideTransition.tsx
    components/ (existing, enhanced)
    Root.tsx (updated with template compositions)
    index.ts
  lib/
    gemini.ts (updated - per-template content generation)
    gemini-live.ts (NEW - live session with function calling)
    veo.ts (kept - optional finale)
    lyria.ts (kept - working)
    youtube.ts (NEW - YouTube metadata extraction)
    github.ts (NEW - GitHub repo extraction)
    templates.ts (NEW - template registry)
    bot.ts (updated - inline keyboards + templates)
    types.ts (updated - template types)
    schemas.ts (updated - template schemas)
    render.ts (updated - template-aware rendering)
    storage.ts (kept)
  app/
    api/
      generate/route.ts (updated - accepts template + source)
      live/route.ts (NEW - WebSocket for Gemini Live)
    page.tsx (updated - template picker UI)
    generate/page.tsx (updated - template-aware preview)
  components/
    TemplatePicker.tsx (NEW)
    LiveChat.tsx (NEW - Gemini Live chat panel)
    AssetUploader.tsx (NEW)
    PromptInput.tsx (updated - link detection)
```

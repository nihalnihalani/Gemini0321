import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import {
  ScriptSchema,
  ProductLaunchInputSchema,
  ExplainerInputSchema,
  SocialPromoInputSchema,
  BrandStoryInputSchema,
} from "./schemas";
import type {
  Script,
  TemplateId,
  SourceType,
  TemplateInput,
  ProductLaunchInput,
  ExplainerInput,
  SocialPromoInput,
  BrandStoryInput,
} from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// Legacy script generation prompt
const SYSTEM_PROMPT = `You are a professional cinematic video script writer. Your job is to generate structured video scripts for AI-powered video generation.

When given a topic or concept, create a compelling, visually rich video script. Each scene must have:
- A vivid, detailed visual description suitable for AI video generation (include setting, subjects, actions, lighting, colors, atmosphere)
- Concise narration text for voiceover or captions
- Appropriate camera direction (wide shot, close-up, tracking shot, slow pan, aerial, etc.)
- A mood that matches the scene's emotional tone
- A duration between 4 and 8 seconds
- A transition type to the next scene (cut, fade, dissolve, or wipe)

Guidelines:
- Create a cohesive narrative arc across all scenes
- Vary camera angles and movements for visual interest
- Make visual descriptions specific and concrete, not abstract
- Keep narration concise and impactful
- Ensure total_duration_seconds equals the sum of all scene durations
- Scene numbers must be sequential starting from 1
- Choose a fitting title, theme, target audience, and music prompt for the overall video`;

// Template-specific system prompts
const PRODUCT_LAUNCH_PROMPT = `You are a creative director specializing in product launch videos. Given information about a product or brand, generate structured content for a kinetic, high-energy product launch video.

Extract or generate:
- brandName: The product or brand name
- tagline: A punchy, memorable tagline or slogan (max 10 words)
- productImages: Leave as empty array (images provided separately)
- features: 2-6 key product features as short, impactful phrases
- brandColor: A hex color that fits the brand's identity (e.g. "#FF6B00")
- logoUrl: Leave empty (provided separately)

Guidelines:
- Features should be benefit-focused, not technical specs
- Tagline should be action-oriented and memorable
- If the source content mentions specific features, prioritize those
- Brand color should evoke the right emotion for the product category`;

const EXPLAINER_PROMPT = `You are an educational content designer specializing in explainer videos. Given a topic or content, generate structured content for a step-by-step animated explainer video.

Extract or generate:
- title: A clear, engaging title for the video
- steps: 2-6 logical steps that explain the concept, each with:
  - title: Short step title (3-5 words)
  - description: Clear explanation of this step (1-2 sentences)
  - iconUrl: Leave empty (generated separately)
- conclusion: A concise summary or takeaway message (1-2 sentences)

Guidelines:
- Steps should follow a logical progression
- Each step should build on the previous one
- Use simple, accessible language
- The conclusion should reinforce the key message
- If the source has a natural structure (numbered list, timeline), follow it`;

const SOCIAL_PROMO_PROMPT = `You are a social media content strategist specializing in short-form promotional videos. Given product or brand information, generate structured content for a bold, fast-paced promo clip.

Extract or generate:
- hook: An attention-grabbing opening line (max 8 words, designed to stop scrolling)
- productImage: Leave as empty string (provided separately)
- features: 2-4 quick feature highlights as punchy phrases (3-5 words each)
- cta: A clear call-to-action (e.g. "Shop Now", "Try Free Today", "Learn More")
- aspectRatio: "16:9" for landscape, "9:16" for vertical/stories

Guidelines:
- Hook must create curiosity or urgency
- Features should be scannable in under 2 seconds each
- CTA should be direct and action-oriented
- Default to "16:9" unless the content suggests mobile/stories format`;

const BRAND_STORY_PROMPT = `You are a brand storyteller specializing in narrative-driven company videos. Given information about a company or brand, generate structured content for a compelling brand story video.

Extract or generate:
- companyName: The company or brand name
- mission: A clear mission statement (1-2 sentences)
- teamPhotos: Leave as empty array (provided separately)
- milestones: 2-6 key company milestones, each with:
  - year: The year (or approximate period)
  - event: What happened (1 sentence)
- vision: A forward-looking vision statement (1-2 sentences)
- logoUrl: Leave empty (provided separately)

Guidelines:
- Mission should be inspiring and customer-focused
- Milestones should tell a growth story
- Vision should be aspirational but grounded
- If specific dates/events are mentioned in source content, use them
- Create a narrative arc: origin -> growth -> future`;

const TEMPLATE_PROMPTS: Record<TemplateId, string> = {
  "product-launch": PRODUCT_LAUNCH_PROMPT,
  "explainer": EXPLAINER_PROMPT,
  "social-promo": SOCIAL_PROMO_PROMPT,
  "brand-story": BRAND_STORY_PROMPT,
};

const TEMPLATE_SCHEMAS: Record<TemplateId, z.ZodType> = {
  "product-launch": ProductLaunchInputSchema,
  "explainer": ExplainerInputSchema,
  "social-promo": SocialPromoInputSchema,
  "brand-story": BrandStoryInputSchema,
};

/**
 * Generate structured template content using Gemini.
 * Takes extracted source content and produces typed template input.
 */
export async function generateTemplateContent(
  templateId: TemplateId,
  sourceContent: string,
  sourceType: SourceType = "prompt"
): Promise<TemplateInput> {
  const systemPrompt = TEMPLATE_PROMPTS[templateId];
  const schema = TEMPLATE_SCHEMAS[templateId];

  if (!systemPrompt || !schema) {
    throw new Error(`Unknown template: ${templateId}`);
  }

  const jsonSchema = z.toJSONSchema(schema, { target: "draft-7" });

  const sourceLabel =
    sourceType === "youtube"
      ? "YouTube video transcript/metadata"
      : sourceType === "github"
        ? "GitHub repository information"
        : "user prompt";

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Generate video content from the following ${sourceLabel}:\n\n${sourceContent}`,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseJsonSchema: jsonSchema,
      temperature: 0.6,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  const parsed = JSON.parse(text);
  return schema.parse(parsed) as TemplateInput;
}

/**
 * @deprecated Use generateTemplateContent() instead.
 * Kept for backward compatibility with existing pipeline.
 */
export async function generateScript(
  prompt: string,
  sceneCount: number = 5
): Promise<Script> {
  const jsonSchema = z.toJSONSchema(ScriptSchema, { target: "draft-7" });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Create a video script with exactly ${sceneCount} scenes for the following concept:\n\n${prompt}`,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseJsonSchema: jsonSchema,
      temperature: 0.8,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  const parsed = JSON.parse(text);
  const script = ScriptSchema.parse(parsed);

  return script;
}

import { createRequire } from "module";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { RocketRideClient } = createRequire(import.meta.url)("rocketride") as { RocketRideClient: any };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RocketRideClient = any;
import type { Script, TemplateId, SourceType, TemplateInput, CompositionStyle, Scene } from "./types";
import { ScriptSchema, ProductLaunchInputSchema, ExplainerInputSchema, SocialPromoInputSchema, BrandStoryInputSchema, CompositionStyleSchema } from "./schemas";
import { z } from "zod";
import { readFileSync } from "fs";
import path from "path";

let client: RocketRideClient | null = null;
let connecting: Promise<void> | null = null;
let activePipelines = 0;

const PIPELINE_DIR = path.resolve(process.cwd(), "pipelines");
const SEND_TIMEOUT_MS = 120_000; // 2 minutes max for Gemini response
const TERMINATE_TIMEOUT_MS = 5_000; // 5 seconds max for cleanup

/**
 * Load a .pipe file and inject env vars.
 * The RocketRide engine does NOT resolve ${VAR} or %VAR% in pipeline configs,
 * so we resolve them client-side before sending the pipeline object.
 */
function loadPipeline(filename: string): Record<string, unknown> {
  const filepath = path.join(PIPELINE_DIR, filename);
  let content = readFileSync(filepath, "utf-8");

  // Replace ${VAR_NAME} with process.env.VAR_NAME
  content = content.replace(/\$\{([A-Z_][A-Z0-9_]*)\}/g, (_match, varName) => {
    return process.env[varName] ?? "";
  });

  return JSON.parse(content);
}

const TEMPLATE_SCHEMAS: Record<TemplateId, z.ZodType> = {
  "product-launch": ProductLaunchInputSchema,
  "explainer": ExplainerInputSchema,
  "social-promo": SocialPromoInputSchema,
  "brand-story": BrandStoryInputSchema,
  "editorial": z.object({ prompt: z.string() }),
};

function isEnabled(): boolean {
  return !!(process.env.ROCKETRIDE_URI && process.env.ROCKETRIDE_APIKEY);
}

/**
 * Get or create a singleton RocketRideClient.
 * Uses an atomic guard to prevent race conditions on concurrent calls.
 */
export async function getRocketRideClient(): Promise<RocketRideClient> {
  if (!isEnabled()) {
    throw new Error("RocketRide not configured: ROCKETRIDE_URI and ROCKETRIDE_APIKEY required");
  }

  if (client?.isConnected()) return client;

  if (!connecting) {
    connecting = (async () => {
      const rawUri = process.env.ROCKETRIDE_URI!;
      // Detect tunnel URLs (https:// that aren't localhost)
      const isTunnel = /^https?:\/\/(?!localhost)/.test(rawUri) && !rawUri.includes("localhost");

      client = new RocketRideClient({
        uri: isTunnel ? "http://localhost:5565" : rawUri, // dummy for tunnel; real for local
        auth: process.env.ROCKETRIDE_APIKEY!,
        persist: true,
        maxRetryTime: 300000,
        onConnected: async () => {
          console.log("[RocketRide] Connected to engine");
        },
        onDisconnected: async (reason: unknown) => {
          console.warn(`[RocketRide] Disconnected: ${reason}`);
        },
        onConnectError: async (message: unknown) => {
          console.error(`[RocketRide] Connection error: ${message}`);
        },
      });

      // For tunnel mode: override URI to bypass SDK's normalizeUri which appends :5565
      if (isTunnel) {
        const wsUri = rawUri
          .replace(/^https:\/\//, "wss://")
          .replace(/^http:\/\//, "ws://")
          .replace(/\/?$/, "/task/service");
        const c = client as unknown as Record<string, unknown>;
        c._getWebsocketUri = () => wsUri;
        c._setUri = function () { (this as Record<string, unknown>)._uri = wsUri; };
        c._uri = wsUri;
        console.log(`[RocketRide] Tunnel mode: ${wsUri}`);
      }

      await client.connect(15000);
    })().catch((err) => {
      // Reset client on failure so next call retries cleanly
      client = null;
      throw err;
    }).finally(() => {
      connecting = null;
    });
  }

  await connecting;

  if (!client?.isConnected()) {
    throw new Error("[RocketRide] Failed to connect");
  }
  return client;
}

/**
 * Strip markdown code fences from LLM responses.
 * Handles preamble text, nested fences, trailing whitespace, and no-fence input.
 */
function stripCodeFences(text: string): string {
  // Remove optional preamble + opening fence
  let stripped = text.replace(/^[\s\S]*?```(?:json|JSON)?\s*\n/, "");
  // Remove closing fence + anything after
  stripped = stripped.replace(/\n?```[\s\S]*$/, "");
  // If no fence was present, stripped equals text — return trimmed original
  return (stripped !== text ? stripped : text).trim();
}

/**
 * Attempt to parse a raw string as JSON, stripping code fences first.
 * Throws a descriptive error with a preview of the raw input on failure.
 */
function tryParseJson(raw: string, label: string): unknown {
  try {
    return JSON.parse(stripCodeFences(raw));
  } catch (err) {
    throw new Error(
      `[RocketRide] Failed to parse ${label} as JSON. ` +
      `Raw (first 200 chars): ${raw.slice(0, 200)}. ` +
      `Parse error: ${err instanceof Error ? err.message : err}`
    );
  }
}

/**
 * Extract structured data from a pipeline result.
 * Handles answers array, data field, or raw result.
 */
function extractResultData(result: Record<string, unknown>): unknown {
  const answers = result.answers;
  if (Array.isArray(answers) && answers.length > 0) {
    if (answers[0] == null) {
      throw new Error("[RocketRide] Pipeline returned null answer");
    }
    return typeof answers[0] === "string" ? tryParseJson(answers[0], "answers[0]") : answers[0];
  }
  if (result.data != null) {
    return typeof result.data === "string" ? tryParseJson(result.data as string, "result.data") : result.data;
  }
  return result;
}

/**
 * Wrap a promise with a timeout.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`[RocketRide] ${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

/**
 * Safely terminate a pipeline with a timeout so the finally block never hangs.
 */
async function safeTerminate(rc: RocketRideClient, token: string): Promise<void> {
  await Promise.race([
    rc.terminate(token),
    new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error("terminate timeout")), TERMINATE_TIMEOUT_MS)
    ),
  ]).catch(() => {});
}

/**
 * Run the video-script pipeline to generate a structured Script.
 *
 * @param onToken — called with the pipeline token immediately after `use()`,
 *                  so the caller can store it for cancellation.
 *                  NOTE: must remain synchronous to avoid race conditions.
 */
export async function runScriptPipeline(
  prompt: string,
  sceneCount: number,
  onToken?: (token: string) => void
): Promise<Script> {
  const rc = await getRocketRideClient();

  const pipeline = loadPipeline("video-script.pipe");
  const { token } = await rc.use({ pipeline: pipeline as never }).catch((err: unknown) => {
    throw new Error(
      `[RocketRide] Failed to start video-script pipeline: ${err instanceof Error ? err.message : err}`
    );
  });

  activePipelines++;
  try {
    try { onToken?.(token); } catch (cbErr) {
      console.warn("[RocketRide] onToken callback threw:", cbErr);
    }

    const input = `Create a video script with exactly ${sceneCount} scenes for the following concept:\n\n${prompt}\n\nReturn a JSON object with: title, theme, target_audience, music_prompt, scenes (array with scene_number, title, visual_description, narration_text, duration_seconds, camera_direction, mood, transition), total_duration_seconds.`;

    const result = await withTimeout(
      rc.send(token, input, { name: "prompt.txt" }, "text/plain"),
      SEND_TIMEOUT_MS,
      "Script generation"
    );

    if (!result) {
      throw new Error("[RocketRide] Pipeline returned no result");
    }

    return ScriptSchema.parse(extractResultData(result as Record<string, unknown>));
  } finally {
    activePipelines--;
    await safeTerminate(rc, token);
  }
}

/**
 * Run the template-content pipeline to generate template-specific content.
 *
 * @param onToken — called with the pipeline token immediately after `use()`.
 */
export async function runTemplateContentPipeline(
  templateId: TemplateId,
  sourceContent: string,
  sourceType: SourceType = "prompt",
  onToken?: (token: string) => void
): Promise<TemplateInput> {
  const rc = await getRocketRideClient();

  const pipeline = loadPipeline("template-content.pipe");
  const { token } = await rc.use({ pipeline: pipeline as never }).catch((err: unknown) => {
    throw new Error(
      `[RocketRide] Failed to start template-content pipeline: ${err instanceof Error ? err.message : err}`
    );
  });

  activePipelines++;
  try {
    try { onToken?.(token); } catch (cbErr) {
      console.warn("[RocketRide] onToken callback threw:", cbErr);
    }

    const sourceLabel = sourceType === "youtube" ? "YouTube video analysis"
      : sourceType === "github" ? "GitHub repository information"
      : "user prompt";

    const TEMPLATE_SCHEMAS_HINT: Record<string, string> = {
      "product-launch": `{"brandName":"string","tagline":"string (max 12 words, punchy hook)","productImages":[],"features":["string","string","string"],"brandColor":"#hexcolor","logoUrl":""}`,
      "explainer": `{"title":"string","steps":[{"title":"string","description":"string","iconUrl":""}],"conclusion":"string","introNarration":"string","summaryNarration":"string"}`,
      "social-promo": `{"hook":"string (3-6 words)","productImage":"","features":["string","string","string"],"cta":"string (2-4 words)","aspectRatio":"9:16"}`,
      "brand-story": `{"companyName":"string","mission":"string","teamPhotos":[],"milestones":[{"year":"string","event":"string"}],"vision":"string","logoUrl":""}`,
    };

    const schemaHint = TEMPLATE_SCHEMAS_HINT[templateId] ?? "";
    const input = `Generate video content for a "${templateId}" template from the following ${sourceLabel}:\n\n${sourceContent}\n\nReturn ONLY a valid JSON object with EXACTLY this structure (no extra fields, no wrapping object):\n${schemaHint}`;

    const result = await withTimeout(
      rc.send(token, input, { name: "prompt.txt" }, "text/plain"),
      SEND_TIMEOUT_MS,
      "Template content generation"
    );

    if (!result) {
      throw new Error("[RocketRide] Pipeline returned no result");
    }

    const data = extractResultData(result as Record<string, unknown>);

    // Validate against the template-specific schema
    const schema = TEMPLATE_SCHEMAS[templateId];
    if (schema) {
      return schema.parse(data) as TemplateInput;
    }
    return data as TemplateInput;
  } finally {
    activePipelines--;
    await safeTerminate(rc, token);
  }
}

/**
 * Run the editorial brain pipeline for LLM-based narrative planning.
 * Returns the raw LLM response which is parsed by brain.ts's buildPlanFromLLMObject().
 */
export async function runEditorialBrainPipeline(
  planningPrompt: string,
  onToken?: (token: string) => void
): Promise<unknown> {
  const rc = await getRocketRideClient();

  const pipeline = loadPipeline("editorial-brain.pipe");
  const { token } = await rc.use({ pipeline: pipeline as never }).catch((err: unknown) => {
    throw new Error(
      `[RocketRide] Failed to start editorial-brain pipeline: ${err instanceof Error ? err.message : err}`
    );
  });

  activePipelines++;
  try {
    try { onToken?.(token); } catch (cbErr) {
      console.warn("[RocketRide] onToken callback threw:", cbErr);
    }

    const prompt = `${planningPrompt}

Return strict JSON with:
{
  "intent": { "promise": string, "tone": string, "visualAnchor": string, "audience": string },
  "orderedSectionIds": string[],
  "directives": Array<{
    "id": string,
    "role": "hook" | "hero" | "detail" | "contrast" | "close" | "breather",
    "sectionId"?: string,
    "rhythm": "whisper" | "hold" | "reveal" | "contrast" | "blank",
    "copyFragments": string[],
    "assetRole"?: "hero_object" | "detail_crop" | "context_frame" | "closing_object",
    "granularity"?: "phrase" | "word" | "letter",
    "layoutHint"?: "center" | "hero-top" | "gallery-left" | "gallery-right" | "full-bleed" | "contrast-split",
    "transitionHint"?: "gentle" | "crisp" | "glide" | "lift",
    "durationSec": number
  }>
}

Rules:
- 5 to 8 directives only
- target 30 to 45 seconds total
- max 4 words per fragment
- restrained, elegant style`;

    const result = await withTimeout(
      rc.send(token, prompt, { name: "prompt.txt" }, "text/plain"),
      SEND_TIMEOUT_MS,
      "Editorial brain planning"
    );

    if (!result) {
      throw new Error("[RocketRide] Editorial brain pipeline returned no result");
    }

    return extractResultData(result as Record<string, unknown>);
  } finally {
    activePipelines--;
    await safeTerminate(rc, token);
  }
}

/**
 * Run the style-editor pipeline to modify a video's composition style.
 * Replaces direct Gemini calls in the /api/edit endpoint.
 */
export async function runStyleEditorPipeline(
  instruction: string,
  currentStyle: CompositionStyle,
  onToken?: (token: string) => void
): Promise<{ style: CompositionStyle; explanation: string }> {
  const rc = await getRocketRideClient();

  const pipeline = loadPipeline("style-editor.pipe");
  const { token } = await rc.use({ pipeline: pipeline as never }).catch((err: unknown) => {
    throw new Error(
      `[RocketRide] Failed to start style-editor pipeline: ${err instanceof Error ? err.message : err}`
    );
  });

  activePipelines++;
  try {
    try { onToken?.(token); } catch (cbErr) {
      console.warn("[RocketRide] onToken callback threw:", cbErr);
    }

    const input = `Current style configuration:\n${JSON.stringify(currentStyle, null, 2)}\n\nUser instruction: ${instruction}\n\nReturn a JSON object with "style" (the COMPLETE modified style object) and "explanation" (brief description of changes).`;

    const result = await withTimeout(
      rc.send(token, input, { name: "prompt.txt" }, "text/plain"),
      SEND_TIMEOUT_MS,
      "Style editing"
    );

    if (!result) {
      throw new Error("[RocketRide] Style editor pipeline returned no result");
    }

    const data = extractResultData(result as Record<string, unknown>) as Record<string, unknown>;
    const style = CompositionStyleSchema.parse(data.style);
    const explanation = typeof data.explanation === "string" ? data.explanation : "Style updated";

    return { style, explanation };
  } finally {
    activePipelines--;
    await safeTerminate(rc, token);
  }
}

/**
 * Run the scene-enhancer pipeline to optimize visual descriptions for Veo.
 * Takes raw scenes and returns enhanced prompts optimized for AI video generation.
 */
export async function runSceneEnhancerPipeline(
  scenes: Scene[],
  onToken?: (token: string) => void
): Promise<{ scene_number: number; enhanced_prompt: string; negative_prompt: string; style_preset: string }[]> {
  const rc = await getRocketRideClient();

  const pipeline = loadPipeline("scene-enhancer.pipe");
  const { token } = await rc.use({ pipeline: pipeline as never }).catch((err: unknown) => {
    throw new Error(
      `[RocketRide] Failed to start scene-enhancer pipeline: ${err instanceof Error ? err.message : err}`
    );
  });

  activePipelines++;
  try {
    try { onToken?.(token); } catch (cbErr) {
      console.warn("[RocketRide] onToken callback threw:", cbErr);
    }

    const input = JSON.stringify({
      scenes: scenes.map(s => ({
        scene_number: s.scene_number,
        visual_description: s.visual_description,
        camera_direction: s.camera_direction,
        mood: s.mood,
        duration_seconds: s.duration_seconds,
      })),
    });

    const result = await withTimeout(
      rc.send(token, input, { name: "prompt.txt" }, "text/plain"),
      SEND_TIMEOUT_MS,
      "Scene enhancement"
    );

    if (!result) {
      throw new Error("[RocketRide] Scene enhancer pipeline returned no result");
    }

    const data = extractResultData(result as Record<string, unknown>) as Record<string, unknown>;
    const enhanced = (data.enhanced_scenes ?? data) as { scene_number: number; enhanced_prompt: string; negative_prompt: string; style_preset: string }[];

    if (!Array.isArray(enhanced)) {
      throw new Error("[RocketRide] Scene enhancer returned non-array result");
    }

    return enhanced;
  } finally {
    activePipelines--;
    await safeTerminate(rc, token);
  }
}

export interface QualityReviewResult {
  passed: boolean;
  quality_score: number;
  scores: {
    narrative: number;
    visual_feasibility: number;
    pacing: number;
    consistency: number;
    technical: number;
  };
  issues: string[];
  suggestions: string[];
  revised_script?: Script;
}

/**
 * Run the quality-review pipeline to evaluate a script before video generation.
 * Returns a quality assessment and optionally a revised script if it fails.
 */
export async function runQualityReviewPipeline(
  script: Script,
  onToken?: (token: string) => void
): Promise<QualityReviewResult> {
  const rc = await getRocketRideClient();

  const pipeline = loadPipeline("quality-review.pipe");
  const { token } = await rc.use({ pipeline: pipeline as never }).catch((err: unknown) => {
    throw new Error(
      `[RocketRide] Failed to start quality-review pipeline: ${err instanceof Error ? err.message : err}`
    );
  });

  activePipelines++;
  try {
    try { onToken?.(token); } catch (cbErr) {
      console.warn("[RocketRide] onToken callback threw:", cbErr);
    }

    const input = `Review this video script for quality before it enters the video generation pipeline:\n\n${JSON.stringify(script, null, 2)}\n\nReturn JSON with: passed (boolean), quality_score (1-10), scores (narrative, visual_feasibility, pacing, consistency, technical), issues (array), suggestions (array), revised_script (only if passed is false).`;

    const result = await withTimeout(
      rc.send(token, input, { name: "prompt.txt" }, "text/plain"),
      SEND_TIMEOUT_MS,
      "Quality review"
    );

    if (!result) {
      throw new Error("[RocketRide] Quality review pipeline returned no result");
    }

    const data = extractResultData(result as Record<string, unknown>) as QualityReviewResult;

    // If review failed and a revised script was provided, validate it
    if (!data.passed && data.revised_script) {
      try {
        data.revised_script = ScriptSchema.parse(data.revised_script);
      } catch {
        // Revised script failed validation — remove it
        delete data.revised_script;
      }
    }

    return data;
  } finally {
    activePipelines--;
    await safeTerminate(rc, token);
  }
}

/**
 * Terminate a running RocketRide pipeline task.
 */
export async function terminateTask(token: string): Promise<void> {
  const rc = await getRocketRideClient();
  await withTimeout(rc.terminate(token), TERMINATE_TIMEOUT_MS, "Pipeline termination");
}

/**
 * Gracefully disconnect the RocketRide client.
 */
export async function disconnect(): Promise<void> {
  if (activePipelines > 0) {
    console.warn(`[RocketRide] disconnect() called with ${activePipelines} active pipelines`);
  }
  if (client) {
    await client.disconnect();
    client = null;
  }
}

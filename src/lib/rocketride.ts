import { createRequire } from "module";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { RocketRideClient } = createRequire(import.meta.url)("rocketride") as { RocketRideClient: any };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RocketRideClient = any;
import type { Script, TemplateId, SourceType, TemplateInput, CompositionStyle } from "./types";
import { ScriptSchema, ProductLaunchInputSchema, ExplainerInputSchema, SocialPromoInputSchema, BrandStoryInputSchema, CompositionStyleSchema } from "./schemas";
import { z } from "zod";
import { readFileSync } from "fs";
import path from "path";

let client: RocketRideClient | null = null;
let connecting: Promise<void> | null = null;
let activePipelines = 0;

const PIPELINE_DIR = path.resolve(process.cwd(), "pipelines");
const SEND_TIMEOUT_MS = 120_000; // 2 minutes for simple pipelines
const MASTER_TIMEOUT_MS = 300_000; // 5 minutes for multi-step master pipelines (4 LLM calls)
const TERMINATE_TIMEOUT_MS = 5_000;

/**
 * Load a .pipe file and inject env vars.
 * The RocketRide engine does NOT resolve ${VAR} or %VAR% in pipeline configs,
 * so we resolve them client-side before sending the pipeline object.
 */
function loadPipeline(filename: string): Record<string, unknown> {
  const filepath = path.join(PIPELINE_DIR, filename);
  let content = readFileSync(filepath, "utf-8");
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
 */
export async function getRocketRideClient(): Promise<RocketRideClient> {
  if (!isEnabled()) {
    throw new Error("RocketRide not configured: ROCKETRIDE_URI and ROCKETRIDE_APIKEY required");
  }

  if (client?.isConnected()) return client;

  if (!connecting) {
    connecting = (async () => {
      const rawUri = process.env.ROCKETRIDE_URI!;
      const isTunnel = /^https?:\/\/(?!localhost)/.test(rawUri) && !rawUri.includes("localhost");

      client = new RocketRideClient({
        uri: isTunnel ? "http://localhost:5565" : rawUri,
        auth: process.env.ROCKETRIDE_APIKEY!,
        persist: true,
        maxRetryTime: 300000,
        onConnected: async () => { console.log("[RocketRide] Connected to engine"); },
        onDisconnected: async (reason: unknown) => { console.warn(`[RocketRide] Disconnected: ${reason}`); },
        onConnectError: async (message: unknown) => { console.error(`[RocketRide] Connection error: ${message}`); },
      });

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
      client = null;
      throw err;
    }).finally(() => {
      connecting = null;
    });
  }

  await connecting;
  if (!client?.isConnected()) throw new Error("[RocketRide] Failed to connect");
  return client;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function stripCodeFences(text: string): string {
  let stripped = text.replace(/^[\s\S]*?```(?:json|JSON)?\s*\n/, "");
  stripped = stripped.replace(/\n?```[\s\S]*$/, "");
  return (stripped !== text ? stripped : text).trim();
}

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

function extractResultData(result: Record<string, unknown>): unknown {
  const answers = result.answers;
  if (Array.isArray(answers) && answers.length > 0) {
    if (answers[0] == null) throw new Error("[RocketRide] Pipeline returned null answer");
    return typeof answers[0] === "string" ? tryParseJson(answers[0], "answers[0]") : answers[0];
  }
  if (result.data != null) {
    return typeof result.data === "string" ? tryParseJson(result.data as string, "result.data") : result.data;
  }
  return result;
}

function extractResultText(result: Record<string, unknown>): string {
  const answers = result.answers;
  if (Array.isArray(answers) && answers.length > 0 && answers[0] != null) {
    return typeof answers[0] === "string" ? answers[0] : JSON.stringify(answers[0]);
  }
  if (typeof result.data === "string") return result.data;
  return JSON.stringify(result);
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`[RocketRide] ${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

async function safeTerminate(rc: RocketRideClient, token: string): Promise<void> {
  await Promise.race([
    rc.terminate(token),
    new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error("terminate timeout")), TERMINATE_TIMEOUT_MS)
    ),
  ]).catch(() => {});
}

// ─── Composite Schema for Video Master Pipeline ─────────────────────────────

const EnhancedSceneSchema = z.object({
  scene_number: z.number(),
  enhanced_prompt: z.string(),
  negative_prompt: z.string().optional().default("text, watermark, low quality, blurry, distorted"),
  style_preset: z.string().optional().default("cinematic"),
});

const VideoMasterResultSchema = z.object({
  script: ScriptSchema,
  enhanced_scenes: z.array(EnhancedSceneSchema),
});

export type VideoMasterResult = z.infer<typeof VideoMasterResultSchema>;

// ─── Master Pipelines (Multi-Step, Multi-LLM) ───────────────────────────────

/**
 * VIDEO MASTER PIPELINE — The centerpiece.
 * 10 components, 4 chained Gemini nodes in a single pipeline execution:
 *   Generate Script → Quality Review → Select Best → Enhance for Veo
 *
 * Replaces the old serial calls: runScriptPipeline + runQualityReviewPipeline + runSceneEnhancerPipeline
 */
export async function runVideoMasterPipeline(
  prompt: string,
  sceneCount: number,
  onToken?: (token: string) => void
): Promise<VideoMasterResult> {
  const rc = await getRocketRideClient();

  const pipeline = loadPipeline("video-master.pipe");
  const { token } = await rc.use({ pipeline: pipeline as never }).catch((err: unknown) => {
    throw new Error(
      `[RocketRide] Failed to start video-master pipeline: ${err instanceof Error ? err.message : err}`
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
      MASTER_TIMEOUT_MS,
      "Video master pipeline (generate→review→merge→enhance)"
    );

    if (!result) throw new Error("[RocketRide] Video master pipeline returned no result");

    const data = extractResultData(result as Record<string, unknown>);

    // The final output from gemini_enhance should be { script, enhanced_scenes }
    // Try composite schema first, fall back to treating as raw script
    const composite = VideoMasterResultSchema.safeParse(data);
    if (composite.success) return composite.data;

    // Fallback: the pipeline might have returned just the script (if enhance node output differently)
    const scriptOnly = ScriptSchema.safeParse(data);
    if (scriptOnly.success) {
      return {
        script: scriptOnly.data,
        enhanced_scenes: [],
      };
    }

    // Last resort: try to extract script from nested structure
    const asRecord = data as Record<string, unknown>;
    if (asRecord.script) {
      return {
        script: ScriptSchema.parse(asRecord.script),
        enhanced_scenes: Array.isArray(asRecord.enhanced_scenes) ? asRecord.enhanced_scenes as VideoMasterResult["enhanced_scenes"] : [],
      };
    }

    throw new Error("[RocketRide] Video master pipeline returned unparseable result");
  } finally {
    activePipelines--;
    await safeTerminate(rc, token);
  }
}

/**
 * EDITORIAL MASTER PIPELINE — 3-step creative pipeline.
 * 8 components, 3 chained Gemini nodes:
 *   Deep Analysis → Beat Planning → Copy Refinement
 *
 * Replaces the old single-LLM runEditorialBrainPipeline.
 */
export async function runEditorialMasterPipeline(
  planningPrompt: string,
  onToken?: (token: string) => void
): Promise<unknown> {
  const rc = await getRocketRideClient();

  const pipeline = loadPipeline("editorial-master.pipe");
  const { token } = await rc.use({ pipeline: pipeline as never }).catch((err: unknown) => {
    throw new Error(
      `[RocketRide] Failed to start editorial-master pipeline: ${err instanceof Error ? err.message : err}`
    );
  });

  activePipelines++;
  try {
    try { onToken?.(token); } catch (cbErr) {
      console.warn("[RocketRide] onToken callback threw:", cbErr);
    }

    const result = await withTimeout(
      rc.send(token, planningPrompt, { name: "prompt.txt" }, "text/plain"),
      MASTER_TIMEOUT_MS,
      "Editorial master pipeline (analyze→plan→refine)"
    );

    if (!result) throw new Error("[RocketRide] Editorial master pipeline returned no result");
    return extractResultData(result as Record<string, unknown>);
  } finally {
    activePipelines--;
    await safeTerminate(rc, token);
  }
}

/**
 * GITHUB ANALYSIS PIPELINE — routes repo analysis through RocketRide.
 * Replaces direct Gemini call in processEditorialJob.
 */
export async function runGitHubAnalysisPipeline(
  repoContent: string,
  onToken?: (token: string) => void
): Promise<string> {
  const rc = await getRocketRideClient();

  const pipeline = loadPipeline("github-analysis.pipe");
  const { token } = await rc.use({ pipeline: pipeline as never }).catch((err: unknown) => {
    throw new Error(
      `[RocketRide] Failed to start github-analysis pipeline: ${err instanceof Error ? err.message : err}`
    );
  });

  activePipelines++;
  try {
    try { onToken?.(token); } catch (cbErr) {
      console.warn("[RocketRide] onToken callback threw:", cbErr);
    }

    const result = await withTimeout(
      rc.send(token, repoContent, { name: "prompt.txt" }, "text/plain"),
      SEND_TIMEOUT_MS,
      "GitHub analysis"
    );

    if (!result) throw new Error("[RocketRide] GitHub analysis pipeline returned no result");
    return extractResultText(result as Record<string, unknown>);
  } finally {
    activePipelines--;
    await safeTerminate(rc, token);
  }
}

// ─── Single-Step Pipelines (kept for independent use) ────────────────────────

/**
 * Run the template-content pipeline to generate template-specific content.
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
      "product-launch": `{"brandName":"string","tagline":"string (max 12 words)","productImages":[],"features":["string"],"brandColor":"#hex","logoUrl":""}`,
      "explainer": `{"title":"string","steps":[{"title":"string","description":"string","iconUrl":""}],"conclusion":"string","introNarration":"string","summaryNarration":"string"}`,
      "social-promo": `{"hook":"string (3-6 words)","productImage":"","features":["string"],"cta":"string (2-4 words)","aspectRatio":"9:16"}`,
      "brand-story": `{"companyName":"string","mission":"string","teamPhotos":[],"milestones":[{"year":"string","event":"string"}],"vision":"string","logoUrl":""}`,
    };

    const schemaHint = TEMPLATE_SCHEMAS_HINT[templateId] ?? "";
    const input = `Generate video content for a "${templateId}" template from the following ${sourceLabel}:\n\n${sourceContent}\n\nReturn ONLY a valid JSON object with EXACTLY this structure:\n${schemaHint}`;

    const result = await withTimeout(
      rc.send(token, input, { name: "prompt.txt" }, "text/plain"),
      SEND_TIMEOUT_MS,
      "Template content generation"
    );

    if (!result) throw new Error("[RocketRide] Pipeline returned no result");

    const data = extractResultData(result as Record<string, unknown>);
    const schema = TEMPLATE_SCHEMAS[templateId];
    if (schema) return schema.parse(data) as TemplateInput;
    return data as TemplateInput;
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

    if (!result) throw new Error("[RocketRide] Style editor pipeline returned no result");

    const data = extractResultData(result as Record<string, unknown>) as Record<string, unknown>;
    const style = CompositionStyleSchema.parse(data.style);
    const explanation = typeof data.explanation === "string" ? data.explanation : "Style updated";

    return { style, explanation };
  } finally {
    activePipelines--;
    await safeTerminate(rc, token);
  }
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

export async function terminateTask(token: string): Promise<void> {
  const rc = await getRocketRideClient();
  await withTimeout(rc.terminate(token), TERMINATE_TIMEOUT_MS, "Pipeline termination");
}

export async function disconnect(): Promise<void> {
  if (activePipelines > 0) {
    console.warn(`[RocketRide] disconnect() called with ${activePipelines} active pipelines`);
  }
  if (client) {
    await client.disconnect();
    client = null;
  }
}

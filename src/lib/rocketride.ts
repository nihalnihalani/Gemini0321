import { RocketRideClient } from "rocketride";
import type { Script, TemplateId, SourceType, TemplateInput } from "./types";
import { ScriptSchema, ProductLaunchInputSchema, ExplainerInputSchema, SocialPromoInputSchema, BrandStoryInputSchema } from "./schemas";
import type { z } from "zod";
import path from "path";

let client: RocketRideClient | null = null;
let connecting: Promise<void> | null = null;
let activePipelines = 0;

const PIPELINE_DIR = path.resolve(process.cwd(), "pipelines");
const SEND_TIMEOUT_MS = 120_000; // 2 minutes max for Gemini response
const TERMINATE_TIMEOUT_MS = 5_000; // 5 seconds max for cleanup

const TEMPLATE_SCHEMAS: Record<TemplateId, z.ZodType> = {
  "product-launch": ProductLaunchInputSchema,
  "explainer": ExplainerInputSchema,
  "social-promo": SocialPromoInputSchema,
  "brand-story": BrandStoryInputSchema,
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
        onDisconnected: async (reason) => {
          console.warn(`[RocketRide] Disconnected: ${reason}`);
        },
        onConnectError: async (message) => {
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

  const pipelinePath = path.join(PIPELINE_DIR, "video-script.pipe");
  const { token } = await rc.use({ filepath: pipelinePath }).catch((err: unknown) => {
    throw new Error(
      `[RocketRide] Failed to load pipeline at "${pipelinePath}": ${err instanceof Error ? err.message : err}`
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

  const pipelinePath = path.join(PIPELINE_DIR, "template-content.pipe");
  const { token } = await rc.use({ filepath: pipelinePath }).catch((err: unknown) => {
    throw new Error(
      `[RocketRide] Failed to load pipeline at "${pipelinePath}": ${err instanceof Error ? err.message : err}`
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

    const input = `Generate video content for a "${templateId}" template from the following ${sourceLabel}:\n\n${sourceContent}\n\nReturn ONLY valid JSON matching the ${templateId} template schema.`;

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

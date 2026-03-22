import { RocketRideClient } from "rocketride";
import type { Script, TemplateId, SourceType, TemplateInput } from "./types";
import { ScriptSchema } from "./schemas";
import path from "path";

let client: RocketRideClient | null = null;
let connecting: Promise<void> | null = null;

const PIPELINE_DIR = path.resolve(process.cwd(), "pipelines");

function isEnabled(): boolean {
  return !!(process.env.ROCKETRIDE_URI && process.env.ROCKETRIDE_APIKEY);
}

/**
 * Get or create a singleton RocketRideClient.
 * Throws if RocketRide is not configured.
 */
export async function getRocketRideClient(): Promise<RocketRideClient> {
  if (!isEnabled()) {
    throw new Error("RocketRide not configured: ROCKETRIDE_URI and ROCKETRIDE_APIKEY required");
  }

  if (client?.isConnected()) {
    return client;
  }

  // Avoid multiple concurrent connection attempts
  if (connecting) {
    await connecting;
    if (client?.isConnected()) return client;
  }

  client = new RocketRideClient({
    uri: process.env.ROCKETRIDE_URI!,
    auth: process.env.ROCKETRIDE_APIKEY!,
    persist: true,
    maxRetryTime: 300000, // 5 min retry window
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

  connecting = client.connect(10000); // 10s timeout
  try {
    await connecting;
  } finally {
    connecting = null;
  }

  return client;
}

/**
 * Extract structured data from a pipeline result.
 * Handles multiple response shapes: answers array, data field, or raw result.
 */
function extractResultData(result: Record<string, unknown>): unknown {
  const answers = result.answers;
  if (Array.isArray(answers) && answers.length > 0) {
    return typeof answers[0] === "string" ? JSON.parse(answers[0]) : answers[0];
  }
  if (result.data) {
    return typeof result.data === "string" ? JSON.parse(result.data as string) : result.data;
  }
  return result;
}

/**
 * Run the video-script pipeline to generate a structured Script.
 * Sends prompt + sceneCount to the pipeline, returns parsed Script.
 *
 * @param onToken — called with the pipeline token immediately after `use()`,
 *                  so the caller can store it for cancellation before the
 *                  long-running `send()` begins.
 */
export async function runScriptPipeline(
  prompt: string,
  sceneCount: number,
  onToken?: (token: string) => void
): Promise<Script> {
  const rc = await getRocketRideClient();

  const pipelinePath = path.join(PIPELINE_DIR, "video-script.pipe");
  const { token } = await rc.use({ filepath: pipelinePath });

  // Let the caller capture the token for cancellation support
  onToken?.(token);

  try {
    const input = JSON.stringify({ prompt, sceneCount });
    const result = await rc.send(token, input, { name: "request.json" }, "application/json");

    if (!result) {
      throw new Error("RocketRide pipeline returned no result");
    }

    return ScriptSchema.parse(extractResultData(result as Record<string, unknown>));
  } finally {
    await rc.terminate(token).catch(() => {});
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
  const { token } = await rc.use({ filepath: pipelinePath });

  onToken?.(token);

  try {
    const input = JSON.stringify({ templateId, sourceContent, sourceType });
    const result = await rc.send(token, input, { name: "request.json" }, "application/json");

    if (!result) {
      throw new Error("RocketRide pipeline returned no result");
    }

    return extractResultData(result as Record<string, unknown>) as TemplateInput;
  } finally {
    await rc.terminate(token).catch(() => {});
  }
}

/**
 * Terminate a running RocketRide pipeline task.
 */
export async function terminateTask(token: string): Promise<void> {
  const rc = await getRocketRideClient();
  await rc.terminate(token);
}

/**
 * Gracefully disconnect the RocketRide client.
 */
export async function disconnect(): Promise<void> {
  if (client) {
    await client.disconnect();
    client = null;
  }
}

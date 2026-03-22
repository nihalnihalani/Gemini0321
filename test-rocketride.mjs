/**
 * Quick integration test for RocketRide setup.
 * Works for both local and remote (ngrok/tunnel) connections.
 *
 * Usage: node test-rocketride.mjs
 *
 * For remote connections via ngrok, the SDK's normalizeUri appends :5565
 * which breaks tunneled URLs. This script patches the URI to work correctly.
 */
import { config } from "dotenv";
config();

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { RocketRideClient } = require("rocketride");
import { readFileSync } from "fs";
import path from "path";

const RAW_URI = process.env.ROCKETRIDE_URI || "http://localhost:5565";
const AUTH = process.env.ROCKETRIDE_APIKEY || "";
const GEMINI_KEY = process.env.ROCKETRIDE_APIKEY_GEMINI || process.env.GEMINI_API_KEY || "";

// Detect if URI is a tunnel (https:// that is NOT localhost)
const isTunnel = /^https?:\/\/(?!localhost)/.test(RAW_URI) && !RAW_URI.includes("localhost");

// Build the correct WebSocket URI
// For tunnels: bypass normalizeUri which wrongly appends :5565
const WS_URI = isTunnel
  ? RAW_URI.replace(/^https:\/\//, "wss://").replace(/^http:\/\//, "ws://").replace(/\/?$/, "/task/service")
  : RAW_URI; // local — let SDK handle it normally

console.log("=== RocketRide Integration Test ===\n");
console.log(`Raw URI:    ${RAW_URI}`);
console.log(`WS URI:     ${WS_URI}${isTunnel ? " (tunnel mode)" : " (local mode)"}`);
console.log(`API Key:    ${AUTH ? AUTH.slice(0, 6) + "..." : "(not set)"}`);
console.log(`Gemini Key: ${GEMINI_KEY ? GEMINI_KEY.slice(0, 8) + "..." : "(not set)"}`);
console.log();

// Step 1: Connect
console.log("[1/4] Connecting to RocketRide engine...");
const client = new RocketRideClient({
  uri: isTunnel ? "http://localhost:5565" : RAW_URI, // dummy for tunnel, real for local
  auth: AUTH,
  persist: false,
  onConnectError: async (msg) => console.error(`  Connection error: ${msg}`),
});

// For tunnel mode: override the internal URI to bypass normalizeUri
if (isTunnel) {
  client._getWebsocketUri = () => WS_URI;
  client._setUri = function () { this._uri = WS_URI; };
  client._uri = WS_URI;
}

try {
  await client.connect(15000);
  console.log("  Connected successfully!");
  console.log("  Transport:", JSON.stringify(client.getConnectionInfo()));
  console.log();
} catch (err) {
  console.error(`  FAILED to connect: ${err.message}`);
  if (isTunnel) {
    console.error("  Tunnel troubleshooting:");
    console.error("  1. Is the ngrok/tunnel process running on the host machine?");
    console.error("  2. Is the RocketRide Docker container running on the host?");
    console.error("  3. Try: curl -H 'ngrok-skip-browser-warning: true' " + RAW_URI);
  } else {
    console.error("  Is the Docker container running? Check: docker ps | grep rocketride");
  }
  process.exit(1);
}

// Step 2: Ping
console.log("[2/4] Pinging engine...");
try {
  await client.ping();
  console.log("  Ping OK!\n");
} catch (err) {
  console.error(`  Ping failed: ${err.message}\n`);
}

// Step 3: Validate pipeline
console.log("[3/4] Validating video-script pipeline...");
try {
  const pipelineJson = JSON.parse(
    readFileSync(path.resolve("pipelines/video-script.pipe"), "utf-8")
  );
  const result = await client.validate({ pipeline: pipelineJson });
  console.log("  Validation result:", JSON.stringify(result, null, 2).slice(0, 200));
  console.log();
} catch (err) {
  console.error(`  Validation error: ${err.message}`);
  console.log("  (This may be expected if the engine doesn't support validate for this pipeline type)\n");
}

// Step 4: Test pipeline execution
console.log("[4/4] Running video-script pipeline with text/plain...");
try {
  const pipelinePath = path.resolve("pipelines/video-script.pipe");
  const { token } = await client.use({ filepath: pipelinePath });
  console.log(`  Pipeline started, token: ${token.slice(0, 20)}...`);

  const input = "Create a video script with exactly 3 scenes for: A cat learning to code.\n\nReturn a JSON object with: title, theme, target_audience, music_prompt, scenes (array with scene_number, title, visual_description, narration_text, duration_seconds, camera_direction, mood, transition), total_duration_seconds.";

  console.log("  Sending prompt and waiting for Gemini response...");
  const result = await client.send(token, input, { name: "prompt.txt" }, "text/plain");

  if (result && result.answers && Array.isArray(result.answers) && result.answers.length > 0) {
    console.log("  Got answers from pipeline!");

    let raw = result.answers[0];
    if (typeof raw === "string") {
      // Strip code fences (handles preamble text, nested fences, etc.)
      let stripped = raw.replace(/^[\s\S]*?```(?:json|JSON)?\s*\n/, "");
      stripped = stripped.replace(/\n?```[\s\S]*$/, "");
      raw = (stripped !== raw ? stripped : raw).trim();

      try {
        const parsed = JSON.parse(raw);
        console.log(`  Parsed Script JSON successfully!`);
        console.log(`  Title: ${parsed.title}`);
        console.log(`  Theme: ${parsed.theme}`);
        console.log(`  Scenes: ${parsed.scenes?.length}`);
        console.log(`  Total duration: ${parsed.total_duration_seconds}s`);
        if (parsed.scenes?.[0]) {
          console.log(`  Scene 1: "${parsed.scenes[0].title}" (${parsed.scenes[0].duration_seconds}s)`);
        }
        console.log("\n  SUCCESS: Pipeline produces valid Script JSON!");
      } catch (parseErr) {
        console.error(`  JSON parse failed: ${parseErr.message}`);
        console.log(`  Raw answer (first 500 chars): ${raw.slice(0, 500)}`);
      }
    }
  } else {
    console.log("  No answers in result. Keys:", result ? Object.keys(result).join(", ") : "null");
    console.log("  Full result:", JSON.stringify(result, null, 2).slice(0, 500));
  }

  await client.terminate(token).catch(() => {});
  console.log("  Pipeline terminated.\n");
} catch (err) {
  console.error(`  Pipeline error: ${err.message}\n`);
}

// Cleanup
await client.disconnect();
console.log("=== Test Complete ===");
process.exit(0);

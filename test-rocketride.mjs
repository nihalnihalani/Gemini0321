/**
 * Quick integration test for RocketRide setup.
 * Tests: connection, pipeline validation, and a live script generation run.
 *
 * Usage: node test-rocketride.mjs
 */
import { config } from "dotenv";
config();

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { RocketRideClient } = require("rocketride");
import { readFileSync } from "fs";
import path from "path";

const URI = process.env.ROCKETRIDE_URI || "http://localhost:5565";
const AUTH = process.env.ROCKETRIDE_APIKEY || "";
const GEMINI_KEY = process.env.ROCKETRIDE_APIKEY_GEMINI || process.env.GEMINI_API_KEY || "";

console.log("=== RocketRide Integration Test ===\n");
console.log(`Engine URI: ${URI}`);
console.log(`API Key:    ${AUTH ? AUTH.slice(0, 6) + "..." : "(not set)"}`);
console.log(`Gemini Key: ${GEMINI_KEY ? GEMINI_KEY.slice(0, 8) + "..." : "(not set)"}`);
console.log();

// Step 1: Connect
console.log("[1/4] Connecting to RocketRide engine...");
const client = new RocketRideClient({
  uri: URI,
  auth: AUTH,
  persist: false,
  onConnectError: async (msg) => console.error(`  Connection error: ${msg}`),
});

try {
  await client.connect(10000);
  console.log("  Connected successfully!\n");
} catch (err) {
  console.error(`  FAILED to connect: ${err.message}`);
  console.error("  Is the Docker container running? Check: docker ps | grep rocketride");
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

// Step 4: Test pipeline execution (mirrors rocketride.ts logic)
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

    // Parse the answer (strip code fences like rocketride.ts does)
    let raw = result.answers[0];
    if (typeof raw === "string") {
      raw = raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
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

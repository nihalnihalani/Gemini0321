import { Config } from "@remotion/cli/config";

/**
 * Remotion configuration — applied to CLI renders and Studio preview.
 *
 * Best practices:
 * - JPEG image format for frames: faster encoding than PNG, smaller intermediate files.
 *   Use PNG only when you need alpha channel transparency.
 * - Overwrite output enabled to avoid manual cleanup during iteration.
 * - H.264 codec: fastest encoding, universal compatibility.
 * - CRF 18: high quality output (lower = better quality, larger files).
 *   Range for H.264: 1-51. The default 18 provides near-lossless quality.
 * - JPEG quality 90: high frame quality with minimal artifacts.
 * - Log level "warn" in production to reduce noise; use "verbose" for debugging.
 */

// Frame rendering format — JPEG is faster than PNG for non-transparent content
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(90);

// Output behavior
Config.setOverwriteOutput(true);

// Codec and quality defaults for CLI renders
Config.setCodec("h264");
Config.setCrf(18);

// Concurrency: null = Remotion auto-selects based on system (default: 50% of CPU threads)
// Override with --concurrency flag or use `npx remotion benchmark` to find your optimal value
Config.setConcurrency(null);

// Studio configuration
Config.setMaxTimelineTracks(20);

// Delay render timeout: 60s to accommodate slow network fetches (Veo clips, audio)
Config.setDelayRenderTimeoutInMilliseconds(60000);

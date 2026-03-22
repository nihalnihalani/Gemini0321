import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import os from "os";
import type { GeneratedScript, CompositionStyle, TemplateId, TemplateInput } from "./types";
import type { EditorialVideoSpec } from "../editorial/types";
import { DEFAULT_STYLE } from "./types";
import { getTemplate } from "./templates";

// Cache the bundle URL to avoid re-bundling on every render.
// Bundle caching is a critical performance optimization — bundling is expensive
// and the output only changes when source code changes.
let cachedBundleUrl: string | null = null;

async function getBundle(): Promise<string> {
  if (cachedBundleUrl) {
    return cachedBundleUrl;
  }
  cachedBundleUrl = await bundle({
    entryPoint: path.resolve(process.cwd(), "src/remotion/Root.tsx"),
    webpackOverride: (config) => config,
  });
  return cachedBundleUrl;
}

/**
 * Compute optimal concurrency based on available CPU cores.
 *
 * Remotion best practice: use `npx remotion benchmark` to find the sweet spot.
 * As a general heuristic, half of available CPU threads is a safe default that
 * balances render speed with system responsiveness. We cap at 8 to avoid
 * excessive memory usage on high-core-count machines.
 */
function getOptimalConcurrency(): number {
  const cpuCount = os.cpus().length;
  // Use half of available threads, minimum 1, maximum 8
  return Math.max(1, Math.min(8, Math.floor(cpuCount / 2)));
}

/**
 * Shared renderMedia options for consistent, optimized output.
 *
 * Best practices applied:
 * - codec: "h264" — fastest encoding, universal browser/player support
 * - crf: 18 — high quality with reasonable file size (Remotion default is 18 for H.264)
 * - imageFormat: "jpeg" — faster than PNG, suitable when alpha channel is not needed
 * - jpegQuality: 90 — high quality frames with minimal compression artifacts
 * - pixelFormat: "yuv420p" — maximum compatibility across players and browsers
 * - concurrency: auto-tuned based on CPU cores
 * - x264Preset: "medium" — balanced encoding speed vs compression efficiency
 *   (use "fast" or "veryfast" for development, "slow" for final delivery)
 */
function getSharedRenderOptions() {
  return {
    codec: "h264" as const,
    crf: 18,
    imageFormat: "jpeg" as const,
    jpegQuality: 90,
    pixelFormat: "yuv420p" as const,
    concurrency: getOptimalConcurrency(),
    x264Preset: "medium" as const,
    // Timeout: 60s per frame to handle slow Veo clip loading
    timeoutInMilliseconds: 60000,
  };
}

/**
 * @deprecated Use renderTemplateVideo() for template-based rendering.
 */
export async function renderVideo(
  script: GeneratedScript,
  style: CompositionStyle = DEFAULT_STYLE,
  outputPath: string
): Promise<string> {
  const bundled = await getBundle();

  const composition = await selectComposition({
    serveUrl: bundled,
    id: "AIVideo",
    inputProps: { script, compositionStyle: style },
  });

  await renderMedia({
    composition,
    serveUrl: bundled,
    outputLocation: outputPath,
    inputProps: { script, compositionStyle: style },
    ...getSharedRenderOptions(),
  });

  return outputPath;
}

export async function renderTemplateVideo(
  templateId: TemplateId,
  inputProps: TemplateInput & { musicUrl?: string },
  outputPath: string
): Promise<string> {
  const template = getTemplate(templateId);

  // Determine dimensions based on aspect ratio
  const width = template.defaultAspectRatio === "9:16" ? 1080 : 1920;
  const height = template.defaultAspectRatio === "9:16" ? 1920 : 1080;

  // For social-promo, check if the input specifies a different aspect ratio
  const socialInput = inputProps as { aspectRatio?: string };
  const effectiveWidth = socialInput.aspectRatio === "9:16" ? 1080 : width;
  const effectiveHeight = socialInput.aspectRatio === "9:16" ? 1920 : height;

  const bundled = await getBundle();

  const props = inputProps as unknown as Record<string, unknown>;

  const composition = await selectComposition({
    serveUrl: bundled,
    id: template.compositionId,
    inputProps: props,
  });

  // Override dimensions if needed for vertical video
  const finalComposition = {
    ...composition,
    width: effectiveWidth,
    height: effectiveHeight,
  };

  await renderMedia({
    composition: finalComposition,
    serveUrl: bundled,
    outputLocation: outputPath,
    inputProps: props,
    ...getSharedRenderOptions(),
  });

  return outputPath;
}

/**
 * Render an editorial video from a compiled EditorialVideoSpec.
 * The spec contains its own fps, resolution, and duration — all metadata-driven.
 */
export async function renderEditorialVideo(
  spec: EditorialVideoSpec,
  outputPath: string
): Promise<string> {
  const bundled = await getBundle();

  const composition = await selectComposition({
    serveUrl: bundled,
    id: "EditorialVideo",
    inputProps: { spec },
  });

  const finalComposition = {
    ...composition,
    width: spec.meta.width,
    height: spec.meta.height,
    fps: spec.meta.fps,
    durationInFrames: spec.meta.durationInFrames,
  };

  await renderMedia({
    composition: finalComposition,
    serveUrl: bundled,
    outputLocation: outputPath,
    inputProps: { spec },
    ...getSharedRenderOptions(),
    // Lower concurrency for higher resolution specs
    concurrency: spec.meta.width > 1920
      ? Math.max(1, Math.min(4, Math.floor(os.cpus().length / 4)))
      : getOptimalConcurrency(),
  });

  return outputPath;
}

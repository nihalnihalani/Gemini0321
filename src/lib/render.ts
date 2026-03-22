import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import type { GeneratedScript, CompositionStyle, TemplateId, TemplateInput } from "./types";
import { DEFAULT_STYLE } from "./types";
import { getTemplate } from "./templates";

// Cache the bundle URL to avoid re-bundling on every render
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
    codec: "h264",
    outputLocation: outputPath,
    inputProps: { script, compositionStyle: style },
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
    codec: "h264",
    outputLocation: outputPath,
    inputProps: props,
  });

  return outputPath;
}

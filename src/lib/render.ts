import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import type { GeneratedScript, CompositionStyle } from "./types";
import { DEFAULT_STYLE } from "./types";

export async function renderVideo(
  script: GeneratedScript,
  style: CompositionStyle = DEFAULT_STYLE,
  outputPath: string
): Promise<string> {
  // 1. Bundle the Remotion project
  const bundled = await bundle({
    entryPoint: path.resolve(process.cwd(), "src/remotion/Root.tsx"),
    webpackOverride: (config) => config,
  });

  // 2. Select the composition
  const composition = await selectComposition({
    serveUrl: bundled,
    id: "AIVideo",
    inputProps: { script, compositionStyle: style },
  });

  // 3. Render to MP4
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: "h264",
    outputLocation: outputPath,
    inputProps: { script, compositionStyle: style },
  });

  return outputPath;
}

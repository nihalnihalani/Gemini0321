import type { EditorialAsset } from "./types";

/**
 * Default editorial asset library.
 * These are neutral, editorial-quality placeholder images that ship with the project.
 * The engine uses semantic tag scoring to pick the best asset per beat.
 *
 * To add your own: place images in public/editorial/ and add entries here.
 * Assets are loaded via Remotion's staticFile() in the renderer.
 */
export const referenceAssets: EditorialAsset[] = [
  {
    id: "editorial-hero-1",
    role: "hero_object",
    src: "editorial/hero-1.jpg",
    semanticTags: ["intro", "minimal", "calm", "editorial", "welcome", "overview"],
    treatment: { radius: 32, saturation: 0.88, opacity: 1 },
    drift: { fromX: 0, toX: 0, fromY: -6, toY: 6, scaleFrom: 1, scaleTo: 1.012 },
  },
  {
    id: "editorial-detail-1",
    role: "detail_crop",
    src: "editorial/detail-1.jpg",
    semanticTags: ["detail", "warm", "interior", "documentation", "artifact"],
    treatment: { radius: 24, saturation: 0.82, opacity: 1 },
    drift: { fromX: -8, toX: 8, scaleFrom: 1.02, scaleTo: 1.0 },
  },
  {
    id: "editorial-context-1",
    role: "context_frame",
    src: "editorial/context-1.jpg",
    semanticTags: ["system", "context", "architectural", "structured", "commands", "interface"],
    treatment: { radius: 18, saturation: 0.84, opacity: 1 },
    drift: { fromY: 6, toY: -4, scaleFrom: 1.0, scaleTo: 1.01 },
  },
  {
    id: "editorial-closing-1",
    role: "closing_object",
    src: "editorial/closing-1.jpg",
    semanticTags: ["quiet", "close", "calm", "soft", "closing", "fade", "help"],
    treatment: { radius: 16, saturation: 0.76, opacity: 1 },
    drift: { fromX: 0, toX: 0, scaleFrom: 1.0, scaleTo: 1.0 },
  },
];

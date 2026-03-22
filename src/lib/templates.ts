import type { TemplateConfig, TemplateId } from "./types";

export const TEMPLATES: Record<TemplateId, TemplateConfig> = {
  "product-launch": {
    id: "product-launch",
    name: "Product Launch",
    description: "Kinetic text + product images + brand reveal. Perfect for product announcements.",
    defaultDurationSeconds: 35,
    defaultAspectRatio: "16:9",
    compositionId: "ProductLaunch",
  },
  "explainer": {
    id: "explainer",
    name: "Explainer",
    description: "Step-by-step animated explanations with diagrams. Ideal for tutorials and how-to content.",
    defaultDurationSeconds: 50,
    defaultAspectRatio: "16:9",
    compositionId: "Explainer",
  },
  "social-promo": {
    id: "social-promo",
    name: "Social Media Promo",
    description: "Bold, fast-paced promo clips. Supports both landscape and vertical formats.",
    defaultDurationSeconds: 20,
    defaultAspectRatio: "16:9",
    compositionId: "SocialPromo",
  },
  "brand-story": {
    id: "brand-story",
    name: "Brand Story",
    description: "Narrative-driven brand storytelling with milestones and team showcase.",
    defaultDurationSeconds: 50,
    defaultAspectRatio: "16:9",
    compositionId: "BrandStory",
  },
  "editorial": {
    id: "editorial",
    name: "Editorial",
    description: "Polished editorial motion graphics with beat-driven animation and text choreography.",
    defaultDurationSeconds: 38,
    defaultAspectRatio: "16:9",
    compositionId: "EditorialVideo",
  },
};

export function getTemplate(id: TemplateId): TemplateConfig {
  const template = TEMPLATES[id];
  if (!template) {
    throw new Error(`Unknown template: ${id}`);
  }
  return template;
}

export function getAllTemplates(): TemplateConfig[] {
  return Object.values(TEMPLATES);
}

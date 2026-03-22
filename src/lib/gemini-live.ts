import {
  GoogleGenAI,
  Modality,
  type FunctionDeclaration,
  type LiveServerMessage,
  type Session,
  type FunctionResponse,
} from "@google/genai";
import type { TemplateId } from "./types";

export interface LiveSessionConfig {
  onTextResponse: (text: string) => void;
  onToolCall: (name: string, args: Record<string, unknown>) => Promise<Record<string, unknown>>;
  onError: (error: Error) => void;
  onClose: () => void;
}

export interface LiveSessionHandle {
  session: Session;
  sendText: (text: string) => void;
  sendAudio: (audioData: string, mimeType: string) => void;
  close: () => void;
}

const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "updateScene",
    description:
      "Update a specific scene in the video. Can modify narration text, visual description, title, duration, camera direction, mood, or transition.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        sceneIndex: {
          type: "integer",
          description: "Zero-based index of the scene to update",
        },
        changes: {
          type: "object",
          description: "Fields to update on the scene",
          properties: {
            title: { type: "string" },
            narration_text: { type: "string" },
            visual_description: { type: "string" },
            duration_seconds: { type: "number" },
            camera_direction: { type: "string" },
            mood: { type: "string" },
            transition: {
              type: "string",
              enum: ["cut", "fade", "dissolve", "wipe"],
            },
          },
          additionalProperties: false,
        },
      },
      required: ["sceneIndex", "changes"],
      additionalProperties: false,
    },
  },
  {
    name: "changeStyle",
    description:
      "Change a visual style property of the video composition. Properties include titleFontSize, titleColor, titleFontFamily, showTitle, subtitleFontSize, subtitleColor, subtitleBgColor, subtitleBgOpacity, subtitlePosition, showSubtitles, transitionType, transitionDurationFrames, musicVolume, overlayColor, overlayOpacity, watermarkText, showWatermark.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        property: {
          type: "string",
          description: "The style property name to change",
        },
        value: {
          description: "The new value for the property",
        },
      },
      required: ["property", "value"],
      additionalProperties: false,
    },
  },
  {
    name: "addAsset",
    description:
      "Inject an image or logo asset into the video at a specific position.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["image", "logo"],
          description: "Type of asset to add",
        },
        url: {
          type: "string",
          description: "URL of the asset to add",
        },
      },
      required: ["type", "url"],
      additionalProperties: false,
    },
  },
  {
    name: "switchTemplate",
    description:
      "Switch the video to a different template layout. Available templates: product-launch, explainer, social-promo, brand-story.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        templateId: {
          type: "string",
          enum: ["product-launch", "explainer", "social-promo", "brand-story"],
          description: "The template to switch to",
        },
      },
      required: ["templateId"],
      additionalProperties: false,
    },
  },
  {
    name: "regenerateMusic",
    description:
      "Generate new background music for the video with a specific mood or style prompt.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description:
            "Description of the desired music style, mood, tempo, and instruments",
        },
      },
      required: ["prompt"],
      additionalProperties: false,
    },
  },
  {
    name: "toggleVeoFinale",
    description:
      "Enable or disable the AI-generated Veo finale scene at the end of the video.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        enabled: {
          type: "boolean",
          description: "Whether to enable the Veo finale scene",
        },
      },
      required: ["enabled"],
      additionalProperties: false,
    },
  },
];

const SYSTEM_INSTRUCTION = `You are a video editor assistant for Aetheris Cinema, an AI video generation platform.
Help users customize their video by calling the available tools. You can:

- Update individual scenes (text, visuals, timing, transitions)
- Change visual styles (fonts, colors, overlays, subtitles)
- Add images and logos
- Switch between template layouts
- Regenerate background music
- Toggle the AI-generated Veo finale scene

Be helpful, concise, and creative. When users describe changes in natural language, map them to the appropriate tool calls. Confirm what you changed after each action.`;

export async function createLiveSession(
  config: LiveSessionConfig
): Promise<LiveSessionHandle> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const ai = new GoogleGenAI({ apiKey });

  const session = await ai.live.connect({
    model: "gemini-live-2.5-flash-preview",
    config: {
      responseModalities: [Modality.TEXT],
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
    },
    callbacks: {
      onopen: () => {
        // Connection established
      },
      onmessage: async (message: LiveServerMessage) => {
        // Handle text responses
        const text = message.text;
        if (text) {
          config.onTextResponse(text);
        }

        // Handle tool calls
        if (message.toolCall?.functionCalls) {
          const responses: FunctionResponse[] = [];

          for (const call of message.toolCall.functionCalls) {
            if (!call.name) continue;
            try {
              const result = await config.onToolCall(
                call.name,
                (call.args as Record<string, unknown>) || {}
              );
              responses.push({
                id: call.id,
                name: call.name,
                response: { output: result },
              });
            } catch (err) {
              responses.push({
                id: call.id,
                name: call.name,
                response: {
                  error:
                    err instanceof Error ? err.message : "Unknown error",
                },
              });
            }
          }

          session.sendToolResponse({ functionResponses: responses });
        }
      },
      onerror: (e: ErrorEvent) => {
        config.onError(new Error(e.message || "Live session error"));
      },
      onclose: () => {
        config.onClose();
      },
    },
  });

  return {
    session,
    sendText: (text: string) => {
      session.sendClientContent({ turns: [{ role: "user", parts: [{ text }] }] });
    },
    sendAudio: (audioData: string, mimeType: string) => {
      session.sendRealtimeInput({
        audio: { data: audioData, mimeType },
      });
    },
    close: () => {
      session.close();
    },
  };
}

export type { TemplateId };

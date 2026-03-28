import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { EditRequestSchema, CompositionStyleSchema } from "@/lib/schemas";
import type { EditResponse } from "@/lib/types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const SYSTEM_PROMPT = `You are a video style editor. You receive a current style configuration (JSON) and a user instruction describing how to change it.

Your job:
- Return the COMPLETE modified style object with ALL fields, not just the ones that changed.
- Only change fields that are relevant to the user's instruction.
- Keep all other fields exactly as they were.

Rules:
- Color values must be valid hex codes (e.g. #ff0000, #ffffff).
- Opacity values must be between 0 and 1.
- Font sizes for titles must be between 12 and 200.
- Font sizes for subtitles must be between 12 and 100.
- transitionDurationFrames must be between 0 and 60.
- musicVolume must be between 0 and 1.
- overlayOpacity must be between 0 and 0.8.
- subtitlePosition must be one of: "top", "center", "bottom".
- transitionType must be one of: "cut", "fade", "dissolve", "wipe", "per-scene".

Also return a brief explanation of what you changed.`;

const EditResponseSchema = z.object({
  style: CompositionStyleSchema,
  explanation: z.string().describe("Brief description of what was changed"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = EditRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { instruction, currentStyle } = parsed.data;

    const jsonSchema = z.toJSONSchema(EditResponseSchema, {
      target: "draft-7",
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `Current style configuration:\n${JSON.stringify(currentStyle, null, 2)}\n\nUser instruction: ${instruction}`,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseJsonSchema: jsonSchema,
        temperature: 0.2,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Gemini returned an empty response");
    }

    const rawResult = JSON.parse(text);
    const validated = EditResponseSchema.safeParse(rawResult);

    if (!validated.success) {
      console.error("Gemini response validation failed:", validated.error);
      return NextResponse.json(
        { error: "LLM returned an invalid style configuration" },
        { status: 500 }
      );
    }

    const result: EditResponse = {
      style: validated.data.style,
      explanation: validated.data.explanation,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Edit API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

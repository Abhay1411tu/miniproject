import "server-only";
import { GoogleGenAI } from "@google/genai";

// ─────────────────────────────────────────────────────────────────────────────
// Gemini AI provider (Google AI Studio).
// ─────────────────────────────────────────────────────────────────────────────

const GEMINI_MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-3.8-flash",
  "gemini-flash-latest",
  "gemini-2.5-flash",
].filter(Boolean) as string[];

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return null;
  if (!client) client = new GoogleGenAI({ apiKey: key });
  return client;
}

/** Whether a Gemini provider is configured. */
export function geminiAvailable(): boolean {
  return !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
}

/** Generate a structured JSON response via Gemini with automatic model fallback. */
export async function generateGeminiJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4096,
): Promise<T> {
  const ai = getClient();
  if (!ai) throw new Error("GEMINI_API_KEY not configured");

  let lastError: unknown;
  for (const model of GEMINI_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          maxOutputTokens: maxTokens,
          temperature: 0.1,
        },
      });

      let raw = response.text ?? "{}";
      raw = raw.replace(/```json/gi, "").replace(/```/g, "").trim();

      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end >= start) {
        raw = raw.slice(start, end + 1);
      }

      return JSON.parse(raw) as T;
    } catch (err) {
      lastError = err;
      console.warn(`[Gemini] Model ${model} failed, trying next…`);
    }
  }

  throw lastError;
}

/** Generate plain text via Gemini. */
export async function generateGeminiText(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const ai = getClient();
  if (!ai) throw new Error("GEMINI_API_KEY not configured");

  let lastError: unknown;
  for (const model of GEMINI_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: 1024,
          temperature: 0.4,
        },
      });

      return (response.text ?? "").trim();
    } catch (err) {
      lastError = err;
      console.warn(`[Gemini] Model ${model} failed, trying next…`);
    }
  }

  throw lastError;
}

import "server-only";
import Groq from "groq-sdk";
import { geminiAvailable, generateGeminiJSON, generateGeminiText } from "./gemini";

// ─────────────────────────────────────────────────────────────────────────────
// Multi-Tier AI Provider Orchestrator:
// 1. Groq (qwen/qwen3.8-27b -> openai/gpt-oss-120b -> fallback)
// 2. Gemini (gemini-3.8-flash -> gemini-flash-latest)
// 3. Intelligent Offline Heuristic Engine
// ─────────────────────────────────────────────────────────────────────────────

const GROQ_MODELS = [
  process.env.GROQ_MODEL,
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
].filter(Boolean) as string[];

let groqInstance: Groq | null = null;

export function groqAvailable(): boolean {
  return !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim().length > 0);
}

function getGroqClient(): Groq | null {
  if (!groqAvailable()) return null;
  if (!groqInstance) {
    groqInstance = new Groq({ apiKey: process.env.GROQ_API_KEY!.trim() });
  }
  return groqInstance;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isRateLimitOrModelError(err: any): boolean {
  return (
    err?.status === 429 ||
    err?.status === 404 ||
    err?.error?.code === "rate_limit_exceeded" ||
    err?.error?.code === "model_not_found" ||
    err?.message?.includes("429") ||
    err?.message?.includes("Rate limit") ||
    err?.message?.includes("does not exist")
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createCompletion(params: any): Promise<any> {
  const client = getGroqClient();
  if (!client) throw new Error("Groq API key not configured");

  let lastError: unknown;
  for (const model of GROQ_MODELS) {
    try {
      return await client.chat.completions.create({ ...params, model });
    } catch (err: unknown) {
      lastError = err;
      if (isRateLimitOrModelError(err)) {
        console.warn(`[Groq] Model ${model} encountered issue, trying next available model…`);
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

async function completeJSONViaGroq<T>(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
): Promise<T> {
  const completion = await createCompletion({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.1,
    max_tokens: maxTokens,
    response_format: { type: "json_object" },
  });

  let raw = completion.choices[0]?.message?.content ?? "{}";
  raw = raw.replace(/```json/gi, "").replace(/```/g, "").trim();

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end >= start) {
    raw = raw.slice(start, end + 1);
  }

  return JSON.parse(raw) as T;
}

async function completeTextViaGroq(systemPrompt: string, userPrompt: string): Promise<string> {
  const completion = await createCompletion({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.4,
    max_tokens: 1024,
  });
  return completion.choices[0]?.message?.content?.trim() ?? "";
}

/**
 * Generate a structured JSON response.
 * Follows Groq -> Gemini -> Offline heuristic fallback chain.
 */
export async function generateJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4096,
  offlineFallback?: () => T,
): Promise<T> {
  // 1. Try Groq if configured
  if (groqAvailable()) {
    try {
      return await completeJSONViaGroq<T>(systemPrompt, userPrompt, maxTokens);
    } catch (err) {
      console.warn("[AI] Groq failed, checking Gemini fallback…", err);
      if (geminiAvailable()) {
        try {
          return await generateGeminiJSON<T>(systemPrompt, userPrompt, maxTokens);
        } catch (geminiErr) {
          console.warn("[AI] Gemini fallback also failed:", geminiErr);
        }
      }
    }
  } else if (geminiAvailable()) {
    // 2. Groq not configured, but Gemini is
    try {
      return await generateGeminiJSON<T>(systemPrompt, userPrompt, maxTokens);
    } catch (geminiErr) {
      console.warn("[AI] Gemini request failed:", geminiErr);
    }
  }

  // 3. Offline heuristic fallback
  if (offlineFallback) {
    return offlineFallback();
  }

  throw new Error("No AI provider available (configure GROQ_API_KEY or GEMINI_API_KEY in .env.local)");
}

/**
 * Generate plain text response.
 * Follows Groq -> Gemini -> Offline heuristic fallback chain.
 */
export async function generateText(
  systemPrompt: string,
  userPrompt: string,
  offlineFallback?: () => string,
): Promise<string> {
  // 1. Try Groq if configured
  if (groqAvailable()) {
    try {
      return await completeTextViaGroq(systemPrompt, userPrompt);
    } catch (err) {
      console.warn("[AI] Groq failed, checking Gemini fallback…", err);
      if (geminiAvailable()) {
        try {
          return await generateGeminiText(systemPrompt, userPrompt);
        } catch (geminiErr) {
          console.warn("[AI] Gemini fallback also failed:", geminiErr);
        }
      }
    }
  } else if (geminiAvailable()) {
    // 2. Groq not configured, but Gemini is
    try {
      return await generateGeminiText(systemPrompt, userPrompt);
    } catch (geminiErr) {
      console.warn("[AI] Gemini request failed:", geminiErr);
    }
  }

  // 3. Offline heuristic fallback
  if (offlineFallback) {
    return offlineFallback();
  }

  throw new Error("No AI provider available (configure GROQ_API_KEY or GEMINI_API_KEY in .env.local)");
}

/** Generate a streaming response. */
export async function generateStream(
  systemPrompt: string,
  userPrompt: string,
) {
  const client = getGroqClient();
  if (!client) throw new Error("Groq API key not configured for streaming");

  for (const model of GROQ_MODELS) {
    try {
      return await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 1024,
        stream: true,
      });
    } catch {
      continue;
    }
  }
  throw new Error("Failed to start stream with available models");
}

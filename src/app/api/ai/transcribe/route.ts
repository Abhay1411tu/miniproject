import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export const dynamic = "force-dynamic";

let groqInstance: Groq | null = null;
function getGroqClient(): Groq | null {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) return null;
  if (!groqInstance) groqInstance = new Groq({ apiKey: key });
  return groqInstance;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    const groq = getGroqClient();
    if (!groq) {
      return NextResponse.json({ error: "Groq API key not configured" }, { status: 500 });
    }

    const transcription = await groq.audio.transcriptions.create({
      file,
      model: "whisper-large-v3-turbo",
      response_format: "json",
      language: "en",
    });

    return NextResponse.json({ text: transcription.text || "" });
  } catch (err: unknown) {
    console.error("[Transcribe]", err);
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
  }
}


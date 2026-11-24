import { NextResponse } from "next/server";
import { aiRateLimit } from "@/lib/server/ai-guard";
import { generateATSTune } from "@/lib/ai/ats";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limited = aiRateLimit(req);
  if (limited) return limited;

  try {
    const { resumeText, jobContext } = (await req.json()) as {
      resumeText: string;
      jobContext?: string;
    };

    if (!resumeText || resumeText.trim().length < 20) {
      return NextResponse.json({ error: "Please provide valid resume text or bullet points" }, { status: 400 });
    }

    const result = await generateATSTune(resumeText, jobContext);
    return NextResponse.json({ result });
  } catch (err: unknown) {
    console.error("[AI ATS Tune]", err);
    return NextResponse.json({ error: "Failed to optimize resume for ATS" }, { status: 500 });
  }
}

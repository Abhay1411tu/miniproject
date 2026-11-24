import { NextResponse } from "next/server";
import { aiRateLimit } from "@/lib/server/ai-guard";
import { getCorpus } from "@/lib/corpus";
import { generateCopilot, type CopilotMode } from "@/lib/ai/copilot";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limited = aiRateLimit(req);
  if (limited) return limited;

  try {
    const { opportunityId, mode, profile } = (await req.json()) as {
      opportunityId: string;
      mode: CopilotMode;
      profile?: Profile;
    };

    if (!opportunityId || !mode) {
      return NextResponse.json({ error: "opportunityId and mode required" }, { status: 400 });
    }

    const corpus = await getCorpus();
    const opp = corpus.opportunities.find((o) => o.id === opportunityId);
    if (!opp) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    const prof: Profile = profile ?? { interests: [], skills: [] };
    const result = await generateCopilot(mode, opp, prof);

    return NextResponse.json({ result });
  } catch (err: unknown) {
    console.error("[AI Copilot]", err);
    return NextResponse.json({ error: "Failed to generate copilot guidance" }, { status: 500 });
  }
}

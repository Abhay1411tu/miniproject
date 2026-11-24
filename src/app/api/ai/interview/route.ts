import { NextResponse } from "next/server";
import { aiRateLimit } from "@/lib/server/ai-guard";
import { startInterview, evaluateAndProceed } from "@/lib/ai/interview";
import type { InterviewConfig, InterviewTurn } from "@/lib/types-interview";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limited = aiRateLimit(req);
  if (limited) return limited;

  try {
    const body = await req.json();
    const action = body.action as "start" | "respond";
    const profile = body.profile as Profile | undefined;

    if (action === "start") {
      const config = body.config as InterviewConfig;
      if (!config || !config.role) {
        return NextResponse.json({ error: "Interview config with role is required" }, { status: 400 });
      }
      const data = await startInterview(config, profile);
      return NextResponse.json(data);
    }

    if (action === "respond") {
      const config = body.config as InterviewConfig;
      const turns = body.turns as InterviewTurn[];
      const answer = body.answer as string;

      if (!config || !Array.isArray(turns) || turns.length === 0) {
        return NextResponse.json({ error: "Config and turn history are required" }, { status: 400 });
      }

      if (typeof answer !== "string") {
        return NextResponse.json({ error: "Candidate answer is required" }, { status: 400 });
      }

      const data = await evaluateAndProceed(config, turns, answer, profile);
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Invalid action specified (must be 'start' or 'respond')" }, { status: 400 });
  } catch (err: unknown) {
    console.error("[AI Interview]", err);
    return NextResponse.json({ error: "Failed to process interview interaction" }, { status: 500 });
  }
}


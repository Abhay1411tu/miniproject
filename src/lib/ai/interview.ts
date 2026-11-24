import "server-only";
import { generateJSON } from "./groq";
import type {
  InterviewConfig,
  InterviewTurn,
  QuestionEvaluation,
  FinalInterviewReport,
  StartInterviewResponse,
  RespondInterviewResponse,
} from "../types-interview";
import type { Profile } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// Prompts & Orchestrator for Voice Mock Interview Agent
// ─────────────────────────────────────────────────────────────────────────────

function roleContext(cfg: InterviewConfig): string {
  const company = cfg.company ? ` at ${cfg.company}` : "";
  const opp = cfg.opportunityTitle ? ` (Opportunity Context: ${cfg.opportunityTitle})` : "";
  return `Target Role: ${cfg.role}${company}${opp}. Round: ${cfg.roundType}. Difficulty: ${cfg.difficulty}. Target questions: ${cfg.questionCount}.`;
}

export async function startInterview(
  config: InterviewConfig,
  profile?: Profile,
): Promise<StartInterviewResponse> {
  const candidateSkills = profile?.skills?.length ? `Candidate Skills: ${profile.skills.join(", ")}` : "";

  const system = `You are a Senior Engineering Manager and expert technical recruiter. You are conducting an interactive voice mock interview.
Your questions must be natural, conversational, realistic, and tailored strictly to the role, difficulty, and round type.
Output ONLY valid JSON matching this schema:
{
  "welcomeMessage": "A warm, natural 1-2 sentence spoken intro welcoming the candidate to the interview round.",
  "firstQuestion": "A clear, realistic, conversational interview question to start the round.",
  "expectedKeyPoints": ["key technical concept or behavior expected in a great response", "point 2", "point 3"]
}`;

  const user = `${roleContext(config)}
${candidateSkills}
Generate the welcome message and Question #1 of ${config.questionCount}.`;

  const fallback = (): StartInterviewResponse => {
    const comp = config.company || "our engineering team";
    if (config.roundType === "behavioral") {
      return {
        welcomeMessage: `Welcome! I'm your AI interviewer for the ${config.role} role at ${comp}. Today we'll explore your background and problem-solving approach.`,
        firstQuestion: `To start off, could you tell me about a challenging technical or team problem you worked on recently, how you diagnosed it, and what the final outcome was?`,
        expectedKeyPoints: ["STAR method structure (Situation, Task, Action, Result)", "Clear ownership of decisions", "Measurable impact"],
        totalQuestions: config.questionCount,
      };
    } else if (config.roundType === "system-design") {
      return {
        welcomeMessage: `Hi there! Welcome to your System Design interview for the ${config.role} position at ${comp}.`,
        firstQuestion: `Let's begin with high-level architecture. If you were tasked with designing a real-time notification service delivering deadline alerts to 100,000 active students, how would you approach the component design and data flow?`,
        expectedKeyPoints: ["Decoupled queue or pub/sub architecture (Kafka/Redis)", "Push notification delivery (WebSockets/APNs/FCM)", "Idempotency and deduplication"],
        totalQuestions: config.questionCount,
      };
    }
    // Default technical
    return {
      welcomeMessage: `Hello and welcome! I'm glad to speak with you today for the ${config.role} role at ${comp}. Let's jump right into your technical interview.`,
      firstQuestion: `Could you walk me through your favorite technical stack or project, highlighting a key architectural decision you made and why you chose that approach over alternatives?`,
      expectedKeyPoints: ["Clear justification of trade-offs", "Understanding of performance or maintainability", "Practical hands-on knowledge"],
      totalQuestions: config.questionCount,
    };
  };

  const res = await generateJSON<Omit<StartInterviewResponse, "totalQuestions">>(
    system,
    user,
    1024,
    fallback,
  );

  return {
    ...res,
    totalQuestions: config.questionCount,
  };
}

export async function evaluateAndProceed(
  config: InterviewConfig,
  turns: InterviewTurn[],
  latestAnswer: string,
  profile?: Profile,
): Promise<RespondInterviewResponse> {
  const currentTurnIndex = turns.length;
  const currentTurn = turns[currentTurnIndex - 1];
  const isFinalQuestion = currentTurnIndex >= config.questionCount;
  const nextQuestionNumber = currentTurnIndex + 1;

  const system = `You are a Senior Technical Interviewer evaluating a candidate's spoken response.
Be constructive, honest, and encouraging.
Return JSON with this exact schema:
{
  "evaluation": {
    "score": <number between 1 and 10>,
    "spokenFeedback": "<A natural, spoken 1-2 sentence reaction to play via voice. Acknowledge what was good and hint at what was missing.>",
    "strengths": ["specific strength in their answer 1", "specific strength 2"],
    "improvements": ["concrete thing they should have included 1", "concrete improvement 2"],
    "modelAnswerSnippet": "<A concise 2-3 sentence exemplar answer demonstrating ideal technical depth>"
  },
  "isFinished": ${isFinalQuestion},
  ${
    !isFinalQuestion
      ? `"nextQuestion": "<The next realistic interview question (#${nextQuestionNumber} of ${config.questionCount}) following up on their experience or introducing the next topic>",
  "expectedKeyPoints": ["key point 1", "key point 2"]`
      : `"finalReport": {
    "overallScore": <integer between 40 and 98 based on cumulative answers>,
    "grade": "<A+ | A | B+ | B | C | Needs Practice>",
    "summary": "<2-3 sentence overall evaluation summary for the hiring committee>",
    "topStrengths": ["key technical competency shown", "communication strength", "problem solving"],
    "growthAreas": ["specific technical gap", "framing improvement"],
    "technicalKeywordMatches": ["keyword1", "keyword2", "keyword3"],
    "starMethodAdherence": "<Strong | Moderate | Needs Structure>",
    "actionableNextSteps": ["specific topic to study before the real interview", "practice tip"]
  }`
  }
}`;

  const turnsSummary = turns
    .map(
      (t, i) =>
        `Q${i + 1}: ${t.question}
Expected: ${t.expectedKeyPoints?.join(", ") || "General"}
Candidate Answer: ${t.candidateAnswer || "(skipped)"}`,
    )
    .join("\n\n");

  const user = `${roleContext(config)}
Previous conversation:
${turnsSummary}

Current Question (#${currentTurnIndex}):
"${currentTurn?.question}"

Candidate's Answer:
"${latestAnswer}"

Evaluate this answer and ${isFinalQuestion ? "generate the final comprehensive interview report card." : `ask question #${nextQuestionNumber}.`}`;

  const offlineEval = (): RespondInterviewResponse => {
    const wordCount = latestAnswer.trim().split(/\s+/).length;
    let score = 7;
    if (wordCount < 10) score = 4;
    else if (wordCount > 40) score = 8;
    if (latestAnswer.toLowerCase().includes("because") || latestAnswer.toLowerCase().includes("trade-off")) {
      score = Math.min(10, score + 1);
    }

    const evaluation: QuestionEvaluation = {
      score,
      spokenFeedback:
        score >= 7
          ? "Solid explanation! You touched on key trade-offs and kept your answer structured."
          : "Good start, though try to back up your points with specific technical metrics and examples.",
      strengths: ["Clear communication", "Addressed the core premise of the question"],
      improvements: ["Provide more quantitative impact or metrics", "Mention edge cases and failure modes"],
      modelAnswerSnippet:
        "A standout response explains both the immediate implementation choice and how it scales, noting trade-offs between memory, throughput, and developer ergonomics.",
    };

    if (isFinalQuestion) {
      const avgScore = Math.round(
        (turns.reduce((acc, t) => acc + (t.feedback?.score ?? score), 0) / turns.length) * 10,
      );
      const grade =
        avgScore >= 90 ? "A+" : avgScore >= 80 ? "A" : avgScore >= 70 ? "B+" : avgScore >= 60 ? "B" : "Needs Practice";

      const finalReport: FinalInterviewReport = {
        overallScore: Math.min(96, Math.max(50, avgScore)),
        grade,
        summary: `The candidate showed good conceptual understanding for the ${config.role} position with clear articulate reasoning. Continuing to practice structured STAR responses will elevate their technical depth even further.`,
        topStrengths: ["Clear verbal articulation", "Practical grasp of core concepts", "Direct responses"],
        growthAreas: ["Deepen discussion of scalability trade-offs", "Incorporate quantitative outcomes"],
        technicalKeywordMatches: ["Architecture", "System Flow", "Error Handling"],
        starMethodAdherence: "Moderate",
        actionableNextSteps: [
          "Review common concurrency and cache invalidation strategies.",
          "Practice timed 90-second structured technical responses using the STAR method.",
        ],
      };
      return {
        evaluation,
        isFinished: true,
        finalReport,
      };
    }

    const nextQList = [
      `How would you handle error recovery and state synchronization when a third-party service experiences high latency or downtime?`,
      `Can you discuss a time when you had to optimize performance bottlenecks in an application, and what profiling tools or metrics you used?`,
      `How do you approach writing clean, testable code, and what role do automated CI/CD pipelines play in your workflow?`,
    ];
    const nextQuestion = nextQList[(nextQuestionNumber - 2) % nextQList.length];

    return {
      evaluation,
      isFinished: false,
      nextQuestion,
      expectedKeyPoints: ["Resilience and circuit breaking", "Telemetry & monitoring", "Automated regression testing"],
    };
  };

  const res = await generateJSON<RespondInterviewResponse>(system, user, 2048, offlineEval);
  return res;
}


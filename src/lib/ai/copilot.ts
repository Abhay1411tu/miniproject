import "server-only";
import type { Opportunity, Profile } from "@/lib/types";
import { generateJSON } from "./groq";
import { SKILL_LABELS } from "@/lib/taxonomy";

export type CopilotMode = "cover-letter" | "cold-email" | "interview-prep" | "hackathon-ideas";

export interface CopilotResult {
  mode: CopilotMode;
  title: string;
  content: string;
  tips: string[];
}

export function offlineCopilotGenerate(
  mode: CopilotMode,
  opp: Opportunity,
  profile: Profile
): CopilotResult {
  const name = profile.name || "Student";
  const branch = profile.branch ? profile.branch.toUpperCase() : "Computer Science & Engineering";
  const skills = profile.skills?.length
    ? profile.skills.map((s) => SKILL_LABELS[s] ?? s).join(", ")
    : "Software Engineering, Problem Solving";
  const org = opp.organization || "your engineering team";
  const categoryTitle = opp.category.charAt(0).toUpperCase() + opp.category.slice(1);

  if (mode === "cold-email") {
    return {
      mode,
      title: "Targeted Cold Email Outreach",
      content: `Subject: ${branch} Student Interested in ${opp.title} at ${org}

Dear Hiring Team at ${org},

I hope this email finds you well.

I am writing to express my strong enthusiasm for the ${opp.title} opportunity. As a student with a solid foundation in ${skills}, I have been closely tracking ${org}'s work and was thrilled to discover this opening.

Through hands-on projects and technical coursework, I have developed practical problem-solving capabilities directly relevant to your initiatives. I would welcome the opportunity to contribute my dedication and technical drive to your team.

Could we schedule a brief 10-minute conversation this week to discuss how my skill set aligns with your upcoming objectives? My resume and project portfolio are attached for your review.

Thank you very much for your time and consideration.

Warm regards,
${name}
${branch} Undergraduate`,
      tips: [
        "Personalize the greeting with the recruiter or engineering manager's name if known.",
        "Link your GitHub, LinkedIn, or portfolio site directly in your signature.",
        "Send on Tuesday or Wednesday morning between 9:00 AM and 10:30 AM for peak open rates.",
      ],
    };
  }

  if (mode === "cover-letter") {
    return {
      mode,
      title: "Tailored Application Statement",
      content: `Dear Hiring Committee at ${org},

I am writing to formally submit my application for the ${opp.title} position. With an academic background in ${branch} and practical experience building solutions using ${skills}, I am eager to bring my problem-solving capabilities and collaborative mindset to ${org}.

During my academic studies, I have consistently prioritized hands-on project execution. I have architected and deployed applications requiring structured analytical thinking, modern software practices, and cross-functional teamwork. The technical challenges associated with ${opp.title} strongly resonate with my career goals, and I am particularly drawn to ${org}'s high standard of innovation.

What excites me most about this ${opp.category} is the opportunity to make an immediate, tangible impact while learning from experienced professionals. I thrive in agile, fast-paced environments where ownership and rapid learning are valued.

I look forward to the possibility of discussing my background in greater detail. Thank you for your review and consideration.

Sincerely,
${name}`,
      tips: [
        "Tailor paragraph 2 with 1-2 metrics from a specific project you built.",
        "Highlight your ability to learn new toolchains quickly.",
        "Keep cover letter to one page or ~300 words for maximum impact.",
      ],
    };
  }

  if (mode === "hackathon-ideas") {
    const primarySkill = profile.skills?.[0] ? SKILL_LABELS[profile.skills[0]] ?? profile.skills[0] : "AI";
    return {
      mode,
      title: "Winning Project Concepts",
      content: `### 1. SmartAssist — Autonomous ${primarySkill} Workflow Engine
- **Concept**: A real-time automation hub that connects fragmented APIs into a proactive assistant for ${opp.category === "hackathon" ? "hackathon developers" : "students"}.
- **Tech Stack**: Next.js, FastAPI, ${skills.split(",")[0] || "Python"}, WebSockets, Tailwind CSS.
- **Why It Wins**: Clear problem-solution fit, easy to demo visually in under 2 minutes, and incorporates sponsor tracks.

### 2. TrustGuard — Decentralized & Verifiable Credential Verifier
- **Concept**: Zero-knowledge and tamper-proof verification for project submissions, certifications, and developer credentials.
- **Tech Stack**: React, TypeScript, Smart Contracts / Cloud Database, REST APIs.
- **Why It Wins**: Strong appeal for security, enterprise, and blockchain sponsor prizes.

### 3. EduPulse — Adaptive Peer Learning & Squad Network
- **Concept**: AI-driven pair-programming and collaborative learning engine matching students based on knowledge gaps and real-time coding tasks.
- **Tech Stack**: Node.js, Vector Database, Embeddings, React frontend.
- **Why It Wins**: High social impact and universal judge resonance.`,
      tips: [
        "Pick one idea and create a clickable demo within the first 12 hours of the hackathon.",
        "Align your submission directly with 2 or more sponsor prize categories.",
        "Spend at least 30% of your remaining time polishing the demo video and pitch deck.",
      ],
    };
  }

  // Interview Prep
  return {
    mode,
    title: "Interview & Screening Cheat Sheet",
    content: `### 1. Core Technical Fundamentals
- **Question**: "Walk me through the architecture of a technical project you built using ${skills.split(",")[0] || "your core stack"}."
- **Talking Point**: Use the STAR method (Situation, Task, Action, Result). State the problem, why you chose this toolchain, bottlenecks you solved, and the final outcome.

### 2. Scalability & System Design
- **Question**: "How do you handle API rate limits, error retries, and network latency when building data-heavy client applications?"
- **Talking Point**: Mention exponential backoff, client-side in-memory caching, optimistic UI updates, and serverless background tasks.

### 3. Problem Solving & Debugging
- **Question**: "Tell me about a time when a critical bug occurred in production or during a project. How did you diagnose it?"
- **Talking Point**: Describe isolating variables, reading server logs, checking network payloads, and writing automated tests to avoid regression.

### 4. Culture & Motivation
- **Question**: "Why do you want to join ${org} specifically for this ${opp.category}?"
- **Talking Point**: Mention 1 specific initiative or product feature of ${org} and tie it back to your career path in ${branch}.`,
    tips: [
      "Prepare 2 thoughtful questions to ask the interviewer at the end of the round.",
      "Review foundational Data Structures (Arrays, Hash Maps, Trees) and time complexities.",
      "Keep your explanations concise — avoid monologuing past 2 minutes without checking in.",
    ],
  };
}

export async function generateCopilot(
  mode: CopilotMode,
  opp: Opportunity,
  profile: Profile
): Promise<CopilotResult> {
  const modePromptMap: Record<CopilotMode, string> = {
    "cold-email": "Write a high-converting, punchy 100-word cold outreach email to a recruiter/founder.",
    "cover-letter": "Write a compelling, professional 3-paragraph tailored cover letter.",
    "hackathon-ideas": "Propose 3 winner-caliber, unique project concepts with tech stack suggestions.",
    "interview-prep": "Provide the top 4 likely technical and behavioral screening questions with high-impact talking points.",
  };

  const system = `You are an elite career mentor and technical advisor for university students.
The student is applying to the following opportunity.
Task: ${modePromptMap[mode]}

Return a structured JSON object:
{
  "mode": "${mode}",
  "title": "Short title describing the output",
  "content": "The generated markdown text with clean formatting",
  "tips": ["Tip 1", "Tip 2", "Tip 3"]
}`;

  const user = `Student Profile:
Name: ${profile.name || "Student"}
Branch: ${profile.branch || "Engineering"}
Year: ${profile.year || "Undergraduate"}
Skills: ${profile.skills?.join(", ") || "Technical problem solving"}

Target Opportunity:
Title: ${opp.title}
Organization: ${opp.organization || "Host Organization"}
Category: ${opp.category}
Description: ${opp.summary || "Technical opportunity"}
Tags: ${opp.tags?.join(", ")}
Deadline: ${opp.deadline || "Rolling"}`;

  return await generateJSON<CopilotResult>(
    system,
    user,
    2048,
    () => offlineCopilotGenerate(mode, opp, profile)
  );
}

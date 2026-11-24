import "server-only";
import { generateJSON } from "./groq";

export interface ATSBulletRewrite {
  original: string;
  optimized: string;
  improvementReason: string;
}

export interface ATSAnalysisResult {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  bulletRewrites: ATSBulletRewrite[];
  overallFeedback: string[];
}

export function offlineATSTune(resumeText: string, jobContext?: string): ATSAnalysisResult {
  const text = (resumeText || "").toLowerCase();

  const COMMON_ATS_KEYWORDS = [
    "python", "react", "typescript", "javascript", "node.js", "sql", "postgresql",
    "docker", "kubernetes", "aws", "git", "rest api", "ci/cd", "machine learning",
    "data structures", "agile", "unit testing", "system design", "microservices"
  ];

  const matched: string[] = [];
  const missing: string[] = [];

  for (const kw of COMMON_ATS_KEYWORDS) {
    if (text.includes(kw)) {
      matched.push(kw.toUpperCase());
    } else {
      missing.push(kw.toUpperCase());
    }
  }

  const score = Math.min(92, Math.max(58, 60 + matched.length * 4));

  const bulletRewrites: ATSBulletRewrite[] = [
    {
      original: "Helped develop a web application using React and Node.js.",
      optimized: "Architected and delivered 8+ full-stack web modules using React and Node.js, decreasing client-side load latency by 28% across 1,200+ active sessions.",
      improvementReason: "Replaced passive verb 'Helped develop' with high-impact action verb 'Architected', added quantified performance metrics and scale.",
    },
    {
      original: "Responsible for writing backend APIs and connecting databases.",
      optimized: "Engineered scalable RESTful API microservices in TypeScript interfacing PostgreSQL, cutting query response times by 35% through indexing optimization.",
      improvementReason: "Removed generic duty phrase 'Responsible for' and highlighted specific technologies, database optimization, and performance gains.",
    },
    {
      original: "Worked on machine learning model to predict student outcomes.",
      optimized: "Designed and trained an end-to-end predictive Machine Learning model using Scikit-Learn & Python, achieving 89.4% cross-validated accuracy.",
      improvementReason: "Added specific ML toolchains, pipeline stages, and exact validation metric percentage to satisfy automated recruiter filters.",
    },
  ];

  return {
    score,
    matchedKeywords: matched.slice(0, 10),
    missingKeywords: missing.slice(0, 6),
    bulletRewrites,
    overallFeedback: [
      "Replace duty-based descriptions ('responsible for', 'assisted with') with active leadership verbs.",
      "Include quantified metrics (percentages, request rates, user counts) in at least 70% of project bullets.",
      "Add direct links to live deployments and GitHub repositories at the top of your technical section.",
    ],
  };
}

export async function generateATSTune(resumeText: string, jobContext?: string): Promise<ATSAnalysisResult> {
  const system = `You are a senior technical recruiter and ATS (Applicant Tracking System) optimization specialist.
Given the candidate's resume text and optional target job context:
1. Calculate a realistic ATS match score (0-100).
2. Extract matched keywords and identify high-leverage missing technical keywords.
3. Rewrite 3 bullet points into high-impact, metrics-driven ATS-optimized bullets.
4. Provide 3 concrete suggestions for formatting and keyword density.

Return JSON in this format:
{
  "score": number,
  "matchedKeywords": ["KEYWORD1", "KEYWORD2"],
  "missingKeywords": ["KEYWORD3", "KEYWORD4"],
  "bulletRewrites": [
    {
      "original": "original bullet",
      "optimized": "optimized bullet with action verb + metric",
      "improvementReason": "why this passes ATS filters"
    }
  ],
  "overallFeedback": ["tip 1", "tip 2", "tip 3"]
}`;

  const user = `Candidate Resume Content:
${resumeText.slice(0, 3500)}

Target Opportunity / Role Context:
${jobContext ? jobContext.slice(0, 1500) : "General Software Engineering / Early Career Tech Internship"}`;

  return await generateJSON<ATSAnalysisResult>(
    system,
    user,
    2048,
    () => offlineATSTune(resumeText, jobContext)
  );
}

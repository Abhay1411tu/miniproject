// ─────────────────────────────────────────────────────────────────────────────
// Interview Preparation & Voice Agent Types
// ─────────────────────────────────────────────────────────────────────────────

export type InterviewRoundType = "technical" | "behavioral" | "system-design" | "mixed";
export type InterviewDifficulty = "beginner" | "intermediate" | "advanced";

export interface InterviewConfig {
  role: string;
  company?: string;
  roundType: InterviewRoundType;
  difficulty: InterviewDifficulty;
  questionCount: number;
  opportunityId?: string;
  opportunityTitle?: string;
}

export interface QuestionEvaluation {
  score: number; // 1-10
  spokenFeedback: string;
  strengths: string[];
  improvements: string[];
  modelAnswerSnippet: string;
}

export interface InterviewTurn {
  questionNumber: number;
  question: string;
  expectedKeyPoints?: string[];
  candidateAnswer?: string;
  feedback?: QuestionEvaluation;
}

export interface FinalInterviewReport {
  overallScore: number; // 0 - 100
  grade: "A+" | "A" | "B+" | "B" | "C" | "Needs Practice";
  summary: string;
  topStrengths: string[];
  growthAreas: string[];
  technicalKeywordMatches: string[];
  starMethodAdherence?: string;
  actionableNextSteps: string[];
}

export interface InterviewSession {
  id: string;
  createdAt: string;
  config: InterviewConfig;
  turns: InterviewTurn[];
  isFinished: boolean;
  report?: FinalInterviewReport;
}

export interface StartInterviewResponse {
  welcomeMessage: string;
  firstQuestion: string;
  expectedKeyPoints: string[];
  totalQuestions: number;
}

export interface RespondInterviewResponse {
  evaluation: QuestionEvaluation;
  isFinished: boolean;
  nextQuestion?: string;
  expectedKeyPoints?: string[];
  finalReport?: FinalInterviewReport;
}


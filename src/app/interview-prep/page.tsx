import type { Metadata } from "next";
import { InterviewClient } from "@/components/interview/interview-client";

export const metadata: Metadata = {
  title: "AI Voice Interview Preparation — Argus",
  description: "Interactive AI Voice Mock Interviewer conducting real-time technical, behavioral, and system design rounds with instant verbal feedback and recruiter-grade scorecards.",
};

export default function InterviewPrepPage() {
  return <InterviewClient />;
}


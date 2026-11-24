"use client";

import { useState } from "react";
import { Award, CheckCircle2, TrendingUp, AlertTriangle, ArrowLeft, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import type { InterviewConfig, InterviewTurn, FinalInterviewReport } from "@/lib/types-interview";
import { cn } from "@/lib/utils";

interface InterviewReportProps {
  config: InterviewConfig;
  turns: InterviewTurn[];
  report: FinalInterviewReport;
  onReset: () => void;
}

export function InterviewReport({ config, turns, report, onReset }: InterviewReportProps) {
  const [copied, setCopied] = useState(false);
  const [expandedTurns, setExpandedTurns] = useState<Record<number, boolean>>({ 0: true });

  const toggleTurn = (index: number) => {
    setExpandedTurns((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const copySummary = () => {
    const text = `Argus Mock Interview Report
Role: ${config.role} ${config.company ? `@ ${config.company}` : ""}
Score: ${report.overallScore}/100 (${report.grade})
Summary: ${report.summary}

Top Strengths:
${report.topStrengths.map((s) => `• ${s}`).join("\n")}

Growth Areas:
${report.growthAreas.map((g) => `• ${g}`).join("\n")}`;

    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-signal-600 border-signal-500 bg-signal-500/10";
    if (score >= 70) return "text-emerald-600 border-emerald-500 bg-emerald-500/10";
    if (score >= 55) return "text-amber-600 border-amber-500 bg-amber-500/10";
    return "text-danger border-danger bg-danger/10";
  };

  return (
    <div className="flex flex-col gap-8 rounded-3xl border border-line bg-surface p-6 shadow-sm md:p-8">
      {/* Top action header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 text-xs font-semibold text-ink-2 hover:text-ink transition-colors"
        >
          <ArrowLeft size={16} />
          <span>New Practice Session</span>
        </button>

        <button
          onClick={copySummary}
          className="flex items-center gap-1.5 rounded-full border border-line bg-base px-3 py-1.5 text-xs font-medium text-ink-2 hover:bg-elevated transition-colors"
        >
          {copied ? <Check size={14} className="text-signal-600" /> : <Copy size={14} />}
          <span>{copied ? "Copied to Clipboard" : "Copy Summary"}</span>
        </button>
      </div>

      {/* Main Scorecard Banner */}
      <div className="flex flex-col md:flex-row items-center gap-6 rounded-2xl border border-line bg-gradient-to-r from-base to-surface p-6">
        {/* Score Ring */}
        <div className="flex flex-col items-center justify-center">
          <div
            className={cn(
              "flex h-28 w-28 flex-col items-center justify-center rounded-full border-4 shadow-md",
              getScoreColor(report.overallScore),
            )}
          >
            <span className="text-3xl font-extrabold tracking-tight">{report.overallScore}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">out of 100</span>
          </div>
          <span className="mt-2 text-xs font-bold uppercase tracking-wider text-ink-2">
            Grade: <span className="text-signal-600">{report.grade}</span>
          </span>
        </div>

        {/* High-level Summary */}
        <div className="flex-1 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <span className="rounded-full bg-signal-500/10 px-3 py-0.5 text-xs font-semibold text-signal-700">
              {config.roundType.toUpperCase()} ROUND
            </span>
            {report.starMethodAdherence && (
              <span className="rounded-full bg-base border border-line px-3 py-0.5 text-xs text-ink-2">
                STAR Method: <strong>{report.starMethodAdherence}</strong>
              </span>
            )}
          </div>
          <h2 className="mt-2 text-xl font-bold text-ink">
            {config.role} {config.company ? `@ ${config.company}` : ""}
          </h2>
          <p className="mt-2 text-sm text-ink-2 leading-relaxed">{report.summary}</p>
        </div>
      </div>

      {/* Strengths & Growth Areas Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Strengths */}
        <div className="rounded-2xl border border-signal-500/20 bg-signal-500/5 p-5">
          <div className="flex items-center gap-2 mb-3 text-signal-700 font-semibold text-sm">
            <CheckCircle2 size={18} />
            <span>Demonstrated Strengths</span>
          </div>
          <ul className="space-y-2 text-xs text-ink-2">
            {report.topStrengths.map((str, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-signal-600 font-bold">•</span>
                <span>{str}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Growth Areas */}
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="flex items-center gap-2 mb-3 text-amber-700 font-semibold text-sm">
            <TrendingUp size={18} />
            <span>High-Impact Growth Areas</span>
          </div>
          <ul className="space-y-2 text-xs text-ink-2">
            {report.growthAreas.map((gr, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-amber-600 font-bold">•</span>
                <span>{gr}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Actionable Next Steps & Keywords */}
      <div className="rounded-2xl border border-line bg-base p-5">
        <h3 className="text-xs font-semibold text-ink uppercase tracking-wider mb-2">
          Recommended Study Focus & Keywords
        </h3>
        {report.technicalKeywordMatches && report.technicalKeywordMatches.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {report.technicalKeywordMatches.map((kw, i) => (
              <span key={i} className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs text-ink font-medium">
                #{kw}
              </span>
            ))}
          </div>
        )}
        <ul className="space-y-1.5 text-xs text-ink-2">
          {report.actionableNextSteps.map((step, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-signal-600">→</span>
              <span>{step}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Turn-by-Turn Question Transcript & AI Breakdown */}
      <div>
        <h3 className="text-sm font-bold text-ink mb-4">Turn-by-Turn Question Breakdown</h3>
        <div className="space-y-3">
          {turns.map((turn, i) => {
            const isExpanded = !!expandedTurns[i];
            return (
              <div key={i} className="rounded-2xl border border-line bg-base overflow-hidden">
                <button
                  onClick={() => toggleTurn(i)}
                  className="flex w-full items-center justify-between p-4 text-left hover:bg-elevated transition-colors"
                >
                  <div className="flex items-center gap-3 pr-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface border border-line text-xs font-bold text-ink">
                      {i + 1}
                    </span>
                    <span className="text-xs font-semibold text-ink line-clamp-1">{turn.question}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {turn.feedback && (
                      <span className="rounded-full bg-signal-500/10 px-2.5 py-0.5 text-xs font-semibold text-signal-700">
                        {turn.feedback.score}/10
                      </span>
                    )}
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-line p-4 space-y-3 text-xs bg-surface/50">
                    <div>
                      <div className="font-semibold text-ink-3 uppercase text-[10px] mb-0.5">Question:</div>
                      <p className="text-ink font-medium">{turn.question}</p>
                    </div>

                    <div>
                      <div className="font-semibold text-ink-3 uppercase text-[10px] mb-0.5">Your Spoken Answer:</div>
                      <p className="text-ink-2 bg-base p-3 rounded-xl border border-line italic">
                        "{turn.candidateAnswer || "(No answer recorded)"}"
                      </p>
                    </div>

                    {turn.feedback && (
                      <>
                        <div>
                          <div className="font-semibold text-ink-3 uppercase text-[10px] mb-0.5">Interviewer Evaluation:</div>
                          <p className="text-ink-2">{turn.feedback.spokenFeedback}</p>
                        </div>

                        <div className="rounded-xl border border-line bg-base p-3">
                          <div className="font-semibold text-ink mb-1">Model Exemplar Snippet:</div>
                          <p className="text-ink-2 italic">{turn.feedback.modelAnswerSnippet}</p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Launch Another Session */}
      <div className="flex justify-center border-t border-line pt-4">
        <button
          onClick={onReset}
          className="rounded-full bg-signal-600 px-8 py-3 text-xs font-semibold text-white shadow-md hover:bg-signal-500 transition-all"
        >
          Practice Another Interview
        </button>
      </div>
    </div>
  );
}


"use client";

import { useState, useEffect } from "react";
import { Mic, BookOpen, History, Trash2, ArrowRight } from "lucide-react";
import { InterviewSetup } from "./interview-setup";
import { VoiceAgent } from "./voice-agent";
import { InterviewReport } from "./interview-report";
import { InterviewGuides } from "./interview-guides";
import type { InterviewConfig, InterviewTurn, FinalInterviewReport, InterviewSession } from "@/lib/types-interview";
import { cn } from "@/lib/utils";

type ViewState = "setup" | "interview" | "report";
type TabState = "practice" | "guides" | "history";

const HISTORY_KEY = "argus_interview_sessions_v1";

export function InterviewClient() {
  const [activeTab, setActiveTab] = useState<TabState>("practice");
  const [viewState, setViewState] = useState<ViewState>("setup");
  const [isLoading, setIsLoading] = useState(false);

  // Active Session State
  const [activeConfig, setActiveConfig] = useState<InterviewConfig | null>(null);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [initialQuestion, setInitialQuestion] = useState("");
  const [initialExpected, setInitialExpected] = useState<string[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(3);

  // Result state
  const [completedTurns, setCompletedTurns] = useState<InterviewTurn[]>([]);
  const [finalReport, setFinalReport] = useState<FinalInterviewReport | null>(null);

  // Saved past sessions
  const [history, setHistory] = useState<InterviewSession[]>([]);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as InterviewSession[];
        if (Array.isArray(parsed)) setHistory(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  const saveToHistory = (config: InterviewConfig, turns: InterviewTurn[], report: FinalInterviewReport) => {
    const session: InterviewSession = {
      id: "sess_" + Date.now(),
      createdAt: new Date().toISOString(),
      config,
      turns,
      isFinished: true,
      report,
    };
    const updated = [session, ...history].slice(0, 20); // Keep last 20
    setHistory(updated);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      // ignore
    }
  };

  const handleStartSession = async (config: InterviewConfig) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/ai/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", config }),
      });

      if (!res.ok) throw new Error("Failed to start session");
      const data = await res.json();

      setActiveConfig(config);
      setWelcomeMessage(data.welcomeMessage);
      setInitialQuestion(data.firstQuestion);
      setInitialExpected(data.expectedKeyPoints || []);
      setTotalQuestions(data.totalQuestions || config.questionCount);
      setViewState("interview");
    } catch (err) {
      alert("Could not start interview room. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinishSession = (turns: InterviewTurn[], report: FinalInterviewReport) => {
    setCompletedTurns(turns);
    setFinalReport(report);
    setViewState("report");
    if (activeConfig) {
      saveToHistory(activeConfig, turns, report);
    }
  };

  const handleReset = () => {
    setViewState("setup");
    setActiveConfig(null);
    setCompletedTurns([]);
    setFinalReport(null);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Sub-nav tabs (only visible when not actively in an interview) */}
      {viewState !== "interview" && (
        <div className="mb-6 flex items-center justify-between border-b border-line pb-4">
          <div className="flex gap-2">
            {[
              { id: "practice", label: "Voice Practice", icon: Mic },
              { id: "guides", label: "Cheat-Sheets", icon: BookOpen },
              { id: "history", label: `History (${history.length})`, icon: History },
            ].map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setActiveTab(t.id as TabState);
                    if (t.id === "practice" && viewState === "report") {
                      handleReset();
                    }
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all",
                    isActive
                      ? "bg-signal-500/15 text-signal-700 border border-signal-500/30"
                      : "text-ink-2 hover:bg-elevated hover:text-ink",
                  )}
                >
                  <Icon size={15} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Tab Views */}
      {activeTab === "guides" ? (
        <InterviewGuides />
      ) : activeTab === "history" ? (
        <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-ink">Past Mock Interview Sessions</h2>
              <p className="text-xs text-ink-3">Review your previous scorecards, answers, and improvement areas.</p>
            </div>
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="flex items-center gap-1.5 text-xs text-ink-3 hover:text-danger"
              >
                <Trash2 size={14} />
                <span>Clear History</span>
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="py-12 text-center text-xs text-ink-3">
              No interview sessions recorded yet. Start your first voice session to build your scorecard!
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((sess) => (
                <div
                  key={sess.id}
                  className="rounded-2xl border border-line bg-base p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-ink">
                        {sess.config.role} {sess.config.company ? `@ ${sess.config.company}` : ""}
                      </span>
                      <span className="rounded bg-surface border border-line px-2 py-0.5 text-[10px] font-semibold text-ink-3 uppercase">
                        {sess.config.roundType}
                      </span>
                    </div>
                    <p className="text-[11px] text-ink-3">
                      {new Date(sess.createdAt).toLocaleDateString()} • {sess.turns.length} questions answered
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {sess.report && (
                      <div className="flex items-center gap-2 text-right">
                        <div>
                          <div className="text-sm font-extrabold text-signal-700">
                            {sess.report.overallScore}/100
                          </div>
                          <div className="text-[10px] font-bold text-ink-3 uppercase">
                            Grade: {sess.report.grade}
                          </div>
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setActiveConfig(sess.config);
                        setCompletedTurns(sess.turns);
                        setFinalReport(sess.report!);
                        setViewState("report");
                        setActiveTab("practice");
                      }}
                      className="flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-2 hover:bg-elevated"
                    >
                      <span>View Report</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Practice Tab: Setup, Voice Agent, or Report */
        <>
          {viewState === "setup" && (
            <InterviewSetup onStart={handleStartSession} isLoading={isLoading} />
          )}

          {viewState === "interview" && activeConfig && (
            <VoiceAgent
              config={activeConfig}
              welcomeMessage={welcomeMessage}
              initialQuestion={initialQuestion}
              initialExpected={initialExpected}
              totalQuestions={totalQuestions}
              onFinish={handleFinishSession}
              onExit={handleReset}
            />
          )}

          {viewState === "report" && activeConfig && finalReport && (
            <InterviewReport
              config={activeConfig}
              turns={completedTurns}
              report={finalReport}
              onReset={handleReset}
            />
          )}
        </>
      )}
    </div>
  );
}


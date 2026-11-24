"use client";

import { useState } from "react";
import { Mic, Sparkles, Building2, Briefcase, Award, Zap, Layers, Compass } from "lucide-react";
import { useCollections } from "@/store/collections";
import type { InterviewConfig, InterviewRoundType, InterviewDifficulty } from "@/lib/types-interview";
import { cn } from "@/lib/utils";

interface InterviewSetupProps {
  onStart: (config: InterviewConfig) => void;
  isLoading: boolean;
}

const PRESET_ROLES = [
  "Frontend Engineer",
  "Full Stack Developer",
  "Backend Engineer (Node/Python)",
  "Data Scientist / ML Intern",
  "Android / Mobile Developer",
  "DevOps & Cloud Engineer",
];

const PRESET_COMPANIES = ["Google", "Amazon", "Microsoft", "Razorpay", "Flipkart", "High-Growth Startup"];

export function InterviewSetup({ onStart, isLoading }: InterviewSetupProps) {
  const savedOpportunities = useCollections((s) => s.saved);

  const [role, setRole] = useState("Full Stack Developer");
  const [company, setCompany] = useState("Razorpay");
  const [roundType, setRoundType] = useState<InterviewRoundType>("technical");
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>("intermediate");
  const [questionCount, setQuestionCount] = useState<number>(3);
  const [selectedOppId, setSelectedOppId] = useState<string>("");

  const handleOppSelect = (id: string) => {
    setSelectedOppId(id);
    if (!id) return;
    const opp = savedOpportunities.find((o) => o.id === id);
    if (opp) {
      if (opp.organization) setCompany(opp.organization);
      // derive sensible role from title
      const cleanTitle = opp.title.replace(/internship|hiring|contest|hackathon/gi, "").trim();
      if (cleanTitle.length > 3) setRole(cleanTitle);
    }
  };

  const handleLaunch = () => {
    if (!role.trim()) return;
    const selectedOpp = savedOpportunities.find((o) => o.id === selectedOppId);
    onStart({
      role: role.trim(),
      company: company.trim() || undefined,
      roundType,
      difficulty,
      questionCount,
      opportunityId: selectedOppId || undefined,
      opportunityTitle: selectedOpp?.title,
    });
  };

  return (
    <div className="flex flex-col gap-8 rounded-3xl border border-line bg-surface p-6 shadow-sm md:p-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-signal-500/20 bg-signal-500/10 px-3.5 py-1 text-xs font-semibold text-signal-700">
          <Sparkles size={14} />
          <span>Interactive AI Voice Agent</span>
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink md:text-3xl">
          Voice Mock Interview Practice Room
        </h1>
        <p className="mt-2 text-sm text-ink-2 max-w-2xl leading-relaxed">
          Simulate a real-time spoken interview with our AI Technical Lead. Speak your answers naturally
          through your microphone, receive instantaneous verbal feedback, and earn a recruiter-grade performance scorecard.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column: Role & Company */}
        <div className="space-y-5">
          {/* Saved Opportunity Link */}
          {savedOpportunities.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-ink-2 mb-1.5 flex items-center gap-1.5">
                <Compass size={14} className="text-signal-600" />
                <span>Practice for a Saved Opportunity (Optional):</span>
              </label>
              <select
                value={selectedOppId}
                onChange={(e) => handleOppSelect(e.target.value)}
                className="w-full rounded-2xl border border-line bg-base px-3.5 py-2.5 text-xs text-ink focus:border-signal-500 focus:outline-none focus:ring-1 focus:ring-signal-500"
              >
                <option key="default" value="">-- Choose from your saved opportunities --</option>
                {savedOpportunities.map((opp) => (
                  <option key={opp.id} value={opp.id}>
                    {opp.title} {opp.organization ? `(${opp.organization})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Target Role */}
          <div>
            <label className="text-xs font-semibold text-ink-2 mb-1.5 flex items-center gap-1.5">
              <Briefcase size={14} className="text-signal-600" />
              <span>Target Role:</span>
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Frontend Engineer, SDE Intern"
              className="w-full rounded-2xl border border-line bg-base px-4 py-2.5 text-sm text-ink focus:border-signal-500 focus:outline-none focus:ring-1 focus:ring-signal-500"
            />
            {/* Quick role pills */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PRESET_ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors",
                    role === r
                      ? "bg-signal-500/15 text-signal-700 font-semibold"
                      : "bg-base border border-line text-ink-3 hover:text-ink hover:border-line-strong",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Company */}
          <div>
            <label className="text-xs font-semibold text-ink-2 mb-1.5 flex items-center gap-1.5">
              <Building2 size={14} className="text-signal-600" />
              <span>Target Company / Organization:</span>
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Razorpay, Google, CRED, Early-Stage Startup"
              className="w-full rounded-2xl border border-line bg-base px-4 py-2.5 text-sm text-ink focus:border-signal-500 focus:outline-none focus:ring-1 focus:ring-signal-500"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PRESET_COMPANIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCompany(c)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors",
                    company === c
                      ? "bg-signal-500/15 text-signal-700 font-semibold"
                      : "bg-base border border-line text-ink-3 hover:text-ink hover:border-line-strong",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Round Type, Difficulty, Questions */}
        <div className="space-y-5">
          {/* Round Type */}
          <div>
            <label className="text-xs font-semibold text-ink-2 mb-2 block">
              Interview Round Focus:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "technical", label: "💻 Technical & Concepts", desc: "Core algorithms, coding & architecture" },
                { id: "behavioral", label: "🤝 Behavioral (STAR)", desc: "Conflict resolution, teamwork & ownership" },
                { id: "system-design", label: "🏛️ System Design", desc: "Scalability, caching, high-level design" },
                { id: "mixed", label: "⚡ Mixed Comprehensive", desc: "Balanced blend of technical & fit" },
              ].map((rt) => (
                <button
                  key={rt.id}
                  type="button"
                  onClick={() => setRoundType(rt.id as InterviewRoundType)}
                  className={cn(
                    "flex flex-col items-start rounded-2xl border p-3 text-left transition-all",
                    roundType === rt.id
                      ? "border-signal-500 bg-signal-500/10 text-signal-900 shadow-sm"
                      : "border-line bg-base text-ink-2 hover:bg-elevated hover:text-ink",
                  )}
                >
                  <span className="text-xs font-semibold">{rt.label}</span>
                  <span className="text-[10.5px] text-ink-3 mt-1 leading-snug">{rt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty & Length */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink-2 mb-1.5 block">
                Difficulty Level:
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as InterviewDifficulty)}
                className="w-full rounded-2xl border border-line bg-base px-3 py-2 text-xs text-ink focus:border-signal-500 focus:outline-none"
              >
                <option value="beginner">Beginner (Intern / Junior)</option>
                <option value="intermediate">Intermediate (Early Career)</option>
                <option value="advanced">Advanced (High-Bar / FAANG)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-ink-2 mb-1.5 block">
                Question Count:
              </label>
              <div className="flex gap-2">
                {[
                  { count: 3, label: "3 Qs (~5 min)" },
                  { count: 5, label: "5 Qs (~10 min)" },
                ].map((q) => (
                  <button
                    key={q.count}
                    type="button"
                    onClick={() => setQuestionCount(q.count)}
                    className={cn(
                      "flex-1 rounded-2xl border py-2 text-center text-xs font-medium transition-colors",
                      questionCount === q.count
                        ? "border-signal-500 bg-signal-500/15 text-signal-800 font-semibold"
                        : "border-line bg-base text-ink-3 hover:text-ink",
                    )}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Launch Action */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-line pt-6">
        <div className="flex items-center gap-2 text-xs text-ink-3">
          <Mic size={15} className="text-signal-600" />
          <span>Microphone access will be requested when the interview begins.</span>
        </div>

        <button
          onClick={handleLaunch}
          disabled={!role.trim() || isLoading}
          className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-signal-600 px-8 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-signal-500 hover:shadow-lg disabled:opacity-40"
        >
          {isLoading ? (
            <>
              <Sparkles size={16} className="animate-spin" />
              <span>Preparing Interview Room...</span>
            </>
          ) : (
            <>
              <Mic size={16} />
              <span>Start Voice Interview</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}


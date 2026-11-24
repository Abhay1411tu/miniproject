"use client";

import { useState } from "react";
import {
  Sparkles,
  Copy,
  Check,
  Mail,
  FileText,
  Lightbulb,
  HelpCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "../ui/button";
import { useProfile } from "@/store/profile";
import { useToastStore } from "@/store/toast";
import type { CopilotMode, CopilotResult } from "@/lib/ai/copilot";
import { cn } from "@/lib/utils";

export function AICopilot({
  opportunityId,
  category,
}: {
  opportunityId: string;
  category: string;
}) {
  const profile = useProfile((s) => s.profile);
  const pushToast = useToastStore((s) => s.push);

  const isHackathonOrContest = category === "hackathon" || category === "competition";
  const [mode, setMode] = useState<CopilotMode>(isHackathonOrContest ? "hackathon-ideas" : "cold-email");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CopilotResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [showTips, setShowTips] = useState(true);

  const handleGenerate = async (targetMode: CopilotMode = mode) => {
    setLoading(true);
    setCopied(false);
    try {
      const res = await fetch("/api/ai/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunityId,
          mode: targetMode,
          profile,
        }),
      });

      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      setResult(data.result);
      pushToast("AI Copilot draft ready!", "success");
    } catch {
      pushToast("Failed to generate AI guidance. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.content);
    setCopied(true);
    pushToast("Copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-line bg-surface/80 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Sparkles size={15} />
          </span>
          <div>
            <h4 className="text-[13px] font-semibold text-ink">AI Application Co-Pilot</h4>
            <p className="text-[11px] text-ink-3">Instant drafts and strategies personalized to your profile.</p>
          </div>
        </div>

        {result && (
          <Button size="sm" variant="ghost" onClick={() => handleGenerate(mode)} disabled={loading}>
            <RefreshCw size={13} className={cn(loading && "animate-spin")} /> Regenerate
          </Button>
        )}
      </div>

      {/* Mode Selector Tabs */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <button
          onClick={() => {
            setMode("cold-email");
            if (result && result.mode !== "cold-email") handleGenerate("cold-email");
          }}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition",
            mode === "cold-email"
              ? "bg-purple-600 text-white shadow-xs"
              : "bg-elevated text-ink-2 hover:bg-line hover:text-ink"
          )}
        >
          <Mail size={12} /> Cold Email
        </button>

        <button
          onClick={() => {
            setMode("cover-letter");
            if (result && result.mode !== "cover-letter") handleGenerate("cover-letter");
          }}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition",
            mode === "cover-letter"
              ? "bg-purple-600 text-white shadow-xs"
              : "bg-elevated text-ink-2 hover:bg-line hover:text-ink"
          )}
        >
          <FileText size={12} /> Cover Letter
        </button>

        {isHackathonOrContest && (
          <button
            onClick={() => {
              setMode("hackathon-ideas");
              if (result && result.mode !== "hackathon-ideas") handleGenerate("hackathon-ideas");
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition",
              mode === "hackathon-ideas"
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-elevated text-ink-2 hover:bg-line hover:text-ink"
            )}
          >
            <Lightbulb size={12} /> Hackathon Ideas
          </button>
        )}

        <button
          onClick={() => {
            setMode("interview-prep");
            if (result && result.mode !== "interview-prep") handleGenerate("interview-prep");
          }}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition",
            mode === "interview-prep"
              ? "bg-purple-600 text-white shadow-xs"
              : "bg-elevated text-ink-2 hover:bg-line hover:text-ink"
          )}
        >
          <HelpCircle size={12} /> Interview Prep
        </button>
      </div>

      {/* Main Action if not generated yet */}
      {!result && !loading && (
        <div className="mt-4 rounded-xl border border-dashed border-line p-5 text-center">
          <p className="text-xs text-ink-2">
            Generate an outreach draft or prep sheet crafted for your profile and this specific opportunity.
          </p>
          <Button
            size="sm"
            onClick={() => handleGenerate(mode)}
            className="mt-3 bg-purple-600 text-white hover:bg-purple-700"
          >
            <Sparkles size={14} /> Generate {mode.replace("-", " ")}
          </Button>
        </div>
      )}

      {loading && (
        <div className="mt-4 space-y-2.5 rounded-xl border border-line bg-base/50 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-purple-600">
            <Sparkles size={14} className="animate-spin" /> Synthesizing profile & requirements with AI…
          </div>
          <div className="h-3 w-full animate-pulse rounded bg-elevated" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-elevated" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-elevated" />
        </div>
      )}

      {/* Result Output */}
      {result && !loading && (
        <div className="mt-4 space-y-3">
          <div className="relative rounded-xl border border-line bg-base/80 p-3.5">
            <button
              onClick={handleCopy}
              className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-1 text-[11px] font-medium text-ink-2 shadow-xs hover:text-ink transition"
            >
              {copied ? (
                <>
                  <Check size={12} className="text-emerald-500" /> Copied
                </>
              ) : (
                <>
                  <Copy size={12} /> Copy
                </>
              )}
            </button>

            <h5 className="mb-2 text-xs font-semibold text-ink">{result.title}</h5>
            <div className="whitespace-pre-wrap text-[12px] leading-relaxed text-ink font-mono bg-surface/50 p-2.5 rounded-lg border border-line/60 overflow-x-auto max-h-72 overflow-y-auto">
              {result.content}
            </div>
          </div>

          {/* Actionable Tips */}
          {result.tips && result.tips.length > 0 && (
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/[0.04] p-3 text-xs">
              <button
                onClick={() => setShowTips((v) => !v)}
                className="flex w-full items-center justify-between font-semibold text-purple-900 dark:text-purple-300"
              >
                <span>💡 Strategy & Submission Tips</span>
                {showTips ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
              {showTips && (
                <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-ink-2 leading-relaxed">
                  {result.tips.map((tip, idx) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

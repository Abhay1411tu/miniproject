"use client";

import { useState } from "react";
import { Sparkles, Check, Copy, AlertCircle, ArrowRight, CheckCircle2, ShieldCheck, ChevronRight } from "lucide-react";
import { Button } from "../ui/button";
import { useToastStore } from "@/store/toast";
import type { ATSAnalysisResult } from "@/lib/ai/ats";
import { cn } from "@/lib/utils";

const SAMPLE_BULLET =
  "Built an e-commerce website using React and Node.js. Handled the database with MongoDB and created user authentication with JWT. Deployed on Vercel.";

export function ATSResumeOptimizer({ defaultContext }: { defaultContext?: string }) {
  const pushToast = useToastStore((s) => s.push);

  const [inputBullets, setInputBullets] = useState(SAMPLE_BULLET);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ATSAnalysisResult | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleOptimize = async () => {
    if (!inputBullets.trim()) {
      pushToast("Please enter at least one resume bullet point or project description", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/ai/ats-tune", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: inputBullets,
          jobContext: defaultContext,
        }),
      });

      if (!res.ok) throw new Error("Optimization failed");
      const data = await res.json();
      setResult(data.result);
      pushToast("ATS Optimization completed!", "success");
    } catch {
      pushToast("Optimization error. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyBullet = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    pushToast("Optimized bullet copied to clipboard!", "success");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="panel p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck size={16} />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-ink">ATS Resume Optimizer & Bullet Tuner</h3>
            <p className="text-[12px] text-ink-3">
              Transform generic resume descriptions into high-ranking, recruiter-approved ATS bullet points.
            </p>
          </div>
        </div>

        <Button size="sm" onClick={handleOptimize} disabled={loading} className="bg-emerald-600 text-white hover:bg-emerald-700">
          <Sparkles size={14} className={cn(loading && "animate-spin")} />
          {loading ? "Optimizing…" : "Optimize with AI"}
        </Button>
      </div>

      {/* Input Textarea */}
      <div className="mt-3.5">
        <label className="mb-1.5 block text-[12px] font-medium text-ink-2">
          Paste your resume bullet points, project description, or skills:
        </label>
        <textarea
          rows={3}
          value={inputBullets}
          onChange={(e) => setInputBullets(e.target.value)}
          placeholder="e.g. Developed a web application using React and Firebase. Responsible for authentication and backend calls…"
          className="w-full resize-none rounded-xl border border-line bg-surface p-3 text-xs text-ink outline-none focus:border-emerald-500 transition"
        />
      </div>

      {/* Results View */}
      {result && (
        <div className="mt-5 space-y-4">
          {/* Top Metric Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-base/60 p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-500/10 font-mono text-lg font-bold text-emerald-600">
                {result.score}%
              </div>
              <div>
                <p className="text-xs font-semibold text-ink">ATS Keyword & Metric Readiness</p>
                <p className="text-[11px] text-ink-3">
                  {result.score >= 80
                    ? "Strong ATS density with active verbs and toolchains."
                    : "Good base, but needs quantified impact to pass strict corporate filters."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-700 dark:text-emerald-300">
                ✓ {result.matchedKeywords.length} Matched Keywords
              </span>
              <span className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 font-medium text-amber-700 dark:text-amber-300">
                ⚠ {result.missingKeywords.length} Missing Keywords
              </span>
            </div>
          </div>

          {/* Keywords Breakdown */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-line bg-surface p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-600">
                ✓ High-Impact Keywords Detected
              </p>
              <div className="flex flex-wrap gap-1.5">
                {result.matchedKeywords.map((kw, i) => (
                  <span key={i} className="rounded-md border border-line bg-elevated px-2 py-0.5 text-[11px] text-ink-2">
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-line bg-surface p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-600">
                + Recommended Keywords to Include
              </p>
              <div className="flex flex-wrap gap-1.5">
                {result.missingKeywords.map((kw, i) => (
                  <span key={i} className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                    +{kw}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Side-by-Side Bullet Rewrites */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-ink">ATS-Optimized Bullet Rewrites</h4>
            {result.bulletRewrites.map((item, idx) => (
              <div key={idx} className="rounded-xl border border-line bg-surface p-3.5 shadow-xs">
                {/* Before */}
                <div className="mb-2 text-[11px]">
                  <span className="font-semibold text-rose-500 uppercase tracking-wider text-[10px] mr-1.5">
                    Before (Generic):
                  </span>
                  <span className="text-ink-3 line-through">{item.original}</span>
                </div>

                {/* After */}
                <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/[0.04] p-3 text-[12px] leading-relaxed text-ink font-medium">
                  <div className="flex items-start justify-between gap-3">
                    <p className="flex-1">{item.optimized}</p>
                    <button
                      onClick={() => handleCopyBullet(item.optimized, idx)}
                      className="shrink-0 inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-1 text-[11px] text-ink-2 hover:text-ink transition shadow-xs"
                    >
                      {copiedIndex === idx ? (
                        <>
                          <Check size={12} className="text-emerald-500" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy size={12} /> Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Reason */}
                <p className="mt-2 text-[11px] text-ink-3">
                  <span className="font-medium text-ink-2">Why it ranks higher:</span> {item.improvementReason}
                </p>
              </div>
            ))}
          </div>

          {/* Feedback tips */}
          <div className="rounded-xl border border-line bg-base/50 p-3.5 text-xs">
            <p className="mb-1.5 font-semibold text-ink">Recruiter & ATS Formatting Advice</p>
            <ul className="list-disc space-y-1 pl-4 text-[11px] text-ink-2">
              {result.overallFeedback.map((fb, i) => (
                <li key={i}>{fb}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

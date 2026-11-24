"use client";

import { useEffect, useMemo, useState } from "react";
import { Bookmark, CircleCheckBig, GitCompareArrows, LayoutList, Columns3 } from "lucide-react";
import type { ScoredOpportunity } from "@/lib/types";
import { useProfile } from "@/store/profile";
import { useCollections } from "@/store/collections";
import { usePipeline } from "@/store/pipeline";
import { OpportunityCard } from "../feed/opportunity-card";
import { OpportunityDetail } from "../feed/opportunity-detail";
import { PipelineKanban } from "./pipeline-kanban";
import { Spinner } from "../ui/primitives";
import { cn } from "@/lib/utils";
import { ComparisonTable } from "../ai/comparison-table";
import { Button } from "../ui/button";

export function SavedClient() {
  const profile = useProfile((s) => s.profile);
  const phyd = useProfile((s) => s.hydrated);
  const saved = useCollections((s) => s.saved);
  const applied = useCollections((s) => s.applied);
  const chyd = useCollections((s) => s.hydrated);
  const pipelineEntries = usePipeline((s) => s.entries);
  const setPipelineStage = usePipeline((s) => s.setStage);

  const [viewMode, setViewMode] = useState<"pipeline" | "list">("pipeline");
  const [tab, setTab] = useState<"saved" | "applied">("saved");
  const [items, setItems] = useState<ScoredOpportunity[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ScoredOpportunity | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  // Collect all tracked IDs across collections and pipeline
  const ids = useMemo(() => {
    const pipelineIds = Object.keys(pipelineEntries);
    return [...new Set([...saved, ...applied, ...pipelineIds])];
  }, [saved, applied, pipelineEntries]);

  const idsKey = ids.join(",");

  useEffect(() => {
    if (!phyd || !chyd) return;
    let cancelled = false;
    (async () => {
      if (ids.length === 0) {
        if (!cancelled) {
          setItems([]);
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      try {
        const res = await fetch("/api/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile, ids }),
        });
        const json = await res.json();
        if (!cancelled) {
          setItems(json.items ?? []);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setItems([]);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phyd, chyd, idsKey, profile]);

  const list = (items ?? [])
    .filter((s) => (tab === "saved" ? saved.includes(s.opportunity.id) : applied.includes(s.opportunity.id)))
    .sort((a, b) => {
      const da = a.opportunity.deadline ? new Date(a.opportunity.deadline).getTime() : Infinity;
      const db = b.opportunity.deadline ? new Date(b.opportunity.deadline).getTime() : Infinity;
      return da - db;
    });

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Application Pipeline & Saved</h1>
          <p className="mt-1 text-sm text-ink-2">
            Track your status, manage interview stages, and organize deadlines in one place.
          </p>
        </div>

        {/* View Switcher: Pipeline Kanban vs List */}
        <div className="inline-flex items-center gap-1 rounded-full border border-line bg-surface p-1">
          <button
            onClick={() => setViewMode("pipeline")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 h-8 text-[12px] font-medium transition",
              viewMode === "pipeline" ? "bg-elevated text-ink shadow-xs" : "text-ink-3 hover:text-ink"
            )}
          >
            <Columns3 size={14} className={viewMode === "pipeline" ? "text-signal-500" : ""} />
            Pipeline Board
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 h-8 text-[12px] font-medium transition",
              viewMode === "list" ? "bg-elevated text-ink shadow-xs" : "text-ink-3 hover:text-ink"
            )}
          >
            <LayoutList size={14} className={viewMode === "list" ? "text-signal-500" : ""} />
            List View
          </button>
        </div>
      </div>

      {viewMode === "pipeline" ? (
        <div className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-24 text-ink-3">
              <Spinner className="h-6 w-6" />
            </div>
          ) : (
            <PipelineKanban opportunities={items ?? []} onOpen={setSelected} />
          )}
        </div>
      ) : (
        <>
          <div className="mt-5 inline-flex items-center gap-1 rounded-full border border-line bg-surface p-1">
            {(
              [
                { key: "saved", label: "Saved", count: saved.length, icon: Bookmark },
                { key: "applied", label: "Applied", count: applied.length, icon: CircleCheckBig },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-4 h-9 text-[13px] font-medium transition-colors",
                  tab === t.key ? "bg-elevated text-ink" : "text-ink-2 hover:text-ink",
                )}
              >
                <t.icon size={15} className={tab === t.key ? "text-signal-500" : ""} />
                {t.label}
                <span className="text-[11px] tabular-nums text-ink-3">{t.count}</span>
              </button>
            ))}
          </div>

          {/* Compare button */}
          {list.length >= 2 && (
            <div className="mt-3 flex items-center gap-3">
              <p className="text-[12px] text-ink-3">
                {compareIds.length === 0
                  ? "Select 2–4 to compare"
                  : `${compareIds.length} selected`}
              </p>
              {compareIds.length >= 2 && (
                <Button size="sm" onClick={() => setCompareOpen(true)}>
                  <GitCompareArrows size={14} /> Compare selected
                </Button>
              )}
              {compareIds.length > 0 && (
                <button onClick={() => setCompareIds([])} className="text-[12px] text-ink-3 hover:text-ink">
                  Clear
                </button>
              )}
            </div>
          )}

          <div className="mt-6">
            {loading && (
              <div className="flex items-center justify-center py-20 text-ink-3">
                <Spinner className="h-6 w-6" />
              </div>
            )}

            {!loading && list.length === 0 && (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line-strong px-6 py-16 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-elevated text-ink-3">
                  {tab === "saved" ? <Bookmark size={22} /> : <CircleCheckBig size={22} />}
                </div>
                <h3 className="text-base font-semibold text-ink">
                  {tab === "saved" ? "Nothing saved yet" : "No applications tracked"}
                </h3>
                <p className="max-w-sm text-sm text-ink-2">
                  {tab === "saved"
                    ? "Tap the bookmark on any opportunity to save it here and get deadline nudges."
                    : "Mark opportunities as applied to keep your applications in one place."}
                </p>
              </div>
            )}

            {!loading && list.length > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {list.map((s, i) => (
                  <div key={s.opportunity.id} className="relative">
                    <label className="absolute left-3 top-3 z-10 flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-line bg-surface/90 shadow-sm">
                      <input
                        type="checkbox"
                        checked={compareIds.includes(s.opportunity.id)}
                        onChange={(e) => {
                          if (e.target.checked && compareIds.length < 4) {
                            setCompareIds([...compareIds, s.opportunity.id]);
                          } else {
                            setCompareIds(compareIds.filter((id) => id !== s.opportunity.id));
                          }
                        }}
                        className="h-3.5 w-3.5 accent-signal-500"
                      />
                    </label>
                    <OpportunityCard scored={s} onOpen={setSelected} index={i} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <OpportunityDetail scored={selected} onClose={() => setSelected(null)} />

      <ComparisonTable
        opportunityIds={compareIds}
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
      />
    </div>
  );
}

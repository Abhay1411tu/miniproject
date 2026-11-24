"use client";

import { useState } from "react";
import {
  Bookmark,
  Send,
  Calendar,
  Trophy,
  Archive,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  Trash2,
  Clock,
} from "lucide-react";
import type { ScoredOpportunity } from "@/lib/types";
import { usePipeline, type PipelineStage, STAGE_CONFIG } from "@/store/pipeline";
import { CATEGORY_COLOR, CATEGORY_ICON } from "../feed/category-icon";
import { DeadlineCountdown } from "../feed/deadline-countdown";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";

const STAGES: PipelineStage[] = ["saved", "applied", "interviewing", "offer", "rejected"];

const STAGE_ICONS: Record<PipelineStage, React.ComponentType<{ size?: number; className?: string }>> = {
  saved: Bookmark,
  applied: Send,
  interviewing: Calendar,
  offer: Trophy,
  rejected: Archive,
};

export function PipelineKanban({
  opportunities,
  onOpen,
}: {
  opportunities: ScoredOpportunity[];
  onOpen: (s: ScoredOpportunity) => void;
}) {
  const entries = usePipeline((s) => s.entries);
  const setStage = usePipeline((s) => s.setStage);
  const updateEntry = usePipeline((s) => s.updateEntry);
  const removeEntry = usePipeline((s) => s.removeEntry);

  const [activeNotesId, setActiveNotesId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  const getOpp = (id: string) => opportunities.find((o) => o.opportunity.id === id);

  // Group opportunities into stages
  const columns: Record<PipelineStage, ScoredOpportunity[]> = {
    saved: [],
    applied: [],
    interviewing: [],
    offer: [],
    rejected: [],
  };

  for (const s of opportunities) {
    const stage = entries[s.opportunity.id]?.stage ?? "saved";
    if (columns[stage]) {
      columns[stage].push(s);
    } else {
      columns.saved.push(s);
    }
  }

  const handleOpenNotes = (id: string) => {
    setActiveNotesId(id);
    setNoteDraft(entries[id]?.notes || "");
  };

  const handleSaveNotes = (id: string) => {
    updateEntry(id, { notes: noteDraft });
    setActiveNotesId(null);
  };

  return (
    <div className="mt-4">
      <div className="flex gap-4 overflow-x-auto pb-6 pt-2">
        {STAGES.map((stage) => {
          const config = STAGE_CONFIG[stage];
          const Icon = STAGE_ICONS[stage];
          const stageItems = columns[stage] || [];

          return (
            <div
              key={stage}
              className="flex w-[290px] shrink-0 flex-col rounded-2xl border border-line bg-surface/60 p-3 shadow-sm"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 pt-1">
                <div className="flex items-center gap-2">
                  <span className={cn("grid h-6 w-6 place-items-center rounded-lg border", config.bg, config.border, config.color)}>
                    <Icon size={13} />
                  </span>
                  <span className="text-[13px] font-semibold text-ink">{config.label}</span>
                </div>
                <span className="rounded-full bg-elevated px-2 py-0.5 text-[11px] font-mono font-medium text-ink-3 tabular-nums">
                  {stageItems.length}
                </span>
              </div>

              {/* Column Body */}
              <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto max-h-[68vh] pr-0.5">
                {stageItems.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-line py-10 text-center text-[12px] text-ink-3">
                    <p>No items in {config.label.toLowerCase()}</p>
                  </div>
                ) : (
                  stageItems.map((scored) => {
                    const opp = scored.opportunity;
                    const entry = entries[opp.id];
                    const CategoryIcon = CATEGORY_ICON[opp.category];
                    const categoryColor = CATEGORY_COLOR[opp.category];

                    return (
                      <div
                        key={opp.id}
                        className="group relative rounded-xl border border-line bg-surface p-3.5 shadow-xs transition hover:border-line-strong hover:shadow-md"
                      >
                        {/* Category & Badge */}
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider", categoryColor)}>
                            <CategoryIcon size={10} />
                            {opp.category}
                          </span>
                          {opp.deadline && (
                            <div className="text-[11px]">
                              <DeadlineCountdown deadline={opp.deadline} />
                            </div>
                          )}
                        </div>

                        {/* Title & Organization */}
                        <div className="mt-2 cursor-pointer" onClick={() => onOpen(scored)}>
                          <h4 className="text-[13px] font-semibold leading-snug text-ink line-clamp-2 hover:text-signal-500">
                            {opp.title}
                          </h4>
                          {opp.organization && (
                            <p className="mt-0.5 text-[11px] text-ink-3">{opp.organization}</p>
                          )}
                        </div>

                        {/* Notes preview if present */}
                        {entry?.notes && (
                          <div className="mt-2 rounded-lg bg-base/60 p-2 text-[11px] text-ink-2 leading-relaxed border border-line/60">
                            <span className="font-medium text-ink-3 mr-1">Note:</span>
                            {entry.notes}
                          </div>
                        )}

                        {/* Actions bar */}
                        <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2 text-[11px]">
                          {/* Stage shift dropdown */}
                          <div className="relative">
                            <select
                              value={stage}
                              onChange={(e) => setStage(opp.id, e.target.value as PipelineStage)}
                              className="h-6 rounded-md border border-line bg-elevated px-1.5 text-[11px] font-medium text-ink-2 outline-none hover:text-ink focus:border-signal-500"
                            >
                              {STAGES.map((s) => (
                                <option key={s} value={s}>
                                  → {STAGE_CONFIG[s].label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-1.5 text-ink-3">
                            <button
                              onClick={() => handleOpenNotes(opp.id)}
                              title="Add or edit note"
                              className="grid h-6 w-6 place-items-center rounded-md hover:bg-elevated hover:text-ink transition"
                            >
                              <MessageSquare size={12} />
                            </button>
                            <a
                              href={opp.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open original link"
                              className="grid h-6 w-6 place-items-center rounded-md hover:bg-elevated hover:text-ink transition"
                            >
                              <ExternalLink size={12} />
                            </a>
                            <button
                              onClick={() => removeEntry(opp.id)}
                              title="Remove from pipeline"
                              className="grid h-6 w-6 place-items-center rounded-md hover:bg-elevated hover:text-rose-500 transition"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Note Editing Modal/Dropdown */}
                        {activeNotesId === opp.id && (
                          <div className="mt-2.5 rounded-xl border border-signal-500/30 bg-surface p-2.5 shadow-lg">
                            <textarea
                              rows={2}
                              value={noteDraft}
                              onChange={(e) => setNoteDraft(e.target.value)}
                              placeholder="e.g. Sent referral request to John on LinkedIn, follow up Thursday…"
                              className="w-full resize-none rounded-lg border border-line bg-base p-2 text-xs text-ink outline-none focus:border-signal-500"
                            />
                            <div className="mt-2 flex justify-end gap-1.5">
                              <Button size="sm" variant="ghost" onClick={() => setActiveNotesId(null)}>
                                Cancel
                              </Button>
                              <Button size="sm" onClick={() => handleSaveNotes(opp.id)}>
                                Save Note
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

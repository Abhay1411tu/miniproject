"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useCollections } from "./collections";

export type PipelineStage = "saved" | "applied" | "interviewing" | "offer" | "rejected";

export interface PipelineEntry {
  id: string;
  stage: PipelineStage;
  updatedAt: string;
  appliedDate?: string;
  notes?: string;
  nextAction?: string;
}

export const STAGE_CONFIG: Record<
  PipelineStage,
  { label: string; color: string; bg: string; border: string; iconName: string }
> = {
  saved: {
    label: "Shortlisted",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    iconName: "Bookmark",
  },
  applied: {
    label: "Applied",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    iconName: "Send",
  },
  interviewing: {
    label: "Interview / Review",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    iconName: "Calendar",
  },
  offer: {
    label: "Offer / Won",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    iconName: "Trophy",
  },
  rejected: {
    label: "Closed",
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    iconName: "Archive",
  },
};

interface PipelineState {
  entries: Record<string, PipelineEntry>;
  hydrated: boolean;
  setStage: (id: string, stage: PipelineStage) => void;
  updateEntry: (id: string, patch: Partial<PipelineEntry>) => void;
  removeEntry: (id: string) => void;
  getStage: (id: string) => PipelineStage | null;
  _setHydrated: () => void;
}

export const usePipeline = create<PipelineState>()(
  persist(
    (set, get) => ({
      entries: {},
      hydrated: false,
      setStage: (id, stage) => {
        const now = new Date().toISOString();
        const existing = get().entries[id] || { id, stage, updatedAt: now };
        const updated: PipelineEntry = {
          ...existing,
          stage,
          updatedAt: now,
          appliedDate: stage === "applied" && !existing.appliedDate ? now : existing.appliedDate,
        };

        set((s) => ({
          entries: { ...s.entries, [id]: updated },
        }));

        // Keep useCollections synchronized
        const collections = useCollections.getState();
        if (stage === "saved") {
          if (!collections.isSaved(id)) collections.toggleSaved(id);
          collections.setApplied(id, false);
        } else if (stage === "applied" || stage === "interviewing" || stage === "offer") {
          collections.setApplied(id, true);
        }
      },
      updateEntry: (id, patch) => {
        const existing = get().entries[id];
        if (!existing) return;
        set((s) => ({
          entries: {
            ...s.entries,
            [id]: { ...existing, ...patch, updatedAt: new Date().toISOString() },
          },
        }));
      },
      removeEntry: (id) => {
        set((s) => {
          const next = { ...s.entries };
          delete next[id];
          return { entries: next };
        });
      },
      getStage: (id) => get().entries[id]?.stage ?? null,
      _setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "argus-pipeline",
      partialize: (s) => ({ entries: s.entries }),
      onRehydrateStorage: () => (state) => state?._setHydrated(),
    },
  ),
);

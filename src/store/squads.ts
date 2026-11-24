"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SquadMember {
  name: string;
  role: string;
  branch?: string;
  skills: string[];
}

export interface SquadPost {
  id: string;
  opportunityId: string;
  teamName: string;
  projectIdea?: string;
  lookingFor: string[]; // Roles needed, e.g. ["UI/UX Designer", "ML Engineer"]
  members: SquadMember[];
  contactHandle: string; // e.g. "discord: alex#1234" or "telegram: @dev_arjun"
  contactType: "discord" | "telegram" | "email" | "linkedin";
  createdAt: string;
}

const SEED_SQUADS: SquadPost[] = [
  {
    id: "squad_1",
    opportunityId: "devpost:wxquod",
    teamName: "NeuroFlow Labs",
    projectIdea: "Building an agentic desktop automation tool powered by local SLMs and vision models.",
    lookingFor: ["UI/UX Designer", "FastAPI / Backend Engineer"],
    members: [
      { name: "Aarav Sharma", role: "AI / ML Lead", branch: "CSE", skills: ["Python", "PyTorch", "Transformers"] },
      { name: "Priya Nair", role: "Frontend Dev", branch: "IT", skills: ["Next.js", "React", "Tailwind CSS"] },
    ],
    contactHandle: "discord: aarav_ai#4421",
    contactType: "discord",
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: "squad_2",
    opportunityId: "devpost:wxquod",
    teamName: "ZeroLag Syndicate",
    projectIdea: "Real-time edge video analytics with NVIDIA TensorRT & WebRTC dashboard.",
    lookingFor: ["Fullstack Engineer", "DevOps / Cloud Specialist"],
    members: [
      { name: "Rohan Verma", role: "Systems & GPU Dev", branch: "ECE", skills: ["C++", "CUDA", "Python"] },
    ],
    contactHandle: "telegram: @rohan_gpu",
    contactType: "telegram",
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: "squad_3",
    opportunityId: "devpost:1cnnpg5",
    teamName: "FinTech Hackers",
    projectIdea: "AI financial compliance and smart fraud detection for Indian UPI micropayments.",
    lookingFor: ["Frontend / Mobile Dev", "Product Designer"],
    members: [
      { name: "Sneha Patel", role: "Data Science & Backend", branch: "CSE", skills: ["Python", "SQL", "Scikit-Learn"] },
    ],
    contactHandle: "telegram: @sneha_data",
    contactType: "telegram",
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
];

interface SquadState {
  squads: SquadPost[];
  hydrated: boolean;
  addSquad: (post: Omit<SquadPost, "id" | "createdAt">) => void;
  removeSquad: (id: string) => void;
  getSquadsForOpportunity: (oppId: string) => SquadPost[];
  _setHydrated: () => void;
}

export const useSquads = create<SquadState>()(
  persist(
    (set, get) => ({
      squads: SEED_SQUADS,
      hydrated: false,
      addSquad: (post) => {
        const newPost: SquadPost = {
          ...post,
          id: "squad_" + Math.random().toString(36).substring(2, 9),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ squads: [newPost, ...s.squads] }));
      },
      removeSquad: (id) => {
        set((s) => ({ squads: s.squads.filter((sq) => sq.id !== id) }));
      },
      getSquadsForOpportunity: (oppId) => {
        return get().squads.filter((sq) => sq.opportunityId === oppId);
      },
      _setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "argus-squads",
      partialize: (s) => ({ squads: s.squads }),
      onRehydrateStorage: () => (state) => state?._setHydrated(),
    }
  )
);

"use client";

import { useState, useMemo } from "react";
import { Users, UserPlus, Copy, Check, MessageCircle, Sparkles, Send } from "lucide-react";
import { useSquads, type SquadPost } from "@/store/squads";
import { useProfile } from "@/store/profile";
import { useToastStore } from "@/store/toast";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";

export function SquadFinder({ opportunityId, opportunityTitle }: { opportunityId: string; opportunityTitle: string }) {
  const profile = useProfile((s) => s.profile);
  const allSquads = useSquads((s) => s.squads);
  const squads = useMemo(() => {
    const matched = allSquads.filter((sq) => sq.opportunityId === opportunityId);
    return matched.length > 0 ? matched : allSquads.slice(0, 3);
  }, [allSquads, opportunityId]);
  const addSquad = useSquads((s) => s.addSquad);
  const pushToast = useToastStore((s) => s.push);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPostForm, setShowPostForm] = useState(false);

  // Form state
  const [teamName, setTeamName] = useState("");
  const [projectIdea, setProjectIdea] = useState("");
  const [rolesNeeded, setRolesNeeded] = useState("Frontend Dev, UI/UX Designer");
  const [contactHandle, setContactHandle] = useState("");
  const [contactType, setContactType] = useState<"discord" | "telegram" | "email">("discord");

  const handleCopy = (handle: string, id: string) => {
    navigator.clipboard.writeText(handle);
    setCopiedId(id);
    pushToast(`Copied contact handle: ${handle}`, "success");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePostSquad = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName || !contactHandle) {
      pushToast("Please enter a team name and contact handle", "error");
      return;
    }

    const lookingFor = rolesNeeded.split(",").map((r) => r.trim()).filter(Boolean);

    addSquad({
      opportunityId,
      teamName,
      projectIdea,
      lookingFor: lookingFor.length > 0 ? lookingFor : ["Teammate"],
      members: [
        {
          name: profile.name || "Student Leader",
          role: "Team Creator",
          branch: profile.branch ? profile.branch.toUpperCase() : "Engineering",
          skills: profile.skills?.slice(0, 3) || ["Development"],
        },
      ],
      contactHandle: `${contactType}: ${contactHandle}`,
      contactType,
    });

    pushToast("Squad request posted successfully!", "success");
    setShowPostForm(false);
    setTeamName("");
    setProjectIdea("");
  };

  const userSkillsLower = (profile.skills || []).map((s) => s.toLowerCase());

  return (
    <div className="rounded-2xl border border-line bg-surface/80 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Users size={15} />
          </span>
          <div>
            <h4 className="text-[13px] font-semibold text-ink">Hackathon Squad Finder</h4>
            <p className="text-[11px] text-ink-3">Find teammates with complementary skills or recruit for your squad.</p>
          </div>
        </div>

        <Button
          size="sm"
          variant={showPostForm ? "ghost" : "secondary"}
          onClick={() => setShowPostForm((v) => !v)}
        >
          <UserPlus size={13} /> {showPostForm ? "Close Form" : "Post Squad Request"}
        </Button>
      </div>

      {/* Post Squad Request Form */}
      {showPostForm && (
        <form onSubmit={handlePostSquad} className="mt-3.5 space-y-3 rounded-xl border border-line bg-base/60 p-3.5">
          <h5 className="text-xs font-semibold text-ink">Create a Squad Listing for {opportunityTitle}</h5>
          
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-ink-3">Team Name / Title</label>
              <input
                type="text"
                required
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. Project Catalyst"
                className="h-8 w-full rounded-lg border border-line bg-surface px-2.5 text-xs text-ink outline-none focus:border-signal-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-ink-3">Roles Needed (comma separated)</label>
              <input
                type="text"
                value={rolesNeeded}
                onChange={(e) => setRolesNeeded(e.target.value)}
                placeholder="e.g. UI/UX Designer, ML Engineer"
                className="h-8 w-full rounded-lg border border-line bg-surface px-2.5 text-xs text-ink outline-none focus:border-signal-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-ink-3">Project Concept / Pitch (Optional)</label>
            <textarea
              rows={2}
              value={projectIdea}
              onChange={(e) => setProjectIdea(e.target.value)}
              placeholder="Brief idea of what you plan to build or focus on…"
              className="w-full resize-none rounded-lg border border-line bg-surface p-2 text-xs text-ink outline-none focus:border-signal-500"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-ink-3">Contact Method</label>
              <div className="flex gap-2">
                <select
                  value={contactType}
                  onChange={(e) => setContactType(e.target.value as any)}
                  className="h-8 rounded-lg border border-line bg-surface px-2 text-xs text-ink outline-none focus:border-signal-500"
                >
                  <option value="discord">Discord</option>
                  <option value="telegram">Telegram</option>
                  <option value="email">Email</option>
                </select>
                <input
                  type="text"
                  required
                  value={contactHandle}
                  onChange={(e) => setContactHandle(e.target.value)}
                  placeholder={contactType === "discord" ? "alex#1234 or @alex" : contactType === "telegram" ? "@your_handle" : "you@example.com"}
                  className="h-8 flex-1 rounded-lg border border-line bg-surface px-2.5 text-xs text-ink outline-none focus:border-signal-500"
                />
              </div>
            </div>

            <div className="flex items-end">
              <Button type="submit" size="sm" className="w-full justify-center">
                <Send size={13} /> Publish Squad Request
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Existing Squads List */}
      <div className="mt-3.5 space-y-2.5">
        {squads.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-6 text-center text-xs text-ink-3">
            <p>No open squad requests yet. Be the first to start a team!</p>
          </div>
        ) : (
          squads.map((squad) => {
            const hasSkillMatch = squad.lookingFor.some((role) =>
              userSkillsLower.some((skill) => role.toLowerCase().includes(skill))
            );

            return (
              <div
                key={squad.id}
                className="rounded-xl border border-line bg-base/50 p-3.5 transition hover:border-line-strong hover:bg-base/80"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="text-[13px] font-semibold text-ink">{squad.teamName}</h5>
                      {hasSkillMatch && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                          <Sparkles size={10} /> Matches your skills!
                        </span>
                      )}
                    </div>
                    {squad.projectIdea && (
                      <p className="mt-1 text-[11px] leading-relaxed text-ink-2 max-w-xl">
                        {squad.projectIdea}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleCopy(squad.contactHandle, squad.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-2 shadow-xs hover:text-ink transition"
                  >
                    {copiedId === squad.id ? (
                      <>
                        <Check size={12} className="text-emerald-500" /> Copied
                      </>
                    ) : (
                      <>
                        <MessageCircle size={12} className="text-signal-500" /> Connect ({squad.contactType})
                      </>
                    )}
                  </button>
                </div>

                {/* Team Members & Roles Needed */}
                <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line/60 pt-2.5 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-ink-3">Team:</span>
                    <span className="font-medium text-ink-2">
                      {squad.members.map((m) => m.name).join(", ")}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-ink-3">Looking for:</span>
                    {squad.lookingFor.map((role, idx) => (
                      <span
                        key={idx}
                        className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

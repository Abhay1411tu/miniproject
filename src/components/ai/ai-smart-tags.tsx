"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

const clientTagCache = new Map<string, string[]>();

export function AISmartTags({ opportunityId }: { opportunityId: string }) {
  const [tags, setTags] = useState<string[]>(() => clientTagCache.get(opportunityId) || []);
  const [loading, setLoading] = useState(() => !clientTagCache.has(opportunityId));

  useEffect(() => {
    if (clientTagCache.has(opportunityId)) {
      setTags(clientTagCache.get(opportunityId)!);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/ai/tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ opportunityId }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        const fetchedTags = data.tags ?? [];
        clientTagCache.set(opportunityId, fetchedTags);
        if (!cancelled) setTags(fetchedTags);
      } catch {
        // Fail silently — AI tags are supplemental
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [opportunityId]);

  if (loading) {
    return (
      <div className="flex gap-1.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-5 w-16 animate-pulse rounded-full bg-elevated" />
        ))}
      </div>
    );
  }

  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded-full border border-purple-500/25 bg-purple-500/[0.06] px-2 py-0.5 text-[11px] font-medium text-purple-600"
        >
          {i === 0 && <Sparkles size={10} />}
          {tag}
        </span>
      ))}
    </div>
  );
}

/** Inline version for cards — shows max 2 tags, smaller with client memory cache. */
export function AISmartTagsInline({ opportunityId }: { opportunityId: string }) {
  const [tags, setTags] = useState<string[]>(() => {
    const cached = clientTagCache.get(opportunityId);
    return cached ? cached.slice(0, 2) : [];
  });

  useEffect(() => {
    if (clientTagCache.has(opportunityId)) {
      setTags(clientTagCache.get(opportunityId)!.slice(0, 2));
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/ai/tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ opportunityId }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        const fetchedTags = data.tags ?? [];
        clientTagCache.set(opportunityId, fetchedTags);
        if (!cancelled) setTags(fetchedTags.slice(0, 2));
      } catch {
        // Fail silently
      }
    })();
    return () => { cancelled = true; };
  }, [opportunityId]);

  if (tags.length === 0) return null;

  return (
    <div className="flex gap-1">
      {tags.map((tag, i) => (
        <span
          key={i}
          className="rounded-full border border-purple-500/20 bg-purple-500/[0.06] px-1.5 py-px text-[10px] font-medium text-purple-600"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

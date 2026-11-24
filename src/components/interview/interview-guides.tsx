"use client";

import { useState } from "react";
import { BookOpen, CheckCircle, Code2, Cpu, Database, Network, MessageSquare, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

const GUIDES = [
  {
    id: "star",
    title: "STAR Behavioral Framework",
    icon: MessageSquare,
    badge: "Must-Know",
    summary: "The gold standard for behavioral interviews at Amazon, Google, and Indian unicorns.",
    content: (
      <div className="space-y-4 text-xs text-ink-2">
        <p>
          Whenever an interviewer asks <em>"Tell me about a time..."</em> or <em>"How do you handle conflict..."</em>,
          structure your answer within 90-120 seconds using the <strong>STAR method</strong>:
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-line bg-surface p-3">
            <span className="font-bold text-signal-700">S — Situation (15-20s):</span>
            <p className="mt-1 text-ink-3">Set the context. Where were you working? What was the project and team constraint?</p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-3">
            <span className="font-bold text-signal-700">T — Task (15-20s):</span>
            <p className="mt-1 text-ink-3">What was your specific responsibility? What goal or challenge were you tasked with overcoming?</p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-3">
            <span className="font-bold text-signal-700">A — Action (40-60s):</span>
            <p className="mt-1 text-ink-3">Focus on <em>what YOU did</em>. What technical decisions, debugging steps, or collaboration strategies did you lead?</p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-3">
            <span className="font-bold text-signal-700">R — Result (20-30s):</span>
            <p className="mt-1 text-ink-3">Quantify the outcome! e.g., "Reduced latency by 40%", "Shipped 2 days ahead of schedule", "Onboarded 500+ users".</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "cs-fundamentals",
    title: "Core CS Revision Cheat-Sheet",
    icon: Cpu,
    badge: "Campus Drives",
    summary: "Essential rapid-fire questions frequently asked in Indian campus placements and early-career drives.",
    content: (
      <div className="space-y-3 text-xs text-ink-2">
        <div className="rounded-xl border border-line bg-surface p-3">
          <div className="flex items-center gap-2 font-bold text-ink mb-1">
            <Database size={15} className="text-signal-600" />
            <span>DBMS Essentials</span>
          </div>
          <ul className="list-disc pl-4 space-y-1 text-ink-3">
            <li><strong>ACID Properties:</strong> Atomicity (all or nothing), Consistency (valid state), Isolation (transactions don't interfere), Durability (persisted on disk).</li>
            <li><strong>Clustered vs. Non-Clustered Indexes:</strong> Clustered determines physical data ordering (one per table, e.g. Primary Key); non-clustered creates a separate lookup pointer table (B+ Tree).</li>
          </ul>
        </div>

        <div className="rounded-xl border border-line bg-surface p-3">
          <div className="flex items-center gap-2 font-bold text-ink mb-1">
            <Network size={15} className="text-signal-600" />
            <span>Computer Networks</span>
          </div>
          <ul className="list-disc pl-4 space-y-1 text-ink-3">
            <li><strong>TCP 3-Way Handshake:</strong> SYN $\rightarrow$ SYN-ACK $\rightarrow$ ACK before reliable byte stream begins.</li>
            <li><strong>HTTP/1.1 vs HTTP/2 vs HTTP/3:</strong> HTTP/2 introduces binary framing and multiplexing over single TCP connection; HTTP/3 runs over QUIC (UDP) eliminating head-of-line blocking.</li>
          </ul>
        </div>

        <div className="rounded-xl border border-line bg-surface p-3">
          <div className="flex items-center gap-2 font-bold text-ink mb-1">
            <Code2 size={15} className="text-signal-600" />
            <span>Operating Systems</span>
          </div>
          <ul className="list-disc pl-4 space-y-1 text-ink-3">
            <li><strong>Process vs Thread:</strong> Processes have separate memory address spaces; threads share the heap and code segment of the parent process.</li>
            <li><strong>Deadlock Coffman Conditions:</strong> Mutual exclusion, Hold and wait, No preemption, and Circular wait.</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "system-design",
    title: "System Design Framework",
    icon: BookOpen,
    badge: "SDE-1 & Hackathons",
    summary: "Standard 45-minute blueprint for system design and architecture rounds.",
    content: (
      <div className="space-y-3 text-xs text-ink-2">
        <ol className="list-decimal pl-4 space-y-2">
          <li><strong>Scope the Requirements (5 mins):</strong> Clarify functional requirements (what users do) vs non-functional (scale, availability, latency SLA, consistency).</li>
          <li><strong>Capacity Estimations (5 mins):</strong> Back-of-the-envelope calculations for Daily Active Users (DAU), Read vs. Write ratio, and storage for 5 years.</li>
          <li><strong>High-Level Architecture (15 mins):</strong> Client $\rightarrow$ Load Balancer $\rightarrow$ API Gateway $\rightarrow$ Microservices $\rightarrow$ Cache (Redis) $\rightarrow$ Database (SQL/NoSQL) $\rightarrow$ Message Queue (Kafka).</li>
          <li><strong>Deep Dive & Edge Cases (15 mins):</strong> Database partitioning, cache eviction (LRU), single points of failure, idempotency keys for payment transactions.</li>
        </ol>
      </div>
    ),
  },
];

export function InterviewGuides() {
  const [activeGuide, setActiveGuide] = useState("star");

  return (
    <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-ink flex items-center gap-2">
          <Lightbulb size={20} className="text-signal-600" />
          <span>Curated Interview Guides & Blueprints</span>
        </h2>
        <p className="text-xs text-ink-3 mt-1">
          Review these high-yield frameworks before your mock voice sessions to structure your answers like a senior engineer.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-line pb-4 mb-5">
        {GUIDES.map((g) => {
          const Icon = g.icon;
          const isActive = activeGuide === g.id;
          return (
            <button
              key={g.id}
              onClick={() => setActiveGuide(g.id)}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all",
                isActive
                  ? "bg-signal-500/15 text-signal-700 border border-signal-500/30"
                  : "bg-base border border-line text-ink-2 hover:bg-elevated hover:text-ink",
              )}
            >
              <Icon size={14} />
              <span>{g.title}</span>
              <span className="rounded bg-base px-1.5 py-0.2 text-[9px] font-bold text-ink-3">
                {g.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Guide Content */}
      {GUIDES.find((g) => g.id === activeGuide)?.content}
    </div>
  );
}


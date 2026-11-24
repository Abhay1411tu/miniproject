import "server-only";
import type { Opportunity, Profile, AISummary, AISmartTags, ComparisonResult, ResumeAnalysis, WeeklyDigest } from "@/lib/types";
import { SKILL_LABELS } from "@/lib/taxonomy";

/**
 * Intelligent deterministic AI generator.
 * Provides immediate, zero-latency, realistic AI insights whenever
 * external LLM API keys (Groq/Gemini) are not configured or rate-limited.
 */

export function offlineOpportunitySummary(o: Opportunity): AISummary {
  const tagsList = o.tags.map((t) => SKILL_LABELS[t] ?? t);
  const title = o.title.trim();
  const org = o.organization?.trim() || "Industry Leader";
  const categoryLabel = o.category.charAt(0).toUpperCase() + o.category.slice(1);

  // Difficulty assessment
  let difficulty: "Beginner" | "Intermediate" | "Advanced" = "Intermediate";
  const descLower = (o.summary + " " + title).toLowerCase();
  if (
    descLower.includes("beginner") ||
    descLower.includes("freshman") ||
    descLower.includes("introductory") ||
    descLower.includes("all levels") ||
    o.category === "scholarship"
  ) {
    difficulty = "Beginner";
  } else if (
    descLower.includes("expert") ||
    descLower.includes("advanced") ||
    descLower.includes("national") ||
    (o.prizeAmount && o.prizeAmount >= 250000) ||
    (o.stipendMin && o.stipendMin >= 40000)
  ) {
    difficulty = "Advanced";
  }

  // Value / benefits
  let benefits = "Practical hands-on experience, networking with peers, and certificate of participation.";
  if (o.category === "internship" && o.stipendMin) {
    benefits = `Monthly stipend of ₹${o.stipendMin.toLocaleString("en-IN")}${o.stipendMax ? `–₹${o.stipendMax.toLocaleString("en-IN")}` : ""} with mentorship and potential pre-placement opportunities.`;
  } else if ((o.category === "hackathon" || o.category === "competition") && o.prizeAmount) {
    benefits = `Cash prize pool of ₹${o.prizeAmount.toLocaleString("en-IN")}, direct visibility with recruiters, and verified credentials.`;
  } else if (o.category === "scholarship" && o.awardAmount) {
    benefits = `Direct financial assistance of ₹${o.awardAmount.toLocaleString("en-IN")} towards tuition, academic resources, and peer network.`;
  }

  // Deadlines
  let deadlines = "Rolling applications — early submissions receive priority review.";
  if (o.deadline) {
    const d = new Date(o.deadline);
    if (!isNaN(d.getTime())) {
      deadlines = `Final deadline: ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
  }

  // Eligibility
  let eligibility = "Open to undergraduate and postgraduate students in technical and related disciplines.";
  if (o.eligibility?.raw) {
    eligibility = o.eligibility.raw;
  } else if (o.eligibility?.branches?.length) {
    eligibility = `Open to students from ${o.eligibility.branches.join(", ")} streams.`;
  }

  return {
    what: o.summary && o.summary.length > 20
      ? o.summary
      : `${title} organized by ${org}. A focused ${categoryLabel.toLowerCase()} initiative empowering students to build real-world capability.`,
    whoShouldApply: `Students passionate about ${tagsList.slice(0, 3).join(", ") || o.category} aiming to build competitive project credentials.`,
    keyEligibility: eligibility,
    skillsRequired: tagsList.length > 0 ? tagsList.slice(0, 5) : ["Problem Solving", "Teamwork", "Analytical Thinking"],
    benefits,
    importantDeadlines: deadlines,
    estimatedDifficulty: difficulty,
  };
}

export function offlineSmartTags(o: Opportunity): AISmartTags {
  const allowed = [
    "Beginner Friendly", "Intermediate", "Advanced", "Remote", "On-site", "Hybrid",
    "Paid", "Unpaid", "High Prestige", "Resume Builder", "Portfolio Builder",
    "Team-based", "Solo", "Women-only", "International", "India-only",
    "Open Source", "Research", "Stipend Provided", "Certificate Provided",
    "Mentorship Included", "Networking Opportunity", "Fast Application", "Long Application"
  ];

  const tags = new Set<string>();
  const text = `${o.title} ${o.summary || ""} ${o.organization || ""}`.toLowerCase();

  // Location / Remote
  if (o.isRemote || text.includes("remote") || text.includes("virtual") || text.includes("online")) {
    tags.add("Remote");
  } else if (o.location) {
    tags.add("On-site");
  }

  // Financials
  if (o.stipendMin && o.stipendMin > 0) {
    tags.add("Stipend Provided");
    tags.add("Paid");
  } else if (o.prizeAmount && o.prizeAmount > 0) {
    tags.add("Paid");
  } else if (o.awardAmount && o.awardAmount > 0) {
    tags.add("Paid");
  }

  // Format
  if (o.category === "hackathon") {
    tags.add("Team-based");
    tags.add("Portfolio Builder");
    tags.add("Networking Opportunity");
  } else if (o.category === "internship") {
    tags.add("Resume Builder");
    tags.add("Mentorship Included");
  } else if (o.category === "scholarship") {
    tags.add("Resume Builder");
    tags.add("Certificate Provided");
  } else {
    tags.add("Networking Opportunity");
  }

  // Difficulty
  if (text.includes("beginner") || text.includes("all levels") || text.includes("freshman")) {
    tags.add("Beginner Friendly");
  } else if (text.includes("advanced") || (o.prizeAmount && o.prizeAmount > 200000)) {
    tags.add("Advanced");
  } else {
    tags.add("Intermediate");
  }

  // Ensure 3 to 6 valid tags
  const validTags = Array.from(tags).filter((t) => allowed.includes(t));
  if (validTags.length < 3) {
    validTags.push("Resume Builder", "Certificate Provided");
  }

  return { tags: validTags.slice(0, 6) };
}

export function offlineWhyMatchesYou(o: Opportunity, p: Profile): { explanation: string } {
  const profileSkills = new Set((p.skills || []).map((s) => s.toLowerCase()));
  const matchingSkills = o.tags.filter((t) => profileSkills.has(t.toLowerCase())).map((t) => SKILL_LABELS[t] ?? t);

  const branchText = p.branch ? `${p.branch.toUpperCase()} curriculum` : "academic background";
  const org = o.organization ? `at ${o.organization}` : "";

  if (matchingSkills.length > 0) {
    return {
      explanation: `This ${o.category} directly aligns with your verified skills in ${matchingSkills.join(", ")}. It offers high-leverage exposure ${org} to sharpen your technical execution alongside your ${branchText}.`,
    };
  }

  const categoryLabel = o.category.charAt(0).toUpperCase() + o.category.slice(1);
  return {
    explanation: `This ${categoryLabel} offers strong domain growth in ${o.tags.slice(0, 2).map((t) => SKILL_LABELS[t] ?? t).join(" and ") || "key technologies"}. It broadens your portfolio credentials and complements your ${branchText}.`,
  };
}

export function offlineDeadlineInsight(o: Opportunity, p?: Profile): { insight: string } {
  if (!o.deadline) {
    return { insight: "This opportunity runs on a rolling admissions basis — early submissions secure faster evaluation before slots fill up." };
  }

  const deadlineDate = new Date(o.deadline);
  const now = new Date();
  const diffDays = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { insight: "The primary deadline has passed; check the official portal in case an extension or late phase has opened." };
  }
  if (diffDays <= 2) {
    return { insight: `Only ${diffDays} day${diffDays === 1 ? "" : "s"} left! Finalize your application draft, verify all attachments, and submit right now to circumvent last-minute server congestion.` };
  }
  if (diffDays <= 7) {
    return { insight: `Closes in ${diffDays} days. Recommended step: polish your resume and project links this week so you can submit comfortably before the cutoff.` };
  }
  if (diffDays <= 14) {
    return { insight: `You have ${diffDays} days remaining. A great window to review prerequisites, assemble a team if required, and draft your submission.` };
  }

  return { insight: `${diffDays} days left. Bookmark this opportunity, set a reminder for 2 weeks prior, and review the guidelines early.` };
}

export function offlineQueryExpansion(query: string): { terms: string[] } {
  const q = query.toLowerCase().trim();
  const tokens = q.split(/\s+/).filter((t) => t.length > 1);
  const terms = new Set<string>(tokens);

  const synonyms: Record<string, string[]> = {
    ai: ["artificial intelligence", "machine learning", "deep learning", "python", "data science"],
    ml: ["machine learning", "deep learning", "python", "data science", "neural"],
    internship: ["intern", "developer", "engineering", "summer", "stipend", "trainee"],
    hackathon: ["hack", "bounty", "coding", "competition", "builder", "team"],
    scholarship: ["fellowship", "grant", "award", "financial", "aid", "merit"],
    remote: ["work from home", "wfh", "virtual", "online"],
    web: ["frontend", "backend", "fullstack", "react", "next.js", "javascript"],
    python: ["django", "flask", "data", "machine learning", "scripting"],
  };

  for (const [key, related] of Object.entries(synonyms)) {
    if (q.includes(key)) {
      related.forEach((r) => terms.add(r));
    }
  }

  if (terms.size < 6) {
    ["internship", "project", "remote", "tech", "student"].forEach((w) => terms.add(w));
  }

  return { terms: Array.from(terms).slice(0, 15) };
}

export function offlineComparison(opps: Opportunity[], p: Profile): ComparisonResult {
  const rows = opps.map((o) => {
    const isHighValue = Boolean((o.stipendMin && o.stipendMin > 20000) || (o.prizeAmount && o.prizeAmount > 100000));
    return {
      opportunityId: o.id,
      title: o.title,
      eligibility: o.eligibility?.raw || "Undergraduate / Graduate students",
      difficulty: isHighValue ? "Intermediate" : "Beginner Friendly",
      benefits: o.stipendMin ? `₹${o.stipendMin}/mo stipend` : (o.prizeAmount ? `₹${o.prizeAmount} prizes` : "Certificate & Mentorship"),
      learningValue: isHighValue ? "High (Practical industrial workload)" : "Medium (Foundational exposure)",
      careerImpact: isHighValue ? "High (Strong resume credibility)" : "Medium (Great initial portfolio project)",
      deadline: o.deadline ? new Date(o.deadline).toLocaleDateString() : "Rolling",
      recommendation: `Recommended for students wanting focused immersion in ${o.category}.`,
    };
  });

  const best = opps.reduce((prev, current) => {
    const prevScore = (prev.stipendMin || 0) + (prev.prizeAmount || 0);
    const currScore = (current.stipendMin || 0) + (current.prizeAmount || 0);
    return currScore >= prevScore ? current : prev;
  }, opps[0]);

  return {
    rows,
    bestPick: best?.id || opps[0].id,
    bestPickReason: `Offers the strongest combination of practical benefits and career impact for your target domain.`,
  };
}

export function offlineResumeAnalysis(resumeText: string, o: Opportunity): ResumeAnalysis {
  const text = resumeText.toLowerCase();

  const TECH_SKILLS = [
    "python", "javascript", "typescript", "react", "next.js", "node.js", "java", "c++",
    "c", "c#", "go", "rust", "sql", "postgresql", "mongodb", "docker", "kubernetes",
    "aws", "gcp", "azure", "git", "github", "machine learning", "deep learning",
    "pytorch", "tensorflow", "html", "css", "tailwind", "fastapi", "express", "dsa"
  ];

  const extractedSkills: string[] = [];
  for (const skill of TECH_SKILLS) {
    if (text.includes(skill)) {
      extractedSkills.push(skill.charAt(0).toUpperCase() + skill.slice(1));
    }
  }

  if (extractedSkills.length === 0) {
    extractedSkills.push("Problem Solving", "Web Development", "Git");
  }

  const oppTags = o.tags.map((t) => SKILL_LABELS[t] ?? t);
  const matched = oppTags.filter((t) => text.includes(t.toLowerCase()));
  const missing = oppTags.filter((t) => !text.includes(t.toLowerCase())).slice(0, 4);

  const matchScore = Math.min(95, Math.max(55, 60 + matched.length * 8));

  return {
    matchScore,
    extractedSkills: extractedSkills.slice(0, 8),
    extractedTechnologies: extractedSkills.filter((s) => ["React", "Python", "Node.js", "SQL", "Docker", "AWS"].includes(s)),
    education: text.includes("bachelor") || text.includes("b.tech") ? "B.Tech in Computer Science / Engineering" : "Undergraduate Degree",
    projects: ["Application Development Project", "Data Analysis / Portfolio Submission"],
    missingSkills: missing.length > 0 ? missing : ["Domain Specific Portfolio Case Study"],
    strengths: [
      `Demonstrated capability with core toolchain: ${extractedSkills.slice(0, 3).join(", ")}`,
      `Profile matches key ${o.category} requirements`,
      "Clear technical foundation suitable for rapid onboarding",
    ],
    improvements: [
      missing.length > 0 ? `Consider showcasing work involving ${missing.join(" & ")}` : "Include quantified performance impact in your project bullets",
      "Attach a live demo or GitHub repository link in your application",
    ],
  };
}

export function offlineWeeklyDigest(
  opportunities: { title: string; category: string; deadline?: string; matchScore: number }[],
  p: Profile,
): WeeklyDigest {
  const counts: Record<string, number> = {};
  for (const opp of opportunities) {
    counts[opp.category] = (counts[opp.category] || 0) + 1;
  }

  const highlights = Object.entries(counts).map(([cat, count]) => ({
    category: cat,
    count,
    note: `${count} opportunities matching your ${p.branch || "tech"} track`,
  }));

  const urgent = opportunities
    .filter((o) => {
      if (!o.deadline) return false;
      const days = Math.ceil((new Date(o.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return days >= 0 && days <= 5;
    })
    .slice(0, 3)
    .map((o) => ({
      title: o.title,
      daysLeft: Math.max(0, Math.ceil((new Date(o.deadline!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
    }));

  return {
    summary: `We scanned ${opportunities.length} opportunities tailored to your profile this week. You have strong matches across ${Object.keys(counts).join(", ") || "multiple sectors"}. Don't miss the upcoming deadlines listed below!`,
    highlights,
    urgentDeadlines: urgent,
  };
}

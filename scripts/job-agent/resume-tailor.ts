import type { ResumeData, ResumeRole } from "../../content/resume-data.ts";
import type { TailorSuggestion } from "./tailor-types.ts";

export interface TailoredResume {
  headline: string;
  highlights: string[];
  roles: ResumeRole[];
  areasOfExpertise: ResumeData["areasOfExpertise"];
  education: string[];
  executiveEndorsement: string;
  /** Captain-authored free text, never sent through the AI - rendered as its own section. */
  ownText: string;
}

/** True only when `order` is a permutation of 0..length-1 - guards against a malformed suggestion. */
function isValidPermutation(order: number[], length: number): boolean {
  if (order.length !== length) return false;
  const seen = new Set(order);
  if (seen.size !== length) return false;
  return order.every((index) => index >= 0 && index < length);
}

function reorder<T>(items: T[], order: number[]): T[] {
  if (!isValidPermutation(order, items.length)) return items;
  return order.map((index) => items[index]!);
}

function applyToRole(role: ResumeRole, suggestions: TailorSuggestion[], target: "collate" | "benchling"): ResumeRole {
  let bullets = role.bullets;

  const reorderSuggestion = [...suggestions]
    .reverse()
    .find((s): s is Extract<TailorSuggestion, { type: "reorder" }> => s.type === "reorder" && s.target === target);
  if (reorderSuggestion) bullets = reorder(bullets, reorderSuggestion.newOrder);

  const newPhrasingBullets = suggestions
    .filter((s): s is Extract<TailorSuggestion, { type: "new-phrasing" }> => s.type === "new-phrasing" && s.role === target)
    .map((s) => s.text);

  return { ...role, bullets: [...bullets, ...newPhrasingBullets] };
}

/**
 * Applies accepted suggestions on top of the unmodified `resumeData` (never mutated) plus the
 * captain's own free text. Reorder suggestions permute an existing array; new-phrasing
 * suggestions append a bullet. Genentech, Merck, and every other field pass through unchanged -
 * the two most recent roles (Collate, Benchling) and the highlights array are the only editable
 * surfaces, matching the guardrail in docs/job-agent.md.
 */
export function mergeTailoredResume(
  resumeData: ResumeData,
  acceptedSuggestions: TailorSuggestion[],
  ownText: string,
): TailoredResume {
  const highlightsReorder = [...acceptedSuggestions]
    .reverse()
    .find((s): s is Extract<TailorSuggestion, { type: "reorder" }> => s.type === "reorder" && s.target === "highlights");
  const highlights = highlightsReorder ? reorder(resumeData.highlights, highlightsReorder.newOrder) : resumeData.highlights;

  const roles = resumeData.roles.map((role) => {
    if (role.company === "Collate") return applyToRole(role, acceptedSuggestions, "collate");
    if (role.company === "Benchling") return applyToRole(role, acceptedSuggestions, "benchling");
    return role;
  });

  return {
    headline: resumeData.headline,
    highlights,
    roles,
    areasOfExpertise: resumeData.areasOfExpertise,
    education: resumeData.education,
    executiveEndorsement: resumeData.executiveEndorsement,
    ownText: ownText.trim(),
  };
}

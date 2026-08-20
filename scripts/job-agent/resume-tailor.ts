import type { ResumeData, ResumeRole } from "../../content/resume-data.ts";
import type { TailorSuggestion } from "./tailor-types.ts";

/** One rendered bullet plus whether it was appended by an accepted new-phrasing suggestion. */
export interface TailoredBullet {
  text: string;
  added: boolean;
}

export interface TailoredRole extends Omit<ResumeRole, "bullets"> {
  bullets: TailoredBullet[];
  /** True when an accepted reorder suggestion permuted this role's bullets. */
  bulletsReordered: boolean;
}

export interface TailoredResume {
  headline: string;
  highlights: string[];
  /** True when an accepted reorder suggestion permuted the highlights array. */
  highlightsReordered: boolean;
  roles: TailoredRole[];
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

function applyToRole(role: ResumeRole, suggestions: TailorSuggestion[], target: "collate" | "benchling"): TailoredRole {
  let bullets = role.bullets;

  const reorderSuggestion = [...suggestions]
    .reverse()
    .find((s): s is Extract<TailorSuggestion, { type: "reorder" }> => s.type === "reorder" && s.target === target);
  if (reorderSuggestion) bullets = reorder(bullets, reorderSuggestion.newOrder);

  const newPhrasingBullets = suggestions
    .filter((s): s is Extract<TailorSuggestion, { type: "new-phrasing" }> => s.type === "new-phrasing" && s.role === target)
    .map((s) => s.text);

  return {
    ...role,
    bullets: [
      ...bullets.map((text) => ({ text, added: false })),
      ...newPhrasingBullets.map((text) => ({ text, added: true })),
    ],
    bulletsReordered: Boolean(reorderSuggestion),
  };
}

function passthroughRole(role: ResumeRole): TailoredRole {
  return { ...role, bullets: role.bullets.map((text) => ({ text, added: false })), bulletsReordered: false };
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
    return passthroughRole(role);
  });

  return {
    headline: resumeData.headline,
    highlights,
    highlightsReordered: Boolean(highlightsReorder),
    roles,
    areasOfExpertise: resumeData.areasOfExpertise,
    education: resumeData.education,
    executiveEndorsement: resumeData.executiveEndorsement,
    ownText: ownText.trim(),
  };
}

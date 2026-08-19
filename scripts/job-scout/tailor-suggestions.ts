import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { ResumeData, ResumeRole } from "../../content/resume-data.ts";
import { JOB_SCOUT_MODEL } from "./scoring.ts";
import { TailorSuggestionsResponseSchema, type TailorSuggestion } from "./tailor-types.ts";
import type { NormalizedJob } from "./types.ts";

function findRole(resumeData: ResumeData, company: string): ResumeRole {
  const role = resumeData.roles.find((r) => r.company === company);
  if (!role) throw new Error(`tailor-suggestions: expected a "${company}" role in resume-data.ts`);
  return role;
}

function numberedList(items: string[]): string {
  return items.map((item, index) => `${index}. ${item}`).join("\n");
}

/**
 * The prompt sends ONLY the highlights array and the Collate/Benchling role bullets as
 * reorderable/groundable targets - Genentech, Merck, areas of expertise, education, and the
 * endorsement are never included, so the model structurally cannot touch them regardless of
 * instructions. See the guardrail section of docs/job-scout.md.
 */
export function buildTailorPrompt(job: NormalizedJob & { company: string }, resumeData: ResumeData): string {
  const collate = findRole(resumeData, "Collate");
  const benchling = findRole(resumeData, "Benchling");

  return [
    "You are helping tailor a resume to one specific job posting. You must never invent an " +
      "accomplishment. You may only:",
    "1. REORDER: propose a new order for the 5 career highlights, or for the bullets within " +
      'the Collate role, or the bullets within the Benchling role. At most one "reorder" ' +
      "suggestion per target (highlights, collate, benchling).",
    "2. NEW PHRASING: propose new bullet text for the Collate or Benchling role, but only when " +
      "grounded in something already true in an existing bullet from that same role - surfacing " +
      "language the posting cares about, not adding a new fact. Every new-phrasing suggestion " +
      'must include "groundedIn": the specific existing bullet text it is drawn from.',
    "Keep every rationale to one short clause, at most ~12 words - not a full sentence.",
    "Propose at most 6 suggestions total. If nothing meaningfully improves the fit, return fewer.",
    "---",
    "## Career highlights (target: \"highlights\")",
    numberedList(resumeData.highlights),
    '## Collate role bullets (target: "collate")',
    numberedList(collate.bullets),
    '## Benchling role bullets (target: "benchling")',
    numberedList(benchling.bullets),
    "---",
    "## Job posting to tailor for",
    `Company: ${job.company}`,
    `Title: ${job.title}`,
    "",
    job.content ?? "(no description provided)",
  ].join("\n\n");
}

function isValidPermutation(order: number[], length: number): boolean {
  if (order.length !== length) return false;
  return new Set(order).size === length && order.every((i) => i >= 0 && i < length);
}

/**
 * Calls Claude for one job, constrained by structured outputs to the reorder/new-phrasing shape
 * in tailor-types.ts. Drops any reorder suggestion whose permutation doesn't match its target's
 * actual length (defensive - the schema can't express "must be a permutation of length N").
 * Never called by the automated pipeline; only the passphrase-gated /api/job-scout/tailor/suggestions route.
 */
export async function generateTailorSuggestions(
  client: Anthropic,
  job: NormalizedJob & { company: string },
  resumeData: ResumeData,
): Promise<TailorSuggestion[]> {
  const collate = findRole(resumeData, "Collate");
  const benchling = findRole(resumeData, "Benchling");
  const targetLengths: Record<string, number> = {
    highlights: resumeData.highlights.length,
    collate: collate.bullets.length,
    benchling: benchling.bullets.length,
  };

  const prompt = buildTailorPrompt(job, resumeData);
  const response = await client.messages.parse({
    model: JOB_SCOUT_MODEL,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
    output_config: { format: zodOutputFormat(TailorSuggestionsResponseSchema) },
  });

  if (!response.parsed_output) {
    throw new Error(`tailor-suggestions: response for "${job.title}" did not parse against the suggestion schema.`);
  }

  return response.parsed_output.suggestions
    .filter((s) => s.type !== "reorder" || isValidPermutation(s.newOrder, targetLengths[s.target]!))
    .map((s, index) => ({ ...s, id: `sugg-${index}` }));
}

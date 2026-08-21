import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { ResumeData, ResumeRole } from "../../content/resume-data.ts";
import { htmlToPlainText } from "./html.ts";
import { JOB_AGENT_MODEL } from "./scoring.ts";
import {
  TailorSuggestionsResponseSchema,
  type TailorRevisionRequest,
  type TailorSuggestion,
} from "./tailor-types.ts";
import type { NormalizedJob } from "./types.ts";

function findRole(resumeData: ResumeData, company: string): ResumeRole {
  const role = resumeData.roles.find((r) => r.company === company);
  if (!role) throw new Error(`tailor-suggestions: expected a "${company}" role in resume-data.ts`);
  return role;
}

function numberedList(items: string[]): string {
  return items.map((item, index) => `${index}. ${item}`).join("\n");
}

function describeSuggestion(suggestion: TailorSuggestion): string {
  if (suggestion.type === "reorder") return `Reorder ${suggestion.target} (${suggestion.rationale})`;
  return `New phrasing for ${suggestion.role}: "${suggestion.text}" - grounded in "${suggestion.groundedIn}" (${suggestion.rationale})`;
}

function buildRevisionSection(revision: TailorRevisionRequest): string {
  const priorList = revision.priorSuggestions.length
    ? revision.priorSuggestions
        .map((entry) => `- [${entry.accepted ? "kept" : "rejected"}] ${describeSuggestion(entry.suggestion)}`)
        .join("\n")
    : "(none - the previous round proposed no suggestions)";

  return [
    "---",
    "## Revision request",
    "The captain reviewed the suggestions below from a previous round and wants a revised set. " +
      'Suggestions marked "kept" were accepted; weigh those as validated direction. Suggestions ' +
      'marked "rejected" were declined - avoid proposing the same or similar changes again unless ' +
      "the captain's notes explicitly ask for them. Treat the captain's notes as authoritative " +
      "corrections and incorporate them directly, even if they contradict something above.",
    "### Previous suggestions",
    priorList,
    "### Captain's notes",
    revision.notes.trim() || "(none provided)",
  ].join("\n\n");
}

/**
 * The prompt sends ONLY the highlights array and the Collate/Benchling role bullets as
 * reorderable/groundable targets - Genentech, Merck, areas of expertise, education, and the
 * endorsement are never included, so the model structurally cannot touch them regardless of
 * instructions. See the guardrail section of docs/job-agent.md.
 */
export function buildTailorPrompt(
  job: NormalizedJob & { company: string },
  resumeData: ResumeData,
  revision?: TailorRevisionRequest,
): string {
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
    job.content ? htmlToPlainText(job.content) : "(no description provided)",
    revision ? buildRevisionSection(revision) : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function isValidPermutation(order: number[], length: number): boolean {
  if (order.length !== length) return false;
  return new Set(order).size === length && order.every((i) => i >= 0 && i < length);
}

/** 1 initial call + 2 retries - bounded so a persistent structural failure still surfaces promptly. */
const MAX_ATTEMPTS = 3;

/**
 * Calls Claude for one job, constrained by structured outputs to the reorder/new-phrasing shape
 * in tailor-types.ts. Drops any reorder suggestion whose permutation doesn't match its target's
 * actual length (defensive - the schema can't express "must be a permutation of length N").
 * Never called by the automated pipeline; only the passphrase-gated /api/job-agent/tailor/suggestions
 * route - both the initial "Tailor This Resume" call and, when `revision` is passed, the
 * "Revise" call. Review and Generate PDF never reach this function.
 *
 * Retries up to MAX_ATTEMPTS times on a failed parse before giving up. Two distinct SDK failure
 * modes count as "a failed parse" here: `parsed_output: null` (the response had no text content
 * block at all - e.g. `stop_reason: "refusal"`, when Anthropic's streaming classifiers intervene
 * on a request, which zodOutputFormat can't distinguish from a plain miss) and a thrown
 * AnthropicError from zodOutputFormat's own parse step (malformed JSON or a schema-violating
 * shape). Both can be transient model misses that a retry self-heals; if every attempt fails,
 * the final error includes the model's stop reason/explanation when available.
 */
export async function generateTailorSuggestions(
  client: Anthropic,
  job: NormalizedJob & { company: string },
  resumeData: ResumeData,
  revision?: TailorRevisionRequest,
): Promise<TailorSuggestion[]> {
  const collate = findRole(resumeData, "Collate");
  const benchling = findRole(resumeData, "Benchling");
  const targetLengths: Record<string, number> = {
    highlights: resumeData.highlights.length,
    collate: collate.bullets.length,
    benchling: benchling.bullets.length,
  };

  const prompt = buildTailorPrompt(job, resumeData, revision);

  // Kept as one call scoped inside this closure (rather than hoisting `response`'s type out to
  // the loop) so TypeScript can infer the parsed shape from zodOutputFormat's generic - an
  // explicit `Awaited<ReturnType<typeof client.messages.parse>>` annotation loses that inference
  // since `.parse` is an overloaded method.
  async function attempt(): Promise<{ suggestions: TailorSuggestion[] } | { failureDetail: string }> {
    try {
      const response = await client.messages.parse({
        model: JOB_AGENT_MODEL,
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
        output_config: { format: zodOutputFormat(TailorSuggestionsResponseSchema) },
      });

      if (response.parsed_output) {
        const suggestions = response.parsed_output.suggestions
          .filter((s) => s.type !== "reorder" || isValidPermutation(s.newOrder, targetLengths[s.target]!))
          .map((s, index) => ({ ...s, id: `sugg-${index}` }));
        return { suggestions };
      }

      const failureDetail = response.stop_details?.explanation
        ? `${response.stop_reason}: ${response.stop_details.explanation}`
        : response.stop_reason
          ? `stop_reason: ${response.stop_reason}`
          : "no text content in the response";
      return { failureDetail };
    } catch (error) {
      return { failureDetail: (error as Error).message };
    }
  }

  let lastFailureDetail = "no text content in the response";
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const result = await attempt();
    if ("suggestions" in result) return result.suggestions;
    lastFailureDetail = result.failureDetail;
  }

  throw new Error(
    `tailor-suggestions: response for "${job.title}" did not parse against the suggestion schema after ` +
      `${MAX_ATTEMPTS} attempts (${lastFailureDetail}).`,
  );
}

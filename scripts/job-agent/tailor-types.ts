import { z } from "zod";

/**
 * The only two roles the AI is ever allowed to reorder or add grounded phrasing to - Genentech
 * and Merck (the two older roles) are never sent to the model at all, so this is enforced
 * structurally rather than by instruction alone. See docs/job-agent.md.
 */
export type TailorReorderTarget = "highlights" | "collate" | "benchling";

export const TailorReorderTargetSchema = z.enum(["highlights", "collate", "benchling"]);

const TailorReorderSuggestionSchema = z.object({
  type: z.literal("reorder"),
  target: TailorReorderTargetSchema,
  /** A permutation of the target array's original indices (0-based). */
  newOrder: z.array(z.number().int().min(0)),
  rationale: z.string().min(1).max(90),
});

const TailorNewPhrasingSuggestionSchema = z.object({
  type: z.literal("new-phrasing"),
  role: z.enum(["collate", "benchling"]),
  text: z.string().min(1),
  /** Verbatim or lightly paraphrased pointer to the existing bullet this is grounded in. */
  groundedIn: z.string().min(1),
  rationale: z.string().min(1).max(90),
});

export const TailorSuggestionSchema = z.discriminatedUnion("type", [
  TailorReorderSuggestionSchema,
  TailorNewPhrasingSuggestionSchema,
]);

export const TailorSuggestionsResponseSchema = z.object({
  suggestions: z.array(TailorSuggestionSchema).max(8),
});

/** Server-assigned id (e.g. "sugg-0") added after the model's response is parsed. */
export type TailorReorderSuggestion = z.infer<typeof TailorReorderSuggestionSchema> & { id: string };
export type TailorNewPhrasingSuggestion = z.infer<typeof TailorNewPhrasingSuggestionSchema> & { id: string };
export type TailorSuggestion = TailorReorderSuggestion | TailorNewPhrasingSuggestion;

/**
 * One suggestion from a prior /suggestions call plus whether the captain kept it checked. The
 * suggestion already carries its server-assigned `id` (round-tripped from the client the same
 * way `acceptedSuggestions` does below), which `TailorSuggestionSchema` alone doesn't model - so
 * this, like `TailorRenderRequestSchema` below, only validates the envelope shape and is cast to
 * the real `TailorSuggestion` type rather than fully re-typed through zod.
 */
const TailorRevisionSuggestionStateSchema = z.object({
  suggestion: z.object({ id: z.string() }).passthrough(),
  accepted: z.boolean(),
});

/**
 * Sent only by the "Revise" action - the captain's free-text notes plus the accept/reject state
 * of every suggestion from the round being revised, so the model can weigh that signal and
 * incorporate corrections (e.g. "you got my Personal Sabbatical role wrong, fix it") into a new
 * suggestion set. See scripts/job-agent/tailor-suggestions.ts.
 */
const TailorRevisionRequestSchema = z.object({
  priorSuggestions: z.array(TailorRevisionSuggestionStateSchema),
  notes: z.string(),
});
export type TailorRevisionRequest = Omit<z.infer<typeof TailorRevisionRequestSchema>, "priorSuggestions"> & {
  priorSuggestions: { suggestion: TailorSuggestion; accepted: boolean }[];
};

const TailorSuggestRequestSchema = z.object({
  source: z.enum(["greenhouse", "lever", "ashby"]),
  id: z.union([z.string(), z.number()]),
  revision: TailorRevisionRequestSchema.optional(),
});
export type TailorSuggestRequestBody = Omit<z.infer<typeof TailorSuggestRequestSchema>, "revision"> & {
  revision?: TailorRevisionRequest;
};

/** Only checks the envelope shape, same rationale as parseTailorRenderRequestBody below. */
export function parseTailorSuggestRequestBody(value: unknown): TailorSuggestRequestBody | null {
  const result = TailorSuggestRequestSchema.safeParse(value);
  return result.success ? (result.data as TailorSuggestRequestBody) : null;
}

export interface TailorSuggestResponseBody {
  suggestions: TailorSuggestion[];
}

/** Shared payload for the preview and PDF routes - everything needed to render one tailored resume. */
const TailorRenderRequestSchema = z.object({
  company: z.string().min(1),
  keywordFamily: z.string().min(1),
  acceptedSuggestions: z.array(z.object({ id: z.string() }).passthrough()),
  ownText: z.string(),
});

export type TailorRenderRequestBody = Omit<z.infer<typeof TailorRenderRequestSchema>, "acceptedSuggestions"> & {
  acceptedSuggestions: TailorSuggestion[];
};

/**
 * Only checks the envelope shape (strings present, acceptedSuggestions is a list of {id, ...})
 * - not full re-validation of each suggestion's fields. Suggestions only ever round-trip
 * server -> client -> server (the client echoes back exactly what /suggestions returned, minus
 * unchecked items), and mergeTailoredResume already drops any malformed reorder permutation
 * defensively, so a stricter schema here would just duplicate that check.
 */
export function parseTailorRenderRequestBody(value: unknown): TailorRenderRequestBody | null {
  const result = TailorRenderRequestSchema.safeParse(value);
  return result.success ? (result.data as TailorRenderRequestBody) : null;
}

/** The "Mark Applied"/"Mark Passed" request - identifies the job the same way /suggestions does. */
const TailorStatusRequestSchema = z.object({
  source: z.enum(["greenhouse", "lever", "ashby"]),
  id: z.union([z.string(), z.number()]),
  status: z.enum(["applied", "passed"]),
});
export type TailorStatusRequestBody = z.infer<typeof TailorStatusRequestSchema>;

export function parseTailorStatusRequestBody(value: unknown): TailorStatusRequestBody | null {
  const result = TailorStatusRequestSchema.safeParse(value);
  return result.success ? result.data : null;
}

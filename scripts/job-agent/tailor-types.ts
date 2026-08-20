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

export interface TailorSuggestRequestBody {
  source: "greenhouse" | "lever" | "ashby";
  id: string | number;
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

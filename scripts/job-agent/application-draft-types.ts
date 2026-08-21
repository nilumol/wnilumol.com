import { z } from "zod";

const ApplicationDraftQuestionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
});

const ApplicationDraftRequestSchema = z.object({
  source: z.enum(["greenhouse", "lever", "ashby"]),
  id: z.union([z.string(), z.number()]),
  /** The exact questions Scan Application already surfaced client-side - echoed back so the server never re-derives them. */
  questions: z.array(ApplicationDraftQuestionSchema).min(1),
});
export type ApplicationDraftRequestBody = z.infer<typeof ApplicationDraftRequestSchema>;

/** Only checks the envelope shape, same rationale as parseTailorSuggestRequestBody. */
export function parseApplicationDraftRequestBody(value: unknown): ApplicationDraftRequestBody | null {
  const result = ApplicationDraftRequestSchema.safeParse(value);
  return result.success ? result.data : null;
}

export interface ApplicationDraftAnswer {
  id: string;
  answer: string;
}

export interface ApplicationDraftResponseBody {
  answers: ApplicationDraftAnswer[];
}

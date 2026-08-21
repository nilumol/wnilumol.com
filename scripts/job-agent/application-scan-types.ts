import { z } from "zod";

/** One free-text/paragraph question the real application asks - not yes/no, contact, upload, or dropdown fields. */
export const ApplicationQuestionSchema = z.object({
  prompt: z
    .string()
    .min(1)
    .describe(
      "The exact or lightly cleaned-up wording of one free-text/paragraph question the " +
        "application asks the applicant to write an answer to.",
    ),
});

/** What Claude classifies from one scraped application page - see classifyApplicationPage. */
export const ApplicationScanClassificationSchema = z.object({
  acceptsCoverLetter: z
    .boolean()
    .describe("True if the application has a dedicated cover letter field or upload, required or optional."),
  questions: z.array(ApplicationQuestionSchema).max(15),
});

/** Server-assigned id (e.g. "q-0") added after the model's response is parsed. */
export type ApplicationQuestion = z.infer<typeof ApplicationQuestionSchema> & { id: string };

export interface ApplicationScanResult {
  acceptsCoverLetter: boolean;
  questions: ApplicationQuestion[];
}

const ApplicationScanRequestSchema = z.object({
  source: z.enum(["greenhouse", "lever", "ashby"]),
  id: z.union([z.string(), z.number()]),
});
export type ApplicationScanRequestBody = z.infer<typeof ApplicationScanRequestSchema>;

/** Only checks the envelope shape, same rationale as parseTailorSuggestRequestBody. */
export function parseApplicationScanRequestBody(value: unknown): ApplicationScanRequestBody | null {
  const result = ApplicationScanRequestSchema.safeParse(value);
  return result.success ? result.data : null;
}

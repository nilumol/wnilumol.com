import type { VoiceProfileCategory } from "./types.ts";

/**
 * Formal professional voice - cover letters, application answers, formal emails. The default
 * category for Tailor My Profile's "Draft Answers" action (see
 * scripts/job-agent/application-draft.ts). No samples captured yet; add real cover
 * letters/emails here by hand as they become available.
 */
export const formalProfessionalVoice: VoiceProfileCategory = {
  category: "formalProfessional",
  description: "Formal professional voice - cover letters, job-application answers, formal emails.",
  samples: [],
};

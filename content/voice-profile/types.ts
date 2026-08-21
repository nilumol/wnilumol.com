/**
 * Three separate voice categories - not one blended "voice" - because they're genuinely
 * different registers: a conference talk doesn't read like a cover letter, and a LinkedIn note
 * doesn't read like either. See index.ts for how a category with no samples yet falls back.
 */
export type VoiceCategory = "publicSpeaking" | "formalProfessional" | "shortFormOutreach";

export interface VoiceSample {
  /** Short human-readable label for where this sample came from (e.g. "Cover letter - Acme, 2024"). */
  label: string;
  text: string;
}

export interface VoiceProfileCategory {
  category: VoiceCategory;
  /** One line describing this category's register and, where relevant, its default use. */
  description: string;
  /**
   * Populated by hand, gradually, as real writing samples become available - see
   * docs/job-agent.md's "Tailor My Profile: application scan" section. Empty is expected and
   * supported: buildVoiceSection() falls back to a resume-derived tone description rather than
   * blocking on every category being filled in.
   */
  samples: VoiceSample[];
}

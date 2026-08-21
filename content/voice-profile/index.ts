import { formalProfessionalVoice } from "./formal-professional.ts";
import { publicSpeakingVoice } from "./public-speaking.ts";
import { shortFormOutreachVoice } from "./short-form-outreach.ts";
import type { VoiceCategory, VoiceProfileCategory } from "./types.ts";

export * from "./types.ts";

export const voiceProfiles: Record<VoiceCategory, VoiceProfileCategory> = {
  publicSpeaking: publicSpeakingVoice,
  formalProfessional: formalProfessionalVoice,
  shortFormOutreach: shortFormOutreachVoice,
};

/**
 * Hand-authored fallback tone, read directly off how content/resume-data.ts is already written
 * (concise, metric-led, action-verb first, no first-person "I", never overstated) - used for any
 * voice category that doesn't have real writing samples captured yet, so drafting never blocks
 * on every category being filled in first. See docs/job-agent.md's "Tailor My Profile:
 * application scan" section.
 */
const RESUME_DERIVED_FALLBACK_TONE =
  "No real writing samples are captured yet for this voice category, so match the tone already " +
  "used in Winston's own resume data instead: concise and concrete, one clear accomplishment per " +
  "sentence, led by an action verb, quantified with a real number wherever one genuinely exists, " +
  "no first-person \"I\", no filler adjectives (\"passionate\", \"dynamic\"), no overstated claims.";

/**
 * Builds the "write in this voice" section of a drafting prompt for one category. Falls back to
 * the resume-derived tone description when the category has no real samples yet, rather than
 * blocking drafting until every category is filled in.
 */
export function buildVoiceSection(category: VoiceCategory): string {
  const profile = voiceProfiles[category];
  if (profile.samples.length === 0) {
    return [`## Voice: ${profile.description}`, RESUME_DERIVED_FALLBACK_TONE].join("\n\n");
  }

  const samples = profile.samples
    .map((sample, index) => `### Sample ${index + 1}: ${sample.label}\n${sample.text}`)
    .join("\n\n");

  return [
    `## Voice: ${profile.description}`,
    "Write in the voice demonstrated by the real samples below - match their sentence rhythm, " +
      "vocabulary, level of formality, and self-presentation style. Do not copy their content " +
      "verbatim or reuse their specific facts.",
    samples,
  ].join("\n\n");
}

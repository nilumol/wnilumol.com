/**
 * Contact line for the generated tailored-resume preview/PDF only, transcribed from
 * career/Winston Nilumol Resume_August_2026.pdf. Deliberately kept separate from
 * content/resume-data.ts (which flows into LLM prompts - see scripts/job-scout/scoring.ts and
 * tailor-suggestions.ts - and must never carry personal contact info) and from content/site.ts
 * (public, search-indexed pages). Only scripts/job-scout/resume-template.ts imports this.
 */
export const resumeContact = {
  name: "Winston Nilumol",
  location: "Redwood City CA",
  phone: "(408) 857-8432",
  email: "winston.nilumol@gmail.com",
  linkedinUrl: "https://www.linkedin.com/in/nilumolw/",
};

export interface JobAgentKeywordFamily {
  /** Canonical name recorded when a job matches this family. */
  name: string;
  /** Case-insensitive substrings matched against a job title. Any one hit is a match. */
  variants: string[];
}

/**
 * Title pre-filter for job-agent. A job must match the configured board's company AND at
 * least one family below to ever be written to the ledger - everything else is silently
 * skipped every run so the ledger stays small and relevant.
 *
 * Add a family or a variant by editing this array - no other file needs to change.
 */
export const jobAgentKeywordFamilies: JobAgentKeywordFamily[] = [
  { name: "Solutions Consultant", variants: ["Solutions Consultant"] },
  {
    name: "Implementation Manager",
    variants: [
      "Implementation Manager",
      "Implementation Mgr",
      "Sr. Implementation Manager",
      "Senior Implementation Manager",
      "Sr Implementations Manager",
      "Implementations Manager",
      "Implementations Mgr",
    ],
  },
  { name: "Solutions Architect", variants: ["Solutions Architect"] },
  { name: "Customer Success Manager", variants: ["Customer Success Manager"] },
  { name: "Sales Engineer", variants: ["Sales Engineer"] },
];

/**
 * Filename abbreviation for each keyword family, used by the Tailor My Profile PDF route to
 * name the download (`Winston Nilumol_Resume_<ABBR>.pdf`). Keyed by `jobAgentKeywordFamily.name`
 * above - not a separate classifier, just a display abbreviation for families that already exist.
 */
export const jobAgentKeywordFamilyAbbreviations: Record<string, string> = {
  "Solutions Consultant": "SC",
  "Sales Engineer": "SE",
  "Implementation Manager": "IM",
  "Customer Success Manager": "CS",
  "Solutions Architect": "SA",
};

/**
 * Returns the name of the first keyword family the title matches, or null if none match.
 */
export function matchJobAgentKeywordFamily(
  title: string,
  families: JobAgentKeywordFamily[] = jobAgentKeywordFamilies,
): string | null {
  const lowerTitle = title.toLowerCase();
  for (const family of families) {
    if (family.variants.some((variant) => lowerTitle.includes(variant.toLowerCase()))) {
      return family.name;
    }
  }
  return null;
}

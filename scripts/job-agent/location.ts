import {
  jobAgentNonUsCodes,
  jobAgentNonUsCountriesAndCities,
  jobAgentUsCountryAbbreviations,
  jobAgentUsCountryNames,
  jobAgentUsStates,
} from "../../content/job-agent-locations.ts";

/**
 * Cleans formatting artifacts some companies' Greenhouse data entry produces in the raw
 * `location.name` field (e.g. Smartsheet's raw value literally reads "-REMOTE, USA-") -
 * strips stray leading/trailing dashes and whitespace before the value is ever displayed.
 */
export function cleanLocationName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw
    .trim()
    .replace(/^[\s-]+/, "")
    .replace(/[\s-]+$/, "");
  return cleaned.length > 0 ? cleaned : null;
}

export type JobLocationClassification = "us" | "non-us" | "unrecognized";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Safe for multi-word or long proper-noun values - they essentially never appear by accident. */
function matchesAnySubstring(segment: string, values: readonly string[]): boolean {
  const lower = segment.toLowerCase();
  return values.some((value) => lower.includes(value.toLowerCase()));
}

/**
 * Required for short codes (2-3 letter state/country abbreviations) - naive substring matching
 * on e.g. "US" or "OR" produces real false positives ("August", "coordinator"). Word boundaries
 * also make matching order-independent ("NC - Remote", "Remote, NC", "NC-Remote" all match).
 */
function matchesAnyToken(segment: string, values: readonly string[]): boolean {
  return values.some((value) => new RegExp(`\\b${escapeRegExp(value)}\\b`, "i").test(segment));
}

const usStateFullNames = jobAgentUsStates.map((state) => state.fullName);
const usStateAbbreviations = jobAgentUsStates.map((state) => state.abbreviation);

function isUsSegment(segment: string): boolean {
  return (
    matchesAnySubstring(segment, jobAgentUsCountryNames) ||
    matchesAnySubstring(segment, usStateFullNames) ||
    matchesAnyToken(segment, jobAgentUsCountryAbbreviations) ||
    matchesAnyToken(segment, usStateAbbreviations)
  );
}

function isNonUsSegment(segment: string): boolean {
  return (
    matchesAnySubstring(segment, jobAgentNonUsCountriesAndCities) || matchesAnyToken(segment, jobAgentNonUsCodes)
  );
}

/**
 * Classifies a job's location string as "us" (confident US - keep), "non-us" (confident
 * foreign - drop), or "unrecognized" (no confident signal either way - keep, but the caller
 * should log it so the captain can review and extend content/job-agent-locations.ts).
 *
 * A multi-location string (e.g. "Atlanta, Georgia; Boston, Massachusetts; ... Remote - North
 * Carolina") is split on `;`, `,`, and `/` and classified segment by segment: any US segment
 * wins the whole string, since a posting that includes a US option is one worth seeing. Only
 * classified "non-us" when no segment matches US and at least one segment matches the denylist.
 */
export function classifyJobLocation(raw: string | null | undefined): JobLocationClassification {
  const cleaned = cleanLocationName(raw);
  if (!cleaned) return "unrecognized";

  const segments = cleaned
    .split(/[;,/]/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  let sawNonUs = false;
  for (const segment of segments) {
    if (isUsSegment(segment)) return "us";
    if (isNonUsSegment(segment)) sawNonUs = true;
  }
  return sawNonUs ? "non-us" : "unrecognized";
}

/**
 * Score at/above this is a "strong fit" - no resume-adjustment document is generated, and the
 * hidden page doesn't surface a resume-notes link for it. Named constant, deliberately kept in
 * its own zero-dependency module so both the daily script (scripts/job-scout/scoring.ts) and
 * the hidden page (app/job-scout/page.tsx) can import it without pulling script-only
 * dependencies (the Anthropic SDK) into the site's build.
 */
export const STRONG_FIT_CUTOFF = 7;

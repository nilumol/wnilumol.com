/**
 * Score at/above this is a "strong fit" - the boundary for the green fit-score pill on the
 * hidden page. Named constant, deliberately kept in its own zero-dependency module so both the
 * daily script (scripts/job-scout/scoring.ts) and the hidden page (app/job-scout/page.tsx) can
 * import it without pulling script-only dependencies (the Anthropic SDK) into the site's build.
 */
export const STRONG_FIT_CUTOFF = 7;

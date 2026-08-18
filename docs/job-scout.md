# Job Scout

A private, hidden tool that scans job boards every day and scores how well each posting fits
Winston's background. It's for Winston only - it is not part of the public portfolio.

## What it is and where it lives

- Page: `/job-scout`, rendered by `app/job-scout/page.tsx`.
- **Hidden**: not in the site's primary navigation, and the page sets
  `robots: { index: false, follow: false }` so search engines won't index it.
- It shows a single table, sorted by fit score, of every job the scan has scored: title,
  company, matched role, location, pay (if listed), a link to the posting, and a 1-10 fit score
  pill (green = strong fit, at or above the cutoff in `content/job-scout-config.ts`).

## The pipeline, end to end

1. **Fetch.** Once a day, a script pulls every open job (with full description) from each
   tracked company's public Greenhouse job board API.
2. **Keyword pre-filter.** Each job title is checked against a list of role-family keywords
   (see below). Anything that doesn't match is skipped and never stored - this keeps the ledger
   small and relevant.
3. **Claude scoring.** Every job that survives the filter and hasn't been seen before is sent to
   Claude along with Winston's structured resume and a scoring rubric. Claude returns a 1-10 fit
   score, a short rationale, and (if the posting states one) a pay/compensation range.
4. **Ledger.** Every scored job is written to a JSON file that is committed straight into the
   git repository - there is no separate database.
5. **Table page.** The hidden `/job-scout` page reads that same JSON file at build time and
   renders it as a table.

## Companies currently tracked

Defined in `content/job-scout-boards.ts` (Greenhouse only, for now):

Smartsheet, Vaxcyte, HealthVerity, Figma, Zscaler, Celonis, Algolia, Databricks, GitLab,
Cloudflare.

## Common edits (no code changes needed)

- **Add or remove a tracked company**: edit the list in `content/job-scout-boards.ts` - one
  line per company (Greenhouse board token + display label).
- **Change which job titles get scored**: edit the keyword families in
  `content/job-scout-keywords.ts`. A job must match one of these families (by title substring)
  to ever reach Claude scoring; anything else is silently skipped every run.
- **Tune how Claude scores fit**: edit `content/job-scout-scoring.md` in plain English. This
  file is sent to Claude verbatim as the scoring instructions - no code changes needed.
- **Change the "strong fit" score cutoff** (the threshold for the green pill): edit
  `STRONG_FIT_CUTOFF` in `content/job-scout-config.ts`.
- **Mark a job "applied" or "passed"**: hand-edit the `status` field for that job's entry in
  `content/job-scout-seen.json`. This is deliberate - there is no button or UI for it, so a
  status only ever changes when Winston edits the file himself.

## Automation, and what it costs to run

- Runs on a schedule via GitHub Actions: `.github/workflows/job-scout.yml`, currently
  `0 13 * * *` (13:00 UTC daily; GitHub Actions cron has no timezone/DST awareness, so this
  drifts by an hour between PST and PDT - an accepted tradeoff, not a bug).
- Can also be triggered manually from the Actions tab (`workflow_dispatch`).
- The workflow runs `npm run job-scout`, then commits and pushes any ledger changes back to the
  repo as the `github-actions[bot]` user.
- Cost: the only paid dependency is the Anthropic API call used for scoring. The workflow reads
  the key from a GitHub Actions repository secret named `ANTHROPIC_API_KEY`. The scoring model
  is `claude-sonnet-5` (chosen specifically to keep the per-run API cost low). A run with zero
  new candidate jobs makes no API call at all and needs no key.
- The pipeline logic itself lives in `scripts/job-scout/pipeline.ts` (with `run.ts` as the
  entry point that wires it to the real Greenhouse API, the ledger file, and Claude); it has its
  own test suite runnable via `npm run job-scout:test`.

## Known limits / not yet built

- **Greenhouse only.** The board interface is designed to allow other applicant-tracking
  systems, but only Greenhouse is implemented today - Lever and Ashby are not supported yet.
- **No resume-adjustment suggestions.** An earlier version had Claude also suggest resume
  tweaks per posting; that was removed to cut token cost. Scoring now returns only a score, a
  rationale, and an optional compensation range.
- **No UI for applied/passed.** Marking a job as applied or passed is a manual edit to
  `content/job-scout-seen.json` - there is no button on the page for it yet.

# Job Scout

A private, hidden tool that scans job boards every day and tracks how well each posting fits
Winston's background. It's for Winston only - it is not part of the public portfolio.

## What it is and where it lives

- Page: `/job-scout`, rendered by `app/job-scout/page.tsx` (server component). The interactive
  body lives in `app/job-scout/JobScoutSections.tsx` (client component), which renders three
  native `<details>`/`<summary>` collapsible sections and owns the state shared across them.
- **Hidden**: not in the site's primary navigation, and the page sets
  `robots: { index: false, follow: false }` so search engines won't index it.
- **Opportunities** (open by default) is the sortable table of every non-expired job the scan
  has found, built in `app/job-scout/JobScoutTable.tsx`: title, company, matched role, location,
  posted date, pay (if listed), a link to the posting, and a fit score - either a 1-10
  color-banded pill for scored jobs (green = strong fit, at or above the cutoff in
  `content/job-scout-config.ts`) or a muted "pending" pill for jobs not yet scored. Every column
  header sorts (default: fit score descending), and sorting resets to page 1. Rows paginate 30 at
  a time. Each row has a checkbox; selection persists across pagination and re-sorting. A toolbar
  above the table shows a running "N selected" count, a "Select All" button that selects every row
  on the current page, and a "Send" button (disabled with nothing selected) that removes the
  selected rows from the list and updates the Tailor My Profile section's placeholder with the
  sent count - client-side only, not persisted, and reverts on refresh.
- **Tracker** and **Tailor My Profile** are collapsed-by-default placeholder sections with no
  logic yet; see "Known limits / not yet built" below.

## The pipeline, end to end

1. **Fetch.** Once a day, a script pulls every open job (with full description) from each
   tracked company's Greenhouse, Lever, or Ashby job board API.
2. **Keyword pre-filter.** Each job title is checked against a list of role-family keywords
   (see below). Anything that doesn't match is skipped and never stored - this keeps the ledger
   small and relevant.
3. **Ledger, as "pending".** Every job that survives the filter and hasn't been seen before is
   written to the ledger with `status: "pending"` - no LLM call happens in this automated path at
   all. A structured compensation range is recorded directly when the source provides one
   (currently Lever's `salaryRange`); otherwise pay stays unset until scored.
4. **Scoring, outside the automated GitHub Actions pipeline.** Two ways to score "pending" jobs,
   run manually/locally, never from the workflow:
   - **Default, free**: `npm run job-scout:apply-scores -- <path-to-json>` merges a
     pre-computed batch of `{ id, fitScore, fitRationale, compensationRange }` - typically from
     Winston or an assistant reasoning over the postings directly, no paid API call - into the
     ledger. See `scripts/job-scout/apply-scores.ts`.
   - **Opt-in, calls Claude directly**: `npm run job-scout:score-via-api` re-fetches pending
     jobs' full posting content and scores them via a live Claude API call, using
     `ANTHROPIC_API_KEY` from the local environment. Kept in the codebase as a working,
     demonstrable feature; not part of the automated pipeline and never needs a GitHub Actions
     secret. See `scripts/job-scout/score-via-api.ts`.
   Either path flips matching `"pending"` ledger entries to `"scored"`.
5. **Table page.** The hidden `/job-scout` page reads the same ledger JSON file at build time and
   renders it as a sortable table.

## Companies currently tracked

Defined in `content/job-scout-boards.ts`, across Greenhouse, Lever, and Ashby:

Smartsheet, Vaxcyte, HealthVerity, Figma, Zscaler, Celonis, Algolia, Databricks, GitLab,
Cloudflare, Ethena, Veeva, Windfall, Aizon, AlphaLifeSci, Notion, LevelPath.

## Common edits (no code changes needed)

- **Add or remove a tracked company**: edit the list in `content/job-scout-boards.ts` - one
  line per company (board token, display label, and ATS `source`).
- **Change which job titles get tracked**: edit the keyword families in
  `content/job-scout-keywords.ts`. A job must match one of these families (by title substring)
  to ever land in the ledger; anything else is silently skipped every run.
- **Tune the fit-scoring instructions**: edit `content/job-scout-scoring.md` in plain English.
  This is the rubric sent verbatim to Claude by `job-scout:score-via-api`, and the same rubric a
  human or an assistant should follow when scoring by hand for `job-scout:apply-scores` - no code
  changes needed.
- **Change the "strong fit" score cutoff** (the threshold for the green pill): edit
  `STRONG_FIT_CUTOFF` in `content/job-scout-config.ts`.
- **Mark a job "applied" or "passed"**: hand-edit the `status` field for that job's entry in
  `content/job-scout-seen.json`. This is deliberate - there is no button or UI for it, so a
  status only ever changes when Winston edits the file himself.

## Automation (no paid API in the automated loop)

- Runs on a schedule via GitHub Actions: `.github/workflows/job-scout.yml`, currently
  `0 13 * * *` (13:00 UTC daily; GitHub Actions cron has no timezone/DST awareness, so this
  drifts by an hour between PST and PDT - an accepted tradeoff, not a bug).
- Can also be triggered manually from the Actions tab (`workflow_dispatch`).
- The workflow runs `npm run job-scout`, then commits and pushes any ledger changes back to the
  repo as the `github-actions[bot]` user. This step makes **no LLM call and needs no API key or
  repository secret** - it only fetches, filters, diffs against the ledger, writes new matches as
  `status: "pending"`, and expires disappeared entries.
- Scoring "pending" jobs is a separate, manual step - see the two options above
  (`job-scout:apply-scores` and `job-scout:score-via-api`). Neither runs from the workflow.
- The pipeline logic lives in `scripts/job-scout/pipeline.ts` (with `run.ts` as the entry point
  that wires it to the real Greenhouse/Lever/Ashby APIs and the ledger file); it has its own test
  suite runnable via `npm run job-scout:test`.

## Known limits / not yet built

- **No resume-adjustment suggestions.** An earlier version had Claude also suggest resume
  tweaks per posting; that was removed to cut token cost. Scoring now returns only a score, a
  rationale, and an optional compensation range.
- **No UI for applied/passed.** Marking a job as applied or passed is a manual edit to
  `content/job-scout-seen.json` - there is no button on the page for it yet.
- **Tracker and Tailor My Profile are placeholders.** Sending rows from Opportunities only
  updates the Tailor My Profile section's placeholder text with a count, client-side and
  ephemeral - it does not write to the ledger, build a resume/cover-letter draft, or populate the
  Tracker table. Both are queued as separate follow-on builds.

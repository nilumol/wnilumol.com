# Job Application Agent

A private, hidden tool that scans job boards every day and tracks how well each posting fits
Winston's background. It's for Winston only - it is not part of the public portfolio.

## What it is and where it lives

- Page: `/job-agent`, rendered by `app/job-agent/page.tsx` (server component). The interactive
  body lives in `app/job-agent/JobAgentSections.tsx` (client component), which renders three
  native `<details>`/`<summary>` collapsible sections and owns the state shared across them.
- **Hidden**: not in the site's primary navigation, and the page sets
  `robots: { index: false, follow: false }` so search engines won't index it.
- **Opportunities** (open by default) is the sortable table of every non-expired job the scan
  has found, built in `app/job-agent/JobAgentTable.tsx`: title, company, matched role, location,
  posted date, pay (if listed), a link to the posting, and a fit score - either a 1-10
  color-banded pill for scored jobs (green = strong fit, at or above the cutoff in
  `content/job-agent-config.ts`) or a muted "pending" pill for jobs not yet scored. Every column
  header sorts (default: fit score descending), and sorting resets to page 1. Rows paginate 30 at
  a time. Each row has a checkbox; selection persists across pagination and re-sorting. A toolbar
  above the table shows a running "N selected" count, a "Select All" button that selects every row
  on the current page, and a "Send" button (disabled with nothing selected) that removes the
  selected rows from the list and forwards them to the Tailor My Profile section as sent ledger
  entries (`JobAgentSections.tsx`'s `sentEntries` state) - client-side only, not persisted, and
  reverts on refresh.
- **Tracker** (collapsed by default) is a read-only table, built in
  `app/job-agent/JobAgentTracker.tsx`, of ledger entries whose status is `applied` or `passed` -
  job title, company, a status pill, location, and a link to the posting, in a fixed
  company/title order. It reads the same ledger the page already loads; there is no sort,
  pagination, or write path.
- **Tailor My Profile** (collapsed by default), built in `app/job-agent/JobAgentTailor.tsx`, is
  the first of two planned stages. This stage covers resume-tailoring suggestions and a
  downloadable tailored PDF for every job Opportunities' "Send" button forwards (Opportunities'
  local `sentEntries` state, held in `JobAgentSections.tsx` - not persisted). The second stage
  (application-scan / cover-letter / question-drafting) is a separate, not-yet-built piece. See
  "Tailor My Profile: resume tailoring" below for the full design.

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
   - **Default, free**: `npm run job-agent:apply-scores -- <path-to-json>` merges a
     pre-computed batch of `{ id, fitScore, fitRationale, compensationRange }` - typically from
     Winston or an assistant reasoning over the postings directly, no paid API call - into the
     ledger. See `scripts/job-agent/apply-scores.ts`.
   - **Opt-in, calls Claude directly**: `npm run job-agent:score-via-api` re-fetches pending
     jobs' full posting content and scores them via a live Claude API call, using
     `ANTHROPIC_API_KEY` from the local environment. Kept in the codebase as a working,
     demonstrable feature; not part of the automated pipeline and never needs a GitHub Actions
     secret. See `scripts/job-agent/score-via-api.ts`.
   Either path flips matching `"pending"` ledger entries to `"scored"`.
5. **Table page.** The hidden `/job-agent` page reads the same ledger JSON file at build time and
   renders it as a sortable table.

## Companies currently tracked

Defined in `content/job-agent-boards.ts`, across Greenhouse, Lever, and Ashby:

Smartsheet, Vaxcyte, HealthVerity, Figma, Zscaler, Celonis, Algolia, Databricks, GitLab,
Cloudflare, Ethena, Veeva, Windfall, Aizon, AlphaLifeSci, Notion, LevelPath.

## Common edits (no code changes needed)

- **Add or remove a tracked company**: edit the list in `content/job-agent-boards.ts` - one
  line per company (board token, display label, and ATS `source`).
- **Change which job titles get tracked**: edit the keyword families in
  `content/job-agent-keywords.ts`. A job must match one of these families (by title substring)
  to ever land in the ledger; anything else is silently skipped every run.
- **Tune the fit-scoring instructions**: edit `content/job-agent-scoring.md` in plain English.
  This is the rubric sent verbatim to Claude by `job-agent:score-via-api`, and the same rubric a
  human or an assistant should follow when scoring by hand for `job-agent:apply-scores` - no code
  changes needed.
- **Change the "strong fit" score cutoff** (the threshold for the green pill): edit
  `STRONG_FIT_CUTOFF` in `content/job-agent-config.ts`.
- **Mark a job "applied" or "passed"**: hand-edit the `status` field for that job's entry in
  `content/job-agent-seen.json`. This is deliberate - there is no button or UI for it, so a
  status only ever changes when Winston edits the file himself.

## Automation (no paid API in the automated loop)

- Runs on a schedule via GitHub Actions: `.github/workflows/job-agent.yml`, currently
  `0 13 * * *` (13:00 UTC daily; GitHub Actions cron has no timezone/DST awareness, so this
  drifts by an hour between PST and PDT - an accepted tradeoff, not a bug).
- Can also be triggered manually from the Actions tab (`workflow_dispatch`).
- The workflow runs `npm run job-agent`, then commits and pushes any ledger changes back to the
  repo as the `github-actions[bot]` user. This step makes **no LLM call and needs no API key or
  repository secret** - it only fetches, filters, diffs against the ledger, writes new matches as
  `status: "pending"`, and expires disappeared entries.
- Scoring "pending" jobs is a separate, manual step - see the two options above
  (`job-agent:apply-scores` and `job-agent:score-via-api`). Neither runs from the workflow.
- The pipeline logic lives in `scripts/job-agent/pipeline.ts` (with `run.ts` as the entry point
  that wires it to the real Greenhouse/Lever/Ashby APIs and the ledger file); it has its own test
  suite runnable via `npm run job-agent:test`.

## Tailor My Profile: resume tailoring

Reworks a job's fit into resume-tailoring suggestions and a downloadable tailored PDF, without
ever fabricating an accomplishment or persisting anything server-side. Fully ephemeral by
explicit design: nothing this feature generates is ever written back to
`content/resume-data.ts` (the permanent source of truth, changed only by hand) or stored on the
server between requests.

**The guardrail.** The AI may only ever (1) **reorder** the 5 career highlights or the bullets
within one of the two most recent roles (Collate, Benchling), or (2) propose **new phrasing**
for one of those two roles, grounded in something already true in an existing bullet from that
same role (every such suggestion carries a `groundedIn` pointer back to the specific bullet it's
drawn from, shown to the captain for review). Genentech and Merck (the two older roles) are
never touched by either suggestion type - enforced structurally, not just by prompt instruction:
`scripts/job-agent/tailor-suggestions.ts`'s prompt only ever sends the highlights array and the
Collate/Benchling bullets as reorderable/groundable targets, so the model has no way to
reference the older roles even if instructed to. The response is constrained to this shape via
Anthropic structured outputs (`output_config.format` + a Zod discriminated-union schema in
`scripts/job-agent/tailor-types.ts`), the same `client.messages.parse()` pattern
`scripts/job-agent/scoring.ts` already uses, on the same `claude-sonnet-5` model.

**Passphrase gate.** One shared secret, `TAILOR_PASSPHRASE` (a new required env var - not set,
the paid routes below refuse all requests). Not a real user-account system, just a gate so this
unauthenticated, unlisted page can't run up API costs if the URL leaks. The client stores the
entered passphrase in `sessionStorage` after first entry (that browser tab's session only) and
sends it as the `X-Tailor-Passphrase` header on every request to the three routes below; each
verifies it server-side (`scripts/job-agent/tailor-auth.ts`) before doing any paid work. No
cookies, no server-side session state.

**Three hosted API routes**, all Node runtime (not Edge - Puppeteer needs Node):

- `POST /api/job-agent/tailor/suggestions` - given `{ source, id }`, re-fetches the posting's
  live content the same way `job-agent:score-via-api` does (the ledger doesn't persist full
  descriptions), then calls Claude with the guardrailed prompt above. Returns the suggestion
  list, each with a short one-clause rationale (~12 words - the existing fit-scoring rationale
  style is 600+ characters and doesn't fit this compact checklist UI).
- `POST /api/job-agent/tailor/preview` - given the job's metadata, the captain's accepted
  suggestions, and free text, merges them onto the unmodified `resumeData`
  (`scripts/job-agent/resume-tailor.ts`) and renders the result as a self-contained HTML page
  (`scripts/job-agent/resume-template.ts`). The client opens the response as a `blob:` URL in a
  new tab - a true preview, not a separate representation, because...
- `POST /api/job-agent/tailor/pdf` - takes the identical request shape and calls the *same*
  `renderResumeHtml()` used by `/preview`, then prints it through headless Chromium
  (`puppeteer-core` + `@sparticuz/chromium`, chosen over a programmatic PDF-drawing library for
  faithful HTML/CSS layout) and returns it as a direct download
  (`Content-Disposition: attachment`), generated fresh per click and never stored. Filename is
  `Winston Nilumol_Resume_<ABBR>.pdf`, where `<ABBR>` comes from the job's `keywordFamily` field
  mapped through `jobAgentKeywordFamilyAbbreviations` in `content/job-agent-keywords.ts`.

**Font fidelity.** The real resume (`career/Winston Nilumol Resume_August_2026.pdf`) is set in
Verdana, which is neither open-licensed nor installed on Vercel's Linux serverless environment -
without a bundled substitute, headless Chromium would silently fall back to a generic
sans-serif. `assets/fonts/open-sans/` bundles Open Sans (Regular/Bold/Italic, OFL-licensed), a
standard visual equivalent to Verdana; `resume-template.ts` embeds it as base64 `@font-face`
data URIs directly in the generated HTML, so both `/preview` and `/pdf` render from the exact
same bytes with no outbound network dependency during a serverless cold start.

**Local dev limitation.** `@sparticuz/chromium`'s bundled binary is Linux-only, so the PDF route
cannot be exercised end-to-end on a local macOS dev machine (`spawn ENOEXEC`) - this is the
inherent, expected reason the binary needs bundling for Vercel in the first place. `/suggestions`
and `/preview` can be tested locally with `TAILOR_PASSPHRASE` and `ANTHROPIC_API_KEY` set.

## Known limits / not yet built

- **No UI for applied/passed.** Marking a job as applied or passed is a manual edit to
  `content/job-agent-seen.json` - there is no button on the page for it yet.
- **Tailor My Profile's second stage isn't built.** The application-scan / cover-letter /
  question-drafting piece (scanning the real application for extra questions, drafting answers
  in the captain's voice) is a separate, queued follow-on build. Tailor My Profile is not
  connected to Tracker: Tracker only reflects hand-set `applied`/`passed` ledger entries.

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
  `app/job-agent/JobAgentTracker.tsx`, of every job whose status is `applied` or `passed` - job
  title, company, a status pill, location, and a link to the posting, in a fixed company/title
  order. Its row list is computed server-side in `app/job-agent/page.tsx` and passed down as a
  `trackedEntries` prop: hand-set ledger entries (status edited directly in
  `content/job-agent-seen.json`) plus live entries from the Blob status overlay, merged by
  `mergeTrackerEntries()` - see "Live status overlay: Mark Applied / Mark Passed" below. The
  table itself still has no sort, pagination, or write path of its own.
- **Tailor My Profile** (collapsed by default), built in `app/job-agent/JobAgentTailor.tsx`, has
  two stages for every job Opportunities' "Send" button forwards (Opportunities' local
  `sentEntries` state, held in `JobAgentSections.tsx` - not persisted), both complete:
  resume-tailoring suggestions plus a downloadable tailored PDF, and scanning the real application
  page for cover-letter acceptance and free-text questions with an option to draft answers to them
  in a real (gradually-captured) voice, plus the "Mark Applied"/"Mark Passed" actions (see below).
  See "Tailor My Profile: resume tailoring" and "Tailor My Profile: application scan" below for the
  full design.

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
     ledger. A structured, source-provided `compensationRange` already on the ledger entry (see
     step 3) is authoritative and is never overwritten by the batch's value. See
     `scripts/job-agent/apply-scores.ts`.
   - **Opt-in, calls Claude directly**: `npm run job-agent:score-via-api` re-fetches pending
     jobs' full posting content and scores them via a live Claude API call, using
     `ANTHROPIC_API_KEY` from the local environment. Kept in the codebase as a working,
     demonstrable feature; not part of the automated pipeline and never needs a GitHub Actions
     secret. See `scripts/job-agent/score-via-api.ts`.
   Either path flips matching `"pending"` ledger entries to `"scored"`.
5. **Table page.** The hidden `/job-agent` page reads the same ledger JSON file (a build-time
   static import) and renders it as a sortable table. Tracker also layers in the live Blob status
   overlay at request time - see "Live status overlay: Mark Applied / Mark Passed" below.

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
- **Mark a job "applied" or "passed"**: either hand-edit the `status` field for that job's entry
  in `content/job-agent-seen.json` (the original path, part of git history), or click "Mark
  Applied"/"Mark Passed" on the job's card in Tailor My Profile, which writes to the live Blob
  overlay instead and never touches git - see "Live status overlay: Mark Applied / Mark Passed"
  below. If both ever disagree for the same job, the Blob overlay wins (it's the more recent,
  captain-driven signal). There is still no UI for editing or un-marking an existing status.

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

**Card actions.** Each card shows an "Open application" link (the job's `absoluteUrl`, opens in a
new tab), "Mark Passed"/"Mark Applied" (see "Live status overlay" below), and four more actions
with real processing time - each shows the site's standard loading spinner (see CLAUDE.md's
Design System section) while in flight:

- **Tailor This Resume** - the initial suggestions call, described below.
- **Revise** - sends the free-text notes box's current content plus every suggestion's current
  accepted/rejected state back to `/suggestions` (as a `revision` block) so the model can produce
  a revised suggestion set incorporating the captain's own corrections (e.g. "you got my Personal
  Sabbatical role wrong, fix it"). The only other place besides the initial call that makes a real
  Anthropic API call.
- **Review** (renamed from "View") - opens the merged resume in a new tab with newly-added
  grounded phrasing and reordered content visually marked, so the captain can see what changed at
  a glance before downloading.
- **Generate PDF** - identical merge/render, no highlight marks.

**Three hosted API routes**, all Node runtime (not Edge - Puppeteer needs Node):

- `POST /api/job-agent/tailor/suggestions` - given `{ source, id }`, re-fetches the posting's
  live content the same way `job-agent:score-via-api` does (the ledger doesn't persist full
  descriptions), then calls Claude with the guardrailed prompt above. Returns the suggestion
  list, each with a short one-clause rationale (~12 words - the existing fit-scoring rationale
  style is 600+ characters and doesn't fit this compact checklist UI). Also accepts an optional
  `revision: { priorSuggestions: { suggestion, accepted }[], notes }` block (the "Revise" action) -
  when present, `scripts/job-agent/tailor-suggestions.ts` appends the prior suggestions' kept/
  rejected state and the captain's notes to the prompt before calling Claude again.
- `POST /api/job-agent/tailor/preview` - given the job's metadata, the captain's accepted
  suggestions, and free text, merges them onto the unmodified `resumeData`
  (`scripts/job-agent/resume-tailor.ts`) and renders the result as a self-contained HTML page
  (`scripts/job-agent/resume-template.ts`), with `highlightChanges: true`. The client opens the
  response as a `blob:` URL in a new tab - a true preview (the "Review" action), not a separate
  representation, because...
- `POST /api/job-agent/tailor/pdf` - takes the identical request shape and calls the *same*
  `renderResumeHtml()` used by `/preview`, with `highlightChanges: false`, then prints it through
  headless Chromium (`puppeteer-core` + `@sparticuz/chromium`, chosen over a programmatic
  PDF-drawing library for faithful HTML/CSS layout) and returns it as a direct download
  (`Content-Disposition: attachment`), generated fresh per click and never stored. Filename is
  `Winston Nilumol_Resume_<ABBR>.pdf`, where `<ABBR>` comes from the job's `keywordFamily` field
  mapped through `jobAgentKeywordFamilyAbbreviations` in `content/job-agent-keywords.ts`.

**Highlighting.** `mergeTailoredResume()` tags every bullet as `added` (from an accepted
new-phrasing suggestion) and every role/highlights list as `bulletsReordered`/`highlightsReordered`
(an accepted reorder suggestion permuted it). `renderResumeHtml(resume, meta, highlightChanges)`
takes a single boolean flag - Review and Generate PDF call the *exact same* merge/render logic and
differ only in that flag, so the PDF can never visually drift from what was reviewed. When true,
added bullets get one mark color and reordered lists get a different one (matching the suggestion-
type pill colors already used in the checklist above); when false, no highlight markup is emitted
at all.

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

## Live status overlay: Mark Applied / Mark Passed

Each card in Tailor My Profile has "Mark Passed" and "Mark Applied" buttons (next to "Open
application"), each showing the standard spinner while in flight. This is the only way, besides a
captain hand-edit, to change a job's status - and it's deliberately narrow: it writes to a small
live overlay, never to git.

- **Why not just write to the ledger?** The ledger (`content/job-agent-seen.json`) is
  git-committed and written only by the daily automated scan and the manual scoring scripts - a
  browser click was never going to commit-and-push on someone's behalf. A live-writable store was
  the only option that didn't mean building a commit-per-click flow.
- **Storage: Vercel Blob, one JSON document.** `scripts/job-agent/tracker-overlay.ts` reads/writes
  a single blob at `job-agent/tracker-overlay.json` in a private Blob store (`job-agent-tracker`,
  env var prefix `JOB_AGENT_TRACKER` - every SDK call passes
  `token: process.env.JOB_AGENT_TRACKER_READ_WRITE_TOKEN` explicitly, since the custom prefix
  means `@vercel/blob`'s default `BLOB_READ_WRITE_TOKEN` env var doesn't apply). One document
  holding a small `{ "<source>:<id>": { status, title, company, location, absoluteUrl, updatedAt
  } }` map was chosen over one blob per job: expected volume is a handful of marks over the
  tool's lifetime, so a single read/write beats a `list()` call plus N reads. Retention is
  indefinite by design - no TTL or cleanup - matching the ledger's own "expired but retained
  forever" precedent.
- **Why the overlay snapshots title/company/location/absoluteUrl instead of resolving them from
  the ledger at read time:** the daily scan flips a ledger entry's own `status` to `"expired"`
  once its posting disappears from the board - which tends to happen exactly when you've been
  hired or the req has closed - and `/job-agent` drops expired ledger entries before Tracker ever
  sees them. Snapshotting these fields at write time (server-side, from the ledger entry looked up
  by id - never from client input) keeps a marked job visible in Tracker regardless of what later
  happens to the live posting.
- **Route:** `POST /api/job-agent/tailor/status`, passphrase-gated the same way as the other three
  Tailor routes. Body is `{ source, id, status }`; the job's other fields are looked up
  server-side from the ledger, not trusted from the client.
- **Merge at render time.** `app/job-agent/page.tsx` reads the non-expired ledger slice (as
  before) plus the overlay, and calls `mergeTrackerEntries()` to build Tracker's full row list -
  hand-set ledger rows, plus overlay rows, with an overlay entry winning over a stale ledger row
  for the same job. `JobAgentSections` receives this as a `trackedEntries` prop instead of
  deriving it from `initialEntries` itself.
- **This forced `/job-agent` off static generation.** Reading the overlay from Blob is a
  request-time operation, so `page.tsx` now declares `export const dynamic = "force-dynamic"`.
  Before this feature, the page was fully statically generated from the ledger's build-time JSON
  import (served from cache, no per-request work); now every load does one Blob read server-side.
  Tradeoff accepted deliberately for a low-traffic hidden internal tool - freshness beats
  build-time caching here. The ledger JSON import itself is still a build-time static import; only
  the overlay read is dynamic.
- **Read failures degrade gracefully; write failures don't.** If the Blob token is missing or the
  read fails for any reason (e.g. local dev, where `JOB_AGENT_TRACKER_READ_WRITE_TOKEN` isn't
  set), `page.tsx` treats it as "no live overlay rows" rather than crashing the whole hidden page
  - Tracker still shows any hand-set ledger rows. The `/status` route's write path does the
  opposite: a missing token or a failed write returns a clear error, shown inline on the card,
  because a click that silently did nothing would be worse than one that visibly failed.
- **After a successful mark**, the card shows a status pill in place of the two buttons, and the
  client calls `router.refresh()` so Tracker picks up the new row immediately, without a full page
  reload - no separate polling or client-side cache invalidation needed. There's no UI to edit or
  un-mark a status, on the same "hand-edit only" principle as the ledger itself.

## Tailor My Profile: application scan (second stage, complete)

The second of Tailor My Profile's two stages, both now built. Scans the real application page for
a job the captain has sent forward, surfaces what it asks for, and can draft answers to the
free-text questions it finds - review-only throughout: nothing here fills in or submits the real
form, and nothing is persisted server-side.

**Scan Application** (a new action on each card, alongside "Tailor This Resume" - independent of
it, so either can be run first) calls `POST /api/job-agent/tailor/scan` with `{ source, id }`,
passphrase-gated the same way as the other routes. The route looks up the ledger entry's
`absoluteUrl` (the same link "Open application" already points to - no separate re-fetch from the
board API, unlike `/suggestions`), loads it with headless Chromium
(`scripts/job-agent/application-scan.ts`'s `scrapeApplicationPage()`, the same
`puppeteer-core` + `@sparticuz/chromium` dependency the PDF route already uses - no second
browser-automation dependency), and pulls a generic, ATS-agnostic snapshot: every form field's
associated label (walked across the main page and any embedded frames, since some ATS platforms
mount the application form in an iframe) plus the full visible page text as a fallback. No
per-site selectors or Greenhouse/Lever/Ashby-specific parsing - `classifyApplicationPage()` then
sends that snapshot to Claude (same `claude-sonnet-5` model, same `client.messages.parse()` +
structured-output pattern as scoring and resume tailoring) to classify cover-letter acceptance
and every free-text/paragraph question, so the same code path generalizes across any application
form shape rather than needing per-ATS scraping rules. Detected questions render immediately once
the scan completes - no separate reveal click.

**Draft Answers** (shown once a scan finds at least one question, right below the question list)
is a second, separate action/API call - `POST /api/job-agent/tailor/draft`, given
`{ source, id, questions }` (the exact questions the client already has from the scan response, so
the server never re-derives them). It re-fetches the posting's live content the same way
`/suggestions` does, then calls Claude (`scripts/job-agent/application-draft.ts`'s
`draftApplicationAnswers()`) grounded in `resumeData` - never inventing an accomplishment, employer,
or metric - to write one answer per question, correlated back to the client's question ids by
array position (the model is never asked to echo ids back; the response schema is built per-request
with `z.array(...).length(questions.length)` so a wrong count fails loudly instead of silently
mismatching). Drafted answers render directly under their question once ready.

**Voice profiles.** Drafting writes in a real, captured voice rather than a generic assistant
tone, sourced from `content/voice-profile/` - three separate categories in their own files
(`public-speaking.ts`, `formal-professional.ts`, `short-form-outreach.ts`), because a conference
talk, a cover letter, and a LinkedIn note are genuinely different registers. Draft Answers always
uses `formalProfessional` (cover letters/application answers are exactly what that category is
for) - it is not a client-chosen option. Each category's `samples: VoiceSample[]` is populated by
hand, gradually, as the captain supplies real writing samples (past cover letters, emails, or
similar) - tracked separately from this build and **not** blocking it. `buildVoiceSection()` in
`content/voice-profile/index.ts` degrades gracefully per category: any category still empty falls
back to a hand-authored tone description read directly off how `content/resume-data.ts` is
already written (concise, metric-led, action-verb first, no first-person "I", never overstated),
so drafting works today and simply gets closer to the captain's real voice as samples are added -
no category has to be filled in before any other can be used.

## Known limits / not yet built

- **No UI for editing or un-marking an existing applied/passed status** - only setting one for the
  first time, from either path above.
- **Voice-profile samples are still empty.** All three `content/voice-profile/*.ts` files start
  with `samples: []`; drafting currently runs entirely on the resume-derived fallback tone until
  the captain adds real writing samples by hand.
- **The application-scan and draft routes can't be exercised end-to-end on local macOS dev.** Same
  root cause as the PDF route's "Local dev limitation" above (`@sparticuz/chromium`'s bundled
  binary is Linux-only) - `scrapeApplicationPage()` cannot launch headless Chromium locally on
  macOS; verified locally instead via unit tests plus a mocked-fetch manual UI pass in a real
  browser.

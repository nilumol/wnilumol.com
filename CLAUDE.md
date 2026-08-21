# Repository Guide

## Purpose

`wnilumol.com` is Winston Nilumol's professional portfolio. It should demonstrate how he connects enterprise software, biopharma domain knowledge, AI architecture, solutions consulting, sales engineering, implementation, adoption, and measurable business value. Primary readers are recruiters, founders, hiring managers, and technical or life-sciences leaders.

Prefer evidence of thinking and execution over unsupported claims. The site must remain understandable to industry professionals without requiring deep engineering expertise; deeper technical detail should be progressively disclosed.

## Architecture

- Next.js 16 App Router, React 19, and strict TypeScript.
- Pages and route-specific components live under `app/`.
- Shared components live under `components/`.
- `content/site.ts` is the source of truth for site identity, primary navigation, listed projects, and career entries.
- `app/globals.css` contains global tokens, shared layouts, and currently the route-specific visual styles. Prefix route-specific classes (for example, `gxp-*`) to prevent leakage.
- The root layout owns global metadata and the three configured fonts: Tenor Sans, Belleza, and Poppins via `next/font`.
- Static Server Components are the default. Add client components only when browser state or interaction requires them.

## Directory Conventions

- `app/<route>/page.tsx`: page composition and route metadata.
- `app/projects/<slug>/`: project page plus project-specific components. Extract large diagrams or complex visuals into named sibling components instead of embedding all markup in `page.tsx`.
- `components/`: reusable site-wide UI such as `SiteHeader` and `ProjectCard`.
- `content/site.ts`: concise structured copy used by public index pages.
- `projects/<project>/`: research, problem statements, and content briefs; these are source material, not automatic website routes.
- `docs/site-design.md`: site purpose, audience, information architecture, and high-level UX principles.
- `docs/project-page-system.md`: required content hierarchy, visual grammar, diagram rules, and project-page review gate. Read it before designing or materially revising a project page.
- `references/`: temporary or source visual references and standalone mockups. Do not expose these as Next.js routes or ship them as public navigation. Do not delete user-provided references casually.
- `career/`: resume and other career artifacts.

## Coding Conventions

- Use TypeScript/TSX; keep `strict` type checking clean.
- Use the `@/` alias for imports outside the current route directory; use relative imports for sibling route components.
- Export route metadata with `Metadata` where a page needs a specific title, description, or robots policy.
- Use semantic HTML (`main`, `header`, `nav`, `article`, `section`, `footer`) and meaningful heading order.
- Preserve accessibility: label navigation, give complex diagrams an accessible `title`/`desc`, and avoid using visual styling as the only source of meaning.
- Keep page data in arrays and map it only when repetition improves maintainability. Prefer explicit markup for one-off editorial narratives.
- Keep components focused. A large reusable or independently understandable SVG belongs in its own component.
- Do not add dependencies for layouts or interactions that can be implemented clearly with React and CSS already present.

## Design System

- Preserve the restrained editorial identity: warm neutral background, near-black text, subtle translucent rules, generous whitespace, and minimal decoration.
- Reuse CSS custom properties in `:root`: `--background`, `--text`, `--line`, `--muted`, spacing variables, and `--content-width`.
- Preserve font roles:
  - Tenor Sans: body copy and primary display text.
  - Belleza: eyebrows, section headings, and restrained editorial labels.
  - Poppins: selective technical/diagram emphasis.
- Maintain the shared header and shallow primary navigation. Do not add hidden or targeted projects to `navigation` or `projects` unless explicitly requested.
- Project pages should be designed arguments, not dumps of research notes. Follow the five movements in `docs/project-page-system.md`: orient, make the problem visible, show the key idea, make it concrete, establish fit and momentum.
- Aim for a 2–4 minute primary reading path, one dominant visual, and progressive disclosure of supporting technical detail.
- Use cards only for genuinely comparable, independent items. Do not give every section equal visual weight.
- Diagrams must answer one clear question, use a consistent reading direction, label information flow, expose trust/system boundaries, and remain usable on narrow screens. Prefer a separate accessible SVG component for complex architecture.
- Connect regulations to design consequences; do not use lists of regulations as decoration.
- Separate observed facts, inferences, proposals, and validated results. Never imply that a conceptual architecture or unbuilt prototype has measured outcomes.
- Any action with real processing time (an API/AI call, a server render, a file generation) must show a loading/buffering indicator while in flight. Use the shared `.spinner` class in `app/globals.css` (see its use in `app/job-agent/JobAgentTailor.tsx`) rather than inventing a new animation.

## Recurring Project-Page Pattern

- Begin with a concise thesis and intended value.
- Show a concrete current workflow before introducing architecture.
- Explain architecture decisions and their failure modes or tradeoffs, not only components.
- Keep accountable human review explicit in regulated AI workflows.
- Show how source identity, permissions, provenance, intended use, and auditability are established around the model.
- Connect capabilities to a causal value chain: architecture capability → workflow change → operational measure → business value.
- Express Winston's contribution through concrete outputs such as discovery maps, system designs, evaluation plans, validation evidence, and reusable playbooks.
- Close with a bounded next test and named acceptance measures rather than invented ROI.

## Commands and Verification

```bash
npm install       # install locked dependencies
npm run dev       # local Next.js development server
npm run build     # production build, TypeScript validation, and static generation
npm run start     # serve an existing production build
```

- There is currently no separate lint or test script. `npm run build` is the required verification for code or layout changes.
- Google fonts are fetched during builds; a network-restricted build may fail for font download even when application code is valid.
- Before committing, run `git diff --check` and inspect `git status` so local references or unrelated user files are not staged accidentally.

## Do Not Change Casually

- Professional claims, role descriptions, company names, regulatory statements, and measured outcomes require user confirmation or authoritative support.
- Do not expose unlisted project routes through navigation, project indexes, or search indexing without explicit approval. Unlisted pages should set `robots: { index: false, follow: false }`.
- Do not change the global font set, color tokens, header/navigation model, domain/deployment configuration, or core positioning as incidental cleanup.
- Do not turn Markdown research or files under `references/` into public routes automatically.
- Preserve unrelated working-tree changes. Stage and commit explicit paths when the worktree is mixed.
- Vercel production should track GitHub `main`. A redeploy rebuilds the deployment's original Git reference; use a new deployment from the desired branch/commit when the source reference is wrong.

## Job Application Agent (hidden)

A hidden, unlisted daily job-search assistant lives at `/job-agent` (excluded from `navigation`, `robots: noindex/nofollow`): `app/job-agent/page.tsx` (async server component, `dynamic = "force-dynamic"` - see below) renders `app/job-agent/JobAgentSections.tsx` (client component), three collapsible `<details>` sections - Opportunities (the sortable, paginated, multi-select table, in `app/job-agent/JobAgentTable.tsx`, default-sorted by fit score descending), Tracker (a read-only table, in `app/job-agent/JobAgentTracker.tsx`, rendering a `trackedEntries` prop computed server-side from hand-set ledger rows plus the live Blob status overlay), and Tailor My Profile (`app/job-agent/JobAgentTailor.tsx` - two complete stages for jobs sent from Opportunities: resume-tailoring suggestions plus a downloadable tailored PDF, and a second stage that scans the job's real application page via headless Chromium (`scripts/job-agent/application-scan.ts`, reusing the same `puppeteer-core`/`@sparticuz/chromium` dependency as the PDF route) to classify cover-letter acceptance and free-text questions via Claude (`POST /api/job-agent/tailor/scan`), then drafts answers to those questions (`scripts/job-agent/application-draft.ts`, `POST /api/job-agent/tailor/draft`) grounded in resume data and a voice profile - `content/voice-profile/{public-speaking,formal-professional,short-form-outreach}.ts`, three separate registers populated by hand over time, each falling back to a resume-derived tone while its `samples` array is still empty - plus "Mark Applied"/"Mark Passed" actions for those same jobs; requires a new `TAILOR_PASSPHRASE` env var). See `docs/job-agent.md` for the full page layout, interaction model, and Tailor My Profile's guardrail/architecture. Tracked companies, the title keyword pre-filter, structured resume data, and the scoring rubric each live in their own file under `content/job-agent-*` - see those files' own comments before editing. Boards are fetched from three ATS sources - Greenhouse, Lever, Ashby - dispatched by each board's `source` field in `content/job-agent-boards.ts`; each source's fetcher module (`scripts/job-agent/{greenhouse,lever,ashby}.ts`) normalizes its API response into the shared `NormalizedJob` shape (`scripts/job-agent/types.ts`) before the rest of the pipeline runs unchanged. The git-committed ledger is `content/job-agent-seen.json`, keyed by `<source>:<id>` (e.g. `"greenhouse:8122020"`) so ids can't collide across sources. The daily/on-demand GitHub Actions pipeline (`scripts/job-agent/run.ts`, dependency-injected logic in `scripts/job-agent/pipeline.ts`, scheduled by `.github/workflows/job-agent.yml`) makes **no LLM call and needs no secret**: it only fetches, filters, diffs against the ledger, and writes new matches with `status: "pending"` (structured `compensationRange` - currently only Lever's `salaryRange` - is recorded directly when the source provides it; `location` and `postedAt` are likewise read straight from the ATS). Scoring "pending" entries happens afterward, outside that automation, via one of two manual/local scripts: `npm run job-agent:apply-scores -- <path-to-json>` (default, free - merges a pre-computed `{ id, fitScore, fitRationale, compensationRange }` batch, e.g. from an assistant reasoning over postings directly; rejects any id not currently `"pending"`) or `npm run job-agent:score-via-api` (opt-in - calls Claude directly via `scripts/job-agent/scoring.ts`, using `ANTHROPIC_API_KEY` from the local environment, kept as a working demonstrable feature). Tests for all of the above run via `npm run job-agent:test`.

`applied`/`passed` status has two paths, never from arbitrary code: a captain hand-edit to `content/job-agent-seen.json` (permanent, part of git history), or clicking "Mark Applied"/"Mark Passed" in Tailor My Profile, which calls `POST /api/job-agent/tailor/status` (passphrase-gated like the other Tailor routes) to write a small live status overlay in Vercel Blob (`scripts/job-agent/tracker-overlay.ts`) - one JSON document at `job-agent/tracker-overlay.json` in the `job-agent-tracker` store, keyed the same way as the ledger. That store uses a custom env var prefix, so every Blob SDK call passes `token: process.env.JOB_AGENT_TRACKER_READ_WRITE_TOKEN` explicitly (not the SDK's default `BLOB_READ_WRITE_TOKEN`). The overlay never touches git and is merged with the ledger only at render time (`mergeTrackerEntries()` in `page.tsx`) - this is why `/job-agent` had to become dynamic (`force-dynamic`) instead of statically generated: Tracker's data now includes a request-time Blob read. See `docs/job-agent.md`'s "Live status overlay" section for the full rationale (why a snapshot instead of a ledger-resolved read, why one document instead of one blob per job, the static-generation tradeoff, and the graceful-read/strict-write failure split).

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.

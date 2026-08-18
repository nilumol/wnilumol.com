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
  - Poppins: logo and selective technical/diagram emphasis.
- Maintain the shared header and shallow primary navigation. Do not add hidden or targeted projects to `navigation` or `projects` unless explicitly requested.
- Project pages should be designed arguments, not dumps of research notes. Follow the five movements in `docs/project-page-system.md`: orient, make the problem visible, show the key idea, make it concrete, establish fit and momentum.
- Aim for a 2–4 minute primary reading path, one dominant visual, and progressive disclosure of supporting technical detail.
- Use cards only for genuinely comparable, independent items. Do not give every section equal visual weight.
- Diagrams must answer one clear question, use a consistent reading direction, label information flow, expose trust/system boundaries, and remain usable on narrow screens. Prefer a separate accessible SVG component for complex architecture.
- Connect regulations to design consequences; do not use lists of regulations as decoration.
- Separate observed facts, inferences, proposals, and validated results. Never imply that a conceptual architecture or unbuilt prototype has measured outcomes.

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

## Job Scout (hidden)

A hidden, unlisted daily job-search assistant lives at `/job-scout` (excluded from `navigation`, `robots: noindex/nofollow`), rendered as a flat table sorted by fit score. Tracked companies, the title keyword pre-filter, structured resume data, and the scoring rubric each live in their own file under `content/job-scout-*` - see those files' own comments before editing. The git-committed ledger is `content/job-scout-seen.json` (one Claude scoring call per job also extracts a nullable `compensationRange` from the posting content; `location` is read directly from Greenhouse, no LLM involved). The daily script is `scripts/job-scout/run.ts` (dependency-injected pipeline logic in `scripts/job-scout/pipeline.ts`, tests via `npm run job-scout:test`), scheduled by `.github/workflows/job-scout.yml`, and requires an `ANTHROPIC_API_KEY` repository secret. `applied`/`passed` ledger statuses are captain-set only - set them by hand-editing `content/job-scout-seen.json`, never from code.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { JobScoutBoard } from "../../content/job-scout-boards.ts";
import { matchJobScoutKeywordFamily } from "../../content/job-scout-keywords.ts";
import { resumeData } from "../../content/resume-data.ts";
import { fetchAshbyBoardJobs } from "./ashby.ts";
import { filterCandidateJobs } from "./filter.ts";
import type { GreenhouseBoardFetchResult } from "./greenhouse.ts";
import { htmlToPlainText } from "./html.ts";
import { expireMissingEntries, hasLedgerEntry, loadLedger, saveLedger } from "./ledger.ts";
import { fetchLeverBoardJobs } from "./lever.ts";
import { cleanLocationName } from "./location.ts";
import { runJobScoutPipeline } from "./pipeline.ts";
import { buildScoringPrompt, STRONG_FIT_CUTOFF } from "./scoring.ts";
import type { CandidateJob, FitScoreResult, GreenhouseJob, JobScoutLedger } from "./types.ts";

// ---------------------------------------------------------------------------
// Keyword pre-filter (section 3)
// ---------------------------------------------------------------------------

test("matchJobScoutKeywordFamily matches the five target families case-insensitively", () => {
  assert.equal(matchJobScoutKeywordFamily("Senior solutions consultant"), "Solutions Consultant");
  assert.equal(matchJobScoutKeywordFamily("SOLUTIONS ARCHITECT II"), "Solutions Architect");
  assert.equal(matchJobScoutKeywordFamily("Customer Success Manager, EMEA"), "Customer Success Manager");
  assert.equal(matchJobScoutKeywordFamily("Sales Engineer - Public Sector"), "Sales Engineer");
});

test("matchJobScoutKeywordFamily matches Implementation Manager abbreviation variants", () => {
  for (const title of [
    "Implementation Manager",
    "Implementation Mgr",
    "Sr. Implementation Manager",
    "Senior Implementation Manager",
    "Sr Implementations Manager",
  ]) {
    assert.equal(matchJobScoutKeywordFamily(title), "Implementation Manager", `expected match for "${title}"`);
  }
});

test("matchJobScoutKeywordFamily returns null for unrelated titles", () => {
  assert.equal(matchJobScoutKeywordFamily("Software Engineer II"), null);
  assert.equal(matchJobScoutKeywordFamily("Staff Accountant"), null);
});

test("htmlToPlainText strips tags and decodes common entities", () => {
  const html = "<p>We build tools &amp; platforms.</p><ul><li>Item one</li><li>Item two</li></ul>";
  const text = htmlToPlainText(html);
  assert.ok(text.includes("We build tools & platforms."));
  assert.ok(text.includes("Item one"));
  assert.ok(text.includes("Item two"));
  assert.ok(!text.includes("<"));
});

// ---------------------------------------------------------------------------
// Location cleanup
// ---------------------------------------------------------------------------

test("cleanLocationName strips stray leading/trailing dashes and whitespace", () => {
  assert.equal(cleanLocationName("-REMOTE, USA-"), "REMOTE, USA");
  assert.equal(cleanLocationName("- Bellevue, WA -"), "Bellevue, WA");
  assert.equal(cleanLocationName("San Francisco, CA"), "San Francisco, CA");
});

test("cleanLocationName returns null for missing or empty input", () => {
  assert.equal(cleanLocationName(undefined), null);
  assert.equal(cleanLocationName(null), null);
  assert.equal(cleanLocationName("   "), null);
  assert.equal(cleanLocationName("-"), null);
});

function fixtureJob(overrides: Partial<GreenhouseJob> & { id: number; title: string }): GreenhouseJob {
  return {
    absolute_url: `https://job-boards.greenhouse.io/acme/jobs/${overrides.id}`,
    content: "<p>Job description.</p>",
    requisition_id: null,
    updated_at: "2026-08-01T00:00:00-07:00",
    ...overrides,
  };
}

test("filterCandidateJobs keeps only keyword-matching jobs and tags company + family + source", () => {
  const board: JobScoutBoard = { token: "acme", label: "Acme", source: "greenhouse" };
  const jobs = [
    fixtureJob({ id: 1, title: "Solutions Consultant" }),
    fixtureJob({ id: 2, title: "Backend Engineer" }),
  ];
  const candidates = filterCandidateJobs(board, jobs);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0]!.job.id, 1);
  assert.equal(candidates[0]!.company, "Acme");
  assert.equal(candidates[0]!.keywordFamily, "Solutions Consultant");
  assert.equal(candidates[0]!.source, "greenhouse");
});

// ---------------------------------------------------------------------------
// Lever and Ashby fetcher normalization (section 3/4/5) - fixture responses over a mocked
// global fetch, so this proves the parsing without hitting the network or needing an API key.
// ---------------------------------------------------------------------------

async function withMockedFetch<T>(response: unknown, status: number, run: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(response), { status, headers: { "content-type": "application/json" } })) as typeof fetch;
  try {
    return await run();
  } finally {
    globalThis.fetch = original;
  }
}

test("fetchLeverBoardJobs normalizes a posting with a structured salaryRange", async () => {
  const board: JobScoutBoard = { token: "ethena", label: "Ethena", source: "lever" };
  const fixture = [
    {
      id: "64085e15-d6a0-4918-bad8-4064c251a50f",
      text: "Senior Solutions Consultant",
      hostedUrl: "https://jobs.lever.co/ethena/64085e15",
      description: "<p>Own the technical sale.</p>",
      descriptionPlain: "Own the technical sale.",
      categories: { location: "Remote - US" },
      createdAt: 1732032000000,
      salaryRange: { min: 140000, max: 300000, currency: "USD", interval: "year" },
    },
  ];

  const result = await withMockedFetch(fixture, 200, () => fetchLeverBoardJobs(board));

  assert.equal(result.found, true);
  assert.equal(result.jobs.length, 1);
  const job = result.jobs[0]!;
  assert.equal(job.id, "64085e15-d6a0-4918-bad8-4064c251a50f");
  assert.equal(job.title, "Senior Solutions Consultant");
  assert.equal(job.absolute_url, "https://jobs.lever.co/ethena/64085e15");
  assert.equal(job.content, "<p>Own the technical sale.</p>");
  assert.equal(job.location?.name, "Remote - US");
  assert.equal(job.postedAt, new Date(1732032000000).toISOString());
  assert.equal(job.structuredCompensationRange, "$140K-$300K");
});

test("fetchLeverBoardJobs falls back to null structuredCompensationRange when salaryRange is absent", async () => {
  const board: JobScoutBoard = { token: "veeva", label: "Veeva", source: "lever" };
  const fixture = [
    {
      id: "abc123",
      text: "Solutions Architect",
      hostedUrl: "https://jobs.lever.co/veeva/abc123",
      descriptionPlain: "Plain description only.",
      createdAt: 1732032000000,
    },
  ];

  const result = await withMockedFetch(fixture, 200, () => fetchLeverBoardJobs(board));

  const job = result.jobs[0]!;
  assert.equal(job.content, "Plain description only."); // falls back to descriptionPlain
  assert.equal(job.structuredCompensationRange, null);
  assert.equal(job.location, undefined); // no categories.location in this fixture
});

test("fetchLeverBoardJobs treats a 404 as board-not-found rather than throwing", async () => {
  const board: JobScoutBoard = { token: "unknown-co", label: "Unknown Co", source: "lever" };
  const result = await withMockedFetch({}, 404, () => fetchLeverBoardJobs(board));
  assert.equal(result.found, false);
  assert.deepEqual(result.jobs, []);
});

test("fetchAshbyBoardJobs normalizes a job and always falls back to null structured compensation", async () => {
  const board: JobScoutBoard = { token: "notion", label: "Notion", source: "ashby" };
  const fixture = {
    jobs: [
      {
        id: "9f5e2c1a-0000-4444-8888-abcdefabcdef",
        title: "Solutions Engineer",
        location: "San Francisco, CA",
        jobUrl: "https://jobs.ashbyhq.com/notion/9f5e2c1a",
        applyUrl: "https://jobs.ashbyhq.com/notion/9f5e2c1a/application",
        descriptionHtml: "<p>Partner with sales on technical evaluations.</p>",
        descriptionPlain: "Partner with sales on technical evaluations.",
        publishedAt: "2026-08-01T12:00:00.000Z",
      },
    ],
  };

  const result = await withMockedFetch(fixture, 200, () => fetchAshbyBoardJobs(board));

  assert.equal(result.found, true);
  const job = result.jobs[0]!;
  assert.equal(job.id, "9f5e2c1a-0000-4444-8888-abcdefabcdef");
  assert.equal(job.title, "Solutions Engineer");
  assert.equal(job.absolute_url, "https://jobs.ashbyhq.com/notion/9f5e2c1a");
  assert.equal(job.content, "<p>Partner with sales on technical evaluations.</p>");
  assert.equal(job.location?.name, "San Francisco, CA");
  assert.equal(job.postedAt, "2026-08-01T12:00:00.000Z");
  assert.equal(job.structuredCompensationRange, null);
});

test("fetchAshbyBoardJobs treats a 404 as board-not-found rather than throwing", async () => {
  const board: JobScoutBoard = { token: "unknown-co", label: "Unknown Co", source: "ashby" };
  const result = await withMockedFetch({}, 404, () => fetchAshbyBoardJobs(board));
  assert.equal(result.found, false);
  assert.deepEqual(result.jobs, []);
});

// ---------------------------------------------------------------------------
// Ledger diff logic (section 4/6): new vs. already-seen vs. expired, keyed by <source>:<id>
// ---------------------------------------------------------------------------

test("expireMissingEntries expires missing scored entries but preserves captain-set statuses, scoped to the board's company+source", () => {
  const acme: JobScoutBoard = { token: "acme", label: "Acme", source: "greenhouse" };
  const ledger: JobScoutLedger = {
    "greenhouse:10": makeEntry({ id: 10, company: "Acme", source: "greenhouse", status: "scored" }),
    "greenhouse:11": makeEntry({ id: 11, company: "Acme", source: "greenhouse", status: "applied" }),
    "greenhouse:12": makeEntry({ id: 12, company: "Acme", source: "greenhouse", status: "passed" }),
    "greenhouse:13": makeEntry({ id: 13, company: "Acme", source: "greenhouse", status: "expired" }),
    "greenhouse:14": makeEntry({ id: 14, company: "Other Co", source: "greenhouse", status: "scored" }),
    // Same company label, different source - must not be touched by the Greenhouse board's expiry.
    "lever:15": makeEntry({ id: "15", company: "Acme", source: "lever", status: "scored" }),
  };
  // Only id 14 is still present in the fresh fetch; everything else for "Acme"/greenhouse is missing.
  const expiredCount = expireMissingEntries(ledger, acme, new Set([]));

  assert.equal(expiredCount, 1); // only id 10 transitions (13 was already expired, doesn't recount)
  assert.equal(ledger["greenhouse:10"]!.status, "expired");
  assert.equal(ledger["greenhouse:11"]!.status, "applied");
  assert.equal(ledger["greenhouse:12"]!.status, "passed");
  assert.equal(ledger["greenhouse:13"]!.status, "expired");
  assert.equal(ledger["greenhouse:14"]!.status, "scored"); // different company, untouched
  assert.equal(ledger["lever:15"]!.status, "scored"); // same company, different source, untouched
});

test("ledger save/load round-trips and always writes sorted by key, numeric-aware within a source", () => {
  const dir = mkdtempSync(join(tmpdir(), "job-scout-ledger-"));
  const path = join(dir, "ledger.json");
  const ledger: JobScoutLedger = {
    "greenhouse:300": makeEntry({ id: 300, company: "Acme", source: "greenhouse", status: "scored" }),
    "greenhouse:100": makeEntry({ id: 100, company: "Acme", source: "greenhouse", status: "scored" }),
    "lever:abc": makeEntry({ id: "abc", company: "Ethena", source: "lever", status: "scored" }),
    "greenhouse:200": makeEntry({ id: 200, company: "Acme", source: "greenhouse", status: "scored" }),
  };

  saveLedger(path, ledger);
  const raw = readFileSync(path, "utf-8");
  const keysInFile = Object.keys(JSON.parse(raw) as JobScoutLedger);
  assert.deepEqual(keysInFile, ["greenhouse:100", "greenhouse:200", "greenhouse:300", "lever:abc"]);

  const reloaded = loadLedger(path);
  assert.equal(Object.keys(reloaded).length, 4);
  assert.equal(hasLedgerEntry(reloaded, "greenhouse", 200), true);
  assert.equal(hasLedgerEntry(reloaded, "greenhouse", 999), false);
  assert.equal(hasLedgerEntry(reloaded, "lever", "abc"), true);

  rmSync(dir, { recursive: true, force: true });
});

test("loadLedger returns an empty object when the file doesn't exist", () => {
  const missingPath = join(mkdtempSync(join(tmpdir(), "job-scout-missing-")), "does-not-exist.json");
  assert.deepEqual(loadLedger(missingPath), {});
});

function makeEntry(partial: {
  id: number | string;
  company: string;
  source: "greenhouse" | "lever" | "ashby";
  status: "scored" | "applied" | "passed" | "expired";
}) {
  return {
    id: partial.id,
    source: partial.source,
    company: partial.company,
    title: "Some Role",
    keywordFamily: "Solutions Consultant",
    absoluteUrl: `https://example.com/jobs/${partial.id}`,
    firstSeen: "2026-08-17T00:00:00.000Z",
    status: partial.status,
    fitScore: 6,
    fitRationale: "Fixture entry.",
    location: null,
    compensationRange: null,
  };
}

// ---------------------------------------------------------------------------
// Prompt assembly (section 5) - pure, no network
// ---------------------------------------------------------------------------

test("buildScoringPrompt includes the rubric verbatim, the resume, and the job posting", () => {
  const candidate: CandidateJob = {
    job: fixtureJob({ id: 42, title: "Solutions Consultant", content: "<p>Own the technical sale.</p>" }),
    company: "Acme",
    keywordFamily: "Solutions Consultant",
    source: "greenhouse",
  };
  const rubric = "# Fixture rubric\n\nWeigh biopharma domain experience heavily.";
  const prompt = buildScoringPrompt(candidate, resumeData, rubric);

  assert.ok(prompt.includes("Fixture rubric"));
  assert.ok(prompt.includes(resumeData.headline));
  assert.ok(prompt.includes("Solutions Consultant"));
  assert.ok(prompt.includes("Own the technical sale."));
  assert.ok(prompt.includes(candidate.job.absolute_url));
});

// ---------------------------------------------------------------------------
// End-to-end pipeline dry run (sections 3-6 wired together) with a mocked scorer -
// this is the "does not require a live Anthropic API key" coverage.
// ---------------------------------------------------------------------------

test("runJobScoutPipeline: filters, skips already-seen, scores new jobs, expires missing ones, and never calls the mocked scorer for skipped/expired jobs", async () => {
  const acme: JobScoutBoard = { token: "acme", label: "Acme", source: "greenhouse" };
  const ghost: JobScoutBoard = { token: "ghost", label: "Ghost Co", source: "greenhouse" };

  const freshAcmeJobs: GreenhouseJob[] = [
    fixtureJob({ id: 100, title: "Solutions Consultant", location: { name: "-REMOTE, USA-" } }), // new candidate, will score below cutoff
    fixtureJob({ id: 101, title: "Backend Engineer" }), // filtered out by keywords, never touches ledger
    fixtureJob({ id: 102, title: "Sr Implementations Manager" }), // already ledgered -> must not be rescored
    fixtureJob({ id: 107, title: "Customer Success Manager" }), // new candidate, will score at/above cutoff, no stated pay
  ];

  const fetchGreenhouse = async (board: JobScoutBoard): Promise<GreenhouseBoardFetchResult> => {
    if (board.token === "acme") return { board, found: true, jobs: freshAcmeJobs };
    if (board.token === "ghost") return { board, found: false, jobs: [] }; // simulates a 404
    throw new Error(`unexpected board in test: ${board.token}`);
  };
  const fetchLever = async (): Promise<never> => {
    throw new Error("lever fetcher should not be called for greenhouse-only boards");
  };
  const fetchAshby = fetchLever;

  const ledger: JobScoutLedger = {
    "greenhouse:102": makeEntry({ id: 102, company: "Acme", source: "greenhouse", status: "scored" }), // still present -> untouched, not rescored
    "greenhouse:103": makeEntry({ id: 103, company: "Acme", source: "greenhouse", status: "scored" }), // missing from fresh fetch -> expires
    "greenhouse:104": makeEntry({ id: 104, company: "Acme", source: "greenhouse", status: "applied" }), // missing, captain-set -> preserved
    "greenhouse:105": makeEntry({ id: 105, company: "Acme", source: "greenhouse", status: "passed" }), // missing, captain-set -> preserved
    "greenhouse:200": makeEntry({ id: 200, company: "Ghost Co", source: "greenhouse", status: "scored" }), // board 404'd -> must not be touched
  };

  const scoreCalls: number[] = [];
  const scoreJob = async (candidate: CandidateJob): Promise<FitScoreResult> => {
    scoreCalls.push(candidate.job.id as number);
    if (candidate.job.id === 100) {
      return { score: 5, rationale: "Partial domain overlap.", compensationRange: "$85K-$115K" };
    }
    return { score: 9, rationale: "Strong role and domain match.", compensationRange: null };
  };

  const result = await runJobScoutPipeline([acme, ghost], ledger, {
    fetchers: { greenhouse: fetchGreenhouse, lever: fetchLever, ashby: fetchAshby },
    scoreJob,
    log: () => {},
  });

  // Only the two genuinely new, keyword-matching jobs were scored.
  assert.deepEqual(scoreCalls.sort(), [100, 107]);
  assert.equal(result.scoredCount, 2);

  // Ledger entries reflect the mocked scoring, including the new location/compensation fields,
  // written under the migrated <source>:<id> key.
  assert.equal(ledger["greenhouse:100"]!.status, "scored");
  assert.equal(ledger["greenhouse:100"]!.source, "greenhouse");
  assert.equal(ledger["greenhouse:100"]!.fitScore, 5);
  assert.equal(ledger["greenhouse:100"]!.keywordFamily, "Solutions Consultant");
  assert.equal(ledger["greenhouse:100"]!.location, "REMOTE, USA"); // dash-stripped from "-REMOTE, USA-"
  assert.equal(ledger["greenhouse:100"]!.compensationRange, "$85K-$115K"); // LLM-extracted, no structured value available
  assert.ok(ledger["greenhouse:100"]!.fitScore < STRONG_FIT_CUTOFF);

  assert.equal(ledger["greenhouse:107"]!.status, "scored");
  assert.equal(ledger["greenhouse:107"]!.fitScore, 9);
  assert.equal(ledger["greenhouse:107"]!.keywordFamily, "Customer Success Manager");
  assert.equal(ledger["greenhouse:107"]!.location, null); // fixture job has no location field at all
  assert.equal(ledger["greenhouse:107"]!.compensationRange, null); // no pay range stated

  // Job 101 never matched the keyword filter and never touched the ledger.
  assert.equal(hasLedgerEntry(ledger, "greenhouse", 101), false);

  // Already-seen job was left exactly as-is (not rescored).
  assert.equal(ledger["greenhouse:102"]!.status, "scored");

  // Missing-from-fetch entries: only the plain "scored" one expires.
  assert.equal(ledger["greenhouse:103"]!.status, "expired");
  assert.equal(ledger["greenhouse:104"]!.status, "applied");
  assert.equal(ledger["greenhouse:105"]!.status, "passed");
  assert.equal(result.expiredCount, 1);

  // The 404'd board's own ledger entries are left untouched, and the board is reported skipped.
  assert.equal(ledger["greenhouse:200"]!.status, "scored");
  assert.deepEqual(result.skippedBoardTokens, ["ghost"]);
});

test("runJobScoutPipeline: routes Lever/Ashby boards to their own fetchers, uses structured compensation when available, and stamps postedAt", async () => {
  const ethena: JobScoutBoard = { token: "ethena", label: "Ethena", source: "lever" };
  const notion: JobScoutBoard = { token: "notion", label: "Notion", source: "ashby" };

  const fetchGreenhouse = async (): Promise<never> => {
    throw new Error("greenhouse fetcher should not be called for lever/ashby boards");
  };
  const fetchLever = async (board: JobScoutBoard) => ({
    board,
    found: true,
    jobs: [
      {
        id: "lever-uuid-1",
        title: "Solutions Consultant",
        absolute_url: "https://jobs.lever.co/ethena/lever-uuid-1",
        content: "<p>Own the technical sale.</p>",
        location: { name: "Remote - US" },
        postedAt: "2026-07-01T00:00:00.000Z",
        structuredCompensationRange: "$140K-$300K",
      },
    ],
  });
  const fetchAshby = async (board: JobScoutBoard) => ({
    board,
    found: true,
    jobs: [
      {
        id: "ashby-uuid-1",
        title: "Sales Engineer",
        absolute_url: "https://jobs.ashbyhq.com/notion/ashby-uuid-1",
        content: "<p>Partner with sales.</p>",
        location: { name: "San Francisco, CA" },
        postedAt: "2026-07-15T00:00:00.000Z",
        structuredCompensationRange: null,
      },
    ],
  });

  const ledger: JobScoutLedger = {};
  const scoreJob = async (): Promise<FitScoreResult> => ({
    score: 8,
    rationale: "Strong match.",
    compensationRange: "$90K-$120K", // should be ignored for the Lever job since it has a structured value
  });

  const result = await runJobScoutPipeline([ethena, notion], ledger, {
    fetchers: { greenhouse: fetchGreenhouse, lever: fetchLever, ashby: fetchAshby },
    scoreJob,
    log: () => {},
  });

  assert.equal(result.scoredCount, 2);

  const leverEntry = ledger["lever:lever-uuid-1"]!;
  assert.equal(leverEntry.source, "lever");
  assert.equal(leverEntry.company, "Ethena");
  assert.equal(leverEntry.compensationRange, "$140K-$300K"); // structured value wins over the LLM's guess
  assert.equal(leverEntry.postedAt, "2026-07-01T00:00:00.000Z");

  const ashbyEntry = ledger["ashby:ashby-uuid-1"]!;
  assert.equal(ashbyEntry.source, "ashby");
  assert.equal(ashbyEntry.company, "Notion");
  assert.equal(ashbyEntry.compensationRange, "$90K-$120K"); // no structured value -> falls back to the LLM's extraction
  assert.equal(ashbyEntry.postedAt, "2026-07-15T00:00:00.000Z");
});

test("runJobScoutPipeline: maps Greenhouse's first_published into the ledger's postedAt field", async () => {
  const acme: JobScoutBoard = { token: "acme", label: "Acme", source: "greenhouse" };
  const jobs: GreenhouseJob[] = [
    fixtureJob({ id: 500, title: "Solutions Consultant", first_published: "2026-06-01T00:00:00-07:00" }),
  ];
  const fetchGreenhouse = async (board: JobScoutBoard): Promise<GreenhouseBoardFetchResult> => ({
    board,
    found: true,
    jobs,
  });
  const fetchLever = async (): Promise<never> => {
    throw new Error("not called");
  };

  const ledger: JobScoutLedger = {};
  const result = await runJobScoutPipeline([acme], ledger, {
    fetchers: { greenhouse: fetchGreenhouse, lever: fetchLever, ashby: fetchLever },
    scoreJob: async () => ({ score: 7, rationale: "Good match.", compensationRange: null }),
    log: () => {},
  });

  assert.equal(result.scoredCount, 1);
  assert.equal(ledger["greenhouse:500"]!.postedAt, "2026-06-01T00:00:00-07:00");
});

test("runJobScoutPipeline: mutates the ledger in place as it goes, so entries scored before a mid-run failure survive the rejection", async () => {
  const acme: JobScoutBoard = { token: "acme", label: "Acme", source: "greenhouse" };

  const freshAcmeJobs: GreenhouseJob[] = [
    fixtureJob({ id: 100, title: "Solutions Consultant" }), // scores fine
    fixtureJob({ id: 101, title: "Solutions Architect" }), // scorer throws on this one
  ];

  const fetchGreenhouse = async (board: JobScoutBoard): Promise<GreenhouseBoardFetchResult> => {
    if (board.token === "acme") return { board, found: true, jobs: freshAcmeJobs };
    throw new Error(`unexpected board in test: ${board.token}`);
  };
  const fetchLever = async (): Promise<never> => {
    throw new Error("not called");
  };

  const ledger: JobScoutLedger = {
    "greenhouse:103": makeEntry({ id: 103, company: "Acme", source: "greenhouse", status: "scored" }), // missing from fresh fetch -> should still expire
  };

  const scoreJob = async (candidate: CandidateJob): Promise<FitScoreResult> => {
    if (candidate.job.id === 101) {
      throw new Error("simulated Anthropic API failure mid-run");
    }
    return { score: 9, rationale: "Strong match.", compensationRange: null };
  };

  await assert.rejects(
    () =>
      runJobScoutPipeline([acme], ledger, {
        fetchers: { greenhouse: fetchGreenhouse, lever: fetchLever, ashby: fetchLever },
        scoreJob,
        log: () => {},
      }),
    /simulated Anthropic API failure mid-run/,
  );

  // The job scored before the throw was already upserted into the (in-place mutated) ledger object,
  // so a caller that persists `ledger` from a `finally` block (as scripts/job-scout/run.ts does)
  // does not lose it, even though the pipeline call itself rejected.
  assert.equal(ledger["greenhouse:100"]!.status, "scored");
  assert.equal(ledger["greenhouse:100"]!.fitScore, 9);

  // Expiry (which happens before scoring) is also preserved.
  assert.equal(ledger["greenhouse:103"]!.status, "expired");

  // The job that failed to score was never written to the ledger.
  assert.equal(hasLedgerEntry(ledger, "greenhouse", 101), false);
});

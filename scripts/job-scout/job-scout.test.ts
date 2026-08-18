import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { JobScoutBoard } from "../../content/job-scout-boards.ts";
import { matchJobScoutKeywordFamily } from "../../content/job-scout-keywords.ts";
import { resumeData } from "../../content/resume-data.ts";
import { applyScoresToLedger, parseScoreBatch } from "./apply-scores.ts";
import { fetchAshbyBoardJobs } from "./ashby.ts";
import { filterCandidateJobs } from "./filter.ts";
import type { GreenhouseBoardFetchResult } from "./greenhouse.ts";
import { htmlToPlainText } from "./html.ts";
import { expireMissingEntries, hasLedgerEntry, loadLedger, saveLedger } from "./ledger.ts";
import { fetchLeverBoardJobs } from "./lever.ts";
import { cleanLocationName } from "./location.ts";
import { runJobScoutPipeline } from "./pipeline.ts";
import { buildScoringPrompt } from "./scoring.ts";
import type { CandidateJob, GreenhouseJob, JobScoutLedger, JobScoutStatus, JobScoutSource } from "./types.ts";

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
  source: JobScoutSource;
  status: JobScoutStatus;
  compensationRange?: string | null;
}) {
  const base = {
    id: partial.id,
    source: partial.source,
    company: partial.company,
    title: "Some Role",
    keywordFamily: "Solutions Consultant",
    absoluteUrl: `https://example.com/jobs/${partial.id}`,
    firstSeen: "2026-08-17T00:00:00.000Z",
    status: partial.status,
    location: null,
    compensationRange: partial.compensationRange ?? null,
  };
  if (partial.status === "pending") return base;
  return { ...base, fitScore: 6, fitRationale: "Fixture entry." };
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
// End-to-end pipeline dry run (sections 3-6 wired together) - no LLM call anywhere in this
// path; new candidates land as "pending" and are scored later via apply-scores.ts.
// ---------------------------------------------------------------------------

test("runJobScoutPipeline: filters, skips already-seen, adds new candidates as pending, expires missing ones", async () => {
  const acme: JobScoutBoard = { token: "acme", label: "Acme", source: "greenhouse" };
  const ghost: JobScoutBoard = { token: "ghost", label: "Ghost Co", source: "greenhouse" };

  const freshAcmeJobs: GreenhouseJob[] = [
    fixtureJob({ id: 100, title: "Solutions Consultant", location: { name: "-REMOTE, USA-" } }), // new candidate
    fixtureJob({ id: 101, title: "Backend Engineer" }), // filtered out by keywords, never touches ledger
    fixtureJob({ id: 102, title: "Sr Implementations Manager" }), // already ledgered -> must not be re-added
    fixtureJob({ id: 107, title: "Customer Success Manager" }), // new candidate, no location/pay data
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
    "greenhouse:102": makeEntry({ id: 102, company: "Acme", source: "greenhouse", status: "scored" }), // still present -> untouched
    "greenhouse:103": makeEntry({ id: 103, company: "Acme", source: "greenhouse", status: "scored" }), // missing from fresh fetch -> expires
    "greenhouse:104": makeEntry({ id: 104, company: "Acme", source: "greenhouse", status: "applied" }), // missing, captain-set -> preserved
    "greenhouse:105": makeEntry({ id: 105, company: "Acme", source: "greenhouse", status: "passed" }), // missing, captain-set -> preserved
    "greenhouse:200": makeEntry({ id: 200, company: "Ghost Co", source: "greenhouse", status: "scored" }), // board 404'd -> must not be touched
  };

  const result = await runJobScoutPipeline([acme, ghost], ledger, {
    fetchers: { greenhouse: fetchGreenhouse, lever: fetchLever, ashby: fetchAshby },
    log: () => {},
  });

  // Only the two genuinely new, keyword-matching jobs were added.
  assert.equal(result.addedCount, 2);

  // New entries land as "pending" with no fit score yet, written under the <source>:<id> key.
  assert.equal(ledger["greenhouse:100"]!.status, "pending");
  assert.equal(ledger["greenhouse:100"]!.source, "greenhouse");
  assert.equal(ledger["greenhouse:100"]!.fitScore, undefined);
  assert.equal(ledger["greenhouse:100"]!.keywordFamily, "Solutions Consultant");
  assert.equal(ledger["greenhouse:100"]!.location, "REMOTE, USA"); // dash-stripped from "-REMOTE, USA-"
  assert.equal(ledger["greenhouse:100"]!.compensationRange, null); // no structured value available, no LLM to extract one

  assert.equal(ledger["greenhouse:107"]!.status, "pending");
  assert.equal(ledger["greenhouse:107"]!.fitScore, undefined);
  assert.equal(ledger["greenhouse:107"]!.keywordFamily, "Customer Success Manager");
  assert.equal(ledger["greenhouse:107"]!.location, null); // fixture job has no location field at all

  // Job 101 never matched the keyword filter and never touched the ledger.
  assert.equal(hasLedgerEntry(ledger, "greenhouse", 101), false);

  // Already-seen job was left exactly as-is.
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

  const result = await runJobScoutPipeline([ethena, notion], ledger, {
    fetchers: { greenhouse: fetchGreenhouse, lever: fetchLever, ashby: fetchAshby },
    log: () => {},
  });

  assert.equal(result.addedCount, 2);

  const leverEntry = ledger["lever:lever-uuid-1"]!;
  assert.equal(leverEntry.status, "pending");
  assert.equal(leverEntry.source, "lever");
  assert.equal(leverEntry.company, "Ethena");
  assert.equal(leverEntry.compensationRange, "$140K-$300K"); // structured value used directly, no LLM involved
  assert.equal(leverEntry.postedAt, "2026-07-01T00:00:00.000Z");

  const ashbyEntry = ledger["ashby:ashby-uuid-1"]!;
  assert.equal(ashbyEntry.status, "pending");
  assert.equal(ashbyEntry.source, "ashby");
  assert.equal(ashbyEntry.company, "Notion");
  assert.equal(ashbyEntry.compensationRange, null); // no structured value -> stays null until scored later
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
    log: () => {},
  });

  assert.equal(result.addedCount, 1);
  assert.equal(ledger["greenhouse:500"]!.postedAt, "2026-06-01T00:00:00-07:00");
});

// ---------------------------------------------------------------------------
// apply-scores.ts: the standalone tool that merges a batch of externally-computed scores
// (from a human or an assistant reasoning over postings directly - not a paid API call from
// this repo's automation) into "pending" ledger entries.
// ---------------------------------------------------------------------------

test("parseScoreBatch accepts a well-formed batch and rejects malformed input", () => {
  const batch = parseScoreBatch(
    JSON.stringify([{ id: "greenhouse:100", fitScore: 8, fitRationale: "Strong match.", compensationRange: null }]),
  );
  assert.equal(batch.length, 1);
  assert.equal(batch[0]!.id, "greenhouse:100");

  assert.throws(() => parseScoreBatch("not json"), /not valid JSON/);
  assert.throws(() => parseScoreBatch(JSON.stringify({ id: "greenhouse:100" })), /must be a JSON array/);
  assert.throws(
    () => parseScoreBatch(JSON.stringify([{ id: "greenhouse:100", fitScore: "8" }])),
    /entry at index 0 is malformed/,
  );
});

test("applyScoresToLedger scores a pending entry matching the batch id", () => {
  const ledger: JobScoutLedger = {
    "greenhouse:100": makeEntry({ id: 100, company: "Acme", source: "greenhouse", status: "pending" }),
  };

  applyScoresToLedger(ledger, [
    { id: "greenhouse:100", fitScore: 8, fitRationale: "Strong domain match.", compensationRange: "$120K-$150K" },
  ]);

  const entry = ledger["greenhouse:100"]!;
  assert.equal(entry.status, "scored");
  assert.equal(entry.fitScore, 8);
  assert.equal(entry.fitRationale, "Strong domain match.");
  assert.equal(entry.compensationRange, "$120K-$150K");
});

test("applyScoresToLedger rejects an id that isn't pending, and leaves it and the rest of the ledger untouched", () => {
  const ledger: JobScoutLedger = {
    "greenhouse:100": makeEntry({ id: 100, company: "Acme", source: "greenhouse", status: "pending" }),
    "greenhouse:200": makeEntry({ id: 200, company: "Acme", source: "greenhouse", status: "scored" }),
  };

  assert.throws(
    () =>
      applyScoresToLedger(ledger, [
        { id: "greenhouse:100", fitScore: 8, fitRationale: "Strong match.", compensationRange: null },
        { id: "greenhouse:200", fitScore: 9, fitRationale: "Should not apply.", compensationRange: null },
      ]),
    /"greenhouse:200" is not "pending"/,
  );

  // Validation runs before any mutation, so even the otherwise-valid pending entry in the same
  // batch is left untouched - a bad batch can't partially corrupt the ledger.
  assert.equal(ledger["greenhouse:100"]!.status, "pending");
  assert.equal(ledger["greenhouse:100"]!.fitScore, undefined);
  assert.equal(ledger["greenhouse:200"]!.status, "scored");
  assert.equal(ledger["greenhouse:200"]!.fitScore, 6); // untouched fixture default
});

test("applyScoresToLedger rejects an id that isn't in the ledger at all", () => {
  const ledger: JobScoutLedger = {
    "greenhouse:100": makeEntry({ id: 100, company: "Acme", source: "greenhouse", status: "pending" }),
  };

  assert.throws(
    () =>
      applyScoresToLedger(ledger, [
        { id: "greenhouse:999", fitScore: 8, fitRationale: "No such job.", compensationRange: null },
      ]),
    /no ledger entry found for id "greenhouse:999"/,
  );
  assert.equal(ledger["greenhouse:100"]!.status, "pending");
});

test("applyScoresToLedger scores multiple entries in one batch and leaves other pending entries untouched", () => {
  const ledger: JobScoutLedger = {
    "greenhouse:1": makeEntry({ id: 1, company: "Acme", source: "greenhouse", status: "pending" }),
    "greenhouse:2": makeEntry({ id: 2, company: "Acme", source: "greenhouse", status: "pending" }),
    "greenhouse:3": makeEntry({ id: 3, company: "Acme", source: "greenhouse", status: "pending" }),
  };

  applyScoresToLedger(ledger, [
    { id: "greenhouse:1", fitScore: 4, fitRationale: "Weak fit.", compensationRange: null },
    { id: "greenhouse:2", fitScore: 9, fitRationale: "Excellent fit.", compensationRange: "$150K-$180K" },
  ]);

  assert.equal(ledger["greenhouse:1"]!.status, "scored");
  assert.equal(ledger["greenhouse:2"]!.status, "scored");
  assert.equal(ledger["greenhouse:3"]!.status, "pending"); // not in the batch -> untouched
});

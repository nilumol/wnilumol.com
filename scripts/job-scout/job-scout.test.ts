import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { JobScoutBoard } from "../../content/job-scout-boards.ts";
import { matchJobScoutKeywordFamily } from "../../content/job-scout-keywords.ts";
import { resumeData } from "../../content/resume-data.ts";
import { filterCandidateJobs } from "./filter.ts";
import type { BoardFetchResult } from "./greenhouse.ts";
import { htmlToPlainText } from "./html.ts";
import { expireMissingEntries, hasLedgerEntry, loadLedger, saveLedger } from "./ledger.ts";
import { runJobScoutPipeline } from "./pipeline.ts";
import { writeResumeNotes } from "./resume-notes.ts";
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

function fixtureJob(overrides: Partial<GreenhouseJob> & { id: number; title: string }): GreenhouseJob {
  return {
    absolute_url: `https://job-boards.greenhouse.io/acme/jobs/${overrides.id}`,
    content: "<p>Job description.</p>",
    requisition_id: null,
    updated_at: "2026-08-01T00:00:00-07:00",
    ...overrides,
  };
}

test("filterCandidateJobs keeps only keyword-matching jobs and tags company + family", () => {
  const board: JobScoutBoard = { token: "acme", label: "Acme" };
  const jobs = [
    fixtureJob({ id: 1, title: "Solutions Consultant" }),
    fixtureJob({ id: 2, title: "Backend Engineer" }),
  ];
  const candidates = filterCandidateJobs(board, jobs);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0]!.job.id, 1);
  assert.equal(candidates[0]!.company, "Acme");
  assert.equal(candidates[0]!.keywordFamily, "Solutions Consultant");
});

// ---------------------------------------------------------------------------
// Ledger diff logic (section 4): new vs. already-seen vs. expired
// ---------------------------------------------------------------------------

test("expireMissingEntries expires missing scored entries but preserves captain-set statuses", () => {
  const ledger: JobScoutLedger = {
    "10": makeEntry({ id: 10, company: "Acme", status: "scored" }),
    "11": makeEntry({ id: 11, company: "Acme", status: "applied" }),
    "12": makeEntry({ id: 12, company: "Acme", status: "passed" }),
    "13": makeEntry({ id: 13, company: "Acme", status: "expired" }),
    "14": makeEntry({ id: 14, company: "Other Co", status: "scored" }),
  };
  // Only id 14 is still present in the fresh fetch; everything else for "Acme" is missing.
  const expiredCount = expireMissingEntries(ledger, "Acme", new Set([]));

  assert.equal(expiredCount, 1); // only id 10 transitions (13 was already expired, doesn't recount)
  assert.equal(ledger["10"]!.status, "expired");
  assert.equal(ledger["11"]!.status, "applied");
  assert.equal(ledger["12"]!.status, "passed");
  assert.equal(ledger["13"]!.status, "expired");
  assert.equal(ledger["14"]!.status, "scored"); // different company, untouched
});

test("ledger save/load round-trips and always writes sorted by id", () => {
  const dir = mkdtempSync(join(tmpdir(), "job-scout-ledger-"));
  const path = join(dir, "ledger.json");
  const ledger: JobScoutLedger = {
    "300": makeEntry({ id: 300, company: "Acme", status: "scored" }),
    "100": makeEntry({ id: 100, company: "Acme", status: "scored" }),
    "200": makeEntry({ id: 200, company: "Acme", status: "scored" }),
  };

  saveLedger(path, ledger);
  const raw = readFileSync(path, "utf-8");
  const keysInFile = Object.keys(JSON.parse(raw) as JobScoutLedger);
  assert.deepEqual(keysInFile, ["100", "200", "300"]);

  const reloaded = loadLedger(path);
  assert.equal(Object.keys(reloaded).length, 3);
  assert.equal(hasLedgerEntry(reloaded, 200), true);
  assert.equal(hasLedgerEntry(reloaded, 999), false);

  rmSync(dir, { recursive: true, force: true });
});

test("loadLedger returns an empty object when the file doesn't exist", () => {
  const missingPath = join(mkdtempSync(join(tmpdir(), "job-scout-missing-")), "does-not-exist.json");
  assert.deepEqual(loadLedger(missingPath), {});
});

function makeEntry(
  partial: Pick<CandidateJob["job"], "id"> & { company: string; status: "scored" | "applied" | "passed" | "expired" },
) {
  return {
    id: partial.id,
    company: partial.company,
    title: "Some Role",
    absoluteUrl: `https://job-boards.greenhouse.io/acme/jobs/${partial.id}`,
    firstSeen: "2026-08-17T00:00:00.000Z",
    status: partial.status,
    fitScore: 6,
    fitRationale: "Fixture entry.",
    resumeNotesPath: null,
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
// Resume-adjustment document writing (section 6)
// ---------------------------------------------------------------------------

test("writeResumeNotes writes a distinct markdown file per job and returns its repo-relative path", () => {
  const repoRoot = mkdtempSync(join(tmpdir(), "job-scout-repo-"));
  const candidate: CandidateJob = {
    job: fixtureJob({ id: 55, title: "Customer Success Manager" }),
    company: "Acme",
    keywordFamily: "Customer Success Manager",
  };
  const result: FitScoreResult = {
    score: 5,
    rationale: "Partial overlap only.",
    resumeAdjustments: "Emphasize the Benchling enterprise account work.",
  };

  const relativePath = writeResumeNotes(repoRoot, candidate, result);
  assert.equal(relativePath, "content/job-scout-resume-notes/55.md");

  const written = readFileSync(join(repoRoot, relativePath), "utf-8");
  assert.ok(written.includes("Customer Success Manager"));
  assert.ok(written.includes("5/10"));
  assert.ok(written.includes("Emphasize the Benchling enterprise account work."));

  rmSync(repoRoot, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// End-to-end pipeline dry run (sections 3-6 wired together) with a mocked scorer -
// this is the "does not require a live Anthropic API key" coverage.
// ---------------------------------------------------------------------------

test("runJobScoutPipeline: filters, skips already-seen, scores new jobs, expires missing ones, and never calls the mocked scorer for skipped/expired jobs", async () => {
  const acme: JobScoutBoard = { token: "acme", label: "Acme" };
  const ghost: JobScoutBoard = { token: "ghost", label: "Ghost Co" };

  const freshAcmeJobs: GreenhouseJob[] = [
    fixtureJob({ id: 100, title: "Solutions Consultant" }), // new candidate, will score below cutoff
    fixtureJob({ id: 101, title: "Backend Engineer" }), // filtered out by keywords, never touches ledger
    fixtureJob({ id: 102, title: "Sr Implementations Manager" }), // already ledgered -> must not be rescored
    fixtureJob({ id: 107, title: "Customer Success Manager" }), // new candidate, will score at/above cutoff
  ];

  const fetchBoard = async (board: JobScoutBoard): Promise<BoardFetchResult> => {
    if (board.token === "acme") return { board, found: true, jobs: freshAcmeJobs };
    if (board.token === "ghost") return { board, found: false, jobs: [] }; // simulates a 404
    throw new Error(`unexpected board in test: ${board.token}`);
  };

  const ledger: JobScoutLedger = {
    "102": makeEntry({ id: 102, company: "Acme", status: "scored" }), // still present -> untouched, not rescored
    "103": makeEntry({ id: 103, company: "Acme", status: "scored" }), // missing from fresh fetch -> expires
    "104": makeEntry({ id: 104, company: "Acme", status: "applied" }), // missing, captain-set -> preserved
    "105": makeEntry({ id: 105, company: "Acme", status: "passed" }), // missing, captain-set -> preserved
    "200": makeEntry({ id: 200, company: "Ghost Co", status: "scored" }), // board 404'd -> must not be touched
  };

  const scoreCalls: number[] = [];
  const scoreJob = async (candidate: CandidateJob): Promise<FitScoreResult> => {
    scoreCalls.push(candidate.job.id);
    if (candidate.job.id === 100) {
      return { score: 5, rationale: "Partial domain overlap.", resumeAdjustments: "Emphasize Benchling work." };
    }
    return { score: 9, rationale: "Strong role and domain match.", resumeAdjustments: "No changes needed." };
  };

  const resumeNotesCalls: number[] = [];
  const writeResumeNotesMock = (candidate: CandidateJob): string => {
    resumeNotesCalls.push(candidate.job.id);
    return `content/job-scout-resume-notes/${candidate.job.id}.md`;
  };

  const result = await runJobScoutPipeline([acme, ghost], ledger, {
    fetchBoard,
    scoreJob,
    writeResumeNotes: writeResumeNotesMock,
    log: () => {},
  });

  // Only the two genuinely new, keyword-matching jobs were scored.
  assert.deepEqual(scoreCalls.sort(), [100, 107]);
  assert.equal(result.scoredCount, 2);

  // Resume notes only written for the below-cutoff job.
  assert.deepEqual(resumeNotesCalls, [100]);

  // Ledger entries reflect the mocked scoring.
  assert.equal(ledger["100"]!.status, "scored");
  assert.equal(ledger["100"]!.fitScore, 5);
  assert.equal(ledger["100"]!.resumeNotesPath, "content/job-scout-resume-notes/100.md");
  assert.ok(ledger["100"]!.fitScore < STRONG_FIT_CUTOFF);

  assert.equal(ledger["107"]!.status, "scored");
  assert.equal(ledger["107"]!.fitScore, 9);
  assert.equal(ledger["107"]!.resumeNotesPath, null);

  // Job 101 never matched the keyword filter and never touched the ledger.
  assert.equal(hasLedgerEntry(ledger, 101), false);

  // Already-seen job was left exactly as-is (not rescored).
  assert.equal(ledger["102"]!.status, "scored");

  // Missing-from-fetch entries: only the plain "scored" one expires.
  assert.equal(ledger["103"]!.status, "expired");
  assert.equal(ledger["104"]!.status, "applied");
  assert.equal(ledger["105"]!.status, "passed");
  assert.equal(result.expiredCount, 1);

  // The 404'd board's own ledger entries are left untouched, and the board is reported skipped.
  assert.equal(ledger["200"]!.status, "scored");
  assert.deepEqual(result.skippedBoardTokens, ["ghost"]);
});

test("runJobScoutPipeline: mutates the ledger in place as it goes, so entries scored before a mid-run failure survive the rejection", async () => {
  const acme: JobScoutBoard = { token: "acme", label: "Acme" };

  const freshAcmeJobs: GreenhouseJob[] = [
    fixtureJob({ id: 100, title: "Solutions Consultant" }), // scores fine
    fixtureJob({ id: 101, title: "Solutions Architect" }), // scorer throws on this one
  ];

  const fetchBoard = async (board: JobScoutBoard): Promise<BoardFetchResult> => {
    if (board.token === "acme") return { board, found: true, jobs: freshAcmeJobs };
    throw new Error(`unexpected board in test: ${board.token}`);
  };

  const ledger: JobScoutLedger = {
    "103": makeEntry({ id: 103, company: "Acme", status: "scored" }), // missing from fresh fetch -> should still expire
  };

  const scoreJob = async (candidate: CandidateJob): Promise<FitScoreResult> => {
    if (candidate.job.id === 101) {
      throw new Error("simulated Anthropic API failure mid-run");
    }
    return { score: 9, rationale: "Strong match.", resumeAdjustments: "No changes needed." };
  };

  await assert.rejects(
    () =>
      runJobScoutPipeline([acme], ledger, {
        fetchBoard,
        scoreJob,
        writeResumeNotes: (candidate) => `content/job-scout-resume-notes/${candidate.job.id}.md`,
        log: () => {},
      }),
    /simulated Anthropic API failure mid-run/,
  );

  // The job scored before the throw was already upserted into the (in-place mutated) ledger object,
  // so a caller that persists `ledger` from a `finally` block (as scripts/job-scout/run.ts does)
  // does not lose it, even though the pipeline call itself rejected.
  assert.equal(ledger["100"]!.status, "scored");
  assert.equal(ledger["100"]!.fitScore, 9);

  // Expiry (which happens before scoring) is also preserved.
  assert.equal(ledger["103"]!.status, "expired");

  // The job that failed to score was never written to the ledger.
  assert.equal(hasLedgerEntry(ledger, 101), false);
});

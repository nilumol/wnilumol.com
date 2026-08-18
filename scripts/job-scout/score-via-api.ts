import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { jobScoutBoards } from "../../content/job-scout-boards.ts";
import { resumeData } from "../../content/resume-data.ts";
import { fetchAshbyBoardJobs } from "./ashby.ts";
import { filterCandidateJobs } from "./filter.ts";
import { fetchBoardJobs } from "./greenhouse.ts";
import { fetchLeverBoardJobs } from "./lever.ts";
import { ledgerKey, loadLedger, saveLedger } from "./ledger.ts";
import { fetchBoardNormalized } from "./pipeline.ts";
import { getAnthropicApiKeyOrThrow, scoreJobWithClaude } from "./scoring.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const LEDGER_PATH = join(REPO_ROOT, "content/job-scout-seen.json");
const SCORING_RUBRIC_PATH = join(REPO_ROOT, "content/job-scout-scoring.md");

/**
 * Standalone, opt-in scoring pass: re-fetches every tracked board (the ledger doesn't persist
 * full posting content), matches candidates against "pending" ledger entries, and scores each
 * via a live Claude API call. Never run by the automated GitHub Actions pipeline (which writes
 * "pending" entries and stops) - this is a demonstrable, manual/local alternative to the free
 * `npm run job-scout:apply-scores` flow, which remains the default way scores get recorded.
 */
async function main(): Promise<void> {
  const ledger = loadLedger(LEDGER_PATH);
  const client = new Anthropic({ apiKey: getAnthropicApiKeyOrThrow() });
  const rubricMarkdown = readFileSync(SCORING_RUBRIC_PATH, "utf-8");

  let scoredCount = 0;
  try {
    for (const board of jobScoutBoards) {
      let fetchResult;
      try {
        fetchResult = await fetchBoardNormalized(board, {
          greenhouse: fetchBoardJobs,
          lever: fetchLeverBoardJobs,
          ashby: fetchAshbyBoardJobs,
        });
      } catch (error) {
        console.log(
          `job-scout:score-via-api: failed to fetch board "${board.token}" (${board.label}): ${(error as Error).message}`,
        );
        continue;
      }
      if (!fetchResult.found) continue;

      const candidates = filterCandidateJobs(board, fetchResult.jobs);
      for (const candidate of candidates) {
        const entry = ledger[ledgerKey(candidate.source, candidate.job.id)];
        if (!entry || entry.status !== "pending") continue;

        console.log(`job-scout:score-via-api: scoring "${candidate.job.title}" (${candidate.company})`);
        const result = await scoreJobWithClaude(client, candidate, resumeData, rubricMarkdown);

        entry.status = "scored";
        entry.fitScore = result.score;
        entry.fitRationale = result.rationale;
        entry.compensationRange = candidate.job.structuredCompensationRange ?? result.compensationRange;
        scoredCount += 1;
      }
    }
  } finally {
    saveLedger(LEDGER_PATH, ledger);
  }

  console.log(`job-scout:score-via-api: scored ${scoredCount} pending job(s).`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

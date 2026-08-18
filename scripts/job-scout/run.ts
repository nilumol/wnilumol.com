import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { jobScoutBoards } from "../../content/job-scout-boards.ts";
import { resumeData } from "../../content/resume-data.ts";
import { fetchBoardJobs } from "./greenhouse.ts";
import { loadLedger, saveLedger } from "./ledger.ts";
import { runJobScoutPipeline } from "./pipeline.ts";
import { getAnthropicApiKeyOrThrow, scoreJobWithClaude } from "./scoring.ts";
import type { CandidateJob } from "./types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const LEDGER_PATH = join(REPO_ROOT, "content/job-scout-seen.json");
const SCORING_RUBRIC_PATH = join(REPO_ROOT, "content/job-scout-scoring.md");

async function main(): Promise<void> {
  const ledger = loadLedger(LEDGER_PATH);

  // Constructed lazily on first use, so a run with zero new candidates never requires
  // ANTHROPIC_API_KEY to be set at all.
  let client: Anthropic | undefined;
  let rubricMarkdown: string | undefined;

  const scoreJob = async (candidate: CandidateJob) => {
    if (!client || rubricMarkdown === undefined) {
      client = new Anthropic({ apiKey: getAnthropicApiKeyOrThrow() });
      rubricMarkdown = readFileSync(SCORING_RUBRIC_PATH, "utf-8");
    }
    return scoreJobWithClaude(client, candidate, resumeData, rubricMarkdown);
  };

  let result: Awaited<ReturnType<typeof runJobScoutPipeline>> | undefined;
  try {
    result = await runJobScoutPipeline(jobScoutBoards, ledger, {
      fetchBoard: fetchBoardJobs,
      scoreJob,
      log: console.log,
    });
  } finally {
    saveLedger(LEDGER_PATH, ledger);
  }

  console.log(
    `job-scout: run complete - scored ${result.scoredCount} new job(s), expired ${result.expiredCount} entry(ies), ` +
      `skipped ${result.skippedBoardTokens.length} board(s), ledger has ${Object.keys(ledger).length} entry(ies) total`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

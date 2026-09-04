import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { jobAgentBoards } from "../../content/job-agent-boards.ts";
import { fetchAshbyBoardJobs } from "./ashby.ts";
import { fetchBoardJobs } from "./greenhouse.ts";
import { fetchLeverBoardJobs } from "./lever.ts";
import { loadLedger, saveLedger } from "./ledger.ts";
import { runJobAgentPipeline } from "./pipeline.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const LEDGER_PATH = join(REPO_ROOT, "content/job-agent-seen.json");

/**
 * Fetch -> filter -> diff against the ledger -> write new matches as "pending" -> expire
 * disappeared entries -> save. Makes no LLM call and needs no API key; new jobs are scored later,
 * outside this repo's automation, via `npm run job-agent:apply-scores`.
 */
async function main(): Promise<void> {
  const ledger = loadLedger(LEDGER_PATH);

  let result: Awaited<ReturnType<typeof runJobAgentPipeline>> | undefined;
  try {
    result = await runJobAgentPipeline(jobAgentBoards, ledger, {
      fetchers: {
        greenhouse: fetchBoardJobs,
        lever: fetchLeverBoardJobs,
        ashby: fetchAshbyBoardJobs,
      },
      log: console.log,
    });
  } finally {
    saveLedger(LEDGER_PATH, ledger);
  }

  console.log(
    `job-agent: run complete - added ${result.addedCount} pending job(s), expired ${result.expiredCount} entry(ies), ` +
      `skipped ${result.skippedBoardTokens.length} board(s), ${result.unrecognizedLocations.length} unrecognized location(s) logged above, ` +
      `ledger has ${Object.keys(ledger).length} entry(ies) total`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

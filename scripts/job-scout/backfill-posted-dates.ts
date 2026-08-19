/**
 * One-off backfill: fills `postedAt` on pre-existing Greenhouse ledger entries with
 * `status: "scored"` that predate the `postedAt` field. Fetches each tracked Greenhouse
 * board's current listings and matches by job id; entries whose job is no longer listed
 * (closed) are left untouched. Run once with `npx tsx scripts/job-scout/backfill-posted-dates.ts`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { jobScoutBoards } from "../../content/job-scout-boards.ts";
import { fetchBoardJobs } from "./greenhouse.ts";
import type { JobScoutLedger } from "./types.ts";

async function main() {
  const ledgerPath = fileURLToPath(new URL("../../content/job-scout-seen.json", import.meta.url));
  const ledger: JobScoutLedger = JSON.parse(readFileSync(ledgerPath, "utf-8"));

  const postedAtById = new Map<number, string>();
  const greenhouseBoards = jobScoutBoards.filter((board) => board.source === "greenhouse");
  for (const board of greenhouseBoards) {
    const result = await fetchBoardJobs(board);
    if (!result.found) continue;
    for (const job of result.jobs) {
      if (job.first_published) {
        postedAtById.set(job.id, job.first_published);
      }
    }
  }

  let matched = 0;
  let notFound = 0;
  for (const entry of Object.values(ledger)) {
    if (entry.source !== "greenhouse" || entry.status !== "scored" || entry.postedAt) continue;
    const postedAt = postedAtById.get(Number(entry.id));
    if (postedAt) {
      entry.postedAt = postedAt;
      matched += 1;
    } else {
      notFound += 1;
    }
  }

  writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + "\n");
  console.log(`Matched: ${matched}, Not found (closed): ${notFound}`);
}

main();

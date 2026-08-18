import type { JobScoutBoard } from "../../content/job-scout-boards.ts";
import { matchJobScoutKeywordFamily } from "../../content/job-scout-keywords.ts";
import type { CandidateJob, NormalizedJob } from "./types.ts";

/**
 * Applies the company+keyword pre-filter (a job must belong to a configured board AND match
 * at least one keyword family) to a board's fresh job list. Jobs that fail this filter are
 * dropped here and never reach the ledger.
 */
export function filterCandidateJobs(board: JobScoutBoard, jobs: NormalizedJob[]): CandidateJob[] {
  const candidates: CandidateJob[] = [];
  for (const job of jobs) {
    const keywordFamily = matchJobScoutKeywordFamily(job.title);
    if (keywordFamily) {
      candidates.push({ job, company: board.label, keywordFamily, source: board.source });
    }
  }
  return candidates;
}

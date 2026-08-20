import type { JobAgentBoard } from "../../content/job-agent-boards.ts";
import { matchJobAgentKeywordFamily } from "../../content/job-agent-keywords.ts";
import type { CandidateJob, NormalizedJob } from "./types.ts";

/**
 * Applies the company+keyword pre-filter (a job must belong to a configured board AND match
 * at least one keyword family) to a board's fresh job list. Jobs that fail this filter are
 * dropped here and never reach the ledger.
 */
export function filterCandidateJobs(board: JobAgentBoard, jobs: NormalizedJob[]): CandidateJob[] {
  const candidates: CandidateJob[] = [];
  for (const job of jobs) {
    const keywordFamily = matchJobAgentKeywordFamily(job.title);
    if (keywordFamily) {
      candidates.push({ job, company: board.label, keywordFamily, source: board.source });
    }
  }
  return candidates;
}

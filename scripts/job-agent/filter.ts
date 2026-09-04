import type { JobAgentBoard } from "../../content/job-agent-boards.ts";
import { matchJobAgentKeywordFamily } from "../../content/job-agent-keywords.ts";
import { classifyJobLocation } from "./location.ts";
import type { CandidateJob, NormalizedJob } from "./types.ts";

/**
 * Applies the company+keyword+location pre-filter (a job must belong to a configured board,
 * match at least one keyword family, and not be a confidently non-US location - see
 * classifyJobLocation() in location.ts) to a board's fresh job list. Jobs that fail this filter
 * are dropped here and never reach the ledger. Locations classifyJobLocation() can't confidently
 * place either way ("unrecognized") are kept, not dropped - see location.ts for why.
 */
export function filterCandidateJobs(board: JobAgentBoard, jobs: NormalizedJob[]): CandidateJob[] {
  const candidates: CandidateJob[] = [];
  for (const job of jobs) {
    const keywordFamily = matchJobAgentKeywordFamily(job.title);
    if (!keywordFamily) continue;

    const locationClassification = classifyJobLocation(job.location?.name);
    if (locationClassification === "non-us") continue;

    candidates.push({ job, company: board.label, keywordFamily, source: board.source, locationClassification });
  }
  return candidates;
}

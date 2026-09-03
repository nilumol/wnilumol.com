import type { JobAgentBoard } from "../../content/job-agent-boards.ts";
import {
  type AshbyJob,
  type BoardFetchResult,
  isAshbyJobBoardResponse,
  type NormalizedJob,
} from "./types.ts";

function normalizeAshbyJob(job: AshbyJob): NormalizedJob {
  return {
    id: job.id,
    title: job.title,
    absolute_url: job.jobUrl ?? job.applyUrl ?? "",
    content: job.descriptionHtml ?? job.descriptionPlain,
    location: job.location ? { name: job.location } : undefined,
    postedAt: job.publishedAt,
    // Requires the `includeCompensation=true` query param below - without it this field is absent.
    structuredCompensationRange: job.compensation?.scrapeableCompensationSalarySummary ?? null,
  };
}

/**
 * Fetches one Ashby board's jobs with full descriptions in a single call (Ashby's job-board
 * endpoint already includes `descriptionHtml`/`descriptionPlain` on every job - no per-job
 * detail call is needed). A 404 (invalid/renamed token) is treated as "board not found" rather
 * than thrown, so the caller can skip it and continue the run. Any other non-OK status throws.
 */
export async function fetchAshbyBoardJobs(board: JobAgentBoard): Promise<BoardFetchResult> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board.token)}?includeCompensation=true`;
  const response = await fetch(url);

  if (response.status === 404) {
    return { board, found: false, jobs: [] };
  }
  if (!response.ok) {
    throw new Error(`Ashby board "${board.token}" returned HTTP ${response.status}`);
  }

  const data: unknown = await response.json();
  if (!isAshbyJobBoardResponse(data)) {
    throw new Error(`Ashby board "${board.token}" returned an unexpected response shape`);
  }
  return { board, found: true, jobs: data.jobs.map(normalizeAshbyJob) };
}

import type { JobAgentBoard } from "../../content/job-agent-boards.ts";
import { type GreenhouseJob, isGreenhouseJobsResponse } from "./types.ts";

export interface GreenhouseBoardFetchResult {
  board: JobAgentBoard;
  /** false when the board token 404s (invalid/renamed) - the board is skipped, not fatal. */
  found: boolean;
  jobs: GreenhouseJob[];
}

/**
 * Fetches one Greenhouse board's jobs with full descriptions in a single call
 * (`?content=true` returns `content` on every job, so no per-job detail call is needed).
 * A 404 (invalid/renamed token) is treated as "board not found" rather than thrown, so the
 * caller can skip it and continue the run. Any other non-OK status throws.
 */
export async function fetchBoardJobs(board: JobAgentBoard): Promise<GreenhouseBoardFetchResult> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board.token)}/jobs?content=true`;
  const response = await fetch(url);

  if (response.status === 404) {
    return { board, found: false, jobs: [] };
  }
  if (!response.ok) {
    throw new Error(`Greenhouse board "${board.token}" returned HTTP ${response.status}`);
  }

  const data: unknown = await response.json();
  if (!isGreenhouseJobsResponse(data)) {
    throw new Error(`Greenhouse board "${board.token}" returned an unexpected response shape`);
  }
  return { board, found: true, jobs: data.jobs };
}

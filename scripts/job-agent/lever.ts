import type { JobAgentBoard } from "../../content/job-agent-boards.ts";
import {
  type BoardFetchResult,
  isLeverPostingsResponse,
  type LeverPosting,
  type LeverSalaryRange,
  type NormalizedJob,
} from "./types.ts";

function formatCompensationAmount(amount: number, currency: string): string {
  const symbol = currency === "USD" ? "$" : `${currency} `;
  return `${symbol}${Math.round(amount / 1000)}K`;
}

/** Lever's structured `salaryRange` isn't present on every posting - null when absent. */
function formatLeverSalaryRange(salaryRange: LeverSalaryRange | undefined): string | null {
  if (!salaryRange || typeof salaryRange.min !== "number" || typeof salaryRange.max !== "number") {
    return null;
  }
  const currency = salaryRange.currency ?? "USD";
  return `${formatCompensationAmount(salaryRange.min, currency)}-${formatCompensationAmount(salaryRange.max, currency)}`;
}

function normalizeLeverPosting(posting: LeverPosting): NormalizedJob {
  return {
    id: posting.id,
    title: posting.text,
    absolute_url: posting.hostedUrl,
    content: posting.description ?? posting.descriptionPlain,
    location: posting.categories?.location ? { name: posting.categories.location } : undefined,
    postedAt: typeof posting.createdAt === "number" ? new Date(posting.createdAt).toISOString() : undefined,
    structuredCompensationRange: formatLeverSalaryRange(posting.salaryRange),
  };
}

/**
 * Fetches one Lever board's postings with full descriptions in a single call (Lever's list
 * endpoint already includes `description`/`descriptionPlain` on every posting - no per-job
 * detail call is needed). A 404 (invalid/renamed token) is treated as "board not found" rather
 * than thrown, so the caller can skip it and continue the run. Any other non-OK status throws.
 */
export async function fetchLeverBoardJobs(board: JobAgentBoard): Promise<BoardFetchResult> {
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(board.token)}?mode=json`;
  const response = await fetch(url);

  if (response.status === 404) {
    return { board, found: false, jobs: [] };
  }
  if (!response.ok) {
    throw new Error(`Lever board "${board.token}" returned HTTP ${response.status}`);
  }

  const data: unknown = await response.json();
  if (!isLeverPostingsResponse(data)) {
    throw new Error(`Lever board "${board.token}" returned an unexpected response shape`);
  }
  return { board, found: true, jobs: data.map(normalizeLeverPosting) };
}

import type { JobAgentBoard } from "../../content/job-agent-boards.ts";

export type JobAgentSource = "greenhouse" | "lever" | "ashby";

export interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  content?: string;
  requisition_id?: string | null;
  updated_at?: string;
  location?: { name: string };
  /** ISO 8601 timestamp; source for the normalized `postedAt` field. */
  first_published?: string;
}

interface GreenhouseJobsResponse {
  jobs: GreenhouseJob[];
}

export function isGreenhouseJobsResponse(value: unknown): value is GreenhouseJobsResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { jobs?: unknown }).jobs)
  );
}

export interface LeverSalaryRange {
  min?: number;
  max?: number;
  currency?: string;
  interval?: string;
}

export interface LeverPosting {
  id: string;
  text: string;
  hostedUrl: string;
  description?: string;
  descriptionPlain?: string;
  categories?: { location?: string };
  /** Epoch milliseconds. */
  createdAt?: number;
  salaryRange?: LeverSalaryRange;
}

export function isLeverPostingsResponse(value: unknown): value is LeverPosting[] {
  return Array.isArray(value);
}

export interface AshbyJob {
  id: string;
  title: string;
  location?: string;
  jobUrl?: string;
  applyUrl?: string;
  descriptionHtml?: string;
  descriptionPlain?: string;
  /** ISO 8601 timestamp. */
  publishedAt?: string;
}

interface AshbyJobBoardResponse {
  jobs: AshbyJob[];
}

export function isAshbyJobBoardResponse(value: unknown): value is AshbyJobBoardResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { jobs?: unknown }).jobs)
  );
}

/**
 * The common candidate-job shape every source's fetcher module normalizes into before the
 * shared filter -> ledger diff -> scoring flow runs. Field names mirror `GreenhouseJob` (the
 * shape the pipeline originated with) so filter.ts/scoring.ts/pipeline.ts need no per-source
 * branching. `postedAt` and `structuredCompensationRange` are populated only when the source
 * provides them (Lever/Ashby directly; Greenhouse's `first_published` is mapped to `postedAt`
 * by pipeline.ts's routing step, since greenhouse.ts itself is unchanged).
 */
export interface NormalizedJob {
  id: string | number;
  title: string;
  absolute_url: string;
  content?: string;
  location?: { name: string };
  postedAt?: string;
  /** Structured compensation the source itself provides (currently Lever's `salaryRange` only). */
  structuredCompensationRange?: string | null;
}

export interface BoardFetchResult {
  board: JobAgentBoard;
  /** false when the board token 404s (invalid/renamed) - the board is skipped, not fatal. */
  found: boolean;
  jobs: NormalizedJob[];
}

export type JobAgentStatus = "pending" | "scored" | "applied" | "passed" | "expired";

export interface JobAgentLedgerEntry {
  id: number | string;
  source: JobAgentSource;
  company: string;
  title: string;
  keywordFamily: string;
  absoluteUrl: string;
  firstSeen: string;
  status: JobAgentStatus;
  /**
   * Absent until a score is recorded, via `job-agent:apply-scores` (a pre-computed batch) or
   * `job-agent:score-via-api` (calls Claude directly) - either way, status transitions
   * "pending" -> "scored".
   */
  fitScore?: number;
  fitRationale?: string;
  location: string | null;
  compensationRange: string | null;
  /** ISO date the posting went live, when the source provides one. Not backfilled for entries scored before this field existed. */
  postedAt?: string;
}

/** Keyed by `<source>:<id>` (e.g. `"greenhouse:8122020"`) to guarantee uniqueness across sources. */
export type JobAgentLedger = Record<string, JobAgentLedgerEntry>;

/** A job that survived the company+keyword pre-filter, with its matched keyword family. */
export interface CandidateJob {
  job: NormalizedJob;
  company: string;
  keywordFamily: string;
  source: JobAgentSource;
}

/** The result of scoring one job, whether by `job-agent:score-via-api` or a hand-assembled apply-scores batch. */
export interface FitScoreResult {
  score: number;
  rationale: string;
  compensationRange: string | null;
}

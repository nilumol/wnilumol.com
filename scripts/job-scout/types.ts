export interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  content?: string;
  requisition_id?: string | null;
  updated_at?: string;
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

export type JobScoutStatus = "scored" | "applied" | "passed" | "expired";

export interface JobScoutLedgerEntry {
  id: number;
  company: string;
  title: string;
  absoluteUrl: string;
  firstSeen: string;
  status: JobScoutStatus;
  fitScore: number;
  fitRationale: string;
  resumeNotesPath: string | null;
}

/** Keyed by Greenhouse job id (as a string, since JSON object keys are always strings). */
export type JobScoutLedger = Record<string, JobScoutLedgerEntry>;

export interface FitScoreResult {
  score: number;
  rationale: string;
  resumeAdjustments: string;
}

/** A job that survived the company+keyword pre-filter, with its matched keyword family. */
export interface CandidateJob {
  job: GreenhouseJob;
  company: string;
  keywordFamily: string;
}

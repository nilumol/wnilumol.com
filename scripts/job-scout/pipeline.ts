import type { JobScoutBoard } from "../../content/job-scout-boards.ts";
import { filterCandidateJobs } from "./filter.ts";
import type { BoardFetchResult } from "./greenhouse.ts";
import { expireMissingEntries, hasLedgerEntry, upsertScoredEntry } from "./ledger.ts";
import { STRONG_FIT_CUTOFF } from "./scoring.ts";
import type { CandidateJob, FitScoreResult, JobScoutLedger, JobScoutLedgerEntry } from "./types.ts";

export interface JobScoutPipelineDeps {
  fetchBoard: (board: JobScoutBoard) => Promise<BoardFetchResult>;
  scoreJob: (candidate: CandidateJob) => Promise<FitScoreResult>;
  writeResumeNotes: (candidate: CandidateJob, result: FitScoreResult) => string;
  log?: (message: string) => void;
}

export interface JobScoutPipelineResult {
  scoredCount: number;
  expiredCount: number;
  skippedBoardTokens: string[];
}

/**
 * The daily job-scout logic (sections 3-6 of the design), parameterized over fetch/score/write
 * so it can run for real (scripts/job-scout/run.ts) or against fixtures with a mocked scorer
 * (scripts/job-scout/job-scout.test.ts) without hitting the network or the Anthropic API.
 * Mutates `ledger` in place; the caller is responsible for persisting it.
 */
export async function runJobScoutPipeline(
  boards: JobScoutBoard[],
  ledger: JobScoutLedger,
  deps: JobScoutPipelineDeps,
): Promise<JobScoutPipelineResult> {
  const log = deps.log ?? ((): void => {});
  const pending: CandidateJob[] = [];
  const skippedBoardTokens: string[] = [];
  let expiredCount = 0;

  for (const board of boards) {
    let fetchResult: BoardFetchResult;
    try {
      fetchResult = await deps.fetchBoard(board);
    } catch (error) {
      log(
        `job-scout: failed to fetch board "${board.token}" (${board.label}): ${(error as Error).message}`,
      );
      skippedBoardTokens.push(board.token);
      continue;
    }

    if (!fetchResult.found) {
      log(
        `job-scout: board "${board.token}" (${board.label}) returned 404 - skipping (token may be invalid or renamed)`,
      );
      skippedBoardTokens.push(board.token);
      continue;
    }

    const candidates = filterCandidateJobs(board, fetchResult.jobs);
    log(
      `job-scout: ${board.label}: ${fetchResult.jobs.length} job(s) fetched, ${candidates.length} matched the keyword pre-filter`,
    );

    const freshJobIds = new Set(fetchResult.jobs.map((job) => job.id));
    expiredCount += expireMissingEntries(ledger, board.label, freshJobIds);

    for (const candidate of candidates) {
      if (!hasLedgerEntry(ledger, candidate.job.id)) {
        pending.push(candidate);
      }
    }
  }

  for (const candidate of pending) {
    log(`job-scout: scoring "${candidate.job.title}" (${candidate.company}, id ${candidate.job.id})`);
    const result = await deps.scoreJob(candidate);
    const resumeNotesPath =
      result.score < STRONG_FIT_CUTOFF ? deps.writeResumeNotes(candidate, result) : null;

    const entry: JobScoutLedgerEntry = {
      id: candidate.job.id,
      company: candidate.company,
      title: candidate.job.title,
      absoluteUrl: candidate.job.absolute_url,
      firstSeen: new Date().toISOString(),
      status: "scored",
      fitScore: result.score,
      fitRationale: result.rationale,
      resumeNotesPath,
    };
    upsertScoredEntry(ledger, entry);
  }

  return { scoredCount: pending.length, expiredCount, skippedBoardTokens };
}

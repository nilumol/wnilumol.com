import type { JobAgentBoard } from "../../content/job-agent-boards.ts";
import { filterCandidateJobs } from "./filter.ts";
import type { GreenhouseBoardFetchResult } from "./greenhouse.ts";
import { expireMissingEntries, hasLedgerEntry, upsertLedgerEntry } from "./ledger.ts";
import { cleanLocationName } from "./location.ts";
import type {
  BoardFetchResult,
  CandidateJob,
  JobAgentLedger,
  JobAgentLedgerEntry,
} from "./types.ts";

export interface JobAgentFetchers {
  greenhouse: (board: JobAgentBoard) => Promise<GreenhouseBoardFetchResult>;
  lever: (board: JobAgentBoard) => Promise<BoardFetchResult>;
  ashby: (board: JobAgentBoard) => Promise<BoardFetchResult>;
}

export interface JobAgentPipelineDeps {
  fetchers: JobAgentFetchers;
  log?: (message: string) => void;
}

/** A candidate whose location classifyJobLocation() (location.ts) couldn't confidently place - kept, but surfaced for review. */
export interface JobAgentUnrecognizedLocation {
  title: string;
  company: string;
  location: string;
}

export interface JobAgentPipelineResult {
  addedCount: number;
  expiredCount: number;
  skippedBoardTokens: string[];
  unrecognizedLocations: JobAgentUnrecognizedLocation[];
}

/**
 * Routes a board to the fetcher matching its `source` and normalizes the result into the shared
 * candidate-job shape. Lever and Ashby's fetcher modules already return fully normalized jobs;
 * Greenhouse's fetcher module is unchanged, so its raw `first_published` field is mapped to the
 * shared `postedAt` field here. Exported so `score-via-api.ts` can re-fetch full posting content
 * (not persisted in the ledger) for pending entries using the same source-routing logic.
 */
export async function fetchBoardNormalized(board: JobAgentBoard, fetchers: JobAgentFetchers): Promise<BoardFetchResult> {
  switch (board.source) {
    case "greenhouse": {
      const result = await fetchers.greenhouse(board);
      return {
        board: result.board,
        found: result.found,
        jobs: result.jobs.map((job) => ({ ...job, postedAt: job.first_published })),
      };
    }
    case "lever":
      return fetchers.lever(board);
    case "ashby":
      return fetchers.ashby(board);
  }
}

/**
 * The daily job-agent logic (sections 3-6 of the design), parameterized over fetch/write so it
 * can run for real (scripts/job-agent/run.ts) or against fixtures (scripts/job-agent/job-agent.test.ts)
 * without hitting the network. Makes no LLM call: new candidates are written as "pending" and
 * are scored later, outside this pipeline, via `npm run job-agent:apply-scores`. Mutates
 * `ledger` in place; the caller is responsible for persisting it.
 */
export async function runJobAgentPipeline(
  boards: JobAgentBoard[],
  ledger: JobAgentLedger,
  deps: JobAgentPipelineDeps,
): Promise<JobAgentPipelineResult> {
  const log = deps.log ?? ((): void => {});
  const pending: CandidateJob[] = [];
  const skippedBoardTokens: string[] = [];
  const unrecognizedLocations: JobAgentUnrecognizedLocation[] = [];
  let expiredCount = 0;

  for (const board of boards) {
    let fetchResult: BoardFetchResult;
    try {
      fetchResult = await fetchBoardNormalized(board, deps.fetchers);
    } catch (error) {
      log(
        `job-agent: failed to fetch board "${board.token}" (${board.label}): ${(error as Error).message}`,
      );
      skippedBoardTokens.push(board.token);
      continue;
    }

    if (!fetchResult.found) {
      log(
        `job-agent: board "${board.token}" (${board.label}) returned 404 - skipping (token may be invalid or renamed)`,
      );
      skippedBoardTokens.push(board.token);
      continue;
    }

    const candidates = filterCandidateJobs(board, fetchResult.jobs);
    log(
      `job-agent: ${board.label}: ${fetchResult.jobs.length} job(s) fetched, ${candidates.length} matched the keyword pre-filter`,
    );

    for (const candidate of candidates) {
      if (candidate.locationClassification === "unrecognized" && candidate.job.location?.name) {
        const unrecognized: JobAgentUnrecognizedLocation = {
          title: candidate.job.title,
          company: candidate.company,
          location: candidate.job.location.name,
        };
        unrecognizedLocations.push(unrecognized);
        log(
          `job-agent: unrecognized location "${unrecognized.location}" for "${unrecognized.title}" (${unrecognized.company}) - review and extend content/job-agent-locations.ts if this is a new US/non-US format`,
        );
      }
    }

    const freshJobIds = new Set(fetchResult.jobs.map((job) => job.id));
    expiredCount += expireMissingEntries(ledger, board, freshJobIds);

    for (const candidate of candidates) {
      if (!hasLedgerEntry(ledger, candidate.source, candidate.job.id)) {
        pending.push(candidate);
      }
    }
  }

  for (const candidate of pending) {
    log(`job-agent: new pending job "${candidate.job.title}" (${candidate.company}, id ${candidate.job.id})`);

    const entry: JobAgentLedgerEntry = {
      id: candidate.job.id,
      source: candidate.source,
      company: candidate.company,
      title: candidate.job.title,
      keywordFamily: candidate.keywordFamily,
      absoluteUrl: candidate.job.absolute_url,
      firstSeen: new Date().toISOString(),
      status: "pending",
      location: cleanLocationName(candidate.job.location?.name),
      compensationRange: candidate.job.structuredCompensationRange ?? null,
      postedAt: candidate.job.postedAt,
    };
    upsertLedgerEntry(ledger, entry);
  }

  return { addedCount: pending.length, expiredCount, skippedBoardTokens, unrecognizedLocations };
}

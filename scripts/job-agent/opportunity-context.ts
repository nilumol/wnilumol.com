import { jobAgentBoards } from "../../content/job-agent-boards.ts";
import { fetchAshbyBoardJobs } from "./ashby.ts";
import { fetchBoardJobs } from "./greenhouse.ts";
import { fetchLeverBoardJobs } from "./lever.ts";
import { ledgerKey } from "./ledger.ts";
import { findManualOpportunity } from "./manual-opportunities.ts";
import { fetchBoardNormalized } from "./pipeline.ts";
import type { JobAgentLedger, JobAgentLedgerEntry, JobAgentSource, NormalizedJob } from "./types.ts";

export interface OpportunityContext {
  entry: JobAgentLedgerEntry;
  posting: NormalizedJob;
}

export class OpportunityContextError extends Error {
  readonly code: "configuration" | "not-live" | "fetch";

  constructor(code: "configuration" | "not-live" | "fetch", message: string) {
    super(message);
    this.name = "OpportunityContextError";
    this.code = code;
  }
}

type ManualOpportunityFinder = typeof findManualOpportunity;

export async function resolveOpportunityEntry(
  ledger: JobAgentLedger,
  source: JobAgentSource,
  id: string | number,
  findManual: ManualOpportunityFinder = findManualOpportunity,
): Promise<JobAgentLedgerEntry | null> {
  const ledgerEntry = ledger[ledgerKey(source, id)];
  if (ledgerEntry) return ledgerEntry;
  return (await findManual(source, id))?.entry ?? null;
}

/**
 * Manual opportunities use their persisted description; automated ledger rows retain the
 * established behavior of re-fetching their tracked board so tailoring sees current content.
 */
export async function resolveOpportunityContext(
  ledger: JobAgentLedger,
  source: JobAgentSource,
  id: string | number,
  findManual: ManualOpportunityFinder = findManualOpportunity,
): Promise<OpportunityContext | null> {
  const ledgerEntry = ledger[ledgerKey(source, id)];
  if (!ledgerEntry) {
    const manual = await findManual(source, id);
    return manual ? { entry: manual.entry, posting: manual.posting } : null;
  }

  const board = jobAgentBoards.find(
    (candidate) => candidate.label === ledgerEntry.company && candidate.source === ledgerEntry.source,
  );
  if (!board) throw new OpportunityContextError("configuration", "No tracked board for this job's company.");

  let fetchResult;
  try {
    fetchResult = await fetchBoardNormalized(board, {
      greenhouse: fetchBoardJobs,
      lever: fetchLeverBoardJobs,
      ashby: fetchAshbyBoardJobs,
    });
  } catch (error) {
    throw new OpportunityContextError("fetch", `Failed to fetch the live posting: ${(error as Error).message}`);
  }
  const posting = fetchResult.jobs.find((candidate) => String(candidate.id) === String(ledgerEntry.id));
  if (!posting) throw new OpportunityContextError("not-live", "This posting is no longer live.");
  return { entry: ledgerEntry, posting };
}

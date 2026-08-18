import { existsSync, readFileSync, writeFileSync } from "fs";
import type { JobScoutLedger, JobScoutLedgerEntry } from "./types.ts";

export function loadLedger(path: string): JobScoutLedger {
  if (!existsSync(path)) return {};
  const raw = readFileSync(path, "utf-8").trim();
  if (raw.length === 0) return {};
  return JSON.parse(raw) as JobScoutLedger;
}

/**
 * Writes the ledger sorted by numeric job id so daily diffs in git history stay small and
 * reviewable, with a trailing newline.
 */
export function saveLedger(path: string, ledger: JobScoutLedger): void {
  const sorted: JobScoutLedger = {};
  for (const entry of Object.values(ledger).sort((a, b) => a.id - b.id)) {
    sorted[String(entry.id)] = entry;
  }
  writeFileSync(path, `${JSON.stringify(sorted, null, 2)}\n`, "utf-8");
}

export function hasLedgerEntry(ledger: JobScoutLedger, jobId: number): boolean {
  return String(jobId) in ledger;
}

export function upsertScoredEntry(ledger: JobScoutLedger, entry: JobScoutLedgerEntry): void {
  ledger[String(entry.id)] = entry;
}

/**
 * For one company's fresh board fetch, marks any ledger entry belonging to that company whose
 * id is absent from freshJobIds as "expired" - unless it's already "applied", "passed", or
 * "expired" (captain-set statuses are never overwritten by code; already-expired is a no-op).
 * Returns the number of entries newly marked expired.
 */
export function expireMissingEntries(
  ledger: JobScoutLedger,
  company: string,
  freshJobIds: Set<number>,
): number {
  let expiredCount = 0;
  for (const entry of Object.values(ledger)) {
    if (entry.company !== company) continue;
    if (freshJobIds.has(entry.id)) continue;
    if (entry.status === "applied" || entry.status === "passed" || entry.status === "expired") {
      continue;
    }
    entry.status = "expired";
    expiredCount += 1;
  }
  return expiredCount;
}

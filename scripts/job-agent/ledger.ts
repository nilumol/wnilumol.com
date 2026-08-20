import { existsSync, readFileSync, writeFileSync } from "fs";
import type { JobAgentBoard } from "../../content/job-agent-boards.ts";
import type { JobAgentLedger, JobAgentLedgerEntry, JobAgentSource } from "./types.ts";

export function loadLedger(path: string): JobAgentLedger {
  if (!existsSync(path)) return {};
  const raw = readFileSync(path, "utf-8").trim();
  if (raw.length === 0) return {};
  return JSON.parse(raw) as JobAgentLedger;
}

export function ledgerKey(source: JobAgentSource, id: string | number): string {
  return `${source}:${id}`;
}

/**
 * Writes the ledger sorted by key (`<source>:<id>`, numeric-aware so e.g. "greenhouse:99" sorts
 * before "greenhouse:100") so daily diffs in git history stay small and reviewable, with a
 * trailing newline.
 */
export function saveLedger(path: string, ledger: JobAgentLedger): void {
  const sorted: JobAgentLedger = {};
  const keys = Object.keys(ledger).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  for (const key of keys) {
    sorted[key] = ledger[key]!;
  }
  writeFileSync(path, `${JSON.stringify(sorted, null, 2)}\n`, "utf-8");
}

export function hasLedgerEntry(ledger: JobAgentLedger, source: JobAgentSource, id: string | number): boolean {
  return ledgerKey(source, id) in ledger;
}

export function upsertLedgerEntry(ledger: JobAgentLedger, entry: JobAgentLedgerEntry): void {
  ledger[ledgerKey(entry.source, entry.id)] = entry;
}

/**
 * For one board's fresh fetch, marks any ledger entry belonging to that board's company+source
 * whose id is absent from freshJobIds as "expired" - unless it's already "applied", "passed",
 * or "expired" (captain-set statuses are never overwritten by code; already-expired is a
 * no-op). Returns the number of entries newly marked expired.
 */
export function expireMissingEntries(
  ledger: JobAgentLedger,
  board: JobAgentBoard,
  freshJobIds: Set<string | number>,
): number {
  let expiredCount = 0;
  for (const entry of Object.values(ledger)) {
    if (entry.company !== board.label || entry.source !== board.source) continue;
    if (freshJobIds.has(entry.id)) continue;
    if (entry.status === "applied" || entry.status === "passed" || entry.status === "expired") {
      continue;
    }
    entry.status = "expired";
    expiredCount += 1;
  }
  return expiredCount;
}

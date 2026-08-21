import type { JobAgentLedgerEntry } from "./types.ts";

function entryKey(entry: JobAgentLedgerEntry): string {
  return `${entry.source}:${entry.id}`;
}

export function appendOpportunity(
  entries: JobAgentLedgerEntry[],
  added: JobAgentLedgerEntry,
): JobAgentLedgerEntry[] {
  const key = entryKey(added);
  return entries.some((entry) => entryKey(entry) === key) ? entries : [...entries, added];
}

export function toggleSelectedOpportunity(
  selectedKeys: Set<string>,
  key: string,
  checked: boolean,
): Set<string> {
  const next = new Set(selectedKeys);
  if (checked) next.add(key);
  else next.delete(key);
  return next;
}

export function selectOpportunityPage(
  selectedKeys: Set<string>,
  entries: JobAgentLedgerEntry[],
): Set<string> {
  const next = new Set(selectedKeys);
  for (const entry of entries) next.add(entryKey(entry));
  return next;
}

export function moveSelectedOpportunities(
  entries: JobAgentLedgerEntry[],
  sentEntries: JobAgentLedgerEntry[],
  selectedKeys: Set<string>,
): { entries: JobAgentLedgerEntry[]; sentEntries: JobAgentLedgerEntry[] } {
  const moved = entries.filter((entry) => selectedKeys.has(entryKey(entry)));
  return {
    entries: entries.filter((entry) => !selectedKeys.has(entryKey(entry))),
    sentEntries: [...sentEntries, ...moved],
  };
}

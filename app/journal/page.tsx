import { listJournalEntries, type JournalEntryListing } from "@/scripts/journal/store";
import { JournalComposer } from "./JournalComposer";
import { JournalEntryList } from "./JournalEntryList";

/** Entries and "today" change on every visit, so this page can't be statically generated. */
export const dynamic = "force-dynamic";

/** Graceful read, strict write: a history-read failure must never keep the composer from rendering. */
async function readEntries(): Promise<JournalEntryListing & { listFailed: boolean }> {
  try {
    return { ...(await listJournalEntries()), listFailed: false };
  } catch (error) {
    console.error("[journal] Failed to list entries:", error);
    return { entries: [], unreadableCount: 0, listFailed: true };
  }
}

export default async function JournalPage() {
  const { entries, unreadableCount, listFailed } = await readEntries();

  return (
    <main className="journal-shell">
      <JournalComposer />
      <JournalEntryList entries={entries} unreadableCount={unreadableCount} listFailed={listFailed} />
    </main>
  );
}

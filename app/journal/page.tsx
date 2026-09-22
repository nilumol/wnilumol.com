import { listJournalEntries } from "@/scripts/journal/db";
import { JournalComposer } from "./JournalComposer";
import { JournalEntryList } from "./JournalEntryList";

/** Entries and "today" change on every visit, so this page can't be statically generated. */
export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const entries = await listJournalEntries();

  return (
    <main className="journal-shell">
      <JournalComposer />
      <JournalEntryList entries={entries} />
    </main>
  );
}

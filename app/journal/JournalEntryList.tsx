"use client";

import type { JournalEntry } from "@/scripts/journal/store";

/**
 * A client component so timestamps format in the reader's own timezone (same convention as
 * JobAgentTable's postedAt formatting) rather than the server's.
 */
function formatEntryTimestamp(iso: string): string {
  const date = new Date(iso);
  const datePart = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timePart = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${datePart} · ${timePart}`;
}

export function JournalEntryList({ entries }: { entries: JournalEntry[] }) {
  return (
    <section className="journal-past" aria-label="Past entries">
      <p className="journal-eyebrow">Past entries</p>
      {entries.length === 0 ? (
        <p className="journal-empty">Nothing written yet. Your first entry will appear here.</p>
      ) : (
        <ul className="journal-entry-list">
          {entries.map((entry) => (
            <li key={entry.pathname} className="journal-entry">
              <time className="journal-entry-time" dateTime={entry.createdAt}>
                {formatEntryTimestamp(entry.createdAt)}
              </time>
              <p className="journal-entry-body">{entry.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

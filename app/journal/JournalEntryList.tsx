"use client";

import { useEffect, useState } from "react";
import { JournalCalendar } from "./JournalCalendar";
import { filterEntriesByDay } from "./calendar";
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

export function JournalEntryList({
  entries,
  unreadableCount = 0,
  listFailed = false,
}: {
  entries: JournalEntry[];
  unreadableCount?: number;
  listFailed?: boolean;
}) {
  const [ready, setReady] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  // Server and initial client markup must agree before reading the browser timezone.
  useEffect(() => { setReady(true); }, []);
  const visibleEntries = filterEntriesByDay(entries, selectedDay);

  return (
    <section className="journal-past" aria-label="Past entries">
      <p className="journal-eyebrow">Past entries</p>
      {!ready && !listFailed && (
        <p className="journal-calendar-note" role="status">
          <span className="spinner" aria-hidden="true" /> Loading calendar…
        </p>
      )}
      {ready && !listFailed && (
        <JournalCalendar entries={entries} selectedDay={selectedDay} onSelectDay={setSelectedDay} />
      )}
      {listFailed ? (
        <p className="journal-error" role="status">
          Past entries couldn&apos;t be loaded right now. You can still write today&apos;s entry.
        </p>
      ) : unreadableCount > 0 ? (
        <p className="journal-error" role="status">
          {unreadableCount === 1
            ? "One past entry couldn't be loaded right now."
            : `${unreadableCount} past entries couldn't be loaded right now.`}
        </p>
      ) : null}
      <div id="journal-day-entries">
        <div aria-live="polite" aria-atomic="true">
          {selectedDay && <h2 className="journal-selected-date">{selectedDay.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</h2>}
          {selectedDay && visibleEntries.length > 0 && <p className="journal-calendar-note">{visibleEntries.length} {visibleEntries.length === 1 ? "entry" : "entries"}</p>}
        </div>
        {listFailed ? null : selectedDay && visibleEntries.length === 0 ? (
          <p className="journal-empty" role="status">No entries for this day.</p>
        ) : entries.length === 0 && unreadableCount === 0 ? (
          <p className="journal-empty">Nothing written yet. Your first entry will appear here.</p>
        ) : (
          <ul className="journal-entry-list">
            {visibleEntries.map((entry) => (
              <li key={entry.pathname} className="journal-entry">
                <time className="journal-entry-time" dateTime={entry.createdAt}>
                  {ready ? formatEntryTimestamp(entry.createdAt) : " "}
                </time>
                <p className="journal-entry-body">{entry.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

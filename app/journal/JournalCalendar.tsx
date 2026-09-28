// Rendered only after JournalEntryList mounts, so dates use the reader's timezone.
import { useState } from "react";
import type { JournalEntry } from "@/scripts/journal/store";

import { localDayKey, countEntriesByDay, shiftMonth, monthGrid } from "./calendar";

export function JournalCalendar({ entries, selectedDay, onSelectDay }: {
  entries: JournalEntry[];
  selectedDay: Date | null;
  onSelectDay: (day: Date | null) => void;
}) {
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const counts = countEntriesByDay(entries);
  const todayKey = localDayKey(new Date());
  const { days, offset, cells } = monthGrid(month);

  return (
    <section className="journal-calendar" aria-label="Browse entries by date">
      <div className="journal-calendar-toolbar">
        <button type="button" className="journal-calendar-control" aria-label="Previous month" onClick={() => setMonth((current) => shiftMonth(current, -1))}>←</button>
        <h2 aria-live="polite">{month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h2>
        <button type="button" className="journal-calendar-control" aria-label="Next month" onClick={() => setMonth((current) => shiftMonth(current, 1))}>→</button>
      </div>
      <div className="journal-calendar-grid">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day} className="journal-calendar-weekday" aria-hidden="true">{day}</span>)}
        {Array.from({ length: cells }, (_, index) => {
          const day = index - offset + 1;
          if (day < 1 || day > days) return <span key={index} aria-hidden="true" />;
          const date = new Date(month.getFullYear(), month.getMonth(), day);
          const key = localDayKey(date);
          const count = counts.get(key) ?? 0;
          const selected = selectedDay !== null && localDayKey(selectedDay) === key;
          const label = date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
          return (
            <button key={index} type="button" className={`journal-calendar-day${count ? " has-entries" : ""}`} aria-label={`${label}, ${count} ${count === 1 ? "entry" : "entries"}`} aria-pressed={selected} aria-current={key === todayKey ? "date" : undefined} aria-controls="journal-day-entries" onClick={() => onSelectDay(date)}>
              <span>{day}</span>
              <small aria-hidden="true">{count > 0 ? count : "\u00a0"}</small>
            </button>
          );
        })}
      </div>
      <div className="journal-calendar-footer">
        <p className="journal-calendar-note">Select a day to read its entries.</p>
        <div className="journal-calendar-actions">
          <button type="button" className="journal-calendar-control" onClick={() => {
            const today = new Date();
            setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
            onSelectDay(today);
          }}>Today</button>
          <button type="button" className="journal-calendar-control" aria-pressed={selectedDay === null} onClick={() => onSelectDay(null)}>All entries</button>
        </div>
      </div>
    </section>
  );
}

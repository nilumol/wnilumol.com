"use client";

import { useActionState, useEffect, useState } from "react";
import { initialJournalActionState, submitJournalEntry } from "./actions";

export function JournalComposer() {
  const [todayLabel, setTodayLabel] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [state, formAction, isPending] = useActionState(submitJournalEntry, initialJournalActionState);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    setTodayLabel(
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    );
  }, []);

  useEffect(() => {
    if (state.status === "idle") return;
    setShowStatus(true);
    if (state.status === "success") {
      setDraft("");
    }
  }, [state]);

  return (
    <section className="journal-compose" aria-labelledby="journal-date-heading">
      <header className="journal-header">
        <p className="journal-eyebrow">Today</p>
        <h1 id="journal-date-heading" className="journal-date">
          {todayLabel ?? " "}
        </h1>
      </header>

      <form action={formAction} className="journal-form">
        <label htmlFor="journal-entry-body" className="journal-sr-only">
          Journal entry
        </label>
        <textarea
          id="journal-entry-body"
          name="body"
          className="journal-textarea"
          placeholder="Begin writing…"
          autoFocus
          required
          rows={10}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setShowStatus(false);
          }}
        />
        <div className="journal-form-footer">
          <button type="submit" className="journal-submit" disabled={isPending}>
            {isPending && <span className="spinner" aria-hidden="true" />}
            {isPending ? "Saving…" : "Save entry"}
          </button>
          {showStatus && state.status === "success" && (
            <p className="journal-confirm" role="status">
              Saved. Ready for another entry.
            </p>
          )}
          {showStatus && state.status === "error" && (
            <p className="journal-error" role="alert">
              {state.message}
            </p>
          )}
        </div>
      </form>
    </section>
  );
}

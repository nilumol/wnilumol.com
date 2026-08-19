"use client";

import { useState } from "react";
import type { JobScoutLedgerEntry } from "@/scripts/job-scout/types";
import { JobScoutTable } from "./JobScoutTable";

function entryKey(entry: JobScoutLedgerEntry): string {
  return `${entry.source}:${entry.id}`;
}

export function JobScoutSections({ entries: initialEntries }: { entries: JobScoutLedgerEntry[] }) {
  const [entries, setEntries] = useState(initialEntries);
  const [sentCount, setSentCount] = useState(0);

  function handleSend(sentKeys: Set<string>) {
    setEntries((current) => current.filter((entry) => !sentKeys.has(entryKey(entry))));
    setSentCount((count) => count + sentKeys.size);
  }

  return (
    <div className="job-scout-sections">
      <details className="job-scout-section" open>
        <summary className="job-scout-section-summary">
          <h2>Opportunities</h2>
          <span className="job-scout-chevron" aria-hidden="true">
            ▶
          </span>
        </summary>
        <div className="job-scout-section-body">
          {entries.length === 0 ? (
            <p className="job-scout-placeholder">Nothing left in Opportunities this session.</p>
          ) : (
            <JobScoutTable entries={entries} onSend={handleSend} />
          )}
        </div>
      </details>

      <details className="job-scout-section">
        <summary className="job-scout-section-summary">
          <h2>Tracker</h2>
          <span className="job-scout-chevron" aria-hidden="true">
            ▶
          </span>
        </summary>
        <div className="job-scout-section-body">
          <p className="job-scout-placeholder">Tracking isn&apos;t built yet.</p>
        </div>
      </details>

      <details className="job-scout-section">
        <summary className="job-scout-section-summary">
          <h2>Tailor My Profile</h2>
          <span className="job-scout-chevron" aria-hidden="true">
            ▶
          </span>
        </summary>
        <div className="job-scout-section-body">
          <p className="job-scout-placeholder">
            {sentCount > 0
              ? `${sentCount} sent — Tailor My Profile isn't built yet.`
              : "Tailor My Profile isn't built yet."}
          </p>
        </div>
      </details>
    </div>
  );
}

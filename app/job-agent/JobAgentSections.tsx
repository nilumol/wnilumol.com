"use client";

import { useState } from "react";
import type { JobAgentLedgerEntry } from "@/scripts/job-agent/types";
import { JobAgentTable } from "./JobAgentTable";
import { JobAgentTailor } from "./JobAgentTailor";
import { JobAgentTracker } from "./JobAgentTracker";

function entryKey(entry: JobAgentLedgerEntry): string {
  return `${entry.source}:${entry.id}`;
}

export function JobAgentSections({ entries: initialEntries }: { entries: JobAgentLedgerEntry[] }) {
  const [entries, setEntries] = useState(initialEntries);
  const [sentEntries, setSentEntries] = useState<JobAgentLedgerEntry[]>([]);
  const trackedEntries = initialEntries.filter(
    (entry) => entry.status === "applied" || entry.status === "passed",
  );

  function handleSend(sentKeys: Set<string>) {
    setEntries((current) => current.filter((entry) => !sentKeys.has(entryKey(entry))));
    setSentEntries((current) => [
      ...current,
      ...entries.filter((entry) => sentKeys.has(entryKey(entry))),
    ]);
  }

  return (
    <div className="job-agent-sections">
      <details className="job-agent-section" open>
        <summary className="job-agent-section-summary">
          <h2>Opportunities</h2>
          <span className="job-agent-chevron" aria-hidden="true">
            ▶
          </span>
        </summary>
        <div className="job-agent-section-body">
          {entries.length === 0 ? (
            <p className="job-agent-placeholder">Nothing left in Opportunities this session.</p>
          ) : (
            <JobAgentTable entries={entries} onSend={handleSend} />
          )}
        </div>
      </details>

      <details className="job-agent-section">
        <summary className="job-agent-section-summary">
          <h2>Tailor My Profile</h2>
          <span className="job-agent-chevron" aria-hidden="true">
            ▶
          </span>
        </summary>
        <div className="job-agent-section-body">
          <JobAgentTailor entries={sentEntries} />
        </div>
      </details>

      <details className="job-agent-section">
        <summary className="job-agent-section-summary">
          <h2>Tracker</h2>
          <span className="job-agent-chevron" aria-hidden="true">
            ▶
          </span>
        </summary>
        <div className="job-agent-section-body">
          <JobAgentTracker entries={trackedEntries} />
        </div>
      </details>
    </div>
  );
}

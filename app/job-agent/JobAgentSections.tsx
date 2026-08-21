"use client";

import { useState } from "react";
import { appendOpportunity, moveSelectedOpportunities } from "@/scripts/job-agent/opportunity-session";
import type { JobAgentLedgerEntry } from "@/scripts/job-agent/types";
import { JobAgentOpportunityIntake } from "./JobAgentOpportunityIntake";
import { JobAgentTable } from "./JobAgentTable";
import { JobAgentTailor } from "./JobAgentTailor";
import { JobAgentTracker } from "./JobAgentTracker";

export function JobAgentSections({
  entries: initialEntries,
  trackedEntries,
}: {
  entries: JobAgentLedgerEntry[];
  /**
   * Tracker's full row list, computed server-side in page.tsx from stored opportunities plus the
   * live Blob status overlay - not derived here, since a marked-applied/passed job may no longer
   * be part of `initialEntries` if its underlying posting has since expired. See
   * scripts/job-agent/tracker-overlay.ts.
   */
  trackedEntries: JobAgentLedgerEntry[];
}) {
  const [session, setSession] = useState({ entries: initialEntries, sentEntries: [] as JobAgentLedgerEntry[] });

  function handleSend(sentKeys: Set<string>) {
    setSession((current) => moveSelectedOpportunities(current.entries, current.sentEntries, sentKeys));
  }

  function handleAdded(entry: JobAgentLedgerEntry) {
    setSession((current) => ({ ...current, entries: appendOpportunity(current.entries, entry) }));
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
          <JobAgentOpportunityIntake onAdded={handleAdded} />
          {session.entries.length === 0 ? (
            <p className="job-agent-placeholder">Nothing left in Opportunities this session.</p>
          ) : (
            <JobAgentTable entries={session.entries} onSend={handleSend} />
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
          <JobAgentTailor entries={session.sentEntries} />
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

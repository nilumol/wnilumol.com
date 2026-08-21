import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import ledgerJson from "@/content/job-agent-seen.json";
import { mergeTrackerEntries, readTrackerOverlay } from "@/scripts/job-agent/tracker-overlay";
import type { JobAgentLedger } from "@/scripts/job-agent/types";
import { JobAgentSections } from "./JobAgentSections";

export const metadata: Metadata = {
  title: "Job Application Agent",
  robots: { index: false, follow: false },
};

/**
 * Tracker now depends on the live Blob status overlay (scripts/job-agent/tracker-overlay.ts),
 * read at request time - this page can no longer be statically generated at build time the way
 * it could when it only read the ledger's build-time JSON import. The tradeoff: every load now
 * does one Blob read server-side instead of serving a build-time-cached page; acceptable for a
 * low-traffic hidden internal tool. The ledger import above stays a build-time static import -
 * only the overlay read is dynamic.
 */
export const dynamic = "force-dynamic";

const ledger = ledgerJson as unknown as JobAgentLedger;

export default async function JobAgentPage() {
  const nonExpiredEntries = Object.values(ledger).filter((entry) => entry.status !== "expired");
  // Missing/misconfigured Blob credentials (e.g. local dev without JOB_AGENT_TRACKER_READ_WRITE_TOKEN
  // set) degrade to "no live overlay rows" rather than crashing the whole hidden page - Tracker
  // still shows hand-set ledger rows. The write path (the Mark Applied/Passed action itself)
  // fails loudly instead; see app/api/job-agent/tailor/status/route.ts.
  const overlay = await readTrackerOverlay().catch(() => ({}));
  const trackedEntries = mergeTrackerEntries(nonExpiredEntries, overlay);

  return (
    <main className="page-shell">
      <SiteHeader />
      <section className="page-content job-agent-page">
        <header className="page-intro job-agent-intro">
          <p className="eyebrow">Private</p>
          <h1>Job Application Agent</h1>
          <p>
            The job application agent helps aggregate, filter, tailor, and track the applications
            that are relevant to your career.
          </p>
        </header>

        {nonExpiredEntries.length === 0 && trackedEntries.length === 0 ? (
          <p className="job-agent-empty">No jobs tracked yet. The daily scan runs at 13:00 UTC.</p>
        ) : (
          <JobAgentSections entries={nonExpiredEntries} trackedEntries={trackedEntries} />
        )}
      </section>
    </main>
  );
}

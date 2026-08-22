import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import ledgerJson from "@/content/job-agent-seen.json";
import { mergeOpportunityEntries, readManualOpportunities } from "@/scripts/job-agent/manual-opportunities";
import { mergeTrackerEntries, readTrackerOverlay } from "@/scripts/job-agent/tracker-overlay";
import type { JobAgentLedger } from "@/scripts/job-agent/types";
import { JobAgentSections } from "./JobAgentSections";

export const metadata: Metadata = {
  title: "Job Application Agent",
  robots: { index: false, follow: false },
};

/**
 * Tracker and manual intake depend on two small live Blob JSON documents, read at request time -
 * this page can no longer be statically generated at build time the way it could when it only
 * read the ledger's build-time JSON import. The tradeoff is acceptable for a low-traffic hidden
 * internal tool. The git ledger import above stays a build-time static import.
 */
export const dynamic = "force-dynamic";

const ledger = ledgerJson as unknown as JobAgentLedger;

export default async function JobAgentPage() {
  const ledgerEntries = Object.values(ledger).filter((entry) => entry.status !== "expired");
  // Missing/misconfigured Blob credentials (e.g. local dev without JOB_AGENT_TRACKER_READ_WRITE_TOKEN
  // set) degrade to "no live Blob rows" rather than crashing the whole hidden page - the git
  // ledger still renders. Intake and status writes fail loudly instead; see docs/job-agent.md.
  const [overlay, manualStore] = await Promise.all([
    readTrackerOverlay().catch(() => ({})),
    readManualOpportunities().catch(() => ({})),
  ]);
  const nonExpiredEntries = mergeOpportunityEntries(ledgerEntries, manualStore).filter(
    (entry) => entry.status !== "expired",
  );
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

        <JobAgentSections entries={nonExpiredEntries} trackedEntries={trackedEntries} />
      </section>
    </main>
  );
}

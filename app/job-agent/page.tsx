import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import ledgerJson from "@/content/job-agent-seen.json";
import type { JobAgentLedger } from "@/scripts/job-agent/types";
import { JobAgentSections } from "./JobAgentSections";

export const metadata: Metadata = {
  title: "Job Application Agent",
  robots: { index: false, follow: false },
};

const ledger = ledgerJson as unknown as JobAgentLedger;

export default function JobAgentPage() {
  const entries = Object.values(ledger).filter((entry) => entry.status !== "expired");

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

        {entries.length === 0 ? (
          <p className="job-agent-empty">No jobs tracked yet. The daily scan runs at 13:00 UTC.</p>
        ) : (
          <JobAgentSections entries={entries} />
        )}
      </section>
    </main>
  );
}

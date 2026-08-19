import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import ledgerJson from "@/content/job-scout-seen.json";
import type { JobScoutLedger } from "@/scripts/job-scout/types";
import { JobScoutSections } from "./JobScoutSections";

export const metadata: Metadata = {
  title: "Job Scout",
  robots: { index: false, follow: false },
};

const ledger = ledgerJson as unknown as JobScoutLedger;

export default function JobScoutPage() {
  const entries = Object.values(ledger).filter((entry) => entry.status !== "expired");

  return (
    <main className="page-shell">
      <SiteHeader />
      <section className="page-content job-scout-page">
        <header className="page-intro job-scout-intro">
          <p className="eyebrow">Private</p>
          <h1>Job Scout</h1>
          <p>
            A daily scan of tracked companies&apos; job boards, pre-filtered to role families that fit
            my background. New postings land as pending, then get scored for fit against my
            resume. Not indexed, not linked from navigation - a working tool, not a public page.
          </p>
        </header>

        {entries.length === 0 ? (
          <p className="job-scout-empty">No jobs tracked yet. The daily scan runs at 13:00 UTC.</p>
        ) : (
          <JobScoutSections entries={entries} />
        )}
      </section>
    </main>
  );
}

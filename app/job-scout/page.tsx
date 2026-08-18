import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { STRONG_FIT_CUTOFF } from "@/content/job-scout-config";
import ledgerJson from "@/content/job-scout-seen.json";
import type { JobScoutLedger, JobScoutLedgerEntry } from "@/scripts/job-scout/types";

export const metadata: Metadata = {
  title: "Job Scout",
  robots: { index: false, follow: false },
};

const ledger = ledgerJson as unknown as JobScoutLedger;

function groupByCompany(entries: JobScoutLedgerEntry[]): Map<string, JobScoutLedgerEntry[]> {
  const groups = new Map<string, JobScoutLedgerEntry[]>();
  for (const entry of entries) {
    const group = groups.get(entry.company) ?? [];
    group.push(entry);
    groups.set(entry.company, group);
  }
  for (const group of groups.values()) {
    group.sort((a, b) => b.fitScore - a.fitScore || a.title.localeCompare(b.title));
  }
  return groups;
}

export default function JobScoutPage() {
  const activeEntries = Object.values(ledger).filter((entry) => entry.status !== "expired");
  const groups = groupByCompany(activeEntries);
  const companies = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b));

  return (
    <main className="page-shell">
      <SiteHeader />
      <section className="page-content job-scout-page">
        <header className="page-intro job-scout-intro">
          <p className="eyebrow">Private</p>
          <h1>Job Scout</h1>
          <p>
            A daily Greenhouse scan pre-filtered to role families that fit my background, scored
            for fit against my resume. Not indexed, not linked from navigation - a working tool,
            not a public page.
          </p>
        </header>

        {companies.length === 0 ? (
          <p className="job-scout-empty">
            No scored jobs yet. The daily scan runs at 13:00 UTC and needs{" "}
            <code>ANTHROPIC_API_KEY</code> set as a GitHub Actions repository secret before it can
            score anything.
          </p>
        ) : (
          companies.map((company) => {
            const entries = groups.get(company);
            if (!entries) return null;
            return (
              <section key={company} className="job-scout-company">
                <h2>{company}</h2>
                <div className="job-scout-list">
                  {entries.map((entry) => (
                    <JobScoutCard key={entry.id} entry={entry} />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </section>
    </main>
  );
}

function JobScoutCard({ entry }: { entry: JobScoutLedgerEntry }) {
  const strongFit = entry.fitScore >= STRONG_FIT_CUTOFF;

  return (
    <article className="job-scout-card">
      <div className="job-scout-card-header">
        <h3>{entry.title}</h3>
        <span className={strongFit ? "job-scout-score strong" : "job-scout-score"}>
          {entry.fitScore}/10
        </span>
      </div>
      <p className="job-scout-rationale">{entry.fitRationale}</p>
      <div className="job-scout-card-footer">
        <a className="text-link" href={entry.absoluteUrl} target="_blank" rel="noreferrer">
          View posting
        </a>
        {!strongFit && entry.resumeNotesPath ? (
          <Link className="text-link" href={`/job-scout/notes/${entry.id}`}>
            Resume notes
          </Link>
        ) : null}
        {entry.status !== "scored" ? (
          <span className="job-scout-status">{entry.status}</span>
        ) : null}
      </div>
    </article>
  );
}

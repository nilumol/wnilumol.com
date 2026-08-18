import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { STRONG_FIT_CUTOFF } from "@/content/job-scout-config";
import ledgerJson from "@/content/job-scout-seen.json";
import type { JobScoutLedger, JobScoutLedgerEntry } from "@/scripts/job-scout/types";

export const metadata: Metadata = {
  title: "Job Scout",
  robots: { index: false, follow: false },
};

const ledger = ledgerJson as unknown as JobScoutLedger;

type FitScoreTier = "strong" | "moderate" | "weak";

function fitScoreTier(score: number): FitScoreTier {
  if (score >= STRONG_FIT_CUTOFF) return "strong";
  if (score >= 5) return "moderate";
  return "weak";
}

export default function JobScoutPage() {
  const entries = Object.values(ledger)
    .filter((entry) => entry.status !== "expired")
    .sort((a, b) => b.fitScore - a.fitScore || a.title.localeCompare(b.title));

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

        {entries.length === 0 ? (
          <p className="job-scout-empty">
            No scored jobs yet. The daily scan runs at 13:00 UTC and needs{" "}
            <code>ANTHROPIC_API_KEY</code> set as a GitHub Actions repository secret before it can
            score anything.
          </p>
        ) : (
          <div className="job-scout-table-wrap">
            <table className="job-scout-table">
              <thead>
                <tr>
                  <th>Job title</th>
                  <th>Company</th>
                  <th>Role</th>
                  <th>Location</th>
                  <th>Pay</th>
                  <th>Link</th>
                  <th>Fit score</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <JobScoutRow key={entry.id} entry={entry} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function JobScoutRow({ entry }: { entry: JobScoutLedgerEntry }) {
  const tier = fitScoreTier(entry.fitScore);

  return (
    <tr>
      <td>
        {entry.title}
        {entry.status !== "scored" ? (
          <span className="job-scout-status">{entry.status}</span>
        ) : null}
      </td>
      <td>{entry.company}</td>
      <td>{entry.keywordFamily}</td>
      <td>{entry.location ?? "Not listed"}</td>
      <td>{entry.compensationRange ?? "Not listed"}</td>
      <td>
        <a className="text-link" href={entry.absoluteUrl} target="_blank" rel="noreferrer">
          View
        </a>
      </td>
      <td>
        <span className={`job-scout-pill job-scout-pill-${tier}`}>{entry.fitScore}/10</span>
      </td>
    </tr>
  );
}

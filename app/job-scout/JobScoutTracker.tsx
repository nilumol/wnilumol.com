import type { JobScoutLedgerEntry } from "@/scripts/job-scout/types";

function entryKey(entry: JobScoutLedgerEntry): string {
  return `${entry.source}:${entry.id}`;
}

function compareEntries(a: JobScoutLedgerEntry, b: JobScoutLedgerEntry): number {
  return a.company.localeCompare(b.company) || a.title.localeCompare(b.title);
}

export function JobScoutTracker({ entries }: { entries: JobScoutLedgerEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="job-scout-placeholder">
        Nothing tracked yet — mark a job <code>applied</code> or <code>passed</code> in the ledger
        to see it here.
      </p>
    );
  }

  const sortedEntries = [...entries].sort(compareEntries);

  return (
    <div className="job-scout-table-wrap">
      <table className="job-scout-table">
        <thead>
          <tr>
            <th>Job title</th>
            <th>Company</th>
            <th>Status</th>
            <th>Location</th>
            <th>Link</th>
          </tr>
        </thead>
        <tbody>
          {sortedEntries.map((entry) => (
            <tr key={entryKey(entry)}>
              <td>{entry.title}</td>
              <td>{entry.company}</td>
              <td>
                <span className={`job-scout-pill job-scout-pill-${entry.status}`}>{entry.status}</span>
              </td>
              <td>{entry.location ?? "Not listed"}</td>
              <td>
                <a className="text-link" href={entry.absoluteUrl} target="_blank" rel="noreferrer">
                  View
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

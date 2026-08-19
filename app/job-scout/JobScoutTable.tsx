"use client";

import { useMemo, useState } from "react";
import { STRONG_FIT_CUTOFF } from "@/content/job-scout-config";
import type { JobScoutLedgerEntry } from "@/scripts/job-scout/types";

type SortKey = "title" | "company" | "role" | "location" | "posted" | "pay" | "link" | "fitScore";
type SortDirection = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "title", label: "Job title" },
  { key: "company", label: "Company" },
  { key: "role", label: "Role" },
  { key: "location", label: "Location" },
  { key: "posted", label: "Posted" },
  { key: "pay", label: "Pay" },
  { key: "link", label: "Link" },
  { key: "fitScore", label: "Fit score" },
];

type FitScoreTier = "strong" | "moderate" | "weak";

function fitScoreTier(score: number): FitScoreTier {
  if (score >= STRONG_FIT_CUTOFF) return "strong";
  if (score >= 5) return "moderate";
  return "weak";
}

function formatPostedDate(postedAt: string | undefined): string | null {
  if (!postedAt) return null;
  const date = new Date(postedAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Missing postedAt sorts as the earliest possible date, consistently, rather than crashing. */
function postedSortValue(postedAt: string | undefined): number {
  if (!postedAt) return -Infinity;
  const time = new Date(postedAt).getTime();
  return Number.isNaN(time) ? -Infinity : time;
}

/** Pending (or otherwise unscored) rows sort as the lowest possible fit-score value. */
function fitScoreSortValue(entry: JobScoutLedgerEntry): number {
  if (entry.status === "pending" || entry.fitScore === undefined) return -Infinity;
  return entry.fitScore;
}

function sortValue(entry: JobScoutLedgerEntry, key: SortKey): string | number {
  switch (key) {
    case "title":
      return entry.title;
    case "company":
      return entry.company;
    case "role":
      return entry.keywordFamily;
    case "location":
      return entry.location ?? "";
    case "posted":
      return postedSortValue(entry.postedAt);
    case "pay":
      return entry.compensationRange ?? "";
    case "link":
      return entry.absoluteUrl;
    case "fitScore":
      return fitScoreSortValue(entry);
  }
}

function compareEntries(
  a: JobScoutLedgerEntry,
  b: JobScoutLedgerEntry,
  key: SortKey,
  direction: SortDirection,
): number {
  const valueA = sortValue(a, key);
  const valueB = sortValue(b, key);
  const raw =
    typeof valueA === "number" && typeof valueB === "number"
      ? valueA - valueB
      : String(valueA).localeCompare(String(valueB));
  const result = raw !== 0 ? raw : a.title.localeCompare(b.title);
  return direction === "asc" ? result : -result;
}

export function JobScoutTable({ entries }: { entries: JobScoutLedgerEntry[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("fitScore");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => compareEntries(a, b, sortKey, sortDirection)),
    [entries, sortKey, sortDirection],
  );

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection(key === "fitScore" ? "desc" : "asc");
    }
  }

  return (
    <div className="job-scout-table-wrap">
      <table className="job-scout-table">
        <thead>
          <tr>
            {COLUMNS.map((column) => {
              const isActive = column.key === sortKey;
              return (
                <th key={column.key} aria-sort={isActive ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}>
                  <button type="button" className="job-scout-sort-button" onClick={() => handleSort(column.key)}>
                    {column.label}
                    <span className="job-scout-sort-caret" aria-hidden="true">
                      {isActive ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedEntries.map((entry) => (
            <JobScoutRow key={`${entry.source}:${entry.id}`} entry={entry} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function JobScoutRow({ entry }: { entry: JobScoutLedgerEntry }) {
  const isPending = entry.status === "pending" || entry.fitScore === undefined;
  const tier = !isPending ? fitScoreTier(entry.fitScore!) : null;
  const postedLabel = formatPostedDate(entry.postedAt);

  return (
    <tr className={isPending ? "job-scout-row-pending" : undefined}>
      <td>
        {entry.title}
        {entry.status !== "scored" ? <span className="job-scout-status">{entry.status}</span> : null}
      </td>
      <td>{entry.company}</td>
      <td>{entry.keywordFamily}</td>
      <td>{entry.location ?? "Not listed"}</td>
      <td>
        {postedLabel ?? <span className="job-scout-placeholder">Not captured</span>}
      </td>
      <td>
        {entry.compensationRange ?? <span className="job-scout-placeholder">Not listed</span>}
      </td>
      <td>
        <a className="text-link" href={entry.absoluteUrl} target="_blank" rel="noreferrer">
          View
        </a>
      </td>
      <td>
        {isPending ? (
          <span className="job-scout-pill job-scout-pill-pending">pending</span>
        ) : (
          <span className={`job-scout-pill job-scout-pill-${tier}`}>{entry.fitScore}/10</span>
        )}
      </td>
    </tr>
  );
}

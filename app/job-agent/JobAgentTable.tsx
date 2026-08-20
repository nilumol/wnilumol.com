"use client";

import { useMemo, useState } from "react";
import { STRONG_FIT_CUTOFF } from "@/content/job-agent-config";
import type { JobAgentLedgerEntry } from "@/scripts/job-agent/types";

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
function fitScoreSortValue(entry: JobAgentLedgerEntry): number {
  if (entry.status === "pending" || entry.fitScore === undefined) return -Infinity;
  return entry.fitScore;
}

function sortValue(entry: JobAgentLedgerEntry, key: SortKey): string | number {
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
  a: JobAgentLedgerEntry,
  b: JobAgentLedgerEntry,
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

function entryKey(entry: JobAgentLedgerEntry): string {
  return `${entry.source}:${entry.id}`;
}

const PAGE_SIZE = 30;

export function JobAgentTable({
  entries,
  onSend,
}: {
  entries: JobAgentLedgerEntry[];
  onSend: (selectedKeys: Set<string>) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("fitScore");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(0);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => compareEntries(a, b, sortKey, sortDirection)),
    [entries, sortKey, sortDirection],
  );

  const totalPages = Math.max(1, Math.ceil(sortedEntries.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageStart = currentPage * PAGE_SIZE;
  const pageEntries = sortedEntries.slice(pageStart, pageStart + PAGE_SIZE);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection(key === "fitScore" ? "desc" : "asc");
    }
    setPage(0);
  }

  function toggleRow(key: string, checked: boolean) {
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }

  function handleSelectAll() {
    setSelectedKeys((current) => {
      const next = new Set(current);
      for (const entry of pageEntries) next.add(entryKey(entry));
      return next;
    });
  }

  function handleSend() {
    if (selectedKeys.size === 0) return;
    onSend(selectedKeys);
    setSelectedKeys(new Set());
  }

  return (
    <div>
      <div className="job-agent-toolbar">
        <p className="job-agent-toolbar-count">
          <strong>{selectedKeys.size}</strong> selected
        </p>
        <div className="job-agent-toolbar-actions">
          <button type="button" className="job-agent-btn" onClick={handleSelectAll}>
            Select All
          </button>
          <button
            type="button"
            className="job-agent-btn job-agent-btn-primary"
            onClick={handleSend}
            disabled={selectedKeys.size === 0}
          >
            Send
          </button>
        </div>
      </div>

      <div className="job-agent-table-wrap">
        <table className="job-agent-table">
          <thead>
            <tr>
              <th aria-hidden="true" />
              {COLUMNS.map((column) => {
                const isActive = column.key === sortKey;
                return (
                  <th key={column.key} aria-sort={isActive ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}>
                    <button type="button" className="job-agent-sort-button" onClick={() => handleSort(column.key)}>
                      {column.label}
                      <span className="job-agent-sort-caret" aria-hidden="true">
                        {isActive ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pageEntries.map((entry) => {
              const key = entryKey(entry);
              return (
                <JobAgentRow
                  key={key}
                  entry={entry}
                  selected={selectedKeys.has(key)}
                  onToggle={(checked) => toggleRow(key, checked)}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="job-agent-pagination">
        <button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 0}>
          ← Previous
        </button>
        <span className="job-agent-pagination-info">
          Page {currentPage + 1} of {totalPages} · rows{" "}
          {sortedEntries.length === 0 ? 0 : pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, sortedEntries.length)} of{" "}
          {sortedEntries.length}
        </span>
        <button
          type="button"
          onClick={() => setPage(currentPage + 1)}
          disabled={currentPage >= totalPages - 1}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

function JobAgentRow({
  entry,
  selected,
  onToggle,
}: {
  entry: JobAgentLedgerEntry;
  selected: boolean;
  onToggle: (checked: boolean) => void;
}) {
  const isPending = entry.status === "pending" || entry.fitScore === undefined;
  const tier = !isPending ? fitScoreTier(entry.fitScore!) : null;
  const postedLabel = formatPostedDate(entry.postedAt);

  return (
    <tr className={[isPending ? "job-agent-row-pending" : "", selected ? "job-agent-row-selected" : ""].join(" ").trim() || undefined}>
      <td>
        <input
          type="checkbox"
          className="job-agent-row-check"
          checked={selected}
          onChange={(event) => onToggle(event.target.checked)}
          aria-label={`Select ${entry.title} at ${entry.company}`}
        />
      </td>
      <td>
        {entry.title}
        {entry.status !== "scored" ? <span className="job-agent-status">{entry.status}</span> : null}
      </td>
      <td>{entry.company}</td>
      <td>{entry.keywordFamily}</td>
      <td>{entry.location ?? "Not listed"}</td>
      <td>
        {postedLabel ?? <span className="job-agent-placeholder">Not captured</span>}
      </td>
      <td>
        {entry.compensationRange ?? <span className="job-agent-placeholder">Not listed</span>}
      </td>
      <td>
        <a className="text-link" href={entry.absoluteUrl} target="_blank" rel="noreferrer">
          View
        </a>
      </td>
      <td>
        {isPending ? (
          <span className="job-agent-pill job-agent-pill-pending">pending</span>
        ) : (
          <span className={`job-agent-pill job-agent-pill-${tier}`}>{entry.fitScore}/10</span>
        )}
      </td>
    </tr>
  );
}

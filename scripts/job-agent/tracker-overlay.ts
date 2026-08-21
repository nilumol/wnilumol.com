import { get, put } from "@vercel/blob";
import { ledgerKey } from "./ledger.ts";
import type { JobAgentLedgerEntry, JobAgentSource } from "./types.ts";

/**
 * The live-writable status path for "Mark Applied"/"Mark Passed" (from Tailor My Profile),
 * layered on top of the git-committed ledger at render time rather than replacing it. The
 * ledger (`content/job-agent-seen.json`) stays the sole source of truth for job data and is
 * written only by the daily scan and the manual scoring scripts; this overlay is the only place
 * a browser click can persist anything, and it never touches git. See docs/job-agent.md.
 */
export type TrackerOverlayStatus = Extract<JobAgentLedgerEntry["status"], "applied" | "passed">;

/**
 * A snapshot of the fields Tracker needs to render a row, captured at the moment of marking
 * rather than resolved from the ledger at read time. This is deliberate: the daily scan flips a
 * ledger entry's own `status` to "expired" once its posting disappears from the board (which is
 * exactly what tends to happen once you've been hired or the req closes), and `/job-agent`
 * drops expired ledger entries before Tracker ever sees them. Snapshotting keeps a marked job
 * visible in Tracker regardless of what later happens to the underlying posting.
 */
export interface TrackerOverlayEntry {
  status: TrackerOverlayStatus;
  title: string;
  company: string;
  location: string | null;
  absoluteUrl: string;
  updatedAt: string;
}

/** One small JSON document, keyed by `<source>:<id>` (same key shape as the ledger). */
export type TrackerOverlay = Record<string, TrackerOverlayEntry>;

const OVERLAY_PATHNAME = "job-agent/tracker-overlay.json";

function blobToken(): string {
  const token = process.env.JOB_AGENT_TRACKER_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("JOB_AGENT_TRACKER_READ_WRITE_TOKEN is not configured.");
  }
  return token;
}

/** Defensive parse: no blob yet, an empty body, or malformed JSON all read as no overlay entries. */
export function parseTrackerOverlay(raw: string): TrackerOverlay {
  if (!raw.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    return parsed as TrackerOverlay;
  } catch {
    return {};
  }
}

/** Reads the live status overlay. Returns `{}` when the blob doesn't exist yet (first-ever mark). */
export async function readTrackerOverlay(): Promise<TrackerOverlay> {
  const token = blobToken();
  const result = await get(OVERLAY_PATHNAME, { access: "private", token, useCache: false });
  if (!result || result.statusCode !== 200) return {};
  const text = await new Response(result.stream).text();
  return parseTrackerOverlay(text);
}

/**
 * Records one job as applied/passed. Read-modify-write against the single overlay document -
 * acceptable for this single-user hidden tool without any locking, since clicks never race in
 * practice. Retention is indefinite by design, matching the ledger's own "expired but retained
 * forever" precedent - there is no cleanup path here, deliberately.
 */
export async function writeTrackerOverlayEntry(
  key: string,
  status: TrackerOverlayStatus,
  entry: JobAgentLedgerEntry,
): Promise<TrackerOverlay> {
  const token = blobToken();
  const current = await readTrackerOverlay();
  const next: TrackerOverlay = {
    ...current,
    [key]: {
      status,
      title: entry.title,
      company: entry.company,
      location: entry.location,
      absoluteUrl: entry.absoluteUrl,
      updatedAt: new Date().toISOString(),
    },
  };
  await put(OVERLAY_PATHNAME, JSON.stringify(next, null, 2), {
    access: "private",
    token,
    contentType: "application/json",
    allowOverwrite: true,
  });
  return next;
}

function overlayEntryToLedgerEntry(key: string, overlayEntry: TrackerOverlayEntry): JobAgentLedgerEntry {
  const separatorIndex = key.indexOf(":");
  const source = key.slice(0, separatorIndex) as JobAgentSource;
  const id = key.slice(separatorIndex + 1);
  return {
    id,
    source,
    company: overlayEntry.company,
    title: overlayEntry.title,
    keywordFamily: "",
    absoluteUrl: overlayEntry.absoluteUrl,
    firstSeen: overlayEntry.updatedAt,
    status: overlayEntry.status,
    location: overlayEntry.location,
    compensationRange: null,
  };
}

/**
 * Tracker's full row list: hand-set ledger entries (`status: applied`/`passed`, edited directly
 * in the ledger by the captain) plus live overlay entries, keyed so an overlay mark always wins
 * over a stale ledger row for the same job. `nonExpiredEntries` is the same non-expired ledger
 * slice Opportunities already reads - passing the full ledger isn't necessary since a hand-set
 * applied/passed status is never "expired" by definition.
 */
export function mergeTrackerEntries(
  nonExpiredEntries: JobAgentLedgerEntry[],
  overlay: TrackerOverlay,
): JobAgentLedgerEntry[] {
  const handSetEntries = nonExpiredEntries.filter(
    (entry) =>
      (entry.status === "applied" || entry.status === "passed") &&
      !(ledgerKey(entry.source, entry.id) in overlay),
  );
  const overlayEntries = Object.entries(overlay).map(([key, value]) => overlayEntryToLedgerEntry(key, value));
  return [...handSetEntries, ...overlayEntries];
}

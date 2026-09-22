import { randomUUID } from "node:crypto";
import { get, list, put } from "@vercel/blob";

export type JournalEntry = {
  pathname: string;
  body: string;
  createdAt: string;
};

type StoredJournalEntry = { body: string; createdAt: string };

const JOURNAL_PREFIX = "journal/";

/**
 * Reuses the job-agent-tracker Blob store this project already has - not a new store or env
 * var. See the "Gratitude Journal" note in CLAUDE.md.
 */
function blobToken(): string {
  const token = process.env.JOB_AGENT_TRACKER_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("JOB_AGENT_TRACKER_READ_WRITE_TOKEN is not configured.");
  }
  return token;
}

/**
 * One immutable blob per entry, never a single rewritten document - this sidesteps
 * read-modify-write races entirely, so (unlike scripts/job-agent/manual-opportunities.ts) there's
 * no etag/precondition-retry dance here: every save is a brand-new pathname, never an overwrite.
 * The timestamp prefix is sanitized (colons/dots stripped) so pathnames sort lexicographically in
 * chronological order, and a short random suffix keeps same-millisecond saves collision-safe.
 */
function entryPathname(createdAt: Date): string {
  const stamp = createdAt.toISOString().replace(/[:.]/g, "");
  const suffix = randomUUID().slice(0, 8);
  return `${JOURNAL_PREFIX}${stamp}-${suffix}.json`;
}

function parseStoredJournalEntry(raw: string): StoredJournalEntry | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as StoredJournalEntry).body !== "string" ||
      typeof (parsed as StoredJournalEntry).createdAt !== "string"
    ) {
      return null;
    }
    return parsed as StoredJournalEntry;
  } catch {
    return null;
  }
}

/** createdAt is stamped here, server-side, at save time; callers cannot supply a timestamp. */
export async function insertJournalEntry(body: string): Promise<JournalEntry> {
  const token = blobToken();
  const createdAt = new Date();
  const pathname = entryPathname(createdAt);
  const stored: StoredJournalEntry = { body, createdAt: createdAt.toISOString() };
  await put(pathname, JSON.stringify(stored), {
    access: "private",
    token,
    contentType: "application/json",
  });
  return { pathname, ...stored };
}

/**
 * Lists every entry under journal/, newest first, reading each blob's content back to render
 * the list - fine at personal-journal volume; no pagination or caching layer was asked for.
 */
export async function listJournalEntries(): Promise<JournalEntry[]> {
  const token = blobToken();
  const { blobs } = await list({ prefix: JOURNAL_PREFIX, token });
  const sorted = [...blobs].sort((a, b) => (a.pathname < b.pathname ? 1 : -1));

  const entries = await Promise.all(
    sorted.map(async (blob): Promise<JournalEntry | null> => {
      const result = await get(blob.pathname, { access: "private", token, useCache: false });
      if (!result || result.statusCode !== 200 || !result.stream) return null;
      const text = await new Response(result.stream).text();
      const parsed = parseStoredJournalEntry(text);
      return parsed ? { pathname: blob.pathname, ...parsed } : null;
    }),
  );

  return entries.filter((entry): entry is JournalEntry => entry !== null);
}

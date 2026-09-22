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
 * Its own dedicated Blob store ("journal"), separate from job-agent's job-agent-tracker store -
 * isolates this personal, sensitive content from job-agent's operational data. See the
 * "Gratitude Journal" note in CLAUDE.md.
 */
function blobToken(): string {
  const token = process.env.JOURNAL_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("JOURNAL_READ_WRITE_TOKEN is not configured.");
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

export type JournalEntryListing = {
  entries: JournalEntry[];
  unreadableCount: number;
};

type JournalBlobClient = { list: typeof list; get: typeof get };

const READ_CONCURRENCY = 10;

async function settleWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const index = next++;
      try {
        results[index] = { status: "fulfilled", value: await task(items[index]) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * Lists every entry under journal/, newest first, reading each blob's content back to render
 * the list - fine at personal-journal volume; no caching layer was asked for. Reads run with a
 * small concurrency cap so a growing history can't fan out into a burst of simultaneous Blob
 * requests, and use the Blob cache since every entry pathname is write-once. Follows the list
 * cursor until exhausted, since the Blob API caps each page and returns pages in no guaranteed
 * order. A single unreadable blob is counted rather than thrown, so one bad entry can't hide the
 * rest; a failed listing still throws and is the caller's to handle.
 */
export async function listJournalEntries(
  client: JournalBlobClient = { list, get },
): Promise<JournalEntryListing> {
  const token = blobToken();
  const pathnames: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await client.list({ prefix: JOURNAL_PREFIX, token, cursor });
    pathnames.push(...page.blobs.map((blob) => blob.pathname));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  pathnames.sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));

  const results = await settleWithConcurrency(
    pathnames,
    READ_CONCURRENCY,
    async (pathname): Promise<JournalEntry> => {
      const result = await client.get(pathname, { access: "private", token });
      if (!result || result.statusCode !== 200 || !result.stream) {
        throw new Error(`Journal entry ${pathname} could not be read.`);
      }
      const text = await new Response(result.stream).text();
      const parsed = parseStoredJournalEntry(text);
      if (!parsed) throw new Error(`Journal entry ${pathname} is malformed.`);
      return { pathname, ...parsed };
    },
  );

  const entries: JournalEntry[] = [];
  let unreadableCount = 0;
  for (const result of results) {
    if (result.status === "fulfilled") {
      entries.push(result.value);
    } else {
      unreadableCount += 1;
      console.error("[journal] Failed to read entry:", result.reason);
    }
  }
  return { entries, unreadableCount };
}

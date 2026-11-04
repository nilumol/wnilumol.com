import { randomUUID } from "node:crypto";
import { list, put } from "@vercel/blob";

/**
 * Free-PDF download counting for /books/*: one private, immutable blob per eligible request, holding
 * only a server-side timestamp (no IP, user agent, or other personal data). Same write-once
 * one-blob-per-entry pattern as scripts/journal/store.ts, so concurrent downloads can never race.
 *
 * Lives in its own Blob store, "book-downloads", read through BOOK_DOWNLOADS_READ_WRITE_TOKEN (passed
 * explicitly per call, as every Blob store in this project is). Without the token, counting is skipped
 * and the download still works.
 */
export const BOOK_DOWNLOADS_PREFIX = "book-downloads/";

export function bookDownloadsToken(): string | undefined {
  return process.env.BOOK_DOWNLOADS_READ_WRITE_TOKEN || undefined;
}

/** `book-downloads/<slug>/<sanitized ISO timestamp>-<random>.json`; the stamp sorts chronologically. */
export function downloadPathname(slug: string, at: Date): string {
  const stamp = at.toISOString().replace(/[:.]/g, "");
  return `${BOOK_DOWNLOADS_PREFIX}${slug}/${stamp}-${randomUUID().slice(0, 8)}.json`;
}

/** Reads the timestamp back out of a pathname written by downloadPathname, or null if it is not one. */
export function timestampFromPathname(pathname: string): string | null {
  const match = /\/(\d{4}-\d{2}-\d{2})T(\d{2})(\d{2})(\d{2})(\d{3})Z-[^/]+\.json$/.exec(pathname);
  if (!match) return null;
  const [, day, hh, mm, ss, ms] = match;
  return `${day}T${hh}:${mm}:${ss}.${ms}Z`;
}

export type RecordResult = "recorded" | "skipped-no-token";

/** Writes one download record. Callers must not let a failure here block the download itself. */
export async function recordBookDownload(
  slug: string,
  { client = { put }, token = bookDownloadsToken(), now = new Date() }: { client?: { put: typeof put }; token?: string; now?: Date } = {},
): Promise<RecordResult> {
  if (!token) return "skipped-no-token";
  await client.put(downloadPathname(slug, now), JSON.stringify({ downloadedAt: now.toISOString() }), {
    access: "private",
    token,
    contentType: "application/json",
  });
  return "recorded";
}

/** Every recorded download timestamp for a book, oldest first. Follows the list cursor to exhaustion. */
export async function listBookDownloads(
  slug: string,
  { client = { list }, token = bookDownloadsToken() }: { client?: { list: typeof list }; token?: string } = {},
): Promise<string[]> {
  if (!token) throw new Error("BOOK_DOWNLOADS_READ_WRITE_TOKEN is not configured.");
  const stamps: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await client.list({ prefix: `${BOOK_DOWNLOADS_PREFIX}${slug}/`, token, cursor });
    for (const blob of page.blobs) {
      const stamp = timestampFromPathname(blob.pathname);
      if (stamp) stamps.push(stamp);
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return stamps.sort();
}

/** Total plus per-UTC-day counts, days in ascending order. */
export function summarizeDownloads(stamps: readonly string[]): { total: number; perDay: [string, number][] } {
  const perDay = new Map<string, number>();
  for (const stamp of stamps) perDay.set(stamp.slice(0, 10), (perDay.get(stamp.slice(0, 10)) ?? 0) + 1);
  return { total: stamps.length, perDay: [...perDay.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)) };
}

import assert from "node:assert/strict";
import { test } from "node:test";
import { listJournalEntries } from "./store.ts";

type Client = NonNullable<Parameters<typeof listJournalEntries>[0]>;

function streamOf(text: string): ReadableStream<Uint8Array> {
  return new Response(text).body as ReadableStream<Uint8Array>;
}

function fakeClient(pages: string[][], contents: Record<string, string | null>): Client {
  const list = (async (options?: { cursor?: string }) => {
    const index = options?.cursor ? Number(options.cursor) : 0;
    const hasMore = index + 1 < pages.length;
    return {
      blobs: pages[index].map((pathname) => ({ pathname })),
      hasMore,
      cursor: hasMore ? String(index + 1) : undefined,
    };
  }) as unknown as Client["list"];
  const get = (async (pathname: string) => {
    const content = contents[pathname];
    if (content === null) throw new Error("blob read failed");
    return { statusCode: 200, stream: streamOf(content) };
  }) as unknown as Client["get"];
  return { list, get };
}

function entry(body: string, createdAt: string): string {
  return JSON.stringify({ body, createdAt });
}

test("listJournalEntries follows the list cursor across pages and sorts newest first", async () => {
  process.env.JOURNAL_READ_WRITE_TOKEN = "test-token";
  const client = fakeClient(
    [["journal/2026-01-02.json", "journal/2026-01-01.json"], ["journal/2026-01-03.json"]],
    {
      "journal/2026-01-01.json": entry("one", "2026-01-01T00:00:00.000Z"),
      "journal/2026-01-02.json": entry("two", "2026-01-02T00:00:00.000Z"),
      "journal/2026-01-03.json": entry("three", "2026-01-03T00:00:00.000Z"),
    },
  );

  const { entries, unreadableCount } = await listJournalEntries(client);

  assert.deepEqual(
    entries.map((e) => e.body),
    ["three", "two", "one"],
  );
  assert.equal(unreadableCount, 0);
});

test("listJournalEntries keeps readable entries when one blob fails or is malformed", async () => {
  process.env.JOURNAL_READ_WRITE_TOKEN = "test-token";
  const client = fakeClient([["journal/a.json", "journal/b.json", "journal/c.json"]], {
    "journal/a.json": entry("kept", "2026-01-01T00:00:00.000Z"),
    "journal/b.json": null,
    "journal/c.json": "not json",
  });
  const originalError = console.error;
  console.error = () => {};
  try {
    const { entries, unreadableCount } = await listJournalEntries(client);
    assert.deepEqual(
      entries.map((e) => e.body),
      ["kept"],
    );
    assert.equal(unreadableCount, 2);
  } finally {
    console.error = originalError;
  }
});

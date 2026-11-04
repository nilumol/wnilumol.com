import assert from "node:assert/strict";
import { test } from "node:test";
import { isLikelyBot, isPrefetch } from "./bots.ts";
import {
  downloadPathname,
  listBookDownloads,
  recordBookDownload,
  summarizeDownloads,
  timestampFromPathname,
} from "./store.ts";

type PutClient = NonNullable<NonNullable<Parameters<typeof recordBookDownload>[1]>["client"]>;
type ListClient = NonNullable<NonNullable<Parameters<typeof listBookDownloads>[1]>["client"]>;

test("downloadPathname round-trips its timestamp and sorts chronologically", () => {
  const at = new Date("2026-11-04T22:55:05.123Z");
  const pathname = downloadPathname("jules-dreams-of-basketball", at);
  assert.match(pathname, /^book-downloads\/jules-dreams-of-basketball\/2026-11-04T225505123Z-[0-9a-f]{8}\.json$/);
  assert.equal(timestampFromPathname(pathname), "2026-11-04T22:55:05.123Z");
  assert.ok(downloadPathname("b", new Date("2026-01-02T00:00:00.000Z")) > downloadPathname("b", new Date("2026-01-01T23:59:59.999Z")));
  assert.equal(timestampFromPathname("book-downloads/b/not-a-record.json"), null);
});

test("recordBookDownload writes one private blob holding only the timestamp", async () => {
  const calls: { pathname: string; body: string; options: Record<string, unknown> }[] = [];
  const client = {
    put: (async (pathname: string, body: string, options: Record<string, unknown>) => {
      calls.push({ pathname, body, options });
      return {};
    }) as unknown as PutClient["put"],
  };
  const now = new Date("2026-11-04T10:00:00.000Z");
  assert.equal(await recordBookDownload("jules", { client, token: "t", now }), "recorded");
  assert.equal(calls.length, 1);
  assert.deepEqual(JSON.parse(calls[0].body), { downloadedAt: "2026-11-04T10:00:00.000Z" });
  assert.equal(calls[0].options.access, "private");
  assert.equal(calls[0].options.token, "t");
});

test("recordBookDownload skips without a token and never calls Blob", async () => {
  let called = false;
  const client = { put: (async () => { called = true; }) as unknown as PutClient["put"] };
  assert.equal(await recordBookDownload("jules", { client, token: undefined }), "skipped-no-token");
  assert.equal(called, false);
});

test("listBookDownloads follows the cursor and ignores foreign pathnames", async () => {
  const pages = [
    ["book-downloads/jules/2026-11-02T090000000Z-aaaaaaaa.json", "book-downloads/jules/stray.txt"],
    ["book-downloads/jules/2026-11-01T080000000Z-bbbbbbbb.json"],
  ];
  const client = {
    list: (async (options?: { cursor?: string }) => {
      const index = options?.cursor ? Number(options.cursor) : 0;
      const hasMore = index + 1 < pages.length;
      return { blobs: pages[index].map((pathname) => ({ pathname })), hasMore, cursor: hasMore ? String(index + 1) : undefined };
    }) as unknown as ListClient["list"],
  };
  assert.deepEqual(await listBookDownloads("jules", { client, token: "t" }), [
    "2026-11-01T08:00:00.000Z",
    "2026-11-02T09:00:00.000Z",
  ]);
  await assert.rejects(listBookDownloads("jules", { client, token: undefined }), /not configured/);
});

test("summarizeDownloads counts total and per UTC day", () => {
  assert.deepEqual(
    summarizeDownloads(["2026-11-02T01:00:00.000Z", "2026-11-01T23:00:00.000Z", "2026-11-02T22:00:00.000Z"]),
    { total: 3, perDay: [["2026-11-01", 1], ["2026-11-02", 2]] },
  );
  assert.deepEqual(summarizeDownloads([]), { total: 0, perDay: [] });
});

test("isLikelyBot flags crawlers, link previews, scripts and empty agents but not browsers", () => {
  for (const ua of [
    "",
    null,
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
    "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)",
    "Twitterbot/1.0",
    "WhatsApp/2.23.20.0",
    "TelegramBot (like TwitterBot)",
    "LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)",
    "curl/8.7.1",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/131.0.0.0 Safari/537.36",
  ]) {
    assert.equal(isLikelyBot(ua), true, String(ua));
  }
  for (const ua of [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
  ]) {
    assert.equal(isLikelyBot(ua), false, ua);
  }
});

test("isPrefetch recognizes speculative loads", () => {
  assert.equal(isPrefetch(new Headers({ "sec-purpose": "prefetch" })), true);
  assert.equal(isPrefetch(new Headers({ purpose: "prefetch" })), true);
  assert.equal(isPrefetch(new Headers({ "sec-purpose": "prefetch;prerender" })), true);
  assert.equal(isPrefetch(new Headers({ accept: "application/pdf" })), false);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeTrackerEntries, parseTrackerOverlay } from "./tracker-overlay.ts";
import { parseTailorStatusRequestBody } from "./tailor-types.ts";
import type { JobAgentLedgerEntry } from "./types.ts";

// ---------------------------------------------------------------------------
// parseTrackerOverlay - defensive parse of the single overlay JSON document
// ---------------------------------------------------------------------------

test("parseTrackerOverlay reads an empty string, malformed JSON, and a non-object as no entries", () => {
  assert.deepEqual(parseTrackerOverlay(""), {});
  assert.deepEqual(parseTrackerOverlay("   "), {});
  assert.deepEqual(parseTrackerOverlay("not json"), {});
  assert.deepEqual(parseTrackerOverlay("[]"), {});
  assert.deepEqual(parseTrackerOverlay("null"), {});
});

test("parseTrackerOverlay parses a valid overlay document", () => {
  const raw = JSON.stringify({
    "greenhouse:1": {
      status: "applied",
      title: "Solutions Consultant",
      company: "Acme",
      location: "Remote",
      absoluteUrl: "https://example.com/1",
      updatedAt: "2026-08-19T00:00:00.000Z",
    },
  });
  const overlay = parseTrackerOverlay(raw);
  assert.equal(overlay["greenhouse:1"]?.status, "applied");
  assert.equal(overlay["greenhouse:1"]?.company, "Acme");
});

// ---------------------------------------------------------------------------
// mergeTrackerEntries - Tracker's row list: hand-set ledger rows + live overlay rows
// ---------------------------------------------------------------------------

function ledgerEntry(overrides: Partial<JobAgentLedgerEntry>): JobAgentLedgerEntry {
  return {
    id: 1,
    source: "greenhouse",
    company: "Acme",
    title: "Solutions Consultant",
    keywordFamily: "Solutions Consultant",
    absoluteUrl: "https://example.com/1",
    firstSeen: "2026-08-01T00:00:00.000Z",
    status: "scored",
    location: "Remote",
    compensationRange: null,
    ...overrides,
  };
}

test("mergeTrackerEntries includes hand-set ledger applied/passed rows untouched by the overlay", () => {
  const entries = [ledgerEntry({ id: 1, status: "applied" }), ledgerEntry({ id: 2, status: "scored" })];
  const result = mergeTrackerEntries(entries, {});
  assert.equal(result.length, 1);
  assert.equal(result[0]?.id, 1);
});

test("mergeTrackerEntries synthesizes a row for an overlay entry even when the ledger row is absent (expired and dropped)", () => {
  const overlay = {
    "greenhouse:99": {
      status: "applied" as const,
      title: "Solutions Architect",
      company: "Beta",
      location: "NYC",
      absoluteUrl: "https://example.com/99",
      updatedAt: "2026-08-19T00:00:00.000Z",
    },
  };
  const result = mergeTrackerEntries([], overlay);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0], {
    id: "99",
    source: "greenhouse",
    company: "Beta",
    title: "Solutions Architect",
    keywordFamily: "",
    absoluteUrl: "https://example.com/99",
    firstSeen: "2026-08-19T00:00:00.000Z",
    status: "applied",
    location: "NYC",
    compensationRange: null,
  });
});

test("mergeTrackerEntries lets an overlay entry win over a hand-set ledger row for the same job, without duplicating it", () => {
  const entries = [ledgerEntry({ id: 1, status: "applied" })];
  const overlay = {
    "greenhouse:1": {
      status: "passed" as const,
      title: "Solutions Consultant",
      company: "Acme",
      location: "Remote",
      absoluteUrl: "https://example.com/1",
      updatedAt: "2026-08-19T00:00:00.000Z",
    },
  };
  const result = mergeTrackerEntries(entries, overlay);
  assert.equal(result.length, 1);
  assert.equal(result[0]?.status, "passed");
});

test("mergeTrackerEntries preserves structured opportunity fields captured in a status snapshot", () => {
  const overlay = {
    "lever:abc": {
      status: "applied" as const,
      title: "Solutions Architect",
      company: "Acme",
      keywordFamily: "Solutions Architect",
      location: "Remote",
      compensationRange: "$155K-$190K",
      postedAt: "2026-08-20T00:00:00.000Z",
      absoluteUrl: "https://jobs.lever.co/acme/abc",
      updatedAt: "2026-08-21T00:00:00.000Z",
    },
  };
  const result = mergeTrackerEntries([], overlay);
  assert.equal(result[0]?.id, "abc");
  assert.equal(result[0]?.keywordFamily, "Solutions Architect");
  assert.equal(result[0]?.compensationRange, "$155K-$190K");
  assert.equal(result[0]?.postedAt, "2026-08-20T00:00:00.000Z");
});

// ---------------------------------------------------------------------------
// parseTailorStatusRequestBody - the /status route's envelope check
// ---------------------------------------------------------------------------

test("parseTailorStatusRequestBody accepts a valid { source, id, status } body", () => {
  assert.notEqual(parseTailorStatusRequestBody({ source: "greenhouse", id: "123", status: "applied" }), null);
  assert.notEqual(parseTailorStatusRequestBody({ source: "lever", id: 42, status: "passed" }), null);
});

test("parseTailorStatusRequestBody rejects an unknown source, missing id, and an invalid status", () => {
  assert.equal(parseTailorStatusRequestBody({ source: "workday", id: "1", status: "applied" }), null);
  assert.equal(parseTailorStatusRequestBody({ source: "greenhouse", status: "applied" }), null);
  assert.equal(parseTailorStatusRequestBody({ source: "greenhouse", id: "1", status: "pending" }), null);
});

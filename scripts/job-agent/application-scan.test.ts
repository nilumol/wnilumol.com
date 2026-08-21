import assert from "node:assert/strict";
import { test } from "node:test";
import { parseApplicationScanRequestBody } from "./application-scan-types.ts";

// ---------------------------------------------------------------------------
// parseApplicationScanRequestBody - the /scan route's envelope check
// ---------------------------------------------------------------------------
//
// scrapeApplicationPage and classifyApplicationPage aren't covered here - they need a live
// headless Chromium (Linux-only via @sparticuz/chromium, same limitation as the PDF route - see
// docs/job-agent.md's "Local dev limitation") and a real Anthropic API call, so they're
// integration-only, exercised by hand against a real application page.

test("parseApplicationScanRequestBody accepts a plain { source, id } body", () => {
  assert.notEqual(parseApplicationScanRequestBody({ source: "greenhouse", id: "123" }), null);
  assert.notEqual(parseApplicationScanRequestBody({ source: "lever", id: 42 }), null);
  assert.notEqual(parseApplicationScanRequestBody({ source: "ashby", id: "abc" }), null);
});

test("parseApplicationScanRequestBody rejects an unknown source and a missing id", () => {
  assert.equal(parseApplicationScanRequestBody({ source: "workday", id: "1" }), null);
  assert.equal(parseApplicationScanRequestBody({ source: "greenhouse" }), null);
  assert.equal(parseApplicationScanRequestBody(null), null);
});

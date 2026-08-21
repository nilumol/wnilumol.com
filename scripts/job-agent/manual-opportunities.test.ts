import assert from "node:assert/strict";
import { test } from "node:test";
import {
  extractManualOpportunity,
  ManualOpportunityError,
  parseSupportedJobUrl,
} from "./manual-opportunity-extract.ts";
import { parseManualOpportunityRequestBody, parseManualOpportunityStore } from "./manual-opportunity-types.ts";
import {
  addManualOpportunity,
  DuplicateManualOpportunityError,
  mergeOpportunityEntries,
} from "./manual-opportunities.ts";
import { resolveOpportunityContext, resolveOpportunityEntry } from "./opportunity-context.ts";
import {
  appendOpportunity,
  moveSelectedOpportunities,
  selectOpportunityPage,
  toggleSelectedOpportunity,
} from "./opportunity-session.ts";
import type { ManualOpportunityRecord, ManualOpportunityStore } from "./manual-opportunity-types.ts";
import type { JobAgentLedgerEntry } from "./types.ts";

const NOW = "2026-08-21T12:00:00.000Z";

function response(body: unknown, status = 200, contentType = "application/json"): Response {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "content-type": contentType },
  });
}

function mockedFetch(routes: Record<string, Response | (() => Response)>): typeof fetch {
  return (async (input) => {
    const url = String(input);
    const match = routes[url];
    assert.ok(match, `unexpected remote request: ${url}`);
    return typeof match === "function" ? match() : match;
  }) as typeof fetch;
}

test("manual URL input accepts supported HTTPS posting URLs and rejects unsafe or unsupported targets", () => {
  assert.deepEqual(parseManualOpportunityRequestBody({ url: " https://jobs.lever.co/acme/abc " }), {
    url: "https://jobs.lever.co/acme/abc",
  });
  assert.equal(parseManualOpportunityRequestBody({ url: "" }), null);

  const lever = parseSupportedJobUrl("https://jobs.lever.co/acme/abc/apply?source=referral");
  assert.equal(lever.source, "lever");
  assert.equal(lever.postingId, "abc");
  assert.equal(lever.apiUrl, "https://api.lever.co/v0/postings/acme/abc");

  assert.throws(
    () => parseSupportedJobUrl("http://jobs.lever.co/acme/abc"),
    /Job URLs must use HTTPS/,
  );
  assert.throws(
    () => parseSupportedJobUrl("https://127.0.0.1/internal/jobs/1"),
    /Supported posting URLs are hosted by Greenhouse, Lever, or Ashby/,
  );
  assert.throws(
    () => parseSupportedJobUrl("https://example.com/jobs/1"),
    /Supported posting URLs are hosted by Greenhouse, Lever, or Ashby/,
  );
});

test("a Greenhouse URL extracts, normalizes, and persists one complete JSON-backed opportunity", async () => {
  let store: ManualOpportunityStore = {};
  const targetUrl = "https://job-boards.greenhouse.io/smartsheet/jobs/12345?gh_src=test";
  const target = parseSupportedJobUrl(targetUrl);
  const fetchImpl = mockedFetch({
    [target.apiUrl]: response({
      id: 12345,
      title: "Senior Solutions Consultant",
      company_name: "Smartsheet",
      absolute_url: "https://job-boards.greenhouse.io/smartsheet/jobs/12345",
      content: "<p>Lead discovery and technical evaluations.</p>",
      location: { name: "- Remote, US -" },
      first_published: "2026-08-20T09:30:00.000Z",
    }),
  });

  const record = await addManualOpportunity(targetUrl, {}, {
    readStore: async () => store,
    writeStore: async (next) => {
      store = next;
    },
    extract: (supported) => extractManualOpportunity(supported, { fetchImpl, now: NOW }),
    now: () => NOW,
  });

  assert.equal(record.entry.id, 12345);
  assert.equal(record.entry.source, "greenhouse");
  assert.equal(record.entry.title, "Senior Solutions Consultant");
  assert.equal(record.entry.company, "Smartsheet");
  assert.equal(record.entry.keywordFamily, "Solutions Consultant");
  assert.equal(record.entry.location, "Remote, US");
  assert.equal(record.entry.compensationRange, null);
  assert.equal(record.entry.postedAt, "2026-08-20T09:30:00.000Z");
  assert.equal(record.entry.status, "pending");
  assert.equal(record.originalUrl, targetUrl);
  assert.equal(record.entry.absoluteUrl, targetUrl, "later scans stay on the validated ATS URL");
  assert.match(record.posting.content!, /technical evaluations/);
  assert.equal(store["greenhouse:12345"]?.entry.absoluteUrl, record.entry.absoluteUrl);

  const roundTripped = parseManualOpportunityStore(`${JSON.stringify(store)}\n`);
  assert.deepEqual(roundTripped, store);
});

test("Lever normalization preserves structured salary and derives an untracked company from trusted JobPosting metadata", async () => {
  const target = parseSupportedJobUrl("https://jobs.lever.co/acme-life/abc-123");
  const fetchImpl = mockedFetch({
    [target.apiUrl]: response({
      id: "abc-123",
      text: "Solutions Architect",
      hostedUrl: target.pageUrl,
      descriptionPlain: "Design secure customer architectures.",
      categories: { location: "San Francisco, CA" },
      createdAt: 1787245200000,
      salaryRange: { min: 155000, max: 190000, currency: "USD", interval: "year" },
    }),
    [target.pageUrl]: response(
      '<script type="application/ld+json">{"@type":"JobPosting","hiringOrganization":{"name":"Acme Life"}}</script>',
      200,
      "text/html",
    ),
  });

  const extracted = await extractManualOpportunity(target, { fetchImpl, now: NOW });
  assert.equal(extracted.entry.company, "Acme Life");
  assert.equal(extracted.entry.compensationRange, "$155K-$190K");
  assert.equal(extracted.posting.structuredCompensationRange, "$155K-$190K");
});

test("Ashby normalization exposes the ATS salary summary and explicit missing facts remain null", async () => {
  const target = parseSupportedJobUrl("https://jobs.ashbyhq.com/acme-life/job-789");
  const fetchImpl = mockedFetch({
    [target.apiUrl]: response({
      jobs: [
        {
          id: "job-789",
          title: "Customer Success Manager",
          location: "Remote",
          descriptionPlain: "Own customer adoption.",
          publishedAt: "2026-08-18T00:00:00.000Z",
          jobUrl: target.pageUrl,
          compensation: { scrapeableCompensationSalarySummary: "$145K - $170K" },
        },
      ],
    }),
    [target.pageUrl]: response(
      '<script type="application/ld+json">{"@graph":[{"@type":"JobPosting","hiringOrganization":{"name":"Acme Life"}}]}</script>',
      200,
      "text/html",
    ),
  });

  const extracted = await extractManualOpportunity(target, { fetchImpl, now: NOW });
  assert.equal(extracted.entry.compensationRange, "$145K - $170K");

  const missingSalaryFetch = mockedFetch({
    [target.apiUrl]: response({
      jobs: [
        {
          id: "job-789",
          title: "Customer Success Manager",
          descriptionPlain: "Own customer adoption.",
          jobUrl: target.pageUrl,
        },
      ],
    }),
    [target.pageUrl]: response(
      '<script type="application/ld+json">{"@type":"JobPosting","hiringOrganization":{"name":"Acme Life"}}</script>',
      200,
      "text/html",
    ),
  });
  const missingSalary = await extractManualOpportunity(target, { fetchImpl: missingSalaryFetch, now: NOW });
  assert.equal(missingSalary.entry.compensationRange, null);
  assert.equal(missingSalary.entry.location, null);
});

test("duplicate submissions are rejected before extraction or persistence", async () => {
  const existing = fixtureRecord();
  let extractCalls = 0;
  let writeCalls = 0;

  await assert.rejects(
    addManualOpportunity(existing.originalUrl, {}, {
      readStore: async () => ({ "lever:abc-123": existing }),
      writeStore: async () => {
        writeCalls += 1;
      },
      extract: async () => {
        extractCalls += 1;
        return existing;
      },
    }),
    {
      name: DuplicateManualOpportunityError.name,
      message: "That opportunity is already in the Job Application Agent.",
    },
  );
  assert.equal(extractCalls, 0);
  assert.equal(writeCalls, 0);
});

test("a git-ledger duplicate is rejected without requiring a manual-store read", async () => {
  const existing = fixtureRecord();
  let reads = 0;
  await assert.rejects(
    addManualOpportunity(existing.originalUrl, { "lever:abc-123": existing.entry }, {
      readStore: async () => {
        reads += 1;
        return {};
      },
    }),
    DuplicateManualOpportunityError,
  );
  assert.equal(reads, 0);
});

test("an incomplete posting fails without creating a partial row", async () => {
  let writes = 0;
  const targetUrl = "https://job-boards.greenhouse.io/smartsheet/jobs/99999";
  const target = parseSupportedJobUrl(targetUrl);
  const fetchImpl = mockedFetch({
    [target.apiUrl]: response({
      id: 99999,
      title: "Solutions Consultant",
      company_name: "Smartsheet",
      content: "",
      absolute_url: target.pageUrl,
    }),
  });

  await assert.rejects(
    addManualOpportunity(targetUrl, {}, {
      readStore: async () => ({}),
      writeStore: async () => {
        writes += 1;
      },
      extract: (supported) => extractManualOpportunity(supported, { fetchImpl, now: NOW }),
    }),
    (error: unknown) =>
      error instanceof ManualOpportunityError &&
      error.code === "incomplete" &&
      error.message.includes("nothing was added"),
  );
  assert.equal(writes, 0);
});

test("a persisted row can be appended, selected, sent to Tailor, and resolved with its captured description", async () => {
  const record = fixtureRecord();
  const entries = appendOpportunity([], record.entry);
  assert.equal(entries.length, 1);
  assert.equal(appendOpportunity(entries, record.entry), entries, "duplicate UI rows are not appended");

  let selected = toggleSelectedOpportunity(new Set(), "lever:abc-123", true);
  selected = selectOpportunityPage(selected, entries);
  assert.deepEqual([...selected], ["lever:abc-123"]);

  const moved = moveSelectedOpportunities(entries, [], selected);
  assert.deepEqual(moved.entries, []);
  assert.equal(moved.sentEntries[0]?.id, "abc-123");

  const findManual = async () => record;
  const entry = await resolveOpportunityEntry({}, "lever", "abc-123", findManual);
  const context = await resolveOpportunityContext({}, "lever", "abc-123", findManual);
  assert.equal(entry?.company, "Acme Life");
  assert.match(context?.posting.content ?? "", /regulated customers/);

  const merged = mergeOpportunityEntries([], { "lever:abc-123": record });
  assert.equal(merged[0]?.compensationRange, "$155K-$190K");
});

function fixtureRecord(): ManualOpportunityRecord {
  const entry: JobAgentLedgerEntry = {
    id: "abc-123",
    source: "lever",
    company: "Acme Life",
    title: "Solutions Architect",
    keywordFamily: "Solutions Architect",
    absoluteUrl: "https://jobs.lever.co/acme-life/abc-123",
    firstSeen: NOW,
    status: "pending",
    location: "Remote",
    compensationRange: "$155K-$190K",
    postedAt: "2026-08-20T00:00:00.000Z",
  };
  return {
    entry,
    posting: {
      id: entry.id,
      title: entry.title,
      absolute_url: entry.absoluteUrl,
      content: "Build trusted systems for regulated customers.",
      location: { name: "Remote" },
      postedAt: entry.postedAt,
      structuredCompensationRange: entry.compensationRange,
    },
    originalUrl: entry.absoluteUrl,
    createdAt: NOW,
  };
}

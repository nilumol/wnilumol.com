import assert from "node:assert/strict";
import { test } from "node:test";
import type Anthropic from "@anthropic-ai/sdk";
import { jobAgentKeywordFamilyAbbreviations } from "../../content/job-agent-keywords.ts";
import type { ResumeData } from "../../content/resume-data.ts";
import { mergeTailoredResume } from "./resume-tailor.ts";
import { renderResumeHtml } from "./resume-template.ts";
import { buildTailorPrompt, generateTailorSuggestions } from "./tailor-suggestions.ts";
import type { TailorRevisionRequest, TailorSuggestion } from "./tailor-types.ts";
import { parseTailorSuggestRequestBody } from "./tailor-types.ts";
import { verifyTailorPassphrase } from "./tailor-auth.ts";
import type { NormalizedJob } from "./types.ts";

/** Minimal stand-in for the one Anthropic client method generateTailorSuggestions calls. */
function fakeClient(parseImpl: () => Promise<unknown>): Anthropic {
  return { messages: { parse: parseImpl } } as unknown as Anthropic;
}

const resumeFixture: ResumeData = {
  headline: "Headline.",
  highlights: ["Highlight A", "Highlight B", "Highlight C"],
  roles: [
    {
      title: "Senior Implementations Manager",
      company: "Collate",
      companyContext: "AI for Life Sciences",
      dates: "May 2026 - Present",
      bullets: ["Collate bullet 0", "Collate bullet 1", "Collate bullet 2"],
    },
    {
      title: "Solutions Consultant",
      company: "Benchling",
      companyContext: "Life Sciences SaaS",
      dates: "Jan 2022 - Jun 2024",
      bullets: ["Benchling bullet 0", "Benchling bullet 1"],
    },
    {
      title: "Scientific Program Manager",
      company: "Genentech",
      companyContext: "Biopharma R&D & Manufacturing",
      dates: "Jul 2013 - Dec 2021",
      bullets: ["Genentech bullet 0", "Genentech bullet 1"],
    },
    {
      title: "Sr. Bio-Process Technician",
      company: "Merck & Co., Inc.",
      companyContext: "Vaccine Manufacturing",
      dates: "Feb 2012 - Jul 2013",
      bullets: ["Merck bullet 0"],
    },
  ],
  areasOfExpertise: { technologiesAndTools: ["SQL"], salesMethodologies: ["MEDDIC"], keySkills: ["Discovery"] },
  education: ["B.S. in General Biology"],
  executiveEndorsement: "Great engineer.",
};

// ---------------------------------------------------------------------------
// mergeTailoredResume - the guardrail: only highlights/Collate/Benchling ever change
// ---------------------------------------------------------------------------

test("mergeTailoredResume leaves the original resumeData object untouched", () => {
  const suggestions: TailorSuggestion[] = [
    { id: "s1", type: "reorder", target: "highlights", newOrder: [2, 0, 1], rationale: "r" },
  ];
  mergeTailoredResume(resumeFixture, suggestions, "");
  assert.deepEqual(resumeFixture.highlights, ["Highlight A", "Highlight B", "Highlight C"]);
});

test("mergeTailoredResume applies an accepted highlights reorder", () => {
  const suggestions: TailorSuggestion[] = [
    { id: "s1", type: "reorder", target: "highlights", newOrder: [2, 0, 1], rationale: "r" },
  ];
  const result = mergeTailoredResume(resumeFixture, suggestions, "");
  assert.deepEqual(result.highlights, ["Highlight C", "Highlight A", "Highlight B"]);
});

test("mergeTailoredResume ignores a reorder suggestion with a malformed permutation", () => {
  const suggestions: TailorSuggestion[] = [
    { id: "s1", type: "reorder", target: "highlights", newOrder: [0, 0, 1], rationale: "r" },
  ];
  const result = mergeTailoredResume(resumeFixture, suggestions, "");
  assert.deepEqual(result.highlights, resumeFixture.highlights);
  assert.equal(result.highlightsReordered, false);
});

test("mergeTailoredResume reorders and appends new-phrasing bullets on the Collate role only, tagging added bullets and the reordered flag", () => {
  const suggestions: TailorSuggestion[] = [
    { id: "s1", type: "reorder", target: "collate", newOrder: [2, 1, 0], rationale: "r" },
    { id: "s2", type: "new-phrasing", role: "collate", text: "New Collate bullet", groundedIn: "Collate bullet 1", rationale: "r" },
  ];
  const result = mergeTailoredResume(resumeFixture, suggestions, "");
  const collate = result.roles.find((r) => r.company === "Collate")!;
  assert.deepEqual(
    collate.bullets,
    [
      { text: "Collate bullet 2", added: false },
      { text: "Collate bullet 1", added: false },
      { text: "Collate bullet 0", added: false },
      { text: "New Collate bullet", added: true },
    ],
  );
  assert.equal(collate.bulletsReordered, true);
});

test("mergeTailoredResume marks bulletsReordered/highlightsReordered false when no reorder suggestion was accepted for that target", () => {
  const result = mergeTailoredResume(resumeFixture, [], "");
  assert.equal(result.highlightsReordered, false);
  const collate = result.roles.find((r) => r.company === "Collate")!;
  assert.equal(collate.bulletsReordered, false);
});

test("mergeTailoredResume never changes Genentech or Merck bullets regardless of suggestions", () => {
  const suggestions: TailorSuggestion[] = [
    { id: "s1", type: "reorder", target: "highlights", newOrder: [2, 0, 1], rationale: "r" },
    { id: "s2", type: "reorder", target: "collate", newOrder: [2, 1, 0], rationale: "r" },
    { id: "s3", type: "new-phrasing", role: "benchling", text: "New Benchling bullet", groundedIn: "x", rationale: "r" },
  ];
  const result = mergeTailoredResume(resumeFixture, suggestions, "");
  const genentech = result.roles.find((r) => r.company === "Genentech")!;
  const merck = result.roles.find((r) => r.company.startsWith("Merck"))!;
  assert.deepEqual(genentech.bullets.map((b) => b.text), resumeFixture.roles[2]!.bullets);
  assert.deepEqual(merck.bullets.map((b) => b.text), resumeFixture.roles[3]!.bullets);
  assert.equal(genentech.bulletsReordered, false);
  assert.equal(merck.bulletsReordered, false);
});

test("mergeTailoredResume trims and carries the captain's own free text separately from suggestions", () => {
  const result = mergeTailoredResume(resumeFixture, [], "  My own notes.  ");
  assert.equal(result.ownText, "My own notes.");
});

// ---------------------------------------------------------------------------
// renderResumeHtml - highlightChanges must be the only difference between Review and Generate PDF
// ---------------------------------------------------------------------------

test("renderResumeHtml marks added and reordered content only when highlightChanges is true", () => {
  const suggestions: TailorSuggestion[] = [
    { id: "s1", type: "reorder", target: "collate", newOrder: [2, 1, 0], rationale: "r" },
    { id: "s2", type: "new-phrasing", role: "collate", text: "New Collate bullet", groundedIn: "Collate bullet 1", rationale: "r" },
  ];
  const tailored = mergeTailoredResume(resumeFixture, suggestions, "");

  const highlighted = renderResumeHtml(tailored, { company: "Acme" }, true);
  assert.match(highlighted, /class="hl-added"/);
  assert.match(highlighted, /class="hl-reordered"/);

  const clean = renderResumeHtml(tailored, { company: "Acme" }, false);
  assert.doesNotMatch(clean, /class="hl-added"/);
  assert.doesNotMatch(clean, /class="hl-reordered"/);
});

test("renderResumeHtml never marks content as changed when nothing was reordered or added", () => {
  const tailored = mergeTailoredResume(resumeFixture, [], "");
  const html = renderResumeHtml(tailored, { company: "Acme" }, true);
  assert.doesNotMatch(html, /class="hl-added"/);
  assert.doesNotMatch(html, /class="hl-reordered"/);
});

test("renderResumeHtml colors the role title with the accent sampled from the source PDF", () => {
  const tailored = mergeTailoredResume(resumeFixture, [], "");
  const html = renderResumeHtml(tailored, { company: "Acme" }, false);
  assert.match(html, /\.role-head\s*\{[^}]*color:\s*#134f5c/);
});

// ---------------------------------------------------------------------------
// buildTailorPrompt - structural guardrail: Genentech/Merck content must never reach the model
// ---------------------------------------------------------------------------

test("buildTailorPrompt includes only the highlights and Collate/Benchling bullets, never Genentech or Merck content", () => {
  const job: NormalizedJob & { company: string } = {
    id: 1,
    title: "Solutions Consultant",
    absolute_url: "https://example.com/job/1",
    content: "We need someone with agile delivery experience.",
    company: "Acme",
  };
  const prompt = buildTailorPrompt(job, resumeFixture);

  for (const highlight of resumeFixture.highlights) assert.match(prompt, new RegExp(escapeRegExp(highlight)));
  for (const bullet of resumeFixture.roles[0]!.bullets) assert.match(prompt, new RegExp(escapeRegExp(bullet)));
  for (const bullet of resumeFixture.roles[1]!.bullets) assert.match(prompt, new RegExp(escapeRegExp(bullet)));

  for (const bullet of resumeFixture.roles[2]!.bullets) assert.doesNotMatch(prompt, new RegExp(escapeRegExp(bullet)));
  for (const bullet of resumeFixture.roles[3]!.bullets) assert.doesNotMatch(prompt, new RegExp(escapeRegExp(bullet)));
  assert.doesNotMatch(prompt, /Genentech|Merck/);

  assert.match(prompt, /agile delivery experience/);
});

test("buildTailorPrompt strips HTML markup from the job's content field instead of sending it raw", () => {
  const job: NormalizedJob & { company: string } = {
    id: 1,
    title: "Solutions Consultant",
    absolute_url: "https://example.com/job/1",
    content: "&lt;div&gt;&lt;p&gt;We need someone with &lt;strong&gt;agile&lt;/strong&gt; delivery experience.&lt;/p&gt;&lt;/div&gt;",
    company: "Acme",
  };
  const prompt = buildTailorPrompt(job, resumeFixture);
  assert.match(prompt, /agile delivery experience/);
  assert.doesNotMatch(prompt, /&lt;|&gt;|<div|<p>|<strong>/);
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------
// generateTailorSuggestions - bounded retry on a failed structured-output parse
// ---------------------------------------------------------------------------

const tailorJob: NormalizedJob & { company: string } = {
  id: 1,
  title: "Solutions Consultant",
  absolute_url: "https://example.com/job/1",
  content: "We need someone with agile delivery experience.",
  company: "Acme",
};

test("generateTailorSuggestions retries after parsed_output: null (e.g. a refusal) and succeeds on a later attempt", async () => {
  let calls = 0;
  const client = fakeClient(async () => {
    calls += 1;
    if (calls < 3) return { parsed_output: null, stop_reason: "refusal", stop_details: null };
    return { parsed_output: { suggestions: [] } };
  });

  const suggestions = await generateTailorSuggestions(client, tailorJob, resumeFixture);
  assert.deepEqual(suggestions, []);
  assert.equal(calls, 3);
});

test("generateTailorSuggestions retries after a thrown parse error and succeeds on a later attempt", async () => {
  let calls = 0;
  const client = fakeClient(async () => {
    calls += 1;
    if (calls < 2) throw new Error("Failed to parse structured output as JSON: Unexpected end of JSON input");
    return {
      parsed_output: {
        suggestions: [{ type: "reorder", target: "highlights", newOrder: [0, 1, 2], rationale: "r" }],
      },
    };
  });

  const suggestions = await generateTailorSuggestions(client, tailorJob, resumeFixture);
  assert.equal(suggestions.length, 1);
  assert.equal(calls, 2);
});

test("generateTailorSuggestions gives up after exhausting retries and reports the model's stop reason", async () => {
  let calls = 0;
  const client = fakeClient(async () => {
    calls += 1;
    return {
      parsed_output: null,
      stop_reason: "refusal",
      stop_details: { type: "refusal", category: "general_harms", explanation: "policy violation" },
    };
  });

  await assert.rejects(
    generateTailorSuggestions(client, tailorJob, resumeFixture),
    /did not parse against the suggestion schema after 3 attempts \(refusal: policy violation\)/,
  );
  assert.equal(calls, 3);
});

// ---------------------------------------------------------------------------
// buildTailorPrompt - the "Revise" action's prior-suggestion and notes context
// ---------------------------------------------------------------------------

test("buildTailorPrompt appends a revision section carrying accepted/rejected state and the captain's notes", () => {
  const job: NormalizedJob & { company: string } = {
    id: 1,
    title: "Solutions Consultant",
    absolute_url: "https://example.com/job/1",
    content: "We need someone with agile delivery experience.",
    company: "Acme",
  };
  const revision: TailorRevisionRequest = {
    priorSuggestions: [
      {
        suggestion: { id: "s1", type: "reorder", target: "collate", newOrder: [1, 0, 2], rationale: "r" },
        accepted: true,
      },
      {
        suggestion: {
          id: "s2",
          type: "new-phrasing",
          role: "benchling",
          text: "Bad phrasing",
          groundedIn: "Benchling bullet 0",
          rationale: "r",
        },
        accepted: false,
      },
    ],
    notes: "You got my Personal Sabbatical role wrong, fix it.",
  };

  const prompt = buildTailorPrompt(job, resumeFixture, revision);
  assert.match(prompt, /Revision request/);
  assert.match(prompt, /kept/);
  assert.match(prompt, /rejected/);
  assert.match(prompt, /You got my Personal Sabbatical role wrong, fix it\./);
});

test("buildTailorPrompt omits the revision section entirely when no revision is passed", () => {
  const job: NormalizedJob & { company: string } = {
    id: 1,
    title: "Solutions Consultant",
    absolute_url: "https://example.com/job/1",
    content: "We need someone with agile delivery experience.",
    company: "Acme",
  };
  const prompt = buildTailorPrompt(job, resumeFixture);
  assert.doesNotMatch(prompt, /Revision request/);
});

// ---------------------------------------------------------------------------
// parseTailorSuggestRequestBody - the /suggestions route's envelope check
// ---------------------------------------------------------------------------

test("parseTailorSuggestRequestBody accepts a plain { source, id } body and one with a revision block", () => {
  assert.notEqual(parseTailorSuggestRequestBody({ source: "greenhouse", id: "123" }), null);
  assert.notEqual(
    parseTailorSuggestRequestBody({
      source: "lever",
      id: 42,
      revision: {
        priorSuggestions: [
          {
            suggestion: { id: "s1", type: "reorder", target: "highlights", newOrder: [0, 1, 2], rationale: "r" },
            accepted: true,
          },
        ],
        notes: "fix it",
      },
    }),
    null,
  );
});

test("parseTailorSuggestRequestBody rejects an unknown source and a missing id", () => {
  assert.equal(parseTailorSuggestRequestBody({ source: "workday", id: "1" }), null);
  assert.equal(parseTailorSuggestRequestBody({ source: "greenhouse" }), null);
});

// ---------------------------------------------------------------------------
// content/job-agent-keywords.ts abbreviation mapping
// ---------------------------------------------------------------------------

test("jobAgentKeywordFamilyAbbreviations covers all five tracked families with the documented abbreviations", () => {
  assert.deepEqual(jobAgentKeywordFamilyAbbreviations, {
    "Solutions Consultant": "SC",
    "Sales Engineer": "SE",
    "Implementation Manager": "IM",
    "Customer Success Manager": "CS",
    "Solutions Architect": "SA",
  });
});

// ---------------------------------------------------------------------------
// tailor-auth.ts - the passphrase gate
// ---------------------------------------------------------------------------

test("verifyTailorPassphrase accepts only a header matching TAILOR_PASSPHRASE, and rejects when unset", () => {
  const previous = process.env.TAILOR_PASSPHRASE;
  process.env.TAILOR_PASSPHRASE = "sw0rdfish";
  try {
    const matching = new Request("http://x", { headers: { "x-tailor-passphrase": "sw0rdfish" } });
    assert.equal(verifyTailorPassphrase(matching), true);

    const wrong = new Request("http://x", { headers: { "x-tailor-passphrase": "guess" } });
    assert.equal(verifyTailorPassphrase(wrong), false);

    const missing = new Request("http://x");
    assert.equal(verifyTailorPassphrase(missing), false);

    delete process.env.TAILOR_PASSPHRASE;
    assert.equal(verifyTailorPassphrase(matching), false);
  } finally {
    if (previous === undefined) delete process.env.TAILOR_PASSPHRASE;
    else process.env.TAILOR_PASSPHRASE = previous;
  }
});

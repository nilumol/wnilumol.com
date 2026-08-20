import assert from "node:assert/strict";
import { test } from "node:test";
import { jobAgentKeywordFamilyAbbreviations } from "../../content/job-agent-keywords.ts";
import type { ResumeData } from "../../content/resume-data.ts";
import { mergeTailoredResume } from "./resume-tailor.ts";
import { buildTailorPrompt } from "./tailor-suggestions.ts";
import type { TailorSuggestion } from "./tailor-types.ts";
import { verifyTailorPassphrase } from "./tailor-auth.ts";
import type { NormalizedJob } from "./types.ts";

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
});

test("mergeTailoredResume reorders and appends new-phrasing bullets on the Collate role only", () => {
  const suggestions: TailorSuggestion[] = [
    { id: "s1", type: "reorder", target: "collate", newOrder: [2, 1, 0], rationale: "r" },
    { id: "s2", type: "new-phrasing", role: "collate", text: "New Collate bullet", groundedIn: "Collate bullet 1", rationale: "r" },
  ];
  const result = mergeTailoredResume(resumeFixture, suggestions, "");
  const collate = result.roles.find((r) => r.company === "Collate")!;
  assert.deepEqual(collate.bullets, ["Collate bullet 2", "Collate bullet 1", "Collate bullet 0", "New Collate bullet"]);
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
  assert.deepEqual(genentech.bullets, resumeFixture.roles[2]!.bullets);
  assert.deepEqual(merck.bullets, resumeFixture.roles[3]!.bullets);
});

test("mergeTailoredResume trims and carries the captain's own free text separately from suggestions", () => {
  const result = mergeTailoredResume(resumeFixture, [], "  My own notes.  ");
  assert.equal(result.ownText, "My own notes.");
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

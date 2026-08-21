import assert from "node:assert/strict";
import { test } from "node:test";
import type { ResumeData } from "../../content/resume-data.ts";
import { buildDraftPrompt } from "./application-draft.ts";
import { parseApplicationDraftRequestBody } from "./application-draft-types.ts";
import type { NormalizedJob } from "./types.ts";

const resumeFixture: ResumeData = {
  headline: "Headline.",
  highlights: ["Highlight A"],
  roles: [
    {
      title: "Senior Implementations Manager",
      company: "Collate",
      companyContext: "AI for Life Sciences",
      dates: "May 2026 - Present",
      bullets: ["Collate bullet 0"],
    },
  ],
  areasOfExpertise: { technologiesAndTools: ["SQL"], salesMethodologies: ["MEDDIC"], keySkills: ["Discovery"] },
  education: ["B.S. in General Biology"],
  executiveEndorsement: "Great engineer.",
};

const job: NormalizedJob & { company: string } = {
  id: 1,
  title: "Solutions Consultant",
  absolute_url: "https://example.com/job/1",
  content: "We need someone with agile delivery experience.",
  company: "Acme",
};

// ---------------------------------------------------------------------------
// buildDraftPrompt - grounding, voice, and question fidelity
// ---------------------------------------------------------------------------

test("buildDraftPrompt includes the resume, the job posting, the voice section, and every question verbatim in order", () => {
  const prompt = buildDraftPrompt(job, resumeFixture, [
    { id: "q-0", prompt: "Why do you want to work here?" },
    { id: "q-1", prompt: "Describe a time you solved a hard problem." },
  ]);

  assert.match(prompt, /Highlight A/);
  assert.match(prompt, /Collate bullet 0/);
  assert.match(prompt, /Acme/);
  assert.match(prompt, /Solutions Consultant/);
  assert.match(prompt, /agile delivery experience/);
  assert.match(prompt, /## Voice: Formal professional voice/);
  assert.match(prompt, /0\. Why do you want to work here\?/);
  assert.match(prompt, /1\. Describe a time you solved a hard problem\./);
  assert.ok(prompt.indexOf("Why do you want") < prompt.indexOf("Describe a time"), "questions should stay in the order they were sent");
});

// ---------------------------------------------------------------------------
// parseApplicationDraftRequestBody - the /draft route's envelope check
// ---------------------------------------------------------------------------

test("parseApplicationDraftRequestBody accepts a well-formed body", () => {
  assert.notEqual(
    parseApplicationDraftRequestBody({
      source: "greenhouse",
      id: "123",
      questions: [{ id: "q-0", prompt: "Why us?" }],
    }),
    null,
  );
});

test("parseApplicationDraftRequestBody rejects an empty questions list and a missing id", () => {
  assert.equal(parseApplicationDraftRequestBody({ source: "greenhouse", id: "123", questions: [] }), null);
  assert.equal(parseApplicationDraftRequestBody({ source: "greenhouse", questions: [{ id: "q-0", prompt: "x" }] }), null);
  assert.equal(parseApplicationDraftRequestBody(null), null);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { buildVoiceSection, voiceProfiles } from "../../content/voice-profile/index.ts";

// ---------------------------------------------------------------------------
// buildVoiceSection - graceful per-category fallback while samples are still being gathered
// ---------------------------------------------------------------------------

test("buildVoiceSection falls back to the resume-derived tone description when a category has no samples", () => {
  assert.equal(voiceProfiles.formalProfessional.samples.length, 0);
  const section = buildVoiceSection("formalProfessional");
  assert.match(section, /No real writing samples are captured yet/);
  assert.match(section, /Winston's own resume data/);
  assert.doesNotMatch(section, /Sample 1:/);
});

test("buildVoiceSection uses real samples once a category has them, without falling back", () => {
  const original = [...voiceProfiles.shortFormOutreach.samples];
  voiceProfiles.shortFormOutreach.samples = [{ label: "Test sample", text: "Hey - loved the talk, let's connect." }];
  try {
    const section = buildVoiceSection("shortFormOutreach");
    assert.match(section, /Sample 1: Test sample/);
    assert.match(section, /Hey - loved the talk, let's connect\./);
    assert.doesNotMatch(section, /No real writing samples are captured yet/);
  } finally {
    voiceProfiles.shortFormOutreach.samples = original;
  }
});

test("every voice category has a distinct description", () => {
  const descriptions = new Set(Object.values(voiceProfiles).map((profile) => profile.description));
  assert.equal(descriptions.size, 3);
});

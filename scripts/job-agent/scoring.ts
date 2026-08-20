import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { STRONG_FIT_CUTOFF } from "../../content/job-agent-config.ts";
import type { ResumeData } from "../../content/resume-data.ts";
import { htmlToPlainText } from "./html.ts";
import type { CandidateJob, FitScoreResult } from "./types.ts";

export { STRONG_FIT_CUTOFF };

export const JOB_AGENT_MODEL = "claude-sonnet-5";

const FitScoreSchema = z.object({
  score: z.number().int().min(1).max(10),
  rationale: z.string().min(1),
  compensationRange: z
    .string()
    .min(1)
    .nullable()
    .describe(
      "Any pay/compensation range explicitly stated in the posting content (e.g. " +
        '"$120,000-$150,000" or "$85K-$115K annually"), taken verbatim or lightly ' +
        "normalized. Null if the posting does not state a specific figure or range - do not " +
        "guess or infer one from level or title.",
    ),
});

function formatResumeForPrompt(resumeData: ResumeData): string {
  const roles = resumeData.roles
    .map((role) => {
      const bullets = role.bullets.map((bullet) => `  - ${bullet}`).join("\n");
      return `### ${role.title}, ${role.company} (${role.companyContext}) — ${role.dates}\n${bullets}`;
    })
    .join("\n\n");

  return [
    `## Headline\n${resumeData.headline}`,
    `## Highlights\n${resumeData.highlights.map((h) => `- ${h}`).join("\n")}`,
    `## Experience\n${roles}`,
    [
      "## Areas of expertise",
      `- Technologies/Tools: ${resumeData.areasOfExpertise.technologiesAndTools.join(", ")}`,
      `- Sales methodologies: ${resumeData.areasOfExpertise.salesMethodologies.join(", ")}`,
      `- Key skills: ${resumeData.areasOfExpertise.keySkills.join(", ")}`,
    ].join("\n"),
    `## Education\n${resumeData.education.join("\n")}`,
    `## Executive endorsement\n${resumeData.executiveEndorsement}`,
  ].join("\n\n");
}

/**
 * Builds the full scoring prompt: the rubric markdown (read verbatim from
 * content/job-agent-scoring.md by the caller), the structured resume, and the job posting.
 * Pure function - no network - so it can be unit-tested/dry-run without an API key.
 */
export function buildScoringPrompt(
  candidate: CandidateJob,
  resumeData: ResumeData,
  rubricMarkdown: string,
): string {
  const jobText = candidate.job.content
    ? htmlToPlainText(candidate.job.content)
    : "(no description provided)";

  return [
    rubricMarkdown,
    "---",
    "## Winston Nilumol's resume",
    formatResumeForPrompt(resumeData),
    "---",
    "## Job posting to score",
    `Company: ${candidate.company}`,
    `Title: ${candidate.job.title}`,
    `Matched keyword family: ${candidate.keywordFamily}`,
    `Posting URL: ${candidate.job.absolute_url}`,
    "",
    jobText,
  ].join("\n\n");
}

/**
 * Calls Claude directly for one job. Used only by the standalone, opt-in
 * `job-agent:score-via-api` script - never by the automated GitHub Actions pipeline, which
 * writes new jobs as "pending" and leaves scoring to a separate step (see
 * `scripts/job-agent/apply-scores.ts`).
 */
export async function scoreJobWithClaude(
  client: Anthropic,
  candidate: CandidateJob,
  resumeData: ResumeData,
  rubricMarkdown: string,
): Promise<FitScoreResult> {
  const prompt = buildScoringPrompt(candidate, resumeData, rubricMarkdown);

  const response = await client.messages.parse({
    model: JOB_AGENT_MODEL,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
    output_config: { format: zodOutputFormat(FitScoreSchema) },
  });

  if (!response.parsed_output) {
    throw new Error(
      `job-agent: Claude's response for job ${candidate.job.id} ("${candidate.job.title}") ` +
        "did not parse against the fit-score schema.",
    );
  }
  return response.parsed_output;
}

/**
 * Reads the Anthropic API key from the local environment. Only `job-agent:score-via-api` needs
 * this - it is never required by the automated GitHub Actions workflow, which makes no LLM call.
 */
export function getAnthropicApiKeyOrThrow(): string {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "job-agent: ANTHROPIC_API_KEY environment variable is not set. Set it in your local " +
        "environment before running `npm run job-agent:score-via-api`.",
    );
  }
  return apiKey;
}

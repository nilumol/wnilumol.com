import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { buildVoiceSection } from "../../content/voice-profile/index.ts";
import type { ResumeData } from "../../content/resume-data.ts";
import type { ApplicationDraftAnswer } from "./application-draft-types.ts";
import { htmlToPlainText } from "./html.ts";
import { formatResumeForPrompt, JOB_AGENT_MODEL } from "./scoring.ts";
import type { NormalizedJob } from "./types.ts";

function numberedQuestions(questions: { prompt: string }[]): string {
  return questions.map((q, index) => `${index}. ${q.prompt}`).join("\n");
}

/**
 * Drafting always uses the "formalProfessional" voice category (cover letters/application
 * answers are exactly what that category is for) - not a client-chosen option. See
 * content/voice-profile/formal-professional.ts and docs/job-agent.md.
 */
export function buildDraftPrompt(
  job: NormalizedJob & { company: string },
  resumeData: ResumeData,
  questions: { id: string; prompt: string }[],
): string {
  return [
    "You are drafting answers to free-text questions on a real job application, for the " +
      "captain to review and paste into the real form himself - this is never submitted " +
      "automatically. Ground every answer in real content from the resume below - never invent " +
      "an accomplishment, employer, metric, or fact that isn't already true there. Keep each " +
      "answer concise and appropriate to a real application form (roughly 2-5 sentences unless " +
      "the question clearly calls for more).",
    buildVoiceSection("formalProfessional"),
    "---",
    "## Winston Nilumol's resume",
    formatResumeForPrompt(resumeData),
    "---",
    "## Job posting",
    `Company: ${job.company}`,
    `Title: ${job.title}`,
    "",
    job.content ? htmlToPlainText(job.content) : "(no description provided)",
    "---",
    "## Questions to answer, in order - return exactly one answer per question, same order",
    numberedQuestions(questions),
  ].join("\n\n");
}

/**
 * Calls Claude to draft one answer per question, constrained by structured outputs to exactly
 * `questions.length` answers in the same order (the model is never asked to echo ids back -
 * position is the correlation, same defensive spirit as tailor-suggestions.ts's permutation
 * check). Never called by the scan itself - only the passphrase-gated "Draft Answers" action,
 * a separate request from Scan Application by design.
 */
export async function draftApplicationAnswers(
  client: Anthropic,
  job: NormalizedJob & { company: string },
  resumeData: ResumeData,
  questions: { id: string; prompt: string }[],
): Promise<ApplicationDraftAnswer[]> {
  const prompt = buildDraftPrompt(job, resumeData, questions);
  const responseSchema = z.object({
    answers: z.array(z.object({ answer: z.string().min(1) })).length(questions.length),
  });

  const response = await client.messages.parse({
    model: JOB_AGENT_MODEL,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
    output_config: { format: zodOutputFormat(responseSchema) },
  });

  if (!response.parsed_output) {
    throw new Error(`application-draft: response for "${job.title}" did not parse against the draft schema.`);
  }

  return questions.map((question, index) => ({
    id: question.id,
    answer: response.parsed_output!.answers[index]!.answer,
  }));
}

import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import type { CandidateJob, FitScoreResult } from "./types.ts";

export const RESUME_NOTES_DIR = "content/job-scout-resume-notes";

/** Repo-relative path (from repo root) for a job's resume-adjustment document. */
export function resumeNotesRelativePath(jobId: number): string {
  return `${RESUME_NOTES_DIR}/${jobId}.md`;
}

/**
 * Writes a distinct markdown resume-adjustment document for one below-cutoff job. Returns the
 * repo-relative path, for storing in the ledger's `resumeNotesPath`.
 */
export function writeResumeNotes(
  repoRoot: string,
  candidate: CandidateJob,
  result: FitScoreResult,
): string {
  mkdirSync(join(repoRoot, RESUME_NOTES_DIR), { recursive: true });

  const relativePath = resumeNotesRelativePath(candidate.job.id);
  const content = [
    `# Resume adjustments — ${candidate.job.title} (${candidate.company})`,
    "",
    `Fit score: ${result.score}/10`,
    "",
    `Posting: ${candidate.job.absolute_url}`,
    "",
    "## Suggested adjustments",
    "",
    result.resumeAdjustments,
    "",
  ].join("\n");

  writeFileSync(join(repoRoot, relativePath), content, "utf-8");
  return relativePath;
}

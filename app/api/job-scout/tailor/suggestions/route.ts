import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { jobScoutBoards } from "@/content/job-scout-boards";
import ledgerJson from "@/content/job-scout-seen.json";
import { resumeData } from "@/content/resume-data";
import { fetchAshbyBoardJobs } from "@/scripts/job-scout/ashby";
import { fetchBoardJobs } from "@/scripts/job-scout/greenhouse";
import { fetchLeverBoardJobs } from "@/scripts/job-scout/lever";
import { ledgerKey } from "@/scripts/job-scout/ledger";
import { fetchBoardNormalized } from "@/scripts/job-scout/pipeline";
import { verifyTailorPassphrase } from "@/scripts/job-scout/tailor-auth";
import { generateTailorSuggestions } from "@/scripts/job-scout/tailor-suggestions";
import type { TailorSuggestRequestBody } from "@/scripts/job-scout/tailor-types";
import type { JobScoutLedger, JobScoutSource } from "@/scripts/job-scout/types";

export const runtime = "nodejs";

const ledger = ledgerJson as unknown as JobScoutLedger;
const SOURCES: JobScoutSource[] = ["greenhouse", "lever", "ashby"];

function parseBody(value: unknown): TailorSuggestRequestBody | null {
  if (typeof value !== "object" || value === null) return null;
  const { source, id } = value as Record<string, unknown>;
  if (typeof source !== "string" || !SOURCES.includes(source as JobScoutSource)) return null;
  if (typeof id !== "string" && typeof id !== "number") return null;
  return { source: source as JobScoutSource, id };
}

/**
 * Generates resume-tailoring suggestions for one job the captain sent forward from
 * Opportunities. Re-fetches the posting's live content the same way score-via-api.ts does (the
 * ledger doesn't persist full descriptions), then calls Claude with only the highlights array
 * and the Collate/Benchling role bullets as reorderable/groundable targets - see
 * scripts/job-scout/tailor-suggestions.ts and docs/job-scout.md for the guardrail this enforces.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!verifyTailorPassphrase(request)) {
    return NextResponse.json({ error: "Invalid or missing passphrase." }, { status: 401 });
  }

  const body = parseBody(await request.json().catch(() => null));
  if (!body) {
    return NextResponse.json({ error: "Request body must be { source, id }." }, { status: 400 });
  }

  const entry = ledger[ledgerKey(body.source, body.id)];
  if (!entry) {
    return NextResponse.json({ error: "Job not found in the ledger." }, { status: 404 });
  }

  const board = jobScoutBoards.find((b) => b.label === entry.company && b.source === entry.source);
  if (!board) {
    return NextResponse.json({ error: "No tracked board for this job's company." }, { status: 500 });
  }

  let fetchResult;
  try {
    fetchResult = await fetchBoardNormalized(board, {
      greenhouse: fetchBoardJobs,
      lever: fetchLeverBoardJobs,
      ashby: fetchAshbyBoardJobs,
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to fetch the live posting: ${(error as Error).message}` },
      { status: 502 },
    );
  }

  const job = fetchResult.jobs.find((candidate) => String(candidate.id) === String(entry.id));
  if (!job) {
    return NextResponse.json({ error: "This posting is no longer live." }, { status: 404 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured." }, { status: 500 });
  }

  try {
    const client = new Anthropic({ apiKey });
    const suggestions = await generateTailorSuggestions(client, { ...job, company: entry.company }, resumeData);
    return NextResponse.json({ suggestions });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}

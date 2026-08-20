import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { jobAgentBoards } from "@/content/job-agent-boards";
import ledgerJson from "@/content/job-agent-seen.json";
import { resumeData } from "@/content/resume-data";
import { fetchAshbyBoardJobs } from "@/scripts/job-agent/ashby";
import { fetchBoardJobs } from "@/scripts/job-agent/greenhouse";
import { fetchLeverBoardJobs } from "@/scripts/job-agent/lever";
import { ledgerKey } from "@/scripts/job-agent/ledger";
import { fetchBoardNormalized } from "@/scripts/job-agent/pipeline";
import { verifyTailorPassphrase } from "@/scripts/job-agent/tailor-auth";
import { generateTailorSuggestions } from "@/scripts/job-agent/tailor-suggestions";
import { parseTailorSuggestRequestBody } from "@/scripts/job-agent/tailor-types";
import type { JobAgentLedger } from "@/scripts/job-agent/types";

export const runtime = "nodejs";

const ledger = ledgerJson as unknown as JobAgentLedger;

/**
 * Generates resume-tailoring suggestions for one job the captain sent forward from
 * Opportunities - the "Tailor This Resume" action, or, when the request carries a `revision`
 * block, the "Revise" action re-running with the captain's notes and prior accept/reject state.
 * Re-fetches the posting's live content the same way score-via-api.ts does (the ledger doesn't
 * persist full descriptions), then calls Claude with only the highlights array and the
 * Collate/Benchling role bullets as reorderable/groundable targets - see
 * scripts/job-agent/tailor-suggestions.ts and docs/job-agent.md for the guardrail this enforces.
 * This and the initial call are the only two places besides Claude's structured-output schema
 * itself that ever make a real Anthropic API call in Tailor My Profile - Review and Generate PDF
 * never do.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!verifyTailorPassphrase(request)) {
    return NextResponse.json({ error: "Invalid or missing passphrase." }, { status: 401 });
  }

  const body = parseTailorSuggestRequestBody(await request.json().catch(() => null));
  if (!body) {
    return NextResponse.json({ error: "Request body must be { source, id, revision? }." }, { status: 400 });
  }

  const entry = ledger[ledgerKey(body.source, body.id)];
  if (!entry) {
    return NextResponse.json({ error: "Job not found in the ledger." }, { status: 404 });
  }

  const board = jobAgentBoards.find((b) => b.label === entry.company && b.source === entry.source);
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
    const suggestions = await generateTailorSuggestions(
      client,
      { ...job, company: entry.company },
      resumeData,
      body.revision,
    );
    return NextResponse.json({ suggestions });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}

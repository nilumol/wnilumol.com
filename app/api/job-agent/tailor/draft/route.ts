import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { jobAgentBoards } from "@/content/job-agent-boards";
import ledgerJson from "@/content/job-agent-seen.json";
import { resumeData } from "@/content/resume-data";
import { draftApplicationAnswers } from "@/scripts/job-agent/application-draft";
import { parseApplicationDraftRequestBody } from "@/scripts/job-agent/application-draft-types";
import { fetchAshbyBoardJobs } from "@/scripts/job-agent/ashby";
import { fetchBoardJobs } from "@/scripts/job-agent/greenhouse";
import { fetchLeverBoardJobs } from "@/scripts/job-agent/lever";
import { ledgerKey } from "@/scripts/job-agent/ledger";
import { fetchBoardNormalized } from "@/scripts/job-agent/pipeline";
import { verifyTailorPassphrase } from "@/scripts/job-agent/tailor-auth";
import type { JobAgentLedger } from "@/scripts/job-agent/types";

export const runtime = "nodejs";

const ledger = ledgerJson as unknown as JobAgentLedger;

/**
 * Drafts an answer for each free-text question Scan Application already surfaced for one job -
 * Tailor My Profile's "Draft Answers" action, a second, separate call from /scan by design (the
 * questions render immediately once scanning finishes; drafting is a deliberate follow-on step).
 * Re-fetches the posting's live content the same way /suggestions does (the ledger doesn't
 * persist full descriptions), then calls Claude grounded in resumeData and
 * content/voice-profile's "formalProfessional" voice (falling back to a resume-derived tone
 * description when no real samples are captured yet - see content/voice-profile/index.ts).
 * Review-only: answers are returned for the captain to copy into the real form himself, never
 * submitted or persisted server-side.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!verifyTailorPassphrase(request)) {
    return NextResponse.json({ error: "Invalid or missing passphrase." }, { status: 401 });
  }

  const body = parseApplicationDraftRequestBody(await request.json().catch(() => null));
  if (!body) {
    return NextResponse.json({ error: "Request body must be { source, id, questions }." }, { status: 400 });
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
    const answers = await draftApplicationAnswers(client, { ...job, company: entry.company }, resumeData, body.questions);
    return NextResponse.json({ answers });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}

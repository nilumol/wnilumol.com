import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import ledgerJson from "@/content/job-agent-seen.json";
import { resumeData } from "@/content/resume-data";
import { draftApplicationAnswers } from "@/scripts/job-agent/application-draft";
import { parseApplicationDraftRequestBody } from "@/scripts/job-agent/application-draft-types";
import { OpportunityContextError, resolveOpportunityContext } from "@/scripts/job-agent/opportunity-context";
import { verifyTailorPassphrase } from "@/scripts/job-agent/tailor-auth";
import type { JobAgentLedger } from "@/scripts/job-agent/types";

export const runtime = "nodejs";

const ledger = ledgerJson as unknown as JobAgentLedger;

/**
 * Drafts an answer for each free-text question Scan Application already surfaced for one job -
 * Tailor My Profile's "Draft Answers" action, a second, separate call from /scan by design (the
 * questions render immediately once scanning finishes; drafting is a deliberate follow-on step).
 * Resolves posting content the same way /suggestions does (live for automated rows, captured for
 * manual rows), then calls Claude grounded in resumeData and
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

  let context;
  try {
    context = await resolveOpportunityContext(ledger, body.source, body.id);
  } catch (error) {
    const status =
      error instanceof OpportunityContextError
        ? error.code === "not-live"
          ? 404
          : error.code === "fetch"
            ? 502
            : 500
        : 500;
    return NextResponse.json(
      { error: (error as Error).message },
      { status },
    );
  }
  if (!context) {
    return NextResponse.json({ error: "Job not found in stored opportunities." }, { status: 404 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured." }, { status: 500 });
  }

  try {
    const client = new Anthropic({ apiKey });
    const answers = await draftApplicationAnswers(
      client,
      { ...context.posting, company: context.entry.company },
      resumeData,
      body.questions,
    );
    return NextResponse.json({ answers });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}

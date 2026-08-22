import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import ledgerJson from "@/content/job-agent-seen.json";
import { resumeData } from "@/content/resume-data";
import { OpportunityContextError, resolveOpportunityContext } from "@/scripts/job-agent/opportunity-context";
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
 * Re-fetches automated-ledger posting content the same way score-via-api.ts does, or uses the
 * captured description persisted for a manual opportunity, then calls Claude with only the
 * highlights array and the Collate/Benchling role bullets as reorderable/groundable targets - see
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
    const suggestions = await generateTailorSuggestions(
      client,
      { ...context.posting, company: context.entry.company },
      resumeData,
      body.revision,
    );
    return NextResponse.json({ suggestions });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import ledgerJson from "@/content/job-agent-seen.json";
import { ManualOpportunityError } from "@/scripts/job-agent/manual-opportunity-extract";
import { parseManualOpportunityRequestBody } from "@/scripts/job-agent/manual-opportunity-types";
import {
  addManualOpportunity,
  DuplicateManualOpportunityError,
} from "@/scripts/job-agent/manual-opportunities";
import { verifyTailorPassphrase } from "@/scripts/job-agent/tailor-auth";
import type { JobAgentLedger } from "@/scripts/job-agent/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const ledger = ledgerJson as unknown as JobAgentLedger;

function extractionStatus(error: ManualOpportunityError): number {
  switch (error.code) {
    case "invalid-url":
    case "unsupported-url":
    case "incomplete":
      return 400;
    case "not-found":
      return 404;
    case "upstream":
      return 502;
  }
}

/**
 * Adds one supported ATS posting to the private manual-opportunity JSON store. The same
 * passphrase used by Tailor protects this server-side fetch/write path because /job-agent is
 * hidden but does not have a user-account login.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!verifyTailorPassphrase(request)) {
    return NextResponse.json({ error: "Invalid or missing passphrase." }, { status: 401 });
  }

  const body = parseManualOpportunityRequestBody(await request.json().catch(() => null));
  if (!body) {
    return NextResponse.json({ error: "Request body must contain one job-posting URL." }, { status: 400 });
  }

  try {
    const record = await addManualOpportunity(body.url, ledger);
    return NextResponse.json({ entry: record.entry }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateManualOpportunityError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof ManualOpportunityError) {
      return NextResponse.json({ error: error.message }, { status: extractionStatus(error) });
    }
    return NextResponse.json(
      { error: `Couldn't persist the opportunity: ${(error as Error).message}` },
      { status: 500 },
    );
  }
}

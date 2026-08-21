import { NextResponse } from "next/server";
import ledgerJson from "@/content/job-agent-seen.json";
import { ledgerKey } from "@/scripts/job-agent/ledger";
import { resolveOpportunityEntry } from "@/scripts/job-agent/opportunity-context";
import { verifyTailorPassphrase } from "@/scripts/job-agent/tailor-auth";
import { parseTailorStatusRequestBody } from "@/scripts/job-agent/tailor-types";
import { writeTrackerOverlayEntry } from "@/scripts/job-agent/tracker-overlay";
import type { JobAgentLedger } from "@/scripts/job-agent/types";

export const runtime = "nodejs";

const ledger = ledgerJson as unknown as JobAgentLedger;

/**
 * "Mark Applied"/"Mark Passed" from Tailor My Profile - the only writable status path outside a
 * captain hand-edit to content/job-agent-seen.json. Writes to the live Blob overlay
 * (scripts/job-agent/tracker-overlay.ts) only; the git-committed ledger is never touched. Looks
 * the job up server-side (same pattern as /suggestions) so snapshot fields always come from the
 * git ledger or manual opportunity store, never from client input.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!verifyTailorPassphrase(request)) {
    return NextResponse.json({ error: "Invalid or missing passphrase." }, { status: 401 });
  }

  const body = parseTailorStatusRequestBody(await request.json().catch(() => null));
  if (!body) {
    return NextResponse.json({ error: "Request body must be { source, id, status }." }, { status: 400 });
  }

  let entry;
  try {
    entry = await resolveOpportunityEntry(ledger, body.source, body.id);
  } catch (error) {
    return NextResponse.json({ error: `Couldn't load the opportunity: ${(error as Error).message}` }, { status: 500 });
  }
  if (!entry) {
    return NextResponse.json({ error: "Job not found in stored opportunities." }, { status: 404 });
  }

  try {
    await writeTrackerOverlayEntry(ledgerKey(body.source, body.id), body.status, entry);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import ledgerJson from "@/content/job-agent-seen.json";
import { ledgerKey } from "@/scripts/job-agent/ledger";
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
 * the job up server-side (same pattern as /suggestions) so title/company/location/absoluteUrl in
 * the overlay snapshot always come from the ledger, never from client input.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!verifyTailorPassphrase(request)) {
    return NextResponse.json({ error: "Invalid or missing passphrase." }, { status: 401 });
  }

  const body = parseTailorStatusRequestBody(await request.json().catch(() => null));
  if (!body) {
    return NextResponse.json({ error: "Request body must be { source, id, status }." }, { status: 400 });
  }

  const entry = ledger[ledgerKey(body.source, body.id)];
  if (!entry) {
    return NextResponse.json({ error: "Job not found in the ledger." }, { status: 404 });
  }

  try {
    await writeTrackerOverlayEntry(ledgerKey(body.source, body.id), body.status, entry);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

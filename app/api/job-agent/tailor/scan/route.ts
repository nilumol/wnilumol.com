import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import ledgerJson from "@/content/job-agent-seen.json";
import { classifyApplicationPage, scrapeApplicationPage } from "@/scripts/job-agent/application-scan";
import { parseApplicationScanRequestBody } from "@/scripts/job-agent/application-scan-types";
import { ledgerKey } from "@/scripts/job-agent/ledger";
import { verifyTailorPassphrase } from "@/scripts/job-agent/tailor-auth";
import type { JobAgentLedger } from "@/scripts/job-agent/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const ledger = ledgerJson as unknown as JobAgentLedger;

/**
 * Scans the real application page for one job the captain sent forward from Opportunities -
 * Tailor My Profile's second-stage "Scan Application" action. Loads the ledger entry's
 * `absoluteUrl` (the same "Open application" link already shown on the card) with headless
 * Chromium, extracts a generic ATS-agnostic snapshot of its form fields and visible text (see
 * scripts/job-agent/application-scan.ts), then asks Claude to classify cover-letter acceptance
 * and free-text questions. Read-only: never fills in or submits the real form, and nothing here
 * is persisted server-side.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!verifyTailorPassphrase(request)) {
    return NextResponse.json({ error: "Invalid or missing passphrase." }, { status: 401 });
  }

  const body = parseApplicationScanRequestBody(await request.json().catch(() => null));
  if (!body) {
    return NextResponse.json({ error: "Request body must be { source, id }." }, { status: 400 });
  }

  const entry = ledger[ledgerKey(body.source, body.id)];
  if (!entry) {
    return NextResponse.json({ error: "Job not found in the ledger." }, { status: 404 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured." }, { status: 500 });
  }

  try {
    const pageContent = await scrapeApplicationPage(entry.absoluteUrl);
    const client = new Anthropic({ apiKey });
    const result = await classifyApplicationPage(client, { company: entry.company, title: entry.title }, pageContent);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: `Couldn't scan the application page: ${(error as Error).message}` },
      { status: 502 },
    );
  }
}

import ledgerJson from "@/content/job-agent-seen.json";
import { createManualOpportunityPostHandler } from "@/scripts/job-agent/manual-opportunity-handler";
import type { JobAgentLedger } from "@/scripts/job-agent/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const ledger = ledgerJson as unknown as JobAgentLedger;

/**
 * Adds one supported ATS posting to the private manual-opportunity JSON store. This intake does
 * not invoke paid AI; Tailor's passphrase remains scoped to Tailor My Profile and its APIs.
 */
export const POST = createManualOpportunityPostHandler(ledger);

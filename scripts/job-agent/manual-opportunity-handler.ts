import { ManualOpportunityError } from "./manual-opportunity-extract.ts";
import { parseManualOpportunityRequestBody, type ManualOpportunityRecord } from "./manual-opportunity-types.ts";
import {
  addManualOpportunity,
  DuplicateManualOpportunityError,
} from "./manual-opportunities.ts";
import type { JobAgentLedger } from "./types.ts";

type AddManualOpportunity = (
  submittedUrl: string,
  ledger: JobAgentLedger,
) => Promise<ManualOpportunityRecord>;

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
 * Builds the public manual-intake POST handler. URL validation, extraction, and persistence are
 * the only gates here; Tailor authentication remains isolated to the paid AI and status routes.
 */
export function createManualOpportunityPostHandler(
  ledger: JobAgentLedger,
  add: AddManualOpportunity = addManualOpportunity,
): (request: Request) => Promise<Response> {
  return async function handleManualOpportunityPost(request: Request): Promise<Response> {
    const body = parseManualOpportunityRequestBody(await request.json().catch(() => null));
    if (!body) {
      return Response.json({ error: "Request body must contain one job-posting URL." }, { status: 400 });
    }

    try {
      const record = await add(body.url, ledger);
      return Response.json({ entry: record.entry }, { status: 201 });
    } catch (error) {
      if (error instanceof DuplicateManualOpportunityError) {
        return Response.json({ error: error.message }, { status: 409 });
      }
      if (error instanceof ManualOpportunityError) {
        return Response.json({ error: error.message }, { status: extractionStatus(error) });
      }
      return Response.json(
        { error: `Couldn't persist the opportunity: ${(error as Error).message}` },
        { status: 500 },
      );
    }
  };
}

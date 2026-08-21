import { get, put } from "@vercel/blob";
import { ledgerKey } from "./ledger.ts";
import {
  extractManualOpportunity,
  parseSupportedJobUrl,
  type ExtractedManualOpportunity,
} from "./manual-opportunity-extract.ts";
import {
  parseManualOpportunityStore,
  type ManualOpportunityRecord,
  type ManualOpportunityStore,
} from "./manual-opportunity-types.ts";
import type { JobAgentLedger } from "./types.ts";

const MANUAL_OPPORTUNITIES_PATHNAME = "job-agent/manual-opportunities.json";

export class DuplicateManualOpportunityError extends Error {
  constructor() {
    super("That opportunity is already in the Job Application Agent.");
    this.name = "DuplicateManualOpportunityError";
  }
}

function blobToken(): string {
  const token = process.env.JOB_AGENT_TRACKER_READ_WRITE_TOKEN;
  if (!token) throw new Error("JOB_AGENT_TRACKER_READ_WRITE_TOKEN is not configured.");
  return token;
}

export async function readManualOpportunities(): Promise<ManualOpportunityStore> {
  const token = blobToken();
  const result = await get(MANUAL_OPPORTUNITIES_PATHNAME, { access: "private", token, useCache: false });
  if (!result || result.statusCode !== 200) return {};
  return parseManualOpportunityStore(await new Response(result.stream).text());
}

export async function writeManualOpportunities(store: ManualOpportunityStore): Promise<void> {
  const token = blobToken();
  const sorted = Object.fromEntries(
    Object.entries(store).sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true })),
  );
  await put(MANUAL_OPPORTUNITIES_PATHNAME, `${JSON.stringify(sorted, null, 2)}\n`, {
    access: "private",
    token,
    contentType: "application/json",
    allowOverwrite: true,
  });
}

export interface AddManualOpportunityDependencies {
  readStore?: () => Promise<ManualOpportunityStore>;
  writeStore?: (store: ManualOpportunityStore) => Promise<void>;
  extract?: (
    target: ReturnType<typeof parseSupportedJobUrl>,
  ) => Promise<ExtractedManualOpportunity>;
  now?: () => string;
}

/**
 * Validates identity and checks both JSON storage layers before performing any remote extraction.
 * The record is written only after extraction returns every required field, so failures never
 * leave a partial row behind.
 */
export async function addManualOpportunity(
  submittedUrl: string,
  ledger: JobAgentLedger,
  dependencies: AddManualOpportunityDependencies = {},
): Promise<ManualOpportunityRecord> {
  const target = parseSupportedJobUrl(submittedUrl);
  const key = ledgerKey(target.source, target.postingId);
  if (key in ledger) throw new DuplicateManualOpportunityError();

  const readStore = dependencies.readStore ?? readManualOpportunities;
  const writeStore = dependencies.writeStore ?? writeManualOpportunities;
  const current = await readStore();

  if (key in current) throw new DuplicateManualOpportunityError();

  const extracted = dependencies.extract
    ? await dependencies.extract(target)
    : await extractManualOpportunity(target);
  const createdAt = dependencies.now?.() ?? extracted.entry.firstSeen;
  const record: ManualOpportunityRecord = {
    ...extracted,
    createdAt,
  };
  await writeStore({ ...current, [key]: record });
  return record;
}

export async function findManualOpportunity(
  source: string,
  id: string | number,
  readStore: () => Promise<ManualOpportunityStore> = readManualOpportunities,
): Promise<ManualOpportunityRecord | null> {
  const store = await readStore();
  return store[`${source}:${id}`] ?? null;
}

export function mergeOpportunityEntries(
  ledgerEntries: Iterable<ManualOpportunityRecord["entry"]>,
  manualStore: ManualOpportunityStore,
): ManualOpportunityRecord["entry"][] {
  const merged = new Map<string, ManualOpportunityRecord["entry"]>();
  for (const entry of ledgerEntries) merged.set(ledgerKey(entry.source, entry.id), entry);
  for (const [key, record] of Object.entries(manualStore)) {
    if (!merged.has(key)) merged.set(key, record.entry);
  }
  return [...merged.values()];
}

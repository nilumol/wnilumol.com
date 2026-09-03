import { BlobPreconditionFailedError, get, put, head } from "@vercel/blob";
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
const STORE_WRITE_ATTEMPTS = 5;

export interface ManualOpportunityStoreSnapshot {
  store: ManualOpportunityStore;
  etag: string | null;
}

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
  return (await readManualOpportunitySnapshot()).store;
}

async function readManualOpportunitySnapshot(): Promise<ManualOpportunityStoreSnapshot> {
  const token = blobToken();
  const result = await get(MANUAL_OPPORTUNITIES_PATHNAME, { access: "private", token, useCache: false });
  if (!result) return { store: {}, etag: null };
  if (result.statusCode !== 200 || !result.stream) {
    throw new Error(`Couldn't read the manual opportunity store (status ${result.statusCode}).`);
  }
  const meta = await head(MANUAL_OPPORTUNITIES_PATHNAME, { token });
  return {
    store: parseManualOpportunityStore(await new Response(result.stream).text()),
    etag: meta.etag,
  };
}

async function writeManualOpportunitySnapshot(
  store: ManualOpportunityStore,
  etag: string | null,
): Promise<void> {
  const token = blobToken();
  const sorted = Object.fromEntries(
    Object.entries(store).sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true })),
  );
  console.log("[DIAGNOSTIC] attempting write with ifMatch:", JSON.stringify(etag));
  await put(MANUAL_OPPORTUNITIES_PATHNAME, `${JSON.stringify(sorted, null, 2)}\n`, {
    access: "private",
    token,
    contentType: "application/json",
    allowOverwrite: etag !== null,
    ...(etag === null ? {} : { ifMatch: etag }),
  });
  console.log("[DIAGNOSTIC] write succeeded");
}

export async function writeManualOpportunities(store: ManualOpportunityStore): Promise<void> {
  const snapshot = await readManualOpportunitySnapshot();
  await writeManualOpportunitySnapshot(store, snapshot.etag);
}

function isStoreWriteConflict(error: unknown): boolean {
  return (
    error instanceof BlobPreconditionFailedError ||
    (error instanceof Error && /precondition failed|etag mismatch/i.test(error.message))
  );
}

export async function persistManualOpportunity(
  key: string,
  record: ManualOpportunityRecord,
  dependencies: {
    readSnapshot?: () => Promise<ManualOpportunityStoreSnapshot>;
    writeSnapshot?: (store: ManualOpportunityStore, etag: string | null) => Promise<void>;
  } = {},
): Promise<void> {
  const readSnapshot = dependencies.readSnapshot ?? readManualOpportunitySnapshot;
  const writeSnapshot = dependencies.writeSnapshot ?? writeManualOpportunitySnapshot;
  for (let attempt = 0; attempt < STORE_WRITE_ATTEMPTS; attempt += 1) {
    const snapshot = await readSnapshot();
    if (key in snapshot.store) throw new DuplicateManualOpportunityError();
    try {
      await writeSnapshot({ ...snapshot.store, [key]: record }, snapshot.etag);
      return;
    } catch (error) {
      console.log("[DIAGNOSTIC] write failed, full error:", JSON.stringify(error, Object.getOwnPropertyNames(error as object)));
      if (!isStoreWriteConflict(error) || attempt === STORE_WRITE_ATTEMPTS - 1) throw error;
    }
  }
}

export interface AddManualOpportunityDependencies {
  readStore?: () => Promise<ManualOpportunityStore>;
  writeStore?: (store: ManualOpportunityStore) => Promise<void>;
  persistRecord?: (key: string, record: ManualOpportunityRecord) => Promise<void>;
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

  const usesInjectedStore = dependencies.readStore !== undefined || dependencies.writeStore !== undefined;
  const readStore = dependencies.readStore ?? readManualOpportunities;
  const current = usesInjectedStore ? await readStore() : null;

  if (current && key in current) throw new DuplicateManualOpportunityError();

  const extracted = dependencies.extract
    ? await dependencies.extract(target)
    : await extractManualOpportunity(target);
  const createdAt = dependencies.now?.() ?? extracted.entry.firstSeen;
  const record: ManualOpportunityRecord = {
    ...extracted,
    createdAt,
  };
  if (dependencies.persistRecord) {
    await dependencies.persistRecord(key, record);
  } else if (usesInjectedStore) {
    const writeStore = dependencies.writeStore ?? writeManualOpportunities;
    await writeStore({ ...(current ?? {}), [key]: record });
  } else {
    await persistManualOpportunity(key, record);
  }
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

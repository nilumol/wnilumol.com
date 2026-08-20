import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { loadLedger, saveLedger } from "./ledger.ts";
import type { JobAgentLedger } from "./types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const LEDGER_PATH = join(REPO_ROOT, "content/job-agent-seen.json");

/** One scored job from a score batch JSON file. `id` is the ledger key (`<source>:<id>`). */
export interface ScoreBatchEntry {
  id: string;
  fitScore: number;
  fitRationale: string;
  compensationRange: string | null;
}

function isScoreBatchEntry(value: unknown): value is ScoreBatchEntry {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.fitScore === "number" &&
    typeof candidate.fitRationale === "string" &&
    (typeof candidate.compensationRange === "string" || candidate.compensationRange === null)
  );
}

export function parseScoreBatch(raw: string): ScoreBatchEntry[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`job-agent: apply-scores input is not valid JSON: ${(error as Error).message}`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error("job-agent: apply-scores input must be a JSON array.");
  }
  parsed.forEach((entry, index) => {
    if (!isScoreBatchEntry(entry)) {
      throw new Error(
        `job-agent: apply-scores input entry at index ${index} is malformed - expected ` +
          "{ id: string, fitScore: number, fitRationale: string, compensationRange: string | null }.",
      );
    }
  });
  return parsed as ScoreBatchEntry[];
}

/**
 * Merges a batch of scores into the ledger in place: for each entry, looks up its ledger key and,
 * if that entry's status is "pending", transitions it to "scored" and fills in the three scoring
 * fields. Validates every entry against the current ledger state before applying any of them, so
 * a batch containing one stale or malformed id fails atomically rather than partially corrupting
 * the ledger.
 */
export function applyScoresToLedger(ledger: JobAgentLedger, batch: ScoreBatchEntry[]): void {
  for (const entry of batch) {
    const existing = ledger[entry.id];
    if (!existing) {
      throw new Error(`job-agent: apply-scores: no ledger entry found for id "${entry.id}".`);
    }
    if (existing.status !== "pending") {
      throw new Error(
        `job-agent: apply-scores: ledger entry "${entry.id}" is not "pending" (status is ` +
          `"${existing.status}") - refusing to overwrite an already-scored or captain-set entry.`,
      );
    }
  }

  for (const entry of batch) {
    const existing = ledger[entry.id]!;
    existing.status = "scored";
    existing.fitScore = entry.fitScore;
    existing.fitRationale = entry.fitRationale;
    existing.compensationRange = entry.compensationRange;
  }
}

function main(): void {
  const inputPath = process.argv[2];
  if (!inputPath) {
    throw new Error("usage: npm run job-agent:apply-scores -- <path-to-json>");
  }

  const raw = readFileSync(inputPath, "utf-8");
  const batch = parseScoreBatch(raw);
  const ledger = loadLedger(LEDGER_PATH);
  applyScoresToLedger(ledger, batch);
  saveLedger(LEDGER_PATH, ledger);
  console.log(`job-agent: applied ${batch.length} score(s) to the ledger.`);
}

// Only runs the CLI when this file is executed directly (`npm run job-agent:apply-scores`),
// not when its pure functions are imported elsewhere (e.g. the test suite).
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

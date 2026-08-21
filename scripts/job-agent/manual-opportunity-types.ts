import { z } from "zod";
import type { JobAgentLedgerEntry, NormalizedJob } from "./types.ts";

const JobAgentSourceSchema = z.enum(["greenhouse", "lever", "ashby"]);

const LedgerEntrySchema = z.object({
  id: z.union([z.string(), z.number()]),
  source: JobAgentSourceSchema,
  company: z.string().min(1),
  title: z.string().min(1),
  keywordFamily: z.string().min(1),
  absoluteUrl: z.string().url(),
  firstSeen: z.string().min(1),
  status: z.enum(["pending", "scored", "applied", "passed", "expired"]),
  fitScore: z.number().optional(),
  fitRationale: z.string().optional(),
  location: z.string().nullable(),
  compensationRange: z.string().nullable(),
  postedAt: z.string().optional(),
});

const NormalizedJobSchema = z.object({
  id: z.union([z.string(), z.number()]),
  title: z.string().min(1),
  absolute_url: z.string().url(),
  content: z.string().min(1),
  location: z.object({ name: z.string() }).optional(),
  postedAt: z.string().optional(),
  structuredCompensationRange: z.string().nullable().optional(),
});

const ManualOpportunityRecordSchema = z.object({
  entry: LedgerEntrySchema,
  posting: NormalizedJobSchema,
  /** The exact supported URL submitted by the user, retained separately from the ATS canonical URL. */
  originalUrl: z.string().url(),
  createdAt: z.string().min(1),
});

export interface ManualOpportunityRecord {
  entry: JobAgentLedgerEntry;
  posting: NormalizedJob;
  originalUrl: string;
  createdAt: string;
}

export type ManualOpportunityStore = Record<string, ManualOpportunityRecord>;

export function parseManualOpportunityStore(raw: string): ManualOpportunityStore {
  if (!raw.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    const result = z.record(z.string(), ManualOpportunityRecordSchema).safeParse(parsed);
    return result.success ? (result.data as ManualOpportunityStore) : {};
  } catch {
    return {};
  }
}

const ManualOpportunityRequestSchema = z.object({
  url: z.string().trim().min(1).max(2048),
});

export interface ManualOpportunityRequestBody {
  url: string;
}

export function parseManualOpportunityRequestBody(value: unknown): ManualOpportunityRequestBody | null {
  const result = ManualOpportunityRequestSchema.safeParse(value);
  return result.success ? result.data : null;
}

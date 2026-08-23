import { jobAgentBoards } from "../../content/job-agent-boards.ts";
import { matchJobAgentKeywordFamily } from "../../content/job-agent-keywords.ts";
import { cleanLocationName } from "./location.ts";
import type { JobAgentLedgerEntry, JobAgentSource, LeverPosting, NormalizedJob } from "./types.ts";

const MAX_RESPONSE_BYTES = 2_000_000;
const REQUEST_TIMEOUT_MS = 15_000;
const TOKEN_PATTERN = /^[A-Za-z0-9._-]{1,160}$/;
const POSTING_ID_PATTERN = /^[A-Za-z0-9-]{1,160}$/;

export type ManualOpportunityErrorCode =
  | "invalid-url"
  | "unsupported-url"
  | "not-found"
  | "upstream"
  | "incomplete";

export class ManualOpportunityError extends Error {
  readonly code: ManualOpportunityErrorCode;

  constructor(code: ManualOpportunityErrorCode, message: string) {
    super(message);
    this.name = "ManualOpportunityError";
    this.code = code;
  }
}

export interface SupportedJobUrl {
  source: JobAgentSource;
  boardToken: string;
  postingId: string;
  originalUrl: string;
  pageUrl: string;
  apiUrl: string;
}

export interface ExtractedManualOpportunity {
  entry: JobAgentLedgerEntry;
  posting: NormalizedJob;
  originalUrl: string;
}

function requiredSegment(value: string | undefined, kind: "board" | "posting"): string {
  const pattern = kind === "board" ? TOKEN_PATTERN : POSTING_ID_PATTERN;
  if (!value || !pattern.test(value)) {
    throw new ManualOpportunityError("invalid-url", `The URL is missing a valid ATS ${kind} identifier.`);
  }
  return value;
}

/**
 * Converts a user URL into fixed, allowlisted ATS API targets. The submitted host is never used
 * as a general-purpose fetch destination: only these exact public job-board hosts are accepted,
 * and every API URL below points to a hard-coded Greenhouse, Lever, or Ashby origin.
 */
export function parseSupportedJobUrl(input: string): SupportedJobUrl {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new ManualOpportunityError("invalid-url", "Enter a complete HTTPS job-posting URL.");
  }

  if (url.protocol !== "https:" || url.username || url.password || url.port) {
    throw new ManualOpportunityError("invalid-url", "Job URLs must use HTTPS and cannot include credentials or a custom port.");
  }

  let segments: string[];
  try {
    segments = url.pathname.split("/").filter(Boolean).map((segment) => decodeURIComponent(segment));
  } catch {
    throw new ManualOpportunityError("invalid-url", "The job URL contains an invalid encoded path.");
  }
  const host = url.hostname.toLowerCase();

  if (host === "boards.greenhouse.io" || host === "job-boards.greenhouse.io") {
    const jobsIndex = segments.indexOf("jobs");
    const boardToken = requiredSegment(jobsIndex > 0 ? segments[jobsIndex - 1] : undefined, "board");
    const postingId = requiredSegment(jobsIndex >= 0 ? segments[jobsIndex + 1] : undefined, "posting");
    if (!/^\d+$/.test(postingId)) {
      throw new ManualOpportunityError("invalid-url", "Greenhouse posting IDs must be numeric.");
    }
    return {
      source: "greenhouse",
      boardToken,
      postingId,
      originalUrl: url.toString(),
      pageUrl: url.toString(),
      apiUrl: `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs/${encodeURIComponent(postingId)}`,
    };
  }

  if (host === "jobs.lever.co" || host === "jobs.eu.lever.co") {
    const boardToken = requiredSegment(segments[0], "board");
    const postingId = requiredSegment(segments[1], "posting");
    const apiHost = host === "jobs.eu.lever.co" ? "api.eu.lever.co" : "api.lever.co";
    return {
      source: "lever",
      boardToken,
      postingId,
      originalUrl: url.toString(),
      pageUrl: `https://${host}/${encodeURIComponent(boardToken)}/${encodeURIComponent(postingId)}`,
      apiUrl: `https://${apiHost}/v0/postings/${encodeURIComponent(boardToken)}/${encodeURIComponent(postingId)}`,
    };
  }

  if (host === "jobs.ashbyhq.com") {
    const boardToken = requiredSegment(segments[0], "board");
    const postingId = requiredSegment(segments[1], "posting");
    return {
      source: "ashby",
      boardToken,
      postingId,
      originalUrl: url.toString(),
      pageUrl: `https://${host}/${encodeURIComponent(boardToken)}/${encodeURIComponent(postingId)}`,
      apiUrl: `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(boardToken)}?includeCompensation=true`,
    };
  }

  throw new ManualOpportunityError(
    "unsupported-url",
    "Supported posting URLs are hosted by Greenhouse, Lever, or Ashby.",
  );
}

async function readTextLimited(response: Response): Promise<string> {
  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (contentLength > MAX_RESPONSE_BYTES) {
    throw new ManualOpportunityError("upstream", "The job posting response was too large to process safely.");
  }
  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let byteCount = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    byteCount += value.byteLength;
    if (byteCount > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new ManualOpportunityError("upstream", "The job posting response was too large to process safely.");
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

async function fetchText(url: string, fetchImpl: typeof fetch): Promise<string> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      redirect: "error",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: { Accept: "application/json, text/html;q=0.8" },
    });
  } catch (error) {
    throw new ManualOpportunityError("upstream", `Couldn't fetch the posting: ${(error as Error).message}`);
  }
  if (response.status === 404) {
    throw new ManualOpportunityError("not-found", "That job posting is no longer available from its ATS.");
  }
  if (!response.ok) {
    throw new ManualOpportunityError("upstream", `The ATS returned HTTP ${response.status}. Try again later.`);
  }
  try {
    return await readTextLimited(response);
  } catch (error) {
    if (error instanceof ManualOpportunityError) throw error;
    throw new ManualOpportunityError("upstream", `Couldn't read the posting: ${(error as Error).message}`);
  }
}

async function fetchJson(url: string, fetchImpl: typeof fetch): Promise<unknown> {
  const text = await fetchText(url, fetchImpl);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ManualOpportunityError("upstream", "The ATS returned an unexpected response instead of job data.");
  }
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function findJobPostingNode(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findJobPostingNode(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  const types = Array.isArray(record["@type"]) ? record["@type"] : [record["@type"]];
  if (types.includes("JobPosting")) return record;
  return findJobPostingNode(record["@graph"]);
}

function companyFromJobPage(html: string): string | undefined {
  const scripts = html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of scripts) {
    try {
      const node = findJobPostingNode(JSON.parse(match[1] ?? "") as unknown);
      const organization = node?.hiringOrganization;
      if (typeof organization === "object" && organization !== null) {
        const name = stringValue((organization as Record<string, unknown>).name);
        if (name) return name;
      }
    } catch {
      // Ignore one malformed JSON-LD block and continue to any others on the trusted ATS page.
    }
  }
  return undefined;
}

function configuredCompany(source: JobAgentSource, token: string): string | undefined {
  return jobAgentBoards.find(
    (board) => board.source === source && board.token.toLowerCase() === token.toLowerCase(),
  )?.label;
}

async function resolveCompany(target: SupportedJobUrl, fetchImpl: typeof fetch): Promise<string | undefined> {
  const configured = configuredCompany(target.source, target.boardToken);
  if (configured) return configured;
  return companyFromJobPage(await fetchText(target.pageUrl, fetchImpl));
}

function formatLeverCompensation(posting: LeverPosting): string | null {
  const range = posting.salaryRange;
  if (
    !range ||
    typeof range.min !== "number" ||
    typeof range.max !== "number" ||
    !Number.isFinite(range.min) ||
    !Number.isFinite(range.max)
  ) {
    return null;
  }
  const currency = range.currency ?? "USD";
  const amount = (value: number) => `${currency === "USD" ? "$" : `${currency} `}${Math.round(value / 1000)}K`;
  return `${amount(range.min)}-${amount(range.max)}`;
}

function isoTimestampFromEpoch(value: unknown): string | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function isoTimestampFromString(value: unknown): string | undefined {
  const timestamp = stringValue(value);
  if (!timestamp) return undefined;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function buildResult(
  target: SupportedJobUrl,
  now: string,
  company: string | undefined,
  posting: NormalizedJob,
): ExtractedManualOpportunity {
  const title = posting.title.trim();
  const content = posting.content?.trim();
  if (!title || !company?.trim() || !content) {
    throw new ManualOpportunityError(
      "incomplete",
      "The posting did not provide a title, company, and usable job description, so nothing was added.",
    );
  }

  const normalizedPosting: NormalizedJob = { ...posting, title, content };
  return {
    originalUrl: target.originalUrl,
    posting: normalizedPosting,
    entry: {
      id: posting.id,
      source: target.source,
      company: company.trim(),
      title,
      keywordFamily: matchJobAgentKeywordFamily(title) ?? "Other",
      absoluteUrl: posting.absolute_url,
      firstSeen: now,
      status: "pending",
      location: cleanLocationName(posting.location?.name),
      compensationRange: posting.structuredCompensationRange ?? null,
      postedAt: posting.postedAt,
    },
  };
}

async function extractGreenhouse(
  target: SupportedJobUrl,
  fetchImpl: typeof fetch,
  now: string,
): Promise<ExtractedManualOpportunity> {
  const data = await fetchJson(target.apiUrl, fetchImpl);
  if (typeof data !== "object" || data === null) {
    throw new ManualOpportunityError("upstream", "Greenhouse returned an unexpected job record.");
  }
  const job = data as Record<string, unknown>;
  return buildResult(
    target,
    now,
    stringValue(job.company_name) ?? configuredCompany(target.source, target.boardToken),
    {
      id: Number(target.postingId),
      title: stringValue(job.title) ?? "",
      // Keep later application scanning on the allowlisted ATS host instead of trusting a
      // response-provided redirect/custom URL as a new server-side fetch target.
      absolute_url: target.pageUrl,
      content: stringValue(job.content),
      location:
        typeof job.location === "object" &&
        job.location !== null &&
        stringValue((job.location as Record<string, unknown>).name)
          ? { name: stringValue((job.location as Record<string, unknown>).name)! }
          : undefined,
      postedAt: isoTimestampFromString(job.first_published),
      structuredCompensationRange: null,
    },
  );
}

async function extractLever(
  target: SupportedJobUrl,
  fetchImpl: typeof fetch,
  now: string,
): Promise<ExtractedManualOpportunity> {
  const data = await fetchJson(target.apiUrl, fetchImpl);
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new ManualOpportunityError("upstream", "Lever returned an unexpected job record.");
  }
  const posting = data as LeverPosting;
  const company = await resolveCompany(target, fetchImpl);
  return buildResult(target, now, company, {
    id: target.postingId,
    title: stringValue(posting.text) ?? "",
    absolute_url: target.pageUrl,
    content: stringValue(posting.description) ?? stringValue(posting.descriptionPlain),
    location: stringValue(posting.categories?.location) ? { name: posting.categories!.location! } : undefined,
    postedAt: isoTimestampFromEpoch(posting.createdAt),
    structuredCompensationRange: formatLeverCompensation(posting),
  });
}

async function extractAshby(
  target: SupportedJobUrl,
  fetchImpl: typeof fetch,
  now: string,
): Promise<ExtractedManualOpportunity> {
  const data = await fetchJson(target.apiUrl, fetchImpl);
  const jobs =
    typeof data === "object" && data !== null && Array.isArray((data as { jobs?: unknown }).jobs)
      ? ((data as { jobs: unknown[] }).jobs)
      : null;
  if (!jobs) throw new ManualOpportunityError("upstream", "Ashby returned an unexpected job board response.");
  const job = jobs.find((candidate) => {
    if (typeof candidate !== "object" || candidate === null) return false;
    const record = candidate as Record<string, unknown>;
    if (String(record.id ?? "") === target.postingId) return true;
    return [record.jobUrl, record.applyUrl].some((candidateUrl) => {
      if (typeof candidateUrl !== "string") return false;
      try {
        return new URL(candidateUrl).pathname.split("/").filter(Boolean)[1] === target.postingId;
      } catch {
        return false;
      }
    });
  });
  if (typeof job !== "object" || job === null) {
    throw new ManualOpportunityError("not-found", "That job posting is no longer available from Ashby.");
  }
  const record = job as Record<string, unknown>;
  const compensation =
    typeof record.compensation === "object" && record.compensation !== null
      ? (record.compensation as Record<string, unknown>)
      : undefined;
  const company = await resolveCompany(target, fetchImpl);
  return buildResult(target, now, company, {
    id: target.postingId,
    title: stringValue(record.title) ?? "",
    absolute_url: target.pageUrl,
    content: stringValue(record.descriptionHtml) ?? stringValue(record.descriptionPlain),
    location: stringValue(record.location) ? { name: stringValue(record.location)! } : undefined,
    postedAt: isoTimestampFromString(record.publishedAt),
    structuredCompensationRange: stringValue(compensation?.scrapeableCompensationSalarySummary) ?? null,
  });
}

export async function extractManualOpportunity(
  target: SupportedJobUrl,
  options: { fetchImpl?: typeof fetch; now?: string } = {},
): Promise<ExtractedManualOpportunity> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? new Date().toISOString();
  switch (target.source) {
    case "greenhouse":
      return extractGreenhouse(target, fetchImpl, now);
    case "lever":
      return extractLever(target, fetchImpl, now);
    case "ashby":
      return extractAshby(target, fetchImpl, now);
  }
}

import type { JobScoutSource } from "../scripts/job-scout/types.ts";

export interface JobScoutBoard {
  /**
   * The board's job-board token/slug, e.g. the `smartsheet` in
   * boards-api.greenhouse.io/v1/boards/smartsheet/jobs, or a Lever/Ashby job-board token.
   */
  token: string;
  /** Display label used in the ledger and on the hidden /job-scout page. */
  label: string;
  /** Which ATS API to fetch this board from - see scripts/job-scout/{greenhouse,lever,ashby}.ts. */
  source: JobScoutSource;
}

/**
 * Companies the daily job-scout scan tracks, across Greenhouse, Lever, and Ashby.
 * Add a company by adding one entry here - nothing else needs to change.
 */
export const jobScoutBoards: JobScoutBoard[] = [
  { token: "smartsheet", label: "Smartsheet", source: "greenhouse" },
  { token: "vaxcyte", label: "Vaxcyte", source: "greenhouse" },
  { token: "healthverity", label: "HealthVerity", source: "greenhouse" },
  { token: "figma", label: "Figma", source: "greenhouse" },
  { token: "zscaler", label: "Zscaler", source: "greenhouse" },
  { token: "celonis", label: "Celonis", source: "greenhouse" },
  { token: "algolia", label: "Algolia", source: "greenhouse" },
  { token: "databricks", label: "Databricks", source: "greenhouse" },
  { token: "gitlab", label: "GitLab", source: "greenhouse" },
  { token: "cloudflare", label: "Cloudflare", source: "greenhouse" },
  { token: "ethena", label: "Ethena", source: "lever" },
  { token: "veeva", label: "Veeva", source: "lever" },
  { token: "windfalldata", label: "Windfall", source: "lever" },
  { token: "aizon", label: "Aizon", source: "lever" },
  { token: "aeratechnology", label: "Aera Technology", source: "lever" },
  { token: "alphalifesci", label: "AlphaLifeSci", source: "ashby" },
  { token: "notion", label: "Notion", source: "ashby" },
  { token: "levelpath", label: "LevelPath", source: "ashby" },
  { token: "candidhealth", label: "Candid Health", source: "ashby" },
  { token: "openai", label: "OpenAI", source: "ashby" },
];

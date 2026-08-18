export interface JobScoutBoard {
  /** Greenhouse job board token, e.g. the `smartsheet` in boards-api.greenhouse.io/v1/boards/smartsheet/jobs */
  token: string;
  /** Display label used in the ledger and on the hidden /job-scout page. */
  label: string;
}

/**
 * Companies the daily job-scout scan tracks. Greenhouse only for this pass.
 * Add a company by adding one entry here - nothing else needs to change.
 */
export const jobScoutBoards: JobScoutBoard[] = [{ token: "smartsheet", label: "Smartsheet" }];

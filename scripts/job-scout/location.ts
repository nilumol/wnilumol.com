/**
 * Cleans formatting artifacts some companies' Greenhouse data entry produces in the raw
 * `location.name` field (e.g. Smartsheet's raw value literally reads "-REMOTE, USA-") -
 * strips stray leading/trailing dashes and whitespace before the value is ever displayed.
 */
export function cleanLocationName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw
    .trim()
    .replace(/^[\s-]+/, "")
    .replace(/[\s-]+$/, "");
  return cleaned.length > 0 ? cleaned : null;
}

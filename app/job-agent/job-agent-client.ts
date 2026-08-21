export const TAILOR_PASSPHRASE_STORAGE_KEY = "job-agent-tailor-passphrase";
const TAILOR_PASSPHRASE_EVENT = "job-agent-tailor-passphrase-change";

export function readStoredTailorPassphrase(): string | null {
  return sessionStorage.getItem(TAILOR_PASSPHRASE_STORAGE_KEY);
}

export function storeTailorPassphrase(passphrase: string): void {
  sessionStorage.setItem(TAILOR_PASSPHRASE_STORAGE_KEY, passphrase);
  window.dispatchEvent(new Event(TAILOR_PASSPHRASE_EVENT));
}

export function clearTailorPassphrase(): void {
  sessionStorage.removeItem(TAILOR_PASSPHRASE_STORAGE_KEY);
  window.dispatchEvent(new Event(TAILOR_PASSPHRASE_EVENT));
}

export function onTailorPassphraseChange(listener: () => void): () => void {
  window.addEventListener(TAILOR_PASSPHRASE_EVENT, listener);
  return () => window.removeEventListener(TAILOR_PASSPHRASE_EVENT, listener);
}

export async function readJobAgentError(response: Response, fallback: string): Promise<string> {
  const data: { error?: string } | null = await response.json().catch(() => null);
  return data?.error ?? fallback;
}

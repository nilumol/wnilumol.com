export const TAILOR_PASSPHRASE_HEADER = "x-tailor-passphrase";

/**
 * The only auth in front of Tailor My Profile's paid routes: one shared secret in
 * `TAILOR_PASSPHRASE`, sent as a header and checked here before any paid work (Claude call or
 * PDF render) runs. Not a real user-account system - just a gate so this unauthenticated,
 * unlisted page can't be used to run up API costs if the URL ever leaks. No cookies, no
 * server-side session state.
 */
export function verifyTailorPassphrase(request: Request): boolean {
  const expected = process.env.TAILOR_PASSPHRASE;
  if (!expected) return false;
  const provided = request.headers.get(TAILOR_PASSPHRASE_HEADER);
  return provided === expected;
}

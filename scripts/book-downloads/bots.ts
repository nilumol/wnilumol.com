/**
 * Requests that should not count as a reader downloading the book: crawlers, link-preview fetchers
 * (chat apps and social sites unfurling a shared link), scripted HTTP clients, headless browsers, and
 * browser prefetches. Deliberately simple user-agent matching - it filters the obvious, not the determined.
 */
const BOT_USER_AGENT =
  /bot\b|bot\/|crawl|spider|slurp|preview|facebookexternalhit|facebookcatalog|meta-externalagent|embedly|quora link|pinterest|vkshare|w3c_validator|whatsapp\/|telegrambot|skypeuripreview|bitlybot|headlesschrome|lighthouse|curl\/|wget\/|python-requests|python-urllib|aiohttp|httpx|go-http-client|okhttp|java\/|node-fetch|axios\/|undici|libwww|scrapy|feedfetcher|validator/i;

export function isLikelyBot(userAgent: string | null | undefined): boolean {
  if (!userAgent || !userAgent.trim()) return true;
  return BOT_USER_AGENT.test(userAgent);
}

/** Speculative loads (prefetch/prerender) are not a reader asking for the file. */
export function isPrefetch(headers: Headers): boolean {
  const purpose = `${headers.get("sec-purpose") ?? ""} ${headers.get("purpose") ?? ""}`.toLowerCase();
  return purpose.includes("prefetch") || purpose.includes("prerender") || headers.has("next-router-prefetch");
}

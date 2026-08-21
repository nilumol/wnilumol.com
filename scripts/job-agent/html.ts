const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  mdash: "—",
  ndash: "–",
  hellip: "…",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      return String.fromCodePoint(parseInt(entity.slice(2), 16));
    }
    if (entity.startsWith("#")) {
      return String.fromCodePoint(parseInt(entity.slice(1), 10));
    }
    return NAMED_ENTITIES[entity] ?? match;
  });
}

/**
 * Strips and normalizes a Greenhouse job's HTML `content` field into plain text for prompts
 * and for the ledger. Deliberately simple regex-based stripping - no DOM/HTML-parsing
 * dependency - since job-agent only needs readable plain text, not structure.
 *
 * Some postings come back from Greenhouse with their whole `content` field HTML-entity-escaped
 * an extra time (e.g. `&lt;div class=&quot;...&quot;&gt;` instead of `<div class="...">`), which
 * hides real tags from the stripping regexes below. Decoding entities up front first unwraps
 * that extra escaping layer into ordinary HTML/text (harmless no-op on normally-encoded input,
 * since it only turns entities into their literal characters); decodeEntities runs a second time
 * after stripping to resolve entities that were genuinely part of the text (e.g. `&mdash;`).
 */
export function htmlToPlainText(html: string): string {
  const withBreaks = decodeEntities(html)
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\s*\/?>/gi, "\n")
    .replace(/<(p|div|li|h[1-6])[^>]*>/gi, "\n");
  const withoutTags = withBreaks.replace(/<[^>]+>/g, "");
  const decoded = decodeEntities(withoutTags);
  return decoded
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line, index, lines) => line.length > 0 || (index > 0 && lines[index - 1] !== ""))
    .join("\n")
    .trim();
}

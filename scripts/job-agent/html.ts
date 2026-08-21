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

const ESCAPED_STRUCTURAL_TAG = /&lt;\/?(?:div|p|li|h[1-6]|br|span|a|ul|ol|strong|em|b|i)\b/i;

/**
 * True when the whole field looks like it was HTML-entity-escaped an extra time (e.g.
 * `&lt;div class=&quot;...&quot;&gt;` instead of `<div class="...">`, for the entire document),
 * rather than a normal posting that merely mentions escaped tag-like text as prose (e.g.
 * "...supports &lt;input&gt; validation..."). Requires both: no real (unescaped) tag anywhere in
 * the raw field, and at least one escaped *structural* tag - real Greenhouse HTML always contains
 * genuine tags somewhere, so a field with none is only plausible when the whole thing was escaped.
 */
function looksWhollyEntityEscaped(html: string): boolean {
  return !/<[a-zA-Z!/]/.test(html) && ESCAPED_STRUCTURAL_TAG.test(html);
}

/**
 * Strips and normalizes a Greenhouse job's HTML `content` field into plain text for prompts
 * and for the ledger. Deliberately simple regex-based stripping - no DOM/HTML-parsing
 * dependency - since job-agent only needs readable plain text, not structure.
 *
 * Some postings come back from Greenhouse with their whole `content` field HTML-entity-escaped
 * an extra time, which hides real tags from the stripping regexes below. When that whole-field
 * pattern is detected, decoding entities up front unwraps that extra escaping layer into ordinary
 * HTML/text. This is scoped to that whole-document case (see looksWhollyEntityEscaped) rather than
 * applied unconditionally, so a posting that legitimately contains single-escaped tag-like prose
 * text alongside real tags is left alone and that text still survives stripping as literal text.
 * decodeEntities runs again after stripping either way, to resolve entities genuinely part of the
 * text (e.g. `&mdash;`).
 */
export function htmlToPlainText(html: string): string {
  const unwrapped = looksWhollyEntityEscaped(html) ? decodeEntities(html) : html;
  const withBreaks = unwrapped
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

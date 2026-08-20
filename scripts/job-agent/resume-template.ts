import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resumeContact } from "../../content/resume-contact.ts";
import type { TailoredBullet, TailoredResume } from "./resume-tailor.ts";

/**
 * Sampled directly from the rendered role-title text in career/Winston Nilumol Resume_August_2026.pdf
 * (pixel color rgb(19, 79, 92) at 300 DPI) - do not eyeball a replacement. Only the role title line
 * (.role-head) carries this accent in the source; the company/context line underneath renders in
 * plain black, so .role-context is intentionally left uncolored here.
 */
const ROLE_ACCENT_COLOR = "#134f5c";

/** Matches the suggestion-type pill colors already used in JobAgentTailor.tsx, so Review's marks read consistently with the checklist the captain reviewed before generating them. */
const HIGHLIGHT_ADDED_COLOR = "#8a692f";
const HIGHLIGHT_REORDERED_COLOR = "#2c5670";

const FONT_DIR = join(process.cwd(), "assets/fonts/open-sans");

let cachedFontFaceCss: string | null = null;

function loadFontBase64(filename: string): string {
  return readFileSync(join(FONT_DIR, filename)).toString("base64");
}

/**
 * Reads and base64-embeds the bundled Open Sans files once per server process. The original
 * resume (career/Winston Nilumol Resume_August_2026.pdf) is set in Verdana, which is neither
 * open-licensed nor installed on Vercel's Linux serverless environment - without an embedded
 * substitute, headless Chromium would silently fall back to a generic sans-serif. Open Sans is
 * a standard, freely-licensed (OFL) visual equivalent to Verdana: same screen-first design
 * goals, similar x-height and letterforms. Embedding as a data URI (rather than a Google Fonts
 * `<link>`) means both the PDF route (serverless, must not depend on outbound network during a
 * cold start) and the Review route render from the exact same bytes - see assets/fonts/open-sans/.
 */
function getFontFaceCss(): string {
  if (cachedFontFaceCss) return cachedFontFaceCss;
  const regular = loadFontBase64("OpenSans-Regular.ttf");
  const bold = loadFontBase64("OpenSans-Bold.ttf");
  const italic = loadFontBase64("OpenSans-Italic.ttf");
  cachedFontFaceCss = [
    `@font-face { font-family: "Resume Sans"; font-weight: 400; font-style: normal; src: url(data:font/ttf;base64,${regular}) format("truetype"); }`,
    `@font-face { font-family: "Resume Sans"; font-weight: 700; font-style: normal; src: url(data:font/ttf;base64,${bold}) format("truetype"); }`,
    `@font-face { font-family: "Resume Sans"; font-weight: 400; font-style: italic; src: url(data:font/ttf;base64,${italic}) format("truetype"); }`,
  ].join("\n");
  return cachedFontFaceCss;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** class="" is omitted entirely (not emitted as class="") so Generate PDF's markup carries zero highlight residue. */
function highlightClass(kind: "added" | "reordered" | null): string {
  return kind ? ` class="hl-${kind}"` : "";
}

/**
 * `reorderedKind` marks every non-added bullet as "reordered" when the role's own bullets were
 * permuted by an accepted reorder suggestion - added (new-phrasing) bullets always take
 * precedence over that, since they were appended fresh rather than moved.
 */
function renderBullets(bullets: TailoredBullet[], highlightChanges: boolean, reorderedKind: "reordered" | null): string {
  const items = bullets
    .map(({ text, added }) => {
      const kind = highlightChanges ? (added ? "added" : reorderedKind) : null;
      return `<li${highlightClass(kind)}>${escapeHtml(text)}</li>`;
    })
    .join("");
  return `<ul>${items}</ul>`;
}

/** Highlights are authored as "Label: rest of sentence" - bolds the label to match the PDF. */
function renderHighlight(highlight: string, kind: "reordered" | null): string {
  const separatorIndex = highlight.indexOf(": ");
  if (separatorIndex === -1) return `<li${highlightClass(kind)}>${escapeHtml(highlight)}</li>`;
  const label = highlight.slice(0, separatorIndex + 1);
  const rest = highlight.slice(separatorIndex + 1);
  return `<li${highlightClass(kind)}><strong>${escapeHtml(label)}</strong>${escapeHtml(rest)}</li>`;
}

/**
 * Renders one tailored resume as a self-contained HTML document - no external stylesheet or
 * font requests. Used identically by the Review route (opened as-is in a browser tab) and the
 * PDF route (fed to Puppeteer's page.setContent()), so Review and Generate PDF can never drift
 * in content - `highlightChanges` is the only presentational difference between the two: Review
 * passes `true` to mark newly-added grounded phrasing and reordered sections, Generate PDF
 * passes `false` so the download carries no highlight markup at all.
 *
 * Sizing (font sizes, line-height, margins) is tightened to measurements taken directly off
 * career/Winston Nilumol Resume_August_2026.pdf (name 25pt, section headers 13pt, body/bullets
 * 11pt at ~1.22 line-height, role titles 12pt, 0.5in page margins) rather than eyeballed.
 */
export function renderResumeHtml(resume: TailoredResume, meta: { company: string }, highlightChanges: boolean): string {
  const roleSections = resume.roles
    .map((role) => {
      const roleReorderedKind = highlightChanges && role.bulletsReordered ? "reordered" : null;
      return `
        <div class="role-head"><span>${escapeHtml(role.title)}</span><span>${escapeHtml(role.dates)}</span></div>
        <div class="role-context"><strong>${escapeHtml(role.company)}</strong> (${escapeHtml(role.companyContext)})</div>
        ${renderBullets(role.bullets, highlightChanges, roleReorderedKind)}
      `;
    })
    .join("");

  const highlightsReorderedKind = highlightChanges && resume.highlightsReordered ? "reordered" : null;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Winston Nilumol — Resume (tailored for ${escapeHtml(meta.company)})</title>
<style>
${getFontFaceCss()}
* { box-sizing: border-box; }
body { font-family: "Resume Sans", Arial, sans-serif; max-width: 780px; margin: 40px auto; padding: 0 28px 60px; color: #191919; line-height: 1.22; font-size: 14.5px; }
h1 { font-size: 2.06rem; font-weight: 700; margin: 0 0 4px; }
.contact { font-size: 0.92rem; margin-bottom: 10px; }
.contact a { color: inherit; }
h2 { font-size: 1.08rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em; border-bottom: 1px solid #191919; padding-bottom: 4px; margin: 20px 0 12px; }
.role-head { display: flex; justify-content: space-between; gap: 16px; font-size: 16px; font-weight: 700; color: ${ROLE_ACCENT_COLOR}; margin-top: 16px; }
.role-context { margin-top: 1px; }
ul { margin: 2px 0 0; padding-left: 22px; }
li { margin-bottom: 4px; }
.own-text { white-space: pre-wrap; }
.endorsement-name { font-weight: 700; margin-bottom: 6px; }
.endorsement-quote { font-style: italic; }
.endorsement-quote p { margin: 0 0 10px; }
.hl-added { background: ${HIGHLIGHT_ADDED_COLOR}22; box-shadow: -8px 0 0 -1px ${HIGHLIGHT_ADDED_COLOR}, inset 3px 0 0 ${HIGHLIGHT_ADDED_COLOR}; padding-left: 3px; }
.hl-reordered { background: ${HIGHLIGHT_REORDERED_COLOR}1a; box-shadow: -8px 0 0 -1px ${HIGHLIGHT_REORDERED_COLOR}, inset 3px 0 0 ${HIGHLIGHT_REORDERED_COLOR}; padding-left: 3px; }
</style>
</head>
<body>
  <h1>${escapeHtml(resumeContact.name)}</h1>
  <div class="contact">
    ${escapeHtml(resumeContact.location)} | ${escapeHtml(resumeContact.phone)} | ${escapeHtml(resumeContact.email)} |
    <a href="${escapeHtml(resumeContact.linkedinUrl)}">LinkedIn</a>
  </div>

  <h2>Career Highlights</h2>
  <p>${escapeHtml(resume.headline)}</p>
  <ul>${resume.highlights.map((highlight) => renderHighlight(highlight, highlightsReorderedKind)).join("")}</ul>

  <h2>Experience</h2>
  ${roleSections}

  <h2>Areas of Expertise</h2>
  <ul>
    <li><strong>Technologies/Tools: </strong>${escapeHtml(resume.areasOfExpertise.technologiesAndTools.join(", "))}</li>
    <li><strong>Sales Methodologies: </strong>${escapeHtml(resume.areasOfExpertise.salesMethodologies.join(", "))}</li>
    <li><strong>Key Skills: </strong>${escapeHtml(resume.areasOfExpertise.keySkills.join(", "))}</li>
  </ul>

  <h2>Education</h2>
  <p>${resume.education.map(escapeHtml).join("<br>")}</p>

  <h2>Executive Endorsement</h2>
  <div class="endorsement-quote"><p>${escapeHtml(resume.executiveEndorsement)}</p></div>

  ${
    resume.ownText
      ? `<h2>Additional Notes</h2><p class="own-text">${escapeHtml(resume.ownText)}</p>`
      : ""
  }
</body>
</html>
`;
}

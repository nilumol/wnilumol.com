import chromium from "@sparticuz/chromium";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import puppeteer from "puppeteer-core";
import { JOB_AGENT_MODEL } from "./scoring.ts";
import { ApplicationScanClassificationSchema, type ApplicationScanResult } from "./application-scan-types.ts";

const MAX_SCRAPED_CONTENT_LENGTH = 20000;

/**
 * Loads the real application page with headless Chromium and pulls a generic, ATS-agnostic
 * snapshot of its content: every form field's associated label (walked across the main page and
 * any embedded frames, since some ATS platforms mount the application form in an iframe) plus
 * the full visible page text as a fallback. No per-site selectors or ATS-specific parsing - the
 * same extraction runs unchanged for Greenhouse, Lever, Ashby, or any other portal; turning this
 * snapshot into "does it take a cover letter" / "what does it ask" happens downstream in
 * classifyApplicationPage, via the model.
 */
export async function scrapeApplicationPage(url: string): Promise<string> {
  chromium.setGraphicsMode = false;

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
  try {
    browser = await puppeteer.launch({
      args: await puppeteer.defaultArgs({ args: chromium.args, headless: "shell" }),
      executablePath: await chromium.executablePath(),
      headless: "shell",
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    const frameSnapshots = await Promise.all(
      page.frames().map((frame) =>
        frame
          .evaluate(() => {
            function describeField(el: Element): string {
              const tag = el.tagName.toLowerCase();
              const typed = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
              const labelledBy = el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null;
              const label =
                el.getAttribute("aria-label") ||
                labelledBy?.textContent ||
                el.closest("label")?.textContent ||
                typed.getAttribute("placeholder") ||
                "";
              const type = tag === "input" ? typed.getAttribute("type") || "text" : tag;
              return `[field type="${type}"] ${label.trim()}`.trim();
            }

            const fields = Array.from(document.querySelectorAll("input, textarea, select"))
              .map(describeField)
              .filter((line) => /] .+/.test(line));

            const bodyText = document.body?.innerText ?? "";
            return ["## Form fields", ...fields, "## Visible page text", bodyText].join("\n");
          })
          .catch(() => ""),
      ),
    );

    return frameSnapshots.filter(Boolean).join("\n\n---\n\n").slice(0, MAX_SCRAPED_CONTENT_LENGTH);
  } finally {
    await browser?.close();
  }
}

/**
 * Sends the scraped page snapshot to Claude to classify what the real application asks for -
 * cover letter acceptance and every free-text/paragraph question - constrained to
 * ApplicationScanClassificationSchema via structured outputs, the same
 * `client.messages.parse()` pattern scoring.ts and tailor-suggestions.ts already use, on the
 * same cost-conscious `claude-sonnet-5` model. Classification only; drafting answers is a
 * separate call (see the voice-profile decision in docs/job-agent.md).
 */
export async function classifyApplicationPage(
  client: Anthropic,
  job: { company: string; title: string },
  pageContent: string,
): Promise<ApplicationScanResult> {
  const prompt = [
    "You are looking at a scraped snapshot of a real job application page/form for the posting " +
      "below (its form field labels, then its full visible text). Identify:",
    "1. Whether the application accepts a cover letter - a dedicated cover letter field or file " +
      "upload, required or optional.",
    "2. Every free-text/paragraph question it asks the applicant to write an answer to - not " +
      "simple yes/no toggles, basic contact fields (name, email, phone, links), resume/file " +
      "uploads, or multiple-choice/dropdown selections. Use the exact or lightly cleaned-up " +
      "wording of each question as it appears on the page.",
    "If the snapshot doesn't look like an application form at all (e.g. only a job description " +
      "with no visible form), return acceptsCoverLetter: false and an empty questions list.",
    "---",
    `Company: ${job.company}`,
    `Title: ${job.title}`,
    "---",
    "## Scraped application page snapshot",
    pageContent || "(no content could be scraped from this page)",
  ].join("\n\n");

  const response = await client.messages.parse({
    model: JOB_AGENT_MODEL,
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
    output_config: { format: zodOutputFormat(ApplicationScanClassificationSchema) },
  });

  if (!response.parsed_output) {
    throw new Error(`application-scan: response for "${job.title}" did not parse against the scan schema.`);
  }

  return {
    acceptsCoverLetter: response.parsed_output.acceptsCoverLetter,
    questions: response.parsed_output.questions.map((question, index) => ({ ...question, id: `q-${index}` })),
  };
}

import chromium from "@sparticuz/chromium";
import { NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import { jobAgentKeywordFamilyAbbreviations } from "@/content/job-agent-keywords";
import { resumeData } from "@/content/resume-data";
import { mergeTailoredResume } from "@/scripts/job-agent/resume-tailor";
import { renderResumeHtml } from "@/scripts/job-agent/resume-template";
import { verifyTailorPassphrase } from "@/scripts/job-agent/tailor-auth";
import { parseTailorRenderRequestBody } from "@/scripts/job-agent/tailor-types";

export const runtime = "nodejs";
export const maxDuration = 60;

function pdfFilename(keywordFamily: string): string {
  const abbr = jobAgentKeywordFamilyAbbreviations[keywordFamily] ?? "GEN";
  return `Winston Nilumol_Resume_${abbr}.pdf`;
}

/**
 * Prints the exact same template the preview route renders through headless Chromium and
 * returns it as a direct download - generated fresh per click, never stored server-side. See
 * docs/job-agent.md for why puppeteer-core + @sparticuz/chromium (HTML/CSS printed by a real
 * browser, run as a Vercel serverless function) was chosen over a programmatic PDF-drawing
 * library.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!verifyTailorPassphrase(request)) {
    return NextResponse.json({ error: "Invalid or missing passphrase." }, { status: 401 });
  }

  const body = parseTailorRenderRequestBody(await request.json().catch(() => null));
  if (!body) {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  const tailored = mergeTailoredResume(resumeData, body.acceptedSuggestions, body.ownText);
  const html = renderResumeHtml(tailored, { company: body.company });

  // No WebGL/graphics needed to print static text - disabling the graphics stack trims cold start.
  chromium.setGraphicsMode = false;

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
  try {
    browser = await puppeteer.launch({
      args: await puppeteer.defaultArgs({ args: chromium.args, headless: "shell" }),
      executablePath: await chromium.executablePath(),
      headless: "shell",
    });

    const page = await browser.newPage();
    // "load" is sufficient (and all setContent supports) since the template is fully
    // self-contained - no external stylesheet, font, or image requests to wait on.
    await page.setContent(html, { waitUntil: "load" });
    const pdfBytes = await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: { top: "0.4in", bottom: "0.4in", left: "0.4in", right: "0.4in" },
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdfFilename(body.keywordFamily)}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: `PDF generation failed: ${(error as Error).message}` },
      { status: 502 },
    );
  } finally {
    await browser?.close();
  }
}

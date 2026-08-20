import { NextResponse } from "next/server";
import { resumeData } from "@/content/resume-data";
import { mergeTailoredResume } from "@/scripts/job-agent/resume-tailor";
import { renderResumeHtml } from "@/scripts/job-agent/resume-template";
import { verifyTailorPassphrase } from "@/scripts/job-agent/tailor-auth";
import { parseTailorRenderRequestBody } from "@/scripts/job-agent/tailor-types";

export const runtime = "nodejs";

/**
 * Renders the tailored resume as a real HTML page - the exact same template renderResumeHtml()
 * feeds to Puppeteer in the PDF route - so View is a true preview, not a representation that
 * could drift from the download. The client fetches this (to send the passphrase as a header,
 * which a plain navigation can't do) and opens the returned HTML as a blob: URL in a new tab.
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

  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

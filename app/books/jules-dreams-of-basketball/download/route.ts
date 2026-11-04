import { after, type NextRequest } from "next/server";
import { julesBook } from "@/content/books/jules-dreams-of-basketball";
import { isLikelyBot, isPrefetch } from "@/scripts/book-downloads/bots";
import { recordBookDownload } from "@/scripts/book-downloads/store";

/** Every request must reach the handler (to be counted), so this route is never statically cached. */
export const dynamic = "force-dynamic";

/**
 * Counts one download started, then redirects to the static PDF in public/, so the file itself stays a
 * plain static asset. The count is written after the response (`after`), so a slow or failing Blob
 * write can never delay or block the download; bots, link previews and prefetches are not counted.
 * This counts downloads started: the site cannot see whether the reader then saved or opened the file.
 * The count is private: nothing on the site displays it or returns it.
 */
export function GET(request: NextRequest) {
  // Next answers HEAD with this same handler; a HEAD probe is not a download.
  const counted = request.method === "GET" && !isLikelyBot(request.headers.get("user-agent")) && !isPrefetch(request.headers);
  if (counted) {
    after(async () => {
      try {
        const result = await recordBookDownload(julesBook.slug);
        if (result === "skipped-no-token") console.warn("[book-downloads] BOOK_DOWNLOADS_READ_WRITE_TOKEN not set; download not counted.");
      } catch (error) {
        console.error("[book-downloads] Failed to record download:", error);
      }
    });
  }
  // Relative Location (resolved by the browser against this URL), so it never depends on proxy host headers.
  // no-store: a cached redirect would hand later readers the file without passing through the count.
  // The response never carries any count: totals are readable only privately via `npm run book:downloads`.
  return new Response(null, { status: 307, headers: { location: julesBook.pdf.href, "cache-control": "no-store" } });
}

/**
 * Prints recorded free-PDF download requests for a book: the total, then one line per UTC day.
 * Usage: BOOK_DOWNLOADS_READ_WRITE_TOKEN=... npm run book:downloads [-- <book-slug>]
 * (`vercel env pull` writes the token into .env.local; pass it through the environment.)
 * Counts eligible requests - the site cannot see whether a reader saved or opened the file.
 */
import { bookDownloadsToken, listBookDownloads, summarizeDownloads } from "./store.ts";

const slug = process.argv[2] ?? "jules-dreams-of-basketball";

if (!bookDownloadsToken()) {
  console.error("BOOK_DOWNLOADS_READ_WRITE_TOKEN is not set. Set it to the book-downloads Blob store's read-write token.");
  process.exit(1);
}

const { total, perDay } = summarizeDownloads(await listBookDownloads(slug));
console.log(`${slug}: ${total} download${total === 1 ? "" : "s"} started`);
for (const [day, count] of perDay) console.log(`  ${day}  ${count}`);

import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { julesBook, julesPages } from "@/content/books/jules-dreams-of-basketball";
import { FlipBook } from "./FlipBook";

// DM Sans across this page, like the homepage; the WN logo keeps its own SVG lettering.
const dmSans = DM_Sans({ subsets: ["latin"], style: ["normal", "italic"], axes: ["opsz"], variable: "--font-dm-sans" });

export const metadata: Metadata = {
  title: julesBook.title,
  description: "Read Jules Dreams of Basketball, a picture book by Winston Nilumol, as a flip book, or download the free PDF.",
  // Unlisted for now: not in navigation or /projects, and not indexed until the owner decides otherwise.
  robots: { index: false, follow: false },
};

export default function JulesDreamsOfBasketballPage() {
  return (
    <main className={`book-shell ${dmSans.variable}`}>
      <SiteHeader />
      <article className="book-page">
        <header className="book-intro">
          <h1>{julesBook.title}</h1>
        </header>

        <FlipBook pages={julesPages} imageBase={julesBook.imageBase} />

        <p className="book-download">
          <a className="book-btn" href={julesBook.pdf.href} download>
            Download the free PDF <span className="book-download-size">({julesBook.pdf.sizeLabel})</span>
          </a>
        </p>
      </article>
    </main>
  );
}

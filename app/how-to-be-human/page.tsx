import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { SiteHeader } from "@/components/site-header";

// DM Sans on a white page, like the picture-book page; the WN logo keeps its own SVG lettering.
const dmSans = DM_Sans({ subsets: ["latin"], style: ["normal", "italic"], axes: ["opsz"], variable: "--font-dm-sans" });

export const metadata: Metadata = {
  title: "How to Be Human",
  description: "A vlog that captures every aspect of my life.",
};

export default function HowToBeHumanPage() {
  return (
    <main className={`hth-shell ${dmSans.variable}`}>
      <SiteHeader />
      <article className="hth-page">
        <header>
          <h1>How to Be Human</h1>
          <p className="hth-lede">A vlog that captures every aspect of my life</p>
        </header>

        <section aria-labelledby="hth-catalog">
          <h2 id="hth-catalog">Catalog</h2>
        </section>
      </article>
    </main>
  );
}

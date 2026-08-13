import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <main className="page-shell">
      <SiteHeader active="about" />
      <article className="reading-page about-page">
        <p className="eyebrow">About</p>
        <h1>Led by curiosity.</h1>
        <p className="about-statement">
          I am an explorer at heart, drawn to unfamiliar paths, meaningful risks, and the pursuit of a life fully lived.
        </p>
      </article>
    </main>
  );
}

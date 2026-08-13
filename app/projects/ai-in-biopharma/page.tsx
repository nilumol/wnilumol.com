import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "AI in Biopharma" };

export default function AiInBiopharmaPage() {
  return (
    <main className="page-shell">
      <SiteHeader active="projects" />
      <article className="reading-page">
        <p className="eyebrow">Project · Exploration</p>
        <h1>AI in Biopharma</h1>
        <p className="lede">
          A working exploration of where AI can create measurable business value across biopharma organizations.
        </p>
      </article>
    </main>
  );
}

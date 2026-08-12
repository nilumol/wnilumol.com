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
        <section>
          <h2>Problem</h2>
          <p>Add the industry problem, workflow, or business constraint this project is examining.</p>
        </section>
        <section>
          <h2>Opportunity</h2>
          <p>Add the business opportunity, relevant users, and why the problem is worth solving.</p>
        </section>
        <section>
          <h2>System direction</h2>
          <p>This section can later grow into architecture, diagrams, tradeoffs, implementation notes, and a working prototype.</p>
        </section>
      </article>
    </main>
  );
}

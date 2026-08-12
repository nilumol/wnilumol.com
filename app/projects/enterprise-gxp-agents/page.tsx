import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Enterprise GxP Agents",
  robots: { index: false, follow: false },
};

export default function EnterpriseGxpAgentsPage() {
  return (
    <main className="page-shell">
      <SiteHeader />
      <article className="reading-page targeted-project">
        <p className="eyebrow">Working analysis · Unlisted</p>
        <h1>Enterprise GxP Agents</h1>
        <p className="lede">Scaling AI-native regulated workflows from a single process toward broader enterprise adoption.</p>
        <section>
          <h2>The problem</h2>
          <p>Define the operational and organizational friction that appears when an AI-native regulated workflow moves beyond an initial successful process.</p>
        </section>
        <section>
          <h2>My hypothesis</h2>
          <p>Enterprise adoption depends on more than product capability. The system also has to account for validation, integration, change management, training, stakeholder alignment, governance, and measurable business value.</p>
        </section>
        <section>
          <h2>Artifact</h2>
          <div className="artifact-placeholder">
            <span>01</span>
            <div>
              <strong>One-page enterprise adoption analysis</strong>
              <p>Replace this placeholder with the outreach artifact when it is ready.</p>
            </div>
          </div>
        </section>
      </article>
    </main>
  );
}

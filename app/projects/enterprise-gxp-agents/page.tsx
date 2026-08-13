import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { DocumentOutputArchitecture } from "./document-output-architecture";

export const metadata: Metadata = {
  title: "AI Architecture for Regulated Information",
  description: "A reference architecture for inserting AI into regulated information flows.",
  robots: { index: false, follow: false },
};

export default function EnterpriseGxpAgentsPage() {
  return (
    <main className="page-shell">
      <SiteHeader />
      <article className="gxp-article">
        <header>
          <p className="gxp-article-eyebrow">Enterprise AI · Reference architecture</p>
          <h1>Leveraging AI for authoring regulatory documents flows</h1>
          <p className="gxp-article-dek">AI can accelerate how regulated information is extracted, authored, and reviewed. The harder problem is connecting it to the right evidence, workflow, requirements, and accountable people.</p>
          <div className="gxp-article-meta"><span>Winston Nilumol</span><span>4 min read</span></div>
        </header>

        <section>
          <h2>The opportunity</h2>
          <p>Scientific and regulated teams already create the information needed for decisions and downstream artifacts. Friction appears when people must locate that information across systems, reconstruct its context, and reshape it for a new audience or controlled use.</p>
          <div className="gxp-article-callout"><strong>The central idea</strong><p>LLMs serve as a component to a broader infrastracture that supports adopting AI. Software needs to enable tightly controlled information flow and structure.</p></div>
          <p>A useful architecture must improve the business workflow, retrieve the right <strong>source information</strong>, preserve the applicable <strong>regulatory boundary</strong>, and produce an output people can verify and use.</p>
        </section>

        <section>
          <h2>A concrete workflow</h2>
          <p>Consider a regulated professional who needs to turn an existing document into both a cross-functional summary and reusable controlled content. Today, that may require finding the correct document, interpreting its tables and attachments, checking context with colleagues, and manually reformatting the same information for different audiences.</p>
          <div className="gxp-article-diagram">
            <div className="gxp-article-diagram-label">Current information flow</div>
            <pre><b>Source documents · Clinical Safety Report-2048</b>{`\n`}<em>narrative · tables · references · metadata · attachments</em>{`\n    │\n    ▼\n`}<b>Human reconstruction</b>{`\n`}<em>find · reconcile · interpret · summarize · format · review</em>{`\n    │\n    ├──→ Stakeholder-ready summary\n    └──→ Reviewed controlled document`}</pre>
            <p className="gxp-article-diagram-note">The same source evidence is interpreted and reformatted for multiple downstream uses.</p>
          </div>
          <h3>Why this is difficult</h3>
          <ul>
            <li><strong>Functional:</strong> improve how scientists and reviewers work—not simply add another interface.</li>
            <li><strong>Source information:</strong> identify which documents, records, attachments, and versions are authoritative.</li>
            <li><strong>Technical:</strong> handle APIs, identity, permissions, mappings, provenance, and failures explicitly.</li>
            <li><strong>Regulatory:</strong> apply controls based on intended use and the relevant requirements.</li>
          </ul>
        </section>

        <section>
          <h2>A controlled AI pattern</h2>
          <p>The reference architecture starts with a document in an existing system of record. The application authenticates the user, establishes permissions and the task boundary, then coordinates source extraction, business logic, regulatory context, model calls, and qualified review.</p>
          <div className="gxp-article-diagram gxp-architecture-panel">
            <div className="gxp-article-diagram-label">Document-to-output reference architecture</div>
            <DocumentOutputArchitecture />
            <p className="gxp-article-diagram-note">The application—not the model—controls access, source retrieval, business logic, regulatory context, provenance, and the handoff to accountable reviewers.</p>
          </div>
          <p>The flow can remain read-only during an initial proof. If an approved result later needs to be written back to a controlled system, that bidirectional path would require explicit status mapping, reconciliation, audit-trail behavior, and validation.</p>
        </section>

        <section>
          <h2>Three architecture decisions</h2>
          <ol className="gxp-article-steps">
            <li><strong>Establish trust before generation</strong><p>Confirm identity, permissions, record status, version, provenance, and intended use at the application boundary.</p></li>
            <li><strong>Control the workflow, not only the prompt</strong><p>Combine extraction, templates, deterministic logic, model instructions, source-linked checks, and qualified review.</p></li>
            <li><strong>Evaluate the task in context</strong><p>Measure extraction accuracy, coverage, source support, unsupported claims, reviewer corrections, and appropriate refusal.</p></li>
          </ol>
        </section>

        <section>
          <h2>How I can help move this forward</h2>
          <p>My experience across regulated biopharma operations, enterprise scientific software, implementation, and AI-assisted regulatory authoring helps me connect the workflow, technical, and adoption questions surrounding the model.</p>
          <ol className="gxp-article-steps">
            <li><strong>Discovery</strong><p>Map the user, source evidence, current friction, exceptions, baseline, and desired business result.</p></li>
            <li><strong>Design</strong><p>Define system boundaries, APIs, authoritative objects, permissions, provenance, transformations, and review.</p></li>
            <li><strong>Validate</strong><p>Turn intended use and risk into evaluation cases, acceptance criteria, control evidence, and workflow outcomes.</p></li>
            <li><strong>Repeatability</strong><p>Convert field learning into reusable integrations, architecture patterns, evaluation frameworks, and playbooks.</p></li>
          </ol>
        </section>

        <section>
          <h2>What I would test next</h2>
          <p>Build one bounded example using experimental data: retrieve an authorized experiment from an ELN by <code>experiment_id</code>, preserve references to its results and attachments, and produce a stakeholder brief plus reviewed technical-report content from the same verified evidence.</p>
          <div className="gxp-article-callout"><strong>Measure the workflow—not the volume of AI output</strong><p>Compare evidence-gathering time, reviewer effort, right-first-time content, unsupported claims, and time to a usable decision.</p></div>
        </section>

        <footer>Working reference architecture · Unlisted · Not regulatory advice</footer>
      </article>
    </main>
  );
}

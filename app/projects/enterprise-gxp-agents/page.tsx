import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "AI Architecture for Regulated Information",
  description: "A reference architecture for inserting AI into regulated information flows.",
  robots: { index: false, follow: false },
};

const challenges = [
  ["01", "Functional", "Which workflows are appropriate for AI, and how will the new working model improve a user’s output rather than add another tool?"],
  ["02", "Source information", "Where does the evidence originate—from clinical systems, instruments, an ELN, executed batch records, or controlled documents—and which source is authoritative?"],
  ["03", "Technical", "How will systems exchange identities, records, permissions, events, and errors while preserving provenance and system-of-record boundaries?"],
  ["04", "Regulations", "Which requirements govern the workflow and output: GMP, GCP, Part 11, ICH guidance, eCTD standards, HIPAA, HITECH, CLIA, or another framework?"],
];

const contributions = [
  ["Discovery", "Understand the customer workflow, users, evidence, exceptions, current performance, and desired business outcome before defining the AI use case."],
  ["Design", "Translate the workflow into system boundaries, authoritative sources, API mappings, permissions, provenance, and user interactions."],
  ["Validate", "Define context of use, risk-based acceptance criteria, evaluation cases, source-grounding tests, human review, and evidence required to build trust."],
  ["Repeatability", "Turn implementation learning into reusable architecture patterns, integration components, evaluation frameworks, and rollout playbooks."],
];

function Arrow({ label }: { label?: string }) {
  return <div className="gxp-arrow" aria-hidden="true">{label && <span>{label}</span>}<i /></div>;
}

export default function EnterpriseGxpAgentsPage() {
  return (
    <main className="page-shell">
      <SiteHeader />
      <article className="gxp-project">
        <header className="gxp-hero">
          <p className="eyebrow">Working thesis · Reference architecture · Unlisted</p>
          <h1>Inserting AI into regulated information flows.</h1>
          <p className="gxp-thesis">AI can accelerate how regulated information is extracted, authored, and reviewed. The harder problem is connecting it to the right source information, business workflow, regulatory requirements, and accountable people.</p>
          <p className="gxp-principle">The model is only one component. The product is the controlled information flow around it.</p>
        </header>

        <section className="gxp-section">
          <div className="gxp-heading"><span>01</span><div><p className="eyebrow">The problem</p><h2>Why is this difficult?</h2></div></div>
          <div className="gxp-card-grid">
            {challenges.map(([number, title, text]) => <div className="gxp-card" key={title}><span>{number}</span><h3>{title}</h3><p>{text}</p></div>)}
          </div>
          <p className="gxp-note">Applicability depends on the artifact, intended use, product, organization, and jurisdiction. The boundary follows how information is used—not only the application in which it resides.</p>
        </section>

        <section className="gxp-section">
          <div className="gxp-heading"><span>02</span><div><p className="eyebrow">Today</p><h2>People reconstruct context before they can use it.</h2></div></div>
          <div className="gxp-current-flow">
            <div className="gxp-node"><span>Source information</span><strong>Clinical data · experiments · instruments · batch execution · health records</strong></div>
            <Arrow />
            <div className="gxp-node gxp-human"><span>Human interpretation</span><strong>Find · reconcile · interpret · summarize · format · review</strong></div>
            <Arrow />
            <div className="gxp-node"><span>Controlled artifact</span><strong>Decision summary · study report · technical report · submission content</strong></div>
          </div>
        </section>

        <section className="gxp-section">
          <div className="gxp-heading"><span>03</span><div><p className="eyebrow">Reference architecture</p><h2>Connect the model to a controlled workflow.</h2><p>An ELN example showing where identity, permissions, evidence, instructions, and accountable review enter the system.</p></div></div>
          <div className="gxp-architecture">
            <div className="gxp-input-row">
              <div className="gxp-arch-node"><span>System of record</span><h3>ELN</h3><p>Experiment · EXP ID · results · metadata</p></div>
              <Arrow label="API retrieval" />
              <div className="gxp-arch-node gxp-app"><span>Controlled boundary</span><h3>AI application</h3><p>Authentication · permissions · workflow · auditability</p></div>
              <div className="gxp-context"><span>User-provided context</span><p>Templates · examples · gold standards</p></div>
            </div>
            <Arrow label="Orchestrate" />
            <div className="gxp-arch-node gxp-platform">
              <span>AI platform</span><h3>Ground, transform, and check</h3>
              <div className="gxp-capabilities">
                <p><b>Source extraction</b>Experiment boundaries · results · evidence</p>
                <p><b>Business logic</b>Retrieval · mappings · structured transformations</p>
                <p><b>Requirements context</b>Applicable guidance · CMC structures · controlled examples</p>
                <p><b>LLM calls</b>Summarize · transform · draft · check</p>
              </div>
            </div>
            <Arrow label="Evidence-linked output" />
            <div className="gxp-arch-node gxp-review"><span>Accountability</span><h3>Human review and decision</h3><p>Verify · revise · approve · reject</p></div>
            <div className="gxp-output-grid">
              <div><span>Stakeholder output</span><h3>Decision-ready brief</h3><p>What was tested, what changed, what the results indicate, and what happens next.</p></div>
              <div><span>Technical output</span><h3>CMC package content</h3><p>Structured, source-linked content prepared for expert review and potential downstream use.</p></div>
            </div>
          </div>
        </section>

        <section className="gxp-section">
          <div className="gxp-heading"><span>04</span><div><p className="eyebrow">Applied example</p><h2>One experiment. Two useful outputs.</h2></div></div>
          <div className="gxp-example">
            <blockquote>“Summarize the results of EXP-2048 and present them for a cross-functional stakeholder review.”</blockquote>
            <div><p>Imagine a pivotal Phase 2 experiment evaluating a redesigned crystallization process intended to increase the water tolerance of a salt-formation step. The application retrieves the authorized record, extracts its design, observations, results, and boundaries, then produces two transformations from the same verified evidence.</p><p>The AI does not determine regulatory acceptability or approve submission content. It extracts, transforms, drafts, and checks within a defined context; qualified people verify the scientific interpretation and final use.</p></div>
          </div>
        </section>

        <section className="gxp-section">
          <div className="gxp-heading"><span>05</span><div><p className="eyebrow">What experience has taught me</p><h2>Controls and adoption develop together.</h2></div></div>
          <div className="gxp-learnings">
            <p><span>01</span>Useful AI output depends on the source context, logic, instructions, and review workflow surrounding the model.</p>
            <p><span>02</span>Integrations encode decisions about data authority and process ownership—not only data movement.</p>
            <p><span>03</span>Successful adoption requires business workflow, technical controls, regulatory expectations, and user experience to develop together.</p>
          </div>
        </section>

        <section className="gxp-section">
          <div className="gxp-heading"><span>06</span><div><p className="eyebrow">How I contribute</p><h2>From ambiguity to a repeatable implementation.</h2></div></div>
          <div className="gxp-card-grid gxp-contributions">{contributions.map(([title, text], index) => <div className="gxp-card" key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{text}</p></div>)}</div>
        </section>

        <section className="gxp-section gxp-next">
          <div className="gxp-heading"><span>07</span><div><p className="eyebrow">What I would test next</p><h2>Build one bounded, measurable proof.</h2></div></div>
          <ol>
            <li>Retrieve one authorized experiment and its evidence from an ELN using an EXP ID.</li>
            <li>Extract required information into a defined schema with source references.</li>
            <li>Generate a stakeholder summary and technical CMC-oriented output from the same information.</li>
            <li>Test accuracy, coverage, unsupported claims, traceability, permissions, missing evidence, and reviewer corrections.</li>
            <li>Measure value through time saved, review effort, right-first-time output, and time to a usable decision.</li>
          </ol>
          <p className="gxp-closing">The goal is not more generated content. It is a controlled path from source evidence to a useful decision.</p>
        </section>
      </article>
    </main>
  );
}

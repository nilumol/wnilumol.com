import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { career } from "@/content/site";

export const metadata: Metadata = { title: "Career" };

export default function CareerPage() {
  return (
    <main className="page-shell">
      <SiteHeader active="career" />
      <section className="page-content career-page">
        <header className="page-intro career-intro">
          <p className="eyebrow">Experience</p>
          <h1>Career</h1>
          <p>My path from biopharma operations to enterprise technology, customer problems, and the systems behind modern scientific work.</p>
        </header>
        <div className="career-list">
          {career.map((experience, index) => (
            <article className="career-entry" key={experience.company}>
              <div className="career-number">{String(index + 1).padStart(2, "0")}</div>
              <div className="career-body">
                <div className="career-heading">
                  <h2>{experience.company}</h2>
                  <p>{experience.role}</p>
                </div>
                <p className="career-summary">{experience.summary}</p>
                {experience.highlights.length > 0 ? (
                  <div className="career-impact">
                    <p className="eyebrow">Selected impact</p>
                    <ul>
                      {experience.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}
                    </ul>
                  </div>
                ) : null}
                <span className="text-link muted-link">Deeper experience page can be added later →</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

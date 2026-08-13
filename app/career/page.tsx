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
          <p>My path from small molecule R&amp;D to enterprise software.</p>
        </header>
        <div className="career-list">
          {career.map((experience, index) => (
            <article className="career-entry" key={experience.company}>
              <div className="career-number">{String(index + 1).padStart(2, "0")}</div>
              <div className="career-body">
                <div className="career-heading">
                  <h2>{experience.company}</h2>
                  {experience.role ? <p>{experience.role}</p> : null}
                </div>
                {experience.summary ? <p className="career-summary">{experience.summary}</p> : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

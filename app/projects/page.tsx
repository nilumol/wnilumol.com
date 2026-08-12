import type { Metadata } from "next";
import { ProjectCard } from "@/components/project-card";
import { SiteHeader } from "@/components/site-header";
import { projects } from "@/content/site";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <main className="page-shell">
      <SiteHeader active="projects" />
      <section className="page-content">
        <header className="page-intro">
          <p className="eyebrow">Selected work</p>
          <h1>Projects</h1>
          <p>Systems, products, and ideas I&apos;m exploring and building.</p>
        </header>
        <div className="project-grid">
          {projects.map((project) => (
            <ProjectCard
              key={project.slug}
              title={project.title}
              description={project.description}
              eyebrow={project.status}
              href={`/projects/${project.slug}`}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

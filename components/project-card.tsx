import Link from "next/link";

type ProjectCardProps = {
  title: string;
  description: string;
  href: string;
  eyebrow?: string;
};

export function ProjectCard({ title, description, href, eyebrow }: ProjectCardProps) {
  return (
    <Link className="project-card" href={href}>
      {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
      <h2>{title}</h2>
      <p>{description}</p>
    </Link>
  );
}

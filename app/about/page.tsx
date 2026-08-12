import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <main className="page-shell">
      <SiteHeader active="about" />
      <article className="reading-page about-page">
        <p className="eyebrow">About</p>
        <h1>Curiosity has shaped the way I work.</h1>
        <p className="lede">My career began inside biopharma operations, where I learned how scientific organizations actually work: the rigor behind regulated processes, the people behind those processes, and the systems required to make them reliable.</p>
        <p>Over time, my curiosity pulled me toward enterprise technology and the question of how better software can improve the way scientific teams work. That path eventually brought me closer to customers, technology evaluation, adoption, and the translation between technical capability and business value.</p>
        <p>Today I&apos;m especially interested in AI and in learning enough about the underlying systems to evaluate what they can do, where they fail, what they cost, and where they can create practical value.</p>
        <p>Add a final personal paragraph here about hobbies, interests, the things you enjoy learning outside of work, and what those interests say about the way you approach life.</p>
      </article>
    </main>
  );
}

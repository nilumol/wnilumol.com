import { SiteHeader } from "@/components/site-header";
import { site } from "@/content/site";

export default function HomePage() {
  return (
    <main className="home-shell">
      <SiteHeader />
      <section className="hero" aria-labelledby="home-title">
        <div className="hero-content">
          <p className="hero-kicker">Enterprise Software · BIOPHARMA · AI Solutions</p>
          <h1 id="home-title">{site.name}</h1>
          <p className="hero-statement">{site.statement}</p>
        </div>
      </section>
    </main>
  );
}

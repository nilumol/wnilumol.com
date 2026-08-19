import Link from "next/link";
import { navigation } from "@/content/site";

export function SiteHeader({
  active,
}: {
  active?: "projects" | "career" | "about";
}) {
  return (
    <header className="site-header">
      <Link className="site-logo" href="/" aria-label="WN home">
        <svg
          className="site-logo-mark"
          viewBox="0 0 100 100"
          role="img"
          aria-hidden="true"
        >
          <circle className="site-logo-ring" cx="50" cy="50" r="44" fill="none" stroke="var(--text)" strokeWidth="2.5" />
          <text x="50" y="64" textAnchor="middle" fontFamily="Georgia, 'Iowan Old Style', serif" fontSize="30" fontWeight="700" fill="var(--text)" letterSpacing="-2">WN</text>
        </svg>
      </Link>

      <nav className="site-nav" aria-label="Primary navigation">
        {navigation.map((item) => {
          const key = item.label.toLowerCase();
          return (
            <Link
              key={item.href}
              className={active === key ? "nav-link active" : "nav-link"}
              href={item.href}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

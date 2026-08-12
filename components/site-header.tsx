import Link from "next/link";
import { navigation, site } from "@/content/site";

export function SiteHeader({
  active,
}: {
  active?: "projects" | "career" | "about";
}) {
  return (
    <header className="site-header">
      <Link className="site-logo" href="/" aria-label="WN home">
        {site.logo}
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

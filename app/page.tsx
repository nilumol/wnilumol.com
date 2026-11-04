import { DM_Sans } from "next/font/google";
import Image from "next/image";
import { SiteHeader } from "@/components/site-header";
import { site } from "@/content/site";

// Keep DM Sans scoped to the homepage; the root layout provides the shared fonts.
const dmSans = DM_Sans({ subsets: ["latin"], style: ["normal", "italic"], axes: ["opsz"], variable: "--font-dm-sans" });

export default function HomePage() {
  return (
    <main className={`home-shell ${dmSans.variable}`}>
      <SiteHeader />
      <h1 className="visually-hidden">{site.name}</h1>
      <section className="home-hero" aria-label="Opening quote">
        <figure className="home-quote">
          <blockquote>
            <p>
              &ldquo;You, Venerable One, may indeed be a seeker, for, striving toward your goal, there is
              much you do not see which is right before your eyes.&rdquo;
            </p>
          </blockquote>
          <figcaption>
            Hermann Hesse, <cite>Siddhartha</cite>
          </figcaption>
        </figure>
        <div className="home-photo-wrap">
          <Image
            className="home-hero-photo"
            src="/images/home/moraine-lake.jpg"
            width={1288}
            height={1867}
            sizes="(max-width: 780px) 100vw, 340px"
            priority
            alt="Moraine Lake in the Canadian Rockies under an overcast sky: jagged grey peaks streaked with snow, dark evergreens, and turquoise water."
          />
        </div>
      </section>
    </main>
  );
}

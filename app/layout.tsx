import type { Metadata } from "next";
import { Belleza, Poppins, Tenor_Sans } from "next/font/google";
import "./globals.css";

const tenor = Tenor_Sans({ weight: "400", subsets: ["latin"], variable: "--font-tenor" });
const belleza = Belleza({ weight: "400", subsets: ["latin"], variable: "--font-belleza" });
const poppins = Poppins({ weight: ["500", "600"], subsets: ["latin"], variable: "--font-poppins" });

export const metadata: Metadata = {
  title: {
    default: "Winston | Enterprise Technology, Biopharma & AI",
    template: "%s | Winston",
  },
  description:
    "Portfolio exploring enterprise technology, biopharma, AI, systems thinking, and implementation.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${tenor.variable} ${belleza.variable} ${poppins.variable}`}>
        {children}
      </body>
    </html>
  );
}

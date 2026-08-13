import type { Metadata } from "next";
import { Belleza, Poppins, Tenor_Sans } from "next/font/google";
import "./globals.css";

const tenor = Tenor_Sans({ weight: "400", subsets: ["latin"], variable: "--font-tenor" });
const belleza = Belleza({ weight: "400", subsets: ["latin"], variable: "--font-belleza" });
const poppins = Poppins({ weight: ["500", "600"], subsets: ["latin"], variable: "--font-poppins" });

export const metadata: Metadata = {
  title: {
    default: "Winston Nilumol | Enterprise Software, Biopharma & AI Solutions",
    template: "%s | Winston Nilumol",
  },
  description:
    "Winston Nilumol's work across enterprise software, global biopharma, AI solutions, and implementation.",
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

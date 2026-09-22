import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Caveat, Literata } from "next/font/google";

const journalDisplay = Caveat({
  weight: ["500", "600"],
  subsets: ["latin"],
  variable: "--font-journal-display",
});
const journalBody = Literata({
  weight: ["400", "500"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-journal-body",
});

export const metadata: Metadata = {
  title: "Journal",
  robots: { index: false, follow: false },
};

export default function JournalLayout({ children }: { children: ReactNode }) {
  return <div className={`journal-page ${journalDisplay.variable} ${journalBody.variable}`}>{children}</div>;
}

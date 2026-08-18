import type { Metadata } from "next";
import { readFileSync } from "fs";
import { notFound } from "next/navigation";
import Link from "next/link";
import { join } from "path";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import ledgerJson from "@/content/job-scout-seen.json";
import type { JobScoutLedger } from "@/scripts/job-scout/types";

const ledger = ledgerJson as unknown as JobScoutLedger;

export const metadata: Metadata = {
  title: "Job Scout - Resume Notes",
  robots: { index: false, follow: false },
};

export function generateStaticParams() {
  return Object.values(ledger)
    .filter((entry) => entry.resumeNotesPath)
    .map((entry) => ({ id: String(entry.id) }));
}

/**
 * Minimal line-based renderer for the resume-note markdown written by
 * scripts/job-scout/resume-notes.ts (headings, bullet lists, paragraphs). Deliberately not a
 * full markdown parser - no new dependency for a format this script fully controls.
 */
function renderNotesMarkdown(markdown: string): ReactNode[] {
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={`list-${blocks.length}`}>
        {listItems.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trim();
    if (line.startsWith("## ")) {
      flushList();
      blocks.push(<h3 key={`h3-${blocks.length}`}>{line.slice(3)}</h3>);
    } else if (line.startsWith("# ")) {
      flushList();
      blocks.push(<h2 key={`h2-${blocks.length}`}>{line.slice(2)}</h2>);
    } else if (line.startsWith("- ")) {
      listItems.push(line.slice(2));
    } else if (line.length === 0) {
      flushList();
    } else {
      flushList();
      blocks.push(<p key={`p-${blocks.length}`}>{line}</p>);
    }
  }
  flushList();
  return blocks;
}

export default async function JobScoutNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entry = ledger[id];
  if (!entry || !entry.resumeNotesPath) {
    notFound();
  }

  // Path built from the static "content/job-scout-resume-notes" prefix (rather than passing
  // entry.resumeNotesPath straight through) so the filesystem access stays statically scoped
  // to that subfolder instead of tracing the whole project.
  const notesMarkdown = readFileSync(
    join(process.cwd(), "content", "job-scout-resume-notes", `${id}.md`),
    "utf-8",
  );

  return (
    <main className="page-shell">
      <SiteHeader />
      <article className="page-content job-scout-note">
        <Link className="text-link job-scout-note-back" href="/job-scout">
          &larr; Back to Job Scout
        </Link>
        <p className="eyebrow">Resume notes</p>
        <h1>{entry.title}</h1>
        <p className="job-scout-note-meta">
          {entry.company} - fit score {entry.fitScore}/10
        </p>
        <div className="job-scout-note-content">{renderNotesMarkdown(notesMarkdown)}</div>
      </article>
    </main>
  );
}

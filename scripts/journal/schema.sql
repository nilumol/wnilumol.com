-- Canonical schema for the gratitude journal's single table. The app applies this
-- automatically at runtime (see ensureJournalTable() in scripts/journal/db.ts), so running
-- this file by hand is optional - it exists as a readable reference and for manual psql use
-- against the project's Postgres database (Vercel's Neon-backed Postgres storage) once it's
-- provisioned and linked to this project.
CREATE TABLE IF NOT EXISTS journal_entries (
  id SERIAL PRIMARY KEY,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

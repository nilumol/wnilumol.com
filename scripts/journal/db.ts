import { neon } from "@neondatabase/serverless";

export type JournalEntry = {
  id: number;
  body: string;
  createdAt: string;
};

type JournalRow = { id: number; body: string; created_at: string | Date };

/**
 * @vercel/postgres is deprecated; Vercel's current Postgres storage is Neon-backed and its own
 * migration guide points new integrations at @neondatabase/serverless instead. Vercel's Neon
 * integration provisions DATABASE_URL (and pooled/unpooled variants) automatically once the
 * database is attached to this project - see the "Gratitude Journal" note in CLAUDE.md.
 */
function sql() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set - attach a Postgres database to this Vercel project (or set it locally) before using the journal.",
    );
  }
  return neon(connectionString);
}

/**
 * Applies the journal_entries schema (see schema.sql) if it doesn't exist yet. Idempotent, and
 * memoized per server instance (cleared on failure so the next request retries), so it's simplest
 * to call before every query rather than introduce a migration runner for a single table.
 */
let journalTableReady: Promise<void> | null = null;

function ensureJournalTable(): Promise<void> {
  journalTableReady ??= createJournalTable().catch((error: unknown) => {
    journalTableReady = null;
    throw error;
  });
  return journalTableReady;
}

async function createJournalTable(): Promise<void> {
  await sql()`
    CREATE TABLE IF NOT EXISTS journal_entries (
      id SERIAL PRIMARY KEY,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

function toJournalEntry(row: JournalRow): JournalEntry {
  return { id: row.id, body: row.body, createdAt: new Date(row.created_at).toISOString() };
}

/** created_at is stamped by the database default (now()); callers cannot supply a timestamp. */
export async function insertJournalEntry(body: string): Promise<JournalEntry> {
  await ensureJournalTable();
  const rows = (await sql()`
    INSERT INTO journal_entries (body)
    VALUES (${body})
    RETURNING id, body, created_at
  `) as JournalRow[];
  return toJournalEntry(rows[0]);
}

export async function listJournalEntries(): Promise<JournalEntry[]> {
  await ensureJournalTable();
  const rows = (await sql()`
    SELECT id, body, created_at
    FROM journal_entries
    ORDER BY created_at DESC
  `) as JournalRow[];
  return rows.map(toJournalEntry);
}

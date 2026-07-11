import { neon, neonConfig, type NeonQueryFunction } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // eslint-disable-next-line no-console
  console.warn(
    "[db] DATABASE_URL is not set. Set it in backend/.env (see .env.example) to a Neon connection string."
  );
}

// Reuse connections across invocations in serverless environments.
neonConfig.fetchConnectionCache = true;

// Falls back to a syntactically valid (but unusable) connection string when
// unset, so the module can still be imported — e.g. for typechecking, or so
// the Express server can boot and serve /health with a clear error later
// instead of crashing on require().
export const sql: NeonQueryFunction<false, false> = neon(
  connectionString || "postgresql://unset:unset@unset/unset"
);

/**
 * Creates the two tables we need if they don't already exist:
 *  - import_batches: one row per CSV upload/confirm action
 *  - leads: one row per successfully extracted CRM record, linked to a batch
 * Skipped rows are stored as JSON directly on the batch row (they're
 * diagnostic, not CRM data, so a separate table isn't warranted).
 */
export async function ensureSchema(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS import_batches (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      filename TEXT,
      total_received INTEGER NOT NULL DEFAULT 0,
      total_imported INTEGER NOT NULL DEFAULT 0,
      total_skipped INTEGER NOT NULL DEFAULT 0,
      batch_total INTEGER NOT NULL DEFAULT 0,
      batch_succeeded INTEGER NOT NULL DEFAULT 0,
      batch_failed INTEGER NOT NULL DEFAULT 0,
      skipped_records JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS leads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      import_batch_id UUID NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
      lead_created_at TEXT,
      name TEXT,
      email TEXT,
      country_code TEXT,
      mobile_without_country_code TEXT,
      company TEXT,
      city TEXT,
      state TEXT,
      country TEXT,
      lead_owner TEXT,
      crm_status TEXT,
      crm_note TEXT,
      data_source TEXT,
      possession_time TEXT,
      description TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`CREATE INDEX IF NOT EXISTS leads_import_batch_id_idx ON leads(import_batch_id);`;
}

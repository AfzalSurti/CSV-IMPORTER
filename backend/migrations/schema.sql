-- GrowEasy AI CSV Importer — schema
-- This runs automatically on backend startup (see backend/src/db.ts), but is
-- also provided standalone for manual review / running against Neon directly.

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

CREATE INDEX IF NOT EXISTS leads_import_batch_id_idx ON leads(import_batch_id);

import { z } from "zod";
import {
  CRM_STATUS_VALUES,
  DATA_SOURCE_VALUES,
  type CrmRecord,
  type RawCsvRow,
  type SkippedRecord,
} from "./types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = process.env.AI_MODEL || "google/gemini-2.0-flash-001";
const BATCH_SIZE = Number(process.env.AI_BATCH_SIZE || 25);
const MAX_RETRIES = 3;

const crmRecordSchema = z.object({
  row_index: z.number(),
  skipped: z.boolean(),
  skip_reason: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  country_code: z.string().nullable().optional(),
  mobile_without_country_code: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  lead_owner: z.string().nullable().optional(),
  crm_status: z.enum(CRM_STATUS_VALUES).nullable().optional(),
  crm_note: z.string().nullable().optional(),
  data_source: z.enum(DATA_SOURCE_VALUES).nullable().optional(),
  possession_time: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

const batchResponseSchema = z.object({ records: z.array(crmRecordSchema) });
type ModelRecord = z.infer<typeof crmRecordSchema>;

function buildSystemPrompt(): string {
  return `You are a data extraction engine for GrowEasy CRM. You will receive an array of raw CSV rows (as JSON objects with arbitrary, unpredictable column names) and must map each row into the GrowEasy CRM lead schema.

TARGET SCHEMA (per row, in the same order as input):
- created_at: lead creation date/time, formatted so that JavaScript's \`new Date(created_at)\` parses it correctly (prefer "YYYY-MM-DD HH:mm:ss" or ISO 8601). If no date is present, use null.
- name: the lead's full name.
- email: the PRIMARY email address only.
- country_code: phone country code including "+" (e.g. "+91"). Infer from context when not explicit; default to "+91" ONLY if there is strong contextual evidence (e.g. Indian city/state/company); otherwise null.
- mobile_without_country_code: the primary phone number, digits only, WITHOUT the country code.
- company: company or organization name.
- city, state, country: location fields, split correctly even if the source has them combined (e.g. "Mumbai, Maharashtra").
- lead_owner: the salesperson/agent/owner assigned to this lead (often an email).
- crm_status: MUST be exactly one of: GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, SALE_DONE. Infer from any status/stage/remark column. If nothing indicates status, use null (do not guess).
- crm_note: free-text notes. Consolidate here: remarks, follow-up notes, additional comments, EXTRA phone numbers beyond the first one, EXTRA email addresses beyond the first one, and any other useful info that doesn't fit elsewhere. Prefix appended extra contact info clearly, e.g. "Alt email: x@y.com" or "Alt phone: 98765".
- data_source: MUST be exactly one of: leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots. Only set this if the row confidently indicates one of these. If none match with confidence, use null. Never invent a value outside this list.
- possession_time: property possession timeframe, if this is real-estate lead data (e.g. "Dec 2026", "Ready to move").
- description: any other descriptive info about the lead/property/requirement that doesn't fit the fields above.

RULES:
1. Preserve the input row order and echo back "row_index" exactly as given for each row.
2. If a row has NEITHER an email NOR a mobile number anywhere in its raw data, set "skipped": true and give a short "skip_reason". Leave other fields null when skipped.
3. If a row is not skipped, set "skipped": false and "skip_reason": null.
4. Be liberal recognizing fields under unfamiliar column names (e.g. "Ph No", "Contact", "Cell" all mean phone). Use ALL columns' values, not just column names, to decide.
5. Never fabricate data that isn't implied by the row. Leave a field null if not reasonably confident.
6. Output ONLY valid JSON matching the schema below. No markdown, no commentary, no code fences.

OUTPUT JSON SHAPE:
{"records": [{"row_index": number, "skipped": boolean, "skip_reason": string|null, "created_at": string|null, "name": string|null, "email": string|null, "country_code": string|null, "mobile_without_country_code": string|null, "company": string|null, "city": string|null, "state": string|null, "country": string|null, "lead_owner": string|null, "crm_status": string|null, "crm_note": string|null, "data_source": string|null, "possession_time": string|null, "description": string|null}, ...]}`;
}

function buildUserPrompt(rows: RawCsvRow[], startIndex: number): string {
  const payload = rows.map((row, i) => ({ row_index: startIndex + i, data: row }));
  return `Map the following ${rows.length} CSV rows into the GrowEasy CRM schema. Return JSON only.\n\nROWS:\n${JSON.stringify(payload)}`;
}

function stripCodeFences(text: string): string {
  return text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
}

async function callModelOnce(rows: RawCsvRow[], startIndex: number): Promise<ModelRecord[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set. Add it to backend/.env (see .env.example).");
  }

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
      "X-Title": "GrowEasy AI CSV Importer",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: buildUserPrompt(rows, startIndex) },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI provider error (${res.status}): ${text.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI provider returned an empty response");

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(stripCodeFences(content));
  } catch {
    throw new Error("AI response was not valid JSON");
  }

  const parsed = batchResponseSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new Error(`AI response failed schema validation: ${parsed.error.message}`);
  }

  return parsed.data.records;
}

async function callModelWithRetry(
  rows: RawCsvRow[],
  startIndex: number
): Promise<{ records: ModelRecord[] | null; error: string | null }> {
  let lastError = "";
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return { records: await callModelOnce(rows, startIndex), error: null };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }
  return { records: null, error: lastError };
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export interface RunExtractionResult {
  imported: CrmRecord[];
  skipped: SkippedRecord[];
  batchStats: { total: number; succeeded: number; failed: number };
}

export async function runExtraction(
  rawRows: RawCsvRow[],
  onProgress?: (batchIndex: number, totalBatches: number) => void
): Promise<RunExtractionResult> {
  const batches = chunk(rawRows, BATCH_SIZE);
  const imported: CrmRecord[] = [];
  const skipped: SkippedRecord[] = [];
  let succeeded = 0;
  let failed = 0;

  for (let b = 0; b < batches.length; b++) {
    const batchRows = batches[b];
    const startIndex = b * BATCH_SIZE;
    const { records, error } = await callModelWithRetry(batchRows, startIndex);

    if (!records) {
      failed++;
      batchRows.forEach((raw, i) => {
        skipped.push({
          rowIndex: startIndex + i,
          raw,
          reason: `AI extraction failed for this batch: ${error}`,
        });
      });
      onProgress?.(b + 1, batches.length);
      continue;
    }

    succeeded++;
    const byIndex = new Map(records.map((r) => [r.row_index, r]));

    batchRows.forEach((raw, i) => {
      const rowIndex = startIndex + i;
      const rec = byIndex.get(rowIndex);

      if (!rec) {
        skipped.push({ rowIndex, raw, reason: "AI did not return a result for this row" });
        return;
      }
      if (rec.skipped) {
        skipped.push({ rowIndex, raw, reason: rec.skip_reason || "No email or mobile number found" });
        return;
      }
      if (!rec.email && !rec.mobile_without_country_code) {
        skipped.push({ rowIndex, raw, reason: "No email or mobile number found" });
        return;
      }

      imported.push({
        created_at: rec.created_at ?? null,
        name: rec.name ?? null,
        email: rec.email ?? null,
        country_code: rec.country_code ?? null,
        mobile_without_country_code: rec.mobile_without_country_code ?? null,
        company: rec.company ?? null,
        city: rec.city ?? null,
        state: rec.state ?? null,
        country: rec.country ?? null,
        lead_owner: rec.lead_owner ?? null,
        crm_status: rec.crm_status ?? null,
        crm_note: rec.crm_note ?? null,
        data_source: rec.data_source ?? null,
        possession_time: rec.possession_time ?? null,
        description: rec.description ?? null,
      });
    });

    onProgress?.(b + 1, batches.length);
  }

  return { imported, skipped, batchStats: { total: batches.length, succeeded, failed } };
}

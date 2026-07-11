import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { runExtraction } from "../ai";
import { sql } from "../db";
import type { CrmRecord, ExtractResponse, RawCsvRow, SkippedRecord } from "../types";

export const extractRouter = Router();

const requestSchema = z.object({
  filename: z.string().optional(),
  rows: z.array(z.record(z.string(), z.string())).min(1, "At least one CSV row is required"),
});

async function persistBatch(
  filename: string | undefined,
  totalReceived: number,
  imported: CrmRecord[],
  skipped: SkippedRecord[],
  batchStats: { total: number; succeeded: number; failed: number }
): Promise<string> {
  const [batch] = await sql`
    INSERT INTO import_batches (
      filename, total_received, total_imported, total_skipped,
      batch_total, batch_succeeded, batch_failed, skipped_records
    ) VALUES (
      ${filename || null}, ${totalReceived}, ${imported.length}, ${skipped.length},
      ${batchStats.total}, ${batchStats.succeeded}, ${batchStats.failed}, ${JSON.stringify(skipped)}
    )
    RETURNING id;
  `;

  const batchId = batch.id as string;

  // Bulk insert leads. Neon's http driver doesn't support multi-row VALUES
  // via template tags directly, so we insert sequentially in small
  // concurrent groups to keep this fast without overwhelming the connection.
  const CONCURRENCY = 10;
  for (let i = 0; i < imported.length; i += CONCURRENCY) {
    const group = imported.slice(i, i + CONCURRENCY);
    await Promise.all(
      group.map((lead) =>
        sql`
          INSERT INTO leads (
            import_batch_id, lead_created_at, name, email, country_code,
            mobile_without_country_code, company, city, state, country,
            lead_owner, crm_status, crm_note, data_source, possession_time, description
          ) VALUES (
            ${batchId}, ${lead.created_at}, ${lead.name}, ${lead.email}, ${lead.country_code},
            ${lead.mobile_without_country_code}, ${lead.company}, ${lead.city}, ${lead.state}, ${lead.country},
            ${lead.lead_owner}, ${lead.crm_status}, ${lead.crm_note}, ${lead.data_source}, ${lead.possession_time}, ${lead.description}
          );
        `
      )
    );
  }

  return batchId;
}

/**
 * POST /api/extract
 * Streams progress as Server-Sent Events, then persists results to Neon and
 * emits a final "done" event with the full ExtractResponse payload.
 */
extractRouter.post("/extract", async (req: Request, res: Response) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid request body" });
    return;
  }

  const { filename, rows } = parsed.data as { filename?: string; rows: RawCsvRow[] };

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const { imported, skipped, batchStats } = await runExtraction(rows, (batchIndex, totalBatches) => {
      send("progress", { batchIndex, totalBatches });
    });

    const importId = await persistBatch(filename, rows.length, imported, skipped, batchStats);

    const payload: ExtractResponse = {
      importId,
      imported,
      skipped,
      totalImported: imported.length,
      totalSkipped: skipped.length,
      totalReceived: rows.length,
      batches: batchStats,
    };

    send("done", payload);
  } catch (err) {
    send("error", { message: err instanceof Error ? err.message : "Extraction failed" });
  } finally {
    res.end();
  }
});

/** GET /api/imports — recent import history (bonus: persistence/audit trail) */
extractRouter.get("/imports", async (_req: Request, res: Response) => {
  const rows = await sql`
    SELECT id, filename, total_received, total_imported, total_skipped, created_at
    FROM import_batches
    ORDER BY created_at DESC
    LIMIT 20;
  `;
  res.json({ imports: rows });
});

/** GET /api/imports/:id — full detail for one import batch */
extractRouter.get("/imports/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const [batch] = await sql`SELECT * FROM import_batches WHERE id = ${id};`;
  if (!batch) {
    res.status(404).json({ error: "Import not found" });
    return;
  }
  const leads = await sql`SELECT * FROM leads WHERE import_batch_id = ${id} ORDER BY created_at ASC;`;
  res.json({ batch, leads });
});

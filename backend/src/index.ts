import "dotenv/config";
import express from "express";
import cors from "cors";
import { extractRouter } from "./routes/extract";
import { ensureSchema } from "./db";

const app = express();
const PORT = Number(process.env.PORT || 4000);

app.use(
  cors({
    origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(",") : "*",
  })
);
app.use(express.json({ limit: "25mb" })); // large CSVs can produce a sizeable JSON payload

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api", extractRouter);

// Central error handler so unexpected exceptions don't crash the process
// or leak stack traces to the client.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

async function start() {
  try {
    await ensureSchema();
    // eslint-disable-next-line no-console
    console.log("[db] schema ready");
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[db] failed to ensure schema — check DATABASE_URL:", err);
  }

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`GrowEasy CSV Importer backend listening on http://localhost:${PORT}`);
  });
}

start();

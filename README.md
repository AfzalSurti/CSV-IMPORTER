# GrowEasy AI CSV Importer

An AI-powered CRM lead importer that accepts CSVs in **any layout** — Facebook/Google
Ads exports, real estate CRM dumps, sales reports, or hand-built spreadsheets — and
uses an LLM to intelligently map their columns into GrowEasy's fixed CRM schema.

Built for the GrowEasy Software Developer assignment.

## Live demo

- App: `<add your deployed frontend URL here>`
- API: `<add your deployed backend URL here>`

## Architecture

```
groweasy-csv-importer/
├── frontend/   Next.js 16 (App Router, TypeScript, Tailwind v4)
├── backend/    Express + TypeScript API, Neon Postgres (serverless)
└── samples/    Messy sample CSVs for testing the AI mapping
```

The two pieces are deployed independently (frontend on Vercel, backend on
Render/Railway/Fly), talking over a plain REST + SSE API. This keeps the
AI extraction, retries, and DB writes off the client and out of any single
serverless function's time limit — long CSVs stream progress back over
Server-Sent Events instead of blocking on one request.

**Why Neon over a stateless design:** the assignment marks a database as
optional, but persisting every import batch (and its successfully mapped
leads) gives an audit trail — you can see what was imported, when, and
re-open the skipped-row diagnostics later instead of losing them on refresh.
`@neondatabase/serverless` is used instead of a traditional pg driver/ORM
because it talks to Neon over HTTP, which fits serverless backends (no
connection pool exhaustion, works over Vercel/Lambda-style runtimes) far
better than a persistent TCP pool would.

### Data flow

1. **Upload** — the browser parses the CSV with PapaParse. No network call yet.
2. **Preview** — parsed rows render in a sticky-header, scrollable table so the
   user can sanity-check the file before spending any AI budget on it.
3. **Confirm** — only now does the frontend POST the raw rows to
   `POST /api/extract` on the backend.
4. **Extract** — the backend batches rows (25 at a time, configurable), sends
   each batch to an LLM via OpenRouter with a schema-constrained prompt, and
   streams `progress` events back over SSE as each batch completes. Failed
   batches are retried up to 3 times with backoff; if a batch still fails,
   its rows are marked skipped with the underlying error rather than silently
   dropped.
5. **Persist** — once extraction finishes, the batch and its leads are written
   to Neon, and a final `done` event returns the full result (imported rows,
   skipped rows with reasons, and counts) to the client.
6. **Results** — a virtualized table (handles large CSVs without lag) shows
   imported vs. skipped records, with a CSV export of the final CRM-format
   data.

## AI prompt engineering approach

The extraction prompt (`backend/src/ai.ts`) is deliberately schema-first
rather than example-first:

- It states the **target schema field-by-field** with the specific inference
  rule for that field (e.g. how to split a combined "City, State" value, how
  to pick a primary email when multiple exist, when it's safe to default
  `country_code` to `+91`).
- It enumerates the **closed vocabularies** (`crm_status`, `data_source`)
  explicitly and instructs the model to return `null` rather than guess when
  unsure — this matters because the CRM only accepts those exact enum values,
  and a hallucinated `data_source` is worse than a blank one.
- It pushes the **skip rule** ("no email and no phone → skip") into the model
  itself, but the backend re-validates that rule independently on every
  returned record as a safety net — so even if the model mis-flags a row,
  invalid records never reach the CRM.
- It requests **strict JSON output** (`response_format: json_object`) and the
  backend validates the response against a Zod schema before trusting it,
  rejecting/retrying on malformed output instead of passing bad data through.
- Multiple emails/phones, free-text remarks, and anything that doesn't map to
  a named field are explicitly routed into `crm_note` rather than dropped.

Three intentionally messy sample CSVs are in `/samples` — a Facebook Lead Ads
export, a real-estate CRM export with abbreviated/inconsistent column names,
and a hand-built spreadsheet — each containing at least one row that should
be skipped (no email or phone) to exercise that path.

## Local setup

### 1. Backend

```bash
cd backend
cp .env.example .env
# Fill in DATABASE_URL (Neon connection string) and OPENROUTER_API_KEY
npm install
npm run dev   # http://localhost:4000
```

The backend creates its own tables on startup (`ensureSchema()` in
`src/db.ts`) — no manual migration step needed. `migrations/schema.sql` is
provided if you'd rather run it by hand against Neon's SQL editor.

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local
# NEXT_PUBLIC_API_URL should point at the backend above
npm install
npm run dev   # http://localhost:3000
```

### 3. Try it

Upload any file from `/samples`, or your own CSV, at `http://localhost:3000`.

## Deployment

- **Frontend** → Vercel (`frontend/` as the project root). Set
  `NEXT_PUBLIC_API_URL` to your deployed backend URL.
- **Backend** → Render/Railway/Fly (`backend/` as the project root, or use
  the provided `backend/Dockerfile`). Set `DATABASE_URL`,
  `OPENROUTER_API_KEY`, and `FRONTEND_URL` (for CORS).
- **Database** → Neon (neon.tech) — create a project, copy the pooled
  connection string into `DATABASE_URL`.
- Alternatively, `docker compose up --build` runs both services locally
  against your real Neon instance (see `docker-compose.yml`).

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | backend | Neon Postgres connection string |
| `OPENROUTER_API_KEY` | backend | OpenRouter API key for AI extraction |
| `AI_MODEL` | backend | OpenRouter model id (default `google/gemini-2.0-flash-001`) |
| `AI_BATCH_SIZE` | backend | Rows sent to the model per request (default `25`) |
| `FRONTEND_URL` | backend | Allowed CORS origin(s) |
| `NEXT_PUBLIC_API_URL` | frontend | Backend base URL |

## Notable implementation details / bonus items covered

- Drag & drop upload with click-to-browse fallback
- Live batch-by-batch progress during AI processing (SSE, not a fake spinner)
- Retry mechanism for failed AI batches (3 attempts, exponential backoff),
  with failed rows surfaced as skipped rather than silently lost
- Virtualized results table (`@tanstack/react-virtual`) for large CSVs
- Dark/light theme toggle
- Docker setup for both services
- Import history persisted to Postgres (`GET /api/imports`, `GET /api/imports/:id`)
- CSV export of the final mapped CRM data

## Tech stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS v4, PapaParse, TanStack Virtual
- **Backend**: Node.js, Express 5, TypeScript, Zod
- **Database**: Neon Postgres (`@neondatabase/serverless`)
- **AI**: OpenRouter (model configurable — Gemini by default, swap to any OpenAI/Claude model)

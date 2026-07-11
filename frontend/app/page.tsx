"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Download, RotateCcw } from "lucide-react";
import { AppFooter } from "@/components/AppFooter";
import { AppLogo } from "@/components/AppLogo";
import { UploadStep } from "@/components/UploadStep";
import { PreviewTable } from "@/components/PreviewTable";
import { ResultsTable } from "@/components/ResultsTable";
import { ExtractionProgress } from "@/components/ExtractionProgress";
import { PipelineRail, type Stage } from "@/components/PipelineRail";
import { ThemeToggle } from "@/components/ThemeToggle";
import { extractCsv } from "@/lib/api";
import type { ExtractResponse, RawCsvRow } from "@/lib/types";

export default function Home() {
  const [stage, setStage] = useState<Stage>("upload");
  const [filename, setFilename] = useState("");
  const [rows, setRows] = useState<RawCsvRow[]>([]);
  const [result, setResult] = useState<ExtractResponse | null>(null);
  const [progress, setProgress] = useState({ batchIndex: 0, totalBatches: 0 });
  const [error, setError] = useState<string | null>(null);

  function handleParsed(name: string, parsedRows: RawCsvRow[]) {
    setFilename(name);
    setRows(parsedRows);
    setStage("preview");
  }

  function handleReset() {
    setStage("upload");
    setFilename("");
    setRows([]);
    setResult(null);
    setError(null);
    setProgress({ batchIndex: 0, totalBatches: 0 });
  }

  async function handleConfirm() {
    setStage("extract");
    setError(null);
    setProgress({ batchIndex: 0, totalBatches: Math.ceil(rows.length / 25) });

    await extractCsv(filename, rows, {
      onProgress: (batchIndex, totalBatches) => setProgress({ batchIndex, totalBatches }),
      onDone: (res) => {
        setResult(res);
        setStage("done");
      },
      onError: (message) => {
        setError(message);
        setStage("preview");
      },
    });
  }

  function downloadResultsCsv() {
    if (!result) return;
    const cols = [
      "created_at", "name", "email", "country_code", "mobile_without_country_code",
      "company", "city", "state", "country", "lead_owner", "crm_status", "crm_note",
      "data_source", "possession_time", "description",
    ] as const;
    const escape = (v: string | null) => {
      const s = (v ?? "").replace(/\n/g, "\\n");
      return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      cols.join(","),
      ...result.imported.map((r) => cols.map((c) => escape(r[c])).join(",")),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `groweasy-crm-import-${result.importId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          <AppLogo />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-10">
          <PipelineRail stage={stage} />
        </div>

        {stage === "upload" && (
          <section>
            <SectionHeading
              eyebrow="Step 01"
              title="Upload your CSV"
              subtitle="Any layout — Facebook leads, Google Ads exports, real estate CRM dumps, or a plain spreadsheet."
            />
            <UploadStep onParsed={handleParsed} />
          </section>
        )}

        {stage === "preview" && (
          <section>
            <SectionHeading
              eyebrow="Step 02"
              title={filename}
              subtitle={`${rows.length} row${rows.length === 1 ? "" : "s"} detected. Nothing has been sent to AI yet.`}
            />
            <PreviewTable rows={rows} />

            {error && (
              <div className="mt-4 rounded-lg border border-error/40 bg-error-soft px-4 py-3 text-sm text-error">
                {error}
              </div>
            )}

            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text"
              >
                <ArrowLeft size={14} /> Choose a different file
              </button>
              <button
                onClick={handleConfirm}
                className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 font-display text-sm font-semibold text-[#0e1015] transition-opacity hover:opacity-90"
              >
                Confirm &amp; extract with AI <ArrowRight size={15} />
              </button>
            </div>
          </section>
        )}

        {stage === "extract" && (
          <section>
            <SectionHeading
              eyebrow="Step 03"
              title="Extracting"
              subtitle="Mapping every row into the GrowEasy CRM schema."
            />
            <ExtractionProgress batchIndex={progress.batchIndex} totalBatches={progress.totalBatches} />
          </section>
        )}

        {stage === "extract" && (
          <section>
            <SectionHeading
              eyebrow="Step 03"
              title="Extracting"
              subtitle="Mapping every row into the GrowEasy CRM schema."
            />
            <ExtractionProgress batchIndex={progress.batchIndex} totalBatches={progress.totalBatches} />
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => setStage("preview")}
                className="flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text"
              >
                <ArrowLeft size={14} /> Back to preview
              </button>
              <div className="text-sm text-text-faint">Extraction is in progress; you can return to preview if needed.</div>
            </div>
          </section>
        )}

        {stage === "done" && result && (
          <section>
            <SectionHeading
              eyebrow="Step 04"
              title="Import complete"
              subtitle={`${result.totalImported} of ${result.totalReceived} rows imported into the GrowEasy CRM format.`}
            />
            <ResultsTable result={result} />

            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text"
              >
                <RotateCcw size={14} /> Import another file
              </button>
              <button
                onClick={downloadResultsCsv}
                className="flex items-center gap-2 rounded-lg border border-border-strong bg-surface px-5 py-2.5 font-display text-sm font-semibold text-text transition-colors hover:bg-surface-raised"
              >
                <Download size={15} /> Download CRM CSV
              </button>
            </div>
          </section>
        )}
      </main>

      <AppFooter />
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-6">
      <div className="mb-1.5 font-data text-xs font-medium uppercase tracking-widest text-accent">
        {eyebrow}
      </div>
      <h1 className="truncate font-display text-2xl font-semibold text-text">{title}</h1>
      <p className="mt-1.5 text-sm text-text-muted">{subtitle}</p>
    </div>
  );
}

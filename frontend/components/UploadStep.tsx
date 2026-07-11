"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud, FileWarning } from "lucide-react";
import Papa from "papaparse";
import type { RawCsvRow } from "@/lib/types";

interface UploadStepProps {
  onParsed: (filename: string, rows: RawCsvRow[]) => void;
}

export function UploadStep({ onParsed }: UploadStepProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);

      if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
        setError("Please upload a .csv file.");
        return;
      }

      Papa.parse<RawCsvRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0 && results.data.length === 0) {
            setError(
              `Couldn't parse this CSV: ${results.errors[0].message}. Check the file is valid CSV.`
            );
            return;
          }
          if (results.data.length === 0) {
            setError("This CSV has no data rows.");
            return;
          }
          onParsed(file.name, results.data);
        },
        error: (err) => setError(err.message || "Failed to read the file."),
      });
    },
    [onParsed]
  );

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={[
          "flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-8 py-20 text-center transition-colors cursor-pointer",
          isDragging
            ? "border-accent bg-accent-soft"
            : "border-border-strong bg-surface hover:border-accent/60 hover:bg-surface-raised",
        ].join(" ")}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border-strong bg-surface-raised text-accent">
          <UploadCloud size={24} />
        </div>
        <div>
          <p className="font-display text-lg font-medium text-text">
            Drop a CSV here, or click to browse
          </p>
          <p className="mt-1 text-sm text-text-muted">
            Facebook/Google Ads exports, spreadsheets, CRM dumps — any layout works.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-error/40 bg-error-soft px-4 py-3 text-sm text-error">
          <FileWarning size={16} className="shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}

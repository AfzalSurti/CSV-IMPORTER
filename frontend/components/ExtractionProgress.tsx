"use client";

import { Loader2 } from "lucide-react";

export function ExtractionProgress({
  batchIndex,
  totalBatches,
}: {
  batchIndex: number;
  totalBatches: number;
}) {
  const pct = totalBatches > 0 ? Math.round((batchIndex / totalBatches) * 100) : 0;

  return (
    <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-border bg-surface px-8 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border-strong bg-surface-raised text-accent">
        <Loader2 size={22} className="animate-spin" />
      </div>
      <div>
        <p className="font-display text-lg font-medium text-text">Mapping your leads with AI</p>
        <p className="mt-1 text-sm text-text-muted">
          Batch {batchIndex} of {totalBatches || "…"}
        </p>
      </div>
      <div className="h-1.5 w-64 overflow-hidden rounded-full bg-border">
        <div
          className="h-full bg-accent transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

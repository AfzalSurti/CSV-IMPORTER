"use client";

import type { RawCsvRow } from "@/lib/types";

interface PreviewTableProps {
  rows: RawCsvRow[];
}

export function PreviewTable({ rows }: PreviewTableProps) {
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="max-h-[26rem] overflow-auto scrollbar-thin">
        <table className="w-full border-collapse text-left font-data text-xs">
          <thead className="sticky top-0 z-10 bg-surface-raised">
            <tr>
              <th className="whitespace-nowrap border-b border-border px-4 py-3 font-medium text-text-faint">
                #
              </th>
              {columns.map((col) => (
                <th
                  key={col}
                  className="whitespace-nowrap border-b border-l border-border px-4 py-3 font-medium text-text-muted"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="odd:bg-transparent even:bg-surface/60">
                <td className="whitespace-nowrap border-b border-border px-4 py-2.5 text-text-faint">
                  {i + 1}
                </td>
                {columns.map((col) => (
                  <td
                    key={col}
                    className="max-w-[16rem] truncate whitespace-nowrap border-b border-l border-border px-4 py-2.5 text-text"
                    title={row[col]}
                  >
                    {row[col] || <span className="text-text-faint">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CheckCircle2, XCircle } from "lucide-react";
import { CRM_FIELDS, type ExtractResponse } from "@/lib/types";

const COLUMN_LABELS: Record<string, string> = {
  created_at: "Created",
  name: "Name",
  email: "Email",
  country_code: "Code",
  mobile_without_country_code: "Mobile",
  company: "Company",
  city: "City",
  state: "State",
  country: "Country",
  lead_owner: "Owner",
  crm_status: "Status",
  crm_note: "Note",
  data_source: "Source",
  possession_time: "Possession",
  description: "Description",
};

const STATUS_COLORS: Record<string, string> = {
  GOOD_LEAD_FOLLOW_UP: "text-accent",
  DID_NOT_CONNECT: "text-text-muted",
  BAD_LEAD: "text-error",
  SALE_DONE: "text-success",
};

export function ResultsTable({ result }: { result: ExtractResponse }) {
  const [tab, setTab] = useState<"imported" | "skipped">("imported");

  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-3">
        <StatCard label="Received" value={result.totalReceived} tone="neutral" />
        <StatCard label="Imported" value={result.totalImported} tone="success" />
        <StatCard label="Skipped" value={result.totalSkipped} tone="error" />
      </div>

      <div className="mb-3 flex gap-1 rounded-lg border border-border bg-surface p-1 text-sm">
        <TabButton active={tab === "imported"} onClick={() => setTab("imported")}>
          <CheckCircle2 size={14} /> Imported ({result.totalImported})
        </TabButton>
        <TabButton active={tab === "skipped"} onClick={() => setTab("skipped")}>
          <XCircle size={14} /> Skipped ({result.totalSkipped})
        </TabButton>
      </div>

      {tab === "imported" ? (
        <ImportedTable records={result.imported} />
      ) : (
        <SkippedTable records={result.skipped} />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "success" | "error";
}) {
  const color =
    tone === "success" ? "text-success" : tone === "error" ? "text-error" : "text-text";
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-text-faint">{label}</div>
      <div className={`font-display text-2xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 font-medium transition-colors",
        active ? "bg-surface-raised text-text" : "text-text-muted hover:text-text",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function ImportedTable({ records }: { records: ExtractResponse["imported"] }) {
  const columns = useMemo(() => CRM_FIELDS, []);

  if (records.length === 0) {
    return <EmptyState message="No records were successfully mapped from this file." />;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="max-h-[30rem] overflow-auto scrollbar-thin">
        <table className="w-full border-collapse text-left font-data text-xs">
          <thead className="sticky top-0 z-10 bg-surface-raised">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className="whitespace-nowrap border-b border-l border-border px-4 py-3 font-medium text-text-muted first:border-l-0"
                >
                  {COLUMN_LABELS[col]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((record, index) => (
              <tr key={index} className="odd:bg-transparent even:bg-surface/60">
                {columns.map((col) => (
                  <td
                    key={col}
                    className="max-w-[14rem] truncate whitespace-nowrap border-b border-l border-border px-4 py-2.5 first:border-l-0"
                    title={record[col] || ""}
                  >
                    {col === "crm_status" && record[col] ? (
                      <span className={STATUS_COLORS[record[col] as string] || "text-text"}>
                        {record[col]}
                      </span>
                    ) : (
                      record[col] || <span className="text-text-faint">—</span>
                    )}
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

function SkippedTable({ records }: { records: ExtractResponse["skipped"] }) {
  if (records.length === 0) {
    return <EmptyState message="Nothing was skipped — every row had an email or phone number." />;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="max-h-[30rem] overflow-auto scrollbar-thin">
        <table className="w-full border-collapse text-left font-data text-xs">
          <thead className="sticky top-0 z-10 bg-surface-raised">
            <tr>
              <th className="whitespace-nowrap border-b border-border px-4 py-3 font-medium text-text-faint">
                Row
              </th>
              <th className="whitespace-nowrap border-b border-l border-border px-4 py-3 font-medium text-text-muted">
                Reason
              </th>
              <th className="border-b border-l border-border px-4 py-3 font-medium text-text-muted">
                Raw data
              </th>
            </tr>
          </thead>
          <tbody>
            {records.map((rec) => (
              <tr key={rec.rowIndex} className="odd:bg-transparent even:bg-surface/60 align-top">
                <td className="whitespace-nowrap border-b border-border px-4 py-2.5 text-text-faint">
                  {rec.rowIndex + 1}
                </td>
                <td className="whitespace-nowrap border-b border-l border-border px-4 py-2.5 text-error">
                  {rec.reason}
                </td>
                <td className="border-b border-l border-border px-4 py-2.5 text-text-muted">
                  {Object.entries(rec.raw)
                    .filter(([, v]) => v)
                    .slice(0, 4)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(" · ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
      <p className="text-sm text-text-muted">{message}</p>
    </div>
  );
}

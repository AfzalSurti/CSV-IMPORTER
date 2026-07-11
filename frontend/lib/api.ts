import type { ExtractResponse, RawCsvRow } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface ExtractCallbacks {
  onProgress?: (batchIndex: number, totalBatches: number) => void;
  onDone?: (result: ExtractResponse) => void;
  onError?: (message: string) => void;
}

/**
 * Calls POST /api/extract on the backend and streams Server-Sent Events
 * back to the UI so the user sees live batch progress instead of a single
 * opaque loading spinner.
 */
export async function extractCsv(
  filename: string,
  rows: RawCsvRow[],
  callbacks: ExtractCallbacks
): Promise<void> {
  const res = await fetch(`${API_URL}/api/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, rows }),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    callbacks.onError?.(text || `Request failed with status ${res.status}`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  // Minimal SSE parser: events are separated by a blank line, each event
  // has "event: <name>" and "data: <json>" lines.
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() || "";

    for (const chunk of chunks) {
      const eventLine = chunk.split("\n").find((l) => l.startsWith("event:"));
      const dataLine = chunk.split("\n").find((l) => l.startsWith("data:"));
      if (!eventLine || !dataLine) continue;

      const eventName = eventLine.replace("event:", "").trim();
      const json = JSON.parse(dataLine.replace("data:", "").trim());

      if (eventName === "progress") {
        callbacks.onProgress?.(json.batchIndex, json.totalBatches);
      } else if (eventName === "done") {
        callbacks.onDone?.(json as ExtractResponse);
      } else if (eventName === "error") {
        callbacks.onError?.(json.message || "Extraction failed");
      }
    }
  }
}

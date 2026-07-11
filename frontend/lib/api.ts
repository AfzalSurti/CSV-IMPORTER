import type { ExtractResponse, RawCsvRow } from "./types";

// Normalize API URL: remove trailing slashes so joining paths below can't produce
// URLs like `https://host//api/extract-file` which some hosts reject.
const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/+$/g, "");

export interface ExtractCallbacks {
  onProgress?: (batchIndex: number, totalBatches: number) => void;
  onDone?: (result: ExtractResponse) => void;
  onError?: (message: string) => void;
}

async function handleSseResponse(res: Response, callbacks: ExtractCallbacks): Promise<void> {
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    const url = (res as any)?.url || `${API_URL}/api/extract`;
    callbacks.onError?.(text || `Request to ${url} failed with status ${res.status} ${res.statusText}`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

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

  await handleSseResponse(res, callbacks);
}

export async function extractCsvFile(
  filename: string,
  csvFile: File,
  callbacks: ExtractCallbacks
): Promise<void> {
  const form = new FormData();
  form.append("file", csvFile);
  if (filename) form.append("filename", filename);

  const res = await fetch(`${API_URL}/api/extract-file`, {
    method: "POST",
    body: form,
  });

  await handleSseResponse(res, callbacks);
}

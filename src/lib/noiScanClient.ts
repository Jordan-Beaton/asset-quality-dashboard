import { supabase } from "./supabase";
import { addColumnChoicePrefix, reviewCandidatesForColumn, sameColumnLabel, type GridResult, type ReviewCandidate } from "./noiColumnGrid";

const STORAGE_BUCKET = "project-documents";

// The scan endpoint always answers with JSON, but a host timeout, size limit or
// expired session answers with an HTML page. Turn that into a readable message.
export async function readScanJson(response: Response) {
  const raw = await response.text();
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    let redirectedTo = "";
    try {
      redirectedTo = response.redirected ? new URL(response.url).pathname : "";
    } catch {
      redirectedTo = "";
    }
    const detail = `Technical detail: HTTP ${response.status}${redirectedTo ? `, redirected to ${redirectedTo}` : ""}, ${response.headers.get("content-type") || "unknown content type"}.`;
    if (redirectedTo.includes("/login")) throw new Error(`Your session has expired. Refresh the page, sign in again, and retry the scan. ${detail}`);
    if (response.status === 504 || response.status === 408) throw new Error(`The server stopped this part of the scan because it took too long. Please retry. ${detail}`);
    if (response.status === 413) throw new Error(`This ITP is too large to send for scanning in one go. Split it into smaller files and retry. ${detail}`);
    throw new Error(`The server returned an unexpected response instead of scan results. Please retry; if it keeps happening, send this message to an IMS admin. ${detail}`);
  }
}

export async function postScan(form: FormData) {
  const response = await fetch("/api/projects/noi-extract", { method: "POST", body: form });
  const result = await readScanJson(response);
  if (!response.ok) {
    const detail = result.detail ? ` Server detail: ${String(result.detail)}` : "";
    throw new Error(`${String(result.error || "The ITP could not be scanned.")}${detail}`);
  }
  return result;
}

export type ReviewScanResult = {
  status: "ready" | "needs-column" | "no-table" | "scanned" | "error";
  columnLabel?: string;
  how?: "Remembered" | "Suggested";
  points: ReviewCandidate[];
  note?: string;
};

// Reads one stored ITP and returns its review (R) and approval (A) points from the Enshore column that is
// already known: the one remembered from an earlier scan, or the one the scanner suggests. It never guesses,
// and never sends pages to the visual reader, so a scanned ITP is reported instead of read.
export async function findReviewPoints(projectKey: string, filePath: string, supplierName: string): Promise<ReviewScanResult> {
  try {
    const form = new FormData();
    form.append("filePath", filePath);
    form.append("supplierName", supplierName);
    form.append("phase", "grid");
    const digital = await postScan(form);
    const grid = (digital.grid as GridResult | null) || null;
    const scannedPages = ((digital.scannedPages as number[]) || []).length;
    const unreadPages = ((digital.unreadPages as number[]) || []).length;
    if (!grid || !grid.columns.length) {
      return { status: scannedPages ? "scanned" : "no-table", points: [], note: scannedPages ? "Scanned pages need the visual reader, so scan this ITP from the NOI Tracker." : "No inspection columns could be read." };
    }

    let column = undefined as GridResult["columns"][number] | undefined;
    let how: "Remembered" | "Suggested" | undefined;
    const stored = await supabase.storage.from(STORAGE_BUCKET).download(`${projectKey}/extraction-mappings/${addColumnChoicePrefix(grid.fingerprint)}.json`);
    if (!stored.error) {
      try {
        const label = String((JSON.parse(await stored.data.text()) as { label?: string }).label || "");
        column = label ? grid.columns.find((entry) => sameColumnLabel(entry.label, label)) : undefined;
        if (column) how = "Remembered";
      } catch {
        column = undefined;
      }
    }
    if (!column) {
      column = grid.columns.find((entry) => entry.suggested);
      if (column) how = "Suggested";
    }
    if (!column) return { status: "needs-column", points: [], note: "Choose this ITP's Enshore column once in the NOI Tracker." };

    const notes = [
      unreadPages ? `${unreadPages} page${unreadPages === 1 ? "" : "s"} could not be read from the text` : "",
      scannedPages ? `${scannedPages} scanned page${scannedPages === 1 ? "" : "s"} skipped` : "",
    ].filter(Boolean).join("; ");
    return { status: "ready", columnLabel: column.label, how, points: reviewCandidatesForColumn(grid, column.id), note: notes || undefined };
  } catch (error) {
    return { status: "error", points: [], note: error instanceof Error ? error.message : "The ITP could not be read." };
  }
}

// An Inspection Record can cover several NOIs from one project. They are stored together in the existing
// `noi_number` text column, separated by commas ("004, 005, 006"), so a record with a single NOI is unchanged.

export function splitNoiList(value: string | null | undefined): string[] {
  return String(value || "")
    .split(/[,;]+/)
    .map((part) => part.trim().replace(/^NOI-?/i, ""))
    .filter(Boolean);
}

export function joinNoiList(values: string[]): string {
  return values.join(", ");
}

// "004, 005" -> "NOI-004, NOI-005"
export function formatNoiRefs(value: string | null | undefined): string {
  return splitNoiList(value).map((n) => `NOI-${n}`).join(", ");
}

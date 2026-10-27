import { normaliseCode } from "./noiColumnGrid";

// Review points are the R (review) and A (approval) marks in the Enshore column of an ITP.
// Shared by the scanner, the tracker page, the server routes and the reports.

export type ReviewStatus = "Pending" | "Accepted" | "Failed";

export type ReviewPoint = {
  id: string;
  project_key: string;
  itp_id: string;
  revision_id: string;
  section_number: string;
  activity_description: string;
  code: string;
  status: ReviewStatus;
  reviewer: string | null;
  target_date: string | null;
  decided_by: string | null;
  decided_by_email: string | null;
  decided_at: string | null;
  decision_note: string | null;
  source_location: string | null;
  created_at: string;
};

export type ReviewEvent = {
  id: string;
  point_id: string;
  event_type: "added" | "assigned" | "accepted" | "failed" | "reopened";
  actor_name: string | null;
  detail: string | null;
  created_at: string;
};

export type ReviewCandidate = {
  sectionNumber: string;
  activityDescription: string;
  code: string;
  sourceLocation: string;
};

// R, R/A, A, A/V and M/R are review points. Anything with W or H is a witness / hold point (it
// belongs to the NOI Tracker), M on its own is not tracked, and N/A means "not applicable".
export function reviewCodeOf(raw: string): string | null {
  const code = normaliseCode(String(raw || ""));
  if (!/^[A-Z](?:\/[A-Z])*$/.test(code)) return null;
  const parts = code.split("/");
  if (parts.includes("W") || parts.includes("H") || parts.includes("N")) return null;
  return parts.includes("R") || parts.includes("A") ? code : null;
}

export function isReviewCode(raw: string) {
  return reviewCodeOf(raw) !== null;
}

// Target dates are plain dates (yyyy-mm-dd); compare by calendar day in the user's own timezone.
export function todayIso(now = new Date()) {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function daysUntil(isoDate: string, today = todayIso()) {
  const a = new Date(`${isoDate}T00:00:00`).getTime();
  const b = new Date(`${today}T00:00:00`).getTime();
  return Math.round((a - b) / 86400000);
}

export function isPastTarget(point: Pick<ReviewPoint, "status" | "target_date">, today = todayIso()) {
  return point.status !== "Accepted" && Boolean(point.target_date) && daysUntil(point.target_date as string, today) < 0;
}

export function formatDay(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value.length > 10 ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDayTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/London" })} ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" })}`;
}

// "Accepted by Louise Harvey on 27/10/2026"
export function signOffText(point: Pick<ReviewPoint, "status" | "decided_by" | "decided_at">) {
  if (point.status === "Pending") return "";
  return `${point.status} by ${point.decided_by || "unknown"} on ${formatDay(point.decided_at)}`;
}

// Shared rules for the ITP stage gate (safe to import from both the browser and the server).
//
// One gate record lives on each ITP revision:
//   Awaiting Review   Gate 1, the reviewer decides
//   Awaiting Approval Gate 2, the approver decides
//   With Supplier     comments issued or rejected, waiting for a new revision
//   Approved          the controlled revision

export type WorkflowState = "Awaiting Review" | "Awaiting Approval" | "With Supplier" | "Approved";

export const WORKFLOW_STATES: WorkflowState[] = ["With Supplier", "Awaiting Review", "Awaiting Approval", "Approved"];

export const GATE_DAYS = 3;

export type ItpPerson = { name: string; email: string };

export type WorkflowRevision = {
  workflow_state: WorkflowState;
  reviewer_name: string | null;
  reviewer_email: string | null;
  approver_name: string | null;
  approver_email: string | null;
  notify_list: ItpPerson[] | null;
  uploader_name: string | null;
  uploader_email: string | null;
  gate_opened_at: string | null;
  gate_due_date: string | null;
  reviewed_at: string | null;
  reviewed_by_name: string | null;
  review_outcome: string | null;
  approved_at: string | null;
  approved_by_name: string | null;
  approval_outcome: string | null;
  legacy_approved: boolean;
  due_reminder_sent: boolean;
  overdue_reminder_count: number;
  last_reminder_on: string | null;
};

export type ItpActivity = {
  id: string;
  itp_id: string;
  revision_id: string | null;
  kind: string;
  actor_name: string | null;
  actor_email: string | null;
  summary: string;
  detail: string | null;
  created_at: string;
};

export type ItpComment = {
  id: string;
  itp_id: string;
  revision_id: string;
  kind: "Review note" | "Approval note" | "Supplier comment" | "General";
  ref: string | null;
  body: string;
  author_name: string | null;
  author_email: string | null;
  status: "Open" | "Closed" | null;
  closed_by_name: string | null;
  closed_at: string | null;
  created_at: string;
};

export const STATE_LABEL: Record<WorkflowState, string> = {
  "Awaiting Review": "Awaiting review",
  "Awaiting Approval": "Awaiting approval",
  "With Supplier": "With supplier",
  Approved: "Approved",
};

export const STATE_HINT: Record<WorkflowState, string> = {
  "Awaiting Review": "Gate 1",
  "Awaiting Approval": "Gate 2",
  "With Supplier": "Waiting for a new revision",
  Approved: "Controlled revision",
};

// The older register fields that the project dashboards and Management Review still read.
export function masterFieldsFor(state: WorkflowState): { overall_stage: string; overall_status: string; next_action: string | null } {
  switch (state) {
    case "Awaiting Review":
      return { overall_stage: "Enshore Review", overall_status: "Pending Review", next_action: "Complete Enshore review" };
    case "Awaiting Approval":
      return { overall_stage: "Enshore Review", overall_status: "Pending Approval", next_action: "Approval decision" };
    case "With Supplier":
      return { overall_stage: "Enshore Review", overall_status: "Comments Issued", next_action: "Await revised ITP" };
    case "Approved":
      return { overall_stage: "Enshore Approved", overall_status: "Approved", next_action: null };
  }
}

export function normalisedEmail(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

export function sameEmail(a: string | null | undefined, b: string | null | undefined) {
  return Boolean(normalisedEmail(a)) && normalisedEmail(a) === normalisedEmail(b);
}

// Today's date in London, as YYYY-MM-DD.
export function todayLondon(now: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function parseIso(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toIso(date: Date) {
  return date.toISOString().slice(0, 10);
}

// Monday to Friday only (public holidays are not excluded).
export function addWorkingDays(from: string, days: number) {
  const cursor = parseIso(from);
  let counted = 0;
  while (counted < days) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const weekday = cursor.getUTCDay();
    if (weekday !== 0 && weekday !== 6) counted += 1;
  }
  return toIso(cursor);
}

export function nextWorkingDay(from: string) {
  return addWorkingDays(from, 1);
}

export function daysBetween(fromIso: string, toIsoDate: string) {
  return Math.round((parseIso(toIsoDate).getTime() - parseIso(fromIso).getTime()) / 86_400_000);
}

export function dueDateFrom(openedOn: string) {
  return addWorkingDays(openedOn, GATE_DAYS);
}

export function holderOf(revision: Pick<WorkflowRevision, "workflow_state" | "reviewer_name" | "reviewer_email" | "approver_name" | "approver_email">): ItpPerson | null {
  if (revision.workflow_state === "Awaiting Review" && revision.reviewer_email) return { name: revision.reviewer_name || revision.reviewer_email, email: revision.reviewer_email };
  if (revision.workflow_state === "Awaiting Approval" && revision.approver_email) return { name: revision.approver_name || revision.approver_email, email: revision.approver_email };
  return null;
}

export function isGateOpen(state: WorkflowState) {
  return state === "Awaiting Review" || state === "Awaiting Approval";
}

// Whole days past the due date (0 when not late).
export function daysLate(revision: Pick<WorkflowRevision, "workflow_state" | "gate_due_date">, today = todayLondon()) {
  if (!isGateOpen(revision.workflow_state) || !revision.gate_due_date) return 0;
  return Math.max(0, daysBetween(revision.gate_due_date, today));
}

export function daysWaiting(revision: Pick<WorkflowRevision, "workflow_state" | "gate_opened_at">, today = todayLondon()) {
  if (!isGateOpen(revision.workflow_state) || !revision.gate_opened_at) return 0;
  return Math.max(0, daysBetween(revision.gate_opened_at.slice(0, 10), today));
}

export type GateStep = "done" | "active" | "returned" | "idle";

// The look of the two gates in the register and on the ITP record.
export function gateSteps(state: WorkflowState): { review: GateStep; approval: GateStep } {
  switch (state) {
    case "Approved":
      return { review: "done", approval: "done" };
    case "With Supplier":
      return { review: "returned", approval: "idle" };
    case "Awaiting Review":
      return { review: "active", approval: "idle" };
    case "Awaiting Approval":
      return { review: "done", approval: "active" };
  }
}

export function formatShortDate(value: string | null | undefined) {
  if (!value) return "";
  const date = value.length <= 10 ? new Date(`${value}T00:00:00`) : new Date(value);
  return Number.isNaN(date.valueOf()) ? "" : date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function formatLongDate(value: string | null | undefined) {
  if (!value) return "";
  const date = value.length <= 10 ? new Date(`${value}T00:00:00`) : new Date(value);
  return Number.isNaN(date.valueOf()) ? "" : date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  return `${date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" })} · ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" })}`;
}

export function initialsOf(name: string | null | undefined) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return ((parts[0][0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] || "" : "")).toUpperCase();
}

export function notifyListOf(revision: Pick<WorkflowRevision, "notify_list">): ItpPerson[] {
  return Array.isArray(revision.notify_list) ? revision.notify_list.filter((item) => item && item.email) : [];
}

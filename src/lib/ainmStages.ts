// Shared AINM stage logic, used by the AINM register (app/hse/ainm/page.tsx) and the phone notification form
// (app/hse/ainm/field/page.tsx).
//
// An AINM moves through three stages: Notification, Part 1 and Part 2. Nobody sets a stage status by hand.
// Each stage status is worked out from how much of the stage is filled in, and whether it has been issued.
//
// Stored database values do not change (no migration):
//   Not Started  -> shown as "Not Started"   (0% progress)
//   Draft        -> shown as "Ongoing"       (some progress, or 100% but not issued yet)
//   Issued       -> shown as "Issued"        (old records only; at 100% on an open record it counts as issued)
//   Complete     -> shown as "Completed"     (100% and issued)
//
// "Issued" flag: a stage counts as issued when its stored status is Issued or Complete. The Issue button stores Complete.
// Closed AINMs keep their stored statuses exactly as saved and are never locked or recomputed.

export type StageStatus = "Not Started" | "Draft" | "Issued" | "Complete";
export type OverallStatus = "Open" | "In Progress" | "Closed";
export type StageKey = "notification" | "part1" | "part2";

export type StageCheck = { label: string; ok: boolean };

type Maybe = string | null | undefined;

/** The record fields the stage checks read. Every field is optional so a partly loaded record still works. */
export type AinmStageInput = {
  title?: Maybe;
  project?: Maybe;
  location_site?: Maybe;
  event_date?: Maybe;
  event_time?: Maybe;
  event_classification?: Maybe;
  brief_event_details?: Maybe;
  injury_release_damage_details?: Maybe;
  casualty_management?: Maybe;
  site_management?: Maybe;
  initial_cause?: Maybe;
  company_in_control?: Maybe;
  timeline_entries?: unknown;
  immediate_corrective_actions?: Maybe;
  root_cause_people?: Maybe;
  root_cause_equipment?: Maybe;
  root_cause_environment?: Maybe;
  root_cause_process?: Maybe;
  part1_reviewer_name?: Maybe;
  investigation_team_members?: unknown;
  investigation_findings_people?: Maybe;
  investigation_findings_equipment?: Maybe;
  investigation_findings_environment?: Maybe;
  investigation_findings_process?: Maybe;
  reference_documents?: Maybe;
  signoff_location_name?: Maybe;
  signoff_hseq_name?: Maybe;
  notification_status?: StageStatus | string | null;
  part1_status?: StageStatus | string | null;
  part2_status?: StageStatus | string | null;
  overall_status?: OverallStatus | string | null;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function hasText(value: unknown) {
  return text(value).length > 0;
}

function rowsOf(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];
}

/** The 11 checks behind the Notification percentage and the Issue Notification button. */
export function notificationChecks(record: AinmStageInput): StageCheck[] {
  return [
    { label: "Title", ok: hasText(record.title) },
    { label: "Project", ok: hasText(record.project) },
    { label: "Location / site", ok: hasText(record.location_site) },
    { label: "Date of event", ok: hasText(record.event_date) },
    { label: "Time of event", ok: hasText(record.event_time) },
    { label: "Classification", ok: hasText(record.event_classification) },
    { label: "Brief details of the event", ok: hasText(record.brief_event_details) },
    { label: "Injury / release / damage details", ok: hasText(record.injury_release_damage_details) },
    { label: "Casualty management", ok: hasText(record.casualty_management) },
    { label: "Site / location management", ok: hasText(record.site_management) },
    { label: "Cause identification", ok: hasText(record.initial_cause) },
  ];
}

export function part1Checks(record: AinmStageInput): StageCheck[] {
  return [
    { label: "Company in control", ok: hasText(record.company_in_control) },
    { label: "Timeline entry", ok: rowsOf(record.timeline_entries).some((row) => hasText(row.datetime) || hasText(row.description)) },
    { label: "Immediate containment action", ok: hasText(record.immediate_corrective_actions) },
    { label: "Root cause: people", ok: hasText(record.root_cause_people) },
    { label: "Root cause: equipment", ok: hasText(record.root_cause_equipment) },
    { label: "Root cause: environment", ok: hasText(record.root_cause_environment) },
    { label: "Root cause: process", ok: hasText(record.root_cause_process) },
    { label: "Part 1 reviewer", ok: hasText(record.part1_reviewer_name) },
  ];
}

export function part2Checks(record: AinmStageInput, linkedActionCount: number): StageCheck[] {
  return [
    {
      label: "Investigation team member",
      ok: rowsOf(record.investigation_team_members).some((row) => hasText(row.name) || hasText(row.company) || hasText(row.position) || hasText(row.role)),
    },
    { label: "Findings: people", ok: hasText(record.investigation_findings_people) },
    { label: "Findings: equipment", ok: hasText(record.investigation_findings_equipment) },
    { label: "Findings: environment", ok: hasText(record.investigation_findings_environment) },
    { label: "Findings: process", ok: hasText(record.investigation_findings_process) },
    { label: "Reference document", ok: hasText(record.reference_documents) },
    { label: "Corrective action", ok: linkedActionCount > 0 },
    { label: "Location sign-off", ok: hasText(record.signoff_location_name) },
    { label: "HSEQ sign-off", ok: hasText(record.signoff_hseq_name) },
  ];
}

/** Whole-number percentage of checks that pass. 0 only when none pass, 100 only when all pass. */
export function checksPercent(checks: StageCheck[]) {
  if (checks.length === 0) return 100;
  const ok = checks.filter((check) => check.ok).length;
  if (ok === 0) return 0;
  if (ok === checks.length) return 100;
  return Math.min(99, Math.max(1, Math.round((ok / checks.length) * 100)));
}

/** Words people see. Draft is shown as Ongoing and Complete as Completed. Stored values are unchanged. */
export function stageLabel(status: string | null | undefined) {
  const value = text(status);
  if (value === "Draft") return "Ongoing";
  if (value === "Complete") return "Completed";
  if (value === "Issued") return "Issued";
  return value || "Not Started";
}

/** The stage filter and dashboard compare stored values, so this lists them with their display labels. */
export const stageFilterOptions: Array<{ value: StageStatus; label: string }> = [
  { value: "Not Started", label: "Not Started" },
  { value: "Draft", label: "Ongoing" },
  { value: "Issued", label: "Issued" },
  { value: "Complete", label: "Completed" },
];

export function isStageStatus(value: unknown): value is StageStatus {
  return value === "Not Started" || value === "Draft" || value === "Issued" || value === "Complete";
}

/** A stage counts as issued when its stored status is Issued or Complete. */
export function isIssuedStatus(status: string | null | undefined) {
  return status === "Issued" || status === "Complete";
}

/** Stored value for an open stage: Not Started at 0%, Complete at 100% and issued, otherwise Draft (shown as Ongoing). */
export function computeStageStatus(pct: number, issued: boolean): StageStatus {
  if (pct <= 0) return "Not Started";
  if (pct >= 100 && issued) return "Complete";
  return "Draft";
}

export type StageState = {
  key: StageKey;
  checks: StageCheck[];
  pct: number;
  allOk: boolean;
  issued: boolean;
  /** The stored value to save: Not Started, Draft or Complete (open records), or the saved value (closed records). */
  status: StageStatus;
  /** The word people see. */
  label: string;
  locked: boolean;
  /** True at 100% when the stage is not Completed yet: the Issue button shows. */
  canIssue: boolean;
  missing: string[];
};

export type AinmStages = {
  closed: boolean;
  notification: StageState;
  part1: StageState;
  part2: StageState;
  overall: OverallStatus;
};

function storedStatus(value: unknown): StageStatus {
  return isStageStatus(value) ? value : "Not Started";
}

export const LOCKED_NOTE: Record<"part1" | "part2", string> = {
  part1: "Complete and issue the Notification before Part 1 can be started.",
  part2: "Complete and issue Part 1 before Part 2 can be started.",
};

export const LOCKED_SUBLINE: Record<"part1" | "part2", string> = {
  part1: "Locked: complete the Notification first",
  part2: "Locked: complete Part 1 first",
};

/**
 * Works out the stage statuses, locks and overall status for one AINM.
 * linkedActionCount is the number of linked corrective actions (central actions plus tracker actions); only Part 2 reads it.
 * A record whose stored Overall Status is Closed keeps its stored statuses, is never locked and nothing is recomputed.
 */
export function computeAinmStages(record: AinmStageInput, linkedActionCount: number): AinmStages {
  const closed = record.overall_status === "Closed";
  const build = (key: StageKey, checks: StageCheck[], stored: unknown, locked: boolean): StageState => {
    const pct = checksPercent(checks);
    const allOk = checks.every((check) => check.ok);
    const issued = isIssuedStatus(typeof stored === "string" ? stored : "");
    const status = closed ? storedStatus(stored) : computeStageStatus(pct, issued);
    return {
      key,
      checks,
      pct,
      allOk,
      issued,
      status,
      label: stageLabel(status),
      locked: closed ? false : locked,
      canIssue: !closed && !locked && allOk && status !== "Complete",
      missing: checks.filter((check) => !check.ok).map((check) => check.label),
    };
  };

  const notification = build("notification", notificationChecks(record), record.notification_status, false);
  const part1 = build("part1", part1Checks(record), record.part1_status, notification.status !== "Complete");
  const part2 = build("part2", part2Checks(record, linkedActionCount), record.part2_status, part1.status !== "Complete");
  const overall: OverallStatus = closed
    ? "Closed"
    : notification.status === "Not Started" && part1.status === "Not Started" && part2.status === "Not Started"
    ? "Open"
    : "In Progress";
  return { closed, notification, part1, part2, overall };
}

/**
 * Returns the record with its stage statuses and Overall Status replaced by the computed stored values, ready to save.
 * A Closed record is returned unchanged. Pass closeNow when the Close AINM button is saving: the stages are computed
 * from the fields at that moment and the Overall Status is then set to Closed.
 */
export function withComputedStatuses<T extends AinmStageInput>(record: T, linkedActionCount: number, options?: { closeNow?: boolean }): T {
  if (record.overall_status === "Closed" && !options?.closeNow) return record;
  const open = { ...record, overall_status: "Open" } as T;
  const stages = computeAinmStages(open, linkedActionCount);
  return {
    ...record,
    notification_status: stages.notification.status,
    part1_status: stages.part1.status,
    part2_status: stages.part2.status,
    overall_status: options?.closeNow ? "Closed" : stages.overall,
  };
}

/** Text for the Issue button tooltip: what is still missing before the stage can be issued. */
export function issueTooltip(stage: StageState, stageName: string) {
  if (stage.locked) return `${stageName} is locked until the previous stage is completed.`;
  if (stage.canIssue) return `Issue ${stageName} and mark it Completed.`;
  if (stage.status === "Complete") return `${stageName} is already completed.`;
  return `Still missing: ${stage.missing.join(", ")}.`;
}

/** Notification only, for the phone form. Reads the notification fields and the stored notification status. */
export function computeNotificationState(record: AinmStageInput) {
  return computeAinmStages(record, 0).notification;
}

/** Overall Status for the phone form: Open while every stage is Not Started, otherwise In Progress. Closed stays Closed. */
export function computeOverallStatus(notificationStatus: StageStatus, part1: unknown, part2: unknown, current: unknown): OverallStatus {
  if (current === "Closed") return "Closed";
  return notificationStatus === "Not Started" && storedStatus(part1) === "Not Started" && storedStatus(part2) === "Not Started" ? "Open" : "In Progress";
}

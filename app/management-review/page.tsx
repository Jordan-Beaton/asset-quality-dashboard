"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ImsButton, ImsTabs, ImsTopMetaRow } from "../../src/components/ImsPrimitives";
import { ModuleSectionHeader } from "../../src/components/ModuleSectionHeader";
import { QualityPageHero } from "../../src/components/QualityPageHero";
import { useImsPermissions } from "../../src/components/ImsPermissions";
import { imsColours, imsPanelStyle, imsShadows } from "../../src/components/imsTheme";
import { supabase } from "../../src/lib/supabase";

export const dynamic = "force-dynamic";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tone = "green" | "amber" | "red" | "slate";
type MrView = "overview" | "areas";

type ChartDatum = {
  name: string;
  value: number;
  fill?: string;
  href?: string;
};

type AreaMetric = {
  label: string;
  value: number | null;
  href?: string;
  tone?: Tone;
};

type AreaSummary = {
  key: string;
  moduleKey: string;
  title: string;
  subtitle: string;
  href: string;
  tone: Tone;
  attentionCount: number;
  headline: AreaMetric[];
  chart: ChartDatum[];
  detail: AreaMetric[];
};

const toneColour: Record<Tone, string> = {
  green: imsColours.brand,
  amber: imsColours.warning,
  red: imsColours.dangerBright,
  slate: imsColours.slate,
};

const toneLabel: Record<Tone, string> = {
  green: "On Track",
  amber: "Needs Attention",
  red: "Critical",
  slate: "No Data",
};

// ── Small helpers ─────────────────────────────────────────────────────────────

function normalise(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function getDaysFromToday(value: string | null | undefined) {
  if (!value) return null;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function isOverdueDate(value: string | null | undefined) {
  const days = getDaysFromToday(value);
  return days !== null && days < 0;
}

function isDueWithin(value: string | null | undefined, daysAhead: number) {
  const days = getDaysFromToday(value);
  return days !== null && days >= 0 && days <= daysAhead;
}

function yearOf(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.getFullYear();
}

function displayValue(value: number | null) {
  return value === null ? "N/A" : value;
}

function toneFromCounts(critical: number, attention: number): Tone {
  if (critical > 0) return "red";
  if (attention > 0) return "amber";
  return "green";
}

// Quality-owned action, matching the fixed app/quality/page.tsx isQualityAction() definition
// so this page's Quality numbers agree with the Quality dashboard rather than contradicting it.
function isQualityAction(department: string | null, source: string | null) {
  const dept = normalise(department);
  const src = normalise(source);
  const qualityWorkflowSources = new Set(["ncr/capa", "audit finding", "moc"]);
  if (dept === "quality") return true;
  if (dept === "hseq") return qualityWorkflowSources.has(src);
  return false;
}

function isHseAction(department: string | null) {
  return normalise(department) === "hse";
}

function getAinmType(record: { ainm_number: string | null; event_classification: string | null }) {
  const number = (record.ainm_number || "").toUpperCase();
  if (number.startsWith("AR")) return "Accident";
  if (number.startsWith("IR")) return "Incident";
  return normalise(record.event_classification).includes("accident") ? "Accident" : "Incident";
}

function effectiveCalendarDate(row: { due_date: string | null; next_due_date: string | null }) {
  return row.next_due_date || row.due_date;
}

// ── Row shapes ────────────────────────────────────────────────────────────────

type NcrRow = { status: string | null; created_at: string | null };
type FindingRow = { status: string | null };
type MocRow = { status: string | null };
type ActionRow = { status: string | null; due_date: string | null; department: string | null; source: string | null };
type DocumentRow = { status: string | null; workflow_status: string | null; next_review_date: string | null };
type AinmRow = { overall_status: string | null; event_classification: string | null; ainm_number: string | null; event_date: string | null };
type ExternalAinmRow = { status: string | null; event_date: string | null };
type HseInspectionRow = { status: string | null };
type ObservationRow = { status: string | null; risk_level: string | null };
type CalendarRow = { status: string | null; due_date: string | null; next_due_date: string | null };
type ItpRow = { project_key: string; overall_stage: string | null; overall_status: string | null; next_action: string | null; due_date: string | null };
type NoiRow = { project_key: string; status: string | null; planned_date: string | null; noi_number: string | null };
type OpenPointRow = {
  project_key: string;
  status: string;
  severity: string | null;
  source_type: string | null;
  target_closure_date: string | null;
  phase_end_date: string | null;
  taking_over_date: string | null;
  employer_extension_agreed: boolean | null;
  employer_extension_date: string | null;
  toc_inclusion_agreed: boolean | null;
  identified_date: string | null;
};
type CalibrationRow = {
  asset_id: string | null;
  calibration_date: string | null;
  calibration_due_date: string | null;
  item_status: string | null;
  file_path: string | null;
  notes: string | null;
  serial_number: string | null;
  created_at: string | null;
};
type AssetInspectionRow = { next_inspection_due: string | null };
type AssetMaintenanceRow = { next_maintenance_due: string | null };
type LessonRow = {
  report_date: string | null;
  status: string | null;
  criticality: string | null;
  repeat_group: string | null;
  action_owner: string | null;
  recommended_action: string | null;
  action_taken: string | null;
};

// Open Points closure/overdue logic reused verbatim from src/components/WaddenSeaOpenPoints.tsx
// so the number here agrees with the Wadden Sea Open Points register.
function isOpenPointClosed(point: Pick<OpenPointRow, "status">) {
  return ["Closed", "Formal Employer Close-out", "Converted to NCR"].includes(point.status);
}

function openPointEffectiveDue(point: OpenPointRow): string {
  if (point.employer_extension_agreed && point.employer_extension_date) return point.employer_extension_date;
  if (point.severity === "Minor" && point.toc_inclusion_agreed && point.target_closure_date) return point.target_closure_date;
  const contractual = point.severity === "Minor" ? point.taking_over_date : point.phase_end_date;
  return [point.target_closure_date, contractual].filter(Boolean).sort()[0] || "";
}

function isOpenPointOverdue(point: OpenPointRow) {
  if (isOpenPointClosed(point)) return false;
  const due = openPointEffectiveDue(point);
  return Boolean(due) && due < new Date().toISOString().slice(0, 10);
}

// Calibration compliance reused verbatim (3-stage pipeline) from app/assets/calibration/page.tsx
// so this figure agrees with the Calibration module rather than inventing a new one.
function calibrationItemKey(row: CalibrationRow) {
  if (row.asset_id) return `asset:${row.asset_id}`;
  const description = (row.notes || "").match(/^Item Description:\s*(.+?)(?:\n\nDate Issued:|\n\nNotes:|\n|$)/)?.[1] || "";
  return `standalone:${normalise(description)}|${normalise(row.serial_number)}`;
}

function calibrationItemStatus(value: string | null) {
  if (value === "Missing" || value === "Lost") return "Missing / Lost";
  const known = ["In Use", "Not In Use", "Damaged", "Missing / Lost", "Historic"];
  return known.includes(value || "") ? (value as string) : "In Use";
}

function getCurrentCalibrationRows(rows: CalibrationRow[]) {
  const latest = new Map<string, CalibrationRow>();
  rows.forEach((row) => {
    const key = calibrationItemKey(row);
    const rowDate = new Date(row.calibration_date || row.created_at || 0).getTime();
    const existing = latest.get(key);
    const existingDate = existing ? new Date(existing.calibration_date || existing.created_at || 0).getTime() : -Infinity;
    if (!existing || rowDate > existingDate) latest.set(key, row);
  });
  return [...latest.values()];
}

// ── Snapshot state ────────────────────────────────────────────────────────────

type SnapshotState = {
  ncrs: NcrRow[];
  findings: FindingRow[];
  mocs: MocRow[];
  actions: ActionRow[];
  documents: DocumentRow[];
  ainms: AinmRow[];
  externalAinms: ExternalAinmRow[];
  hseInspections: HseInspectionRow[];
  observations: ObservationRow[];
  calendar: CalendarRow[];
  itps: ItpRow[];
  noiPoints: NoiRow[];
  openPoints: OpenPointRow[];
  calibrations: CalibrationRow[];
  assetInspections: AssetInspectionRow[];
  assetMaintenance: AssetMaintenanceRow[];
  lessons: LessonRow[];
  errors: string[];
};

const emptySnapshot: SnapshotState = {
  ncrs: [], findings: [], mocs: [], actions: [], documents: [], ainms: [], externalAinms: [],
  hseInspections: [], observations: [], calendar: [], itps: [], noiPoints: [], openPoints: [],
  calibrations: [], assetInspections: [], assetMaintenance: [], lessons: [], errors: [],
};

const departmentOptions = [
  "Assets", "Commercial", "Crewing", "Engineering", "Finance", "Human Resources",
  "HSE", "HSEQ", "Logistics", "Marketing", "Operations", "Procurement", "Project", "Quality", "Survey",
];

async function fetchSnapshot(): Promise<SnapshotState> {
  const next: SnapshotState = { ...emptySnapshot, errors: [] };

  const results = await Promise.all([
    supabase.from("ncrs").select("status,created_at"),
    supabase.from("audit_findings").select("status"),
    supabase.from("moc_reports").select("status"),
    supabase.from("actions").select("status,due_date,department,source"),
    supabase.from("documents").select("status,workflow_status,next_review_date"),
    supabase.from("hse_ainm_records").select("overall_status,event_classification,ainm_number,event_date"),
    supabase.from("hse_external_ainm_records").select("status,event_date"),
    supabase.from("hse_inspection_records").select("status"),
    supabase.from("hse_observations").select("status,risk_level"),
    supabase.from("hse_calendar_items").select("status,due_date,next_due_date"),
    supabase.from("project_itps").select("project_key,overall_stage,overall_status,next_action,due_date"),
    supabase.from("project_noi_points").select("project_key,status,planned_date,noi_number"),
    supabase.from("project_open_points").select("project_key,status,severity,source_type,target_closure_date,phase_end_date,taking_over_date,employer_extension_agreed,employer_extension_date,toc_inclusion_agreed,identified_date"),
    supabase.from("asset_calibration_records").select("asset_id,calibration_date,calibration_due_date,item_status,file_path,notes,serial_number,created_at"),
    supabase.from("asset_inspection_records").select("next_inspection_due"),
    supabase.from("asset_maintenance_records").select("next_maintenance_due"),
    supabase.from("lessons_learned").select("report_date,status,criticality,repeat_group,action_owner,recommended_action,action_taken"),
  ] as const);

  const [
    ncrsResult, findingsResult, mocsResult, actionsResult, documentsResult,
    ainmResult, externalAinmResult, hseInspectionsResult, observationsResult, calendarResult,
    itpResult, noiResult, openPointsResult, calibrationResult, assetInspectionResult, assetMaintenanceResult, lessonsResult,
  ] = results;

  const assign = <T,>(result: { data: T[] | null; error: { message: string } | null }, label: string, target: (rows: T[]) => void) => {
    if (result.error) {
      next.errors.push(`${label} unavailable: ${result.error.message}`);
    } else {
      target(result.data || []);
    }
  };

  assign(ncrsResult, "NCRs", (rows) => { next.ncrs = rows; });
  assign(findingsResult, "Audit findings", (rows) => { next.findings = rows; });
  assign(mocsResult, "MOCs", (rows) => { next.mocs = rows; });
  assign(actionsResult, "Actions", (rows) => { next.actions = rows; });
  assign(documentsResult, "Documents", (rows) => { next.documents = rows; });
  assign(ainmResult, "AINMs", (rows) => { next.ainms = rows; });
  assign(externalAinmResult, "External AINMs", (rows) => { next.externalAinms = rows; });
  assign(hseInspectionsResult, "HSE inspections", (rows) => { next.hseInspections = rows; });
  assign(observationsResult, "HSE observations", (rows) => { next.observations = rows; });
  assign(calendarResult, "HSE calendar", (rows) => { next.calendar = rows; });
  assign(itpResult, "Project ITPs", (rows) => { next.itps = rows; });
  assign(noiResult, "Project NOI points", (rows) => { next.noiPoints = rows; });
  assign(openPointsResult, "Project Open Points", (rows) => { next.openPoints = rows; });
  assign(calibrationResult, "Asset calibration", (rows) => { next.calibrations = rows; });
  assign(assetInspectionResult, "Asset inspections", (rows) => { next.assetInspections = rows; });
  assign(assetMaintenanceResult, "Asset maintenance", (rows) => { next.assetMaintenance = rows; });
  assign(lessonsResult, "Lessons Learnt", (rows) => { next.lessons = rows; });

  return next;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ManagementReviewPage() {
  const permissions = useImsPermissions();
  const [snapshot, setSnapshot] = useState<SnapshotState>(emptySnapshot);
  const [message, setMessage] = useState("Loading management review...");
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<MrView>("overview");
  const currentYear = new Date().getFullYear();
  const [period, setPeriod] = useState<string>(String(currentYear));

  async function loadSnapshot() {
    setIsLoading(true);
    const data = await fetchSnapshot();
    setSnapshot(data);
    setLastRefreshed(new Date().toLocaleString("en-GB"));
    setMessage(data.errors.length ? `Snapshot loaded with ${data.errors.length} source(s) unavailable.` : "Live snapshot loaded.");
    setIsLoading(false);
  }

  useEffect(() => {
    void loadSnapshot();
  }, []);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(currentYear);
    snapshot.ncrs.forEach((row) => { const y = yearOf(row.created_at); if (y) years.add(y); });
    snapshot.lessons.forEach((row) => { const y = yearOf(row.report_date); if (y) years.add(y); });
    snapshot.ainms.forEach((row) => { const y = yearOf(row.event_date); if (y) years.add(y); });
    return [...years].sort((a, b) => b - a);
  }, [currentYear, snapshot.ncrs, snapshot.lessons, snapshot.ainms]);

  const periodLabel = period === "all" ? "all time" : period;
  const matchesPeriod = (value: string | null) => period === "all" || yearOf(value) === Number(period);

  // ── Quality ───────────────────────────────────────────────────────────────
  const quality = useMemo(() => {
    const openNcrs = snapshot.ncrs.filter((r) => normalise(r.status) !== "closed").length;
    const ncrsRaised = snapshot.ncrs.filter((r) => matchesPeriod(r.created_at)).length;
    const openFindings = snapshot.findings.filter((r) => normalise(r.status) !== "closed").length;
    const openMocs = snapshot.mocs.filter((r) => normalise(r.status) !== "closed").length;
    const qualityActions = snapshot.actions.filter((r) => isQualityAction(r.department, r.source));
    const openQualityActions = qualityActions.filter((r) => normalise(r.status) !== "closed" && normalise(r.status) !== "complete").length;
    const overdueQualityActions = qualityActions.filter((r) => normalise(r.status) !== "closed" && normalise(r.status) !== "complete" && isOverdueDate(r.due_date)).length;

    const attentionCount = openNcrs + openFindings + overdueQualityActions;
    const tone = toneFromCounts(overdueQualityActions, openNcrs + openFindings + openMocs);

    const summary: AreaSummary = {
      key: "quality", moduleKey: "quality", title: "Quality",
      subtitle: "NCRs, audit findings, MOCs, and Quality-owned actions.",
      href: "/quality", tone, attentionCount,
      headline: [
        { label: "Open NCRs", value: openNcrs, href: "/ncr-capa?view=register&year=All+Years", tone: healthToneOf(openNcrs) },
        { label: "Open Findings", value: openFindings, href: "/audits?view=open-findings", tone: healthToneOf(openFindings) },
        { label: "Overdue Actions", value: overdueQualityActions, href: "/actions?view=register&department=Quality&overdue=1", tone: healthToneOf(overdueQualityActions) },
      ],
      chart: [
        { name: "Open NCRs", value: openNcrs, fill: toneColour.red, href: "/ncr-capa?view=register&year=All+Years" },
        { name: "Open Findings", value: openFindings, fill: toneColour.amber, href: "/audits?view=open-findings" },
        { name: "Open MOCs", value: openMocs, fill: toneColour.green, href: "/moc?status=Active" },
        { name: "Overdue Actions", value: overdueQualityActions, fill: toneColour.slate, href: "/actions?view=register&department=Quality&overdue=1" },
      ],
      detail: [
        { label: `NCRs raised (${periodLabel})`, value: ncrsRaised },
        { label: "Open MOCs", value: openMocs, href: "/moc?status=Active" },
        { label: "Open Quality Actions", value: openQualityActions, href: "/actions?view=register&department=Quality" },
        { label: "Overdue Quality Actions", value: overdueQualityActions, href: "/actions?view=register&department=Quality&overdue=1" },
      ],
    };
    return summary;
  }, [snapshot.ncrs, snapshot.findings, snapshot.mocs, snapshot.actions, period, periodLabel]);

  // ── HSE ───────────────────────────────────────────────────────────────────
  const hse = useMemo(() => {
    const openInternalAinms = snapshot.ainms.filter((r) => normalise(r.overall_status) !== "closed").length;
    const openExternalAinms = snapshot.externalAinms.filter((r) => normalise(r.status) !== "closed").length;
    const openAinms = openInternalAinms + openExternalAinms;
    const periodAinms = snapshot.ainms.filter((r) => matchesPeriod(r.event_date));
    const incidents = periodAinms.filter((r) => getAinmType(r) === "Incident").length;
    const accidents = periodAinms.filter((r) => getAinmType(r) === "Accident").length;
    const openInspections = snapshot.hseInspections.filter((r) => normalise(r.status) !== "closed" && normalise(r.status) !== "complete").length;
    const openObservations = snapshot.observations.filter((r) => normalise(r.status) !== "closed").length;
    const highRiskObservations = snapshot.observations.filter((r) => normalise(r.status) !== "closed" && ["high", "immediate attention"].includes(normalise(r.risk_level))).length;
    const hseActions = snapshot.actions.filter((r) => isHseAction(r.department));
    const overdueHseActions = hseActions.filter((r) => normalise(r.status) !== "closed" && normalise(r.status) !== "complete" && isOverdueDate(r.due_date)).length;
    const calendarOverdue = snapshot.calendar.filter((r) => normalise(r.status) !== "closed" && normalise(r.status) !== "complete" && isOverdueDate(effectiveCalendarDate(r))).length;

    const attentionCount = highRiskObservations + overdueHseActions + calendarOverdue;
    const tone = toneFromCounts(highRiskObservations, openAinms + overdueHseActions + calendarOverdue);

    const summary: AreaSummary = {
      key: "hse", moduleKey: "hse", title: "HSE",
      subtitle: "AINM, inspections, observations, calendar, and HSE actions.",
      href: "/hse", tone, attentionCount,
      headline: [
        { label: "Open AINMs", value: openAinms, href: "/hse/ainm", tone: healthToneOf(openAinms) },
        { label: "High Risk Observations", value: highRiskObservations, href: "/hse/observations", tone: healthToneOf(highRiskObservations) },
        { label: "Overdue Actions", value: overdueHseActions, href: "/actions?view=register&department=HSE&overdue=1", tone: healthToneOf(overdueHseActions) },
      ],
      chart: [
        { name: "Open AINMs", value: openAinms, fill: toneColour.red, href: "/hse/ainm" },
        { name: "Open Inspections", value: openInspections, fill: toneColour.green, href: "/hse/inspections?view=register" },
        { name: "Open Observations", value: openObservations, fill: toneColour.amber, href: "/hse/observations" },
        { name: "Overdue Actions", value: overdueHseActions, fill: toneColour.slate, href: "/actions?view=register&department=HSE&overdue=1" },
        { name: "Calendar Overdue", value: calendarOverdue, fill: imsColours.dangerBright, href: "/hse/calendar" },
      ],
      detail: [
        { label: `Incidents (${periodLabel})`, value: incidents, href: "/hse/ainm" },
        { label: `Accidents (${periodLabel})`, value: accidents, href: "/hse/ainm" },
        { label: "Calendar Items Overdue", value: calendarOverdue, href: "/hse/calendar" },
        { label: "Open HSE Actions", value: hseActions.filter((r) => normalise(r.status) !== "closed" && normalise(r.status) !== "complete").length, href: "/actions?view=register&department=HSE" },
      ],
    };
    return summary;
  }, [snapshot.ainms, snapshot.externalAinms, snapshot.hseInspections, snapshot.observations, snapshot.calendar, snapshot.actions, period, periodLabel]);

  // ── Document Control ──────────────────────────────────────────────────────
  const documentsArea = useMemo(() => {
    const activeRows = snapshot.documents.filter((r) => normalise(r.status) !== "closed" && normalise(r.status) !== "superseded" && normalise(r.status) !== "obsolete");
    const overdueReviews = activeRows.filter((r) => isOverdueDate(r.next_review_date)).length;
    const dueSoon = activeRows.filter((r) => isDueWithin(r.next_review_date, 30)).length;
    const pendingWorkflow = activeRows.filter((r) => ["pending review", "reviewed", "pending approval", "rejected"].includes(normalise(r.workflow_status))).length;
    const live = snapshot.documents.filter((r) => normalise(r.status) === "live" || normalise(r.workflow_status) === "approved").length;

    const attentionCount = overdueReviews;
    const tone = toneFromCounts(overdueReviews, dueSoon + pendingWorkflow);

    const summary: AreaSummary = {
      key: "documents", moduleKey: "documents", title: "Document Control",
      subtitle: "Controlled-document health, reviews, and approval workflow.",
      href: "/documents", tone, attentionCount,
      headline: [
        { label: "Reviews Overdue", value: overdueReviews, href: "/documents?review=Overdue", tone: healthToneOf(overdueReviews) },
        { label: "Due Soon", value: dueSoon, href: "/documents?review=Due%20soon", tone: healthToneOf(dueSoon) },
        { label: "Pending Workflow", value: pendingWorkflow, href: "/documents?approval=Workflow", tone: healthToneOf(pendingWorkflow) },
      ],
      chart: [
        { name: "Live", value: live, fill: toneColour.green, href: "/documents?status=Live" },
        { name: "Overdue Reviews", value: overdueReviews, fill: toneColour.red, href: "/documents?review=Overdue" },
        { name: "Due Soon", value: dueSoon, fill: toneColour.amber, href: "/documents?review=Due%20soon" },
        { name: "Pending Workflow", value: pendingWorkflow, fill: toneColour.slate, href: "/documents?approval=Workflow" },
      ],
      detail: [
        { label: "Total Documents", value: snapshot.documents.length, href: "/documents" },
        { label: "Live Documents", value: live, href: "/documents?status=Live" },
        { label: "Reviews Overdue", value: overdueReviews, href: "/documents?review=Overdue" },
        { label: "Pending Workflow", value: pendingWorkflow, href: "/documents?approval=Workflow" },
      ],
    };
    return summary;
  }, [snapshot.documents]);

  // ── Project Management ────────────────────────────────────────────────────
  const projects = useMemo(() => {
    const itpAttention = snapshot.itps.filter((r) =>
      /review|comment|reject|draft/i.test(`${r.overall_stage || ""} ${r.overall_status || ""}`) || Boolean(r.next_action)
    ).length;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const horizon = new Date(today.getTime() + 56 * 86400000);
    const dateOnly = (v: string | null) => (v ? new Date(`${v}T00:00:00`) : null);
    const noiOverdue = snapshot.noiPoints.filter((p) => {
      const d = dateOnly(p.planned_date);
      return d && d < today && !/completed|cancelled/i.test(p.status || "");
    }).length;
    const noiUpcoming = snapshot.noiPoints.filter((p) => {
      const d = dateOnly(p.planned_date);
      return d && d >= today && d <= horizon && !/completed|cancelled/i.test(p.status || "");
    }).length;
    const openPointsOpen = snapshot.openPoints.filter((p) => !isOpenPointClosed(p)).length;
    const openPointsOverdue = snapshot.openPoints.filter(isOpenPointOverdue).length;
    const openPointsCritical = snapshot.openPoints.filter((p) => !isOpenPointClosed(p) && p.severity === "Critical").length;

    const attentionCount = openPointsOverdue + noiOverdue;
    const tone = toneFromCounts(openPointsCritical, itpAttention + openPointsOverdue + noiOverdue);

    const summary: AreaSummary = {
      key: "projects", moduleKey: "projects", title: "Project Delivery",
      subtitle: "ITP progress, NOI programme, and Open Points across live projects.",
      href: "/projects", tone, attentionCount,
      headline: [
        { label: "ITPs Needing Attention", value: itpAttention, href: "/projects/wadden-sea/itp", tone: healthToneOf(itpAttention) },
        { label: "NOIs Overdue", value: noiOverdue, href: "/projects/wadden-sea/noi", tone: healthToneOf(noiOverdue) },
        { label: "Open Points Overdue", value: openPointsOverdue, href: "/projects/wadden-sea/reports", tone: healthToneOf(openPointsOverdue) },
      ],
      chart: [
        { name: "ITPs Needing Attention", value: itpAttention, fill: toneColour.amber, href: "/projects/wadden-sea/itp" },
        { name: "NOIs Due (8wk)", value: noiUpcoming, fill: toneColour.green, href: "/projects/wadden-sea/noi" },
        { name: "NOIs Overdue", value: noiOverdue, fill: toneColour.red, href: "/projects/wadden-sea/noi" },
        { name: "Open Points", value: openPointsOpen, fill: toneColour.slate, href: "/projects/wadden-sea/reports" },
      ],
      detail: [
        { label: "Open Points (open)", value: openPointsOpen, href: "/projects/wadden-sea/reports" },
        { label: "Open Points Overdue", value: openPointsOverdue, href: "/projects/wadden-sea/reports" },
        { label: "Open Points Critical", value: openPointsCritical, href: "/projects/wadden-sea/reports" },
        { label: "NOIs due next 8 weeks", value: noiUpcoming, href: "/projects/wadden-sea/noi" },
      ],
    };
    return summary;
  }, [snapshot.itps, snapshot.noiPoints, snapshot.openPoints]);

  // ── Asset Management ──────────────────────────────────────────────────────
  const assets = useMemo(() => {
    const currentCalibrations = getCurrentCalibrationRows(snapshot.calibrations);
    const inUseCalibrations = currentCalibrations.filter((r) => calibrationItemStatus(r.item_status) === "In Use");
    const overdueCalibrations = inUseCalibrations.filter((r) => isOverdueDate(r.calibration_due_date)).length;
    const inDateCalibrations = inUseCalibrations.filter((r) => !isOverdueDate(r.calibration_due_date) && r.calibration_due_date).length;
    const calibrationCoverage = inUseCalibrations.length ? Math.round((inDateCalibrations / inUseCalibrations.length) * 100) : null;
    const overdueInspections = snapshot.assetInspections.filter((r) => isOverdueDate(r.next_inspection_due)).length;
    const overdueMaintenance = snapshot.assetMaintenance.filter((r) => isOverdueDate(r.next_maintenance_due)).length;

    const attentionCount = overdueCalibrations + overdueInspections + overdueMaintenance;
    const tone = toneFromCounts(overdueCalibrations, overdueInspections + overdueMaintenance);

    const summary: AreaSummary = {
      key: "assets", moduleKey: "assets", title: "Asset Management",
      subtitle: "Calibration compliance, inspection, and maintenance currency.",
      href: "/assets/dashboard", tone, attentionCount,
      headline: [
        { label: "Calibration In-Date", value: calibrationCoverage, href: "/assets/calibration", tone: calibrationCoverage === null ? "slate" : calibrationCoverage >= 90 ? "green" : calibrationCoverage >= 75 ? "amber" : "red" },
        { label: "Calibrations Overdue", value: overdueCalibrations, href: "/assets/calibration", tone: healthToneOf(overdueCalibrations) },
        { label: "Inspections Overdue", value: overdueInspections, href: "/assets/inspection?view=register", tone: healthToneOf(overdueInspections) },
      ],
      chart: [
        { name: "Calibrations Overdue", value: overdueCalibrations, fill: toneColour.red, href: "/assets/calibration" },
        { name: "Inspection Records Overdue", value: overdueInspections, fill: toneColour.amber, href: "/assets/inspection?view=register" },
        { name: "Maintenance Records Overdue", value: overdueMaintenance, fill: toneColour.slate, href: "/assets/maintenance?view=register" },
      ],
      detail: [
        { label: "In-Use Items Tracked", value: inUseCalibrations.length, href: "/assets/calibration" },
        { label: "Calibrations Overdue", value: overdueCalibrations, href: "/assets/calibration" },
        { label: "Inspection Records Overdue", value: overdueInspections, href: "/assets/inspection?view=register" },
        { label: "Maintenance Records Overdue", value: overdueMaintenance, href: "/assets/maintenance?view=register" },
      ],
    };
    return summary;
  }, [snapshot.calibrations, snapshot.assetInspections, snapshot.assetMaintenance]);

  // ── Action Management (whole business) ────────────────────────────────────
  const actionsArea = useMemo(() => {
    const openLike = (status: string | null) => normalise(status) !== "closed" && normalise(status) !== "complete" && normalise(status) !== "completed";
    const openActions = snapshot.actions.filter((r) => openLike(r.status));
    const overdueActions = openActions.filter((r) => isOverdueDate(r.due_date));
    const byDepartment = departmentOptions
      .map((dept) => ({
        name: dept,
        value: openActions.filter((r) => normalise(r.department) === normalise(dept)).length,
        overdue: overdueActions.filter((r) => normalise(r.department) === normalise(dept)).length,
      }))
      .filter((row) => row.value > 0)
      .sort((a, b) => b.value - a.value);
    const untrackedDepartment = openActions.filter((r) => !departmentOptions.some((d) => normalise(d) === normalise(r.department))).length;

    const attentionCount = overdueActions.length;
    const tone = toneFromCounts(overdueActions.length > 5 ? overdueActions.length : 0, openActions.length);

    const summary: AreaSummary = {
      key: "actions", moduleKey: "actions", title: "Action Management",
      subtitle: "Open and overdue actions across every department, not just Quality/HSE.",
      href: "/actions?view=register", tone, attentionCount,
      headline: [
        { label: "Open Actions", value: openActions.length, href: "/actions?view=register", tone: "slate" },
        { label: "Overdue Actions", value: overdueActions.length, href: "/actions?view=register&overdue=1", tone: healthToneOf(overdueActions.length) },
        { label: "Departments With Open Work", value: byDepartment.length, href: "/actions?view=register" },
      ],
      chart: byDepartment.slice(0, 6).map((row, index) => ({
        name: row.name, value: row.value, fill: [toneColour.red, toneColour.amber, toneColour.green, toneColour.slate][index % 4],
        href: `/actions?view=register&department=${encodeURIComponent(row.name)}`,
      })),
      detail: byDepartment.slice(0, 4).map((row) => ({
        label: `${row.name} (${row.overdue} overdue)`, value: row.value, href: `/actions?view=register&department=${encodeURIComponent(row.name)}`,
      })).concat(untrackedDepartment ? [{ label: "Unclassified department", value: untrackedDepartment, href: "/actions?view=register" }] : []),
    };
    return summary;
  }, [snapshot.actions]);

  // ── Lessons Learnt ─────────────────────────────────────────────────────────
  const lessonsArea = useMemo(() => {
    const clean = (v: string | null) => (v || "").trim();
    const hasAction = (r: LessonRow) => Boolean(clean(r.recommended_action) || clean(r.action_taken));
    const hasOpenAction = (r: LessonRow) => hasAction(r) && !["Closed", "Implemented"].includes(r.status || "");
    const openLessons = snapshot.lessons.filter(hasOpenAction);
    const unowned = openLessons.filter((r) => !clean(r.action_owner)).length;
    const highCriticality = snapshot.lessons.filter((r) => hasOpenAction(r) && ["High", "Critical"].includes(r.criticality || "")).length;
    const groups = new Map<string, number>();
    snapshot.lessons.forEach((r) => {
      const key = normalise(r.repeat_group);
      if (!key) return;
      groups.set(key, (groups.get(key) || 0) + 1);
    });
    const repeatThemes = [...groups.values()].filter((count) => count > 1).length;
    const loggedThisPeriod = snapshot.lessons.filter((r) => matchesPeriod(r.report_date)).length;

    const attentionCount = highCriticality + unowned;
    const tone = toneFromCounts(highCriticality, unowned + repeatThemes);

    const summary: AreaSummary = {
      key: "lessons", moduleKey: "lessons", title: "Lessons Learnt",
      subtitle: "Open actions, ownership, and repeat-failure themes.",
      href: "/lessons-learned?view=register", tone, attentionCount,
      headline: [
        { label: "Open With Action Needed", value: openLessons.length, href: "/lessons-learned?view=register", tone: "slate" },
        { label: "High/Critical Open", value: highCriticality, href: "/lessons-learned?view=register", tone: healthToneOf(highCriticality) },
        { label: "Unowned Open Actions", value: unowned, href: "/lessons-learned?view=register", tone: healthToneOf(unowned) },
      ],
      chart: [
        { name: "Open, Needs Action", value: openLessons.length, fill: toneColour.amber, href: "/lessons-learned?view=register" },
        { name: "Unowned", value: unowned, fill: toneColour.red, href: "/lessons-learned?view=register" },
        { name: "Repeat Themes", value: repeatThemes, fill: toneColour.slate, href: "/lessons-learned?view=register" },
      ],
      detail: [
        { label: `Lessons logged (${periodLabel})`, value: loggedThisPeriod, href: "/lessons-learned?view=register" },
        { label: "High/Critical Open", value: highCriticality, href: "/lessons-learned?view=register" },
        { label: "Repeat Themes (2+ occurrences)", value: repeatThemes, href: "/lessons-learned?view=register" },
        { label: "Total Lessons Recorded", value: snapshot.lessons.length, href: "/lessons-learned?view=register" },
      ],
    };
    return summary;
  }, [snapshot.lessons, period, periodLabel]);

  const areas = useMemo(
    () => [quality, hse, documentsArea, projects, assets, actionsArea, lessonsArea],
    [quality, hse, documentsArea, projects, assets, actionsArea, lessonsArea]
  );

  const visibleAreas = useMemo(
    () => areas.filter((area) => permissions.canAccessModule(area.moduleKey)),
    [areas, permissions]
  );

  const totalAttention = useMemo(() => visibleAreas.reduce((sum, area) => sum + area.attentionCount, 0), [visibleAreas]);
  const criticalAreas = visibleAreas.filter((area) => area.tone === "red").length;

  // ── Exports ───────────────────────────────────────────────────────────────

  async function generateManagementReviewPdf() {
    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;
      const generatedAt = new Date().toLocaleString("en-GB");

      try {
        const logoResponse = await fetch("/enshore-primary-logo-colour.png");
        if (logoResponse.ok) {
          const logoBlob = await logoResponse.blob();
          const logoDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(String(reader.result || ""));
            reader.onerror = reject;
            reader.readAsDataURL(logoBlob);
          });
          if (logoDataUrl) doc.addImage(logoDataUrl, "PNG", margin, 9, 42, 21);
        }
      } catch {
        // Keep export available if the logo cannot be loaded.
      }

      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(18);
      doc.text("Management Review Pack", pageWidth - margin, 17, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(83, 86, 90);
      doc.text(`Generated: ${generatedAt} | Period: ${periodLabel}`, pageWidth - margin, 24, { align: "right" });
      doc.setDrawColor(0, 86, 112);
      doc.setLineWidth(0.7);
      doc.line(margin, 31, pageWidth - margin, 31);

      autoTable(doc, {
        startY: 37,
        head: [["Business Area", "Status", "Items Needing Attention"]],
        body: visibleAreas.map((area) => [area.title, toneLabel[area.tone], String(area.attentionCount)]),
        theme: "grid",
        styles: { fontSize: 8.5, cellPadding: 2.4, lineColor: [208, 208, 206], valign: "middle" },
        headStyles: { fillColor: [0, 86, 112], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [236, 236, 231] },
      });

      visibleAreas.forEach((area) => {
        const startY = ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 38) + 8;
        const y = startY > pageHeight - 42 ? (doc.addPage(), 18) : startY;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text(area.title, margin, y);
        autoTable(doc, {
          startY: y + 3,
          head: [["Metric", "Value"]],
          body: area.detail.map((item) => [item.label, item.value === null ? "N/A" : String(item.value)]),
          theme: "grid",
          styles: { fontSize: 8, cellPadding: 2.2, lineColor: [208, 208, 206], valign: "middle" },
          headStyles: { fillColor: [236, 236, 231], textColor: [0, 0, 0], fontStyle: "bold" },
          alternateRowStyles: { fillColor: [236, 236, 231] },
          columnStyles: { 0: { cellWidth: 80, fontStyle: "bold" } },
        });
      });

      if (snapshot.errors.length) {
        const startY = ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 38) + 8;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("Unavailable Metrics", margin, startY);
        autoTable(doc, {
          startY: startY + 3,
          head: [["Source"]],
          body: snapshot.errors.map((error) => [error]),
          theme: "grid",
          styles: { fontSize: 8, cellPadding: 2.2, lineColor: [208, 208, 206] },
          headStyles: { fillColor: [236, 236, 231], textColor: [0, 0, 0], fontStyle: "bold" },
        });
      }

      const pageCount = doc.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) {
        doc.setPage(page);
        doc.setDrawColor(208, 208, 206);
        doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(83, 86, 90);
        doc.text("Enshore Subsea | Management Review Pack", margin, pageHeight - 6);
        doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 6, { align: "right" });
      }

      doc.save(`management-review-pack-${new Date().toISOString().slice(0, 10)}.pdf`);
      setMessage("Management Review PDF pack generated.");
    } catch (error) {
      console.error(error);
      setMessage("Management Review PDF generation failed.");
    }
  }

  async function generateManagementReviewPowerPoint() {
    try {
      const pptxgen = (await import("pptxgenjs")).default;
      const pptx = new pptxgen();
      pptx.layout = "LAYOUT_WIDE";
      pptx.author = "Enshore IMS";
      pptx.company = "Enshore Subsea";
      pptx.subject = "Management Review";
      pptx.title = "Management Review Pack";

      const addTitle = (slide: ReturnType<typeof pptx.addSlide>, title: string, subtitle?: string) => {
        slide.background = { color: "ECECE7" };
        slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.16, fill: { color: "005670" }, line: { color: "005670" } });
        slide.addImage({ path: "/enshore-primary-logo-colour.png", x: 11.0, y: 0.35, w: 1.7, h: 0.85 });
        slide.addText(title, { x: 0.55, y: 0.45, w: 8.7, h: 0.38, fontFace: "Azo Sans", fontSize: 23, bold: true, color: "000000", margin: 0 });
        if (subtitle) {
          slide.addText(subtitle, { x: 0.55, y: 0.86, w: 9.8, h: 0.26, fontFace: "Azo Sans", fontSize: 10.5, color: "53565A", margin: 0 });
        }
        slide.addText(`${lastRefreshed || new Date().toLocaleString("en-GB")} | Period: ${periodLabel}`, { x: 0.55, y: 6.9, w: 5, h: 0.24, fontFace: "Azo Sans", fontSize: 8.5, color: "53565A", margin: 0 });
      };

      const titleSlide = pptx.addSlide();
      titleSlide.background = { color: "ECECE7" };
      titleSlide.addShape(pptx.ShapeType.roundRect, { x: 0.5, y: 0.55, w: 12.35, h: 5.75, rectRadius: 0.16, fill: { color: "005670" }, line: { color: "005670" } });
      titleSlide.addText("MANAGEMENT REVIEW", { x: 0.95, y: 1.05, w: 4.6, h: 0.28, fontFace: "Azo Sans", fontSize: 11, bold: true, color: "D0D0CE", margin: 0 });
      titleSlide.addText("Business Health Pack", { x: 0.95, y: 1.48, w: 6.7, h: 0.55, fontFace: "Azo Sans", fontSize: 30, bold: true, color: "FFFFFF", margin: 0 });
      titleSlide.addText(`Live snapshot across Quality, HSE, Documents, Projects, Assets, Actions, and Lessons Learnt. Period: ${periodLabel}.`, { x: 0.95, y: 2.15, w: 9.5, h: 0.5, fontFace: "Azo Sans", fontSize: 13, color: "ECECE7", margin: 0 });
      titleSlide.addShape(pptx.ShapeType.ellipse, { x: 9.0, y: 1.1, w: 2.4, h: 2.4, fill: { color: "FFFFFF", transparency: 100 }, line: { color: "63B1BC", width: 4 } });
      titleSlide.addText(String(totalAttention), { x: 9.05, y: 1.72, w: 2.3, h: 0.55, fontFace: "Azo Sans", fontSize: 30, bold: true, color: "FFFFFF", align: "center", margin: 0 });
      titleSlide.addText("ITEMS NEEDING ATTENTION", { x: 9.0, y: 2.32, w: 2.4, h: 0.24, fontFace: "Azo Sans", fontSize: 8, bold: true, color: "D0D0CE", align: "center", margin: 0 });
      titleSlide.addText(`Generated ${new Date().toLocaleString("en-GB")}`, { x: 0.95, y: 5.65, w: 4.5, h: 0.24, fontFace: "Azo Sans", fontSize: 9, color: "D0D0CE", margin: 0 });

      const overviewSlide = pptx.addSlide();
      addTitle(overviewSlide, "Business Area Status", "Status and open attention items per business area — no blended score, each area speaks for itself.");
      visibleAreas.forEach((area, index) => {
        const col = index % 4;
        const row = Math.floor(index / 4);
        const x = 0.6 + col * 3.05;
        const y = 1.4 + row * 1.55;
        const colour = toneColour[area.tone].replace("#", "");
        overviewSlide.addShape(pptx.ShapeType.roundRect, { x, y, w: 2.85, h: 1.35, rectRadius: 0.08, fill: { color: "FFFFFF" }, line: { color: "DBE7F3" } });
        overviewSlide.addShape(pptx.ShapeType.rect, { x, y, w: 2.85, h: 0.08, fill: { color: colour }, line: { color: colour } });
        overviewSlide.addText(area.title, { x: x + 0.15, y: y + 0.16, w: 2.55, h: 0.24, fontFace: "Azo Sans", fontSize: 11, bold: true, color: "000000", margin: 0 });
        overviewSlide.addText(toneLabel[area.tone], { x: x + 0.15, y: y + 0.44, w: 2.55, h: 0.2, fontFace: "Azo Sans", fontSize: 9, bold: true, color: colour, margin: 0 });
        overviewSlide.addText(`${area.attentionCount} needing attention`, { x: x + 0.15, y: y + 0.78, w: 2.55, h: 0.4, fontFace: "Azo Sans", fontSize: 20, bold: true, color: "000000", margin: 0 });
      });

      visibleAreas.forEach((area) => {
        const slide = pptx.addSlide();
        addTitle(slide, area.title, area.subtitle);
        area.headline.forEach((item, index) => {
          const x = 0.6 + index * 3.15;
          slide.addShape(pptx.ShapeType.roundRect, { x, y: 1.25, w: 2.9, h: 1.05, rectRadius: 0.08, fill: { color: "FFFFFF" }, line: { color: "DBE7F3" } });
          slide.addText(item.label, { x: x + 0.15, y: 1.42, w: 2.6, h: 0.22, fontFace: "Azo Sans", fontSize: 8.5, bold: true, color: "53565A", margin: 0 });
          slide.addText(item.value === null ? "N/A" : String(item.value), { x: x + 0.15, y: 1.73, w: 2.6, h: 0.4, fontFace: "Azo Sans", fontSize: 21, bold: true, color: "000000", margin: 0 });
        });
        slide.addText("Detail", { x: 0.6, y: 2.7, w: 3.5, h: 0.3, fontFace: "Azo Sans", fontSize: 16, bold: true, color: "000000", margin: 0 });
        area.detail.forEach((item, index) => {
          const y = 3.13 + index * 0.46;
          slide.addShape(pptx.ShapeType.roundRect, { x: 0.6, y, w: 11.9, h: 0.34, rectRadius: 0.05, fill: { color: index % 2 ? "FFFFFF" : "ECECE7" }, line: { color: "D0D0CE" } });
          slide.addText(item.label, { x: 0.82, y: y + 0.08, w: 9.5, h: 0.16, fontFace: "Azo Sans", fontSize: 9.5, bold: true, color: "000000", margin: 0 });
          slide.addText(item.value === null ? "N/A" : String(item.value), { x: 10.8, y: y + 0.08, w: 1.2, h: 0.16, fontFace: "Azo Sans", fontSize: 9.5, bold: true, color: "000000", align: "right", margin: 0 });
        });
      });

      await pptx.writeFile({ fileName: `management-review-pack-${new Date().toISOString().slice(0, 10)}.pptx` });
      setMessage("Management Review PowerPoint generated.");
    } catch (error) {
      console.error(error);
      setMessage("Management Review PowerPoint generation failed.");
    }
  }

  return (
    <main>
      <style>{`
        .mr-card, .mr-signal, .mr-focus-link {
          transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
        }
        .mr-card:hover, .mr-signal:hover, .mr-focus-link:hover {
          transform: translateY(-3px);
          box-shadow: 0 18px 34px rgba(0, 0, 0, 0.11);
          border-color: #D0D0CE;
        }
        @media (max-width: 1100px) {
          .mr-area-grid, .mr-module-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 720px) {
          .mr-pulse-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <QualityPageHero
        label="MANAGEMENT REVIEW"
        title="Business Snapshot"
        description="Live, permission-aware view across every business area with drill-down into the source modules."
      />

      <ImsTopMetaRow
        backHref="/home"
        backLabel="Back to IMS Home"
        actions={
          <>
            <ImsButton onClick={() => void generateManagementReviewPdf()}>Export PDF</ImsButton>
            <ImsButton onClick={() => void generateManagementReviewPowerPoint()}>Export PowerPoint</ImsButton>
          </>
        }
        status={<><strong>Status:</strong> {isLoading ? "Loading..." : message}{lastRefreshed ? ` · As of ${lastRefreshed}` : ""}</>}
      />

      <div style={commandBarStyle}>
        <ImsTabs
          tabs={[{ value: "overview", label: "Overview" }, { value: "areas", label: "Business Areas" }]}
          active={view}
          onChange={setView}
          ariaLabel="Management Review views"
        />
        <select
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
          style={periodSelectStyle}
          aria-label="Reporting period"
        >
          <option value="all">All Time</option>
          {availableYears.map((year) => (
            <option key={year} value={String(year)}>{year}</option>
          ))}
        </select>
      </div>

      {view === "overview" ? (
        <>
          <section style={pulsePanelStyle} className="mr-pulse-grid">
            <div>
              <span style={eyebrowStyle}>Executive Pulse</span>
              <h2 style={pulseTitleStyle}>{totalAttention} item{totalAttention === 1 ? "" : "s"} need attention across the business</h2>
              <p style={pulseCopyStyle}>
                {criticalAreas === 0
                  ? "No business area is currently flagged Critical."
                  : `${criticalAreas} of ${visibleAreas.length} business areas are flagged Critical.`}
                {" "}Each area below reports its own status — there is no blended score to keep numbers traceable back to their live source register.
              </p>
            </div>
          </section>

          <section className="mr-area-grid" style={areaGridStyle}>
            {visibleAreas.map((area) => (
              <Link key={area.key} href={area.href} className="mr-signal" style={{ ...areaCardStyle, borderTopColor: toneColour[area.tone] }}>
                <div style={areaCardHeaderStyle}>
                  <span style={areaCardTitleStyle}>{area.title}</span>
                  <span style={{ ...areaStatusPillStyle, background: toneColour[area.tone] }}>{toneLabel[area.tone]}</span>
                </div>
                <div style={areaHeadlineRowStyle}>
                  {area.headline.map((item) => (
                    <div key={item.label} style={areaHeadlineItemStyle}>
                      <strong style={areaHeadlineValueStyle}>{displayValue(item.value)}</strong>
                      <span style={areaHeadlineLabelStyle}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </Link>
            ))}
          </section>
        </>
      ) : (
        <section className="mr-module-grid" style={moduleGridStyle}>
          {visibleAreas.map((area) => (
            <ModulePanel key={area.key} area={area} />
          ))}
        </section>
      )}

      {snapshot.errors.length ? (
        <section style={panelStyle}>
          <ModuleSectionHeader title="Unavailable Metrics" subtitle="Affected metrics are shown as N/A so the review pack does not guess." />
          <ul style={errorListStyle}>
            {snapshot.errors.map((error) => (<li key={error}>{error}</li>))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}

function healthToneOf(value: number | null): Tone {
  if (value === null) return "slate";
  return value > 0 ? "red" : "green";
}

function ModulePanel({ area }: { area: AreaSummary }) {
  return (
    <section className="mr-card" style={modulePanelStyle}>
      <ModuleSectionHeader
        title={area.title}
        subtitle={area.subtitle}
        actions={<Link href={area.href} style={panelLinkStyle}>Open module</Link>}
      />
      <div style={moduleScoreRowStyle}>
        <span style={moduleScoreLabelStyle}>Status</span>
        <strong style={{ ...moduleScoreValueStyle, color: toneColour[area.tone] }}>{toneLabel[area.tone]}</strong>
      </div>
      <ChartBlock data={area.chart} />
      <div style={metricGridStyle}>
        {area.detail.map((item) => (
          <Metric key={item.label} label={item.label} value={item.value} href={item.href} tone={item.tone ? toneColour[item.tone] : imsColours.brand} />
        ))}
      </div>
    </section>
  );
}

function Metric({ label, value, tone, href }: { label: string; value: number | null; tone: string; href?: string }) {
  const content = (
    <div style={metricCardStyle}>
      <div style={{ ...metricAccentStyle, background: tone }} />
      <div style={metricLabelStyle}>{label}</div>
      <div style={metricValueStyle}>{displayValue(value)}</div>
    </div>
  );
  return href ? <Link href={href} style={metricLinkStyle}>{content}</Link> : content;
}

function ChartBlock({ data }: { data: ChartDatum[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return <div style={emptyChartStyle}>Loading chart...</div>;
  if (!data.length || data.every((item) => item.value === 0)) return <div style={emptyChartStyle}>No open items in this area.</div>;

  return (
    <div style={chartWrapStyle}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ left: 12, right: 18, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="value" radius={[0, 8, 8, 0]}>
            {data.map((entry) => (<Cell key={entry.name} fill={entry.fill || imsColours.brand} />))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const commandBarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "10px",
  marginBottom: "6px",
};

const periodSelectStyle: CSSProperties = {
  height: "42px",
  borderRadius: "10px",
  border: `1px solid ${imsColours.border}`,
  padding: "0 12px",
  fontSize: "14px",
  background: "#ffffff",
  color: imsColours.ink,
};

const pulsePanelStyle: CSSProperties = {
  borderRadius: "22px",
  padding: "24px 26px",
  marginBottom: "18px",
  color: "#ffffff",
  background: `linear-gradient(135deg, ${imsColours.brand} 0%, #005670 100%)`,
  boxShadow: imsShadows.hero,
};

const eyebrowStyle: CSSProperties = {
  display: "block",
  marginBottom: "10px",
  color: "#ECECE7",
  fontSize: "12px",
  fontWeight: 900,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const pulseTitleStyle: CSSProperties = {
  margin: 0,
  maxWidth: "760px",
  fontSize: "26px",
  lineHeight: 1.2,
  fontWeight: 800,
};

const pulseCopyStyle: CSSProperties = {
  margin: "12px 0 0",
  maxWidth: "760px",
  color: "#ECECE7",
  lineHeight: 1.55,
  fontSize: "14px",
  fontWeight: 600,
};

const areaGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "14px",
  marginBottom: "20px",
};

const areaCardStyle: CSSProperties = {
  minHeight: "150px",
  padding: "16px",
  borderRadius: "18px",
  border: `1px solid ${imsColours.border}`,
  borderTop: "5px solid",
  background: "#ffffff",
  color: imsColours.ink,
  textDecoration: "none",
  boxShadow: imsShadows.panel,
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const areaCardHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
};

const areaCardTitleStyle: CSSProperties = {
  fontSize: "16px",
  fontWeight: 800,
  color: imsColours.ink,
};

const areaStatusPillStyle: CSSProperties = {
  color: "#ffffff",
  fontSize: "10px",
  fontWeight: 900,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  padding: "4px 9px",
  borderRadius: "999px",
};

const areaHeadlineRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "8px",
};

const areaHeadlineItemStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "2px",
};

const areaHeadlineValueStyle: CSSProperties = {
  fontSize: "22px",
  lineHeight: 1,
  color: imsColours.ink,
};

const areaHeadlineLabelStyle: CSSProperties = {
  fontSize: "10px",
  fontWeight: 700,
  color: imsColours.slate,
  lineHeight: 1.3,
};

const moduleGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
  gap: "18px",
};

const modulePanelStyle: CSSProperties = {
  ...imsPanelStyle,
  minHeight: "100%",
  background: "linear-gradient(180deg, #ffffff 0%, #ECECE7 100%)",
};

const moduleScoreRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  padding: "12px 14px",
  marginBottom: "14px",
  borderRadius: "14px",
  background: imsColours.brandSoft,
  border: `1px solid ${imsColours.brandBorder}`,
};

const moduleScoreLabelStyle: CSSProperties = {
  color: imsColours.brandDark,
  fontWeight: 900,
  fontSize: "12px",
  textTransform: "uppercase",
};

const moduleScoreValueStyle: CSSProperties = {
  fontSize: "18px",
  lineHeight: 1,
};

const panelLinkStyle: CSSProperties = {
  color: imsColours.brandDark,
  textDecoration: "none",
  fontSize: "13px",
  fontWeight: 900,
};

const metricGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "10px",
};

const metricCardStyle: CSSProperties = {
  position: "relative",
  minHeight: "78px",
  border: `1px solid ${imsColours.borderSoft}`,
  borderRadius: "14px",
  background: "#ECECE7",
  padding: "13px",
  overflow: "hidden",
};

const metricLinkStyle: CSSProperties = {
  display: "block",
  color: "inherit",
  textDecoration: "none",
};

const metricAccentStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: "4px",
};

const metricLabelStyle: CSSProperties = {
  marginBottom: "8px",
  color: imsColours.slate,
  fontSize: "11px",
  fontWeight: 900,
  textTransform: "uppercase",
  lineHeight: 1.25,
};

const metricValueStyle: CSSProperties = {
  color: imsColours.ink,
  fontSize: "24px",
  fontWeight: 800,
  lineHeight: 1,
};

const chartWrapStyle: CSSProperties = {
  width: "100%",
  height: "220px",
  minHeight: "220px",
  marginBottom: "14px",
  border: `1px solid ${imsColours.borderSoft}`,
  borderRadius: "14px",
  background: "#ECECE7",
  padding: "10px",
  boxSizing: "border-box",
};

const emptyChartStyle: CSSProperties = {
  minHeight: "220px",
  marginBottom: "14px",
  border: "1px dashed #D0D0CE",
  borderRadius: "14px",
  background: "#ECECE7",
  color: imsColours.slate,
  display: "grid",
  placeItems: "center",
  fontSize: "14px",
  fontWeight: 800,
};

const panelStyle: CSSProperties = {
  ...imsPanelStyle,
  marginTop: "20px",
};

const errorListStyle: CSSProperties = {
  margin: 0,
  paddingLeft: "20px",
  color: "#000000",
};

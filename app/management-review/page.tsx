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
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ImsButton, ImsTopMetaRow } from "../../src/components/ImsPrimitives";
import { ModuleSectionHeader } from "../../src/components/ModuleSectionHeader";
import { QualityKpiCard } from "../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../src/components/QualityPageHero";
import { imsColours, imsPanelStyle, imsShadows } from "../../src/components/imsTheme";
import { supabase } from "../../src/lib/supabase";

export const dynamic = "force-dynamic";

type CountValue = number | null;

type ChartDatum = {
  name: string;
  value: number;
  fill?: string;
  href?: string;
};

type SnapshotState = {
  quality: {
    totalNcrs: CountValue;
    openNcrs: CountValue;
    ncrClosure: CountValue;
    openAuditFindings: CountValue;
    findingClosure: CountValue;
    openMocs: CountValue;
    mocClosure: CountValue;
    qualityOpenActions: CountValue;
    qualityOverdueActions: CountValue;
  };
  hse: {
    totalAinms: CountValue;
    openAinms: CountValue;
    incidentsThisYear: CountValue;
    accidentsThisYear: CountValue;
    openInspections: CountValue;
    completedInspections: CountValue;
    openObservations: CountValue;
    highRiskObservations: CountValue;
    hseOpenActions: CountValue;
    hseOverdueActions: CountValue;
    calendarOverdue: CountValue;
  };
  documents: {
    total: CountValue;
    live: CountValue;
    overdueReviews: CountValue;
    dueSoon: CountValue;
    pendingReviewApproval: CountValue;
  };
  errors: string[];
};

type StatusRow = {
  status: string | null;
};

type AuditFindingRow = {
  status: string | null;
  closure_date?: string | null;
};

type ActionRow = {
  status: string | null;
  priority: string | null;
  due_date: string | null;
  department: string | null;
};

type MocRow = {
  status: string | null;
};

type DocumentRow = {
  status: string | null;
  review_approval_status: string | null;
  next_review_date: string | null;
};

type AinmRow = {
  overall_status: string | null;
  event_classification: string | null;
  ainm_number: string | null;
  event_date: string | null;
};

type HseInspectionRow = {
  status: string | null;
  inspection_date: string | null;
};

type ObservationRow = {
  status: string | null;
  risk_level: string | null;
  observation_date: string | null;
};

type CalendarRow = {
  status: string | null;
  due_date: string | null;
  next_due_date: string | null;
};

const currentYear = new Date().getFullYear();

const emptySnapshot: SnapshotState = {
  quality: {
    totalNcrs: null,
    openNcrs: null,
    ncrClosure: null,
    openAuditFindings: null,
    findingClosure: null,
    openMocs: null,
    mocClosure: null,
    qualityOpenActions: null,
    qualityOverdueActions: null,
  },
  hse: {
    totalAinms: null,
    openAinms: null,
    incidentsThisYear: null,
    accidentsThisYear: null,
    openInspections: null,
    completedInspections: null,
    openObservations: null,
    highRiskObservations: null,
    hseOpenActions: null,
    hseOverdueActions: null,
    calendarOverdue: null,
  },
  documents: {
    total: null,
    live: null,
    overdueReviews: null,
    dueSoon: null,
    pendingReviewApproval: null,
  },
  errors: [],
};

const chartColours = {
  teal: imsColours.brand,
  blue: imsColours.blue,
  purple: imsColours.purple,
  amber: imsColours.warning,
  red: imsColours.dangerBright,
  green: imsColours.success,
  slate: imsColours.slate,
};

const chartPalette = [chartColours.teal, chartColours.blue, chartColours.purple, chartColours.amber, chartColours.red, chartColours.slate];

function normalise(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function isClosedLike(value: string | null | undefined) {
  const status = normalise(value);
  return ["closed", "complete", "completed", "archived", "obsolete", "superseded", "cancelled"].includes(status);
}

function isOpenLike(value: string | null | undefined) {
  return !isClosedLike(value);
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

function isThisYear(value: string | null | undefined) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getFullYear() === currentYear;
}

function percentage(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function averageKnown(values: CountValue[]) {
  const known = values.filter((value): value is number => value !== null);
  if (!known.length) return null;
  return Math.round(known.reduce((sum, value) => sum + value, 0) / known.length);
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function displayValue(value: CountValue | string) {
  return value === null ? "N/A" : value;
}

function displayPdfValue(value: CountValue | string) {
  return value === null ? "N/A" : String(value);
}

function healthTone(value: CountValue, warningLimit = 0) {
  if (value === null) return chartColours.slate;
  return value > warningLimit ? chartColours.red : chartColours.green;
}

function positiveTone(value: CountValue, warningLimit = 0) {
  if (value === null) return chartColours.slate;
  return value > warningLimit ? chartColours.blue : chartColours.slate;
}

function getAinmType(record: AinmRow) {
  const number = (record.ainm_number || "").toUpperCase();
  if (number.startsWith("AR")) return "Accident";
  if (number.startsWith("IR")) return "Incident";
  const classification = normalise(record.event_classification);
  if (classification.includes("accident")) return "Accident";
  return "Incident";
}

function effectiveCalendarDate(row: CalendarRow) {
  return row.next_due_date || row.due_date;
}

async function fetchSnapshot(): Promise<SnapshotState> {
  const next: SnapshotState = {
    quality: { ...emptySnapshot.quality },
    hse: { ...emptySnapshot.hse },
    documents: { ...emptySnapshot.documents },
    errors: [],
  };

  const [
    ncrsResult,
    findingsResult,
    mocsResult,
    actionsResult,
    documentsResult,
    ainmResult,
    hseInspectionsResult,
    observationsResult,
    calendarResult,
  ] = await Promise.all([
    supabase.from("ncrs").select("status"),
    supabase.from("audit_findings").select("status,closure_date"),
    supabase.from("moc_reports").select("status"),
    supabase.from("actions").select("status,priority,due_date,department"),
    supabase.from("documents").select("status,review_approval_status,next_review_date"),
    supabase.from("hse_ainm_records").select("overall_status,event_classification,ainm_number,event_date"),
    supabase.from("hse_inspection_records").select("status,inspection_date"),
    supabase.from("hse_observations").select("status,risk_level,observation_date"),
    supabase.from("hse_calendar_items").select("status,due_date,next_due_date"),
  ]);

  if (ncrsResult.error) {
    next.errors.push(`NCRs unavailable: ${ncrsResult.error.message}`);
  } else {
    const rows = (ncrsResult.data || []) as StatusRow[];
    const closed = rows.filter((row) => isClosedLike(row.status)).length;
    next.quality.totalNcrs = rows.length;
    next.quality.openNcrs = rows.filter((row) => isOpenLike(row.status)).length;
    next.quality.ncrClosure = percentage(closed, rows.length);
  }

  if (findingsResult.error) {
    next.errors.push(`Audit findings unavailable: ${findingsResult.error.message}`);
  } else {
    const rows = (findingsResult.data || []) as AuditFindingRow[];
    const closed = rows.filter((row) => isClosedLike(row.status)).length;
    next.quality.openAuditFindings = rows.filter((row) => isOpenLike(row.status)).length;
    next.quality.findingClosure = percentage(closed, rows.length);
  }

  if (mocsResult.error) {
    next.errors.push(`MOCs unavailable: ${mocsResult.error.message}`);
  } else {
    const rows = (mocsResult.data || []) as MocRow[];
    const closed = rows.filter((row) => isClosedLike(row.status)).length;
    next.quality.openMocs = rows.filter((row) => isOpenLike(row.status)).length;
    next.quality.mocClosure = percentage(closed, rows.length);
  }

  if (actionsResult.error) {
    next.errors.push(`Actions unavailable: ${actionsResult.error.message}`);
  } else {
    const rows = (actionsResult.data || []) as ActionRow[];
    const qualityRows = rows.filter((row) => normalise(row.department) === "quality");
    const hseRows = rows.filter((row) => normalise(row.department) === "hse");
    next.quality.qualityOpenActions = qualityRows.filter((row) => isOpenLike(row.status)).length;
    next.quality.qualityOverdueActions = qualityRows.filter((row) => isOpenLike(row.status) && isOverdueDate(row.due_date)).length;
    next.hse.hseOpenActions = hseRows.filter((row) => isOpenLike(row.status)).length;
    next.hse.hseOverdueActions = hseRows.filter((row) => isOpenLike(row.status) && isOverdueDate(row.due_date)).length;
  }

  if (documentsResult.error) {
    next.errors.push(`Documents unavailable: ${documentsResult.error.message}`);
  } else {
    const rows = (documentsResult.data || []) as DocumentRow[];
    const activeRows = rows.filter((row) => isOpenLike(row.status));
    next.documents.total = rows.length;
    next.documents.live = rows.filter((row) => normalise(row.status) === "live").length;
    next.documents.overdueReviews = activeRows.filter((row) => isOverdueDate(row.next_review_date)).length;
    next.documents.dueSoon = activeRows.filter((row) => isDueWithin(row.next_review_date, 30)).length;
    next.documents.pendingReviewApproval = activeRows.filter((row) =>
      ["pending review", "reviewed", "under review"].includes(normalise(row.review_approval_status))
    ).length;
  }

  if (ainmResult.error) {
    next.errors.push(`AINMs unavailable: ${ainmResult.error.message}`);
  } else {
    const rows = (ainmResult.data || []) as AinmRow[];
    const yearRows = rows.filter((row) => isThisYear(row.event_date));
    next.hse.totalAinms = rows.length;
    next.hse.openAinms = rows.filter((row) => isOpenLike(row.overall_status)).length;
    next.hse.incidentsThisYear = yearRows.filter((row) => getAinmType(row) === "Incident").length;
    next.hse.accidentsThisYear = yearRows.filter((row) => getAinmType(row) === "Accident").length;
  }

  if (hseInspectionsResult.error) {
    next.errors.push(`HSE inspections unavailable: ${hseInspectionsResult.error.message}`);
  } else {
    const rows = (hseInspectionsResult.data || []) as HseInspectionRow[];
    next.hse.openInspections = rows.filter((row) => isOpenLike(row.status)).length;
    next.hse.completedInspections = rows.filter((row) => isClosedLike(row.status)).length;
  }

  if (observationsResult.error) {
    next.errors.push(`HSE observations unavailable: ${observationsResult.error.message}`);
  } else {
    const rows = (observationsResult.data || []) as ObservationRow[];
    next.hse.openObservations = rows.filter((row) => isOpenLike(row.status)).length;
    next.hse.highRiskObservations = rows.filter((row) => isOpenLike(row.status) && ["high", "critical"].includes(normalise(row.risk_level))).length;
  }

  if (calendarResult.error) {
    next.errors.push(`HSE calendar unavailable: ${calendarResult.error.message}`);
  } else {
    const rows = (calendarResult.data || []) as CalendarRow[];
    next.hse.calendarOverdue = rows.filter((row) => isOpenLike(row.status) && isOverdueDate(effectiveCalendarDate(row))).length;
  }

  return next;
}

export default function ManagementReviewPage() {
  const [snapshot, setSnapshot] = useState<SnapshotState>(emptySnapshot);
  const [message, setMessage] = useState("Loading management review...");
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function loadSnapshot() {
    setIsLoading(true);
    const data = await fetchSnapshot();
    setSnapshot(data);
    setLastRefreshed(new Date().toLocaleString("en-GB"));
    setMessage(data.errors.length ? "Snapshot loaded with some unavailable source metrics." : "CEO snapshot loaded.");
    setIsLoading(false);
  }

  useEffect(() => {
    void loadSnapshot();
  }, []);

  const documentHealth = useMemo(() => {
    if (snapshot.documents.total === null || !snapshot.documents.total) return null;
    const liveScore = percentage(snapshot.documents.live || 0, snapshot.documents.total);
    const overduePenalty = percentage(snapshot.documents.overdueReviews || 0, snapshot.documents.total);
    return clampPercent(liveScore - overduePenalty);
  }, [snapshot.documents]);

  const qualityScore = useMemo(() => averageKnown([
    snapshot.quality.ncrClosure,
    snapshot.quality.findingClosure,
    snapshot.quality.mocClosure,
    snapshot.quality.qualityOverdueActions === null || snapshot.quality.qualityOpenActions === null
      ? null
      : snapshot.quality.qualityOpenActions
        ? percentage(Math.max(snapshot.quality.qualityOpenActions - snapshot.quality.qualityOverdueActions, 0), snapshot.quality.qualityOpenActions)
        : 100,
  ]), [snapshot.quality]);

  const hseScore = useMemo(() => averageKnown([
    snapshot.hse.openAinms === null || snapshot.hse.totalAinms === null
      ? null
      : snapshot.hse.totalAinms
        ? percentage(Math.max(snapshot.hse.totalAinms - snapshot.hse.openAinms, 0), snapshot.hse.totalAinms)
        : 100,
    snapshot.hse.hseOpenActions === null || snapshot.hse.hseOverdueActions === null
      ? null
      : snapshot.hse.hseOpenActions
        ? percentage(Math.max(snapshot.hse.hseOpenActions - snapshot.hse.hseOverdueActions, 0), snapshot.hse.hseOpenActions)
        : 100,
    snapshot.hse.calendarOverdue === null ? null : snapshot.hse.calendarOverdue > 0 ? 60 : 100,
    snapshot.hse.highRiskObservations === null ? null : snapshot.hse.highRiskObservations > 0 ? 65 : 100,
  ]), [snapshot.hse]);

  const businessScore = useMemo(() => averageKnown([qualityScore, hseScore, documentHealth]), [documentHealth, hseScore, qualityScore]);

  const qualityPressure = useMemo<ChartDatum[]>(() => [
    { name: "Open NCRs", value: snapshot.quality.openNcrs || 0, fill: chartColours.red, href: "/ncr-capa?type=NCR&status=Open" },
    { name: "Audit Findings", value: snapshot.quality.openAuditFindings || 0, fill: chartColours.purple, href: "/audits?view=open-findings" },
    { name: "Open MOCs", value: snapshot.quality.openMocs || 0, fill: chartColours.teal, href: "/moc?status=Active" },
    { name: "Overdue Actions", value: snapshot.quality.qualityOverdueActions || 0, fill: chartColours.amber, href: "/actions?view=register&department=Quality&overdue=1" },
  ], [snapshot.quality]);

  const hsePressure = useMemo<ChartDatum[]>(() => [
    { name: "Open AINMs", value: snapshot.hse.openAinms || 0, fill: chartColours.red, href: "/hse/ainm?status=Open" },
    { name: "Open Inspections", value: snapshot.hse.openInspections || 0, fill: chartColours.teal, href: "/hse/inspections?view=register" },
    { name: "Open Observations", value: snapshot.hse.openObservations || 0, fill: chartColours.purple, href: "/hse/observations" },
    { name: "Overdue Actions", value: snapshot.hse.hseOverdueActions || 0, fill: chartColours.amber, href: "/hse/actions?view=register" },
    { name: "Calendar Overdue", value: snapshot.hse.calendarOverdue || 0, fill: chartColours.blue, href: "/hse/calendar" },
  ], [snapshot.hse]);

  const documentPressure = useMemo<ChartDatum[]>(() => [
    { name: "Live", value: snapshot.documents.live || 0, fill: chartColours.green, href: "/documents?status=Live" },
    { name: "Overdue Reviews", value: snapshot.documents.overdueReviews || 0, fill: chartColours.red, href: "/documents?review=Overdue" },
    { name: "Due Soon", value: snapshot.documents.dueSoon || 0, fill: chartColours.amber, href: "/documents?review=Due%20soon" },
    { name: "Workflow", value: snapshot.documents.pendingReviewApproval || 0, fill: chartColours.blue, href: "/documents?view=workflow" },
  ], [snapshot.documents]);

  const executiveSignals = useMemo(() => [
    {
      label: "Business control score",
      value: businessScore === null ? "N/A" : `${businessScore}%`,
      detail: "Blended Quality, HSE, and Document Control health",
      tone: businessScore === null ? chartColours.slate : businessScore >= 80 ? chartColours.green : businessScore >= 60 ? chartColours.amber : chartColours.red,
      href: "/management-review",
    },
    {
      label: "Management attention",
      value: (snapshot.quality.openNcrs || 0) + (snapshot.quality.openAuditFindings || 0) + (snapshot.hse.openAinms || 0) + (snapshot.documents.overdueReviews || 0),
      detail: "Open NCRs, audit findings, AINMs, and overdue document reviews",
      tone: chartColours.red,
      href: "/management-review",
    },
    {
      label: "HSE events this year",
      value: `${snapshot.hse.incidentsThisYear || 0}/${snapshot.hse.accidentsThisYear || 0}`,
      detail: `${currentYear} incidents / accidents`,
      tone: chartColours.teal,
      href: `/hse/ainm?year=${currentYear}`,
    },
    {
      label: "Document control",
      value: documentHealth === null ? "N/A" : `${documentHealth}%`,
      detail: "Live-document health less overdue review pressure",
      tone: documentHealth === null ? chartColours.slate : documentHealth >= 80 ? chartColours.green : chartColours.amber,
      href: "/documents",
    },
  ], [businessScore, documentHealth, snapshot.documents.overdueReviews, snapshot.hse.accidentsThisYear, snapshot.hse.incidentsThisYear, snapshot.hse.openAinms, snapshot.quality.openAuditFindings, snapshot.quality.openNcrs]);

  const managementFocus = useMemo(() => [
    { label: "Open NCRs", value: snapshot.quality.openNcrs, href: "/ncr-capa?type=NCR&status=Open", tone: healthTone(snapshot.quality.openNcrs) },
    { label: "Open Audit Findings", value: snapshot.quality.openAuditFindings, href: "/audits?view=open-findings", tone: healthTone(snapshot.quality.openAuditFindings) },
    { label: "Open AINMs", value: snapshot.hse.openAinms, href: "/hse/ainm?status=Open", tone: healthTone(snapshot.hse.openAinms) },
    { label: "High Risk Observations", value: snapshot.hse.highRiskObservations, href: "/hse/observations", tone: healthTone(snapshot.hse.highRiskObservations) },
    { label: "Document Reviews Overdue", value: snapshot.documents.overdueReviews, href: "/documents?review=Overdue", tone: healthTone(snapshot.documents.overdueReviews) },
    { label: "HSE Actions Overdue", value: snapshot.hse.hseOverdueActions, href: "/hse/actions?view=register", tone: healthTone(snapshot.hse.hseOverdueActions) },
  ], [snapshot]);

  async function generateManagementReviewPdf() {
    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;
      const generatedAt = new Date().toLocaleString("en-GB");

      try {
        const logoResponse = await fetch("/enshore-logo.png");
        if (logoResponse.ok) {
          const logoBlob = await logoResponse.blob();
          const logoDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(String(reader.result || ""));
            reader.onerror = reject;
            reader.readAsDataURL(logoBlob);
          });
          if (logoDataUrl) doc.addImage(logoDataUrl, "PNG", margin, 9, 42, 18);
        }
      } catch {
        // Keep export available if the logo cannot be loaded.
      }

      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(20);
      doc.text("Management Review Pack", pageWidth - margin, 17, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Generated: ${generatedAt}`, pageWidth - margin, 24, { align: "right" });
      doc.setDrawColor(58, 155, 152);
      doc.setLineWidth(0.7);
      doc.line(margin, 31, pageWidth - margin, 31);

      autoTable(doc, {
        startY: 37,
        head: [["Executive Signal", "Value", "CEO Note"]],
        body: executiveSignals.map((item) => [item.label, item.value, item.detail]),
        theme: "grid",
        styles: { fontSize: 8.5, cellPadding: 2.4, lineColor: [226, 232, 240], valign: "middle" },
        headStyles: { fillColor: [58, 155, 152], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 56, fontStyle: "bold" },
          1: { cellWidth: 28, halign: "center" },
          2: { cellWidth: pageWidth - margin * 2 - 84 },
        },
      });

      const addSection = (title: string, rows: Array<[string, CountValue | string, string]>) => {
        let startY = ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 38) + 8;
        if (startY > pageHeight - 42) {
          doc.addPage();
          startY = 18;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text(title, margin, startY);
        autoTable(doc, {
          startY: startY + 3,
          head: [["Metric", "Value", "Management Interpretation"]],
          body: rows.map(([metric, value, note]) => [metric, displayPdfValue(value), note]),
          theme: "grid",
          styles: { fontSize: 8, cellPadding: 2.2, lineColor: [226, 232, 240], valign: "middle" },
          headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold" },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: {
            0: { cellWidth: 58, fontStyle: "bold" },
            1: { cellWidth: 24, halign: "center" },
            2: { cellWidth: pageWidth - margin * 2 - 82 },
          },
        });
      };

      addSection("Quality Health", [
        ["NCR Closure", qualityScore === null ? "N/A" : `${snapshot.quality.ncrClosure || 0}%`, "Core nonconformance closure signal"],
        ["Open NCRs", snapshot.quality.openNcrs, "Open operational quality issues"],
        ["Open Audit Findings", snapshot.quality.openAuditFindings, "Audit findings requiring ownership and close-out"],
        ["Open MOCs", snapshot.quality.openMocs, "Management of Change records not closed"],
        ["Overdue Quality Actions", snapshot.quality.qualityOverdueActions, "Quality-owned actions past due date"],
      ]);

      addSection("HSE Health", [
        ["HSE Control Score", hseScore === null ? "N/A" : `${hseScore}%`, "AINM, action, observation, and calendar health"],
        ["Open AINMs", snapshot.hse.openAinms, "Accident, incident, and near miss records not closed"],
        [`${currentYear} Incidents / Accidents`, `${snapshot.hse.incidentsThisYear || 0} / ${snapshot.hse.accidentsThisYear || 0}`, "Current-year event profile"],
        ["Open HSE Actions", snapshot.hse.hseOpenActions, "HSE department action workload"],
        ["Calendar Overdue", snapshot.hse.calendarOverdue, "Recurring HSE planner items past due"],
      ]);

      addSection("Document Control Health", [
        ["Total Documents", snapshot.documents.total, "Controlled document register size"],
        ["Live Documents", snapshot.documents.live, "Documents currently live"],
        ["Reviews Overdue", snapshot.documents.overdueReviews, "Documents past next review date"],
        ["Due Soon", snapshot.documents.dueSoon, "Documents due for review within 30 days"],
        ["Pending Workflow", snapshot.documents.pendingReviewApproval, "Documents awaiting review or approval"],
      ]);

      if (snapshot.errors.length) {
        addSection("Unavailable Metrics", snapshot.errors.map((error) => ["Source read", "N/A", error]));
      }

      const pageCount = doc.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) {
        doc.setPage(page);
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
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
      pptx.theme = {
        headFontFace: "Calibri",
        bodyFontFace: "Calibri",
      };

      const addTitle = (slide: ReturnType<typeof pptx.addSlide>, title: string, subtitle?: string) => {
        slide.background = { color: "F8FAFC" };
        slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.16, fill: { color: "3A9B98" }, line: { color: "3A9B98" } });
        slide.addText(title, { x: 0.55, y: 0.45, w: 8.7, h: 0.38, fontFace: "Calibri", fontSize: 23, bold: true, color: "0F172A", margin: 0 });
        if (subtitle) {
          slide.addText(subtitle, { x: 0.55, y: 0.86, w: 9.8, h: 0.26, fontFace: "Calibri", fontSize: 10.5, color: "475569", margin: 0 });
        }
        slide.addText("ENSHORE IMS", { x: 10.7, y: 0.48, w: 1.9, h: 0.25, fontFace: "Calibri", fontSize: 10, bold: true, color: "3A9B98", align: "right", margin: 0 });
        slide.addText(lastRefreshed || new Date().toLocaleString("en-GB"), { x: 10.4, y: 0.78, w: 2.2, h: 0.24, fontFace: "Calibri", fontSize: 8.5, color: "64748B", align: "right", margin: 0 });
      };

      const addMetricCard = (slide: ReturnType<typeof pptx.addSlide>, x: number, y: number, label: string, value: string, colour: string) => {
        slide.addShape(pptx.ShapeType.roundRect, { x, y, w: 2.9, h: 1.05, rectRadius: 0.08, fill: { color: "FFFFFF" }, line: { color: "DBE7F3" } });
        slide.addShape(pptx.ShapeType.rect, { x, y, w: 2.9, h: 0.08, fill: { color: colour }, line: { color: colour } });
        slide.addText(label, { x: x + 0.15, y: y + 0.17, w: 2.5, h: 0.22, fontFace: "Calibri", fontSize: 8.5, bold: true, color: "475569", margin: 0 });
        slide.addText(value, { x: x + 0.15, y: y + 0.48, w: 2.5, h: 0.4, fontFace: "Calibri", fontSize: 21, bold: true, color: "0F172A", margin: 0 });
      };

      const titleSlide = pptx.addSlide();
      titleSlide.background = { color: "F8FAFC" };
      titleSlide.addShape(pptx.ShapeType.roundRect, { x: 0.5, y: 0.55, w: 12.35, h: 5.75, rectRadius: 0.16, fill: { color: "18474C" }, line: { color: "18474C" } });
      titleSlide.addText("MANAGEMENT REVIEW", { x: 0.95, y: 1.05, w: 4.6, h: 0.28, fontFace: "Calibri", fontSize: 11, bold: true, color: "BFE5E3", margin: 0 });
      titleSlide.addText("CEO Business Health Pack", { x: 0.95, y: 1.48, w: 6.7, h: 0.55, fontFace: "Calibri", fontSize: 30, bold: true, color: "FFFFFF", margin: 0 });
      titleSlide.addText("Live read-only view across Quality, HSE, and Document Control.", { x: 0.95, y: 2.15, w: 6.9, h: 0.35, fontFace: "Calibri", fontSize: 13, color: "E2F5F4", margin: 0 });
      titleSlide.addShape(pptx.ShapeType.ellipse, { x: 8.65, y: 1.1, w: 2.4, h: 2.4, fill: { color: "FFFFFF", transparency: 100 }, line: { color: "3A9B98", width: 4, transparency: 10 } });
      titleSlide.addText(businessScore === null ? "N/A" : `${businessScore}%`, { x: 8.7, y: 1.72, w: 2.3, h: 0.55, fontFace: "Calibri", fontSize: 30, bold: true, color: "FFFFFF", align: "center", margin: 0 });
      titleSlide.addText("BUSINESS CONTROL", { x: 8.65, y: 2.32, w: 2.4, h: 0.24, fontFace: "Calibri", fontSize: 8.5, bold: true, color: "BFE5E3", align: "center", margin: 0 });
      titleSlide.addText(`Generated ${new Date().toLocaleString("en-GB")}`, { x: 0.95, y: 5.65, w: 4.5, h: 0.24, fontFace: "Calibri", fontSize: 9, color: "BFE5E3", margin: 0 });

      const execSlide = pptx.addSlide();
      addTitle(execSlide, "Executive Signals", "What the CEO should see first.");
      executiveSignals.forEach((item, index) => {
        addMetricCard(execSlide, 0.6 + (index % 4) * 3.05, 1.35, item.label, String(item.value), item.tone.replace("#", ""));
      });
      execSlide.addText("Management Focus", { x: 0.6, y: 2.75, w: 3.5, h: 0.3, fontSize: 16, bold: true, color: "0F172A", margin: 0 });
      managementFocus.forEach((item, index) => {
        const y = 3.18 + index * 0.46;
        execSlide.addShape(pptx.ShapeType.roundRect, { x: 0.6, y, w: 11.9, h: 0.34, rectRadius: 0.05, fill: { color: index % 2 ? "FFFFFF" : "F1F5F9" }, line: { color: "E2E8F0" } });
        execSlide.addText(item.label, { x: 0.82, y: y + 0.08, w: 4.2, h: 0.16, fontSize: 9.5, bold: true, color: "0F172A", margin: 0 });
        execSlide.addText(displayPdfValue(item.value), { x: 10.8, y: y + 0.08, w: 1.2, h: 0.16, fontSize: 9.5, bold: true, color: item.tone.replace("#", ""), align: "right", margin: 0 });
      });

      const qualitySlide = pptx.addSlide();
      addTitle(qualitySlide, "Quality Performance", "NCR, audit finding, MOC, and Quality-owned action control.");
      addMetricCard(qualitySlide, 0.6, 1.25, "NCR Closure", displayPdfValue(snapshot.quality.ncrClosure === null ? null : `${snapshot.quality.ncrClosure}%`), chartColours.teal.replace("#", ""));
      addMetricCard(qualitySlide, 3.75, 1.25, "Open NCRs", displayPdfValue(snapshot.quality.openNcrs), chartColours.red.replace("#", ""));
      addMetricCard(qualitySlide, 6.9, 1.25, "Open Findings", displayPdfValue(snapshot.quality.openAuditFindings), chartColours.purple.replace("#", ""));
      addMetricCard(qualitySlide, 10.05, 1.25, "Overdue Actions", displayPdfValue(snapshot.quality.qualityOverdueActions), chartColours.amber.replace("#", ""));
      addTableSlideRows(qualitySlide, qualityPressure, 0.6, 2.85, "Quality pressure points");

      const hseSlide = pptx.addSlide();
      addTitle(hseSlide, "HSE Performance", "AINM, inspections, observations, calendar, and HSE action pressure.");
      addMetricCard(hseSlide, 0.6, 1.25, "HSE Score", displayPdfValue(hseScore === null ? null : `${hseScore}%`), chartColours.teal.replace("#", ""));
      addMetricCard(hseSlide, 3.75, 1.25, `${currentYear} Incidents`, displayPdfValue(snapshot.hse.incidentsThisYear), chartColours.blue.replace("#", ""));
      addMetricCard(hseSlide, 6.9, 1.25, `${currentYear} Accidents`, displayPdfValue(snapshot.hse.accidentsThisYear), chartColours.red.replace("#", ""));
      addMetricCard(hseSlide, 10.05, 1.25, "Open Observations", displayPdfValue(snapshot.hse.openObservations), chartColours.purple.replace("#", ""));
      addTableSlideRows(hseSlide, hsePressure, 0.6, 2.85, "HSE pressure points");

      const docsSlide = pptx.addSlide();
      addTitle(docsSlide, "Document Control", "Controlled document health, review pressure, and workflow movement.");
      addMetricCard(docsSlide, 0.6, 1.25, "Documents", displayPdfValue(snapshot.documents.total), chartColours.teal.replace("#", ""));
      addMetricCard(docsSlide, 3.75, 1.25, "Live", displayPdfValue(snapshot.documents.live), chartColours.green.replace("#", ""));
      addMetricCard(docsSlide, 6.9, 1.25, "Reviews Overdue", displayPdfValue(snapshot.documents.overdueReviews), chartColours.red.replace("#", ""));
      addMetricCard(docsSlide, 10.05, 1.25, "Workflow", displayPdfValue(snapshot.documents.pendingReviewApproval), chartColours.blue.replace("#", ""));
      addTableSlideRows(docsSlide, documentPressure, 0.6, 2.85, "Document control pressure points");

      const closeSlide = pptx.addSlide();
      addTitle(closeSlide, "CEO Review Actions", "Suggested agenda items based on the live snapshot.");
      [
        "Confirm owner and due date for any open NCRs, audit findings, and HSE AINMs.",
        "Review overdue document control pressure and unblock reviews or approvals.",
        "Confirm HSE action and calendar overdue items are visible to accountable managers.",
        "Use the live IMS module links for drill-down rather than editing source data from this pack.",
      ].forEach((text, index) => {
        closeSlide.addShape(pptx.ShapeType.roundRect, { x: 0.75, y: 1.35 + index * 0.8, w: 11.7, h: 0.52, rectRadius: 0.06, fill: { color: index % 2 ? "FFFFFF" : "EEF8F7" }, line: { color: "BFE5E3" } });
        closeSlide.addText(text, { x: 1, y: 1.52 + index * 0.8, w: 10.9, h: 0.18, fontSize: 10.5, color: "0F172A", margin: 0 });
      });

      function addTableSlideRows(slide: ReturnType<typeof pptx.addSlide>, rows: ChartDatum[], x: number, y: number, title: string) {
        slide.addText(title, { x, y: y - 0.42, w: 5, h: 0.25, fontSize: 15, bold: true, color: "0F172A", margin: 0 });
        rows.forEach((row, index) => {
          const rowY = y + index * 0.52;
          slide.addShape(pptx.ShapeType.roundRect, { x, y: rowY, w: 11.9, h: 0.4, rectRadius: 0.04, fill: { color: index % 2 ? "FFFFFF" : "F8FAFC" }, line: { color: "E2E8F0" } });
          slide.addShape(pptx.ShapeType.rect, { x, y: rowY, w: 0.12, h: 0.4, fill: { color: (row.fill || chartColours.teal).replace("#", "") }, line: { color: (row.fill || chartColours.teal).replace("#", "") } });
          slide.addText(row.name, { x: x + 0.28, y: rowY + 0.12, w: 4.8, h: 0.16, fontSize: 9.5, bold: true, color: "0F172A", margin: 0 });
          slide.addText(String(row.value), { x: x + 10.75, y: rowY + 0.12, w: 0.9, h: 0.16, fontSize: 9.5, bold: true, color: "0F172A", align: "right", margin: 0 });
        });
      }

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
        .mr-card,
        .mr-signal,
        .mr-focus-link {
          transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
        }
        .mr-card:hover,
        .mr-signal:hover,
        .mr-focus-link:hover {
          transform: translateY(-3px);
          box-shadow: 0 18px 34px rgba(15, 23, 42, 0.11);
          border-color: #BFE5E3;
        }
        .mr-live {
          animation: mrLiveGlow 1.9s ease-in-out infinite alternate;
        }
        @keyframes mrLiveGlow {
          from { box-shadow: 0 0 0 rgba(187,247,208,0); }
          to { box-shadow: 0 0 18px rgba(187,247,208,0.32); }
        }
        @media (max-width: 1100px) {
          .mr-command-grid,
          .mr-module-grid {
            grid-template-columns: 1fr !important;
          }
          .mr-kpi-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
        @media (max-width: 720px) {
          .mr-kpi-grid,
          .mr-signal-grid,
          .mr-focus-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <QualityPageHero
        label="MANAGEMENT REVIEW"
        title="CEO Business Snapshot"
        description="Executive view of business health across Quality, HSE, and Document Control with drill-down into the live source modules."
        contextCards={[
          { label: "Last Refreshed", value: lastRefreshed || "Loading..." },
          { label: "Review Pack", value: "PDF + PowerPoint export" },
        ]}
      />

      <ImsTopMetaRow
        backHref="/home"
        backLabel="Back to Home"
        actions={
          <>
            <ImsButton onClick={() => void loadSnapshot()} disabled={isLoading}>
              Refresh
            </ImsButton>
            <ImsButton onClick={() => void generateManagementReviewPdf()}>
              Export PDF
            </ImsButton>
            <ImsButton onClick={() => void generateManagementReviewPowerPoint()}>
              Export PowerPoint
            </ImsButton>
          </>
        }
        status={<><strong>Status:</strong> {isLoading ? "Loading..." : message}</>}
      />

      <section className="mr-command-grid" style={commandGridStyle}>
        <section style={businessScorePanelStyle}>
          <div>
            <span style={eyebrowStyle}>Executive Pulse</span>
            <h2 style={businessTitleStyle}>How healthy is the business control system today?</h2>
            <p style={businessCopyStyle}>
              A blended read-only signal from Quality closure, HSE pressure, and controlled-document health.
            </p>
          </div>
          <Link href="/management-review" style={scoreTileStyle}>
            <strong style={scoreValueStyle}>{businessScore === null ? "N/A" : `${businessScore}%`}</strong>
            <span style={scoreLabelStyle}>BUSINESS CONTROL</span>
          </Link>
        </section>

        <div className="mr-signal-grid" style={signalGridStyle}>
          {executiveSignals.map((item) => (
            <Link key={item.label} href={item.href} className="mr-signal" style={{ ...signalCardStyle, borderTopColor: item.tone }}>
              <span style={signalLabelStyle}>{item.label}</span>
              <strong style={signalValueStyle}>{item.value}</strong>
              <small style={signalDetailStyle}>{item.detail}</small>
            </Link>
          ))}
        </div>
      </section>

      <section className="mr-kpi-grid" style={kpiGridStyle}>
        <QualityKpiCard title="Quality Score" value={qualityScore === null ? "N/A" : `${qualityScore}%`} accent={qualityScore !== null && qualityScore >= 80 ? chartColours.green : chartColours.amber} href="/quality" />
        <QualityKpiCard title="HSE Score" value={hseScore === null ? "N/A" : `${hseScore}%`} accent={hseScore !== null && hseScore >= 80 ? chartColours.green : chartColours.amber} href="/hse" />
        <QualityKpiCard title="Document Health" value={documentHealth === null ? "N/A" : `${documentHealth}%`} accent={documentHealth !== null && documentHealth >= 80 ? chartColours.green : chartColours.amber} href="/documents" />
        <QualityKpiCard title="Management Attention" value={managementFocus.reduce((sum, item) => sum + Number(item.value || 0), 0)} accent={chartColours.red} href="/management-review" />
      </section>

      <section className="mr-focus-grid" style={focusGridStyle}>
        {managementFocus.map((item) => (
          <Link key={item.label} href={item.href} className="mr-focus-link" style={{ ...focusLinkStyle, borderColor: item.tone }}>
            <span>{item.label}</span>
            <strong>{displayValue(item.value)}</strong>
          </Link>
        ))}
      </section>

      <section className="mr-module-grid" style={moduleGridStyle}>
        <ModulePanel title="Quality" subtitle="NCRs, audit findings, MOCs, and Quality-owned actions." score={qualityScore} href="/quality">
          <ChartBlock data={qualityPressure} type="bar" />
          <MetricGrid>
            <Metric label="Open NCRs" value={snapshot.quality.openNcrs} tone={healthTone(snapshot.quality.openNcrs)} href="/ncr-capa?type=NCR&status=Open" />
            <Metric label="Open Findings" value={snapshot.quality.openAuditFindings} tone={healthTone(snapshot.quality.openAuditFindings)} href="/audits?view=open-findings" />
            <Metric label="Open MOCs" value={snapshot.quality.openMocs} tone={healthTone(snapshot.quality.openMocs)} href="/moc?status=Active" />
            <Metric label="Overdue Quality Actions" value={snapshot.quality.qualityOverdueActions} tone={healthTone(snapshot.quality.qualityOverdueActions)} href="/actions?view=register&department=Quality&overdue=1" />
          </MetricGrid>
        </ModulePanel>

        <ModulePanel title="HSE" subtitle="AINM, inspections, observations, calendar, and HSE actions." score={hseScore} href="/hse">
          <ChartBlock data={hsePressure} type="bar" />
          <MetricGrid>
            <Metric label="Open AINMs" value={snapshot.hse.openAinms} tone={healthTone(snapshot.hse.openAinms)} href="/hse/ainm?status=Open" />
            <Metric label={`${currentYear} Incidents`} value={snapshot.hse.incidentsThisYear} tone={positiveTone(snapshot.hse.incidentsThisYear)} href={`/hse/ainm?year=${currentYear}`} />
            <Metric label={`${currentYear} Accidents`} value={snapshot.hse.accidentsThisYear} tone={healthTone(snapshot.hse.accidentsThisYear)} href={`/hse/ainm?year=${currentYear}`} />
            <Metric label="High Risk Observations" value={snapshot.hse.highRiskObservations} tone={healthTone(snapshot.hse.highRiskObservations)} href="/hse/observations" />
          </MetricGrid>
        </ModulePanel>

        <ModulePanel title="Document Control" subtitle="Controlled-document health, reviews, and approval workflow." score={documentHealth} href="/documents">
          <ChartBlock data={documentPressure} type="pie" />
          <MetricGrid>
            <Metric label="Total Documents" value={snapshot.documents.total} tone={chartColours.teal} href="/documents" />
            <Metric label="Live Documents" value={snapshot.documents.live} tone={chartColours.green} href="/documents?status=Live" />
            <Metric label="Reviews Overdue" value={snapshot.documents.overdueReviews} tone={healthTone(snapshot.documents.overdueReviews)} href="/documents?review=Overdue" />
            <Metric label="Pending Workflow" value={snapshot.documents.pendingReviewApproval} tone={chartColours.blue} href="/documents?view=workflow" />
          </MetricGrid>
        </ModulePanel>
      </section>

      {snapshot.errors.length ? (
        <section style={panelStyle}>
          <ModuleSectionHeader title="Unavailable Metrics" subtitle="Affected metrics are shown as N/A so the review pack does not guess." />
          <ul style={errorListStyle}>
            {snapshot.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}

function ModulePanel({ title, subtitle, score, href, children }: { title: string; subtitle: string; score: CountValue; href: string; children: ReactNode }) {
  return (
    <section className="mr-card" style={modulePanelStyle}>
      <ModuleSectionHeader
        title={title}
        subtitle={subtitle}
        actions={
          <Link href={href} style={panelLinkStyle}>
            Open module
          </Link>
        }
      />
      <div style={moduleScoreRowStyle}>
        <span style={moduleScoreLabelStyle}>Control health</span>
        <strong style={{ ...moduleScoreValueStyle, color: score === null ? chartColours.slate : score >= 80 ? chartColours.green : score >= 60 ? chartColours.amber : chartColours.red }}>
          {score === null ? "N/A" : `${score}%`}
        </strong>
      </div>
      {children}
    </section>
  );
}

function MetricGrid({ children }: { children: ReactNode }) {
  return <div style={metricGridStyle}>{children}</div>;
}

function Metric({ label, value, tone, href }: { label: string; value: CountValue; tone: string; href?: string }) {
  const content = (
    <div style={metricCardStyle}>
      <div style={{ ...metricAccentStyle, background: tone }} />
      <div style={metricLabelStyle}>{label}</div>
      <div style={metricValueStyle}>{displayValue(value)}</div>
    </div>
  );
  return href ? <Link href={href} style={metricLinkStyle}>{content}</Link> : content;
}

function ChartBlock({ data, type }: { data: ChartDatum[]; type: "bar" | "pie" }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div style={emptyChartStyle}>Loading chart...</div>;
  if (!data.length || data.every((item) => item.value === 0)) return <div style={emptyChartStyle}>No chart data available yet.</div>;

  if (type === "pie") {
    return (
      <div style={chartWrapStyle}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={2}>
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={entry.fill || chartPalette[index % chartPalette.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div style={chartWrapStyle}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 12, right: 18, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={104} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="value" radius={[0, 8, 8, 0]}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={entry.fill || chartPalette[index % chartPalette.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const commandGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(320px, 1.2fr) minmax(360px, 1fr)",
  gap: "18px",
  marginBottom: "18px",
};

const businessScorePanelStyle: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  minHeight: "230px",
  borderRadius: "22px",
  padding: "26px",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 176px",
  alignItems: "center",
  gap: "20px",
  color: "#ffffff",
  background: `linear-gradient(135deg, ${imsColours.brand} 0%, #18474c 100%)`,
  boxShadow: imsShadows.hero,
};

const eyebrowStyle: CSSProperties = {
  display: "block",
  marginBottom: "10px",
  color: "#dff7f5",
  fontSize: "12px",
  fontWeight: 900,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const businessTitleStyle: CSSProperties = {
  margin: 0,
  maxWidth: "620px",
  fontSize: "clamp(30px, 4vw, 48px)",
  lineHeight: 1.02,
  fontWeight: 950,
};

const businessCopyStyle: CSSProperties = {
  margin: "14px 0 0",
  maxWidth: "610px",
  color: "#effdfc",
  lineHeight: 1.55,
  fontSize: "14px",
  fontWeight: 700,
};

const scoreTileStyle: CSSProperties = {
  minHeight: "126px",
  borderRadius: "18px",
  border: "1px solid rgba(255,255,255,0.26)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.08))",
  color: "#ffffff",
  textDecoration: "none",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  boxShadow: "inset 0 0 28px rgba(255,255,255,0.10), 0 14px 28px rgba(15, 23, 42, 0.16)",
};

const scoreValueStyle: CSSProperties = {
  fontSize: "42px",
  lineHeight: 1,
  fontWeight: 950,
};

const scoreLabelStyle: CSSProperties = {
  color: "rgba(255,255,255,0.8)",
  fontSize: "10px",
  fontWeight: 900,
  letterSpacing: "0.1em",
};

const signalGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "14px",
};

const signalCardStyle: CSSProperties = {
  minHeight: "108px",
  padding: "16px",
  borderRadius: "18px",
  border: `1px solid ${imsColours.border}`,
  borderTop: "5px solid",
  background: "#ffffff",
  color: imsColours.ink,
  textDecoration: "none",
  boxShadow: imsShadows.panel,
  display: "grid",
  gap: "8px",
};

const signalLabelStyle: CSSProperties = {
  color: imsColours.slate,
  fontSize: "12px",
  fontWeight: 900,
};

const signalValueStyle: CSSProperties = {
  fontSize: "30px",
  lineHeight: 1,
};

const signalDetailStyle: CSSProperties = {
  color: imsColours.slate,
  lineHeight: 1.35,
  fontWeight: 700,
};

const kpiGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "14px",
  marginBottom: "18px",
};

const focusGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "12px",
  marginBottom: "20px",
};

const focusLinkStyle: CSSProperties = {
  minHeight: "64px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "14px",
  padding: "14px 16px",
  borderRadius: "16px",
  border: "1px solid",
  background: "#ffffff",
  color: imsColours.ink,
  textDecoration: "none",
  boxShadow: imsShadows.panel,
  fontWeight: 900,
};

const moduleGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "18px",
};

const modulePanelStyle: CSSProperties = {
  ...imsPanelStyle,
  minHeight: "100%",
  background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
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
  fontSize: "24px",
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
  background: "#f8fafc",
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
  fontSize: "26px",
  fontWeight: 950,
  lineHeight: 1,
};

const chartWrapStyle: CSSProperties = {
  width: "100%",
  height: "230px",
  minHeight: "230px",
  marginBottom: "14px",
  border: `1px solid ${imsColours.borderSoft}`,
  borderRadius: "14px",
  background: "#f8fafc",
  padding: "10px",
  boxSizing: "border-box",
};

const emptyChartStyle: CSSProperties = {
  minHeight: "230px",
  marginBottom: "14px",
  border: "1px dashed #cbd5e1",
  borderRadius: "14px",
  background: "#f8fafc",
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
  color: "#92400e",
};

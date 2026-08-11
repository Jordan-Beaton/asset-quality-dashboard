"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { QualityPageHero } from "../../../src/components/QualityPageHero";
import { useImsPermissions } from "../../../src/components/ImsPermissions";
import { supabase } from "../../../src/lib/supabase";

export const dynamic = "force-dynamic";

type AinmRecord = {
  id: string;
  ainm_number: string | null;
  event_date: string | null;
  event_classification: string | null;
  overall_status: string | null;
  notification_status: string | null;
  part1_status: string | null;
  part2_status: string | null;
  updated_at: string | null;
};

type InspectionRecord = {
  id: string;
  status: string | null;
  inspection_date: string | null;
};

type ObservationRecord = {
  id: string;
  created_at: string | null;
  reporter_type: string | null;
  observation_type: string | null;
};

type ActionRecord = {
  id: string;
  department: string | null;
  source: string | null;
  status: string | null;
  priority: string | null;
  due_date: string | null;
  created_at: string | null;
};

type GeneratedDocument = {
  id: string;
  document_stage: string | null;
  generated_at: string | null;
};

type HseMonthlyReport = {
  id: string;
  month_label: string;
  summary: string | null;
  next_steps: string | null;
  snapshot_json: Record<string, unknown> | null;
  created_at: string | null;
};

const monthOptions = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const currentDate = new Date();

function normalise(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function isClosed(value: string | null | undefined) {
  const status = normalise(value);
  return status === "closed" || status === "complete" || status === "completed";
}

function isOpen(value: string | null | undefined) {
  return !isClosed(value) && normalise(value) !== "cancelled";
}

function isSameMonth(value: string | null | undefined, monthIndex: number, year: number) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getFullYear() === year && date.getMonth() === monthIndex;
}

function daysUntil(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  date.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86400000);
}

function isHseAction(action: ActionRecord) {
  const department = normalise(action.department);
  const source = normalise(action.source);
  return (
    department === "hse" ||
    source === "hse" ||
    source === "ainm" ||
    source === "hse inspection" ||
    source === "observation" ||
    source === "ptw"
  );
}

function ainmType(record: AinmRecord) {
  const number = (record.ainm_number || "").trim().toUpperCase();
  if (number.startsWith("AR")) return "Accident";
  if (number.startsWith("IR")) return "Incident";
  return normalise(record.event_classification).includes("accident") ? "Accident" : "Incident";
}

function formatDateTime(value: Date | null) {
  if (!value) return "-";
  return value.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSavedDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function snapshotValue(snapshot: Record<string, unknown> | null | undefined, key: string) {
  const value = snapshot?.[key];
  if (typeof value === "number" || typeof value === "string") return value;
  return "-";
}

function getMonthIndexFromLabel(monthLabel: string) {
  const monthName = monthLabel.split(" ")[0];
  const index = monthOptions.findIndex((month) => month.toLowerCase() === monthName.toLowerCase());
  return index >= 0 ? index : currentDate.getMonth();
}

function getYearFromLabel(monthLabel: string) {
  const match = monthLabel.match(/\b(20\d{2})\b/);
  return match ? match[1] : String(currentDate.getFullYear());
}

function getReportPeriodFromSavedReport(report: HseMonthlyReport) {
  const snapshot = report.snapshot_json || {};
  const snapshotMonth =
    typeof snapshot.report_month === "number" && snapshot.report_month >= 1 && snapshot.report_month <= 12
      ? snapshot.report_month - 1
      : null;
  const snapshotYear =
    typeof snapshot.report_year === "number" && snapshot.report_year >= 2000 ? String(snapshot.report_year) : null;

  return {
    monthIndex: snapshotMonth ?? getMonthIndexFromLabel(report.month_label),
    year: snapshotYear ?? getYearFromLabel(report.month_label),
  };
}

function getSnapshotSummary(report: HseMonthlyReport) {
  return [
    `${snapshotValue(report.snapshot_json, "ainm_raised")} AINMs`,
    `${snapshotValue(report.snapshot_json, "open_hse_actions")} open actions`,
    `${snapshotValue(report.snapshot_json, "observations_raised")} observations`,
  ].join(" | ");
}

function buildPdfMetricTable(
  doc: jsPDF,
  startY: number,
  title: string,
  rows: Array<[string, string | number]>
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(title, 14, startY);

  autoTable(doc, {
    startY: startY + 4,
    head: [["Metric", "Value"]],
    body: rows.map(([label, value]) => [label, String(value)]),
    theme: "grid",
    margin: { left: 14, right: 14 },
    styles: {
      fontSize: 9.2,
      cellPadding: 3,
      textColor: [0, 0, 0],
      lineColor: [208, 208, 206],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [0, 86, 112],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 120 },
      1: { halign: "right", cellWidth: 52 },
    },
    alternateRowStyles: { fillColor: [236, 236, 231] },
    rowPageBreak: "avoid",
  });

  return ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || startY) + 8;
}

export default function HseReportsPage() {
  const imsPermissions = useImsPermissions();
  const [ainms, setAinms] = useState<AinmRecord[]>([]);
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [observations, setObservations] = useState<ObservationRecord[]>([]);
  const [actions, setActions] = useState<ActionRecord[]>([]);
  const [generatedDocuments, setGeneratedDocuments] = useState<GeneratedDocument[]>([]);
  const [reports, setReports] = useState<HseMonthlyReport[]>([]);
  const [monthIndex, setMonthIndex] = useState(currentDate.getMonth());
  const [year, setYear] = useState(String(currentDate.getFullYear()));
  const [executiveSummary, setExecutiveSummary] = useState("");
  const [nextMonthFocus, setNextMonthFocus] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDraftingSummary, setIsDraftingSummary] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [savedReportSearch, setSavedReportSearch] = useState("");
  const [savedReportYearFilter, setSavedReportYearFilter] = useState("All Years");
  const [showSavedReportFilters, setShowSavedReportFilters] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [message, setMessage] = useState("Loading HSE monthly management reporting workspace...");

  const canCreateReport = useMemo(() => {
    return imsPermissions.loaded && (imsPermissions.isMasterAdmin || imsPermissions.fullAccess || imsPermissions.canCreate);
  }, [imsPermissions.canCreate, imsPermissions.fullAccess, imsPermissions.isMasterAdmin, imsPermissions.loaded]);

  const canEditReport = useMemo(() => {
    return imsPermissions.loaded && (imsPermissions.isMasterAdmin || imsPermissions.fullAccess || imsPermissions.canEdit);
  }, [imsPermissions.canEdit, imsPermissions.fullAccess, imsPermissions.isMasterAdmin, imsPermissions.loaded]);

  async function loadReportsData() {
    const [ainmRes, inspectionRes, observationRes, actionRes, generatedRes, reportsRes] = await Promise.all([
      supabase.from("hse_ainm_records").select("id,ainm_number,event_date,event_classification,overall_status,notification_status,part1_status,part2_status,updated_at"),
      supabase.from("hse_inspection_records").select("id,status,inspection_date"),
      supabase.from("hse_observations").select("id,created_at,reporter_type,observation_type"),
      supabase.from("actions").select("id,department,source,status,priority,due_date,created_at"),
      supabase.from("hse_ainm_generated_documents").select("id,document_stage,generated_at"),
      supabase.from("hse_monthly_reports").select("*").order("created_at", { ascending: false }),
    ]);

    const warnings = [ainmRes, inspectionRes, observationRes, actionRes, generatedRes, reportsRes]
      .map((result) => result.error?.message)
      .filter(Boolean);

    setAinms((ainmRes.data || []) as AinmRecord[]);
    setInspections((inspectionRes.data || []) as InspectionRecord[]);
    setObservations((observationRes.data || []) as ObservationRecord[]);
    setActions(((actionRes.data || []) as ActionRecord[]).filter(isHseAction));
    setGeneratedDocuments((generatedRes.data || []) as GeneratedDocument[]);
    setReports((reportsRes.data || []) as HseMonthlyReport[]);
    setLastRefreshed(new Date());
    setMessage(warnings.length ? `Loaded with warning: ${warnings[0]}` : "HSE monthly management reporting workspace loaded.");
  }

  useEffect(() => {
    void loadReportsData();
  }, []);

  const selectedYear = Number(year) || currentDate.getFullYear();
  const metrics = useMemo(() => {
    const monthAinms = ainms.filter((record) => isSameMonth(record.event_date, monthIndex, selectedYear));
    const monthInspections = inspections.filter((record) => isSameMonth(record.inspection_date, monthIndex, selectedYear));
    const monthObservations = observations.filter((record) => isSameMonth(record.created_at, monthIndex, selectedYear));
    const monthActions = actions.filter((record) => isSameMonth(record.created_at, monthIndex, selectedYear));
    const monthGenerated = generatedDocuments.filter((record) => isSameMonth(record.generated_at, monthIndex, selectedYear));
    const openActions = actions.filter((record) => isOpen(record.status));
    const overdueActions = openActions.filter((record) => {
      const diff = daysUntil(record.due_date);
      return diff !== null && diff < 0;
    });
    const due30 = openActions.filter((record) => {
      const diff = daysUntil(record.due_date);
      return diff !== null && diff >= 0 && diff <= 30;
    });
    const openAinms = ainms.filter((record) => isOpen(record.overall_status));
    const closedAinmsInMonth = ainms.filter((record) => isClosed(record.overall_status) && isSameMonth(record.updated_at, monthIndex, selectedYear));
    const compiledPacks = generatedDocuments.filter((record) => normalise(record.document_stage) === "compiled-pdf");

    return {
      monthLabel: `${monthOptions[monthIndex]} ${selectedYear}`,
      monthAinms,
      incidents: monthAinms.filter((record) => ainmType(record) === "Incident").length,
      accidents: monthAinms.filter((record) => ainmType(record) === "Accident").length,
      openAinms: openAinms.length,
      openAinmsRaisedInMonth: monthAinms.filter((record) => isOpen(record.overall_status)).length,
      closedAinmsRaisedInMonth: monthAinms.filter((record) => isClosed(record.overall_status)).length,
      closedAinmsInMonth: closedAinmsInMonth.length,
      notificationComplete: ainms.filter((record) => normalise(record.notification_status) === "complete").length,
      part1Complete: ainms.filter((record) => normalise(record.part1_status) === "complete").length,
      part2Complete: ainms.filter((record) => normalise(record.part2_status) === "complete").length,
      inspectionsCompleted: monthInspections.filter((record) => isClosed(record.status)).length,
      inspectionsOpen: inspections.filter((record) => isOpen(record.status)).length,
      totalInspections: inspections.length,
      observationsRaised: monthObservations.length,
      contractorClientObservations: monthObservations.filter((record) => {
        const type = normalise(record.reporter_type);
        return type === "contractor" || type === "client";
      }).length,
      employeeObservations: monthObservations.filter((record) => normalise(record.reporter_type) === "employee").length,
      visitorObservations: monthObservations.filter((record) => normalise(record.reporter_type) === "visitor").length,
      actionsRaised: monthActions.length,
      openActions: openActions.length,
      overdueActions: overdueActions.length,
      due30: due30.length,
      highPriorityActions: openActions.filter((record) => normalise(record.priority) === "high").length,
      reportsGenerated: monthGenerated.length,
      compiledPacks: compiledPacks.length,
      totalGenerated: generatedDocuments.length,
    };
  }, [actions, ainms, generatedDocuments, inspections, monthIndex, observations, selectedYear]);

  const summaryDraftPayload = useMemo(() => ({
    monthLabel: metrics.monthLabel,
    metrics: {
      hseAinmsRaisedInMonth: metrics.monthAinms.length,
      hseIncidentsRaisedInMonth: metrics.incidents,
      hseAccidentsRaisedInMonth: metrics.accidents,
      hseOpenAinms: metrics.openAinms,
      hseNotificationsComplete: metrics.notificationComplete,
      hsePart1Complete: metrics.part1Complete,
      hsePart2Complete: metrics.part2Complete,
      hseCompiledAinmPacks: metrics.compiledPacks,
      hseInspectionsCompletedInMonth: metrics.inspectionsCompleted,
      hseOpenInspections: metrics.inspectionsOpen,
      hseObservationsRaisedInMonth: metrics.observationsRaised,
      hseContractorClientObservations: metrics.contractorClientObservations,
      hseActionsRaisedInMonth: metrics.actionsRaised,
      hseOpenActions: metrics.openActions,
      hseOverdueActions: metrics.overdueActions,
      hseActionsDueInNext30Days: metrics.due30,
      hseHighPriorityOpenActions: metrics.highPriorityActions,
      hseReportsGeneratedInMonth: metrics.reportsGenerated,
    },
  }), [metrics]);

  const currentSnapshot = useMemo(() => ({
    report_month: monthIndex + 1,
    report_year: selectedYear,
    month_label: metrics.monthLabel,
    ainm_raised: metrics.monthAinms.length,
    incidents: metrics.incidents,
    accidents: metrics.accidents,
    open_ainms: metrics.openAinms,
    raised_still_open: metrics.openAinmsRaisedInMonth,
    raised_now_closed: metrics.closedAinmsRaisedInMonth,
    ainms_closed_in_month: metrics.closedAinmsInMonth,
    hse_actions_raised: metrics.actionsRaised,
    open_hse_actions: metrics.openActions,
    overdue_hse_actions: metrics.overdueActions,
    actions_due_30_days: metrics.due30,
    inspections_completed: metrics.inspectionsCompleted,
    open_inspections: metrics.inspectionsOpen,
    total_inspections: metrics.totalInspections,
    observations_raised: metrics.observationsRaised,
    contractor_client_observations: metrics.contractorClientObservations,
    employee_observations: metrics.employeeObservations,
    visitor_observations: metrics.visitorObservations,
    reports_generated: metrics.reportsGenerated,
    generated_report_files: metrics.totalGenerated,
    compiled_ainm_packs: metrics.compiledPacks,
  }), [metrics, monthIndex, selectedYear]);

  const latestReportLabel = useMemo(() => {
    const latest = reports[0];
    return latest ? latest.month_label : "No saved reports";
  }, [reports]);

  const savedReportYearOptions = useMemo(() => {
    const years = reports
      .map((report) => {
        const snapshotYear = report.snapshot_json?.report_year;
        if (typeof snapshotYear === "number" && snapshotYear >= 2000) return String(snapshotYear);
        return (report.month_label || "").match(/\b(20\d{2})\b/)?.[1] || "";
      })
      .filter(Boolean);
    return ["All Years", ...Array.from(new Set(years)).sort((a, b) => Number(b) - Number(a))];
  }, [reports]);

  const filteredReports = useMemo(() => {
    const query = savedReportSearch.trim().toLowerCase();
    return reports.filter((report) => {
      const haystack = [report.month_label, report.summary, report.next_steps, formatSavedDate(report.created_at)].join(" ").toLowerCase();
      const matchesSearch = !query || haystack.includes(query);
      const snapshotYear = report.snapshot_json?.report_year;
      const year =
        typeof snapshotYear === "number" && snapshotYear >= 2000
          ? String(snapshotYear)
          : (report.month_label || "").match(/\b(20\d{2})\b/)?.[1] || "";
      const matchesYear = savedReportYearFilter === "All Years" || year === savedReportYearFilter;
      return matchesSearch && matchesYear;
    });
  }, [reports, savedReportSearch, savedReportYearFilter]);

  function resetForm() {
    setMonthIndex(currentDate.getMonth());
    setYear(String(currentDate.getFullYear()));
    setExecutiveSummary("");
    setNextMonthFocus("");
    setEditingId(null);
  }

  function handleEdit(report: HseMonthlyReport) {
    if (!canEditReport) {
      setMessage("Read-only access: you do not have permission to edit HSE monthly reports.");
      return;
    }

    const period = getReportPeriodFromSavedReport(report);
    setEditingId(report.id);
    setMonthIndex(period.monthIndex);
    setYear(period.year);
    setExecutiveSummary(report.summary || "");
    setNextMonthFocus(report.next_steps || "");
    setMessage(`Editing HSE monthly report for ${report.month_label}.`);
    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 50);
  }

  async function handleDelete(id: string) {
    if (!canEditReport) {
      setMessage("Read-only access: you do not have permission to delete HSE monthly reports.");
      return;
    }

    const confirmed = window.confirm("Delete this saved HSE monthly report?");
    if (!confirmed) return;

    const { error } = await supabase.from("hse_monthly_reports").delete().eq("id", id);
    if (error) {
      setMessage(`Delete failed: ${error.message}`);
      return;
    }

    if (editingId === id) resetForm();
    setMessage("HSE monthly report deleted successfully.");
    await loadReportsData();
  }

  async function saveMonthlyReport(event: FormEvent) {
    event.preventDefault();
    if (editingId && !canEditReport) {
      setMessage("Read-only access: you do not have permission to update HSE monthly reports.");
      return;
    }
    if (!editingId && !canCreateReport) {
      setMessage("Read-only access: you do not have permission to create HSE monthly reports.");
      return;
    }

    if (!Number.isFinite(selectedYear) || selectedYear < 2000) {
      setMessage("Enter a valid report year.");
      return;
    }

    const payload = {
        month_label: metrics.monthLabel,
        summary: executiveSummary.trim() || null,
        wins: null,
        risks: null,
        next_steps: nextMonthFocus.trim() || null,
        snapshot_json: currentSnapshot,
      };

    const { error } = editingId
      ? await supabase.from("hse_monthly_reports").update(payload).eq("id", editingId)
      : await supabase.from("hse_monthly_reports").insert([payload]);

    if (error) {
      setMessage(`${editingId ? "Update" : "Save"} report failed: ${error.message}`);
      return;
    }

    setMessage(editingId ? "HSE monthly management report updated successfully." : "HSE monthly management report saved successfully.");
    resetForm();
    await loadReportsData();
  }

  async function draftExecutiveSummaryWithAi() {
    if (executiveSummary.trim()) {
      const confirmed = window.confirm("Executive Summary already contains text. Replace it with a new AI draft?");
      if (!confirmed) return;
    }

    try {
      setIsDraftingSummary(true);
      setMessage("Drafting HSE executive summary with AI...");

      const response = await fetch("/api/report-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(summaryDraftPayload),
      });

      const data = (await response.json()) as { summary?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "AI draft request failed.");
      if (!data.summary?.trim()) throw new Error("AI draft returned no summary text.");

      setExecutiveSummary(data.summary.trim());
      setMessage(`Executive Summary draft generated for ${metrics.monthLabel}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "AI draft failed.");
    } finally {
      setIsDraftingSummary(false);
    }
  }

  async function generatePdfReport(sourceReport?: HseMonthlyReport) {
    try {
      setIsGeneratingPdf(true);
      const snapshot = sourceReport?.snapshot_json || currentSnapshot;
      const monthLabel = sourceReport?.month_label || metrics.monthLabel;
      const summary = (sourceReport?.summary ?? executiveSummary).trim();
      const focus = (sourceReport?.next_steps ?? nextMonthFocus).trim();

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;

      try {
        const logoResponse = await fetch("/enshore-primary-logo-colour.png");
        if (logoResponse.ok) {
          const logoBlob = await logoResponse.blob();
          const reader = new FileReader();
          const logoDataUrl = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(logoBlob);
          });
          doc.addImage(logoDataUrl, "PNG", margin, 10, 48, 24);
        }
      } catch {
        // PDF can still be produced without the logo.
      }

      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(20);
      doc.text("Monthly Management Report", pageWidth - margin, 18, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(83, 86, 90);
      doc.text(monthLabel, pageWidth - margin, 25, { align: "right" });
      doc.text(`Generated: ${new Date().toLocaleString("en-GB")}`, pageWidth - margin, 31, { align: "right" });

      doc.setDrawColor(0, 86, 112);
      doc.setLineWidth(0.7);
      doc.line(margin, 37, pageWidth - margin, 37);

      let y = 45;
      if (summary) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.text("Executive Summary", margin, y);
        y += 5;

        doc.setFont("helvetica", "normal");
        doc.setTextColor(83, 86, 90);
        doc.setFontSize(10.2);
        const lines = doc.splitTextToSize(summary, pageWidth - margin * 2);
        doc.text(lines, margin, y);
        y += lines.length * 4.5 + 7;
      }

      y = buildPdfMetricTable(doc, y, "A. AINM Summary", [
        ["AINMs raised in month", snapshotValue(snapshot, "ainm_raised")],
        ["Incidents raised in month", snapshotValue(snapshot, "incidents")],
        ["Accidents raised in month", snapshotValue(snapshot, "accidents")],
        ["Total open AINMs", snapshotValue(snapshot, "open_ainms")],
      ]);

      y = buildPdfMetricTable(doc, y, "B. AINM Workflow", [
        ["AINMs raised in month", snapshotValue(snapshot, "ainm_raised")],
        ["Raised and still open", snapshotValue(snapshot, "raised_still_open")],
        ["Raised and now closed", snapshotValue(snapshot, "raised_now_closed")],
        ["AINMs closed in month", snapshotValue(snapshot, "ainms_closed_in_month")],
      ]);

      y = buildPdfMetricTable(doc, y, "C. HSE Actions", [
        ["Actions raised in month", snapshotValue(snapshot, "hse_actions_raised")],
        ["Open HSE actions", snapshotValue(snapshot, "open_hse_actions")],
        ["Overdue HSE actions", snapshotValue(snapshot, "overdue_hse_actions")],
        ["Actions due in next 30 days", snapshotValue(snapshot, "actions_due_30_days")],
      ]);

      y = buildPdfMetricTable(doc, y, "D. Inspections", [
        ["Inspections completed in month", snapshotValue(snapshot, "inspections_completed")],
        ["Open inspections", snapshotValue(snapshot, "open_inspections")],
        ["Total inspection records", snapshotValue(snapshot, "total_inspections")],
        ["Inspection completion pressure", Number(snapshotValue(snapshot, "open_inspections")) > 0 ? "Open items remain" : "Clear"],
      ]);

      y = buildPdfMetricTable(doc, y, "E. Observations", [
        ["Observations raised in month", snapshotValue(snapshot, "observations_raised")],
        ["Contractor / client observations", snapshotValue(snapshot, "contractor_client_observations")],
        ["Employee observations", snapshotValue(snapshot, "employee_observations")],
        ["Visitor observations", snapshotValue(snapshot, "visitor_observations")],
      ]);

      y = buildPdfMetricTable(doc, y, "F. Reports", [
        ["Reports generated in month", snapshotValue(snapshot, "reports_generated")],
        ["Total generated report files", snapshotValue(snapshot, "generated_report_files")],
        ["Compiled AINM packs", snapshotValue(snapshot, "compiled_ainm_packs")],
        ["Management pack period", monthLabel],
      ]);

      if (focus) {
        if (y + 28 > pageHeight - 18) {
          doc.addPage();
          y = 18;
        }

        y += 10;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.text("Next Month Focus / Planned Activity", margin, y);
        y += 5;

        doc.setFont("helvetica", "normal");
        doc.setTextColor(83, 86, 90);
        doc.setFontSize(10.2);
        const lines = doc.splitTextToSize(focus, pageWidth - margin * 2);
        doc.text(lines, margin, y);
      }

      const pageCount = doc.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) {
        doc.setPage(page);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(83, 86, 90);
        doc.text(`Enshore Subsea | ${monthLabel}`, margin, pageHeight - 8);
        doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 8, {
          align: "right",
        });
      }

      const filename = `HSE-Monthly-Management-Report-${monthLabel.replace(/\s+/g, "-")}.pdf`;
      const pdfBlob = doc.output("blob");
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, "_blank", "noopener,noreferrer");
      doc.save(filename);
      setMessage(`Generated PDF for ${monthLabel}.`);
    } catch (error) {
      setMessage(error instanceof Error ? `PDF generation failed: ${error.message}` : "PDF generation failed.");
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  const reportCards = [
    {
      title: "A. AINM Summary",
      rows: [
        ["AINMs raised in month", metrics.monthAinms.length],
        ["Incidents raised in month", metrics.incidents],
        ["Accidents raised in month", metrics.accidents],
        ["Total open AINMs", metrics.openAinms],
      ],
      note: "Internal AINM records only. External AINMs remain controlled separately unless deliberately included.",
    },
    {
      title: "B. AINM Workflow",
      rows: [
        ["AINMs raised in month", metrics.monthAinms.length],
        ["Raised and still open", metrics.openAinmsRaisedInMonth],
        ["Raised and now closed", metrics.closedAinmsRaisedInMonth],
        ["AINMs closed in month", metrics.closedAinmsInMonth],
      ],
    },
    {
      title: "C. HSE Actions",
      rows: [
        ["Actions raised in month", metrics.actionsRaised],
        ["Total open HSE actions", metrics.openActions],
        ["Overdue HSE actions", metrics.overdueActions],
        ["Due in next 30 days", metrics.due30],
      ],
    },
    {
      title: "D. Inspections",
      rows: [
        ["Inspections completed in month", metrics.inspectionsCompleted],
        ["Open inspections", metrics.inspectionsOpen],
        ["Total inspection records", metrics.totalInspections],
        ["Inspection completion pressure", metrics.inspectionsOpen ? "Open items remain" : "Clear"],
      ],
    },
    {
      title: "E. Observations",
      rows: [
        ["Observations raised in month", metrics.observationsRaised],
        ["Contractor / client observations", metrics.contractorClientObservations],
        ["Employee observations", metrics.employeeObservations],
        ["Visitor observations", metrics.visitorObservations],
      ],
    },
    {
      title: "F. Reports",
      rows: [
        ["Reports generated in month", metrics.reportsGenerated],
        ["Total generated report files", metrics.totalGenerated],
        ["Compiled AINM packs", metrics.compiledPacks],
        ["Management pack period", metrics.monthLabel],
      ],
    },
  ];

  return (
    <main>
      <QualityPageHero
        label="HSE MANAGEMENT REPORTING"
        title="Reports"
        description="Generate concise monthly HSE management summaries from live AINM, inspection, observation, action, and report data."
        contextCards={[
          {
            label: "Last Refreshed",
            value: lastRefreshed
              ? lastRefreshed.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
              : "-",
          },
          { label: "Latest Report", value: latestReportLabel },
        ]}
      />

      <div className="ims-top-meta-row" style={topMetaRowStyle}>
        <Link href="/home" style={backLinkStyle}>
          &larr; Back to IMS Home
        </Link>
        <div style={{ ...statusBannerStyle, marginBottom: 0, borderRadius: "12px", padding: "8px 12px" }}>
          <strong>Status:</strong> {message}
        </div>
      </div>
      <div className="ims-page-actions">
          <button type="button" style={secondaryButtonStyle}>
            Use /enshore-primary-logo-colour.png
          </button>
          <button type="button" style={pdfButtonStyle} onClick={() => void generatePdfReport()} disabled={isGeneratingPdf}>
            {isGeneratingPdf ? "Generating PDF..." : "Generate Monthly PDF"}
          </button>
      </div>

      <section style={twoColumnGridStyle}>
        <div style={panelStyle}>
          <div style={sectionHeaderRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Create Monthly Management Report</h2>
              <p style={sectionSubtitleStyle}>
                Choose the reporting month and generate a concise HSE management pack from verified live data fields.
              </p>
            </div>
          </div>

          <form onSubmit={saveMonthlyReport}>
            <div style={formGridStyle}>
              <label style={fieldLabelStyle}>
                <span>Month</span>
                <select value={monthIndex} onChange={(event) => setMonthIndex(Number(event.target.value))} style={inputStyle}>
                  {monthOptions.map((month, index) => (
                    <option key={month} value={index}>
                      {month}
                    </option>
                  ))}
                </select>
              </label>

              <label style={fieldLabelStyle}>
                <span>Year</span>
                <input value={year} onChange={(event) => setYear(event.target.value)} style={inputStyle} inputMode="numeric" />
              </label>
            </div>

            <div style={narrativeStackStyle}>
              <label style={fieldLabelStyle}>
                <span style={narrativeHeaderRowStyle}>
                  <span>Executive Summary</span>
                  <button type="button" style={secondaryButtonStyle} onClick={() => void draftExecutiveSummaryWithAi()} disabled={isDraftingSummary}>
                    {isDraftingSummary ? "Drafting..." : "Draft Executive Summary with AI"}
                  </button>
                </span>
                <textarea
                  style={textareaStyle}
                  rows={4}
                  value={executiveSummary}
                  onChange={(event) => setExecutiveSummary(event.target.value)}
                  placeholder="Optional short HSE management summary for this month."
                />
              </label>

              <label style={fieldLabelStyle}>
                <span>Next Month Focus / Planned Activity</span>
                <textarea
                  style={textareaStyle}
                  rows={4}
                  value={nextMonthFocus}
                  onChange={(event) => setNextMonthFocus(event.target.value)}
                  placeholder="Optional forward-look for next month."
                />
              </label>
            </div>

            <div style={periodPreviewStyle}>
              <strong>Report Period:</strong> {metrics.monthLabel}
            </div>

            <div style={buttonRowStyle}>
              <button type="submit" style={primaryButtonStyle} disabled={editingId ? !canEditReport : !canCreateReport}>
                {editingId ? "Update Monthly Report" : "Save Monthly Report"}
              </button>
              {editingId ? (
                <button type="button" style={secondaryButtonStyle} onClick={resetForm}>
                  Cancel Edit
                </button>
              ) : null}
            </div>
          </form>
        </div>

        <div style={panelStyle}>
          <div style={sectionHeaderRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Management Snapshot</h2>
              <p style={sectionSubtitleStyle}>
                Live monthly HSE summary blocks used to build the management PDF.
              </p>
            </div>
          </div>

          <div style={snapshotCardsWrapStyle}>
            {reportCards.map((card) => (
              <div key={card.title} style={snapshotCardStyle}>
                <div style={snapshotCardTitleStyle}>{card.title}</div>
                <div style={snapshotRowsWrapStyle}>
                  {card.rows.map(([label, value]) => (
                    <div key={`${card.title}-${label}`} style={snapshotRowStyle}>
                      <span style={snapshotLabelStyle}>{label}</span>
                      <strong style={snapshotValueStyle}>{value}</strong>
                    </div>
                  ))}
                </div>
                {"note" in card && card.note ? <div style={snapshotNoteStyle}>{card.note}</div> : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={panelStyle}>
        <div style={sectionHeaderRowStyle}>
          <div>
            <h2 style={sectionTitleStyle}>Saved Monthly Reports</h2>
            <p style={sectionSubtitleStyle}>
              Reopen saved HSE monthly management periods and generate the concise PDF directly from each row.
            </p>
          </div>
          <div style={registerCountStyle}>{filteredReports.length} of {reports.length} reports</div>
        </div>

        <div className="ims-filter-panel" style={filterPanelStyle}>
          <div style={filterActionRowStyle}>
            <input
              value={savedReportSearch}
              onChange={(event) => setSavedReportSearch(event.target.value)}
              style={inputStyle}
              placeholder="Search saved reports"
            />
            <button type="button" style={showSavedReportFilters ? secondaryButtonStyle : primaryButtonStyle} onClick={() => setShowSavedReportFilters((current) => !current)}>
              {showSavedReportFilters ? "Hide Filters" : "Show Filters"}
            </button>
          </div>
          {showSavedReportFilters ? (
            <div className="ims-filter-panel" style={toolbarFiltersStyle}>
              <select
                value={savedReportYearFilter}
                onChange={(event) => setSavedReportYearFilter(event.target.value)}
                style={inputStyle}
              >
                {savedReportYearOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <button
                type="button"
                style={secondaryButtonStyle}
                onClick={() => {
                  setSavedReportSearch("");
                  setSavedReportYearFilter("All Years");
                }}
              >
                Clear Filters
              </button>
            </div>
          ) : null}
        </div>

        {filteredReports.length === 0 ? (
          <p style={emptyTextStyle}>No HSE monthly reports saved yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={tableHeadStyle}>Month</th>
                  <th style={tableHeadStyle}>Snapshot</th>
                  <th style={tableHeadStyle}>Created</th>
                  <th style={tableHeadStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => (
                  <tr key={report.id}>
                    <td style={tableCellStyle}>{report.month_label}</td>
                    <td style={tableCellStyle}>{getSnapshotSummary(report)}</td>
                    <td style={tableCellStyle}>{formatSavedDate(report.created_at)}</td>
                    <td style={tableCellStyle}>
                      <div style={actionButtonsWrapStyle}>
                        <button type="button" style={miniButtonStyle} onClick={() => void generatePdfReport(report)} disabled={isGeneratingPdf}>
                          PDF
                        </button>
                        <button type="button" style={miniButtonStyle} onClick={() => handleEdit(report)} disabled={!canEditReport}>
                          Edit
                        </button>
                        <button type="button" style={miniButtonDeleteStyle} onClick={() => void handleDelete(report.id)} disabled={!canEditReport}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

const backLinkStyle: CSSProperties = {
  color: "#005670",
  fontWeight: 700,
  textDecoration: "none",
};

const topMetaRowStyle: CSSProperties = {
  marginBottom: 20,
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "center",
  background: "rgba(255,255,255,0.92)",
  border: "1px solid #D0D0CE",
  borderRadius: "16px",
  padding: "12px 14px",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
};

const topActionsStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  alignItems: "center",
};

const statusBannerStyle: CSSProperties = {
  background: "white",
  borderRadius: "14px",
  padding: "14px 18px",
  marginBottom: "24px",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
};

const twoColumnGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "0.9fr 1.1fr",
  gap: "20px",
  marginBottom: "20px",
};

const panelStyle: CSSProperties = {
  background: "white",
  borderRadius: "18px",
  padding: "20px",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
};

const sectionHeaderRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  marginBottom: "16px",
  flexWrap: "wrap",
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "20px",
  color: "#000000",
};

const sectionSubtitleStyle: CSSProperties = {
  margin: "6px 0 0",
  color: "#53565A",
  fontSize: "14px",
};

const formGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
};

const filterPanelStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
  padding: "14px",
  borderRadius: "16px",
  border: "1px solid #D0D0CE",
  background: "#ECECE7",
  marginBottom: "14px",
};

const filterActionRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(220px, 1fr) minmax(160px, 220px)",
  gap: "10px",
  alignItems: "center",
};

const toolbarFiltersStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "10px",
  alignItems: "center",
};

const fieldLabelStyle: CSSProperties = {
  display: "grid",
  gap: "6px",
  color: "#53565A",
  fontSize: "13px",
  fontWeight: 700,
};

const narrativeStackStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
  marginTop: "12px",
};

const narrativeHeaderRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
};

const inputStyle: CSSProperties = {
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #D0D0CE",
  minWidth: "180px",
  background: "white",
  color: "#000000",
};

const textareaStyle: CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  minHeight: "96px",
  fontFamily: "inherit",
};

const primaryButtonStyle: CSSProperties = {
  background: "#005670",
  color: "white",
  border: "none",
  padding: "10px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 700,
};

const secondaryButtonStyle: CSSProperties = {
  background: "#D0D0CE",
  color: "#000000",
  border: "none",
  padding: "10px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 700,
};

const pdfButtonStyle: CSSProperties = {
  background: "#005670",
  color: "white",
  border: "none",
  padding: "10px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 700,
};

const buttonRowStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  marginTop: "14px",
  flexWrap: "wrap",
};

const periodPreviewStyle: CSSProperties = {
  marginTop: "14px",
  padding: "12px 14px",
  borderRadius: "12px",
  background: "#ECECE7",
  border: "1px solid #D0D0CE",
  color: "#53565A",
};

const snapshotCardsWrapStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "14px",
};

const snapshotCardStyle: CSSProperties = {
  border: "1px solid #D0D0CE",
  borderRadius: "14px",
  padding: "14px",
  background: "#ECECE7",
  minHeight: "178px",
  boxSizing: "border-box",
};

const snapshotCardTitleStyle: CSSProperties = {
  fontSize: "15px",
  fontWeight: 800,
  color: "#000000",
  marginBottom: "10px",
};

const snapshotRowsWrapStyle: CSSProperties = {
  display: "grid",
  gap: "8px",
};

const snapshotRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
};

const snapshotLabelStyle: CSSProperties = {
  color: "#53565A",
  fontSize: "13px",
  minWidth: 0,
};

const snapshotValueStyle: CSSProperties = {
  color: "#000000",
  fontSize: "14px",
  whiteSpace: "nowrap",
};

const snapshotNoteStyle: CSSProperties = {
  marginTop: "10px",
  fontSize: "12px",
  color: "#53565A",
};

const registerCountStyle: CSSProperties = {
  fontSize: "13px",
  color: "#53565A",
  fontWeight: 700,
};

const emptyTextStyle: CSSProperties = {
  color: "#53565A",
  margin: 0,
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  background: "#ffffff",
  minWidth: 760,
  fontSize: "13px",
};

const tableHeadStyle: CSSProperties = {
  textAlign: "left",
  padding: "13px 14px",
  background: "#ECECE7",
  color: "#53565A",
  fontSize: "12px",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  borderBottom: "1px solid #D0D0CE",
  whiteSpace: "nowrap",
};

const tableCellStyle: CSSProperties = {
  padding: "13px 14px",
  borderBottom: "1px solid #ECECE7",
  color: "#000000",
  verticalAlign: "middle",
  fontSize: "13px",
  lineHeight: 1.45,
};

const actionButtonsWrapStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const miniButtonStyle: CSSProperties = {
  background: "#005670",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};

const miniButtonDeleteStyle: CSSProperties = {
  ...miniButtonStyle,
  background: "#F93822",
};

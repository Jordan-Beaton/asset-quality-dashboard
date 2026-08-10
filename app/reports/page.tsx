"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { QualityPageHero } from "../../src/components/QualityPageHero";
import { useImsPermissions } from "../../src/components/ImsPermissions";
import { supabase } from "../../src/lib/supabase";

type Ncr = {
  id: string;
  ncr_number: string | null;
  title: string | null;
  severity: string | null;
  status: string | null;
  owner: string | null;
  area: string | null;
  created_at: string | null;
  closed_at: string | null;
  root_cause_category?: string | null;
};

type Capa = {
  id: string;
  capa_number: string | null;
  title: string | null;
  status: string | null;
  owner: string | null;
  created_at: string | null;
  effectiveness_status: string | null;
};

type ActionItem = {
  id: string;
  action_number: string | null;
  title: string | null;
  department?: string | null;
  source?: string | null;
  owner: string | null;
  priority: string | null;
  status: string | null;
  due_date: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type AuditRecord = {
  id: string;
  audit_number: string | null;
  title: string | null;
  audit_type: string | null;
  auditee: string | null;
  lead_auditor: string | null;
  audit_date: string | null;
  audit_month: string | null;
  status: string | null;
  location: string | null;
};

type AuditFinding = {
  id: string;
  audit_id: string;
  reference: string | null;
  clause: string | null;
  category: string | null;
  description: string | null;
  owner: string | null;
  status: string | null;
  due_date: string | null;
  closure_date: string | null;
};

type MonthlyReport = {
  id: string;
  month_label: string;
  summary: string | null;
  wins: string | null;
  risks: string | null;
  next_steps: string | null;
  snapshot_json: Record<string, unknown> | null;
  created_at: string | null;
};

type MocReport = {
  id: string;
  moc_report_no: string | null;
  moc_report_title: string | null;
  change_type: "Permanent" | "Temporary" | null;
  status: string | null;
  temporary_valid_to: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type DocumentRow = {
  id: string;
  document_number: string | null;
  title: string | null;
  status: string | null;
  next_review_date: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ReportForm = {
  monthIndex: number;
  year: string;
  executiveSummary: string;
  nextMonthFocus: string;
};

type ManagementMetrics = {
  monthLabel: string;
  auditSummary: {
    auditsCompleted: number;
    findingsBasisLabel: string;
    findingsMajor: number;
    findingsMinor: number;
    findingsOfiObs: number;
  };
  actionsSummary: {
    actionsRaised: number;
    actionsClosed: number;
    totalOpenActions: number;
    actionsDueNext30Days: number;
  };
  mocSummary: {
    mocsRaised: number;
    mocsClosed: number;
    totalOpenMocs: number;
  };
  ncrSummary: {
    ncrsRaised: number;
    ncrsClosedAvailable: boolean;
    ncrsClosed: number | null;
    totalOpenNcrs: number;
    low: number;
    medium: number;
    high: number;
    rootCauseBreakdown: Array<[string, number]>;
  };
  capaSummary: {
    capasRaised: number;
    capasClosedAvailable: boolean;
    capasClosed: number | null;
    totalOpenCapas: number;
    awaitingEffectivenessReview: number;
    pending: number;
    effective: number;
    notEffective: number;
  };
  documentSummary: {
    overdueDocuments: number;
    documentsDueSoon: number;
  };
};

type SummaryDraftPayload = {
  monthLabel: string;
  year: number;
  metrics: {
    auditSummary: ManagementMetrics["auditSummary"];
    actionsSummary: ManagementMetrics["actionsSummary"];
    mocSummary: ManagementMetrics["mocSummary"];
    ncrSummary: ManagementMetrics["ncrSummary"];
    capaSummary: ManagementMetrics["capaSummary"];
    documentSummary: ManagementMetrics["documentSummary"];
  };
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
] as const;

const currentDate = new Date();
const defaultForm = (): ReportForm => ({
  monthIndex: currentDate.getMonth(),
  year: String(currentDate.getFullYear()),
  executiveSummary: "",
  nextMonthFocus: "",
});

function formatDateTime(value: string | null | undefined) {
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

function toDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isClosedStatus(value: string | null | undefined) {
  const normal = (value || "").trim().toLowerCase();
  return normal === "closed" || normal === "complete" || normal === "completed";
}

function isQualityAction(action: ActionItem) {
  const department = (action.department || "").trim().toLowerCase();
  const source = (action.source || "").trim().toLowerCase();
  const qualitySources = new Set(["ncr/capa", "audit finding", "moc", "quality", "manual"]);
  const hseSources = new Set(["hse", "ainm", "hse inspection", "observation", "ptw"]);

  if (department === "quality") return true;
  if (department === "hse") return false;
  if (hseSources.has(source)) return false;
  if (department === "hseq" && qualitySources.has(source)) return true;
  return qualitySources.has(source);
}

function isCompletedAudit(value: string | null | undefined) {
  return (value || "").trim().toLowerCase() === "completed";
}

function getMonthLabel(monthIndex: number, year: number) {
  return `${monthOptions[monthIndex]} ${year}`;
}

function isDateInMonth(value: string | null | undefined, monthIndex: number, year: number) {
  const date = parseDate(value);
  if (!date) return false;
  return date.getMonth() === monthIndex && date.getFullYear() === year;
}

function isAuditScheduledInMonth(audit: AuditRecord, monthIndex: number, year: number) {
  if (isDateInMonth(audit.audit_date, monthIndex, year)) {
    return true;
  }

  const key = (audit.audit_month || "").trim();
  if (!key) return false;

  const [rawYear, rawMonth] = key.split("-");
  const parsedYear = Number(rawYear);
  const parsedMonth = Number(rawMonth);
  if (!Number.isFinite(parsedYear) || !Number.isFinite(parsedMonth)) return false;

  return parsedYear === year && parsedMonth === monthIndex + 1;
}

function getDaysFromToday(value: string | null | undefined) {
  const date = parseDate(value);
  if (!date) return null;

  const target = new Date(date);
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getDocumentReviewState(nextReviewDate: string | null | undefined) {
  const days = getDaysFromToday(nextReviewDate);
  if (days === null) return "Not set";
  if (days < 0) return "Overdue";
  if (days <= 30) return "Due soon";
  return "In date";
}

function normaliseNcrSeverity(value: string | null | undefined) {
  const normal = (value || "").trim().toLowerCase();
  if (normal === "high" || normal === "major" || normal === "critical") return "High";
  if (normal === "medium" || normal === "minor") return "Medium";
  return "Low";
}

function normaliseRootCauseCategory(value: string | null | undefined) {
  const trimmed = (value || "").trim();
  return trimmed || "Not recorded";
}

function normaliseEffectivenessStatus(value: string | null | undefined) {
  const normal = (value || "").trim().toLowerCase();
  if (normal === "effective") return "Effective";
  if (normal === "not effective") return "Not Effective";
  return "Pending";
}

function parseReportFormFromSavedReport(report: MonthlyReport): ReportForm {
  const snapshot = report.snapshot_json || {};
  const snapshotMonth =
    typeof snapshot.report_month === "number" && snapshot.report_month >= 1 && snapshot.report_month <= 12
      ? snapshot.report_month - 1
      : null;
  const snapshotYear =
    typeof snapshot.report_year === "number" && snapshot.report_year >= 2000 ? snapshot.report_year : null;

  if (snapshotMonth !== null && snapshotYear !== null) {
    return {
      monthIndex: snapshotMonth,
      year: String(snapshotYear),
      executiveSummary: report.summary || "",
      nextMonthFocus: report.next_steps || "",
    };
  }

  const text = (report.month_label || "").trim();
  const matchedMonthIndex = monthOptions.findIndex((month) => text.toLowerCase().startsWith(month.toLowerCase()));
  const yearMatch = text.match(/(20\d{2})/);
  if (matchedMonthIndex >= 0 && yearMatch) {
    return {
      monthIndex: matchedMonthIndex,
      year: yearMatch[1],
      executiveSummary: report.summary || "",
      nextMonthFocus: report.next_steps || "",
    };
  }

  return {
    ...defaultForm(),
    executiveSummary: report.summary || "",
    nextMonthFocus: report.next_steps || "",
  };
}

function getSnapshotSummary(report: MonthlyReport) {
  const snapshot = report.snapshot_json || {};
  const auditSummary = snapshot.audit_summary as Record<string, unknown> | undefined;
  const actionSummary = snapshot.actions_summary as Record<string, unknown> | undefined;
  const mocSummary = snapshot.moc_summary as Record<string, unknown> | undefined;

  const auditsCompleted =
    typeof auditSummary?.audits_completed === "number" ? String(auditSummary.audits_completed) : "-";
  const openActions =
    typeof actionSummary?.total_open_actions === "number" ? String(actionSummary.total_open_actions) : "-";
  const openMocs = typeof mocSummary?.total_open_mocs === "number" ? String(mocSummary.total_open_mocs) : "-";

  return `Audits completed: ${auditsCompleted} | Open actions: ${openActions} | Open MOCs: ${openMocs}`;
}

function buildPdfMetricTable(
  doc: jsPDF,
  startY: number,
  title: string,
  rows: Array<[string, string | number]>
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
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
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
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
    alternateRowStyles: { fillColor: [248, 250, 252] },
    rowPageBreak: "avoid",
  });

  return ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || startY) + 8;
}

export default function ReportsPage() {
  const imsPermissions = useImsPermissions();
  const [ncrs, setNcrs] = useState<Ncr[]>([]);
  const [capas, setCapas] = useState<Capa[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [auditFindings, setAuditFindings] = useState<AuditFinding[]>([]);
  const [mocs, setMocs] = useState<MocReport[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [message, setMessage] = useState("Loading monthly management report workspace...");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isDraftingSummary, setIsDraftingSummary] = useState(false);
  const [logoFileName, setLogoFileName] = useState("/enshore-primary-logo-colour.png");
  const [lastRefreshed, setLastRefreshed] = useState<string>("");
  const [form, setForm] = useState<ReportForm>(defaultForm);
  const [savedReportSearch, setSavedReportSearch] = useState("");
  const [savedReportYearFilter, setSavedReportYearFilter] = useState("All Years");
  const [showSavedReportFilters, setShowSavedReportFilters] = useState(false);

  const canCreateReport = useMemo(() => {
    return imsPermissions.loaded && (imsPermissions.isMasterAdmin || imsPermissions.fullAccess || imsPermissions.canCreate);
  }, [imsPermissions.canCreate, imsPermissions.fullAccess, imsPermissions.isMasterAdmin, imsPermissions.loaded]);

  const canEditReport = useMemo(() => {
    return imsPermissions.loaded && (imsPermissions.isMasterAdmin || imsPermissions.fullAccess || imsPermissions.canEdit);
  }, [imsPermissions.canEdit, imsPermissions.fullAccess, imsPermissions.isMasterAdmin, imsPermissions.loaded]);

  async function loadData() {
    const [ncrsRes, capasRes, actionsRes, auditsRes, findingsRes, mocsRes, documentsRes, reportsRes] = await Promise.all([
      supabase.from("ncrs").select("*"),
      supabase.from("capas").select("id,capa_number,title,status,owner,created_at,effectiveness_status"),
      supabase.from("actions").select("*"),
      supabase.from("audits").select("*"),
      supabase.from("audit_findings").select("*"),
      supabase.from("moc_reports").select("*"),
      supabase.from("documents").select("*"),
      supabase.from("monthly_reports").select("*").order("created_at", { ascending: false }),
    ]);

    if (
      ncrsRes.error ||
      capasRes.error ||
      actionsRes.error ||
      auditsRes.error ||
      findingsRes.error ||
      mocsRes.error ||
      documentsRes.error ||
      reportsRes.error
    ) {
      setMessage(
        `Error: ${
          ncrsRes.error?.message ||
          capasRes.error?.message ||
          actionsRes.error?.message ||
          auditsRes.error?.message ||
          findingsRes.error?.message ||
          mocsRes.error?.message ||
          documentsRes.error?.message ||
          reportsRes.error?.message
        }`
      );
      return;
    }

    setNcrs((ncrsRes.data || []) as Ncr[]);
    setCapas((capasRes.data || []) as Capa[]);
    setActions((actionsRes.data || []) as ActionItem[]);
    setAudits((auditsRes.data || []) as AuditRecord[]);
    setAuditFindings((findingsRes.data || []) as AuditFinding[]);
    setMocs((mocsRes.data || []) as MocReport[]);
    setDocuments((documentsRes.data || []) as DocumentRow[]);
    setReports((reportsRes.data || []) as MonthlyReport[]);
    setLastRefreshed(new Date().toLocaleString("en-GB"));
    setMessage("Monthly management reporting workspace loaded.");
  }

  useEffect(() => {
    void loadData();
  }, []);

  const selectedYear = useMemo(() => {
    const parsed = Number(form.year);
    return Number.isFinite(parsed) && parsed >= 2000 ? parsed : currentDate.getFullYear();
  }, [form.year]);

  const buildMetricsForPeriod = useCallback(
    (monthIndex: number, year: number): ManagementMetrics => {
      const completedAuditsInMonth = audits.filter(
        (audit) => isCompletedAudit(audit.status) && isAuditScheduledInMonth(audit, monthIndex, year)
      );
      const completedAuditIds = new Set(completedAuditsInMonth.map((audit) => audit.id));
      const findingsLinkedToCompletedAudits = auditFindings.filter((finding) => completedAuditIds.has(finding.audit_id));

      const qualityActions = actions.filter(isQualityAction);
      const actionRowsRaisedInMonth = qualityActions.filter((action) => isDateInMonth(action.created_at, monthIndex, year));
      const actionRowsClosedInMonth = qualityActions.filter(
        (action) => isClosedStatus(action.status) && isDateInMonth(action.updated_at, monthIndex, year)
      );
      const openActionRows = qualityActions.filter((action) => !isClosedStatus(action.status));
      const actionsDueNext30Days = actions.filter((action) => {
        if (isClosedStatus(action.status)) return false;
        const days = getDaysFromToday(action.due_date);
        return days !== null && days >= 0 && days <= 30;
      }).length;

      const mocRowsRaisedInMonth = mocs.filter((moc) => isDateInMonth(moc.created_at, monthIndex, year));
      const mocRowsClosedInMonth = mocs.filter(
        (moc) => (moc.status || "").trim().toLowerCase() === "closed" && isDateInMonth(moc.updated_at, monthIndex, year)
      );
      const openMocRows = mocs.filter((moc) => (moc.status || "").trim().toLowerCase() !== "closed");

      const ncrRowsRaisedInMonth = ncrs.filter((ncr) => isDateInMonth(ncr.created_at, monthIndex, year));
      const ncrRowsClosedInMonth = ncrs.filter(
        (ncr) => isClosedStatus(ncr.status) && isDateInMonth(ncr.closed_at, monthIndex, year)
      );
      const openNcrRows = ncrs.filter((ncr) => !isClosedStatus(ncr.status));
      const capaRowsRaisedInMonth = capas.filter((capa) => isDateInMonth(capa.created_at, monthIndex, year));
      const openCapaRows = capas.filter((capa) => !isClosedStatus(capa.status));

      const lowOpenNcrs = openNcrRows.filter((ncr) => normaliseNcrSeverity(ncr.severity) === "Low").length;
      const mediumOpenNcrs = openNcrRows.filter((ncr) => normaliseNcrSeverity(ncr.severity) === "Medium").length;
      const highOpenNcrs = openNcrRows.filter((ncr) => normaliseNcrSeverity(ncr.severity) === "High").length;
      const rootCauseCounts = new Map<string, number>();
      ncrRowsRaisedInMonth.forEach((ncr) => {
        const key = normaliseRootCauseCategory(ncr.root_cause_category);
        rootCauseCounts.set(key, (rootCauseCounts.get(key) || 0) + 1);
      });
      const rootCauseBreakdown = [...rootCauseCounts.entries()].sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0]);
      });
      const pendingCapas = capas.filter((capa) => normaliseEffectivenessStatus(capa.effectiveness_status) === "Pending");
      const effectiveCapas = capas.filter((capa) => normaliseEffectivenessStatus(capa.effectiveness_status) === "Effective");
      const notEffectiveCapas = capas.filter(
        (capa) => normaliseEffectivenessStatus(capa.effectiveness_status) === "Not Effective"
      );

      const overdueDocuments = documents.filter(
        (doc) => getDocumentReviewState(doc.next_review_date) === "Overdue"
      ).length;
      const dueSoonDocuments = documents.filter(
        (doc) => getDocumentReviewState(doc.next_review_date) === "Due soon"
      ).length;

      return {
        monthLabel: getMonthLabel(monthIndex, year),
        auditSummary: {
          auditsCompleted: completedAuditsInMonth.length,
          findingsBasisLabel: "Current findings linked to audits completed in the selected month",
          findingsMajor: findingsLinkedToCompletedAudits.filter(
            (finding) => (finding.category || "").trim().toLowerCase() === "major"
          ).length,
          findingsMinor: findingsLinkedToCompletedAudits.filter(
            (finding) => (finding.category || "").trim().toLowerCase() === "minor"
          ).length,
          findingsOfiObs: findingsLinkedToCompletedAudits.filter((finding) => {
            const category = (finding.category || "").trim().toLowerCase();
            return category === "ofi" || category === "observation" || category === "obs";
          }).length,
        },
        actionsSummary: {
          actionsRaised: actionRowsRaisedInMonth.length,
          actionsClosed: actionRowsClosedInMonth.length,
          totalOpenActions: openActionRows.length,
          actionsDueNext30Days,
        },
        mocSummary: {
          mocsRaised: mocRowsRaisedInMonth.length,
          mocsClosed: mocRowsClosedInMonth.length,
          totalOpenMocs: openMocRows.length,
        },
        ncrSummary: {
          ncrsRaised: ncrRowsRaisedInMonth.length,
          ncrsClosedAvailable: true,
          ncrsClosed: ncrRowsClosedInMonth.length,
          totalOpenNcrs: openNcrRows.length,
          low: lowOpenNcrs,
          medium: mediumOpenNcrs,
          high: highOpenNcrs,
          rootCauseBreakdown,
        },
        capaSummary: {
          capasRaised: capaRowsRaisedInMonth.length,
          capasClosedAvailable: false,
          capasClosed: null,
          totalOpenCapas: openCapaRows.length,
          awaitingEffectivenessReview: openCapaRows.filter(
            (capa) => normaliseEffectivenessStatus(capa.effectiveness_status) === "Pending"
          ).length,
          pending: pendingCapas.length,
          effective: effectiveCapas.length,
          notEffective: notEffectiveCapas.length,
        },
        documentSummary: {
          overdueDocuments,
          documentsDueSoon: dueSoonDocuments,
        },
      };
    },
    [actions, auditFindings, audits, capas, documents, mocs, ncrs]
  );

  const metrics = useMemo(
    () => buildMetricsForPeriod(form.monthIndex, selectedYear),
    [buildMetricsForPeriod, form.monthIndex, selectedYear]
  );

  const latestReportLabel = useMemo(() => {
    const latest = reports[0];
    return latest ? latest.month_label : "No saved reports";
  }, [reports]);

  const savedReportYearOptions = useMemo(() => {
    const years = reports
      .map((report) => {
        const match = (report.month_label || "").match(/\b(20\d{2})\b/);
        return match?.[1] || "";
      })
      .filter(Boolean);
    return ["All Years", ...Array.from(new Set(years)).sort((a, b) => Number(b) - Number(a))];
  }, [reports]);

  const filteredReports = useMemo(() => {
    const query = savedReportSearch.trim().toLowerCase();
    return reports.filter((report) => {
      const matchesSearch =
        !query ||
        [report.month_label, report.summary, report.wins, report.risks, report.next_steps]
          .some((value) => String(value || "").toLowerCase().includes(query));
      const year = (report.month_label || "").match(/\b(20\d{2})\b/)?.[1] || "";
      const matchesYear = savedReportYearFilter === "All Years" || year === savedReportYearFilter;
      return matchesSearch && matchesYear;
    });
  }, [reports, savedReportSearch, savedReportYearFilter]);

  const summaryDraftPayload = useMemo<SummaryDraftPayload>(
    () => ({
      monthLabel: metrics.monthLabel,
      year: selectedYear,
      metrics: {
        auditSummary: metrics.auditSummary,
        actionsSummary: metrics.actionsSummary,
        mocSummary: metrics.mocSummary,
        ncrSummary: metrics.ncrSummary,
        capaSummary: metrics.capaSummary,
        documentSummary: metrics.documentSummary,
      },
    }),
    [metrics, selectedYear]
  );

  const reportCards = useMemo(
    () => [
      {
        title: "A. Audit Summary",
        rows: [
          ["Audits completed in month", metrics.auditSummary.auditsCompleted],
          ["Major findings", metrics.auditSummary.findingsMajor],
          ["Minor findings", metrics.auditSummary.findingsMinor],
          ["OFI / Observation", metrics.auditSummary.findingsOfiObs],
        ] as Array<[string, string | number]>,
        note: metrics.auditSummary.findingsBasisLabel,
      },
      {
        title: "B. Actions",
        rows: [
          ["Actions raised in month", metrics.actionsSummary.actionsRaised],
          ["Actions closed in month", metrics.actionsSummary.actionsClosed],
          ["Total open actions", metrics.actionsSummary.totalOpenActions],
          ["Due in next 30 days", metrics.actionsSummary.actionsDueNext30Days],
        ] as Array<[string, string | number]>,
      },
      {
        title: "C. MOC",
        rows: [
          ["MOCs raised in month", metrics.mocSummary.mocsRaised],
          ["MOCs closed in month", metrics.mocSummary.mocsClosed],
          ["Total open MOCs", metrics.mocSummary.totalOpenMocs],
        ] as Array<[string, string | number]>,
      },
      {
        title: "D. NCR",
        rows: [
          ["NCRs raised in month", metrics.ncrSummary.ncrsRaised],
          [
            "NCRs closed in month",
            metrics.ncrSummary.ncrsClosed ?? 0,
          ],
          ["Total open NCRs", metrics.ncrSummary.totalOpenNcrs],
          ["Open NCR severity - Low", metrics.ncrSummary.low],
          ["Open NCR severity - Medium", metrics.ncrSummary.medium],
          ["Open NCR severity - High", metrics.ncrSummary.high],
          ...metrics.ncrSummary.rootCauseBreakdown.map(
            ([category, count]) => [`Root cause - ${category}`, count] as [string, number]
          ),
        ] as Array<[string, string | number]>,
      },
      {
        title: "E. CAPA",
        rows: [
          ["CAPAs raised in month", metrics.capaSummary.capasRaised],
          ["Total open CAPAs", metrics.capaSummary.totalOpenCapas],
          ["CAPAs awaiting effectiveness review", metrics.capaSummary.awaitingEffectivenessReview],
          ["Effectiveness status - Pending", metrics.capaSummary.pending],
          ["Effectiveness status - Effective", metrics.capaSummary.effective],
          ["Effectiveness status - Not Effective", metrics.capaSummary.notEffective],
        ] as Array<[string, string | number]>,
      },
      {
        title: "F. Documents",
        rows: [
          ["Overdue documents", metrics.documentSummary.overdueDocuments],
          ["Documents due soon", metrics.documentSummary.documentsDueSoon],
        ] as Array<[string, string | number]>,
      },
    ],
    [metrics]
  );

  function resetForm() {
    setForm(defaultForm());
    setEditingId(null);
  }

  function handleEdit(report: MonthlyReport) {
    if (!canEditReport) {
      setMessage("Read-only access: you do not have permission to edit monthly reports.");
      return;
    }

    setEditingId(report.id);
    setForm(parseReportFormFromSavedReport(report));
    setMessage(`Editing report: ${report.month_label}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    if (!canEditReport) {
      setMessage("Read-only access: you do not have permission to delete monthly reports.");
      return;
    }

    const confirmed = window.confirm("Are you sure you want to delete this report?");
    if (!confirmed) return;

    const { error } = await supabase.from("monthly_reports").delete().eq("id", id);

    if (error) {
      setMessage(`Delete failed: ${error.message}`);
      return;
    }

    if (editingId === id) {
      resetForm();
    }

    setMessage("Monthly report deleted successfully.");
    await loadData();
  }

  async function saveMonthlyReport(e: React.FormEvent) {
    e.preventDefault();
    if (editingId && !canEditReport) {
      setMessage("Read-only access: you do not have permission to update monthly reports.");
      return;
    }
    if (!editingId && !canCreateReport) {
      setMessage("Read-only access: you do not have permission to create monthly reports.");
      return;
    }

    if (!Number.isFinite(selectedYear) || selectedYear < 2000) {
      setMessage("Enter a valid report year.");
      return;
    }

    const monthLabel = getMonthLabel(form.monthIndex, selectedYear);
    const snapshot = {
      report_month: form.monthIndex + 1,
      report_year: selectedYear,
      audit_summary: {
        audits_completed: metrics.auditSummary.auditsCompleted,
        findings_basis_label: metrics.auditSummary.findingsBasisLabel,
        findings_major: metrics.auditSummary.findingsMajor,
        findings_minor: metrics.auditSummary.findingsMinor,
        findings_ofi_observation: metrics.auditSummary.findingsOfiObs,
      },
      actions_summary: {
        actions_raised: metrics.actionsSummary.actionsRaised,
        actions_closed: metrics.actionsSummary.actionsClosed,
        total_open_actions: metrics.actionsSummary.totalOpenActions,
        due_next_30_days: metrics.actionsSummary.actionsDueNext30Days,
      },
      moc_summary: {
        mocs_raised: metrics.mocSummary.mocsRaised,
        mocs_closed: metrics.mocSummary.mocsClosed,
        total_open_mocs: metrics.mocSummary.totalOpenMocs,
      },
      ncr_summary: {
        ncrs_raised: metrics.ncrSummary.ncrsRaised,
        ncrs_closed_available: metrics.ncrSummary.ncrsClosedAvailable,
        ncrs_closed: metrics.ncrSummary.ncrsClosed,
        total_open_ncrs: metrics.ncrSummary.totalOpenNcrs,
        low: metrics.ncrSummary.low,
        medium: metrics.ncrSummary.medium,
        high: metrics.ncrSummary.high,
        root_cause_breakdown: metrics.ncrSummary.rootCauseBreakdown,
      },
      capa_summary: {
        capas_raised: metrics.capaSummary.capasRaised,
        capas_closed_available: metrics.capaSummary.capasClosedAvailable,
        capas_closed: metrics.capaSummary.capasClosed,
        total_open_capas: metrics.capaSummary.totalOpenCapas,
        awaiting_effectiveness_review: metrics.capaSummary.awaitingEffectivenessReview,
        pending: metrics.capaSummary.pending,
        effective: metrics.capaSummary.effective,
        not_effective: metrics.capaSummary.notEffective,
      },
      documents_summary: {
        overdue_documents: metrics.documentSummary.overdueDocuments,
        documents_due_soon: metrics.documentSummary.documentsDueSoon,
      },
    };

    if (editingId) {
      const { error } = await supabase
        .from("monthly_reports")
        .update({
          month_label: monthLabel,
          summary: form.executiveSummary.trim() || null,
          wins: null,
          risks: null,
          next_steps: form.nextMonthFocus.trim() || null,
          snapshot_json: snapshot,
        })
        .eq("id", editingId);

      if (error) {
        setMessage(`Update report failed: ${error.message}`);
        return;
      }

      setMessage("Monthly management report updated successfully.");
    } else {
      const { error } = await supabase.from("monthly_reports").insert([
        {
          month_label: monthLabel,
          summary: form.executiveSummary.trim() || null,
          wins: null,
          risks: null,
          next_steps: form.nextMonthFocus.trim() || null,
          snapshot_json: snapshot,
        },
      ]);

      if (error) {
        setMessage(`Save report failed: ${error.message}`);
        return;
      }

      setMessage("Monthly management report saved successfully.");
    }

    resetForm();
    await loadData();
  }

  async function draftExecutiveSummaryWithAi() {
    if (form.executiveSummary.trim()) {
      const confirmed = window.confirm(
        "Executive Summary already contains text. Replace it with a new AI draft?"
      );
      if (!confirmed) return;
    }

    try {
      setIsDraftingSummary(true);
      setMessage("Drafting executive summary with AI...");

      const response = await fetch("/api/report-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(summaryDraftPayload),
      });

      const data = (await response.json()) as { summary?: string; error?: string };
      if (!response.ok) {
        throw new Error(data.error || "AI draft request failed.");
      }

      if (!data.summary?.trim()) {
        throw new Error("AI draft returned no summary text.");
      }

      setForm((prev) => ({ ...prev, executiveSummary: data.summary!.trim() }));
      setMessage(`Executive Summary draft generated for ${metrics.monthLabel}.`);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "AI draft failed.";
      setMessage(messageText);
    } finally {
      setIsDraftingSummary(false);
    }
  }

  async function generatePdfReport(sourceReport?: MonthlyReport) {
    try {
      setIsGeneratingPdf(true);

      const selectedPeriod = sourceReport ? parseReportFormFromSavedReport(sourceReport) : form;
      const pdfYear = Number(selectedPeriod.year);
      const safeYear = Number.isFinite(pdfYear) && pdfYear >= 2000 ? pdfYear : currentDate.getFullYear();
      const pdfMetrics = buildMetricsForPeriod(selectedPeriod.monthIndex, safeYear);
      const executiveSummary = (selectedPeriod.executiveSummary || "").trim();
      const nextMonthFocus = (selectedPeriod.nextMonthFocus || "").trim();

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      const reportTitle = `Monthly Management Report - ${pdfMetrics.monthLabel}`;
      const generatedAt = new Date().toLocaleString("en-GB");

      try {
        const logoResponse = await fetch(logoFileName);
        if (logoResponse.ok) {
          const logoBlob = await logoResponse.blob();
          const logoFile = new File([logoBlob], "enshore-primary-logo-colour.png", {
            type: logoBlob.type || "image/png",
          });
          const logoDataUrl = await toDataUrl(logoFile);
          doc.addImage(logoDataUrl, "PNG", margin, 10, 48, 24);
        }
      } catch {
        // Keep PDF generation resilient if the logo cannot be loaded.
      }

      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(20);
      doc.text("Monthly Management Report", pageWidth - margin, 18, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(71, 85, 105);
      doc.text(pdfMetrics.monthLabel, pageWidth - margin, 25, { align: "right" });
      doc.text(`Generated: ${generatedAt}`, pageWidth - margin, 31, { align: "right" });

      doc.setDrawColor(0, 86, 112);
      doc.setLineWidth(0.7);
      doc.line(margin, 37, pageWidth - margin, 37);

      let y = 45;
      if (executiveSummary) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(12);
        doc.text("Executive Summary", margin, y);
        y += 5;

        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        doc.setFontSize(10.2);
        const summaryLines = doc.splitTextToSize(executiveSummary, pageWidth - margin * 2);
        doc.text(summaryLines, margin, y);
        y += summaryLines.length * 4.5 + 7;
      }

      y = buildPdfMetricTable(doc, y, "A. Audit Summary", [
        ["Audits completed in month", pdfMetrics.auditSummary.auditsCompleted],
        ["Major findings", pdfMetrics.auditSummary.findingsMajor],
        ["Minor findings", pdfMetrics.auditSummary.findingsMinor],
        ["OFI / Observation", pdfMetrics.auditSummary.findingsOfiObs],
      ]);

      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.8);
      doc.setTextColor(100, 116, 139);
      const findingsBasis = doc.splitTextToSize(
        pdfMetrics.auditSummary.findingsBasisLabel,
        pageWidth - margin * 2
      );
      doc.text(findingsBasis, margin, y - 2);
      y += findingsBasis.length * 4 + 1;

      y = buildPdfMetricTable(doc, y, "B. Actions", [
        ["Actions raised in month", pdfMetrics.actionsSummary.actionsRaised],
        ["Actions closed in month", pdfMetrics.actionsSummary.actionsClosed],
        ["Total open actions", pdfMetrics.actionsSummary.totalOpenActions],
        ["Actions due in next 30 days", pdfMetrics.actionsSummary.actionsDueNext30Days],
      ]);

      y = buildPdfMetricTable(doc, y, "C. MOC", [
        ["MOCs raised in month", pdfMetrics.mocSummary.mocsRaised],
        ["MOCs closed in month", pdfMetrics.mocSummary.mocsClosed],
        ["Total open MOCs", pdfMetrics.mocSummary.totalOpenMocs],
      ]);

      y = buildPdfMetricTable(doc, y, "D. NCR", [
        ["NCRs raised in month", pdfMetrics.ncrSummary.ncrsRaised],
        [
          "NCRs closed in month",
          pdfMetrics.ncrSummary.ncrsClosed ?? 0,
        ],
        ["Total open NCRs", pdfMetrics.ncrSummary.totalOpenNcrs],
        ["Open NCR severity - Low", pdfMetrics.ncrSummary.low],
        ["Open NCR severity - Medium", pdfMetrics.ncrSummary.medium],
        ["Open NCR severity - High", pdfMetrics.ncrSummary.high],
        ...pdfMetrics.ncrSummary.rootCauseBreakdown.map(
          ([category, count]) => [`Root cause - ${category}`, count] as [string, number]
        ),
      ]);

      y = buildPdfMetricTable(doc, y, "E. CAPA", [
        ["CAPAs raised in month", pdfMetrics.capaSummary.capasRaised],
        ["Total open CAPAs", pdfMetrics.capaSummary.totalOpenCapas],
        ["CAPAs awaiting effectiveness review", pdfMetrics.capaSummary.awaitingEffectivenessReview],
        ["Effectiveness status - Pending", pdfMetrics.capaSummary.pending],
        ["Effectiveness status - Effective", pdfMetrics.capaSummary.effective],
        ["Effectiveness status - Not Effective", pdfMetrics.capaSummary.notEffective],
      ]);

      y = buildPdfMetricTable(doc, y, "F. Documents", [
        ["Overdue documents", pdfMetrics.documentSummary.overdueDocuments],
        ["Documents due soon", pdfMetrics.documentSummary.documentsDueSoon],
      ]);

      if (nextMonthFocus) {
        if (y + 28 > pageHeight - 18) {
          doc.addPage();
          y = 18;
        }

        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(12);
        doc.text("Next Month Focus / Planned Activity", margin, y);
        y += 5;

        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        doc.setFontSize(10.2);
        const nextMonthLines = doc.splitTextToSize(nextMonthFocus, pageWidth - margin * 2);
        doc.text(nextMonthLines, margin, y);
      }

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i += 1) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`Enshore Subsea | ${pdfMetrics.monthLabel}`, margin, pageHeight - 8);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 8, {
          align: "right",
        });
      }

      const pdfBlob = doc.output("blob");
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, "_blank", "noopener,noreferrer");
      doc.save(`${reportTitle.replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "-")}.pdf`);
      setMessage("Monthly management report PDF generated successfully.");
    } catch (error) {
      console.error(error);
      setMessage("PDF generation failed.");
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  return (
    <main>
      <QualityPageHero
        label="MANAGEMENT REPORTING"
        title="Reports"
        description="Generate concise monthly management summaries from live quality data without dumping raw operational registers."
        contextCards={[
          { label: "Last Refreshed", value: lastRefreshed || "-" },
          { label: "Latest Report", value: latestReportLabel },
        ]}
      />

      <div style={topMetaRowStyle}>
        <Link href="/quality" style={backLinkStyle}>
          ← Back to Dashboard
        </Link>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            style={secondaryButtonStyle}
            onClick={() => setLogoFileName("/enshore-primary-logo-colour.png")}
          >
            Use /enshore-primary-logo-colour.png
          </button>
          <button
            type="button"
            style={pdfButtonStyle}
            onClick={() => void generatePdfReport()}
            disabled={isGeneratingPdf}
          >
            {isGeneratingPdf ? "Generating PDF..." : "Generate Monthly PDF"}
          </button>
          <div style={{ ...statusBannerStyle, marginBottom: 0, borderRadius: "12px", padding: "12px 16px" }}>
            <strong>Status:</strong> {message}
          </div>
        </div>
      </div>

      <nav style={reportWorkspaceTabsStyle} aria-label="Report workspace">
        <Link href="/reports" style={activeReportWorkspaceTabStyle}>
          Monthly Reports
        </Link>
        <Link href="/projects/wadden-sea/reports" style={reportWorkspaceTabStyle}>
          Project Reports
        </Link>
      </nav>

      <section style={twoColumnGridStyle}>
        <div style={panelStyle}>
          <div style={sectionHeaderRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>
                {editingId ? "Edit Monthly Management Report" : "Create Monthly Management Report"}
              </h2>
              <p style={sectionSubtitleStyle}>
                Choose the reporting month and generate a concise management pack from verified live data fields.
              </p>
            </div>
          </div>

          <form onSubmit={saveMonthlyReport}>
            <div style={formGridStyle}>
              <label style={fieldLabelStyle}>
                <span>Month</span>
                <select
                  value={form.monthIndex}
                  onChange={(e) => setForm((prev) => ({ ...prev, monthIndex: Number(e.target.value) }))}
                  style={inputStyle}
                >
                  {monthOptions.map((month, index) => (
                    <option key={month} value={index}>
                      {month}
                    </option>
                  ))}
                </select>
              </label>

              <label style={fieldLabelStyle}>
                <span>Year</span>
                <input
                  value={form.year}
                  onChange={(e) => setForm((prev) => ({ ...prev, year: e.target.value }))}
                  style={inputStyle}
                  inputMode="numeric"
                  placeholder={String(currentDate.getFullYear())}
                />
              </label>
            </div>

            <div style={narrativeStackStyle}>
              <label style={fieldLabelStyle}>
                <span style={narrativeHeaderRowStyle}>
                  <span>Executive Summary</span>
                  <button
                    type="button"
                    style={secondaryButtonStyle}
                    onClick={() => void draftExecutiveSummaryWithAi()}
                    disabled={isDraftingSummary}
                  >
                    {isDraftingSummary ? "Drafting..." : "Draft Executive Summary with AI"}
                  </button>
                </span>
                <textarea
                  value={form.executiveSummary}
                  onChange={(e) => setForm((prev) => ({ ...prev, executiveSummary: e.target.value }))}
                  style={textareaStyle}
                  rows={4}
                  placeholder="Optional short management summary for this month."
                />
              </label>

              <label style={fieldLabelStyle}>
                <span>Next Month Focus / Planned Activity</span>
                <textarea
                  value={form.nextMonthFocus}
                  onChange={(e) => setForm((prev) => ({ ...prev, nextMonthFocus: e.target.value }))}
                  style={textareaStyle}
                  rows={4}
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
                Live monthly summary blocks used to build the management PDF.
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
              Reopen saved monthly management periods and generate the concise PDF directly from each row.
            </p>
          </div>
          <div style={registerCountStyle}>{filteredReports.length} of {reports.length} reports</div>
        </div>

        <div style={filterPanelStyle}>
          <div style={filterActionRowStyle}>
            <input
              value={savedReportSearch}
              onChange={(event) => setSavedReportSearch(event.target.value)}
              style={inputStyle}
              placeholder="Search saved reports"
            />
            <button
              type="button"
              style={showSavedReportFilters ? secondaryButtonStyle : primaryButtonStyle}
              onClick={() => setShowSavedReportFilters((current) => !current)}
            >
              {showSavedReportFilters ? "Hide Filters" : "Show Filters"}
            </button>
          </div>

          {showSavedReportFilters ? (
            <div style={toolbarFiltersStyle}>
              <select
                value={savedReportYearFilter}
                onChange={(event) => setSavedReportYearFilter(event.target.value)}
                style={inputStyle}
              >
                {savedReportYearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
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
          <p style={emptyTextStyle}>No monthly reports saved yet.</p>
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
                    <td style={tableCellStyle}>{formatDateTime(report.created_at)}</td>
                    <td style={tableCellStyle}>
                      <div style={actionButtonsWrapStyle}>
                        <button type="button" style={miniButtonStyle} onClick={() => void generatePdfReport(report)}>
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

const heroStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #005670 0%, #005670 64%, #63B1BC 160%)",
  color: "white",
  borderRadius: "20px",
  padding: "28px 30px",
  marginBottom: "24px",
  boxShadow: "0 10px 30px rgba(0, 86, 112, 0.14)",
  display: "flex",
  justifyContent: "space-between",
  gap: "24px",
  alignItems: "flex-start",
  flexWrap: "wrap",
  minHeight: "244px",
  width: "100%",
  boxSizing: "border-box",
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  opacity: 0.82,
  marginBottom: "10px",
};

const heroTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "34px",
  lineHeight: 1.08,
};

const heroSubtitleStyle: React.CSSProperties = {
  marginTop: "10px",
  marginBottom: 0,
  fontSize: "16px",
  maxWidth: "760px",
  color: "rgba(255,255,255,0.92)",
};

const heroMetaWrapStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(180px, 1fr))",
  gap: "12px",
  minWidth: "340px",
  flex: "1 1 340px",
};

const heroMetaCardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.10)",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: "14px",
  padding: "14px 16px",
};

const heroMetaLabelStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  opacity: 0.82,
  marginBottom: "6px",
};

const heroMetaValueStyle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 700,
};

const backLinkStyle: React.CSSProperties = {
  color: "#005670",
  fontWeight: 700,
  textDecoration: "none",
};

const topMetaRowStyle: React.CSSProperties = {
  marginBottom: 20,
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "center",
  background: "rgba(255,255,255,0.92)",
  border: "1px solid #dbe3ef",
  borderRadius: "16px",
  padding: "12px 14px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
};

const reportWorkspaceTabsStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  padding: "6px",
  marginBottom: "20px",
  background: "#ffffff",
  border: "1px solid #dbe3ef",
  borderRadius: "14px",
  width: "fit-content",
};

const reportWorkspaceTabStyle: React.CSSProperties = {
  padding: "9px 14px",
  borderRadius: "10px",
  color: "#475569",
  textDecoration: "none",
  fontWeight: 800,
  fontSize: "13px",
};

const activeReportWorkspaceTabStyle: React.CSSProperties = {
  ...reportWorkspaceTabStyle,
  background: "#005670",
  color: "#ffffff",
};

const statusBannerStyle: React.CSSProperties = {
  background: "white",
  borderRadius: "14px",
  padding: "14px 18px",
  marginBottom: "24px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
};

const twoColumnGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "0.9fr 1.1fr",
  gap: "20px",
  marginBottom: "20px",
};

const panelStyle: React.CSSProperties = {
  background: "white",
  borderRadius: "18px",
  padding: "20px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
};

const sectionHeaderRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  marginBottom: "16px",
  flexWrap: "wrap",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "20px",
  color: "#0f172a",
};

const sectionSubtitleStyle: React.CSSProperties = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: "14px",
};

const formGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
};

const filterPanelStyle: React.CSSProperties = {
  display: "grid",
  gap: "12px",
  padding: "14px",
  borderRadius: "16px",
  border: "1px solid #dbe4ef",
  background: "#f8fafc",
  marginBottom: "14px",
};

const filterActionRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(220px, 1fr) minmax(160px, 220px)",
  gap: "10px",
  alignItems: "center",
};

const toolbarFiltersStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "10px",
  alignItems: "center",
};

const fieldLabelStyle: React.CSSProperties = {
  display: "grid",
  gap: "6px",
  color: "#475569",
  fontSize: "13px",
  fontWeight: 700,
};

const narrativeStackStyle: React.CSSProperties = {
  display: "grid",
  gap: "12px",
  marginTop: "12px",
};

const narrativeHeaderRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
};

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  minWidth: "180px",
  background: "white",
  color: "#0f172a",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  minHeight: "96px",
  fontFamily: "inherit",
};

const primaryButtonStyle: React.CSSProperties = {
  background: "#005670",
  color: "white",
  border: "none",
  padding: "10px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 700,
};

const secondaryButtonStyle: React.CSSProperties = {
  background: "#e2e8f0",
  color: "#0f172a",
  border: "none",
  padding: "10px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 700,
};

const pdfButtonStyle: React.CSSProperties = {
  background: "#005670",
  color: "white",
  border: "none",
  padding: "10px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 700,
};

const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  marginTop: "14px",
  flexWrap: "wrap",
};

const periodPreviewStyle: React.CSSProperties = {
  marginTop: "14px",
  padding: "12px 14px",
  borderRadius: "12px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#334155",
};

const snapshotCardsWrapStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "14px",
};

const snapshotCardStyle: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  padding: "14px",
  background: "#f8fafc",
};

const snapshotCardTitleStyle: React.CSSProperties = {
  fontSize: "15px",
  fontWeight: 800,
  color: "#0f172a",
  marginBottom: "10px",
};

const snapshotRowsWrapStyle: React.CSSProperties = {
  display: "grid",
  gap: "8px",
};

const snapshotRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
};

const snapshotLabelStyle: React.CSSProperties = {
  color: "#475569",
  fontSize: "13px",
};

const snapshotValueStyle: React.CSSProperties = {
  color: "#0f172a",
  fontSize: "14px",
};

const snapshotNoteStyle: React.CSSProperties = {
  marginTop: "10px",
  fontSize: "12px",
  color: "#64748b",
};

const registerCountStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#64748b",
  fontWeight: 700,
};

const emptyTextStyle: React.CSSProperties = {
  color: "#64748b",
  margin: 0,
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  background: "#ffffff",
  minWidth: 960,
  fontSize: "13px",
};

const tableHeadStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "13px 14px",
  background: "#f8fafc",
  color: "#334155",
  fontSize: "12px",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  borderBottom: "1px solid #dbe3ef",
  whiteSpace: "nowrap",
};

const tableCellStyle: React.CSSProperties = {
  padding: "13px 14px",
  borderBottom: "1px solid #edf2f7",
  color: "#0f172a",
  verticalAlign: "middle",
  fontSize: "13px",
  lineHeight: 1.45,
};

const actionButtonsWrapStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const miniButtonStyle: React.CSSProperties = {
  background: "#005670",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};

const miniButtonDeleteStyle: React.CSSProperties = {
  background: "#F93822",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};

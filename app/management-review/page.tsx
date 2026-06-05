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
import { ModuleSectionHeader } from "../../src/components/ModuleSectionHeader";
import { QualityKpiCard } from "../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../src/components/QualityPageHero";
import { supabase } from "../../src/lib/supabase";

export const dynamic = "force-dynamic";

type CountValue = number | null;

type SnapshotState = {
  quality: {
    openNcrs: CountValue;
    overdueCapas: CountValue;
    openAuditFindings: CountValue;
    closedFindingsThisMonth: CountValue;
    openMocs: CountValue;
  };
  actions: {
    open: CountValue;
    overdue: CountValue;
    highPriorityOpen: CountValue;
    dueThisWeek: CountValue;
  };
  risk: {
    open: CountValue;
    highCritical: CountValue;
    overdueReviews: CountValue;
    byRating: ChartDatum[];
  };
  documents: {
    overdueReviews: CountValue;
    dueSoon: CountValue;
    pendingReviewApproval: CountValue;
  };
  assets: {
    overdueCalibration: CountValue;
    overdueInspection: CountValue;
    overdueMaintenance: CountValue;
    openAssetActions: CountValue;
  };
  errors: string[];
};

type ChartDatum = {
  name: string;
  value: number;
};

type StatusRow = {
  status: string | null;
};

type DueStatusRow = {
  status: string | null;
  due_date: string | null;
};

type AuditFindingRow = {
  status: string | null;
  closure_date: string | null;
};

type ActionRow = {
  status: string | null;
  priority: string | null;
  due_date: string | null;
  source: string | null;
  linked_asset_id: string | null;
  linked_asset_code: string | null;
};

type RiskRow = {
  status: string | null;
  residual_rating: string | null;
  next_review_due: string | null;
};

type DocumentRow = {
  status: string | null;
  review_approval_status: string | null;
  next_review_date: string | null;
};

type AssetCalibrationRow = {
  calibration_due_date: string | null;
};

type AssetInspectionRow = {
  next_inspection_due: string | null;
};

type AssetMaintenanceRow = {
  next_maintenance_due: string | null;
};

const emptySnapshot: SnapshotState = {
  quality: {
    openNcrs: null,
    overdueCapas: null,
    openAuditFindings: null,
    closedFindingsThisMonth: null,
    openMocs: null,
  },
  actions: {
    open: null,
    overdue: null,
    highPriorityOpen: null,
    dueThisWeek: null,
  },
  risk: {
    open: null,
    highCritical: null,
    overdueReviews: null,
    byRating: [],
  },
  documents: {
    overdueReviews: null,
    dueSoon: null,
    pendingReviewApproval: null,
  },
  assets: {
    overdueCalibration: null,
    overdueInspection: null,
    overdueMaintenance: null,
    openAssetActions: null,
  },
  errors: [],
};

const chartColours = ["#3A9B98", "#2563eb", "#7c3aed", "#f59e0b", "#dc2626", "#64748b"];

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

  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function isOverdueDate(value: string | null | undefined) {
  const days = getDaysFromToday(value);
  return days !== null && days < 0;
}

function isDueWithin(value: string | null | undefined, daysAhead: number) {
  const days = getDaysFromToday(value);
  return days !== null && days >= 0 && days <= daysAhead;
}

function isCurrentMonth(value: string | null | undefined) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const today = new Date();
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
}

function displayValue(value: CountValue) {
  return value === null ? "N/A" : value;
}

function displayPdfValue(value: CountValue | string) {
  return value === null ? "N/A" : String(value);
}

function countBy(items: string[]) {
  const map = new Map<string, number>();
  items.forEach((item) => {
    const label = item.trim() || "Unspecified";
    map.set(label, (map.get(label) || 0) + 1);
  });
  return [...map.entries()].map(([name, value]) => ({ name, value }));
}

function healthTone(value: CountValue, warningLimit = 0) {
  if (value === null) return "#64748b";
  return value > warningLimit ? "#dc2626" : "#16a34a";
}

async function fetchSnapshot(): Promise<SnapshotState> {
  const next: SnapshotState = {
    ...emptySnapshot,
    quality: { ...emptySnapshot.quality },
    actions: { ...emptySnapshot.actions },
    risk: { ...emptySnapshot.risk },
    documents: { ...emptySnapshot.documents },
    assets: { ...emptySnapshot.assets },
    errors: [],
  };

  const [
    ncrsResult,
    capasResult,
    findingsResult,
    mocsResult,
    actionsResult,
    risksResult,
    documentsResult,
    calibrationsResult,
    inspectionsResult,
    maintenanceResult,
  ] = await Promise.all([
    supabase.from("ncrs").select("status"),
    supabase.from("capas").select("status,due_date"),
    supabase.from("audit_findings").select("status,closure_date"),
    supabase.from("moc_reports").select("status"),
    supabase.from("actions").select("status,priority,due_date,source,linked_asset_id,linked_asset_code"),
    supabase.from("risks").select("status,residual_rating,next_review_due"),
    supabase.from("documents").select("status,review_approval_status,next_review_date"),
    supabase.from("asset_calibration_records").select("calibration_due_date"),
    supabase.from("asset_inspection_records").select("next_inspection_due"),
    supabase.from("asset_maintenance_records").select("next_maintenance_due"),
  ]);

  if (ncrsResult.error) {
    next.errors.push(`NCRs unavailable: ${ncrsResult.error.message}`);
  } else {
    const rows = (ncrsResult.data || []) as StatusRow[];
    next.quality.openNcrs = rows.filter((row) => isOpenLike(row.status)).length;
  }

  if (capasResult.error) {
    next.errors.push(`CAPAs unavailable: ${capasResult.error.message}`);
  } else {
    const rows = (capasResult.data || []) as DueStatusRow[];
    next.quality.overdueCapas = rows.filter((row) => isOpenLike(row.status) && isOverdueDate(row.due_date)).length;
  }

  if (findingsResult.error) {
    next.errors.push(`Audit findings unavailable: ${findingsResult.error.message}`);
  } else {
    const rows = (findingsResult.data || []) as AuditFindingRow[];
    next.quality.openAuditFindings = rows.filter((row) => isOpenLike(row.status)).length;
    next.quality.closedFindingsThisMonth = rows.filter(
      (row) => isClosedLike(row.status) && isCurrentMonth(row.closure_date)
    ).length;
  }

  if (mocsResult.error) {
    next.errors.push(`MOCs unavailable: ${mocsResult.error.message}`);
  } else {
    const rows = (mocsResult.data || []) as StatusRow[];
    next.quality.openMocs = rows.filter((row) => isOpenLike(row.status)).length;
  }

  if (actionsResult.error) {
    next.errors.push(`Actions unavailable: ${actionsResult.error.message}`);
  } else {
    const rows = (actionsResult.data || []) as ActionRow[];
    next.actions.open = rows.filter((row) => isOpenLike(row.status)).length;
    next.actions.overdue = rows.filter((row) => isOpenLike(row.status) && isOverdueDate(row.due_date)).length;
    next.actions.highPriorityOpen = rows.filter(
      (row) => isOpenLike(row.status) && normalise(row.priority) === "high"
    ).length;
    next.actions.dueThisWeek = rows.filter((row) => isOpenLike(row.status) && isDueWithin(row.due_date, 7)).length;
    next.assets.openAssetActions = rows.filter(
      (row) => isOpenLike(row.status) && (row.linked_asset_id || row.linked_asset_code)
    ).length;
  }

  if (risksResult.error) {
    next.errors.push(`Risks unavailable: ${risksResult.error.message}`);
  } else {
    const rows = (risksResult.data || []) as RiskRow[];
    const openRows = rows.filter((row) => isOpenLike(row.status));
    next.risk.open = openRows.length;
    next.risk.highCritical = openRows.filter((row) => ["high", "critical"].includes(normalise(row.residual_rating))).length;
    next.risk.overdueReviews = openRows.filter((row) => isOverdueDate(row.next_review_due)).length;
    next.risk.byRating = countBy(openRows.map((row) => row.residual_rating || "Unrated"));
  }

  if (documentsResult.error) {
    next.errors.push(`Documents unavailable: ${documentsResult.error.message}`);
  } else {
    const rows = (documentsResult.data || []) as DocumentRow[];
    const activeRows = rows.filter((row) => isOpenLike(row.status));
    next.documents.overdueReviews = activeRows.filter((row) => isOverdueDate(row.next_review_date)).length;
    next.documents.dueSoon = activeRows.filter((row) => isDueWithin(row.next_review_date, 30)).length;
    next.documents.pendingReviewApproval = activeRows.filter((row) =>
      ["pending review", "reviewed", "under review"].includes(normalise(row.review_approval_status))
    ).length;
  }

  if (calibrationsResult.error) {
    next.errors.push(`Calibration records unavailable: ${calibrationsResult.error.message}`);
  } else {
    const rows = (calibrationsResult.data || []) as AssetCalibrationRow[];
    next.assets.overdueCalibration = rows.filter((row) => isOverdueDate(row.calibration_due_date)).length;
  }

  if (inspectionsResult.error) {
    next.errors.push(`Inspection records unavailable: ${inspectionsResult.error.message}`);
  } else {
    const rows = (inspectionsResult.data || []) as AssetInspectionRow[];
    next.assets.overdueInspection = rows.filter((row) => isOverdueDate(row.next_inspection_due)).length;
  }

  if (maintenanceResult.error) {
    next.errors.push(`Maintenance records unavailable: ${maintenanceResult.error.message}`);
  } else {
    const rows = (maintenanceResult.data || []) as AssetMaintenanceRow[];
    next.assets.overdueMaintenance = rows.filter((row) => isOverdueDate(row.next_maintenance_due)).length;
  }

  return next;
}

export default function ManagementReviewPage() {
  const [snapshot, setSnapshot] = useState<SnapshotState>(emptySnapshot);
  const [message, setMessage] = useState("Loading management review snapshot...");
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const data = await fetchSnapshot();
      setSnapshot(data);
      setLastRefreshed(new Date().toLocaleString("en-GB"));
      setMessage(data.errors.length ? "Snapshot loaded with some unavailable source metrics." : "Snapshot loaded.");
    })();
  }, []);

  const qualityOpenItems = useMemo(() => {
    const values = [snapshot.quality.openNcrs, snapshot.quality.overdueCapas, snapshot.quality.openAuditFindings, snapshot.quality.openMocs];
    return values.some((value) => value === null) ? null : values.reduce<number>((sum, value) => sum + Number(value), 0);
  }, [snapshot.quality]);

  const assetDuePressure = useMemo(
    () => [
      { name: "Calibration", value: snapshot.assets.overdueCalibration || 0 },
      { name: "Inspection", value: snapshot.assets.overdueInspection || 0 },
      { name: "Maintenance", value: snapshot.assets.overdueMaintenance || 0 },
      { name: "Asset Actions", value: snapshot.assets.openAssetActions || 0 },
    ],
    [snapshot.assets]
  );

  const actionPressure = useMemo(
    () => [
      { name: "Open", value: snapshot.actions.open || 0 },
      { name: "Overdue", value: snapshot.actions.overdue || 0 },
      { name: "High Priority", value: snapshot.actions.highPriorityOpen || 0 },
      { name: "Due This Week", value: snapshot.actions.dueThisWeek || 0 },
    ],
    [snapshot.actions]
  );

  const documentPressure = useMemo(
    () => [
      { name: "Overdue Reviews", value: snapshot.documents.overdueReviews || 0 },
      { name: "Due Soon", value: snapshot.documents.dueSoon || 0 },
      { name: "Pending Workflow", value: snapshot.documents.pendingReviewApproval || 0 },
    ],
    [snapshot.documents]
  );

  async function generateManagementReviewPdf() {
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      const generatedAt = new Date().toLocaleString("en-GB");
      const metricColumnWidth = 58;
      const valueColumnWidth = 24;
      const contextColumnWidth = pageWidth - margin * 2 - metricColumnWidth - valueColumnWidth;
      const assetDuePressureValue =
        snapshot.assets.overdueCalibration === null ||
        snapshot.assets.overdueInspection === null ||
        snapshot.assets.overdueMaintenance === null
          ? null
          : (snapshot.assets.overdueCalibration || 0) +
            (snapshot.assets.overdueInspection || 0) +
            (snapshot.assets.overdueMaintenance || 0);

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
          if (logoDataUrl) {
            doc.addImage(logoDataUrl, "PNG", margin, 10, 48, 22);
          }
        }
      } catch {
        // Logo is optional; keep PDF generation available if the image cannot be loaded.
      }

      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(20);
      doc.text("Management Review Snapshot", pageWidth - margin, 18, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(71, 85, 105);
      doc.text("Read-only management review pack", pageWidth - margin, 25, { align: "right" });
      doc.text(`Generated: ${generatedAt}`, pageWidth - margin, 31, { align: "right" });

      doc.setDrawColor(15, 118, 110);
      doc.setLineWidth(0.7);
      doc.line(margin, 37, pageWidth - margin, 37);

      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text("Read-only snapshot from existing IMS module data. No source records are changed by this export.", margin, 43);

      autoTable(doc, {
        startY: 49,
        head: [["Executive Summary", "Value", "Review Note"]],
        body: [
          ["Quality Open Items", displayPdfValue(qualityOpenItems), "Open NCRs, overdue CAPAs, open audit findings, and open MOCs"],
          ["Overdue Actions", displayPdfValue(snapshot.actions.overdue), "Open actions past due date"],
          ["High/Critical Risks", displayPdfValue(snapshot.risk.highCritical), "Open risks rated High or Critical"],
          ["Document Reviews Due", displayPdfValue(snapshot.documents.overdueReviews), "Active documents past next review date"],
          ["Asset Due Pressure", displayPdfValue(assetDuePressureValue), "Overdue calibration, inspection, and maintenance records"],
          ["HSE Readiness", "Pending", "HSE module pending build"],
        ],
        theme: "grid",
        styles: { fontSize: 8.6, cellPadding: 2.4, valign: "middle", lineColor: [226, 232, 240] },
        headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: metricColumnWidth, fontStyle: "bold" },
          1: { cellWidth: valueColumnWidth, halign: "center" },
          2: { cellWidth: contextColumnWidth },
        },
        didParseCell: (data) => {
          if (data.column.index === 1) {
            data.cell.styles.halign = "center";
          }
        },
      });

      const addSection = (title: string, rows: Array<[string, CountValue | string, string]>) => {
        let startY = ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 18) + 8;
        if (startY > pageHeight - 54) {
          doc.addPage();
          startY = 20;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text(title, margin, startY);

        autoTable(doc, {
          startY: startY + 3,
          head: [["Metric", "Value", "Context"]],
          body: rows.map(([metric, value, context]) => [metric, displayPdfValue(value), context]),
          theme: "grid",
          styles: { fontSize: 8.2, cellPadding: 2.2, valign: "middle", lineColor: [226, 232, 240] },
          headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold" },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: {
            0: { cellWidth: metricColumnWidth, fontStyle: "bold" },
            1: { cellWidth: valueColumnWidth, halign: "center" },
            2: { cellWidth: contextColumnWidth },
          },
          didParseCell: (data) => {
            if (data.column.index === 1) {
              data.cell.styles.halign = "center";
            }
          },
        });
      };

      addSection("Quality Health", [
        ["Open NCRs", snapshot.quality.openNcrs, "NCRs not in a closed/complete state"],
        ["Overdue CAPAs", snapshot.quality.overdueCapas, "Open CAPAs past due date"],
        ["Open Audit Findings", snapshot.quality.openAuditFindings, "Audit findings not closed"],
        ["Closed Findings This Month", snapshot.quality.closedFindingsThisMonth, "Audit findings closed in the current month"],
        ["Open MOCs", snapshot.quality.openMocs, "MOC records not closed"],
      ]);

      addSection("Action Health", [
        ["Open Actions", snapshot.actions.open, "Central actions not closed/complete"],
        ["Overdue Actions", snapshot.actions.overdue, "Open actions past due date"],
        ["High Priority Open Actions", snapshot.actions.highPriorityOpen, "Open actions marked High priority"],
        ["Due This Week", snapshot.actions.dueThisWeek, "Open actions due in the next seven days"],
      ]);

      addSection("Risk Health", [
        ["Open Risks", snapshot.risk.open, "Risks not closed/archived"],
        ["High/Critical Risks", snapshot.risk.highCritical, "Open risks with High or Critical residual rating"],
        ["Overdue Risk Reviews", snapshot.risk.overdueReviews, "Open risks past next review due date"],
      ]);

      addSection("Risk Rating Distribution", [
        ...(snapshot.risk.byRating.length
          ? snapshot.risk.byRating.map((rating): [string, CountValue | string, string] => [
              rating.name,
              rating.value,
              "Open risks by residual rating",
            ])
          : ([["Risk ratings", "N/A", "No risk rating distribution available"]] as Array<
              [string, CountValue | string, string]
            >)),
      ]);

      addSection("Document Control Health", [
        ["Overdue Reviews", snapshot.documents.overdueReviews, "Active documents past next review date"],
        ["Due Soon", snapshot.documents.dueSoon, "Active documents due for review within 30 days"],
        ["Pending Review/Approval", snapshot.documents.pendingReviewApproval, "Documents in pending review or approval workflow"],
      ]);

      addSection("Asset Health", [
        ["Overdue Calibration", snapshot.assets.overdueCalibration, "Calibration records past due date"],
        ["Overdue Inspection", snapshot.assets.overdueInspection, "Inspection records past next inspection due date"],
        ["Overdue Maintenance", snapshot.assets.overdueMaintenance, "Maintenance records past next maintenance due date"],
        ["Open Asset-Linked Actions", snapshot.assets.openAssetActions, "Open actions linked to asset records"],
      ]);

      addSection("HSE Readiness", [["HSE Module", "Pending", "HSE module pending build; no HSE source metrics are included in this first pass"]]);

      if (snapshot.errors.length) {
        addSection(
          "Unavailable Metrics",
          snapshot.errors.map((error) => ["Source read", "N/A", error])
        );
      }

      const pageCount = doc.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) {
        doc.setPage(page);
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text("Enshore Subsea | Management Review Snapshot", margin, pageHeight - 8);
        doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: "right" });
      }

      doc.save(`management-review-snapshot-${new Date().toISOString().slice(0, 10)}.pdf`);
      setMessage("Management Review Snapshot PDF generated.");
    } catch (error) {
      console.error(error);
      setMessage("Management Review Snapshot PDF generation failed.");
    }
  }

  return (
    <main>
      <QualityPageHero
        label="MANAGEMENT REVIEW"
        title="Management Review Snapshot"
        description="Read-only system health snapshot for quality, actions, risk, documents, assets, and future HSE readiness."
        contextCards={[
          { label: "Last Refreshed", value: lastRefreshed || "Loading..." },
          { label: "Snapshot Scope", value: "Read-only cross-module review" },
        ]}
      />

      <div style={topRowStyle}>
        <Link href="/home" style={backLinkStyle}>
          ← Back to Home
        </Link>

        <div style={topRowActionsStyle}>
          <button type="button" onClick={() => void generateManagementReviewPdf()} style={primaryButtonStyle}>
            Export PDF
          </button>
          <div style={statusBannerStyle}>
            <strong>Status:</strong> {message}
          </div>
        </div>
      </div>

      <section style={kpiGridStyle}>
        <QualityKpiCard title="Quality Open Items" value={displayValue(qualityOpenItems)} accent={healthTone(qualityOpenItems)} />
        <QualityKpiCard
          title="Overdue Actions"
          value={displayValue(snapshot.actions.overdue)}
          accent={healthTone(snapshot.actions.overdue)}
          href="/actions?view=register&overdue=1"
        />
        <QualityKpiCard title="High/Critical Risks" value={displayValue(snapshot.risk.highCritical)} accent={healthTone(snapshot.risk.highCritical)} />
        <QualityKpiCard
          title="Document Reviews Due"
          value={displayValue(snapshot.documents.overdueReviews)}
          accent={healthTone(snapshot.documents.overdueReviews)}
          href="/documents?review=Overdue"
        />
        <QualityKpiCard title="Asset Due Pressure" value={displayValue(snapshot.assets.overdueCalibration === null || snapshot.assets.overdueInspection === null || snapshot.assets.overdueMaintenance === null ? null : (snapshot.assets.overdueCalibration || 0) + (snapshot.assets.overdueInspection || 0) + (snapshot.assets.overdueMaintenance || 0))} accent="#2563eb" />
        <QualityKpiCard title="HSE Readiness" value="Pending" accent="#64748b" />
      </section>

      <section style={panelGridStyle}>
        <SnapshotPanel title="Quality" subtitle="NCR, CAPA, audit finding, and MOC control health.">
          <MetricGrid>
            <Metric label="Open NCRs" value={snapshot.quality.openNcrs} tone={healthTone(snapshot.quality.openNcrs)} href="/ncr-capa?type=NCR&status=Open" />
            <Metric label="Overdue CAPAs" value={snapshot.quality.overdueCapas} tone={healthTone(snapshot.quality.overdueCapas)} href="/ncr-capa?type=CAPA&overdue=1" />
            <Metric
              label="Open Audit Findings"
              value={snapshot.quality.openAuditFindings}
              tone={healthTone(snapshot.quality.openAuditFindings)}
              href="/audits?view=open-findings"
            />
            <Metric label="Closed Findings This Month" value={snapshot.quality.closedFindingsThisMonth} tone="#16a34a" />
            <Metric label="Open MOCs" value={snapshot.quality.openMocs} tone={healthTone(snapshot.quality.openMocs)} href="/moc?status=Active" />
          </MetricGrid>
        </SnapshotPanel>

        <SnapshotPanel title="Actions" subtitle="Central action follow-up control across active modules.">
          <ChartBlock data={actionPressure} type="bar" />
          <MetricGrid>
            <Metric label="Open Actions" value={snapshot.actions.open} tone="#2563eb" href="/actions?view=register&status=Open" />
            <Metric label="Overdue Actions" value={snapshot.actions.overdue} tone={healthTone(snapshot.actions.overdue)} href="/actions?view=register&overdue=1" />
            <Metric
              label="High Priority"
              value={snapshot.actions.highPriorityOpen}
              tone={healthTone(snapshot.actions.highPriorityOpen)}
              href="/actions?view=register&priority=High"
            />
            <Metric label="Due This Week" value={snapshot.actions.dueThisWeek} tone="#f59e0b" href="/actions?view=register&dueWindow=7" />
          </MetricGrid>
        </SnapshotPanel>

        <SnapshotPanel title="Risk" subtitle="Risk register health using residual rating and review due dates.">
          <ChartBlock data={snapshot.risk.byRating} type="pie" />
          <MetricGrid>
            <Metric label="Open Risks" value={snapshot.risk.open} tone="#7c3aed" />
            <Metric label="Overdue Reviews" value={snapshot.risk.overdueReviews} tone={healthTone(snapshot.risk.overdueReviews)} />
          </MetricGrid>
        </SnapshotPanel>

        <SnapshotPanel title="Documents" subtitle="Document review and approval workflow health.">
          <ChartBlock data={documentPressure} type="bar" />
          <MetricGrid>
            <Metric
              label="Overdue Reviews"
              value={snapshot.documents.overdueReviews}
              tone={healthTone(snapshot.documents.overdueReviews)}
              href="/documents?review=Overdue"
            />
            <Metric label="Due Soon" value={snapshot.documents.dueSoon} tone="#f59e0b" href="/documents?review=Due%20soon" />
            <Metric label="Pending Review/Approval" value={snapshot.documents.pendingReviewApproval} tone="#2563eb" />
          </MetricGrid>
        </SnapshotPanel>

        <SnapshotPanel title="Assets" subtitle="Calibration, inspection, maintenance, and asset-linked action pressure.">
          <ChartBlock data={assetDuePressure} type="bar" />
          <MetricGrid>
            <Metric label="Overdue Calibration" value={snapshot.assets.overdueCalibration} tone={healthTone(snapshot.assets.overdueCalibration)} />
            <Metric label="Overdue Inspection" value={snapshot.assets.overdueInspection} tone={healthTone(snapshot.assets.overdueInspection)} />
            <Metric label="Overdue Maintenance" value={snapshot.assets.overdueMaintenance} tone={healthTone(snapshot.assets.overdueMaintenance)} />
            <Metric label="Open Asset Actions" value={snapshot.assets.openAssetActions} tone="#2563eb" />
          </MetricGrid>
        </SnapshotPanel>

        <SnapshotPanel title="HSE" subtitle="Placeholder only for the first read-only snapshot.">
          <div style={placeholderStyle}>
            <div style={placeholderTitleStyle}>HSE module pending build</div>
            <p style={placeholderTextStyle}>
              HSE health indicators will be added once the HSE module and source data are approved.
            </p>
          </div>
        </SnapshotPanel>
      </section>

      {snapshot.errors.length ? (
        <section style={panelStyle}>
          <ModuleSectionHeader
            title="Unavailable Metrics"
            subtitle="These source reads were not available, so affected metrics are shown as N/A."
          />
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

function SnapshotPanel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section style={panelStyle}>
      <ModuleSectionHeader title={title} subtitle={subtitle} />
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

  if (href) {
    return (
      <Link href={href} style={metricLinkStyle}>
        {content}
      </Link>
    );
  }

  return content;
}

function ChartBlock({ data, type }: { data: ChartDatum[]; type: "bar" | "pie" }) {
  if (!data.length || data.every((item) => item.value === 0)) {
    return <div style={emptyChartStyle}>No chart data available yet.</div>;
  }

  if (type === "pie") {
    return (
      <div style={chartWrapStyle}>
        <ResponsiveContainer width="100%" height={210}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={76} paddingAngle={2} label>
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={chartColours[index % chartColours.length]} />
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
      <ResponsiveContainer width="100%" height={210}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={chartColours[index % chartColours.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const topRowStyle: CSSProperties = {
  marginBottom: "20px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
};

const topRowActionsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: "12px",
  flexWrap: "wrap",
  marginLeft: "auto",
};

const backLinkStyle: CSSProperties = {
  color: "#3A9B98",
  fontWeight: 700,
  textDecoration: "none",
};

const statusBannerStyle: CSSProperties = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "12px 16px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
  color: "#0f172a",
};

const primaryButtonStyle: CSSProperties = {
  background: "#3A9B98",
  color: "white",
  border: "none",
  padding: "11px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 700,
};

const kpiGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "16px",
  marginBottom: "20px",
};

const panelGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "20px",
};

const panelStyle: CSSProperties = {
  background: "white",
  borderRadius: "18px",
  padding: "20px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
};

const metricGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "12px",
};

const metricCardStyle: CSSProperties = {
  position: "relative",
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  background: "#f8fafc",
  padding: "14px",
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
  fontSize: "12px",
  color: "#64748b",
  fontWeight: 800,
  textTransform: "uppercase",
  marginBottom: "8px",
};

const metricValueStyle: CSSProperties = {
  fontSize: "28px",
  color: "#0f172a",
  fontWeight: 800,
};

const chartWrapStyle: CSSProperties = {
  minHeight: "226px",
  marginBottom: "14px",
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  background: "#f8fafc",
  padding: "10px",
};

const emptyChartStyle: CSSProperties = {
  minHeight: "120px",
  marginBottom: "14px",
  border: "1px dashed #cbd5e1",
  borderRadius: "14px",
  background: "#f8fafc",
  color: "#64748b",
  display: "grid",
  placeItems: "center",
  fontSize: "14px",
};

const placeholderStyle: CSSProperties = {
  border: "1px dashed #cbd5e1",
  borderRadius: "14px",
  padding: "22px",
  background: "#f8fafc",
};

const placeholderTitleStyle: CSSProperties = {
  fontSize: "18px",
  fontWeight: 800,
  color: "#0f172a",
};

const placeholderTextStyle: CSSProperties = {
  margin: "8px 0 0",
  color: "#64748b",
  lineHeight: 1.5,
};

const errorListStyle: CSSProperties = {
  margin: 0,
  paddingLeft: "20px",
  color: "#92400e",
};

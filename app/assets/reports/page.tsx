"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { QualityPageHero } from "../../../src/components/QualityPageHero";
import { supabase } from "../../../src/lib/supabase";

type Asset = {
  id: string;
  asset_code: string | null;
  name: string | null;
  status: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type AssetCalibrationRecord = {
  id: string;
  asset_id: string | null;
  reference: string | null;
  calibration_date: string | null;
  calibration_due_date: string | null;
  calibration_type: string | null;
  calibrated_by: string | null;
  certificate_number: string | null;
};

type AssetInspectionRecord = {
  id: string;
  asset_id: string;
  reference: string | null;
  inspection_date: string | null;
  inspector: string | null;
  result: string | null;
  findings: string | null;
  actions_required: string | null;
  next_inspection_due: string | null;
};

type AssetMaintenanceRecord = {
  id: string;
  asset_id: string;
  maintenance_date: string | null;
  maintenance_type: string | null;
  carried_out_by: string | null;
  description: string | null;
  next_maintenance_due: string | null;
  action_required?: boolean | null;
};

type AssetLinkedAction = {
  id: string;
  action_number: string | null;
  title: string | null;
  description: string | null;
  status: string | null;
  linked_asset_id: string | null;
  linked_asset_code: string | null;
  created_at: string | null;
  due_date: string | null;
};

type ReportForm = {
  monthIndex: number;
  year: string;
  executiveSummary: string;
  nextMonthFocus: string;
};

type AssetMonthlyReport = {
  id: string;
  month_label: string;
  summary: string | null;
  wins: string | null;
  risks: string | null;
  next_steps: string | null;
  snapshot_json: Record<string, unknown> | null;
  created_at: string | null;
};

type AssetManagementMetrics = {
  monthLabel: string;
  assetsSummary: {
    totalAssets: number;
    activeAssets: number;
    inactiveAssets: number;
  };
  calibrationSummary: {
    dueThisMonth: number;
    overdue: number;
    completedThisMonth: number;
  };
  inspectionSummary: {
    completedThisMonth: number;
    overdue: number;
    dueSoon: number;
    attentionRequired: number;
  };
  maintenanceSummary: {
    completedThisMonth: number;
    overdue: number;
    dueSoon: number;
    actionRequired: number;
  };
  actionsSummary: {
    openLinkedAssetActions: number;
    overdueLinkedAssetActions: number;
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

const logoFileName = "/enshore-logo.png";

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

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

function getMonthLabel(monthIndex: number, year: number) {
  return `${monthOptions[monthIndex]} ${year}`;
}

function isDateInMonth(value: string | null | undefined, monthIndex: number, year: number) {
  const date = parseDate(value);
  if (!date) return false;
  return date.getMonth() === monthIndex && date.getFullYear() === year;
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

function isClosedStatus(value: string | null | undefined) {
  const normal = (value || "").trim().toLowerCase();
  return normal === "closed" || normal === "complete" || normal === "completed";
}

function buildAssetLabel(asset: Asset | null) {
  if (!asset) return "Unknown asset";
  const code = asset.asset_code || asset.id;
  const name = asset.name || "Unnamed asset";
  return `${code} - ${name}`;
}

function buildPdfMetricTable(doc: jsPDF, startY: number, title: string, rows: Array<[string, string | number]>) {
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
      fillColor: [15, 118, 110],
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

function buildExecutiveSummary(metrics: AssetManagementMetrics) {
  const lines: string[] = [];

  lines.push(
    `Asset register coverage stands at ${metrics.assetsSummary.totalAssets} total assets, with ${metrics.assetsSummary.activeAssets} active and ${metrics.assetsSummary.inactiveAssets} inactive or out-of-service.`
  );

  if (metrics.calibrationSummary.overdue > 0) {
    lines.push(
      `Calibration exposure remains active with ${metrics.calibrationSummary.overdue} overdue records, while ${metrics.calibrationSummary.completedThisMonth} calibrations were completed during ${metrics.monthLabel}.`
    );
  } else {
    lines.push(
      `Calibration control is stable this month, with no overdue items currently visible and ${metrics.calibrationSummary.completedThisMonth} calibrations completed.`
    );
  }

  if (metrics.inspectionSummary.overdue > 0 || metrics.inspectionSummary.attentionRequired > 0) {
    lines.push(
      `Inspection follow-up needs attention: ${metrics.inspectionSummary.overdue} inspections are overdue, ${metrics.inspectionSummary.dueSoon} are due soon, and ${metrics.inspectionSummary.attentionRequired} completed inspections recorded failures or action-required outcomes.`
    );
  } else {
    lines.push(
      `Inspection performance is currently controlled, with ${metrics.inspectionSummary.completedThisMonth} inspections completed and no overdue or action-required exceptions recorded in the monthly view.`
    );
  }

  if (metrics.maintenanceSummary.overdue > 0 || metrics.maintenanceSummary.actionRequired > 0) {
    lines.push(
      `Maintenance planning remains active, with ${metrics.maintenanceSummary.overdue} overdue items, ${metrics.maintenanceSummary.dueSoon} due soon, and ${metrics.maintenanceSummary.actionRequired} completed maintenance records carrying an action-required flag.`
    );
  } else {
    lines.push(
      `Maintenance workload is being managed within the current window, with ${metrics.maintenanceSummary.completedThisMonth} maintenance records completed and no action-required exceptions in the monthly summary.`
    );
  }

  if (metrics.actionsSummary.openLinkedAssetActions > 0) {
    lines.push(
      `Linked asset actions remain open at ${metrics.actionsSummary.openLinkedAssetActions}, including ${metrics.actionsSummary.overdueLinkedAssetActions} already past due and requiring management follow-up.`
    );
  } else {
    lines.push("No open linked asset actions are currently visible against the asset portfolio.");
  }

  return lines.join(" ");
}

function parseReportFormFromSavedReport(report: AssetMonthlyReport): ReportForm {
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

function getSnapshotSummary(report: AssetMonthlyReport) {
  const snapshot = report.snapshot_json || {};
  const assetSummary = snapshot.assets_summary as Record<string, unknown> | undefined;
  const calibrationSummary = snapshot.calibration_summary as Record<string, unknown> | undefined;
  const inspectionSummary = snapshot.inspection_summary as Record<string, unknown> | undefined;
  const maintenanceSummary = snapshot.maintenance_summary as Record<string, unknown> | undefined;
  const actionsSummary = snapshot.actions_summary as Record<string, unknown> | undefined;

  const totalAssets = typeof assetSummary?.total_assets === "number" ? String(assetSummary.total_assets) : "-";
  const overdueCalibrations =
    typeof calibrationSummary?.overdue === "number" ? String(calibrationSummary.overdue) : "-";
  const overdueInspections = typeof inspectionSummary?.overdue === "number" ? String(inspectionSummary.overdue) : "-";
  const overdueMaintenance =
    typeof maintenanceSummary?.overdue === "number" ? String(maintenanceSummary.overdue) : "-";
  const openActions =
    typeof actionsSummary?.open_linked_asset_actions === "number"
      ? String(actionsSummary.open_linked_asset_actions)
      : "-";

  return `Assets: ${totalAssets} | Overdue cal: ${overdueCalibrations} | Overdue insp: ${overdueInspections} | Overdue maint: ${overdueMaintenance} | Open actions: ${openActions}`;
}

export default function AssetReportsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [calibrationRecords, setCalibrationRecords] = useState<AssetCalibrationRecord[]>([]);
  const [inspectionRecords, setInspectionRecords] = useState<AssetInspectionRecord[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<AssetMaintenanceRecord[]>([]);
  const [actions, setActions] = useState<AssetLinkedAction[]>([]);
  const [reports, setReports] = useState<AssetMonthlyReport[]>([]);
  const [message, setMessage] = useState("Loading asset reporting workspace...");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState("");
  const [form, setForm] = useState<ReportForm>(defaultForm);

  async function loadData() {
    const [assetsRes, calibrationsRes, inspectionsRes, maintenanceRes, actionsRes, reportsRes] = await Promise.all([
      supabase.from("assets").select("*").order("name", { ascending: true }),
      supabase.from("asset_calibration_records").select("*"),
      supabase.from("asset_inspection_records").select("*"),
      supabase.from("asset_maintenance_records").select("*"),
      supabase.from("actions").select("id,action_number,title,description,status,linked_asset_id,linked_asset_code,created_at,due_date"),
      supabase.from("asset_monthly_reports").select("*").order("created_at", { ascending: false }),
    ]);

    if (
      assetsRes.error ||
      calibrationsRes.error ||
      inspectionsRes.error ||
      maintenanceRes.error ||
      actionsRes.error ||
      reportsRes.error
    ) {
      setMessage(
        `Error: ${
          assetsRes.error?.message ||
          calibrationsRes.error?.message ||
          inspectionsRes.error?.message ||
          maintenanceRes.error?.message ||
          actionsRes.error?.message ||
          reportsRes.error?.message ||
          "Unknown error"
        }`
      );
      return;
    }

    setAssets((assetsRes.data || []) as Asset[]);
    setCalibrationRecords((calibrationsRes.data || []) as AssetCalibrationRecord[]);
    setInspectionRecords((inspectionsRes.data || []) as AssetInspectionRecord[]);
    setMaintenanceRecords((maintenanceRes.data || []) as AssetMaintenanceRecord[]);
    setActions((actionsRes.data || []) as AssetLinkedAction[]);
    setReports((reportsRes.data || []) as AssetMonthlyReport[]);
    setLastRefreshed(new Date().toLocaleString("en-GB"));
    setMessage("Asset reporting workspace loaded.");
  }

  useEffect(() => {
    void loadData();
  }, []);

  const selectedYear = useMemo(() => {
    const parsed = Number(form.year);
    return Number.isFinite(parsed) && parsed >= 2000 ? parsed : currentDate.getFullYear();
  }, [form.year]);

  const assetMap = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);
  const assetCodeMap = useMemo(() => {
    const map = new Map<string, Asset>();
    assets.forEach((asset) => {
      const code = asset.asset_code?.trim();
      if (code) map.set(code, asset);
    });
    return map;
  }, [assets]);

  const linkedAssetActions = useMemo(() => {
    return actions
      .filter((action) => {
        const linkedAssetId = action.linked_asset_id?.trim();
        const linkedAssetCode = action.linked_asset_code?.trim();
        return Boolean((linkedAssetId && assetMap.has(linkedAssetId)) || (linkedAssetCode && assetCodeMap.has(linkedAssetCode)));
      })
      .map((action) => {
        const asset =
          (action.linked_asset_id?.trim() ? assetMap.get(action.linked_asset_id.trim()) : null) ||
          (action.linked_asset_code?.trim() ? assetCodeMap.get(action.linked_asset_code.trim()) : null) ||
          null;
        return { action, asset };
      });
  }, [actions, assetCodeMap, assetMap]);

  const buildMetricsForPeriod = (monthIndex: number, year: number): AssetManagementMetrics => {
    const calibrationOverdue = calibrationRecords.filter((record) => {
      const days = getDaysFromToday(record.calibration_due_date);
      return days !== null && days < 0;
    });

    const inspectionOverdue = inspectionRecords.filter((record) => {
      const days = getDaysFromToday(record.next_inspection_due);
      return days !== null && days < 0;
    });

    const inspectionDueSoon = inspectionRecords.filter((record) => {
      const days = getDaysFromToday(record.next_inspection_due);
      return days !== null && days >= 0 && days <= 30;
    });

    const maintenanceOverdue = maintenanceRecords.filter((record) => {
      const days = getDaysFromToday(record.next_maintenance_due);
      return days !== null && days < 0;
    });

    const maintenanceDueSoon = maintenanceRecords.filter((record) => {
      const days = getDaysFromToday(record.next_maintenance_due);
      return days !== null && days >= 0 && days <= 30;
    });

    const openLinkedAssetActions = linkedAssetActions.filter(({ action }) => !isClosedStatus(action.status));
    const overdueLinkedAssetActions = openLinkedAssetActions.filter(({ action }) => {
      const days = getDaysFromToday(action.due_date);
      return days !== null && days < 0;
    });

    return {
      monthLabel: getMonthLabel(monthIndex, year),
      assetsSummary: {
        totalAssets: assets.length,
        activeAssets: assets.filter((asset) => (asset.status || "").trim().toLowerCase() === "active").length,
        inactiveAssets: assets.filter((asset) => {
          const status = (asset.status || "").trim().toLowerCase();
          return status !== "" && status !== "active";
        }).length,
      },
      calibrationSummary: {
        dueThisMonth: calibrationRecords.filter((record) => isDateInMonth(record.calibration_due_date, monthIndex, year)).length,
        overdue: calibrationOverdue.length,
        completedThisMonth: calibrationRecords.filter((record) => isDateInMonth(record.calibration_date, monthIndex, year)).length,
      },
      inspectionSummary: {
        completedThisMonth: inspectionRecords.filter((record) => isDateInMonth(record.inspection_date, monthIndex, year)).length,
        overdue: inspectionOverdue.length,
        dueSoon: inspectionDueSoon.length,
        attentionRequired: inspectionRecords.filter((record) => {
          const result = (record.result || "").trim().toLowerCase();
          return isDateInMonth(record.inspection_date, monthIndex, year) && (result.includes("fail") || Boolean(record.actions_required?.trim()));
        }).length,
      },
      maintenanceSummary: {
        completedThisMonth: maintenanceRecords.filter((record) => isDateInMonth(record.maintenance_date, monthIndex, year)).length,
        overdue: maintenanceOverdue.length,
        dueSoon: maintenanceDueSoon.length,
        actionRequired: maintenanceRecords.filter(
          (record) => isDateInMonth(record.maintenance_date, monthIndex, year) && Boolean(record.action_required)
        ).length,
      },
      actionsSummary: {
        openLinkedAssetActions: openLinkedAssetActions.length,
        overdueLinkedAssetActions: overdueLinkedAssetActions.length,
      },
    };
  };

  const metrics = useMemo(
    () => buildMetricsForPeriod(form.monthIndex, selectedYear),
    [assets, calibrationRecords, form.monthIndex, inspectionRecords, linkedAssetActions, maintenanceRecords, selectedYear]
  );

  const reportCards = useMemo(
    () => [
      {
        title: "A. Assets",
        rows: [
          ["Total assets", metrics.assetsSummary.totalAssets],
          ["Active assets", metrics.assetsSummary.activeAssets],
          ["Inactive / out of service", metrics.assetsSummary.inactiveAssets],
        ] as Array<[string, string | number]>,
      },
      {
        title: "B. Calibration",
        rows: [
          ["Due this month", metrics.calibrationSummary.dueThisMonth],
          ["Overdue calibration", metrics.calibrationSummary.overdue],
          ["Completed this month", metrics.calibrationSummary.completedThisMonth],
        ] as Array<[string, string | number]>,
      },
      {
        title: "C. Inspection",
        rows: [
          ["Completed this month", metrics.inspectionSummary.completedThisMonth],
          ["Overdue inspections", metrics.inspectionSummary.overdue],
          ["Due soon (30 days)", metrics.inspectionSummary.dueSoon],
          ["Failed / attention required", metrics.inspectionSummary.attentionRequired],
        ] as Array<[string, string | number]>,
      },
      {
        title: "D. Maintenance",
        rows: [
          ["Completed this month", metrics.maintenanceSummary.completedThisMonth],
          ["Overdue maintenance", metrics.maintenanceSummary.overdue],
          ["Due soon (30 days)", metrics.maintenanceSummary.dueSoon],
          ["Action required", metrics.maintenanceSummary.actionRequired],
        ] as Array<[string, string | number]>,
      },
      {
        title: "E. Linked Actions",
        rows: [
          ["Open linked asset actions", metrics.actionsSummary.openLinkedAssetActions],
          ["Overdue linked asset actions", metrics.actionsSummary.overdueLinkedAssetActions],
        ] as Array<[string, string | number]>,
      },
    ],
    [metrics]
  );

  const latestDataLabel = useMemo(() => {
    const latestReport = reports[0];
    if (latestReport) return latestReport.month_label;

    const latestItems = [
      ...assets.map((asset) => ({
        label: buildAssetLabel(asset),
        time: asset.updated_at || asset.created_at || null,
      })),
      ...calibrationRecords.map((record) => ({
        label: record.certificate_number || record.reference || "Calibration record",
        time: record.calibration_date || record.calibration_due_date || null,
      })),
      ...inspectionRecords.map((record) => ({
        label: record.reference || record.result || "Inspection record",
        time: record.inspection_date || record.next_inspection_due || null,
      })),
      ...maintenanceRecords.map((record) => ({
        label: record.maintenance_type || "Maintenance record",
        time: record.maintenance_date || record.next_maintenance_due || null,
      })),
      ...linkedAssetActions.map(({ action }) => ({
        label: action.action_number || action.title || "Linked action",
        time: action.created_at || action.due_date || null,
      })),
    ]
      .filter((item) => item.time)
      .sort((a, b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime());

    return latestItems[0]?.label || "On-demand reporting";
  }, [assets, calibrationRecords, inspectionRecords, linkedAssetActions, maintenanceRecords, reports]);

  function resetForm() {
    setForm(defaultForm());
    setEditingId(null);
  }

  function handleEdit(report: AssetMonthlyReport) {
    setEditingId(report.id);
    setForm(parseReportFormFromSavedReport(report));
    setMessage(`Editing asset report: ${report.month_label}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Are you sure you want to delete this asset report?");
    if (!confirmed) return;

    const { error } = await supabase.from("asset_monthly_reports").delete().eq("id", id);

    if (error) {
      setMessage(`Delete failed: ${error.message}`);
      return;
    }

    if (editingId === id) {
      resetForm();
    }

    setMessage("Asset monthly report deleted successfully.");
    await loadData();
  }

  async function saveMonthlyReport(e: FormEvent) {
    e.preventDefault();

    if (!Number.isFinite(selectedYear) || selectedYear < 2000) {
      setMessage("Enter a valid report year.");
      return;
    }

    const monthLabel = getMonthLabel(form.monthIndex, selectedYear);
    const snapshot = {
      report_month: form.monthIndex + 1,
      report_year: selectedYear,
      assets_summary: {
        total_assets: metrics.assetsSummary.totalAssets,
        active_assets: metrics.assetsSummary.activeAssets,
        inactive_assets: metrics.assetsSummary.inactiveAssets,
      },
      calibration_summary: {
        due_this_month: metrics.calibrationSummary.dueThisMonth,
        overdue: metrics.calibrationSummary.overdue,
        completed_this_month: metrics.calibrationSummary.completedThisMonth,
      },
      inspection_summary: {
        completed_this_month: metrics.inspectionSummary.completedThisMonth,
        overdue: metrics.inspectionSummary.overdue,
        due_soon: metrics.inspectionSummary.dueSoon,
        attention_required: metrics.inspectionSummary.attentionRequired,
      },
      maintenance_summary: {
        completed_this_month: metrics.maintenanceSummary.completedThisMonth,
        overdue: metrics.maintenanceSummary.overdue,
        due_soon: metrics.maintenanceSummary.dueSoon,
        action_required: metrics.maintenanceSummary.actionRequired,
      },
      actions_summary: {
        open_linked_asset_actions: metrics.actionsSummary.openLinkedAssetActions,
        overdue_linked_asset_actions: metrics.actionsSummary.overdueLinkedAssetActions,
      },
    };

    const payload = {
      month_label: monthLabel,
      summary: form.executiveSummary.trim() || null,
      wins: null,
      risks: null,
      next_steps: form.nextMonthFocus.trim() || null,
      snapshot_json: snapshot,
    };

    if (editingId) {
      const { error } = await supabase.from("asset_monthly_reports").update(payload).eq("id", editingId);

      if (error) {
        setMessage(`Update report failed: ${error.message}`);
        return;
      }

      setMessage("Asset monthly report updated successfully.");
    } else {
      const { error } = await supabase.from("asset_monthly_reports").insert([payload]);

      if (error) {
        setMessage(`Save report failed: ${error.message}`);
        return;
      }

      setMessage("Asset monthly report saved successfully.");
    }

    resetForm();
    await loadData();
  }

  async function generatePdfReport(sourceReport?: AssetMonthlyReport) {
    try {
      setIsGeneratingPdf(true);

      const selectedPeriod = sourceReport ? parseReportFormFromSavedReport(sourceReport) : form;
      const pdfYear = Number(selectedPeriod.year);
      const safeYear = Number.isFinite(pdfYear) && pdfYear >= 2000 ? pdfYear : currentDate.getFullYear();
      const pdfMetrics = buildMetricsForPeriod(selectedPeriod.monthIndex, safeYear);
      const executiveSummary = (selectedPeriod.executiveSummary || "").trim() || buildExecutiveSummary(pdfMetrics);
      const nextMonthFocus = (selectedPeriod.nextMonthFocus || "").trim();
      const reportTitle = `Asset Monthly Report - ${pdfMetrics.monthLabel}`;

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      const generatedAt = new Date().toLocaleString("en-GB");

      try {
        const logoResponse = await fetch(logoFileName);
        if (logoResponse.ok) {
          const logoBlob = await logoResponse.blob();
          const logoFile = new File([logoBlob], "enshore-logo.png", {
            type: logoBlob.type || "image/png",
          });
          const logoDataUrl = await toDataUrl(logoFile);
          doc.addImage(logoDataUrl, "PNG", margin, 10, 48, 22);
        }
      } catch {
        // Keep PDF generation resilient if the logo cannot be loaded.
      }

      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(20);
      doc.text("Asset Monthly Report", pageWidth - margin, 18, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(71, 85, 105);
      doc.text(pdfMetrics.monthLabel, pageWidth - margin, 25, { align: "right" });
      doc.text(`Generated: ${generatedAt}`, pageWidth - margin, 31, { align: "right" });

      doc.setDrawColor(15, 118, 110);
      doc.setLineWidth(0.7);
      doc.line(margin, 37, pageWidth - margin, 37);

      let y = 45;

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

      y = buildPdfMetricTable(doc, y, "A. Assets", [
        ["Total assets", pdfMetrics.assetsSummary.totalAssets],
        ["Active assets", pdfMetrics.assetsSummary.activeAssets],
        ["Inactive / out of service", pdfMetrics.assetsSummary.inactiveAssets],
      ]);

      y = buildPdfMetricTable(doc, y, "B. Calibration", [
        ["Calibration due this month", pdfMetrics.calibrationSummary.dueThisMonth],
        ["Calibration overdue", pdfMetrics.calibrationSummary.overdue],
        ["Calibration completed this month", pdfMetrics.calibrationSummary.completedThisMonth],
      ]);

      y = buildPdfMetricTable(doc, y, "C. Inspection", [
        ["Inspections completed this month", pdfMetrics.inspectionSummary.completedThisMonth],
        ["Inspections overdue", pdfMetrics.inspectionSummary.overdue],
        ["Inspections due in next 30 days", pdfMetrics.inspectionSummary.dueSoon],
        ["Failed / attention required", pdfMetrics.inspectionSummary.attentionRequired],
      ]);

      y = buildPdfMetricTable(doc, y, "D. Maintenance", [
        ["Maintenance completed this month", pdfMetrics.maintenanceSummary.completedThisMonth],
        ["Maintenance overdue", pdfMetrics.maintenanceSummary.overdue],
        ["Maintenance due in next 30 days", pdfMetrics.maintenanceSummary.dueSoon],
        ["Maintenance action required", pdfMetrics.maintenanceSummary.actionRequired],
      ]);

      y = buildPdfMetricTable(doc, y, "E. Linked Actions", [
        ["Open linked asset actions", pdfMetrics.actionsSummary.openLinkedAssetActions],
        ["Overdue linked asset actions", pdfMetrics.actionsSummary.overdueLinkedAssetActions],
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
        y += nextMonthLines.length * 4.5 + 7;
      }

      const overdueCalibrationRows = calibrationRecords
        .filter((record) => {
          const days = getDaysFromToday(record.calibration_due_date);
          return days !== null && days < 0;
        })
        .map((record) => {
          const asset = record.asset_id ? assetMap.get(record.asset_id) || null : null;
          return [
            buildAssetLabel(asset),
            record.certificate_number || record.reference || "Calibration record",
            formatDate(record.calibration_due_date),
            record.calibration_type || "-",
            record.calibrated_by || "-",
          ];
        });

      const overdueInspectionRows = inspectionRecords
        .filter((record) => {
          const days = getDaysFromToday(record.next_inspection_due);
          return days !== null && days < 0;
        })
        .map((record) => {
          const asset = assetMap.get(record.asset_id) || null;
          return [
            buildAssetLabel(asset),
            record.reference || record.result || "Inspection record",
            formatDate(record.next_inspection_due),
            record.result || "-",
            record.inspector || "-",
          ];
        });

      const overdueMaintenanceRows = maintenanceRecords
        .filter((record) => {
          const days = getDaysFromToday(record.next_maintenance_due);
          return days !== null && days < 0;
        })
        .map((record) => {
          const asset = assetMap.get(record.asset_id) || null;
          return [
            buildAssetLabel(asset),
            record.maintenance_type || "Maintenance record",
            formatDate(record.next_maintenance_due),
            record.carried_out_by || "-",
            record.description || "-",
          ];
        });

      const openLinkedActionRows = linkedAssetActions
        .filter(({ action }) => !isClosedStatus(action.status))
        .map(({ action, asset }) => [
          buildAssetLabel(asset),
          action.action_number || action.title || "Linked action",
          formatDate(action.due_date),
          action.status || "Open",
          action.title || action.description || "-",
        ]);

      const sectionTables = [
        {
          title: "Overdue Calibration",
          head: [["Asset", "Reference", "Due Date", "Type", "Calibrated By"]],
          rows: overdueCalibrationRows,
        },
        {
          title: "Overdue Inspections",
          head: [["Asset", "Reference", "Due Date", "Result", "Carried Out By"]],
          rows: overdueInspectionRows,
        },
        {
          title: "Overdue Maintenance",
          head: [["Asset", "Reference", "Due Date", "Carried Out By", "Description"]],
          rows: overdueMaintenanceRows,
        },
        {
          title: "Open Linked Asset Actions",
          head: [["Asset", "Action", "Due Date", "Status", "Description"]],
          rows: openLinkedActionRows,
        },
      ];

      sectionTables.forEach((section) => {
        if (y + 26 > pageHeight - 18) {
          doc.addPage();
          y = 18;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text(section.title, margin, y);

        autoTable(doc, {
          startY: y + 4,
          theme: "grid",
          margin: { left: margin, right: margin, bottom: 16 },
          head: section.head as string[][],
          body:
            section.rows.length
              ? section.rows
              : [new Array(section.head[0].length).fill("-").map((value, index) => (index === 0 ? "No items" : value))],
          styles: {
            fontSize: 9.2,
            cellPadding: 3,
            lineColor: [203, 213, 225],
            lineWidth: 0.2,
            textColor: [15, 23, 42],
            overflow: "linebreak",
          },
          headStyles: {
            fillColor: [15, 118, 110],
            textColor: [255, 255, 255],
            fontStyle: "bold",
          },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          rowPageBreak: "avoid",
        });

        y = ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || y) + 8;
      });

      const pageCount = doc.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) {
        doc.setPage(page);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Enshore Subsea | ${pdfMetrics.monthLabel}`, margin, pageHeight - 8);
        doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 8, {
          align: "right",
        });
      }

      const pdfBlob = doc.output("blob");
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, "_blank", "noopener,noreferrer");
      doc.save(`${reportTitle.replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "-")}.pdf`);
      setMessage("Asset Monthly Report PDF generated successfully.");
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
        label="ASSET MANAGEMENT REPORTING"
        title="Reports"
        description="Generate concise monthly asset management summaries from live asset, calibration, inspection, maintenance, and linked action data."
        contextCards={[
          { label: "Last Refreshed", value: lastRefreshed || "-" },
          { label: "Latest Report", value: latestDataLabel },
        ]}
      />

      <div
        style={{
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <Link href="/assets/dashboard" style={backLinkStyle}>
          ← Back to Dashboard
        </Link>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button type="button" style={pdfButtonStyle} onClick={() => void generatePdfReport()} disabled={isGeneratingPdf}>
            {isGeneratingPdf ? "Generating PDF..." : "Generate Monthly PDF"}
          </button>
        </div>
      </div>

      <section style={statusBannerStyle}>
        <strong>Status:</strong> {message}
      </section>

      <section style={twoColumnGridStyle}>
        <div style={panelStyle}>
          <div style={sectionHeaderRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>
                {editingId ? "Edit Monthly Management Report" : "Create Monthly Management Report"}
              </h2>
              <p style={sectionSubtitleStyle}>
                Choose the reporting month and generate a concise management pack from verified asset data fields.
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
                <span>Executive Summary</span>
                <textarea
                  value={form.executiveSummary}
                  onChange={(e) => setForm((prev) => ({ ...prev, executiveSummary: e.target.value }))}
                  style={textareaStyle}
                  rows={4}
                  placeholder="Optional short management summary for this asset reporting month."
                />
              </label>

              <label style={fieldLabelStyle}>
                <span>Next Month Focus / Planned Activity</span>
                <textarea
                  value={form.nextMonthFocus}
                  onChange={(e) => setForm((prev) => ({ ...prev, nextMonthFocus: e.target.value }))}
                  style={textareaStyle}
                  rows={4}
                  placeholder="Optional forward-look for asset management priorities."
                />
              </label>
            </div>

            <div style={periodPreviewStyle}>
              <strong>Report Period:</strong> {metrics.monthLabel}
            </div>

            <div style={buttonRowStyle}>
              <button type="submit" style={primaryButtonStyle}>
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
                Live monthly summary blocks used to build the asset management PDF.
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
              Reopen saved asset monthly periods and generate the concise PDF directly from each row.
            </p>
          </div>
          <div style={registerCountStyle}>{reports.length} reports</div>
        </div>

        {reports.length === 0 ? (
          <p style={emptyTextStyle}>No asset monthly reports saved yet.</p>
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
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td style={tableCellStyle}>{report.month_label}</td>
                    <td style={tableCellStyle}>{getSnapshotSummary(report)}</td>
                    <td style={tableCellStyle}>{formatDateTime(report.created_at)}</td>
                    <td style={tableCellStyle}>
                      <div style={actionButtonsWrapStyle}>
                        <button type="button" style={miniButtonStyle} onClick={() => void generatePdfReport(report)}>
                          PDF
                        </button>
                        <button type="button" style={miniButtonStyle} onClick={() => handleEdit(report)}>
                          Edit
                        </button>
                        <button type="button" style={miniButtonDeleteStyle} onClick={() => void handleDelete(report.id)}>
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
  color: "#0f766e",
  fontWeight: 700,
  textDecoration: "none",
};

const statusBannerStyle: CSSProperties = {
  background: "white",
  borderRadius: "14px",
  padding: "14px 18px",
  marginBottom: "24px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
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
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
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
  color: "#0f172a",
};

const sectionSubtitleStyle: CSSProperties = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: "14px",
};

const formGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
};

const fieldLabelStyle: CSSProperties = {
  display: "grid",
  gap: "6px",
  color: "#475569",
  fontSize: "13px",
  fontWeight: 700,
};

const narrativeStackStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
  marginTop: "12px",
};

const inputStyle: CSSProperties = {
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  minWidth: "180px",
  background: "white",
  color: "#0f172a",
};

const textareaStyle: CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  minHeight: "96px",
  fontFamily: "inherit",
};

const primaryButtonStyle: CSSProperties = {
  background: "#0f766e",
  color: "white",
  border: "none",
  padding: "10px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 700,
};

const secondaryButtonStyle: CSSProperties = {
  background: "#e2e8f0",
  color: "#0f172a",
  border: "none",
  padding: "10px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 700,
};

const pdfButtonStyle: CSSProperties = {
  background: "#1d4ed8",
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
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#334155",
};

const snapshotCardsWrapStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "14px",
};

const snapshotCardStyle: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  padding: "14px",
  background: "#f8fafc",
};

const snapshotCardTitleStyle: CSSProperties = {
  fontSize: "15px",
  fontWeight: 800,
  color: "#0f172a",
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
  color: "#475569",
  fontSize: "13px",
};

const snapshotValueStyle: CSSProperties = {
  color: "#0f172a",
  fontSize: "14px",
};

const registerCountStyle: CSSProperties = {
  fontSize: "13px",
  color: "#64748b",
  fontWeight: 700,
};

const emptyTextStyle: CSSProperties = {
  color: "#64748b",
  margin: 0,
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const tableHeadStyle: CSSProperties = {
  textAlign: "left",
  padding: "12px 10px",
  borderBottom: "1px solid #e2e8f0",
  color: "#475569",
  fontSize: "13px",
};

const tableCellStyle: CSSProperties = {
  padding: "14px 10px",
  borderBottom: "1px solid #f1f5f9",
  color: "#0f172a",
  verticalAlign: "top",
};

const actionButtonsWrapStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const miniButtonStyle: CSSProperties = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};

const miniButtonDeleteStyle: CSSProperties = {
  background: "#dc2626",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};

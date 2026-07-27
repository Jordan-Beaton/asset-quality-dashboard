"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { ImsButton, ImsTopMetaRow } from "../../../src/components/ImsPrimitives";
import { QualityKpiCard } from "../../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../../src/components/QualityPageHero";
import { supabase } from "../../../src/lib/supabase";

export const dynamic = "force-dynamic";

type Asset = {
  id: string;
  asset_code: string | null;
  name: string | null;
  description: string | null;
  location: string | null;
  owner: string | null;
  status: string | null;
  inspection_due_date: string | null;
  maintenance_due_date: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type AssetCalibrationRecord = {
  id: string;
  asset_id: string | null;
  reference: string | null;
  file_name: string | null;
  file_path: string | null;
  file_size?: number | null;
  notes: string | null;
  uploaded_at: string | null;
  calibration_date: string | null;
  calibration_due_date: string | null;
  calibration_type: string | null;
  calibrated_by: string | null;
  certificate_number: string | null;
  serial_number: string | null;
  certificate_file_size: number | null;
  created_at: string | null;
};

type AssetInspectionRecord = {
  id: string;
  asset_id: string;
  reference: string | null;
  file_name: string | null;
  file_path: string | null;
  notes: string | null;
  uploaded_at: string | null;
  inspection_date: string | null;
  inspector: string | null;
  result: string | null;
  findings: string | null;
  actions_required: string | null;
  next_inspection_due: string | null;
  created_at: string | null;
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
  file_name: string | null;
  file_path: string | null;
  created_at: string | null;
};

type AssetFileRow = {
  id: string;
  asset_id: string;
  file_type: "image" | "calibration" | "inspection" | "other";
  reference: string | null;
  file_name: string;
  file_path: string;
  file_size: number | null;
  uploaded_at: string;
};

type DueStatus = "Overdue" | "Due Soon" | "In Date" | "Not Set";

type CalibrationRow = {
  id: string;
  asset: Asset | null;
  record: AssetCalibrationRecord;
  status: DueStatus;
  daysRemaining: number | null;
};

type InspectionRow = {
  id: string;
  asset: Asset | null;
  record: AssetInspectionRecord;
  status: DueStatus;
  daysRemaining: number | null;
};

type MaintenanceRow = {
  id: string;
  asset: Asset | null;
  record: AssetMaintenanceRecord;
  status: DueStatus;
  daysRemaining: number | null;
};

type RecentActivityItem = {
  id: string;
  type: "asset" | "calibration" | "inspection" | "maintenance" | "file";
  asset: Asset | null;
  title: string;
  subtitle: string;
  timestamp: string | null;
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

type AttentionBoardItem = {
  id: string;
  type: "Calibration" | "Inspection" | "Maintenance" | "Action";
  assetLabel: string;
  reference: string;
  dueDate: string | null;
  description: string;
  status: string;
  href: string;
  sortTime: number;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getTimestampValue(value: string | null | undefined) {
  if (!value) return Number.NEGATIVE_INFINITY;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
}

function percentage(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normaliseBucket(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed || fallback;
}

function buildTopBuckets<T>(
  rows: T[],
  getLabel: (row: T) => string | null | undefined,
  fallback: string,
  limit = 5
) {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const label = normaliseBucket(getLabel(row), fallback);
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function getDaysRemaining(value: string | null | undefined) {
  if (!value) return null;
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return null;

  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getDueStatus(value: string | null | undefined): DueStatus {
  const days = getDaysRemaining(value);
  if (days === null) return "Not Set";
  if (days < 0) return "Overdue";
  if (days <= 30) return "Due Soon";
  return "In Date";
}

function getStatusRank(status: DueStatus) {
  if (status === "Overdue") return 0;
  if (status === "Due Soon") return 1;
  if (status === "In Date") return 2;
  return 3;
}

function getDueTone(status: DueStatus) {
  if (status === "Overdue") return { bg: "#fee2e2", text: "#991b1b", border: "#fecaca" };
  if (status === "Due Soon") return { bg: "#fef3c7", text: "#92400e", border: "#fde68a" };
  if (status === "In Date") return { bg: "#dcfce7", text: "#166534", border: "#bbf7d0" };
  return { bg: "#e2e8f0", text: "#334155", border: "#cbd5e1" };
}

function getBoardTypeTone(type: AttentionBoardItem["type"]) {
  if (type === "Calibration") return { bg: "#dcfce7", text: "#166534", border: "#bbf7d0" };
  if (type === "Inspection") return { bg: "#fef3c7", text: "#92400e", border: "#fde68a" };
  if (type === "Maintenance") return { bg: "#ede9fe", text: "#6d28d9", border: "#ddd6fe" };
  return { bg: "#fee2e2", text: "#991b1b", border: "#fecaca" };
}

function buildAssetLabel(asset: Asset | null) {
  if (!asset) return "Asset not linked";
  const code = asset.asset_code || asset.id;
  const name = asset.name || "Unnamed Asset";
  return `${code} - ${name}`;
}

function getCalibrationItemDescription(record: AssetCalibrationRecord) {
  const notes = record.notes || "";
  const match = notes.match(/^Item Description:\s*(.+?)(?:\n\nDate Issued:|\n\nNotes:|\n|$)/);
  if (match?.[1]) return match[1].trim();
  return notes.trim();
}

function buildCalibrationLabel(row: CalibrationRow) {
  const description = getCalibrationItemDescription(row.record);
  if (description) return description;
  if (row.asset?.description) return row.asset.description;
  if (row.asset?.name) return row.asset.name;
  return row.record.serial_number || row.record.certificate_number || row.record.reference || "Calibration item";
}

function DashboardContent() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [calibrationRecords, setCalibrationRecords] = useState<AssetCalibrationRecord[]>([]);
  const [inspectionRecords, setInspectionRecords] = useState<AssetInspectionRecord[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<AssetMaintenanceRecord[]>([]);
  const [assetFiles, setAssetFiles] = useState<AssetFileRow[]>([]);
  const [linkedActions, setLinkedActions] = useState<AssetLinkedAction[]>([]);
  const [message, setMessage] = useState("Loading asset dashboard...");
  const [lastRefreshed, setLastRefreshed] = useState("");

  async function loadDashboardData() {
    const [assetsRes, calibrationsRes, inspectionsRes, maintenanceRes, filesRes, actionsRes] = await Promise.all([
      supabase.from("assets").select("*").order("name", { ascending: true }),
      supabase.from("asset_calibration_records").select("*"),
      supabase.from("asset_inspection_records").select("*"),
      supabase.from("asset_maintenance_records").select("*"),
      supabase.from("asset_files").select("*").order("uploaded_at", { ascending: false }),
      supabase.from("actions").select("id,action_number,title,description,status,linked_asset_id,linked_asset_code,created_at,due_date"),
    ]);

    if (assetsRes.error || calibrationsRes.error || inspectionsRes.error || maintenanceRes.error || filesRes.error || actionsRes.error) {
      setMessage(
        `Dashboard load failed: ${
          assetsRes.error?.message ||
          calibrationsRes.error?.message ||
          inspectionsRes.error?.message ||
          maintenanceRes.error?.message ||
          filesRes.error?.message ||
          actionsRes.error?.message ||
          "Unknown error"
        }`
      );
      return;
    }

    setAssets((assetsRes.data || []) as Asset[]);
    setCalibrationRecords((calibrationsRes.data || []) as AssetCalibrationRecord[]);
    setInspectionRecords((inspectionsRes.data || []) as AssetInspectionRecord[]);
    setMaintenanceRecords((maintenanceRes.data || []) as AssetMaintenanceRecord[]);
    setAssetFiles((filesRes.data || []) as AssetFileRow[]);
    setLinkedActions((actionsRes.data || []) as AssetLinkedAction[]);
    setLastRefreshed(new Date().toLocaleString("en-GB"));
    setMessage("Asset dashboard loaded.");
  }

  useEffect(() => {
    void loadDashboardData();
  }, []);

  const assetMap = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);

  const calibrationRows = useMemo<CalibrationRow[]>(() => {
    return calibrationRecords
      .map((record) => {
        const status = getDueStatus(record.calibration_due_date);
        return {
          id: record.id,
          asset: record.asset_id ? assetMap.get(record.asset_id) || null : null,
          record,
          status,
          daysRemaining: getDaysRemaining(record.calibration_due_date),
        };
      })
      .sort((a, b) => {
        const rankDiff = getStatusRank(a.status) - getStatusRank(b.status);
        if (rankDiff !== 0) return rankDiff;

        const dueDiff =
          getTimestampValue(a.record.calibration_due_date) - getTimestampValue(b.record.calibration_due_date);
        if (dueDiff !== 0) return dueDiff;

        return buildCalibrationLabel(a).localeCompare(buildCalibrationLabel(b), undefined, {
          numeric: true,
          sensitivity: "base",
        });
      });
  }, [assetMap, calibrationRecords]);

  const inspectionRows = useMemo<InspectionRow[]>(() => {
    return inspectionRecords
      .map((record) => {
        const status = getDueStatus(record.next_inspection_due);
        return {
          id: record.id,
          asset: assetMap.get(record.asset_id) || null,
          record,
          status,
          daysRemaining: getDaysRemaining(record.next_inspection_due),
        };
      })
      .sort((a, b) => {
        const rankDiff = getStatusRank(a.status) - getStatusRank(b.status);
        if (rankDiff !== 0) return rankDiff;

        const dueDiff = getTimestampValue(a.record.next_inspection_due) - getTimestampValue(b.record.next_inspection_due);
        if (dueDiff !== 0) return dueDiff;

        return buildAssetLabel(a.asset).localeCompare(buildAssetLabel(b.asset), undefined, {
          numeric: true,
          sensitivity: "base",
        });
      });
  }, [assetMap, inspectionRecords]);

  const maintenanceRows = useMemo<MaintenanceRow[]>(() => {
    return maintenanceRecords
      .map((record) => {
        const status = getDueStatus(record.next_maintenance_due);
        return {
          id: record.id,
          asset: assetMap.get(record.asset_id) || null,
          record,
          status,
          daysRemaining: getDaysRemaining(record.next_maintenance_due),
        };
      })
      .sort((a, b) => {
        const rankDiff = getStatusRank(a.status) - getStatusRank(b.status);
        if (rankDiff !== 0) return rankDiff;

        const dueDiff = getTimestampValue(a.record.next_maintenance_due) - getTimestampValue(b.record.next_maintenance_due);
        if (dueDiff !== 0) return dueDiff;

        return buildAssetLabel(a.asset).localeCompare(buildAssetLabel(b.asset), undefined, {
          numeric: true,
          sensitivity: "base",
        });
      });
  }, [assetMap, maintenanceRecords]);

  const overdueCalibrationsAll = calibrationRows.filter((row) => row.status === "Overdue");
  const dueSoonCalibrationsAll = calibrationRows.filter((row) => row.status === "Due Soon");
  const inDateCalibrationsAll = calibrationRows.filter((row) => row.status === "In Date");
  const upcomingCalibrations = calibrationRows
    .filter((row) => row.status === "Due Soon" || row.status === "In Date")
    .slice(0, 6);

  const overdueInspectionsAll = inspectionRows.filter((row) => row.status === "Overdue");
  const dueSoonInspectionsAll = inspectionRows.filter((row) => row.status === "Due Soon");
  const inDateInspectionsAll = inspectionRows.filter((row) => row.status === "In Date");
  const overdueInspections = overdueInspectionsAll.slice(0, 6);
  const overdueMaintenanceAll = maintenanceRows.filter((row) => row.status === "Overdue");
  const dueSoonMaintenanceAll = maintenanceRows.filter((row) => row.status === "Due Soon");
  const inDateMaintenanceAll = maintenanceRows.filter((row) => row.status === "In Date");
  const maintenanceWatchlist = maintenanceRows
    .filter((row) => row.status === "Overdue" || row.status === "Due Soon")
    .slice(0, 6);

  const recentAssetRecords = useMemo<RecentActivityItem[]>(() => {
    const assetItems: RecentActivityItem[] = assets
      .map((asset) => ({
        id: `asset-${asset.id}`,
        type: "asset" as const,
        asset,
        title: buildAssetLabel(asset),
        subtitle: asset.status || "Status not set",
        timestamp: asset.updated_at || asset.created_at || null,
      }))
      .filter((item) => item.timestamp);

    const calibrationItems: RecentActivityItem[] = calibrationRecords.map((record) => {
      const asset = record.asset_id ? assetMap.get(record.asset_id) || null : null;
      return {
        id: `cal-${record.id}`,
        type: "calibration" as const,
        asset,
        title: `${getCalibrationItemDescription(record) || record.serial_number || record.certificate_number || buildAssetLabel(asset)} calibration`,
        subtitle: record.certificate_number || record.reference || "Calibration record added",
        timestamp: record.created_at || record.uploaded_at || record.calibration_date || null,
      };
    });

    const inspectionItems: RecentActivityItem[] = inspectionRecords.map((record) => {
      const asset = assetMap.get(record.asset_id) || null;
      return {
        id: `insp-${record.id}`,
        type: "inspection" as const,
        asset,
        title: `${buildAssetLabel(asset)} inspection`,
        subtitle: record.result || "Inspection record added",
        timestamp: record.created_at || record.uploaded_at || record.inspection_date || null,
      };
    });

    const maintenanceItems: RecentActivityItem[] = maintenanceRecords.map((record) => {
      const asset = assetMap.get(record.asset_id) || null;
      return {
        id: `maint-${record.id}`,
        type: "maintenance" as const,
        asset,
        title: `${buildAssetLabel(asset)} maintenance`,
        subtitle: record.maintenance_type || "Maintenance record added",
        timestamp: record.created_at || record.maintenance_date || null,
      };
    });

    const fileItems: RecentActivityItem[] = assetFiles.map((file) => {
      const asset = assetMap.get(file.asset_id) || null;
      return {
        id: `file-${file.id}`,
        type: "file" as const,
        asset,
        title: `${buildAssetLabel(asset)} file`,
        subtitle: file.file_name,
        timestamp: file.uploaded_at || null,
      };
    });

    return [...assetItems, ...calibrationItems, ...inspectionItems, ...maintenanceItems, ...fileItems]
      .filter((item) => item.timestamp)
      .sort((a, b) => getTimestampValue(b.timestamp) - getTimestampValue(a.timestamp))
      .slice(0, 10);
  }, [assetFiles, assetMap, assets, calibrationRecords, inspectionRecords, maintenanceRecords]);

  const assetsWithFiles = useMemo(() => new Set(assetFiles.map((file) => file.asset_id)).size, [assetFiles]);

  const latestAssetRecord = recentAssetRecords[0] || null;
  const assetCodeMap = useMemo(() => {
    const nextMap = new Map<string, Asset>();
    assets.forEach((asset) => {
      const code = asset.asset_code?.trim();
      if (code) nextMap.set(code, asset);
    });
    return nextMap;
  }, [assets]);

  const assetLinkedActions = useMemo(() => {
    return linkedActions
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
  }, [assetCodeMap, assetMap, linkedActions]);

  const openAssetActions = useMemo(
    () =>
      assetLinkedActions.filter(({ action }) => {
        const status = (action.status || "").trim().toLowerCase();
        return status !== "closed" && status !== "complete" && status !== "completed";
      }),
    [assetLinkedActions]
  );
  const overdueAssetActions = useMemo(
    () =>
      openAssetActions.filter(({ action }) => {
        const days = getDaysRemaining(action.due_date);
        return days !== null && days < 0;
      }),
    [openAssetActions]
  );

  const overdueAttentionItems = useMemo<AttentionBoardItem[]>(() => {
    const calibrationItems = calibrationRows
      .filter((row) => row.status === "Overdue")
      .map((row) => ({
        id: `calibration-${row.id}`,
        type: "Calibration" as const,
        assetLabel: buildCalibrationLabel(row),
        reference: row.record.certificate_number || row.record.reference || "Calibration record",
        dueDate: row.record.calibration_due_date,
        description: row.record.certificate_number || row.record.calibration_type || "Calibration follow-up overdue",
        status: row.status,
        href: `/assets/calibration?asset=${encodeURIComponent(row.asset?.asset_code || row.asset?.id || "")}`,
        sortTime: getTimestampValue(row.record.calibration_due_date),
      }));

    const inspectionItems = inspectionRows
      .filter((row) => row.status === "Overdue")
      .map((row) => ({
        id: `inspection-${row.id}`,
        type: "Inspection" as const,
        assetLabel: buildAssetLabel(row.asset),
        reference: row.record.reference || row.record.result || "Inspection record",
        dueDate: row.record.next_inspection_due,
        description: row.record.findings || row.record.actions_required || row.record.inspector || "Inspection follow-up overdue",
        status: row.record.result || row.status,
        href: `/assets/inspection?asset=${encodeURIComponent(row.asset?.asset_code || row.asset?.id || "")}`,
        sortTime: getTimestampValue(row.record.next_inspection_due),
      }));

    const maintenanceItems = maintenanceRows
      .filter((row) => row.status === "Overdue")
      .map((row) => ({
        id: `maintenance-${row.id}`,
        type: "Maintenance" as const,
        assetLabel: buildAssetLabel(row.asset),
        reference: row.record.maintenance_type || "Maintenance record",
        dueDate: row.record.next_maintenance_due,
        description: row.record.description || row.record.carried_out_by || "Maintenance follow-up overdue",
        status: row.record.maintenance_type || row.status,
        href: `/assets/maintenance?asset=${encodeURIComponent(row.asset?.asset_code || row.asset?.id || "")}`,
        sortTime: getTimestampValue(row.record.next_maintenance_due),
      }));

    const actionItems = overdueAssetActions.map(({ action, asset }) => ({
      id: `action-${action.id}`,
      type: "Action" as const,
      assetLabel: buildAssetLabel(asset),
      reference: action.action_number || action.title || "Linked action",
      dueDate: action.due_date,
      description: action.description || action.title || "Open action linked to asset",
      status: action.status || "Open",
      href: `/actions?search=${encodeURIComponent(action.action_number || action.title || "")}`,
      sortTime: getTimestampValue(action.due_date),
    }));

    return [...calibrationItems, ...inspectionItems, ...maintenanceItems, ...actionItems].sort(
      (a, b) => b.sortTime - a.sortTime
    );
  }, [calibrationRows, inspectionRows, maintenanceRows, overdueAssetActions]);

  const dueWatchCount =
    overdueCalibrationsAll.length +
    dueSoonCalibrationsAll.length +
    overdueInspectionsAll.length +
    dueSoonInspectionsAll.length +
    overdueMaintenanceAll.length +
    dueSoonMaintenanceAll.length;

  const overdueDueItems = overdueCalibrationsAll.length + overdueInspectionsAll.length + overdueMaintenanceAll.length;
  const dueSoonItems = dueSoonCalibrationsAll.length + dueSoonInspectionsAll.length + dueSoonMaintenanceAll.length;
  const allControlItems = calibrationRows.length + inspectionRows.length + maintenanceRows.length;
  const inDateControlItems = inDateCalibrationsAll.length + inDateInspectionsAll.length + inDateMaintenanceAll.length;
  const inDatePercent = percentage(inDateControlItems, allControlItems);
  const fileCoveragePercent = percentage(assetsWithFiles, assets.length);
  const actionPressurePenalty = openAssetActions.length ? Math.min(openAssetActions.length * 3, 20) : 0;
  const assetControlScore = clampPercent(
    100 -
      overdueDueItems * 12 -
      dueSoonItems * 4 -
      overdueAssetActions.length * 10 -
      actionPressurePenalty +
      Math.round(fileCoveragePercent * 0.1)
  );
  const scoreColour = assetControlScore >= 80 ? "#16a34a" : assetControlScore >= 55 ? "#f59e0b" : "#dc2626";

  const assetStatusData = buildTopBuckets(assets, (asset) => asset.status, "Status not set", 6).map((item, index) => ({
    ...item,
    colour: ["#3A9B98", "#2563eb", "#f59e0b", "#7c3aed", "#64748b", "#dc2626"][index] || "#64748b",
    href: `/assets?status=${encodeURIComponent(item.label)}`,
  }));

  const locationData = buildTopBuckets(assets, (asset) => asset.location, "Location not set", 5).map((item) => ({
    ...item,
    percent: percentage(item.value, assets.length),
    href: `/assets?location=${encodeURIComponent(item.label)}`,
  }));

  const ownerData = buildTopBuckets(assets, (asset) => asset.owner, "Owner not set", 5).map((item) => ({
    ...item,
    percent: percentage(item.value, assets.length),
    href: `/assets?owner=${encodeURIComponent(item.label)}`,
  }));

  const pressureData = [
    {
      label: "Calibration",
      value: overdueCalibrationsAll.length + dueSoonCalibrationsAll.length,
      detail: `${overdueCalibrationsAll.length} overdue / ${dueSoonCalibrationsAll.length} due soon`,
      colour: "#dc2626",
      href: "/assets/calibration",
    },
    {
      label: "Inspection",
      value: overdueInspectionsAll.length + dueSoonInspectionsAll.length,
      detail: `${overdueInspectionsAll.length} overdue / ${dueSoonInspectionsAll.length} due soon`,
      colour: "#f59e0b",
      href: "/assets/inspection",
    },
    {
      label: "Maintenance",
      value: overdueMaintenanceAll.length + dueSoonMaintenanceAll.length,
      detail: `${overdueMaintenanceAll.length} overdue / ${dueSoonMaintenanceAll.length} due soon`,
      colour: "#7c3aed",
      href: "/assets/maintenance",
    },
    {
      label: "Actions",
      value: overdueAssetActions.length + openAssetActions.length,
      detail: `${overdueAssetActions.length} overdue / ${openAssetActions.length} open`,
      colour: "#2563eb",
      href: "/assets/actions",
    },
  ];

  const coverageData = [
    {
      label: "Asset file coverage",
      value: fileCoveragePercent,
      detail: `${assetsWithFiles} of ${assets.length} assets`,
      colour: "#3A9B98",
      href: "/assets",
    },
    {
      label: "Current control records",
      value: inDatePercent,
      detail: `${inDateControlItems} in date from ${allControlItems} controls`,
      colour: "#16a34a",
      href: "/assets/dashboard",
    },
    {
      label: "Calibration certificates",
      value: percentage(
        calibrationRecords.filter((record) => record.certificate_number || record.file_path || record.file_name).length,
        calibrationRecords.length
      ),
      detail: `${calibrationRecords.filter((record) => record.certificate_number || record.file_path || record.file_name).length} of ${calibrationRecords.length} records`,
      colour: "#2563eb",
      href: "/assets/calibration",
    },
  ];

  const healthData = [
    {
      name: "Control Currency",
      value: inDatePercent,
      fill: "#16a34a",
      detail: `${inDateControlItems} in-date controls`,
      href: "/assets/dashboard",
    },
    {
      name: "File Coverage",
      value: fileCoveragePercent,
      fill: "#3A9B98",
      detail: `${assetsWithFiles} assets with files`,
      href: "/assets",
    },
    {
      name: "Certificate Evidence",
      value: coverageData[2].value,
      fill: "#2563eb",
      detail: coverageData[2].detail,
      href: "/assets/calibration",
    },
    {
      name: "Action Health",
      value: percentage(Math.max(openAssetActions.length - overdueAssetActions.length, 0), Math.max(openAssetActions.length, 1)),
      fill: "#7c3aed",
      detail: `${overdueAssetActions.length} overdue linked actions`,
      href: "/assets/actions",
    },
  ];

  return (
    <main>
      <style>{`
        @media (max-width: 1120px) {
          .asset-command-deck,
          .asset-status-split,
          .asset-chart-grid,
          .asset-bottom-grid {
            grid-template-columns: 1fr !important;
          }
          .asset-health-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          .asset-kpi-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
        @media (max-width: 720px) {
          .asset-kpi-grid,
          .asset-metric-grid,
          .asset-mini-grid,
          .asset-health-grid,
          .asset-status-bars,
          .asset-attention-grid {
            grid-template-columns: 1fr !important;
          }
          .asset-command-score {
            grid-template-columns: 1fr !important;
          }
          .asset-score-orb {
            justify-self: start !important;
          }
        }
      `}</style>
      <QualityPageHero
        label="ASSET MANAGEMENT"
        title="Dashboard"
        description="Live asset control picture across the register, calibration, inspection, maintenance, files, and linked actions."
        contextCards={[
          { label: "Last Refreshed", value: lastRefreshed || "-" },
          { label: "Latest Asset Update", value: latestAssetRecord ? latestAssetRecord.title : "No recent asset activity" },
        ]}
      />

      <ImsTopMetaRow
        backHref="/assets"
        backLabel="Open Asset Register"
        actions={<ImsButton onClick={() => void loadDashboardData()}>Refresh</ImsButton>}
        status={
          <>
            <strong>Status:</strong> {message}
          </>
        }
      />

      <section className="asset-command-deck" style={commandDeckStyle}>
        <div className="asset-command-score" style={commandScorePanelStyle}>
          <div style={commandCopyStyle}>
            <span style={commandEyebrowStyle}>Asset Control</span>
            <h2 style={commandTitleStyle}>Asset control score</h2>
            <p style={commandTextStyle}>
              Weighted from overdue controls, due-soon pressure, linked actions, and asset file coverage.
            </p>
          </div>
          <div className="asset-mini-grid" style={miniGridStyle}>
            <MiniMetric label="Assets" value={assets.length} />
            <MiniMetric label="Due Risk" value={dueWatchCount} tone={dueWatchCount ? "#fecaca" : "#bbf7d0"} />
            <MiniMetric label="Actions" value={openAssetActions.length} tone="#fde68a" />
            <MiniMetric label="Files" value={fileCoveragePercent} suffix="%" />
          </div>
          <Link
            href="/management-review"
            className="asset-score-orb"
            style={{
              ...scoreOrbStyle,
              background: `conic-gradient(${scoreColour} ${assetControlScore * 3.6}deg, rgba(255,255,255,0.18) 0deg)`,
            }}
          >
            <span style={scoreOrbInnerStyle}>
              <strong style={scoreValueStyle}>{assetControlScore}%</strong>
              <small style={scoreSubLabelStyle}>CONTROL HEALTH</small>
            </span>
          </Link>
        </div>

        <div style={pressurePanelStyle}>
          <div style={pressureHeaderStyle}>
            <div>
              <h2 style={pressureTitleStyle}>Operational Pressure</h2>
              <p style={pressureSubtitleStyle}>Click any row to open the live source register.</p>
            </div>
            <span style={livePillStyle}>Live data</span>
          </div>
          <PressureList rows={pressureData} maxValue={Math.max(...pressureData.map((item) => item.value), 1)} />
        </div>
      </section>

      <section className="asset-kpi-grid" style={statsGridStyle}>
        <QualityKpiCard title="Total Assets" value={assets.length} accent="#2563eb" href="/assets" />
        <QualityKpiCard title="Due Risk Items" value={dueWatchCount} accent="#dc2626" href="/assets/dashboard" />
        <QualityKpiCard title="Overdue Controls" value={overdueDueItems} accent="#991b1b" href="/assets/dashboard" />
        <QualityKpiCard title="Open Asset Actions" value={openAssetActions.length} accent="#f59e0b" href="/assets/actions" />
        <QualityKpiCard title="File Coverage" value={`${fileCoveragePercent}%`} accent="#3A9B98" href="/assets" />
        <QualityKpiCard title="Control Records" value={allControlItems} accent="#7c3aed" href="/assets/dashboard" />
      </section>

      <section className="asset-health-grid" style={healthGridStyle}>
        {healthData.map((item) => (
          <HealthCard key={item.name} {...item} />
        ))}
      </section>

      <section className="asset-chart-grid" style={chartGridStyle}>
        <SectionCard title="Asset Status Split" subtitle="Current register status profile.">
          <AssetStatusSplit items={assetStatusData} total={assets.length} />
        </SectionCard>

        <SectionCard title="Due Date Control" subtitle="Calibration, inspection, and maintenance currency.">
          <div className="asset-metric-grid" style={metricGridStyle}>
            <ControlMetric title="In Date" value={inDateControlItems} detail={`${inDatePercent}% of dated controls`} colour="#16a34a" />
            <ControlMetric title="Due Soon" value={dueSoonItems} detail="within 30 days" colour="#f59e0b" />
            <ControlMetric title="Overdue" value={overdueDueItems} detail="past due date" colour="#dc2626" />
          </div>
          <BarList rows={coverageData} maxValue={100} percent />
        </SectionCard>

        <SectionCard title="Location Picture" subtitle="Where the asset base currently sits.">
          <BarList rows={locationData.map((item) => ({ ...item, detail: `${item.percent}% of assets`, colour: "#3A9B98" }))} maxValue={assets.length || 1} />
        </SectionCard>

        <SectionCard title="Ownership Mix" subtitle="Asset ownership or responsible area split.">
          <BarList rows={ownerData.map((item) => ({ ...item, detail: `${item.percent}% of assets`, colour: "#2563eb" }))} maxValue={assets.length || 1} />
        </SectionCard>
      </section>

      <section style={attentionBoardSectionStyle}>
        <SectionCard
          title="Asset Attention Board"
          subtitle="The items that need management attention first."
          action={
            <Link href="/assets/actions" style={panelLinkStyle}>
              Open Actions
            </Link>
          }
        >
          {overdueAttentionItems.length === 0 ? (
            <EmptyState message="No overdue asset-linked items are currently on the attention board." />
          ) : (
            <CompactAttentionList items={overdueAttentionItems.slice(0, 12)} />
          )}
        </SectionCard>
      </section>

      <section className="asset-bottom-grid" style={panelGridStyle}>
        <SectionCard
          title="Upcoming Calibrations"
          subtitle="Next due calibration items across the register, including in-date and due-soon records."
          action={
            <Link href="/assets/calibration" style={panelLinkStyle}>
              Open
            </Link>
          }
        >
          {upcomingCalibrations.length === 0 ? (
            <EmptyState message="No upcoming calibration records are currently available." />
          ) : (
            <ListWrap>
              {upcomingCalibrations.map((row) => (
                <DueListItem
                  key={row.id}
                  title={buildCalibrationLabel(row)}
                  subtitle={`Due ${formatDate(row.record.calibration_due_date)}${row.record.certificate_number ? ` | ${row.record.certificate_number}` : ""}`}
                  meta={
                    row.daysRemaining === null
                      ? "Due date not set"
                      : row.daysRemaining < 0
                        ? `${Math.abs(row.daysRemaining)} days overdue`
                        : `${row.daysRemaining} days remaining`
                  }
                  status={row.status}
                />
              ))}
            </ListWrap>
          )}
        </SectionCard>

        <SectionCard
          title="Inspection Watchlist"
          subtitle="Nearest inspection follow-ups."
          action={
            <Link href="/assets/inspection" style={panelLinkStyle}>
              Open
            </Link>
          }
        >
          {inspectionRows.length === 0 ? (
            <EmptyState message="No inspection records have been logged yet." />
          ) : (
            <ListWrap>
              {inspectionRows.slice(0, 8).map((row) => (
                <DueListItem
                  key={row.id}
                  title={buildAssetLabel(row.asset)}
                  subtitle={`${row.record.result || "Inspection record"} | Due ${formatDate(row.record.next_inspection_due)}`}
                  meta={row.record.inspector || "Inspector not set"}
                  status={row.status}
                />
              ))}
            </ListWrap>
          )}
        </SectionCard>

        <SectionCard
          title="Maintenance Watchlist"
          subtitle="Preventative and corrective follow-ups."
          action={
            <Link href="/assets/maintenance" style={panelLinkStyle}>
              Open
            </Link>
          }
        >
          {maintenanceRows.length === 0 ? (
            <EmptyState message="No maintenance records have been logged yet." />
          ) : (
            <ListWrap>
              {maintenanceWatchlist.map((row) => (
                <DueListItem
                  key={row.id}
                  title={buildAssetLabel(row.asset)}
                  subtitle={`${row.record.maintenance_type || "Maintenance"} | Due ${formatDate(row.record.next_maintenance_due)}`}
                  meta={row.record.carried_out_by || "Responsible person not set"}
                  status={row.status}
                />
              ))}
            </ListWrap>
          )}
        </SectionCard>

      </section>
    </main>
  );
}

function SectionCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section style={panelStyle}>
      <div style={sectionHeaderRowStyle}>
        <div>
          <h2 style={sectionTitleStyle}>{title}</h2>
          {subtitle ? <p style={sectionSubtitleStyle}>{subtitle}</p> : null}
        </div>
        {action ? <div>{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function MiniMetric({
  label,
  value,
  tone = "#ffffff",
  suffix = "",
}: {
  label: string;
  value: number;
  tone?: string;
  suffix?: string;
}) {
  return (
    <div style={miniMetricStyle}>
      <span style={miniMetricLabelStyle}>{label}</span>
      <strong style={{ ...miniMetricValueStyle, color: tone }}>{value}{suffix}</strong>
    </div>
  );
}

function ControlMetric({
  title,
  value,
  detail,
  colour,
}: {
  title: string;
  value: number;
  detail: string;
  colour: string;
}) {
  return (
    <div style={{ ...controlMetricStyle, borderTopColor: colour }}>
      <span style={controlMetricTitleStyle}>{title}</span>
      <strong style={controlMetricValueStyle}>{value}</strong>
      <small style={controlMetricDetailStyle}>{detail}</small>
    </div>
  );
}

function HealthCard({
  name,
  value,
  fill,
  detail,
  href,
}: {
  name: string;
  value: number;
  fill: string;
  detail: string;
  href: string;
}) {
  return (
    <Link href={href} style={healthCardStyle}>
      <div>
        <div style={healthLabelStyle}>{name}</div>
        <div style={healthHintStyle}>{detail}</div>
      </div>
      <div style={healthGaugeStyle}>
        <span>{value}%</span>
        <div style={healthGaugeTrackStyle}>
          <div style={{ ...healthGaugeFillStyle, width: `${value}%`, background: fill }} />
        </div>
      </div>
    </Link>
  );
}

function PressureList({
  rows,
  maxValue,
}: {
  rows: { label: string; value: number; detail?: string; colour?: string; href?: string }[];
  maxValue: number;
}) {
  return (
    <div style={pressureListStyle}>
      {rows.map((row) => {
        const width = maxValue ? Math.max(row.value > 0 ? 7 : 0, Math.min(100, (row.value / maxValue) * 100)) : 0;
        const content = (
          <>
            <div style={pressureRowHeaderStyle}>
              <span>{row.label}</span>
              <strong>{row.value}</strong>
            </div>
            <div style={pressureTrackStyle}>
              <div style={{ ...pressureFillStyle, width: `${width}%`, background: row.colour || "#3A9B98" }} />
            </div>
            {row.detail ? <small style={pressureDetailStyle}>{row.detail}</small> : null}
          </>
        );

        if (!row.href) return <div key={row.label} style={pressureRowStyle}>{content}</div>;
        return (
          <Link key={row.label} href={row.href} style={{ ...pressureRowStyle, textDecoration: "none" }}>
            {content}
          </Link>
        );
      })}
    </div>
  );
}

function BarList({
  rows,
  maxValue,
  percent = false,
}: {
  rows: { label: string; value: number; detail?: string; colour?: string; href?: string }[];
  maxValue: number;
  percent?: boolean;
}) {
  if (rows.length === 0) return <EmptyState message="No data available yet." />;

  return (
    <div style={barListStyle}>
      {rows.map((row) => {
        const width = maxValue ? Math.max(4, Math.min(100, (row.value / maxValue) * 100)) : 0;
        const content = (
          <div style={barRowStyle}>
            <div style={barRowHeaderStyle}>
              <span style={barLabelStyle}>{row.label}</span>
              <strong style={barValueStyle}>{percent ? `${row.value}%` : row.value}</strong>
            </div>
            <div style={barTrackStyle}>
              <div style={{ ...barFillStyle, width: `${width}%`, background: row.colour || "#3A9B98" }} />
            </div>
            {row.detail ? <small style={barDetailStyle}>{row.detail}</small> : null}
          </div>
        );

        if (!row.href) return <div key={row.label}>{content}</div>;
        return (
          <Link key={row.label} href={row.href} style={barLinkStyle}>
            {content}
          </Link>
        );
      })}
    </div>
  );
}

function AssetStatusSplit({
  items,
  total,
}: {
  items: { label: string; value: number; colour: string; href?: string }[];
  total: number;
}) {
  if (items.length === 0) return <EmptyState message="No asset statuses have been set yet." />;

  const gradient = items.reduce(
    (state, item) => {
      const start = state.cursor;
      const span = total ? (item.value / total) * 360 : 0;
      const end = start + span;
      return {
        cursor: end,
        stops: [...state.stops, `${item.colour} ${start}deg ${end}deg`],
      };
    },
    { cursor: 0, stops: [] as string[] }
  );
  const gradientStops = gradient.stops.join(", ");
  const leadingStatus = items[0];

  return (
    <div className="asset-status-split" style={statusSplitLayoutStyle}>
      <div style={statusHeroStyle}>
        <div style={{ ...donutStyle, background: `conic-gradient(${gradientStops})` }}>
          <div style={donutInnerStyle}>
            <strong>{total}</strong>
            <small>assets</small>
          </div>
        </div>
        <div style={statusHeroCopyStyle}>
          <span style={statusHeroLabelStyle}>Largest status group</span>
          <strong style={statusHeroValueStyle}>{leadingStatus.label}</strong>
          <span style={statusHeroDetailStyle}>
            {leadingStatus.value} of {total} assets
          </span>
        </div>
      </div>
      <div className="asset-status-bars" style={statusBarGridStyle}>
        {items.map((item) => {
          const percent = percentage(item.value, total);
          const width = total ? Math.max(6, Math.min(100, percent)) : 0;
          const content = (
            <div style={statusBarRowStyle}>
              <div style={statusBarHeaderStyle}>
                <span style={statusBarLabelStyle}>
                  <span style={{ ...legendDotStyle, background: item.colour }} />
                  {item.label}
                </span>
                <strong style={statusBarValueStyle}>{item.value}</strong>
              </div>
              <div style={barTrackStyle}>
                <div style={{ ...barFillStyle, width: `${width}%`, background: item.colour }} />
              </div>
              <small style={statusBarDetailStyle}>{percent}% of asset register</small>
            </div>
          );

          if (!item.href) return <div key={item.label}>{content}</div>;
          return (
            <Link key={item.label} href={item.href} style={barLinkStyle}>
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function CompactAttentionList({ items }: { items: AttentionBoardItem[] }) {
  return (
    <div className="asset-attention-grid" style={attentionGridStyle}>
      {items.map((item) => {
        const tone = getBoardTypeTone(item.type);
        return (
          <Link key={item.id} href={item.href} style={attentionLinkItemStyle}>
            <div style={attentionLinkTopStyle}>
              <span style={{ ...activityBadgeStyle, background: tone.bg, color: tone.text, border: `1px solid ${tone.border}` }}>
                {item.type}
              </span>
              <strong style={attentionDateStyle}>{formatDate(item.dueDate)}</strong>
            </div>
            <div style={itemTitleStyle}>{item.assetLabel}</div>
            <div style={attentionMetaRowStyle}>
              <span>{item.reference}</span>
              <span>{item.description}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div style={emptyStateStyle}>{message}</div>;
}

function ListWrap({ children }: { children: ReactNode }) {
  return <div style={listWrapStyle}>{children}</div>;
}

function DueListItem({
  title,
  subtitle,
  meta,
  status,
}: {
  title: string;
  subtitle: string;
  meta: string;
  status: DueStatus;
}) {
  const tone = getDueTone(status);
  return (
    <div style={listItemStyle}>
      <div>
        <div style={itemTitleStyle}>{title}</div>
        <div style={itemMetaStyle}>{subtitle}</div>
        <div style={itemMetaStyle}>{meta}</div>
      </div>
      <div style={badgeWrapStyle}>
        <span style={{ ...activityBadgeStyle, background: tone.bg, color: tone.text, border: `1px solid ${tone.border}` }}>
          {status}
        </span>
      </div>
    </div>
  );
}

export default function AssetDashboardPage() {
  return <DashboardContent />;
}

const statsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: "10px",
  marginBottom: "14px",
};

const commandDeckStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(360px, 1.15fr) minmax(340px, 0.85fr)",
  gap: "14px",
  marginBottom: "14px",
  alignItems: "stretch",
};

const commandScorePanelStyle: CSSProperties = {
  minHeight: "166px",
  borderRadius: "18px",
  padding: "16px",
  display: "grid",
  gridTemplateColumns: "minmax(190px, 0.95fr) minmax(210px, 1fr) auto",
  gap: "14px",
  alignItems: "center",
  color: "#ffffff",
  background: "linear-gradient(135deg, #3A9B98 0%, #1f6769 58%, #174b56 100%)",
  boxShadow: "0 24px 44px rgba(58, 155, 152, 0.18)",
};

const commandCopyStyle: CSSProperties = {
  display: "grid",
  gap: "7px",
};

const commandEyebrowStyle: CSSProperties = {
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#d7f4f1",
};

const commandTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "21px",
  lineHeight: 1.08,
  color: "#ffffff",
};

const commandTextStyle: CSSProperties = {
  margin: 0,
  fontSize: "13px",
  lineHeight: 1.55,
  color: "#e2f5f4",
};

const scoreOrbStyle: CSSProperties = {
  width: "124px",
  height: "124px",
  borderRadius: "999px",
  display: "grid",
  placeItems: "center",
  justifySelf: "end",
  textDecoration: "none",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.24), 0 18px 32px rgba(15,23,42,0.22)",
};

const scoreOrbInnerStyle: CSSProperties = {
  width: "88px",
  height: "88px",
  borderRadius: "999px",
  display: "grid",
  placeItems: "center",
  alignContent: "center",
  background: "rgba(15, 23, 42, 0.72)",
  color: "#ffffff",
  textAlign: "center",
};

const scoreValueStyle: CSSProperties = {
  fontSize: "27px",
  lineHeight: 1,
};

const scoreSubLabelStyle: CSSProperties = {
  marginTop: "6px",
  fontSize: "9px",
  lineHeight: 1.25,
  fontWeight: 900,
  letterSpacing: "0.06em",
};

const miniGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "8px",
};

const miniMetricStyle: CSSProperties = {
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.1)",
  padding: "9px 10px",
  minWidth: 0,
};

const miniMetricLabelStyle: CSSProperties = {
  display: "block",
  fontSize: "9px",
  fontWeight: 900,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "#d7f4f1",
};

const miniMetricValueStyle: CSSProperties = {
  display: "block",
  marginTop: "5px",
  fontSize: "20px",
  lineHeight: 1,
};

const storyGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "14px",
  marginBottom: "14px",
  alignItems: "stretch",
};

const pressurePanelStyle: CSSProperties = {
  borderRadius: "18px",
  padding: "16px",
  color: "#ffffff",
  background: "linear-gradient(135deg, #10202f 0%, #1f6f70 100%)",
  boxShadow: "0 22px 42px rgba(15, 23, 42, 0.16)",
  display: "grid",
  gap: "10px",
  minHeight: "188px",
};

const pressureHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
};

const pressureTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "18px",
  lineHeight: 1.15,
};

const pressureSubtitleStyle: CSSProperties = {
  margin: "5px 0 0",
  color: "rgba(255,255,255,0.74)",
  fontSize: "12px",
};

const livePillStyle: CSSProperties = {
  borderRadius: "999px",
  padding: "6px 9px",
  background: "rgba(220,252,231,0.14)",
  border: "1px solid rgba(187,247,208,0.28)",
  color: "#dcfce7",
  fontSize: "11px",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  whiteSpace: "nowrap",
};

const pressureListStyle: CSSProperties = {
  display: "grid",
  gap: "8px",
};

const pressureRowStyle: CSSProperties = {
  display: "grid",
  gap: "6px",
  borderRadius: "12px",
  background: "rgba(255,255,255,0.1)",
  border: "1px solid rgba(255,255,255,0.12)",
  padding: "8px 10px",
  color: "#ffffff",
};

const pressureRowHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  fontSize: "12px",
  fontWeight: 900,
};

const pressureTrackStyle: CSSProperties = {
  height: "9px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.2)",
  overflow: "hidden",
};

const pressureFillStyle: CSSProperties = {
  height: "100%",
  borderRadius: "999px",
};

const pressureDetailStyle: CSSProperties = {
  color: "rgba(255,255,255,0.72)",
  fontSize: "11px",
};

const healthGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "10px",
  marginBottom: "14px",
};

const healthCardStyle: CSSProperties = {
  textDecoration: "none",
  color: "#0f172a",
  background: "#ffffff",
  borderRadius: "14px",
  padding: "12px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
  display: "grid",
  gap: "10px",
};

const healthLabelStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 900,
  color: "#0f172a",
};

const healthHintStyle: CSSProperties = {
  marginTop: "4px",
  fontSize: "12px",
  color: "#64748b",
  lineHeight: 1.35,
};

const healthGaugeStyle: CSSProperties = {
  display: "grid",
  gap: "7px",
  fontSize: "22px",
  fontWeight: 900,
};

const healthGaugeTrackStyle: CSSProperties = {
  height: "10px",
  borderRadius: "999px",
  background: "#e2e8f0",
  overflow: "hidden",
};

const healthGaugeFillStyle: CSSProperties = {
  height: "100%",
  borderRadius: "999px",
};

const chartGridStyle: CSSProperties = {
  ...storyGridStyle,
};

const attentionBoardSectionStyle: CSSProperties = {
  marginBottom: "14px",
};

const metricGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "8px",
  marginBottom: "10px",
};

const controlMetricStyle: CSSProperties = {
  border: "1px solid #dbe7f3",
  borderTop: "4px solid #3A9B98",
  borderRadius: "12px",
  background: "#f8fafc",
  padding: "10px",
};

const controlMetricTitleStyle: CSSProperties = {
  display: "block",
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color: "#475569",
};

const controlMetricValueStyle: CSSProperties = {
  display: "block",
  marginTop: "6px",
  fontSize: "22px",
  lineHeight: 1,
  color: "#0f172a",
};

const controlMetricDetailStyle: CSSProperties = {
  display: "block",
  marginTop: "6px",
  fontSize: "12px",
  color: "#64748b",
};

const panelGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "14px",
  marginBottom: "14px",
  alignItems: "stretch",
};

const panelStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: "14px",
  border: "1px solid #dbe7f3",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
  padding: "16px",
  height: "100%",
  boxSizing: "border-box",
};

const barListStyle: CSSProperties = {
  display: "grid",
  gap: "8px",
};

const barLinkStyle: CSSProperties = {
  display: "block",
  color: "inherit",
  textDecoration: "none",
};

const barRowStyle: CSSProperties = {
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  padding: "9px 10px",
};

const barRowHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "center",
  marginBottom: "6px",
};

const barLabelStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 900,
  color: "#0f172a",
};

const barValueStyle: CSSProperties = {
  fontSize: "14px",
  color: "#0f172a",
};

const barTrackStyle: CSSProperties = {
  height: "8px",
  borderRadius: "999px",
  background: "#e2e8f0",
  overflow: "hidden",
};

const barFillStyle: CSSProperties = {
  height: "100%",
  borderRadius: "999px",
};

const barDetailStyle: CSSProperties = {
  display: "block",
  marginTop: "5px",
  fontSize: "12px",
  color: "#64748b",
};

const donutStyle: CSSProperties = {
  width: "174px",
  height: "174px",
  borderRadius: "999px",
  display: "grid",
  placeItems: "center",
  boxShadow: "inset 0 0 0 1px rgba(15, 23, 42, 0.05)",
  flex: "0 0 auto",
};

const donutInnerStyle: CSSProperties = {
  width: "100px",
  height: "100px",
  borderRadius: "999px",
  background: "#ffffff",
  display: "grid",
  placeItems: "center",
  alignContent: "center",
  textAlign: "center",
  color: "#0f172a",
  boxShadow: "0 6px 18px rgba(15,23,42,0.08)",
};

const legendDotStyle: CSSProperties = {
  width: "10px",
  height: "10px",
  borderRadius: "999px",
};

const statusSplitLayoutStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(190px, 0.78fr) minmax(230px, 1fr)",
  gap: "18px",
  alignItems: "stretch",
  minHeight: "260px",
};

const statusHeroStyle: CSSProperties = {
  borderRadius: "16px",
  background: "linear-gradient(180deg, #f8fafc 0%, #eef8f7 100%)",
  border: "1px solid #dbe7f3",
  padding: "16px",
  display: "grid",
  justifyItems: "center",
  alignContent: "center",
  gap: "14px",
  minHeight: 0,
};

const statusHeroCopyStyle: CSSProperties = {
  display: "grid",
  gap: "4px",
  textAlign: "center",
};

const statusHeroLabelStyle: CSSProperties = {
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "#64748b",
};

const statusHeroValueStyle: CSSProperties = {
  fontSize: "18px",
  lineHeight: 1.15,
  color: "#0f172a",
};

const statusHeroDetailStyle: CSSProperties = {
  fontSize: "12px",
  color: "#475569",
};

const statusBarGridStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
  alignContent: "stretch",
};

const statusBarRowStyle: CSSProperties = {
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  padding: "12px",
  display: "grid",
  alignContent: "center",
};

const statusBarHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  alignItems: "center",
  marginBottom: "8px",
};

const statusBarLabelStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  minWidth: 0,
  color: "#0f172a",
  fontSize: "12px",
  fontWeight: 900,
  lineHeight: 1.25,
};

const statusBarValueStyle: CSSProperties = {
  color: "#0f172a",
  fontSize: "16px",
};

const statusBarDetailStyle: CSSProperties = {
  display: "block",
  marginTop: "7px",
  color: "#64748b",
  fontSize: "12px",
};

const attentionGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "10px",
};

const attentionLinkItemStyle: CSSProperties = {
  display: "grid",
  gap: "5px",
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  padding: "10px 12px",
  color: "#0f172a",
  textDecoration: "none",
};

const attentionLinkTopStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  alignItems: "center",
};

const attentionDateStyle: CSSProperties = {
  fontSize: "12px",
  color: "#334155",
};

const attentionMetaRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(120px, 0.8fr) minmax(0, 1.2fr)",
  gap: "10px",
  color: "#64748b",
  fontSize: "12px",
  lineHeight: 1.35,
};

const sectionHeaderRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
  marginBottom: "12px",
  flexWrap: "wrap",
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "18px",
  color: "#0f172a",
};

const sectionSubtitleStyle: CSSProperties = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: "13px",
  lineHeight: 1.4,
};

const panelLinkStyle: CSSProperties = {
  color: "#3A9B98",
  fontWeight: 700,
  textDecoration: "none",
  whiteSpace: "nowrap",
};

const listWrapStyle: CSSProperties = {
  display: "grid",
  gap: "8px",
};

const listItemStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
  padding: "10px 12px",
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
};

const itemTitleStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 800,
  color: "#0f172a",
  lineHeight: 1.4,
};

const itemMetaStyle: CSSProperties = {
  marginTop: "4px",
  fontSize: "12px",
  color: "#64748b",
  lineHeight: 1.5,
};

const badgeWrapStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
};

const activityBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "12px",
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const emptyStateStyle: CSSProperties = {
  borderRadius: "12px",
  border: "1px dashed #cbd5e1",
  background: "#f8fafc",
  color: "#64748b",
  padding: "12px",
  fontSize: "13px",
};

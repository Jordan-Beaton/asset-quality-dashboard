"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
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

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFileSize(value: number | null | undefined) {
  if (!value || value <= 0) return "-";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function getTimestampValue(value: string | null | undefined) {
  if (!value) return Number.NEGATIVE_INFINITY;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
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

function getActivityTone(type: RecentActivityItem["type"]) {
  if (type === "asset") return { bg: "#dbeafe", text: "#1d4ed8" };
  if (type === "calibration") return { bg: "#dcfce7", text: "#166534" };
  if (type === "inspection") return { bg: "#fef3c7", text: "#92400e" };
  if (type === "maintenance") return { bg: "#ede9fe", text: "#6d28d9" };
  return { bg: "#fce7f3", text: "#be185d" };
}

function buildAssetLabel(asset: Asset | null) {
  if (!asset) return "Unknown asset";
  const code = asset.asset_code || asset.id;
  const name = asset.name || "Unnamed Asset";
  return `${code} - ${name}`;
}

function DashboardContent() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [calibrationRecords, setCalibrationRecords] = useState<AssetCalibrationRecord[]>([]);
  const [inspectionRecords, setInspectionRecords] = useState<AssetInspectionRecord[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<AssetMaintenanceRecord[]>([]);
  const [assetFiles, setAssetFiles] = useState<AssetFileRow[]>([]);
  const [message, setMessage] = useState("Loading asset dashboard...");
  const [lastRefreshed, setLastRefreshed] = useState("");

  useEffect(() => {
    void loadDashboardData();
  }, []);

  async function loadDashboardData() {
    const [assetsRes, calibrationsRes, inspectionsRes, maintenanceRes, filesRes] = await Promise.all([
      supabase.from("assets").select("*").order("name", { ascending: true }),
      supabase.from("asset_calibration_records").select("*"),
      supabase.from("asset_inspection_records").select("*"),
      supabase.from("asset_maintenance_records").select("*"),
      supabase.from("asset_files").select("*").order("uploaded_at", { ascending: false }),
    ]);

    if (assetsRes.error || calibrationsRes.error || inspectionsRes.error || maintenanceRes.error || filesRes.error) {
      setMessage(
        `Dashboard load failed: ${
          assetsRes.error?.message ||
          calibrationsRes.error?.message ||
          inspectionsRes.error?.message ||
          maintenanceRes.error?.message ||
          filesRes.error?.message ||
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
    setLastRefreshed(new Date().toLocaleString("en-GB"));
    setMessage("Asset dashboard loaded.");
  }

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

        return buildAssetLabel(a.asset).localeCompare(buildAssetLabel(b.asset), undefined, {
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

  const overdueCalibrations = calibrationRows.filter((row) => row.status === "Overdue").slice(0, 6);
  const upcomingCalibrations = calibrationRows
    .filter((row) => row.status === "Due Soon" || row.status === "In Date")
    .slice(0, 6);

  const overdueInspections = inspectionRows.filter((row) => row.status === "Overdue").slice(0, 6);
  const maintenanceDueSoonCount = maintenanceRows.filter((row) => row.status === "Due Soon").length;
  const maintenanceWatchlist = maintenanceRows
    .filter((row) => row.status === "Overdue" || row.status === "Due Soon")
    .slice(0, 6);

  const recentFiles = useMemo(() => {
    return assetFiles
      .map((file) => ({
        file,
        asset: assetMap.get(file.asset_id) || null,
      }))
      .sort((a, b) => getTimestampValue(b.file.uploaded_at) - getTimestampValue(a.file.uploaded_at))
      .slice(0, 8);
  }, [assetFiles, assetMap]);

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
        title: `${buildAssetLabel(asset)} calibration`,
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

  const recentActivityCount = useMemo(() => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return recentAssetRecords.filter((item) => getTimestampValue(item.timestamp) >= thirtyDaysAgo).length;
  }, [recentAssetRecords]);

  const latestAssetRecord = recentAssetRecords[0] || null;

  return (
    <main>
      <QualityPageHero
        label="ASSET MANAGEMENT"
        title="Asset Management Dashboard"
        description="Live operational view of calibration, inspection, maintenance, documents, and the most recent asset-side activity without leaving the Asset module."
        contextCards={[
          { label: "Last Refreshed", value: lastRefreshed || "-" },
          { label: "Latest Record", value: latestAssetRecord ? latestAssetRecord.title : "No recent asset activity" },
          { label: "Inspection Overdue", value: overdueInspections.length },
          { label: "Maintenance Watchlist", value: maintenanceWatchlist.length },
        ]}
      />

      <div style={topMetaRowStyle}>
        <Link href="/assets" style={backLinkStyle}>
          ← Back to Assets
        </Link>

        <div style={statusBannerStyle}>
          <strong>Status:</strong> {message}
        </div>
      </div>

      <section style={statsGridStyle}>
        <StatCard title="Total Assets" value={assets.length} accent="#2563eb" />
        <StatCard title="Calibration Overdue" value={overdueCalibrations.length} accent="#dc2626" />
        <StatCard title="Inspection Overdue" value={overdueInspections.length} accent="#d97706" />
        <StatCard title="Maintenance Due Soon" value={maintenanceDueSoonCount} accent="#7c3aed" />
        <StatCard title="Assets With Files" value={assetsWithFiles} accent="#0f766e" />
        <StatCard title="Recent Asset Activity" value={recentActivityCount} accent="#be185d" />
      </section>

      <section style={attentionGridStyle}>
        <AttentionCard
          title="Overdue Calibrations"
          summary={`${overdueCalibrations.length} overdue`}
          detail="Calibration exposure stays front and centre here so it is obvious what needs immediate attention."
          tone="red"
        />
        <AttentionCard
          title="Inspection Follow-Up"
          summary={`${overdueInspections.length} overdue inspections`}
          detail="Inspection records now feed the same attention-first dashboard view for field planning."
          tone="amber"
        />
        <AttentionCard
          title="Maintenance Watchlist"
          summary={`${maintenanceWatchlist.length} urgent maintenance items`}
          detail="Preventative and corrective maintenance due dates are grouped together for action."
          tone="violet"
        />
        <AttentionCard
          title="Recent Activity"
          summary={`${recentActivityCount} recent updates`}
          detail="Files, inspections, maintenance, and calibration activity stay visible without leaving the dashboard."
          tone="blue"
        />
      </section>

      <section style={panelGridStyle}>
        <SectionCard
          title="Upcoming Calibrations"
          subtitle="Next due calibration items across the register, including in-date and due-soon records."
          action={
            <Link href="/assets/calibration" style={panelLinkStyle}>
              Open Calibration Log
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
                  title={buildAssetLabel(row.asset)}
                  subtitle={`Due ${formatDate(row.record.calibration_due_date)}${row.record.certificate_number ? ` • ${row.record.certificate_number}` : ""}`}
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
          title="Overdue Calibrations"
          subtitle="Calibration records already past due, ordered by the oldest due date first."
        >
          {overdueCalibrations.length === 0 ? (
            <EmptyState message="No overdue calibration records." />
          ) : (
            <ListWrap>
              {overdueCalibrations.map((row) => (
                <DueListItem
                  key={row.id}
                  title={buildAssetLabel(row.asset)}
                  subtitle={`Due ${formatDate(row.record.calibration_due_date)}`}
                  meta={row.record.certificate_number || row.record.reference || "Calibration record"}
                  status={row.status}
                />
              ))}
            </ListWrap>
          )}
        </SectionCard>

        <SectionCard
          title="Inspection Watchlist"
          subtitle="Inspection records with the nearest follow-up dates, with overdue items surfaced first."
          action={
            <Link href="/assets/inspection" style={panelLinkStyle}>
              Open Inspection Log
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
                  subtitle={`${row.record.result || "Inspection record"} • Due ${formatDate(row.record.next_inspection_due)}`}
                  meta={row.record.inspector || "Inspector not set"}
                  status={row.status}
                />
              ))}
            </ListWrap>
          )}
        </SectionCard>

        <SectionCard
          title="Maintenance Watchlist"
          subtitle="Maintenance records needing follow-up, combining overdue and due-soon next-maintenance dates."
          action={
            <Link href="/assets/maintenance" style={panelLinkStyle}>
              Open Maintenance Log
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
                  subtitle={`${row.record.maintenance_type || "Maintenance"} • Due ${formatDate(row.record.next_maintenance_due)}`}
                  meta={row.record.carried_out_by || "Responsible person not set"}
                  status={row.status}
                />
              ))}
            </ListWrap>
          )}
        </SectionCard>

        <SectionCard
          title="Recent Uploaded Asset Files"
          subtitle="Latest uploaded asset-side files from the existing asset file register."
        >
          {recentFiles.length === 0 ? (
            <EmptyState message="No asset files have been uploaded yet." />
          ) : (
            <ListWrap>
              {recentFiles.map(({ file, asset }) => (
                <div key={file.id} style={listItemStyle}>
                  <div>
                    <div style={itemTitleStyle}>{file.file_name}</div>
                    <div style={itemMetaStyle}>{buildAssetLabel(asset)}</div>
                    <div style={itemMetaStyle}>
                      {file.file_type} • {formatFileSize(file.file_size)} • {formatDateTime(file.uploaded_at)}
                    </div>
                  </div>
                  <div style={badgeWrapStyle}>
                    <span style={neutralBadgeStyle}>{file.reference || "Asset file"}</span>
                  </div>
                </div>
              ))}
            </ListWrap>
          )}
        </SectionCard>

        <SectionCard
          title="Recent Asset Records"
          subtitle="Most recent asset, calibration, inspection, maintenance, and file activity based on stored timestamps."
        >
          {recentAssetRecords.length === 0 ? (
            <EmptyState message="No recent asset record timestamps are available yet." />
          ) : (
            <ListWrap>
              {recentAssetRecords.map((item) => {
                const tone = getActivityTone(item.type);
                return (
                  <div key={item.id} style={listItemStyle}>
                    <div>
                      <div style={itemTitleStyle}>{item.title}</div>
                      <div style={itemMetaStyle}>{item.subtitle}</div>
                      <div style={itemMetaStyle}>{formatDateTime(item.timestamp)}</div>
                    </div>
                    <div style={badgeWrapStyle}>
                      <span style={{ ...activityBadgeStyle, background: tone.bg, color: tone.text }}>
                        {item.type === "asset"
                          ? "Asset"
                          : item.type === "calibration"
                            ? "Calibration"
                            : item.type === "inspection"
                              ? "Inspection"
                              : item.type === "maintenance"
                                ? "Maintenance"
                                : "File"}
                      </span>
                    </div>
                  </div>
                );
              })}
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

function StatCard({
  title,
  value,
  accent,
}: {
  title: string;
  value: number;
  accent: string;
}) {
  return (
    <div style={{ ...statCardStyle, borderTop: `4px solid ${accent}` }}>
      <div style={statTitleStyle}>{title}</div>
      <div style={statValueStyle}>{value}</div>
    </div>
  );
}

function AttentionCard({
  title,
  summary,
  detail,
  tone,
}: {
  title: string;
  summary: string;
  detail: string;
  tone: "red" | "amber" | "blue" | "violet";
}) {
  const tones = {
    red: { bg: "#fff1f2", border: "#fecdd3", title: "#991b1b", summary: "#7f1d1d" },
    amber: { bg: "#fffbeb", border: "#fde68a", title: "#92400e", summary: "#78350f" },
    blue: { bg: "#eff6ff", border: "#bfdbfe", title: "#1d4ed8", summary: "#1e3a8a" },
    violet: { bg: "#f5f3ff", border: "#ddd6fe", title: "#6d28d9", summary: "#5b21b6" },
  };
  const colours = tones[tone];

  return (
    <div
      style={{
        ...attentionCardStyle,
        background: colours.bg,
        border: `1px solid ${colours.border}`,
      }}
    >
      <div style={{ ...attentionCardTitleStyle, color: colours.title }}>{title}</div>
      <div style={{ ...attentionCardSummaryStyle, color: colours.summary }}>{summary}</div>
      <div style={attentionCardDetailStyle}>{detail}</div>
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

const topMetaRowStyle: CSSProperties = {
  marginBottom: "20px",
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  alignItems: "center",
};

const backLinkStyle: CSSProperties = {
  color: "#0f766e",
  fontWeight: 700,
  textDecoration: "none",
};

const statusBannerStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe7f3",
  color: "#0f172a",
  padding: "10px 14px",
  borderRadius: "14px",
  fontSize: "14px",
};

const statsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: "16px",
  marginBottom: "20px",
};

const attentionGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "16px",
  marginBottom: "20px",
};

const statCardStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: "18px",
  border: "1px solid #dbe7f3",
  boxShadow: "0 14px 28px rgba(15, 23, 42, 0.06)",
  padding: "18px 20px",
};

const attentionCardStyle: CSSProperties = {
  borderRadius: "18px",
  padding: "18px 20px",
  display: "grid",
  gap: "8px",
  boxShadow: "0 10px 22px rgba(15, 23, 42, 0.04)",
};

const attentionCardTitleStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const attentionCardSummaryStyle: CSSProperties = {
  fontSize: "24px",
  fontWeight: 800,
  lineHeight: 1.1,
};

const attentionCardDetailStyle: CSSProperties = {
  fontSize: "13px",
  color: "#475569",
  lineHeight: 1.5,
};

const statTitleStyle: CSSProperties = {
  fontSize: "13px",
  color: "#64748b",
  fontWeight: 700,
};

const statValueStyle: CSSProperties = {
  marginTop: "10px",
  fontSize: "34px",
  lineHeight: 1,
  fontWeight: 800,
  color: "#0f172a",
};

const panelGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "20px",
};

const panelStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: "18px",
  border: "1px solid #dbe7f3",
  boxShadow: "0 14px 28px rgba(15, 23, 42, 0.06)",
  padding: "22px",
};

const sectionHeaderRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
  marginBottom: "18px",
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
  lineHeight: 1.55,
};

const panelLinkStyle: CSSProperties = {
  color: "#0f766e",
  fontWeight: 700,
  textDecoration: "none",
  whiteSpace: "nowrap",
};

const listWrapStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
};

const listItemStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
  padding: "14px 16px",
  borderRadius: "14px",
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

const neutralBadgeStyle: CSSProperties = {
  ...activityBadgeStyle,
  background: "#e2e8f0",
  color: "#334155",
};

const emptyStateStyle: CSSProperties = {
  borderRadius: "14px",
  border: "1px dashed #cbd5e1",
  background: "#f8fafc",
  color: "#64748b",
  padding: "18px",
  fontSize: "14px",
};

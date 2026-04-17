"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { supabase } from "../src/lib/supabase";

type Asset = {
  id: string;
  asset_code: string | null;
  name: string | null;
  description: string | null;
  location: string | null;
  owner: string | null;
  status: string | null;
  created_at?: string | null;
};

type Ncr = {
  id: string;
  ncr_number: string | null;
  title: string | null;
  severity: string | null;
  status: string | null;
  owner: string | null;
  area: string | null;
  created_at?: string | null;
};

type Capa = {
  id: string;
  capa_number: string | null;
  title: string | null;
  status: string | null;
  owner: string | null;
  linked_to: string | null;
  created_at?: string | null;
};

type ActionItem = {
  id: string;
  action_number: string | null;
  title: string | null;
  owner: string | null;
  priority: string | null;
  status: string | null;
  due_date: string | null;
  created_at?: string | null;
  updated_at?: string | null;
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
  created_at?: string | null;
};

type AssetQualityRow = {
  id: string;
  asset_id: string;
};

type AuditFindingRow = {
  id: string;
  audit_id: string;
  category: string | null;
  status: string | null;
};

function normaliseStatus(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function isClosedLikeStatus(value: string | null | undefined) {
  const status = normaliseStatus(value);
  return status === "closed" || status === "complete" || status === "completed";
}

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

function getDaysFromToday(value: string | null | undefined) {
  if (!value) return null;

  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return null;

  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffMs = due.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function formatAuditMonth(value: string | null | undefined) {
  if (!value) return "-";

  const [year, month] = value.split("-");
  if (!year || !month) return value;

  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function getManagementMessage(params: {
  overdueActions: number;
  dueNext7Days: number;
  majorNcrs: number;
  inactiveAssets: number;
  overdueAudits: number;
  openMajorFindings: number;
}) {
  const {
    overdueActions,
    dueNext7Days,
    majorNcrs,
    inactiveAssets,
    overdueAudits,
    openMajorFindings,
  } = params;

  if (
    overdueActions === 0 &&
    dueNext7Days === 0 &&
    majorNcrs === 0 &&
    inactiveAssets === 0 &&
    overdueAudits === 0 &&
    openMajorFindings === 0
  ) {
    return {
      tone: "good" as const,
      title: "System looks under control",
      text: "No overdue actions, overdue audits, or open major quality issues are currently showing.",
    };
  }

  if (overdueActions > 0 || majorNcrs > 0 || overdueAudits > 0 || openMajorFindings > 0) {
    return {
      tone: "risk" as const,
      title: "Immediate follow-up recommended",
      text: "There are overdue actions, overdue audits, or major open quality issues that need chasing first.",
    };
  }

  return {
    tone: "watch" as const,
    title: "Some items need monitoring",
    text: "The dashboard is generally stable, but there are near-term items and inactive assets that still need attention.",
  };
}

export default function Home() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [ncrs, setNcrs] = useState<Ncr[]>([]);
  const [capas, setCapas] = useState<Capa[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [auditFindings, setAuditFindings] = useState<AuditFindingRow[]>([]);
  const [assetQualityRows, setAssetQualityRows] = useState<AssetQualityRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      const [
        assetRes,
        ncrRes,
        capaRes,
        actionRes,
        auditRes,
        findingRes,
        assetQualityRes,
      ] = await Promise.all([
        supabase.from("assets").select("*"),
        supabase.from("ncrs").select("*"),
        supabase.from("capas").select("*"),
        supabase.from("actions").select("*"),
        supabase.from("audits").select("*"),
        supabase.from("audit_findings").select("*"),
        supabase.from("asset_quality").select("id,asset_id"),
      ]);

      if (
        assetRes.error ||
        ncrRes.error ||
        capaRes.error ||
        actionRes.error ||
        auditRes.error ||
        findingRes.error ||
        assetQualityRes.error
      ) {
        setError(
          assetRes.error?.message ||
            ncrRes.error?.message ||
            capaRes.error?.message ||
            actionRes.error?.message ||
            auditRes.error?.message ||
            findingRes.error?.message ||
            assetQualityRes.error?.message ||
            "Failed to load dashboard data."
        );
        setIsLoading(false);
        return;
      }

      setAssets((assetRes.data || []) as Asset[]);
      setNcrs((ncrRes.data || []) as Ncr[]);
      setCapas((capaRes.data || []) as Capa[]);
      setActions((actionRes.data || []) as ActionItem[]);
      setAudits((auditRes.data || []) as AuditRecord[]);
      setAuditFindings((findingRes.data || []) as AuditFindingRow[]);
      setAssetQualityRows((assetQualityRes.data || []) as AssetQualityRow[]);
      setLastRefreshed(new Date());
      setIsLoading(false);
    };

    void fetchData();
  }, []);

  const totalAssets = assets.length;

  const activeAssets = assets.filter((a) => normaliseStatus(a.status) === "active").length;

  const inactiveAssets = assets.filter((a) => normaliseStatus(a.status) !== "active").length;

  const openNcrs = ncrs.filter((n) => !isClosedLikeStatus(n.status)).length;

  const openCapas = capas.filter((c) => !isClosedLikeStatus(c.status)).length;

  const openActions = actions.filter((a) => !isClosedLikeStatus(a.status)).length;

  const overdueActions = actions.filter((action) => {
    if (!action.due_date) return false;
    if (isClosedLikeStatus(action.status)) return false;

    const days = getDaysFromToday(action.due_date);
    return days !== null && days < 0;
  }).length;

  const dueNext7DaysList = useMemo(() => {
    return [...actions]
      .filter((action) => {
        if (!action.due_date) return false;
        if (isClosedLikeStatus(action.status)) return false;

        const days = getDaysFromToday(action.due_date);
        return days !== null && days >= 0 && days <= 7;
      })
      .sort((a, b) => {
        const aDate = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        const bDate = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
      })
      .slice(0, 8);
  }, [actions]);

  const dueNext7Days = dueNext7DaysList.length;

  const majorNcrs = ncrs.filter(
    (n) => normaliseStatus(n.severity) === "major" && !isClosedLikeStatus(n.status)
  ).length;

  const totalAudits = audits.length;
  const plannedAudits = audits.filter((a) => normaliseStatus(a.status) === "planned").length;
  const inProgressAudits = audits.filter((a) => normaliseStatus(a.status) === "in progress").length;
  const overdueAudits = audits.filter((a) => normaliseStatus(a.status) === "overdue").length;
  const completedAudits = audits.filter((a) => normaliseStatus(a.status) === "completed").length;

  const totalAuditFindings = auditFindings.length;
  const openAuditFindings = auditFindings.filter((f) => normaliseStatus(f.status) !== "closed").length;
  const openMajorFindings = auditFindings.filter(
    (f) => normaliseStatus(f.category) === "major" && normaliseStatus(f.status) !== "closed"
  ).length;

  const qualityLinkedAssets = useMemo(() => {
    const linkedIds = new Set(assetQualityRows.map((row) => row.asset_id));
    return assets.filter((asset) => linkedIds.has(asset.id)).length;
  }, [assetQualityRows, assets]);

  const openItems = openNcrs + openCapas + openActions + openAuditFindings;

  const assetsByLocation = useMemo(() => {
    const map = assets.reduce<Record<string, number>>((acc, asset) => {
      const key = asset.location?.trim() || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(map)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [assets]);

  const maxLocationCount = Math.max(...assetsByLocation.map((x) => x.count), 1);

  const recentAssets = useMemo(() => {
    return [...assets]
      .sort((a, b) => {
        const aHasDate = !!a.created_at;
        const bHasDate = !!b.created_at;

        if (aHasDate && bHasDate) {
          return (
            new Date(b.created_at as string).getTime() -
            new Date(a.created_at as string).getTime()
          );
        }

        if (aHasDate && !bHasDate) return -1;
        if (!aHasDate && bHasDate) return 1;

        return (b.asset_code || "").localeCompare(a.asset_code || "");
      })
      .slice(0, 6);
  }, [assets]);

  const priorityActions = useMemo(() => {
    return [...actions]
      .filter((action) => !isClosedLikeStatus(action.status))
      .sort((a, b) => {
        const aOverdue = getDaysFromToday(a.due_date);
        const bOverdue = getDaysFromToday(b.due_date);
        const aRank = aOverdue !== null && aOverdue < 0 ? 0 : 1;
        const bRank = bOverdue !== null && bOverdue < 0 ? 0 : 1;

        if (aRank !== bRank) return aRank - bRank;

        const aDate = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        const bDate = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
      })
      .slice(0, 6);
  }, [actions]);

  const auditAttentionList = useMemo(() => {
    return [...audits]
      .filter((audit) => {
        const status = normaliseStatus(audit.status);
        return status === "overdue" || status === "planned" || status === "in progress";
      })
      .sort((a, b) => {
        const aStatus = normaliseStatus(a.status);
        const bStatus = normaliseStatus(b.status);
        const aRank = aStatus === "overdue" ? 0 : aStatus === "in progress" ? 1 : 2;
        const bRank = bStatus === "overdue" ? 0 : bStatus === "in progress" ? 1 : 2;

        if (aRank !== bRank) return aRank - bRank;

        const aDate = a.audit_date ? new Date(a.audit_date).getTime() : Number.MAX_SAFE_INTEGER;
        const bDate = b.audit_date ? new Date(b.audit_date).getTime() : Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
      })
      .slice(0, 6);
  }, [audits]);

  const managementMessage = getManagementMessage({
    overdueActions,
    dueNext7Days,
    majorNcrs,
    inactiveAssets,
    overdueAudits,
    openMajorFindings,
  });

  return (
    <main>
      <section style={heroStyle}>
        <div style={heroContentStyle}>
          <div style={eyebrowStyle}>Dashboard Overview</div>
          <h1 style={heroTitleStyle}>Quality Management Dashboard</h1>
          <p style={heroSubtitleStyle}>
            Live view of assets, NCRs, CAPAs, audits and actions across the system.
            Built to show where attention is needed first.
          </p>

          <div style={priorityStripStyle}>
            <PriorityPill
              label="Overdue Actions"
              value={overdueActions}
              tone={overdueActions > 0 ? "red" : "green"}
              isLoading={isLoading}
            />
            <PriorityPill
              label="Due in Next 7 Days"
              value={dueNext7Days}
              tone={dueNext7Days > 0 ? "amber" : "green"}
              isLoading={isLoading}
            />
            <PriorityPill
              label="Overdue Audits"
              value={overdueAudits}
              tone={overdueAudits > 0 ? "red" : "green"}
              isLoading={isLoading}
            />
            <PriorityPill
              label="Major Open Findings"
              value={openMajorFindings}
              tone={openMajorFindings > 0 ? "red" : "green"}
              isLoading={isLoading}
            />
          </div>
        </div>

        <div style={heroMetaWrapStyle}>
          <div style={heroMetaCardStyle}>
            <div style={heroMetaLabelStyle}>System Status</div>
            <div style={heroMetaValueStyle}>
              {error ? "Connection issue" : isLoading ? "Loading data" : "Connected"}
            </div>
          </div>

          <div style={heroMetaCardStyle}>
            <div style={heroMetaLabelStyle}>Open Items</div>
            <div style={heroMetaValueStyle}>{isLoading ? "—" : openItems}</div>
          </div>

          <div style={heroMetaCardStyle}>
            <div style={heroMetaLabelStyle}>Last Refreshed</div>
            <div style={heroMetaValueStyleSmall}>
              {isLoading ? "Loading..." : formatDateTime(lastRefreshed)}
            </div>
          </div>

          <div style={heroMetaCardStyle}>
            <div style={heroMetaLabelStyle}>Management View</div>
            <div style={heroMetaValueStyleSmall}>
              {isLoading ? "Preparing summary..." : managementMessage.title}
            </div>
          </div>
        </div>
      </section>

      {error && (
        <section style={errorBannerStyle}>
          <strong style={{ display: "block", marginBottom: "4px" }}>Dashboard error</strong>
          <span>{error}</span>
        </section>
      )}

      <section style={statsGridStyle}>
        <StatCard title="Total Assets" value={totalAssets} accent="#0f766e" isLoading={isLoading} />
        <StatCard title="Quality Linked Assets" value={qualityLinkedAssets} accent="#0891b2" isLoading={isLoading} />
        <StatCard title="Open NCRs" value={openNcrs} accent="#dc2626" isLoading={isLoading} />
        <StatCard title="Open CAPAs" value={openCapas} accent="#f59e0b" isLoading={isLoading} />
        <StatCard title="Open Actions" value={openActions} accent="#2563eb" isLoading={isLoading} />
        <StatCard title="Open Audit Findings" value={openAuditFindings} accent="#7c3aed" isLoading={isLoading} />
      </section>

      <section style={threeColumnGridStyle}>
        <SectionCard title="Management Focus" subtitle="Fast read for what needs attention first.">
          <ManagementCallout
            tone={managementMessage.tone}
            title={managementMessage.title}
            text={managementMessage.text}
          />

          <div style={stackCompactStyle}>
            <SnapshotRow label="Overdue actions requiring chase-up" value={overdueActions} isLoading={isLoading} />
            <SnapshotRow label="Overdue audits requiring action" value={overdueAudits} isLoading={isLoading} />
            <SnapshotRow label="Open major NCRs" value={majorNcrs} isLoading={isLoading} />
            <SnapshotRow label="Open major audit findings" value={openMajorFindings} isLoading={isLoading} />
            <SnapshotRow label="Inactive assets in register" value={inactiveAssets} isLoading={isLoading} />
          </div>
        </SectionCard>

        <SectionCard title="Quick Navigation" subtitle="Jump straight into the main working areas.">
          <div style={quickLinksGridStyle}>
            <QuickLinkCard href="/assets" title="Assets" description="Register assets and quality records." />
            <QuickLinkCard href="/ncr-capa" title="NCR / CAPA" description="Review nonconformances and CAPAs." />
            <QuickLinkCard href="/audits" title="Audits" description="Manage audit schedule, detail and findings." />
            <QuickLinkCard href="/actions" title="Actions" description="Track owners, due dates and evidence." />
            <QuickLinkCard href="/reports" title="Reports" description="Build management and audit summaries." />
          </div>
        </SectionCard>

        <SectionCard title="Audit Snapshot" subtitle="Current audit programme position.">
          <div style={stackCompactStyle}>
            <SnapshotRow label="Total audits" value={totalAudits} isLoading={isLoading} />
            <SnapshotRow label="Planned audits" value={plannedAudits} isLoading={isLoading} />
            <SnapshotRow label="In progress audits" value={inProgressAudits} isLoading={isLoading} />
            <SnapshotRow label="Completed audits" value={completedAudits} isLoading={isLoading} />
            <SnapshotRow label="Open audit findings" value={openAuditFindings} isLoading={isLoading} />
          </div>
        </SectionCard>
      </section>

      <section style={twoColumnGridStyle}>
        <SectionCard
          title="Priority Actions"
          subtitle="Live action list for near-term follow-up."
          action={
            <Link href="/actions" style={sectionLinkStyle}>
              View all actions →
            </Link>
          }
        >
          {isLoading ? (
            <p style={emptyTextStyle}>Loading priority actions...</p>
          ) : priorityActions.length === 0 ? (
            <p style={emptyTextStyle}>No open actions currently requiring attention.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={tableHeadStyle}>Action No.</th>
                    <th style={tableHeadStyle}>Title</th>
                    <th style={tableHeadStyle}>Owner</th>
                    <th style={tableHeadStyle}>Due Date</th>
                    <th style={tableHeadStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {priorityActions.map((action) => {
                    const days = getDaysFromToday(action.due_date);
                    const overdue = days !== null && days < 0;

                    return (
                      <tr
                        key={action.id}
                        style={{
                          ...tableRowStyle,
                          background: overdue ? "#fff7f7" : "white",
                        }}
                      >
                        <td style={tableCellStyle}>{action.action_number || "-"}</td>
                        <td style={tableCellStyle}>{action.title || "-"}</td>
                        <td style={tableCellStyle}>{action.owner || "-"}</td>
                        <td style={tableCellStyle}>
                          <div style={{ display: "grid", gap: "4px" }}>
                            <span>{formatDate(action.due_date)}</span>
                            <span
                              style={{
                                ...tableSubTextStyle,
                                color: overdue ? "#b91c1c" : "#64748b",
                                fontWeight: overdue ? 700 : 500,
                              }}
                            >
                              {days === null
                                ? "-"
                                : days < 0
                                ? `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`
                                : days === 0
                                ? "Due today"
                                : days === 1
                                ? "Due tomorrow"
                                : `Due in ${days} days`}
                            </span>
                          </div>
                        </td>
                        <td style={tableCellStyle}>
                          <StatusBadge value={action.status || "Unknown"} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Audit Attention"
          subtitle="Programme items that may need follow-up first."
          action={
            <Link href="/audits" style={sectionLinkStyle}>
              View all audits →
            </Link>
          }
        >
          {isLoading ? (
            <p style={emptyTextStyle}>Loading audits...</p>
          ) : auditAttentionList.length === 0 ? (
            <p style={emptyTextStyle}>No audits currently flagged for attention.</p>
          ) : (
            <div style={stackStyle}>
              {auditAttentionList.map((audit) => (
                <div key={audit.id} style={auditAttentionItemStyle}>
                  <div style={auditAttentionTopStyle}>
                    <span style={auditMiniTagStyle}>{audit.audit_type || "Audit"}</span>
                    <StatusBadge value={audit.status || "Unknown"} />
                  </div>
                  <div style={auditAttentionNumberStyle}>{audit.audit_number || "-"}</div>
                  <div style={auditAttentionTitleStyle}>{audit.title || "-"}</div>
                  <div style={auditAttentionMetaStyle}>
                    <span>{audit.auditee || "-"}</span>
                    <span>{formatDate(audit.audit_date)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </section>

      <section style={twoColumnGridStyle}>
        <SectionCard title="Attention Required" subtitle="Items that may need follow-up first.">
          <div style={stackStyle}>
            <AttentionItem
              label="Major NCRs"
              value={majorNcrs}
              tone={majorNcrs > 0 ? "red" : "green"}
              isLoading={isLoading}
            />
            <AttentionItem
              label="Overdue Actions"
              value={overdueActions}
              tone={overdueActions > 0 ? "red" : "green"}
              isLoading={isLoading}
            />
            <AttentionItem
              label="Overdue Audits"
              value={overdueAudits}
              tone={overdueAudits > 0 ? "red" : "green"}
              isLoading={isLoading}
            />
            <AttentionItem
              label="Inactive Assets"
              value={inactiveAssets}
              tone={inactiveAssets > 0 ? "amber" : "green"}
              isLoading={isLoading}
            />
            <AttentionItem
              label="Open CAPAs"
              value={openCapas}
              tone={openCapas > 0 ? "amber" : "green"}
              isLoading={isLoading}
            />
          </div>
        </SectionCard>

        <SectionCard title="Assets by Location" subtitle="Top locations currently holding assets.">
          <div style={stackCompactStyle}>
            {isLoading ? (
              <p style={emptyTextStyle}>Loading location data...</p>
            ) : assetsByLocation.length === 0 ? (
              <p style={emptyTextStyle}>No asset location data available.</p>
            ) : (
              assetsByLocation.map((item) => (
                <div key={item.location} style={locationRowStyle}>
                  <div>
                    <div style={locationNameStyle}>{item.location}</div>
                    <div style={locationBarTrackStyle}>
                      <div
                        style={{
                          ...locationBarFillStyle,
                          width: `${Math.max((item.count / maxLocationCount) * 100, 8)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div style={locationCountStyle}>{item.count}</div>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </section>

      <section style={twoColumnGridStyle}>
        <SectionCard title="Operational Snapshot" subtitle="Current totals across key areas.">
          <div style={stackCompactStyle}>
            <SnapshotRow label="Assets in system" value={totalAssets} isLoading={isLoading} />
            <SnapshotRow label="Quality linked assets" value={qualityLinkedAssets} isLoading={isLoading} />
            <SnapshotRow label="Open NCRs" value={openNcrs} isLoading={isLoading} />
            <SnapshotRow label="Open CAPAs" value={openCapas} isLoading={isLoading} />
            <SnapshotRow label="Open Actions" value={openActions} isLoading={isLoading} />
            <SnapshotRow label="Open audit findings" value={openAuditFindings} isLoading={isLoading} />
          </div>
        </SectionCard>

        <SectionCard title="Recent Asset Records" subtitle="Most recent asset entries shown first where created dates are available.">
          {isLoading ? (
            <p style={emptyTextStyle}>Loading asset records...</p>
          ) : recentAssets.length === 0 ? (
            <p style={emptyTextStyle}>No asset records found.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={tableHeadStyle}>Code</th>
                    <th style={tableHeadStyle}>Name</th>
                    <th style={tableHeadStyle}>Location</th>
                    <th style={tableHeadStyle}>Owner</th>
                    <th style={tableHeadStyle}>Status</th>
                    <th style={tableHeadStyle}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAssets.map((asset) => (
                    <tr key={asset.id} style={tableRowStyle}>
                      <td style={tableCellStyle}>{asset.asset_code || "-"}</td>
                      <td style={tableCellStyle}>{asset.name || "-"}</td>
                      <td style={tableCellStyle}>{asset.location || "-"}</td>
                      <td style={tableCellStyle}>{asset.owner || "-"}</td>
                      <td style={tableCellStyle}>
                        <StatusBadge value={asset.status || "Unknown"} />
                      </td>
                      <td style={tableCellStyle}>{formatDate(asset.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </section>

      <SectionCard
        title="Upcoming Audits"
        subtitle="Month and date view of the next audits in the programme."
        action={
          <Link href="/audits" style={sectionLinkStyle}>
            Open audits module →
          </Link>
        }
      >
        {isLoading ? (
          <p style={emptyTextStyle}>Loading audits...</p>
        ) : audits.length === 0 ? (
          <p style={emptyTextStyle}>No audits found.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={tableHeadStyle}>Audit No.</th>
                  <th style={tableHeadStyle}>Title</th>
                  <th style={tableHeadStyle}>Type</th>
                  <th style={tableHeadStyle}>Scheduled</th>
                  <th style={tableHeadStyle}>Audit Date</th>
                  <th style={tableHeadStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {[...audits]
                  .sort((a, b) => {
                    const aDate = a.audit_date ? new Date(a.audit_date).getTime() : Number.MAX_SAFE_INTEGER;
                    const bDate = b.audit_date ? new Date(b.audit_date).getTime() : Number.MAX_SAFE_INTEGER;
                    return aDate - bDate;
                  })
                  .slice(0, 8)
                  .map((audit) => (
                    <tr key={audit.id} style={tableRowStyle}>
                      <td style={tableCellStyle}>{audit.audit_number || "-"}</td>
                      <td style={tableCellStyle}>{audit.title || "-"}</td>
                      <td style={tableCellStyle}>{audit.audit_type || "-"}</td>
                      <td style={tableCellStyle}>{formatAuditMonth(audit.audit_month)}</td>
                      <td style={tableCellStyle}>{formatDate(audit.audit_date)}</td>
                      <td style={tableCellStyle}>
                        <StatusBadge value={audit.status || "Unknown"} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
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
        {action ? action : null}
      </div>
      {children}
    </section>
  );
}

function StatCard({
  title,
  value,
  accent,
  isLoading,
}: {
  title: string;
  value: number;
  accent: string;
  isLoading?: boolean;
}) {
  return (
    <div
      style={{
        ...statCardStyle,
        borderTop: `4px solid ${accent}`,
      }}
    >
      <div style={statCardLabelStyle}>{title}</div>
      <div style={statCardValueStyle}>{isLoading ? "—" : value}</div>
    </div>
  );
}

function PriorityPill({
  label,
  value,
  tone,
  isLoading,
}: {
  label: string;
  value: number;
  tone: "green" | "amber" | "red";
  isLoading?: boolean;
}) {
  const toneMap = {
    green: {
      bg: "rgba(220, 252, 231, 0.18)",
      border: "rgba(220, 252, 231, 0.32)",
      text: "#ecfdf5",
    },
    amber: {
      bg: "rgba(254, 243, 199, 0.16)",
      border: "rgba(254, 243, 199, 0.32)",
      text: "#fef3c7",
    },
    red: {
      bg: "rgba(254, 226, 226, 0.16)",
      border: "rgba(254, 226, 226, 0.32)",
      text: "#fee2e2",
    },
  };

  const colours = toneMap[tone];

  return (
    <div
      style={{
        ...priorityPillStyle,
        background: colours.bg,
        border: `1px solid ${colours.border}`,
      }}
    >
      <div style={priorityPillLabelStyle}>{label}</div>
      <div style={{ ...priorityPillValueStyle, color: colours.text }}>
        {isLoading ? "—" : value}
      </div>
    </div>
  );
}

function AttentionItem({
  label,
  value,
  tone,
  isLoading,
}: {
  label: string;
  value: number;
  tone: "green" | "amber" | "red";
  isLoading?: boolean;
}) {
  const toneMap = {
    green: {
      bg: "#f0fdf4",
      border: "#22c55e",
      text: "#166534",
      pillBg: "#dcfce7",
    },
    amber: {
      bg: "#fffbeb",
      border: "#f59e0b",
      text: "#92400e",
      pillBg: "#fef3c7",
    },
    red: {
      bg: "#fef2f2",
      border: "#ef4444",
      text: "#991b1b",
      pillBg: "#fee2e2",
    },
  };

  const colours = toneMap[tone];

  return (
    <div
      style={{
        background: colours.bg,
        borderLeft: `4px solid ${colours.border}`,
        borderRadius: "12px",
        padding: "14px 16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px",
      }}
    >
      <span style={{ color: colours.text, fontWeight: 600 }}>{label}</span>
      <span
        style={{
          background: colours.pillBg,
          color: colours.text,
          fontWeight: 700,
          fontSize: "14px",
          minWidth: "36px",
          height: "32px",
          borderRadius: "999px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 10px",
        }}
      >
        {isLoading ? "—" : value}
      </span>
    </div>
  );
}

function QuickLinkCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} style={quickLinkCardStyle}>
      <div style={quickLinkTitleStyle}>{title}</div>
      <div style={quickLinkDescriptionStyle}>{description}</div>
      <div style={quickLinkArrowStyle}>Open →</div>
    </Link>
  );
}

function SnapshotRow({
  label,
  value,
  isLoading,
}: {
  label: string;
  value: number;
  isLoading?: boolean;
}) {
  return (
    <div style={snapshotRowStyle}>
      <span style={snapshotLabelStyle}>{label}</span>
      <strong style={snapshotValueStyle}>{isLoading ? "—" : value}</strong>
    </div>
  );
}

function ManagementCallout({
  tone,
  title,
  text,
}: {
  tone: "good" | "watch" | "risk";
  title: string;
  text: string;
}) {
  const toneMap = {
    good: {
      bg: "#ecfdf5",
      border: "#22c55e",
      title: "#166534",
      text: "#166534",
    },
    watch: {
      bg: "#fffbeb",
      border: "#f59e0b",
      title: "#92400e",
      text: "#92400e",
    },
    risk: {
      bg: "#fef2f2",
      border: "#ef4444",
      title: "#991b1b",
      text: "#991b1b",
    },
  };

  const colours = toneMap[tone];

  return (
    <div
      style={{
        background: colours.bg,
        border: `1px solid ${colours.border}`,
        borderRadius: "14px",
        padding: "14px 16px",
        marginBottom: "14px",
      }}
    >
      <div
        style={{
          fontWeight: 700,
          color: colours.title,
          marginBottom: "6px",
        }}
      >
        {title}
      </div>
      <div
        style={{
          color: colours.text,
          fontSize: "14px",
          lineHeight: 1.5,
        }}
      >
        {text}
      </div>
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  const lower = normaliseStatus(value);

  const styles =
    lower === "active"
      ? { background: "#dcfce7", color: "#166534" }
      : lower === "inactive"
      ? { background: "#e5e7eb", color: "#374151" }
      : lower === "closed" || lower === "complete" || lower === "completed"
      ? { background: "#dcfce7", color: "#166534" }
      : lower === "open"
      ? { background: "#dbeafe", color: "#1d4ed8" }
      : lower === "in progress"
      ? { background: "#fef3c7", color: "#92400e" }
      : lower === "planned"
      ? { background: "#dbeafe", color: "#1d4ed8" }
      : lower === "overdue"
      ? { background: "#fee2e2", color: "#991b1b" }
      : { background: "#e5e7eb", color: "#374151" };

  return (
    <span
      style={{
        padding: "6px 10px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 700,
        display: "inline-block",
        whiteSpace: "nowrap",
        ...styles,
      }}
    >
      {value}
    </span>
  );
}

const heroStyle: CSSProperties = {
  background: "linear-gradient(135deg, #0f766e 0%, #115e59 100%)",
  color: "white",
  borderRadius: "20px",
  padding: "24px 26px",
  marginBottom: "20px",
  boxShadow: "0 10px 24px rgba(15, 118, 110, 0.14)",
  display: "flex",
  justifyContent: "space-between",
  gap: "20px",
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const heroContentStyle: CSSProperties = {
  flex: "1 1 560px",
};

const eyebrowStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  opacity: 0.82,
  marginBottom: "8px",
};

const heroTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "30px",
  lineHeight: 1.1,
};

const heroSubtitleStyle: CSSProperties = {
  marginTop: "10px",
  marginBottom: 0,
  fontSize: "15px",
  maxWidth: "700px",
  color: "rgba(255,255,255,0.92)",
};

const priorityStripStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "12px",
  marginTop: "18px",
};

const priorityPillStyle: CSSProperties = {
  borderRadius: "14px",
  padding: "12px 14px",
  minHeight: "78px",
};

const priorityPillLabelStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  color: "rgba(255,255,255,0.86)",
  marginBottom: "8px",
};

const priorityPillValueStyle: CSSProperties = {
  fontSize: "24px",
  fontWeight: 800,
};

const heroMetaWrapStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(180px, 1fr))",
  gap: "12px",
  minWidth: "320px",
  flex: "1 1 320px",
};

const heroMetaCardStyle: CSSProperties = {
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "14px",
  padding: "12px 14px",
};

const heroMetaLabelStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  opacity: 0.82,
  marginBottom: "6px",
};

const heroMetaValueStyle: CSSProperties = {
  fontSize: "18px",
  fontWeight: 700,
};

const heroMetaValueStyleSmall: CSSProperties = {
  fontSize: "15px",
  fontWeight: 700,
  lineHeight: 1.4,
};

const errorBannerStyle: CSSProperties = {
  background: "#fef2f2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  borderRadius: "14px",
  padding: "14px 16px",
  marginBottom: "20px",
};

const statsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: "16px",
  marginBottom: "20px",
};

const statCardStyle: CSSProperties = {
  background: "white",
  borderRadius: "16px",
  padding: "16px 18px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
  minHeight: "108px",
};

const statCardLabelStyle: CSSProperties = {
  fontSize: "13px",
  color: "#64748b",
  fontWeight: 600,
};

const statCardValueStyle: CSSProperties = {
  fontSize: "30px",
  fontWeight: 700,
  color: "#0f172a",
  marginTop: "10px",
};

const twoColumnGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "20px",
  marginBottom: "20px",
};

const threeColumnGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: "20px",
  marginBottom: "20px",
};

const panelStyle: CSSProperties = {
  background: "white",
  borderRadius: "18px",
  padding: "20px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
  marginBottom: "20px",
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

const sectionLinkStyle: CSSProperties = {
  textDecoration: "none",
  color: "#0f766e",
  fontWeight: 700,
  fontSize: "14px",
};

const stackStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
};

const stackCompactStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
};

const quickLinksGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
};

const quickLinkCardStyle: CSSProperties = {
  textDecoration: "none",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  minHeight: "132px",
  color: "#0f172a",
};

const quickLinkTitleStyle: CSSProperties = {
  fontWeight: 700,
  fontSize: "16px",
  marginBottom: "6px",
};

const quickLinkDescriptionStyle: CSSProperties = {
  color: "#64748b",
  fontSize: "14px",
  lineHeight: 1.5,
};

const quickLinkArrowStyle: CSSProperties = {
  marginTop: "16px",
  fontSize: "13px",
  fontWeight: 700,
  color: "#0f766e",
};

const snapshotRowStyle: CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
  padding: "12px 14px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const snapshotLabelStyle: CSSProperties = {
  color: "#334155",
  fontWeight: 600,
};

const snapshotValueStyle: CSSProperties = {
  color: "#0f172a",
};

const emptyTextStyle: CSSProperties = {
  color: "#64748b",
  margin: 0,
};

const locationRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  alignItems: "center",
  gap: "16px",
};

const locationNameStyle: CSSProperties = {
  fontWeight: 600,
  color: "#0f172a",
  marginBottom: "6px",
};

const locationBarTrackStyle: CSSProperties = {
  width: "100%",
  height: "10px",
  background: "#e2e8f0",
  borderRadius: "999px",
  overflow: "hidden",
};

const locationBarFillStyle: CSSProperties = {
  height: "100%",
  background: "#0f766e",
  borderRadius: "999px",
};

const locationCountStyle: CSSProperties = {
  fontWeight: 700,
  color: "#0f172a",
  minWidth: "18px",
  textAlign: "right",
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
  whiteSpace: "nowrap",
};

const tableRowStyle: CSSProperties = {
  background: "white",
};

const tableCellStyle: CSSProperties = {
  padding: "14px 10px",
  borderBottom: "1px solid #f1f5f9",
  color: "#0f172a",
  verticalAlign: "middle",
};

const tableSubTextStyle: CSSProperties = {
  fontSize: "12px",
  color: "#64748b",
};

const auditAttentionItemStyle: CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "14px 16px",
};

const auditAttentionTopStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  alignItems: "center",
  flexWrap: "wrap",
  marginBottom: "10px",
};

const auditMiniTagStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  background: "#e0f2fe",
  color: "#075985",
  borderRadius: "999px",
  padding: "5px 10px",
  fontSize: "12px",
  fontWeight: 700,
};

const auditAttentionNumberStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 800,
  color: "#64748b",
  marginBottom: "6px",
};

const auditAttentionTitleStyle: CSSProperties = {
  fontSize: "15px",
  fontWeight: 700,
  color: "#0f172a",
  marginBottom: "8px",
};

const auditAttentionMetaStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  flexWrap: "wrap",
  fontSize: "12px",
  color: "#64748b",
};
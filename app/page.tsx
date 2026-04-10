"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../src/lib/supabase";

type Asset = {
  id: string;
  asset_code: string | null;
  name: string | null;
  description: string | null;
  location: string | null;
  owner: string | null;
  status: string | null;
};

type Ncr = {
  id: string;
  ncr_number: string | null;
  title: string | null;
  severity: string | null;
  status: string | null;
  owner: string | null;
  area: string | null;
};

type Capa = {
  id: string;
  capa_number: string | null;
  title: string | null;
  status: string | null;
  owner: string | null;
  linked_to: string | null;
};

type ActionItem = {
  id: string;
  action_number: string | null;
  title: string | null;
  owner: string | null;
  priority: string | null;
  status: string | null;
  due_date: string | null;
};

export default function Home() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [ncrs, setNcrs] = useState<Ncr[]>([]);
  const [capas, setCapas] = useState<Capa[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      const [assetRes, ncrRes, capaRes, actionRes] = await Promise.all([
        supabase.from("assets").select("*"),
        supabase.from("ncrs").select("*"),
        supabase.from("capas").select("*"),
        supabase.from("actions").select("*"),
      ]);

      if (assetRes.error || ncrRes.error || capaRes.error || actionRes.error) {
        setError(
          assetRes.error?.message ||
            ncrRes.error?.message ||
            capaRes.error?.message ||
            actionRes.error?.message ||
            "Failed to load dashboard data."
        );
        setIsLoading(false);
        return;
      }

      setAssets(assetRes.data || []);
      setNcrs(ncrRes.data || []);
      setCapas(capaRes.data || []);
      setActions(actionRes.data || []);
      setIsLoading(false);
    };

    fetchData();
  }, []);

  const totalAssets = assets.length;
  const activeAssets = assets.filter(
    (a) => (a.status || "").toLowerCase() === "active"
  ).length;
  const inactiveAssets = assets.filter(
    (a) => (a.status || "").toLowerCase() !== "active"
  ).length;

  const openNcrs = ncrs.filter(
    (n) => (n.status || "").toLowerCase() !== "closed"
  ).length;
  const openCapas = capas.filter(
    (c) => (c.status || "").toLowerCase() !== "closed"
  ).length;
  const openActions = actions.filter(
    (a) => (a.status || "").toLowerCase() !== "closed"
  ).length;

  const overdueActions = actions.filter((action) => {
    if (!action.due_date) return false;
    if ((action.status || "").toLowerCase() === "closed") return false;

    const due = new Date(action.due_date);
    const today = new Date();

    due.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    return due < today;
  }).length;

  const majorNcrs = ncrs.filter(
    (n) =>
      (n.severity || "").toLowerCase() === "major" &&
      (n.status || "").toLowerCase() !== "closed"
  ).length;

  const openItems = openNcrs + openCapas + openActions;

  const assetsByLocation = useMemo(() => {
    const map = assets.reduce<Record<string, number>>((acc, asset) => {
      const key = asset.location || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(map)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [assets]);

  const maxLocationCount = Math.max(...assetsByLocation.map((x) => x.count), 1);

  const recentAssets = [...assets].slice(0, 6);

  return (
    <main>
      <section style={heroStyle}>
        <div style={heroContentStyle}>
          <div style={eyebrowStyle}>Dashboard Overview</div>
          <h1 style={heroTitleStyle}>Asset Quality Dashboard</h1>
          <p style={heroSubtitleStyle}>
            Live view of assets, NCRs, CAPAs and actions across the system.
          </p>
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
            <div style={heroMetaValueStyle}>{openItems}</div>
          </div>
        </div>
      </section>

      {error && (
        <section style={errorBannerStyle}>
          <strong style={{ display: "block", marginBottom: "4px" }}>
            Dashboard error
          </strong>
          <span>{error}</span>
        </section>
      )}

      <section style={statsGridStyle}>
        <StatCard
          title="Total Assets"
          value={totalAssets}
          accent="#0f766e"
          isLoading={isLoading}
        />
        <StatCard
          title="Active Assets"
          value={activeAssets}
          accent="#16a34a"
          isLoading={isLoading}
        />
        <StatCard
          title="Open NCRs"
          value={openNcrs}
          accent="#dc2626"
          isLoading={isLoading}
        />
        <StatCard
          title="Open CAPAs"
          value={openCapas}
          accent="#f59e0b"
          isLoading={isLoading}
        />
        <StatCard
          title="Open Actions"
          value={openActions}
          accent="#2563eb"
          isLoading={isLoading}
        />
        <StatCard
          title="Overdue Actions"
          value={overdueActions}
          accent="#b91c1c"
          isLoading={isLoading}
        />
      </section>

      <section style={twoColumnGridStyle}>
        <SectionCard
          title="Attention Required"
          subtitle="Items that may need follow-up first."
        >
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

        <SectionCard
          title="Quick Navigation"
          subtitle="Jump straight into the main working areas."
        >
          <div style={quickLinksGridStyle}>
            <QuickLinkCard
              href="/assets"
              title="Assets"
              description="Register and manage assets."
            />
            <QuickLinkCard
              href="/ncr-capa"
              title="NCR / CAPA"
              description="Review nonconformances and CAPAs."
            />
            <QuickLinkCard
              href="/actions"
              title="Actions"
              description="Track owners, due dates and status."
            />
            <QuickLinkCard
              href="/reports"
              title="Reports"
              description="Build monthly management reports."
            />
          </div>
        </SectionCard>
      </section>

      <section style={twoColumnGridStyle}>
        <SectionCard
          title="Operational Snapshot"
          subtitle="Current totals across key areas."
        >
          <div style={stackCompactStyle}>
            <SnapshotRow label="Assets in system" value={totalAssets} isLoading={isLoading} />
            <SnapshotRow label="Open NCRs" value={openNcrs} isLoading={isLoading} />
            <SnapshotRow label="Open CAPAs" value={openCapas} isLoading={isLoading} />
            <SnapshotRow label="Open Actions" value={openActions} isLoading={isLoading} />
            <SnapshotRow label="Overdue actions" value={overdueActions} isLoading={isLoading} />
          </div>
        </SectionCard>

        <SectionCard
          title="Assets by Location"
          subtitle="Top locations currently holding assets."
        >
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

      <SectionCard
        title="Asset Register Snapshot"
        subtitle="A quick view of current records in the asset register."
        action={
          <Link href="/assets" style={sectionLinkStyle}>
            View full register →
          </Link>
        }
      >
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
                  <th style={tableHeadStyle}>Description</th>
                  <th style={tableHeadStyle}>Location</th>
                  <th style={tableHeadStyle}>Owner</th>
                  <th style={tableHeadStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentAssets.map((asset) => (
                  <tr key={asset.id} style={tableRowStyle}>
                    <td style={tableCellStyle}>{asset.asset_code || "-"}</td>
                    <td style={tableCellStyle}>{asset.name || "-"}</td>
                    <td style={tableCellStyle}>{asset.description || "-"}</td>
                    <td style={tableCellStyle}>{asset.location || "-"}</td>
                    <td style={tableCellStyle}>{asset.owner || "-"}</td>
                    <td style={tableCellStyle}>
                      <StatusBadge value={asset.status || "Unknown"} />
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
  action?: React.ReactNode;
  children: React.ReactNode;
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

function StatusBadge({ value }: { value: string }) {
  const lower = value.toLowerCase();

  const styles =
    lower === "active"
      ? { background: "#dcfce7", color: "#166534" }
      : lower === "inactive"
      ? { background: "#e5e7eb", color: "#374151" }
      : lower === "closed"
      ? { background: "#dcfce7", color: "#166534" }
      : lower === "open"
      ? { background: "#dbeafe", color: "#1d4ed8" }
      : lower === "in progress"
      ? { background: "#fef3c7", color: "#92400e" }
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

const heroStyle: React.CSSProperties = {
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

const heroContentStyle: React.CSSProperties = {
  flex: "1 1 520px",
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  opacity: 0.82,
  marginBottom: "8px",
};

const heroTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "30px",
  lineHeight: 1.1,
};

const heroSubtitleStyle: React.CSSProperties = {
  marginTop: "10px",
  marginBottom: 0,
  fontSize: "15px",
  maxWidth: "680px",
  color: "rgba(255,255,255,0.92)",
};

const heroMetaWrapStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(180px, 1fr))",
  gap: "12px",
  minWidth: "320px",
  flex: "1 1 320px",
};

const heroMetaCardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "14px",
  padding: "12px 14px",
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

const errorBannerStyle: React.CSSProperties = {
  background: "#fef2f2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  borderRadius: "14px",
  padding: "14px 16px",
  marginBottom: "20px",
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: "16px",
  marginBottom: "20px",
};

const statCardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: "16px",
  padding: "16px 18px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
  minHeight: "108px",
};

const statCardLabelStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#64748b",
  fontWeight: 600,
};

const statCardValueStyle: React.CSSProperties = {
  fontSize: "30px",
  fontWeight: 700,
  color: "#0f172a",
  marginTop: "10px",
};

const twoColumnGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "20px",
  marginBottom: "20px",
};

const panelStyle: React.CSSProperties = {
  background: "white",
  borderRadius: "18px",
  padding: "20px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
  marginBottom: "20px",
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

const sectionLinkStyle: React.CSSProperties = {
  textDecoration: "none",
  color: "#0f766e",
  fontWeight: 700,
  fontSize: "14px",
};

const stackStyle: React.CSSProperties = {
  display: "grid",
  gap: "12px",
};

const stackCompactStyle: React.CSSProperties = {
  display: "grid",
  gap: "10px",
};

const quickLinksGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
};

const quickLinkCardStyle: React.CSSProperties = {
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

const quickLinkTitleStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: "16px",
  marginBottom: "6px",
};

const quickLinkDescriptionStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: "14px",
  lineHeight: 1.5,
};

const quickLinkArrowStyle: React.CSSProperties = {
  marginTop: "16px",
  fontSize: "13px",
  fontWeight: 700,
  color: "#0f766e",
};

const snapshotRowStyle: React.CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
  padding: "12px 14px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const snapshotLabelStyle: React.CSSProperties = {
  color: "#334155",
  fontWeight: 600,
};

const snapshotValueStyle: React.CSSProperties = {
  color: "#0f172a",
};

const emptyTextStyle: React.CSSProperties = {
  color: "#64748b",
  margin: 0,
};

const locationRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  alignItems: "center",
  gap: "16px",
};

const locationNameStyle: React.CSSProperties = {
  fontWeight: 600,
  color: "#0f172a",
  marginBottom: "6px",
};

const locationBarTrackStyle: React.CSSProperties = {
  width: "100%",
  height: "10px",
  background: "#e2e8f0",
  borderRadius: "999px",
  overflow: "hidden",
};

const locationBarFillStyle: React.CSSProperties = {
  height: "100%",
  background: "#0f766e",
  borderRadius: "999px",
};

const locationCountStyle: React.CSSProperties = {
  fontWeight: 700,
  color: "#0f172a",
  minWidth: "18px",
  textAlign: "right",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const tableHeadStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 10px",
  borderBottom: "1px solid #e2e8f0",
  color: "#475569",
  fontSize: "13px",
};

const tableRowStyle: React.CSSProperties = {
  background: "white",
};

const tableCellStyle: React.CSSProperties = {
  padding: "14px 10px",
  borderBottom: "1px solid #f1f5f9",
  color: "#0f172a",
  verticalAlign: "middle",
};
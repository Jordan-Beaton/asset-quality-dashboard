"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { QualityKpiCard } from "../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../src/components/QualityPageHero";
import { supabase } from "../../src/lib/supabase";

type RiskRating = "Low" | "Medium" | "High" | "Critical";

type RiskRow = {
  id: string;
  risk_number: string | null;
  title: string | null;
  category: string | null;
  department: string | null;
  residual_rating: RiskRating | null;
  status: string | null;
  response_status: string | null;
  next_review_due: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function isClosedStatus(status: string | null | undefined) {
  const normalised = (status || "").trim().toLowerCase();
  return normalised === "closed" || normalised === "archived";
}

function getDaysFromToday(value: string | null | undefined) {
  if (!value) return null;
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function isOverdueReview(risk: RiskRow) {
  if (isClosedStatus(risk.status)) return false;
  const days = getDaysFromToday(risk.next_review_due);
  return days !== null && days < 0;
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

function getLatestTimestamp(value: string | null | undefined) {
  const timestamp = new Date(value || 0).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function countBy(values: Array<string | null | undefined>) {
  return values.reduce<Record<string, number>>((acc, value) => {
    const key = (value || "Unassigned").trim() || "Unassigned";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

export default function RiskDashboardPage() {
  const [risks, setRisks] = useState<RiskRow[]>([]);
  const [message, setMessage] = useState("Loading Risk Management dashboard...");
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  async function loadRisks() {
    const { data, error } = await supabase
      .from("risks")
      .select("id,risk_number,title,category,department,residual_rating,status,response_status,next_review_due,created_at,updated_at")
      .order("risk_number", { ascending: true });

    if (error) {
      setMessage(`Risk dashboard load failed: ${error.message}`);
      return;
    }

    const nextRisks = (data || []) as RiskRow[];
    setRisks(nextRisks);
    setLastRefreshed(new Date());
    setMessage(`Loaded ${nextRisks.length} risk${nextRisks.length === 1 ? "" : "s"} successfully.`);
  }

  useEffect(() => {
    void loadRisks();
  }, []);

  const openRisks = risks.filter((risk) => !isClosedStatus(risk.status)).length;
  const highCriticalRisks = risks.filter(
    (risk) => risk.residual_rating === "High" || risk.residual_rating === "Critical"
  ).length;
  const overdueReviews = risks.filter(isOverdueReview).length;
  const openActionsPlaceholder = "-";

  const latestRiskLabel = useMemo(() => {
    const latest = [...risks].sort(
      (a, b) => getLatestTimestamp(b.updated_at || b.created_at) - getLatestTimestamp(a.updated_at || a.created_at)
    )[0];
    return latest ? `${latest.risk_number || "Risk"} - ${latest.title || "Untitled"}` : "No risks loaded";
  }, [risks]);

  const ratingCounts = countBy(risks.map((risk) => risk.residual_rating));
  const categoryCounts = countBy(risks.filter((risk) => !isClosedStatus(risk.status)).map((risk) => risk.category));
  const departmentCounts = countBy(risks.filter((risk) => !isClosedStatus(risk.status)).map((risk) => risk.department));
  const responseCounts = countBy(risks.map((risk) => risk.response_status));
  const maxCategoryCount = Math.max(1, ...Object.values(categoryCounts), ...Object.values(departmentCounts));

  return (
    <main>
      <QualityPageHero
        label="RISK MANAGEMENT"
        title="Risk Dashboard"
        description="A controlled Risk Management workspace for register oversight, reviews, controls, opportunities, actions, and reporting."
        contextCards={[
          { label: "Last Refreshed", value: formatDateTime(lastRefreshed) },
          { label: "Latest Risk Update", value: latestRiskLabel },
        ]}
      />

      <div style={topMetaRowStyle}>
        <div style={topMetaActionsStyle}>
          <button type="button" style={secondaryButtonStyle} onClick={() => void loadRisks()}>
            Refresh
          </button>
          <div style={statusBannerStyle}>
            <strong>Status:</strong> {message}
          </div>
        </div>
      </div>

      <section style={statsGridStyle}>
        <QualityKpiCard title="Open Risks" value={openRisks} accent="#005670" />
        <QualityKpiCard title="High / Critical" value={highCriticalRisks} accent="#F93822" />
        <QualityKpiCard title="Overdue Reviews" value={overdueReviews} accent="#FFAD00" />
        <QualityKpiCard title="Linked Actions" value={openActionsPlaceholder} accent="#53565A" />
      </section>

      <section style={dashboardGridStyle}>
        <DashboardPanel title="Risk profile by rating" subtitle="Residual rating distribution">
          <div style={ratingGridStyle}>
            {(["Critical", "High", "Medium", "Low"] as RiskRating[]).map((rating) => (
              <div key={rating} style={ratingItemStyle}>
                <span style={ratingLabelStyle}>{rating}</span>
                <strong style={ratingValueStyle}>{ratingCounts[rating] || 0}</strong>
              </div>
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Open risks by category" subtitle="Open risk category profile">
          <BarList counts={categoryCounts} max={maxCategoryCount} />
        </DashboardPanel>

        <DashboardPanel title="Open risks by department" subtitle="Department ownership profile">
          <BarList counts={departmentCounts} max={maxCategoryCount} />
        </DashboardPanel>

        <DashboardPanel title="Response status" subtitle="Response and mitigation progress">
          <BarList counts={responseCounts} max={Math.max(1, ...Object.values(responseCounts))} />
        </DashboardPanel>
      </section>
    </main>
  );
}

function DashboardPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section style={panelStyle}>
      <div style={panelHeaderStyle}>
        <h2 style={panelTitleStyle}>{title}</h2>
        <p style={panelSubtitleStyle}>{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function BarList({ counts, max }: { counts: Record<string, number>; max: number }) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);

  if (entries.length === 0) {
    return <div style={emptyStateStyle}>Awaiting risk register setup.</div>;
  }

  return (
    <div style={placeholderChartStyle}>
      {entries.map(([label, value]) => (
        <div key={label} style={barRowStyle}>
          <span style={barLabelStyle}>{label}</span>
          <div style={barTrackStyle}>
            <div style={{ ...barFillStyle, width: `${Math.max(8, Math.round((value / max) * 100))}%` }} />
          </div>
          <strong style={barValueStyle}>{value}</strong>
        </div>
      ))}
    </div>
  );
}

const topMetaRowStyle: CSSProperties = {
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

const topMetaActionsStyle: CSSProperties = {
  marginLeft: "auto",
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  alignItems: "center",
};

const statusBannerStyle: CSSProperties = {
  background: "white",
  borderRadius: "12px",
  padding: "12px 16px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
  color: "#0f172a",
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

const statsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "16px",
  marginBottom: "20px",
};

const dashboardGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "20px",
};

const panelStyle: CSSProperties = {
  minHeight: "260px",
  background: "white",
  borderRadius: "18px",
  padding: "20px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
  border: "1px solid #e2e8f0",
  display: "grid",
  alignContent: "start",
  gap: "18px",
};

const panelHeaderStyle: CSSProperties = { display: "grid", gap: "6px" };
const panelTitleStyle: CSSProperties = { margin: 0, fontSize: "20px", color: "#0f172a" };
const panelSubtitleStyle: CSSProperties = { margin: 0, color: "#64748b", fontSize: "14px", lineHeight: 1.45 };
const ratingGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "12px" };
const ratingItemStyle: CSSProperties = { borderRadius: "14px", border: "1px solid #e2e8f0", background: "#f8fafc", padding: "14px", minHeight: "92px", display: "flex", flexDirection: "column", justifyContent: "space-between" };
const ratingLabelStyle: CSSProperties = { color: "#64748b", fontSize: "12px", fontWeight: 800 };
const ratingValueStyle: CSSProperties = { color: "#0f172a", fontSize: "28px", lineHeight: 1 };
const placeholderChartStyle: CSSProperties = { display: "grid", gap: "12px" };
const barRowStyle: CSSProperties = { display: "grid", gridTemplateColumns: "120px 1fr 28px", alignItems: "center", gap: "12px" };
const barLabelStyle: CSSProperties = { color: "#334155", fontSize: "13px", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const barTrackStyle: CSSProperties = { height: "12px", borderRadius: "999px", background: "#e2e8f0", overflow: "hidden" };
const barFillStyle: CSSProperties = { height: "100%", borderRadius: "999px", background: "#005670", opacity: 0.62 };
const barValueStyle: CSSProperties = { color: "#0f172a", fontSize: "14px", textAlign: "right" };
const emptyStateStyle: CSSProperties = { minHeight: "150px", borderRadius: "14px", border: "1px dashed #cbd5e1", background: "#f8fafc", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 };

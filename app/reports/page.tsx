"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../src/lib/supabase";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

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

const emptyForm = {
  month_label: "",
  summary: "",
  wins: "",
  risks: "",
  next_steps: "",
};

export default function ReportsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [ncrs, setNcrs] = useState<Ncr[]>([]);
  const [capas, setCapas] = useState<Capa[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [message, setMessage] = useState("Loading reports dashboard...");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState(emptyForm);

  async function loadData() {
    const [assetsRes, ncrsRes, capasRes, actionsRes, reportsRes] = await Promise.all([
      supabase.from("assets").select("*"),
      supabase.from("ncrs").select("*"),
      supabase.from("capas").select("*"),
      supabase.from("actions").select("*"),
      supabase.from("monthly_reports").select("*").order("created_at", { ascending: false }),
    ]);

    if (
      assetsRes.error ||
      ncrsRes.error ||
      capasRes.error ||
      actionsRes.error ||
      reportsRes.error
    ) {
      setMessage(
        `Error: ${
          assetsRes.error?.message ||
          ncrsRes.error?.message ||
          capasRes.error?.message ||
          actionsRes.error?.message ||
          reportsRes.error?.message
        }`
      );
      return;
    }

    setAssets(assetsRes.data || []);
    setNcrs(ncrsRes.data || []);
    setCapas(capasRes.data || []);
    setActions(actionsRes.data || []);
    setReports(reportsRes.data || []);
    setMessage("Reports dashboard loaded successfully.");
  }

  useEffect(() => {
    loadData();
  }, []);

  const totalAssets = assets.length;
  const openNcrs = ncrs.filter((n) => (n.status || "").toLowerCase() !== "closed").length;
  const openCapas = capas.filter((c) => (c.status || "").toLowerCase() !== "closed").length;
  const openActions = actions.filter((a) => (a.status || "").toLowerCase() !== "closed").length;

  const overdueActions = actions.filter((action) => {
    if (!action.due_date) return false;
    if ((action.status || "").toLowerCase() === "closed") return false;

    const due = new Date(action.due_date);
    const today = new Date();
    due.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    return due < today;
  }).length;

  const majorOpenNcrs = ncrs.filter(
    (n) =>
      (n.severity || "").toLowerCase() === "major" &&
      (n.status || "").toLowerCase() !== "closed"
  ).length;

  const ncrStatusChart = useMemo(() => {
    const groups = ncrs.reduce<Record<string, number>>((acc, ncr) => {
      const key = ncr.status || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [ncrs]);

  const capaStatusChart = useMemo(() => {
    const groups = capas.reduce<Record<string, number>>((acc, capa) => {
      const key = capa.status || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [capas]);

  const actionStatusChart = useMemo(() => {
    const groups = actions.reduce<Record<string, number>>((acc, action) => {
      const key = action.status || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [actions]);

  const assetLocationChart = useMemo(() => {
    const groups = assets.reduce<Record<string, number>>((acc, asset) => {
      const key = asset.location || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [assets]);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function handleEdit(report: MonthlyReport) {
    setEditingId(report.id);
    setForm({
      month_label: report.month_label || "",
      summary: report.summary || "",
      wins: report.wins || "",
      risks: report.risks || "",
      next_steps: report.next_steps || "",
    });
    setMessage(`Editing report: ${report.month_label}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
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

    if (!form.month_label.trim()) {
      setMessage("Month label is required.");
      return;
    }

    const snapshot = {
      total_assets: totalAssets,
      open_ncrs: openNcrs,
      open_capas: openCapas,
      open_actions: openActions,
      overdue_actions: overdueActions,
      major_open_ncrs: majorOpenNcrs,
    };

    if (editingId) {
      const { error } = await supabase
        .from("monthly_reports")
        .update({
          month_label: form.month_label,
          summary: form.summary || null,
          wins: form.wins || null,
          risks: form.risks || null,
          next_steps: form.next_steps || null,
          snapshot_json: snapshot,
        })
        .eq("id", editingId);

      if (error) {
        setMessage(`Update report failed: ${error.message}`);
        return;
      }

      setMessage("Monthly report updated successfully.");
    } else {
      const { error } = await supabase.from("monthly_reports").insert([
        {
          month_label: form.month_label,
          summary: form.summary || null,
          wins: form.wins || null,
          risks: form.risks || null,
          next_steps: form.next_steps || null,
          snapshot_json: snapshot,
        },
      ]);

      if (error) {
        setMessage(`Save report failed: ${error.message}`);
        return;
      }

      setMessage("Monthly report saved successfully.");
    }

    resetForm();
    await loadData();
  }

  return (
    <main>
      <section style={heroStyle}>
        <div>
          <div style={eyebrowStyle}>Management Reporting</div>
          <h1 style={heroTitleStyle}>Reports</h1>
          <p style={heroSubtitleStyle}>
            Build monthly management summaries using the current live system data,
            track saved reports, and present quality performance clearly.
          </p>
        </div>

        <div style={heroMetaWrapStyle}>
          <div style={heroMetaCardStyle}>
            <div style={heroMetaLabelStyle}>Saved Reports</div>
            <div style={heroMetaValueStyle}>{reports.length}</div>
          </div>
          <div style={heroMetaCardStyle}>
            <div style={heroMetaLabelStyle}>Open Items</div>
            <div style={heroMetaValueStyle}>{openNcrs + openCapas + openActions}</div>
          </div>
        </div>
      </section>

      <div style={{ marginBottom: "20px" }}>
        <Link href="/" style={backLinkStyle}>
          ← Back to Dashboard
        </Link>
      </div>

      <section style={statsGridStyle}>
        <StatCard title="Total Assets" value={totalAssets} accent="#0f766e" />
        <StatCard title="Open NCRs" value={openNcrs} accent="#dc2626" />
        <StatCard title="Open CAPAs" value={openCapas} accent="#f59e0b" />
        <StatCard title="Open Actions" value={openActions} accent="#2563eb" />
        <StatCard title="Overdue Actions" value={overdueActions} accent="#b91c1c" />
      </section>

      <section style={statusBannerStyle}>
        <strong>Status:</strong> {message}
      </section>

      <section style={twoColumnGridStyle}>
        <div style={panelStyle}>
          <div style={sectionHeaderRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>
                {editingId ? "Edit Monthly Report" : "Create Monthly Report"}
              </h2>
              <p style={sectionSubtitleStyle}>
                Build an executive summary using live asset, NCR, CAPA and action data.
              </p>
            </div>
          </div>

          <form onSubmit={saveMonthlyReport}>
            <div style={{ display: "grid", gap: "12px" }}>
              <input
                placeholder="Month Label (e.g. April 2026)"
                value={form.month_label}
                onChange={(e) => setForm({ ...form, month_label: e.target.value })}
                style={inputStyle}
              />
              <textarea
                placeholder="Summary"
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                rows={4}
                style={textareaStyle}
              />
              <textarea
                placeholder="Wins"
                value={form.wins}
                onChange={(e) => setForm({ ...form, wins: e.target.value })}
                rows={4}
                style={textareaStyle}
              />
              <textarea
                placeholder="Risks"
                value={form.risks}
                onChange={(e) => setForm({ ...form, risks: e.target.value })}
                rows={4}
                style={textareaStyle}
              />
              <textarea
                placeholder="Next Steps"
                value={form.next_steps}
                onChange={(e) => setForm({ ...form, next_steps: e.target.value })}
                rows={4}
                style={textareaStyle}
              />
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "12px", flexWrap: "wrap" }}>
              <button type="submit" style={primaryButtonStyle}>
                {editingId ? "Update Monthly Report" : "Save Monthly Report"}
              </button>

              {editingId && (
                <button type="button" style={secondaryButtonStyle} onClick={resetForm}>
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </div>

        <div style={panelStyle}>
          <div style={sectionHeaderRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Executive Snapshot</h2>
              <p style={sectionSubtitleStyle}>
                Current live headline metrics for the management summary.
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gap: "12px" }}>
            <SnapshotRow label="Total Assets" value={totalAssets} />
            <SnapshotRow label="Open NCRs" value={openNcrs} />
            <SnapshotRow label="Major Open NCRs" value={majorOpenNcrs} />
            <SnapshotRow label="Open CAPAs" value={openCapas} />
            <SnapshotRow label="Open Actions" value={openActions} />
            <SnapshotRow label="Overdue Actions" value={overdueActions} />
          </div>
        </div>
      </section>

      <section style={chartGridStyle}>
        <div style={panelStyle}>
          <div style={sectionHeaderRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>NCR Status</h2>
              <p style={sectionSubtitleStyle}>Current status split across NCR records.</p>
            </div>
          </div>

          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={ncrStatusChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#dc2626" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={panelStyle}>
          <div style={sectionHeaderRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>CAPA Status</h2>
              <p style={sectionSubtitleStyle}>Current status split across CAPA records.</p>
            </div>
          </div>

          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={capaStatusChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={panelStyle}>
          <div style={sectionHeaderRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Actions Status</h2>
              <p style={sectionSubtitleStyle}>Current status split across action records.</p>
            </div>
          </div>

          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={actionStatusChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={panelStyle}>
          <div style={sectionHeaderRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Assets by Location</h2>
              <p style={sectionSubtitleStyle}>Distribution of assets across locations.</p>
            </div>
          </div>

          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={assetLocationChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#0f766e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section style={panelStyle}>
        <div style={sectionHeaderRowStyle}>
          <div>
            <h2 style={sectionTitleStyle}>Saved Monthly Reports</h2>
            <p style={sectionSubtitleStyle}>
              Review previously saved management reports and update them where needed.
            </p>
          </div>
          <div style={registerCountStyle}>{reports.length} reports</div>
        </div>

        {reports.length === 0 ? (
          <p style={emptyTextStyle}>No monthly reports saved yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={tableHeadStyle}>Month</th>
                  <th style={tableHeadStyle}>Summary</th>
                  <th style={tableHeadStyle}>Wins</th>
                  <th style={tableHeadStyle}>Risks</th>
                  <th style={tableHeadStyle}>Next Steps</th>
                  <th style={tableHeadStyle}>Created</th>
                  <th style={tableHeadStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td style={tableCellStyle}>{report.month_label}</td>
                    <td style={tableCellStyle}>{report.summary || "-"}</td>
                    <td style={tableCellStyle}>{report.wins || "-"}</td>
                    <td style={tableCellStyle}>{report.risks || "-"}</td>
                    <td style={tableCellStyle}>{report.next_steps || "-"}</td>
                    <td style={tableCellStyle}>
                      {report.created_at ? new Date(report.created_at).toLocaleString() : "-"}
                    </td>
                    <td style={tableCellStyle}>
                      <div style={actionButtonsWrapStyle}>
                        <button
                          type="button"
                          style={miniButtonStyle}
                          onClick={() => handleEdit(report)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          style={miniButtonDeleteStyle}
                          onClick={() => handleDelete(report.id)}
                        >
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
    <div
      style={{
        background: "white",
        borderRadius: "16px",
        padding: "18px 20px",
        borderLeft: `5px solid ${accent}`,
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
      }}
    >
      <div style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: "34px", fontWeight: 700, color: "#0f172a", marginTop: "8px" }}>
        {value}
      </div>
    </div>
  );
}

function SnapshotRow({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: "10px",
        padding: "12px 14px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span style={{ color: "#334155", fontWeight: 600 }}>{label}</span>
      <strong style={{ color: "#0f172a" }}>{value}</strong>
    </div>
  );
}

const heroStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #0f766e 0%, #115e59 100%)",
  color: "white",
  borderRadius: "20px",
  padding: "28px 30px",
  marginBottom: "24px",
  boxShadow: "0 10px 30px rgba(15, 118, 110, 0.14)",
  display: "flex",
  justifyContent: "space-between",
  gap: "20px",
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  opacity: 0.78,
  marginBottom: "10px",
};

const heroTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "34px",
  lineHeight: 1.1,
};

const heroSubtitleStyle: React.CSSProperties = {
  marginTop: "10px",
  marginBottom: 0,
  fontSize: "16px",
  maxWidth: "720px",
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
  color: "#0f766e",
  fontWeight: 700,
  textDecoration: "none",
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  gap: "16px",
  marginBottom: "20px",
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
  gridTemplateColumns: "1.1fr 0.9fr",
  gap: "20px",
  marginBottom: "20px",
};

const chartGridStyle: React.CSSProperties = {
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

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  minWidth: "180px",
  background: "white",
  color: "#0f172a",
};

const textareaStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  resize: "vertical",
  fontFamily: "Arial, sans-serif",
  background: "white",
  color: "#0f172a",
};

const primaryButtonStyle: React.CSSProperties = {
  background: "#0f766e",
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

const miniButtonStyle: React.CSSProperties = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};

const miniButtonDeleteStyle: React.CSSProperties = {
  background: "#dc2626",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
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
};

const tableHeadStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 10px",
  borderBottom: "1px solid #e2e8f0",
  color: "#475569",
  fontSize: "13px",
};

const tableCellStyle: React.CSSProperties = {
  padding: "14px 10px",
  borderBottom: "1px solid #f1f5f9",
  color: "#0f172a",
  verticalAlign: "top",
};

const actionButtonsWrapStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};
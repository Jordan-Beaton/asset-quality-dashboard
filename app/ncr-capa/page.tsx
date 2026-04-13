"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../src/lib/supabase";

type Ncr = {
  id: string;
  ncr_number: string | null;
  title: string | null;
  description: string | null;
  severity: string | null;
  status: string | null;
  owner: string | null;
  area: string | null;
  due_date: string | null;
  created_at: string | null;
  project: string | null;
  source_type: string | null;
};

type Capa = {
  id: string;
  capa_number: string | null;
  title: string | null;
  description: string | null;
  status: string | null;
  owner: string | null;
  due_date: string | null;
  created_at: string | null;
  linked_to: string | null;
  project: string | null;
};

type CombinedRow = {
  type: "NCR" | "CAPA";
  id: string;
  number: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  owner: string;
  area: string;
  due_date: string;
  created_at: string;
  project: string;
  source_type: string;
  linked_to: string;
};

const pageWrap: React.CSSProperties = {
  minHeight: "100%",
  background: "transparent",
  padding: 0,
};

const shell: React.CSSProperties = {
  width: "100%",
  margin: 0,
};

const heroCard: React.CSSProperties = {
  background: "linear-gradient(135deg, #15766e 0%, #136c65 58%, #0f5f59 100%)",
  color: "#ffffff",
  borderRadius: 22,
  padding: 26,
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
  border: "1px solid rgba(255,255,255,0.10)",
  marginBottom: 22,
};

const whiteCard: React.CSSProperties = {
  background: "#f8fafc",
  borderRadius: 20,
  border: "1px solid #d7dee7",
  boxShadow: "0 4px 14px rgba(15, 23, 42, 0.04)",
};

const sectionLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  color: "#64748b",
  marginBottom: 6,
  letterSpacing: 0.3,
  textTransform: "uppercase",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  outline: "none",
  fontSize: 14,
  color: "#0f172a",
  boxSizing: "border-box",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 100,
  resize: "vertical",
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#475569",
  marginBottom: 6,
  display: "block",
  letterSpacing: 0.2,
  textTransform: "uppercase",
};

const primaryButton: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 12,
  border: "none",
  background: "#2563eb",
  color: "#ffffff",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  fontWeight: 700,
  cursor: "pointer",
};

const ghostButton: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.08)",
  color: "#ffffff",
  fontWeight: 700,
  cursor: "pointer",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

function dueState(date: string | null | undefined) {
  if (!date) return "none";
  const today = new Date();
  const due = new Date(date);
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "overdue";
  if (diff <= 7) return "soon";
  return "ok";
}

function getStatusTone(status: string) {
  const value = (status || "").toLowerCase();
  if (value.includes("open")) return { bg: "#fee2e2", color: "#991b1b" };
  if (value.includes("progress")) return { bg: "#fef3c7", color: "#92400e" };
  if (value.includes("hold")) return { bg: "#ede9fe", color: "#5b21b6" };
  if (value.includes("closed")) return { bg: "#dcfce7", color: "#166534" };
  if (value.includes("complete")) return { bg: "#dcfce7", color: "#166534" };
  return { bg: "#e2e8f0", color: "#334155" };
}

function getSeverityTone(severity: string) {
  const value = (severity || "").toLowerCase();
  if (value.includes("high") || value.includes("major") || value.includes("critical")) {
    return { bg: "#fee2e2", color: "#991b1b" };
  }
  if (value.includes("medium")) return { bg: "#fef3c7", color: "#92400e" };
  if (value.includes("low") || value.includes("minor")) return { bg: "#dcfce7", color: "#166534" };
  return { bg: "#e2e8f0", color: "#334155" };
}

function getTypeTone(type: "NCR" | "CAPA") {
  return type === "NCR"
    ? { bg: "#dbeafe", color: "#1d4ed8", border: "#93c5fd" }
    : { bg: "#ede9fe", color: "#6d28d9", border: "#c4b5fd" };
}

function buildNextNumber(prefix: string, values: (string | null)[]) {
  const used = new Set<number>();

  values.forEach((value) => {
    if (!value) return;
    const match = value.match(/(\d+)$/);
    if (!match) return;
    used.add(Number(match[1]));
  });

  let next = 1;
  while (used.has(next)) next += 1;

  return `${prefix}-${String(next).padStart(3, "0")}`;
}

export default function NcrCapaPage() {
  const [ncrs, setNcrs] = useState<Ncr[]>([]);
  const [capas, setCapas] = useState<Capa[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeCreateTab, setActiveCreateTab] = useState<"NCR" | "CAPA">("NCR");
  const [showCreatePanel, setShowCreatePanel] = useState(true);
  const [selectedRow, setSelectedRow] = useState<CombinedRow | null>(null);
  const [refreshStamp, setRefreshStamp] = useState<string>("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [projectFilter, setProjectFilter] = useState("All");
  const [showAttentionOnly, setShowAttentionOnly] = useState(false);

  const [newNcr, setNewNcr] = useState({
    title: "",
    description: "",
    severity: "Medium",
    status: "Open",
    owner: "",
    area: "",
    due_date: "",
    project: "",
    source_type: "Internal",
  });

  const [newCapa, setNewCapa] = useState({
    title: "",
    description: "",
    status: "Open",
    owner: "",
    due_date: "",
    linked_to: "",
    project: "",
  });

  const [editRow, setEditRow] = useState<CombinedRow | null>(null);

  async function loadData() {
    setLoading(true);

    const [{ data: ncrData, error: ncrError }, { data: capaData, error: capaError }] = await Promise.all([
      supabase.from("ncrs").select("*").order("created_at", { ascending: false }),
      supabase.from("capas").select("*").order("created_at", { ascending: false }),
    ]);

    if (ncrError) console.error("Error loading NCRs:", ncrError.message);
    if (capaError) console.error("Error loading CAPAs:", capaError.message);

    setNcrs((ncrData as Ncr[]) || []);
    setCapas((capaData as Capa[]) || []);
    setRefreshStamp(new Date().toLocaleString());
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setEditRow(selectedRow);
  }, [selectedRow]);

  const combinedRows = useMemo<CombinedRow[]>(() => {
    const mappedNcrs: CombinedRow[] = ncrs.map((n) => ({
      type: "NCR",
      id: n.id,
      number: n.ncr_number || "NCR-???",
      title: n.title || "",
      description: n.description || "",
      severity: n.severity || "—",
      status: n.status || "Open",
      owner: n.owner || "",
      area: n.area || "",
      due_date: n.due_date || "",
      created_at: n.created_at || "",
      project: n.project || "",
      source_type: n.source_type || "Internal",
      linked_to: "",
    }));

    const mappedCapas: CombinedRow[] = capas.map((c) => ({
      type: "CAPA",
      id: c.id,
      number: c.capa_number || "CAPA-???",
      title: c.title || "",
      description: c.description || "",
      severity: "—",
      status: c.status || "Open",
      owner: c.owner || "",
      area: "",
      due_date: c.due_date || "",
      created_at: c.created_at || "",
      project: c.project || "",
      source_type: "",
      linked_to: c.linked_to || "",
    }));

    return [...mappedNcrs, ...mappedCapas].sort((a, b) => {
      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();
      return bTime - aTime;
    });
  }, [ncrs, capas]);

  const projectOptions = useMemo(() => {
    const values = new Set<string>();
    combinedRows.forEach((row) => {
      if (row.project?.trim()) values.add(row.project.trim());
    });
    return ["All", ...Array.from(values).sort()];
  }, [combinedRows]);

  const filteredRows = useMemo(() => {
    return combinedRows.filter((row) => {
      const q = search.trim().toLowerCase();

      const matchesSearch =
        !q ||
        row.number.toLowerCase().includes(q) ||
        row.title.toLowerCase().includes(q) ||
        row.description.toLowerCase().includes(q) ||
        row.owner.toLowerCase().includes(q) ||
        row.project.toLowerCase().includes(q) ||
        row.linked_to.toLowerCase().includes(q);

      const matchesType = typeFilter === "All" || row.type === typeFilter;
      const matchesStatus = statusFilter === "All" || row.status === statusFilter;
      const matchesSeverity = severityFilter === "All" || row.severity === severityFilter;
      const matchesSource =
        sourceFilter === "All" || (row.type === "NCR" && row.source_type === sourceFilter);
      const matchesProject = projectFilter === "All" || row.project === projectFilter;
      const attention = dueState(row.due_date) === "overdue" || row.status === "Open";
      const matchesAttention = !showAttentionOnly || attention;

      return (
        matchesSearch &&
        matchesType &&
        matchesStatus &&
        matchesSeverity &&
        matchesSource &&
        matchesProject &&
        matchesAttention
      );
    });
  }, [
    combinedRows,
    search,
    typeFilter,
    statusFilter,
    severityFilter,
    sourceFilter,
    projectFilter,
    showAttentionOnly,
  ]);

  const kpis = useMemo(() => {
    const totalNcrs = ncrs.length;
    const totalCapas = capas.length;
    const openNcrs = ncrs.filter((n) => (n.status || "").toLowerCase() === "open").length;
    const openCapas = capas.filter((c) => (c.status || "").toLowerCase() === "open").length;
    const overdue = combinedRows.filter((row) => dueState(row.due_date) === "overdue").length;
    const dueSoon = combinedRows.filter((row) => dueState(row.due_date) === "soon").length;

    return {
      totalNcrs,
      totalCapas,
      openItems: openNcrs + openCapas,
      overdue,
      dueSoon,
    };
  }, [ncrs, capas, combinedRows]);

  const attentionItems = useMemo(() => {
    return combinedRows
      .filter((row) => {
        const state = dueState(row.due_date);
        return state === "overdue" || state === "soon" || row.status === "Open";
      })
      .sort((a, b) => {
        const aState = dueState(a.due_date);
        const bState = dueState(b.due_date);
        const aRank = aState === "overdue" ? 0 : aState === "soon" ? 1 : 2;
        const bRank = bState === "overdue" ? 0 : bState === "soon" ? 1 : 2;
        return aRank - bRank;
      })
      .slice(0, 6);
  }, [combinedRows]);

  async function createNcr() {
    if (!newNcr.title.trim()) {
      alert("Please enter an NCR title.");
      return;
    }

    setSaving(true);

    const nextNumber = buildNextNumber(
      "NCR",
      ncrs.map((n) => n.ncr_number)
    );

    const { error } = await supabase.from("ncrs").insert([
      {
        ncr_number: nextNumber,
        title: newNcr.title.trim(),
        description: newNcr.description.trim() || null,
        severity: newNcr.severity,
        status: newNcr.status,
        owner: newNcr.owner.trim() || null,
        area: newNcr.area.trim() || null,
        due_date: newNcr.due_date || null,
        project: newNcr.project.trim() || null,
        source_type: newNcr.source_type,
      },
    ]);

    setSaving(false);

    if (error) {
      alert(`Error creating NCR: ${error.message}`);
      return;
    }

    setNewNcr({
      title: "",
      description: "",
      severity: "Medium",
      status: "Open",
      owner: "",
      area: "",
      due_date: "",
      project: "",
      source_type: "Internal",
    });

    await loadData();
  }

  async function createCapa() {
    if (!newCapa.title.trim()) {
      alert("Please enter a CAPA title.");
      return;
    }

    setSaving(true);

    const nextNumber = buildNextNumber(
      "CAPA",
      capas.map((c) => c.capa_number)
    );

    const { error } = await supabase.from("capas").insert([
      {
        capa_number: nextNumber,
        title: newCapa.title.trim(),
        description: newCapa.description.trim() || null,
        status: newCapa.status,
        owner: newCapa.owner.trim() || null,
        due_date: newCapa.due_date || null,
        linked_to: newCapa.linked_to.trim() || null,
        project: newCapa.project.trim() || null,
      },
    ]);

    setSaving(false);

    if (error) {
      alert(`Error creating CAPA: ${error.message}`);
      return;
    }

    setNewCapa({
      title: "",
      description: "",
      status: "Open",
      owner: "",
      due_date: "",
      linked_to: "",
      project: "",
    });

    await loadData();
  }

  async function saveEdit() {
    if (!editRow) return;

    setSaving(true);

    if (editRow.type === "NCR") {
      const { error } = await supabase
        .from("ncrs")
        .update({
          title: editRow.title || null,
          description: editRow.description || null,
          severity: editRow.severity || null,
          status: editRow.status || null,
          owner: editRow.owner || null,
          area: editRow.area || null,
          due_date: editRow.due_date || null,
          project: editRow.project || null,
          source_type: editRow.source_type || "Internal",
        })
        .eq("id", editRow.id);

      if (error) {
        setSaving(false);
        alert(`Error saving NCR: ${error.message}`);
        return;
      }
    } else {
      const { error } = await supabase
        .from("capas")
        .update({
          title: editRow.title || null,
          description: editRow.description || null,
          status: editRow.status || null,
          owner: editRow.owner || null,
          due_date: editRow.due_date || null,
          linked_to: editRow.linked_to || null,
          project: editRow.project || null,
        })
        .eq("id", editRow.id);

      if (error) {
        setSaving(false);
        alert(`Error saving CAPA: ${error.message}`);
        return;
      }
    }

    setSaving(false);
    await loadData();
    setSelectedRow(null);
    setEditRow(null);
  }

  async function deleteSelected() {
    if (!selectedRow) return;

    const confirmed = window.confirm(`Delete ${selectedRow.number}?`);
    if (!confirmed) return;

    setSaving(true);

    const table = selectedRow.type === "NCR" ? "ncrs" : "capas";
    const { error } = await supabase.from(table).delete().eq("id", selectedRow.id);

    setSaving(false);

    if (error) {
      alert(`Error deleting record: ${error.message}`);
      return;
    }

    setSelectedRow(null);
    setEditRow(null);
    await loadData();
  }

  const statusOptions = ["Open", "In Progress", "On Hold", "Closed"];
  const severityOptions = ["Low", "Medium", "High"];
  const sourceOptions = ["Internal", "Supplier", "External"];

  return (
    <div style={pageWrap}>
      <div style={shell}>
        <div style={heroCard}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
              alignItems: "flex-start",
            }}
          >
            <div style={{ maxWidth: 760 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: 0.3,
                  marginBottom: 14,
                }}
              >
                QUALITY COMMAND CENTRE
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize: 30,
                  lineHeight: 1.1,
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                }}
              >
                NCR / CAPA Register
              </h1>

              <p
                style={{
                  margin: "12px 0 0 0",
                  color: "rgba(255,255,255,0.88)",
                  fontSize: 15,
                  lineHeight: 1.6,
                  maxWidth: 700,
                }}
              >
                Joined-up working register for non-conformances and corrective actions.
                Separate records in the database, but one practical view for tracking,
                review and follow-up.
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <button style={ghostButton} onClick={() => setShowCreatePanel((prev) => !prev)}>
                {showCreatePanel ? "Hide create panel" : "Show create panel"}
              </button>
              <button style={ghostButton} onClick={loadData}>
                Refresh
              </button>
            </div>
          </div>

          <div
            style={{
              marginTop: 22,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 14,
            }}
          >
            {[
              { label: "Open items", value: kpis.openItems, accent: "#f59e0b" },
              { label: "Overdue", value: kpis.overdue, accent: "#ef4444" },
              { label: "Due in 7 days", value: kpis.dueSoon, accent: "#22c55e" },
              { label: "NCRs", value: kpis.totalNcrs, accent: "#60a5fa" },
              { label: "CAPAs", value: kpis.totalCapas, accent: "#c084fc" },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  background: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 16,
                  padding: 16,
                }}
              >
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.78)", marginBottom: 8 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#ffffff" }}>{item.value}</div>
                <div
                  style={{
                    marginTop: 10,
                    height: 5,
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.10)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      background: item.accent,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 14,
              fontSize: 12,
              color: "rgba(255,255,255,0.76)",
            }}
          >
            Last refreshed: {refreshStamp || "—"}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: showCreatePanel ? "1.25fr 0.95fr" : "1fr",
            gap: 20,
            alignItems: "start",
            marginBottom: 20,
          }}
        >
          <div style={{ ...whiteCard, padding: 22 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                alignItems: "center",
                marginBottom: 16,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={sectionLabel}>Attention board</div>
                <h2 style={{ margin: 0, fontSize: 22, color: "#0f172a", fontWeight: 400 }}>
                  Items needing eyes on
                </h2>
              </div>

              <button
                style={{
                  ...secondaryButton,
                  background: showAttentionOnly ? "#0f172a" : "#f8fafc",
                  color: showAttentionOnly ? "#ffffff" : "#0f172a",
                  borderColor: showAttentionOnly ? "#0f172a" : "#cbd5e1",
                }}
                onClick={() => setShowAttentionOnly((prev) => !prev)}
              >
                {showAttentionOnly ? "Showing attention only" : "Focus attention only"}
              </button>
            </div>

            {attentionItems.length === 0 ? (
              <div
                style={{
                  padding: 18,
                  borderRadius: 16,
                  background: "#ffffff",
                  border: "1px dashed #cbd5e1",
                  color: "#475569",
                }}
              >
                No immediate attention items.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: 14,
                }}
              >
                {attentionItems.map((item) => {
                  const state = dueState(item.due_date);
                  const typeTone = getTypeTone(item.type);

                  return (
                    <button
                      key={`${item.type}-${item.id}`}
                      onClick={() => setSelectedRow(item)}
                      style={{
                        textAlign: "left",
                        padding: 16,
                        borderRadius: 18,
                        border:
                          state === "overdue"
                            ? "1px solid #fca5a5"
                            : state === "soon"
                            ? "1px solid #fcd34d"
                            : "1px solid #dbe3ec",
                        background:
                          state === "overdue"
                            ? "#fff1f2"
                            : state === "soon"
                            ? "#fff7ed"
                            : "#ffffff",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 8,
                          alignItems: "center",
                          marginBottom: 10,
                        }}
                      >
                        <span
                          style={{
                            padding: "6px 10px",
                            borderRadius: 999,
                            background: typeTone.bg,
                            color: typeTone.color,
                            fontWeight: 800,
                            fontSize: 12,
                            border: `1px solid ${typeTone.border}`,
                          }}
                        >
                          {item.type}
                        </span>

                        <span
                          style={{
                            padding: "6px 10px",
                            borderRadius: 999,
                            background:
                              state === "overdue"
                                ? "#fee2e2"
                                : state === "soon"
                                ? "#fef3c7"
                                : getStatusTone(item.status).bg,
                            color:
                              state === "overdue"
                                ? "#991b1b"
                                : state === "soon"
                                ? "#92400e"
                                : getStatusTone(item.status).color,
                            fontWeight: 800,
                            fontSize: 12,
                          }}
                        >
                          {state === "overdue"
                            ? "Overdue"
                            : state === "soon"
                            ? "Due soon"
                            : item.status}
                        </span>
                      </div>

                      <div style={{ fontSize: 13, color: "#64748b", fontWeight: 800, marginBottom: 8 }}>
                        {item.number}
                      </div>

                      <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>
                        {item.title || "Untitled"}
                      </div>

                      <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
                        {item.project ? `Project: ${item.project}` : "No project assigned"}
                      </div>

                      <div
                        style={{
                          marginTop: 10,
                          fontSize: 13,
                          color: "#475569",
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <span>{item.owner || "No owner"}</span>
                        <span>{formatDate(item.due_date)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {showCreatePanel && (
            <div style={{ ...whiteCard, padding: 22 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                  marginBottom: 16,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={sectionLabel}>Create</div>
                  <h2 style={{ margin: 0, fontSize: 22, color: "#0f172a", fontWeight: 400 }}>
                    Add quality record
                  </h2>
                </div>

                <div
                  style={{
                    display: "inline-flex",
                    background: "#e9eef5",
                    borderRadius: 14,
                    padding: 4,
                    border: "1px solid #d3dce8",
                  }}
                >
                  <button
                    onClick={() => setActiveCreateTab("NCR")}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 800,
                      background: activeCreateTab === "NCR" ? "#2563eb" : "transparent",
                      color: activeCreateTab === "NCR" ? "#ffffff" : "#1e3a8a",
                    }}
                  >
                    New NCR
                  </button>
                  <button
                    onClick={() => setActiveCreateTab("CAPA")}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 800,
                      background: activeCreateTab === "CAPA" ? "#7c3aed" : "transparent",
                      color: activeCreateTab === "CAPA" ? "#ffffff" : "#5b21b6",
                    }}
                  >
                    New CAPA
                  </button>
                </div>
              </div>

              {activeCreateTab === "NCR" ? (
                <div
                  style={{
                    padding: 18,
                    borderRadius: 18,
                    background: "#eef4fb",
                    border: "1px solid #d3dfef",
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={labelStyle}>Title</label>
                      <input
                        style={inputStyle}
                        value={newNcr.title}
                        onChange={(e) => setNewNcr({ ...newNcr, title: e.target.value })}
                        placeholder="e.g. Weld record incomplete"
                      />
                    </div>

                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={labelStyle}>Description</label>
                      <textarea
                        style={textareaStyle}
                        value={newNcr.description}
                        onChange={(e) => setNewNcr({ ...newNcr, description: e.target.value })}
                        placeholder="Add details, evidence, impact, or context"
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Project</label>
                      <input
                        style={inputStyle}
                        value={newNcr.project}
                        onChange={(e) => setNewNcr({ ...newNcr, project: e.target.value })}
                        placeholder="Project name"
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Owner</label>
                      <input
                        style={inputStyle}
                        value={newNcr.owner}
                        onChange={(e) => setNewNcr({ ...newNcr, owner: e.target.value })}
                        placeholder="Owner"
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Severity</label>
                      <select
                        style={inputStyle}
                        value={newNcr.severity}
                        onChange={(e) => setNewNcr({ ...newNcr, severity: e.target.value })}
                      >
                        {severityOptions.map((option) => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={labelStyle}>Status</label>
                      <select
                        style={inputStyle}
                        value={newNcr.status}
                        onChange={(e) => setNewNcr({ ...newNcr, status: e.target.value })}
                      >
                        {statusOptions.map((option) => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={labelStyle}>Source type</label>
                      <select
                        style={inputStyle}
                        value={newNcr.source_type}
                        onChange={(e) => setNewNcr({ ...newNcr, source_type: e.target.value })}
                      >
                        {sourceOptions.map((option) => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={labelStyle}>Area</label>
                      <input
                        style={inputStyle}
                        value={newNcr.area}
                        onChange={(e) => setNewNcr({ ...newNcr, area: e.target.value })}
                        placeholder="Area / department"
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Due date</label>
                      <input
                        type="date"
                        style={inputStyle}
                        value={newNcr.due_date}
                        onChange={(e) => setNewNcr({ ...newNcr, due_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button style={primaryButton} onClick={createNcr} disabled={saving}>
                      {saving ? "Saving..." : "Create NCR"}
                    </button>
                    <button
                      style={secondaryButton}
                      onClick={() =>
                        setNewNcr({
                          title: "",
                          description: "",
                          severity: "Medium",
                          status: "Open",
                          owner: "",
                          area: "",
                          due_date: "",
                          project: "",
                          source_type: "Internal",
                        })
                      }
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: 18,
                    borderRadius: 18,
                    background: "#f3efff",
                    border: "1px solid #ddd6fe",
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={labelStyle}>Title</label>
                      <input
                        style={inputStyle}
                        value={newCapa.title}
                        onChange={(e) => setNewCapa({ ...newCapa, title: e.target.value })}
                        placeholder="e.g. Update inspection sign-off workflow"
                      />
                    </div>

                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={labelStyle}>Description</label>
                      <textarea
                        style={textareaStyle}
                        value={newCapa.description}
                        onChange={(e) => setNewCapa({ ...newCapa, description: e.target.value })}
                        placeholder="Add corrective / preventive action details"
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Project</label>
                      <input
                        style={inputStyle}
                        value={newCapa.project}
                        onChange={(e) => setNewCapa({ ...newCapa, project: e.target.value })}
                        placeholder="Project name"
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Owner</label>
                      <input
                        style={inputStyle}
                        value={newCapa.owner}
                        onChange={(e) => setNewCapa({ ...newCapa, owner: e.target.value })}
                        placeholder="Owner"
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Status</label>
                      <select
                        style={inputStyle}
                        value={newCapa.status}
                        onChange={(e) => setNewCapa({ ...newCapa, status: e.target.value })}
                      >
                        {statusOptions.map((option) => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={labelStyle}>Linked NCR</label>
                      <input
                        style={inputStyle}
                        value={newCapa.linked_to}
                        onChange={(e) => setNewCapa({ ...newCapa, linked_to: e.target.value })}
                        placeholder="e.g. NCR-004"
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Due date</label>
                      <input
                        type="date"
                        style={inputStyle}
                        value={newCapa.due_date}
                        onChange={(e) => setNewCapa({ ...newCapa, due_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button style={{ ...primaryButton, background: "#7c3aed" }} onClick={createCapa} disabled={saving}>
                      {saving ? "Saving..." : "Create CAPA"}
                    </button>
                    <button
                      style={secondaryButton}
                      onClick={() =>
                        setNewCapa({
                          title: "",
                          description: "",
                          status: "Open",
                          owner: "",
                          due_date: "",
                          linked_to: "",
                          project: "",
                        })
                      }
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ ...whiteCard, padding: 22 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: 18,
            }}
          >
            <div>
              <div style={sectionLabel}>Register</div>
              <h2 style={{ margin: 0, fontSize: 24, color: "#0f172a", fontWeight: 400 }}>
                Combined working register
              </h2>
            </div>

            <div style={{ fontSize: 13, color: "#64748b", fontWeight: 700 }}>
              {filteredRows.length} record{filteredRows.length === 1 ? "" : "s"} shown
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr repeat(5, minmax(120px, 1fr))",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <input
              style={inputStyle}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search number, title, owner, project, linked NCR..."
            />

            <select style={inputStyle} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option>All</option>
              <option>NCR</option>
              <option>CAPA</option>
            </select>

            <select style={inputStyle} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option>All</option>
              {statusOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>

            <select style={inputStyle} value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
              <option>All</option>
              {severityOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>

            <select style={inputStyle} value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
              <option>All</option>
              {sourceOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>

            <select style={inputStyle} value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
              {projectOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div
              style={{
                padding: 22,
                borderRadius: 16,
                background: "#ffffff",
                border: "1px dashed #cbd5e1",
                color: "#475569",
              }}
            >
              Loading NCR / CAPA records...
            </div>
          ) : filteredRows.length === 0 ? (
            <div
              style={{
                padding: 22,
                borderRadius: 16,
                background: "#ffffff",
                border: "1px dashed #cbd5e1",
                color: "#475569",
              }}
            >
              No matching records found.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1.45fr 400px", gap: 18, alignItems: "start" }}>
              <div
                style={{
                  border: "1px solid #d7dee7",
                  borderRadius: 18,
                  overflow: "hidden",
                  background: "#ffffff",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.9fr 0.9fr 0.9fr 1fr 1fr 0.8fr",
                    gap: 12,
                    padding: "14px 16px",
                    background: "#f8fafc",
                    borderBottom: "1px solid #e5e7eb",
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: 0.3,
                  }}
                >
                  <div>Record</div>
                  <div>Status</div>
                  <div>Priority</div>
                  <div>Owner</div>
                  <div>Project</div>
                  <div>Due</div>
                </div>

                <div style={{ maxHeight: 760, overflowY: "auto" }}>
                  {filteredRows.map((row) => {
                    const typeTone = getTypeTone(row.type);
                    const statusTone = getStatusTone(row.status);
                    const severityTone = getSeverityTone(row.severity);
                    const dueTone = dueState(row.due_date);
                    const active = selectedRow?.id === row.id && selectedRow?.type === row.type;

                    return (
                      <button
                        key={`${row.type}-${row.id}`}
                        onClick={() => setSelectedRow(row)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          display: "grid",
                          gridTemplateColumns: "1.9fr 0.9fr 0.9fr 1fr 1fr 0.8fr",
                          gap: 12,
                          padding: "16px",
                          border: "none",
                          borderBottom: "1px solid #eef2f7",
                          background: active ? "#eff6ff" : "#ffffff",
                          cursor: "pointer",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              alignItems: "center",
                              flexWrap: "wrap",
                              marginBottom: 8,
                            }}
                          >
                            <span
                              style={{
                                padding: "6px 10px",
                                borderRadius: 999,
                                background: typeTone.bg,
                                color: typeTone.color,
                                border: `1px solid ${typeTone.border}`,
                                fontSize: 12,
                                fontWeight: 800,
                              }}
                            >
                              {row.type}
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 800, color: "#64748b" }}>
                              {row.number}
                            </span>
                          </div>

                          <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>
                            {row.title || "Untitled"}
                          </div>

                          <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.45 }}>
                            {row.description || "No description"}
                          </div>

                          <div
                            style={{
                              display: "flex",
                              gap: 14,
                              flexWrap: "wrap",
                              marginTop: 10,
                              fontSize: 12,
                              color: "#64748b",
                            }}
                          >
                            {row.type === "NCR" && <span>Source: {row.source_type || "Internal"}</span>}
                            {row.type === "NCR" && row.area && <span>Area: {row.area}</span>}
                            {row.type === "CAPA" && row.linked_to && <span>Linked to: {row.linked_to}</span>}
                            <span>Created: {formatDate(row.created_at)}</span>
                          </div>
                        </div>

                        <div>
                          <span
                            style={{
                              padding: "7px 10px",
                              borderRadius: 999,
                              background: statusTone.bg,
                              color: statusTone.color,
                              fontSize: 12,
                              fontWeight: 800,
                              display: "inline-block",
                            }}
                          >
                            {row.status}
                          </span>
                        </div>

                        <div>
                          {row.type === "NCR" ? (
                            <span
                              style={{
                                padding: "7px 10px",
                                borderRadius: 999,
                                background: severityTone.bg,
                                color: severityTone.color,
                                fontSize: 12,
                                fontWeight: 800,
                                display: "inline-block",
                              }}
                            >
                              {row.severity}
                            </span>
                          ) : (
                            <span style={{ color: "#94a3b8", fontSize: 13 }}>—</span>
                          )}
                        </div>

                        <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 700 }}>
                          {row.owner || "—"}
                        </div>

                        <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 700 }}>
                          {row.project || "—"}
                        </div>

                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 800,
                            color:
                              dueTone === "overdue"
                                ? "#b91c1c"
                                : dueTone === "soon"
                                ? "#a16207"
                                : "#0f172a",
                          }}
                        >
                          {formatDate(row.due_date)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                style={{
                  border: "1px solid #d7dee7",
                  borderRadius: 18,
                  background: "#ffffff",
                  minHeight: 400,
                  position: "sticky",
                  top: 16,
                }}
              >
                {!selectedRow || !editRow ? (
                  <div style={{ padding: 22 }}>
                    <div style={sectionLabel}>Edit panel</div>
                    <h3 style={{ margin: 0, fontSize: 20, color: "#0f172a", fontWeight: 600 }}>
                      Select a record
                    </h3>
                    <p style={{ color: "#475569", lineHeight: 1.6 }}>
                      Click any NCR or CAPA from the register to review and edit it here.
                    </p>
                  </div>
                ) : (
                  <div style={{ padding: 22 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        alignItems: "center",
                        flexWrap: "wrap",
                        marginBottom: 14,
                      }}
                    >
                      <div>
                        <div style={sectionLabel}>Edit panel</div>
                        <h3 style={{ margin: 0, fontSize: 20, color: "#0f172a", fontWeight: 600 }}>
                          {editRow.number}
                        </h3>
                      </div>

                      <span
                        style={{
                          padding: "7px 10px",
                          borderRadius: 999,
                          background: getTypeTone(editRow.type).bg,
                          color: getTypeTone(editRow.type).color,
                          border: `1px solid ${getTypeTone(editRow.type).border}`,
                          fontWeight: 800,
                          fontSize: 12,
                        }}
                      >
                        {editRow.type}
                      </span>
                    </div>

                    <div style={{ display: "grid", gap: 12 }}>
                      <div>
                        <label style={labelStyle}>Title</label>
                        <input
                          style={inputStyle}
                          value={editRow.title}
                          onChange={(e) => setEditRow({ ...editRow, title: e.target.value })}
                        />
                      </div>

                      <div>
                        <label style={labelStyle}>Description</label>
                        <textarea
                          style={textareaStyle}
                          value={editRow.description}
                          onChange={(e) => setEditRow({ ...editRow, description: e.target.value })}
                        />
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                          <label style={labelStyle}>Status</label>
                          <select
                            style={inputStyle}
                            value={editRow.status}
                            onChange={(e) => setEditRow({ ...editRow, status: e.target.value })}
                          >
                            {statusOptions.map((option) => (
                              <option key={option}>{option}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={labelStyle}>Owner</label>
                          <input
                            style={inputStyle}
                            value={editRow.owner}
                            onChange={(e) => setEditRow({ ...editRow, owner: e.target.value })}
                          />
                        </div>

                        <div>
                          <label style={labelStyle}>Project</label>
                          <input
                            style={inputStyle}
                            value={editRow.project}
                            onChange={(e) => setEditRow({ ...editRow, project: e.target.value })}
                          />
                        </div>

                        <div>
                          <label style={labelStyle}>Due date</label>
                          <input
                            type="date"
                            style={inputStyle}
                            value={editRow.due_date ? editRow.due_date.slice(0, 10) : ""}
                            onChange={(e) => setEditRow({ ...editRow, due_date: e.target.value })}
                          />
                        </div>

                        {editRow.type === "NCR" && (
                          <>
                            <div>
                              <label style={labelStyle}>Severity</label>
                              <select
                                style={inputStyle}
                                value={editRow.severity}
                                onChange={(e) => setEditRow({ ...editRow, severity: e.target.value })}
                              >
                                {severityOptions.map((option) => (
                                  <option key={option}>{option}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label style={labelStyle}>Source type</label>
                              <select
                                style={inputStyle}
                                value={editRow.source_type}
                                onChange={(e) => setEditRow({ ...editRow, source_type: e.target.value })}
                              >
                                {sourceOptions.map((option) => (
                                  <option key={option}>{option}</option>
                                ))}
                              </select>
                            </div>

                            <div style={{ gridColumn: "1 / -1" }}>
                              <label style={labelStyle}>Area</label>
                              <input
                                style={inputStyle}
                                value={editRow.area}
                                onChange={(e) => setEditRow({ ...editRow, area: e.target.value })}
                              />
                            </div>
                          </>
                        )}

                        {editRow.type === "CAPA" && (
                          <div style={{ gridColumn: "1 / -1" }}>
                            <label style={labelStyle}>Linked NCR</label>
                            <input
                              style={inputStyle}
                              value={editRow.linked_to}
                              onChange={(e) => setEditRow({ ...editRow, linked_to: e.target.value })}
                              placeholder="e.g. NCR-002"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
                      <button style={primaryButton} onClick={saveEdit} disabled={saving}>
                        {saving ? "Saving..." : "Save changes"}
                      </button>
                      <button
                        style={secondaryButton}
                        onClick={() => {
                          setSelectedRow(null);
                          setEditRow(null);
                        }}
                      >
                        Close
                      </button>
                      <button
                        style={{
                          ...secondaryButton,
                          borderColor: "#fecaca",
                          color: "#b91c1c",
                          background: "#fff5f5",
                        }}
                        onClick={deleteSelected}
                        disabled={saving}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

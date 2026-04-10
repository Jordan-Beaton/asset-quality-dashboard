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

type ActionItem = {
  id: string;
  action_number: string | null;
  title: string | null;
  owner: string | null;
  priority: string | null;
  status: string | null;
  due_date: string | null;
};

const emptyForm = {
  action_number: "",
  title: "",
  owner: "",
  priority: "Medium",
  status: "Open",
  due_date: "",
};

export default function ActionsPage() {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [message, setMessage] = useState("Loading actions...");
  const [form, setForm] = useState(emptyForm);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);

  async function loadActions() {
    const { data, error } = await supabase
      .from("actions")
      .select("*")
      .order("action_number", { ascending: true });

    if (error) {
      setMessage(`Error: ${error.message}`);
      return;
    }

    setActions(data || []);
    setMessage(`Loaded ${data?.length ?? 0} actions successfully.`);
  }

  useEffect(() => {
    loadActions();
  }, []);

  function isOverdue(action: ActionItem) {
    if (!action.due_date) return false;
    if ((action.status || "").toLowerCase() === "closed") return false;

    const today = new Date();
    const due = new Date(action.due_date);
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    return due < today;
  }

  const openActions = actions.filter((a) => (a.status || "").toLowerCase() !== "closed").length;
  const closedActions = actions.filter((a) => (a.status || "").toLowerCase() === "closed").length;
  const overdueActions = actions.filter((a) => isOverdue(a)).length;
  const highPriorityOpen = actions.filter(
    (a) =>
      (a.priority || "").toLowerCase() === "high" &&
      (a.status || "").toLowerCase() !== "closed"
  ).length;

  const filteredActions = actions.filter((action) => {
    const lower = search.toLowerCase();

    const matchesSearch =
      !search ||
      action.action_number?.toLowerCase().includes(lower) ||
      action.title?.toLowerCase().includes(lower) ||
      action.owner?.toLowerCase().includes(lower);

    const matchesStatus = !statusFilter || action.status === statusFilter;
    const matchesPriority = !priorityFilter || action.priority === priorityFilter;
    const matchesOwner = !ownerFilter || action.owner === ownerFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesOwner;
  });

  const priorityChartData = useMemo(() => {
    const groups = actions.reduce<Record<string, number>>((acc, action) => {
      const key = action.priority || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [actions]);

  const statusChartData = useMemo(() => {
    const groups = actions.reduce<Record<string, number>>((acc, action) => {
      const key = action.status || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [actions]);

  const uniqueOwners = [...new Set(actions.map((a) => a.owner).filter(Boolean))];

  async function addAction(e: React.FormEvent) {
    e.preventDefault();

    if (!form.action_number.trim() || !form.title.trim()) {
      setMessage("Action number and title are required.");
      return;
    }

    const { error } = await supabase.from("actions").insert([
      {
        action_number: form.action_number.trim(),
        title: form.title.trim(),
        owner: form.owner || null,
        priority: form.priority,
        status: form.status,
        due_date: form.due_date || null,
      },
    ]);

    if (error) {
      setMessage(`Add action failed: ${error.message}`);
      return;
    }

    setForm(emptyForm);
    setMessage("Action added successfully.");
    await loadActions();
  }

  function startEdit(action: ActionItem) {
    setEditingId(action.id);
    setEditForm({
      action_number: action.action_number || "",
      title: action.title || "",
      owner: action.owner || "",
      priority: action.priority || "Medium",
      status: action.status || "Open",
      due_date: action.due_date || "",
    });
  }

  async function saveEdit(id: string) {
    if (!editForm.action_number.trim() || !editForm.title.trim()) {
      setMessage("Action number and title are required.");
      return;
    }

    const { error } = await supabase
      .from("actions")
      .update({
        action_number: editForm.action_number.trim(),
        title: editForm.title.trim(),
        owner: editForm.owner || null,
        priority: editForm.priority,
        status: editForm.status,
        due_date: editForm.due_date || null,
      })
      .eq("id", id);

    if (error) {
      setMessage(`Update failed: ${error.message}`);
      return;
    }

    setEditingId(null);
    setMessage("Action updated successfully.");
    await loadActions();
  }

  async function deleteAction(id: string) {
    if (!window.confirm("Delete this action?")) return;

    const { error } = await supabase.from("actions").delete().eq("id", id);

    if (error) {
      setMessage(`Delete failed: ${error.message}`);
      return;
    }

    setMessage("Action deleted successfully.");
    await loadActions();
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("");
    setPriorityFilter("");
    setOwnerFilter("");
  }

  return (
    <main>
      <section style={heroStyle}>
        <div>
          <div style={eyebrowStyle}>Action Register</div>
          <h1 style={heroTitleStyle}>Actions</h1>
          <p style={heroSubtitleStyle}>
            Track action ownership, priorities, due dates and completion status
            across the system.
          </p>
        </div>

        <div style={heroMetaWrapStyle}>
          <div style={heroMetaCardStyle}>
            <div style={heroMetaLabelStyle}>Open Actions</div>
            <div style={heroMetaValueStyle}>{openActions}</div>
          </div>
          <div style={heroMetaCardStyle}>
            <div style={heroMetaLabelStyle}>Overdue Actions</div>
            <div style={heroMetaValueStyle}>{overdueActions}</div>
          </div>
        </div>
      </section>

      <div style={{ marginBottom: "20px" }}>
        <Link href="/" style={backLinkStyle}>
          ← Back to Dashboard
        </Link>
      </div>

      <section style={statsGridStyle}>
        <StatCard title="Open Actions" value={openActions} accent="#2563eb" />
        <StatCard title="Closed Actions" value={closedActions} accent="#16a34a" />
        <StatCard title="Overdue Actions" value={overdueActions} accent="#dc2626" />
        <StatCard title="High Priority Open" value={highPriorityOpen} accent="#b91c1c" />
      </section>

      <section style={statusBannerStyle}>
        <strong>Status:</strong> {message}
      </section>

      <section style={twoColumnGridStyle}>
        <div style={panelStyle}>
          <div style={sectionHeaderRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Add Action</h2>
              <p style={sectionSubtitleStyle}>
                Create a new action record with ownership, priority and due date.
              </p>
            </div>
          </div>

          <form onSubmit={addAction}>
            <div style={formGridStyle}>
              <input
                placeholder="Action Number"
                value={form.action_number}
                onChange={(e) => setForm({ ...form, action_number: e.target.value })}
                style={inputStyle}
              />
              <input
                placeholder="Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                style={inputStyle}
              />
              <input
                placeholder="Owner"
                value={form.owner}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
                style={inputStyle}
              />
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                style={inputStyle}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                style={inputStyle}
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Closed">Closed</option>
              </select>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                style={inputStyle}
              />
            </div>

            <button type="submit" style={primaryButtonStyle}>
              Add Action
            </button>
          </form>
        </div>

        <div style={panelStyle}>
          <div style={sectionHeaderRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Action Trends</h2>
              <p style={sectionSubtitleStyle}>
                Current spread of action priority and status.
              </p>
            </div>
          </div>

          <div style={trendGridStyle}>
            <div>
              <h3 style={trendTitleStyle}>By Priority</h3>
              <div style={{ width: "100%", height: 240 }}>
                <ResponsiveContainer>
                  <BarChart data={priorityChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#2563eb" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <h3 style={trendTitleStyle}>By Status</h3>
              <div style={{ width: "100%", height: 240 }}>
                <ResponsiveContainer>
                  <BarChart data={statusChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#f97316" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={panelStyle}>
        <div style={sectionHeaderRowStyle}>
          <div>
            <h2 style={sectionTitleStyle}>Search and Filter</h2>
            <p style={sectionSubtitleStyle}>
              Narrow actions by text, status, priority or owner.
            </p>
          </div>
          <button type="button" onClick={clearFilters} style={secondaryButtonStyle}>
            Clear Filters
          </button>
        </div>

        <div style={filterBarStyle}>
          <input
            placeholder="Search action number / title / owner"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={inputStyle}
          />

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
            <option value="">All Status</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Closed">Closed</option>
          </select>

          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} style={inputStyle}>
            <option value="">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>

          <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} style={inputStyle}>
            <option value="">All Owners</option>
            {uniqueOwners.map((owner) => (
              <option key={String(owner)} value={String(owner)}>
                {String(owner)}
              </option>
            ))}
          </select>
        </div>

        <div style={tableInfoRowStyle}>
          <span>
            Showing <strong>{filteredActions.length}</strong> of <strong>{actions.length}</strong> actions
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={tableHeadStyle}>Action No.</th>
                <th style={tableHeadStyle}>Title</th>
                <th style={tableHeadStyle}>Owner</th>
                <th style={tableHeadStyle}>Priority</th>
                <th style={tableHeadStyle}>Status</th>
                <th style={tableHeadStyle}>Due Date</th>
                <th style={tableHeadStyle}>Overdue</th>
                <th style={tableHeadStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredActions.length === 0 ? (
                <tr>
                  <td colSpan={8} style={emptyTableCellStyle}>
                    No actions match the current filters.
                  </td>
                </tr>
              ) : (
                filteredActions.map((action) => (
                  <tr key={action.id}>
                    {editingId === action.id ? (
                      <>
                        <td style={tableCellStyle}>
                          <input
                            value={editForm.action_number}
                            onChange={(e) => setEditForm({ ...editForm, action_number: e.target.value })}
                            style={smallInputStyle}
                          />
                        </td>
                        <td style={tableCellStyle}>
                          <input
                            value={editForm.title}
                            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                            style={smallInputStyle}
                          />
                        </td>
                        <td style={tableCellStyle}>
                          <input
                            value={editForm.owner}
                            onChange={(e) => setEditForm({ ...editForm, owner: e.target.value })}
                            style={smallInputStyle}
                          />
                        </td>
                        <td style={tableCellStyle}>
                          <select
                            value={editForm.priority}
                            onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                            style={smallInputStyle}
                          >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                          </select>
                        </td>
                        <td style={tableCellStyle}>
                          <select
                            value={editForm.status}
                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                            style={smallInputStyle}
                          >
                            <option value="Open">Open</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Closed">Closed</option>
                          </select>
                        </td>
                        <td style={tableCellStyle}>
                          <input
                            type="date"
                            value={editForm.due_date}
                            onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                            style={smallInputStyle}
                          />
                        </td>
                        <td style={tableCellStyle}>-</td>
                        <td style={tableCellStyle}>
                          <div style={actionButtonsWrapStyle}>
                            <button type="button" onClick={() => saveEdit(action.id)} style={miniButtonStyle}>
                              Save
                            </button>
                            <button type="button" onClick={() => setEditingId(null)} style={miniButtonGreyStyle}>
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={tableCellStyle}>{action.action_number || "-"}</td>
                        <td style={tableCellStyle}>{action.title || "-"}</td>
                        <td style={tableCellStyle}>{action.owner || "-"}</td>
                        <td style={tableCellStyle}>
                          <PriorityBadge value={action.priority || "Unknown"} />
                        </td>
                        <td style={tableCellStyle}>
                          <StatusBadge value={action.status || "Unknown"} />
                        </td>
                        <td style={tableCellStyle}>{action.due_date || "-"}</td>
                        <td style={tableCellStyle}>
                          {isOverdue(action) ? <OverdueBadge /> : "-"}
                        </td>
                        <td style={tableCellStyle}>
                          <div style={actionButtonsWrapStyle}>
                            <button type="button" onClick={() => startEdit(action)} style={miniButtonStyle}>
                              Edit
                            </button>
                            <button type="button" onClick={() => deleteAction(action.id)} style={miniButtonDeleteStyle}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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

function StatusBadge({ value }: { value: string }) {
  const lower = value.toLowerCase();

  const styles =
    lower === "closed"
      ? { background: "#dcfce7", color: "#166534" }
      : lower === "open"
      ? { background: "#dbeafe", color: "#1d4ed8" }
      : lower === "in progress"
      ? { background: "#fef3c7", color: "#92400e" }
      : { background: "#e5e7eb", color: "#374151" };

  return (
    <span
      style={{
        padding: "5px 10px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 700,
        display: "inline-block",
        ...styles,
      }}
    >
      {value}
    </span>
  );
}

function PriorityBadge({ value }: { value: string }) {
  const lower = value.toLowerCase();

  const styles =
    lower === "high"
      ? { background: "#fee2e2", color: "#991b1b" }
      : lower === "medium"
      ? { background: "#fef3c7", color: "#92400e" }
      : lower === "low"
      ? { background: "#dcfce7", color: "#166534" }
      : { background: "#e5e7eb", color: "#374151" };

  return (
    <span
      style={{
        padding: "5px 10px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 700,
        display: "inline-block",
        ...styles,
      }}
    >
      {value}
    </span>
  );
}

function OverdueBadge() {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "6px 10px",
        borderRadius: "999px",
        background: "#fee2e2",
        color: "#991b1b",
        fontWeight: 700,
        fontSize: "12px",
      }}
    >
      Overdue
    </span>
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
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
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

const formGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "12px",
  marginBottom: "12px",
};

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  minWidth: "180px",
  background: "white",
  color: "#0f172a",
};

const smallInputStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  width: "100%",
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

const miniButtonGreyStyle: React.CSSProperties = {
  background: "#64748b",
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

const trendGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "16px",
};

const trendTitleStyle: React.CSSProperties = {
  marginTop: 0,
  marginBottom: "8px",
  fontSize: "16px",
  color: "#0f172a",
};

const filterBarStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1fr 1fr",
  gap: "12px",
  marginBottom: "16px",
};

const tableInfoRowStyle: React.CSSProperties = {
  marginBottom: "12px",
  color: "#475569",
  fontSize: "14px",
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
  verticalAlign: "middle",
};

const emptyTableCellStyle: React.CSSProperties = {
  padding: "24px 10px",
  textAlign: "center",
  color: "#64748b",
};

const actionButtonsWrapStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};
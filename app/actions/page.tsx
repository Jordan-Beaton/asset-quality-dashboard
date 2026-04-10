"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { supabase } from "../../src/lib/supabase";

type ActionItem = {
  id: string;
  action_number: string | null;
  title: string | null;
  project: string | null;
  owner: string | null;
  priority: string | null;
  status: string | null;
  due_date: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ActionForm = {
  title: string;
  project: string;
  owner: string;
  priority: string;
  status: string;
  due_date: string;
};

const emptyForm: ActionForm = {
  title: "",
  project: "",
  owner: "",
  priority: "Medium",
  status: "Open",
  due_date: "",
};

function normaliseStatus(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function isClosedLikeStatus(value: string | null | undefined) {
  const status = normaliseStatus(value);
  return status === "closed" || status === "complete" || status === "completed";
}

function extractActionNumber(value: string | null | undefined) {
  if (!value) return null;

  const match = value.match(/(\d+)/);
  if (!match) return null;

  const num = Number(match[1]);
  return Number.isNaN(num) ? null : num;
}

function formatActionNumber(num: number) {
  return `ACT-${String(num).padStart(3, "0")}`;
}

function getNextAvailableActionNumber(actions: ActionItem[]) {
  const used = new Set(
    actions
      .map((action) => extractActionNumber(action.action_number))
      .filter((num): num is number => num !== null && num > 0)
  );

  let next = 1;
  while (used.has(next)) {
    next += 1;
  }

  return formatActionNumber(next);
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

function isOverdue(action: ActionItem) {
  if (!action.due_date) return false;
  if (isClosedLikeStatus(action.status)) return false;

  const days = getDaysFromToday(action.due_date);
  return days !== null && days < 0;
}

function getDueLabel(value: string | null | undefined) {
  const days = getDaysFromToday(value);

  if (days === null) return "-";
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

export default function ActionsPage() {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [message, setMessage] = useState("Loading actions...");
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const [form, setForm] = useState<ActionForm>(emptyForm);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ActionForm>(emptyForm);

  async function loadActions(showLoadedMessage = true) {
    setIsLoading(true);

    const { data, error } = await supabase.from("actions").select("*");

    if (error) {
      setMessage(`Error: ${error.message}`);
      setIsLoading(false);
      return;
    }

    const sorted = [...(data || [])].sort((a, b) => {
      const aNum = extractActionNumber(a.action_number);
      const bNum = extractActionNumber(b.action_number);

      if (aNum !== null && bNum !== null) return aNum - bNum;
      if (aNum !== null) return -1;
      if (bNum !== null) return 1;

      return (a.action_number || "").localeCompare(b.action_number || "");
    });

    setActions(sorted);
    setLastRefreshed(new Date());
    setIsLoading(false);

    if (showLoadedMessage) {
      setMessage(`Loaded ${sorted.length} action${sorted.length === 1 ? "" : "s"} successfully.`);
    }
  }

  useEffect(() => {
    loadActions();
  }, []);

  const nextActionNumber = useMemo(() => {
    return getNextAvailableActionNumber(actions);
  }, [actions]);

  const openActions = actions.filter((a) => !isClosedLikeStatus(a.status)).length;
  const closedActions = actions.filter((a) => isClosedLikeStatus(a.status)).length;
  const overdueActions = actions.filter((a) => isOverdue(a)).length;
  const highPriorityOpen = actions.filter(
    (a) =>
      (a.priority || "").toLowerCase() === "high" && !isClosedLikeStatus(a.status)
  ).length;

  const dueThisWeek = actions.filter((a) => {
    if (!a.due_date) return false;
    if (isClosedLikeStatus(a.status)) return false;

    const days = getDaysFromToday(a.due_date);
    return days !== null && days >= 0 && days <= 7;
  }).length;

  const filteredActions = useMemo(() => {
    const lower = search.toLowerCase();

    return actions.filter((action) => {
      const matchesSearch =
        !search ||
        (action.action_number || "").toLowerCase().includes(lower) ||
        (action.title || "").toLowerCase().includes(lower) ||
        (action.project || "").toLowerCase().includes(lower) ||
        (action.owner || "").toLowerCase().includes(lower);

      const matchesStatus = !statusFilter || (action.status || "") === statusFilter;
      const matchesPriority = !priorityFilter || (action.priority || "") === priorityFilter;
      const matchesOwner = !ownerFilter || (action.owner || "") === ownerFilter;
      const matchesProject = !projectFilter || (action.project || "") === projectFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesOwner &&
        matchesProject
      );
    });
  }, [actions, search, statusFilter, priorityFilter, ownerFilter, projectFilter]);

  const overdueList = useMemo(() => {
    return [...actions]
      .filter((action) => isOverdue(action))
      .sort((a, b) => {
        const aDate = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        const bDate = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
      })
      .slice(0, 5);
  }, [actions]);

  const dueSoonList = useMemo(() => {
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
      .slice(0, 5);
  }, [actions]);

  const uniqueOwners = useMemo(() => {
    return [...new Set(actions.map((a) => a.owner).filter(Boolean))].sort();
  }, [actions]);

  const uniqueProjects = useMemo(() => {
    return [...new Set(actions.map((a) => a.project).filter(Boolean))].sort();
  }, [actions]);

  async function addAction(e: React.FormEvent) {
    e.preventDefault();

    if (!form.title.trim()) {
      setMessage("Title is required.");
      return;
    }

    const actionNumberToUse = getNextAvailableActionNumber(actions);

    const { error } = await supabase.from("actions").insert([
      {
        action_number: actionNumberToUse,
        title: form.title.trim(),
        project: form.project.trim() || null,
        owner: form.owner.trim() || null,
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
    setMessage(`Action ${actionNumberToUse} added successfully.`);
    await loadActions(false);
  }

  function startEdit(action: ActionItem) {
    setEditingId(action.id);
    setEditForm({
      title: action.title || "",
      project: action.project || "",
      owner: action.owner || "",
      priority: action.priority || "Medium",
      status: action.status || "Open",
      due_date: action.due_date || "",
    });
  }

  async function saveEdit(id: string) {
    if (!editForm.title.trim()) {
      setMessage("Title is required.");
      return;
    }

    const { error } = await supabase
      .from("actions")
      .update({
        title: editForm.title.trim(),
        project: editForm.project.trim() || null,
        owner: editForm.owner.trim() || null,
        priority: editForm.priority,
        status: editForm.status,
        due_date: editForm.due_date || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      setMessage(`Update failed: ${error.message}`);
      return;
    }

    setEditingId(null);
    setMessage("Action updated successfully.");
    await loadActions(false);
  }

  async function deleteAction(id: string) {
    if (!window.confirm("Delete this action?")) return;

    const { error } = await supabase.from("actions").delete().eq("id", id);

    if (error) {
      setMessage(`Delete failed: ${error.message}`);
      return;
    }

    setMessage("Action deleted successfully.");
    await loadActions(false);
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("");
    setPriorityFilter("");
    setOwnerFilter("");
    setProjectFilter("");
  }

  return (
    <main>
      <section style={heroStyle}>
        <div style={{ flex: "1 1 620px" }}>
          <div style={eyebrowStyle}>Action Register</div>
          <h1 style={heroTitleStyle}>Actions</h1>
          <p style={heroSubtitleStyle}>
            Track ownership, due dates, priorities and progress in one place.
            Built for real follow-up, not just record keeping.
          </p>

          <div style={priorityStripStyle}>
            <HeroPill
              label="Open"
              value={openActions}
              tone={openActions > 0 ? "blue" : "neutral"}
            />
            <HeroPill
              label="Overdue"
              value={overdueActions}
              tone={overdueActions > 0 ? "red" : "green"}
            />
            <HeroPill
              label="Due This Week"
              value={dueThisWeek}
              tone={dueThisWeek > 0 ? "amber" : "green"}
            />
            <HeroPill
              label="High Priority Open"
              value={highPriorityOpen}
              tone={highPriorityOpen > 0 ? "red" : "green"}
            />
          </div>
        </div>

        <div style={heroMetaWrapStyle}>
          <div style={heroMetaCardStyle}>
            <div style={heroMetaLabelStyle}>Next Action Number</div>
            <div style={heroMetaValueStyle}>{nextActionNumber}</div>
          </div>

          <div style={heroMetaCardStyle}>
            <div style={heroMetaLabelStyle}>Last Refreshed</div>
            <div style={heroMetaValueStyleSmall}>
              {isLoading ? "Loading..." : formatDateTime(lastRefreshed?.toISOString())}
            </div>
          </div>

          <div style={heroMetaCardStyle}>
            <div style={heroMetaLabelStyle}>Current View</div>
            <div style={heroMetaValueStyleSmall}>
              {filteredActions.length} shown / {actions.length} total
            </div>
          </div>

          <div style={heroMetaCardStyle}>
            <div style={heroMetaLabelStyle}>Closed / Complete</div>
            <div style={heroMetaValueStyleSmall}>{closedActions}</div>
          </div>
        </div>
      </section>

      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
        <Link href="/" style={backLinkStyle}>
          ← Back to Dashboard
        </Link>

        <div style={statusBannerStyleInline}>
          <strong>Status:</strong> {message}
        </div>
      </div>

      <section style={statsGridStyle}>
        <StatCard title="Open Actions" value={openActions} accent="#2563eb" />
        <StatCard title="Closed / Complete" value={closedActions} accent="#16a34a" />
        <StatCard title="Overdue Actions" value={overdueActions} accent="#dc2626" />
        <StatCard title="Due This Week" value={dueThisWeek} accent="#f59e0b" />
      </section>

      <section style={twoColumnGridStyle}>
        <SectionCard
          title="Create Action"
          subtitle="Add a new action with automatic numbering and project tracking."
        >
          <form onSubmit={addAction}>
            <div style={formGridStyle}>
              <Field label="Action Number">
                <input value={nextActionNumber} readOnly style={readOnlyInputStyle} />
              </Field>

              <Field label="Project">
                <input
                  placeholder="e.g. Wadden Sea"
                  value={form.project}
                  onChange={(e) => setForm({ ...form, project: e.target.value })}
                  style={inputStyle}
                />
              </Field>

              <Field label="Title">
                <input
                  placeholder="Enter action title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  style={inputStyle}
                />
              </Field>

              <Field label="Owner">
                <input
                  placeholder="Enter owner"
                  value={form.owner}
                  onChange={(e) => setForm({ ...form, owner: e.target.value })}
                  style={inputStyle}
                />
              </Field>

              <Field label="Priority">
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  style={inputStyle}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </Field>

              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  style={inputStyle}
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Closed">Closed</option>
                  <option value="Complete">Complete</option>
                </select>
              </Field>

              <Field label="Due Date">
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  style={inputStyle}
                />
              </Field>
            </div>

            <div style={formFooterStyle}>
              <button type="submit" style={primaryButtonStyle}>
                Add Action
              </button>
              <span style={helperTextStyle}>
                Numbering fills the next available slot automatically.
              </span>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title="Priority View"
          subtitle="What needs chasing right now."
        >
          <div style={listGridStyle}>
            <MiniListCard
              title="Overdue First"
              emptyText="No overdue open actions."
              items={overdueList.map((action) => ({
                id: action.id,
                line1: `${action.action_number || "-"} — ${action.title || "Untitled action"}`,
                line2: `${action.project || "No project"} · ${action.owner || "No owner"} · ${getDueLabel(action.due_date)}`,
                tone: "red" as const,
              }))}
            />

            <MiniListCard
              title="Due This Week"
              emptyText="No open actions due this week."
              items={dueSoonList.map((action) => ({
                id: action.id,
                line1: `${action.action_number || "-"} — ${action.title || "Untitled action"}`,
                line2: `${action.project || "No project"} · ${action.owner || "No owner"} · ${getDueLabel(action.due_date)}`,
                tone: "amber" as const,
              }))}
            />
          </div>
        </SectionCard>
      </section>

      <SectionCard
        title="Search and Filter"
        subtitle="Narrow the register by text, status, priority, owner or project."
        action={
          <button type="button" onClick={clearFilters} style={secondaryButtonStyle}>
            Clear Filters
          </button>
        }
      >
        <div style={filterBarStyle}>
          <input
            placeholder="Search action no. / title / project / owner"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={inputStyle}
          />

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
            <option value="">All Status</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Closed">Closed</option>
            <option value="Complete">Complete</option>
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

          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} style={inputStyle}>
            <option value="">All Projects</option>
            {uniqueProjects.map((project) => (
              <option key={String(project)} value={String(project)}>
                {String(project)}
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
                <th style={tableHeadStyle}>Project</th>
                <th style={tableHeadStyle}>Owner</th>
                <th style={tableHeadStyle}>Priority</th>
                <th style={tableHeadStyle}>Status</th>
                <th style={tableHeadStyle}>Due Date</th>
                <th style={tableHeadStyle}>Updated</th>
                <th style={tableHeadStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredActions.length === 0 ? (
                <tr>
                  <td colSpan={9} style={emptyTableCellStyle}>
                    No actions match the current filters.
                  </td>
                </tr>
              ) : (
                filteredActions.map((action) => {
                  const overdue = isOverdue(action);

                  return (
                    <tr
                      key={action.id}
                      style={{
                        ...tableRowStyle,
                        background: overdue ? "#fff7f7" : "white",
                      }}
                    >
                      {editingId === action.id ? (
                        <>
                          <td style={tableCellStyle}>
                            <div style={readOnlyTableCellStyle}>{action.action_number || "-"}</div>
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
                              value={editForm.project}
                              onChange={(e) => setEditForm({ ...editForm, project: e.target.value })}
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
                              <option value="Complete">Complete</option>
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
                          <td style={tableCellStyle}>{formatDateTime(action.updated_at || action.created_at)}</td>
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
                          <td style={tableCellStyle}>
                            <div style={actionNumberCellStyle}>{action.action_number || "-"}</div>
                          </td>
                          <td style={tableCellStyle}>
                            <div style={primaryCellTextStyle}>{action.title || "-"}</div>
                            <div style={secondaryCellTextStyle}>
                              {overdue ? getDueLabel(action.due_date) : " "}
                            </div>
                          </td>
                          <td style={tableCellStyle}>{action.project || "-"}</td>
                          <td style={tableCellStyle}>{action.owner || "-"}</td>
                          <td style={tableCellStyle}>
                            <PriorityBadge value={action.priority || "Unknown"} />
                          </td>
                          <td style={tableCellStyle}>
                            <StatusBadge value={action.status || "Unknown"} />
                          </td>
                          <td style={tableCellStyle}>
                            <div style={primaryCellTextStyle}>{formatDate(action.due_date)}</div>
                            <div
                              style={{
                                ...secondaryCellTextStyle,
                                color: overdue ? "#b91c1c" : "#64748b",
                                fontWeight: overdue ? 700 : 500,
                              }}
                            >
                              {getDueLabel(action.due_date)}
                            </div>
                          </td>
                          <td style={tableCellStyle}>
                            {formatDateTime(action.updated_at || action.created_at)}
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label style={fieldWrapStyle}>
      <span style={fieldLabelStyle}>{label}</span>
      {children}
    </label>
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
        {action || null}
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
    <div
      style={{
        ...statCardStyle,
        borderTop: `4px solid ${accent}`,
      }}
    >
      <div style={statCardLabelStyle}>{title}</div>
      <div style={statCardValueStyle}>{value}</div>
    </div>
  );
}

function HeroPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "amber" | "red" | "blue" | "neutral";
}) {
  const tones = {
    green: { bg: "rgba(220,252,231,0.15)", border: "rgba(220,252,231,0.26)", text: "#dcfce7" },
    amber: { bg: "rgba(254,243,199,0.15)", border: "rgba(254,243,199,0.28)", text: "#fef3c7" },
    red: { bg: "rgba(254,226,226,0.15)", border: "rgba(254,226,226,0.28)", text: "#fee2e2" },
    blue: { bg: "rgba(219,234,254,0.15)", border: "rgba(219,234,254,0.28)", text: "#dbeafe" },
    neutral: { bg: "rgba(255,255,255,0.12)", border: "rgba(255,255,255,0.20)", text: "#ffffff" },
  };

  const colours = tones[tone];

  return (
    <div
      style={{
        ...heroPillStyle,
        background: colours.bg,
        border: `1px solid ${colours.border}`,
      }}
    >
      <div style={heroPillLabelStyle}>{label}</div>
      <div style={{ ...heroPillValueStyle, color: colours.text }}>{value}</div>
    </div>
  );
}

function MiniListCard({
  title,
  emptyText,
  items,
}: {
  title: string;
  emptyText: string;
  items: Array<{
    id: string;
    line1: string;
    line2: string;
    tone: "red" | "amber";
  }>;
}) {
  return (
    <div style={miniListCardStyle}>
      <h3 style={miniListTitleStyle}>{title}</h3>

      {items.length === 0 ? (
        <p style={emptyTextStyle}>{emptyText}</p>
      ) : (
        <div style={miniListWrapStyle}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                ...miniListItemStyle,
                borderLeft: item.tone === "red" ? "4px solid #dc2626" : "4px solid #f59e0b",
                background: item.tone === "red" ? "#fef2f2" : "#fffbeb",
              }}
            >
              <div style={miniListLine1Style}>{item.line1}</div>
              <div style={miniListLine2Style}>{item.line2}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  const lower = normaliseStatus(value);

  const styles =
    lower === "closed" || lower === "complete" || lower === "completed"
      ? { background: "#dcfce7", color: "#166534" }
      : lower === "open"
      ? { background: "#dbeafe", color: "#1d4ed8" }
      : lower === "in progress"
      ? { background: "#fef3c7", color: "#92400e" }
      : { background: "#e5e7eb", color: "#374151" };

  return (
    <span style={{ ...badgeStyle, ...styles }}>
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
    <span style={{ ...badgeStyle, ...styles }}>
      {value}
    </span>
  );
}

const heroStyle: CSSProperties = {
  background: "linear-gradient(135deg, #0f766e 0%, #115e59 100%)",
  color: "white",
  borderRadius: "22px",
  padding: "28px 30px",
  marginBottom: "24px",
  boxShadow: "0 10px 30px rgba(15, 118, 110, 0.14)",
  display: "flex",
  justifyContent: "space-between",
  gap: "24px",
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const eyebrowStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  opacity: 0.8,
  marginBottom: "10px",
};

const heroTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "34px",
  lineHeight: 1.08,
};

const heroSubtitleStyle: CSSProperties = {
  marginTop: "10px",
  marginBottom: 0,
  fontSize: "16px",
  maxWidth: "760px",
  color: "rgba(255,255,255,0.92)",
};

const priorityStripStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "12px",
  marginTop: "18px",
};

const heroPillStyle: CSSProperties = {
  borderRadius: "14px",
  padding: "12px 14px",
  minHeight: "82px",
};

const heroPillLabelStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  color: "rgba(255,255,255,0.88)",
  marginBottom: "8px",
};

const heroPillValueStyle: CSSProperties = {
  fontSize: "26px",
  fontWeight: 800,
};

const heroMetaWrapStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(180px, 1fr))",
  gap: "12px",
  minWidth: "340px",
  flex: "1 1 340px",
};

const heroMetaCardStyle: CSSProperties = {
  background: "rgba(255,255,255,0.10)",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: "14px",
  padding: "14px 16px",
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

const backLinkStyle: CSSProperties = {
  color: "#0f766e",
  fontWeight: 700,
  textDecoration: "none",
};

const statusBannerStyleInline: CSSProperties = {
  background: "white",
  borderRadius: "12px",
  padding: "12px 16px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
  color: "#0f172a",
};

const statsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "16px",
  marginBottom: "20px",
};

const statCardStyle: CSSProperties = {
  background: "white",
  borderRadius: "16px",
  padding: "18px 20px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
};

const statCardLabelStyle: CSSProperties = {
  fontSize: "13px",
  color: "#64748b",
  fontWeight: 600,
};

const statCardValueStyle: CSSProperties = {
  fontSize: "34px",
  fontWeight: 700,
  color: "#0f172a",
  marginTop: "8px",
};

const twoColumnGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.15fr 0.85fr",
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

const fieldWrapStyle: CSSProperties = {
  display: "grid",
  gap: "6px",
};

const fieldLabelStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 700,
  color: "#334155",
};

const formGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "14px",
};

const inputStyle: CSSProperties = {
  padding: "11px 12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  background: "white",
  color: "#0f172a",
  width: "100%",
};

const readOnlyInputStyle: CSSProperties = {
  padding: "11px 12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  background: "#f8fafc",
  color: "#334155",
  width: "100%",
  fontWeight: 700,
};

const smallInputStyle: CSSProperties = {
  padding: "8px 10px",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  width: "100%",
  background: "white",
  color: "#0f172a",
};

const formFooterStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
  marginTop: "16px",
};

const helperTextStyle: CSSProperties = {
  color: "#64748b",
  fontSize: "13px",
};

const primaryButtonStyle: CSSProperties = {
  background: "#0f766e",
  color: "white",
  border: "none",
  padding: "11px 16px",
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

const miniButtonStyle: CSSProperties = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};

const miniButtonGreyStyle: CSSProperties = {
  background: "#64748b",
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

const listGridStyle: CSSProperties = {
  display: "grid",
  gap: "16px",
};

const miniListCardStyle: CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  padding: "14px",
};

const miniListTitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: "12px",
  fontSize: "16px",
  color: "#0f172a",
};

const miniListWrapStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
};

const miniListItemStyle: CSSProperties = {
  borderRadius: "12px",
  padding: "12px 14px",
};

const miniListLine1Style: CSSProperties = {
  fontWeight: 700,
  color: "#0f172a",
  fontSize: "14px",
};

const miniListLine2Style: CSSProperties = {
  color: "#64748b",
  fontSize: "13px",
  marginTop: "4px",
  lineHeight: 1.45,
};

const filterBarStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
  gap: "12px",
  marginBottom: "16px",
};

const tableInfoRowStyle: CSSProperties = {
  marginBottom: "12px",
  color: "#475569",
  fontSize: "14px",
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
  transition: "background 0.2s ease",
};

const tableCellStyle: CSSProperties = {
  padding: "14px 10px",
  borderBottom: "1px solid #f1f5f9",
  color: "#0f172a",
  verticalAlign: "middle",
};

const primaryCellTextStyle: CSSProperties = {
  fontWeight: 600,
  color: "#0f172a",
};

const secondaryCellTextStyle: CSSProperties = {
  fontSize: "12px",
  color: "#64748b",
  marginTop: "4px",
};

const actionNumberCellStyle: CSSProperties = {
  fontWeight: 800,
  color: "#0f766e",
  whiteSpace: "nowrap",
};

const readOnlyTableCellStyle: CSSProperties = {
  padding: "8px 10px",
  borderRadius: "8px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  fontWeight: 700,
  color: "#334155",
};

const emptyTableCellStyle: CSSProperties = {
  padding: "24px 10px",
  textAlign: "center",
  color: "#64748b",
};

const actionButtonsWrapStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const badgeStyle: CSSProperties = {
  padding: "5px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 700,
  display: "inline-block",
  whiteSpace: "nowrap",
};

const emptyTextStyle: CSSProperties = {
  color: "#64748b",
  margin: 0,
};
"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { QualityKpiCard } from "../../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../../src/components/QualityPageHero";
import {
  ImsButton,
  ImsFilterPanel,
  ImsPanel,
  ImsTabs,
  ImsTopMetaRow,
} from "../../../src/components/ImsPrimitives";
import {
  imsColours,
  imsInputStyle,
  imsTableCellStyle,
  imsTableHeadStyle,
  imsTableInfoRowStyle,
  imsTableStyle,
} from "../../../src/components/imsTheme";
import { supabase } from "../../../src/lib/supabase";

export const dynamic = "force-dynamic";

type CalendarView = "dashboard" | "calendar" | "register" | "create";

type PlannerItem = {
  id: string;
  title: string;
  description: string | null;
  planner_type: string | null;
  inspection_form_ref: string | null;
  inspection_form_title: string | null;
  assigned_to: string | null;
  assigned_person_id: string | null;
  frequency: string | null;
  due_date: string | null;
  next_due_date: string | null;
  last_completed_date: string | null;
  reminder_days: number | null;
  status: string | null;
  priority: string | null;
  location: string | null;
  project_work_scope: string | null;
  notes: string | null;
  linked_inspection_id: string | null;
  linked_inspection_number: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type PersonOption = {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  department: string | null;
  active?: boolean | null;
};

type PlannerForm = {
  title: string;
  description: string;
  planner_type: string;
  inspection_form_ref: string;
  inspection_form_title: string;
  assigned_to: string;
  assigned_person_id: string;
  frequency: string;
  due_date: string;
  next_due_date: string;
  last_completed_date: string;
  reminder_days: string;
  status: string;
  priority: string;
  location: string;
  project_work_scope: string;
  notes: string;
  linked_inspection_id: string;
  linked_inspection_number: string;
};

const viewTabs: Array<{ value: CalendarView; label: string }> = [
  { value: "dashboard", label: "Dashboard" },
  { value: "calendar", label: "Calendar" },
  { value: "register", label: "Planner Register" },
  { value: "create", label: "Create Task" },
];

const inspectionForms = [
  {
    ref: "ENS-HSEQ-FRM-046",
    title: "Vessel Pre-Sail Inspection",
    revision: "Rev B",
    revisionDate: "08 Feb 2024",
  },
  {
    ref: "ENS-HSEQ-FRM-041",
    title: "Workplace Inspection - Office",
    revision: "Rev B",
    revisionDate: "23 Feb 2024",
  },
  {
    ref: "ENS-HSEQ-FRM-042",
    title: "Workplace Inspection - Offshore",
    revision: "Rev B",
    revisionDate: "10 Aug 2023",
  },
  {
    ref: "ENS-HSEQ-FRM-043",
    title: "Workplace Inspection - Mobilisation",
    revision: "Rev B",
    revisionDate: "Not stated",
  },
  {
    ref: "ENS-HSEQ-FRM-044",
    title: "Workplace Inspection - Base and Site",
    revision: "Rev E",
    revisionDate: "19 May 2026",
  },
  {
    ref: "ENS-HSEQ-FRM-045",
    title: "Workplace Inspection - Dropped Objects",
    revision: "Rev B",
    revisionDate: "Not stated",
  },
];

const hseTeamNames = ["Peter Ridley", "John Fender", "Blerim Azizaj", "Les Middleton"];
const frequencyOptions = ["One-off", "Weekly", "Monthly", "6-monthly", "Yearly"];
const statusOptions = ["Scheduled", "Due Soon", "Overdue", "Complete", "Paused"];
const priorityOptions = ["Low", "Medium", "High"];

const emptyForm: PlannerForm = {
  title: "",
  description: "",
  planner_type: "Inspection",
  inspection_form_ref: "",
  inspection_form_title: "",
  assigned_to: "",
  assigned_person_id: "",
  frequency: "Yearly",
  due_date: "",
  next_due_date: "",
  last_completed_date: "",
  reminder_days: "14",
  status: "Scheduled",
  priority: "Medium",
  location: "",
  project_work_scope: "",
  notes: "",
  linked_inspection_id: "",
  linked_inspection_number: "",
};

function todayKey() {
  return toDateKey(new Date());
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string | null | undefined) {
  if (!value) return null;
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function displayDate(value: string | null | undefined) {
  const date = parseDateKey(value);
  return date ? date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";
}

function displayDateTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function dueKey(item: Pick<PlannerItem, "next_due_date" | "due_date">) {
  return item.next_due_date || item.due_date || "";
}

function daysUntil(value: string | null | undefined) {
  const date = parseDateKey(value);
  if (!date) return null;
  const start = parseDateKey(todayKey());
  if (!start) return null;
  return Math.ceil((date.getTime() - start.getTime()) / 86400000);
}

function effectiveStatus(item: PlannerItem) {
  const stored = item.status || "Scheduled";
  if (stored === "Complete" || stored === "Paused") return stored;
  const diff = daysUntil(dueKey(item));
  if (diff === null) return stored;
  if (diff < 0) return "Overdue";
  if (diff <= 7) return "Due Soon";
  return stored;
}

function addFrequency(dateKey: string, frequency: string | null | undefined) {
  const date = parseDateKey(dateKey);
  if (!date) return "";
  const next = new Date(date);
  if (frequency === "Weekly") next.setDate(next.getDate() + 7);
  else if (frequency === "Monthly") next.setMonth(next.getMonth() + 1);
  else if (frequency === "6-monthly") next.setMonth(next.getMonth() + 6);
  else if (frequency === "Yearly") next.setFullYear(next.getFullYear() + 1);
  else return dateKey;
  return toDateKey(next);
}

function formFromItem(item: PlannerItem): PlannerForm {
  return {
    title: item.title || "",
    description: item.description || "",
    planner_type: item.planner_type || "Inspection",
    inspection_form_ref: item.inspection_form_ref || "",
    inspection_form_title: item.inspection_form_title || "",
    assigned_to: item.assigned_to || "",
    assigned_person_id: item.assigned_person_id || "",
    frequency: item.frequency || "Yearly",
    due_date: item.due_date || "",
    next_due_date: item.next_due_date || "",
    last_completed_date: item.last_completed_date || "",
    reminder_days: item.reminder_days === null || item.reminder_days === undefined ? "14" : String(item.reminder_days),
    status: item.status || "Scheduled",
    priority: item.priority || "Medium",
    location: item.location || "",
    project_work_scope: item.project_work_scope || "",
    notes: item.notes || "",
    linked_inspection_id: item.linked_inspection_id || "",
    linked_inspection_number: item.linked_inspection_number || "",
  };
}

function clean(value: string) {
  return value.trim();
}

function payloadFromForm(form: PlannerForm) {
  return {
    title: clean(form.title),
    description: clean(form.description) || null,
    planner_type: clean(form.planner_type) || "Inspection",
    inspection_form_ref: clean(form.inspection_form_ref) || null,
    inspection_form_title: clean(form.inspection_form_title) || null,
    assigned_to: clean(form.assigned_to) || null,
    assigned_person_id: clean(form.assigned_person_id) || null,
    frequency: clean(form.frequency) || "One-off",
    due_date: clean(form.due_date) || null,
    next_due_date: clean(form.next_due_date) || clean(form.due_date) || null,
    last_completed_date: clean(form.last_completed_date) || null,
    reminder_days: Number.parseInt(form.reminder_days, 10) || 0,
    status: clean(form.status) || "Scheduled",
    priority: clean(form.priority) || "Medium",
    location: clean(form.location) || null,
    project_work_scope: clean(form.project_work_scope) || null,
    notes: clean(form.notes) || null,
    linked_inspection_id: clean(form.linked_inspection_id) || null,
    linked_inspection_number: clean(form.linked_inspection_number) || null,
    updated_at: new Date().toISOString(),
  };
}

function accentForStatus(status: string) {
  if (status === "Overdue") return imsColours.dangerBright;
  if (status === "Due Soon") return imsColours.warning;
  if (status === "Complete") return imsColours.success;
  if (status === "Paused") return imsColours.muted;
  return imsColours.blue;
}

export default function HseCalendarPage() {
  const [items, setItems] = useState<PlannerItem[]>([]);
  const [people, setPeople] = useState<PersonOption[]>([]);
  const [activeView, setActiveView] = useState<CalendarView>("dashboard");
  const [message, setMessage] = useState("Loading HSE calendar...");
  const [loading, setLoading] = useState(false);
  const [refreshStamp, setRefreshStamp] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [createForm, setCreateForm] = useState<PlannerForm>(emptyForm);
  const [detailForm, setDetailForm] = useState<PlannerForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [frequencyFilter, setFrequencyFilter] = useState("");
  const [formFilter, setFormFilter] = useState("");
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const selected = useMemo(() => items.find((item) => item.id === selectedId) || null, [items, selectedId]);

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (selected) setDetailForm(formFromItem(selected));
  }, [selected]);

  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const peopleByName = useMemo(() => new Map(people.map((person) => [person.name, person])), [people]);

  const filteredItems = useMemo(() => {
    const text = search.trim().toLowerCase();
    return items.filter((item) => {
      const status = effectiveStatus(item);
      if (statusFilter && status !== statusFilter) return false;
      if (ownerFilter && item.assigned_to !== ownerFilter) return false;
      if (frequencyFilter && item.frequency !== frequencyFilter) return false;
      if (formFilter && item.inspection_form_ref !== formFilter) return false;
      if (!text) return true;
      return [
        item.title,
        item.description,
        item.assigned_to,
        item.inspection_form_ref,
        item.inspection_form_title,
        item.location,
        item.project_work_scope,
      ]
        .join(" ")
        .toLowerCase()
        .includes(text);
    });
  }, [frequencyFilter, formFilter, items, ownerFilter, search, statusFilter]);

  const sortedItems = useMemo(
    () => [...filteredItems].sort((a, b) => (dueKey(a) || "9999-12-31").localeCompare(dueKey(b) || "9999-12-31")),
    [filteredItems],
  );

  const kpis = useMemo(() => {
    const open = items.filter((item) => !["Complete", "Paused"].includes(effectiveStatus(item)));
    return {
      scheduled: open.filter((item) => effectiveStatus(item) === "Scheduled").length,
      dueSoon: open.filter((item) => effectiveStatus(item) === "Due Soon").length,
      dueThirty: open.filter((item) => {
        const diff = daysUntil(dueKey(item));
        return diff !== null && diff >= 0 && diff <= 30;
      }).length,
      overdue: open.filter((item) => effectiveStatus(item) === "Overdue").length,
      complete: items.filter((item) => effectiveStatus(item) === "Complete").length,
      paused: items.filter((item) => effectiveStatus(item) === "Paused").length,
    };
  }, [items]);

  const nextDue = useMemo(() => {
    return [...items]
      .filter((item) => !["Complete", "Paused"].includes(effectiveStatus(item)) && dueKey(item))
      .sort((a, b) => dueKey(a).localeCompare(dueKey(b)))[0];
  }, [items]);

  const overdueItems = useMemo(
    () => sortedItems.filter((item) => effectiveStatus(item) === "Overdue"),
    [sortedItems],
  );

  const upcomingItems = useMemo(
    () => sortedItems.filter((item) => {
      const status = effectiveStatus(item);
      const diff = daysUntil(dueKey(item));
      return status !== "Complete" && status !== "Paused" && diff !== null && diff >= 0 && diff <= 30;
    }),
    [sortedItems],
  );

  async function loadData() {
    setLoading(true);
    const [itemRes, peopleRes] = await Promise.all([
      supabase.from("hse_calendar_items").select("*").order("next_due_date", { ascending: true }),
      supabase.from("people").select("id,name,email,role,department,active").eq("active", true).order("name", { ascending: true }),
    ]);

    if (itemRes.error) {
      setItems([]);
      setMessage(`HSE calendar table not ready: ${itemRes.error.message}. Run scripts/sql/hse_calendar_planner.sql in Supabase.`);
    } else {
      const rows = (itemRes.data || []) as PlannerItem[];
      setItems(rows);
      if (!selectedId && rows[0]) setSelectedId(rows[0].id);
      setMessage(`Loaded ${rows.length} HSE calendar item${rows.length === 1 ? "" : "s"}.`);
    }

    if (!peopleRes.error) setPeople((peopleRes.data || []) as PersonOption[]);
    setRefreshStamp(new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }));
    setLoading(false);
  }

  function applyPerson(value: string, target: "create" | "detail") {
    const person = peopleById.get(value);
    const update = {
      assigned_person_id: person?.id || "",
      assigned_to: person?.name || value,
    };
    if (target === "create") setCreateForm((current) => ({ ...current, ...update }));
    else setDetailForm((current) => ({ ...current, ...update }));
  }

  function applyInspectionForm(ref: string, target: "create" | "detail") {
    const template = inspectionForms.find((form) => form.ref === ref);
    const update = {
      inspection_form_ref: ref,
      inspection_form_title: template?.title || "",
      title: template ? `${template.title} planner item` : "",
    };
    if (target === "create") {
      setCreateForm((current) => ({
        ...current,
        inspection_form_ref: update.inspection_form_ref,
        inspection_form_title: update.inspection_form_title,
        title: current.title || update.title,
        planner_type: "Inspection",
      }));
    } else {
      setDetailForm((current) => ({
        ...current,
        inspection_form_ref: update.inspection_form_ref,
        inspection_form_title: update.inspection_form_title,
        title: current.title || update.title,
        planner_type: "Inspection",
      }));
    }
  }

  async function createItem() {
    if (!clean(createForm.title)) {
      setMessage("Status: Add a task title before saving.");
      return;
    }
    const { error } = await supabase.from("hse_calendar_items").insert([payloadFromForm(createForm)]);
    if (error) {
      setMessage(`Status: Calendar item could not be saved: ${error.message}`);
      return;
    }
    setCreateForm(emptyForm);
    setMessage("Status: HSE calendar item created.");
    await loadData();
    setActiveView("register");
  }

  async function updateItem() {
    if (!selected) return;
    if (!clean(detailForm.title)) {
      setMessage("Status: Add a task title before saving.");
      return;
    }
    const { error } = await supabase.from("hse_calendar_items").update(payloadFromForm(detailForm)).eq("id", selected.id);
    if (error) {
      setMessage(`Status: Calendar item could not be updated: ${error.message}`);
      return;
    }
    setMessage("Status: HSE calendar item updated.");
    await loadData();
  }

  async function deleteItem() {
    if (!selected) return;
    if (!window.confirm(`Delete ${selected.title}?`)) return;
    const { error } = await supabase.from("hse_calendar_items").delete().eq("id", selected.id);
    if (error) {
      setMessage(`Status: Calendar item could not be deleted: ${error.message}`);
      return;
    }
    setSelectedId("");
    setMessage("Status: HSE calendar item deleted.");
    await loadData();
  }

  async function markCompleteAndRollForward() {
    if (!selected) return;
    const completed = todayKey();
    const currentDue = dueKey(selected) || completed;
    const isRecurring = selected.frequency && selected.frequency !== "One-off";
    const nextDueDate = isRecurring ? addFrequency(currentDue, selected.frequency) : currentDue;
    const nextStatus = isRecurring ? "Scheduled" : "Complete";
    const { error } = await supabase
      .from("hse_calendar_items")
      .update({
        last_completed_date: completed,
        next_due_date: nextDueDate,
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selected.id);
    if (error) {
      setMessage(`Status: Completion could not be saved: ${error.message}`);
      return;
    }
    setMessage(isRecurring ? `Status: Completed and rolled forward to ${displayDate(nextDueDate)}.` : "Status: Item marked complete.");
    await loadData();
  }

  function openFilteredRegister(nextStatus: string) {
    setStatusFilter(nextStatus);
    setActiveView("register");
    setShowFilters(true);
  }

  return (
    <main>
      <QualityPageHero
        label="HSE MANAGEMENT"
        title="HSE Calendar"
        description="Plan recurring HSE inspections, assign team ownership, and monitor upcoming six-monthly and yearly checks from one controlled planner."
        contextCards={[
          { label: "Last Refreshed", value: refreshStamp || "Loading" },
          { label: "Next Due", value: nextDue ? `${displayDate(dueKey(nextDue))} - ${nextDue.title}` : "No planned item" },
        ]}
      />

      <ImsTopMetaRow
        backHref="/hse"
        status={<><strong>Status:</strong> {loading ? "Loading..." : message}</>}
        actions={<ImsButton onClick={() => void loadData()} disabled={loading}>Refresh</ImsButton>}
      />

      <ImsTabs tabs={viewTabs} active={activeView} onChange={setActiveView} ariaLabel="HSE calendar views" />

      {activeView === "dashboard" ? (
        <div style={{ display: "grid", gap: "20px" }}>
          <section style={kpiGridStyle}>
            <QualityKpiCard title="Scheduled" value={kpis.scheduled} accent={imsColours.blue} onClick={() => openFilteredRegister("Scheduled")} />
            <QualityKpiCard title="Due Soon" value={kpis.dueSoon} accent={imsColours.warning} onClick={() => openFilteredRegister("Due Soon")} />
            <QualityKpiCard title="Due in 30 Days" value={kpis.dueThirty} accent={imsColours.brand} onClick={() => { setStatusFilter(""); setActiveView("register"); setShowFilters(true); }} />
            <QualityKpiCard title="Overdue" value={kpis.overdue} accent={imsColours.dangerBright} onClick={() => openFilteredRegister("Overdue")} />
            <QualityKpiCard title="Completed" value={kpis.complete} accent={imsColours.success} onClick={() => openFilteredRegister("Complete")} />
            <QualityKpiCard title="Paused" value={kpis.paused} accent={imsColours.muted} onClick={() => openFilteredRegister("Paused")} />
          </section>

          <section style={dashboardGridStyle}>
            <ImsPanel title="Overdue Calendar Items" subtitle="HSE inspections and checks now past their planned due date.">
              <div style={{ display: "grid", gap: "10px" }}>
                {overdueItems.slice(0, 10).map((item) => (
                  <button key={item.id} type="button" style={listButtonStyle} onClick={() => { setSelectedId(item.id); setActiveView("register"); }}>
                    <span>
                      <strong>{item.title}</strong>
                      <span style={mutedTextStyle}>{[item.inspection_form_ref, item.assigned_to, item.frequency].filter(Boolean).join(" | ")}</span>
                    </span>
                    <StatusPill status={effectiveStatus(item)} />
                    <strong>{displayDate(dueKey(item)) || "No due date"}</strong>
                  </button>
                ))}
                {!overdueItems.length ? <EmptyState text="No overdue HSE calendar items." /> : null}
              </div>
            </ImsPanel>

            <ImsPanel title="Upcoming Calendar Items" subtitle="HSE planner items due in the next 30 days.">
              <div style={{ display: "grid", gap: "10px" }}>
                {upcomingItems.slice(0, 10).map((item) => (
                  <button key={item.id} type="button" style={listButtonStyle} onClick={() => { setSelectedId(item.id); setActiveView("register"); }}>
                    <span>
                      <strong>{item.title}</strong>
                      <span style={mutedTextStyle}>{[item.inspection_form_ref, item.assigned_to, item.frequency].filter(Boolean).join(" | ")}</span>
                    </span>
                    <StatusPill status={effectiveStatus(item)} />
                    <strong>{displayDate(dueKey(item)) || "No due date"}</strong>
                  </button>
                ))}
                {!upcomingItems.length ? <EmptyState text="No HSE calendar items due in the next 30 days." /> : null}
              </div>
            </ImsPanel>
          </section>
        </div>
      ) : null}

      {activeView === "calendar" ? (
        <ImsPanel title="Calendar View" subtitle="Month view of planned HSE inspections and recurring checks.">
          <div style={calendarToolbarStyle}>
            <ImsButton variant="secondary" onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}>Previous</ImsButton>
            <h2 style={{ margin: 0 }}>{monthCursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</h2>
            <ImsButton variant="secondary" onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}>Next</ImsButton>
          </div>
          <MonthGrid
            cursor={monthCursor}
            items={items}
            onDateSelect={(dateKey) => {
              setCreateForm((current) => ({ ...current, due_date: dateKey, next_due_date: dateKey }));
              setActiveView("create");
            }}
            onSelect={(item) => {
              setSelectedId(item.id);
              setActiveView("register");
            }}
          />
        </ImsPanel>
      ) : null}

      {activeView === "register" ? (
        <div style={{ display: "grid", gap: "16px" }}>
          <ImsPanel title="HSE Calendar Register" subtitle="Search, filter, open, edit, complete, or roll forward planned HSE work.">
            <ImsFilterPanel
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search title, owner, form, location or project"
              showFilters={showFilters}
              onToggleFilters={() => setShowFilters((value) => !value)}
              actions={<ImsButton variant="secondary" onClick={() => { setSearch(""); setStatusFilter(""); setOwnerFilter(""); setFrequencyFilter(""); setFormFilter(""); }}>Clear Filters</ImsButton>}
            >
              <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter} options={statusOptions} emptyLabel="All Statuses" />
              <FilterSelect label="Owner" value={ownerFilter} onChange={setOwnerFilter} options={[...new Set(items.map((item) => item.assigned_to).filter(Boolean) as string[])]} emptyLabel="All Owners" />
              <FilterSelect label="Frequency" value={frequencyFilter} onChange={setFrequencyFilter} options={frequencyOptions} emptyLabel="All Frequencies" />
              <FilterSelect label="Inspection Form" value={formFilter} onChange={setFormFilter} options={inspectionForms.map((form) => form.ref)} emptyLabel="All Forms" />
            </ImsFilterPanel>

            <div style={imsTableInfoRowStyle}>
              <span>Showing</span><strong>{sortedItems.length}</strong><span>of</span><strong>{items.length}</strong><span>calendar items</span>
            </div>

            <div style={{ overflowX: "auto", border: "1px solid #dbe3ef", borderRadius: "14px" }}>
              <table style={imsTableStyle}>
                <thead>
                  <tr>
                    <th style={imsTableHeadStyle}>Task</th>
                    <th style={imsTableHeadStyle}>Form</th>
                    <th style={imsTableHeadStyle}>Owner</th>
                    <th style={imsTableHeadStyle}>Frequency</th>
                    <th style={imsTableHeadStyle}>Next Due</th>
                    <th style={imsTableHeadStyle}>Status</th>
                    <th style={imsTableHeadStyle}>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      style={{ cursor: "pointer", background: selectedId === item.id ? imsColours.brandSoft : "white" }}
                    >
                      <td style={imsTableCellStyle}>
                        <strong>{item.title}</strong>
                        <div style={mutedTextStyle}>{item.location || item.project_work_scope || ""}</div>
                      </td>
                      <td style={imsTableCellStyle}>
                        <strong>{item.inspection_form_ref || "-"}</strong>
                        <div style={mutedTextStyle}>{item.inspection_form_title || ""}</div>
                      </td>
                      <td style={imsTableCellStyle}>{item.assigned_to || "-"}</td>
                      <td style={imsTableCellStyle}>{item.frequency || "-"}</td>
                      <td style={imsTableCellStyle}>{displayDate(dueKey(item)) || "-"}</td>
                      <td style={imsTableCellStyle}><StatusPill status={effectiveStatus(item)} /></td>
                      <td style={imsTableCellStyle}>{item.priority || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ImsPanel>

          {selected ? (
            <ImsPanel
              title={`Planner Detail - ${selected.title}`}
              subtitle={[selected.inspection_form_ref, selected.assigned_to, displayDate(dueKey(selected))].filter(Boolean).join(" | ")}
              actions={<ImsButton variant="secondary" onClick={() => setSelectedId("")}>Hide Panel</ImsButton>}
            >
              <PlannerFormFields
                form={detailForm}
                people={people}
                onChange={setDetailForm}
                onPersonSelect={(value) => applyPerson(value, "detail")}
                onInspectionFormSelect={(value) => applyInspectionForm(value, "detail")}
              />
              <div style={formActionRowStyle}>
                <ImsButton onClick={() => void updateItem()}>Save Planner Item</ImsButton>
                <ImsButton variant="secondary" onClick={() => void markCompleteAndRollForward()}>Complete / Roll Forward</ImsButton>
                <ImsButton variant="danger" onClick={() => void deleteItem()}>Delete Item</ImsButton>
              </div>
            </ImsPanel>
          ) : null}
        </div>
      ) : null}

      {activeView === "create" ? (
        <ImsPanel title="Create HSE Calendar Item" subtitle="Set up recurring inspections or HSE checks with owner, recurrence, reminder lead time, and due date.">
          <PlannerFormFields
            form={createForm}
            people={people}
            onChange={setCreateForm}
            onPersonSelect={(value) => applyPerson(value, "create")}
            onInspectionFormSelect={(value) => applyInspectionForm(value, "create")}
          />
          <div style={{ ...noticeStyle, marginTop: "14px" }}>
            Quick team setup: {hseTeamNames.map((name) => (
              <button key={name} type="button" style={teamChipStyle} onClick={() => {
                const person = peopleByName.get(name);
                setCreateForm((current) => ({ ...current, assigned_to: name, assigned_person_id: person?.id || "" }));
              }}>
                {name}
              </button>
            ))}
          </div>
          <div style={formActionRowStyle}>
            <ImsButton onClick={() => void createItem()}>Create Planner Item</ImsButton>
            <ImsButton variant="secondary" onClick={() => setCreateForm(emptyForm)}>Clear Form</ImsButton>
          </div>
        </ImsPanel>
      ) : null}
    </main>
  );
}

function PlannerFormFields({
  form,
  people,
  onChange,
  onPersonSelect,
  onInspectionFormSelect,
}: {
  form: PlannerForm;
  people: PersonOption[];
  onChange: (form: PlannerForm) => void;
  onPersonSelect: (value: string) => void;
  onInspectionFormSelect: (value: string) => void;
}) {
  return (
    <div style={formGridStyle}>
      <Field label="Task Title">
        <input style={imsInputStyle} value={form.title} onChange={(event) => onChange({ ...form, title: event.target.value })} />
      </Field>
      <Field label="Planner Type">
        <select style={imsInputStyle} value={form.planner_type} onChange={(event) => onChange({ ...form, planner_type: event.target.value })}>
          <option>Inspection</option>
          <option>HSE Check</option>
          <option>Review</option>
          <option>Drill</option>
          <option>Other</option>
        </select>
      </Field>
      <Field label="Inspection Form">
        <select style={imsInputStyle} value={form.inspection_form_ref} onChange={(event) => onInspectionFormSelect(event.target.value)}>
          <option value="">No linked inspection form</option>
          {inspectionForms.map((template) => (
            <option key={template.ref} value={template.ref}>{template.ref} - {template.title}</option>
          ))}
        </select>
      </Field>
      <Field label="Inspection Form Title">
        <input style={imsInputStyle} value={form.inspection_form_title} onChange={(event) => onChange({ ...form, inspection_form_title: event.target.value })} />
      </Field>
      <Field label="Assigned To">
        <select style={imsInputStyle} value={form.assigned_person_id || form.assigned_to} onChange={(event) => onPersonSelect(event.target.value)}>
          <option value="">Select person</option>
          {form.assigned_to && !people.some((person) => person.name === form.assigned_to) ? <option value={form.assigned_to}>{form.assigned_to} (saved value)</option> : null}
          {people.map((person) => (
            <option key={person.id} value={person.id}>{[person.name, person.role].filter(Boolean).join(" - ")}</option>
          ))}
        </select>
      </Field>
      <Field label="Frequency">
        <select style={imsInputStyle} value={form.frequency} onChange={(event) => onChange({ ...form, frequency: event.target.value })}>
          {frequencyOptions.map((option) => <option key={option}>{option}</option>)}
        </select>
      </Field>
      <Field label="Due Date">
        <input type="date" style={imsInputStyle} value={form.due_date} onChange={(event) => onChange({ ...form, due_date: event.target.value, next_due_date: form.next_due_date || event.target.value })} />
      </Field>
      <Field label="Next Due Date">
        <input type="date" style={imsInputStyle} value={form.next_due_date} onChange={(event) => onChange({ ...form, next_due_date: event.target.value })} />
      </Field>
      <Field label="Reminder Lead Time">
        <input type="number" min="0" style={imsInputStyle} value={form.reminder_days} onChange={(event) => onChange({ ...form, reminder_days: event.target.value })} />
      </Field>
      <Field label="Status">
        <select style={imsInputStyle} value={form.status} onChange={(event) => onChange({ ...form, status: event.target.value })}>
          {statusOptions.map((option) => <option key={option}>{option}</option>)}
        </select>
      </Field>
      <Field label="Priority">
        <select style={imsInputStyle} value={form.priority} onChange={(event) => onChange({ ...form, priority: event.target.value })}>
          {priorityOptions.map((option) => <option key={option}>{option}</option>)}
        </select>
      </Field>
      <Field label="Last Completed">
        <input type="date" style={imsInputStyle} value={form.last_completed_date} onChange={(event) => onChange({ ...form, last_completed_date: event.target.value })} />
      </Field>
      <Field label="Location">
        <input style={imsInputStyle} value={form.location} onChange={(event) => onChange({ ...form, location: event.target.value })} />
      </Field>
      <Field label="Project / Work Scope">
        <input style={imsInputStyle} value={form.project_work_scope} onChange={(event) => onChange({ ...form, project_work_scope: event.target.value })} />
      </Field>
      <Field label="Description" span>
        <textarea style={{ ...imsInputStyle, minHeight: "96px", resize: "vertical", lineHeight: 1.45 }} value={form.description} onChange={(event) => onChange({ ...form, description: event.target.value })} />
      </Field>
      <Field label="Notes" span>
        <textarea style={{ ...imsInputStyle, minHeight: "96px", resize: "vertical", lineHeight: 1.45 }} value={form.notes} onChange={(event) => onChange({ ...form, notes: event.target.value })} />
      </Field>
    </div>
  );
}

function Field({ label, children, span = false }: { label: string; children: ReactNode; span?: boolean }) {
  return (
    <label style={{ display: "grid", gap: "6px", gridColumn: span ? "1 / -1" : undefined }}>
      <span style={fieldLabelStyle}>{label}</span>
      {children}
    </label>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  emptyLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  emptyLabel: string;
}) {
  return (
    <label style={{ display: "grid", gap: "6px" }}>
      <span style={fieldLabelStyle}>{label}</span>
      <select style={imsInputStyle} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{emptyLabel}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "999px",
        padding: "6px 10px",
        background: `${accentForStatus(status)}22`,
        color: accentForStatus(status),
        fontSize: "12px",
        fontWeight: 900,
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div style={{ border: "1px dashed #cbd5e1", borderRadius: "14px", padding: "16px", color: imsColours.slate, background: "#f8fafc" }}>{text}</div>;
}

function MonthGrid({
  cursor,
  items,
  onSelect,
  onDateSelect,
}: {
  cursor: Date;
  items: PlannerItem[];
  onSelect: (item: PlannerItem) => void;
  onDateSelect: (dateKey: string) => void;
}) {
  const month = cursor.getMonth();
  const year = cursor.getFullYear();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ key: string; day: number | null; items: PlannerItem[] }> = [];

  for (let index = 0; index < startOffset; index += 1) cells.push({ key: `blank-${index}`, day: null, items: [] });
  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = toDateKey(new Date(year, month, day));
    cells.push({
      key,
      day,
      items: items.filter((item) => dueKey(item) === key),
    });
  }

  return (
    <div style={calendarGridStyle}>
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <div key={day} style={calendarHeadStyle}>{day}</div>)}
      {cells.map((cell) => (
        <div key={cell.key} style={cell.day ? calendarCellStyle : blankCalendarCellStyle}>
          {cell.day ? (
            <button type="button" style={calendarDayButtonStyle} onClick={() => onDateSelect(cell.key)} title="Create a calendar item for this date">
              {cell.day}
            </button>
          ) : null}
          <div style={{ display: "grid", gap: "5px", marginTop: "8px" }}>
            {cell.items.slice(0, 3).map((item) => (
              <button
                key={item.id}
                type="button"
                style={calendarEventStyle}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(item);
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: "999px", background: accentForStatus(effectiveStatus(item)), flex: "0 0 auto" }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</span>
              </button>
            ))}
            {cell.items.length > 3 ? <span style={mutedTextStyle}>+{cell.items.length - 3} more</span> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

const kpiGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: "16px",
};

const dashboardGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "20px",
};

const formGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "12px",
};

const fieldLabelStyle: CSSProperties = {
  color: imsColours.ink,
  fontSize: "12px",
  fontWeight: 900,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const mutedTextStyle: CSSProperties = {
  display: "block",
  color: imsColours.slate,
  fontSize: "12px",
  fontWeight: 700,
  marginTop: "3px",
};

const listButtonStyle: CSSProperties = {
  width: "100%",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto auto auto",
  gap: "10px",
  alignItems: "center",
  border: "1px solid #dbe3ef",
  borderRadius: "14px",
  padding: "12px",
  background: "#ffffff",
  color: imsColours.ink,
  textAlign: "left",
  cursor: "pointer",
};

const noticeStyle: CSSProperties = {
  border: "1px solid #dbe3ef",
  borderRadius: "14px",
  padding: "14px",
  background: "#f8fafc",
  color: imsColours.slate,
  lineHeight: 1.55,
};

const teamChipStyle: CSSProperties = {
  margin: "4px 4px 0 6px",
  border: "1px solid #bfe5e3",
  background: "#eef8f7",
  color: imsColours.brandDark,
  borderRadius: "999px",
  padding: "6px 10px",
  fontWeight: 900,
  cursor: "pointer",
};

const formActionRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "16px",
};

const calendarToolbarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  marginBottom: "16px",
};

const calendarGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
  border: "1px solid #dbe3ef",
  borderRadius: "16px",
  overflow: "hidden",
};

const calendarHeadStyle: CSSProperties = {
  padding: "10px",
  background: imsColours.brand,
  color: "#ffffff",
  fontSize: "12px",
  fontWeight: 900,
  textAlign: "center",
};

const calendarCellStyle: CSSProperties = {
  minHeight: "116px",
  padding: "10px",
  borderRight: "1px solid #edf2f7",
  borderBottom: "1px solid #edf2f7",
  background: "#ffffff",
  boxSizing: "border-box",
};

const calendarDayButtonStyle: CSSProperties = {
  border: "none",
  borderRadius: "999px",
  background: "#eef8f7",
  color: imsColours.brandDark,
  width: "30px",
  height: "30px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 900,
  cursor: "pointer",
};

const blankCalendarCellStyle: CSSProperties = {
  ...calendarCellStyle,
  background: "#f8fafc",
};

const calendarEventStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  width: "100%",
  minWidth: 0,
  border: "1px solid #dbe3ef",
  borderRadius: "9px",
  padding: "5px 6px",
  background: "#f8fafc",
  color: imsColours.ink,
  fontSize: "11px",
  fontWeight: 800,
  cursor: "pointer",
};

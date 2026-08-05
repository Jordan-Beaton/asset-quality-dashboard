"use client";

import type { CSSProperties, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ImsButton, ImsFilterPanel, ImsLinkButton, ImsPanel, ImsTabs, ImsTopMetaRow } from "../../../src/components/ImsPrimitives";
import { QualityKpiCard } from "../../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../../src/components/QualityPageHero";
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
type EventSource = "AINM" | "Inspection" | "Observation" | "HSE Action" | "Planner" | "HSE Check" | "Review" | "Drill" | "Other";
type SourceKind = "system" | "manual";

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

type AINMRow = {
  id: string;
  ainm_number: string | null;
  title: string | null;
  project: string | null;
  location_site: string | null;
  event_date: string | null;
  event_classification: string | null;
  overall_status: string | null;
  owner: string | null;
};

type HseInspectionRow = {
  id: string;
  inspection_number: string | null;
  title: string | null;
  form_title: string | null;
  project_work_scope: string | null;
  area_zone: string | null;
  inspection_date: string | null;
  inspector_name: string | null;
  status: string | null;
};

type ObservationRow = {
  id: string;
  observation_number: string | null;
  title: string | null;
  observation_date: string | null;
  observation_type: string | null;
  project: string | null;
  site_location: string | null;
  status: string | null;
  assigned_to: string | null;
  created_at: string | null;
};

type HseActionRow = {
  id: string;
  action_number: string | null;
  title: string | null;
  description: string | null;
  department: string | null;
  owner: string | null;
  priority: string | null;
  status: string | null;
  due_date: string | null;
  source: string | null;
  linked_ainm_number?: string | null;
  linked_hse_inspection_number?: string | null;
  linked_observation_number?: string | null;
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

type CalendarEvent = {
  id: string;
  sourceId: string;
  sourceKind: SourceKind;
  source: EventSource;
  title: string;
  date: string;
  status: string;
  owner: string;
  priority: string;
  detail: string;
  href?: string;
  planner?: PlannerItem;
};

const viewTabs: Array<{ value: CalendarView; label: string }> = [
  { value: "dashboard", label: "Dashboard" },
  { value: "calendar", label: "Calendar" },
  { value: "register", label: "Register" },
  { value: "create", label: "Create Event" },
];

const inspectionForms = [
  { ref: "ENS-HSEQ-FRM-046", title: "Vessel Pre-Sail Inspection", revision: "Rev B", revisionDate: "08 Feb 2024" },
  { ref: "ENS-HSEQ-FRM-041", title: "Workplace Inspection - Office", revision: "Rev B", revisionDate: "23 Feb 2024" },
  { ref: "ENS-HSEQ-FRM-042", title: "Workplace Inspection - Offshore", revision: "Rev B", revisionDate: "10 Aug 2023" },
  { ref: "ENS-HSEQ-FRM-043", title: "Workplace Inspection - Mobilisation", revision: "Rev B", revisionDate: "Not stated" },
  { ref: "ENS-HSEQ-FRM-044", title: "Workplace Inspection - Base and Site", revision: "Rev E", revisionDate: "19 May 2026" },
  { ref: "ENS-HSEQ-FRM-045", title: "Workplace Inspection - Dropped Objects", revision: "Rev B", revisionDate: "Not stated" },
];

const hseTeamNames = ["Peter Ridley", "John Fender", "Blerim Azizaj", "Les Middleton"];
const frequencyOptions = ["One-off", "Weekly", "Monthly", "6-monthly", "Yearly"];
const hseEventTypes = ["Holiday", "Event", "Training", "Meeting", "Reminder", "Inspection", "HSE Check", "Review", "Drill", "Other"];
const statusOptions = ["Scheduled", "Due Soon", "Overdue", "Complete", "Paused"];
const priorityOptions = ["Low", "Medium", "High"];
const plannerSourceFilter = "Planner Items";

const emptyForm: PlannerForm = {
  title: "",
  description: "",
  planner_type: "Event",
  inspection_form_ref: "",
  inspection_form_title: "",
  assigned_to: "",
  assigned_person_id: "",
  frequency: "One-off",
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

function dateOnly(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

function dueKey(item: Pick<PlannerItem, "next_due_date" | "due_date">) {
  return item.next_due_date || item.due_date || "";
}

function isEventStylePlanner(item: Pick<PlannerItem, "planner_type">) {
  return ["Holiday", "Event", "Training", "Meeting", "Reminder"].includes((item.planner_type || "").trim());
}

function plannerEventDate(item: PlannerItem) {
  return isEventStylePlanner(item) ? item.due_date || item.next_due_date || "" : dueKey(item);
}

function daysUntil(value: string | null | undefined) {
  const date = parseDateKey(value);
  const start = parseDateKey(todayKey());
  if (!date || !start) return null;
  return Math.ceil((date.getTime() - start.getTime()) / 86400000);
}

function isClosedLike(status: string | null | undefined) {
  const cleanStatus = (status || "").trim().toLowerCase();
  return cleanStatus === "closed" || cleanStatus === "complete" || cleanStatus === "completed" || cleanStatus === "cancelled";
}

function effectivePlannerStatus(item: PlannerItem) {
  const stored = item.status || "Scheduled";
  if (stored === "Complete" || stored === "Paused") return stored;
  const diff = daysUntil(plannerEventDate(item));
  if (diff === null) return stored;
  if (diff < 0) return "Overdue";
  if (diff <= 7) return "Due Soon";
  return stored;
}

function dueStatus(date: string | null | undefined, status: string | null | undefined) {
  if (isClosedLike(status)) return status || "Complete";
  const diff = daysUntil(date);
  if (diff === null) return status || "Scheduled";
  if (diff < 0) return "Overdue";
  if (diff <= 7) return "Due Soon";
  return status || "Scheduled";
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

function clean(value: string) {
  return value.trim();
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

function plannerSource(item: PlannerItem): EventSource {
  const type = (item.planner_type || "").trim();
  if (type === "HSE Check") return "HSE Check";
  if (type === "Review") return "Review";
  if (type === "Drill") return "Drill";
  if (type === "Other") return "Other";
  return "Planner";
}

function eventAccent(source: EventSource, status: string) {
  if (status === "Overdue") return imsColours.dangerBright;
  if (status === "Due Soon") return imsColours.warning;
  if (source === "AINM") return imsColours.dangerBright;
  if (source === "Inspection") return imsColours.blue;
  if (source === "Observation") return imsColours.purple;
  if (source === "HSE Action") return isClosedLike(status) ? imsColours.success : imsColours.warning;
  if (source === "Planner" || source === "HSE Check") return imsColours.brand;
  if (source === "Review") return imsColours.slate;
  if (source === "Drill") return imsColours.purple;
  return imsColours.brandDark;
}

function sourceLabel(source: EventSource) {
  if (source === "HSE Action") return "Action";
  return source;
}

function buildEvents({
  plannerItems,
  ainmRows,
  inspectionRows,
  observationRows,
  actionRows,
}: {
  plannerItems: PlannerItem[];
  ainmRows: AINMRow[];
  inspectionRows: HseInspectionRow[];
  observationRows: ObservationRow[];
  actionRows: HseActionRow[];
}) {
  const events: CalendarEvent[] = [];

  plannerItems.forEach((item) => {
    const date = dateOnly(plannerEventDate(item));
    if (!date) return;
    const source = plannerSource(item);
    events.push({
      id: `planner-${item.id}`,
      sourceId: item.id,
      sourceKind: "manual",
      source,
      title: item.title || "Planner item",
      date,
      status: effectivePlannerStatus(item),
      owner: item.assigned_to || "",
      priority: item.priority || "",
      detail: [item.inspection_form_ref, item.inspection_form_title, item.location || item.project_work_scope].filter(Boolean).join(" | ") || item.description || "HSE planner item",
      planner: item,
    });
  });

  ainmRows.forEach((row) => {
    const date = dateOnly(row.event_date);
    if (!date) return;
    events.push({
      id: `ainm-${row.id}`,
      sourceId: row.id,
      sourceKind: "system",
      source: "AINM",
      title: `${row.ainm_number || "AINM"} event`,
      date,
      status: row.overall_status || "Open",
      owner: row.owner || "",
      priority: row.event_classification || "",
      detail: [row.title, row.project, row.location_site, row.event_classification].filter(Boolean).join(" | ") || "AINM event date",
      href: `/hse/ainm?ainmId=${encodeURIComponent(row.id)}`,
    });
  });

  inspectionRows.forEach((row) => {
    const date = dateOnly(row.inspection_date);
    if (!date) return;
    events.push({
      id: `inspection-${row.id}`,
      sourceId: row.id,
      sourceKind: "system",
      source: "Inspection",
      title: `${row.inspection_number || "Inspection"} completed`,
      date,
      status: row.status || "Open",
      owner: row.inspector_name || "",
      priority: "",
      detail: [row.title || row.form_title, row.project_work_scope, row.area_zone].filter(Boolean).join(" | ") || "HSE inspection date",
      href: `/hse/inspections?inspectionId=${encodeURIComponent(row.id)}`,
    });
  });

  observationRows.forEach((row) => {
    const date = dateOnly(row.observation_date) || dateOnly(row.created_at);
    if (!date) return;
    events.push({
      id: `observation-${row.id}`,
      sourceId: row.id,
      sourceKind: "system",
      source: "Observation",
      title: `${row.observation_number || "Observation"} logged`,
      date,
      status: row.status || "New",
      owner: row.assigned_to || "",
      priority: row.observation_type || "",
      detail: [row.title, row.project, row.site_location, row.observation_type].filter(Boolean).join(" | ") || "HSE observation date",
      href: `/hse/observations?observationId=${encodeURIComponent(row.id)}`,
    });
  });

  actionRows.forEach((action) => {
    if (!action.due_date || (action.department || "").trim().toUpperCase() !== "HSE") return;
    events.push({
      id: `action-${action.id}`,
      sourceId: action.id,
      sourceKind: "system",
      source: "HSE Action",
      title: `${action.action_number || "Action"} due`,
      date: dateOnly(action.due_date),
      status: dueStatus(action.due_date, action.status),
      owner: action.owner || "",
      priority: action.priority || "",
      detail: [action.title, action.source, action.linked_ainm_number, action.linked_hse_inspection_number, action.linked_observation_number].filter(Boolean).join(" | ") || "HSE action due date",
      href: `/hse/actions?actionId=${encodeURIComponent(action.id)}`,
    });
  });

  return events.filter((event) => event.date).sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

export default function HseCalendarPage() {
  const router = useRouter();
  const [items, setItems] = useState<PlannerItem[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [people, setPeople] = useState<PersonOption[]>([]);
  const [activeView, setActiveView] = useState<CalendarView>("dashboard");
  const [message, setMessage] = useState("Loading HSE calendar...");
  const [loading, setLoading] = useState(false);
  const [refreshStamp, setRefreshStamp] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [selectedDateKey, setSelectedDateKey] = useState("");
  const [createForm, setCreateForm] = useState<PlannerForm>(emptyForm);
  const [detailForm, setDetailForm] = useState<PlannerForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sourceFilter, setSourceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const selected = useMemo(() => events.find((event) => event.id === selectedId) || null, [events, selectedId]);
  const selectedPlanner = selected?.planner || null;

  useEffect(() => {
    if (selectedPlanner) setDetailForm(formFromItem(selectedPlanner));
  }, [selectedPlanner]);

  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const peopleByName = useMemo(() => new Map(people.map((person) => [person.name, person])), [people]);

  const filteredEvents = useMemo(() => {
    const text = search.trim().toLowerCase();
    return events.filter((event) => {
      if (sourceFilter === plannerSourceFilter && event.sourceKind !== "manual") return false;
      if (sourceFilter && sourceFilter !== plannerSourceFilter && event.source !== sourceFilter) return false;
      if (statusFilter && event.status !== statusFilter) return false;
      if (ownerFilter && event.owner !== ownerFilter) return false;
      if (!text) return true;
      return [event.title, event.detail, event.owner, event.status, event.source, event.priority]
        .join(" ")
        .toLowerCase()
        .includes(text);
    });
  }, [events, ownerFilter, search, sourceFilter, statusFilter]);

  const upcomingEvents = useMemo(
    () => events.filter((event) => {
      const diff = daysUntil(event.date);
      return diff !== null && diff >= 0 && diff <= 30 && !isClosedLike(event.status);
    }),
    [events],
  );

  const overdueEvents = useMemo(
    () => events.filter((event) => event.status === "Overdue"),
    [events],
  );

  const nextEvent = useMemo(
    () => upcomingEvents[0] || events.find((event) => {
      const diff = daysUntil(event.date);
      return diff !== null && diff >= 0;
    }),
    [events, upcomingEvents],
  );

  const kpis = useMemo(() => ({
    ainm: events.filter((event) => event.source === "AINM").length,
    inspections: events.filter((event) => event.source === "Inspection").length,
    observations: events.filter((event) => event.source === "Observation").length,
    actions: events.filter((event) => event.source === "HSE Action" && !isClosedLike(event.status)).length,
    overdue: overdueEvents.length,
    planner: events.filter((event) => event.sourceKind === "manual").length,
  }), [events, overdueEvents.length]);

  async function loadData() {
    setLoading(true);
    const [plannerRes, peopleRes, ainmRes, inspectionRes, observationRes, actionRes] = await Promise.all([
      supabase.from("hse_calendar_items").select("*").order("next_due_date", { ascending: true }),
      supabase.from("people").select("id,name,email,role,department,active").eq("active", true).order("name", { ascending: true }),
      supabase.from("hse_ainm_records").select("id,ainm_number,title,project,location_site,event_date,event_classification,overall_status,owner").order("event_date", { ascending: false }),
      supabase.from("hse_inspection_records").select("id,inspection_number,title,form_title,project_work_scope,area_zone,inspection_date,inspector_name,status").order("inspection_date", { ascending: false }),
      supabase.from("hse_observations").select("id,observation_number,title,observation_date,observation_type,project,site_location,status,assigned_to,created_at").order("created_at", { ascending: false }),
      supabase.from("actions").select("id,action_number,title,description,department,owner,priority,status,due_date,source,linked_ainm_number,linked_hse_inspection_number,linked_observation_number").order("action_number", { ascending: true }),
    ]);

    const warnings = [ainmRes, inspectionRes, observationRes, actionRes]
      .filter((result) => result.error)
      .map((result) => result.error?.message)
      .filter(Boolean);

    const plannerItems = plannerRes.error ? [] : ((plannerRes.data || []) as PlannerItem[]);
    setItems(plannerItems);
    if (!peopleRes.error) setPeople((peopleRes.data || []) as PersonOption[]);

    const nextEvents = buildEvents({
      plannerItems,
      ainmRows: (ainmRes.data || []) as AINMRow[],
      inspectionRows: (inspectionRes.data || []) as HseInspectionRow[],
      observationRows: (observationRes.data || []) as ObservationRow[],
      actionRows: (actionRes.data || []) as HseActionRow[],
    });
    setEvents(nextEvents);
    if (!selectedId && nextEvents[0]) setSelectedId(nextEvents[0].id);

    if (plannerRes.error) {
      setMessage(`HSE calendar table not ready: ${plannerRes.error.message}. Run scripts/sql/hse_calendar_planner.sql in Supabase.`);
    } else if (warnings.length) {
      setMessage(`Loaded ${nextEvents.length} HSE calendar events with source warnings: ${warnings.join(" | ")}`);
    } else {
      setMessage(`Loaded ${nextEvents.length} HSE calendar event${nextEvents.length === 1 ? "" : "s"}.`);
    }

    setRefreshStamp(new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }));
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, []);

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
    const apply = (current: PlannerForm) => ({
      ...current,
      inspection_form_ref: update.inspection_form_ref,
      inspection_form_title: update.inspection_form_title,
      title: current.title || update.title,
      planner_type: "Inspection",
    });
    if (target === "create") setCreateForm(apply);
    else setDetailForm(apply);
  }

  async function createItem() {
    if (!clean(createForm.title) || !clean(createForm.due_date)) {
      setMessage("Status: Add a title and start date before saving.");
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
    if (!selectedPlanner) return;
    if (!clean(detailForm.title)) {
      setMessage("Status: Add a task title before saving.");
      return;
    }
    const { error } = await supabase.from("hse_calendar_items").update(payloadFromForm(detailForm)).eq("id", selectedPlanner.id);
    if (error) {
      setMessage(`Status: Calendar item could not be updated: ${error.message}`);
      return;
    }
    setMessage("Status: HSE calendar item updated.");
    await loadData();
  }

  async function deleteItem() {
    if (!selectedPlanner) return;
    if (!window.confirm(`Delete ${selectedPlanner.title}?`)) return;
    const { error } = await supabase.from("hse_calendar_items").delete().eq("id", selectedPlanner.id);
    if (error) {
      setMessage(`Status: Calendar item could not be deleted: ${error.message}`);
      return;
    }
    setSelectedId("");
    setMessage("Status: HSE calendar item deleted.");
    await loadData();
  }

  async function markCompleteAndRollForward() {
    if (!selectedPlanner) return;
    const completed = todayKey();
    const currentDue = dueKey(selectedPlanner) || completed;
    const isRecurring = selectedPlanner.frequency && selectedPlanner.frequency !== "One-off";
    const nextDueDate = isRecurring ? addFrequency(currentDue, selectedPlanner.frequency) : currentDue;
    const nextStatus = isRecurring ? "Scheduled" : "Complete";
    const { error } = await supabase
      .from("hse_calendar_items")
      .update({
        last_completed_date: completed,
        next_due_date: nextDueDate,
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedPlanner.id);
    if (error) {
      setMessage(`Status: Completion could not be saved: ${error.message}`);
      return;
    }
    setMessage(isRecurring ? `Status: Completed and rolled forward to ${displayDate(nextDueDate)}.` : "Status: Item marked complete.");
    await loadData();
  }

  function openFilteredRegister(source: string, status = "") {
    setSearch("");
    setSourceFilter(source);
    setStatusFilter(status);
    setOwnerFilter("");
    setSelectedDateKey("");
    setSelectedId("");
    setActiveView("register");
    setShowFilters(true);
  }

  function clearRegisterFilters() {
    setSearch("");
    setSourceFilter("");
    setStatusFilter("");
    setOwnerFilter("");
    setSelectedDateKey("");
  }

  function openEvent(event: CalendarEvent) {
    if (event.sourceKind === "system" && event.href) {
      router.push(event.href);
      return;
    }
    setSearch("");
    setSourceFilter(plannerSourceFilter);
    setStatusFilter("");
    setOwnerFilter("");
    setSelectedDateKey("");
    setSelectedId(event.id);
    setActiveView("register");
    setShowFilters(true);
  }

  return (
    <main>
      <QualityPageHero
        label="HSE MANAGEMENT"
        title="HSE Calendar"
        description="Live HSE timeline for AINM records, inspections, observations, HSE actions, and editable planner items."
        contextCards={[
          { label: "Last Refreshed", value: refreshStamp || "Loading" },
          { label: "Next Event", value: nextEvent ? `${displayDate(nextEvent.date)} - ${nextEvent.title}` : "No upcoming event" },
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
            <QualityKpiCard title="AINM Events" value={kpis.ainm} accent={imsColours.dangerBright} onClick={() => openFilteredRegister("AINM")} />
            <QualityKpiCard title="Inspections" value={kpis.inspections} accent={imsColours.blue} onClick={() => openFilteredRegister("Inspection")} />
            <QualityKpiCard title="Observations" value={kpis.observations} accent={imsColours.purple} onClick={() => openFilteredRegister("Observation")} />
            <QualityKpiCard title="Open Actions" value={kpis.actions} accent={imsColours.warning} onClick={() => openFilteredRegister("HSE Action")} />
            <QualityKpiCard title="Overdue" value={kpis.overdue} accent={imsColours.dangerBright} onClick={() => openFilteredRegister("", "Overdue")} />
            <QualityKpiCard title="Planner Items" value={kpis.planner} accent={imsColours.brand} onClick={() => openFilteredRegister(plannerSourceFilter)} />
          </section>

          <section style={dashboardGridStyle}>
            <ImsPanel title="Upcoming HSE Dates" subtitle="Next 30 days across HSE source records and planner items.">
              <div style={listStackStyle}>
                {upcomingEvents.slice(0, 8).map((event) => (
                  <EventListButton key={event.id} event={event} onClick={() => openEvent(event)} />
                ))}
                {!upcomingEvents.length ? <EmptyState text="No HSE calendar events due in the next 30 days." /> : null}
              </div>
            </ImsPanel>

            <ImsPanel title="Management Attention" subtitle="Overdue planner items and HSE actions requiring attention.">
              <div style={listStackStyle}>
                {overdueEvents.slice(0, 8).map((event) => (
                  <EventListButton key={event.id} event={event} onClick={() => openEvent(event)} />
                ))}
                {!overdueEvents.length ? <EmptyState text="No overdue HSE calendar events." /> : null}
              </div>
            </ImsPanel>
          </section>
        </div>
      ) : null}

      {activeView === "calendar" ? (
        <ImsPanel title="Calendar View" subtitle="Month view of live HSE records and planned HSE work.">
          <Legend />
          <div style={calendarToolbarStyle}>
            <ImsButton variant="secondary" onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}>Previous</ImsButton>
            <h2 style={{ margin: 0 }}>{monthCursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</h2>
            <ImsButton variant="secondary" onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}>Next</ImsButton>
          </div>
          <MonthGrid
            cursor={monthCursor}
            events={filteredEvents}
            onDateSelect={setSelectedDateKey}
            onCreateDate={(dateKey) => {
              setCreateForm((current) => ({ ...current, due_date: dateKey, next_due_date: dateKey }));
              setActiveView("create");
            }}
            onSelect={(event) => openEvent(event)}
          />
          {selectedDateKey ? (
            <div style={dateDetailStyle}>
              <div style={dateDetailHeaderStyle}>
                <div>
                  <div style={fieldLabelStyle}>Selected Date</div>
                  <strong>{displayDate(selectedDateKey)}</strong>
                </div>
                <ImsButton
                  onClick={() => {
                    setCreateForm((current) => ({ ...current, due_date: selectedDateKey, next_due_date: selectedDateKey }));
                    setActiveView("create");
                  }}
                >
                  + Add Item
                </ImsButton>
              </div>
              <div style={listStackStyle}>
                {filteredEvents
                  .filter((event) => event.date === selectedDateKey)
                  .map((event) => <EventListButton key={event.id} event={event} onClick={() => openEvent(event)} />)}
                {!filteredEvents.some((event) => event.date === selectedDateKey) ? <EmptyState text="No HSE calendar items are logged on this date." /> : null}
              </div>
            </div>
          ) : null}
        </ImsPanel>
      ) : null}

      {activeView === "register" ? (
        <div style={{ display: "grid", gap: "16px" }}>
          <ImsPanel title="HSE Calendar Register" subtitle="Search and filter live HSE dates and editable planner items.">
            <ImsFilterPanel
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search title, owner, source, status or detail"
              showFilters={showFilters}
              onToggleFilters={() => setShowFilters((value) => !value)}
              actions={<ImsButton variant="secondary" onClick={clearRegisterFilters}>Clear Filters</ImsButton>}
            >
              <FilterSelect label="Type" value={sourceFilter} onChange={setSourceFilter} options={["AINM", "Inspection", "Observation", "HSE Action", plannerSourceFilter, "Planner", "HSE Check", "Review", "Drill", "Other"]} emptyLabel="All Types" />
              <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter} options={[...new Set(events.map((event) => event.status).filter(Boolean))]} emptyLabel="All Statuses" />
              <FilterSelect label="Owner" value={ownerFilter} onChange={setOwnerFilter} options={[...new Set(events.map((event) => event.owner).filter(Boolean))]} emptyLabel="All Owners" />
            </ImsFilterPanel>

            <div style={imsTableInfoRowStyle}>
              <span>Showing</span><strong>{filteredEvents.length}</strong><span>of</span><strong>{events.length}</strong><span>calendar events</span>
              {sourceFilter || statusFilter || ownerFilter || search ? (
                <span style={activeFilterChipStyle}>
                  Filter: {[sourceFilter, statusFilter, ownerFilter, search ? `"${search}"` : ""].filter(Boolean).join(" / ")}
                </span>
              ) : null}
            </div>

            <div style={{ overflowX: "auto", border: "1px solid #dbe3ef", borderRadius: "14px" }}>
              <table style={calendarRegisterTableStyle}>
                <thead>
                  <tr>
                    <th style={dateHeadStyle}>Date</th>
                    <th style={imsTableHeadStyle}>Type</th>
                    <th style={imsTableHeadStyle}>Event</th>
                    <th style={imsTableHeadStyle}>Owner</th>
                    <th style={imsTableHeadStyle}>Status</th>
                    <th style={imsTableHeadStyle}>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((event) => (
                    <tr
                      key={event.id}
                      onClick={() => openEvent(event)}
                      style={{ cursor: "pointer", background: selectedId === event.id ? imsColours.brandSoft : "white" }}
                    >
                      <td style={dateCellStyle}><strong style={dateValueStyle}>{displayDate(event.date)}</strong></td>
                      <td style={imsTableCellStyle}><SourcePill event={event} /></td>
                      <td style={imsTableCellStyle}>
                        <strong>{event.title}</strong>
                        <div style={mutedTextStyle}>{event.detail}</div>
                      </td>
                      <td style={imsTableCellStyle}>{event.owner || "-"}</td>
                      <td style={imsTableCellStyle}><StatusPill event={event} /></td>
                      <td style={imsTableCellStyle}>{event.sourceKind === "manual" ? "Planner" : "HSE system"}</td>
                    </tr>
                  ))}
                  {!filteredEvents.length ? (
                    <tr><td colSpan={6} style={imsTableCellStyle}>No calendar events match the current filters.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </ImsPanel>

          {selected ? (
            <ImsPanel
              title={`${selected.sourceKind === "manual" ? "Planner Detail" : "Source Detail"} - ${selected.title}`}
              subtitle={[sourceLabel(selected.source), displayDate(selected.date), selected.owner].filter(Boolean).join(" | ")}
              actions={<ImsButton variant="secondary" onClick={() => setSelectedId("")}>Hide Panel</ImsButton>}
            >
              {selectedPlanner ? (
                <>
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
                </>
              ) : (
                <SystemDetail event={selected} />
              )}
            </ImsPanel>
          ) : null}
        </div>
      ) : null}

      {activeView === "create" ? (
        <ImsPanel title="Create HSE Calendar Item" subtitle="Add holidays, events, training, meetings, reminders, and planned HSE work.">
          <HseEventFormFields
            form={createForm}
            people={people}
            onChange={setCreateForm}
            onPersonSelect={(value) => applyPerson(value, "create")}
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
            <ImsButton onClick={() => void createItem()}>Create Calendar Item</ImsButton>
            <ImsButton variant="secondary" onClick={() => setCreateForm(emptyForm)}>Clear Form</ImsButton>
          </div>
        </ImsPanel>
      ) : null}
    </main>
  );
}

function HseEventFormFields({
  form,
  people,
  onChange,
  onPersonSelect,
}: {
  form: PlannerForm;
  people: PersonOption[];
  onChange: (form: PlannerForm) => void;
  onPersonSelect: (value: string) => void;
}) {
  return (
    <div style={formGridStyle}>
      <Field label="Title">
        <input style={imsInputStyle} value={form.title} onChange={(event) => onChange({ ...form, title: event.target.value })} />
      </Field>
      <Field label="Event Type">
        <select
          style={imsInputStyle}
          value={form.planner_type}
          onChange={(event) => onChange({
            ...form,
            planner_type: event.target.value,
            frequency: "One-off",
            reminder_days: form.reminder_days || "14",
          })}
        >
          {hseEventTypes.map((option) => <option key={option}>{option}</option>)}
        </select>
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
      <Field label="Start Date">
        <input
          type="date"
          style={imsInputStyle}
          value={form.due_date}
          onChange={(event) => onChange({ ...form, due_date: event.target.value, next_due_date: form.next_due_date || event.target.value })}
        />
      </Field>
      <Field label="End Date">
        <input type="date" style={imsInputStyle} value={form.next_due_date} onChange={(event) => onChange({ ...form, next_due_date: event.target.value })} />
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
      <Field label="Location">
        <input style={imsInputStyle} value={form.location} onChange={(event) => onChange({ ...form, location: event.target.value })} />
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

function SystemDetail({ event }: { event: CalendarEvent }) {
  return (
    <div style={systemDetailStyle}>
      <div>
        <div style={fieldLabelStyle}>Source Type</div>
        <strong>{event.source}</strong>
      </div>
      <div>
        <div style={fieldLabelStyle}>Date</div>
        <strong>{displayDate(event.date)}</strong>
      </div>
      <div>
        <div style={fieldLabelStyle}>Status</div>
        <StatusPill event={event} />
      </div>
      <div>
        <div style={fieldLabelStyle}>Owner</div>
        <strong>{event.owner || "-"}</strong>
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <div style={fieldLabelStyle}>Detail</div>
        <p style={{ margin: "6px 0 0", color: imsColours.slate, lineHeight: 1.5 }}>{event.detail}</p>
      </div>
      <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
        {event.href ? <ImsLinkButton href={event.href}>Open Source Record</ImsLinkButton> : null}
      </div>
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

function SourcePill({ event }: { event: CalendarEvent }) {
  const accent = eventAccent(event.source, event.status);
  return <span style={{ ...pillStyle, background: `${accent}18`, color: accent }}>{sourceLabel(event.source)}</span>;
}

function StatusPill({ event }: { event: CalendarEvent }) {
  const accent = eventAccent(event.source, event.status);
  return <span style={{ ...pillStyle, background: `${accent}22`, color: accent }}>{event.status || "Scheduled"}</span>;
}

function EmptyState({ text }: { text: string }) {
  return <div style={{ border: "1px dashed #cbd5e1", borderRadius: "14px", padding: "16px", color: imsColours.slate, background: "#f8fafc" }}>{text}</div>;
}

function EventListButton({ event, onClick }: { event: CalendarEvent; onClick: () => void }) {
  return (
    <button type="button" style={listButtonStyle} onClick={onClick}>
      <span style={{ width: 10, height: 10, borderRadius: "999px", background: eventAccent(event.source, event.status) }} />
      <span style={{ minWidth: 0 }}>
        <strong style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{event.title}</strong>
        <span style={mutedTextStyle}>{event.detail}</span>
      </span>
      <SourcePill event={event} />
      <strong>{displayDate(event.date)}</strong>
    </button>
  );
}

function Legend() {
  const samples: Array<{ source: EventSource; status: string; label: string }> = [
    { source: "AINM", status: "Open", label: "AINM" },
    { source: "Inspection", status: "Open", label: "Inspection" },
    { source: "Observation", status: "New", label: "Observation" },
    { source: "HSE Action", status: "Scheduled", label: "Action" },
    { source: "Planner", status: "Scheduled", label: "Planner" },
  ];
  return (
    <div style={legendStyle}>
      {samples.map((sample) => (
        <span key={sample.label} style={legendItemStyle}>
          <span style={{ width: 9, height: 9, borderRadius: "999px", background: eventAccent(sample.source, sample.status) }} />
          {sample.label}
        </span>
      ))}
    </div>
  );
}

function MonthGrid({
  cursor,
  events,
  onSelect,
  onDateSelect,
  onCreateDate,
}: {
  cursor: Date;
  events: CalendarEvent[];
  onSelect: (event: CalendarEvent) => void;
  onDateSelect: (dateKey: string) => void;
  onCreateDate: (dateKey: string) => void;
}) {
  const month = cursor.getMonth();
  const year = cursor.getFullYear();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ key: string; day: number | null; events: CalendarEvent[] }> = [];

  for (let index = 0; index < startOffset; index += 1) cells.push({ key: `blank-${index}`, day: null, events: [] });
  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = toDateKey(new Date(year, month, day));
    cells.push({
      key,
      day,
      events: events.filter((event) => event.date === key),
    });
  }

  return (
    <div style={calendarGridStyle}>
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <div key={day} style={calendarHeadStyle}>{day}</div>)}
      {cells.map((cell) => (
        <div key={cell.key} style={cell.day ? calendarCellStyle : blankCalendarCellStyle}>
          {cell.day ? (
            <div style={calendarDayRowStyle}>
              <button type="button" style={calendarDayButtonStyle} onClick={() => onDateSelect(cell.key)} title="View all items on this date">
                {cell.day}
              </button>
              <button type="button" style={calendarAddButtonStyle} onClick={() => onCreateDate(cell.key)} title="Add a planner item for this date">
                +
              </button>
            </div>
          ) : null}
          <div style={{ display: "grid", gap: "5px", marginTop: "8px" }}>
            {cell.events.slice(0, 4).map((event) => (
              <button
                key={event.id}
                type="button"
                style={calendarEventStyle}
                onClick={(clickEvent) => {
                  clickEvent.stopPropagation();
                  onSelect(event);
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: "999px", background: eventAccent(event.source, event.status), flex: "0 0 auto" }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{event.title}</span>
              </button>
            ))}
            {cell.events.length > 4 ? (
              <button type="button" style={moreEventsButtonStyle} onClick={() => onDateSelect(cell.key)}>
                +{cell.events.length - 4} more
              </button>
            ) : null}
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

const systemDetailStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "14px",
  padding: "14px",
  border: "1px solid #dbe3ef",
  borderRadius: "14px",
  background: "#f8fafc",
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

const listStackStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
};

const listButtonStyle: CSSProperties = {
  width: "100%",
  display: "grid",
  gridTemplateColumns: "12px minmax(0, 1fr) auto auto",
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

const dateDetailStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
  marginTop: "16px",
  padding: "14px",
  border: "1px solid #dbe3ef",
  borderRadius: "14px",
  background: "#f8fafc",
};

const dateDetailHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
};

const activeFilterChipStyle: CSSProperties = {
  marginLeft: "8px",
  borderRadius: "999px",
  padding: "5px 9px",
  background: imsColours.brandSoft,
  color: imsColours.brandDark,
  border: "1px solid #D0D0CE",
  fontSize: "12px",
  fontWeight: 900,
};

const calendarRegisterTableStyle: CSSProperties = {
  ...imsTableStyle,
  minWidth: "980px",
  tableLayout: "fixed",
};

const dateHeadStyle: CSSProperties = {
  ...imsTableHeadStyle,
  width: "126px",
};

const dateCellStyle: CSSProperties = {
  ...imsTableCellStyle,
  width: "126px",
  whiteSpace: "nowrap",
  verticalAlign: "top",
};

const dateValueStyle: CSSProperties = {
  display: "block",
  lineHeight: 1.25,
};

const pillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "12px",
  fontWeight: 900,
  whiteSpace: "nowrap",
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
  border: "1px solid #D0D0CE",
  background: "#ECECE7",
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

const legendStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginBottom: "14px",
};

const legendItemStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  border: "1px solid #dbe3ef",
  borderRadius: "999px",
  padding: "6px 10px",
  background: "#f8fafc",
  color: imsColours.slate,
  fontSize: "12px",
  fontWeight: 900,
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

const blankCalendarCellStyle: CSSProperties = {
  ...calendarCellStyle,
  background: "#f8fafc",
};

const calendarDayRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "6px",
};

const calendarDayButtonStyle: CSSProperties = {
  border: "none",
  borderRadius: "999px",
  background: "#ECECE7",
  color: imsColours.brandDark,
  width: "30px",
  height: "30px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 900,
  cursor: "pointer",
};

const calendarAddButtonStyle: CSSProperties = {
  border: "1px solid #D0D0CE",
  borderRadius: "999px",
  background: "#ffffff",
  color: imsColours.brandDark,
  width: "28px",
  height: "28px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 900,
  cursor: "pointer",
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

const moreEventsButtonStyle: CSSProperties = {
  border: "none",
  background: "transparent",
  color: imsColours.brandDark,
  padding: "2px 0",
  textAlign: "left",
  fontSize: "12px",
  fontWeight: 900,
  cursor: "pointer",
};

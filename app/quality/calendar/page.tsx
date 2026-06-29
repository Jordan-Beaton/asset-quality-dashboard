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
type EventSource = "NCR" | "Audit" | "Audit Finding" | "Quality Action" | "Holiday" | "Event" | "Training" | "Meeting" | "Reminder";
type SourceKind = "system" | "manual";

type NcrRow = {
  id: string;
  ncr_number: string | null;
  title: string | null;
  status: string | null;
  owner: string | null;
  due_date: string | null;
  closed_at: string | null;
  created_at: string | null;
};

type AuditRow = {
  id: string;
  audit_number: string | null;
  title: string | null;
  audit_type: string | null;
  lead_auditor: string | null;
  audit_date: string | null;
  audit_month: string | null;
  status: string | null;
};

type AuditFindingRow = {
  id: string;
  audit_id: string | null;
  reference: string | null;
  category: string | null;
  description: string | null;
  owner: string | null;
  status: string | null;
  due_date: string | null;
  closure_date: string | null;
};

type ActionRow = {
  id: string;
  action_number: string | null;
  title: string | null;
  department: string | null;
  owner: string | null;
  priority: string | null;
  status: string | null;
  due_date: string | null;
  source: string | null;
  linked_audit_number?: string | null;
  linked_finding_reference?: string | null;
  linked_ncr_number?: string | null;
};

type ManualCalendarItem = {
  id: string;
  title: string;
  description: string | null;
  event_type: string | null;
  assigned_to: string | null;
  assigned_person_id: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  priority: string | null;
  location: string | null;
  notes: string | null;
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

type CalendarEvent = {
  id: string;
  sourceId: string;
  sourceKind: SourceKind;
  source: EventSource;
  title: string;
  date: string;
  endDate?: string;
  status: string;
  owner: string;
  priority: string;
  detail: string;
  href?: string;
  manual?: ManualCalendarItem;
};

type ManualForm = {
  title: string;
  description: string;
  event_type: string;
  assigned_to: string;
  assigned_person_id: string;
  start_date: string;
  end_date: string;
  status: string;
  priority: string;
  location: string;
  notes: string;
};

const viewTabs: Array<{ value: CalendarView; label: string }> = [
  { value: "dashboard", label: "Dashboard" },
  { value: "calendar", label: "Calendar" },
  { value: "register", label: "Register" },
  { value: "create", label: "Create Event" },
];

const manualEventTypes: EventSource[] = ["Holiday", "Event", "Training", "Meeting", "Reminder"];
const manualSourceFilter = "Holidays / Events";
const statusOptions = ["Scheduled", "In Progress", "Complete", "Cancelled"];
const priorityOptions = ["Low", "Medium", "High"];
const qualityCalendarPeople = ["Jordan Beaton", "Louise Harvey"];

const emptyForm: ManualForm = {
  title: "",
  description: "",
  event_type: "Event",
  assigned_to: "",
  assigned_person_id: "",
  start_date: "",
  end_date: "",
  status: "Scheduled",
  priority: "Medium",
  location: "",
  notes: "",
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

function daysUntil(value: string | null | undefined) {
  const date = parseDateKey(value);
  const today = parseDateKey(todayKey());
  if (!date || !today) return null;
  return Math.ceil((date.getTime() - today.getTime()) / 86400000);
}

function isClosedLike(status: string | null | undefined) {
  const clean = (status || "").trim().toLowerCase();
  return clean === "closed" || clean === "complete" || clean === "completed" || clean === "cancelled";
}

function dueStatus(date: string | null | undefined, status: string | null | undefined) {
  if (isClosedLike(status)) return status || "Complete";
  const diff = daysUntil(date);
  if (diff === null) return status || "Scheduled";
  if (diff < 0) return "Overdue";
  if (diff <= 7) return "Due Soon";
  return status || "Scheduled";
}

function clean(value: string) {
  return value.trim();
}

function hrefWithSearch(path: string, search: string | null | undefined) {
  return search ? `${path}?search=${encodeURIComponent(search)}` : path;
}

function ncrHref(ncr: NcrRow) {
  const params = new URLSearchParams();
  params.set("view", "register");
  if (ncr.id) params.set("ncrId", ncr.id);
  else if (ncr.ncr_number) params.set("ncr", ncr.ncr_number);
  return `/ncr-capa?${params.toString()}`;
}

function auditHref(audit: AuditRow) {
  return hrefWithSearch("/audits", audit.audit_number || audit.title || "");
}

function findingHref(finding: AuditFindingRow, view: "open-findings" | "closed-findings") {
  const params = new URLSearchParams();
  params.set("view", view);
  if (finding.id) params.set("findingId", finding.id);
  if (finding.reference) params.set("search", finding.reference);
  return `/audits?${params.toString()}`;
}

function actionHref(action: ActionRow) {
  const params = new URLSearchParams();
  if (action.id) params.set("actionId", action.id);
  if (action.action_number) params.set("search", action.action_number);
  return params.toString() ? `/quality/actions?${params.toString()}` : "/quality/actions";
}

function isQualityCalendarPerson(name: string | null | undefined) {
  return qualityCalendarPeople.includes((name || "").trim());
}

function qualityOwner(name: string | null | undefined) {
  return isQualityCalendarPerson(name) ? (name || "").trim() : "";
}

function normaliseManualType(value: string | null | undefined): EventSource {
  return manualEventTypes.includes(value as EventSource) ? (value as EventSource) : "Event";
}

function formFromManual(item: ManualCalendarItem): ManualForm {
  return {
    title: item.title || "",
    description: item.description || "",
    event_type: normaliseManualType(item.event_type),
    assigned_to: item.assigned_to || "",
    assigned_person_id: item.assigned_person_id || "",
    start_date: item.start_date || "",
    end_date: item.end_date || "",
    status: item.status || "Scheduled",
    priority: item.priority || "Medium",
    location: item.location || "",
    notes: item.notes || "",
  };
}

function payloadFromForm(form: ManualForm) {
  return {
    title: clean(form.title),
    description: clean(form.description) || null,
    event_type: clean(form.event_type) || "Event",
    assigned_to: clean(form.assigned_to) || null,
    assigned_person_id: clean(form.assigned_person_id) || null,
    start_date: clean(form.start_date),
    end_date: clean(form.end_date) || null,
    status: clean(form.status) || "Scheduled",
    priority: clean(form.priority) || "Medium",
    location: clean(form.location) || null,
    notes: clean(form.notes) || null,
    updated_at: new Date().toISOString(),
  };
}

function eventAccent(source: EventSource, status: string) {
  if (status === "Overdue") return imsColours.dangerBright;
  if (status === "Due Soon") return imsColours.warning;
  if (source === "NCR") return isClosedLike(status) ? imsColours.success : imsColours.dangerBright;
  if (source === "Audit") return imsColours.blue;
  if (source === "Audit Finding") return isClosedLike(status) ? imsColours.success : imsColours.purple;
  if (source === "Quality Action") return isClosedLike(status) ? imsColours.success : imsColours.warning;
  if (source === "Holiday") return imsColours.brand;
  if (source === "Training") return imsColours.purple;
  if (source === "Meeting") return imsColours.blue;
  if (source === "Reminder") return imsColours.slate;
  return imsColours.brandDark;
}

function sourceLabel(source: EventSource) {
  if (source === "Quality Action") return "Action";
  if (source === "Audit Finding") return "Finding";
  return source;
}

function buildEvents({
  ncrs,
  audits,
  findings,
  actions,
  manualItems,
}: {
  ncrs: NcrRow[];
  audits: AuditRow[];
  findings: AuditFindingRow[];
  actions: ActionRow[];
  manualItems: ManualCalendarItem[];
}) {
  const events: CalendarEvent[] = [];
  const auditById = new Map(audits.map((audit) => [audit.id, audit]));

  ncrs.forEach((ncr) => {
    const number = ncr.ncr_number || "NCR";
    if (ncr.due_date && !isClosedLike(ncr.status)) {
      events.push({
        id: `ncr-due-${ncr.id}`,
        sourceId: ncr.id,
        sourceKind: "system",
        source: "NCR",
        title: `${number} due`,
        date: dateOnly(ncr.due_date),
        status: dueStatus(ncr.due_date, ncr.status),
        owner: qualityOwner(ncr.owner),
        priority: "",
        detail: ncr.title || "NCR due date",
        href: ncrHref(ncr),
      });
    }
    if (ncr.closed_at) {
      events.push({
        id: `ncr-closed-${ncr.id}`,
        sourceId: ncr.id,
        sourceKind: "system",
        source: "NCR",
        title: `${number} closed`,
        date: dateOnly(ncr.closed_at),
        status: "Closed",
        owner: qualityOwner(ncr.owner),
        priority: "",
        detail: ncr.title || "NCR closure date",
        href: ncrHref(ncr),
      });
    }
  });

  audits.forEach((audit) => {
    const number = audit.audit_number || "Audit";
    const auditDate = dateOnly(audit.audit_date) || (audit.audit_month ? `${audit.audit_month}-01` : "");
    if (!auditDate) return;
    events.push({
      id: `audit-${audit.id}`,
      sourceId: audit.id,
      sourceKind: "system",
      source: "Audit",
      title: `${number} audit`,
      date: auditDate,
      status: dueStatus(auditDate, audit.status),
      owner: qualityOwner(audit.lead_auditor),
      priority: "",
      detail: [audit.title, audit.audit_type].filter(Boolean).join(" | ") || "Audit date",
      href: auditHref(audit),
    });
  });

  findings.forEach((finding) => {
    const audit = finding.audit_id ? auditById.get(finding.audit_id) : null;
    const ref = finding.reference || "Finding";
    if (finding.due_date && !isClosedLike(finding.status)) {
      events.push({
        id: `finding-due-${finding.id}`,
        sourceId: finding.id,
        sourceKind: "system",
        source: "Audit Finding",
        title: `${ref} due`,
        date: dateOnly(finding.due_date),
        status: dueStatus(finding.due_date, finding.status),
        owner: qualityOwner(finding.owner),
        priority: finding.category || "",
        detail: [audit?.audit_number, finding.description].filter(Boolean).join(" | ") || "Audit finding due date",
        href: findingHref(finding, "open-findings"),
      });
    }
    if (finding.closure_date) {
      events.push({
        id: `finding-closed-${finding.id}`,
        sourceId: finding.id,
        sourceKind: "system",
        source: "Audit Finding",
        title: `${ref} closed`,
        date: dateOnly(finding.closure_date),
        status: "Closed",
        owner: qualityOwner(finding.owner),
        priority: finding.category || "",
        detail: [audit?.audit_number, finding.description].filter(Boolean).join(" | ") || "Audit finding closure date",
        href: findingHref(finding, "closed-findings"),
      });
    }
  });

  actions.forEach((action) => {
    if (!action.due_date) return;
    const department = (action.department || "").trim().toLowerCase();
    if (department !== "quality") return;
    const number = action.action_number || "Action";
    events.push({
      id: `action-${action.id}`,
      sourceId: action.id,
      sourceKind: "system",
      source: "Quality Action",
      title: `${number} due`,
      date: dateOnly(action.due_date),
      status: dueStatus(action.due_date, action.status),
      owner: qualityOwner(action.owner),
      priority: action.priority || "",
      detail: [action.title, action.source].filter(Boolean).join(" | ") || "Quality action due date",
      href: actionHref(action),
    });
  });

  manualItems.forEach((item) => {
    if (!item.start_date) return;
    const source = normaliseManualType(item.event_type);
    events.push({
      id: `manual-${item.id}`,
      sourceId: item.id,
      sourceKind: "manual",
      source,
      title: item.title,
      date: dateOnly(item.start_date),
      endDate: dateOnly(item.end_date),
      status: item.status || "Scheduled",
      owner: qualityOwner(item.assigned_to),
      priority: item.priority || "",
      detail: item.description || item.location || item.notes || `${source} calendar item`,
      manual: item,
    });
  });

  return events.filter((event) => event.date).sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

export default function QualityCalendarPage() {
  const router = useRouter();
  const [manualItems, setManualItems] = useState<ManualCalendarItem[]>([]);
  const [people, setPeople] = useState<PersonOption[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [activeView, setActiveView] = useState<CalendarView>("dashboard");
  const [message, setMessage] = useState("Loading Quality calendar...");
  const [loading, setLoading] = useState(false);
  const [refreshStamp, setRefreshStamp] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [createForm, setCreateForm] = useState<ManualForm>(emptyForm);
  const [detailForm, setDetailForm] = useState<ManualForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sourceFilter, setSourceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [selectedDateKey, setSelectedDateKey] = useState("");
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const selected = useMemo(() => events.find((event) => event.id === selectedId) || null, [events, selectedId]);

  useEffect(() => {
    if (selected?.manual) setDetailForm(formFromManual(selected.manual));
  }, [selected]);

  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);

  const filteredEvents = useMemo(() => {
    const text = search.trim().toLowerCase();
    return events.filter((event) => {
      if (sourceFilter === manualSourceFilter && event.sourceKind !== "manual") return false;
      if (sourceFilter && sourceFilter !== manualSourceFilter && event.source !== sourceFilter) return false;
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
    audits: events.filter((event) => event.source === "Audit").length,
    ncrs: events.filter((event) => event.source === "NCR").length,
    findings: events.filter((event) => event.source === "Audit Finding").length,
    actions: events.filter((event) => event.source === "Quality Action" && !isClosedLike(event.status)).length,
    overdue: overdueEvents.length,
    manual: events.filter((event) => event.sourceKind === "manual").length,
  }), [events, overdueEvents.length]);

  async function loadData() {
    setLoading(true);
    const [manualRes, ncrRes, auditRes, findingRes, actionRes, peopleRes] = await Promise.all([
      supabase.from("quality_calendar_items").select("*").order("start_date", { ascending: true }),
      supabase.from("ncrs").select("id,ncr_number,title,status,owner,due_date,closed_at,created_at").order("created_at", { ascending: false }),
      supabase.from("audits").select("id,audit_number,title,audit_type,lead_auditor,audit_date,audit_month,status").order("audit_date", { ascending: false }),
      supabase.from("audit_findings").select("id,audit_id,reference,category,description,owner,status,due_date,closure_date").order("due_date", { ascending: true }),
      supabase.from("actions").select("id,action_number,title,department,owner,priority,status,due_date,source,linked_audit_number,linked_finding_reference,linked_ncr_number"),
      supabase
        .from("people")
        .select("id,name,email,role,department,active")
        .eq("active", true)
        .in("name", qualityCalendarPeople)
        .order("name", { ascending: true }),
    ]);

    const warnings = [ncrRes, auditRes, findingRes, actionRes]
      .filter((result) => result.error)
      .map((result) => result.error?.message)
      .filter(Boolean);

    const nextManualItems = manualRes.error ? [] : ((manualRes.data || []) as ManualCalendarItem[]);
    setManualItems(nextManualItems);
    if (!peopleRes.error) setPeople((peopleRes.data || []) as PersonOption[]);

    const nextEvents = buildEvents({
      manualItems: nextManualItems,
      ncrs: (ncrRes.data || []) as NcrRow[],
      audits: (auditRes.data || []) as AuditRow[],
      findings: (findingRes.data || []) as AuditFindingRow[],
      actions: (actionRes.data || []) as ActionRow[],
    });
    setEvents(nextEvents);
    if (!selectedId && nextEvents[0]) setSelectedId(nextEvents[0].id);

    if (manualRes.error) {
      setMessage(`Quality calendar manual table not ready: ${manualRes.error.message}. Run scripts/sql/quality_calendar_items.sql in Supabase.`);
    } else if (warnings.length) {
      setMessage(`Loaded ${nextEvents.length} calendar events with source warnings: ${warnings.join(" | ")}`);
    } else {
      setMessage(`Loaded ${nextEvents.length} Quality calendar event${nextEvents.length === 1 ? "" : "s"}.`);
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

  async function createItem() {
    if (!clean(createForm.title) || !clean(createForm.start_date)) {
      setMessage("Status: Add a title and start date before saving.");
      return;
    }
    const { error } = await supabase.from("quality_calendar_items").insert([payloadFromForm(createForm)]);
    if (error) {
      setMessage(`Status: Quality calendar item could not be saved: ${error.message}`);
      return;
    }
    setCreateForm(emptyForm);
    setMessage("Status: Quality calendar item created.");
    await loadData();
    setActiveView("register");
  }

  async function updateItem() {
    if (!selected?.manual) return;
    if (!clean(detailForm.title) || !clean(detailForm.start_date)) {
      setMessage("Status: Add a title and start date before saving.");
      return;
    }
    const { error } = await supabase.from("quality_calendar_items").update(payloadFromForm(detailForm)).eq("id", selected.manual.id);
    if (error) {
      setMessage(`Status: Quality calendar item could not be updated: ${error.message}`);
      return;
    }
    setMessage("Status: Quality calendar item updated.");
    await loadData();
  }

  async function deleteItem() {
    if (!selected?.manual) return;
    if (!window.confirm(`Delete ${selected.title}?`)) return;
    const { error } = await supabase.from("quality_calendar_items").delete().eq("id", selected.manual.id);
    if (error) {
      setMessage(`Status: Quality calendar item could not be deleted: ${error.message}`);
      return;
    }
    setSelectedId("");
    setMessage("Status: Quality calendar item deleted.");
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
    setSelectedId(event.id);
    setActiveView("register");
  }

  return (
    <main>
      <QualityPageHero
        label="QUALITY MANAGEMENT"
        title="Quality Calendar"
        description="Live Quality timeline for NCR closure pressure, audits, audit findings, Quality actions, holidays, and local events."
        contextCards={[
          { label: "Last Refreshed", value: refreshStamp || "Loading" },
          { label: "Next Event", value: nextEvent ? `${displayDate(nextEvent.date)} - ${nextEvent.title}` : "No upcoming event" },
        ]}
      />

      <ImsTopMetaRow
        backHref="/quality"
        status={<><strong>Status:</strong> {loading ? "Loading..." : message}</>}
        actions={<ImsButton onClick={() => void loadData()} disabled={loading}>Refresh</ImsButton>}
      />

      <ImsTabs tabs={viewTabs} active={activeView} onChange={setActiveView} ariaLabel="Quality calendar views" />

      {activeView === "dashboard" ? (
        <div style={{ display: "grid", gap: "20px" }}>
          <section style={kpiGridStyle}>
            <QualityKpiCard title="Audit Dates" value={kpis.audits} accent={imsColours.blue} onClick={() => openFilteredRegister("Audit")} />
            <QualityKpiCard title="NCR Dates" value={kpis.ncrs} accent={imsColours.dangerBright} onClick={() => openFilteredRegister("NCR")} />
            <QualityKpiCard title="Audit Findings" value={kpis.findings} accent={imsColours.purple} onClick={() => openFilteredRegister("Audit Finding")} />
            <QualityKpiCard title="Open Actions" value={kpis.actions} accent={imsColours.warning} onClick={() => openFilteredRegister("Quality Action")} />
            <QualityKpiCard title="Overdue" value={kpis.overdue} accent={imsColours.dangerBright} onClick={() => openFilteredRegister("", "Overdue")} />
            <QualityKpiCard title="Holidays / Events" value={kpis.manual} accent={imsColours.brand} onClick={() => openFilteredRegister(manualSourceFilter)} />
          </section>

          <section style={dashboardGridStyle}>
            <ImsPanel title="Upcoming Quality Dates" subtitle="Next 30 days across NCRs, audits, findings, actions, and manual events.">
              <div style={listStackStyle}>
                {upcomingEvents.slice(0, 8).map((event) => (
                  <EventListButton key={event.id} event={event} onClick={() => openEvent(event)} />
                ))}
                {!upcomingEvents.length ? <EmptyState text="No Quality calendar events due in the next 30 days." /> : null}
              </div>
            </ImsPanel>

            <ImsPanel title="Management Attention" subtitle="Overdue NCR, finding, and Quality action dates highlighted from source records.">
              <div style={listStackStyle}>
                {overdueEvents.slice(0, 8).map((event) => (
                  <EventListButton key={event.id} event={event} onClick={() => openEvent(event)} />
                ))}
                {!overdueEvents.length ? <EmptyState text="No overdue Quality calendar events." /> : null}
              </div>
            </ImsPanel>
          </section>
        </div>
      ) : null}

      {activeView === "calendar" ? (
        <ImsPanel title="Calendar View" subtitle="Month view of live Quality records and manually planned holidays or events.">
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
              setCreateForm((current) => ({ ...current, start_date: dateKey, end_date: "" }));
              setActiveView("create");
            }}
            onSelect={(event) => {
              openEvent(event);
            }}
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
                    setCreateForm((current) => ({ ...current, start_date: selectedDateKey, end_date: "" }));
                    setActiveView("create");
                  }}
                >
                  + Add Item
                </ImsButton>
              </div>
              <div style={listStackStyle}>
                {filteredEvents
                  .filter((event) => event.date === selectedDateKey || (event.endDate && event.date <= selectedDateKey && event.endDate >= selectedDateKey))
                  .map((event) => <EventListButton key={event.id} event={event} onClick={() => openEvent(event)} />)}
                {!filteredEvents.some((event) => event.date === selectedDateKey || (event.endDate && event.date <= selectedDateKey && event.endDate >= selectedDateKey)) ? (
                  <EmptyState text="No Quality calendar items are logged on this date." />
                ) : null}
              </div>
            </div>
          ) : null}
        </ImsPanel>
      ) : null}

      {activeView === "register" ? (
        <div style={{ display: "grid", gap: "16px" }}>
          <ImsPanel title="Quality Calendar Register" subtitle="Search and filter live Quality dates and editable manual calendar items.">
            <ImsFilterPanel
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search title, owner, source, status or detail"
              showFilters={showFilters}
              onToggleFilters={() => setShowFilters((value) => !value)}
              actions={<ImsButton variant="secondary" onClick={clearRegisterFilters}>Clear Filters</ImsButton>}
            >
              <FilterSelect label="Type" value={sourceFilter} onChange={setSourceFilter} options={["NCR", "Audit", "Audit Finding", "Quality Action", manualSourceFilter, ...manualEventTypes]} emptyLabel="All Types" />
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
                      <td style={dateCellStyle}>
                        <strong style={dateValueStyle}>{displayDate(event.date)}</strong>
                        {event.endDate ? <span style={dateRangeStyle}>to {displayDate(event.endDate)}</span> : null}
                      </td>
                      <td style={imsTableCellStyle}><SourcePill event={event} /></td>
                      <td style={imsTableCellStyle}>
                        <strong>{event.title}</strong>
                        <div style={mutedTextStyle}>{event.detail}</div>
                      </td>
                      <td style={imsTableCellStyle}>{event.owner || "-"}</td>
                      <td style={imsTableCellStyle}><StatusPill event={event} /></td>
                      <td style={imsTableCellStyle}>{event.sourceKind === "manual" ? "Calendar" : "Quality system"}</td>
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
              title={`${selected.sourceKind === "manual" ? "Calendar Detail" : "Source Detail"} - ${selected.title}`}
              subtitle={[sourceLabel(selected.source), displayDate(selected.date), selected.owner].filter(Boolean).join(" | ")}
              actions={<ImsButton variant="secondary" onClick={() => setSelectedId("")}>Hide Panel</ImsButton>}
            >
              {selected.manual ? (
                <>
                  <ManualFormFields
                    form={detailForm}
                    people={people}
                    onChange={setDetailForm}
                    onPersonSelect={(value) => applyPerson(value, "detail")}
                  />
                  <div style={formActionRowStyle}>
                    <ImsButton onClick={() => void updateItem()}>Save Calendar Item</ImsButton>
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
        <ImsPanel title="Create Quality Calendar Item" subtitle="Add holidays, leave, events, training, meetings, and local Quality reminders.">
          <ManualFormFields
            form={createForm}
            people={people}
            onChange={setCreateForm}
            onPersonSelect={(value) => applyPerson(value, "create")}
          />
          <div style={formActionRowStyle}>
            <ImsButton onClick={() => void createItem()}>Create Calendar Item</ImsButton>
            <ImsButton variant="secondary" onClick={() => setCreateForm(emptyForm)}>Clear Form</ImsButton>
          </div>
        </ImsPanel>
      ) : null}
    </main>
  );
}

function ManualFormFields({
  form,
  people,
  onChange,
  onPersonSelect,
}: {
  form: ManualForm;
  people: PersonOption[];
  onChange: (form: ManualForm) => void;
  onPersonSelect: (value: string) => void;
}) {
  return (
    <div style={formGridStyle}>
      <Field label="Title">
        <input style={imsInputStyle} value={form.title} onChange={(event) => onChange({ ...form, title: event.target.value })} />
      </Field>
      <Field label="Event Type">
        <select style={imsInputStyle} value={form.event_type} onChange={(event) => onChange({ ...form, event_type: event.target.value })}>
          {manualEventTypes.map((option) => <option key={option}>{option}</option>)}
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
        <input type="date" style={imsInputStyle} value={form.start_date} onChange={(event) => onChange({ ...form, start_date: event.target.value })} />
      </Field>
      <Field label="End Date">
        <input type="date" style={imsInputStyle} value={form.end_date} onChange={(event) => onChange({ ...form, end_date: event.target.value })} />
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
        <textarea style={{ ...imsInputStyle, minHeight: "92px", resize: "vertical", lineHeight: 1.45 }} value={form.description} onChange={(event) => onChange({ ...form, description: event.target.value })} />
      </Field>
      <Field label="Notes" span>
        <textarea style={{ ...imsInputStyle, minHeight: "92px", resize: "vertical", lineHeight: 1.45 }} value={form.notes} onChange={(event) => onChange({ ...form, notes: event.target.value })} />
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
  return (
    <span style={{ ...pillStyle, background: `${accent}18`, color: accent }}>
      {sourceLabel(event.source)}
    </span>
  );
}

function StatusPill({ event }: { event: CalendarEvent }) {
  const accent = eventAccent(event.source, event.status);
  return (
    <span style={{ ...pillStyle, background: `${accent}22`, color: accent }}>
      {event.status || "Scheduled"}
    </span>
  );
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
    { source: "NCR", status: "Open", label: "NCR" },
    { source: "Audit", status: "Scheduled", label: "Audit" },
    { source: "Audit Finding", status: "Open", label: "Finding" },
    { source: "Quality Action", status: "Scheduled", label: "Action" },
    { source: "Holiday", status: "Scheduled", label: "Holiday" },
    { source: "Event", status: "Scheduled", label: "Event" },
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
      events: events.filter((event) => event.date === key || (event.endDate && event.date <= key && event.endDate >= key)),
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
              <button type="button" style={calendarAddButtonStyle} onClick={() => onCreateDate(cell.key)} title="Add a calendar item for this date">
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
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
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
  border: "1px solid #bfe5e3",
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

const dateRangeStyle: CSSProperties = {
  display: "block",
  color: imsColours.slate,
  fontSize: "12px",
  fontWeight: 700,
  marginTop: "4px",
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

const calendarDayRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "6px",
};

const calendarAddButtonStyle: CSSProperties = {
  border: "1px solid #bfe5e3",
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

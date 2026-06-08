"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ImsButton, ImsTopMetaRow } from "../../src/components/ImsPrimitives";
import { imsColours, imsPanelStyle } from "../../src/components/imsTheme";
import { QualityKpiCard } from "../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../src/components/QualityPageHero";
import { supabase } from "../../src/lib/supabase";

export const dynamic = "force-dynamic";

type AinmRecord = {
  id: string;
  ainm_number: string | null;
  title: string | null;
  project: string | null;
  event_date: string | null;
  event_classification: string | null;
  overall_status: string | null;
  notification_status: string | null;
  part1_status: string | null;
  part2_status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type HseInspectionRecord = {
  id: string;
  inspection_number: string | null;
  title: string | null;
  form_title: string | null;
  status: string | null;
  inspection_date: string | null;
  created_at: string | null;
};

type HseAction = {
  id: string;
  action_number: string | null;
  title: string | null;
  department: string | null;
  source: string | null;
  owner: string | null;
  priority: string | null;
  status: string | null;
  due_date: string | null;
  created_at: string | null;
  linked_ainm_number?: string | null;
  linked_hse_inspection_number?: string | null;
};

type CalendarItem = {
  id: string;
  title: string | null;
  status: string | null;
  assigned_to: string | null;
  frequency: string | null;
  due_date: string | null;
  next_due_date: string | null;
  inspection_form_ref: string | null;
  created_at: string | null;
};

type GeneratedReport = {
  id: string;
  ainm_id: string | null;
  file_name: string | null;
  generated_at: string | null;
};

function normalise(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function isClosed(value: string | null | undefined) {
  const status = normalise(value);
  return status === "closed" || status === "complete" || status === "completed";
}

function isOpen(value: string | null | undefined) {
  return !isClosed(value) && normalise(value) !== "cancelled";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
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

function getTimestamp(value: string | null | undefined) {
  const time = new Date(value || 0).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function daysUntil(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  date.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86400000);
}

function dueDate(item: CalendarItem) {
  return item.next_due_date || item.due_date || null;
}

function effectiveCalendarStatus(item: CalendarItem) {
  if (normalise(item.status) === "complete" || normalise(item.status) === "paused") return item.status || "Scheduled";
  const diff = daysUntil(dueDate(item));
  if (diff === null) return item.status || "Scheduled";
  if (diff < 0) return "Overdue";
  if (diff <= 7) return "Due Soon";
  return item.status || "Scheduled";
}

function monthKey(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-");
  if (!year || !month) return key;
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

function buildHref(path: string, params?: Record<string, string | number | null | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

function ainmType(record: Pick<AinmRecord, "ainm_number" | "event_classification">) {
  const ref = (record.ainm_number || "").trim().toUpperCase();
  if (ref.startsWith("AR")) return "Accident";
  if (ref.startsWith("IR")) return "Incident";
  const classification = normalise(record.event_classification);
  if (classification.includes("accident")) return "Accident";
  return "Incident";
}

const chartColours = {
  teal: imsColours.brand,
  blue: imsColours.blue,
  purple: imsColours.purple,
  amber: imsColours.warning,
  red: imsColours.dangerBright,
  green: imsColours.success,
  slate: imsColours.slate,
};

export default function HseDashboardPage() {
  const router = useRouter();
  const [ainms, setAinms] = useState<AinmRecord[]>([]);
  const [inspections, setInspections] = useState<HseInspectionRecord[]>([]);
  const [actions, setActions] = useState<HseAction[]>([]);
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([]);
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [refreshDate, setRefreshDate] = useState<Date | null>(null);
  const [message, setMessage] = useState("Loading HSE dashboard...");
  const [loading, setLoading] = useState(false);
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    const [ainmRes, inspectionRes, actionRes, calendarRes, reportRes] = await Promise.all([
      supabase.from("hse_ainm_records").select("id,ainm_number,title,project,event_date,event_classification,overall_status,notification_status,part1_status,part2_status,created_at,updated_at").order("event_date", { ascending: false }),
      supabase.from("hse_inspection_records").select("id,inspection_number,title,form_title,status,inspection_date,created_at").order("inspection_date", { ascending: false }),
      supabase.from("actions").select("id,action_number,title,department,source,owner,priority,status,due_date,created_at,linked_ainm_number,linked_hse_inspection_number").order("due_date", { ascending: true }),
      supabase.from("hse_calendar_items").select("id,title,status,assigned_to,frequency,due_date,next_due_date,inspection_form_ref,created_at").order("next_due_date", { ascending: true }),
      supabase.from("hse_ainm_generated_documents").select("id,ainm_id,file_name,generated_at").order("generated_at", { ascending: false }),
    ]);

    const warnings = [ainmRes, inspectionRes, actionRes, calendarRes, reportRes]
      .map((result) => result.error?.message)
      .filter(Boolean);

    if (!ainmRes.error) setAinms((ainmRes.data || []) as AinmRecord[]);
    if (!inspectionRes.error) setInspections((inspectionRes.data || []) as HseInspectionRecord[]);
    if (!actionRes.error) {
      setActions(((actionRes.data || []) as HseAction[]).filter((action) => normalise(action.department) === "hse"));
    }
    if (!calendarRes.error) setCalendarItems((calendarRes.data || []) as CalendarItem[]);
    if (!reportRes.error) setReports((reportRes.data || []) as GeneratedReport[]);

    setRefreshDate(new Date());
    setMessage(warnings.length ? `Loaded with warning: ${warnings[0]}` : "HSE dashboard ready.");
    setLoading(false);
  }

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    [ainms.map((item) => item.event_date), inspections.map((item) => item.inspection_date), actions.map((item) => item.due_date), calendarItems.map((item) => dueDate(item))]
      .flat()
      .forEach((value) => {
        if (value) years.add(String(new Date(value).getFullYear()));
      });
    years.add(String(new Date().getFullYear()));
    return [...years].filter((year) => year !== "NaN").sort((a, b) => Number(b) - Number(a));
  }, [actions, ainms, calendarItems, inspections]);

  const yearAinms = useMemo(() => ainms.filter((record) => !yearFilter || String(new Date(record.event_date || record.created_at || "").getFullYear()) === yearFilter), [ainms, yearFilter]);
  const yearInspections = useMemo(() => inspections.filter((record) => !yearFilter || String(new Date(record.inspection_date || record.created_at || "").getFullYear()) === yearFilter), [inspections, yearFilter]);
  const hseOpenActions = useMemo(() => actions.filter((action) => isOpen(action.status)), [actions]);
  const overdueActions = useMemo(() => hseOpenActions.filter((action) => {
    const diff = daysUntil(action.due_date);
    return diff !== null && diff < 0;
  }), [hseOpenActions]);
  const dueWeekActions = useMemo(() => hseOpenActions.filter((action) => {
    const diff = daysUntil(action.due_date);
    return diff !== null && diff >= 0 && diff <= 7;
  }), [hseOpenActions]);
  const calendarOverdue = useMemo(() => calendarItems.filter((item) => effectiveCalendarStatus(item) === "Overdue"), [calendarItems]);
  const calendarUpcoming = useMemo(() => calendarItems.filter((item) => {
    const diff = daysUntil(dueDate(item));
    return diff !== null && diff >= 0 && diff <= 30 && effectiveCalendarStatus(item) !== "Complete";
  }), [calendarItems]);
  const openAinms = useMemo(() => ainms.filter((record) => isOpen(record.overall_status)), [ainms]);
  const openInspections = useMemo(() => inspections.filter((record) => isOpen(record.status)), [inspections]);

  const latestRecord = useMemo(() => {
    const candidates = [
      ...ainms.map((record) => ({ label: `${record.ainm_number || "AINM"} - ${record.title || "AINM"}`, time: getTimestamp(record.updated_at || record.event_date || record.created_at) })),
      ...inspections.map((record) => ({ label: `${record.inspection_number || "Inspection"} - ${record.form_title || record.title || "Inspection"}`, time: getTimestamp(record.inspection_date || record.created_at) })),
      ...actions.map((action) => ({ label: `${action.action_number || "Action"} - ${action.title || "Action"}`, time: getTimestamp(action.created_at || action.due_date) })),
    ];
    return candidates.sort((a, b) => b.time - a.time)[0]?.label || "No HSE records yet";
  }, [actions, ainms, inspections]);

  const ainmSplitData = useMemo(() => {
    const accident = yearAinms.filter((record) => ainmType(record) === "Accident").length;
    const incident = yearAinms.filter((record) => ainmType(record) === "Incident").length;
    return [
      { name: "Incidents", value: incident, fill: chartColours.blue },
      { name: "Accidents", value: accident, fill: chartColours.red },
    ];
  }, [yearAinms]);

  const ainmStatusData = useMemo(() => {
    const open = yearAinms.filter((record) => isOpen(record.overall_status)).length;
    const closed = yearAinms.filter((record) => isClosed(record.overall_status)).length;
    return [
      { name: "Open", value: open, fill: chartColours.red },
      { name: "Closed", value: closed, fill: chartColours.green },
    ];
  }, [yearAinms]);

  const inspectionStatusData = useMemo(() => {
    const buckets = ["Draft", "Open", "Complete", "Closed"].map((status) => ({
      name: status,
      value: yearInspections.filter((record) => normalise(record.status) === status.toLowerCase()).length,
    }));
    return buckets.filter((bucket) => bucket.value > 0);
  }, [yearInspections]);

  const actionPressureData = useMemo(() => [
    { name: "Overdue", value: overdueActions.length, fill: chartColours.red },
    { name: "Due 7 Days", value: dueWeekActions.length, fill: chartColours.amber },
    { name: "Open", value: hseOpenActions.length, fill: chartColours.blue },
  ], [dueWeekActions.length, hseOpenActions.length, overdueActions.length]);

  const calendarPressureData = useMemo(() => [
    { name: "Overdue", value: calendarOverdue.length, fill: chartColours.red },
    { name: "Due 30 Days", value: calendarUpcoming.length, fill: chartColours.amber },
    { name: "Scheduled", value: calendarItems.filter((item) => effectiveCalendarStatus(item) === "Scheduled").length, fill: chartColours.teal },
  ], [calendarItems, calendarOverdue.length, calendarUpcoming.length]);

  const ainmTrendData = useMemo(() => {
    const months = new Map<string, { month: string; incidents: number; accidents: number }>();
    yearAinms.forEach((record) => {
      const key = monthKey(record.event_date || record.created_at);
      if (!key) return;
      if (!months.has(key)) months.set(key, { month: monthLabel(key), incidents: 0, accidents: 0 });
      const row = months.get(key);
      if (!row) return;
      if (ainmType(record) === "Accident") row.accidents += 1;
      else row.incidents += 1;
    });
    return [...months.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value).slice(-12);
  }, [yearAinms]);

  const actionOwnerData = useMemo(() => {
    const owners = new Map<string, number>();
    hseOpenActions.forEach((action) => {
      const owner = action.owner || "Unassigned";
      owners.set(owner, (owners.get(owner) || 0) + 1);
    });
    return [...owners.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [hseOpenActions]);

  return (
    <main>
      <QualityPageHero
        label="HSE MANAGEMENT"
        title="HSE Dashboard"
        description="Management view of HSE performance across AINMs, inspections, department actions, calendar pressure, and generated reports."
        contextCards={[
          { label: "Last Refreshed", value: formatDateTime(refreshDate) },
          { label: "Latest HSE Record", value: latestRecord },
        ]}
      />

      <ImsTopMetaRow
        backHref="/home"
        backLabel="Back to Home"
        actions={
          <>
            <label style={yearFilterStyle}>
              <span>Year</span>
              <select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}>
                {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>
            <ImsButton onClick={() => void loadDashboard()} disabled={loading}>Refresh</ImsButton>
          </>
        }
        status={<><strong>Status:</strong> {loading ? "Loading..." : message}</>}
      />

      <section style={kpiGridStyle}>
        <QualityKpiCard title="Open AINMs" value={openAinms.length} accent={chartColours.red} onClick={() => router.push(buildHref("/hse/ainm", { status: "Open" }))} />
        <QualityKpiCard title={`${yearFilter} Incidents`} value={ainmSplitData[0]?.value || 0} accent={chartColours.blue} onClick={() => router.push(buildHref("/hse/ainm", { type: "Incident", year: yearFilter }))} />
        <QualityKpiCard title={`${yearFilter} Accidents`} value={ainmSplitData[1]?.value || 0} accent={chartColours.red} onClick={() => router.push(buildHref("/hse/ainm", { type: "Accident", year: yearFilter }))} />
        <QualityKpiCard title="Open Inspections" value={openInspections.length} accent={chartColours.teal} onClick={() => router.push("/hse/inspections?view=register")} />
        <QualityKpiCard title="Open HSE Actions" value={hseOpenActions.length} accent={chartColours.purple} onClick={() => router.push("/hse/actions?view=register")} />
        <QualityKpiCard title="Calendar Overdue" value={calendarOverdue.length} accent={chartColours.amber} onClick={() => router.push("/hse/calendar")} />
      </section>

      <section style={storyGridStyle}>
        <SectionCard title="AINM Incident / Accident Split" subtitle={`Accident versus incident profile for ${yearFilter}.`} href={buildHref("/hse/ainm", { year: yearFilter })}>
          <ChartFrame>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={ainmSplitData} dataKey="value" innerRadius={58} outerRadius={88} paddingAngle={3}>
                  {ainmSplitData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartFrame>
        </SectionCard>

        <SectionCard title="AINM Closure Mix" subtitle="Open versus closed Accident, Incident and Near Miss records." href="/hse/ainm">
          <ChartFrame>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={ainmStatusData} dataKey="value" innerRadius={58} outerRadius={88} paddingAngle={3}>
                  {ainmStatusData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartFrame>
        </SectionCard>

        <SectionCard title="AINM Trend" subtitle="Monthly incident and accident movement." href={buildHref("/hse/ainm", { year: yearFilter })}>
          <ChartFrame>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ainmTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="incidents" name="Incidents" stroke={chartColours.blue} strokeWidth={3} />
                <Line type="monotone" dataKey="accidents" name="Accidents" stroke={chartColours.red} strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </ChartFrame>
        </SectionCard>

        <SectionCard title="Inspection Status" subtitle="Current inspection register profile." href="/hse/inspections?view=register">
          <ChartFrame>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inspectionStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Inspections" radius={[8, 8, 0, 0]} fill={chartColours.teal} />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        </SectionCard>

        <SectionCard title="HSE Action Pressure" subtitle="Department HSE action urgency." href="/hse/actions">
          <ChartFrame>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={actionPressureData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Actions" radius={[8, 8, 0, 0]}>
                  {actionPressureData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        </SectionCard>

        <SectionCard title="Open Actions by Person" subtitle="Who currently carries HSE action load." href="/hse/actions?view=register">
          <ChartFrame>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={actionOwnerData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={110} />
                <Tooltip />
                <Bar dataKey="value" name="Open actions" radius={[0, 8, 8, 0]} fill={chartColours.purple} />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        </SectionCard>

        <SectionCard title="Calendar Pressure" subtitle="Recurring inspections and HSE planner items." href="/hse/calendar">
          <ChartFrame>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={calendarPressureData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Calendar items" radius={[8, 8, 0, 0]}>
                  {calendarPressureData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        </SectionCard>

        <SectionCard title="Upcoming HSE Focus" subtitle="Overdue and upcoming planner items needing attention." href="/hse/calendar">
          <div style={focusListStyle}>
            {[...calendarOverdue, ...calendarUpcoming].slice(0, 8).map((item) => (
              <Link key={item.id} href="/hse/calendar" style={focusItemStyle}>
                <span>
                  <strong>{item.title}</strong>
                  <small>{[item.inspection_form_ref, item.assigned_to, item.frequency].filter(Boolean).join(" | ")}</small>
                </span>
                <strong>{formatDate(dueDate(item))}</strong>
              </Link>
            ))}
            {!calendarOverdue.length && !calendarUpcoming.length ? <div style={emptyStateStyle}>No overdue or upcoming calendar pressure.</div> : null}
          </div>
        </SectionCard>

      </section>
    </main>
  );
}

function SectionCard({ title, subtitle, href, children }: { title: string; subtitle?: string; href?: string; children: ReactNode }) {
  const content = (
    <section style={sectionCardStyle}>
      <div style={sectionHeaderStyle}>
        <div>
          <h2 style={sectionTitleStyle}>{title}</h2>
          {subtitle ? <p style={sectionSubtitleStyle}>{subtitle}</p> : null}
        </div>
        {href ? <span style={sectionHintStyle}>Open</span> : null}
      </div>
      {children}
    </section>
  );

  if (!href) return content;
  return <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>{content}</Link>;
}

function ChartFrame({ children }: { children: ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div style={chartFrameStyle}>
      {isMounted ? children : <div style={chartPlaceholderStyle}>Chart loading...</div>}
    </div>
  );
}

const yearFilterStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  minHeight: "42px",
  padding: "0 10px",
  borderRadius: "10px",
  background: "#ffffff",
  border: "1px solid #dbe3ef",
  color: imsColours.ink,
  fontWeight: 900,
};

const kpiGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "16px",
  marginBottom: "20px",
};

const storyGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "20px",
};

const sectionCardStyle: CSSProperties = {
  ...imsPanelStyle,
  minHeight: "100%",
  transition: "transform 160ms ease, box-shadow 160ms ease",
};

const sectionHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
  marginBottom: "14px",
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  color: imsColours.ink,
  fontSize: "18px",
  fontWeight: 900,
};

const sectionSubtitleStyle: CSSProperties = {
  margin: "4px 0 0",
  color: imsColours.slate,
  lineHeight: 1.45,
  fontSize: "13px",
};

const sectionHintStyle: CSSProperties = {
  borderRadius: "999px",
  padding: "6px 10px",
  background: imsColours.brandSoft,
  color: imsColours.brandDark,
  fontSize: "12px",
  fontWeight: 900,
};

const chartFrameStyle: CSSProperties = {
  width: "100%",
  height: "285px",
  minWidth: 0,
  minHeight: "285px",
};

const chartPlaceholderStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: imsColours.slate,
  background: "#f8fafc",
  borderRadius: "14px",
  border: "1px dashed #dbe3ef",
  fontWeight: 800,
};

const focusListStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
};

const focusItemStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  padding: "12px",
  borderRadius: "14px",
  border: "1px solid #dbe3ef",
  background: "#ffffff",
  color: imsColours.ink,
  textDecoration: "none",
};

const emptyStateStyle: CSSProperties = {
  border: "1px dashed #cbd5e1",
  borderRadius: "14px",
  padding: "16px",
  background: "#f8fafc",
  color: imsColours.slate,
};

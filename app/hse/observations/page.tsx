"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ImsButton,
  ImsFilterPanel,
  ImsLinkButton,
  ImsPanel,
  ImsTabs,
  ImsTopMetaRow,
} from "../../../src/components/ImsPrimitives";
import { imsColours, imsInputStyle, imsTableCellStyle, imsTableHeadStyle, imsTableInfoRowStyle, imsTableStyle } from "../../../src/components/imsTheme";
import { useImsPermissions } from "../../../src/components/ImsPermissions";
import {
  DocPreview,
  RecordHeader,
  RecordWorkbench,
  StatusPill as WorkbenchStatusPill,
  WorkbenchStep,
  toneForStatus,
  type WorkbenchStepDef,
} from "../../../src/components/RecordWorkbench";
import { QualityKpiCard } from "../../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../../src/components/QualityPageHero";
import { supabase } from "../../../src/lib/supabase";
import { useUrlFlag, useUrlState } from "../../../src/lib/useUrlState";
import {
  createObservationReportPdf,
  observationReportFileName,
  type ObservationReportGroup,
  type ObservationReportSort,
} from "../../../src/lib/observationReportPdf";
import { downloadRegisterExcel, excelDateStamp } from "../../../src/lib/registerExcel";
import { openFileUrl } from "../../../src/lib/fileOpen";

export const dynamic = "force-dynamic";

type View = "dashboard" | "register" | "qr";

type ObservationRecord = {
  id: string;
  observation_number: string;
  reporter_type: string | null;
  reporter_name: string | null;
  reporter_company: string | null;
  reporter_contact: string | null;
  project: string | null;
  vessel_worksite?: string | null;
  site_location: string | null;
  observation_date: string | null;
  observation_time: string | null;
  observation_type: string | null;
  category: string | null;
  risk_level: string | null;
  title: string | null;
  description: string | null;
  immediate_action: string | null;
  suggested_action: string | null;
  status: string | null;
  assigned_to: string | null;
  closeout_notes: string | null;
  closed_by: string | null;
  closed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type EvidenceRecord = {
  id: string;
  observation_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  content_type: string | null;
  uploaded_at: string | null;
};

type PersonOption = {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  department: string | null;
  active: boolean | null;
};

type LinkedActionRecord = {
  id: string;
  action_number: string | null;
  title: string | null;
  owner: string | null;
  status: string | null;
  priority: string | null;
  due_date: string | null;
  linked_observation_id?: string | null;
  linked_observation_number?: string | null;
};

const tabs: Array<{ value: View; label: string }> = [
  { value: "dashboard", label: "Dashboard" },
  { value: "register", label: "Observation Register" },
  { value: "qr", label: "QR Submit Link" },
];

const statusOptions = ["New", "In Review", "Action Required", "Closed"];
const riskOptions = ["Low", "Medium", "High", "Immediate attention"];
const observationTypes = ["Positive Observation", "Unsafe Act", "Unsafe Condition", "Environmental", "Quality / Process", "Other"];
const chartColours = [imsColours.brand, imsColours.blue, imsColours.purple, imsColours.warning, imsColours.dangerBright, imsColours.success];
const evidenceBucket = "quality-evidence";

function normalise(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function isClosed(value: string | null | undefined) {
  return normalise(value) === "closed";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
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

function fileSize(value: number | null | undefined) {
  if (!value) return "-";
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function buildCounts(records: ObservationRecord[], key: keyof ObservationRecord) {
  const counts = new Map<string, number>();
  records.forEach((record) => {
    const label = String(record[key] || "Not set");
    counts.set(label, (counts.get(label) || 0) + 1);
  });
  return [...counts.entries()]
    .map(([name, value], index) => ({ name, value, fill: chartColours[index % chartColours.length] }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
}

export default function HseObservationsPage() {
  const imsPermissions = useImsPermissions();
  const [records, setRecords] = useState<ObservationRecord[]>([]);
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  const [actions, setActions] = useState<LinkedActionRecord[]>([]);
  const [people, setPeople] = useState<PersonOption[]>([]);
  const [activeView, setActiveView] = useUrlState<View>("view", "dashboard", ["dashboard", "register", "qr"]);
  const [selectedId, setSelectedId] = useUrlState("selected", "");
  const selectedDetailRef = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useUrlState("search", "");
  const [statusFilter, setStatusFilter] = useUrlState("status", "");
  const [typeFilter, setTypeFilter] = useUrlState("type", "");
  const [riskFilter, setRiskFilter] = useUrlState("risk", "");
  const [reporterTypeFilter, setReporterTypeFilter] = useUrlState("reporter", "");
  const [projectFilter, setProjectFilter] = useUrlState("project", "");
  // Closed observations are hidden until asked for. Picking a status is also a request to see that status.
  const [showClosed, setShowClosed] = useUrlFlag("closed", false);
  const [showExport, setShowExport] = useState(false);
  const [exportGroup, setExportGroup] = useState<ObservationReportGroup>("project");
  const [exportSort, setExportSort] = useState<ObservationReportSort>("newest");
  const [exportExtras, setExportExtras] = useState({ immediate: false, suggested: false, assigned: false, closeout: false });
  const [exporting, setExporting] = useState(false);
  const [yearFilter, setYearFilter] = useUrlState("year", String(new Date().getFullYear()));
  const [showFilters, setShowFilters] = useUrlFlag("filters");
  const [message, setMessage] = useState("Loading observations...");
  const [loading, setLoading] = useState(false);

  const canCreateObservation = useMemo(() => {
    return imsPermissions.loaded && (imsPermissions.isMasterAdmin || imsPermissions.fullAccess || imsPermissions.canCreate);
  }, [imsPermissions.canCreate, imsPermissions.fullAccess, imsPermissions.isMasterAdmin, imsPermissions.loaded]);

  const canEditObservation = useMemo(() => {
    return imsPermissions.loaded && (imsPermissions.isMasterAdmin || imsPermissions.fullAccess || imsPermissions.canEdit);
  }, [imsPermissions.canEdit, imsPermissions.fullAccess, imsPermissions.isMasterAdmin, imsPermissions.loaded]);

  function requireCreatePermission(actionLabel: string) {
    if (canCreateObservation) return true;
    setMessage(`${actionLabel} requires Create permission for this IMS area.`);
    return false;
  }

  function requireEditPermission(actionLabel: string) {
    if (canEditObservation) return true;
    setMessage(`${actionLabel} requires Edit permission for this IMS area.`);
    return false;
  }

  useEffect(() => {
    if (!records.length) return;
    const params = new URLSearchParams(window.location.search);
    const target = params.get("observation") || params.get("observationId") || "";
    if (!target) return;
    // A record the user chose afterwards (kept in the address as ?selected=) wins over the original deep link.
    if (params.has("selected")) return;
    const matched = records.find((record) => record.id === target || record.observation_number === target);
    if (!matched) return;
    setSelectedId(matched.id);
    if (isClosed(matched.status)) setShowClosed(true);
    setActiveView("register");
  }, [records]);

  async function loadData() {
    setLoading(true);
    const [observationRes, evidenceRes, actionRes, peopleRes] = await Promise.all([
      supabase.from("hse_observations").select("*").order("created_at", { ascending: false }),
      supabase.from("hse_observation_evidence").select("*").order("uploaded_at", { ascending: false }),
      supabase.from("actions").select("*").order("action_number", { ascending: true }),
      supabase.from("people").select("id,name,email,role,department,active").eq("active", true).order("name", { ascending: true }),
    ]);

    const warnings = [observationRes.error?.message, evidenceRes.error?.message, actionRes.error?.message, peopleRes.error?.message].filter(Boolean);
    if (!observationRes.error) setRecords((observationRes.data || []) as ObservationRecord[]);
    if (!evidenceRes.error) setEvidence((evidenceRes.data || []) as EvidenceRecord[]);
    if (!actionRes.error) setActions((actionRes.data || []) as LinkedActionRecord[]);
    if (!peopleRes.error) setPeople((peopleRes.data || []) as PersonOption[]);
    setMessage(warnings.length ? `Loaded with warning: ${warnings[0]}` : "Observation register ready.");
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, []);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    records.forEach((record) => {
      const date = new Date(record.observation_date || record.created_at || "");
      if (!Number.isNaN(date.getTime())) years.add(String(date.getFullYear()));
    });
    years.add(String(new Date().getFullYear()));
    return [...years].sort((a, b) => Number(b) - Number(a));
  }, [records]);

  const yearRecords = useMemo(() => records.filter((record) => {
    if (!yearFilter) return true;
    const date = new Date(record.observation_date || record.created_at || "");
    return !Number.isNaN(date.getTime()) && String(date.getFullYear()) === yearFilter;
  }), [records, yearFilter]);

  const hideClosed = !showClosed && !statusFilter;

  const filteredRecords = useMemo(() => {
    const lower = search.trim().toLowerCase();
    return yearRecords.filter((record) => {
      if (hideClosed && isClosed(record.status)) return false;
      const matchesSearch = !lower || [
        record.observation_number,
        record.title,
        record.description,
        record.project,
        record.vessel_worksite,
        record.site_location,
        record.reporter_name,
        record.reporter_company,
      ].some((value) => (value || "").toLowerCase().includes(lower));
      const matchesStatus = !statusFilter || record.status === statusFilter;
      const matchesType = !typeFilter || record.observation_type === typeFilter;
      const matchesRisk = !riskFilter || record.risk_level === riskFilter;
      const matchesReporterType = !reporterTypeFilter || record.reporter_type === reporterTypeFilter;
      const matchesProject = !projectFilter || (record.project || "") === projectFilter;
      return matchesSearch && matchesStatus && matchesType && matchesRisk && matchesReporterType && matchesProject;
    });
  }, [hideClosed, projectFilter, reporterTypeFilter, riskFilter, search, statusFilter, typeFilter, yearRecords]);

  const projectOptions = useMemo(
    () => [...new Set(yearRecords.map((record) => record.project).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b)),
    [yearRecords],
  );

  async function loadImageDataUrl(path: string) {
    try {
      const response = await fetch(path);
      if (!response.ok) return undefined;
      const blob = await response.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return undefined;
    }
  }

  // The PDF contains exactly the rows the register is showing, with the filters that produced them.
  async function exportReport() {
    if (!filteredRecords.length) {
      setMessage("There are no observations to export for the current filters.");
      return;
    }
    setExporting(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const metadata = authData.user?.user_metadata as { full_name?: string; name?: string } | undefined;
      const generatedBy = metadata?.full_name || metadata?.name || authData.user?.email || "";
      const filters = [
        `Year: ${yearFilter || "All"}`,
        `Project: ${projectFilter || "All"}`,
        `Status: ${statusFilter || (hideClosed ? "Open (closed hidden)" : "All")}`,
        `Type: ${typeFilter || "All"}`,
        `Risk: ${riskFilter || "All"}`,
        `Submitted as: ${reporterTypeFilter || "All"}`,
        ...(search.trim() ? [`Search: "${search.trim()}"`] : []),
      ];
      const [enshoreLogo, threeRsLogo] = await Promise.all([
        loadImageDataUrl("/enshore-primary-logo-colour.png"),
        loadImageDataUrl("/enshore-3rs-primary-rgb.jpg"),
      ]);
      const pdf = createObservationReportPdf(filteredRecords, {
        group: exportGroup,
        sort: exportSort,
        includeImmediateAction: exportExtras.immediate,
        includeSuggestedAction: exportExtras.suggested,
        includeAssignedTo: exportExtras.assigned,
        includeCloseout: exportExtras.closeout,
        filters,
        generatedBy,
        logos: { enshore: enshoreLogo, threeRs: threeRsLogo },
      });
      pdf.save(observationReportFileName(projectFilter));
      setMessage(`Observation report created with ${filteredRecords.length} observation${filteredRecords.length === 1 ? "" : "s"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? `The report could not be created: ${error.message}` : "The report could not be created.");
    } finally {
      setExporting(false);
    }
  }

  // The workbook holds exactly the rows the register is showing, with every field in its own column for sorting and filtering.
  async function exportExcel() {
    if (!filteredRecords.length) {
      setMessage("There are no observations to export for the current filters.");
      return;
    }
    try {
      const filters = [
        `Year: ${yearFilter || "All"}`,
        ...(projectFilter ? [`Project: ${projectFilter}`] : []),
        ...(statusFilter ? [`Status: ${statusFilter}`] : hideClosed ? ["Open (closed hidden)"] : []),
        ...(typeFilter ? [`Type: ${typeFilter}`] : []),
        ...(riskFilter ? [`Risk: ${riskFilter}`] : []),
        ...(reporterTypeFilter ? [`Submitted as: ${reporterTypeFilter}`] : []),
        ...(search.trim() ? [`Search: "${search.trim()}"`] : []),
      ];
      await downloadRegisterExcel<ObservationRecord>({
        fileName: `observation-register${projectFilter ? `-${projectFilter.replace(/[^A-Za-z0-9._-]+/g, "-")}` : ""}-${excelDateStamp()}.xlsx`,
        sheetName: "Observation Register",
        title: "Observation Register — Enshore IMS",
        filters,
        rows: filteredRecords,
        columns: [
          { header: "Observation No.", width: 16, value: (record) => record.observation_number || "" },
          { header: "Date", width: 13, value: (record) => (record.observation_date ? formatDate(record.observation_date) : "") },
          { header: "Time", width: 8, value: (record) => record.observation_time || "" },
          { header: "Project", width: 22, value: (record) => record.project || "" },
          { header: "Vessel / Worksite", width: 22, value: (record) => record.vessel_worksite || "" },
          { header: "Site / Location", width: 22, value: (record) => record.site_location || "" },
          { header: "Type", width: 20, value: (record) => record.observation_type || "" },
          { header: "Category", width: 18, value: (record) => record.category || "" },
          { header: "Risk Level", width: 16, value: (record) => record.risk_level || "" },
          { header: "Status", width: 14, value: (record) => record.status || "" },
          { header: "Title", width: 36, value: (record) => record.title || "" },
          { header: "Description", width: 70, value: (record) => record.description || "" },
          { header: "Immediate Action", width: 44, value: (record) => record.immediate_action || "" },
          { header: "Suggested Action", width: 44, value: (record) => record.suggested_action || "" },
          { header: "Assigned To", width: 22, value: (record) => record.assigned_to || "" },
          { header: "Submitted As", width: 16, value: (record) => record.reporter_type || "" },
          { header: "Reporter", width: 22, value: (record) => record.reporter_name || "" },
          { header: "Reporter Company", width: 22, value: (record) => record.reporter_company || "" },
          { header: "Close-out Notes", width: 44, value: (record) => record.closeout_notes || "" },
          { header: "Closed By", width: 20, value: (record) => record.closed_by || "" },
          { header: "Closed On", width: 13, value: (record) => (record.closed_at ? formatDate(record.closed_at) : "") },
        ],
      });
      setMessage(`Observation Excel report created with ${filteredRecords.length} observation${filteredRecords.length === 1 ? "" : "s"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? `The Excel report could not be created: ${error.message}` : "The Excel report could not be created.");
    }
  }

  const selectedRecord = useMemo(() => records.find((record) => record.id === selectedId) || null, [records, selectedId]);
  const selectedEvidence = useMemo(() => evidence.filter((item) => item.observation_id === selectedRecord?.id), [evidence, selectedRecord?.id]);
  const selectedLinkedActions = useMemo(() => {
    if (!selectedRecord) return [];
    return actions.filter((action) => {
      if (action.linked_observation_id && action.linked_observation_id === selectedRecord.id) return true;
      return Boolean(action.linked_observation_number && action.linked_observation_number === selectedRecord.observation_number);
    });
  }, [actions, selectedRecord]);

  function selectObservationAndScroll(id: string) {
    setSelectedId(id);
    // A closed record chosen from the dashboard must still appear in the register list beside its detail.
    if (isClosed(records.find((record) => record.id === id)?.status)) setShowClosed(true);
    window.setTimeout(() => {
      selectedDetailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }
  const openRecords = useMemo(() => yearRecords.filter((record) => !isClosed(record.status)), [yearRecords]);
  const highRiskRecords = useMemo(() => yearRecords.filter((record) => ["high", "immediate attention"].includes(normalise(record.risk_level))), [yearRecords]);
  const newRecords = useMemo(() => yearRecords.filter((record) => normalise(record.status) === "new"), [yearRecords]);
  const evidenceCount = useMemo(() => evidence.filter((item) => yearRecords.some((record) => record.id === item.observation_id)).length, [evidence, yearRecords]);
  const statusData = useMemo(() => buildCounts(yearRecords, "status"), [yearRecords]);
  const typeData = useMemo(() => buildCounts(yearRecords, "observation_type"), [yearRecords]);
  const riskData = useMemo(() => buildCounts(yearRecords, "risk_level"), [yearRecords]);

  async function updateSelectedRecord(payload: Partial<ObservationRecord>) {
    if (!selectedRecord) return;
    if (!requireEditPermission("Saving observation reviews")) return;

    setLoading(true);
    const { error } = await supabase.from("hse_observations").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", selectedRecord.id);
    if (error) {
      setMessage(`Update failed: ${error.message}`);
      setLoading(false);
      return;
    }
    setMessage(`${selectedRecord.observation_number} updated.`);

    const itemUrl = `${window.location.origin}/hse/observations?observation=${encodeURIComponent(selectedRecord.observation_number)}`;
    const nextStatus = ("status" in payload ? payload.status : selectedRecord.status) || undefined;

    // Only notify when "Assigned To" actually changed to a new person — not
    // on every save (e.g. just adding close-out notes or changing status).
    const prevAssigned = (selectedRecord.assigned_to || "").trim().toLowerCase();
    const nextAssigned = "assigned_to" in payload ? (payload.assigned_to || "").trim() : selectedRecord.assigned_to || "";
    let assignedEmail: string | undefined;
    if (nextAssigned && nextAssigned.toLowerCase() !== prevAssigned) {
      const person = people.find((candidate) => candidate.name.toLowerCase() === nextAssigned.toLowerCase());
      if (person?.email) {
        assignedEmail = person.email;
        void fetch("/api/notify-assignment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "assigned",
            recipientEmail: person.email,
            recipientName: person.name,
            itemType: "HSE Observation",
            itemRef: selectedRecord.observation_number,
            itemTitle: selectedRecord.title || undefined,
            status: nextStatus,
            itemUrl,
          }),
        });
      }
    }

    // Keep whoever submitted the observation ("Submitted By") up to speed on
    // its progress — notify them when status or close-out notes change. Only
    // works when that name matches an active person in People Management;
    // anonymous/external QR submissions have no account to email.
    const reporterName = (selectedRecord.reporter_name || "").trim();
    const reporter = reporterName ? people.find((candidate) => candidate.name.toLowerCase() === reporterName.toLowerCase()) : undefined;
    if (reporter?.email && reporter.email !== assignedEmail) {
      const prevStatus = selectedRecord.status ?? "";
      if ("status" in payload && payload.status !== prevStatus) {
        void fetch("/api/notify-assignment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "status-changed",
            recipientEmail: reporter.email,
            recipientName: reporter.name,
            itemType: "HSE Observation",
            itemRef: selectedRecord.observation_number,
            itemTitle: selectedRecord.title || undefined,
            status: nextStatus,
            itemUrl,
          }),
        });
      }

      const prevCloseout = (selectedRecord.closeout_notes || "").trim();
      const nextCloseout = "closeout_notes" in payload ? (payload.closeout_notes || "").trim() : prevCloseout;
      if (nextCloseout && nextCloseout !== prevCloseout) {
        void fetch("/api/notify-assignment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "closed-out",
            recipientEmail: reporter.email,
            recipientName: reporter.name,
            itemType: "HSE Observation",
            itemRef: selectedRecord.observation_number,
            itemTitle: selectedRecord.title || undefined,
            status: nextStatus,
            closeOutComments: nextCloseout,
            itemUrl,
          }),
        });
      }
    }

    await loadData();
  }

  async function deleteSelectedRecord(record: ObservationRecord) {
    if (!requireEditPermission("Deleting observations")) return;

    if (!window.confirm(`Delete ${record.observation_number}? This cannot be undone.`)) return;
    setLoading(true);

    const linkedEvidence = evidence.filter((item) => item.observation_id === record.id);
    if (linkedEvidence.length) {
      const { error: storageError } = await supabase.storage
        .from(evidenceBucket)
        .remove(linkedEvidence.map((item) => item.file_path));

      if (storageError) {
        setMessage(`Evidence cleanup warning: ${storageError.message}. Deleting observation record anyway.`);
      }
    }

    const { error } = await supabase.from("hse_observations").delete().eq("id", record.id);
    if (error) {
      setMessage(`Delete failed: ${error.message}`);
      setLoading(false);
      return;
    }

    setSelectedId("");
    setMessage(`${record.observation_number} deleted.`);
    await loadData();
  }

  async function openEvidence(path: string) {
    const { data, error } = await supabase.storage.from(evidenceBucket).createSignedUrl(path, 60 * 60 * 24 * 180);
    if (error || !data?.signedUrl) {
      setMessage(`Evidence link failed: ${error?.message || "No link returned"}`);
      return;
    }
    openFileUrl(data.signedUrl);
  }

  const createActionHref = selectedRecord
    ? `/actions?view=create&prefill_source=Observation&prefill_department=HSE&prefill_project=${encodeURIComponent(selectedRecord.project || "")}&linked_observation_id=${encodeURIComponent(selectedRecord.id)}&linked_observation_number=${encodeURIComponent(selectedRecord.observation_number)}`
    : "/actions?view=create&prefill_source=Observation&prefill_department=HSE";

  return (
    <main>
      <QualityPageHero
        label="HSE MANAGEMENT"
        title="Observation Cards"
        description="QR-enabled observation reporting for site teams, contractors, and clients, with HSE review and evidence control inside the IMS."
        contextCards={[
          { label: "Last Refreshed", value: loading ? "Loading..." : formatDateTime(new Date().toISOString()) },
          { label: "Latest Observation", value: records[0]?.observation_number || "No observations yet" },
        ]}
      />

      <ImsTopMetaRow
        backHref="/home"
        backLabel="Back to IMS Home"
        status={<><strong>Status:</strong> {message}</>}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <ImsTabs tabs={tabs} active={activeView} onChange={setActiveView} ariaLabel="Observation views" />
        <label style={{ ...yearSelectStyle, marginBottom: "20px" }}>
          <span>Year</span>
          <select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}>
            {availableYears.map((year) => <option key={year}>{year}</option>)}
          </select>
        </label>
      </div>

      {activeView === "dashboard" ? (
        <>
          <section style={kpiGridStyle}>
            <QualityKpiCard title={`${yearFilter} Observations`} value={yearRecords.length} accent={imsColours.brand} onClick={() => setActiveView("register")} />
            <QualityKpiCard title="Open Observations" value={openRecords.length} accent={imsColours.blue} onClick={() => { setStatusFilter(""); setActiveView("register"); }} />
            <QualityKpiCard title="New Cards" value={newRecords.length} accent={imsColours.warning} onClick={() => { setStatusFilter("New"); setActiveView("register"); }} />
            <QualityKpiCard title="High Attention" value={highRiskRecords.length} accent={imsColours.dangerBright} onClick={() => { setRiskFilter("High"); setActiveView("register"); }} />
            <QualityKpiCard title="Evidence Files" value={evidenceCount} accent={imsColours.purple} onClick={() => setActiveView("register")} />
          </section>
          <section style={chartGridStyle}>
            <ChartCard title="Observation Types">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={typeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" interval={0} angle={-15} textAnchor="end" height={70} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {typeData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Status Mix">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" innerRadius={58} outerRadius={92} paddingAngle={3}>
                    {statusData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Risk / Attention Level">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={riskData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {riskData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ImsPanel title="Latest Observations" subtitle="Most recent cards submitted through the QR form or register.">
              <div style={latestListStyle}>
                {records.slice(0, 6).map((record) => (
                  <button key={record.id} type="button" style={latestItemStyle} onClick={() => { setActiveView("register"); selectObservationAndScroll(record.id); }}>
                    <span>
                      <strong>{record.observation_number}</strong>
                      <small>{record.title || record.description || "Observation"}</small>
                    </span>
                    <StatusPill status={record.status || "New"} />
                  </button>
                ))}
                {!records.length ? <div style={emptyStateStyle}>No observation cards have been logged yet.</div> : null}
              </div>
            </ImsPanel>
          </section>
        </>
      ) : null}

      {activeView === "register" ? (
        <section style={registerGridStyle}>
          <ImsPanel title="Observation Register" subtitle="Review, filter, close out, and create HSE follow-up actions from submitted observation cards.">
            <ImsFilterPanel
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search observation no., details, project, reporter..."
              showFilters={showFilters}
              onToggleFilters={() => setShowFilters((value) => !value)}
              actions={<>
                <ImsButton
                  variant={hideClosed ? "primary" : "secondary"}
                  onClick={() => {
                    if (hideClosed) { setShowClosed(true); return; }
                    setShowClosed(false);
                    setStatusFilter("");
                  }}
                  title={hideClosed ? "Closed observations are hidden. Press to show them." : "Closed observations are showing. Press to hide them."}
                >{hideClosed ? "Show Closed" : "Hide Closed"}</ImsButton>
                <ImsButton variant="secondary" onClick={() => { setSearch(""); setStatusFilter(""); setTypeFilter(""); setRiskFilter(""); setReporterTypeFilter(""); setProjectFilter(""); setShowClosed(false); }}>Clear Filters</ImsButton>
                <ImsButton variant={showExport ? "secondary" : "primary"} onClick={() => setShowExport((value) => !value)} disabled={!filteredRecords.length} title="Create a PDF of the observations currently shown">Export PDF</ImsButton>
                <ImsButton variant="secondary" onClick={() => void exportExcel()} disabled={!filteredRecords.length} title="Download an Excel workbook of the observations currently shown">Export Excel</ImsButton>
              </>}
            >
              <Field label="Project">
                <select style={imsInputStyle} value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
                  <option value="">All projects</option>
                  {projectOptions.map((project) => <option key={project}>{project}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select style={imsInputStyle} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="">All statuses</option>
                  {statusOptions.map((status) => <option key={status}>{status}</option>)}
                </select>
              </Field>
              <Field label="Type">
                <select style={imsInputStyle} value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                  <option value="">All types</option>
                  {observationTypes.map((type) => <option key={type}>{type}</option>)}
                </select>
              </Field>
              <Field label="Risk / Attention">
                <select style={imsInputStyle} value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)}>
                  <option value="">All levels</option>
                  {riskOptions.map((risk) => <option key={risk}>{risk}</option>)}
                </select>
              </Field>
              <Field label="Submitted As">
                <select style={imsInputStyle} value={reporterTypeFilter} onChange={(event) => setReporterTypeFilter(event.target.value)}>
                  <option value="">All submitter types</option>
                  {["Employee", "Contractor", "Client", "Visitor", "Quick Fill"].map((type) => <option key={type}>{type}</option>)}
                </select>
              </Field>
            </ImsFilterPanel>
            {showExport ? (
              <div style={exportPanelStyle}>
                <div style={exportGroupStyle}>
                  <strong style={exportHeadingStyle}>Group by</strong>
                  {([["project", "Project (recommended)"], ["type", "Observation type"], ["risk", "Risk level"], ["none", "No grouping"]] as Array<[ObservationReportGroup, string]>).map(([value, label]) => (
                    <label key={value} style={exportOptionStyle}><input type="radio" name="export-group" checked={exportGroup === value} onChange={() => setExportGroup(value)} /> {label}</label>
                  ))}
                </div>
                <div style={exportGroupStyle}>
                  <strong style={exportHeadingStyle}>Order within each group</strong>
                  {([["newest", "Newest first"], ["oldest", "Oldest first"], ["risk", "Highest risk first"]] as Array<[ObservationReportSort, string]>).map(([value, label]) => (
                    <label key={value} style={exportOptionStyle}><input type="radio" name="export-sort" checked={exportSort === value} onChange={() => setExportSort(value)} /> {label}</label>
                  ))}
                </div>
                <div style={exportGroupStyle}>
                  <strong style={exportHeadingStyle}>Add under each description</strong>
                  {([["immediate", "Immediate action"], ["suggested", "Suggested action"], ["assigned", "Assigned to"], ["closeout", "Close-out notes"]] as Array<[keyof typeof exportExtras, string]>).map(([key, label]) => (
                    <label key={key} style={exportOptionStyle}><input type="checkbox" checked={exportExtras[key]} onChange={(event) => setExportExtras((current) => ({ ...current, [key]: event.target.checked }))} /> {label}</label>
                  ))}
                </div>
                <div style={exportFootStyle}>
                  <span style={{ color: imsColours.slate, fontSize: 12 }}>Landscape A4. Includes all {filteredRecords.length} observation{filteredRecords.length === 1 ? "" : "s"} matching the filters, with status and the full description. Photos and reporter details are not included.</span>
                  <ImsButton onClick={() => void exportReport()} disabled={exporting || !filteredRecords.length}>{exporting ? "Creating PDF..." : "Download PDF"}</ImsButton>
                </div>
              </div>
            ) : null}
            <div style={imsTableInfoRowStyle}>Showing <strong>{filteredRecords.length}</strong> of <strong>{yearRecords.length}</strong> observations{hideClosed ? " · closed observations are hidden" : ""}</div>
            <div className="observation-table-wrap" style={{ overflowX: "auto", border: "1px solid #D0D0CE", borderRadius: "14px" }}>
              <table className="observation-table" style={{ ...imsTableStyle, minWidth: 980 }}>
                <thead>
                  <tr>
                    {["Observation No.", "Type", "Project", "Vessel / Worksite", "Location", "Risk", "Status", "Submitted As", "Submitted By", "Date"].map((heading) => (
                      <th key={heading} style={imsTableHeadStyle}>{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr key={record.id} aria-selected={selectedRecord?.id === record.id} data-selected={selectedRecord?.id === record.id ? "true" : "false"} onClick={() => selectObservationAndScroll(record.id)} style={selectedRecord?.id === record.id ? selectedRowStyle : rowStyle}>
                      <td data-label="Observation" style={{ ...imsTableCellStyle, fontWeight: 900, color: imsColours.brandDark }}>{record.observation_number}</td>
                      <td data-label="Type" style={imsTableCellStyle}>{record.observation_type || "-"}</td>
                      <td data-label="Project" style={imsTableCellStyle}>{record.project || "-"}</td>
                      <td data-label="Vessel / Worksite" style={imsTableCellStyle}>{record.vessel_worksite || "-"}</td>
                      <td data-label="Location" style={imsTableCellStyle}>{record.site_location || "-"}</td>
                      <td data-label="Risk" style={imsTableCellStyle}>{record.risk_level || "-"}</td>
                      <td data-label="Status" style={imsTableCellStyle}><StatusPill status={record.status || "New"} /></td>
                      <td data-label="Submitted As" style={imsTableCellStyle}>{record.reporter_type || "Quick Fill"}</td>
                      <td data-label="Submitted By" style={imsTableCellStyle}>{record.reporter_name || record.reporter_company || "Not provided"}</td>
                      <td data-label="Date" style={imsTableCellStyle}>{formatDate(record.observation_date || record.created_at)}</td>
                    </tr>
                  ))}
                  {!filteredRecords.length ? (
                    <tr><td colSpan={10} style={emptyCellStyle}>No observations match the current filters.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </ImsPanel>

          {selectedRecord ? (
            <div ref={selectedDetailRef}>
            <ObservationDetail
              record={selectedRecord}
              evidence={selectedEvidence}
              linkedActions={selectedLinkedActions}
              people={people}
              onOpenEvidence={openEvidence}
              onUpdate={updateSelectedRecord}
              onDelete={deleteSelectedRecord}
              createActionHref={createActionHref}
              canCreateAction={canCreateObservation}
              canEdit={canEditObservation}
              onCreateActionBlocked={() => requireCreatePermission("Generating central actions")}
              onClose={() => setSelectedId("")}
            />
            </div>
          ) : null}
        </section>
      ) : null}

      {activeView === "qr" ? (
        <ImsPanel title="QR Observation Link" subtitle="Use this link for posters, toolbox talks, vessels, workshops, and client or contractor access.">
          <div style={qrGridStyle}>
            <div className="observation-qr-card" style={qrCardStyle}>
              <Image
                src="/hse-observation-qr.png"
                alt="QR code for public HSE observation card"
                width={220}
                height={220}
                priority
                style={qrImageStyle}
              />
              <div>
                <h2 style={qrTitleStyle}>Public Observation Card</h2>
                <p style={emptyTextStyle}>One mobile-friendly route for employees, contractors, clients, visitors, and quick-fill submissions. It does not expose the IMS navigation.</p>
                <div style={buttonRowStyle}>
                  <ImsLinkButton href="/observe">Open QR Form</ImsLinkButton>
                  <ImsButton variant="secondary" onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/observe`)}>Copy Link</ImsButton>
                </div>
              </div>
            </div>
            <div style={infoBoxStyle}>
              <strong>Access model</strong>
              <p>Public users can submit only. HSE users review, filter, close out, and generate follow-up actions inside this secured HSE workspace.</p>
            </div>
          </div>
        </ImsPanel>
      ) : null}
    </main>
  );
}

function ObservationDetail({
  record,
  evidence,
  linkedActions,
  people,
  onOpenEvidence,
  onUpdate,
  onDelete,
  createActionHref,
  canCreateAction,
  canEdit,
  onCreateActionBlocked,
  onClose,
}: {
  record: ObservationRecord | null;
  evidence: EvidenceRecord[];
  linkedActions: LinkedActionRecord[];
  people: PersonOption[];
  onOpenEvidence: (path: string) => void;
  onUpdate: (payload: Partial<ObservationRecord>) => void;
  onDelete: (record: ObservationRecord) => void;
  createActionHref: string;
  canCreateAction: boolean;
  canEdit: boolean;
  onCreateActionBlocked: () => void;
  onClose: () => void;
}) {
  const [draftStatus, setDraftStatus] = useState(record?.status || "New");
  const [draftAssigned, setDraftAssigned] = useState(record?.assigned_to || "");
  const [draftCloseout, setDraftCloseout] = useState(record?.closeout_notes || "");

  useEffect(() => {
    setDraftStatus(record?.status || "New");
    setDraftAssigned(record?.assigned_to || "");
    setDraftCloseout(record?.closeout_notes || "");
  }, [record?.id, record?.status, record?.assigned_to, record?.closeout_notes]);

  if (!record) return null;

  const currentStatus = record.status || "New";
  const closed = isClosed(record.status);

  // What is still missing before the card can be closed. This only warns: Close Out stays usable.
  // The review note and the close-out note are one saved field (closeout_notes), so they share one chip.
  const openLinkedActions = linkedActions.filter((action) => !isClosed(action.status));
  const missing: Array<{ label: string; step?: string }> = [];
  if (!draftCloseout.trim()) missing.push({ label: "Review / close-out note", step: "closeout" });
  if (openLinkedActions.length) {
    missing.push({ label: openLinkedActions.length === 1 ? "Linked action closed" : `${openLinkedActions.length} linked actions closed`, step: "actions" });
  }
  const outstanding = closed ? [] : missing;

  function closeOut() {
    if (!canEdit || closed || !record) return;
    // The same save as "Save Review", with the status set to Closed. Warn about gaps, never block.
    const prompt = outstanding.length
      ? `${outstanding.length} item${outstanding.length === 1 ? " is" : "s are"} still missing: ${outstanding.map((item) => item.label).join(", ")}. Close anyway?`
      : `Close ${record.observation_number}?`;
    if (!window.confirm(prompt)) return;
    setDraftStatus("Closed");
    onUpdate({ status: "Closed", assigned_to: draftAssigned || null, closeout_notes: draftCloseout || null });
  }

  const steps: WorkbenchStepDef[] = [
    { key: "card", label: "Card", sub: "As submitted", state: "Received" },
    { key: "review", label: "Review", sub: "Assign and assess", state: record.assigned_to ? "Assigned" : "Unassigned" },
    { key: "actions", label: "Actions", sub: "Linked HSE actions", state: `${linkedActions.length} linked` },
    { key: "closeout", label: "Close-out", sub: "Notes, evidence", state: closed ? "Closed" : record.closeout_notes ? "Notes added" : "Not started" },
  ];

  const historyRows = [
    { label: "Submitted", value: record.created_at ? formatDateTime(record.created_at) : "" },
    { label: "Last updated", value: record.updated_at ? formatDateTime(record.updated_at) : "" },
    { label: "Closed", value: record.closed_at ? `${formatDateTime(record.closed_at)}${record.closed_by ? ` by ${record.closed_by}` : ""}` : "" },
  ].filter((row) => row.value);

  const createActionControl = canCreateAction ? (
    <ImsLinkButton href={createActionHref}>Create HSE Action</ImsLinkButton>
  ) : (
    <ImsButton variant="secondary" onClick={onCreateActionBlocked} disabled>
      Create HSE Action
    </ImsButton>
  );

  const saveReviewButton = (
    <ImsButton
      onClick={() => onUpdate({ status: draftStatus, assigned_to: draftAssigned || null, closeout_notes: draftCloseout || null })}
      disabled={!canEdit}
    >
      Save Review
    </ImsButton>
  );

  const notesField = (
    <Field label="Close-out / Review Notes">
      <textarea style={{ ...imsInputStyle, minHeight: 96, resize: "vertical" }} value={draftCloseout} onChange={(event) => setDraftCloseout(event.target.value)} />
    </Field>
  );

  return (
    <ImsPanel>
      <RecordWorkbench
        key={record.id}
        gate="this card can be closed"
        steps={steps}
        missing={outstanding}
        reportLabel="History"
        side={historyRows.length ? <DocPreview title="History" sections={[{ heading: "Timeline", rows: historyRows }]} /> : undefined}
        header={
          <RecordHeader
            id={record.observation_number}
            title={record.title || "Untitled observation"}
            status={{ label: currentStatus, tone: toneForStatus(currentStatus) }}
            track={{ steps: statusOptions, current: currentStatus }}
            note="Status is set by hand in the Review step. The track shows where the card is now."
            actions={
              <>
                {createActionControl}
                <ImsButton variant="secondary" onClick={closeOut} disabled={!canEdit || closed} title="Sets the status to Closed and saves the review">Close Out</ImsButton>
                <ImsButton variant="secondary" onClick={onClose} title="Close this panel">Hide Panel</ImsButton>
              </>
            }
          />
        }
      >
        <WorkbenchStep stepKey="card">
          <div className="observation-detail-grid" style={kvGridStyle}>
            <KeyValue label="Submitted As" value={record.reporter_type || "Quick Fill"} />
            <KeyValue label="Submitted By" value={record.reporter_name || "Not provided"} />
            <KeyValue label="Company / Organisation" value={record.reporter_company} />
            <KeyValue label="Contact" value={record.reporter_contact} />
            <KeyValue label="Type" value={record.observation_type} />
            <KeyValue label="Risk / Attention" value={record.risk_level} />
            <KeyValue label="Project" value={record.project} />
            <KeyValue label="Vessel / Worksite" value={record.vessel_worksite} />
            <KeyValue label="Location" value={record.site_location} />
            <KeyValue label="Date" value={`${formatDate(record.observation_date)}${record.observation_time ? ` ${record.observation_time}` : ""}`} />
            <KeyValue label="Title" value={record.title} wide />
            <KeyValue label="Observation" value={record.description} wide />
            <KeyValue label="Immediate Action" value={record.immediate_action} wide />
            <KeyValue label="Suggested Action" value={record.suggested_action} wide />
          </div>
        </WorkbenchStep>

        <WorkbenchStep stepKey="review">
          <div className="observation-edit-panel" style={editPanelStyle}>
            <Field label="Status">
              <select style={imsInputStyle} value={draftStatus} onChange={(event) => setDraftStatus(event.target.value)}>
                {statusOptions.map((status) => <option key={status}>{status}</option>)}
              </select>
            </Field>
            <Field label="Assigned To">
              <select style={imsInputStyle} value={draftAssigned} onChange={(event) => setDraftAssigned(event.target.value)}>
                <option value="">Unassigned</option>
                {people.map((person) => <option key={person.id} value={person.name}>{person.name}{person.role ? ` - ${person.role}` : ""}</option>)}
              </select>
            </Field>
            <div style={{ gridColumn: "1 / -1" }}>{notesField}</div>
            <div style={buttonRowStyle}>
              {saveReviewButton}
              <ImsButton variant="danger" onClick={() => onDelete(record)} disabled={!canEdit}>Delete Observation</ImsButton>
            </div>
          </div>
        </WorkbenchStep>

        <WorkbenchStep stepKey="actions">
          <div>
            <h3 style={subHeadingStyle}>Linked Actions</h3>
            <div style={evidenceListStyle}>
              {linkedActions.map((action) => (
                <div key={action.id} style={evidenceItemStyle}>
                  <div>
                    <strong>{action.action_number || "Action"} - {action.title || "Untitled action"}</strong>
                    <small>
                      {[action.owner ? `Owner: ${action.owner}` : "", action.due_date ? `Due: ${formatDate(action.due_date)}` : ""]
                        .filter(Boolean)
                        .join(" | ") || "No owner or due date"}
                    </small>
                  </div>
                  <div style={linkedActionButtonGroupStyle}>
                    <StatusPill status={action.status || "Open"} />
                    <ImsLinkButton
                      href={action.id ? `/actions?actionId=${encodeURIComponent(action.id)}` : `/actions?action=${encodeURIComponent(action.action_number || "")}`}
                      variant="secondary"
                    >
                      Open Linked Action
                    </ImsLinkButton>
                  </div>
                </div>
              ))}
              {!linkedActions.length ? <div style={emptyStateStyle}>No central actions are linked to this observation yet. Create HSE Action opens the Action form with this card already linked.</div> : null}
            </div>
            <div style={{ ...buttonRowStyle, marginTop: "12px" }}>{createActionControl}</div>
          </div>
        </WorkbenchStep>

        <WorkbenchStep stepKey="closeout">
          <div className="observation-edit-panel" style={editPanelStyle}>
            <div style={{ gridColumn: "1 / -1" }}>{notesField}</div>
            <KeyValue label="Status" value={currentStatus} />
            <KeyValue label="Closed By" value={record.closed_by} />
            <KeyValue label="Closed On" value={record.closed_at ? formatDateTime(record.closed_at) : ""} />
            <div style={buttonRowStyle}>{saveReviewButton}</div>
          </div>
          <div>
            <h3 style={subHeadingStyle}>Evidence</h3>
            <div style={evidenceListStyle}>
              {evidence.map((item) => (
                <div key={item.id} style={evidenceItemStyle}>
                  <div>
                    <strong>{item.file_name}</strong>
                    <small>{fileSize(item.file_size)} | Uploaded {formatDateTime(item.uploaded_at)}</small>
                  </div>
                  <ImsButton variant="secondary" onClick={() => onOpenEvidence(item.file_path)}>Open Evidence</ImsButton>
                </div>
              ))}
              {!evidence.length ? <div style={emptyStateStyle}>No evidence was uploaded with this observation.</div> : null}
            </div>
          </div>
        </WorkbenchStep>
      </RecordWorkbench>
    </ImsPanel>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <ImsPanel title={title}>
      <div style={{ minHeight: 280 }}>{children}</div>
    </ImsPanel>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label style={fieldStyle}><span style={labelStyle}>{label}</span>{children}</label>;
}

function KeyValue({ label, value, wide = false }: { label: string; value: ReactNode; wide?: boolean }) {
  return (
    <div style={{ ...kvStyle, ...(wide ? { gridColumn: "1 / -1" } : {}) }}>
      <span style={infoLabelStyle}>{label}</span>
      <span style={{ ...infoValueStyle, whiteSpace: wide ? "pre-wrap" : "normal", overflowWrap: "anywhere" }}>{value || "-"}</span>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  return <WorkbenchStatusPill label={status || "New"} tone={toneForStatus(status || "New")} />;
}

const yearSelectStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  minHeight: "42px",
  padding: "0 10px",
  borderRadius: "10px",
  background: imsColours.panel,
  border: "1px solid #D0D0CE",
  color: imsColours.ink,
  fontWeight: 900,
};
const kpiGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "16px", marginBottom: "20px" };
const chartGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "20px" };
const exportPanelStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "16px", margin: "0 0 14px", padding: "14px 16px", border: "1px solid #005670", borderRadius: "14px", background: "#ECECE7" };
const exportGroupStyle: CSSProperties = { display: "grid", gap: "6px", alignContent: "start" };
const exportHeadingStyle: CSSProperties = { fontSize: "12px", letterSpacing: "0.06em", textTransform: "uppercase", color: "#53565A" };
const exportOptionStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#000000", cursor: "pointer" };
const exportFootStyle: CSSProperties = { gridColumn: "1 / -1", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px", paddingTop: "12px", borderTop: "1px solid #D0D0CE" };
const registerGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: "20px", alignItems: "start" };
const fieldStyle: CSSProperties = { display: "grid", gap: "6px" };
const labelStyle: CSSProperties = { color: "#53565A", fontSize: "12px", fontWeight: 900 };
const selectedRowStyle: CSSProperties = { cursor: "pointer", background: "#eef7f8" };
const rowStyle: CSSProperties = { cursor: "pointer" };
const emptyCellStyle: CSSProperties = { padding: "28px 14px", textAlign: "center", color: imsColours.slate, background: imsColours.page };
const emptyStateStyle: CSSProperties = { border: "1px dashed #D0D0CE", borderRadius: "14px", padding: "16px", color: imsColours.slate, background: imsColours.page, lineHeight: 1.45 };
const latestListStyle: CSSProperties = { display: "grid", gap: "10px" };
const latestItemStyle: CSSProperties = { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", border: "1px solid #D0D0CE", borderRadius: "14px", padding: "12px", background: "#ffffff", textAlign: "left", cursor: "pointer" };
const kvGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0 24px" };
const kvStyle: CSSProperties = { borderBottom: `1px solid ${imsColours.border}`, padding: "8px 0", display: "grid", gap: "3px", minWidth: 0 };
const infoLabelStyle: CSSProperties = { color: imsColours.muted, fontSize: "11px", fontWeight: 900, letterSpacing: "0.06em", textTransform: "uppercase" };
const infoValueStyle: CSSProperties = { color: imsColours.ink, fontSize: "13px", lineHeight: 1.45 };
const editPanelStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px", border: "1px solid #D0D0CE", borderRadius: "18px", background: "linear-gradient(180deg, #ffffff 0%, #ECECE7 100%)", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)", padding: "18px", marginBottom: "14px" };
const buttonRowStyle: CSSProperties = { display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" };
const subHeadingStyle: CSSProperties = { margin: "0 0 10px", color: imsColours.ink, fontSize: "16px", fontWeight: 900 };
const evidenceListStyle: CSSProperties = { display: "grid", gap: "10px" };
const evidenceItemStyle: CSSProperties = { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", border: "1px solid #D0D0CE", borderRadius: "13px", background: "#ECECE7", padding: "12px" };
const linkedActionButtonGroupStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" };
const qrGridStyle: CSSProperties = { display: "grid", gap: "16px" };
const qrCardStyle: CSSProperties = { display: "grid", gridTemplateColumns: "110px minmax(0, 1fr)", gap: "18px", alignItems: "center", border: "1px solid #D0D0CE", background: "#ECECE7", borderRadius: "18px", padding: "18px" };
const qrImageStyle: CSSProperties = { width: "132px", height: "132px", borderRadius: "14px", background: "#ffffff", border: `1px solid ${imsColours.brandBorder}`, padding: "8px", objectFit: "contain", boxSizing: "border-box" };
const qrTitleStyle: CSSProperties = { margin: "0 0 6px", color: imsColours.ink, fontSize: "22px", fontWeight: 900 };
const emptyTextStyle: CSSProperties = { color: imsColours.slate, margin: 0, lineHeight: 1.55 };
const infoBoxStyle: CSSProperties = { border: `1px solid ${imsColours.brandBorder}`, background: imsColours.brandSoft, color: imsColours.ink, borderRadius: "16px", padding: "16px", lineHeight: 1.5 };

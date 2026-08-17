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
import { QualityKpiCard } from "../../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../../src/components/QualityPageHero";
import { supabase } from "../../../src/lib/supabase";

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
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [selectedId, setSelectedId] = useState("");
  const selectedDetailRef = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [reporterTypeFilter, setReporterTypeFilter] = useState("");
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));
  const [showFilters, setShowFilters] = useState(false);
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
    const matched = records.find((record) => record.id === target || record.observation_number === target);
    if (!matched) return;
    setSelectedId(matched.id);
    setActiveView("register");
  }, [records]);

  async function loadData() {
    setLoading(true);
    const [observationRes, evidenceRes, actionRes, peopleRes] = await Promise.all([
      supabase.from("hse_observations").select("*").order("created_at", { ascending: false }),
      supabase.from("hse_observation_evidence").select("*").order("uploaded_at", { ascending: false }),
      supabase.from("actions").select("*").order("action_number", { ascending: true }),
      supabase.from("people").select("id,name,role,department,active").eq("active", true).order("name", { ascending: true }),
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

  const filteredRecords = useMemo(() => {
    const lower = search.trim().toLowerCase();
    return yearRecords.filter((record) => {
      const matchesSearch = !lower || [
        record.observation_number,
        record.title,
        record.description,
        record.project,
        record.site_location,
        record.reporter_name,
        record.reporter_company,
      ].some((value) => (value || "").toLowerCase().includes(lower));
      const matchesStatus = !statusFilter || record.status === statusFilter;
      const matchesType = !typeFilter || record.observation_type === typeFilter;
      const matchesRisk = !riskFilter || record.risk_level === riskFilter;
      const matchesReporterType = !reporterTypeFilter || record.reporter_type === reporterTypeFilter;
      return matchesSearch && matchesStatus && matchesType && matchesRisk && matchesReporterType;
    });
  }, [reporterTypeFilter, riskFilter, search, statusFilter, typeFilter, yearRecords]);

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
    const { data, error } = await supabase.storage.from(evidenceBucket).createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) {
      setMessage(`Evidence link failed: ${error?.message || "No link returned"}`);
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
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
        actions={
          <>
            <label style={yearSelectStyle}>
              <span>Year</span>
              <select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}>
                {availableYears.map((year) => <option key={year}>{year}</option>)}
              </select>
            </label>
          </>
        }
        status={<><strong>Status:</strong> {message}</>}
      />

      <ImsTabs tabs={tabs} active={activeView} onChange={setActiveView} ariaLabel="Observation views" />

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
              actions={<ImsButton variant="secondary" onClick={() => { setSearch(""); setStatusFilter(""); setTypeFilter(""); setRiskFilter(""); setReporterTypeFilter(""); }}>Clear Filters</ImsButton>}
            >
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
            <div style={imsTableInfoRowStyle}>Showing <strong>{filteredRecords.length}</strong> of <strong>{yearRecords.length}</strong> observations</div>
            <div className="observation-table-wrap" style={{ overflowX: "auto", border: "1px solid #D0D0CE", borderRadius: "14px" }}>
              <table className="observation-table" style={{ ...imsTableStyle, minWidth: 980 }}>
                <thead>
                  <tr>
                    {["Observation No.", "Type", "Project", "Location", "Risk", "Status", "Submitted As", "Submitted By", "Date"].map((heading) => (
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
                      <td data-label="Location" style={imsTableCellStyle}>{record.site_location || "-"}</td>
                      <td data-label="Risk" style={imsTableCellStyle}>{record.risk_level || "-"}</td>
                      <td data-label="Status" style={imsTableCellStyle}><StatusPill status={record.status || "New"} /></td>
                      <td data-label="Submitted As" style={imsTableCellStyle}>{record.reporter_type || "Quick Fill"}</td>
                      <td data-label="Submitted By" style={imsTableCellStyle}>{record.reporter_name || record.reporter_company || "Not provided"}</td>
                      <td data-label="Date" style={imsTableCellStyle}>{formatDate(record.observation_date || record.created_at)}</td>
                    </tr>
                  ))}
                  {!filteredRecords.length ? (
                    <tr><td colSpan={9} style={emptyCellStyle}>No observations match the current filters.</td></tr>
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

  return (
    <ImsPanel title={`Observation Detail - ${record.observation_number}`} subtitle="Review the submitted card, open evidence, assign owner, and manage status.">
      <div className="observation-detail-grid" style={detailGridStyle}>
        <Info label="Submitted As" value={record.reporter_type || "Quick Fill"} />
        <Info label="Submitted By" value={record.reporter_name || "Not provided"} />
        <Info label="Company / Organisation" value={record.reporter_company} />
        <Info label="Contact" value={record.reporter_contact} />
        <Info label="Type" value={record.observation_type} />
        <Info label="Risk / Attention" value={record.risk_level} />
        <Info label="Project" value={record.project} />
        <Info label="Location" value={record.site_location} />
        <Info label="Date" value={`${formatDate(record.observation_date)}${record.observation_time ? ` ${record.observation_time}` : ""}`} />
      </div>
      <div style={narrativeGridStyle}>
        <Info label="Title" value={record.title} large />
        <Info label="Observation" value={record.description} large />
        <Info label="Immediate Action" value={record.immediate_action} large />
        <Info label="Suggested Action" value={record.suggested_action} large />
      </div>

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
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Close-out / Review Notes">
            <textarea style={{ ...imsInputStyle, minHeight: 96, resize: "vertical" }} value={draftCloseout} onChange={(event) => setDraftCloseout(event.target.value)} />
          </Field>
        </div>
        <div style={buttonRowStyle}>
          <ImsButton
            onClick={() => onUpdate({ status: draftStatus, assigned_to: draftAssigned || null, closeout_notes: draftCloseout || null })}
            disabled={!canEdit}
          >
            Save Review
          </ImsButton>
          {canCreateAction ? (
            <ImsLinkButton href={createActionHref}>Generate Central Action</ImsLinkButton>
          ) : (
            <ImsButton variant="secondary" onClick={onCreateActionBlocked} disabled>
              Generate Central Action
            </ImsButton>
          )}
          <ImsButton variant="danger" onClick={() => onDelete(record)} disabled={!canEdit}>Delete Observation</ImsButton>
        </div>
      </div>

      <div style={{ marginBottom: "14px" }}>
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
          {!linkedActions.length ? <div style={emptyStateStyle}>No central actions are linked to this observation yet.</div> : null}
        </div>
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

function Info({ label, value, large = false }: { label: string; value: ReactNode; large?: boolean }) {
  return (
    <div style={infoStyle}>
      <span style={infoLabelStyle}>{label}</span>
      <strong style={{ ...infoValueStyle, whiteSpace: large ? "pre-wrap" : "normal" }}>{value || "-"}</strong>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const colour = isClosed(status)
    ? { background: "#ECECE7", color: "#005670" }
    : normalise(status) === "new"
    ? { background: "#ECECE7", color: "#005670" }
    : normalise(status) === "action required"
    ? { background: "#ECECE7", color: "#F93822" }
    : { background: "#ECECE7", color: "#000000" };
  return <span style={{ ...pillStyle, ...colour }}>{status || "New"}</span>;
}

const yearSelectStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  minHeight: "42px",
  padding: "0 10px",
  borderRadius: "10px",
  background: "#ffffff",
  border: "1px solid #D0D0CE",
  color: imsColours.ink,
  fontWeight: 900,
};
const kpiGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "16px", marginBottom: "20px" };
const chartGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "20px" };
const registerGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: "20px", alignItems: "start" };
const fieldStyle: CSSProperties = { display: "grid", gap: "6px" };
const labelStyle: CSSProperties = { color: "#53565A", fontSize: "12px", fontWeight: 900 };
const selectedRowStyle: CSSProperties = { cursor: "pointer", background: "#eef7f8" };
const rowStyle: CSSProperties = { cursor: "pointer" };
const emptyCellStyle: CSSProperties = { padding: "28px 14px", textAlign: "center", color: imsColours.slate, background: "#ECECE7" };
const emptyStateStyle: CSSProperties = { border: "1px dashed #D0D0CE", borderRadius: "14px", padding: "16px", color: imsColours.slate, background: "#ECECE7", lineHeight: 1.45 };
const latestListStyle: CSSProperties = { display: "grid", gap: "10px" };
const latestItemStyle: CSSProperties = { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", border: "1px solid #D0D0CE", borderRadius: "14px", padding: "12px", background: "#ffffff", textAlign: "left", cursor: "pointer" };
const detailGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px", marginBottom: "12px" };
const narrativeGridStyle: CSSProperties = { display: "grid", gap: "10px", marginBottom: "14px" };
const infoStyle: CSSProperties = { border: "1px solid #D0D0CE", borderRadius: "13px", background: "#ECECE7", padding: "12px", display: "grid", gap: "5px" };
const infoLabelStyle: CSSProperties = { color: imsColours.muted, fontSize: "11px", fontWeight: 900, letterSpacing: "0.06em", textTransform: "uppercase" };
const infoValueStyle: CSSProperties = { color: imsColours.ink, fontSize: "13px", lineHeight: 1.45 };
const editPanelStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px", border: "1px solid #D0D0CE", borderRadius: "14px", background: "#ffffff", padding: "14px", marginBottom: "14px" };
const buttonRowStyle: CSSProperties = { display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" };
const subHeadingStyle: CSSProperties = { margin: "0 0 10px", color: imsColours.ink, fontSize: "16px", fontWeight: 900 };
const evidenceListStyle: CSSProperties = { display: "grid", gap: "10px" };
const evidenceItemStyle: CSSProperties = { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", border: "1px solid #D0D0CE", borderRadius: "13px", background: "#ECECE7", padding: "12px" };
const linkedActionButtonGroupStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" };
const pillStyle: CSSProperties = { display: "inline-flex", alignItems: "center", borderRadius: "999px", padding: "5px 9px", fontSize: "12px", fontWeight: 900 };
const qrGridStyle: CSSProperties = { display: "grid", gap: "16px" };
const qrCardStyle: CSSProperties = { display: "grid", gridTemplateColumns: "110px minmax(0, 1fr)", gap: "18px", alignItems: "center", border: "1px solid #D0D0CE", background: "#ECECE7", borderRadius: "18px", padding: "18px" };
const qrImageStyle: CSSProperties = { width: "132px", height: "132px", borderRadius: "14px", background: "#ffffff", border: `1px solid ${imsColours.brandBorder}`, padding: "8px", objectFit: "contain", boxSizing: "border-box" };
const qrTitleStyle: CSSProperties = { margin: "0 0 6px", color: imsColours.ink, fontSize: "22px", fontWeight: 900 };
const emptyTextStyle: CSSProperties = { color: imsColours.slate, margin: 0, lineHeight: 1.55 };
const infoBoxStyle: CSSProperties = { border: `1px solid ${imsColours.brandBorder}`, background: imsColours.brandSoft, color: imsColours.ink, borderRadius: "16px", padding: "16px", lineHeight: 1.5 };

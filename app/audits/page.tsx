"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

type AuditType = "Internal" | "Supplier" | "Project" | "Follow-up";
type AuditStatus = "Planned" | "In Progress" | "Completed" | "Overdue" | "Cancelled";
type FindingSeverity = "Major NCR" | "Minor NCR" | "Observation" | "OFI";
type AuditPriority = "High" | "Medium" | "Low";

type AuditRecord = {
  id: string;
  audit_number: string;
  title: string;
  audit_type: AuditType;
  auditee: string;
  lead_auditor: string;
  audit_date: string;
  due_date: string;
  status: AuditStatus;
  priority: AuditPriority;
  standard: string;
  location: string;
  scope: string;
  summary: string;
  next_steps: string;
  findings: {
    major: number;
    minor: number;
    observation: number;
    ofi: number;
  };
  linked_ncrs: string[];
  linked_actions: string[];
};

type FindingRecord = {
  id: string;
  audit_id: string;
  reference: string;
  clause: string;
  severity: FindingSeverity;
  description: string;
  owner: string;
  due_date: string;
  status: "Open" | "In Progress" | "Closed";
};

type AuditForm = {
  audit_number: string;
  title: string;
  audit_type: AuditType;
  auditee: string;
  lead_auditor: string;
  audit_date: string;
  due_date: string;
  status: AuditStatus;
  priority: AuditPriority;
  standard: string;
  location: string;
  scope: string;
  summary: string;
  next_steps: string;
};

const seedAudits: AuditRecord[] = [
  {
    id: "1",
    audit_number: "AUD-001",
    title: "Blyth Base Internal QMS Audit",
    audit_type: "Internal",
    auditee: "Blyth Base",
    lead_auditor: "Jordan Beaton",
    audit_date: "2026-04-10",
    due_date: "2026-04-24",
    status: "In Progress",
    priority: "High",
    standard: "ISO 9001:2015",
    location: "Blyth",
    scope: "Document control, calibration, actions follow-up and business continuity controls.",
    summary: "Audit underway. Early review indicates good visibility of open actions but document review discipline needs tightening.",
    next_steps: "Complete close-out meeting, assign owners, issue report pack.",
    findings: { major: 0, minor: 2, observation: 2, ofi: 1 },
    linked_ncrs: ["NCR-001"],
    linked_actions: ["ACT-003", "ACT-007"],
  },
  {
    id: "2",
    audit_number: "AUD-002",
    title: "Supplier Audit - TrackOne",
    audit_type: "Supplier",
    auditee: "TrackOne",
    lead_auditor: "Jordan Beaton",
    audit_date: "2026-04-04",
    due_date: "2026-04-18",
    status: "Completed",
    priority: "High",
    standard: "ISO 9001 / Supplier Requirements",
    location: "Supplier Site",
    scope: "Manufacturing controls, sling management, calibration, nonconformance process and HSE observations.",
    summary: "Audit completed. Quality controls generally workable, but better consistency and visible control of shop floor practices required.",
    next_steps: "Monitor corrective actions and review objective evidence on closure.",
    findings: { major: 0, minor: 1, observation: 3, ofi: 1 },
    linked_ncrs: ["NCR-004", "NCR-006"],
    linked_actions: ["ACT-009"],
  },
  {
    id: "3",
    audit_number: "AUD-003",
    title: "Quarterly Supplier Review - Parkburn",
    audit_type: "Supplier",
    auditee: "Parkburn",
    lead_auditor: "L. Thompson",
    audit_date: "2026-04-22",
    due_date: "2026-05-06",
    status: "Planned",
    priority: "Medium",
    standard: "ISO 9001 / Project ITP Requirements",
    location: "Remote",
    scope: "Project-specific ITP readiness, documentation controls, inspection checkpoints.",
    summary: "Planned review for project readiness and documentation alignment.",
    next_steps: "Confirm attendees, issue agenda and checklist.",
    findings: { major: 0, minor: 0, observation: 0, ofi: 0 },
    linked_ncrs: [],
    linked_actions: [],
  },
  {
    id: "4",
    audit_number: "AUD-004",
    title: "Business Continuity Follow-up",
    audit_type: "Follow-up",
    auditee: "Onshore Operations",
    lead_auditor: "Jordan Beaton",
    audit_date: "2026-03-18",
    due_date: "2026-04-01",
    status: "Overdue",
    priority: "High",
    standard: "Internal Procedure Review",
    location: "Blyth / Darlington",
    scope: "Verification of plan updates, contact lists and exercise evidence.",
    summary: "Follow-up still open due to delayed evidence submission for location updates and exercise close-out.",
    next_steps: "Escalate overdue actions and obtain revised completion dates.",
    findings: { major: 1, minor: 1, observation: 0, ofi: 0 },
    linked_ncrs: ["NCR-010"],
    linked_actions: ["ACT-011", "ACT-012"],
  },
];

const seedFindings: FindingRecord[] = [
  {
    id: "1",
    audit_id: "1",
    reference: "F-001",
    clause: "7.5 / Internal Procedure",
    severity: "Minor NCR",
    description: "Document review dates were not consistently updated across controlled records.",
    owner: "D. Wardman",
    due_date: "2026-04-24",
    status: "Open",
  },
  {
    id: "2",
    audit_id: "1",
    reference: "F-002",
    clause: "7.1.5",
    severity: "Observation",
    description: "Calibration evidence was available but not centrally referenced against the active asset register.",
    owner: "J. Beaton",
    due_date: "2026-04-26",
    status: "In Progress",
  },
  {
    id: "3",
    audit_id: "2",
    reference: "F-003",
    clause: "8.7",
    severity: "Observation",
    description: "Visible nonconforming item control on the shop floor was not fully consistent during the visit.",
    owner: "Supplier",
    due_date: "2026-04-18",
    status: "Open",
  },
  {
    id: "4",
    audit_id: "4",
    reference: "F-004",
    clause: "Continuity Planning",
    severity: "Major NCR",
    description: "Location updates remained incomplete and recent exercise evidence was not available for review.",
    owner: "Operations",
    due_date: "2026-04-01",
    status: "Open",
  },
];

const emptyAuditForm: AuditForm = {
  audit_number: "AUD-005",
  title: "",
  audit_type: "Internal",
  auditee: "",
  lead_auditor: "",
  audit_date: "",
  due_date: "",
  status: "Planned",
  priority: "Medium",
  standard: "ISO 9001:2015",
  location: "",
  scope: "",
  summary: "",
  next_steps: "",
};

function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function daysToDue(value: string) {
  if (!value) return null;
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getStatusTone(status: AuditStatus | string) {
  const value = status.toLowerCase();
  if (value.includes("overdue")) return { bg: "#fee2e2", color: "#991b1b" };
  if (value.includes("progress")) return { bg: "#fef3c7", color: "#92400e" };
  if (value.includes("planned")) return { bg: "#dbeafe", color: "#1d4ed8" };
  if (value.includes("completed")) return { bg: "#dcfce7", color: "#166534" };
  return { bg: "#e2e8f0", color: "#334155" };
}

function getSeverityTone(severity: FindingSeverity) {
  if (severity === "Major NCR") return { bg: "#fee2e2", color: "#991b1b" };
  if (severity === "Minor NCR") return { bg: "#fef3c7", color: "#92400e" };
  if (severity === "Observation") return { bg: "#dbeafe", color: "#1d4ed8" };
  return { bg: "#dcfce7", color: "#166534" };
}

export default function AuditsPage() {
  const [audits, setAudits] = useState<AuditRecord[]>(seedAudits);
  const [findings] = useState<FindingRecord[]>(seedFindings);
  const [selectedAuditId, setSelectedAuditId] = useState<string>(seedAudits[0]?.id || "");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AuditStatus | "All">("All");
  const [typeFilter, setTypeFilter] = useState<AuditType | "All">("All");
  const [priorityFilter, setPriorityFilter] = useState<AuditPriority | "All">("All");
  const [form, setForm] = useState<AuditForm>(emptyAuditForm);
  const [message, setMessage] = useState("Audit dashboard ready. Supabase hook-up is the next step.");

  const selectedAudit = useMemo(
    () => audits.find((audit) => audit.id === selectedAuditId) || null,
    [audits, selectedAuditId]
  );

  const selectedFindings = useMemo(
    () => findings.filter((finding) => finding.audit_id === selectedAuditId),
    [findings, selectedAuditId]
  );

  const filteredAudits = useMemo(() => {
    const lower = search.trim().toLowerCase();
    return audits.filter((audit) => {
      const matchesSearch =
        !lower ||
        audit.audit_number.toLowerCase().includes(lower) ||
        audit.title.toLowerCase().includes(lower) ||
        audit.auditee.toLowerCase().includes(lower) ||
        audit.lead_auditor.toLowerCase().includes(lower) ||
        audit.standard.toLowerCase().includes(lower);

      const matchesStatus = statusFilter === "All" || audit.status === statusFilter;
      const matchesType = typeFilter === "All" || audit.audit_type === typeFilter;
      const matchesPriority = priorityFilter === "All" || audit.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesType && matchesPriority;
    });
  }, [audits, search, statusFilter, typeFilter, priorityFilter]);

  const kpis = useMemo(() => {
    const planned = audits.filter((audit) => audit.status === "Planned").length;
    const inProgress = audits.filter((audit) => audit.status === "In Progress").length;
    const overdue = audits.filter((audit) => audit.status === "Overdue").length;
    const completed = audits.filter((audit) => audit.status === "Completed").length;
    const totalMajor = findings.filter((finding) => finding.severity === "Major NCR").length;
    const openFindings = findings.filter((finding) => finding.status !== "Closed").length;

    return { planned, inProgress, overdue, completed, totalMajor, openFindings };
  }, [audits, findings]);

  const attentionAudits = useMemo(() => {
    return audits
      .filter((audit) => audit.status === "Overdue" || audit.status === "In Progress")
      .sort((a, b) => {
        const aDays = daysToDue(a.due_date) ?? 9999;
        const bDays = daysToDue(b.due_date) ?? 9999;
        return aDays - bDays;
      })
      .slice(0, 4);
  }, [audits]);

  function createAudit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.title.trim() || !form.auditee.trim()) {
      setMessage("Audit title and auditee are required.");
      return;
    }

    const newAudit: AuditRecord = {
      id: String(Date.now()),
      audit_number: form.audit_number,
      title: form.title.trim(),
      audit_type: form.audit_type,
      auditee: form.auditee.trim(),
      lead_auditor: form.lead_auditor.trim() || "Unassigned",
      audit_date: form.audit_date,
      due_date: form.due_date,
      status: form.status,
      priority: form.priority,
      standard: form.standard.trim(),
      location: form.location.trim() || "-",
      scope: form.scope.trim() || "-",
      summary: form.summary.trim() || "-",
      next_steps: form.next_steps.trim() || "-",
      findings: { major: 0, minor: 0, observation: 0, ofi: 0 },
      linked_ncrs: [],
      linked_actions: [],
    };

    setAudits((prev) => [newAudit, ...prev]);
    setSelectedAuditId(newAudit.id);
    setForm({ ...emptyAuditForm, audit_number: `AUD-${String(audits.length + 1).padStart(3, "0")}` });
    setMessage(`${newAudit.audit_number} created locally. Next step is persisting to Supabase.`);
  }

  return (
    <main>
      <section style={heroStyle}>
        <div style={{ flex: "1 1 620px" }}>
          <div style={eyebrowStyle}>Audit Management</div>
          <h1 style={heroTitleStyle}>Audits</h1>
          <p style={heroSubtitleStyle}>
            Plan, run, track and close internal, supplier and project audits in one polished dashboard.
            Built for schedule control, findings visibility and proper quality follow-up.
          </p>

          <div style={heroPillGridStyle}>
            <HeroPill label="Planned" value={kpis.planned} tone="blue" />
            <HeroPill label="In Progress" value={kpis.inProgress} tone="amber" />
            <HeroPill label="Overdue" value={kpis.overdue} tone="red" />
            <HeroPill label="Open Findings" value={kpis.openFindings} tone="neutral" />
          </div>
        </div>

        <div style={heroMetaGridStyle}>
          <HeroMetaCard label="Completed Audits" value={kpis.completed} />
          <HeroMetaCard label="Major NCRs Raised" value={kpis.totalMajor} />
          <HeroMetaCard label="Current Selection" value={selectedAudit?.audit_number || "None"} compact />
          <HeroMetaCard label="Output" value="Audit pack ready" compact />
        </div>
      </section>

      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <Link href="/" style={backLinkStyle}>
          ← Back to Dashboard
        </Link>
        <div style={statusBannerStyle}>
          <strong>Status:</strong> {message}
        </div>
      </div>

      <section style={statsGridStyle}>
        <StatCard title="Planned Audits" value={kpis.planned} accent="#2563eb" />
        <StatCard title="In Progress" value={kpis.inProgress} accent="#f59e0b" />
        <StatCard title="Overdue" value={kpis.overdue} accent="#dc2626" />
        <StatCard title="Completed" value={kpis.completed} accent="#16a34a" />
        <StatCard title="Open Findings" value={kpis.openFindings} accent="#7c3aed" />
        <StatCard title="Major NCRs" value={kpis.totalMajor} accent="#b91c1c" />
      </section>

      <section style={twoColumnGridStyle}>
        <SectionCard
          title="Create Audit"
          subtitle="Set up a clean audit record with enough detail to start strong and report properly later."
        >
          <form onSubmit={createAudit}>
            <div style={formGridStyle}>
              <Field label="Audit Number">
                <input
                  value={form.audit_number}
                  onChange={(e) => setForm({ ...form, audit_number: e.target.value })}
                  style={inputStyle}
                />
              </Field>

              <Field label="Audit Type">
                <select value={form.audit_type} onChange={(e) => setForm({ ...form, audit_type: e.target.value as AuditType })} style={inputStyle}>
                  <option value="Internal">Internal</option>
                  <option value="Supplier">Supplier</option>
                  <option value="Project">Project</option>
                  <option value="Follow-up">Follow-up</option>
                </select>
              </Field>

              <Field label="Audit Title">
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={inputStyle} placeholder="e.g. Supplier Audit - Parkburn" />
              </Field>

              <Field label="Auditee">
                <input value={form.auditee} onChange={(e) => setForm({ ...form, auditee: e.target.value })} style={inputStyle} placeholder="Department / Supplier / Site" />
              </Field>

              <Field label="Lead Auditor">
                <input value={form.lead_auditor} onChange={(e) => setForm({ ...form, lead_auditor: e.target.value })} style={inputStyle} placeholder="Lead auditor" />
              </Field>

              <Field label="Standard / Basis">
                <input value={form.standard} onChange={(e) => setForm({ ...form, standard: e.target.value })} style={inputStyle} placeholder="ISO 9001 / Client requirements" />
              </Field>

              <Field label="Audit Date">
                <input type="date" value={form.audit_date} onChange={(e) => setForm({ ...form, audit_date: e.target.value })} style={inputStyle} />
              </Field>

              <Field label="Due Date">
                <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} style={inputStyle} />
              </Field>

              <Field label="Priority">
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as AuditPriority })} style={inputStyle}>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </Field>

              <Field label="Status">
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as AuditStatus })} style={inputStyle}>
                  <option value="Planned">Planned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </Field>

              <Field label="Location">
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} style={inputStyle} placeholder="Blyth / Supplier Site / Remote" />
              </Field>

              <div />

              <Field label="Scope">
                <textarea value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} style={textareaStyle} placeholder="What exactly is being audited?" />
              </Field>

              <Field label="Summary">
                <textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} style={textareaStyle} placeholder="Management-level summary / expected output" />
              </Field>

              <Field label="Next Steps">
                <textarea value={form.next_steps} onChange={(e) => setForm({ ...form, next_steps: e.target.value })} style={textareaStyle} placeholder="Immediate follow-up / actions / close-out plan" />
              </Field>
            </div>

            <div style={formFooterStyle}>
              <button type="submit" style={primaryButtonStyle}>Create Audit</button>
              <span style={helperTextStyle}>This version is wired for instant UI flow. Next pass will persist to Supabase and generate audit packs.</span>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title="Attention Board"
          subtitle="What needs chasing or leadership visibility right now."
        >
          <div style={attentionGridStyle}>
            {attentionAudits.map((audit) => (
              <button
                key={audit.id}
                type="button"
                onClick={() => setSelectedAuditId(audit.id)}
                style={{
                  ...attentionCardStyle,
                  background: selectedAuditId === audit.id ? "#eff6ff" : "#ffffff",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
                  <span style={miniTagStyle}>{audit.audit_type}</span>
                  <span style={{ ...miniTagStyle, background: getStatusTone(audit.status).bg, color: getStatusTone(audit.status).color }}>
                    {audit.status}
                  </span>
                </div>
                <div style={attentionNumberStyle}>{audit.audit_number}</div>
                <div style={attentionTitleStyle}>{audit.title}</div>
                <div style={attentionSubStyle}>{audit.auditee} · {audit.standard}</div>
                <div style={attentionMetaRowStyle}>
                  <span>{audit.lead_auditor}</span>
                  <span>{formatDate(audit.due_date)}</span>
                </div>
              </button>
            ))}
          </div>
        </SectionCard>
      </section>

      <SectionCard
        title="Audit Register"
        subtitle="Filter, review and jump into any audit quickly."
      >
        <div style={filterBarStyle}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} style={inputStyle} placeholder="Search audit number, title, auditee, auditor..." />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as AuditStatus | "All")} style={inputStyle}>
            <option value="All">All Status</option>
            <option value="Planned">Planned</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Overdue">Overdue</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as AuditType | "All")} style={inputStyle}>
            <option value="All">All Types</option>
            <option value="Internal">Internal</option>
            <option value="Supplier">Supplier</option>
            <option value="Project">Project</option>
            <option value="Follow-up">Follow-up</option>
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as AuditPriority | "All")} style={inputStyle}>
            <option value="All">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        <div style={registerInfoStyle}>
          Showing <strong>{filteredAudits.length}</strong> of <strong>{audits.length}</strong> audits
        </div>

        <div style={registerGridStyle}>
          <div style={registerListWrapStyle}>
            <div style={registerHeadStyle}>
              <div>Audit</div>
              <div>Status</div>
              <div>Priority</div>
              <div>Lead</div>
              <div>Due</div>
              <div>Findings</div>
            </div>

            <div style={registerBodyStyle}>
              {filteredAudits.map((audit) => {
                const active = selectedAuditId === audit.id;
                const totalFindings = audit.findings.major + audit.findings.minor + audit.findings.observation + audit.findings.ofi;
                return (
                  <button
                    key={audit.id}
                    type="button"
                    onClick={() => setSelectedAuditId(audit.id)}
                    style={{ ...registerRowStyle, background: active ? "#eff6ff" : "#ffffff" }}
                  >
                    <div>
                      <div style={registerPrimaryStyle}>{audit.audit_number}</div>
                      <div style={registerTitleStyle}>{audit.title}</div>
                      <div style={registerSecondaryStyle}>{audit.audit_type} · {audit.auditee} · {audit.standard}</div>
                    </div>
                    <div>
                      <span style={{ ...badgeStyle, background: getStatusTone(audit.status).bg, color: getStatusTone(audit.status).color }}>{audit.status}</span>
                    </div>
                    <div>
                      <span style={{ ...badgeStyle, background: "#f8fafc", color: "#334155" }}>{audit.priority}</span>
                    </div>
                    <div style={registerValueStyle}>{audit.lead_auditor}</div>
                    <div style={registerValueStyle}>{formatDate(audit.due_date)}</div>
                    <div style={registerValueStyle}>{totalFindings}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={detailPanelStyle}>
            {!selectedAudit ? (
              <div>
                <div style={panelEyebrowStyle}>Audit detail</div>
                <h3 style={detailTitleStyle}>Select an audit</h3>
                <p style={detailTextStyle}>Choose an audit from the register to view the scope, summary, linked items and findings.</p>
              </div>
            ) : (
              <>
                <div style={panelEyebrowStyle}>Audit detail</div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <div style={detailNumberStyle}>{selectedAudit.audit_number}</div>
                    <h3 style={detailTitleStyle}>{selectedAudit.title}</h3>
                  </div>
                  <span style={{ ...badgeStyle, background: getStatusTone(selectedAudit.status).bg, color: getStatusTone(selectedAudit.status).color }}>
                    {selectedAudit.status}
                  </span>
                </div>

                <div style={detailGridStyle}>
                  <DetailBox label="Type" value={selectedAudit.audit_type} />
                  <DetailBox label="Auditee" value={selectedAudit.auditee} />
                  <DetailBox label="Lead Auditor" value={selectedAudit.lead_auditor} />
                  <DetailBox label="Location" value={selectedAudit.location} />
                  <DetailBox label="Audit Date" value={formatDate(selectedAudit.audit_date)} />
                  <DetailBox label="Due Date" value={formatDate(selectedAudit.due_date)} />
                </div>

                <div style={detailSectionStyle}>
                  <div style={detailSectionLabelStyle}>Scope</div>
                  <div style={detailTextStyle}>{selectedAudit.scope}</div>
                </div>

                <div style={detailSectionStyle}>
                  <div style={detailSectionLabelStyle}>Summary</div>
                  <div style={detailTextStyle}>{selectedAudit.summary}</div>
                </div>

                <div style={detailSectionStyle}>
                  <div style={detailSectionLabelStyle}>Next Steps</div>
                  <div style={detailTextStyle}>{selectedAudit.next_steps}</div>
                </div>

                <div style={linkedWrapStyle}>
                  <DetailTagGroup title="Linked NCRs" items={selectedAudit.linked_ncrs} />
                  <DetailTagGroup title="Linked Actions" items={selectedAudit.linked_actions} />
                </div>
              </>
            )}
          </div>
        </div>
      </SectionCard>

      <section style={twoColumnGridStyle}>
        <SectionCard
          title="Findings Register"
          subtitle="Everything raised against the selected audit with clear ownership and due dates."
        >
          {!selectedAudit ? (
            <p style={emptyTextStyle}>Select an audit to review findings.</p>
          ) : selectedFindings.length === 0 ? (
            <p style={emptyTextStyle}>No findings logged for this audit yet.</p>
          ) : (
            <div style={findingListStyle}>
              {selectedFindings.map((finding) => {
                const tone = getSeverityTone(finding.severity);
                return (
                  <div key={finding.id} style={findingCardStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                      <div>
                        <div style={findingRefStyle}>{finding.reference}</div>
                        <div style={findingClauseStyle}>{finding.clause}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ ...badgeStyle, background: tone.bg, color: tone.color }}>{finding.severity}</span>
                        <span style={{ ...badgeStyle, background: getStatusTone(finding.status).bg, color: getStatusTone(finding.status).color }}>{finding.status}</span>
                      </div>
                    </div>
                    <div style={findingDescriptionStyle}>{finding.description}</div>
                    <div style={findingFooterStyle}>
                      <span><strong>Owner:</strong> {finding.owner}</span>
                      <span><strong>Due:</strong> {formatDate(finding.due_date)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="What this should hook into next"
          subtitle="The pieces that make this a proper quality tool rather than just a pretty front end."
        >
          <div style={checklistWrapStyle}>
            {[
              "Supabase tables: audits, audit_findings, audit_checklists, audit_evidence",
              "Audit checklist builder with clause references and response fields",
              "Raise NCR / Action directly from a finding",
              "PDF audit report output with Enshore branding",
              "Supplier history per audit and score trends",
              "Evidence upload for audit records and findings",
              "Close-out workflow with target dates and verification sign-off",
              "Dashboard-level overdue alerts and audit calendar view",
            ].map((item) => (
              <div key={item} style={checklistItemStyle}>
                <span style={checkIconStyle}>✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </section>
    </main>
  );
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section style={panelStyle}>
      <div style={sectionHeaderStyle}>
        <h2 style={sectionTitleStyle}>{title}</h2>
        {subtitle ? <p style={sectionSubtitleStyle}>{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={fieldWrapStyle}>
      <span style={fieldLabelStyle}>{label}</span>
      {children}
    </label>
  );
}

function StatCard({ title, value, accent }: { title: string; value: number; accent: string }) {
  return (
    <div style={{ ...statCardStyle, borderTop: `4px solid ${accent}` }}>
      <div style={statLabelStyle}>{title}</div>
      <div style={statValueStyle}>{value}</div>
    </div>
  );
}

function HeroPill({ label, value, tone }: { label: string; value: number; tone: "green" | "amber" | "red" | "blue" | "neutral" }) {
  const tones = {
    green: { bg: "rgba(220,252,231,0.15)", border: "rgba(220,252,231,0.26)", text: "#dcfce7" },
    amber: { bg: "rgba(254,243,199,0.15)", border: "rgba(254,243,199,0.28)", text: "#fef3c7" },
    red: { bg: "rgba(254,226,226,0.15)", border: "rgba(254,226,226,0.28)", text: "#fee2e2" },
    blue: { bg: "rgba(219,234,254,0.15)", border: "rgba(219,234,254,0.28)", text: "#dbeafe" },
    neutral: { bg: "rgba(255,255,255,0.12)", border: "rgba(255,255,255,0.20)", text: "#ffffff" },
  };

  const colours = tones[tone];
  return (
    <div style={{ ...heroPillStyle, background: colours.bg, border: `1px solid ${colours.border}` }}>
      <div style={heroPillLabelStyle}>{label}</div>
      <div style={{ ...heroPillValueStyle, color: colours.text }}>{value}</div>
    </div>
  );
}

function HeroMetaCard({ label, value, compact }: { label: string; value: string | number; compact?: boolean }) {
  return (
    <div style={heroMetaCardStyle}>
      <div style={heroMetaLabelStyle}>{label}</div>
      <div style={compact ? heroMetaCompactValueStyle : heroMetaValueStyle}>{value}</div>
    </div>
  );
}

function DetailBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={detailBoxStyle}>
      <div style={detailBoxLabelStyle}>{label}</div>
      <div style={detailBoxValueStyle}>{value}</div>
    </div>
  );
}

function DetailTagGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div style={detailTagGroupStyle}>
      <div style={detailSectionLabelStyle}>{title}</div>
      <div style={detailTagsWrapStyle}>
        {items.length === 0 ? <span style={detailTagMutedStyle}>None linked</span> : items.map((item) => <span key={item} style={detailTagStyle}>{item}</span>)}
      </div>
    </div>
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

const heroPillGridStyle: CSSProperties = {
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

const heroMetaGridStyle: CSSProperties = {
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

const heroMetaCompactValueStyle: CSSProperties = {
  fontSize: "15px",
  fontWeight: 700,
  lineHeight: 1.4,
};

const backLinkStyle: CSSProperties = {
  color: "#0f766e",
  fontWeight: 700,
  textDecoration: "none",
};

const statusBannerStyle: CSSProperties = {
  background: "white",
  borderRadius: "12px",
  padding: "12px 16px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
  color: "#0f172a",
};

const statsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: "16px",
  marginBottom: "20px",
};

const statCardStyle: CSSProperties = {
  background: "white",
  borderRadius: "16px",
  padding: "18px 20px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
};

const statLabelStyle: CSSProperties = {
  fontSize: "13px",
  color: "#64748b",
  fontWeight: 600,
};

const statValueStyle: CSSProperties = {
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

const sectionHeaderStyle: CSSProperties = {
  marginBottom: "16px",
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

const formGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "14px",
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

const inputStyle: CSSProperties = {
  padding: "11px 12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  background: "white",
  color: "#0f172a",
  width: "100%",
  boxSizing: "border-box",
};

const textareaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: "96px",
  resize: "vertical",
  fontFamily: "Arial, Helvetica, sans-serif",
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

const attentionGridStyle: CSSProperties = {
  display: "grid",
  gap: "14px",
};

const attentionCardStyle: CSSProperties = {
  textAlign: "left",
  padding: "16px",
  borderRadius: "16px",
  border: "1px solid #e2e8f0",
  cursor: "pointer",
};

const miniTagStyle: CSSProperties = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: "999px",
  background: "#f8fafc",
  color: "#334155",
  fontWeight: 700,
  fontSize: "12px",
};

const attentionNumberStyle: CSSProperties = {
  color: "#64748b",
  fontSize: "13px",
  fontWeight: 700,
  marginBottom: "6px",
};

const attentionTitleStyle: CSSProperties = {
  color: "#0f172a",
  fontWeight: 800,
  fontSize: "16px",
  marginBottom: "6px",
};

const attentionSubStyle: CSSProperties = {
  color: "#475569",
  fontSize: "13px",
  lineHeight: 1.45,
};

const attentionMetaRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  marginTop: "10px",
  color: "#64748b",
  fontSize: "12px",
};

const filterBarStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1fr 1fr",
  gap: "12px",
  marginBottom: "16px",
};

const registerInfoStyle: CSSProperties = {
  marginBottom: "12px",
  color: "#475569",
  fontSize: "14px",
};

const registerGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.45fr 0.95fr",
  gap: "18px",
  alignItems: "start",
};

const registerListWrapStyle: CSSProperties = {
  border: "1px solid #d7dee7",
  borderRadius: "18px",
  overflow: "hidden",
};

const registerHeadStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.8fr 0.9fr 0.9fr 1fr 0.8fr 0.7fr",
  gap: "12px",
  padding: "14px 16px",
  background: "#f8fafc",
  borderBottom: "1px solid #e5e7eb",
  fontSize: "12px",
  fontWeight: 800,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: 0.3,
};

const registerBodyStyle: CSSProperties = {
  maxHeight: "720px",
  overflowY: "auto",
};

const registerRowStyle: CSSProperties = {
  width: "100%",
  textAlign: "left",
  display: "grid",
  gridTemplateColumns: "1.8fr 0.9fr 0.9fr 1fr 0.8fr 0.7fr",
  gap: "12px",
  padding: "16px",
  border: "none",
  borderBottom: "1px solid #eef2f7",
  cursor: "pointer",
};

const registerPrimaryStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 800,
  color: "#0f766e",
  marginBottom: "6px",
};

const registerTitleStyle: CSSProperties = {
  fontSize: "15px",
  fontWeight: 800,
  color: "#0f172a",
  marginBottom: "6px",
};

const registerSecondaryStyle: CSSProperties = {
  fontSize: "12px",
  color: "#64748b",
  lineHeight: 1.45,
};

const registerValueStyle: CSSProperties = {
  fontSize: "13px",
  color: "#0f172a",
  fontWeight: 700,
};

const detailPanelStyle: CSSProperties = {
  border: "1px solid #d7dee7",
  borderRadius: "18px",
  background: "#ffffff",
  minHeight: "420px",
  padding: "20px",
  position: "sticky",
  top: "16px",
};

const panelEyebrowStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 800,
  color: "#64748b",
  marginBottom: "8px",
  textTransform: "uppercase",
  letterSpacing: 0.3,
};

const detailNumberStyle: CSSProperties = {
  color: "#64748b",
  fontSize: "13px",
  fontWeight: 800,
};

const detailTitleStyle: CSSProperties = {
  margin: "4px 0 0 0",
  fontSize: "20px",
  color: "#0f172a",
};

const detailGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
  marginBottom: "14px",
};

const detailBoxStyle: CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "12px 14px",
};

const detailBoxLabelStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 800,
  color: "#64748b",
  marginBottom: "6px",
  textTransform: "uppercase",
};

const detailBoxValueStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 700,
  color: "#0f172a",
};

const detailSectionStyle: CSSProperties = {
  marginBottom: "14px",
};

const detailSectionLabelStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 800,
  color: "#64748b",
  marginBottom: "6px",
  textTransform: "uppercase",
};

const detailTextStyle: CSSProperties = {
  color: "#475569",
  lineHeight: 1.55,
  margin: 0,
};

const linkedWrapStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
};

const detailTagGroupStyle: CSSProperties = {
  display: "grid",
  gap: "8px",
};

const detailTagsWrapStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const detailTagStyle: CSSProperties = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: "999px",
  background: "#ede9fe",
  color: "#6d28d9",
  fontSize: "12px",
  fontWeight: 800,
};

const detailTagMutedStyle: CSSProperties = {
  color: "#94a3b8",
  fontSize: "13px",
};

const findingListStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
};

const findingCardStyle: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  padding: "14px 16px",
  background: "#f8fafc",
};

const findingRefStyle: CSSProperties = {
  fontWeight: 800,
  color: "#0f172a",
  fontSize: "14px",
};

const findingClauseStyle: CSSProperties = {
  color: "#64748b",
  fontSize: "12px",
  marginTop: "4px",
};

const findingDescriptionStyle: CSSProperties = {
  color: "#334155",
  fontSize: "14px",
  lineHeight: 1.5,
  marginBottom: "10px",
};

const findingFooterStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  color: "#475569",
  fontSize: "13px",
};

const checklistWrapStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
};

const checklistItemStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  alignItems: "flex-start",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "12px 14px",
  color: "#334155",
  lineHeight: 1.45,
};

const checkIconStyle: CSSProperties = {
  color: "#0f766e",
  fontWeight: 800,
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

"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { ImsButton, ImsPanel, ImsTabs, ImsTopMetaRow } from "../../src/components/ImsPrimitives";
import { QualityKpiCard } from "../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../src/components/QualityPageHero";
import {
  imsColours,
  imsInputStyle,
  imsPanelStyle,
  imsTableCellStyle,
  imsTableHeadStyle,
  imsTableInfoRowStyle,
  imsTableStyle,
} from "../../src/components/imsTheme";

type AdminView = "dashboard" | "users" | "roles" | "company" | "reference" | "notifications" | "audit";

type PersonRow = {
  id: string;
  name: string;
  email?: string | null;
  role?: string | null;
  department?: string | null;
  active?: boolean | null;
  system_role?: string | null;
  access_status?: string | null;
  is_master_admin?: boolean | null;
  permissions_notes?: string | null;
  permission_override?: string | null;
  quality_access?: string | null;
  hse_access?: string | null;
  asset_access?: string | null;
  risk_access?: string | null;
  document_access?: string | null;
  action_access?: string | null;
  admin_access?: string | null;
  last_login_at?: string | null;
};

type AuthUserRow = {
  id: string;
  email: string;
  last_sign_in_at?: string | null;
  created_at?: string | null;
  banned_until?: string | null;
  confirmed_at?: string | null;
};

type CompanySettings = {
  id?: string;
  company_name?: string;
  trading_name?: string | null;
  address?: string | null;
  primary_contact_name?: string | null;
  primary_contact_email?: string | null;
  primary_brand_colour?: string | null;
  financial_year_start_month?: number | null;
};

type ReferenceDepartment = {
  id: string;
  name: string;
  code?: string | null;
  active: boolean;
};

type ReferenceProject = {
  id: string;
  name: string;
  type?: string | null;
  active: boolean;
};

type RoleRow = {
  id: string;
  role_name: string;
  description?: string | null;
  quality_access?: string | null;
  hse_access?: string | null;
  asset_access?: string | null;
  risk_access?: string | null;
  document_access?: string | null;
  action_access?: string | null;
  admin_access?: string | null;
  active?: boolean | null;
};

type AuditLogRow = {
  id: string;
  actor_email?: string | null;
  action_type: string;
  target_type?: string | null;
  target_reference?: string | null;
  summary?: string | null;
  created_at: string;
};

type AdminData = {
  currentUserEmail: string;
  people: PersonRow[];
  authUsers: AuthUserRow[];
  company: CompanySettings | null;
  departments: ReferenceDepartment[];
  projects: ReferenceProject[];
  roles: RoleRow[];
  auditLog: AuditLogRow[];
  warnings: string[];
};

const adminTabs: Array<{ value: AdminView; label: string }> = [
  { value: "dashboard", label: "Dashboard" },
  { value: "users", label: "Users & Access" },
  { value: "roles", label: "Roles" },
  { value: "company", label: "Company" },
  { value: "reference", label: "Reference Data" },
  { value: "notifications", label: "Notifications" },
  { value: "audit", label: "Audit Log" },
];

const roleOptions = [
  "Admin",
  "Manager",
  "HSE Officer",
  "Quality Engineer",
  "Document Controller",
  "Asset Manager",
  "Viewer",
  "Contractor",
];

const accessStatusOptions = ["Active", "Invited", "Deactivated"];
const permissionOverrideOptions = ["Role Default", "Custom", "Full System Access", "Read Only"];
const moduleAccessOptions = ["Role Default", "None", "Read", "Edit", "Approve", "Documents", "Observe", "Full"];
const roleAccessOptions = ["None", "Read", "Edit", "Approve", "Documents", "Observe", "Full"];

const initialCompany: CompanySettings = {
  company_name: "Enshore Subsea",
  trading_name: "Enshore",
  address: "",
  primary_contact_name: "",
  primary_contact_email: "",
  primary_brand_colour: "#3A9B98",
  financial_year_start_month: 1,
};

function formatDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normaliseEmail(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function getAuthUserForPerson(person: PersonRow, authUsers: AuthUserRow[]) {
  const email = normaliseEmail(person.email);
  if (!email) return null;
  return authUsers.find((user) => normaliseEmail(user.email) === email) || null;
}

function SelectField({
  value,
  onChange,
  children,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} style={imsInputStyle}>
      {children}
    </select>
  );
}

function Field({
  label,
  children,
  style,
}: {
  label: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <label style={{ display: "grid", gap: "6px", fontSize: "12px", fontWeight: 900, color: "#334155", textTransform: "uppercase", letterSpacing: "0.04em", ...style }}>
      {label}
      {children}
    </label>
  );
}

function StatusPill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "warn" | "danger" }) {
  const colour =
    tone === "good" ? "#dcfce7" : tone === "warn" ? "#fef3c7" : tone === "danger" ? "#fee2e2" : "#e2e8f0";
  const text =
    tone === "good" ? "#166534" : tone === "warn" ? "#92400e" : tone === "danger" ? "#991b1b" : "#334155";

  return (
    <span style={{ display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "5px 9px", background: colour, color: text, fontSize: "12px", fontWeight: 900 }}>
      {children}
    </span>
  );
}

export default function AdminDashboardPage() {
  const [activeView, setActiveView] = useState<AdminView>("dashboard");
  const [data, setData] = useState<AdminData | null>(null);
  const [message, setMessage] = useState("Loading Admin / Settings...");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    job_role: "",
    department: "",
    system_role: "Viewer",
  });
  const [companyForm, setCompanyForm] = useState<CompanySettings>(initialCompany);
  const [newDepartment, setNewDepartment] = useState({ name: "", code: "" });
  const [newProject, setNewProject] = useState({ name: "", type: "Project" });
  const [personDrafts, setPersonDrafts] = useState<Record<string, Partial<PersonRow>>>({});
  const [selectedOverridePersonId, setSelectedOverridePersonId] = useState("");
  const [roleDrafts, setRoleDrafts] = useState<Record<string, Partial<RoleRow>>>({});

  async function loadAdminData() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin-settings", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) {
        setMessage(`Load failed: ${json.error || "Unknown error"}`);
        setData(null);
        return;
      }

      setData(json as AdminData);
      setCompanyForm({ ...initialCompany, ...(json.company || {}) });
      setMessage(json.warnings?.length ? `Loaded with warnings: ${json.warnings.join(" | ")}` : "Admin / Settings loaded successfully.");
    } catch (error) {
      setMessage(`Load failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAdminData();
  }, []);

  const authByEmail = useMemo(() => {
    const map = new Map<string, AuthUserRow>();
    (data?.authUsers || []).forEach((user) => {
      if (user.email) map.set(normaliseEmail(user.email), user);
    });
    return map;
  }, [data?.authUsers]);

  const userStats = useMemo(() => {
    const people = data?.people || [];
    const active = people.filter((person) => person.access_status !== "Deactivated" && person.active !== false).length;
    const deactivated = people.filter((person) => person.access_status === "Deactivated" || person.active === false).length;
    const invited = people.filter((person) => person.access_status === "Invited").length;
    const admins = people.filter((person) => person.system_role === "Admin" || person.is_master_admin).length;
    return { total: people.length, active, invited, deactivated, admins };
  }, [data?.people]);

  const departments = data?.departments || [];
  const projects = data?.projects || [];
  const roles = data?.roles || [];
  const editableRoleOptions = roles.length ? roles.map((role) => role.role_name) : roleOptions;
  const people = data?.people || [];

  function getPersonDraft(person: PersonRow) {
    return { ...person, ...(personDrafts[person.id] || {}) };
  }

  function setPersonDraft(person: PersonRow, updates: Partial<PersonRow>) {
    setPersonDrafts((current) => ({
      ...current,
      [person.id]: {
        ...(current[person.id] || {}),
        ...updates,
      },
    }));
  }

  function getRoleDraft(role: RoleRow) {
    return { ...role, ...(roleDrafts[role.id] || {}) };
  }

  function setRoleDraft(role: RoleRow, updates: Partial<RoleRow>) {
    setRoleDrafts((current) => ({
      ...current,
      [role.id]: {
        ...(current[role.id] || {}),
        ...updates,
      },
    }));
  }

  async function postAdminAction(action: string, payload: Record<string, unknown>, successMessage: string) {
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload }),
      });
      const json = await response.json();
      if (!response.ok) {
        setMessage(`${successMessage.replace("successfully.", "failed")}: ${json.error || "Unknown error"}`);
        return false;
      }
      setMessage(successMessage);
      await loadAdminData();
      return true;
    } catch (error) {
      setMessage(`${successMessage.replace("successfully.", "failed")}: ${error instanceof Error ? error.message : "Unknown error"}`);
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function inviteUser() {
    const ok = await postAdminAction("inviteUser", inviteForm, `${inviteForm.name || "User"} invited successfully.`);
    if (ok) {
      setInviteForm({ name: "", email: "", job_role: "", department: "", system_role: "Viewer" });
    }
  }

  async function updatePersonAccess(person: PersonRow, updates: Partial<PersonRow>) {
    const ok = await postAdminAction(
      "updatePersonAccess",
      { ...person, ...updates },
      `${updates.email || person.email || person.name} access updated successfully.`,
    );
    if (ok) {
      setPersonDrafts((current) => {
        const next = { ...current };
        delete next[person.id];
        return next;
      });
    }
  }

  async function updateRolePermissions(role: RoleRow) {
    const draft = getRoleDraft(role);
    const ok = await postAdminAction("updateRole", draft as Record<string, unknown>, `${role.role_name} permissions saved successfully.`);
    if (ok) {
      setRoleDrafts((current) => {
        const next = { ...current };
        delete next[role.id];
        return next;
      });
    }
  }

  async function saveCompany() {
    await postAdminAction("updateCompany", companyForm as Record<string, unknown>, "Company settings saved successfully.");
  }

  async function addDepartment() {
    const ok = await postAdminAction("addDepartment", newDepartment, `${newDepartment.name} added successfully.`);
    if (ok) setNewDepartment({ name: "", code: "" });
  }

  async function addProject() {
    const ok = await postAdminAction("addProject", newProject, `${newProject.name} added successfully.`);
    if (ok) setNewProject({ name: "", type: "Project" });
  }

  return (
    <main>
      <QualityPageHero
        label="ADMIN / SETTINGS"
        title="Admin Console"
        description="Controlled system console for users, roles, company profile, reference data, notifications, and future permission governance."
        contextCards={[
          { label: "Last Refreshed", value: isLoading ? "Loading" : new Date().toLocaleString("en-GB") },
          { label: "Master Admin", value: "Jordan Beaton" },
        ]}
      />

      <ImsTopMetaRow
        backHref="/home"
        backLabel="Back to Home"
        actions={<ImsButton onClick={loadAdminData} disabled={isLoading}>Refresh</ImsButton>}
        status={<><strong>Status:</strong> {message}</>}
      />

      <ImsTabs tabs={adminTabs} active={activeView} onChange={setActiveView} ariaLabel="Admin settings views" />

      {activeView === "dashboard" ? (
        <>
          <section style={kpiGridStyle}>
            <QualityKpiCard title="IMS Users" value={userStats.total} accent={imsColours.brand} />
            <QualityKpiCard title="Active Access" value={userStats.active} accent={imsColours.success} />
            <QualityKpiCard title="Pending Invites" value={userStats.invited} accent={imsColours.warning} />
            <QualityKpiCard title="Admins" value={userStats.admins} accent={imsColours.purple} />
            <QualityKpiCard title="Departments" value={departments.length} accent={imsColours.blue} />
            <QualityKpiCard title="Projects / Sites" value={projects.length} accent={imsColours.brandDark} />
          </section>

          <section style={dashboardGridStyle}>
            <ImsPanel title="Launch Readiness" subtitle="Safe Phase 1 admin controls without global permission enforcement.">
              <div style={readinessGridStyle}>
                <ReadinessItem title="User data" value="Connected" tone="good" />
                <ReadinessItem title="Role data" value="Ready" tone="good" />
                <ReadinessItem title="Global enforcement" value="Not enabled yet" tone="warn" />
                <ReadinessItem title="Audit log" value="Recording admin changes" tone="good" />
              </div>
            </ImsPanel>
            <ImsPanel title="Governance Notes" subtitle="What this pass deliberately does and does not do.">
              <p style={paragraphStyle}>
                This console lets Admins prepare users, roles, company settings, and reference data. It does not yet hide modules or block operational pages by role, so the existing IMS workflows continue to work while permissions are tested.
              </p>
            </ImsPanel>
          </section>
        </>
      ) : null}

      {activeView === "users" ? (
        <section style={{ display: "grid", gap: "18px" }}>
          <ImsPanel title="Invite New User" subtitle="Creates a Supabase invite and a linked People Management record.">
            <div style={formGridStyle}>
              <Field label="Name">
                <input value={inviteForm.name} onChange={(event) => setInviteForm({ ...inviteForm, name: event.target.value })} style={imsInputStyle} placeholder="e.g. Peter Ridley" />
              </Field>
              <Field label="Email">
                <input value={inviteForm.email} onChange={(event) => setInviteForm({ ...inviteForm, email: event.target.value })} style={imsInputStyle} placeholder="name@enshoresubsea.com" />
              </Field>
              <Field label="Job Role">
                <input value={inviteForm.job_role} onChange={(event) => setInviteForm({ ...inviteForm, job_role: event.target.value })} style={imsInputStyle} placeholder="e.g. HSE Manager" />
              </Field>
              <Field label="Department">
                <SelectField value={inviteForm.department} onChange={(value) => setInviteForm({ ...inviteForm, department: value })}>
                  <option value="">Select department</option>
                  {departments.map((department) => <option key={department.id} value={department.name}>{department.name}</option>)}
                </SelectField>
              </Field>
              <Field label="System Role">
                <SelectField value={inviteForm.system_role} onChange={(value) => setInviteForm({ ...inviteForm, system_role: value })}>
                  {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
                </SelectField>
              </Field>
              <div style={{ display: "flex", alignItems: "end" }}>
                <ImsButton onClick={inviteUser} disabled={isSaving}>Invite User</ImsButton>
              </div>
            </div>
          </ImsPanel>

          <ImsPanel title="Users & Access" subtitle="Role and access staging. Master admin cannot be deactivated.">
            <div style={imsTableInfoRowStyle}>Showing {people.length} user records</div>
            <div style={tableWrapStyle}>
              <table style={imsTableStyle}>
                <thead>
                  <tr>
                    <th style={imsTableHeadStyle}>Name</th>
                    <th style={imsTableHeadStyle}>Email</th>
                    <th style={imsTableHeadStyle}>Department</th>
                    <th style={imsTableHeadStyle}>System Role</th>
                    <th style={imsTableHeadStyle}>Access</th>
                    <th style={imsTableHeadStyle}>Last Login</th>
                    <th style={imsTableHeadStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {people.map((person) => {
                    const draft = getPersonDraft(person);
                    const authUser = getAuthUserForPerson(person, data?.authUsers || []);
                    const isMaster = person.is_master_admin || normaliseEmail(person.email) === "jbeaton@enshoresubsea.com" || person.name === "Jordan Beaton";
                    const accessStatus = draft.access_status || (person.active === false ? "Deactivated" : "Active");
                    const hasDraft = Boolean(personDrafts[person.id]);
                    return (
                      <tr key={person.id}>
                        <td style={imsTableCellStyle}>
                          <strong>{person.name}</strong>
                          {isMaster ? <div style={{ marginTop: 6 }}><StatusPill tone="good">Master Admin</StatusPill></div> : null}
                          {person.permission_override && person.permission_override !== "Role Default" ? (
                            <div style={{ marginTop: 6 }}><StatusPill tone="warn">{person.permission_override}</StatusPill></div>
                          ) : null}
                        </td>
                        <td style={imsTableCellStyle}>{person.email || ""}</td>
                        <td style={imsTableCellStyle}>
                          <SelectField
                            value={draft.department || ""}
                            onChange={(value) => setPersonDraft(person, { department: value })}
                            disabled={isSaving}
                          >
                            <option value="">Unassigned</option>
                            {departments.map((department) => <option key={department.id} value={department.name}>{department.name}</option>)}
                          </SelectField>
                        </td>
                        <td style={imsTableCellStyle}>
                          <SelectField
                            value={isMaster ? "Admin" : draft.system_role || "Viewer"}
                            onChange={(value) => setPersonDraft(person, { system_role: value })}
                            disabled={isSaving || isMaster}
                          >
                            {editableRoleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
                          </SelectField>
                        </td>
                        <td style={imsTableCellStyle}>
                          <SelectField
                            value={isMaster ? "Active" : accessStatus}
                            onChange={(value) => setPersonDraft(person, { access_status: value })}
                            disabled={isSaving || isMaster}
                          >
                            {accessStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                          </SelectField>
                        </td>
                        <td style={imsTableCellStyle}>{formatDateTime(authUser?.last_sign_in_at || person.last_login_at)}</td>
                        <td style={imsTableCellStyle}>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <ImsButton onClick={() => updatePersonAccess(person, draft)} disabled={isSaving || !hasDraft}>
                              Save
                            </ImsButton>
                            {person.email ? (
                              <ImsButton variant="secondary" onClick={() => postAdminAction("resetPassword", { email: person.email }, `Password reset sent to ${person.email}.`)} disabled={isSaving}>
                                Reset Password
                              </ImsButton>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </ImsPanel>
        </section>
      ) : null}

      {activeView === "roles" ? (
        <section style={{ display: "grid", gap: 18 }}>
          <ImsPanel title="Roles & Permissions" subtitle="Edit role defaults here. Individual exceptions are managed below without changing someone's job role.">
            <div style={roleCardGridStyle}>
              {roles.map((role) => {
                const draft = getRoleDraft(role);
                const hasDraft = Boolean(roleDrafts[role.id]);
                const isAdminRole = role.role_name === "Admin";
                return (
                  <section key={role.id} style={roleCardStyle}>
                    <div style={roleCardHeaderStyle}>
                      <div>
                        <h3 style={roleCardTitleStyle}>{role.role_name}</h3>
                        {isAdminRole ? <StatusPill tone="good">Protected Full Access</StatusPill> : null}
                      </div>
                      <ImsButton onClick={() => updateRolePermissions(role)} disabled={isSaving || !hasDraft || isAdminRole}>
                        Save Role
                      </ImsButton>
                    </div>

                    <div style={rolePermissionGridStyle}>
                      {[
                        ["Quality", "quality_access", roleAccessOptions],
                        ["Documents", "document_access", moduleAccessOptions],
                        ["HSE", "hse_access", roleAccessOptions],
                        ["Assets", "asset_access", roleAccessOptions],
                        ["Risk", "risk_access", roleAccessOptions],
                        ["Actions", "action_access", roleAccessOptions],
                        ["Admin", "admin_access", roleAccessOptions],
                      ].map(([label, key, options]) => (
                        <Field key={String(key)} label={String(label)}>
                          <SelectField
                            value={String((draft as Record<string, unknown>)[key as string] || (key === "document_access" ? "Role Default" : "None"))}
                            onChange={(value) => setRoleDraft(role, { [key as string]: value } as Partial<RoleRow>)}
                            disabled={isSaving || isAdminRole}
                          >
                            {(options as string[]).map((option) => <option key={option} value={option}>{option}</option>)}
                          </SelectField>
                        </Field>
                      ))}
                      <Field label="Purpose" style={{ gridColumn: "1 / -1" }}>
                        <textarea
                          value={draft.description || ""}
                          onChange={(event) => setRoleDraft(role, { description: event.target.value })}
                          style={{ ...imsInputStyle, minHeight: 72 }}
                          disabled={isSaving}
                        />
                      </Field>
                    </div>
                  </section>
                );
              })}
            </div>
          </ImsPanel>

          <ImsPanel title="Individual Permission Overrides" subtitle="Use this only for exceptions, such as someone with a normal job role but wider IMS ownership access.">
            <div style={permissionGridStyle}>
              <Field label="Person">
                <SelectField value={selectedOverridePersonId} onChange={setSelectedOverridePersonId}>
                  <option value="">Select person</option>
                  {people.map((person) => <option key={person.id} value={person.id}>{person.name} {person.email ? `- ${person.email}` : ""}</option>)}
                </SelectField>
              </Field>
              {selectedOverridePersonId ? (() => {
                const person = people.find((item) => item.id === selectedOverridePersonId);
                if (!person) return null;
                const draft = getPersonDraft(person);
                const isMaster = person.is_master_admin || normaliseEmail(person.email) === "jbeaton@enshoresubsea.com" || person.name === "Jordan Beaton";
                return (
                  <>
                    <Field label="Permission Override">
                      <SelectField
                        value={isMaster ? "Full System Access" : draft.permission_override || "Role Default"}
                        onChange={(value) => {
                          const full = value === "Full System Access";
                          const readOnly = value === "Read Only";
                          setPersonDraft(person, {
                            permission_override: value,
                            ...(full
                              ? {
                                  quality_access: "Full",
                                  hse_access: "Full",
                                  asset_access: "Full",
                                  risk_access: "Full",
                                  document_access: "Full",
                                  action_access: "Full",
                                  admin_access: "Full",
                                }
                              : readOnly
                              ? {
                                  quality_access: "Read",
                                  hse_access: "Read",
                                  asset_access: "Read",
                                  risk_access: "Read",
                                  document_access: "Read",
                                  action_access: "Read",
                                  admin_access: "None",
                                }
                              : {}),
                          });
                        }}
                        disabled={isSaving || isMaster}
                      >
                        {permissionOverrideOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                      </SelectField>
                    </Field>
                    {[
                      ["Quality", "quality_access"],
                      ["Documents", "document_access"],
                      ["HSE", "hse_access"],
                      ["Assets", "asset_access"],
                      ["Risk", "risk_access"],
                      ["Actions", "action_access"],
                      ["Admin", "admin_access"],
                    ].map(([label, key]) => (
                      <Field key={key} label={label}>
                        <SelectField
                          value={isMaster ? "Full" : String((draft as Record<string, unknown>)[key] || "Role Default")}
                          onChange={(value) => setPersonDraft(person, { [key]: value === "Role Default" ? "" : value } as Partial<PersonRow>)}
                          disabled={isSaving || isMaster}
                        >
                          {moduleAccessOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                        </SelectField>
                      </Field>
                    ))}
                    <Field label="Permission Notes" style={{ gridColumn: "1 / -1" }}>
                      <textarea
                        value={draft.permissions_notes || ""}
                        onChange={(event) => setPersonDraft(person, { permissions_notes: event.target.value })}
                        style={{ ...imsInputStyle, minHeight: 76 }}
                        placeholder="Reason for any custom access, e.g. Full access due IMS ownership."
                      />
                    </Field>
                    <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
                      <ImsButton onClick={() => updatePersonAccess(person, draft)} disabled={isSaving || !personDrafts[person.id]}>
                        Save Individual Override
                      </ImsButton>
                    </div>
                  </>
                );
              })() : null}
            </div>
          </ImsPanel>
        </section>
      ) : null}

      {activeView === "company" ? (
        <ImsPanel title="Company Profile" subtitle="Report branding and company metadata foundation. Logo upload will remain a later controlled step.">
          <div style={formGridStyle}>
            <Field label="Company Name">
              <input value={companyForm.company_name || ""} onChange={(event) => setCompanyForm({ ...companyForm, company_name: event.target.value })} style={imsInputStyle} />
            </Field>
            <Field label="Trading Name">
              <input value={companyForm.trading_name || ""} onChange={(event) => setCompanyForm({ ...companyForm, trading_name: event.target.value })} style={imsInputStyle} />
            </Field>
            <Field label="Primary Contact">
              <input value={companyForm.primary_contact_name || ""} onChange={(event) => setCompanyForm({ ...companyForm, primary_contact_name: event.target.value })} style={imsInputStyle} />
            </Field>
            <Field label="Primary Contact Email">
              <input value={companyForm.primary_contact_email || ""} onChange={(event) => setCompanyForm({ ...companyForm, primary_contact_email: event.target.value })} style={imsInputStyle} />
            </Field>
            <Field label="Brand Colour">
              <input value={companyForm.primary_brand_colour || "#3A9B98"} onChange={(event) => setCompanyForm({ ...companyForm, primary_brand_colour: event.target.value })} style={imsInputStyle} />
            </Field>
            <Field label="Financial Year Start">
              <SelectField value={String(companyForm.financial_year_start_month || 1)} onChange={(value) => setCompanyForm({ ...companyForm, financial_year_start_month: Number(value) })}>
                {Array.from({ length: 12 }, (_, index) => (
                  <option key={index + 1} value={index + 1}>{new Date(2026, index, 1).toLocaleString("en-GB", { month: "long" })}</option>
                ))}
              </SelectField>
            </Field>
            <Field label="Company Address" style={{ gridColumn: "1 / -1" }}>
              <textarea value={companyForm.address || ""} onChange={(event) => setCompanyForm({ ...companyForm, address: event.target.value })} style={{ ...imsInputStyle, minHeight: 90 }} />
            </Field>
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
              <ImsButton onClick={saveCompany} disabled={isSaving}>Save Company Profile</ImsButton>
            </div>
          </div>
        </ImsPanel>
      ) : null}

      {activeView === "reference" ? (
        <section style={dashboardGridStyle}>
          <ImsPanel title="Departments" subtitle="Controlled department list for future dropdown centralisation.">
            <div style={{ ...formGridStyle, gridTemplateColumns: "1fr 140px auto", marginBottom: 16 }}>
              <input value={newDepartment.name} onChange={(event) => setNewDepartment({ ...newDepartment, name: event.target.value })} style={imsInputStyle} placeholder="Department name" />
              <input value={newDepartment.code} onChange={(event) => setNewDepartment({ ...newDepartment, code: event.target.value.toUpperCase() })} style={imsInputStyle} placeholder="Code" />
              <ImsButton onClick={addDepartment} disabled={isSaving}>Add</ImsButton>
            </div>
            <ReferenceList items={departments.map((department) => ({ id: department.id, label: department.name, meta: department.code || "", active: department.active }))} />
          </ImsPanel>

          <ImsPanel title="Projects / Vessels / Sites" subtitle="Foundation list for project and site dropdowns.">
            <div style={{ ...formGridStyle, gridTemplateColumns: "1fr 160px auto", marginBottom: 16 }}>
              <input value={newProject.name} onChange={(event) => setNewProject({ ...newProject, name: event.target.value })} style={imsInputStyle} placeholder="Project / vessel / site name" />
              <SelectField value={newProject.type} onChange={(value) => setNewProject({ ...newProject, type: value })}>
                <option value="Project">Project</option>
                <option value="Vessel">Vessel</option>
                <option value="Site">Site</option>
                <option value="Client">Client</option>
              </SelectField>
              <ImsButton onClick={addProject} disabled={isSaving}>Add</ImsButton>
            </div>
            <ReferenceList items={projects.map((project) => ({ id: project.id, label: project.name, meta: project.type || "Project", active: project.active }))} />
          </ImsPanel>
        </section>
      ) : null}

      {activeView === "notifications" ? (
        <ImsPanel title="Notification Settings" subtitle="Planned settings area for due-date reminders and escalation rules.">
          <p style={paragraphStyle}>
            Next phase: control events such as NCR raised, document review due, action overdue, AINM overdue, and inspection schedule reminders. This pass keeps existing notification behaviour unchanged.
          </p>
        </ImsPanel>
      ) : null}

      {activeView === "audit" ? (
        <ImsPanel title="Audit Log" subtitle="Read-only trace of Admin / Settings actions.">
          <div style={tableWrapStyle}>
            <table style={imsTableStyle}>
              <thead>
                <tr>
                  <th style={imsTableHeadStyle}>Date</th>
                  <th style={imsTableHeadStyle}>Actor</th>
                  <th style={imsTableHeadStyle}>Action</th>
                  <th style={imsTableHeadStyle}>Target</th>
                  <th style={imsTableHeadStyle}>Summary</th>
                </tr>
              </thead>
              <tbody>
                {(data?.auditLog || []).map((entry) => (
                  <tr key={entry.id}>
                    <td style={imsTableCellStyle}>{formatDateTime(entry.created_at)}</td>
                    <td style={imsTableCellStyle}>{entry.actor_email}</td>
                    <td style={imsTableCellStyle}>{entry.action_type}</td>
                    <td style={imsTableCellStyle}>{entry.target_reference || entry.target_type}</td>
                    <td style={imsTableCellStyle}>{entry.summary}</td>
                  </tr>
                ))}
                {!data?.auditLog?.length ? (
                  <tr><td style={imsTableCellStyle} colSpan={5}>No Admin / Settings audit entries yet.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </ImsPanel>
      ) : null}
    </main>
  );
}

function ReadinessItem({ title, value, tone }: { title: string; value: string; tone: "good" | "warn" | "danger" }) {
  return (
    <div style={{ ...imsPanelStyle, padding: 14, borderRadius: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 900, color: imsColours.slate, marginBottom: 8 }}>{title}</div>
      <StatusPill tone={tone}>{value}</StatusPill>
    </div>
  );
}

function ReferenceList({ items }: { items: Array<{ id: string; label: string; meta: string; active: boolean }> }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {items.map((item) => (
        <div key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 12px", borderRadius: 12, border: `1px solid ${imsColours.border}`, background: "#fff" }}>
          <div>
            <strong>{item.label}</strong>
            {item.meta ? <span style={{ color: imsColours.muted, marginLeft: 8 }}>{item.meta}</span> : null}
          </div>
          <StatusPill tone={item.active ? "good" : "neutral"}>{item.active ? "Active" : "Inactive"}</StatusPill>
        </div>
      ))}
      {!items.length ? <p style={paragraphStyle}>No reference values configured yet.</p> : null}
    </div>
  );
}

const kpiGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 14,
  marginBottom: 18,
};

const dashboardGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 18,
};

const readinessGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 12,
};

const formGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
  alignItems: "end",
};

const tableWrapStyle: CSSProperties = {
  overflowX: "auto",
  border: `1px solid ${imsColours.border}`,
  borderRadius: 14,
};

const permissionGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 12,
  padding: 12,
};

const roleCardGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
  gap: 14,
};

const roleCardStyle: CSSProperties = {
  border: `1px solid ${imsColours.border}`,
  borderRadius: 16,
  background: "#ffffff",
  padding: 14,
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
};

const roleCardHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 14,
};

const roleCardTitleStyle: CSSProperties = {
  margin: "0 0 8px",
  fontSize: 18,
  color: imsColours.ink,
};

const rolePermissionGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
  gap: 10,
};

const paragraphStyle: CSSProperties = {
  color: imsColours.slate,
  margin: 0,
  lineHeight: 1.6,
};

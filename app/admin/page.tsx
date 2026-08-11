"use client";

import type { CSSProperties, ReactNode } from "react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { ImsPermissionNotice, useImsPermissions } from "../../src/components/ImsPermissions";
import { ImsButton, ImsPanel, ImsTabs, ImsTopMetaRow } from "../../src/components/ImsPrimitives";
import { QualityKpiCard } from "../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../src/components/QualityPageHero";
import { IMS_PERMISSION_REGISTRY } from "../../src/lib/imsPermissionRegistry";
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
  people_access?: string | null;
  management_review_access?: string | null;
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
  code?: string | null;
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
  people_access?: string | null;
  management_review_access?: string | null;
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

type TabPermissionRow = {
  id?: string;
  person_id?: string | null;
  email: string;
  module_key: string;
  area_key: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  full_access: boolean;
};
type AccessRequestRow = { id: string; first_name: string; last_name: string; email: string; department: string; reason: string; requested_modules: string[]; status: string; submitted_at: string; reviewed_at?: string | null; reviewed_by?: string | null; review_notes?: string | null };

type AdminData = {
  currentUserEmail: string;
  people: PersonRow[];
  authUsers: AuthUserRow[];
  company: CompanySettings | null;
  departments: ReferenceDepartment[];
  projects: ReferenceProject[];
  roles: RoleRow[];
  auditLog: AuditLogRow[];
  tabPermissions: TabPermissionRow[];
  accessRequests: AccessRequestRow[];
  warnings: string[];
};

const adminTabs: Array<{ value: AdminView; label: string }> = [
  { value: "users", label: "Users & Access" },
  { value: "reference", label: "Reference Data" },
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
const moduleAccessOptions = ["Role Default", "None", "Part Access", "Read", "Edit", "Approve", "Documents", "Observe", "Full"];
const roleAccessOptions = ["None", "Read", "Edit", "Approve", "Documents", "Observe", "Full"];

export const legacyModulePermissionDefinitions = [
  {
    moduleKey: "quality",
    label: "Quality Management",
    accessField: "quality_access",
    areas: [
      ["dashboard", "Dashboard"],
      ["calendar", "Calendar"],
      ["moc", "MOC"],
      ["ncr", "NCR"],
      ["audits", "Audits"],
      ["actions", "Actions"],
      ["reports", "Reports"],
      ["lessons", "Lessons Learned"],
    ],
  },
  {
    moduleKey: "documents",
    label: "Document Control",
    accessField: "document_access",
    areas: [
      ["document-control", "Document Control"],
      ["certification", "Certification"],
    ],
  },
  {
    moduleKey: "hse",
    label: "HSE Management",
    accessField: "hse_access",
    areas: [
      ["dashboard", "Dashboard"],
      ["calendar", "Calendar"],
      ["ainm", "AINM"],
      ["observations", "Observations"],
      ["ptw", "PTW"],
      ["inspections", "Inspections"],
      ["actions", "Actions"],
      ["reports", "Reports"],
    ],
  },
  {
    moduleKey: "assets",
    label: "Asset Management",
    accessField: "asset_access",
    areas: [
      ["dashboard", "Dashboard"],
      ["register", "Asset Register"],
      ["calibration", "Calibration"],
      ["inspection", "Inspection"],
      ["maintenance", "Maintenance"],
      ["actions", "Actions"],
      ["reports", "Reports"],
    ],
  },
  {
    moduleKey: "risk",
    label: "Risk Management",
    accessField: "risk_access",
    areas: [
      ["dashboard", "Dashboard"],
      ["register", "Risk Register"],
      ["reviews", "Reviews"],
      ["controls", "Controls"],
      ["opportunities", "Opportunities"],
      ["actions", "Actions"],
      ["reports", "Reports"],
    ],
  },
  {
    moduleKey: "actions",
    label: "Action Management",
    accessField: "action_access",
    areas: [
      ["dashboard", "Dashboard"],
      ["register", "Action Register"],
      ["create", "Create Action"],
      ["my-actions", "My Actions"],
      ["overdue", "Overdue / Priority"],
      ["reports", "Reports"],
    ],
  },
  {
    moduleKey: "management-review",
    label: "Management Review",
    accessField: "management_review_access",
    areas: [
      ["dashboard", "Dashboard"],
      ["snapshot", "Snapshot"],
      ["reports", "Reports"],
    ],
  },
  {
    moduleKey: "people",
    label: "People Management",
    accessField: "people_access",
    areas: [
      ["register", "People Register"],
      ["create", "Create Person"],
      ["import", "Import People"],
    ],
  },
  {
    moduleKey: "admin",
    label: "Admin / Settings",
    accessField: "admin_access",
    areas: [
      ["users", "Users & Access"],
      ["reference", "Reference Data"],
      ["audit", "Audit Log"],
    ],
  },
] as const;

const modulePermissionDefinitions = IMS_PERMISSION_REGISTRY.map((module) => ({ ...module, accessField: module.legacyAccessField || "" , areas: module.areas.map((area) => [area.key, area.label] as const) }));
type ModulePermissionDefinition = { moduleKey: string; label: string; accessField: string; areas: ReadonlyArray<readonly [string, string]> };

const initialCompany: CompanySettings = {
  company_name: "Enshore Subsea",
  trading_name: "Enshore",
  address: "",
  primary_contact_name: "",
  primary_contact_email: "",
  primary_brand_colour: "#005670",
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

function getLoginStatus(person: PersonRow, authUser: AuthUserRow | null) {
  if (person.active === false || person.access_status === "Deactivated") return { label: "Deactivated", tone: "danger" as const };
  if (!person.email) return { label: "No email", tone: "warn" as const };
  if (!authUser) return { label: "No login yet", tone: "warn" as const };
  if (authUser.last_sign_in_at) return { label: "Active login", tone: "good" as const };
  if (person.access_status === "Invited" || authUser.confirmed_at) return { label: "Invite pending", tone: "warn" as const };
  return { label: "Setup pending", tone: "warn" as const };
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
    <label style={{ display: "grid", gap: "6px", fontSize: "13px", fontWeight: 700, color: imsColours.slate, letterSpacing: 0, ...style }}>
      {label}
      {children}
    </label>
  );
}

function StatusPill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "warn" | "danger" }) {
  const colour =
    tone === "good" ? "#ECECE7" : tone === "warn" ? "#ECECE7" : tone === "danger" ? "#ECECE7" : "#D0D0CE";
  const text =
    tone === "good" ? "#005670" : tone === "warn" ? "#000000" : tone === "danger" ? "#F93822" : "#53565A";

  return (
    <span style={{ display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "5px 9px", background: colour, color: text, fontSize: "12px", fontWeight: 900 }}>
      {children}
    </span>
  );
}

export default function AdminDashboardPage() {
  const imsPermissions = useImsPermissions();
  const [activeView, setActiveView] = useState<AdminView>("users");
  const [data, setData] = useState<AdminData | null>(null);
  const [message, setMessage] = useState("Loading Admin / Settings...");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    request_id: "",
    name: "",
    email: "",
    job_role: "",
    department: "",
    system_role: "Viewer",
    permission_override: "Custom",
    quality_access: "None",
    document_access: "None",
    hse_access: "None",
    asset_access: "None",
    risk_access: "None",
    action_access: "None",
    people_access: "None",
    management_review_access: "None",
    admin_access: "None",
    permissions_notes: "",
  });
  const [companyForm, setCompanyForm] = useState<CompanySettings>(initialCompany);
  const [newDepartment, setNewDepartment] = useState({ name: "", code: "" });
  const [newProject, setNewProject] = useState({ code: "", name: "", type: "Project" });
  const [personDrafts, setPersonDrafts] = useState<Record<string, Partial<PersonRow>>>({});
  const [userSearch, setUserSearch] = useState("");
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [selectedOverridePersonId, setSelectedOverridePersonId] = useState("");
  const [roleDrafts, setRoleDrafts] = useState<Record<string, Partial<RoleRow>>>({});
  const [tabPermissionDrafts, setTabPermissionDrafts] = useState<Record<string, Record<string, TabPermissionRow>>>({});
  const [inviteTabPermissionDrafts, setInviteTabPermissionDrafts] = useState<Record<string, TabPermissionRow>>({});
  const canCreateAdmin = imsPermissions.loaded && (imsPermissions.isMasterAdmin || imsPermissions.fullAccess || imsPermissions.canCreate);
  const canEditAdmin = imsPermissions.loaded && (imsPermissions.isMasterAdmin || imsPermissions.fullAccess || imsPermissions.canEdit);

  function requireCreatePermission(action: string) {
    if (canCreateAdmin) return true;
    setMessage(`Read-only access: you do not have permission to ${action}.`);
    return false;
  }

  function requireEditPermission(action: string) {
    if (canEditAdmin) return true;
    setMessage(`Read-only access: you do not have permission to ${action}.`);
    return false;
  }

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
  const filteredPeople = useMemo(() => {
    const search = userSearch.trim().toLowerCase();
    if (!search) return people;
    return people.filter((person) => {
      return [person.name, person.email, person.role, person.department, person.system_role]
        .some((value) => (value || "").toLowerCase().includes(search));
    });
  }, [people, userSearch]);
  const selectedAccessPerson = useMemo(() => {
    if (!selectedOverridePersonId) return null;
    return people.find((person) => person.id === selectedOverridePersonId) || null;
  }, [people, selectedOverridePersonId]);
  const pendingAccessRequests = useMemo(() => (data?.accessRequests || []).filter((request) => request.status === "Pending"), [data?.accessRequests]);

  function prepareAccessRequest(request: AccessRequestRow) {
    const requested = new Set(request.requested_modules || []); const drafts: Record<string, TabPermissionRow> = {};
    modulePermissionDefinitions.forEach((module) => module.areas.forEach(([areaKey]) => { const allowed = requested.has(module.moduleKey); drafts[tabPermissionKey(module.moduleKey, areaKey)] = { email: request.email, module_key: module.moduleKey, area_key: areaKey, can_view: allowed, can_create: false, can_edit: false, full_access: false }; }));
    setInviteTabPermissionDrafts(drafts); setInviteForm((current) => ({ ...current, request_id: request.id, name: `${request.first_name} ${request.last_name}`, email: request.email, department: request.department, permissions_notes: `Access requested: ${request.reason}` })); setShowInvitePanel(true); setMessage(`Prepared ${request.first_name} ${request.last_name}'s request with view-only access to the requested modules. Review before sending.`); window.setTimeout(() => document.getElementById("admin-invite-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  async function rejectAccessRequest(request: AccessRequestRow) { const notes = window.prompt("Reason for rejecting this request (optional)") || ""; await postAdminAction("reviewAccessRequest", { id: request.id, status: "Rejected", notes }, `${request.email} access request rejected.`); }

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

  function tabPermissionKey(moduleKey: string, areaKey: string) {
    return `${moduleKey}:${areaKey}`;
  }

  function getInviteTabPermissionDraft(moduleKey: string, areaKey: string): TabPermissionRow {
    const key = tabPermissionKey(moduleKey, areaKey);
    return inviteTabPermissionDrafts[key] || {
      email: inviteForm.email || "",
      module_key: moduleKey,
      area_key: areaKey,
      can_view: false,
      can_create: false,
      can_edit: false,
      full_access: false,
    };
  }

  function setInviteTabPermissionDraft(moduleKey: string, areaKey: string, updates: Partial<TabPermissionRow>) {
    const key = tabPermissionKey(moduleKey, areaKey);
    const current = getInviteTabPermissionDraft(moduleKey, areaKey);
    setInviteTabPermissionDrafts((existing) => ({
      ...existing,
      [key]: {
        ...current,
        ...updates,
        email: inviteForm.email || "",
        module_key: moduleKey,
        area_key: areaKey,
      },
    }));
  }

  function setInviteModuleAccessMode(definition: ModulePermissionDefinition, mode: "Full" | "Part Access" | "None") {
    setInviteForm({ ...inviteForm, permission_override: "Custom", ...(definition.accessField ? { [definition.accessField]: mode } : {}), system_role: mode === "Full" && definition.accessField === "admin_access" ? "Admin" : inviteForm.system_role });
    definition.areas.forEach(([areaKey]) => {
      const full = mode === "Full";
      const none = mode === "None";
      const current = getInviteTabPermissionDraft(definition.moduleKey, areaKey);
      setInviteTabPermissionDraft(definition.moduleKey, areaKey, {
        full_access: full,
        can_view: full || (!none && current.can_view),
        can_create: full || (!none && current.can_create),
        can_edit: full || (!none && current.can_edit),
      });
      if (none) {
        setInviteTabPermissionDraft(definition.moduleKey, areaKey, {
          full_access: false,
          can_view: false,
          can_create: false,
          can_edit: false,
        });
      }
    });
  }

  function getInviteTabPermissionsPayload() {
    return modulePermissionDefinitions.flatMap((definition) => {
      return definition.areas.map(([areaKey]) => ({
        ...getInviteTabPermissionDraft(definition.moduleKey, areaKey),
        email: inviteForm.email || "",
        module_key: definition.moduleKey,
        area_key: areaKey,
      }));
    });
  }

  function permissionRowsMode(rows: TabPermissionRow[]) {
    if (!rows.length) return "";
    if (rows.every((permission) => permission.full_access)) return "Full";
    if (rows.some((permission) => permission.full_access || permission.can_view || permission.can_create || permission.can_edit)) return "Part Access";
    return "None";
  }

  function getInviteModuleMode(definition: ModulePermissionDefinition) {
    const rows = definition.areas.filter(([areaKey]) => Boolean(inviteTabPermissionDrafts[tabPermissionKey(definition.moduleKey, areaKey)])).map(([areaKey]) => getInviteTabPermissionDraft(definition.moduleKey, areaKey));
    return permissionRowsMode(rows) || String((definition.accessField ? (inviteForm as Record<string, string>)[definition.accessField] : "") || "None");
  }

  function getPersonModuleMode(person: PersonRow, definition: ModulePermissionDefinition, draft: PersonRow) {
    const draftKeys = tabPermissionDrafts[person.id] || {};
    const savedRows = (data?.tabPermissions || []).filter((permission) => permission.person_id === person.id && permission.module_key === definition.moduleKey);
    const hasDrafts = definition.areas.some(([areaKey]) => Boolean(draftKeys[tabPermissionKey(definition.moduleKey, areaKey)]));
    const rows = hasDrafts ? definition.areas.map(([areaKey]) => getTabPermissionDraft(person, definition.moduleKey, areaKey)) : savedRows;
    return permissionRowsMode(rows) || String((definition.accessField ? (draft as Record<string, unknown>)[definition.accessField] : "") || "Role Default");
  }

  function getTabPermissionDraft(person: PersonRow, moduleKey: string, areaKey: string): TabPermissionRow {
    const key = tabPermissionKey(moduleKey, areaKey);
    const existingDraft = tabPermissionDrafts[person.id]?.[key];
    if (existingDraft) return existingDraft;
    const existing = (data?.tabPermissions || []).find((permission) => {
      return permission.person_id === person.id && permission.module_key === moduleKey && permission.area_key === areaKey;
    });
    return existing || {
      person_id: person.id,
      email: person.email || "",
      module_key: moduleKey,
      area_key: areaKey,
      can_view: false,
      can_create: false,
      can_edit: false,
      full_access: false,
    };
  }

  function setTabPermissionDraft(person: PersonRow, moduleKey: string, areaKey: string, updates: Partial<TabPermissionRow>) {
    const key = tabPermissionKey(moduleKey, areaKey);
    const current = getTabPermissionDraft(person, moduleKey, areaKey);
    setTabPermissionDrafts((existing) => ({
      ...existing,
      [person.id]: {
        ...(existing[person.id] || {}),
        [key]: {
          ...current,
          ...updates,
          person_id: person.id,
          email: person.email || "",
          module_key: moduleKey,
          area_key: areaKey,
        },
      },
    }));
  }

  function setModuleAccessMode(person: PersonRow, accessField: string, moduleKey: string, mode: "Full" | "Part Access" | "None") {
    setPersonDraft(person, { permission_override: "Custom", ...(accessField ? { [accessField]: mode } : {}) } as Partial<PersonRow>);
    const definition = modulePermissionDefinitions.find((item) => item.moduleKey === moduleKey);
    if (!definition) return;
    definition.areas.forEach(([areaKey]) => {
      const full = mode === "Full";
      const none = mode === "None";
      setTabPermissionDraft(person, moduleKey, areaKey, {
        full_access: full,
        can_view: full || (!none && getTabPermissionDraft(person, moduleKey, areaKey).can_view),
        can_create: full || (!none && getTabPermissionDraft(person, moduleKey, areaKey).can_create),
        can_edit: full || (!none && getTabPermissionDraft(person, moduleKey, areaKey).can_edit),
      });
      if (none) {
        setTabPermissionDraft(person, moduleKey, areaKey, {
          full_access: false,
          can_view: false,
          can_create: false,
          can_edit: false,
        });
      }
    });
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
      setMessage(json.message || successMessage);
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
    if (!requireCreatePermission("invite Admin users")) return;
    const ok = await postAdminAction(
      "inviteUser",
      { ...inviteForm, tab_permissions: getInviteTabPermissionsPayload() },
      `${inviteForm.name || "User"} invited successfully.`,
    );
    if (ok) {
      setInviteForm({
        request_id: "",
        name: "",
        email: "",
        job_role: "",
        department: "",
        system_role: "Viewer",
        permission_override: "Custom",
        quality_access: "None",
        document_access: "None",
        hse_access: "None",
        asset_access: "None",
        risk_access: "None",
        action_access: "None",
        people_access: "None",
        management_review_access: "None",
        admin_access: "None",
        permissions_notes: "",
      });
      setInviteTabPermissionDrafts({});
    }
  }

  async function updatePersonAccess(person: PersonRow, updates: Partial<PersonRow>) {
    if (!requireEditPermission("edit Admin user access")) return false;
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
    return ok;
  }

  async function sendExistingInvite(person: PersonRow, authUser: AuthUserRow | null) {
    if (!requireEditPermission("send setup links")) return;
    const label = authUser ? "Password setup link" : "Invite link";
    await postAdminAction("sendExistingInvite", { id: person.id }, `${label} sent to ${person.email || person.name}.`);
  }

  async function copySetupLink(person: PersonRow) {
    if (!requireEditPermission("copy setup links")) return;
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generateSetupLink", payload: { id: person.id } }),
      });
      const json = await response.json();
      if (!response.ok || !json.setupLink) {
        setMessage(`Setup link failed: ${json.error || "Unknown error"}`);
        return;
      }

      await navigator.clipboard.writeText(json.setupLink);
      setMessage(json.message ? `${json.message} Link copied to clipboard.` : `Setup link copied for ${person.email || person.name}.`);
      await loadAdminData();
    } catch (error) {
      setMessage(`Setup link failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function sendPasswordReset(person: PersonRow) {
    if (!requireEditPermission("send password reset emails")) return;
    await postAdminAction("resetPassword", { email: person.email }, `Password reset email sent to ${person.email}.`);
  }

  async function updateRolePermissions(role: RoleRow) {
    if (!requireEditPermission("edit Admin roles")) return;
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

  async function saveTabPermissions(person: PersonRow) {
    if (!requireEditPermission("edit Admin tab permissions")) return false;
    const permissions = modulePermissionDefinitions.flatMap((definition) => {
      return definition.areas.map(([areaKey]) => getTabPermissionDraft(person, definition.moduleKey, areaKey));
    });
    const ok = await postAdminAction(
      "updateTabPermissions",
      { person_id: person.id, email: person.email, permissions },
      `${person.name} tab permissions saved successfully.`,
    );
    if (ok) {
      setTabPermissionDrafts((current) => {
        const next = { ...current };
        delete next[person.id];
        return next;
      });
    }
  }

  function renderPersonPermissionEditor(person: PersonRow) {
    const draft = getPersonDraft(person);
    const isMaster = person.is_master_admin || normaliseEmail(person.email) === "jbeaton@enshoresubsea.com" || person.name === "Jordan Beaton";

    return (
      <div style={personDetailPanelStyle}>
        <div style={personDetailHeaderStyle}>
          <div>
            <p style={eyebrowStyle}>Selected user</p>
            <h3 style={personDetailTitleStyle}>{person.name}</h3>
            <p style={personDetailMetaStyle}>{person.email || "No email set"}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {isMaster ? <StatusPill tone="good">Master Admin</StatusPill> : <StatusPill tone={draft.access_status === "Deactivated" ? "danger" : "good"}>{draft.access_status || "Active"}</StatusPill>}
            <ImsButton variant="secondary" onClick={() => setSelectedOverridePersonId("")}>Hide Panel</ImsButton>
          </div>
        </div>

        <div style={compactFieldGridStyle}>
          <Field label="Access">
            <SelectField
              value={isMaster ? "Active" : draft.access_status || "Active"}
              onChange={(value) => setPersonDraft(person, { access_status: value })}
              disabled={isSaving || isMaster || !canEditAdmin}
            >
              {accessStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
            </SelectField>
          </Field>
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
                        people_access: "Full",
                        management_review_access: "Full",
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
                        people_access: "Read",
                        management_review_access: "Read",
                        admin_access: "None",
                      }
                    : {}),
                });
              }}
              disabled={isSaving || isMaster || !canEditAdmin}
            >
              {permissionOverrideOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </SelectField>
          </Field>
        </div>

        <div style={modulePermissionStackStyle}>
          {modulePermissionDefinitions.map((definition) => {
            const moduleAccessValue = isMaster ? "Full" : getPersonModuleMode(person, definition, draft);
            const partAccess = moduleAccessValue === "Part Access";
            return (
              <section key={definition.moduleKey} style={compactModuleCardStyle}>
                <div style={modulePermissionHeaderStyle}>
                  <div>
                    <h4 style={modulePermissionTitleStyle}>{definition.label}</h4>
                    <p style={modulePermissionSubtitleStyle}>
                      {moduleAccessValue === "Full"
                        ? "Full module access"
                        : partAccess
                          ? "Part access - selected tabs only"
                          : moduleAccessValue === "None"
                            ? "No module access"
                            : "Using role default unless changed"}
                    </p>
                  </div>
                  <div style={segmentedButtonRowStyle}>
                    {(["Full", "Part Access", "None"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setModuleAccessMode(person, definition.accessField, definition.moduleKey, mode)}
                        disabled={isSaving || isMaster || !canEditAdmin}
                        style={{
                          ...permissionModeButtonStyle,
                          ...(moduleAccessValue === mode ? permissionModeButtonActiveStyle : {}),
                        }}
                      >
                        {mode === "Full" ? "Full" : mode}
                      </button>
                    ))}
                  </div>
                </div>

                {partAccess ? (
                  <div style={tabPermissionTableStyle}>
                    <div style={{ ...tabPermissionRowStyle, ...tabPermissionHeadRowStyle }}>
                      <span>Internal tab</span>
                      <span>View</span>
                      <span>Create</span>
                      <span>Edit</span>
                    </div>
                    {definition.areas.map(([areaKey, label]) => {
                      const permission = getTabPermissionDraft(person, definition.moduleKey, areaKey);
                      return (
                        <div key={areaKey} style={tabPermissionRowStyle}>
                          <strong>{label}</strong>
                          {(["can_view", "can_create", "can_edit"] as const).map((field) => (
                            <label key={field} style={checkboxCellStyle}>
                              <input
                                type="checkbox"
                                checked={Boolean(permission.full_access || permission[field])}
                                onChange={(event) => setTabPermissionDraft(person, definition.moduleKey, areaKey, { [field]: event.target.checked })}
                                disabled={isSaving || isMaster || !canEditAdmin}
                              />
                            </label>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>

        <Field label="Permission Notes">
          <textarea
            value={draft.permissions_notes || ""}
            onChange={(event) => setPersonDraft(person, { permissions_notes: event.target.value })}
            style={{ ...imsInputStyle, minHeight: 74 }}
            placeholder="Reason for custom access."
            disabled={!canEditAdmin}
          />
        </Field>

        <div style={detailActionRowStyle}>
          <ImsButton
            onClick={async () => {
              const ok = await updatePersonAccess(person, draft);
              if (ok) await saveTabPermissions({ ...person, ...draft });
            }}
            disabled={isSaving || !canEditAdmin || (!personDrafts[person.id] && !tabPermissionDrafts[person.id])}
          >
            Save Permissions
          </ImsButton>
          {person.email ? (
            <ImsButton variant="secondary" onClick={() => sendPasswordReset(person)} disabled={isSaving || !canEditAdmin}>
              Send Reset Email
            </ImsButton>
          ) : null}
        </div>
      </div>
    );
  }

  async function saveCompany() {
    if (!requireEditPermission("edit company settings")) return;
    await postAdminAction("updateCompany", companyForm as Record<string, unknown>, "Company settings saved successfully.");
  }

  async function addDepartment() {
    if (!requireCreatePermission("add Admin reference departments")) return;
    const ok = await postAdminAction("addDepartment", newDepartment, `${newDepartment.name} added successfully.`);
    if (ok) setNewDepartment({ name: "", code: "" });
  }

  async function addProject() {
    if (!requireCreatePermission("add Admin reference projects")) return;
    const ok = await postAdminAction("addProject", newProject, `${newProject.name} added successfully.`);
    if (ok) setNewProject({ code: "", name: "", type: "Project" });
  }

  return (
    <main>
      <ImsPermissionNotice />
      <QualityPageHero
        label="ADMIN / SETTINGS"
        title="Admin Console"
        description="Controlled user access, module permissions, reference data, and audit visibility for the IMS."
        contextCards={[
          { label: "Last Refreshed", value: isLoading ? "Loading" : new Date().toLocaleString("en-GB") },
          { label: "Master Admin", value: "Jordan Beaton" },
        ]}
      />

      <ImsTopMetaRow
        backHref="/home"
        backLabel="Back to IMS Home"
        status={<><strong>Status:</strong> {message}</>}
      />

      <ImsTabs tabs={adminTabs} active={activeView} onChange={setActiveView} ariaLabel="Admin settings views" />

      {activeView === "dashboard" ? (
        <>
          <section className="quality-kpi-grid" style={kpiGridStyle}>
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
                This console lets Admins manage users, roles, company settings, and reference data. Active roles and individual access overrides now control module visibility across the IMS shell.
              </p>
            </ImsPanel>
          </section>
        </>
      ) : null}

      {activeView === "users" ? (
        <section style={{ display: "grid", gap: "18px" }}>
          {pendingAccessRequests.length ? <ImsPanel title={`Pending Access Requests (${pendingAccessRequests.length})`} subtitle="Review requested modules before creating an account or issuing a setup link."><div style={requestQueue}>{pendingAccessRequests.map((request) => <article key={request.id} style={requestCard}><div><strong>{request.first_name} {request.last_name}</strong><small style={requestMeta}>{request.email} · {request.department} · {formatDateTime(request.submitted_at)}</small><p style={paragraphStyle}>{request.reason}</p><small style={requestMeta}>Requested: {(request.requested_modules || []).map((key) => IMS_PERMISSION_REGISTRY.find((module) => module.moduleKey === key)?.label || key).join(", ")}</small></div><div style={requestActions}><ImsButton onClick={() => prepareAccessRequest(request)} disabled={!canCreateAdmin}>Review & Prepare</ImsButton><ImsButton variant="danger" onClick={() => void rejectAccessRequest(request)} disabled={!canEditAdmin}>Reject</ImsButton></div></article>)}</div></ImsPanel> : null}
          <ImsPanel title="Invite User" subtitle="Create a login-ready person record, assign permissions, and send the setup invite." style={{ scrollMarginTop: 90 }}>
            <div id="admin-invite-panel" />
            <div style={inviteHeaderRowStyle}>
              <p style={paragraphStyle}>Use this only for new system users. Existing People records can be invited from the user list below.</p>
              <ImsButton variant={showInvitePanel ? "secondary" : "primary"} onClick={() => setShowInvitePanel(!showInvitePanel)} disabled={!canCreateAdmin}>
                {showInvitePanel ? "Hide Invite" : "Invite New User"}
              </ImsButton>
            </div>
            {showInvitePanel ? (
              <div style={inviteCompactGridStyle}>
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
                <div style={invitePermissionMatrixStyle}>
                  <div style={invitePermissionMatrixHeaderStyle}>
                    <div>
                      <h3 style={invitePermissionTitleStyle}>Permissions</h3>
                      <p style={invitePermissionSubtitleStyle}>Set exact module and internal tab access before sending the invite.</p>
                    </div>
                  </div>
                  <div style={invitePermissionRowsStyle}>
                    {modulePermissionDefinitions.map((module) => {
                      const currentValue = getInviteModuleMode(module);
                      const partAccess = currentValue === "Part Access";
                      return (
                        <div key={module.moduleKey} style={invitePermissionRowStyle}>
                          <div style={invitePermissionRowHeaderStyle}>
                            <div>
                              <h4 style={invitePermissionModuleTitleStyle}>{module.label}</h4>
                              <p style={invitePermissionSubtitleStyle}>
                                {partAccess ? "Part access - selected tabs only" : currentValue === "Full" ? "Full module access" : "No access"}
                              </p>
                            </div>
                            <div style={invitePermissionOptionGroupStyle}>
                            {(["Full", "Part Access", "None"] as const).map((option) => {
                              const active = currentValue === option;
                              return (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() => setInviteModuleAccessMode(module, option)}
                                  disabled={!canCreateAdmin}
                                  style={{
                                    ...invitePermissionOptionStyle,
                                    ...(active ? invitePermissionOptionActiveStyle : {}),
                                  }}
                                >
                                  {option}
                                </button>
                              );
                            })}
                            </div>
                          </div>
                          {partAccess ? (
                            <div style={tabPermissionTableStyle}>
                              <div style={{ ...tabPermissionRowStyle, ...tabPermissionHeadRowStyle }}>
                                <span>Internal tab</span>
                                <span>View</span>
                                <span>Create</span>
                                <span>Edit</span>
                              </div>
                              {module.areas.map(([areaKey, areaLabel]) => {
                                const permission = getInviteTabPermissionDraft(module.moduleKey, areaKey);
                                return (
                                  <div key={areaKey} style={tabPermissionRowStyle}>
                                    <span>{areaLabel}</span>
                                    {(["can_view", "can_create", "can_edit"] as const).map((field) => (
                                      <label key={field} style={checkboxCellStyle}>
                                        <input
                                          type="checkbox"
                                          checked={Boolean(permission.full_access || permission[field])}
                                          onChange={(event) => setInviteTabPermissionDraft(module.moduleKey, areaKey, {
                                            [field]: event.target.checked,
                                            full_access: false,
                                          })}
                                          disabled={!canCreateAdmin}
                                        />
                                      </label>
                                    ))}
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <Field label="Notes" style={{ gridColumn: "1 / -1" }}>
                  <textarea
                    value={inviteForm.permissions_notes}
                    onChange={(event) => setInviteForm({ ...inviteForm, permissions_notes: event.target.value })}
                    style={{ ...imsInputStyle, minHeight: 64 }}
                    placeholder="Optional access note."
                  />
                </Field>
                <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
                  <ImsButton onClick={inviteUser} disabled={isSaving || !canCreateAdmin}>Send Invite Link</ImsButton>
                </div>
              </div>
            ) : null}
          </ImsPanel>

          <ImsPanel title="Users & Access" subtitle="Search a user, open their panel, and manage access without changing the People Management record.">
            <div style={userSearchRowStyle}>
              <input
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                style={imsInputStyle}
                placeholder="Search user name, email, role or department..."
              />
            </div>
            <div style={imsTableInfoRowStyle}>Showing {filteredPeople.length} of {people.length} user records</div>
            <div style={tableWrapStyle}>
              <table style={imsTableStyle}>
                <thead>
                  <tr>
                    <th style={imsTableHeadStyle}>Name</th>
                    <th style={imsTableHeadStyle}>Email</th>
                    <th style={imsTableHeadStyle}>Access</th>
                    <th style={imsTableHeadStyle}>Last Login</th>
                    <th style={imsTableHeadStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPeople.map((person) => {
                    const draft = getPersonDraft(person);
                    const authUser = getAuthUserForPerson(person, data?.authUsers || []);
                    const isMaster = person.is_master_admin || normaliseEmail(person.email) === "jbeaton@enshoresubsea.com" || person.name === "Jordan Beaton";
                    const accessStatus = draft.access_status || (person.active === false ? "Deactivated" : "Active");
                    const loginStatus = getLoginStatus(person, authUser);
                    const canSendInvite = Boolean(person.email) && !isMaster && accessStatus !== "Deactivated" && !authUser?.last_sign_in_at;
                    const isSelected = selectedAccessPerson?.id === person.id;
                    return (
                      <Fragment key={person.id}>
                        <tr
                          onClick={() => setSelectedOverridePersonId(isSelected ? "" : person.id)}
                          style={{
                            cursor: "pointer",
                            background: isSelected ? "rgba(0, 86, 112, 0.08)" : "#ffffff",
                            borderLeft: isSelected ? `4px solid ${imsColours.brand}` : "4px solid transparent",
                          }}
                        >
                          <td style={imsTableCellStyle}>
                            <strong>{person.name}</strong>
                            <div style={{ marginTop: 6 }}><StatusPill tone={loginStatus.tone}>{loginStatus.label}</StatusPill></div>
                            {isMaster ? <div style={{ marginTop: 6 }}><StatusPill tone="good">Master Admin</StatusPill></div> : null}
                            {person.permission_override && person.permission_override !== "Role Default" ? (
                              <div style={{ marginTop: 6 }}><StatusPill tone="warn">{person.permission_override}</StatusPill></div>
                            ) : null}
                          </td>
                          <td style={imsTableCellStyle}>{person.email || ""}</td>
                          <td style={imsTableCellStyle}>
                            <StatusPill tone={accessStatus === "Deactivated" ? "danger" : "good"}>{accessStatus}</StatusPill>
                          </td>
                          <td style={imsTableCellStyle}>{formatDateTime(authUser?.last_sign_in_at || person.last_login_at)}</td>
                          <td style={imsTableCellStyle}>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <ImsButton
                                variant="secondary"
                                onClick={() => {
                                  setSelectedOverridePersonId(isSelected ? "" : person.id);
                                }}
                                disabled={isSaving}
                              >
                                {isSelected ? "Hide Panel" : "Open Panel"}
                              </ImsButton>
                              {canSendInvite ? (
                                <ImsButton
                                  variant="secondary"
                                  onClick={() => {
                                    void sendExistingInvite(person, authUser);
                                  }}
                                  disabled={isSaving || !canEditAdmin}
                                >
                                  {authUser ? "Resend Setup" : "Send Invite"}
                                </ImsButton>
                              ) : null}
                              {Boolean(person.email) && !isMaster && accessStatus !== "Deactivated" ? (
                                <ImsButton
                                  variant="secondary"
                                  onClick={() => {
                                    void copySetupLink(person);
                                  }}
                                  disabled={isSaving || !canEditAdmin}
                                >
                                  Copy Setup Link
                                </ImsButton>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                        {isSelected ? (
                          <tr key={`${person.id}-permissions`}>
                            <td style={{ ...imsTableCellStyle, background: "#ECECE7", padding: 16 }} colSpan={5}>
                              <div id="selected-user-permissions">
                                {renderPersonPermissionEditor(person)}
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                  {!filteredPeople.length ? (
                    <tr><td style={imsTableCellStyle} colSpan={5}>No users match the current search.</td></tr>
                  ) : null}
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
                      <ImsButton onClick={() => updateRolePermissions(role)} disabled={isSaving || !canEditAdmin || !hasDraft || isAdminRole}>
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
                        ["Management Review", "management_review_access", roleAccessOptions],
                        ["People", "people_access", roleAccessOptions],
                        ["Admin", "admin_access", roleAccessOptions],
                      ].map(([label, key, options]) => (
                        <Field key={String(key)} label={String(label)}>
                          <SelectField
                            value={String((draft as Record<string, unknown>)[key as string] || (key === "document_access" ? "Role Default" : "None"))}
                            onChange={(value) => setRoleDraft(role, { [key as string]: value } as Partial<RoleRow>)}
                            disabled={isSaving || !canEditAdmin || isAdminRole}
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
                          disabled={isSaving || !canEditAdmin}
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
                                  people_access: "Full",
                                  management_review_access: "Full",
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
                                  people_access: "Read",
                                  management_review_access: "Read",
                                  admin_access: "None",
                                }
                              : {}),
                          });
                        }}
                        disabled={isSaving || !canEditAdmin || isMaster}
                      >
                        {permissionOverrideOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                      </SelectField>
                    </Field>
                    <div style={{ gridColumn: "1 / -1", display: "grid", gap: 12 }}>
                      {modulePermissionDefinitions.map((definition) => {
                        const moduleAccessValue = isMaster ? "Full" : getPersonModuleMode(person, definition, draft);
                        const partAccess = moduleAccessValue === "Part Access";
                        return (
                          <section key={definition.moduleKey} style={modulePermissionCardStyle}>
                            <div style={modulePermissionHeaderStyle}>
                              <div>
                                <h4 style={modulePermissionTitleStyle}>{definition.label}</h4>
                                <p style={modulePermissionSubtitleStyle}>
                                  {moduleAccessValue === "Full"
                                    ? "Full module access"
                                    : partAccess
                                      ? "Part access - select allowed tabs below"
                                      : moduleAccessValue === "None"
                                        ? "No module access"
                                        : "Using role default unless changed"}
                                </p>
                              </div>
                              <div style={segmentedButtonRowStyle}>
                                {(["Full", "Part Access", "None"] as const).map((mode) => (
                                  <button
                                    key={mode}
                                    type="button"
                                    onClick={() => setModuleAccessMode(person, definition.accessField, definition.moduleKey, mode)}
                                    disabled={isSaving || !canEditAdmin || isMaster}
                                    style={{
                                      ...permissionModeButtonStyle,
                                      ...(moduleAccessValue === mode ? permissionModeButtonActiveStyle : {}),
                                    }}
                                  >
                                    {mode === "Full" ? "Full Access" : mode}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {partAccess ? (
                              <div style={tabPermissionTableStyle}>
                                <div style={{ ...tabPermissionRowStyle, ...tabPermissionHeadRowStyle }}>
                                  <span>Internal tab</span>
                                  <span>View</span>
                                  <span>Create</span>
                                  <span>Edit</span>
                                </div>
                                {definition.areas.map(([areaKey, label]) => {
                                  const permission = getTabPermissionDraft(person, definition.moduleKey, areaKey);
                                  return (
                                    <div key={areaKey} style={tabPermissionRowStyle}>
                                      <strong>{label}</strong>
                                      {(["can_view", "can_create", "can_edit"] as const).map((field) => (
                                        <label key={field} style={checkboxCellStyle}>
                                          <input
                                            type="checkbox"
                                            checked={Boolean(permission.full_access || permission[field])}
                                            onChange={(event) => setTabPermissionDraft(person, definition.moduleKey, areaKey, { [field]: event.target.checked })}
                                            disabled={isSaving || !canEditAdmin || isMaster}
                                          />
                                        </label>
                                      ))}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : null}
                          </section>
                        );
                      })}
                    </div>
                    <Field label="Permission Notes" style={{ gridColumn: "1 / -1" }}>
                      <textarea
                        value={draft.permissions_notes || ""}
                        onChange={(event) => setPersonDraft(person, { permissions_notes: event.target.value })}
                        style={{ ...imsInputStyle, minHeight: 76 }}
                        placeholder="Reason for any custom access, e.g. Full access due IMS ownership."
                        disabled={!canEditAdmin}
                      />
                    </Field>
                    <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
                      <ImsButton
                        onClick={async () => {
                          const ok = await updatePersonAccess(person, draft);
                          if (ok) await saveTabPermissions({ ...person, ...draft });
                        }}
                        disabled={isSaving || !canEditAdmin || (!personDrafts[person.id] && !tabPermissionDrafts[person.id])}
                      >
                        Save Permissions
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
              <input value={companyForm.primary_brand_colour || "#005670"} onChange={(event) => setCompanyForm({ ...companyForm, primary_brand_colour: event.target.value })} style={imsInputStyle} />
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
              <ImsButton onClick={saveCompany} disabled={isSaving || !canEditAdmin}>Save Company Profile</ImsButton>
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
              <ImsButton onClick={addDepartment} disabled={isSaving || !canCreateAdmin}>Add</ImsButton>
            </div>
            <ReferenceList items={departments.map((department) => ({ id: department.id, label: department.name, meta: department.code || "", active: department.active }))} />
          </ImsPanel>

          <ImsPanel title="Projects / Vessels / Sites" subtitle="Foundation list for project and site dropdowns.">
            <div style={{ ...formGridStyle, gridTemplateColumns: "150px 1fr 160px auto", marginBottom: 16 }}>
              <input value={newProject.code} onChange={(event) => setNewProject({ ...newProject, code: event.target.value.toUpperCase() })} style={imsInputStyle} placeholder="Project code" />
              <input value={newProject.name} onChange={(event) => setNewProject({ ...newProject, name: event.target.value })} style={imsInputStyle} placeholder="Project / vessel / site name" />
              <SelectField value={newProject.type} onChange={(value) => setNewProject({ ...newProject, type: value })}>
                <option value="Project">Project</option>
                <option value="Vessel">Vessel</option>
                <option value="Site">Site</option>
                <option value="Client">Client</option>
              </SelectField>
              <ImsButton onClick={addProject} disabled={isSaving || !canCreateAdmin}>Add</ImsButton>
            </div>
            <ReferenceList items={projects.map((project) => ({ id: project.id, label: project.name, meta: [project.code, project.type || "Project"].filter(Boolean).join(" · "), active: project.active }))} />
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

const inviteHeaderRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  flexWrap: "wrap",
};

const inviteCompactGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 12,
  marginTop: 16,
  borderTop: `1px solid ${imsColours.border}`,
  paddingTop: 16,
};

const invitePermissionMatrixStyle: CSSProperties = {
  gridColumn: "1 / -1",
  border: `1px solid ${imsColours.border}`,
  borderRadius: 16,
  background: "#ffffff",
  overflow: "hidden",
};

const invitePermissionMatrixHeaderStyle: CSSProperties = {
  background: "#ECECE7",
  borderBottom: `1px solid ${imsColours.border}`,
  padding: "14px 16px",
};

const invitePermissionTitleStyle: CSSProperties = {
  margin: 0,
  color: imsColours.ink,
  fontSize: 18,
  fontWeight: 800,
};

const invitePermissionSubtitleStyle: CSSProperties = {
  margin: "4px 0 0",
  color: imsColours.slate,
  fontSize: 14,
  lineHeight: 1.5,
};

const invitePermissionRowsStyle: CSSProperties = {
  display: "grid",
};

const invitePermissionRowStyle: CSSProperties = {
  display: "grid",
  gap: 16,
  padding: "12px 16px",
  borderTop: `1px solid ${imsColours.border}`,
  color: imsColours.ink,
};

const invitePermissionRowHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap",
};

const invitePermissionModuleTitleStyle: CSSProperties = {
  margin: 0,
  color: imsColours.ink,
  fontSize: 16,
  fontWeight: 800,
};

const invitePermissionOptionGroupStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(96px, 1fr))",
  gap: 8,
  minWidth: 320,
};

const invitePermissionOptionStyle: CSSProperties = {
  border: `1px solid ${imsColours.border}`,
  borderRadius: 10,
  background: "#ECECE7",
  color: imsColours.ink,
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 800,
  padding: "9px 10px",
};

const invitePermissionOptionActiveStyle: CSSProperties = {
  background: imsColours.brand,
  borderColor: imsColours.brand,
  color: "#ffffff",
};
const requestQueue: CSSProperties = { display: "grid", gap: 10 };
const requestCard: CSSProperties = { display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "start", gap: 16, padding: 14, border: "1px solid #D0D0CE", borderRadius: 12, background: "#ECECE7" };
const requestMeta: CSSProperties = { display: "block", marginTop: 4, color: "#53565A", fontSize: 12, lineHeight: 1.4 };
const requestActions: CSSProperties = { display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 8 };

const userSearchRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(240px, 1fr)",
  marginBottom: 12,
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

const modulePermissionCardStyle: CSSProperties = {
  border: `1px solid ${imsColours.border}`,
  borderRadius: 14,
  background: "#ffffff",
  padding: 14,
  display: "grid",
  gap: 12,
};

const compactModuleCardStyle: CSSProperties = {
  ...modulePermissionCardStyle,
  padding: 12,
};

const modulePermissionStackStyle: CSSProperties = {
  display: "grid",
  gap: 10,
};

const modulePermissionHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap",
};

const modulePermissionTitleStyle: CSSProperties = {
  margin: 0,
  color: imsColours.ink,
  fontSize: 16,
};

const modulePermissionSubtitleStyle: CSSProperties = {
  margin: "5px 0 0",
  color: imsColours.slate,
  fontSize: 13,
};

const segmentedButtonRowStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const permissionModeButtonStyle: CSSProperties = {
  border: `1px solid ${imsColours.border}`,
  borderRadius: 10,
  background: "#D0D0CE",
  color: imsColours.ink,
  fontWeight: 900,
  padding: "10px 12px",
  cursor: "pointer",
};

const permissionModeButtonActiveStyle: CSSProperties = {
  background: imsColours.brand,
  borderColor: imsColours.brand,
  color: "#ffffff",
};

const tabPermissionTableStyle: CSSProperties = {
  border: `1px solid ${imsColours.border}`,
  borderRadius: 12,
  overflow: "hidden",
};

const tabPermissionRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(180px, 1fr) repeat(3, 92px)",
  alignItems: "center",
  gap: 0,
  minHeight: 46,
  borderTop: `1px solid ${imsColours.border}`,
  padding: "0 12px",
  color: imsColours.ink,
};

const tabPermissionHeadRowStyle: CSSProperties = {
  borderTop: "none",
  background: "#ECECE7",
  color: imsColours.slate,
  fontSize: 12,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const checkboxCellStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const personDetailPanelStyle: CSSProperties = {
  border: `1px solid ${imsColours.border}`,
  borderRadius: 18,
  background: "#ffffff",
  padding: 16,
  display: "grid",
  gap: 14,
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
};

const personDetailHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
};

const eyebrowStyle: CSSProperties = {
  margin: "0 0 5px",
  color: imsColours.slate,
  fontSize: 12,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const personDetailTitleStyle: CSSProperties = {
  margin: 0,
  color: imsColours.ink,
  fontSize: 22,
};

const personDetailMetaStyle: CSSProperties = {
  margin: "5px 0 0",
  color: imsColours.slate,
};

const compactFieldGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 10,
};

const detailActionRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  flexWrap: "wrap",
};

const paragraphStyle: CSSProperties = {
  color: imsColours.slate,
  margin: 0,
  lineHeight: 1.6,
};

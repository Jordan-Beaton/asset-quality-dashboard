"use client";

import { ImsBackNav } from "../../../src/components/ImsBackNav";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { ImsButton, ImsLinkButton } from "../../../src/components/ImsPrimitives";
import { QualityKpiCard } from "../../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../../src/components/QualityPageHero";
import { useImsPermissions } from "../../../src/components/ImsPermissions";
import {
  RecordHeader,
  RecordWorkbench,
  StatusPill,
  WorkbenchStep,
  percentDone,
  toneForStatus,
} from "../../../src/components/RecordWorkbench";
import type { WorkbenchStepDef } from "../../../src/components/RecordWorkbench";
import { downloadRegisterExcel, excelDateStamp } from "../../../src/lib/registerExcel";
import { supabase } from "../../../src/lib/supabase";
import { useUrlFlag, useUrlState } from "../../../src/lib/useUrlState";

export const dynamic = "force-dynamic";

type HseActionView = "dashboard" | "register" | "create";

type ActionItem = {
  id: string;
  action_number: string | null;
  title: string | null;
  description: string | null;
  department: string | null;
  project: string | null;
  owner: string | null;
  priority: string | null;
  status: string | null;
  due_date: string | null;
  source: string | null;
  linked_audit_id?: string | null;
  linked_audit_number?: string | null;
  linked_finding_id?: string | null;
  linked_finding_reference?: string | null;
  linked_asset_id?: string | null;
  linked_asset_code?: string | null;
  linked_inspection_id?: string | null;
  linked_inspection_number?: string | null;
  linked_maintenance_id?: string | null;
  linked_maintenance_number?: string | null;
  linked_calibration_id?: string | null;
  linked_ncr_id?: string | null;
  linked_ncr_number?: string | null;
  linked_capa_id?: string | null;
  linked_capa_number?: string | null;
  linked_moc_id?: string | null;
  linked_moc_number?: string | null;
  linked_ainm_id?: string | null;
  linked_ainm_number?: string | null;
  linked_hse_inspection_id?: string | null;
  linked_hse_inspection_number?: string | null;
  linked_observation_id?: string | null;
  linked_observation_number?: string | null;
  close_out_comments?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type EvidenceRow = { id: string; record_id: string; file_name: string | null };

type PersonOption = {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  department: string | null;
};

type HseActionImportRow = {
  rowNumber: number;
  title: string;
  description: string;
  department: string;
  project: string;
  owner: string;
  priority: string;
  status: string;
  due_date: string;
  source: string;
  linkedReference: string;
  errors: string[];
  skipReasons: string[];
  personWillBeCreated: boolean;
};

type ActionForm = {
  title: string;
  description: string;
  project: string;
  owner: string;
  priority: string;
  status: string;
  due_date: string;
  source: string;
  linked_audit_id: string;
  linked_audit_number: string;
  linked_finding_id: string;
  linked_finding_reference: string;
  linked_asset_id: string;
  linked_asset_code: string;
  linked_inspection_id: string;
  linked_inspection_number: string;
  linked_maintenance_id: string;
  linked_maintenance_number: string;
  linked_calibration_id: string;
  linked_ncr_id: string;
  linked_ncr_number: string;
  linked_capa_id: string;
  linked_capa_number: string;
  linked_moc_id: string;
  linked_moc_number: string;
  linked_ainm_id: string;
  linked_ainm_number: string;
  linked_hse_inspection_id: string;
  linked_hse_inspection_number: string;
};

type AuditOption = { id: string; audit_number: string; title: string };
type FindingOption = { id: string; audit_id: string; reference: string; description: string };
type NcrCapaOption = { type: "NCR" | "CAPA"; id: string; number: string; title: string };
type MocOption = { id: string; number: string; title: string };
type AinmOption = {
  id: string;
  number: string;
  title: string;
  project: string;
  event_date: string;
  classification: string;
};
type AssetOption = { id: string; asset_code: string; name: string };
type AssetInspectionOption = { id: string; asset_id: string; inspection_number: string; inspection_date: string; result: string };
type AssetMaintenanceOption = { id: string; asset_id: string; maintenance_number: string; maintenance_date: string; description: string };
type AssetCalibrationOption = { id: string; asset_id: string; reference: string; certificate_number: string; calibration_date: string; calibration_due_date: string };
type HseInspectionOption = { id: string; inspection_number: string; title: string; form_title: string; project_work_scope: string; area_zone: string; inspection_date: string };

const emptyForm: ActionForm = {
  title: "",
  description: "",
  project: "",
  owner: "",
  priority: "Medium",
  status: "Open",
  due_date: "",
  source: "Manual",
  linked_audit_id: "",
  linked_audit_number: "",
  linked_finding_id: "",
  linked_finding_reference: "",
  linked_asset_id: "",
  linked_asset_code: "",
  linked_inspection_id: "",
  linked_inspection_number: "",
  linked_maintenance_id: "",
  linked_maintenance_number: "",
  linked_calibration_id: "",
  linked_ncr_id: "",
  linked_ncr_number: "",
  linked_capa_id: "",
  linked_capa_number: "",
  linked_moc_id: "",
  linked_moc_number: "",
  linked_ainm_id: "",
  linked_ainm_number: "",
  linked_hse_inspection_id: "",
  linked_hse_inspection_number: "",
};

const viewTabs: Array<{ id: HseActionView; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "register", label: "Action Register" },
  { id: "create", label: "Create Action" },
];

const priorityOptions = ["Low", "Medium", "High"];
const statusOptions = ["Open", "In Progress", "Closed"];
const sourceOptions = [
  "Manual",
  "Audit Finding",
  "Asset Inspection",
  "Asset Maintenance",
  "Asset Calibration",
  "NCR/CAPA",
  "MOC",
  "AINM",
  "HSE Inspection",
  "Risk",
  "HSE",
  "Other",
];

// Every source can be picked in the register filter (same list as the main Actions page), plus any source found in the data.
const filterSourceOptions: string[] = [
  "Manual",
  "Audit",
  "Audit Finding",
  "Asset Inspection",
  "Asset Maintenance",
  "Asset Calibration",
  "NCR/CAPA",
  "MOC",
  "AINM",
  "HSE Inspection",
  "Observation",
  "Risk",
  "HSE",
  "Other",
];

function getActionSourceValue(action: ActionItem) {
  const source = (action.source || "").trim();
  if (!source) return "Manual";
  if (source === "Audit") {
    // A stored "Audit" with no finding stays "Audit". The stored value is not changed.
    return action.linked_finding_id || action.linked_finding_reference ? "Audit Finding" : "Audit";
  }
  return source;
}

function getActionSourceLabel(action: ActionItem) {
  const source = getActionSourceValue(action);
  return source === "NCR/CAPA" ? "NCR / CAPA" : source;
}

function buildSourceFilterOptions(actions: ActionItem[], selected: string) {
  const extra = new Set<string>();
  actions.forEach((action) => {
    const value = getActionSourceValue(action);
    if (value && !filterSourceOptions.includes(value)) extra.add(value);
  });
  if (selected && !filterSourceOptions.includes(selected)) extra.add(selected);
  return [...filterSourceOptions, ...[...extra].sort((a, b) => a.localeCompare(b))];
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Short due-date wording for the record side card, for example "Due in 3 days" or "Overdue 4 days".
function getDueSummary(action: { due_date: string | null; status: string | null }) {
  const days = getDaysFromToday(action.due_date);
  if (days === null) return "No due date set";
  if (isClosedLikeStatus(action.status)) return `Was due ${formatDate(action.due_date)}`;
  if (days < 0) return `Overdue ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

// The next step in Open > In Progress > Closed, or null when the action is already closed.
function nextStatusStep(status: string | null | undefined): "In Progress" | "Closed" | null {
  if (isClosedLikeStatus(status)) return null;
  return normaliseStatus(status) === "in progress" ? "Closed" : "In Progress";
}

// What is still missing before an action is closed. These are suggestions only: closing is never blocked.
function closingGaps(evidenceCount: number, closeOutComments: string | null | undefined) {
  const gaps: Array<{ label: string; step: string }> = [];
  if (evidenceCount === 0) gaps.push({ label: "Evidence attached", step: "evidence" });
  if (!(closeOutComments || "").trim()) gaps.push({ label: "Closing note", step: "details" });
  return gaps;
}

// The one place that decides what happens when an action is closed with items missing. It only asks.
// To make these items block closing instead, return false here when gaps.length > 0.
function confirmCloseWithGaps(gaps: Array<{ label: string }>, question = "Close anyway?") {
  if (gaps.length === 0) return true;
  return window.confirm(
    `${gaps.length} item${gaps.length === 1 ? " is" : "s are"} still missing: ${gaps.map((gap) => gap.label.toLowerCase()).join(", ")}. ${question}`
  );
}

// Plain-text list of every linked record number, for the Excel and PDF exports.
function buildLinkedRecordText(action: ActionItem) {
  return [
    action.linked_audit_number ? `Audit ${action.linked_audit_number}` : "",
    action.linked_finding_reference ? `Finding ${action.linked_finding_reference}` : "",
    action.linked_asset_code ? `Asset ${action.linked_asset_code}` : "",
    action.linked_inspection_number ? `Inspection ${action.linked_inspection_number}` : "",
    action.linked_maintenance_number ? `Maintenance ${action.linked_maintenance_number}` : "",
    action.linked_ncr_number ? `NCR ${action.linked_ncr_number}` : "",
    action.linked_capa_number ? `CAPA ${action.linked_capa_number}` : "",
    action.linked_moc_number ? `MOC ${action.linked_moc_number}` : "",
    action.linked_ainm_number ? `AINM ${action.linked_ainm_number}` : "",
    action.linked_hse_inspection_number ? `HSE Inspection ${action.linked_hse_inspection_number}` : "",
    action.linked_observation_number ? `Observation ${action.linked_observation_number}` : "",
  ].filter(Boolean).join(", ");
}

type LinkedTarget = { kind: string; number: string; href: string | null };

// The record an action comes from, with the same destinations the main Actions page uses.
function getLinkedTarget(action: ActionItem, audits: AuditOption[], findings: FindingOption[]): LinkedTarget | null {
  const source = getActionSourceValue(action);
  const asset = encodeURIComponent(action.linked_asset_code || action.linked_asset_id || "");
  if (source === "Audit" || source === "Audit Finding") {
    let id = (action.linked_audit_id || "").trim();
    let number = (action.linked_audit_number || "").trim();
    if (!id && number) id = audits.find((option) => option.audit_number === number)?.id || "";
    if (!id && !number) {
      const findingId = (action.linked_finding_id || "").trim();
      const findingRef = (action.linked_finding_reference || "").trim();
      const matches = findingId
        ? findings.filter((finding) => finding.id === findingId)
        : findingRef
        ? findings.filter((finding) => finding.reference === findingRef)
        : [];
      if (matches.length === 1) id = matches[0].audit_id;
    }
    if (id && !number) number = audits.find((option) => option.id === id)?.audit_number || "";
    if (!id && !number) return null;
    return {
      kind: "audit",
      number: number || "linked audit",
      href: id ? `/audits?tab=programme&selected=${encodeURIComponent(id)}` : `/audits?search=${encodeURIComponent(number)}`,
    };
  }
  if (source === "Asset Inspection" && action.linked_inspection_number) {
    return { kind: "inspection", number: action.linked_inspection_number, href: `/assets/inspection?asset=${asset}` };
  }
  if (source === "Asset Maintenance" && action.linked_maintenance_number) {
    return { kind: "maintenance", number: action.linked_maintenance_number, href: `/assets/maintenance?asset=${asset}` };
  }
  if (source === "Asset Calibration" && action.linked_asset_code) {
    return { kind: "calibration", number: action.linked_asset_code, href: `/assets/calibration?asset=${asset}` };
  }
  if (source === "NCR/CAPA") {
    if (action.linked_ncr_id || action.linked_ncr_number) {
      return {
        kind: "NCR",
        number: action.linked_ncr_number || "linked NCR",
        href: action.linked_ncr_id
          ? `/ncr-capa?ncrId=${encodeURIComponent(action.linked_ncr_id)}`
          : `/ncr-capa?ncr=${encodeURIComponent(action.linked_ncr_number || "")}`,
      };
    }
    if (action.linked_capa_number) return { kind: "CAPA", number: action.linked_capa_number, href: null };
    return null;
  }
  if (source === "MOC" && action.linked_moc_number) {
    return { kind: "MOC", number: action.linked_moc_number, href: `/moc?search=${encodeURIComponent(action.linked_moc_number)}` };
  }
  if (source === "AINM" && (action.linked_ainm_id || action.linked_ainm_number)) {
    return {
      kind: "AINM",
      number: action.linked_ainm_number || "linked AINM",
      href: action.linked_ainm_id
        ? `/hse/ainm?ainmId=${encodeURIComponent(action.linked_ainm_id)}`
        : `/hse/ainm?ainm=${encodeURIComponent(action.linked_ainm_number || "")}`,
    };
  }
  if (source === "HSE Inspection" && (action.linked_hse_inspection_id || action.linked_hse_inspection_number)) {
    return {
      kind: "HSE inspection",
      number: action.linked_hse_inspection_number || "linked inspection",
      href: action.linked_hse_inspection_id
        ? `/hse/inspections?inspectionId=${encodeURIComponent(action.linked_hse_inspection_id)}`
        : `/hse/inspections?inspection=${encodeURIComponent(action.linked_hse_inspection_number || "")}`,
    };
  }
  if (source === "Observation" && (action.linked_observation_id || action.linked_observation_number)) {
    return {
      kind: "observation",
      number: action.linked_observation_number || "linked observation",
      href: action.linked_observation_id
        ? `/hse/observations?observationId=${encodeURIComponent(action.linked_observation_id)}`
        : `/hse/observations?observation=${encodeURIComponent(action.linked_observation_number || "")}`,
    };
  }
  return null;
}

function normalizeImportHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeLookupValue(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function getImportCell(row: Record<string, unknown>, candidates: string[]) {
  const normalizedCandidates = candidates.map(normalizeImportHeader);
  const entry = Object.entries(row).find(([key]) => normalizedCandidates.includes(normalizeImportHeader(key)));
  const value = entry?.[1];
  return value === null || value === undefined ? "" : String(value).trim();
}

function normalizeImportDate(value: unknown) {
  if (value === null || value === undefined || value === "") return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const month = String(parsed.m).padStart(2, "0");
      const day = String(parsed.d).padStart(2, "0");
      return `${parsed.y}-${month}-${day}`;
    }
  }
  const text = String(value).trim();
  if (!text) return "";
  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;
  const ukMatch = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (ukMatch) {
    const year = ukMatch[3].length === 2 ? `20${ukMatch[3]}` : ukMatch[3];
    return `${year}-${ukMatch[2].padStart(2, "0")}-${ukMatch[1].padStart(2, "0")}`;
  }
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function getRawDateCell(row: Record<string, unknown>, candidates: string[]) {
  const normalizedCandidates = candidates.map(normalizeImportHeader);
  const entry = Object.entries(row).find(([key]) => normalizedCandidates.includes(normalizeImportHeader(key)));
  return entry?.[1] ?? "";
}

function titleCaseName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((part) => part ? `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}` : part)
    .join(" ");
}

function generateEmailFromName(name: string) {
  const clean = titleCaseName(name).replace(/[^a-zA-Z\s'-]/g, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return "";
  const firstInitial = parts[0].charAt(0).toLowerCase();
  const surname = parts[parts.length - 1].replace(/[^a-zA-Z]/g, "").toLowerCase();
  return firstInitial && surname ? `${firstInitial}${surname}@enshoresubsea.com` : "";
}

function normalizeImportPriority(value: string) {
  const match = priorityOptions.find((option) => option.toLowerCase() === value.trim().toLowerCase());
  return match || "Medium";
}

function normalizeImportStatus(value: string) {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return "Open";
  if (["closed", "complete", "completed"].includes(trimmed)) return "Closed";
  if (["in progress", "progress", "ongoing"].includes(trimmed)) return "In Progress";
  return "Open";
}

function normalizeImportSource(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "HSE";
  const matched = sourceOptions.find((option) => option.toLowerCase() === trimmed.toLowerCase());
  return matched || "HSE";
}

function normalizeImportDepartment(value: string) {
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "quality" || trimmed === "qa" || trimmed === "qc") return "Quality";
  if (trimmed === "hse" || trimmed === "h&s" || trimmed === "health safety environment") return "HSE";
  if (trimmed === "hseq") return "HSE";
  return "HSE";
}

function normaliseStatus(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function isClosedLikeStatus(value: string | null | undefined) {
  const status = normaliseStatus(value);
  return status === "closed" || status === "complete" || status === "completed";
}

function extractActionNumber(value: string | null | undefined) {
  const match = (value || "").match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function getNextActionNumber(actions: ActionItem[]) {
  const max = actions.reduce((highest, action) => {
    const value = extractActionNumber(action.action_number);
    return value === null ? highest : Math.max(highest, value);
  }, 0);
  return `ACT-${String(max + 1).padStart(3, "0")}`;
}

function getDaysFromToday(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / 86400000);
}

function isOverdue(action: ActionItem) {
  if (isClosedLikeStatus(action.status)) return false;
  const days = getDaysFromToday(action.due_date);
  return days !== null && days < 0;
}

function isAssetLinkedSource(source: string | null | undefined) {
  return source === "Asset Inspection" || source === "Asset Maintenance" || source === "Asset Calibration";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function getDueLabel(value: string | null | undefined) {
  const days = getDaysFromToday(value);
  if (days === null) return "No due date";
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "Due today";
  return `Due in ${days} day${days === 1 ? "" : "s"}`;
}

function countByOwner(actions: ActionItem[]) {
  const counts = new Map<string, number>();
  actions.forEach((action) => {
    const owner = (action.owner || "Unassigned").trim() || "Unassigned";
    counts.set(owner, (counts.get(owner) || 0) + 1);
  });
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, 8);
}

export default function HseActionsPage() {
  const imsPermissions = useImsPermissions();
  const router = useRouter();
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [evidenceRows, setEvidenceRows] = useState<EvidenceRow[]>([]);
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [people, setPeople] = useState<PersonOption[]>([]);
  const [auditOptions, setAuditOptions] = useState<AuditOption[]>([]);
  const [findingOptions, setFindingOptions] = useState<FindingOption[]>([]);
  const [ncrCapaOptions, setNcrCapaOptions] = useState<NcrCapaOption[]>([]);
  const [mocOptions, setMocOptions] = useState<MocOption[]>([]);
  const [ainmOptions, setAinmOptions] = useState<AinmOption[]>([]);
  const [assetOptions, setAssetOptions] = useState<AssetOption[]>([]);
  const [assetInspectionOptions, setAssetInspectionOptions] = useState<AssetInspectionOption[]>([]);
  const [assetMaintenanceOptions, setAssetMaintenanceOptions] = useState<AssetMaintenanceOption[]>([]);
  const [assetCalibrationOptions, setAssetCalibrationOptions] = useState<AssetCalibrationOption[]>([]);
  const [hseInspectionOptions, setHseInspectionOptions] = useState<HseInspectionOption[]>([]);
  const [activeView, setActiveView] = useUrlState<HseActionView>("view", "dashboard", ["dashboard", "register", "create"]);
  const [selectedId, setSelectedId] = useUrlState("selected", "");
  const [search, setSearch] = useUrlState("search", "");
  const [statusFilter, setStatusFilter] = useUrlState("status", "");
  const [ownerFilter, setOwnerFilter] = useUrlState("owner", "");
  const [priorityFilter, setPriorityFilter] = useUrlState("priority", "");
  const [sourceFilter, setSourceFilter] = useUrlState("source", "");
  const [showClosed, setShowClosed] = useUrlFlag("closed", false);
  const [showRegisterFilters, setShowRegisterFilters] = useUrlFlag("filters");
  const [pressureFilter, setPressureFilter] = useUrlState<"" | "overdue" | "dueWeek">("pressure", "", ["", "overdue", "dueWeek"]);
  const [form, setForm] = useState<ActionForm>(emptyForm);
  const [message, setMessage] = useState("Loading HSE actions...");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState("");
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [importRows, setImportRows] = useState<HseActionImportRow[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [isImportingActions, setIsImportingActions] = useState(false);

  const canCreateAction = useMemo(() => {
    return imsPermissions.loaded && (imsPermissions.isMasterAdmin || imsPermissions.fullAccess || imsPermissions.canCreate);
  }, [imsPermissions.canCreate, imsPermissions.fullAccess, imsPermissions.isMasterAdmin, imsPermissions.loaded]);

  // Only used to enable or disable the header button that opens the action in Central Actions, where editing happens.
  const canEditAction = useMemo(() => {
    return imsPermissions.loaded && (imsPermissions.isMasterAdmin || imsPermissions.fullAccess || imsPermissions.canEdit);
  }, [imsPermissions.canEdit, imsPermissions.fullAccess, imsPermissions.isMasterAdmin, imsPermissions.loaded]);

  useEffect(() => {
    void loadData();
    void supabase.auth.getUser().then(({ data }) => {
      setCurrentUserEmail(data.user?.email?.trim().toLowerCase() || "");
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const view = params.get("view");
    const prefillSource = params.get("prefill_source") || "";
    const linkedHseInspectionId = params.get("linked_hse_inspection_id") || "";
    const linkedHseInspectionNumber = params.get("linked_hse_inspection_number") || "";
    if (view === "create" || prefillSource || linkedHseInspectionId || linkedHseInspectionNumber) {
      setActiveView("create");
      setForm((current) => ({
        ...current,
        source: prefillSource || current.source,
        project: params.get("prefill_project") || current.project,
        title: params.get("prefill_title") || current.title,
        description: params.get("prefill_description") || current.description,
        linked_hse_inspection_id: linkedHseInspectionId || current.linked_hse_inspection_id,
        linked_hse_inspection_number: linkedHseInspectionNumber || current.linked_hse_inspection_number,
      }));
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !actions.length) return;
    const params = new URLSearchParams(window.location.search);
    const actionId = params.get("actionId") || "";
    const actionNumber = params.get("action") || "";
    if (!actionId && !actionNumber) return;
    const matched = actions.find((action) => action.id === actionId || action.action_number === actionNumber);
    if (!matched) return;
    setSelectedId(matched.id);
    // Opening a closed action from a link shows it.
    if (isClosedLikeStatus(matched.status)) setShowClosed(true);
    setActiveView("register");
  }, [actions]);

  async function loadData() {
    setLoading(true);
    const [actionsRes, peopleRes, auditRes, findingRes, ncrRes, capaRes, mocRes, ainmRes, hseInspectionRes, assetsRes, inspectionsRes, maintenanceRes, calibrationsRes, evidenceRes] = await Promise.all([
      supabase.from("actions").select("*").order("action_number", { ascending: true }),
      supabase.from("people").select("id,name,email,role,department,active").eq("active", true).order("name", { ascending: true }),
      supabase.from("audits").select("id,audit_number,title").order("audit_number", { ascending: true }),
      supabase.from("audit_findings").select("id,audit_id,reference,description").order("reference", { ascending: true }),
      supabase.from("ncrs").select("id,ncr_number,title").order("ncr_number", { ascending: true }),
      supabase.from("capas").select("id,capa_number,title").order("capa_number", { ascending: true }),
      supabase.from("moc_reports").select("id,moc_report_no,moc_report_title").order("moc_report_no", { ascending: true }),
      supabase.from("hse_ainm_records").select("id,ainm_number,title,project,event_date,event_classification").order("event_date", { ascending: false }).order("ainm_number", { ascending: false }),
      supabase.from("hse_inspection_records").select("id,inspection_number,title,form_title,project_work_scope,area_zone,inspection_date").order("inspection_date", { ascending: false }).order("inspection_number", { ascending: false }),
      supabase.from("assets").select("id,asset_code,name").order("asset_code", { ascending: true }),
      supabase.from("asset_inspection_records").select("id,asset_id,inspection_number,inspection_date,result").order("inspection_number", { ascending: true }),
      supabase.from("asset_maintenance_records").select("id,asset_id,maintenance_number,maintenance_date,description").order("maintenance_number", { ascending: true }),
      supabase.from("asset_calibration_records").select("id,asset_id,reference,certificate_number,calibration_date,calibration_due_date").order("calibration_date", { ascending: false }),
      // Read only: lets the action record show how many evidence files an action already has.
      supabase.from("evidence_files").select("id,record_id,file_name").eq("record_type", "ACTION"),
    ]);

    if (actionsRes.error) {
      setMessage(`HSE actions failed to load: ${actionsRes.error.message}`);
      setLoading(false);
      return;
    }

    const allActions = ((actionsRes.data || []) as ActionItem[]).sort((a, b) => {
      const aNum = extractActionNumber(a.action_number);
      const bNum = extractActionNumber(b.action_number);
      if (aNum !== null && bNum !== null) return aNum - bNum;
      return (a.action_number || "").localeCompare(b.action_number || "");
    });
    const hseActions = allActions.filter((action) => (action.department || "").trim().toUpperCase() === "HSE");
    setActions(hseActions);
    if (evidenceRes.data && !evidenceRes.error) setEvidenceRows(((evidenceRes.data || []) as EvidenceRow[]).filter((row) => row.record_id));
    if (peopleRes.data && !peopleRes.error) setPeople((peopleRes.data || []) as PersonOption[]);
    if (auditRes.data && !auditRes.error) {
      setAuditOptions(((auditRes.data || []) as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id || ""),
        audit_number: String(row.audit_number || ""),
        title: String(row.title || ""),
      })).filter((row) => row.id && row.audit_number));
    }
    if (findingRes.data && !findingRes.error) {
      setFindingOptions(((findingRes.data || []) as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id || ""),
        audit_id: String(row.audit_id || ""),
        reference: String(row.reference || ""),
        description: String(row.description || ""),
      })).filter((row) => row.id && row.audit_id && row.reference));
    }
    const ncrCapaRows: NcrCapaOption[] = [];
    if (ncrRes.data && !ncrRes.error) {
      ncrCapaRows.push(...((ncrRes.data || []) as Array<Record<string, unknown>>).map((row) => ({
        type: "NCR" as const,
        id: String(row.id || ""),
        number: String(row.ncr_number || ""),
        title: String(row.title || ""),
      })).filter((row) => row.id && row.number));
    }
    if (capaRes.data && !capaRes.error) {
      ncrCapaRows.push(...((capaRes.data || []) as Array<Record<string, unknown>>).map((row) => ({
        type: "CAPA" as const,
        id: String(row.id || ""),
        number: String(row.capa_number || ""),
        title: String(row.title || ""),
      })).filter((row) => row.id && row.number));
    }
    setNcrCapaOptions(ncrCapaRows);
    if (mocRes.data && !mocRes.error) {
      setMocOptions(((mocRes.data || []) as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id || ""),
        number: String(row.moc_report_no || ""),
        title: String(row.moc_report_title || ""),
      })).filter((row) => row.id && row.number));
    }
    if (ainmRes.data && !ainmRes.error) {
      setAinmOptions(((ainmRes.data || []) as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id || ""),
        number: String(row.ainm_number || ""),
        title: String(row.title || ""),
        project: String(row.project || ""),
        event_date: String(row.event_date || ""),
        classification: String(row.event_classification || ""),
      })).filter((row) => row.id && row.number));
    }
    if (hseInspectionRes.data && !hseInspectionRes.error) {
      setHseInspectionOptions(((hseInspectionRes.data || []) as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id || ""),
        inspection_number: String(row.inspection_number || ""),
        title: String(row.title || ""),
        form_title: String(row.form_title || ""),
        project_work_scope: String(row.project_work_scope || ""),
        area_zone: String(row.area_zone || ""),
        inspection_date: String(row.inspection_date || ""),
      })).filter((row) => row.id && row.inspection_number));
    }
    if (assetsRes.data && !assetsRes.error) {
      setAssetOptions(((assetsRes.data || []) as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id || ""),
        asset_code: String(row.asset_code || ""),
        name: String(row.name || ""),
      })).filter((row) => row.id && row.asset_code));
    }
    if (inspectionsRes.data && !inspectionsRes.error) {
      setAssetInspectionOptions(((inspectionsRes.data || []) as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id || ""),
        asset_id: String(row.asset_id || ""),
        inspection_number: String(row.inspection_number || ""),
        inspection_date: String(row.inspection_date || ""),
        result: String(row.result || ""),
      })).filter((row) => row.id && row.asset_id && row.inspection_number));
    }
    if (maintenanceRes.data && !maintenanceRes.error) {
      setAssetMaintenanceOptions(((maintenanceRes.data || []) as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id || ""),
        asset_id: String(row.asset_id || ""),
        maintenance_number: String(row.maintenance_number || ""),
        maintenance_date: String(row.maintenance_date || ""),
        description: String(row.description || ""),
      })).filter((row) => row.id && row.asset_id && row.maintenance_number));
    }
    if (calibrationsRes.data && !calibrationsRes.error) {
      setAssetCalibrationOptions(((calibrationsRes.data || []) as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id || ""),
        asset_id: String(row.asset_id || ""),
        reference: String(row.reference || ""),
        certificate_number: String(row.certificate_number || ""),
        calibration_date: String(row.calibration_date || ""),
        calibration_due_date: String(row.calibration_due_date || ""),
      })).filter((row) => row.id && row.asset_id));
    }
    setLastRefreshed(new Date().toLocaleString("en-GB"));
    setMessage(`Loaded ${hseActions.length} HSE action${hseActions.length === 1 ? "" : "s"}.`);
    setLoading(false);
  }

  const selectedAction = useMemo(() => actions.find((action) => action.id === selectedId) || null, [actions, selectedId]);

  const kpis = useMemo(() => {
    const open = actions.filter((action) => !isClosedLikeStatus(action.status)).length;
    const overdue = actions.filter(isOverdue).length;
    const dueWeek = actions.filter((action) => {
      if (isClosedLikeStatus(action.status)) return false;
      const days = getDaysFromToday(action.due_date);
      return days !== null && days >= 0 && days <= 7;
    }).length;
    const closed = actions.filter((action) => isClosedLikeStatus(action.status)).length;
    const high = actions.filter((action) => !isClosedLikeStatus(action.status) && (action.priority || "").toLowerCase() === "high").length;
    return { total: actions.length, open, overdue, dueWeek, closed, high };
  }, [actions]);

  const ownerRows = useMemo(() => countByOwner(actions.filter((action) => !isClosedLikeStatus(action.status))), [actions]);
  const statusRows = useMemo(() => {
    return ["Open", "In Progress", "Closed"].map((status) => ({
      label: status,
      value: actions.filter((action) => (action.status || "") === status).length,
    })).filter((row) => row.value > 0);
  }, [actions]);
  const sourceRows = useMemo(() => {
    const counts = new Map<string, number>();
    actions.forEach((action) => {
      const source = action.source || "Unspecified";
      counts.set(source, (counts.get(source) || 0) + 1);
    });
    return [...counts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [actions]);

  const ownerOptions = useMemo(() => {
    const savedOwners = actions.map((action) => action.owner).filter(Boolean) as string[];
    const peopleNames = people.map((person) => person.name).filter(Boolean);
    return [...new Set([...peopleNames, ...savedOwners])].sort();
  }, [actions, people]);

  const importableRows = useMemo(
    () => importRows.filter((row) => row.errors.length === 0 && row.skipReasons.length === 0),
    [importRows]
  );

  const skippedImportRows = useMemo(
    () => importRows.filter((row) => row.errors.length > 0 || row.skipReasons.length > 0),
    [importRows]
  );

  const createFindingOptions = useMemo(
    () => findingOptions.filter((finding) => finding.audit_id === form.linked_audit_id),
    [findingOptions, form.linked_audit_id]
  );

  const createInspectionOptions = useMemo(
    () => assetInspectionOptions.filter((record) => !form.linked_asset_id || record.asset_id === form.linked_asset_id),
    [assetInspectionOptions, form.linked_asset_id]
  );

  const createMaintenanceOptions = useMemo(
    () => assetMaintenanceOptions.filter((record) => !form.linked_asset_id || record.asset_id === form.linked_asset_id),
    [assetMaintenanceOptions, form.linked_asset_id]
  );

  const createCalibrationOptions = useMemo(
    () => assetCalibrationOptions.filter((record) => !form.linked_asset_id || record.asset_id === form.linked_asset_id),
    [assetCalibrationOptions, form.linked_asset_id]
  );

  const sourceFilterOptions = useMemo(() => buildSourceFilterOptions(actions, sourceFilter), [actions, sourceFilter]);

  // Closed actions are hidden by default. A status filter, or the Show Closed button, brings them back.
  const closedHidden = !showClosed && !statusFilter;

  const evidenceCountMap = useMemo(() => {
    const map = new Map<string, number>();
    evidenceRows.forEach((row) => map.set(row.record_id, (map.get(row.record_id) || 0) + 1));
    return map;
  }, [evidenceRows]);

  const filteredActions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return actions.filter((action) => {
      const haystack = [
        action.action_number,
        action.title,
        action.description,
        action.project,
        action.owner,
        action.source,
        action.linked_ainm_number,
        action.linked_hse_inspection_number,
        action.linked_observation_number,
      ].join(" ").toLowerCase();
      return (
        (!query || haystack.includes(query)) &&
        (!closedHidden || !isClosedLikeStatus(action.status)) &&
        (!statusFilter || (action.status || "") === statusFilter) &&
        (!ownerFilter || (action.owner || "") === ownerFilter) &&
        (!priorityFilter || (action.priority || "") === priorityFilter) &&
        (!sourceFilter || getActionSourceValue(action) === sourceFilter) &&
        (!pressureFilter ||
          (pressureFilter === "overdue"
            ? isOverdue(action)
            : (() => {
                if (isClosedLikeStatus(action.status)) return false;
                const days = getDaysFromToday(action.due_date);
                return days !== null && days >= 0 && days <= 7;
              })()))
      );
    });
  }, [actions, closedHidden, ownerFilter, pressureFilter, priorityFilter, search, sourceFilter, statusFilter]);

  async function handleImportFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (!canCreateAction) {
      event.target.value = "";
      setMessage("Read-only access: you do not have permission to import HSE actions.");
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImportRows([]);
    setMessage(`Reading ${file.name}...`);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        setMessage("Import failed: workbook does not contain any sheets.");
        return;
      }

      const sheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
        raw: true,
      });

      if (!rawRows.length) {
        setMessage("Import failed: first sheet has no action rows.");
        return;
      }

      const existingPeople = new Set(people.map((person) => normalizeLookupValue(person.name)).filter(Boolean));
      const existingEmails = new Set(people.map((person) => normalizeLookupValue(person.email)).filter(Boolean));
      const uploadKeys = new Set<string>();
      const uploadPeople = new Set<string>();

      const parsedRows = rawRows.map((row, index): HseActionImportRow => {
        const title = getImportCell(row, ["Title", "Action Title", "Action", "Action Required"]);
        const descriptionParts = [
          getImportCell(row, ["Description", "Action Description", "Details"]),
          getImportCell(row, ["Comments", "Comment", "Notes"]),
        ].filter(Boolean);
        const project = getImportCell(row, ["Project", "Project / Work Scope", "Work Scope", "Project Work Scope"]);
        const department = normalizeImportDepartment(getImportCell(row, ["Department", "Allocation", "Action Department", "Function"]));
        const rawOwner = getImportCell(row, ["Owner", "Assigned", "Assigned To", "Action Owner", "Responsible Person"]);
        const owner = rawOwner ? titleCaseName(rawOwner) : "";
        const priority = normalizeImportPriority(getImportCell(row, ["Priority"]));
        const status = normalizeImportStatus(getImportCell(row, ["Status"]));
        const dueDate = normalizeImportDate(getRawDateCell(row, ["Due Date", "Target Date", "Target Response Date"]));
        const source = normalizeImportSource(getImportCell(row, ["Source", "Source Type", "Module"]));
        const linkedReference = getImportCell(row, ["Linked Record", "Linked Reference", "AINM No", "AINM Number", "Inspection No", "Inspection Number", "NCR No", "NCR Number"]);
        const errors: string[] = [];
        const skipReasons: string[] = [];
        const rowKey = normalizeLookupValue(`${title}|${project}|${owner}|${dueDate}|${descriptionParts.join(" ")}`);
        const normalizedOwner = normalizeLookupValue(owner);
        const ownerEmail = owner ? generateEmailFromName(owner) : "";
        const personWillBeCreated = Boolean(owner && !existingPeople.has(normalizedOwner));

        if (!title) errors.push("Title/Action is required.");
        if (owner && !ownerEmail && !existingPeople.has(normalizedOwner)) {
          errors.push("Owner needs a first name and surname to create People record.");
        }
        if (ownerEmail && existingEmails.has(normalizeLookupValue(ownerEmail)) && !existingPeople.has(normalizedOwner)) {
          skipReasons.push("Generated owner email already exists for another person.");
        }
        if (rowKey && uploadKeys.has(rowKey)) skipReasons.push("Duplicate action in uploaded file.");
        if (rowKey) uploadKeys.add(rowKey);
        if (normalizedOwner && uploadPeople.has(normalizedOwner) && personWillBeCreated) {
          // Only the first row needs to create the person. Later rows can still import against the same new owner.
        } else if (normalizedOwner && personWillBeCreated) {
          uploadPeople.add(normalizedOwner);
        }

        return {
          rowNumber: index + 2,
          title,
          description: descriptionParts.join("\n\n"),
          department,
          project,
          owner,
          priority,
          status,
          due_date: dueDate,
          source,
          linkedReference,
          errors,
          skipReasons,
          personWillBeCreated,
        };
      });

      setImportRows(parsedRows);
      setMessage(`Preview ready: ${parsedRows.length} action row${parsedRows.length === 1 ? "" : "s"} loaded from ${file.name}.`);
    } catch (error) {
      setMessage(`Import preview failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      event.target.value = "";
    }
  }

  function buildLinkedImportFields(row: HseActionImportRow) {
    const reference = row.linkedReference.trim();
    const payload: Partial<ActionItem> = {};
    if (!reference) return payload;

    const normalizedSource = row.source.toLowerCase();
    if (normalizedSource === "ainm" || /^a?r?\d+/i.test(reference)) {
      const matched = ainmOptions.find((option) => option.number.toLowerCase() === reference.toLowerCase());
      payload.linked_ainm_id = matched?.id || null;
      payload.linked_ainm_number = matched?.number || reference;
      return payload;
    }

    if (normalizedSource === "hse inspection" || /^hse-ins-/i.test(reference)) {
      const matched = hseInspectionOptions.find((option) => option.inspection_number.toLowerCase() === reference.toLowerCase());
      payload.linked_hse_inspection_id = matched?.id || null;
      payload.linked_hse_inspection_number = matched?.inspection_number || reference;
      return payload;
    }

    if (normalizedSource === "ncr/capa" || /^ncr-/i.test(reference)) {
      const matched = ncrCapaOptions.find((option) => option.number.toLowerCase() === reference.toLowerCase());
      if (matched?.type === "NCR") {
        payload.linked_ncr_id = matched.id;
        payload.linked_ncr_number = matched.number;
      } else if (matched?.type === "CAPA") {
        payload.linked_capa_id = matched.id;
        payload.linked_capa_number = matched.number;
      } else {
        payload.linked_ncr_number = reference;
      }
      return payload;
    }

    if (normalizedSource === "moc") {
      const matched = mocOptions.find((option) => option.number.toLowerCase() === reference.toLowerCase());
      payload.linked_moc_id = matched?.id || null;
      payload.linked_moc_number = matched?.number || reference;
      return payload;
    }

    return payload;
  }

  async function importPreviewedActions() {
    if (!canCreateAction) {
      setMessage("Read-only access: you do not have permission to import HSE actions.");
      return;
    }

    if (!importRows.length) {
      setMessage("Select an Excel file before importing HSE/Quality actions.");
      return;
    }
    if (!importableRows.length) {
      setMessage("No valid HSE/Quality action rows are available to import.");
      return;
    }

    setIsImportingActions(true);
    try {
      const existingPeople = new Set(people.map((person) => normalizeLookupValue(person.name)).filter(Boolean));
      const missingPeople = Array.from(
        new Map(
          importableRows
            .filter((row) => row.owner && row.personWillBeCreated && !existingPeople.has(normalizeLookupValue(row.owner)))
            .map((row) => [normalizeLookupValue(row.owner), { name: row.owner, department: row.department || "HSE" }])
        ).values()
      );

      if (missingPeople.length) {
        const peopleRows = missingPeople.map((person) => ({
          name: person.name,
          email: generateEmailFromName(person.name) || null,
          role: null,
          department: person.department,
          active: true,
        }));
        const { error: peopleError } = await supabase.from("people").insert(peopleRows);
        if (peopleError) throw new Error(`People import failed: ${peopleError.message}`);
      }

      const { data: allActionNumbers, error: numbersError } = await supabase.from("actions").select("action_number");
      if (numbersError) throw new Error(`Could not allocate action numbers: ${numbersError.message}`);
      const existingActions = (allActionNumbers || []) as ActionItem[];
      const highest = existingActions.reduce((max, action) => Math.max(max, extractActionNumber(action.action_number) || 0), 0);

      const actionRows = importableRows.map((row, index) => ({
        action_number: `ACT-${String(highest + index + 1).padStart(3, "0")}`,
        title: row.title.trim(),
        description: row.description.trim() || null,
        department: row.department || "HSE",
        project: row.project.trim() || null,
        owner: row.owner.trim() || null,
        priority: row.priority,
        status: row.status,
        due_date: row.due_date || null,
        source: row.source || "HSE",
        ...buildLinkedImportFields(row),
      }));

      const { error: actionError } = await supabase.from("actions").insert(actionRows);
      if (actionError) throw new Error(`Action import failed: ${actionError.message}`);

      setMessage(`Imported ${actionRows.length} HSE/Quality action${actionRows.length === 1 ? "" : "s"} from ${importFileName}.`);
      setImportRows([]);
      setImportFileName("");
      setShowImportPanel(false);
      setActiveView("register");
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "HSE/Quality action import failed.");
    } finally {
      setIsImportingActions(false);
    }
  }

  async function createAction(event: React.FormEvent) {
    event.preventDefault();
    if (!canCreateAction) {
      setMessage("Read-only access: you do not have permission to create HSE actions.");
      return;
    }

    if (!form.title.trim()) {
      setMessage("Action title is required.");
      return;
    }
    setSaving(true);

    const nextNumber = await getNextNumberFromAllActions();
    const { error } = await supabase.from("actions").insert([{
      action_number: nextNumber,
      title: form.title.trim(),
      description: form.description.trim() || null,
      raised_by_email: currentUserEmail || null,
      department: "HSE",
      project: form.project.trim() || null,
      owner: form.owner.trim() || null,
      priority: form.priority,
      status: form.status,
          due_date: form.due_date || null,
          source: form.source || "Manual",
          linked_audit_id: form.linked_audit_id || null,
          linked_audit_number: form.linked_audit_number || null,
          linked_finding_id: form.linked_finding_id || null,
          linked_finding_reference: form.linked_finding_reference || null,
          linked_asset_id: form.linked_asset_id || null,
          linked_asset_code: form.linked_asset_code || null,
          linked_inspection_id: form.linked_inspection_id || null,
          linked_inspection_number: form.linked_inspection_number || null,
          linked_maintenance_id: form.linked_maintenance_id || null,
          linked_maintenance_number: form.linked_maintenance_number || null,
          linked_calibration_id: form.linked_calibration_id || null,
          linked_ncr_id: form.linked_ncr_id || null,
          linked_ncr_number: form.linked_ncr_number || null,
          linked_capa_id: form.linked_capa_id || null,
          linked_capa_number: form.linked_capa_number || null,
          linked_moc_id: form.linked_moc_id || null,
          linked_moc_number: form.linked_moc_number || null,
          linked_ainm_id: form.linked_ainm_id || null,
          linked_ainm_number: form.linked_ainm_number || null,
          linked_hse_inspection_id: form.linked_hse_inspection_id || null,
          linked_hse_inspection_number: form.linked_hse_inspection_number || null,
    }]);

    setSaving(false);
    if (error) {
      setMessage(`Create action failed: ${error.message}`);
      return;
    }
    setForm(emptyForm);
    setMessage(`${nextNumber} created in central Action Management as an HSE action.`);
    setActiveView("register");
    await loadData();
  }

  async function getNextNumberFromAllActions() {
    const { data } = await supabase.from("actions").select("action_number");
    return getNextActionNumber((data || []) as ActionItem[]);
  }

  // A drill-down from the dashboard shows every action behind the number clicked, closed ones included when no status is given.
  function openRegister(status = "", includeClosed = false) {
    setStatusFilter(status);
    setShowClosed(includeClosed);
    setSelectedId("");
    setActiveView("register");
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("");
    setOwnerFilter("");
    setPriorityFilter("");
    setSourceFilter("");
    setPressureFilter("");
    setShowClosed(false);
    setSelectedId("");
  }

  // One description of the register filters, printed on both the PDF and the Excel sheet.
  function registerFilterDescriptions() {
    return [
      ...(search.trim() ? [`Search: "${search.trim()}"`] : []),
      ...(statusFilter ? [`Status: ${statusFilter}`] : []),
      ...(ownerFilter ? [`Owner: ${ownerFilter}`] : []),
      ...(priorityFilter ? [`Priority: ${priorityFilter}`] : []),
      ...(sourceFilter ? [`Source: ${sourceFilter}`] : []),
      ...(pressureFilter === "overdue" ? ["Overdue only"] : pressureFilter === "dueWeek" ? ["Due this week"] : []),
      ...(closedHidden ? ["Open / non-closed only"] : []),
    ];
  }

  async function exportRegisterExcel() {
    if (filteredActions.length === 0) {
      setMessage("No filtered actions available for Excel export.");
      return;
    }
    try {
      await downloadRegisterExcel<ActionItem>({
        fileName: `hse-action-register-${excelDateStamp()}.xlsx`,
        sheetName: "HSE Action Register",
        title: "HSE Action Register — Enshore IMS",
        filters: registerFilterDescriptions(),
        rows: filteredActions,
        columns: [
          { header: "Action No.", width: 14, value: (action) => action.action_number || "" },
          { header: "Title", width: 44, value: (action) => action.title || "" },
          { header: "Description", width: 60, value: (action) => action.description || "" },
          { header: "Project", width: 22, value: (action) => action.project || "" },
          { header: "Source", width: 20, value: (action) => getActionSourceLabel(action) },
          { header: "Linked Record", width: 30, value: (action) => buildLinkedRecordText(action) },
          { header: "Owner", width: 22, value: (action) => action.owner || "" },
          { header: "Priority", width: 11, value: (action) => action.priority || "" },
          { header: "Due Date", width: 13, value: (action) => (action.due_date ? formatDate(action.due_date) : "") },
          { header: "Status", width: 14, value: (action) => action.status || "" },
          { header: "Overdue", width: 9, value: (action) => (isOverdue(action) ? "Yes" : "No") },
          { header: "Close-out Comments", width: 50, value: (action) => action.close_out_comments || "" },
        ],
      });
      setMessage(`HSE Action Register Excel report created with ${filteredActions.length} action${filteredActions.length === 1 ? "" : "s"}.`);
    } catch (error) {
      console.error(error);
      setMessage("HSE Action Register Excel report could not be created.");
    }
  }

  async function exportRegisterPdf() {
    if (filteredActions.length === 0) {
      setMessage("No filtered actions available for PDF export.");
      return;
    }
    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;

      try {
        const logoResponse = await fetch("/enshore-primary-logo-colour.png");
        if (logoResponse.ok) {
          const logoBlob = await logoResponse.blob();
          const logoDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(String(reader.result || ""));
            reader.onerror = () => reject(new Error("Could not convert logo to data URL."));
            reader.readAsDataURL(logoBlob);
          });
          doc.addImage(logoDataUrl, "PNG", margin, 8, 44, 22);
        }
      } catch {
        // Keep report generation resilient if the logo cannot be loaded.
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(17);
      doc.setTextColor(0, 0, 0);
      doc.text("HSE Action Register", pageWidth / 2, 17, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(83, 86, 90);
      doc.text("Enshore IMS — HSE Management", pageWidth / 2, 23, { align: "center" });
      doc.text(`Generated: ${new Date().toLocaleString("en-GB")}`, pageWidth - margin, 17, { align: "right" });
      doc.text(`Actions: ${filteredActions.length}`, pageWidth - margin, 23, { align: "right" });

      const filterLines = registerFilterDescriptions();
      if (filterLines.length > 0) {
        doc.setFontSize(8);
        doc.text(doc.splitTextToSize(`Filters: ${filterLines.join(" | ")}`, pageWidth - margin * 2).slice(0, 1), pageWidth / 2, 28, { align: "center" });
      }
      doc.setDrawColor(0, 86, 112);
      doc.setLineWidth(0.7);
      doc.line(margin, 31, pageWidth - margin, 31);

      const reportRows = filteredActions.map((action) => ({
        action_number: action.action_number || "-",
        title: action.title || "-",
        source: getActionSourceLabel(action),
        linked_record: buildLinkedRecordText(action) || "-",
        owner: action.owner || "-",
        priority: action.priority || "-",
        due_date: formatDate(action.due_date),
        status: action.status || "-",
        is_overdue: isOverdue(action),
      }));

      autoTable(doc, {
        startY: 35,
        theme: "grid",
        margin: { left: margin, right: margin, bottom: 14 },
        tableWidth: "auto",
        columns: [
          { header: "Action No.", dataKey: "action_number" },
          { header: "Title", dataKey: "title" },
          { header: "Source", dataKey: "source" },
          { header: "Linked Record", dataKey: "linked_record" },
          { header: "Owner", dataKey: "owner" },
          { header: "Priority", dataKey: "priority" },
          { header: "Due Date", dataKey: "due_date" },
          { header: "Status", dataKey: "status" },
        ],
        body: reportRows,
        styles: { font: "helvetica", fontSize: 7.4, cellPadding: 1.8, lineColor: [208, 208, 206], lineWidth: 0.2, textColor: [0, 0, 0], overflow: "linebreak", valign: "top" },
        headStyles: { fillColor: [0, 86, 112], textColor: [255, 255, 255], fontStyle: "bold" },
        columnStyles: {
          action_number: { cellWidth: 22 },
          title: { cellWidth: 64 },
          source: { cellWidth: 28 },
          linked_record: { cellWidth: 50 },
          owner: { cellWidth: 30 },
          priority: { cellWidth: 20 },
          due_date: { cellWidth: 24 },
          status: { cellWidth: 24 },
        },
        didParseCell: (data) => {
          if (data.section !== "body") return;
          const row = data.row.raw as (typeof reportRows)[number];
          if (row.is_overdue && (data.column.dataKey === "due_date" || data.column.dataKey === "status")) {
            data.cell.styles.textColor = [249, 56, 34];
            data.cell.styles.fontStyle = "bold";
          }
        },
        didDrawPage: () => {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(83, 86, 90);
          doc.text("Enshore HSE Action Management", margin, pageHeight - 6);
          doc.text(`Page ${doc.getCurrentPageInfo().pageNumber} of ${doc.getNumberOfPages()}`, pageWidth - margin, pageHeight - 6, { align: "right" });
        },
      });

      doc.save(`hse-action-register-${excelDateStamp()}.pdf`);
      setMessage("HSE Action Register PDF generated successfully.");
    } catch (error) {
      console.error(error);
      setMessage("HSE Action Register PDF generation failed.");
    }
  }

  function updateSource(source: string) {
    setForm((current) => ({
      ...current,
      source,
      linked_audit_id: source === "Audit Finding" ? current.linked_audit_id : "",
      linked_audit_number: source === "Audit Finding" ? current.linked_audit_number : "",
      linked_finding_id: source === "Audit Finding" ? current.linked_finding_id : "",
      linked_finding_reference: source === "Audit Finding" ? current.linked_finding_reference : "",
      linked_asset_id: isAssetLinkedSource(source) ? current.linked_asset_id : "",
      linked_asset_code: isAssetLinkedSource(source) ? current.linked_asset_code : "",
      linked_inspection_id: "",
      linked_inspection_number: "",
      linked_maintenance_id: "",
      linked_maintenance_number: "",
      linked_calibration_id: "",
      linked_ncr_id: source === "NCR/CAPA" ? current.linked_ncr_id : "",
      linked_ncr_number: source === "NCR/CAPA" ? current.linked_ncr_number : "",
      linked_capa_id: source === "NCR/CAPA" ? current.linked_capa_id : "",
      linked_capa_number: source === "NCR/CAPA" ? current.linked_capa_number : "",
      linked_moc_id: source === "MOC" ? current.linked_moc_id : "",
      linked_moc_number: source === "MOC" ? current.linked_moc_number : "",
      linked_ainm_id: source === "AINM" ? current.linked_ainm_id : "",
      linked_ainm_number: source === "AINM" ? current.linked_ainm_number : "",
      linked_hse_inspection_id: source === "HSE Inspection" ? current.linked_hse_inspection_id : "",
      linked_hse_inspection_number: source === "HSE Inspection" ? current.linked_hse_inspection_number : "",
    }));
  }

  function applyAuditSelection(auditId: string) {
    const selected = auditOptions.find((option) => option.id === auditId);
    setForm((current) => ({
      ...current,
      linked_audit_id: selected?.id || "",
      linked_audit_number: selected?.audit_number || "",
      linked_finding_id: "",
      linked_finding_reference: "",
    }));
  }

  function applyFindingSelection(findingId: string) {
    const selected = findingOptions.find((option) => option.id === findingId);
    setForm((current) => ({
      ...current,
      linked_finding_id: selected?.id || "",
      linked_finding_reference: selected?.reference || "",
      title: current.title || (selected ? `Finding follow-up - ${selected.reference}` : current.title),
    }));
  }

  function applyNcrCapaSelection(value: string) {
    const selected = ncrCapaOptions.find((option) => `${option.type}:${option.id}` === value);
    setForm((current) => ({
      ...current,
      linked_ncr_id: selected?.type === "NCR" ? selected.id : "",
      linked_ncr_number: selected?.type === "NCR" ? selected.number : "",
      linked_capa_id: selected?.type === "CAPA" ? selected.id : "",
      linked_capa_number: selected?.type === "CAPA" ? selected.number : "",
      title: current.title || (selected ? `${selected.number} - ${selected.title || "Action"}` : current.title),
    }));
  }

  function applyMocSelection(mocId: string) {
    const selected = mocOptions.find((option) => option.id === mocId);
    setForm((current) => ({
      ...current,
      linked_moc_id: selected?.id || "",
      linked_moc_number: selected?.number || "",
      title: current.title || (selected ? `${selected.number} - ${selected.title || "MOC action"}` : current.title),
    }));
  }

  function selectAinm(ainmId: string) {
    const selected = ainmOptions.find((option) => option.id === ainmId);
    setForm((current) => ({
      ...current,
      linked_ainm_id: selected?.id || "",
      linked_ainm_number: selected?.number || "",
      project: current.project || selected?.project || "",
      title: current.title || (selected ? `${selected.number} - ${selected.title}` : ""),
      source: "AINM",
    }));
  }

  function applyHseInspectionSelection(inspectionId: string) {
    const selected = hseInspectionOptions.find((option) => option.id === inspectionId);
    setForm((current) => ({
      ...current,
      linked_hse_inspection_id: selected?.id || "",
      linked_hse_inspection_number: selected?.inspection_number || "",
      project: current.project || selected?.project_work_scope || selected?.area_zone || "",
      title: current.title || (selected ? `${selected.inspection_number} - ${selected.title || selected.form_title}` : current.title),
      source: "HSE Inspection",
    }));
  }

  function applyAssetSelection(assetId: string) {
    const selected = assetOptions.find((option) => option.id === assetId);
    setForm((current) => ({
      ...current,
      linked_asset_id: selected?.id || "",
      linked_asset_code: selected?.asset_code || "",
      linked_inspection_id: "",
      linked_inspection_number: "",
      linked_maintenance_id: "",
      linked_maintenance_number: "",
      linked_calibration_id: "",
      project: current.project || selected?.asset_code || "",
    }));
  }

  function applyInspectionSelection(inspectionId: string) {
    const selected = assetInspectionOptions.find((option) => option.id === inspectionId);
    const selectedAsset = selected ? assetOptions.find((option) => option.id === selected.asset_id) : null;
    setForm((current) => ({
      ...current,
      linked_asset_id: selected?.asset_id || current.linked_asset_id,
      linked_asset_code: selectedAsset?.asset_code || current.linked_asset_code,
      linked_inspection_id: selected?.id || "",
      linked_inspection_number: selected?.inspection_number || "",
      project: current.project || selectedAsset?.asset_code || "",
      title: current.title || (selected ? `Inspection follow-up - ${selected.inspection_number}` : current.title),
    }));
  }

  function applyMaintenanceSelection(maintenanceId: string) {
    const selected = assetMaintenanceOptions.find((option) => option.id === maintenanceId);
    const selectedAsset = selected ? assetOptions.find((option) => option.id === selected.asset_id) : null;
    setForm((current) => ({
      ...current,
      linked_asset_id: selected?.asset_id || current.linked_asset_id,
      linked_asset_code: selectedAsset?.asset_code || current.linked_asset_code,
      linked_maintenance_id: selected?.id || "",
      linked_maintenance_number: selected?.maintenance_number || "",
      project: current.project || selectedAsset?.asset_code || "",
      title: current.title || (selected ? `Maintenance follow-up - ${selected.maintenance_number}` : current.title),
    }));
  }

  function applyCalibrationSelection(calibrationId: string) {
    const selected = assetCalibrationOptions.find((option) => option.id === calibrationId);
    const selectedAsset = selected ? assetOptions.find((option) => option.id === selected.asset_id) : null;
    const label = selected?.certificate_number || selected?.reference || "calibration record";
    setForm((current) => ({
      ...current,
      linked_asset_id: selected?.asset_id || current.linked_asset_id,
      linked_asset_code: selectedAsset?.asset_code || current.linked_asset_code,
      linked_calibration_id: selected?.id || "",
      project: current.project || selectedAsset?.asset_code || "",
      title: current.title || (selected ? `Calibration follow-up - ${label}` : current.title),
    }));
  }

  const latestAction = actions[actions.length - 1];

  // Action record (workbench) values for the selected action. This page shows the record and opens Central Actions to edit it.
  const selectedEvidence = selectedAction ? evidenceRows.filter((row) => row.record_id === selectedAction.id) : [];
  const selectedLinkedTarget = selectedAction ? getLinkedTarget(selectedAction, auditOptions, findingOptions) : null;
  const selectedNextStep = selectedAction ? nextStatusStep(selectedAction.status) : null;
  const selectedGaps = selectedAction ? closingGaps(selectedEvidence.length, selectedAction.close_out_comments) : [];
  const detailSteps: WorkbenchStepDef[] = selectedAction
    ? [
        {
          key: "details",
          label: "Details",
          sub: "What, who, when",
          pct: percentDone([
            Boolean((selectedAction.title || "").trim()),
            Boolean((selectedAction.owner || "").trim()),
            Boolean(selectedAction.due_date),
            Boolean((selectedAction.description || "").trim()),
          ]),
        },
        { key: "evidence", label: "Evidence", sub: "Files for closure", state: `${selectedEvidence.length} file${selectedEvidence.length === 1 ? "" : "s"}` },
        { key: "linked", label: "Linked record", sub: "Where it came from", state: selectedLinkedTarget ? selectedLinkedTarget.number : "None" },
      ]
    : [];
  const detailNote = selectedAction
    ? [
        `${getDueSummary(selectedAction)}${selectedAction.due_date ? ` (${formatDate(selectedAction.due_date)})` : ""}.`,
        selectedLinkedTarget ? `Raised from ${selectedLinkedTarget.kind} ${selectedLinkedTarget.number}.` : "",
        "Edit this action in Central Actions.",
      ].filter(Boolean).join(" ")
    : "";

  // The header button jumps to Central Actions, where the status is changed. Closing with items missing only asks first.
  function openInCentralToProgress(action: ActionItem, target: "In Progress" | "Closed") {
    if (target === "Closed" && !confirmCloseWithGaps(closingGaps(evidenceCountMap.get(action.id) || 0, action.close_out_comments), "Open Central Actions to close it anyway?")) return;
    router.push(`/actions?actionId=${encodeURIComponent(action.id)}`);
  }

  return (
    <main>
      <QualityPageHero
        label="HSE MANAGEMENT"
        title="HSE Actions"
        description="HSE-specific action dashboard, register, and creation view backed by the central Action Management register."
        contextCards={[
          { label: "Last Refreshed", value: lastRefreshed || (loading ? "Loading" : "-") },
          { label: "Latest HSE Action", value: latestAction ? `${latestAction.action_number} - ${latestAction.title}` : "No HSE actions" },
        ]}
      />

      <div className="ims-top-meta-row" style={topMetaRowStyle}>
        <ImsBackNav />
        <div style={statusBannerStyle}><strong>Status:</strong> {message}</div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
        <nav className="ims-tabs" style={{ display: "flex", gap: 10, flexWrap: "wrap" }} role="tablist" aria-label="HSE Action views">
          {viewTabs.map((tab) => (
            <button key={tab.id} type="button" role="tab" aria-selected={activeView === tab.id} data-active={activeView === tab.id ? "true" : "false"} style={activeView === tab.id ? activeViewButtonStyle : viewButtonStyle} onClick={() => setActiveView(tab.id)}>
              {tab.label}
            </button>
          ))}
        </nav>
        <Link href="/actions?department=HSE" style={primaryLinkStyle}>Open Central Actions</Link>
      </div>

      {activeView === "dashboard" ? (
        <>
          <section className="quality-kpi-grid" style={statsGridStyle}>
            <QualityKpiCard title="HSE Actions" value={kpis.total} accent="#005670" onClick={() => openRegister("", true)} />
            <QualityKpiCard title="Open Actions" value={kpis.open} accent="#63B1BC" onClick={() => openRegister("Open")} />
            <QualityKpiCard title="Overdue Actions" value={kpis.overdue} accent="#F93822" onClick={() => { setPressureFilter("overdue"); setActiveView("register"); }} />
            <QualityKpiCard title="Due This Week" value={kpis.dueWeek} accent="#FFAD00" onClick={() => { setPressureFilter("dueWeek"); setActiveView("register"); }} />
            <QualityKpiCard title="High Priority Open" value={kpis.high} accent="#53565A" onClick={() => { setPriorityFilter("High"); setActiveView("register"); }} />
            <QualityKpiCard title="Completed Actions" value={kpis.closed} accent="#005670" onClick={() => openRegister("Closed")} />
          </section>

          <section style={dashboardGridStyle}>
            <SectionCard title="Open Actions by Person" subtitle="Who is carrying the current HSE action load.">
              <BarList rows={ownerRows} total={Math.max(1, kpis.open)} accent="#63B1BC" onClick={(owner) => { setOwnerFilter(owner === "Unassigned" ? "" : owner); setActiveView("register"); }} />
            </SectionCard>
            <SectionCard title="HSE Action Status" subtitle="Open, in progress, and closed position.">
              <BarList rows={statusRows} total={Math.max(1, actions.length)} accent="#005670" onClick={(status) => openRegister(status)} />
            </SectionCard>
            <SectionCard title="Source Split" subtitle="Where HSE actions are being generated from.">
              <BarList rows={sourceRows} total={Math.max(1, actions.length)} accent="#53565A" />
            </SectionCard>
            <SectionCard title="Manager Focus" subtitle="Immediate HSE action pressure requiring management attention.">
              <div style={focusGridStyle}>
                <MiniFocus label="Overdue" value={kpis.overdue} tone="red" onClick={() => { setPressureFilter("overdue"); setActiveView("register"); }} />
                <MiniFocus label="Due this week" value={kpis.dueWeek} tone="amber" onClick={() => { setPressureFilter("dueWeek"); setActiveView("register"); }} />
                <MiniFocus label="High priority" value={kpis.high} tone="purple" onClick={() => { setPriorityFilter("High"); setActiveView("register"); }} />
              </div>
            </SectionCard>
          </section>
        </>
      ) : null}

      {activeView === "register" ? (
        <SectionCard title="HSE Action Register" subtitle="Central Action Management records filtered to department HSE.">
          <div className="ims-filter-panel" style={filterShellStyle}>
            <div style={registerToolbarStyle}>
              <input style={{ ...inputStyle, flex: "1 1 260px", minWidth: 0 }} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search action no. / title / project / owner" />
              <button
                type="button"
                onClick={() => {
                  if (closedHidden) {
                    setShowClosed(true);
                    return;
                  }
                  // Hiding closed actions also drops a status filter that was holding them in view.
                  setShowClosed(false);
                  setStatusFilter("");
                }}
                title={closedHidden ? "Closed actions are hidden. Press to include them." : "Closed actions are included. Press to show open actions only."}
                style={closedHidden ? primaryButtonStyle : secondaryButtonStyle}
              >
                {closedHidden ? "Show Closed" : "Hide Closed"}
              </button>
              <button type="button" style={secondaryButtonStyle} onClick={clearFilters}>Clear Filters</button>
              <button type="button" style={primaryButtonStyle} disabled={filteredActions.length === 0} title="Create a PDF of the actions currently shown" onClick={() => void exportRegisterPdf()}>Export PDF</button>
              <button type="button" style={secondaryButtonStyle} disabled={filteredActions.length === 0} title="Download an Excel workbook of the actions currently shown" onClick={() => void exportRegisterExcel()}>Export Excel</button>
              <button type="button" style={showRegisterFilters ? secondaryButtonStyle : primaryButtonStyle} onClick={() => setShowRegisterFilters((current) => !current)}>
                {showRegisterFilters ? "Hide Filters" : "Show Filters"}
              </button>
            </div>

            {showRegisterFilters ? (
              <div className="ims-filter-panel" style={toolbarStyle}>
                <select style={inputStyle} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="">All Status</option>
                  {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
                <select style={inputStyle} value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
                  <option value="">All Priorities</option>
                  {priorityOptions.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                </select>
                <select style={inputStyle} value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
                  <option value="">All Owners</option>
                  {ownerOptions.map((owner) => <option key={owner} value={owner}>{owner}</option>)}
                </select>
                <select style={inputStyle} value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
                  <option value="">All Sources</option>
                  {sourceFilterOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
            ) : null}
          </div>

          <div style={tableInfoStyle}>
            <span>
              Showing <strong>{filteredActions.length}</strong> of <strong>{actions.length}</strong> HSE actions
              {closedHidden ? <> showing <strong>open/non-closed</strong></> : null}
              {pressureFilter === "overdue" ? <> with quick filter <strong>Overdue</strong></> : null}
              {pressureFilter === "dueWeek" ? <> with quick filter <strong>Due This Week</strong></> : null}
            </span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, ...colActionNoStyle }}>Action No.</th>
                  <th style={{ ...thStyle, ...colTitleStyle }}>Title</th>
                  <th style={{ ...thStyle, ...colOwnerStyle }}>Owner</th>
                  <th style={{ ...thStyle, ...colSourceStyle }}>Source</th>
                  <th style={{ ...thStyle, ...colDueDateStyle }}>Due Date</th>
                  <th style={{ ...thStyle, ...colPriorityStyle }}>Priority</th>
                  <th style={{ ...thStyle, ...colStatusStyle }}>Status</th>
                  <th style={{ ...thStyle, ...colActionStyle }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredActions.length ? filteredActions.map((action) => {
                  const projectSummary = `${action.project || "No project"}${action.linked_ainm_number ? ` | AINM ${action.linked_ainm_number}` : ""}${action.linked_hse_inspection_number ? ` | HSE Inspection ${action.linked_hse_inspection_number}` : ""}${action.linked_observation_number ? ` | Observation ${action.linked_observation_number}` : ""}`;
                  return (
                  <tr key={action.id} aria-selected={selectedId === action.id} data-selected={selectedId === action.id ? "true" : "false"} style={selectedId === action.id ? selectedRowStyle : trStyle} onClick={() => setSelectedId(action.id)}>
                    <td style={{ ...tdStrongStyle, ...colActionNoStyle }}>{action.action_number || "-"}</td>
                    <td style={{ ...tdStyle, ...colTitleStyle }}>
                      <strong style={{ ...truncatedTextStyle, display: "block" }} title={action.title || "-"}>{action.title || "-"}</strong>
                      <div style={{ ...mutedTextStyle, ...truncatedTextStyle }} title={projectSummary}>{projectSummary}</div>
                    </td>
                    <td style={{ ...tdStyle, ...colOwnerStyle, ...truncatedTextStyle }} title={action.owner || "-"}>{action.owner || "-"}</td>
                    <td style={{ ...tdStyle, ...colSourceStyle, ...truncatedTextStyle }} title={getActionSourceLabel(action)}>{getActionSourceLabel(action)}</td>
                    <td style={{ ...tdStyle, ...colDueDateStyle }}>
                      <strong>{formatDate(action.due_date)}</strong>
                      <div style={{ ...mutedTextStyle, color: isOverdue(action) ? "#F93822" : "#53565A" }}>{getDueLabel(action.due_date)}</div>
                    </td>
                    <td style={{ ...tdStyle, ...colPriorityStyle }}>{action.priority || "-"}</td>
                    <td style={{ ...tdStyle, ...colStatusStyle }}><StatusPill label={action.status || "Open"} tone={toneForStatus(action.status || "Open")} /></td>
                    <td style={{ ...tdStyle, ...colActionStyle }}><Link href={`/actions?actionId=${encodeURIComponent(action.id)}`} style={smallLinkStyle}>Open Central</Link></td>
                  </tr>
                  );
                }) : (
                  <tr><td colSpan={8} style={emptyCellStyle}>No HSE actions match the current filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>

        </SectionCard>
      ) : null}

      {activeView === "register" && selectedAction ? (
        <SectionCard title={`Action Detail — ${selectedAction.action_number || "Action"}`} subtitle="Review the action record. Editing and evidence upload happen in Central Actions.">
          <RecordWorkbench
            key={selectedAction.id}
            gate="closing"
            reportLabel="Summary"
            initialStep="details"
            steps={detailSteps}
            missing={selectedNextStep ? selectedGaps : undefined}
            header={
              <RecordHeader
                id={selectedAction.action_number || "-"}
                title={selectedAction.title || "Untitled Action"}
                status={{ label: selectedAction.status || "Unknown", tone: toneForStatus(selectedAction.status) }}
                track={{ steps: ["Open", "In Progress", "Closed"], current: isClosedLikeStatus(selectedAction.status) ? "Closed" : selectedAction.status || "" }}
                note={detailNote}
                actions={
                  <>
                    <span style={priorityTextStyle}>{selectedAction.priority ? `${selectedAction.priority} priority` : "No priority"}</span>
                    {selectedNextStep ? (
                      <ImsButton
                        onClick={() => openInCentralToProgress(selectedAction, selectedNextStep)}
                        disabled={!canEditAction}
                        title={canEditAction ? "Opens this action in Central Actions, where the status is changed" : "You do not have permission to edit actions"}
                      >
                        {selectedNextStep === "In Progress" ? "Start in Central Actions" : "Close in Central Actions"}
                      </ImsButton>
                    ) : null}
                    <ImsLinkButton href={`/actions?actionId=${encodeURIComponent(selectedAction.id)}`} variant="secondary">Open / Edit in Central Actions</ImsLinkButton>
                    <ImsButton variant="secondary" onClick={() => setSelectedId("")}>Hide Panel</ImsButton>
                  </>
                }
              />
            }
            side={
              <aside className="ims-doc" aria-label="Linked record">
                <div className="ims-doc__title">Linked record</div>
                <div className="ims-doc__row"><span className="ims-doc__label">Source</span><span>{getActionSourceLabel(selectedAction)}</span></div>
                <div className="ims-doc__row"><span className="ims-doc__label">Record</span><span>{selectedLinkedTarget ? selectedLinkedTarget.number : "None stored"}</span></div>
                <div className="ims-doc__row"><span className="ims-doc__label">Due</span><span>{getDueSummary(selectedAction)}</span></div>
                <div className="ims-doc__row"><span className="ims-doc__label">Owner</span><span>{selectedAction.owner || "Unassigned"}</span></div>
                <div className="ims-doc__row"><span className="ims-doc__label">Created</span><span>{formatDateTime(selectedAction.created_at)}</span></div>
                <div className="ims-doc__row"><span className="ims-doc__label">Updated</span><span>{formatDateTime(selectedAction.updated_at)}</span></div>
                {selectedLinkedTarget?.href ? (
                  <ImsLinkButton href={selectedLinkedTarget.href} variant="secondary">Open {selectedLinkedTarget.kind} {selectedLinkedTarget.number}</ImsLinkButton>
                ) : !selectedLinkedTarget && getActionSourceValue(selectedAction) !== "Manual" && getActionSourceValue(selectedAction) !== "Other" ? (
                  <div style={linkedWarningStyle}>No linked record is stored on this action.</div>
                ) : null}
              </aside>
            }
          >
            <WorkbenchStep stepKey="details">
              <div style={formGridStyle}>
                <Field label="Action Number"><input style={readOnlyInputStyle} value={selectedAction.action_number || ""} readOnly /></Field>
                <Field label="Title"><input style={readOnlyInputStyle} value={selectedAction.title || ""} readOnly /></Field>
                <Field label="Owner"><input style={readOnlyInputStyle} value={selectedAction.owner || ""} readOnly /></Field>
                <Field label="Project"><input style={readOnlyInputStyle} value={selectedAction.project || ""} readOnly /></Field>
                <Field label="Priority"><input style={readOnlyInputStyle} value={selectedAction.priority || ""} readOnly /></Field>
                <Field label="Status"><input style={readOnlyInputStyle} value={selectedAction.status || ""} readOnly /></Field>
                <Field label="Due Date"><input style={readOnlyInputStyle} value={selectedAction.due_date ? formatDate(selectedAction.due_date) : ""} readOnly /></Field>
                <Field label="Close-out Comments"><textarea style={{ ...readOnlyInputStyle, minHeight: 80, resize: "vertical" }} value={selectedAction.close_out_comments || ""} readOnly /></Field>
                <div style={{ gridColumn: "1 / -1" }}>
                  <Field label="Description"><textarea style={{ ...readOnlyInputStyle, minHeight: 96, resize: "vertical" }} value={selectedAction.description || ""} readOnly /></Field>
                </div>
              </div>
            </WorkbenchStep>

            <WorkbenchStep stepKey="evidence">
              <div style={{ display: "grid", gap: 10 }}>
                <p style={emptyTextStyle}>
                  {selectedEvidence.length
                    ? `${selectedEvidence.length} evidence file${selectedEvidence.length === 1 ? "" : "s"} attached to ${selectedAction.action_number || "this action"}.`
                    : `No evidence is attached to ${selectedAction.action_number || "this action"} yet.`}
                </p>
                {selectedEvidence.map((file) => <div key={file.id} style={evidenceRowStyle}>{file.file_name || "Evidence file"}</div>)}
                <p style={emptyTextStyle}>Upload and open evidence files in Central Actions.</p>
              </div>
            </WorkbenchStep>

            <WorkbenchStep stepKey="linked">
              <div style={formGridStyle}>
                <Field label="Source"><input style={readOnlyInputStyle} value={getActionSourceLabel(selectedAction)} readOnly /></Field>
                <Field label="Linked Record"><input style={readOnlyInputStyle} value={selectedLinkedTarget ? `${selectedLinkedTarget.kind} ${selectedLinkedTarget.number}` : ""} placeholder="None stored" readOnly /></Field>
                <Field label="Asset"><input style={readOnlyInputStyle} value={selectedAction.linked_asset_code || ""} readOnly /></Field>
                <Field label="Department"><input style={readOnlyInputStyle} value={selectedAction.department || ""} readOnly /></Field>
              </div>
            </WorkbenchStep>
          </RecordWorkbench>
        </SectionCard>
      ) : null}

      {activeView === "create" ? (
        <SectionCard title="Create HSE Action" subtitle="Creates a central Action Management record with department HSE.">
          <div style={importToggleRowStyle}>
            <button type="button" style={showImportPanel ? secondaryButtonStyle : primaryButtonStyle} onClick={() => setShowImportPanel((current) => !current)}>
              {showImportPanel ? "Hide Bulk Upload" : "Bulk Upload HSE / Quality Actions"}
            </button>
            <span style={emptyTextStyle}>Upload an Excel action tracker and preview rows before creating central Action Management records.</span>
          </div>

          {showImportPanel ? (
            <div style={importPanelStyle}>
              <div style={importControlRowStyle}>
                <input type="file" accept=".xlsx" onChange={(event) => void handleImportFileChange(event)} style={fileInputStyle} disabled={!canCreateAction} />
                <button type="button" style={primaryButtonStyle} disabled={!importableRows.length || isImportingActions || !canCreateAction} onClick={() => void importPreviewedActions()}>
                  {isImportingActions ? "Importing..." : `Import ${importableRows.length} Actions`}
                </button>
                <button
                  type="button"
                  style={secondaryButtonStyle}
                  onClick={() => {
                    setImportRows([]);
                    setImportFileName("");
                  }}
                >
                  Clear Preview
                </button>
              </div>

              {importRows.length ? (
                <>
                  <div style={tableInfoStyle}>
                    Previewing {importRows.length} row{importRows.length === 1 ? "" : "s"} from {importFileName || "selected workbook"}.
                    {" "}
                    <strong>{importableRows.length}</strong> ready, <strong>{skippedImportRows.length}</strong> requiring attention/skipped.
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={importTableStyle}>
                      <thead>
                        <tr>
                          <th style={thStyle}>Row</th>
                          <th style={thStyle}>Title</th>
                          <th style={thStyle}>Owner</th>
                          <th style={thStyle}>Department</th>
                          <th style={thStyle}>Project</th>
                          <th style={thStyle}>Source</th>
                          <th style={thStyle}>Due Date</th>
                          <th style={thStyle}>Status</th>
                          <th style={thStyle}>Import Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importRows.slice(0, 60).map((row) => {
                          const issues = [...row.errors, ...row.skipReasons];
                          return (
                            <tr key={`${row.rowNumber}-${row.title}`} style={issues.length ? importWarningRowStyle : trStyle}>
                              <td style={tdStrongStyle}>{row.rowNumber}</td>
                              <td style={tdStyle}>{row.title || "-"}</td>
                              <td style={tdStyle}>
                                {row.owner || "-"}
                                {row.personWillBeCreated && !issues.length ? <div style={mutedTextStyle}>Will add to People Management</div> : null}
                              </td>
                              <td style={tdStyle}>{row.department || "HSE"}</td>
                              <td style={tdStyle}>{row.project || "-"}</td>
                              <td style={tdStyle}>{row.source || "HSE"}</td>
                              <td style={tdStyle}>{row.due_date ? formatDate(row.due_date) : "-"}</td>
                              <td style={tdStyle}>{row.status}</td>
                              <td style={tdStyle}>{issues.length ? issues.join(" ") : "Ready"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {importRows.length > 60 ? <p style={emptyTextStyle}>Showing first 60 preview rows only. All valid rows will import.</p> : null}
                </>
              ) : (
                <div style={emptyBoxStyle}>Choose an Excel workbook to preview HSE/Quality action rows before import.</div>
              )}
            </div>
          ) : null}

          <form onSubmit={createAction}>
            <div style={formGridStyle}>
              <Field label="Action Number"><input style={readOnlyInputStyle} value="Auto generated" readOnly /></Field>
              <Field label="Project"><input style={inputStyle} value={form.project} onChange={(event) => setForm({ ...form, project: event.target.value })} /></Field>
              <Field label="Title"><input style={inputStyle} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
              <Field label="Owner">
                <select style={inputStyle} value={form.owner} onChange={(event) => setForm({ ...form, owner: event.target.value })}>
                  <option value="">Select owner</option>
                  {ownerOptions.map((owner) => <option key={owner} value={owner}>{owner}</option>)}
                </select>
              </Field>
              <Field label="Priority">
                <select style={inputStyle} value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
                  {priorityOptions.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select style={inputStyle} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                  {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </Field>
              <Field label="Source">
                <select style={inputStyle} value={form.source} onChange={(event) => updateSource(event.target.value)}>
                  {sourceOptions.map((source) => <option key={source} value={source}>{source}</option>)}
                </select>
              </Field>
              <Field label="Due Date"><input type="date" style={inputStyle} value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} /></Field>
              {form.source === "Audit Finding" ? (
                <>
                  <Field label="Audit Number">
                    <select style={inputStyle} value={form.linked_audit_id} onChange={(event) => applyAuditSelection(event.target.value)}>
                      <option value="">Select audit</option>
                      {auditOptions.map((audit) => (
                        <option key={audit.id} value={audit.id}>{audit.audit_number} - {audit.title || "Untitled"}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Finding Reference">
                    <select style={inputStyle} value={form.linked_finding_id} onChange={(event) => applyFindingSelection(event.target.value)} disabled={!form.linked_audit_id}>
                      <option value="">{form.linked_audit_id ? "Select finding" : "Select audit first"}</option>
                      {createFindingOptions.map((finding) => (
                        <option key={finding.id} value={finding.id}>{finding.reference}</option>
                      ))}
                    </select>
                  </Field>
                </>
              ) : null}
              {form.source === "NCR/CAPA" ? (
                <Field label="NCR / CAPA Record">
                  <select
                    style={inputStyle}
                    value={form.linked_ncr_id ? `NCR:${form.linked_ncr_id}` : form.linked_capa_id ? `CAPA:${form.linked_capa_id}` : ""}
                    onChange={(event) => applyNcrCapaSelection(event.target.value)}
                  >
                    <option value="">Select NCR or CAPA</option>
                    {ncrCapaOptions.map((option) => (
                      <option key={`${option.type}:${option.id}`} value={`${option.type}:${option.id}`}>
                        {option.type} {option.number} - {option.title || "Untitled"}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              {form.source === "MOC" ? (
                <Field label="MOC Record">
                  <select style={inputStyle} value={form.linked_moc_id} onChange={(event) => applyMocSelection(event.target.value)}>
                    <option value="">Select MOC</option>
                    {mocOptions.map((option) => (
                      <option key={option.id} value={option.id}>{option.number} - {option.title || "Untitled"}</option>
                    ))}
                  </select>
                </Field>
              ) : null}
              {form.source === "AINM" ? (
                <Field label="AINM Record">
                  <select style={inputStyle} value={form.linked_ainm_id} onChange={(event) => selectAinm(event.target.value)}>
                    <option value="">Select AINM</option>
                    {ainmOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.number} - {option.title || "Untitled"}{option.project ? ` (${option.project})` : ""}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              {form.source === "HSE Inspection" ? (
                <Field label="HSE Inspection Record">
                  <select style={inputStyle} value={form.linked_hse_inspection_id} onChange={(event) => applyHseInspectionSelection(event.target.value)}>
                    <option value="">Select HSE inspection</option>
                    {hseInspectionOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.inspection_number} - {option.title || option.form_title}{option.inspection_date ? ` (${formatDate(option.inspection_date)})` : ""}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              {isAssetLinkedSource(form.source) ? (
                <>
                  <Field label="Linked Asset">
                    <select style={inputStyle} value={form.linked_asset_id} onChange={(event) => applyAssetSelection(event.target.value)}>
                      <option value="">Select asset</option>
                      {assetOptions.map((asset) => (
                        <option key={asset.id} value={asset.id}>{asset.asset_code} - {asset.name || "Unnamed asset"}</option>
                      ))}
                    </select>
                  </Field>
                  {form.source === "Asset Inspection" ? (
                    <Field label="Inspection Record">
                      <select style={inputStyle} value={form.linked_inspection_id} onChange={(event) => applyInspectionSelection(event.target.value)}>
                        <option value="">Select inspection</option>
                        {createInspectionOptions.map((record) => {
                          const asset = assetOptions.find((option) => option.id === record.asset_id);
                          return <option key={record.id} value={record.id}>{record.inspection_number} - {asset?.asset_code || "Asset"}{record.inspection_date ? ` (${formatDate(record.inspection_date)})` : ""}</option>;
                        })}
                      </select>
                    </Field>
                  ) : null}
                  {form.source === "Asset Maintenance" ? (
                    <Field label="Maintenance Record">
                      <select style={inputStyle} value={form.linked_maintenance_id} onChange={(event) => applyMaintenanceSelection(event.target.value)}>
                        <option value="">Select maintenance</option>
                        {createMaintenanceOptions.map((record) => {
                          const asset = assetOptions.find((option) => option.id === record.asset_id);
                          return <option key={record.id} value={record.id}>{record.maintenance_number} - {asset?.asset_code || "Asset"}{record.maintenance_date ? ` (${formatDate(record.maintenance_date)})` : ""}</option>;
                        })}
                      </select>
                    </Field>
                  ) : null}
                  {form.source === "Asset Calibration" ? (
                    <Field label="Calibration Record">
                      <select style={inputStyle} value={form.linked_calibration_id} onChange={(event) => applyCalibrationSelection(event.target.value)}>
                        <option value="">Select calibration</option>
                        {createCalibrationOptions.map((record) => {
                          const asset = assetOptions.find((option) => option.id === record.asset_id);
                          const label = record.certificate_number || record.reference || "Calibration record";
                          return <option key={record.id} value={record.id}>{label} - {asset?.asset_code || "Asset"}{record.calibration_date ? ` (${formatDate(record.calibration_date)})` : ""}</option>;
                        })}
                      </select>
                    </Field>
                  ) : null}
                </>
              ) : null}
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Description"><textarea style={textareaStyle} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
              </div>
            </div>
            <div style={buttonRowStyle}>
              <button type="submit" style={primaryButtonStyle} disabled={saving || !canCreateAction}>{saving ? "Creating..." : "Create HSE Action"}</button>
              <span style={emptyTextStyle}>This will appear in the central Action Management register automatically.</span>
            </div>
          </form>
        </SectionCard>
      ) : null}
    </main>
  );
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return <section style={panelStyle}><div style={sectionHeaderStyle}><h2 style={sectionTitleStyle}>{title}</h2>{subtitle ? <p style={sectionSubtitleStyle}>{subtitle}</p> : null}</div>{children}</section>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label style={fieldStyle}><span style={labelStyle}>{label}</span>{children}</label>;
}

function BarList({ rows, total, accent, onClick }: { rows: { label: string; value: number }[]; total: number; accent: string; onClick?: (label: string) => void }) {
  if (!rows.length) return <div style={emptyBoxStyle}>No data available yet.</div>;
  return <div style={barListStyle}>{rows.map((row) => <button key={row.label} type="button" style={barRowStyle} onClick={() => onClick?.(row.label)}><span style={barLabelStyle}><strong>{row.label}</strong><span>{row.value}</span></span><span style={barTrackStyle}><span style={{ ...barFillStyle, background: accent, width: `${Math.max(4, Math.round((row.value / total) * 100))}%` }} /></span></button>)}</div>;
}

function MiniFocus({ label, value, tone, onClick }: { label: string; value: number; tone: "red" | "amber" | "purple"; onClick?: () => void }) {
  const colours = { red: "#F93822", amber: "#FFAD00", purple: "#53565A" };
  return <button type="button" style={{ ...miniFocusStyle, borderTop: `4px solid ${colours[tone]}` }} onClick={onClick}><span>{label}</span><strong>{value}</strong></button>;
}

const topMetaRowStyle: CSSProperties = {
  marginBottom: 20,
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "center",
  background: "rgba(255,255,255,0.92)",
  border: "1px solid #D0D0CE",
  borderRadius: "16px",
  padding: "12px 14px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
};
const topMetaActionsStyle: CSSProperties = { display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" };
const statusBannerStyle: CSSProperties = { background: "white", borderRadius: "12px", padding: "12px 16px", boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)", color: "#000000" };
const primaryLinkStyle: CSSProperties = { background: "#005670", color: "white", border: "none", padding: "11px 16px", borderRadius: "10px", cursor: "pointer", fontWeight: 800, textDecoration: "none", display: "inline-flex", alignItems: "center" };
const smallLinkStyle: CSSProperties = { ...primaryLinkStyle, padding: "8px 10px", fontSize: 12 };
const viewButtonStyle: CSSProperties = { background: "#ECECE7", color: "#000000", border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 800, cursor: "pointer", minHeight: "44px", display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1.2, boxSizing: "border-box" };
const activeViewButtonStyle: CSSProperties = { ...viewButtonStyle, background: "#005670", color: "white" };
// One row of six tiles, like the main Actions page. The global phone rules put these two across on a phone.
const statsGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: "12px", marginBottom: "20px" };
const dashboardGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "20px" };
const panelStyle: CSSProperties = { background: "white", borderRadius: "18px", padding: "20px", boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)", marginBottom: 20 };
const sectionHeaderStyle: CSSProperties = { background: "#005670", borderRadius: 10, padding: "12px 14px", marginBottom: 16 };
const sectionTitleStyle: CSSProperties = { margin: 0, fontSize: "18px", color: "white" };
const sectionSubtitleStyle: CSSProperties = { color: "rgba(255,255,255,0.82)", margin: "4px 0 0", lineHeight: 1.45, fontSize: 13 };
const emptyTextStyle: CSSProperties = { color: "#53565A", margin: 0, lineHeight: 1.55, fontSize: 13 };
const toolbarStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
  alignItems: "end",
  marginBottom: "14px",
  padding: "12px",
  border: "1px solid #D0D0CE",
  borderRadius: "16px",
  background: "rgba(248,250,252,0.92)",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
};
const importToggleRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
  marginBottom: "14px",
};
const importPanelStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
  padding: "14px",
  border: "1px solid #D0D0CE",
  borderRadius: "16px",
  background: "rgba(248,250,252,0.92)",
  marginBottom: "18px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
};
const importControlRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(220px, 1fr) auto auto",
  gap: "10px",
  alignItems: "center",
};
const fileInputStyle: CSSProperties = {
  width: "100%",
  minHeight: 42,
  border: "1px solid #D0D0CE",
  borderRadius: 10,
  padding: "9px 12px",
  fontSize: 14,
  boxSizing: "border-box",
  color: "#000000",
  background: "white",
};
const importTableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  background: "#ffffff",
  minWidth: 1040,
  fontSize: "13px",
};
const importWarningRowStyle: CSSProperties = {
  background: "#ECECE7",
};
const inputStyle: CSSProperties = { width: "100%", minHeight: 42, border: "1px solid #D0D0CE", borderRadius: 10, padding: "10px 12px", fontSize: 14, boxSizing: "border-box", color: "#000000", background: "white" };
const readOnlyInputStyle: CSSProperties = { ...inputStyle, background: "#ECECE7", color: "#53565A" };
const textareaStyle: CSSProperties = { ...inputStyle, minHeight: 110, resize: "vertical", lineHeight: 1.45 };
const secondaryButtonStyle: CSSProperties = { border: "1px solid #D0D0CE", background: "#D0D0CE", color: "#000000", borderRadius: 10, padding: "10px 13px", fontWeight: 800, cursor: "pointer" };
const primaryButtonStyle: CSSProperties = { border: "none", background: "#005670", color: "white", borderRadius: 10, padding: "11px 14px", fontWeight: 900, cursor: "pointer" };
const tableInfoStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: "4px",
  flexWrap: "wrap",
  color: "#53565A",
  fontSize: "13px",
  fontWeight: 700,
  margin: "12px 0",
};
const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  background: "#ffffff",
  minWidth: 0,
  tableLayout: "fixed",
  fontSize: "13px",
};

const colActionNoStyle: CSSProperties = { width: "9%" };
const colTitleStyle: CSSProperties = { width: "30%" };
const colOwnerStyle: CSSProperties = { width: "13%" };
const colSourceStyle: CSSProperties = { width: "9%" };
const colDueDateStyle: CSSProperties = { width: "12%" };
const colPriorityStyle: CSSProperties = { width: "7%" };
const colStatusStyle: CSSProperties = { width: "9%" };
const colActionStyle: CSSProperties = { width: "11%" };

const truncatedTextStyle: CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "13px 14px",
  background: "#ECECE7",
  color: "#53565A",
  fontSize: "12px",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  borderBottom: "1px solid #D0D0CE",
  whiteSpace: "nowrap",
};
const tdStyle: CSSProperties = {
  padding: "13px 14px",
  borderBottom: "1px solid #ECECE7",
  color: "#000000",
  verticalAlign: "middle",
  fontSize: "13px",
  lineHeight: 1.45,
};
const tdStrongStyle: CSSProperties = { ...tdStyle, fontWeight: 900, color: "#005670" };
const trStyle: CSSProperties = { cursor: "pointer" };
const selectedRowStyle: CSSProperties = { cursor: "pointer", background: "#ECECE7" };
const mutedTextStyle: CSSProperties = { color: "#53565A", fontSize: 12, marginTop: 4 };
const emptyCellStyle: CSSProperties = {
  padding: "26px 14px",
  textAlign: "center",
  color: "#53565A",
  background: "#ECECE7",
  borderBottom: "1px dashed #D0D0CE",
};
const filterShellStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
  padding: "12px",
  border: "1px solid #D0D0CE",
  borderRadius: "16px",
  background: "rgba(248,250,252,0.92)",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
};
const registerToolbarStyle: CSSProperties = { display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" };
const priorityTextStyle: CSSProperties = { color: "#53565A", fontSize: 13, fontWeight: 800 };
const linkedWarningStyle: CSSProperties = { border: "1px solid #FFAD00", borderRadius: 10, padding: "10px 12px", color: "#000000", fontSize: 13 };
const evidenceRowStyle: CSSProperties = { border: "1px solid #D0D0CE", borderRadius: 10, padding: "10px 12px", background: "white", color: "#000000", fontSize: 13 };
const formGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 };
const fieldStyle: CSSProperties = { display: "grid", gap: 6 };
const labelStyle: CSSProperties = { color: "#53565A", fontSize: 12, fontWeight: 900 };
const buttonRowStyle: CSSProperties = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 14 };
const barListStyle: CSSProperties = { display: "grid", gap: 12 };
const barRowStyle: CSSProperties = { display: "grid", gap: 7, border: "none", background: "transparent", padding: 0, textAlign: "left", cursor: "pointer" };
const barLabelStyle: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, color: "#000000", fontSize: 13 };
const barTrackStyle: CSSProperties = { height: 12, background: "#D0D0CE", borderRadius: 999, overflow: "hidden" };
const barFillStyle: CSSProperties = { display: "block", height: "100%", borderRadius: 999 };
const emptyBoxStyle: CSSProperties = { border: "1px dashed #D0D0CE", borderRadius: 12, padding: 16, color: "#53565A", background: "white" };
const focusGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 };
const miniFocusStyle: CSSProperties = { border: "1px solid #D0D0CE", borderRadius: 12, padding: 14, display: "grid", gap: 8, color: "#000000", background: "white", textAlign: "left", cursor: "pointer" };


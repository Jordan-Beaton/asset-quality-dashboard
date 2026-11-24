"use client";

import { ImsBackNav } from "../../../src/components/ImsBackNav";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ImsButton, ImsLinkButton } from "../../../src/components/ImsPrimitives";
import { QualityKpiCard } from "../../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../../src/components/QualityPageHero";
import { useImsPermissions } from "../../../src/components/ImsPermissions";
import { RecordHeader, RecordWorkbench, StatusPill, WorkbenchStep, toneForStatus } from "../../../src/components/RecordWorkbench";
import type { WorkbenchStepDef } from "../../../src/components/RecordWorkbench";
import { auditRecordHref, getActionSourceValue, isAuditLinkedSource, resolveActionAudit } from "../../../src/lib/actionAuditLink";
import type { AuditLookup } from "../../../src/lib/actionAuditLink";
import { downloadRegisterExcel, excelDateStamp } from "../../../src/lib/registerExcel";
import { supabase } from "../../../src/lib/supabase";
import { useUrlFlag, useUrlState } from "../../../src/lib/useUrlState";

export const dynamic = "force-dynamic";

type QualityActionView = "dashboard" | "register" | "create";

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
  linked_hse_inspection_number?: string | null;
  linked_observation_number?: string | null;
  close_out_comments?: string | null;
  raised_by_email?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type PersonOption = {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  department: string | null;
};

type EvidenceRow = { id: string; record_id: string; file_name: string | null };

type LinkedRecordChip = {
  label: string;
  /** When set, the chip opens that record. */
  href?: string;
  tone: "teal" | "blue" | "purple" | "amber" | "red" | "slate";
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
};

const viewTabs: Array<{ id: QualityActionView; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "register", label: "Action Register" },
  { id: "create", label: "Create Action" },
];

const priorityOptions = ["Low", "Medium", "High"];
const statusOptions = ["Open", "In Progress", "Closed"];
const sourceOptions = [
  "Manual",
  "Audit",
  "Audit Finding",
  "Asset Inspection",
  "Asset Maintenance",
  "Asset Calibration",
  "NCR/CAPA",
  "MOC",
  "AINM",
  "Risk",
  "HSE",
  "Other",
];

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

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function getActionSourceLabel(action: ActionItem) {
  const source = getActionSourceValue(action);
  if (source === "NCR/CAPA") return "NCR / CAPA";
  return source;
}

function getSourceChipTone(source: string): LinkedRecordChip["tone"] {
  if (isAuditLinkedSource(source)) return "blue";
  if (isAssetLinkedSource(source)) return "teal";
  if (source === "NCR/CAPA") return "red";
  if (source === "MOC") return "purple";
  if (source === "AINM") return "red";
  if (source === "HSE Inspection") return "teal";
  if (source === "Observation") return "teal";
  if (source === "Risk") return "amber";
  if (source === "HSE") return "teal";
  return "slate";
}

function sourceImpliesLinkedRecord(source: string | null | undefined) {
  return (
    source === "Audit Finding" ||
    source === "Audit" ||
    source === "Asset Inspection" ||
    source === "Asset Maintenance" ||
    source === "Asset Calibration" ||
    source === "NCR/CAPA" ||
    source === "MOC" ||
    source === "AINM" ||
    source === "HSE Inspection" ||
    source === "Observation" ||
    source === "Risk" ||
    source === "HSE"
  );
}

function buildLinkedRecordChips(action: ActionItem, lookup?: AuditLookup): LinkedRecordChip[] {
  const chips: LinkedRecordChip[] = [];
  const source = getActionSourceValue(action);

  if (isAuditLinkedSource(source)) {
    const audit = resolveActionAudit(action, lookup);
    if (audit?.number) {
      chips.push({ label: `Audit ${audit.number}`, tone: "blue", href: auditRecordHref(audit) || undefined });
    } else if (audit?.id) {
      chips.push({ label: "Audit linked", tone: "blue", href: auditRecordHref(audit) || undefined });
    }
  } else if (action.linked_audit_number) {
    chips.push({ label: `Audit ${action.linked_audit_number}`, tone: "blue" });
  }
  if (action.linked_finding_reference) chips.push({ label: `Finding ${action.linked_finding_reference}`, tone: "blue" });
  if (action.linked_asset_code) chips.push({ label: `Asset ${action.linked_asset_code}`, tone: "teal" });
  if (action.linked_inspection_number) chips.push({ label: `Inspection ${action.linked_inspection_number}`, tone: "teal" });
  if (action.linked_maintenance_number) chips.push({ label: `Maintenance ${action.linked_maintenance_number}`, tone: "teal" });
  if (action.linked_calibration_id) chips.push({ label: "Calibration linked", tone: "teal" });
  if (action.linked_ncr_number) chips.push({ label: `NCR ${action.linked_ncr_number}`, tone: "red" });
  if (action.linked_capa_number) chips.push({ label: `CAPA ${action.linked_capa_number}`, tone: "red" });
  if (action.linked_moc_number) chips.push({ label: `MOC ${action.linked_moc_number}`, tone: "purple" });
  if (action.linked_ainm_number) chips.push({ label: `AINM ${action.linked_ainm_number}`, tone: "red" });
  if (action.linked_hse_inspection_number) chips.push({ label: `HSE Inspection ${action.linked_hse_inspection_number}`, tone: "teal" });
  if (action.linked_observation_number) chips.push({ label: `Observation ${action.linked_observation_number}`, tone: "teal" });

  if (chips.length === 0 && sourceImpliesLinkedRecord(source)) {
    chips.push({ label: "Missing linked record", tone: "amber" });
  }

  return chips;
}

function hasLinkedRecord(action: ActionItem) {
  return buildLinkedRecordChips(action).some((chip) => chip.label !== "Missing linked record");
}

function buildLinkedRecordDisplay(action: ActionItem) {
  const source = getActionSourceLabel(action);
  const values = [
    action.linked_audit_number ? `Audit ${action.linked_audit_number}` : "",
    action.linked_finding_reference ? `Finding ${action.linked_finding_reference}` : "",
    action.linked_asset_code ? `Asset ${action.linked_asset_code}` : "",
    action.linked_inspection_number ? `Inspection ${action.linked_inspection_number}` : "",
    action.linked_maintenance_number ? `Maintenance ${action.linked_maintenance_number}` : "",
    action.linked_calibration_id ? "Calibration linked" : "",
    action.linked_ncr_number ? `NCR ${action.linked_ncr_number}` : "",
    action.linked_capa_number ? `CAPA ${action.linked_capa_number}` : "",
    action.linked_moc_number ? `MOC ${action.linked_moc_number}` : "",
    action.linked_ainm_number ? `AINM ${action.linked_ainm_number}` : "",
    action.linked_hse_inspection_number ? `HSE Inspection ${action.linked_hse_inspection_number}` : "",
    action.linked_observation_number ? `Observation ${action.linked_observation_number}` : "",
  ].filter(Boolean);

  if (values.length) return values.join(" | ");
  return source && source !== "Manual" ? source : "-";
}

type LinkedRecordTarget = { kind: string; number: string; href: string | null };

// The record an action comes from, with the same destinations the main Actions page uses.
function getLinkedRecordTarget(action: ActionItem, lookup?: AuditLookup): LinkedRecordTarget | null {
  const source = getActionSourceValue(action);
  const asset = encodeURIComponent(action.linked_asset_code || action.linked_asset_id || "");
  if (isAuditLinkedSource(source)) {
    const audit = resolveActionAudit(action, lookup);
    if (!audit) return null;
    return { kind: "audit", number: audit.number || "linked audit", href: auditRecordHref(audit) };
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
  return null;
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

// What is still missing before an action is closed. These are suggestions only: nothing here blocks closing.
function closingGaps(evidenceCount: number, closeOutComments: string | null | undefined) {
  const gaps: Array<{ label: string; step: string }> = [];
  if (evidenceCount === 0) gaps.push({ label: "Evidence attached", step: "evidence" });
  if (!(closeOutComments || "").trim()) gaps.push({ label: "Closing note", step: "details" });
  return gaps;
}

// Every source can be picked in the register filter, plus any source found in the data that is not in the list.
function buildSourceFilterOptions(actions: ActionItem[], selected: string) {
  const known: string[] = [...sourceOptions];
  const extra = new Set<string>();
  actions.forEach((action) => {
    const value = getActionSourceValue(action);
    if (value && !known.includes(value)) extra.add(value);
  });
  if (selected && !known.includes(selected)) extra.add(selected);
  return [...known, ...[...extra].sort((a, b) => a.localeCompare(b))];
}

function QualityActionsPageContent() {
  const imsPermissions = useImsPermissions();
  const searchParams = useSearchParams();
  // Read once on arrival: later changes to ?search= come from the search box and must not open a record.
  const [linkedSearch] = useState(() => searchParams.get("search")?.trim() || "");
  const [selectedIdOnArrival] = useState(() => searchParams.get("selected") || "");
  const linkOpenedRef = useRef(false);
  const directActionId = searchParams.get("actionId")?.trim() || "";
  const [actions, setActions] = useState<ActionItem[]>([]);
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
  const [activeView, setActiveView] = useUrlState<QualityActionView>("view", "dashboard", ["dashboard", "register", "create"]);
  const [selectedId, setSelectedId] = useUrlState("selected", "");
  const [search, setSearch] = useUrlState("search", "");
  const [statusFilter, setStatusFilter] = useUrlState("status", "");
  const [ownerFilter, setOwnerFilter] = useUrlState("owner", "");
  const [priorityFilter, setPriorityFilter] = useUrlState("priority", "");
  const [sourceFilter, setSourceFilter] = useUrlState("source", "");
  const [showRegisterFilters, setShowRegisterFilters] = useUrlFlag("filters");
  const [pressureFilter, setPressureFilter] = useUrlState<"" | "overdue" | "dueWeek">("pressure", "", ["", "overdue", "dueWeek"]);
  // The register opens showing open items only. Choosing a status or "closed only" is a request to see closed items.
  const [showOpenOnly, setShowOpenOnly] = useUrlFlag("open", true);
  const [showClosedOnly, setShowClosedOnly] = useUrlFlag("closed", false);
  const [showEvidenceOnly, setShowEvidenceOnly] = useUrlFlag("evidence", false);
  const [showLinkedIssuesOnly, setShowLinkedIssuesOnly] = useUrlFlag("linked", false);
  const [evidenceRows, setEvidenceRows] = useState<EvidenceRow[]>([]);
  const detailRef = useRef<HTMLDivElement | null>(null);
  const arrivalClosedCheckedRef = useRef(false);
  const [form, setForm] = useState<ActionForm>(emptyForm);
  const [message, setMessage] = useState("Loading Quality actions...");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState("");

  const canCreateAction = useMemo(() => {
    return imsPermissions.loaded && (imsPermissions.isMasterAdmin || imsPermissions.fullAccess || imsPermissions.canCreate);
  }, [imsPermissions.canCreate, imsPermissions.fullAccess, imsPermissions.isMasterAdmin, imsPermissions.loaded]);

  const canEditAction = useMemo(() => {
    return imsPermissions.loaded && (imsPermissions.isMasterAdmin || imsPermissions.fullAccess || imsPermissions.canEdit);
  }, [imsPermissions.canEdit, imsPermissions.fullAccess, imsPermissions.isMasterAdmin, imsPermissions.loaded]);

  async function loadData() {
    setLoading(true);
    const [actionsRes, peopleRes, auditRes, findingRes, ncrRes, capaRes, mocRes, ainmRes, assetsRes, inspectionsRes, maintenanceRes, calibrationsRes, evidenceRes] = await Promise.all([
      supabase.from("actions").select("*").order("action_number", { ascending: true }),
      supabase.from("people").select("id,name,email,role,department,active").eq("active", true).order("name", { ascending: true }),
      supabase.from("audits").select("id,audit_number,title").order("audit_number", { ascending: true }),
      supabase.from("audit_findings").select("id,audit_id,reference,description").order("reference", { ascending: true }),
      supabase.from("ncrs").select("id,ncr_number,title").order("ncr_number", { ascending: true }),
      supabase.from("capas").select("id,capa_number,title").order("capa_number", { ascending: true }),
      supabase.from("moc_reports").select("id,moc_report_no,moc_report_title").order("moc_report_no", { ascending: true }),
      supabase.from("hse_ainm_records").select("id,ainm_number,title,project,event_date,event_classification").order("event_date", { ascending: false }).order("ainm_number", { ascending: false }),
      supabase.from("assets").select("id,asset_code,name").order("asset_code", { ascending: true }),
      supabase.from("asset_inspection_records").select("id,asset_id,inspection_number,inspection_date,result").order("inspection_number", { ascending: true }),
      supabase.from("asset_maintenance_records").select("id,asset_id,maintenance_number,maintenance_date,description").order("maintenance_number", { ascending: true }),
      supabase.from("asset_calibration_records").select("id,asset_id,reference,certificate_number,calibration_date,calibration_due_date").order("calibration_date", { ascending: false }),
      supabase.from("evidence_files").select("id,record_id,file_name").eq("record_type", "ACTION"),
    ]);

    if (actionsRes.error) {
      setMessage(`Quality actions failed to load: ${actionsRes.error.message}`);
      setLoading(false);
      return;
    }

    const allActions = ((actionsRes.data || []) as ActionItem[]).sort((a, b) => {
      const aNum = extractActionNumber(a.action_number);
      const bNum = extractActionNumber(b.action_number);
      if (aNum !== null && bNum !== null) return aNum - bNum;
      return (a.action_number || "").localeCompare(b.action_number || "");
    });
    const qualityActions = allActions.filter((action) => (action.department || "").trim().toUpperCase() === "QUALITY");
    setActions(qualityActions);
    if (peopleRes.data && !peopleRes.error) setPeople((peopleRes.data || []) as PersonOption[]);
    // Evidence only feeds the count and the "still missing" list, so a failed read does not stop the page loading.
    if (evidenceRes.data && !evidenceRes.error) setEvidenceRows((evidenceRes.data || []) as EvidenceRow[]);
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
    setMessage(`Loaded ${qualityActions.length} Quality action${qualityActions.length === 1 ? "" : "s"}.`);
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
    void supabase.auth.getUser().then(({ data }) => {
      setCurrentUserEmail(data.user?.email?.trim().toLowerCase() || "");
    });
  }, []);

  const selectedAction = useMemo(() => actions.find((action) => action.id === selectedId) || null, [actions, selectedId]);

  useEffect(() => {
    if ((!linkedSearch && !directActionId) || actions.length === 0) return;
    // A record that was open when the address was saved stays open instead of jumping to the first search match.
    if (!directActionId && selectedIdOnArrival) return;
    if (linkOpenedRef.current) return;
    const value = linkedSearch.toLowerCase();
    const match = actions.find((action) => (
      (directActionId && action.id === directActionId) ||
      Boolean(value && (
        (action.action_number || "").toLowerCase() === value ||
        (action.title || "").toLowerCase().includes(value)
      ))
    ));
    if (!match) return;
    linkOpenedRef.current = true;
    // Opening a record from a link shows it even when it is closed.
    setShowOpenOnly(false);
    setSelectedId(match.id);
    setActiveView("register");
  }, [actions, directActionId, linkedSearch]);

  // A record that was open when the address was saved stays visible even when it is closed.
  useEffect(() => {
    if (arrivalClosedCheckedRef.current || actions.length === 0) return;
    arrivalClosedCheckedRef.current = true;
    if (selectedIdOnArrival && actions.some((action) => action.id === selectedIdOnArrival && isClosedLikeStatus(action.status))) {
      setShowOpenOnly(false);
    }
  }, [actions, selectedIdOnArrival]);

  const auditLookup = useMemo<AuditLookup>(
    () => ({
      auditOptions: auditOptions.map((option) => ({ id: option.id, audit_number: option.audit_number })),
      findingOptions: findingOptions.map((option) => ({ id: option.id, audit_id: option.audit_id, reference: option.reference })),
    }),
    [auditOptions, findingOptions]
  );

  const evidenceCountMap = useMemo(() => {
    const ids = new Set(actions.map((action) => action.id));
    const map = new Map<string, number>();
    evidenceRows.forEach((file) => {
      if (ids.has(file.record_id)) map.set(file.record_id, (map.get(file.record_id) || 0) + 1);
    });
    return map;
  }, [actions, evidenceRows]);

  const currentPersonName = useMemo(() => {
    if (!currentUserEmail) return "";
    return people.find((person) => (person.email || "").trim().toLowerCase() === currentUserEmail)?.name || "";
  }, [currentUserEmail, people]);

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
    const evidence = actions.reduce((total, action) => total + (evidenceCountMap.get(action.id) || 0), 0);
    const mine = currentPersonName
      ? actions.filter((action) => !isClosedLikeStatus(action.status) && (action.owner || "").trim().toLowerCase() === currentPersonName.trim().toLowerCase()).length
      : 0;
    const linkIssues = actions.filter((action) => sourceImpliesLinkedRecord(getActionSourceValue(action)) && !hasLinkedRecord(action)).length;
    return { total: actions.length, open, overdue, dueWeek, closed, high, evidence, mine, linkIssues };
  }, [actions, currentPersonName, evidenceCountMap]);

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
      const source = getActionSourceValue(action);
      counts.set(source, (counts.get(source) || 0) + 1);
    });
    return [...counts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [actions]);
  const sourceFilterOptions = useMemo(() => buildSourceFilterOptions(actions, sourceFilter), [actions, sourceFilter]);

  const ownerOptions = useMemo(() => {
    const savedOwners = actions.map((action) => action.owner).filter(Boolean) as string[];
    const peopleNames = people.map((person) => person.name).filter(Boolean);
    return [...new Set([...peopleNames, ...savedOwners])].sort();
  }, [actions, people]);

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

  // The register steps aside from open-only when a status or "closed only" is chosen.
  const openOnlyActive = showOpenOnly && !statusFilter && !showClosedOnly;

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
        getActionSourceValue(action),
        action.linked_audit_number,
        action.linked_finding_reference,
        action.linked_ncr_number,
        action.linked_capa_number,
        action.linked_moc_number,
        action.linked_ainm_number,
      ].join(" ").toLowerCase();
      return (
        (!query || haystack.includes(query)) &&
        (!statusFilter || (action.status || "") === statusFilter) &&
        (!ownerFilter || (action.owner || "") === ownerFilter) &&
        (!priorityFilter || (action.priority || "") === priorityFilter) &&
        (!sourceFilter || getActionSourceValue(action) === sourceFilter) &&
        (!openOnlyActive || !isClosedLikeStatus(action.status)) &&
        (!showClosedOnly || isClosedLikeStatus(action.status)) &&
        (!showEvidenceOnly || (evidenceCountMap.get(action.id) || 0) > 0) &&
        (!showLinkedIssuesOnly || (sourceImpliesLinkedRecord(getActionSourceValue(action)) && !hasLinkedRecord(action))) &&
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
  }, [actions, evidenceCountMap, openOnlyActive, ownerFilter, pressureFilter, priorityFilter, search, showClosedOnly, showEvidenceOnly, showLinkedIssuesOnly, sourceFilter, statusFilter]);

  async function createAction(event: React.FormEvent) {
    event.preventDefault();
    if (!canCreateAction) {
      setMessage("Read-only access: you do not have permission to create Quality actions.");
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
      department: "Quality",
      project: form.project.trim() || null,
      owner: form.owner.trim() || null,
      priority: form.priority,
      status: form.status,
          raised_by_email: currentUserEmail || null,
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
    }]);

    setSaving(false);
    if (error) {
      setMessage(`Create action failed: ${error.message}`);
      return;
    }
    setForm(emptyForm);
    setMessage(`${nextNumber} created in central Action Management as a Quality action.`);
    setActiveView("register");
    await loadData();
  }

  async function getNextNumberFromAllActions() {
    const { data } = await supabase.from("actions").select("action_number");
    return getNextActionNumber((data || []) as ActionItem[]);
  }

  type RegisterDrilldown = {
    status?: string;
    owner?: string;
    priority?: string;
    source?: string;
    pressure?: "" | "overdue" | "dueWeek";
    openOnly?: boolean;
    closedOnly?: boolean;
    evidenceOnly?: boolean;
    linkedIssuesOnly?: boolean;
  };

  // A dashboard number opens the register on exactly the actions behind it. Open-only stays on only when asked.
  function openRegisterDrilldown(options: RegisterDrilldown = {}) {
    setActiveView("register");
    if (options.status !== undefined) setStatusFilter(options.status);
    if (options.owner !== undefined) setOwnerFilter(options.owner);
    if (options.priority !== undefined) setPriorityFilter(options.priority);
    if (options.source !== undefined) setSourceFilter(options.source);
    if (options.pressure !== undefined) setPressureFilter(options.pressure);
    if (options.evidenceOnly !== undefined) setShowEvidenceOnly(options.evidenceOnly);
    if (options.linkedIssuesOnly !== undefined) setShowLinkedIssuesOnly(options.linkedIssuesOnly);
    // Open-only needs any status filter set aside, otherwise the status filter would win and show closed items.
    if (options.openOnly && options.status === undefined) setStatusFilter("");
    setShowOpenOnly(options.openOnly ?? false);
    setShowClosedOnly(options.closedOnly ?? false);
  }

  function openMine() {
    if (!currentPersonName) {
      setMessage("Mine is unavailable: your sign-in email is not linked to an active People record.");
      return;
    }
    openRegisterDrilldown({ owner: currentPersonName, openOnly: true });
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("");
    setOwnerFilter("");
    setPriorityFilter("");
    setSourceFilter("");
    setPressureFilter("");
    setShowOpenOnly(true);
    setShowClosedOnly(false);
    setShowEvidenceOnly(false);
    setShowLinkedIssuesOnly(false);
    setSelectedId("");
  }

  function selectAction(id: string) {
    setSelectedId(id);
    window.setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  // One description of the register filters, printed on both the PDF and the Excel sheet.
  function registerFilterDescriptions() {
    return [
      ...(search.trim() ? [`Search: "${search.trim()}"`] : []),
      ...(statusFilter ? [`Status: ${statusFilter}`] : []),
      ...(priorityFilter ? [`Priority: ${priorityFilter}`] : []),
      ...(ownerFilter ? [`Owner: ${ownerFilter}`] : []),
      ...(sourceFilter ? [`Source: ${sourceFilter}`] : []),
      ...(pressureFilter === "overdue" ? ["Overdue only"] : pressureFilter === "dueWeek" ? ["Due this week"] : []),
      ...(openOnlyActive ? ["Open / non-closed only"] : []),
      ...(showClosedOnly ? ["Closed / complete only"] : []),
      ...(showEvidenceOnly ? ["With attached evidence"] : []),
      ...(showLinkedIssuesOnly ? ["With linked record issues"] : []),
    ];
  }

  async function generateRegisterPdf() {
    if (filteredActions.length === 0) {
      setMessage("No filtered actions available for PDF export.");
      return;
    }
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;
      const generatedAt = new Date().toLocaleString("en-GB");

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
      doc.text("Quality Action Register", pageWidth / 2, 17, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(83, 86, 90);
      doc.text("Enshore IMS - Quality Actions", pageWidth / 2, 23, { align: "center" });
      doc.text(`Generated: ${generatedAt}`, pageWidth - margin, 17, { align: "right" });
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
        linked_record: buildLinkedRecordDisplay(action),
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
        styles: {
          font: "helvetica",
          fontSize: 7.4,
          cellPadding: 1.8,
          lineColor: [208, 208, 206],
          lineWidth: 0.2,
          textColor: [0, 0, 0],
          overflow: "linebreak",
          valign: "top",
        },
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: "bold" },
        columnStyles: {
          action_number: { cellWidth: 22 },
          title: { cellWidth: 62 },
          source: { cellWidth: 28 },
          linked_record: { cellWidth: 52 },
          owner: { cellWidth: 30 },
          priority: { cellWidth: 18 },
          due_date: { cellWidth: 22 },
          status: { cellWidth: 22 },
        },
        didParseCell: (data) => {
          if (data.section !== "body") return;
          const row = data.row.raw as (typeof reportRows)[number];
          if (row.is_overdue && (data.column.dataKey === "due_date" || data.column.dataKey === "status")) {
            data.cell.styles.fillColor = [254, 226, 226];
            data.cell.styles.textColor = [153, 27, 27];
            data.cell.styles.fontStyle = "bold";
          }
        },
        didDrawPage: () => {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(83, 86, 90);
          doc.text("Enshore Quality Actions", margin, pageHeight - 6);
          doc.text(`Page ${doc.getCurrentPageInfo().pageNumber} of ${doc.getNumberOfPages()}`, pageWidth - margin, pageHeight - 6, { align: "right" });
        },
      });

      doc.save(`quality-action-register-${new Date().toISOString().slice(0, 10)}.pdf`);
      setMessage("Quality Action Register PDF generated successfully.");
    } catch (error) {
      console.error(error);
      setMessage("Quality Action Register PDF generation failed.");
    }
  }

  // The workbook holds exactly the rows the register is showing, with a line saying which filters produced them.
  async function generateRegisterExcel() {
    if (filteredActions.length === 0) {
      setMessage("No filtered actions available for Excel export.");
      return;
    }
    try {
      await downloadRegisterExcel<ActionItem>({
        fileName: `quality-action-register-${excelDateStamp()}.xlsx`,
        sheetName: "Quality Actions",
        title: "Quality Action Register - Enshore IMS",
        filters: registerFilterDescriptions(),
        rows: filteredActions,
        columns: [
          { header: "Action No.", width: 14, value: (action) => action.action_number || "" },
          { header: "Title", width: 44, value: (action) => action.title || "" },
          { header: "Description", width: 60, value: (action) => action.description || "" },
          { header: "Project", width: 22, value: (action) => action.project || "" },
          { header: "Source", width: 20, value: (action) => getActionSourceLabel(action) },
          { header: "Linked Record", width: 30, value: (action) => buildLinkedRecordDisplay(action) },
          { header: "Owner", width: 22, value: (action) => action.owner || "" },
          { header: "Priority", width: 11, value: (action) => action.priority || "" },
          { header: "Due Date", width: 13, value: (action) => (action.due_date ? formatDate(action.due_date) : "") },
          { header: "Status", width: 14, value: (action) => action.status || "" },
          { header: "Overdue", width: 9, value: (action) => (isOverdue(action) ? "Yes" : "No") },
          { header: "Close-out Comments", width: 50, value: (action) => action.close_out_comments || "" },
        ],
      });
      setMessage(`Quality Action Register Excel report created with ${filteredActions.length} action${filteredActions.length === 1 ? "" : "s"}.`);
    } catch (error) {
      console.error(error);
      setMessage("Quality Action Register Excel report could not be created.");
    }
  }

  function updateSource(source: string) {
    setForm((current) => ({
      ...current,
      source,
      linked_audit_id: isAuditLinkedSource(source) ? current.linked_audit_id : "",
      linked_audit_number: isAuditLinkedSource(source) ? current.linked_audit_number : "",
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

  // Action record (workbench) values.
  const selectedSource = selectedAction ? getActionSourceValue(selectedAction) : "Manual";
  const selectedLinkedTarget = selectedAction ? getLinkedRecordTarget(selectedAction, auditLookup) : null;
  const selectedNextStep = selectedAction ? nextStatusStep(selectedAction.status) : null;
  const selectedEvidence = selectedAction ? evidenceRows.filter((file) => file.record_id === selectedAction.id) : [];
  const selectedGaps = selectedAction ? closingGaps(selectedEvidence.length, selectedAction.close_out_comments) : [];
  const detailsToFill = selectedAction
    ? [selectedAction.title, selectedAction.owner, selectedAction.due_date].filter((value) => !(value || "").trim()).length
    : 0;
  const centralActionHref = selectedAction ? `/actions?actionId=${encodeURIComponent(selectedAction.id)}` : "/actions?department=Quality";
  const raisedByEmail = (selectedAction?.raised_by_email || "").trim();
  const raisedByName = raisedByEmail
    ? people.find((person) => (person.email || "").trim().toLowerCase() === raisedByEmail.toLowerCase())?.name || raisedByEmail
    : "";
  const detailSteps: WorkbenchStepDef[] = [
    {
      key: "details",
      label: "Details",
      sub: "What, who, when",
      state: detailsToFill === 0 ? "Complete" : `${detailsToFill} to fill`,
    },
    {
      key: "evidence",
      label: "Evidence",
      sub: "Files for closure",
      state: `${selectedEvidence.length} file${selectedEvidence.length === 1 ? "" : "s"}`,
    },
    {
      key: "linked",
      label: "Linked record",
      sub: "Where it came from",
      state: selectedLinkedTarget ? selectedLinkedTarget.number : "None",
    },
  ];
  const detailNote = selectedAction
    ? [
        `${getDueSummary(selectedAction)}${selectedAction.due_date ? ` (${formatDate(selectedAction.due_date)})` : ""}.`,
        selectedLinkedTarget ? `Raised from ${selectedLinkedTarget.kind} ${selectedLinkedTarget.number}.` : "",
        "Status changes and edits are made in Central Actions.",
      ]
        .filter(Boolean)
        .join(" ")
    : "";

  return (
    <main>
      <QualityPageHero
        label="QUALITY MANAGEMENT"
        title="Quality Actions"
        description="Quality-specific action dashboard, register, and creation view backed by the central Action Management register."
        contextCards={[
          { label: "Last Refreshed", value: lastRefreshed || (loading ? "Loading" : "-") },
          { label: "Latest Quality Action", value: latestAction ? `${latestAction.action_number} - ${latestAction.title}` : "No Quality actions" },
        ]}
      />

      <div className="ims-top-meta-row" style={topMetaRowStyle}>
        <ImsBackNav />
        <div style={statusBannerStyle}><strong>Status:</strong> {message}</div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
        <nav className="ims-tabs" style={{ display: "flex", gap: 10, flexWrap: "wrap" }} role="tablist" aria-label="Quality Action views">
          {viewTabs.map((tab) => (
            <button key={tab.id} type="button" role="tab" aria-selected={activeView === tab.id} data-active={activeView === tab.id ? "true" : "false"} style={activeView === tab.id ? activeViewButtonStyle : viewButtonStyle} onClick={() => setActiveView(tab.id)}>
              {tab.label}
            </button>
          ))}
        </nav>
        <Link href="/actions?department=Quality" style={primaryLinkStyle}>Open Central Actions</Link>
      </div>

      {activeView === "dashboard" ? (
        <>
          <section className="quality-kpi-grid" style={kpiRowSixStyle}>
            <QualityKpiCard title="Open" value={kpis.open} accent="#63B1BC" onClick={() => openRegisterDrilldown({ openOnly: true })} />
            <QualityKpiCard title="Closed" value={kpis.closed} accent="#005670" onClick={() => openRegisterDrilldown({ closedOnly: true })} />
            <QualityKpiCard title="Overdue" value={kpis.overdue} accent="#F93822" onClick={() => openRegisterDrilldown({ pressure: "overdue" })} />
            <QualityKpiCard title="Evidence" value={kpis.evidence} accent="#53565A" onClick={() => openRegisterDrilldown({ evidenceOnly: true })} />
            <QualityKpiCard title="Mine" value={kpis.mine} accent="#005670" onClick={openMine} />
            <QualityKpiCard title="Link issues" value={kpis.linkIssues} accent="#FFAD00" onClick={() => openRegisterDrilldown({ linkedIssuesOnly: true })} />
          </section>

          <section style={dashboardGridStyle}>
            <SectionCard title="Open Actions by Person" subtitle="Who is carrying the current Quality action load.">
              <BarList rows={ownerRows} total={Math.max(1, kpis.open)} accent="#63B1BC" onClick={(owner) => openRegisterDrilldown({ owner: owner === "Unassigned" ? "" : owner, openOnly: true })} />
            </SectionCard>
            <SectionCard title="Quality Action Status" subtitle="Open, in progress, and closed position.">
              <BarList rows={statusRows} total={Math.max(1, actions.length)} accent="#005670" onClick={(status) => openRegisterDrilldown({ status })} />
            </SectionCard>
            <SectionCard title="Source Split" subtitle="Where Quality actions are being generated from.">
              <BarList rows={sourceRows} total={Math.max(1, actions.length)} accent="#53565A" onClick={(source) => openRegisterDrilldown({ source: source === "Unspecified" ? "" : source })} />
            </SectionCard>
            <SectionCard title="Manager Focus" subtitle="Immediate Quality action pressure requiring management attention.">
              <div style={focusGridStyle}>
                <MiniFocus label="Overdue" value={kpis.overdue} tone="red" onClick={() => openRegisterDrilldown({ pressure: "overdue" })} />
                <MiniFocus label="Due this week" value={kpis.dueWeek} tone="amber" onClick={() => openRegisterDrilldown({ pressure: "dueWeek" })} />
                <MiniFocus label="High priority" value={kpis.high} tone="purple" onClick={() => openRegisterDrilldown({ priority: "High", openOnly: true })} />
              </div>
            </SectionCard>
          </section>
        </>
      ) : null}

      {activeView === "register" ? (
        <>
          <SectionCard title="Quality Action Register" subtitle="Central Action Management records filtered to department Quality.">
            <div className="ims-filter-panel" style={simpleFilterShellStyle}>
              <div style={registerToolbarStyle}>
                <input style={{ ...inputStyle, ...registerToolbarSearchStyle }} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search action no. / title / project / owner" />
                <button
                  type="button"
                  style={openOnlyActive ? primaryButtonStyle : secondaryButtonStyle}
                  title={openOnlyActive ? "Closed actions are hidden. Press to include them." : "Closed actions are included. Press to show open actions only."}
                  onClick={() => {
                    if (openOnlyActive) {
                      setShowOpenOnly(false);
                      return;
                    }
                    // Turning open-only on also drops a status or closed filter that was holding it aside.
                    setShowOpenOnly(true);
                    setShowClosedOnly(false);
                    setStatusFilter("");
                  }}
                >
                  {openOnlyActive ? "Show Closed" : "Hide Closed"}
                </button>
                <button type="button" style={secondaryButtonStyle} onClick={clearFilters}>Clear Filters</button>
                <button type="button" style={primaryButtonStyle} onClick={() => void generateRegisterPdf()} disabled={filteredActions.length === 0} title="Create a PDF of the actions currently shown">Export PDF</button>
                <button type="button" style={secondaryButtonStyle} onClick={() => void generateRegisterExcel()} disabled={filteredActions.length === 0} title="Download an Excel workbook of the actions currently shown">Export Excel</button>
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
                  <select style={inputStyle} value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
                    <option value="">All Owners</option>
                    {ownerOptions.map((owner) => <option key={owner} value={owner}>{owner}</option>)}
                  </select>
                  <select style={inputStyle} value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
                    <option value="">All Priority</option>
                    {priorityOptions.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
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
                Showing <strong>{filteredActions.length}</strong> of <strong>{actions.length}</strong> Quality actions
                {pressureFilter ? <> with <strong>{pressureFilter === "overdue" ? "overdue" : "due this week"}</strong></> : null}
                {openOnlyActive ? <> showing <strong>open/non-closed</strong></> : null}
                {showClosedOnly ? <> showing <strong>closed/complete</strong></> : null}
                {showEvidenceOnly ? <> with <strong>attached evidence</strong></> : null}
                {showLinkedIssuesOnly ? <> with <strong>linked record issues</strong></> : null}
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
                    <th style={{ ...thStyle, ...colLinkedStyle }}>Linked Record</th>
                    <th style={{ ...thStyle, ...colDueDateStyle }}>Due Date</th>
                    <th style={{ ...thStyle, ...colPriorityStyle }}>Priority</th>
                    <th style={{ ...thStyle, ...colStatusStyle }}>Status</th>
                    <th style={{ ...thStyle, ...colActionStyle }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActions.length ? filteredActions.map((action) => (
                    <tr key={action.id} aria-selected={selectedId === action.id} data-selected={selectedId === action.id ? "true" : "false"} style={selectedId === action.id ? selectedRowStyle : trStyle} onClick={() => selectAction(action.id)}>
                      <td style={{ ...tdStrongStyle, ...colActionNoStyle }}>{action.action_number || "-"}</td>
                      <td style={{ ...tdStyle, ...colTitleStyle }}>
                        <strong style={{ ...truncatedTextStyle, display: "block" }} title={action.title || "-"}>{action.title || "-"}</strong>
                        <div style={{ ...mutedTextStyle, ...truncatedTextStyle }} title={action.project || "No project"}>{action.project || "No project"}</div>
                      </td>
                      <td style={{ ...tdStyle, ...colOwnerStyle, ...truncatedTextStyle }} title={action.owner || "-"}>{action.owner || "-"}</td>
                      <td style={{ ...tdStyle, ...colSourceStyle }}><SourceChip action={action} /></td>
                      <td style={{ ...tdStyle, ...colLinkedStyle }}><LinkedRecordChips action={action} lookup={auditLookup} /></td>
                      <td style={{ ...tdStyle, ...colDueDateStyle }}>
                        <strong>{formatDate(action.due_date)}</strong>
                        <div style={{ ...mutedTextStyle, color: isOverdue(action) ? "#F93822" : "#53565A" }}>{getDueLabel(action.due_date)}</div>
                      </td>
                      <td style={{ ...tdStyle, ...colPriorityStyle }}>{action.priority || "-"}</td>
                      <td style={{ ...tdStyle, ...colStatusStyle }}><StatusPill label={action.status || "Open"} tone={toneForStatus(action.status || "Open")} /></td>
                      <td style={{ ...tdStyle, ...colActionStyle }}><Link href={`/actions?actionId=${encodeURIComponent(action.id)}`} style={smallLinkStyle}>Open Central</Link></td>
                    </tr>
                  )) : (
                    <tr><td colSpan={9} style={emptyCellStyle}>No Quality actions match the current filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <div ref={detailRef}>
            <SectionCard
              title={selectedAction ? `Action Detail - ${selectedAction.action_number || "Action"}` : "Action Detail"}
              subtitle={selectedAction ? "Review the action, its evidence and where it came from. Edit it in Central Actions." : "Click an action row to open the full detail panel."}
            >
              {!selectedAction ? (
                <div style={emptyBoxStyle}>No action selected. Click a row in the register to open the action detail panel.</div>
              ) : (
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
                          {selectedAction.priority ? <StatusPill label={selectedAction.priority} tone={toneForStatus(selectedAction.priority)} /> : null}
                          {selectedNextStep ? (
                            canEditAction ? (
                              <ImsLinkButton href={centralActionHref} variant="primary">
                                {selectedNextStep === "In Progress" ? "Mark In Progress" : "Close"}
                              </ImsLinkButton>
                            ) : (
                              <ImsButton disabled title="You do not have permission to edit actions">
                                {selectedNextStep === "In Progress" ? "Mark In Progress" : "Close"}
                              </ImsButton>
                            )
                          ) : null}
                          <ImsButton variant="secondary" onClick={() => setSelectedId("")}>Hide Panel</ImsButton>
                        </>
                      }
                    />
                  }
                  side={
                    <aside className="ims-doc" aria-label="Linked record">
                      <div className="ims-doc__title">Linked record</div>
                      <div className="ims-doc__row">
                        <span className="ims-doc__label">Source</span>
                        <span>{getActionSourceLabel(selectedAction)}</span>
                      </div>
                      <div className="ims-doc__row">
                        <span className="ims-doc__label">Record</span>
                        <span>{selectedLinkedTarget ? selectedLinkedTarget.number : "None stored"}</span>
                      </div>
                      <div className="ims-doc__row">
                        <span className="ims-doc__label">Due</span>
                        <span>{getDueSummary(selectedAction)}</span>
                      </div>
                      <div className="ims-doc__row">
                        <span className="ims-doc__label">Owner</span>
                        <span>{selectedAction.owner || "Unassigned"}</span>
                      </div>
                      <div className="ims-doc__row">
                        <span className="ims-doc__label">Created</span>
                        <span>{formatDateTime(selectedAction.created_at)}</span>
                      </div>
                      <div className="ims-doc__row">
                        <span className="ims-doc__label">Updated</span>
                        <span>{formatDateTime(selectedAction.updated_at)}</span>
                      </div>
                      {selectedLinkedTarget?.href ? (
                        <ImsLinkButton href={selectedLinkedTarget.href} variant="secondary">
                          Open {selectedLinkedTarget.kind} {selectedLinkedTarget.number}
                        </ImsLinkButton>
                      ) : sourceImpliesLinkedRecord(selectedSource) ? (
                        <div style={linkedWarningStyle}>No linked record is stored on this action.</div>
                      ) : null}
                    </aside>
                  }
                >
                  <WorkbenchStep stepKey="details">
                    <div style={formGridStyle}>
                      <Field label="Action Number"><input style={readOnlyInputStyle} value={selectedAction.action_number || ""} readOnly /></Field>
                      <Field label="Department"><input style={readOnlyInputStyle} value={selectedAction.department || ""} readOnly /></Field>
                      <Field label="Title"><input style={readOnlyInputStyle} value={selectedAction.title || ""} readOnly /></Field>
                      <Field label="Owner"><input style={readOnlyInputStyle} value={selectedAction.owner || ""} readOnly /></Field>
                      <Field label="Raised By"><input style={readOnlyInputStyle} value={raisedByName || "Unknown"} readOnly /></Field>
                      <Field label="Project"><input style={readOnlyInputStyle} value={selectedAction.project || ""} readOnly /></Field>
                      <Field label="Priority"><input style={readOnlyInputStyle} value={selectedAction.priority || ""} readOnly /></Field>
                      <Field label="Status"><input style={readOnlyInputStyle} value={selectedAction.status || ""} readOnly /></Field>
                      <Field label="Due Date"><input style={readOnlyInputStyle} value={selectedAction.due_date ? formatDate(selectedAction.due_date) : ""} readOnly /></Field>
                      <Field label="Close-out Comments"><textarea style={{ ...readOnlyInputStyle, minHeight: 80, resize: "vertical" }} value={selectedAction.close_out_comments || ""} readOnly /></Field>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <Field label="Description"><textarea style={{ ...readOnlyInputStyle, minHeight: 110, resize: "vertical" }} value={selectedAction.description || ""} readOnly /></Field>
                      </div>
                    </div>
                  </WorkbenchStep>

                  <WorkbenchStep stepKey="evidence">
                    <div style={{ display: "grid", gap: 12 }}>
                      <div style={labelStyle}>Attached files</div>
                      {selectedEvidence.length === 0 ? (
                        <p style={emptyTextStyle}>No evidence attached to this action yet.</p>
                      ) : (
                        <div style={{ display: "grid", gap: 8 }}>
                          {selectedEvidence.map((file) => (
                            <div key={file.id} style={evidenceItemStyle}>{file.file_name || "Evidence file"}</div>
                          ))}
                        </div>
                      )}
                      <p style={emptyTextStyle}>Upload, open or delete evidence files in Central Actions.</p>
                    </div>
                  </WorkbenchStep>

                  <WorkbenchStep stepKey="linked">
                    <div style={formGridStyle}>
                      <Field label="Source"><input style={readOnlyInputStyle} value={getActionSourceLabel(selectedAction)} readOnly /></Field>
                    </div>
                    <div style={linkedSourceCardStyle}>
                      <div style={linkedSourceTitleStyle}>Linked Record Intelligence</div>
                      <div style={linkedChipRowStyle}>
                        <SourceChip action={selectedAction} />
                        <LinkedRecordChips action={selectedAction} lookup={auditLookup} />
                      </div>
                      {sourceImpliesLinkedRecord(selectedSource) && !hasLinkedRecord(selectedAction) ? (
                        <div style={linkedWarningStyle}>This source normally has a linked record, but no linked reference is stored on this action.</div>
                      ) : null}
                      {selectedLinkedTarget?.href ? (
                        <Link href={selectedLinkedTarget.href} style={backLinkStyle}>Open linked {selectedLinkedTarget.kind}</Link>
                      ) : null}
                    </div>
                  </WorkbenchStep>

                  <div style={buttonRowStyle}>
                    {canEditAction ? (
                      <ImsLinkButton href={centralActionHref} variant="primary">Open / Edit in Central Actions</ImsLinkButton>
                    ) : (
                      <ImsLinkButton href={centralActionHref} variant="secondary">Open in Central Actions</ImsLinkButton>
                    )}
                    <span style={emptyTextStyle}>Quality actions are edited in the central Action Management register.</span>
                  </div>
                </RecordWorkbench>
              )}
            </SectionCard>
          </div>
        </>
      ) : null}

      {activeView === "create" ? (
        <SectionCard title="Create Quality Action" subtitle="Creates a central Action Management record with department Quality.">
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
              {isAuditLinkedSource(form.source) ? (
                <Field label="Audit Number">
                  <select style={inputStyle} value={form.linked_audit_id} onChange={(event) => applyAuditSelection(event.target.value)}>
                    <option value="">Select audit</option>
                    {auditOptions.map((audit) => (
                      <option key={audit.id} value={audit.id}>{audit.audit_number} - {audit.title || "Untitled"}</option>
                    ))}
                  </select>
                </Field>
              ) : null}
              {form.source === "Audit Finding" ? (
                <Field label="Finding Reference">
                  <select style={inputStyle} value={form.linked_finding_id} onChange={(event) => applyFindingSelection(event.target.value)} disabled={!form.linked_audit_id}>
                    <option value="">{form.linked_audit_id ? "Select finding" : "Select audit first"}</option>
                    {createFindingOptions.map((finding) => (
                      <option key={finding.id} value={finding.id}>{finding.reference}</option>
                    ))}
                  </select>
                </Field>
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
              <button type="submit" style={primaryButtonStyle} disabled={saving || !canCreateAction}>{saving ? "Creating..." : "Create Quality Action"}</button>
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

function SourceChip({ action }: { action: ActionItem }) {
  const source = getActionSourceValue(action);
  return <span style={{ ...linkedChipStyle, ...linkedChipToneStyles[getSourceChipTone(source)] }}>{getActionSourceLabel(action)}</span>;
}

function LinkedRecordChips({ action, lookup }: { action: ActionItem; lookup: AuditLookup }) {
  const chips = buildLinkedRecordChips(action, lookup);
  if (chips.length === 0) return <span style={mutedTextStyle}>-</span>;
  return (
    <div style={linkedChipRowStyle}>
      {chips.map((chip) =>
        chip.href ? (
          <Link
            key={chip.label}
            href={chip.href}
            title="Open this record"
            onClick={(event) => event.stopPropagation()}
            style={{ ...linkedChipStyle, ...linkedChipToneStyles[chip.tone], textDecoration: "underline" }}
          >
            {chip.label}
          </Link>
        ) : (
          <span key={chip.label} style={{ ...linkedChipStyle, ...linkedChipToneStyles[chip.tone] }}>{chip.label}</span>
        )
      )}
    </div>
  );
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
const statusBannerStyle: CSSProperties = { background: "white", borderRadius: "12px", padding: "12px 16px", boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)", color: "#000000" };
const primaryLinkStyle: CSSProperties = { background: "#005670", color: "white", border: "none", padding: "11px 16px", borderRadius: "10px", cursor: "pointer", fontWeight: 800, textDecoration: "none", display: "inline-flex", alignItems: "center" };
const smallLinkStyle: CSSProperties = { ...primaryLinkStyle, padding: "8px 10px", fontSize: 12 };
const viewButtonStyle: CSSProperties = { background: "#ECECE7", color: "#000000", border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 800, cursor: "pointer", minHeight: "44px", display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1.2, boxSizing: "border-box" };
const activeViewButtonStyle: CSSProperties = { ...viewButtonStyle, background: "#005670", color: "white" };
const kpiRowSixStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: "12px", marginBottom: "20px" };
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

const colActionNoStyle: CSSProperties = { width: "8%" };
const colTitleStyle: CSSProperties = { width: "21%" };
const colOwnerStyle: CSSProperties = { width: "11%" };
const colSourceStyle: CSSProperties = { width: "10%" };
const colLinkedStyle: CSSProperties = { width: "15%" };
const colDueDateStyle: CSSProperties = { width: "11%" };
const colPriorityStyle: CSSProperties = { width: "7%" };
const colStatusStyle: CSSProperties = { width: "9%" };
const colActionStyle: CSSProperties = { width: "8%" };

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
const detailCardStyle: CSSProperties = {
  marginTop: 18,
  border: "1px solid #D0D0CE",
  borderRadius: "18px",
  padding: "18px",
  background: "linear-gradient(180deg, #ffffff 0%, #ECECE7 100%)",
  display: "grid",
  gap: 12,
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
  minWidth: 0,
};
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

const simpleFilterShellStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
  padding: "12px",
  border: "1px solid #D0D0CE",
  borderRadius: "16px",
  background: "rgba(248,250,252,0.92)",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
  marginBottom: "14px",
};
const registerToolbarStyle: CSSProperties = { display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" };
const registerToolbarSearchStyle: CSSProperties = { flex: "1 1 260px", minWidth: 0 };
const backLinkStyle: CSSProperties = { color: "#005670", fontWeight: 700, textDecoration: "none" };
const linkedChipRowStyle: CSSProperties = { display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" };
const linkedChipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  width: "fit-content",
  padding: "5px 9px",
  borderRadius: "14px",
  fontSize: "12px",
  fontWeight: 800,
  border: "1px solid transparent",
  maxWidth: "100%",
  whiteSpace: "normal",
  overflowWrap: "anywhere",
};
const linkedChipToneStyles: Record<LinkedRecordChip["tone"], CSSProperties> = {
  teal: { background: "#D0D0CE", color: "#005670", borderColor: "#D0D0CE" },
  blue: { background: "#ECECE7", color: "#005670", borderColor: "#ECECE7" },
  purple: { background: "#ECECE7", color: "#53565A", borderColor: "#ECECE7" },
  amber: { background: "#ECECE7", color: "#000000", borderColor: "#ECECE7" },
  red: { background: "#ECECE7", color: "#F93822", borderColor: "#ECECE7" },
  slate: { background: "#D0D0CE", color: "#53565A", borderColor: "#D0D0CE" },
};
const linkedWarningStyle: CSSProperties = { border: "1px solid #ECECE7", background: "#ECECE7", color: "#000000", borderRadius: "10px", padding: "9px 10px", fontSize: "13px", fontWeight: 700 };
const linkedSourceCardStyle: CSSProperties = { border: "1px solid #D0D0CE", borderRadius: "14px", background: "#ECECE7", padding: "12px 14px", display: "grid", gap: "8px", marginTop: "12px" };
const linkedSourceTitleStyle: CSSProperties = { fontSize: "13px", fontWeight: 800, color: "#000000" };
const evidenceItemStyle: CSSProperties = { border: "1px solid #D0D0CE", borderRadius: 12, padding: "10px 12px", background: "white", color: "#000000", fontSize: 13, overflowWrap: "anywhere" };

export default function QualityActionsPage() {
  return (
    <Suspense fallback={<main style={{ padding: "24px" }}>Loading Quality actions...</main>}>
      <QualityActionsPageContent />
    </Suspense>
  );
}

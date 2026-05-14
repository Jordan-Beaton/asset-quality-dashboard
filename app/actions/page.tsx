"use client";

export const dynamic = "force-dynamic";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { ModuleSectionHeader } from "../../src/components/ModuleSectionHeader";
import { QualityKpiCard } from "../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../src/components/QualityPageHero";
import { supabase } from "../../src/lib/supabase";

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
  linked_audit_id: string | null;
  linked_audit_number: string | null;
  linked_finding_id: string | null;
  linked_finding_reference: string | null;
  linked_asset_id: string | null;
  linked_asset_code: string | null;
  linked_inspection_id: string | null;
  linked_inspection_number: string | null;
  linked_maintenance_id: string | null;
  linked_maintenance_number: string | null;
  linked_calibration_id: string | null;
  linked_ncr_id: string | null;
  linked_ncr_number: string | null;
  linked_capa_id: string | null;
  linked_capa_number: string | null;
  linked_moc_id: string | null;
  linked_moc_number: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type AuditOption = {
  id: string;
  audit_number: string;
  title: string;
};

type FindingOption = {
  id: string;
  audit_id: string;
  reference: string;
  description: string;
};

type NcrCapaOption = {
  type: "NCR" | "CAPA";
  id: string;
  number: string;
  title: string;
};

type MocOption = {
  id: string;
  number: string;
  title: string;
};

type ActionPerson = {
  id: string;
  name: string;
  active: boolean | null;
};

type EvidenceFile = {
  id: string;
  record_type: "ACTION" | "NCR" | "CAPA";
  record_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  content_type: string | null;
  notes: string | null;
  uploaded_at: string;
};

type ActionForm = {
  title: string;
  description: string;
  department: string;
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
};

const emptyForm: ActionForm = {
  title: "",
  description: "",
  department: "",
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
};

const actionSourceOptions = [
  "Manual",
  "Audit Finding",
  "Asset Inspection",
  "Asset Maintenance",
  "Asset Calibration",
  "NCR/CAPA",
  "MOC",
  "Risk",
  "HSE",
  "Other",
] as const;
const departmentOptions = [
  "Assets",
  "Commercial",
  "Crewing",
  "Engineering",
  "Finance",
  "Human Resources",
  "Logistics",
  "Marketing",
  "Operations",
  "Procurement",
  "Project",
  "Survey",
  "HSEQ",
] as const;

function normaliseStatus(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function isClosedLikeStatus(value: string | null | undefined) {
  const status = normaliseStatus(value);
  return status === "closed" || status === "complete" || status === "completed";
}

function extractActionNumber(value: string | null | undefined) {
  if (!value) return null;

  const match = value.match(/(\d+)/);
  if (!match) return null;

  const num = Number(match[1]);
  return Number.isNaN(num) ? null : num;
}

function formatActionNumber(num: number) {
  return `ACT-${String(num).padStart(3, "0")}`;
}

function getNextAvailableActionNumber(actions: ActionItem[]) {
  const used = new Set(
    actions
      .map((action) => extractActionNumber(action.action_number))
      .filter((num): num is number => num !== null && num > 0)
  );

  let next = 1;
  while (used.has(next)) {
    next += 1;
  }

  return formatActionNumber(next);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

function formatFileSize(bytes: number | null | undefined) {
  if (!bytes || bytes <= 0) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size >= 10 || unitIndex === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[unitIndex]}`;
}

function getDaysFromToday(value: string | null | undefined) {
  if (!value) return null;

  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return null;

  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffMs = due.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function isOverdue(action: ActionItem) {
  if (!action.due_date) return false;
  if (isClosedLikeStatus(action.status)) return false;

  const days = getDaysFromToday(action.due_date);
  return days !== null && days < 0;
}

function getDueLabel(value: string | null | undefined) {
  const days = getDaysFromToday(value);

  if (days === null) return "-";
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

function getMonthKey(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function matchesSearchTerm(action: ActionItem, query: string) {
  const lower = query.trim().toLowerCase();
  if (!lower) return true;

  return (
    (action.action_number || "").toLowerCase().includes(lower) ||
    (action.title || "").toLowerCase().includes(lower) ||
    (action.project || "").toLowerCase().includes(lower) ||
    (action.owner || "").toLowerCase().includes(lower) ||
    (action.priority || "").toLowerCase().includes(lower) ||
    (action.status || "").toLowerCase().includes(lower) ||
    (action.source || "").toLowerCase().includes(lower) ||
    (action.linked_asset_code || "").toLowerCase().includes(lower) ||
    (action.linked_inspection_number || "").toLowerCase().includes(lower) ||
    (action.linked_maintenance_number || "").toLowerCase().includes(lower) ||
    (action.linked_audit_number || "").toLowerCase().includes(lower) ||
    (action.linked_finding_reference || "").toLowerCase().includes(lower)
  );
}

function getActionSourceValue(action: ActionItem) {
  const source = (action.source || "").trim();
  if (!source) return "Manual";
  if (source === "Audit") {
    return action.linked_finding_id || action.linked_finding_reference ? "Audit Finding" : "Other";
  }
  return source;
}

function getActionSourceLabel(action: ActionItem) {
  const source = getActionSourceValue(action);
  if (source === "NCR/CAPA") return "NCR / CAPA";
  return source;
}

function isAuditLinkedSource(source: string | null | undefined) {
  return source === "Audit Finding";
}

function isAssetLinkedSource(source: string | null | undefined) {
  return source === "Asset Inspection" || source === "Asset Maintenance" || source === "Asset Calibration";
}

function buildActionSourceLabel(action: ActionItem) {
  const source = getActionSourceValue(action);
  if (!source || source === "Manual" || source === "Other") return "";

  const parts = [`Source: ${source}`];
  if (source === "Audit Finding" && action.linked_audit_number) parts.push(`Audit ${action.linked_audit_number}`);
  if (source === "Audit Finding" && action.linked_finding_reference) parts.push(`Finding ${action.linked_finding_reference}`);
  if (isAssetLinkedSource(source) && action.linked_asset_code) parts.push(`Asset ${action.linked_asset_code}`);
  if (source === "Asset Inspection" && action.linked_inspection_number) {
    parts.push(`Inspection ${action.linked_inspection_number}`);
  }
  if (source === "Asset Maintenance" && action.linked_maintenance_number) {
    parts.push(`Maintenance ${action.linked_maintenance_number}`);
  }
  if (source === "NCR/CAPA" && action.linked_ncr_number) parts.push(`NCR ${action.linked_ncr_number}`);
  if (source === "NCR/CAPA" && action.linked_capa_number) parts.push(`CAPA ${action.linked_capa_number}`);
  if (source === "MOC" && action.linked_moc_number) parts.push(`MOC ${action.linked_moc_number}`);
  return parts.join(" • ");
}

function buildLinkedRecordDisplay(action: ActionItem) {
  const source = getActionSourceLabel(action);
  const values = [
    action.linked_audit_number ? `Audit ${action.linked_audit_number}` : "",
    action.linked_finding_reference ? `Finding ${action.linked_finding_reference}` : "",
    action.linked_asset_code ? `Asset ${action.linked_asset_code}` : "",
    action.linked_inspection_number ? `Inspection ${action.linked_inspection_number}` : "",
    action.linked_maintenance_number ? `Maintenance ${action.linked_maintenance_number}` : "",
    action.linked_ncr_number ? `NCR ${action.linked_ncr_number}` : "",
    action.linked_capa_number ? `CAPA ${action.linked_capa_number}` : "",
    action.linked_moc_number ? `MOC ${action.linked_moc_number}` : "",
  ].filter(Boolean);

  if (values.length) return values.join(" | ");
  return source && source !== "Manual" ? source : "-";
}

function buildActionFormFromItem(action: ActionItem): ActionForm {
  return {
    title: action.title || "",
    description: action.description || "",
    department: action.department || "",
    project: action.project || "",
    owner: action.owner || "",
    priority: action.priority || "Medium",
    status: action.status || "Open",
    due_date: action.due_date || "",
    source: getActionSourceValue(action),
    linked_audit_id: action.linked_audit_id || "",
    linked_audit_number: action.linked_audit_number || "",
    linked_finding_id: action.linked_finding_id || "",
    linked_finding_reference: action.linked_finding_reference || "",
    linked_asset_id: action.linked_asset_id || "",
    linked_asset_code: action.linked_asset_code || "",
    linked_inspection_id: action.linked_inspection_id || "",
    linked_inspection_number: action.linked_inspection_number || "",
    linked_maintenance_id: action.linked_maintenance_id || "",
    linked_maintenance_number: action.linked_maintenance_number || "",
    linked_calibration_id: action.linked_calibration_id || "",
    linked_ncr_id: action.linked_ncr_id || "",
    linked_ncr_number: action.linked_ncr_number || "",
    linked_capa_id: action.linked_capa_id || "",
    linked_capa_number: action.linked_capa_number || "",
    linked_moc_id: action.linked_moc_id || "",
    linked_moc_number: action.linked_moc_number || "",
  };
}

function ActionsPageContent() {
  const searchParams = useSearchParams();
  const linkedSearch = searchParams.get("search")?.trim() || "";
  const linkedStatus = searchParams.get("status")?.trim() || "";
  const linkedPriority = searchParams.get("priority")?.trim() || "";
  const linkedOwner = searchParams.get("owner")?.trim() || "";
  const linkedProject = searchParams.get("project")?.trim() || "";
  const linkedSource = searchParams.get("source")?.trim() || "";
  const linkedOverdueOnly = searchParams.get("overdue") === "1";
  const dueWindow = Number(searchParams.get("dueWindow") || "0");
  const linkedCreatedMonth = searchParams.get("createdMonth")?.trim() || "";
  const linkedClosedMonth = searchParams.get("closedMonth")?.trim() || "";
  const prefillSource = searchParams.get("prefill_source")?.trim() || "";
  const prefillDepartment = searchParams.get("prefill_department")?.trim() || "";
  const prefillTitle = searchParams.get("prefill_title")?.trim() || "";
  const prefillDescription = searchParams.get("prefill_description")?.trim() || "";
  const prefillLinkedAssetId = searchParams.get("linked_asset_id")?.trim() || "";
  const prefillLinkedAssetCode = searchParams.get("linked_asset_code")?.trim() || "";
  const prefillLinkedInspectionId = searchParams.get("linked_inspection_id")?.trim() || "";
  const prefillLinkedInspectionNumber = searchParams.get("linked_inspection_number")?.trim() || "";
  const prefillLinkedMaintenanceId = searchParams.get("linked_maintenance_id")?.trim() || "";
  const prefillLinkedMaintenanceNumber = searchParams.get("linked_maintenance_number")?.trim() || "";

  const [actions, setActions] = useState<ActionItem[]>([]);
  const [auditOptions, setAuditOptions] = useState<AuditOption[]>([]);
  const [findingOptions, setFindingOptions] = useState<FindingOption[]>([]);
  const [ncrCapaOptions, setNcrCapaOptions] = useState<NcrCapaOption[]>([]);
  const [mocOptions, setMocOptions] = useState<MocOption[]>([]);
  const [people, setPeople] = useState<ActionPerson[]>([]);
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [message, setMessage] = useState("Loading actions...");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const [form, setForm] = useState<ActionForm>(emptyForm);
  const [createFiles, setCreateFiles] = useState<File[]>([]);
  const [createEvidenceNotes, setCreateEvidenceNotes] = useState("");

  const [search, setSearch] = useState(linkedSearch);
  const [statusFilter, setStatusFilter] = useState(linkedStatus);
  const [priorityFilter, setPriorityFilter] = useState(linkedPriority);
  const [ownerFilter, setOwnerFilter] = useState(linkedOwner);
  const [projectFilter, setProjectFilter] = useState(linkedProject);
  const [sourceFilter, setSourceFilter] = useState(linkedSource);
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [showOverdueOnly, setShowOverdueOnly] = useState(linkedOverdueOnly);

  const [editForm, setEditForm] = useState<ActionForm>(emptyForm);

  const [selectedEvidenceAction, setSelectedEvidenceAction] = useState<ActionItem | null>(null);
  const [selectedEvidenceFiles, setSelectedEvidenceFiles] = useState<File[]>([]);
  const [selectedEvidenceNotes, setSelectedEvidenceNotes] = useState("");
  const [hasAppliedPrefill, setHasAppliedPrefill] = useState(false);

  async function loadActions(showLoadedMessage = true) {
    setIsLoading(true);

    const [{ data: actionsData, error: actionsError }, { data: evidenceData, error: evidenceError }] =
      await Promise.all([
        supabase.from("actions").select("*"),
        supabase
          .from("evidence_files")
          .select("*")
          .eq("record_type", "ACTION")
          .order("uploaded_at", { ascending: false }),
      ]);

    if (actionsError) {
      setMessage(`Error: ${actionsError.message}`);
      setIsLoading(false);
      return;
    }

    if (evidenceError) {
      setMessage(`Evidence load failed: ${evidenceError.message}`);
      setIsLoading(false);
      return;
    }

    const sorted = [...((actionsData || []) as ActionItem[])].sort((a, b) => {
      const aNum = extractActionNumber(a.action_number);
      const bNum = extractActionNumber(b.action_number);

      if (aNum !== null && bNum !== null) return aNum - bNum;
      if (aNum !== null) return -1;
      if (bNum !== null) return 1;

      return (a.action_number || "").localeCompare(b.action_number || "");
    });

    setActions(sorted);
    setEvidenceFiles((evidenceData as EvidenceFile[]) || []);
    setLastRefreshed(new Date());
    setIsLoading(false);

    if (showLoadedMessage) {
      setMessage(`Loaded ${sorted.length} action${sorted.length === 1 ? "" : "s"} successfully.`);
    }
  }

  async function loadAuditOptions() {
    const { data, error } = await supabase
      .from("audits")
      .select("id,audit_number,title")
      .order("audit_number", { ascending: true });

    if (error) return;

    const options = ((data || []) as Array<Record<string, unknown>>)
      .map((row) => ({
        id: String(row.id || ""),
        audit_number: String(row.audit_number || ""),
        title: String(row.title || ""),
      }))
      .filter((row) => row.id && row.audit_number);

    setAuditOptions(options);
  }

  async function loadFindingOptions() {
    const { data, error } = await supabase
      .from("audit_findings")
      .select("id,audit_id,reference,description")
      .order("reference", { ascending: true });

    if (error) return;

    const options = ((data || []) as Array<Record<string, unknown>>)
      .map((row) => ({
        id: String(row.id || ""),
        audit_id: String(row.audit_id || ""),
        reference: String(row.reference || ""),
        description: String(row.description || ""),
      }))
      .filter((row) => row.id && row.audit_id && row.reference);

    setFindingOptions(options);
  }

  async function loadNcrCapaOptions() {
    const [ncrRes, capaRes] = await Promise.all([
      supabase.from("ncrs").select("id,ncr_number,title").order("ncr_number", { ascending: true }),
      supabase.from("capas").select("id,capa_number,title").order("capa_number", { ascending: true }),
    ]);

    const options: NcrCapaOption[] = [];

    if (!ncrRes.error) {
      options.push(
        ...((ncrRes.data || []) as Array<Record<string, unknown>>)
          .map((row) => ({
            type: "NCR" as const,
            id: String(row.id || ""),
            number: String(row.ncr_number || ""),
            title: String(row.title || ""),
          }))
          .filter((row) => row.id && row.number)
      );
    }

    if (!capaRes.error) {
      options.push(
        ...((capaRes.data || []) as Array<Record<string, unknown>>)
          .map((row) => ({
            type: "CAPA" as const,
            id: String(row.id || ""),
            number: String(row.capa_number || ""),
            title: String(row.title || ""),
          }))
          .filter((row) => row.id && row.number)
      );
    }

    setNcrCapaOptions(options);
  }

  async function loadMocOptions() {
    const { data, error } = await supabase
      .from("moc_reports")
      .select("id,moc_report_no,moc_report_title")
      .order("moc_report_no", { ascending: true });

    if (error) return;

    const options = ((data || []) as Array<Record<string, unknown>>)
      .map((row) => ({
        id: String(row.id || ""),
        number: String(row.moc_report_no || ""),
        title: String(row.moc_report_title || ""),
      }))
      .filter((row) => row.id && row.number);

    setMocOptions(options);
  }

  async function loadPeople() {
    const { data, error } = await supabase
      .from("people")
      .select("id,name,active")
      .eq("active", true)
      .order("name", { ascending: true });

    if (error) return;

    const options = ((data || []) as Array<Record<string, unknown>>)
      .map((row) => ({
        id: String(row.id || ""),
        name: String(row.name || "").trim(),
        active: typeof row.active === "boolean" ? row.active : null,
      }))
      .filter((row) => row.id && row.name);

    setPeople(options);
  }

  useEffect(() => {
    void (async () => {
      await Promise.all([
        loadActions(),
        loadAuditOptions(),
        loadFindingOptions(),
        loadNcrCapaOptions(),
        loadMocOptions(),
        loadPeople(),
      ]);
    })();
  }, []);

  useEffect(() => {
    if (hasAppliedPrefill) return;
    if (!prefillSource && !prefillTitle && !prefillDescription && !prefillLinkedAssetId && !prefillLinkedInspectionId && !prefillLinkedMaintenanceId) {
      return;
    }

    setForm((current) => {
      const nextSource = actionSourceOptions.includes(prefillSource as (typeof actionSourceOptions)[number])
        ? prefillSource
        : current.source || "Manual";
      const nextDepartment =
        prefillDepartment ||
        (isAssetLinkedSource(nextSource) ? "Assets" : current.department);

      return {
        ...current,
        source: nextSource,
        department: nextDepartment,
        title: prefillTitle || current.title,
        description: prefillDescription || current.description,
        linked_asset_id: prefillLinkedAssetId || current.linked_asset_id,
        linked_asset_code: prefillLinkedAssetCode || current.linked_asset_code,
        linked_inspection_id: prefillLinkedInspectionId || current.linked_inspection_id,
        linked_inspection_number: prefillLinkedInspectionNumber || current.linked_inspection_number,
        linked_maintenance_id: prefillLinkedMaintenanceId || current.linked_maintenance_id,
        linked_maintenance_number: prefillLinkedMaintenanceNumber || current.linked_maintenance_number,
      };
    });

    setHasAppliedPrefill(true);
    setMessage("Action form prefilled from linked asset record. Review and save when ready.");
  }, [
    hasAppliedPrefill,
    prefillDepartment,
    prefillDescription,
    prefillLinkedAssetCode,
    prefillLinkedAssetId,
    prefillLinkedInspectionId,
    prefillLinkedInspectionNumber,
    prefillLinkedMaintenanceId,
    prefillLinkedMaintenanceNumber,
    prefillSource,
    prefillTitle,
  ]);

  const nextActionNumber = useMemo(() => {
    return getNextAvailableActionNumber(actions);
  }, [actions]);

  const linkedEvidenceFiles = useMemo(() => {
    const actionIds = new Set(actions.map((action) => action.id).filter(Boolean));
    return evidenceFiles.filter((file) => actionIds.has(file.record_id));
  }, [actions, evidenceFiles]);

  const evidenceCountMap = useMemo(() => {
    const map = new Map<string, number>();
    linkedEvidenceFiles.forEach((file) => {
      map.set(file.record_id, (map.get(file.record_id) || 0) + 1);
    });
    return map;
  }, [linkedEvidenceFiles]);

  const selectedActionEvidence = useMemo(() => {
    if (!selectedEvidenceAction) return [];
    return linkedEvidenceFiles.filter((file) => file.record_id === selectedEvidenceAction.id);
  }, [linkedEvidenceFiles, selectedEvidenceAction]);

  const openActions = actions.filter((a) => !isClosedLikeStatus(a.status)).length;
  const closedActions = actions.filter((a) => isClosedLikeStatus(a.status)).length;
  const overdueActions = actions.filter((a) => isOverdue(a)).length;
  const highPriorityOpen = actions.filter(
    (a) => (a.priority || "").toLowerCase() === "high" && !isClosedLikeStatus(a.status)
  ).length;

  const dueThisWeek = actions.filter((a) => {
    if (!a.due_date) return false;
    if (isClosedLikeStatus(a.status)) return false;

    const days = getDaysFromToday(a.due_date);
    return days !== null && days >= 0 && days <= 7;
  }).length;

  const filteredActions = useMemo(() => {
    return actions.filter((action) => {
      const matchesSearch = matchesSearchTerm(action, search);
      const matchesStatus = !statusFilter || (action.status || "") === statusFilter;
      const matchesPriority = !priorityFilter || (action.priority || "") === priorityFilter;
      const matchesOwner = !ownerFilter || (action.owner || "") === ownerFilter;
      const matchesProject = !projectFilter || (action.project || "") === projectFilter;
      const matchesSource = !sourceFilter || getActionSourceValue(action) === sourceFilter;
      const matchesDepartment = !departmentFilter || (action.department || "") === departmentFilter;
      const matchesOverdue = !showOverdueOnly || isOverdue(action);
      const matchesCreatedMonth =
        !linkedCreatedMonth || getMonthKey(action.created_at) === linkedCreatedMonth;
      const matchesClosedMonth =
        !linkedClosedMonth ||
        (isClosedLikeStatus(action.status) &&
          getMonthKey(action.updated_at || action.created_at) === linkedClosedMonth);
      const matchesDueWindow =
        dueWindow <= 0 ||
        (() => {
          if (!action.due_date || isClosedLikeStatus(action.status)) return false;
          const days = getDaysFromToday(action.due_date);
          return days !== null && days >= 0 && days <= dueWindow;
        })();

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesOwner &&
        matchesProject &&
        matchesSource &&
        matchesDepartment &&
        matchesOverdue &&
        matchesCreatedMonth &&
        matchesClosedMonth &&
        matchesDueWindow
      );
    });
  }, [
    actions,
    search,
    statusFilter,
    priorityFilter,
    ownerFilter,
    projectFilter,
    sourceFilter,
    departmentFilter,
    showOverdueOnly,
    linkedCreatedMonth,
    linkedClosedMonth,
    dueWindow,
  ]);

  const overdueList = useMemo(() => {
    return [...actions]
      .filter((action) => isOverdue(action))
      .sort((a, b) => {
        const aDate = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        const bDate = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
      })
      .slice(0, 5);
  }, [actions]);

  const dueSoonList = useMemo(() => {
    return [...actions]
      .filter((action) => {
        if (!action.due_date) return false;
        if (isClosedLikeStatus(action.status)) return false;

        const days = getDaysFromToday(action.due_date);
        return days !== null && days >= 0 && days <= 7;
      })
      .sort((a, b) => {
        const aDate = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        const bDate = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
      })
      .slice(0, 5);
  }, [actions]);

  const linkedAction = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return null;

    return (
      filteredActions.find(
        (action) => (action.action_number || "").trim().toLowerCase() === query
      ) || null
    );
  }, [filteredActions, search]);

  const latestActionLabel = useMemo(() => {
    const latest = [...actions].sort((a, b) => {
      const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
      const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
      return bTime - aTime;
    })[0];

    return latest ? `${latest.action_number || "Action"} - ${latest.title || "Untitled action"}` : "No actions loaded";
  }, [actions]);

  useEffect(() => {
    if (!linkedAction) return;
    setSelectedEvidenceAction((current) => current?.id === linkedAction.id ? current : linkedAction);
  }, [linkedAction]);

  useEffect(() => {
    if (!selectedEvidenceAction) return;
    setEditForm(buildActionFormFromItem(selectedEvidenceAction));
  }, [selectedEvidenceAction]);

  useEffect(() => {
    if (!isAuditLinkedSource(editForm.source)) return;
    if (editForm.linked_audit_id || !editForm.linked_audit_number) return;

    const matched = auditOptions.find((option) => option.audit_number === editForm.linked_audit_number);
    if (!matched) return;

    setEditForm((current) => ({ ...current, linked_audit_id: matched.id }));
  }, [auditOptions, editForm.linked_audit_id, editForm.linked_audit_number, editForm.source]);

  useEffect(() => {
    if (editForm.source !== "NCR/CAPA") return;
    if (editForm.linked_ncr_id || editForm.linked_capa_id) return;

    const matchedNcr =
      editForm.linked_ncr_number &&
      ncrCapaOptions.find(
        (option) => option.type === "NCR" && option.number === editForm.linked_ncr_number
      );
    if (matchedNcr) {
      setEditForm((current) => ({
        ...current,
        linked_ncr_id: matchedNcr.id,
        linked_ncr_number: matchedNcr.number,
      }));
      return;
    }

    const matchedCapa =
      editForm.linked_capa_number &&
      ncrCapaOptions.find(
        (option) => option.type === "CAPA" && option.number === editForm.linked_capa_number
      );
    if (matchedCapa) {
      setEditForm((current) => ({
        ...current,
        linked_capa_id: matchedCapa.id,
        linked_capa_number: matchedCapa.number,
      }));
    }
  }, [
    editForm.linked_capa_id,
    editForm.linked_capa_number,
    editForm.linked_ncr_id,
    editForm.linked_ncr_number,
    editForm.source,
    ncrCapaOptions,
  ]);

  useEffect(() => {
    if (editForm.source !== "MOC") return;
    if (editForm.linked_moc_id || !editForm.linked_moc_number) return;

    const matched = mocOptions.find((option) => option.number === editForm.linked_moc_number);
    if (!matched) return;

    setEditForm((current) => ({
      ...current,
      linked_moc_id: matched.id,
      linked_moc_number: matched.number,
    }));
  }, [editForm.linked_moc_id, editForm.linked_moc_number, editForm.source, mocOptions]);

  useEffect(() => {
    if (!selectedEvidenceAction) return;
    const refreshed = actions.find((action) => action.id === selectedEvidenceAction.id);
    if (refreshed && refreshed !== selectedEvidenceAction) {
      setSelectedEvidenceAction(refreshed);
    }
  }, [actions, selectedEvidenceAction]);

  const uniqueOwners = useMemo(() => {
    return [...new Set(actions.map((a) => a.owner).filter(Boolean))].sort();
  }, [actions]);

  const peopleOptions = useMemo(() => {
    return [...new Set(people.map((person) => person.name.trim()).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [people]);

  const createOwnerOptions = useMemo(() => {
    const currentOwner = form.owner.trim();
    if (!currentOwner || peopleOptions.includes(currentOwner)) return peopleOptions;
    return [currentOwner, ...peopleOptions];
  }, [form.owner, peopleOptions]);

  const editOwnerOptions = useMemo(() => {
    const currentOwner = editForm.owner.trim();
    if (!currentOwner || peopleOptions.includes(currentOwner)) return peopleOptions;
    return [currentOwner, ...peopleOptions];
  }, [editForm.owner, peopleOptions]);

  const uniqueProjects = useMemo(() => {
    return [...new Set(actions.map((a) => a.project).filter(Boolean))].sort();
  }, [actions]);

  const createFindingOptions = useMemo(
    () => findingOptions.filter((finding) => finding.audit_id === form.linked_audit_id),
    [findingOptions, form.linked_audit_id]
  );

  const editFindingOptions = useMemo(
    () => findingOptions.filter((finding) => finding.audit_id === editForm.linked_audit_id),
    [findingOptions, editForm.linked_audit_id]
  );

  function handleCreateFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    setCreateFiles(files);
  }

  function handleSelectedEvidenceFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    setSelectedEvidenceFiles(files);
  }

  function applySourceChange(
    current: ActionForm,
    source: string
  ): ActionForm {
    if (isAuditLinkedSource(source)) {
      return {
        ...current,
        source,
        department: current.department || "",
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
      };
    }

    if (isAssetLinkedSource(source)) {
      return {
        ...current,
        source,
        department: "Assets",
        linked_audit_id: "",
        linked_audit_number: "",
        linked_finding_id: "",
        linked_finding_reference: "",
        linked_ncr_id: "",
        linked_ncr_number: "",
        linked_capa_id: "",
        linked_capa_number: "",
        linked_moc_id: "",
        linked_moc_number: "",
      };
    }

    if (source === "NCR/CAPA") {
      return {
        ...current,
        source,
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
        linked_moc_id: "",
        linked_moc_number: "",
      };
    }

    if (source === "MOC") {
      return {
        ...current,
        source,
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
      };
    }

    return {
      ...current,
      source,
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
    };
  }

  function applyAuditSelection(current: ActionForm, auditId: string): ActionForm {
    const selectedAudit = auditOptions.find((option) => option.id === auditId);
    return {
      ...current,
      linked_audit_id: selectedAudit?.id || "",
      linked_audit_number: selectedAudit?.audit_number || "",
      linked_finding_id: "",
      linked_finding_reference: "",
    };
  }

  function applyFindingSelection(current: ActionForm, findingId: string): ActionForm {
    const selectedFinding = findingOptions.find((option) => option.id === findingId);
    return {
      ...current,
      linked_finding_id: selectedFinding?.id || "",
      linked_finding_reference: selectedFinding?.reference || "",
    };
  }

  function applyNcrCapaSelection(current: ActionForm, value: string): ActionForm {
    const selected = ncrCapaOptions.find((option) => `${option.type}:${option.id}` === value);
    return {
      ...current,
      linked_ncr_id: selected?.type === "NCR" ? selected.id : "",
      linked_ncr_number: selected?.type === "NCR" ? selected.number : "",
      linked_capa_id: selected?.type === "CAPA" ? selected.id : "",
      linked_capa_number: selected?.type === "CAPA" ? selected.number : "",
    };
  }

  function applyMocSelection(current: ActionForm, mocId: string): ActionForm {
    const selected = mocOptions.find((option) => option.id === mocId);
    return {
      ...current,
      linked_moc_id: selected?.id || "",
      linked_moc_number: selected?.number || "",
    };
  }

  async function uploadEvidenceForRecord(recordId: string, files: File[], notes: string) {
    if (!files.length) return { ok: true as const };

    const metadataRows: Array<{
      record_type: "ACTION";
      record_id: string;
      file_name: string;
      file_path: string;
      file_size: number;
      content_type: string;
      notes: string | null;
    }> = [];

    for (const file of files) {
      const safeName = sanitizeFileName(file.name);
      const filePath = `ACTION/${recordId}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("quality-evidence")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        return { ok: false as const, message: uploadError.message };
      }

      metadataRows.push({
        record_type: "ACTION",
        record_id: recordId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        content_type: file.type || "application/octet-stream",
        notes: notes.trim() || null,
      });
    }

    const { error: metadataError } = await supabase.from("evidence_files").insert(metadataRows);

    if (metadataError) {
      return { ok: false as const, message: metadataError.message };
    }

    return { ok: true as const };
  }

  async function addAction(e: React.FormEvent) {
    e.preventDefault();

    if (!form.title.trim()) {
      setMessage("Title is required.");
      return;
    }

    setIsSaving(true);

    const actionNumberToUse = getNextAvailableActionNumber(actions);

    const { data, error } = await supabase
      .from("actions")
      .insert([
        {
          action_number: actionNumberToUse,
          title: form.title.trim(),
          description: form.description.trim() || null,
          department: form.department || null,
          project: form.project.trim() || null,
          owner: form.owner.trim() || null,
          priority: form.priority,
          status: form.status,
          due_date: form.due_date || null,
          source: form.source || "Manual",
          linked_audit_id: form.linked_audit_id || null,
          linked_audit_number: form.linked_audit_number.trim() || null,
          linked_finding_id: form.linked_finding_id.trim() || null,
          linked_finding_reference: form.linked_finding_reference.trim() || null,
          linked_asset_id: form.linked_asset_id || null,
          linked_asset_code: form.linked_asset_code.trim() || null,
          linked_inspection_id: form.linked_inspection_id.trim() || null,
          linked_inspection_number: form.linked_inspection_number.trim() || null,
          linked_maintenance_id: form.linked_maintenance_id.trim() || null,
          linked_maintenance_number: form.linked_maintenance_number.trim() || null,
          linked_calibration_id: form.linked_calibration_id.trim() || null,
          linked_ncr_id: form.linked_ncr_id || null,
          linked_ncr_number: form.linked_ncr_number.trim() || null,
          linked_capa_id: form.linked_capa_id || null,
          linked_capa_number: form.linked_capa_number.trim() || null,
          linked_moc_id: form.linked_moc_id || null,
          linked_moc_number: form.linked_moc_number.trim() || null,
        },
      ])
      .select("*")
      .single();

    if (error || !data) {
      setIsSaving(false);
      setMessage(`Add action failed: ${error?.message || "Unknown error"}`);
      return;
    }

    if (createFiles.length > 0) {
      const uploadResult = await uploadEvidenceForRecord(data.id, createFiles, createEvidenceNotes);

      if (!uploadResult.ok) {
        setIsSaving(false);
        setMessage(`Action created, but evidence upload failed: ${uploadResult.message}`);
        await loadActions(false);
        return;
      }
    }

    setForm(emptyForm);
    setCreateFiles([]);
    setCreateEvidenceNotes("");
    setIsSaving(false);
    setMessage(`Action ${actionNumberToUse} added successfully.`);
    await loadActions(false);
  }

  async function saveEdit(id: string) {
    if (!editForm.title.trim()) {
      setMessage("Title is required.");
      return;
    }

    setIsSaving(true);

    const { error } = await supabase
      .from("actions")
      .update({
        title: editForm.title.trim(),
        description: editForm.description.trim() || null,
        department: editForm.department || null,
        project: editForm.project.trim() || null,
        owner: editForm.owner.trim() || null,
        priority: editForm.priority,
        status: editForm.status,
        due_date: editForm.due_date || null,
        source: editForm.source || "Manual",
        linked_audit_id: editForm.linked_audit_id || null,
        linked_audit_number: editForm.linked_audit_number.trim() || null,
        linked_finding_id: editForm.linked_finding_id.trim() || null,
        linked_finding_reference: editForm.linked_finding_reference.trim() || null,
        linked_asset_id: editForm.linked_asset_id || null,
        linked_asset_code: editForm.linked_asset_code.trim() || null,
        linked_inspection_id: editForm.linked_inspection_id.trim() || null,
        linked_inspection_number: editForm.linked_inspection_number.trim() || null,
        linked_maintenance_id: editForm.linked_maintenance_id.trim() || null,
        linked_maintenance_number: editForm.linked_maintenance_number.trim() || null,
        linked_calibration_id: editForm.linked_calibration_id.trim() || null,
        linked_ncr_id: editForm.linked_ncr_id || null,
        linked_ncr_number: editForm.linked_ncr_number.trim() || null,
        linked_capa_id: editForm.linked_capa_id || null,
        linked_capa_number: editForm.linked_capa_number.trim() || null,
        linked_moc_id: editForm.linked_moc_id || null,
        linked_moc_number: editForm.linked_moc_number.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    setIsSaving(false);

    if (error) {
      setMessage(`Update failed: ${error.message}`);
      return;
    }

    setMessage("Action updated successfully.");
    await loadActions(false);
  }

  async function deleteAction(id: string) {
    if (!window.confirm("Delete this action? This does not automatically delete evidence files.")) {
      return;
    }

    const { error } = await supabase.from("actions").delete().eq("id", id);

    if (error) {
      setMessage(`Delete failed: ${error.message}`);
      return;
    }

    if (selectedEvidenceAction?.id === id) {
      setSelectedEvidenceAction(null);
      setSelectedEvidenceFiles([]);
      setSelectedEvidenceNotes("");
    }

    setMessage("Action deleted successfully.");
    await loadActions(false);
  }

  async function uploadEvidenceToSelectedAction() {
    if (!selectedEvidenceAction) {
      setMessage("Select an action first.");
      return;
    }

    if (selectedEvidenceFiles.length === 0) {
      setMessage("Select at least one evidence file to upload.");
      return;
    }

    setIsUploadingEvidence(true);

    const uploadResult = await uploadEvidenceForRecord(
      selectedEvidenceAction.id,
      selectedEvidenceFiles,
      selectedEvidenceNotes
    );

    setIsUploadingEvidence(false);

    if (!uploadResult.ok) {
      setMessage(`Evidence upload failed: ${uploadResult.message}`);
      return;
    }

    setSelectedEvidenceFiles([]);
    setSelectedEvidenceNotes("");
    setMessage("Evidence uploaded successfully.");
    await loadActions(false);
  }

  async function openEvidence(file: EvidenceFile) {
    const { data, error } = await supabase.storage
      .from("quality-evidence")
      .createSignedUrl(file.file_path, 300);

    if (error || !data?.signedUrl) {
      setMessage(`Could not open file: ${error?.message || "Unknown error"}`);
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function deleteEvidence(file: EvidenceFile) {
    const confirmed = window.confirm(`Delete evidence file "${file.file_name}"?`);
    if (!confirmed) return;

    const { error: storageError } = await supabase.storage
      .from("quality-evidence")
      .remove([file.file_path]);

    if (storageError) {
      setMessage(`File delete failed: ${storageError.message}`);
      return;
    }

    const { error: metadataError } = await supabase
      .from("evidence_files")
      .delete()
      .eq("id", file.id);

    if (metadataError) {
      setMessage(`Evidence record delete failed: ${metadataError.message}`);
      return;
    }

    setMessage("Evidence deleted successfully.");
    await loadActions(false);
  }

  async function generateFilteredActionRegisterPdf() {
    if (filteredActions.length === 0) {
      setMessage("No filtered actions available for PDF export.");
      return;
    }

    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;
      const generatedAt = new Date().toLocaleString("en-GB");
      const filterSummaryRows = [
        ["Search", search.trim() || "None"],
        ["Status", statusFilter || "All"],
        ["Priority", priorityFilter || "All"],
        ["Owner", ownerFilter || "All"],
        ["Project", projectFilter || "All"],
        ["Source", sourceFilter || "All"],
        ["Department", departmentFilter || "All"],
        ["Overdue Only", showOverdueOnly ? "Yes" : "No"],
      ];

      try {
        const logoResponse = await fetch("/logo.png");
        if (logoResponse.ok) {
          const logoBlob = await logoResponse.blob();
          const logoDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(String(reader.result || ""));
            reader.onerror = () => reject(new Error("Could not convert logo to data URL."));
            reader.readAsDataURL(logoBlob);
          });
          doc.addImage(logoDataUrl, "PNG", margin, 8, 44, 20);
        }
      } catch {
        // Keep report generation resilient if the logo cannot be loaded.
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(17);
      doc.setTextColor(15, 23, 42);
      doc.text("Filtered Action Register PDF", pageWidth / 2, 17, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(71, 85, 105);
      doc.text("Central Action Management register filtered to the current view.", pageWidth / 2, 23, {
        align: "center",
      });
      doc.text(`Generated: ${generatedAt}`, pageWidth - margin, 17, { align: "right" });
      doc.text(`Actions: ${filteredActions.length}`, pageWidth - margin, 23, { align: "right" });

      doc.setDrawColor(15, 118, 110);
      doc.setLineWidth(0.7);
      doc.line(margin, 31, pageWidth - margin, 31);

      autoTable(doc, {
        startY: 35,
        theme: "grid",
        margin: { left: margin, right: margin },
        body: filterSummaryRows,
        styles: {
          font: "helvetica",
          fontSize: 8.2,
          cellPadding: 1.6,
          lineColor: [203, 213, 225],
          lineWidth: 0.2,
          textColor: [15, 23, 42],
        },
        columnStyles: {
          0: { cellWidth: 30, fontStyle: "bold", fillColor: [248, 250, 252] },
          1: { cellWidth: 72 },
        },
      });

      const reportRows = filteredActions.map((action) => ({
        action_number: action.action_number || "-",
        title: action.title || "-",
        department: action.department || "-",
        source: getActionSourceLabel(action),
        linked_record: buildLinkedRecordDisplay(action),
        owner: action.owner || "-",
        priority: action.priority || "-",
        due_date: formatDate(action.due_date),
        status: action.status || "-",
        due_label: getDueLabel(action.due_date),
        is_overdue: isOverdue(action),
      }));

      autoTable(doc, {
        startY: ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 35) + 5,
        theme: "grid",
        margin: { left: margin, right: margin, bottom: 14 },
        tableWidth: "auto",
        columns: [
          { header: "Action No.", dataKey: "action_number" },
          { header: "Title", dataKey: "title" },
          { header: "Department", dataKey: "department" },
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
          lineColor: [203, 213, 225],
          lineWidth: 0.2,
          textColor: [15, 23, 42],
          overflow: "linebreak",
          valign: "top",
        },
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        columnStyles: {
          action_number: { cellWidth: 22 },
          title: { cellWidth: 48 },
          department: { cellWidth: 24 },
          source: { cellWidth: 26 },
          linked_record: { cellWidth: 44 },
          owner: { cellWidth: 26 },
          priority: { cellWidth: 18 },
          due_date: { cellWidth: 20 },
          status: { cellWidth: 20 },
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
          doc.setTextColor(100, 116, 139);
          doc.text("Enshore Action Management", margin, pageHeight - 6);
          doc.text(
            `Page ${doc.getCurrentPageInfo().pageNumber} of ${doc.getNumberOfPages()}`,
            pageWidth - margin,
            pageHeight - 6,
            { align: "right" }
          );
        },
      });

      doc.save(`filtered-action-register-${new Date().toISOString().slice(0, 10)}.pdf`);
      setMessage("Filtered Action Register PDF generated successfully.");
    } catch (error) {
      console.error(error);
      setMessage("Filtered Action Register PDF generation failed.");
    }
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("");
    setPriorityFilter("");
    setOwnerFilter("");
    setProjectFilter("");
    setSourceFilter("");
    setDepartmentFilter("");
    setShowOverdueOnly(false);
    setSelectedEvidenceAction(null);
  }

  return (
    <main>
      <QualityPageHero
        label="ACTION MANAGEMENT"
        title="Action Management"
        description="Central action register and follow-up control for quality, asset, risk, MOC, audit, and future HSE workflows."
        contextCards={[
          {
            label: "Last Refreshed",
            value: isLoading ? "Loading..." : formatDateTime(lastRefreshed?.toISOString()),
          },
          {
            label: "Latest Action",
            value: latestActionLabel,
          },
        ]}
      />

      <div
        style={{
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <Link href="/home" style={backLinkStyle}>
          ← Back to Dashboard
        </Link>

        <div style={statusBannerStyleInline}>
          <strong>Status:</strong> {message}
        </div>
      </div>

      <section style={statsGridStyle}>
        <QualityKpiCard title="Open Actions" value={openActions} accent="#2563eb" />
        <QualityKpiCard title="Closed / Complete" value={closedActions} accent="#16a34a" />
        <QualityKpiCard title="Overdue Actions" value={overdueActions} accent="#dc2626" />
        <QualityKpiCard title="Evidence Files" value={linkedEvidenceFiles.length} accent="#7c3aed" />
      </section>

      <section style={twoColumnGridStyle}>
        <SectionCard
          title="Create Action"
          subtitle="Add a new action with automatic numbering, project tracking and optional evidence upload."
        >
          <form onSubmit={addAction}>
            <div style={formGridStyle}>
              <Field label="Action Number">
                <input value={nextActionNumber} readOnly style={readOnlyInputStyle} />
              </Field>

              <Field label="Project">
                <input
                  placeholder="e.g. Wadden Sea"
                  value={form.project}
                  onChange={(e) => setForm({ ...form, project: e.target.value })}
                  style={inputStyle}
                />
              </Field>

              <Field label="Department">
                <select
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">Select department</option>
                  {departmentOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Title">
                <input
                  placeholder="Enter action title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  style={inputStyle}
                />
              </Field>

              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Description">
                  <textarea
                    placeholder="Enter fuller action detail or instructions"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    style={textAreaStyle}
                  />
                </Field>
              </div>

              <Field label="Owner">
                <select
                  value={form.owner}
                  onChange={(e) => setForm({ ...form, owner: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">Select owner</option>
                  {createOwnerOptions.map((owner) => (
                    <option key={owner} value={owner}>
                      {owner}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Priority">
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  style={inputStyle}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </Field>

              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  style={inputStyle}
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Closed">Closed</option>
                  <option value="Complete">Complete</option>
                </select>
              </Field>

              <Field label="Source">
                <select
                  value={form.source}
                  onChange={(e) => setForm((current) => applySourceChange(current, e.target.value))}
                  style={inputStyle}
                >
                  {actionSourceOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Due Date">
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  style={inputStyle}
                />
              </Field>

              {isAuditLinkedSource(form.source) ? (
                <Field label="Audit Number">
                  <select
                    value={form.linked_audit_id}
                    onChange={(e) => setForm((current) => applyAuditSelection(current, e.target.value))}
                    style={inputStyle}
                  >
                    <option value="">Select audit</option>
                    {auditOptions.map((audit) => (
                      <option key={audit.id} value={audit.id}>
                        {audit.audit_number}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}

              {form.source === "Audit Finding" ? (
                <Field label="Finding Reference">
                  <select
                    value={form.linked_finding_id}
                    onChange={(e) => setForm((current) => applyFindingSelection(current, e.target.value))}
                    style={inputStyle}
                    disabled={!form.linked_audit_id}
                  >
                    <option value="">{form.linked_audit_id ? "Select finding" : "Select audit first"}</option>
                    {createFindingOptions.map((finding) => (
                      <option key={finding.id} value={finding.id}>
                        {finding.reference}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}

              {form.source === "NCR/CAPA" ? (
                <Field label="NCR / CAPA Record">
                  <select
                    value={
                      form.linked_ncr_id
                        ? `NCR:${form.linked_ncr_id}`
                        : form.linked_capa_id
                        ? `CAPA:${form.linked_capa_id}`
                        : ""
                    }
                    onChange={(e) => setForm((current) => applyNcrCapaSelection(current, e.target.value))}
                    style={inputStyle}
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
                  <select
                    value={form.linked_moc_id}
                    onChange={(e) => setForm((current) => applyMocSelection(current, e.target.value))}
                    style={inputStyle}
                  >
                    <option value="">Select MOC</option>
                    {mocOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.number} - {option.title || "Untitled"}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}

              {isAssetLinkedSource(form.source) ? (
                <>
                  <Field label="Linked Asset Code">
                    <input value={form.linked_asset_code} readOnly style={readOnlyInputStyle} />
                  </Field>

                  {form.source === "Asset Inspection" ? (
                    <Field label="Inspection Number">
                      <input value={form.linked_inspection_number} readOnly style={readOnlyInputStyle} />
                    </Field>
                  ) : null}

                  {form.source === "Asset Maintenance" ? (
                    <Field label="Maintenance Number">
                      <input value={form.linked_maintenance_number} readOnly style={readOnlyInputStyle} />
                    </Field>
                  ) : null}
                </>
              ) : null}

              <Field label="Evidence Files (optional)">
                <input type="file" multiple onChange={handleCreateFileChange} style={inputStyle} />
              </Field>

              <Field label="Evidence Notes (optional)">
                <textarea
                  placeholder="Add a note for the uploaded evidence"
                  value={createEvidenceNotes}
                  onChange={(e) => setCreateEvidenceNotes(e.target.value)}
                  style={textAreaStyle}
                />
              </Field>
            </div>

            <SelectedFilesList files={createFiles} />

            <div style={formFooterStyle}>
              <button type="submit" style={primaryButtonStyle} disabled={isSaving}>
                {isSaving ? "Saving..." : "Add Action"}
              </button>
              <span style={helperTextStyle}>
                Numbering fills the next available slot automatically. Evidence uploads after the action is created.
              </span>
            </div>
          </form>
        </SectionCard>

        <SectionCard title="Priority View" subtitle="What needs chasing right now.">
          <div style={listGridStyle}>
            <MiniListCard
              title="Overdue First"
              emptyText="No overdue open actions."
              items={overdueList.map((action) => ({
                id: action.id,
                line1: `${action.action_number || "-"} — ${action.title || "Untitled action"}`,
                line2: `${action.project || "No project"} · ${action.owner || "No owner"} · ${getDueLabel(
                  action.due_date
                )}`,
                tone: "red" as const,
              }))}
            />

            <MiniListCard
              title="Due This Week"
              emptyText="No open actions due this week."
              items={dueSoonList.map((action) => ({
                id: action.id,
                line1: `${action.action_number || "-"} — ${action.title || "Untitled action"}`,
                line2: `${action.project || "No project"} · ${action.owner || "No owner"} · ${getDueLabel(
                  action.due_date
                )}`,
                tone: "amber" as const,
              }))}
            />
          </div>
        </SectionCard>
      </section>

      <SectionCard
        title="Action Register Filters"
        subtitle="Narrow the central register by text, status, priority, owner, project, source, department, or overdue state."
        action={
          <div style={filterActionRowStyle}>
            <button type="button" onClick={() => void generateFilteredActionRegisterPdf()} style={primaryButtonStyle}>
              Filtered Action Register PDF
            </button>
            <button type="button" onClick={clearFilters} style={secondaryButtonStyle}>
              Clear Filters
            </button>
          </div>
        }
      >
        <div style={filterBarStyle}>
          <input
            placeholder="Search action no. / title / project / owner"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={inputStyle}
          />

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
            <option value="">All Status</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Closed">Closed</option>
            <option value="Complete">Complete</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={inputStyle}
          >
            <option value="">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>

          <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} style={inputStyle}>
            <option value="">All Owners</option>
            {uniqueOwners.map((owner) => (
              <option key={String(owner)} value={String(owner)}>
                {String(owner)}
              </option>
            ))}
          </select>

          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            style={inputStyle}
          >
            <option value="">All Projects</option>
            {uniqueProjects.map((project) => (
              <option key={String(project)} value={String(project)}>
                {String(project)}
              </option>
            ))}
          </select>

          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} style={inputStyle}>
            <option value="">All Sources</option>
            <option value="Manual">Manual</option>
            <option value="Audit Finding">Audit Finding</option>
            <option value="Asset Inspection">Asset Inspection</option>
            <option value="Asset Maintenance">Asset Maintenance</option>
            <option value="Asset Calibration">Asset Calibration</option>
            <option value="NCR/CAPA">NCR/CAPA</option>
            <option value="MOC">MOC</option>
            <option value="Risk">Risk</option>
            <option value="HSE">HSE</option>
            <option value="Other">Other</option>
          </select>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            style={inputStyle}
          >
            <option value="">All Departments</option>
            {departmentOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowOverdueOnly((current) => !current)}
            style={{
              ...secondaryButtonStyle,
              background: showOverdueOnly ? "#0f172a" : "#e2e8f0",
              color: showOverdueOnly ? "#ffffff" : "#0f172a",
            }}
          >
            {showOverdueOnly ? "Showing Overdue Only" : "Include All Due Status"}
          </button>
        </div>

        <div style={tableInfoRowStyle}>
          <span>
            Showing <strong>{filteredActions.length}</strong> of <strong>{actions.length}</strong> actions
          </span>
          {linkedAction ? (
            <span style={linkedSearchHintStyle}>
              Linked match found: <strong>{linkedAction.action_number}</strong>
            </span>
          ) : null}
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={tableHeadStyle}>Action No.</th>
                <th style={tableHeadStyle}>Title</th>
                <th style={tableHeadStyle}>Department</th>
                <th style={tableHeadStyle}>Source</th>
                <th style={tableHeadStyle}>Linked Record</th>
                <th style={tableHeadStyle}>Owner</th>
                <th style={tableHeadStyle}>Due Date</th>
                <th style={tableHeadStyle}>Status</th>
                <th style={tableHeadStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredActions.length === 0 ? (
                <tr>
                  <td colSpan={9} style={emptyTableCellStyle}>
                    No actions match the current filters.
                  </td>
                </tr>
              ) : (
                filteredActions.map((action) => {
                  const overdue = isOverdue(action);
                  const selected = selectedEvidenceAction?.id === action.id;
                  const linkedMatch =
                    search.trim() &&
                    (action.action_number || "").trim().toLowerCase() === search.trim().toLowerCase();

                  return (
                    <tr
                      key={action.id}
                      onClick={() => setSelectedEvidenceAction(action)}
                      style={{
                        ...tableRowStyle,
                        cursor: "pointer",
                        background: overdue
                          ? "#fff7f7"
                          : selected
                          ? "#f5f3ff"
                          : linkedMatch
                          ? "#eff6ff"
                          : "white",
                      }}
                    >
                      <td style={tableCellStyle}>
                        <div style={actionNumberCellStyle}>{action.action_number || "-"}</div>
                      </td>
                      <td style={tableCellStyle}>
                        <div style={primaryCellTextStyle}>{action.title || "-"}</div>
                        <div style={secondaryCellTextStyle}>
                          {buildActionSourceLabel(action) || " "}
                        </div>
                      </td>
                      <td style={tableCellStyle}>
                        <span style={badgeStyle}>{action.department || "-"}</span>
                      </td>
                      <td style={tableCellStyle}>
                        <span style={badgeStyle}>{getActionSourceLabel(action)}</span>
                      </td>
                      <td style={tableCellStyle}>
                        <div style={secondaryCellTextStyle}>{buildLinkedRecordDisplay(action)}</div>
                      </td>
                      <td style={tableCellStyle}>{action.owner || "-"}</td>
                      <td style={tableCellStyle}>
                        <div style={primaryCellTextStyle}>{formatDate(action.due_date)}</div>
                        <div
                          style={{
                            ...secondaryCellTextStyle,
                            color: overdue ? "#b91c1c" : "#64748b",
                            fontWeight: overdue ? 700 : 500,
                          }}
                        >
                          {getDueLabel(action.due_date)}
                        </div>
                      </td>
                      <td style={tableCellStyle}>
                        <StatusBadge value={action.status || "Unknown"} />
                      </td>
                      <td style={tableCellStyle}>
                        <div style={actionButtonsWrapStyle}>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedEvidenceAction(action);
                            }}
                            style={miniButtonStyle}
                          >
                            Open
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              deleteAction(action.id);
                            }}
                            style={miniButtonDeleteStyle}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard
        title={
          selectedEvidenceAction
            ? `Action Detail — ${selectedEvidenceAction.action_number || "Action"}`
            : "Action Detail"
        }
        subtitle={
          selectedEvidenceAction
            ? "Edit the full action record, manage linked source information, and upload supporting evidence."
            : "Click an action row to open the full detail and edit panel."
        }
        action={
          selectedEvidenceAction ? (
            <button
              type="button"
              onClick={() => {
                setSelectedEvidenceAction(null);
                setSelectedEvidenceFiles([]);
                setSelectedEvidenceNotes("");
              }}
              style={secondaryButtonStyle}
            >
              Hide Panel
            </button>
          ) : null
        }
      >
        {!selectedEvidenceAction ? (
          <div style={emptyEvidencePanelStyle}>No action selected. Click a row in the register to open the action detail panel.</div>
        ) : (
          <div style={detailPanelGridStyle}>
            <div style={detailSectionCardStyle}>
              <div style={detailPanelHeaderStyle}>
                <div>
                  <div style={detailActionNumberStyle}>{selectedEvidenceAction.action_number || "-"}</div>
                  <div style={detailActionTitleStyle}>{selectedEvidenceAction.title || "Untitled Action"}</div>
                </div>
                <div style={detailBadgeWrapStyle}>
                  <PriorityBadge value={selectedEvidenceAction.priority || "Unknown"} />
                  <StatusBadge value={selectedEvidenceAction.status || "Unknown"} />
                </div>
              </div>

              <div style={detailFormGridStyle}>
                <Field label="Action Number">
                  <input value={selectedEvidenceAction.action_number || ""} readOnly style={readOnlyInputStyle} />
                </Field>

                <Field label="Source">
                  <select
                    value={editForm.source}
                    onChange={(e) => setEditForm((current) => applySourceChange(current, e.target.value))}
                    style={inputStyle}
                  >
                    {actionSourceOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Department">
                  <select
                    value={editForm.department}
                    onChange={(e) => setEditForm((current) => ({ ...current, department: e.target.value }))}
                    style={inputStyle}
                  >
                    <option value="">Select department</option>
                    {departmentOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Title">
                  <input
                    value={editForm.title}
                    onChange={(e) => setEditForm((current) => ({ ...current, title: e.target.value }))}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Owner">
                  <select
                    value={editForm.owner}
                    onChange={(e) => setEditForm((current) => ({ ...current, owner: e.target.value }))}
                    style={inputStyle}
                  >
                    <option value="">Select owner</option>
                    {editOwnerOptions.map((owner) => (
                      <option key={owner} value={owner}>
                        {owner}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Project">
                  <input
                    value={editForm.project}
                    onChange={(e) => setEditForm((current) => ({ ...current, project: e.target.value }))}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Priority">
                  <select
                    value={editForm.priority}
                    onChange={(e) => setEditForm((current) => ({ ...current, priority: e.target.value }))}
                    style={inputStyle}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </Field>

                <Field label="Status">
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm((current) => ({ ...current, status: e.target.value }))}
                    style={inputStyle}
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Closed">Closed</option>
                    <option value="Complete">Complete</option>
                  </select>
                </Field>

                <Field label="Due Date">
                  <input
                    type="date"
                    value={editForm.due_date}
                    onChange={(e) => setEditForm((current) => ({ ...current, due_date: e.target.value }))}
                    style={inputStyle}
                  />
                </Field>

                {isAuditLinkedSource(editForm.source) ? (
                  <Field label="Audit Number">
                    <select
                      value={editForm.linked_audit_id}
                      onChange={(e) => setEditForm((current) => applyAuditSelection(current, e.target.value))}
                      style={inputStyle}
                    >
                      <option value="">Select audit</option>
                      {auditOptions.map((audit) => (
                        <option key={audit.id} value={audit.id}>
                          {audit.audit_number}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : null}

                {editForm.source === "Audit Finding" ? (
                  <Field label="Finding Reference">
                    <select
                      value={editForm.linked_finding_id}
                      onChange={(e) => setEditForm((current) => applyFindingSelection(current, e.target.value))}
                      style={inputStyle}
                      disabled={!editForm.linked_audit_id}
                    >
                      <option value="">{editForm.linked_audit_id ? "Select finding" : "Select audit first"}</option>
                      {editFindingOptions.map((finding) => (
                        <option key={finding.id} value={finding.id}>
                          {finding.reference}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : null}

                {editForm.source === "NCR/CAPA" ? (
                  <Field label="NCR / CAPA Record">
                    <select
                      value={
                        editForm.linked_ncr_id
                          ? `NCR:${editForm.linked_ncr_id}`
                          : editForm.linked_capa_id
                          ? `CAPA:${editForm.linked_capa_id}`
                          : ""
                      }
                      onChange={(e) => setEditForm((current) => applyNcrCapaSelection(current, e.target.value))}
                      style={inputStyle}
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

                {editForm.source === "MOC" ? (
                  <Field label="MOC Record">
                    <select
                      value={editForm.linked_moc_id}
                      onChange={(e) => setEditForm((current) => applyMocSelection(current, e.target.value))}
                      style={inputStyle}
                    >
                      <option value="">Select MOC</option>
                      {mocOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.number} - {option.title || "Untitled"}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : null}

                {isAssetLinkedSource(editForm.source) ? (
                  <>
                    <Field label="Linked Asset Code">
                      <input value={editForm.linked_asset_code} readOnly style={readOnlyInputStyle} />
                    </Field>

                    {editForm.source === "Asset Inspection" ? (
                      <Field label="Inspection Number">
                        <input value={editForm.linked_inspection_number} readOnly style={readOnlyInputStyle} />
                      </Field>
                    ) : null}

                    {editForm.source === "Asset Maintenance" ? (
                      <Field label="Maintenance Number">
                        <input value={editForm.linked_maintenance_number} readOnly style={readOnlyInputStyle} />
                      </Field>
                    ) : null}
                  </>
                ) : null}

                <div style={{ gridColumn: "1 / -1" }}>
                  <Field label="Description">
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm((current) => ({ ...current, description: e.target.value }))}
                      style={textAreaStyle}
                    />
                  </Field>
                </div>
              </div>

              {(isAuditLinkedSource(editForm.source) ||
                isAssetLinkedSource(editForm.source) ||
                editForm.source === "NCR/CAPA" ||
                editForm.source === "MOC") &&
              (
                editForm.linked_audit_number ||
                editForm.linked_finding_reference ||
                editForm.linked_asset_code ||
                editForm.linked_inspection_number ||
                editForm.linked_maintenance_number ||
                editForm.linked_ncr_number ||
                editForm.linked_capa_number ||
                editForm.linked_moc_number
              ) ? (
                <div style={linkedSourceCardStyle}>
                  <div style={linkedSourceTitleStyle}>Linked Source</div>
                  <div style={linkedSourceMetaStyle}>Source: {editForm.source}</div>
                  {editForm.linked_audit_number ? (
                    <div style={linkedSourceMetaStyle}>
                      Audit Number: <strong>{editForm.linked_audit_number}</strong>
                    </div>
                  ) : null}
                  {editForm.linked_finding_reference ? (
                    <div style={linkedSourceMetaStyle}>
                      Finding Reference: <strong>{editForm.linked_finding_reference}</strong>
                    </div>
                  ) : null}
                  {editForm.linked_audit_number ? (
                    <Link
                      href={`/audits?search=${encodeURIComponent(editForm.linked_audit_number)}`}
                      style={backLinkStyle}
                    >
                      Open Linked Audit
                    </Link>
                  ) : null}
                  {isAssetLinkedSource(editForm.source) && editForm.linked_asset_code ? (
                    <div style={linkedSourceMetaStyle}>
                      Asset: <strong>{editForm.linked_asset_code}</strong>
                    </div>
                  ) : null}
                  {editForm.source === "Asset Inspection" && editForm.linked_inspection_number ? (
                    <>
                      <div style={linkedSourceMetaStyle}>
                        Inspection: <strong>{editForm.linked_inspection_number}</strong>
                      </div>
                      <Link
                        href={`/assets/inspection?asset=${encodeURIComponent(editForm.linked_asset_code || editForm.linked_asset_id)}`}
                        style={backLinkStyle}
                      >
                        Open Linked Inspection Log
                      </Link>
                    </>
                  ) : null}
                  {editForm.source === "Asset Maintenance" && editForm.linked_maintenance_number ? (
                    <>
                      <div style={linkedSourceMetaStyle}>
                        Maintenance: <strong>{editForm.linked_maintenance_number}</strong>
                      </div>
                      <Link
                        href={`/assets/maintenance?asset=${encodeURIComponent(editForm.linked_asset_code || editForm.linked_asset_id)}`}
                        style={backLinkStyle}
                      >
                        Open Linked Maintenance Log
                      </Link>
                    </>
                  ) : null}
                  {editForm.source === "Asset Calibration" && editForm.linked_asset_code ? (
                    <Link
                      href={`/assets/calibration?asset=${encodeURIComponent(editForm.linked_asset_code || editForm.linked_asset_id)}`}
                      style={backLinkStyle}
                    >
                      Open Linked Calibration Log
                    </Link>
                  ) : null}
                  {editForm.source === "NCR/CAPA" && editForm.linked_ncr_number ? (
                    <div style={linkedSourceMetaStyle}>
                      NCR: <strong>{editForm.linked_ncr_number}</strong>
                    </div>
                  ) : null}
                  {editForm.source === "NCR/CAPA" && editForm.linked_capa_number ? (
                    <div style={linkedSourceMetaStyle}>
                      CAPA: <strong>{editForm.linked_capa_number}</strong>
                    </div>
                  ) : null}
                  {editForm.source === "MOC" && editForm.linked_moc_number ? (
                    <div style={linkedSourceMetaStyle}>
                      MOC: <strong>{editForm.linked_moc_number}</strong>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div style={formFooterStyle}>
                <button
                  type="button"
                  onClick={() => saveEdit(selectedEvidenceAction.id)}
                  style={primaryButtonStyle}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Action"}
                </button>
                <span style={helperTextStyle}>
                  Title stays short for the register; description holds the fuller action detail.
                </span>
              </div>
            </div>

            <div style={detailSectionCardStyle}>
              <div style={evidencePanelHeadingStyle}>Evidence</div>
              <div style={evidenceMetaTextStyle}>
                Upload follow-up files against <strong>{selectedEvidenceAction.action_number || "this action"}</strong>.
              </div>

              <div style={evidenceFieldWrapStyle}>
                <label style={fieldLabelStyle}>Select files</label>
                <input type="file" multiple onChange={handleSelectedEvidenceFileChange} style={inputStyle} />
              </div>

              <div style={evidenceFieldWrapStyle}>
                <label style={fieldLabelStyle}>Evidence Notes (optional)</label>
                <textarea
                  placeholder="Add a note for the uploaded evidence"
                  value={selectedEvidenceNotes}
                  onChange={(e) => setSelectedEvidenceNotes(e.target.value)}
                  style={textAreaStyle}
                />
              </div>

              <SelectedFilesList files={selectedEvidenceFiles} />

              <div style={formFooterStyle}>
                <button
                  type="button"
                  onClick={uploadEvidenceToSelectedAction}
                  style={primaryButtonStyle}
                  disabled={isUploadingEvidence}
                >
                  {isUploadingEvidence ? "Uploading..." : "Upload Evidence"}
                </button>
              </div>

              <div style={evidencePanelHeadingStyle}>Attached Files</div>

              {selectedActionEvidence.length === 0 ? (
                <p style={emptyTextStyle}>No evidence attached to this action yet.</p>
              ) : (
                <div style={evidenceListWrapStyle}>
                  {selectedActionEvidence.map((file) => (
                    <div key={file.id} style={evidenceItemStyle}>
                      <div style={{ minWidth: 0 }}>
                        <div style={evidenceFileNameStyle}>{file.file_name}</div>
                        <div style={evidenceMetaTextStyle}>
                          {formatFileSize(file.file_size)} · {file.content_type || "Unknown type"} · Uploaded{" "}
                          {formatDateTime(file.uploaded_at)}
                        </div>
                        {file.notes ? <div style={evidenceNoteStyle}>Note: {file.notes}</div> : null}
                      </div>

                      <div style={actionButtonsWrapStyle}>
                        <button type="button" onClick={() => openEvidence(file)} style={miniButtonStyle}>
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteEvidence(file)}
                          style={miniButtonDeleteStyle}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SectionCard>
    </main>
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

function SectionCard({
  title,
  subtitle,
  action,
  children,
  }: {
    title: string;
    subtitle?: string;
    action?: ReactNode;
    children: ReactNode;
  }) {
    return (
      <section style={panelStyle}>
        <ModuleSectionHeader title={title} subtitle={subtitle} actions={action} />
        {children}
      </section>
    );
  }

function HeroPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "amber" | "red" | "blue" | "neutral";
}) {
  const tones = {
    green: { bg: "rgba(220,252,231,0.15)", border: "rgba(220,252,231,0.26)", text: "#dcfce7" },
    amber: { bg: "rgba(254,243,199,0.15)", border: "rgba(254,243,199,0.28)", text: "#fef3c7" },
    red: { bg: "rgba(254,226,226,0.15)", border: "rgba(254,226,226,0.28)", text: "#fee2e2" },
    blue: { bg: "rgba(219,234,254,0.15)", border: "rgba(219,234,254,0.28)", text: "#dbeafe" },
    neutral: { bg: "rgba(255,255,255,0.12)", border: "rgba(255,255,255,0.20)", text: "#ffffff" },
  };

  const colours = tones[tone];

  return (
    <div
      style={{
        ...heroPillStyle,
        background: colours.bg,
        border: `1px solid ${colours.border}`,
      }}
    >
      <div style={heroPillLabelStyle}>{label}</div>
      <div style={{ ...heroPillValueStyle, color: colours.text }}>{value}</div>
    </div>
  );
}

function MiniListCard({
  title,
  emptyText,
  items,
}: {
  title: string;
  emptyText: string;
  items: Array<{
    id: string;
    line1: string;
    line2: string;
    tone: "red" | "amber";
  }>;
}) {
  return (
    <div style={miniListCardStyle}>
      <h3 style={miniListTitleStyle}>{title}</h3>

      {items.length === 0 ? (
        <p style={emptyTextStyle}>{emptyText}</p>
      ) : (
        <div style={miniListWrapStyle}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                ...miniListItemStyle,
                borderLeft: item.tone === "red" ? "4px solid #dc2626" : "4px solid #f59e0b",
                background: item.tone === "red" ? "#fef2f2" : "#fffbeb",
              }}
            >
              <div style={miniListLine1Style}>{item.line1}</div>
              <div style={miniListLine2Style}>{item.line2}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SelectedFilesList({ files }: { files: File[] }) {
  if (files.length === 0) {
    return <div style={selectedFilesEmptyStyle}>No files selected.</div>;
  }

  return (
    <div style={selectedFilesWrapStyle}>
      {files.map((file, index) => (
        <div key={`${file.name}-${index}`} style={selectedFileChipStyle}>
          <span>{file.name}</span>
          <span style={selectedFileMetaStyle}>{formatFileSize(file.size)}</span>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  const lower = normaliseStatus(value);

  const styles =
    lower === "closed" || lower === "complete" || lower === "completed"
      ? { background: "#dcfce7", color: "#166534" }
      : lower === "open"
      ? { background: "#dbeafe", color: "#1d4ed8" }
      : lower === "in progress"
      ? { background: "#fef3c7", color: "#92400e" }
      : { background: "#e5e7eb", color: "#374151" };

  return <span style={{ ...badgeStyle, ...styles }}>{value}</span>;
}

function PriorityBadge({ value }: { value: string }) {
  const lower = value.toLowerCase();

  const styles =
    lower === "high"
      ? { background: "#fee2e2", color: "#991b1b" }
      : lower === "medium"
      ? { background: "#fef3c7", color: "#92400e" }
      : lower === "low"
      ? { background: "#dcfce7", color: "#166534" }
      : { background: "#e5e7eb", color: "#374151" };

  return <span style={{ ...badgeStyle, ...styles }}>{value}</span>;
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

const priorityStripStyle: CSSProperties = {
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

const heroMetaWrapStyle: CSSProperties = {
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

const heroMetaValueStyleSmall: CSSProperties = {
  fontSize: "15px",
  fontWeight: 700,
  lineHeight: 1.4,
};

const backLinkStyle: CSSProperties = {
  color: "#0f766e",
  fontWeight: 700,
  textDecoration: "none",
};

const statusBannerStyleInline: CSSProperties = {
  background: "white",
  borderRadius: "12px",
  padding: "12px 16px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
  color: "#0f172a",
};

const statsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "16px",
  marginBottom: "20px",
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

const sectionHeaderRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  marginBottom: "16px",
  flexWrap: "wrap",
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

const fieldWrapStyle: CSSProperties = {
  display: "grid",
  gap: "6px",
};

const fieldLabelStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 700,
  color: "#334155",
};

const formGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "14px",
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

const textAreaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: "92px",
  resize: "vertical",
  fontFamily: "Arial, Helvetica, sans-serif",
};

const readOnlyInputStyle: CSSProperties = {
  padding: "11px 12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  background: "#f8fafc",
  color: "#334155",
  width: "100%",
  fontWeight: 700,
  boxSizing: "border-box",
};

const smallInputStyle: CSSProperties = {
  padding: "8px 10px",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  width: "100%",
  background: "white",
  color: "#0f172a",
  boxSizing: "border-box",
};

const formFooterStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
  marginTop: "16px",
};

const filterActionRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
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

const secondaryButtonStyle: CSSProperties = {
  background: "#e2e8f0",
  color: "#0f172a",
  border: "none",
  padding: "10px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 700,
};

const miniButtonStyle: CSSProperties = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};

const miniButtonGreyStyle: CSSProperties = {
  background: "#64748b",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};

const miniButtonPurpleStyle: CSSProperties = {
  background: "#7c3aed",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};

const miniButtonDeleteStyle: CSSProperties = {
  background: "#dc2626",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};

const listGridStyle: CSSProperties = {
  display: "grid",
  gap: "16px",
};

const miniListCardStyle: CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  padding: "14px",
};

const miniListTitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: "12px",
  fontSize: "16px",
  color: "#0f172a",
};

const miniListWrapStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
};

const miniListItemStyle: CSSProperties = {
  borderRadius: "12px",
  padding: "12px 14px",
};

const miniListLine1Style: CSSProperties = {
  fontWeight: 700,
  color: "#0f172a",
  fontSize: "14px",
};

const miniListLine2Style: CSSProperties = {
  color: "#64748b",
  fontSize: "13px",
  marginTop: "4px",
  lineHeight: 1.45,
};

const filterBarStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2fr repeat(7, minmax(0, 1fr))",
  gap: "12px",
  marginBottom: "16px",
};

const tableInfoRowStyle: CSSProperties = {
  marginBottom: "12px",
  color: "#475569",
  fontSize: "14px",
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
};

const linkedSearchHintStyle: CSSProperties = {
  color: "#1d4ed8",
  fontWeight: 600,
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const tableHeadStyle: CSSProperties = {
  textAlign: "left",
  padding: "12px 10px",
  borderBottom: "1px solid #e2e8f0",
  color: "#475569",
  fontSize: "13px",
  whiteSpace: "nowrap",
};

const tableRowStyle: CSSProperties = {
  transition: "background 0.2s ease",
};

const tableCellStyle: CSSProperties = {
  padding: "14px 10px",
  borderBottom: "1px solid #f1f5f9",
  color: "#0f172a",
  verticalAlign: "middle",
};

const primaryCellTextStyle: CSSProperties = {
  fontWeight: 600,
  color: "#0f172a",
};

const secondaryCellTextStyle: CSSProperties = {
  fontSize: "12px",
  color: "#64748b",
  marginTop: "4px",
};

const actionNumberCellStyle: CSSProperties = {
  fontWeight: 800,
  color: "#0f766e",
  whiteSpace: "nowrap",
};

const readOnlyTableCellStyle: CSSProperties = {
  padding: "8px 10px",
  borderRadius: "8px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  fontWeight: 700,
  color: "#334155",
};

const emptyTableCellStyle: CSSProperties = {
  padding: "24px 10px",
  textAlign: "center",
  color: "#64748b",
};

const actionButtonsWrapStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
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

const selectedFilesWrapStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginTop: "14px",
};

const selectedFileChipStyle: CSSProperties = {
  display: "inline-flex",
  gap: "8px",
  alignItems: "center",
  padding: "8px 10px",
  borderRadius: "999px",
  background: "#eef2ff",
  color: "#3730a3",
  fontSize: "12px",
  fontWeight: 700,
};

const selectedFileMetaStyle: CSSProperties = {
  opacity: 0.8,
};

const selectedFilesEmptyStyle: CSSProperties = {
  marginTop: "14px",
  fontSize: "13px",
  color: "#64748b",
};

const evidenceCountBadgeStyle: CSSProperties = {
  display: "inline-block",
  minWidth: "32px",
  textAlign: "center",
  padding: "5px 10px",
  borderRadius: "999px",
  background: "#ede9fe",
  color: "#6d28d9",
  fontWeight: 800,
  fontSize: "12px",
};

const emptyEvidencePanelStyle: CSSProperties = {
  padding: "18px",
  borderRadius: "14px",
  background: "#f8fafc",
  border: "1px dashed #cbd5e1",
  color: "#64748b",
};

const evidencePanelGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "0.95fr 1.05fr",
  gap: "18px",
};

const evidenceUploadCardStyle: CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  padding: "16px",
};

const evidenceListCardStyle: CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  padding: "16px",
};

const evidencePanelHeadingStyle: CSSProperties = {
  fontSize: "16px",
  fontWeight: 700,
  color: "#0f172a",
  marginBottom: "10px",
};

const evidenceMetaTextStyle: CSSProperties = {
  fontSize: "13px",
  color: "#64748b",
  lineHeight: 1.45,
};

const evidenceFieldWrapStyle: CSSProperties = {
  display: "grid",
  gap: "6px",
  marginTop: "14px",
};

const linkedSourceCardStyle: CSSProperties = {
  border: "1px solid #dbe4f0",
  borderRadius: "14px",
  background: "#f8fafc",
  padding: "12px 14px",
  display: "grid",
  gap: "6px",
  marginTop: "12px",
};

const linkedSourceTitleStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 800,
  color: "#0f172a",
};

const linkedSourceMetaStyle: CSSProperties = {
  fontSize: "13px",
  color: "#475569",
};

const detailPanelGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, 0.8fr)",
  gap: "16px",
};

const detailSectionCardStyle: CSSProperties = {
  border: "1px solid #dbe4f0",
  borderRadius: "16px",
  background: "#ffffff",
  padding: "16px",
  display: "grid",
  gap: "14px",
};

const detailPanelHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const detailActionNumberStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#0f766e",
};

const detailActionTitleStyle: CSSProperties = {
  fontSize: "22px",
  fontWeight: 800,
  color: "#0f172a",
};

const detailBadgeWrapStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const detailFormGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "14px",
};

const evidenceListWrapStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
};

const evidenceItemStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "14px",
  padding: "14px",
  borderRadius: "12px",
  background: "white",
  border: "1px solid #e2e8f0",
};

const evidenceFileNameStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 700,
  color: "#0f172a",
  wordBreak: "break-word",
};

const evidenceNoteStyle: CSSProperties = {
  marginTop: "6px",
  fontSize: "13px",
  color: "#475569",
  lineHeight: 1.45,
};
export default function ActionsPage() {
  return (
    <Suspense fallback={<main style={{ padding: "24px" }}>Loading actions...</main>}>
      <ActionsPageContent />
    </Suspense>
  );
}

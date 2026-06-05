"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { QualityKpiCard } from "../../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../../src/components/QualityPageHero";
import { supabase } from "../../../src/lib/supabase";

export const dynamic = "force-dynamic";

type AssetActionView = "dashboard" | "register" | "create";

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
  created_at?: string | null;
  updated_at?: string | null;
};

type PersonOption = {
  id: string;
  name: string;
  role: string | null;
  department: string | null;
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

const viewTabs: Array<{ id: AssetActionView; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "register", label: "Action Register" },
  { id: "create", label: "Create Action" },
];

const priorityOptions = ["Low", "Medium", "High"];
const statusOptions = ["Open", "In Progress", "Closed", "Complete"];
const sourceOptions = [
  "Manual",
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

export default function AssetActionsPage() {
  const [actions, setActions] = useState<ActionItem[]>([]);
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
  const [activeView, setActiveView] = useState<AssetActionView>("dashboard");
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [showRegisterFilters, setShowRegisterFilters] = useState(false);
  const [pressureFilter, setPressureFilter] = useState<"" | "overdue" | "dueWeek">("");
  const [form, setForm] = useState<ActionForm>(emptyForm);
  const [message, setMessage] = useState("Loading Asset actions...");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState("");

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [actionsRes, peopleRes, auditRes, findingRes, ncrRes, capaRes, mocRes, ainmRes, assetsRes, inspectionsRes, maintenanceRes, calibrationsRes] = await Promise.all([
      supabase.from("actions").select("*").order("action_number", { ascending: true }),
      supabase.from("people").select("id,name,role,department,active").eq("active", true).order("name", { ascending: true }),
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
    ]);

    if (actionsRes.error) {
      setMessage(`Asset actions failed to load: ${actionsRes.error.message}`);
      setLoading(false);
      return;
    }

    const allActions = ((actionsRes.data || []) as ActionItem[]).sort((a, b) => {
      const aNum = extractActionNumber(a.action_number);
      const bNum = extractActionNumber(b.action_number);
      if (aNum !== null && bNum !== null) return aNum - bNum;
      return (a.action_number || "").localeCompare(b.action_number || "");
    });
    const assetActions = allActions.filter((action) => (action.department || "").trim().toUpperCase() === "ASSETS");
    setActions(assetActions);
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
    setMessage(`Loaded ${assetActions.length} Asset action${assetActions.length === 1 ? "" : "s"}.`);
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
    return ["Open", "In Progress", "Closed", "Complete"].map((status) => ({
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
      ].join(" ").toLowerCase();
      return (
        (!query || haystack.includes(query)) &&
        (!statusFilter || (action.status || "") === statusFilter) &&
        (!ownerFilter || (action.owner || "") === ownerFilter) &&
        (!priorityFilter || (action.priority || "") === priorityFilter) &&
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
  }, [actions, ownerFilter, pressureFilter, priorityFilter, search, statusFilter]);

  async function createAction(event: React.FormEvent) {
    event.preventDefault();
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
      department: "Assets",
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
    }]);

    setSaving(false);
    if (error) {
      setMessage(`Create action failed: ${error.message}`);
      return;
    }
    setForm(emptyForm);
    setMessage(`${nextNumber} created in central Action Management as an Asset action.`);
    setActiveView("register");
    await loadData();
  }

  async function getNextNumberFromAllActions() {
    const { data } = await supabase.from("actions").select("action_number");
    return getNextActionNumber((data || []) as ActionItem[]);
  }

  function openRegister(status = "") {
    setStatusFilter(status);
    setPressureFilter("");
    setActiveView("register");
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

  return (
    <main>
      <QualityPageHero
        label="ASSET MANAGEMENT"
        title="Asset Actions"
        description="Asset-specific action dashboard, register, and creation view backed by the central Action Management register."
        contextCards={[
          { label: "Last Refreshed", value: lastRefreshed || (loading ? "Loading" : "-") },
          { label: "Latest Asset Action", value: latestAction ? `${latestAction.action_number} - ${latestAction.title}` : "No Asset actions" },
        ]}
      />

      <div style={topMetaRowStyle}>
        <Link href="/assets/dashboard" style={backLinkStyle}>← Back to Dashboard</Link>
        <div style={topMetaActionsStyle}>
          <Link href="/actions?department=Assets" style={primaryLinkStyle}>Open Central Actions</Link>
          <div style={statusBannerStyle}><strong>Status:</strong> {message}</div>
        </div>
      </div>

      <nav style={viewNavStyle}>
        {viewTabs.map((tab) => (
          <button key={tab.id} type="button" style={activeView === tab.id ? activeViewButtonStyle : viewButtonStyle} onClick={() => setActiveView(tab.id)}>
            {tab.label}
          </button>
        ))}
      </nav>

      {activeView === "dashboard" ? (
        <>
          <section style={statsGridStyle}>
            <QualityKpiCard title="Asset Actions" value={kpis.total} accent="#3A9B98" onClick={() => openRegister()} />
            <QualityKpiCard title="Open Actions" value={kpis.open} accent="#2563eb" onClick={() => openRegister("Open")} />
            <QualityKpiCard title="Overdue Actions" value={kpis.overdue} accent="#dc2626" onClick={() => { setStatusFilter(""); setPriorityFilter(""); setPressureFilter("overdue"); setActiveView("register"); }} />
            <QualityKpiCard title="Due This Week" value={kpis.dueWeek} accent="#f59e0b" onClick={() => { setStatusFilter(""); setPriorityFilter(""); setPressureFilter("dueWeek"); setActiveView("register"); }} />
            <QualityKpiCard title="High Priority Open" value={kpis.high} accent="#7c3aed" onClick={() => { setPriorityFilter("High"); setStatusFilter(""); setPressureFilter(""); setActiveView("register"); }} />
            <QualityKpiCard title="Completed Actions" value={kpis.closed} accent="#16a34a" onClick={() => openRegister("Closed")} />
          </section>

          <section style={dashboardGridStyle}>
            <SectionCard title="Open Actions by Person" subtitle="Who is carrying the current Asset action load.">
              <BarList rows={ownerRows} total={Math.max(1, kpis.open)} accent="#2563eb" onClick={(owner) => { setOwnerFilter(owner === "Unassigned" ? "" : owner); setActiveView("register"); }} />
            </SectionCard>
            <SectionCard title="Asset Action Status" subtitle="Open, in progress, and closed position.">
              <BarList rows={statusRows} total={Math.max(1, actions.length)} accent="#3A9B98" onClick={(status) => openRegister(status)} />
            </SectionCard>
            <SectionCard title="Source Split" subtitle="Where Asset actions are being generated from.">
              <BarList rows={sourceRows} total={Math.max(1, actions.length)} accent="#7c3aed" />
            </SectionCard>
            <SectionCard title="Manager Focus" subtitle="Immediate Asset action pressure requiring management attention.">
              <div style={focusGridStyle}>
                <MiniFocus label="Overdue" value={kpis.overdue} tone="red" onClick={() => { setStatusFilter(""); setPriorityFilter(""); setSearch(""); setPressureFilter("overdue"); setActiveView("register"); }} />
                <MiniFocus label="Due this week" value={kpis.dueWeek} tone="amber" onClick={() => { setStatusFilter(""); setPriorityFilter(""); setSearch(""); setPressureFilter("dueWeek"); setActiveView("register"); }} />
                <MiniFocus label="High priority" value={kpis.high} tone="purple" onClick={() => { setPriorityFilter("High"); setStatusFilter(""); setSearch(""); setPressureFilter(""); setActiveView("register"); }} />
              </div>
            </SectionCard>
          </section>
        </>
      ) : null}

      {activeView === "register" ? (
        <SectionCard title="Asset Action Register" subtitle="Central Action Management records filtered to department Assets.">
          <div style={toolbarStyle}>
            <input style={inputStyle} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Asset Actions..." />
            <button type="button" style={showRegisterFilters ? secondaryButtonStyle : primaryButtonStyle} onClick={() => setShowRegisterFilters((current) => !current)}>
              {showRegisterFilters ? "Hide Filters" : "Show Filters"}
            </button>
          </div>

          {showRegisterFilters ? (
          <div style={toolbarStyle}>
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
            <button type="button" style={secondaryButtonStyle} onClick={() => { setSearch(""); setStatusFilter(""); setOwnerFilter(""); setPriorityFilter(""); setPressureFilter(""); }}>Clear</button>
          </div>
          ) : null}

          <div style={tableInfoStyle}>Showing {filteredActions.length} of {actions.length} Asset Actions</div>
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Action No.</th>
                  <th style={thStyle}>Title</th>
                  <th style={thStyle}>Owner</th>
                  <th style={thStyle}>Source</th>
                  <th style={thStyle}>Due Date</th>
                  <th style={thStyle}>Priority</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredActions.length ? filteredActions.map((action) => (
                  <tr key={action.id} style={selectedId === action.id ? selectedRowStyle : trStyle} onClick={() => setSelectedId(action.id)}>
                    <td style={tdStrongStyle}>{action.action_number || "-"}</td>
                    <td style={tdStyle}>
                      <strong>{action.title || "-"}</strong>
                      <div style={mutedTextStyle}>{action.project || "No project"}{action.linked_ainm_number ? ` | AINM ${action.linked_ainm_number}` : ""}</div>
                    </td>
                    <td style={tdStyle}>{action.owner || "-"}</td>
                    <td style={tdStyle}>{action.source || "-"}</td>
                    <td style={tdStyle}>
                      <strong>{formatDate(action.due_date)}</strong>
                      <div style={{ ...mutedTextStyle, color: isOverdue(action) ? "#b91c1c" : "#64748b" }}>{getDueLabel(action.due_date)}</div>
                    </td>
                    <td style={tdStyle}>{action.priority || "-"}</td>
                    <td style={tdStyle}><StatusPill status={action.status || "Open"} /></td>
                    <td style={tdStyle}><Link href={`/actions?actionId=${encodeURIComponent(action.id)}`} style={smallLinkStyle}>Open Central</Link></td>
                  </tr>
                )) : (
                  <tr><td colSpan={8} style={emptyCellStyle}>No Asset actions match the current filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {selectedAction ? (
            <div style={detailCardStyle}>
              <h3 style={detailTitleStyle}>{selectedAction.action_number} - {selectedAction.title}</h3>
              <p style={emptyTextStyle}>{selectedAction.description || "No description captured."}</p>
              <div style={detailMetaGridStyle}>
                <span><strong>Owner:</strong> {selectedAction.owner || "-"}</span>
                <span><strong>Status:</strong> {selectedAction.status || "-"}</span>
                <span><strong>Priority:</strong> {selectedAction.priority || "-"}</span>
                <span><strong>Due:</strong> {formatDate(selectedAction.due_date)}</span>
              </div>
              <Link href={`/actions?actionId=${encodeURIComponent(selectedAction.id)}`} style={primaryLinkStyle}>Open / Edit in Central Actions</Link>
            </div>
          ) : null}
        </SectionCard>
      ) : null}

      {activeView === "create" ? (
        <SectionCard title="Create Asset Action" subtitle="Creates a central Action Management record with department Assets.">
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
              <button type="submit" style={primaryButtonStyle} disabled={saving}>{saving ? "Creating..." : "Create Asset Action"}</button>
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

function StatusPill({ status }: { status: string }) {
  const closed = isClosedLikeStatus(status);
  return <span style={{ ...pillStyle, background: closed ? "#dcfce7" : "#dbeafe", color: closed ? "#166534" : "#1d4ed8" }}>{status || "Open"}</span>;
}

function BarList({ rows, total, accent, onClick }: { rows: { label: string; value: number }[]; total: number; accent: string; onClick?: (label: string) => void }) {
  if (!rows.length) return <div style={emptyBoxStyle}>No data available yet.</div>;
  return <div style={barListStyle}>{rows.map((row) => <button key={row.label} type="button" style={barRowStyle} onClick={() => onClick?.(row.label)}><span style={barLabelStyle}><strong>{row.label}</strong><span>{row.value}</span></span><span style={barTrackStyle}><span style={{ ...barFillStyle, background: accent, width: `${Math.max(4, Math.round((row.value / total) * 100))}%` }} /></span></button>)}</div>;
}

function MiniFocus({ label, value, tone, onClick }: { label: string; value: number; tone: "red" | "amber" | "purple"; onClick?: () => void }) {
  const colours = { red: "#dc2626", amber: "#f59e0b", purple: "#7c3aed" };
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
  border: "1px solid #dbe3ef",
  borderRadius: "16px",
  padding: "12px 14px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
};
const topMetaActionsStyle: CSSProperties = { display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" };
const backLinkStyle: CSSProperties = { color: "#3A9B98", fontWeight: 700, textDecoration: "none" };
const statusBannerStyle: CSSProperties = { background: "white", borderRadius: "12px", padding: "12px 16px", boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)", color: "#0f172a" };
const primaryLinkStyle: CSSProperties = { background: "#3A9B98", color: "white", border: "none", padding: "11px 16px", borderRadius: "10px", cursor: "pointer", fontWeight: 800, textDecoration: "none", display: "inline-flex", alignItems: "center" };
const smallLinkStyle: CSSProperties = { ...primaryLinkStyle, padding: "8px 10px", fontSize: 12 };
const viewNavStyle: CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 };
const viewButtonStyle: CSSProperties = { background: "#e2e8f0", color: "#0f172a", border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 800, cursor: "pointer", minHeight: "44px", display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1.2, boxSizing: "border-box" };
const activeViewButtonStyle: CSSProperties = { ...viewButtonStyle, background: "#3A9B98", color: "white" };
const statsGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: "16px", marginBottom: "20px" };
const dashboardGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "20px" };
const panelStyle: CSSProperties = { background: "white", borderRadius: "18px", padding: "20px", boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)", marginBottom: 20 };
const sectionHeaderStyle: CSSProperties = { background: "#3A9B98", borderRadius: 10, padding: "12px 14px", marginBottom: 16 };
const sectionTitleStyle: CSSProperties = { margin: 0, fontSize: "18px", color: "white" };
const sectionSubtitleStyle: CSSProperties = { color: "rgba(255,255,255,0.82)", margin: "4px 0 0", lineHeight: 1.45, fontSize: 13 };
const emptyTextStyle: CSSProperties = { color: "#64748b", margin: 0, lineHeight: 1.55, fontSize: 13 };
const toolbarStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
  alignItems: "end",
  marginBottom: "14px",
  padding: "12px",
  border: "1px solid #dbe3ef",
  borderRadius: "16px",
  background: "rgba(248,250,252,0.92)",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
};
const inputStyle: CSSProperties = { width: "100%", minHeight: 42, border: "1px solid #cbd5e1", borderRadius: 10, padding: "10px 12px", fontSize: 14, boxSizing: "border-box", color: "#0f172a", background: "white" };
const readOnlyInputStyle: CSSProperties = { ...inputStyle, background: "#f8fafc", color: "#64748b" };
const textareaStyle: CSSProperties = { ...inputStyle, minHeight: 110, resize: "vertical", lineHeight: 1.45 };
const secondaryButtonStyle: CSSProperties = { border: "1px solid #cbd5e1", background: "#e2e8f0", color: "#0f172a", borderRadius: 10, padding: "10px 13px", fontWeight: 800, cursor: "pointer" };
const primaryButtonStyle: CSSProperties = { border: "none", background: "#3A9B98", color: "white", borderRadius: 10, padding: "11px 14px", fontWeight: 900, cursor: "pointer" };
const tableInfoStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: "4px",
  flexWrap: "wrap",
  color: "#475569",
  fontSize: "13px",
  fontWeight: 700,
  margin: "12px 0",
};
const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  background: "#ffffff",
  minWidth: 960,
  fontSize: "13px",
};
const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "13px 14px",
  background: "#f8fafc",
  color: "#334155",
  fontSize: "12px",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  borderBottom: "1px solid #dbe3ef",
  whiteSpace: "nowrap",
};
const tdStyle: CSSProperties = {
  padding: "13px 14px",
  borderBottom: "1px solid #edf2f7",
  color: "#0f172a",
  verticalAlign: "middle",
  fontSize: "13px",
  lineHeight: 1.45,
};
const tdStrongStyle: CSSProperties = { ...tdStyle, fontWeight: 900, color: "#3A9B98" };
const trStyle: CSSProperties = { cursor: "pointer" };
const selectedRowStyle: CSSProperties = { cursor: "pointer", background: "#ecfeff" };
const mutedTextStyle: CSSProperties = { color: "#64748b", fontSize: 12, marginTop: 4 };
const emptyCellStyle: CSSProperties = {
  padding: "26px 14px",
  textAlign: "center",
  color: "#64748b",
  background: "#f8fafc",
  borderBottom: "1px dashed #cbd5e1",
};
const detailCardStyle: CSSProperties = {
  marginTop: 18,
  border: "1px solid #dbe3ef",
  borderRadius: "18px",
  padding: "18px",
  background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
  display: "grid",
  gap: 12,
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
  minWidth: 0,
};
const detailTitleStyle: CSSProperties = { margin: 0, color: "#0f172a", fontSize: 18 };
const detailMetaGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10, color: "#334155", fontSize: 13 };
const formGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 };
const fieldStyle: CSSProperties = { display: "grid", gap: 6 };
const labelStyle: CSSProperties = { color: "#334155", fontSize: 12, fontWeight: 900 };
const buttonRowStyle: CSSProperties = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 14 };
const pillStyle: CSSProperties = { display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "5px 9px", fontSize: 12, fontWeight: 900 };
const barListStyle: CSSProperties = { display: "grid", gap: 12 };
const barRowStyle: CSSProperties = { display: "grid", gap: 7, border: "none", background: "transparent", padding: 0, textAlign: "left", cursor: "pointer" };
const barLabelStyle: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, color: "#0f172a", fontSize: 13 };
const barTrackStyle: CSSProperties = { height: 12, background: "#e2e8f0", borderRadius: 999, overflow: "hidden" };
const barFillStyle: CSSProperties = { display: "block", height: "100%", borderRadius: 999 };
const emptyBoxStyle: CSSProperties = { border: "1px dashed #cbd5e1", borderRadius: 12, padding: 16, color: "#64748b", background: "white" };
const focusGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 };
const miniFocusStyle: CSSProperties = { border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, display: "grid", gap: 8, color: "#0f172a", background: "white", textAlign: "left", cursor: "pointer" };


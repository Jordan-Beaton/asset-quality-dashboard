"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { useImsPermissions } from "../../../src/components/ImsPermissions";
import { ImsButton, ImsFilterPanel, ImsPanel, ImsTabs, ImsTopMetaRow } from "../../../src/components/ImsPrimitives";
import {
  imsColours,
  imsFieldsetStyle,
  imsFormGridStyle,
  imsInputStyle,
  imsTableCellStyle,
  imsTableHeadStyle,
  imsTableInfoRowStyle,
  imsTableStyle,
  imsTextareaStyle,
} from "../../../src/components/imsTheme";
import { QualityKpiCard } from "../../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../../src/components/QualityPageHero";
import { exportPdfTableTheme, exportRgb, exportTypography } from "../../../src/lib/exportTheme";
import { supabase } from "../../../src/lib/supabase";

export const dynamic = "force-dynamic";

type View = "register" | "create";
type PrintStatus = "Queued" | "Printing" | "Completed";
type PrintPriority = "High" | "Medium" | "Low";
type UrgencyFilter = "" | "overdue" | "high" | "open";

type PrintRequest = {
  id: string;
  request_number: string;
  requester_name: string;
  requester_email: string | null;
  project: string | null;
  justification: string | null;
  created_at: string | null;
};

type PrintObject = {
  id: string;
  request_id: string;
  job_number: string;
  description: string;
  quantity: number;
  needed_by: string | null;
  priority: PrintPriority;
  status: PrintStatus;
  operator_name: string | null;
  actual_hours: number | null;
  material_cost: number | null;
  buy_cost_estimate: number | null;
  operator_notes: string | null;
  reference_file_path: string | null;
  reference_file_name: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
};

type PersonOption = {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
};

type PrintRow = PrintObject & {
  request: PrintRequest | null;
  daysLeft: number | null;
  overdue: boolean;
};

type ObjectDraft = {
  key: string;
  description: string;
  quantity: string;
  needed_by: string;
  priority: PrintPriority;
  buy_cost_estimate: string;
  file: File | null;
};

const tabs: Array<{ value: View; label: string }> = [
  { value: "register", label: "Register" },
  { value: "create", label: "Create Request" },
];

const statusOptions: PrintStatus[] = ["Queued", "Printing", "Completed"];
const priorityOptions: PrintPriority[] = ["High", "Medium", "Low"];
const defaultProjects = ["Baltic Power", "Wadden Sea", "General / Workshop"];
const priorityRank: Record<PrintPriority, number> = { High: 0, Medium: 1, Low: 2 };
const storageBucket = "asset-files";
const missingTablesMessage = "3D print tables are missing. Run scripts/sql/asset_print_requests.sql in Supabase, then reload this page.";

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function getDaysLeft(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - startOfToday().getTime()) / 86400000);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `£${value.toFixed(2)}`;
}

function formatHours(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${value.toFixed(1)} hrs`;
}

function toNumberOrNull(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

function urgencyLabel(row: PrintRow) {
  if (row.status === "Completed") return "Completed";
  if (row.daysLeft === null) return `${row.priority} · no date`;
  if (row.overdue) return `Overdue ${Math.abs(row.daysLeft)}d`;
  if (row.daysLeft === 0) return `${row.priority} · due today`;
  return `${row.priority} · ${row.daysLeft}d left`;
}

function compareRows(a: PrintRow, b: PrintRow) {
  const aDone = a.status === "Completed";
  const bDone = b.status === "Completed";
  if (aDone !== bDone) return aDone ? 1 : -1;
  if (aDone && bDone) return (b.completed_at || "").localeCompare(a.completed_at || "");
  if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
  if (a.overdue && b.overdue) return (a.daysLeft ?? 0) - (b.daysLeft ?? 0);
  if (priorityRank[a.priority] !== priorityRank[b.priority]) return priorityRank[a.priority] - priorityRank[b.priority];
  const aDays = a.daysLeft ?? Number.MAX_SAFE_INTEGER;
  const bDays = b.daysLeft ?? Number.MAX_SAFE_INTEGER;
  if (aDays !== bDays) return aDays - bDays;
  return (a.created_at || "").localeCompare(b.created_at || "");
}

function numberFromRef(value: string) {
  const match = value.match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function toDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function mapObject(row: Record<string, unknown>): PrintObject {
  const numeric = (value: unknown) => (value === null || value === undefined || value === "" ? null : Number(value));
  return {
    id: String(row.id || ""),
    request_id: String(row.request_id || ""),
    job_number: String(row.job_number || ""),
    description: String(row.description || ""),
    quantity: Number(row.quantity || 1),
    needed_by: (row.needed_by as string | null) || null,
    priority: (priorityOptions.includes(row.priority as PrintPriority) ? row.priority : "Medium") as PrintPriority,
    status: (statusOptions.includes(row.status as PrintStatus) ? row.status : "Queued") as PrintStatus,
    operator_name: (row.operator_name as string | null) || null,
    actual_hours: numeric(row.actual_hours),
    material_cost: numeric(row.material_cost),
    buy_cost_estimate: numeric(row.buy_cost_estimate),
    operator_notes: (row.operator_notes as string | null) || null,
    reference_file_path: (row.reference_file_path as string | null) || null,
    reference_file_name: (row.reference_file_name as string | null) || null,
    started_at: (row.started_at as string | null) || null,
    completed_at: (row.completed_at as string | null) || null,
    created_at: (row.created_at as string | null) || null,
  };
}

export default function PrintRequestsPage() {
  const permissions = useImsPermissions();
  const [activeView, setActiveView] = useState<View>("register");
  const [requests, setRequests] = useState<PrintRequest[]>([]);
  const [objects, setObjects] = useState<PrintObject[]>([]);
  const [people, setPeople] = useState<PersonOption[]>([]);
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("Loading 3D print requests...");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [requesterFilter, setRequesterFilter] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>("");
  const [formProject, setFormProject] = useState(defaultProjects[0]);
  const [formJustification, setFormJustification] = useState("");
  const keyCounter = useRef(0);
  const selectedDetailRef = useRef<HTMLDivElement | null>(null);

  function newObjectDraft(): ObjectDraft {
    keyCounter.current += 1;
    return { key: `object-${keyCounter.current}`, description: "", quantity: "1", needed_by: "", priority: "Medium", buy_cost_estimate: "", file: null };
  }

  const [objectDrafts, setObjectDrafts] = useState<ObjectDraft[]>(() => [
    { key: "object-0", description: "", quantity: "1", needed_by: "", priority: "Medium", buy_cost_estimate: "", file: null },
  ]);

  const isAdmin = permissions.loaded && (permissions.isMasterAdmin || permissions.fullAccess);
  const isOperator = isAdmin || (permissions.loaded && permissions.canEdit);
  const canCreate = isOperator || (permissions.loaded && permissions.canCreate);

  const currentPerson = useMemo(
    () => people.find((person) => (person.email || "").trim().toLowerCase() === currentUserEmail) || null,
    [people, currentUserEmail]
  );
  const currentUserName = currentPerson?.name || currentUserEmail || "Unknown user";

  async function loadData() {
    setLoading(true);
    const [requestRes, objectRes, peopleRes] = await Promise.all([
      supabase.from("print_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("print_request_objects").select("*").order("created_at", { ascending: true }),
      supabase.from("people").select("id,name,email,role,active").eq("active", true).order("name", { ascending: true }),
    ]);

    if (requestRes.error || objectRes.error) {
      const error = requestRes.error || objectRes.error;
      const missing = /relation|does not exist|schema cache/i.test(error?.message || "");
      setMessage(missing ? missingTablesMessage : `3D print requests failed to load: ${error?.message}`);
      setLoading(false);
      return;
    }

    const loadedRequests = ((requestRes.data || []) as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id || ""),
      request_number: String(row.request_number || ""),
      requester_name: String(row.requester_name || ""),
      requester_email: (row.requester_email as string | null) || null,
      project: (row.project as string | null) || null,
      justification: (row.justification as string | null) || null,
      created_at: (row.created_at as string | null) || null,
    }));
    const loadedObjects = ((objectRes.data || []) as Array<Record<string, unknown>>).map(mapObject);

    setRequests(loadedRequests);
    setObjects(loadedObjects);
    if (peopleRes.data && !peopleRes.error) {
      setPeople(((peopleRes.data || []) as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id || ""),
        name: String(row.name || ""),
        email: (row.email as string | null) || null,
        role: (row.role as string | null) || null,
      })));
    }
    setMessage(`Loaded ${loadedObjects.length} print job${loadedObjects.length === 1 ? "" : "s"} across ${loadedRequests.length} request${loadedRequests.length === 1 ? "" : "s"}.`);
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
    void supabase.auth.getUser().then(({ data }) => {
      setCurrentUserEmail(data.user?.email?.trim().toLowerCase() || "");
    });
  }, []);

  const requestById = useMemo(() => new Map(requests.map((request) => [request.id, request])), [requests]);

  const allRows = useMemo<PrintRow[]>(() => {
    return objects
      .map((object) => {
        const daysLeft = getDaysLeft(object.needed_by);
        return {
          ...object,
          request: requestById.get(object.request_id) || null,
          daysLeft,
          overdue: object.status !== "Completed" && daysLeft !== null && daysLeft < 0,
        };
      })
      .sort(compareRows);
  }, [objects, requestById]);

  const visibleRows = useMemo(() => {
    if (isOperator) return allRows;
    return allRows.filter((row) => (row.request?.requester_email || "").trim().toLowerCase() === currentUserEmail);
  }, [allRows, currentUserEmail, isOperator]);

  const projectOptions = useMemo(() => {
    const saved = requests.map((request) => request.project).filter(Boolean) as string[];
    return [...new Set([...defaultProjects, ...saved])];
  }, [requests]);

  const requesterOptions = useMemo(
    () => [...new Set(visibleRows.map((row) => row.request?.requester_name).filter(Boolean) as string[])].sort(),
    [visibleRows]
  );

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return visibleRows.filter((row) => {
      const haystack = [row.job_number, row.description, row.request?.request_number, row.request?.requester_name, row.request?.project, row.operator_name]
        .join(" ")
        .toLowerCase();
      return (
        (!query || haystack.includes(query)) &&
        (!statusFilter || row.status === statusFilter) &&
        (!priorityFilter || row.priority === priorityFilter) &&
        (!projectFilter || (row.request?.project || "") === projectFilter) &&
        (!requesterFilter || (row.request?.requester_name || "") === requesterFilter) &&
        (!urgencyFilter ||
          (urgencyFilter === "overdue" && row.overdue) ||
          (urgencyFilter === "high" && row.status !== "Completed" && row.priority === "High") ||
          (urgencyFilter === "open" && row.status !== "Completed"))
      );
    });
  }, [priorityFilter, projectFilter, requesterFilter, search, statusFilter, urgencyFilter, visibleRows]);

  const kpis = useMemo(() => {
    const open = visibleRows.filter((row) => row.status !== "Completed");
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const hoursThisMonth = visibleRows
      .filter((row) => row.status === "Completed" && row.completed_at && new Date(row.completed_at) >= monthStart)
      .reduce((total, row) => total + (row.actual_hours || 0), 0);
    const saved = visibleRows
      .filter((row) => row.status === "Completed" && row.buy_cost_estimate !== null)
      .reduce((total, row) => total + ((row.buy_cost_estimate || 0) - (row.material_cost || 0)), 0);
    return {
      overdue: open.filter((row) => row.overdue).length,
      high: open.filter((row) => row.priority === "High").length,
      open: open.length,
      hoursThisMonth,
      saved,
    };
  }, [visibleRows]);

  const selectedRow = useMemo(() => allRows.find((row) => row.id === selectedId) || null, [allRows, selectedId]);

  function selectRow(id: string) {
    setSelectedId(id);
    window.setTimeout(() => selectedDetailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  function requireCreateAccess(actionLabel: string) {
    if (canCreate) return true;
    setMessage(`Permission required: create access is needed to ${actionLabel}.`);
    return false;
  }

  function requireOperatorAccess(actionLabel: string) {
    if (isOperator) return true;
    setMessage(`Permission required: edit access is needed to ${actionLabel}.`);
    return false;
  }

  function updateDraft(key: string, patch: Partial<ObjectDraft>) {
    setObjectDrafts((current) => current.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft)));
  }

  function addDraft() {
    setObjectDrafts((current) => [...current, newObjectDraft()]);
  }

  function removeDraft(key: string) {
    setObjectDrafts((current) => (current.length > 1 ? current.filter((draft) => draft.key !== key) : current));
  }

  function resetForm() {
    setFormProject(defaultProjects[0]);
    setFormJustification("");
    setObjectDrafts([newObjectDraft()]);
  }

  function repeatRequest(requestId: string) {
    if (!requireCreateAccess("repeat a print request")) return;
    const request = requestById.get(requestId);
    const sourceObjects = objects.filter((object) => object.request_id === requestId);
    if (!request || !sourceObjects.length) return;
    setFormProject(request.project || defaultProjects[0]);
    setFormJustification(request.justification || "");
    setObjectDrafts(
      sourceObjects.map((object) => {
        const draft = newObjectDraft();
        return {
          ...draft,
          description: object.description,
          quantity: String(object.quantity),
          priority: object.priority,
          buy_cost_estimate: object.buy_cost_estimate === null ? "" : String(object.buy_cost_estimate),
        };
      })
    );
    setActiveView("create");
    setMessage(`Repeating ${request.request_number}. Set a new needed-by date for each object, then submit.`);
  }

  async function submitRequest(event: React.FormEvent) {
    event.preventDefault();
    if (!requireCreateAccess("submit 3D print requests")) return;

    const cleaned = objectDrafts.map((draft) => ({
      ...draft,
      description: draft.description.trim(),
      quantity: Number.parseInt(draft.quantity, 10),
    }));
    if (cleaned.some((draft) => !draft.description)) {
      setMessage("Every object needs a description.");
      return;
    }
    if (cleaned.some((draft) => !Number.isFinite(draft.quantity) || draft.quantity < 1)) {
      setMessage("Every object needs a quantity of at least 1.");
      return;
    }
    if (cleaned.some((draft) => !draft.needed_by)) {
      setMessage("Every object needs a needed-by date so the queue can be prioritised.");
      return;
    }

    setSaving(true);
    const { data: existing, error: existingError } = await supabase.from("print_requests").select("request_number");
    if (existingError) {
      setSaving(false);
      setMessage(/relation|does not exist|schema cache/i.test(existingError.message) ? missingTablesMessage : `Submit failed: ${existingError.message}`);
      return;
    }
    const nextSequence = ((existing || []) as Array<{ request_number: string }>).reduce((highest, row) => Math.max(highest, numberFromRef(row.request_number)), 0) + 1;
    const requestNumber = `REQ-${String(nextSequence).padStart(3, "0")}`;

    const { data: createdRequest, error: requestError } = await supabase
      .from("print_requests")
      .insert([{
        request_number: requestNumber,
        requester_name: currentUserName,
        requester_email: currentUserEmail || null,
        project: formProject || null,
        justification: formJustification.trim() || null,
      }])
      .select("id")
      .single();

    if (requestError || !createdRequest) {
      setSaving(false);
      setMessage(`Submit failed: ${requestError?.message || "Request was not created."}`);
      return;
    }

    const objectRows = cleaned.map((draft, index) => ({
      request_id: createdRequest.id,
      job_number: `JOB-${String(nextSequence).padStart(3, "0")}-${String.fromCharCode(65 + (index % 26))}${index >= 26 ? String(Math.floor(index / 26)) : ""}`,
      description: draft.description,
      quantity: draft.quantity,
      needed_by: draft.needed_by,
      priority: draft.priority,
      status: "Queued",
      buy_cost_estimate: toNumberOrNull(draft.buy_cost_estimate),
    }));

    const { data: createdObjects, error: objectError } = await supabase.from("print_request_objects").insert(objectRows).select("id,job_number");
    if (objectError || !createdObjects) {
      await supabase.from("print_requests").delete().eq("id", createdRequest.id);
      setSaving(false);
      setMessage(`Submit failed: ${objectError?.message || "Objects were not created."}`);
      return;
    }

    let uploadWarning = "";
    for (const created of createdObjects as Array<{ id: string; job_number: string }>) {
      const index = objectRows.findIndex((row) => row.job_number === created.job_number);
      const file = cleaned[index]?.file;
      if (!file) continue;
      const path = `PRINT/${createdRequest.id}/${Date.now()}-${sanitizeFileName(file.name)}`;
      const upload = await supabase.storage.from(storageBucket).upload(path, file, { upsert: false });
      if (upload.error) {
        uploadWarning = ` Reference upload failed for ${created.job_number}: ${upload.error.message}`;
        continue;
      }
      await supabase
        .from("print_request_objects")
        .update({ reference_file_path: path, reference_file_name: file.name, reference_content_type: file.type || null })
        .eq("id", created.id);
    }

    setSaving(false);
    resetForm();
    setActiveView("register");
    setMessage(`${requestNumber} submitted with ${objectRows.length} object${objectRows.length === 1 ? "" : "s"}.${uploadWarning}`);
    await loadData();
  }

  async function updateObject(row: PrintRow, patch: Partial<PrintObject>) {
    if (!requireOperatorAccess("update print jobs")) return;
    const nowIso = new Date().toISOString();
    const payload: Record<string, unknown> = { ...patch, updated_at: nowIso };

    if (patch.status && patch.status !== row.status) {
      if (patch.status === "Printing") {
        payload.started_at = row.started_at || nowIso;
        payload.completed_at = null;
        if (!(patch.operator_name ?? row.operator_name)) payload.operator_name = currentUserName;
      } else if (patch.status === "Completed") {
        payload.completed_at = nowIso;
        payload.started_at = row.started_at || nowIso;
        if (!(patch.operator_name ?? row.operator_name)) payload.operator_name = currentUserName;
      } else {
        payload.started_at = null;
        payload.completed_at = null;
      }
    }

    setSaving(true);
    const { error } = await supabase.from("print_request_objects").update(payload).eq("id", row.id);
    setSaving(false);
    if (error) {
      setMessage(`Update failed: ${error.message}`);
      return;
    }

    const finalStatus = (patch.status || row.status) as PrintStatus;
    const finalHours = patch.actual_hours !== undefined ? patch.actual_hours : row.actual_hours;
    const finalCost = patch.material_cost !== undefined ? patch.material_cost : row.material_cost;
    const reminder = finalStatus === "Completed" && (finalHours === null || finalCost === null) ? " Record actual hours and material cost so time and cost savings can be reported." : "";
    setMessage(`${row.job_number} updated.${reminder}`);
    await loadData();
  }

  async function deleteObject(row: PrintRow) {
    if (!isAdmin) {
      setMessage("Permission required: full access is needed to delete print jobs.");
      return;
    }
    if (!window.confirm(`Delete ${row.job_number}? This cannot be undone.`)) return;

    if (row.reference_file_path) {
      await supabase.storage.from(storageBucket).remove([row.reference_file_path]);
    }
    const { error } = await supabase.from("print_request_objects").delete().eq("id", row.id);
    if (error) {
      setMessage(`Delete failed: ${error.message}`);
      return;
    }
    const siblings = objects.filter((object) => object.request_id === row.request_id && object.id !== row.id);
    if (!siblings.length) {
      await supabase.from("print_requests").delete().eq("id", row.request_id);
    }
    setSelectedId("");
    setMessage(`${row.job_number} deleted.`);
    await loadData();
  }

  async function openReference(path: string) {
    const { data, error } = await supabase.storage.from(storageBucket).createSignedUrl(path, 60 * 60 * 24 * 180);
    if (error || !data?.signedUrl) {
      setMessage(`Reference link failed: ${error?.message || "No link returned"}`);
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  function exportExcel() {
    const exportRows = filteredRows.map((row) => ({
      "Job No.": row.job_number,
      "Request No.": row.request?.request_number || "",
      Object: row.description,
      Quantity: row.quantity,
      Requester: row.request?.requester_name || "",
      Project: row.request?.project || "",
      Priority: row.priority,
      "Needed By": formatDate(row.needed_by),
      Urgency: urgencyLabel(row),
      Status: row.status,
      Operator: row.operator_name || "",
      "Actual Hours": row.actual_hours ?? "",
      "Material Cost (GBP)": row.material_cost ?? "",
      "Estimated Cost To Buy (GBP)": row.buy_cost_estimate ?? "",
      "Completed On": formatDate(row.completed_at),
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "3D Print Register");
    XLSX.writeFile(workbook, `3d-print-register-${new Date().toISOString().slice(0, 10)}.xlsx`);
    setMessage(`Exported ${exportRows.length} print job${exportRows.length === 1 ? "" : "s"} from the current register view.`);
  }

  async function exportPdf() {
    setExportingPdf(true);
    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;
      const generatedAt = new Date().toLocaleString("en-GB");

      try {
        const logoResponse = await fetch("/enshore-primary-logo-colour.png");
        if (logoResponse.ok) {
          doc.addImage(await toDataUrl(await logoResponse.blob()), "PNG", margin, 8, 40, 20);
        }
      } catch {
        // Keep PDF generation resilient if the logo cannot be loaded.
      }

      doc.setFont(exportTypography.pdfFont, "bold");
      doc.setTextColor(...[...exportRgb.ink] as [number, number, number]);
      doc.setFontSize(exportTypography.titlePt);
      doc.text("3D Print Request Register", pageWidth - margin, 16, { align: "right" });
      doc.setFont(exportTypography.pdfFont, "normal");
      doc.setFontSize(exportTypography.bodyPt);
      doc.setTextColor(...[...exportRgb.muted] as [number, number, number]);
      doc.text(`Generated: ${generatedAt} | ${filteredRows.length} print job${filteredRows.length === 1 ? "" : "s"}`, pageWidth - margin, 22, { align: "right" });
      doc.setDrawColor(...[...exportRgb.brand] as [number, number, number]);
      doc.setLineWidth(0.7);
      doc.line(margin, 31, pageWidth - margin, 31);

      autoTable(doc, {
        startY: 36,
        theme: "grid",
        margin: { left: margin, right: margin, bottom: 16 },
        head: [["Job No.", "Object", "Qty", "Request", "Requester", "Project", "Urgency", "Needed By", "Status", "Operator", "Hours", "Cost"]],
        body: filteredRows.length
          ? filteredRows.map((row) => [
              row.job_number,
              row.description,
              String(row.quantity),
              row.request?.request_number || "",
              row.request?.requester_name || "",
              row.request?.project || "",
              urgencyLabel(row),
              formatDate(row.needed_by),
              row.status,
              row.operator_name || "-",
              row.actual_hours === null ? "-" : row.actual_hours.toFixed(1),
              formatMoney(row.material_cost),
            ])
          : [["No print jobs match the current filters", "", "", "", "", "", "", "", "", "", "", ""]],
        styles: { fontSize: exportTypography.tablePt, cellPadding: 2.2, lineColor: [...exportRgb.border], lineWidth: 0.2, textColor: [...exportRgb.ink], overflow: "linebreak" },
        headStyles: { ...exportPdfTableTheme.headStyles, fillColor: [...exportPdfTableTheme.headStyles.fillColor], textColor: [...exportPdfTableTheme.headStyles.textColor] },
        alternateRowStyles: { fillColor: [...exportPdfTableTheme.alternateRowStyles.fillColor] },
        rowPageBreak: "avoid",
      });

      const pageCount = doc.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) {
        doc.setPage(page);
        doc.setFont(exportTypography.pdfFont, "normal");
        doc.setFontSize(exportTypography.captionPt);
        doc.setTextColor(...[...exportRgb.muted] as [number, number, number]);
        doc.text("Enshore Subsea | 3D Print Request Register", margin, pageHeight - 8);
        doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: "right" });
      }

      doc.save(`3d-print-register-${new Date().toISOString().slice(0, 10)}.pdf`);
      setMessage("3D print register PDF generated.");
    } catch (error) {
      console.error(error);
      setMessage("PDF generation failed.");
    } finally {
      setExportingPdf(false);
    }
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("");
    setPriorityFilter("");
    setProjectFilter("");
    setRequesterFilter("");
    setUrgencyFilter("");
  }

  return (
    <main>
      <QualityPageHero
        label="ASSET MANAGEMENT"
        title="3D Print Requests"
        description="One request can hold several printable objects. Each object is queued, printed and costed independently."
        contextCards={[
          { label: "Open Jobs", value: kpis.open },
          { label: "Access", value: isAdmin ? "Admin" : isOperator ? "Operator" : "Requester" },
        ]}
      />

      <ImsTopMetaRow backHref="/home" backLabel="Back to IMS Home" status={<><strong>Status:</strong> {message}</>} />

      <ImsTabs tabs={tabs} active={activeView} onChange={setActiveView} ariaLabel="3D print request views" />

      {activeView === "register" ? (
        <>
          <section style={kpiGridStyle}>
            <QualityKpiCard title="Overdue" value={kpis.overdue} accent={imsColours.dangerBright} active={urgencyFilter === "overdue"} onClick={() => setUrgencyFilter(urgencyFilter === "overdue" ? "" : "overdue")} />
            <QualityKpiCard title="High Priority Open" value={kpis.high} accent={imsColours.warning} active={urgencyFilter === "high"} onClick={() => setUrgencyFilter(urgencyFilter === "high" ? "" : "high")} />
            <QualityKpiCard title="Open Objects" value={kpis.open} accent={imsColours.brand} active={urgencyFilter === "open"} onClick={() => setUrgencyFilter(urgencyFilter === "open" ? "" : "open")} />
            {isOperator ? <QualityKpiCard title="Hours Logged This Month" value={kpis.hoursThisMonth.toFixed(1)} accent={imsColours.blue} /> : null}
            {isAdmin ? <QualityKpiCard title="Est. Saved vs Buying" value={`£${Math.round(kpis.saved).toLocaleString("en-GB")}`} accent={imsColours.muted} /> : null}
          </section>

          <section style={registerGridStyle}>
            <ImsPanel
              title="3D Print Register"
              subtitle={isOperator ? "Every printable object across every request, prioritised automatically: overdue first, then highest priority nearest its deadline." : "Your print requests and their progress through the queue."}
            >
              <ImsFilterPanel
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search job no., object, request, requester..."
                showFilters={showFilters}
                onToggleFilters={() => setShowFilters((value) => !value)}
                actions={
                  <>
                    <ImsButton variant="secondary" onClick={clearFilters}>Clear Filters</ImsButton>
                    <ImsButton variant="ghost" onClick={exportExcel} disabled={!filteredRows.length}>Export Excel</ImsButton>
                    <ImsButton variant="ghost" onClick={() => void exportPdf()} disabled={exportingPdf || !filteredRows.length}>{exportingPdf ? "Generating..." : "Export PDF"}</ImsButton>
                  </>
                }
              >
                <Field label="Status">
                  <select style={imsInputStyle} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                    <option value="">All statuses</option>
                    {statusOptions.map((status) => <option key={status}>{status}</option>)}
                  </select>
                </Field>
                <Field label="Priority">
                  <select style={imsInputStyle} value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
                    <option value="">All priorities</option>
                    {priorityOptions.map((priority) => <option key={priority}>{priority}</option>)}
                  </select>
                </Field>
                <Field label="Project">
                  <select style={imsInputStyle} value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
                    <option value="">All projects</option>
                    {projectOptions.map((project) => <option key={project}>{project}</option>)}
                  </select>
                </Field>
                {isOperator ? (
                  <Field label="Requester">
                    <select style={imsInputStyle} value={requesterFilter} onChange={(event) => setRequesterFilter(event.target.value)}>
                      <option value="">All requesters</option>
                      {requesterOptions.map((requester) => <option key={requester}>{requester}</option>)}
                    </select>
                  </Field>
                ) : null}
              </ImsFilterPanel>

              <div style={imsTableInfoRowStyle}>Showing <strong>{filteredRows.length}</strong> of <strong>{visibleRows.length}</strong> print jobs</div>
              <div className="observation-table-wrap" style={{ overflowX: "auto", border: "1px solid #D0D0CE", borderRadius: "14px" }}>
                <table className="observation-table" style={{ ...imsTableStyle, minWidth: 1280 }}>
                  <thead>
                    <tr>
                      {["Job No.", "Object", "Request", "Requester", "Project", "Qty", "Urgency", "Needed By", "Status", "Operator", "Actual Hrs", "Material Cost"].map((heading) => (
                        <th key={heading} style={imsTableHeadStyle}>{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => (
                      <tr
                        key={row.id}
                        aria-selected={selectedId === row.id}
                        data-selected={selectedId === row.id ? "true" : "false"}
                        onClick={() => selectRow(row.id)}
                        style={selectedId === row.id ? selectedRowStyle : rowStyle}
                      >
                        <td data-label="Job No." style={{ ...imsTableCellStyle, fontWeight: 900, color: imsColours.brandDark }}>{row.job_number}</td>
                        <td data-label="Object" style={imsTableCellStyle}>{row.description}</td>
                        <td data-label="Request" style={imsTableCellStyle}>{row.request?.request_number || "-"}</td>
                        <td data-label="Requester" style={imsTableCellStyle}>{row.request?.requester_name || "-"}</td>
                        <td data-label="Project" style={imsTableCellStyle}>{row.request?.project || "-"}</td>
                        <td data-label="Qty" style={imsTableCellStyle}>{row.quantity}</td>
                        <td data-label="Urgency" style={imsTableCellStyle}><UrgencyPill row={row} /></td>
                        <td data-label="Needed By" style={imsTableCellStyle}>{formatDate(row.needed_by)}</td>
                        <td data-label="Status" style={imsTableCellStyle} onClick={(event) => event.stopPropagation()}>
                          {isOperator ? (
                            <select
                              style={imsInputStyle}
                              value={row.status}
                              disabled={saving}
                              onChange={(event) => void updateObject(row, { status: event.target.value as PrintStatus })}
                              aria-label={`Status for ${row.job_number}`}
                            >
                              {statusOptions.map((status) => <option key={status}>{status}</option>)}
                            </select>
                          ) : (
                            <StatusPill status={row.status} />
                          )}
                        </td>
                        <td data-label="Operator" style={imsTableCellStyle}>{row.operator_name || "-"}</td>
                        <td data-label="Actual Hrs" style={imsTableCellStyle}>{formatHours(row.actual_hours)}</td>
                        <td data-label="Material Cost" style={imsTableCellStyle}>{formatMoney(row.material_cost)}</td>
                      </tr>
                    ))}
                    {!filteredRows.length ? (
                      <tr><td colSpan={12} style={emptyCellStyle}>{loading ? "Loading print jobs..." : "No print jobs match the current filters."}</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </ImsPanel>

            {selectedRow ? (
              <div ref={selectedDetailRef}>
                <JobDetail
                  row={selectedRow}
                  siblingCount={objects.filter((object) => object.request_id === selectedRow.request_id).length}
                  people={people}
                  isOperator={isOperator}
                  isAdmin={isAdmin}
                  canRepeat={canCreate}
                  saving={saving}
                  onSave={(patch) => void updateObject(selectedRow, patch)}
                  onDelete={() => void deleteObject(selectedRow)}
                  onRepeat={() => repeatRequest(selectedRow.request_id)}
                  onOpenReference={(path) => void openReference(path)}
                />
              </div>
            ) : null}
          </section>
        </>
      ) : null}

      {activeView === "create" ? (
        <ImsPanel title="New 3D Print Request" subtitle="One request, several objects. Each object gets its own job number and moves through the queue independently.">
          <form onSubmit={submitRequest} style={{ display: "grid", gap: 14 }}>
            <div style={imsFormGridStyle}>
              <Field label="Requester">
                <input style={readOnlyInputStyle} value={currentUserName} readOnly />
              </Field>
              <Field label="Project">
                <select style={imsInputStyle} value={formProject} onChange={(event) => setFormProject(event.target.value)}>
                  {projectOptions.map((project) => <option key={project}>{project}</option>)}
                </select>
              </Field>
              <Field label="Why print instead of buy (optional)">
                <input style={imsInputStyle} value={formJustification} onChange={(event) => setFormJustification(event.target.value)} placeholder="e.g. faster than a 3-week supplier lead time" />
              </Field>
            </div>

            <div style={sectionRowStyle}>
              <h3 style={subHeadingStyle}>Objects in this request ({objectDrafts.length})</h3>
              <ImsButton variant="secondary" onClick={addDraft}>Add Another Object</ImsButton>
            </div>

            {objectDrafts.map((draft, index) => (
              <fieldset key={draft.key} style={imsFieldsetStyle}>
                <legend style={legendStyle}>Object {index + 1}</legend>
                <div style={imsFormGridStyle}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <Field label="Object description">
                      <input style={imsInputStyle} value={draft.description} onChange={(event) => updateDraft(draft.key, { description: event.target.value })} placeholder="e.g. Trencher skid guide mount" />
                    </Field>
                  </div>
                  <Field label="Quantity">
                    <input type="number" min={1} style={imsInputStyle} value={draft.quantity} onChange={(event) => updateDraft(draft.key, { quantity: event.target.value })} />
                  </Field>
                  <Field label="Needed by">
                    <input type="date" style={imsInputStyle} value={draft.needed_by} onChange={(event) => updateDraft(draft.key, { needed_by: event.target.value })} />
                  </Field>
                  <Field label="Priority">
                    <select style={imsInputStyle} value={draft.priority} onChange={(event) => updateDraft(draft.key, { priority: event.target.value as PrintPriority })}>
                      {priorityOptions.map((priority) => <option key={priority}>{priority}</option>)}
                    </select>
                  </Field>
                  <Field label="Estimated cost to buy, total £ (optional)">
                    <input type="number" min={0} step="0.01" style={imsInputStyle} value={draft.buy_cost_estimate} onChange={(event) => updateDraft(draft.key, { buy_cost_estimate: event.target.value })} placeholder="Used to report savings" />
                  </Field>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <Field label="Example of the component (photo, drawing or CAD file)">
                      <ReferenceFileControl file={draft.file} disabled={saving} onFile={(file) => updateDraft(draft.key, { file })} />
                    </Field>
                  </div>
                </div>
                {objectDrafts.length > 1 ? (
                  <div style={{ ...buttonRowStyle, marginTop: 12 }}>
                    <ImsButton variant="danger" onClick={() => removeDraft(draft.key)}>Remove Object</ImsButton>
                  </div>
                ) : null}
              </fieldset>
            ))}

            <div style={buttonRowStyle}>
              <ImsButton type="submit" disabled={saving || !canCreate}>
                {saving ? "Submitting..." : `Submit Request (${objectDrafts.length} object${objectDrafts.length === 1 ? "" : "s"})`}
              </ImsButton>
              <ImsButton variant="secondary" onClick={() => { resetForm(); setActiveView("register"); }} disabled={saving}>Cancel</ImsButton>
            </div>
          </form>
        </ImsPanel>
      ) : null}
    </main>
  );
}

function JobDetail({
  row,
  siblingCount,
  people,
  isOperator,
  isAdmin,
  canRepeat,
  saving,
  onSave,
  onDelete,
  onRepeat,
  onOpenReference,
}: {
  row: PrintRow;
  siblingCount: number;
  people: PersonOption[];
  isOperator: boolean;
  isAdmin: boolean;
  canRepeat: boolean;
  saving: boolean;
  onSave: (patch: Partial<PrintObject>) => void;
  onDelete: () => void;
  onRepeat: () => void;
  onOpenReference: (path: string) => void;
}) {
  const [draftStatus, setDraftStatus] = useState<PrintStatus>(row.status);
  const [draftOperator, setDraftOperator] = useState(row.operator_name || "");
  const [draftHours, setDraftHours] = useState(row.actual_hours === null ? "" : String(row.actual_hours));
  const [draftCost, setDraftCost] = useState(row.material_cost === null ? "" : String(row.material_cost));
  const [draftBuyCost, setDraftBuyCost] = useState(row.buy_cost_estimate === null ? "" : String(row.buy_cost_estimate));
  const [draftNotes, setDraftNotes] = useState(row.operator_notes || "");

  useEffect(() => {
    setDraftStatus(row.status);
    setDraftOperator(row.operator_name || "");
    setDraftHours(row.actual_hours === null ? "" : String(row.actual_hours));
    setDraftCost(row.material_cost === null ? "" : String(row.material_cost));
    setDraftBuyCost(row.buy_cost_estimate === null ? "" : String(row.buy_cost_estimate));
    setDraftNotes(row.operator_notes || "");
  }, [row.id, row.status, row.operator_name, row.actual_hours, row.material_cost, row.buy_cost_estimate, row.operator_notes]);


  return (
    <ImsPanel title={`Print Job Detail - ${row.job_number}`} subtitle="Review the job, open the reference example, record operator progress, hours and cost.">
      <div style={detailGridStyle}>
        <Info label="Request" value={row.request?.request_number} />
        <Info label="Requester" value={row.request?.requester_name} />
        <Info label="Project" value={row.request?.project} />
        <Info label="Quantity" value={row.quantity} />
        <Info label="Needed By" value={formatDate(row.needed_by)} />
        <Info label="Urgency" value={urgencyLabel(row)} />
        <Info label="Objects In Request" value={siblingCount} />
        <Info label="Est. Cost To Buy" value={formatMoney(row.buy_cost_estimate)} />
        <Info label="Completed On" value={formatDate(row.completed_at)} />
      </div>
      <div style={narrativeGridStyle}>
        <Info label="Object" value={row.description} large />
        <Info label="Why Print Instead Of Buy" value={row.request?.justification} large />
      </div>

      <div style={{ marginBottom: 14 }}>
        <h3 style={subHeadingStyle}>Reference Example</h3>
        {row.reference_file_path ? (
          <div style={referenceItemStyle}>
            <strong>{row.reference_file_name || "Reference file"}</strong>
            <ImsButton variant="secondary" onClick={() => onOpenReference(row.reference_file_path as string)}>Open Reference</ImsButton>
          </div>
        ) : (
          <div style={emptyStateStyle}>No reference example was provided with this request.</div>
        )}
      </div>

      {isOperator ? (
        <div style={editPanelStyle}>
          <div style={imsFormGridStyle}>
            <Field label="Status">
              <select style={imsInputStyle} value={draftStatus} onChange={(event) => setDraftStatus(event.target.value as PrintStatus)}>
                {statusOptions.map((status) => <option key={status}>{status}</option>)}
              </select>
            </Field>
            <Field label="Operator">
              <select style={imsInputStyle} value={draftOperator} onChange={(event) => setDraftOperator(event.target.value)}>
                <option value="">Unassigned</option>
                {draftOperator && !people.some((person) => person.name === draftOperator) ? <option value={draftOperator}>{draftOperator}</option> : null}
                {people.map((person) => <option key={person.id} value={person.name}>{person.name}{person.role ? ` - ${person.role}` : ""}</option>)}
              </select>
            </Field>
            <Field label="Actual hours">
              <input type="number" min={0} step="0.1" style={imsInputStyle} value={draftHours} onChange={(event) => setDraftHours(event.target.value)} />
            </Field>
            <Field label="Material cost £">
              <input type="number" min={0} step="0.01" style={imsInputStyle} value={draftCost} onChange={(event) => setDraftCost(event.target.value)} />
            </Field>
            {isAdmin ? (
              <Field label="Estimated cost to buy £">
                <input type="number" min={0} step="0.01" style={imsInputStyle} value={draftBuyCost} onChange={(event) => setDraftBuyCost(event.target.value)} />
              </Field>
            ) : null}
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Operator notes">
                <textarea style={imsTextareaStyle} value={draftNotes} onChange={(event) => setDraftNotes(event.target.value)} />
              </Field>
            </div>
          </div>
          <div style={buttonRowStyle}>
            <ImsButton
              disabled={saving}
              onClick={() =>
                onSave({
                  status: draftStatus,
                  operator_name: draftOperator || null,
                  actual_hours: toNumberOrNull(draftHours),
                  material_cost: toNumberOrNull(draftCost),
                  buy_cost_estimate: isAdmin ? toNumberOrNull(draftBuyCost) : row.buy_cost_estimate,
                  operator_notes: draftNotes.trim() || null,
                })
              }
            >
              {saving ? "Saving..." : "Save Job"}
            </ImsButton>
            {canRepeat ? <ImsButton variant="secondary" onClick={onRepeat}>Repeat Request</ImsButton> : null}
            {isAdmin ? <ImsButton variant="danger" onClick={onDelete}>Delete Job</ImsButton> : null}
          </div>
        </div>
      ) : (
        <div style={buttonRowStyle}>
          <Info label="Status" value={row.status} />
          <Info label="Operator" value={row.operator_name} />
          {canRepeat ? <ImsButton variant="secondary" onClick={onRepeat}>Repeat Request</ImsButton> : null}
        </div>
      )}

      {row.operator_notes && !isOperator ? (
        <div style={{ marginTop: 14 }}>
          <Info label="Operator Notes" value={row.operator_notes} large />
        </div>
      ) : null}
    </ImsPanel>
  );
}

function ReferenceFileControl({ file, disabled, onFile }: { file: File | null; disabled: boolean; onFile: (file: File | null) => void }) {
  const [isDragOver, setIsDragOver] = useState(false);
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "stretch" }}>
      <label
        style={{ ...dropZoneStyle, ...(isDragOver && !disabled ? dropZoneActiveStyle : {}), opacity: disabled ? 0.6 : 1, cursor: disabled ? "not-allowed" : "pointer", flex: "1 1 260px" }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragOver(false);
          if (disabled) return;
          const dropped = event.dataTransfer.files?.[0];
          if (dropped) onFile(dropped);
        }}
      >
        {file ? file.name : isDragOver ? "Drop file to attach" : "Add reference example (or drag a file here)"}
        <input
          type="file"
          style={{ display: "none" }}
          disabled={disabled}
          onChange={(event) => {
            const chosen = event.target.files?.[0] || null;
            event.currentTarget.value = "";
            if (chosen) onFile(chosen);
          }}
        />
      </label>
      {file ? <ImsButton variant="secondary" onClick={() => onFile(null)} disabled={disabled}>Clear</ImsButton> : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label style={fieldStyle}><span style={labelStyle}>{label}</span>{children}</label>;
}

function Info({ label, value, large = false }: { label: string; value: ReactNode; large?: boolean }) {
  return (
    <div style={infoStyle}>
      <span style={infoLabelStyle}>{label}</span>
      <span style={{ ...infoValueStyle, whiteSpace: large ? "pre-wrap" : "normal" }}>{value === null || value === undefined || value === "" ? "-" : value}</span>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const colour = status === "Completed" ? { background: "#ECECE7", color: "#005670" } : status === "Printing" ? { background: "#EEF7F8", color: "#005670" } : { background: "#ECECE7", color: "#000000" };
  return <span style={{ ...pillStyle, ...colour }}>{status}</span>;
}

function UrgencyPill({ row }: { row: PrintRow }) {
  const colour = row.status === "Completed"
    ? { background: "#ECECE7", color: "#53565A" }
    : row.overdue
    ? { background: "#F93822", color: "#FFFFFF" }
    : row.priority === "High"
    ? { background: "#FFAD00", color: "#000000" }
    : { background: "#ECECE7", color: "#000000" };
  return <span style={{ ...pillStyle, ...colour }}>{urgencyLabel(row)}</span>;
}

const kpiGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "16px", marginBottom: "20px" };
const registerGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: "20px", alignItems: "start" };
const fieldStyle: CSSProperties = { display: "grid", gap: "6px" };
const labelStyle: CSSProperties = { color: "#53565A", fontSize: "13px", fontWeight: 800 };
const readOnlyInputStyle: CSSProperties = { ...imsInputStyle, background: "#ECECE7", color: "#53565A" };
const selectedRowStyle: CSSProperties = { cursor: "pointer", background: "#EEF7F8" };
const rowStyle: CSSProperties = { cursor: "pointer" };
const emptyCellStyle: CSSProperties = { padding: "28px 14px", textAlign: "center", color: imsColours.slate, background: imsColours.page };
const emptyStateStyle: CSSProperties = { border: "1px dashed #D0D0CE", borderRadius: "14px", padding: "16px", color: imsColours.slate, background: imsColours.page, lineHeight: 1.45 };
const detailGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", marginBottom: "12px" };
const narrativeGridStyle: CSSProperties = { display: "grid", gap: "10px", marginBottom: "14px" };
const infoStyle: CSSProperties = { border: "1px solid #D0D0CE", borderRadius: "13px", background: "#ECECE7", padding: "12px", display: "grid", gap: "5px" };
const infoLabelStyle: CSSProperties = { color: "#53565A", fontSize: "12px", fontWeight: 800 };
const infoValueStyle: CSSProperties = { color: "#000000", fontSize: "14px", lineHeight: 1.45 };
const editPanelStyle: CSSProperties = { display: "grid", gap: "14px", marginBottom: "14px" };
const buttonRowStyle: CSSProperties = { display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" };
const sectionRowStyle: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" };
const subHeadingStyle: CSSProperties = { margin: "0 0 10px", color: imsColours.ink, fontSize: "16px", fontWeight: 900 };
const legendStyle: CSSProperties = { color: imsColours.brandDark, fontSize: "13px", fontWeight: 800, padding: "0 6px" };
const referenceItemStyle: CSSProperties = { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap", border: "1px solid #D0D0CE", borderRadius: "13px", background: "#ECECE7", padding: "12px" };
const pillStyle: CSSProperties = { display: "inline-flex", alignItems: "center", borderRadius: "999px", padding: "5px 9px", fontSize: "12px", fontWeight: 900, whiteSpace: "nowrap" };
const dropZoneStyle: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", border: "2px dashed #63B1BC", borderRadius: 10, background: "#ECECE7", color: "#005670", fontWeight: 800, padding: "10px 14px", minHeight: 42, boxSizing: "border-box" };
const dropZoneActiveStyle: CSSProperties = { background: "#EEF7F8", borderColor: "#005670" };

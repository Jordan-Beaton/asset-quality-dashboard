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

type View = "register" | "create" | "team";
type PrintStatus = "Queued" | "Printing" | "Completed";
type PrintPriority = "High" | "Medium" | "Low";
type PrintRoleType = "operator" | "admin";
type UrgencyFilter = "" | "overdue" | "high" | "open" | "unassigned";
type QueueScope = "all" | "mine";

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
  operator_email: string | null;
  actual_hours: number | null;
  material_cost: number | null;
  buy_cost_estimate: number | null;
  operator_notes: string | null;
  rules_bypassed_by: string | null;
  rules_bypassed_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
};

type PrintFile = {
  id: string;
  object_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
};

type PrintRole = {
  id: string;
  person_name: string;
  person_email: string;
  role: PrintRoleType;
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
  files: File[];
};

type DetailDraft = {
  operator: string;
  hours: string;
  cost: string;
  buyCost: string;
  notes: string;
  hoursChecked: boolean;
};

const statusOptions: PrintStatus[] = ["Queued", "Printing", "Completed"];
const priorityOptions: PrintPriority[] = ["High", "Medium", "Low"];
const priorityRank: Record<PrintPriority, number> = { High: 0, Medium: 1, Low: 2 };
const storageBucket = "asset-files";
const missingTablesMessage = "3D print tables are missing. Run scripts/sql/asset_print_requests.sql and then scripts/sql/asset_print_requests_v2.sql in Supabase, then reload this page.";
const missingV2Message = "3D print team and file tables are missing. Run scripts/sql/asset_print_requests_v2.sql in Supabase, then reload this page.";

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

function formatFileSize(value: number | null | undefined) {
  if (!value) return "";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
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

function printingGaps(hours: number | null, cost: number | null) {
  const gaps: string[] = [];
  if (hours === null || hours <= 0) gaps.push("actual hours (greater than 0)");
  if (cost === null || cost < 0) gaps.push("actual material cost");
  return gaps;
}

function completionGaps(hours: number | null, cost: number | null, notes: string, hoursChecked: boolean) {
  const gaps = printingGaps(hours, cost);
  if (!notes.trim()) gaps.push("operator notes (print errors or design changes)");
  if (!hoursChecked) gaps.push("confirmation that the actual hours have been checked");
  return gaps;
}

function mapObject(row: Record<string, unknown>): PrintObject {
  const numeric = (value: unknown) => (value === null || value === undefined || value === "" ? null : Number(value));
  const text = (value: unknown) => (value as string | null) || null;
  return {
    id: String(row.id || ""),
    request_id: String(row.request_id || ""),
    job_number: String(row.job_number || ""),
    description: String(row.description || ""),
    quantity: Number(row.quantity || 1),
    needed_by: text(row.needed_by),
    priority: (priorityOptions.includes(row.priority as PrintPriority) ? row.priority : "Medium") as PrintPriority,
    status: (statusOptions.includes(row.status as PrintStatus) ? row.status : "Queued") as PrintStatus,
    operator_name: text(row.operator_name),
    operator_email: row.operator_email ? String(row.operator_email).toLowerCase() : null,
    actual_hours: numeric(row.actual_hours),
    material_cost: numeric(row.material_cost),
    buy_cost_estimate: numeric(row.buy_cost_estimate),
    operator_notes: text(row.operator_notes),
    rules_bypassed_by: text(row.rules_bypassed_by),
    rules_bypassed_at: text(row.rules_bypassed_at),
    started_at: text(row.started_at),
    completed_at: text(row.completed_at),
    created_at: text(row.created_at),
  };
}

export default function PrintRequestsPage() {
  const permissions = useImsPermissions();
  const [activeView, setActiveView] = useState<View>("register");
  const [requests, setRequests] = useState<PrintRequest[]>([]);
  const [objects, setObjects] = useState<PrintObject[]>([]);
  const [files, setFiles] = useState<PrintFile[]>([]);
  const [roster, setRoster] = useState<PrintRole[]>([]);
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
  const [queueScope, setQueueScope] = useState<QueueScope>("all");
  const [formProject, setFormProject] = useState("");
  const [formJustification, setFormJustification] = useState("");
  const [teamPersonId, setTeamPersonId] = useState("");
  const [teamRole, setTeamRole] = useState<PrintRoleType>("operator");
  const keyCounter = useRef(0);
  const selectedDetailRef = useRef<HTMLDivElement | null>(null);
  const deepLinkHandled = useRef(false);

  function newObjectDraft(): ObjectDraft {
    keyCounter.current += 1;
    return { key: `object-${keyCounter.current}`, description: "", quantity: "1", needed_by: "", priority: "Medium", buy_cost_estimate: "", files: [] };
  }

  const [objectDrafts, setObjectDrafts] = useState<ObjectDraft[]>(() => [
    { key: "object-0", description: "", quantity: "1", needed_by: "", priority: "Medium", buy_cost_estimate: "", files: [] },
  ]);

  const currentPerson = useMemo(
    () => people.find((person) => (person.email || "").trim().toLowerCase() === currentUserEmail) || null,
    [people, currentUserEmail]
  );
  const currentUserName = currentPerson?.name || currentUserEmail || "Unknown user";
  const rosterEntry = roster.find((entry) => entry.person_email === currentUserEmail) || null;
  const isPrintAdmin = permissions.loaded && (permissions.isMasterAdmin || permissions.isAdmin || rosterEntry?.role === "admin");
  const isOperatorRole = !isPrintAdmin && rosterEntry?.role === "operator";
  const isStaff = isPrintAdmin || isOperatorRole;
  const canCreate = permissions.loaded && permissions.canCreate;
  const roleLabel = isPrintAdmin ? "Admin" : isOperatorRole ? "Operator" : "Requester";

  function operatorMatches(row: { operator_name: string | null; operator_email: string | null }) {
    if (row.operator_email) return row.operator_email === currentUserEmail;
    return Boolean(row.operator_name) && row.operator_name === currentUserName;
  }

  function canProgressRow(row: PrintRow) {
    return isPrintAdmin || (isOperatorRole && operatorMatches(row));
  }

  async function loadData() {
    setLoading(true);
    const [requestRes, objectRes, peopleRes, fileRes, roleRes] = await Promise.all([
      supabase.from("print_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("print_request_objects").select("*").order("created_at", { ascending: true }),
      supabase.from("people").select("id,name,email,role,active").eq("active", true).order("name", { ascending: true }),
      supabase.from("print_request_object_files").select("*").order("uploaded_at", { ascending: true }),
      supabase.from("print_request_roles").select("*").order("person_name", { ascending: true }),
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
      requester_email: row.requester_email ? String(row.requester_email).toLowerCase() : null,
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

    const v2Missing = Boolean(fileRes.error || roleRes.error);
    setFiles(
      fileRes.error
        ? []
        : ((fileRes.data || []) as Array<Record<string, unknown>>).map((row) => ({
            id: String(row.id || ""),
            object_id: String(row.object_id || ""),
            file_name: String(row.file_name || ""),
            file_path: String(row.file_path || ""),
            file_size: row.file_size === null || row.file_size === undefined ? null : Number(row.file_size),
          }))
    );
    setRoster(
      roleRes.error
        ? []
        : ((roleRes.data || []) as Array<Record<string, unknown>>).map((row) => ({
            id: String(row.id || ""),
            person_name: String(row.person_name || ""),
            person_email: String(row.person_email || "").toLowerCase(),
            role: (row.role === "admin" ? "admin" : "operator") as PrintRoleType,
          }))
    );

    setMessage(
      v2Missing
        ? missingV2Message
        : `Loaded ${loadedObjects.length} print job${loadedObjects.length === 1 ? "" : "s"} across ${loadedRequests.length} request${loadedRequests.length === 1 ? "" : "s"}.`
    );
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
    if (isStaff) return allRows;
    return allRows.filter((row) => (row.request?.requester_email || "") === currentUserEmail);
  }, [allRows, currentUserEmail, isStaff]);

  const projectOptions = useMemo(() => {
    const saved = requests.map((request) => request.project).filter(Boolean) as string[];
    return [...new Set(saved.map((project) => project.trim()).filter(Boolean))].sort();
  }, [requests]);

  const requesterOptions = useMemo(
    () => [...new Set(visibleRows.map((row) => row.request?.requester_name).filter(Boolean) as string[])].sort(),
    [visibleRows]
  );

  const myOpenTasks = useMemo(
    () => visibleRows.filter((row) => row.status !== "Completed" && operatorMatches(row)).length,
    [visibleRows, currentUserEmail, currentUserName]
  );

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return visibleRows.filter((row) => {
      const haystack = [row.job_number, row.description, row.request?.request_number, row.request?.requester_name, row.request?.project, row.operator_name]
        .join(" ")
        .toLowerCase();
      return (
        (!query || haystack.includes(query)) &&
        (queueScope === "all" || operatorMatches(row)) &&
        (!statusFilter || row.status === statusFilter) &&
        (!priorityFilter || row.priority === priorityFilter) &&
        (!projectFilter || (row.request?.project || "") === projectFilter) &&
        (!requesterFilter || (row.request?.requester_name || "") === requesterFilter) &&
        (!urgencyFilter ||
          (urgencyFilter === "overdue" && row.overdue) ||
          (urgencyFilter === "high" && row.status !== "Completed" && row.priority === "High") ||
          (urgencyFilter === "open" && row.status !== "Completed") ||
          (urgencyFilter === "unassigned" && row.status !== "Completed" && !row.operator_name))
      );
    });
  }, [priorityFilter, projectFilter, queueScope, requesterFilter, search, statusFilter, urgencyFilter, visibleRows, currentUserEmail, currentUserName]);

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
      unassigned: open.filter((row) => !row.operator_name).length,
      hoursThisMonth,
      saved,
    };
  }, [visibleRows]);

  const selectedRow = useMemo(() => allRows.find((row) => row.id === selectedId) || null, [allRows, selectedId]);
  const selectedFiles = useMemo(() => files.filter((file) => file.object_id === selectedId), [files, selectedId]);

  useEffect(() => {
    if (deepLinkHandled.current || !objects.length) return;
    deepLinkHandled.current = true;
    const job = new URLSearchParams(window.location.search).get("job");
    if (job && objects.some((object) => object.id === job)) setSelectedId(job);
  }, [objects]);

  const tabs = useMemo<Array<{ value: View; label: string }>>(() => {
    const base: Array<{ value: View; label: string }> = [
      { value: "register", label: "Register" },
      { value: "create", label: "Create Request" },
    ];
    if (isPrintAdmin) base.push({ value: "team", label: "Team" });
    return base;
  }, [isPrintAdmin]);

  function selectRow(id: string) {
    setSelectedId(id);
    window.setTimeout(() => selectedDetailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  function requireCreateAccess(actionLabel: string) {
    if (canCreate) return true;
    setMessage(`Permission required: you need to be signed in to ${actionLabel}.`);
    return false;
  }

  function sendJobNotification(args: { toEmail: string; toName: string; row: PrintRow; headline: string; intro: string; title: string }) {
    if (!args.toEmail) return;
    void fetch("/api/notify-assignment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "status-changed",
        recipientEmail: args.toEmail,
        recipientName: args.toName,
        itemType: "3D Print Job",
        itemRef: args.row.job_number,
        itemTitle: args.row.description,
        status: args.row.status,
        dueDate: args.row.needed_by ? formatDate(args.row.needed_by) : undefined,
        itemUrl: `${window.location.origin}/assets/print-requests?job=${encodeURIComponent(args.row.id)}`,
        headline: args.headline,
        intro: args.intro,
        notificationTitle: args.title,
      }),
    });
  }

  function notifyAdminsOfSelfAssign(row: PrintRow) {
    roster
      .filter((entry) => entry.role === "admin" && entry.person_email !== currentUserEmail)
      .forEach((entry) =>
        sendJobNotification({
          toEmail: entry.person_email,
          toName: entry.person_name,
          row,
          headline: "A 3D print job has been self-assigned",
          intro: `${currentUserName} has assigned themselves ${row.job_number}. No action is needed unless you want to change the assignment.`,
          title: `${row.job_number} self-assigned by ${currentUserName}`,
        })
      );
  }

  function notifyAssignmentChange(row: PrintRow, next: PrintRole | null) {
    if (next && next.person_email !== currentUserEmail) {
      sendJobNotification({
        toEmail: next.person_email,
        toName: next.person_name,
        row,
        headline: "You have been assigned a 3D print job",
        intro: `${currentUserName} has assigned ${row.job_number} to you. Open the job to review the request and start printing.`,
        title: `${row.job_number} assigned to you`,
      });
    }
    if (row.operator_email && row.operator_email !== next?.person_email && row.operator_email !== currentUserEmail) {
      sendJobNotification({
        toEmail: row.operator_email,
        toName: row.operator_name || "",
        row,
        headline: "A 3D print job has been reassigned",
        intro: `${row.job_number} has been reassigned from you${next ? ` to ${next.person_name}` : " and is now unassigned"} by ${currentUserName}.`,
        title: `${row.job_number} reassigned`,
      });
    }
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
    setFormProject("");
    setFormJustification("");
    setObjectDrafts([newObjectDraft()]);
  }

  function repeatRequest(requestId: string) {
    if (!requireCreateAccess("repeat a print request")) return;
    const request = requestById.get(requestId);
    const sourceObjects = objects.filter((object) => object.request_id === requestId);
    if (!request || !sourceObjects.length) return;
    setFormProject(request.project || "");
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
    setMessage(`Repeating ${request.request_number}. Set a new needed-by date for each object and confirm the RFQ estimate, then submit.`);
  }

  async function uploadFilesForObject(requestId: string, objectId: string, jobNumber: string, filesToUpload: File[]) {
    let warning = "";
    for (const file of filesToUpload) {
      const path = `PRINT/${requestId}/${objectId}/${Date.now()}-${sanitizeFileName(file.name)}`;
      const upload = await supabase.storage.from(storageBucket).upload(path, file, { upsert: false });
      if (upload.error) {
        warning += ` Upload failed for ${file.name} on ${jobNumber}: ${upload.error.message}`;
        continue;
      }
      const { error } = await supabase.from("print_request_object_files").insert([{
        object_id: objectId,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
        content_type: file.type || null,
        uploaded_by: currentUserName,
      }]);
      if (error) warning += ` Could not record ${file.name} on ${jobNumber}: ${error.message}`;
    }
    return warning;
  }

  async function submitRequest(event: React.FormEvent) {
    event.preventDefault();
    if (!requireCreateAccess("submit 3D print requests")) return;

    const cleaned = objectDrafts.map((draft) => ({
      ...draft,
      description: draft.description.trim(),
      quantity: Number.parseInt(draft.quantity, 10),
      estimate: toNumberOrNull(draft.buy_cost_estimate),
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
    if (cleaned.some((draft) => draft.estimate === null || draft.estimate <= 0)) {
      setMessage("Every object needs an estimated cost to buy greater than £0, based on a procurement RFQ.");
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
        project: formProject.trim() || null,
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
      buy_cost_estimate: draft.estimate,
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
      const draftFiles = cleaned[index]?.files || [];
      if (!draftFiles.length) continue;
      uploadWarning += await uploadFilesForObject(createdRequest.id, created.id, created.job_number, draftFiles);
    }

    setSaving(false);
    resetForm();
    setActiveView("register");
    setMessage(`${requestNumber} submitted with ${objectRows.length} object${objectRows.length === 1 ? "" : "s"}.${uploadWarning}`);
    await loadData();
  }

  async function persistObject(row: PrintRow, patch: Record<string, unknown>, bypass = false) {
    const nowIso = new Date().toISOString();
    const payload: Record<string, unknown> = { ...patch, updated_at: nowIso };
    const nextStatus = patch.status as PrintStatus | undefined;

    if (nextStatus && nextStatus !== row.status) {
      if (nextStatus === "Printing") {
        payload.started_at = row.started_at || nowIso;
        payload.completed_at = null;
      } else if (nextStatus === "Completed") {
        payload.completed_at = nowIso;
        payload.started_at = row.started_at || nowIso;
      } else {
        payload.started_at = null;
        payload.completed_at = null;
      }
    }
    if (bypass) {
      payload.rules_bypassed_by = currentUserName;
      payload.rules_bypassed_at = nowIso;
    }

    setSaving(true);
    const { error } = await supabase.from("print_request_objects").update(payload).eq("id", row.id);
    setSaving(false);
    if (error) {
      setMessage(`Update failed: ${error.message}`);
      return false;
    }
    return true;
  }

  function resolveRoster(name: string) {
    return roster.find((entry) => entry.person_name === name) || null;
  }

  // Applies the progression rules. Operators are blocked while anything is missing;
  // admins are shown what is missing and may bypass, which is recorded on the job.
  function checkRules(row: PrintRow, gaps: string[], target: string): "ok" | "blocked" | "bypass" {
    if (!gaps.length) return "ok";
    if (!isPrintAdmin) {
      setMessage(`${row.job_number} cannot be ${target} yet. Still needed: ${gaps.join("; ")}.`);
      return "blocked";
    }
    const proceed = window.confirm(`${row.job_number} - these are still needed ${target}:\n\n- ${gaps.join("\n- ")}\n\nAdmins can bypass this. Continue anyway?`);
    return proceed ? "bypass" : "blocked";
  }

  function assignmentPatch(row: PrintRow, draft: DetailDraft) {
    if (!isPrintAdmin) return { patch: {} as Record<string, unknown>, next: undefined as PrintRole | null | undefined };
    if ((draft.operator || "") === (row.operator_name || "")) return { patch: {} as Record<string, unknown>, next: undefined as PrintRole | null | undefined };
    const entry = draft.operator ? resolveRoster(draft.operator) : null;
    return {
      patch: { operator_name: entry?.person_name || draft.operator || null, operator_email: entry?.person_email || null } as Record<string, unknown>,
      next: entry,
    };
  }

  async function saveJob(row: PrintRow, draft: DetailDraft) {
    if (!canProgressRow(row)) {
      setMessage("Permission required: only the assigned operator or a print admin can update this job.");
      return;
    }
    const hours = toNumberOrNull(draft.hours);
    const cost = toNumberOrNull(draft.cost);
    const patch: Record<string, unknown> = { actual_hours: hours, material_cost: cost, operator_notes: draft.notes.trim() || null };
    let bypass = false;

    if (row.status !== "Queued") {
      const gaps = row.status === "Printing" ? printingGaps(hours, cost) : completionGaps(hours, cost, draft.notes, true);
      const result = checkRules(row, gaps, `while ${row.status.toLowerCase()}`);
      if (result === "blocked") return;
      bypass = result === "bypass";
    }

    let assignment: ReturnType<typeof assignmentPatch> | null = null;
    if (isPrintAdmin) {
      const buy = toNumberOrNull(draft.buyCost);
      if (buy !== null && buy <= 0) {
        setMessage("The estimated cost to buy must be greater than £0 and based on a procurement RFQ.");
        return;
      }
      patch.buy_cost_estimate = buy;
      assignment = assignmentPatch(row, draft);
      Object.assign(patch, assignment.patch);
    }

    if (!(await persistObject(row, patch, bypass))) return;
    if (assignment && assignment.next !== undefined) notifyAssignmentChange(row, assignment.next);
    setMessage(`${row.job_number} saved.${bypass ? " Rules were bypassed and recorded on the job." : ""}`);
    await loadData();
  }

  async function progressJob(row: PrintRow, target: "Printing" | "Completed", draft: DetailDraft) {
    if (!canProgressRow(row)) {
      setMessage("Permission required: only the assigned operator or a print admin can progress this job.");
      return;
    }
    const hours = toNumberOrNull(draft.hours);
    const cost = toNumberOrNull(draft.cost);
    const gaps = target === "Printing" ? printingGaps(hours, cost) : completionGaps(hours, cost, draft.notes, draft.hoursChecked);
    const result = checkRules(row, gaps, target === "Printing" ? "before printing starts" : "before the job is completed");
    if (result === "blocked") return;

    const patch: Record<string, unknown> = {
      status: target,
      actual_hours: hours,
      material_cost: cost,
      operator_notes: draft.notes.trim() || null,
    };

    let assignment: ReturnType<typeof assignmentPatch> | null = null;
    if (isPrintAdmin) {
      assignment = assignmentPatch(row, draft);
      Object.assign(patch, assignment.patch);
    }
    const effectiveOperator = (patch.operator_name as string | null | undefined) ?? row.operator_name;
    if (!effectiveOperator) {
      patch.operator_name = currentUserName;
      patch.operator_email = currentUserEmail || null;
    }

    if (!(await persistObject(row, patch, result === "bypass"))) return;
    if (assignment && assignment.next !== undefined) notifyAssignmentChange(row, assignment.next);
    if (!effectiveOperator && isOperatorRole) notifyAdminsOfSelfAssign(row);
    setMessage(`${row.job_number} is now ${target.toLowerCase()}.${result === "bypass" ? " Rules were bypassed and recorded on the job." : ""}`);
    await loadData();
  }

  async function moveJobBack(row: PrintRow, target: PrintStatus) {
    if (!canProgressRow(row)) return;
    if (!(await persistObject(row, { status: target }))) return;
    setMessage(`${row.job_number} moved back to ${target.toLowerCase()}.`);
    await loadData();
  }

  async function assignToMe(row: PrintRow) {
    if (!isOperatorRole || row.operator_name) return;
    if (!(await persistObject(row, { operator_name: currentUserName, operator_email: currentUserEmail || null }))) return;
    notifyAdminsOfSelfAssign(row);
    setMessage(`${row.job_number} assigned to you. Print admins have been notified.`);
    await loadData();
  }

  async function addFilesToJob(row: PrintRow, newFiles: File[]) {
    if (!newFiles.length) return;
    setSaving(true);
    const warning = await uploadFilesForObject(row.request_id, row.id, row.job_number, newFiles);
    setSaving(false);
    setMessage(`Added ${newFiles.length} file${newFiles.length === 1 ? "" : "s"} to ${row.job_number}.${warning}`);
    await loadData();
  }

  async function removeFile(file: PrintFile) {
    if (!window.confirm(`Remove ${file.file_name}?`)) return;
    await supabase.storage.from(storageBucket).remove([file.file_path]);
    const { error } = await supabase.from("print_request_object_files").delete().eq("id", file.id);
    if (error) {
      setMessage(`Remove failed: ${error.message}`);
      return;
    }
    setMessage(`${file.file_name} removed.`);
    await loadData();
  }

  async function deleteObject(row: PrintRow) {
    if (!isPrintAdmin) {
      setMessage("Permission required: only a print admin can delete print jobs.");
      return;
    }
    if (!window.confirm(`Delete ${row.job_number}? This cannot be undone.`)) return;

    const rowFiles = files.filter((file) => file.object_id === row.id);
    if (rowFiles.length) {
      await supabase.storage.from(storageBucket).remove(rowFiles.map((file) => file.file_path));
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

  async function openFile(path: string) {
    const { data, error } = await supabase.storage.from(storageBucket).createSignedUrl(path, 60 * 60 * 24 * 180);
    if (error || !data?.signedUrl) {
      setMessage(`File link failed: ${error?.message || "No link returned"}`);
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function addTeamMember() {
    if (!isPrintAdmin) return;
    const person = people.find((item) => item.id === teamPersonId);
    if (!person) {
      setMessage("Select a person to add to the print team.");
      return;
    }
    if (!person.email) {
      setMessage(`No email on file for ${person.name}. Add one on the People record first.`);
      return;
    }
    const { error } = await supabase.from("print_request_roles").insert([{ person_name: person.name, person_email: person.email.trim().toLowerCase(), role: teamRole }]);
    if (error) {
      setMessage(`Add failed: ${error.message}`);
      return;
    }
    setTeamPersonId("");
    setMessage(`${person.name} added as ${teamRole === "admin" ? "a print admin" : "an operator"}.`);
    await loadData();
  }

  async function changeTeamRole(entry: PrintRole, role: PrintRoleType) {
    if (!isPrintAdmin) return;
    const { error } = await supabase.from("print_request_roles").update({ role }).eq("id", entry.id);
    if (error) {
      setMessage(`Update failed: ${error.message}`);
      return;
    }
    setMessage(`${entry.person_name} is now ${role === "admin" ? "a print admin" : "an operator"}.`);
    await loadData();
  }

  async function removeTeamMember(entry: PrintRole) {
    if (!isPrintAdmin) return;
    if (!window.confirm(`Remove ${entry.person_name} from the print team? Jobs already assigned to them keep their assignment.`)) return;
    const { error } = await supabase.from("print_request_roles").delete().eq("id", entry.id);
    if (error) {
      setMessage(`Remove failed: ${error.message}`);
      return;
    }
    setMessage(`${entry.person_name} removed from the print team.`);
    await loadData();
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
      "Rules Bypassed By": row.rules_bypassed_by || "",
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
      const ink = [...exportRgb.ink] as [number, number, number];
      const muted = [...exportRgb.muted] as [number, number, number];
      const brand = [...exportRgb.brand] as [number, number, number];

      try {
        const logoResponse = await fetch("/enshore-primary-logo-colour.png");
        if (logoResponse.ok) {
          doc.addImage(await toDataUrl(await logoResponse.blob()), "PNG", margin, 8, 40, 20);
        }
      } catch {
        // Keep PDF generation resilient if the logo cannot be loaded.
      }

      doc.setFont(exportTypography.pdfFont, "bold");
      doc.setTextColor(...ink);
      doc.setFontSize(exportTypography.titlePt);
      doc.text("3D Print Request Register", pageWidth - margin, 16, { align: "right" });
      doc.setFont(exportTypography.pdfFont, "normal");
      doc.setFontSize(exportTypography.bodyPt);
      doc.setTextColor(...muted);
      doc.text(`Generated: ${generatedAt} | ${filteredRows.length} print job${filteredRows.length === 1 ? "" : "s"}`, pageWidth - margin, 22, { align: "right" });
      doc.setDrawColor(...brand);
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
              row.operator_name || "Unassigned",
              row.actual_hours === null ? "-" : row.actual_hours.toFixed(1),
              formatMoney(row.material_cost),
            ])
          : [["No print jobs match the current filters", "", "", "", "", "", "", "", "", "", "", ""]],
        styles: { fontSize: exportTypography.tablePt, cellPadding: 2.2, lineColor: [...exportRgb.border], lineWidth: 0.2, textColor: ink, overflow: "linebreak" },
        headStyles: { ...exportPdfTableTheme.headStyles, fillColor: [...exportPdfTableTheme.headStyles.fillColor], textColor: [...exportPdfTableTheme.headStyles.textColor] },
        alternateRowStyles: { fillColor: [...exportPdfTableTheme.alternateRowStyles.fillColor] },
        rowPageBreak: "avoid",
      });

      const pageCount = doc.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) {
        doc.setPage(page);
        doc.setFont(exportTypography.pdfFont, "normal");
        doc.setFontSize(exportTypography.captionPt);
        doc.setTextColor(...muted);
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
    setQueueScope("all");
  }

  const teamCandidates = people.filter((person) => person.email && !roster.some((entry) => entry.person_email === (person.email || "").trim().toLowerCase()));

  return (
    <main>
      <QualityPageHero
        label="ASSET MANAGEMENT"
        title="3D Print Requests"
        description="One request can hold several printable objects. Each object is queued, printed and costed independently."
        contextCards={[
          { label: "Open Jobs", value: kpis.open },
          { label: "Access", value: roleLabel },
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
            {isStaff ? <QualityKpiCard title="Unassigned" value={kpis.unassigned} accent={imsColours.muted} active={urgencyFilter === "unassigned"} onClick={() => setUrgencyFilter(urgencyFilter === "unassigned" ? "" : "unassigned")} /> : null}
            {isStaff ? <QualityKpiCard title="Hours Logged This Month" value={kpis.hoursThisMonth.toFixed(1)} accent={imsColours.blue} /> : null}
            {isPrintAdmin ? <QualityKpiCard title="Est. Saved vs Buying" value={`£${Math.round(kpis.saved).toLocaleString("en-GB")}`} accent={imsColours.muted} /> : null}
          </section>

          <section style={registerGridStyle}>
            <ImsPanel
              title="3D Print Register"
              subtitle={isStaff ? "Every printable object across every request, prioritised automatically: overdue first, then highest priority nearest its deadline." : "Your print requests and their progress through the queue."}
            >
              {isStaff ? (
                <div style={{ ...buttonRowStyle, marginBottom: 14 }}>
                  <ImsButton variant={queueScope === "all" ? "primary" : "secondary"} onClick={() => setQueueScope("all")}>All Jobs ({visibleRows.length})</ImsButton>
                  <ImsButton variant={queueScope === "mine" ? "primary" : "secondary"} onClick={() => setQueueScope("mine")}>My Tasks ({myOpenTasks})</ImsButton>
                </div>
              ) : null}
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
                {isStaff ? (
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
                        <td data-label="Status" style={imsTableCellStyle}><StatusPill status={row.status} /></td>
                        <td data-label="Operator" style={imsTableCellStyle}>{row.operator_name || "Unassigned"}</td>
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
                  files={selectedFiles}
                  siblingCount={objects.filter((object) => object.request_id === selectedRow.request_id).length}
                  rosterEntries={roster}
                  isPrintAdmin={isPrintAdmin}
                  isOperatorRole={isOperatorRole}
                  canProgress={canProgressRow(selectedRow)}
                  canManageFiles={canProgressRow(selectedRow) || (selectedRow.request?.requester_email || "") === currentUserEmail}
                  canRepeat={canCreate}
                  saving={saving}
                  onSave={(draft) => void saveJob(selectedRow, draft)}
                  onStart={(draft) => void progressJob(selectedRow, "Printing", draft)}
                  onComplete={(draft) => void progressJob(selectedRow, "Completed", draft)}
                  onMoveBack={(target) => void moveJobBack(selectedRow, target)}
                  onAssignToMe={() => void assignToMe(selectedRow)}
                  onDelete={() => void deleteObject(selectedRow)}
                  onRepeat={() => repeatRequest(selectedRow.request_id)}
                  onOpenFile={(path) => void openFile(path)}
                  onRemoveFile={(file) => void removeFile(file)}
                  onAddFiles={(newFiles) => void addFilesToJob(selectedRow, newFiles)}
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
                <input style={imsInputStyle} list="print-request-projects" value={formProject} onChange={(event) => setFormProject(event.target.value)} placeholder="Enter a project (optional)" />
                <datalist id="print-request-projects">
                  {projectOptions.map((project) => <option key={project} value={project} />)}
                </datalist>
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
                  <Field label="Estimated cost to buy, total £ (from procurement RFQ)">
                    <input type="number" min={0.01} step="0.01" style={imsInputStyle} value={draft.buy_cost_estimate} onChange={(event) => updateDraft(draft.key, { buy_cost_estimate: event.target.value })} placeholder="Must be greater than 0" />
                  </Field>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <Field label="Examples of the component (photos, drawings or CAD files)">
                      <ReferenceFilesControl
                        files={draft.files}
                        disabled={saving}
                        onAdd={(added) => updateDraft(draft.key, { files: [...draft.files, ...added] })}
                        onRemove={(position) => updateDraft(draft.key, { files: draft.files.filter((_, fileIndex) => fileIndex !== position) })}
                      />
                    </Field>
                  </div>
                </div>
                {objectDrafts.length > 1 ? (
                  <div style={{ ...buttonRowStyle, marginTop: 12 }}>
                    <ImsButton variant="danger" onClick={() => removeDraft(draft.key)}>Discard Object</ImsButton>
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

      {activeView === "team" && isPrintAdmin ? (
        <ImsPanel title="3D Print Team" subtitle="Operators print and cost jobs. Print admins assign jobs, see everything and can bypass the progression rules. Everyone else is a requester. System administrators always have admin access.">
          <div style={{ ...imsFormGridStyle, marginBottom: 14, alignItems: "end" }}>
            <Field label="Person">
              <select style={imsInputStyle} value={teamPersonId} onChange={(event) => setTeamPersonId(event.target.value)}>
                <option value="">Select person</option>
                {teamCandidates.map((person) => <option key={person.id} value={person.id}>{person.name}{person.role ? ` - ${person.role}` : ""}</option>)}
              </select>
            </Field>
            <Field label="Role">
              <select style={imsInputStyle} value={teamRole} onChange={(event) => setTeamRole(event.target.value as PrintRoleType)}>
                <option value="operator">Operator</option>
                <option value="admin">Print admin</option>
              </select>
            </Field>
            <div style={buttonRowStyle}>
              <ImsButton onClick={() => void addTeamMember()} disabled={!teamPersonId}>Add To Team</ImsButton>
            </div>
          </div>

          <div style={imsTableInfoRowStyle}>Showing <strong>{roster.length}</strong> team member{roster.length === 1 ? "" : "s"}</div>
          <div className="observation-table-wrap" style={{ overflowX: "auto", border: "1px solid #D0D0CE", borderRadius: "14px" }}>
            <table className="observation-table" style={{ ...imsTableStyle, minWidth: 640 }}>
              <thead>
                <tr>
                  {["Name", "Email", "Role", "Action"].map((heading) => <th key={heading} style={imsTableHeadStyle}>{heading}</th>)}
                </tr>
              </thead>
              <tbody>
                {roster.map((entry) => (
                  <tr key={entry.id} style={rowStyle}>
                    <td data-label="Name" style={{ ...imsTableCellStyle, fontWeight: 900, color: imsColours.brandDark }}>{entry.person_name}</td>
                    <td data-label="Email" style={imsTableCellStyle}>{entry.person_email}</td>
                    <td data-label="Role" style={imsTableCellStyle}>
                      <select style={imsInputStyle} value={entry.role} onChange={(event) => void changeTeamRole(entry, event.target.value as PrintRoleType)} aria-label={`Role for ${entry.person_name}`}>
                        <option value="operator">Operator</option>
                        <option value="admin">Print admin</option>
                      </select>
                    </td>
                    <td data-label="Action" style={imsTableCellStyle}>
                      <ImsButton variant="danger" onClick={() => void removeTeamMember(entry)}>Remove</ImsButton>
                    </td>
                  </tr>
                ))}
                {!roster.length ? <tr><td colSpan={4} style={emptyCellStyle}>No operators or print admins yet. Add people above.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </ImsPanel>
      ) : null}
    </main>
  );
}

function JobDetail({
  row,
  files,
  siblingCount,
  rosterEntries,
  isPrintAdmin,
  isOperatorRole,
  canProgress,
  canManageFiles,
  canRepeat,
  saving,
  onSave,
  onStart,
  onComplete,
  onMoveBack,
  onAssignToMe,
  onDelete,
  onRepeat,
  onOpenFile,
  onRemoveFile,
  onAddFiles,
}: {
  row: PrintRow;
  files: PrintFile[];
  siblingCount: number;
  rosterEntries: PrintRole[];
  isPrintAdmin: boolean;
  isOperatorRole: boolean;
  canProgress: boolean;
  canManageFiles: boolean;
  canRepeat: boolean;
  saving: boolean;
  onSave: (draft: DetailDraft) => void;
  onStart: (draft: DetailDraft) => void;
  onComplete: (draft: DetailDraft) => void;
  onMoveBack: (target: PrintStatus) => void;
  onAssignToMe: () => void;
  onDelete: () => void;
  onRepeat: () => void;
  onOpenFile: (path: string) => void;
  onRemoveFile: (file: PrintFile) => void;
  onAddFiles: (files: File[]) => void;
}) {
  const [operator, setOperator] = useState(row.operator_name || "");
  const [hours, setHours] = useState(row.actual_hours === null ? "" : String(row.actual_hours));
  const [cost, setCost] = useState(row.material_cost === null ? "" : String(row.material_cost));
  const [buyCost, setBuyCost] = useState(row.buy_cost_estimate === null ? "" : String(row.buy_cost_estimate));
  const [notes, setNotes] = useState(row.operator_notes || "");
  const [hoursChecked, setHoursChecked] = useState(false);

  useEffect(() => {
    setOperator(row.operator_name || "");
    setHours(row.actual_hours === null ? "" : String(row.actual_hours));
    setCost(row.material_cost === null ? "" : String(row.material_cost));
    setBuyCost(row.buy_cost_estimate === null ? "" : String(row.buy_cost_estimate));
    setNotes(row.operator_notes || "");
  }, [row.id, row.status, row.operator_name, row.actual_hours, row.material_cost, row.buy_cost_estimate, row.operator_notes]);

  useEffect(() => {
    setHoursChecked(false);
  }, [row.id, row.status]);

  const draft: DetailDraft = { operator, hours, cost, buyCost, notes, hoursChecked };
  const completed = row.status === "Completed";

  return (
    <ImsPanel title={`Print Job Detail - ${row.job_number}`} subtitle="Review the job and its examples, assign it, then record hours, cost and notes as it moves through the queue.">
      <div style={detailGridStyle}>
        <Info label="Request" value={row.request?.request_number} />
        <Info label="Requester" value={row.request?.requester_name} />
        <Info label="Project" value={row.request?.project} />
        <Info label="Quantity" value={row.quantity} />
        <Info label="Needed By" value={formatDate(row.needed_by)} />
        <Info label="Urgency" value={urgencyLabel(row)} />
        <Info label="Status" value={row.status} />
        <Info label="Operator" value={row.operator_name || "Unassigned"} />
        <Info label="Objects In Request" value={siblingCount} />
        <Info label="Est. Cost To Buy (RFQ)" value={formatMoney(row.buy_cost_estimate)} />
        <Info label="Completed On" value={formatDate(row.completed_at)} />
        {row.rules_bypassed_by ? <Info label="Rules Bypassed By" value={`${row.rules_bypassed_by} on ${formatDate(row.rules_bypassed_at)}`} /> : null}
      </div>
      <div style={narrativeGridStyle}>
        <Info label="Object" value={row.description} large />
        <Info label="Why Print Instead Of Buy" value={row.request?.justification} large />
      </div>

      <div style={{ marginBottom: 14 }}>
        <h3 style={subHeadingStyle}>Reference Examples ({files.length})</h3>
        <div style={{ display: "grid", gap: 10 }}>
          {files.map((file) => (
            <div key={file.id} style={referenceItemStyle}>
              <span><strong>{file.file_name}</strong>{file.file_size ? ` · ${formatFileSize(file.file_size)}` : ""}</span>
              <div style={buttonRowStyle}>
                <ImsButton variant="secondary" onClick={() => onOpenFile(file.file_path)}>Open</ImsButton>
                {canManageFiles ? <ImsButton variant="danger" onClick={() => onRemoveFile(file)} disabled={saving}>Remove</ImsButton> : null}
              </div>
            </div>
          ))}
          {!files.length ? <div style={emptyStateStyle}>No reference examples were provided with this request.</div> : null}
          {canManageFiles ? <ReferenceFilesControl files={[]} disabled={saving} onAdd={onAddFiles} onRemove={() => undefined} /> : null}
        </div>
      </div>

      {canProgress ? (
        <div style={editPanelStyle}>
          <div style={imsFormGridStyle}>
            <Field label="Operator">
              {isPrintAdmin ? (
                <select style={imsInputStyle} value={operator} onChange={(event) => setOperator(event.target.value)}>
                  <option value="">Unassigned</option>
                  {operator && !rosterEntries.some((entry) => entry.person_name === operator) ? <option value={operator}>{operator}</option> : null}
                  {rosterEntries.map((entry) => <option key={entry.id} value={entry.person_name}>{entry.person_name}{entry.role === "admin" ? " (admin)" : ""}</option>)}
                </select>
              ) : (
                <input style={readOnlyInputStyle} value={row.operator_name || "Unassigned"} readOnly />
              )}
            </Field>
            <Field label="Actual hours (time taken to print)">
              <input type="number" min={0} step="0.1" style={imsInputStyle} value={hours} onChange={(event) => setHours(event.target.value)} />
            </Field>
            <Field label="Actual material cost £ (material used)">
              <input type="number" min={0} step="0.01" style={imsInputStyle} value={cost} onChange={(event) => setCost(event.target.value)} />
            </Field>
            {isPrintAdmin ? (
              <Field label="Estimated cost to buy £ (procurement RFQ)">
                <input type="number" min={0.01} step="0.01" style={imsInputStyle} value={buyCost} onChange={(event) => setBuyCost(event.target.value)} />
              </Field>
            ) : null}
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Operator notes (print errors, design modifications)">
                <textarea style={imsTextareaStyle} value={notes} onChange={(event) => setNotes(event.target.value)} />
              </Field>
            </div>
            {!completed ? (
              <label style={checkRowStyle}>
                <input type="checkbox" checked={hoursChecked} onChange={(event) => setHoursChecked(event.target.checked)} />
                <span>I have checked the actual hours are correct</span>
              </label>
            ) : null}
          </div>
          <p style={ruleNoteStyle}>
            Printing can start once actual hours and material cost are entered (they can be updated later). A job can be completed once operator notes are entered and the hours are confirmed.
            {isPrintAdmin ? " As a print admin you will be prompted if anything is missing and can choose to bypass." : ""}
          </p>
          <div style={buttonRowStyle}>
            <ImsButton disabled={saving} onClick={() => onSave(draft)}>{saving ? "Saving..." : "Save Job"}</ImsButton>
            {row.status === "Queued" ? <ImsButton disabled={saving} onClick={() => onStart(draft)}>Start Printing</ImsButton> : null}
            {!completed ? <ImsButton disabled={saving} onClick={() => onComplete(draft)}>Mark Complete</ImsButton> : null}
            {row.status === "Printing" ? <ImsButton variant="secondary" disabled={saving} onClick={() => onMoveBack("Queued")}>Return To Queue</ImsButton> : null}
            {completed ? <ImsButton variant="secondary" disabled={saving} onClick={() => onMoveBack("Printing")}>Reopen Job</ImsButton> : null}
            {canRepeat ? <ImsButton variant="secondary" onClick={onRepeat}>Repeat Request</ImsButton> : null}
            {isPrintAdmin ? <ImsButton variant="danger" onClick={onDelete}>Delete Job</ImsButton> : null}
          </div>
        </div>
      ) : (
        <div style={editPanelStyle}>
          <div style={detailGridStyle}>
            <Info label="Actual Hours" value={formatHours(row.actual_hours)} />
            <Info label="Material Cost" value={formatMoney(row.material_cost)} />
          </div>
          {row.operator_notes ? <Info label="Operator Notes" value={row.operator_notes} large /> : null}
          <div style={buttonRowStyle}>
            {isOperatorRole && !row.operator_name && !completed ? <ImsButton onClick={onAssignToMe} disabled={saving}>Assign To Me</ImsButton> : null}
            {canRepeat ? <ImsButton variant="secondary" onClick={onRepeat}>Repeat Request</ImsButton> : null}
          </div>
          {isOperatorRole && row.operator_name ? <p style={ruleNoteStyle}>This job is assigned to {row.operator_name}. A print admin can reassign it.</p> : null}
        </div>
      )}
    </ImsPanel>
  );
}

function ReferenceFilesControl({
  files,
  disabled,
  onAdd,
  onRemove,
}: {
  files: File[];
  disabled: boolean;
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <label
        style={{ ...dropZoneStyle, ...(isDragOver && !disabled ? dropZoneActiveStyle : {}), opacity: disabled ? 0.6 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragOver(false);
          if (disabled) return;
          const dropped = Array.from(event.dataTransfer.files || []);
          if (dropped.length) onAdd(dropped);
        }}
      >
        {isDragOver ? "Drop files to attach" : "Add reference examples (or drag several files here)"}
        <input
          type="file"
          multiple
          style={{ display: "none" }}
          disabled={disabled}
          onChange={(event) => {
            const chosen = Array.from(event.target.files || []);
            event.currentTarget.value = "";
            if (chosen.length) onAdd(chosen);
          }}
        />
      </label>
      {files.length ? (
        <div style={{ display: "grid", gap: 8 }}>
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} style={referenceItemStyle}>
              <span><strong>{file.name}</strong> · {formatFileSize(file.size)}</span>
              <ImsButton variant="secondary" onClick={() => onRemove(index)} disabled={disabled}>Discard</ImsButton>
            </div>
          ))}
        </div>
      ) : null}
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
const checkRowStyle: CSSProperties = { gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 10, color: "#53565A", fontSize: "13px", fontWeight: 800 };
const ruleNoteStyle: CSSProperties = { margin: 0, color: "#53565A", fontSize: "13px", lineHeight: 1.5 };
const dropZoneStyle: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", border: "2px dashed #63B1BC", borderRadius: 10, background: "#ECECE7", color: "#005670", fontWeight: 800, padding: "10px 14px", minHeight: 42, boxSizing: "border-box" };
const dropZoneActiveStyle: CSSProperties = { background: "#EEF7F8", borderColor: "#005670" };

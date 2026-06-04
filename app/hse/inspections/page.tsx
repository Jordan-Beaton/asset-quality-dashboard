"use client";

import type { ChangeEvent, CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { QualityKpiCard } from "../../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../../src/components/QualityPageHero";
import { supabase } from "../../../src/lib/supabase";

export const dynamic = "force-dynamic";

type InspectionView = "dashboard" | "register" | "create";
type InspectionStatus = "Draft" | "Open" | "Complete" | "Closed";
type ChecklistAnswer = "N/A" | "Yes" | "No" | "";

type InspectionTemplate = {
  id: string;
  documentNumber: string;
  revision: string;
  revisionDate: string;
  title: string;
  description: string;
  focus: string[];
  sections: string[];
  enabled: boolean;
};

type ChecklistItem = {
  id: string;
  number: string;
  text: string;
};

type ChecklistSection = {
  id: string;
  title: string;
  items: ChecklistItem[];
};

type ChecklistResponse = {
  answer: ChecklistAnswer;
  comments: string;
};

type InspectionAction = {
  action: string;
  action_by: string;
  target_date: string;
};

type HseInspectionRecord = {
  id: string;
  inspection_number: string;
  form_id: string;
  form_number: string;
  form_revision: string | null;
  form_revision_date: string | null;
  form_title: string;
  title: string;
  department: string | null;
  project_work_scope: string | null;
  vessel_spread: string | null;
  area_zone: string | null;
  inspection_date: string | null;
  inspector_name: string | null;
  inspector_position: string | null;
  status: InspectionStatus;
  checklist_responses: Record<string, ChecklistResponse>;
  additional_comments: string | null;
  actions: InspectionAction[];
  signoff_name: string | null;
  signoff_position: string | null;
  signoff_company: string | null;
  signoff_date: string | null;
  created_at: string;
  updated_at: string;
};

type InspectionEvidence = {
  id: string;
  inspection_id: string;
  item_number: string | null;
  file_name: string;
  file_path: string;
  file_size: number | null;
  content_type: string | null;
  notes: string | null;
  uploaded_at: string;
};

type CentralAction = {
  id: string;
  action_number: string | null;
  title: string | null;
  owner: string | null;
  status: string | null;
  priority: string | null;
  due_date: string | null;
  source: string | null;
  linked_hse_inspection_id?: string | null;
  linked_hse_inspection_number?: string | null;
};

type PeopleOption = {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  department: string | null;
  active: boolean | null;
};

type PendingEvidence = {
  id: string;
  file: File;
  item_number: string;
};

const evidenceBucket = "quality-evidence";
const defaultTemplateId = "workplace-base-site";

const inspectionTemplates: InspectionTemplate[] = [
  {
    id: "vessel-pre-sail",
    documentNumber: "ENS-HSEQ-FRM-046",
    revision: "",
    revisionDate: "",
    title: "Vessel Pre-Sail Inspection",
    description: "Pre-sail readiness check for vessel condition, operational controls, permits, emergency preparedness, and close-out actions.",
    focus: ["Vessel readiness", "Operational controls", "Emergency preparedness", "Evidence photos"],
    sections: ["Vessel details", "Crew and readiness", "Safety equipment", "Deck and lifting controls", "Emergency response", "Actions and evidence"],
    enabled: false,
  },
  {
    id: "workplace-office",
    documentNumber: "ENS-HSEQ-FRM-041",
    revision: "",
    revisionDate: "",
    title: "Workplace Inspection - Office",
    description: "Office workplace inspection covering welfare, housekeeping, fire safety, access, electrical safety, and local actions.",
    focus: ["Office safety", "Housekeeping", "Fire/access controls", "Corrective actions"],
    sections: ["Inspection details", "Office environment", "Fire and emergency controls", "Electrical and workstation checks", "Findings", "Actions and evidence"],
    enabled: false,
  },
  {
    id: "workplace-offshore",
    documentNumber: "ENS-HSEQ-FRM-042",
    revision: "",
    revisionDate: "",
    title: "Workplace Inspection - Offshore",
    description: "Offshore workplace inspection for live worksite conditions, equipment, emergency arrangements, and operational controls.",
    focus: ["Offshore worksite", "Equipment condition", "Permit controls", "Evidence photos"],
    sections: ["Inspection details", "Worksite controls", "Equipment and tools", "Permit and procedural controls", "Emergency arrangements", "Actions and evidence"],
    enabled: false,
  },
  {
    id: "workplace-mobilisation",
    documentNumber: "ENS-HSEQ-FRM-043",
    revision: "",
    revisionDate: "",
    title: "Workplace Inspection - Mobilisation",
    description: "Mobilisation inspection for project readiness, packing, lifting, documents, equipment, and handover controls.",
    focus: ["Mobilisation readiness", "Packing/lifting", "Documentation", "Close-out actions"],
    sections: ["Mobilisation details", "Equipment readiness", "Packing and lifting", "Documentation and certification", "Findings", "Actions and evidence"],
    enabled: false,
  },
  {
    id: defaultTemplateId,
    documentNumber: "ENS-HSEQ-FRM-044",
    revision: "E",
    revisionDate: "2026-05-19",
    title: "Workplace Inspection - Base and Site",
    description: "Base and site workplace inspection for yard, workshop, stores, access, welfare, emergency controls, and local observations.",
    focus: ["Base/site condition", "Workshop and stores", "Access/welfare", "Inspection evidence"],
    sections: ["Inspection details", "Administration and documentation", "Working area", "Machinery, equipment and tools", "Storage area", "Actions and sign-off"],
    enabled: true,
  },
  {
    id: "dropped-objects",
    documentNumber: "ENS-HSEQ-FRM-045",
    revision: "",
    revisionDate: "",
    title: "Workplace Inspection - Dropped Objects",
    description: "Dropped object focused inspection covering work at height, securing arrangements, tool control, exclusion zones, and corrective actions.",
    focus: ["Dropped object prevention", "Securing arrangements", "Tool control", "Action close-out"],
    sections: ["Inspection details", "Dropped object controls", "Work at height", "Tools and equipment", "Exclusion zones", "Actions and evidence"],
    enabled: false,
  },
];

const baseSiteChecklist: ChecklistSection[] = [
  {
    id: "admin",
    title: "1.0 Administration and Documentation",
    items: [
      { id: "1.1", number: "1.1", text: "Risk Assessment and Task Plan (as applicable) available for work performed?" },
      { id: "1.2", number: "1.2", text: "Permit to Work (as applicable) available for work performed?" },
      { id: "1.3", number: "1.3", text: "Toolbox Talk delivered and documented for work / attendance?" },
      { id: "1.4", number: "1.4", text: "Lift Plan (as applicable) available for work performed?" },
      { id: "1.5", number: "1.5", text: "HSE Notice Board is up to date?" },
      { id: "1.6", number: "1.6", text: "Other administration/documentation observations." },
    ],
  },
  {
    id: "working_area",
    title: "2.0 Working Area",
    items: [
      { id: "2.1", number: "2.1", text: "Housekeeping is satisfactory?" },
      { id: "2.2", number: "2.2", text: "Ventilation is satisfactory?" },
      { id: "2.3", number: "2.3", text: "Lighting is satisfactory?" },
      { id: "2.4", number: "2.4", text: "Noise levels satisfactory or managed where applicable?" },
      { id: "2.5", number: "2.5", text: "Waste segregation in place and implemented?" },
      { id: "2.6", number: "2.6", text: "Visible obstructions are highlighted?" },
      { id: "2.7", number: "2.7", text: "Cabling condition is satisfactory?" },
      { id: "2.8", number: "2.8", text: "Ladders identification, condition, use and storage is satisfactory?" },
      { id: "2.9", number: "2.9", text: "Barriers / railings are satisfactory?" },
      { id: "2.10", number: "2.10", text: "Escape exits are satisfactory?" },
      { id: "2.11", number: "2.11", text: "Evacuation routes are satisfactory?" },
      { id: "2.12", number: "2.12", text: "Safety signs are available and satisfactory?" },
      { id: "2.13", number: "2.13", text: "PPE arrangements are complied with?" },
      { id: "2.14", number: "2.14", text: "Chemical control is satisfactory?" },
      { id: "2.15", number: "2.15", text: "Spill kits are available where required and stocked?" },
      { id: "2.16", number: "2.16", text: "Bunded storage areas are satisfactory?" },
      { id: "2.17", number: "2.17", text: "Container storage areas are satisfactory?" },
      { id: "2.18", number: "2.18", text: "Fire extinguishers available and inspection date current?" },
      { id: "2.19", number: "2.19", text: "Eye wash station available and satisfactory?" },
      { id: "2.20", number: "2.20", text: "Fire alarm tested and logbook up to date?" },
      { id: "2.21", number: "2.21", text: "Walkways are satisfactory?" },
      { id: "2.22", number: "2.22", text: "Roller shutter doors are secure and control access appropriately?" },
      { id: "2.23", number: "2.23", text: "Door integrity satisfactory with no obvious damage, warping, or misalignment?" },
      { id: "2.24", number: "2.24", text: "Guide tracks and supports visually/physically checked for obstructions or damage?" },
      { id: "2.25", number: "2.25", text: "Fire/egress clearance around doors maintained?" },
      { id: "2.26", number: "2.26", text: "Safety devices functional, including automatic closing, safety edges, manual chains?" },
      { id: "2.27", number: "2.27", text: "Remote controls or wall switches functioning and labelled?" },
      { id: "2.28", number: "2.28", text: "Emergency stop accessible and tested?" },
      { id: "2.29", number: "2.29", text: "Door opens/closes smoothly without unusual noises or resistance?" },
      { id: "2.30", number: "2.30", text: "Pinch points and gaps guarded to prevent injury?" },
      { id: "2.31", number: "2.31", text: "Maintenance and service records up to date?" },
      { id: "2.32", number: "2.32", text: "No signs of leaks, weather seal damage, or water ingress around the area?" },
      { id: "2.33", number: "2.33", text: "People trained in safe operation and use of roller shutter doors?" },
      { id: "2.34", number: "2.34", text: "Shutdown/lockout procedures in place for maintenance?" },
      { id: "2.35", number: "2.35", text: "Welfare changing rooms are satisfactory?" },
      { id: "2.36", number: "2.36", text: "Welfare toilets are satisfactory?" },
      { id: "2.37", number: "2.37", text: "Welfare eating room is satisfactory?" },
      { id: "2.38", number: "2.38", text: "General PC and office equipment setup is satisfactory?" },
      { id: "2.39", number: "2.39", text: "First Aid provision is satisfactory?" },
      { id: "2.40", number: "2.40", text: "Other working area observations." },
    ],
  },
  {
    id: "machinery",
    title: "3.0 Machinery, Equipment and Tools",
    items: [
      { id: "3.1", number: "3.1", text: "Forklift truck inspection form completed and safety systems satisfactory?" },
      { id: "3.2", number: "3.2", text: "Forklift operator named and trained for use?" },
      { id: "3.3", number: "3.3", text: "Cherry picker inspection form completed and safety systems satisfactory?" },
      { id: "3.4", number: "3.4", text: "Cherry picker operator named and trained for use?" },
      { id: "3.5", number: "3.5", text: "Overhead crane inspection form completed?" },
      { id: "3.6", number: "3.6", text: "Crane thorough examination certification available?" },
      { id: "3.7", number: "3.7", text: "Emergency stop button tested and satisfactory?" },
      { id: "3.8", number: "3.8", text: "Machinery free from signs of leaks or spillages?" },
      { id: "3.9", number: "3.9", text: "Crane operator named and trained for use?" },
      { id: "3.10", number: "3.10", text: "Lifting equipment colour coding implemented?" },
      { id: "3.11", number: "3.11", text: "Lifting equipment certification available?" },
      { id: "3.12", number: "3.12", text: "Portable appliance testing is completed?" },
      { id: "3.13", number: "3.13", text: "Other machinery, equipment, or tools observations." },
    ],
  },
  {
    id: "storage",
    title: "4.0 Storage Area",
    items: [
      { id: "4.1", number: "4.1", text: "Housekeeping is satisfactory?" },
      { id: "4.2", number: "4.2", text: "Access and egress are satisfactory?" },
      { id: "4.3", number: "4.3", text: "Waste segregation is implemented?" },
      { id: "4.4", number: "4.4", text: "Bunded storage areas are satisfactory?" },
      { id: "4.5", number: "4.5", text: "Chemical spill kits are available for use?" },
      { id: "4.6", number: "4.6", text: "Container storage area is satisfactory?" },
      { id: "4.7", number: "4.7", text: "General security is satisfactory?" },
      { id: "4.8", number: "4.8", text: "Chemical storage is satisfactory?" },
      { id: "4.9", number: "4.9", text: "Chemical data sheets / assessments are available?" },
      { id: "4.10", number: "4.10", text: "Document archive area secure and dry with shelving/boxes intact?" },
      { id: "4.11", number: "4.11", text: "Other storage area observations." },
    ],
  },
];

const checklistItemOptions = baseSiteChecklist.flatMap((section) => section.items.map((item) => ({
  id: item.id,
  label: `${item.number} - ${item.text}`,
})));

const emptyRecord: HseInspectionRecord = {
  id: "",
  inspection_number: "",
  form_id: defaultTemplateId,
  form_number: "ENS-HSEQ-FRM-044",
  form_revision: "E",
  form_revision_date: "2026-05-19",
  form_title: "Workplace Inspection - Base and Site",
  title: "",
  department: "HSEQ",
  project_work_scope: "",
  vessel_spread: "",
  area_zone: "",
  inspection_date: new Date().toISOString().slice(0, 10),
  inspector_name: "",
  inspector_position: "",
  status: "Draft",
  checklist_responses: {},
  additional_comments: "",
  actions: [],
  signoff_name: "",
  signoff_position: "",
  signoff_company: "Enshore Subsea",
  signoff_date: "",
  created_at: "",
  updated_at: "",
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function displayDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function displayDateTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatFileSize(value: number | null) {
  if (!value || value <= 0) return "";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function evidenceSortValue(value: string | null | undefined) {
  if (!value) return 9999;
  const [major, minor] = value.split(".").map((part) => Number.parseInt(part, 10));
  return (Number.isFinite(major) ? major : 999) * 100 + (Number.isFinite(minor) ? minor : 99);
}

function sortEvidenceByItem(files: InspectionEvidence[]) {
  return [...files].sort((a, b) =>
    evidenceSortValue(a.item_number) - evidenceSortValue(b.item_number) ||
    a.file_name.localeCompare(b.file_name)
  );
}

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function normalizeActions(value: unknown): InspectionAction[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row = item as Partial<InspectionAction>;
    return {
      action: clean(row.action),
      action_by: clean(row.action_by),
      target_date: clean(row.target_date),
    };
  });
}

function normalizeChecklist(value: unknown): Record<string, ChecklistResponse> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const next: Record<string, ChecklistResponse> = {};
  Object.entries(value as Record<string, Partial<ChecklistResponse>>).forEach(([key, row]) => {
    const answer = row.answer === "N/A" || row.answer === "Yes" || row.answer === "No" ? row.answer : "";
    next[key] = { answer, comments: clean(row.comments) };
  });
  return next;
}

function makeDraft(template = inspectionTemplates.find((item) => item.id === defaultTemplateId)!) {
  return {
    ...emptyRecord,
    form_id: template.id,
    form_number: template.documentNumber,
    form_revision: template.revision,
    form_revision_date: template.revisionDate,
    form_title: template.title,
    title: template.enabled ? template.title : "",
  };
}

function nextInspectionNumber(records: HseInspectionRecord[]) {
  const max = records.reduce((highest, record) => {
    const match = clean(record.inspection_number).match(/HSE-INS-(\d+)/i);
    return match ? Math.max(highest, Number.parseInt(match[1], 10)) : highest;
  }, 0);
  return `HSE-INS-${String(max + 1).padStart(3, "0")}`;
}

async function getLogoDataUrl() {
  try {
    const response = await fetch("/enshore-logo.png");
    const blob = await response.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

async function createSignedEvidenceUrl(path: string) {
  const { data } = await supabase.storage.from(evidenceBucket).createSignedUrl(path, 60 * 60 * 24 * 7);
  return data?.signedUrl || "";
}

async function imageUrlToDataUrl(url: string) {
  const response = await fetch(url);
  const blob = await response.blob();
  return await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(blob);
  });
}

export default function HseInspectionsPage() {
  const [records, setRecords] = useState<HseInspectionRecord[]>([]);
  const [evidence, setEvidence] = useState<InspectionEvidence[]>([]);
  const [centralActions, setCentralActions] = useState<CentralAction[]>([]);
  const [people, setPeople] = useState<PeopleOption[]>([]);
  const [activeView, setActiveView] = useState<InspectionView>("dashboard");
  const [selectedTemplateId, setSelectedTemplateId] = useState(defaultTemplateId);
  const [draft, setDraft] = useState<HseInspectionRecord>(() => makeDraft());
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [message, setMessage] = useState("Loading HSE inspections...");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fieldQrDataUrl, setFieldQrDataUrl] = useState("");
  const [pendingEvidence, setPendingEvidence] = useState<PendingEvidence[]>([]);
  const [uploadItemNumber, setUploadItemNumber] = useState("");

  const selectedTemplate = useMemo(
    () => inspectionTemplates.find((template) => template.id === selectedTemplateId) ?? inspectionTemplates.find((template) => template.id === defaultTemplateId)!,
    [selectedTemplateId],
  );

  const selected = useMemo(() => records.find((record) => record.id === selectedId) || null, [records, selectedId]);
  const selectedEvidence = useMemo(() => evidence.filter((file) => file.inspection_id === selectedId), [evidence, selectedId]);
  const selectedLinkedActions = useMemo(() => {
    const selectedNumber = selected?.inspection_number || draft.inspection_number || "";
    return centralActions.filter((action) =>
      (selectedId && action.linked_hse_inspection_id === selectedId) ||
      (selectedNumber && action.linked_hse_inspection_number === selectedNumber)
    );
  }, [centralActions, draft.inspection_number, selected?.inspection_number, selectedId]);

  const filteredRecords = useMemo(() => {
    const query = search.toLowerCase().trim();
    return records.filter((record) => {
      const haystack = [
        record.inspection_number,
        record.title,
        record.form_title,
        record.project_work_scope,
        record.vessel_spread,
        record.area_zone,
        record.inspector_name,
      ].join(" ").toLowerCase();
      return (!query || haystack.includes(query)) && (!statusFilter || record.status === statusFilter);
    });
  }, [records, search, statusFilter]);

  const kpis = useMemo(() => {
    const open = records.filter((record) => record.status !== "Closed" && record.status !== "Complete").length;
    const complete = records.filter((record) => record.status === "Complete" || record.status === "Closed").length;
    const findings = records.reduce((count, record) => {
      return count + Object.values(record.checklist_responses || {}).filter((response) => response.answer === "No").length;
    }, 0);
    const evidenceCount = evidence.length;
    return { open, complete, findings, evidenceCount };
  }, [evidence.length, records]);

  const latestSummary = records[0] ? `${records[0].inspection_number} - ${records[0].title}` : "No records yet";

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const view = params.get("view");
    const type = params.get("type");
    if (type && inspectionTemplates.some((template) => template.id === type)) {
      setSelectedTemplateId(type);
      const template = inspectionTemplates.find((item) => item.id === type) || inspectionTemplates.find((item) => item.id === defaultTemplateId)!;
      setDraft((current) => ({ ...makeDraft(template), inspection_number: current.inspection_number || "" }));
    }
    if (view === "create") setActiveView("create");
    if (view === "register") setActiveView("register");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/hse/inspections/field`;
    QRCode.toDataURL(url, { margin: 1, width: 220, color: { dark: "#0f766e", light: "#ffffff" } })
      .then(setFieldQrDataUrl)
      .catch(() => setFieldQrDataUrl(""));
  }, []);

  useEffect(() => {
    const template = inspectionTemplates.find((item) => item.id === selectedTemplateId);
    if (!template) return;
    setDraft((current) => ({
      ...current,
      form_id: template.id,
      form_number: template.documentNumber,
      form_revision: template.revision,
      form_revision_date: template.revisionDate,
      form_title: template.title,
      title: current.title || (template.enabled ? template.title : ""),
    }));
  }, [selectedTemplateId]);

  async function loadData() {
    const [recordRes, evidenceRes, peopleRes, actionRes] = await Promise.all([
      supabase.from("hse_inspection_records").select("*").order("inspection_date", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("hse_inspection_evidence").select("*").order("uploaded_at", { ascending: false }),
      supabase.from("people").select("id,name,email,role,department,active").eq("active", true).order("name", { ascending: true }),
      supabase
        .from("actions")
        .select("id,action_number,title,owner,status,priority,due_date,source,linked_hse_inspection_id,linked_hse_inspection_number")
        .or("source.eq.HSE Inspection,linked_hse_inspection_id.not.is.null,linked_hse_inspection_number.not.is.null")
        .order("due_date", { ascending: true }),
    ]);

    if (recordRes.error) {
      setMessage(`HSE inspection tables not ready: ${recordRes.error.message}. Run scripts/sql/hse_inspections.sql in Supabase.`);
      return;
    }

    const nextRecords = ((recordRes.data || []) as HseInspectionRecord[]).map((record) => ({
      ...record,
      status: (record.status || "Draft") as InspectionStatus,
      checklist_responses: normalizeChecklist(record.checklist_responses),
      actions: normalizeActions(record.actions),
    }));
    setRecords(nextRecords);
    setEvidence((evidenceRes.data || []) as InspectionEvidence[]);
    setPeople((peopleRes.data || []) as PeopleOption[]);
    setCentralActions((actionRes.data || []) as CentralAction[]);
    setDraft((current) => ({ ...current, inspection_number: current.inspection_number || nextInspectionNumber(nextRecords) }));
    setMessage("HSE inspections loaded.");
  }

  function updateDraft<K extends keyof HseInspectionRecord>(key: K, value: HseInspectionRecord[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function selectPerson(value: string, target: "inspector" | "signoff") {
    const person = people.find((item) => item.id === value || item.name === value);
    if (target === "inspector") {
      updateDraft("inspector_name", person?.name || value);
      updateDraft("inspector_position", person?.role || "");
      return;
    }
    updateDraft("signoff_name", person?.name || value);
    updateDraft("signoff_position", person?.role || "");
  }

  function updateChecklist(itemId: string, field: keyof ChecklistResponse, value: string) {
    setDraft((current) => ({
      ...current,
      checklist_responses: {
        ...current.checklist_responses,
        [itemId]: {
          answer: current.checklist_responses[itemId]?.answer || "",
          comments: current.checklist_responses[itemId]?.comments || "",
          [field]: value,
        },
      },
    }));
  }

  function updateAction(index: number, field: keyof InspectionAction, value: string) {
    setDraft((current) => {
      const rows = current.actions.length ? [...current.actions] : [{ action: "", action_by: "", target_date: "" }];
      rows[index] = { ...rows[index], [field]: value };
      return { ...current, actions: rows };
    });
  }

  function addAction() {
    setDraft((current) => ({ ...current, actions: [...current.actions, { action: "", action_by: "", target_date: "" }] }));
  }

  function removeAction(index: number) {
    setDraft((current) => ({ ...current, actions: current.actions.filter((_, rowIndex) => rowIndex !== index) }));
  }

  function selectRecord(record: HseInspectionRecord) {
    setSelectedId(record.id);
    setDraft({
      ...record,
      checklist_responses: normalizeChecklist(record.checklist_responses),
      actions: normalizeActions(record.actions),
    });
    setSelectedTemplateId(record.form_id || defaultTemplateId);
    setActiveView("register");
  }

  function startCreate(templateId = defaultTemplateId) {
    const template = inspectionTemplates.find((item) => item.id === templateId) || inspectionTemplates.find((item) => item.id === defaultTemplateId)!;
    setSelectedTemplateId(template.id);
    setSelectedId("");
    setPendingEvidence([]);
    setUploadItemNumber("");
    setDraft({ ...makeDraft(template), inspection_number: nextInspectionNumber(records) });
    setActiveView("create");
  }

  function buildPayload(record: HseInspectionRecord) {
    return {
      inspection_number: record.inspection_number,
      form_id: record.form_id,
      form_number: record.form_number,
      form_revision: record.form_revision || null,
      form_revision_date: record.form_revision_date || null,
      form_title: record.form_title,
      title: record.title,
      department: record.department || null,
      project_work_scope: record.project_work_scope || null,
      vessel_spread: record.vessel_spread || null,
      area_zone: record.area_zone || null,
      inspection_date: record.inspection_date || null,
      inspector_name: record.inspector_name || null,
      inspector_position: record.inspector_position || null,
      status: record.status || "Draft",
      checklist_responses: record.checklist_responses || {},
      additional_comments: record.additional_comments || null,
      actions: record.actions.map((row) => ({
        action: clean(row.action),
        action_by: clean(row.action_by),
        target_date: clean(row.target_date),
      })).filter((row) => row.action || row.action_by || row.target_date),
      signoff_name: record.signoff_name || null,
      signoff_position: record.signoff_position || null,
      signoff_company: record.signoff_company || null,
      signoff_date: record.signoff_date || null,
      updated_at: new Date().toISOString(),
    };
  }

  async function saveInspection() {
    if (!selectedTemplate.enabled) {
      setMessage(`${selectedTemplate.documentNumber} is visible for planning but only ENS-HSEQ-FRM-044 is wired in this first pass.`);
      return;
    }
    if (!draft.title.trim()) {
      setMessage("Inspection title is required.");
      return;
    }
    setSaving(true);
    const payload = buildPayload({ ...draft, inspection_number: draft.inspection_number || nextInspectionNumber(records) });
    if (selectedId) {
      const { error } = await supabase.from("hse_inspection_records").update(payload).eq("id", selectedId);
      setSaving(false);
      if (error) {
        setMessage(`Save failed: ${error.message}`);
        return;
      }
      setMessage(`${draft.inspection_number} saved.`);
      await loadData();
      return;
    }

    const { data, error } = await supabase.from("hse_inspection_records").insert([payload]).select("*").single();
    setSaving(false);
    if (error) {
      setMessage(`Create failed: ${error.message}`);
      return;
    }
    const created = data as HseInspectionRecord;
    setSelectedId(created.id);
    setMessage(`${created.inspection_number} created.`);
    if (pendingEvidence.length) {
      await uploadEvidenceFiles(created.id, pendingEvidence.map((item) => ({ file: item.file, itemNumber: item.item_number })));
      setPendingEvidence([]);
    }
    await loadData();
    setActiveView("register");
  }

  async function deleteInspection(record: HseInspectionRecord) {
    if (!window.confirm(`Delete ${record.inspection_number}? This will also remove linked evidence records.`)) return;
    const { error } = await supabase.from("hse_inspection_records").delete().eq("id", record.id);
    if (error) {
      setMessage(`Delete failed: ${error.message}`);
      return;
    }
    setSelectedId("");
    setDraft({ ...makeDraft(), inspection_number: nextInspectionNumber(records.filter((item) => item.id !== record.id)) });
    setMessage(`${record.inspection_number} deleted.`);
    await loadData();
  }

  async function uploadEvidenceFiles(inspectionId: string, files: Array<{ file: File; itemNumber: string }>) {
    for (const item of files) {
      const file = item.file;
      const path = `HSE/Inspections/${inspectionId}/${Date.now()}-${sanitizeFileName(file.name)}`;
      const upload = await supabase.storage.from(evidenceBucket).upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (upload.error) {
        setMessage(`Evidence upload failed: ${upload.error.message}`);
        continue;
      }
      const { error } = await supabase.from("hse_inspection_evidence").insert([{
        inspection_id: inspectionId,
        item_number: item.itemNumber || null,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
        content_type: file.type || null,
      }]);
      if (error) setMessage(`Evidence record failed: ${error.message}`);
    }
  }

  async function uploadEvidence(event: ChangeEvent<HTMLInputElement>, itemNumber: string) {
    if (!selectedId) {
      setMessage("Save the inspection before uploading evidence.");
      event.target.value = "";
      return;
    }
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setUploading(true);
    await uploadEvidenceFiles(selectedId, files.map((file) => ({ file, itemNumber })));
    setUploading(false);
    event.target.value = "";
    await loadData();
    setMessage("Evidence uploaded.");
  }

  function addPendingEvidence(event: ChangeEvent<HTMLInputElement>, itemNumber: string) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setPendingEvidence((current) => [
      ...current,
      ...files.map((file) => ({ id: `${Date.now()}-${file.name}-${Math.random()}`, file, item_number: itemNumber })),
    ]);
    event.target.value = "";
  }

  function removePendingEvidence(id: string) {
    setPendingEvidence((current) => current.filter((file) => file.id !== id));
  }

  async function openEvidenceFile(file: InspectionEvidence) {
    const url = await createSignedEvidenceUrl(file.file_path);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  async function deleteEvidenceFile(file: InspectionEvidence) {
    if (!window.confirm(`Delete evidence file ${file.file_name}?`)) return;
    await supabase.storage.from(evidenceBucket).remove([file.file_path]);
    const { error } = await supabase.from("hse_inspection_evidence").delete().eq("id", file.id);
    if (error) {
      setMessage(`Evidence delete failed: ${error.message}`);
      return;
    }
    await loadData();
    setMessage("Evidence deleted.");
  }

  function pdfHeader(doc: jsPDF, title: string, record: HseInspectionRecord, logoData: string) {
    if (logoData) {
      try {
        doc.addImage(logoData, "PNG", 12, 10, 38, 15);
      } catch {
        // Keep report generation working if the logo cannot be embedded.
      }
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(title, 105, 18, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(record.inspection_number || "", 195, 16, { align: "right" });
    doc.text(displayDate(record.inspection_date), 195, 22, { align: "right" });
    doc.setDrawColor(15, 118, 110);
    doc.setLineWidth(0.4);
    doc.line(12, 30, 198, 30);
  }

  function pdfSection(doc: jsPDF, title: string, y: number) {
    doc.setFillColor(15, 118, 110);
    doc.roundedRect(12, y, 186, 8, 1.5, 1.5, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(title, 15, y + 5.5);
    return y + 11;
  }

  async function generatePdf(record: HseInspectionRecord, evidenceFiles = selectedEvidence) {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const logoData = await getLogoDataUrl();
    pdfHeader(doc, `${record.form_number} ${record.form_title}`, record, logoData);
    let y = 36;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(`${record.inspection_number} - ${record.title}`, 12, y);
    y += 7;

    autoTable(doc, {
      startY: y,
      theme: "grid",
      margin: { left: 12, right: 12 },
      tableWidth: 186,
      styles: { font: "helvetica", fontSize: 8, cellPadding: 2, lineColor: [203, 213, 225], lineWidth: 0.2, textColor: [15, 23, 42] },
      headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255], fontStyle: "bold" },
      head: [["Field", "Details", "Field", "Details"]],
      body: [
        ["Form No.", record.form_number, "Revision", record.form_revision || ""],
        ["Revision Date", displayDate(record.form_revision_date), "Status", record.status],
        ["Department", record.department || "", "Inspection Date", displayDate(record.inspection_date)],
        ["Project / Work Scope", record.project_work_scope || "", "Vessel / Spread", record.vessel_spread || ""],
        ["Area / Zone", record.area_zone || "", "Inspector", record.inspector_name || ""],
      ],
      columnStyles: { 0: { cellWidth: 38, fontStyle: "bold" }, 1: { cellWidth: 55 }, 2: { cellWidth: 38, fontStyle: "bold" }, 3: { cellWidth: 55 } },
    });

    y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 72;
    y += 8;

    baseSiteChecklist.forEach((section) => {
      if (y > 250) {
        doc.addPage();
        pdfHeader(doc, `${record.form_number} ${record.form_title}`, record, logoData);
        y = 36;
      }
      y = pdfSection(doc, section.title, y);
      autoTable(doc, {
        startY: y,
        theme: "grid",
        margin: { left: 12, right: 12 },
        tableWidth: 186,
        styles: { font: "helvetica", fontSize: 7.5, cellPadding: 1.6, lineColor: [203, 213, 225], lineWidth: 0.2, textColor: [15, 23, 42], overflow: "linebreak" },
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold" },
        head: [["Item", "Description", "N/A", "Yes", "No", "Comments"]],
        body: section.items.map((item) => {
          const response = record.checklist_responses?.[item.id] || { answer: "", comments: "" };
          return [
            item.number,
            item.text,
            response.answer === "N/A" ? "X" : "",
            response.answer === "Yes" ? "X" : "",
            response.answer === "No" ? "X" : "",
            response.comments || "",
          ];
        }),
        columnStyles: {
          0: { cellWidth: 15, fontStyle: "bold" },
          1: { cellWidth: 77 },
          2: { cellWidth: 12, halign: "center" },
          3: { cellWidth: 12, halign: "center" },
          4: { cellWidth: 12, halign: "center" },
          5: { cellWidth: 58 },
        },
        didParseCell: (data) => {
          if ([2, 3, 4].includes(data.column.index)) data.cell.styles.halign = "center";
        },
      });
      y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y) + 6;
    });

    if (y > 230) {
      doc.addPage();
      pdfHeader(doc, `${record.form_number} ${record.form_title}`, record, logoData);
      y = 36;
    }

    y = pdfSection(doc, "5.0 Additional Comments", y);
    autoTable(doc, {
      startY: y,
      theme: "grid",
      margin: { left: 12, right: 12 },
      tableWidth: 186,
      styles: { font: "helvetica", fontSize: 8, cellPadding: 2, lineColor: [203, 213, 225], lineWidth: 0.2 },
      body: [[record.additional_comments || ""]],
      columnStyles: { 0: { cellWidth: 186, minCellHeight: 18 } },
    });
    y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y) + 8;

    y = pdfSection(doc, "Actions", y);
    const linkedActions = centralActions.filter((action) =>
      (record.id && action.linked_hse_inspection_id === record.id) ||
      (record.inspection_number && action.linked_hse_inspection_number === record.inspection_number)
    );
    autoTable(doc, {
      startY: y,
      theme: "grid",
      margin: { left: 12, right: 12 },
      tableWidth: 186,
      styles: { font: "helvetica", fontSize: 8, cellPadding: 2, lineColor: [203, 213, 225], lineWidth: 0.2, overflow: "linebreak" },
      headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255], fontStyle: "bold" },
      head: [["Action No.", "Title", "Owner", "Status", "Due Date"]],
      body: linkedActions.length
        ? linkedActions.map((action) => [action.action_number || "", action.title || "", action.owner || "", action.status || "", displayDate(action.due_date)])
        : [["", "No linked central actions recorded.", "", "", ""]],
      columnStyles: { 0: { cellWidth: 24 }, 1: { cellWidth: 76 }, 2: { cellWidth: 34 }, 3: { cellWidth: 24 }, 4: { cellWidth: 28 } },
    });
    y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y) + 8;

    y = pdfSection(doc, "Sign-Off", y);
    autoTable(doc, {
      startY: y,
      theme: "grid",
      margin: { left: 12, right: 12 },
      tableWidth: 186,
      styles: { font: "helvetica", fontSize: 8, cellPadding: 2, lineColor: [203, 213, 225], lineWidth: 0.2 },
      headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255], fontStyle: "bold" },
      head: [["Name", "Position", "Company", "Date"]],
      body: [[record.signoff_name || "", record.signoff_position || "", record.signoff_company || "", displayDate(record.signoff_date)]],
      columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 55 }, 2: { cellWidth: 45 }, 3: { cellWidth: 36 } },
    });
    y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y) + 8;

    const evidenceRows = await Promise.all(
      sortEvidenceByItem(evidenceFiles).map(async (file) => ({
        file,
        url: await createSignedEvidenceUrl(file.file_path),
      })),
    );
    if (evidenceRows.length) {
      if (y > 230) {
        doc.addPage();
        pdfHeader(doc, `${record.form_number} ${record.form_title}`, record, logoData);
        y = 36;
      }
      y = pdfSection(doc, "Evidence Register", y);
      autoTable(doc, {
        startY: y,
        theme: "grid",
        margin: { left: 12, right: 12 },
        tableWidth: 186,
        styles: { font: "helvetica", fontSize: 8, cellPadding: 2, lineColor: [203, 213, 225], lineWidth: 0.2 },
        headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255], fontStyle: "bold" },
        head: [["Item", "File", "Size", "Uploaded", "Link"]],
        body: evidenceRows.map((item) => [
          item.file.item_number || "General",
          item.file.file_name,
          formatFileSize(item.file.file_size),
          displayDateTime(item.file.uploaded_at),
          { content: "", url: item.url },
        ]),
        columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 72 }, 2: { cellWidth: 22 }, 3: { cellWidth: 40 }, 4: { cellWidth: 32, textColor: [37, 99, 235] } },
        didDrawCell: (data) => {
          if (data.section !== "body" || data.column.index !== 4) return;
          const raw = data.cell.raw as { url?: string } | string;
          const url = typeof raw === "object" ? raw.url : "";
          if (url) {
            doc.setTextColor(37, 99, 235);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.textWithLink("Open Evidence", data.cell.x + 2, data.cell.y + 5, { url });
          }
        },
      });

      y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y) + 8;

      const imageEvidence = evidenceRows.filter((item) =>
        (item.file.content_type || "").startsWith("image/") ||
        /\.(png|jpe?g|webp)$/i.test(item.file.file_name)
      );

      if (imageEvidence.length) {
        if (y > 238) {
          doc.addPage();
          pdfHeader(doc, `${record.form_number} ${record.form_title}`, record, logoData);
          y = 36;
        }
        y = pdfSection(doc, "Evidence Photos", y);
        let column = 0;
        for (const item of imageEvidence) {
          try {
            const dataUrl = await imageUrlToDataUrl(item.url);
            const x = column === 0 ? 12 : 106;
            if (y > 230) {
              doc.addPage();
              pdfHeader(doc, `${record.form_number} ${record.form_title}`, record, logoData);
              y = 36;
              column = 0;
            }
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.setTextColor(15, 23, 42);
            doc.text(`${item.file.item_number || "General"} - ${item.file.file_name}`, x, y + 4, { maxWidth: 86 });
            doc.addImage(dataUrl, item.file.content_type?.includes("png") ? "PNG" : "JPEG", x, y + 7, 86, 58);
            if (column === 0) {
              column = 1;
            } else {
              column = 0;
              y += 72;
            }
          } catch {
            // Evidence links still remain in the table if an image preview cannot be embedded.
          }
        }
      }
    }

    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${page} of ${pageCount}`, 198, 287, { align: "right" });
    }

    doc.save(`${record.inspection_number}-${sanitizeFileName(record.form_title)}.pdf`);
    setMessage(`Generated PDF for ${record.inspection_number}.`);
  }

  return (
    <main>
      <QualityPageHero
        label="HSE MANAGEMENT"
        title="Site Inspections"
        description="Plan, complete, evidence, and report HSE inspections across vessels, offices, offshore worksites, mobilisation, base/site areas, and dropped object controls."
        contextCards={[
          { label: "Last Refreshed", value: new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) },
          { label: "Latest Inspection", value: latestSummary },
        ]}
      />

      <TopRow status={message} />

      <nav style={tabRowStyle} aria-label="HSE inspection views">
        <TabButton active={activeView === "dashboard"} onClick={() => setActiveView("dashboard")}>Dashboard</TabButton>
        <TabButton active={activeView === "register"} onClick={() => setActiveView("register")}>Inspection Register</TabButton>
        <TabButton active={activeView === "create"} onClick={() => startCreate()}>Create Inspection</TabButton>
      </nav>

      {activeView === "dashboard" ? (
        <DashboardView
          kpis={kpis}
          qrDataUrl={fieldQrDataUrl}
          onCreate={() => startCreate()}
          onFilter={(status) => { setStatusFilter(status); setActiveView("register"); }}
        />
      ) : null}

      {activeView === "register" ? (
        <RegisterView
          records={filteredRecords}
          totalRecords={records.length}
          search={search}
          statusFilter={statusFilter}
          selected={selected}
          draft={draft}
          people={people}
          evidence={selectedEvidence}
          saving={saving}
          uploading={uploading}
          uploadItemNumber={uploadItemNumber}
          selectedId={selectedId}
          onSearch={setSearch}
          onStatusFilter={setStatusFilter}
          onCreate={() => startCreate()}
          onSelect={selectRecord}
          onDraftChange={updateDraft}
          onPersonSelect={selectPerson}
          onChecklistChange={updateChecklist}
          onSave={() => void saveInspection()}
          onDelete={() => selected ? void deleteInspection(selected) : undefined}
          onUpload={(event) => void uploadEvidence(event, uploadItemNumber)}
          onUploadForItem={(itemNumber, event) => void uploadEvidence(event, itemNumber)}
          onUploadItemNumberChange={setUploadItemNumber}
          onOpenEvidence={openEvidenceFile}
          onDeleteEvidence={deleteEvidenceFile}
          onGeneratePdf={() => selected ? void generatePdf(draft) : undefined}
          onGeneratePdfForRecord={(record) => void generatePdf(record, evidence.filter((file) => file.inspection_id === record.id))}
          linkedActions={selectedLinkedActions}
        />
      ) : null}

      {activeView === "create" ? (
        <CreateInspectionView
          selectedTemplate={selectedTemplate}
          selectedTemplateId={selectedTemplateId}
          draft={draft}
          people={people}
          saving={saving}
          pendingEvidence={pendingEvidence}
          uploadItemNumber={uploadItemNumber}
          onSelectTemplate={setSelectedTemplateId}
          onDraftChange={updateDraft}
          onPersonSelect={selectPerson}
          onChecklistChange={updateChecklist}
          onPendingUpload={(event) => addPendingEvidence(event, uploadItemNumber)}
          onPendingUploadForItem={(itemNumber, event) => addPendingEvidence(event, itemNumber)}
          onUploadItemNumberChange={setUploadItemNumber}
          onRemovePendingEvidence={removePendingEvidence}
          onSave={() => void saveInspection()}
        />
      ) : null}
    </main>
  );
}

function TopRow({ status }: { status: string }) {
  return (
    <div style={topMetaRowStyle}>
      <Link href="/hse" style={backLinkStyle}>Back to Dashboard</Link>
      <div style={statusBannerStyle}><strong>Status:</strong> {status}</div>
    </div>
  );
}

function DashboardView({
  kpis,
  qrDataUrl,
  onCreate,
  onFilter,
}: {
  kpis: { open: number; complete: number; findings: number; evidenceCount: number };
  qrDataUrl: string;
  onCreate: () => void;
  onFilter: (status: string) => void;
}) {
  return (
    <>
      <section style={statsGridStyle}>
        <QualityKpiCard title="Open Inspections" value={kpis.open} accent="#2563eb" onClick={() => onFilter("Open")} />
        <QualityKpiCard title="Completed / Closed" value={kpis.complete} accent="#16a34a" onClick={() => onFilter("Complete")} />
        <QualityKpiCard title="Open Findings" value={kpis.findings} accent="#dc2626" />
        <QualityKpiCard title="Evidence Files" value={kpis.evidenceCount} accent="#7c3aed" />
      </section>

      <section style={dashboardGridStyle}>
        <SectionCard title="Inspection Form Library">
          <div style={storyGridStyle}>
            {inspectionTemplates.map((template) => (
              <div key={template.id} style={miniTemplateStyle}>
                <strong>{template.documentNumber}</strong>
                <span>{template.title}</span>
                <small>{template.enabled ? `Rev ${template.revision} - ${displayDate(template.revisionDate)}` : "Template queued"}</small>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Base and Site Inspection Ready">
          <p style={emptyTextStyle}>
            FRM-044 is now wired for laptop entry, mobile-friendly completion, evidence upload, register tracking, and PDF output.
          </p>
          <button type="button" onClick={onCreate} style={primaryButtonStyle}>Create Base and Site Inspection</button>
        </SectionCard>

        <SectionCard title="Mobile QR Access">
          <p style={emptyTextStyle}>
            Scan this QR code to open the mobile inspection entry page, choose the inspection type, and complete the inspection at point of contact.
          </p>
          {qrDataUrl ? <img src={qrDataUrl} alt="HSE inspection field access QR code" style={qrImageStyle} /> : <div style={emptyBoxStyle}>Generating QR code...</div>}
          <Link href="/hse/inspections/field" style={secondaryLinkStyle}>Open mobile inspection page</Link>
        </SectionCard>

        <SectionCard title="Report Standard">
          <p style={emptyTextStyle}>
            Generated inspection reports use the Enshore header, green section bars, compact tables, evidence links, revision reference, and page numbering.
          </p>
        </SectionCard>

        <SectionCard title="Next Forms">
          <p style={emptyTextStyle}>
            Once FRM-044 feels right, the same pattern can be applied to vessel pre-sail, office, offshore, mobilisation, and dropped object inspections.
          </p>
        </SectionCard>
      </section>
    </>
  );
}

function RegisterView({
  records,
  totalRecords,
  search,
  statusFilter,
  selected,
  draft,
  people,
  evidence,
  saving,
  uploading,
  uploadItemNumber,
  selectedId,
  onSearch,
  onStatusFilter,
  onCreate,
  onSelect,
  onDraftChange,
  onPersonSelect,
  onChecklistChange,
  onSave,
  onDelete,
  onUpload,
  onUploadForItem,
  onUploadItemNumberChange,
  onOpenEvidence,
  onDeleteEvidence,
  onGeneratePdf,
  onGeneratePdfForRecord,
  linkedActions,
}: {
  records: HseInspectionRecord[];
  totalRecords: number;
  search: string;
  statusFilter: string;
  selected: HseInspectionRecord | null;
  draft: HseInspectionRecord;
  people: PeopleOption[];
  evidence: InspectionEvidence[];
  saving: boolean;
  uploading: boolean;
  uploadItemNumber: string;
  selectedId: string;
  onSearch: (value: string) => void;
  onStatusFilter: (value: string) => void;
  onCreate: () => void;
  onSelect: (record: HseInspectionRecord) => void;
  onDraftChange: <K extends keyof HseInspectionRecord>(key: K, value: HseInspectionRecord[K]) => void;
  onPersonSelect: (value: string, target: "inspector" | "signoff") => void;
  onChecklistChange: (itemId: string, field: keyof ChecklistResponse, value: string) => void;
  onSave: () => void;
  onDelete: () => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onUploadForItem: (itemNumber: string, event: ChangeEvent<HTMLInputElement>) => void;
  onUploadItemNumberChange: (value: string) => void;
  onOpenEvidence: (file: InspectionEvidence) => void;
  onDeleteEvidence: (file: InspectionEvidence) => void;
  onGeneratePdf: () => void;
  onGeneratePdfForRecord: (record: HseInspectionRecord) => void;
  linkedActions: CentralAction[];
}) {
  return (
    <section style={splitGridStyle}>
      <div style={panelStyle}>
        <PanelHeader title="Inspection Register" description="Logged HSE inspections with status, findings, evidence, and report output." />
        <div style={registerToolbarStyle}>
          <input style={inputStyle} placeholder="Search inspections" value={search} onChange={(event) => onSearch(event.target.value)} />
          <select style={selectStyle} value={statusFilter} onChange={(event) => onStatusFilter(event.target.value)}>
            <option value="">All Statuses</option>
            {["Draft", "Open", "Complete", "Closed"].map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <button type="button" onClick={() => { onSearch(""); onStatusFilter(""); }} style={secondaryButtonStyle}>Clear Filters</button>
          <button type="button" onClick={onCreate} style={primaryButtonStyle}>Create Inspection</button>
        </div>
        <div style={tableInfoStyle}>Showing {records.length} of {totalRecords} inspections</div>
        <div style={tableShellStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Inspection No.</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Area / Zone</th>
                <th style={thStyle}>Inspector</th>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Report</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} onClick={() => onSelect(record)} style={{ ...clickableRowStyle, background: selected?.id === record.id ? "#ecfeff" : "white" }}>
                  <td style={tdStrongStyle}>{record.inspection_number}</td>
                  <td style={tdStyle}>{record.form_title}</td>
                  <td style={tdStyle}>{record.area_zone || record.vessel_spread || "-"}</td>
                  <td style={tdStyle}>{record.inspector_name || "-"}</td>
                  <td style={tdStyle}>{displayDate(record.inspection_date) || "-"}</td>
                  <td style={tdStyle}><StatusPill status={record.status} /></td>
                  <td style={reportTdStyle}>
                    <button
                      type="button"
                      style={pdfButtonStyle}
                      onClick={(event) => {
                        event.stopPropagation();
                        onGeneratePdfForRecord(record);
                      }}
                    >
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
              {!records.length ? (
                <tr>
                  <td colSpan={7} style={emptyCellStyle}>No inspections match the current filter.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div style={detailPanelStyle}>
        {!selected ? (
          <div style={emptyBoxStyle}>Select an inspection to open the detail/edit panel.</div>
        ) : (
          <>
            <PanelHeader title={`${draft.inspection_number} - ${draft.title}`} description={`${draft.form_number} Rev ${draft.form_revision || ""} - ${displayDate(draft.form_revision_date)}`} />
            <InspectionForm
              draft={draft}
              people={people}
              compact
              onDraftChange={onDraftChange}
              onPersonSelect={onPersonSelect}
              onChecklistChange={onChecklistChange}
              canUploadEvidence={Boolean(selectedId)}
              uploading={uploading}
              onUploadEvidenceForItem={onUploadForItem}
            />
            <LinkedActionsPanel inspection={draft} linkedActions={linkedActions} />
            <EvidencePanel
              evidence={evidence}
              uploading={uploading}
              uploadItemNumber={uploadItemNumber}
              onUploadItemNumberChange={onUploadItemNumberChange}
              onUpload={onUpload}
              onOpen={onOpenEvidence}
              onDelete={onDeleteEvidence}
            />
            <div style={formActionsStyle}>
              <button type="button" style={secondaryButtonStyle} onClick={onGeneratePdf}>Generate PDF Report</button>
              <button type="button" style={primaryButtonStyle} onClick={onSave} disabled={saving}>{saving ? "Saving..." : "Save Inspection"}</button>
              <button type="button" style={dangerButtonStyle} onClick={onDelete}>Delete Inspection</button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function CreateInspectionView({
  selectedTemplate,
  selectedTemplateId,
  draft,
  people,
  saving,
  pendingEvidence,
  uploadItemNumber,
  onSelectTemplate,
  onDraftChange,
  onPersonSelect,
  onChecklistChange,
  onPendingUpload,
  onPendingUploadForItem,
  onUploadItemNumberChange,
  onRemovePendingEvidence,
  onSave,
}: {
  selectedTemplate: InspectionTemplate;
  selectedTemplateId: string;
  draft: HseInspectionRecord;
  people: PeopleOption[];
  saving: boolean;
  pendingEvidence: PendingEvidence[];
  uploadItemNumber: string;
  onSelectTemplate: (id: string) => void;
  onDraftChange: <K extends keyof HseInspectionRecord>(key: K, value: HseInspectionRecord[K]) => void;
  onPersonSelect: (value: string, target: "inspector" | "signoff") => void;
  onChecklistChange: (itemId: string, field: keyof ChecklistResponse, value: string) => void;
  onPendingUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onPendingUploadForItem: (itemNumber: string, event: ChangeEvent<HTMLInputElement>) => void;
  onUploadItemNumberChange: (value: string) => void;
  onRemovePendingEvidence: (id: string) => void;
  onSave: () => void;
}) {
  return (
    <section style={panelStyle}>
      <PanelHeader title="Create Inspection" description="Choose the Enshore inspection form. FRM-044 is wired first so we can prove the layout, evidence, and PDF before rolling out the other five." />

      <div style={templateGridStyle}>
        {inspectionTemplates.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelectTemplate(template.id)}
            style={{
              ...templateCardStyle,
              borderColor: selectedTemplateId === template.id ? "#0f766e" : "#cbd5e1",
              boxShadow: selectedTemplateId === template.id ? "0 0 0 2px rgba(15, 118, 110, 0.14)" : "0 1px 2px rgba(15, 23, 42, 0.06)",
            }}
          >
            <span style={docNumberStyle}>{template.documentNumber}</span>
            <strong>{template.title}</strong>
            <small>{template.description}</small>
            <span style={templateStatusStyle}>{template.enabled ? `Live build - Rev ${template.revision}` : "Queued"}</span>
          </button>
        ))}
      </div>

      <div style={selectedHeaderStyle}>
        <div>
          <div style={selectedEyebrowStyle}>{selectedTemplate.documentNumber}</div>
          <h2 style={selectedTitleStyle}>{selectedTemplate.title}</h2>
          <p style={selectedDescriptionStyle}>
            {selectedTemplate.enabled
              ? `Revision ${selectedTemplate.revision}, dated ${displayDate(selectedTemplate.revisionDate)}.`
              : "This template is staged for the next rollout after FRM-044 is signed off."}
          </p>
        </div>
        <span style={statusPillStyle}>{selectedTemplate.enabled ? "Ready to complete" : "Template queued"}</span>
      </div>

      {selectedTemplate.enabled ? (
        <>
          <InspectionForm
            draft={draft}
            people={people}
            onDraftChange={onDraftChange}
            onPersonSelect={onPersonSelect}
            onChecklistChange={onChecklistChange}
            canUploadEvidence
            uploading={false}
            onUploadEvidenceForItem={onPendingUploadForItem}
          />
          <PendingEvidencePanel
            pendingEvidence={pendingEvidence}
            uploadItemNumber={uploadItemNumber}
            onUploadItemNumberChange={onUploadItemNumberChange}
            onUpload={onPendingUpload}
            onRemove={onRemovePendingEvidence}
          />
          <div style={formActionsStyle}>
            <button type="button" style={primaryButtonStyle} onClick={onSave} disabled={saving}>{saving ? "Saving..." : "Save Inspection"}</button>
          </div>
        </>
      ) : (
        <div style={emptyBoxStyle}>
          {selectedTemplate.documentNumber} will use this same inspection engine once FRM-044 is approved: structured form, evidence upload, mobile completion, and PDF output.
        </div>
      )}
    </section>
  );
}

function InspectionForm({
  draft,
  people,
  compact,
  onDraftChange,
  onPersonSelect,
  onChecklistChange,
  canUploadEvidence,
  uploading,
  onUploadEvidenceForItem,
}: {
  draft: HseInspectionRecord;
  people: PeopleOption[];
  compact?: boolean;
  onDraftChange: <K extends keyof HseInspectionRecord>(key: K, value: HseInspectionRecord[K]) => void;
  onPersonSelect: (value: string, target: "inspector" | "signoff") => void;
  onChecklistChange: (itemId: string, field: keyof ChecklistResponse, value: string) => void;
  canUploadEvidence: boolean;
  uploading: boolean;
  onUploadEvidenceForItem: (itemNumber: string, event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div style={compact ? compactFormStyle : undefined}>
      <InspectionSection title="Report Details">
        <div style={formGridStyle}>
          <Field label="Inspection No."><input style={{ ...inputStyle, background: "#f8fafc" }} value={draft.inspection_number} readOnly /></Field>
          <Field label="Status">
            <select style={inputStyle} value={draft.status} onChange={(event) => onDraftChange("status", event.target.value as InspectionStatus)}>
              {["Draft", "Open", "Complete", "Closed"].map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </Field>
          <Field label="Title"><input style={inputStyle} value={draft.title} onChange={(event) => onDraftChange("title", event.target.value)} /></Field>
          <Field label="Department"><input style={inputStyle} value={draft.department || ""} onChange={(event) => onDraftChange("department", event.target.value)} /></Field>
          <Field label="Inspection Date"><input type="date" style={inputStyle} value={draft.inspection_date || ""} onChange={(event) => onDraftChange("inspection_date", event.target.value)} /></Field>
          <Field label="Project / Work Scope"><input style={inputStyle} value={draft.project_work_scope || ""} onChange={(event) => onDraftChange("project_work_scope", event.target.value)} /></Field>
          <Field label="Vessel / Spread"><input style={inputStyle} value={draft.vessel_spread || ""} onChange={(event) => onDraftChange("vessel_spread", event.target.value)} /></Field>
          <Field label="Area / Zone"><input style={inputStyle} value={draft.area_zone || ""} onChange={(event) => onDraftChange("area_zone", event.target.value)} /></Field>
          <Field label="Inspector">
            <PeopleSelect people={people} value={draft.inspector_name || ""} onChange={(value) => onPersonSelect(value, "inspector")} />
          </Field>
          <Field label="Inspector Position"><input style={inputStyle} value={draft.inspector_position || ""} onChange={(event) => onDraftChange("inspector_position", event.target.value)} /></Field>
        </div>
      </InspectionSection>

      {baseSiteChecklist.map((section) => (
        <InspectionSection key={section.id} title={section.title}>
          <div style={checklistShellStyle}>
            <div style={checklistHeaderStyle}>
              <span>Item</span>
              <span>Description</span>
              <span>N/A</span>
              <span>Yes</span>
              <span>No</span>
              <span>Comments / action notes</span>
              <span>Evidence</span>
            </div>
            {section.items.map((item) => {
              const response = draft.checklist_responses[item.id] || { answer: "", comments: "" };
              return (
                <div key={item.id} style={checklistRowStyle}>
                  <strong>{item.number}</strong>
                  <span>{item.text}</span>
                  {(["N/A", "Yes", "No"] as ChecklistAnswer[]).map((answer) => (
                    <label key={answer} style={radioCellStyle}>
                      <input
                        type="radio"
                        name={`${item.id}-${compact ? "edit" : "create"}`}
                        checked={response.answer === answer}
                        onChange={() => onChecklistChange(item.id, "answer", answer)}
                      />
                    </label>
                  ))}
                  <textarea style={smallTextareaStyle} value={response.comments} onChange={(event) => onChecklistChange(item.id, "comments", event.target.value)} />
                  <label style={{ ...itemUploadButtonStyle, opacity: canUploadEvidence ? 1 : 0.55 }}>
                    {uploading ? "..." : "Upload"}
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                      capture="environment"
                      style={{ display: "none" }}
                      disabled={!canUploadEvidence || uploading}
                      onChange={(event) => onUploadEvidenceForItem(item.id, event)}
                    />
                  </label>
                </div>
              );
            })}
          </div>
        </InspectionSection>
      ))}

      <InspectionSection title="5.0 Additional Comments">
        <textarea style={largeTextareaStyle} value={draft.additional_comments || ""} onChange={(event) => onDraftChange("additional_comments", event.target.value)} />
      </InspectionSection>

      <InspectionSection title="Sign-Off">
        <div style={formGridStyle}>
          <Field label="Name">
            <PeopleSelect people={people} value={draft.signoff_name || ""} onChange={(value) => onPersonSelect(value, "signoff")} />
          </Field>
          <Field label="Position"><input style={inputStyle} value={draft.signoff_position || ""} onChange={(event) => onDraftChange("signoff_position", event.target.value)} /></Field>
          <Field label="Company"><input style={inputStyle} value={draft.signoff_company || ""} onChange={(event) => onDraftChange("signoff_company", event.target.value)} /></Field>
          <Field label="Date"><input type="date" style={inputStyle} value={draft.signoff_date || ""} onChange={(event) => onDraftChange("signoff_date", event.target.value)} /></Field>
        </div>
      </InspectionSection>
    </div>
  );
}

function LinkedActionsPanel({ inspection, linkedActions }: { inspection: HseInspectionRecord; linkedActions: CentralAction[] }) {
  const createHref = `/hse/actions?view=create&prefill_source=${encodeURIComponent("HSE Inspection")}` +
    `&prefill_department=HSEQ` +
    `&prefill_project=${encodeURIComponent(inspection.project_work_scope || inspection.vessel_spread || "")}` +
    `&prefill_title=${encodeURIComponent(`${inspection.inspection_number} - ${inspection.title}`)}` +
    `&prefill_description=${encodeURIComponent(`Linked HSE inspection: ${inspection.form_number} ${inspection.form_title}\nArea / Zone: ${inspection.area_zone || ""}\nInspection date: ${displayDate(inspection.inspection_date)}`)}` +
    `&linked_hse_inspection_id=${encodeURIComponent(inspection.id)}` +
    `&linked_hse_inspection_number=${encodeURIComponent(inspection.inspection_number)}`;

  return (
    <InspectionSection title="Linked Actions">
      <div style={buttonRowStyle}>
        <Link href={createHref} style={primaryLinkStyle}>Create Linked HSE Action</Link>
        <span style={mutedTextStyle}>Actions are controlled in central Action Management and linked back to this inspection.</span>
      </div>
      <div style={evidenceListStyle}>
        {linkedActions.map((action) => (
          <div key={action.id} style={evidenceCardStyle}>
            <div>
              <strong>{action.action_number || "Action"} - {action.title || "Untitled action"}</strong>
              <div style={mutedTextStyle}>
                {action.owner || "No owner"} - {action.status || "No status"}{action.due_date ? ` - Due ${displayDate(action.due_date)}` : ""}
              </div>
            </div>
            <Link href={`/hse/actions?actionId=${encodeURIComponent(action.id)}`} style={secondaryLinkStyle}>Open Action</Link>
          </div>
        ))}
        {!linkedActions.length ? <div style={emptyBoxStyle}>No central actions linked to this inspection yet.</div> : null}
      </div>
    </InspectionSection>
  );
}

function EvidenceItemPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label style={fieldStyle}>
      <span style={labelStyle}>Link evidence to item number</span>
      <select style={inputStyle} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">General inspection evidence</option>
        {checklistItemOptions.map((item) => (
          <option key={item.id} value={item.id}>{item.label}</option>
        ))}
      </select>
    </label>
  );
}

function PendingEvidencePanel({
  pendingEvidence,
  uploadItemNumber,
  onUploadItemNumberChange,
  onUpload,
  onRemove,
}: {
  pendingEvidence: PendingEvidence[];
  uploadItemNumber: string;
  onUploadItemNumberChange: (value: string) => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <InspectionSection title="Evidence Upload">
      <p style={emptyTextStyle}>Upload photos/files while creating the inspection. They will be uploaded when the inspection is saved.</p>
      <EvidenceItemPicker value={uploadItemNumber} onChange={onUploadItemNumberChange} />
      <label style={uploadButtonStyle}>
        Upload Photos / Files
        <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" capture="environment" style={{ display: "none" }} onChange={onUpload} />
      </label>
      <div style={evidenceListStyle}>
        {pendingEvidence.map((file) => (
          <div key={file.id} style={evidenceCardStyle}>
            <div>
              <strong>{file.file.name}</strong>
              <div style={mutedTextStyle}>{formatFileSize(file.file.size)}{file.item_number ? ` - Item ${file.item_number}` : " - General evidence"}</div>
            </div>
            <button type="button" style={dangerButtonStyle} onClick={() => onRemove(file.id)}>Remove</button>
          </div>
        ))}
        {!pendingEvidence.length ? <div style={emptyBoxStyle}>No staged evidence yet.</div> : null}
      </div>
    </InspectionSection>
  );
}

function EvidencePanel({
  evidence,
  uploading,
  uploadItemNumber,
  onUploadItemNumberChange,
  onUpload,
  onOpen,
  onDelete,
}: {
  evidence: InspectionEvidence[];
  uploading: boolean;
  uploadItemNumber: string;
  onUploadItemNumberChange: (value: string) => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onOpen: (file: InspectionEvidence) => void;
  onDelete: (file: InspectionEvidence) => void;
}) {
  const sortedEvidence = sortEvidenceByItem(evidence);
  return (
    <InspectionSection title="Evidence Upload">
      <p style={emptyTextStyle}>Upload inspection photos or supporting files. On mobile, choose the camera option to capture evidence at the inspection point.</p>
      <EvidenceItemPicker value={uploadItemNumber} onChange={onUploadItemNumberChange} />
      <label style={uploadButtonStyle}>
        {uploading ? "Uploading..." : "Upload Evidence"}
        <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" capture="environment" style={{ display: "none" }} onChange={onUpload} disabled={uploading} />
      </label>
      <div style={evidenceListStyle}>
        {sortedEvidence.map((file) => (
          <div key={file.id} style={evidenceCardStyle}>
            <div>
              <strong>{file.file_name}</strong>
              <div style={mutedTextStyle}>
                {formatFileSize(file.file_size)} - Uploaded {displayDateTime(file.uploaded_at)}
                {file.item_number ? ` - Item ${file.item_number}` : " - General evidence"}
              </div>
            </div>
            <div style={buttonRowStyle}>
              <button type="button" style={secondaryButtonStyle} onClick={() => onOpen(file)}>Open / Preview</button>
              <button type="button" style={dangerButtonStyle} onClick={() => onDelete(file)}>Delete</button>
            </div>
          </div>
        ))}
        {!evidence.length ? <div style={emptyBoxStyle}>No evidence uploaded yet.</div> : null}
      </div>
    </InspectionSection>
  );
}

function PeopleSelect({ people, value, onChange }: { people: PeopleOption[]; value: string; onChange: (value: string) => void }) {
  const hasLegacyValue = value && !people.some((person) => person.name === value || person.id === value);
  return (
    <select style={inputStyle} value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">Select person</option>
      {hasLegacyValue ? <option value={value}>{value}</option> : null}
      {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
    </select>
  );
}

function InspectionSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={inspectionSectionStyle}>
      <h3 style={inspectionSectionTitleStyle}>{title}</h3>
      <div style={inspectionSectionBodyStyle}>{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={fieldStyle}>
      <span style={labelStyle}>{label}</span>
      {children}
    </label>
  );
}

function StatusPill({ status }: { status: string }) {
  const color = status === "Closed" || status === "Complete" ? "#16a34a" : status === "Open" ? "#2563eb" : "#f59e0b";
  return <span style={{ ...statusPillInlineStyle, background: `${color}22`, color }}>{status}</span>;
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...tabButtonStyle,
        background: active ? "#0f766e" : "white",
        color: active ? "white" : "#0f172a",
        borderColor: active ? "#0f766e" : "#cbd5e1",
      }}
    >
      {children}
    </button>
  );
}

function PanelHeader({ title, description }: { title: string; description: string }) {
  return (
    <div style={panelHeaderStyle}>
      <h2 style={panelTitleStyle}>{title}</h2>
      <p style={panelDescriptionStyle}>{description}</p>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={sectionCardStyle}>
      <h2 style={sectionTitleStyle}>{title}</h2>
      {children}
    </section>
  );
}

const topMetaRowStyle: CSSProperties = { marginBottom: 20, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" };
const backLinkStyle: CSSProperties = { color: "#0f766e", fontWeight: 700, textDecoration: "none" };
const statusBannerStyle: CSSProperties = { background: "white", borderRadius: "12px", padding: "12px 16px", boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)", color: "#0f172a" };
const tabRowStyle: CSSProperties = { display: "flex", gap: "8px", flexWrap: "wrap", background: "white", borderRadius: "16px", padding: "12px", boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)", marginBottom: "20px" };
const tabButtonStyle: CSSProperties = { border: "1px solid #cbd5e1", borderRadius: "10px", padding: "10px 14px", fontWeight: 800, fontSize: "14px", cursor: "pointer" };
const statsGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "16px", marginBottom: "20px" };
const dashboardGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "20px" };
const sectionCardStyle: CSSProperties = { background: "white", borderRadius: "16px", padding: "20px", boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)" };
const sectionTitleStyle: CSSProperties = { margin: "0 0 10px", fontSize: "18px", color: "#0f172a" };
const emptyTextStyle: CSSProperties = { color: "#475569", margin: "0 0 14px", lineHeight: 1.55 };
const storyGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px" };
const miniTemplateStyle: CSSProperties = { border: "1px solid #cbd5e1", borderRadius: "10px", padding: "12px", display: "flex", flexDirection: "column", gap: "4px", color: "#0f172a", background: "#f8fafc" };
const panelStyle: CSSProperties = { background: "white", borderRadius: "18px", padding: "20px", boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)" };
const panelHeaderStyle: CSSProperties = { background: "#0f766e", color: "white", borderRadius: "10px", padding: "14px 16px", marginBottom: "18px" };
const panelTitleStyle: CSSProperties = { margin: 0, fontSize: "18px", fontWeight: 800 };
const panelDescriptionStyle: CSSProperties = { margin: "4px 0 0", fontSize: "13px", lineHeight: 1.45 };
const splitGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "1fr", gap: "20px", alignItems: "start" };
const detailPanelStyle: CSSProperties = { background: "white", borderRadius: "18px", padding: "20px", boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)", width: "100%", boxSizing: "border-box" };
const registerToolbarStyle: CSSProperties = { display: "grid", gridTemplateColumns: "minmax(260px, 1fr) 180px auto auto", gap: "10px", alignItems: "end", marginBottom: "14px" };
const inputStyle: CSSProperties = { width: "100%", minHeight: "42px", border: "1px solid #cbd5e1", borderRadius: "9px", padding: "9px 12px", fontSize: "14px", background: "white", boxSizing: "border-box" };
const selectStyle: CSSProperties = { ...inputStyle };
const tableInfoStyle: CSSProperties = { fontSize: "13px", color: "#475569", marginBottom: "8px" };
const tableShellStyle: CSSProperties = { border: "1px solid #cbd5e1", borderRadius: "12px", overflow: "auto", maxHeight: "520px" };
const tableStyle: CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: "13px" };
const thStyle: CSSProperties = { textAlign: "left", padding: "12px", color: "#334155", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.04em" };
const tdStyle: CSSProperties = { padding: "12px", borderBottom: "1px solid #e2e8f0", color: "#0f172a", verticalAlign: "middle" };
const tdStrongStyle: CSSProperties = { ...tdStyle, fontWeight: 900, color: "#0f766e" };
const reportTdStyle: CSSProperties = { ...tdStyle, textAlign: "center", width: "96px" };
const clickableRowStyle: CSSProperties = { cursor: "pointer" };
const emptyCellStyle: CSSProperties = { padding: "22px", textAlign: "center", color: "#64748b", borderTop: "1px solid #e2e8f0" };
const primaryButtonStyle: CSSProperties = { background: "#0f766e", color: "white", border: "none", borderRadius: "10px", padding: "11px 16px", fontWeight: 800, cursor: "pointer" };
const secondaryButtonStyle: CSSProperties = { background: "#e2e8f0", color: "#0f172a", border: "none", borderRadius: "10px", padding: "11px 16px", fontWeight: 800, cursor: "pointer" };
const pdfButtonStyle: CSSProperties = { background: "#e2e8f0", color: "#0f172a", border: "none", borderRadius: "9px", padding: "8px 14px", fontWeight: 900, cursor: "pointer", minWidth: "54px", lineHeight: 1 };
const dangerButtonStyle: CSSProperties = { background: "#b91c1c", color: "white", border: "none", borderRadius: "10px", padding: "11px 16px", fontWeight: 800, cursor: "pointer" };
const primaryLinkStyle: CSSProperties = { ...primaryButtonStyle, display: "inline-flex", textDecoration: "none", alignItems: "center" };
const secondaryLinkStyle: CSSProperties = { ...secondaryButtonStyle, display: "inline-flex", textDecoration: "none", alignItems: "center" };
const templateGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "12px", marginBottom: "20px" };
const templateCardStyle: CSSProperties = { minHeight: "164px", display: "flex", flexDirection: "column", gap: "8px", textAlign: "left", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "14px", padding: "14px", cursor: "pointer", color: "#0f172a" };
const docNumberStyle: CSSProperties = { color: "#0f766e", fontWeight: 900, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.04em" };
const templateStatusStyle: CSSProperties = { marginTop: "auto", color: "#0f766e", fontWeight: 800, fontSize: "12px" };
const selectedHeaderStyle: CSSProperties = { display: "flex", justifyContent: "space-between", gap: "14px", alignItems: "flex-start", border: "1px solid #99f6e4", background: "#ecfdf5", borderRadius: "14px", padding: "16px", marginBottom: "18px" };
const selectedEyebrowStyle: CSSProperties = { fontSize: "12px", color: "#0f766e", fontWeight: 900, letterSpacing: "0.04em" };
const selectedTitleStyle: CSSProperties = { margin: "4px 0", fontSize: "22px", color: "#0f172a" };
const selectedDescriptionStyle: CSSProperties = { margin: 0, color: "#475569", lineHeight: 1.45 };
const statusPillStyle: CSSProperties = { background: "#dcfce7", color: "#166534", borderRadius: "999px", padding: "7px 10px", fontWeight: 800, fontSize: "12px", whiteSpace: "nowrap" };
const statusPillInlineStyle: CSSProperties = { borderRadius: "999px", padding: "6px 9px", fontWeight: 900, fontSize: "12px", whiteSpace: "nowrap" };
const compactFormStyle: CSSProperties = { maxHeight: "62vh", overflow: "auto", paddingRight: "6px" };
const formGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" };
const fieldStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "6px", fontWeight: 800, color: "#334155", fontSize: "12px" };
const labelStyle: CSSProperties = { textTransform: "uppercase", letterSpacing: "0.03em" };
const inspectionSectionStyle: CSSProperties = { border: "1px solid #cbd5e1", borderRadius: "14px", overflow: "hidden", marginBottom: "16px", background: "white" };
const inspectionSectionTitleStyle: CSSProperties = { margin: 0, background: "#0f766e", color: "white", padding: "12px 14px", fontSize: "16px", fontWeight: 900 };
const inspectionSectionBodyStyle: CSSProperties = { padding: "14px" };
const checklistShellStyle: CSSProperties = { display: "grid", gap: "0", border: "1px solid #dbe3ef", borderRadius: "10px", overflow: "hidden" };
const checklistHeaderStyle: CSSProperties = { display: "grid", gridTemplateColumns: "60px minmax(220px, 1fr) 48px 48px 48px minmax(160px, 0.62fr) 74px", gap: 0, alignItems: "center", background: "#f1f5f9", fontWeight: 900, color: "#0f172a", fontSize: "12px" };
const checklistRowStyle: CSSProperties = { display: "grid", gridTemplateColumns: "60px minmax(220px, 1fr) 48px 48px 48px minmax(160px, 0.62fr) 74px", gap: 0, alignItems: "stretch", borderTop: "1px solid #dbe3ef", fontSize: "13px" };
const radioCellStyle: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", borderLeft: "1px solid #dbe3ef" };
const itemUploadButtonStyle: CSSProperties = { margin: "8px", minHeight: "30px", border: "1px solid #99f6e4", background: "#ecfdf5", color: "#0f766e", borderRadius: "8px", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "11px", cursor: "pointer" };
const smallTextareaStyle: CSSProperties = { width: "100%", minHeight: "42px", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "8px", fontSize: "13px", resize: "vertical", boxSizing: "border-box" };
const largeTextareaStyle: CSSProperties = { ...smallTextareaStyle, minHeight: "110px" };
const actionTableStyle: CSSProperties = { display: "grid", gap: 0, border: "1px solid #dbe3ef", borderRadius: "10px", overflow: "hidden", marginBottom: "12px" };
const actionHeaderStyle: CSSProperties = { display: "grid", gridTemplateColumns: "52px minmax(220px, 1fr) 180px 150px 110px", background: "#f1f5f9", fontWeight: 900, fontSize: "12px" };
const actionRowStyle: CSSProperties = { display: "grid", gridTemplateColumns: "52px minmax(220px, 1fr) 180px 150px 110px", gap: "8px", alignItems: "center", padding: "8px", borderTop: "1px solid #dbe3ef" };
const formActionsStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "10px", flexWrap: "wrap", marginTop: "16px" };
const emptyBoxStyle: CSSProperties = { border: "1px dashed #cbd5e1", borderRadius: "12px", padding: "18px", color: "#64748b", background: "#f8fafc" };
const uploadButtonStyle: CSSProperties = { ...primaryButtonStyle, display: "inline-flex", width: "fit-content", marginBottom: "12px" };
const evidenceListStyle: CSSProperties = { display: "grid", gap: "10px" };
const evidenceCardStyle: CSSProperties = { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", border: "1px solid #dbe3ef", borderRadius: "12px", padding: "12px", background: "#f8fafc" };
const mutedTextStyle: CSSProperties = { color: "#64748b", fontSize: "12px", marginTop: "4px" };
const buttonRowStyle: CSSProperties = { display: "flex", gap: "8px", flexWrap: "wrap" };
const qrImageStyle: CSSProperties = { width: "160px", height: "160px", border: "1px solid #dbe3ef", borderRadius: "12px", padding: "8px", background: "white", marginBottom: "10px" };

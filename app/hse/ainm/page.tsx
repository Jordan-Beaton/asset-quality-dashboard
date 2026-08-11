"use client";

import Link from "next/link";
import React, { ChangeEvent, CSSProperties, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  AlignmentType,
  BorderStyle,
  Document as WordDocument,
  ExternalHyperlink,
  Footer,
  Header,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  SimpleField,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import * as XLSX from "xlsx";
import { useImsPermissions } from "../../../src/components/ImsPermissions";
import { QualityKpiCard } from "../../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../../src/components/QualityPageHero";
import { supabase } from "../../../src/lib/supabase";

export const dynamic = "force-dynamic";

type AINMView = "dashboard" | "register" | "create" | "external" | "import" | "reports";
type DetailTab = "notification" | "part1" | "part2" | "actions" | "evidence" | "reports";
type AINMType = "Incident" | "Accident";
type NewAINMType = "" | AINMType;
type DashboardScope = "internal" | "external" | "combined";
type StageStatus = "Not Started" | "Draft" | "Issued" | "Complete";
type OverallStatus = "Open" | "In Progress" | "Closed";
type ExternalAINMStatus = "Logged" | "Under Review" | "Action Required" | "Closed";

type AINMRecord = {
  id: string;
  ainm_number: string;
  title: string;
  project: string | null;
  location_site: string | null;
  event_date: string | null;
  event_time: string | null;
  event_classification: string | null;
  company_in_control: string | null;
  report_ref: string | null;
  brief_event_details: string | null;
  injury_release_damage_details: string | null;
  initial_response_details: string | null;
  casualty_management: string | null;
  site_management: string | null;
  initial_cause: string | null;
  additional_information: string | null;
  environmental_release_type: string | null;
  environmental_release_quantity: string | null;
  immediate_corrective_actions: string | null;
  investigation_team_members: InvestigationTeamMember[];
  root_cause_people: string | null;
  root_cause_equipment: string | null;
  root_cause_environment: string | null;
  root_cause_process: string | null;
  attachments_checklist: string[];
  part1_additional_comments: string | null;
  part1_reviewer_name: string | null;
  part1_reviewer_position: string | null;
  investigation_findings_people: string | null;
  investigation_findings_equipment: string | null;
  investigation_findings_environment: string | null;
  investigation_findings_process: string | null;
  reference_documents: string | null;
  part2_further_comments: string | null;
  signoff_location_name: string | null;
  signoff_location_position: string | null;
  signoff_location_date: string | null;
  signoff_hseq_name: string | null;
  signoff_hseq_position: string | null;
  signoff_hseq_date: string | null;
  signoff_project_manager_name: string | null;
  signoff_project_manager_position: string | null;
  signoff_project_manager_date: string | null;
  signoff_smt_name: string | null;
  signoff_smt_position: string | null;
  signoff_smt_date: string | null;
  notification_status: StageStatus;
  notification_sent_at: string | null;
  part1_status: StageStatus;
  part1_completed_at: string | null;
  part2_status: StageStatus;
  part2_completed_at: string | null;
  overall_status: OverallStatus;
  owner: string | null;
  comments: string | null;
  source_import_year: number | null;
  created_at: string;
  updated_at: string;
};

type AINMAction = {
  id: string;
  ainm_id: string;
  tracker_no: string | null;
  project: string | null;
  ainm_number: string | null;
  action: string | null;
  assigned: string | null;
  date_raised: string | null;
  date_closed: string | null;
  status: string | null;
  comments: string | null;
  created_at: string;
  updated_at: string;
};

type CentralAction = {
  id: string;
  action_number: string | null;
  title: string | null;
  description: string | null;
  owner: string | null;
  status: string | null;
  priority: string | null;
  due_date: string | null;
  linked_ainm_id?: string | null;
  linked_ainm_number?: string | null;
};

type InlineActionDraft = {
  title: string;
  description: string;
  department: string;
  owner: string;
  priority: string;
  due_date: string;
};

type AINMEvidence = {
  id: string;
  ainm_id: string;
  stage: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  content_type: string | null;
  notes: string | null;
  uploaded_at: string;
};

type AINMGeneratedDocument = {
  id: string;
  ainm_id: string;
  document_stage: string;
  file_name: string | null;
  file_path: string | null;
  file_size: number | null;
  content_type: string | null;
  generated_at: string;
  generated_by: string | null;
};

type ExternalAINMRecord = {
  id: string;
  external_ainm_number: string;
  external_party_type: string | null;
  supplier_name: string | null;
  supplier_reference: string | null;
  project: string | null;
  location_site: string | null;
  event_date: string | null;
  event_type: string | null;
  enshore_contact: string | null;
  summary: string | null;
  immediate_actions: string | null;
  status: ExternalAINMStatus;
  include_in_statistics: boolean | null;
  comments: string | null;
  created_at: string;
  updated_at: string;
};

type ExternalAINMEvidence = {
  id: string;
  external_ainm_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  content_type: string | null;
  notes: string | null;
  uploaded_at: string;
};

type InvestigationTeamMember = {
  name: string;
  company: string;
  position: string;
  role: string;
};

type PeopleOption = {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  department: string | null;
  active: boolean | null;
};

type ImportedAction = {
  tracker_no: string;
  project: string;
  ainm_number: string;
  action: string;
  assigned: string;
  date_raised: string;
  date_closed: string;
  status: string;
  comments: string;
};

type ImportGroup = {
  ainm_number: string;
  title: string;
  event_date: string;
  project: string;
  source_year: number | null;
  actions: ImportedAction[];
};

const stageStatuses: StageStatus[] = ["Not Started", "Draft", "Issued", "Complete"];
const overallStatuses: OverallStatus[] = ["Open", "In Progress", "Closed"];
const externalAinmStatuses: ExternalAINMStatus[] = ["Logged", "Under Review", "Action Required", "Closed"];
const externalPartyTypes = ["Third Party", "Supplier", "Contractor", "Client", "Other"];
const externalEventTypes = ["Incident", "Accident", "Near Miss", "Environmental", "Equipment Damage", "Other"];
const eventClassifications = [
  "Fatality",
  "Near Miss",
  "Environmental Release",
  "Restricted Work Case",
  "Reportable Disease",
  "Equipment Damage",
  "Medical Treatment Case",
  "Non-Work Related",
  "Product/Property Damage",
  "First Aid Case",
  "Lost Time Injury",
  "Property Damage",
  "Other",
];
const attachmentChecklistOptions = [
  "Witness Statement(s)",
  "Toolbox Talk (TBT)",
  "Risk Assessment",
  "Injured Person Statement",
  "Induction Record",
  "Daily Progress Report",
  "Injury Report",
  "COSHH Assessment",
  "Task Plan/Method Statement",
  "Material/Equipment Certs",
  "E-Mails",
  "Permit to Work (PTW)",
  "Photographs",
  "Maintenance Record",
  "Minutes from Meetings",
  "Inspection Record",
  "Time Out for Safety (TOFS)",
  "Training Record",
  "Other",
];
const evidenceBucket = "quality-evidence";
const ainmTypePrefixes: Record<AINMType, string> = {
  Incident: "IR",
  Accident: "AR",
};

const emptyRecord: AINMRecord = {
  id: "",
  ainm_number: "",
  title: "",
  project: "",
  location_site: "",
  event_date: "",
  event_time: "",
  event_classification: "",
  company_in_control: "",
  report_ref: "",
  brief_event_details: "",
  injury_release_damage_details: "",
  initial_response_details: "",
  casualty_management: "",
  site_management: "",
  initial_cause: "",
  additional_information: "",
  environmental_release_type: "",
  environmental_release_quantity: "",
  immediate_corrective_actions: "",
  investigation_team_members: [],
  root_cause_people: "",
  root_cause_equipment: "",
  root_cause_environment: "",
  root_cause_process: "",
  attachments_checklist: [],
  part1_additional_comments: "",
  part1_reviewer_name: "",
  part1_reviewer_position: "",
  investigation_findings_people: "",
  investigation_findings_equipment: "",
  investigation_findings_environment: "",
  investigation_findings_process: "",
  reference_documents: "",
  part2_further_comments: "",
  signoff_location_name: "",
  signoff_location_position: "",
  signoff_location_date: "",
  signoff_hseq_name: "",
  signoff_hseq_position: "",
  signoff_hseq_date: "",
  signoff_project_manager_name: "",
  signoff_project_manager_position: "",
  signoff_project_manager_date: "",
  signoff_smt_name: "",
  signoff_smt_position: "",
  signoff_smt_date: "",
  notification_status: "Not Started",
  notification_sent_at: "",
  part1_status: "Not Started",
  part1_completed_at: "",
  part2_status: "Not Started",
  part2_completed_at: "",
  overall_status: "Open",
  owner: "",
  comments: "",
  source_import_year: null,
  created_at: "",
  updated_at: "",
};

const emptyExternalRecord: ExternalAINMRecord = {
  id: "",
  external_ainm_number: "",
  external_party_type: "Supplier",
  supplier_name: "",
  supplier_reference: "",
  project: "",
  location_site: "",
  event_date: "",
  event_type: "Incident",
  enshore_contact: "",
  summary: "",
  immediate_actions: "",
  status: "Logged",
  include_in_statistics: false,
  comments: "",
  created_at: "",
  updated_at: "",
};

const emptyInlineAction: InlineActionDraft = {
  title: "",
  description: "",
  department: "",
  owner: "",
  priority: "Medium",
  due_date: "",
};

const actionDepartmentOptions = [
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
  "Quality",
  "Survey",
  "HSE",
  "HSEQ",
] as const;

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function dateInputValue(value: unknown) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const text = clean(value);
  if (!text) return "";
  const date = new Date(text);
  if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  return "";
}

function timeInputValue(value: unknown) {
  const text = clean(value);
  const match = text.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  return match ? `${match[1]}:${match[2]}` : "";
}

function correctiveActionRowsFromText(value: unknown) {
  const rows = clean(value).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return rows.length ? rows : [""];
}

function correctiveActionRowsToText(rows: string[]) {
  return rows.map((row) => row.trim()).filter(Boolean).join("\n");
}

function attachmentIsSelected(values: string[], option: string) {
  return option === "Other"
    ? values.some((value) => value === "Other" || value.startsWith("Other: "))
    : values.includes(option);
}

function attachmentOtherText(values: string[]) {
  const saved = values.find((value) => value.startsWith("Other: "));
  return saved ? saved.slice("Other: ".length) : "";
}

function nextActionNumber(actions: CentralAction[]) {
  const used = new Set(
    actions
      .map((action) => Number.parseInt(action.action_number?.match(/(\d+)/)?.[1] || "", 10))
      .filter((value) => Number.isFinite(value) && value > 0)
  );
  let next = 1;
  while (used.has(next)) next += 1;
  return `ACT-${String(next).padStart(3, "0")}`;
}

function normaliseTeamMembers(value: unknown): InvestigationTeamMember[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row = item as Partial<InvestigationTeamMember>;
    return {
      name: clean(row.name),
      company: clean(row.company),
      position: clean(row.position),
      role: clean(row.role),
    };
  });
}

function splitLines(value: unknown) {
  return clean(value).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
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
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function recordYear(record: AINMRecord) {
  if (record.event_date) {
    const year = Number.parseInt(record.event_date.slice(0, 4), 10);
    if (Number.isFinite(year)) return String(year);
  }
  return record.source_import_year ? String(record.source_import_year) : "";
}

function externalRecordYear(record: ExternalAINMRecord) {
  if (record.event_date) {
    const year = Number.parseInt(record.event_date.slice(0, 4), 10);
    if (Number.isFinite(year)) return String(year);
  }
  if (record.created_at) {
    const date = new Date(record.created_at);
    if (!Number.isNaN(date.getTime())) return String(date.getFullYear());
  }
  return "";
}

function ainmTypeLabel(record: AINMRecord) {
  const number = clean(record.ainm_number).toUpperCase();
  if (number.startsWith("AR")) return "Accident";
  if (number.startsWith("IR")) return "Incident";
  return "Other";
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function formatFileSize(value: number | null) {
  if (!value || value <= 0) return "";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function parseAinmHeader(value: string) {
  const text = value.trim();
  const match = text.match(/^([A-Z]+\d+)\s+-\s+(.+?)\s+(\d{1,2}\/\d{1,2}\/\d{4})$/i);
  if (!match) return null;
  return { ainm_number: match[1].toUpperCase(), title: match[2].trim(), event_date: dateInputValue(match[3]) };
}

function parseSheetYear(sheetName: string, groups: ImportGroup[] = []) {
  const sheetYear = Number.parseInt(sheetName.trim(), 10);
  if (Number.isFinite(sheetYear)) return sheetYear;
  const datedGroup = groups.find((group) => group.event_date);
  if (!datedGroup?.event_date) return null;
  const eventYear = Number.parseInt(datedGroup.event_date.slice(0, 4), 10);
  return Number.isFinite(eventYear) ? eventYear : null;
}

function getNextAinmNumber(records: AINMRecord[], type: AINMType) {
  const prefix = ainmTypePrefixes[type];
  const maxNumber = records.reduce((max, record) => {
    const match = clean(record.ainm_number).toUpperCase().match(new RegExp(`^${prefix}(\\d+)$`));
    if (!match) return max;
    const value = Number.parseInt(match[1], 10);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);
  return `${prefix}${String(maxNumber + 1).padStart(3, "0")}`;
}

function getNextExternalAinmNumber(records: ExternalAINMRecord[]) {
  const maxNumber = records.reduce((max, record) => {
    const match = clean(record.external_ainm_number).toUpperCase().match(/^EXT-AINM-(\d+)$/);
    if (!match) return max;
    const value = Number.parseInt(match[1], 10);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);
  return `EXT-AINM-${String(maxNumber + 1).padStart(3, "0")}`;
}

function getStageTone(status: string) {
  if (status === "Complete" || status === "Issued") return { bg: "#ECECE7", color: "#005670" };
  if (status === "Draft" || status === "In Progress") return { bg: "#ECECE7", color: "#000000" };
  if (status === "Closed") return { bg: "#ECECE7", color: "#005670" };
  if (status === "Open") return { bg: "#ECECE7", color: "#005670" };
  return { bg: "#D0D0CE", color: "#53565A" };
}

function buildActionHref(record: AINMRecord) {
  const params = new URLSearchParams({
    prefill_source: "AINM",
    prefill_project: record.project || "",
    linked_ainm_id: record.id,
    linked_ainm_number: record.ainm_number,
  });
  return `/actions?${params.toString()}`;
}

async function getLogoDataUrl() {
  try {
    const response = await fetch("/enshore-primary-logo-colour.png");
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

async function createSignedEvidenceUrl(path: string) {
  if (!path) return "";
  const { data, error } = await supabase.storage.from(evidenceBucket).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return "";
  return data.signedUrl;
}

function dataUrlToBytes(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] || "";
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export default function HseAinmPage() {
  const imsPermissions = useImsPermissions();
  const [records, setRecords] = useState<AINMRecord[]>([]);
  const [actions, setActions] = useState<AINMAction[]>([]);
  const [centralActions, setCentralActions] = useState<CentralAction[]>([]);
  const [evidence, setEvidence] = useState<AINMEvidence[]>([]);
  const [generatedDocuments, setGeneratedDocuments] = useState<AINMGeneratedDocument[]>([]);
  const [externalRecords, setExternalRecords] = useState<ExternalAINMRecord[]>([]);
  const [externalEvidence, setExternalEvidence] = useState<ExternalAINMEvidence[]>([]);
  const [peopleOptions, setPeopleOptions] = useState<PeopleOption[]>([]);
  const [activeView, setActiveView] = useState<AINMView>("dashboard");
  const [detailTab, setDetailTab] = useState<DetailTab>("notification");
  const [selectedId, setSelectedId] = useState("");
  const selectedDetailRef = useRef<HTMLDivElement | null>(null);
  const [selectedExternalId, setSelectedExternalId] = useState("");
  const [draft, setDraft] = useState<AINMRecord>(emptyRecord);
  const [externalDraft, setExternalDraft] = useState<ExternalAINMRecord>(emptyExternalRecord);
  const [newExternalRecord, setNewExternalRecord] = useState<ExternalAINMRecord>(emptyExternalRecord);
  const [correctiveActionRows, setCorrectiveActionRows] = useState<string[]>([""]);
  const [referenceDocumentRows, setReferenceDocumentRows] = useState<string[]>([""]);
  const [investigationTeamRows, setInvestigationTeamRows] = useState<InvestigationTeamMember[]>([
    { name: "", company: "", position: "", role: "" },
  ]);
  const [newRecord, setNewRecord] = useState<AINMRecord>(emptyRecord);
  const [newAinmType, setNewAinmType] = useState<NewAINMType>("");
  const [message, setMessage] = useState("Loading AINM records...");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | AINMType>("");
  const [classificationFilter, setClassificationFilter] = useState("");
  const [showRegisterFilters, setShowRegisterFilters] = useState(false);
  const [importWorkbook, setImportWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [importSheets, setImportSheets] = useState<string[]>([]);
  const [selectedImportSheet, setSelectedImportSheet] = useState("");
  const [importPreview, setImportPreview] = useState<ImportGroup[]>([]);
  const [importing, setImporting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [evidenceStage, setEvidenceStage] = useState("General");
  const [generatingStage, setGeneratingStage] = useState("");
  const [reportTypeFilter, setReportTypeFilter] = useState<"" | "IR" | "AR">("");
  const [showReportFilters, setShowReportFilters] = useState(false);
  const [selectedReportGroupKey, setSelectedReportGroupKey] = useState("");
  const [dashboardYear, setDashboardYear] = useState(String(new Date().getFullYear()));
  const [dashboardScope, setDashboardScope] = useState<DashboardScope>("internal");
  const [externalSearch, setExternalSearch] = useState("");
  const [externalStatusFilter, setExternalStatusFilter] = useState("");
  const [externalTypeFilter, setExternalTypeFilter] = useState("");
  const [showExternalFilters, setShowExternalFilters] = useState(false);
  const [showAddReviewer, setShowAddReviewer] = useState(false);
  const [newReviewerName, setNewReviewerName] = useState("");
  const [newReviewerRole, setNewReviewerRole] = useState("");
  const [inlineAction, setInlineAction] = useState<InlineActionDraft>(emptyInlineAction);
  const [savingInlineAction, setSavingInlineAction] = useState(false);
  const [refreshStamp, setRefreshStamp] = useState("");

  const canCreateAinm = useMemo(() => {
    return imsPermissions.loaded && (imsPermissions.isMasterAdmin || imsPermissions.fullAccess || imsPermissions.canCreate);
  }, [imsPermissions.canCreate, imsPermissions.fullAccess, imsPermissions.isMasterAdmin, imsPermissions.loaded]);

  const canEditAinm = useMemo(() => {
    return imsPermissions.loaded && (imsPermissions.isMasterAdmin || imsPermissions.fullAccess || imsPermissions.canEdit);
  }, [imsPermissions.canEdit, imsPermissions.fullAccess, imsPermissions.isMasterAdmin, imsPermissions.loaded]);

  function requireCreatePermission(actionLabel: string) {
    if (canCreateAinm) return true;
    setMessage(`${actionLabel} requires Create permission for this IMS area.`);
    return false;
  }

  function requireEditPermission(actionLabel: string) {
    if (canEditAinm) return true;
    setMessage(`${actionLabel} requires Edit permission for this IMS area.`);
    return false;
  }

  const selected = useMemo(() => records.find((record) => record.id === selectedId) || null, [records, selectedId]);
  const selectedExternal = useMemo(
    () => externalRecords.find((record) => record.id === selectedExternalId) || null,
    [externalRecords, selectedExternalId]
  );
  const selectedActions = useMemo(() => actions.filter((action) => action.ainm_id === selectedId), [actions, selectedId]);
  const selectedCentralActions = useMemo(() => {
    const selectedNumber = selected?.ainm_number || "";
    return centralActions.filter((action) =>
      (selectedId && action.linked_ainm_id === selectedId) ||
      (selectedNumber && action.linked_ainm_number === selectedNumber)
    );
  }, [centralActions, selected?.ainm_number, selectedId]);

  function selectAinmAndScroll(record: AINMRecord) {
    setSelectedId(record.id);
    setDraft(record);
    window.setTimeout(() => {
      selectedDetailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }
  const selectedEvidence = useMemo(() => evidence.filter((file) => file.ainm_id === selectedId), [evidence, selectedId]);
  const selectedExternalEvidence = useMemo(
    () => externalEvidence.filter((file) => file.external_ainm_id === selectedExternalId),
    [externalEvidence, selectedExternalId]
  );
  const compiledPdfReports = useMemo(
    () => generatedDocuments.filter((document) => document.document_stage === "compiled-pdf"),
    [generatedDocuments]
  );

  const filteredCompiledPdfReports = useMemo(() => {
    return compiledPdfReports.filter((document) => {
      const record = records.find((item) => item.id === document.ainm_id);
      if (!reportTypeFilter) return true;
      return record?.ainm_number?.startsWith(reportTypeFilter);
    });
  }, [compiledPdfReports, records, reportTypeFilter]);

  const groupedCompiledPdfReports = useMemo(() => {
    const groups = new Map<string, { record: AINMRecord | null; reports: AINMGeneratedDocument[] }>();
    filteredCompiledPdfReports.forEach((report) => {
      const record = records.find((item) => item.id === report.ainm_id) || null;
      const key = report.ainm_id || report.id;
      const current = groups.get(key) || { record, reports: [] };
      current.record = current.record || record;
      current.reports.push(report);
      groups.set(key, current);
    });
    return [...groups.entries()]
      .map(([key, group]) => ({
        key,
        ...group,
        reports: group.reports.sort((a, b) => new Date(b.generated_at || 0).getTime() - new Date(a.generated_at || 0).getTime()),
      }))
      .sort((a, b) => new Date(b.reports[0]?.generated_at || 0).getTime() - new Date(a.reports[0]?.generated_at || 0).getTime());
  }, [filteredCompiledPdfReports, records]);
  const selectedReportGroup = useMemo(
    () => groupedCompiledPdfReports.find((group) => group.key === selectedReportGroupKey) || null,
    [groupedCompiledPdfReports, selectedReportGroupKey]
  );

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    const searchTerms = query.split(/\s+/).filter(Boolean);
    return records.filter((record) => {
      const haystack = [
        record.ainm_number,
        record.title,
        record.project,
        record.location_site,
        record.event_classification,
        record.owner,
      ].join(" ").toLowerCase();
      const matchesSearch = searchTerms.length === 0 || searchTerms.every((term) => haystack.includes(term));
      const matchesStatus = !statusFilter || record.overall_status === statusFilter;
      const matchesType = !typeFilter || ainmTypeLabel(record) === typeFilter;
      const matchesClassification = !classificationFilter || record.event_classification === classificationFilter;
      const matchesStage =
        !stageFilter ||
        record.notification_status === stageFilter ||
        record.part1_status === stageFilter ||
        record.part2_status === stageFilter;
      return matchesSearch && matchesStatus && matchesStage && matchesType && matchesClassification;
    });
  }, [classificationFilter, records, search, stageFilter, statusFilter, typeFilter]);

  const filteredExternalRecords = useMemo(() => {
    const query = externalSearch.trim().toLowerCase();
    return externalRecords.filter((record) => {
      const haystack = [
        record.external_ainm_number,
        record.external_party_type,
        record.supplier_name,
        record.supplier_reference,
        record.project,
        record.location_site,
        record.event_type,
        record.enshore_contact,
        record.summary,
      ].join(" ").toLowerCase();
      const matchesSearch = !query || haystack.includes(query);
      const matchesStatus = !externalStatusFilter || record.status === externalStatusFilter;
      const matchesType = !externalTypeFilter || record.external_party_type === externalTypeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [externalRecords, externalSearch, externalStatusFilter, externalTypeFilter]);

  const kpis = useMemo(() => {
    const years = Array.from(
      new Set([
        ...records.map(recordYear).filter(Boolean),
        ...externalRecords.map(externalRecordYear).filter(Boolean),
      ])
    ).sort((a, b) => Number(b) - Number(a));
    const dashboardRecords = dashboardYear ? records.filter((record) => recordYear(record) === dashboardYear) : records;
    const dashboardExternalRecords = dashboardYear ? externalRecords.filter((record) => externalRecordYear(record) === dashboardYear) : externalRecords;
    const statisticalExternalRecords = dashboardExternalRecords.filter((record) => record.include_in_statistics);
    const scopedExternalRecords =
      dashboardScope === "internal"
        ? []
        : dashboardScope === "external"
        ? dashboardExternalRecords
        : statisticalExternalRecords;
    const dashboardRecordIds = new Set(dashboardRecords.map((record) => record.id));
    const open = dashboardRecords.filter((record) => record.overall_status !== "Closed").length;
    const notificationDue = dashboardRecords.filter((record) => record.notification_status !== "Issued" && record.notification_status !== "Complete").length;
    const part1Due = dashboardRecords.filter((record) => record.part1_status !== "Complete").length;
    const part2Due = dashboardRecords.filter((record) => record.part2_status !== "Complete").length;
    const closed = dashboardRecords.filter((record) => record.overall_status === "Closed").length;
    const internalIncidents = dashboardRecords.filter((record) => ainmTypeLabel(record) === "Incident").length;
    const internalAccidents = dashboardRecords.filter((record) => ainmTypeLabel(record) === "Accident").length;
    const externalIncidents = scopedExternalRecords.filter((record) => clean(record.event_type).toLowerCase().includes("incident")).length;
    const externalAccidents = scopedExternalRecords.filter((record) => clean(record.event_type).toLowerCase().includes("accident")).length;
    const incidents = (dashboardScope === "external" ? 0 : internalIncidents) + externalIncidents;
    const accidents = (dashboardScope === "external" ? 0 : internalAccidents) + externalAccidents;
    const compiledReports = compiledPdfReports.filter((report) => dashboardRecordIds.has(report.ainm_id)).length;
    const externalOpen = dashboardExternalRecords.filter((record) => record.status !== "Closed").length;
    const externalClosed = dashboardExternalRecords.filter((record) => record.status === "Closed").length;
    return {
      years,
      dashboardRecords,
      dashboardExternalRecords,
      scopedExternalRecords,
      open,
      notificationDue,
      part1Due,
      part2Due,
      closed,
      incidents,
      accidents,
      compiledReports,
      externalOpen,
      externalClosed,
    };
  }, [compiledPdfReports, dashboardScope, dashboardYear, externalRecords, records]);

  const dashboardInsights = useMemo(() => {
    const dashboardRecords = kpis.dashboardRecords;
    const total = dashboardRecords.length;
    const completedNotification = dashboardRecords.filter((record) => record.notification_status === "Issued" || record.notification_status === "Complete").length;
    const completedPart1 = dashboardRecords.filter((record) => record.part1_status === "Complete").length;
    const completedPart2 = dashboardRecords.filter((record) => record.part2_status === "Complete").length;
    const statusRows = overallStatuses.map((status) => ({
      label: status,
      value: dashboardRecords.filter((record) => record.overall_status === status).length,
      color: status === "Closed" ? "#005670" : status === "In Progress" ? "#FFAD00" : "#63B1BC",
      onClick: () => {
        setStatusFilter(status);
        setActiveView("register");
      },
    }));
    const typeRows = [
      {
        label: "Incident Reports",
        value: kpis.incidents,
        color: "#63B1BC",
        onClick: () => {
          setTypeFilter("Incident");
          setActiveView("register");
        },
      },
      {
        label: "Accident Reports",
        value: kpis.accidents,
        color: "#F93822",
        onClick: () => {
          setTypeFilter("Accident");
          setActiveView("register");
        },
      },
    ];
    const workflowRows = [
      { label: "Notification issued/complete", value: completedNotification, color: "#005670" },
      { label: "Part 1 complete", value: completedPart1, color: "#63B1BC" },
      { label: "Part 2 complete", value: completedPart2, color: "#53565A" },
    ];
    const classificationRows = eventClassifications
      .map((classification) => ({
        label: classification,
        value: dashboardRecords.filter((record) => record.event_classification === classification).length,
        color: "#005670",
        onClick: () => {
          setClassificationFilter(classification);
          setActiveView("register");
        },
      }))
      .filter((row) => row.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
    const projectRows = Array.from(new Set(dashboardRecords.map((record) => clean(record.project)).filter(Boolean)))
      .map((project) => ({
        label: project,
        value: dashboardRecords.filter((record) => clean(record.project) === project).length,
        color: "#005670",
        onClick: () => {
          setSearch((current) => current.trim() ? `${current.trim()} ${project}` : project);
          setActiveView("register");
        },
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
    const monthRows = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(2026, index, 1);
      const label = date.toLocaleString("en-GB", { month: "short" });
      const value = dashboardRecords.filter((record) => {
        if (!record.event_date) return false;
        const eventDate = new Date(record.event_date);
        return !Number.isNaN(eventDate.getTime()) && eventDate.getMonth() === index;
      }).length;
      return { label, value, color: "#005670" };
    });
    return { total, typeRows, workflowRows, statusRows, classificationRows, projectRows, monthRows };
  }, [kpis]);

  const latestSummary = records[0] ? `${records[0].ainm_number} - ${records[0].title}` : "No AINMs yet";
  const [fieldQrDataUrl, setFieldQrDataUrl] = useState("");

  function openRegisterWithType(type: AINMType) {
    setTypeFilter(type);
    setShowRegisterFilters(true);
    setActiveView("register");
  }

  function clearRegisterFilters() {
    setSearch("");
    setStatusFilter("");
    setStageFilter("");
    setTypeFilter("");
    setClassificationFilter("");
  }

  function exportDashboardSummaryPdf() {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    doc.setFillColor(0, 86, 112);
    doc.rect(12, 12, 273, 20, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text("AINM Dashboard Summary", 18, 25);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Year: ${dashboardYear || "All Years"} | Scope: ${dashboardScope} | Generated: ${new Date().toLocaleString("en-GB")}`, 190, 25);

    autoTable(doc, {
      startY: 40,
      head: [["Metric", "Value", "Context"]],
      body: [
        ["Open AINMs", String(kpis.open), "Internal AINM records not closed"],
        ["Closed AINMs", String(kpis.closed), "Internal AINM records closed"],
        ["Incidents", String(kpis.incidents), "Incident report profile for the selected dashboard scope"],
        ["Accidents", String(kpis.accidents), "Accident report profile for the selected dashboard scope"],
        ["Part 1 Due", String(kpis.part1Due), "Part 1 not complete"],
        ["Part 2 Due", String(kpis.part2Due), "Part 2 not complete"],
        ["Compiled Report Packs", String(kpis.compiledReports), "Final compiled PDF packs generated"],
      ],
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 3, textColor: [0, 0, 0], lineColor: [208, 208, 206], lineWidth: 0.15 },
      headStyles: { fillColor: [0, 86, 112], textColor: [255, 255, 255], fontStyle: "bold" },
      columnStyles: { 1: { halign: "center", cellWidth: 32 } },
      margin: { left: 12, right: 12 },
    });

    autoTable(doc, {
      startY: pdfLastY(doc, 40) + 10,
      head: [["Classification", "Count", "Project / Worksite", "Count"]],
      body: Array.from({ length: Math.max(dashboardInsights.classificationRows.length, dashboardInsights.projectRows.length, 1) }).map((_, index) => [
        dashboardInsights.classificationRows[index]?.label || "",
        dashboardInsights.classificationRows[index]?.value ? String(dashboardInsights.classificationRows[index].value) : "",
        dashboardInsights.projectRows[index]?.label || "",
        dashboardInsights.projectRows[index]?.value ? String(dashboardInsights.projectRows[index].value) : "",
      ]),
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 3, textColor: [0, 0, 0], lineColor: [208, 208, 206], lineWidth: 0.15 },
      headStyles: { fillColor: [0, 86, 112], textColor: [255, 255, 255], fontStyle: "bold" },
      columnStyles: { 1: { halign: "center", cellWidth: 25 }, 3: { halign: "center", cellWidth: 25 } },
      margin: { left: 12, right: 12 },
    });

    const pages = doc.getNumberOfPages();
    for (let page = 1; page <= pages; page += 1) {
      doc.setPage(page);
      doc.setFontSize(8);
      doc.setTextColor(83, 86, 90);
      doc.text(`Page ${page} of ${pages}`, 285, 202, { align: "right" });
    }
    doc.save(`AINM-dashboard-summary-${dashboardYear || "all-years"}.pdf`);
  }

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const fieldUrl = `${window.location.origin}/hse/ainm/field`;
    QRCode.toDataURL(fieldUrl, {
      margin: 1,
      width: 220,
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then(setFieldQrDataUrl)
      .catch(() => setFieldQrDataUrl(""));
  }, []);

  useEffect(() => {
    if (!records.length || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const directId = params.get("ainmId")?.trim() || "";
    const directNumber = params.get("ainm")?.trim() || "";
    if (!directId && !directNumber) return;
    const matched = records.find((record) => record.id === directId || record.ainm_number === directNumber);
    if (!matched) return;
    setSelectedId(matched.id);
    setDraft(matched);
    setActiveView("register");
  }, [records]);

  useEffect(() => {
    if (!selected) return;
    const nextDraft = {
      ...selected,
      attachments_checklist: Array.isArray(selected.attachments_checklist) ? selected.attachments_checklist : [],
      investigation_team_members: normaliseTeamMembers(selected.investigation_team_members),
    };
    setDraft(nextDraft);
    setCorrectiveActionRows(correctiveActionRowsFromText(nextDraft.immediate_corrective_actions));
    setReferenceDocumentRows(correctiveActionRowsFromText(nextDraft.reference_documents));
    setInvestigationTeamRows(nextDraft.investigation_team_members.length ? nextDraft.investigation_team_members : [{ name: "", company: "", position: "", role: "" }]);
  }, [selected]);

  useEffect(() => {
    if (!selectedExternal) return;
    setExternalDraft(selectedExternal);
  }, [selectedExternal]);

  useEffect(() => {
    setNewRecord((current) => ({ ...current, ainm_number: newAinmType ? getNextAinmNumber(records, newAinmType) : "" }));
  }, [newAinmType, records]);

  useEffect(() => {
    setNewExternalRecord((current) => ({
      ...current,
      external_ainm_number: current.external_ainm_number || getNextExternalAinmNumber(externalRecords),
    }));
  }, [externalRecords]);

  async function loadData() {
    setLoading(true);
    const [recordRes, actionRes, evidenceRes, centralActionRes, externalRecordRes, externalEvidenceRes] = await Promise.all([
      supabase.from("hse_ainm_records").select("*").order("event_date", { ascending: false }).order("ainm_number", { ascending: false }),
      supabase.from("hse_ainm_actions").select("*").order("date_raised", { ascending: false }),
      supabase.from("hse_ainm_evidence").select("*").order("uploaded_at", { ascending: false }),
      supabase.from("actions").select("*").order("action_number", { ascending: true }),
      supabase.from("hse_external_ainm_records").select("*").order("event_date", { ascending: false }).order("external_ainm_number", { ascending: false }),
      supabase.from("hse_external_ainm_evidence").select("*").order("uploaded_at", { ascending: false }),
    ]);
    const generatedRes = await supabase.from("hse_ainm_generated_documents").select("*").order("generated_at", { ascending: false });
    const peopleRes = await supabase
      .from("people")
      .select("id,name,email,role,department,active")
      .eq("active", true)
      .order("name", { ascending: true });

    if (recordRes.error) {
      setMessage(`AINM tables not ready: ${recordRes.error.message}. Run scripts/sql/hse_ainm.sql in Supabase.`);
      setLoading(false);
      return;
    }

    if (actionRes.error || evidenceRes.error || generatedRes.error || centralActionRes.error || externalRecordRes.error || externalEvidenceRes.error) {
      const externalMissing = externalRecordRes.error?.message || externalEvidenceRes.error?.message;
      setMessage(`AINM related data load warning: ${actionRes.error?.message || evidenceRes.error?.message || generatedRes.error?.message || centralActionRes.error?.message || externalMissing}. Run scripts/sql/hse_external_ainm.sql for External AINM if needed.`);
    } else {
      setMessage("AINM records loaded.");
    }

    const nextRecords = ((recordRes.data || []) as AINMRecord[]).map((record) => ({
      ...record,
      attachments_checklist: Array.isArray(record.attachments_checklist) ? record.attachments_checklist : [],
    }));
    setRecords(nextRecords);
    setActions((actionRes.data || []) as AINMAction[]);
    setCentralActions((centralActionRes.data || []) as CentralAction[]);
    setEvidence((evidenceRes.data || []) as AINMEvidence[]);
    setGeneratedDocuments((generatedRes.data || []) as AINMGeneratedDocument[]);
    const nextExternalRecords = externalRecordRes.error ? [] : ((externalRecordRes.data || []) as ExternalAINMRecord[]);
    setExternalRecords(nextExternalRecords);
    setExternalEvidence(externalEvidenceRes.error ? [] : ((externalEvidenceRes.data || []) as ExternalAINMEvidence[]));
    if (!peopleRes.error) setPeopleOptions((peopleRes.data || []) as PeopleOption[]);
    setRefreshStamp(new Date().toLocaleString("en-GB"));
    if (!selectedId && nextRecords[0]) setSelectedId(nextRecords[0].id);
    if (!selectedExternalId && nextExternalRecords[0]) setSelectedExternalId(nextExternalRecords[0].id);
    setLoading(false);
  }

  function updateNew<K extends keyof AINMRecord>(key: K, value: AINMRecord[K]) {
    setNewRecord((current) => ({ ...current, [key]: value }));
  }

  function updateNewExternal<K extends keyof ExternalAINMRecord>(key: K, value: ExternalAINMRecord[K]) {
    setNewExternalRecord((current) => ({ ...current, [key]: value }));
  }

  function updateDraft<K extends keyof AINMRecord>(key: K, value: AINMRecord[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateExternalDraft<K extends keyof ExternalAINMRecord>(key: K, value: ExternalAINMRecord[K]) {
    setExternalDraft((current) => ({ ...current, [key]: value }));
  }

  function toggleAttachment(value: string) {
    setDraft((current) => {
      const existing = new Set(current.attachments_checklist || []);
      if (value === "Other") {
        const otherValues = [...existing].filter((item) => item === "Other" || item.startsWith("Other: "));
        if (otherValues.length) otherValues.forEach((item) => existing.delete(item));
        else existing.add("Other");
      } else if (existing.has(value)) existing.delete(value);
      else existing.add(value);
      return { ...current, attachments_checklist: [...existing] };
    });
  }

  function updateAttachmentOtherText(value: string) {
    setDraft((current) => ({
      ...current,
      attachments_checklist: [
        ...(current.attachments_checklist || []).filter((item) => item !== "Other" && !item.startsWith("Other: ")),
        value.trim() ? `Other: ${value}` : "Other",
      ],
    }));
  }

  async function createInlineCentralAction() {
    if (!selectedId || !requireEditPermission("Creating linked AINM actions")) return;
    if (!inlineAction.title.trim()) {
      setMessage("Action title is required before adding a corrective action.");
      return;
    }
    if (!inlineAction.department) {
      setMessage("Select a department before adding a corrective action.");
      return;
    }

    setSavingInlineAction(true);
    const { error } = await supabase.from("actions").insert([{
      action_number: nextActionNumber(centralActions),
      title: inlineAction.title.trim(),
      description: inlineAction.description.trim() || null,
      department: inlineAction.department,
      project: draft.project || null,
      owner: inlineAction.owner.trim() || null,
      priority: inlineAction.priority,
      status: "Open",
      due_date: inlineAction.due_date || null,
      source: "AINM",
      linked_ainm_id: selectedId,
      linked_ainm_number: draft.ainm_number,
    }]);
    setSavingInlineAction(false);

    if (error) {
      setMessage(`Add corrective action failed: ${error.message}`);
      return;
    }

    setInlineAction(emptyInlineAction);
    setMessage(`Added a corrective action to ${draft.ainm_number}.`);
    await loadData();
  }

  function updateCorrectiveActionRow(index: number, value: string) {
    const rows = [...correctiveActionRows];
    rows[index] = value;
    setCorrectiveActionRows(rows);
    updateDraft("immediate_corrective_actions", correctiveActionRowsToText(rows));
  }

  function addCorrectiveActionRow() {
    setCorrectiveActionRows((current) => [...current, ""]);
  }

  function removeCorrectiveActionRow(index: number) {
    const nextRows = correctiveActionRows.filter((_, rowIndex) => rowIndex !== index);
    const safeRows = nextRows.length ? nextRows : [""];
    setCorrectiveActionRows(safeRows);
    updateDraft("immediate_corrective_actions", correctiveActionRowsToText(nextRows.length ? nextRows : [""]));
  }

  function updateReferenceDocumentRow(index: number, value: string) {
    const rows = [...referenceDocumentRows];
    rows[index] = value;
    setReferenceDocumentRows(rows);
    updateDraft("reference_documents", correctiveActionRowsToText(rows));
  }

  function addReferenceDocumentRow() {
    setReferenceDocumentRows((current) => [...current, ""]);
  }

  function removeReferenceDocumentRow(index: number) {
    const nextRows = referenceDocumentRows.filter((_, rowIndex) => rowIndex !== index);
    const safeRows = nextRows.length ? nextRows : [""];
    setReferenceDocumentRows(safeRows);
    updateDraft("reference_documents", correctiveActionRowsToText(safeRows));
  }

  function syncInvestigationTeam(rows: InvestigationTeamMember[]) {
    setInvestigationTeamRows(rows);
    updateDraft("investigation_team_members", rows.filter((row) => row.name || row.company || row.position || row.role) as AINMRecord["investigation_team_members"]);
  }

  function updateInvestigationTeamRow(index: number, key: keyof InvestigationTeamMember, value: string) {
    const rows = [...investigationTeamRows];
    rows[index] = { ...rows[index], [key]: value };
    syncInvestigationTeam(rows);
  }

  function addInvestigationTeamRow() {
    syncInvestigationTeam([...investigationTeamRows, { name: "", company: "", position: "", role: "" }]);
  }

  function removeInvestigationTeamRow(index: number) {
    const nextRows = investigationTeamRows.filter((_, rowIndex) => rowIndex !== index);
    syncInvestigationTeam(nextRows.length ? nextRows : [{ name: "", company: "", position: "", role: "" }]);
  }

  function selectPersonForDraftName(nameKey: keyof AINMRecord, positionKey: keyof AINMRecord, personIdOrName: string) {
    const person = peopleOptions.find((item) => item.id === personIdOrName || item.name === personIdOrName);
    updateDraft(nameKey, (person?.name || personIdOrName) as AINMRecord[typeof nameKey]);
    updateDraft(positionKey, (person?.role || "") as AINMRecord[typeof positionKey]);
  }

  function buildPayload(record: AINMRecord) {
    return {
      ainm_number: record.ainm_number.trim(),
      title: record.title.trim(),
      project: clean(record.project) || null,
      location_site: clean(record.location_site) || null,
      event_date: clean(record.event_date) || null,
      event_time: clean(record.event_time) || null,
      event_classification: clean(record.event_classification) || null,
      company_in_control: clean(record.company_in_control) || null,
      report_ref: clean(record.report_ref) || null,
      brief_event_details: clean(record.brief_event_details) || null,
      injury_release_damage_details: clean(record.injury_release_damage_details) || null,
      initial_response_details: clean(record.initial_response_details) || null,
      casualty_management: clean(record.casualty_management) || null,
      site_management: clean(record.site_management) || null,
      initial_cause: clean(record.initial_cause) || null,
      additional_information: clean(record.additional_information) || null,
      environmental_release_type: clean(record.environmental_release_type) || null,
      environmental_release_quantity: clean(record.environmental_release_quantity) || null,
      immediate_corrective_actions: clean(record.immediate_corrective_actions) || null,
      investigation_team_members: normaliseTeamMembers(record.investigation_team_members),
      root_cause_people: clean(record.root_cause_people) || null,
      root_cause_equipment: clean(record.root_cause_equipment) || null,
      root_cause_environment: clean(record.root_cause_environment) || null,
      root_cause_process: clean(record.root_cause_process) || null,
      attachments_checklist: record.attachments_checklist || [],
      part1_additional_comments: clean(record.part1_additional_comments) || null,
      part1_reviewer_name: clean(record.part1_reviewer_name) || null,
      part1_reviewer_position: clean(record.part1_reviewer_position) || null,
      investigation_findings_people: clean(record.investigation_findings_people) || null,
      investigation_findings_equipment: clean(record.investigation_findings_equipment) || null,
      investigation_findings_environment: clean(record.investigation_findings_environment) || null,
      investigation_findings_process: clean(record.investigation_findings_process) || null,
      reference_documents: clean(record.reference_documents) || null,
      part2_further_comments: clean(record.part2_further_comments) || null,
      signoff_location_name: clean(record.signoff_location_name) || null,
      signoff_location_position: clean(record.signoff_location_position) || null,
      signoff_location_date: clean(record.signoff_location_date) || null,
      signoff_hseq_name: clean(record.signoff_hseq_name) || null,
      signoff_hseq_position: clean(record.signoff_hseq_position) || null,
      signoff_hseq_date: clean(record.signoff_hseq_date) || null,
      signoff_project_manager_name: clean(record.signoff_project_manager_name) || null,
      signoff_project_manager_position: clean(record.signoff_project_manager_position) || null,
      signoff_project_manager_date: clean(record.signoff_project_manager_date) || null,
      signoff_smt_name: clean(record.signoff_smt_name) || null,
      signoff_smt_position: clean(record.signoff_smt_position) || null,
      signoff_smt_date: clean(record.signoff_smt_date) || null,
      notification_status: record.notification_status,
      notification_sent_at: clean(record.notification_sent_at) || null,
      part1_status: record.part1_status,
      part1_completed_at: clean(record.part1_completed_at) || null,
      part2_status: record.part2_status,
      part2_completed_at: clean(record.part2_completed_at) || null,
      overall_status: record.overall_status,
      owner: clean(record.owner) || null,
      comments: clean(record.comments) || null,
      source_import_year: record.source_import_year,
      updated_at: new Date().toISOString(),
    };
  }

  function buildExternalPayload(record: ExternalAINMRecord) {
    return {
      external_ainm_number: clean(record.external_ainm_number),
      external_party_type: clean(record.external_party_type) || null,
      supplier_name: clean(record.supplier_name) || null,
      supplier_reference: clean(record.supplier_reference) || null,
      project: clean(record.project) || null,
      location_site: clean(record.location_site) || null,
      event_date: clean(record.event_date) || null,
      event_type: clean(record.event_type) || null,
      enshore_contact: clean(record.enshore_contact) || null,
      summary: clean(record.summary) || null,
      immediate_actions: clean(record.immediate_actions) || null,
      status: record.status || "Logged",
      include_in_statistics: Boolean(record.include_in_statistics),
      comments: clean(record.comments) || null,
      updated_at: new Date().toISOString(),
    };
  }

  function buildDraftForSave() {
    return {
      ...draft,
      immediate_corrective_actions: correctiveActionRowsToText(correctiveActionRows),
      reference_documents: correctiveActionRowsToText(referenceDocumentRows),
      investigation_team_members: normaliseTeamMembers(investigationTeamRows).filter(
        (row) => row.name || row.company || row.position || row.role
      ),
    };
  }

  async function createAINM() {
    if (!requireCreatePermission("Creating AINMs")) return;

    if (!newAinmType) {
      setMessage("Select AINM type before creating the record.");
      return;
    }
    if (!newRecord.ainm_number.trim() || !newRecord.title.trim()) {
      setMessage("AINM No. and title are required.");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("hse_ainm_records")
      .insert([{ ...buildPayload(newRecord), created_at: new Date().toISOString() }])
      .select("*")
      .single();
    setSaving(false);
    if (error) {
      setMessage(`Create AINM failed: ${error.message}`);
      return;
    }
    setMessage(`Created ${newRecord.ainm_number}.`);
    setNewAinmType("");
    setNewRecord({ ...emptyRecord, ainm_number: "" });
    setSelectedId((data as AINMRecord).id);
    setActiveView("register");
    await loadData();
  }

  async function getNextExternalNumber() {
    const { data, error } = await supabase.rpc("next_hse_external_ainm_number");
    if (!error && data) return String(data);
    return getNextExternalAinmNumber(externalRecords);
  }

  async function createExternalAINM() {
    if (!requireCreatePermission("Creating external AINMs")) return;

    const nextNumber = newExternalRecord.external_ainm_number.trim() || await getNextExternalNumber();
    if (!nextNumber || !newExternalRecord.supplier_name?.trim() || !newExternalRecord.summary?.trim()) {
      setMessage("External AINM number, external party name, and summary are required.");
      return;
    }

    setSaving(true);
    const { data, error } = await supabase
      .from("hse_external_ainm_records")
      .insert([{ ...buildExternalPayload({ ...newExternalRecord, external_ainm_number: nextNumber }), created_at: new Date().toISOString() }])
      .select("*")
      .single();
    setSaving(false);

    if (error) {
      setMessage(`Create External AINM failed: ${error.message}. Run scripts/sql/hse_external_ainm.sql if this is the first external record.`);
      return;
    }

    const created = data as ExternalAINMRecord;
    setMessage(`Created external AINM ${created.external_ainm_number}.`);
    setSelectedExternalId(created.id);
    setNewExternalRecord({ ...emptyExternalRecord, external_ainm_number: getNextExternalAinmNumber([...externalRecords, created]) });
    await loadData();
  }

  async function saveDraft() {
    if (!selectedId) return;
    if (!requireEditPermission("Saving AINMs")) return;

    const draftForSave = buildDraftForSave();
    setSaving(true);
    const { error } = await supabase.from("hse_ainm_records").update(buildPayload(draftForSave)).eq("id", selectedId);
    setSaving(false);
    if (error) {
      const needsSql = error.message.toLowerCase().includes("investigation_team_members");
      setMessage(
        needsSql
          ? "Save failed: Supabase is missing the investigation_team_members column. Run the AINM SQL update, then save again. Your current on-screen data has not been reloaded."
          : `Save failed: ${error.message}. Your current on-screen data has not been reloaded.`
      );
      return;
    }
    setDraft(draftForSave);
    setMessage(`Saved ${draftForSave.ainm_number}.`);
    await loadData();
  }

  async function saveExternalAINM() {
    if (!selectedExternalId) return;
    if (!requireEditPermission("Saving external AINMs")) return;

    setSaving(true);
    const { error } = await supabase
      .from("hse_external_ainm_records")
      .update(buildExternalPayload(externalDraft))
      .eq("id", selectedExternalId);
    setSaving(false);

    if (error) {
      setMessage(`Save External AINM failed: ${error.message}`);
      return;
    }

    setMessage(`Saved external AINM ${externalDraft.external_ainm_number}.`);
    await loadData();
  }

  async function deleteRecord(record: AINMRecord) {
    if (!requireEditPermission("Deleting AINMs")) return;

    if (!window.confirm(`Delete ${record.ainm_number} and all linked AINM action/evidence rows?`)) return;
    const { error } = await supabase.from("hse_ainm_records").delete().eq("id", record.id);
    if (error) {
      setMessage(`Delete failed: ${error.message}`);
      return;
    }
    setSelectedId("");
    setMessage(`Deleted ${record.ainm_number}.`);
    await loadData();
  }

  async function deleteExternalRecord(record: ExternalAINMRecord) {
    if (!requireEditPermission("Deleting external AINMs")) return;

    if (!window.confirm(`Delete external AINM ${record.external_ainm_number}?`)) return;
    const files = externalEvidence.filter((file) => file.external_ainm_id === record.id);
    if (files.length) await supabase.storage.from(evidenceBucket).remove(files.map((file) => file.file_path));
    const { error } = await supabase.from("hse_external_ainm_records").delete().eq("id", record.id);
    if (error) {
      setMessage(`Delete External AINM failed: ${error.message}`);
      return;
    }
    setSelectedExternalId("");
    setMessage(`Deleted external AINM ${record.external_ainm_number}.`);
    await loadData();
  }

  function previewTrackerSheet(workbook: XLSX.WorkBook, sheetName: string) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      setImportPreview([]);
      setMessage(`Could not find tracker sheet ${sheetName}.`);
      return;
    }

    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "" });
    const groups: ImportGroup[] = [];
    let active: ImportGroup | null = null;

    rows.forEach((row) => {
      const first = clean(row[0]);
      const parsedHeader = first ? parseAinmHeader(first) : null;
      if (parsedHeader) {
        active = { ...parsedHeader, project: "", source_year: null, actions: [] };
        groups.push(active);
        return;
      }

      const action = clean(row[3]);
      const ainmNumber = clean(row[2]) || active?.ainm_number || "";
      if (!active || !action || !ainmNumber) return;

      const item: ImportedAction = {
        tracker_no: clean(row[0]),
        project: clean(row[1]),
        ainm_number: ainmNumber.toUpperCase(),
        action,
        assigned: clean(row[4]),
        date_raised: dateInputValue(row[5]),
        date_closed: row[6] instanceof Date ? dateInputValue(row[6]) : clean(row[6]),
        status: clean(row[7]),
        comments: clean(row[8]),
      };
      if (!active.project && item.project) active.project = item.project;
      active.actions.push(item);
    });

    const sourceYear = parseSheetYear(sheetName, groups);
    const nextGroups = groups.map((group) => ({ ...group, source_year: sourceYear || parseSheetYear(sheetName, [group]) }));
    setImportPreview(nextGroups);
    setMessage(
      `Parsed ${nextGroups.length} AINM group${nextGroups.length === 1 ? "" : "s"} from ${sheetName}.`
    );
  }

  async function handleTrackerUpload(event: ChangeEvent<HTMLInputElement>) {
    if (!requireCreatePermission("Importing AINMs")) {
      event.target.value = "";
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    const sheets = workbook.SheetNames.filter((name) => workbook.Sheets[name]);
    const preferredSheet =
      sheets.find((name) => name.trim() === "2026") ||
      [...sheets].reverse().find((name) => /^\d{4}$/.test(name.trim())) ||
      sheets[0] ||
      "";

    setImportWorkbook(workbook);
    setImportSheets(sheets);
    setSelectedImportSheet(preferredSheet);
    if (preferredSheet) previewTrackerSheet(workbook, preferredSheet);
    else {
      setImportPreview([]);
      setMessage("No worksheets found in the uploaded AINM tracker.");
    }
    event.target.value = "";
  }

  function handleImportSheetChange(sheetName: string) {
    setSelectedImportSheet(sheetName);
    if (importWorkbook && sheetName) previewTrackerSheet(importWorkbook, sheetName);
  }

  async function importTrackerPreview() {
    if (!requireCreatePermission("Importing AINMs")) return;

    if (!importPreview.length) return;
    setImporting(true);
    const existing = new Set(records.map((record) => record.ainm_number.toLowerCase()));
    let created = 0;
    let skipped = 0;

    for (const group of importPreview) {
      if (existing.has(group.ainm_number.toLowerCase())) {
        skipped += 1;
        continue;
      }

      const { data, error } = await supabase
        .from("hse_ainm_records")
        .insert([
          {
            ainm_number: group.ainm_number,
            title: group.title,
            project: group.project || null,
            event_date: group.event_date || group.actions[0]?.date_raised || null,
            event_classification: group.ainm_number.startsWith("IR")
              ? "Equipment Damage"
              : group.ainm_number.startsWith("AR")
              ? "First Aid Case"
              : "Near Miss",
            notification_status: "Complete",
            part1_status: "Complete",
            part2_status: "Complete",
            overall_status: group.actions.every((item) => item.status.toLowerCase().includes("closed")) ? "Closed" : "Open",
            source_import_year: group.source_year,
          },
        ])
        .select("id")
        .single();

      if (error || !data?.id) {
        skipped += 1;
        continue;
      }

      created += 1;
      existing.add(group.ainm_number.toLowerCase());
      if (group.actions.length) {
        await supabase.from("hse_ainm_actions").insert(
          group.actions.map((item) => ({
            ainm_id: data.id,
            tracker_no: item.tracker_no || null,
            project: item.project || null,
            ainm_number: item.ainm_number || group.ainm_number,
            action: item.action || null,
            assigned: item.assigned || null,
            date_raised: item.date_raised || null,
            date_closed: item.date_closed || null,
            status: item.status || null,
            comments: item.comments || null,
          }))
        );
      }
    }

    setImporting(false);
    setImportPreview([]);
    if (importWorkbook && selectedImportSheet) previewTrackerSheet(importWorkbook, selectedImportSheet);
    setMessage(`AINM import complete. Created ${created}; skipped ${skipped} existing/problem row${skipped === 1 ? "" : "s"}.`);
    await loadData();
  }

  async function uploadEvidence(event: ChangeEvent<HTMLInputElement>, stageOverride?: string) {
    if (!requireEditPermission("Uploading AINM evidence")) {
      event.target.value = "";
      return;
    }

    if (!selectedId) return;
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setUploading(true);
    const stage = stageOverride || evidenceStage;

    for (const file of files) {
      const path = `HSE/AINM/${selectedId}/${Date.now()}-${sanitizeFileName(file.name)}`;
      const upload = await supabase.storage.from(evidenceBucket).upload(path, file, { upsert: false });
      if (upload.error) {
        setMessage(`Evidence upload failed: ${upload.error.message}`);
        continue;
      }
      await supabase.from("hse_ainm_evidence").insert([
        {
          ainm_id: selectedId,
          stage,
          file_name: file.name,
          file_path: path,
          file_size: file.size,
          content_type: file.type || null,
        },
      ]);
    }

    setUploading(false);
    setMessage(`Uploaded ${files.length} evidence file${files.length === 1 ? "" : "s"}.`);
    event.target.value = "";
    await loadData();
  }

  async function uploadExternalEvidence(event: ChangeEvent<HTMLInputElement>) {
    if (!requireEditPermission("Uploading external AINM evidence")) {
      event.target.value = "";
      return;
    }

    if (!selectedExternalId) return;
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setUploading(true);

    for (const file of files) {
      const path = `HSE/AINM/External/${selectedExternalId}/${Date.now()}-${sanitizeFileName(file.name)}`;
      const upload = await supabase.storage.from(evidenceBucket).upload(path, file, { upsert: false });
      if (upload.error) {
        setMessage(`External AINM upload failed: ${upload.error.message}`);
        continue;
      }
      await supabase.from("hse_external_ainm_evidence").insert([
        {
          external_ainm_id: selectedExternalId,
          file_name: file.name,
          file_path: path,
          file_size: file.size,
          content_type: file.type || null,
        },
      ]);
    }

    setUploading(false);
    event.target.value = "";
    setMessage(`Uploaded ${files.length} external AINM document${files.length === 1 ? "" : "s"}.`);
    await loadData();
  }

  async function openEvidence(file: AINMEvidence) {
    const { data, error } = await supabase.storage.from(evidenceBucket).createSignedUrl(file.file_path, 3600);
    if (error || !data?.signedUrl) {
      setMessage(`Could not open ${file.file_name}.`);
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function openExternalEvidence(file: ExternalAINMEvidence) {
    const { data, error } = await supabase.storage.from(evidenceBucket).createSignedUrl(file.file_path, 3600);
    if (error || !data?.signedUrl) {
      setMessage(`Could not open ${file.file_name}.`);
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function openGeneratedReport(report: AINMGeneratedDocument) {
    if (!report.file_path) {
      setMessage("This generated report does not have a stored file path.");
      return;
    }
    const { data, error } = await supabase.storage.from(evidenceBucket).createSignedUrl(report.file_path, 3600);
    if (error || !data?.signedUrl) {
      setMessage(`Could not open ${report.file_name || "compiled PDF report"}.`);
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function deleteEvidence(file: AINMEvidence) {
    if (!requireEditPermission("Deleting AINM evidence")) return;

    if (!window.confirm(`Delete ${file.file_name}?`)) return;
    await supabase.storage.from(evidenceBucket).remove([file.file_path]);
    const { error } = await supabase.from("hse_ainm_evidence").delete().eq("id", file.id);
    if (error) {
      setMessage(`Evidence delete failed: ${error.message}`);
      return;
    }
    setMessage(`Deleted ${file.file_name}.`);
    await loadData();
  }

  async function deleteExternalEvidence(file: ExternalAINMEvidence) {
    if (!requireEditPermission("Deleting external AINM evidence")) return;

    if (!window.confirm(`Delete ${file.file_name}?`)) return;
    await supabase.storage.from(evidenceBucket).remove([file.file_path]);
    const { error } = await supabase.from("hse_external_ainm_evidence").delete().eq("id", file.id);
    if (error) {
      setMessage(`External evidence delete failed: ${error.message}`);
      return;
    }
    setMessage(`Deleted ${file.file_name}.`);
    await loadData();
  }

  function selectPart1Reviewer(personIdOrName: string) {
    if (personIdOrName === "__add_new") {
      setShowAddReviewer(true);
      return;
    }

    const person = peopleOptions.find((item) => item.id === personIdOrName || item.name === personIdOrName);
    if (!person) {
      updateDraft("part1_reviewer_name", personIdOrName);
      return;
    }

    updateDraft("part1_reviewer_name", person.name);
    updateDraft("part1_reviewer_position", person.role || "");
    setShowAddReviewer(false);
  }

  async function addReviewerToPeople() {
    if (!requireEditPermission("Adding AINM reviewers")) return;

    const name = newReviewerName.trim();
    if (!name) {
      setMessage("Reviewer name is required before adding a new person.");
      return;
    }

    const existing = peopleOptions.find((person) => person.name.trim().toLowerCase() === name.toLowerCase());
    if (existing) {
      selectPart1Reviewer(existing.id);
      setNewReviewerName("");
      setNewReviewerRole("");
      setShowAddReviewer(false);
      return;
    }

    const { data, error } = await supabase
      .from("people")
      .insert([{ name, email: null, role: newReviewerRole.trim() || null, department: "HSEQ", active: true }])
      .select("id,name,email,role,department,active")
      .single();

    if (error || !data) {
      setMessage(`Could not add reviewer to People Management: ${error?.message || "Unknown error"}`);
      return;
    }

    const person = data as PeopleOption;
    setPeopleOptions((current) => [...current, person].sort((a, b) => a.name.localeCompare(b.name)));
    updateDraft("part1_reviewer_name", person.name);
    updateDraft("part1_reviewer_position", person.role || "");
    setNewReviewerName("");
    setNewReviewerRole("");
    setShowAddReviewer(false);
    setMessage(`${person.name} added to People Management and selected as reviewer.`);
  }

  function wordRun(text: string, options?: { bold?: boolean; color?: string; size?: number; italics?: boolean }) {
    return new TextRun({
      text: clean(text),
      font: "Azo Sans",
      bold: options?.bold,
      italics: options?.italics,
      color: options?.color || "000000",
      size: options?.size || 18,
    });
  }

  const wordBorder = { style: BorderStyle.SINGLE, color: "D0D0CE", size: 2 };
  const wordBorders = { top: wordBorder, bottom: wordBorder, left: wordBorder, right: wordBorder, insideHorizontal: wordBorder, insideVertical: wordBorder };
  const wordHeaderBorder = { style: BorderStyle.SINGLE, color: "005670", size: 2 };
  const wordHeaderBorders = {
    top: wordHeaderBorder,
    bottom: wordHeaderBorder,
    left: wordHeaderBorder,
    right: wordHeaderBorder,
    insideHorizontal: wordHeaderBorder,
    insideVertical: wordHeaderBorder,
  };

  function wordCell(text: string, options?: { header?: boolean; width?: number; label?: boolean; align?: "center" | "left" }) {
    return new TableCell({
      width: options?.width ? { size: options.width, type: WidthType.DXA } : undefined,
      verticalAlign: VerticalAlign.CENTER,
      shading: options?.header || options?.label
        ? { type: ShadingType.CLEAR, fill: "ECECE7", color: "auto" }
        : undefined,
      margins: { top: 110, bottom: 110, left: 120, right: 120 },
      children: [
        new Paragraph({
          alignment: options?.align === "center" ? AlignmentType.CENTER : AlignmentType.LEFT,
          children: [wordRun(text, { bold: options?.header || options?.label, color: "000000" })],
        }),
      ],
    });
  }

  function wordTable(headers: string[], rows: string[][], widths: number[], labelColumns: number[] = []) {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      columnWidths: widths,
      borders: wordBorders,
      rows: [
        new TableRow({ tableHeader: true, children: headers.map((header, index) => wordCell(header, { header: true, width: widths[index] })) }),
        ...(rows.length ? rows : [headers.map(() => "")]).map((row) =>
          new TableRow({
            cantSplit: true,
            children: row.map((cell, index) => wordCell(cell, { width: widths[index], label: labelColumns.includes(index) })),
          })
        ),
      ],
    });
  }

  function wordBodyTable(
    headers: string[],
    rows: string[][],
    widths: number[],
    labelColumns: number[] = [],
    options?: { repeatHeader?: boolean; padEmptyRows?: boolean }
  ) {
    const repeatHeader = options?.repeatHeader ?? true;
    const padEmptyRows = options?.padEmptyRows ?? true;
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      columnWidths: widths,
      borders: wordBorders,
      rows: [
        ...(headers.some((header) => header.trim())
          ? [
              new TableRow({
                tableHeader: repeatHeader,
                children: headers.map((header, index) =>
                  wordCell(header, { width: widths[index], label: true })
                ),
              }),
            ]
          : []),
        ...(rows.length ? rows : padEmptyRows ? [headers.map(() => "")] : []).map((row) =>
          new TableRow({
            cantSplit: true,
            children: row.map((cell, index) => wordCell(cell, { width: widths[index], label: labelColumns.includes(index) })),
          })
        ),
      ],
    });
  }

  function wordSectionHeader(title: string) {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      columnWidths: [9360],
      borders: wordHeaderBorders,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 9360, type: WidthType.DXA },
              verticalAlign: VerticalAlign.CENTER,
              shading: { type: ShadingType.CLEAR, fill: "005670", color: "auto" },
              borders: wordHeaderBorders,
              margins: { top: 120, bottom: 120, left: 140, right: 140 },
              children: [new Paragraph({ children: [wordRun(title, { bold: true, color: "FFFFFF", size: 20 })] })],
            }),
          ],
        }),
      ],
    });
  }

  function wordSpacer(size = 90) {
    return new Paragraph({ spacing: { before: size, after: size }, children: [wordRun("", { size: 2 })] });
  }

  function evidenceWordTable(evidenceWithUrls: { file: AINMEvidence; url: string }[]) {
    const widths = [4200, 1100, 2300, 1760];
    const rows = evidenceWithUrls.length ? evidenceWithUrls : [{ file: null as unknown as AINMEvidence, url: "" }];

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      columnWidths: widths,
      borders: wordBorders,
      rows: [
        new TableRow({
          tableHeader: true,
          children: ["File", "Size", "Uploaded", "Evidence Link"].map((header, index) =>
            wordCell(header, { header: true, width: widths[index] })
          ),
        }),
        ...rows.map(({ file, url }, rowIndex) =>
          new TableRow({
            cantSplit: true,
            children: [
              wordCell(file?.file_name || "", { width: widths[0] }),
              wordCell(file ? formatFileSize(file.file_size) : "", { width: widths[1] }),
              wordCell(file ? displayDateTime(file.uploaded_at) : "", { width: widths[2] }),
              new TableCell({
                width: { size: widths[3], type: WidthType.DXA },
                verticalAlign: VerticalAlign.CENTER,
                margins: { top: 110, bottom: 110, left: 120, right: 120 },
                children: [
                  new Paragraph({
                    children: url
                      ? [
                          new ExternalHyperlink({
                            link: url,
                            children: [wordRun("Open evidence", { bold: true, color: "1D4ED8" })],
                          }),
                        ]
                      : [wordRun("")],
                  }),
                ],
              }),
            ],
          })
        ),
      ],
    });
  }

  function part1AttachmentRows(record: AINMRecord) {
    const selected = record.attachments_checklist || [];
    const rows: string[][] = [];
    const options = attachmentChecklistOptions.filter(Boolean);
    for (let index = 0; index < options.length; index += 3) {
      const items = [options[index], options[index + 1], options[index + 2]];
      rows.push(items.flatMap((item) => (item ? [item, checkbox(attachmentIsSelected(selected, item))] : ["", ""])));
    }
    const otherText = attachmentOtherText(selected);
    if (otherText) rows.push(["Other details", otherText, "", "", "", ""]);
    return rows;
  }

  function part1AttachmentTable(record: AINMRecord) {
    const widths = [2620, 500, 2620, 500, 2620, 500];
    const rows = part1AttachmentRows(record).filter((row) => row.some((cell) => cell.trim()));

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      columnWidths: widths,
      borders: wordBorders,
      rows: [
        new TableRow({
          tableHeader: false,
          children: [
            new TableCell({
              columnSpan: 6,
              width: { size: 9360, type: WidthType.DXA },
              verticalAlign: VerticalAlign.CENTER,
              shading: { type: ShadingType.CLEAR, fill: "005670", color: "auto" },
              borders: wordHeaderBorders,
              margins: { top: 120, bottom: 120, left: 140, right: 140 },
              children: [
                new Paragraph({
                  children: [
                    wordRun("Additional information and attachments included within this report (please check box and attach)", {
                      bold: true,
                      color: "FFFFFF",
                      size: 20,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
        ...rows.map((row) =>
          new TableRow({
            cantSplit: true,
            children: row.map((cell, index) =>
              wordCell(cell, {
                width: widths[index],
                align: index % 2 === 1 ? "center" : "left",
              })
            ),
          })
        ),
      ],
    });
  }

  function immediateActionRows(record: AINMRecord) {
    const lines = correctiveActionRowsFromText(record.immediate_corrective_actions).filter(Boolean);
    return lines.map((line, index) => [String(index + 1), line]);
  }

  function immediateActionTable(record: AINMRecord) {
    return wordBodyTable(
      ["Action No.", "Immediate Containment Action"],
      immediateActionRows(record),
      [900, 8460],
      [0],
      { padEmptyRows: false }
    );
  }

  function part2TeamTable(record: AINMRecord) {
    const rows = normaliseTeamMembers(record.investigation_team_members).filter((row) => row.name || row.company || row.position || row.role);
    return wordBodyTable(
      ["Name", "Company", "Position", "Investigation Role"],
      rows.map((row) => [row.name, row.company, row.position, row.role]),
      [2340, 2340, 2340, 2340],
      [],
      { padEmptyRows: false }
    );
  }

  function part2ReferenceTable(record: AINMRecord) {
    const lines = splitLines(record.reference_documents);
    const rows = lines.length
      ? lines.reduce<string[][]>((acc, line, index) => {
          if (index % 2 === 0) acc.push([line, ""]);
          else acc[acc.length - 1][1] = line;
          return acc;
        }, [])
      : [];
    return wordBodyTable(["", ""], rows, [4680, 4680], [], { repeatHeader: false, padEmptyRows: false });
  }

  function part2RecommendationRows() {
    const trackerRows = selectedActions.map((action, index) => [
      action.tracker_no || String(index + 1),
      action.action || "",
      action.comments || "",
      action.assigned || "",
      displayDate(action.date_raised),
    ]);
    const centralRows = selectedCentralActions.map((action, index) => [
      action.action_number || String(trackerRows.length + index + 1),
      action.title || "",
      action.description || "",
      action.owner || "",
      displayDate(action.due_date),
    ]);
    return [...trackerRows, ...centralRows];
  }

  function part2RecommendationsTable() {
    return wordBodyTable(
      ["No.", "Action Title", "Description", "Accountable Person (include position)", "Target Date"],
      part2RecommendationRows(),
      [650, 2100, 2550, 2700, 1360],
      [0],
      { padEmptyRows: false }
    );
  }

  function part2SignoffTable(record: AINMRecord) {
    const groups = [
      ["Location/Senior Representative", record.signoff_location_name || "", "", record.signoff_location_position || "", displayDate(record.signoff_location_date)],
      ["HSEQ Representative", record.signoff_hseq_name || "", "", record.signoff_hseq_position || "", displayDate(record.signoff_hseq_date)],
      ["Work/Project Manager (as applicable)", record.signoff_project_manager_name || "", "", record.signoff_project_manager_position || "", displayDate(record.signoff_project_manager_date)],
      ["Senior Management Team Representative (as applicable)", record.signoff_smt_name || "", "", record.signoff_smt_position || "", displayDate(record.signoff_smt_date)],
    ];

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      columnWidths: [2300, 3100, 2300, 1660],
      borders: wordBorders,
      rows: groups.flatMap(([role, name, signature, position, date]) => [
        new TableRow({
          children: [
            new TableCell({
              columnSpan: 4,
              shading: { type: ShadingType.CLEAR, fill: "E5E7EB", color: "auto" },
              margins: { top: 110, bottom: 110, left: 120, right: 120 },
              children: [new Paragraph({ children: [wordRun(role, { size: 18 })] })],
            }),
          ],
        }),
        new TableRow({
          children: ["Name", "Signature (or confirmation acceptance)", "Position", "Date"].map((header, index) =>
            wordCell(header, { width: [2300, 3100, 2300, 1660][index], label: true, align: "left" })
          ),
        }),
        new TableRow({
          children: [name, signature, position, date].map((cell, index) =>
            wordCell(cell, { width: [2300, 3100, 2300, 1660][index] })
          ),
        }),
      ]),
    });
  }

  function wordHeader(title: string, record: AINMRecord, logoData: string) {
    const logo =
      logoData && logoData.startsWith("data:image/")
        ? new ImageRun({ type: "png", data: dataUrlToBytes(logoData), transformation: { width: 112, height: 56 } })
        : wordRun("ENSHORE", { bold: true, size: 24 });

    return new Header({
      children: [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          layout: TableLayoutType.FIXED,
          columnWidths: [2400, 4560, 2400],
          borders: {
            top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [logo] })] }),
                new TableCell({
                  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [wordRun(title, { bold: true, size: 24 })] })],
                }),
                new TableCell({
                  children: [
                    new Paragraph({ alignment: AlignmentType.RIGHT, children: [wordRun(record.ainm_number, { color: "53565A" })] }),
                    new Paragraph({ alignment: AlignmentType.RIGHT, children: [wordRun(displayDate(record.event_date), { color: "53565A" })] }),
                  ],
                }),
              ],
            }),
          ],
        }),
        new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, color: "D0D0CE", size: 5 } } }),
      ],
    });
  }

  function wordFooter() {
    return new Footer({
      children: [
        new Paragraph({ border: { top: { style: BorderStyle.SINGLE, color: "005670", size: 4 } } }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [wordRun("Page ", { color: "53565A", size: 16 }), new SimpleField("PAGE"), wordRun(" of ", { color: "53565A", size: 16 }), new SimpleField("NUMPAGES")],
        }),
      ],
    });
  }

  function checkbox(value: boolean) {
    return value ? "[X]" : "[ ]";
  }

  function classificationRows(record: AINMRecord) {
    const values = eventClassifications.map((item) => `${checkbox(record.event_classification === item)} ${item}`);
    return [
      [values[0], values[1], values[2]],
      [values[3], values[4], values[5]],
      [values[6], values[7], values[8]],
      [values[9], values[10], values[11]],
      [values[12], "", ""],
    ];
  }

  function classificationTable(record: AINMRecord) {
    return wordBodyTable(["", "", ""], classificationRows(record), [3120, 3120, 3120], [], {
      repeatHeader: false,
      padEmptyRows: false,
    });
  }

  async function generateWord(stage: "notification" | "part1" | "part2", record: AINMRecord) {
    setGeneratingStage(stage);
    try {
      const logoData = await getLogoDataUrl();
      const notificationEvidenceFiles = selectedEvidence.filter((file) => file.stage === "Notification");
      const notificationEvidenceWithUrls = await Promise.all(
        notificationEvidenceFiles.map(async (file) => ({
          file,
          url: await createSignedEvidenceUrl(file.file_path),
        }))
      );
      const part1EvidenceFiles = selectedEvidence.filter((file) => file.stage === "Part 1");
      const part1EvidenceWithUrls = await Promise.all(
        part1EvidenceFiles.map(async (file) => ({
          file,
          url: await createSignedEvidenceUrl(file.file_path),
        }))
      );
      const part2EvidenceFiles = selectedEvidence.filter((file) => file.stage === "Part 2");
      const part2EvidenceWithUrls = await Promise.all(
        part2EvidenceFiles.map(async (file) => ({
          file,
          url: await createSignedEvidenceUrl(file.file_path),
        }))
      );
      const title =
        stage === "notification"
          ? "ENS-HSEQ-FRM-027 Initial AINM Notification"
          : stage === "part1"
          ? "ENS-HSEQ-FRM-028 AINM Part 1 Report"
          : "ENS-HSEQ-FRM-029 AINM Part 2 Report";

      const children: (Paragraph | Table)[] = [];
      children.push(
        new Paragraph({ spacing: { after: 150 }, children: [wordRun(`${record.ainm_number} - ${record.title}`, { bold: true, size: 30 })] })
      );

      if (stage === "notification") {
        children.push(
          wordTable(["Field", "Details", "Field", "Details"], [
            ["Date of Event", displayDate(record.event_date), "Time of Event (24h)", record.event_time || ""],
            ["Location/Site", record.location_site || "", "AINM No.", record.ainm_number],
          ], [1800, 2880, 2200, 2480], [0, 2]),
          wordSpacer(),
          wordSectionHeader("Event Classification"),
          classificationTable(record),
          new Paragraph({
            spacing: { before: 120, after: 80 },
            children: [wordRun("Please avoid names - use job title or term 'IP' (Injured Person).", { italics: true, color: "53565A", size: 17 })],
          }),
          wordSectionHeader("Brief details of the event"),
          wordBodyTable([""], [[record.brief_event_details || ""]], [9360], [], { repeatHeader: false, padEmptyRows: false }),
          wordSpacer(),
          wordSectionHeader("Brief details of the injury/release/damage received"),
          wordBodyTable([""], [[record.injury_release_damage_details || ""]], [9360], [], { repeatHeader: false, padEmptyRows: false }),
          wordSpacer(),
          wordSectionHeader("Brief details of the initial response"),
          wordBodyTable(["", ""], [
            ["Casualty Management:\n(If there is an injured person, what care arrangements are in place/planned?)", record.casualty_management || ""],
            ["Site/Location Management:\n(If area is unsafe, what arrangements are in place/planned to rectify?)", record.site_management || ""],
            ["Cause Identification:\n(What is the initial cause(s) deemed likely to have resulted in the event?)", record.initial_cause || ""],
            ["Add additional information:\n(Document references and photographs as applicable)", record.additional_information || ""],
          ], [3900, 5460], [0], { repeatHeader: false, padEmptyRows: false }),
          wordSpacer(),
          wordSectionHeader("Notification Evidence"),
          evidenceWordTable(notificationEvidenceWithUrls),
          new Paragraph({
            spacing: { before: 70 },
            children: [wordRun("Evidence links are secure signed URLs and may expire after generation.", { italics: true, color: "53565A", size: 16 })],
          })
        );
      }

      if (stage === "part1") {
        children.push(
          wordTable(["Field", "Details", "Field", "Details"], [
            ["Date of Event", displayDate(record.event_date), "Time of Event (24h)", record.event_time || ""],
            ["Location/Site", record.location_site || "", "AINM Report Ref", record.ainm_number],
            ["Project/Work Title", record.project || "", "Company in Control", record.company_in_control || ""],
          ], [1800, 2880, 2200, 2480], [0, 2]),
          wordSpacer(),
          wordSectionHeader("Event Classification"),
          classificationTable(record),
          wordSpacer(),
          wordSectionHeader("Event Details"),
          wordBodyTable([""], [[record.brief_event_details || ""]], [9360], [], { repeatHeader: false, padEmptyRows: false }),
          wordSpacer(),
          wordSectionHeader("If environmental release, please specify type and quantity:"),
          wordBodyTable(["Field", "Details"], [
            ["Type", record.environmental_release_type || ""],
            ["Quantity", record.environmental_release_quantity || ""],
          ], [2600, 6760], [0]),
          wordSpacer(),
          wordSectionHeader("Immediate containment actions implemented: (steps taken to make condition(s) safe)"),
          immediateActionTable(record),
          wordSpacer(),
          wordSectionHeader("Event investigation and root cause analysis"),
          wordBodyTable(["", ""], [
            ["People - what did the people do that was incorrect? Why did they do this?", record.root_cause_people || ""],
            ["Equipment - what was defective about the equipment and/or materials?", record.root_cause_equipment || ""],
            ["Environment/Conditions - what was defective about the environment and/or conditions?", record.root_cause_environment || ""],
            ["Process - what was defective about the procedure and systems? Why were they deficient?", record.root_cause_process || ""],
          ], [3600, 5760], [0], { repeatHeader: false, padEmptyRows: false }),
          wordSpacer(),
          part1AttachmentTable(record),
          wordSpacer(),
          wordSectionHeader("Additional Comments"),
          wordBodyTable([""], [[record.part1_additional_comments || ""]], [9360], [], { repeatHeader: false, padEmptyRows: false }),
          wordSpacer(),
          wordSectionHeader("Part 1 Evidence"),
          evidenceWordTable(part1EvidenceWithUrls),
          new Paragraph({
            spacing: { before: 70 },
            children: [wordRun("Evidence links are secure signed URLs and may expire after generation.", { italics: true, color: "53565A", size: 16 })],
          }),
          wordSpacer(),
          wordSectionHeader("Reviewed and accepted by"),
          wordBodyTable(["Field", "Details"], [
            ["Name", record.part1_reviewer_name || ""],
            ["Position", record.part1_reviewer_position || ""],
          ], [3000, 6360], [0])
        );
      }

      if (stage === "part2") {
        children.push(
          wordTable(["Field", "Details", "Field", "Details"], [
            ["Project/Work Title", record.project || "", "AINM Ref", record.ainm_number],
            ["Location/Site", record.location_site || "", "Date of Event", displayDate(record.event_date)],
            ["Time of Event (24h)", record.event_time || "", "Classification", record.event_classification || ""],
          ], [1900, 3000, 1700, 2760], [0, 2]),
          wordSpacer(),
          wordSectionHeader("Event Classification"),
          classificationTable(record),
          wordSpacer(),
          wordSectionHeader("Investigation Team Members"),
          part2TeamTable(record),
          wordSpacer(),
          wordSectionHeader("Investigation Findings"),
          wordBodyTable(["", ""], [
            ["People - what did the people do that was incorrect? (Identify incorrect actions)", record.investigation_findings_people || record.root_cause_people || ""],
            ["Equipment - what was defective about the equipment and/or materials? (Identify defective items)", record.investigation_findings_equipment || record.root_cause_equipment || ""],
            ["Environment/Conditions - what was defective about the environment and/or conditions?", record.investigation_findings_environment || record.root_cause_environment || ""],
            ["Process - what was defective about the procedure and systems? (Identify defective processes)", record.investigation_findings_process || record.root_cause_process || ""],
          ], [3900, 5460], [0], { repeatHeader: false, padEmptyRows: false }),
          wordSpacer(),
          wordSectionHeader("Reference documentation used as part of the investigation (list document title and number)"),
          part2ReferenceTable(record),
          wordSpacer(),
          wordSectionHeader("Corrective Actions/Recommendations (to prevent reoccurrence and similar events)"),
          part2RecommendationsTable(),
          wordSectionHeader("Further comments (as applicable)"),
          wordBodyTable([""], [[record.part2_further_comments || ""]], [9360], [], { repeatHeader: false, padEmptyRows: false }),
          wordSpacer(),
          wordSectionHeader("Investigation Review and Sign-Off"),
          part2SignoffTable(record),
          wordSpacer(),
          wordSectionHeader("Part 2 Evidence"),
          evidenceWordTable(part2EvidenceWithUrls),
          new Paragraph({
            spacing: { before: 70 },
            children: [wordRun("Evidence links are secure signed URLs and may expire after generation.", { italics: true, color: "53565A", size: 16 })],
          })
        );
      }

      const doc = new WordDocument({
        styles: { default: { document: { run: { font: "Azo Sans", size: 18, color: "000000" } } } },
        sections: [
          {
            headers: { default: wordHeader(title, record, logoData) },
            footers: { default: wordFooter() },
            properties: { page: { margin: { top: 900, right: 720, bottom: 900, left: 720, header: 360, footer: 360 } } },
            children,
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = `${record.ainm_number}-${stage}.docx`;
      link.click();
      URL.revokeObjectURL(url);
      await supabase.from("hse_ainm_generated_documents").insert([
        { ainm_id: record.id, document_stage: stage, file_name: `${record.ainm_number}-${stage}.docx` },
      ]);
      setMessage(`Generated ${stage} Word report for ${record.ainm_number}.`);
      await loadData();
    } catch (error) {
      setMessage(`Word generation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setGeneratingStage("");
    }
  }

  function pdfLastY(doc: jsPDF, fallback: number) {
    return ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || fallback);
  }

  function pdfHeader(doc: jsPDF, title: string, record: AINMRecord, logoData: string) {
    if (logoData) {
      try {
        doc.addImage(logoData, "PNG", 12, 10, 40, 20);
      } catch {
        doc.setFont("helvetica", "bold");
        doc.text("ENSHORE", 12, 18);
      }
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(title, 105, 18, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(83, 86, 90);
    doc.text(record.ainm_number, 198, 14, { align: "right" });
    doc.text(displayDate(record.event_date), 198, 20, { align: "right" });
    doc.setDrawColor(0, 86, 112);
    doc.setLineWidth(0.6);
    doc.line(12, 30, 198, 30);
  }

  function pdfSection(doc: jsPDF, title: string, y: number) {
    doc.setFillColor(0, 86, 112);
    doc.roundedRect(12, y, 186, 8, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(title, 15, y + 5.4);
    return y + 11;
  }

  function pdfSubsection(doc: jsPDF, title: string, y: number) {
    doc.setFillColor(236, 236, 231);
    doc.setDrawColor(208, 208, 206);
    doc.roundedRect(12, y, 186, 7, 1.2, 1.2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(0, 86, 112);
    doc.text(title, 15, y + 4.8);
    return y + 9;
  }

  function pdfTable(doc: jsPDF, y: number, head: string[][], body: string[][], columnStyles?: Record<number, { cellWidth?: number; halign?: "left" | "center" | "right" }>) {
    autoTable(doc, {
      startY: y,
      head,
      body: body.length ? body : [head[0].map(() => "")],
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2, textColor: [0, 0, 0], lineColor: [208, 208, 206], lineWidth: 0.15 },
      headStyles: { fillColor: [236, 236, 231], textColor: [0, 0, 0], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [236, 236, 231] },
      margin: { left: 12, right: 12 },
      columnStyles,
    });
    return pdfLastY(doc, y) + 6;
  }

  function pdfFooter(doc: jsPDF) {
    const pages = doc.getNumberOfPages();
    for (let page = 1; page <= pages; page += 1) {
      doc.setPage(page);
      doc.setDrawColor(0, 86, 112);
      doc.line(12, 286, 198, 286);
      doc.setFontSize(8);
      doc.setTextColor(83, 86, 90);
      doc.text(`Page ${page} of ${pages}`, 198, 291, { align: "right" });
    }
  }

  async function generateCompiledPdf(record: AINMRecord) {
    if (!requireEditPermission("Generating saved AINM report packs")) return;

    setGeneratingStage("compiled-pdf");
    try {
      const logoData = await getLogoDataUrl();
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      pdfHeader(doc, "AINM Complete Report Pack", record, logoData);
      let y = 38;
      const addSubheading = (title: string) => {
        if (y > 260) {
          doc.addPage();
          pdfHeader(doc, "AINM Complete Report Pack", record, logoData);
          y = 38;
        }
        y = pdfSubsection(doc, title, y);
      };

      y = pdfSection(doc, "AINM Summary", y);
      y = pdfTable(doc, y, [["Field", "Details", "Field", "Details"]], [
        ["AINM Ref", record.ainm_number, "Title", record.title],
        ["Project", record.project || "", "Location/Site", record.location_site || ""],
        ["Date of Event", displayDate(record.event_date), "Time of Event", record.event_time || ""],
        ["Classification", record.event_classification || "", "Overall Status", record.overall_status],
      ], { 0: { cellWidth: 30 }, 2: { cellWidth: 30 } });

      y = pdfSection(doc, "Initial Notification", y);
      y = pdfTable(doc, y, [["Field", "Details"]], [
        ["Brief details of event", record.brief_event_details || ""],
        ["Injury / release / damage", record.injury_release_damage_details || ""],
        ["Casualty Management", record.casualty_management || ""],
        ["Site/Location Management", record.site_management || ""],
        ["Cause Identification", record.initial_cause || ""],
        ["Additional information", record.additional_information || ""],
      ], { 0: { cellWidth: 48 } });

      y = pdfSection(doc, "Part 1 Report", y);
      addSubheading("Event and Environmental Details");
      y = pdfTable(doc, y, [["Field", "Details"]], [
        ["Company in Control", record.company_in_control || ""],
        ["Environmental release type", record.environmental_release_type || ""],
        ["Environmental release quantity", record.environmental_release_quantity || ""],
      ], { 0: { cellWidth: 52 } });
      addSubheading("Immediate Containment Actions Implemented");
      y = pdfTable(doc, y, [["Action No.", "Immediate Containment Action"]], immediateActionRows(record), { 0: { cellWidth: 24, halign: "center" } });
      addSubheading("Event Investigation and Root Cause Analysis");
      y = pdfTable(doc, y, [["Root Cause Area", "Details"]], [
        ["People", record.root_cause_people || ""],
        ["Equipment", record.root_cause_equipment || ""],
        ["Environment/Conditions", record.root_cause_environment || ""],
        ["Process", record.root_cause_process || ""],
      ], { 0: { cellWidth: 50 } });

      if (y > 235) {
        doc.addPage();
        pdfHeader(doc, "AINM Complete Report Pack", record, logoData);
        y = 38;
      }

      y = pdfSection(doc, "Part 2 Investigation", y);
      addSubheading("Investigation Team Members");
      y = pdfTable(doc, y, [["Name", "Company", "Position", "Investigation Role"]], normaliseTeamMembers(record.investigation_team_members).map((row) => [row.name, row.company, row.position, row.role]));
      addSubheading("Investigation Findings");
      y = pdfTable(doc, y, [["Investigation Finding", "Details"]], [
        ["People", record.investigation_findings_people || record.root_cause_people || ""],
        ["Equipment", record.investigation_findings_equipment || record.root_cause_equipment || ""],
        ["Environment/Conditions", record.investigation_findings_environment || record.root_cause_environment || ""],
        ["Process", record.investigation_findings_process || record.root_cause_process || ""],
      ], { 0: { cellWidth: 50 } });
      addSubheading("Reference Documentation Used as Part of the Investigation");
      y = pdfTable(doc, y, [["No.", "Reference Document"]], splitLines(record.reference_documents).map((line, index) => [String(index + 1), line]), { 0: { cellWidth: 18, halign: "center" } });
      addSubheading("Corrective Actions / Recommendations");
      y = pdfTable(doc, y, [["No.", "Action Title", "Description", "Accountable Person", "Target Date"]], part2RecommendationRows(), {
        0: { cellWidth: 14, halign: "center" },
        1: { cellWidth: 40 },
        2: { cellWidth: 58 },
        3: { cellWidth: 46 },
        4: { cellWidth: 26 },
      });
      addSubheading("Investigation Review and Sign-Off");
      y = pdfTable(doc, y, [["Role", "Name", "Position", "Date"]], [
        ["Location/Senior Representative", record.signoff_location_name || "", record.signoff_location_position || "", displayDate(record.signoff_location_date)],
        ["HSEQ Representative", record.signoff_hseq_name || "", record.signoff_hseq_position || "", displayDate(record.signoff_hseq_date)],
        ["Work/Project Manager", record.signoff_project_manager_name || "", record.signoff_project_manager_position || "", displayDate(record.signoff_project_manager_date)],
        ["Senior Management Team Representative", record.signoff_smt_name || "", record.signoff_smt_position || "", displayDate(record.signoff_smt_date)],
      ], { 0: { cellWidth: 54 }, 3: { cellWidth: 28 } });
      addSubheading("Further Comments");
      y = pdfTable(doc, y, [["Further Comments"]], [[record.part2_further_comments || ""]]);

      if (y > 225) {
        doc.addPage();
        pdfHeader(doc, "AINM Complete Report Pack", record, logoData);
        y = 38;
      }

      y = pdfSection(doc, "Evidence Register", y);
      const evidenceWithUrls = await Promise.all(selectedEvidence.map(async (file) => ({
        file,
        url: await createSignedEvidenceUrl(file.file_path),
      })));
      autoTable(doc, {
        startY: y,
        head: [["Stage", "File", "Size", "Uploaded", "Link"]],
        body: evidenceWithUrls.length
          ? evidenceWithUrls.map(({ file }) => [file.stage, file.file_name, formatFileSize(file.file_size), displayDateTime(file.uploaded_at), ""])
          : [["", "", "", "", ""]],
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2, textColor: [0, 0, 0], lineColor: [208, 208, 206], lineWidth: 0.15 },
        headStyles: { fillColor: [236, 236, 231], textColor: [0, 0, 0], fontStyle: "bold" },
        margin: { left: 12, right: 12 },
        columnStyles: { 0: { cellWidth: 24 }, 2: { cellWidth: 22 }, 3: { cellWidth: 34 }, 4: { cellWidth: 28 } },
        didDrawCell: (data) => {
          if (data.section === "body" && data.column.index === 4) {
            const item = evidenceWithUrls[data.row.index];
            if (item?.url) {
              doc.setFont("helvetica", "bold");
              doc.setFontSize(8);
              doc.setTextColor(0, 86, 112);
              doc.textWithLink("Open Evidence", data.cell.x + 2, data.cell.y + 5, { url: item.url });
              doc.setFont("helvetica", "normal");
              doc.setTextColor(0, 0, 0);
            }
          }
        },
      });

      pdfFooter(doc);
      const fileName = `${record.ainm_number}-complete-ainm-report.pdf`;
      doc.save(fileName);

      const blob = doc.output("blob");
      const filePath = `HSE/AINM/${record.id}/reports/${Date.now()}-${sanitizeFileName(fileName)}`;
      const upload = await supabase.storage.from(evidenceBucket).upload(filePath, blob, { contentType: "application/pdf", upsert: false });
      if (upload.error) {
        setMessage(`Compiled PDF downloaded, but storage upload failed: ${upload.error.message}`);
        return;
      }

      const insert = await supabase.from("hse_ainm_generated_documents").insert([{
        ainm_id: record.id,
        document_stage: "compiled-pdf",
        file_name: fileName,
        file_path: filePath,
        file_size: blob.size,
      }]);
      if (insert.error) {
        setMessage(`Compiled PDF downloaded and uploaded, but report history insert failed: ${insert.error.message}`);
        return;
      }

      setMessage(`Generated compiled AINM PDF for ${record.ainm_number}.`);
      await loadData();
    } catch (error) {
      setMessage(`Compiled PDF generation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setGeneratingStage("");
    }
  }

  function renderInlineActionPanel() {
    return (
      <div style={inlineActionPanelStyle}>
        <div>
          <h3 style={inlineSectionTitleStyle}>Corrective Actions / Recommendations</h3>
          <p style={bodyTextStyle}>Add an Action Management record here without leaving the AINM. Linked actions are included in the Part 2 and compiled reports.</p>
        </div>
        <div style={formGridStyle}>
          <Field label="Action Title">
            <input
              style={inputStyle}
              value={inlineAction.title}
              onChange={(event) => setInlineAction((current) => ({ ...current, title: event.target.value }))}
              placeholder="Describe the corrective action"
            />
          </Field>
          <Field label="Department">
            <select
              style={inputStyle}
              value={inlineAction.department}
              onChange={(event) => setInlineAction((current) => ({ ...current, department: event.target.value }))}
            >
              <option value="">Select department</option>
              {actionDepartmentOptions.map((department) => <option key={department} value={department}>{department}</option>)}
            </select>
          </Field>
          <Field label="Accountable Person">
            <select
              style={inputStyle}
              value={inlineAction.owner}
              onChange={(event) => setInlineAction((current) => ({ ...current, owner: event.target.value }))}
            >
              <option value="">Select owner</option>
              {peopleOptions.map((person) => <option key={person.id} value={person.name}>{person.name}</option>)}
            </select>
          </Field>
          <TextAreaField
            label="Description / Completion Requirements"
            value={inlineAction.description}
            onChange={(value) => setInlineAction((current) => ({ ...current, description: value }))}
          />
          <div style={formGridStyle}>
            <Field label="Priority">
              <select
                style={inputStyle}
                value={inlineAction.priority}
                onChange={(event) => setInlineAction((current) => ({ ...current, priority: event.target.value }))}
              >
                {['Low', 'Medium', 'High', 'Critical'].map((priority) => <option key={priority}>{priority}</option>)}
              </select>
            </Field>
            <Field label="Target Date">
              <input
                type="date"
                style={inputStyle}
                value={inlineAction.due_date}
                onChange={(event) => setInlineAction((current) => ({ ...current, due_date: event.target.value }))}
              />
            </Field>
          </div>
        </div>
        <div style={inlineActionButtonRowStyle}>
          <button type="button" style={compactPrimaryButtonStyle} onClick={() => void createInlineCentralAction()} disabled={savingInlineAction || !canEditAinm}>
            {savingInlineAction ? "Adding Action..." : "Add Corrective Action"}
          </button>
          <Link href={buildActionHref(draft)} style={compactPrimaryLinkStyle}>Open Full Action Form</Link>
        </div>
        <div style={compactLinkedActionListStyle}>
          {selectedCentralActions.map((action) => (
            <div key={action.id} style={compactLinkedActionCardStyle}>
              <div style={compactLinkedActionInfoStyle}>
                <strong>{action.action_number || "Action"} - {action.title || "Untitled action"}</strong>
                <span style={compactLinkedActionMetaStyle}>{action.owner || "Unassigned"} | Due {displayDate(action.due_date)} | Priority {action.priority || "Not set"}</span>
              </div>
              <div style={compactLinkedActionControlsStyle}>
                <StatusPill status={action.status || "Open"} />
                <Link href={`/actions?actionId=${encodeURIComponent(action.id)}`} style={compactActionLinkStyle}>Open</Link>
              </div>
            </div>
          ))}
          {!selectedCentralActions.length ? <div style={emptyBoxStyle}>No corrective actions linked to this AINM yet.</div> : null}
        </div>
      </div>
    );
  }

  return (
    <main>
      <QualityPageHero
        label="HSE MANAGEMENT"
        title="AINM"
        description="Accident, incident, and near miss workflow covering initial notification, Part 1 reporting, Part 2 investigation, evidence, and action tracking."
        contextCards={[
          { label: "Last Refreshed", value: refreshStamp || (loading ? "Loading" : "-") },
          { label: "Latest AINM", value: latestSummary },
        ]}
      />

      <div className="ims-top-meta-row" style={topMetaRowStyle}>
        <Link href="/home" style={backLinkStyle}>← Back to IMS Home</Link>
        <div style={statusBannerStyle}><strong>Status:</strong> {message}</div>
      </div>

      <nav className="ims-tabs" style={viewNavStyle} role="tablist" aria-label="AINM workspace views">
        {[
          ["dashboard", "Dashboard"],
          ["register", "AINM Register"],
          ["create", "Create AINM"],
          ["external", "External AINM"],
          ["import", "Import Tracker"],
          ["reports", "Reports"],
        ].map(([view, label]) => (
          <button key={view} type="button" role="tab" aria-selected={activeView === view} data-active={activeView === view ? "true" : "false"} style={activeView === view ? activeViewButtonStyle : viewButtonStyle} onClick={() => setActiveView(view as AINMView)}>
            {label}
          </button>
        ))}
      </nav>

      {activeView === "dashboard" ? (
        <>
          <section style={dashboardStoryHeaderStyle}>
            <div>
              <h2 style={dashboardStoryTitleStyle}>AINM Performance Story</h2>
              <p style={dashboardStoryTextStyle}>
                Showing accident, incident, near miss, workflow completion, and report-pack readiness for {dashboardYear || "all years"}.
              </p>
            </div>
            <label style={dashboardYearFilterStyle}>
              <span style={labelStyle}>Dashboard Year</span>
              <select style={filterStyle} value={dashboardYear} onChange={(event) => setDashboardYear(event.target.value)}>
                <option value="">All Years</option>
                {kpis.years.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>
            <label style={dashboardYearFilterStyle}>
              <span style={labelStyle}>AINM Scope</span>
              <select style={filterStyle} value={dashboardScope} onChange={(event) => setDashboardScope(event.target.value as DashboardScope)}>
                <option value="internal">Internal only</option>
                <option value="external">External only</option>
                <option value="combined">Combined reporting</option>
              </select>
            </label>
            <button type="button" style={primaryButtonStyle} onClick={exportDashboardSummaryPdf}>
              Export Dashboard PDF
            </button>
          </section>

          <section className="quality-kpi-grid" style={kpiGridStyle}>
            <QualityKpiCard title="Open AINMs" value={kpis.open} accent="#F93822" onClick={() => { setStatusFilter("Open"); setActiveView("register"); }} />
            <QualityKpiCard title="Incidents" value={kpis.incidents} accent="#63B1BC" onClick={() => openRegisterWithType("Incident")} />
            <QualityKpiCard title="Accidents" value={kpis.accidents} accent="#F93822" onClick={() => openRegisterWithType("Accident")} />
            <QualityKpiCard title="Part 1 Due" value={kpis.part1Due} accent="#FFAD00" onClick={() => { setStageFilter("Draft"); setActiveView("register"); }} />
            <QualityKpiCard title="Part 2 Due" value={kpis.part2Due} accent="#53565A" onClick={() => { setActiveView("register"); }} />
            <QualityKpiCard title="External AINMs" value={kpis.dashboardExternalRecords.length} accent="#005670" onClick={() => setActiveView("external")} />
          </section>

          <section style={dashboardVisualGridStyle}>
            <DashboardPanel title="Mobile AINM Field Entry" subtitle="Scan to raise or continue an AINM notification from a phone.">
              <div style={qrAccessWrapStyle}>
                <div style={qrBoxStyle}>
                  {fieldQrDataUrl ? <img src={fieldQrDataUrl} alt="AINM mobile field entry QR code" style={qrImageStyle} /> : <span style={bodyTextStyle}>QR loading...</span>}
                </div>
                <div style={qrCopyStyle}>
                  <strong>Point-of-contact reporting</strong>
                  <span>Initial notification, event details, and notification evidence upload.</span>
                  <Link href="/hse/ainm/field" style={linkButtonStyle}>Open Mobile AINM</Link>
                </div>
              </div>
            </DashboardPanel>

            <DashboardPanel title="Incident vs Accident Split" subtitle="How the selected year breaks down by report type.">
              <div style={dashboardFigureStripStyle}>
                <MiniMetric label="Total" value={String(kpis.incidents + kpis.accidents)} />
                <MiniMetric label="Incidents" value={`${kpis.incidents} / ${percentage(kpis.incidents, kpis.incidents + kpis.accidents)}%`} />
                <MiniMetric label="Accidents" value={`${kpis.accidents} / ${percentage(kpis.accidents, kpis.incidents + kpis.accidents)}%`} />
              </div>
              <DonutChart
                total={kpis.incidents + kpis.accidents}
                segments={[
                  { label: "Incidents", value: kpis.incidents, color: "#63B1BC" },
                  { label: "Accidents", value: kpis.accidents, color: "#F93822" },
                ]}
              />
              <div style={chartLegendGridStyle}>
                <MiniMetric label="Incident reports" value={`${kpis.incidents} (${percentage(kpis.incidents, kpis.incidents + kpis.accidents)}%)`} />
                <MiniMetric label="Accident reports" value={`${kpis.accidents} (${percentage(kpis.accidents, kpis.incidents + kpis.accidents)}%)`} />
              </div>
            </DashboardPanel>

            <DashboardPanel title="Workflow Completion" subtitle="Visibility of the three-stage AINM process.">
              <div style={dashboardFigureStripStyle}>
                <MiniMetric label="AINMs" value={String(dashboardInsights.total)} />
                <MiniMetric label="Part 1" value={`${dashboardInsights.workflowRows[1]?.value || 0} / ${percentage(dashboardInsights.workflowRows[1]?.value || 0, dashboardInsights.total)}%`} />
                <MiniMetric label="Part 2" value={`${dashboardInsights.workflowRows[2]?.value || 0} / ${percentage(dashboardInsights.workflowRows[2]?.value || 0, dashboardInsights.total)}%`} />
              </div>
              <ProgressBars rows={dashboardInsights.workflowRows} total={dashboardInsights.total} />
            </DashboardPanel>

            <DashboardPanel title="Status Position" subtitle="Open, in progress, and closed AINMs for the selected year.">
              <div style={dashboardFigureStripStyle}>
                <MiniMetric label="Open" value={String(kpis.open)} />
                <MiniMetric label="Closed" value={String(kpis.closed)} />
                <MiniMetric label="Closure" value={`${percentage(kpis.closed, dashboardInsights.total)}%`} />
              </div>
              <ProgressBars rows={dashboardInsights.statusRows} total={dashboardInsights.total} />
            </DashboardPanel>

            <DashboardPanel title="Monthly Trend" subtitle="AINMs raised by event month.">
              <ColumnChart rows={dashboardInsights.monthRows} />
            </DashboardPanel>

            <DashboardPanel title="Event Classifications" subtitle="Top event types in the selected year.">
              <ProgressBars rows={dashboardInsights.classificationRows} total={dashboardInsights.total} emptyText="No classifications recorded for this year." />
            </DashboardPanel>

            <DashboardPanel title="Projects / Worksites" subtitle="Where AINMs are being raised.">
              <ProgressBars rows={dashboardInsights.projectRows} total={dashboardInsights.total} emptyText="No project/worksite values recorded for this year." />
            </DashboardPanel>

            <DashboardPanel title="Report Pack Readiness" subtitle="Compiled PDFs generated from complete AINM records.">
              <div style={reportReadinessStyle} onClick={() => setActiveView("reports")}>
                <strong>{kpis.compiledReports}</strong>
                <span>compiled PDF report pack{kpis.compiledReports === 1 ? "" : "s"}</span>
              </div>
              <p style={bodyTextStyle}>Use Reports to view final PDF packs and filter by Incident or Accident report number.</p>
            </DashboardPanel>
          </section>
        </>
      ) : null}

      {activeView === "create" ? (
        <SectionCard title="Create AINM" subtitle="Start the record first, then complete Notification, Part 1, Part 2, actions, and evidence from the register detail panel.">
          <div style={formGridStyle}>
            <Field label="AINM Type">
              <select
                style={newAinmType ? inputStyle : { ...inputStyle, color: "#D0D0CE" }}
                value={newAinmType}
                onChange={(event) => setNewAinmType(event.target.value as NewAINMType)}
              >
                <option value="" disabled>Select Type</option>
                <option value="Incident">Incident Report</option>
                <option value="Accident">Accident Report</option>
              </select>
            </Field>
            <Field label="AINM No."><input style={{ ...inputStyle, background: "#ECECE7" }} value={newRecord.ainm_number} readOnly /></Field>
            <Field label="Title"><input style={inputStyle} value={newRecord.title} onChange={(e) => updateNew("title", e.target.value)} placeholder="ENS1100 Jetting Sword Damage" /></Field>
            <Field label="Project"><input style={inputStyle} value={newRecord.project || ""} onChange={(e) => updateNew("project", e.target.value)} /></Field>
            <Field label="Location / Site"><input style={inputStyle} value={newRecord.location_site || ""} onChange={(e) => updateNew("location_site", e.target.value)} /></Field>
            <Field label="Date of Event"><input type="date" style={inputStyle} value={newRecord.event_date || ""} onChange={(e) => updateNew("event_date", e.target.value)} /></Field>
            <Field label="Time of Event"><input type="time" style={inputStyle} value={timeInputValue(newRecord.event_time)} onChange={(e) => updateNew("event_time", e.target.value)} /></Field>
            <Field label="Event Classification">
              <select style={inputStyle} value={newRecord.event_classification || ""} onChange={(e) => updateNew("event_classification", e.target.value)}>
                <option value="">Select classification</option>
                {eventClassifications.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </Field>
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Brief Event Details"><textarea style={textareaStyle} value={newRecord.brief_event_details || ""} onChange={(e) => updateNew("brief_event_details", e.target.value)} /></Field>
            </div>
          </div>
          <div style={buttonRowStyle}>
            <button type="button" style={primaryButtonStyle} onClick={() => void createAINM()} disabled={saving || !canCreateAinm}>{saving ? "Creating..." : "Create AINM"}</button>
          </div>
        </SectionCard>
      ) : null}

      {activeView === "external" ? (
        <section style={registerLayoutStyle}>
          <SectionCard
            title="External AINM"
            subtitle="Log third-party, supplier, contractor, or client AINMs separately from the internal Notification / Part 1 / Part 2 workflow."
          >
            <div style={externalNoticeStyle}>
              <strong>Reporting rule:</strong>
              <span>
                External AINMs are excluded from internal AINM dashboard figures by default. Tick &quot;Include in statistics&quot; only when the HSE Manager wants the external event counted in combined reporting.
              </span>
            </div>

            <div style={formGridStyle}>
              <Field label="External AINM No.">
                <input
                  style={{ ...inputStyle, background: "#ECECE7" }}
                  value={newExternalRecord.external_ainm_number || getNextExternalAinmNumber(externalRecords)}
                  onChange={(event) => updateNewExternal("external_ainm_number", event.target.value)}
                />
              </Field>
              <Field label="External Party Type">
                <select style={inputStyle} value={newExternalRecord.external_party_type || ""} onChange={(event) => updateNewExternal("external_party_type", event.target.value)}>
                  <option value="">Select type</option>
                  {externalPartyTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </Field>
              <Field label="External Party / Supplier Name">
                <input style={inputStyle} value={newExternalRecord.supplier_name || ""} onChange={(event) => updateNewExternal("supplier_name", event.target.value)} placeholder="Supplier, contractor, client, or third party" />
              </Field>
              <Field label="External Reference">
                <input style={inputStyle} value={newExternalRecord.supplier_reference || ""} onChange={(event) => updateNewExternal("supplier_reference", event.target.value)} placeholder="Supplier report number / reference" />
              </Field>
              <Field label="Project / Work Title">
                <input style={inputStyle} value={newExternalRecord.project || ""} onChange={(event) => updateNewExternal("project", event.target.value)} />
              </Field>
              <Field label="Location / Site">
                <input style={inputStyle} value={newExternalRecord.location_site || ""} onChange={(event) => updateNewExternal("location_site", event.target.value)} />
              </Field>
              <Field label="Event Date">
                <input type="date" style={inputStyle} value={newExternalRecord.event_date || ""} onChange={(event) => updateNewExternal("event_date", event.target.value)} />
              </Field>
              <Field label="Event Type">
                <select style={inputStyle} value={newExternalRecord.event_type || ""} onChange={(event) => updateNewExternal("event_type", event.target.value)}>
                  <option value="">Select event type</option>
                  {externalEventTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </Field>
              <Field label="Enshore Contact">
                <select style={inputStyle} value={peopleOptions.find((person) => person.name === newExternalRecord.enshore_contact)?.id || newExternalRecord.enshore_contact || ""} onChange={(event) => {
                  const person = peopleOptions.find((item) => item.id === event.target.value);
                  updateNewExternal("enshore_contact", person?.name || event.target.value);
                }}>
                  <option value="">Select contact</option>
                  {newExternalRecord.enshore_contact && !peopleOptions.some((person) => person.name === newExternalRecord.enshore_contact) ? (
                    <option value={newExternalRecord.enshore_contact}>{newExternalRecord.enshore_contact} (saved value)</option>
                  ) : null}
                  {peopleOptions.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select style={inputStyle} value={newExternalRecord.status} onChange={(event) => updateNewExternal("status", event.target.value as ExternalAINMStatus)}>
                  {externalAinmStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </Field>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Summary">
                  <textarea style={textareaStyle} value={newExternalRecord.summary || ""} onChange={(event) => updateNewExternal("summary", event.target.value)} placeholder="Short summary of the externally reported event." />
                </Field>
              </div>
              <TextAreaField label="Immediate Actions / Enshore Follow-up" value={newExternalRecord.immediate_actions || ""} onChange={(value) => updateNewExternal("immediate_actions", value)} />
              <TextAreaField label="Comments" value={newExternalRecord.comments || ""} onChange={(value) => updateNewExternal("comments", value)} />
              <label style={externalCheckboxStyle}>
                <input type="checkbox" checked={Boolean(newExternalRecord.include_in_statistics)} onChange={(event) => updateNewExternal("include_in_statistics", event.target.checked)} />
                Include this external AINM in combined statistics
              </label>
            </div>
            <div style={buttonRowStyle}>
              <button type="button" style={primaryButtonStyle} onClick={() => void createExternalAINM()} disabled={saving || !canCreateAinm}>{saving ? "Creating..." : "Create External AINM"}</button>
            </div>
          </SectionCard>

          <SectionCard title="External AINM Register" subtitle="External-only register for supplier, contractor, client, and third-party AINM records.">
            <div className="ims-filter-panel" style={toolbarStyle}>
              <input style={searchStyle} value={externalSearch} onChange={(event) => setExternalSearch(event.target.value)} placeholder="Search external AINM no., supplier, project, reference..." />
              <button type="button" style={showExternalFilters ? secondaryButtonStyle : primaryButtonStyle} onClick={() => setShowExternalFilters((current) => !current)}>
                {showExternalFilters ? "Hide Filters" : "Show Filters"}
              </button>
            </div>
            {showExternalFilters ? (
              <div className="ims-filter-panel" style={toolbarStyle}>
                <select style={filterStyle} value={externalStatusFilter} onChange={(event) => setExternalStatusFilter(event.target.value)}>
                  <option value="">All Status</option>
                  {externalAinmStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
                <select style={filterStyle} value={externalTypeFilter} onChange={(event) => setExternalTypeFilter(event.target.value)}>
                  <option value="">All External Types</option>
                  {externalPartyTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
                <button type="button" style={secondaryButtonStyle} onClick={() => { setExternalSearch(""); setExternalStatusFilter(""); setExternalTypeFilter(""); }}>Clear Filters</button>
              </div>
            ) : null}
            <div style={tableInfoRowStyle}>Showing {filteredExternalRecords.length} of {externalRecords.length} external AINMs</div>
            <div style={registerTableWrapStyle}>
              <table style={registerTableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>External AINM No.</th>
                    <th style={thStyle}>External Party</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Project</th>
                    <th style={thStyle}>Event Date</th>
                    <th style={thStyle}>Event Type</th>
                    <th style={thStyle}>Stats</th>
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExternalRecords.map((record) => (
                    <tr key={record.id} aria-selected={selectedExternalId === record.id} data-selected={selectedExternalId === record.id ? "true" : "false"} style={selectedExternalId === record.id ? selectedRowStyle : trStyle} onClick={() => setSelectedExternalId(record.id)}>
                      <td style={tdStrongStyle}>{record.external_ainm_number}</td>
                      <td style={tdStyle}>{record.supplier_name || ""}</td>
                      <td style={tdStyle}>{record.external_party_type || ""}</td>
                      <td style={tdStyle}>{record.project || ""}</td>
                      <td style={tdStyle}>{displayDate(record.event_date)}</td>
                      <td style={tdStyle}>{record.event_type || ""}</td>
                      <td style={tdStyle}>{record.include_in_statistics ? "Included" : "Excluded"}</td>
                      <td style={tdStyle}><StatusPill status={record.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filteredExternalRecords.length ? <div style={emptyBoxStyle}>No external AINMs match the current filter.</div> : null}
            </div>
          </SectionCard>

          {selectedExternal ? (
            <SectionCard title={`${externalDraft.external_ainm_number} - ${externalDraft.supplier_name || "External AINM"}`} subtitle="Edit the external AINM record and upload external documentation.">
              <DetailSection>
                <div style={formGridStyle}>
                  <Field label="External AINM No."><input style={inputStyle} value={externalDraft.external_ainm_number} onChange={(event) => updateExternalDraft("external_ainm_number", event.target.value)} /></Field>
                  <Field label="External Party Type">
                    <select style={inputStyle} value={externalDraft.external_party_type || ""} onChange={(event) => updateExternalDraft("external_party_type", event.target.value)}>
                      <option value="">Select type</option>
                      {externalPartyTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </Field>
                  <Field label="External Party / Supplier Name"><input style={inputStyle} value={externalDraft.supplier_name || ""} onChange={(event) => updateExternalDraft("supplier_name", event.target.value)} /></Field>
                  <Field label="External Reference"><input style={inputStyle} value={externalDraft.supplier_reference || ""} onChange={(event) => updateExternalDraft("supplier_reference", event.target.value)} /></Field>
                  <Field label="Project / Work Title"><input style={inputStyle} value={externalDraft.project || ""} onChange={(event) => updateExternalDraft("project", event.target.value)} /></Field>
                  <Field label="Location / Site"><input style={inputStyle} value={externalDraft.location_site || ""} onChange={(event) => updateExternalDraft("location_site", event.target.value)} /></Field>
                  <Field label="Event Date"><input type="date" style={inputStyle} value={externalDraft.event_date || ""} onChange={(event) => updateExternalDraft("event_date", event.target.value)} /></Field>
                  <Field label="Event Type">
                    <select style={inputStyle} value={externalDraft.event_type || ""} onChange={(event) => updateExternalDraft("event_type", event.target.value)}>
                      <option value="">Select event type</option>
                      {externalEventTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </Field>
                  <Field label="Enshore Contact">
                    <select style={inputStyle} value={peopleOptions.find((person) => person.name === externalDraft.enshore_contact)?.id || externalDraft.enshore_contact || ""} onChange={(event) => {
                      const person = peopleOptions.find((item) => item.id === event.target.value);
                      updateExternalDraft("enshore_contact", person?.name || event.target.value);
                    }}>
                      <option value="">Select contact</option>
                      {externalDraft.enshore_contact && !peopleOptions.some((person) => person.name === externalDraft.enshore_contact) ? (
                        <option value={externalDraft.enshore_contact}>{externalDraft.enshore_contact} (saved value)</option>
                      ) : null}
                      {peopleOptions.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Status">
                    <select style={inputStyle} value={externalDraft.status} onChange={(event) => updateExternalDraft("status", event.target.value as ExternalAINMStatus)}>
                      {externalAinmStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </Field>
                  <TextAreaField label="Summary" value={externalDraft.summary || ""} onChange={(value) => updateExternalDraft("summary", value)} />
                  <TextAreaField label="Immediate Actions / Enshore Follow-up" value={externalDraft.immediate_actions || ""} onChange={(value) => updateExternalDraft("immediate_actions", value)} />
                  <TextAreaField label="Comments" value={externalDraft.comments || ""} onChange={(value) => updateExternalDraft("comments", value)} />
                  <label style={externalCheckboxStyle}>
                    <input type="checkbox" checked={Boolean(externalDraft.include_in_statistics)} onChange={(event) => updateExternalDraft("include_in_statistics", event.target.checked)} />
                    Include this external AINM in combined statistics
                  </label>
                </div>

                <div style={notificationEvidencePanelStyle}>
                  <div>
                    <strong>External Documentation / Evidence</strong>
                    <p style={bodyTextStyle}>Upload supplier reports, contractor paperwork, photographs, or supporting documents received from the external party.</p>
                  </div>
                  <label style={uploadButtonStyle}>
                    {uploading ? "Uploading..." : "Upload External Documentation"}
                    <input type="file" multiple style={{ display: "none" }} onChange={(event) => void uploadExternalEvidence(event)} disabled={uploading || !canEditAinm} />
                  </label>
                  <div style={evidenceListStyle}>
                    {selectedExternalEvidence.map((file) => (
                      <div key={file.id} style={evidenceItemStyle}>
                        <div>
                          <strong>{file.file_name}</strong>
                          <span>{formatFileSize(file.file_size)} | Uploaded {displayDateTime(file.uploaded_at)}</span>
                        </div>
                        <div style={buttonRowStyle}>
                          <button type="button" style={secondaryButtonStyle} onClick={() => void openExternalEvidence(file)}>Open / Preview</button>
                          <button type="button" style={dangerButtonStyle} onClick={() => void deleteExternalEvidence(file)} disabled={!canEditAinm}>Delete</button>
                        </div>
                      </div>
                    ))}
                    {!selectedExternalEvidence.length ? <div style={emptyBoxStyle}>No external documentation uploaded yet.</div> : null}
                  </div>
                </div>

                <div style={detailFooterStyle}>
                  <button type="button" style={primaryButtonStyle} onClick={() => void saveExternalAINM()} disabled={saving || !canEditAinm}>{saving ? "Saving..." : "Save External AINM"}</button>
                  <button type="button" style={dangerButtonStyle} onClick={() => void deleteExternalRecord(externalDraft)} disabled={!canEditAinm}>Delete External AINM</button>
                </div>
              </DetailSection>
            </SectionCard>
          ) : null}
        </section>
      ) : null}

      {activeView === "import" ? (
        <SectionCard title="Import AINM Action Tracker" subtitle="Upload the tracker workbook, choose the year/sheet to preview, then import. Existing AINM numbers are skipped.">
          <div style={importToolbarStyle}>
            <label style={uploadButtonStyle}>
              Upload AINM Action Tracker.xlsx
              <input type="file" accept=".xlsx" style={{ display: "none" }} onChange={(event) => void handleTrackerUpload(event)} disabled={!canCreateAinm} />
            </label>
            {importSheets.length ? (
              <Field label="Tracker sheet / year">
                <select style={inputStyle} value={selectedImportSheet} onChange={(event) => handleImportSheetChange(event.target.value)}>
                  {importSheets.map((sheet) => (
                    <option key={sheet} value={sheet}>{sheet.trim() || sheet}</option>
                  ))}
                </select>
              </Field>
            ) : null}
          </div>
          {importPreview.length ? (
            <>
              <div style={tableInfoRowStyle}>
                Previewing {importPreview.length} AINM records and {importPreview.reduce((sum, group) => sum + group.actions.length, 0)} tracker actions from {selectedImportSheet || "selected sheet"}.
              </div>
              <div style={previewGridStyle}>
                {importPreview.map((group) => (
                  <div key={group.ainm_number} style={previewCardStyle}>
                    <strong>{group.ainm_number} - {group.title}</strong>
                    <span>{group.project || "No project"} | {displayDate(group.event_date)} | {group.source_year || "No year"} | {group.actions.length} actions</span>
                  </div>
                ))}
              </div>
              <button type="button" style={primaryButtonStyle} onClick={() => void importTrackerPreview()} disabled={importing || !canCreateAinm}>{importing ? "Importing..." : "Import Preview"}</button>
            </>
          ) : null}
        </SectionCard>
      ) : null}

      {activeView === "register" ? (
        <section style={registerLayoutStyle}>
          <SectionCard title="AINM Register" subtitle="Tracker-style register with three-stage AINM workflow status.">
            <div className="ims-filter-panel" style={toolbarStyle}>
              <input style={searchStyle} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search AINM no., title, project, owner..." />
              <button type="button" style={showRegisterFilters ? secondaryButtonStyle : primaryButtonStyle} onClick={() => setShowRegisterFilters((current) => !current)}>
                {showRegisterFilters ? "Hide Filters" : "Show Filters"}
              </button>
            </div>
            {showRegisterFilters ? (
            <div className="ims-filter-panel" style={toolbarStyle}>
              <select style={filterStyle} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All Status</option>
                {overallStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
              <select style={filterStyle} value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
                <option value="">All Stage Status</option>
                {stageStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
              <select style={filterStyle} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as "" | AINMType)}>
                <option value="">All Report Types</option>
                <option value="Incident">Incident</option>
                <option value="Accident">Accident</option>
              </select>
              <select style={filterStyle} value={classificationFilter} onChange={(e) => setClassificationFilter(e.target.value)}>
                <option value="">All Classifications</option>
                {eventClassifications.map((classification) => <option key={classification} value={classification}>{classification}</option>)}
              </select>
              <button type="button" style={secondaryButtonStyle} onClick={clearRegisterFilters}>Clear Filters</button>
            </div>
            ) : null}
            <div style={tableInfoRowStyle}>Showing {filteredRecords.length} of {records.length} AINMs</div>
            <div style={registerTableWrapStyle}>
              <table style={registerTableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>AINM No.</th>
                    <th style={thStyle}>Title</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Classification</th>
                    <th style={thStyle}>Project</th>
                    <th style={thStyle}>Event Date</th>
                    <th style={thStyle}>Notification</th>
                    <th style={thStyle}>Part 1</th>
                    <th style={thStyle}>Part 2</th>
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr key={record.id} aria-selected={selectedId === record.id} data-selected={selectedId === record.id ? "true" : "false"} style={selectedId === record.id ? selectedRowStyle : trStyle} onClick={() => selectAinmAndScroll(record)}>
                      <td style={tdStrongStyle}>{record.ainm_number}</td>
                      <td style={tdStyle}>{record.title}</td>
                      <td style={tdStyle}>{ainmTypeLabel(record)}</td>
                      <td style={tdStyle}>{record.event_classification || ""}</td>
                      <td style={tdStyle}>{record.project}</td>
                      <td style={tdStyle}>{displayDate(record.event_date)}</td>
                      <td style={tdStyle}><StatusPill status={record.notification_status} /></td>
                      <td style={tdStyle}><StatusPill status={record.part1_status} /></td>
                      <td style={tdStyle}><StatusPill status={record.part2_status} /></td>
                      <td style={tdStyle}><StatusPill status={record.overall_status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          {selected ? (
            <div ref={selectedDetailRef}>
            <SectionCard title={`${draft.ainm_number} - ${draft.title}`} subtitle="Open/hide style detail panel for notification, Part 1, Part 2, tracker actions, evidence, and reports.">
              <nav className="ims-tabs" style={detailTabStyle} role="tablist" aria-label="AINM detail views">
                {[
                  ["notification", "Notification"],
                  ["part1", "Part 1"],
                  ["part2", "Part 2"],
                  ["actions", "Actions"],
                  ["evidence", "Evidence"],
                  ["reports", "Reports"],
                ].map(([tab, label]) => (
                  <button key={tab} type="button" role="tab" aria-selected={detailTab === tab} data-active={detailTab === tab ? "true" : "false"} style={detailTab === tab ? activeViewButtonStyle : viewButtonStyle} onClick={() => setDetailTab(tab as DetailTab)}>{label}</button>
                ))}
              </nav>

              {detailTab === "notification" ? (
                <DetailSection>
                  <StatusRow record={draft} onChange={updateDraft} />
                  <div style={formGridStyle}>
                    <Field label="AINM No."><input style={inputStyle} value={draft.ainm_number} onChange={(e) => updateDraft("ainm_number", e.target.value)} /></Field>
                    <Field label="Title"><input style={inputStyle} value={draft.title} onChange={(e) => updateDraft("title", e.target.value)} /></Field>
                    <Field label="Project"><input style={inputStyle} value={draft.project || ""} onChange={(e) => updateDraft("project", e.target.value)} /></Field>
                    <Field label="Location/Site"><input style={inputStyle} value={draft.location_site || ""} onChange={(e) => updateDraft("location_site", e.target.value)} /></Field>
                    <Field label="Date of Event"><input type="date" style={inputStyle} value={draft.event_date || ""} onChange={(e) => updateDraft("event_date", e.target.value)} /></Field>
                    <Field label="Time of Event"><input type="time" style={inputStyle} value={timeInputValue(draft.event_time)} onChange={(e) => updateDraft("event_time", e.target.value)} /></Field>
                    <Field label="Classification">
                      <select style={inputStyle} value={draft.event_classification || ""} onChange={(e) => updateDraft("event_classification", e.target.value)}>
                        <option value="">Select classification</option>
                        {eventClassifications.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </Field>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <Field label="Brief details of the event">
                        <span style={helperTextStyle}>Please avoid names - use job title or term &apos;IP&apos; (Injured Person).</span>
                        <textarea style={textareaStyle} value={draft.brief_event_details || ""} onChange={(e) => updateDraft("brief_event_details", e.target.value)} />
                      </Field>
                    </div>
                    <TextAreaField label="Brief details of injury/release/damage" value={draft.injury_release_damage_details || ""} onChange={(value) => updateDraft("injury_release_damage_details", value)} />
                    <div style={{ gridColumn: "1 / -1" }}>
                      <h3 style={inlineSectionTitleStyle}>Brief details of the initial response</h3>
                    </div>
                    <TextAreaField label="Casualty Management" value={draft.casualty_management || ""} onChange={(value) => updateDraft("casualty_management", value)} />
                    <TextAreaField label="Site/Location Management" value={draft.site_management || ""} onChange={(value) => updateDraft("site_management", value)} />
                    <TextAreaField label="Cause Identification" value={draft.initial_cause || ""} onChange={(value) => updateDraft("initial_cause", value)} />
                    <TextAreaField label="Additional information" value={draft.additional_information || ""} onChange={(value) => updateDraft("additional_information", value)} />
                  </div>
                  <div style={notificationEvidencePanelStyle}>
                    <div>
                      <strong>Notification Evidence</strong>
                      <p style={bodyTextStyle}>Upload photographs, document references, statements, or other evidence relevant to the initial notification.</p>
                    </div>
                    <label style={uploadButtonStyle}>
                      {uploading ? "Uploading..." : "Upload Notification Evidence"}
                      <input type="file" multiple style={{ display: "none" }} onChange={(event) => void uploadEvidence(event, "Notification")} disabled={uploading || !canEditAinm} />
                    </label>
                    <div style={evidenceListStyle}>
                      {selectedEvidence.filter((file) => file.stage === "Notification").map((file) => (
                        <div key={file.id} style={evidenceItemStyle}>
                          <div>
                            <strong>{file.file_name}</strong>
                            <span>Notification | {formatFileSize(file.file_size)} | Uploaded {displayDateTime(file.uploaded_at)}</span>
                          </div>
                          <div style={buttonRowStyle}>
                            <button type="button" style={secondaryButtonStyle} onClick={() => void openEvidence(file)}>Open / Preview</button>
                            <button type="button" style={dangerButtonStyle} onClick={() => void deleteEvidence(file)} disabled={!canEditAinm}>Delete</button>
                          </div>
                        </div>
                      ))}
                      {!selectedEvidence.some((file) => file.stage === "Notification") ? <div style={emptyBoxStyle}>No notification evidence uploaded yet.</div> : null}
                    </div>
                  </div>
                  <div style={buttonRowStyle}>
                    <button type="button" style={reportButtonStyle} onClick={() => void generateWord("notification", draft)} disabled={Boolean(generatingStage)}>
                      {generatingStage === "notification" ? "Generating..." : "Generate Initial Notification"}
                    </button>
                  </div>
                </DetailSection>
              ) : null}

              {detailTab === "part1" ? (
                <DetailSection>
                  <div style={carryForwardPanelStyle}>
                    <h3 style={carryForwardTitleStyle}>{draft.ainm_number} - {draft.title}</h3>
                    <div style={carryForwardGridStyle}>
                      <span><strong>Project:</strong> {draft.project || ""}</span>
                      <span><strong>Location/Site:</strong> {draft.location_site || ""}</span>
                      <span><strong>Date of Event:</strong> {displayDate(draft.event_date)}</span>
                      <span><strong>Time of Event:</strong> {draft.event_time || ""}</span>
                      <span><strong>Classification:</strong> {draft.event_classification || ""}</span>
                    </div>
                  </div>
                  <div style={formGridStyle}>
                    <Field label="Company in Control"><input style={inputStyle} value={draft.company_in_control || ""} onChange={(e) => updateDraft("company_in_control", e.target.value)} /></Field>
                    <TextAreaField label="Event Details" value={draft.brief_event_details || ""} onChange={(value) => updateDraft("brief_event_details", value)} />
                    <div style={{ gridColumn: "1 / -1" }}>
                      <h3 style={inlineSectionTitleStyle}>If environmental release, please specify type and quantity</h3>
                    </div>
                    <Field label="Environmental Release Type"><input style={inputStyle} value={draft.environmental_release_type || ""} onChange={(e) => updateDraft("environmental_release_type", e.target.value)} /></Field>
                    <Field label="Environmental Release Quantity"><input style={inputStyle} value={draft.environmental_release_quantity || ""} onChange={(e) => updateDraft("environmental_release_quantity", e.target.value)} /></Field>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <h3 style={inlineSectionTitleStyle}>Immediate containment actions implemented: (steps taken to make condition(s) safe)</h3>
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <div style={correctiveActionsTableStyle}>
                        <div style={correctiveHeaderCellStyle}>Action No.</div>
                        <div style={correctiveHeaderCellStyle}>Immediate Containment Action</div>
                        <div style={correctiveHeaderCellStyle}>Remove</div>
                        {correctiveActionRows.map((action, index) => (
                          <React.Fragment key={`corrective-${index}`}>
                            <div style={correctiveNumberCellStyle}>{index + 1}</div>
                            <textarea
                              style={correctiveTextareaStyle}
                              value={action}
                              onChange={(event) => updateCorrectiveActionRow(index, event.target.value)}
                              rows={Math.max(1, action.split(/\r?\n/).length)}
                            />
                            <button type="button" style={smallDangerButtonStyle} onClick={() => removeCorrectiveActionRow(index)} disabled={correctiveActionRows.length === 1 || !canEditAinm}>
                              Remove
                            </button>
                          </React.Fragment>
                        ))}
                      </div>
                      <div style={buttonRowStyle}>
                        <button type="button" style={secondaryButtonStyle} onClick={addCorrectiveActionRow} disabled={!canEditAinm}>Add Row</button>
                      </div>
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>{renderInlineActionPanel()}</div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <h3 style={inlineSectionTitleStyle}>Event investigation and root cause analysis</h3>
                    </div>
                    <TextAreaField label="People - what did the people do that was incorrect? Why did they do this?" value={draft.root_cause_people || ""} onChange={(value) => updateDraft("root_cause_people", value)} />
                    <TextAreaField label="Equipment - what was defective about the equipment and/or materials?" value={draft.root_cause_equipment || ""} onChange={(value) => updateDraft("root_cause_equipment", value)} />
                    <TextAreaField label="Environment/Conditions - what was defective about the environment and/or conditions?" value={draft.root_cause_environment || ""} onChange={(value) => updateDraft("root_cause_environment", value)} />
                    <TextAreaField label="Process - what was defective about the procedure and systems? Why were they deficient?" value={draft.root_cause_process || ""} onChange={(value) => updateDraft("root_cause_process", value)} />
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <h3 style={inlineSectionTitleStyle}>Additional information and attachments included within this report</h3>
                  </div>
                  <div style={checkGridStyle}>
                    {attachmentChecklistOptions.map((item) => (
                      <label key={item} style={checkItemStyle}>
                        <input type="checkbox" checked={attachmentIsSelected(draft.attachments_checklist || [], item)} onChange={() => toggleAttachment(item)} />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                  {attachmentIsSelected(draft.attachments_checklist || [], "Other") ? (
                    <div style={{ marginTop: 12 }}>
                      <Field label="Other attachment / information details">
                        <input
                          style={inputStyle}
                          value={attachmentOtherText(draft.attachments_checklist || [])}
                          onChange={(event) => updateAttachmentOtherText(event.target.value)}
                          placeholder="Describe the other information or attachment"
                        />
                      </Field>
                    </div>
                  ) : null}
                  <div style={formGridStyle}>
                    <TextAreaField label="Additional Comments" value={draft.part1_additional_comments || ""} onChange={(value) => updateDraft("part1_additional_comments", value)} />
                    <Field label="Reviewed / Accepted By">
                      <select
                        style={inputStyle}
                        value={peopleOptions.find((person) => person.name === draft.part1_reviewer_name)?.id || draft.part1_reviewer_name || ""}
                        onChange={(event) => selectPart1Reviewer(event.target.value)}
                      >
                        <option value="">Select reviewer</option>
                        {draft.part1_reviewer_name && !peopleOptions.some((person) => person.name === draft.part1_reviewer_name) ? (
                          <option value={draft.part1_reviewer_name}>{draft.part1_reviewer_name} (saved value)</option>
                        ) : null}
                        {peopleOptions.map((person) => (
                          <option key={person.id} value={person.id}>
                            {[person.name, person.role].filter(Boolean).join(" - ")}
                          </option>
                        ))}
                        <option value="__add_new">Add New Person...</option>
                      </select>
                    </Field>
                    <Field label="Reviewer Position"><input style={inputStyle} value={draft.part1_reviewer_position || ""} onChange={(e) => updateDraft("part1_reviewer_position", e.target.value)} /></Field>
                  </div>
                  {showAddReviewer ? (
                    <div style={addPersonPanelStyle}>
                      <Field label="New Person Name"><input style={inputStyle} value={newReviewerName} onChange={(event) => setNewReviewerName(event.target.value)} placeholder="Name" /></Field>
                      <Field label="Position / Role"><input style={inputStyle} value={newReviewerRole} onChange={(event) => setNewReviewerRole(event.target.value)} placeholder="Position" /></Field>
                      <div style={buttonRowStyle}>
                        <button type="button" style={primaryButtonStyle} onClick={() => void addReviewerToPeople()} disabled={!canEditAinm}>Add to People</button>
                        <button type="button" style={secondaryButtonStyle} onClick={() => setShowAddReviewer(false)}>Cancel</button>
                      </div>
                    </div>
                  ) : null}
                  <div style={notificationEvidencePanelStyle}>
                    <div>
                      <strong>Part 1 Evidence</strong>
                      <p style={bodyTextStyle}>Upload photographs, statements, task plans, toolbox talks, certificates, or other evidence used for the Part 1 report.</p>
                    </div>
                    <label style={uploadButtonStyle}>
                      {uploading ? "Uploading..." : "Upload Part 1 Evidence"}
                      <input type="file" multiple style={{ display: "none" }} onChange={(event) => void uploadEvidence(event, "Part 1")} disabled={uploading || !canEditAinm} />
                    </label>
                    <div style={evidenceListStyle}>
                      {selectedEvidence.filter((file) => file.stage === "Part 1").map((file) => (
                        <div key={file.id} style={evidenceItemStyle}>
                          <div>
                            <strong>{file.file_name}</strong>
                            <span>Part 1 | {formatFileSize(file.file_size)} | Uploaded {displayDateTime(file.uploaded_at)}</span>
                          </div>
                          <div style={buttonRowStyle}>
                            <button type="button" style={secondaryButtonStyle} onClick={() => void openEvidence(file)}>Open / Preview</button>
                            <button type="button" style={dangerButtonStyle} onClick={() => void deleteEvidence(file)} disabled={!canEditAinm}>Delete</button>
                          </div>
                        </div>
                      ))}
                      {!selectedEvidence.some((file) => file.stage === "Part 1") ? <div style={emptyBoxStyle}>No Part 1 evidence uploaded yet.</div> : null}
                    </div>
                  </div>
                  <div style={buttonRowStyle}>
                    <button type="button" style={reportButtonStyle} onClick={() => void generateWord("part1", draft)} disabled={Boolean(generatingStage)}>
                      {generatingStage === "part1" ? "Generating..." : "Generate Part 1 Report"}
                    </button>
                  </div>
                </DetailSection>
              ) : null}

              {detailTab === "part2" ? (
                <DetailSection>
                  <div style={carryForwardPanelStyle}>
                    <h3 style={carryForwardTitleStyle}>{draft.ainm_number} - {draft.title}</h3>
                    <div style={carryForwardGridStyle}>
                      <span><strong>Project:</strong> {draft.project || ""}</span>
                      <span><strong>Location/Site:</strong> {draft.location_site || ""}</span>
                      <span><strong>Date of Event:</strong> {displayDate(draft.event_date)}</span>
                      <span><strong>Time of Event:</strong> {draft.event_time || ""}</span>
                      <span><strong>Classification:</strong> {draft.event_classification || ""}</span>
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <h3 style={inlineSectionTitleStyle}>Investigation Team Members</h3>
                    <div style={teamTableStyle}>
                      <div style={correctiveHeaderCellStyle}>Name</div>
                      <div style={correctiveHeaderCellStyle}>Company</div>
                      <div style={correctiveHeaderCellStyle}>Position</div>
                      <div style={correctiveHeaderCellStyle}>Investigation Role</div>
                      <div style={correctiveHeaderCellStyle}>Remove</div>
                      {investigationTeamRows.map((member, index) => (
                        <React.Fragment key={`team-${index}`}>
                          <input style={teamCellInputStyle} value={member.name} onChange={(event) => updateInvestigationTeamRow(index, "name", event.target.value)} />
                          <input style={teamCellInputStyle} value={member.company} onChange={(event) => updateInvestigationTeamRow(index, "company", event.target.value)} />
                          <input style={teamCellInputStyle} value={member.position} onChange={(event) => updateInvestigationTeamRow(index, "position", event.target.value)} />
                          <input style={teamCellInputStyle} value={member.role} onChange={(event) => updateInvestigationTeamRow(index, "role", event.target.value)} />
                          <button type="button" style={smallDangerButtonStyle} onClick={() => removeInvestigationTeamRow(index)} disabled={investigationTeamRows.length === 1 || !canEditAinm}>Remove</button>
                        </React.Fragment>
                      ))}
                    </div>
                    <div style={buttonRowStyle}>
                      <button type="button" style={secondaryButtonStyle} onClick={addInvestigationTeamRow} disabled={!canEditAinm}>Add Team Member</button>
                    </div>
                  </div>
                  <div style={formGridStyle}>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <h3 style={inlineSectionTitleStyle}>Investigation Findings</h3>
                    </div>
                    <TextAreaField label="People - what did the people do that was incorrect? (Identify incorrect actions)" value={draft.investigation_findings_people || ""} onChange={(value) => updateDraft("investigation_findings_people", value)} />
                    <TextAreaField label="Equipment - what was defective about the equipment and/or materials? (Identify defective items)" value={draft.investigation_findings_equipment || ""} onChange={(value) => updateDraft("investigation_findings_equipment", value)} />
                    <TextAreaField label="Environment/Conditions - what was defective about the environment and/or conditions?" value={draft.investigation_findings_environment || ""} onChange={(value) => updateDraft("investigation_findings_environment", value)} />
                    <TextAreaField label="Process - what was defective about the procedure and systems? (Identify defective processes)" value={draft.investigation_findings_process || ""} onChange={(value) => updateDraft("investigation_findings_process", value)} />
                    <div style={{ gridColumn: "1 / -1" }}>
                      <h3 style={inlineSectionTitleStyle}>Reference documentation used as part of the investigation</h3>
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <div style={referenceDocumentsTableStyle}>
                        <div style={correctiveHeaderCellStyle}>No.</div>
                        <div style={correctiveHeaderCellStyle}>Document Title and Number</div>
                        <div style={correctiveHeaderCellStyle}>Remove</div>
                        {referenceDocumentRows.map((documentRef, index) => (
                          <React.Fragment key={`reference-doc-${index}`}>
                            <div style={correctiveNumberCellStyle}>{index + 1}</div>
                            <input
                              style={teamCellInputStyle}
                              value={documentRef}
                              onChange={(event) => updateReferenceDocumentRow(index, event.target.value)}
                              placeholder="Document title and number"
                            />
                            <button type="button" style={smallDangerButtonStyle} onClick={() => removeReferenceDocumentRow(index)} disabled={referenceDocumentRows.length === 1 || !canEditAinm}>Remove</button>
                          </React.Fragment>
                        ))}
                      </div>
                      <div style={buttonRowStyle}>
                        <button type="button" style={secondaryButtonStyle} onClick={addReferenceDocumentRow} disabled={!canEditAinm}>Add Reference Document</button>
                      </div>
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      {renderInlineActionPanel()}
                    </div>
                    <TextAreaField label="Further comments" value={draft.part2_further_comments || ""} onChange={(value) => updateDraft("part2_further_comments", value)} />
                    <div style={{ gridColumn: "1 / -1" }}>
                      <h3 style={inlineSectionTitleStyle}>Investigation Review and Sign-Off</h3>
                    </div>
                    <SignoffBlock
                      title="Location/Senior Representative"
                      name={draft.signoff_location_name || ""}
                      position={draft.signoff_location_position || ""}
                      date={draft.signoff_location_date || ""}
                      peopleOptions={peopleOptions}
                      onSelect={(value) => selectPersonForDraftName("signoff_location_name", "signoff_location_position", value)}
                      onPosition={(value) => updateDraft("signoff_location_position", value)}
                      onDate={(value) => updateDraft("signoff_location_date", value)}
                    />
                    <SignoffBlock
                      title="HSEQ Representative"
                      name={draft.signoff_hseq_name || ""}
                      position={draft.signoff_hseq_position || ""}
                      date={draft.signoff_hseq_date || ""}
                      peopleOptions={peopleOptions}
                      onSelect={(value) => selectPersonForDraftName("signoff_hseq_name", "signoff_hseq_position", value)}
                      onPosition={(value) => updateDraft("signoff_hseq_position", value)}
                      onDate={(value) => updateDraft("signoff_hseq_date", value)}
                    />
                    <SignoffBlock
                      title="Work/Project Manager"
                      name={draft.signoff_project_manager_name || ""}
                      position={draft.signoff_project_manager_position || ""}
                      date={draft.signoff_project_manager_date || ""}
                      peopleOptions={peopleOptions}
                      onSelect={(value) => selectPersonForDraftName("signoff_project_manager_name", "signoff_project_manager_position", value)}
                      onPosition={(value) => updateDraft("signoff_project_manager_position", value)}
                      onDate={(value) => updateDraft("signoff_project_manager_date", value)}
                    />
                    <SignoffBlock
                      title="Senior Management Team Representative"
                      name={draft.signoff_smt_name || ""}
                      position={draft.signoff_smt_position || ""}
                      date={draft.signoff_smt_date || ""}
                      peopleOptions={peopleOptions}
                      onSelect={(value) => selectPersonForDraftName("signoff_smt_name", "signoff_smt_position", value)}
                      onPosition={(value) => updateDraft("signoff_smt_position", value)}
                      onDate={(value) => updateDraft("signoff_smt_date", value)}
                    />
                  </div>
                  <div style={notificationEvidencePanelStyle}>
                    <div>
                      <strong>Part 2 Evidence</strong>
                      <p style={bodyTextStyle}>Upload investigation evidence, witness statements, reference documents, photographs, or close-out material used for the Part 2 report.</p>
                    </div>
                    <label style={uploadButtonStyle}>
                      {uploading ? "Uploading..." : "Upload Part 2 Evidence"}
                      <input type="file" multiple style={{ display: "none" }} onChange={(event) => void uploadEvidence(event, "Part 2")} disabled={uploading || !canEditAinm} />
                    </label>
                    <div style={evidenceListStyle}>
                      {selectedEvidence.filter((file) => file.stage === "Part 2").map((file) => (
                        <div key={file.id} style={evidenceItemStyle}>
                          <div>
                            <strong>{file.file_name}</strong>
                            <span>Part 2 | {formatFileSize(file.file_size)} | Uploaded {displayDateTime(file.uploaded_at)}</span>
                          </div>
                          <div style={buttonRowStyle}>
                            <button type="button" style={secondaryButtonStyle} onClick={() => void openEvidence(file)}>Open / Preview</button>
                            <button type="button" style={dangerButtonStyle} onClick={() => void deleteEvidence(file)} disabled={!canEditAinm}>Delete</button>
                          </div>
                        </div>
                      ))}
                      {!selectedEvidence.some((file) => file.stage === "Part 2") ? <div style={emptyBoxStyle}>No Part 2 evidence uploaded yet.</div> : null}
                    </div>
                  </div>
                  <div style={buttonRowStyle}>
                    <button type="button" style={reportButtonStyle} onClick={() => void generateWord("part2", draft)} disabled={Boolean(generatingStage)}>
                      {generatingStage === "part2" ? "Generating..." : "Generate Part 2 Report"}
                    </button>
                  </div>
                </DetailSection>
              ) : null}

              {detailTab === "actions" ? (
                <DetailSection>
                  <div style={compactActionsTabToolbarStyle}>
                    <Link href={buildActionHref(draft)} style={compactPrimaryLinkStyle}>Create Central Action</Link>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <h3 style={inlineSectionTitleStyle}>Linked Central Actions</h3>
                  </div>
                  <div style={compactLinkedActionListStyle}>
                    {selectedCentralActions.map((action) => (
                      <div key={action.id} style={compactLinkedActionCardStyle}>
                        <div style={compactLinkedActionInfoStyle}>
                          <strong>{action.action_number || "Action"} - {action.title || "Untitled action"}</strong>
                          <span style={compactLinkedActionMetaStyle}>{action.owner || "Unassigned"} | Due {displayDate(action.due_date)} | Priority {action.priority || "Not set"}</span>
                        </div>
                        <div style={compactLinkedActionControlsStyle}>
                          <StatusPill status={action.status || "Open"} />
                          <Link href={`/actions?actionId=${encodeURIComponent(action.id)}`} style={compactActionLinkStyle}>Open</Link>
                        </div>
                      </div>
                    ))}
                    {!selectedCentralActions.length ? <div style={emptyBoxStyle}>No central Action Management actions linked to this AINM yet.</div> : null}
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <h3 style={inlineSectionTitleStyle}>AINM Tracker Actions</h3>
                  </div>
                  <div style={compactLinkedActionListStyle}>
                    {selectedActions.map((action) => (
                      <div key={action.id} style={compactLinkedActionCardStyle}>
                        <div style={compactLinkedActionInfoStyle}>
                          <strong>{action.tracker_no || "Action"} - {action.action}</strong>
                          <span style={compactLinkedActionMetaStyle}>{action.assigned || "Unassigned"} | Raised {displayDate(action.date_raised)} | Closed {displayDate(action.date_closed)}</span>
                        </div>
                        <div style={compactLinkedActionControlsStyle}>
                          <StatusPill status={action.status || ""} />
                          <Link href={buildActionHref(draft)} style={compactActionLinkStyle}>Create Central</Link>
                        </div>
                      </div>
                    ))}
                    {!selectedActions.length ? <div style={emptyBoxStyle}>No tracker actions linked yet.</div> : null}
                  </div>
                </DetailSection>
              ) : null}

              {detailTab === "evidence" ? (
                <DetailSection>
                  <div style={evidenceToolbarStyle}>
                    <select style={evidenceStageSelectStyle} value={evidenceStage} onChange={(e) => setEvidenceStage(e.target.value)}>
                      {["General", "Notification", "Part 1", "Part 2", "Action Evidence"].map((stage) => <option key={stage} value={stage}>{stage}</option>)}
                    </select>
                    <label style={compactUploadButtonStyle}>
                      {uploading ? "Uploading..." : "Upload Evidence"}
                      <input type="file" multiple style={{ display: "none" }} onChange={(event) => void uploadEvidence(event)} disabled={uploading || !canEditAinm} />
                    </label>
                  </div>
                  <div style={compactEvidenceListStyle}>
                    {selectedEvidence.map((file) => (
                      <div key={file.id} style={compactEvidenceItemStyle}>
                        <div style={evidenceFileInfoStyle}>
                          <strong style={evidenceFileNameStyle}>{file.file_name}</strong>
                          <span style={evidenceMetaStyle}>{file.stage} | {formatFileSize(file.file_size)} | Uploaded {displayDateTime(file.uploaded_at)}</span>
                        </div>
                        <div style={compactEvidenceActionsStyle}>
                          <button type="button" style={compactSecondaryButtonStyle} onClick={() => void openEvidence(file)}>Open / Preview</button>
                          <button type="button" style={compactDangerButtonStyle} onClick={() => void deleteEvidence(file)} disabled={!canEditAinm}>Delete</button>
                        </div>
                      </div>
                    ))}
                    {!selectedEvidence.length ? <div style={emptyBoxStyle}>No evidence uploaded yet.</div> : null}
                  </div>
                </DetailSection>
              ) : null}

              {detailTab === "reports" ? (
                <DetailSection>
                  <div style={reportButtonGridStyle}>
                    <button type="button" style={reportButtonStyle} onClick={() => void generateWord("notification", draft)} disabled={Boolean(generatingStage)}>
                      {generatingStage === "notification" ? "Generating..." : "Generate Initial Notification"}
                    </button>
                    <button type="button" style={reportButtonStyle} onClick={() => void generateWord("part1", draft)} disabled={Boolean(generatingStage)}>
                      {generatingStage === "part1" ? "Generating..." : "Generate Part 1 Report"}
                    </button>
                    <button type="button" style={reportButtonStyle} onClick={() => void generateWord("part2", draft)} disabled={Boolean(generatingStage)}>
                      {generatingStage === "part2" ? "Generating..." : "Generate Part 2 Report"}
                    </button>
                    <button type="button" style={compiledReportButtonStyle} onClick={() => void generateCompiledPdf(draft)} disabled={Boolean(generatingStage) || !canEditAinm}>
                      {generatingStage === "compiled-pdf" ? "Generating..." : "Generate Complete AINM PDF"}
                    </button>
                  </div>
                </DetailSection>
              ) : null}

              <div style={detailFooterStyle}>
                <button type="button" style={primaryButtonStyle} onClick={() => void saveDraft()} disabled={saving || !canEditAinm}>{saving ? "Saving..." : "Save AINM"}</button>
                <button type="button" style={dangerButtonStyle} onClick={() => void deleteRecord(draft)} disabled={!canEditAinm}>Delete AINM</button>
              </div>
            </SectionCard>
            </div>
          ) : null}
        </section>
      ) : null}

      {activeView === "reports" ? (
        <SectionCard title="AINM Reports" subtitle="Compiled PDF outputs only. Generate the final pack from the selected record's Reports tab.">
          <div className="ims-filter-panel" style={toolbarStyle}>
            <input style={searchStyle} value="" readOnly placeholder={`${groupedCompiledPdfReports.length} AINM report record${groupedCompiledPdfReports.length === 1 ? "" : "s"} / ${filteredCompiledPdfReports.length} generated PDF${filteredCompiledPdfReports.length === 1 ? "" : "s"}`} />
            <button type="button" style={showReportFilters ? secondaryButtonStyle : primaryButtonStyle} onClick={() => setShowReportFilters((current) => !current)}>
              {showReportFilters ? "Hide Filters" : "Show Filters"}
            </button>
          </div>
          {showReportFilters ? (
          <div className="ims-filter-panel" style={toolbarStyle}>
            <select style={filterStyle} value={reportTypeFilter} onChange={(event) => setReportTypeFilter(event.target.value as "" | "IR" | "AR")}>
              <option value="">All AINM Types</option>
              <option value="IR">Incident Reports (IR)</option>
              <option value="AR">Accident Reports (AR)</option>
            </select>
          </div>
          ) : null}
          <div style={registerTableWrapStyle}>
            <table style={registerTableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>AINM No.</th>
                  <th style={thStyle}>Title</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Versions</th>
                  <th style={thStyle}>Latest Generated</th>
                  <th style={thStyle}>Latest Action</th>
                </tr>
              </thead>
              <tbody>
                {groupedCompiledPdfReports.map((group) => {
                  const record = group.record;
                  const latestReport = group.reports[0];
                  return (
                    <tr
                      key={group.key}
                      style={selectedReportGroupKey === group.key ? selectedRowStyle : trStyle}
                      onClick={() => setSelectedReportGroupKey(group.key)}
                    >
                      <td style={tdStrongStyle}>{record?.ainm_number || "-"}</td>
                      <td style={tdStyle}>{record?.title || "-"}</td>
                      <td style={tdStyle}>{record?.ainm_number?.startsWith("AR") ? "Accident" : record?.ainm_number?.startsWith("IR") ? "Incident" : "-"}</td>
                      <td style={tdStyle}>{group.reports.length} version{group.reports.length === 1 ? "" : "s"}</td>
                      <td style={tdStyle}>{displayDateTime(latestReport.generated_at)}</td>
                      <td style={tdStyle}>
                        <button
                          type="button"
                          style={secondaryButtonStyle}
                          onClick={(event) => {
                            event.stopPropagation();
                            void openGeneratedReport(latestReport);
                          }}
                        >
                          Open Latest PDF
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!groupedCompiledPdfReports.length ? <div style={emptyBoxStyle}>No compiled PDF reports match the current filter.</div> : null}
          </div>

          {selectedReportGroup ? (
            <div style={reportHistoryPanelStyle}>
              <div style={sectionHeaderStyle}>
                <h3 style={sectionTitleStyle}>{selectedReportGroup.record?.ainm_number || "AINM"} Report Version History</h3>
                <p style={sectionSubtitleStyle}>{selectedReportGroup.record?.title || "Generated compiled PDF versions for this AINM record."}</p>
              </div>
              <div style={registerTableWrapStyle}>
                <table style={registerTableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Version</th>
                      <th style={thStyle}>PDF File</th>
                      <th style={thStyle}>Generated</th>
                      <th style={thStyle}>Size</th>
                      <th style={thStyle}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReportGroup.reports.map((report, index) => {
                      const versionNumber = selectedReportGroup.reports.length - index;
                      return (
                        <tr key={report.id}>
                          <td style={tdStrongStyle}>Version {versionNumber}</td>
                          <td style={tdStyle}>{report.file_name || "Compiled AINM PDF"}</td>
                          <td style={tdStyle}>{displayDateTime(report.generated_at)}</td>
                          <td style={tdStyle}>{formatFileSize(report.file_size)}</td>
                          <td style={tdStyle}>
                            <button type="button" style={primaryButtonStyle} onClick={() => void openGeneratedReport(report)}>
                              Open PDF
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : groupedCompiledPdfReports.length ? (
            <div style={emptyBoxStyle}>Select an AINM report row to view all generated PDF versions.</div>
          ) : null}
        </SectionCard>
      ) : null}
    </main>
  );
}

function StatusRow({ record, onChange }: { record: AINMRecord; onChange: <K extends keyof AINMRecord>(key: K, value: AINMRecord[K]) => void }) {
  return (
    <div style={stageGridStyle}>
      <Field label="Notification Status"><select style={inputStyle} value={record.notification_status} onChange={(e) => onChange("notification_status", e.target.value as StageStatus)}>{stageStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></Field>
      <Field label="Part 1 Status"><select style={inputStyle} value={record.part1_status} onChange={(e) => onChange("part1_status", e.target.value as StageStatus)}>{stageStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></Field>
      <Field label="Part 2 Status"><select style={inputStyle} value={record.part2_status} onChange={(e) => onChange("part2_status", e.target.value as StageStatus)}>{stageStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></Field>
      <Field label="Overall Status"><select style={inputStyle} value={record.overall_status} onChange={(e) => onChange("overall_status", e.target.value as OverallStatus)}>{overallStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></Field>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone = getStageTone(status);
  return <span style={{ ...pillStyle, background: tone.bg, color: tone.color }}>{status || "Not set"}</span>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label style={fieldStyle}><span style={labelStyle}>{label}</span>{children}</label>;
}

function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div style={{ gridColumn: "1 / -1" }}><Field label={label}><textarea style={textareaStyle} value={value} onChange={(e) => onChange(e.target.value)} /></Field></div>;
}

function SignoffBlock({
  title,
  name,
  position,
  date,
  peopleOptions,
  onSelect,
  onPosition,
  onDate,
}: {
  title: string;
  name: string;
  position: string;
  date: string;
  peopleOptions: PeopleOption[];
  onSelect: (value: string) => void;
  onPosition: (value: string) => void;
  onDate: (value: string) => void;
}) {
  return (
    <div style={signoffBlockStyle}>
      <h4 style={signoffBlockTitleStyle}>{title}</h4>
      <Field label="Name">
        <select style={inputStyle} value={peopleOptions.find((person) => person.name === name)?.id || name || ""} onChange={(event) => onSelect(event.target.value)}>
          <option value="">Select person</option>
          {name && !peopleOptions.some((person) => person.name === name) ? <option value={name}>{name} (saved value)</option> : null}
          {peopleOptions.map((person) => <option key={person.id} value={person.id}>{[person.name, person.role].filter(Boolean).join(" - ")}</option>)}
        </select>
      </Field>
      <Field label="Position"><input style={inputStyle} value={position} onChange={(event) => onPosition(event.target.value)} /></Field>
      <Field label="Date"><input type="date" style={inputStyle} value={date} onChange={(event) => onDate(event.target.value)} /></Field>
    </div>
  );
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const [mobileCollapsed, setMobileCollapsed] = useState(false);
  return (
    <section className="ainm-section-card" style={sectionStyle}>
      <div className="ainm-section-header" style={sectionHeaderStyle}>
        <div>
          <h2 style={sectionTitleStyle}>{title}</h2>
          {subtitle ? <p style={sectionSubtitleStyle}>{subtitle}</p> : null}
        </div>
        <button
          type="button"
          className="ainm-mobile-toggle"
          aria-expanded={!mobileCollapsed}
          onClick={() => setMobileCollapsed((value) => !value)}
        >
          {mobileCollapsed ? "Expand" : "Collapse"}
        </button>
      </div>
      <div className={mobileCollapsed ? "ainm-section-content ainm-section-content--collapsed" : "ainm-section-content"}>{children}</div>
    </section>
  );
}

function DetailSection({ children }: { children: ReactNode }) {
  return <div style={detailSectionStyle}>{children}</div>;
}

function DashboardPanel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section style={panelStyle}>
      <h2 style={panelTitleStyle}>{title}</h2>
      {subtitle ? <p style={panelSubtitleStyle}>{subtitle}</p> : null}
      {children}
    </section>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div style={miniMetricStyle}>
      <span style={miniMetricLabelStyle}>{label}</span>
      <strong style={miniMetricValueStyle}>{value}</strong>
    </div>
  );
}

function ProgressBars({
  rows,
  total,
  emptyText = "No data for this selection.",
}: {
  rows: { label: string; value: number; color: string; onClick?: () => void }[];
  total: number;
  emptyText?: string;
}) {
  const visibleRows = rows.filter((row) => row.value > 0 || total > 0);
  if (!visibleRows.length) return <div style={emptyBoxStyle}>{emptyText}</div>;
  return (
    <div style={progressListStyle}>
      {visibleRows.map((row) => {
        const width = Math.max(4, percentage(row.value, total));
        return (
          <button key={row.label} type="button" style={progressRowStyle} onClick={row.onClick}>
            <span style={progressLabelRowStyle}>
              <strong>{row.label}</strong>
              <span>{row.value} | {percentage(row.value, total)}%</span>
            </span>
            <span style={progressTrackStyle}>
              <span style={{ ...progressFillStyle, width: `${row.value ? width : 0}%`, background: row.color }} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

function DonutChart({ total, segments }: { total: number; segments: { label: string; value: number; color: string }[] }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const segmentSlices = segments.reduce<Array<{ segment: { label: string; value: number; color: string }; length: number; offset: number }>>(
    (slices, segment) => {
      const previousOffset = slices.reduce((sum, slice) => sum + slice.length, 0);
      const length = total ? (segment.value / total) * circumference : 0;
      return [...slices, { segment, length, offset: previousOffset }];
    },
    [],
  );
  return (
    <div style={donutWrapStyle}>
      <svg width="170" height="170" viewBox="0 0 120 120" role="img" aria-label="AINM type split">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#D0D0CE" strokeWidth="17" />
        {segmentSlices.map(({ segment, length, offset }) => (
            <circle
              key={segment.label}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth="17"
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
            />
        ))}
        <text x="60" y="56" textAnchor="middle" style={{ fontSize: 19, fontWeight: 900, fill: "#000000" }}>{total}</text>
        <text x="60" y="72" textAnchor="middle" style={{ fontSize: 8, fontWeight: 800, fill: "#53565A" }}>AINMs</text>
      </svg>
    </div>
  );
}

function ColumnChart({ rows }: { rows: { label: string; value: number; color: string }[] }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <div style={columnChartStyle}>
      {rows.map((row) => (
        <div key={row.label} style={columnItemStyle}>
          <span style={columnValueStyle}>{row.value || ""}</span>
          <span style={{ ...columnBarStyle, height: `${Math.max(4, (row.value / max) * 120)}px`, background: row.value ? row.color : "#D0D0CE" }} />
          <span style={columnLabelStyle}>{row.label}</span>
        </div>
      ))}
    </div>
  );
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
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
};
const backLinkStyle: CSSProperties = { color: "#005670", fontWeight: 700, textDecoration: "none" };
const statusBannerStyle: CSSProperties = { background: "white", borderRadius: 12, padding: "12px 16px", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)", color: "#000000" };
const viewNavStyle: CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 };
const viewButtonStyle: CSSProperties = { background: "#ECECE7", color: "#000000", border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 800, cursor: "pointer", minHeight: "44px", display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1.2, boxSizing: "border-box" };
const activeViewButtonStyle: CSSProperties = { ...viewButtonStyle, background: "#005670", color: "white" };
const kpiGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 16, marginBottom: 20 };
const dashboardGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 20 };
const dashboardStoryHeaderStyle: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", background: "white", borderRadius: 18, padding: 20, boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)", marginBottom: 20 };
const dashboardStoryTitleStyle: CSSProperties = { margin: 0, color: "#000000", fontSize: 22 };
const dashboardStoryTextStyle: CSSProperties = { margin: "6px 0 0", color: "#53565A", lineHeight: 1.45, fontSize: 14 };
const dashboardYearFilterStyle: CSSProperties = { minWidth: 220, display: "grid", gap: 6 };
const dashboardVisualGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 18 };
const panelStyle: CSSProperties = { background: "white", borderRadius: 18, padding: 20, boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)", minHeight: 260 };
const panelTitleStyle: CSSProperties = { margin: 0, color: "#000000", fontSize: 17 };
const panelSubtitleStyle: CSSProperties = { margin: "5px 0 14px", color: "#53565A", fontSize: 12, lineHeight: 1.45, fontWeight: 700 };
const sectionStyle: CSSProperties = { background: "white", borderRadius: 18, padding: 20, boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)", marginBottom: 20 };
const sectionHeaderStyle: CSSProperties = { background: "#005670", borderRadius: 10, padding: "12px 14px", marginBottom: 16 };
const sectionTitleStyle: CSSProperties = { margin: 0, color: "white", fontSize: 18 };
const sectionSubtitleStyle: CSSProperties = { margin: "4px 0 0", color: "rgba(255,255,255,0.82)", fontSize: 13 };
const bodyTextStyle: CSSProperties = { color: "#53565A", lineHeight: 1.55, margin: 0 };
const miniMetricStyle: CSSProperties = {
  border: "1px solid #D0D0CE",
  borderRadius: 12,
  padding: "12px 14px",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: 6,
  alignContent: "center",
  minHeight: 66,
  color: "#000000",
  background: "#ffffff",
};
const miniMetricLabelStyle: CSSProperties = {
  color: "#53565A",
  fontSize: 12,
  fontWeight: 800,
  lineHeight: 1.2,
};
const miniMetricValueStyle: CSSProperties = {
  color: "#000000",
  fontSize: 20,
  fontWeight: 900,
  lineHeight: 1.1,
  whiteSpace: "nowrap",
};
const chartLegendGridStyle: CSSProperties = { display: "grid", gap: 8, marginTop: 6 };
const dashboardFigureStripStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginBottom: 14 };
const donutWrapStyle: CSSProperties = { display: "flex", justifyContent: "center", alignItems: "center", minHeight: 170 };
const progressListStyle: CSSProperties = { display: "grid", gap: 12 };
const progressRowStyle: CSSProperties = { display: "grid", gap: 7, border: "none", background: "transparent", padding: 0, textAlign: "left", cursor: "pointer" };
const progressLabelRowStyle: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, color: "#000000", fontSize: 13 };
const progressTrackStyle: CSSProperties = { height: 12, background: "#D0D0CE", borderRadius: 999, overflow: "hidden" };
const progressFillStyle: CSSProperties = { display: "block", height: "100%", borderRadius: 999 };
const columnChartStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: 6, alignItems: "end", minHeight: 178, paddingTop: 12 };
const columnItemStyle: CSSProperties = { display: "grid", justifyItems: "center", alignItems: "end", gap: 5, minWidth: 0 };
const columnValueStyle: CSSProperties = { color: "#53565A", fontSize: 11, minHeight: 14, fontWeight: 800 };
const columnBarStyle: CSSProperties = { width: "72%", borderRadius: "8px 8px 2px 2px", minHeight: 4 };
const columnLabelStyle: CSSProperties = { color: "#53565A", fontSize: 10, fontWeight: 800 };
const qrAccessWrapStyle: CSSProperties = { display: "grid", gridTemplateColumns: "132px minmax(0, 1fr)", gap: 16, alignItems: "center" };
const qrBoxStyle: CSSProperties = { width: 132, height: 132, border: "1px solid #D0D0CE", borderRadius: 16, background: "#ffffff", display: "grid", placeItems: "center", padding: 8, boxSizing: "border-box" };
const qrImageStyle: CSSProperties = { width: "100%", height: "100%", objectFit: "contain", display: "block" };
const qrCopyStyle: CSSProperties = { display: "grid", gap: 9, color: "#53565A", fontSize: 13, lineHeight: 1.45 };
const reportReadinessStyle: CSSProperties = { display: "grid", placeItems: "center", minHeight: 145, border: "1px solid #D0D0CE", background: "#ECECE7", color: "#005670", borderRadius: 16, cursor: "pointer", marginBottom: 14 };
const externalNoticeStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "center",
  border: "1px solid #D0D0CE",
  background: "#ECECE7",
  color: "#000000",
  borderRadius: 14,
  padding: "12px 14px",
  marginBottom: 16,
  fontSize: 13,
  lineHeight: 1.45,
};
const formGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 };
const stageGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginBottom: 16 };
const fieldStyle: CSSProperties = { display: "grid", gap: 6 };
const labelStyle: CSSProperties = { color: "#53565A", fontSize: 12, fontWeight: 900 };
const helperTextStyle: CSSProperties = { color: "#53565A", fontSize: 12, fontStyle: "italic", fontWeight: 700 };
const inlineSectionTitleStyle: CSSProperties = { margin: "4px 0 0", background: "#005670", color: "white", borderRadius: 10, padding: "11px 14px", fontSize: 16 };
const carryForwardPanelStyle: CSSProperties = { background: "white", border: "1px solid #D0D0CE", borderRadius: 14, padding: 16, marginBottom: 16 };
const carryForwardTitleStyle: CSSProperties = { margin: "0 0 12px", color: "#000000", fontSize: 18 };
const carryForwardGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10, color: "#53565A", fontSize: 13 };
const inputStyle: CSSProperties = { width: "100%", minHeight: 42, border: "1px solid #D0D0CE", borderRadius: 10, padding: "10px 12px", fontSize: 14, boxSizing: "border-box", color: "#000000", background: "white" };
const textareaStyle: CSSProperties = { ...inputStyle, minHeight: 96, resize: "vertical", lineHeight: 1.45 };
const buttonRowStyle: CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 14 };
const primaryButtonStyle: CSSProperties = { border: "none", background: "#005670", color: "white", borderRadius: 10, padding: "11px 14px", fontWeight: 900, cursor: "pointer" };
const secondaryButtonStyle: CSSProperties = { border: "1px solid #D0D0CE", background: "#D0D0CE", color: "#000000", borderRadius: 10, padding: "10px 13px", fontWeight: 800, cursor: "pointer" };
const dangerButtonStyle: CSSProperties = { border: "none", background: "#F93822", color: "white", borderRadius: 10, padding: "10px 13px", fontWeight: 900, cursor: "pointer" };
const smallDangerButtonStyle: CSSProperties = { ...dangerButtonStyle, padding: "7px 9px", fontSize: 12, alignSelf: "center" };
const uploadButtonStyle: CSSProperties = { ...primaryButtonStyle, display: "inline-flex", alignItems: "center", justifyContent: "center" };
const importToolbarStyle: CSSProperties = { display: "grid", gridTemplateColumns: "minmax(220px, auto) minmax(220px, 320px)", gap: 14, alignItems: "end", marginBottom: 14 };
const linkButtonStyle: CSSProperties = { ...primaryButtonStyle, textDecoration: "none" };
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
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
};
const searchStyle: CSSProperties = { ...inputStyle, minHeight: 44 };
const filterStyle: CSSProperties = { ...inputStyle, minHeight: 44 };
const tableInfoRowStyle: CSSProperties = {
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
const registerLayoutStyle: CSSProperties = { display: "grid", gap: 20 };
const registerTableWrapStyle: CSSProperties = {
  overflowX: "auto",
  border: "1px solid #D0D0CE",
  borderRadius: "16px",
  background: "#ffffff",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
};
const registerTableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  background: "#ffffff",
  minWidth: 960,
  fontSize: "13px",
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
const reportHistoryPanelStyle: CSSProperties = {
  border: "1px solid #D0D0CE",
  borderRadius: 16,
  padding: 14,
  marginTop: 16,
  background: "#ECECE7",
};
const trStyle: CSSProperties = { cursor: "pointer" };
const selectedRowStyle: CSSProperties = { cursor: "pointer", background: "#eef7f8", boxShadow: "inset 4px 0 0 #005670" };
const pillStyle: CSSProperties = { display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "5px 9px", fontSize: 12, fontWeight: 900 };
const detailTabStyle: CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 };
const detailSectionStyle: CSSProperties = {
  border: "1px solid #D0D0CE",
  borderRadius: "18px",
  padding: "18px",
  background: "linear-gradient(180deg, #ffffff 0%, #ECECE7 100%)",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
  minWidth: 0,
};
const detailFooterStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 };
const checkGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, margin: "16px 0" };
const checkItemStyle: CSSProperties = { display: "flex", gap: 8, alignItems: "center", background: "white", border: "1px solid #D0D0CE", borderRadius: 10, padding: "10px 12px", color: "#000000", fontWeight: 700, fontSize: 13 };
const externalCheckboxStyle: CSSProperties = {
  gridColumn: "1 / -1",
  display: "flex",
  alignItems: "center",
  gap: 10,
  border: "1px solid #D0D0CE",
  background: "#ECECE7",
  borderRadius: 12,
  padding: "12px 14px",
  color: "#000000",
  fontWeight: 800,
  fontSize: 13,
};
const correctiveActionsTableStyle: CSSProperties = { display: "grid", gridTemplateColumns: "110px minmax(0, 1fr) 100px", border: "1px solid #D0D0CE", borderRadius: 12, overflow: "hidden", background: "white" };
const referenceDocumentsTableStyle: CSSProperties = { display: "grid", gridTemplateColumns: "70px minmax(0, 1fr) 100px", border: "1px solid #D0D0CE", borderRadius: 12, overflow: "hidden", background: "white" };
const correctiveHeaderCellStyle: CSSProperties = { background: "#005670", color: "white", padding: "10px 12px", fontWeight: 900, fontSize: 13 };
const correctiveNumberCellStyle: CSSProperties = { padding: "9px 12px", borderTop: "1px solid #D0D0CE", color: "#000000", fontWeight: 900, background: "#ECECE7" };
const correctiveTextareaStyle: CSSProperties = { width: "100%", minHeight: 38, border: "none", borderTop: "1px solid #D0D0CE", borderLeft: "1px solid #D0D0CE", borderRight: "1px solid #D0D0CE", padding: "9px 12px", fontSize: 14, lineHeight: 1.4, resize: "vertical", boxSizing: "border-box", color: "#000000", background: "white" };
const teamTableStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr)) 100px", border: "1px solid #D0D0CE", borderRadius: 12, overflow: "hidden", background: "white", marginTop: 12 };
const teamCellInputStyle: CSSProperties = { minHeight: 40, border: "none", borderTop: "1px solid #D0D0CE", borderRight: "1px solid #D0D0CE", padding: "9px 10px", fontSize: 14, boxSizing: "border-box", color: "#000000", background: "white" };
const signoffBlockStyle: CSSProperties = { gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, border: "1px solid #D0D0CE", borderRadius: 14, padding: 14, background: "white" };
const signoffBlockTitleStyle: CSSProperties = { gridColumn: "1 / -1", margin: 0, background: "#D0D0CE", borderRadius: 8, padding: "10px 12px", color: "#000000", fontSize: 15 };
const inlineActionPanelStyle: CSSProperties = { display: "grid", gap: 14, padding: 16, border: "1px solid #D0D0CE", borderRadius: 14, background: "#ECECE7" };
const inlineActionButtonRowStyle: CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 6 };
const compactActionsTabToolbarStyle: CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 };
const compactPrimaryButtonStyle: CSSProperties = { ...primaryButtonStyle, minHeight: 38, padding: "8px 12px", fontSize: 13 };
const compactPrimaryLinkStyle: CSSProperties = { ...compactPrimaryButtonStyle, display: "inline-flex", alignItems: "center", textDecoration: "none" };
const compactLinkedActionListStyle: CSSProperties = { display: "grid", gap: 7 };
const compactLinkedActionCardStyle: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", background: "white", border: "1px solid #D0D0CE", borderRadius: 10, padding: "9px 11px", color: "#000000" };
const compactLinkedActionInfoStyle: CSSProperties = { display: "grid", gap: 3, flex: "1 1 420px", minWidth: 0, fontSize: 13 };
const compactLinkedActionMetaStyle: CSSProperties = { color: "#53565A", fontSize: 12, lineHeight: 1.3 };
const compactLinkedActionControlsStyle: CSSProperties = { display: "flex", gap: 7, alignItems: "center" };
const compactActionLinkStyle: CSSProperties = { ...secondaryButtonStyle, display: "inline-flex", alignItems: "center", minHeight: 32, padding: "5px 9px", borderRadius: 8, fontSize: 12, textDecoration: "none" };
const emptyBoxStyle: CSSProperties = { border: "1px dashed #D0D0CE", borderRadius: 12, padding: 16, color: "#53565A", background: "white" };
const evidenceListStyle: CSSProperties = { display: "grid", gap: 12 };
const notificationEvidencePanelStyle: CSSProperties = { display: "grid", gap: 12, marginTop: 16, border: "1px solid #D0D0CE", borderRadius: 14, padding: 16, background: "white" };
const addPersonPanelStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginTop: 16, border: "1px dashed #D0D0CE", borderRadius: 14, padding: 16, background: "#ECECE7" };
const evidenceItemStyle: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", border: "1px solid #D0D0CE", borderRadius: 12, padding: 14, background: "white", color: "#000000" };
const evidenceToolbarStyle: CSSProperties = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 };
const evidenceStageSelectStyle: CSSProperties = { ...inputStyle, minHeight: 38, height: 38, flex: "1 1 280px", padding: "7px 10px" };
const compactUploadButtonStyle: CSSProperties = { ...primaryButtonStyle, display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 38, padding: "8px 13px" };
const compactEvidenceListStyle: CSSProperties = { display: "grid", gap: 8 };
const compactEvidenceItemStyle: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap", border: "1px solid #D0D0CE", borderRadius: 10, padding: "9px 11px", background: "white", color: "#000000" };
const evidenceFileInfoStyle: CSSProperties = { display: "grid", gap: 3, flex: "1 1 320px", minWidth: 0 };
const evidenceFileNameStyle: CSSProperties = { fontSize: 13, lineHeight: 1.3, overflowWrap: "anywhere" };
const evidenceMetaStyle: CSSProperties = { color: "#53565A", fontSize: 12, lineHeight: 1.3 };
const compactEvidenceActionsStyle: CSSProperties = { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" };
const compactSecondaryButtonStyle: CSSProperties = { ...secondaryButtonStyle, minHeight: 36, padding: "7px 11px", fontSize: 13 };
const compactDangerButtonStyle: CSSProperties = { ...dangerButtonStyle, minHeight: 36, padding: "7px 11px", fontSize: 13 };
const reportButtonGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14 };
const reportButtonStyle: CSSProperties = { border: "1px solid #D0D0CE", background: "#ECECE7", color: "#005670", borderRadius: 12, padding: "16px 14px", fontWeight: 900, cursor: "pointer" };
const compiledReportButtonStyle: CSSProperties = { ...reportButtonStyle, background: "#005670", borderColor: "#005670", color: "white" };
const previewGridStyle: CSSProperties = { display: "grid", gap: 10, marginBottom: 14 };
const previewCardStyle: CSSProperties = { display: "grid", gap: 4, border: "1px solid #D0D0CE", background: "#ECECE7", borderRadius: 12, padding: 12, color: "#000000" };

"use client";

export const dynamic = "force-dynamic";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CSSProperties, ReactNode } from "react";
import { ModuleSectionHeader } from "../../src/components/ModuleSectionHeader";
import { QualityKpiCard } from "../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../src/components/QualityPageHero";
import { useImsPermissions } from "../../src/components/ImsPermissions";
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
  linked_ainm_id: string | null;
  linked_ainm_number: string | null;
  linked_hse_inspection_id: string | null;
  linked_hse_inspection_number: string | null;
  linked_observation_id: string | null;
  linked_observation_number: string | null;
  close_out_comments: string | null;
  raised_by_email: string | null;
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
  owner: string;
  status: string;
  due_date: string;
};

type NcrCapaOption = {
  type: "NCR" | "CAPA";
  id: string;
  number: string;
  title: string;
  owner: string;
  status: string;
  due_date: string;
  project: string;
};

type MyWorkItemSource = "Action" | "NCR" | "Audit Finding" | "AINM" | "Observation";

type MyWorkItem = {
  id: string;
  source: MyWorkItemSource;
  number: string;
  title: string;
  project: string;
  status: string | null;
  due_date: string | null;
  action: ActionItem | null;
  href: string | null;
};

type MocOption = {
  id: string;
  number: string;
  title: string;
};

type AinmOption = {
  id: string;
  number: string;
  title: string;
  project: string;
  event_date: string;
  classification: string;
  owner: string;
  status: string;
};

type AssetOption = {
  id: string;
  asset_code: string;
  name: string;
};

type AssetInspectionOption = {
  id: string;
  asset_id: string;
  inspection_number: string;
  inspection_date: string;
  result: string;
};

type AssetMaintenanceOption = {
  id: string;
  asset_id: string;
  maintenance_number: string;
  maintenance_date: string;
  description: string;
};

type AssetCalibrationOption = {
  id: string;
  asset_id: string;
  reference: string;
  certificate_number: string;
  calibration_date: string;
  calibration_due_date: string;
};

type HseInspectionOption = {
  id: string;
  inspection_number: string;
  title: string;
  form_title: string;
  project_work_scope: string;
  area_zone: string;
  inspection_date: string;
};

type ObservationOption = {
  id: string;
  observation_number: string;
  title: string;
  project: string;
  site_location: string;
  observation_date: string;
  observation_type: string;
  assigned_to: string;
  status: string;
};

type ActionPerson = {
  id: string;
  name: string;
  email: string | null;
  department: string | null;
  active: boolean | null;
};

type QuickFilter = "" | "my" | "overdue" | "dueWeek" | "highPriority";

type ActionView = "dashboard" | "register" | "create" | "my" | "priority" | "bulk";
type MyActionFilter = "all" | "open" | "closed" | "overdue" | "dueWeek";

type ActionImportRow = {
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

type ChartDatum = {
  name: string;
  value: number;
  filterValue?: string;
};

type RechartsClickState = {
  activePayload?: Array<{
    payload?: {
      name?: string;
    };
  }>;
};

type TrendDatum = {
  name: string;
  closed: number;
};

type RegisterDrilldownOptions = {
  search?: string;
  status?: string;
  priority?: string;
  owner?: string;
  project?: string;
  source?: string;
  department?: string;
  overdue?: boolean;
  openOnly?: boolean;
  closedOnly?: boolean;
  quickFilter?: QuickFilter;
  evidenceOnly?: boolean;
  linkedIssuesOnly?: boolean;
  dueStart?: number;
  dueWindow?: number;
  noDueDateOnly?: boolean;
  createdMonth?: string;
  closedMonth?: string;
};

type LinkedRecordChip = {
  label: string;
  tone: "teal" | "blue" | "purple" | "amber" | "red" | "slate";
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
  linked_ainm_id: string;
  linked_ainm_number: string;
  linked_hse_inspection_id: string;
  linked_hse_inspection_number: string;
  linked_observation_id: string;
  linked_observation_number: string;
  close_out_comments: string;
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
  linked_ainm_id: "",
  linked_ainm_number: "",
  linked_hse_inspection_id: "",
  linked_hse_inspection_number: "",
  linked_observation_id: "",
  linked_observation_number: "",
  close_out_comments: "",
};

const actionSourceOptions = [
  "Manual",
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
  "Quality",
  "Survey",
  "HSE",
  "HSEQ",
] as const;

const chartColours = ["#005670", "#63B1BC", "#53565A", "#FFAD00", "#F93822", "#53565A", "#005670"];

const actionViews: Array<{ id: ActionView; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "register", label: "Action Register" },
  { id: "create", label: "Create Action" },
  { id: "my", label: "My Actions" },
  { id: "priority", label: "Overdue / Priority" },
  { id: "bulk", label: "Bulk Upload" },
];

function isActionView(value: string): value is ActionView {
  return actionViews.some((view) => view.id === value);
}

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

function getNextBulkActionNumbers(actions: ActionItem[], count: number) {
  const used = new Set(
    actions
      .map((action) => extractActionNumber(action.action_number))
      .filter((num): num is number => num !== null && num > 0)
  );
  const numbers: string[] = [];
  let next = 1;

  while (numbers.length < count) {
    if (!used.has(next)) {
      numbers.push(formatActionNumber(next));
      used.add(next);
    }
    next += 1;
  }

  return numbers;
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

function getRawImportCell(row: Record<string, unknown>, candidates: string[]) {
  const normalizedCandidates = candidates.map(normalizeImportHeader);
  const entry = Object.entries(row).find(([key]) => normalizedCandidates.includes(normalizeImportHeader(key)));
  return entry?.[1] ?? "";
}

function normalizeImportDate(value: unknown) {
  if (value === null || value === undefined || value === "") return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
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
  const parsedDate = new Date(text);
  return Number.isNaN(parsedDate.getTime()) ? "" : parsedDate.toISOString().slice(0, 10);
}

function titleCaseName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((part) => (part ? `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}` : part))
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
  const match = ["Low", "Medium", "High"].find((option) => option.toLowerCase() === value.trim().toLowerCase());
  return match || "Medium";
}

function normalizeImportStatus(value: string) {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return "Open";
  if (["closed", "complete", "completed"].includes(trimmed)) return "Closed";
  if (["in progress", "progress", "ongoing"].includes(trimmed)) return "In Progress";
  return "Open";
}

function normalizeImportDepartment(value: string) {
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "quality" || trimmed === "qa" || trimmed === "qc") return "Quality";
  if (trimmed === "hse" || trimmed === "h&s" || trimmed === "health safety environment") return "HSE";
  if (trimmed === "hseq") return "HSE";
  const matched = departmentOptions.find((option) => option.toLowerCase() === trimmed);
  return matched || "HSE";
}

function normalizeImportSource(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "HSE";
  const matched = actionSourceOptions.find((option) => option.toLowerCase() === trimmed.toLowerCase());
  return matched || "HSE";
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

function isOverdue(action: { due_date: string | null; status: string | null }) {
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
    (action.linked_finding_reference || "").toLowerCase().includes(lower) ||
    (action.linked_ncr_number || "").toLowerCase().includes(lower) ||
    (action.linked_capa_number || "").toLowerCase().includes(lower) ||
    (action.linked_moc_number || "").toLowerCase().includes(lower) ||
    (action.linked_ainm_number || "").toLowerCase().includes(lower) ||
    (action.linked_hse_inspection_number || "").toLowerCase().includes(lower) ||
    (action.linked_observation_number || "").toLowerCase().includes(lower)
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

function getSourceChipTone(source: string): LinkedRecordChip["tone"] {
  if (source === "Audit Finding") return "blue";
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

function isAuditLinkedSource(source: string | null | undefined) {
  return source === "Audit Finding";
}

function isAssetLinkedSource(source: string | null | undefined) {
  return source === "Asset Inspection" || source === "Asset Maintenance" || source === "Asset Calibration";
}

function sourceImpliesLinkedRecord(source: string | null | undefined) {
  return (
    source === "Audit Finding" ||
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

function buildLinkedRecordChips(action: ActionItem): LinkedRecordChip[] {
  const chips: LinkedRecordChip[] = [];
  const source = getActionSourceValue(action);

  if (action.linked_audit_number) chips.push({ label: `Audit ${action.linked_audit_number}`, tone: "blue" });
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

function matchesPersonName(value: string | null | undefined, personName: string | null) {
  if (!value || !personName) return false;
  return value.trim().toLowerCase() === personName.trim().toLowerCase();
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const key = getKey(item).trim() || "Unspecified";
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  return [...counts.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
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
  if (source === "Asset Calibration" && action.linked_calibration_id) {
    parts.push("Calibration linked");
  }
  if (source === "NCR/CAPA" && action.linked_ncr_number) parts.push(`NCR ${action.linked_ncr_number}`);
  if (source === "NCR/CAPA" && action.linked_capa_number) parts.push(`CAPA ${action.linked_capa_number}`);
  if (source === "MOC" && action.linked_moc_number) parts.push(`MOC ${action.linked_moc_number}`);
  if (source === "AINM" && action.linked_ainm_number) parts.push(`AINM ${action.linked_ainm_number}`);
  if (source === "HSE Inspection" && action.linked_hse_inspection_number) parts.push(`HSE Inspection ${action.linked_hse_inspection_number}`);
  if (source === "Observation" && action.linked_observation_number) parts.push(`Observation ${action.linked_observation_number}`);
  return parts.join(" | ");
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
    linked_ainm_id: action.linked_ainm_id || "",
    linked_ainm_number: action.linked_ainm_number || "",
    linked_hse_inspection_id: action.linked_hse_inspection_id || "",
    linked_hse_inspection_number: action.linked_hse_inspection_number || "",
    linked_observation_id: action.linked_observation_id || "",
    linked_observation_number: action.linked_observation_number || "",
    close_out_comments: action.close_out_comments || "",
  };
}

function ActionsPageContent() {
  const imsPermissions = useImsPermissions();
  const router = useRouter();
  const searchParams = useSearchParams();
  const linkedSearch = searchParams.get("search")?.trim() || "";
  const linkedStatus = searchParams.get("status")?.trim() || "";
  const linkedPriority = searchParams.get("priority")?.trim() || "";
  const linkedOwner = searchParams.get("owner")?.trim() || "";
  const linkedProject = searchParams.get("project")?.trim() || "";
  const linkedSource = searchParams.get("source")?.trim() || "";
  const linkedDepartment = searchParams.get("department")?.trim() || "";
  const linkedOverdueOnly = searchParams.get("overdue") === "1";
  const dueWindow = Number(searchParams.get("dueWindow") || "0");
  const linkedCreatedMonth = searchParams.get("createdMonth")?.trim() || "";
  const linkedClosedMonth = searchParams.get("closedMonth")?.trim() || "";
  const linkedView = searchParams.get("view")?.trim() || "";
  const directActionNumber = searchParams.get("action")?.trim() || "";
  const directActionId = searchParams.get("actionId")?.trim() || "";
  const prefillSource = searchParams.get("prefill_source")?.trim() || "";
  const prefillDepartment = searchParams.get("prefill_department")?.trim() || "";
  const prefillProject = searchParams.get("prefill_project")?.trim() || "";
  const prefillOwner = searchParams.get("prefill_owner")?.trim() || "";
  const prefillTitle = searchParams.get("prefill_title")?.trim() || "";
  const prefillDescription = searchParams.get("prefill_description")?.trim() || "";
  const prefillDueDate = searchParams.get("prefill_due_date")?.trim() || "";
  const prefillLinkedAssetId = searchParams.get("linked_asset_id")?.trim() || "";
  const prefillLinkedAssetCode = searchParams.get("linked_asset_code")?.trim() || "";
  const prefillLinkedInspectionId = searchParams.get("linked_inspection_id")?.trim() || "";
  const prefillLinkedInspectionNumber = searchParams.get("linked_inspection_number")?.trim() || "";
  const prefillLinkedMaintenanceId = searchParams.get("linked_maintenance_id")?.trim() || "";
  const prefillLinkedMaintenanceNumber = searchParams.get("linked_maintenance_number")?.trim() || "";
  const prefillLinkedCalibrationId = searchParams.get("linked_calibration_id")?.trim() || "";
  const prefillLinkedNcrId = searchParams.get("linked_ncr_id")?.trim() || "";
  const prefillLinkedNcrNumber = searchParams.get("linked_ncr_number")?.trim() || "";
  const prefillLinkedMocId = searchParams.get("linked_moc_id")?.trim() || "";
  const prefillLinkedMocNumber = searchParams.get("linked_moc_number")?.trim() || "";
  const prefillLinkedAinmId = searchParams.get("linked_ainm_id")?.trim() || "";
  const prefillLinkedAinmNumber = searchParams.get("linked_ainm_number")?.trim() || "";
  const prefillLinkedHseInspectionId = searchParams.get("linked_hse_inspection_id")?.trim() || "";
  const prefillLinkedHseInspectionNumber = searchParams.get("linked_hse_inspection_number")?.trim() || "";
  const prefillLinkedObservationId = searchParams.get("linked_observation_id")?.trim() || "";
  const prefillLinkedObservationNumber = searchParams.get("linked_observation_number")?.trim() || "";
  const hasCreatePrefillParams = Boolean(
    prefillSource ||
      prefillDepartment ||
      prefillProject ||
      prefillOwner ||
      prefillTitle ||
      prefillDescription ||
      prefillDueDate ||
      prefillLinkedAssetId ||
      prefillLinkedAssetCode ||
      prefillLinkedInspectionId ||
      prefillLinkedInspectionNumber ||
      prefillLinkedMaintenanceId ||
      prefillLinkedMaintenanceNumber ||
      prefillLinkedCalibrationId ||
      prefillLinkedNcrId ||
      prefillLinkedNcrNumber ||
      prefillLinkedMocId ||
      prefillLinkedMocNumber ||
      prefillLinkedAinmId ||
      prefillLinkedAinmNumber ||
      prefillLinkedHseInspectionId ||
      prefillLinkedHseInspectionNumber ||
      prefillLinkedObservationId ||
      prefillLinkedObservationNumber
  );
  const hasRegisterFilterParams = Boolean(
    linkedSearch ||
      directActionNumber ||
      directActionId ||
      linkedStatus ||
      linkedPriority ||
      linkedOwner ||
      linkedProject ||
      linkedSource ||
      linkedDepartment ||
      linkedOverdueOnly ||
      dueWindow > 0 ||
      linkedCreatedMonth ||
      linkedClosedMonth
  );
  const initialView: ActionView = hasCreatePrefillParams
    ? "create"
    : hasRegisterFilterParams
    ? "register"
    : isActionView(linkedView)
    ? linkedView
    : "dashboard";

  const [actions, setActions] = useState<ActionItem[]>([]);
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
  const [observationOptions, setObservationOptions] = useState<ObservationOption[]>([]);
  const [people, setPeople] = useState<ActionPerson[]>([]);
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [message, setMessage] = useState("Loading actions...");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const canCreateAction = useMemo(() => {
    return imsPermissions.loaded && (imsPermissions.isMasterAdmin || imsPermissions.fullAccess || imsPermissions.canCreate);
  }, [imsPermissions.canCreate, imsPermissions.fullAccess, imsPermissions.isMasterAdmin, imsPermissions.loaded]);

  const canEditAction = useMemo(() => {
    return imsPermissions.loaded && (imsPermissions.isMasterAdmin || imsPermissions.fullAccess || imsPermissions.canEdit);
  }, [imsPermissions.canEdit, imsPermissions.fullAccess, imsPermissions.isMasterAdmin, imsPermissions.loaded]);

  function requireCreatePermission(actionLabel: string) {
    if (canCreateAction) return true;
    setMessage(`Read-only access: you do not have permission to ${actionLabel}.`);
    return false;
  }

  function requireEditPermission(actionLabel: string) {
    if (canEditAction) return true;
    setMessage(`Read-only access: you do not have permission to ${actionLabel}.`);
    return false;
  }

  const [form, setForm] = useState<ActionForm>(emptyForm);
  const [createFiles, setCreateFiles] = useState<File[]>([]);
  const [createEvidenceNotes, setCreateEvidenceNotes] = useState("");

  const [search, setSearch] = useState(linkedSearch);
  const [statusFilter, setStatusFilter] = useState(linkedStatus);
  const [priorityFilter, setPriorityFilter] = useState(linkedPriority);
  const [ownerFilter, setOwnerFilter] = useState(linkedOwner);
  const [projectFilter, setProjectFilter] = useState(linkedProject);
  const [sourceFilter, setSourceFilter] = useState(linkedSource);
  const [departmentFilter, setDepartmentFilter] = useState(linkedDepartment);
  const [showOverdueOnly, setShowOverdueOnly] = useState(linkedOverdueOnly);
  const [showOpenOnly, setShowOpenOnly] = useState(false);
  const [showClosedOnly, setShowClosedOnly] = useState(false);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("");
  const [myActionFilter, setMyActionFilter] = useState<MyActionFilter>("all");
  const [showMyItemFilters, setShowMyItemFilters] = useState(false);
  const [myItemStatusFilter, setMyItemStatusFilter] = useState("");
  const [myItemTypeFilter, setMyItemTypeFilter] = useState("");
  const [showEvidenceOnly, setShowEvidenceOnly] = useState(false);
  const [showLinkedIssuesOnly, setShowLinkedIssuesOnly] = useState(false);
  const [dueStartFilter, setDueStartFilter] = useState(0);
  const [dueWindowFilter, setDueWindowFilter] = useState(dueWindow);
  const [showNoDueDateOnly, setShowNoDueDateOnly] = useState(false);
  const [createdMonthFilter, setCreatedMonthFilter] = useState(linkedCreatedMonth);
  const [closedMonthFilter, setClosedMonthFilter] = useState(linkedClosedMonth);
  const [showRegisterFilters, setShowRegisterFilters] = useState(
    Boolean(
      linkedSearch ||
        linkedStatus ||
        linkedPriority ||
        linkedOwner ||
        linkedProject ||
        linkedSource ||
        linkedDepartment ||
        linkedOverdueOnly ||
        dueWindow ||
        linkedCreatedMonth ||
        linkedClosedMonth
    )
  );
  const [activeView, setActiveView] = useState<ActionView>(initialView);
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [currentPersonName, setCurrentPersonName] = useState("");
  const [currentPersonNotice, setCurrentPersonNotice] = useState("");

  const [editForm, setEditForm] = useState<ActionForm>(emptyForm);

  const actionDetailRef = useRef<HTMLDivElement | null>(null);
  const [selectedEvidenceAction, setSelectedEvidenceAction] = useState<ActionItem | null>(null);
  const [selectedEvidenceFiles, setSelectedEvidenceFiles] = useState<File[]>([]);
  const [selectedEvidenceNotes, setSelectedEvidenceNotes] = useState("");
  const [hasAppliedPrefill, setHasAppliedPrefill] = useState(false);
  const [importRows, setImportRows] = useState<ActionImportRow[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [isImportingActions, setIsImportingActions] = useState(false);

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
      .select("id,audit_id,reference,description,owner,status,due_date")
      .order("reference", { ascending: true });

    if (error) return;

    const options = ((data || []) as Array<Record<string, unknown>>)
      .map((row) => ({
        id: String(row.id || ""),
        audit_id: String(row.audit_id || ""),
        reference: String(row.reference || ""),
        description: String(row.description || ""),
        owner: String(row.owner || ""),
        status: String(row.status || ""),
        due_date: String(row.due_date || ""),
      }))
      .filter((row) => row.id && row.audit_id && row.reference);

    setFindingOptions(options);
  }

  async function loadNcrCapaOptions() {
    const [ncrRes, capaRes] = await Promise.all([
      supabase.from("ncrs").select("id,ncr_number,title,owner,status,due_date,project").order("ncr_number", { ascending: true }),
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
            owner: String(row.owner || ""),
            status: String(row.status || ""),
            due_date: String(row.due_date || ""),
            project: String(row.project || ""),
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
            owner: "",
            status: "",
            due_date: "",
            project: "",
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

  async function loadAinmOptions() {
    const { data, error } = await supabase
      .from("hse_ainm_records")
      .select("id,ainm_number,title,project,event_date,event_classification,owner,overall_status")
      .order("event_date", { ascending: false })
      .order("ainm_number", { ascending: false });

    if (error) return;

    const options = ((data || []) as Array<Record<string, unknown>>)
      .map((row) => ({
        id: String(row.id || ""),
        number: String(row.ainm_number || ""),
        title: String(row.title || ""),
        project: String(row.project || ""),
        event_date: String(row.event_date || ""),
        classification: String(row.event_classification || ""),
        owner: String(row.owner || ""),
        status: String(row.overall_status || ""),
      }))
      .filter((row) => row.id && row.number);

    setAinmOptions(options);
  }

  async function loadHseInspectionOptions() {
    const { data, error } = await supabase
      .from("hse_inspection_records")
      .select("id,inspection_number,title,form_title,project_work_scope,area_zone,inspection_date")
      .order("inspection_date", { ascending: false })
      .order("inspection_number", { ascending: false });

    if (error) return;

    const options = ((data || []) as Array<Record<string, unknown>>)
      .map((row) => ({
        id: String(row.id || ""),
        inspection_number: String(row.inspection_number || ""),
        title: String(row.title || ""),
        form_title: String(row.form_title || ""),
        project_work_scope: String(row.project_work_scope || ""),
        area_zone: String(row.area_zone || ""),
        inspection_date: String(row.inspection_date || ""),
      }))
      .filter((row) => row.id && row.inspection_number);

    setHseInspectionOptions(options);
  }

  async function loadObservationOptions() {
    const { data, error } = await supabase
      .from("hse_observations")
      .select("id,observation_number,title,project,site_location,observation_date,observation_type,assigned_to,status")
      .order("created_at", { ascending: false });

    if (error) return;

    const options = ((data || []) as Array<Record<string, unknown>>)
      .map((row) => ({
        id: String(row.id || ""),
        observation_number: String(row.observation_number || ""),
        title: String(row.title || ""),
        project: String(row.project || ""),
        site_location: String(row.site_location || ""),
        observation_date: String(row.observation_date || ""),
        observation_type: String(row.observation_type || ""),
        assigned_to: String(row.assigned_to || ""),
        status: String(row.status || ""),
      }))
      .filter((row) => row.id && row.observation_number);

    setObservationOptions(options);
  }

  async function loadAssetLinkedOptions() {
    const [assetsRes, inspectionsRes, maintenanceRes, calibrationsRes] = await Promise.all([
      supabase.from("assets").select("id,asset_code,name").order("asset_code", { ascending: true }),
      supabase
        .from("asset_inspection_records")
        .select("id,asset_id,inspection_number,inspection_date,result")
        .order("inspection_number", { ascending: true }),
      supabase
        .from("asset_maintenance_records")
        .select("id,asset_id,maintenance_number,maintenance_date,description")
        .order("maintenance_number", { ascending: true }),
      supabase
        .from("asset_calibration_records")
        .select("id,asset_id,reference,certificate_number,calibration_date,calibration_due_date")
        .order("calibration_date", { ascending: false }),
    ]);

    if (!assetsRes.error) {
      setAssetOptions(
        ((assetsRes.data || []) as Array<Record<string, unknown>>)
          .map((row) => ({
            id: String(row.id || ""),
            asset_code: String(row.asset_code || ""),
            name: String(row.name || ""),
          }))
          .filter((row) => row.id && row.asset_code)
      );
    }

    if (!inspectionsRes.error) {
      setAssetInspectionOptions(
        ((inspectionsRes.data || []) as Array<Record<string, unknown>>)
          .map((row) => ({
            id: String(row.id || ""),
            asset_id: String(row.asset_id || ""),
            inspection_number: String(row.inspection_number || ""),
            inspection_date: String(row.inspection_date || ""),
            result: String(row.result || ""),
          }))
          .filter((row) => row.id && row.asset_id && row.inspection_number)
      );
    }

    if (!maintenanceRes.error) {
      setAssetMaintenanceOptions(
        ((maintenanceRes.data || []) as Array<Record<string, unknown>>)
          .map((row) => ({
            id: String(row.id || ""),
            asset_id: String(row.asset_id || ""),
            maintenance_number: String(row.maintenance_number || ""),
            maintenance_date: String(row.maintenance_date || ""),
            description: String(row.description || ""),
          }))
          .filter((row) => row.id && row.asset_id && row.maintenance_number)
      );
    }

    if (!calibrationsRes.error) {
      setAssetCalibrationOptions(
        ((calibrationsRes.data || []) as Array<Record<string, unknown>>)
          .map((row) => ({
            id: String(row.id || ""),
            asset_id: String(row.asset_id || ""),
            reference: String(row.reference || ""),
            certificate_number: String(row.certificate_number || ""),
            calibration_date: String(row.calibration_date || ""),
            calibration_due_date: String(row.calibration_due_date || ""),
          }))
          .filter((row) => row.id && row.asset_id)
      );
    }
  }

  async function loadPeople() {
    const { data, error } = await supabase
      .from("people")
      .select("id,name,email,department,active")
      .eq("active", true)
      .order("name", { ascending: true });

    if (error) return;

    const options = ((data || []) as Array<Record<string, unknown>>)
      .map((row) => ({
        id: String(row.id || ""),
        name: String(row.name || "").trim(),
        email: row.email ? String(row.email).trim() : null,
        department: row.department ? String(row.department).trim() : null,
        active: typeof row.active === "boolean" ? row.active : null,
      }))
      .filter((row) => row.id && row.name);

    setPeople(options);
  }

  async function loadCurrentUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      setCurrentPersonNotice("My Actions unavailable: signed-in user could not be confirmed.");
      return;
    }

    const email = data.user?.email?.trim().toLowerCase() || "";
    setCurrentUserEmail(email);
  }

  useEffect(() => {
    void (async () => {
      await Promise.all([
        loadActions(),
        loadAuditOptions(),
        loadFindingOptions(),
        loadNcrCapaOptions(),
        loadMocOptions(),
        loadAinmOptions(),
        loadHseInspectionOptions(),
        loadObservationOptions(),
        loadAssetLinkedOptions(),
        loadPeople(),
        loadCurrentUser(),
      ]);
    })();
  }, []);

  useEffect(() => {
    if (hasAppliedPrefill) return;
    if (
      !prefillSource &&
      !prefillDepartment &&
      !prefillProject &&
      !prefillOwner &&
      !prefillTitle &&
      !prefillDescription &&
      !prefillDueDate &&
      !prefillLinkedAssetId &&
      !prefillLinkedInspectionId &&
      !prefillLinkedMaintenanceId &&
      !prefillLinkedCalibrationId &&
      !prefillLinkedNcrId &&
      !prefillLinkedNcrNumber &&
      !prefillLinkedMocId &&
      !prefillLinkedMocNumber &&
      !prefillLinkedAinmId &&
      !prefillLinkedAinmNumber &&
      !prefillLinkedHseInspectionId &&
      !prefillLinkedHseInspectionNumber &&
      !prefillLinkedObservationId &&
      !prefillLinkedObservationNumber
    ) {
      return;
    }

    setForm((current) => {
      const nextSource = actionSourceOptions.includes(prefillSource as (typeof actionSourceOptions)[number])
        ? prefillSource
        : current.source || "Manual";
      const nextDepartment =
        prefillDepartment ||
        (nextSource === "HSE Inspection" || nextSource === "HSE" ? "HSE" : "") ||
        (nextSource === "Observation" ? "HSE" : "") ||
        (nextSource === "Audit Finding" || nextSource === "NCR/CAPA" || nextSource === "MOC" ? "Quality" : "") ||
        (isAssetLinkedSource(nextSource) ? "Assets" : current.department);

      return {
        ...current,
        source: nextSource,
        department: nextDepartment,
        project: prefillProject || current.project,
        owner: prefillOwner || current.owner,
        title: prefillTitle || current.title,
        description: prefillDescription || current.description,
        due_date: prefillDueDate || current.due_date,
        linked_asset_id: prefillLinkedAssetId || current.linked_asset_id,
        linked_asset_code: prefillLinkedAssetCode || current.linked_asset_code,
        linked_inspection_id: prefillLinkedInspectionId || current.linked_inspection_id,
        linked_inspection_number: prefillLinkedInspectionNumber || current.linked_inspection_number,
        linked_maintenance_id: prefillLinkedMaintenanceId || current.linked_maintenance_id,
        linked_maintenance_number: prefillLinkedMaintenanceNumber || current.linked_maintenance_number,
        linked_calibration_id: prefillLinkedCalibrationId || current.linked_calibration_id,
        linked_ncr_id: prefillLinkedNcrId || current.linked_ncr_id,
        linked_ncr_number: prefillLinkedNcrNumber || current.linked_ncr_number,
        linked_moc_id: prefillLinkedMocId || current.linked_moc_id,
        linked_moc_number: prefillLinkedMocNumber || current.linked_moc_number,
        linked_ainm_id: prefillLinkedAinmId || current.linked_ainm_id,
        linked_ainm_number: prefillLinkedAinmNumber || current.linked_ainm_number,
        linked_hse_inspection_id: prefillLinkedHseInspectionId || current.linked_hse_inspection_id,
        linked_hse_inspection_number: prefillLinkedHseInspectionNumber || current.linked_hse_inspection_number,
        linked_observation_id: prefillLinkedObservationId || current.linked_observation_id,
        linked_observation_number: prefillLinkedObservationNumber || current.linked_observation_number,
      };
    });

    setActiveView("create");
    setHasAppliedPrefill(true);
    setMessage("Action form prefilled from linked record. Review and save when ready.");
  }, [
    hasAppliedPrefill,
    prefillDepartment,
    prefillDescription,
    prefillDueDate,
    prefillLinkedAssetCode,
    prefillLinkedAinmId,
    prefillLinkedAinmNumber,
    prefillLinkedHseInspectionId,
    prefillLinkedHseInspectionNumber,
    prefillLinkedObservationId,
    prefillLinkedObservationNumber,
    prefillLinkedAssetId,
    prefillLinkedInspectionId,
    prefillLinkedInspectionNumber,
    prefillLinkedCalibrationId,
    prefillLinkedMaintenanceId,
    prefillLinkedMaintenanceNumber,
    prefillLinkedMocId,
    prefillLinkedMocNumber,
    prefillLinkedNcrId,
    prefillLinkedNcrNumber,
    prefillOwner,
    prefillProject,
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

  const myOpenActions = actions.filter(
    (a) => !isClosedLikeStatus(a.status) && matchesPersonName(a.owner, currentPersonName)
  ).length;

  const linkedRecordIssues = actions.filter((action) => {
    const source = getActionSourceValue(action);
    return sourceImpliesLinkedRecord(source) && !hasLinkedRecord(action);
  }).length;

  const statusChartData = useMemo(() => {
    return countBy(actions, (action) => action.status || "Unspecified");
  }, [actions]);

  const sourceChartData = useMemo<ChartDatum[]>(() => {
    const counts = new Map<string, number>();
    actions.forEach((action) => {
      const source = getActionSourceValue(action);
      counts.set(source, (counts.get(source) || 0) + 1);
    });

    return [...counts.entries()]
      .map(([source, value]) => ({
        name: source === "NCR/CAPA" ? "NCR / CAPA" : source,
        value,
        filterValue: source,
      }))
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  }, [actions]);

  const openOwnerChartData = useMemo(() => {
    return countBy(
      actions.filter((action) => !isClosedLikeStatus(action.status)),
      (action) => action.owner || "Unassigned"
    ).slice(0, 8);
  }, [actions]);

  const duePressureData = useMemo<ChartDatum[]>(() => {
    const open = actions.filter((action) => !isClosedLikeStatus(action.status));
    const overdue = open.filter((action) => isOverdue(action)).length;
    const due7 = open.filter((action) => {
      const days = getDaysFromToday(action.due_date);
      return days !== null && days >= 0 && days <= 7;
    }).length;
    const due30 = open.filter((action) => {
      const days = getDaysFromToday(action.due_date);
      return days !== null && days > 7 && days <= 30;
    }).length;
    const noDueDate = open.filter((action) => !action.due_date).length;

    return [
      { name: "Overdue", value: overdue },
      { name: "Due 7 Days", value: due7 },
      { name: "Due 30 Days", value: due30 },
      { name: "No Due Date", value: noDueDate },
    ];
  }, [actions]);

  const priorityMixData = useMemo(() => {
    return countBy(
      actions.filter((action) => !isClosedLikeStatus(action.status)),
      (action) => action.priority || "Unspecified"
    );
  }, [actions]);

  const closureTrendData = useMemo<TrendDatum[]>(() => {
    const closedCounts = countBy(
      actions.filter((action) => isClosedLikeStatus(action.status)),
      (action) => getMonthKey(action.updated_at || action.created_at) || "Unknown"
    );

    return closedCounts
      .filter((item) => item.name !== "Unknown")
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(-6)
      .map((item) => ({ name: item.name, closed: item.value }));
  }, [actions]);

  const filteredActions = useMemo(() => {
    return actions.filter((action) => {
      const matchesSearch = matchesSearchTerm(action, search);
      const matchesStatus =
        !statusFilter ||
        (statusFilter === "Unspecified" ? !(action.status || "").trim() : (action.status || "") === statusFilter);
      const matchesPriority =
        !priorityFilter ||
        (priorityFilter === "Unspecified"
          ? !(action.priority || "").trim()
          : (action.priority || "") === priorityFilter);
      const matchesOwner =
        !ownerFilter ||
        (ownerFilter === "Unassigned" ? !(action.owner || "").trim() : (action.owner || "") === ownerFilter);
      const matchesProject = !projectFilter || (action.project || "") === projectFilter;
      const matchesSource = !sourceFilter || getActionSourceValue(action) === sourceFilter;
      const matchesDepartment = !departmentFilter || (action.department || "") === departmentFilter;
      const matchesOverdue = !showOverdueOnly || isOverdue(action);
      const matchesOpenOnly = !showOpenOnly || !isClosedLikeStatus(action.status);
      const matchesClosedOnly = !showClosedOnly || isClosedLikeStatus(action.status);
      const matchesEvidenceOnly = !showEvidenceOnly || (evidenceCountMap.get(action.id) || 0) > 0;
      const matchesLinkedIssuesOnly =
        !showLinkedIssuesOnly ||
        (sourceImpliesLinkedRecord(getActionSourceValue(action)) && !hasLinkedRecord(action));
      const matchesMyActions =
        quickFilter !== "my" || (Boolean(currentPersonName) && matchesPersonName(action.owner, currentPersonName));
      const matchesQuickOverdue = quickFilter !== "overdue" || isOverdue(action);
      const matchesQuickDueWeek =
        quickFilter !== "dueWeek" ||
        (() => {
          if (!action.due_date || isClosedLikeStatus(action.status)) return false;
          const days = getDaysFromToday(action.due_date);
          return days !== null && days >= 0 && days <= 7;
        })();
      const matchesQuickHighPriority =
        quickFilter !== "highPriority" ||
        ((action.priority || "").toLowerCase() === "high" && !isClosedLikeStatus(action.status));
      const matchesCreatedMonth =
        !createdMonthFilter || getMonthKey(action.created_at) === createdMonthFilter;
      const matchesClosedMonth =
        !closedMonthFilter ||
        (isClosedLikeStatus(action.status) &&
          getMonthKey(action.updated_at || action.created_at) === closedMonthFilter);
      const matchesDueWindow =
        dueWindowFilter <= 0 ||
        (() => {
          if (!action.due_date || isClosedLikeStatus(action.status)) return false;
          const days = getDaysFromToday(action.due_date);
          return days !== null && days >= dueStartFilter && days <= dueWindowFilter;
        })();
      const matchesNoDueDateOnly = !showNoDueDateOnly || (!action.due_date && !isClosedLikeStatus(action.status));

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesOwner &&
        matchesProject &&
        matchesSource &&
        matchesDepartment &&
        matchesOverdue &&
        matchesOpenOnly &&
        matchesClosedOnly &&
        matchesEvidenceOnly &&
        matchesLinkedIssuesOnly &&
        matchesMyActions &&
        matchesQuickOverdue &&
        matchesQuickDueWeek &&
        matchesQuickHighPriority &&
        matchesCreatedMonth &&
        matchesClosedMonth &&
        matchesDueWindow &&
        matchesNoDueDateOnly
      );
    });
  }, [
    actions,
    evidenceCountMap,
    search,
    statusFilter,
    priorityFilter,
    ownerFilter,
    projectFilter,
    sourceFilter,
    departmentFilter,
    showOverdueOnly,
    showOpenOnly,
    showClosedOnly,
    showEvidenceOnly,
    showLinkedIssuesOnly,
    quickFilter,
    currentPersonName,
    createdMonthFilter,
    closedMonthFilter,
    dueWindowFilter,
    dueStartFilter,
    showNoDueDateOnly,
  ]);

  const importableRows = useMemo(
    () => importRows.filter((row) => row.errors.length === 0 && row.skipReasons.length === 0),
    [importRows]
  );

  const skippedImportRows = useMemo(
    () => importRows.filter((row) => row.errors.length > 0 || row.skipReasons.length > 0),
    [importRows]
  );

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

  const highPriorityList = useMemo(() => {
    return [...actions]
      .filter((action) => (action.priority || "").toLowerCase() === "high" && !isClosedLikeStatus(action.status))
      .sort((a, b) => {
        const aDate = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        const bDate = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
      })
      .slice(0, 8);
  }, [actions]);

  const auditNumberById = useMemo(() => {
    return new Map(auditOptions.map((audit) => [audit.id, audit.audit_number]));
  }, [auditOptions]);

  const myOwnActionItems = useMemo<MyWorkItem[]>(() => {
    if (!currentPersonName) return [];
    return actions
      .filter((action) => matchesPersonName(action.owner, currentPersonName))
      .map((action) => ({
        id: action.id,
        source: "Action" as const,
        number: action.action_number || "-",
        title: action.title || "Untitled action",
        project: action.project || "No project",
        status: action.status,
        due_date: action.due_date,
        action,
        href: null,
      }));
  }, [actions, currentPersonName]);

  const myNcrItems = useMemo<MyWorkItem[]>(() => {
    if (!currentPersonName) return [];
    return ncrCapaOptions
      .filter((option) => option.type === "NCR" && matchesPersonName(option.owner, currentPersonName))
      .map((option) => ({
        id: option.id,
        source: "NCR" as const,
        number: option.number || "-",
        title: option.title || "Untitled NCR",
        project: option.project || "No project",
        status: option.status || null,
        due_date: option.due_date || null,
        action: null,
        href: `/ncr-capa?ncrId=${option.id}`,
      }));
  }, [ncrCapaOptions, currentPersonName]);

  const myFindingItems = useMemo<MyWorkItem[]>(() => {
    if (!currentPersonName) return [];
    return findingOptions
      .filter((finding) => matchesPersonName(finding.owner, currentPersonName))
      .map((finding) => {
        const auditNumber = auditNumberById.get(finding.audit_id) || "";
        return {
          id: finding.id,
          source: "Audit Finding" as const,
          number: auditNumber ? `${auditNumber} · ${finding.reference || "-"}` : finding.reference || "-",
          title: finding.description || "Untitled finding",
          project: auditNumber ? `Audit ${auditNumber}` : "Audit finding",
          status: finding.status || null,
          due_date: finding.due_date || null,
          action: null,
          href: `/audits?findingId=${finding.id}`,
        };
      });
  }, [findingOptions, auditNumberById, currentPersonName]);

  const myAinmItems = useMemo<MyWorkItem[]>(() => {
    if (!currentPersonName) return [];
    return ainmOptions
      .filter((option) => matchesPersonName(option.owner, currentPersonName))
      .map((option) => ({
        id: option.id,
        source: "AINM" as const,
        number: option.number || "-",
        title: option.title || "Untitled AINM",
        project: option.project || "No project",
        status: option.status || null,
        due_date: null,
        action: null,
        href: `/hse/ainm?ainmId=${option.id}`,
      }));
  }, [ainmOptions, currentPersonName]);

  const myObservationItems = useMemo<MyWorkItem[]>(() => {
    if (!currentPersonName) return [];
    return observationOptions
      .filter((option) => matchesPersonName(option.assigned_to, currentPersonName))
      .map((option) => ({
        id: option.id,
        source: "Observation" as const,
        number: option.observation_number || "-",
        title: option.title || "Untitled observation",
        project: option.project || option.site_location || "No project",
        status: option.status || null,
        due_date: null,
        action: null,
        href: `/hse/observations?observationId=${option.id}`,
      }));
  }, [observationOptions, currentPersonName]);

  const myActionList = useMemo(() => {
    return [...myOwnActionItems, ...myNcrItems, ...myFindingItems, ...myAinmItems, ...myObservationItems].sort((a, b) => {
      const aClosed = isClosedLikeStatus(a.status);
      const bClosed = isClosedLikeStatus(b.status);
      if (aClosed !== bClosed) return aClosed ? 1 : -1;
      const aDate = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
      const bDate = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
      return aDate - bDate;
    });
  }, [myOwnActionItems, myNcrItems, myFindingItems, myAinmItems, myObservationItems]);

  const myOpenWorkItems = myActionList.filter((item) => !isClosedLikeStatus(item.status));
  const myOverdueActions = myActionList.filter((item) => isOverdue(item));
  const myDueThisWeekActions = myActionList.filter((item) => {
    if (!item.due_date || isClosedLikeStatus(item.status)) return false;
    const days = getDaysFromToday(item.due_date);
    return days !== null && days >= 0 && days <= 7;
  });
  const myClosedActions = myActionList.filter((item) => isClosedLikeStatus(item.status));
  const myQuickFilteredActions = useMemo(() => {
    if (myActionFilter === "open") return myOpenWorkItems;
    if (myActionFilter === "closed") return myClosedActions;
    if (myActionFilter === "overdue") return myOverdueActions;
    if (myActionFilter === "dueWeek") return myDueThisWeekActions;
    return myActionList;
  }, [myActionFilter, myActionList, myClosedActions, myDueThisWeekActions, myOpenWorkItems, myOverdueActions]);

  const myFilteredActions = useMemo(() => {
    return myQuickFilteredActions.filter((item) => {
      if (myItemStatusFilter === "Open" && isClosedLikeStatus(item.status)) return false;
      if (myItemStatusFilter === "Closed" && !isClosedLikeStatus(item.status)) return false;
      if (myItemTypeFilter && item.source !== myItemTypeFilter) return false;
      return true;
    });
  }, [myQuickFilteredActions, myItemStatusFilter, myItemTypeFilter]);

  function clearMyItemFilters() {
    setMyActionFilter("all");
    setMyItemStatusFilter("");
    setMyItemTypeFilter("");
  }

  const myActionFilterLabel =
    myActionFilter === "open"
      ? "Open Items"
      : myActionFilter === "closed"
      ? "Closed / Complete Items"
      : myActionFilter === "overdue"
      ? "Overdue Items"
      : myActionFilter === "dueWeek"
      ? "Due This Week"
      : "All Items";

  function openMyWorkItem(item: MyWorkItem) {
    if (item.source === "Action" && item.action) {
      openActionInRegister(item.action);
      return;
    }
    if (item.href) router.push(item.href);
  }

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
    if (hasCreatePrefillParams || actions.length === 0 || (!directActionId && !directActionNumber)) return;

    const directNumber = directActionNumber.trim().toLowerCase();
    const match = actions.find((action) => {
      if (directActionId && action.id === directActionId) return true;
      return Boolean(
        directNumber &&
          (action.action_number || "").trim().toLowerCase() === directNumber
      );
    });

    if (!match) return;

    setActiveView("register");
    setSelectedEvidenceAction((current) => (current?.id === match.id ? current : match));
    if (match.action_number) setSearch(match.action_number);
  }, [actions, directActionId, directActionNumber, hasCreatePrefillParams]);

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
    if (editForm.source !== "AINM") return;
    if (editForm.linked_ainm_id || !editForm.linked_ainm_number) return;

    const matched = ainmOptions.find((option) => option.number === editForm.linked_ainm_number);
    if (!matched) return;

    setEditForm((current) => ({
      ...current,
      linked_ainm_id: matched.id,
      linked_ainm_number: matched.number,
      project: current.project || matched.project,
    }));
  }, [ainmOptions, editForm.linked_ainm_id, editForm.linked_ainm_number, editForm.source]);

  useEffect(() => {
    if (selectedEvidenceAction && actionDetailRef.current) {
      actionDetailRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedEvidenceAction]);

  useEffect(() => {
    if (editForm.source !== "Observation") return;
    if (editForm.linked_observation_id || !editForm.linked_observation_number) return;

    const matched = observationOptions.find((option) => option.observation_number === editForm.linked_observation_number);
    if (!matched) return;

    setEditForm((current) => ({
      ...current,
      linked_observation_id: matched.id,
      linked_observation_number: matched.observation_number,
      project: current.project || matched.project || matched.site_location,
    }));
  }, [editForm.linked_observation_id, editForm.linked_observation_number, editForm.source, observationOptions]);

  useEffect(() => {
    if (!selectedEvidenceAction) return;
    const refreshed = actions.find((action) => action.id === selectedEvidenceAction.id);
    if (refreshed && refreshed !== selectedEvidenceAction) {
      setSelectedEvidenceAction(refreshed);
    }
  }, [actions, selectedEvidenceAction]);

  useEffect(() => {
    if (!currentUserEmail) {
      setCurrentPersonName("");
      setCurrentPersonNotice("My Actions unavailable: no signed-in user email was found.");
      return;
    }

    const matched = people.find((person) => (person.email || "").trim().toLowerCase() === currentUserEmail);
    if (!matched) {
      setCurrentPersonName("");
      setCurrentPersonNotice(`My Actions unavailable: ${currentUserEmail} is not linked to an active People record.`);
      return;
    }

    setCurrentPersonName(matched.name);
    setCurrentPersonNotice(`My Actions matched to ${matched.name}.`);
  }, [currentUserEmail, people]);

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

  const createInspectionOptions = useMemo(
    () => assetInspectionOptions.filter((record) => !form.linked_asset_id || record.asset_id === form.linked_asset_id),
    [assetInspectionOptions, form.linked_asset_id]
  );

  const editInspectionOptions = useMemo(
    () => assetInspectionOptions.filter((record) => !editForm.linked_asset_id || record.asset_id === editForm.linked_asset_id),
    [assetInspectionOptions, editForm.linked_asset_id]
  );

  const createMaintenanceOptions = useMemo(
    () => assetMaintenanceOptions.filter((record) => !form.linked_asset_id || record.asset_id === form.linked_asset_id),
    [assetMaintenanceOptions, form.linked_asset_id]
  );

  const editMaintenanceOptions = useMemo(
    () => assetMaintenanceOptions.filter((record) => !editForm.linked_asset_id || record.asset_id === editForm.linked_asset_id),
    [assetMaintenanceOptions, editForm.linked_asset_id]
  );

  const createCalibrationOptions = useMemo(
    () => assetCalibrationOptions.filter((record) => !form.linked_asset_id || record.asset_id === form.linked_asset_id),
    [assetCalibrationOptions, form.linked_asset_id]
  );

  const editCalibrationOptions = useMemo(
    () => assetCalibrationOptions.filter((record) => !editForm.linked_asset_id || record.asset_id === editForm.linked_asset_id),
    [assetCalibrationOptions, editForm.linked_asset_id]
  );

  function handleCreateFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (!canCreateAction) {
      event.target.value = "";
      setMessage("Read-only access: you do not have permission to upload evidence while creating actions.");
      return;
    }
    const files = Array.from(event.target.files || []);
    setCreateFiles(files);
  }

  function handleSelectedEvidenceFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (!canEditAction) {
      event.target.value = "";
      setMessage("Read-only access: you do not have permission to upload action evidence.");
      return;
    }
    const files = Array.from(event.target.files || []);
    setSelectedEvidenceFiles(files);
  }

  async function handleActionImportFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (!canCreateAction) {
      event.target.value = "";
      setMessage("Read-only access: you do not have permission to import actions.");
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

      const parsedRows = rawRows.map((row, index): ActionImportRow => {
        const title = getImportCell(row, ["Title", "Action Title", "Action", "Action Required"]);
        const descriptionParts = [
          getImportCell(row, ["Description", "Action Description", "Details"]),
          getImportCell(row, ["Comments", "Comment", "Notes"]),
        ].filter(Boolean);
        const department = normalizeImportDepartment(getImportCell(row, ["Department", "Allocation", "Action Department", "Function"]));
        const project = getImportCell(row, ["Project", "Project / Work Scope", "Work Scope", "Project Work Scope"]);
        const rawOwner = getImportCell(row, ["Owner", "Assigned", "Assigned To", "Action Owner", "Responsible Person"]);
        const owner = rawOwner ? titleCaseName(rawOwner) : "";
        const priority = normalizeImportPriority(getImportCell(row, ["Priority"]));
        const status = normalizeImportStatus(getImportCell(row, ["Status"]));
        const dueDate = normalizeImportDate(getRawImportCell(row, ["Due Date", "Target Date", "Target Response Date"]));
        const source = normalizeImportSource(getImportCell(row, ["Source", "Source Type", "Module"]));
        const linkedReference = getImportCell(row, [
          "Linked Record",
          "Linked Reference",
          "AINM No",
          "AINM Number",
          "Inspection No",
          "Inspection Number",
          "NCR No",
          "NCR Number",
          "MOC No",
          "MOC Number",
        ]);
        const errors: string[] = [];
        const skipReasons: string[] = [];
        const rowKey = normalizeLookupValue(`${title}|${department}|${project}|${owner}|${dueDate}|${descriptionParts.join(" ")}`);
        const normalizedOwner = normalizeLookupValue(owner);
        const ownerEmail = owner ? generateEmailFromName(owner) : "";
        const personWillBeCreated = Boolean(owner && !existingPeople.has(normalizedOwner));

        if (!title) errors.push("Title/Action is required.");
        if (owner && !ownerEmail && !existingPeople.has(normalizedOwner)) {
          errors.push("Owner needs a first name and surname to create a People record.");
        }
        if (ownerEmail && existingEmails.has(normalizeLookupValue(ownerEmail)) && !existingPeople.has(normalizedOwner)) {
          skipReasons.push("Generated owner email already exists for another person.");
        }
        if (rowKey && uploadKeys.has(rowKey)) skipReasons.push("Duplicate action in uploaded file.");
        if (rowKey) uploadKeys.add(rowKey);

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

  function buildLinkedImportFields(row: ActionImportRow) {
    const reference = row.linkedReference.trim();
    const source = row.source.toLowerCase();
    const payload: Partial<ActionItem> = {};
    if (!reference) return payload;

    if (source === "ainm" || /^a?r?\d+/i.test(reference)) {
      const matched = ainmOptions.find((option) => option.number.toLowerCase() === reference.toLowerCase());
      payload.linked_ainm_id = matched?.id || null;
      payload.linked_ainm_number = matched?.number || reference;
      return payload;
    }

    if (source === "hse inspection" || /^hse-ins-/i.test(reference)) {
      const matched = hseInspectionOptions.find((option) => option.inspection_number.toLowerCase() === reference.toLowerCase());
      payload.linked_hse_inspection_id = matched?.id || null;
      payload.linked_hse_inspection_number = matched?.inspection_number || reference;
      return payload;
    }

    if (source === "observation" || /^obs-/i.test(reference)) {
      const matched = observationOptions.find((option) => option.observation_number.toLowerCase() === reference.toLowerCase());
      payload.linked_observation_id = matched?.id || null;
      payload.linked_observation_number = matched?.observation_number || reference;
      return payload;
    }

    if (source === "ncr/capa" || /^ncr-/i.test(reference)) {
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

    if (source === "moc") {
      const matched = mocOptions.find((option) => option.number.toLowerCase() === reference.toLowerCase());
      payload.linked_moc_id = matched?.id || null;
      payload.linked_moc_number = matched?.number || reference;
      return payload;
    }

    return payload;
  }

  async function importPreviewedActions() {
    if (!requireCreatePermission("import actions")) return;

    if (!importRows.length) {
      setMessage("Select an Excel file before importing actions.");
      return;
    }

    if (!importableRows.length) {
      setMessage("No valid action rows are available to import.");
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

      const nextNumbers = getNextBulkActionNumbers(actions, importableRows.length);
      const actionRows = importableRows.map((row, index) => ({
        action_number: nextNumbers[index],
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

      setMessage(`Imported ${actionRows.length} action${actionRows.length === 1 ? "" : "s"} from ${importFileName}.`);
      setImportRows([]);
      setImportFileName("");
      setActiveView("register");
      await Promise.all([loadActions(false), loadPeople()]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action import failed.");
    } finally {
      setIsImportingActions(false);
    }
  }

  function applySourceChange(
    current: ActionForm,
    source: string
  ): ActionForm {
    if (isAuditLinkedSource(source)) {
      return {
        ...current,
        source,
        department: "Quality",
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
        linked_observation_id: "",
        linked_observation_number: "",
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
        linked_ainm_id: "",
        linked_ainm_number: "",
        linked_hse_inspection_id: "",
        linked_hse_inspection_number: "",
        linked_observation_id: "",
        linked_observation_number: "",
      };
    }

    if (source === "NCR/CAPA") {
      return {
        ...current,
        source,
        department: "Quality",
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
        linked_ainm_id: "",
        linked_ainm_number: "",
        linked_hse_inspection_id: "",
        linked_hse_inspection_number: "",
        linked_observation_id: "",
        linked_observation_number: "",
      };
    }

    if (source === "MOC") {
      return {
        ...current,
        source,
        department: "Quality",
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
        linked_ainm_id: "",
        linked_ainm_number: "",
        linked_hse_inspection_id: "",
        linked_hse_inspection_number: "",
        linked_observation_id: "",
        linked_observation_number: "",
      };
    }

    if (source === "AINM") {
      return {
        ...current,
        source,
        department: "HSE",
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
        linked_hse_inspection_id: "",
        linked_hse_inspection_number: "",
        linked_observation_id: "",
        linked_observation_number: "",
      };
    }

    if (source === "HSE Inspection") {
      return {
        ...current,
        source,
        department: "HSE",
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
        linked_observation_id: "",
        linked_observation_number: "",
      };
    }

    if (source === "Observation") {
      return {
        ...current,
        source,
        department: "HSE",
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
      linked_ainm_id: "",
      linked_ainm_number: "",
      linked_hse_inspection_id: "",
      linked_hse_inspection_number: "",
      linked_observation_id: "",
      linked_observation_number: "",
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

  function applyAinmSelection(current: ActionForm, ainmId: string): ActionForm {
    const selected = ainmOptions.find((option) => option.id === ainmId);
    return {
      ...current,
      linked_ainm_id: selected?.id || "",
      linked_ainm_number: selected?.number || "",
      project: current.project || selected?.project || "",
    };
  }

  function applyHseInspectionSelection(current: ActionForm, inspectionId: string): ActionForm {
    const selected = hseInspectionOptions.find((option) => option.id === inspectionId);
    return {
      ...current,
      linked_hse_inspection_id: selected?.id || "",
      linked_hse_inspection_number: selected?.inspection_number || "",
      department: "HSE",
      project: current.project || selected?.project_work_scope || selected?.area_zone || "",
      title: current.title || (selected ? `${selected.inspection_number} - ${selected.title || selected.form_title}` : current.title),
    };
  }

  function applyObservationSelection(current: ActionForm, observationId: string): ActionForm {
    const selected = observationOptions.find((option) => option.id === observationId);
    return {
      ...current,
      linked_observation_id: selected?.id || "",
      linked_observation_number: selected?.observation_number || "",
      department: "HSE",
      project: current.project || selected?.project || selected?.site_location || "",
      title: current.title || (selected ? `${selected.observation_number} - ${selected.title || selected.observation_type || "Observation"}` : current.title),
    };
  }

  function applyAssetSelection(current: ActionForm, assetId: string): ActionForm {
    const selected = assetOptions.find((option) => option.id === assetId);
    return {
      ...current,
      linked_asset_id: selected?.id || "",
      linked_asset_code: selected?.asset_code || "",
      linked_inspection_id: "",
      linked_inspection_number: "",
      linked_maintenance_id: "",
      linked_maintenance_number: "",
      linked_calibration_id: "",
      project: current.project || selected?.asset_code || "",
    };
  }

  function applyInspectionSelection(current: ActionForm, inspectionId: string): ActionForm {
    const selected = assetInspectionOptions.find((option) => option.id === inspectionId);
    const selectedAsset = selected ? assetOptions.find((option) => option.id === selected.asset_id) : null;
    return {
      ...current,
      linked_asset_id: selected?.asset_id || current.linked_asset_id,
      linked_asset_code: selectedAsset?.asset_code || current.linked_asset_code,
      linked_inspection_id: selected?.id || "",
      linked_inspection_number: selected?.inspection_number || "",
      project: current.project || selectedAsset?.asset_code || "",
      title: current.title || (selected ? `Inspection follow-up - ${selected.inspection_number}` : current.title),
    };
  }

  function applyMaintenanceSelection(current: ActionForm, maintenanceId: string): ActionForm {
    const selected = assetMaintenanceOptions.find((option) => option.id === maintenanceId);
    const selectedAsset = selected ? assetOptions.find((option) => option.id === selected.asset_id) : null;
    return {
      ...current,
      linked_asset_id: selected?.asset_id || current.linked_asset_id,
      linked_asset_code: selectedAsset?.asset_code || current.linked_asset_code,
      linked_maintenance_id: selected?.id || "",
      linked_maintenance_number: selected?.maintenance_number || "",
      project: current.project || selectedAsset?.asset_code || "",
      title: current.title || (selected ? `Maintenance follow-up - ${selected.maintenance_number}` : current.title),
    };
  }

  function applyCalibrationSelection(current: ActionForm, calibrationId: string): ActionForm {
    const selected = assetCalibrationOptions.find((option) => option.id === calibrationId);
    const selectedAsset = selected ? assetOptions.find((option) => option.id === selected.asset_id) : null;
    const label = selected?.certificate_number || selected?.reference || "calibration record";
    return {
      ...current,
      linked_asset_id: selected?.asset_id || current.linked_asset_id,
      linked_asset_code: selectedAsset?.asset_code || current.linked_asset_code,
      linked_calibration_id: selected?.id || "",
      project: current.project || selectedAsset?.asset_code || "",
      title: current.title || (selected ? `Calibration follow-up - ${label}` : current.title),
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
    if (!requireCreatePermission("create actions")) return;

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
          linked_ainm_id: form.linked_ainm_id || null,
          linked_ainm_number: form.linked_ainm_number.trim() || null,
          linked_hse_inspection_id: form.linked_hse_inspection_id || null,
          linked_hse_inspection_number: form.linked_hse_inspection_number.trim() || null,
          linked_observation_id: form.linked_observation_id || null,
          linked_observation_number: form.linked_observation_number.trim() || null,
          raised_by_email: currentUserEmail || null,
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

    if (form.owner.trim()) {
      const ownerRecord = people.find((p) => p.name.toLowerCase() === form.owner.trim().toLowerCase());
      if (ownerRecord?.email) {
        void fetch("/api/notify-assignment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "assigned",
            recipientEmail: ownerRecord.email,
            recipientName: ownerRecord.name,
            itemType: "Action",
            itemRef: String(actionNumberToUse),
            itemTitle: form.title.trim(),
            status: form.status,
            dueDate: form.due_date || undefined,
            itemUrl: `${window.location.origin}/actions?action=${encodeURIComponent(String(actionNumberToUse))}`,
          }),
        });
      }
    }

    await loadActions(false);
  }

  async function saveEdit(id: string) {
    if (!requireEditPermission("edit actions")) return;

    if (!editForm.title.trim()) {
      setMessage("Title is required.");
      return;
    }

    setIsSaving(true);

    // Core update — always safe regardless of migration state
    const corePayload: Record<string, unknown> = {
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
      linked_ainm_id: editForm.linked_ainm_id || null,
      linked_ainm_number: editForm.linked_ainm_number.trim() || null,
      linked_hse_inspection_id: editForm.linked_hse_inspection_id || null,
      linked_hse_inspection_number: editForm.linked_hse_inspection_number.trim() || null,
      linked_observation_id: editForm.linked_observation_id || null,
      linked_observation_number: editForm.linked_observation_number.trim() || null,
      updated_at: new Date().toISOString(),
    };

    // Include close_out_comments if the column exists (migration has been run)
    if (editForm.close_out_comments.trim()) {
      corePayload.close_out_comments = editForm.close_out_comments.trim();
    }

    const { error } = await supabase
      .from("actions")
      .update(corePayload)
      .eq("id", id);

    setIsSaving(false);

    if (error) {
      setMessage(`Update failed: ${error.message}`);
      return;
    }

    setMessage("Action updated successfully.");

    const actionRecord = actions.find((a) => a.id === id);
    const actionRef = actionRecord?.action_number ? String(actionRecord.action_number) : "";
    const actionUrl = actionRecord?.action_number
      ? `${window.location.origin}/actions?action=${encodeURIComponent(String(actionRecord.action_number))}`
      : undefined;
    const prevStatus = actionRecord?.status ?? "";
    const prevCloseOut = actionRecord?.close_out_comments ?? "";

    // Notify owner only when the owner has changed or been newly set
    const prevOwner = (actionRecord?.owner ?? "").trim().toLowerCase();
    const newOwner = editForm.owner.trim().toLowerCase();
    if (newOwner && newOwner !== prevOwner) {
      const ownerRecord = people.find((p) => p.name.toLowerCase() === newOwner);
      if (ownerRecord?.email) {
        void fetch("/api/notify-assignment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "assigned",
            recipientEmail: ownerRecord.email,
            recipientName: ownerRecord.name,
            itemType: "Action",
            itemRef: actionRef,
            itemTitle: editForm.title.trim(),
            status: editForm.status,
            dueDate: editForm.due_date || undefined,
            itemUrl: actionUrl,
          }),
        });
      }
    }

    // Notify raiser when status changes
    const raiserEmail = actionRecord?.raised_by_email;
    const raiserName = raiserEmail ? (people.find((p) => p.email === raiserEmail)?.name ?? undefined) : undefined;
    if (raiserEmail && editForm.status !== prevStatus) {
      void fetch("/api/notify-assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "status-changed",
          recipientEmail: raiserEmail,
          recipientName: raiserName,
          itemType: "Action",
          itemRef: actionRef,
          itemTitle: editForm.title.trim(),
          status: editForm.status,
          dueDate: editForm.due_date || undefined,
          itemUrl: actionUrl,
        }),
      });
    }

    // Notify raiser when close-out comments are newly added or changed
    const newCloseOut = editForm.close_out_comments.trim();
    if (raiserEmail && newCloseOut && newCloseOut !== (prevCloseOut ?? "").trim()) {
      void fetch("/api/notify-assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "closed-out",
          recipientEmail: raiserEmail,
          recipientName: raiserName,
          itemType: "Action",
          itemRef: actionRef,
          itemTitle: editForm.title.trim(),
          status: editForm.status,
          closeOutComments: newCloseOut,
          itemUrl: actionUrl,
        }),
      });
    }

    await loadActions(false);
  }

  async function deleteAction(id: string) {
    if (!requireEditPermission("delete actions")) return;

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
    if (!requireEditPermission("upload action evidence")) return;

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
    if (!requireEditPermission("delete action evidence")) return;

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
      doc.text("Action Register", pageWidth / 2, 17, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(83, 86, 90);
      doc.text("Enshore IMS — Central Action Management", pageWidth / 2, 23, { align: "center" });
      doc.text(`Generated: ${generatedAt}`, pageWidth - margin, 17, { align: "right" });
      doc.text(`Actions: ${filteredActions.length}`, pageWidth - margin, 23, { align: "right" });

      doc.setDrawColor(0, 86, 112);
      doc.setLineWidth(0.7);
      doc.line(margin, 31, pageWidth - margin, 31);

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
        startY: 35,
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
          lineColor: [208, 208, 206],
          lineWidth: 0.2,
          textColor: [0, 0, 0],
          overflow: "linebreak",
          valign: "top",
        },
        headStyles: {
          fillColor: [0, 0, 0],
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
          doc.setTextColor(83, 86, 90);
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
    setShowOpenOnly(false);
    setShowClosedOnly(false);
    setQuickFilter("");
    setShowEvidenceOnly(false);
    setShowLinkedIssuesOnly(false);
    setDueStartFilter(0);
    setDueWindowFilter(0);
    setShowNoDueDateOnly(false);
    setCreatedMonthFilter("");
    setClosedMonthFilter("");
    setSelectedEvidenceAction(null);
  }

  function openRegisterDrilldown(options: RegisterDrilldownOptions = {}) {
    setActiveView("register");
    setSelectedEvidenceAction(null);
    if (options.search !== undefined) setSearch(options.search);
    if (options.status !== undefined) setStatusFilter(options.status);
    if (options.priority !== undefined) setPriorityFilter(options.priority);
    if (options.owner !== undefined) setOwnerFilter(options.owner);
    if (options.project !== undefined) setProjectFilter(options.project);
    if (options.source !== undefined) setSourceFilter(options.source);
    if (options.department !== undefined) setDepartmentFilter(options.department);
    if (options.overdue !== undefined) setShowOverdueOnly(options.overdue);
    if (options.openOnly !== undefined) setShowOpenOnly(options.openOnly);
    if (options.closedOnly !== undefined) setShowClosedOnly(options.closedOnly);
    if (options.quickFilter !== undefined) setQuickFilter(options.quickFilter);
    if (options.evidenceOnly !== undefined) setShowEvidenceOnly(options.evidenceOnly);
    if (options.linkedIssuesOnly !== undefined) setShowLinkedIssuesOnly(options.linkedIssuesOnly);
    if (options.dueStart !== undefined) setDueStartFilter(options.dueStart);
    if (options.dueWindow !== undefined) setDueWindowFilter(options.dueWindow);
    if (options.noDueDateOnly !== undefined) setShowNoDueDateOnly(options.noDueDateOnly);
    if (options.createdMonth !== undefined) setCreatedMonthFilter(options.createdMonth);
    if (options.closedMonth !== undefined) setClosedMonthFilter(options.closedMonth);
  }

  function handleStatusDrilldown(status: string) {
    openRegisterDrilldown({ status });
  }

  function handleDuePressureDrilldown(label: string) {
    if (label === "Overdue") {
      openRegisterDrilldown({ overdue: true, quickFilter: "overdue" });
      return;
    }

    if (label === "Due 7 Days") {
      openRegisterDrilldown({ dueStart: 0, dueWindow: 7, quickFilter: "dueWeek" });
      return;
    }

    if (label === "Due 30 Days") {
      openRegisterDrilldown({ dueStart: 8, dueWindow: 30 });
      return;
    }

    if (label === "No Due Date") {
      openRegisterDrilldown({ noDueDateOnly: true });
    }
  }

  function openActionInRegister(action: ActionItem) {
    setActiveView("register");
    setSelectedEvidenceAction(action);
    setSearch(action.action_number || "");
    setQuickFilter("");
    setShowOpenOnly(false);
    setShowClosedOnly(false);
    setShowEvidenceOnly(false);
    setShowLinkedIssuesOnly(false);
    setDueStartFilter(0);
    setDueWindowFilter(0);
    setShowNoDueDateOnly(false);
    setCreatedMonthFilter("");
    setClosedMonthFilter("");
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

      <div className="ims-top-meta-row" style={topMetaRowStyle}>
        <Link href="/home" style={backLinkStyle}>
          ← Back to IMS Home
        </Link>

        <div style={statusBannerStyleInline}>
          <strong>Status:</strong> {message}
        </div>
      </div>

      <ActionViewTabs activeView={activeView} onChange={setActiveView} />

      {activeView === "dashboard" ? (
        <>
          <section className="quality-kpi-grid" style={statsGridStyle}>
            <QualityKpiCard
              title="Open Actions"
              value={openActions}
              accent="#63B1BC"
              onClick={() => openRegisterDrilldown({ openOnly: true })}
            />
            <QualityKpiCard
              title="Closed / Complete"
              value={closedActions}
              accent="#005670"
              onClick={() => openRegisterDrilldown({ closedOnly: true })}
            />
            <QualityKpiCard
              title="Overdue Actions"
              value={overdueActions}
              accent="#F93822"
              onClick={() => openRegisterDrilldown({ overdue: true, quickFilter: "overdue" })}
            />
            <QualityKpiCard
              title="Evidence Files"
              value={linkedEvidenceFiles.length}
              accent="#53565A"
              onClick={() => openRegisterDrilldown({ evidenceOnly: true })}
            />
            <QualityKpiCard
              title="My Open Actions"
              value={myOpenActions}
              accent="#005670"
              onClick={() => openRegisterDrilldown({ openOnly: true, quickFilter: "my" })}
            />
            <QualityKpiCard
              title="Linked Record Issues"
              value={linkedRecordIssues}
              accent="#FFAD00"
              onClick={() => openRegisterDrilldown({ linkedIssuesOnly: true })}
            />
          </section>

          <SectionCard
            title="Action Intelligence Dashboard"
            subtitle="Operational visibility across ownership, source modules, due-date pressure, and closure movement."
          >
            <div style={dashboardGridStyle}>
              <ChartPanel title="Actions by Status">
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={statusChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar
                      dataKey="value"
                      fill="#005670"
                      radius={[6, 6, 0, 0]}
                      onClick={(entry) => handleStatusDrilldown(String((entry as ChartDatum).name || ""))}
                      cursor="pointer"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartPanel>

              <ChartPanel title="Actions by Source / Module">
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={sourceChartData} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={92} />
                    <Tooltip />
                    <Bar
                      dataKey="value"
                      fill="#63B1BC"
                      radius={[0, 6, 6, 0]}
                      onClick={(entry) =>
                        openRegisterDrilldown({ source: String((entry as ChartDatum).filterValue || "") })
                      }
                      cursor="pointer"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartPanel>

              <ChartPanel title="Open Actions by Owner">
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={openOwnerChartData} layout="vertical" margin={{ left: 32 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={104} />
                    <Tooltip />
                    <Bar
                      dataKey="value"
                      fill="#53565A"
                      radius={[0, 6, 6, 0]}
                      onClick={(entry) => openRegisterDrilldown({ owner: String((entry as ChartDatum).name || "") })}
                      cursor="pointer"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartPanel>

              <ChartPanel title="Due Date Pressure">
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={duePressureData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar
                      dataKey="value"
                      radius={[6, 6, 0, 0]}
                      onClick={(entry) => handleDuePressureDrilldown(String((entry as ChartDatum).name || ""))}
                      cursor="pointer"
                    >
                      {duePressureData.map((entry, index) => (
                        <Cell key={entry.name} fill={chartColours[index % chartColours.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartPanel>

              <ChartPanel title="Priority Mix">
                <ResponsiveContainer width="100%" height={230}>
                  <PieChart>
                    <Pie
                      data={priorityMixData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={54}
                      outerRadius={82}
                      paddingAngle={2}
                      label
                      onClick={(entry) => openRegisterDrilldown({ priority: String((entry as ChartDatum).name || "") })}
                      cursor="pointer"
                    >
                      {priorityMixData.map((entry, index) => (
                        <Cell key={entry.name} fill={chartColours[index % chartColours.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </ChartPanel>

              <ChartPanel title="Closure Trend">
                <ResponsiveContainer width="100%" height={230}>
                  <LineChart
                    data={closureTrendData}
                    onClick={(state: unknown) => {
                      const month = (state as RechartsClickState)?.activePayload?.[0]?.payload?.name;
                      if (month) openRegisterDrilldown({ closedMonth: month });
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="closed" stroke="#005670" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartPanel>
            </div>
          </SectionCard>
        </>
      ) : null}

      {activeView === "create" ? (
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

              {form.source === "AINM" ? (
                <Field label="AINM Record">
                  <select
                    value={form.linked_ainm_id}
                    onChange={(e) => setForm((current) => applyAinmSelection(current, e.target.value))}
                    style={inputStyle}
                  >
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
                  <select
                    value={form.linked_hse_inspection_id}
                    onChange={(e) => setForm((current) => applyHseInspectionSelection(current, e.target.value))}
                    style={inputStyle}
                  >
                    <option value="">Select HSE inspection</option>
                    {hseInspectionOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.inspection_number} - {option.title || option.form_title}{option.inspection_date ? ` (${formatDate(option.inspection_date)})` : ""}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}

              {form.source === "Observation" ? (
                <Field label="Observation Record">
                  <select
                    value={form.linked_observation_id}
                    onChange={(e) => setForm((current) => applyObservationSelection(current, e.target.value))}
                    style={inputStyle}
                  >
                    <option value="">Select observation</option>
                    {observationOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.observation_number} - {option.title || option.observation_type || "Observation"}{option.project ? ` (${option.project})` : ""}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}

              {isAssetLinkedSource(form.source) ? (
                <>
                  <Field label="Linked Asset">
                    <select
                      value={form.linked_asset_id}
                      onChange={(e) => setForm((current) => applyAssetSelection(current, e.target.value))}
                      style={inputStyle}
                    >
                      <option value="">Select asset</option>
                      {assetOptions.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.asset_code} - {asset.name || "Unnamed asset"}
                        </option>
                      ))}
                    </select>
                  </Field>

                  {form.source === "Asset Inspection" ? (
                    <Field label="Inspection Record">
                      <select
                        value={form.linked_inspection_id}
                        onChange={(e) => setForm((current) => applyInspectionSelection(current, e.target.value))}
                        style={inputStyle}
                      >
                        <option value="">Select inspection</option>
                        {createInspectionOptions.map((record) => {
                          const asset = assetOptions.find((option) => option.id === record.asset_id);
                          return (
                            <option key={record.id} value={record.id}>
                              {record.inspection_number} - {asset?.asset_code || "Asset"}{record.inspection_date ? ` (${formatDate(record.inspection_date)})` : ""}
                            </option>
                          );
                        })}
                      </select>
                    </Field>
                  ) : null}

                  {form.source === "Asset Maintenance" ? (
                    <Field label="Maintenance Record">
                      <select
                        value={form.linked_maintenance_id}
                        onChange={(e) => setForm((current) => applyMaintenanceSelection(current, e.target.value))}
                        style={inputStyle}
                      >
                        <option value="">Select maintenance</option>
                        {createMaintenanceOptions.map((record) => {
                          const asset = assetOptions.find((option) => option.id === record.asset_id);
                          return (
                            <option key={record.id} value={record.id}>
                              {record.maintenance_number} - {asset?.asset_code || "Asset"}{record.maintenance_date ? ` (${formatDate(record.maintenance_date)})` : ""}
                            </option>
                          );
                        })}
                      </select>
                    </Field>
                  ) : null}

                  {form.source === "Asset Calibration" ? (
                    <Field label="Calibration Record">
                      <select
                        value={form.linked_calibration_id}
                        onChange={(e) => setForm((current) => applyCalibrationSelection(current, e.target.value))}
                        style={inputStyle}
                      >
                        <option value="">Select calibration</option>
                        {createCalibrationOptions.map((record) => {
                          const asset = assetOptions.find((option) => option.id === record.asset_id);
                          const label = record.certificate_number || record.reference || "Calibration record";
                          return (
                            <option key={record.id} value={record.id}>
                              {label} - {asset?.asset_code || "Asset"}{record.calibration_date ? ` (${formatDate(record.calibration_date)})` : ""}
                            </option>
                          );
                        })}
                      </select>
                    </Field>
                  ) : null}
                </>
              ) : null}

              <Field label="Evidence Files (optional)">
                <input type="file" multiple onChange={handleCreateFileChange} style={inputStyle} disabled={!canCreateAction} />
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
              <button type="submit" style={primaryButtonStyle} disabled={isSaving || !canCreateAction}>
                {isSaving ? "Saving..." : "Add Action"}
              </button>
              <span style={helperTextStyle}>
                Numbering fills the next available slot automatically. Evidence uploads after the action is created.
              </span>
            </div>
          </form>
        </SectionCard>
      ) : null}

      {activeView === "priority" ? (
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

            <MiniListCard
              title="High Priority Open"
              emptyText="No high-priority open actions."
              items={highPriorityList.map((action) => ({
                id: action.id,
                line1: `${action.action_number || "-"} - ${action.title || "Untitled action"}`,
                line2: `${action.project || "No project"} | ${action.owner || "No owner"} | ${getDueLabel(
                  action.due_date
                )}`,
                tone: "red" as const,
              }))}
            />
          </div>
        </SectionCard>
      ) : null}

      {activeView === "my" ? (
        <SectionCard
          title="My Actions"
          subtitle="Personal work view matched from the signed-in user email to the active People Management record. Includes central Actions, NCRs, Audit Findings, AINMs, and Observations assigned to you."
        >
          <div style={myActionsNoticeStyle}>
            <strong>My Actions:</strong> {currentPersonNotice}
          </div>

          <section style={statsGridStyle}>
            <QualityKpiCard title="My Total Items" value={myActionList.length} accent="#005670" onClick={() => setMyActionFilter("all")} />
            <QualityKpiCard title="My Open Items" value={myOpenWorkItems.length} accent="#63B1BC" onClick={() => setMyActionFilter("open")} />
            <QualityKpiCard title="My Closed Items" value={myClosedActions.length} accent="#005670" onClick={() => setMyActionFilter("closed")} />
            <QualityKpiCard title="My Overdue" value={myOverdueActions.length} accent="#F93822" onClick={() => setMyActionFilter("overdue")} />
            <QualityKpiCard title="My Due This Week" value={myDueThisWeekActions.length} accent="#FFAD00" onClick={() => setMyActionFilter("dueWeek")} />
          </section>

          {currentPersonName ? (
            <>
              <div style={listGridStyle}>
                <MiniListCard
                  title="My Overdue Items"
                  emptyText="No overdue items are assigned to you."
                  onItemClick={(id) => {
                    const item = myOverdueActions.find((entry) => entry.id === id);
                    if (item) openMyWorkItem(item);
                  }}
                  items={myOverdueActions.slice(0, 8).map((item) => ({
                    id: item.id,
                    line1: `${item.number} - ${item.title}`,
                    line2: `${item.project} | ${item.source === "Action" && item.action ? getActionSourceLabel(item.action) : item.source} | ${getDueLabel(
                      item.due_date
                    )}`,
                    tone: "red" as const,
                  }))}
                />
                <MiniListCard
                  title="My Due This Week"
                  emptyText="No items assigned to you are due this week."
                  onItemClick={(id) => {
                    const item = myDueThisWeekActions.find((entry) => entry.id === id);
                    if (item) openMyWorkItem(item);
                  }}
                  items={myDueThisWeekActions.slice(0, 8).map((item) => ({
                    id: item.id,
                    line1: `${item.number} - ${item.title}`,
                    line2: `${item.project} | ${item.source === "Action" && item.action ? getActionSourceLabel(item.action) : item.source} | ${getDueLabel(
                      item.due_date
                    )}`,
                    tone: "amber" as const,
                  }))}
                />
              </div>

              <div style={myRegisterHeaderStyle}>
                <div>
                  <h3 style={myRegisterTitleStyle}>My Action Register</h3>
                  <p style={myRegisterSubtitleStyle}>
                    Showing {myFilteredActions.length} {myActionFilterLabel.toLowerCase()} for {currentPersonName}.
                  </p>
                </div>
                <button type="button" style={secondaryButtonStyle} onClick={clearMyItemFilters}>
                  Show All Mine
                </button>
              </div>

              <div className="ims-filter-panel" style={simpleFilterShellStyle}>
                <div style={simpleFilterTopRowStyle}>
                  <button type="button" onClick={clearMyItemFilters} style={secondaryButtonStyle}>
                    Clear Filters
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMyItemFilters((current) => !current)}
                    style={showMyItemFilters ? secondaryButtonStyle : primaryButtonStyle}
                  >
                    {showMyItemFilters ? "Hide Filters" : "Show Filters"}
                  </button>
                </div>

                {showMyItemFilters ? (
                  <div className="ims-filter-panel" style={filterBarStyle}>
                    <select value={myItemStatusFilter} onChange={(e) => setMyItemStatusFilter(e.target.value)} style={inputStyle}>
                      <option value="">All Status</option>
                      <option value="Open">Open</option>
                      <option value="Closed">Closed</option>
                    </select>

                    <select value={myItemTypeFilter} onChange={(e) => setMyItemTypeFilter(e.target.value)} style={inputStyle}>
                      <option value="">All Types</option>
                      <option value="Action">Action</option>
                      <option value="NCR">NCR</option>
                      <option value="AINM">AINM</option>
                      <option value="Observation">Observation</option>
                      <option value="Audit Finding">Audit Finding</option>
                    </select>
                  </div>
                ) : null}
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={myActionsTableStyle}>
                  <thead>
                    <tr>
                      <th style={{ ...tableHeadStyle, ...myTypeColumnStyle }}>Type</th>
                      <th style={{ ...tableHeadStyle, ...myReferenceColumnStyle }}>Reference</th>
                      <th style={{ ...tableHeadStyle, ...myTitleColumnStyle }}>Title</th>
                      <th style={{ ...tableHeadStyle, ...mySourceColumnStyle }}>Source</th>
                      <th style={{ ...tableHeadStyle, ...myLinkedRecordColumnStyle }}>Linked Record</th>
                      <th style={{ ...tableHeadStyle, ...myPriorityColumnStyle }}>Priority</th>
                      <th style={{ ...tableHeadStyle, ...myDueDateColumnStyle }}>Due Date</th>
                      <th style={{ ...tableHeadStyle, ...myStatusColumnStyle }}>Status</th>
                      <th style={{ ...tableHeadStyle, ...myActionColumnStyle }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myFilteredActions.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={emptyTableCellStyle}>
                          No items match this My Actions filter.
                        </td>
                      </tr>
                    ) : (
                      myFilteredActions.map((item) => {
                        const overdue = isOverdue(item);
                        return (
                          <tr
                            key={item.id}
                            style={{ ...tableRowStyle, cursor: "pointer", background: overdue ? "#ECECE7" : "white" }}
                            onClick={() => openMyWorkItem(item)}
                          >
                            <td style={{ ...tableCellStyle, ...myTypeColumnStyle }}><MyWorkItemTypeChip source={item.source} /></td>
                            <td style={{ ...tableCellStyle, ...myReferenceColumnStyle }}><div style={actionNumberCellStyle}>{item.number}</div></td>
                            <td style={{ ...tableCellStyle, ...myTitleColumnStyle }}>
                              <div style={truncatedCellTextStyle} title={item.title}>{item.title}</div>
                              <div style={truncatedSecondaryCellTextStyle} title={item.project}>{item.project}</div>
                            </td>
                            <td style={{ ...tableCellStyle, ...mySourceColumnStyle }}>{item.source === "Action" && item.action ? <SourceChip action={item.action} /> : <span style={secondaryCellTextStyle}>-</span>}</td>
                            <td style={{ ...tableCellStyle, ...myLinkedRecordColumnStyle }}>{item.source === "Action" && item.action ? <LinkedRecordChips action={item.action} /> : <span style={secondaryCellTextStyle}>-</span>}</td>
                            <td style={{ ...tableCellStyle, ...myPriorityColumnStyle }}><span style={badgeStyle}>{item.source === "Action" && item.action ? item.action.priority || "-" : "-"}</span></td>
                            <td style={{ ...tableCellStyle, ...myDueDateColumnStyle }}>
                              <div style={primaryCellTextStyle}>{formatDate(item.due_date)}</div>
                              <div style={{ ...secondaryCellTextStyle, color: overdue ? "#F93822" : "#53565A", fontWeight: overdue ? 700 : 500 }}>
                                {getDueLabel(item.due_date)}
                              </div>
                            </td>
                            <td style={{ ...tableCellStyle, ...myStatusColumnStyle }}><StatusBadge value={item.status || "Unknown"} /></td>
                            <td style={{ ...tableCellStyle, ...myActionColumnStyle }}>
                              <button
                                type="button"
                                style={miniButtonStyle}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openMyWorkItem(item);
                                }}
                              >
                                Open
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div style={emptyEvidencePanelStyle}>No personal action list is available until your login email matches an active People record.</div>
          )}
        </SectionCard>
      ) : null}

      {activeView === "bulk" ? (
        <SectionCard
          title="Bulk Upload Actions"
          subtitle="Upload an Excel action tracker, preview rows, create missing People records, and import into the central Action Management register."
        >
          <div style={importPanelStyle}>
            <div style={importControlRowStyle}>
              <input type="file" accept=".xlsx" onChange={(event) => void handleActionImportFileChange(event)} style={fileInputStyle} disabled={!canCreateAction} />
              <button
                type="button"
                style={primaryButtonStyle}
                disabled={!importableRows.length || isImportingActions || !canCreateAction}
                onClick={() => void importPreviewedActions()}
              >
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
                <div style={tableInfoRowStyle}>
                  Previewing {importRows.length} row{importRows.length === 1 ? "" : "s"} from {importFileName || "selected workbook"}.
                  {" "}
                  <strong>{importableRows.length}</strong> ready, <strong>{skippedImportRows.length}</strong> requiring attention/skipped.
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={importTableStyle}>
                    <thead>
                      <tr>
                        <th style={tableHeadStyle}>Row</th>
                        <th style={tableHeadStyle}>Title</th>
                        <th style={tableHeadStyle}>Department</th>
                        <th style={tableHeadStyle}>Owner</th>
                        <th style={tableHeadStyle}>Project</th>
                        <th style={tableHeadStyle}>Source</th>
                        <th style={tableHeadStyle}>Due Date</th>
                        <th style={tableHeadStyle}>Status</th>
                        <th style={tableHeadStyle}>Import Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.slice(0, 80).map((row) => {
                        const issues = [...row.errors, ...row.skipReasons];
                        return (
                          <tr key={`${row.rowNumber}-${row.title}`} style={issues.length ? importWarningRowStyle : tableRowStyle}>
                            <td style={actionNumberCellStyle}>{row.rowNumber}</td>
                            <td style={tableCellStyle}>{row.title || "-"}</td>
                            <td style={tableCellStyle}>{row.department || "HSE"}</td>
                            <td style={tableCellStyle}>
                              {row.owner || "-"}
                              {row.personWillBeCreated && !issues.length ? (
                                <div style={secondaryCellTextStyle}>Will add to People Management</div>
                              ) : null}
                            </td>
                            <td style={tableCellStyle}>{row.project || "-"}</td>
                            <td style={tableCellStyle}>{row.source || "HSE"}</td>
                            <td style={tableCellStyle}>{row.due_date ? formatDate(row.due_date) : "-"}</td>
                            <td style={tableCellStyle}>{row.status}</td>
                            <td style={tableCellStyle}>{issues.length ? issues.join(" ") : "Ready"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {importRows.length > 80 ? (
                  <p style={helperTextStyle}>Showing first 80 preview rows only. All valid rows will import.</p>
                ) : null}
              </>
            ) : (
              <div style={emptyEvidencePanelStyle}>
                Choose an Excel workbook to preview actions before import. Use a Department or Allocation column for HSE / Quality split.
              </div>
            )}
          </div>
        </SectionCard>
      ) : null}

      {activeView === "register" ? (
        <>
          <SectionCard
            title="Action Register"
            subtitle="Search the central register or show filters to narrow the action list."
          >
        <div className="ims-filter-panel" style={simpleFilterShellStyle}>
          <div style={simpleFilterTopRowStyle}>
            <input
              placeholder="Search action no. / title / project / owner"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={inputStyle}
            />
            <button type="button" onClick={clearFilters} style={secondaryButtonStyle}>
              Clear Filters
            </button>
            <button
              type="button"
              onClick={() => setShowRegisterFilters((current) => !current)}
              style={showRegisterFilters ? secondaryButtonStyle : primaryButtonStyle}
            >
              {showRegisterFilters ? "Hide Filters" : "Show Filters"}
            </button>
          </div>

          {showRegisterFilters ? (
          <div className="ims-filter-panel" style={filterBarStyle}>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
            <option value="">All Status</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Closed">Closed</option>
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
              background: showOverdueOnly ? "#000000" : "#D0D0CE",
              color: showOverdueOnly ? "#ffffff" : "#000000",
            }}
          >
            {showOverdueOnly ? "Showing Overdue Only" : "Include All Due Status"}
          </button>
          <button type="button" onClick={clearFilters} style={secondaryButtonStyle}>
            Clear Filters
          </button>
          <button
            type="button"
            onClick={() => void generateFilteredActionRegisterPdf()}
            style={primaryButtonStyle}
          >
            Generate PDF Report
          </button>
        </div>
          ) : null}
        </div>

        <div style={tableInfoRowStyle}>
          <span>
            Showing <strong>{filteredActions.length}</strong> of <strong>{actions.length}</strong> actions
            {quickFilter ? (
              <>
                {" "}
                with quick filter <strong>{quickFilter === "dueWeek" ? "Due This Week" : quickFilter === "highPriority" ? "High Priority" : quickFilter === "my" ? "My Actions" : "Overdue"}</strong>
              </>
            ) : null}
            {showOpenOnly ? (
              <>
                {" "}
                showing <strong>open/non-closed</strong>
              </>
            ) : null}
            {showClosedOnly ? (
              <>
                {" "}
                showing <strong>closed/complete</strong>
              </>
            ) : null}
            {showEvidenceOnly ? (
              <>
                {" "}
                with <strong>attached evidence</strong>
              </>
            ) : null}
            {showLinkedIssuesOnly ? (
              <>
                {" "}
                with <strong>linked record issues</strong>
              </>
            ) : null}
            {dueWindowFilter > 0 ? (
              <>
                {" "}
                due in <strong>{dueStartFilter > 0 ? `${dueStartFilter}-` : "0-"}{dueWindowFilter} days</strong>
              </>
            ) : null}
            {showNoDueDateOnly ? (
              <>
                {" "}
                with <strong>no due date</strong>
              </>
            ) : null}
            {closedMonthFilter ? (
              <>
                {" "}
                closed in <strong>{closedMonthFilter}</strong>
              </>
            ) : null}
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
                      aria-selected={selected}
                      data-selected={selected ? "true" : "false"}
                      onClick={() => setSelectedEvidenceAction(action)}
                      style={{
                        ...tableRowStyle,
                        cursor: "pointer",
                        background: overdue
                          ? "#eef7f8"
                          : selected
                          ? "#ECECE7"
                          : linkedMatch
                          ? "#eef7f8"
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
                        <SourceChip action={action} />
                      </td>
                      <td style={tableCellStyle}>
                        <LinkedRecordChips action={action} />
                      </td>
                      <td style={tableCellStyle}>{action.owner || "-"}</td>
                      <td style={tableCellStyle}>
                        <div style={primaryCellTextStyle}>{formatDate(action.due_date)}</div>
                        <div
                          style={{
                            ...secondaryCellTextStyle,
                            color: overdue ? "#F93822" : "#53565A",
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
                            disabled={!canEditAction}
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

      <div ref={actionDetailRef}>
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
                  </select>
                </Field>

                <Field label="Close-out Comments">
                  <textarea
                    value={editForm.close_out_comments}
                    onChange={(e) => setEditForm((current) => ({ ...current, close_out_comments: e.target.value }))}
                    style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }}
                    placeholder="Add close-out comments once the action has been completed…"
                  />
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

                {editForm.source === "AINM" ? (
                  <Field label="AINM Record">
                    <select
                      value={editForm.linked_ainm_id}
                      onChange={(e) => setEditForm((current) => applyAinmSelection(current, e.target.value))}
                      style={inputStyle}
                    >
                      <option value="">Select AINM</option>
                      {ainmOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.number} - {option.title || "Untitled"}{option.project ? ` (${option.project})` : ""}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : null}

                {editForm.source === "HSE Inspection" ? (
                  <Field label="HSE Inspection Record">
                    <select
                      value={editForm.linked_hse_inspection_id}
                      onChange={(e) => setEditForm((current) => applyHseInspectionSelection(current, e.target.value))}
                      style={inputStyle}
                    >
                      <option value="">Select HSE inspection</option>
                      {hseInspectionOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.inspection_number} - {option.title || option.form_title}{option.inspection_date ? ` (${formatDate(option.inspection_date)})` : ""}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : null}

                {editForm.source === "Observation" ? (
                  <Field label="Observation Record">
                    <select
                      value={editForm.linked_observation_id}
                      onChange={(e) => setEditForm((current) => applyObservationSelection(current, e.target.value))}
                      style={inputStyle}
                    >
                      <option value="">Select observation</option>
                      {observationOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.observation_number} - {option.title || option.observation_type || "Observation"}{option.project ? ` (${option.project})` : ""}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : null}

                {isAssetLinkedSource(editForm.source) ? (
                  <>
                    <Field label="Linked Asset">
                      <select
                        value={editForm.linked_asset_id}
                        onChange={(e) => setEditForm((current) => applyAssetSelection(current, e.target.value))}
                        style={inputStyle}
                      >
                        <option value="">Select asset</option>
                        {assetOptions.map((asset) => (
                          <option key={asset.id} value={asset.id}>
                            {asset.asset_code} - {asset.name || "Unnamed asset"}
                          </option>
                        ))}
                      </select>
                    </Field>

                    {editForm.source === "Asset Inspection" ? (
                      <Field label="Inspection Record">
                        <select
                          value={editForm.linked_inspection_id}
                          onChange={(e) => setEditForm((current) => applyInspectionSelection(current, e.target.value))}
                          style={inputStyle}
                        >
                          <option value="">Select inspection</option>
                          {editInspectionOptions.map((record) => {
                            const asset = assetOptions.find((option) => option.id === record.asset_id);
                            return (
                              <option key={record.id} value={record.id}>
                                {record.inspection_number} - {asset?.asset_code || "Asset"}{record.inspection_date ? ` (${formatDate(record.inspection_date)})` : ""}
                              </option>
                            );
                          })}
                        </select>
                      </Field>
                    ) : null}

                    {editForm.source === "Asset Maintenance" ? (
                      <Field label="Maintenance Record">
                        <select
                          value={editForm.linked_maintenance_id}
                          onChange={(e) => setEditForm((current) => applyMaintenanceSelection(current, e.target.value))}
                          style={inputStyle}
                        >
                          <option value="">Select maintenance</option>
                          {editMaintenanceOptions.map((record) => {
                            const asset = assetOptions.find((option) => option.id === record.asset_id);
                            return (
                              <option key={record.id} value={record.id}>
                                {record.maintenance_number} - {asset?.asset_code || "Asset"}{record.maintenance_date ? ` (${formatDate(record.maintenance_date)})` : ""}
                              </option>
                            );
                          })}
                        </select>
                      </Field>
                    ) : null}

                    {editForm.source === "Asset Calibration" ? (
                      <Field label="Calibration Record">
                        <select
                          value={editForm.linked_calibration_id}
                          onChange={(e) => setEditForm((current) => applyCalibrationSelection(current, e.target.value))}
                          style={inputStyle}
                        >
                          <option value="">Select calibration</option>
                          {editCalibrationOptions.map((record) => {
                            const asset = assetOptions.find((option) => option.id === record.asset_id);
                            const label = record.certificate_number || record.reference || "Calibration record";
                            return (
                              <option key={record.id} value={record.id}>
                                {label} - {asset?.asset_code || "Asset"}{record.calibration_date ? ` (${formatDate(record.calibration_date)})` : ""}
                              </option>
                            );
                          })}
                        </select>
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

              {sourceImpliesLinkedRecord(editForm.source) ? (
                <div style={linkedSourceCardStyle}>
                  <div style={linkedSourceTitleStyle}>Linked Record Intelligence</div>
                  <div style={linkedSourceChipRowStyle}>
                    <SourceChip action={selectedEvidenceAction} />
                    <LinkedRecordChips action={selectedEvidenceAction} />
                  </div>
                  {sourceImpliesLinkedRecord(editForm.source) && !hasLinkedRecord(selectedEvidenceAction) ? (
                    <div style={linkedWarningStyle}>
                      This source normally has a linked record, but no linked reference is stored on this action.
                    </div>
                  ) : null}
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
                  {editForm.source === "NCR/CAPA" && (editForm.linked_ncr_id || editForm.linked_ncr_number) ? (
                    <Link
                      href={
                        editForm.linked_ncr_id
                          ? `/ncr-capa?ncrId=${encodeURIComponent(editForm.linked_ncr_id)}`
                          : `/ncr-capa?ncr=${encodeURIComponent(editForm.linked_ncr_number)}`
                      }
                      style={backLinkStyle}
                    >
                      Open Linked NCR
                    </Link>
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
                  {editForm.source === "AINM" && editForm.linked_ainm_number ? (
                    <div style={linkedSourceMetaStyle}>
                      AINM: <strong>{editForm.linked_ainm_number}</strong>
                    </div>
                  ) : null}
                  {editForm.source === "AINM" && (editForm.linked_ainm_id || editForm.linked_ainm_number) ? (
                    <Link
                      href={
                        editForm.linked_ainm_id
                          ? `/hse/ainm?ainmId=${encodeURIComponent(editForm.linked_ainm_id)}`
                          : `/hse/ainm?ainm=${encodeURIComponent(editForm.linked_ainm_number)}`
                      }
                      style={backLinkStyle}
                    >
                      Open Linked AINM
                    </Link>
                  ) : null}
                  {editForm.source === "HSE Inspection" && editForm.linked_hse_inspection_number ? (
                    <div style={linkedSourceMetaStyle}>
                      HSE Inspection: <strong>{editForm.linked_hse_inspection_number}</strong>
                    </div>
                  ) : null}
                  {editForm.source === "HSE Inspection" && (editForm.linked_hse_inspection_id || editForm.linked_hse_inspection_number) ? (
                    <Link
                      href={
                        editForm.linked_hse_inspection_id
                          ? `/hse/inspections?inspectionId=${encodeURIComponent(editForm.linked_hse_inspection_id)}`
                          : `/hse/inspections?inspection=${encodeURIComponent(editForm.linked_hse_inspection_number)}`
                      }
                      style={backLinkStyle}
                    >
                      Open Linked HSE Inspection
                    </Link>
                  ) : null}
                  {editForm.source === "Observation" && editForm.linked_observation_number ? (
                    <div style={linkedSourceMetaStyle}>
                      Observation: <strong>{editForm.linked_observation_number}</strong>
                    </div>
                  ) : null}
                  {editForm.source === "Observation" && (editForm.linked_observation_id || editForm.linked_observation_number) ? (
                    <Link
                      href={
                        editForm.linked_observation_id
                          ? `/hse/observations?observationId=${encodeURIComponent(editForm.linked_observation_id)}`
                          : `/hse/observations?observation=${encodeURIComponent(editForm.linked_observation_number)}`
                      }
                      style={backLinkStyle}
                    >
                      Open Linked Observation
                    </Link>
                  ) : null}
                </div>
              ) : null}

              <div style={formFooterStyle}>
                <button
                  type="button"
                  onClick={() => saveEdit(selectedEvidenceAction.id)}
                  style={primaryButtonStyle}
                  disabled={isSaving || !canEditAction}
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
                <input type="file" multiple onChange={handleSelectedEvidenceFileChange} style={inputStyle} disabled={!canEditAction} />
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
                  disabled={isUploadingEvidence || !canEditAction}
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
                          disabled={!canEditAction}
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
      </div>
        </>
      ) : null}
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

function ActionViewTabs({
  activeView,
  onChange,
}: {
  activeView: ActionView;
  onChange: (view: ActionView) => void;
}) {
  return (
    <nav className="ims-tabs" style={viewTabsStyle} aria-label="Action Management views" role="tablist">
      {actionViews.map((view) => (
        <button
          key={view.id}
          type="button"
          role="tab"
          aria-selected={activeView === view.id}
          data-active={activeView === view.id ? "true" : "false"}
          onClick={() => onChange(view.id)}
          style={{
            ...viewTabButtonStyle,
            ...(activeView === view.id ? viewTabButtonActiveStyle : null),
          }}
        >
          {view.label}
        </button>
      ))}
    </nav>
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
    green: { bg: "rgba(220,252,231,0.15)", border: "rgba(220,252,231,0.26)", text: "#ECECE7" },
    amber: { bg: "rgba(254,243,199,0.15)", border: "rgba(254,243,199,0.28)", text: "#ECECE7" },
    red: { bg: "rgba(254,226,226,0.15)", border: "rgba(254,226,226,0.28)", text: "#ECECE7" },
    blue: { bg: "rgba(219,234,254,0.15)", border: "rgba(219,234,254,0.28)", text: "#ECECE7" },
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
  onItemClick,
}: {
  title: string;
  emptyText: string;
  items: Array<{
    id: string;
    line1: string;
    line2: string;
    tone: "red" | "amber";
  }>;
  onItemClick?: (id: string) => void;
}) {
  return (
    <div style={miniListCardStyle}>
      <h3 style={miniListTitleStyle}>{title}</h3>

      {items.length === 0 ? (
        <p style={emptyTextStyle}>{emptyText}</p>
      ) : (
        <div style={miniListWrapStyle}>
          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={onItemClick ? () => onItemClick(item.id) : undefined}
              style={{
                ...miniListItemStyle,
                borderLeft: item.tone === "red" ? "4px solid #F93822" : "4px solid #FFAD00",
                background: item.tone === "red" ? "#ECECE7" : "#ECECE7",
                cursor: onItemClick ? "pointer" : "default",
              }}
            >
              <div style={miniListLine1Style}>{item.line1}</div>
              <div style={miniListLine2Style}>{item.line2}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ChartPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={chartPanelStyle}>
      <h3 style={chartPanelTitleStyle}>{title}</h3>
      {children}
    </div>
  );
}

function QuickFilterButton({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        ...quickFilterButtonStyle,
        background: active ? "#005670" : "#ECECE7",
        color: active ? "#ffffff" : "#000000",
        borderColor: active ? "#005670" : "#D0D0CE",
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {label}
    </button>
  );
}

function MyWorkItemTypeChip({ source }: { source: MyWorkItemSource }) {
  const tone: LinkedRecordChip["tone"] =
    source === "NCR" ? "red" : source === "Audit Finding" ? "blue" : source === "AINM" ? "red" : source === "Observation" ? "teal" : "slate";
  return (
    <span style={{ ...linkedChipStyle, ...linkedChipToneStyles[tone] }}>
      {source}
    </span>
  );
}

function SourceChip({ action }: { action: ActionItem }) {
  const source = getActionSourceValue(action);
  return (
    <span style={{ ...linkedChipStyle, ...linkedChipToneStyles[getSourceChipTone(source)] }}>
      {getActionSourceLabel(action)}
    </span>
  );
}

function LinkedRecordChips({ action }: { action: ActionItem }) {
  const chips = buildLinkedRecordChips(action);

  if (chips.length === 0) {
    return <span style={secondaryCellTextStyle}>-</span>;
  }

  return (
    <div style={linkedChipRowStyle}>
      {chips.map((chip) => (
        <span key={chip.label} style={{ ...linkedChipStyle, ...linkedChipToneStyles[chip.tone] }}>
          {chip.label}
        </span>
      ))}
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
      ? { background: "#ECECE7", color: "#005670" }
      : lower === "open"
      ? { background: "#ECECE7", color: "#005670" }
      : lower === "in progress"
      ? { background: "#ECECE7", color: "#000000" }
      : { background: "#D0D0CE", color: "#53565A" };

  return <span style={{ ...badgeStyle, ...styles }}>{value}</span>;
}

function PriorityBadge({ value }: { value: string }) {
  const lower = value.toLowerCase();

  const styles =
    lower === "high"
      ? { background: "#ECECE7", color: "#F93822" }
      : lower === "medium"
      ? { background: "#ECECE7", color: "#000000" }
      : lower === "low"
      ? { background: "#ECECE7", color: "#005670" }
      : { background: "#D0D0CE", color: "#53565A" };

  return <span style={{ ...badgeStyle, ...styles }}>{value}</span>;
}

const heroStyle: CSSProperties = {
  background: "linear-gradient(135deg, #005670 0%, #005670 64%, #63B1BC 160%)",
  color: "white",
  borderRadius: "22px",
  padding: "28px 30px",
  marginBottom: "24px",
  boxShadow: "0 10px 30px rgba(0, 86, 112, 0.14)",
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
  color: "#005670",
  fontWeight: 700,
  textDecoration: "none",
};

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

const statusBannerStyleInline: CSSProperties = {
  background: "white",
  borderRadius: "12px",
  padding: "12px 16px",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
  color: "#000000",
};

const viewTabsStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginBottom: "20px",
};

const viewTabButtonStyle: CSSProperties = {
  background: "#ECECE7",
  color: "#000000",
  border: "none",
  padding: "10px 14px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 800,
  minHeight: "44px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: 1.2,
  boxSizing: "border-box",
};

const viewTabButtonActiveStyle: CSSProperties = {
  background: "#005670",
  color: "#ffffff",
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
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
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
  color: "#000000",
};

const sectionSubtitleStyle: CSSProperties = {
  margin: "6px 0 0",
  color: "#53565A",
  fontSize: "14px",
};

const fieldWrapStyle: CSSProperties = {
  display: "grid",
  gap: "6px",
};

const fieldLabelStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 700,
  color: "#53565A",
};

const formGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "14px",
};

const inputStyle: CSSProperties = {
  padding: "11px 12px",
  borderRadius: "10px",
  border: "1px solid #D0D0CE",
  background: "white",
  color: "#000000",
  width: "100%",
  boxSizing: "border-box",
};

const textAreaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: "92px",
  resize: "vertical",
  fontFamily: "\"Azo Sans\", \"Segoe UI\", Arial, Helvetica, sans-serif",
};

const readOnlyInputStyle: CSSProperties = {
  padding: "11px 12px",
  borderRadius: "10px",
  border: "1px solid #D0D0CE",
  background: "#ECECE7",
  color: "#53565A",
  width: "100%",
  boxSizing: "border-box",
};

const smallInputStyle: CSSProperties = {
  padding: "8px 10px",
  borderRadius: "8px",
  border: "1px solid #D0D0CE",
  width: "100%",
  background: "white",
  color: "#000000",
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

const simpleFilterShellStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
  padding: "12px",
  border: "1px solid #D0D0CE",
  borderRadius: "16px",
  background: "rgba(248,250,252,0.92)",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
};

const simpleFilterTopRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(220px, 1fr) auto 132px",
  gap: "10px",
  alignItems: "center",
};

const importPanelStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
  padding: "14px",
  border: "1px solid #D0D0CE",
  borderRadius: "16px",
  background: "rgba(248,250,252,0.92)",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
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
  borderRadius: "10px",
  padding: "9px 12px",
  fontSize: "14px",
  boxSizing: "border-box",
  color: "#000000",
  background: "white",
};

const importTableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  background: "#ffffff",
  minWidth: 1100,
  fontSize: "13px",
};

const importWarningRowStyle: CSSProperties = {
  background: "#ECECE7",
};

const helperTextStyle: CSSProperties = {
  color: "#53565A",
  fontSize: "13px",
};

const primaryButtonStyle: CSSProperties = {
  background: "#005670",
  color: "white",
  border: "none",
  padding: "11px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 700,
};

const secondaryButtonStyle: CSSProperties = {
  background: "#D0D0CE",
  color: "#000000",
  border: "none",
  padding: "10px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 700,
};

const miniButtonStyle: CSSProperties = {
  background: "#005670",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};

const miniButtonGreyStyle: CSSProperties = {
  background: "#53565A",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};

const miniButtonPurpleStyle: CSSProperties = {
  background: "#53565A",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};

const miniButtonDeleteStyle: CSSProperties = {
  background: "#F93822",
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

const dashboardGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "16px",
};

const chartPanelStyle: CSSProperties = {
  minHeight: "280px",
  border: "1px solid #D0D0CE",
  borderRadius: "14px",
  background: "#ECECE7",
  padding: "14px",
};

const chartPanelTitleStyle: CSSProperties = {
  margin: "0 0 12px",
  fontSize: "15px",
  color: "#000000",
};

const quickFilterRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
  marginBottom: "12px",
};

const quickFilterButtonStyle: CSSProperties = {
  border: "1px solid #D0D0CE",
  padding: "10px 14px",
  borderRadius: "999px",
  fontWeight: 800,
};

const myActionsNoticeStyle: CSSProperties = {
  border: "1px solid #D0D0CE",
  background: "#ECECE7",
  borderRadius: "12px",
  padding: "10px 12px",
  marginBottom: "16px",
  color: "#53565A",
  fontSize: "13px",
};


const miniListCardStyle: CSSProperties = {
  background: "#ECECE7",
  border: "1px solid #D0D0CE",
  borderRadius: "14px",
  padding: "14px",
};

const miniListTitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: "12px",
  fontSize: "16px",
  color: "#000000",
};

const miniListWrapStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
};

const miniListItemStyle: CSSProperties = {
  borderRadius: "12px",
  padding: "12px 14px",
  borderTop: "none",
  borderRight: "none",
  borderBottom: "none",
  width: "100%",
  textAlign: "left",
  fontFamily: "inherit",
};

const miniListLine1Style: CSSProperties = {
  fontWeight: 700,
  color: "#000000",
  fontSize: "14px",
};

const miniListLine2Style: CSSProperties = {
  color: "#53565A",
  fontSize: "13px",
  marginTop: "4px",
  lineHeight: 1.45,
};

const filterBarStyle: CSSProperties = {
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

const linkedSearchHintStyle: CSSProperties = {
  color: "#005670",
  fontWeight: 600,
};

const linkedChipRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
};

const linkedSourceChipRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  alignItems: "center",
};

const linkedChipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  width: "fit-content",
  padding: "5px 9px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 800,
  border: "1px solid transparent",
  whiteSpace: "nowrap",
};

const linkedChipToneStyles: Record<LinkedRecordChip["tone"], CSSProperties> = {
  teal: { background: "#D0D0CE", color: "#005670", borderColor: "#D0D0CE" },
  blue: { background: "#ECECE7", color: "#005670", borderColor: "#ECECE7" },
  purple: { background: "#ECECE7", color: "#53565A", borderColor: "#ECECE7" },
  amber: { background: "#ECECE7", color: "#000000", borderColor: "#ECECE7" },
  red: { background: "#ECECE7", color: "#F93822", borderColor: "#ECECE7" },
  slate: { background: "#D0D0CE", color: "#53565A", borderColor: "#D0D0CE" },
};

const linkedWarningStyle: CSSProperties = {
  border: "1px solid #ECECE7",
  background: "#ECECE7",
  color: "#000000",
  borderRadius: "10px",
  padding: "9px 10px",
  fontSize: "13px",
  fontWeight: 700,
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  background: "#ffffff",
  minWidth: 960,
  fontSize: "13px",
};

const tableHeadStyle: CSSProperties = {
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

const tableRowStyle: CSSProperties = {
  cursor: "pointer",
  transition: "background 140ms ease",
};

const tableCellStyle: CSSProperties = {
  padding: "13px 14px",
  borderBottom: "1px solid #ECECE7",
  color: "#000000",
  verticalAlign: "middle",
  fontSize: "13px",
  lineHeight: 1.45,
};

const primaryCellTextStyle: CSSProperties = {
  fontWeight: 600,
  color: "#000000",
};

const secondaryCellTextStyle: CSSProperties = {
  fontSize: "12px",
  color: "#53565A",
  marginTop: "4px",
};

const myActionsTableStyle: CSSProperties = {
  ...tableStyle,
  minWidth: 0,
  tableLayout: "fixed",
};

const myTypeColumnStyle: CSSProperties = { width: "11%", overflow: "hidden" };
const myReferenceColumnStyle: CSSProperties = { width: "10%" };
const myTitleColumnStyle: CSSProperties = { width: "21%" };
const mySourceColumnStyle: CSSProperties = { width: "9%", overflow: "hidden" };
const myLinkedRecordColumnStyle: CSSProperties = { width: "15%", overflow: "hidden" };
const myPriorityColumnStyle: CSSProperties = { width: "7%" };
const myDueDateColumnStyle: CSSProperties = { width: "12%" };
const myStatusColumnStyle: CSSProperties = { width: "9%", overflow: "hidden" };
const myActionColumnStyle: CSSProperties = { width: "6%" };

const truncatedCellTextStyle: CSSProperties = {
  ...primaryCellTextStyle,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const truncatedSecondaryCellTextStyle: CSSProperties = {
  ...secondaryCellTextStyle,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const actionNumberCellStyle: CSSProperties = {
  fontWeight: 800,
  color: "#005670",
  whiteSpace: "nowrap",
};

const readOnlyTableCellStyle: CSSProperties = {
  padding: "13px 14px",
  borderBottom: "1px solid #ECECE7",
  color: "#000000",
  verticalAlign: "middle",
  fontSize: "13px",
  lineHeight: 1.45,
};

const emptyTableCellStyle: CSSProperties = {
  padding: "26px 14px",
  textAlign: "center",
  color: "#53565A",
  background: "#ECECE7",
  borderBottom: "1px dashed #D0D0CE",
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
  color: "#53565A",
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
  background: "#ECECE7",
  color: "#005670",
  fontSize: "12px",
  fontWeight: 700,
};

const selectedFileMetaStyle: CSSProperties = {
  opacity: 0.8,
};

const selectedFilesEmptyStyle: CSSProperties = {
  marginTop: "14px",
  fontSize: "13px",
  color: "#53565A",
};

const evidenceCountBadgeStyle: CSSProperties = {
  display: "inline-block",
  minWidth: "32px",
  textAlign: "center",
  padding: "5px 10px",
  borderRadius: "999px",
  background: "#ECECE7",
  color: "#53565A",
  fontWeight: 800,
  fontSize: "12px",
};

const emptyEvidencePanelStyle: CSSProperties = {
  padding: "18px",
  borderRadius: "14px",
  background: "#ECECE7",
  border: "1px dashed #D0D0CE",
  color: "#53565A",
};

const myRegisterHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "center",
  margin: "18px 0 12px",
  flexWrap: "wrap",
};

const myRegisterTitleStyle: CSSProperties = {
  margin: 0,
  color: "#000000",
  fontSize: "18px",
  fontWeight: 800,
};

const myRegisterSubtitleStyle: CSSProperties = {
  margin: "4px 0 0",
  color: "#53565A",
  fontSize: "13px",
};

const evidencePanelGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "0.95fr 1.05fr",
  gap: "18px",
};

const evidenceUploadCardStyle: CSSProperties = {
  background: "#ECECE7",
  border: "1px solid #D0D0CE",
  borderRadius: "14px",
  padding: "16px",
};

const evidenceListCardStyle: CSSProperties = {
  background: "#ECECE7",
  border: "1px solid #D0D0CE",
  borderRadius: "14px",
  padding: "16px",
};

const evidencePanelHeadingStyle: CSSProperties = {
  fontSize: "16px",
  fontWeight: 700,
  color: "#000000",
  marginBottom: "10px",
};

const evidenceMetaTextStyle: CSSProperties = {
  fontSize: "13px",
  color: "#53565A",
  lineHeight: 1.45,
};

const evidenceFieldWrapStyle: CSSProperties = {
  display: "grid",
  gap: "6px",
  marginTop: "14px",
};

const linkedSourceCardStyle: CSSProperties = {
  border: "1px solid #D0D0CE",
  borderRadius: "14px",
  background: "#ECECE7",
  padding: "12px 14px",
  display: "grid",
  gap: "6px",
  marginTop: "12px",
};

const linkedSourceTitleStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 800,
  color: "#000000",
};

const linkedSourceMetaStyle: CSSProperties = {
  fontSize: "13px",
  color: "#53565A",
};

const detailPanelGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, 0.8fr)",
  gap: "16px",
};

const detailSectionCardStyle: CSSProperties = {
  border: "1px solid #D0D0CE",
  borderRadius: "18px",
  background: "linear-gradient(180deg, #ffffff 0%, #ECECE7 100%)",
  padding: "18px",
  display: "grid",
  gap: "14px",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
  minWidth: 0,
};

const detailPanelHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "14px",
  alignItems: "center",
  flexWrap: "wrap",
  paddingBottom: "14px",
  marginBottom: "4px",
  borderBottom: "1px solid #D0D0CE",
};

const detailActionNumberStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#005670",
};

const detailActionTitleStyle: CSSProperties = {
  fontSize: "22px",
  fontWeight: 800,
  color: "#000000",
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
  border: "1px solid #D0D0CE",
};

const evidenceFileNameStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 700,
  color: "#000000",
  wordBreak: "break-word",
};

const evidenceNoteStyle: CSSProperties = {
  marginTop: "6px",
  fontSize: "13px",
  color: "#53565A",
  lineHeight: 1.45,
};
export default function ActionsPage() {
  return (
    <Suspense fallback={<main style={{ padding: "24px" }}>Loading actions...</main>}>
      <ActionsPageContent />
    </Suspense>
  );
}

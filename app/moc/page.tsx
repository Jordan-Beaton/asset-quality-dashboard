"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { CSSProperties, ChangeEvent, ReactNode } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  AlignmentType,
  BorderStyle,
  Document as WordDocument,
  Footer,
  HeadingLevel,
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
import { QualityPageHero } from "../../src/components/QualityPageHero";
import { useImsPermissions } from "../../src/components/ImsPermissions";
import { ImsTopMetaRow } from "../../src/components/ImsPrimitives";
import { QualityKpiCard } from "../../src/components/QualityKpiCard";
import { supabase } from "../../src/lib/supabase";

export const dynamic = "force-dynamic";

type MocStatus = "Draft" | "In Review" | "Approved" | "Closed";
type ChangeType = "Permanent" | "Temporary";
type YesNoNa = "Yes" | "No" | "N/A";
type ApprovedChoice = "" | "Yes" | "No";
type NoticeTone = "neutral" | "success" | "warning" | "error";
type MocViewFilter = "All" | "Recent" | "Expired Temporary" | "Expiry Soon" | "Draft Ageing";
type MocWorkspaceView = "dashboard" | "register" | "create" | "reports";

type MocReport = {
  id: string;
  moc_report_no: string;
  moc_report_title: string;
  project_worksite_address: string;
  moc_coordinator_name: string;
  moc_coordinator_position: string;
  responsible_manager_name: string;
  responsible_manager_position: string;
  proposed_change_description: string;
  reason_for_change: string;
  change_type: ChangeType;
  temporary_valid_from: string;
  temporary_valid_to: string;
  implementation_plan: string;
  supporting_documentation_note: string;
  impact_health_safety: boolean;
  impact_environment: boolean;
  impact_quality: boolean;
  impact_scm: boolean;
  impact_schedule: boolean;
  impact_equipment: boolean;
  impact_fabrication_opps: boolean;
  impact_engineering: boolean;
  impact_marine_operations: boolean;
  impact_organization: boolean;
  impact_regulatory: boolean;
  impact_documentation: boolean;
  impact_reputation: boolean;
  impact_simops: boolean;
  impact_other: boolean;
  impact_other_text: string;
  hira_required: YesNoNa;
  hira_reason: string;
  lifting_change_status: YesNoNa;
  lifting_change_description: string;
  ptw_change_status: YesNoNa;
  ptw_change_description: string;
  environmental_impact_description: string;
  hazard_risks_description: string;
  proposed_risk_mitigations: string;
  cost_review_description: string;
  schedule_review_description: string;
  supporting_documentation_information: string;
  variation_order_reference_no: string;
  variation_order_na: boolean;
  status: MocStatus;
  created_at: string;
  updated_at: string;
};

type MocActionPlanItem = {
  id: string;
  moc_report_id: string;
  sort_order: number;
  action_no: string;
  description: string;
  responsible_person: string;
  target_date: string;
  status: string;
};

type MocDocumentRow = {
  id: string;
  moc_report_id: string;
  sort_order: number;
  number: string;
  title: string;
  rev: string;
};

type MocReviewRow = {
  id: string;
  moc_report_id: string;
  sort_order: number;
  involved_party: string;
  approve_flag: boolean;
  inform_flag: boolean;
  name: string;
  position: string;
  approved_value: ApprovedChoice;
  signature: string;
  review_date: string;
  comments: string;
};

type MocSignoffRow = {
  id: string;
  moc_report_id: string;
  sort_order: number;
  role_label: string;
  position: string;
  name: string;
  signature: string;
  signoff_date: string;
};

type MocAttachment = {
  id: string;
  moc_report_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  content_type: string | null;
  uploaded_at: string;
};

type MocStarterForm = {
  moc_report_title: string;
  project_worksite_address: string;
  moc_coordinator_name: string;
  responsible_manager_name: string;
  change_type: ChangeType;
  status: MocStatus;
};

type PeopleOption = {
  id: string;
  name: string;
  email: string | null;
  department: string | null;
  active: boolean;
};

type MocBundle = {
  report: MocReport;
  actionItems: MocActionPlanItem[];
  affectedDocuments: MocDocumentRow[];
  riskDocuments: MocDocumentRow[];
  reviewRows: MocReviewRow[];
  acceptanceRows: MocSignoffRow[];
  closeoutRows: MocSignoffRow[];
};

type PersistableMocBundle = {
  report: MocReport;
  actionItems: MocActionPlanItem[];
  affectedDocuments: MocDocumentRow[];
  riskDocuments: MocDocumentRow[];
  reviewRows: MocReviewRow[];
  acceptanceRows: MocSignoffRow[];
  closeoutRows: MocSignoffRow[];
};

type PdfImageMeta = {
  dataUrl: string;
  width: number;
  height: number;
  format: "PNG" | "JPEG" | "WEBP";
};

const mocStatusOptions: MocStatus[] = ["Draft", "In Review", "Approved", "Closed"];
const mocViewOptions: MocViewFilter[] = ["All", "Recent", "Expired Temporary", "Expiry Soon", "Draft Ageing"];
const actionPlanStatusOptions = ["Open", "Ongoing", "Complete", "Hold"] as const;
const MOC_ATTACHMENT_BUCKET = "quality-evidence";
const allowedMocAttachmentExtensions = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".csv",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".txt",
] as const;

const defaultReviewParties = [
  "HSE",
  "Quality",
  "PM",
  "Marine",
  "Engineering",
  "SCM",
  "Operations",
  "Assets",
  "Finance",
  "Crewing",
  "SMT",
  "CEO / COO",
];

const defaultAcceptanceRoles = [
  "MOC Co-Ordinator",
  "Responsible ENS Manager / Supervisor",
  "Client Representative (as applicable)",
  "Insert further Stakeholder (as applicable)",
];

const defaultCloseoutRoles = [
  "Responsible ENS Manager / Supervisor",
  "Client Representative (as applicable)",
  "Insert further Stakeholder (as applicable)",
];

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normaliseStatus(value: string | null | undefined): MocStatus {
  const text = (value || "").trim().toLowerCase();
  if (text === "open" || text === "in review") return "In Review";
  if (text === "awaiting close-out" || text === "approved") return "Approved";
  if (text === "closed") return "Closed";
  return "Draft";
}

function normaliseChangeType(value: string | null | undefined): ChangeType {
  const text = (value || "").trim().toLowerCase();
  return text === "temporary" ? "Temporary" : "Permanent";
}

function normaliseYesNoNa(value: string | null | undefined): YesNoNa {
  const text = (value || "").trim().toLowerCase();
  if (text === "yes") return "Yes";
  if (text === "no") return "No";
  return "N/A";
}

function normaliseApprovedChoice(value: string | null | undefined): ApprovedChoice {
  const text = (value || "").trim().toLowerCase();
  if (text === "yes") return "Yes";
  if (text === "no") return "No";
  return "";
}

function normaliseActionPlanStatus(value: string | null | undefined) {
  const text = (value || "").trim().toLowerCase();
  if (text === "ongoing") return "Ongoing";
  if (text === "complete" || text === "completed") return "Complete";
  if (text === "hold" || text === "on hold") return "Hold";
  return "Open";
}

function buildMocLinkedActionHref(report: MocReport) {
  const params = new URLSearchParams({
    prefill_source: "MOC",
    prefill_department: "HSEQ",
    prefill_project: report.project_worksite_address || "",
    prefill_owner: report.responsible_manager_name || report.moc_coordinator_name || "",
    linked_moc_id: report.id,
    linked_moc_number: report.moc_report_no,
  });

  return `/actions?${params.toString()}`;
}

function buildMocActionPlanLinkedActionHref(report: MocReport, row: MocActionPlanItem) {
  const params = new URLSearchParams({
    prefill_source: "MOC",
    prefill_department: "HSEQ",
    prefill_project: report.project_worksite_address || "",
    prefill_owner: row.responsible_person || report.responsible_manager_name || report.moc_coordinator_name || "",
    prefill_due_date: row.target_date || "",
    linked_moc_id: report.id,
    linked_moc_number: report.moc_report_no,
  });

  return `/actions?${params.toString()}`;
}

function buildNextMocNumber(values: string[]) {
  const used = values
    .map((value) => {
      const match = value.match(/(\d+)$/);
      return match ? Number(match[1]) : null;
    })
    .filter((value): value is number => value !== null);

  const next = used.length ? Math.max(...used) + 1 : 1;
  return `MOC-${String(next).padStart(3, "0")}`;
}

function createEmptyReport(): MocReport {
  return {
    id: "",
    moc_report_no: "",
    moc_report_title: "",
    project_worksite_address: "",
    moc_coordinator_name: "",
    moc_coordinator_position: "",
    responsible_manager_name: "",
    responsible_manager_position: "",
    proposed_change_description: "",
    reason_for_change: "",
    change_type: "Permanent",
    temporary_valid_from: "",
    temporary_valid_to: "",
    implementation_plan: "",
    supporting_documentation_note: "",
    impact_health_safety: false,
    impact_environment: false,
    impact_quality: false,
    impact_scm: false,
    impact_schedule: false,
    impact_equipment: false,
    impact_fabrication_opps: false,
    impact_engineering: false,
    impact_marine_operations: false,
    impact_organization: false,
    impact_regulatory: false,
    impact_documentation: false,
    impact_reputation: false,
    impact_simops: false,
    impact_other: false,
    impact_other_text: "",
    hira_required: "N/A",
    hira_reason: "",
    lifting_change_status: "N/A",
    lifting_change_description: "",
    ptw_change_status: "N/A",
    ptw_change_description: "",
    environmental_impact_description: "",
    hazard_risks_description: "",
    proposed_risk_mitigations: "",
    cost_review_description: "",
    schedule_review_description: "",
    supporting_documentation_information: "",
    variation_order_reference_no: "",
    variation_order_na: false,
    status: "Draft",
    created_at: "",
    updated_at: "",
  };
}

function createStarterForm(): MocStarterForm {
  return {
    moc_report_title: "",
    project_worksite_address: "",
    moc_coordinator_name: "",
    responsible_manager_name: "",
    change_type: "Permanent",
    status: "Draft",
  };
}

function createActionItem(sortOrder: number): MocActionPlanItem {
  return {
    id: "",
    moc_report_id: "",
    sort_order: sortOrder,
    action_no: String(sortOrder + 1),
    description: "",
    responsible_person: "",
    target_date: "",
    status: "Open",
  };
}

function createDocumentRow(sortOrder: number): MocDocumentRow {
  return {
    id: "",
    moc_report_id: "",
    sort_order: sortOrder,
    number: "",
    title: "",
    rev: "",
  };
}

function createReviewRows(): MocReviewRow[] {
  return defaultReviewParties.map((party, index) => ({
    id: "",
    moc_report_id: "",
    sort_order: index,
    involved_party: party,
    approve_flag: false,
    inform_flag: false,
    name: "",
    position: "",
    approved_value: "",
    signature: "",
    review_date: "",
    comments: "",
  }));
}

function createSignoffRows(roles: string[]): MocSignoffRow[] {
  return roles.map((role, index) => ({
    id: "",
    moc_report_id: "",
    sort_order: index,
    role_label: role,
    position: "",
    name: "",
    signature: "",
    signoff_date: "",
  }));
}

function getStatusTone(status: string) {
  const value = (status || "").toLowerCase();
  if (value.includes("closed")) return { bg: "#ECECE7", color: "#005670" };
  if (value.includes("approved")) return { bg: "#ECECE7", color: "#000000" };
  if (value.includes("review")) return { bg: "#ECECE7", color: "#005670" };
  return { bg: "#D0D0CE", color: "#53565A" };
}

function getActionPlanStatusTone(status: string) {
  const value = normaliseActionPlanStatus(status);
  if (value === "Complete") return { background: "#ECECE7", color: "#005670" };
  if (value === "Ongoing") return { background: "#ECECE7", color: "#005670" };
  if (value === "Hold") return { background: "#ECECE7", color: "#000000" };
  return { background: "#ECECE7", color: "#F93822" };
}

function getChangeTypeTone(value: ChangeType) {
  return value === "Temporary"
    ? { bg: "#ECECE7", color: "#000000" }
    : { bg: "#ECECE7", color: "#005670" };
}

function toDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function getLogoDataUrl() {
  try {
    const response = await fetch("/enshore-primary-logo-colour.png");
    const blob = await response.blob();
    return await toDataUrl(blob);
  } catch {
    return "";
  }
}

function isDataImageUrl(value: string | null | undefined) {
  const text = (value || "").trim().toLowerCase();
  return text.startsWith("data:image/");
}

function getPdfCheckbox(checked: boolean) {
  return checked ? "[X]" : "[ ]";
}

function getPdfText(value: string | null | undefined) {
  return String(value || "").trim();
}

function getPdfDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getImageFormat(dataUrl: string): "PNG" | "JPEG" | "WEBP" {
  const lower = dataUrl.toLowerCase();
  if (lower.startsWith("data:image/jpeg") || lower.startsWith("data:image/jpg")) return "JPEG";
  if (lower.startsWith("data:image/webp")) return "WEBP";
  return "PNG";
}

function loadImageMeta(dataUrl: string) {
  return new Promise<PdfImageMeta>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () =>
      resolve({
        dataUrl,
        width: image.naturalWidth || image.width || 1,
        height: image.naturalHeight || image.height || 1,
        format: getImageFormat(dataUrl),
      });
    image.onerror = () => reject(new Error("Image load failed"));
    image.src = dataUrl;
  });
}

function drawImageFit(
  doc: jsPDF,
  image: PdfImageMeta,
  x: number,
  y: number,
  width: number,
  height: number,
  align: "left" | "center" | "right" = "center"
) {
  const ratio = Math.min(width / image.width, height / image.height);
  const drawWidth = image.width * ratio;
  const drawHeight = image.height * ratio;
  const drawX =
    align === "left" ? x : align === "right" ? x + width - drawWidth : x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;
  doc.addImage(image.dataUrl, image.format, drawX, drawY, drawWidth, drawHeight);
}

function buildParentPayload(report: MocReport, mocNo?: string) {
  return {
    moc_report_no: mocNo ?? report.moc_report_no,
    moc_report_title: report.moc_report_title,
    project_worksite_address: report.project_worksite_address,
    moc_coordinator_name: report.moc_coordinator_name,
    moc_coordinator_position: report.moc_coordinator_position,
    responsible_manager_name: report.responsible_manager_name,
    responsible_manager_position: report.responsible_manager_position,
    proposed_change_description: report.proposed_change_description,
    reason_for_change: report.reason_for_change,
    change_type: report.change_type,
    temporary_valid_from: report.temporary_valid_from || null,
    temporary_valid_to: report.temporary_valid_to || null,
    implementation_plan: report.implementation_plan,
    supporting_documentation_note: report.supporting_documentation_note,
    impact_health_safety: report.impact_health_safety,
    impact_environment: report.impact_environment,
    impact_quality: report.impact_quality,
    impact_scm: report.impact_scm,
    impact_schedule: report.impact_schedule,
    impact_equipment: report.impact_equipment,
    impact_fabrication_opps: report.impact_fabrication_opps,
    impact_engineering: report.impact_engineering,
    impact_marine_operations: report.impact_marine_operations,
    impact_organization: report.impact_organization,
    impact_regulatory: report.impact_regulatory,
    impact_documentation: report.impact_documentation,
    impact_reputation: report.impact_reputation,
    impact_simops: report.impact_simops,
    impact_other: report.impact_other,
    impact_other_text: report.impact_other_text,
    hira_required: report.hira_required,
    hira_reason: report.hira_reason,
    lifting_change_status: report.lifting_change_status,
    lifting_change_description: report.lifting_change_description,
    ptw_change_status: report.ptw_change_status,
    ptw_change_description: report.ptw_change_description,
    environmental_impact_description: report.environmental_impact_description,
    hazard_risks_description: report.hazard_risks_description,
    proposed_risk_mitigations: report.proposed_risk_mitigations,
    cost_review_description: report.cost_review_description,
    schedule_review_description: report.schedule_review_description,
    supporting_documentation_information: report.supporting_documentation_information,
    variation_order_reference_no: report.variation_order_reference_no,
    variation_order_na: report.variation_order_na,
    status: report.status,
    updated_at: new Date().toISOString(),
  };
}

function normaliseReport(row: Record<string, unknown>): MocReport {
  return {
    ...createEmptyReport(),
    id: String(row.id || ""),
    moc_report_no: String(row.moc_report_no || ""),
    moc_report_title: String(row.moc_report_title || ""),
    project_worksite_address: String(row.project_worksite_address || ""),
    moc_coordinator_name: String(row.moc_coordinator_name || ""),
    moc_coordinator_position: String(row.moc_coordinator_position || ""),
    responsible_manager_name: String(row.responsible_manager_name || ""),
    responsible_manager_position: String(row.responsible_manager_position || ""),
    proposed_change_description: String(row.proposed_change_description || ""),
    reason_for_change: String(row.reason_for_change || ""),
    change_type: normaliseChangeType(String(row.change_type || "")),
    temporary_valid_from: String(row.temporary_valid_from || ""),
    temporary_valid_to: String(row.temporary_valid_to || ""),
    implementation_plan: String(row.implementation_plan || ""),
    supporting_documentation_note: String(row.supporting_documentation_note || ""),
    impact_health_safety: Boolean(row.impact_health_safety),
    impact_environment: Boolean(row.impact_environment),
    impact_quality: Boolean(row.impact_quality),
    impact_scm: Boolean(row.impact_scm),
    impact_schedule: Boolean(row.impact_schedule),
    impact_equipment: Boolean(row.impact_equipment),
    impact_fabrication_opps: Boolean(row.impact_fabrication_opps),
    impact_engineering: Boolean(row.impact_engineering),
    impact_marine_operations: Boolean(row.impact_marine_operations),
    impact_organization: Boolean(row.impact_organization),
    impact_regulatory: Boolean(row.impact_regulatory),
    impact_documentation: Boolean(row.impact_documentation),
    impact_reputation: Boolean(row.impact_reputation),
    impact_simops: Boolean(row.impact_simops),
    impact_other: Boolean(row.impact_other),
    impact_other_text: String(row.impact_other_text || ""),
    hira_required: normaliseYesNoNa(String(row.hira_required || "")),
    hira_reason: String(row.hira_reason || ""),
    lifting_change_status: normaliseYesNoNa(String(row.lifting_change_status || "")),
    lifting_change_description: String(row.lifting_change_description || ""),
    ptw_change_status: normaliseYesNoNa(String(row.ptw_change_status || "")),
    ptw_change_description: String(row.ptw_change_description || ""),
    environmental_impact_description: String(row.environmental_impact_description || ""),
    hazard_risks_description: String(row.hazard_risks_description || ""),
    proposed_risk_mitigations: String(row.proposed_risk_mitigations || ""),
    cost_review_description: String(row.cost_review_description || ""),
    schedule_review_description: String(row.schedule_review_description || ""),
    supporting_documentation_information: String(row.supporting_documentation_information || ""),
    variation_order_reference_no: String(row.variation_order_reference_no || ""),
    variation_order_na: Boolean(row.variation_order_na),
    status: normaliseStatus(String(row.status || "")),
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || ""),
  };
}

function sortByOrder<T extends { sort_order: number }>(rows: T[]) {
  return [...rows].sort((a, b) => a.sort_order - b.sort_order);
}

function syncActionOrders(rows: MocActionPlanItem[]) {
  return rows.map((row, index) => ({ ...row, sort_order: index, action_no: String(index + 1) }));
}

function syncSimpleOrders<T extends { sort_order: number }>(rows: T[]) {
  return rows.map((row, index) => ({ ...row, sort_order: index }));
}

function moveArrayItem<T>(rows: T[], index: number, direction: -1 | 1) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= rows.length) return rows;
  const nextRows = [...rows];
  const [item] = nextRows.splice(index, 1);
  nextRows.splice(nextIndex, 0, item);
  return nextRows;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function isAllowedMocAttachment(file: File) {
  const lowerName = file.name.toLowerCase();
  return allowedMocAttachmentExtensions.some((extension) => lowerName.endsWith(extension));
}

function formatFileSize(value: number | null | undefined) {
  if (!value || value <= 0) return "Unknown size";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function getNoticeColours(tone: NoticeTone) {
  if (tone === "success") return { bg: "#ECECE7", border: "#ECECE7", text: "#005670" };
  if (tone === "warning") return { bg: "#ECECE7", border: "#ECECE7", text: "#000000" };
  if (tone === "error") return { bg: "#ECECE7", border: "#ECECE7", text: "#F93822" };
  return { bg: "#ffffff", border: "#D0D0CE", text: "#000000" };
}

function getCreatedOrUpdatedTime(report: MocReport) {
  return new Date(report.created_at || report.updated_at || 0).getTime();
}

function isRecentMoc(report: MocReport) {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - 30);
  const date = new Date(report.created_at || report.updated_at || 0);
  return !Number.isNaN(date.getTime()) && date >= threshold;
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
function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function isExpiredTemporary(report: MocReport) {
  if (report.change_type !== "Temporary" || report.status === "Closed") return false;
  const days = getDaysFromToday(report.temporary_valid_to);
  return days !== null && days < 0;
}

function isNearingTemporaryExpiry(report: MocReport) {
  if (report.change_type !== "Temporary" || report.status === "Closed") return false;
  const days = getDaysFromToday(report.temporary_valid_to);
  return days !== null && days >= 0 && days <= 7;
}

function isDraftAged(report: MocReport) {
  if (report.status !== "Draft") return false;
  const created = new Date(report.created_at || report.updated_at || 0);
  if (Number.isNaN(created.getTime())) return false;
  const today = new Date();
  created.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffMs = today.getTime() - created.getTime();
  return diffMs / (1000 * 60 * 60 * 24) > 14;
}

function getTemporaryValidityLabel(report: MocReport) {
  if (report.change_type !== "Temporary") return "";
  const days = getDaysFromToday(report.temporary_valid_to);
  if (!report.temporary_valid_to) return "No validity end set";
  if (days === null) return `Valid to ${formatDate(report.temporary_valid_to)}`;
  if (days < 0) {
    return `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`;
  }
  if (days === 0) return "Expires today";
  if (days <= 14) return `Expires in ${days} day${days === 1 ? "" : "s"}`;
  return `Valid to ${formatDate(report.temporary_valid_to)}`;
}

function getTemporaryValidityTone(report: MocReport) {
  if (isExpiredTemporary(report)) return { color: "#F93822" };
  if (isNearingTemporaryExpiry(report)) return { color: "#000000" };
  return { color: "#53565A" };
}

function getNextWorkflowStatus(status: MocStatus): MocStatus | null {
  if (status === "Draft") return "In Review";
  if (status === "In Review") return "Approved";
  if (status === "Approved") return "Closed";
  return null;
}

function getWorkflowButtonLabel(status: MocStatus) {
  if (status === "Draft") return "Mark In Review";
  if (status === "In Review") return "Mark Approved";
  if (status === "Approved") return "Mark Closed";
  return "";
}

function buildMocHref(params?: Record<string, string | number | null | undefined>) {
  if (!params) return "/moc";
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `/moc?${query}` : "/moc";
}

function parseMocStatusFilter(value: string | null | undefined): "All" | "Active" | MocStatus {
  if (value === "Active") return "Active";
  if (value === "Draft" || value === "In Review" || value === "Approved" || value === "Closed") return value;
  return "All";
}

function buildRegisterUpdatedAt(report: MocReport) {
  return report.updated_at || report.created_at || "";
}

function MOCPageContent() {
  const imsPermissions = useImsPermissions();
  const searchParams = useSearchParams();
  const linkedSearch = searchParams.get("search")?.trim() || "";
  const linkedStatus = searchParams.get("status")?.trim() || "All";
  const linkedChangeType = searchParams.get("change_type")?.trim() || "All";
  const linkedRecent = searchParams.get("recent")?.trim() || "";
  const linkedAttention = searchParams.get("attention")?.trim() || "";

  const [reports, setReports] = useState<MocReport[]>([]);
  const [actionPlanItems, setActionPlanItems] = useState<MocActionPlanItem[]>([]);
  const [affectedDocuments, setAffectedDocuments] = useState<MocDocumentRow[]>([]);
  const [riskDocuments, setRiskDocuments] = useState<MocDocumentRow[]>([]);
  const [reviewRows, setReviewRows] = useState<MocReviewRow[]>([]);
  const [acceptanceRows, setAcceptanceRows] = useState<MocSignoffRow[]>([]);
  const [closeoutRows, setCloseoutRows] = useState<MocSignoffRow[]>([]);
  const [attachments, setAttachments] = useState<MocAttachment[]>([]);
  const [peopleOptions, setPeopleOptions] = useState<PeopleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatingWord, setGeneratingWord] = useState(false);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [attachmentActionId, setAttachmentActionId] = useState("");
  const [message, setMessage] = useState("Loading MOC register...");
  const [messageTone, setMessageTone] = useState<NoticeTone>("neutral");
  const [refreshStamp, setRefreshStamp] = useState("");
  const [search, setSearch] = useState(linkedSearch);
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | MocStatus>(parseMocStatusFilter(linkedStatus));
  const [changeTypeFilter, setChangeTypeFilter] = useState<"All" | ChangeType>(
    linkedChangeType === "Permanent" || linkedChangeType === "Temporary" ? linkedChangeType : "All"
  );
  const [viewFilter, setViewFilter] = useState<MocViewFilter>(
  linkedAttention === "expired-temporary"
    ? "Expired Temporary"
    : linkedAttention === "expiry-soon"
    ? "Expiry Soon"
    : linkedAttention === "draft-ageing"
    ? "Draft Ageing"
    : linkedRecent === "1"
    ? "Recent"
    : "All"
);
  const [activeView, setActiveView] = useState<MocWorkspaceView>(() =>
    linkedSearch || linkedStatus !== "All" || linkedChangeType !== "All" || linkedRecent || linkedAttention
      ? "register"
      : "dashboard"
  );
  const [showRegisterFilters, setShowRegisterFilters] = useState(
    Boolean(linkedStatus !== "All" || linkedChangeType !== "All" || linkedRecent || linkedAttention)
  );
  const [selectedReportId, setSelectedReportId] = useState("");
  const [starterForm, setStarterForm] = useState<MocStarterForm>(createStarterForm());
  const [detailReport, setDetailReport] = useState<MocReport>(createEmptyReport());
  const [detailActionItems, setDetailActionItems] = useState<MocActionPlanItem[]>([createActionItem(0)]);
  const [detailAffectedDocuments, setDetailAffectedDocuments] = useState<MocDocumentRow[]>([
    createDocumentRow(0),
  ]);
  const [detailRiskDocuments, setDetailRiskDocuments] = useState<MocDocumentRow[]>([createDocumentRow(0)]);
  const [detailReviewRows, setDetailReviewRows] = useState<MocReviewRow[]>(createReviewRows());
  const [detailAcceptanceRows, setDetailAcceptanceRows] = useState<MocSignoffRow[]>(
    createSignoffRows(defaultAcceptanceRoles)
  );
  const [detailCloseoutRows, setDetailCloseoutRows] = useState<MocSignoffRow[]>(
    createSignoffRows(defaultCloseoutRoles)
  );

  const canCreateMoc = useMemo(() => {
    return imsPermissions.loaded && (imsPermissions.isMasterAdmin || imsPermissions.fullAccess || imsPermissions.canCreate);
  }, [imsPermissions.canCreate, imsPermissions.fullAccess, imsPermissions.isMasterAdmin, imsPermissions.loaded]);

  const canEditMoc = useMemo(() => {
    return imsPermissions.loaded && (imsPermissions.isMasterAdmin || imsPermissions.fullAccess || imsPermissions.canEdit);
  }, [imsPermissions.canEdit, imsPermissions.fullAccess, imsPermissions.isMasterAdmin, imsPermissions.loaded]);

  function requireCreatePermission(actionLabel: string) {
    if (canCreateMoc) return true;
    showMessage(`${actionLabel} requires Create permission for this IMS area.`, "warning");
    return false;
  }

  function requireEditPermission(actionLabel: string) {
    if (canEditMoc) return true;
    showMessage(`${actionLabel} requires Edit permission for this IMS area.`, "warning");
    return false;
  }

  const nextMocNumber = useMemo(
    () => buildNextMocNumber(reports.map((item) => item.moc_report_no).filter(Boolean)),
    [reports]
  );

  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedReportId) || null,
    [reports, selectedReportId]
  );

  const selectedReportAttachments = useMemo(() => {
    if (!selectedReportId) return [];
    return attachments
      .filter((item) => item.moc_report_id === selectedReportId)
      .sort((a, b) => new Date(b.uploaded_at || 0).getTime() - new Date(a.uploaded_at || 0).getTime());
  }, [attachments, selectedReportId]);

  const latestMocSummary = useMemo(() => {
    const latest = reports[0];
    if (!latest) return "No MOCs loaded";
    return latest.moc_report_title
      ? `${latest.moc_report_no} - ${latest.moc_report_title}`
      : latest.moc_report_no || "No MOCs loaded";
  }, [reports]);

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...reports]
      .filter((report) => {
      const matchesSearch =
        !query ||
        report.moc_report_no.toLowerCase().includes(query) ||
        report.moc_report_title.toLowerCase().includes(query) ||
        report.project_worksite_address.toLowerCase().includes(query) ||
        report.moc_coordinator_name.toLowerCase().includes(query) ||
        report.responsible_manager_name.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Active" ? report.status !== "Closed" : report.status === statusFilter);
      const matchesChangeType = changeTypeFilter === "All" || report.change_type === changeTypeFilter;
      const matchesView =
        viewFilter === "All" ||
        (viewFilter === "Recent" && isRecentMoc(report)) ||
        (viewFilter === "Expired Temporary" && isExpiredTemporary(report)) ||
        (viewFilter === "Expiry Soon" && isNearingTemporaryExpiry(report)) ||
        (viewFilter === "Draft Ageing" && isDraftAged(report));
      return matchesSearch && matchesStatus && matchesChangeType && matchesView;
    })
      .sort((a, b) => getCreatedOrUpdatedTime(b) - getCreatedOrUpdatedTime(a));
  }, [reports, search, statusFilter, changeTypeFilter, viewFilter]);

  const peopleNameOptions = useMemo(
    () =>
      Array.from(new Set(peopleOptions.map((person) => person.name.trim()).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [peopleOptions]
  );

  const openCount = useMemo(
    () => reports.filter((report) => report.status !== "Closed").length,
    [reports]
  );
  const temporaryCount = useMemo(
    () => reports.filter((report) => report.change_type === "Temporary").length,
    [reports]
  );
  const approvedCount = useMemo(
    () => reports.filter((report) => report.status === "Approved").length,
    [reports]
  );
  const inReviewCount = useMemo(
    () => reports.filter((report) => report.status === "In Review").length,
    [reports]
  );
  const expirySoonCount = useMemo(() => reports.filter((report) => isNearingTemporaryExpiry(report)).length, [reports]);
  const recentCount = useMemo(() => {
    return reports.filter((report) => isRecentMoc(report)).length;
  }, [reports]);
  const nextWorkflowStatus = getNextWorkflowStatus(detailReport.status);
  const canEditCoreFields = canEditMoc && (detailReport.status === "Draft" || detailReport.status === "In Review");
  const canEditImplementationFields =
    canEditMoc && (detailReport.status === "Draft" || detailReport.status === "In Review" || detailReport.status === "Approved");
  const canEditStructural = canEditMoc && detailReport.status === "Draft";
  const canEditImplementationStructure = canEditMoc && detailReport.status === "Draft";
  const canEditReviewSections = canEditMoc && (detailReport.status === "Draft" || detailReport.status === "In Review");
  const canEditCloseout = canEditMoc && detailReport.status !== "Closed";
  const canEditCloseoutStructure = canEditMoc && (detailReport.status === "Draft" || detailReport.status === "Approved");
  const canManageAttachments = canEditMoc && detailReport.status !== "Closed";
  const canSaveDetail = Boolean(selectedReportId) && canEditMoc && detailReport.status !== "Closed";
  const detailWorkflowMessage =
    detailReport.status === "Draft"
      ? "Draft records are fully editable. Status progression is manual until routed workflow approvals are enabled."
      : detailReport.status === "In Review"
      ? "In Review records allow content edits only. Structural row changes are locked; approval routing is currently manual."
      : detailReport.status === "Approved"
      ? "Approved records stay live for implementation and close-out updates, but proposal and review structure is locked."
      : "Closed records are fully locked.";

  useEffect(() => {
    setSearch(linkedSearch);
    setStatusFilter(parseMocStatusFilter(linkedStatus));
    setChangeTypeFilter(linkedChangeType === "Permanent" || linkedChangeType === "Temporary" ? linkedChangeType : "All");
    setViewFilter(
      linkedAttention === "expired-temporary"
        ? "Expired Temporary"
        : linkedAttention === "expiry-soon"
        ? "Expiry Soon"
        : linkedAttention === "draft-ageing"
        ? "Draft Ageing"
        : linkedRecent === "1"
        ? "Recent"
        : "All"
    );
    if (linkedSearch || linkedStatus !== "All" || linkedChangeType !== "All" || linkedRecent || linkedAttention) {
      setActiveView("register");
    }
  }, [linkedAttention, linkedChangeType, linkedRecent, linkedSearch, linkedStatus]);

  async function handleSignatureFile(
    file: File | null,
    apply: (value: string) => void
  ) {
    if (!requireEditPermission("Attaching MOC signatures")) return;
    if (!file) return;
    try {
      const dataUrl = await toDataUrl(file);
      apply(dataUrl);
      showMessage("Signature image attached for PDF output.", "success");
    } catch {
      showMessage("Signature image could not be read.", "error");
    }
  }

  const showMessage = useCallback((text: string, tone: NoticeTone = "neutral") => {
    setMessage(text);
    setMessageTone(tone);
  }, []);

  const loadData = useCallback(async () => {
    const [
      reportsRes,
      actionRes,
      affectedDocsRes,
      riskDocsRes,
      reviewRes,
      acceptanceRes,
      closeoutRes,
      attachmentsRes,
      peopleRes,
    ] = await Promise.all([
      supabase.from("moc_reports").select("*").order("updated_at", { ascending: false }),
      supabase.from("moc_action_plan_items").select("*").order("sort_order", { ascending: true }),
      supabase.from("moc_affected_documents").select("*").order("sort_order", { ascending: true }),
      supabase.from("moc_risk_documents").select("*").order("sort_order", { ascending: true }),
      supabase.from("moc_review_endorsement_rows").select("*").order("sort_order", { ascending: true }),
      supabase.from("moc_acceptance_rows").select("*").order("sort_order", { ascending: true }),
      supabase.from("moc_closeout_rows").select("*").order("sort_order", { ascending: true }),
      supabase.from("moc_attachments").select("*").order("uploaded_at", { ascending: false }),
      supabase.from("people").select("id,name,email,department,active").eq("active", true).order("name", { ascending: true }),
    ]);

    if (
      reportsRes.error ||
      actionRes.error ||
      affectedDocsRes.error ||
      riskDocsRes.error ||
      reviewRes.error ||
      acceptanceRes.error ||
      closeoutRes.error ||
      attachmentsRes.error
    ) {
      showMessage(
        `MOC load failed: ${
          reportsRes.error?.message ||
          actionRes.error?.message ||
          affectedDocsRes.error?.message ||
          riskDocsRes.error?.message ||
          reviewRes.error?.message ||
          acceptanceRes.error?.message ||
          closeoutRes.error?.message ||
          attachmentsRes.error?.message ||
          "Unknown error"
        }`,
        "error"
      );
      setLoading(false);
      return {
        reports: [] as MocReport[],
        actionItems: [] as MocActionPlanItem[],
        affectedDocuments: [] as MocDocumentRow[],
        riskDocuments: [] as MocDocumentRow[],
        reviewRows: [] as MocReviewRow[],
        acceptanceRows: [] as MocSignoffRow[],
        closeoutRows: [] as MocSignoffRow[],
        attachments: [] as MocAttachment[],
      };
    }

    const nextReports = ((reportsRes.data || []) as Record<string, unknown>[]).map(normaliseReport);
    const nextActionItems = ((actionRes.data || []) as Record<string, unknown>[]).map((row) => ({
      id: String(row.id || ""),
      moc_report_id: String(row.moc_report_id || ""),
      sort_order: Number(row.sort_order || 0),
      action_no: String(row.action_no || ""),
      description: String(row.description || ""),
      responsible_person: String(row.responsible_person || ""),
      target_date: String(row.target_date || ""),
      status: normaliseActionPlanStatus(String(row.status || "")),
    }));
    const nextAffectedDocuments = ((affectedDocsRes.data || []) as Record<string, unknown>[]).map((row) => ({
      id: String(row.id || ""),
      moc_report_id: String(row.moc_report_id || ""),
      sort_order: Number(row.sort_order || 0),
      number: String(row.number || ""),
      title: String(row.title || ""),
      rev: String(row.rev || ""),
    }));
    const nextRiskDocuments = ((riskDocsRes.data || []) as Record<string, unknown>[]).map((row) => ({
      id: String(row.id || ""),
      moc_report_id: String(row.moc_report_id || ""),
      sort_order: Number(row.sort_order || 0),
      number: String(row.number || ""),
      title: String(row.title || ""),
      rev: String(row.rev || ""),
    }));
    const nextReviewRows = ((reviewRes.data || []) as Record<string, unknown>[]).map((row) => ({
      id: String(row.id || ""),
      moc_report_id: String(row.moc_report_id || ""),
      sort_order: Number(row.sort_order || 0),
      involved_party: String(row.involved_party || ""),
      approve_flag: Boolean(row.approve_flag),
      inform_flag: Boolean(row.inform_flag),
      name: String(row.name || ""),
      position: String(row.position || ""),
      approved_value: normaliseApprovedChoice(String(row.approved_value || "")),
      signature: String(row.signature || ""),
      review_date: String(row.review_date || ""),
      comments: String(row.comments || ""),
    }));
    const nextAcceptanceRows = ((acceptanceRes.data || []) as Record<string, unknown>[]).map((row) => ({
      id: String(row.id || ""),
      moc_report_id: String(row.moc_report_id || ""),
      sort_order: Number(row.sort_order || 0),
      role_label: String(row.role_label || ""),
      position: String(row.position || ""),
      name: String(row.name || ""),
      signature: String(row.signature || ""),
      signoff_date: String(row.signoff_date || ""),
    }));
    const nextCloseoutRows = ((closeoutRes.data || []) as Record<string, unknown>[]).map((row) => ({
      id: String(row.id || ""),
      moc_report_id: String(row.moc_report_id || ""),
      sort_order: Number(row.sort_order || 0),
      role_label: String(row.role_label || ""),
      position: String(row.position || ""),
      name: String(row.name || ""),
      signature: String(row.signature || ""),
      signoff_date: String(row.signoff_date || ""),
    }));
    const nextAttachments = ((attachmentsRes.data || []) as Record<string, unknown>[]).map((row) => ({
      id: String(row.id || ""),
      moc_report_id: String(row.moc_report_id || ""),
      file_name: String(row.file_name || ""),
      file_path: String(row.file_path || ""),
      file_size: row.file_size == null ? null : Number(row.file_size),
      content_type: row.content_type == null ? null : String(row.content_type),
      uploaded_at: String(row.uploaded_at || ""),
    }));
    const nextPeopleOptions = peopleRes.error
      ? []
      : ((peopleRes.data || []) as Record<string, unknown>[])
          .map((row) => ({
            id: String(row.id || row.name || ""),
            name: String(row.name || "").trim(),
            email: row.email == null ? null : String(row.email),
            department: row.department == null ? null : String(row.department),
            active: Boolean(row.active),
          }))
          .filter((person) => person.name);

    setReports(nextReports);
    setActionPlanItems(nextActionItems);
    setAffectedDocuments(nextAffectedDocuments);
    setRiskDocuments(nextRiskDocuments);
    setReviewRows(nextReviewRows);
    setAcceptanceRows(nextAcceptanceRows);
    setCloseoutRows(nextCloseoutRows);
    setAttachments(nextAttachments);
    setPeopleOptions(nextPeopleOptions);
    setRefreshStamp(new Date().toLocaleString("en-GB"));
    showMessage("MOC register loaded.");
    setLoading(false);

    return {
      reports: nextReports,
      actionItems: nextActionItems,
      affectedDocuments: nextAffectedDocuments,
      riskDocuments: nextRiskDocuments,
      reviewRows: nextReviewRows,
      acceptanceRows: nextAcceptanceRows,
      closeoutRows: nextCloseoutRows,
      attachments: nextAttachments,
    };
  }, [showMessage]);

  useEffect(() => {
    let cancelled = false;

    async function initialise() {
      await loadData();
      if (cancelled) return;
    }

    void initialise();

    return () => {
      cancelled = true;
    };
  }, [loadData]);

  function getBundleFromData(
    reportId: string,
    source?: {
      reports: MocReport[];
      actionItems: MocActionPlanItem[];
      affectedDocuments: MocDocumentRow[];
      riskDocuments: MocDocumentRow[];
      reviewRows: MocReviewRow[];
      acceptanceRows: MocSignoffRow[];
      closeoutRows: MocSignoffRow[];
    }
  ): MocBundle | null {
    const active = source || {
      reports,
      actionItems: actionPlanItems,
      affectedDocuments,
      riskDocuments,
      reviewRows,
      acceptanceRows,
      closeoutRows,
    };

    const report = active.reports.find((item) => item.id === reportId);
    if (!report) return null;

    return {
      report,
      actionItems: syncActionOrders(sortByOrder(active.actionItems.filter((item) => item.moc_report_id === reportId))),
      affectedDocuments: syncSimpleOrders(
        sortByOrder(active.affectedDocuments.filter((item) => item.moc_report_id === reportId))
      ),
      riskDocuments: syncSimpleOrders(
        sortByOrder(active.riskDocuments.filter((item) => item.moc_report_id === reportId))
      ),
      reviewRows: syncSimpleOrders(sortByOrder(active.reviewRows.filter((item) => item.moc_report_id === reportId))),
      acceptanceRows: syncSimpleOrders(
        sortByOrder(active.acceptanceRows.filter((item) => item.moc_report_id === reportId))
      ),
      closeoutRows: syncSimpleOrders(sortByOrder(active.closeoutRows.filter((item) => item.moc_report_id === reportId))),
    };
  }

  function openBundle(
    reportId: string,
    source?: {
      reports: MocReport[];
      actionItems: MocActionPlanItem[];
      affectedDocuments: MocDocumentRow[];
      riskDocuments: MocDocumentRow[];
      reviewRows: MocReviewRow[];
      acceptanceRows: MocSignoffRow[];
      closeoutRows: MocSignoffRow[];
    }
  ) {
    const bundle = getBundleFromData(reportId, source);
    if (!bundle) return;

    setSelectedReportId(reportId);
    setDetailReport(bundle.report);
    setDetailActionItems(bundle.actionItems.length ? bundle.actionItems : [createActionItem(0)]);
    setDetailAffectedDocuments(bundle.affectedDocuments.length ? bundle.affectedDocuments : [createDocumentRow(0)]);
    setDetailRiskDocuments(bundle.riskDocuments.length ? bundle.riskDocuments : [createDocumentRow(0)]);
    setDetailReviewRows(bundle.reviewRows.length ? bundle.reviewRows : createReviewRows());
    setDetailAcceptanceRows(
      bundle.acceptanceRows.length ? bundle.acceptanceRows : createSignoffRows(defaultAcceptanceRoles)
    );
    setDetailCloseoutRows(
      bundle.closeoutRows.length ? bundle.closeoutRows : createSignoffRows(defaultCloseoutRoles)
    );
  }

  function hideDetailPanel() {
    setSelectedReportId("");
    setDetailReport(createEmptyReport());
    setDetailActionItems([createActionItem(0)]);
    setDetailAffectedDocuments([createDocumentRow(0)]);
    setDetailRiskDocuments([createDocumentRow(0)]);
    setDetailReviewRows(createReviewRows());
    setDetailAcceptanceRows(createSignoffRows(defaultAcceptanceRoles));
    setDetailCloseoutRows(createSignoffRows(defaultCloseoutRoles));
  }

  function switchMocWorkspaceView(view: MocWorkspaceView) {
    setActiveView(view);
  }

  function applyMocDashboardFilter(next: {
    status?: "All" | "Active" | MocStatus;
    changeType?: "All" | ChangeType;
    view?: MocViewFilter;
  }) {
    if (next.status !== undefined) setStatusFilter(next.status);
    if (next.changeType !== undefined) setChangeTypeFilter(next.changeType);
    if (next.view !== undefined) setViewFilter(next.view);
    setActiveView("register");
  }

  function buildCurrentDetailBundle(): PersistableMocBundle {
    return {
      report: detailReport,
      actionItems: syncActionOrders(detailActionItems),
      affectedDocuments: syncSimpleOrders(detailAffectedDocuments),
      riskDocuments: syncSimpleOrders(detailRiskDocuments),
      reviewRows: syncSimpleOrders(detailReviewRows),
      acceptanceRows: syncSimpleOrders(detailAcceptanceRows),
      closeoutRows: syncSimpleOrders(detailCloseoutRows),
    };
  }

  async function replaceChildRows<T extends { sort_order: number }>(
    table: string,
    reportId: string,
    rows: T[],
    mapper: (row: T, index: number) => Record<string, unknown>
  ) {
    const deleteRes = await supabase.from(table).delete().eq("moc_report_id", reportId);
    if (deleteRes.error) throw new Error(deleteRes.error.message);

    if (!rows.length) return;

    const insertRes = await supabase
      .from(table)
      .insert(rows.map((row, index) => ({ ...mapper(row, index), moc_report_id: reportId, sort_order: index })));

    if (insertRes.error) throw new Error(insertRes.error.message);
  }

  async function persistChildTables(reportId: string, bundle: PersistableMocBundle) {
    const steps = [
      {
        label: "Action Plan",
        run: () =>
          replaceChildRows("moc_action_plan_items", reportId, bundle.actionItems, (row) => ({
            action_no: row.action_no,
            description: row.description,
            responsible_person: row.responsible_person,
            target_date: row.target_date || null,
            status: row.status,
          })),
      },
      {
        label: "Affected Documentation",
        run: () =>
          replaceChildRows("moc_affected_documents", reportId, bundle.affectedDocuments, (row) => ({
            number: row.number,
            title: row.title,
            rev: row.rev,
          })),
      },
      {
        label: "Risk Documents",
        run: () =>
          replaceChildRows("moc_risk_documents", reportId, bundle.riskDocuments, (row) => ({
            number: row.number,
            title: row.title,
            rev: row.rev,
          })),
      },
      {
        label: "Review & Endorsement",
        run: () =>
          replaceChildRows("moc_review_endorsement_rows", reportId, bundle.reviewRows, (row) => ({
            involved_party: row.involved_party,
            approve_flag: row.approve_flag,
            inform_flag: row.inform_flag,
            name: row.name,
            position: row.position,
            approved_value: row.approved_value,
            signature: row.signature,
            review_date: row.review_date || null,
            comments: row.comments,
          })),
      },
      {
        label: "Acceptance",
        run: () =>
          replaceChildRows("moc_acceptance_rows", reportId, bundle.acceptanceRows, (row) => ({
            role_label: row.role_label,
            position: row.position,
            name: row.name,
            signature: row.signature,
            signoff_date: row.signoff_date || null,
          })),
      },
      {
        label: "Close-Out",
        run: () =>
          replaceChildRows("moc_closeout_rows", reportId, bundle.closeoutRows, (row) => ({
            role_label: row.role_label,
            position: row.position,
            name: row.name,
            signature: row.signature,
            signoff_date: row.signoff_date || null,
          })),
      },
    ];

    for (const step of steps) {
      try {
        await step.run();
      } catch (error) {
        console.error(`[MOC] Failed saving ${step.label} for ${reportId}`, error);
        throw new Error(`Child save failed in ${step.label}: ${getErrorMessage(error)}`);
      }
    }
  }

  async function restoreBundle(bundle: MocBundle) {
    const restoreParent = await supabase.from("moc_reports").update(buildParentPayload(bundle.report)).eq("id", bundle.report.id);
    if (restoreParent.error) {
      throw new Error(`Parent restore failed: ${restoreParent.error.message}`);
    }

    await persistChildTables(bundle.report.id, {
      report: bundle.report,
      actionItems: syncActionOrders(bundle.actionItems),
      affectedDocuments: syncSimpleOrders(bundle.affectedDocuments),
      riskDocuments: syncSimpleOrders(bundle.riskDocuments),
      reviewRows: syncSimpleOrders(bundle.reviewRows),
      acceptanceRows: syncSimpleOrders(bundle.acceptanceRows),
      closeoutRows: syncSimpleOrders(bundle.closeoutRows),
    });
  }

  async function createMoc() {
    if (!requireCreatePermission("Creating MOCs")) return;

    setSaving(true);
    try {
      const nextNumber = nextMocNumber;
      const newReport: MocReport = {
        ...createEmptyReport(),
        moc_report_no: nextNumber,
        moc_report_title: starterForm.moc_report_title,
        project_worksite_address: starterForm.project_worksite_address,
        moc_coordinator_name: starterForm.moc_coordinator_name,
        responsible_manager_name: starterForm.responsible_manager_name,
        change_type: starterForm.change_type,
        status: "Draft",
      };

      const insertRes = await supabase
        .from("moc_reports")
        .insert({ ...buildParentPayload(newReport, nextNumber), created_at: new Date().toISOString() })
        .select("id")
        .single();

      if (insertRes.error || !insertRes.data?.id) {
        throw new Error(insertRes.error?.message || "Create MOC failed");
      }

      const reportId = String(insertRes.data.id);
      const initialBundle: PersistableMocBundle = {
        report: newReport,
        actionItems: [createActionItem(0)],
        affectedDocuments: [createDocumentRow(0)],
        riskDocuments: [createDocumentRow(0)],
        reviewRows: createReviewRows(),
        acceptanceRows: createSignoffRows(defaultAcceptanceRoles),
        closeoutRows: createSignoffRows(defaultCloseoutRoles),
      };

      try {
        await persistChildTables(reportId, initialBundle);
      } catch (error) {
        const rollbackRes = await supabase.from("moc_reports").delete().eq("id", reportId);
        if (rollbackRes.error) {
          console.error(`[MOC] Failed rolling back created parent ${reportId}`, rollbackRes.error);
          showMessage(
            `Partial failure while creating ${nextNumber}. Parent record could not be rolled back after a child save failed: ${getErrorMessage(
              error
            )}`,
            "warning"
          );
          return;
        }

        throw error;
      }

      const loaded = await loadData();
      openBundle(reportId, loaded);
      setStarterForm(createStarterForm());
      showMessage(`Created MOC ${nextNumber}.`, "success");
    } catch (error) {
      showMessage(getErrorMessage(error), "error");
    } finally {
      setSaving(false);
    }
  }

  async function saveSelectedMoc() {
    if (!selectedReportId) return;
    if (!requireEditPermission("Saving MOCs")) return;
    if (detailReport.status === "Closed") {
      showMessage("Closed MOCs are locked and cannot be edited.", "warning");
      return;
    }
    setSaving(true);
    const previousBundle = getBundleFromData(selectedReportId);
    try {
      const updateRes = await supabase
        .from("moc_reports")
        .update(buildParentPayload(detailReport))
        .eq("id", selectedReportId);

      if (updateRes.error) {
        throw new Error(updateRes.error.message);
      }

      await persistChildTables(selectedReportId, buildCurrentDetailBundle());

      const loaded = await loadData();
      openBundle(selectedReportId, loaded);
      showMessage(`Saved ${detailReport.moc_report_no}.`, "success");
    } catch (error) {
      if (previousBundle) {
        try {
          await restoreBundle(previousBundle);
          await loadData();
          openBundle(selectedReportId);
          showMessage(
            `Partial failure while saving ${detailReport.moc_report_no}. Previous saved data was restored. ${getErrorMessage(
              error
            )}`,
            "warning"
          );
        } catch (restoreError) {
          console.error(`[MOC] Failed restoring previous bundle for ${selectedReportId}`, restoreError);
          showMessage(
            `Partial failure while saving ${detailReport.moc_report_no}. Restore also failed: ${getErrorMessage(
              restoreError
            )}`,
            "warning"
          );
        }
      } else {
        showMessage(getErrorMessage(error), "error");
      }
    } finally {
      setSaving(false);
    }
  }

  async function progressSelectedMoc(nextStatus: MocStatus) {
    if (!selectedReportId) return;
    if (!requireEditPermission("Progressing MOC workflow")) return;

    const allowedNext = getNextWorkflowStatus(detailReport.status);
    if (allowedNext !== nextStatus) {
      showMessage(`Status cannot move directly from ${detailReport.status} to ${nextStatus}.`, "warning");
      return;
    }

    setSaving(true);
    const previousBundle = getBundleFromData(selectedReportId);
    const nextReport = { ...detailReport, status: nextStatus };
    const nextBundle = {
      ...buildCurrentDetailBundle(),
      report: nextReport,
    };
    try {
      const updateRes = await supabase
        .from("moc_reports")
        .update(buildParentPayload(nextReport))
        .eq("id", selectedReportId);

      if (updateRes.error) {
        throw new Error(updateRes.error.message);
      }

      await persistChildTables(selectedReportId, nextBundle);

      const loaded = await loadData();
      openBundle(selectedReportId, loaded);
      showMessage(`${detailReport.moc_report_no} moved to ${nextStatus}.`, "success");
    } catch (error) {
      if (previousBundle) {
        try {
          await restoreBundle(previousBundle);
          await loadData();
          openBundle(selectedReportId);
          showMessage(
            `Partial failure while saving ${detailReport.moc_report_no}. Previous saved data was restored. ${getErrorMessage(
              error
            )}`,
            "warning"
          );
        } catch (restoreError) {
          console.error(`[MOC] Failed restoring previous bundle for ${selectedReportId}`, restoreError);
          showMessage(
            `Partial failure while saving ${detailReport.moc_report_no}. Restore also failed: ${getErrorMessage(
              restoreError
            )}`,
            "warning"
          );
        }
      } else {
        showMessage(getErrorMessage(error), "error");
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteSelectedMoc() {
    if (!selectedReportId) return;
    if (!requireEditPermission("Deleting MOCs")) return;
    if (!window.confirm(`Delete ${detailReport.moc_report_no}?`)) return;

    setSaving(true);
    try {
      const deleteRes = await supabase.from("moc_reports").delete().eq("id", selectedReportId);
      if (deleteRes.error) throw new Error(deleteRes.error.message);
      setSelectedReportId("");
      setDetailReport(createEmptyReport());
      setDetailActionItems([createActionItem(0)]);
      setDetailAffectedDocuments([createDocumentRow(0)]);
      setDetailRiskDocuments([createDocumentRow(0)]);
      setDetailReviewRows(createReviewRows());
      setDetailAcceptanceRows(createSignoffRows(defaultAcceptanceRoles));
      setDetailCloseoutRows(createSignoffRows(defaultCloseoutRoles));
      await loadData();
      showMessage("MOC deleted.", "success");
    } catch (error) {
      showMessage(getErrorMessage(error), "error");
    } finally {
      setSaving(false);
    }
  }

  function updateDetailField<K extends keyof MocReport>(key: K, value: MocReport[K]) {
    setDetailReport((prev) => ({ ...prev, [key]: value }));
  }

  function toggleImpactField(
    key:
      | "impact_health_safety"
      | "impact_environment"
      | "impact_quality"
      | "impact_scm"
      | "impact_schedule"
      | "impact_equipment"
      | "impact_fabrication_opps"
      | "impact_engineering"
      | "impact_marine_operations"
      | "impact_organization"
      | "impact_regulatory"
      | "impact_documentation"
      | "impact_reputation"
      | "impact_simops"
      | "impact_other"
  ) {
    setDetailReport((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function addActionRow() {
    setDetailActionItems((prev) => [...syncActionOrders(prev), createActionItem(prev.length)]);
  }

  function updateActionRow(index: number, key: keyof MocActionPlanItem, value: string | number) {
    setDetailActionItems((prev) =>
      syncActionOrders(
        prev.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row))
      )
    );
  }

  function removeActionRow(index: number) {
    setDetailActionItems((prev) => syncActionOrders(prev.filter((_, rowIndex) => rowIndex !== index)));
  }

  function moveActionRow(index: number, direction: -1 | 1) {
    setDetailActionItems((prev) => syncActionOrders(moveArrayItem(prev, index, direction)));
  }

  function addAffectedDocumentRow() {
    setDetailAffectedDocuments((prev) => [...syncSimpleOrders(prev), createDocumentRow(prev.length)]);
  }

  function updateAffectedDocumentRow(index: number, key: keyof MocDocumentRow, value: string) {
    setDetailAffectedDocuments((prev) =>
      syncSimpleOrders(prev.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)))
    );
  }

  function removeAffectedDocumentRow(index: number) {
    setDetailAffectedDocuments((prev) => syncSimpleOrders(prev.filter((_, rowIndex) => rowIndex !== index)));
  }

  function moveAffectedDocumentRow(index: number, direction: -1 | 1) {
    setDetailAffectedDocuments((prev) => syncSimpleOrders(moveArrayItem(prev, index, direction)));
  }

  function addRiskDocumentRow() {
    setDetailRiskDocuments((prev) => [...syncSimpleOrders(prev), createDocumentRow(prev.length)]);
  }

  function updateRiskDocumentRow(index: number, key: keyof MocDocumentRow, value: string) {
    setDetailRiskDocuments((prev) =>
      syncSimpleOrders(prev.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)))
    );
  }

  function removeRiskDocumentRow(index: number) {
    setDetailRiskDocuments((prev) => syncSimpleOrders(prev.filter((_, rowIndex) => rowIndex !== index)));
  }

  function moveRiskDocumentRow(index: number, direction: -1 | 1) {
    setDetailRiskDocuments((prev) => syncSimpleOrders(moveArrayItem(prev, index, direction)));
  }

  function addReviewRow() {
    setDetailReviewRows((prev) => [
      ...syncSimpleOrders(prev),
      {
        id: "",
        moc_report_id: "",
        sort_order: prev.length,
        involved_party: "",
        approve_flag: false,
        inform_flag: false,
        name: "",
        position: "",
        approved_value: "",
        signature: "",
        review_date: "",
        comments: "",
      },
    ]);
  }

  function updateReviewRow(
    index: number,
    key: keyof MocReviewRow,
    value: string | boolean | number
  ) {
    setDetailReviewRows((prev) =>
      syncSimpleOrders(prev.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)))
    );
  }

  function uploadReviewSignature(index: number, file: File | null) {
    void handleSignatureFile(file, (value) => updateReviewRow(index, "signature", value));
  }

  function removeReviewRow(index: number) {
    setDetailReviewRows((prev) => syncSimpleOrders(prev.filter((_, rowIndex) => rowIndex !== index)));
  }

  function moveReviewRow(index: number, direction: -1 | 1) {
    setDetailReviewRows((prev) => syncSimpleOrders(moveArrayItem(prev, index, direction)));
  }

  function addAcceptanceRow() {
    setDetailAcceptanceRows((prev) => [
      ...syncSimpleOrders(prev),
      { id: "", moc_report_id: "", sort_order: prev.length, role_label: "", position: "", name: "", signature: "", signoff_date: "" },
    ]);
  }

  function updateAcceptanceRow(index: number, key: keyof MocSignoffRow, value: string | number) {
    setDetailAcceptanceRows((prev) =>
      syncSimpleOrders(prev.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)))
    );
  }

  function uploadAcceptanceSignature(index: number, file: File | null) {
    void handleSignatureFile(file, (value) => updateAcceptanceRow(index, "signature", value));
  }

  function removeAcceptanceRow(index: number) {
    setDetailAcceptanceRows((prev) => syncSimpleOrders(prev.filter((_, rowIndex) => rowIndex !== index)));
  }

  function moveAcceptanceRow(index: number, direction: -1 | 1) {
    setDetailAcceptanceRows((prev) => syncSimpleOrders(moveArrayItem(prev, index, direction)));
  }

  function addCloseoutRow() {
    setDetailCloseoutRows((prev) => [
      ...syncSimpleOrders(prev),
      { id: "", moc_report_id: "", sort_order: prev.length, role_label: "", position: "", name: "", signature: "", signoff_date: "" },
    ]);
  }

  function updateCloseoutRow(index: number, key: keyof MocSignoffRow, value: string | number) {
    setDetailCloseoutRows((prev) =>
      syncSimpleOrders(prev.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)))
    );
  }

  function uploadCloseoutSignature(index: number, file: File | null) {
    void handleSignatureFile(file, (value) => updateCloseoutRow(index, "signature", value));
  }

  function removeCloseoutRow(index: number) {
    setDetailCloseoutRows((prev) => syncSimpleOrders(prev.filter((_, rowIndex) => rowIndex !== index)));
  }

  function moveCloseoutRow(index: number, direction: -1 | 1) {
    setDetailCloseoutRows((prev) => syncSimpleOrders(moveArrayItem(prev, index, direction)));
  }

  async function handleAttachmentUpload(event: ChangeEvent<HTMLInputElement>) {
    if (!requireEditPermission("Uploading MOC attachments")) {
      event.currentTarget.value = "";
      return;
    }

    if (!selectedReportId) {
      showMessage("Select an MOC first.", "warning");
      return;
    }

    if (!canManageAttachments) {
      showMessage("Closed MOCs are locked and attachments cannot be changed.", "warning");
      return;
    }

    const files = Array.from(event.target.files || []);
    event.currentTarget.value = "";

    if (!files.length) return;

    const invalidFile = files.find((file) => !isAllowedMocAttachment(file));
    if (invalidFile) {
      showMessage(
        `Unsupported file type for "${invalidFile.name}". Allowed files: ${allowedMocAttachmentExtensions.join(", ")}.`,
        "warning"
      );
      return;
    }

    setUploadingAttachments(true);

    try {
      const uploadedPaths: string[] = [];
      const metadataRows: Array<{
        moc_report_id: string;
        file_name: string;
        file_path: string;
        file_size: number;
        content_type: string;
      }> = [];

      for (const file of files) {
        const safeName = sanitizeFileName(file.name);
        const filePath = `MOC/${selectedReportId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from(MOC_ATTACHMENT_BUCKET)
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        uploadedPaths.push(filePath);

        metadataRows.push({
          moc_report_id: selectedReportId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          content_type: file.type || "application/octet-stream",
        });
      }

      const { error: metadataError } = await supabase.from("moc_attachments").insert(metadataRows);
      if (metadataError) {
        if (uploadedPaths.length > 0) {
          await supabase.storage.from(MOC_ATTACHMENT_BUCKET).remove(uploadedPaths);
        }
        throw new Error(metadataError.message);
      }

      const loaded = await loadData();
      openBundle(selectedReportId, loaded);
      showMessage(
        files.length === 1 ? `Uploaded "${files[0].name}".` : `Uploaded ${files.length} supporting documents.`,
        "success"
      );
    } catch (error) {
      showMessage(`Attachment upload failed: ${getErrorMessage(error)}`, "error");
    } finally {
      setUploadingAttachments(false);
    }
  }

  async function openAttachment(file: MocAttachment) {
    setAttachmentActionId(file.id);
    try {
      const { data, error } = await supabase.storage
        .from(MOC_ATTACHMENT_BUCKET)
        .createSignedUrl(file.file_path, 300);

      if (error || !data?.signedUrl) {
        throw new Error(error?.message || "Could not create file link.");
      }

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      showMessage(`Could not open attachment: ${getErrorMessage(error)}`, "error");
    } finally {
      setAttachmentActionId("");
    }
  }

  async function removeAttachment(file: MocAttachment) {
    if (!requireEditPermission("Removing MOC attachments")) return;

    if (!canManageAttachments) {
      showMessage("Closed MOCs are locked and attachments cannot be removed.", "warning");
      return;
    }

    const confirmed = window.confirm(`Remove supporting document "${file.file_name}"?`);
    if (!confirmed) return;

    setAttachmentActionId(file.id);
    try {
      const { error: storageError } = await supabase.storage.from(MOC_ATTACHMENT_BUCKET).remove([file.file_path]);
      if (storageError) {
        throw new Error(storageError.message);
      }

      const { error: metadataError } = await supabase.from("moc_attachments").delete().eq("id", file.id);
      if (metadataError) {
        throw new Error(metadataError.message);
      }

      const loaded = await loadData();
      if (selectedReportId) {
        openBundle(selectedReportId, loaded);
      }
      showMessage(`Removed "${file.file_name}".`, "success");
    } catch (error) {
      showMessage(`Attachment delete failed: ${getErrorMessage(error)}`, "error");
    } finally {
      setAttachmentActionId("");
    }
  }

  let pdfPageDecorator: ((doc: jsPDF) => void) | null = null;

  function ensurePageSpace(doc: jsPDF, y: number, needed = 24) {
    if (y + needed <= 276) return y;
    doc.addPage();
    pdfPageDecorator?.(doc);
    return 28;
  }

  function drawFieldBlock(
    doc: jsPDF,
    x: number,
    y: number,
    width: number,
    label: string,
    value: string,
    height = 18
  ) {
    const labelHeight = 6;
    const lineHeight = 4;
    const maxLines = Math.max(1, Math.floor((height - labelHeight - 3.5) / lineHeight));

    doc.setDrawColor(208, 208, 206);
    doc.setFillColor(255, 255, 255);
    doc.rect(x, y, width, height, "FD");
    doc.setFillColor(236, 236, 231);
    doc.rect(x, y, width, labelHeight, "F");
    doc.line(x, y + labelHeight, x + width, y + labelHeight);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(83, 86, 90);
    doc.text(label, x + 2, y + 4.1);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.8);
    doc.setTextColor(0, 0, 0);
    const lines = doc.splitTextToSize(getPdfText(value) || " ", width - 4).slice(0, maxLines);
    doc.text(lines, x + 2, y + labelHeight + 4.4);
  }

  function drawSectionHeading(doc: jsPDF, y: number, heading: string) {
    doc.setFillColor(0, 86, 112);
    doc.roundedRect(12, y, 186, 8, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(heading, 14, y + 5.3);
    doc.setTextColor(0, 0, 0);
  }

  function drawPdfPageChrome(doc: jsPDF, logoImage: PdfImageMeta | null, reportNo: string) {
    if (logoImage) {
      drawImageFit(doc, logoImage, 12, 7.8, 30, 9.2, "left");
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13.5);
    doc.setTextColor(0, 0, 0);
    doc.text("ENS-HSEQ-FRM-008 Management of Change Form", 105, 13.5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.4);
    doc.setTextColor(83, 86, 90);
    doc.text("Rev D", 198, 10.8, { align: "right" });
    doc.text(getPdfText(reportNo), 198, 15.4, { align: "right" });
    doc.setDrawColor(208, 208, 206);
    doc.line(12, 20.5, 198, 20.5);
    doc.setTextColor(0, 0, 0);
  }

  function getLastAutoTableY(doc: jsPDF, fallback: number) {
    return (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || fallback;
  }

  function drawChoiceBlock(
    doc: jsPDF,
    x: number,
    y: number,
    width: number,
    label: string,
    items: Array<{ label: string; checked: boolean }>,
    height = 20
  ) {
    drawFieldBlock(doc, x, y, width, label, "", height);
    let rowY = y + 10.5;

    items.forEach((item) => {
      doc.setDrawColor(83, 86, 90);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.6);
      doc.setTextColor(0, 0, 0);
      doc.text(`${getPdfCheckbox(item.checked)} ${item.label}`, x + 2.2, rowY);
      rowY += 4.6;
    });
  }

  function drawFormTable(
    doc: jsPDF,
    config: {
      startY: number;
      head: string[][];
      body: Array<Array<string>>;
      fontSize?: number;
      cellPadding?: number;
      minCellHeight?: number;
      columnStyles?: Record<string | number, Record<string, unknown>>;
      signatureColumns?: number[];
      signatureImages?: Map<string, PdfImageMeta>;
      rowPageBreak?: "auto" | "avoid";
    }
  ) {
    autoTable(doc, {
      startY: config.startY,
      head: config.head,
      body: config.body.length ? config.body : [config.head[0].map(() => "")],
      theme: "grid",
      margin: { left: 12, right: 12 },
      styles: {
        fontSize: config.fontSize ?? 8,
        cellPadding: config.cellPadding ?? 2.2,
        textColor: [0, 0, 0],
        lineColor: [208, 208, 206],
        lineWidth: 0.1,
        overflow: "linebreak",
        valign: "middle",
        minCellHeight: config.minCellHeight ?? 8,
      },
      headStyles: {
        fillColor: [0, 86, 112],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [236, 236, 231] },
      bodyStyles: { fillColor: [255, 255, 255] },
      columnStyles: config.columnStyles,
      rowPageBreak: config.rowPageBreak ?? "avoid",
      didParseCell: (hook) => {
        if (
          hook.section === "body" &&
          config.signatureColumns?.includes(hook.column.index) &&
          typeof hook.cell.raw === "string" &&
          isDataImageUrl(hook.cell.raw)
        ) {
          hook.cell.text = [""];
          hook.cell.styles.minCellHeight = Math.max(Number(config.minCellHeight || 8), 12);
        }
      },
      didDrawCell: (hook) => {
        if (
          hook.section === "body" &&
          config.signatureColumns?.includes(hook.column.index) &&
          typeof hook.cell.raw === "string" &&
          isDataImageUrl(hook.cell.raw)
        ) {
          const signatureImage = config.signatureImages?.get(hook.cell.raw);
          if (signatureImage) {
            drawImageFit(doc, signatureImage, hook.cell.x + 1, hook.cell.y + 1, hook.cell.width - 2, hook.cell.height - 2);
          }
        }
      },
    });
    return getLastAutoTableY(doc, config.startY);
  }

  function drawReportDetails(doc: jsPDF, y: number, bundle: MocBundle) {
    drawSectionHeading(doc, y, "A. MOC REPORT DETAILS");
    y += 10;
    y = drawFormTable(doc, {
      startY: y,
      head: [["Field", "Details"]],
      body: [
        ["MOC Report No.", getPdfText(bundle.report.moc_report_no)],
        ["MOC Report Title", getPdfText(bundle.report.moc_report_title)],
        ["Project/Worksite Address", getPdfText(bundle.report.project_worksite_address)],
        ["MOC Co-Ordinator Name", getPdfText(bundle.report.moc_coordinator_name)],
        ["MOC Co-Ordinator Position", getPdfText(bundle.report.moc_coordinator_position)],
        ["Responsible ENS Manager / Supervisor Name", getPdfText(bundle.report.responsible_manager_name)],
        ["Responsible ENS Manager / Supervisor Position", getPdfText(bundle.report.responsible_manager_position)],
      ],
      fontSize: 7.9,
      cellPadding: 2.4,
      minCellHeight: 9,
      rowPageBreak: "auto",
      columnStyles: {
        0: { cellWidth: 58, fontStyle: "bold" },
        1: { cellWidth: 128 },
      },
    });
    return y + 9;
  }

  function drawChangeIdentification(doc: jsPDF, y: number, bundle: MocBundle) {
    y = ensurePageSpace(doc, y, 64);
    drawSectionHeading(doc, y, "B. CHANGE IDENTIFICATION");
    y += 10;
    drawChoiceBlock(
      doc,
      12,
      y,
      56,
      "Is the change?",
      [
        { label: "Permanent", checked: bundle.report.change_type === "Permanent" },
        { label: "Temporary", checked: bundle.report.change_type === "Temporary" },
      ],
      22
    );
    drawFieldBlock(doc, 70, y, 64, "If Temporary, From", getPdfDate(bundle.report.temporary_valid_from), 22);
    drawFieldBlock(doc, 134, y, 64, "If Temporary, To", getPdfDate(bundle.report.temporary_valid_to), 22);
    y += 26;
    y = drawFormTable(doc, {
      startY: y,
      head: [["Field", "Details"]],
      body: [
        ["Description of the change (proposed change)", getPdfText(bundle.report.proposed_change_description)],
        ["Reason for the change", getPdfText(bundle.report.reason_for_change)],
        ["How will the change be implemented?", getPdfText(bundle.report.implementation_plan)],
        ["Supporting documentation note / field", getPdfText(bundle.report.supporting_documentation_note)],
      ],
      fontSize: 7.8,
      cellPadding: 2.5,
      minCellHeight: 11,
      rowPageBreak: "auto",
      columnStyles: {
        0: { cellWidth: 52, fontStyle: "bold" },
        1: { cellWidth: 134 },
      },
    });
    return y + 9;
  }

  function drawActionPlan(doc: jsPDF, y: number, bundle: MocBundle) {
    y = ensurePageSpace(doc, y, 44);
    drawSectionHeading(doc, y, "C. ACTION PLAN");
    y += 10;
    y = drawFormTable(doc, {
      startY: y,
      head: [["No", "Description of Action", "Responsible Person", "Target Date", "Status"]],
      body: bundle.actionItems.map((row, index) => [
        getPdfText(row.action_no) || String(index + 1),
        getPdfText(row.description),
        getPdfText(row.responsible_person),
        getPdfDate(row.target_date),
        getPdfText(row.status),
      ]),
      fontSize: 7.8,
      cellPadding: 2.4,
      minCellHeight: 9,
      columnStyles: {
        0: { cellWidth: 14 },
        1: { cellWidth: 86 },
        2: { cellWidth: 42 },
        3: { cellWidth: 22 },
        4: { cellWidth: 20 },
      },
    });
    return y + 9;
  }

  function drawImpacts(doc: jsPDF, y: number, bundle: MocBundle) {
    y = ensurePageSpace(doc, y, 34);
    drawSectionHeading(doc, y, "D. CHANGE IMPACT");
    y += 10;
    const impactLines = [
      `${getPdfCheckbox(bundle.report.impact_health_safety)} Health & Safety`,
      `${getPdfCheckbox(bundle.report.impact_environment)} Environment`,
      `${getPdfCheckbox(bundle.report.impact_quality)} Quality`,
      `${getPdfCheckbox(bundle.report.impact_scm)} SCM`,
      `${getPdfCheckbox(bundle.report.impact_schedule)} Schedule`,
      `${getPdfCheckbox(bundle.report.impact_equipment)} Equipment`,
      `${getPdfCheckbox(bundle.report.impact_fabrication_opps)} Fabrication Opps`,
      `${getPdfCheckbox(bundle.report.impact_engineering)} Engineering`,
      `${getPdfCheckbox(bundle.report.impact_marine_operations)} Marine operations`,
      `${getPdfCheckbox(bundle.report.impact_organization)} Organization`,
      `${getPdfCheckbox(bundle.report.impact_regulatory)} Regulatory`,
      `${getPdfCheckbox(bundle.report.impact_documentation)} Documentation`,
      `${getPdfCheckbox(bundle.report.impact_reputation)} Reputation`,
      `${getPdfCheckbox(bundle.report.impact_simops)} SIMOPS`,
      `${getPdfCheckbox(bundle.report.impact_other)} Other${bundle.report.impact_other_text ? `: ${bundle.report.impact_other_text}` : ""}`,
    ];
    const columns = 3;
    const rows = Math.ceil(impactLines.length / columns);
    const blockHeight = 7 + rows * 5.2;
    const columnWidth = 186 / columns;

    doc.setDrawColor(208, 208, 206);
    doc.setFillColor(255, 255, 255);
    doc.rect(12, y, 186, blockHeight, "FD");
    doc.setFillColor(236, 236, 231);
    doc.rect(12, y, 186, 6, "F");
    doc.line(12, y + 6, 198, y + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(83, 86, 90);
    doc.text("Impact areas", 14, y + 4.1);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.2);
    doc.setTextColor(0, 0, 0);

    impactLines.forEach((line, index) => {
      const column = Math.floor(index / rows);
      const row = index % rows;
      const lineX = 14 + column * columnWidth;
      const lineY = y + 10.6 + row * 5;
      doc.text(line, lineX, lineY);
    });

    return y + blockHeight + 6;
  }

  function drawAffectedDocumentation(doc: jsPDF, y: number, bundle: MocBundle) {
    y = ensurePageSpace(doc, y, 32);
    drawSectionHeading(doc, y, "E. AFFECTED DOCUMENTATION");
    y += 10;
    y = drawFormTable(doc, {
      startY: y,
      head: [["Number", "Title", "Rev."]],
      body: bundle.affectedDocuments.map((row) => [getPdfText(row.number), getPdfText(row.title), getPdfText(row.rev)]),
      fontSize: 7.8,
      cellPadding: 2.4,
      minCellHeight: 9,
      columnStyles: {
        0: { cellWidth: 42 },
        1: { cellWidth: 118 },
        2: { cellWidth: 26 },
      },
    });
    return y + 9;
  }

  function drawRiskSection(doc: jsPDF, y: number, bundle: MocBundle) {
    y = ensurePageSpace(doc, y, 72);
    drawSectionHeading(doc, y, "F. RISK MANAGEMENT");
    y += 10;
    y = drawFormTable(doc, {
      startY: y,
      head: [["Number", "Title", "Rev."]],
      body: bundle.riskDocuments.map((row) => [getPdfText(row.number), getPdfText(row.title), getPdfText(row.rev)]),
      fontSize: 7.8,
      cellPadding: 2.4,
      minCellHeight: 9,
      columnStyles: {
        0: { cellWidth: 42 },
        1: { cellWidth: 118 },
        2: { cellWidth: 26 },
      },
    });
    y += 5;
    y = drawFormTable(doc, {
      startY: y,
      head: [["Question", "Response", "Details"]],
      body: [
        ["Is a HIRA required?", getPdfText(bundle.report.hira_required), getPdfText(bundle.report.hira_reason)],
        [
          "Change in lifting philosophy?",
          getPdfText(bundle.report.lifting_change_status),
          getPdfText(bundle.report.lifting_change_description),
        ],
        ["Change in PTW philosophy?", getPdfText(bundle.report.ptw_change_status), getPdfText(bundle.report.ptw_change_description)],
        ["Environmental Impact", "", getPdfText(bundle.report.environmental_impact_description)],
      ],
      fontSize: 7.7,
      cellPadding: 2.4,
      minCellHeight: 11,
      rowPageBreak: "auto",
      columnStyles: {
        0: { cellWidth: 52, fontStyle: "bold" },
        1: { cellWidth: 24, halign: "center" },
        2: { cellWidth: 110 },
      },
    });
    return y + 9;
  }

  function drawHazards(doc: jsPDF, y: number, bundle: MocBundle) {
    y = ensurePageSpace(doc, y, 48);
    drawSectionHeading(doc, y, "G. HAZARDS & MITIGATING ACTIONS");
    y += 10;
    y = drawFormTable(doc, {
      startY: y,
      head: [["Area", "Details"]],
      body: [
        ["Potential Hazards & Risks", getPdfText(bundle.report.hazard_risks_description)],
        ["Proposed Risk Mitigations", getPdfText(bundle.report.proposed_risk_mitigations)],
      ],
      fontSize: 7.8,
      cellPadding: 2.5,
      minCellHeight: 12,
      rowPageBreak: "auto",
      columnStyles: {
        0: { cellWidth: 44, fontStyle: "bold" },
        1: { cellWidth: 142 },
      },
    });
    return y + 9;
  }

  function drawCostSchedule(doc: jsPDF, y: number, bundle: MocBundle) {
    y = ensurePageSpace(doc, y, 34);
    drawSectionHeading(doc, y, "H. COST REVIEW");
    y += 10;
    y = drawFormTable(doc, {
      startY: y,
      head: [["Field", "Details"]],
      body: [["Description of cost impact (incl. future savings)", getPdfText(bundle.report.cost_review_description)]],
      fontSize: 7.8,
      cellPadding: 2.5,
      minCellHeight: 12,
      rowPageBreak: "auto",
      columnStyles: {
        0: { cellWidth: 58, fontStyle: "bold" },
        1: { cellWidth: 128 },
      },
    });
    y += 9;

    y = ensurePageSpace(doc, y, 34);
    drawSectionHeading(doc, y, "I. SCHEDULE REVIEW");
    y += 10;
    y = drawFormTable(doc, {
      startY: y,
      head: [["Field", "Details"]],
      body: [["Description of the schedule impact (incl. future savings)", getPdfText(bundle.report.schedule_review_description)]],
      fontSize: 7.8,
      cellPadding: 2.5,
      minCellHeight: 12,
      rowPageBreak: "auto",
      columnStyles: {
        0: { cellWidth: 58, fontStyle: "bold" },
        1: { cellWidth: 128 },
      },
    });
    return y + 9;
  }

  function drawSupportingDocs(doc: jsPDF, y: number, bundle: MocBundle) {
    y = ensurePageSpace(doc, y, 38);
    drawSectionHeading(doc, y, "J. SUPPORTING DOCUMENTATION AND INFORMATION");
    y += 10;
    y = drawFormTable(doc, {
      startY: y,
      head: [["Field", "Details"]],
      body: [["Supporting documentation / information", getPdfText(bundle.report.supporting_documentation_information)]],
      fontSize: 7.8,
      cellPadding: 2.5,
      minCellHeight: 12,
      rowPageBreak: "auto",
      columnStyles: {
        0: { cellWidth: 58, fontStyle: "bold" },
        1: { cellWidth: 128 },
      },
    });
    y += 5;
    y = ensurePageSpace(doc, y, 30);
    drawChoiceBlock(
      doc,
      12,
      y,
      186,
      "Variation Order",
      [
        { label: `Ref: ${getPdfText(bundle.report.variation_order_reference_no)}`, checked: !bundle.report.variation_order_na },
        { label: "N/A", checked: bundle.report.variation_order_na },
      ],
      24
    );
    return y + 30;
  }

  function drawReviewSection(doc: jsPDF, y: number, bundle: MocBundle, signatureImages: Map<string, PdfImageMeta>) {
    y = ensurePageSpace(doc, y, 48);
    drawSectionHeading(doc, y, "K. REVIEW AND ENDORSEMENT");
    y += 10;
    y = drawFormTable(doc, {
      startY: y,
      head: [["Approve", "Inform", "Involved Party", "Name", "Position", "Approved", "Signature", "Date", "Comments"]],
      body: bundle.reviewRows.map((row) => [
        getPdfCheckbox(row.approve_flag),
        getPdfCheckbox(row.inform_flag),
        getPdfText(row.involved_party),
        getPdfText(row.name),
        getPdfText(row.position),
        getPdfText(row.approved_value),
        row.signature || "",
        getPdfDate(row.review_date),
        getPdfText(row.comments),
      ]),
      fontSize: 6.7,
      cellPadding: 1.6,
      minCellHeight: 8.5,
      signatureColumns: [6],
      signatureImages,
      columnStyles: {
        0: { cellWidth: 12, halign: "center" },
        1: { cellWidth: 12, halign: "center" },
        2: { cellWidth: 22 },
        3: { cellWidth: 22 },
        4: { cellWidth: 22 },
        5: { cellWidth: 16 },
        6: { cellWidth: 24 },
        7: { cellWidth: 18 },
        8: { cellWidth: 38 },
      },
    });
    return y + 9;
  }

  function drawAcceptance(doc: jsPDF, y: number, bundle: MocBundle, signatureImages: Map<string, PdfImageMeta>) {
    y = ensurePageSpace(doc, y, 40);
    drawSectionHeading(doc, y, "L. MOC CHANGE ACCEPTANCE");
    y += 10;
    y = drawFormTable(doc, {
      startY: y,
      head: [["Role", "Name", "Position", "Signature", "Date"]],
      body: bundle.acceptanceRows.map((row) => [
        getPdfText(row.role_label),
        getPdfText(row.name),
        getPdfText(row.position),
        row.signature || "",
        getPdfDate(row.signoff_date),
      ]),
      fontSize: 7.8,
      cellPadding: 2.6,
      minCellHeight: 10,
      signatureColumns: [3],
      signatureImages,
      columnStyles: {
        0: { cellWidth: 62 },
        1: { cellWidth: 34 },
        2: { cellWidth: 38 },
        3: { cellWidth: 34 },
        4: { cellWidth: 18 },
      },
    });
    return y + 9;
  }

  function drawCloseout(doc: jsPDF, y: number, bundle: MocBundle, signatureImages: Map<string, PdfImageMeta>) {
    y = ensurePageSpace(doc, y, 40);
    drawSectionHeading(doc, y, "M. MOC CLOSE-OUT VERIFICATION");
    y += 10;
    return drawFormTable(doc, {
      startY: y,
      head: [["Role", "Name", "Position", "Signature", "Date"]],
      body: bundle.closeoutRows.map((row) => [
        getPdfText(row.role_label),
        getPdfText(row.name),
        getPdfText(row.position),
        row.signature || "",
        getPdfDate(row.signoff_date),
      ]),
      fontSize: 7.8,
      cellPadding: 2.6,
      minCellHeight: 10,
      signatureColumns: [3],
      signatureImages,
      columnStyles: {
        0: { cellWidth: 62 },
        1: { cellWidth: 34 },
        2: { cellWidth: 38 },
        3: { cellWidth: 34 },
        4: { cellWidth: 18 },
      },
    });
  }

  function wordValue(value: string | null | undefined) {
    const text = String(value || "").trim();
    return text;
  }

  function wordDate(value: string | null | undefined) {
    return getPdfDate(value);
  }

  function dataUrlToUint8Array(dataUrl: string) {
    const base64 = dataUrl.split(",")[1] || "";
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  const wordTableBorder = { style: BorderStyle.SINGLE, color: "D0D0CE", size: 2 };
  const wordTableBorders = {
    top: wordTableBorder,
    bottom: wordTableBorder,
    left: wordTableBorder,
    right: wordTableBorder,
    insideHorizontal: wordTableBorder,
    insideVertical: wordTableBorder,
  };
  const wordNoBorder = { style: BorderStyle.NONE, color: "FFFFFF", size: 0 };
  const wordNoBorders = {
    top: wordNoBorder,
    bottom: wordNoBorder,
    left: wordNoBorder,
    right: wordNoBorder,
    insideHorizontal: wordNoBorder,
    insideVertical: wordNoBorder,
  };
  const wordBodyWidth = 9360;

  function wordPara(text: string, bold = false, options?: { after?: number; italic?: boolean; color?: string }) {
    return new Paragraph({
      children: [
            new TextRun({
              text,
              font: "Azo Sans",
              bold,
              italics: options?.italic,
              color: options?.color || "000000",
          size: 18,
        }),
      ],
      spacing: { after: options?.after ?? 100 },
    });
  }

  function wordSectionTitle(text: string) {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      borders: wordNoBorders,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              shading: { type: ShadingType.CLEAR, fill: "005670", color: "auto" },
              margins: { top: 110, bottom: 110, left: 150, right: 150 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: text.toUpperCase(), font: "Azo Sans", bold: true, color: "FFFFFF", size: 20 })],
                }),
              ],
            }),
          ],
        }),
      ],
    });
  }

  function wordSpacer(size = 100) {
    return new Paragraph({ children: [new TextRun({ text: "", font: "Azo Sans", size: 1 })], spacing: { after: size } });
  }

  function wordCell(
    text: string,
    options?: {
      header?: boolean;
      label?: boolean;
      width?: number;
      shaded?: boolean;
      align?: (typeof AlignmentType)[keyof typeof AlignmentType];
      fontSize?: number;
    }
  ) {
    const header = Boolean(options?.header);
    const label = Boolean(options?.label);
    return new TableCell({
      width: options?.width ? { size: options.width, type: WidthType.DXA } : undefined,
      verticalAlign: VerticalAlign.CENTER,
      shading: header
        ? { type: ShadingType.CLEAR, fill: "005670", color: "auto" }
        : options?.shaded
          ? { type: ShadingType.CLEAR, fill: "ECECE7", color: "auto" }
          : undefined,
      margins: { top: 110, bottom: 110, left: 120, right: 120 },
      children: [
        new Paragraph({
          alignment: options?.align,
          children: [
            new TextRun({
              text: wordValue(text),
              font: "Azo Sans",
              bold: header || label,
              color: header ? "FFFFFF" : "000000",
              size: options?.fontSize ?? (header ? 18 : 17),
            }),
          ],
        }),
      ],
    });
  }

  function wordTable(
    headers: string[],
    rows: string[][],
    options?: {
      columnWidths?: number[];
      labelFirstColumn?: boolean;
      headerFill?: string;
      headerFontSize?: number;
      bodyFontSize?: number;
      centerColumns?: number[];
    }
  ) {
    const rowsToRender = rows.length ? rows : [headers.map(() => "")];
    const columnWidths =
      options?.columnWidths ||
      headers.map(() => Math.floor(wordBodyWidth / Math.max(headers.length, 1)));

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      columnWidths,
      borders: wordTableBorders,
      rows: [
        new TableRow({
          tableHeader: true,
          children: headers.map((header, index) =>
            wordCell(header, {
              header: true,
              width: columnWidths[index],
              fontSize: options?.headerFontSize,
              align: options?.centerColumns?.includes(index) ? AlignmentType.CENTER : undefined,
            })
          ),
        }),
        ...rowsToRender.map(
          (row, rowIndex) =>
            new TableRow({
              cantSplit: true,
              children: row.map((cell, cellIndex) =>
                wordCell(cell, {
                  width: columnWidths[cellIndex],
                  shaded: rowIndex % 2 === 0,
                  label: Boolean(options?.labelFirstColumn && cellIndex === 0),
                  fontSize: options?.bodyFontSize,
                  align: options?.centerColumns?.includes(cellIndex) ? AlignmentType.CENTER : undefined,
                })
              ),
            })
        ),
      ],
    });
  }

  function wordFieldTable(rows: string[][]) {
    return wordTable(["Field", "Details"], rows, {
      columnWidths: [2800, 6560],
      labelFirstColumn: true,
    });
  }

  function wordChoiceTable(rows: string[][]) {
    return wordTable(["Field", "Selection / Details"], rows, {
      columnWidths: [3000, 6360],
      labelFirstColumn: true,
    });
  }

  function wordCheckbox(checked: boolean) {
    return checked ? "[X]" : "[ ]";
  }

  function wordImpactCell(items: string[]) {
    return new TableCell({
      width: { size: 3120, type: WidthType.DXA },
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 95, bottom: 95, left: 120, right: 120 },
      children: items.map(
        (item) =>
          new Paragraph({
            spacing: { after: 45 },
            children: [new TextRun({ text: item, font: "Azo Sans", color: "000000", size: 17 })],
          })
      ),
    });
  }

  function wordImpactTable(report: MocReport) {
    const impactLines = [
      `${wordCheckbox(report.impact_health_safety)} Health & Safety`,
      `${wordCheckbox(report.impact_environment)} Environment`,
      `${wordCheckbox(report.impact_quality)} Quality`,
      `${wordCheckbox(report.impact_scm)} SCM`,
      `${wordCheckbox(report.impact_schedule)} Schedule`,
      `${wordCheckbox(report.impact_equipment)} Equipment`,
      `${wordCheckbox(report.impact_fabrication_opps)} Fabrication Opps`,
      `${wordCheckbox(report.impact_engineering)} Engineering`,
      `${wordCheckbox(report.impact_marine_operations)} Marine operations`,
      `${wordCheckbox(report.impact_organization)} Organization`,
      `${wordCheckbox(report.impact_regulatory)} Regulatory`,
      `${wordCheckbox(report.impact_documentation)} Documentation`,
      `${wordCheckbox(report.impact_reputation)} Reputation`,
      `${wordCheckbox(report.impact_simops)} SIMOPS`,
      `${wordCheckbox(report.impact_other)} Other${report.impact_other_text ? `: ${report.impact_other_text}` : ""}`,
    ];
    const rows = Math.ceil(impactLines.length / 3);
    const columns = [0, 1, 2].map((columnIndex) =>
      impactLines.slice(columnIndex * rows, columnIndex * rows + rows)
    );

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      columnWidths: [3120, 3120, 3120],
      borders: wordTableBorders,
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            new TableCell({
              columnSpan: 3,
              shading: { type: ShadingType.CLEAR, fill: "ECECE7", color: "auto" },
              margins: { top: 90, bottom: 90, left: 120, right: 120 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: "Impact areas", font: "Azo Sans", bold: true, color: "53565A", size: 15 })],
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          cantSplit: true,
          children: columns.map((items) => wordImpactCell(items)),
        }),
      ],
    });
  }

  function wordVariationOrderTable(report: MocReport) {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      columnWidths: [wordBodyWidth],
      borders: wordTableBorders,
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            new TableCell({
              shading: { type: ShadingType.CLEAR, fill: "ECECE7", color: "auto" },
              margins: { top: 90, bottom: 90, left: 120, right: 120 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: "Variation Order", font: "Azo Sans", bold: true, color: "53565A", size: 15 })],
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              verticalAlign: VerticalAlign.CENTER,
              margins: { top: 110, bottom: 110, left: 120, right: 120 },
              children: [
                new Paragraph({
                  spacing: { after: 55 },
                  children: [
                    new TextRun({
                      text: `${wordCheckbox(!report.variation_order_na)} Ref: ${wordValue(report.variation_order_reference_no)}`,
                      font: "Azo Sans",
                      color: "000000",
                      size: 17,
                    }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `${wordCheckbox(report.variation_order_na)} N/A`,
                      font: "Azo Sans",
                      color: "000000",
                      size: 17,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });
  }

  function wordHeader(report: MocReport, logoData: string) {
    const logoCellChildren =
      logoData && logoData.startsWith("data:image/")
        ? [
            new Paragraph({
              children: [
                new ImageRun({
                  type: "png",
                  data: dataUrlToUint8Array(logoData),
                  transformation: { width: 112, height: 56 },
                }),
              ],
            }),
          ]
        : [
            new Paragraph({
              children: [new TextRun({ text: "ENSHORE", font: "Azo Sans", bold: true, size: 22, color: "000000" })],
            }),
          ];

    return new Header({
      children: [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          layout: TableLayoutType.FIXED,
          columnWidths: [2400, 4560, 2400],
          borders: wordNoBorders,
          rows: [
            new TableRow({
              children: [
                new TableCell({ borders: wordNoBorders, margins: { top: 0, bottom: 45, left: 0, right: 80 }, children: logoCellChildren }),
                new TableCell({
                  borders: wordNoBorders,
                  margins: { top: 20, bottom: 45, left: 80, right: 80 },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      heading: HeadingLevel.HEADING_1,
                      children: [new TextRun({ text: "ENS-HSEQ-FRM-008 Management of Change Form", font: "Azo Sans", bold: true, size: 24, color: "000000" })],
                    }),
                  ],
                }),
                new TableCell({
                  borders: wordNoBorders,
                  margins: { top: 20, bottom: 45, left: 80, right: 0 },
                  children: [
                    new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Rev D", font: "Azo Sans", size: 17, color: "53565A" })] }),
                    new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: wordValue(report.moc_report_no), font: "Azo Sans", size: 17, color: "53565A" })] }),
                  ],
                }),
              ],
            }),
          ],
        }),
        new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, color: "D0D0CE", size: 5 } },
          spacing: { after: 90 },
        }),
      ],
    });
  }

  function wordFooter() {
    return new Footer({
      children: [
        new Paragraph({
          border: { top: { style: BorderStyle.SINGLE, color: "D0D0CE", size: 4 } },
          spacing: { before: 80 },
                  children: [new TextRun({ text: "", font: "Azo Sans", size: 1 })],
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          layout: TableLayoutType.FIXED,
          columnWidths: [7000, 2360],
          borders: wordNoBorders,
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  borders: wordNoBorders,
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: "ENS-HSEQ-FRM-008 Management of Change Form Rev D", font: "Azo Sans", size: 16, color: "53565A" })],
                    }),
                  ],
                }),
                new TableCell({
                  borders: wordNoBorders,
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.RIGHT,
                      children: [
                        new TextRun({ text: "Page ", font: "Azo Sans", size: 16, color: "53565A" }),
                        new SimpleField("PAGE"),
                        new TextRun({ text: " of ", font: "Azo Sans", size: 16, color: "53565A" }),
                        new SimpleField("NUMPAGES"),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });
  }

  function wordSignatureValue(value: string) {
    if (!value) return "";
    if (isDataImageUrl(value)) return "Signature image attached in system / PDF output";
    return value;
  }

  async function generateWordFor(reportId: string, preferCurrentDetail = false) {
    const bundle =
      preferCurrentDetail && detailReport.id === reportId
        ? buildCurrentDetailBundle()
        : getBundleFromData(reportId);

    if (!bundle) return;

    setGeneratingWord(true);

    try {
      const report = bundle.report;
      const logoData = await getLogoDataUrl();

      const bundleAttachments = attachments
        .filter((file) => file.moc_report_id === reportId)
        .sort((a, b) => new Date(b.uploaded_at || 0).getTime() - new Date(a.uploaded_at || 0).getTime());

      const children = [
        wordPara(`Generated ${new Date().toLocaleString("en-GB")}`, false, { italic: true, color: "53565A", after: 60 }),
        wordPara("Generated from IMS as an editable working circulation copy. Controlled PDF output remains the formal record.", true, {
          color: "53565A",
          after: 160,
        }),

        wordSectionTitle("A. MOC Report Details"),
        wordSpacer(50),
        wordFieldTable([
          ["MOC Report No.", report.moc_report_no],
          ["MOC Report Title", report.moc_report_title],
          ["Project/Worksite Address", report.project_worksite_address],
          ["MOC Co-Ordinator Name", report.moc_coordinator_name],
          ["MOC Co-Ordinator Position", report.moc_coordinator_position],
          ["Responsible ENS Manager / Supervisor Name", report.responsible_manager_name],
          ["Responsible ENS Manager / Supervisor Position", report.responsible_manager_position],
          ["Status", report.status],
        ]),
        wordSpacer(),

        wordSectionTitle("B. Change Identification"),
        wordSpacer(50),
        wordChoiceTable([
          ["Description of the change", report.proposed_change_description],
          ["Reason for the change", report.reason_for_change],
          ["Change type", report.change_type],
          ["Temporary valid from", wordDate(report.temporary_valid_from)],
          ["Temporary valid to", wordDate(report.temporary_valid_to)],
          ["How will the change be implemented?", report.implementation_plan],
          ["Supporting documentation note / field", report.supporting_documentation_note],
        ]),
        wordSpacer(),

        wordSectionTitle("C. Action Plan"),
        wordSpacer(50),
        wordTable(
          ["No", "Description", "Responsible Person", "Target Date", "Status"],
          bundle.actionItems.map((row, index) => [
            row.action_no || String(index + 1),
            row.description,
            row.responsible_person,
            wordDate(row.target_date),
            normaliseActionPlanStatus(row.status),
          ]),
          { columnWidths: [900, 4300, 1750, 1250, 1160] }
        ),
        wordSpacer(),

        wordSectionTitle("D. Change Impact"),
        wordSpacer(50),
        wordImpactTable(report),
        wordSpacer(),

        wordSectionTitle("E. Affected Documentation"),
        wordSpacer(50),
        wordTable(["Number", "Title", "Rev."], bundle.affectedDocuments.map((row) => [row.number, row.title, row.rev]), {
          columnWidths: [2500, 5600, 1260],
        }),
        wordSpacer(),

        wordSectionTitle("F. Risk Management"),
        wordSpacer(50),
        wordTable(
          ["Question", "Response", "Details"],
          [
            ["Is a HIRA required?", report.hira_required, report.hira_reason],
            ["Change in lifting philosophy?", report.lifting_change_status, report.lifting_change_description],
            ["Change in PTW philosophy?", report.ptw_change_status, report.ptw_change_description],
            ["Environmental Impact", "", report.environmental_impact_description],
          ],
          { columnWidths: [3100, 1300, 4960], labelFirstColumn: true }
        ),
        wordSpacer(60),
        wordTable(["Risk Document Number", "Title", "Rev."], bundle.riskDocuments.map((row) => [row.number, row.title, row.rev]), {
          columnWidths: [2500, 5600, 1260],
        }),
        wordSpacer(),

        wordSectionTitle("G. Hazards & Mitigating Actions"),
        wordSpacer(50),
        wordFieldTable([
          ["Potential Hazards & Risks", report.hazard_risks_description],
          ["Proposed Risk Mitigations", report.proposed_risk_mitigations],
        ]),
        wordSpacer(),

        wordSectionTitle("H. Cost Review"),
        wordSpacer(50),
        wordFieldTable([["Description of cost impact", report.cost_review_description]]),
        wordSpacer(),

        wordSectionTitle("I. Schedule Review"),
        wordSpacer(50),
        wordFieldTable([["Description of schedule impact", report.schedule_review_description]]),
        wordSpacer(),

        wordSectionTitle("J. Supporting Documentation and Information"),
        wordSpacer(50),
        wordFieldTable([
          ["Supporting documentation / information", report.supporting_documentation_information],
        ]),
        wordSpacer(60),
        wordVariationOrderTable(report),
        wordSpacer(60),

        wordSectionTitle("Supporting Documents"),
        wordSpacer(50),
        wordTable(
          ["File Name", "Size", "Uploaded"],
          bundleAttachments.map((file) => [
            file.file_name,
            formatFileSize(file.file_size),
            formatDateTime(file.uploaded_at),
          ]),
          { columnWidths: [5600, 1300, 2460] }
        ),
        wordSpacer(),

        wordSectionTitle("K. Review and Endorsement"),
        wordSpacer(50),
        wordTable(
          ["Approve", "Inform", "Involved Party", "Name", "Position", "Approved", "Signature", "Date", "Comments"],
          bundle.reviewRows.map((row) => [
            wordCheckbox(row.approve_flag),
            wordCheckbox(row.inform_flag),
            row.involved_party,
            row.name,
            row.position,
            row.approved_value,
            wordSignatureValue(row.signature),
            wordDate(row.review_date),
            row.comments,
          ]),
          {
            columnWidths: [900, 800, 1260, 1160, 1160, 1080, 1120, 940, 940],
            headerFontSize: 15,
            bodyFontSize: 15,
            centerColumns: [0, 1, 5, 7],
          }
        ),
        wordSpacer(),

        wordSectionTitle("L. MOC Change Acceptance"),
        wordSpacer(50),
        wordTable(
          ["Role", "Name", "Position", "Signature", "Date"],
          bundle.acceptanceRows.map((row) => [
            row.role_label,
            row.name,
            row.position,
            wordSignatureValue(row.signature),
            wordDate(row.signoff_date),
          ]),
          { columnWidths: [3200, 1700, 1900, 1600, 960] }
        ),
        wordSpacer(),

        wordSectionTitle("M. MOC Close-Out Verification"),
        wordSpacer(50),
        wordTable(
          ["Role", "Name", "Position", "Signature", "Date"],
          bundle.closeoutRows.map((row) => [
            row.role_label,
            row.name,
            row.position,
            wordSignatureValue(row.signature),
            wordDate(row.signoff_date),
          ]),
          { columnWidths: [3200, 1700, 1900, 1600, 960] }
        ),
      ];

      const document = new WordDocument({
        styles: {
          default: {
            document: {
              run: {
                font: "Azo Sans",
                size: 18,
                color: "000000",
              },
            },
            title: {
              run: {
                font: "Azo Sans",
                size: 28,
                bold: true,
                color: "000000",
              },
            },
            heading1: {
              run: {
                font: "Azo Sans",
                size: 24,
                bold: true,
                color: "000000",
              },
            },
            heading2: {
              run: {
                font: "Azo Sans",
                size: 20,
                bold: true,
                color: "000000",
              },
            },
          },
        },
        sections: [
          {
            headers: { default: wordHeader(report, logoData) },
            footers: { default: wordFooter() },
            properties: {
              page: {
                margin: { top: 920, right: 720, bottom: 920, left: 720, header: 360, footer: 360 },
              },
            },
            children,
          },
        ],
      });

      const blob = await Packer.toBlob(document);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = `${report.moc_report_no || "MOC"}-${sanitizeFileName(report.moc_report_title || "Management-of-Change")}.docx`;
      link.click();
      URL.revokeObjectURL(url);
      showMessage(`Generated Word circulation copy for ${report.moc_report_no}.`, "success");
    } catch (error) {
      showMessage(`Word export failed: ${getErrorMessage(error)}`, "error");
    } finally {
      setGeneratingWord(false);
    }
  }

  async function generatePdfFor(reportId: string, preferCurrentDetail = false) {
    const bundle =
      preferCurrentDetail && detailReport.id === reportId
        ? buildCurrentDetailBundle()
        : getBundleFromData(reportId);

    if (!bundle) return;

    setGeneratingPdf(true);

    try {
      const doc = new jsPDF("p", "mm", "a4");
      const logoData = await getLogoDataUrl();
      const signatureValues = [
        ...bundle.reviewRows.map((row) => row.signature),
        ...bundle.acceptanceRows.map((row) => row.signature),
        ...bundle.closeoutRows.map((row) => row.signature),
      ].filter((value) => isDataImageUrl(value));
      const uniqueSignatureValues = Array.from(new Set(signatureValues));
      const signatureImageEntries = await Promise.all(
        uniqueSignatureValues.map(async (value) => {
          try {
            return [value, await loadImageMeta(value)] as const;
          } catch {
            return null;
          }
        })
      );
      const signatureImages = new Map<string, PdfImageMeta>(
        signatureImageEntries.filter((entry): entry is readonly [string, PdfImageMeta] => entry !== null)
      );
      const logoImage = logoData ? await loadImageMeta(logoData).catch(() => null) : null;

      pdfPageDecorator = (pdfDoc) => drawPdfPageChrome(pdfDoc, logoImage, bundle.report.moc_report_no);
      pdfPageDecorator(doc);
      let y = 28;
      y = drawReportDetails(doc, y, bundle);
      y = drawChangeIdentification(doc, y, bundle);
      y = drawActionPlan(doc, y, bundle);
      y = drawImpacts(doc, y, bundle);
      y = drawAffectedDocumentation(doc, y, bundle);
      y = drawRiskSection(doc, y, bundle);
      y = drawHazards(doc, y, bundle);
      y = drawCostSchedule(doc, y, bundle);
      y = drawSupportingDocs(doc, y, bundle);
      y = drawReviewSection(doc, y, bundle, signatureImages);
      y = drawAcceptance(doc, y, bundle, signatureImages);
      drawCloseout(doc, y, bundle, signatureImages);

      const pageCount = doc.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) {
        doc.setPage(page);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(83, 86, 90);
        doc.line(12, 288.5, 198, 288.5);
        doc.text("ENS-HSEQ-FRM-008 Management of Change Form Rev D", 12, 292);
        doc.text(`${page}/${pageCount}`, 198, 292, { align: "right" });
        doc.setTextColor(0, 0, 0);
      }

      doc.save(`${bundle.report.moc_report_no || "MOC"}-${bundle.report.moc_report_title || "Form"}.pdf`);
      showMessage(`Generated PDF for ${bundle.report.moc_report_no}.`, "success");
    } catch (error) {
      showMessage(getErrorMessage(error), "error");
    } finally {
      pdfPageDecorator = null;
      setGeneratingPdf(false);
    }
  }

  return (
    <main>
      <QualityPageHero
        label="QUALITY COMMAND CENTRE"
        title="Management of Change"
        description="Operational MOC register aligned to the controlled Enshore form structure, with full record editing and PDF generation from saved values."
        contextCards={[
          { label: "Last Refreshed", value: refreshStamp || "-" },
          { label: "Latest MOC", value: latestMocSummary },
        ]}
      />

      <ImsTopMetaRow
        backHref="/home"
        backLabel="Back to IMS Home"
        status={<><strong>Status:</strong> {message}</>}
      />

      <nav className="ims-tabs" style={mocViewNavStyle} aria-label="MOC workspace views" role="tablist">
        {[
          ["dashboard", "Dashboard"],
          ["register", "MOC Register"],
          ["create", "Create MOC"],
          ["reports", "Reports"],
        ].map(([view, label]) => (
          <button
            key={view}
            type="button"
            role="tab"
            aria-selected={activeView === view}
            data-active={activeView === view ? "true" : "false"}
            style={activeView === view ? activeViewButtonStyle : viewButtonStyle}
            onClick={() => switchMocWorkspaceView(view as MocWorkspaceView)}
          >
            {label}
          </button>
        ))}
      </nav>
      <datalist id="moc-people-options">
        {peopleNameOptions.map((personName) => (
          <option key={personName} value={personName} />
        ))}
      </datalist>

      {activeView === "dashboard" ? (
        <>
      <section className="quality-kpi-grid" style={kpiRowStyle}>
        <QualityKpiCard
          title="Active MOCs"
          value={openCount}
          accent="#FFAD00"
          onClick={() => applyMocDashboardFilter({ status: "Active" })}
        />
        <QualityKpiCard
          title="Temporary MOCs"
          value={temporaryCount}
          accent="#63B1BC"
          onClick={() => applyMocDashboardFilter({ changeType: "Temporary" })}
        />
        <QualityKpiCard
          title="In Review"
          value={inReviewCount}
          accent="#53565A"
          onClick={() => applyMocDashboardFilter({ status: "In Review" })}
        />
        <QualityKpiCard
          title="Approved MOCs"
          value={approvedCount}
          accent="#F93822"
          onClick={() => applyMocDashboardFilter({ status: "Approved" })}
        />
        <QualityKpiCard
          title="Expiry in 7 Days"
          value={expirySoonCount}
          accent="#000000"
          onClick={() => applyMocDashboardFilter({ view: "Expiry Soon" })}
        />
        <QualityKpiCard
          title="Recently Created"
          value={recentCount}
          accent="#005670"
          onClick={() => applyMocDashboardFilter({ view: "Recent" })}
        />
      </section>
      <section style={dashboardPanelGridStyle}>
        <SectionCard title="MOC Workload" subtitle="Quick operational split across live MOC states.">
          <div style={quickActionGridStyle}>
            <button type="button" style={quickActionCardStyle} onClick={() => applyMocDashboardFilter({ status: "Active" })}>
              <span style={quickActionLabelStyle}>Active</span>
              <strong style={quickActionValueStyle}>{openCount}</strong>
            </button>
            <button type="button" style={quickActionCardStyle} onClick={() => applyMocDashboardFilter({ status: "In Review" })}>
              <span style={quickActionLabelStyle}>In Review</span>
              <strong style={quickActionValueStyle}>{inReviewCount}</strong>
            </button>
            <button type="button" style={quickActionCardStyle} onClick={() => applyMocDashboardFilter({ status: "Approved" })}>
              <span style={quickActionLabelStyle}>Approved</span>
              <strong style={quickActionValueStyle}>{approvedCount}</strong>
            </button>
          </div>
        </SectionCard>

        <SectionCard title="Temporary Change Watch" subtitle="Temporary MOCs that need time-bound attention.">
          <div style={quickActionGridStyle}>
            <button type="button" style={quickActionCardStyle} onClick={() => applyMocDashboardFilter({ changeType: "Temporary" })}>
              <span style={quickActionLabelStyle}>Temporary</span>
              <strong style={quickActionValueStyle}>{temporaryCount}</strong>
            </button>
            <button type="button" style={quickActionCardStyle} onClick={() => applyMocDashboardFilter({ view: "Expiry Soon" })}>
              <span style={quickActionLabelStyle}>Expiry in 7 Days</span>
              <strong style={quickActionValueStyle}>{expirySoonCount}</strong>
            </button>
            <button type="button" style={quickActionCardStyle} onClick={() => applyMocDashboardFilter({ view: "Draft Ageing" })}>
              <span style={quickActionLabelStyle}>Draft Ageing</span>
              <strong style={quickActionValueStyle}>{reports.filter((report) => isDraftAged(report)).length}</strong>
            </button>
          </div>
        </SectionCard>
      </section>
      </>
      ) : null}

      {activeView === "create" ? (
      <section style={topGridStyle}>
          <SectionCard title="Create MOC" subtitle="Start a new Management of Change record and complete the full form below after creation.">
            <div style={starterFormGridStyle}>
              <Field label="MOC Report No.">
                <input value={nextMocNumber} readOnly style={readOnlyInputStyle} />
              </Field>

              <Field label="Status">
                <input value="Draft" readOnly style={readOnlyInputStyle} />
              </Field>

              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="MOC Report Title">
                  <input
                    value={starterForm.moc_report_title}
                    onChange={(e) => setStarterForm((prev) => ({ ...prev, moc_report_title: e.target.value }))}
                    style={inputStyle}
                    placeholder="Enter MOC report title"
                  />
                </Field>
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Project / Worksite Address">
                  <input
                    value={starterForm.project_worksite_address}
                    onChange={(e) => setStarterForm((prev) => ({ ...prev, project_worksite_address: e.target.value }))}
                    style={inputStyle}
                    placeholder="Project or worksite address"
                  />
                </Field>
              </div>

              <div style={starterAlignedRowStyle}>
                <Field label="MOC Co-Ordinator Name">
                  <PeopleNameInput
                    value={starterForm.moc_coordinator_name}
                    onChange={(e) => setStarterForm((prev) => ({ ...prev, moc_coordinator_name: e.target.value }))}
                    listId="moc-people-options"
                    placeholder="Select or type a name"
                  />
                </Field>

                <Field label="Responsible ENS Manager / Supervisor">
                  <PeopleNameInput
                    value={starterForm.responsible_manager_name}
                    onChange={(e) => setStarterForm((prev) => ({ ...prev, responsible_manager_name: e.target.value }))}
                    listId="moc-people-options"
                    placeholder="Select or type a name"
                  />
                </Field>

                <Field label="Change Type">
                  <div style={segmentedWrapWideStyle}>
                    {(["Permanent", "Temporary"] as ChangeType[]).map((option) => (
                      <button
                        key={option}
                        type="button"
                        style={{
                          ...segmentedButtonStyle,
                          ...segmentedButtonFillStyle,
                          background: starterForm.change_type === option ? "#005670" : "transparent",
                          color: starterForm.change_type === option ? "#ffffff" : "#000000",
                        }}
                        onClick={() => setStarterForm((prev) => ({ ...prev, change_type: option }))}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
            </div>

            <div style={buttonRowStyle}>
              <button
                type="button"
                style={primaryButtonStyle}
                onClick={() => void createMoc()}
                disabled={saving || !canCreateMoc}
              >
                {saving ? "Creating..." : "Create MOC"}
              </button>
              <button type="button" style={secondaryButtonStyle} onClick={() => setStarterForm(createStarterForm())}>
                Clear
              </button>
            </div>
          </SectionCard>
      </section>
      ) : null}

      {activeView === "register" ? (
      <section style={workspaceGridStyle}>
        <SectionCard title="MOC Register" subtitle="Main operational register for saved MOC reports. Click a row to open the full detail and edit panel.">
          <div className="ims-filter-panel" style={toolbarStyle}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={toolbarSearchStyle}
              placeholder="Search MOC number, title, project, coordinator or manager..."
            />

            <button
              type="button"
              onClick={() => setShowRegisterFilters((current) => !current)}
              style={showRegisterFilters ? secondaryButtonStyle : primaryButtonStyle}
            >
              {showRegisterFilters ? "Hide Filters" : "Show Filters"}
            </button>
          </div>

          {showRegisterFilters ? (
            <div className="ims-filter-panel" style={toolbarFiltersStyle}>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "All" | "Active" | MocStatus)}>
                <option value="All">All statuses</option>
                <option value="Active">Active</option>
                {mocStatusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <select
                value={changeTypeFilter}
                onChange={(e) => setChangeTypeFilter(e.target.value as "All" | ChangeType)}
                style={toolbarSelectStyle}
              >
                <option value="All">All change types</option>
                <option value="Permanent">Permanent</option>
                <option value="Temporary">Temporary</option>
              </select>
              <select
                value={viewFilter}
                onChange={(e) => setViewFilter(e.target.value as MocViewFilter)}
                style={toolbarSelectStyle}
              >
                {mocViewOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "Recent" ? "Recently Created" : option}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div style={tableInfoRowStyle}>
            Showing <strong>{filteredReports.length}</strong> of <strong>{reports.length}</strong> MOC records
          </div>

          {loading ? (
            <div style={emptyBoardStyle}>Loading MOC records...</div>
          ) : filteredReports.length === 0 ? (
            <div style={emptyBoardStyle}>
              {viewFilter === "Expired Temporary"
                ? "No expired temporary MOCs match the current filters."
                : viewFilter === "Expiry Soon"
                ? "No temporary MOCs nearing expiry match the current filters."
                : viewFilter === "Draft Ageing"
                ? "No draft MOCs older than 14 days match the current filters."
                : viewFilter === "Recent"
                ? "No recently created MOCs match the current filters."
                : "No MOC records match the current filters."}
            </div>
          ) : (
            <div className="ims-register-shell" style={registerTableWrapStyle}>
              <div className="ims-register-head" style={mocRegisterHeadStyle}>
                <div>MOC Report No.</div>
                <div>MOC Report Title</div>
                <div>Project / Worksite Address</div>
                <div>MOC Coordinator</div>
                <div>Responsible ENS Manager / Supervisor</div>
                <div>Change Type</div>
                <div>Status</div>
                <div>Created / Updated</div>
                <div>PDF</div>
              </div>

              <div style={registerBodyStyle}>
                {filteredReports.map((report) => {
                  const active = selectedReportId === report.id;
                  const statusTone = getStatusTone(report.status);
                  const typeTone = getChangeTypeTone(report.change_type);

                  return (
                    <button
                      className="ims-register-row"
                      aria-pressed={active}
                      data-selected={active ? "true" : "false"}
                      key={report.id}
                      type="button"
                      style={{
                        ...mocRegisterRowStyle,
                        background: active ? "#eef7f8" : "#ffffff",
                      }}
                      onClick={() => openBundle(report.id)}
                    >
                      <div style={registerSimpleTextStyle}>{report.moc_report_no}</div>
                      <div>
                        <div style={registerTitleStyle}>{report.moc_report_title || "Untitled MOC"}</div>
                        <div style={registerDescriptionStyle}>
                          {report.proposed_change_description || "No change description entered yet."}
                        </div>
                      </div>
                      <div style={registerSimpleTextStyle}>{report.project_worksite_address || "-"}</div>
                      <div style={registerSimpleTextStyle}>{report.moc_coordinator_name || "-"}</div>
                      <div style={registerSimpleTextStyle}>{report.responsible_manager_name || "-"}</div>
                      <div>
                        <span style={{ ...badgeStyle, background: typeTone.bg, color: typeTone.color }}>
                          {report.change_type}
                        </span>
                        {report.change_type === "Temporary" ? (
                          <div style={{ ...temporaryMetaStyle, ...getTemporaryValidityTone(report) }}>
                            {getTemporaryValidityLabel(report)}
                          </div>
                        ) : null}
                      </div>
                      <div>
                        <span style={{ ...badgeStyle, background: statusTone.bg, color: statusTone.color }}>
                          {report.status}
                        </span>
                      </div>
                      <div style={registerSimpleTextStyle}>{formatDateTime(buildRegisterUpdatedAt(report))}</div>
                      <div>
                        <button
                          type="button"
                          style={secondaryButtonSmall}
                          onClick={(event) => {
                            event.stopPropagation();
                            void generatePdfFor(report.id);
                          }}
                          disabled={generatingPdf}
                        >
                          PDF
                        </button>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </SectionCard>

        {selectedReport ? (
          <SectionCard title="Detail Panel" subtitle="Full MOC form editor. The saved record stays table-led, and this panel appears only when needed.">
            <div style={detailHeaderStyle}>
              <div>
                <div style={detailRecordNumberStyle}>{detailReport.moc_report_no}</div>
                <h3 style={detailRecordTitleStyle}>{detailReport.moc_report_title || "Untitled MOC"}</h3>
                <div style={detailWorkflowHintStyle}>{detailWorkflowMessage}</div>
              </div>
              <div style={detailHeaderActionsStyle}>
                <span
                  style={{
                    ...badgeStyle,
                    background: getStatusTone(detailReport.status).bg,
                    color: getStatusTone(detailReport.status).color,
                  }}
                >
                  {detailReport.status}
                </span>
                {nextWorkflowStatus ? (
                  <button
                    type="button"
                    style={workflowButtonStyle}
                    onClick={() => void progressSelectedMoc(nextWorkflowStatus)}
                    disabled={saving || !canEditMoc}
                  >
                    {getWorkflowButtonLabel(detailReport.status)}
                  </button>
                ) : null}
                <button
                  type="button"
                  style={secondaryButtonStyle}
                  onClick={hideDetailPanel}
                >
                  Hide Panel
                </button>
              </div>
            </div>

            <div style={subSectionStackStyle}>
              <DetailSubsection title="A. MOC REPORT DETAILS">
                <fieldset style={fieldsetResetStyle} disabled={!canEditCoreFields}>
                <div style={detailFormGridStyle}>
                  <Field label="MOC Report No.">
                    <input value={detailReport.moc_report_no} readOnly style={readOnlyInputStyle} />
                  </Field>
                  <Field label="Status">
                    <input value={detailReport.status} readOnly style={readOnlyInputStyle} />
                  </Field>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <Field label="MOC Report Title">
                      <input
                        value={detailReport.moc_report_title}
                        onChange={(e) => updateDetailField("moc_report_title", e.target.value)}
                        style={inputStyle}
                      />
                    </Field>
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <Field label="Project / Worksite Address">
                      <input
                        value={detailReport.project_worksite_address}
                        onChange={(e) => updateDetailField("project_worksite_address", e.target.value)}
                        style={inputStyle}
                      />
                    </Field>
                  </div>
                  <Field label="MOC Co-Ordinator Name">
                    <PeopleNameInput
                      value={detailReport.moc_coordinator_name}
                      onChange={(e) => updateDetailField("moc_coordinator_name", e.target.value)}
                      listId="moc-people-options"
                      placeholder="Select or type a name"
                    />
                  </Field>
                  <Field label="MOC Co-Ordinator Position">
                    <input
                      value={detailReport.moc_coordinator_position}
                      onChange={(e) => updateDetailField("moc_coordinator_position", e.target.value)}
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Responsible ENS Manager / Supervisor Name">
                    <PeopleNameInput
                      value={detailReport.responsible_manager_name}
                      onChange={(e) => updateDetailField("responsible_manager_name", e.target.value)}
                      listId="moc-people-options"
                      placeholder="Select or type a name"
                    />
                  </Field>
                  <Field label="Responsible ENS Manager / Supervisor Position">
                    <input
                      value={detailReport.responsible_manager_position}
                      onChange={(e) => updateDetailField("responsible_manager_position", e.target.value)}
                      style={inputStyle}
                    />
                  </Field>
                </div>
                </fieldset>
              </DetailSubsection>

              <DetailSubsection title="B. CHANGE IDENTIFICATION">
                <fieldset style={fieldsetResetStyle} disabled={!canEditCoreFields}>
                <div style={detailFormGridStyle}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <Field label="Description of the change (proposed change)">
                      <textarea
                        value={detailReport.proposed_change_description}
                        onChange={(e) => updateDetailField("proposed_change_description", e.target.value)}
                        style={textareaStyle}
                      />
                    </Field>
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <Field label="Reason for the change">
                      <textarea
                        value={detailReport.reason_for_change}
                        onChange={(e) => updateDetailField("reason_for_change", e.target.value)}
                        style={textareaStyle}
                      />
                    </Field>
                  </div>
                  <div style={detailChangeTypeRowStyle}>
                    <Field label="Is the change">
                      <div style={segmentedWrapWideStyle}>
                        {(["Permanent", "Temporary"] as ChangeType[]).map((option) => (
                          <button
                            key={option}
                            type="button"
                            style={{
                              ...segmentedButtonStyle,
                              ...segmentedButtonFillStyle,
                              background: detailReport.change_type === option ? "#005670" : "transparent",
                              color: detailReport.change_type === option ? "#ffffff" : "#000000",
                              opacity: canEditStructural ? 1 : 0.65,
                            }}
                            disabled={!canEditStructural}
                            onClick={() => updateDetailField("change_type", option)}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </Field>
                    <div style={detailTemporaryDatesStyle}>
                      <Field label="If Temporary, From">
                        <input
                          type="date"
                          value={detailReport.temporary_valid_from}
                          onChange={(e) => updateDetailField("temporary_valid_from", e.target.value)}
                          style={inputStyle}
                        />
                      </Field>
                      <Field label="If Temporary, To">
                        <input
                          type="date"
                          value={detailReport.temporary_valid_to}
                          onChange={(e) => updateDetailField("temporary_valid_to", e.target.value)}
                          style={inputStyle}
                        />
                      </Field>
                    </div>
                  </div>
                  {detailReport.change_type === "Temporary" ? (
                    <div style={detailTemporaryHintStyle}>
                      {getTemporaryValidityLabel(detailReport) || "Set temporary validity dates to track expiry."}
                    </div>
                  ) : null}
                  <div style={{ gridColumn: "1 / -1" }}>
                    <Field label="How will the change be implemented?">
                      <textarea
                        value={detailReport.implementation_plan}
                        onChange={(e) => updateDetailField("implementation_plan", e.target.value)}
                        style={textareaStyle}
                      />
                    </Field>
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <Field label="Supporting documentation note / field">
                      <textarea
                        value={detailReport.supporting_documentation_note}
                        onChange={(e) => updateDetailField("supporting_documentation_note", e.target.value)}
                        style={textareaStyle}
                      />
                    </Field>
                  </div>
                </div>
                </fieldset>
              </DetailSubsection>

              <DetailSubsection title="C. ACTION PLAN">
                <fieldset style={fieldsetResetStyle} disabled={!canEditImplementationFields}>
                <div style={actionPlanIntroStyle}>
                  <div>
                    <strong style={actionPlanIntroTitleStyle}>MOC implementation actions</strong>
                    <span style={actionPlanIntroTextStyle}>
                      Keep immediate MOC steps here. Send any item that needs wider tracking to central Action Management for ownership, reminders, and reporting.
                    </span>
                  </div>
                </div>
                <RepeatTableToolbar
                  onAdd={addActionRow}
                  label="Add Action Row"
                  disabled={!canEditImplementationStructure}
                />
                <div style={repeatCardStackStyle}>
                  {detailActionItems.map((row, index) => (
                    <div key={`${row.id || "new"}-${index}`} style={repeatCardStyle}>
                      <div style={repeatCardHeaderStyle}>
                        <div>
                          <div style={repeatCardKickerStyle}>Action item</div>
                          <div style={actionPlanCardTitleRowStyle}>
                            <span style={repeatCardTitleStyle}>{row.action_no || `Action ${index + 1}`}</span>
                            <span style={{ ...badgeStyle, ...getActionPlanStatusTone(normaliseActionPlanStatus(row.status)) }}>
                              {normaliseActionPlanStatus(row.status)}
                            </span>
                          </div>
                        </div>
                        <div style={rowActionsWrapStyle}>
                          <Link
                            href={buildMocActionPlanLinkedActionHref(detailReport, row)}
                            style={centralActionLinkStyle}
                          >
                            Create Central Action
                          </Link>
                          <RowOrderControls
                            index={index}
                            total={detailActionItems.length}
                            onMove={(direction) => moveActionRow(index, direction)}
                            disabled={!canEditImplementationStructure}
                          />
                          <button
                            type="button"
                            style={removeRowButtonStyle}
                            onClick={() => removeActionRow(index)}
                            disabled={!canEditImplementationStructure}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <div style={actionPlanSummaryStyle}>
                        <div>
                          <span style={miniMetaLabelStyle}>Owner</span>
                          <strong style={miniMetaValueStyle}>{row.responsible_person || "-"}</strong>
                        </div>
                        <div>
                          <span style={miniMetaLabelStyle}>Target</span>
                          <strong style={miniMetaValueStyle}>{formatDate(row.target_date)}</strong>
                        </div>
                        <div>
                          <span style={miniMetaLabelStyle}>Central tracking</span>
                          <strong style={miniMetaValueStyle}>Review before save in Action Management</strong>
                        </div>
                      </div>
                      <div style={actionPlanCardGridStyle}>
                        <Field label="Action No.">
                          <input value={row.action_no} readOnly style={readOnlyInputStyle} />
                        </Field>
                        <Field label="Responsible Person">
                          <PeopleNameInput
                            value={row.responsible_person}
                            onChange={(e) => updateActionRow(index, "responsible_person", e.target.value)}
                            listId="moc-people-options"
                            placeholder="Responsible person"
                          />
                        </Field>
                        <Field label="Target Date">
                          <input
                            type="date"
                            value={row.target_date}
                            onChange={(e) => updateActionRow(index, "target_date", e.target.value)}
                            style={inputStyle}
                          />
                        </Field>
                        <Field label="Status">
                          <select
                            value={normaliseActionPlanStatus(row.status)}
                            onChange={(e) => updateActionRow(index, "status", e.target.value)}
                            style={inputStyle}
                          >
                            {actionPlanStatusOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <div style={{ gridColumn: "1 / -1" }}>
                          <Field label="Description of Action">
                            <textarea
                              value={row.description}
                              onChange={(e) => updateActionRow(index, "description", e.target.value)}
                              style={textareaStyle}
                            />
                          </Field>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                </fieldset>
              </DetailSubsection>

              <DetailSubsection title="D. CHANGE IMPACT">
                <fieldset style={fieldsetResetStyle} disabled={!canEditCoreFields}>
                <div style={impactGridStyle}>
                  <ImpactToggle
                    label="Health & Safety"
                    checked={detailReport.impact_health_safety}
                    onToggle={() => toggleImpactField("impact_health_safety")}
                  />
                  <ImpactToggle
                    label="Environment"
                    checked={detailReport.impact_environment}
                    onToggle={() => toggleImpactField("impact_environment")}
                  />
                  <ImpactToggle
                    label="Quality"
                    checked={detailReport.impact_quality}
                    onToggle={() => toggleImpactField("impact_quality")}
                  />
                  <ImpactToggle label="SCM" checked={detailReport.impact_scm} onToggle={() => toggleImpactField("impact_scm")} />
                  <ImpactToggle
                    label="Schedule"
                    checked={detailReport.impact_schedule}
                    onToggle={() => toggleImpactField("impact_schedule")}
                  />
                  <ImpactToggle
                    label="Equipment"
                    checked={detailReport.impact_equipment}
                    onToggle={() => toggleImpactField("impact_equipment")}
                  />
                  <ImpactToggle
                    label="Fabrication Opps"
                    checked={detailReport.impact_fabrication_opps}
                    onToggle={() => toggleImpactField("impact_fabrication_opps")}
                  />
                  <ImpactToggle
                    label="Engineering"
                    checked={detailReport.impact_engineering}
                    onToggle={() => toggleImpactField("impact_engineering")}
                  />
                  <ImpactToggle
                    label="Marine operations"
                    checked={detailReport.impact_marine_operations}
                    onToggle={() => toggleImpactField("impact_marine_operations")}
                  />
                  <ImpactToggle
                    label="Organization"
                    checked={detailReport.impact_organization}
                    onToggle={() => toggleImpactField("impact_organization")}
                  />
                  <ImpactToggle
                    label="Regulatory"
                    checked={detailReport.impact_regulatory}
                    onToggle={() => toggleImpactField("impact_regulatory")}
                  />
                  <ImpactToggle
                    label="Documentation"
                    checked={detailReport.impact_documentation}
                    onToggle={() => toggleImpactField("impact_documentation")}
                  />
                  <ImpactToggle
                    label="Reputation"
                    checked={detailReport.impact_reputation}
                    onToggle={() => toggleImpactField("impact_reputation")}
                  />
                  <ImpactToggle
                    label="SIMOPS"
                    checked={detailReport.impact_simops}
                    onToggle={() => toggleImpactField("impact_simops")}
                  />
                  <ImpactToggle
                    label="Other"
                    checked={detailReport.impact_other}
                    onToggle={() => toggleImpactField("impact_other")}
                  />
                </div>

                {detailReport.impact_other ? (
                  <div style={{ marginTop: 12 }}>
                    <Field label="Other (specify)">
                      <input
                        value={detailReport.impact_other_text}
                        onChange={(e) => updateDetailField("impact_other_text", e.target.value)}
                        style={inputStyle}
                      />
                    </Field>
                  </div>
                ) : null}
                </fieldset>
              </DetailSubsection>

              <DetailSubsection title="E. AFFECTED DOCUMENTATION">
                <fieldset style={fieldsetResetStyle} disabled={!canEditCoreFields}>
                <RepeatTableToolbar onAdd={addAffectedDocumentRow} label="Add Document Row" disabled={!canEditStructural} />
                <SimpleDocumentTable
                  rows={detailAffectedDocuments}
                  onChange={updateAffectedDocumentRow}
                  onRemove={removeAffectedDocumentRow}
                  onMove={moveAffectedDocumentRow}
                  disabled={!canEditStructural}
                />
                </fieldset>
              </DetailSubsection>

              <DetailSubsection title="F. RISK MANAGEMENT">
                <fieldset style={fieldsetResetStyle} disabled={!canEditCoreFields}>
                <RepeatTableToolbar onAdd={addRiskDocumentRow} label="Add Risk Document Row" disabled={!canEditStructural} />
                <SimpleDocumentTable
                  rows={detailRiskDocuments}
                  onChange={updateRiskDocumentRow}
                  onRemove={removeRiskDocumentRow}
                  onMove={moveRiskDocumentRow}
                  disabled={!canEditStructural}
                />

                <div style={{ marginTop: 16 }} />
                <div style={detailFormGridStyle}>
                  <Field label="Is a HIRA required?">
                    <select
                      value={detailReport.hira_required}
                      onChange={(e) => updateDetailField("hira_required", e.target.value as YesNoNa)}
                      style={inputStyle}
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                      <option value="N/A">N/A</option>
                    </select>
                  </Field>
                  <Field label="If No, give reasons why">
                    <input
                      value={detailReport.hira_reason}
                      onChange={(e) => updateDetailField("hira_reason", e.target.value)}
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Change in lifting philosophy?">
                    <select
                      value={detailReport.lifting_change_status}
                      onChange={(e) => updateDetailField("lifting_change_status", e.target.value as YesNoNa)}
                      style={inputStyle}
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                      <option value="N/A">N/A</option>
                    </select>
                  </Field>
                  <Field label="Describe change">
                    <input
                      value={detailReport.lifting_change_description}
                      onChange={(e) => updateDetailField("lifting_change_description", e.target.value)}
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Change in PTW philosophy?">
                    <select
                      value={detailReport.ptw_change_status}
                      onChange={(e) => updateDetailField("ptw_change_status", e.target.value as YesNoNa)}
                      style={inputStyle}
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                      <option value="N/A">N/A</option>
                    </select>
                  </Field>
                  <Field label="Describe change">
                    <input
                      value={detailReport.ptw_change_description}
                      onChange={(e) => updateDetailField("ptw_change_description", e.target.value)}
                      style={inputStyle}
                    />
                  </Field>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <Field label="Environmental Impact (Describe)">
                      <textarea
                        value={detailReport.environmental_impact_description}
                        onChange={(e) => updateDetailField("environmental_impact_description", e.target.value)}
                        style={textareaStyle}
                      />
                    </Field>
                  </div>
                </div>
                </fieldset>
              </DetailSubsection>

              <DetailSubsection title="G. HAZARDS & MITIGATING ACTIONS">
                <fieldset style={fieldsetResetStyle} disabled={!canEditImplementationFields}>
                <div style={detailFormGridStyle}>
                  <div>
                    <Field label="Describe potential Hazards & Risks">
                      <textarea
                        value={detailReport.hazard_risks_description}
                        onChange={(e) => updateDetailField("hazard_risks_description", e.target.value)}
                        style={tallTextareaStyle}
                      />
                    </Field>
                  </div>
                  <div>
                    <Field label="Proposed Risk Mitigations">
                      <textarea
                        value={detailReport.proposed_risk_mitigations}
                        onChange={(e) => updateDetailField("proposed_risk_mitigations", e.target.value)}
                        style={tallTextareaStyle}
                      />
                    </Field>
                  </div>
                </div>
                </fieldset>
              </DetailSubsection>

              <DetailSubsection title="H. COST REVIEW">
                <fieldset style={fieldsetResetStyle} disabled={!canEditImplementationFields}>
                <Field label="Description of cost impact (incl. future savings)">
                  <textarea
                    value={detailReport.cost_review_description}
                    onChange={(e) => updateDetailField("cost_review_description", e.target.value)}
                    style={textareaStyle}
                  />
                </Field>
                </fieldset>
              </DetailSubsection>

              <DetailSubsection title="I. SCHEDULE REVIEW">
                <fieldset style={fieldsetResetStyle} disabled={!canEditImplementationFields}>
                <Field label="Description of the schedule impact (incl. future savings)">
                  <textarea
                    value={detailReport.schedule_review_description}
                    onChange={(e) => updateDetailField("schedule_review_description", e.target.value)}
                    style={textareaStyle}
                  />
                </Field>
                </fieldset>
              </DetailSubsection>

              <DetailSubsection title="J. SUPPORTING DOCUMENTATION AND INFORMATION">
                <fieldset style={fieldsetResetStyle} disabled={!canEditImplementationFields}>
                <div style={detailFormGridStyle}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <Field label="Supporting documentation and information">
                      <textarea
                        value={detailReport.supporting_documentation_information}
                        onChange={(e) => updateDetailField("supporting_documentation_information", e.target.value)}
                        style={tallTextareaStyle}
                      />
                    </Field>
                  </div>
                  <Field label="Variation Order Reference No.">
                    <input
                      value={detailReport.variation_order_reference_no}
                      onChange={(e) => updateDetailField("variation_order_reference_no", e.target.value)}
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="N/A">
                    <label style={checkToggleStyle}>
                      <input
                        type="checkbox"
                        checked={detailReport.variation_order_na}
                        onChange={() => updateDetailField("variation_order_na", !detailReport.variation_order_na)}
                      />
                      <span>Variation order not applicable</span>
                    </label>
                  </Field>
                </div>
                </fieldset>
              </DetailSubsection>

              <DetailSubsection title="Supporting Documents">
                <div style={attachmentSectionIntroStyle}>
                  Upload and manage MOC-specific supporting files such as procedures, drawings, HIRAs, client documents, screenshots, or implementation evidence.
                </div>

                <div style={attachmentToolbarStyle}>
                  <label
                    htmlFor="moc-attachment-upload"
                    style={{
                      ...secondaryButtonStyle,
                      opacity: uploadingAttachments || !canManageAttachments ? 0.6 : 1,
                      cursor: uploadingAttachments || !canManageAttachments ? "not-allowed" : "pointer",
                    }}
                  >
                    {uploadingAttachments ? "Uploading..." : "Upload Document"}
                    <input
                      id="moc-attachment-upload"
                      type="file"
                      multiple
                      accept={allowedMocAttachmentExtensions.join(",")}
                      onChange={(event) => void handleAttachmentUpload(event)}
                      style={hiddenFileInputStyle}
                      disabled={uploadingAttachments || !canManageAttachments}
                    />
                  </label>
                  <div style={attachmentToolbarHintStyle}>
                    {canManageAttachments
                      ? "Files remain attached to this MOC record and can be opened or removed here."
                      : "Closed MOCs are read-only. Supporting documents can still be viewed."}
                  </div>
                </div>

                {selectedReportAttachments.length === 0 ? (
                  <div style={attachmentEmptyStateStyle}>No supporting documents uploaded for this MOC yet.</div>
                ) : (
                  <div style={attachmentListStyle}>
                    {selectedReportAttachments.map((file) => (
                      <div key={file.id} style={attachmentRowStyle}>
                        <div style={{ minWidth: 0 }}>
                          <div style={attachmentFileNameStyle}>{file.file_name}</div>
                          <div style={attachmentMetaStyle}>
                            {formatFileSize(file.file_size)} | {file.content_type || "Unknown type"} | Uploaded{" "}
                            {formatDateTime(file.uploaded_at)}
                          </div>
                        </div>
                        <div style={attachmentActionsStyle}>
                          <button
                            type="button"
                            style={secondaryButtonSmall}
                            onClick={() => void openAttachment(file)}
                            disabled={attachmentActionId === file.id}
                          >
                            Open / Download
                          </button>
                          <button
                            type="button"
                            style={removeRowButtonStyle}
                            onClick={() => void removeAttachment(file)}
                            disabled={!canManageAttachments || attachmentActionId === file.id}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </DetailSubsection>

              <DetailSubsection title="K. REVIEW AND ENDORSEMENT">
                <fieldset style={fieldsetResetStyle} disabled={!canEditReviewSections}>
                <RepeatTableToolbar onAdd={addReviewRow} label="Add Review Row" disabled={!canEditStructural} />
                <div style={repeatCardStackStyle}>
                  {detailReviewRows.map((row, index) => (
                    <div key={`${row.id || "new"}-${index}`} style={repeatCardStyle}>
                      <div style={repeatCardHeaderStyle}>
                        <div>
                          <div style={repeatCardKickerStyle}>Review / endorsement</div>
                          <div style={repeatCardTitleStyle}>{row.involved_party || `Review row ${index + 1}`}</div>
                        </div>
                        <div style={rowActionsWrapStyle}>
                          <RowOrderControls
                            index={index}
                            total={detailReviewRows.length}
                            onMove={(direction) => moveReviewRow(index, direction)}
                            disabled={!canEditStructural}
                          />
                          <button
                            type="button"
                            style={removeRowButtonStyle}
                            onClick={() => removeReviewRow(index)}
                            disabled={!canEditStructural}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <div style={reviewIntentGridStyle}>
                        <label style={reviewChoiceStyle}>
                          <input
                            type="checkbox"
                            checked={row.approve_flag}
                            onChange={(e) => updateReviewRow(index, "approve_flag", e.target.checked)}
                          />
                          <span>Approve</span>
                        </label>
                        <label style={reviewChoiceStyle}>
                          <input
                            type="checkbox"
                            checked={row.inform_flag}
                            onChange={(e) => updateReviewRow(index, "inform_flag", e.target.checked)}
                          />
                          <span>Inform</span>
                        </label>
                      </div>
                      <div style={reviewCardGridStyle}>
                        <Field label="Involved Party">
                          <input
                            value={row.involved_party}
                            onChange={(e) => updateReviewRow(index, "involved_party", e.target.value)}
                            style={inputStyle}
                          />
                        </Field>
                        <Field label="Name">
                          <PeopleNameInput
                            value={row.name}
                            onChange={(e) => updateReviewRow(index, "name", e.target.value)}
                            listId="moc-people-options"
                            placeholder="Select or type a name"
                          />
                        </Field>
                        <Field label="Position">
                          <input
                            value={row.position}
                            onChange={(e) => updateReviewRow(index, "position", e.target.value)}
                            style={inputStyle}
                          />
                        </Field>
                        <Field label="Approved">
                          <select
                            value={row.approved_value}
                            onChange={(e) => updateReviewRow(index, "approved_value", e.target.value as ApprovedChoice)}
                            style={inputStyle}
                          >
                            <option value="">Select</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        </Field>
                        <Field label="Date">
                          <input
                            type="date"
                            value={row.review_date}
                            onChange={(e) => updateReviewRow(index, "review_date", e.target.value)}
                            style={inputStyle}
                          />
                        </Field>
                        <div style={{ gridColumn: "1 / -1" }}>
                          <Field label="Signature">
                            <SignatureFieldInput
                              value={row.signature}
                              onTextChange={(value) => updateReviewRow(index, "signature", value)}
                              onFileSelect={(file) => uploadReviewSignature(index, file)}
                              inputId={`moc-review-signature-${index}`}
                              disabled={!canEditReviewSections}
                            />
                          </Field>
                        </div>
                        <div style={{ gridColumn: "1 / -1" }}>
                          <Field label="Comments">
                            <textarea
                              value={row.comments}
                              onChange={(e) => updateReviewRow(index, "comments", e.target.value)}
                              style={reviewCommentsStyle}
                              placeholder="Add review comments"
                            />
                          </Field>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                </fieldset>
              </DetailSubsection>

              <DetailSubsection title="L. MOC CHANGE ACCEPTANCE">
                <fieldset style={fieldsetResetStyle} disabled={!canEditReviewSections}>
                <RepeatTableToolbar onAdd={addAcceptanceRow} label="Add Acceptance Row" disabled={!canEditStructural} />
                <SimpleSignoffTable
                  rows={detailAcceptanceRows}
                  onChange={updateAcceptanceRow}
                  onRemove={removeAcceptanceRow}
                  onMove={moveAcceptanceRow}
                  onSignatureUpload={uploadAcceptanceSignature}
                  disabled={!canEditReviewSections}
                  inputIdPrefix="moc-acceptance-signature"
                  peopleListId="moc-people-options"
                />
                </fieldset>
              </DetailSubsection>

              <DetailSubsection title="M. MOC CLOSE-OUT VERIFICATION">
                <fieldset style={fieldsetResetStyle} disabled={!canEditCloseout}>
                <RepeatTableToolbar
                  onAdd={addCloseoutRow}
                  label="Add Close-Out Row"
                  disabled={!canEditCloseoutStructure}
                />
                <SimpleSignoffTable
                  rows={detailCloseoutRows}
                  onChange={updateCloseoutRow}
                  onRemove={removeCloseoutRow}
                  onMove={moveCloseoutRow}
                  onSignatureUpload={uploadCloseoutSignature}
                  disabled={!canEditCloseoutStructure}
                  inputIdPrefix="moc-closeout-signature"
                  peopleListId="moc-people-options"
                />
                </fieldset>
              </DetailSubsection>
            </div>

            <div style={detailButtonRowStyle}>
              <button
                type="button"
                style={primaryButtonStyle}
                onClick={() => void saveSelectedMoc()}
                disabled={saving || !canSaveDetail}
              >
                {saving ? "Saving..." : "Save MOC"}
              </button>
              <button
                type="button"
                style={secondaryButtonStyle}
                onClick={() => void generatePdfFor(selectedReportId, true)}
                disabled={generatingPdf}
              >
                {generatingPdf ? "Generating PDF..." : "Generate PDF"}
              </button>
              <button
                type="button"
                style={secondaryButtonStyle}
                onClick={() => void generateWordFor(selectedReportId, true)}
                disabled={generatingWord}
              >
                {generatingWord ? "Generating Word..." : "Generate Word"}
              </button>
              <Link
                href={buildMocLinkedActionHref(detailReport)}
                style={{ ...secondaryButtonStyle, border: "1px solid #D0D0CE", color: "#005670", textDecoration: "none" }}
              >
                Generate Linked Action
              </Link>
              <button
                type="button"
                style={dangerButtonStyle}
                onClick={() => void deleteSelectedMoc()}
                disabled={saving || !canEditMoc}
              >
                Delete
              </button>
            </div>
          </SectionCard>
        ) : null}
      </section>
      ) : null}

      {activeView === "reports" ? (
        <section style={reportsGridStyle}>
          <SectionCard title="MOC Reports" subtitle="Generate controlled MOC PDF outputs from saved records.">
            <div style={reportActionGridStyle}>
              {reports.length === 0 ? (
                <div style={emptyBoardStyle}>No MOC records are available for reporting.</div>
              ) : (
                reports.slice(0, 12).map((report) => (
                  <button
                    key={report.id}
                    type="button"
                    style={reportActionCardStyle}
                    onClick={() => void generatePdfFor(report.id, selectedReportId === report.id)}
                    disabled={generatingPdf}
                  >
                    <span style={reportActionLabelStyle}>{report.moc_report_no || "MOC"}</span>
                    <strong style={reportActionTitleStyle}>{report.moc_report_title || "Untitled MOC"}</strong>
                    <span style={reportActionHintStyle}>
                      {report.status} | {report.change_type} | {formatDateTime(buildRegisterUpdatedAt(report))}
                    </span>
                  </button>
                ))
              )}
            </div>
          </SectionCard>
        </section>
      ) : null}
    </main>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <section style={panelStyle}>
      <div style={sectionHeaderStyle}>
        <h2 style={sectionTitleStyle}>{title}</h2>
        {subtitle ? <p style={sectionSubtitleStyle}>{subtitle}</p> : null}
      </div>
      {children || null}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </label>
  );
}

function DetailSubsection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={detailSectionStyle}>
      <div style={detailSectionTitleStyle}>{title}</div>
      {children}
    </div>
  );
}

function RepeatTableToolbar({ onAdd, label, disabled }: { onAdd: () => void; label: string; disabled?: boolean }) {
  return (
    <div style={repeatToolbarStyle}>
      <button type="button" style={secondaryButtonStyle} onClick={onAdd} disabled={disabled}>
        {label}
      </button>
    </div>
  );
}

function RowOrderControls({
  index,
  total,
  onMove,
  disabled,
}: {
  index: number;
  total: number;
  onMove: (direction: -1 | 1) => void;
  disabled?: boolean;
}) {
  return (
    <div style={rowActionsStyle}>
      <button type="button" style={rowMoveButtonStyle} onClick={() => onMove(-1)} disabled={disabled || index === 0}>
        Up
      </button>
      <button type="button" style={rowMoveButtonStyle} onClick={() => onMove(1)} disabled={disabled || index === total - 1}>
        Down
      </button>
    </div>
  );
}

function ImpactToggle({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      style={{
        ...impactToggleStyle,
        background: checked ? "#ECECE7" : "#ffffff",
        borderColor: checked ? "#005670" : "#D0D0CE",
      }}
      onClick={onToggle}
    >
      <span style={{ ...impactCheckboxStyle, background: checked ? "#005670" : "#ffffff", color: checked ? "#ffffff" : "#000000" }}>
        {checked ? "x" : ""}
      </span>
      <span>{label}</span>
    </button>
  );
}

function PeopleNameInput({
  value,
  onChange,
  listId,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  listId: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={onChange}
      list={listId}
      style={inputStyle}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}

function SignatureFieldInput({
  value,
  onTextChange,
  onFileSelect,
  inputId,
  disabled,
}: {
  value: string;
  onTextChange: (value: string) => void;
  onFileSelect: (file: File | null) => void;
  inputId: string;
  disabled?: boolean;
}) {
  const usingImage = isDataImageUrl(value);

  return (
    <div style={signatureFieldStackStyle}>
      <input
        value={usingImage ? "" : value}
        onChange={(e) => onTextChange(e.target.value)}
        style={inputStyle}
        placeholder={usingImage ? "Signature image stored" : "Typed signature / approval note"}
      />
      {usingImage ? (
        <div style={signaturePreviewStyle}>
          <Image
            src={value}
            alt="Stored signature preview"
            width={64}
            height={28}
            unoptimized
            style={signatureImageThumbStyle}
          />
          <span style={signaturePreviewTextStyle}>Image attached</span>
        </div>
      ) : (
        <div style={signatureHintStyle}>Typed text is saved, or upload an image for the PDF.</div>
      )}
      <div style={signatureFieldActionsStyle}>
        <input
          id={inputId}
          type="file"
          accept="image/*"
          onChange={(e) => {
            onFileSelect(e.target.files?.[0] || null);
            e.currentTarget.value = "";
          }}
          style={hiddenFileInputStyle}
          disabled={disabled}
        />
        <label
          htmlFor={inputId}
          style={{
            ...signatureButtonStyle,
            opacity: disabled ? 0.55 : 1,
            cursor: disabled ? "not-allowed" : "pointer",
          }}
        >
          {usingImage ? "Replace Signature" : "Upload Signature"}
        </label>
        {usingImage ? (
          <button type="button" style={rowMoveButtonStyle} onClick={() => onTextChange("")} disabled={disabled}>
            Clear Signature
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SimpleDocumentTable({
  rows,
  onChange,
  onRemove,
  onMove,
  disabled,
}: {
  rows: MocDocumentRow[];
  onChange: (index: number, key: keyof MocDocumentRow, value: string) => void;
  onRemove: (index: number) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  disabled?: boolean;
}) {
  return (
    <div style={repeatCardStackStyle}>
      {rows.map((row, index) => (
        <div key={`${row.id || "new"}-${index}`} style={compactRepeatCardStyle}>
          <div style={repeatCardHeaderStyle}>
            <div>
              <div style={repeatCardKickerStyle}>Document row</div>
              <div style={repeatCardTitleStyle}>{row.number || `Document ${index + 1}`}</div>
            </div>
            <div style={rowActionsWrapStyle}>
              <RowOrderControls
                index={index}
                total={rows.length}
                onMove={(direction) => onMove(index, direction)}
                disabled={disabled}
              />
              <button type="button" style={removeRowButtonStyle} onClick={() => onRemove(index)} disabled={disabled}>
                Remove
              </button>
            </div>
          </div>
          <div style={documentCardGridStyle}>
            <Field label="Number">
              <input value={row.number} onChange={(e) => onChange(index, "number", e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Title">
              <input value={row.title} onChange={(e) => onChange(index, "title", e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Rev.">
              <input value={row.rev} onChange={(e) => onChange(index, "rev", e.target.value)} style={inputStyle} />
            </Field>
          </div>
        </div>
      ))}
    </div>
  );
}

function SimpleSignoffTable({
  rows,
  onChange,
  onRemove,
  onMove,
  onSignatureUpload,
  disabled,
  inputIdPrefix,
  peopleListId,
}: {
  rows: MocSignoffRow[];
  onChange: (index: number, key: keyof MocSignoffRow, value: string | number) => void;
  onRemove: (index: number) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onSignatureUpload: (index: number, file: File | null) => void;
  disabled?: boolean;
  inputIdPrefix: string;
  peopleListId: string;
}) {
  return (
    <div style={repeatCardStackStyle}>
      {rows.map((row, index) => (
        <div key={`${row.id || "new"}-${index}`} style={repeatCardStyle}>
          <div style={repeatCardHeaderStyle}>
            <div>
              <div style={repeatCardKickerStyle}>Signoff row</div>
              <div style={repeatCardTitleStyle}>{row.role_label || `Signoff ${index + 1}`}</div>
            </div>
            <div style={rowActionsWrapStyle}>
              <RowOrderControls
                index={index}
                total={rows.length}
                onMove={(direction) => onMove(index, direction)}
                disabled={disabled}
              />
              <button type="button" style={removeRowButtonStyle} onClick={() => onRemove(index)} disabled={disabled}>
                Remove
              </button>
            </div>
          </div>
          <div style={signoffCardGridStyle}>
            <Field label="Role">
              <input value={row.role_label} onChange={(e) => onChange(index, "role_label", e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Name">
              <PeopleNameInput
                value={row.name}
                onChange={(e) => onChange(index, "name", e.target.value)}
                listId={peopleListId}
                placeholder="Select or type a name"
                disabled={disabled}
              />
            </Field>
            <Field label="Position">
              <input value={row.position} onChange={(e) => onChange(index, "position", e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Date">
              <input
                type="date"
                value={row.signoff_date}
                onChange={(e) => onChange(index, "signoff_date", e.target.value)}
                style={inputStyle}
              />
            </Field>
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Signature">
                <SignatureFieldInput
                  value={row.signature}
                  onTextChange={(value) => onChange(index, "signature", value)}
                  onFileSelect={(file) => onSignatureUpload(index, file)}
                  inputId={`${inputIdPrefix}-${index}`}
                  disabled={disabled}
                />
              </Field>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


const topGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: "18px",
  marginBottom: "20px",
};

const workspaceGridStyle: CSSProperties = {
  display: "grid",
  gap: "20px",
};

const kpiRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: "12px",
  marginBottom: "18px",
};

const mocViewNavStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginBottom: "20px",
};

const viewButtonStyle: CSSProperties = {
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

const activeViewButtonStyle: CSSProperties = {
  ...viewButtonStyle,
  background: "#005670",
  color: "#ffffff",
};

const dashboardPanelGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "16px",
  marginBottom: "20px",
};

const quickActionGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "12px",
};

const quickActionCardStyle: CSSProperties = {
  border: "1px solid #D0D0CE",
  background: "#ECECE7",
  borderRadius: "14px",
  padding: "14px",
  cursor: "pointer",
  textAlign: "left",
  display: "grid",
  gap: "6px",
};

const quickActionLabelStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 800,
  color: "#53565A",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const quickActionValueStyle: CSSProperties = {
  fontSize: "28px",
  color: "#000000",
  lineHeight: 1,
};

const reportsGridStyle: CSSProperties = {
  display: "grid",
  gap: "16px",
  marginBottom: "20px",
};

const reportActionGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "12px",
};

const reportActionCardStyle: CSSProperties = {
  ...quickActionCardStyle,
  minHeight: "150px",
};

const reportActionLabelStyle: CSSProperties = {
  ...quickActionLabelStyle,
};

const reportActionTitleStyle: CSSProperties = {
  fontSize: "18px",
  color: "#000000",
  lineHeight: 1.25,
};

const reportActionHintStyle: CSSProperties = {
  color: "#53565A",
  fontSize: "13px",
  lineHeight: 1.45,
};

const panelStyle: CSSProperties = {
  background: "white",
  borderRadius: "18px",
  padding: "20px",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
};

const sectionHeaderStyle: CSSProperties = {
  marginBottom: "16px",
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

const detailFormGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "12px",
};

const detailChangeTypeRowStyle: CSSProperties = {
  gridColumn: "1 / -1",
  display: "grid",
  gridTemplateColumns: "minmax(220px, 1.05fr) minmax(280px, 0.95fr)",
  gap: "12px",
  alignItems: "end",
};

const starterFormGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "12px",
};

const starterAlignedRowStyle: CSSProperties = {
  gridColumn: "1 / -1",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) minmax(220px, 0.9fr)",
  gap: "12px",
  alignItems: "end",
};

const detailTemporaryDatesStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "12px",
  alignItems: "end",
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #D0D0CE",
  background: "#ffffff",
  outline: "none",
  fontSize: 14,
  color: "#000000",
  boxSizing: "border-box",
};

const readOnlyInputStyle: CSSProperties = {
  ...inputStyle,
  background: "#ECECE7",
  color: "#53565A",
};

const textareaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: 90,
  resize: "vertical",
  fontFamily: "inherit",
};

const tallTextareaStyle: CSSProperties = {
  ...textareaStyle,
  minHeight: 130,
};

const labelStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#53565A",
  marginBottom: 6,
  display: "block",
  letterSpacing: 0.2,
  textTransform: "uppercase",
};

const segmentedWrapStyle: CSSProperties = {
  display: "inline-flex",
  background: "#D0D0CE",
  borderRadius: 14,
  padding: 4,
  border: "1px solid #D0D0CE",
};

const segmentedWrapWideStyle: CSSProperties = {
  ...segmentedWrapStyle,
  display: "flex",
  width: "100%",
  minWidth: 0,
};

const segmentedButtonStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "none",
  cursor: "pointer",
  fontWeight: 800,
};

const segmentedButtonFillStyle: CSSProperties = {
  flex: "1 1 0",
  justifyContent: "center",
  display: "inline-flex",
  minWidth: 0,
  whiteSpace: "nowrap",
};

const toolbarStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
  alignItems: "end",
  marginBottom: "14px",
  padding: "12px",
  border: "1px solid #D0D0CE",
  borderRadius: "14px",
  background: "rgba(248,250,252,0.92)",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
};

const toolbarSearchStyle: CSSProperties = {
  ...inputStyle,
  maxWidth: "480px",
  flex: "1 1 320px",
};

const toolbarFiltersStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const toolbarSelectStyle: CSSProperties = {
  ...inputStyle,
  minWidth: "180px",
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

const registerTableWrapStyle: CSSProperties = {
  overflowX: "auto",
  border: "1px solid #D0D0CE",
  borderRadius: "14px",
  background: "#ffffff",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
};

const mocRegisterHeadStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1.7fr 1.2fr 1.1fr 1.2fr 0.9fr 0.9fr 1.15fr 0.7fr",
  gap: "8px",
  padding: "9px 10px",
  background: "#005670",
  borderBottom: "1px solid #005670",
  fontSize: "10px",
  fontWeight: 800,
  color: "#ffffff",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  alignItems: "center",
};

const registerBodyStyle: CSSProperties = {
  overflowY: "visible",
};

const mocRegisterRowStyle: CSSProperties = {
  width: "100%",
  textAlign: "left",
  display: "grid",
  gridTemplateColumns: "1fr 1.7fr 1.2fr 1.1fr 1.2fr 0.9fr 0.9fr 1.15fr 0.7fr",
  gap: "8px",
  padding: "10px",
  border: "none",
  borderBottom: "1px solid #D0D0CE",
  cursor: "pointer",
  alignItems: "start",
};

const registerTitleStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 800,
  color: "#000000",
  marginBottom: "6px",
};

const registerDescriptionStyle: CSSProperties = {
  fontSize: "13px",
  color: "#53565A",
  lineHeight: 1.45,
};

const registerSimpleTextStyle: CSSProperties = {
  fontSize: "13px",
  color: "#000000",
  fontWeight: 700,
};

const temporaryMetaStyle: CSSProperties = {
  marginTop: "6px",
  fontSize: "12px",
  fontWeight: 700,
  lineHeight: 1.35,
};

const detailHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "14px",
  alignItems: "center",
  flexWrap: "wrap",
  paddingBottom: "14px",
  marginBottom: "18px",
  borderBottom: "1px solid #D0D0CE",
};

const detailRecordNumberStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 800,
  color: "#53565A",
};

const detailRecordTitleStyle: CSSProperties = {
  margin: "4px 0 0 0",
  fontSize: "22px",
  color: "#000000",
};

const detailWorkflowHintStyle: CSSProperties = {
  marginTop: "8px",
  fontSize: "13px",
  color: "#53565A",
  lineHeight: 1.45,
};

const detailHeaderActionsStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  alignItems: "center",
};

const workflowButtonStyle: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid #005670",
  background: "#005670",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 700,
};

const fieldsetResetStyle: CSSProperties = {
  margin: 0,
  padding: 0,
  border: "none",
  minWidth: 0,
};

const subSectionStackStyle: CSSProperties = {
  display: "grid",
  gap: "18px",
};

const detailSectionStyle: CSSProperties = {
  border: "1px solid #D0D0CE",
  borderRadius: "18px",
  padding: "18px",
  background: "linear-gradient(180deg, #ffffff 0%, #ECECE7 100%)",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
  minWidth: 0,
};

const detailSectionTitleStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 900,
  color: "#005670",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginBottom: "12px",
};

const detailTemporaryHintStyle: CSSProperties = {
  gridColumn: "1 / -1",
  marginTop: "-2px",
  marginBottom: "2px",
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #ECECE7",
  background: "#ECECE7",
  color: "#000000",
  fontSize: "13px",
  fontWeight: 700,
};

const repeatToolbarStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  marginBottom: "12px",
};

const tableEditorWrapStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
  overflowX: "auto",
  paddingBottom: "4px",
};

const repeatCardStackStyle: CSSProperties = {
  display: "grid",
  gap: "14px",
};

const repeatCardStyle: CSSProperties = {
  border: "1px solid #D0D0CE",
  borderRadius: "16px",
  background: "#ffffff",
  padding: "14px",
  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
};

const compactRepeatCardStyle: CSSProperties = {
  ...repeatCardStyle,
  padding: "12px",
};

const repeatCardHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
  marginBottom: "12px",
  flexWrap: "wrap",
};

const repeatCardKickerStyle: CSSProperties = {
  fontSize: "11px",
  fontWeight: 800,
  color: "#53565A",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const repeatCardTitleStyle: CSSProperties = {
  marginTop: "3px",
  fontSize: "15px",
  fontWeight: 900,
  color: "#000000",
};

const actionPlanCardGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(110px, 0.6fr) minmax(180px, 1fr) minmax(150px, 0.8fr) minmax(140px, 0.7fr)",
  gap: "12px",
};

const actionPlanIntroStyle: CSSProperties = {
  marginBottom: "12px",
  padding: "12px 14px",
  borderRadius: "14px",
  border: "1px solid #D0D0CE",
  background: "#ECECE7",
  color: "#000000",
};

const actionPlanIntroTitleStyle: CSSProperties = {
  display: "block",
  fontSize: "13px",
  fontWeight: 900,
  color: "#005670",
  marginBottom: "4px",
};

const actionPlanIntroTextStyle: CSSProperties = {
  display: "block",
  fontSize: "13px",
  lineHeight: 1.45,
  color: "#53565A",
};

const actionPlanCardTitleRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
};

const actionPlanSummaryStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "10px",
  marginBottom: "12px",
};

const miniMetaLabelStyle: CSSProperties = {
  display: "block",
  fontSize: "11px",
  fontWeight: 800,
  color: "#53565A",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginBottom: "3px",
};

const miniMetaValueStyle: CSSProperties = {
  display: "block",
  fontSize: "13px",
  color: "#000000",
  lineHeight: 1.35,
};

const centralActionLinkStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "38px",
  padding: "9px 12px",
  borderRadius: "10px",
  border: "1px solid #D0D0CE",
  background: "#ECECE7",
  color: "#005670",
  fontSize: "13px",
  fontWeight: 800,
  textDecoration: "none",
  whiteSpace: "nowrap",
};

const documentCardGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(150px, 0.8fr) minmax(260px, 1.6fr) minmax(90px, 0.45fr)",
  gap: "12px",
};

const reviewIntentGridStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginBottom: "12px",
};

const reviewChoiceStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  minHeight: "38px",
  padding: "8px 12px",
  borderRadius: "999px",
  border: "1px solid #D0D0CE",
  background: "#ECECE7",
  color: "#000000",
  fontSize: "13px",
  fontWeight: 800,
};

const reviewCardGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(140px, 1fr))",
  gap: "12px",
};

const signoffCardGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(220px, 1.3fr) minmax(180px, 1fr) minmax(160px, 0.9fr) minmax(140px, 0.7fr)",
  gap: "12px",
};

const actionPlanHeadStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "0.55fr 2fr 1.3fr 1fr 0.9fr 1.15fr",
  gap: "10px",
  fontSize: "12px",
  fontWeight: 800,
  color: "#53565A",
  textTransform: "uppercase",
  letterSpacing: 0.3,
};

const actionPlanRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "0.55fr 2fr 1.3fr 1fr 0.9fr 1.15fr",
  gap: "10px",
  alignItems: "center",
};

const simpleDocHeadStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 2fr 0.8fr 1.15fr",
  gap: "10px",
  fontSize: "12px",
  fontWeight: 800,
  color: "#53565A",
  textTransform: "uppercase",
};

const simpleDocRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 2fr 0.8fr 1.15fr",
  gap: "10px",
  alignItems: "center",
};

const reviewTableWrapStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
  overflowX: "auto",
  paddingBottom: "4px",
};

const reviewHeadStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "72px 72px minmax(130px, 1fr) minmax(150px, 1.1fr) minmax(130px, 1fr) 94px minmax(170px, 1.2fr) 124px minmax(220px, 1.5fr) 128px",
  gap: "10px",
  padding: "10px 12px",
  borderRadius: "14px",
  border: "1px solid #D0D0CE",
  background: "#ECECE7",
  minWidth: "1320px",
  fontSize: "12px",
  fontWeight: 800,
  color: "#53565A",
  textTransform: "uppercase",
  letterSpacing: 0.3,
  alignItems: "center",
};

const reviewRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "72px 72px minmax(130px, 1fr) minmax(150px, 1.1fr) minmax(130px, 1fr) 94px minmax(170px, 1.2fr) 124px minmax(220px, 1.5fr) 128px",
  gap: "10px",
  alignItems: "center",
  padding: "12px",
  borderRadius: "14px",
  border: "1px solid #D0D0CE",
  background: "#ffffff",
  minWidth: "1320px",
};

const checkboxCellStyle: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "42px",
  borderRadius: "10px",
  border: "1px solid #D0D0CE",
  background: "#ffffff",
};

const simpleSignoffHeadStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.3fr 1.1fr 1fr 1.35fr 0.95fr 1.1fr",
  gap: "10px",
  padding: "10px 12px",
  borderRadius: "14px",
  border: "1px solid #D0D0CE",
  background: "#ECECE7",
  minWidth: "1040px",
  fontSize: "12px",
  fontWeight: 800,
  color: "#53565A",
  textTransform: "uppercase",
  letterSpacing: 0.3,
};

const simpleSignoffRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.3fr 1.1fr 1fr 1.35fr 0.95fr 1.1fr",
  gap: "10px",
  alignItems: "center",
  padding: "12px",
  borderRadius: "14px",
  border: "1px solid #D0D0CE",
  background: "#ffffff",
  minWidth: "1040px",
};

const reviewCommentsStyle: CSSProperties = {
  ...inputStyle,
  minHeight: "74px",
  resize: "vertical",
  lineHeight: 1.45,
};

const rowActionsWrapStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const rowActionsStyle: CSSProperties = {
  display: "inline-flex",
  gap: "6px",
};

const signatureFieldStackStyle: CSSProperties = {
  display: "grid",
  gap: "8px",
  minWidth: 0,
};

const hiddenFileInputStyle: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

const signatureFieldActionsStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  alignItems: "center",
  flexWrap: "wrap",
};

const signatureButtonStyle: CSSProperties = {
  padding: "9px 11px",
  borderRadius: 8,
  border: "1px solid #D0D0CE",
  background: "#ECECE7",
  color: "#005670",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: "12px",
  lineHeight: 1.2,
  whiteSpace: "nowrap",
};

const signaturePreviewStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  minHeight: "38px",
  padding: "8px 10px",
  borderRadius: "10px",
  border: "1px solid #D0D0CE",
  background: "#ECECE7",
};

const signatureImageThumbStyle: CSSProperties = {
  width: "64px",
  height: "28px",
  objectFit: "contain",
  borderRadius: "6px",
  background: "#ffffff",
  border: "1px solid #D0D0CE",
  padding: "2px",
};

const signaturePreviewTextStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  color: "#53565A",
};

const signatureHintStyle: CSSProperties = {
  fontSize: "12px",
  color: "#53565A",
};

const rowMoveButtonStyle: CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #D0D0CE",
  background: "#ffffff",
  color: "#000000",
  fontWeight: 700,
  cursor: "pointer",
};

const removeRowButtonStyle: CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #ECECE7",
  background: "#ECECE7",
  color: "#F93822",
  fontWeight: 700,
  cursor: "pointer",
};

const impactGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "10px",
};

const impactToggleStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  border: "1px solid #D0D0CE",
  borderRadius: "12px",
  padding: "12px 14px",
  cursor: "pointer",
  color: "#000000",
  fontWeight: 700,
  textAlign: "left",
};

const impactCheckboxStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "20px",
  height: "20px",
  borderRadius: "6px",
  border: "1px solid #005670",
  fontSize: "12px",
  fontWeight: 800,
};

const checkToggleStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  minHeight: "42px",
  border: "1px solid #D0D0CE",
  borderRadius: "10px",
  padding: "0 12px",
  background: "#ffffff",
};

const badgeStyle: CSSProperties = {
  padding: "5px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 700,
  display: "inline-block",
  whiteSpace: "nowrap",
};

const primaryButtonStyle: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "none",
  background: "#005670",
  color: "#ffffff",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid #D0D0CE",
  background: "#ffffff",
  color: "#000000",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButtonSmall: CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #D0D0CE",
  background: "#ffffff",
  color: "#000000",
  fontWeight: 700,
  cursor: "pointer",
};

const dangerButtonStyle: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid #ECECE7",
  background: "#ECECE7",
  color: "#F93822",
  fontWeight: 700,
  cursor: "pointer",
};

const buttonRowStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "12px",
};

const detailButtonRowStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "20px",
};

const attachmentSectionIntroStyle: CSSProperties = {
  marginBottom: "12px",
  color: "#53565A",
  fontSize: "14px",
  lineHeight: 1.5,
};

const attachmentToolbarStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "center",
  flexWrap: "wrap",
  marginBottom: "14px",
};

const attachmentToolbarHintStyle: CSSProperties = {
  color: "#53565A",
  fontSize: "13px",
};

const attachmentEmptyStateStyle: CSSProperties = {
  padding: "16px",
  borderRadius: "14px",
  border: "1px dashed #D0D0CE",
  background: "#ffffff",
  color: "#53565A",
};

const attachmentListStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
};

const attachmentRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "center",
  flexWrap: "wrap",
  padding: "14px 16px",
  borderRadius: "14px",
  border: "1px solid #D0D0CE",
  background: "#ffffff",
};

const attachmentFileNameStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 800,
  color: "#000000",
  overflowWrap: "anywhere",
};

const attachmentMetaStyle: CSSProperties = {
  marginTop: "4px",
  fontSize: "12px",
  color: "#53565A",
};

const attachmentActionsStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const emptyBoardStyle: CSSProperties = {
  padding: 18,
  borderRadius: 16,
  background: "#ffffff",
  border: "1px dashed #D0D0CE",
  color: "#53565A",
};

export default function MOCPage() {
  return (
    <Suspense fallback={<main style={{ padding: "24px" }}>Loading MOC...</main>}>
      <MOCPageContent />
    </Suspense>
  );
}

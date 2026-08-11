"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  AlignmentType,
  BorderStyle,
  Document as WordDocument,
  ExternalHyperlink,
  Footer,
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
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import * as XLSX from "xlsx";
import { useImsPermissions } from "../../src/components/ImsPermissions";
import { ModuleSectionHeader } from "../../src/components/ModuleSectionHeader";
import { QualityKpiCard } from "../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../src/components/QualityPageHero";
import { supabase } from "../../src/lib/supabase";

export const dynamic = "force-dynamic";

type Ncr = {
  id: string;
  ncr_number: string | null;
  title: string | null;
  description: string | null;
  containment_action: string | null;
  corrective_action: string | null;
  severity: string | null;
  status: string | null;
  owner: string | null;
  area: string | null;
  due_date: string | null;
  created_at: string | null;
  closed_at: string | null;
  project: string | null;
  source_type: string | null;
  root_cause_category: string | null;
  root_cause_description: string | null;
};

type Capa = {
  id: string;
  capa_number: string | null;
  title: string | null;
  description: string | null;
  status: string | null;
  owner: string | null;
  due_date: string | null;
  created_at: string | null;
  linked_to: string | null;
  project: string | null;
  correction_description: string | null;
  corrective_action_description: string | null;
  effectiveness_status: string | null;
  effectiveness_review_date: string | null;
  effectiveness_reviewer: string | null;
  effectiveness_comments: string | null;
  effectiveness_due_date: string | null;
};

type EvidenceFile = {
  id: string;
  record_type: "NCR" | "CAPA" | "ACTION";
  record_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  content_type: string | null;
  notes: string | null;
  uploaded_at: string;
};

type NcrCapaPdf = {
  id: string;
  ncr_id: string;
  file_name: string;
  file_path: string;
  generated_at: string;
  generated_by: string | null;
  include_linked_capa: boolean;
  include_evidence_list: boolean;
  external_facing: boolean;
};

type LinkedAction = {
  id: string;
  action_number: string | null;
  title: string | null;
  status: string | null;
  owner: string | null;
  due_date: string | null;
  linked_ncr_id: string | null;
  linked_ncr_number: string | null;
};

type LinkedOption = {
  id: string;
  label: string;
};

type PersonOption = {
  id: string;
  name: string | null;
  email: string | null;
  department: string | null;
  active: boolean | null;
};

type CombinedRow = {
  type: "NCR" | "CAPA";
  id: string;
  number: string;
  title: string;
  description: string;
  containment_action: string;
  corrective_action: string;
  severity: string;
  status: string;
  owner: string;
  area: string;
  due_date: string;
  created_at: string;
  closed_at: string;
  project: string;
  source_type: string;
  linked_to: string;
  root_cause_category: string;
  root_cause_description: string;
  correction_description: string;
  corrective_action_description: string;
  effectiveness_status: string;
  effectiveness_review_date: string;
  effectiveness_reviewer: string;
  effectiveness_comments: string;
  effectiveness_due_date: string;
};

type NcrSortKey = "number" | "severity" | "status" | "due_date";
type SortDirection = "asc" | "desc";
type NcrQuickFilter = "" | "Open" | "In Progress" | "Closed" | "Overdue" | "DueSoon" | "All";
type NcrWorkspaceView = "dashboard" | "register" | "create" | "import" | "reports";

type NcrImportRow = {
  rowNumber: number;
  ncr_number: string;
  title: string;
  description: string;
  containment_action: string;
  corrective_action: string;
  project: string;
  owner: string;
  severity: string;
  status: string;
  source_type: string;
  area: string;
  due_date: string;
  root_cause_category: string;
  root_cause_description: string;
  evidence_files: string;
  evidence_notes: string;
  errors: string[];
};

const ncrWorkspaceViews: { id: NcrWorkspaceView; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "register", label: "NCR Register" },
  { id: "create", label: "Create NCR" },
  { id: "import", label: "Import" },
  { id: "reports", label: "Reports" },
];

function parseNcrWorkspaceView(value: string | null): NcrWorkspaceView | null {
  if (!value) return null;
  const normalised = value.trim().toLowerCase();
  if (normalised === "dashboard") return "dashboard";
  if (normalised === "register" || normalised === "ncr-register") return "register";
  if (normalised === "create" || normalised === "create-ncr") return "create";
  if (normalised === "import") return "import";
  if (normalised === "reports") return "reports";
  return null;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB");
}

function buildNcrLinkedActionHref(row: CombinedRow) {
  const descriptionSections = [
    row.description ? `NCR Description:\n${row.description}` : "",
    row.containment_action ? `Containment Action:\n${row.containment_action}` : "",
    row.corrective_action ? `Corrective Action:\n${row.corrective_action}` : "",
    row.root_cause_category || row.root_cause_description
      ? `Root Cause Summary:\n${[row.root_cause_category, row.root_cause_description].filter(Boolean).join(" - ")}`
      : "",
  ].filter(Boolean);

  const params = new URLSearchParams({
    prefill_source: "NCR/CAPA",
    prefill_department: "HSEQ",
    prefill_project: row.project || "",
    prefill_title: `${row.number} - ${row.title || "Untitled NCR"}`,
    prefill_description: descriptionSections.join("\n\n"),
    prefill_owner: row.owner || "",
    linked_ncr_id: row.id,
    linked_ncr_number: row.number,
  });

  return `/actions?${params.toString()}`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-GB", {
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

function getOverdueDays(value: string | null | undefined) {
  if (!value) return null;
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

function dueState(date: string | null | undefined) {
  if (!date) return "none";
  const today = new Date();
  const due = new Date(date);
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "overdue";
  if (diff <= 7) return "soon";
  return "ok";
}

function getStatusTone(status: string) {
  const value = (status || "").toLowerCase();
  if (value.includes("open")) return { bg: "#ECECE7", color: "#F93822" };
  if (value.includes("progress")) return { bg: "#ECECE7", color: "#000000" };
  if (value.includes("hold")) return { bg: "#ECECE7", color: "#53565A" };
  if (value.includes("closed")) return { bg: "#ECECE7", color: "#005670" };
  if (value.includes("complete")) return { bg: "#ECECE7", color: "#005670" };
  return { bg: "#D0D0CE", color: "#53565A" };
}

function getSeverityTone(severity: string) {
  const value = (severity || "").toLowerCase();
  if (value.includes("high") || value.includes("major") || value.includes("critical")) {
    return { bg: "#ECECE7", color: "#F93822" };
  }
  if (value.includes("medium")) return { bg: "#ECECE7", color: "#000000" };
  if (value.includes("low") || value.includes("minor")) return { bg: "#ECECE7", color: "#005670" };
  return { bg: "#D0D0CE", color: "#53565A" };
}

function getSeverityDisplay(severity: string | null | undefined) {
  const value = (severity || "").trim().toLowerCase();
  if (value === "high" || value === "major" || value === "critical") return "High";
  if (value === "medium" || value === "minor") return "Medium";
  if (value === "low" || value === "ofi" || value === "obs") return "Low";
  return "Low";
}

function getSeverityRank(severity: string | null | undefined) {
  const display = getSeverityDisplay(severity);
  if (display === "High") return 0;
  if (display === "Medium") return 1;
  return 2;
}

function getNcrSeveritySortRank(severity: string | null | undefined) {
  const display = getSeverityDisplay(severity);
  if (display === "Low") return 0;
  if (display === "Medium") return 1;
  if (display === "High") return 2;
  return 3;
}

function getNcrStatusSortRank(status: string | null | undefined) {
  const value = (status || "").trim().toLowerCase();
  if (value === "open") return 0;
  if (value === "in progress") return 1;
  if (value === "on hold") return 2;
  if (value === "closed") return 3;
  return 4;
}

function getTrailingNumber(value: string | null | undefined) {
  const match = (value || "").match(/(\d+)$/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const parsed = Number(match[1]);
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

function hexToRgbTriplet(value: string) {
  const normalized = value.replace("#", "");
  const parts = normalized.match(/.{1,2}/g);
  if (!parts || parts.length < 3) return [208, 208, 206] as [number, number, number];
  return parts.slice(0, 3).map((item) => Number.parseInt(item, 16)) as [number, number, number];
}

function getTypeTone(type: "NCR" | "CAPA") {
  return type === "NCR"
    ? { bg: "#ECECE7", color: "#005670", border: "#63B1BC" }
    : { bg: "#ECECE7", color: "#53565A", border: "#ECECE7" };
}

function buildNextNumber(prefix: string, values: (string | null)[]) {
  const used = new Set<number>();

  values.forEach((value) => {
    if (!value) return;
    const match = value.match(/(\d+)$/);
    if (!match) return;
    used.add(Number(match[1]));
  });

  let next = 1;
  while (used.has(next)) next += 1;

  return `${prefix}-${String(next).padStart(3, "0")}`;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function wordText(value: string | null | undefined) {
  const text = (value || "").trim();
  return text;
}

function wordParagraph(text: string, options?: { bold?: boolean; size?: number; color?: string; spacingAfter?: number }) {
  return new Paragraph({
    spacing: { after: options?.spacingAfter ?? 120 },
    children: [
      new TextRun({
        text: wordText(text),
        font: "Azo Sans",
        bold: options?.bold,
        size: options?.size ?? 20,
        color: options?.color ?? "000000",
      }),
    ],
  });
}

function wordHeading(text: string) {
  return new Paragraph({
    spacing: { before: 180, after: 70 },
    children: [
      new TextRun({
        text,
        font: "Azo Sans",
        bold: true,
        size: 22,
        color: "000000",
      }),
    ],
  });
}

function wordCell(
  children: Array<Paragraph | Table> | string,
  options?: {
    width?: number;
    fill?: string;
    bold?: boolean;
    color?: string;
    size?: number;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
  }
) {
  const cellChildren =
    typeof children === "string"
      ? [
          new Paragraph({
            alignment: options?.align,
            children: [
              new TextRun({
                text: wordText(children),
                font: "Azo Sans",
                bold: options?.bold,
                color: options?.color ?? "000000",
                size: options?.size ?? 18,
              }),
            ],
          }),
        ]
      : children;

  return new TableCell({
    width: options?.width ? { size: options.width, type: WidthType.DXA } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    shading: options?.fill ? { type: ShadingType.CLEAR, color: "auto", fill: options.fill } : undefined,
    margins: { top: 105, bottom: 105, left: 110, right: 110 },
    children: cellChildren,
  });
}

function wordTable(rows: TableRow[], columnWidths?: number[]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    columnWidths,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "D0D0CE" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "D0D0CE" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "D0D0CE" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "D0D0CE" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "D0D0CE" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "D0D0CE" },
    },
    rows,
  });
}

function wordKeyValueTable(rows: Array<[string, string, string, string]>) {
  const widths = [1500, 3200, 1500, 3160];
  return wordTable(
    [
      new TableRow({
        tableHeader: true,
        children: [
          wordCell("Field", { fill: "005670", color: "FFFFFF", bold: true, width: widths[0] }),
          wordCell("Value", { fill: "005670", color: "FFFFFF", bold: true, width: widths[1] }),
          wordCell("Field", { fill: "005670", color: "FFFFFF", bold: true, width: widths[2] }),
          wordCell("Value", { fill: "005670", color: "FFFFFF", bold: true, width: widths[3] }),
        ],
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            cantSplit: true,
            children: [
              wordCell(row[0], { fill: "ECECE7", bold: true, width: widths[0] }),
              wordCell(row[1], { fill: "FFFFFF", width: widths[1] }),
              wordCell(row[2], { fill: "ECECE7", bold: true, width: widths[2] }),
              wordCell(row[3], { fill: "FFFFFF", width: widths[3] }),
            ],
          })
      ),
    ],
    widths
  );
}

function wordParagraphBox(label: string, value: string | null | undefined) {
  return [
    wordParagraph(label, { bold: true, size: 18, color: "000000", spacingAfter: 60 }),
    wordTable(
      [
        new TableRow({
          cantSplit: true,
          children: [
            wordCell(
              [
                new Paragraph({
                  spacing: { line: 235 },
                  children: [
                    new TextRun({
                      text: wordText(value),
                      font: "Azo Sans",
                      size: 18,
                      color: "000000",
                    }),
                  ],
                }),
              ],
              {
                width: 9360,
                fill: "FFFFFF",
              }
            ),
          ],
        }),
      ],
      [9360]
    ),
  ];
}

function wordPlainBorders(color = "FFFFFF") {
  return {
    top: { style: BorderStyle.NONE, size: 0, color },
    bottom: { style: BorderStyle.NONE, size: 0, color },
    left: { style: BorderStyle.NONE, size: 0, color },
    right: { style: BorderStyle.NONE, size: 0, color },
    insideHorizontal: { style: BorderStyle.NONE, size: 0, color },
    insideVertical: { style: BorderStyle.NONE, size: 0, color },
  };
}

function wordReportFooter(reference: string) {
  return new Footer({
    children: [
      new Paragraph({
        border: { top: { style: BorderStyle.SINGLE, color: "005670", size: 4 } },
        spacing: { before: 80 },
        children: [new TextRun({ text: "", size: 1 })],
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        layout: TableLayoutType.FIXED,
        columnWidths: [6500, 2860],
        borders: wordPlainBorders(),
        rows: [
          new TableRow({
            children: [
              wordCell(`Enshore | ${reference}`, { width: 6500, size: 16, color: "53565A" }),
              new TableCell({
                width: { size: 2860, type: WidthType.DXA },
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

function normaliseEffectivenessStatus(value: string | null | undefined) {
  const trimmed = (value || "").trim();
  if (!trimmed) return "Pending";
  if (trimmed.toLowerCase() === "effective") return "Effective";
  if (trimmed.toLowerCase() === "not effective") return "Not Effective";
  return "Pending";
}

function normalizeImportHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeImportOption(value: string, options: string[], fallback: string) {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  const matched = options.find((option) => option.toLowerCase() === trimmed.toLowerCase());
  return matched || trimmed;
}

function normalizeImportDate(value: unknown) {
  if (value === null || value === undefined || value === "") return "";

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return "";
    const year = String(parsed.y).padStart(4, "0");
    const month = String(parsed.m).padStart(2, "0");
    const day = String(parsed.d).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return value.toISOString().slice(0, 10);
  }

  const text = String(value).trim();
  if (!text) return "";

  const isoMatch = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;
  }

  const gbMatch = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (gbMatch) {
    const year = gbMatch[3].length === 2 ? `20${gbMatch[3]}` : gbMatch[3];
    return `${year}-${gbMatch[2].padStart(2, "0")}-${gbMatch[1].padStart(2, "0")}`;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function buildImportedEvidenceNote(evidenceFiles: string, evidenceNotes: string) {
  const lines = [
    evidenceFiles.trim() ? `Evidence Files: ${evidenceFiles.trim()}` : "",
    evidenceNotes.trim() ? `Evidence Notes: ${evidenceNotes.trim()}` : "",
  ].filter(Boolean);

  return lines.length ? `Imported Evidence Reference\n${lines.join("\n")}` : "";
}

function appendImportedEvidenceReference(rootCauseDescription: string, evidenceFiles: string, evidenceNotes: string) {
  const evidenceReference = buildImportedEvidenceNote(evidenceFiles, evidenceNotes);
  if (!evidenceReference) return rootCauseDescription.trim();
  return [rootCauseDescription.trim(), evidenceReference].filter(Boolean).join("\n\n");
}

function getPdfText(value: string | null | undefined) {
  const trimmed = (value || "").trim();
  return trimmed || "";
}

function parseLinkedReferences(value: string | null | undefined) {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const evidenceImageExtensions = new Set(["jpg", "jpeg", "png", "webp"]);

function getFileExtension(fileName: string | null | undefined) {
  const name = (fileName || "").trim();
  const match = name.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : "";
}

function isImageEvidence(file: EvidenceFile) {
  if ((file.content_type || "").toLowerCase().startsWith("image/")) return true;
  return evidenceImageExtensions.has(getFileExtension(file.file_name));
}

function getEvidenceTypeLabel(file: EvidenceFile) {
  if (file.content_type) return file.content_type;
  const extension = getFileExtension(file.file_name);
  return extension ? extension.toUpperCase() : "Unknown";
}

async function fetchImagePreviewData(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Image fetch failed with status ${response.status}`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Image decode failed"));
      img.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas context not available");
    }

    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return {
      dataUrl: canvas.toDataURL("image/png"),
      width: canvas.width,
      height: canvas.height,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function unknownArrayToOptions(
  data: unknown,
  primaryKeys: string[],
  secondaryKeys: string[]
): LinkedOption[] {
  if (!Array.isArray(data)) return [];

  return (data as unknown[])
    .map((row) => {
      if (typeof row !== "object" || row === null) return null;

      const obj = row as Record<string, unknown>;
      const fallbackId = String(obj["id"] ?? "").trim();

      const primary =
        primaryKeys.map((key) => String(obj[key] ?? "").trim()).find(Boolean) || fallbackId;

      const secondary =
        secondaryKeys.map((key) => String(obj[key] ?? "").trim()).find(Boolean) || "";

      return {
        id: primary || fallbackId,
        label: secondary ? `${primary} - ${secondary}` : primary || fallbackId,
      };
    })
    .filter((item): item is LinkedOption => Boolean(item?.id));
}

async function tryLoadNcrOptions(): Promise<LinkedOption[]> {
  const attempts = [
    { table: "ncrs", columns: "id,ncr_number,title" },
    { table: "ncrs", columns: "id,ncr_number,description" },
    { table: "ncrs", columns: "id,reference,title" },
    { table: "ncrs", columns: "id,reference,description" },
    { table: "ncr_capa", columns: "id,ncr_number,title" },
    { table: "ncr_capa", columns: "id,reference,title" },
  ];

  for (const attempt of attempts) {
    const result = await supabase.from(attempt.table).select(attempt.columns).limit(500);
    if (result.error) continue;

    const mapped = unknownArrayToOptions(
      result.data as unknown,
      ["ncr_number", "reference", "id"],
      ["title", "description"]
    );

    if (mapped.length > 0) return mapped;
  }

  return [];
}

function NcrCapaPageContent() {
  const imsPermissions = useImsPermissions();
  const searchParams = useSearchParams();
  const linkedSearch = searchParams.get("search")?.trim() || "";
  const linkedStatus = searchParams.get("status")?.trim() || "All";
  const linkedSeverity = searchParams.get("severity")?.trim() || "All";
  const linkedSource = searchParams.get("source")?.trim() || "All";
  const linkedProject = searchParams.get("project")?.trim() || "All";
  const linkedOverdueOnly = searchParams.get("overdue") === "1";
  const linkedDueWindow = Number(searchParams.get("dueWindow") || "0");
  const linkedCreatedMonth = searchParams.get("createdMonth")?.trim() || "";
  const linkedClosedMonth = searchParams.get("closedMonth")?.trim() || "";
  const directNcrNumber = searchParams.get("ncr")?.trim() || "";
  const directNcrId = searchParams.get("ncrId")?.trim() || "";
  const requestedWorkspaceView = parseNcrWorkspaceView(searchParams.get("view"));
  const hasRegisterQuery =
    Boolean(linkedSearch) ||
    linkedStatus !== "All" ||
    linkedSeverity !== "All" ||
    linkedSource !== "All" ||
    linkedProject !== "All" ||
    linkedOverdueOnly ||
    linkedDueWindow > 0 ||
    Boolean(linkedCreatedMonth) ||
    Boolean(linkedClosedMonth) ||
    Boolean(directNcrNumber) ||
    Boolean(directNcrId);

  const [ncrs, setNcrs] = useState<Ncr[]>([]);
  const [capas, setCapas] = useState<Capa[]>([]);
  const [linkedActions, setLinkedActions] = useState<LinkedAction[]>([]);
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [savedPdfFiles, setSavedPdfFiles] = useState<NcrCapaPdf[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [activeCreateTab] = useState<"NCR" | "CAPA">("NCR");
  const [activeWorkspaceView, setActiveWorkspaceView] = useState<NcrWorkspaceView>(
    hasRegisterQuery ? "register" : requestedWorkspaceView || "dashboard"
  );
  const [selectedRow, setSelectedRow] = useState<CombinedRow | null>(null);
  const selectedDetailRef = useRef<HTMLDivElement | null>(null);
  const [refreshStamp, setRefreshStamp] = useState<string>("");
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState(linkedSearch);
  const [statusFilter, setStatusFilter] = useState(linkedStatus);
  const [severityFilter, setSeverityFilter] = useState(linkedSeverity);
  const [sourceFilter, setSourceFilter] = useState(linkedSource);
  const [projectFilter, setProjectFilter] = useState(linkedProject);
  const [showRegisterFilters, setShowRegisterFilters] = useState(
    Boolean(linkedStatus !== "All" || linkedSeverity !== "All" || linkedSource !== "All" || linkedProject !== "All")
  );
  const [showReportFilters, setShowReportFilters] = useState(false);
  const [showAttentionOnly, setShowAttentionOnly] = useState(false);
  const [activeLogTab, setActiveLogTab] = useState<"NCR" | "CAPA">("NCR");
  const [ncrQuickFilter, setNcrQuickFilter] = useState<NcrQuickFilter>("");
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));
  const [ncrSort, setNcrSort] = useState<{ key: NcrSortKey; direction: SortDirection } | null>(null);

  const [ncrOptions, setNcrOptions] = useState<LinkedOption[]>([]);
  const [people, setPeople] = useState<PersonOption[]>([]);
  const [newLinkedNcrToAdd, setNewLinkedNcrToAdd] = useState("");
  const [editLinkedNcrToAdd, setEditLinkedNcrToAdd] = useState("");

  const [newNcr, setNewNcr] = useState({
    title: "",
    description: "",
    containment_action: "",
    corrective_action: "",
    severity: "Medium",
    status: "Open",
    owner: "",
    area: "",
    due_date: "",
    project: "",
    source_type: "Internal",
    root_cause_category: "",
    root_cause_description: "",
  });

  const [newCapa, setNewCapa] = useState({
    title: "",
    description: "",
    status: "Open",
    owner: "",
    due_date: "",
    linked_to: "",
    project: "",
    correction_description: "",
    corrective_action_description: "",
    effectiveness_status: "Pending",
    effectiveness_review_date: "",
    effectiveness_reviewer: "",
    effectiveness_comments: "",
    effectiveness_due_date: "",
  });

  const [createNcrFiles, setCreateNcrFiles] = useState<File[]>([]);
  const [createNcrEvidenceNotes, setCreateNcrEvidenceNotes] = useState("");
  const [createCapaFiles, setCreateCapaFiles] = useState<File[]>([]);
  const [createCapaEvidenceNotes, setCreateCapaEvidenceNotes] = useState("");
  const [importFileName, setImportFileName] = useState("");
  const [importRows, setImportRows] = useState<NcrImportRow[]>([]);
  const [importingNcrs, setImportingNcrs] = useState(false);
  const [newRootCauseOther, setNewRootCauseOther] = useState("");
  const [editRootCauseOther, setEditRootCauseOther] = useState("");

  const [editRow, setEditRow] = useState<CombinedRow | null>(null);
  const [selectedEvidenceFiles, setSelectedEvidenceFiles] = useState<File[]>([]);
  const [selectedEvidenceNotes, setSelectedEvidenceNotes] = useState("");
  const [includeLinkedCapaInPdf, setIncludeLinkedCapaInPdf] = useState(true);
  const [includeEvidenceListInPdf, setIncludeEvidenceListInPdf] = useState(true);
  const [externalFacingPdf, setExternalFacingPdf] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatingWord, setGeneratingWord] = useState(false);
  const [generatingFilteredNcrReport, setGeneratingFilteredNcrReport] = useState(false);

  const canCreateNcr = useMemo(() => {
    return imsPermissions.loaded && (imsPermissions.isMasterAdmin || imsPermissions.fullAccess || imsPermissions.canCreate);
  }, [imsPermissions.canCreate, imsPermissions.fullAccess, imsPermissions.isMasterAdmin, imsPermissions.loaded]);

  const canEditNcr = useMemo(() => {
    return imsPermissions.loaded && (imsPermissions.isMasterAdmin || imsPermissions.fullAccess || imsPermissions.canEdit);
  }, [imsPermissions.canEdit, imsPermissions.fullAccess, imsPermissions.isMasterAdmin, imsPermissions.loaded]);

  function requireCreatePermission(actionLabel: string) {
    if (canCreateNcr) return true;
    setMessage(`${actionLabel} requires Create permission for this IMS area.`);
    return false;
  }

  function requireEditPermission(actionLabel: string) {
    if (canEditNcr) return true;
    setMessage(`${actionLabel} requires Edit permission for this IMS area.`);
    return false;
  }

  async function loadData() {
    setLoading(true);

    const [
      { data: ncrData, error: ncrError },
      { data: capaData, error: capaError },
      { data: actionData, error: actionError },
      { data: evidenceData, error: evidenceError },
      { data: pdfData, error: pdfError },
    ] = await Promise.all([
      supabase.from("ncrs").select("*").order("created_at", { ascending: false }),
      supabase.from("capas").select("*").order("created_at", { ascending: false }),
      supabase
        .from("actions")
        .select("id,action_number,title,status,owner,due_date,linked_ncr_id,linked_ncr_number")
        .order("action_number", { ascending: true }),
      supabase
        .from("evidence_files")
        .select("*")
        .in("record_type", ["NCR", "CAPA"])
        .order("uploaded_at", { ascending: false }),
      supabase.from("ncr_capa_pdfs").select("*").order("generated_at", { ascending: false }),
    ]);

    const loadErrors = [
      ncrError ? `NCRs: ${ncrError.message}` : "",
      capaError ? `legacy CAPA data: ${capaError.message}` : "",
      actionError ? `linked actions: ${actionError.message}` : "",
      evidenceError ? `evidence: ${evidenceError.message}` : "",
      pdfError ? `saved PDFs: ${pdfError.message}` : "",
    ].filter(Boolean);

    if (loadErrors.length > 0) {
      console.error("Error loading NCR module data:", loadErrors);
      setMessage(`Load warning: ${loadErrors.join(" | ")}`);
    }

    setNcrs((ncrData as Ncr[]) || []);
    setCapas((capaData as Capa[]) || []);
    setLinkedActions((actionData as LinkedAction[]) || []);
    setEvidenceFiles((evidenceData as EvidenceFile[]) || []);
    setSavedPdfFiles((pdfData as NcrCapaPdf[]) || []);
    setRefreshStamp(new Date().toLocaleString("en-GB"));
    setLoading(false);
  }

  async function loadNcrOptions() {
    const options = await tryLoadNcrOptions();
    setNcrOptions(options);
  }

  async function loadPeople() {
    const { data, error } = await supabase
      .from("people")
      .select("id,name,email,department,active")
      .eq("active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error loading people:", error.message);
      return;
    }

    setPeople(((data as PersonOption[]) || []).filter((person) => Boolean(person.name?.trim())));
  }

  useEffect(() => {
    void loadData();
    void loadNcrOptions();
    void loadPeople();
  }, []);

  useEffect(() => {
    if (hasRegisterQuery) {
      setActiveWorkspaceView("register");
      return;
    }

    if (requestedWorkspaceView) {
      setActiveWorkspaceView(requestedWorkspaceView);
    }
  }, [hasRegisterQuery, requestedWorkspaceView]);

  useEffect(() => {
    setEditRow(selectedRow);
    setSelectedEvidenceFiles([]);
    setSelectedEvidenceNotes("");
    setEditLinkedNcrToAdd("");
    setIncludeLinkedCapaInPdf(true);
    setIncludeEvidenceListInPdf(true);
    setExternalFacingPdf(false);
    setEditRootCauseOther(getOtherRootCauseCategoryText(selectedRow?.root_cause_category || ""));
  }, [selectedRow]);

  const combinedRows = useMemo<CombinedRow[]>(() => {
    const mappedNcrs: CombinedRow[] = ncrs.map((n) => ({
      type: "NCR",
      id: n.id,
      number: n.ncr_number || "NCR-???",
      title: n.title || "",
      description: n.description || "",
      containment_action: n.containment_action || "",
      corrective_action: n.corrective_action || "",
      severity: n.severity || "-",
      status: n.status || "Open",
      owner: n.owner || "",
      area: n.area || "",
      due_date: n.due_date || "",
      created_at: n.created_at || "",
      closed_at: n.closed_at || "",
      project: n.project || "",
      source_type: n.source_type || "Internal",
      linked_to: "",
      root_cause_category: n.root_cause_category || "",
      root_cause_description: n.root_cause_description || "",
      correction_description: "",
      corrective_action_description: "",
      effectiveness_status: "Pending",
      effectiveness_review_date: "",
      effectiveness_reviewer: "",
      effectiveness_comments: "",
      effectiveness_due_date: "",
    }));

    const mappedCapas: CombinedRow[] = capas.map((c) => ({
      type: "CAPA",
      id: c.id,
      number: c.capa_number || "CAPA-???",
      title: c.title || "",
      description: c.description || "",
      containment_action: "",
      corrective_action: "",
      severity: "-",
      status: c.status || "Open",
      owner: c.owner || "",
      area: "",
      due_date: c.due_date || "",
      created_at: c.created_at || "",
      closed_at: "",
      project: c.project || "",
      source_type: "",
      linked_to: c.linked_to || "",
      root_cause_category: "",
      root_cause_description: "",
      correction_description: c.correction_description || "",
      corrective_action_description: c.corrective_action_description || "",
      effectiveness_status: normaliseEffectivenessStatus(c.effectiveness_status),
      effectiveness_review_date: c.effectiveness_review_date || "",
      effectiveness_reviewer: c.effectiveness_reviewer || "",
      effectiveness_comments: c.effectiveness_comments || "",
      effectiveness_due_date: c.effectiveness_due_date || "",
    }));

    return [...mappedNcrs, ...mappedCapas].sort((a, b) => {
      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();
      return bTime - aTime;
    });
  }, [ncrs, capas]);

  useEffect(() => {
    if ((!linkedSearch && !directNcrNumber && !directNcrId) || combinedRows.length === 0) return;

    const value = (directNcrNumber || linkedSearch).toLowerCase();
    const match = combinedRows.find(
      (row) =>
        row.type === "NCR" &&
        ((directNcrId && row.id === directNcrId) ||
          Boolean(
            value &&
              (row.number.toLowerCase() === value ||
                row.title.toLowerCase().includes(value) ||
                row.linked_to.toLowerCase().includes(value))
          ))
    );

    if (match) {
      setActiveLogTab(match.type);
      setActiveWorkspaceView("register");
      setSelectedRow((current) => (current?.id === match.id ? current : match));
    }
  }, [directNcrId, directNcrNumber, linkedSearch, combinedRows]);

  const evidenceCountMap = useMemo(() => {
    const map = new Map<string, number>();
    evidenceFiles.forEach((file) => {
      const key = `${file.record_type}-${file.record_id}`;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [evidenceFiles]);

  const selectedRowEvidence = useMemo(() => {
    if (!selectedRow) return [];
    return evidenceFiles.filter(
      (file) => file.record_type === selectedRow.type && file.record_id === selectedRow.id
    );
  }, [evidenceFiles, selectedRow]);

  const selectedLinkedCapas = useMemo(() => {
    if (!selectedRow || selectedRow.type !== "NCR") return [];
    return capas.filter((capa) =>
      parseLinkedReferences(capa.linked_to).includes(selectedRow.number)
    );
  }, [capas, selectedRow]);

  const selectedLinkedActions = useMemo(() => {
    if (!selectedRow || selectedRow.type !== "NCR") return [];
    return linkedActions.filter(
      (action) =>
        (action.linked_ncr_id && action.linked_ncr_id === selectedRow.id) ||
        (action.linked_ncr_number && action.linked_ncr_number === selectedRow.number)
    );
  }, [linkedActions, selectedRow]);

  function selectRowAndScroll(row: CombinedRow) {
    setSelectedRow(row);
    window.setTimeout(() => {
      selectedDetailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  const selectedNcrPdfEvidence = useMemo(() => {
    if (!selectedRow || selectedRow.type !== "NCR") return [];
    return evidenceFiles.filter((file) => file.record_type === "NCR" && file.record_id === selectedRow.id);
  }, [evidenceFiles, selectedRow]);

  const selectedSavedPdfHistory = useMemo(() => {
    if (!selectedRow || selectedRow.type !== "NCR") return [];
    return savedPdfFiles.filter((file) => file.ncr_id === selectedRow.id);
  }, [savedPdfFiles, selectedRow]);

  const latestSavedPdf = useMemo(() => {
    return selectedSavedPdfHistory[0] || null;
  }, [selectedSavedPdfHistory]);

  const statusOptions = ["Open", "In Progress", "Closed"];
  const severityOptions = ["Low", "Medium", "High"];
  const sourceOptions = ["Internal", "Supplier", "External"];
  const rootCauseOptions = [
    "Human Error",
    "Procedure Gap",
    "Training / Competence",
    "Supplier Issue",
    "Design Issue",
    "Equipment Failure",
    "Other",
  ];
  const effectivenessStatusOptions = ["Pending", "Effective", "Not Effective"];

  const projectOptions = useMemo(() => {
    const values = new Set<string>();
    combinedRows.filter((row) => row.type === "NCR").forEach((row) => {
      if (row.project?.trim()) values.add(row.project.trim());
    });
    return ["All", ...Array.from(values).sort()];
  }, [combinedRows]);

  const yearOptions = useMemo(() => {
    const values = new Set<string>();
    ncrs.forEach((ncr) => {
      const value = ncr.created_at ? new Date(ncr.created_at) : null;
      if (value && !Number.isNaN(value.getTime())) values.add(String(value.getFullYear()));
    });
    values.add(String(new Date().getFullYear()));
    return ["All Years", ...Array.from(values).sort((a, b) => Number(b) - Number(a))];
  }, [ncrs]);

  const peopleNameOptions = useMemo(() => {
    return Array.from(
      new Set(people.map((person) => person.name?.trim()).filter((name): name is string => Boolean(name)))
    ).sort((a, b) => a.localeCompare(b));
  }, [people]);

  const createOwnerOptions = useMemo(() => {
    const currentOwner = newNcr.owner.trim();
    if (!currentOwner || peopleNameOptions.includes(currentOwner)) return peopleNameOptions;
    return [currentOwner, ...peopleNameOptions];
  }, [newNcr.owner, peopleNameOptions]);

  const editOwnerOptions = useMemo(() => {
    const currentOwner = editRow?.owner.trim() || "";
    if (!currentOwner || peopleNameOptions.includes(currentOwner)) return peopleNameOptions;
    return [currentOwner, ...peopleNameOptions];
  }, [editRow?.owner, peopleNameOptions]);

  const filteredRows = useMemo(() => {
    const filtered = combinedRows.filter((row) => {
      const q = search.trim().toLowerCase();

      const matchesSearch =
        !q ||
        row.number.toLowerCase().includes(q) ||
        row.title.toLowerCase().includes(q) ||
        row.description.toLowerCase().includes(q) ||
        row.owner.toLowerCase().includes(q) ||
        row.project.toLowerCase().includes(q) ||
        row.linked_to.toLowerCase().includes(q);

      const matchesType = row.type === activeLogTab;
      const matchesStatus = statusFilter === "All" || row.status === statusFilter;
      const matchesSeverity =
        activeLogTab === "CAPA" || severityFilter === "All" || row.severity === severityFilter;
      const matchesSource =
        activeLogTab === "CAPA" || sourceFilter === "All" || row.source_type === sourceFilter;
      const matchesProject = projectFilter === "All" || row.project === projectFilter;
      const matchesOverdueOnly = !linkedOverdueOnly || dueState(row.due_date) === "overdue";
      const matchesDueWindow =
        linkedDueWindow <= 0 ||
        (() => {
          if (!row.due_date || row.status === "Closed") return false;
          const days = getOverdueDays(row.due_date);
          return days !== null && days >= 0 && days <= linkedDueWindow;
        })();
      const rowYear = row.created_at ? String(new Date(row.created_at).getFullYear()) : "";
      const matchesCreatedMonth = !linkedCreatedMonth || row.created_at?.startsWith(linkedCreatedMonth);
      const matchesClosedMonth =
        !linkedClosedMonth ||
        (row.status === "Closed" && (row.closed_at || row.created_at || "").startsWith(linkedClosedMonth));
      const matchesYear = yearFilter === "All Years" || rowYear === yearFilter;
      const matchesQuickFilter =
        !ncrQuickFilter ||
        (ncrQuickFilter === "All" && ["Open", "In Progress", "Closed"].includes(row.status)) ||
        (ncrQuickFilter === "Open" && row.status === "Open") ||
        (ncrQuickFilter === "In Progress" && row.status === "In Progress") ||
        (ncrQuickFilter === "Closed" && row.status === "Closed") ||
        (ncrQuickFilter === "Overdue" && dueState(row.due_date) === "overdue") ||
        (ncrQuickFilter === "DueSoon" && dueState(row.due_date) === "soon");

      const attention = dueState(row.due_date) === "overdue" || row.status === "Open";
      const matchesAttention = !showAttentionOnly || attention;

      return (
        matchesSearch &&
        matchesType &&
        matchesStatus &&
        matchesSeverity &&
        matchesSource &&
        matchesProject &&
        matchesDueWindow &&
        matchesCreatedMonth &&
        matchesClosedMonth &&
        matchesYear &&
        matchesOverdueOnly &&
        matchesQuickFilter &&
        matchesAttention
      );
    });

    return [...filtered].sort((a, b) => {
      const aCreated = new Date(a.created_at || 0).getTime();
      const bCreated = new Date(b.created_at || 0).getTime();

      if (activeLogTab === "NCR") {
        if (ncrSort) {
          const directionFactor = ncrSort.direction === "asc" ? 1 : -1;
          let result = 0;

          if (ncrSort.key === "number") {
            result = getTrailingNumber(a.number) - getTrailingNumber(b.number);
          } else if (ncrSort.key === "severity") {
            result = getNcrSeveritySortRank(a.severity) - getNcrSeveritySortRank(b.severity);
          } else if (ncrSort.key === "status") {
            result = getNcrStatusSortRank(a.status) - getNcrStatusSortRank(b.status);
          } else if (ncrSort.key === "due_date") {
            const aDueTime = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
            const bDueTime = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
            result = aDueTime - bDueTime;
          }

          if (result !== 0) return result * directionFactor;
          return bCreated - aCreated;
        }

        const aNumber = getTrailingNumber(a.number);
        const bNumber = getTrailingNumber(b.number);
        if (aNumber !== bNumber) return bNumber - aNumber;
        return bCreated - aCreated;
      }

      const aDueState = dueState(a.due_date);
      const bDueState = dueState(b.due_date);
      const aDueRank = aDueState === "overdue" ? 0 : aDueState === "soon" ? 1 : 2;
      const bDueRank = bDueState === "overdue" ? 0 : bDueState === "soon" ? 1 : 2;
      if (aDueRank !== bDueRank) return aDueRank - bDueRank;

      const aDueTime = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
      const bDueTime = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
      if (aDueTime !== bDueTime) return aDueTime - bDueTime;

      return bCreated - aCreated;
    });
  }, [
    combinedRows,
    search,
    statusFilter,
    severityFilter,
    sourceFilter,
    projectFilter,
    yearFilter,
    ncrQuickFilter,
    linkedOverdueOnly,
    linkedDueWindow,
    linkedCreatedMonth,
    linkedClosedMonth,
    showAttentionOnly,
    activeLogTab,
    ncrSort,
  ]);

  function clearFilters() {
    setSearch("");
    setStatusFilter("All");
    setSeverityFilter("All");
    setSourceFilter("All");
    setProjectFilter("All");
    setShowAttentionOnly(false);
    setNcrQuickFilter("");
    setYearFilter(String(new Date().getFullYear()));
  }

  function applyKpiFilter(filter: NcrQuickFilter) {
    setActiveWorkspaceView("register");
    setActiveLogTab("NCR");
    setNcrQuickFilter(filter);
  }

  function toggleNcrSort(key: NcrSortKey) {
    setNcrSort((current) => {
      if (!current || current.key !== key) return { key, direction: "asc" };
      return { key, direction: current.direction === "asc" ? "desc" : "asc" };
    });
  }

  function ncrSortLabel(key: NcrSortKey, label: string) {
    if (ncrSort?.key !== key) return label;
    return `${label} ${ncrSort.direction === "asc" ? "↑" : "↓"}`;
  }

  const kpis = useMemo(() => {
    const yearScopedNcrs = combinedRows.filter((row) => {
      if (row.type !== "NCR") return false;
      const rowYear = row.created_at ? String(new Date(row.created_at).getFullYear()) : "";
      return yearFilter === "All Years" || rowYear === yearFilter;
    });
    const openNcrsCount = yearScopedNcrs.filter((n) => n.status === "Open").length;
    const inProgressCount = yearScopedNcrs.filter((n) => n.status === "In Progress").length;
    const closedCount = yearScopedNcrs.filter((n) => n.status === "Closed").length;
    const totalNcrs = openNcrsCount + inProgressCount + closedCount;
    const overdue = yearScopedNcrs.filter((row) => dueState(row.due_date) === "overdue").length;
    const dueSoon = yearScopedNcrs.filter((row) => dueState(row.due_date) === "soon").length;

    return {
      totalNcrs,
      openItems: openNcrsCount,
      inProgress: inProgressCount,
      closed: closedCount,
      overdue,
      dueSoon,
    };
  }, [combinedRows, yearFilter]);

  const yearScopedNcrRows = useMemo(() => {
    return combinedRows.filter((row) => {
      if (row.type !== "NCR") return false;
      const rowYear = row.created_at ? String(new Date(row.created_at).getFullYear()) : "";
      return yearFilter === "All Years" || rowYear === yearFilter;
    });
  }, [combinedRows, yearFilter]);

  const ncrStatusStory = useMemo(
    () =>
      statusOptions.map((status) => ({
        label: status,
        value: yearScopedNcrRows.filter((row) => row.status === status).length,
        color: status === "Closed" ? "#005670" : status === "In Progress" ? "#53565A" : "#FFAD00",
      })),
    [statusOptions, yearScopedNcrRows]
  );

  const ncrSeverityStory = useMemo(
    () =>
      severityOptions.map((severity) => ({
        label: severity,
        value: yearScopedNcrRows.filter((row) => row.severity === severity).length,
        color: severity === "High" ? "#F93822" : severity === "Medium" ? "#FFAD00" : "#005670",
      })),
    [severityOptions, yearScopedNcrRows]
  );

  const ncrSourceStory = useMemo(
    () =>
      sourceOptions.map((source) => ({
        label: source,
        value: yearScopedNcrRows.filter((row) => row.source_type === source).length,
        color: source === "Supplier" ? "#63B1BC" : source === "External" ? "#53565A" : "#005670",
      })),
    [sourceOptions, yearScopedNcrRows]
  );

  const ncrDueStory = useMemo(
    () => [
      {
        label: "Overdue",
        value: yearScopedNcrRows.filter((row) => dueState(row.due_date) === "overdue").length,
        color: "#F93822",
      },
      {
        label: "Due 7 Days",
        value: yearScopedNcrRows.filter((row) => dueState(row.due_date) === "soon").length,
        color: "#FFAD00",
      },
      {
        label: "In Date",
        value: yearScopedNcrRows.filter((row) => dueState(row.due_date) === "ok").length,
        color: "#005670",
      },
      {
        label: "No Due Date",
        value: yearScopedNcrRows.filter((row) => !row.due_date).length,
        color: "#53565A",
      },
    ],
    [yearScopedNcrRows]
  );

  const ncrClosureRate = useMemo(() => {
    if (kpis.totalNcrs === 0) return 0;
    return Math.round((kpis.closed / kpis.totalNcrs) * 100);
  }, [kpis.closed, kpis.totalNcrs]);

  const latestRecordLabel = useMemo(() => {
    const latest = combinedRows.find((row) => row.type === "NCR");
    return latest ? `${latest.number} - ${latest.title}` : "No NCR records";
  }, [combinedRows]);

  const topRaisedNcrs = useMemo(() => {
    return [...ncrs]
      .sort((a, b) => {
        const severityRank = getSeverityRank(a.severity) - getSeverityRank(b.severity);
        if (severityRank !== 0) return severityRank;

        const aTime = new Date(a.created_at || 0).getTime();
        const bTime = new Date(b.created_at || 0).getTime();
        return bTime - aTime;
      })
      .slice(0, 5);
  }, [ncrs]);

  const topUpcomingCapas = useMemo(() => {
    return [...capas]
      .sort((a, b) => {
        const aState = dueState(a.due_date);
        const bState = dueState(b.due_date);
        const aRank = aState === "overdue" ? 0 : aState === "soon" ? 1 : 2;
        const bRank = bState === "overdue" ? 0 : bState === "soon" ? 1 : 2;
        if (aRank !== bRank) return aRank - bRank;

        const aTime = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      })
      .slice(0, 5);
  }, [capas]);

  const newCapaLinkedItems = useMemo(() => {
    return newCapa.linked_to
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }, [newCapa.linked_to]);

  const editCapaLinkedItems = useMemo(() => {
    if (!editRow || editRow.type !== "CAPA") return [];
    return editRow.linked_to
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }, [editRow]);

  function handleCreateNcrFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (!requireCreatePermission("Adding NCR evidence")) {
      event.target.value = "";
      return;
    }
    setCreateNcrFiles(Array.from(event.target.files || []));
  }

  function handleCreateCapaFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (!requireCreatePermission("Adding CAPA evidence")) {
      event.target.value = "";
      return;
    }
    setCreateCapaFiles(Array.from(event.target.files || []));
  }

  function handleSelectedEvidenceFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (!requireEditPermission("Adding evidence")) {
      event.target.value = "";
      return;
    }
    setSelectedEvidenceFiles(Array.from(event.target.files || []));
  }

  async function uploadEvidenceForRecord(
    recordType: "NCR" | "CAPA",
    recordId: string,
    files: File[],
    notes: string
  ) {
    if (!files.length) return { ok: true as const };

    const uploadedPaths: string[] = [];
    const metadataRows: Array<{
      record_type: "NCR" | "CAPA";
      record_id: string;
      file_name: string;
      file_path: string;
      file_size: number;
      content_type: string;
      notes: string | null;
      uploaded_at: string;
    }> = [];

    for (const file of files) {
      const safeName = sanitizeFileName(file.name);
      const filePath = `${recordType}/${recordId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("quality-evidence")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        return { ok: false as const, message: uploadError.message };
      }

      uploadedPaths.push(filePath);

      metadataRows.push({
        record_type: recordType,
        record_id: recordId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        content_type: file.type || "application/octet-stream",
        notes: notes.trim() || null,
        uploaded_at: new Date().toISOString(),
      });
    }

    const { error: metadataError } = await supabase.from("evidence_files").insert(metadataRows);

    if (metadataError) {
      const shouldRetryLegacyInsert =
        metadataError.code === "PGRST204" ||
        /content_type|notes|uploaded_at|schema cache/i.test(metadataError.message);

      if (shouldRetryLegacyInsert) {
        const legacyRows = metadataRows.map(({ content_type, notes, uploaded_at, ...row }) => row);
        const { error: legacyError } = await supabase.from("evidence_files").insert(legacyRows);
        if (!legacyError) return { ok: true as const };
      }

      if (uploadedPaths.length > 0) {
        await supabase.storage.from("quality-evidence").remove(uploadedPaths);
      }

      return { ok: false as const, message: metadataError.message };
    }

    return { ok: true as const };
  }

  function addLinkedNcrToNewCapa() {
    if (!newLinkedNcrToAdd) return;

    setNewCapa((prev) => {
      const existing = prev.linked_to
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      if (existing.includes(newLinkedNcrToAdd)) {
        return prev;
      }

      return {
        ...prev,
        linked_to: [...existing, newLinkedNcrToAdd].join(", "),
      };
    });

    setNewLinkedNcrToAdd("");
  }

  function removeLinkedNcrFromNewCapa(reference: string) {
    setNewCapa((prev) => {
      const next = prev.linked_to
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .filter((item) => item !== reference);

      return {
        ...prev,
        linked_to: next.join(", "),
      };
    });
  }

  function addLinkedNcrToEditCapa() {
    if (!editLinkedNcrToAdd || !editRow || editRow.type !== "CAPA") return;

    const existing = editRow.linked_to
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (existing.includes(editLinkedNcrToAdd)) {
      setEditLinkedNcrToAdd("");
      return;
    }

    setEditRow({
      ...editRow,
      linked_to: [...existing, editLinkedNcrToAdd].join(", "),
    });
    setEditLinkedNcrToAdd("");
  }

  function removeLinkedNcrFromEditCapa(reference: string) {
    if (!editRow || editRow.type !== "CAPA") return;

    const next = editRow.linked_to
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((item) => item !== reference);

    setEditRow({
      ...editRow,
      linked_to: next.join(", "),
    });
  }

  async function createNcr() {
    if (!requireCreatePermission("Creating NCRs")) return;

    if (!newNcr.title.trim()) {
      alert("Please enter an NCR title.");
      return;
    }

    setSaving(true);

    const nextNumber = buildNextNumber("NCR", ncrs.map((n) => n.ncr_number));

    const { data, error } = await supabase
      .from("ncrs")
      .insert([
          {
            ncr_number: nextNumber,
            title: newNcr.title.trim(),
            description: newNcr.description.trim() || null,
            containment_action: newNcr.containment_action.trim() || null,
            corrective_action: newNcr.corrective_action.trim() || null,
            severity: newNcr.severity,
            status: newNcr.status,
            owner: newNcr.owner.trim() || null,
            area: newNcr.area.trim() || null,
            due_date: newNcr.due_date || null,
            closed_at: newNcr.status === "Closed" ? new Date().toISOString() : null,
            project: newNcr.project.trim() || null,
            source_type: newNcr.source_type,
            root_cause_category: resolveRootCauseCategory(newNcr.root_cause_category, newRootCauseOther) || null,
            root_cause_description: newNcr.root_cause_description.trim() || null,
          },
      ])
      .select("*")
      .single();

    if (error || !data) {
      setSaving(false);
      alert(`Error creating NCR: ${error?.message || "Unknown error"}`);
      return;
    }

    if (createNcrFiles.length > 0) {
      const uploadResult = await uploadEvidenceForRecord(
        "NCR",
        data.id,
        createNcrFiles,
        createNcrEvidenceNotes
      );

      if (!uploadResult.ok) {
        setSaving(false);
        setMessage(`NCR created, but evidence upload failed: ${uploadResult.message}`);
        await loadData();
        return;
      }
    }

    setNewNcr({
      title: "",
      description: "",
      containment_action: "",
      corrective_action: "",
      severity: "Medium",
      status: "Open",
      owner: "",
      area: "",
      due_date: "",
      project: "",
      source_type: "Internal",
      root_cause_category: "",
      root_cause_description: "",
    });
    setCreateNcrFiles([]);
    setCreateNcrEvidenceNotes("");
    setNewRootCauseOther("");
    setSaving(false);
    setMessage(`${nextNumber} created successfully.`);
    await loadData();
    await loadNcrOptions();
  }

  async function createCapa() {
    if (!requireCreatePermission("Creating CAPAs")) return;

    if (!newCapa.title.trim()) {
      alert("Please enter a CAPA title.");
      return;
    }

    setSaving(true);

    if (
      newCapa.status === "Closed" &&
      normaliseEffectivenessStatus(newCapa.effectiveness_status) !== "Effective"
    ) {
      setSaving(false);
      setMessage("CAPA cannot be closed until effectiveness is reviewed and marked Effective.");
      return;
    }

    const nextNumber = buildNextNumber("CAPA", capas.map((c) => c.capa_number));
    const cleanedLinkedTo = newCapa.linked_to
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .join(", ");

    const { data, error } = await supabase
      .from("capas")
      .insert([
        {
          capa_number: nextNumber,
          title: newCapa.title.trim(),
          description: newCapa.description.trim() || null,
          status: newCapa.status,
          owner: newCapa.owner.trim() || null,
          due_date: newCapa.due_date || null,
          linked_to: cleanedLinkedTo || null,
          project: newCapa.project.trim() || null,
          correction_description: newCapa.correction_description.trim() || null,
          corrective_action_description: newCapa.corrective_action_description.trim() || null,
          effectiveness_status: normaliseEffectivenessStatus(newCapa.effectiveness_status),
          effectiveness_review_date: newCapa.effectiveness_review_date || null,
          effectiveness_reviewer: newCapa.effectiveness_reviewer.trim() || null,
          effectiveness_comments: newCapa.effectiveness_comments.trim() || null,
          effectiveness_due_date: newCapa.effectiveness_due_date || null,
        },
      ])
      .select("*")
      .single();

    if (error || !data) {
      setSaving(false);
      alert(`Error creating CAPA: ${error?.message || "Unknown error"}`);
      return;
    }

    if (createCapaFiles.length > 0) {
      const uploadResult = await uploadEvidenceForRecord(
        "CAPA",
        data.id,
        createCapaFiles,
        createCapaEvidenceNotes
      );

      if (!uploadResult.ok) {
        setSaving(false);
        setMessage(`CAPA created, but evidence upload failed: ${uploadResult.message}`);
        await loadData();
        return;
      }
    }

    setNewCapa({
      title: "",
      description: "",
      status: "Open",
      owner: "",
      due_date: "",
      linked_to: "",
      project: "",
      correction_description: "",
      corrective_action_description: "",
      effectiveness_status: "Pending",
      effectiveness_review_date: "",
      effectiveness_reviewer: "",
      effectiveness_comments: "",
      effectiveness_due_date: "",
    });
    setCreateCapaFiles([]);
    setCreateCapaEvidenceNotes("");
    setNewLinkedNcrToAdd("");
    setSaving(false);
    setMessage(`${nextNumber} created successfully.`);
    await loadData();
  }

  async function saveEdit() {
    if (!editRow) return;
    if (!requireEditPermission("Saving NCR/CAPA changes")) return;

    setSaving(true);

    if (editRow.type === "NCR") {
      const wasClosed = (selectedRow?.status || "").trim().toLowerCase() === "closed";
      const isClosed = (editRow.status || "").trim().toLowerCase() === "closed";
      const nextClosedAt = !wasClosed && isClosed ? new Date().toISOString() : wasClosed && !isClosed ? null : selectedRow?.closed_at || null;

      const { error } = await supabase
        .from("ncrs")
        .update({
          title: editRow.title || null,
          description: editRow.description || null,
          containment_action: editRow.containment_action || null,
          corrective_action: editRow.corrective_action || null,
          severity: editRow.severity || null,
          status: editRow.status || null,
          owner: editRow.owner || null,
          area: editRow.area || null,
          due_date: editRow.due_date || null,
          closed_at: nextClosedAt,
          project: editRow.project || null,
          source_type: editRow.source_type || "Internal",
          root_cause_category:
            resolveRootCauseCategory(editRow.root_cause_category, editRootCauseOther) || null,
          root_cause_description: editRow.root_cause_description || null,
        })
        .eq("id", editRow.id);

      if (error) {
        setSaving(false);
        alert(`Error saving NCR: ${error.message}`);
        return;
      }
    } else {
      if (
        editRow.status === "Closed" &&
        normaliseEffectivenessStatus(editRow.effectiveness_status) !== "Effective"
      ) {
        setSaving(false);
        setMessage("CAPA cannot be closed until effectiveness is reviewed and marked Effective.");
        return;
      }

      const cleanedLinkedTo = editRow.linked_to
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .join(", ");

      const { error } = await supabase
        .from("capas")
        .update({
          title: editRow.title || null,
          description: editRow.description || null,
          status: editRow.status || null,
          owner: editRow.owner || null,
          due_date: editRow.due_date || null,
          linked_to: cleanedLinkedTo || null,
          project: editRow.project || null,
          correction_description: editRow.correction_description || null,
          corrective_action_description: editRow.corrective_action_description || null,
          effectiveness_status: normaliseEffectivenessStatus(editRow.effectiveness_status),
          effectiveness_review_date: editRow.effectiveness_review_date || null,
          effectiveness_reviewer: editRow.effectiveness_reviewer || null,
          effectiveness_comments: editRow.effectiveness_comments || null,
          effectiveness_due_date: editRow.effectiveness_due_date || null,
        })
        .eq("id", editRow.id);

      if (error) {
        setSaving(false);
        alert(`Error saving CAPA: ${error.message}`);
        return;
      }
    }

    setSaving(false);
    setMessage(`${editRow.number} updated successfully.`);
    await loadData();
    await loadNcrOptions();
  }

  async function deleteSelected() {
    if (!selectedRow) return;
    if (!requireEditPermission("Deleting NCR/CAPA records")) return;

    const confirmed = window.confirm(
      `Delete ${selectedRow.number}? This does not automatically delete evidence files.`
    );
    if (!confirmed) return;

    setSaving(true);

    const table = selectedRow.type === "NCR" ? "ncrs" : "capas";
    const { error } = await supabase.from(table).delete().eq("id", selectedRow.id);

    setSaving(false);

    if (error) {
      alert(`Error deleting record: ${error.message}`);
      return;
    }

    setSelectedRow(null);
    setEditRow(null);
    setMessage("Record deleted successfully.");
    await loadData();
    await loadNcrOptions();
  }

  async function uploadEvidenceToSelected() {
    if (!requireEditPermission("Uploading evidence")) return;

    if (!selectedRow) {
      setMessage("Select a record first.");
      return;
    }

    if (!selectedEvidenceFiles.length) {
      setMessage("Select at least one evidence file to upload.");
      return;
    }

    setUploadingEvidence(true);

    const uploadResult = await uploadEvidenceForRecord(
      selectedRow.type,
      selectedRow.id,
      selectedEvidenceFiles,
      selectedEvidenceNotes
    );

    setUploadingEvidence(false);

    if (!uploadResult.ok) {
      setMessage(`Evidence upload failed: ${uploadResult.message}`);
      return;
    }

    setSelectedEvidenceFiles([]);
    setSelectedEvidenceNotes("");
    setMessage("Evidence uploaded successfully.");
    await loadData();
  }

  async function createEvidenceSignedUrl(filePath: string, expiresIn = 900) {
    const { data, error } = await supabase.storage
      .from("quality-evidence")
      .createSignedUrl(filePath, expiresIn);

    if (error || !data?.signedUrl) {
      throw new Error(error?.message || "Could not create a signed evidence URL.");
    }

    return data.signedUrl;
  }

  async function openEvidence(file: EvidenceFile) {
    try {
      const signedUrl = await createEvidenceSignedUrl(file.file_path, 300);
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setMessage(
        `Could not open file: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      return;
    }
  }

  async function deleteEvidence(file: EvidenceFile) {
    if (!requireEditPermission("Deleting evidence")) return;

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
    await loadData();
  }

  async function openSavedPdf(file: NcrCapaPdf) {
    const { data, error } = await supabase.storage
      .from("quality-evidence")
      .createSignedUrl(file.file_path, 300);

    if (error || !data?.signedUrl) {
      setMessage(`Could not open saved PDF: ${error?.message || "Unknown error"}`);
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function generateNcrPdf() {
    if (!requireEditPermission("Generating saved NCR PDFs")) return;

    if (!selectedRow || selectedRow.type !== "NCR") {
      setMessage("Select an NCR first.");
      return;
    }

    try {
      setGeneratingPdf(true);

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      const title = externalFacingPdf
        ? "Supplier / Client NCR Response Form"
        : "Non-Conformance Report";

      try {
        const logoResponse = await fetch("/enshore-primary-logo-colour.png");
        if (logoResponse.ok) {
          const logoBlob = await logoResponse.blob();
          const logoFile = new File([logoBlob], "enshore-primary-logo-colour.png", {
            type: logoBlob.type || "image/png",
          });
          const logoDataUrl = await toDataUrl(logoFile);
          doc.addImage(logoDataUrl, "PNG", margin, 10, 48, 24);
        }
      } catch {
        // Keep PDF generation resilient if the logo cannot be loaded.
      }

      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(18);
      doc.text(title, pageWidth - margin, 17, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(83, 86, 90);
      doc.text(`Reference: ${selectedRow.number}`, pageWidth - margin, 24, { align: "right" });
      doc.text(`Generated: ${new Date().toLocaleString("en-GB")}`, pageWidth - margin, 30, {
        align: "right",
      });

      doc.setDrawColor(0, 86, 112);
      doc.setLineWidth(0.7);
      doc.line(margin, 37, pageWidth - margin, 37);

      autoTable(doc, {
        startY: 44,
        theme: "grid",
        margin: { left: margin, right: margin },
        head: [["Field", "Value", "Field", "Value"]],
        body: [
          ["NCR Number", selectedRow.number, "Status", selectedRow.status || ""],
          ["Title", selectedRow.title || "", "Severity", getSeverityDisplay(selectedRow.severity)],
          ["Source Type", selectedRow.source_type || "", "Project", selectedRow.project || ""],
          ["Owner", selectedRow.owner || "", "Due Date", formatDate(selectedRow.due_date)],
        ],
        styles: {
          font: "helvetica",
          fontSize: 9,
          cellPadding: 2.4,
          lineColor: [208, 208, 206],
          lineWidth: 0.2,
          textColor: [0, 0, 0],
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: [0, 86, 112],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        columnStyles: {
          0: { cellWidth: 28, fontStyle: "bold" },
          1: { cellWidth: 60 },
          2: { cellWidth: 28, fontStyle: "bold" },
          3: { cellWidth: 60 },
        },
      });

      let y = ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 44) + 8;

      const drawHeading = (heading: string) => {
        if (y > pageHeight - 40) {
          doc.addPage();
          y = 18;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(heading, margin, y);
        y += 5;
      };

      const drawParagraphBox = (label: string, value: string, minHeight = 22) => {
        if (y > pageHeight - 55) {
          doc.addPage();
          y = 18;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(0, 0, 0);
        doc.text(label, margin, y);
        const text = getPdfText(value);
        const lines = text ? doc.splitTextToSize(text, pageWidth - margin * 2 - 4) : [];
        const bodyHeight = Math.max(minHeight, lines.length * 4.5 + 6);
        doc.setDrawColor(208, 208, 206);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(margin, y + 2, pageWidth - margin * 2, bodyHeight, 1.8, 1.8, "FD");
        if (lines.length > 0) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.2);
          doc.setTextColor(83, 86, 90);
          doc.text(lines, margin + 2, y + 7);
        }
        y += bodyHeight + 8;
      };

      const drawKeyValueTable = (rows: Array<[string, string]>) => {
        if (y > pageHeight - 60) {
          doc.addPage();
          y = 18;
        }
        autoTable(doc, {
          startY: y,
          theme: "grid",
          margin: { left: margin, right: margin },
          body: rows,
          styles: {
            font: "helvetica",
            fontSize: 8.8,
            cellPadding: 2.2,
            lineColor: [208, 208, 206],
            lineWidth: 0.2,
            textColor: [0, 0, 0],
            overflow: "linebreak",
            valign: "top",
          },
          columnStyles: {
            0: { cellWidth: 46, fontStyle: "bold", fillColor: [236, 236, 231] },
            1: { cellWidth: 136 },
          },
        });
        y = ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || y) + 8;
      };

      drawHeading("NCR DETAILS");
      drawParagraphBox("Issue / Description", selectedRow.description, 28);
      drawParagraphBox("Containment Action", selectedRow.containment_action, 20);
      drawParagraphBox("Corrective Action", selectedRow.corrective_action, 20);
      drawParagraphBox("Root Cause Category", selectedRow.root_cause_category, 12);
      drawParagraphBox("Root Cause Description", selectedRow.root_cause_description, 22);

        const evidenceUrlMap = new Map<string, string>();

        if (externalFacingPdf) {
          drawHeading("SUPPLIER / CLIENT RESPONSE");
          drawParagraphBox("Response / Proposed Action", "", 28);
          drawParagraphBox("Acknowledgement / Responsible Contact", "", 18);
      }

        if (includeEvidenceListInPdf) {
          drawHeading("EVIDENCE LIST");

          if (selectedNcrPdfEvidence.length === 0) {
            drawParagraphBox("Attached Evidence", "No evidence files listed for this export.", 14);
          } else {
            await Promise.all(
              selectedNcrPdfEvidence.map(async (file) => {
                try {
                  const signedUrl = await createEvidenceSignedUrl(file.file_path);
                  evidenceUrlMap.set(file.id, signedUrl);
                } catch (error) {
                  console.warn(`Evidence link unavailable for ${file.file_name}`, error);
                }
              })
            );

              const evidenceRows = selectedNcrPdfEvidence.map((file) => ({
                record: selectedRow.number,
                file_name: file.file_name,
                uploaded: formatDateTime(file.uploaded_at),
                file_type: getEvidenceTypeLabel(file),
                reference: file.notes || "",
                link: "",
                url: evidenceUrlMap.get(file.id) || "",
              }));

            autoTable(doc, {
              startY: y,
              theme: "grid",
              margin: { left: margin, right: margin },
              columns: [
                { header: "Record", dataKey: "record" },
                { header: "File Name", dataKey: "file_name" },
                { header: "Type", dataKey: "file_type" },
                { header: "Uploaded", dataKey: "uploaded" },
                { header: "Reference", dataKey: "reference" },
                { header: "Link", dataKey: "link" },
              ],
              body: evidenceRows,
              styles: {
                font: "helvetica",
                fontSize: 8.6,
                cellPadding: 2.1,
                lineColor: [208, 208, 206],
              lineWidth: 0.2,
              textColor: [0, 0, 0],
              overflow: "linebreak",
            },
              headStyles: {
                fillColor: [0, 0, 0],
                textColor: [255, 255, 255],
                fontStyle: "bold",
              },
              columnStyles: {
                record: { cellWidth: 24 },
                file_name: { cellWidth: 52 },
                file_type: { cellWidth: 24 },
                uploaded: { cellWidth: 28 },
                reference: { cellWidth: 38 },
                link: { cellWidth: 24 },
              },
              didDrawCell: (data) => {
                if (data.section !== "body" || data.column.dataKey !== "link") return;

                const row = data.row.raw as (typeof evidenceRows)[number];
                if (!row.url) return;

                const linkText = "Open evidence";
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8.6);
                doc.setTextColor(0, 86, 112);
                doc.textWithLink(
                  linkText,
                  data.cell.x + 1.8,
                  data.cell.y + data.cell.height / 2 + 1.4,
                  { url: row.url }
                );
                doc.setTextColor(0, 0, 0);
              },
            });

            y = ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || y) + 8;

            const imageEvidence = selectedNcrPdfEvidence.filter((file) => isImageEvidence(file));

            if (imageEvidence.length > 0) {
              drawHeading("EVIDENCE IMAGES");

              for (const file of imageEvidence) {
                const signedUrl = evidenceUrlMap.get(file.id);
                if (!signedUrl) continue;

                try {
                  const preview = await fetchImagePreviewData(signedUrl);
                  const maxImageWidth = pageWidth - margin * 2;
                  const maxImageHeight = pageHeight - margin - 34;
                  const widthRatio = maxImageWidth / preview.width;
                  const heightRatio = maxImageHeight / preview.height;
                  const scale = Math.min(widthRatio, heightRatio, 1);
                  const drawWidth = preview.width * scale;
                  const drawHeight = preview.height * scale;
                  const captionLines = doc.splitTextToSize(
                    file.notes ? `${file.file_name} - ${file.notes}` : file.file_name,
                    maxImageWidth
                  );
                  const captionHeight = Math.max(6, captionLines.length * 4.2);
                  const metaLine = `${selectedRow.number} | ${formatDateTime(file.uploaded_at)}`;
                  const blockHeight = captionHeight + 5 + drawHeight + 10;

                  if (y + blockHeight > pageHeight - margin) {
                    doc.addPage();
                    y = 18;
                  }

                  doc.setFont("helvetica", "bold");
                  doc.setFontSize(9.4);
                  doc.setTextColor(0, 0, 0);
                  doc.text(captionLines, margin, y);
                  y += captionHeight;

                  doc.setFont("helvetica", "normal");
                  doc.setFontSize(8.2);
                  doc.setTextColor(83, 86, 90);
                  doc.text(metaLine, margin, y);
                  y += 4;

                  doc.setDrawColor(208, 208, 206);
                  doc.roundedRect(margin, y, drawWidth, drawHeight, 1.2, 1.2);
                  doc.addImage(preview.dataUrl, "PNG", margin, y, drawWidth, drawHeight, undefined, "FAST");
                  y += drawHeight + 8;
                } catch (error) {
                  console.warn(`Image preview skipped for ${file.file_name}`, error);
                }
              }
            }
          }
        }

      const pageCount = doc.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) {
        doc.setPage(page);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.8);
        doc.setTextColor(83, 86, 90);
        doc.text(`Enshore | ${selectedRow.number}`, margin, pageHeight - 8);
        doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 8, {
          align: "right",
        });
      }

      const fileName = `${selectedRow.number}-${externalFacingPdf ? "external" : "internal"}-ncr-report.pdf`
        .replace(/[^a-zA-Z0-9._-]/g, "-");
      const pdfBlob = doc.output("blob");
      const safeFileName = sanitizeFileName(fileName);
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filePath = `NCR-PDF/${selectedRow.id}/${timestamp}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("quality-evidence")
        .upload(filePath, pdfBlob, {
          cacheControl: "3600",
          upsert: false,
          contentType: "application/pdf",
        });

      if (uploadError) {
        setMessage(`PDF upload failed: ${uploadError.message}`);
        return;
      }

      const { data: authData } = await supabase.auth.getUser();
      const generatedBy = authData.user?.email || authData.user?.id || null;

      const { error: metadataError } = await supabase.from("ncr_capa_pdfs").insert([
        {
          ncr_id: selectedRow.id,
          file_name: fileName,
          file_path: filePath,
          generated_by: generatedBy,
          include_linked_capa: false,
          include_evidence_list: includeEvidenceListInPdf,
          external_facing: externalFacingPdf,
        },
      ]);

      if (metadataError) {
        setMessage(`PDF metadata save failed: ${metadataError.message}`);
        return;
      }

      setMessage("NCR PDF generated and saved successfully.");
      await loadData();
    } catch (error) {
      console.error(error);
      setMessage("NCR PDF generation failed.");
    } finally {
      setGeneratingPdf(false);
    }
  }

  async function generateNcrWord() {
    if (!selectedRow || selectedRow.type !== "NCR") {
      setMessage("Select an NCR first.");
      return;
    }

    try {
      setGeneratingWord(true);

      const title = externalFacingPdf
        ? "Supplier / Client NCR Response Form"
        : "Non-Conformance Report";
      const generatedAt = new Date().toLocaleString("en-GB");
      const children: Array<Paragraph | Table> = [];
      let logoData: ArrayBuffer | null = null;

      try {
        const logoResponse = await fetch("/enshore-primary-logo-colour.png");
        if (logoResponse.ok) {
          logoData = await logoResponse.arrayBuffer();
        }
      } catch {
        // Keep Word generation resilient if the logo cannot be loaded.
      }

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          layout: TableLayoutType.FIXED,
          columnWidths: [3600, 5760],
          borders: wordPlainBorders(),
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 3600, type: WidthType.DXA },
                  margins: { top: 0, bottom: 0, left: 0, right: 0 },
                  children: [
                    new Paragraph({
                      children: logoData
                        ? [
                            new ImageRun({
                              type: "png",
                              data: logoData,
                              transformation: { width: 170, height: 85 },
                            }),
                          ]
                        : [new TextRun({ text: "ENSHORE", font: "Azo Sans", bold: true, size: 30 })],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 5760, type: WidthType.DXA },
                  margins: { top: 90, bottom: 0, left: 0, right: 0 },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.RIGHT,
                      spacing: { after: 55 },
                      children: [new TextRun({ text: title, font: "Azo Sans", bold: true, size: 30, color: "000000" })],
                    }),
                    new Paragraph({
                      alignment: AlignmentType.RIGHT,
                      spacing: { after: 35 },
                      children: [new TextRun({ text: `Reference: ${selectedRow.number}`, font: "Azo Sans", size: 20, color: "53565A" })],
                    }),
                    new Paragraph({
                      alignment: AlignmentType.RIGHT,
                      children: [new TextRun({ text: `Generated: ${generatedAt}`, font: "Azo Sans", size: 20, color: "53565A" })],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
        new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, color: "005670", size: 8 } },
          spacing: { before: 70, after: 240 },
          children: [new TextRun({ text: "", size: 1 })],
        }),
        wordKeyValueTable([
          ["NCR Number", selectedRow.number, "Status", selectedRow.status || ""],
          ["Title", selectedRow.title || "", "Severity", getSeverityDisplay(selectedRow.severity)],
          ["Source Type", selectedRow.source_type || "", "Project", selectedRow.project || ""],
          ["Owner", selectedRow.owner || "", "Due Date", formatDate(selectedRow.due_date)],
        ]),
        wordHeading("NCR DETAILS"),
        ...wordParagraphBox("Issue / Description", selectedRow.description),
        ...wordParagraphBox("Containment Action", selectedRow.containment_action),
        ...wordParagraphBox("Corrective Action", selectedRow.corrective_action),
        ...wordParagraphBox("Root Cause Category", selectedRow.root_cause_category),
        ...wordParagraphBox("Root Cause Description", selectedRow.root_cause_description)
      );

      const evidenceUrlMap = new Map<string, string>();

      if (externalFacingPdf) {
        children.push(
          wordHeading("SUPPLIER / CLIENT RESPONSE"),
          ...wordParagraphBox("Response / Proposed Action", ""),
          ...wordParagraphBox("Acknowledgement / Responsible Contact", "")
        );
      }

      if (includeEvidenceListInPdf) {
        children.push(wordHeading("EVIDENCE LIST"));

        if (selectedNcrPdfEvidence.length === 0) {
          children.push(...wordParagraphBox("Attached Evidence", "No evidence files listed for this export."));
        } else {
          await Promise.all(
            selectedNcrPdfEvidence.map(async (file) => {
              try {
                const signedUrl = await createEvidenceSignedUrl(file.file_path);
                evidenceUrlMap.set(file.id, signedUrl);
              } catch (error) {
                console.warn(`Evidence link unavailable for ${file.file_name}`, error);
              }
            })
          );

          children.push(
            wordTable(
              [
                new TableRow({
                  children: [
                    wordCell("Record", { fill: "000000", color: "FFFFFF", bold: true, width: 1200 }),
                    wordCell("File Name", { fill: "000000", color: "FFFFFF", bold: true, width: 2600 }),
                    wordCell("Type", { fill: "000000", color: "FFFFFF", bold: true, width: 1200 }),
                    wordCell("Uploaded", { fill: "000000", color: "FFFFFF", bold: true, width: 1600 }),
                    wordCell("Reference", { fill: "000000", color: "FFFFFF", bold: true, width: 1800 }),
                    wordCell("Link", { fill: "000000", color: "FFFFFF", bold: true, width: 960 }),
                  ],
                }),
                ...selectedNcrPdfEvidence.map((file) => {
                  const url = evidenceUrlMap.get(file.id);
                  return new TableRow({
                  children: [
                    wordCell(selectedRow.number, { width: 1200 }),
                    wordCell(file.file_name, { width: 2600 }),
                    wordCell(getEvidenceTypeLabel(file), { width: 1200 }),
                    wordCell(formatDateTime(file.uploaded_at), { width: 1600 }),
                    wordCell(file.notes || "", { width: 1800 }),
                    wordCell(
                      [
                        new Paragraph({
                          children: url
                            ? [
                                new ExternalHyperlink({
                                  link: url,
                                  children: [
                                    new TextRun({
                                      text: "Open evidence",
                                      style: "Hyperlink",
                                    }),
                                  ],
                                }),
                              ]
                            : [new TextRun({ text: "Unavailable", size: 18 })],
                        }),
                      ],
                      { width: 960 }
                    ),
                  ],
                  });
                }),
              ],
              [1200, 2600, 1200, 1600, 1800, 960]
            )
          );

          const imageEvidence = selectedNcrPdfEvidence.filter((file) => isImageEvidence(file));

          if (imageEvidence.length > 0) {
            children.push(wordHeading("EVIDENCE IMAGES"));

            for (const file of imageEvidence) {
              const signedUrl = evidenceUrlMap.get(file.id);
              if (!signedUrl) continue;

              try {
                const preview = await fetchImagePreviewData(signedUrl);
                const imageResponse = await fetch(signedUrl);
                if (!imageResponse.ok) continue;

                const imageData = await imageResponse.arrayBuffer();
                const maxWidth = 520;
                const maxHeight = 640;
                const scale = Math.min(maxWidth / preview.width, maxHeight / preview.height, 1);
                const extension = (file.content_type || file.file_name).toLowerCase().includes("jpg") ||
                  (file.content_type || file.file_name).toLowerCase().includes("jpeg")
                    ? "jpg"
                    : "png";

                children.push(
                  wordParagraph(file.notes ? `${file.file_name} - ${file.notes}` : file.file_name, {
                    bold: true,
                    size: 19,
                    color: "000000",
                    spacingAfter: 40,
                  }),
                  wordParagraph(`${selectedRow.number} | ${formatDateTime(file.uploaded_at)}`, {
                    size: 16,
                    color: "53565A",
                    spacingAfter: 80,
                  }),
                  new Paragraph({
                    spacing: { after: 180 },
                    children: [
                      new ImageRun({
                        type: extension,
                        data: imageData,
                        transformation: {
                          width: Math.round(preview.width * scale),
                          height: Math.round(preview.height * scale),
                        },
                      }),
                    ],
                  })
                );
              } catch (error) {
                console.warn(`Word image preview skipped for ${file.file_name}`, error);
              }
            }
          }
        }
      }

      const wordDoc = new WordDocument({
        styles: {
          default: {
            document: {
              run: {
                font: "Azo Sans",
                size: 19,
                color: "000000",
              },
            },
          },
        },
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: 360,
                  right: 720,
                  bottom: 900,
                  left: 720,
                  footer: 360,
                },
              },
            },
            footers: {
              default: wordReportFooter(selectedRow.number),
            },
            children,
          },
        ],
      });

      const blob = await Packer.toBlob(wordDoc);
      const fileName = `${selectedRow.number}-${externalFacingPdf ? "external" : "internal"}-ncr-report.docx`
        .replace(/[^a-zA-Z0-9._-]/g, "-");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setMessage(`${selectedRow.number} Word report generated.`);
    } catch (error) {
      console.error(error);
      setMessage("NCR Word generation failed.");
    } finally {
      setGeneratingWord(false);
    }
  }

  async function generateFilteredNcrReport() {
    const filteredNcrRows = filteredRows.filter((row) => row.type === "NCR");

    if (filteredNcrRows.length === 0) {
      setMessage("No filtered NCRs available for report generation.");
      return;
    }

    try {
      setGeneratingFilteredNcrReport(true);

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;
      const generatedAt = new Date().toLocaleString("en-GB");
      const filterSummaryRows = [
        ["Status", statusFilter],
        ["Severity", severityFilter],
        ["Source Type", sourceFilter],
        ["Project", projectFilter],
        ["Year", yearFilter],
        ["Search", search.trim() || "None"],
        ["Quick Filter", ncrQuickFilter || "None"],
      ];

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
      doc.text("Filtered NCR Report", pageWidth / 2, 17, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(83, 86, 90);
      doc.text("Management meeting register of NCRs matching the current register filters.", pageWidth / 2, 23, {
        align: "center",
      });
      doc.text(`Generated: ${generatedAt}`, pageWidth - margin, 17, { align: "right" });
      doc.text(`Filtered NCRs: ${filteredNcrRows.length}`, pageWidth - margin, 23, { align: "right" });

      doc.setDrawColor(0, 86, 112);
      doc.setLineWidth(0.7);
      doc.line(margin, 31, pageWidth - margin, 31);

      autoTable(doc, {
        startY: 35,
        theme: "grid",
        margin: { left: margin, right: margin },
        tableWidth: "auto",
        body: filterSummaryRows,
        styles: {
          font: "helvetica",
          fontSize: 8.2,
          cellPadding: 1.6,
          lineColor: [208, 208, 206],
          lineWidth: 0.2,
          textColor: [0, 0, 0],
        },
        columnStyles: {
          0: { cellWidth: 28, fontStyle: "bold", fillColor: [236, 236, 231] },
          1: { cellWidth: 72 },
        },
      });

      const reportRows = filteredNcrRows.map((row) => {
        const overdueDays = getOverdueDays(row.due_date);
        const sourceLabel = [row.project, row.area].filter(Boolean).join(" / ") || "-";
        return {
          ncr_number: row.number || "-",
          source: sourceLabel,
          audit_type: row.source_type || "-",
          category: row.root_cause_category || getSeverityDisplay(row.severity),
          status: row.status || "-",
          owner: row.owner || "-",
          due_date: formatDate(row.due_date),
          overdue_days: overdueDays ? String(overdueDays) : "-",
          description: row.description || "-",
          root_cause: row.root_cause_description || "-",
          containment_action: row.containment_action || "-",
          corrective_action: row.corrective_action || "-",
          is_overdue: Boolean(overdueDays),
          severity: row.severity || "",
        };
      });

      autoTable(doc, {
        startY: ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 35) + 5,
        theme: "grid",
        margin: { left: margin, right: margin, bottom: 14 },
        tableWidth: "auto",
        columns: [
          { header: "NCR Number", dataKey: "ncr_number" },
          { header: "Source", dataKey: "source" },
          { header: "Audit Type", dataKey: "audit_type" },
          { header: "Category", dataKey: "category" },
          { header: "Status", dataKey: "status" },
          { header: "Owner", dataKey: "owner" },
          { header: "Due Date", dataKey: "due_date" },
          { header: "Overdue Days", dataKey: "overdue_days" },
          { header: "Description", dataKey: "description" },
          { header: "Containment", dataKey: "containment_action" },
          { header: "Root Cause", dataKey: "root_cause" },
          { header: "Corrective Action", dataKey: "corrective_action" },
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
          ncr_number: { cellWidth: 22 },
          source: { cellWidth: 18 },
          audit_type: { cellWidth: 16 },
          category: { cellWidth: 18 },
          status: { cellWidth: 14 },
          owner: { cellWidth: 16 },
          due_date: { cellWidth: 14 },
          overdue_days: { cellWidth: 12, halign: "center" },
          description: { cellWidth: 31 },
          containment_action: { cellWidth: 31 },
          root_cause: { cellWidth: 31 },
          corrective_action: { cellWidth: 31 },
        },
        didParseCell: (data) => {
          if (data.section !== "body") return;
          const row = data.row.raw as (typeof reportRows)[number];

          if (data.column.dataKey === "category") {
            const tone = getSeverityTone(row.severity);
            data.cell.styles.fillColor = hexToRgbTriplet(tone.bg);
            data.cell.styles.textColor = hexToRgbTriplet(tone.color);
          }

          if ((data.column.dataKey === "due_date" || data.column.dataKey === "overdue_days") && row.is_overdue) {
            data.cell.styles.fillColor = [254, 226, 226];
            data.cell.styles.textColor = [153, 27, 27];
            data.cell.styles.fontStyle = "bold";
          }
        },
        didDrawPage: () => {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(83, 86, 90);
          doc.text("Enshore Quality Management System", margin, pageHeight - 6);
          doc.text(
            `Page ${doc.getCurrentPageInfo().pageNumber} of ${doc.getNumberOfPages()}`,
            pageWidth - margin,
            pageHeight - 6,
            { align: "right" }
          );
        },
      });

      const fileName = `filtered-ncr-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);
      setMessage("Filtered NCR report generated successfully.");
    } catch (error) {
      console.error(error);
      setMessage("Filtered NCR report generation failed.");
    } finally {
      setGeneratingFilteredNcrReport(false);
    }
  }

  const importHasErrors = importRows.some((row) => row.errors.length > 0);
  const importValidRows = importRows.filter((row) => row.errors.length === 0);

  function getOtherRootCauseCategoryText(value: string) {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "Other") return "";
    if (trimmed.startsWith("Other - ")) return trimmed.replace("Other - ", "").trim();
    if (!rootCauseOptions.includes(trimmed)) return trimmed;
    return "";
  }

  function getRootCauseCategorySelectValue(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (trimmed === "Other" || trimmed.startsWith("Other - ") || !rootCauseOptions.includes(trimmed)) {
      return "Other";
    }
    return trimmed;
  }

  function resolveRootCauseCategory(category: string, otherCategory: string) {
    if (getRootCauseCategorySelectValue(category) !== "Other") return category;
    const trimmedOther = otherCategory.trim();
    return trimmedOther ? `Other - ${trimmedOther}` : "Other";
  }

  function getImportCell(row: Record<string, unknown>, columnName: string) {
    const target = normalizeImportHeader(columnName);
    const entry = Object.entries(row).find(([key]) => normalizeImportHeader(key) === target);
    const value = entry?.[1];
    return value === null || value === undefined ? "" : String(value).trim();
  }

  async function handleNcrImportFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (!requireCreatePermission("Importing NCRs")) {
      event.target.value = "";
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
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
        raw: true,
      });

      if (rows.length === 0) {
        setMessage("Import failed: first sheet has no data rows.");
        return;
      }

      const allocatedNumbers = ncrs.map((ncr) => ncr.ncr_number);
      const parsedRows: NcrImportRow[] = rows.map((row, index) => {
        const nextNumber = buildNextNumber("NCR", allocatedNumbers);
        allocatedNumbers.push(nextNumber);

        const title = getImportCell(row, "Title");
        const description = getImportCell(row, "Description");
        const containmentAction = getImportCell(row, "Containment Action");
        const correctiveAction = getImportCell(row, "Corrective Action");
        const project = getImportCell(row, "Project");
        const owner = getImportCell(row, "Owner");
        const severity = normalizeImportOption(getImportCell(row, "Severity"), severityOptions, "");
        const status = normalizeImportOption(getImportCell(row, "Status"), statusOptions, "");
        const sourceType = normalizeImportOption(getImportCell(row, "Source Type"), sourceOptions, "Internal");
        const area = getImportCell(row, "Area");
        const dueDate = normalizeImportDate(row[Object.keys(row).find((key) => normalizeImportHeader(key) === "due date") || ""]);
        const rootCauseCategory = normalizeImportOption(
          getImportCell(row, "Root Cause Category"),
          rootCauseOptions,
          ""
        );
        const rootCauseDescription = getImportCell(row, "Root Cause Description");
        const evidenceFiles = getImportCell(row, "Evidence Files");
        const evidenceNotes = getImportCell(row, "Evidence Notes");
        const errors: string[] = [];

        if (!title) errors.push("Title is required.");
        if (!description) errors.push("Description is required.");
        if (!project) errors.push("Project is required.");
        if (!owner) errors.push("Owner is required.");
        if (!severity) errors.push("Severity is required.");
        if (!status) errors.push("Status is required.");
        if (!dueDate) errors.push("Due Date is required or invalid.");
        if (severity && !severityOptions.includes(severity)) {
          errors.push(`Severity must be one of: ${severityOptions.join(", ")}.`);
        }
        if (status && !statusOptions.includes(status)) {
          errors.push(`Status must be one of: ${statusOptions.join(", ")}.`);
        }
        if (sourceType && !sourceOptions.includes(sourceType)) {
          errors.push(`Source Type must be one of: ${sourceOptions.join(", ")}.`);
        }
        if (rootCauseCategory && !rootCauseOptions.includes(rootCauseCategory)) {
          errors.push(`Root Cause Category must be one of: ${rootCauseOptions.join(", ")}.`);
        }

        return {
          rowNumber: index + 2,
          ncr_number: nextNumber,
          title,
          description,
          containment_action: containmentAction,
          corrective_action: correctiveAction,
          project,
          owner,
          severity,
          status,
          source_type: sourceType || "Internal",
          area,
          due_date: dueDate,
          root_cause_category: rootCauseCategory,
          root_cause_description: rootCauseDescription,
          evidence_files: evidenceFiles,
          evidence_notes: evidenceNotes,
          errors,
        };
      });

      setImportRows(parsedRows);
      setMessage(
        `Preview ready: ${parsedRows.length} NCR row${parsedRows.length === 1 ? "" : "s"} loaded from ${file.name}.`
      );
    } catch (error) {
      setMessage(`Import preview failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      event.target.value = "";
    }
  }

  async function importPreviewedNcrs() {
    if (!requireCreatePermission("Importing NCRs")) return;

    if (!importRows.length) {
      setMessage("Select an Excel file before importing.");
      return;
    }

    if (importHasErrors) {
      setMessage("Fix import preview errors before importing NCRs.");
      return;
    }

    setImportingNcrs(true);

    const insertRows = importRows.map((row) => ({
      ncr_number: row.ncr_number,
      title: row.title,
      description: row.description,
      containment_action: row.containment_action || null,
      corrective_action: row.corrective_action || null,
      severity: row.severity,
      status: row.status,
      owner: row.owner,
      area: row.area || null,
      due_date: row.due_date,
      closed_at: row.status === "Closed" ? new Date().toISOString() : null,
      project: row.project,
      source_type: row.source_type || "Internal",
      root_cause_category: row.root_cause_category || null,
      root_cause_description:
        appendImportedEvidenceReference(row.root_cause_description, row.evidence_files, row.evidence_notes) ||
        null,
    }));

    const { error } = await supabase.from("ncrs").insert(insertRows);

    setImportingNcrs(false);

    if (error) {
      setMessage(`NCR import failed: ${error.message}`);
      return;
    }

    setMessage(`Imported ${insertRows.length} NCR${insertRows.length === 1 ? "" : "s"} from ${importFileName}.`);
    setImportRows([]);
    setImportFileName("");
    await loadData();
    await loadNcrOptions();
  }

  return (
    <main>
      <QualityPageHero
        label="NCR"
        title="NCR"
        description="Track nonconformances, containment, corrective actions, root cause, evidence, and saved PDF exports from one working register."
        contextCards={[
          { label: "Last Refreshed", value: refreshStamp || "-" },
          { label: "Latest Record", value: latestRecordLabel },
        ]}
      />

      <div className="ims-top-meta-row" style={topMetaRowStyle}>
        <Link href="/home" style={backLinkStyle}>
          ← Back to IMS Home
        </Link>

        <div style={statusBannerStyle}>
          <strong>Status:</strong> {message || "Ready"}
        </div>
      </div>
      <nav className="ims-tabs" style={workspaceNavStyle} aria-label="NCR workspace views" role="tablist">
        {ncrWorkspaceViews.map((view) => (
          <button
            key={view.id}
            type="button"
            role="tab"
            aria-selected={activeWorkspaceView === view.id}
            data-active={activeWorkspaceView === view.id ? "true" : "false"}
            style={activeWorkspaceView === view.id ? activeWorkspaceNavButtonStyle : workspaceNavButtonStyle}
            onClick={() => setActiveWorkspaceView(view.id)}
          >
            {view.label}
          </button>
        ))}
      </nav>

      {activeWorkspaceView === "dashboard" ? (
        <>
          <section className="quality-kpi-grid" style={statsGridStyle}>
            <QualityKpiCard title="Open Items" value={kpis.openItems} accent="#FFAD00" onClick={() => applyKpiFilter("Open")} active={ncrQuickFilter === "Open"} />
            <QualityKpiCard title="In Progress" value={kpis.inProgress} accent="#53565A" onClick={() => applyKpiFilter("In Progress")} active={ncrQuickFilter === "In Progress"} />
            <QualityKpiCard title="Closed NCRs" value={kpis.closed} accent="#005670" onClick={() => applyKpiFilter("Closed")} active={ncrQuickFilter === "Closed"} />
            <QualityKpiCard title="Overdue" value={kpis.overdue} accent="#F93822" onClick={() => applyKpiFilter("Overdue")} active={ncrQuickFilter === "Overdue"} />
            <QualityKpiCard title="Due in 7 Days" value={kpis.dueSoon} accent="#005670" onClick={() => applyKpiFilter("DueSoon")} active={ncrQuickFilter === "DueSoon"} />
            <QualityKpiCard title="Total NCRs" value={kpis.totalNcrs} accent="#63B1BC" onClick={() => applyKpiFilter("All")} active={ncrQuickFilter === "All"} />
          </section>

          <section style={dashboardPanelGridStyle}>
            <SectionCard title="NCR Story" subtitle={`Operational split for ${yearFilter}. Click a KPI above to open the matching register view.`}>
              <div style={storyGridStyle}>
                <StoryBars title="Status Split" items={ncrStatusStory} />
                <StoryBars title="Severity Mix" items={ncrSeverityStory} />
                <StoryBars title="Source Type" items={ncrSourceStory} />
                <StoryBars title="Due Date Pressure" items={ncrDueStory} />
              </div>
            </SectionCard>

            <SectionCard title="NCR Pressure" subtitle={`Counts shown for ${yearFilter}.`}>
              <div style={dashboardMetricGridStyle}>
                <div style={dashboardMetricCardStyle}>
                  <span>Open + In Progress</span>
                  <strong>{kpis.openItems + kpis.inProgress}</strong>
                </div>
                <div style={dashboardMetricCardStyle}>
                  <span>Closed</span>
                  <strong>{kpis.closed}</strong>
                </div>
                <div style={dashboardMetricCardStyle}>
                  <span>Overdue / Due Soon</span>
                  <strong>{kpis.overdue + kpis.dueSoon}</strong>
                </div>
                <div style={dashboardMetricCardStyle}>
                  <span>Closure Rate</span>
                  <strong>{ncrClosureRate}%</strong>
                </div>
              </div>
            </SectionCard>
          </section>
        </>
      ) : null}

      {activeWorkspaceView === "import" ? (
      <section style={{ marginBottom: "20px" }}>
        <SectionCard
          title="Bulk NCR Excel Import"
          subtitle="Upload an .xlsx file, preview row-level validation, then import NCRs only."
        >
          <div style={importPanelStyle}>
            <div>
              <label style={labelStyle}>Excel File</label>
              <input
                type="file"
                accept=".xlsx"
                style={inputStyle}
                onChange={(event) => void handleNcrImportFileChange(event)}
                disabled={!canCreateNcr}
              />
              <div style={mutedTextStyle}>
                First worksheet only. Evidence file references are preserved as text under Imported Evidence Reference.
              </div>
            </div>

            <div style={importActionsStyle}>
              <button
                type="button"
                style={primaryButton}
                onClick={() => void importPreviewedNcrs()}
                disabled={!canCreateNcr || !importRows.length || importHasErrors || importingNcrs}
              >
                {importingNcrs ? "Importing NCRs..." : `Import ${importValidRows.length} NCRs`}
              </button>
              <button
                type="button"
                style={secondaryButton}
                onClick={() => {
                  setImportRows([]);
                  setImportFileName("");
                  setMessage("NCR import preview cleared.");
                }}
                disabled={!importRows.length}
              >
                Clear Preview
              </button>
            </div>
          </div>

          {importRows.length ? (
            <div style={importPreviewWrapStyle}>
              <div style={tableInfoRowStyle}>
                Previewing <strong>{importRows.length}</strong> row{importRows.length === 1 ? "" : "s"}
                {importFileName ? (
                  <>
                    {" "}
                    from <strong>{importFileName}</strong>
                  </>
                ) : null}
                .{" "}
                {importHasErrors ? (
                  <span style={{ color: "#F93822", fontWeight: 800 }}>Resolve row errors before import.</span>
                ) : (
                  <span style={{ color: "#005670", fontWeight: 800 }}>Ready to import.</span>
                )}
              </div>

              <div style={importTableStyle}>
                <div style={importTableHeadStyle}>
                  <div>Row</div>
                  <div>NCR No.</div>
                  <div>Title</div>
                  <div>Project</div>
                  <div>Owner</div>
                  <div>Severity</div>
                  <div>Status</div>
                  <div>Due Date</div>
                  <div>Validation</div>
                </div>

                {importRows.map((row) => (
                  <div
                    key={`${row.rowNumber}-${row.ncr_number}`}
                    style={{
                      ...importTableRowStyle,
                      background: row.errors.length ? "#ECECE7" : "#ffffff",
                    }}
                  >
                    <div>{row.rowNumber}</div>
                    <div>{row.ncr_number}</div>
                    <div>{row.title || "-"}</div>
                    <div>{row.project || "-"}</div>
                    <div>{row.owner || "-"}</div>
                    <div>{row.severity || "-"}</div>
                    <div>{row.status || "-"}</div>
                    <div>{row.due_date || "-"}</div>
                    <div style={row.errors.length ? importErrorTextStyle : importOkTextStyle}>
                      {row.errors.length ? row.errors.join(" ") : "OK"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </SectionCard>
      </section>
      ) : null}

      {activeWorkspaceView === "create" ? (
      <section style={topGridStyle}>
          <SectionCard title="Create a New NCR" subtitle="Capture the nonconformance, containment, corrective action, root cause, ownership, due date, and evidence.">
            {activeCreateTab === "NCR" ? (
              <div style={createPanelNcrStyle}>
                <div style={detailFormGridStyle}>
                  <div style={formSectionTitleStyle}>A. Core NCR Information</div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Title</label>
                    <input
                      style={inputStyle}
                      value={newNcr.title}
                      onChange={(e) => setNewNcr({ ...newNcr, title: e.target.value })}
                      placeholder="e.g. Weld record incomplete"
                    />
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Description</label>
                    <textarea
                      style={textareaStyle}
                      value={newNcr.description}
                      onChange={(e) => setNewNcr({ ...newNcr, description: e.target.value })}
                      placeholder="Add details, evidence, impact, or context"
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Project</label>
                    <input
                      style={inputStyle}
                      value={newNcr.project}
                      onChange={(e) => setNewNcr({ ...newNcr, project: e.target.value })}
                      placeholder="Project name"
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Owner</label>
                    <select
                      style={inputStyle}
                      value={newNcr.owner}
                      onChange={(e) => setNewNcr({ ...newNcr, owner: e.target.value })}
                    >
                      <option value="">Select owner</option>
                      {createOwnerOptions.map((owner) => (
                        <option key={owner} value={owner}>
                          {owner}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Severity</label>
                    <select
                      style={inputStyle}
                      value={newNcr.severity}
                      onChange={(e) => setNewNcr({ ...newNcr, severity: e.target.value })}
                    >
                      {severityOptions.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Status</label>
                    <select
                      style={inputStyle}
                      value={newNcr.status}
                      onChange={(e) => setNewNcr({ ...newNcr, status: e.target.value })}
                    >
                      {statusOptions.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Source Type</label>
                    <select
                      style={inputStyle}
                      value={newNcr.source_type}
                      onChange={(e) => setNewNcr({ ...newNcr, source_type: e.target.value })}
                    >
                      {sourceOptions.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Area</label>
                    <input
                      style={inputStyle}
                      value={newNcr.area}
                      onChange={(e) => setNewNcr({ ...newNcr, area: e.target.value })}
                      placeholder="Area / department"
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Due Date</label>
                    <input
                      type="date"
                      style={inputStyle}
                      value={newNcr.due_date}
                      onChange={(e) => setNewNcr({ ...newNcr, due_date: e.target.value })}
                    />
                  </div>

                  <div style={formSectionTitleStyle}>B. Containment Action</div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Containment Action</label>
                    <textarea
                      style={textareaStyle}
                      value={newNcr.containment_action}
                      onChange={(e) => setNewNcr({ ...newNcr, containment_action: e.target.value })}
                      placeholder="Describe the immediate action taken to contain the nonconformance"
                    />
                  </div>

                  <div style={formSectionTitleStyle}>C. Root Cause</div>

                  <div>
                    <label style={labelStyle}>Root Cause Category</label>
                    <select
                      style={inputStyle}
                      value={getRootCauseCategorySelectValue(newNcr.root_cause_category)}
                      onChange={(e) => {
                        const value = e.target.value;
                        setNewNcr({ ...newNcr, root_cause_category: value });
                        if (value !== "Other") setNewRootCauseOther("");
                      }}
                    >
                      <option value="">Select category</option>
                      {rootCauseOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  {getRootCauseCategorySelectValue(newNcr.root_cause_category) === "Other" ? (
                    <div>
                      <label style={labelStyle}>Other Root Cause Category</label>
                      <input
                        style={inputStyle}
                        value={newRootCauseOther}
                        onChange={(e) => setNewRootCauseOther(e.target.value)}
                        placeholder="Type the root cause category"
                      />
                    </div>
                  ) : null}

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Root Cause Description</label>
                    <textarea
                      style={textareaStyle}
                      value={newNcr.root_cause_description}
                      onChange={(e) => setNewNcr({ ...newNcr, root_cause_description: e.target.value })}
                      placeholder="Describe the underlying cause of the NCR"
                    />
                  </div>

                  <div style={formSectionTitleStyle}>D. Corrective Action</div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Corrective Action</label>
                    <textarea
                      style={textareaStyle}
                      value={newNcr.corrective_action}
                      onChange={(e) => setNewNcr({ ...newNcr, corrective_action: e.target.value })}
                      placeholder="Describe the corrective action to prevent recurrence"
                    />
                  </div>

                  <div style={formSectionTitleStyle}>E. Evidence</div>

                  <div>
                    <label style={labelStyle}>Evidence Files (optional)</label>
                    <input
                      type="file"
                      multiple
                      style={inputStyle}
                      onChange={handleCreateNcrFileChange}
                      disabled={!canCreateNcr}
                    />
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Evidence Notes (optional)</label>
                    <textarea
                      style={textareaStyle}
                      value={createNcrEvidenceNotes}
                      onChange={(e) => setCreateNcrEvidenceNotes(e.target.value)}
                      placeholder="Add a note for the uploaded evidence"
                    />
                  </div>
                </div>

                <SelectedFilesList files={createNcrFiles} />

                <div style={buttonRowStyle}>
                  <button
                    type="button"
                    style={primaryButton}
                    onClick={() => void createNcr()}
                    disabled={saving || !canCreateNcr}
                  >
                    {saving ? "Saving..." : "Create NCR"}
                  </button>
                  <button
                    type="button"
                    style={secondaryButton}
                    onClick={() => {
                      setNewNcr({
                        title: "",
                        description: "",
                        containment_action: "",
                        corrective_action: "",
                        severity: "Medium",
                        status: "Open",
                        owner: "",
                        area: "",
                        due_date: "",
                        project: "",
                        source_type: "Internal",
                        root_cause_category: "",
                        root_cause_description: "",
                      });
                      setCreateNcrFiles([]);
                      setCreateNcrEvidenceNotes("");
                      setNewRootCauseOther("");
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            ) : (
              <div style={createPanelCapaStyle}>
                <div style={detailFormGridStyle}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Title</label>
                    <input
                      style={inputStyle}
                      value={newCapa.title}
                      onChange={(e) => setNewCapa({ ...newCapa, title: e.target.value })}
                      placeholder="e.g. Update inspection sign-off workflow"
                    />
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Description</label>
                    <textarea
                      style={textareaStyle}
                      value={newCapa.description}
                      onChange={(e) => setNewCapa({ ...newCapa, description: e.target.value })}
                      placeholder="Add corrective / preventive action details"
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Project</label>
                    <input
                      style={inputStyle}
                      value={newCapa.project}
                      onChange={(e) => setNewCapa({ ...newCapa, project: e.target.value })}
                      placeholder="Project name"
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Owner</label>
                    <input
                      style={inputStyle}
                      value={newCapa.owner}
                      onChange={(e) => setNewCapa({ ...newCapa, owner: e.target.value })}
                      placeholder="Owner"
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Status</label>
                    <select
                      style={inputStyle}
                      value={newCapa.status}
                      onChange={(e) => setNewCapa({ ...newCapa, status: e.target.value })}
                    >
                      {statusOptions.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Due Date</label>
                    <input
                      type="date"
                      style={inputStyle}
                      value={newCapa.due_date}
                      onChange={(e) => setNewCapa({ ...newCapa, due_date: e.target.value })}
                    />
                  </div>

                  <div style={{ gridColumn: "1 / -1", fontSize: 13, fontWeight: 700, color: "#000000" }}>
                    CAPA Action Structure
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Correction (Immediate Fix)</label>
                    <textarea
                      style={textareaStyle}
                      value={newCapa.correction_description}
                      onChange={(e) =>
                        setNewCapa({ ...newCapa, correction_description: e.target.value })
                      }
                      placeholder="Describe the immediate correction taken"
                    />
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Corrective Action (Prevent Recurrence)</label>
                    <textarea
                      style={textareaStyle}
                      value={newCapa.corrective_action_description}
                      onChange={(e) =>
                        setNewCapa({ ...newCapa, corrective_action_description: e.target.value })
                      }
                      placeholder="Describe the action preventing recurrence"
                    />
                  </div>

                  <div style={{ gridColumn: "1 / -1", fontSize: 13, fontWeight: 700, color: "#000000" }}>
                    Effectiveness Review
                  </div>

                  <div>
                    <label style={labelStyle}>Effectiveness Status</label>
                    <select
                      style={inputStyle}
                      value={newCapa.effectiveness_status}
                      onChange={(e) =>
                        setNewCapa({ ...newCapa, effectiveness_status: e.target.value })
                      }
                    >
                      {effectivenessStatusOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Effectiveness Due Date (optional)</label>
                    <input
                      type="date"
                      style={inputStyle}
                      value={newCapa.effectiveness_due_date}
                      onChange={(e) =>
                        setNewCapa({ ...newCapa, effectiveness_due_date: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Effectiveness Review Date</label>
                    <input
                      type="date"
                      style={inputStyle}
                      value={newCapa.effectiveness_review_date}
                      onChange={(e) =>
                        setNewCapa({ ...newCapa, effectiveness_review_date: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Effectiveness Reviewer</label>
                    <input
                      style={inputStyle}
                      value={newCapa.effectiveness_reviewer}
                      onChange={(e) =>
                        setNewCapa({ ...newCapa, effectiveness_reviewer: e.target.value })
                      }
                      placeholder="Reviewer name"
                    />
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Effectiveness Comments</label>
                    <textarea
                      style={textareaStyle}
                      value={newCapa.effectiveness_comments}
                      onChange={(e) =>
                        setNewCapa({ ...newCapa, effectiveness_comments: e.target.value })
                      }
                      placeholder="Record how effectiveness was reviewed"
                    />
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Add Linked NCR</label>
                    <div style={pickerRowStyle}>
                      <select
                        style={inputStyle}
                        value={newLinkedNcrToAdd}
                        onChange={(e) => setNewLinkedNcrToAdd(e.target.value)}
                      >
                        <option value="">Select NCR</option>
                        {ncrOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <button type="button" style={secondaryButton} onClick={addLinkedNcrToNewCapa}>
                        + Add
                      </button>
                    </div>
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Linked NCRs</label>
                    <div style={linkWrapStyle}>
                      {newCapaLinkedItems.length === 0 ? (
                        <span style={mutedTextStyle}>None linked</span>
                      ) : (
                        newCapaLinkedItems.map((item) => (
                          <span key={item} style={editablePillWrapStyle}>
                            <Link href={`/ncr-capa?search=${encodeURIComponent(item)}`} style={linkPillStyle}>
                              {item}
                            </Link>
                            <button
                              type="button"
                              style={pillRemoveButtonStyle}
                              onClick={() => removeLinkedNcrFromNewCapa(item)}
                            >
                              x
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Evidence Files (optional)</label>
                    <input
                      type="file"
                      multiple
                      style={inputStyle}
                      onChange={handleCreateCapaFileChange}
                      disabled={!canCreateNcr}
                    />
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Evidence Notes (optional)</label>
                    <textarea
                      style={textareaStyle}
                      value={createCapaEvidenceNotes}
                      onChange={(e) => setCreateCapaEvidenceNotes(e.target.value)}
                      placeholder="Add a note for the uploaded evidence"
                    />
                  </div>
                </div>

                <SelectedFilesList files={createCapaFiles} />

                <div style={buttonRowStyle}>
                  <button
                    type="button"
                    style={{ ...primaryButton, background: "#53565A" }}
                    onClick={() => void createCapa()}
                    disabled={saving || !canCreateNcr}
                  >
                    {saving ? "Saving..." : "Create CAPA"}
                  </button>
                  <button
                    type="button"
                    style={secondaryButton}
                    onClick={() => {
                      setNewCapa({
                        title: "",
                        description: "",
                        status: "Open",
                        owner: "",
                        due_date: "",
                        linked_to: "",
                        project: "",
                        correction_description: "",
                        corrective_action_description: "",
                        effectiveness_status: "Pending",
                        effectiveness_review_date: "",
                        effectiveness_reviewer: "",
                        effectiveness_comments: "",
                        effectiveness_due_date: "",
                      });
                      setCreateCapaFiles([]);
                      setCreateCapaEvidenceNotes("");
                      setNewLinkedNcrToAdd("");
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </SectionCard>

        {false ? (
        <div style={sidePanelStackStyle}>
          <SectionCard
            title="Top 5 Raised NCRs by Severity"
            subtitle="High first, then Medium, then Low, with newest NCRs first within each severity."
          >
            {topRaisedNcrs.length === 0 ? (
              <div style={emptyBoardStyle}>No NCRs available yet.</div>
            ) : (
              <div style={compactInsightListStyle}>
                {topRaisedNcrs.map((item) => {
                  const severityLabel = getSeverityDisplay(item.severity);
                  const severityTone = getSeverityTone(severityLabel);
                  const evidenceCount = evidenceCountMap.get(`NCR-${item.id}`) || 0;
                  const matchingRow = combinedRows.find((row) => row.type === "NCR" && row.id === item.id) || null;

                  return (
                    <div key={item.id} style={compactInsightCardStyle}>
                      <div style={compactInsightHeaderStyle}>
                        <span
                          style={{
                            ...badgeStyle,
                            background: severityTone.bg,
                            color: severityTone.color,
                          }}
                        >
                          {severityLabel}
                        </span>
                        <button
                          type="button"
                          style={secondaryButtonSmall}
                          onClick={() => {
                            setActiveLogTab("NCR");
                            if (matchingRow) selectRowAndScroll(matchingRow);
                          }}
                        >
                          Quick view
                        </button>
                      </div>
                      <div style={attentionNumberStyle}>{item.ncr_number || "NCR-???"}</div>
                      <div style={attentionTitleStyle}>{item.title || "Untitled NCR"}</div>
                      <div style={compactInsightMetaLineStyle}>
                        <span>{item.owner || "No owner"}</span>
                        <span>{formatDate(item.created_at)}</span>
                      </div>
                      <div style={compactInsightMetaLineStyle}>
                        <span>{item.project || item.area || "No project / area"}</span>
                        <span>{evidenceCount} file{evidenceCount === 1 ? "" : "s"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Top 5 Upcoming CAPA Due Dates" subtitle="Overdue CAPAs first, then the nearest due dates.">
            {topUpcomingCapas.length === 0 ? (
              <div style={emptyBoardStyle}>No CAPAs available yet.</div>
            ) : (
              <div style={compactInsightListStyle}>
                {topUpcomingCapas.map((item) => {
                  const dueDate = item.due_date ? new Date(item.due_date) : null;
                  const today = new Date();
                  dueDate?.setHours(0, 0, 0, 0);
                  today.setHours(0, 0, 0, 0);
                  const dueDays = dueDate
                    ? Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                    : null;
                  const state = dueState(item.due_date);
                  const dueBadgeStyle =
                    state === "overdue"
                      ? { background: "#ECECE7", color: "#F93822" }
                      : state === "soon"
                      ? { background: "#ECECE7", color: "#000000" }
                      : { background: "#ECECE7", color: "#005670" };
                  const matchingRow = combinedRows.find((row) => row.type === "CAPA" && row.id === item.id) || null;

                  return (
                    <div key={item.id} style={compactInsightCardStyle}>
                      <div style={compactInsightHeaderStyle}>
                        <span style={{ ...badgeStyle, ...dueBadgeStyle }}>
                          {dueDays === null
                            ? "No due date"
                            : dueDays < 0
                            ? `Overdue by ${Math.abs(dueDays)}d`
                            : dueDays === 0
                            ? "Due today"
                            : `${dueDays}d to due`}
                        </span>
                        <button
                          type="button"
                          style={secondaryButtonSmall}
                          onClick={() => {
                            setActiveLogTab("CAPA");
                            if (matchingRow) selectRowAndScroll(matchingRow);
                          }}
                        >
                          Quick view
                        </button>
                      </div>
                      <div style={attentionNumberStyle}>{item.capa_number || "CAPA-???"}</div>
                      <div style={attentionTitleStyle}>{item.title || "Untitled CAPA"}</div>
                      <div style={compactInsightMetaLineStyle}>
                        <span>{item.owner || "No owner"}</span>
                        <span>{formatDate(item.due_date)}</span>
                      </div>
                      <div style={compactInsightMetaLineStyle}>
                        <span>{item.project || "No project"}</span>
                        <span>{item.linked_to || "No linked NCR"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>
        ) : null}
      </section>
      ) : null}

      {activeWorkspaceView === "register" ? (
      <section style={workspaceGridStyle}>
        <SectionCard title="NCR Register" subtitle="Table-led working register for day-to-day review, update, evidence handling, linked actions, and PDF reporting.">
          <div className="ims-filter-panel" style={toolbarStyle}>
            <input
              style={toolbarSearchStyle}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search NCR number, title, owner, project..."
            />

            <button
              type="button"
              style={showRegisterFilters ? secondaryButton : primaryButton}
              onClick={() => setShowRegisterFilters((current) => !current)}
            >
              {showRegisterFilters ? "Hide Filters" : "Show Filters"}
            </button>
          </div>

          {showRegisterFilters ? (
            <div className="ims-filter-panel" style={toolbarFiltersStyle}>
              <div style={toolbarLabeledControlStyle}>
                <label style={toolbarLabelStyle}>Status</label>
                <select style={toolbarSelectStyle} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option>All</option>
                  {statusOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>

              {activeLogTab === "NCR" ? (
                <>
                  <div style={toolbarLabeledControlStyle}>
                    <label style={toolbarLabelStyle}>Severity</label>
                    <select
                      style={toolbarSelectStyle}
                      value={severityFilter}
                      onChange={(e) => setSeverityFilter(e.target.value)}
                    >
                      <option>All</option>
                      {severityOptions.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </div>

                  <div style={toolbarLabeledControlStyle}>
                    <label style={toolbarLabelStyle}>Source Type</label>
                    <select
                      style={toolbarSelectStyle}
                      value={sourceFilter}
                      onChange={(e) => setSourceFilter(e.target.value)}
                    >
                      <option>All</option>
                      {sourceOptions.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : null}

              <div style={toolbarLabeledControlStyle}>
                <label style={toolbarLabelStyle}>Year</label>
                <select style={toolbarSelectStyle} value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
                  {yearOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div style={toolbarLabeledControlStyle}>
                <label style={toolbarLabelStyle}>Project</label>
                <select style={toolbarSelectStyle} value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
                  {projectOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>

              <button type="button" style={toolbarButtonStyle} onClick={clearFilters}>
                Clear Filters
              </button>

              {activeLogTab === "NCR" ? (
                <button
                  type="button"
                  style={{ ...toolbarButtonStyle, border: "1px solid #ECECE7", color: "#005670" }}
                  onClick={() => void generateFilteredNcrReport()}
                  disabled={generatingFilteredNcrReport || filteredRows.filter((row) => row.type === "NCR").length === 0}
                >
                  {generatingFilteredNcrReport ? "Generating PDF Report..." : "Generate PDF Report"}
                </button>
              ) : null}
            </div>
          ) : null}

          <div style={tableInfoRowStyle}>
            Showing <strong>{filteredRows.length}</strong> of{" "}
            <strong>{kpis.totalNcrs}</strong> NCR records for {yearFilter}
          </div>

          {loading ? (
            <div style={emptyBoardStyle}>Loading NCR records...</div>
          ) : filteredRows.length === 0 ? (
            <div style={emptyBoardStyle}>No matching records found.</div>
          ) : (
            <div className="ims-register-shell" style={registerTableWrapStyle}>
              <div className="ims-register-head" style={registerHeadStyle}>
                {activeLogTab === "NCR" ? (
                  <>
                    <button type="button" style={sortableHeaderButtonStyle} onClick={() => toggleNcrSort("number")}>
                      {ncrSortLabel("number", "NCR No.")}
                    </button>
                    <div>Title</div>
                    <button type="button" style={sortableHeaderButtonStyle} onClick={() => toggleNcrSort("severity")}>
                      {ncrSortLabel("severity", "Severity")}
                    </button>
                    <div>Owner</div>
                    <button type="button" style={sortableHeaderButtonStyle} onClick={() => toggleNcrSort("due_date")}>
                      {ncrSortLabel("due_date", "Due Date")}
                    </button>
                    <button type="button" style={sortableHeaderButtonStyle} onClick={() => toggleNcrSort("status")}>
                      {ncrSortLabel("status", "Status")}
                    </button>
                  </>
                ) : (
                  <>
                    <div>CAPA No.</div>
                    <div>Title</div>
                    <div>Owner</div>
                    <div>Due Date</div>
                    <div>Status</div>
                    <div>Linked NCR</div>
                  </>
                )}
              </div>

              <div style={registerBodyStyle}>
                {filteredRows.map((row) => {
                  const statusTone = getStatusTone(row.status);
                  const severityTone = getSeverityTone(getSeverityDisplay(row.severity));
                  const dueTone = dueState(row.due_date);
                  const active = selectedRow?.id === row.id && selectedRow?.type === row.type;

                  return (
                    <button
                      className="ims-register-row"
                      aria-pressed={active}
                      data-selected={active ? "true" : "false"}
                      key={`${row.type}-${row.id}`}
                      type="button"
                      onClick={() => selectRowAndScroll(row)}
                      style={{
                        ...registerRowStyle,
                        background: active ? "#eef7f8" : "#ffffff",
                        borderLeft: active ? "4px solid #005670" : "4px solid transparent",
                      }}
                    >
                      <div style={registerSimpleTextStyle}>{row.number}</div>

                      <div>
                        <div style={registerTitleStyle}>{row.title || "Untitled"}</div>
                      </div>
                      {activeLogTab === "NCR" ? (
                        <div>
                          <span
                            style={{
                              ...badgeStyle,
                              background: severityTone.bg,
                              color: severityTone.color,
                            }}
                          >
                            {getSeverityDisplay(row.severity)}
                          </span>
                        </div>
                      ) : (
                        <div style={registerSimpleTextStyle}>{row.owner || "-"}</div>
                      )}

                      {activeLogTab === "NCR" ? (
                        <div style={registerSimpleTextStyle}>{row.owner || "-"}</div>
                      ) : (
                        <div
                          style={{
                            ...registerSimpleTextStyle,
                            color:
                              dueTone === "overdue"
                                ? "#F93822"
                                : dueTone === "soon"
                                ? "#000000"
                                : "#000000",
                          }}
                        >
                          {formatDate(row.due_date)}
                        </div>
                      )}

                      {activeLogTab === "NCR" ? (
                        <div
                          style={{
                            ...registerSimpleTextStyle,
                            color:
                              dueTone === "overdue"
                                ? "#F93822"
                                : dueTone === "soon"
                                ? "#000000"
                                : "#000000",
                          }}
                        >
                          {formatDate(row.due_date)}
                        </div>
                      ) : (
                        <div>
                          <span
                            style={{
                              ...badgeStyle,
                              background: statusTone.bg,
                              color: statusTone.color,
                            }}
                          >
                            {row.status}
                          </span>
                        </div>
                      )}

                      {activeLogTab === "NCR" ? (
                        <div>
                          <span
                            style={{
                              ...badgeStyle,
                              background: statusTone.bg,
                              color: statusTone.color,
                            }}
                          >
                            {row.status}
                          </span>
                        </div>
                      ) : (
                        <div style={registerSimpleTextStyle}>{row.linked_to || "-"}</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </SectionCard>

        {selectedRow && editRow ? (
          <div ref={selectedDetailRef} style={sidePanelStackStyle}>
            <SectionCard title="Detail Panel" subtitle="Review and update the selected record.">
              <div>
                <div style={editHeaderStyle}>
                  <div>
                    <div style={detailRecordNumberStyle}>{editRow.number}</div>
                    <h3 style={detailRecordTitleStyle}>{editRow.title || "Untitled"}</h3>
                  </div>
                  <span
                    style={{
                      ...registerTagStyle,
                      background: getTypeTone(editRow.type).bg,
                      color: getTypeTone(editRow.type).color,
                      border: `1px solid ${getTypeTone(editRow.type).border}`,
                    }}
                  >
                    {editRow.type}
                  </span>
                </div>

                <div style={detailFormGridStyle}>
                  <div style={formSectionTitleStyle}>A. Core NCR Information</div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Title</label>
                    <input
                      style={inputStyle}
                      value={editRow.title}
                      onChange={(e) => setEditRow({ ...editRow, title: e.target.value })}
                    />
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Description</label>
                    <textarea
                      style={textareaStyle}
                      value={editRow.description}
                      onChange={(e) => setEditRow({ ...editRow, description: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Status</label>
                    <select
                      style={inputStyle}
                      value={editRow.status}
                      onChange={(e) => setEditRow({ ...editRow, status: e.target.value })}
                    >
                      {statusOptions.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Owner</label>
                    <select
                      style={inputStyle}
                      value={editRow.owner}
                      onChange={(e) => setEditRow({ ...editRow, owner: e.target.value })}
                    >
                      <option value="">Select owner</option>
                      {editOwnerOptions.map((owner) => (
                        <option key={owner} value={owner}>
                          {owner}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Project</label>
                    <input
                      style={inputStyle}
                      value={editRow.project}
                      onChange={(e) => setEditRow({ ...editRow, project: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Due Date</label>
                    <input
                      type="date"
                      style={inputStyle}
                      value={editRow.due_date ? editRow.due_date.slice(0, 10) : ""}
                      onChange={(e) => setEditRow({ ...editRow, due_date: e.target.value })}
                    />
                  </div>

                  {editRow.type === "NCR" && (
                    <>
                      <div>
                        <label style={labelStyle}>Severity</label>
                        <select
                          style={inputStyle}
                          value={editRow.severity}
                          onChange={(e) => setEditRow({ ...editRow, severity: e.target.value })}
                        >
                          {severityOptions.map((option) => (
                            <option key={option}>{option}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={labelStyle}>Source Type</label>
                        <select
                          style={inputStyle}
                          value={editRow.source_type}
                          onChange={(e) => setEditRow({ ...editRow, source_type: e.target.value })}
                        >
                          {sourceOptions.map((option) => (
                            <option key={option}>{option}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ gridColumn: "1 / -1" }}>
                        <label style={labelStyle}>Area</label>
                        <input
                          style={inputStyle}
                          value={editRow.area}
                          onChange={(e) => setEditRow({ ...editRow, area: e.target.value })}
                        />
                      </div>

                      <div style={formSectionTitleStyle}>B. Containment Action</div>

                      <div style={{ gridColumn: "1 / -1" }}>
                        <label style={labelStyle}>Containment Action</label>
                        <textarea
                          style={textareaStyle}
                          value={editRow.containment_action}
                          onChange={(e) =>
                            setEditRow({ ...editRow, containment_action: e.target.value })
                          }
                        />
                      </div>

                      <div style={formSectionTitleStyle}>C. Root Cause</div>

                      <div>
                        <label style={labelStyle}>Root Cause Category</label>
                        <select
                          style={inputStyle}
                          value={getRootCauseCategorySelectValue(editRow.root_cause_category)}
                          onChange={(e) => {
                            const value = e.target.value;
                            setEditRow({ ...editRow, root_cause_category: value });
                            if (value !== "Other") setEditRootCauseOther("");
                          }}
                        >
                          <option value="">Select category</option>
                          {rootCauseOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>

                      {getRootCauseCategorySelectValue(editRow.root_cause_category) === "Other" ? (
                        <div>
                          <label style={labelStyle}>Other Root Cause Category</label>
                          <input
                            style={inputStyle}
                            value={editRootCauseOther}
                            onChange={(e) => setEditRootCauseOther(e.target.value)}
                            placeholder="Type the root cause category"
                          />
                        </div>
                      ) : null}

                      <div style={{ gridColumn: "1 / -1" }}>
                        <label style={labelStyle}>Root Cause Description</label>
                        <textarea
                          style={textareaStyle}
                          value={editRow.root_cause_description}
                          onChange={(e) =>
                            setEditRow({ ...editRow, root_cause_description: e.target.value })
                          }
                        />
                      </div>

                      <div style={formSectionTitleStyle}>D. Corrective Action</div>

                      <div style={{ gridColumn: "1 / -1" }}>
                        <label style={labelStyle}>Corrective Action</label>
                        <textarea
                          style={textareaStyle}
                          value={editRow.corrective_action}
                          onChange={(e) =>
                            setEditRow({ ...editRow, corrective_action: e.target.value })
                          }
                        />
                      </div>
                    </>
                  )}

                  {editRow.type === "CAPA" && (
                    <>
                      <div style={{ gridColumn: "1 / -1", fontSize: 13, fontWeight: 700, color: "#000000" }}>
                        CAPA Action Structure
                      </div>

                      <div style={{ gridColumn: "1 / -1" }}>
                        <label style={labelStyle}>Correction (Immediate Fix)</label>
                        <textarea
                          style={textareaStyle}
                          value={editRow.correction_description}
                          onChange={(e) =>
                            setEditRow({ ...editRow, correction_description: e.target.value })
                          }
                        />
                      </div>

                      <div style={{ gridColumn: "1 / -1" }}>
                        <label style={labelStyle}>Corrective Action (Prevent Recurrence)</label>
                        <textarea
                          style={textareaStyle}
                          value={editRow.corrective_action_description}
                          onChange={(e) =>
                            setEditRow({
                              ...editRow,
                              corrective_action_description: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div style={{ gridColumn: "1 / -1", fontSize: 13, fontWeight: 700, color: "#000000" }}>
                        Effectiveness Review
                      </div>

                      <div>
                        <label style={labelStyle}>Effectiveness Status</label>
                        <select
                          style={inputStyle}
                          value={editRow.effectiveness_status}
                          onChange={(e) =>
                            setEditRow({ ...editRow, effectiveness_status: e.target.value })
                          }
                        >
                          {effectivenessStatusOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={labelStyle}>Effectiveness Due Date (optional)</label>
                        <input
                          type="date"
                          style={inputStyle}
                          value={
                            editRow.effectiveness_due_date
                              ? editRow.effectiveness_due_date.slice(0, 10)
                              : ""
                          }
                          onChange={(e) =>
                            setEditRow({ ...editRow, effectiveness_due_date: e.target.value })
                          }
                        />
                      </div>

                      <div>
                        <label style={labelStyle}>Effectiveness Review Date</label>
                        <input
                          type="date"
                          style={inputStyle}
                          value={
                            editRow.effectiveness_review_date
                              ? editRow.effectiveness_review_date.slice(0, 10)
                              : ""
                          }
                          onChange={(e) =>
                            setEditRow({
                              ...editRow,
                              effectiveness_review_date: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div>
                        <label style={labelStyle}>Effectiveness Reviewer</label>
                        <input
                          style={inputStyle}
                          value={editRow.effectiveness_reviewer}
                          onChange={(e) =>
                            setEditRow({ ...editRow, effectiveness_reviewer: e.target.value })
                          }
                        />
                      </div>

                      <div style={{ gridColumn: "1 / -1" }}>
                        <label style={labelStyle}>Effectiveness Comments</label>
                        <textarea
                          style={textareaStyle}
                          value={editRow.effectiveness_comments}
                          onChange={(e) =>
                            setEditRow({ ...editRow, effectiveness_comments: e.target.value })
                          }
                        />
                      </div>

                      <div style={{ gridColumn: "1 / -1" }}>
                        <label style={labelStyle}>Add Linked NCR</label>
                        <div style={pickerRowStyle}>
                          <select
                            style={inputStyle}
                            value={editLinkedNcrToAdd}
                            onChange={(e) => setEditLinkedNcrToAdd(e.target.value)}
                          >
                            <option value="">Select NCR</option>
                            {ncrOptions.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <button type="button" style={secondaryButton} onClick={addLinkedNcrToEditCapa}>
                            + Add
                          </button>
                        </div>
                      </div>

                      <div style={{ gridColumn: "1 / -1" }}>
                        <label style={labelStyle}>Linked NCRs</label>
                        <div style={linkWrapStyle}>
                          {editCapaLinkedItems.length === 0 ? (
                            <span style={mutedTextStyle}>None linked</span>
                          ) : (
                            editCapaLinkedItems.map((item) => (
                              <span key={item} style={editablePillWrapStyle}>
                                <Link href={`/ncr-capa?search=${encodeURIComponent(item)}`} style={linkPillStyle}>
                                  {item}
                                </Link>
                                <button
                                  type="button"
                                  style={pillRemoveButtonStyle}
                                  onClick={() => removeLinkedNcrFromEditCapa(item)}
                                >
                                  x
                                </button>
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {editRow.type === "NCR" ? (
                  <div style={pdfExportPanelStyle}>
                    <div style={pdfExportHeaderStyle}>
                      <div>
                        <div style={pdfExportTitleStyle}>Report Export</div>
                        <div style={pdfExportSubtitleStyle}>
                          Generate matching PDF and Word NCR forms for internal use or external supplier / client response.
                        </div>
                      </div>
                    </div>

                    <div style={pdfOptionsGridStyle}>
                      <label style={checkboxCardStyle}>
                        <input
                          type="checkbox"
                          checked={includeEvidenceListInPdf}
                          onChange={(e) => setIncludeEvidenceListInPdf(e.target.checked)}
                        />
                        <span>
                          Include evidence list
                          <small style={checkboxHintStyle}>
                            List uploaded NCR evidence without embedding files
                          </small>
                        </span>
                      </label>

                      <label style={checkboxCardStyle}>
                        <input
                          type="checkbox"
                          checked={externalFacingPdf}
                          onChange={(e) => setExternalFacingPdf(e.target.checked)}
                        />
                        <span>
                          Supplier / Client facing issue
                          <small style={checkboxHintStyle}>
                            Adjust wording for external response and acknowledgement sections
                          </small>
                        </span>
                      </label>
                    </div>

                    <div style={pdfSavedMetaStyle}>
                      {latestSavedPdf ? (
                        <>
                          <span>
                            Latest saved PDF: <strong>{formatDateTime(latestSavedPdf.generated_at)}</strong>
                          </span>
                          <span>
                            History: <strong>{selectedSavedPdfHistory.length}</strong> saved version{selectedSavedPdfHistory.length === 1 ? "" : "s"}
                          </span>
                        </>
                      ) : (
                        <span>No saved PDF yet for this NCR.</span>
                      )}
                    </div>

                    <div style={buttonRowStyle}>
                      <button
                        type="button"
                        style={{ ...secondaryButton, border: "1px solid #D0D0CE", color: "#005670" }}
                        onClick={() => void generateNcrPdf()}
                        disabled={generatingPdf || !canEditNcr}
                      >
                        {generatingPdf
                          ? "Generating PDF..."
                          : latestSavedPdf
                          ? "Regenerate PDF"
                          : "Generate / Save PDF"}
                      </button>

                      <button
                        type="button"
                        style={secondaryButton}
                        onClick={() => void generateNcrWord()}
                        disabled={generatingWord}
                      >
                        {generatingWord ? "Generating Word..." : "Generate Word Report"}
                      </button>

                      {latestSavedPdf ? (
                        <button
                          type="button"
                          style={secondaryButton}
                          onClick={() => void openSavedPdf(latestSavedPdf)}
                        >
                          Open Saved PDF
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {editRow.type === "NCR" ? (
                  <div style={linkedActionsPanelStyle}>
                    <div style={pdfExportHeaderStyle}>
                      <div>
                        <div style={pdfExportTitleStyle}>Linked Actions</div>
                        <div style={pdfExportSubtitleStyle}>
                          Central Action Management items linked to this NCR.
                        </div>
                      </div>
                    </div>

                    {selectedLinkedActions.length === 0 ? (
                      <div style={emptyBoardStyle}>No central actions are linked to this NCR yet.</div>
                    ) : (
                      <div style={linkedActionListStyle}>
                        {selectedLinkedActions.map((action) => (
                          <div key={action.id} style={linkedActionItemStyle}>
                            <div style={{ minWidth: 0 }}>
                              <div style={linkedActionTitleStyle}>
                                {action.action_number || "Action"} - {action.title || "Untitled action"}
                              </div>
                              <div style={linkedActionMetaStyle}>
                                Status: <strong>{action.status || "-"}</strong> | Owner:{" "}
                                <strong>{action.owner || "-"}</strong> | Due:{" "}
                                <strong>{formatDate(action.due_date)}</strong>
                              </div>
                            </div>
                            <Link
                              href={
                                action.id
                                  ? `/actions?actionId=${encodeURIComponent(action.id)}`
                                  : `/actions?action=${encodeURIComponent(action.action_number || "")}`
                              }
                              style={{ ...secondaryButtonSmall, textDecoration: "none", whiteSpace: "nowrap" }}
                            >
                              Open Linked Action
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}

                <div style={buttonRowStyle}>
                  <button
                    type="button"
                    style={primaryButton}
                    onClick={() => void saveEdit()}
                    disabled={saving || !canEditNcr}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                  {editRow.type === "NCR" ? (
                    <Link
                      href={buildNcrLinkedActionHref(editRow)}
                      style={{ ...secondaryButton, border: "1px solid #D0D0CE", color: "#005670", textDecoration: "none" }}
                    >
                      Generate Linked Action
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    style={secondaryButton}
                    onClick={() => {
                      setSelectedRow(null);
                      setEditRow(null);
                    }}
                  >
                    Hide Panel
                  </button>
                  <button
                    type="button"
                    style={{
                      ...secondaryButton,
                      border: "1px solid #ECECE7",
                      color: "#F93822",
                      background: "#ECECE7",
                    }}
                    onClick={() => void deleteSelected()}
                    disabled={saving || !canEditNcr}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Evidence" subtitle="Upload, preview or remove evidence for the selected record.">
              <div>
                <div style={editHeaderStyle}>
                  <div>
                    <div style={detailRecordNumberStyle}>{selectedRow.number}</div>
                    <h3 style={detailRecordTitleStyle}>{selectedRow.title || "Untitled"}</h3>
                  </div>
                  <span
                    style={{
                      ...registerTagStyle,
                      background: getTypeTone(selectedRow.type).bg,
                      color: getTypeTone(selectedRow.type).color,
                      border: `1px solid ${getTypeTone(selectedRow.type).border}`,
                    }}
                  >
                    {selectedRow.type}
                  </span>
                </div>

                <div style={detailFormGridStyle}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Select Files</label>
                    <input
                      type="file"
                      multiple
                      style={inputStyle}
                      onChange={handleSelectedEvidenceFileChange}
                      disabled={!canEditNcr}
                    />
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Evidence Notes (optional)</label>
                    <textarea
                      style={textareaStyle}
                      value={selectedEvidenceNotes}
                      onChange={(e) => setSelectedEvidenceNotes(e.target.value)}
                      placeholder="Add a note for the uploaded evidence"
                    />
                  </div>
                </div>

                <SelectedFilesList files={selectedEvidenceFiles} />

                <div style={buttonRowStyle}>
                  <button
                    type="button"
                    style={{ ...primaryButton, background: "#53565A" }}
                    onClick={() => void uploadEvidenceToSelected()}
                    disabled={uploadingEvidence || !canEditNcr}
                  >
                    {uploadingEvidence ? "Uploading..." : "Upload Evidence"}
                  </button>
                </div>

                <div style={evidenceListStyle}>
                  {selectedRowEvidence.length === 0 ? (
                    <div style={emptyBoardStyle}>No evidence attached yet.</div>
                  ) : (
                    selectedRowEvidence.map((file) => (
                      <div key={file.id} style={evidenceItemStyle}>
                        <div style={{ minWidth: 0 }}>
                          <div style={evidenceFileNameStyle}>{file.file_name}</div>
                          <div style={evidenceMetaTextStyle}>
                            {formatFileSize(file.file_size)} | {file.content_type || "Unknown type"} | Uploaded{" "}
                            {formatDateTime(file.uploaded_at)}
                          </div>
                          {file.notes ? <div style={evidenceNoteStyle}>Note: {file.notes}</div> : null}
                        </div>

                        <div style={actionButtonsWrapStyle}>
                          <button type="button" style={secondaryButtonSmall} onClick={() => void openEvidence(file)}>
                            Open
                          </button>
                          <button
                            type="button"
                            style={{
                              ...secondaryButtonSmall,
                              border: "1px solid #ECECE7",
                              color: "#F93822",
                              background: "#ECECE7",
                            }}
                            onClick={() => void deleteEvidence(file)}
                            disabled={!canEditNcr}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </SectionCard>
          </div>
        ) : null}
      </section>
      ) : null}

      {activeWorkspaceView === "reports" ? (
        <section style={reportsGridStyle}>
          <SectionCard
            title="NCR Reports"
            subtitle="Filter the NCR register here, then generate a controlled PDF output from the visible records."
          >
            <div className="ims-filter-panel" style={reportFilterPanelStyle}>
              <div style={filterActionRowStyle}>
                <input
                  style={toolbarSearchStyle}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search NCR number, title, owner, project..."
                />
                <button
                  type="button"
                  style={showReportFilters ? secondaryButton : primaryButton}
                  onClick={() => setShowReportFilters((current) => !current)}
                >
                  {showReportFilters ? "Hide Filters" : "Show Filters"}
                </button>
              </div>

              {showReportFilters ? (
              <div className="ims-filter-panel" style={toolbarFiltersStyle}>
                <div style={toolbarLabeledControlStyle}>
                  <label style={toolbarLabelStyle}>Status</label>
                  <select style={toolbarSelectStyle} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option>All</option>
                    {statusOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div style={toolbarLabeledControlStyle}>
                  <label style={toolbarLabelStyle}>Severity</label>
                  <select style={toolbarSelectStyle} value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
                    <option>All</option>
                    {severityOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div style={toolbarLabeledControlStyle}>
                  <label style={toolbarLabelStyle}>Source Type</label>
                  <select style={toolbarSelectStyle} value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
                    <option>All</option>
                    {sourceOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div style={toolbarLabeledControlStyle}>
                  <label style={toolbarLabelStyle}>Year</label>
                  <select style={toolbarSelectStyle} value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
                    {yearOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div style={toolbarLabeledControlStyle}>
                  <label style={toolbarLabelStyle}>Project</label>
                  <select style={toolbarSelectStyle} value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
                    {projectOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <button type="button" style={toolbarButtonStyle} onClick={clearFilters}>
                  Clear Filters
                </button>
              </div>
              ) : null}
            </div>

            <div style={reportActionGridStyle}>
              <div style={reportActionCardStyle}>
                <div>
                  <div style={reportActionLabelStyle}>PDF Report Output</div>
                  <div style={reportActionHintStyle}>
                    Exports the NCR records currently controlled by the filters above.
                  </div>
                </div>
                <div style={reportActionValueStyle}>
                  {filteredRows.filter((row) => row.type === "NCR").length} NCRs
                </div>
                <button
                  type="button"
                  style={{ ...primaryButton, justifySelf: "start" }}
                  onClick={() => void generateFilteredNcrReport()}
                  disabled={generatingFilteredNcrReport || filteredRows.filter((row) => row.type === "NCR").length === 0}
                >
                  {generatingFilteredNcrReport ? "Generating PDF Report..." : "Generate PDF Report"}
                </button>
              </div>

              <div style={reportActionCardStyle}>
                <div>
                  <div style={reportActionLabelStyle}>Individual NCR Reports</div>
                  <div style={reportActionHintStyle}>
                    Select an NCR in the register to generate, save, and reopen its individual NCR PDF with evidence references.
                  </div>
                </div>
                <div style={reportActionValueStyle}>{savedPdfFiles.length} saved PDFs</div>
                <button
                  type="button"
                  style={secondaryButton}
                  onClick={() => setActiveWorkspaceView("register")}
                >
                  Open NCR Register
                </button>
              </div>
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
    children: ReactNode;
  }) {
    return (
      <section style={panelStyle}>
        <ModuleSectionHeader title={title} subtitle={subtitle} />
        {children}
      </section>
    );
  }

function StoryBars({ title, items }: { title: string; items: { label: string; value: number; color: string }[] }) {
  const max = Math.max(1, ...items.map((item) => item.value));

  return (
    <div style={storyCardStyle}>
      <div style={storyTitleStyle}>{title}</div>
      <div style={storyBarsStyle}>
        {items.map((item) => (
          <div key={item.label} style={storyBarRowStyle}>
            <div style={storyBarLabelStyle}>{item.label}</div>
            <div style={storyTrackStyle}>
              <div
                style={{
                  ...storyFillStyle,
                  width: `${Math.max(4, (item.value / max) * 100)}%`,
                  background: item.color,
                }}
              />
            </div>
            <div style={storyBarValueStyle}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeroPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "amber" | "red" | "blue";
}) {
  const tones = {
    green: { bg: "rgba(220,252,231,0.15)", border: "rgba(220,252,231,0.26)", text: "#ECECE7" },
    amber: { bg: "rgba(254,243,199,0.15)", border: "rgba(254,243,199,0.28)", text: "#ECECE7" },
    red: { bg: "rgba(254,226,226,0.15)", border: "rgba(254,226,226,0.28)", text: "#ECECE7" },
    blue: { bg: "rgba(219,234,254,0.15)", border: "rgba(219,234,254,0.28)", text: "#ECECE7" },
  };

  const colours = tones[tone];

  return (
    <div style={{ ...heroPillStyle, background: colours.bg, border: `1px solid ${colours.border}` }}>
      <div style={heroPillLabelStyle}>{label}</div>
      <div style={{ ...heroPillValueStyle, color: colours.text }}>{value}</div>
    </div>
  );
}

function HeroMetaCard({
  label,
  value,
  compact,
}: {
  label: string;
  value: string | number;
  compact?: boolean;
}) {
  return (
    <div style={heroMetaCardStyle}>
      <div style={heroMetaLabelStyle}>{label}</div>
      <div style={compact ? heroMetaCompactValueStyle : heroMetaValueStyle}>{value}</div>
    </div>
  );
}

function SelectedFilesList({ files }: { files: File[] }) {
  if (files.length === 0) {
    return <div style={{ marginTop: 12, fontSize: 13, color: "#53565A" }}>No files selected.</div>;
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
      {files.map((file, index) => (
        <div
          key={`${file.name}-${index}`}
          style={{
            display: "inline-flex",
            gap: 8,
            alignItems: "center",
            padding: "8px 10px",
            borderRadius: 999,
            background: "#ECECE7",
            color: "#005670",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <span>{file.name}</span>
          <span style={{ opacity: 0.8 }}>{formatFileSize(file.size)}</span>
        </div>
      ))}
    </div>
  );
}

const heroStyle: CSSProperties = {
  background: "linear-gradient(135deg, #005670 0%, #005670 64%, #63B1BC 160%)",
  color: "white",
  borderRadius: "20px",
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
  opacity: 0.82,
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

const heroPillGridStyle: CSSProperties = {
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

const heroMetaCompactValueStyle: CSSProperties = {
  fontSize: "15px",
  fontWeight: 700,
  lineHeight: 1.35,
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

const topMetaActionsStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  alignItems: "center",
};

const backLinkStyle: CSSProperties = {
  color: "#005670",
  fontWeight: 700,
  textDecoration: "none",
};

const statusBannerStyle: CSSProperties = {
  background: "white",
  borderRadius: "12px",
  padding: "12px 16px",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
  color: "#000000",
};

const statsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: "12px",
  marginBottom: "18px",
};

const workspaceNavStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginBottom: "20px",
};

const workspaceNavButtonStyle: CSSProperties = {
  background: "#D0D0CE",
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

const activeWorkspaceNavButtonStyle: CSSProperties = {
  ...workspaceNavButtonStyle,
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

const storyGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "14px",
};

const storyCardStyle: CSSProperties = {
  border: "1px solid #D0D0CE",
  background: "#ECECE7",
  borderRadius: "14px",
  padding: "14px",
  display: "grid",
  gap: "12px",
};

const storyTitleStyle: CSSProperties = {
  color: "#000000",
  fontSize: "14px",
  fontWeight: 800,
};

const storyBarsStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
};

const storyBarRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "92px minmax(0, 1fr) 28px",
  gap: "10px",
  alignItems: "center",
};

const storyBarLabelStyle: CSSProperties = {
  color: "#53565A",
  fontSize: "12px",
  fontWeight: 700,
};

const storyTrackStyle: CSSProperties = {
  height: "12px",
  borderRadius: "999px",
  background: "#D0D0CE",
  overflow: "hidden",
};

const storyFillStyle: CSSProperties = {
  height: "100%",
  borderRadius: "999px",
};

const storyBarValueStyle: CSSProperties = {
  color: "#000000",
  fontSize: "13px",
  fontWeight: 900,
  textAlign: "right",
};

const dashboardMetricGridStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
};

const dashboardMetricCardStyle: CSSProperties = {
  border: "1px solid #D0D0CE",
  background: "#ECECE7",
  borderRadius: "14px",
  padding: "14px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  color: "#53565A",
  fontSize: "13px",
  fontWeight: 700,
};

const topGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "20px",
  marginBottom: "20px",
};

const workspaceGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "20px",
  alignItems: "start",
};

const reportsGridStyle: CSSProperties = {
  display: "grid",
  gap: "16px",
  marginBottom: "20px",
};

const reportActionGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "14px",
};

const reportFilterPanelStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
  padding: "14px",
  borderRadius: "16px",
  border: "1px solid #D0D0CE",
  background: "#ECECE7",
  marginBottom: "14px",
};

const filterActionRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(220px, 1fr) minmax(160px, 220px)",
  gap: "10px",
  alignItems: "center",
};

const reportActionCardStyle: CSSProperties = {
  borderRadius: "16px",
  border: "1px solid #D0D0CE",
  background: "#ECECE7",
  padding: "16px",
  display: "grid",
  gap: "14px",
  alignContent: "start",
};

const reportActionLabelStyle: CSSProperties = {
  color: "#000000",
  fontSize: "15px",
  fontWeight: 800,
};

const reportActionHintStyle: CSSProperties = {
  marginTop: "6px",
  color: "#53565A",
  fontSize: "13px",
  lineHeight: 1.5,
};

const reportActionValueStyle: CSSProperties = {
  color: "#005670",
  fontSize: "22px",
  fontWeight: 900,
};

const sidePanelStackStyle: CSSProperties = {
  display: "grid",
  gap: "20px",
  alignSelf: "start",
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

const toolbarSearchStyle: CSSProperties = {
  ...inputStyle,
  maxWidth: "460px",
  flex: "1 1 320px",
};

const toolbarSelectStyle: CSSProperties = {
  ...inputStyle,
  minWidth: "150px",
};

const toolbarButtonStyle: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid #D0D0CE",
  background: "#ffffff",
  color: "#000000",
  fontWeight: 700,
  cursor: "pointer",
  minWidth: "150px",
  height: "42px",
  alignSelf: "flex-end",
};

const toolbarLabeledControlStyle: CSSProperties = {
  display: "grid",
  gap: "4px",
  minWidth: "150px",
};

const toolbarLabelStyle: CSSProperties = {
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "#53565A",
};

const textareaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: 100,
  resize: "vertical",
  fontFamily: "inherit",
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

const primaryButton: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "none",
  background: "#005670",
  color: "#ffffff",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButton: CSSProperties = {
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

const buttonRowStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "16px",
};

const attentionNumberStyle: CSSProperties = {
  fontSize: 13,
  color: "#53565A",
  fontWeight: 800,
  marginBottom: 8,
};

const attentionTitleStyle: CSSProperties = {
  fontSize: 16,
  fontWeight: 800,
  color: "#000000",
  marginBottom: 8,
};

const emptyBoardStyle: CSSProperties = {
  padding: 18,
  borderRadius: 16,
  background: "#ffffff",
  border: "1px dashed #D0D0CE",
  color: "#53565A",
};

const createTabWrapStyle: CSSProperties = {
  display: "inline-flex",
  background: "#D0D0CE",
  borderRadius: 14,
  padding: 4,
  border: "1px solid #D0D0CE",
  marginBottom: 16,
};

const createTabButtonStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "none",
  cursor: "pointer",
  fontWeight: 800,
};

const createPanelNcrStyle: CSSProperties = {
  padding: 18,
  borderRadius: 18,
  background: "#ECECE7",
  border: "1px solid #D0D0CE",
};

const createPanelCapaStyle: CSSProperties = {
  padding: 18,
  borderRadius: 18,
  background: "#ECECE7",
  border: "1px solid #ECECE7",
};

const detailFormGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "12px",
};

const formSectionTitleStyle: CSSProperties = {
  gridColumn: "1 / -1",
  fontSize: 13,
  fontWeight: 800,
  color: "#000000",
  paddingTop: 4,
};

const pickerRowStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  alignItems: "center",
};

const linkWrapStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const mutedTextStyle: CSSProperties = {
  color: "#D0D0CE",
  fontSize: "13px",
};

const editablePillWrapStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  background: "#ECECE7",
  borderRadius: "999px",
  paddingRight: "6px",
};

const linkPillStyle: CSSProperties = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: "999px",
  background: "#ECECE7",
  color: "#005670",
  fontSize: "12px",
  fontWeight: 800,
  textDecoration: "none",
};

const pillRemoveButtonStyle: CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#005670",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: "14px",
  lineHeight: 1,
};

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

const toolbarFiltersStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  alignItems: "flex-end",
};

const importPanelStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: "16px",
  alignItems: "end",
};

const importActionsStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const importPreviewWrapStyle: CSSProperties = {
  marginTop: "16px",
};

const importTableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  background: "#ffffff",
  minWidth: 960,
  fontSize: "13px",
};

const importTableHeadStyle: CSSProperties = {
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

const importTableRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "0.5fr 0.9fr 1.8fr 1fr 1fr 0.8fr 0.9fr 0.9fr 2fr",
  gap: "10px",
  padding: "12px",
  borderBottom: "1px solid #ECECE7",
  fontSize: "12px",
  color: "#000000",
  lineHeight: 1.4,
  alignItems: "start",
};

const importErrorTextStyle: CSSProperties = {
  color: "#F93822",
  fontWeight: 700,
};

const importOkTextStyle: CSSProperties = {
  color: "#005670",
  fontWeight: 800,
};

const pdfExportPanelStyle: CSSProperties = {
  marginTop: "18px",
  padding: "16px",
  borderRadius: "18px",
  border: "1px solid #ECECE7",
  background: "linear-gradient(180deg, #ECECE7 0%, #ffffff 100%)",
  display: "grid",
  gap: "14px",
};

const pdfExportHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
};

const pdfExportTitleStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 800,
  color: "#000000",
};

const pdfExportSubtitleStyle: CSSProperties = {
  marginTop: "4px",
  fontSize: "12.5px",
  color: "#53565A",
  lineHeight: 1.5,
};

const pdfOptionsGridStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
};

const checkboxCardStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "10px",
  padding: "10px 12px",
  borderRadius: "14px",
  border: "1px solid #D0D0CE",
  background: "#ffffff",
  fontSize: "13px",
  fontWeight: 600,
  color: "#000000",
  lineHeight: 1.4,
};

const checkboxHintStyle: CSSProperties = {
  display: "block",
  marginTop: "3px",
  fontSize: "11.5px",
  fontWeight: 500,
  color: "#53565A",
};

const pdfSavedMetaStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px 18px",
  fontSize: "12.5px",
  color: "#53565A",
};

const linkedActionsPanelStyle: CSSProperties = {
  marginTop: "16px",
  padding: "14px",
  borderRadius: "16px",
  background: "#ECECE7",
  border: "1px solid #ECECE7",
};

const linkedActionListStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
};

const linkedActionItemStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "center",
  padding: "12px",
  borderRadius: "12px",
  background: "#ffffff",
  border: "1px solid #D0D0CE",
};

const linkedActionTitleStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 800,
  color: "#000000",
};

const linkedActionMetaStyle: CSSProperties = {
  marginTop: "4px",
  fontSize: "12px",
  color: "#53565A",
};

const compactInsightListStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
};

const compactInsightCardStyle: CSSProperties = {
  borderRadius: "16px",
  border: "1px solid #D0D0CE",
  padding: "14px",
  background: "#ECECE7",
};

const compactInsightHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  alignItems: "center",
  marginBottom: "10px",
  flexWrap: "wrap",
};

const compactInsightMetaLineStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  color: "#53565A",
  fontSize: "13px",
  lineHeight: 1.45,
  flexWrap: "wrap",
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
  borderRadius: "16px",
  background: "#ffffff",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
};

const registerHeadStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.1fr 2.3fr 1fr 1fr 1fr 1.1fr",
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

const sortableHeaderButtonStyle: CSSProperties = {
  border: "none",
  background: "transparent",
  padding: 0,
  color: "inherit",
  font: "inherit",
  textTransform: "inherit",
  letterSpacing: "inherit",
  cursor: "pointer",
  textAlign: "left",
};

const registerBodyStyle: CSSProperties = {
  maxHeight: "760px",
  overflowY: "auto",
};

const registerRowStyle: CSSProperties = {
  width: "100%",
  textAlign: "left",
  display: "grid",
  gridTemplateColumns: "1.1fr 2.3fr 1fr 1fr 1fr 1.1fr",
  gap: "8px",
  padding: "10px",
  border: "none",
  borderBottom: "1px solid #D0D0CE",
  cursor: "pointer",
  alignItems: "start",
};

const registerTagStyle: CSSProperties = {
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 800,
  display: "inline-block",
};

const registerTitleStyle: CSSProperties = {
  fontSize: "15px",
  fontWeight: 800,
  color: "#000000",
  marginBottom: "6px",
  lineHeight: 1.35,
};

const registerDescriptionStyle: CSSProperties = {
  fontSize: "13px",
  color: "#53565A",
  lineHeight: 1.45,
};

const registerMetaStyle: CSSProperties = {
  display: "flex",
  gap: "14px",
  flexWrap: "wrap",
  marginTop: "10px",
  fontSize: "12px",
  color: "#53565A",
};

const registerSimpleTextStyle: CSSProperties = {
  fontSize: "13px",
  color: "#000000",
  fontWeight: 700,
};

const editHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  alignItems: "center",
  flexWrap: "wrap",
  marginBottom: "14px",
};

const detailRecordNumberStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 800,
  color: "#53565A",
};

const detailRecordTitleStyle: CSSProperties = {
  margin: "4px 0 0 0",
  fontSize: "20px",
  color: "#000000",
};

const evidenceListStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
  marginTop: "16px",
};

const evidenceItemStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
  padding: "14px",
  borderRadius: "12px",
  background: "#ECECE7",
  border: "1px solid #D0D0CE",
};

const evidenceFileNameStyle: CSSProperties = {
  fontWeight: 700,
  color: "#000000",
  wordBreak: "break-word",
};

const evidenceMetaTextStyle: CSSProperties = {
  fontSize: "12px",
  color: "#53565A",
  marginTop: "4px",
  lineHeight: 1.45,
};

const evidenceNoteStyle: CSSProperties = {
  fontSize: "12px",
  color: "#53565A",
  marginTop: "6px",
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
export default function NcrCapaPage() {
  return (
    <Suspense fallback={<main style={{ padding: "24px" }}>Loading NCR...</main>}>
      <NcrCapaPageContent />
    </Suspense>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ChangeEvent, Dispatch, SetStateAction } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  AlignmentType,
  BorderStyle,
  Document as WordDocument,
  Footer,
  Packer,
  PageOrientation,
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
import { ImsTopMetaRow } from "../../../src/components/ImsPrimitives";
import { QualityPageHero } from "../../../src/components/QualityPageHero";
import { QualityKpiCard } from "../../../src/components/QualityKpiCard";
import { WaddenSeaOpenPoints } from "../../../src/components/WaddenSeaOpenPoints";
import { ProjectWorkspaceNav } from "../../../src/components/ProjectWorkspaceNav";
import { supabase } from "../../../src/lib/supabase";

type RawCell = string | number | boolean | Date | null | undefined;

type NoiRecord = {
  id: string;
  sourceRow: number;
  packageName: string;
  supplier: string;
  scope: string;
  itpReference: string;
  activity: string;
  inspectionType: string;
  inspectionDateRaw: string;
  noiReceived: string;
  location: string;
  witnessHours: string;
  startDate: Date | null;
  endDate: Date | null;
  dateConfidence: "Exact" | "Week" | "Range" | "Unresolved";
  source: "IMS NOI" | "Excel";
  status: string;
};

type WorkbookSummary = {
  fileName: string;
  sheetName: string;
  sourceRows: number;
  activities: number;
  datedActivities: number;
  unresolvedActivities: number;
  uploadedAt: string;
};

type ProjectAudit = {
  id: string;
  audit_number: string;
  title: string;
  audit_type: string;
  auditee: string;
  lead_auditor: string;
  audit_date: string;
  audit_month: string;
  status: string;
  location: string;
};

type ProjectAuditFinding = {
  id: string;
  audit_id: string;
  reference: string;
  category: string;
  description: string;
  owner: string;
  status: string;
  due_date: string;
  closure_date: string;
  root_cause: string;
  corrective_action: string;
};

type ProjectAnnex = "audit-ncr" | "audit-programme" | "lookahead" | "open-points";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const MONTHS: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

function cleanCell(value: RawCell) {
  if (value instanceof Date) return DATE_FORMATTER.format(value);
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/Â/g, "")
    .trim();
}

function isMeaningful(value: RawCell) {
  const clean = cleanCell(value);
  return clean !== "" && clean !== "0";
}

function atLocalMidnight(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function startOfIsoWeek(date: Date) {
  const result = atLocalMidnight(date);
  const day = result.getDay() || 7;
  return addDays(result, 1 - day);
}

function isoWeekStart(year: number, week: number) {
  const fourthJanuary = new Date(year, 0, 4);
  return addDays(startOfIsoWeek(fourthJanuary), (week - 1) * 7);
}

function formatDate(date: Date | null) {
  return date ? DATE_FORMATTER.format(date) : "-";
}

function formatInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseMonthName(value: string) {
  return MONTHS[value.toLowerCase().replace(".", "")] ?? null;
}

function safeDate(year: number, month: number, day: number) {
  const result = new Date(year, month, day);
  if (
    result.getFullYear() !== year ||
    result.getMonth() !== month ||
    result.getDate() !== day
  ) {
    return null;
  }
  return result;
}

function parseInspectionDate(
  value: RawCell,
  reportingYear: number
): Pick<NoiRecord, "startDate" | "endDate" | "dateConfidence"> {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const exact = atLocalMidnight(value);
    return { startDate: exact, endDate: exact, dateConfidence: "Exact" };
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const exact = safeDate(parsed.y, parsed.m - 1, parsed.d);
      if (exact) return { startDate: exact, endDate: exact, dateConfidence: "Exact" };
    }
  }

  const raw = cleanCell(value);
  if (!raw) return { startDate: null, endDate: null, dateConfidence: "Unresolved" };

  const slashDate = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (slashDate) {
    const year = Number(slashDate[3].length === 2 ? `20${slashDate[3]}` : slashDate[3]);
    const exact = safeDate(year, Number(slashDate[2]) - 1, Number(slashDate[1]));
    if (exact) {
      const weekBased = /w\/c|week\s+commencing/i.test(raw);
      return {
        startDate: weekBased ? startOfIsoWeek(exact) : exact,
        endDate: weekBased ? addDays(startOfIsoWeek(exact), 6) : exact,
        dateConfidence: weekBased ? "Week" : "Exact",
      };
    }
  }

  const range = raw.match(
    /(\d{1,2})(?:st|nd|rd|th)?\s*[-–—]\s*(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})/i
  );
  if (range) {
    const month = parseMonthName(range[3]);
    if (month !== null) {
      const startDate = safeDate(Number(range[4]), month, Number(range[1]));
      const endDate = safeDate(Number(range[4]), month, Number(range[2]));
      if (startDate && endDate) return { startDate, endDate, dateConfidence: "Range" };
    }
  }

  const namedDate = raw.match(
    /(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)(?:\s+(\d{4}))?/i
  );
  if (namedDate) {
    const month = parseMonthName(namedDate[2]);
    if (month !== null) {
      const exact = safeDate(Number(namedDate[3] || reportingYear), month, Number(namedDate[1]));
      if (exact) {
        const weekBased = /w\/c|week\s+commencing/i.test(raw);
        return {
          startDate: weekBased ? startOfIsoWeek(exact) : exact,
          endDate: weekBased ? addDays(startOfIsoWeek(exact), 6) : exact,
          dateConfidence: weekBased ? "Week" : "Exact",
        };
      }
    }
  }

  const isoWeek = raw.match(/\bweek\s*(\d{1,2})\b/i);
  if (isoWeek) {
    const startDate = isoWeekStart(reportingYear, Number(isoWeek[1]));
    return { startDate, endDate: addDays(startDate, 6), dateConfidence: "Week" };
  }

  return { startDate: null, endDate: null, dateConfidence: "Unresolved" };
}

function overlapsRange(record: NoiRecord, startDate: Date, endDate: Date) {
  if (!record.startDate) return false;
  const recordEnd = record.endDate || record.startDate;
  return record.startDate <= endDate && recordEnd >= startDate;
}

function isInWeek(record: NoiRecord, weekStart: Date) {
  return overlapsRange(record, weekStart, addDays(weekStart, 6));
}

function buildNoiRecords(rows: RawCell[][], reportingYear: number) {
  const headerIndex = rows.findIndex((row) => {
    const cells = row.map((cell) => cleanCell(cell).toLowerCase());
    return (
      cells.includes("package") &&
      cells.includes("supplier") &&
      cells.some((cell) => cell.includes("inspection date"))
    );
  });
  if (headerIndex < 0) throw new Error("Could not find the NOI tracker header row.");

  const headers = rows[headerIndex].map((cell) => cleanCell(cell).toLowerCase());
  const column = (needle: string) => headers.findIndex((header) => header.includes(needle));
  const indexes = {
    packageName: column("package"),
    supplier: column("supplier"),
    scope: column("scope"),
    itpReference: column("itp reference"),
    activity: column("activity number"),
    inspectionType: column("inspection type"),
    inspectionDate: column("inspection date"),
    noiReceived: column("noi received"),
    location: column("location"),
    witnessHours: column("witness time"),
  };

  if (indexes.activity < 0 || indexes.inspectionDate < 0) {
    throw new Error("The tracker is missing ITP Activity Number or Inspection Date.");
  }

  const inherited = {
    packageName: "",
    supplier: "",
    scope: "",
    itpReference: "",
    location: "",
  };
  const records: NoiRecord[] = [];

  rows.slice(headerIndex + 1).forEach((row, offset) => {
    const sourceRow = headerIndex + offset + 2;
    (["packageName", "supplier", "scope", "itpReference", "location"] as const).forEach((key) => {
      const cellIndex = indexes[key];
      if (cellIndex >= 0 && isMeaningful(row[cellIndex])) inherited[key] = cleanCell(row[cellIndex]);
    });

    const activity = cleanCell(row[indexes.activity]);
    if (!activity || activity.toLowerCase() === "notes:") return;
    const inspectionType = cleanCell(row[indexes.inspectionType]);
    const inspectionDateValue = row[indexes.inspectionDate];
    const inspectionDateRaw = cleanCell(inspectionDateValue);
    if (!inspectionType && !inspectionDateRaw) return;

    const parsed = parseInspectionDate(inspectionDateValue, reportingYear);
    records.push({
      id: `noi-row-${sourceRow}`,
      sourceRow,
      packageName: inherited.packageName,
      supplier: inherited.supplier,
      scope: inherited.scope,
      itpReference: inherited.itpReference,
      activity,
      inspectionType,
      inspectionDateRaw,
      noiReceived: cleanCell(row[indexes.noiReceived]),
      location: inherited.location,
      witnessHours: cleanCell(row[indexes.witnessHours]),
      source: "Excel",
      status: "",
      ...parsed,
    });
  });

  return { records, headerIndex };
}

function makeWordCell(text: string, width: number, options?: { header?: boolean; center?: boolean; fill?: string }) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    shading: options?.header || options?.fill
      ? { type: ShadingType.CLEAR, fill: options.fill || "005670", color: "auto" }
      : undefined,
    margins: { top: 90, bottom: 90, left: 90, right: 90 },
    children: [
      new Paragraph({
        alignment: options?.center ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [
          new TextRun({
            text: text || "-",
            font: "Azo Sans",
            size: options?.header ? 15 : 14,
            bold: options?.header,
            color: options?.header ? "FFFFFF" : "000000",
          }),
        ],
      }),
    ],
  });
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ProjectReportsPage() {
  const today = useMemo(() => new Date(), []);
  const [reportingDate, setReportingDate] = useState(formatInputDate(today));
  const [imsRecords, setImsRecords] = useState<NoiRecord[]>([]);
  const [uploadedRecords, setUploadedRecords] = useState<NoiRecord[]>([]);
  const [noiLoading, setNoiLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [workbookSummary, setWorkbookSummary] = useState<WorkbookSummary | null>(null);
  const [message, setMessage] = useState("Upload the current NOI tracker to build the Wadden Sea annex.");
  const [supplierFilter, setSupplierFilter] = useState("All");
  const [packageFilter, setPackageFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [showUnresolved, setShowUnresolved] = useState(false);
  const [isGenerating, setIsGenerating] = useState<"" | "word" | "pdf">("");
  const [activeAnnex, setActiveAnnex] = useState<ProjectAnnex>("lookahead");
  const [projectAudits, setProjectAudits] = useState<ProjectAudit[]>([]);
  const [projectAuditFindings, setProjectAuditFindings] = useState<ProjectAuditFinding[]>([]);
  const [auditDataLoading, setAuditDataLoading] = useState(true);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditTypeFilter, setAuditTypeFilter] = useState("All");
  const [auditStatusFilter, setAuditStatusFilter] = useState("All");
  const [findingStatusFilter, setFindingStatusFilter] = useState("All");
  const [findingCategoryFilter, setFindingCategoryFilter] = useState("All");
  const [selectedNcrAuditIds, setSelectedNcrAuditIds] = useState<string[]>([]);
  const [selectedProgrammeAuditIds, setSelectedProgrammeAuditIds] = useState<string[]>([]);
  const [generatingAuditAnnex, setGeneratingAuditAnnex] = useState<"" | "ncr-word" | "ncr-pdf" | "programme-word" | "programme-pdf">("");

  useEffect(() => {
    void (async () => {
      setAuditDataLoading(true);
      const [auditResult, findingResult] = await Promise.all([
        supabase
          .from("audits")
          .select("id,audit_number,title,audit_type,auditee,lead_auditor,audit_date,audit_month,status,location")
          .order("audit_date", { ascending: true }),
        supabase
          .from("audit_findings")
          .select("id,audit_id,reference,category,description,owner,status,due_date,closure_date,root_cause,corrective_action"),
      ]);
      if (auditResult.error || findingResult.error) {
        setMessage(`Audit annex data failed to load: ${auditResult.error?.message || findingResult.error?.message}`);
        setAuditDataLoading(false);
        return;
      }
      setProjectAudits((auditResult.data || []).map((audit) => ({
        id: String(audit.id || ""),
        audit_number: String(audit.audit_number || ""),
        title: String(audit.title || ""),
        audit_type: String(audit.audit_type || ""),
        auditee: String(audit.auditee || ""),
        lead_auditor: String(audit.lead_auditor || ""),
        audit_date: String(audit.audit_date || ""),
        audit_month: String(audit.audit_month || ""),
        status: String(audit.status || ""),
        location: String(audit.location || ""),
      })));
      setProjectAuditFindings((findingResult.data || []).map((finding) => ({
        id: String(finding.id || ""),
        audit_id: String(finding.audit_id || ""),
        reference: String(finding.reference || ""),
        category: String(finding.category || ""),
        description: String(finding.description || ""),
        owner: String(finding.owner || ""),
        status: String(finding.status || ""),
        due_date: String(finding.due_date || ""),
        closure_date: String(finding.closure_date || ""),
        root_cause: String(finding.root_cause || ""),
        corrective_action: String(finding.corrective_action || ""),
      })));
      setAuditDataLoading(false);
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      setNoiLoading(true);
      const [pointResult, itpResult] = await Promise.all([
        supabase
          .from("project_noi_points")
          .select("id,itp_id,section_number,activity_description,intervention_type,planned_date,noi_number,status")
          .eq("project_key", "wadden-sea")
          .order("planned_date", { ascending: true }),
        supabase
          .from("project_itps")
          .select("id,document_number,title,supplier,scope,package_name")
          .eq("project_key", "wadden-sea"),
      ]);
      if (pointResult.error || itpResult.error) {
        setMessage(`NOI lookahead data failed to load: ${pointResult.error?.message || itpResult.error?.message}`);
        setNoiLoading(false);
        return;
      }
      const itps = new Map((itpResult.data || []).map((itp) => [String(itp.id), itp]));
      const liveRecords = (pointResult.data || []).map((point): NoiRecord => {
        const itp = itps.get(String(point.itp_id));
        const startDate = point.planned_date ? new Date(`${point.planned_date}T00:00:00`) : null;
        return {
          id: `ims-noi-${point.id}`,
          sourceRow: 0,
          packageName: String(itp?.package_name || ""),
          supplier: String(itp?.supplier || ""),
          scope: String(itp?.scope || ""),
          itpReference: String(itp?.document_number || ""),
          activity: `${point.section_number ? `${point.section_number} · ` : ""}${point.activity_description || "Inspection activity"}`,
          inspectionType: String(point.intervention_type || ""),
          inspectionDateRaw: String(point.planned_date || ""),
          noiReceived: String(point.noi_number || ""),
          location: "",
          witnessHours: "",
          startDate,
          endDate: startDate,
          dateConfidence: startDate ? "Exact" : "Unresolved",
          source: "IMS NOI",
          status: String(point.status || "Planned"),
        };
      });
      setImsRecords(liveRecords);
      setSelectedIds((current) => Array.from(new Set([
        ...current,
        ...liveRecords.filter((record) => record.startDate).map((record) => record.id),
      ])));
      setMessage(`Live NOI register loaded: ${liveRecords.length} inspection requirements available.`);
      setNoiLoading(false);
    })();
  }, []);

  const records = useMemo(() => {
    const key = (record: NoiRecord) => [
      record.supplier,
      record.activity.replace(/^\S+\s*·\s*/, ""),
      record.startDate ? formatInputDate(record.startDate) : record.inspectionDateRaw,
      record.inspectionType,
    ].map((value) => value.trim().toLowerCase()).join("|");
    const liveKeys = new Set(imsRecords.map(key));
    return [...imsRecords, ...uploadedRecords.filter((record) => !liveKeys.has(key(record)))];
  }, [imsRecords, uploadedRecords]);

  const reportDate = useMemo(() => {
    const parsed = new Date(`${reportingDate}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? today : parsed;
  }, [reportingDate, today]);
  const horizonStart = useMemo(() => startOfIsoWeek(reportDate), [reportDate]);
  const weekStarts = useMemo(
    () => Array.from({ length: 8 }, (_, index) => addDays(horizonStart, index * 7)),
    [horizonStart]
  );
  const horizonEnd = useMemo(() => addDays(horizonStart, 55), [horizonStart]);

  const lookaheadRecords = useMemo(
    () => records.filter((record) => overlapsRange(record, horizonStart, horizonEnd)),
    [horizonEnd, horizonStart, records]
  );
  const unresolvedRecords = useMemo(
    () => records.filter((record) => !record.startDate),
    [records]
  );
  const supplierOptions = useMemo(
    () => ["All", ...Array.from(new Set(records.map((record) => record.supplier).filter(Boolean))).sort()],
    [records]
  );
  const packageOptions = useMemo(
    () => ["All", ...Array.from(new Set(records.map((record) => record.packageName).filter(Boolean))).sort()],
    [records]
  );

  const filteredRecords = useMemo(() => {
    const base = showUnresolved ? unresolvedRecords : lookaheadRecords;
    const needle = search.trim().toLowerCase();
    return base.filter((record) => {
      const matchesSupplier = supplierFilter === "All" || record.supplier === supplierFilter;
      const matchesPackage = packageFilter === "All" || record.packageName === packageFilter;
      const matchesSearch =
        !needle ||
        [
          record.packageName,
          record.supplier,
          record.scope,
          record.activity,
          record.inspectionType,
          record.location,
        ].some((value) => value.toLowerCase().includes(needle));
      return matchesSupplier && matchesPackage && matchesSearch;
    });
  }, [
    lookaheadRecords,
    packageFilter,
    search,
    showUnresolved,
    supplierFilter,
    unresolvedRecords,
  ]);

  const selectedLookaheadRecords = useMemo(
    () => lookaheadRecords.filter((record) => selectedIds.includes(record.id)),
    [lookaheadRecords, selectedIds]
  );
  const sourceReady = !noiLoading || Boolean(workbookSummary);
  const lookaheadMetrics = useMemo(() => ({
    total: lookaheadRecords.length,
    hold: lookaheadRecords.filter((record) => record.inspectionType.split("/").includes("H")).length,
    witness: lookaheadRecords.filter((record) => record.inspectionType.split("/").includes("W")).length,
    noiOutstanding: lookaheadRecords.filter((record) => !record.noiReceived && !/completed|cancelled/i.test(record.status)).length,
  }), [lookaheadRecords]);
  const calendarWeeks = useMemo(() => weekStarts.map((weekStart) => ({
    weekStart,
    records: lookaheadRecords
      .filter((record) => isInWeek(record, weekStart))
      .sort((left, right) =>
        (left.startDate?.getTime() || 0) - (right.startDate?.getTime() || 0)
        || left.supplier.localeCompare(right.supplier)
      ),
  })), [lookaheadRecords, weekStarts]);

  const filteredProjectAudits = useMemo(() => {
    const needle = auditSearch.trim().toLowerCase();
    return projectAudits.filter((audit) => {
      const matchesSearch =
        !needle ||
        [audit.audit_number, audit.title, audit.auditee, audit.lead_auditor, audit.location]
          .some((value) => value.toLowerCase().includes(needle));
      const matchesType = auditTypeFilter === "All" || audit.audit_type === auditTypeFilter;
      const matchesStatus = auditStatusFilter === "All" || audit.status === auditStatusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [auditSearch, auditStatusFilter, auditTypeFilter, projectAudits]);

  const selectedNcrAudits = useMemo(
    () => filteredProjectAudits.filter((audit) => selectedNcrAuditIds.includes(audit.id)),
    [filteredProjectAudits, selectedNcrAuditIds]
  );

  const selectedProgrammeAudits = useMemo(
    () => filteredProjectAudits.filter((audit) => selectedProgrammeAuditIds.includes(audit.id)),
    [filteredProjectAudits, selectedProgrammeAuditIds]
  );

  const selectedNcrFindings = useMemo(() => {
    const auditIds = new Set(selectedNcrAudits.map((audit) => audit.id));
    return projectAuditFindings.filter((finding) => {
      const matchesAudit = auditIds.has(finding.audit_id);
      const matchesStatus = findingStatusFilter === "All" || finding.status === findingStatusFilter;
      const matchesCategory = findingCategoryFilter === "All" || finding.category === findingCategoryFilter;
      return matchesAudit && matchesStatus && matchesCategory;
    });
  }, [findingCategoryFilter, findingStatusFilter, projectAuditFindings, selectedNcrAudits]);

  function toggleAuditSelection(
    auditId: string,
    setter: Dispatch<SetStateAction<string[]>>
  ) {
    setter((current) =>
      current.includes(auditId) ? current.filter((id) => id !== auditId) : [...current, auditId]
    );
  }

  async function generateEmbeddedAuditWord(kind: "ncr" | "programme") {
    const auditsToExport = kind === "ncr" ? selectedNcrAudits : selectedProgrammeAudits;
    if (!auditsToExport.length) {
      setMessage(`Select at least one audit for the ${kind === "ncr" ? "Audit NCR" : "Audit Programme"} annex.`);
      return;
    }
    if (kind === "ncr" && !selectedNcrFindings.length) {
      setMessage("The selected audits have no findings matching the current finding filters.");
      return;
    }

    setGeneratingAuditAnnex(kind === "ncr" ? "ncr-word" : "programme-word");
    try {
      const border = { style: BorderStyle.SINGLE, size: 2, color: "D0D0CE" };
      const borders = { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };
      const auditMap = new Map(projectAudits.map((audit) => [audit.id, audit]));
      const headers = kind === "ncr"
        ? ["Finding", "Audit", "Title", "Type", "Category", "Status", "Owner", "Due Date", "Description", "Corrective Action"]
        : ["Audit No.", "Title / Function", "Type", "Client / Auditee", "Scheduled", "Audit Date", "Lead Auditor", "Status"];
      const widths = kind === "ncr"
        ? [900, 1050, 1700, 850, 850, 900, 1100, 1050, 2800, 3000]
        : [1200, 2700, 1100, 2100, 1300, 1300, 1700, 1300];
      const rows = kind === "ncr"
        ? selectedNcrFindings.map((finding) => {
            const audit = auditMap.get(finding.audit_id);
            return [
              finding.reference,
              audit?.audit_number || "-",
              audit?.title || "-",
              audit?.audit_type || "-",
              finding.category,
              finding.status,
              finding.owner || "-",
              finding.due_date ? DATE_FORMATTER.format(new Date(`${finding.due_date}T00:00:00`)) : "-",
              finding.description || "-",
              finding.corrective_action || "-",
            ];
          })
        : auditsToExport.map((audit) => [
            audit.audit_number,
            audit.title,
            audit.audit_type,
            audit.auditee || "-",
            audit.audit_month || "-",
            audit.audit_date ? DATE_FORMATTER.format(new Date(`${audit.audit_date}T00:00:00`)) : "-",
            audit.lead_auditor || "-",
            audit.status,
          ]);

      const table = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        layout: TableLayoutType.FIXED,
        columnWidths: widths,
        borders,
        rows: [
          new TableRow({
            tableHeader: true,
            children: headers.map((header, index) => makeWordCell(header, widths[index], { header: true, center: index > 1 })),
          }),
          ...rows.map((row, rowIndex) =>
            new TableRow({
              cantSplit: true,
              children: row.map((value, index) =>
                makeWordCell(value, widths[index], { fill: rowIndex % 2 === 0 ? "ECECE7" : undefined, center: index > 3 && kind === "programme" })
              ),
            })
          ),
        ],
      });
      const title = kind === "ncr" ? "Audit NCR Report" : "Audit Programme";
      const document = new WordDocument({
        styles: { default: { document: { run: { font: "Azo Sans", size: 17, color: "000000" } } } },
        sections: [{
          properties: { page: { size: { orientation: PageOrientation.LANDSCAPE }, margin: { top: 540, right: 540, bottom: 720, left: 540, footer: 300 } } },
          footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Wadden Sea | ${title} | Page `, font: "Azo Sans", size: 15, color: "53565A" }), new SimpleField("PAGE"), new TextRun({ text: " of ", font: "Azo Sans", size: 15, color: "53565A" }), new SimpleField("NUMPAGES")] })] }) },
          children: [
            new Paragraph({ spacing: { after: 50 }, children: [new TextRun({ text: "WADDEN SEA PROJECT", font: "Azo Sans", bold: true, size: 32, color: "005670" })] }),
            new Paragraph({ spacing: { after: 70 }, children: [new TextRun({ text: title, font: "Azo Sans", bold: true, size: 26 })] }),
            new Paragraph({ spacing: { after: 170 }, children: [new TextRun({ text: `${auditsToExport.length} selected audits${kind === "ncr" ? ` | ${selectedNcrFindings.length} findings` : ""} | Generated ${new Date().toLocaleString("en-GB")}`, font: "Azo Sans", size: 16, color: "53565A" })] }),
            table,
          ],
        }],
      });
      downloadBlob(await Packer.toBlob(document), `wadden-sea-${kind === "ncr" ? "audit-ncr-report" : "audit-programme"}-${reportingDate}.docx`);
      setMessage(`${title} Word annex generated.`);
    } catch (error) {
      setMessage(`${kind === "ncr" ? "Audit NCR" : "Audit Programme"} Word generation failed: ${(error as Error).message}`);
    } finally {
      setGeneratingAuditAnnex("");
    }
  }

  function generateEmbeddedAuditPdf(kind: "ncr" | "programme") {
    const auditsToExport = kind === "ncr" ? selectedNcrAudits : selectedProgrammeAudits;
    if (!auditsToExport.length) {
      setMessage(`Select at least one audit for the ${kind === "ncr" ? "Audit NCR" : "Audit Programme"} annex.`);
      return;
    }
    if (kind === "ncr" && !selectedNcrFindings.length) {
      setMessage("The selected audits have no findings matching the current finding filters.");
      return;
    }
    setGeneratingAuditAnnex(kind === "ncr" ? "ncr-pdf" : "programme-pdf");
    try {
      const auditMap = new Map(projectAudits.map((audit) => [audit.id, audit]));
      const title = kind === "ncr" ? "Audit NCR Report" : "Audit Programme";
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFillColor(0, 86, 112);
      doc.rect(0, 0, pageWidth, 24, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(17);
      doc.setTextColor(255, 255, 255);
      doc.text("WADDEN SEA PROJECT", 10, 11);
      doc.setFontSize(10);
      doc.text(title, 10, 18);
      const head = kind === "ncr"
        ? [["Finding", "Audit", "Title", "Type", "Category", "Status", "Owner", "Due Date", "Description", "Corrective Action"]]
        : [["Audit No.", "Title / Function", "Type", "Client / Auditee", "Scheduled", "Audit Date", "Lead Auditor", "Status"]];
      const body = kind === "ncr"
        ? selectedNcrFindings.map((finding) => {
            const audit = auditMap.get(finding.audit_id);
            return [finding.reference, audit?.audit_number || "-", audit?.title || "-", audit?.audit_type || "-", finding.category, finding.status, finding.owner || "-", finding.due_date || "-", finding.description || "-", finding.corrective_action || "-"];
          })
        : auditsToExport.map((audit) => [audit.audit_number, audit.title, audit.audit_type, audit.auditee || "-", audit.audit_month, audit.audit_date, audit.lead_auditor || "-", audit.status]);
      autoTable(doc, {
        startY: 31,
        theme: "grid",
        margin: { left: 10, right: 10, bottom: 15 },
        head,
        body,
        headStyles: { fillColor: [0, 86, 112], textColor: [255, 255, 255], fontStyle: "bold" },
        styles: { fontSize: kind === "ncr" ? 7 : 8, cellPadding: 2, textColor: [0, 0, 0], lineColor: [208, 208, 206], lineWidth: 0.2, valign: "middle", overflow: "linebreak" },
        alternateRowStyles: { fillColor: [236, 236, 231] },
      });
      const pageCount = doc.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) {
        doc.setPage(page);
        doc.setFontSize(8);
        doc.setTextColor(83, 86, 90);
        doc.text(`Wadden Sea | ${title}`, 10, pageHeight - 6);
        doc.text(`Page ${page} of ${pageCount}`, pageWidth - 10, pageHeight - 6, { align: "right" });
      }
      doc.save(`wadden-sea-${kind === "ncr" ? "audit-ncr-report" : "audit-programme"}-${reportingDate}.pdf`);
      setMessage(`${title} PDF annex generated.`);
    } catch (error) {
      setMessage(`${kind === "ncr" ? "Audit NCR" : "Audit Programme"} PDF generation failed: ${(error as Error).message}`);
    } finally {
      setGeneratingAuditAnnex("");
    }
  }

  async function handleWorkbookUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      setMessage(`Reading ${file.name}...`);
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array", cellDates: true });
      const sheetName = workbook.SheetNames.find((name) => name.toLowerCase().includes("noi")) || workbook.SheetNames[0];
      if (!sheetName) throw new Error("The workbook does not contain a worksheet.");
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<RawCell[]>(worksheet, {
        header: 1,
        raw: true,
        defval: null,
      });
      const { records: imported } = buildNoiRecords(rows, reportDate.getFullYear());
      const dated = imported.filter((record) => record.startDate);
      const importedLookahead = dated.filter((record) => overlapsRange(record, horizonStart, horizonEnd));

      setUploadedRecords(imported);
      setSelectedIds((current) => Array.from(new Set([...current, ...importedLookahead.map((record) => record.id)])));
      setWorkbookSummary({
        fileName: file.name,
        sheetName,
        sourceRows: rows.length,
        activities: imported.length,
        datedActivities: dated.length,
        unresolvedActivities: imported.length - dated.length,
        uploadedAt: new Date().toLocaleString("en-GB"),
      });
      setShowUnresolved(false);
      setMessage(
        `Loaded ${imported.length} inspection activities. ${importedLookahead.length} fall within the current eight-week window.`
      );
    } catch (error) {
      const err = error as Error;
      setMessage(`NOI tracker import failed: ${err.message}`);
    }
  }

  function toggleRecord(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function selectedRowsForExport() {
    return selectedLookaheadRecords
      .slice()
      .sort((a, b) => {
        const dateDiff = (a.startDate?.getTime() || 0) - (b.startDate?.getTime() || 0);
        return dateDiff || a.supplier.localeCompare(b.supplier) || a.activity.localeCompare(b.activity);
      });
  }

  async function generateWord() {
    const selected = selectedRowsForExport();
    if (!selected.length) {
      setMessage("Select at least one lookahead activity before generating Word.");
      return;
    }

    setIsGenerating("word");
    try {
      const border = { style: BorderStyle.SINGLE, size: 2, color: "D0D0CE" };
      const borders = {
        top: border,
        bottom: border,
        left: border,
        right: border,
        insideHorizontal: border,
        insideVertical: border,
      };
      const detailWidths = [950, 1150, 3300, 1150, 1050, 1050, 850, 2650, 850];
      const timelineWidths = [3700, ...weekStarts.map(() => 1170)];

      const detailTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        layout: TableLayoutType.FIXED,
        columnWidths: detailWidths,
        borders,
        rows: [
          new TableRow({
            tableHeader: true,
            children: ["Package", "Supplier", "Task / ITP Activity", "Inspection Type", "Start", "End", "NOI", "Location", "Hours"]
              .map((header, index) => makeWordCell(header, detailWidths[index], { header: true, center: index > 2 })),
          }),
          ...selected.map((record, rowIndex) =>
            new TableRow({
              cantSplit: true,
              children: [
                record.packageName,
                record.supplier,
                record.activity,
                record.inspectionType,
                formatDate(record.startDate),
                formatDate(record.endDate),
                record.noiReceived || "-",
                record.location,
                record.witnessHours || "-",
              ].map((value, index) =>
                makeWordCell(value, detailWidths[index], {
                  center: [4, 5, 6, 8].includes(index),
                  fill: rowIndex % 2 === 0 ? "ECECE7" : undefined,
                })
              ),
            })
          ),
        ],
      });

      const timelineTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        layout: TableLayoutType.FIXED,
        columnWidths: timelineWidths,
        borders,
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              makeWordCell("Task / Inspection", timelineWidths[0], { header: true }),
              ...weekStarts.map((week, index) =>
                makeWordCell(`W${index + 1}\nW/C ${formatDate(week)}`, timelineWidths[index + 1], {
                  header: true,
                  center: true,
                })
              ),
            ],
          }),
          ...selected.map((record, rowIndex) =>
            new TableRow({
              cantSplit: true,
              children: [
                makeWordCell(`${record.supplier} - ${record.activity}`, timelineWidths[0], {
                  fill: rowIndex % 2 === 0 ? "ECECE7" : undefined,
                }),
                ...weekStarts.map((week, index) =>
                  makeWordCell(isInWeek(record, week) ? "INSPECTION" : "", timelineWidths[index + 1], {
                    center: true,
                    fill: isInWeek(record, week) ? "F59E0B" : rowIndex % 2 === 0 ? "ECECE7" : undefined,
                  })
                ),
              ],
            })
          ),
        ],
      });

      const document = new WordDocument({
        styles: {
          default: { document: { run: { font: "Azo Sans", size: 18, color: "000000" } } },
        },
        sections: [
          {
            properties: {
              page: {
                size: { orientation: PageOrientation.LANDSCAPE },
                margin: { top: 540, right: 540, bottom: 720, left: 540, footer: 300 },
              },
            },
            footers: {
              default: new Footer({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({ text: "Wadden Sea | Eight-Week Inspection Lookahead | Page ", font: "Azo Sans", size: 15, color: "53565A" }),
                      new SimpleField("PAGE"),
                      new TextRun({ text: " of ", font: "Azo Sans", size: 15, color: "53565A" }),
                      new SimpleField("NUMPAGES"),
                    ],
                  }),
                ],
              }),
            },
            children: [
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                layout: TableLayoutType.FIXED,
                columnWidths: [14000],
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: "005670" },
                  bottom: { style: BorderStyle.NONE, size: 0, color: "005670" },
                  left: { style: BorderStyle.NONE, size: 0, color: "005670" },
                  right: { style: BorderStyle.NONE, size: 0, color: "005670" },
                  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "005670" },
                  insideVertical: { style: BorderStyle.NONE, size: 0, color: "005670" },
                },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        shading: { type: ShadingType.CLEAR, fill: "005670", color: "auto" },
                        margins: { top: 170, bottom: 170, left: 180, right: 180 },
                        children: [
                          new Paragraph({
                            children: [new TextRun({ text: "WADDEN SEA PROJECT", font: "Azo Sans", bold: true, size: 34, color: "FFFFFF" })],
                          }),
                          new Paragraph({
                            children: [new TextRun({ text: "Eight-Week Inspection Lookahead", font: "Azo Sans", bold: true, size: 20, color: "FFFFFF" })],
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new Paragraph({
                spacing: { before: 170, after: 50 },
                children: [new TextRun({ text: "Annex - Eight-Week Inspection Lookahead", font: "Azo Sans", bold: true, size: 30 })],
              }),
              new Paragraph({
                spacing: { after: 160 },
                children: [
                  new TextRun({
                    text: `${formatDate(horizonStart)} to ${formatDate(horizonEnd)} | ${selected.length} selected activities | Source: Live IMS NOI register${workbookSummary ? ` + ${workbookSummary.fileName}` : ""}`,
                    font: "Azo Sans",
                    size: 17,
                    color: "53565A",
                  }),
                ],
              }),
              detailTable,
              new Paragraph({
                spacing: { before: 220, after: 80 },
                children: [new TextRun({ text: "Eight-Week Timeline", font: "Azo Sans", bold: true, size: 24 })],
              }),
              timelineTable,
              new Paragraph({
                spacing: { before: 100 },
                children: [
                  new TextRun({
                    text: "Dates are derived from the uploaded NOI tracker. Week-only entries are shown across the stated week.",
                    font: "Azo Sans",
                    italics: true,
                    size: 15,
                    color: "53565A",
                  }),
                ],
              }),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(document);
      downloadBlob(blob, `wadden-sea-8-week-lookahead-${reportingDate}.docx`);
      setMessage(`Word annex generated with ${selected.length} selected activities.`);
    } catch (error) {
      const err = error as Error;
      setMessage(`Word annex generation failed: ${err.message}`);
    } finally {
      setIsGenerating("");
    }
  }

  function generatePdf() {
    const selected = selectedRowsForExport();
    if (!selected.length) {
      setMessage("Select at least one lookahead activity before generating PDF.");
      return;
    }

    setIsGenerating("pdf");
    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;

      doc.setFillColor(0, 86, 112);
      doc.rect(0, 0, pageWidth, 24, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text("WADDEN SEA PROJECT", margin, 11);
      doc.setFontSize(10);
      doc.text("Eight-Week Inspection Lookahead", margin, 18);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(15);
      doc.text("Annex - Eight-Week Inspection Lookahead", margin, 34);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(83, 86, 90);
      doc.text(`${formatDate(horizonStart)} to ${formatDate(horizonEnd)} | ${selected.length} selected activities`, margin, 41);
      doc.text(`Source: Live IMS NOI register${workbookSummary ? ` + ${workbookSummary.fileName}` : ""}`, pageWidth - margin, 41, { align: "right" });

      autoTable(doc, {
        startY: 47,
        theme: "grid",
        margin: { left: margin, right: margin, bottom: 15 },
        head: [["Package", "Supplier", "Task / ITP Activity", "Inspection Type", "Start", "End", "NOI", "Location", "Hours"]],
        body: selected.map((record) => [
          record.packageName,
          record.supplier,
          record.activity,
          record.inspectionType,
          formatDate(record.startDate),
          formatDate(record.endDate),
          record.noiReceived || "-",
          record.location || "-",
          record.witnessHours || "-",
        ]),
        headStyles: { fillColor: [0, 86, 112], textColor: [255, 255, 255], fontStyle: "bold" },
        styles: { fontSize: 7.2, cellPadding: 1.8, textColor: [0, 0, 0], lineColor: [208, 208, 206], lineWidth: 0.2, valign: "middle" },
        alternateRowStyles: { fillColor: [236, 236, 231] },
        columnStyles: {
          0: { cellWidth: 16 },
          1: { cellWidth: 22 },
          2: { cellWidth: 62 },
          3: { cellWidth: 25 },
          4: { cellWidth: 22 },
          5: { cellWidth: 22 },
          6: { cellWidth: 14, halign: "center" },
          7: { cellWidth: 62 },
          8: { cellWidth: 14, halign: "center" },
        },
      });

      doc.addPage();
      doc.setFillColor(0, 86, 112);
      doc.rect(0, 0, pageWidth, 20, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text("Eight-Week Timeline", margin, 13);

      autoTable(doc, {
        startY: 27,
        theme: "grid",
        margin: { left: margin, right: margin, bottom: 15 },
        head: [[
          "Task / Inspection",
          ...weekStarts.map((week, index) => `W${index + 1}\nW/C ${formatDate(week)}`),
        ]],
        body: selected.map((record) => [
          `${record.supplier} - ${record.activity}`,
          ...weekStarts.map((week) => (isInWeek(record, week) ? "INSPECTION" : "")),
        ]),
        headStyles: { fillColor: [0, 86, 112], textColor: [255, 255, 255], fontStyle: "bold", halign: "center" },
        styles: { fontSize: 7.2, cellPadding: 2, textColor: [0, 0, 0], lineColor: [208, 208, 206], lineWidth: 0.2, valign: "middle", halign: "center" },
        columnStyles: { 0: { cellWidth: 72, halign: "left" } },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index > 0 && data.cell.raw === "INSPECTION") {
            data.cell.styles.fillColor = [245, 158, 11];
            data.cell.styles.textColor = [120, 53, 15];
            data.cell.styles.fontStyle = "bold";
          }
        },
      });

      const pageCount = doc.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) {
        doc.setPage(page);
        doc.setDrawColor(208, 208, 206);
        doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(83, 86, 90);
        doc.text("Wadden Sea | Eight-Week Inspection Lookahead", margin, pageHeight - 6);
        doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 6, { align: "right" });
      }

      doc.save(`wadden-sea-8-week-lookahead-${reportingDate}.pdf`);
      setMessage(`PDF annex generated with ${selected.length} selected activities.`);
    } catch (error) {
      const err = error as Error;
      setMessage(`PDF annex generation failed: ${err.message}`);
    } finally {
      setIsGenerating("");
    }
  }

  return (
    <main>
      <QualityPageHero
        label="PROJECT REPORTING"
        title="Project Reports"
        description="Create monthly project annexes from controlled source registers without maintaining duplicate trackers."
        contextCards={[
          { label: "Project", value: "Wadden Sea" },
          { label: "Eight-Week Window", value: `${formatDate(horizonStart)} - ${formatDate(horizonEnd)}` },
        ]}
      />

      <ImsTopMetaRow backHref="/projects/wadden-sea" backLabel="Back to Wadden Sea" status={<><strong>Status:</strong> {message}</>} />

      <ProjectWorkspaceNav projectKey="wadden-sea" active="reports" />

      <nav className="ims-tabs" style={reportWorkspaceTabsStyle} aria-label="Project report annexes" role="tablist">
        {[
          ["audit-ncr", "Audit NCR Report"],
          ["audit-programme", "Audit Programme"],
          ["lookahead", "8-Week Lookahead"],
          ["open-points", "Open Points"],
        ].map(([view, label]) => (
          <button
            key={view}
            type="button"
            role="tab"
            aria-selected={activeAnnex === view}
            data-active={activeAnnex === view ? "true" : "false"}
            onClick={() => setActiveAnnex(view as ProjectAnnex)}
            style={activeAnnex === view ? activeReportWorkspaceTabStyle : reportWorkspaceButtonStyle}
          >
            {label}
          </button>
        ))}
      </nav>

      <section className="quality-kpi-grid" style={reportStatsGridStyle}>
        <QualityKpiCard title="Programme Audits" value={projectAudits.length} accent="#63B1BC" onClick={() => setActiveAnnex("audit-programme")} active={activeAnnex === "audit-programme"} />
        <QualityKpiCard title="Audit Findings" value={projectAuditFindings.length} accent="#53565A" onClick={() => setActiveAnnex("audit-ncr")} active={activeAnnex === "audit-ncr"} />
        <QualityKpiCard title="NOI Requirements" value={imsRecords.length} accent="#005670" href="/projects/wadden-sea/noi" />
        <QualityKpiCard title="In Eight Weeks" value={lookaheadMetrics.total} accent="#FFAD00" onClick={() => setActiveAnnex("lookahead")} active={activeAnnex === "lookahead"} />
        <QualityKpiCard title="Hold Points" value={lookaheadMetrics.hold} accent="#F93822" onClick={() => setActiveAnnex("lookahead")} />
        <QualityKpiCard title="NOI Outstanding" value={lookaheadMetrics.noiOutstanding} accent="#FFAD00" onClick={() => setActiveAnnex("lookahead")} />
      </section>

      {activeAnnex === "open-points" ? <WaddenSeaOpenPoints /> : null}

      {activeAnnex === "audit-ncr" || activeAnnex === "audit-programme" ? (
        <section style={panelStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <h2 style={sectionTitleStyle}>
                {activeAnnex === "audit-ncr" ? "Wadden Sea Audit NCR Annex" : "Wadden Sea Audit Programme Annex"}
              </h2>
              <p style={sectionSubtitleStyle}>
                Filter the live audit register and tick only the project-applicable records. Hidden selections are not exported.
              </p>
            </div>
            <div style={buttonRowStyle}>
              <button
                type="button"
                style={secondaryButtonStyle}
                onClick={() =>
                  activeAnnex === "audit-ncr"
                    ? void generateEmbeddedAuditWord("ncr")
                    : void generateEmbeddedAuditWord("programme")
                }
                disabled={
                  Boolean(generatingAuditAnnex) ||
                  (activeAnnex === "audit-ncr" ? selectedNcrAudits.length === 0 : selectedProgrammeAudits.length === 0)
                }
              >
                {generatingAuditAnnex.endsWith("word") ? "Generating Word..." : "Generate Word"}
              </button>
              <button
                type="button"
                style={primaryButtonStyle}
                onClick={() =>
                  activeAnnex === "audit-ncr"
                    ? generateEmbeddedAuditPdf("ncr")
                    : generateEmbeddedAuditPdf("programme")
                }
                disabled={
                  Boolean(generatingAuditAnnex) ||
                  (activeAnnex === "audit-ncr" ? selectedNcrAudits.length === 0 : selectedProgrammeAudits.length === 0)
                }
              >
                {generatingAuditAnnex.endsWith("pdf") ? "Generating PDF..." : "Generate PDF"}
              </button>
            </div>
          </div>

          <div style={filterRowStyle}>
            <input
              value={auditSearch}
              onChange={(event) => setAuditSearch(event.target.value)}
              placeholder="Search client, audit number, title, auditor or location"
              style={{ ...inputStyle, minWidth: "320px" }}
            />
            <select value={auditTypeFilter} onChange={(event) => setAuditTypeFilter(event.target.value)} style={inputStyle}>
              <option value="All">All audit types</option>
              <option value="Internal">Internal</option>
              <option value="External">External</option>
              <option value="Supplier">Supplier</option>
            </select>
            <select value={auditStatusFilter} onChange={(event) => setAuditStatusFilter(event.target.value)} style={inputStyle}>
              <option value="All">All audit statuses</option>
              <option value="Planned">Planned</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Overdue">Overdue</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            {activeAnnex === "audit-ncr" ? (
              <>
                <select value={findingStatusFilter} onChange={(event) => setFindingStatusFilter(event.target.value)} style={inputStyle}>
                  <option value="All">Open and closed findings</option>
                  <option value="Open">Open only</option>
                  <option value="In Progress">In progress only</option>
                  <option value="Closed">Closed only</option>
                </select>
                <select value={findingCategoryFilter} onChange={(event) => setFindingCategoryFilter(event.target.value)} style={inputStyle}>
                  <option value="All">All finding categories</option>
                  <option value="Major">Major</option>
                  <option value="Minor">Minor</option>
                  <option value="OFI">OFI</option>
                  <option value="OBS">OBS</option>
                </select>
              </>
            ) : null}
          </div>

          <div style={buttonRowStyle}>
            <button
              type="button"
              style={secondaryButtonStyle}
              onClick={() => {
                const visibleIds = filteredProjectAudits.map((audit) => audit.id);
                if (activeAnnex === "audit-ncr") {
                  setSelectedNcrAuditIds((current) => Array.from(new Set([...current, ...visibleIds])));
                } else {
                  setSelectedProgrammeAuditIds((current) => Array.from(new Set([...current, ...visibleIds])));
                }
              }}
              disabled={!filteredProjectAudits.length}
            >
              Select all filtered ({filteredProjectAudits.length})
            </button>
            <button
              type="button"
              style={secondaryButtonStyle}
              onClick={() => {
                const visibleIds = new Set(filteredProjectAudits.map((audit) => audit.id));
                if (activeAnnex === "audit-ncr") {
                  setSelectedNcrAuditIds((current) => current.filter((id) => !visibleIds.has(id)));
                } else {
                  setSelectedProgrammeAuditIds((current) => current.filter((id) => !visibleIds.has(id)));
                }
              }}
              disabled={!filteredProjectAudits.length}
            >
              Clear filtered
            </button>
            <span style={selectionSummaryStyle}>
              {activeAnnex === "audit-ncr"
                ? `${selectedNcrAudits.length} audits | ${selectedNcrFindings.length} findings`
                : `${selectedProgrammeAudits.length} audits selected`}
            </span>
          </div>

          {auditDataLoading ? (
            <div style={emptyStateStyle}>Loading live audit register...</div>
          ) : (
            <div style={embeddedAuditListStyle}>
              {filteredProjectAudits.length === 0 ? (
                <p style={emptyTextStyle}>No audits match the current filters.</p>
              ) : (
                filteredProjectAudits.map((audit) => {
                  const selected = activeAnnex === "audit-ncr"
                    ? selectedNcrAuditIds.includes(audit.id)
                    : selectedProgrammeAuditIds.includes(audit.id);
                  const auditFindings = projectAuditFindings.filter((finding) => finding.audit_id === audit.id);
                  const openCount = auditFindings.filter((finding) => finding.status !== "Closed").length;
                  const closedCount = auditFindings.filter((finding) => finding.status === "Closed").length;
                  return (
                    <label
                      key={audit.id}
                      style={{
                        ...embeddedAuditRowStyle,
                        background: selected ? "#ECECE7" : "#ffffff",
                        borderColor: selected ? "#005670" : "#D0D0CE",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() =>
                          toggleAuditSelection(
                            audit.id,
                            activeAnnex === "audit-ncr" ? setSelectedNcrAuditIds : setSelectedProgrammeAuditIds
                          )
                        }
                        style={checkboxStyle}
                      />
                      <span style={activityIdentityStyle}>
                        <strong>{audit.audit_number} · {audit.title}</strong>
                        <small>{audit.auditee || "No client / auditee"} · {audit.audit_month || "No scheduled month"}</small>
                      </span>
                      <span style={activityMetaStyle}>{audit.audit_type}</span>
                      <span style={activityMetaStyle}>{audit.lead_auditor || "-"}</span>
                      <span style={auditFindingSummaryStyle}>{openCount} open · {closedCount} closed</span>
                      <span style={auditStatusBadgeStyle}>{audit.status}</span>
                    </label>
                  );
                })
              )}
            </div>
          )}
        </section>
      ) : null}

      {activeAnnex === "lookahead" ? (
      <section id="lookahead" style={panelStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h2 style={sectionTitleStyle}>Eight-Week Inspection Lookahead</h2>
            <p style={sectionSubtitleStyle}>
              The live Project NOI register is the master. Excel upload remains available as a secondary source for additional activities.
            </p>
          </div>
          <label style={uploadButtonStyle}>
            Add Excel Tracker
            <input type="file" accept=".xlsx,.xls" onChange={handleWorkbookUpload} style={{ display: "none" }} />
          </label>
        </div>

        <div style={controlGridStyle}>
          <label style={fieldStyle}>
            <span>Reporting date</span>
            <input type="date" value={reportingDate} onChange={(event) => setReportingDate(event.target.value)} style={inputStyle} />
          </label>
          <div style={dateWindowCardStyle}>
            <span>Week 1</span>
            <strong>W/C {formatDate(horizonStart)}</strong>
          </div>
          <div style={dateWindowCardStyle}>
            <span>Week 8 ends</span>
            <strong>{formatDate(horizonEnd)}</strong>
          </div>
        </div>

        {sourceReady ? (
          <div style={validationGridStyle}>
            <div style={validationCardStyle}><span>Primary source</span><strong>Live NOI register</strong><small>{imsRecords.length} controlled requirements</small></div>
            <div style={validationCardStyle}><span>Excel additions</span><strong>{workbookSummary ? workbookSummary.activities : 0}</strong><small>{workbookSummary ? `${workbookSummary.fileName} · ${workbookSummary.uploadedAt}` : "No workbook added"}</small></div>
            <div style={validationCardStyle}><span>In eight weeks</span><strong>{lookaheadMetrics.total}</strong><small>{selectedLookaheadRecords.length} selected for annex</small></div>
            <button type="button" style={warningCardStyle} onClick={() => setShowUnresolved((current) => !current)}>
              <span>Unresolved dates</span><strong>{unresolvedRecords.length}</strong><small>{showUnresolved ? "Show lookahead" : "Review rows"}</small>
            </button>
          </div>
        ) : (
          <div style={emptyStateStyle}>
            <strong>Loading the live Wadden Sea NOI register…</strong>
            <span>Upcoming inspection dates will appear automatically.</span>
          </div>
        )}
      </section>
      ) : null}

      {activeAnnex === "lookahead" && sourceReady ? (
        <>
          {!showUnresolved ? (
            <section style={panelStyle}>
              <div style={sectionHeaderStyle}>
                <div>
                  <h2 style={sectionTitleStyle}>Upcoming Inspection Calendar</h2>
                  <p style={sectionSubtitleStyle}>A week-by-week operational view of every dated W/H point in the reporting window.</p>
                </div>
              </div>
              <div style={inspectionMetricGridStyle}>
                <div style={inspectionMetricStyle}><span>Upcoming</span><strong>{lookaheadMetrics.total}</strong><small>dated inspections</small></div>
                <div style={{ ...inspectionMetricStyle, borderColor: "#ECECE7", background: "#ECECE7" }}><span>Hold points</span><strong>{lookaheadMetrics.hold}</strong><small>H or combined H</small></div>
                <div style={{ ...inspectionMetricStyle, borderColor: "#ECECE7", background: "#ECECE7" }}><span>Witness points</span><strong>{lookaheadMetrics.witness}</strong><small>W or combined W</small></div>
                <div style={{ ...inspectionMetricStyle, borderColor: lookaheadMetrics.noiOutstanding ? "#ECECE7" : "#ECECE7", background: lookaheadMetrics.noiOutstanding ? "#ECECE7" : "#ECECE7" }}><span>NOI outstanding</span><strong>{lookaheadMetrics.noiOutstanding}</strong><small>number not yet recorded</small></div>
              </div>
              <div style={inspectionCalendarStyle}>
                {calendarWeeks.map(({ weekStart, records: weekRecords }, index) => (
                  <div key={formatInputDate(weekStart)} style={inspectionWeekStyle}>
                    <div style={inspectionWeekHeaderStyle}>
                      <span>Week {index + 1}</span>
                      <strong>W/C {formatDate(weekStart)}</strong>
                      <small>{weekRecords.length} inspection{weekRecords.length === 1 ? "" : "s"}</small>
                    </div>
                    <div style={inspectionWeekBodyStyle}>
                      {weekRecords.length ? weekRecords.map((record) => (
                        <div key={`${formatInputDate(weekStart)}-${record.id}`} style={inspectionCardStyle}>
                          <div style={inspectionCardTopStyle}>
                            <span style={record.inspectionType.includes("H") ? holdPointStyle : witnessPointStyle}>{record.inspectionType}</span>
                            <small>{record.startDate ? formatDate(record.startDate) : ""}</small>
                          </div>
                          <strong>{record.supplier || "Supplier TBC"}</strong>
                          <span>{record.activity}</span>
                          <small>{record.noiReceived ? `NOI ${record.noiReceived}` : "NOI number outstanding"} · {record.status || "Planned"}</small>
                        </div>
                      )) : <span style={emptyWeekStyle}>No inspections</span>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
          <section style={panelStyle}>
            <div style={sectionHeaderStyle}>
              <div>
                <h2 style={sectionTitleStyle}>{showUnresolved ? "Date Validation" : "Applicable Inspection Activities"}</h2>
                <p style={sectionSubtitleStyle}>
                  {showUnresolved
                    ? "These activities could not be placed automatically because the tracker date is blank, ongoing or non-specific."
                    : "Tick only the activities required in this project annex. Selections outside the current eight-week window are never exported."}
                </p>
              </div>
              {!showUnresolved ? (
                <div style={buttonRowStyle}>
                  <button
                    type="button"
                    style={secondaryButtonStyle}
                    onClick={() => setSelectedIds((current) => Array.from(new Set([...current, ...filteredRecords.map((record) => record.id)])))}
                  >
                    Select all filtered
                  </button>
                  <button
                    type="button"
                    style={secondaryButtonStyle}
                    onClick={() => {
                      const visible = new Set(filteredRecords.map((record) => record.id));
                      setSelectedIds((current) => current.filter((id) => !visible.has(id)));
                    }}
                  >
                    Clear filtered
                  </button>
                </div>
              ) : null}
            </div>

            <div style={filterRowStyle}>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search supplier, task, package or location" style={{ ...inputStyle, minWidth: "300px" }} />
              <select value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)} style={inputStyle}>
                {supplierOptions.map((supplier) => <option key={supplier} value={supplier}>{supplier === "All" ? "All suppliers" : supplier}</option>)}
              </select>
              <select value={packageFilter} onChange={(event) => setPackageFilter(event.target.value)} style={inputStyle}>
                {packageOptions.map((packageName) => <option key={packageName} value={packageName}>{packageName === "All" ? "All packages" : packageName}</option>)}
              </select>
            </div>

            <div style={activityListStyle}>
              {filteredRecords.length === 0 ? (
                <p style={emptyTextStyle}>No activities match the current view and filters.</p>
              ) : (
                filteredRecords.map((record) => {
                  const selected = selectedIds.includes(record.id);
                  return (
                    <label key={record.id} style={{ ...activityRowStyle, background: selected ? "#ECECE7" : "#ffffff", borderColor: selected ? "#005670" : "#D0D0CE" }}>
                      {!showUnresolved ? <input type="checkbox" checked={selected} onChange={() => toggleRecord(record.id)} style={checkboxStyle} /> : <span style={warningDotStyle}>!</span>}
                      <span style={activityIdentityStyle}>
                        <strong>{record.supplier || "Unknown supplier"} · {record.activity}</strong>
                        <small>{record.packageName || "No package"} · {record.scope || "No scope"}</small>
                      </span>
                      <span style={activityMetaStyle}>{record.inspectionType || "-"}</span>
                      <span style={activityMetaStyle}>
                        {record.startDate ? `${formatDate(record.startDate)}${record.endDate && record.endDate.getTime() !== record.startDate.getTime() ? ` - ${formatDate(record.endDate)}` : ""}` : record.inspectionDateRaw || "No date"}
                      </span>
                      <span style={noiBadgeStyle}>NOI {record.noiReceived || "-"}</span>
                    </label>
                  );
                })
              )}
            </div>
          </section>

          {!showUnresolved ? (
            <section style={panelStyle}>
              <div style={sectionHeaderStyle}>
                <div>
                  <h2 style={sectionTitleStyle}>Annex Preview</h2>
                  <p style={sectionSubtitleStyle}>{selectedLookaheadRecords.length} selected activities across eight weeks.</p>
                </div>
                <div style={buttonRowStyle}>
                  <button type="button" style={secondaryButtonStyle} onClick={() => void generateWord()} disabled={!selectedLookaheadRecords.length || Boolean(isGenerating)}>
                    {isGenerating === "word" ? "Generating Word..." : "Generate Word"}
                  </button>
                  <button type="button" style={primaryButtonStyle} onClick={generatePdf} disabled={!selectedLookaheadRecords.length || Boolean(isGenerating)}>
                    {isGenerating === "pdf" ? "Generating PDF..." : "Generate PDF"}
                  </button>
                </div>
              </div>

              <div style={timelineWrapStyle}>
                <div style={timelineHeaderStyle}>
                  <div>Supplier / Task</div>
                  {weekStarts.map((week, index) => (
                    <div key={formatInputDate(week)}><strong>W{index + 1}</strong><span>W/C {formatDate(week)}</span></div>
                  ))}
                </div>
                {selectedRowsForExport().map((record) => (
                  <div key={record.id} style={timelineRowStyle}>
                    <div style={timelineTaskStyle}><strong>{record.supplier}</strong><span>{record.activity}</span></div>
                    {weekStarts.map((week) => (
                      <div key={formatInputDate(week)} style={timelineCellStyle}>
                        {isInWeek(record, week) ? <span style={timelineBarStyle}>{record.inspectionType || "Inspection"}</span> : null}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </main>
  );
}

const reportWorkspaceTabsStyle: CSSProperties = { display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px" };
const reportWorkspaceTabStyle: CSSProperties = { minHeight: "44px", display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "10px 14px", borderRadius: "10px", border: "none", background: "#ECECE7", color: "#000000", textDecoration: "none", fontWeight: 800, fontSize: "13px", boxSizing: "border-box" };
const reportWorkspaceButtonStyle: CSSProperties = { ...reportWorkspaceTabStyle, fontFamily: "inherit", cursor: "pointer" };
const activeReportWorkspaceTabStyle: CSSProperties = { ...reportWorkspaceButtonStyle, background: "#005670", color: "#ffffff" };
const reportStatsGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: "16px", marginBottom: "20px" };
const panelStyle: CSSProperties = { background: "#ffffff", borderRadius: "18px", padding: "20px", boxShadow: "0 1px 3px rgba(15,23,42,0.08)", marginBottom: "20px" };
const sectionHeaderStyle: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "14px", flexWrap: "wrap", marginBottom: "16px" };
const sectionTitleStyle: CSSProperties = { margin: 0, fontSize: "20px", color: "#000000" };
const sectionSubtitleStyle: CSSProperties = { margin: "6px 0 0", color: "#53565A", fontSize: "14px", maxWidth: "760px", lineHeight: 1.5 };
const annexCardsStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "12px" };
const annexCardStyle: CSSProperties = { display: "grid", gap: "8px", padding: "16px", minHeight: "125px", border: "1px solid #D0D0CE", borderRadius: "14px", background: "#ECECE7", color: "#53565A", textDecoration: "none", fontSize: "13px", lineHeight: 1.45, textAlign: "left", cursor: "pointer", fontFamily: "inherit" };
const activeAnnexCardStyle: CSSProperties = { borderColor: "#005670", background: "#ECECE7", boxShadow: "0 0 0 2px rgba(0,86,112,0.08)" };
const annexEyebrowStyle: CSSProperties = { color: "#005670", fontSize: "11px", fontWeight: 900, letterSpacing: "0.05em" };
const uploadButtonStyle: CSSProperties = { ...annexEyebrowStyle, display: "inline-flex", padding: "11px 16px", borderRadius: "10px", background: "#005670", color: "#ffffff", cursor: "pointer", letterSpacing: 0 };
const controlGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "minmax(220px, 1fr) repeat(2, minmax(180px, 0.7fr))", gap: "12px" };
const fieldStyle: CSSProperties = { display: "grid", gap: "6px", color: "#53565A", fontSize: "13px", fontWeight: 800 };
const inputStyle: CSSProperties = { padding: "10px 12px", borderRadius: "10px", border: "1px solid #D0D0CE", background: "#ffffff", color: "#000000", minHeight: "40px", boxSizing: "border-box" };
const dateWindowCardStyle: CSSProperties = { display: "grid", gap: "5px", padding: "11px 14px", borderRadius: "12px", background: "#ECECE7", border: "1px solid #ECECE7", color: "#005670", fontSize: "12px" };
const validationGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", marginTop: "16px" };
const validationCardStyle: CSSProperties = { display: "grid", gap: "4px", padding: "13px", borderRadius: "12px", border: "1px solid #D0D0CE", background: "#ECECE7", textAlign: "left", color: "#53565A" };
const warningCardStyle: CSSProperties = { ...validationCardStyle, cursor: "pointer", borderColor: "#ECECE7", background: "#ECECE7" };
const emptyStateStyle: CSSProperties = { display: "grid", gap: "6px", marginTop: "16px", padding: "22px", border: "1px dashed #D0D0CE", borderRadius: "14px", background: "#ECECE7", color: "#53565A", textAlign: "center" };
const inspectionMetricGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px", marginBottom: "16px" };
const inspectionMetricStyle: CSSProperties = { display: "grid", gap: "3px", padding: "13px", border: "1px solid #ECECE7", borderRadius: "12px", background: "#ECECE7", color: "#53565A" };
const inspectionCalendarStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(8, minmax(185px, 1fr))", gap: "10px", overflowX: "auto", paddingBottom: "6px" };
const inspectionWeekStyle: CSSProperties = { minWidth: "185px", border: "1px solid #D0D0CE", borderRadius: "12px", overflow: "hidden", background: "#ECECE7" };
const inspectionWeekHeaderStyle: CSSProperties = { display: "grid", gap: "2px", padding: "10px", background: "#005670", color: "#ffffff", fontSize: "11px" };
const inspectionWeekBodyStyle: CSSProperties = { display: "grid", alignContent: "start", gap: "7px", padding: "8px", minHeight: "145px" };
const inspectionCardStyle: CSSProperties = { display: "grid", gap: "5px", padding: "9px", border: "1px solid #D0D0CE", borderRadius: "9px", background: "#ffffff", color: "#53565A", fontSize: "11px", lineHeight: 1.35 };
const inspectionCardTopStyle: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" };
const holdPointStyle: CSSProperties = { padding: "3px 6px", borderRadius: "999px", background: "#ECECE7", color: "#F93822", fontWeight: 900 };
const witnessPointStyle: CSSProperties = { padding: "3px 6px", borderRadius: "999px", background: "#ECECE7", color: "#000000", fontWeight: 900 };
const emptyWeekStyle: CSSProperties = { color: "#D0D0CE", fontSize: "11px", textAlign: "center", padding: "22px 4px" };
const buttonRowStyle: CSSProperties = { display: "flex", gap: "9px", flexWrap: "wrap", alignItems: "center" };
const primaryButtonStyle: CSSProperties = { padding: "10px 15px", border: 0, borderRadius: "10px", background: "#005670", color: "#ffffff", fontWeight: 800, cursor: "pointer" };
const secondaryButtonStyle: CSSProperties = { ...primaryButtonStyle, background: "#D0D0CE", color: "#000000" };
const filterRowStyle: CSSProperties = { display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "14px" };
const activityListStyle: CSSProperties = { display: "grid", gap: "8px", maxHeight: "520px", overflowY: "auto" };
const activityRowStyle: CSSProperties = { display: "grid", gridTemplateColumns: "24px minmax(260px, 1.5fr) minmax(120px, 0.5fr) minmax(180px, 0.7fr) 76px", gap: "12px", alignItems: "center", padding: "12px", border: "1px solid #D0D0CE", borderRadius: "12px", cursor: "pointer" };
const checkboxStyle: CSSProperties = { width: "18px", height: "18px", accentColor: "#005670" };
const warningDotStyle: CSSProperties = { display: "grid", placeItems: "center", width: "20px", height: "20px", borderRadius: "50%", background: "#ECECE7", color: "#000000", fontWeight: 900 };
const activityIdentityStyle: CSSProperties = { display: "grid", gap: "3px", color: "#000000", fontSize: "13px" };
const activityMetaStyle: CSSProperties = { color: "#53565A", fontSize: "12px", lineHeight: 1.4 };
const noiBadgeStyle: CSSProperties = { padding: "5px 8px", borderRadius: "999px", background: "#ECECE7", color: "#005670", fontSize: "11px", fontWeight: 900, textAlign: "center" };
const emptyTextStyle: CSSProperties = { margin: 0, color: "#53565A", padding: "14px" };
const selectionSummaryStyle: CSSProperties = { display: "inline-flex", alignItems: "center", padding: "8px 11px", borderRadius: "999px", background: "#ECECE7", color: "#005670", fontSize: "12px", fontWeight: 900 };
const embeddedAuditListStyle: CSSProperties = { display: "grid", gap: "8px", maxHeight: "560px", overflowY: "auto", marginTop: "14px" };
const embeddedAuditRowStyle: CSSProperties = { display: "grid", gridTemplateColumns: "24px minmax(280px, 1.4fr) 90px 120px 135px 95px", gap: "12px", alignItems: "center", padding: "12px", border: "1px solid #D0D0CE", borderRadius: "12px", cursor: "pointer" };
const auditFindingSummaryStyle: CSSProperties = { color: "#53565A", fontSize: "12px", fontWeight: 800 };
const auditStatusBadgeStyle: CSSProperties = { padding: "5px 8px", borderRadius: "999px", background: "#ECECE7", color: "#005670", fontSize: "11px", fontWeight: 900, textAlign: "center" };
const timelineWrapStyle: CSSProperties = { width: "100%", overflowX: "auto", border: "1px solid #D0D0CE", borderRadius: "14px" };
const timelineColumns = "minmax(300px, 2fr) repeat(8, minmax(100px, 1fr))";
const timelineHeaderStyle: CSSProperties = { display: "grid", gridTemplateColumns: timelineColumns, minWidth: "1120px", background: "#005670", color: "#ffffff", fontSize: "11px", fontWeight: 800 };
const timelineRowStyle: CSSProperties = { display: "grid", gridTemplateColumns: timelineColumns, minWidth: "1120px", minHeight: "58px", borderBottom: "1px solid #D0D0CE" };
const timelineTaskStyle: CSSProperties = { display: "grid", gap: "3px", padding: "10px 12px", borderRight: "1px solid #D0D0CE", color: "#53565A", fontSize: "12px" };
const timelineCellStyle: CSSProperties = { display: "grid", placeItems: "center", padding: "6px", borderRight: "1px solid #D0D0CE", background: "#ECECE7" };
const timelineBarStyle: CSSProperties = { display: "block", width: "100%", padding: "7px 4px", borderRadius: "6px", background: "#FFAD00", color: "#000000", textAlign: "center", fontSize: "9px", fontWeight: 900 };

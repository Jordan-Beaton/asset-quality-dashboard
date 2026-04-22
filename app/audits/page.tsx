"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "../../src/lib/supabase";

type AuditType = "Internal" | "External" | "Supplier";
type AuditStatus = "Planned" | "In Progress" | "Completed" | "Overdue" | "Cancelled";
type FindingSeverity = "Major" | "Minor" | "OFI" | "OBS";
type FindingStatus = "Open" | "In Progress" | "Closed";
type SortKey = "audit_month" | "audit_number" | "title" | "audit_type" | "lead_auditor" | "findings";

type AuditRecord = {
  id: string;
  audit_number: string;
  title: string;
  audit_type: AuditType;
  auditee: string;
  lead_auditor: string;
  audit_date: string;
  audit_month: string;
  status: AuditStatus;
  standards: string[];
  procedure_reference: string;
  certification_body: string;
  location: string;
  findings: {
    major: number;
    minor: number;
    ofi: number;
    obs: number;
  };
  linked_ncrs: string[];
  linked_actions: string[];
  report_file_name: string;
  report_file_size: number | null;
  report_uploaded_at: string;
  report_url: string;
  report_storage_path: string;
};

type FindingRecord = {
  id: string;
  audit_id: string;
  reference: string;
  clause: string;
  category: FindingSeverity;
  description: string;
  owner: string;
  status: FindingStatus;
  due_date: string;
  closure_date: string;
  root_cause: string;
  containment_action: string;
  corrective_action: string;
};

type AuditForm = {
  title: string;
  audit_type: AuditType;
  auditee: string;
  lead_auditor: string;
  audit_date: string;
  audit_month: string;
  status: AuditStatus;
  standards: string[];
  procedure_reference: string;
  certification_body: string;
  location: string;
};

type FindingForm = {
  clause: string;
  category: FindingSeverity;
  description: string;
  owner: string;
  status: FindingStatus;
  due_date: string;
  closure_date: string;
  root_cause: string;
  containment_action: string;
  corrective_action: string;
};

type AuditFileRow = {
  id: string;
  audit_id: string;
  file_name: string | null;
  file_path: string | null;
  file_size: number | null;
  uploaded_at: string | null;
};

type AuditFindingRow = {
  id: string;
  audit_id: string;
  reference: string | null;
  clause: string | null;
  category: string | null;
  description: string | null;
  owner: string | null;
  status: string | null;
  due_date: string | null;
  closure_date: string | null;
  root_cause: string | null;
  containment_action: string | null;
  corrective_action: string | null;
};

type AuditLinkOption = {
  id: string;
  label: string;
};

const STORAGE_BUCKET = "audit-evidence";

function createEmptyAudit(): AuditForm {
  return {
    title: "",
    audit_type: "Internal",
    auditee: "",
    lead_auditor: "",
    audit_date: new Date().toISOString().slice(0, 10),
    audit_month: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
    status: "Planned",
    standards: ["ISO 9001:2015"],
    procedure_reference: "",
    certification_body: "",
    location: "",
  };
}

function createEmptyFinding(): FindingForm {
  return {
    clause: "",
    category: "Minor",
    description: "",
    owner: "",
    status: "Open",
    due_date: "",
    closure_date: "",
    root_cause: "",
    containment_action: "",
    corrective_action: "",
  };
}

function createDefaultAuditRecord(form?: Partial<AuditRecord>): AuditRecord {
  return {
    id: form?.id || "",
    audit_number: form?.audit_number || "",
    title: form?.title || "",
    audit_type: form?.audit_type || "Internal",
    auditee: form?.auditee || "",
    lead_auditor: form?.lead_auditor || "",
    audit_date: form?.audit_date || "",
    audit_month: form?.audit_month || "",
    status: form?.status || "Planned",
    standards: form?.standards || [],
    procedure_reference: form?.procedure_reference || "",
    certification_body: form?.certification_body || "",
    location: form?.location || "",
    findings: form?.findings || { major: 0, minor: 0, ofi: 0, obs: 0 },
    linked_ncrs: form?.linked_ncrs || [],
    linked_actions: form?.linked_actions || [],
    report_file_name: form?.report_file_name || "",
    report_file_size: form?.report_file_size ?? null,
    report_uploaded_at: form?.report_uploaded_at || "",
    report_url: form?.report_url || "",
    report_storage_path: form?.report_storage_path || "",
  };
}

function getAuditPrefix(type: AuditType) {
  if (type === "Internal") return "INT";
  if (type === "External") return "EXT";
  return "SUP";
}

function getYearSuffixFromDate(auditDate: string) {
  if (!auditDate) return String(new Date().getFullYear()).slice(-2);

  const parsed = new Date(auditDate);
  if (Number.isNaN(parsed.getTime())) return String(new Date().getFullYear()).slice(-2);

  return String(parsed.getFullYear()).slice(-2);
}

function buildNextAuditNumber(type: AuditType, auditDate: string, audits: AuditRecord[]) {
  const prefix = getAuditPrefix(type);
  const year = getYearSuffixFromDate(auditDate);
  const pattern = new RegExp(`^${prefix}-${year}-(\\d{3})$`);

  const used = audits
    .map((audit) => {
      const match = audit.audit_number.match(pattern);
      return match ? Number(match[1]) : null;
    })
    .filter((value): value is number => value !== null);

  const next = used.length ? Math.max(...used) + 1 : 1;
  return `${prefix}-${year}-${String(next).padStart(3, "0")}`;
}

function buildNextFindingReference(auditId: string, findings: FindingRecord[]) {
  const used = findings
    .filter((finding) => finding.audit_id === auditId)
    .map((finding) => {
      const match = finding.reference.match(/^F-(\d{3})$/);
      return match ? Number(match[1]) : null;
    })
    .filter((value): value is number => value !== null);

  const next = used.length ? Math.max(...used) + 1 : 1;
  return `F-${String(next).padStart(3, "0")}`;
}

function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string) {
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

function formatMonth(value: string) {
  if (!value) return "-";
  const [year, month] = value.split("-");
  if (!year || !month) return value;

  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function formatFileSize(value: number | null) {
  if (!value || value <= 0) return "-";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function getStatusTone(status: string) {
  const value = status.toLowerCase();

  if (value.includes("overdue")) return { bg: "#fee2e2", color: "#991b1b" };
  if (value.includes("progress")) return { bg: "#fef3c7", color: "#92400e" };
  if (value.includes("planned")) return { bg: "#dbeafe", color: "#1d4ed8" };
  if (value.includes("completed") || value.includes("closed")) return { bg: "#dcfce7", color: "#166534" };
  if (value.includes("cancelled")) return { bg: "#e2e8f0", color: "#334155" };

  return { bg: "#f1f5f9", color: "#475569" };
}

function getFindingTone(category: FindingSeverity) {
  if (category === "Major") return { bg: "#fee2e2", color: "#991b1b" };
  if (category === "Minor") return { bg: "#fef3c7", color: "#92400e" };
  if (category === "OBS") return { bg: "#dbeafe", color: "#1d4ed8" };
  return { bg: "#dcfce7", color: "#166534" };
}

function getFrequencyBadgeStyle(frequency: "Reduce" | "Maintain" | "Increase"): CSSProperties {
  if (frequency === "Increase") {
    return { ...badgeStyle, background: "#fee2e2", color: "#991b1b" };
  }
  if (frequency === "Reduce") {
    return { ...badgeStyle, background: "#dcfce7", color: "#166534" };
  }
  return { ...badgeStyle, background: "#fef3c7", color: "#92400e" };
}

function countFindingsForAudit(auditId: string, findings: FindingRecord[]) {
  const scoped = findings.filter((finding) => finding.audit_id === auditId);

  return {
    major: scoped.filter((finding) => finding.category === "Major").length,
    minor: scoped.filter((finding) => finding.category === "Minor").length,
    ofi: scoped.filter((finding) => finding.category === "OFI").length,
    obs: scoped.filter((finding) => finding.category === "OBS").length,
  };
}

function buildStandardsLabel(audit: AuditRecord) {
  return audit.standards.length ? audit.standards.join(" / ") : "-";
}

function getAuditDocumentNumber(auditType: AuditType) {
  return auditType === "Supplier" ? "ENS-HSEQ-FRM-050" : "ENS-HSEQ-FRM-049";
}

function getTotalFindings(audit: AuditRecord) {
  return audit.findings.major + audit.findings.minor + audit.findings.ofi + audit.findings.obs;
}

function compareText(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function getAreaLabel(audit: AuditRecord) {
  return audit.title.trim() || audit.audit_number.trim() || "Untitled Audit";
}

function buildFindingRepeatKey(finding: FindingRecord) {
  const description = finding.description.trim().toLowerCase().replace(/\s+/g, " ");
  const clause = finding.clause.trim().toLowerCase().replace(/\s+/g, " ");
  return description || clause || finding.reference.trim().toLowerCase();
}

function getRiskFrequency(score: number, totalAudits: number) {
  if (score <= 10) {
    return totalAudits > 1 ? "Reduce" : "Maintain";
  }
  if (score <= 20) {
    return "Maintain";
  }
  return "Increase";
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function normaliseAuditStatus(value: string | null | undefined): AuditStatus {
  const input = (value || "").trim().toLowerCase();

  if (input === "planned") return "Planned";
  if (input === "in progress") return "In Progress";
  if (input === "completed") return "Completed";
  if (input === "overdue") return "Overdue";
  if (input === "cancelled") return "Cancelled";

  return "Planned";
}

function normaliseAuditType(value: string | null | undefined): AuditType {
  const input = (value || "").trim().toLowerCase();

  if (input === "external") return "External";
  if (input === "supplier") return "Supplier";
  return "Internal";
}

function normaliseFindingCategory(value: string | null | undefined): FindingSeverity {
  const input = (value || "").trim().toLowerCase();

  if (input === "major") return "Major";
  if (input === "ofi") return "OFI";
  if (input === "obs") return "OBS";
  return "Minor";
}

function normaliseFindingStatus(value: string | null | undefined): FindingStatus {
  const input = (value || "").trim().toLowerCase();

  if (input === "closed") return "Closed";
  if (input === "in progress") return "In Progress";
  return "Open";
}

function parseStandards(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function unknownArrayToOptions(
  data: unknown,
  primaryKeys: string[],
  secondaryKeys: string[]
): AuditLinkOption[] {
  if (!Array.isArray(data)) return [];

  return data
    .map((row) => {
      if (typeof row !== "object" || row === null) return null;

      const obj = row as Record<string, unknown>;
      const fallbackId = String(obj["id"] ?? "").trim();
      const primary =
        primaryKeys.map((key) => String(obj[key] ?? "").trim()).find(Boolean) || fallbackId;
      const secondary =
        secondaryKeys.map((key) => String(obj[key] ?? "").trim()).find(Boolean) || "";

      if (!primary) return null;

      return {
        id: primary,
        label: secondary ? `${primary} - ${secondary}` : primary,
      };
    })
    .filter((item): item is AuditLinkOption => Boolean(item?.id));
}

async function tryLoadNcrOptions(): Promise<AuditLinkOption[]> {
  const attempts = [
    { table: "ncrs", columns: "id,ncr_number,title" },
    { table: "ncrs", columns: "id,ncr_number,description" },
    { table: "ncr_capa", columns: "id,ncr_number,title" },
    { table: "ncr_capa", columns: "id,reference,title" },
  ];

  for (const attempt of attempts) {
    const result = await supabase.from(attempt.table).select(attempt.columns).limit(250);
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

async function tryLoadActionOptions(): Promise<AuditLinkOption[]> {
  const attempts = [
    { table: "actions", columns: "id,action_number,title" },
    { table: "actions", columns: "id,action_id,title" },
    { table: "actions", columns: "id,reference,title" },
    { table: "actions", columns: "id,action_number,description" },
  ];

  for (const attempt of attempts) {
    const result = await supabase.from(attempt.table).select(attempt.columns).limit(250);
    if (result.error) continue;

    const mapped = unknownArrayToOptions(
      result.data as unknown,
      ["action_number", "action_id", "reference", "id"],
      ["title", "description"]
    );

    if (mapped.length > 0) return mapped;
  }

  return [];
}

async function createSignedFileUrl(path: string) {
  if (!path) return "";

  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return "";
  return data.signedUrl;
}

function MultiSelectStandards({
  selected,
  onToggle,
  options,
}: {
  selected: string[];
  onToggle: (value: string) => void;
  options: string[];
}) {
  return (
    <div style={chipGridStyle}>
      {options.map((option) => {
        const active = selected.includes(option);

        return (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            style={{
              ...chipButtonStyle,
              background: active ? "#0f766e" : "#f8fafc",
              color: active ? "#ffffff" : "#334155",
              borderColor: active ? "#0f766e" : "#cbd5e1",
            }}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function AuditsPageContent() {
  const searchParams = useSearchParams();
  const linkedSearch = searchParams.get("search")?.trim() || "";
  const linkedStatus = searchParams.get("status")?.trim() || "All";
  const linkedType = searchParams.get("type")?.trim() || "All";
  const linkedMonth = searchParams.get("month")?.trim() || "All";
  const linkedFindingStatus = searchParams.get("findingStatus")?.trim() || "All";
  const linkedFindingCategory = searchParams.get("findingCategory")?.trim() || "All";

  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [findings, setFindings] = useState<FindingRecord[]>([]);
  const [selectedAuditId, setSelectedAuditId] = useState<string>("");
  const [search, setSearch] = useState(linkedSearch);
  const [statusFilter, setStatusFilter] = useState<AuditStatus | "All">(linkedStatus as AuditStatus | "All");
  const [typeFilter, setTypeFilter] = useState<AuditType | "All">(linkedType as AuditType | "All");
  const [monthFilter, setMonthFilter] = useState<string>(linkedMonth);
  const [sortKey, setSortKey] = useState<SortKey>("audit_month");
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [message, setMessage] = useState("Loading audits...");
  const [showFindingForm, setShowFindingForm] = useState(false);
  const [isUploadingReport, setIsUploadingReport] = useState(false);
  const [isSavingLinks, setIsSavingLinks] = useState(false);

  const [form, setForm] = useState<AuditForm>(createEmptyAudit());
  const [detailForm, setDetailForm] = useState<AuditForm>(createEmptyAudit());
  const [findingForm, setFindingForm] = useState<FindingForm>(createEmptyFinding());

  const [ncrOptions, setNcrOptions] = useState<AuditLinkOption[]>([]);
  const [actionOptions, setActionOptions] = useState<AuditLinkOption[]>([]);
  const [selectedNcrToAdd, setSelectedNcrToAdd] = useState("");
  const [selectedActionToAdd, setSelectedActionToAdd] = useState("");
  const programmeSectionRef = useRef<HTMLDivElement | null>(null);

  const computedAuditNumber = useMemo(
    () => buildNextAuditNumber(form.audit_type, form.audit_date, audits),
    [form.audit_type, form.audit_date, audits]
  );

  async function loadLinkOptions() {
    const [loadedNcrs, loadedActions] = await Promise.all([tryLoadNcrOptions(), tryLoadActionOptions()]);
    setNcrOptions(loadedNcrs);
    setActionOptions(loadedActions);
  }

  async function loadAudits(showLoadedMessage = true) {
    const [auditRes, findingRes, fileRes] = await Promise.all([
      supabase.from("audits").select("*").order("audit_date", { ascending: false }),
      supabase.from("audit_findings").select("*").order("reference", { ascending: true }),
      supabase.from("audit_files").select("id,audit_id,file_name,file_path,file_size,uploaded_at"),
    ]);

    if (auditRes.error) {
      setMessage(`Load audits failed: ${auditRes.error.message}`);
      return;
    }

    if (findingRes.error) {
      setMessage(`Load findings failed: ${findingRes.error.message}`);
      return;
    }

    if (fileRes.error) {
      setMessage(`Load audit files failed: ${fileRes.error.message}`);
      return;
    }

    const fileRows = ((fileRes.data || []) as AuditFileRow[]).reduce<Record<string, AuditFileRow>>((acc, row) => {
      if (!row.audit_id) return acc;

      const current = acc[row.audit_id];
      const rowTime = new Date(row.uploaded_at || 0).getTime();
      const currentTime = new Date(current?.uploaded_at || 0).getTime();

      if (!current || rowTime >= currentTime) {
        acc[row.audit_id] = row;
      }

      return acc;
    }, {});

    const findingRows = ((findingRes.data || []) as AuditFindingRow[]).map((row) => ({
      id: row.id,
      audit_id: row.audit_id,
      reference: row.reference || "F-001",
      clause: row.clause || "",
      category: normaliseFindingCategory(row.category),
      description: row.description || "",
      owner: row.owner || "",
      status: normaliseFindingStatus(row.status),
      due_date: row.due_date || "",
      closure_date: row.closure_date || "",
      root_cause: row.root_cause || "",
      containment_action: row.containment_action || "",
      corrective_action: row.corrective_action || "",
    }));

    const auditRows = ((auditRes.data || []) as Record<string, unknown>[]).map((row) => {
      const auditId = String(row.id || "");
      const linkedFile = fileRows[auditId];
      const mappedFindings = countFindingsForAudit(auditId, findingRows);

      return createDefaultAuditRecord({
        id: auditId,
        audit_number: String(row.audit_number || ""),
        title: String(row.title || ""),
        audit_type: normaliseAuditType(String(row.audit_type || "")),
        auditee: String(row.auditee || ""),
        lead_auditor: String(row.lead_auditor || ""),
        audit_date: String(row.audit_date || ""),
        audit_month: String(row.audit_month || ""),
        status: normaliseAuditStatus(String(row.status || "")),
        standards: parseStandards(row.standards),
        procedure_reference: String(row.procedure_reference || ""),
        certification_body: String(row.certification_body || ""),
        location: String(row.location || ""),
        findings: mappedFindings,
        linked_ncrs: Array.isArray(row.linked_ncrs)
          ? (row.linked_ncrs as unknown[]).map((item) => String(item || "")).filter(Boolean)
          : [],
        linked_actions: Array.isArray(row.linked_actions)
          ? (row.linked_actions as unknown[]).map((item) => String(item || "")).filter(Boolean)
          : [],
        report_file_name: linkedFile?.file_name || "",
        report_file_size: linkedFile?.file_size ?? null,
        report_uploaded_at: linkedFile?.uploaded_at || "",
        report_storage_path: linkedFile?.file_path || "",
      });
    });

    const signedUrls = await Promise.all(
      auditRows.map(async (audit) => ({
        id: audit.id,
        url: audit.report_storage_path ? await createSignedFileUrl(audit.report_storage_path) : "",
      }))
    );

    const urlMap = signedUrls.reduce<Record<string, string>>((acc, item) => {
      acc[item.id] = item.url;
      return acc;
    }, {});

    const hydratedAudits = auditRows.map((audit) => ({
      ...audit,
      report_url: urlMap[audit.id] || "",
    }));

    setFindings(findingRows);
    setAudits(hydratedAudits);
    setSelectedAuditId((current) => current || hydratedAudits[0]?.id || "");
    if (showLoadedMessage) {
      if (linkedSearch) {
        const searchLower = linkedSearch.toLowerCase();
        const matchCount = hydratedAudits.filter(
          (audit) =>
            audit.audit_number.toLowerCase() === searchLower ||
            audit.title.toLowerCase().includes(searchLower) ||
            audit.linked_ncrs.some((item) => item.toLowerCase() === searchLower) ||
            audit.linked_actions.some((item) => item.toLowerCase() === searchLower)
        ).length;
        setMessage(`Loaded audits successfully. ${matchCount} linked match${matchCount === 1 ? "" : "es"} found for "${linkedSearch}".`);
      } else {
        setMessage("Audit dashboard ready.");
      }
    }
  }

  useEffect(() => {
    void (async () => {
      await Promise.all([loadAudits(), loadLinkOptions()]);
    })();
  }, []);

  const monthOptions = useMemo(() => {
    return Array.from(new Set(audits.map((audit) => audit.audit_month))).sort();
  }, [audits]);

  useEffect(() => {
    if (form.audit_date) {
      const date = new Date(form.audit_date);
      if (!Number.isNaN(date.getTime())) {
        const nextMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        setForm((prev) => ({ ...prev, audit_month: nextMonth }));
      }
    }
  }, [form.audit_date]);

  const selectedAudit = useMemo(
    () => audits.find((audit) => audit.id === selectedAuditId) || null,
    [audits, selectedAuditId]
  );

  useEffect(() => {
    if (!selectedAudit) return;

    setDetailForm({
      title: selectedAudit.title,
      audit_type: selectedAudit.audit_type,
      auditee: selectedAudit.auditee,
      lead_auditor: selectedAudit.lead_auditor,
      audit_date: selectedAudit.audit_date,
      audit_month: selectedAudit.audit_month,
      status: selectedAudit.status,
      standards: [...selectedAudit.standards],
      procedure_reference: selectedAudit.procedure_reference,
      certification_body: selectedAudit.certification_body,
      location: selectedAudit.location,
    });
    setSelectedNcrToAdd("");
    setSelectedActionToAdd("");
    setShowFindingForm(false);
  }, [selectedAudit]);

  useEffect(() => {
    if (!linkedSearch || audits.length === 0) return;

    const value = linkedSearch.toLowerCase();
    const match = audits.find(
      (audit) =>
        audit.audit_number.toLowerCase() === value ||
        audit.title.toLowerCase().includes(value) ||
        audit.linked_ncrs.some((item) => item.toLowerCase() === value) ||
        audit.linked_actions.some((item) => item.toLowerCase() === value)
    );

    if (match) {
      setSelectedAuditId(match.id);
    }
  }, [linkedSearch, audits]);

  useEffect(() => {
    if (form.audit_type === "Supplier") {
      setForm((prev) => ({
        ...prev,
        procedure_reference: "",
        certification_body: "",
        standards: prev.standards.length ? prev.standards : ["ISO 9001:2015"],
      }));
    }

    if (form.audit_type === "External") {
      setForm((prev) => ({
        ...prev,
        procedure_reference: "",
        standards: prev.standards.length
          ? prev.standards
          : ["ISO 9001:2015", "ISO 14001:2015", "ISO 45001:2018"],
      }));
    }

    if (form.audit_type === "Internal") {
      setForm((prev) => ({
        ...prev,
        certification_body: "",
        standards: prev.standards.length ? prev.standards : ["ISO 9001:2015"],
      }));
    }
  }, [form.audit_type]);

  const selectedFindings = useMemo(
    () => findings.filter((finding) => finding.audit_id === selectedAuditId),
    [findings, selectedAuditId]
  );

  const filteredAudits = useMemo(() => {
    const lower = search.trim().toLowerCase();

    const base = audits.filter((audit) => {
      const matchesSearch =
        !lower ||
        audit.audit_number.toLowerCase().includes(lower) ||
        audit.title.toLowerCase().includes(lower) ||
        audit.lead_auditor.toLowerCase().includes(lower) ||
        audit.location.toLowerCase().includes(lower) ||
        buildStandardsLabel(audit).toLowerCase().includes(lower) ||
        audit.procedure_reference.toLowerCase().includes(lower) ||
        audit.certification_body.toLowerCase().includes(lower) ||
        audit.linked_ncrs.some((item) => item.toLowerCase().includes(lower)) ||
        audit.linked_actions.some((item) => item.toLowerCase().includes(lower));

      const matchesStatus = statusFilter === "All" || audit.status === statusFilter;
      const matchesType = typeFilter === "All" || audit.audit_type === typeFilter;
      const matchesMonth = monthFilter === "All" || audit.audit_month === monthFilter;
      const scopedFindings = findings.filter((finding) => finding.audit_id === audit.id);
      const matchesFindingStatus =
        linkedFindingStatus === "All" ||
        scopedFindings.some((finding) => finding.status === linkedFindingStatus);
      const matchesFindingCategory =
        linkedFindingCategory === "All" ||
        scopedFindings.some((finding) => finding.category === linkedFindingCategory);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesType &&
        matchesMonth &&
        matchesFindingStatus &&
        matchesFindingCategory
      );
    });

    const sorted = [...base].sort((a, b) => {
      let result = 0;

      switch (sortKey) {
        case "audit_month":
          result = compareText(a.audit_month, b.audit_month);
          break;
        case "audit_number":
          result = compareText(a.audit_number, b.audit_number);
          break;
        case "title":
          result = compareText(a.title, b.title);
          break;
        case "audit_type":
          result = compareText(a.audit_type, b.audit_type);
          break;
        case "lead_auditor":
          result = compareText(a.lead_auditor, b.lead_auditor);
          break;
        case "findings":
          result = getTotalFindings(a) - getTotalFindings(b);
          break;
        default:
          result = 0;
      }

      return sortAsc ? result : -result;
    });

    return sorted;
  }, [
    audits,
    findings,
    search,
    statusFilter,
    typeFilter,
    monthFilter,
    linkedFindingStatus,
    linkedFindingCategory,
    sortKey,
    sortAsc,
  ]);

  const kpis = useMemo(() => {
    const planned = audits.filter((audit) => audit.status === "Planned").length;
    const inProgress = audits.filter((audit) => audit.status === "In Progress").length;
    const overdue = audits.filter((audit) => audit.status === "Overdue").length;
    const completed = audits.filter((audit) => audit.status === "Completed").length;
    const totalMajor = findings.filter((finding) => finding.category === "Major").length;
    const openFindings = findings.filter((finding) => finding.status !== "Closed").length;

    return { planned, inProgress, overdue, completed, totalMajor, openFindings };
  }, [audits, findings]);

  const findingRepeatCountByKey = useMemo(() => {
    return findings.reduce<Record<string, number>>((acc, finding) => {
      const repeatKey = buildFindingRepeatKey(finding);
      if (!repeatKey) return acc;
      acc[repeatKey] = (acc[repeatKey] || 0) + 1;
      return acc;
    }, {});
  }, [findings]);

  const auditRiskById = useMemo(() => {
    return audits.reduce<
      Record<
        string,
        {
          repeatFindings: number;
          riskScore: number;
          frequency: "Reduce" | "Maintain" | "Increase";
        }
      >
    >((acc, audit) => {
      const auditFindings = findings.filter((finding) => finding.audit_id === audit.id);
      const repeatFindings = auditFindings.filter((finding) => {
        const repeatKey = buildFindingRepeatKey(finding);
        return repeatKey ? (findingRepeatCountByKey[repeatKey] || 0) > 1 : false;
      }).length;
      const riskScore =
        1 +
        audit.findings.major * 5 +
        audit.findings.minor * 3 +
        (audit.findings.ofi + audit.findings.obs) * 1 +
        repeatFindings * 2;

      acc[audit.id] = {
        repeatFindings,
        riskScore,
        frequency: getRiskFrequency(riskScore, 1),
      };

      return acc;
    }, {});
  }, [audits, findings, findingRepeatCountByKey]);

  const riskAreaReview = useMemo(() => {
    const grouped = new Map<
      string,
      {
        label: string;
        auditNumbers: string[];
        totalAudits: number;
        major: number;
        minor: number;
        ofiObs: number;
        repeatFindings: number;
        totalFindings: number;
        riskScore: number;
        frequency: "Reduce" | "Maintain" | "Increase";
      }
    >();

    audits.forEach((audit) => {
      const label = getAreaLabel(audit);
      const current = grouped.get(label) || {
        label,
        auditNumbers: [],
        totalAudits: 0,
        major: 0,
        minor: 0,
        ofiObs: 0,
        repeatFindings: 0,
        totalFindings: 0,
        riskScore: 0,
        frequency: "Maintain" as const,
      };

      current.totalAudits += 1;
      current.auditNumbers.push(audit.audit_number);
      current.major += audit.findings.major;
      current.minor += audit.findings.minor;
      current.ofiObs += audit.findings.ofi + audit.findings.obs;
      current.totalFindings += getTotalFindings(audit);
      grouped.set(label, current);
    });

    findings.forEach((finding) => {
      const parentAudit = audits.find((audit) => audit.id === finding.audit_id);
      if (!parentAudit) return;

      const label = getAreaLabel(parentAudit);
      const current = grouped.get(label);
      if (!current) return;

      const repeatKey = buildFindingRepeatKey(finding);
      if (!repeatKey) return;

      const duplicateCount = findingRepeatCountByKey[repeatKey] || 0;
      if (duplicateCount > 1) {
        current.repeatFindings += 1;
      }
    });

    return [...grouped.values()]
      .map((item) => {
        const riskScore =
          item.totalAudits * 1 +
          item.major * 5 +
          item.minor * 3 +
          item.ofiObs * 1 +
          item.repeatFindings * 2;

        return {
          ...item,
          auditNumbers: item.auditNumbers.sort(compareText),
          riskScore,
          frequency: getRiskFrequency(riskScore, item.totalAudits),
        };
      })
      .sort((a, b) => {
        if (b.totalFindings !== a.totalFindings) return b.totalFindings - a.totalFindings;
        if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore;
        return compareText(a.label, b.label);
      });
  }, [audits, findings, findingRepeatCountByKey]);

  const topProblemAreas = useMemo(() => {
    return riskAreaReview.slice(0, 5).map((item) => ({
      name: item.label,
      findings: item.totalFindings,
      riskScore: item.riskScore,
      frequency: item.frequency,
      totalAudits: item.totalAudits,
      major: item.major,
      minor: item.minor,
      ofiObs: item.ofiObs,
      repeatFindings: item.repeatFindings,
      auditNumbers: item.auditNumbers,
    }));
  }, [riskAreaReview]);

  function setSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortAsc((prev) => !prev);
      return;
    }

    setSortKey(nextKey);
    setSortAsc(true);
  }

  function hideDetailPanel() {
    setSelectedAuditId("");
    setShowFindingForm(false);
    window.requestAnimationFrame(() => {
      programmeSectionRef.current?.focus();
    });
  }

  function toggleStandard(value: string) {
    setForm((prev) => {
      const exists = prev.standards.includes(value);
      return {
        ...prev,
        standards: exists ? prev.standards.filter((item) => item !== value) : [...prev.standards, value],
      };
    });
  }

  function toggleDetailStandard(value: string) {
    setDetailForm((prev) => {
      const exists = prev.standards.includes(value);
      return {
        ...prev,
        standards: exists ? prev.standards.filter((item) => item !== value) : [...prev.standards, value],
      };
    });
  }

  function validateAuditForm(targetForm: AuditForm) {
    if (!targetForm.title.trim()) return "Audit title is required.";
    if (!targetForm.auditee.trim()) return "Auditee is required.";
    if (!targetForm.audit_date) return "Audit date is required.";
    if (!targetForm.lead_auditor.trim()) return "Lead auditor is required.";
    if (targetForm.standards.length === 0) return "Select at least one standard.";

    if (targetForm.audit_type === "Internal" && !targetForm.procedure_reference.trim()) {
      return "Procedure reference is required for internal audits.";
    }

    if (targetForm.audit_type === "External" && !targetForm.certification_body.trim()) {
      return "Certification body is required for external audits.";
    }

    return "";
  }

  async function createAudit(e: React.FormEvent) {
    e.preventDefault();

    const validationError = validateAuditForm(form);
    if (validationError) {
      setMessage(validationError);
      return;
    }

    const nextAuditDate = form.audit_date;
    const parsedDate = new Date(nextAuditDate);
    const nextMonth = Number.isNaN(parsedDate.getTime())
      ? form.audit_month
      : `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, "0")}`;

    const newAuditNumber = buildNextAuditNumber(form.audit_type, form.audit_date, audits);

    const { data, error } = await supabase
      .from("audits")
      .insert([
        {
          audit_number: newAuditNumber,
          title: form.title.trim(),
          audit_type: form.audit_type,
          auditee: form.auditee.trim(),
          lead_auditor: form.lead_auditor.trim(),
          audit_date: nextAuditDate,
          audit_month: nextMonth,
          status: form.status,
          standards: form.standards,
          procedure_reference: form.procedure_reference.trim() || null,
          certification_body: form.certification_body.trim() || null,
          location: form.location.trim() || null,
          linked_ncrs: [],
          linked_actions: [],
        },
      ])
      .select("id")
      .single();

    if (error || !data?.id) {
      setMessage(`Create audit failed: ${error?.message || "Unknown error"}`);
      return;
    }

    setSelectedAuditId(String(data.id));
    setForm({
      ...createEmptyAudit(),
      audit_date: form.audit_date,
      audit_month: nextMonth,
      audit_type: form.audit_type,
      standards:
        form.audit_type === "External"
          ? ["ISO 9001:2015", "ISO 14001:2015", "ISO 45001:2018"]
          : ["ISO 9001:2015"],
    });

    await loadAudits(false);
    setMessage(`${newAuditNumber} created successfully.`);
  }

  async function saveAuditChanges() {
    if (!selectedAudit) {
      setMessage("Select an audit first.");
      return;
    }

    const validationError = validateAuditForm(detailForm);
    if (validationError) {
      setMessage(validationError);
      return;
    }

    const nextAuditDate = detailForm.audit_date;
    const parsedDate = new Date(nextAuditDate);
    const nextMonth = Number.isNaN(parsedDate.getTime())
      ? detailForm.audit_month
      : `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, "0")}`;

    const { error } = await supabase
      .from("audits")
      .update({
        title: detailForm.title.trim(),
        audit_type: detailForm.audit_type,
        auditee: detailForm.auditee.trim(),
        lead_auditor: detailForm.lead_auditor.trim(),
        audit_date: nextAuditDate,
        audit_month: nextMonth,
        status: detailForm.status,
        standards: detailForm.standards,
        procedure_reference: detailForm.procedure_reference.trim() || null,
        certification_body: detailForm.certification_body.trim() || null,
        location: detailForm.location.trim() || null,
      })
      .eq("id", selectedAudit.id);

    if (error) {
      setMessage(`Update failed: ${error.message}`);
      return;
    }

    await loadAudits(false);
    setMessage(`${selectedAudit.audit_number} updated successfully.`);
  }

  async function saveLinkedItems(nextNcrs: string[], nextActions: string[]) {
    if (!selectedAudit) {
      setMessage("Select an audit first.");
      return;
    }

    setIsSavingLinks(true);

    const { error } = await supabase
      .from("audits")
      .update({
        linked_ncrs: nextNcrs,
        linked_actions: nextActions,
      })
      .eq("id", selectedAudit.id);

    setIsSavingLinks(false);

    if (error) {
      setMessage(`Save linked items failed: ${error.message}`);
      return;
    }

    await loadAudits(false);
    setMessage("Linked items updated.");
  }

  async function addLinkedNcr() {
    if (!selectedAudit || !selectedNcrToAdd) return;

    if (selectedAudit.linked_ncrs.includes(selectedNcrToAdd)) {
      setSelectedNcrToAdd("");
      return;
    }

    await saveLinkedItems([...selectedAudit.linked_ncrs, selectedNcrToAdd], [...selectedAudit.linked_actions]);
    setSelectedNcrToAdd("");
  }

  async function addLinkedAction() {
    if (!selectedAudit || !selectedActionToAdd) return;

    if (selectedAudit.linked_actions.includes(selectedActionToAdd)) {
      setSelectedActionToAdd("");
      return;
    }

    await saveLinkedItems([...selectedAudit.linked_ncrs], [...selectedAudit.linked_actions, selectedActionToAdd]);
    setSelectedActionToAdd("");
  }

  async function removeLinkedNcr(reference: string) {
    if (!selectedAudit) return;

    await saveLinkedItems(
      selectedAudit.linked_ncrs.filter((item) => item !== reference),
      [...selectedAudit.linked_actions]
    );
  }

  async function removeLinkedAction(reference: string) {
    if (!selectedAudit) return;

    await saveLinkedItems(
      [...selectedAudit.linked_ncrs],
      selectedAudit.linked_actions.filter((item) => item !== reference)
    );
  }

  async function deleteSelectedAudit() {
    if (!selectedAudit) {
      setMessage("Select an audit first.");
      return;
    }

    const confirmDelete = window.confirm(`Delete ${selectedAudit.audit_number}?`);
    if (!confirmDelete) return;

    if (selectedAudit.report_storage_path) {
      await supabase.storage.from(STORAGE_BUCKET).remove([selectedAudit.report_storage_path]);
    }

    const { error } = await supabase.from("audits").delete().eq("id", selectedAudit.id);

    if (error) {
      setMessage(`Delete failed: ${error.message}`);
      return;
    }

    const deletingAuditNumber = selectedAudit.audit_number;
    await loadAudits(false);
    setShowFindingForm(false);
    setMessage(`${deletingAuditNumber} deleted.`);
  }

  function openRaiseFinding() {
    if (!selectedAudit) {
      setMessage("Select an audit before raising a finding.");
      return;
    }

    setFindingForm({
      ...createEmptyFinding(),
      owner: selectedAudit.auditee,
    });
    setShowFindingForm(true);
    setMessage(`Ready to raise a finding against ${selectedAudit.audit_number}.`);
  }

  async function createFinding(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedAudit) {
      setMessage("Select an audit before raising a finding.");
      return;
    }

    if (!findingForm.description.trim()) {
      setMessage("Finding description is required.");
      return;
    }

    if (!findingForm.clause.trim()) {
      setMessage("Clause / reference is required.");
      return;
    }

    const reference = buildNextFindingReference(selectedAudit.id, findings);
    const finalClosureDate =
      findingForm.status === "Closed"
        ? findingForm.closure_date || new Date().toISOString().slice(0, 10)
        : "";

    const { error } = await supabase.from("audit_findings").insert([
      {
        audit_id: selectedAudit.id,
        reference,
        clause: findingForm.clause.trim(),
        category: findingForm.category,
        description: findingForm.description.trim(),
        owner: findingForm.owner.trim() || selectedAudit.auditee,
        status: findingForm.status,
        due_date: findingForm.due_date || null,
        closure_date: finalClosureDate || null,
        root_cause: findingForm.root_cause.trim() || null,
        containment_action: findingForm.containment_action.trim() || null,
        corrective_action: findingForm.corrective_action.trim() || null,
      },
    ]);

    if (error) {
      setMessage(`Save finding failed: ${error.message}`);
      return;
    }

    setShowFindingForm(false);
    setFindingForm(createEmptyFinding());
    await loadAudits(false);
    setMessage(`${reference} raised against ${selectedAudit.audit_number}.`);
  }

  async function updateFindingField(
    findingId: string,
    field: keyof FindingRecord,
    value: string
  ) {
    const current = findings.find((finding) => finding.id === findingId);
    if (!current) return;

    const payload: Record<string, unknown> = {};

    if (field === "status") {
      const nextStatus = value as FindingStatus;
      payload.status = nextStatus;
      payload.closure_date =
        nextStatus === "Closed"
          ? current.closure_date || new Date().toISOString().slice(0, 10)
          : null;
    } else if (field === "category") {
      payload.category = value as FindingSeverity;
    } else {
      payload[field] = value || null;
    }

    const { error } = await supabase.from("audit_findings").update(payload).eq("id", findingId);

    if (error) {
      setMessage(`Finding update failed: ${error.message}`);
      return;
    }

    await loadAudits(false);
    setMessage("Finding updated.");
  }

  async function uploadFileToStorage(auditId: string, file: File) {
    const safeName = sanitizeFileName(file.name);
    const path = `audits/${auditId}/${Date.now()}-${safeName}`;

    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
      upsert: true,
    });

    if (error) {
      throw new Error(error.message);
    }

    return path;
  }

  async function handleReportUpload(event: React.ChangeEvent<HTMLInputElement>) {
    if (!selectedAudit) {
      setMessage("Select an audit first.");
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingReport(true);

    try {
      if (selectedAudit.report_storage_path) {
        await supabase.storage.from(STORAGE_BUCKET).remove([selectedAudit.report_storage_path]);
      }

      const path = await uploadFileToStorage(selectedAudit.id, file);

      await supabase.from("audit_files").delete().eq("audit_id", selectedAudit.id);

      const { error } = await supabase.from("audit_files").insert([
        {
          audit_id: selectedAudit.id,
          file_name: file.name,
          file_path: path,
          file_size: file.size,
          uploaded_at: new Date().toISOString(),
        },
      ]);

      if (error) {
        throw new Error(error.message);
      }

      await loadAudits(false);
      setMessage(`Audit report uploaded to ${selectedAudit.audit_number}.`);
    } catch (error) {
      const err = error as Error;
      setMessage(`Audit report upload failed: ${err.message}`);
    } finally {
      setIsUploadingReport(false);
      event.target.value = "";
    }
  }

  async function removeReport() {
    if (!selectedAudit) {
      setMessage("Select an audit first.");
      return;
    }

    if (selectedAudit.report_storage_path) {
      await supabase.storage.from(STORAGE_BUCKET).remove([selectedAudit.report_storage_path]);
    }

    const { error } = await supabase.from("audit_files").delete().eq("audit_id", selectedAudit.id);

    if (error) {
      setMessage(`Remove report failed: ${error.message}`);
      return;
    }

    await loadAudits(false);
    setMessage(`Audit report removed from ${selectedAudit.audit_number}.`);
  }

  async function openSelectedAuditReport() {
    if (!selectedAudit?.report_storage_path) {
      setMessage("No report uploaded for this audit.");
      return;
    }

    const signedUrl = await createSignedFileUrl(selectedAudit.report_storage_path);

    if (!signedUrl) {
      setMessage(`Could not open report for ${selectedAudit.audit_number}.`);
      return;
    }

    window.open(signedUrl, "_blank", "noopener,noreferrer");
  }

  function generateAuditPdf() {
    if (!selectedAudit) {
      setMessage("Select an audit first.");
      return;
    }

    const scopedFindings = findings.filter((finding) => finding.audit_id === selectedAudit.id);
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const reportCode = getAuditDocumentNumber(selectedAudit.audit_type);
    const generatedAt = new Date().toISOString();

    doc.setFillColor(15, 118, 110);
    doc.rect(0, 0, pageWidth, 24, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text("ENSHORE SUBSEA", margin, 11.5);
    doc.setFontSize(10);
    doc.text("Audit Report", margin, 18);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text(selectedAudit.title, margin, 34);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Audit Number: ${selectedAudit.audit_number}`, margin, 41);
    doc.text(`Generated: ${formatDateTime(generatedAt)}`, pageWidth - margin, 41, { align: "right" });

    autoTable(doc, {
      startY: 47,
      theme: "grid",
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 9.5,
        cellPadding: 3,
        textColor: [15, 23, 42],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
        valign: "middle",
      },
      body: [
        ["Audit Type", selectedAudit.audit_type, "Status", selectedAudit.status],
        ["Auditee", selectedAudit.auditee, "Lead Auditor", selectedAudit.lead_auditor],
        ["Audit Date", formatDate(selectedAudit.audit_date), "Audit Month", formatMonth(selectedAudit.audit_month)],
        ["Standards", buildStandardsLabel(selectedAudit), "Location", selectedAudit.location],
        ["Procedure", selectedAudit.procedure_reference || "-", "Certification Body", selectedAudit.certification_body || "-"],
        ["Report Upload", selectedAudit.report_file_name || "-", "Form Ref", reportCode],
      ],
      columnStyles: {
        0: { fontStyle: "bold", fillColor: [248, 250, 252], cellWidth: 30 },
        1: { cellWidth: 65 },
        2: { fontStyle: "bold", fillColor: [248, 250, 252], cellWidth: 30 },
        3: { cellWidth: 51 },
      },
    });

    let y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 47;
    y += 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("Findings Summary", margin, y);

    autoTable(doc, {
      startY: y + 4,
      theme: "grid",
      margin: { left: margin, right: margin },
      head: [["Ref", "Clause", "Category", "Description", "Owner", "Status", "Due", "Closed"]],
      body: scopedFindings.length
        ? scopedFindings.map((finding) => [
            finding.reference,
            finding.clause,
            finding.category,
            finding.description,
            finding.owner,
            finding.status,
            formatDate(finding.due_date),
            formatDate(finding.closure_date),
          ])
        : [["-", "-", "-", "No findings raised against this audit.", "-", "-", "-", "-"]],
      headStyles: {
        fillColor: [15, 118, 110],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      styles: {
        fontSize: 8.4,
        cellPadding: 2.5,
        textColor: [15, 23, 42],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
        overflow: "linebreak",
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 14 },
        1: { cellWidth: 18 },
        2: { cellWidth: 16 },
        3: { cellWidth: 62 },
        4: { cellWidth: 20 },
        5: { cellWidth: 18 },
        6: { cellWidth: 18 },
        7: { cellWidth: 18 },
      },
    });

    let nextY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;

    scopedFindings.forEach((finding) => {
      if (nextY > pageHeight - 70) {
        doc.addPage();
        nextY = 18;
      }

      nextY += 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(`${finding.reference} Action Detail`, margin, nextY);

      autoTable(doc, {
        startY: nextY + 4,
        theme: "grid",
        margin: { left: margin, right: margin },
        body: [
          ["Root Cause", finding.root_cause || "-"],
          ["Containment Action", finding.containment_action || "-"],
          ["Corrective Action", finding.corrective_action || "-"],
        ],
        styles: {
          fontSize: 8.8,
          cellPadding: 2.8,
          textColor: [15, 23, 42],
          lineColor: [226, 232, 240],
          lineWidth: 0.2,
        },
        columnStyles: {
          0: { fontStyle: "bold", fillColor: [248, 250, 252], cellWidth: 38 },
          1: { cellWidth: pageWidth - margin * 2 - 38 },
        },
      });

      nextY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? nextY;
    });

    const pageCount = doc.getNumberOfPages();

    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Enshore Subsea | ${selectedAudit.audit_number}`, margin, pageHeight - 8.5);
      doc.text(reportCode, pageWidth / 2, pageHeight - 8.5, { align: "center" });
      doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 8.5, { align: "right" });
    }

    doc.save(`${selectedAudit.audit_number}-audit-report.pdf`);
    setMessage(`${selectedAudit.audit_number} PDF generated.`);
  }

  return (
    <main>
      <section style={heroStyle}>
        <div style={{ flex: "1 1 700px" }}>
          <div style={eyebrowStyle}>Audit Management</div>
          <h1 style={heroTitleStyle}>Audits</h1>
          <p style={heroSubtitleStyle}>
            Dense programme view, cleaner schedule columns, sticky detail workspace, full finding management, and audit report upload pinned at the top.
          </p>

          <div style={heroPillGridStyle}>
            <HeroPill label="Planned" value={kpis.planned} tone="blue" />
            <HeroPill label="In Progress" value={kpis.inProgress} tone="amber" />
            <HeroPill label="Overdue" value={kpis.overdue} tone="red" />
            <HeroPill label="Open Findings" value={kpis.openFindings} tone="neutral" />
          </div>
        </div>

        <div style={heroMetaGridStyle}>
          <HeroMetaCard label="Completed Audits" value={kpis.completed} />
          <HeroMetaCard label="Major Findings" value={kpis.totalMajor} />
          <HeroMetaCard label="Current Audit" value={selectedAudit?.audit_number || "None"} compact />
          <HeroMetaCard label="Programme Mode" value="Month Schedule" compact />
        </div>
      </section>

      <div style={topMetaRowStyle}>
        <Link href="/" style={backLinkStyle}>
          ← Back to Dashboard
        </Link>

        <div style={statusBannerStyle}>
          <strong>Status:</strong> {message}
        </div>
      </div>

      {linkedSearch ? (
        <section style={linkedSearchBannerStyle}>
          <strong>Linked search:</strong> showing results for &quot;{linkedSearch}&quot;
        </section>
      ) : null}

      <section style={statsGridStyle}>
        <StatCard title="Planned Audits" value={kpis.planned} accent="#2563eb" />
        <StatCard title="In Progress" value={kpis.inProgress} accent="#f59e0b" />
        <StatCard title="Overdue" value={kpis.overdue} accent="#dc2626" />
        <StatCard title="Completed" value={kpis.completed} accent="#16a34a" />
        <StatCard title="Open Findings" value={kpis.openFindings} accent="#7c3aed" />
        <StatCard title="Major Findings" value={kpis.totalMajor} accent="#b91c1c" />
      </section>

      <section style={topGridStyle}>
        <div style={summaryPanelGridStyle}>
          <SectionCard
            title="Create Audit"
            subtitle="Create the next audit. Numbering is automatic from type and audit date."
          >
            <form onSubmit={createAudit}>
              <div style={createAuditGridStyle}>
                <Field label="Audit Type">
                  <select
                    value={form.audit_type}
                    onChange={(e) => setForm((prev) => ({ ...prev, audit_type: e.target.value as AuditType }))}
                    style={inputStyle}
                  >
                    <option value="Internal">Internal</option>
                    <option value="External">External</option>
                    <option value="Supplier">Supplier</option>
                  </select>
                </Field>

                <Field label="Audit Number">
                  <input value={computedAuditNumber} readOnly style={readOnlyInputStyle} />
                </Field>

                <Field label="Title / Function">
                  <input
                    value={form.title}
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    style={inputStyle}
                    placeholder="e.g. Supplier Audit - Parkburn"
                  />
                </Field>

                <Field label="Auditee">
                  <input
                    value={form.auditee}
                    onChange={(e) => setForm((prev) => ({ ...prev, auditee: e.target.value }))}
                    style={inputStyle}
                    placeholder="Department / Supplier / Site"
                  />
                </Field>

                <Field label="Lead Auditor">
                  <input
                    value={form.lead_auditor}
                    onChange={(e) => setForm((prev) => ({ ...prev, lead_auditor: e.target.value }))}
                    style={inputStyle}
                    placeholder="Lead auditor"
                  />
                </Field>

                <Field label={form.audit_type === "External" ? "Certification Body" : "Location"}>
                  {form.audit_type === "External" ? (
                    <input
                      value={form.certification_body}
                      onChange={(e) => setForm((prev) => ({ ...prev, certification_body: e.target.value }))}
                      style={inputStyle}
                      placeholder="e.g. LRQA"
                    />
                  ) : (
                    <input
                      value={form.location}
                      onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                      style={inputStyle}
                      placeholder="Blyth / Supplier Site / Remote"
                    />
                  )}
                </Field>

                <Field label="Audit Date">
                  <input
                    type="date"
                    value={form.audit_date}
                    onChange={(e) => setForm((prev) => ({ ...prev, audit_date: e.target.value }))}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Scheduled Month">
                  <input value={formatMonth(form.audit_month)} readOnly style={readOnlyInputStyle} />
                </Field>

                <Field label="Status">
                  <select
                    value={form.status}
                    onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as AuditStatus }))}
                    style={inputStyle}
                  >
                    <option value="Planned">Planned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Overdue">Overdue</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </Field>

                {form.audit_type === "Internal" && (
                  <Field label="Procedure Reference">
                    <input
                      value={form.procedure_reference}
                      onChange={(e) => setForm((prev) => ({ ...prev, procedure_reference: e.target.value }))}
                      style={inputStyle}
                      placeholder="e.g. ENS-HSEQ-PRO-001"
                    />
                  </Field>
                )}

                {form.audit_type === "External" && (
                  <Field label="Audit Location">
                    <input
                      value={form.location}
                      onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                      style={inputStyle}
                      placeholder="Blyth / Remote / Site"
                    />
                  </Field>
                )}

                <div style={{ gridColumn: "1 / -1" }}>
                  <Field label="Standards">
                    <MultiSelectStandards
                      selected={form.standards}
                      onToggle={toggleStandard}
                      options={["ISO 9001:2015", "ISO 14001:2015", "ISO 45001:2018"]}
                    />
                  </Field>
                </div>
              </div>

              <div style={createAuditFooterStyle}>
                <div style={createAuditHintStyle}>
                  Internal = standards + procedure. Supplier = ISO only. External = certification audit.
                </div>
                <button type="submit" style={primaryButtonStyle}>
                  Create Audit
                </button>
              </div>
            </form>
          </SectionCard>

          <SectionCard
            title="Top 5 Problem Audits / Areas"
            subtitle="Compact management view of the highest findings and frequency outcome."
          >
            {topProblemAreas.length === 0 ? (
              <p style={emptyTextStyle}>No audit findings available yet.</p>
            ) : (
              <div style={compactProblemListStyle}>
                {topProblemAreas.map((item, index) => (
                  <div key={item.name} style={compactProblemRowStyle}>
                    <div style={compactProblemRankStyle}>#{index + 1}</div>
                    <div style={compactProblemBodyStyle}>
                      <div style={compactProblemTitleStyle}>{item.name}</div>
                      <div style={compactProblemMetaStyle}>
                        <span>{item.findings} findings</span>
                        <span>Risk {item.riskScore}</span>
                        <span>{item.auditNumbers.join(", ")}</span>
                      </div>
                    </div>
                    <span style={getFrequencyBadgeStyle(item.frequency as "Reduce" | "Maintain" | "Increase")}>{item.frequency}</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </section>

      <section style={tableLayoutStyle}>
        <SectionCard title="Audit Programme" subtitle="Main working view with schedule, findings summary, and risk-based frequency outcome.">
          <div style={toolbarStyle}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={toolbarSearchStyle}
              placeholder="Search audit number, title, auditor, standard, linked NCR/action..."
            />

            <div style={toolbarFiltersStyle}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as AuditStatus | "All")}
                style={toolbarSelectStyle}
              >
                <option value="All">All Status</option>
                <option value="Planned">Planned</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Overdue">Overdue</option>
                <option value="Cancelled">Cancelled</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as AuditType | "All")}
                style={toolbarSelectStyle}
              >
                <option value="All">All Types</option>
                <option value="Internal">Internal</option>
                <option value="External">External</option>
                <option value="Supplier">Supplier</option>
              </select>

              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                style={toolbarSelectStyle}
              >
                <option value="All">All Months</option>
                {monthOptions.map((month) => (
                  <option key={month} value={month}>
                    {formatMonth(month)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={sortChipRowStyle}>
            <SortChip label="Scheduled" active={sortKey === "audit_month"} asc={sortAsc} onClick={() => setSort("audit_month")} />
            <SortChip label="Audit No." active={sortKey === "audit_number"} asc={sortAsc} onClick={() => setSort("audit_number")} />
            <SortChip label="Title" active={sortKey === "title"} asc={sortAsc} onClick={() => setSort("title")} />
            <SortChip label="Type" active={sortKey === "audit_type"} asc={sortAsc} onClick={() => setSort("audit_type")} />
            <SortChip label="Lead" active={sortKey === "lead_auditor"} asc={sortAsc} onClick={() => setSort("lead_auditor")} />
            <SortChip label="Findings" active={sortKey === "findings"} asc={sortAsc} onClick={() => setSort("findings")} />
          </div>

          <div style={programmeInfoStyle}>
            Showing <strong>{filteredAudits.length}</strong> of <strong>{audits.length}</strong> audits
          </div>

          <div ref={programmeSectionRef} tabIndex={-1} style={programmeTableWrapStyle}>
            <div style={programmeHeadStyle}>
              <div>Audit No.</div>
              <div>Title / Function</div>
              <div>Type</div>
              <div>Scheduled</div>
              <div>Audit Date</div>
              <div>Lead Auditor</div>
              <div>Major</div>
              <div>Minor</div>
              <div>OFI/OBS</div>
              <div>Risk Score</div>
              <div>Frequency Outcome</div>
              <div>Status</div>
            </div>

            <div style={programmeBodyStyle}>
              {filteredAudits.map((audit) => {
                const active = selectedAuditId === audit.id;
                const linkedMatch =
                  !!linkedSearch &&
                  (audit.audit_number.toLowerCase() === linkedSearch.toLowerCase() ||
                    audit.linked_ncrs.some((item) => item.toLowerCase() === linkedSearch.toLowerCase()) ||
                    audit.linked_actions.some((item) => item.toLowerCase() === linkedSearch.toLowerCase()));

                return (
                  <button
                    key={audit.id}
                    type="button"
                    onClick={() => setSelectedAuditId(audit.id)}
                    style={{
                      ...programmeRowStyle,
                      background: active ? "#eff6ff" : linkedMatch ? "#ecfeff" : "#ffffff",
                      borderLeft: active ? "4px solid #0f766e" : "4px solid transparent",
                    }}
                  >
                    <div style={programmePrimaryStyle}>
                      {audit.audit_number}
                      {linkedMatch ? <div style={linkedMatchTagStyle}>Linked match</div> : null}
                    </div>

                    <div style={programmeTitleCellStyle}>
                      <div style={programmeTitleStyle}>{audit.title}</div>
                    </div>

                    <div style={programmeTypeCellStyle}>{audit.audit_type}</div>
                    <div style={programmeCellMutedStyle}>{formatMonth(audit.audit_month)}</div>
                    <div style={programmeCellMutedStyle}>{formatDate(audit.audit_date)}</div>
                    <div style={programmeLeadCellStyle}>{audit.lead_auditor || "-"}</div>
                    <div style={programmeFindingsStyle}>{audit.findings.major}</div>
                    <div style={programmeFindingsStyle}>{audit.findings.minor}</div>
                    <div style={programmeFindingsStyle}>{audit.findings.ofi + audit.findings.obs}</div>
                    <div style={programmeRiskCellStyle}>{auditRiskById[audit.id]?.riskScore ?? 1}</div>
                    <div>
                      <span style={getFrequencyBadgeStyle(auditRiskById[audit.id]?.frequency || "Maintain")}>
                        {auditRiskById[audit.id]?.frequency || "Maintain"}
                      </span>
                    </div>
                    <div>
                      <span
                        style={{
                          ...badgeStyle,
                          background: getStatusTone(audit.status).bg,
                          color: getStatusTone(audit.status).color,
                        }}
                      >
                        {audit.status}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </SectionCard>

        {selectedAudit ? (
          <SectionCard title="Audit Detail" subtitle="Editable workspace for the selected audit.">
            <div style={detailWorkspaceStyle}>
              <div style={detailTopBarStyle}>
                <div>
                  <div style={detailAuditNumberStyle}>{selectedAudit.audit_number}</div>
                  <h3 style={detailAuditTitleStyle}>{selectedAudit.title}</h3>
                </div>

                <div style={detailTopActionsStyle}>
                  <span
                    style={{
                      ...badgeStyle,
                      background: getStatusTone(selectedAudit.status).bg,
                      color: getStatusTone(selectedAudit.status).color,
                    }}
                  >
                    {selectedAudit.status}
                  </span>
                  <button type="button" style={secondaryButtonStyle} onClick={hideDetailPanel}>
                    Hide Panel
                  </button>
                </div>
              </div>

              <div style={topUploadStripStyle}>
                <div style={topUploadMetaStyle}>
                  <div style={topUploadTitleStyle}>Audit report</div>
                  <div style={topUploadFileStyle}>
                    {selectedAudit.report_file_name || "No report uploaded"}
                  </div>
                  <div style={topUploadSubStyle}>
                    {selectedAudit.report_file_name
                      ? `${formatFileSize(selectedAudit.report_file_size)} • Uploaded ${formatDateTime(
                          selectedAudit.report_uploaded_at
                        )}`
                      : "Upload the signed or issued report here so it is visible straight away."}
                  </div>
                </div>

                <div style={topUploadButtonsStyle}>
                  <label style={uploadButtonStyle}>
                    {isUploadingReport ? "Uploading..." : "Upload report"}
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xlsx,.xls,.png,.jpg,.jpeg"
                      onChange={handleReportUpload}
                      style={{ display: "none" }}
                    />
                  </label>

                  {selectedAudit.report_storage_path ? (
                    <button
                      type="button"
                      onClick={() => void openSelectedAuditReport()}
                      style={reportLinkButtonStyle}
                    >
                      Open report
                    </button>
                  ) : null}

                  {selectedAudit.report_file_name ? (
                    <button type="button" style={secondaryButtonStyle} onClick={removeReport}>
                      Remove report
                    </button>
                  ) : null}
                </div>
              </div>

              <div style={miniKpiGridStyle}>
                <MiniStat label="Major" value={selectedAudit.findings.major} tone="#991b1b" bg="#fee2e2" />
                <MiniStat label="Minor" value={selectedAudit.findings.minor} tone="#92400e" bg="#fef3c7" />
                <MiniStat label="OFI" value={selectedAudit.findings.ofi} tone="#166534" bg="#dcfce7" />
                <MiniStat label="OBS" value={selectedAudit.findings.obs} tone="#1d4ed8" bg="#dbeafe" />
              </div>

              <div style={detailSectionStyle}>
                <div style={detailSectionTitleStyle}>Audit Record</div>

                <div style={detailFormGridStyle}>
                  <Field label="Audit Type">
                    <select
                      value={detailForm.audit_type}
                      onChange={(e) =>
                        setDetailForm((prev) => ({
                          ...prev,
                          audit_type: e.target.value as AuditType,
                          procedure_reference: e.target.value === "Internal" ? prev.procedure_reference : "",
                          certification_body: e.target.value === "External" ? prev.certification_body : "",
                        }))
                      }
                      style={inputStyle}
                    >
                      <option value="Internal">Internal</option>
                      <option value="External">External</option>
                      <option value="Supplier">Supplier</option>
                    </select>
                  </Field>

                  <Field label="Audit Number">
                    <input value={selectedAudit.audit_number} readOnly style={readOnlyInputStyle} />
                  </Field>

                  <Field label="Audit Title">
                    <input
                      value={detailForm.title}
                      onChange={(e) => setDetailForm((prev) => ({ ...prev, title: e.target.value }))}
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Auditee">
                    <input
                      value={detailForm.auditee}
                      onChange={(e) => setDetailForm((prev) => ({ ...prev, auditee: e.target.value }))}
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Lead Auditor">
                    <input
                      value={detailForm.lead_auditor}
                      onChange={(e) => setDetailForm((prev) => ({ ...prev, lead_auditor: e.target.value }))}
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Location">
                    <input
                      value={detailForm.location}
                      onChange={(e) => setDetailForm((prev) => ({ ...prev, location: e.target.value }))}
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Audit Date">
                    <input
                      type="date"
                      value={detailForm.audit_date}
                      onChange={(e) => {
                        const value = e.target.value;
                        const date = new Date(value);
                        const nextMonth = Number.isNaN(date.getTime())
                          ? detailForm.audit_month
                          : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

                        setDetailForm((prev) => ({
                          ...prev,
                          audit_date: value,
                          audit_month: nextMonth,
                        }));
                      }}
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Audit Month">
                    <input value={formatMonth(detailForm.audit_month)} readOnly style={readOnlyInputStyle} />
                  </Field>

                  <Field label="Status">
                    <select
                      value={detailForm.status}
                      onChange={(e) => setDetailForm((prev) => ({ ...prev, status: e.target.value as AuditStatus }))}
                      style={inputStyle}
                    >
                      <option value="Planned">Planned</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Overdue">Overdue</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </Field>

                  {detailForm.audit_type === "Internal" && (
                    <Field label="Procedure Reference">
                      <input
                        value={detailForm.procedure_reference}
                        onChange={(e) => setDetailForm((prev) => ({ ...prev, procedure_reference: e.target.value }))}
                        style={inputStyle}
                      />
                    </Field>
                  )}

                  {detailForm.audit_type === "External" && (
                    <Field label="Certification Body">
                      <input
                        value={detailForm.certification_body}
                        onChange={(e) => setDetailForm((prev) => ({ ...prev, certification_body: e.target.value }))}
                        style={inputStyle}
                      />
                    </Field>
                  )}

                  <div style={{ gridColumn: "1 / -1" }}>
                    <Field label="Standards">
                      <MultiSelectStandards
                        selected={detailForm.standards}
                        onToggle={toggleDetailStandard}
                        options={["ISO 9001:2015", "ISO 14001:2015", "ISO 45001:2018"]}
                      />
                    </Field>
                  </div>
                </div>

                <div style={detailButtonRowStyle}>
                  <button type="button" style={primaryButtonStyle} onClick={saveAuditChanges}>
                    Save Audit Changes
                  </button>
                  <button type="button" style={secondaryButtonStyle} onClick={generateAuditPdf}>
                    Generate PDF Report
                  </button>
                  <button type="button" style={secondaryButtonStyle} onClick={openRaiseFinding}>
                    Raise Finding
                  </button>
                  <button type="button" style={dangerButtonStyle} onClick={deleteSelectedAudit}>
                    Delete Audit
                  </button>
                </div>
              </div>

              <div style={detailSectionStyle}>
                <div style={detailSectionTitleStyle}>Linked Items</div>

                <div style={linkPickerGridStyle}>
                  <Field label="Add Linked NCR">
                    <div style={pickerRowStyle}>
                      <select
                        value={selectedNcrToAdd}
                        onChange={(e) => setSelectedNcrToAdd(e.target.value)}
                        style={inputStyle}
                      >
                        <option value="">Select NCR</option>
                        {ncrOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        style={secondaryButtonStyle}
                        onClick={() => void addLinkedNcr()}
                        disabled={isSavingLinks}
                      >
                        + Add
                      </button>
                    </div>
                  </Field>

                  <Field label="Add Linked Action">
                    <div style={pickerRowStyle}>
                      <select
                        value={selectedActionToAdd}
                        onChange={(e) => setSelectedActionToAdd(e.target.value)}
                        style={inputStyle}
                      >
                        <option value="">Select Action</option>
                        {actionOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        style={secondaryButtonStyle}
                        onClick={() => void addLinkedAction()}
                        disabled={isSavingLinks}
                      >
                        + Add
                      </button>
                    </div>
                  </Field>
                </div>

                <div style={linkedBlocksGridStyle}>
                  <EditableLinkGroup
                    title="Linked NCRs"
                    items={selectedAudit.linked_ncrs}
                    hrefBuilder={(item) => `/ncr-capa?search=${encodeURIComponent(item)}`}
                    onRemove={(item) => void removeLinkedNcr(item)}
                  />
                  <EditableLinkGroup
                    title="Linked Actions"
                    items={selectedAudit.linked_actions}
                    hrefBuilder={(item) => `/actions?search=${encodeURIComponent(item)}`}
                    onRemove={(item) => void removeLinkedAction(item)}
                  />
                </div>
              </div>

              {showFindingForm && (
                <div style={detailSectionStyle}>
                  <div style={detailSectionTitleStyle}>Raise Finding</div>

                  <form onSubmit={createFinding}>
                    <div style={detailFormGridStyle}>
                      <Field label="Reference">
                        <input
                          value={buildNextFindingReference(selectedAudit.id, findings)}
                          readOnly
                          style={readOnlyInputStyle}
                        />
                      </Field>

                      <Field label="Category">
                        <select
                          value={findingForm.category}
                          onChange={(e) =>
                            setFindingForm((prev) => ({ ...prev, category: e.target.value as FindingSeverity }))
                          }
                          style={inputStyle}
                        >
                          <option value="Major">Major</option>
                          <option value="Minor">Minor</option>
                          <option value="OFI">OFI</option>
                          <option value="OBS">OBS</option>
                        </select>
                      </Field>

                      <Field label="Clause / Reference">
                        <input
                          value={findingForm.clause}
                          onChange={(e) => setFindingForm((prev) => ({ ...prev, clause: e.target.value }))}
                          style={inputStyle}
                        />
                      </Field>

                      <Field label="Owner">
                        <input
                          value={findingForm.owner}
                          onChange={(e) => setFindingForm((prev) => ({ ...prev, owner: e.target.value }))}
                          style={inputStyle}
                        />
                      </Field>

                      <Field label="Status">
                        <select
                          value={findingForm.status}
                          onChange={(e) =>
                            setFindingForm((prev) => ({ ...prev, status: e.target.value as FindingStatus }))
                          }
                          style={inputStyle}
                        >
                          <option value="Open">Open</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Closed">Closed</option>
                        </select>
                      </Field>

                      <Field label="Due Date">
                        <input
                          type="date"
                          value={findingForm.due_date}
                          onChange={(e) => setFindingForm((prev) => ({ ...prev, due_date: e.target.value }))}
                          style={inputStyle}
                        />
                      </Field>

                      <Field label="Closure Date">
                        <input
                          type="date"
                          value={findingForm.closure_date}
                          onChange={(e) => setFindingForm((prev) => ({ ...prev, closure_date: e.target.value }))}
                          style={inputStyle}
                        />
                      </Field>

                      <div style={{ gridColumn: "1 / -1" }}>
                        <Field label="Description">
                          <textarea
                            value={findingForm.description}
                            onChange={(e) => setFindingForm((prev) => ({ ...prev, description: e.target.value }))}
                            style={textareaStyle}
                            placeholder="Finding statement / objective evidence"
                          />
                        </Field>
                      </div>

                      <div style={{ gridColumn: "1 / -1" }}>
                        <Field label="Root Cause">
                          <textarea
                            value={findingForm.root_cause}
                            onChange={(e) => setFindingForm((prev) => ({ ...prev, root_cause: e.target.value }))}
                            style={textareaStyle}
                            placeholder="Root cause analysis"
                          />
                        </Field>
                      </div>

                      <div style={{ gridColumn: "1 / -1" }}>
                        <Field label="Containment Action">
                          <textarea
                            value={findingForm.containment_action}
                            onChange={(e) =>
                              setFindingForm((prev) => ({ ...prev, containment_action: e.target.value }))
                            }
                            style={textareaStyle}
                            placeholder="Immediate containment action"
                          />
                        </Field>
                      </div>

                      <div style={{ gridColumn: "1 / -1" }}>
                        <Field label="Corrective Action">
                          <textarea
                            value={findingForm.corrective_action}
                            onChange={(e) =>
                              setFindingForm((prev) => ({ ...prev, corrective_action: e.target.value }))
                            }
                            style={textareaStyle}
                            placeholder="Corrective action to prevent recurrence"
                          />
                        </Field>
                      </div>
                    </div>

                    <div style={detailButtonRowStyle}>
                      <button type="submit" style={primaryButtonStyle}>
                        Save Finding
                      </button>
                      <button type="button" style={secondaryButtonStyle} onClick={() => setShowFindingForm(false)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div style={detailSectionStyle}>
                <div style={detailSectionTitleStyle}>Findings Register</div>

                {selectedFindings.length === 0 ? (
                  <p style={emptyTextStyle}>No findings logged for this audit yet.</p>
                ) : (
                  <div style={findingListStyle}>
                    {selectedFindings.map((finding) => {
                      const tone = getFindingTone(finding.category);

                      return (
                        <div key={finding.id} style={findingCardStyle}>
                          <div style={findingHeadStyle}>
                            <div>
                              <div style={findingRefStyle}>{finding.reference}</div>
                              <div style={findingClauseStyle}>{finding.clause}</div>
                            </div>

                            <div style={findingBadgeWrapStyle}>
                              <span style={{ ...badgeStyle, background: tone.bg, color: tone.color }}>
                                {finding.category}
                              </span>
                              <span
                                style={{
                                  ...badgeStyle,
                                  background: getStatusTone(finding.status).bg,
                                  color: getStatusTone(finding.status).color,
                                }}
                              >
                                {finding.status}
                              </span>
                            </div>
                          </div>

                          <div style={detailFormGridStyle}>
                            <Field label="Category">
                              <select
                                value={finding.category}
                                onChange={(e) => void updateFindingField(finding.id, "category", e.target.value)}
                                style={inputStyle}
                              >
                                <option value="Major">Major</option>
                                <option value="Minor">Minor</option>
                                <option value="OFI">OFI</option>
                                <option value="OBS">OBS</option>
                              </select>
                            </Field>

                            <Field label="Status">
                              <select
                                value={finding.status}
                                onChange={(e) => void updateFindingField(finding.id, "status", e.target.value)}
                                style={inputStyle}
                              >
                                <option value="Open">Open</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Closed">Closed</option>
                              </select>
                            </Field>

                            <Field label="Clause / Reference">
                              <input
                                value={finding.clause}
                                onChange={(e) => void updateFindingField(finding.id, "clause", e.target.value)}
                                style={inputStyle}
                              />
                            </Field>

                            <Field label="Owner">
                              <input
                                value={finding.owner}
                                onChange={(e) => void updateFindingField(finding.id, "owner", e.target.value)}
                                style={inputStyle}
                              />
                            </Field>

                            <Field label="Due Date">
                              <input
                                type="date"
                                value={finding.due_date}
                                onChange={(e) => void updateFindingField(finding.id, "due_date", e.target.value)}
                                style={inputStyle}
                              />
                            </Field>

                            <Field label="Closure Date">
                              <input
                                type="date"
                                value={finding.closure_date}
                                onChange={(e) => void updateFindingField(finding.id, "closure_date", e.target.value)}
                                style={inputStyle}
                              />
                            </Field>

                            <div style={{ gridColumn: "1 / -1" }}>
                              <Field label="Description">
                                <textarea
                                  value={finding.description}
                                  onChange={(e) => void updateFindingField(finding.id, "description", e.target.value)}
                                  style={textareaStyle}
                                />
                              </Field>
                            </div>

                            <div style={{ gridColumn: "1 / -1" }}>
                              <Field label="Root Cause">
                                <textarea
                                  value={finding.root_cause}
                                  onChange={(e) => void updateFindingField(finding.id, "root_cause", e.target.value)}
                                  style={textareaStyle}
                                />
                              </Field>
                            </div>

                            <div style={{ gridColumn: "1 / -1" }}>
                              <Field label="Containment Action">
                                <textarea
                                  value={finding.containment_action}
                                  onChange={(e) =>
                                    void updateFindingField(finding.id, "containment_action", e.target.value)
                                  }
                                  style={textareaStyle}
                                />
                              </Field>
                            </div>

                            <div style={{ gridColumn: "1 / -1" }}>
                              <Field label="Corrective Action">
                                <textarea
                                  value={finding.corrective_action}
                                  onChange={(e) =>
                                    void updateFindingField(finding.id, "corrective_action", e.target.value)
                                  }
                                  style={textareaStyle}
                                />
                              </Field>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </SectionCard>
        ) : null}
      </section>
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
      <div style={sectionHeaderStyle}>
        <h2 style={sectionTitleStyle}>{title}</h2>
        {subtitle ? <p style={sectionSubtitleStyle}>{subtitle}</p> : null}
      </div>
      {children}
    </section>
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

function StatCard({ title, value, accent }: { title: string; value: number; accent: string }) {
  return (
    <div style={{ ...statCardStyle, borderTop: `4px solid ${accent}` }}>
      <div style={statLabelStyle}>{title}</div>
      <div style={statValueStyle}>{value}</div>
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

function EditableLinkGroup({
  title,
  items,
  hrefBuilder,
  onRemove,
}: {
  title: string;
  items: string[];
  hrefBuilder: (item: string) => string;
  onRemove: (item: string) => void;
}) {
  return (
    <div style={detailTagGroupStyle}>
      <div style={detailSectionLabelStyle}>{title}</div>
      <div style={detailTagsWrapStyle}>
        {items.length === 0 ? (
          <span style={detailTagMutedStyle}>None linked</span>
        ) : (
          items.map((item) => (
            <span key={item} style={editablePillWrapStyle}>
              <Link href={hrefBuilder(item)} style={detailTagLinkStyle}>
                {item}
              </Link>
              <button type="button" style={pillRemoveButtonStyle} onClick={() => onRemove(item)}>
                ×
              </button>
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
  bg,
}: {
  label: string;
  value: number;
  tone: string;
  bg: string;
}) {
  return (
    <div style={{ ...miniStatStyle, background: bg }}>
      <div style={{ ...miniStatLabelStyle, color: tone }}>{label}</div>
      <div style={{ ...miniStatValueStyle, color: tone }}>{value}</div>
    </div>
  );
}

function SortChip({
  label,
  active,
  asc,
  onClick,
}: {
  label: string;
  active: boolean;
  asc: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...sortChipStyle,
        background: active ? "#0f766e" : "#f8fafc",
        color: active ? "#ffffff" : "#334155",
        borderColor: active ? "#0f766e" : "#cbd5e1",
      }}
    >
      {label} {active ? (asc ? "↑" : "↓") : ""}
    </button>
  );
}

const linkedSearchBannerStyle: CSSProperties = {
  background: "#ecfeff",
  border: "1px solid #a5f3fc",
  borderRadius: "12px",
  padding: "12px 16px",
  color: "#155e75",
  marginBottom: "20px",
};

const linkedMatchTagStyle: CSSProperties = {
  display: "inline-block",
  marginTop: "6px",
  padding: "4px 8px",
  borderRadius: "999px",
  background: "#ccfbf1",
  color: "#115e59",
  fontWeight: 800,
  fontSize: "11px",
};

const editablePillWrapStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  background: "#dbeafe",
  borderRadius: "999px",
  paddingRight: "6px",
};

const pillRemoveButtonStyle: CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#1d4ed8",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: "14px",
  lineHeight: 1,
};

const linkPickerGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
  marginBottom: "14px",
};

const pickerRowStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  alignItems: "center",
};

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
  opacity: 0.84,
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
  maxWidth: "780px",
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

const heroMetaGridStyle: CSSProperties = {
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
  lineHeight: 1.4,
};

const topMetaRowStyle: CSSProperties = {
  marginBottom: 20,
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
};

const backLinkStyle: CSSProperties = {
  color: "#0f766e",
  fontWeight: 700,
  textDecoration: "none",
};

const statusBannerStyle: CSSProperties = {
  background: "white",
  borderRadius: "12px",
  padding: "12px 16px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
  color: "#0f172a",
};

const statsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: "16px",
  marginBottom: "20px",
};

const statCardStyle: CSSProperties = {
  background: "white",
  borderRadius: "16px",
  padding: "18px 20px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
};

const statLabelStyle: CSSProperties = {
  fontSize: "13px",
  color: "#64748b",
  fontWeight: 600,
};

const statValueStyle: CSSProperties = {
  fontSize: "34px",
  fontWeight: 700,
  color: "#0f172a",
  marginTop: "8px",
};

const topGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: "18px",
  marginBottom: "20px",
};

const summaryPanelGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.3fr 0.9fr",
  gap: "20px",
};

const tableLayoutStyle: CSSProperties = {
  display: "grid",
  gap: "20px",
};

const panelStyle: CSSProperties = {
  background: "white",
  borderRadius: "18px",
  padding: "20px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
  marginBottom: "20px",
};

const sectionHeaderStyle: CSSProperties = {
  marginBottom: "16px",
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

const createAuditGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "14px",
};

const detailFormGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "12px",
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

const inputStyle: CSSProperties = {
  padding: "11px 12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  background: "white",
  color: "#0f172a",
  width: "100%",
  boxSizing: "border-box",
};

const readOnlyInputStyle: CSSProperties = {
  ...inputStyle,
  background: "#f8fafc",
  color: "#334155",
  fontWeight: 700,
};

const textareaStyle: CSSProperties = {
  width: "100%",
  minHeight: "96px",
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  background: "white",
  color: "#0f172a",
  resize: "vertical",
  fontFamily: "Arial, Helvetica, sans-serif",
  boxSizing: "border-box",
};

const createAuditFooterStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  flexWrap: "wrap",
  marginTop: "14px",
};

const createAuditHintStyle: CSSProperties = {
  color: "#64748b",
  fontSize: "13px",
  maxWidth: "620px",
  lineHeight: 1.5,
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
  padding: "11px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 700,
};

const dangerButtonStyle: CSSProperties = {
  background: "#991b1b",
  color: "#ffffff",
  border: "none",
  padding: "11px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 700,
};

const uploadButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#0f766e",
  color: "#ffffff",
  borderRadius: "10px",
  padding: "11px 16px",
  fontWeight: 700,
  cursor: "pointer",
};

const reportLinkButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#dbeafe",
  color: "#1d4ed8",
  borderRadius: "10px",
  padding: "11px 16px",
  fontWeight: 700,
  textDecoration: "none",
};

const chipGridStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
};

const chipButtonStyle: CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: "999px",
  padding: "9px 12px",
  fontWeight: 700,
  fontSize: "13px",
  cursor: "pointer",
};

const compactProblemListStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
};

const compactProblemRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  padding: "12px 14px",
  background: "#f8fafc",
};

const compactProblemRankStyle: CSSProperties = {
  width: "34px",
  height: "34px",
  borderRadius: "999px",
  background: "#e0f2fe",
  color: "#0369a1",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  fontWeight: 700,
};

const compactProblemBodyStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const compactProblemTitleStyle: CSSProperties = {
  color: "#0f172a",
  fontWeight: 800,
  fontSize: "14px",
  lineHeight: 1.35,
  marginBottom: "4px",
};

const compactProblemMetaStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  color: "#64748b",
  fontSize: "12px",
  lineHeight: 1.4,
};

const toolbarStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "center",
  flexWrap: "wrap",
  marginBottom: "12px",
};

const toolbarSearchStyle: CSSProperties = {
  ...inputStyle,
  maxWidth: "460px",
  flex: "1 1 340px",
};

const toolbarFiltersStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const toolbarSelectStyle: CSSProperties = {
  ...inputStyle,
  minWidth: "150px",
};

const sortChipRowStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginBottom: "12px",
};

const sortChipStyle: CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: "999px",
  padding: "8px 12px",
  fontWeight: 700,
  fontSize: "12px",
  cursor: "pointer",
};

const programmeInfoStyle: CSSProperties = {
  marginBottom: "12px",
  color: "#475569",
  fontSize: "14px",
};

const programmeTableWrapStyle: CSSProperties = {
  border: "1px solid #d7dee7",
  borderRadius: "18px",
  overflow: "hidden",
};

const programmeHeadStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 2.4fr 0.9fr 1.15fr 1fr 1fr 0.6fr 0.6fr 0.8fr 0.85fr 1fr 0.95fr",
  gap: "12px",
  padding: "14px 16px",
  background: "#f8fafc",
  borderBottom: "1px solid #e5e7eb",
  fontSize: "12px",
  fontWeight: 800,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: 0.25,
  alignItems: "center",
};

const programmeBodyStyle: CSSProperties = {
  maxHeight: "980px",
  overflowY: "auto",
};

const programmeRowStyle: CSSProperties = {
  width: "100%",
  textAlign: "left",
  display: "grid",
  gridTemplateColumns: "1fr 2.4fr 0.9fr 1.15fr 1fr 1fr 0.6fr 0.6fr 0.8fr 0.85fr 1fr 0.95fr",
  gap: "12px",
  padding: "14px 16px",
  borderTop: "none",
  borderRight: "none",
  borderBottom: "1px solid #eef2f7",
  borderLeft: "4px solid transparent",
  cursor: "pointer",
  alignItems: "center",
};

const programmePrimaryStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 800,
  color: "#0f766e",
  lineHeight: 1.45,
  wordBreak: "break-word",
};

const programmeTitleCellStyle: CSSProperties = {
  minWidth: 0,
  overflow: "hidden",
};

const programmeTitleStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 800,
  color: "#0f172a",
  lineHeight: 1.35,
  whiteSpace: "normal",
  wordBreak: "break-word",
  overflowWrap: "anywhere",
};

const programmeTypeCellStyle: CSSProperties = {
  fontSize: "13px",
  color: "#0f172a",
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const programmeCellMutedStyle: CSSProperties = {
  fontSize: "12px",
  color: "#475569",
  lineHeight: 1.35,
};

const programmeLeadCellStyle: CSSProperties = {
  fontSize: "13px",
  color: "#0f172a",
  lineHeight: 1.35,
  minWidth: 0,
  overflowWrap: "anywhere",
};

const programmeFindingsStyle: CSSProperties = {
  fontSize: "13px",
  color: "#0f172a",
  fontWeight: 700,
  textAlign: "center",
};

const programmeRiskCellStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 800,
  color: "#0f172a",
  textAlign: "center",
};

const detailWorkspaceStyle: CSSProperties = {
  display: "grid",
  gap: "16px",
  maxHeight: "1320px",
  overflowY: "auto",
  paddingRight: "4px",
};

const detailTopBarStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const detailTopActionsStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  alignItems: "center",
};

const detailAuditNumberStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 800,
  color: "#64748b",
};

const detailAuditTitleStyle: CSSProperties = {
  margin: "4px 0 0 0",
  fontSize: "20px",
  color: "#0f172a",
};

const topUploadStripStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: "14px",
  alignItems: "center",
  border: "1px solid #cfe8e5",
  background: "linear-gradient(180deg, #f7fffd 0%, #eefbf8 100%)",
  borderRadius: "16px",
  padding: "16px",
};

const topUploadMetaStyle: CSSProperties = {
  minWidth: 0,
  display: "grid",
  gap: "4px",
};

const topUploadTitleStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 800,
  color: "#64748b",
  textTransform: "uppercase",
};

const topUploadFileStyle: CSSProperties = {
  fontSize: "16px",
  fontWeight: 800,
  color: "#0f172a",
  whiteSpace: "normal",
  wordBreak: "break-word",
  overflowWrap: "anywhere",
};

const topUploadSubStyle: CSSProperties = {
  fontSize: "13px",
  color: "#475569",
  lineHeight: 1.45,
};

const topUploadButtonsStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const miniKpiGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "10px",
};

const miniStatStyle: CSSProperties = {
  borderRadius: "12px",
  padding: "12px",
};

const miniStatLabelStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 800,
  marginBottom: "4px",
};

const miniStatValueStyle: CSSProperties = {
  fontSize: "22px",
  fontWeight: 800,
};

const detailSectionStyle: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  padding: "16px",
  background: "#ffffff",
};

const detailSectionTitleStyle: CSSProperties = {
  fontSize: "16px",
  fontWeight: 800,
  color: "#0f172a",
  marginBottom: "12px",
};

const detailButtonRowStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "14px",
};

const linkedBlocksGridStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
};

const detailTagGroupStyle: CSSProperties = {
  display: "grid",
  gap: "8px",
};

const detailSectionLabelStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 800,
  color: "#64748b",
  textTransform: "uppercase",
};

const detailTagsWrapStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const detailTagMutedStyle: CSSProperties = {
  color: "#94a3b8",
  fontSize: "13px",
};

const detailTagLinkStyle: CSSProperties = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: "999px",
  background: "#dbeafe",
  color: "#1d4ed8",
  fontSize: "12px",
  fontWeight: 800,
  textDecoration: "none",
};

const findingListStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
};

const findingCardStyle: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  padding: "14px 16px",
  background: "#f8fafc",
};

const findingHeadStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  marginBottom: "12px",
};

const findingBadgeWrapStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const findingRefStyle: CSSProperties = {
  fontWeight: 800,
  color: "#0f172a",
  fontSize: "14px",
};

const findingClauseStyle: CSSProperties = {
  color: "#64748b",
  fontSize: "12px",
  marginTop: "4px",
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
export default function AuditsPage() {
  return (
    <Suspense fallback={<main style={{ padding: "24px" }}>Loading audits...</main>}>
      <AuditsPageContent />
    </Suspense>
  );
}

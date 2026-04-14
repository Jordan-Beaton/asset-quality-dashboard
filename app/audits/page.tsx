"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

const seedAudits: AuditRecord[] = [
  {
    id: "1",
    audit_number: "INT-26-001",
    title: "Blyth Base Internal QMS Audit",
    audit_type: "Internal",
    auditee: "Blyth Base",
    lead_auditor: "Jordan Beaton",
    audit_date: "2026-04-10",
    audit_month: "2026-04",
    status: "In Progress",
    standards: ["ISO 9001:2015"],
    procedure_reference: "ENS-HSEQ-PRO-001",
    certification_body: "",
    location: "Blyth",
    findings: { major: 0, minor: 2, ofi: 1, obs: 1 },
    linked_ncrs: ["NCR-001"],
    linked_actions: ["ACT-003", "ACT-007"],
    report_file_name: "",
    report_file_size: null,
    report_uploaded_at: "",
    report_url: "",
  },
  {
    id: "2",
    audit_number: "SUP-26-001",
    title: "Supplier Audit - TrackOne",
    audit_type: "Supplier",
    auditee: "TrackOne",
    lead_auditor: "Jordan Beaton",
    audit_date: "2026-04-04",
    audit_month: "2026-04",
    status: "Completed",
    standards: ["ISO 9001:2015"],
    procedure_reference: "",
    certification_body: "",
    location: "Supplier Site",
    findings: { major: 0, minor: 1, ofi: 1, obs: 1 },
    linked_ncrs: ["NCR-004", "NCR-006"],
    linked_actions: ["ACT-009"],
    report_file_name: "",
    report_file_size: null,
    report_uploaded_at: "",
    report_url: "",
  },
  {
    id: "3",
    audit_number: "EXT-26-001",
    title: "LRQA Surveillance Audit",
    audit_type: "External",
    auditee: "Enshore Management System",
    lead_auditor: "LRQA",
    audit_date: "2026-05-22",
    audit_month: "2026-05",
    status: "Planned",
    standards: ["ISO 9001:2015", "ISO 14001:2015", "ISO 45001:2018"],
    procedure_reference: "",
    certification_body: "LRQA",
    location: "Blyth",
    findings: { major: 0, minor: 0, ofi: 0, obs: 0 },
    linked_ncrs: [],
    linked_actions: [],
    report_file_name: "",
    report_file_size: null,
    report_uploaded_at: "",
    report_url: "",
  },
  {
    id: "4",
    audit_number: "INT-26-002",
    title: "Business Continuity Follow-up",
    audit_type: "Internal",
    auditee: "Onshore Operations",
    lead_auditor: "Jordan Beaton",
    audit_date: "2026-03-18",
    audit_month: "2026-03",
    status: "Overdue",
    standards: ["ISO 9001:2015"],
    procedure_reference: "ENS-OPS-PRO-001",
    certification_body: "",
    location: "Blyth / Darlington",
    findings: { major: 1, minor: 1, ofi: 0, obs: 0 },
    linked_ncrs: ["NCR-010"],
    linked_actions: ["ACT-011", "ACT-012"],
    report_file_name: "",
    report_file_size: null,
    report_uploaded_at: "",
    report_url: "",
  },
  {
    id: "5",
    audit_number: "SUP-26-002",
    title: "Supplier Audit - Parkburn",
    audit_type: "Supplier",
    auditee: "Parkburn",
    lead_auditor: "Jordan Beaton",
    audit_date: "2026-06-11",
    audit_month: "2026-06",
    status: "Planned",
    standards: ["ISO 9001:2015"],
    procedure_reference: "",
    certification_body: "",
    location: "Supplier Site",
    findings: { major: 0, minor: 0, ofi: 0, obs: 0 },
    linked_ncrs: [],
    linked_actions: [],
    report_file_name: "",
    report_file_size: null,
    report_uploaded_at: "",
    report_url: "",
  },
  {
    id: "6",
    audit_number: "INT-26-003",
    title: "Calibration Process Internal Audit",
    audit_type: "Internal",
    auditee: "Workshop / QC",
    lead_auditor: "Jordan Beaton",
    audit_date: "2026-07-09",
    audit_month: "2026-07",
    status: "Planned",
    standards: ["ISO 9001:2015"],
    procedure_reference: "ENS-AST-PRO-010",
    certification_body: "",
    location: "Blyth",
    findings: { major: 0, minor: 0, ofi: 0, obs: 0 },
    linked_ncrs: [],
    linked_actions: [],
    report_file_name: "",
    report_file_size: null,
    report_uploaded_at: "",
    report_url: "",
  },
];

const seedFindings: FindingRecord[] = [
  {
    id: "1",
    audit_id: "1",
    reference: "F-001",
    clause: "7.5",
    category: "Minor",
    description: "Document review dates were not consistently updated across controlled records.",
    owner: "D. Wardman",
    status: "Open",
    due_date: "2026-04-24",
    closure_date: "",
    root_cause: "Document control ownership and review cadence were not consistently applied.",
    containment_action: "Affected records identified and flagged for immediate review.",
    corrective_action: "Assign document owners and implement a scheduled review tracker.",
  },
  {
    id: "2",
    audit_id: "1",
    reference: "F-002",
    clause: "7.1.5",
    category: "OBS",
    description: "Calibration evidence was available but not centrally referenced against the active asset register.",
    owner: "J. Beaton",
    status: "In Progress",
    due_date: "2026-04-30",
    closure_date: "",
    root_cause: "Calibration evidence is stored locally without a single register reference point.",
    containment_action: "Current calibration certificates checked during the audit.",
    corrective_action: "Add calibration evidence reference fields into the asset register.",
  },
  {
    id: "3",
    audit_id: "4",
    reference: "F-001",
    clause: "9.1 / Continuity Planning",
    category: "Major",
    description: "Location updates remained incomplete and recent exercise evidence was not available for review.",
    owner: "Operations",
    status: "Open",
    due_date: "2026-04-22",
    closure_date: "",
    root_cause: "Business continuity ownership and review discipline were not fully maintained after organisational changes.",
    containment_action: "Outdated continuity records identified and highlighted to management.",
    corrective_action: "Reissue location coverage, assign owner, and complete a recorded exercise.",
  },
];

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

function getMonthStart(value: string) {
  if (!value) return null;
  const [year, month] = value.split("-");
  if (!year || !month) return null;
  const date = new Date(Number(year), Number(month) - 1, 1);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getMonthDifference(monthKey: string) {
  const target = getMonthStart(monthKey);
  if (!target) return null;

  const now = new Date();
  const current = new Date(now.getFullYear(), now.getMonth(), 1);

  return (target.getFullYear() - current.getFullYear()) * 12 + (target.getMonth() - current.getMonth());
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

export default function AuditsPage() {
  const [audits, setAudits] = useState<AuditRecord[]>(seedAudits);
  const [findings, setFindings] = useState<FindingRecord[]>(seedFindings);
  const [selectedAuditId, setSelectedAuditId] = useState<string>(seedAudits[0]?.id || "");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AuditStatus | "All">("All");
  const [typeFilter, setTypeFilter] = useState<AuditType | "All">("All");
  const [monthFilter, setMonthFilter] = useState<string>("All");
  const [sortKey, setSortKey] = useState<SortKey>("audit_month");
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [message, setMessage] = useState("Audit dashboard ready.");
  const [showFindingForm, setShowFindingForm] = useState(false);

  const [form, setForm] = useState<AuditForm>({
    title: "",
    audit_type: "Internal",
    auditee: "",
    lead_auditor: "",
    audit_date: "2026-04-14",
    audit_month: "2026-04",
    status: "Planned",
    standards: ["ISO 9001:2015"],
    procedure_reference: "",
    certification_body: "",
    location: "",
  });

  const [detailForm, setDetailForm] = useState<AuditForm>({
    title: "",
    audit_type: "Internal",
    auditee: "",
    lead_auditor: "",
    audit_date: "",
    audit_month: "",
    status: "Planned",
    standards: [],
    procedure_reference: "",
    certification_body: "",
    location: "",
  });

  const [findingForm, setFindingForm] = useState<FindingForm>({
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
  });

  const computedAuditNumber = useMemo(
    () => buildNextAuditNumber(form.audit_type, form.audit_date, audits),
    [form.audit_type, form.audit_date, audits]
  );

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
    setShowFindingForm(false);
  }, [selectedAudit]);

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
        audit.certification_body.toLowerCase().includes(lower);

      const matchesStatus = statusFilter === "All" || audit.status === statusFilter;
      const matchesType = typeFilter === "All" || audit.audit_type === typeFilter;
      const matchesMonth = monthFilter === "All" || audit.audit_month === monthFilter;

      return matchesSearch && matchesStatus && matchesType && matchesMonth;
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
  }, [audits, search, statusFilter, typeFilter, monthFilter, sortKey, sortAsc]);

  const kpis = useMemo(() => {
    const planned = audits.filter((audit) => audit.status === "Planned").length;
    const inProgress = audits.filter((audit) => audit.status === "In Progress").length;
    const overdue = audits.filter((audit) => audit.status === "Overdue").length;
    const completed = audits.filter((audit) => audit.status === "Completed").length;
    const totalMajor = findings.filter((finding) => finding.category === "Major").length;
    const openFindings = findings.filter((finding) => finding.status !== "Closed").length;

    return { planned, inProgress, overdue, completed, totalMajor, openFindings };
  }, [audits, findings]);

  const auditsByTypeChart = useMemo(() => {
    const counts = { Internal: 0, External: 0, Supplier: 0 };

    audits.forEach((audit) => {
      counts[audit.audit_type] += 1;
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [audits]);

  const findingsBySeverityChart = useMemo(() => {
    const counts: Record<FindingSeverity, number> = {
      Major: 0,
      Minor: 0,
      OFI: 0,
      OBS: 0,
    };

    findings.forEach((finding) => {
      counts[finding.category] += 1;
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [findings]);

  const findingsByStatusChart = useMemo(() => {
    const counts = {
      Open: 0,
      "In Progress": 0,
      Closed: 0,
    };

    findings.forEach((finding) => {
      counts[finding.status] += 1;
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [findings]);

  const findingsByAuditTypeChart = useMemo(() => {
    const counts = {
      Internal: 0,
      External: 0,
      Supplier: 0,
    };

    findings.forEach((finding) => {
      const parentAudit = audits.find((audit) => audit.id === finding.audit_id);
      if (!parentAudit) return;
      counts[parentAudit.audit_type] += 1;
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [findings, audits]);

  const statusChart = useMemo(() => {
    const counts: Record<AuditStatus, number> = {
      Planned: 0,
      "In Progress": 0,
      Completed: 0,
      Overdue: 0,
      Cancelled: 0,
    };

    audits.forEach((audit) => {
      counts[audit.status] += 1;
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [audits]);

  const attentionAudits = useMemo(() => {
    return audits
      .filter((audit) => {
        const monthDiff = getMonthDifference(audit.audit_month);
        const isUpcoming = audit.status === "Planned" && monthDiff !== null && monthDiff >= 0 && monthDiff <= 2;
        const isOverdue = audit.status === "Overdue";
        return isUpcoming || isOverdue;
      })
      .sort((a, b) => {
        if (a.status === "Overdue" && b.status !== "Overdue") return -1;
        if (a.status !== "Overdue" && b.status === "Overdue") return 1;
        return compareText(a.audit_date, b.audit_date);
      })
      .slice(0, 6);
  }, [audits]);

  function setSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortAsc((prev) => !prev);
      return;
    }

    setSortKey(nextKey);
    setSortAsc(true);
  }

  function toggleStandard(value: string) {
    setForm((prev) => {
      const exists = prev.standards.includes(value);
      return {
        ...prev,
        standards: exists
          ? prev.standards.filter((item) => item !== value)
          : [...prev.standards, value],
      };
    });
  }

  function toggleDetailStandard(value: string) {
    setDetailForm((prev) => {
      const exists = prev.standards.includes(value);
      return {
        ...prev,
        standards: exists
          ? prev.standards.filter((item) => item !== value)
          : [...prev.standards, value],
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

  function createAudit(e: React.FormEvent) {
    e.preventDefault();

    const validationError = validateAuditForm(form);
    if (validationError) {
      setMessage(validationError);
      return;
    }

    const newAudit: AuditRecord = {
      id: String(Date.now()),
      audit_number: computedAuditNumber,
      title: form.title.trim(),
      audit_type: form.audit_type,
      auditee: form.auditee.trim(),
      lead_auditor: form.lead_auditor.trim(),
      audit_date: form.audit_date,
      audit_month: form.audit_month,
      status: form.status,
      standards: [...form.standards],
      procedure_reference: form.procedure_reference.trim(),
      certification_body: form.certification_body.trim(),
      location: form.location.trim() || "-",
      findings: { major: 0, minor: 0, ofi: 0, obs: 0 },
      linked_ncrs: [],
      linked_actions: [],
      report_file_name: "",
      report_file_size: null,
      report_uploaded_at: "",
      report_url: "",
    };

    const nextAudits = [newAudit, ...audits];
    setAudits(nextAudits);
    setSelectedAuditId(newAudit.id);
    setForm((prev) => ({
      ...prev,
      title: "",
      auditee: "",
      lead_auditor: "",
      status: "Planned",
      location: "",
      procedure_reference: prev.audit_type === "Internal" ? "" : prev.procedure_reference,
      certification_body: prev.audit_type === "External" ? "" : prev.certification_body,
    }));
    setMessage(`${newAudit.audit_number} created successfully.`);
  }

  function saveAuditChanges() {
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

    setAudits((prev) =>
      prev.map((audit) =>
        audit.id === selectedAudit.id
          ? {
              ...audit,
              title: detailForm.title.trim(),
              audit_type: detailForm.audit_type,
              auditee: detailForm.auditee.trim(),
              lead_auditor: detailForm.lead_auditor.trim(),
              audit_date: nextAuditDate,
              audit_month: nextMonth,
              status: detailForm.status,
              standards: [...detailForm.standards],
              procedure_reference: detailForm.procedure_reference.trim(),
              certification_body: detailForm.certification_body.trim(),
              location: detailForm.location.trim() || "-",
            }
          : audit
      )
    );

    setMessage(`${selectedAudit.audit_number} updated successfully.`);
  }

  function updateAuditInline(
    auditId: string,
    field: keyof AuditRecord,
    value: string
  ) {
    setAudits((prev) =>
      prev.map((audit) => {
        if (audit.id !== auditId) return audit;

        if (field === "lead_auditor") {
          return { ...audit, lead_auditor: value };
        }

        if (field === "audit_month") {
          return { ...audit, audit_month: value };
        }

        return { ...audit, [field]: value };
      })
    );

    setMessage("Audit schedule updated.");
  }

  function deleteSelectedAudit() {
    if (!selectedAudit) {
      setMessage("Select an audit first.");
      return;
    }

    if (selectedAudit.report_url) {
      URL.revokeObjectURL(selectedAudit.report_url);
    }

    const deletingAuditNumber = selectedAudit.audit_number;
    const remainingAudits = audits.filter((audit) => audit.id !== selectedAudit.id);
    const remainingFindings = findings.filter((finding) => finding.audit_id !== selectedAudit.id);

    setAudits(remainingAudits);
    setFindings(remainingFindings);
    setSelectedAuditId(remainingAudits[0]?.id || "");
    setShowFindingForm(false);
    setMessage(`${deletingAuditNumber} deleted.`);
  }

  function openRaiseFinding() {
    if (!selectedAudit) {
      setMessage("Select an audit before raising a finding.");
      return;
    }

    setFindingForm({
      clause: "",
      category: "Minor",
      description: "",
      owner: selectedAudit.auditee,
      status: "Open",
      due_date: "",
      closure_date: "",
      root_cause: "",
      containment_action: "",
      corrective_action: "",
    });
    setShowFindingForm(true);
    setMessage(`Ready to raise a finding against ${selectedAudit.audit_number}.`);
  }

  function createFinding(e: React.FormEvent) {
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

    const newFinding: FindingRecord = {
      id: String(Date.now()),
      audit_id: selectedAudit.id,
      reference,
      clause: findingForm.clause.trim(),
      category: findingForm.category,
      description: findingForm.description.trim(),
      owner: findingForm.owner.trim() || selectedAudit.auditee,
      status: findingForm.status,
      due_date: findingForm.due_date,
      closure_date: finalClosureDate,
      root_cause: findingForm.root_cause.trim(),
      containment_action: findingForm.containment_action.trim(),
      corrective_action: findingForm.corrective_action.trim(),
    };

    const nextFindings = [...findings, newFinding];
    setFindings(nextFindings);

    const nextCounts = countFindingsForAudit(selectedAudit.id, nextFindings);
    setAudits((prev) =>
      prev.map((audit) =>
        audit.id === selectedAudit.id
          ? {
              ...audit,
              findings: nextCounts,
            }
          : audit
      )
    );

    setShowFindingForm(false);
    setMessage(`${reference} raised against ${selectedAudit.audit_number}.`);
  }

  function updateFindingField(
    findingId: string,
    field: keyof FindingRecord,
    value: string
  ) {
    const updatedFindings = findings.map((finding) => {
      if (finding.id !== findingId) return finding;

      if (field === "status") {
        const nextStatus = value as FindingStatus;
        return {
          ...finding,
          status: nextStatus,
          closure_date:
            nextStatus === "Closed"
              ? finding.closure_date || new Date().toISOString().slice(0, 10)
              : "",
        };
      }

      if (field === "category") {
        return {
          ...finding,
          category: value as FindingSeverity,
        };
      }

      return {
        ...finding,
        [field]: value,
      };
    });

    setFindings(updatedFindings);

    if (selectedAudit) {
      const nextCounts = countFindingsForAudit(selectedAudit.id, updatedFindings);
      setAudits((prev) =>
        prev.map((audit) =>
          audit.id === selectedAudit.id
            ? {
                ...audit,
                findings: nextCounts,
              }
            : audit
        )
      );
    }

    setMessage("Finding updated.");
  }

  function handleReportUpload(event: React.ChangeEvent<HTMLInputElement>) {
    if (!selectedAudit) {
      setMessage("Select an audit first.");
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);

    setAudits((prev) =>
      prev.map((audit) => {
        if (audit.id !== selectedAudit.id) return audit;

        if (audit.report_url) {
          URL.revokeObjectURL(audit.report_url);
        }

        return {
          ...audit,
          report_file_name: file.name,
          report_file_size: file.size,
          report_uploaded_at: new Date().toISOString(),
          report_url: objectUrl,
        };
      })
    );

    event.target.value = "";
    setMessage(`Audit report uploaded to ${selectedAudit.audit_number}.`);
  }

  function removeReport() {
    if (!selectedAudit) {
      setMessage("Select an audit first.");
      return;
    }

    if (selectedAudit.report_url) {
      URL.revokeObjectURL(selectedAudit.report_url);
    }

    setAudits((prev) =>
      prev.map((audit) =>
        audit.id === selectedAudit.id
          ? {
              ...audit,
              report_file_name: "",
              report_file_size: null,
              report_uploaded_at: "",
              report_url: "",
            }
          : audit
      )
    );

    setMessage(`Audit report removed from ${selectedAudit.audit_number}.`);
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

    let y =
      (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 47;
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

    let nextY =
      (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;

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

      nextY =
        (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? nextY;
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

      <section style={statsGridStyle}>
        <StatCard title="Planned Audits" value={kpis.planned} accent="#2563eb" />
        <StatCard title="In Progress" value={kpis.inProgress} accent="#f59e0b" />
        <StatCard title="Overdue" value={kpis.overdue} accent="#dc2626" />
        <StatCard title="Completed" value={kpis.completed} accent="#16a34a" />
        <StatCard title="Open Findings" value={kpis.openFindings} accent="#7c3aed" />
        <StatCard title="Major Findings" value={kpis.totalMajor} accent="#b91c1c" />
      </section>

      <section style={topGridStyle}>
        <SectionCard
          title="Create Audit"
          subtitle="Create the next audit. Numbering is automatic from type and audit date."
        >
          <form onSubmit={createAudit}>
            <div style={formGridStyle}>
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

              <Field label="Audit Title">
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

              <Field label="Audit Month">
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

            <div style={formFooterStyle}>
              <button type="submit" style={primaryButtonStyle}>
                Create Audit
              </button>
              <span style={helperTextStyle}>
                Internal = standards + procedure. Supplier = ISO only. External = certification audit.
              </span>
            </div>
          </form>
        </SectionCard>

        <SectionCard title="Attention Board" subtitle="Upcoming and overdue items only.">
          <div style={attentionGridStyle}>
            {attentionAudits.length === 0 ? (
              <div style={emptyBoardStyle}>No upcoming or overdue audits currently flagged.</div>
            ) : (
              attentionAudits.map((audit) => (
                <button
                  key={audit.id}
                  type="button"
                  onClick={() => setSelectedAuditId(audit.id)}
                  style={{
                    ...attentionCardStyle,
                    background: selectedAuditId === audit.id ? "#eff6ff" : "#ffffff",
                    borderColor: selectedAuditId === audit.id ? "#93c5fd" : "#e2e8f0",
                  }}
                >
                  <div style={attentionHeaderStyle}>
                    <span style={miniTagStyle}>{audit.audit_type}</span>
                    <span
                      style={{
                        ...miniTagStyle,
                        background: getStatusTone(audit.status).bg,
                        color: getStatusTone(audit.status).color,
                      }}
                    >
                      {audit.status}
                    </span>
                  </div>

                  <div style={attentionNumberStyle}>{audit.audit_number}</div>
                  <div style={attentionTitleStyle}>{audit.title}</div>
                  <div style={attentionMetaRowStyle}>
                    <span>{formatMonth(audit.audit_month)}</span>
                    <span>{formatDate(audit.audit_date)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </SectionCard>
      </section>

      <section style={chartGridStyleFour}>
        <SectionCard title="Audit Types" subtitle="Programme split by audit type.">
          <div style={chartWrapStyle}>
            <ResponsiveContainer>
              <BarChart data={auditsByTypeChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#0f766e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Audit Status" subtitle="Current programme status.">
          <div style={chartWrapStyle}>
            <ResponsiveContainer>
              <BarChart data={statusChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Findings by Category" subtitle="Major, Minor, OFI and OBS.">
          <div style={chartWrapStyle}>
            <ResponsiveContainer>
              <BarChart data={findingsBySeverityChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#7c3aed" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Findings by Status / Type" subtitle="Open vs closed, plus internal/external/supplier split.">
          <div style={dualMiniChartsWrapStyle}>
            <div style={miniChartWrapStyle}>
              <ResponsiveContainer>
                <BarChart data={findingsByStatusChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0f766e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={miniChartWrapStyle}>
              <ResponsiveContainer>
                <BarChart data={findingsByAuditTypeChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </SectionCard>
      </section>

      <section style={workspaceGridStyle}>
        <SectionCard title="Audit Programme" subtitle="Cleaner month-based schedule. Exact audit date and status sit in the audit detail panel.">
          <div style={toolbarStyle}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={toolbarSearchStyle}
              placeholder="Search audit number, title, auditor, standard..."
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

          <div style={programmeTableWrapStyle}>
            <div style={programmeHeadStyle}>
              <div>Audit No.</div>
              <div>Title</div>
              <div>Type</div>
              <div>Scheduled</div>
              <div>Lead</div>
              <div>Findings</div>
            </div>

            <div style={programmeBodyStyle}>
              {filteredAudits.map((audit) => {
                const active = selectedAuditId === audit.id;

                return (
                  <button
                    key={audit.id}
                    type="button"
                    onClick={() => setSelectedAuditId(audit.id)}
                    style={{
                      ...programmeRowStyle,
                      background: active ? "#eff6ff" : "#ffffff",
                      borderLeft: active ? "4px solid #0f766e" : "4px solid transparent",
                    }}
                  >
                    <div style={programmePrimaryStyle}>{audit.audit_number}</div>

                    <div style={programmeTitleCellStyle}>
                      <div style={programmeTitleStyle}>{audit.title}</div>
                    </div>

                    <div style={programmeTypeCellStyle}>{audit.audit_type}</div>

                    <div onClick={(e) => e.stopPropagation()}>
                      <input
                        type="month"
                        value={audit.audit_month}
                        onChange={(e) => updateAuditInline(audit.id, "audit_month", e.target.value)}
                        style={inlineInputStyle}
                      />
                    </div>

                    <div onClick={(e) => e.stopPropagation()}>
                      <input
                        value={audit.lead_auditor}
                        onChange={(e) => updateAuditInline(audit.id, "lead_auditor", e.target.value)}
                        style={inlineInputStyle}
                      />
                    </div>

                    <div style={programmeFindingsStyle}>{getTotalFindings(audit)}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Audit Detail" subtitle="Editable workspace with audit report upload pinned at the top.">
          {!selectedAudit ? (
            <div style={emptyDetailStyle}>Select an audit from the programme to open it here.</div>
          ) : (
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
                    Upload report
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xlsx,.xls,.png,.jpg,.jpeg"
                      onChange={handleReportUpload}
                      style={{ display: "none" }}
                    />
                  </label>

                  {selectedAudit.report_url ? (
                    <a
                      href={selectedAudit.report_url}
                      target="_blank"
                      rel="noreferrer"
                      style={reportLinkButtonStyle}
                    >
                      Open report
                    </a>
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

                <div style={linkedBlocksGridStyle}>
                  <DetailLinkGroup
                    title="Linked NCRs"
                    items={selectedAudit.linked_ncrs}
                    hrefBuilder={(item) => `/ncr-capa?search=${encodeURIComponent(item)}`}
                  />
                  <DetailLinkGroup
                    title="Linked Actions"
                    items={selectedAudit.linked_actions}
                    hrefBuilder={(item) => `/actions?search=${encodeURIComponent(item)}`}
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
                                onChange={(e) => updateFindingField(finding.id, "category", e.target.value)}
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
                                onChange={(e) => updateFindingField(finding.id, "status", e.target.value)}
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
                                onChange={(e) => updateFindingField(finding.id, "clause", e.target.value)}
                                style={inputStyle}
                              />
                            </Field>

                            <Field label="Owner">
                              <input
                                value={finding.owner}
                                onChange={(e) => updateFindingField(finding.id, "owner", e.target.value)}
                                style={inputStyle}
                              />
                            </Field>

                            <Field label="Due Date">
                              <input
                                type="date"
                                value={finding.due_date}
                                onChange={(e) => updateFindingField(finding.id, "due_date", e.target.value)}
                                style={inputStyle}
                              />
                            </Field>

                            <Field label="Closure Date">
                              <input
                                type="date"
                                value={finding.closure_date}
                                onChange={(e) => updateFindingField(finding.id, "closure_date", e.target.value)}
                                style={inputStyle}
                              />
                            </Field>

                            <div style={{ gridColumn: "1 / -1" }}>
                              <Field label="Description">
                                <textarea
                                  value={finding.description}
                                  onChange={(e) => updateFindingField(finding.id, "description", e.target.value)}
                                  style={textareaStyle}
                                />
                              </Field>
                            </div>

                            <div style={{ gridColumn: "1 / -1" }}>
                              <Field label="Root Cause">
                                <textarea
                                  value={finding.root_cause}
                                  onChange={(e) => updateFindingField(finding.id, "root_cause", e.target.value)}
                                  style={textareaStyle}
                                />
                              </Field>
                            </div>

                            <div style={{ gridColumn: "1 / -1" }}>
                              <Field label="Containment Action">
                                <textarea
                                  value={finding.containment_action}
                                  onChange={(e) =>
                                    updateFindingField(finding.id, "containment_action", e.target.value)
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
                                    updateFindingField(finding.id, "corrective_action", e.target.value)
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
          )}
        </SectionCard>
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

function DetailLinkGroup({
  title,
  items,
  hrefBuilder,
}: {
  title: string;
  items: string[];
  hrefBuilder: (item: string) => string;
}) {
  return (
    <div style={detailTagGroupStyle}>
      <div style={detailSectionLabelStyle}>{title}</div>
      <div style={detailTagsWrapStyle}>
        {items.length === 0 ? (
          <span style={detailTagMutedStyle}>None linked</span>
        ) : (
          items.map((item) => (
            <Link key={item} href={hrefBuilder(item)} style={detailTagLinkStyle}>
              {item}
            </Link>
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
  gridTemplateColumns: "1.05fr 0.95fr",
  gap: "20px",
  marginBottom: "20px",
};

const chartGridStyleFour: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "20px",
  marginBottom: "20px",
};

const dualMiniChartsWrapStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
  height: "280px",
};

const miniChartWrapStyle: CSSProperties = {
  width: "100%",
  height: "134px",
};

const workspaceGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.45fr 0.95fr",
  gap: "20px",
  alignItems: "start",
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

const formGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
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

const inlineInputStyle: CSSProperties = {
  width: "100%",
  minWidth: 0,
  padding: "7px 8px",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  fontSize: "12px",
  boxSizing: "border-box",
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

const formFooterStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
  marginTop: "16px",
};

const helperTextStyle: CSSProperties = {
  color: "#64748b",
  fontSize: "13px",
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

const attentionGridStyle: CSSProperties = {
  display: "grid",
  gap: "14px",
};

const attentionCardStyle: CSSProperties = {
  textAlign: "left",
  padding: "16px",
  borderRadius: "16px",
  border: "1px solid #e2e8f0",
  cursor: "pointer",
};

const attentionHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "8px",
  marginBottom: "10px",
};

const miniTagStyle: CSSProperties = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: "999px",
  background: "#f8fafc",
  color: "#334155",
  fontWeight: 700,
  fontSize: "12px",
};

const attentionNumberStyle: CSSProperties = {
  color: "#64748b",
  fontSize: "13px",
  fontWeight: 700,
  marginBottom: "6px",
};

const attentionTitleStyle: CSSProperties = {
  color: "#0f172a",
  fontWeight: 800,
  fontSize: "16px",
  marginBottom: "6px",
};

const attentionMetaRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  marginTop: "10px",
  color: "#64748b",
  fontSize: "12px",
};

const emptyBoardStyle: CSSProperties = {
  border: "1px dashed #cbd5e1",
  borderRadius: "14px",
  padding: "20px",
  color: "#64748b",
  background: "#f8fafc",
};

const chartWrapStyle: CSSProperties = {
  width: "100%",
  height: 280,
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
  gridTemplateColumns: "0.95fr 2.8fr 1fr 1.25fr 1.1fr 0.6fr",
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
  gridTemplateColumns: "0.95fr 2.8fr 1fr 1.25fr 1.1fr 0.6fr",
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

const programmeFindingsStyle: CSSProperties = {
  fontSize: "13px",
  color: "#0f172a",
  fontWeight: 700,
  textAlign: "center",
};

const emptyDetailStyle: CSSProperties = {
  border: "1px dashed #cbd5e1",
  borderRadius: "16px",
  padding: "24px",
  color: "#64748b",
  background: "#f8fafc",
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
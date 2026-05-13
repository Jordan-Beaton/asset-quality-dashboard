"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { ModuleSectionHeader } from "../../src/components/ModuleSectionHeader";
import { QualityKpiCard } from "../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../src/components/QualityPageHero";
import { supabase } from "../../src/lib/supabase";

type DocumentStatus =
  | "Draft"
  | "Under Review"
  | "Approved"
  | "Live"
  | "Superseded"
  | "Obsolete"
  | "Archived";

type ReviewApprovalStatus =
  | "Draft"
  | "Pending Review"
  | "Reviewed"
  | "Approved"
  | "Rejected";

type DocumentTypeOption =
  | "Procedure"
  | "Form"
  | "Register"
  | "Policy"
  | "Specification"
  | "List"
  | "Work Instruction"
  | "Template"
  | "Plan"
  | "Chart"
  | "Report";

type DepartmentOwnerOption =
  | "HSEQ"
  | "Assets"
  | "Human Resources"
  | "Commercial"
  | "Crewing"
  | "Engineering"
  | "Finance"
  | "Logistics"
  | "Procurement"
  | "Project"
  | "Operations";

type DocumentScope = "Company/System" | "Asset";

type DocumentRow = {
  id: string;
  document_scope: string | null;
  asset_id: string | null;
  asset_name: string | null;
  asset_code: string | null;
  asset_document_id_code: string | null;
  document_type: string | null;
  document_number: string;
  title: string;
  description: string | null;
  department_owner: string | null;
  status: string | null;
  review_approval_status: string | null;
  current_revision: string | null;
  issue_date: string | null;
  review_cycle_years: number;
  next_review_date: string | null;
  originator_name: string | null;
  originator_email: string | null;
  reviewed_by: string | null;
  reviewer_email?: string | null;
  reviewed_at: string | null;
  approved_by: string | null;
  approver_email?: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  notification_emails: string[] | null;
  comments: string | null;
  file_name: string | null;
  file_path: string | null;
  file_size: number | null;
  uploaded_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type DocumentRevisionRow = {
  id: string;
  document_id: string;
  revision: string;
  revision_notes: string | null;
  file_name: string | null;
  file_path: string | null;
  file_size: number | null;
  uploaded_at: string | null;
  issue_date: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  is_current: boolean | null;
  created_at: string | null;
};

type NotificationContactRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  active: boolean | null;
};

type PersonRow = {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  department: string | null;
  active: boolean | null;
  created_at: string | null;
};

type AssetOption = {
  id: string;
  asset_code: string | null;
  name: string | null;
  document_id_code: string | null;
  status: string | null;
};

type DocumentForm = {
  document_scope: DocumentScope;
  asset_id: string;
  asset_name: string;
  asset_code: string;
  asset_document_id_code: string;
  document_type: DocumentTypeOption | "";
  document_number: string;
  title: string;
  description: string;
  department_owner: DepartmentOwnerOption | "";
  status: DocumentStatus;
  review_approval_status: ReviewApprovalStatus;
  current_revision: string;
  issue_date: string;
  review_cycle_years: 1 | 2 | 3;
  originator_name: string;
  originator_email: string;
  reviewed_by: string;
  reviewer_email: string;
  reviewed_at: string;
  approved_by: string;
  approver_email: string;
  approved_at: string;
  rejected_by: string;
  rejected_at: string;
  rejection_reason: string;
  notification_emails: string[];
  comments: string;
};

type PeopleFieldKey = "originator_name" | "reviewed_by" | "approved_by" | "rejected_by";

type PeopleSearchState = Record<PeopleFieldKey, string>;

type NotificationEventType =
  | "submitted_for_review"
  | "reviewed"
  | "approved"
  | "rejected"
  | "superseded";

const STORAGE_BUCKET = "document-files";
const DEFAULT_USER_NAME = "Jordan Beaton";
const DEFAULT_USER_EMAIL = "jbeaton@enshoresubsea.com";
const DOCUMENT_TYPE_OPTIONS: DocumentTypeOption[] = [
  "Procedure",
  "Form",
  "Register",
  "Policy",
  "Specification",
  "List",
  "Work Instruction",
  "Template",
  "Plan",
  "Chart",
  "Report",
];

const DEPARTMENT_OWNER_OPTIONS: DepartmentOwnerOption[] = [
  "HSEQ",
  "Assets",
  "Human Resources",
  "Commercial",
  "Crewing",
  "Engineering",
  "Finance",
  "Logistics",
  "Procurement",
  "Project",
  "Operations",
];

const TYPE_CODE_MAP: Record<DocumentTypeOption, string> = {
  Procedure: "PRO",
  Form: "FRM",
  Register: "REG",
  Policy: "POL",
  Specification: "SPEC",
  List: "LST",
  "Work Instruction": "WI",
  Template: "TMP",
  Plan: "PLA",
  Chart: "CHT",
  Report: "RPT",
};

const DEPARTMENT_CODE_MAP: Record<DepartmentOwnerOption, string> = {
  HSEQ: "HSEQ",
  Assets: "AST",
  "Human Resources": "HR",
  Commercial: "COM",
  Crewing: "CRW",
  Engineering: "ENG",
  Finance: "FIN",
  Logistics: "LOG",
  Procurement: "PROC",
  Project: "PROJ",
  Operations: "OPS",
};

const emptyForm: DocumentForm = {
  document_scope: "Company/System",
  asset_id: "",
  asset_name: "",
  asset_code: "",
  asset_document_id_code: "",
  document_type: "",
  document_number: "",
  title: "",
  description: "",
  department_owner: "",
  status: "Draft",
  review_approval_status: "Draft",
  current_revision: "A",
  issue_date: "",
  review_cycle_years: 1,
  originator_name: "",
  originator_email: "",
  reviewed_by: "",
  reviewer_email: "",
  reviewed_at: "",
  approved_by: "",
  approver_email: "",
  approved_at: "",
  rejected_by: "",
  rejected_at: "",
  rejection_reason: "",
  notification_emails: [],
  comments: "",
};

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

function formatFileSize(value: number | null | undefined) {
  if (!value || value <= 0) return "-";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function compareTextNullable(a: string | null | undefined, b: string | null | undefined) {
  return (a || "").localeCompare(b || "", undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function normalizeApprovalStatus(value: string | null | undefined): ReviewApprovalStatus {
  const text = (value || "").trim().toLowerCase();
  if (text === "approved") return "Approved";
  if (text === "reviewed") return "Reviewed";
  if (text === "pending review") return "Pending Review";
  if (text === "rejected") return "Rejected";
  return "Draft";
}

function getStatusTone(status: string) {
  const value = status.toLowerCase();

  if (value.includes("live")) return { bg: "#dcfce7", color: "#166534" };
  if (value.includes("approved")) return { bg: "#dcfce7", color: "#166534" };
  if (value.includes("draft")) return { bg: "#dbeafe", color: "#1d4ed8" };
  if (value.includes("review")) return { bg: "#fef3c7", color: "#92400e" };
  if (value.includes("superseded")) return { bg: "#fee2e2", color: "#991b1b" };
  if (value.includes("obsolete")) return { bg: "#e5e7eb", color: "#374151" };
  if (value.includes("archived")) return { bg: "#ede9fe", color: "#6d28d9" };

  return { bg: "#e2e8f0", color: "#334155" };
}

function getReviewApprovalTone(status: string) {
  const value = status.toLowerCase();

  if (value.includes("approved")) return { bg: "#dcfce7", color: "#166534" };
  if (value.includes("reviewed")) return { bg: "#dbeafe", color: "#1d4ed8" };
  if (value.includes("pending")) return { bg: "#fef3c7", color: "#92400e" };
  if (value.includes("rejected")) return { bg: "#fee2e2", color: "#991b1b" };
  return { bg: "#e2e8f0", color: "#334155" };
}

function getReviewTone(nextReviewDate: string | null | undefined) {
  if (!nextReviewDate) {
    return { label: "Not set", bg: "#e2e8f0", color: "#334155" };
  }

  const today = new Date();
  const next = new Date(nextReviewDate);

  today.setHours(0, 0, 0, 0);
  next.setHours(0, 0, 0, 0);

  const diffDays = Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: "Overdue", bg: "#fee2e2", color: "#991b1b" };
  if (diffDays <= 30) return { label: "Due soon", bg: "#fef3c7", color: "#92400e" };
  return { label: "In date", bg: "#dcfce7", color: "#166534" };
}

function buildNextReviewDate(issueDate: string, reviewCycleYears: number) {
  if (!issueDate) return "";
  const date = new Date(issueDate);
  if (Number.isNaN(date.getTime())) return "";
  date.setFullYear(date.getFullYear() + reviewCycleYears);
  return date.toISOString().slice(0, 10);
}

function getNextRevision(currentRevision: string) {
  const revision = (currentRevision || "A").trim().toUpperCase();
  if (!revision) return "A";
  const lastChar = revision.charCodeAt(0);
  if (lastChar < 65 || lastChar >= 90) return "A";
  return String.fromCharCode(lastChar + 1);
}

function buildDocumentPrefix(
  departmentOwner: DepartmentOwnerOption | "",
  documentType: DocumentTypeOption | ""
) {
  if (!departmentOwner || !documentType) return "";
  return `ENS-${DEPARTMENT_CODE_MAP[departmentOwner]}-${TYPE_CODE_MAP[documentType]}`;
}

function buildAssetDocumentPrefix(assetDocumentIdCode: string, documentType: DocumentTypeOption | "") {
  const cleanCode = assetDocumentIdCode.trim().toUpperCase();
  if (!cleanCode || !documentType) return "";
  return `${cleanCode}-AST-${TYPE_CODE_MAP[documentType]}`;
}

function buildScopedDocumentPrefix(source: Pick<DocumentForm, "document_scope" | "asset_document_id_code" | "department_owner" | "document_type">) {
  if (source.document_scope === "Asset") {
    return buildAssetDocumentPrefix(source.asset_document_id_code, source.document_type);
  }

  return buildDocumentPrefix(source.department_owner, source.document_type);
}

function buildDocumentNumber(
  departmentOwner: DepartmentOwnerOption | "",
  documentType: DocumentTypeOption | "",
  nextSequence: number
) {
  const prefix = buildDocumentPrefix(departmentOwner, documentType);
  if (!prefix) return "";
  return `${prefix}-${String(nextSequence).padStart(3, "0")}`;
}

function buildDocumentNumberFromPrefix(prefix: string, nextSequence: number) {
  if (!prefix) return "";
  return `${prefix}-${String(nextSequence).padStart(3, "0")}`;
}

function extractSequenceNumber(documentNumber: string | null | undefined) {
  if (!documentNumber) return null;
  const match = documentNumber.match(/-(\d{3,})$/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isNaN(parsed) ? null : parsed;
}

function getNextSequenceFromRows(prefix: string, rows: DocumentRow[]) {
  const used = rows
    .filter((doc) => (doc.document_number || "").startsWith(`${prefix}-`))
    .map((doc) => extractSequenceNumber(doc.document_number))
    .filter((value): value is number => value !== null);

  return used.length ? Math.max(...used) + 1 : 1;
}

async function getNextDocumentSequence(prefix: string, fallbackRows: DocumentRow[]): Promise<number> {
  const { data, error } = await supabase
    .from("documents")
    .select("document_number")
    .ilike("document_number", `${prefix}-%`);

  if (error || !data) {
    return getNextSequenceFromRows(prefix, fallbackRows);
  }

  const used = data
    .map((doc) => extractSequenceNumber(doc.document_number))
    .filter((value): value is number => value !== null);

  return used.length ? Math.max(...used) + 1 : 1;
}

async function createSignedFileUrl(path: string) {
  if (!path) return "";

  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return "";
  return data.signedUrl;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function uniqueEmails(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizePersonName(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function findPersonByName(people: PersonRow[], value: string | null | undefined) {
  const target = normalizePersonName(value);
  if (!target) return null;
  return people.find((person) => normalizePersonName(person.name) === target) || null;
}

function getDocumentScopeLabel(doc: Pick<DocumentRow, "document_scope">) {
  return doc.document_scope === "Asset" ? "Asset" : "Company/System";
}

function getDocumentAssetContext(
  doc: Pick<DocumentRow, "asset_name" | "asset_code" | "asset_document_id_code">
) {
  const name = doc.asset_name || "Linked asset";
  const code = doc.asset_code ? ` (${doc.asset_code})` : "";
  const documentIdCode = doc.asset_document_id_code ? ` - ${doc.asset_document_id_code}` : "";
  return `${name}${code}${documentIdCode}`;
}

function deriveStoredNotificationEmails(
  source: Pick<DocumentForm, "notification_emails" | "reviewer_email" | "approver_email">
) {
  return uniqueEmails([...source.notification_emails, source.reviewer_email, source.approver_email]);
}

function extractAdditionalNotificationEmails(
  storedEmails: string[] | null | undefined,
  autoEmails: string[]
) {
  const autoSet = new Set(uniqueEmails(autoEmails).map((email) => email.toLowerCase()));
  return uniqueEmails((storedEmails || []).filter((email) => !autoSet.has(email.trim().toLowerCase())));
}

function DocumentsPageContent() {
  const searchParams = useSearchParams();
  const linkedSearch = searchParams.get("search")?.trim() || "";
  const linkedStatus = searchParams.get("status")?.trim() || "";
  const linkedType = searchParams.get("type")?.trim() || "";
  const linkedOwner = searchParams.get("owner")?.trim() || "";
  const linkedReview = searchParams.get("review")?.trim() || "";
  const linkedApproval = searchParams.get("approval")?.trim() || "";

  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [revisionsByDocumentId, setRevisionsByDocumentId] = useState<Record<string, DocumentRevisionRow[]>>({});
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [, setContacts] = useState<NotificationContactRow[]>([]);
  const [message, setMessage] = useState("Loading documents...");
  const [lastRefreshed, setLastRefreshed] = useState("");
  const [search, setSearch] = useState(linkedSearch);
  const [statusFilter, setStatusFilter] = useState(linkedStatus);
  const [typeFilter, setTypeFilter] = useState(linkedType);
  const [ownerFilter, setOwnerFilter] = useState(linkedOwner);
  const [reviewFilter, setReviewFilter] = useState(linkedReview);
  const [approvalFilter, setApprovalFilter] = useState(linkedApproval);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showCreatePanel, setShowCreatePanel] = useState(false);

  const [form, setForm] = useState<DocumentForm>(emptyForm);
  const [detailForm, setDetailForm] = useState<DocumentForm>(emptyForm);
  const [formPeopleSearch, setFormPeopleSearch] = useState<PeopleSearchState>({
    originator_name: emptyForm.originator_name,
    reviewed_by: emptyForm.reviewed_by,
    approved_by: emptyForm.approved_by,
    rejected_by: emptyForm.rejected_by,
  });
  const [detailPeopleSearch, setDetailPeopleSearch] = useState<PeopleSearchState>({
    originator_name: emptyForm.originator_name,
    reviewed_by: emptyForm.reviewed_by,
    approved_by: emptyForm.approved_by,
    rejected_by: emptyForm.rejected_by,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [nextSequence, setNextSequence] = useState(1);

  async function loadDocuments() {
    const [
      { data: documentsData, error: documentsError },
      { data: revisionsData, error: revisionsError },
      { data: assetsData, error: assetsError },
      { data: peopleData, error: peopleError },
      { data: contactsData, error: contactsError },
    ] = await Promise.all([
      supabase.from("documents").select("*").order("document_number", { ascending: true }),
      supabase.from("document_revisions").select("*").order("uploaded_at", { ascending: false }),
      supabase
        .from("assets")
        .select("id, asset_code, name, document_id_code, status")
        .order("name", { ascending: true }),
      supabase.from("people").select("id, name, email, role, department, active, created_at").eq("active", true).order("name", { ascending: true }),
      supabase
        .from("document_notification_contacts")
        .select("*")
        .eq("active", true)
        .order("first_name", { ascending: true }),
    ]);

    if (documentsError) {
      setMessage(`Load failed: ${documentsError.message}`);
      return;
    }

    if (revisionsError) {
      setMessage(`Revision load failed: ${revisionsError.message}`);
      return;
    }

    const rows = (documentsData || []) as DocumentRow[];
    const revisions = (revisionsData || []) as DocumentRevisionRow[];

    const grouped: Record<string, DocumentRevisionRow[]> = {};
    revisions.forEach((revision) => {
      if (!grouped[revision.document_id]) grouped[revision.document_id] = [];
      grouped[revision.document_id].push(revision);
    });

    const fallbackContacts: NotificationContactRow[] = [];

    setDocuments(rows);
    setRevisionsByDocumentId(grouped);
    setAssets(assetsError ? [] : ((assetsData as AssetOption[]) || []));
    setPeople(peopleError ? [] : ((peopleData as PersonRow[]) || []));
    setContacts(contactsError ? fallbackContacts : ((contactsData as NotificationContactRow[]) || fallbackContacts));
    setSelectedDocumentId((current) => current || rows[0]?.id || "");
    setLastRefreshed(new Date().toLocaleString("en-GB"));
    setMessage(`Loaded ${rows.length} document${rows.length === 1 ? "" : "s"} successfully.`);
  }

  useEffect(() => {
    void loadDocuments();
  }, []);

  useEffect(() => {
    let isActive = true;

    async function updateNextNumber() {
      const prefix = buildScopedDocumentPrefix(form);

      if (!prefix) {
        if (!isActive) return;
        setNextSequence(1);
        setForm((prev) => ({ ...prev, document_number: "" }));
        return;
      }

      const next = await getNextDocumentSequence(prefix, documents);

      if (!isActive) return;

      setNextSequence(next);
      setForm((prev) => ({
        ...prev,
        document_number: buildDocumentNumberFromPrefix(buildScopedDocumentPrefix(prev), next),
      }));
    }

    void updateNextNumber();

    return () => {
      isActive = false;
    };
  }, [form.document_scope, form.department_owner, form.document_type, form.asset_document_id_code, documents]);

  const filteredDocuments = useMemo(() => {
    const lower = search.trim().toLowerCase();

    return documents.filter((doc) => {
      const reviewTone = getReviewTone(doc.next_review_date);
      const normalizedApproval = normalizeApprovalStatus(doc.review_approval_status);

      const matchesSearch =
        !lower ||
        (doc.document_number || "").toLowerCase().includes(lower) ||
        (doc.title || "").toLowerCase().includes(lower) ||
        (doc.description || "").toLowerCase().includes(lower) ||
        (doc.document_type || "").toLowerCase().includes(lower) ||
        (doc.department_owner || "").toLowerCase().includes(lower) ||
        (doc.document_scope || "").toLowerCase().includes(lower) ||
        (doc.asset_name || "").toLowerCase().includes(lower) ||
        (doc.asset_code || "").toLowerCase().includes(lower) ||
        (doc.asset_document_id_code || "").toLowerCase().includes(lower);

      const matchesStatus = !statusFilter || (doc.status || "") === statusFilter;
      const matchesType = !typeFilter || (doc.document_type || "") === typeFilter;
      const matchesOwner = !ownerFilter || (doc.department_owner || "") === ownerFilter;
      const matchesApproval = !approvalFilter || normalizedApproval === approvalFilter;
      const matchesReview =
        !reviewFilter ||
        (reviewFilter === "Overdue" && reviewTone.label === "Overdue") ||
        (reviewFilter === "Due soon" && reviewTone.label === "Due soon") ||
        (reviewFilter === "In date" && reviewTone.label === "In date") ||
        (reviewFilter === "Not set" && reviewTone.label === "Not set");

      return (
        matchesSearch &&
        matchesStatus &&
        matchesType &&
        matchesOwner &&
        matchesApproval &&
        matchesReview
      );
    });
  }, [documents, search, statusFilter, typeFilter, ownerFilter, approvalFilter, reviewFilter]);

  const dueSoonDocuments = useMemo(
    () => documents.filter((doc) => getReviewTone(doc.next_review_date).label === "Due soon"),
    [documents]
  );

  const selectedDocument = useMemo(
    () => documents.find((doc) => doc.id === selectedDocumentId) || null,
    [documents, selectedDocumentId]
  );

  const latestDocumentLabel = useMemo(() => {
    const latest = [...documents].sort((a, b) => {
      const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
      const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
      return bTime - aTime;
    })[0];

    return latest ? `${latest.document_number} - ${latest.title}` : "No documents loaded";
  }, [documents]);

  const selectedRevisions = useMemo(() => {
    if (!selectedDocumentId) return [];
    return revisionsByDocumentId[selectedDocumentId] || [];
  }, [revisionsByDocumentId, selectedDocumentId]);

  const supportsReviewerEmail = useMemo(
    () => documents.some((doc) => Object.prototype.hasOwnProperty.call(doc, "reviewer_email")),
    [documents]
  );
  const supportsApproverEmail = useMemo(
    () => documents.some((doc) => Object.prototype.hasOwnProperty.call(doc, "approver_email")),
    [documents]
  );

  function resolveDocumentPersonEmail(name: string) {
    const matchedPerson = findPersonByName(people, name);
    if (!matchedPerson) return "";
    return matchedPerson.email?.trim() || "";
  }

  function buildDocumentFormFromRow(row: DocumentRow): DocumentForm {
    const approverName = row.approved_by || "";
    const rejectorName = row.rejected_by || "";
    const outcomeName = approverName || rejectorName;
    const reviewerEmail =
      (typeof row.reviewer_email === "string" ? row.reviewer_email : null) ||
      resolveDocumentPersonEmail(row.reviewed_by || "");
    const approverEmail =
      (typeof row.approver_email === "string" ? row.approver_email : null) ||
      resolveDocumentPersonEmail(outcomeName);
    const originatorEmail = row.originator_email || "";
    const extras = extractAdditionalNotificationEmails(row.notification_emails, [
      originatorEmail,
      reviewerEmail || "",
      approverEmail || "",
    ]);

    return {
      document_scope: row.document_scope === "Asset" ? "Asset" : "Company/System",
      asset_id: row.asset_id || "",
      asset_name: row.asset_name || "",
      asset_code: row.asset_code || "",
      asset_document_id_code: row.asset_document_id_code || "",
      document_type: (row.document_type as DocumentTypeOption) || "",
      document_number: row.document_number || "",
      title: row.title || "",
      description: row.description || "",
      department_owner: (row.department_owner as DepartmentOwnerOption) || "",
      status: (row.status as DocumentStatus) || "Draft",
      review_approval_status: normalizeApprovalStatus(row.review_approval_status),
      current_revision: row.current_revision || "A",
      issue_date: row.issue_date || "",
      review_cycle_years: (row.review_cycle_years as 1 | 2 | 3) || 1,
      originator_name: row.originator_name || "",
      originator_email: originatorEmail,
      reviewed_by: row.reviewed_by || "",
      reviewer_email: reviewerEmail || "",
      reviewed_at: row.reviewed_at ? row.reviewed_at.slice(0, 10) : "",
      approved_by: approverName,
      approver_email: approverEmail || "",
      approved_at: row.approved_at ? row.approved_at.slice(0, 10) : "",
      rejected_by: rejectorName,
      rejected_at: row.rejected_at ? row.rejected_at.slice(0, 10) : "",
      rejection_reason: row.rejection_reason || "",
      notification_emails: extras,
      comments: row.comments || "",
    };
  }

  function setCreatePersonField(field: PeopleFieldKey, person: PersonRow | null) {
    setForm((prev) => {
      if (field === "originator_name") {
        return {
          ...prev,
          originator_name: person?.name || "",
          originator_email: person?.email?.trim() || "",
        };
      }
      if (field === "reviewed_by") {
        return {
          ...prev,
          reviewed_by: person?.name || "",
          reviewer_email: person?.email?.trim() || "",
        };
      }
      if (field === "approved_by") {
        return {
          ...prev,
          approved_by: person?.name || "",
          rejected_by: "",
          approver_email: person?.email?.trim() || "",
        };
      }
      return {
        ...prev,
        approved_by: "",
        rejected_by: person?.name || "",
        approver_email: person?.email?.trim() || "",
      };
    });
    setFormPeopleSearch((prev) => {
      if (field === "approved_by") {
        return {
          ...prev,
          approved_by: person?.name || "",
          rejected_by: "",
        };
      }
      if (field === "rejected_by") {
        return {
          ...prev,
          approved_by: "",
          rejected_by: person?.name || "",
        };
      }
      return { ...prev, [field]: person?.name || "" };
    });
  }

  function setDetailPersonField(field: PeopleFieldKey, person: PersonRow | null) {
    setDetailForm((prev) => {
      if (field === "originator_name") {
        return {
          ...prev,
          originator_name: person?.name || "",
          originator_email: person?.email?.trim() || "",
        };
      }
      if (field === "reviewed_by") {
        return {
          ...prev,
          reviewed_by: person?.name || "",
          reviewer_email: person?.email?.trim() || "",
        };
      }
      if (field === "approved_by") {
        return {
          ...prev,
          approved_by: person?.name || "",
          rejected_by: "",
          approver_email: person?.email?.trim() || "",
        };
      }
      return {
        ...prev,
        approved_by: "",
        rejected_by: person?.name || "",
        approver_email: person?.email?.trim() || "",
      };
    });
    setDetailPeopleSearch((prev) => {
      if (field === "approved_by") {
        return {
          ...prev,
          approved_by: person?.name || "",
          rejected_by: "",
        };
      }
      if (field === "rejected_by") {
        return {
          ...prev,
          approved_by: "",
          rejected_by: person?.name || "",
        };
      }
      return { ...prev, [field]: person?.name || "" };
    });
  }

  useEffect(() => {
    if (!selectedDocument) return;

    const nextDetailForm = buildDocumentFormFromRow(selectedDocument);
    setDetailForm(nextDetailForm);
    setDetailPeopleSearch({
      originator_name: nextDetailForm.originator_name,
      reviewed_by: nextDetailForm.reviewed_by,
      approved_by: nextDetailForm.approved_by,
      rejected_by: nextDetailForm.rejected_by,
    });
  }, [people, selectedDocument]);

  const totalDocuments = documents.length;
  const liveDocuments = documents.filter((doc) => (doc.status || "").trim().toLowerCase() === "live").length;
  const draftDocuments = documents.filter((doc) => (doc.status || "").trim().toLowerCase() === "draft").length;
  const archivedDocuments = documents.filter(
    (doc) => (doc.status || "").trim().toLowerCase() === "archived"
  ).length;
  const overdueReviews = documents.filter(
    (doc) => getReviewTone(doc.next_review_date).label === "Overdue"
  ).length;
  const dueSoonReviews = dueSoonDocuments.length;
  const approvedDocuments = documents.filter(
    (doc) => normalizeApprovalStatus(doc.review_approval_status) === "Approved"
  ).length;

  const uniqueTypes = [...new Set(documents.map((doc) => doc.document_type).filter(Boolean))].sort(
    compareTextNullable
  );
  const uniqueOwners = [...new Set(documents.map((doc) => doc.department_owner).filter(Boolean))].sort(
    compareTextNullable
  );
  const assetDocumentIdCodeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    assets.forEach((asset) => {
      const code = (asset.document_id_code || "").trim().toUpperCase();
      if (!code) return;
      counts[code] = (counts[code] || 0) + 1;
    });
    return counts;
  }, [assets]);
  const selectedCreateAsset = assets.find((asset) => asset.id === form.asset_id) || null;
  const selectedCreateAssetCode = (selectedCreateAsset?.document_id_code || "").trim().toUpperCase();
  const selectedCreateAssetCodeIsDuplicate =
    Boolean(selectedCreateAssetCode) && (assetDocumentIdCodeCounts[selectedCreateAssetCode] || 0) > 1;

  const nextReviewDatePreview = buildNextReviewDate(form.issue_date, form.review_cycle_years);
  const detailReviewDatePreview = buildNextReviewDate(detailForm.issue_date, detailForm.review_cycle_years);
  const formOriginatorPerson = findPersonByName(people, form.originator_name);
  const formReviewerPerson = findPersonByName(people, form.reviewed_by);
  const formApproverPerson = findPersonByName(people, form.approved_by);
  const formRejectorPerson = findPersonByName(people, form.rejected_by);
  const detailOriginatorPerson = findPersonByName(people, detailForm.originator_name);
  const detailReviewerPerson = findPersonByName(people, detailForm.reviewed_by);
  const detailApproverPerson = findPersonByName(people, detailForm.approved_by);
  const detailRejectorPerson = findPersonByName(people, detailForm.rejected_by);
  function createPersonSearchHandler(
    mode: "create" | "detail",
    field: PeopleFieldKey,
    value: string
  ) {
    const setter = mode === "create" ? setFormPeopleSearch : setDetailPeopleSearch;
    setter((prev) => ({ ...prev, [field]: value }));

    if (!value.trim()) {
      if (mode === "create") {
        setCreatePersonField(field, null);
      } else {
        setDetailPersonField(field, null);
      }
    }
  }

  function handlePersonSearchBlur(mode: "create" | "detail", field: PeopleFieldKey) {
    window.setTimeout(() => {
      const currentValue =
        mode === "create"
          ? field === "originator_name"
            ? form.originator_name
            : field === "reviewed_by"
            ? form.reviewed_by
            : field === "approved_by"
            ? form.approved_by
            : form.rejected_by
          : field === "originator_name"
          ? detailForm.originator_name
          : field === "reviewed_by"
          ? detailForm.reviewed_by
          : field === "approved_by"
          ? detailForm.approved_by
          : detailForm.rejected_by;

      const setter = mode === "create" ? setFormPeopleSearch : setDetailPeopleSearch;
      setter((prev) => ({ ...prev, [field]: currentValue }));
    }, 120);
  }

  function applyCreateDocumentScope(scope: DocumentScope) {
    setForm((prev) => ({
      ...prev,
      document_scope: scope,
      department_owner: scope === "Asset" ? "Assets" : "",
      asset_id: "",
      asset_name: "",
      asset_code: "",
      asset_document_id_code: "",
      document_number: "",
    }));
  }

  function applyCreateAsset(assetId: string) {
    const asset = assets.find((item) => item.id === assetId) || null;

    setForm((prev) => ({
      ...prev,
      asset_id: asset?.id || "",
      asset_name: asset?.name || "",
      asset_code: asset?.asset_code || "",
      asset_document_id_code: (asset?.document_id_code || "").trim().toUpperCase(),
      department_owner: "Assets",
    }));
  }

  async function notifyDocumentEvent(
    eventType: NotificationEventType,
    source: DocumentForm,
    documentNumber: string,
    documentTitle: string,
    extraMessage?: string
  ) {
    const recipientEmails =
      eventType === "submitted_for_review"
        ? uniqueEmails([source.reviewer_email])
        : eventType === "reviewed"
        ? uniqueEmails([source.approver_email])
        : eventType === "approved"
        ? uniqueEmails([source.originator_email, source.reviewer_email, source.approver_email])
        : uniqueEmails([source.originator_email, source.reviewer_email, source.approver_email]);

    try {
      const response = await fetch("/api/document-notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventType,
          documentNumber,
          documentTitle,
          currentRevision: source.current_revision,
          originatorName: source.originator_name,
          originatorEmail: source.originator_email,
          reviewedBy: source.reviewed_by,
          approvedBy: source.approved_by,
          rejectedBy: source.rejected_by,
          reviewApprovalStatus: source.review_approval_status,
          recipientEmails,
          message: extraMessage || "",
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Notification send failed");
      }

      return null;
    } catch (error) {
      const text = error instanceof Error ? error.message : "Notification send failed";
      return text;
    }
  }

  function applySnapshotFilter(filter: {
    status?: string;
    approval?: string;
    review?: string;
  }) {
    setSearch("");
    setTypeFilter("");
    setOwnerFilter("");
    setStatusFilter(filter.status || "");
    setApprovalFilter(filter.approval || "");
    setReviewFilter(filter.review || "");
    setMessage("Snapshot filter applied.");
  }

  function exportDocumentsReport(title: string, rows: DocumentRow[]) {
    const printWindow = window.open("", "_blank", "width=1000,height=800");

    if (!printWindow) {
      setMessage("Pop-up blocked. Allow pop-ups to generate the report.");
      return;
    }

    const generatedAt = new Date().toLocaleString("en-GB");

    const tableRows = rows
      .map(
        (doc) => `
          <tr>
            <td>${doc.document_number || "-"}</td>
            <td>${doc.title || "-"}</td>
            <td>${doc.document_type || "-"}</td>
            <td>${doc.department_owner || "-"}</td>
            <td>${doc.current_revision || "-"}</td>
            <td>${doc.status || "-"}</td>
            <td>${normalizeApprovalStatus(doc.review_approval_status)}</td>
            <td>${formatDate(doc.next_review_date)}</td>
          </tr>
        `
      )
      .join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body {
              font-family: Arial, Helvetica, sans-serif;
              padding: 32px;
              color: #0f172a;
            }
            h1 {
              margin: 0 0 8px;
              font-size: 28px;
              color: #0f766e;
            }
            .meta {
              margin-bottom: 24px;
              color: #475569;
              font-size: 14px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 13px;
            }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 10px 8px;
              text-align: left;
              vertical-align: top;
            }
            th {
              background: #f8fafc;
              font-weight: 700;
            }
            .summary {
              margin-bottom: 18px;
              font-size: 14px;
              font-weight: 700;
            }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div class="meta">Generated: ${generatedAt}</div>
          <div class="summary">Total documents in report: ${rows.length}</div>
          <table>
            <thead>
              <tr>
                <th>Document Number</th>
                <th>Title</th>
                <th>Type</th>
                <th>Owner</th>
                <th>Revision</th>
                <th>Status</th>
                <th>Approval Status</th>
                <th>Next Review</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows || `<tr><td colspan="8">No documents found.</td></tr>`}
            </tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  async function openDocumentFile(path: string) {
    if (!path) {
      setMessage("No controlled copy uploaded for this document.");
      return;
    }

    const signedUrl = await createSignedFileUrl(path);

    if (!signedUrl) {
      setMessage("Could not open the controlled copy.");
      return;
    }

    window.open(signedUrl, "_blank", "noopener,noreferrer");
  }

  async function addDocument(e: React.FormEvent) {
    e.preventDefault();

    if (!form.document_number.trim()) {
      setMessage("Document number is required.");
      return;
    }

    if (!form.title.trim()) {
      setMessage("Title is required.");
      return;
    }

    if (!form.department_owner || !form.document_type) {
      setMessage("Department owner and document type are required.");
      return;
    }

    if (form.document_scope === "Asset") {
      if (!form.asset_id) {
        setMessage("Select an asset for asset-specific documents.");
        return;
      }

      if (!form.asset_document_id_code.trim()) {
        setMessage("Selected asset needs a Document ID Code before an asset-specific document can be created.");
        return;
      }
    }

    if (!form.originator_name.trim() || !form.originator_email.trim()) {
      setMessage("Originator name and originator email are required.");
      return;
    }

    if (form.status === "Live" && form.review_approval_status !== "Approved") {
      setMessage("A document cannot go Live until it has been reviewed and approved.");
      return;
    }

    setIsSaving(true);

    const insertPayload: Record<string, unknown> = {
      document_scope: form.document_scope,
      asset_id: form.document_scope === "Asset" ? form.asset_id : null,
      asset_name: form.document_scope === "Asset" ? form.asset_name.trim() || null : null,
      asset_code: form.document_scope === "Asset" ? form.asset_code.trim() || null : null,
      asset_document_id_code:
        form.document_scope === "Asset" ? form.asset_document_id_code.trim().toUpperCase() : null,
      document_type: form.document_type,
      document_number: form.document_number.trim(),
      title: form.title.trim(),
      description: form.description.trim() || null,
      department_owner: form.department_owner,
      status: form.status,
      review_approval_status: form.review_approval_status,
      current_revision: (form.current_revision || "A").trim().toUpperCase(),
      issue_date: form.issue_date || null,
      review_cycle_years: form.review_cycle_years,
      originator_name: form.originator_name.trim(),
      originator_email: form.originator_email.trim(),
      reviewed_by: form.reviewed_by.trim() || null,
      reviewed_at: form.reviewed_at || null,
      approved_by: form.approved_by.trim() || null,
      rejected_by: form.rejected_by.trim() || null,
      approved_at: form.approved_at || null,
      notification_emails: deriveStoredNotificationEmails(form),
      comments: form.comments.trim() || null,
    };

    if (supportsReviewerEmail) {
      insertPayload.reviewer_email = form.reviewer_email.trim() || null;
    }
    if (supportsApproverEmail) {
      insertPayload.approver_email = form.approver_email.trim() || null;
    }

    const { data, error } = await supabase
      .from("documents")
      .insert(insertPayload)
      .select("*")
      .single();

    setIsSaving(false);

    if (error || !data) {
      setMessage(`Add document failed: ${error?.message || "Unknown error"}`);
      return;
    }

    setForm(emptyForm);
    setFormPeopleSearch({
      originator_name: emptyForm.originator_name,
      reviewed_by: emptyForm.reviewed_by,
      approved_by: emptyForm.approved_by,
      rejected_by: emptyForm.rejected_by,
    });
    setSelectedDocumentId((data as DocumentRow).id);
    setShowDetailPanel(true);
    setShowCreatePanel(false);
    setMessage("Document added successfully.");
    await loadDocuments();
  }

  async function saveDocumentChanges() {
    if (!selectedDocument) {
      setMessage("Select a document first.");
      return;
    }

    if (!detailForm.title.trim()) {
      setMessage("Title is required.");
      return;
    }

    if (!detailForm.department_owner || !detailForm.document_type) {
      setMessage("Department owner and document type are required.");
      return;
    }

    if (detailForm.document_scope === "Asset" && !detailForm.asset_document_id_code.trim()) {
      setMessage("Asset-specific documents need a stored Asset Document ID Code.");
      return;
    }

    if (!detailForm.originator_name.trim() || !detailForm.originator_email.trim()) {
      setMessage("Originator name and originator email are required.");
      return;
    }

    if (detailForm.status === "Live" && detailForm.review_approval_status !== "Approved") {
      setMessage("A document cannot go Live until it has been reviewed and approved.");
      return;
    }

    setIsSaving(true);

    const updatePayload: Record<string, unknown> = {
      document_scope: detailForm.document_scope,
      asset_id: detailForm.document_scope === "Asset" ? detailForm.asset_id || null : null,
      asset_name: detailForm.document_scope === "Asset" ? detailForm.asset_name.trim() || null : null,
      asset_code: detailForm.document_scope === "Asset" ? detailForm.asset_code.trim() || null : null,
      asset_document_id_code:
        detailForm.document_scope === "Asset" ? detailForm.asset_document_id_code.trim().toUpperCase() : null,
      document_type: detailForm.document_type,
      title: detailForm.title.trim(),
      description: detailForm.description.trim() || null,
      department_owner: detailForm.department_owner,
      status: detailForm.status,
      review_approval_status: detailForm.review_approval_status,
      current_revision: (detailForm.current_revision || "A").trim().toUpperCase(),
      issue_date: detailForm.issue_date || null,
      review_cycle_years: detailForm.review_cycle_years,
      originator_name: detailForm.originator_name.trim(),
      originator_email: detailForm.originator_email.trim(),
      reviewed_by: detailForm.reviewed_by.trim() || null,
      reviewed_at: detailForm.reviewed_at || null,
      approved_by: detailForm.approved_by.trim() || null,
      rejected_by: detailForm.rejected_by.trim() || null,
      approved_at: detailForm.approved_at || null,
      notification_emails: deriveStoredNotificationEmails(detailForm),
      comments: detailForm.comments.trim() || null,
    };

    if (supportsReviewerEmail) {
      updatePayload.reviewer_email = detailForm.reviewer_email.trim() || null;
    }
    if (supportsApproverEmail) {
      updatePayload.approver_email = detailForm.approver_email.trim() || null;
    }

    const { error } = await supabase
      .from("documents")
      .update(updatePayload)
      .eq("id", selectedDocument.id);

    setIsSaving(false);

    if (error) {
      setMessage(`Update failed: ${error.message}`);
      return;
    }

    setMessage("Document updated successfully.");
    await loadDocuments();
  }

  async function submitForReview() {
    if (!selectedDocument) {
      setMessage("Select a document first.");
      return;
    }

    if (!detailForm.originator_name.trim() || !detailForm.originator_email.trim()) {
      setMessage("Originator name and email are required before submitting for review.");
      return;
    }

    const payload: Record<string, unknown> = {
      status: "Under Review" as DocumentStatus,
      review_approval_status: "Pending Review" as ReviewApprovalStatus,
      originator_name: detailForm.originator_name.trim(),
      originator_email: detailForm.originator_email.trim(),
      notification_emails: deriveStoredNotificationEmails(detailForm),
      comments: detailForm.comments.trim(),
    };

    const { error } = await supabase.from("documents").update(payload).eq("id", selectedDocument.id);

    if (error) {
      setMessage(`Submit for review failed: ${error.message}`);
      return;
    }

    const reviewSubmissionSource: DocumentForm = {
      ...detailForm,
      status: "Under Review",
      review_approval_status: "Pending Review",
      originator_name: detailForm.originator_name.trim(),
      originator_email: detailForm.originator_email.trim(),
      notification_emails: deriveStoredNotificationEmails(detailForm),
      comments: detailForm.comments.trim(),
    };

      const notificationError = await notifyDocumentEvent(
        "submitted_for_review",
        reviewSubmissionSource,
        selectedDocument.document_number,
        detailForm.title.trim(),
        detailForm.comments.trim()
      );

      setMessage(
        notificationError
          ? `Document updated, but notification failed: ${notificationError}`
          : "Document submitted for review."
      );
      await loadDocuments();
  }

  async function markReviewed() {
    if (!selectedDocument) {
      setMessage("Select a document first.");
      return;
    }

    if (normalizeApprovalStatus(selectedDocument.review_approval_status) !== "Pending Review") {
      setMessage("Only documents pending review can be marked as reviewed.");
      return;
    }

    const reviewDate =
      detailForm.reviewed_at && detailForm.reviewed_at.trim() ? detailForm.reviewed_at : todayIsoDate();

    const payload: Record<string, unknown> = {
      status: "Under Review" as DocumentStatus,
      review_approval_status: "Reviewed" as ReviewApprovalStatus,
      reviewed_by: detailForm.reviewed_by.trim() || DEFAULT_USER_NAME,
      reviewed_at: reviewDate,
      rejected_by: "",
      rejected_at: null,
      rejection_reason: "",
      notification_emails: deriveStoredNotificationEmails(detailForm),
    };
    if (supportsReviewerEmail) {
      payload.reviewer_email = detailForm.reviewer_email.trim() || null;
    }

    const { error } = await supabase.from("documents").update(payload).eq("id", selectedDocument.id);

    if (error) {
      setMessage(`Mark reviewed failed: ${error.message}`);
      return;
    }

    const reviewedSource: DocumentForm = {
      ...detailForm,
      status: "Under Review",
      review_approval_status: "Reviewed",
      reviewed_by: String(payload.reviewed_by || ""),
      reviewer_email: detailForm.reviewer_email,
      reviewed_at: String(payload.reviewed_at || ""),
      rejected_by: "",
      rejected_at: "",
      rejection_reason: "",
      notification_emails: deriveStoredNotificationEmails(detailForm),
    };

      const notificationError = await notifyDocumentEvent(
        "reviewed",
        reviewedSource,
        selectedDocument.document_number,
        detailForm.title.trim(),
        `Reviewed by ${String(payload.reviewed_by || "")} on ${formatDate(String(payload.reviewed_at || ""))}.`
      );

      setMessage(
        notificationError
          ? `Document updated, but notification failed: ${notificationError}`
          : "Document marked as reviewed."
      );
      await loadDocuments();
  }

  async function approveDocument() {
    if (!selectedDocument) {
      setMessage("Select a document first.");
      return;
    }

    if (normalizeApprovalStatus(selectedDocument.review_approval_status) !== "Reviewed") {
      setMessage("A document must be reviewed before it can be approved.");
      return;
    }

    const approvedDate = todayIsoDate();

    const payload: Record<string, unknown> = {
      status: "Live" as DocumentStatus,
      review_approval_status: "Approved" as ReviewApprovalStatus,
      approved_by: detailForm.approved_by.trim() || DEFAULT_USER_NAME,
      approved_at:
        detailForm.approved_at && detailForm.approved_at.trim() ? detailForm.approved_at : approvedDate,
      rejected_by: "",
      rejected_at: null,
      rejection_reason: "",
      notification_emails: deriveStoredNotificationEmails(detailForm),
    };
    if (supportsApproverEmail) {
      payload.approver_email = detailForm.approver_email.trim() || null;
    }

    const { error } = await supabase.from("documents").update(payload).eq("id", selectedDocument.id);

    if (error) {
      setMessage(`Approve failed: ${error.message}`);
      return;
    }

    const approvedSource: DocumentForm = {
      ...detailForm,
      status: "Live",
      review_approval_status: "Approved",
      approved_by: String(payload.approved_by || ""),
      approver_email: detailForm.approver_email,
      approved_at: String(payload.approved_at || ""),
      rejected_by: "",
      rejected_at: "",
      rejection_reason: "",
      notification_emails: deriveStoredNotificationEmails(detailForm),
    };

      const notificationError = await notifyDocumentEvent(
        "approved",
        approvedSource,
        selectedDocument.document_number,
        detailForm.title.trim(),
        `Approved by ${String(payload.approved_by || "")} on ${formatDate(String(payload.approved_at || ""))}.`
      );

      setMessage(
        notificationError
          ? `Document updated, but notification failed: ${notificationError}`
          : "Document approved and moved live."
      );
      await loadDocuments();
  }

  async function rejectDocument() {
    if (!selectedDocument) {
      setMessage("Select a document first.");
      return;
    }

    if (!detailForm.rejection_reason.trim()) {
      setMessage("A rejection reason is required.");
      return;
    }

    const rejectedDate = todayIsoDate();

    const payload: Record<string, unknown> = {
      status: "Draft" as DocumentStatus,
      review_approval_status: "Rejected" as ReviewApprovalStatus,
      approved_by: "",
      rejected_by: detailForm.rejected_by.trim() || DEFAULT_USER_NAME,
      rejected_at: detailForm.rejected_at || rejectedDate,
      rejection_reason: detailForm.rejection_reason.trim(),
      notification_emails: deriveStoredNotificationEmails(detailForm),
    };
    if (supportsApproverEmail) {
      payload.approver_email = detailForm.approver_email.trim() || null;
    }

    const { error } = await supabase.from("documents").update(payload).eq("id", selectedDocument.id);

    if (error) {
      setMessage(`Reject failed: ${error.message}`);
      return;
    }

    const rejectedSource: DocumentForm = {
      ...detailForm,
      status: "Draft",
      review_approval_status: "Rejected",
      rejected_by: String(payload.rejected_by || ""),
      rejected_at: String(payload.rejected_at || ""),
      rejection_reason: String(payload.rejection_reason || ""),
      notification_emails: deriveStoredNotificationEmails(detailForm),
    };

    await notifyDocumentEvent(
      "rejected",
      rejectedSource,
      selectedDocument.document_number,
      detailForm.title.trim(),
      `Rejected by ${String(payload.rejected_by || "")} on ${formatDate(String(payload.rejected_at || ""))}.\nReason: ${String(payload.rejection_reason || "")}`
    );

    setMessage("Document rejected and originator notified.");
    await loadDocuments();
  }

  async function deleteSelectedDocument() {
    if (!selectedDocument) {
      setMessage("Select a document first.");
      return;
    }

    if ((selectedDocument.status || "").trim().toLowerCase() === "live") {
      setMessage("Live documents cannot be deleted. Supersede or archive them instead.");
      return;
    }

    const confirmed = window.confirm(`Delete ${selectedDocument.document_number}?`);
    if (!confirmed) return;

    const revisionPaths = (revisionsByDocumentId[selectedDocument.id] || [])
      .map((item) => item.file_path)
      .filter(Boolean) as string[];

    if (selectedDocument.file_path) {
      revisionPaths.push(selectedDocument.file_path);
    }

    if (revisionPaths.length > 0) {
      await supabase.storage.from(STORAGE_BUCKET).remove([...new Set(revisionPaths)]);
    }

    const { error } = await supabase.from("documents").delete().eq("id", selectedDocument.id);

    if (error) {
      setMessage(`Delete failed: ${error.message}`);
      return;
    }

    const remaining = documents.filter((doc) => doc.id !== selectedDocument.id);
    setSelectedDocumentId(remaining[0]?.id || "");
    setShowDetailPanel(false);
    setMessage("Document deleted successfully.");
    await loadDocuments();
  }

  async function handleControlledFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    if (!selectedDocument) {
      setMessage("Select a document first.");
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    if (detailForm.status === "Live" && detailForm.review_approval_status !== "Approved") {
      setMessage("A document cannot go Live until it has been reviewed and approved.");
      event.target.value = "";
      return;
    }

    setIsUploadingFile(true);

    try {
      const currentRevision = (detailForm.current_revision || selectedDocument.current_revision || "A")
        .trim()
        .toUpperCase();
      const safeName = sanitizeFileName(file.name);
      const path = `documents/${selectedDocument.id}/revisions/${currentRevision}/${Date.now()}-${safeName}`;
      const oldPath = selectedDocument.file_path || "";
      const uploadTimestamp = new Date().toISOString();

      const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
        upsert: true,
      });

      if (uploadError) {
        setMessage(`Upload failed: ${uploadError.message}`);
        return;
      }

      await supabase
        .from("document_revisions")
        .update({ is_current: false })
        .eq("document_id", selectedDocument.id);

      const fileUpdatePayload: Record<string, unknown> = {
        document_type: detailForm.document_type || null,
        title: detailForm.title.trim(),
        description: detailForm.description.trim() || null,
        department_owner: detailForm.department_owner || null,
        status: detailForm.status,
        review_approval_status: detailForm.review_approval_status,
        current_revision: currentRevision,
        issue_date: detailForm.issue_date || null,
        review_cycle_years: detailForm.review_cycle_years,
        originator_name: detailForm.originator_name.trim() || null,
        originator_email: detailForm.originator_email.trim() || null,
        reviewed_by: detailForm.reviewed_by.trim() || null,
        reviewed_at: detailForm.reviewed_at || null,
        approved_by: detailForm.approved_by.trim() || null,
        rejected_by: detailForm.rejected_by.trim() || null,
        approved_at: detailForm.approved_at || null,
        notification_emails: deriveStoredNotificationEmails(detailForm),
        comments: detailForm.comments.trim() || null,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
        uploaded_at: uploadTimestamp,
      };

      if (supportsReviewerEmail) {
        fileUpdatePayload.reviewer_email = detailForm.reviewer_email.trim() || null;
      }
      if (supportsApproverEmail) {
        fileUpdatePayload.approver_email = detailForm.approver_email.trim() || null;
      }

      const { error: updateError } = await supabase
        .from("documents")
        .update(fileUpdatePayload)
        .eq("id", selectedDocument.id);

      if (updateError) {
        setMessage(`Document file update failed: ${updateError.message}`);
        return;
      }

      const { error: revisionInsertError } = await supabase.from("document_revisions").insert({
        document_id: selectedDocument.id,
        revision: currentRevision,
        revision_notes: detailForm.comments.trim() || null,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
        uploaded_at: uploadTimestamp,
        issue_date: detailForm.issue_date || null,
        reviewed_by: detailForm.reviewed_by.trim() || null,
        reviewed_at: detailForm.reviewed_at || null,
        approved_by: detailForm.approved_by.trim() || null,
        approved_at: detailForm.approved_at || null,
        is_current: true,
      });

      if (revisionInsertError) {
        setMessage(`Revision history update failed: ${revisionInsertError.message}`);
        return;
      }

      if (oldPath && oldPath !== path) {
        await supabase.storage.from(STORAGE_BUCKET).remove([oldPath]);
      }

      setMessage(
        `Controlled copy uploaded for revision ${currentRevision}. Files remain view/download only in the system.`
      );
      await loadDocuments();
    } finally {
      setIsUploadingFile(false);
      event.target.value = "";
    }
  }

  async function issueNextRevision() {
    if (!selectedDocument) {
      setMessage("Select a document first.");
      return;
    }

    if (!detailForm.comments.trim()) {
      setMessage("Enter comments / revision notes before issuing the next revision.");
      return;
    }

    const nextRevision = getNextRevision(selectedDocument.current_revision || "A");

    const { error } = await supabase
      .from("documents")
      .update({
        current_revision: nextRevision,
        status: "Draft",
        review_approval_status: "Draft",
        file_name: null,
        file_path: null,
        file_size: null,
        uploaded_at: null,
        reviewed_by: null,
        reviewed_at: null,
        approved_by: null,
        approved_at: null,
        rejected_by: null,
        rejected_at: null,
        rejection_reason: null,
      })
      .eq("id", selectedDocument.id);

    if (error) {
      setMessage(`Revision update failed: ${error.message}`);
      return;
    }

    await supabase
      .from("document_revisions")
      .update({ is_current: false })
      .eq("document_id", selectedDocument.id);

    setMessage(`Document moved to revision ${nextRevision}. Upload the new controlled copy next.`);
    await loadDocuments();
  }

  async function removeControlledFile() {
    if (!selectedDocument) {
      setMessage("Select a document first.");
      return;
    }

    if (selectedDocument.file_path) {
      await supabase.storage.from(STORAGE_BUCKET).remove([selectedDocument.file_path]);
    }

    const { error } = await supabase
      .from("documents")
      .update({
        file_name: null,
        file_path: null,
        file_size: null,
        uploaded_at: null,
      })
      .eq("id", selectedDocument.id);

    if (error) {
      setMessage(`Remove file failed: ${error.message}`);
      return;
    }

    await supabase
      .from("document_revisions")
      .update({ is_current: false })
      .eq("document_id", selectedDocument.id)
      .eq("revision", selectedDocument.current_revision || "A");

    setMessage("Controlled file removed.");
    await loadDocuments();
  }

  async function supersedeAndCreateNew() {
    if (!selectedDocument) {
      setMessage("Select a document first.");
      return;
    }

    const confirmed = window.confirm(
      `Supersede ${selectedDocument.document_number} and create a new replacement document?`
    );
    if (!confirmed) return;

    const supersedeComment = [
      selectedDocument.comments?.trim() || "",
      `Superseded for replacement on ${new Date().toLocaleDateString("en-GB")}.`,
    ]
      .filter(Boolean)
      .join("\n");

    const { error } = await supabase
      .from("documents")
      .update({
        status: "Superseded",
        comments: supersedeComment,
      })
      .eq("id", selectedDocument.id);

    if (error) {
      setMessage(`Supersede failed: ${error.message}`);
      return;
    }

    await notifyDocumentEvent(
      "superseded",
      detailForm,
      selectedDocument.document_number,
      detailForm.title.trim(),
      supersedeComment
    );

      const replacementForm: DocumentForm = {
        ...buildDocumentFormFromRow(selectedDocument),
        document_number: "",
        department_owner: selectedDocument.document_scope === "Asset" ? "Assets" : "",
        status: "Draft",
        review_approval_status: "Draft",
        current_revision: "A",
        issue_date: "",
        originator_name: "",
        originator_email: "",
        reviewed_by: "",
        reviewer_email: "",
      reviewed_at: "",
      approved_by: "",
      approver_email: "",
      approved_at: "",
      rejected_by: "",
      rejected_at: "",
      rejection_reason: "",
      comments: `Supersedes ${selectedDocument.document_number}`,
    };

    setForm(replacementForm);
    setFormPeopleSearch({
      originator_name: replacementForm.originator_name,
      reviewed_by: replacementForm.reviewed_by,
      approved_by: replacementForm.approved_by,
      rejected_by: replacementForm.rejected_by,
    });

    setShowCreatePanel(true);
    setShowDetailPanel(false);
    setMessage(
      `Old document superseded. Complete the Add Document form to create the replacement for ${selectedDocument.document_number}.`
    );

    await loadDocuments();
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("");
    setTypeFilter("");
    setOwnerFilter("");
    setReviewFilter("");
    setApprovalFilter("");
  }

  function handleSelectDocument(id: string) {
    setSelectedDocumentId(id);
    setShowDetailPanel(true);
  }

  return (
    <main>
      <QualityPageHero
        label="DOCUMENT CONTROL"
        title="Documents"
        description="Manage controlled documents, review status, approvals, and upcoming review activity from one operational register."
        contextCards={[
          { label: "Last Refreshed", value: lastRefreshed || "-" },
          { label: "Latest Document", value: latestDocumentLabel },
        ]}
      />

      <div style={topMetaRowStyle}>
        <Link href="/" style={backLinkStyle}>
          ← Back to Dashboard
        </Link>

        <div style={statusBannerStyle}>
          <strong>Status:</strong> {message}
        </div>
      </div>

      <section style={statsGridStyle}>
        <QualityKpiCard title="Total Documents" value={totalDocuments} accent="#0f766e" />
        <QualityKpiCard title="Live Documents" value={liveDocuments} accent="#16a34a" />
        <QualityKpiCard title="Approved (Approval Status)" value={approvedDocuments} accent="#2563eb" />
        <QualityKpiCard title="Review Overdue" value={overdueReviews} accent="#dc2626" />
      </section>

      <section style={createPanelSectionStyle}>
        <div style={createPanelToggleRowStyle}>
          <button
            type="button"
            style={showCreatePanel ? secondaryButtonStyle : primaryButtonStyle}
            onClick={() => setShowCreatePanel((prev) => !prev)}
          >
            {showCreatePanel ? "Hide Create Form" : "Create Document"}
          </button>
        </div>

        {showCreatePanel ? (
          <SectionCard
            title="Add Document"
            subtitle="Department owner + document type will build the next document number automatically."
          >
            <form onSubmit={addDocument}>
            <div style={formLayoutStyle}>
              <FormSection title="A. Document Details">
                <Field label="Asset Specific Document?">
                  <label style={{ display: "flex", gap: "10px", alignItems: "center", fontWeight: 700 }}>
                    <input
                      type="checkbox"
                      checked={form.document_scope === "Asset"}
                      onChange={(e) => applyCreateDocumentScope(e.target.checked ? "Asset" : "Company/System")}
                    />
                    <span>{form.document_scope === "Asset" ? "Yes - asset-specific" : "No - company/system"}</span>
                  </label>
                </Field>

                {form.document_scope === "Asset" ? (
                  <>
                    <Field label="Asset">
                      <select value={form.asset_id} onChange={(e) => applyCreateAsset(e.target.value)} style={inputStyle}>
                        <option value="">Select asset</option>
                        {assets.map((asset) => {
                          const code = (asset.document_id_code || "").trim();
                          const labelParts = [
                            asset.name || "Unnamed asset",
                            asset.asset_code ? `Code: ${asset.asset_code}` : "",
                            code ? `Document ID Code: ${code}` : "Document ID Code missing",
                          ].filter(Boolean);

                          return (
                            <option key={asset.id} value={asset.id}>
                              {labelParts.join(" | ")}
                            </option>
                          );
                        })}
                      </select>
                    </Field>

                    <Field label="Asset Document ID Code">
                      <input
                        value={form.asset_document_id_code || ""}
                        readOnly
                        style={form.asset_document_id_code ? readOnlyInputStyle : disabledInputStyle}
                        placeholder="Select an asset with a Document ID Code"
                      />
                    </Field>

                    <div style={formSectionHintStyle}>
                      Asset-specific numbering uses [Document ID Code]-AST-[Document Type]-[###].
                      {selectedCreateAssetCodeIsDuplicate
                        ? " Warning: more than one asset currently shares this Document ID Code."
                        : ""}
                    </div>
                  </>
                ) : null}

                <Field label="Document Number">
                  <input value={form.document_number} readOnly style={readOnlyInputStyle} />
                </Field>

                <Field label="Title">
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    style={inputStyle}
                    placeholder="Document title"
                  />
                </Field>

                <Field label="Document Type">
                  <select
                    value={form.document_type}
                    onChange={(e) =>
                      setForm({ ...form, document_type: e.target.value as DocumentTypeOption | "" })
                    }
                    style={inputStyle}
                  >
                    <option value="">Select type</option>
                    {DOCUMENT_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Department">
                  <select
                    value={form.department_owner}
                    onChange={(e) =>
                      setForm({ ...form, department_owner: e.target.value as DepartmentOwnerOption | "" })
                    }
                    style={form.document_scope === "Asset" ? disabledInputStyle : inputStyle}
                    disabled={form.document_scope === "Asset"}
                  >
                    <option value="">Select department</option>
                    {DEPARTMENT_OWNER_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Status">
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as DocumentStatus })}
                    style={inputStyle}
                  >
                    <option value="Draft">Draft</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Approved">Approved</option>
                    <option value="Live">Live</option>
                    <option value="Superseded">Superseded</option>
                    <option value="Obsolete">Obsolete</option>
                    <option value="Archived">Archived</option>
                  </select>
                </Field>

                <Field label="Current Revision">
                  <input
                    value={form.current_revision}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        current_revision: e.target.value.toUpperCase().slice(0, 1),
                      })
                    }
                    style={inputStyle}
                    placeholder="A"
                  />
                </Field>
              </FormSection>

              <FormSection title="B. Review Control">
                <Field label="Review Cycle">
                  <select
                    value={form.review_cycle_years}
                    onChange={(e) =>
                      setForm({ ...form, review_cycle_years: Number(e.target.value) as 1 | 2 | 3 })
                    }
                    style={inputStyle}
                  >
                    <option value={1}>1 year</option>
                    <option value={2}>2 years</option>
                    <option value={3}>3 years</option>
                  </select>
                </Field>

                <Field label="Issue Date">
                  <input
                    type="date"
                    value={form.issue_date}
                    onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Next Review Date">
                  <input
                    value={nextReviewDatePreview ? formatDate(nextReviewDatePreview) : "-"}
                    readOnly
                    style={readOnlyInputStyle}
                  />
                </Field>

                <Field label="Review / Approval Status">
                  <select
                    value={form.review_approval_status}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        review_approval_status: e.target.value as ReviewApprovalStatus,
                      })
                    }
                    style={inputStyle}
                  >
                    <option value="Draft">Draft</option>
                    <option value="Pending Review">Pending Review</option>
                    <option value="Reviewed">Reviewed</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </Field>

                <Field label="Reviewed Date">
                  <input
                    type="date"
                    value={form.reviewed_at}
                    onChange={(e) => setForm({ ...form, reviewed_at: e.target.value })}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Approved Date">
                  <input
                    type="date"
                    value={form.approved_at}
                    onChange={(e) => setForm({ ...form, approved_at: e.target.value })}
                    style={inputStyle}
                  />
                </Field>
              </FormSection>

              <FormSection title="C. People">
                <Field label="Originator">
                  <PeopleSelector
                    inputId="document-originator"
                    value={formPeopleSearch.originator_name}
                    selectedName={form.originator_name}
                    people={people}
                    placeholder="Start typing a name"
                    onChange={(value) => createPersonSearchHandler("create", "originator_name", value)}
                    onSelect={(person) => setCreatePersonField("originator_name", person)}
                    onBlur={() => handlePersonSearchBlur("create", "originator_name")}
                    resolvedEmail={form.originator_email}
                    warning={
                      formPeopleSearch.originator_name.trim() && !formOriginatorPerson
                        ? "Originator must be selected from People."
                        : formOriginatorPerson && !form.originator_email.trim()
                        ? "Originator has no email in People."
                        : ""
                    }
                  />
                </Field>

                <Field label="Reviewer">
                  <PeopleSelector
                    inputId="document-reviewed-by"
                    value={formPeopleSearch.reviewed_by}
                    selectedName={form.reviewed_by}
                    people={people}
                    placeholder="Start typing a name"
                    onChange={(value) => createPersonSearchHandler("create", "reviewed_by", value)}
                    onSelect={(person) => setCreatePersonField("reviewed_by", person)}
                    onBlur={() => handlePersonSearchBlur("create", "reviewed_by")}
                    resolvedEmail={form.reviewer_email}
                    warning={
                      formPeopleSearch.reviewed_by.trim() && !formReviewerPerson
                        ? "Reviewer must be selected from People."
                        : formReviewerPerson && !form.reviewer_email.trim()
                        ? "Reviewer has no email in People."
                        : ""
                    }
                  />
                </Field>

                <Field label="Approver">
                  <PeopleSelector
                    inputId="document-approved-by"
                    value={formPeopleSearch.approved_by}
                    selectedName={form.approved_by}
                    people={people}
                    placeholder="Start typing a name"
                    onChange={(value) => createPersonSearchHandler("create", "approved_by", value)}
                    onSelect={(person) => setCreatePersonField("approved_by", person)}
                    onBlur={() => handlePersonSearchBlur("create", "approved_by")}
                    resolvedEmail={form.approver_email}
                    disabled={Boolean(form.rejected_by.trim())}
                    warning={
                      formPeopleSearch.approved_by.trim() && !formApproverPerson
                        ? "Approver must be selected from People."
                        : formApproverPerson && !form.approver_email.trim()
                        ? "Approver has no email in People."
                        : ""
                    }
                  />
                </Field>

                <Field label="Rejected By">
                  <PeopleSelector
                    inputId="document-rejected-by"
                    value={formPeopleSearch.rejected_by}
                    selectedName={form.rejected_by}
                    people={people}
                    placeholder="Start typing a name"
                    onChange={(value) => createPersonSearchHandler("create", "rejected_by", value)}
                    onSelect={(person) => setCreatePersonField("rejected_by", person)}
                    onBlur={() => handlePersonSearchBlur("create", "rejected_by")}
                    resolvedEmail={form.rejected_by.trim() ? form.approver_email : ""}
                    disabled={Boolean(form.approved_by.trim())}
                    warning={
                      formPeopleSearch.rejected_by.trim() && !formRejectorPerson
                        ? "Rejected By must be selected from People."
                        : formRejectorPerson && !form.approver_email.trim()
                        ? "Rejected By has no email in People."
                        : ""
                    }
                  />
                </Field>
              </FormSection>

              <FormSection title="D. File / Revision Notes">
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={formSectionHintStyle}>
                    Upload the controlled document after the record is created.
                  </div>
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <Field label="Description">
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      style={compactTextareaStyle}
                      placeholder="Short scope / description"
                    />
                  </Field>
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <Field label="Comments / Revision Notes">
                    <textarea
                      value={form.comments}
                      onChange={(e) => setForm({ ...form, comments: e.target.value })}
                      style={compactTextareaStyle}
                      placeholder="Optional notes for review or revision context"
                    />
                  </Field>
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <Field label="Rejection Reason">
                    <textarea
                      value={form.rejection_reason}
                      onChange={(e) => setForm({ ...form, rejection_reason: e.target.value })}
                      style={compactTextareaStyle}
                      placeholder="Only needed if this draft is being set up in a rejected state"
                    />
                  </Field>
                </div>
              </FormSection>
            </div>

            <div style={buttonRowStyle}>
              <button type="submit" style={primaryButtonStyle} disabled={isSaving}>
                {isSaving ? "Saving..." : "Add Document"}
              </button>
              <span style={helperTextStyle}>
                Next sequence: {String(nextSequence).padStart(3, "0")}
              </span>
            </div>
            </form>
          </SectionCard>
        ) : null}
      </section>

      <section>
        <SectionCard
          title="Document Register"
          subtitle="Full-width register. Click a row to open the detail panel below."
        >
          <div style={toolbarStyle}>
            <input
              placeholder="Search document no., title, owner or type"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={toolbarSearchStyle}
            />

            <div style={toolbarFiltersStyle}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={toolbarSelectStyle}
              >
                <option value="">All Status</option>
                <option value="Draft">Draft</option>
                <option value="Under Review">Under Review</option>
                <option value="Approved">Approved</option>
                <option value="Live">Live</option>
                <option value="Superseded">Superseded</option>
                <option value="Obsolete">Obsolete</option>
                <option value="Archived">Archived</option>
              </select>

              <select
                value={approvalFilter}
                onChange={(e) => setApprovalFilter(e.target.value)}
                style={toolbarSelectStyle}
              >
                <option value="">All Approval Status</option>
                <option value="Draft">Draft</option>
                <option value="Pending Review">Pending Review</option>
                <option value="Reviewed">Reviewed</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                style={toolbarSelectStyle}
              >
                <option value="">All Types</option>
                {uniqueTypes.map((type) => (
                  <option key={String(type)} value={String(type)}>
                    {String(type)}
                  </option>
                ))}
              </select>

              <select
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                style={toolbarSelectStyle}
              >
                <option value="">All Owners</option>
                {uniqueOwners.map((owner) => (
                  <option key={String(owner)} value={String(owner)}>
                    {String(owner)}
                  </option>
                ))}
              </select>

              <select
                value={reviewFilter}
                onChange={(e) => setReviewFilter(e.target.value)}
                style={toolbarSelectStyle}
              >
                <option value="">All Review States</option>
                <option value="Overdue">Overdue</option>
                <option value="Due soon">Due soon</option>
                <option value="In date">In date</option>
                <option value="Not set">Not set</option>
              </select>

              <button type="button" onClick={clearFilters} style={secondaryButtonStyle}>
                Clear Filters
              </button>
            </div>
          </div>

          <div style={tableInfoRowStyle}>
            Showing <strong>{filteredDocuments.length}</strong> of <strong>{documents.length}</strong>{" "}
            documents
          </div>

          <div style={registerTableWrapStyle}>
            <div style={registerHeadStyle}>
              <div>Document No.</div>
              <div>Title</div>
              <div>Scope</div>
              <div>Type</div>
              <div>Owner</div>
              <div>Revision</div>
              <div>Approval</div>
              <div>Status</div>
              <div>Next Review</div>
            </div>

            <div style={registerBodyStyle}>
              {filteredDocuments.length === 0 ? (
                <div style={emptyRegisterStyle}>No documents match the current filters.</div>
              ) : (
                filteredDocuments.map((doc) => {
                  const reviewTone = getReviewTone(doc.next_review_date);
                  const approvalText = normalizeApprovalStatus(doc.review_approval_status);
                  const approvalTone = getReviewApprovalTone(approvalText);

                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => handleSelectDocument(doc.id)}
                      style={{
                        ...registerRowStyle,
                        background: selectedDocumentId === doc.id ? "#eff6ff" : "#ffffff",
                        borderLeft:
                          selectedDocumentId === doc.id ? "4px solid #0f766e" : "4px solid transparent",
                      }}
                    >
                      <div style={registerPrimaryStyle}>{doc.document_number}</div>
                      <div style={registerCellTextStyle}>{doc.title || "-"}</div>
                      <div style={registerCellTextStyle}>
                        <div>{getDocumentScopeLabel(doc)}</div>
                        {doc.document_scope === "Asset" ? (
                          <div style={{ color: "#64748b", fontSize: "12px", marginTop: "4px" }}>
                            {getDocumentAssetContext(doc)}
                          </div>
                        ) : null}
                      </div>
                      <div style={registerCellTextStyle}>{doc.document_type || "-"}</div>
                      <div style={registerCellTextStyle}>{doc.department_owner || "-"}</div>
                      <div style={registerCellTextStyle}>{doc.current_revision || "-"}</div>
                      <div>
                        <span
                          style={{
                            ...reviewBadgeStyle,
                            background: approvalTone.bg,
                            color: approvalTone.color,
                          }}
                        >
                          {approvalText}
                        </span>
                      </div>
                      <div>
                        <StatusBadge value={doc.status || "Unknown"} />
                      </div>
                      <div>
                        <div style={registerCellTextStyle}>{formatDate(doc.next_review_date)}</div>
                        <span
                          style={{
                            ...reviewBadgeStyle,
                            background: reviewTone.bg,
                            color: reviewTone.color,
                            marginTop: "6px",
                          }}
                        >
                          {reviewTone.label}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </SectionCard>
      </section>

      {showDetailPanel && selectedDocument ? (
        <section style={{ marginTop: "20px" }}>
          <SectionCard
            title="Document Detail"
            subtitle="Workflow-controlled record with view/download-only controlled files."
          >
            <div style={detailWorkspaceStyle}>
              <div style={detailTopBarStyle}>
                <div>
                  <div style={detailEyebrowStyle}>Document Detail</div>
                  <h3 style={detailTitleStyle}>{selectedDocument.document_number}</h3>
                </div>

                <div style={detailTopActionsStyle}>
                  <span
                    style={{
                      ...badgeStyle,
                      background: getStatusTone(selectedDocument.status || "Unknown").bg,
                      color: getStatusTone(selectedDocument.status || "Unknown").color,
                    }}
                  >
                    {selectedDocument.status || "Unknown"}
                  </span>

                  <button
                    type="button"
                    style={secondaryButtonStyle}
                    onClick={() => setShowDetailPanel(false)}
                  >
                    Hide Panel
                  </button>
                </div>
              </div>

              <div style={workflowButtonRowStyle}>
                <button type="button" style={workflowButtonStyle} onClick={submitForReview}>
                  Submit for Review
                </button>
                <button type="button" style={workflowButtonStyle} onClick={markReviewed}>
                  Mark Reviewed
                </button>
                <button type="button" style={approveButtonStyle} onClick={approveDocument}>
                  Approve
                </button>
                <button type="button" style={rejectButtonStyle} onClick={rejectDocument}>
                  Reject
                </button>
                <button type="button" style={secondaryButtonStyle} onClick={supersedeAndCreateNew}>
                  Supersede & Create New
                </button>
              </div>

              <div style={{ ...fileStripStyle, display: "none" }}>
                <div style={fileMetaWrapStyle}>
                  <div style={fileMetaTitleStyle}>Current controlled file</div>
                  <div style={fileMetaFileStyle}>
                    {selectedDocument.file_name || "No file uploaded for current revision"}
                  </div>
                  <div style={fileMetaSubStyle}>
                    Revision {selectedDocument.current_revision || "-"} •{" "}
                    {selectedDocument.file_name
                      ? `${formatFileSize(selectedDocument.file_size)} • Uploaded ${formatDateTime(
                          selectedDocument.uploaded_at
                        )} • View / download only`
                      : "Upload the current controlled copy here. Files are view / download only in the system."}
                  </div>
                </div>

                <div style={fileButtonsWrapStyle}>
                  <label style={uploadButtonStyle}>
                    {isUploadingFile ? "Uploading..." : "Upload controlled copy"}
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                      onChange={handleControlledFileUpload}
                      style={{ display: "none" }}
                      disabled={isUploadingFile}
                    />
                  </label>

                  {selectedDocument.file_path ? (
                    <button
                      type="button"
                      style={reportLinkButtonStyle}
                      onClick={() => void openDocumentFile(selectedDocument.file_path || "")}
                    >
                      Open / Download
                    </button>
                  ) : null}

                  <button type="button" style={secondaryButtonStyle} onClick={issueNextRevision}>
                    Up-rev to {getNextRevision(selectedDocument.current_revision || "A")}
                  </button>

                  {selectedDocument.file_name ? (
                    <button type="button" style={secondaryButtonStyle} onClick={removeControlledFile}>
                      Remove file
                    </button>
                  ) : null}
                </div>
              </div>

              <div style={detailSectionStyle}>
                <ModuleSectionHeader title="Document Control Record" />
                <div style={detailContentGridStyle}>
                  <div style={formLayoutStyle}>
                    <FormSection title="A. Document Details">
                    <Field label="Document Scope">
                      <input value={detailForm.document_scope} readOnly style={readOnlyInputStyle} />
                    </Field>

                    {detailForm.document_scope === "Asset" ? (
                      <>
                        <Field label="Linked Asset">
                          <input
                            value={getDocumentAssetContext({
                              asset_name: detailForm.asset_name,
                              asset_code: detailForm.asset_code,
                              asset_document_id_code: detailForm.asset_document_id_code,
                            })}
                            readOnly
                            style={readOnlyInputStyle}
                          />
                        </Field>

                        <Field label="Asset Document ID Code">
                          <input value={detailForm.asset_document_id_code || "-"} readOnly style={readOnlyInputStyle} />
                        </Field>
                      </>
                    ) : null}

                    <Field label="Document Number">
                      <input value={detailForm.document_number} readOnly style={readOnlyInputStyle} />
                    </Field>

                    <Field label="Title">
                      <input
                        value={detailForm.title}
                        onChange={(e) => setDetailForm({ ...detailForm, title: e.target.value })}
                        style={inputStyle}
                      />
                    </Field>

                    <Field label="Document Type">
                      <select
                        value={detailForm.document_type}
                        onChange={(e) =>
                          setDetailForm({
                            ...detailForm,
                            document_type: e.target.value as DocumentTypeOption | "",
                          })
                        }
                        style={inputStyle}
                      >
                        <option value="">Select type</option>
                        {DOCUMENT_TYPE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Department">
                      <select
                        value={detailForm.department_owner}
                        onChange={(e) =>
                          setDetailForm({
                            ...detailForm,
                            department_owner: e.target.value as DepartmentOwnerOption | "",
                          })
                        }
                        style={detailForm.document_scope === "Asset" ? disabledInputStyle : inputStyle}
                        disabled={detailForm.document_scope === "Asset"}
                      >
                        <option value="">Select department</option>
                        {DEPARTMENT_OWNER_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Status">
                      <select
                        value={detailForm.status}
                        onChange={(e) => setDetailForm({ ...detailForm, status: e.target.value as DocumentStatus })}
                        style={inputStyle}
                      >
                        <option value="Draft">Draft</option>
                        <option value="Under Review">Under Review</option>
                        <option value="Approved">Approved</option>
                        <option value="Live">Live</option>
                        <option value="Superseded">Superseded</option>
                        <option value="Obsolete">Obsolete</option>
                        <option value="Archived">Archived</option>
                      </select>
                    </Field>

                    <Field label="Current Revision">
                      <input
                        value={detailForm.current_revision}
                        onChange={(e) =>
                          setDetailForm({
                            ...detailForm,
                            current_revision: e.target.value.toUpperCase().slice(0, 1),
                          })
                        }
                        style={inputStyle}
                      />
                    </Field>
                    </FormSection>

                    <FormSection title="B. Review Control">
                    <Field label="Review Cycle">
                      <select
                        value={detailForm.review_cycle_years}
                        onChange={(e) =>
                          setDetailForm({
                            ...detailForm,
                            review_cycle_years: Number(e.target.value) as 1 | 2 | 3,
                          })
                        }
                        style={inputStyle}
                      >
                        <option value={1}>1 year</option>
                        <option value={2}>2 years</option>
                        <option value={3}>3 years</option>
                      </select>
                    </Field>

                    <Field label="Issue Date">
                      <input
                        type="date"
                        value={detailForm.issue_date}
                        onChange={(e) => setDetailForm({ ...detailForm, issue_date: e.target.value })}
                        style={inputStyle}
                      />
                    </Field>

                    <Field label="Next Review Date">
                      <input
                        value={
                          detailReviewDatePreview
                            ? formatDate(detailReviewDatePreview)
                            : selectedDocument.next_review_date
                            ? formatDate(selectedDocument.next_review_date)
                            : "-"
                        }
                        readOnly
                        style={readOnlyInputStyle}
                      />
                    </Field>

                    <Field label="Review / Approval Status">
                      <select
                        value={detailForm.review_approval_status}
                        onChange={(e) =>
                          setDetailForm({
                            ...detailForm,
                            review_approval_status: e.target.value as ReviewApprovalStatus,
                          })
                        }
                        style={inputStyle}
                      >
                        <option value="Draft">Draft</option>
                        <option value="Pending Review">Pending Review</option>
                        <option value="Reviewed">Reviewed</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </Field>

                    <Field label="Reviewed Date">
                      <input
                        type="date"
                        value={detailForm.reviewed_at}
                        onChange={(e) => setDetailForm({ ...detailForm, reviewed_at: e.target.value })}
                        style={inputStyle}
                      />
                    </Field>

                    <Field label="Approved Date">
                      <input
                        type="date"
                        value={detailForm.approved_at}
                        onChange={(e) => setDetailForm({ ...detailForm, approved_at: e.target.value })}
                        style={inputStyle}
                      />
                    </Field>
                    </FormSection>

                    <FormSection title="C. People">
                      <Field label="Originator">
                      <PeopleSelector
                        inputId="document-detail-originator"
                        value={detailPeopleSearch.originator_name}
                        selectedName={detailForm.originator_name}
                        people={people}
                        placeholder="Start typing a name"
                        onChange={(value) => createPersonSearchHandler("detail", "originator_name", value)}
                        onSelect={(person) => setDetailPersonField("originator_name", person)}
                        onBlur={() => handlePersonSearchBlur("detail", "originator_name")}
                        resolvedEmail={detailForm.originator_email}
                        warning={
                          detailPeopleSearch.originator_name.trim() && !detailOriginatorPerson
                            ? "Originator must be selected from People."
                            : detailOriginatorPerson && !detailForm.originator_email.trim()
                            ? "Originator has no email in People."
                            : ""
                        }
                      />
                      </Field>

                      <Field label="Reviewer">
                      <PeopleSelector
                        inputId="document-detail-reviewed-by"
                        value={detailPeopleSearch.reviewed_by}
                        selectedName={detailForm.reviewed_by}
                        people={people}
                        placeholder="Start typing a name"
                        onChange={(value) => createPersonSearchHandler("detail", "reviewed_by", value)}
                        onSelect={(person) => setDetailPersonField("reviewed_by", person)}
                        onBlur={() => handlePersonSearchBlur("detail", "reviewed_by")}
                        resolvedEmail={detailForm.reviewer_email}
                        warning={
                          detailPeopleSearch.reviewed_by.trim() && !detailReviewerPerson
                            ? "Reviewer must be selected from People."
                            : detailReviewerPerson && !detailForm.reviewer_email.trim()
                            ? "Reviewer has no email in People."
                            : ""
                        }
                      />
                      </Field>

                      <Field label="Approver">
                      <PeopleSelector
                        inputId="document-detail-approved-by"
                        value={detailPeopleSearch.approved_by}
                        selectedName={detailForm.approved_by}
                        people={people}
                        placeholder="Start typing a name"
                        onChange={(value) => createPersonSearchHandler("detail", "approved_by", value)}
                        onSelect={(person) => setDetailPersonField("approved_by", person)}
                        onBlur={() => handlePersonSearchBlur("detail", "approved_by")}
                        resolvedEmail={detailForm.approver_email}
                        disabled={Boolean(detailForm.rejected_by.trim())}
                        warning={
                          detailPeopleSearch.approved_by.trim() && !detailApproverPerson
                            ? "Approver must be selected from People."
                            : detailApproverPerson && !detailForm.approver_email.trim()
                            ? "Approver has no email in People."
                            : ""
                        }
                      />
                      </Field>

                      <Field label="Rejected By">
                        <PeopleSelector
                          inputId="document-detail-rejected-by"
                          value={detailPeopleSearch.rejected_by}
                          selectedName={detailForm.rejected_by}
                          people={people}
                          placeholder="Start typing a name"
                        onChange={(value) => createPersonSearchHandler("detail", "rejected_by", value)}
                        onSelect={(person) => setDetailPersonField("rejected_by", person)}
                        onBlur={() => handlePersonSearchBlur("detail", "rejected_by")}
                        resolvedEmail={detailForm.rejected_by.trim() ? detailForm.approver_email : ""}
                        disabled={Boolean(detailForm.approved_by.trim())}
                        warning={
                            detailPeopleSearch.rejected_by.trim() && !detailRejectorPerson
                              ? "Rejected By must be selected from People."
                              : detailRejectorPerson && !detailForm.approver_email.trim()
                              ? "Rejected By has no email in People."
                              : ""
                          }
                        />
                      </Field>
                    </FormSection>

                    <FormSection title="D. File / Revision Notes">
                      <div style={{ gridColumn: "1 / -1" }}>
                        <Field label="Description">
                          <textarea
                            value={detailForm.description}
                            onChange={(e) => setDetailForm({ ...detailForm, description: e.target.value })}
                            style={textareaStyle}
                          />
                        </Field>
                      </div>

                      <div style={{ gridColumn: "1 / -1" }}>
                        <Field label="Comments / Revision Notes">
                          <textarea
                            value={detailForm.comments}
                            onChange={(e) => setDetailForm({ ...detailForm, comments: e.target.value })}
                            style={textareaStyle}
                          />
                        </Field>
                      </div>

                      <div style={{ gridColumn: "1 / -1" }}>
                        <Field label="Rejection Reason">
                          <textarea
                            value={detailForm.rejection_reason}
                            onChange={(e) => setDetailForm({ ...detailForm, rejection_reason: e.target.value })}
                            style={textareaStyle}
                            placeholder="Required when rejecting"
                          />
                        </Field>
                      </div>
                    </FormSection>
                  </div>

                  <div style={detailSidebarStyle}>
                    <div style={fileStripStyle}>
                      <div style={fileMetaWrapStyle}>
                        <div style={fileMetaTitleStyle}>Current controlled file</div>
                        <div style={fileMetaFileStyle}>
                          {selectedDocument.file_name || "No file uploaded for current revision"}
                        </div>
                        <div style={fileMetaSubStyle}>
                          Revision {selectedDocument.current_revision || "-"} •{" "}
                          {selectedDocument.file_name
                            ? `${formatFileSize(selectedDocument.file_size)} • Uploaded ${formatDateTime(
                                selectedDocument.uploaded_at
                              )} • View / download only`
                            : "Upload the current controlled copy here. Files are view / download only in the system."}
                        </div>
                      </div>

                      <div style={fileButtonsWrapStyle}>
                        <label style={uploadButtonStyle}>
                          {isUploadingFile ? "Uploading..." : "Upload controlled copy"}
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                            onChange={handleControlledFileUpload}
                            style={{ display: "none" }}
                            disabled={isUploadingFile}
                          />
                        </label>

                        {selectedDocument.file_path ? (
                          <button
                            type="button"
                            style={reportLinkButtonStyle}
                            onClick={() => void openDocumentFile(selectedDocument.file_path || "")}
                          >
                            Open / Download
                          </button>
                        ) : null}

                        <button type="button" style={secondaryButtonStyle} onClick={issueNextRevision}>
                          Up-rev to {getNextRevision(selectedDocument.current_revision || "A")}
                        </button>

                        {selectedDocument.file_name ? (
                          <button type="button" style={secondaryButtonStyle} onClick={removeControlledFile}>
                            Remove file
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={buttonRowStyle}>
                  <button
                    type="button"
                    style={primaryButtonStyle}
                    onClick={saveDocumentChanges}
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save Document Changes"}
                  </button>

                  <button type="button" style={dangerButtonStyle} onClick={deleteSelectedDocument}>
                    Delete Document
                  </button>
                </div>
              </div>

              <div style={detailSectionStyle}>
                <ModuleSectionHeader title="Revision History" />

                {selectedRevisions.length === 0 ? (
                  <div style={emptyRevisionStyle}>No revision history files uploaded yet.</div>
                ) : (
                  <div style={revisionListStyle}>
                    {selectedRevisions.map((revision) => (
                      <RevisionRow
                        key={revision.id}
                        revision={revision}
                        onOpenFile={(path) => void openDocumentFile(path)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </SectionCard>
        </section>
      ) : null}
    </main>
  );
}

function RevisionRow({
  revision,
  onOpenFile,
}: {
  revision: DocumentRevisionRow;
  onOpenFile: (path: string) => void;
}) {
  return (
    <div style={revisionCardStyle}>
      <div style={revisionTopRowStyle}>
        <div>
          <div style={revisionTitleStyle}>Revision {revision.revision}</div>
          <div style={revisionMetaStyle}>
            {revision.file_name || "No file"} • {formatFileSize(revision.file_size)} • Uploaded{" "}
            {formatDateTime(revision.uploaded_at)}
          </div>
        </div>

        <div style={revisionBadgeWrapStyle}>
          {revision.is_current ? (
            <span style={{ ...reviewBadgeStyle, background: "#dcfce7", color: "#166534" }}>
              Current
            </span>
          ) : (
            <span style={{ ...reviewBadgeStyle, background: "#e2e8f0", color: "#334155" }}>
              Historic
            </span>
          )}

          {revision.file_path ? (
            <button
              type="button"
              onClick={() => onOpenFile(revision.file_path || "")}
              style={reportLinkButtonStyle}
            >
              Open / Download
            </button>
          ) : null}
        </div>
      </div>

      <div style={revisionGridStyle}>
        <div style={revisionInfoBlockStyle}>
          <div style={revisionInfoLabelStyle}>Issue Date</div>
          <div style={revisionInfoValueStyle}>{formatDate(revision.issue_date)}</div>
        </div>
        <div style={revisionInfoBlockStyle}>
          <div style={revisionInfoLabelStyle}>Reviewed By</div>
          <div style={revisionInfoValueStyle}>{revision.reviewed_by || "-"}</div>
        </div>
        <div style={revisionInfoBlockStyle}>
          <div style={revisionInfoLabelStyle}>Reviewed Date</div>
          <div style={revisionInfoValueStyle}>{formatDate(revision.reviewed_at)}</div>
        </div>
        <div style={revisionInfoBlockStyle}>
          <div style={revisionInfoLabelStyle}>Approved By</div>
          <div style={revisionInfoValueStyle}>{revision.approved_by || "-"}</div>
        </div>
        <div style={revisionInfoBlockStyle}>
          <div style={revisionInfoLabelStyle}>Approved Date</div>
          <div style={revisionInfoValueStyle}>{formatDate(revision.approved_at)}</div>
        </div>
      </div>

      {revision.revision_notes ? (
        <div style={revisionNoteStyle}>
          <strong>Revision notes:</strong> {revision.revision_notes}
        </div>
      ) : null}
    </div>
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={fieldWrapStyle}>
      <span style={fieldLabelStyle}>{label}</span>
      {children}
    </label>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div style={formSectionStyle}>
      <div style={formSectionTitleStyle}>{title}</div>
      <div style={formSectionGridStyle}>{children}</div>
    </div>
  );
}

function PeopleSelector({
  inputId,
  value,
  selectedName,
  people,
  placeholder,
  onChange,
  onSelect,
  onBlur,
  resolvedEmail,
  warning,
  disabled,
}: {
  inputId: string;
  value: string;
  selectedName: string;
  people: PersonRow[];
  placeholder: string;
  onChange: (value: string) => void;
  onSelect: (person: PersonRow) => void;
  onBlur: () => void;
  resolvedEmail: string;
  warning?: string;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const suggestions = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) return [];
    return people
      .filter((person) => person.name.toLowerCase().includes(query))
      .slice(0, 6);
  }, [people, value]);
  const showSuggestions =
    !disabled &&
    isOpen &&
    value.trim().length > 0 &&
    normalizePersonName(value) !== normalizePersonName(selectedName) &&
    suggestions.length > 0;

  return (
    <div style={peopleSelectorWrapStyle}>
      <input
        id={inputId}
        value={value}
        onChange={(event) => {
          if (disabled) return;
          setIsOpen(true);
          onChange(event.target.value);
        }}
        onFocus={() => {
          if (disabled) return;
          setIsOpen(true);
        }}
        onBlur={() => {
          setIsOpen(false);
          onBlur();
        }}
        style={disabled ? disabledInputStyle : inputStyle}
        placeholder={placeholder}
        autoComplete="off"
        disabled={disabled}
      />
      {showSuggestions ? (
        <div style={peopleSuggestionListStyle}>
          {suggestions.map((person) => (
            <button
              key={person.id}
              type="button"
              style={{
                ...peopleSuggestionButtonStyle,
                background:
                  normalizePersonName(person.name) === normalizePersonName(selectedName)
                    ? "#f0fdfa"
                    : "#ffffff",
              }}
              onMouseDown={(event) => {
                event.preventDefault();
                setIsOpen(false);
                onSelect(person);
              }}
            >
              <span>{person.name}</span>
              <span style={peopleSuggestionMetaStyle}>
                {person.role ? `${person.role}${person.email ? " • " : ""}` : ""}
                {person.email || "No email"}
              </span>
            </button>
          ))}
        </div>
      ) : null}
      <div style={peopleSelectorHintStyle}>
        {resolvedEmail ? `Email: ${resolvedEmail}` : "Select a person from People to populate email."}
      </div>
      {warning ? <div style={peopleSelectorWarningStyle}>{warning}</div> : null}
    </div>
  );
}

function NotificationEmailList({
  items,
}: {
  items: Array<{ label: string; email: string; missing: boolean }>;
}) {
  const populatedItems = items.filter((item) => item.email || item.missing);
  return (
    <div style={notificationListStyle}>
      <div style={notificationListHeaderStyle}>Resolved recipients</div>
      {populatedItems.length ? (
        <div style={notificationListGridStyle}>
          {populatedItems.map((item) => (
            <div key={item.label} style={notificationListRowStyle}>
              <span style={notificationListRowLabelStyle}>{item.label}</span>
              <span style={item.missing ? notificationMissingTextStyle : notificationListRowValueStyle}>
                {item.email || "Email missing in People record"}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div style={notificationListEmptyStyle}>No notification emails resolved yet.</div>
      )}
    </div>
  );
}

function ControlSnapshotCard({
  items,
}: {
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <div style={snapshotMetaGridStyle}>
      {items.map((item) => (
        <div key={item.label} style={snapshotMetaItemStyle}>
          <div style={snapshotMetaLabelStyle}>{item.label}</div>
          <div style={snapshotMetaValueStyle}>{item.value || "-"}</div>
        </div>
      ))}
    </div>
  );
}

function SnapshotCard({
  label,
  value,
  tone,
  bg,
  onClick,
}: {
  label: string;
  value: number;
  tone: string;
  bg: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} style={{ ...snapshotCardButtonStyle, background: bg }}>
      <div style={{ ...miniMetricLabelStyle, color: tone }}>{label}</div>
      <div style={{ ...miniMetricValueStyle, color: tone }}>{value}</div>
    </button>
  );
}

function StatusBadge({ value }: { value: string }) {
  const tone = getStatusTone(value);

  return (
    <span
      style={{
        padding: "5px 10px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 700,
        display: "inline-block",
        background: tone.bg,
        color: tone.color,
      }}
    >
      {value}
    </span>
  );
}

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
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "16px",
  marginBottom: "20px",
};

const createPanelSectionStyle: CSSProperties = {
  marginBottom: "20px",
  display: "grid",
  gap: "12px",
};

const createPanelToggleRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-start",
  alignItems: "center",
};

const compactTopGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "12px",
  marginBottom: "14px",
  alignItems: "start",
};

const panelStyle: CSSProperties = {
  background: "white",
  borderRadius: "18px",
  padding: "18px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
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

const compactFormGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "12px",
};

const detailFormGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
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
  padding: "10px 12px",
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

const disabledInputStyle: CSSProperties = {
  ...inputStyle,
  background: "#f8fafc",
  color: "#94a3b8",
  cursor: "not-allowed",
};

const peopleSelectorWrapStyle: CSSProperties = {
  position: "relative",
  display: "grid",
  gap: "6px",
};

const peopleSuggestionListStyle: CSSProperties = {
  position: "absolute",
  top: "calc(100% + 4px)",
  left: 0,
  right: 0,
  zIndex: 20,
  background: "#ffffff",
  border: "1px solid #cbd5e1",
  borderRadius: "12px",
  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.12)",
  overflow: "hidden",
};

const peopleSuggestionButtonStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "none",
  background: "#ffffff",
  color: "#0f172a",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  cursor: "pointer",
  textAlign: "left",
  fontSize: "14px",
};

const peopleSuggestionMetaStyle: CSSProperties = {
  color: "#64748b",
  fontSize: "12px",
  whiteSpace: "nowrap",
};

const peopleSelectorHintStyle: CSSProperties = {
  fontSize: "12px",
  color: "#64748b",
};

const peopleSelectorWarningStyle: CSSProperties = {
  fontSize: "12px",
  color: "#b45309",
  fontWeight: 600,
};

const notificationListStyle: CSSProperties = {
  border: "1px solid #dbeafe",
  background: "#f8fbff",
  borderRadius: "12px",
  padding: "10px 12px",
  display: "grid",
  gap: "8px",
};

const notificationListHeaderStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  color: "#334155",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const snapshotMetaGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "10px",
};

const snapshotMetaItemStyle: CSSProperties = {
  border: "1px solid #dbe4ef",
  background: "#f8fafc",
  borderRadius: "12px",
  padding: "10px 12px",
  display: "grid",
  gap: "4px",
};

const snapshotMetaLabelStyle: CSSProperties = {
  fontSize: "11px",
  fontWeight: 800,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const snapshotMetaValueStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 700,
  color: "#0f172a",
};

const notificationListGridStyle: CSSProperties = {
  display: "grid",
  gap: "6px",
};

const notificationListRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "baseline",
};

const notificationListRowLabelStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 700,
  color: "#334155",
};

const notificationListRowValueStyle: CSSProperties = {
  fontSize: "13px",
  color: "#0f172a",
  textAlign: "right",
  overflowWrap: "anywhere",
};

const notificationMissingTextStyle: CSSProperties = {
  ...notificationListRowValueStyle,
  color: "#b45309",
  fontWeight: 600,
};

const notificationListEmptyStyle: CSSProperties = {
  fontSize: "13px",
  color: "#64748b",
};

const toolbarSearchStyle: CSSProperties = {
  ...inputStyle,
  maxWidth: "460px",
  flex: "1 1 320px",
};

const toolbarSelectStyle: CSSProperties = {
  ...inputStyle,
  minWidth: "160px",
};

const compactTextareaStyle: CSSProperties = {
  width: "100%",
  minHeight: "72px",
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  background: "white",
  color: "#0f172a",
  resize: "vertical",
  fontFamily: "Arial, Helvetica, sans-serif",
  boxSizing: "border-box",
};

const textareaStyle: CSSProperties = {
  width: "100%",
  minHeight: "92px",
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  background: "white",
  color: "#0f172a",
  resize: "vertical",
  fontFamily: "Arial, Helvetica, sans-serif",
  boxSizing: "border-box",
};

const buttonRowStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "14px",
  alignItems: "center",
};

const workflowButtonRowStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  alignItems: "center",
};

const formLayoutStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
};

const formSectionStyle: CSSProperties = {
  border: "1px solid #dbe4ef",
  borderRadius: "14px",
  padding: "14px",
  background: "#f8fafc",
  display: "grid",
  gap: "10px",
};

const formSectionTitleStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 800,
  color: "#0f766e",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
};

const formSectionGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: "10px",
};

const formSectionHintStyle: CSSProperties = {
  fontSize: "13px",
  color: "#64748b",
  background: "#ffffff",
  border: "1px dashed #cbd5e1",
  borderRadius: "10px",
  padding: "10px 12px",
};

const helperTextStyle: CSSProperties = {
  fontSize: "13px",
  color: "#64748b",
  fontWeight: 700,
};

const primaryButtonStyle: CSSProperties = {
  background: "#0f766e",
  color: "white",
  border: "none",
  padding: "10px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 700,
};

const secondaryButtonStyle: CSSProperties = {
  background: "#e2e8f0",
  color: "#0f172a",
  border: "none",
  padding: "10px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 700,
};

const workflowButtonStyle: CSSProperties = {
  background: "#dbeafe",
  color: "#1d4ed8",
  border: "none",
  padding: "10px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 700,
};

const approveButtonStyle: CSSProperties = {
  background: "#dcfce7",
  color: "#166534",
  border: "none",
  padding: "10px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 700,
};

const rejectButtonStyle: CSSProperties = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "none",
  padding: "10px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 700,
};

const dangerButtonStyle: CSSProperties = {
  background: "#dc2626",
  color: "white",
  border: "none",
  padding: "10px 16px",
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
  padding: "10px 16px",
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const reportLinkButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#dbeafe",
  color: "#1d4ed8",
  borderRadius: "10px",
  padding: "10px 16px",
  fontWeight: 700,
  textDecoration: "none",
  whiteSpace: "nowrap",
};

const reportButtonStyle: CSSProperties = {
  background: "#0f766e",
  color: "#ffffff",
  border: "none",
  padding: "10px 14px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 700,
};

const snapshotHeaderRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  marginBottom: "12px",
};

const miniSnapshotGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "10px",
};

const snapshotSupportStackStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
  marginBottom: "12px",
};

const snapshotCardButtonStyle: CSSProperties = {
  borderRadius: "12px",
  padding: "12px",
  border: "none",
  textAlign: "left",
  cursor: "pointer",
};

const miniMetricLabelStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 800,
  marginBottom: "4px",
};

const miniMetricValueStyle: CSSProperties = {
  fontSize: "24px",
  fontWeight: 800,
};

const toolbarStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "center",
  flexWrap: "wrap",
  marginBottom: "12px",
};

const toolbarFiltersStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const tableInfoRowStyle: CSSProperties = {
  marginBottom: "12px",
  color: "#475569",
  fontSize: "14px",
};

const registerTableWrapStyle: CSSProperties = {
  border: "1px solid #d7dee7",
  borderRadius: "18px",
  overflow: "hidden",
};

const registerHeadStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.2fr 1.8fr 1.2fr 0.9fr 1fr 0.7fr 1fr 0.9fr 1fr",
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

const registerBodyStyle: CSSProperties = {
  maxHeight: "980px",
  overflowY: "auto",
};

const registerRowStyle: CSSProperties = {
  width: "100%",
  textAlign: "left",
  display: "grid",
  gridTemplateColumns: "1.2fr 1.8fr 1.2fr 0.9fr 1fr 0.7fr 1fr 0.9fr 1fr",
  gap: "12px",
  padding: "14px 16px",
  border: "none",
  borderBottom: "1px solid #eef2f7",
  borderLeft: "4px solid transparent",
  cursor: "pointer",
  alignItems: "center",
};

const registerPrimaryStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 800,
  color: "#0f172a",
  lineHeight: 1.35,
  wordBreak: "break-word",
};

const registerCellTextStyle: CSSProperties = {
  fontSize: "13px",
  color: "#475569",
  lineHeight: 1.45,
  wordBreak: "break-word",
};

const emptyRegisterStyle: CSSProperties = {
  padding: "24px 16px",
  color: "#64748b",
  textAlign: "center",
};

const detailWorkspaceStyle: CSSProperties = {
  display: "grid",
  gap: "14px",
};

const detailContentGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 2.3fr) minmax(260px, 1fr)",
  gap: "14px",
  alignItems: "start",
};

const detailSidebarStyle: CSSProperties = {
  display: "grid",
  gap: "14px",
  alignContent: "start",
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

const detailEyebrowStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 800,
  color: "#64748b",
  textTransform: "uppercase",
  marginBottom: "6px",
};

const detailTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "22px",
  color: "#0f172a",
};

const fileStripStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: "16px",
  border: "1px solid #cfe8e5",
  background: "linear-gradient(180deg, #f7fffd 0%, #eefbf8 100%)",
  borderRadius: "16px",
  padding: "16px",
  alignItems: "center",
};

const fileMetaWrapStyle: CSSProperties = {
  display: "grid",
  gap: "6px",
  minWidth: 0,
};

const fileMetaTitleStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 800,
  color: "#64748b",
  textTransform: "uppercase",
};

const fileMetaFileStyle: CSSProperties = {
  fontSize: "16px",
  fontWeight: 800,
  color: "#0f172a",
  wordBreak: "break-word",
  overflowWrap: "anywhere",
};

const fileMetaSubStyle: CSSProperties = {
  fontSize: "13px",
  color: "#475569",
  lineHeight: 1.45,
};

const fileButtonsWrapStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  justifyContent: "flex-end",
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

const reviewBadgeStyle: CSSProperties = {
  padding: "5px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 700,
  display: "inline-block",
};

const badgeStyle: CSSProperties = {
  padding: "5px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 700,
  display: "inline-block",
  whiteSpace: "nowrap",
};

const revisionListStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
};

const emptyRevisionStyle: CSSProperties = {
  border: "1px dashed #cbd5e1",
  borderRadius: "12px",
  padding: "14px",
  color: "#64748b",
  background: "#f8fafc",
};

const revisionCardStyle: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  padding: "14px",
  background: "#f8fafc",
};

const revisionTopRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const revisionTitleStyle: CSSProperties = {
  fontSize: "15px",
  fontWeight: 800,
  color: "#0f172a",
};

const revisionMetaStyle: CSSProperties = {
  fontSize: "13px",
  color: "#64748b",
  marginTop: "4px",
};

const revisionBadgeWrapStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  alignItems: "center",
};

const revisionGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  gap: "10px",
  marginTop: "12px",
};

const revisionInfoBlockStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
  padding: "10px",
};

const revisionInfoLabelStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  color: "#64748b",
  marginBottom: "4px",
};

const revisionInfoValueStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 700,
  color: "#0f172a",
};

const revisionNoteStyle: CSSProperties = {
  marginTop: "12px",
  fontSize: "13px",
  color: "#475569",
  lineHeight: 1.5,
};
export default function DocumentsPage() {
  return (
    <Suspense fallback={<main style={{ padding: "24px" }}>Loading documents...</main>}>
      <DocumentsPageContent />
    </Suspense>
  );
}

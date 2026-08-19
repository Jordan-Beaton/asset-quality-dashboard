"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { ModuleSectionHeader } from "../../src/components/ModuleSectionHeader";
import { QualityKpiCard } from "../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../src/components/QualityPageHero";
import { useImsPermissions } from "../../src/components/ImsPermissions";
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

type WorkflowStatus =
  | "Draft"
  | "Pending Review"
  | "Reviewed"
  | "Pending Approval"
  | "Approved"
  | "Rejected"
  | "Superseded"
  | "Archived";

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
  workflow_status?: string | null;
  workflow_reviewer_name?: string | null;
  workflow_reviewer_email?: string | null;
  workflow_approver_name?: string | null;
  workflow_approver_email?: string | null;
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
  workflow_status: WorkflowStatus;
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

type DocumentWorkspaceView =
  | "dashboard"
  | "register"
  | "create"
  | "workflow"
  | "archive"
  | "reports";

const STORAGE_BUCKET = "document-files";
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
  workflow_status: "Draft",
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

function normalizeWorkflowStatus(
  workflowStatus: string | null | undefined,
  reviewApprovalStatus?: string | null,
  status?: string | null
): WorkflowStatus {
  const workflow = (workflowStatus || "").trim().toLowerCase();
  if (workflow === "pending approval") return "Pending Approval";
  if (workflow === "pending review") return "Pending Review";
  if (workflow === "reviewed") return "Reviewed";
  if (workflow === "approved") return "Approved";
  if (workflow === "rejected") return "Rejected";
  if (workflow === "superseded") return "Superseded";
  if (workflow === "archived") return "Archived";

  const approval = normalizeApprovalStatus(reviewApprovalStatus);
  if (approval === "Approved") return "Approved";
  if (approval === "Reviewed") return "Reviewed";
  if (approval === "Pending Review") return "Pending Review";
  if (approval === "Rejected") return "Rejected";

  const documentStatus = (status || "").trim().toLowerCase();
  if (documentStatus === "live" || documentStatus === "approved") return "Approved";
  if (documentStatus === "under review") return "Pending Review";
  if (documentStatus === "superseded") return "Superseded";
  if (documentStatus === "archived" || documentStatus === "obsolete") return "Archived";
  return "Draft";
}

function getWorkflowTone(status: WorkflowStatus) {
  if (status === "Approved") return { bg: "#ECECE7", color: "#005670" };
  if (status === "Pending Approval") return { bg: "#ECECE7", color: "#005670" };
  if (status === "Pending Review" || status === "Reviewed") return { bg: "#ECECE7", color: "#000000" };
  if (status === "Rejected") return { bg: "#ECECE7", color: "#F93822" };
  if (status === "Superseded" || status === "Archived") return { bg: "#D0D0CE", color: "#53565A" };
  return { bg: "#ECECE7", color: "#005670" };
}

function getLegacyStatusForWorkflow(status: WorkflowStatus): DocumentStatus {
  if (status === "Approved") return "Live";
  if (status === "Pending Review" || status === "Reviewed" || status === "Pending Approval") return "Under Review";
  if (status === "Superseded") return "Superseded";
  if (status === "Archived") return "Archived";
  return "Draft";
}

function getLegacyApprovalForWorkflow(status: WorkflowStatus): ReviewApprovalStatus {
  if (status === "Approved") return "Approved";
  if (status === "Pending Approval" || status === "Reviewed") return "Reviewed";
  if (status === "Pending Review") return "Pending Review";
  if (status === "Rejected") return "Rejected";
  return "Draft";
}

function getStatusTone(status: string) {
  const value = status.toLowerCase();

  if (value.includes("live")) return { bg: "#ECECE7", color: "#005670" };
  if (value.includes("approved")) return { bg: "#ECECE7", color: "#005670" };
  if (value.includes("draft")) return { bg: "#ECECE7", color: "#005670" };
  if (value.includes("review")) return { bg: "#ECECE7", color: "#000000" };
  if (value.includes("superseded")) return { bg: "#ECECE7", color: "#F93822" };
  if (value.includes("obsolete")) return { bg: "#D0D0CE", color: "#53565A" };
  if (value.includes("archived")) return { bg: "#ECECE7", color: "#53565A" };

  return { bg: "#D0D0CE", color: "#53565A" };
}

function getReviewApprovalTone(status: string) {
  const value = status.toLowerCase();

  if (value.includes("approved")) return { bg: "#ECECE7", color: "#005670" };
  if (value.includes("reviewed")) return { bg: "#ECECE7", color: "#005670" };
  if (value.includes("pending")) return { bg: "#ECECE7", color: "#000000" };
  if (value.includes("rejected")) return { bg: "#ECECE7", color: "#F93822" };
  return { bg: "#D0D0CE", color: "#53565A" };
}

function getReviewTone(nextReviewDate: string | null | undefined) {
  if (!nextReviewDate) {
    return { label: "Not set", bg: "#D0D0CE", color: "#53565A" };
  }

  const today = new Date();
  const next = new Date(nextReviewDate);

  today.setHours(0, 0, 0, 0);
  next.setHours(0, 0, 0, 0);

  const diffDays = Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: "Overdue", bg: "#ECECE7", color: "#F93822" };
  if (diffDays <= 30) return { label: "Due soon", bg: "#ECECE7", color: "#000000" };
  return { label: "In date", bg: "#ECECE7", color: "#005670" };
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
  const imsPermissions = useImsPermissions();
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
  const [currentUserEmail, setCurrentUserEmail] = useState("");
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
  const [activeDetailTab, setActiveDetailTab] = useState<"details" | "file" | "history">("details");
  const detailPanelRef = useRef<HTMLElement | null>(null);
  const shouldScrollToDetailRef = useRef(false);
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [activeView, setActiveView] = useState<DocumentWorkspaceView>(
    linkedSearch || linkedStatus || linkedType || linkedOwner || linkedReview || linkedApproval ? "register" : "dashboard"
  );
  const [showRegisterFilters, setShowRegisterFilters] = useState(
    Boolean(linkedStatus || linkedType || linkedOwner || linkedReview || linkedApproval)
  );

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

  const canCreateDocument = useMemo(() => {
    return imsPermissions.loaded && (imsPermissions.isMasterAdmin || imsPermissions.fullAccess || imsPermissions.canCreate);
  }, [imsPermissions.canCreate, imsPermissions.fullAccess, imsPermissions.isMasterAdmin, imsPermissions.loaded]);

  const canEditDocument = useMemo(() => {
    return imsPermissions.loaded && (imsPermissions.isMasterAdmin || imsPermissions.fullAccess || imsPermissions.canEdit);
  }, [imsPermissions.canEdit, imsPermissions.fullAccess, imsPermissions.isMasterAdmin, imsPermissions.loaded]);

  function requireCreatePermission(actionLabel: string) {
    if (canCreateDocument) return true;
    setMessage(`Read-only access: you do not have permission to ${actionLabel}.`);
    return false;
  }

  function requireEditPermission(actionLabel: string) {
    if (canEditDocument) return true;
    setMessage(`Read-only access: you do not have permission to ${actionLabel}.`);
    return false;
  }

  async function loadDocuments(options: { selectDocumentId?: string } = {}) {
    const [
      { data: documentsData, error: documentsError },
      { data: assetsData, error: assetsError },
      { data: peopleData, error: peopleError },
      { data: contactsData, error: contactsError },
    ] = await Promise.all([
      supabase.from("documents").select("*").order("document_number", { ascending: true }),
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

    const rows = (documentsData || []) as DocumentRow[];
    const fallbackContacts: NotificationContactRow[] = [];

    setDocuments(rows);
    setAssets(assetsError ? [] : ((assetsData as AssetOption[]) || []));
    setPeople(peopleError ? [] : ((peopleData as PersonRow[]) || []));
    setContacts(contactsError ? fallbackContacts : ((contactsData as NotificationContactRow[]) || fallbackContacts));
    setSelectedDocumentId((current) => options.selectDocumentId || current || rows[0]?.id || "");
    setLastRefreshed(new Date().toLocaleString("en-GB"));
    if (!options.selectDocumentId) {
      setMessage(`Loaded ${rows.length} document${rows.length === 1 ? "" : "s"} successfully.`);
    }
  }

  async function loadDocumentRevisions(documentId: string, options: { quiet?: boolean } = {}) {
    if (!documentId) return [];

    const { data, error } = await supabase
      .from("document_revisions")
      .select("*")
      .eq("document_id", documentId)
      .order("uploaded_at", { ascending: false });

    if (error) {
      if (!options.quiet) {
        setMessage(`Revision load failed: ${error.message}`);
      }
      return [];
    }

    const revisions = ((data as DocumentRevisionRow[]) || []);
    setRevisionsByDocumentId((current) => ({
      ...current,
      [documentId]: revisions,
    }));
    return revisions;
  }

  useEffect(() => {
    void loadDocuments();
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadCurrentUser() {
      const { data } = await supabase.auth.getUser();
      if (!isActive) return;
      setCurrentUserEmail(data.user?.email || "");
    }

    void loadCurrentUser();

    return () => {
      isActive = false;
    };
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
      const normalizedWorkflow = normalizeWorkflowStatus(doc.workflow_status, doc.review_approval_status, doc.status);

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

      const matchesStatus =
        !statusFilter ||
        (statusFilter.startsWith("__multi:")
          ? statusFilter
              .replace("__multi:", "")
              .split("|")
              .includes(doc.status || "")
          : (doc.status || "") === statusFilter);
      const matchesType = !typeFilter || (doc.document_type || "") === typeFilter;
      const matchesOwner = !ownerFilter || (doc.department_owner || "") === ownerFilter;
      const matchesApproval =
        !approvalFilter ||
        (approvalFilter === "Workflow"
          ? ["Pending Review", "Reviewed", "Pending Approval", "Rejected"].includes(normalizedWorkflow)
          : normalizedWorkflow === approvalFilter);
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
  const overdueReviewDocuments = useMemo(
    () => documents.filter((doc) => getReviewTone(doc.next_review_date).label === "Overdue"),
    [documents]
  );
  const workflowQueueDocuments = useMemo(
    () =>
      documents.filter((doc) =>
        ["Pending Review", "Reviewed", "Pending Approval", "Rejected"].includes(
          normalizeWorkflowStatus(doc.workflow_status, doc.review_approval_status, doc.status)
        )
      ),
    [documents]
  );
  const archiveDocuments = useMemo(
    () =>
      documents.filter((doc) => {
        const status = (doc.status || "").trim().toLowerCase();
        return status === "archived" || status === "superseded" || status === "obsolete";
      }),
    [documents]
  );

  const selectedDocument = useMemo(
    () => documents.find((doc) => doc.id === selectedDocumentId) || null,
    [documents, selectedDocumentId]
  );
  const selectedWorkflowStatus: WorkflowStatus = selectedDocument
    ? normalizeWorkflowStatus(
        selectedDocument.workflow_status,
        selectedDocument.review_approval_status,
        selectedDocument.status
      )
    : "Draft";

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
    const rows = revisionsByDocumentId[selectedDocumentId] || [];
    const revisionsWithFiles = new Set(
      rows
        .filter((revision) => Boolean(revision.file_path || revision.file_name))
        .map((revision) => revision.revision)
    );

    return rows.filter((revision) => {
      const isBlankPlaceholder = !revision.file_path && !revision.file_name;
      return !(isBlankPlaceholder && revisionsWithFiles.has(revision.revision));
    });
  }, [revisionsByDocumentId, selectedDocumentId]);

  const supportsReviewerEmail = useMemo(
    () => documents.some((doc) => Object.prototype.hasOwnProperty.call(doc, "reviewer_email")),
    [documents]
  );
  const supportsApproverEmail = useMemo(
    () => documents.some((doc) => Object.prototype.hasOwnProperty.call(doc, "approver_email")),
    [documents]
  );

  const currentUserPerson = useMemo(() => {
    const email = currentUserEmail.trim().toLowerCase();
    if (!email) return null;
    return people.find((person) => (person.email || "").trim().toLowerCase() === email) || null;
  }, [currentUserEmail, people]);

  function resolveWorkflowActor(fieldValue: string, label: string) {
    const selectedName = fieldValue.trim();
    if (selectedName) return selectedName;
    if (currentUserPerson?.name?.trim()) return currentUserPerson.name.trim();
    setMessage(`${label} is required. Select a person from People Management before continuing.`);
    return "";
  }

  function resolveDocumentPersonEmail(name: string) {
    const matchedPerson = findPersonByName(people, name);
    if (!matchedPerson) return "";
    return matchedPerson.email?.trim() || "";
  }

  function buildDocumentFormFromRow(row: DocumentRow): DocumentForm {
    const reviewerName = row.reviewed_by || row.workflow_reviewer_name || "";
    const approverName = row.approved_by || row.workflow_approver_name || "";
    const rejectorName = row.rejected_by || "";
    const outcomeName = approverName || rejectorName;
    const reviewerEmail =
      (typeof row.reviewer_email === "string" ? row.reviewer_email : null) ||
      row.workflow_reviewer_email ||
      resolveDocumentPersonEmail(reviewerName);
    const approverEmail =
      (typeof row.approver_email === "string" ? row.approver_email : null) ||
      row.workflow_approver_email ||
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
      workflow_status: normalizeWorkflowStatus(row.workflow_status, row.review_approval_status, row.status),
      current_revision: row.current_revision || "A",
      issue_date: row.issue_date || "",
      review_cycle_years: (row.review_cycle_years as 1 | 2 | 3) || 1,
      originator_name: row.originator_name || "",
      originator_email: originatorEmail,
      reviewed_by: reviewerName,
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

  useEffect(() => {
    if (!showDetailPanel || !selectedDocument || !shouldScrollToDetailRef.current) return;

    shouldScrollToDetailRef.current = false;
    window.requestAnimationFrame(() => {
      detailPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [showDetailPanel, selectedDocument]);

  useEffect(() => {
    if (!selectedDocumentId) return;
    void loadDocumentRevisions(selectedDocumentId, { quiet: true });
  }, [selectedDocumentId]);

  const totalDocuments = documents.length;
  const liveDocuments = documents.filter((doc) => (doc.status || "").trim().toLowerCase() === "live").length;
  const draftDocuments = documents.filter((doc) => (doc.status || "").trim().toLowerCase() === "draft").length;
  const proposedDocuments = documents.filter((doc) => {
    const status = (doc.status || "").trim().toLowerCase();
    return status === "proposed" || status === "not drafted";
  }).length;
  const archivedDocuments = documents.filter(
    (doc) => (doc.status || "").trim().toLowerCase() === "archived"
  ).length;
  const overdueReviews = documents.filter(
    (doc) => getReviewTone(doc.next_review_date).label === "Overdue"
  ).length;
  const dueSoonReviews = dueSoonDocuments.length;
  const missingReviewDate = documents.filter(
    (doc) => !doc.next_review_date && (doc.status || "").trim().toLowerCase() === "live"
  ).length;
  const due30Days = documents.filter((doc) => {
    const tone = getReviewTone(doc.next_review_date);
    if (tone.label !== "Due Soon") return false;
    const today = new Date(); today.setHours(0,0,0,0);
    const rev = new Date(doc.next_review_date!);
    const diffDays = Math.floor((rev.getTime() - today.getTime()) / 86400000);
    return diffDays >= 0 && diffDays <= 30;
  }).length;
  const due31to60Days = documents.filter((doc) => {
    const tone = getReviewTone(doc.next_review_date);
    if (tone.label !== "Due Soon") return false;
    const today = new Date(); today.setHours(0,0,0,0);
    const rev = new Date(doc.next_review_date!);
    const diffDays = Math.floor((rev.getTime() - today.getTime()) / 86400000);
    return diffDays > 30 && diffDays <= 60;
  }).length;
  const due61to90Days = documents.filter((doc) => {
    const tone = getReviewTone(doc.next_review_date);
    if (tone.label !== "Due Soon") return false;
    const today = new Date(); today.setHours(0,0,0,0);
    const rev = new Date(doc.next_review_date!);
    const diffDays = Math.floor((rev.getTime() - today.getTime()) / 86400000);
    return diffDays > 60 && diffDays <= 90;
  }).length;
  const DEPT_ORDER = ["Assets","Commercial","HSEQ","Procurement","Projects","Finance","HR","Engineering"];
  const overdueByDept: Record<string, number> = {};
  documents.forEach((doc) => {
    if (getReviewTone(doc.next_review_date).label !== "Overdue") return;
    const dept = (doc.department_owner || "Other").trim();
    overdueByDept[dept] = (overdueByDept[dept] || 0) + 1;
  });
  const overdueByDeptSorted = Object.entries(overdueByDept).sort((a, b) => {
    const ai = DEPT_ORDER.indexOf(a[0]); const bi = DEPT_ORDER.indexOf(b[0]);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return b[1] - a[1];
  });
  const maxOverdueDept = Math.max(...overdueByDeptSorted.map(([, v]) => v), 1);
  const pendingReviewCount = workflowQueueDocuments.filter((doc) =>
    normalizeWorkflowStatus(doc.workflow_status, doc.review_approval_status, doc.status) === "Pending Review"
  ).length;
  const reviewedCount = workflowQueueDocuments.filter((doc) =>
    normalizeWorkflowStatus(doc.workflow_status, doc.review_approval_status, doc.status) === "Reviewed"
  ).length;
  const pendingApprovalCount = workflowQueueDocuments.filter((doc) =>
    normalizeWorkflowStatus(doc.workflow_status, doc.review_approval_status, doc.status) === "Pending Approval"
  ).length;
  const rejectedCount = workflowQueueDocuments.filter((doc) =>
    normalizeWorkflowStatus(doc.workflow_status, doc.review_approval_status, doc.status) === "Rejected"
  ).length;
  const originatorSetCount = documents.filter((doc) => doc.originator_name && doc.originator_name.trim()).length;
  const reviewerSetCount = documents.filter((doc) => doc.reviewed_by && doc.reviewed_by.trim()).length;
  const approverSetCount = documents.filter((doc) => doc.approved_by && doc.approved_by.trim()).length;
  const fullyPopulatedCount = documents.filter(
    (doc) =>
      doc.originator_name && doc.originator_name.trim() &&
      doc.reviewed_by && doc.reviewed_by.trim() &&
      doc.approved_by && doc.approved_by.trim()
  ).length;
  const approvedDocuments = documents.filter(
    (doc) => normalizeWorkflowStatus(doc.workflow_status, doc.review_approval_status, doc.status) === "Approved"
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
    documentId: string,
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
          documentId,
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

  async function recordWorkflowActivity(
    document: Pick<DocumentRow, "id" | "document_number" | "title">,
    action: string,
    fromStatus: WorkflowStatus,
    toStatus: WorkflowStatus,
    actorName: string,
    actorEmail: string,
    note?: string
  ) {
    const { error } = await supabase.from("document_workflow_activity").insert({
      document_id: document.id,
      document_number: document.document_number,
      document_title: document.title,
      action,
      from_status: fromStatus,
      to_status: toStatus,
      actor_name: actorName || currentUserPerson?.name || "",
      actor_email: actorEmail || currentUserEmail || "",
      note: note || null,
    });

    return error?.message || "";
  }

  async function updateCurrentRevisionSnapshot(
    document: Pick<DocumentRow, "id" | "current_revision">,
    values: Partial<Pick<DocumentRevisionRow, "issue_date" | "reviewed_by" | "reviewed_at" | "approved_by" | "approved_at">>
  ) {
    const revision = (document.current_revision || "A").trim() || "A";
    const snapshot = {
      ...values,
      issue_date: values.issue_date || detailForm.issue_date || selectedDocument?.issue_date || todayIsoDate(),
    };

    const { data: existingRows, error: existingError } = await supabase
      .from("document_revisions")
      .select("id")
      .eq("document_id", document.id)
      .eq("revision", revision)
      .eq("is_current", true)
      .limit(1);

    if (existingError) return existingError.message;

    const existingId = existingRows?.[0]?.id;
    if (existingId) {
      const { error } = await supabase.from("document_revisions").update(snapshot).eq("id", existingId);
      return error?.message || "";
    }

    const { error } = await supabase.from("document_revisions").insert({
      document_id: document.id,
      revision,
      revision_notes: `Revision ${revision} workflow snapshot.`,
      file_name: null,
      file_path: null,
      file_size: null,
      uploaded_at: null,
      ...snapshot,
      is_current: true,
    });

    return error?.message || "";
  }

  function buildWorkflowMessage(successMessage: string, notificationError?: string | null, activityError?: string) {
    const warnings = [
      notificationError ? `notification failed: ${notificationError}` : "",
      activityError ? `activity log failed: ${activityError}` : "",
    ].filter(Boolean);

    return warnings.length ? `${successMessage} Warning: ${warnings.join("; ")}.` : successMessage;
  }

  function applySnapshotFilter(filter: {
    status?: string;
    statuses?: string[];
    approval?: string;
    review?: string;
    department?: string;
    missingReviewDate?: boolean;
  }) {
    setActiveView("register");
    if (filter.statuses?.length || filter.status !== undefined) {
      setStatusFilter(filter.statuses?.length ? `__multi:${filter.statuses.join("|")}` : filter.status || "");
    }
    if (filter.approval !== undefined) setApprovalFilter(filter.approval);
    if (filter.review !== undefined) setReviewFilter(filter.review);
    if (filter.department !== undefined) setOwnerFilter(filter.department);
    if (filter.missingReviewDate) setReviewFilter("Not set");
    setMessage("Snapshot filter applied.");
    window.setTimeout(() => {
      document.getElementById("document-register")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  function switchWorkspaceView(view: DocumentWorkspaceView) {
    setActiveView(view);

    if (view === "register") {
      clearFilters();
      setShowCreatePanel(false);
      return;
    }

    if (view === "create") {
      setShowCreatePanel(true);
      setShowDetailPanel(false);
      return;
    }

    if (view === "workflow") {
      setSearch("");
      setStatusFilter("");
      setTypeFilter("");
      setOwnerFilter("");
      setReviewFilter("");
      setApprovalFilter("Workflow");
      setShowCreatePanel(false);
      return;
    }

    if (view === "archive") {
      setSearch("");
      setStatusFilter("__multi:Superseded|Obsolete|Archived");
      setTypeFilter("");
      setOwnerFilter("");
      setReviewFilter("");
      setApprovalFilter("");
      setShowCreatePanel(false);
      return;
    }

    setShowCreatePanel(false);
  }

  function exportDocumentsReport(title: string, rows: DocumentRow[]) {
    try {
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 12;
      const generatedAt = new Date().toLocaleString("en-GB");
      const fileName = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "document-report"}.pdf`;

      pdf.setFillColor(0, 86, 112);
      pdf.rect(0, 0, pageWidth, 24, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.text("ENSHORE", margin, 10);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.text("Document Control Report", margin, 17);

      pdf.setTextColor(0, 0, 0);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.text(title, margin, 34);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(83, 86, 90);
      pdf.text(`Generated: ${generatedAt}`, margin, 40);
      pdf.text(`Documents in report: ${rows.length}`, margin, 45);

      autoTable(pdf, {
        startY: 52,
        theme: "grid",
        margin: { left: margin, right: margin, bottom: 16 },
        head: [[
          "Document No.",
          "Title",
          "Type",
          "Owner",
          "Rev",
          "Status",
          "Approval",
          "Issue Date",
          "Next Review",
        ]],
        body: rows.map((doc) => [
          doc.document_number || "-",
          doc.title || "-",
          doc.document_type || "-",
          doc.department_owner || "-",
          doc.current_revision || "-",
          doc.status || "-",
          normalizeWorkflowStatus(doc.workflow_status, doc.review_approval_status, doc.status),
          formatDate(doc.issue_date),
          formatDate(doc.next_review_date),
        ]),
        styles: {
          font: "helvetica",
          fontSize: 7,
          cellPadding: 2,
          overflow: "linebreak",
          valign: "top",
          textColor: [0, 0, 0],
          lineColor: [208, 208, 206],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [0, 86, 112],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "left",
        },
        alternateRowStyles: {
          fillColor: [236, 236, 231],
        },
        columnStyles: {
          0: { cellWidth: 26 },
          1: { cellWidth: 64 },
          2: { cellWidth: 24 },
          3: { cellWidth: 24 },
          4: { cellWidth: 12, halign: "center" },
          5: { cellWidth: 22 },
          6: { cellWidth: 24 },
          7: { cellWidth: 22 },
          8: { cellWidth: 22 },
        },
        didDrawPage: () => {
          const pageNumber = pdf.getNumberOfPages();
          pdf.setFontSize(8);
          pdf.setTextColor(83, 86, 90);
          pdf.text("Read-only export from Document Control.", margin, pageHeight - 8);
          pdf.text(`Page ${pageNumber}`, pageWidth - margin, pageHeight - 8, { align: "right" });
        },
      });

      if (rows.length === 0) {
        pdf.setFontSize(11);
        pdf.setTextColor(83, 86, 90);
        pdf.text("No documents matched this report.", margin, 58);
      }

      pdf.save(fileName);
      setMessage(`${title} PDF generated.`);
    } catch (error) {
      const text = error instanceof Error ? error.message : "PDF generation failed.";
      setMessage(`PDF generation failed: ${text}`);
    }
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
    if (!requireCreatePermission("create documents")) return;

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

    if (form.status === "Live" && form.workflow_status !== "Approved") {
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
      status: getLegacyStatusForWorkflow(form.workflow_status),
      review_approval_status: getLegacyApprovalForWorkflow(form.workflow_status),
      workflow_status: form.workflow_status,
      current_revision: (form.current_revision || "A").trim().toUpperCase(),
      issue_date: form.issue_date || todayIsoDate(),
      review_cycle_years: form.review_cycle_years,
      originator_name: form.originator_name.trim(),
      originator_email: form.originator_email.trim(),
      reviewed_by: form.workflow_status === "Reviewed" || form.workflow_status === "Pending Approval" || form.workflow_status === "Approved" ? form.reviewed_by.trim() || null : null,
      reviewed_at: form.reviewed_at || null,
      approved_by: form.workflow_status === "Approved" ? form.approved_by.trim() || null : null,
      rejected_by: form.workflow_status === "Rejected" ? form.rejected_by.trim() || null : null,
      approved_at: form.approved_at || null,
      rejected_at: form.workflow_status === "Rejected" ? form.rejected_at || null : null,
      rejection_reason: form.workflow_status === "Rejected" ? form.rejection_reason.trim() || null : null,
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

    const createdDocument = data as DocumentRow;
    const { error: revisionCreateError } = await supabase.from("document_revisions").insert({
      document_id: createdDocument.id,
      revision: createdDocument.current_revision || "A",
      revision_notes: form.comments.trim() || "Draft document record created.",
      file_name: null,
      file_path: null,
      file_size: null,
      uploaded_at: null,
      issue_date: form.issue_date || null,
      reviewed_by: null,
      reviewed_at: null,
      approved_by: null,
      approved_at: null,
      is_current: true,
    });

    setForm(emptyForm);
    setFormPeopleSearch({
      originator_name: emptyForm.originator_name,
      reviewed_by: emptyForm.reviewed_by,
      approved_by: emptyForm.approved_by,
      rejected_by: emptyForm.rejected_by,
    });
    clearFilters();
    setActiveView("register");
    setShowDetailPanel(true);
    setShowCreatePanel(false);
    setSelectedDocumentId(createdDocument.id);
    setDetailForm(buildDocumentFormFromRow(createdDocument));
    setDetailPeopleSearch({
      originator_name: createdDocument.originator_name || "",
      reviewed_by: createdDocument.reviewed_by || "",
      approved_by: createdDocument.approved_by || "",
      rejected_by: createdDocument.rejected_by || "",
    });
    await loadDocuments({ selectDocumentId: createdDocument.id });
    await loadDocumentRevisions(createdDocument.id, { quiet: true });
    window.setTimeout(() => {
      document.getElementById("document-detail-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
    setMessage(
      revisionCreateError
        ? `Document added, but initial revision history failed: ${revisionCreateError.message}`
        : "Document added successfully. Upload the controlled copy and submit it for review from the detail panel below."
    );
  }

  async function saveDocumentChanges() {
    if (!requireEditPermission("edit documents")) return;

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

    if (detailForm.status === "Live" && detailForm.workflow_status !== "Approved") {
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
      status: getLegacyStatusForWorkflow(detailForm.workflow_status),
      review_approval_status: getLegacyApprovalForWorkflow(detailForm.workflow_status),
      workflow_status: detailForm.workflow_status,
      current_revision: (detailForm.current_revision || "A").trim().toUpperCase(),
      issue_date: detailForm.issue_date || null,
      review_cycle_years: detailForm.review_cycle_years,
      originator_name: detailForm.originator_name.trim(),
      originator_email: detailForm.originator_email.trim(),
      reviewed_by: detailForm.workflow_status === "Reviewed" || detailForm.workflow_status === "Pending Approval" || detailForm.workflow_status === "Approved" ? detailForm.reviewed_by.trim() || null : null,
      reviewed_at: detailForm.reviewed_at || null,
      approved_by: detailForm.workflow_status === "Approved" ? detailForm.approved_by.trim() || null : null,
      rejected_by: detailForm.workflow_status === "Rejected" ? detailForm.rejected_by.trim() || null : null,
      approved_at: detailForm.approved_at || null,
      rejected_at: detailForm.workflow_status === "Rejected" ? detailForm.rejected_at || null : null,
      rejection_reason: detailForm.workflow_status === "Rejected" ? detailForm.rejection_reason.trim() || null : null,
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
    if (!requireEditPermission("submit documents for review")) return;

    if (!selectedDocument) {
      setMessage("Select a document first.");
      return;
    }

    if (!detailForm.originator_name.trim() || !detailForm.originator_email.trim()) {
      setMessage("Originator name and email are required before submitting for review.");
      return;
    }

    if (!detailForm.reviewed_by.trim() || !detailForm.reviewer_email.trim()) {
      setMessage("Select a reviewer from People Management before sending for review.");
      return;
    }

    if (!detailForm.approved_by.trim() || !detailForm.approver_email.trim()) {
      setMessage("Select an approver before sending to the reviewer so the email workflow can continue automatically.");
      return;
    }

    const fromStatus = selectedWorkflowStatus;
    const toStatus: WorkflowStatus = "Pending Review";
    const payload: Record<string, unknown> = {
      status: getLegacyStatusForWorkflow(toStatus),
      review_approval_status: getLegacyApprovalForWorkflow(toStatus),
      workflow_status: toStatus,
      workflow_reviewer_name: detailForm.reviewed_by.trim(),
      workflow_reviewer_email: detailForm.reviewer_email.trim(),
      workflow_approver_name: detailForm.approved_by.trim(),
      workflow_approver_email: detailForm.approver_email.trim(),
      originator_name: detailForm.originator_name.trim(),
      originator_email: detailForm.originator_email.trim(),
      reviewed_by: null,
      reviewed_at: null,
      approved_by: null,
      approved_at: null,
      rejected_by: null,
      rejected_at: null,
      rejection_reason: null,
      notification_emails: deriveStoredNotificationEmails(detailForm),
      comments: detailForm.comments.trim(),
    };
    if (supportsReviewerEmail) {
      payload.reviewer_email = detailForm.reviewer_email.trim();
    }
    if (supportsApproverEmail) {
      payload.approver_email = detailForm.approver_email.trim();
    }

    const { error } = await supabase.from("documents").update(payload).eq("id", selectedDocument.id);

    if (error) {
      setMessage(`Send to reviewer failed: ${error.message}`);
      return;
    }

    const reviewSubmissionSource: DocumentForm = {
      ...detailForm,
      status: "Under Review",
      review_approval_status: "Pending Review",
      workflow_status: toStatus,
      approved_by: detailForm.approved_by.trim(),
      approver_email: detailForm.approver_email.trim(),
      originator_name: detailForm.originator_name.trim(),
      originator_email: detailForm.originator_email.trim(),
      notification_emails: deriveStoredNotificationEmails(detailForm),
      comments: detailForm.comments.trim(),
    };

    const activityError = await recordWorkflowActivity(
      selectedDocument,
      "sent_to_reviewer",
      fromStatus,
      toStatus,
      detailForm.originator_name.trim(),
      detailForm.originator_email.trim(),
      `Reviewer: ${detailForm.reviewed_by.trim()}`
    );
    const notificationError = await notifyDocumentEvent(
      "submitted_for_review",
      reviewSubmissionSource,
      selectedDocument.id,
      selectedDocument.document_number,
      detailForm.title.trim(),
      detailForm.comments.trim()
    );

    setMessage(buildWorkflowMessage("Document sent to reviewer.", notificationError, activityError));
    await loadDocuments();
  }

  async function markReviewed() {
    if (!requireEditPermission("accept document reviews")) return;

    if (!selectedDocument) {
      setMessage("Select a document first.");
      return;
    }

    if (selectedWorkflowStatus !== "Pending Review") {
      setMessage("Only documents pending review can be accepted by the reviewer.");
      return;
    }

    const fromStatus = selectedWorkflowStatus;
    const toStatus: WorkflowStatus = "Reviewed";
    const reviewDate = todayIsoDate();
    const reviewedBy = resolveWorkflowActor(detailForm.reviewed_by, "Reviewed By");
    if (!reviewedBy) return;

    const payload: Record<string, unknown> = {
      status: getLegacyStatusForWorkflow(toStatus),
      review_approval_status: getLegacyApprovalForWorkflow(toStatus),
      workflow_status: toStatus,
      reviewed_by: reviewedBy,
      reviewed_at: reviewDate,
      approved_by: null,
      approved_at: null,
      rejected_by: null,
      rejected_at: null,
      rejection_reason: null,
      notification_emails: deriveStoredNotificationEmails(detailForm),
    };
    if (supportsReviewerEmail) {
      payload.reviewer_email = detailForm.reviewer_email.trim() || null;
    }

    const { error } = await supabase.from("documents").update(payload).eq("id", selectedDocument.id);

    if (error) {
      setMessage(`Accept review failed: ${error.message}`);
      return;
    }

    const revisionSnapshotError = await updateCurrentRevisionSnapshot(selectedDocument, {
      reviewed_by: reviewedBy,
      reviewed_at: reviewDate,
    });
    const activityError = await recordWorkflowActivity(
      selectedDocument,
      "review_accepted",
      fromStatus,
      toStatus,
      reviewedBy,
      detailForm.reviewer_email.trim(),
      `Reviewed on ${formatDate(reviewDate)}.`
    );
    setMessage(
      buildWorkflowMessage(
        "Review accepted. Select an approver and send the document for approval.",
        null,
        [activityError, revisionSnapshotError ? `revision snapshot failed: ${revisionSnapshotError}` : ""]
          .filter(Boolean)
          .join("; ")
      )
    );
    await loadDocuments();
  }

  async function sendToApprover() {
    if (!requireEditPermission("send documents to approver")) return;

    if (!selectedDocument) {
      setMessage("Select a document first.");
      return;
    }

    if (selectedWorkflowStatus !== "Reviewed") {
      setMessage("The reviewer must accept the document before it can be sent to an approver.");
      return;
    }

    if (!detailForm.approved_by.trim() || !detailForm.approver_email.trim()) {
      setMessage("Select an approver from People Management before sending for approval.");
      return;
    }

    const fromStatus = selectedWorkflowStatus;
    const toStatus: WorkflowStatus = "Pending Approval";
    const payload: Record<string, unknown> = {
      status: getLegacyStatusForWorkflow(toStatus),
      review_approval_status: getLegacyApprovalForWorkflow(toStatus),
      workflow_status: toStatus,
      workflow_approver_name: detailForm.approved_by.trim(),
      workflow_approver_email: detailForm.approver_email.trim(),
      approved_by: null,
      approved_at: null,
      rejected_by: null,
      rejected_at: null,
      rejection_reason: null,
      notification_emails: deriveStoredNotificationEmails(detailForm),
    };
    if (supportsApproverEmail) {
      payload.approver_email = detailForm.approver_email.trim();
    }

    const { error } = await supabase.from("documents").update(payload).eq("id", selectedDocument.id);

    if (error) {
      setMessage(`Send to approver failed: ${error.message}`);
      return;
    }

    const approvalSource: DocumentForm = {
      ...detailForm,
      status: "Under Review",
      review_approval_status: "Reviewed",
      workflow_status: toStatus,
      approved_by: detailForm.approved_by.trim(),
      approver_email: detailForm.approver_email.trim(),
      notification_emails: deriveStoredNotificationEmails(detailForm),
    };

    const activityError = await recordWorkflowActivity(
      selectedDocument,
      "sent_to_approver",
      fromStatus,
      toStatus,
      detailForm.reviewed_by.trim() || currentUserPerson?.name || "",
      detailForm.reviewer_email.trim() || currentUserEmail,
      `Approver: ${detailForm.approved_by.trim()}`
    );
    const notificationError = await notifyDocumentEvent(
      "reviewed",
      approvalSource,
      selectedDocument.id,
      selectedDocument.document_number,
      detailForm.title.trim(),
      `Document reviewed and sent to ${detailForm.approved_by.trim()} for approval.`
    );

    setMessage(buildWorkflowMessage("Document sent to approver.", notificationError, activityError));
    await loadDocuments();
  }

  async function approveDocument() {
    if (!requireEditPermission("approve documents")) return;

    if (!selectedDocument) {
      setMessage("Select a document first.");
      return;
    }

    if (selectedWorkflowStatus !== "Pending Approval") {
      setMessage("A document must be sent to an approver before it can be approved.");
      return;
    }

    const fromStatus = selectedWorkflowStatus;
    const toStatus: WorkflowStatus = "Approved";
    const approvedDate = todayIsoDate();
    const approvedBy = resolveWorkflowActor(detailForm.approved_by, "Approved By");
    if (!approvedBy) return;
    const nextReviewDate = buildNextReviewDate(approvedDate, detailForm.review_cycle_years);

    const payload: Record<string, unknown> = {
      status: getLegacyStatusForWorkflow(toStatus),
      review_approval_status: getLegacyApprovalForWorkflow(toStatus),
      workflow_status: toStatus,
      approved_by: approvedBy,
      approved_at:
        detailForm.approved_at && detailForm.approved_at.trim() ? detailForm.approved_at : approvedDate,
      next_review_date: nextReviewDate || null,
      rejected_by: null,
      rejected_at: null,
      rejection_reason: null,
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

    const revisionSnapshotError = await updateCurrentRevisionSnapshot(selectedDocument, {
      reviewed_by: detailForm.reviewed_by.trim() || selectedDocument.reviewed_by || selectedDocument.workflow_reviewer_name || null,
      reviewed_at: detailForm.reviewed_at || selectedDocument.reviewed_at || null,
      approved_by: approvedBy,
      approved_at: String(payload.approved_at || ""),
    });
    const approvedSource: DocumentForm = {
      ...detailForm,
      status: "Live",
      review_approval_status: "Approved",
      workflow_status: toStatus,
      approved_by: String(payload.approved_by || ""),
      approver_email: detailForm.approver_email,
      approved_at: String(payload.approved_at || ""),
      rejected_by: "",
      rejected_at: "",
      rejection_reason: "",
      notification_emails: deriveStoredNotificationEmails(detailForm),
    };

    const activityError = await recordWorkflowActivity(
      selectedDocument,
      "approved",
      fromStatus,
      toStatus,
      approvedBy,
      detailForm.approver_email.trim(),
      `Approved on ${formatDate(String(payload.approved_at || ""))}. Next review: ${formatDate(nextReviewDate)}.`
    );
    const notificationError = await notifyDocumentEvent(
      "approved",
      approvedSource,
      selectedDocument.id,
      selectedDocument.document_number,
      detailForm.title.trim(),
      `Approved by ${String(payload.approved_by || "")} on ${formatDate(String(payload.approved_at || ""))}.`
    );

    setMessage(
      buildWorkflowMessage(
        "Document approved and moved live.",
        notificationError,
        [activityError, revisionSnapshotError ? `revision snapshot failed: ${revisionSnapshotError}` : ""]
          .filter(Boolean)
          .join("; ")
      )
    );
    await loadDocuments();
  }

  async function rejectDocument() {
    if (!requireEditPermission("reject documents")) return;

    if (!selectedDocument) {
      setMessage("Select a document first.");
      return;
    }

    if (!detailForm.rejection_reason.trim()) {
      setMessage("A rejection reason is required.");
      return;
    }

    const rejectedDate = todayIsoDate();
    const rejectedBy = resolveWorkflowActor(detailForm.rejected_by, "Rejected By");
    if (!rejectedBy) return;

    const fromStatus = selectedWorkflowStatus;
    const toStatus: WorkflowStatus = "Rejected";
    const payload: Record<string, unknown> = {
      status: getLegacyStatusForWorkflow(toStatus),
      review_approval_status: getLegacyApprovalForWorkflow(toStatus),
      workflow_status: toStatus,
      approved_by: null,
      approved_at: null,
      rejected_by: rejectedBy,
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
      workflow_status: toStatus,
      rejected_by: String(payload.rejected_by || ""),
      rejected_at: String(payload.rejected_at || ""),
      rejection_reason: String(payload.rejection_reason || ""),
      notification_emails: deriveStoredNotificationEmails(detailForm),
    };

    const activityError = await recordWorkflowActivity(
      selectedDocument,
      "rejected",
      fromStatus,
      toStatus,
      rejectedBy,
      detailForm.approver_email.trim() || detailForm.reviewer_email.trim() || currentUserEmail,
      String(payload.rejection_reason || "")
    );
    const notificationError = await notifyDocumentEvent(
      "rejected",
      rejectedSource,
      selectedDocument.id,
      selectedDocument.document_number,
      detailForm.title.trim(),
      `Rejected by ${String(payload.rejected_by || "")} on ${formatDate(String(payload.rejected_at || ""))}.\nReason: ${String(payload.rejection_reason || "")}`
    );

    setMessage(buildWorkflowMessage("Document rejected and originator notified.", notificationError, activityError));
    await loadDocuments();
  }

  async function deleteSelectedDocument() {
    if (!requireEditPermission("delete documents")) return;

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

    const selectedRevisionRows =
      revisionsByDocumentId[selectedDocument.id] || (await loadDocumentRevisions(selectedDocument.id));
    const revisionPaths = selectedRevisionRows
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
    if (!requireEditPermission("upload controlled document files")) {
      event.target.value = "";
      return;
    }

    if (!selectedDocument) {
      setMessage("Select a document first.");
      return;
    }
    const activeDocument = selectedDocument;

    const file = event.target.files?.[0];
    if (!file) return;

    if (getLegacyStatusForWorkflow(detailForm.workflow_status) === "Live" && detailForm.workflow_status !== "Approved") {
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
      const path = `documents/${activeDocument.id}/revisions/${currentRevision}/${Date.now()}-${safeName}`;
      const oldPath = activeDocument.file_path || "";
      const uploadTimestamp = new Date().toISOString();
      let uploadedPath = "";
      const existingRevisionRows =
        revisionsByDocumentId[activeDocument.id] || (await loadDocumentRevisions(activeDocument.id, { quiet: true }));
      const placeholderRevision = existingRevisionRows.find(
        (revision) =>
          revision.revision === currentRevision &&
          revision.is_current &&
          !revision.file_path &&
          !revision.file_name
      );
      const revisionReviewedBy =
        detailForm.reviewed_by.trim() || activeDocument.workflow_reviewer_name || activeDocument.reviewed_by || null;
      const revisionApprovedBy =
        detailForm.approved_by.trim() || activeDocument.workflow_approver_name || activeDocument.approved_by || null;

      async function cleanupUploadedFile() {
        if (uploadedPath) {
          await supabase.storage.from(STORAGE_BUCKET).remove([uploadedPath]);
        }
      }

      async function restorePreviousDocumentFile() {
        await supabase
          .from("documents")
          .update({
            file_name: activeDocument.file_name || null,
            file_path: oldPath || null,
            file_size: activeDocument.file_size || null,
            uploaded_at: activeDocument.uploaded_at || null,
          })
          .eq("id", activeDocument.id);

        if (oldPath) {
          await supabase
            .from("document_revisions")
            .update({ is_current: true })
            .eq("document_id", activeDocument.id)
            .eq("file_path", oldPath);
        }
      }

      const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
        upsert: true,
      });

      if (uploadError) {
        setMessage(`Upload failed: ${uploadError.message}`);
        return;
      }

      uploadedPath = path;

      const fileUpdatePayload: Record<string, unknown> = {
        document_type: detailForm.document_type || null,
        title: detailForm.title.trim(),
        description: detailForm.description.trim() || null,
        department_owner: detailForm.department_owner || null,
        status: getLegacyStatusForWorkflow(detailForm.workflow_status),
        review_approval_status: getLegacyApprovalForWorkflow(detailForm.workflow_status),
        workflow_status: detailForm.workflow_status,
        current_revision: currentRevision,
        issue_date: detailForm.issue_date || null,
        review_cycle_years: detailForm.review_cycle_years,
        originator_name: detailForm.originator_name.trim() || null,
        originator_email: detailForm.originator_email.trim() || null,
        reviewed_by: detailForm.workflow_status === "Reviewed" || detailForm.workflow_status === "Pending Approval" || detailForm.workflow_status === "Approved" ? detailForm.reviewed_by.trim() || null : null,
        reviewed_at: detailForm.workflow_status === "Reviewed" || detailForm.workflow_status === "Pending Approval" || detailForm.workflow_status === "Approved" ? detailForm.reviewed_at || null : null,
        approved_by: detailForm.workflow_status === "Approved" ? detailForm.approved_by.trim() || null : null,
        rejected_by: detailForm.workflow_status === "Rejected" ? detailForm.rejected_by.trim() || null : null,
        approved_at: detailForm.workflow_status === "Approved" ? detailForm.approved_at || null : null,
        rejected_at: detailForm.workflow_status === "Rejected" ? detailForm.rejected_at || null : null,
        rejection_reason: detailForm.workflow_status === "Rejected" ? detailForm.rejection_reason.trim() || null : null,
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
        .eq("id", activeDocument.id);

      if (updateError) {
        await cleanupUploadedFile();
        setMessage(`Document file update failed: ${updateError.message}`);
        return;
      }

      if (placeholderRevision) {
        const { error: revisionUpdateError } = await supabase
          .from("document_revisions")
          .update({
            revision_notes: placeholderRevision.revision_notes || detailForm.comments.trim() || null,
            file_name: file.name,
            file_path: path,
            file_size: file.size,
            uploaded_at: uploadTimestamp,
            issue_date: detailForm.issue_date || null,
            reviewed_by: revisionReviewedBy,
            reviewed_at: detailForm.reviewed_at || null,
            approved_by: revisionApprovedBy,
            approved_at: detailForm.approved_at || null,
            is_current: true,
          })
          .eq("id", placeholderRevision.id);

        if (revisionUpdateError) {
          await restorePreviousDocumentFile();
          await cleanupUploadedFile();
          setMessage(`Revision history update failed: ${revisionUpdateError.message}`);
          return;
        }
      } else {
        const { error: revisionCurrentError } = await supabase
          .from("document_revisions")
          .update({ is_current: false })
          .eq("document_id", activeDocument.id);

        if (revisionCurrentError) {
          await restorePreviousDocumentFile();
          await cleanupUploadedFile();
          setMessage(`Revision history update failed: ${revisionCurrentError.message}`);
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
          reviewed_by: revisionReviewedBy,
          reviewed_at: detailForm.reviewed_at || null,
          approved_by: revisionApprovedBy,
          approved_at: detailForm.approved_at || null,
          is_current: true,
        });

        if (revisionInsertError) {
          await restorePreviousDocumentFile();
          await cleanupUploadedFile();
          setMessage(`Revision history update failed: ${revisionInsertError.message}`);
          return;
        }
      }

      setMessage(
        `Controlled copy uploaded for revision ${currentRevision}. Files remain view/download only in the system.`
      );
      await loadDocuments();
      await loadDocumentRevisions(activeDocument.id, { quiet: true });
    } finally {
      setIsUploadingFile(false);
      event.target.value = "";
    }
  }

  async function issueNextRevision() {
    if (!requireEditPermission("up-rev documents")) return;

    if (!selectedDocument) {
      setMessage("Select a document first.");
      return;
    }

    const nextRevision = getNextRevision(selectedDocument.current_revision || "A");
    const revisionReason = window.prompt(
      `Comments for revision ${nextRevision}`,
      ""
    )?.trim();

    if (!revisionReason) {
      setMessage(`Revision ${nextRevision} was not opened. Enter a revision reason to continue.`);
      return;
    }

    const outgoingSnapshotError = await updateCurrentRevisionSnapshot(selectedDocument, {
      issue_date: detailForm.issue_date || selectedDocument.issue_date || todayIsoDate(),
      reviewed_by: detailForm.reviewed_by.trim() || selectedDocument.reviewed_by || selectedDocument.workflow_reviewer_name || null,
      reviewed_at: detailForm.reviewed_at || selectedDocument.reviewed_at || null,
      approved_by: detailForm.approved_by.trim() || selectedDocument.approved_by || selectedDocument.workflow_approver_name || null,
      approved_at: detailForm.approved_at || selectedDocument.approved_at || null,
    });

    if (outgoingSnapshotError) {
      setMessage(`Revision snapshot failed: ${outgoingSnapshotError}`);
      return;
    }

    const { error } = await supabase
      .from("documents")
      .update({
        current_revision: nextRevision,
        status: "Draft",
        review_approval_status: "Draft",
        workflow_status: "Draft",
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
        workflow_reviewer_name: null,
        workflow_reviewer_email: null,
        workflow_approver_name: null,
        workflow_approver_email: null,
      })
      .eq("id", selectedDocument.id);

    if (error) {
      setMessage(`Revision update failed: ${error.message}`);
      return;
    }

    const { error: revisionUpdateError } = await supabase
      .from("document_revisions")
      .update({ is_current: false })
      .eq("document_id", selectedDocument.id);

    if (revisionUpdateError) {
      setMessage(`Revision history update failed: ${revisionUpdateError.message}`);
      return;
    }

    const { error: nextRevisionInsertError } = await supabase.from("document_revisions").insert({
      document_id: selectedDocument.id,
      revision: nextRevision,
      revision_notes: revisionReason,
      file_name: null,
      file_path: null,
      file_size: null,
      uploaded_at: null,
      issue_date: todayIsoDate(),
      reviewed_by: null,
      reviewed_at: null,
      approved_by: null,
      approved_at: null,
      is_current: true,
    });

    if (nextRevisionInsertError) {
      setMessage(`Revision history update failed: ${nextRevisionInsertError.message}`);
      return;
    }

    setDetailForm((prev) => ({
      ...prev,
      current_revision: nextRevision,
      status: "Draft",
      review_approval_status: "Draft",
      workflow_status: "Draft",
      reviewed_by: "",
      reviewer_email: "",
      reviewed_at: "",
      approved_by: "",
      approver_email: "",
      approved_at: "",
      rejected_by: "",
      rejected_at: "",
      rejection_reason: "",
      comments: "",
    }));

    setMessage(`Document moved to revision ${nextRevision}. Upload the new controlled copy next.`);
    await loadDocuments({ selectDocumentId: selectedDocument.id });
    await loadDocumentRevisions(selectedDocument.id, { quiet: true });
  }

  async function markReviewedNoChanges() {
    if (!requireEditPermission("record a no-change review")) return;

    if (!selectedDocument) {
      setMessage("Select a document first.");
      return;
    }

    if (selectedDocument.workflow_status !== "Approved") {
      setMessage("Only Approved documents can be recorded as reviewed with no changes.");
      return;
    }

    const reviewComment = window.prompt(
      "Record periodic review — no changes required.\n\nAdd any additional notes (optional):",
      ""
    );
    if (reviewComment === null) return; // cancelled

    const today = todayIsoDate();
    const reviewCycle = selectedDocument.review_cycle_years || 3;
    const newNextReviewDate = (() => {
      const d = new Date(today);
      d.setFullYear(d.getFullYear() + reviewCycle);
      return d.toISOString().split("T")[0];
    })();

    const reviewNote = [
      `Document reviewed ${new Date().toLocaleDateString("en-GB")} — no changes required.`,
      reviewComment.trim(),
    ]
      .filter(Boolean)
      .join(" ");

    // Get the current revision row to carry its file info forward
    const currentRevisions = revisionsByDocumentId[selectedDocument.id] || [];
    const currentRevRow = currentRevisions.find((r) => r.is_current);

    await supabase
      .from("document_revisions")
      .update({ is_current: false })
      .eq("document_id", selectedDocument.id)
      .eq("is_current", true);

    const { error: insertError } = await supabase.from("document_revisions").insert({
      document_id: selectedDocument.id,
      revision: selectedDocument.current_revision || "A",
      revision_notes: reviewNote,
      file_name: currentRevRow?.file_name ?? selectedDocument.file_name ?? null,
      file_path: currentRevRow?.file_path ?? selectedDocument.file_path ?? null,
      file_size: currentRevRow?.file_size ?? selectedDocument.file_size ?? null,
      uploaded_at: currentRevRow?.uploaded_at ?? selectedDocument.uploaded_at ?? null,
      issue_date: selectedDocument.issue_date || today,
      reviewed_by: currentUserPerson?.name || selectedDocument.reviewed_by || null,
      reviewed_at: today,
      approved_by: selectedDocument.approved_by || selectedDocument.workflow_approver_name || null,
      approved_at: selectedDocument.approved_at || null,
      is_current: true,
    });

    if (insertError) {
      setMessage(`Review record failed: ${insertError.message}`);
      return;
    }

    const { error: patchError } = await supabase
      .from("documents")
      .update({
        next_review_date: newNextReviewDate,
        reviewed_by: currentUserPerson?.name || selectedDocument.reviewed_by || null,
        reviewed_at: today,
      })
      .eq("id", selectedDocument.id);

    if (patchError) {
      setMessage(`Review date update failed: ${patchError.message}`);
      return;
    }

    await recordWorkflowActivity(
      selectedDocument,
      "periodic_review_no_changes",
      "Approved",
      "Approved",
      currentUserPerson?.name || "",
      currentUserEmail || "",
      reviewNote
    );

    setMessage(`Periodic review recorded. Next review date updated to ${newNextReviewDate}.`);
    await loadDocuments({ selectDocumentId: selectedDocument.id });
    await loadDocumentRevisions(selectedDocument.id, { quiet: true });
  }

  async function removeControlledFile() {
    if (!requireEditPermission("remove controlled document files")) return;

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
    if (!requireEditPermission("supersede documents")) return;
    if (!requireCreatePermission("create replacement documents")) return;

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

    const prefix = buildScopedDocumentPrefix(detailForm);
    if (!prefix) {
      setMessage("Replacement cannot be created until the document department/type details are complete.");
      return;
    }

    const nextReplacementSequence = await getNextDocumentSequence(prefix, documents);
    const replacementNumber = buildDocumentNumberFromPrefix(prefix, nextReplacementSequence);
    const replacementPayload: Record<string, unknown> = {
      document_scope: detailForm.document_scope,
      asset_id: detailForm.document_scope === "Asset" ? detailForm.asset_id || null : null,
      asset_name: detailForm.document_scope === "Asset" ? detailForm.asset_name.trim() || null : null,
      asset_code: detailForm.document_scope === "Asset" ? detailForm.asset_code.trim() || null : null,
      asset_document_id_code:
        detailForm.document_scope === "Asset" ? detailForm.asset_document_id_code.trim().toUpperCase() : null,
      document_type: detailForm.document_type,
      document_number: replacementNumber,
      title: detailForm.title.trim(),
      description: detailForm.description.trim() || null,
      department_owner: detailForm.department_owner,
      status: "Draft",
      review_approval_status: "Draft",
      workflow_status: "Draft",
      current_revision: "A",
      issue_date: null,
      review_cycle_years: detailForm.review_cycle_years,
      originator_name: detailForm.originator_name.trim() || null,
      originator_email: detailForm.originator_email.trim() || null,
      reviewed_by: null,
      reviewed_at: null,
      approved_by: null,
      approved_at: null,
      rejected_by: null,
      rejected_at: null,
      rejection_reason: null,
      notification_emails: detailForm.notification_emails || [],
      comments: `Supersedes ${selectedDocument.document_number}`,
    };
    if (supportsReviewerEmail) replacementPayload.reviewer_email = null;
    if (supportsApproverEmail) replacementPayload.approver_email = null;

    const { data: replacement, error: replacementError } = await supabase
      .from("documents")
      .insert(replacementPayload)
      .select("*")
      .single();

    if (replacementError || !replacement) {
      setMessage(`Replacement create failed: ${replacementError?.message || "Unknown error"}`);
      return;
    }

    const fromStatus = selectedWorkflowStatus;
    const { error } = await supabase
      .from("documents")
      .update({
        status: "Superseded",
        review_approval_status: "Draft",
        workflow_status: "Superseded",
        comments: supersedeComment,
      })
      .eq("id", selectedDocument.id);

    if (error) {
      await supabase.from("documents").delete().eq("id", (replacement as DocumentRow).id);
      setMessage(`Supersede failed after replacement create; replacement was removed: ${error.message}`);
      return;
    }

    const activityError = await recordWorkflowActivity(
      selectedDocument,
      "superseded",
      fromStatus,
      "Superseded",
      currentUserPerson?.name || detailForm.originator_name,
      currentUserEmail || detailForm.originator_email,
      `Replacement created: ${replacementNumber}`
    );
    const notificationError = await notifyDocumentEvent(
      "superseded",
      detailForm,
      selectedDocument.id,
      selectedDocument.document_number,
      detailForm.title.trim(),
      supersedeComment
    );

    await loadDocuments();
    setSelectedDocumentId((replacement as DocumentRow).id);
    setShowDetailPanel(true);
    setActiveView("register");
    setMessage(buildWorkflowMessage(`Replacement ${replacementNumber} created and old document superseded.`, notificationError, activityError));
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
    shouldScrollToDetailRef.current = true;
    setSelectedDocumentId(id);
    setShowDetailPanel(true);
  }

  const workflowActionTitle =
    selectedWorkflowStatus === "Draft" || selectedWorkflowStatus === "Rejected"
      ? "Send to reviewer"
      : selectedWorkflowStatus === "Pending Review"
      ? "Reviewer decision"
      : selectedWorkflowStatus === "Reviewed"
      ? "Send to approver"
      : selectedWorkflowStatus === "Pending Approval"
      ? "Approver decision"
      : selectedWorkflowStatus === "Approved"
      ? "Approved document"
      : "Workflow complete";

  const workflowActionHint =
    selectedWorkflowStatus === "Draft" || selectedWorkflowStatus === "Rejected"
      ? "Select the reviewer and approver, then send the review request email in one step."
      : selectedWorkflowStatus === "Pending Review"
      ? "The reviewer can accept the review, or reject with a reason."
      : selectedWorkflowStatus === "Reviewed"
      ? "Select the approver and send the approval request email in one step."
      : selectedWorkflowStatus === "Pending Approval"
      ? "The approver can approve the document, or reject it with a reason."
      : selectedWorkflowStatus === "Approved"
      ? "This document is live. Create a superseding replacement when a controlled change is required."
      : "No forward workflow action is available for this document.";

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

      <div className="ims-top-meta-row" style={topMetaRowStyle}>
        <Link href="/home" style={backLinkStyle}>
          ← Back to IMS Home
        </Link>

        <div style={statusBannerStyle}>
          <strong>Status:</strong> {message}
        </div>
      </div>

      <nav className="ims-tabs" style={documentViewNavStyle} aria-label="Document workspace views" role="tablist">
        {[
          ["dashboard", "Dashboard"],
          ["register", "Document Register"],
          ["create", "Create Document"],
          ["workflow", "Workflow"],
          ["archive", "Archive"],
          ["reports", "Reports"],
        ].map(([view, label]) => (
          <button
            key={view}
            type="button"
            role="tab"
            aria-selected={activeView === view}
            data-active={activeView === view ? "true" : "false"}
            style={activeView === view ? activeViewButtonStyle : viewButtonStyle}
            onClick={() => switchWorkspaceView(view as DocumentWorkspaceView)}
          >
            {label}
          </button>
        ))}
      </nav>

      {activeView === "dashboard" ? (
      <section className="quality-kpi-grid" style={statsGridStyle}>
        <QualityKpiCard
          title="Total Documents"
          value={totalDocuments}
          accent="#005670"
          onClick={() => applySnapshotFilter({})}
        />
        <QualityKpiCard
          title="Live Documents"
          value={liveDocuments}
          accent="#005670"
          onClick={() => applySnapshotFilter({ status: "Live" })}
        />
        <QualityKpiCard
          title="Draft Documents"
          value={draftDocuments}
          accent="#63B1BC"
          onClick={() => applySnapshotFilter({ status: "Draft" })}
        />
        <QualityKpiCard
          title="Proposed / Not Drafted"
          value={proposedDocuments}
          accent="#53565A"
          onClick={() => applySnapshotFilter({ statuses: ["Proposed", "Not drafted"] })}
        />
        <QualityKpiCard
          title="Archived Documents"
          value={archivedDocuments}
          accent="#FFAD00"
          onClick={() => applySnapshotFilter({ status: "Archived" })}
        />
        <QualityKpiCard
          title="Review Overdue"
          value={overdueReviews}
          accent="#F93822"
          onClick={() => applySnapshotFilter({ review: "Overdue" })}
        />
        <QualityKpiCard
          title="Due Soon"
          value={dueSoonReviews}
          accent="#FFAD00"
          onClick={() => applySnapshotFilter({ review: "Due soon" })}
        />
      </section>
      ) : null}

      {activeView === "dashboard" ? (
        <>
          {/* Missing review date alert */}
          {missingReviewDate > 0 && (
            <div
              style={{
                background: "#FFF8E6",
                border: "1px solid #FFAD00",
                borderRadius: "10px",
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "16px",
                fontSize: "13px",
              }}
            >
              <span style={{ fontSize: "15px", flexShrink: 0 }}>⚠</span>
              <span style={{ color: "#000000" }}>
                <strong style={{ color: "#996600" }}>{missingReviewDate} live document{missingReviewDate !== 1 ? "s" : ""}</strong>
                {" "}have no review date set — they will never appear as overdue without one.
              </span>
              <button
                type="button"
                style={{ marginLeft: "auto", fontSize: "12px", fontWeight: 700, color: "#996600", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "2px", whiteSpace: "nowrap" }}
                onClick={() => applySnapshotFilter({ missingReviewDate: true })}
              >
                Filter &amp; fix →
              </button>
            </div>
          )}

          <section style={dashboardPanelGridStyle}>
            {/* Overdue by department */}
            <SectionCard title="Overdue by Department" subtitle="Live documents past their next review date, grouped by department.">
              {overdueByDeptSorted.length === 0 ? (
                <p style={{ fontSize: "13px", color: "#53565A" }}>No overdue reviews — great work!</p>
              ) : (
                <div style={{ display: "grid", gap: "10px" }}>
                  {overdueByDeptSorted.map(([dept, count]) => (
                    <button
                      key={dept}
                      type="button"
                      style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
                      onClick={() => applySnapshotFilter({ department: dept, review: "Overdue" })}
                      title={`Show ${count} overdue doc${count !== 1 ? "s" : ""} in ${dept}`}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ width: "96px", fontSize: "12px", fontWeight: 600, color: "#53565A", flexShrink: 0 }}>{dept}</span>
                        <div style={{ flex: 1, background: "#D0D0CE", borderRadius: "4px", height: "8px", overflow: "hidden" }}>
                          <div style={{ width: `${Math.round((count / maxOverdueDept) * 100)}%`, height: "100%", background: "#F93822", borderRadius: "4px" }} />
                        </div>
                        <span style={{ width: "22px", textAlign: "right", fontSize: "12px", fontWeight: 700, color: "#F93822", fontVariantNumeric: "tabular-nums" }}>{count}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Right column: pipeline + workflow */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Upcoming reviews pipeline */}
              <SectionCard title="Review Pipeline" subtitle="How overdue and upcoming reviews are spread.">
                <div style={{ display: "grid", gap: "0" }}>
                  {[
                    { dot: "#F93822", label: "Overdue now", sub: "Past next review date", count: overdueReviews, color: "#F93822", onClick: () => applySnapshotFilter({ review: "Overdue" }) },
                    { dot: "#FFAD00", label: "Due in 0–30 days", sub: "Requires attention soon", count: due30Days, color: "#FFAD00", onClick: () => applySnapshotFilter({ review: "Due soon" }) },
                    { dot: "#FFAD00", label: "Due in 31–60 days", sub: "", count: due31to60Days, color: "#FFAD00", onClick: () => applySnapshotFilter({ review: "Due soon" }) },
                    { dot: "#D0D0CE", label: "Due in 61–90 days", sub: "", count: due61to90Days, color: "#53565A", onClick: () => applySnapshotFilter({ review: "Due soon" }) },
                  ].map(({ dot, label, sub, count, color, onClick }, i, arr) => (
                    <button
                      key={label}
                      type="button"
                      onClick={onClick}
                      style={{
                        display: "flex", alignItems: "center", gap: "12px",
                        padding: "10px 0",
                        borderTop: "none", borderLeft: "none", borderRight: "none",
                        borderBottom: i < arr.length - 1 ? "1px solid #D0D0CE" : "none",
                        background: "none",
                        cursor: "pointer", textAlign: "left",
                      }}
                    >
                      <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: dot, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "13px", color: "#000000", fontWeight: 500 }}>{label}</div>
                        {sub && <div style={{ fontSize: "11px", color: "#53565A" }}>{sub}</div>}
                      </div>
                      <span style={{ fontSize: "16px", fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>{count}</span>
                    </button>
                  ))}
                </div>
              </SectionCard>

              {/* Workflow queue */}
              <SectionCard title="Workflow Queue" subtitle="Documents moving through review and approval.">
                <div style={{ display: "grid", gap: "0" }}>
                  {[
                    { label: "Pending Review", count: pendingReviewCount, pillColor: "#FFAD00", pillBg: "#FFF8E6", onClick: () => switchWorkspaceView("workflow") },
                    { label: "Reviewed — awaiting approval", count: reviewedCount, pillColor: "#FFAD00", pillBg: "#FFF8E6", onClick: () => switchWorkspaceView("workflow") },
                    { label: "Pending Approval", count: pendingApprovalCount, pillColor: "#F93822", pillBg: "#FEF0EE", onClick: () => switchWorkspaceView("workflow") },
                    { label: "Rejected — needs rework", count: rejectedCount, pillColor: "#F93822", pillBg: "#FEF0EE", onClick: () => switchWorkspaceView("workflow") },
                    { label: "Archived / Superseded", count: archiveDocuments.length, pillColor: "#53565A", pillBg: "#ECECE7", onClick: () => switchWorkspaceView("archive") },
                  ].map(({ label, count, pillColor, pillBg, onClick }, i, arr) => (
                    <button
                      key={label}
                      type="button"
                      onClick={onClick}
                      style={{
                        display: "flex", alignItems: "center", gap: "10px",
                        padding: "9px 0",
                        borderTop: "none", borderLeft: "none", borderRight: "none",
                        borderBottom: i < arr.length - 1 ? "1px solid #D0D0CE" : "none",
                        background: "none",
                        cursor: "pointer", textAlign: "left",
                      }}
                    >
                      <span style={{ flex: 1, fontSize: "13px", color: "#000000" }}>{label}</span>
                      <span style={{ fontSize: "12px", fontWeight: 700, padding: "2px 9px", borderRadius: "20px", background: pillBg, color: pillColor, fontVariantNumeric: "tabular-nums" }}>{count}</span>
                    </button>
                  ))}
                </div>
              </SectionCard>
            </div>
          </section>

          {/* People coverage strip */}
          <section style={{ background: "#FFFFFF", border: "1px solid #D0D0CE", borderRadius: "10px", padding: "16px 20px", display: "flex", gap: "28px", flexWrap: "wrap", alignItems: "flex-start", marginBottom: "20px" }}>
            <div style={{ minWidth: "120px" }}>
              <div style={quickActionLabelStyle}>Originator set</div>
              <div style={{ fontSize: "20px", fontWeight: 800, color: "#005670", fontVariantNumeric: "tabular-nums" }}>{originatorSetCount}</div>
              <div style={{ fontSize: "11px", color: "#53565A" }}>of {totalDocuments} documents</div>
              <div style={{ marginTop: "6px", background: "#D0D0CE", borderRadius: "4px", height: "5px", overflow: "hidden" }}>
                <div style={{ width: `${Math.round((originatorSetCount / Math.max(totalDocuments, 1)) * 100)}%`, height: "100%", background: "#005670", borderRadius: "4px" }} />
              </div>
            </div>
            <div style={{ minWidth: "120px" }}>
              <div style={quickActionLabelStyle}>Reviewer set</div>
              <div style={{ fontSize: "20px", fontWeight: 800, color: "#005670", fontVariantNumeric: "tabular-nums" }}>{reviewerSetCount}</div>
              <div style={{ fontSize: "11px", color: "#53565A" }}>of {totalDocuments} documents</div>
              <div style={{ marginTop: "6px", background: "#D0D0CE", borderRadius: "4px", height: "5px", overflow: "hidden" }}>
                <div style={{ width: `${Math.round((reviewerSetCount / Math.max(totalDocuments, 1)) * 100)}%`, height: "100%", background: "#005670", borderRadius: "4px" }} />
              </div>
            </div>
            <div style={{ minWidth: "120px" }}>
              <div style={quickActionLabelStyle}>Approver set</div>
              <div style={{ fontSize: "20px", fontWeight: 800, color: "#005670", fontVariantNumeric: "tabular-nums" }}>{approverSetCount}</div>
              <div style={{ fontSize: "11px", color: "#53565A" }}>of {totalDocuments} documents</div>
              <div style={{ marginTop: "6px", background: "#D0D0CE", borderRadius: "4px", height: "5px", overflow: "hidden" }}>
                <div style={{ width: `${Math.round((approverSetCount / Math.max(totalDocuments, 1)) * 100)}%`, height: "100%", background: "#005670", borderRadius: "4px" }} />
              </div>
            </div>
            <div style={{ minWidth: "150px", paddingLeft: "20px", borderLeft: "1px solid #D0D0CE" }}>
              <div style={quickActionLabelStyle}>Fully populated</div>
              <div style={{ fontSize: "20px", fontWeight: 800, color: "#63B1BC", fontVariantNumeric: "tabular-nums" }}>{fullyPopulatedCount}</div>
              <div style={{ fontSize: "11px", color: "#53565A" }}>all 3 fields set · {Math.round((fullyPopulatedCount / Math.max(totalDocuments, 1)) * 100)}% of documents</div>
              <div style={{ marginTop: "6px", background: "#D0D0CE", borderRadius: "4px", height: "5px", overflow: "hidden" }}>
                <div style={{ width: `${Math.round((fullyPopulatedCount / Math.max(totalDocuments, 1)) * 100)}%`, height: "100%", background: "#63B1BC", borderRadius: "4px" }} />
              </div>
            </div>
          </section>
        </>
      ) : null}

      {activeView === "create" ? (
      <section style={createPanelSectionStyle}>
        {showCreatePanel ? (
          <SectionCard
            title="Create New Document"
            subtitle="Fill in the details below. Your document will be saved as a Draft — you can upload the file and submit it for review once it's created."
          >
            <form onSubmit={addDocument}>
            <div style={formLayoutStyle}>
              <FormSection title="Document Details">
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

              <FormSection title="Review Settings">
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

                {nextReviewDatePreview ? (
                  <div style={formSectionHintStyle}>
                    Next review will fall due: <strong>{formatDate(nextReviewDatePreview)}</strong>
                  </div>
                ) : null}
              </FormSection>

              <FormSection title="Originator">
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

                <div style={formSectionHintStyle}>
                  Reviewer and approver are selected from the document detail workflow after the document is created.
                </div>
              </FormSection>

              <FormSection title="Notes & Context">
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={formSectionHintStyle}>
                    You can upload the controlled document file once the record has been created.
                  </div>
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <Field label="Description">
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      style={compactTextareaStyle}
                      placeholder="Short description"
                    />
                  </Field>
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <Field label="General Comments">
                    <textarea
                      value={form.comments}
                      onChange={(e) => setForm({ ...form, comments: e.target.value })}
                      style={compactTextareaStyle}
                      placeholder="Optional notes for this document record"
                    />
                  </Field>
                </div>

              </FormSection>
            </div>

            <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid #D0D0CE" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <button type="submit" style={{ ...primaryButtonStyle, padding: "13px 28px", fontSize: "15px" }} disabled={isSaving || !canCreateDocument}>
                  {isSaving ? "Saving..." : "Create Draft Document →"}
                </button>
                <button
                  type="button"
                  style={secondaryButtonStyle}
                  onClick={() => setActiveView("dashboard")}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <span style={helperTextStyle}>Next sequence: {String(nextSequence).padStart(3, "0")}</span>
              </div>
              <p style={{ margin: "10px 0 0", fontSize: "13px", color: "#53565A" }}>
                Your document will be saved as a <strong>Draft</strong>. Open it from the Document Register to upload the file and submit it for review.
              </p>
            </div>
            </form>
          </SectionCard>
        ) : null}
      </section>
      ) : null}

      {["register", "workflow", "archive"].includes(activeView) ? (
      <section style={registerWorkspaceGridStyle}>
        <section id="document-register">
        <SectionCard
          title="Document Register"
          subtitle="Full-width register. Click a row to open the detail panel below."
        >
          <div className="ims-filter-panel" style={toolbarStyle}>
            <input
              placeholder="Search document no., title, owner or type"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={toolbarSearchStyle}
            />

            <button
              type="button"
              onClick={() => setShowRegisterFilters((prev) => !prev)}
              style={showRegisterFilters ? secondaryButtonStyle : primaryButtonStyle}
            >
              {showRegisterFilters ? "Hide Filters" : "Show Filters"}
            </button>
          </div>

          {showRegisterFilters ? (
            <div className="ims-filter-panel" style={toolbarFiltersStyle}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={toolbarSelectStyle}
              >
                <option value="">All Status</option>
                <option value="Draft">Draft</option>
                <option value="Not drafted">Not drafted</option>
                <option value="Proposed">Proposed</option>
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
                <option value="">All Workflow Status</option>
                <option value="Workflow">All Workflow Items</option>
                <option value="Draft">Draft</option>
                <option value="Pending Review">Pending Review</option>
                <option value="Reviewed">Reviewed</option>
                <option value="Pending Approval">Pending Approval</option>
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
          ) : null}

          <div style={tableInfoRowStyle}>
            Showing <strong>{filteredDocuments.length}</strong> of <strong>{documents.length}</strong>{" "}
            documents
          </div>

          <div className="ims-register-shell" style={registerTableWrapStyle}>
            <div className="ims-register-head" style={registerHeadStyle}>
              <div>Document No.</div>
              <div>Title</div>
              <div>Type</div>
              <div>Owner</div>
              <div>Revision</div>
              <div>Workflow</div>
              <div>Status</div>
              <div>Next Review</div>
            </div>

            <div style={registerBodyStyle}>
              {filteredDocuments.length === 0 ? (
                <div style={emptyRegisterStyle}>No documents match the current filters.</div>
              ) : (
                filteredDocuments.map((doc) => {
                  const reviewTone = getReviewTone(doc.next_review_date);
                  const workflowText = normalizeWorkflowStatus(doc.workflow_status, doc.review_approval_status, doc.status);
                  const workflowTone = getWorkflowTone(workflowText);

                  return (
                    <button
                      className="ims-register-row"
                      aria-pressed={selectedDocumentId === doc.id}
                      data-selected={selectedDocumentId === doc.id ? "true" : "false"}
                      key={doc.id}
                      type="button"
                      onClick={() => handleSelectDocument(doc.id)}
                      style={{
                        ...registerRowStyle,
                        background: selectedDocumentId === doc.id ? "#eef7f8" : "#ffffff",
                        borderLeft:
                          selectedDocumentId === doc.id ? "4px solid #005670" : "4px solid transparent",
                      }}
                    >
                      <div style={registerPrimaryStyle}>{doc.document_number}</div>
                      <div style={registerCellTextStyle}>{doc.title || "-"}</div>
                      <div style={registerCellTextStyle}>{doc.document_type || "-"}</div>
                      <div style={registerCellTextStyle}>{doc.department_owner || "-"}</div>
                      <div style={registerCellTextStyle}>{doc.current_revision || "-"}</div>
                      <div>
                        <span
                          style={{
                            ...reviewBadgeStyle,
                            background: workflowTone.bg,
                            color: workflowTone.color,
                          }}
                        >
                          {workflowText}
                        </span>
                      </div>
                      <div>
                        <StatusBadge value={getLegacyStatusForWorkflow(workflowText)} />
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

        <aside style={documentSidePanelStyle}>
          {selectedDocument ? (
            <>
              <div>
                <div style={detailEyebrowStyle}>Selected Document</div>
                <h3 style={sidePanelTitleStyle}>{selectedDocument.document_number}</h3>
                <p style={sidePanelSubtitleStyle}>{selectedDocument.title || "Untitled document"}</p>
              </div>

              <div style={sidePanelBadgeRowStyle}>
                <StatusBadge value={selectedDocument.status || "Unknown"} />
                <span
                  style={{
                    ...reviewBadgeStyle,
                    background: getReviewApprovalTone(normalizeApprovalStatus(selectedDocument.review_approval_status)).bg,
                    color: getReviewApprovalTone(normalizeApprovalStatus(selectedDocument.review_approval_status)).color,
                  }}
                >
                  {normalizeApprovalStatus(selectedDocument.review_approval_status)}
                </span>
              </div>

              <ControlSnapshotCard
                items={[
                  { label: "Revision", value: selectedDocument.current_revision || "-" },
                  ...(selectedDocument.document_scope === "Asset"
                    ? [{ label: "Linked Asset", value: getDocumentAssetContext(selectedDocument) }]
                    : []),
                  { label: "Owner", value: selectedDocument.department_owner || "-" },
                  { label: "Next Review", value: formatDate(selectedDocument.next_review_date) },
                  { label: "Originator", value: selectedDocument.originator_name || "-" },
                  { label: "Reviewer", value: selectedDocument.reviewed_by || "-" },
                  { label: "Approver", value: selectedDocument.approved_by || "-" },
                  { label: "Controlled File", value: selectedDocument.file_name ? "Uploaded" : "Missing" },
                ]}
              />

              <div style={sidePanelActionStackStyle}>
                {selectedDocument.file_path ? (
                  <button type="button" style={reportLinkButtonStyle} onClick={() => void openDocumentFile(selectedDocument.file_path || "")}>
                    Open Controlled File
                  </button>
                ) : null}
                <button type="button" style={primaryButtonStyle} onClick={() => setShowDetailPanel(true)}>
                  Open Full Detail / Edit
                </button>
              </div>
            </>
          ) : (
            <div style={emptyRevisionStyle}>Select a document to view its control summary.</div>
          )}
        </aside>
      </section>
      ) : null}

      {activeView === "reports" ? (
        <section style={reportsGridStyle}>
          <SectionCard title="Document Control Reports" subtitle="Generate focused review reports from the current document register.">
            <div style={reportActionGridStyle}>
              <button
                type="button"
                style={reportActionCardStyle}
                onClick={() => exportDocumentsReport("Overdue Document Review Report", overdueReviewDocuments)}
              >
                <span style={quickActionLabelStyle}>Overdue Review Report</span>
                <strong style={quickActionValueStyle}>{overdueReviewDocuments.length}</strong>
                <span style={reportActionHintStyle}>Documents past their next review date.</span>
              </button>

              <button
                type="button"
                style={reportActionCardStyle}
                onClick={() => exportDocumentsReport("Documents Due Soon Review Report", dueSoonDocuments)}
              >
                <span style={quickActionLabelStyle}>Due Soon Review Report</span>
                <strong style={quickActionValueStyle}>{dueSoonDocuments.length}</strong>
                <span style={reportActionHintStyle}>Documents due for review within 60 days.</span>
              </button>

              <button
                type="button"
                style={reportActionCardStyle}
                onClick={() => exportDocumentsReport("Master Document Register", filteredDocuments)}
              >
                <span style={quickActionLabelStyle}>Filtered Register Report</span>
                <strong style={quickActionValueStyle}>{filteredDocuments.length}</strong>
                <span style={reportActionHintStyle}>Uses the active search and filter state.</span>
              </button>
            </div>
          </SectionCard>
        </section>
      ) : null}

      {["register", "workflow", "archive"].includes(activeView) && showDetailPanel && selectedDocument ? (() => {
        const STAGES = ["Draft", "Review", "Approval", "Live"] as const;
        const stageIndex = ((): number => {
          if (selectedWorkflowStatus === "Draft" || selectedWorkflowStatus === "Rejected") return 0;
          if (selectedWorkflowStatus === "Pending Review" || selectedWorkflowStatus === "Reviewed") return 1;
          if (selectedWorkflowStatus === "Pending Approval") return 2;
          return 3;
        })();

        return (
          <section id="document-detail-panel" ref={detailPanelRef} style={{ marginTop: "20px" }}>
            <div style={drNewPanelStyle}>

              {/* Doc header */}
              <div style={drDocHeaderStyle}>
                <div style={{ minWidth: 0 }}>
                  <div style={drDocNumberStyle}>{selectedDocument.document_number}</div>
                  <h3 style={drDocTitleStyle}>{selectedDocument.title || "Untitled"}</h3>
                  <div style={drDocSubStyle}>
                    {[selectedDocument.department_owner, selectedDocument.document_type].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <div style={drDocHeaderRightStyle}>
                  {selectedDocument.current_revision ? (
                    <span style={drRevChipStyle}>Rev {selectedDocument.current_revision}</span>
                  ) : null}
                  <span style={{ ...badgeStyle, background: getWorkflowTone(selectedWorkflowStatus).bg, color: getWorkflowTone(selectedWorkflowStatus).color }}>
                    {selectedWorkflowStatus}
                  </span>
                  <button type="button" style={secondaryButtonStyle} onClick={() => setShowDetailPanel(false)}>
                    Hide
                  </button>
                </div>
              </div>

              {/* Stage rail */}
              <div style={drStageRailStyle}>
                {STAGES.map((stage, i) => (
                  <div key={stage} style={{ display: "flex", alignItems: "center", flex: i < STAGES.length - 1 ? "1 1 0" : undefined }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "5px", flexShrink: 0 }}>
                      <div style={{
                        width: "28px", height: "28px", borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "11px", fontWeight: 700,
                        background: i < stageIndex ? "#63B1BC" : i === stageIndex ? "#005670" : "#F4F3F0",
                        color: i <= stageIndex ? "#ffffff" : "#8A8E91",
                        border: i > stageIndex ? "1px solid #D0D0CE" : "none",
                        boxShadow: i === stageIndex ? "0 0 0 4px #EAF3F6" : "none",
                      }}>
                        {i < stageIndex ? "✓" : i + 1}
                      </div>
                      <div style={{
                        fontSize: "10.5px", fontWeight: i === stageIndex ? 700 : 600,
                        color: i < stageIndex ? "#63B1BC" : i === stageIndex ? "#005670" : "#8A8E91",
                        whiteSpace: "nowrap",
                      }}>
                        {stage}
                      </div>
                    </div>
                    {i < STAGES.length - 1 ? (
                      <div style={{ flex: 1, height: "2px", marginBottom: "15px", background: i < stageIndex ? "#63B1BC" : "#D0D0CE" }} />
                    ) : null}
                  </div>
                ))}
              </div>

              {/* Body: sidebar + tabbed main */}
              <div style={drBodyStyle}>

                {/* Sidebar */}
                <div style={drSidebarStyle}>

                  {/* Workflow action — compact, contextual */}
                  <div style={drActionBoxStyle}>
                    <div style={drActionLabelStyle}>{workflowActionTitle}</div>

                    {["Draft", "Rejected"].includes(selectedWorkflowStatus) ? (
                      <div style={{ display: "grid", gap: "8px" }}>
                        <Field label="Reviewer">
                          <PeopleSelector
                            inputId="document-workflow-reviewer"
                            value={detailPeopleSearch.reviewed_by}
                            selectedName={detailForm.reviewed_by}
                            people={people}
                            placeholder="Select reviewer"
                            onChange={(value) => createPersonSearchHandler("detail", "reviewed_by", value)}
                            onSelect={(person) => setDetailPersonField("reviewed_by", person)}
                            onBlur={() => handlePersonSearchBlur("detail", "reviewed_by")}
                            resolvedEmail={detailForm.reviewer_email}
                            warning={
                              detailPeopleSearch.reviewed_by.trim() && !detailReviewerPerson
                                ? "Must be selected from People."
                                : detailReviewerPerson && !detailForm.reviewer_email.trim()
                                ? "Reviewer has no email."
                                : ""
                            }
                          />
                        </Field>
                        <Field label="Approver">
                          <PeopleSelector
                            inputId="document-workflow-initial-approver"
                            value={detailPeopleSearch.approved_by}
                            selectedName={detailForm.approved_by}
                            people={people}
                            placeholder="Select approver"
                            onChange={(value) => createPersonSearchHandler("detail", "approved_by", value)}
                            onSelect={(person) => setDetailPersonField("approved_by", person)}
                            onBlur={() => handlePersonSearchBlur("detail", "approved_by")}
                            resolvedEmail={detailForm.approver_email}
                            warning={
                              detailPeopleSearch.approved_by.trim() && !detailApproverPerson
                                ? "Must be selected from People."
                                : detailApproverPerson && !detailForm.approver_email.trim()
                                ? "Approver has no email."
                                : ""
                            }
                          />
                        </Field>
                        <button type="button" style={{ ...primaryButtonStyle, width: "100%", justifyContent: "center" }} onClick={submitForReview} disabled={!canEditDocument}>
                          Send to Reviewer
                        </button>
                      </div>
                    ) : null}

                    {selectedWorkflowStatus === "Pending Review" ? (
                      <div style={{ display: "grid", gap: "8px" }}>
                        <button type="button" style={{ ...primaryButtonStyle, width: "100%", justifyContent: "center" }} onClick={markReviewed} disabled={!canEditDocument}>
                          Accept Review
                        </button>
                        <div style={drSidebarDividerStyle} />
                        <Field label="Rejected By">
                          <PeopleSelector
                            inputId="document-workflow-rejected-by"
                            value={detailPeopleSearch.rejected_by}
                            selectedName={detailForm.rejected_by}
                            people={people}
                            placeholder="Select person"
                            onChange={(value) => createPersonSearchHandler("detail", "rejected_by", value)}
                            onSelect={(person) => setDetailPersonField("rejected_by", person)}
                            onBlur={() => handlePersonSearchBlur("detail", "rejected_by")}
                            resolvedEmail={detailForm.rejected_by.trim() ? detailForm.approver_email : ""}
                            warning={
                              detailPeopleSearch.rejected_by.trim() && !detailRejectorPerson
                                ? "Must be selected from People."
                                : ""
                            }
                          />
                        </Field>
                        <Field label="Rejection Reason">
                          <textarea
                            value={detailForm.rejection_reason}
                            onChange={(e) => setDetailForm({ ...detailForm, rejection_reason: e.target.value })}
                            style={{ ...compactTextareaStyle, minHeight: "52px" }}
                            placeholder="Required if rejecting"
                          />
                        </Field>
                        <button type="button" style={{ ...rejectButtonStyle, width: "100%", justifyContent: "center" }} onClick={rejectDocument} disabled={!canEditDocument}>
                          Reject
                        </button>
                      </div>
                    ) : null}

                    {selectedWorkflowStatus === "Reviewed" ? (
                      <div style={{ display: "grid", gap: "8px" }}>
                        <Field label="Approver">
                          <PeopleSelector
                            inputId="document-workflow-approver"
                            value={detailPeopleSearch.approved_by}
                            selectedName={detailForm.approved_by}
                            people={people}
                            placeholder="Select approver"
                            onChange={(value) => createPersonSearchHandler("detail", "approved_by", value)}
                            onSelect={(person) => setDetailPersonField("approved_by", person)}
                            onBlur={() => handlePersonSearchBlur("detail", "approved_by")}
                            resolvedEmail={detailForm.approver_email}
                            warning={
                              detailPeopleSearch.approved_by.trim() && !detailApproverPerson
                                ? "Must be selected from People."
                                : detailApproverPerson && !detailForm.approver_email.trim()
                                ? "Approver has no email."
                                : ""
                            }
                          />
                        </Field>
                        <button type="button" style={{ ...primaryButtonStyle, width: "100%", justifyContent: "center" }} onClick={sendToApprover} disabled={!canEditDocument}>
                          Send to Approver
                        </button>
                      </div>
                    ) : null}

                    {selectedWorkflowStatus === "Pending Approval" ? (
                      <div style={{ display: "grid", gap: "8px" }}>
                        <button type="button" style={{ ...approveButtonStyle, width: "100%", justifyContent: "center" }} onClick={approveDocument} disabled={!canEditDocument}>
                          Approve Document
                        </button>
                        <div style={drSidebarDividerStyle} />
                        <Field label="Rejected By">
                          <PeopleSelector
                            inputId="document-workflow-rejected-by"
                            value={detailPeopleSearch.rejected_by}
                            selectedName={detailForm.rejected_by}
                            people={people}
                            placeholder="Select person"
                            onChange={(value) => createPersonSearchHandler("detail", "rejected_by", value)}
                            onSelect={(person) => setDetailPersonField("rejected_by", person)}
                            onBlur={() => handlePersonSearchBlur("detail", "rejected_by")}
                            resolvedEmail={detailForm.rejected_by.trim() ? detailForm.approver_email : ""}
                            warning={
                              detailPeopleSearch.rejected_by.trim() && !detailRejectorPerson
                                ? "Must be selected from People."
                                : ""
                            }
                          />
                        </Field>
                        <Field label="Rejection Reason">
                          <textarea
                            value={detailForm.rejection_reason}
                            onChange={(e) => setDetailForm({ ...detailForm, rejection_reason: e.target.value })}
                            style={{ ...compactTextareaStyle, minHeight: "52px" }}
                            placeholder="Required if rejecting"
                          />
                        </Field>
                        <button type="button" style={{ ...rejectButtonStyle, width: "100%", justifyContent: "center" }} onClick={rejectDocument} disabled={!canEditDocument}>
                          Reject
                        </button>
                      </div>
                    ) : null}

                    {selectedWorkflowStatus === "Approved" || selectedWorkflowStatus === "Superseded" || selectedWorkflowStatus === "Archived" ? (
                      <div style={{ display: "grid", gap: "8px" }}>
                        <p style={{ fontSize: "12px", color: "#53565A", lineHeight: 1.5, margin: 0 }}>{workflowActionHint}</p>
                        {selectedWorkflowStatus === "Approved" ? (
                          <button type="button" style={{ ...secondaryButtonStyle, width: "100%", justifyContent: "center" }} onClick={supersedeAndCreateNew} disabled={!canEditDocument || !canCreateDocument}>
                            Supersede &amp; Create New
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div style={drSidebarDividerStyle} />

                  {/* Reviewer + Approver people cards */}
                  <div style={{ display: "grid", gap: "12px" }}>
                    <div>
                      <div style={drSbStatLabelStyle}>Reviewer</div>
                      <div style={drPersonRowStyle}>
                        <div style={{ ...drAvatarStyle, background: "#63B1BC" }}>
                          {(detailForm.reviewed_by || selectedDocument.workflow_reviewer_name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={drPersonNameStyle}>{detailForm.reviewed_by || selectedDocument.workflow_reviewer_name || "Not set"}</div>
                          <div style={drPersonRoleStyle}>{detailForm.reviewer_email || selectedDocument.workflow_reviewer_email || ""}</div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div style={drSbStatLabelStyle}>Approver</div>
                      <div style={drPersonRowStyle}>
                        <div style={{ ...drAvatarStyle, background: "#53565A" }}>
                          {(detailForm.approved_by || selectedDocument.workflow_approver_name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={drPersonNameStyle}>{detailForm.approved_by || selectedDocument.workflow_approver_name || "Not set"}</div>
                          <div style={drPersonRoleStyle}>{detailForm.approver_email || selectedDocument.workflow_approver_email || ""}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={drSidebarDividerStyle} />

                  {/* Key metadata */}
                  <div style={{ display: "grid", gap: "12px" }}>
                    <div>
                      <div style={drSbStatLabelStyle}>Originator</div>
                      <div style={drSbStatValStyle}>{selectedDocument.originator_name || "—"}</div>
                    </div>
                    <div>
                      <div style={drSbStatLabelStyle}>Issue Date</div>
                      <div style={drSbStatValStyle}>{formatDate(selectedDocument.issue_date) || "—"}</div>
                    </div>
                    <div>
                      <div style={drSbStatLabelStyle}>Next Review</div>
                      <div style={drSbStatValStyle}>{formatDate(selectedDocument.next_review_date) || "—"}</div>
                    </div>
                    <div>
                      <div style={drSbStatLabelStyle}>Controlled File</div>
                      {selectedDocument.file_name ? (
                        <div style={drFileChipStyle}>
                          <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#065F46", flexShrink: 0, marginTop: "2px" }} />
                          <span style={{ flex: 1, fontSize: "12px", color: "#53565A", wordBreak: "break-all", overflowWrap: "anywhere" }}>
                            {selectedDocument.file_name}
                          </span>
                          {selectedDocument.file_path ? (
                            <button type="button" style={{ ...drFileOpenBtnStyle, alignSelf: "flex-start" }} onClick={() => void openDocumentFile(selectedDocument.file_path || "")}>
                              Open
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        <div style={{ fontSize: "12px", color: "#8A8E91" }}>No file uploaded</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tabbed main panel */}
                <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <div style={drTabBarStyle}>
                    {(["details", "file", "history"] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveDetailTab(tab)}
                        style={{
                          ...drTabStyle,
                          color: activeDetailTab === tab ? "#005670" : "#53565A",
                          borderBottom: activeDetailTab === tab ? "2px solid #005670" : "2px solid transparent",
                          fontWeight: activeDetailTab === tab ? 700 : 500,
                        }}
                      >
                        {tab === "details" ? "Details" : tab === "file" ? "File" : (
                          <>History {selectedRevisions.length > 0 ? <span style={drTabCountStyle}>{selectedRevisions.length}</span> : null}</>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Details tab */}
                  {activeDetailTab === "details" ? (
                    <div style={drPaneStyle}>
                      {detailForm.document_scope === "Asset" ? (
                        <>
                          <Field label="Linked Asset">
                            <input
                              value={getDocumentAssetContext({ asset_name: detailForm.asset_name, asset_code: detailForm.asset_code, asset_document_id_code: detailForm.asset_document_id_code })}
                              readOnly style={readOnlyInputStyle}
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
                        <input value={detailForm.title} onChange={(e) => setDetailForm({ ...detailForm, title: e.target.value })} style={inputStyle} />
                      </Field>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <Field label="Document Type">
                          <select value={detailForm.document_type} onChange={(e) => setDetailForm({ ...detailForm, document_type: e.target.value as DocumentTypeOption | "" })} style={inputStyle}>
                            <option value="">Select type</option>
                            {DOCUMENT_TYPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </Field>
                        <Field label="Department">
                          <select
                            value={detailForm.department_owner}
                            onChange={(e) => setDetailForm({ ...detailForm, department_owner: e.target.value as DepartmentOwnerOption | "" })}
                            style={detailForm.document_scope === "Asset" ? disabledInputStyle : inputStyle}
                            disabled={detailForm.document_scope === "Asset"}
                          >
                            <option value="">Select department</option>
                            {DEPARTMENT_OWNER_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </Field>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <Field label="Current Revision">
                          <input
                            value={detailForm.current_revision}
                            onChange={(e) => setDetailForm({ ...detailForm, current_revision: e.target.value.toUpperCase().slice(0, 1) })}
                            style={inputStyle}
                          />
                        </Field>
                        <Field label="Review Cycle">
                          <select value={detailForm.review_cycle_years} onChange={(e) => setDetailForm({ ...detailForm, review_cycle_years: Number(e.target.value) as 1 | 2 | 3 })} style={inputStyle}>
                            <option value={1}>1 year</option>
                            <option value={2}>2 years</option>
                            <option value={3}>3 years</option>
                          </select>
                        </Field>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <Field label="Issue Date">
                          <input type="date" value={detailForm.issue_date} onChange={(e) => setDetailForm({ ...detailForm, issue_date: e.target.value })} style={inputStyle} />
                        </Field>
                        <Field label="Next Review Date">
                          <input
                            value={detailReviewDatePreview ? formatDate(detailReviewDatePreview) : selectedDocument.next_review_date ? formatDate(selectedDocument.next_review_date) : "-"}
                            readOnly style={readOnlyInputStyle}
                          />
                        </Field>
                      </div>

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

                      <Field label="Description">
                        <textarea value={detailForm.description} onChange={(e) => setDetailForm({ ...detailForm, description: e.target.value })} style={textareaStyle} />
                      </Field>

                      <Field label="General Comments">
                        <textarea value={detailForm.comments} onChange={(e) => setDetailForm({ ...detailForm, comments: e.target.value })} style={textareaStyle} />
                      </Field>

                      {selectedWorkflowStatus === "Rejected" && detailForm.rejection_reason.trim() ? (
                        <Field label="Rejection Reason">
                          <textarea value={detailForm.rejection_reason} readOnly style={textareaStyle} />
                        </Field>
                      ) : null}
                    </div>
                  ) : null}

                  {/* File tab */}
                  {activeDetailTab === "file" ? (
                    <div style={drPaneStyle}>
                      {selectedDocument.file_name ? (
                        <div style={drCurFileStyle}>
                          <div style={drFileIconStyle}>📄</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "13px", fontWeight: 700, color: "#000000", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {selectedDocument.file_name}
                            </div>
                            <div style={{ fontSize: "11px", color: "#53565A", marginTop: "2px" }}>
                              Rev {selectedDocument.current_revision || "—"} · {formatFileSize(selectedDocument.file_size)} · Uploaded {formatDateTime(selectedDocument.uploaded_at)}
                            </div>
                          </div>
                          {selectedDocument.file_path ? (
                            <button type="button" style={secondaryButtonStyle} onClick={() => void openDocumentFile(selectedDocument.file_path || "")}>
                              Open ↗
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        <div style={{ padding: "14px", border: "1px dashed #D0D0CE", borderRadius: "8px", color: "#53565A", fontSize: "13px" }}>
                          No controlled file uploaded yet for this revision.
                        </div>
                      )}

                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        <label className="audit-upload-label" style={uploadButtonStyle}>
                          {isUploadingFile ? "Uploading..." : "Upload new version"}
                          <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" onChange={handleControlledFileUpload} style={{ display: "none" }} disabled={isUploadingFile || !canEditDocument} />
                        </label>
                        <button type="button" style={secondaryButtonStyle} onClick={issueNextRevision} disabled={!canEditDocument}>
                          Up-rev to {getNextRevision(selectedDocument.current_revision || "A")}
                        </button>
                        {selectedDocument.workflow_status === "Approved" ? (
                          <button
                            type="button"
                            style={{ ...secondaryButtonStyle, color: "#1A6B3C", borderColor: "#A3C9B3" }}
                            onClick={markReviewedNoChanges}
                            disabled={!canEditDocument}
                            title="Record that this document has been reviewed and requires no changes — updates the next review date without up-revving"
                          >
                            Mark reviewed — no changes
                          </button>
                        ) : null}
                        {selectedDocument.file_name ? (
                          <button type="button" style={{ ...secondaryButtonStyle, color: "#B83232", borderColor: "#E4AEAE" }} onClick={removeControlledFile} disabled={!canEditDocument}>
                            Remove file
                          </button>
                        ) : null}
                      </div>

                      <div style={{ fontSize: "12px", color: "#8A8E91", lineHeight: 1.5 }}>
                        Files are view / download only — no editing in the system. Upload new version to replace the current file on this revision. Up-rev creates a new formal revision and resets the workflow. Mark reviewed — no changes records the review date and adds a history entry without incrementing the revision.
                      </div>
                    </div>
                  ) : null}

                  {/* History tab */}
                  {activeDetailTab === "history" ? (
                    <div style={drPaneStyle}>
                      {selectedRevisions.length === 0 ? (
                        <div style={emptyRevisionStyle}>No revision history files uploaded yet.</div>
                      ) : (
                        <div style={revisionListStyle}>
                          {selectedRevisions.map((revision) => (
                            <RevisionRow
                              key={revision.id}
                              revision={revision}
                              fallbackReviewedBy={revision.is_current ? selectedDocument.reviewed_by || selectedDocument.workflow_reviewer_name || "" : ""}
                              fallbackReviewedAt={revision.is_current ? selectedDocument.reviewed_at || "" : ""}
                              fallbackApprovedBy={revision.is_current ? selectedDocument.approved_by || selectedDocument.workflow_approver_name || "" : ""}
                              fallbackApprovedAt={revision.is_current ? selectedDocument.approved_at || "" : ""}
                              fallbackIssueDate={selectedDocument.issue_date || ""}
                              onOpenFile={(path) => void openDocumentFile(path)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* Panel footer — always visible, outside the scrollable pane */}
                  <div style={drPanelFooterStyle}>
                    <button type="button" style={primaryButtonStyle} onClick={saveDocumentChanges} disabled={isSaving || !canEditDocument}>
                      {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                    <div style={{ flex: 1 }} />
                    <button type="button" style={dangerButtonStyle} onClick={deleteSelectedDocument} disabled={!canEditDocument}>
                      Delete Document
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      })() : null}
    </main>
  );
}

function RevisionRow({
  revision,
  fallbackReviewedBy,
  fallbackReviewedAt,
  fallbackApprovedBy,
  fallbackApprovedAt,
  fallbackIssueDate,
  onOpenFile,
}: {
  revision: DocumentRevisionRow;
  fallbackReviewedBy?: string;
  fallbackReviewedAt?: string;
  fallbackApprovedBy?: string;
  fallbackApprovedAt?: string;
  fallbackIssueDate?: string;
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
            <span style={{ ...reviewBadgeStyle, background: "#ECECE7", color: "#005670" }}>
              Current
            </span>
          ) : (
            <span style={{ ...reviewBadgeStyle, background: "#D0D0CE", color: "#53565A" }}>
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
          <div style={revisionInfoValueStyle}>{formatDate(revision.issue_date || fallbackIssueDate)}</div>
        </div>
        <div style={revisionInfoBlockStyle}>
          <div style={revisionInfoLabelStyle}>Reviewed By</div>
          <div style={revisionInfoValueStyle}>{revision.reviewed_by || fallbackReviewedBy || "-"}</div>
        </div>
        <div style={revisionInfoBlockStyle}>
          <div style={revisionInfoLabelStyle}>Reviewed Date</div>
          <div style={revisionInfoValueStyle}>{formatDate(revision.reviewed_at || fallbackReviewedAt)}</div>
        </div>
        <div style={revisionInfoBlockStyle}>
          <div style={revisionInfoLabelStyle}>Approved By</div>
          <div style={revisionInfoValueStyle}>{revision.approved_by || fallbackApprovedBy || "-"}</div>
        </div>
        <div style={revisionInfoBlockStyle}>
          <div style={revisionInfoLabelStyle}>Approved Date</div>
          <div style={revisionInfoValueStyle}>{formatDate(revision.approved_at || fallbackApprovedAt)}</div>
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
                    ? "#ECECE7"
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
  alignItems: "center",
  background: "rgba(255,255,255,0.92)",
  border: "1px solid #D0D0CE",
  borderRadius: "14px",
  padding: "12px 14px",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
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

const documentViewNavStyle: CSSProperties = {
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

const statsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "16px",
  marginBottom: "20px",
};

const dashboardPanelGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "16px",
  marginBottom: "20px",
};

const quickActionGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
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
  color: "#53565A",
};

const inputStyle: CSSProperties = {
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #D0D0CE",
  background: "white",
  color: "#000000",
  width: "100%",
  boxSizing: "border-box",
};

const readOnlyInputStyle: CSSProperties = {
  ...inputStyle,
  background: "#ECECE7",
  color: "#53565A",
};

const disabledInputStyle: CSSProperties = {
  ...inputStyle,
  background: "#ECECE7",
  color: "#D0D0CE",
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
  border: "1px solid #D0D0CE",
  borderRadius: "12px",
  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.12)",
  overflow: "hidden",
};

const peopleSuggestionButtonStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "none",
  background: "#ffffff",
  color: "#000000",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  cursor: "pointer",
  textAlign: "left",
  fontSize: "14px",
};

const peopleSuggestionMetaStyle: CSSProperties = {
  color: "#53565A",
  fontSize: "12px",
  whiteSpace: "nowrap",
};

const peopleSelectorHintStyle: CSSProperties = {
  fontSize: "12px",
  color: "#53565A",
};

const peopleSelectorWarningStyle: CSSProperties = {
  fontSize: "12px",
  color: "#000000",
  fontWeight: 600,
};

const notificationListStyle: CSSProperties = {
  border: "1px solid #ECECE7",
  background: "#ECECE7",
  borderRadius: "12px",
  padding: "10px 12px",
  display: "grid",
  gap: "8px",
};

const notificationListHeaderStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  color: "#53565A",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const snapshotMetaGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "10px",
};

const snapshotMetaItemStyle: CSSProperties = {
  border: "1px solid #D0D0CE",
  background: "#ECECE7",
  borderRadius: "12px",
  padding: "10px 12px",
  display: "grid",
  gap: "4px",
};

const snapshotMetaLabelStyle: CSSProperties = {
  fontSize: "11px",
  fontWeight: 800,
  color: "#53565A",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const snapshotMetaValueStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 700,
  color: "#000000",
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
  color: "#53565A",
};

const notificationListRowValueStyle: CSSProperties = {
  fontSize: "13px",
  color: "#000000",
  textAlign: "right",
  overflowWrap: "anywhere",
};

const notificationMissingTextStyle: CSSProperties = {
  ...notificationListRowValueStyle,
  color: "#000000",
  fontWeight: 600,
};

const notificationListEmptyStyle: CSSProperties = {
  fontSize: "13px",
  color: "#53565A",
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
  border: "1px solid #D0D0CE",
  background: "white",
  color: "#000000",
  resize: "vertical",
  fontFamily: "\"Azo Sans\", \"Segoe UI\", Arial, Helvetica, sans-serif",
  boxSizing: "border-box",
};

const textareaStyle: CSSProperties = {
  width: "100%",
  minHeight: "92px",
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #D0D0CE",
  background: "white",
  color: "#000000",
  resize: "vertical",
  fontFamily: "\"Azo Sans\", \"Segoe UI\", Arial, Helvetica, sans-serif",
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

const workflowActionPanelStyle: CSSProperties = {
  border: "1px solid #ECECE7",
  background: "#ECECE7",
  borderRadius: "16px",
  padding: "16px",
  display: "grid",
  gap: "14px",
};

const workflowActionTitleStyle: CSSProperties = {
  margin: "3px 0",
  color: "#000000",
  fontSize: "20px",
  lineHeight: 1.2,
};

const workflowActionHintStyle: CSSProperties = {
  margin: 0,
  color: "#53565A",
  fontSize: "14px",
  lineHeight: 1.45,
};

const workflowActionGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(260px, 1fr) auto",
  gap: "12px",
  alignItems: "end",
};

const workflowRejectGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(220px, 0.8fr) minmax(260px, 1fr) auto",
  gap: "12px",
  alignItems: "end",
  borderTop: "1px solid #D0D0CE",
  paddingTop: "12px",
};

const workflowActionButtonWrapStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  flexWrap: "wrap",
};

const workflowParticipantCardStyle: CSSProperties = {
  border: "1px solid #D0D0CE",
  background: "#ffffff",
  borderRadius: "12px",
  padding: "11px 12px",
  display: "grid",
  gap: "4px",
  color: "#000000",
  fontSize: "13px",
  minHeight: "58px",
};

const workflowParticipantLabelStyle: CSSProperties = {
  color: "#53565A",
  fontSize: "11px",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const workflowRoutingSummaryStyle: CSSProperties = {
  gridColumn: "1 / -1",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "10px",
};

const formLayoutStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
};

const formSectionStyle: CSSProperties = {
  border: "1px solid #D0D0CE",
  borderRadius: "14px",
  padding: "14px",
  background: "#ECECE7",
  display: "grid",
  gap: "10px",
};

const formSectionTitleStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 800,
  color: "#005670",
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
  color: "#53565A",
  background: "#ffffff",
  border: "1px dashed #D0D0CE",
  borderRadius: "10px",
  padding: "10px 12px",
};

const helperTextStyle: CSSProperties = {
  fontSize: "13px",
  color: "#53565A",
  fontWeight: 700,
};

const primaryButtonStyle: CSSProperties = {
  background: "#005670",
  color: "white",
  border: "none",
  padding: "10px 16px",
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

const workflowButtonStyle: CSSProperties = {
  background: "#ECECE7",
  color: "#005670",
  border: "none",
  padding: "10px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 700,
};

const approveButtonStyle: CSSProperties = {
  background: "#ECECE7",
  color: "#005670",
  border: "none",
  padding: "10px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 700,
};

const rejectButtonStyle: CSSProperties = {
  background: "#ECECE7",
  color: "#F93822",
  border: "none",
  padding: "10px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 700,
};

const dangerButtonStyle: CSSProperties = {
  background: "#F93822",
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
  background: "#005670",
  color: "#ffffff",
  borderRadius: "10px",
  padding: "10px 16px",
  fontWeight: 700,
  cursor: "pointer",
  width: "100%",
  minHeight: "42px",
  boxSizing: "border-box",
  textAlign: "center",
  lineHeight: 1.2,
};

const reportLinkButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#ECECE7",
  color: "#005670",
  borderRadius: "10px",
  padding: "10px 16px",
  fontWeight: 700,
  textDecoration: "none",
  width: "100%",
  minHeight: "42px",
  boxSizing: "border-box",
  textAlign: "center",
  lineHeight: 1.2,
};

const fileActionButtonStyle: CSSProperties = {
  width: "100%",
  minHeight: "42px",
  boxSizing: "border-box",
  textAlign: "center",
  lineHeight: 1.2,
};

const reportButtonStyle: CSSProperties = {
  background: "#005670",
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

const registerWorkspaceGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: "16px",
  alignItems: "start",
};

const documentSidePanelStyle: CSSProperties = {
  display: "none",
  background: "#ffffff",
  borderRadius: "18px",
  padding: "18px",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
  border: "1px solid #D0D0CE",
  gap: "14px",
  position: "sticky",
  top: "96px",
  maxHeight: "calc(100vh - 116px)",
  overflowY: "auto",
  alignSelf: "start",
};

const sidePanelTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "22px",
  color: "#000000",
  wordBreak: "break-word",
};

const sidePanelSubtitleStyle: CSSProperties = {
  margin: "6px 0 0",
  color: "#53565A",
  fontSize: "14px",
  lineHeight: 1.45,
};

const sidePanelBadgeRowStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const sidePanelActionStackStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
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

const reportActionHintStyle: CSSProperties = {
  color: "#53565A",
  fontSize: "13px",
  lineHeight: 1.45,
};

const toolbarFiltersStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "10px",
  marginBottom: "12px",
  padding: "12px",
  background: "#ECECE7",
  border: "1px solid #D0D0CE",
  borderRadius: "14px",
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

const registerHeadStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.15fr 3fr 0.9fr 0.95fr 0.65fr 1.15fr 0.9fr 1fr",
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

const registerRowStyle: CSSProperties = {
  width: "100%",
  textAlign: "left",
  display: "grid",
  gridTemplateColumns: "1.15fr 3fr 0.9fr 0.95fr 0.65fr 1.15fr 0.9fr 1fr",
  gap: "8px",
  padding: "10px",
  border: "none",
  borderBottom: "1px solid #D0D0CE",
  borderLeft: "4px solid transparent",
  cursor: "pointer",
  alignItems: "center",
};

const registerPrimaryStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 800,
  color: "#000000",
  lineHeight: 1.35,
  wordBreak: "break-word",
};

const registerCellTextStyle: CSSProperties = {
  fontSize: "12px",
  color: "#53565A",
  lineHeight: 1.45,
  wordBreak: "break-word",
};

const emptyRegisterStyle: CSSProperties = {
  padding: "24px 16px",
  color: "#53565A",
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
  color: "#53565A",
  textTransform: "uppercase",
  marginBottom: "6px",
};

const detailTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "22px",
  color: "#000000",
};

const fileStripStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: "14px",
  border: "1px solid #ECECE7",
  background: "linear-gradient(180deg, #ECECE7 0%, #ECECE7 100%)",
  borderRadius: "16px",
  padding: "16px",
  alignItems: "stretch",
};

const fileMetaWrapStyle: CSSProperties = {
  display: "grid",
  gap: "6px",
  minWidth: 0,
};

const fileMetaTitleStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 800,
  color: "#53565A",
  textTransform: "uppercase",
};

const fileMetaFileStyle: CSSProperties = {
  fontSize: "16px",
  fontWeight: 800,
  color: "#000000",
  wordBreak: "break-word",
  overflowWrap: "anywhere",
};

const fileMetaSubStyle: CSSProperties = {
  fontSize: "13px",
  color: "#53565A",
  lineHeight: 1.45,
};

const fileButtonsWrapStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "10px",
  width: "100%",
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
  border: "1px dashed #D0D0CE",
  borderRadius: "12px",
  padding: "14px",
  color: "#53565A",
  background: "#ECECE7",
};

const revisionCardStyle: CSSProperties = {
  border: "1px solid #D0D0CE",
  borderRadius: "14px",
  padding: "14px",
  background: "#ECECE7",
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
  color: "#000000",
};

const revisionMetaStyle: CSSProperties = {
  fontSize: "13px",
  color: "#53565A",
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
  border: "1px solid #D0D0CE",
  borderRadius: "10px",
  padding: "10px",
};

const revisionInfoLabelStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  color: "#53565A",
  marginBottom: "4px",
};

const revisionInfoValueStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 700,
  color: "#000000",
};

const revisionNoteStyle: CSSProperties = {
  marginTop: "12px",
  fontSize: "13px",
  color: "#53565A",
  lineHeight: 1.5,
};

/* ── Document Record: new combined layout ── */
const drNewPanelStyle: CSSProperties = {
  border: "1px solid #D0D0CE",
  borderRadius: "14px",
  background: "#ffffff",
  overflow: "hidden",
  boxShadow: "0 4px 14px rgba(0,0,0,.07)",
};

const drDocHeaderStyle: CSSProperties = {
  padding: "18px 22px",
  borderBottom: "1px solid #D0D0CE",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "16px",
};

const drDocNumberStyle: CSSProperties = {
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: ".09em",
  color: "#8A8E91",
  marginBottom: "3px",
  fontVariantNumeric: "tabular-nums",
};

const drDocTitleStyle: CSSProperties = {
  fontSize: "17px",
  fontWeight: 800,
  color: "#000000",
  lineHeight: 1.3,
  margin: 0,
};

const drDocSubStyle: CSSProperties = {
  fontSize: "12px",
  color: "#53565A",
  marginTop: "4px",
};

const drDocHeaderRightStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexShrink: 0,
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const drRevChipStyle: CSSProperties = {
  background: "#F4F3F0",
  border: "1px solid #D0D0CE",
  borderRadius: "5px",
  padding: "3px 9px",
  fontSize: "12px",
  fontWeight: 700,
  color: "#53565A",
  whiteSpace: "nowrap",
};

const drStageRailStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: "16px 28px",
  borderBottom: "1px solid #D0D0CE",
  background: "#F4F3F0",
};

const drBodyStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "220px minmax(0, 1fr)",
  minHeight: "460px",
  overflow: "hidden",
};

const drSidebarStyle: CSSProperties = {
  borderRight: "1px solid #D0D0CE",
  background: "#F9F8F6",
  padding: "18px 16px",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  overflowY: "auto",
  overflowX: "hidden",
  minWidth: 0,
};

const drSidebarDividerStyle: CSSProperties = {
  height: "1px",
  background: "#D0D0CE",
};

const drActionBoxStyle: CSSProperties = {
  background: "#EAF3F6",
  border: "1px solid #63B1BC",
  borderLeft: "3px solid #005670",
  borderRadius: "7px",
  padding: "12px",
};

const drActionLabelStyle: CSSProperties = {
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: ".09em",
  textTransform: "uppercase",
  color: "#005670",
  marginBottom: "10px",
};

const drSbStatLabelStyle: CSSProperties = {
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: ".09em",
  textTransform: "uppercase",
  color: "#8A8E91",
  marginBottom: "4px",
};

const drSbStatValStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: "#000000",
};

const drPersonRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const drAvatarStyle: CSSProperties = {
  width: "26px",
  height: "26px",
  borderRadius: "50%",
  color: "#ffffff",
  fontWeight: 700,
  fontSize: "11px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const drPersonNameStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "#000000",
};

const drPersonRoleStyle: CSSProperties = {
  fontSize: "11px",
  color: "#53565A",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  maxWidth: "148px",
};

const drFileChipStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "7px",
  background: "#ffffff",
  border: "1px solid #D0D0CE",
  borderRadius: "6px",
  padding: "6px 10px",
  marginTop: "2px",
};

const drFileOpenBtnStyle: CSSProperties = {
  background: "none",
  border: "none",
  color: "#005670",
  fontSize: "11px",
  fontWeight: 700,
  cursor: "pointer",
  padding: 0,
  flexShrink: 0,
};

const drTabBarStyle: CSSProperties = {
  display: "flex",
  borderBottom: "1px solid #D0D0CE",
  padding: "0 18px",
};

const drTabStyle: CSSProperties = {
  padding: "11px 13px",
  fontSize: "13px",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  marginBottom: "-1px",
  fontFamily: "inherit",
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

const drTabCountStyle: CSSProperties = {
  fontSize: "10.5px",
  fontWeight: 600,
  background: "#F4F3F0",
  border: "1px solid #D0D0CE",
  borderRadius: "999px",
  padding: "0 6px",
  color: "#53565A",
};

const drPaneStyle: CSSProperties = {
  padding: "18px",
  display: "flex",
  flexDirection: "column",
  gap: "13px",
  overflowY: "auto",
  overflowX: "hidden",
  minWidth: 0,
};

const drCurFileStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  background: "#F4F3F0",
  border: "1px solid #D0D0CE",
  borderRadius: "8px",
  padding: "12px 14px",
};

const drFileIconStyle: CSSProperties = {
  width: "36px",
  height: "36px",
  borderRadius: "7px",
  background: "#EAF3F6",
  color: "#005670",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "17px",
  flexShrink: 0,
};

const drPanelFooterStyle: CSSProperties = {
  padding: "12px 18px",
  borderTop: "1px solid #D0D0CE",
  background: "#F4F3F0",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexShrink: 0,
};
export default function DocumentsPage() {
  return (
    <Suspense fallback={<main style={{ padding: "24px" }}>Loading documents...</main>}>
      <DocumentsPageContent />
    </Suspense>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
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

type DocumentRow = {
  id: string;
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
  reviewed_at: string | null;
  approved_by: string | null;
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

type DocumentForm = {
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
  reviewed_at: string;
  approved_by: string;
  approved_at: string;
  rejected_by: string;
  rejected_at: string;
  rejection_reason: string;
  notification_emails: string[];
  comments: string;
};

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
  originator_name: DEFAULT_USER_NAME,
  originator_email: DEFAULT_USER_EMAIL,
  reviewed_by: "",
  reviewed_at: "",
  approved_by: "",
  approved_at: "",
  rejected_by: "",
  rejected_at: "",
  rejection_reason: "",
  notification_emails: [DEFAULT_USER_EMAIL],
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

function buildDocumentNumber(
  departmentOwner: DepartmentOwnerOption | "",
  documentType: DocumentTypeOption | "",
  nextSequence: number
) {
  const prefix = buildDocumentPrefix(departmentOwner, documentType);
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

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [revisionsByDocumentId, setRevisionsByDocumentId] = useState<Record<string, DocumentRevisionRow[]>>({});
  const [contacts, setContacts] = useState<NotificationContactRow[]>([]);
  const [message, setMessage] = useState("Loading documents...");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [reviewFilter, setReviewFilter] = useState("");
  const [approvalFilter, setApprovalFilter] = useState("");
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [showDetailPanel, setShowDetailPanel] = useState(false);

  const [form, setForm] = useState<DocumentForm>(emptyForm);
  const [detailForm, setDetailForm] = useState<DocumentForm>(emptyForm);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [selectedDocumentUrl, setSelectedDocumentUrl] = useState("");
  const [nextSequence, setNextSequence] = useState(1);

  async function loadDocuments() {
    const [
      { data: documentsData, error: documentsError },
      { data: revisionsData, error: revisionsError },
      { data: contactsData, error: contactsError },
    ] = await Promise.all([
      supabase.from("documents").select("*").order("document_number", { ascending: true }),
      supabase.from("document_revisions").select("*").order("uploaded_at", { ascending: false }),
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

    const fallbackContacts: NotificationContactRow[] = [
      {
        id: "default-jordan",
        first_name: "Jordan",
        last_name: "Beaton",
        email: DEFAULT_USER_EMAIL,
        active: true,
      },
    ];

    setDocuments(rows);
    setRevisionsByDocumentId(grouped);
    setContacts(contactsError ? fallbackContacts : ((contactsData as NotificationContactRow[]) || fallbackContacts));
    setSelectedDocumentId((current) => current || rows[0]?.id || "");
    setMessage(`Loaded ${rows.length} document${rows.length === 1 ? "" : "s"} successfully.`);
  }

  useEffect(() => {
    void loadDocuments();
  }, []);

  useEffect(() => {
    let isActive = true;

    async function updateNextNumber() {
      const prefix = buildDocumentPrefix(form.department_owner, form.document_type);

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
        document_number: buildDocumentNumber(prev.department_owner, prev.document_type, next),
      }));
    }

    void updateNextNumber();

    return () => {
      isActive = false;
    };
  }, [form.department_owner, form.document_type, documents]);

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
        (doc.department_owner || "").toLowerCase().includes(lower);

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

  const selectedRevisions = useMemo(() => {
    if (!selectedDocumentId) return [];
    return revisionsByDocumentId[selectedDocumentId] || [];
  }, [revisionsByDocumentId, selectedDocumentId]);

  useEffect(() => {
    if (!selectedDocument) return;

    setDetailForm({
      document_type: (selectedDocument.document_type as DocumentTypeOption) || "",
      document_number: selectedDocument.document_number || "",
      title: selectedDocument.title || "",
      description: selectedDocument.description || "",
      department_owner: (selectedDocument.department_owner as DepartmentOwnerOption) || "",
      status: (selectedDocument.status as DocumentStatus) || "Draft",
      review_approval_status: normalizeApprovalStatus(selectedDocument.review_approval_status),
      current_revision: selectedDocument.current_revision || "A",
      issue_date: selectedDocument.issue_date || "",
      review_cycle_years: (selectedDocument.review_cycle_years as 1 | 2 | 3) || 1,
      originator_name: selectedDocument.originator_name || DEFAULT_USER_NAME,
      originator_email: selectedDocument.originator_email || DEFAULT_USER_EMAIL,
      reviewed_by: selectedDocument.reviewed_by || "",
      reviewed_at: selectedDocument.reviewed_at ? selectedDocument.reviewed_at.slice(0, 10) : "",
      approved_by: selectedDocument.approved_by || "",
      approved_at: selectedDocument.approved_at ? selectedDocument.approved_at.slice(0, 10) : "",
      rejected_by: selectedDocument.rejected_by || "",
      rejected_at: selectedDocument.rejected_at ? selectedDocument.rejected_at.slice(0, 10) : "",
      rejection_reason: selectedDocument.rejection_reason || "",
      notification_emails: selectedDocument.notification_emails?.length
        ? selectedDocument.notification_emails
        : [DEFAULT_USER_EMAIL],
      comments: selectedDocument.comments || "",
    });
  }, [selectedDocument]);

  useEffect(() => {
    const path = selectedDocument?.file_path || "";

    if (!path) {
      setSelectedDocumentUrl("");
      return;
    }

    void (async () => {
      const url = await createSignedFileUrl(path);
      setSelectedDocumentUrl(url);
    })();
  }, [selectedDocument?.file_path]);

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

  const nextReviewDatePreview = buildNextReviewDate(form.issue_date, form.review_cycle_years);
  const detailReviewDatePreview = buildNextReviewDate(detailForm.issue_date, detailForm.review_cycle_years);

  async function notifyDocumentEvent(
    eventType: NotificationEventType,
    source: DocumentForm,
    documentNumber: string,
    documentTitle: string,
    extraMessage?: string
  ) {
    const recipientEmails = uniqueEmails([
      source.originator_email,
      ...source.notification_emails,
      DEFAULT_USER_EMAIL,
    ]);

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
          originatorName: source.originator_name,
          originatorEmail: source.originator_email,
          recipientEmails,
          message: extraMessage || "",
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Notification send failed");
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : "Notification send failed";
      setMessage(`Document updated, but email notification failed: ${text}`);
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

    if (!form.originator_name.trim() || !form.originator_email.trim()) {
      setMessage("Originator name and originator email are required.");
      return;
    }

    if (form.status === "Live" && form.review_approval_status !== "Approved") {
      setMessage("A document cannot go Live until it has been reviewed and approved.");
      return;
    }

    setIsSaving(true);

    const { data, error } = await supabase
      .from("documents")
      .insert({
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
        approved_at: form.approved_at || null,
        rejected_by: form.rejected_by.trim() || null,
        rejected_at: form.rejected_at || null,
        rejection_reason: form.rejection_reason.trim() || null,
        notification_emails: uniqueEmails(form.notification_emails),
        comments: form.comments.trim() || null,
      })
      .select("*")
      .single();

    setIsSaving(false);

    if (error || !data) {
      setMessage(`Add document failed: ${error?.message || "Unknown error"}`);
      return;
    }

    setForm(emptyForm);
    setSelectedDocumentId((data as DocumentRow).id);
    setShowDetailPanel(true);
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

    if (!detailForm.originator_name.trim() || !detailForm.originator_email.trim()) {
      setMessage("Originator name and originator email are required.");
      return;
    }

    if (detailForm.status === "Live" && detailForm.review_approval_status !== "Approved") {
      setMessage("A document cannot go Live until it has been reviewed and approved.");
      return;
    }

    setIsSaving(true);

    const { error } = await supabase
      .from("documents")
      .update({
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
        approved_at: detailForm.approved_at || null,
        rejected_by: detailForm.rejected_by.trim() || null,
        rejected_at: detailForm.rejected_at || null,
        rejection_reason: detailForm.rejection_reason.trim() || null,
        notification_emails: uniqueEmails(detailForm.notification_emails),
        comments: detailForm.comments.trim() || null,
      })
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

  const payload = {
  status: "Under Review" as DocumentStatus,
  review_approval_status: "Pending Review" as ReviewApprovalStatus,
  originator_name: detailForm.originator_name.trim(),
  originator_email: detailForm.originator_email.trim(),
  notification_emails: uniqueEmails(detailForm.notification_emails),
  comments: detailForm.comments.trim(),
};

    const { error } = await supabase.from("documents").update(payload).eq("id", selectedDocument.id);

    if (error) {
      setMessage(`Submit for review failed: ${error.message}`);
      return;
    }

    await notifyDocumentEvent(
      "submitted_for_review",
      { ...detailForm, ...payload },
      selectedDocument.document_number,
      detailForm.title.trim(),
      detailForm.comments.trim()
    );

    setMessage("Document submitted for review.");
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

    const reviewDate = todayIsoDate();

const payload = {
  status: "Under Review" as DocumentStatus,
  review_approval_status: "Reviewed" as ReviewApprovalStatus,
  reviewed_by: detailForm.reviewed_by.trim() || DEFAULT_USER_NAME,
  reviewed_at: detailForm.reviewed_at || reviewDate,
  rejected_by: "",
  rejected_at: "",
  rejection_reason: "",
  notification_emails: uniqueEmails(detailForm.notification_emails),
};

    const { error } = await supabase.from("documents").update(payload).eq("id", selectedDocument.id);

    if (error) {
      setMessage(`Mark reviewed failed: ${error.message}`);
      return;
    }

    await notifyDocumentEvent(
      "reviewed",
      {
        ...detailForm,
        ...payload,
        reviewed_by: payload.reviewed_by,
        reviewed_at: payload.reviewed_at,
        rejection_reason: "",
      },
      selectedDocument.document_number,
      detailForm.title.trim(),
      `Reviewed by ${payload.reviewed_by} on ${formatDate(payload.reviewed_at)}.`
    );

    setMessage("Document marked as reviewed.");
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

const payload = {
  status: "Live" as DocumentStatus,
  review_approval_status: "Approved" as ReviewApprovalStatus,
  approved_by: detailForm.approved_by.trim() || DEFAULT_USER_NAME,
  approved_at: detailForm.approved_at || approvedDate,
  rejected_by: "",
  rejected_at: "",
  rejection_reason: "",
  notification_emails: uniqueEmails(detailForm.notification_emails),
};

    const { error } = await supabase.from("documents").update(payload).eq("id", selectedDocument.id);

    if (error) {
      setMessage(`Approve failed: ${error.message}`);
      return;
    }

    await notifyDocumentEvent(
      "approved",
      {
        ...detailForm,
        ...payload,
        approved_by: payload.approved_by,
        approved_at: payload.approved_at,
        rejection_reason: "",
      },
      selectedDocument.document_number,
      detailForm.title.trim(),
      `Approved by ${payload.approved_by} on ${formatDate(payload.approved_at)}.`
    );

    setMessage("Document approved and moved live.");
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

    const payload = {
      status: "Draft" as DocumentStatus,
      review_approval_status: "Rejected" as ReviewApprovalStatus,
      rejected_by: detailForm.rejected_by.trim() || DEFAULT_USER_NAME,
      rejected_at: detailForm.rejected_at || rejectedDate,
      rejection_reason: detailForm.rejection_reason.trim(),
      notification_emails: uniqueEmails(detailForm.notification_emails),
    };

    const { error } = await supabase.from("documents").update(payload).eq("id", selectedDocument.id);

    if (error) {
      setMessage(`Reject failed: ${error.message}`);
      return;
    }

    await notifyDocumentEvent(
      "rejected",
      {
        ...detailForm,
        ...payload,
      },
      selectedDocument.document_number,
      detailForm.title.trim(),
      `Rejected by ${payload.rejected_by} on ${formatDate(payload.rejected_at)}.\nReason: ${payload.rejection_reason}`
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

      const { error: updateError } = await supabase
        .from("documents")
        .update({
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
          approved_at: detailForm.approved_at || null,
          rejected_by: detailForm.rejected_by.trim() || null,
          rejected_at: detailForm.rejected_at || null,
          rejection_reason: detailForm.rejection_reason.trim() || null,
          notification_emails: uniqueEmails(detailForm.notification_emails),
          comments: detailForm.comments.trim() || null,
          file_name: file.name,
          file_path: path,
          file_size: file.size,
          uploaded_at: uploadTimestamp,
        })
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

    setForm({
      document_type: (selectedDocument.document_type as DocumentTypeOption) || "",
      document_number: "",
      title: selectedDocument.title || "",
      description: selectedDocument.description || "",
      department_owner: "",
      status: "Draft",
      review_approval_status: "Draft",
      current_revision: "A",
      issue_date: "",
      review_cycle_years: (selectedDocument.review_cycle_years as 1 | 2 | 3) || 1,
      originator_name: selectedDocument.originator_name || DEFAULT_USER_NAME,
      originator_email: selectedDocument.originator_email || DEFAULT_USER_EMAIL,
      reviewed_by: "",
      reviewed_at: "",
      approved_by: "",
      approved_at: "",
      rejected_by: "",
      rejected_at: "",
      rejection_reason: "",
      notification_emails: selectedDocument.notification_emails?.length
        ? selectedDocument.notification_emails
        : [DEFAULT_USER_EMAIL],
      comments: `Supersedes ${selectedDocument.document_number}`,
    });

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
      <div style={topMetaRowStyle}>
        <Link href="/" style={backLinkStyle}>
          ← Back to Dashboard
        </Link>

        <div style={statusBannerStyle}>
          <strong>Status:</strong> {message}
        </div>
      </div>

      <section style={statsGridStyle}>
        <StatCard title="Total Documents" value={totalDocuments} accent="#0f766e" />
        <StatCard title="Live Documents" value={liveDocuments} accent="#16a34a" />
        <StatCard title="Approved (Approval Status)" value={approvedDocuments} accent="#2563eb" />
        <StatCard title="Review Overdue" value={overdueReviews} accent="#dc2626" />
      </section>

      <section style={compactTopGridStyle}>
        <SectionCard
          title="Add Document"
          subtitle="Department owner + document type will build the next document number automatically."
        >
          <form onSubmit={addDocument}>
            <div style={compactFormGridStyle}>
              <Field label="Department Owner">
                <select
                  value={form.department_owner}
                  onChange={(e) =>
                    setForm({ ...form, department_owner: e.target.value as DepartmentOwnerOption | "" })
                  }
                  style={inputStyle}
                >
                  <option value="">Select department</option>
                  {DEPARTMENT_OWNER_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
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

              <Field label="Originator Name">
                <input
                  value={form.originator_name}
                  onChange={(e) => setForm({ ...form, originator_name: e.target.value })}
                  style={inputStyle}
                  placeholder="Originator full name"
                />
              </Field>

              <Field label="Originator Email">
                <input
                  value={form.originator_email}
                  onChange={(e) => setForm({ ...form, originator_email: e.target.value })}
                  style={inputStyle}
                  placeholder="Originator email"
                />
              </Field>

              <Field label="Issue Date">
                <input
                  type="date"
                  value={form.issue_date}
                  onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
                  style={inputStyle}
                />
              </Field>

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

              <Field label="Next Review Date">
                <input
                  value={nextReviewDatePreview ? formatDate(nextReviewDatePreview) : "-"}
                  readOnly
                  style={readOnlyInputStyle}
                />
              </Field>

              <Field label="Notification List">
                <select
                  multiple
                  value={form.notification_emails}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      notification_emails: Array.from(e.target.selectedOptions).map((option) => option.value),
                    })
                  }
                  style={multiSelectStyle}
                >
                  {contacts.map((contact) => {
                    const label = `${contact.first_name || ""} ${contact.last_name || ""}`.trim();
                    return (
                      <option key={contact.id} value={contact.email}>
                        {label ? `${label} - ${contact.email}` : contact.email}
                      </option>
                    );
                  })}
                </select>
              </Field>

              <Field label="Reviewed By">
                <input
                  value={form.reviewed_by}
                  onChange={(e) => setForm({ ...form, reviewed_by: e.target.value })}
                  style={inputStyle}
                  placeholder="Reviewer"
                />
              </Field>

              <Field label="Reviewed Date">
                <input
                  type="date"
                  value={form.reviewed_at}
                  onChange={(e) => setForm({ ...form, reviewed_at: e.target.value })}
                  style={inputStyle}
                />
              </Field>

              <Field label="Approved By">
                <input
                  value={form.approved_by}
                  onChange={(e) => setForm({ ...form, approved_by: e.target.value })}
                  style={inputStyle}
                  placeholder="Approver"
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

              <Field label="Rejected By">
                <input
                  value={form.rejected_by}
                  onChange={(e) => setForm({ ...form, rejected_by: e.target.value })}
                  style={inputStyle}
                  placeholder="Rejector"
                />
              </Field>

              <Field label="Rejected Date">
                <input
                  type="date"
                  value={form.rejected_at}
                  onChange={(e) => setForm({ ...form, rejected_at: e.target.value })}
                  style={inputStyle}
                />
              </Field>

              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Rejection Reason">
                  <textarea
                    value={form.rejection_reason}
                    onChange={(e) => setForm({ ...form, rejection_reason: e.target.value })}
                    style={compactTextareaStyle}
                    placeholder="Required when rejecting"
                  />
                </Field>
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

        <SectionCard title="Control Snapshot" subtitle="Click a box to filter the register below.">
          <div style={snapshotHeaderRowStyle}>
            <button
              type="button"
              style={reportButtonStyle}
              onClick={() => exportDocumentsReport("Documents Due Soon Report", dueSoonDocuments)}
            >
              Export Due Soon Report
            </button>
          </div>

          <div style={miniSnapshotGridStyle}>
            <SnapshotCard
              label="Live"
              value={liveDocuments}
              tone="#166534"
              bg="#dcfce7"
              onClick={() => applySnapshotFilter({ status: "Live" })}
            />
            <SnapshotCard
              label="Draft"
              value={draftDocuments}
              tone="#1d4ed8"
              bg="#dbeafe"
              onClick={() => applySnapshotFilter({ status: "Draft" })}
            />
            <SnapshotCard
              label="Archived"
              value={archivedDocuments}
              tone="#6d28d9"
              bg="#ede9fe"
              onClick={() => applySnapshotFilter({ status: "Archived" })}
            />
            <SnapshotCard
              label="Approved"
              value={approvedDocuments}
              tone="#1d4ed8"
              bg="#dbeafe"
              onClick={() => applySnapshotFilter({ approval: "Approved" })}
            />
            <SnapshotCard
              label="Overdue"
              value={overdueReviews}
              tone="#991b1b"
              bg="#fee2e2"
              onClick={() => applySnapshotFilter({ review: "Overdue" })}
            />
            <SnapshotCard
              label="Due Soon"
              value={dueSoonReviews}
              tone="#92400e"
              bg="#fef3c7"
              onClick={() => applySnapshotFilter({ review: "Due soon" })}
            />
          </div>
        </SectionCard>
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

                  {selectedDocumentUrl ? (
                    <a
                      href={selectedDocumentUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={reportLinkButtonStyle}
                    >
                      Open / Download
                    </a>
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
                <div style={detailSectionTitleStyle}>Document Control Record</div>

                <div style={detailFormGridStyle}>
                  <Field label="Department Owner">
                    <select
                      value={detailForm.department_owner}
                      onChange={(e) =>
                        setDetailForm({
                          ...detailForm,
                          department_owner: e.target.value as DepartmentOwnerOption | "",
                        })
                      }
                      style={inputStyle}
                    >
                      <option value="">Select department</option>
                      {DEPARTMENT_OWNER_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
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

                  <Field label="Originator Name">
                    <input
                      value={detailForm.originator_name}
                      onChange={(e) => setDetailForm({ ...detailForm, originator_name: e.target.value })}
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Originator Email">
                    <input
                      value={detailForm.originator_email}
                      onChange={(e) => setDetailForm({ ...detailForm, originator_email: e.target.value })}
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Issue Date">
                    <input
                      type="date"
                      value={detailForm.issue_date}
                      onChange={(e) => setDetailForm({ ...detailForm, issue_date: e.target.value })}
                      style={inputStyle}
                    />
                  </Field>

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

                  <Field label="Notification List">
                    <select
                      multiple
                      value={detailForm.notification_emails}
                      onChange={(e) =>
                        setDetailForm({
                          ...detailForm,
                          notification_emails: Array.from(e.target.selectedOptions).map((option) => option.value),
                        })
                      }
                      style={multiSelectStyle}
                    >
                      {contacts.map((contact) => {
                        const label = `${contact.first_name || ""} ${contact.last_name || ""}`.trim();
                        return (
                          <option key={contact.id} value={contact.email}>
                            {label ? `${label} - ${contact.email}` : contact.email}
                          </option>
                        );
                      })}
                    </select>
                  </Field>

                  <Field label="Reviewed By">
                    <input
                      value={detailForm.reviewed_by}
                      onChange={(e) => setDetailForm({ ...detailForm, reviewed_by: e.target.value })}
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Reviewed Date">
                    <input
                      type="date"
                      value={detailForm.reviewed_at}
                      onChange={(e) => setDetailForm({ ...detailForm, reviewed_at: e.target.value })}
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Approved By">
                    <input
                      value={detailForm.approved_by}
                      onChange={(e) => setDetailForm({ ...detailForm, approved_by: e.target.value })}
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

                  <Field label="Rejected By">
                    <input
                      value={detailForm.rejected_by}
                      onChange={(e) => setDetailForm({ ...detailForm, rejected_by: e.target.value })}
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Rejected Date">
                    <input
                      type="date"
                      value={detailForm.rejected_at}
                      onChange={(e) => setDetailForm({ ...detailForm, rejected_at: e.target.value })}
                      style={inputStyle}
                    />
                  </Field>

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
                <div style={detailSectionTitleStyle}>Revision History</div>

                {selectedRevisions.length === 0 ? (
                  <div style={emptyRevisionStyle}>No revision history files uploaded yet.</div>
                ) : (
                  <div style={revisionListStyle}>
                    {selectedRevisions.map((revision) => (
                      <RevisionRow key={revision.id} revision={revision} />
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

function RevisionRow({ revision }: { revision: DocumentRevisionRow }) {
  const [signedUrl, setSignedUrl] = useState("");

  useEffect(() => {
    if (!revision.file_path) {
      setSignedUrl("");
      return;
    }

    void (async () => {
      const url = await createSignedFileUrl(revision.file_path || "");
      setSignedUrl(url);
    })();
  }, [revision.file_path]);

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

          {signedUrl ? (
            <a href={signedUrl} target="_blank" rel="noreferrer" style={reportLinkButtonStyle}>
              Open / Download
            </a>
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

function StatCard({
  title,
  value,
  accent,
}: {
  title: string;
  value: number;
  accent: string;
}) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: "16px",
        padding: "18px 20px",
        borderLeft: `5px solid ${accent}`,
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
      }}
    >
      <div style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: "34px", fontWeight: 700, color: "#0f172a", marginTop: "8px" }}>
        {value}
      </div>
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

const compactTopGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.2fr 0.8fr",
  gap: "20px",
  marginBottom: "20px",
};

const panelStyle: CSSProperties = {
  background: "white",
  borderRadius: "18px",
  padding: "20px",
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

const multiSelectStyle: CSSProperties = {
  ...inputStyle,
  minHeight: "108px",
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
  minHeight: "76px",
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
  gridTemplateColumns: "1.2fr 2fr 1fr 1fr 0.8fr 1.1fr 0.9fr 1fr",
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
  gridTemplateColumns: "1.2fr 2fr 1fr 1fr 0.8fr 1.1fr 0.9fr 1fr",
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
  gap: "16px",
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
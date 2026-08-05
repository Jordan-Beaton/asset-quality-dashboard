"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import * as XLSX from "xlsx";
import { ImsTopMetaRow } from "../../../../src/components/ImsPrimitives";
import { QualityKpiCard } from "../../../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../../../src/components/QualityPageHero";
import { WaddenSeaWorkspaceNav } from "../../../../src/components/WaddenSeaWorkspaceNav";
import { supabase } from "../../../../src/lib/supabase";

const PROJECT_KEY = "wadden-sea";
const STORAGE_BUCKET = "project-documents";

type Revision = {
  id: string;
  itp_id: string;
  revision: string;
  revision_date: string | null;
  supplier_status: string | null;
  enshore_decision: string | null;
  enshore_reviewed_at: string | null;
  enshore_comments: string | null;
  sent_to_client_at: string | null;
  client_decision: string | null;
  client_decision_at: string | null;
  client_comments: string | null;
  file_name: string;
  file_path: string;
  file_size: number | null;
  content_type: string | null;
  extraction_confidence: string | null;
  is_current: boolean;
  supersedes_revision_id?: string | null;
  superseded_at?: string | null;
  superseded_by_revision_id?: string | null;
  uploaded_at: string;
};

type Itp = {
  id: string;
  project_key: string;
  document_number: string;
  title: string;
  supplier: string | null;
  scope: string | null;
  package_name: string | null;
  discipline: string | null;
  enshore_reviewer: string | null;
  overall_stage: string;
  overall_status: string;
  next_action: string | null;
  due_date: string | null;
  updated_at: string;
  project_itp_revisions?: Revision[];
};

type PersonOption = {
  id: string;
  name: string;
  role: string | null;
  department: string | null;
};

type UploadDraft = {
  documentNumber: string;
  title: string;
  supplier: string;
  scope: string;
  packageName: string;
  discipline: string;
  revision: string;
  revisionDate: string;
  reviewer: string;
  supplierStatus: string;
  enshoreDecision: string;
  overallStage: string;
  overallStatus: string;
  nextAction: string;
  dueDate: string;
  confidence: string;
};

const emptyDraft: UploadDraft = {
  documentNumber: "",
  title: "",
  supplier: "",
  scope: "",
  packageName: "",
  discipline: "",
  revision: "",
  revisionDate: "",
  reviewer: "",
  supplierStatus: "Draft Received",
  enshoreDecision: "Pending Review",
  overallStage: "Enshore Review",
  overallStatus: "Draft Received",
  nextAction: "Complete Enshore review",
  dueDate: "",
  confidence: "Filename only",
};

const stages = ["Supplier", "Enshore Review", "Enshore Approved", "Closed"];
const statuses = ["Not Submitted / TBC", "Draft Received", "Pending Review", "Comments Only", "Comments Issued", "Rejected", "Approved", "Accepted / Closed"];

function revisionParts(value: string) {
  return clean(value).toUpperCase().split(/([0-9]+(?:\.[0-9]+)?)/).filter(Boolean).map((part) => /^\d/.test(part) ? Number(part) : part);
}

function compareRevisions(left: string, right: string) {
  const a = revisionParts(left);
  const b = revisionParts(right);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const first = a[index] ?? "";
    const second = b[index] ?? "";
    if (first === second) continue;
    if (typeof first === "number" && typeof second === "number") return first > second ? 1 : -1;
    return String(first).localeCompare(String(second), undefined, { numeric: true, sensitivity: "base" });
  }
  return 0;
}

function identityScore(draft: UploadDraft, row: Itp) {
  let score = 0;
  if (draft.supplier && row.supplier && draft.supplier.toLowerCase() === row.supplier.toLowerCase()) score += 2;
  const titleWords = new Set(draft.title.toLowerCase().split(/\W+/).filter((word) => word.length > 3));
  const common = row.title.toLowerCase().split(/\W+/).filter((word) => titleWords.has(word)).length;
  if (common >= 2) score += 2;
  if (draft.scope && row.scope && draft.scope === row.scope) score += 1;
  return score;
}

function clean(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function isoDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
  }
  const text = clean(value);
  const match = text.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/);
  if (match) {
    const year = match[3].length === 2 ? `20${match[3]}` : match[3];
    return `${year}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  }
  const date = new Date(text);
  return text && !Number.isNaN(date.valueOf()) ? date.toISOString().slice(0, 10) : "";
}

function filenameDraft(fileName: string): UploadDraft {
  const base = fileName.replace(/\.[^.]+$/, "").replace(/[_]+/g, " ").trim();
  const revisionMatch = base.match(/(?:\brev(?:ision)?|\br)[\s._-]*([A-Z0-9.]+)/i);
  const documentMatch = base.match(/\b(?:ITP|QCP)[-_ ]?[A-Z0-9][A-Z0-9._/-]*\b/i);
  return {
    ...emptyDraft,
    documentNumber: documentMatch?.[0]?.replace(/\s+/g, "-") || base.slice(0, 80),
    title: base.replace(revisionMatch?.[0] || "", "").trim(),
    revision: revisionMatch?.[1] || "",
  };
}

function findLabel(rows: unknown[][], labels: RegExp[]) {
  for (let r = 0; r < Math.min(rows.length, 80); r += 1) {
    const row = rows[r] || [];
    for (let c = 0; c < Math.min(row.length, 24); c += 1) {
      const value = clean(row[c]);
      if (!labels.some((label) => label.test(value))) continue;
      const sameCell = value.match(/:\s*(.+)$/)?.[1];
      if (sameCell) return clean(sameCell);
      for (let offset = 1; offset <= 3; offset += 1) {
        const candidate = clean(row[c + offset]);
        if (candidate) return candidate;
      }
      const below = clean(rows[r + 1]?.[c]);
      if (below) return below;
    }
  }
  return "";
}

async function extractDraft(file: File) {
  const draft = filenameDraft(file.name);
  const form = new FormData();
  form.append("file", file);
  const response = await fetch("/api/projects/itp-extract", { method: "POST", body: form });
  if (response.ok) {
    const result = await response.json() as Partial<UploadDraft> & { revisionDate?: string };
    return {
      ...draft,
      documentNumber: clean(result.documentNumber) || draft.documentNumber,
      title: clean(result.title) || draft.title,
      revision: clean(result.revision) || draft.revision,
      revisionDate: isoDate(result.revisionDate),
      supplier: clean(result.supplier),
      scope: clean(result.scope),
      packageName: clean(result.packageName),
      discipline: clean(result.discipline),
      confidence: clean(result.confidence) || "Medium",
    };
  }
  if (!/\.(xlsx?|xlsm)$/i.test(file.name)) throw new Error("The document text could not be read.");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const rows = workbook.SheetNames.flatMap((name) =>
    XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], { header: 1, raw: false, defval: "" }).slice(0, 80),
  );
  const documentNumber = findLabel(rows, [/document\s*(no|number|ref)/i, /itp\s*(no|number|reference)/i, /^reference$/i]);
  const title = findLabel(rows, [/document\s*title/i, /^title$/i, /itp\s*(title|description)/i]);
  const revision = findLabel(rows, [/^rev(?:ision)?\.?$/i, /revision\s*(no|number)/i]);
  const revisionDate = findLabel(rows, [/revision\s*date/i, /date\s*of\s*issue/i, /^issue\s*date$/i]);
  const supplier = findLabel(rows, [/supplier|vendor|contractor/i]);
  const packageName = findLabel(rows, [/package|purchase\s*order|po\s*(no|number)/i]);
  const discipline = findLabel(rows, [/discipline/i]);
  const found = [documentNumber, title, revision, supplier].filter(Boolean).length;
  return {
    ...draft,
    documentNumber: documentNumber || draft.documentNumber,
    title: title || draft.title,
    revision: revision || draft.revision,
    revisionDate: isoDate(revisionDate),
    supplier,
    packageName,
    discipline,
    confidence: found >= 3 ? "High" : found >= 1 ? "Medium" : "Filename only",
  };
}

function currentRevision(itp: Itp) {
  return (itp.project_itp_revisions || []).find((revision) => revision.is_current)
    || [...(itp.project_itp_revisions || [])].sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at))[0];
}

function statusTone(status: string) {
  const value = status.toLowerCase();
  if (value.includes("approved") || value.includes("closed") || value.includes("accepted")) return { background: "#dcfce7", color: "#166534" };
  if (value.includes("reject") || value.includes("comment")) return { background: "#ffedd5", color: "#9a3412" };
  if (value.includes("pending") || value.includes("draft")) return { background: "#fef3c7", color: "#92400e" };
  return { background: "#eef2f7", color: "#475569" };
}

export default function WaddenSeaItpPage() {
  const [rows, setRows] = useState<Itp[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("All");
  const [scope, setScope] = useState("All");
  const [registerView, setRegisterView] = useState<"current" | "archive">("current");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<Itp | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [draft, setDraft] = useState<UploadDraft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [peopleOptions, setPeopleOptions] = useState<PersonOption[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data, error }, peopleResult] = await Promise.all([
      supabase
        .from("project_itps")
        .select("*, project_itp_revisions(*)")
        .eq("project_key", PROJECT_KEY)
        .order("updated_at", { ascending: false }),
      supabase
        .from("people")
        .select("id,name,role,department")
        .eq("active", true)
        .order("name", { ascending: true }),
    ]);
    if (error) setMessage(error.message.includes("project_itps") ? "The ITP database setup is not live yet. Apply scripts/sql/project_itp_tracker.sql in Supabase." : error.message);
    else {
      setRows((data || []) as Itp[]);
      setMessage("");
    }
    if (!peopleResult.error) setPeopleOptions((peopleResult.data || []) as PersonOption[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => rows.filter((row) => {
    const revision = currentRevision(row);
    const haystack = [row.document_number, row.title, row.supplier, row.scope, row.package_name, revision?.revision].join(" ").toLowerCase();
    return (!query || haystack.includes(query.toLowerCase()))
      && (stage === "All" || row.overall_stage === stage)
      && (scope === "All" || row.scope === scope);
  }), [rows, query, stage, scope]);

  const scopes = useMemo(() => [...new Set(rows.map((row) => row.scope).filter(Boolean) as string[])].sort(), [rows]);
  const metrics = useMemo(() => ({
    total: rows.length,
    closed: rows.filter((row) => row.overall_stage === "Closed").length,
    enshore: rows.filter((row) => row.overall_stage === "Enshore Review").length,
    approved: rows.filter((row) => row.overall_stage === "Enshore Approved").length,
    comments: rows.filter((row) => /comment|reject/i.test(row.overall_status)).length,
  }), [rows]);
  const archivedRevisions = useMemo(() => rows.flatMap((row) =>
    (row.project_itp_revisions || [])
      .filter((revision) => !revision.is_current)
      .map((revision) => ({ row, revision })),
  ).sort((a, b) => b.revision.uploaded_at.localeCompare(a.revision.uploaded_at)), [rows]);

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] || null;
    setFile(selected);
    if (!selected) return;
    setBusy(true);
    try {
      const extracted = await extractDraft(selected);
      const existing = rows.find((row) => row.document_number.toLowerCase() === extracted.documentNumber.toLowerCase());
      setDraft(existing ? {
        ...extracted,
        title: extracted.title || existing.title,
        supplier: extracted.supplier || existing.supplier || "",
        scope: extracted.scope || existing.scope || "",
        packageName: extracted.packageName || existing.package_name || "",
        discipline: extracted.discipline || existing.discipline || "",
        reviewer: existing.enshore_reviewer || "",
        supplierStatus: "Draft Received",
        enshoreDecision: "Pending Review",
        overallStage: "Enshore Review",
        overallStatus: "Draft Received",
        nextAction: "Complete Enshore review",
        dueDate: "",
      } : extracted);
      if (existing) setMessage(`Existing ITP recognised. Master details have been carried forward; revision ${extracted.revision || "not detected"} will start a fresh Enshore review.`);
      else setMessage("");
    } catch {
      setDraft(filenameDraft(selected.name));
      setMessage("The file is ready, but metadata extraction was limited. Please confirm the highlighted fields.");
    } finally {
      setBusy(false);
    }
  }

  async function saveUpload() {
    if (!draft.documentNumber || !draft.title || !draft.revision || (!file && !editingRow)) {
      setMessage(editingRow ? "Confirm the document number, title, and revision." : "Choose a file and confirm the document number, title, and revision.");
      return;
    }
    if (editingRow) {
      const revision = currentRevision(editingRow);
      if (!revision) {
        setMessage("This record has no current revision to edit.");
        return;
      }
      setBusy(true);
      const masterUpdate = await supabase.from("project_itps").update({
        document_number: draft.documentNumber.trim(),
        title: draft.title.trim(),
        supplier: draft.supplier.trim() || null,
        scope: draft.scope.trim() || null,
        package_name: draft.packageName.trim() || null,
        discipline: draft.discipline.trim() || null,
        enshore_reviewer: draft.reviewer.trim() || null,
        overall_stage: draft.overallStage,
        overall_status: draft.overallStatus,
        next_action: draft.nextAction.trim() || null,
        due_date: draft.dueDate || null,
        updated_at: new Date().toISOString(),
      }).eq("id", editingRow.id);
      const revisionUpdate = masterUpdate.error ? null : await supabase.from("project_itp_revisions").update({
        revision: draft.revision.trim(),
        revision_date: draft.revisionDate || null,
        supplier_status: draft.supplierStatus,
        enshore_decision: draft.enshoreDecision,
      }).eq("id", revision.id);
      if (masterUpdate.error || revisionUpdate?.error) {
        setMessage(masterUpdate.error?.message || revisionUpdate?.error?.message || "The record could not be updated.");
      } else {
        setMessage(`${draft.documentNumber} updated.`);
        setDialogOpen(false);
        setEditingRow(null);
        setDraft(emptyDraft);
        await load();
      }
      setBusy(false);
      return;
    }
    const existing = rows.find((row) => row.document_number.toLowerCase() === draft.documentNumber.toLowerCase());
    const existingCurrent = existing ? currentRevision(existing) : undefined;
    if (existing?.project_itp_revisions?.some((revision) => revision.revision.toLowerCase() === draft.revision.trim().toLowerCase())) {
      setMessage(`Revision ${draft.revision} already exists for ${existing.document_number}. No file was uploaded.`);
      return;
    }
    if (existingCurrent && compareRevisions(draft.revision, existingCurrent.revision) < 0
      && !window.confirm(`Revision ${draft.revision} appears older than current revision ${existingCurrent.revision}. Upload it as the new current revision anyway?`)) return;
    const likelyMatch = !existing
      ? rows.map((row) => ({ row, score: identityScore(draft, row) })).sort((a, b) => b.score - a.score)[0]
      : undefined;
    if (likelyMatch && likelyMatch.score >= 4
      && !window.confirm(`This document resembles ${likelyMatch.row.document_number}, but the extracted document number is ${draft.documentNumber}. Continue as a separate ITP?`)) return;
    setBusy(true);
    setMessage("");
    let uploadedPath = "";
    let createdMasterId = "";
    let insertedRevisionId = "";
    let previousWasSuperseded = false;
    try {
      const { data: auth } = await supabase.auth.getUser();
      let itpId = existing?.id;
      const masterPayload = {
        project_key: PROJECT_KEY,
        document_number: draft.documentNumber.trim(),
        title: draft.title.trim(),
        supplier: draft.supplier.trim() || null,
        scope: draft.scope.trim() || null,
        package_name: draft.packageName.trim() || null,
        discipline: draft.discipline.trim() || null,
        enshore_reviewer: draft.reviewer.trim() || null,
        overall_stage: draft.overallStage,
        overall_status: draft.overallStatus,
        next_action: draft.nextAction.trim() || null,
        due_date: draft.dueDate || null,
        updated_at: new Date().toISOString(),
      };
      if (!itpId) {
        const { data, error } = await supabase.from("project_itps").insert({ ...masterPayload, created_by: auth.user?.id }).select("id").single();
        if (error) throw error;
        itpId = data.id;
        createdMasterId = data.id;
      }
      const sourceFile = file as File;
      const safeName = sourceFile.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
      uploadedPath = `${PROJECT_KEY}/${itpId}/${Date.now()}-${safeName}`;
      const upload = await supabase.storage.from(STORAGE_BUCKET).upload(uploadedPath, sourceFile, { contentType: sourceFile.type || undefined, upsert: false });
      if (upload.error) throw upload.error;
      const { data: insertedRevision, error: revisionError } = await supabase.from("project_itp_revisions").insert({
        itp_id: itpId,
        revision: draft.revision.trim(),
        revision_date: draft.revisionDate || null,
        supplier_status: draft.supplierStatus,
        enshore_decision: draft.enshoreDecision,
        file_name: sourceFile.name,
        file_path: uploadedPath,
        file_size: sourceFile.size,
        content_type: sourceFile.type || null,
        extraction_confidence: draft.confidence,
        extracted_metadata: draft,
        is_current: !existingCurrent,
        supersedes_revision_id: existingCurrent?.id || null,
        uploaded_by: auth.user?.id,
      }).select("id").single();
      if (revisionError) throw revisionError;
      insertedRevisionId = insertedRevision.id;
      if (existingCurrent) {
        const supersede = await supabase.from("project_itp_revisions").update({
          is_current: false,
          superseded_at: new Date().toISOString(),
          superseded_by_revision_id: insertedRevisionId,
        }).eq("id", existingCurrent.id);
        if (supersede.error) throw supersede.error;
        previousWasSuperseded = true;
        const activate = await supabase.from("project_itp_revisions").update({ is_current: true }).eq("id", insertedRevisionId);
        if (activate.error) {
          await supabase.from("project_itp_revisions").update({ is_current: true, superseded_at: null, superseded_by_revision_id: null }).eq("id", existingCurrent.id);
          throw activate.error;
        }
      }
      if (existing) {
        const { error } = await supabase.from("project_itps").update(masterPayload).eq("id", itpId);
        if (error) throw error;
      }
      setDialogOpen(false);
      setEditingRow(null);
      setFile(null);
      setDraft(emptyDraft);
      setMessage(existing ? `Revision ${draft.revision} added and the previous revision retained.` : "ITP created and the source document retained.");
      await load();
    } catch (error) {
      if (previousWasSuperseded && existingCurrent) await supabase.from("project_itp_revisions").update({ is_current: true, superseded_at: null, superseded_by_revision_id: null }).eq("id", existingCurrent.id);
      if (insertedRevisionId) await supabase.from("project_itp_revisions").delete().eq("id", insertedRevisionId);
      if (uploadedPath) await supabase.storage.from(STORAGE_BUCKET).remove([uploadedPath]);
      if (createdMasterId) await supabase.from("project_itps").delete().eq("id", createdMasterId);
      setMessage(error instanceof Error ? error.message : "The ITP could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function openFile(revision: Revision) {
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(revision.file_path, 3600);
    if (error) setMessage(error.message);
    else window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  function openEdit(row: Itp) {
    const revision = currentRevision(row);
    if (!revision) {
      setMessage("This record has no current revision to edit.");
      return;
    }
    setFile(null);
    setEditingRow(row);
    setDraft({
      ...emptyDraft,
      documentNumber: row.document_number,
      title: row.title,
      supplier: row.supplier || "",
      scope: row.scope || "",
      packageName: row.package_name || "",
      discipline: row.discipline || "",
      revision: revision.revision,
      revisionDate: revision.revision_date || "",
      reviewer: row.enshore_reviewer || "",
      supplierStatus: revision.supplier_status || "Draft Received",
      enshoreDecision: revision.enshore_decision || "Pending Review",
      overallStage: row.overall_stage,
      overallStatus: row.overall_status,
      nextAction: row.next_action || "",
      dueDate: row.due_date || "",
      confidence: revision.extraction_confidence || "Manual",
    });
    setDialogOpen(true);
  }

  async function deleteItp(row: Itp) {
    const revisionCount = row.project_itp_revisions?.length || 0;
    if (!window.confirm(`Delete ${row.document_number} and all ${revisionCount} stored revision file${revisionCount === 1 ? "" : "s"}? This cannot be undone.`)) return;
    setSavingId(row.id);
    setMessage("");
    const paths = (row.project_itp_revisions || []).map((revision) => revision.file_path).filter(Boolean);
    const deleted = await supabase.from("project_itps").delete().eq("id", row.id);
    if (deleted.error) {
      setMessage(deleted.error.message);
      setSavingId(null);
      return;
    }
    if (paths.length) {
      const storage = await supabase.storage.from(STORAGE_BUCKET).remove(paths);
      if (storage.error) setMessage(`The register item was deleted, but stored-file cleanup needs attention: ${storage.error.message}`);
      else setMessage(`${row.document_number} and its revision files were deleted.`);
    } else {
      setMessage(`${row.document_number} was deleted.`);
    }
    setRows((current) => current.filter((item) => item.id !== row.id));
    setSavingId(null);
  }

  async function updateMaster(row: Itp, changes: Partial<Itp>) {
    setSavingId(row.id);
    setRows((current) => current.map((item) => item.id === row.id ? { ...item, ...changes } : item));
    const payload = { ...changes, updated_at: new Date().toISOString() };
    delete payload.project_itp_revisions;
    const { error } = await supabase.from("project_itps").update(payload).eq("id", row.id);
    if (error) {
      setMessage(error.message);
      await load();
    }
    setSavingId(null);
  }

  async function updateRevision(row: Itp, revision: Revision | undefined, changes: Partial<Revision>) {
    if (!revision) return;
    setSavingId(row.id);
    setRows((current) => current.map((item) => item.id === row.id
      ? { ...item, project_itp_revisions: (item.project_itp_revisions || []).map((entry) => entry.id === revision.id ? { ...entry, ...changes } : entry) }
      : item));
    const { error } = await supabase.from("project_itp_revisions").update(changes).eq("id", revision.id);
    if (error) {
      setMessage(error.message);
      await load();
    }
    setSavingId(null);
  }

  return (
    <main style={page}>
      <QualityPageHero label="Wadden Sea · Document intelligence" title="ITP Tracker" description="One controlled record per ITP, automatic metadata capture, complete revision history, and live Enshore workflow visibility." />

      <ImsTopMetaRow backHref="/projects/wadden-sea" backLabel="Back to Wadden Sea" status={<><strong>Status:</strong> {message || "Latest active ITP revisions loaded."}</>} />
      <WaddenSeaWorkspaceNav active="itp" />

      <section className="quality-kpi-grid" style={metricsGrid}>
        <QualityKpiCard title="Total ITPs" value={metrics.total} accent="#63B1BC" />
        <QualityKpiCard title="Closed" value={metrics.closed} accent="#005670" />
        <QualityKpiCard title="Enshore Review" value={metrics.enshore} accent="#FFAD00" />
        <QualityKpiCard title="Enshore Approved" value={metrics.approved} accent="#005670" />
        <QualityKpiCard title="Comments / Rejected" value={metrics.comments} accent="#F93822" />
      </section>

      <section style={surface}>
        <div style={toolbar}>
          <div>
            <div style={sectionKicker}>Master register</div>
            <h2 style={sectionTitle}>Supplier ITP programme</h2>
          </div>
          <button style={primaryButton} onClick={() => { setEditingRow(null); setFile(null); setDraft(emptyDraft); setDialogOpen(true); }}>＋ Upload ITP / revision</button>
        </div>
        <div style={viewTabs}>
          <button style={registerView === "current" ? activeViewTab : viewTab} onClick={() => setRegisterView("current")}>Current register ({rows.length})</button>
          <button style={registerView === "archive" ? activeViewTab : viewTab} onClick={() => setRegisterView("archive")}>Revision archive ({archivedRevisions.length})</button>
        </div>
        {registerView === "current" ? <>
        <div style={filters}>
          <input style={input} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search document, title, supplier or package…" />
          <select style={select} value={scope} onChange={(event) => setScope(event.target.value)}><option>All</option>{scopes.map((value) => <option key={value}>{value}</option>)}</select>
          <select style={select} value={stage} onChange={(event) => setStage(event.target.value)}><option>All</option>{stages.map((value) => <option key={value}>{value}</option>)}</select>
        </div>
        {message && <div style={notice}>{message}</div>}
        <div style={tableWrap}>
          <table style={table}>
            <colgroup>
              <col style={{ width: "14%" }} /><col style={{ width: "10%" }} /><col style={{ width: "19%" }} />
              <col style={{ width: "6%" }} /><col style={{ width: "10%" }} /><col style={{ width: "10%" }} />
              <col style={{ width: "11%" }} /><col style={{ width: "11%" }} /><col style={{ width: "9%" }} />
            </colgroup>
            <thead><tr>{["Supplier", "Scope", "ITP reference / title", "Rev", "Reviewer", "Reviewed", "Decision", "Status / action", ""].map((head) => <th key={head} style={th}>{head}</th>)}</tr></thead>
            <tbody>
              {filtered.map((row) => {
                const revision = currentRevision(row);
                const expanded = expandedId === row.id;
                const scopeTone = row.scope === "Trencher"
                  ? { background: "#dcfce7", color: "#166534", borderColor: "#86d39d" }
                  : row.scope === "Barge"
                    ? { background: "#fef3c7", color: "#92400e", borderColor: "#e8c75f" }
                    : {};
                return [
                  <tr key={row.id}>
                    <td style={td}><strong>{row.supplier || "—"}</strong><span style={secondary}>{row.package_name || ""}</span></td>
                    <td style={td}><select aria-label={`Scope for ${row.document_number}`} style={{ ...cellSelect, ...scopeTone }} value={row.scope || ""} onChange={(event) => void updateMaster(row, { scope: event.target.value || null })}><option value="">Select</option><option>Trencher</option><option>Barge</option></select></td>
                    <td style={td}><strong style={docNo}>{row.document_number}</strong><span style={compactTitle} title={row.title}>{row.title}</span></td>
                    <td style={td}><strong>{revision?.revision || "—"}</strong><span style={secondary}>{revision?.revision_date ? new Date(`${revision.revision_date}T00:00:00`).toLocaleDateString("en-GB") : ""}</span></td>
                    <td style={td}><select aria-label={`Reviewer for ${row.document_number}`} style={cellSelect} value={row.enshore_reviewer || ""} onChange={(event) => void updateMaster(row, { enshore_reviewer: event.target.value || null })}>
                      <option value="">Assign</option>
                      {row.enshore_reviewer && !peopleOptions.some((person) => person.name === row.enshore_reviewer) && <option value={row.enshore_reviewer}>{row.enshore_reviewer}</option>}
                      {peopleOptions.map((person) => <option key={person.id} value={person.name}>{person.name}{person.role ? ` — ${person.role}` : ""}</option>)}
                    </select></td>
                    <td style={td}><input aria-label={`Review date for ${row.document_number}`} style={cellInput} type="date" value={revision?.enshore_reviewed_at || ""} onChange={(event) => void updateRevision(row, revision, { enshore_reviewed_at: event.target.value || null })} /></td>
                    <td style={td}><select aria-label={`Decision for ${row.document_number}`} style={{ ...cellSelect, ...statusTone(revision?.enshore_decision || "Pending Review") }} value={revision?.enshore_decision || "Pending Review"} onChange={(event) => {
                      const decision = event.target.value;
                      void updateRevision(row, revision, { enshore_decision: decision });
                      if (decision === "Approved") void updateMaster(row, { overall_stage: "Enshore Approved", overall_status: "Approved", next_action: null });
                      if (decision === "Comments Issued") void updateMaster(row, { overall_stage: "Enshore Review", overall_status: "Comments Issued", next_action: "Await revised ITP" });
                    }}><option>Pending Review</option><option>Comments Issued</option><option>Approved</option><option>Rejected</option></select></td>
                    <td style={td}><select aria-label={`Status for ${row.document_number}`} style={{ ...cellSelect, ...statusTone(row.overall_status) }} value={row.overall_status} onChange={(event) => void updateMaster(row, { overall_status: event.target.value })}>{statuses.map((value) => <option key={value}>{value}</option>)}</select><input aria-label={`Next action for ${row.document_number}`} style={{ ...cellInput, marginTop: 5 }} value={row.next_action || ""} placeholder="Next action" onChange={(event) => setRows((current) => current.map((item) => item.id === row.id ? { ...item, next_action: event.target.value } : item))} onBlur={(event) => void updateMaster(row, { next_action: event.target.value || null })} /></td>
                    <td style={td}><div style={rowActions}><button style={editButton} onClick={() => openEdit(row)}>Edit</button><button style={deleteButton} disabled={savingId === row.id} onClick={() => void deleteItp(row)}>Delete</button><button title={savingId === row.id ? "Saving" : "Revision history"} style={historyButton} onClick={() => setExpandedId(expanded ? null : row.id)}>{savingId === row.id ? "…" : expanded ? "×" : row.project_itp_revisions?.length || 0}</button></div></td>
                  </tr>,
                  expanded && <tr key={`${row.id}-history`}><td colSpan={9} style={historyCell}>
                    <div style={historyHeader}><strong>Controlled revision history</strong><span>Every uploaded source file is retained.</span></div>
                    <div style={historyList}>{[...(row.project_itp_revisions || [])].sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at)).map((item) => (
                      <div key={item.id} style={historyRow}>
                        <span style={revisionBadge}>Rev {item.revision}</span>
                        <span><strong>{item.file_name}</strong><small style={small}>{item.revision_date ? new Date(`${item.revision_date}T00:00:00`).toLocaleDateString("en-GB") : "No revision date"} · {item.extraction_confidence || "Manual"} extraction</small></span>
                        <span style={item.is_current ? currentPill : supersededPill}>{item.is_current ? "Current" : "Superseded"}</span>
                        <button style={linkButton} onClick={() => void openFile(item)}>Open file</button>
                      </div>
                    ))}</div>
                  </td></tr>,
                ];
              })}
              {!loading && filtered.length === 0 && <tr><td colSpan={9} style={empty}>No ITPs match the current filters.</td></tr>}
              {loading && <tr><td colSpan={9} style={empty}>Loading the controlled register…</td></tr>}
            </tbody>
          </table>
        </div>
        </> : <div style={archive}>
          <div style={archiveIntro}><strong>Superseded revision archive</strong><span>Read-only source files retained for traceability. They do not appear as active programme rows.</span></div>
          {archivedRevisions.map(({ row, revision }) => (
            <div key={revision.id} style={archiveRow}>
              <span><strong style={docNo}>{row.document_number}</strong><small style={small}>{row.title}</small></span>
              <span><strong>Rev {revision.revision}</strong><small style={small}>{revision.revision_date ? new Date(`${revision.revision_date}T00:00:00`).toLocaleDateString("en-GB") : "No revision date"}</small></span>
              <span><strong>{revision.file_name}</strong><small style={small}>Uploaded {new Date(revision.uploaded_at).toLocaleDateString("en-GB")}</small></span>
              <span style={supersededPill}>Superseded</span>
              <button style={linkButton} onClick={() => void openFile(revision)}>Open archived file</button>
            </div>
          ))}
          {!loading && archivedRevisions.length === 0 && <div style={empty}>No superseded revisions yet.</div>}
        </div>}
      </section>

      {dialogOpen && <div style={overlay} onMouseDown={(event) => { if (event.target === event.currentTarget) { setDialogOpen(false); setEditingRow(null); } }}>
        <section style={dialog}>
          <div style={dialogHeader}><div><div style={sectionKicker}>{editingRow ? "Record management" : "Document intake"}</div><h2 style={sectionTitle}>{editingRow ? "Edit current ITP" : "Upload ITP or new revision"}</h2></div><button style={closeButton} onClick={() => { setDialogOpen(false); setEditingRow(null); }}>×</button></div>
          {!editingRow && <label style={dropzone}><input type="file" accept=".xlsx,.xls,.xlsm,.pdf,.docx" onChange={(event) => void chooseFile(event)} style={{ display: "none" }} /><strong>{file ? file.name : "Choose the ITP document"}</strong><span>{busy ? "Reading document metadata…" : "Excel, PDF, or Word · the original file will be retained"}</span></label>}
          {file && !editingRow && <div style={confidence}>Extraction confidence: <strong>{draft.confidence}</strong> · Confirm the fields before saving.</div>}
          {editingRow && <div style={confidence}>Editing the current register information. The stored source document and revision archive will not be replaced.</div>}
          <div style={formGrid}>
            <Field label="Document number *" value={draft.documentNumber} set={(value) => setDraft({ ...draft, documentNumber: value })} />
            <Field label="Revision *" value={draft.revision} set={(value) => setDraft({ ...draft, revision: value })} />
            <Field label="ITP title *" value={draft.title} set={(value) => setDraft({ ...draft, title: value })} wide />
            <Field label="Supplier" value={draft.supplier} set={(value) => setDraft({ ...draft, supplier: value })} />
            <SelectField label="Scope" value={draft.scope} options={["", "Trencher", "Barge"]} set={(value) => setDraft({ ...draft, scope: value })} />
            <Field label="Revision date" type="date" value={draft.revisionDate} set={(value) => setDraft({ ...draft, revisionDate: value })} />
            {editingRow && <>
              <Field label="Package" value={draft.packageName} set={(value) => setDraft({ ...draft, packageName: value })} />
              <Field label="Discipline" value={draft.discipline} set={(value) => setDraft({ ...draft, discipline: value })} />
              <Field label="Enshore reviewer" value={draft.reviewer} set={(value) => setDraft({ ...draft, reviewer: value })} />
              <SelectField label="Enshore decision" value={draft.enshoreDecision} options={["Pending Review", "Comments Issued", "Approved", "Rejected"]} set={(value) => setDraft({ ...draft, enshoreDecision: value })} />
              <SelectField label="Overall stage" value={draft.overallStage} options={stages} set={(value) => setDraft({ ...draft, overallStage: value })} />
              <SelectField label="Overall status" value={draft.overallStatus} options={statuses} set={(value) => setDraft({ ...draft, overallStatus: value })} />
              <Field label="Next action" value={draft.nextAction} set={(value) => setDraft({ ...draft, nextAction: value })} />
              <Field label="Action due date" type="date" value={draft.dueDate} set={(value) => setDraft({ ...draft, dueDate: value })} />
            </>}
          </div>
          <div style={dialogActions}><button style={secondaryButton} onClick={() => { setDialogOpen(false); setEditingRow(null); }}>Cancel</button><button style={primaryButton} disabled={busy} onClick={() => void saveUpload()}>{busy ? "Saving…" : editingRow ? "Save changes" : "Save controlled revision"}</button></div>
        </section>
      </div>}
    </main>
  );
}

function Field({ label, value, set, wide, type = "text", placeholder }: { label: string; value: string; set: (value: string) => void; wide?: boolean; type?: string; placeholder?: string }) {
  return <label style={{ ...field, gridColumn: wide ? "1 / -1" : undefined }}><span>{label}</span><input style={input} type={type} value={value} placeholder={placeholder} onChange={(event) => set(event.target.value)} /></label>;
}

function SelectField({ label, value, set, options }: { label: string; value: string; set: (value: string) => void; options: string[] }) {
  return <label style={field}><span>{label}</span><select style={select} value={value} onChange={(event) => set(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

const page: CSSProperties = { display: "grid", gap: 18 };
const metricsGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 16, marginBottom: 2 };
const surface: CSSProperties = { background: "#fff", border: "1px solid #d8e2eb", borderRadius: 20, overflow: "hidden" };
const toolbar: CSSProperties = { padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 };
const viewTabs: CSSProperties = { display: "flex", gap: 6, padding: "0 18px 13px" };
const viewTab: CSSProperties = { border: "1px solid #d5e0e8", borderRadius: 9, background: "#f6f8fa", color: "#526477", padding: "7px 11px", fontWeight: 800, fontSize: 11, cursor: "pointer" };
const activeViewTab: CSSProperties = { ...viewTab, background: "#005670", color: "#fff", borderColor: "#005670" };
const sectionKicker: CSSProperties = { color: "#005670", fontWeight: 900, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase" };
const sectionTitle: CSSProperties = { margin: "3px 0 0", color: "#14263a", fontSize: 20 };
const filters: CSSProperties = { display: "grid", gridTemplateColumns: "minmax(260px,1fr) 150px 165px", gap: 8, padding: "0 18px 13px" };
const input: CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #cbd8e5", borderRadius: 10, padding: "10px 12px", background: "#fff", color: "#17263a", font: "inherit" };
const select: CSSProperties = { ...input };
const primaryButton: CSSProperties = { border: 0, borderRadius: 10, padding: "11px 16px", background: "#005670", color: "#fff", fontWeight: 900, cursor: "pointer" };
const secondaryButton: CSSProperties = { ...primaryButton, background: "#eef3f7", color: "#334155" };
const notice: CSSProperties = { margin: "0 22px 16px", padding: "11px 13px", borderRadius: 10, background: "#fff7d6", color: "#774b00", fontSize: 13 };
const tableWrap: CSSProperties = { width: "100%", borderTop: "1px solid #e2e8f0" };
const table: CSSProperties = { width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: 11 };
const th: CSSProperties = { textAlign: "left", padding: "9px 7px", background: "#1f3043", color: "#fff", fontSize: 9, textTransform: "uppercase", letterSpacing: ".035em" };
const td: CSSProperties = { padding: "8px 7px", borderBottom: "1px solid #e5ebf1", verticalAlign: "top", color: "#26384b", overflow: "hidden" };
const docNo: CSSProperties = { display: "block", color: "#167f7c" };
const secondary: CSSProperties = { display: "block", color: "#6b7b8c", marginTop: 3, lineHeight: 1.25, fontSize: 10 };
const compactTitle: CSSProperties = { ...secondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const cellInput: CSSProperties = { width: "100%", minWidth: 0, boxSizing: "border-box", border: "1px solid #d5dee8", borderRadius: 6, background: "#fff", color: "#26384b", padding: "6px 5px", fontSize: 10 };
const cellSelect: CSSProperties = { ...cellInput, fontWeight: 800, paddingRight: 2 };
const pill: CSSProperties = { display: "inline-block", padding: "5px 9px", borderRadius: 999, fontWeight: 900, fontSize: 11, whiteSpace: "nowrap" };
const linkButton: CSSProperties = { border: 0, background: "transparent", color: "#005670", fontWeight: 900, cursor: "pointer", padding: 4 };
const rowActions: CSSProperties = { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 3 };
const editButton: CSSProperties = { border: "1px solid #9accca", borderRadius: 6, background: "#eef9f8", color: "#005670", padding: "4px 6px", fontSize: 9, fontWeight: 900, cursor: "pointer" };
const deleteButton: CSSProperties = { ...editButton, borderColor: "#fecaca", background: "#fff1f2", color: "#b42318" };
const historyButton: CSSProperties = { border: 0, width: 27, height: 27, borderRadius: 999, background: "#e7f5f4", color: "#005670", fontWeight: 900, cursor: "pointer" };
const empty: CSSProperties = { padding: 35, textAlign: "center", color: "#64748b" };
const archive: CSSProperties = { borderTop: "1px solid #e2e8f0", padding: 16, display: "grid", gap: 8 };
const archiveIntro: CSSProperties = { display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: 12, padding: "0 2px 7px" };
const archiveRow: CSSProperties = { display: "grid", gridTemplateColumns: "1.25fr .55fr 1.5fr 100px 130px", gap: 12, alignItems: "center", border: "1px solid #dce5ee", borderRadius: 10, padding: "10px 12px", background: "#f9fbfc", fontSize: 11 };
const historyCell: CSSProperties = { padding: 18, background: "#f5f8fb", borderBottom: "1px solid #dce5ee" };
const historyHeader: CSSProperties = { display: "flex", justifyContent: "space-between", color: "#536579", marginBottom: 12 };
const historyList: CSSProperties = { display: "grid", gap: 8 };
const historyRow: CSSProperties = { display: "grid", gridTemplateColumns: "90px 1fr 100px 90px", alignItems: "center", gap: 12, background: "#fff", border: "1px solid #dbe5ee", borderRadius: 10, padding: 11 };
const revisionBadge: CSSProperties = { fontWeight: 900, color: "#183a5a" };
const small: CSSProperties = { display: "block", color: "#718096", marginTop: 3 };
const currentPill: CSSProperties = { ...pill, background: "#dcfce7", color: "#166534", textAlign: "center" };
const supersededPill: CSSProperties = { ...pill, background: "#e8edf3", color: "#5a6878", textAlign: "center" };
const overlay: CSSProperties = { position: "fixed", inset: 0, background: "rgba(15,23,42,.58)", zIndex: 1000, padding: 22, overflowY: "auto", display: "grid", placeItems: "start center" };
const dialog: CSSProperties = { width: "min(920px,100%)", background: "#fff", borderRadius: 20, padding: 24, boxShadow: "0 28px 70px rgba(0,0,0,.25)", display: "grid", gap: 18 };
const dialogHeader: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "start" };
const closeButton: CSSProperties = { border: 0, background: "#eef2f6", borderRadius: 999, width: 34, height: 34, fontSize: 23, cursor: "pointer" };
const dropzone: CSSProperties = { border: "2px dashed #9accca", borderRadius: 14, padding: 24, background: "#f2fbfa", color: "#256f6d", display: "grid", gap: 5, textAlign: "center", cursor: "pointer" };
const confidence: CSSProperties = { background: "#eef5fb", color: "#355b7c", padding: "9px 12px", borderRadius: 9, fontSize: 13 };
const formGrid: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 };
const field: CSSProperties = { display: "grid", gap: 6, color: "#405267", fontWeight: 800, fontSize: 12 };
const dialogActions: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: 10, borderTop: "1px solid #e5ebf1", paddingTop: 17 };

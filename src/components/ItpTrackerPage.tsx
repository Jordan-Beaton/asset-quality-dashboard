"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { CSSProperties, ChangeEvent } from "react";
import * as XLSX from "xlsx";
import { ImsTopMetaRow } from "./ImsPrimitives";
import { QualityPageHero } from "./QualityPageHero";
import { ProjectWorkspaceNav } from "./ProjectWorkspaceNav";
import { DueCell, GateChips, NotifyPicker, PersonSelect, WaitingOn, callWorkflow, type PersonOption } from "./ItpWorkflowParts";
import { supabase } from "../lib/supabase";
import { getProject } from "../lib/projectRegistry";
import { useUrlFlag, useUrlState } from "../lib/useUrlState";
import {
  STATE_HINT,
  STATE_LABEL,
  WORKFLOW_STATES,
  daysLate,
  holderOf,
  isGateOpen,
  notifyListOf,
  sameEmail,
  type ItpPerson,
  type WorkflowRevision,
  type WorkflowState,
} from "../lib/itpWorkflow";

const STORAGE_BUCKET = "project-documents";

type Revision = WorkflowRevision & {
  id: string;
  itp_id: string;
  revision: string;
  revision_date: string | null;
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
  updated_at: string;
  project_itp_revisions?: Revision[];
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
  confidence: string;
  reviewerEmail: string;
  approverEmail: string;
  notify: ItpPerson[];
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
  confidence: "Filename only",
  reviewerEmail: "",
  approverEmail: "",
  notify: [],
};

const GATE_FILTERS = ["All", ...WORKFLOW_STATES] as const;

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

const SETUP_NOTICE = "The ITP stage gate needs its one-off database setup. Run scripts/sql/project_itp_stage_gate.sql in Supabase.";

// Overdue first, then open gates by due date, then the rest, so what needs attention is always at the top.
function attentionOrder(a: { revision: Revision | undefined; row: Itp }, b: { revision: Revision | undefined; row: Itp }) {
  const rank = (state: WorkflowState | undefined) => (state === "Awaiting Review" || state === "Awaiting Approval" ? 0 : state === "With Supplier" ? 1 : 2);
  const lateA = a.revision ? daysLate(a.revision) : 0;
  const lateB = b.revision ? daysLate(b.revision) : 0;
  if (lateA !== lateB) return lateB - lateA;
  const rankA = rank(a.revision?.workflow_state);
  const rankB = rank(b.revision?.workflow_state);
  if (rankA !== rankB) return rankA - rankB;
  if (rankA === 0) {
    const dueA = a.revision?.gate_due_date || "9999";
    const dueB = b.revision?.gate_due_date || "9999";
    if (dueA !== dueB) return dueA.localeCompare(dueB);
  }
  return b.row.updated_at.localeCompare(a.row.updated_at);
}

export function ItpTrackerPage({ projectKey }: { projectKey: string }) {
  const config = getProject(projectKey);
  const [rows, setRows] = useState<Itp[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [setupMissing, setSetupMissing] = useState(false);
  const [query, setQuery] = useUrlState("search", "");
  const [gate, setGate] = useUrlState<(typeof GATE_FILTERS)[number]>("gate", "All", GATE_FILTERS);
  const [scope, setScope] = useUrlState("scope", "All");
  const [mine, setMine] = useUrlFlag("mine");
  const [overdueOnly, setOverdueOnly] = useUrlFlag("overdue");
  const [layout, setLayout] = useUrlState<"table" | "board">("layout", "table", ["table", "board"]);
  const [registerView, setRegisterView] = useUrlState<"current" | "archive">("view", "current", ["current", "archive"]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [draft, setDraft] = useState<UploadDraft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [peopleOptions, setPeopleOptions] = useState<PersonOption[]>([]);
  const [myEmail, setMyEmail] = useState("");

  const load = useCallback(async (keepMessage = false) => {
    setLoading(true);
    const [{ data, error }, peopleResult, auth] = await Promise.all([
      supabase
        .from("project_itps")
        .select("*, project_itp_revisions(*)")
        .eq("project_key", projectKey)
        .order("updated_at", { ascending: false }),
      supabase
        .from("people")
        .select("id,name,role,department,email")
        .eq("active", true)
        .not("email", "is", null)
        .order("name", { ascending: true }),
      supabase.auth.getUser(),
    ]);
    if (error) setMessage(error.message.includes("project_itps") ? "The ITP database setup is not live yet. Apply scripts/sql/project_itp_tracker.sql in Supabase." : error.message);
    else {
      const loaded = (data || []) as Itp[];
      setRows(loaded);
      const missing = loaded.some((row) => (row.project_itp_revisions || []).some((revision) => revision.workflow_state === undefined));
      setSetupMissing(missing);
      if (missing) setMessage(SETUP_NOTICE); else if (!keepMessage) setMessage("");
    }
    if (!peopleResult.error) setPeopleOptions((peopleResult.data || []) as PersonOption[]);
    setMyEmail((auth.data.user?.email || "").toLowerCase());
    setLoading(false);
  }, [projectKey]);

  useEffect(() => { void load(); }, [load]);

  // The ITP record links here to upload a new revision, so open the upload dialog straight away.
  const [uploadRequested, setUploadRequested] = useUrlFlag("upload");
  useEffect(() => {
    if (!uploadRequested || loading) return;
    if (!setupMissing) { setFile(null); setDraft(emptyDraft); setDialogOpen(true); }
    setUploadRequested(false);
  }, [uploadRequested, loading, setupMissing, setUploadRequested]);

  const entries =useMemo(() => rows.map((row) => ({ row, revision: currentRevision(row) })), [rows]);

  const counts = useMemo(() => {
    const result: Record<WorkflowState, number> = { "With Supplier": 0, "Awaiting Review": 0, "Awaiting Approval": 0, Approved: 0 };
    for (const { revision } of entries) if (revision?.workflow_state && revision.workflow_state in result) result[revision.workflow_state] += 1;
    return result;
  }, [entries]);
  const mineCount = useMemo(() => entries.filter(({ revision }) => revision && isGateOpen(revision.workflow_state) && sameEmail(holderOf(revision)?.email, myEmail)).length, [entries, myEmail]);
  const overdueCount = useMemo(() => entries.filter(({ revision }) => revision && daysLate(revision) > 0).length, [entries]);

  const filtered = useMemo(() => {
    const needle = query.toLowerCase();
    return entries.filter(({ row, revision }) => {
      const haystack = [row.document_number, row.title, row.supplier, row.scope, row.package_name, revision?.revision].join(" ").toLowerCase();
      return (!needle || haystack.includes(needle))
        && (gate === "All" || revision?.workflow_state === gate)
        && (scope === "All" || row.scope === scope)
        && (!mine || (revision && isGateOpen(revision.workflow_state) && sameEmail(holderOf(revision)?.email, myEmail)))
        && (!overdueOnly || (revision && daysLate(revision) > 0));
    }).sort(attentionOrder);
  }, [entries, query, gate, scope, mine, overdueOnly, myEmail]);

  const scopes = useMemo(() => [...new Set(rows.map((row) => row.scope).filter(Boolean) as string[])].sort(), [rows]);
  const archivedRevisions = useMemo(() => rows.flatMap((row) =>
    (row.project_itp_revisions || [])
      .filter((revision) => !revision.is_current)
      .map((revision) => ({ row, revision })),
  ).sort((a, b) => b.revision.uploaded_at.localeCompare(a.revision.uploaded_at)), [rows]);

  const total = rows.length;
  const filtersActive = gate !== "All" || mine || overdueOnly || scope !== "All" || Boolean(query);

  function clearFilters() {
    setGate("All"); setMine(false); setOverdueOnly(false); setScope("All"); setQuery("");
  }

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] || null;
    setFile(selected);
    if (!selected) return;
    setBusy(true);
    try {
      const extracted = await extractDraft(selected);
      const existing = rows.find((row) => row.document_number.toLowerCase() === extracted.documentNumber.toLowerCase());
      const previous = existing ? currentRevision(existing) : undefined;
      setDraft(existing ? {
        ...extracted,
        title: extracted.title || existing.title,
        supplier: extracted.supplier || existing.supplier || "",
        scope: extracted.scope || existing.scope || "",
        packageName: extracted.packageName || existing.package_name || "",
        discipline: extracted.discipline || existing.discipline || "",
        reviewerEmail: previous?.reviewer_email || "",
        approverEmail: previous?.approver_email || "",
        notify: previous ? notifyListOf(previous) : [],
      } : extracted);
      if (existing) setMessage(`Existing ITP recognised. Master details and the previous reviewer, approver and copy list have been carried forward; revision ${extracted.revision || "not detected"} will start a fresh review at Gate 1.`);
      else setMessage("");
    } catch {
      setDraft(filenameDraft(selected.name));
      setMessage("The file is ready, but metadata extraction was limited. Please confirm the highlighted fields.");
    } finally {
      setBusy(false);
    }
  }

  async function saveUpload() {
    if (!draft.documentNumber || !draft.title || !draft.revision || !file) {
      setMessage("Choose a file and confirm the document number, title, and revision.");
      return;
    }
    if (draft.reviewerEmail && draft.approverEmail && sameEmail(draft.reviewerEmail, draft.approverEmail)) {
      setMessage("The reviewer and approver must be different people.");
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
        project_key: projectKey,
        document_number: draft.documentNumber.trim(),
        title: draft.title.trim(),
        supplier: draft.supplier.trim() || null,
        scope: draft.scope.trim() || null,
        package_name: draft.packageName.trim() || null,
        discipline: draft.discipline.trim() || null,
        updated_at: new Date().toISOString(),
      };
      if (!itpId) {
        const { data, error } = await supabase.from("project_itps").insert({ ...masterPayload, created_by: auth.user?.id }).select("id").single();
        if (error) throw error;
        itpId = data.id;
        createdMasterId = data.id;
      }
      const sourceFile = file;
      const safeName = sourceFile.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
      uploadedPath = `${projectKey}/${itpId}/${Date.now()}-${safeName}`;
      const upload = await supabase.storage.from(STORAGE_BUCKET).upload(uploadedPath, sourceFile, { contentType: sourceFile.type || undefined, upsert: false });
      if (upload.error) throw upload.error;
      const { data: insertedRevision, error: revisionError } = await supabase.from("project_itp_revisions").insert({
        itp_id: itpId,
        revision: draft.revision.trim(),
        revision_date: draft.revisionDate || null,
        supplier_status: "Draft Received",
        enshore_decision: "Pending Review",
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
      setFile(null);
      setDraft(emptyDraft);
      // The file is safely stored; now open Gate 1. A problem here never undoes the upload, it is reported instead.
      let started = "";
      try {
        const result = await callWorkflow<{ ok: boolean; warning?: string }>({
          action: "start",
          revisionId: insertedRevisionId,
          reviewerEmail: draft.reviewerEmail || null,
          approverEmail: draft.approverEmail || null,
          notifyEmails: draft.notify.map((person) => person.email),
        });
        started = draft.reviewerEmail
          ? (result.warning ? ` The reviewer could not be emailed: ${result.warning}` : " The reviewer has been emailed.")
          : " No reviewer is assigned yet, so nobody has been emailed. Open the ITP to choose one.";
      } catch (error) {
        started = ` The review could not be started: ${error instanceof Error ? error.message : "unknown problem"}. Open the ITP to assign people.`;
      }
      setMessage(`${existing ? `Revision ${draft.revision} added and the previous revision retained.` : "ITP created and the source document retained."}${started}`);
      await load(true);
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
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(revision.file_path, 60 * 60 * 24 * 180);
    if (error) setMessage(error.message);
    else window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  const stageColour: Record<WorkflowState, string> = { "With Supplier": "#F93822", "Awaiting Review": "#FFAD00", "Awaiting Approval": "#FFAD00", Approved: "#005670" };
  const stageClass: Record<WorkflowState, string> = { "With Supplier": "is-supplier", "Awaiting Review": "is-review", "Awaiting Approval": "is-approval", Approved: "is-approved" };

  return (
    <main className="itp-scope" style={page}>
      <QualityPageHero label={`${config.label} · Document intelligence`} title="ITP Tracker" description="One controlled record per ITP, a two-gate review and approval, and a complete trail of who decided what." />

      <ImsTopMetaRow status={<><strong>Status:</strong> {message || "Latest active ITP revisions loaded."}</>} />
      <ProjectWorkspaceNav projectKey={projectKey} active="itp" />

      <section className="itp-pipeline" aria-label="ITPs by stage gate">
        <div className="itp-stages">
          {WORKFLOW_STATES.map((state) => (
            <button key={state} type="button" className={`itp-stage ${stageClass[state]}`} aria-pressed={gate === state} onClick={() => { setRegisterView("current"); setGate(gate === state ? "All" : state); }}>
              <span className="itp-stage-n">{counts[state]}</span>
              <span className="itp-stage-l">{STATE_LABEL[state]}</span>
              <span className="itp-stage-w">{STATE_HINT[state]}</span>
            </button>
          ))}
        </div>
        <div className="itp-stackbar" aria-hidden="true">
          {WORKFLOW_STATES.map((state) => counts[state] ? <i key={state} style={{ flex: counts[state], background: stageColour[state] }} /> : null)}
        </div>
        <div className="itp-chips">
          <button type="button" className="itp-chip" aria-pressed={mine} onClick={() => setMine(!mine)}>My queue <span className="itp-num">{mineCount}</span></button>
          <button type="button" className="itp-chip" aria-pressed={overdueOnly} onClick={() => setOverdueOnly(!overdueOnly)}>Overdue <span className="itp-num">{overdueCount}</span></button>
          {filtersActive ? <button type="button" className="itp-chip" aria-pressed="false" onClick={clearFilters}>Clear filters</button> : null}
          <span className="itp-sub" style={{ marginLeft: "auto" }}>{total} {total === 1 ? "ITP" : "ITPs"} · the counts also filter the list</span>
        </div>
      </section>

      <section style={surface}>
        <div style={toolbar}>
          <div>
            <div style={sectionKicker}>Master register</div>
            <h2 style={sectionTitle}>Supplier ITP programme</h2>
          </div>
          <button style={primaryButton} disabled={setupMissing} onClick={() => { setFile(null); setDraft(emptyDraft); setDialogOpen(true); }}>+ Upload ITP / revision</button>
        </div>
        <div className="ims-tabs" style={viewTabs} role="tablist" aria-label="ITP register views">
          <button role="tab" aria-selected={registerView === "current"} data-active={registerView === "current" ? "true" : "false"} style={registerView === "current" ? activeViewTab : viewTab} onClick={() => setRegisterView("current")}>Current register ({rows.length})</button>
          <button role="tab" aria-selected={registerView === "archive"} data-active={registerView === "archive" ? "true" : "false"} style={registerView === "archive" ? activeViewTab : viewTab} onClick={() => setRegisterView("archive")}>Revision archive ({archivedRevisions.length})</button>
        </div>
        {registerView === "current" ? <>
          <div style={filtersWrap}>
            <div className="itp-tools">
              <input style={input} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ITP number, title, supplier or package..." aria-label="Search ITPs" />
              <select style={select} value={scope} onChange={(event) => setScope(event.target.value)} aria-label="Scope"><option value="All">All scopes</option>{scopes.map((value) => <option key={value}>{value}</option>)}</select>
              <div className="itp-viewtoggle" role="group" aria-label="Layout">
                <button type="button" aria-pressed={layout === "table"} onClick={() => setLayout("table")}>Table</button>
                <button type="button" aria-pressed={layout === "board"} onClick={() => setLayout("board")}>Board</button>
              </div>
            </div>
          </div>
          {message && <div style={notice}>{message}</div>}
          <div style={{ padding: "0 18px 18px" }}>
            {layout === "table" ? (
              <div className="itp-reg" role="list">
                <div className="itp-rhead" aria-hidden="true"><span>ITP</span><span>Rev</span><span>Stage gate</span><span>Waiting on</span><span>Due</span><span /></div>
                {filtered.map(({ row, revision }) => revision ? (
                  <Link key={row.id} className="itp-rrow" role="listitem" href={`/projects/${projectKey}/itp/${row.id}`} style={rowLink}>
                    <span><span className="itp-docno">{row.document_number}</span><span className="itp-ttl" title={row.title}>{row.title}</span><span className="itp-sub">{[row.supplier, row.scope].filter(Boolean).join(" · ")}</span></span>
                    <span><strong>{revision.revision}</strong><span className="itp-sub">{revision.revision_date ? new Date(`${revision.revision_date}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""}</span></span>
                    <span><GateChips revision={revision} />{revision.legacy_approved ? <span className="itp-sub">Approved before the stage gate</span> : null}</span>
                    <span><WaitingOn revision={revision} supplier={row.supplier} /></span>
                    <span className="itp-num"><DueCell revision={revision} /></span>
                    <span className="itp-chev" aria-hidden="true">›</span>
                  </Link>
                ) : null)}
                {!loading && filtered.length === 0 && <div className="itp-regfoot">{rows.length ? "No ITPs match these filters." : "No ITPs yet. Upload the first supplier ITP to start the register."}</div>}
                {loading && <div className="itp-regfoot">Loading the controlled register...</div>}
              </div>
            ) : (
              <div className="itp-board">
                {WORKFLOW_STATES.map((state) => {
                  const column = filtered.filter(({ revision }) => revision?.workflow_state === state);
                  return (
                    <div key={state} className={`itp-col ${stageClass[state]}`}>
                      <h4><span>{STATE_LABEL[state]}</span><span className="itp-num">{column.length}</span></h4>
                      {column.map(({ row, revision }) => revision ? (
                        <Link key={row.id} className="itp-kcard" href={`/projects/${projectKey}/itp/${row.id}`} style={rowLink}>
                          <span><span className="itp-docno">{row.document_number}</span><span className="itp-ttl" title={row.title}>{row.title}</span></span>
                          <span className="itp-sub">{[row.supplier, `Rev ${revision.revision}`].filter(Boolean).join(" · ")}</span>
                          <WaitingOn revision={revision} supplier={row.supplier} />
                          {daysLate(revision) > 0 ? <span className="itp-late" style={{ fontSize: 11 }}>{daysLate(revision)} days late</span> : null}
                        </Link>
                      ) : null)}
                      {!column.length ? <span className="itp-sub">Nothing here</span> : null}
                    </div>
                  );
                })}
              </div>
            )}
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

      {dialogOpen && <div style={overlay} onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setDialogOpen(false); }}>
        <section style={dialog} role="dialog" aria-modal="true" aria-label="Upload ITP or new revision">
          <div style={dialogHeader}><div><div style={sectionKicker}>Document intake</div><h2 style={sectionTitle}>Upload ITP or new revision</h2></div><button style={closeButton} aria-label="Close" onClick={() => setDialogOpen(false)}>×</button></div>
          <label style={dropzone}><input type="file" accept=".xlsx,.xls,.xlsm,.pdf,.docx" onChange={(event) => void chooseFile(event)} style={{ display: "none" }} /><strong>{file ? file.name : "Choose the ITP document"}</strong><span>{busy ? "Reading document metadata..." : "Excel, PDF, or Word · the original file will be retained"}</span></label>
          {file && <div style={confidence}>Extraction confidence: <strong>{draft.confidence}</strong> · Confirm the fields before saving.</div>}
          <div style={formGrid}>
            <FieldInput label="Document number *" value={draft.documentNumber} set={(value) => setDraft({ ...draft, documentNumber: value })} />
            <FieldInput label="Revision *" value={draft.revision} set={(value) => setDraft({ ...draft, revision: value })} />
            <FieldInput label="ITP title *" value={draft.title} set={(value) => setDraft({ ...draft, title: value })} wide />
            <FieldInput label="Supplier" value={draft.supplier} set={(value) => setDraft({ ...draft, supplier: value })} />
            <SelectField label="Scope" value={draft.scope} options={["", ...config.scopeOptions]} set={(value) => setDraft({ ...draft, scope: value })} />
            <FieldInput label="Revision date" type="date" value={draft.revisionDate} set={(value) => setDraft({ ...draft, revisionDate: value })} />
          </div>
          <div className="itp-callout info" style={{ display: "grid", gap: 12 }}>
            <div><strong>Who looks at this ITP?</strong><div className="itp-muted" style={{ fontSize: 12 }}>Choose people to suit the work: expertise differs from ITP to ITP. The reviewer decides first and is emailed straight away, then the approver decides.</div></div>
            <div style={formGrid}>
              <label style={field}><span>Reviewer · Gate 1</span><PersonSelect id="upload-reviewer" value={draft.reviewerEmail} people={peopleOptions} exclude={draft.approverEmail ? [draft.approverEmail] : []} placeholder="Choose later" onChange={(value) => setDraft({ ...draft, reviewerEmail: value })} /></label>
              <label style={field}><span>Approver · Gate 2</span><PersonSelect id="upload-approver" value={draft.approverEmail} people={peopleOptions} exclude={draft.reviewerEmail ? [draft.reviewerEmail] : []} placeholder="Choose when the review is done" onChange={(value) => setDraft({ ...draft, approverEmail: value })} /></label>
            </div>
            <label style={field}><span>Also copy in</span><NotifyPicker id="upload-notify" value={draft.notify} people={peopleOptions} exclude={[draft.reviewerEmail, draft.approverEmail].filter(Boolean)} onChange={(notify) => setDraft({ ...draft, notify })} /></label>
            {!draft.reviewerEmail ? <div className="itp-muted" style={{ fontSize: 12 }}>With no reviewer chosen, nobody is emailed and the three-day review clock does not start.</div> : null}
          </div>
          <div style={dialogActions}><button style={secondaryButton} onClick={() => setDialogOpen(false)} disabled={busy}>Cancel</button><button style={primaryButton} disabled={busy || !file} onClick={() => void saveUpload()}>{busy ? "Saving..." : draft.reviewerEmail ? "Save and email reviewer" : "Save controlled revision"}</button></div>
        </section>
      </div>}
    </main>
  );
}

function FieldInput({ label, value, set, wide, type = "text", placeholder }: { label: string; value: string; set: (value: string) => void; wide?: boolean; type?: string; placeholder?: string }) {
  return <label style={{ ...field, gridColumn: wide ? "1 / -1" : undefined }}><span>{label}</span><input style={input} type={type} value={value} placeholder={placeholder} onChange={(event) => set(event.target.value)} /></label>;
}

function SelectField({ label, value, set, options }: { label: string; value: string; set: (value: string) => void; options: string[] }) {
  return <label style={field}><span>{label}</span><select style={select} value={value} onChange={(event) => set(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

const page: CSSProperties = { display: "grid", gap: 18 };
const surface: CSSProperties = { background: "#fff", border: "1px solid #D0D0CE", borderRadius: 20, overflow: "hidden" };
const toolbar: CSSProperties = { padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 };
const viewTabs: CSSProperties = { display: "flex", gap: 6, padding: "0 18px 13px" };
const viewTab: CSSProperties = { border: "1px solid #D0D0CE", borderRadius: 9, background: "#ECECE7", color: "#53565A", padding: "7px 11px", fontWeight: 800, fontSize: 11, cursor: "pointer" };
const activeViewTab: CSSProperties = { ...viewTab, background: "#005670", color: "#fff", borderColor: "#005670" };
const sectionKicker: CSSProperties = { color: "#005670", fontWeight: 900, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase" };
const sectionTitle: CSSProperties = { margin: "3px 0 0", color: "#53565A", fontSize: 20 };
const filtersWrap: CSSProperties = { padding: "0 18px 13px" };
const input: CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #D0D0CE", borderRadius: 10, padding: "10px 12px", background: "#fff", color: "#53565A", font: "inherit" };
const select: CSSProperties = { ...input };
const primaryButton: CSSProperties = { border: 0, borderRadius: 10, padding: "11px 16px", background: "#005670", color: "#fff", fontWeight: 900, cursor: "pointer" };
const secondaryButton: CSSProperties = { ...primaryButton, background: "#ECECE7", color: "#53565A" };
const notice: CSSProperties = { margin: "0 18px 14px", padding: "11px 13px", borderRadius: 10, background: "#ECECE7", color: "#000000", fontSize: 13 };
const rowLink: CSSProperties = { textDecoration: "none", color: "inherit" };
const docNo: CSSProperties = { display: "block", color: "#005670" };
const linkButton: CSSProperties = { border: 0, background: "transparent", color: "#005670", fontWeight: 900, cursor: "pointer", padding: 4 };
const empty: CSSProperties = { padding: 35, textAlign: "center", color: "#53565A" };
const archive: CSSProperties = { borderTop: "1px solid #D0D0CE", padding: 16, display: "grid", gap: 8 };
const archiveIntro: CSSProperties = { display: "flex", justifyContent: "space-between", color: "#53565A", fontSize: 12, padding: "0 2px 7px" };
const archiveRow: CSSProperties = { display: "grid", gridTemplateColumns: "1.25fr .55fr 1.5fr 100px 130px", gap: 12, alignItems: "center", border: "1px solid #D0D0CE", borderRadius: 10, padding: "10px 12px", background: "#ECECE7", fontSize: 11 };
const small: CSSProperties = { display: "block", color: "#53565A", marginTop: 3 };
const supersededPill: CSSProperties = { display: "inline-block", padding: "5px 9px", borderRadius: 999, fontWeight: 900, fontSize: 11, whiteSpace: "nowrap", background: "#ECECE7", color: "#53565A", textAlign: "center" };
const overlay: CSSProperties = { position: "fixed", inset: 0, background: "rgba(15,23,42,.58)", zIndex: 1000, padding: 22, overflowY: "auto", display: "grid", placeItems: "start center" };
const dialog: CSSProperties = { width: "min(920px,100%)", background: "#fff", borderRadius: 20, padding: 24, boxShadow: "0 28px 70px rgba(0,0,0,.25)", display: "grid", gap: 18 };
const dialogHeader: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "start" };
const closeButton: CSSProperties = { border: 0, background: "#ECECE7", borderRadius: 999, width: 34, height: 34, fontSize: 23, cursor: "pointer" };
const dropzone: CSSProperties = { border: "2px dashed #63B1BC", borderRadius: 14, padding: 24, background: "#ECECE7", color: "#005670", display: "grid", gap: 5, textAlign: "center", cursor: "pointer" };
const confidence: CSSProperties = { background: "#ECECE7", color: "#53565A", padding: "9px 12px", borderRadius: 9, fontSize: 13 };
const formGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 13 };
const field: CSSProperties = { display: "grid", gap: 6, color: "#53565A", fontWeight: 800, fontSize: 12 };
const dialogActions: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: 10, borderTop: "1px solid #D0D0CE", paddingTop: 17 };

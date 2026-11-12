"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { ImsTopMetaRow } from "./ImsPrimitives";
import { useImsPermissions } from "./ImsPermissions";
import { NotifyPicker, PersonSelect, callWorkflow, type PersonOption } from "./ItpWorkflowParts";
import { ProjectWorkspaceNav } from "./ProjectWorkspaceNav";
import { QualityPageHero } from "./QualityPageHero";
import { supabase } from "../lib/supabase";
import { getProject } from "../lib/projectRegistry";
import {
  STATE_LABEL,
  daysLate,
  daysWaiting,
  formatDateTime,
  formatLongDate,
  formatShortDate,
  gateSteps,
  holderOf,
  notifyListOf,
  sameEmail,
  todayLondon,
  type GateStep,
  type ItpActivity,
  type ItpComment,
  type ItpPerson,
  type WorkflowRevision,
} from "../lib/itpWorkflow";

const STORAGE_BUCKET = "project-documents";
const SETUP_NOTICE = "The ITP stage gate needs its one-off database setup. Run scripts/sql/project_itp_stage_gate.sql in Supabase.";

type Revision = WorkflowRevision & {
  id: string;
  itp_id: string;
  revision: string;
  revision_date: string | null;
  file_name: string;
  file_path: string;
  is_current: boolean;
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
  project_itp_revisions?: Revision[];
};

type Draft = { choice: string | null; note: string; comments: Array<{ ref: string; text: string }>; approverEmail: string; error: string };
const emptyDraft: Draft = { choice: null, note: "", comments: [{ ref: "", text: "" }], approverEmail: "", error: "" };

type Toast = { tone: "ok" | "warn"; text: string } | null;

function currentRevision(itp: Itp) {
  return (itp.project_itp_revisions || []).find((revision) => revision.is_current)
    || [...(itp.project_itp_revisions || [])].sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at))[0];
}

function Option({ name, value, title, text, checked, onChange }: { name: string; value: string; title: string; text: string; checked: boolean; onChange: (value: string) => void }) {
  return (
    <label className="itp-opt">
      <input type="radio" name={name} value={value} checked={checked} onChange={() => onChange(value)} />
      <span><b>{title}</b><span>{text}</span></span>
    </label>
  );
}

export function ItpRecordPage({ projectKey, itpId }: { projectKey: string; itpId: string }) {
  const config = getProject(projectKey);
  const router = useRouter();
  const permissions = useImsPermissions();
  const [itp, setItp] = useState<Itp | null>(null);
  const [activity, setActivity] = useState<ItpActivity[]>([]);
  const [comments, setComments] = useState<ItpComment[]>([]);
  const [people, setPeople] = useState<PersonOption[]>([]);
  const [counts, setCounts] = useState<{ noi: number; review: number } | null>(null);
  const [myEmail, setMyEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState("");
  const [toast, setToast] = useState<Toast>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [showEarlier, setShowEarlier] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState({ documentNumber: "", title: "", supplier: "", scope: "", packageName: "", discipline: "", revision: "", revisionDate: "" });
  const [assign, setAssign] = useState<{ reviewer: string; approver: string; notify: ItpPerson[]; reason: string }>({ reviewer: "", approver: "", notify: [], reason: "" });
  const [assignError, setAssignError] = useState("");
  const [newComment, setNewComment] = useState({ ref: "", body: "" });

  const load = useCallback(async () => {
    const [itpResult, activityResult, commentResult, peopleResult, auth] = await Promise.all([
      supabase.from("project_itps").select("*, project_itp_revisions(*)").eq("id", itpId).eq("project_key", projectKey).maybeSingle(),
      supabase.from("project_itp_activity").select("*").eq("itp_id", itpId).order("created_at", { ascending: false }),
      supabase.from("project_itp_comments").select("*").eq("itp_id", itpId).order("created_at", { ascending: false }),
      supabase.from("people").select("id,name,role,department,email").eq("active", true).not("email", "is", null).order("name", { ascending: true }),
      supabase.auth.getUser(),
    ]);
    if (itpResult.error) { setProblem(itpResult.error.message); setLoading(false); return; }
    if (!itpResult.data) { setProblem("This ITP could not be found. It may have been deleted."); setLoading(false); return; }
    const loaded = itpResult.data as Itp;
    const revision = currentRevision(loaded);
    if (revision && revision.workflow_state === undefined) { setProblem(SETUP_NOTICE); setLoading(false); return; }
    setItp(loaded);
    setProblem(activityResult.error || commentResult.error ? SETUP_NOTICE : "");
    setActivity(activityResult.error ? [] : (activityResult.data || []) as ItpActivity[]);
    setComments(commentResult.error ? [] : (commentResult.data || []) as ItpComment[]);
    if (!peopleResult.error) setPeople((peopleResult.data || []) as PersonOption[]);
    setMyEmail((auth.data.user?.email || "").toLowerCase());
    if (revision) {
      setAssign({ reviewer: revision.reviewer_email || "", approver: revision.approver_email || "", notify: notifyListOf(revision), reason: "" });
      const [noi, review] = await Promise.all([
        supabase.from("project_noi_points").select("id", { count: "exact", head: true }).eq("revision_id", revision.id),
        supabase.from("project_review_points").select("id", { count: "exact", head: true }).eq("revision_id", revision.id),
      ]);
      setCounts({ noi: noi.count || 0, review: review.count || 0 });
    }
    setLoading(false);
  }, [itpId, projectKey]);

  useEffect(() => { void load(); }, [load]);

  const revision = itp ? currentRevision(itp) : undefined;
  const state = revision?.workflow_state;
  const steps = state ? gateSteps(state) : null;
  const isReviewer = Boolean(revision) && sameEmail(revision?.reviewer_email, myEmail);
  const isApprover = Boolean(revision) && sameEmail(revision?.approver_email, myEmail);
  const isUploader = Boolean(revision) && sameEmail(revision?.uploader_email, myEmail);
  const isAdmin = permissions.loaded && (permissions.isMasterAdmin || permissions.isAdmin);
  const canEdit = permissions.loaded && (isAdmin || permissions.canEdit);
  const canAssign = Boolean(revision) && state !== "Approved" && (isAdmin || isUploader || isReviewer);
  const canManageComments = isAdmin || isUploader || isReviewer || isApprover;
  const canComment = canManageComments || Boolean(revision && notifyListOf(revision).some((person) => sameEmail(person.email, myEmail)));
  const holder = revision ? holderOf(revision) : null;
  const late = revision ? daysLate(revision) : 0;
  const waiting = revision ? daysWaiting(revision) : 0;

  const revisionComments = useMemo(() => comments.filter((comment) => comment.revision_id === revision?.id), [comments, revision?.id]);
  const earlierOpen = useMemo(() => comments.filter((comment) => comment.revision_id !== revision?.id && comment.status === "Open"), [comments, revision?.id]);
  const reviewNote = useMemo(() => revisionComments.find((comment) => comment.kind === "Review note"), [revisionComments]);
  const visibleActivity = useMemo(() => activity.filter((event) => showEarlier || !event.revision_id || event.revision_id === revision?.id), [activity, revision?.id, showEarlier]);
  const hasEarlierActivity = activity.some((event) => event.revision_id && event.revision_id !== revision?.id);

  async function run(action: () => Promise<{ warning?: string } | void>, success: string) {
    setBusy(true);
    setToast(null);
    try {
      const result = await action();
      const warning = result && typeof result === "object" ? result.warning : "";
      setToast(warning ? { tone: "warn", text: `${success} The email could not be sent: ${warning}` } : { tone: "ok", text: success });
      setDraft(emptyDraft);
      await load();
      return true;
    } catch (error) {
      setToast({ tone: "warn", text: error instanceof Error ? error.message : "That change could not be saved." });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function submitReview() {
    if (!revision || !draft.choice) return;
    const filled = draft.comments.map((item) => ({ ref: item.ref.trim(), text: item.text.trim() })).filter((item) => item.text);
    if (draft.choice === "comments" && !filled.length) { setDraft({ ...draft, error: "Add at least one comment for the supplier." }); return; }
    if (draft.choice === "reject" && !draft.note.trim()) { setDraft({ ...draft, error: "Give a reason for the rejection." }); return; }
    if (draft.choice === "recommend" && !(draft.approverEmail || revision.approver_email)) { setDraft({ ...draft, error: "Choose who will approve this ITP." }); return; }
    const message = draft.choice === "recommend" ? `Review submitted. ${people.find((p) => p.email === (draft.approverEmail || revision.approver_email))?.name || "The approver"} has been emailed and Gate 2 is open.`
      : draft.choice === "comments" ? "Comments issued. They are logged on the ITP and emailed to the uploader for the supplier."
      : "ITP rejected. The reason is logged and emailed to the uploader for the supplier.";
    await run(() => callWorkflow({ action: "review", revisionId: revision.id, decision: draft.choice, note: draft.note, comments: filled, approverEmail: draft.approverEmail || undefined }), message);
  }

  async function submitApproval() {
    if (!revision || !draft.choice) return;
    if (draft.choice !== "approve" && !draft.note.trim()) { setDraft({ ...draft, error: "Add a reason first." }); return; }
    const message = draft.choice === "approve" ? `Approved. Rev ${revision.revision} is now the controlled revision and the team has been emailed.`
      : draft.choice === "return" ? "Returned to the reviewer. They have been emailed with your reason."
      : "Rejected. The reason is logged and emailed to the uploader for the supplier.";
    await run(() => callWorkflow({ action: "approval", revisionId: revision.id, decision: draft.choice, note: draft.note }), message);
  }

  async function savePeople(startReview = false) {
    if (!revision) return;
    setAssignError("");
    if (assign.reviewer && assign.approver && sameEmail(assign.reviewer, assign.approver) && !(isAdmin && assign.reason.trim())) {
      setAssignError(isAdmin ? "The reviewer and approver are the same person. Give a reason below to override this, or choose someone else." : "The reviewer and approver must be different people.");
      return;
    }
    await run(() => callWorkflow({
      action: "assign",
      revisionId: revision.id,
      reviewerEmail: assign.reviewer || null,
      approverEmail: assign.approver || null,
      notifyEmails: assign.notify.map((person) => person.email),
      overrideReason: assign.reason || undefined,
    }), startReview ? "Reviewer assigned and emailed. The three working day clock has started." : "People saved. Anyone newly assigned to an open gate has been emailed.");
  }

  async function remind() {
    if (!revision) return;
    await run(() => callWorkflow({ action: "remind", revisionId: revision.id }), `Reminder sent to ${holder?.name || "the assignee"}.`);
  }

  async function addComment() {
    if (!revision || !newComment.body.trim()) return;
    const ok = await run(() => callWorkflow({ action: "comment", revisionId: revision.id, body: newComment.body, ref: newComment.ref }), "Comment added.");
    if (ok) setNewComment({ ref: "", body: "" });
  }

  async function toggleComment(comment: ItpComment) {
    await run(() => callWorkflow({ action: "commentStatus", commentId: comment.id, status: comment.status === "Open" ? "Closed" : "Open" }), comment.status === "Open" ? "Comment closed." : "Comment reopened.");
  }

  async function openFile(target: Revision) {
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(target.file_path, 60 * 60 * 24 * 7);
    if (error) setToast({ tone: "warn", text: error.message });
    else window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  function openEdit() {
    if (!itp || !revision) return;
    setEditDraft({ documentNumber: itp.document_number, title: itp.title, supplier: itp.supplier || "", scope: itp.scope || "", packageName: itp.package_name || "", discipline: itp.discipline || "", revision: revision.revision, revisionDate: revision.revision_date || "" });
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!itp || !revision) return;
    if (!editDraft.documentNumber.trim() || !editDraft.title.trim() || !editDraft.revision.trim()) { setToast({ tone: "warn", text: "Confirm the document number, title, and revision." }); return; }
    setBusy(true);
    const master = await supabase.from("project_itps").update({
      document_number: editDraft.documentNumber.trim(),
      title: editDraft.title.trim(),
      supplier: editDraft.supplier.trim() || null,
      scope: editDraft.scope.trim() || null,
      package_name: editDraft.packageName.trim() || null,
      discipline: editDraft.discipline.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq("id", itp.id);
    const revisionUpdate = master.error ? null : await supabase.from("project_itp_revisions").update({ revision: editDraft.revision.trim(), revision_date: editDraft.revisionDate || null }).eq("id", revision.id);
    setBusy(false);
    if (master.error || revisionUpdate?.error) { setToast({ tone: "warn", text: master.error?.message || revisionUpdate?.error?.message || "The record could not be updated." }); return; }
    setEditOpen(false);
    setToast({ tone: "ok", text: "Details saved." });
    await load();
  }

  async function deleteItp() {
    if (!itp) return;
    const revisionCount = itp.project_itp_revisions?.length || 0;
    if (!window.confirm(`Delete ${itp.document_number} and all ${revisionCount} stored revision file${revisionCount === 1 ? "" : "s"}, with its comments and activity? This cannot be undone.`)) return;
    setBusy(true);
    const paths = (itp.project_itp_revisions || []).map((item) => item.file_path).filter(Boolean);
    const deleted = await supabase.from("project_itps").delete().eq("id", itp.id);
    if (deleted.error) { setToast({ tone: "warn", text: deleted.error.message }); setBusy(false); return; }
    if (paths.length) await supabase.storage.from(STORAGE_BUCKET).remove(paths);
    router.push(`/projects/${projectKey}/itp`);
  }

  // ---------- pieces ----------

  function stepper() {
    if (!revision || !steps) return null;
    const legacy = revision.legacy_approved;
    const icon = (step: GateStep) => (step === "done" ? "✓" : step === "returned" ? "!" : step === "active" ? "●" : "");
    const reviewWho = legacy ? "Not recorded" : revision.reviewed_by_name || revision.reviewer_name || "No reviewer yet";
    const approvalWho = legacy ? "Not recorded" : revision.approved_by_name || revision.approver_name || "Chosen after review";
    const reviewSub = legacy ? "Before the stage gate"
      : steps.review === "done" ? formatShortDate(revision.reviewed_at)
      : steps.review === "active" ? (revision.gate_due_date ? `Due ${formatShortDate(revision.gate_due_date)}` : "Needs a reviewer")
      : revision.approval_outcome === "Rejected" ? "Rejected at approval" : `${revision.review_outcome || "Comments issued"} ${formatShortDate(revision.reviewed_at)}`.trim();
    const approvalSub = legacy ? "Before the stage gate"
      : steps.approval === "done" ? formatShortDate(revision.approved_at)
      : steps.approval === "active" ? (revision.gate_due_date ? `Due ${formatShortDate(revision.gate_due_date)}` : "") : "After review";
    const items: Array<{ cls: string; ic: string; title: string; who: string; sub: string }> = [
      { cls: "done", ic: "✓", title: "Received", who: revision.uploader_name || "Uploaded", sub: `Rev ${revision.revision} · ${formatShortDate(revision.uploaded_at)}` },
      { cls: steps.review, ic: icon(steps.review), title: "Gate 1 · Review", who: reviewWho, sub: reviewSub },
      { cls: steps.approval, ic: icon(steps.approval), title: "Gate 2 · Approval", who: approvalWho, sub: approvalSub },
      { cls: state === "Approved" ? "done" : "idle", ic: state === "Approved" ? "✓" : "", title: "Approved", who: "Controlled revision", sub: state === "Approved" ? formatShortDate(revision.approved_at) : "Not yet" },
    ];
    return (
      <ol className="itp-stepper" aria-label="Stage gate progress">
        {items.map((item) => (
          <li key={item.title} className={`itp-node ${item.cls}`}>
            <span className="itp-dot" aria-hidden="true">{item.ic}</span>
            <span className="itp-nt">{item.title}</span>
            <span className="itp-nw">{item.who}</span>
            <span className="itp-ns">{item.sub}</span>
          </li>
        ))}
      </ol>
    );
  }

  function toastView() {
    if (!toast) return null;
    return <div className={`itp-toast${toast.tone === "warn" ? " warn" : ""}`} role="status"><span>{toast.text}</span><button type="button" style={toastClose} onClick={() => setToast(null)}>Dismiss</button></div>;
  }

  function openCommentsNotice() {
    if (!earlierOpen.length) return null;
    return <div className="itp-callout warn">{earlierOpen.length} comment{earlierOpen.length === 1 ? "" : "s"} from an earlier revision {earlierOpen.length === 1 ? "is" : "are"} still marked Open. Check this revision deals with {earlierOpen.length === 1 ? "it" : "them"}, then close {earlierOpen.length === 1 ? "it" : "them"} in the Comments panel.</div>;
  }

  function actionPanel() {
    if (!revision || !itp || !state) return null;

    if (state === "Approved") {
      return (
        <section className="itp-card">
          <div className="itp-card-h"><h3>Approved</h3><span className="itp-pill ok">Controlled revision</span></div>
          <p className="itp-muted" style={flat}>{revision.legacy_approved
            ? `Approved ${formatShortDate(revision.approved_at)} before the stage gate was introduced. No reviewer or approver names were recorded for this approval.`
            : `${revision.approved_by_name || "The approver"} approved Rev ${revision.revision} on ${formatLongDate(revision.approved_at?.slice(0, 10))}, after review by ${revision.reviewed_by_name || "the reviewer"}.`}</p>
          <div className="itp-submit"><span className="itp-sends">A new revision restarts the review at Gate 1.</span>
            <span style={buttonRow}><button type="button" style={ghostButton} onClick={() => void openFile(revision)}>Open document</button><Link style={{ ...primaryButton, textDecoration: "none" }} href={`/projects/${projectKey}/itp?upload=1`}>Upload new revision</Link></span></div>
        </section>
      );
    }

    if (state === "With Supplier") {
      return (
        <section className="itp-card">
          <div className="itp-card-h"><h3>With supplier</h3><span className="itp-pill bad">{revision.review_outcome === "Rejected" || revision.approval_outcome === "Rejected" ? "Rejected" : "Comments issued"}</span></div>
          <p className="itp-muted" style={flat}>{revision.review_outcome === "Rejected" || revision.approval_outcome === "Rejected" ? "This revision was rejected." : "Comments were issued on this revision."} The reasons are in Comments. The next step is a new revision from {itp.supplier || "the supplier"}, which restarts the review at Gate 1 and emails the reviewer.</p>
          <div className="itp-submit"><span className="itp-sends">The comments email went to {revision.uploader_name || "the uploader"}.</span>
            <Link style={{ ...primaryButton, textDecoration: "none" }} href={`/projects/${projectKey}/itp?upload=1`}>Upload new revision</Link></div>
        </section>
      );
    }

    if (state === "Awaiting Review" && !revision.reviewer_email) {
      return (
        <section className="itp-card">
          <div className="itp-card-h"><h3>Choose a reviewer</h3><span className="itp-pill bad">Not started</span></div>
          <div className="itp-callout warn">Nobody has been emailed yet, so the review has not started. Pick a reviewer to open Gate 1 and start the three working day clock.</div>
          {canAssign ? <>
            <label className="itp-field"><span>Reviewer · Gate 1</span><PersonSelect id="start-reviewer" value={assign.reviewer} people={people} exclude={assign.approver ? [assign.approver] : []} onChange={(value) => setAssign({ ...assign, reviewer: value })} /></label>
            <div className="itp-submit"><span className="itp-sends">They are emailed straight away.</span><button type="button" style={primaryButton} disabled={busy || !assign.reviewer} onClick={() => void savePeople(true)}>Assign and email reviewer</button></div>
          </> : <p className="itp-muted" style={flat}>Ask the person who uploaded this ITP, or the Quality Lead, to choose a reviewer.</p>}
        </section>
      );
    }

    if (state === "Awaiting Review" && isReviewer) {
      const choice = draft.choice;
      const needsApprover = choice === "recommend" && !revision.approver_email;
      return (
        <section className="itp-card" aria-label="Your review">
          <div className="itp-card-h"><h3>Your review</h3><span className={`itp-pill ${late ? "bad" : "wait"}`}>{late ? `${late} ${late === 1 ? "day" : "days"} overdue` : `Due ${formatShortDate(revision.gate_due_date)}`}</span></div>
          <p className="itp-muted" style={flat}>Open Rev {revision.revision}, check it against the supplier PO and Enshore requirements, then record your decision. {revision.approver_name ? `${revision.approver_name} approves next.` : "You will choose who approves it next."}</p>
          <div><button type="button" style={ghostButton} onClick={() => void openFile(revision)}>Open document ↗</button></div>
          {openCommentsNotice()}
          <fieldset className="itp-opts"><legend className="itp-kicker" style={{ marginBottom: 8 }}>Decision</legend>
            <Option name="decision" value="recommend" title="Recommend for approval" text={revision.approver_name ? `Sends it to ${revision.approver_name} for the second gate.` : "Sends it to an approver you choose for the second gate."} checked={choice === "recommend"} onChange={(value) => setDraft({ ...draft, choice: value, error: "" })} />
            <Option name="decision" value="comments" title="Issue comments to the supplier" text="Stops here until a new revision arrives. Each comment is logged with an Open marker." checked={choice === "comments"} onChange={(value) => setDraft({ ...draft, choice: value, error: "" })} />
            <Option name="decision" value="reject" title="Reject" text="Not acceptable as issued. A written reason is required." checked={choice === "reject"} onChange={(value) => setDraft({ ...draft, choice: value, error: "" })} />
          </fieldset>
          {choice === "recommend" ? (
            <label className="itp-field"><span>Approver · Gate 2 {needsApprover ? <span className="itp-hint">(required: choose someone with the right expertise)</span> : <span className="itp-hint">(change if needed)</span>}</span>
              <PersonSelect id="review-approver" value={draft.approverEmail || revision.approver_email || ""} people={people} exclude={[myEmail]} onChange={(value) => setDraft({ ...draft, approverEmail: value, error: "" })} /></label>
          ) : null}
          {choice === "comments" ? (
            <div className="itp-field"><span>Comments for the supplier</span>
              <div className="itp-draftlist">
                {draft.comments.map((item, index) => (
                  <div key={index} className="itp-draftrow">
                    <input style={inputStyle} aria-label={`Reference for comment ${index + 1}`} placeholder="Section / ref" value={item.ref} onChange={(event) => setDraft({ ...draft, comments: draft.comments.map((c, i) => i === index ? { ...c, ref: event.target.value } : c) })} />
                    <textarea style={{ ...inputStyle, minHeight: 64, resize: "vertical" }} aria-label={`Comment ${index + 1}`} placeholder="What needs to change?" value={item.text} onChange={(event) => setDraft({ ...draft, comments: draft.comments.map((c, i) => i === index ? { ...c, text: event.target.value } : c), error: "" })} />
                    {draft.comments.length > 1 ? <button type="button" style={ghostButton} aria-label={`Remove comment ${index + 1}`} onClick={() => setDraft({ ...draft, comments: draft.comments.filter((_, i) => i !== index) })}>Remove</button> : <span />}
                  </div>
                ))}
                <div><button type="button" style={ghostButton} onClick={() => setDraft({ ...draft, comments: [...draft.comments, { ref: "", text: "" }] })}>+ Add another comment</button></div>
              </div>
            </div>
          ) : null}
          {choice ? (
            <label className="itp-field"><span>{choice === "reject" ? "Reason for rejection" : "Review note"} <span className="itp-hint">{choice === "reject" ? "(required, goes to the uploader for the supplier)" : choice === "comments" ? "(optional covering note)" : "(optional, visible to the approver)"}</span></span>
              <textarea style={{ ...inputStyle, minHeight: 84, resize: "vertical" }} value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value, error: "" })} placeholder="What did you check, and what should the next person know?" /></label>
          ) : null}
          {draft.error ? <div className="itp-err" role="alert">{draft.error}</div> : null}
          <div className="itp-submit">
            <span className="itp-sends">{choice === "recommend" ? `${people.find((p) => p.email === (draft.approverEmail || revision.approver_email))?.name || "The approver"} is emailed straight away.` : choice ? `${revision.uploader_name || "The uploader"} is emailed to pass this to the supplier.` : "Nobody is emailed until you decide."}</span>
            <button type="button" style={primaryButton} disabled={busy || !choice} onClick={() => void submitReview()}>{busy ? "Saving..." : choice === "recommend" ? "Submit and email approver" : choice === "comments" ? "Issue comments" : choice === "reject" ? "Reject ITP" : "Choose a decision"}</button>
          </div>
        </section>
      );
    }

    if (state === "Awaiting Approval" && isApprover) {
      const choice = draft.choice;
      return (
        <section className="itp-card" aria-label="Your approval">
          <div className="itp-card-h"><h3>Your approval</h3><span className={`itp-pill ${late ? "bad" : "wait"}`}>{late ? `${late} ${late === 1 ? "day" : "days"} overdue` : `Due ${formatShortDate(revision.gate_due_date)}`}</span></div>
          <div className="itp-quote"><small>{revision.reviewed_by_name || "The reviewer"} recommended approval · {formatShortDate(revision.reviewed_at)}</small>{reviewNote ? reviewNote.body : "No review note was left."}</div>
          <div><button type="button" style={ghostButton} onClick={() => void openFile(revision)}>Open document ↗</button></div>
          {openCommentsNotice()}
          <fieldset className="itp-opts"><legend className="itp-kicker" style={{ marginBottom: 8 }}>Decision</legend>
            <Option name="decision" value="approve" title={`Approve Rev ${revision.revision}`} text="Becomes the controlled revision. The reviewer and uploader are emailed." checked={choice === "approve"} onChange={(value) => setDraft({ ...draft, choice: value, error: "" })} />
            <Option name="decision" value="return" title="Return to reviewer" text="Reopens Gate 1 with your reason. Nothing goes to the supplier." checked={choice === "return"} onChange={(value) => setDraft({ ...draft, choice: value, error: "" })} />
            <Option name="decision" value="reject" title="Reject to supplier" text="Goes back to the uploader with your reason, for the supplier." checked={choice === "reject"} onChange={(value) => setDraft({ ...draft, choice: value, error: "" })} />
          </fieldset>
          {choice ? (
            <label className="itp-field"><span>Approval note <span className="itp-hint">{choice === "approve" ? "(optional)" : "(required)"}</span></span>
              <textarea style={{ ...inputStyle, minHeight: 84, resize: "vertical" }} value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value, error: "" })} placeholder="Anything the reviewer or supplier should know?" /></label>
          ) : null}
          {draft.error ? <div className="itp-err" role="alert">{draft.error}</div> : null}
          <div className="itp-submit">
            <span className="itp-sends">{choice === "approve" ? `${revision.reviewer_name || "The reviewer"} and ${revision.uploader_name || "the uploader"} are emailed.` : choice === "return" ? `${revision.reviewer_name || "The reviewer"} is emailed.` : choice ? `${revision.uploader_name || "The uploader"} is emailed.` : "Nobody is emailed until you decide."}</span>
            <button type="button" style={primaryButton} disabled={busy || !choice} onClick={() => void submitApproval()}>{busy ? "Saving..." : choice === "approve" ? `Approve Rev ${revision.revision}` : choice === "return" ? "Return to reviewer" : choice === "reject" ? "Reject to supplier" : "Choose a decision"}</button>
          </div>
        </section>
      );
    }

    const who = holder?.name || "the assignee";
    const gateName = state === "Awaiting Review" ? "Gate 1 · Review" : "Gate 2 · Approval";
    return (
      <section className="itp-card">
        <div className="itp-card-h"><h3>Waiting on {who}</h3><span className={`itp-pill ${late ? "bad" : "wait"}`}>{late ? `${late} ${late === 1 ? "day" : "days"} overdue` : `Due ${formatShortDate(revision.gate_due_date)}`}</span></div>
        <p className="itp-muted" style={flat}>{gateName} has been with {who} {waiting === 0 ? "since today" : `for ${waiting} ${waiting === 1 ? "day" : "days"}`}. You can see everything here, but only {who} can record this decision.</p>
        <div className="itp-submit"><span className="itp-sends">Reminders also go out automatically: the day before it is due, then daily once overdue.</span>
          <span style={buttonRow}>
            {(isAdmin || isUploader || isReviewer) ? <button type="button" style={ghostButton} disabled={busy || revision.last_reminder_on === todayLondon()} onClick={() => void remind()}>Send a reminder now</button> : null}
            {canAssign ? <button type="button" style={ghostButton} onClick={() => document.getElementById("itp-people")?.scrollIntoView({ block: "center", behavior: "smooth" })}>Reassign</button> : null}
          </span></div>
      </section>
    );
  }

  function peopleCard() {
    if (!revision || !state) return null;
    const locked = state === "Approved" || !canAssign;
    const dirty = (assign.reviewer || "") !== (revision.reviewer_email || "") || (assign.approver || "") !== (revision.approver_email || "")
      || JSON.stringify(assign.notify.map((p) => p.email).sort()) !== JSON.stringify(notifyListOf(revision).map((p) => p.email).sort());
    const same = Boolean(assign.reviewer) && sameEmail(assign.reviewer, assign.approver);
    return (
      <section className="itp-card" id="itp-people">
        <div className="itp-card-h"><h3>People on this ITP</h3><span className="itp-muted" style={{ fontSize: 12 }}>{state === "Approved" ? "Locked once approved" : canAssign ? "Choose people to suit the work" : "Only the uploader, reviewer or an administrator can change these"}</span></div>
        <div className="itp-assign">
          <label className="itp-field"><span>Reviewer · Gate 1</span><PersonSelect id="people-reviewer" value={assign.reviewer} people={people} disabled={locked || !(isAdmin || isUploader)} onChange={(value) => setAssign({ ...assign, reviewer: value })} /></label>
          <label className="itp-field"><span>Approver · Gate 2</span><PersonSelect id="people-approver" value={assign.approver} people={people} disabled={locked} placeholder="Not chosen yet" onChange={(value) => setAssign({ ...assign, approver: value })} /></label>
        </div>
        <label className="itp-field"><span>Also copied on every email</span><NotifyPicker id="people-notify" value={assign.notify} people={people} exclude={[assign.reviewer, assign.approver].filter(Boolean)} disabled={locked} onChange={(notify) => setAssign({ ...assign, notify })} /></label>
        {same && isAdmin ? <label className="itp-field"><span>Reason for the same person on both gates</span><input style={inputStyle} value={assign.reason} onChange={(event) => setAssign({ ...assign, reason: event.target.value })} placeholder="Recorded in the activity trail" /></label> : null}
        {assignError || (same && !isAdmin) ? <div className="itp-err" role="alert">{assignError || "The reviewer and approver must be different people."}</div> : <p className="itp-sub" style={flat}>The approver cannot also be the reviewer. Changing the person at an open gate emails them and restarts that gate&apos;s three-day clock.</p>}
        {!locked ? <div className="itp-submit"><span className="itp-sends">{dirty ? "Unsaved changes" : "Everything is saved"}</span><button type="button" style={primaryButton} disabled={busy || !dirty} onClick={() => void savePeople(false)}>Save people</button></div> : null}
      </section>
    );
  }

  function commentsCard() {
    if (!revision) return null;
    const open = comments.filter((comment) => comment.status === "Open");
    const byRevision = new Map<string, ItpComment[]>();
    for (const comment of comments) byRevision.set(comment.revision_id, [...(byRevision.get(comment.revision_id) || []), comment]);
    const revisionLabel = (id: string) => `Rev ${(itp?.project_itp_revisions || []).find((item) => item.id === id)?.revision || "?"}`;
    const order = [...byRevision.keys()].sort((a, b) => (a === revision.id ? -1 : b === revision.id ? 1 : 0));
    return (
      <section className="itp-card">
        <div className="itp-card-h"><h3>Comments</h3><span className={`itp-pill ${open.length ? "wait" : "idle"}`}>{open.length ? `${open.length} open` : "None open"}</span></div>
        {order.length === 0 ? <p className="itp-muted" style={flat}>No comments yet. Comments issued to the supplier, review notes and anything you add here are kept with the ITP.</p> : null}
        {order.map((id) => (
          <div key={id} style={{ display: "grid", gap: 8 }}>
            <div className="itp-kicker">{revisionLabel(id)}{id === revision.id ? " · current" : ""}</div>
            {(byRevision.get(id) || []).map((comment) => (
              <div key={comment.id} className={`itp-comment${comment.status === "Open" ? " is-open" : ""}`}>
                <div className="head"><span>{comment.kind}{comment.ref ? ` · ${comment.ref}` : ""} · {comment.author_name || "Unknown"} · {formatDateTime(comment.created_at)}</span>
                  {comment.status ? <span style={buttonRow}><span className={`itp-pill ${comment.status === "Open" ? "wait" : "ok"}`}>{comment.status}{comment.status === "Closed" && comment.closed_by_name ? ` by ${comment.closed_by_name}` : ""}</span>{canManageComments ? <button type="button" style={ghostButton} disabled={busy} onClick={() => void toggleComment(comment)}>{comment.status === "Open" ? "Close" : "Reopen"}</button> : null}</span> : null}
                </div>
                <div className="body">{comment.body}</div>
              </div>
            ))}
          </div>
        ))}
        {canComment ? <div className="itp-field" style={{ borderTop: "1px solid var(--enshore-border)", paddingTop: 12 }}>
          <span>Add a comment</span>
          <input style={inputStyle} aria-label="Reference for the comment" placeholder="Section / ref (optional)" value={newComment.ref} onChange={(event) => setNewComment({ ...newComment, ref: event.target.value })} />
          <textarea style={{ ...inputStyle, minHeight: 64, resize: "vertical" }} aria-label="Comment" placeholder="Anything worth keeping with this ITP" value={newComment.body} onChange={(event) => setNewComment({ ...newComment, body: event.target.value })} />
          <div><button type="button" style={ghostButton} disabled={busy || !newComment.body.trim()} onClick={() => void addComment()}>Add comment</button></div>
        </div> : null}
      </section>
    );
  }

  function activityCard() {
    return (
      <section className="itp-card">
        <div className="itp-card-h"><h3>Activity</h3><span className="itp-muted" style={{ fontSize: 12 }}>Newest first</span></div>
        {visibleActivity.length === 0 ? <p className="itp-muted" style={flat}>Nothing recorded yet.</p> : (
          <ol className="itp-trail">
            {visibleActivity.map((event) => {
              const cls = event.kind === "email" ? "mail" : event.kind === "attention" ? "warn" : "";
              return (
                <li key={event.id} className={`itp-ev ${cls}`}>
                  <i aria-hidden="true" />
                  <div>
                    <div className="d">{formatDateTime(event.created_at)}</div>
                    <div className="tx">{event.kind === "email" ? `Email · ${event.summary}` : <>{event.actor_name && event.actor_name !== "IMS" ? <b>{event.actor_name} · </b> : null}{event.summary}</>}</div>
                    {event.detail ? <div className="nt">{event.detail}</div> : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        {hasEarlierActivity ? <label className="itp-sub" style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={showEarlier} onChange={(event) => setShowEarlier(event.target.checked)} /> Include earlier revisions</label> : null}
      </section>
    );
  }

  // ---------- render ----------

  if (loading) {
    return <main className="itp-scope" style={page}><QualityPageHero label={`${config.label} · ITP record`} title="ITP record" description="Loading the ITP..." /></main>;
  }
  if (problem && !itp) {
    return (
      <main className="itp-scope" style={page}>
        <QualityPageHero label={`${config.label} · ITP record`} title="ITP record" description="Stage-gate review and approval." />
        <ImsTopMetaRow status={<><strong>Status:</strong> {problem}</>} />
        <ProjectWorkspaceNav projectKey={projectKey} active="itp" />
        <div className="itp-card"><p style={flat}>{problem}</p><div><Link style={{ ...primaryButton, textDecoration: "none" }} href={`/projects/${projectKey}/itp`}>Back to the ITP register</Link></div></div>
      </main>
    );
  }
  if (itp && !revision) {
    return (
      <main className="itp-scope" style={page}>
        <QualityPageHero label={`${config.label} · ITP record`} title={itp.document_number} description={itp.title} />
        <ProjectWorkspaceNav projectKey={projectKey} active="itp" />
        <div className="itp-card"><p style={flat}>This ITP has no stored revision yet, so there is nothing to review. Upload a revision on the register.</p><div><Link style={{ ...primaryButton, textDecoration: "none" }} href={`/projects/${projectKey}/itp?upload=1`}>Upload a revision</Link></div></div>
      </main>
    );
  }
  if (!itp || !revision || !state) return null;

  const stateClass = state === "Approved" ? "ok" : state === "With Supplier" ? "bad" : "wait";
  const history = [...(itp.project_itp_revisions || [])].sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at));

  return (
    <main className="itp-scope" style={page}>
      <QualityPageHero label={`${config.label} · ITP record`} title={itp.document_number} description={itp.title} />
      <ImsTopMetaRow status={<><strong>Status:</strong> {STATE_LABEL[state]}{revision.gate_due_date && (state === "Awaiting Review" || state === "Awaiting Approval") ? ` · due ${formatShortDate(revision.gate_due_date)}` : ""}</>} />
      <ProjectWorkspaceNav projectKey={projectKey} active="itp" />
      {problem ? <div className="itp-callout warn">{problem}</div> : null}
      {toastView()}

      <section className="itp-card" aria-label="ITP summary">
        <div className="itp-card-h" style={{ alignItems: "flex-start" }}>
          <div style={{ display: "grid", gap: 3, minWidth: 0 }}>
            <span className={`itp-pill ${stateClass}`} style={{ width: "fit-content" }}>{STATE_LABEL[state]}{revision.legacy_approved ? " · before the stage gate" : ""}</span>
            <h2 style={{ margin: 0, fontSize: 20, color: "var(--enshore-ink)" }}>{itp.title}</h2>
            <span className="itp-muted" style={{ fontSize: 12 }}>{[itp.supplier, itp.scope, itp.package_name].filter(Boolean).join(" · ")} · Rev {revision.revision}{revision.revision_date ? ` (${formatShortDate(revision.revision_date)})` : ""} · uploaded {formatShortDate(revision.uploaded_at)}{revision.uploader_name ? ` by ${revision.uploader_name}` : ""}</span>
          </div>
          <span style={buttonRow}>
            <button type="button" style={ghostButton} onClick={() => void openFile(revision)}>Open document ↗</button>
            <button type="button" style={ghostButton} aria-expanded={showHistory} onClick={() => setShowHistory(!showHistory)}>Revision history ({history.length})</button>
            {canEdit ? <button type="button" style={ghostButton} onClick={openEdit}>Edit details</button> : null}
            {isAdmin ? <button type="button" style={dangerButton} disabled={busy} onClick={() => void deleteItp()}>Delete</button> : null}
          </span>
        </div>
        {stepper()}
        {showHistory ? (
          <div style={{ display: "grid", gap: 8 }}>
            {history.map((item) => (
              <div key={item.id} style={historyRow}>
                <strong>Rev {item.revision}</strong>
                <span style={{ minWidth: 0 }}><span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.file_name}</span><span className="itp-sub">{item.revision_date ? formatShortDate(item.revision_date) : "No revision date"} · uploaded {formatShortDate(item.uploaded_at)} · {item.is_current ? STATE_LABEL[item.workflow_state] : "Superseded"}</span></span>
                <button type="button" style={ghostButton} onClick={() => void openFile(item)}>Open file</button>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <div className="itp-two">
        <div className="itp-stack">
          {actionPanel()}
          {peopleCard()}
          {commentsCard()}
        </div>
        <div className="itp-stack">
          {activityCard()}
          <section className="itp-card">
            <div className="itp-card-h"><h3>Linked records</h3></div>
            {state === "Approved" && counts ? (
              <>
                <div className="itp-kv">
                  <div><span>NOI points (W/H)</span><b className="itp-num">{counts.noi}</b></div>
                  <div><span>Review points (R/A)</span><b className="itp-num">{counts.review}</b></div>
                </div>
                <div style={buttonRow}>
                  <Link style={{ ...ghostButton, textDecoration: "none" }} href={`/projects/${projectKey}/noi?search=${encodeURIComponent(itp.document_number)}`}>NOI Tracker</Link>
                  <Link style={{ ...ghostButton, textDecoration: "none" }} href={`/projects/${projectKey}/review-points`}>Review Points</Link>
                  <Link style={{ ...ghostButton, textDecoration: "none" }} href={`/projects/${projectKey}/itp-sign-off`}>ITP Sign-Off</Link>
                </div>
              </>
            ) : <p className="itp-muted" style={flat}>NOI points, review points and phase sign-offs are available once this revision is approved.</p>}
          </section>
        </div>
      </div>

      {editOpen ? (
        <div style={overlay} onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setEditOpen(false); }}>
          <section style={dialog} role="dialog" aria-modal="true" aria-label="Edit ITP details">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}><div><div className="itp-kicker">Record management</div><h2 style={{ margin: "3px 0 0", color: "var(--enshore-muted)", fontSize: 20 }}>Edit ITP details</h2></div><button type="button" style={closeButton} aria-label="Close" onClick={() => setEditOpen(false)}>×</button></div>
            <div className="itp-callout info">Review, approval and people are changed on this page through the stage gate, not here. The stored source document and revision archive are not replaced.</div>
            <div style={formGrid}>
              {([["documentNumber", "Document number *"], ["revision", "Revision *"], ["title", "ITP title *"], ["supplier", "Supplier"], ["packageName", "Package"], ["discipline", "Discipline"]] as const).map(([key, label]) => (
                <label key={key} className="itp-field" style={{ gridColumn: key === "title" ? "1 / -1" : undefined }}><span>{label}</span><input style={inputStyle} value={editDraft[key]} onChange={(event) => setEditDraft({ ...editDraft, [key]: event.target.value })} /></label>
              ))}
              <label className="itp-field"><span>Scope</span><select style={inputStyle} value={editDraft.scope} onChange={(event) => setEditDraft({ ...editDraft, scope: event.target.value })}><option value="">Select</option>{config.scopeOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
              <label className="itp-field"><span>Revision date</span><input style={inputStyle} type="date" value={editDraft.revisionDate} onChange={(event) => setEditDraft({ ...editDraft, revisionDate: event.target.value })} /></label>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, borderTop: "1px solid var(--enshore-border)", paddingTop: 17 }}><button type="button" style={ghostButton} disabled={busy} onClick={() => setEditOpen(false)}>Cancel</button><button type="button" style={primaryButton} disabled={busy} onClick={() => void saveEdit()}>{busy ? "Saving..." : "Save changes"}</button></div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

const page: CSSProperties = { display: "grid", gap: 18 };
const flat: CSSProperties = { margin: 0 };
const buttonRow: CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" };
const inputStyle: CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid var(--enshore-border)", borderRadius: 10, padding: "10px 12px", background: "var(--enshore-surface)", color: "var(--enshore-ink)", font: "inherit", fontWeight: 400 };
const primaryButton: CSSProperties = { border: 0, borderRadius: 10, padding: "10px 16px", background: "#005670", color: "#FFFFFF", fontWeight: 800, fontSize: 13, cursor: "pointer", font: "inherit" };
const ghostButton: CSSProperties = { border: "1px solid var(--enshore-border)", borderRadius: 10, padding: "8px 13px", background: "var(--enshore-surface)", color: "var(--enshore-muted)", fontWeight: 800, fontSize: 12, cursor: "pointer", font: "inherit" };
const dangerButton: CSSProperties = { ...ghostButton, color: "#F93822", borderColor: "#F93822" };
const toastClose: CSSProperties = { border: "1px solid currentColor", background: "transparent", color: "inherit", borderRadius: 8, padding: "5px 10px", fontWeight: 800, fontSize: 12, cursor: "pointer", font: "inherit" };
const historyRow: CSSProperties = { display: "grid", gridTemplateColumns: "70px minmax(0, 1fr) auto", gap: 12, alignItems: "center", border: "1px solid var(--enshore-border)", borderRadius: 10, padding: "10px 12px", fontSize: 12, color: "var(--enshore-ink)" };
const overlay: CSSProperties = { position: "fixed", inset: 0, background: "rgba(15,23,42,.58)", zIndex: 1000, padding: 22, overflowY: "auto", display: "grid", placeItems: "start center" };
const dialog: CSSProperties = { width: "min(820px,100%)", background: "var(--enshore-surface)", borderRadius: 20, padding: 24, boxShadow: "0 28px 70px rgba(0,0,0,.25)", display: "grid", gap: 18 };
const closeButton: CSSProperties = { border: 0, background: "var(--enshore-page)", borderRadius: 999, width: 34, height: 34, fontSize: 23, cursor: "pointer", color: "var(--enshore-ink)" };
const formGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 13 };

import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export type BulkKind = "review" | "approval";

export type BulkDocument = {
  id: string;
  document_number: string;
  title: string | null;
  current_revision: string | null;
  workflow_status: string | null;
  workflow_reviewer_name: string | null;
  workflow_reviewer_email: string | null;
  workflow_approver_name: string | null;
  workflow_approver_email: string | null;
  issue_date: string | null;
};

export type BulkBatch = {
  id: string;
  token: string;
  kind: BulkKind;
  intended_name: string | null;
  intended_email: string;
  document_ids: string[];
  expires_at: string;
  completed_at: string | null;
};

export const BULK_DOCUMENT_COLUMNS =
  "id, document_number, title, current_revision, workflow_status, workflow_reviewer_name, workflow_reviewer_email, workflow_approver_name, workflow_approver_email, issue_date";

// The status a document must be in for this kind of link to act on it.
export const BULK_EXPECTED_STATUS: Record<BulkKind, string> = {
  review: "Pending Review",
  approval: "Pending Approval",
};

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function bulkReviewUrl(origin: string, token: string) {
  return `${origin.replace(/\/+$/, "")}/documents/bulk-review?token=${encodeURIComponent(token)}`;
}

// A document is waiting for this batch when it is in the right status and the batch's person is the one named on it.
export function isAwaiting(document: BulkDocument, batch: Pick<BulkBatch, "kind" | "intended_email">) {
  if (document.workflow_status !== BULK_EXPECTED_STATUS[batch.kind]) return false;
  const named = batch.kind === "review" ? document.workflow_reviewer_email : document.workflow_approver_email;
  return (named || "").trim().toLowerCase() === batch.intended_email.trim().toLowerCase();
}

export async function createBatch(
  service: SupabaseClient,
  args: { kind: BulkKind; intendedName: string; intendedEmail: string; documentIds: string[]; createdBy: string; parentBatchId?: string }
): Promise<{ batch: BulkBatch | null; error: string }> {
  const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
  const { data, error } = await service
    .from("document_workflow_batches")
    .insert({
      token,
      kind: args.kind,
      intended_name: args.intendedName || null,
      intended_email: args.intendedEmail.trim(),
      document_ids: args.documentIds,
      created_by: args.createdBy,
      parent_batch_id: args.parentBatchId || null,
    })
    .select("*")
    .single();

  if (error || !data) {
    const missing = /relation|does not exist|schema cache/i.test(error?.message || "");
    return {
      batch: null,
      error: missing ? "The bulk review table is missing. Run scripts/sql/document_control_bulk_review.sql in Supabase." : error?.message || "Could not create the bulk review link.",
    };
  }

  return { batch: data as BulkBatch, error: "" };
}

type DigestDoc = Pick<BulkDocument, "document_number" | "title" | "current_revision">;

function digestRows(documents: DigestDoc[]) {
  const shown = documents.slice(0, 40);
  const rows = shown
    .map(
      (doc) => `<tr>
        <td style="padding:7px 10px;border-bottom:1px solid #D0D0CE;font-weight:700;white-space:nowrap">${escapeHtml(doc.document_number)}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #D0D0CE">${escapeHtml(doc.title || "-")}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #D0D0CE;text-align:center">${escapeHtml(doc.current_revision || "-")}</td>
      </tr>`
    )
    .join("");
  const more = documents.length > shown.length ? `<p style="font-size:13px;color:#53565A">and ${documents.length - shown.length} more, all listed on the review page.</p>` : "";
  return `<table style="border-collapse:collapse;width:100%;font-size:14px">
      <tr style="background:#ECECE7;text-align:left">
        <th style="padding:7px 10px">Document</th><th style="padding:7px 10px">Title</th><th style="padding:7px 10px;text-align:center">Rev</th>
      </tr>${rows}</table>${more}`;
}

function shell(heading: string, inner: string) {
  return `<div style="font-family:'Segoe UI',Arial,sans-serif;color:#000000;line-height:1.5;max-width:640px">
    <div style="background:#005670;color:#ffffff;padding:18px 24px;border-radius:12px 12px 0 0">
      <div style="font-size:22px;font-weight:700;letter-spacing:0.06em">ENSHORE</div>
      <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;color:#63B1BC;text-transform:uppercase">Document Control</div>
    </div>
    <div style="border:1px solid #D0D0CE;border-top:none;padding:24px;border-radius:0 0 12px 12px">
      <h2 style="margin:0 0 12px;color:#005670;font-size:20px">${escapeHtml(heading)}</h2>
      ${inner}
      <p style="font-size:12px;color:#53565A;margin-top:24px">This is an automated notification from the Document Control System.</p>
    </div>
  </div>`;
}

export function buildDigestEmail(args: { kind: BulkKind; name: string; documents: DigestDoc[]; url: string; reason?: string }) {
  const count = args.documents.length;
  const noun = count === 1 ? "document" : "documents";
  const isReview = args.kind === "review";
  const subject = isReview ? `You have ${count} ${noun} to review` : `You have ${count} ${noun} to approve`;
  const intro = isReview
    ? `${count} ${noun} ${count === 1 ? "is" : "are"} waiting for your review${args.reason ? ` (${args.reason})` : ""}. The button below opens a page listing them. Confirm there to accept the review of every document in one step. Each document is recorded individually in its activity log, and the approver is sent the same request automatically.`
    : `${count} ${noun} ${count === 1 ? "has" : "have"} been reviewed and ${count === 1 ? "is" : "are"} waiting for your approval. The button below opens a page listing them. Confirm there to approve every document in one step. Each document is recorded individually in its activity log.`;
  const button = isReview ? `Review and fast-track ${count} ${noun}` : `Approve ${count} ${noun}`;

  const html = shell(
    subject,
    `<p>Hi ${escapeHtml(args.name || "there")},</p>
     <p>${escapeHtml(intro)}</p>
     <p style="margin:24px 0"><a href="${escapeHtml(args.url)}" style="display:inline-block;background:#005670;color:#ffffff;text-decoration:none;border-radius:10px;padding:13px 22px;font-weight:700">${escapeHtml(button)}</a></p>
     ${digestRows(args.documents)}
     <p style="font-size:13px;color:#53565A;margin-top:18px">You need to be signed in to the IMS as ${escapeHtml(args.name || "the named person")} to confirm. The link is valid for 14 days. If the button does not work, copy this address into your browser:</p>
     <p style="font-size:12px;color:#53565A;word-break:break-all">${escapeHtml(args.url)}</p>`
  );

  return { subject, html };
}

export function buildCompletionEmail(args: { actorName: string; documents: DigestDoc[]; nextReviewNote: string }) {
  const count = args.documents.length;
  const noun = count === 1 ? "document" : "documents";
  const subject = `${count} ${noun} approved and now live`;
  const html = shell(
    subject,
    `<p>${escapeHtml(args.actorName || "The approver")} approved ${count} ${noun}. ${count === 1 ? "It is" : "They are"} live in Document Control. ${escapeHtml(args.nextReviewNote)}</p>
     ${digestRows(args.documents)}`
  );
  return { subject, html };
}

export async function sendHtmlEmail(args: { to: string[]; subject: string; html: string }): Promise<string> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.DOCUMENT_NOTIFICATIONS_FROM_EMAIL;
  const to = Array.from(new Set(args.to.map((email) => email.trim()).filter((email) => email.includes("@"))));
  if (!to.length || !apiKey || !from) return "Email skipped: email is not configured or there was no recipient.";

  try {
    const result = await new Resend(apiKey).emails.send({ from, to, subject: args.subject, html: args.html });
    return result.error ? result.error.message || "The email could not be sent." : "";
  } catch (error) {
    return error instanceof Error ? error.message : "The email could not be sent.";
  }
}

// Sets the reviewed or approved details on the current revision's snapshot, creating the row if the revision has none.
export async function updateCurrentRevisionSnapshots(
  service: SupabaseClient,
  documents: Array<Pick<BulkDocument, "id" | "current_revision">>,
  values: Record<string, string | null>
): Promise<string> {
  if (!documents.length) return "";

  const { data: rows, error } = await service
    .from("document_revisions")
    .select("id, document_id, revision")
    .in("document_id", documents.map((doc) => doc.id))
    .eq("is_current", true);
  if (error) return error.message;

  const existingIds: string[] = [];
  const missing: typeof documents = [];
  for (const doc of documents) {
    const revision = (doc.current_revision || "A").trim() || "A";
    const row = (rows || []).find((item) => item.document_id === doc.id && item.revision === revision);
    if (row) existingIds.push(row.id);
    else missing.push(doc);
  }

  if (existingIds.length) {
    const { error: updateError } = await service.from("document_revisions").update(values).in("id", existingIds);
    if (updateError) return updateError.message;
  }

  if (missing.length) {
    const { error: insertError } = await service.from("document_revisions").insert(
      missing.map((doc) => {
        const revision = (doc.current_revision || "A").trim() || "A";
        return {
          document_id: doc.id,
          revision,
          revision_notes: `Revision ${revision} workflow snapshot.`,
          file_name: null,
          file_path: null,
          file_size: null,
          uploaded_at: null,
          issue_date: todayIsoDate(),
          ...values,
          is_current: true,
        };
      })
    );
    if (insertError) return insertError.message;
  }

  return "";
}

export async function writeBulkActivity(
  service: SupabaseClient,
  documents: Array<Pick<BulkDocument, "id" | "document_number" | "title">>,
  entry: { action: string; fromStatus: string; toStatus: string; actorName: string; actorEmail: string; note: (doc: Pick<BulkDocument, "id" | "document_number" | "title">) => string }
): Promise<string> {
  if (!documents.length) return "";
  const { error } = await service.from("document_workflow_activity").insert(
    documents.map((doc) => ({
      document_id: doc.id,
      document_number: doc.document_number,
      document_title: doc.title || "",
      action: entry.action,
      from_status: entry.fromStatus,
      to_status: entry.toStatus,
      actor_name: entry.actorName,
      actor_email: entry.actorEmail,
      note: entry.note(doc),
    }))
  );
  return error?.message || "";
}

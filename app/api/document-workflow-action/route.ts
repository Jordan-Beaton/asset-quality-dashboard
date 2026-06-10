import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

type WorkflowTokenRow = {
  id: string;
  token: string;
  document_id: string;
  document_number: string | null;
  document_title: string | null;
  action: string;
  intended_name: string | null;
  intended_email: string | null;
  from_status: string | null;
  to_status: string | null;
  expires_at: string;
  used_at: string | null;
};

type DocumentRow = {
  id: string;
  document_number: string;
  title: string | null;
  current_revision: string | null;
  review_cycle_years: number | null;
  workflow_status: string | null;
  workflow_reviewer_name: string | null;
  workflow_reviewer_email: string | null;
  workflow_approver_name: string | null;
  workflow_approver_email: string | null;
  originator_name: string | null;
  originator_email: string | null;
  reviewed_by: string | null;
  reviewed_at?: string | null;
  reviewer_email?: string | null;
  approved_by: string | null;
  approved_at?: string | null;
  approver_email?: string | null;
  issue_date?: string | null;
  notification_emails?: string[] | null;
};

type ControlledFileLink = {
  fileName: string;
  url: string;
};

const STORAGE_BUCKET = "document-files";

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Document workflow actions are not configured.");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function uniqueEmails(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => String(value || "").trim())
        .filter((value) => value.includes("@"))
    )
  );
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildSubject(eventType: string, documentNumber: string) {
  const subjectMap: Record<string, string> = {
    reviewed: `${documentNumber} reviewed and ready for approval`,
    approved: `${documentNumber} approved and now live`,
    rejected: `${documentNumber} rejected`,
  };

  return subjectMap[eventType] || `${documentNumber} update`;
}

function buildHtml({
  eventType,
  document,
  message,
  actionLinks,
  controlledFile,
}: {
  eventType: string;
  document: DocumentRow;
  message: string;
  actionLinks?: Array<{ label: string; url: string; tone: "primary" | "danger" }>;
  controlledFile?: ControlledFileLink | null;
}) {
  const title = buildSubject(eventType, document.document_number);

  return `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #0f172a; line-height: 1.5;">
      <h2 style="margin-bottom: 12px;">${escapeHtml(title)}</h2>
      <p><strong>Document:</strong> ${escapeHtml(document.document_number || "-")}</p>
      <p><strong>Title:</strong> ${escapeHtml(document.title || "-")}</p>
      <p><strong>Revision:</strong> ${escapeHtml(document.current_revision || "-")}</p>
      <p>${escapeHtml(message)}</p>
      ${
        controlledFile
          ? `<p><strong>Controlled File:</strong> ${escapeHtml(controlledFile.fileName)}</p>
             <p>
               <a href="${escapeHtml(controlledFile.url)}" style="display: inline-block; background: #e2e8f0; color: #0f172a; text-decoration: none; border-radius: 10px; padding: 10px 14px; font-weight: 700;">Open Controlled File</a>
             </p>
             <p style="font-size: 12px; color: #64748b;">File links are secure signed URLs and may expire.</p>`
          : ""
      }
      ${
        actionLinks?.length
          ? `<div style="margin: 24px 0; display: flex; gap: 12px; flex-wrap: wrap;">
              ${actionLinks
                .map((link) => {
                  const background = link.tone === "danger" ? "#b91c1c" : "#3A9B98";
                  return `<a href="${escapeHtml(link.url)}" style="display: inline-block; background: ${background}; color: #ffffff; text-decoration: none; border-radius: 10px; padding: 12px 18px; font-weight: 700;">${escapeHtml(link.label)}</a>`;
                })
                .join("")}
            </div>
            <p style="font-size: 12px; color: #64748b;">These links open a secure confirmation page before the workflow is updated.</p>`
          : ""
      }
      <br/>
      <p>This is an automated notification from the Document Control System.</p>
    </div>
  `;
}

async function createControlledFileLink(documentId: string): Promise<ControlledFileLink | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey || !documentId) return null;

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase
    .from("documents")
    .select("file_name, file_path")
    .eq("id", documentId)
    .maybeSingle();

  if (error || !data?.file_path) return null;

  const { data: signed, error: signedError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(data.file_path, 60 * 60 * 24 * 7);

  if (signedError || !signed?.signedUrl) return null;

  return {
    fileName: data.file_name || "Controlled document",
    url: signed.signedUrl,
  };
}

async function sendWorkflowEmail({
  to,
  eventType,
  document,
  message,
  actionLinks,
}: {
  to: string[];
  eventType: string;
  document: DocumentRow;
  message: string;
  actionLinks?: Array<{ label: string; url: string; tone: "primary" | "danger" }>;
}) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.DOCUMENT_NOTIFICATIONS_FROM_EMAIL;

  if (!to.length || !resendApiKey || !fromEmail) {
    return "Notification skipped: email is not configured or no recipients were available.";
  }

  const resend = new Resend(resendApiKey);
  const controlledFile = await createControlledFileLink(document.id);
  const result = await resend.emails.send({
    from: fromEmail,
    to,
    subject: buildSubject(eventType, document.document_number),
    html: buildHtml({ eventType, document, message, actionLinks, controlledFile }),
  });

  if (result.error) {
    return result.error.message || "Notification send failed.";
  }

  return "";
}

async function createTokenLink({
  supabase,
  request,
  document,
  action,
  intendedName,
  intendedEmail,
  fromStatus,
  toStatus,
}: {
  supabase: any;
  request: Request;
  document: DocumentRow;
  action: string;
  intendedName: string;
  intendedEmail: string;
  fromStatus: string;
  toStatus: string;
}) {
  const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
  const { error } = await supabase.from("document_workflow_tokens").insert({
    token,
    document_id: document.id,
    document_number: document.document_number,
    document_title: document.title || "",
    action,
    intended_name: intendedName || null,
    intended_email: intendedEmail,
    from_status: fromStatus,
    to_status: toStatus,
  });

  if (error) throw error;

  return `${new URL(request.url).origin}/documents/workflow-action?token=${encodeURIComponent(token)}`;
}

async function getTokenAndDocument(token: string) {
  const supabase = getServiceClient();
  const { data: tokenRow, error: tokenError } = await supabase
    .from("document_workflow_tokens")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (tokenError) throw tokenError;
  if (!tokenRow) return { supabase, tokenRow: null, document: null };

  const typedToken = tokenRow as WorkflowTokenRow;
  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("*")
    .eq("id", typedToken.document_id)
    .maybeSingle();

  if (documentError) throw documentError;

  return { supabase, tokenRow: typedToken, document: document as DocumentRow | null };
}

function tokenProblem(tokenRow: WorkflowTokenRow | null, document: DocumentRow | null) {
  if (!tokenRow || !document) return "This workflow link is not valid.";
  if (tokenRow.used_at) return "This workflow link has already been used.";
  if (new Date(tokenRow.expires_at).getTime() < Date.now()) return "This workflow link has expired.";
  return "";
}

async function writeActivity(
  supabase: any,
  document: DocumentRow,
  tokenRow: WorkflowTokenRow,
  toStatus: string,
  note: string
) {
  await supabase.from("document_workflow_activity").insert({
    document_id: document.id,
    document_number: document.document_number,
    document_title: document.title || "",
    action: tokenRow.action,
    from_status: document.workflow_status || tokenRow.from_status,
    to_status: toStatus,
    actor_name: tokenRow.intended_name || "",
    actor_email: tokenRow.intended_email || "",
    note,
  });
}

async function upsertCurrentRevisionSnapshot(
  supabase: any,
  document: DocumentRow,
  values: Record<string, string | null>
) {
  const revision = (document.current_revision || "A").trim() || "A";
  const snapshot = {
    issue_date: values.issue_date || document.issue_date || formatDate(new Date()),
    ...values,
  };

  const { data: existingRows, error: existingError } = await supabase
    .from("document_revisions")
    .select("id")
    .eq("document_id", document.id)
    .eq("revision", revision)
    .eq("is_current", true)
    .limit(1);

  if (existingError) throw existingError;

  const existingId = existingRows?.[0]?.id;
  if (existingId) {
    const { error } = await supabase.from("document_revisions").update(snapshot).eq("id", existingId);
    if (error) throw error;
    return;
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

  if (error) throw error;
}

export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get("token") || "";
    const { tokenRow, document } = await getTokenAndDocument(token);
    const problem = tokenProblem(tokenRow, document);

    if (problem || !tokenRow || !document) {
      return NextResponse.json({ error: problem || "Invalid workflow link." }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      action: tokenRow.action,
      intendedName: tokenRow.intended_name,
      intendedEmail: tokenRow.intended_email,
      document: {
        documentNumber: document.document_number,
        title: document.title,
        revision: document.current_revision,
        workflowStatus: document.workflow_status,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load workflow action." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string; rejectionReason?: string };
    const token = clean(body.token);
    const rejectionReason = clean(body.rejectionReason);
    const { supabase, tokenRow, document } = await getTokenAndDocument(token);
    const problem = tokenProblem(tokenRow, document);

    if (problem || !tokenRow || !document) {
      return NextResponse.json({ error: problem || "Invalid workflow link." }, { status: 400 });
    }

    const now = new Date();
    const today = formatDate(now);
    let statusMessage = "";
    let notificationWarning = "";

    if (tokenRow.action === "accept_review") {
      const hasApprover = Boolean(document.workflow_approver_email);
      const nextStatus = hasApprover ? "Pending Approval" : "Reviewed";

      const { error } = await supabase
        .from("documents")
        .update({
          status: hasApprover ? "Under Review" : "Under Review",
          review_approval_status: hasApprover ? "Reviewed" : "Reviewed",
          workflow_status: nextStatus,
          reviewed_by: tokenRow.intended_name || document.workflow_reviewer_name || null,
          reviewed_at: today,
          rejected_by: null,
          rejected_at: null,
          rejection_reason: null,
        })
        .eq("id", document.id);

      if (error) throw error;

      await upsertCurrentRevisionSnapshot(supabase, document, {
        reviewed_by: tokenRow.intended_name || document.workflow_reviewer_name || null,
        reviewed_at: today,
      });
      await writeActivity(supabase, document, tokenRow, nextStatus, "Review accepted from email workflow.");

      if (hasApprover && document.workflow_approver_email) {
        const approveUrl = await createTokenLink({
          supabase,
          request,
          document,
          action: "approve_document",
          intendedName: document.workflow_approver_name || "",
          intendedEmail: document.workflow_approver_email,
          fromStatus: "Pending Approval",
          toStatus: "Approved",
        });
        const rejectUrl = await createTokenLink({
          supabase,
          request,
          document,
          action: "reject_approval",
          intendedName: document.workflow_approver_name || "",
          intendedEmail: document.workflow_approver_email,
          fromStatus: "Pending Approval",
          toStatus: "Rejected",
        });

        notificationWarning = await sendWorkflowEmail({
          to: [document.workflow_approver_email],
          eventType: "reviewed",
          document,
          message: `${tokenRow.intended_name || "Reviewer"} accepted the review. Please approve or reject the document.`,
          actionLinks: [
            { label: "Approve Document", url: approveUrl, tone: "primary" },
            { label: "Reject", url: rejectUrl, tone: "danger" },
          ],
        });

        await supabase.from("document_workflow_activity").insert({
          document_id: document.id,
          document_number: document.document_number,
          document_title: document.title || "",
          action: "sent_to_approver",
          from_status: "Reviewed",
          to_status: "Pending Approval",
          actor_name: tokenRow.intended_name || "",
          actor_email: tokenRow.intended_email || "",
          note: `Approver: ${document.workflow_approver_name || document.workflow_approver_email}`,
        });
      }

      statusMessage = hasApprover
        ? "Review accepted. The approver has been notified."
        : "Review accepted. The document is ready to be sent to an approver.";
    } else if (tokenRow.action === "approve_document") {
      const { error } = await supabase
        .from("documents")
        .update({
          status: "Live",
          review_approval_status: "Approved",
          workflow_status: "Approved",
          approved_by: tokenRow.intended_name || document.workflow_approver_name || null,
          approved_at: today,
          rejected_by: null,
          rejected_at: null,
          rejection_reason: null,
        })
        .eq("id", document.id);

      if (error) throw error;

      await upsertCurrentRevisionSnapshot(supabase, document, {
        approved_by: tokenRow.intended_name || document.workflow_approver_name || null,
        approved_at: today,
      });
      await writeActivity(supabase, document, tokenRow, "Approved", "Document approved from email workflow.");
      notificationWarning = await sendWorkflowEmail({
        to: uniqueEmails([
          document.originator_email,
          document.workflow_reviewer_email,
          document.workflow_approver_email,
          ...(document.notification_emails || []),
        ]),
        eventType: "approved",
        document,
        message: `${tokenRow.intended_name || "Approver"} approved the document.`,
      });
      statusMessage = "Document approved and moved live.";
    } else if (tokenRow.action === "reject_review" || tokenRow.action === "reject_approval") {
      if (!rejectionReason) {
        return NextResponse.json({ error: "A rejection reason is required." }, { status: 400 });
      }

      const { error } = await supabase
        .from("documents")
        .update({
          status: "Draft",
          review_approval_status: "Rejected",
          workflow_status: "Rejected",
          approved_by: null,
          approved_at: null,
          rejected_by: tokenRow.intended_name || null,
          rejected_at: today,
          rejection_reason: rejectionReason,
        })
        .eq("id", document.id);

      if (error) throw error;

      await writeActivity(supabase, document, tokenRow, "Rejected", rejectionReason);
      notificationWarning = await sendWorkflowEmail({
        to: uniqueEmails([
          document.originator_email,
          document.workflow_reviewer_email,
          document.workflow_approver_email,
          ...(document.notification_emails || []),
        ]),
        eventType: "rejected",
        document,
        message: `${tokenRow.intended_name || "Reviewer/approver"} rejected the document. Reason: ${rejectionReason}`,
      });
      statusMessage = "Document rejected and the originator has been notified.";
    } else {
      return NextResponse.json({ error: "Unsupported workflow action." }, { status: 400 });
    }

    const { error: tokenUpdateError } = await supabase
      .from("document_workflow_tokens")
      .update({ used_at: now.toISOString() })
      .eq("id", tokenRow.id)
      .is("used_at", null);

    if (tokenUpdateError) throw tokenUpdateError;

    return NextResponse.json({
      ok: true,
      message: notificationWarning ? `${statusMessage} Warning: ${notificationWarning}` : statusMessage,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to complete workflow action." },
      { status: 500 }
    );
  }
}

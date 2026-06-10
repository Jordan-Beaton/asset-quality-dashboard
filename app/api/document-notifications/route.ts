import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { createClient as createServerSupabaseClient } from "../../../src/lib/supabase/server";

type NotificationRequest = {
  eventType?: string;
  documentId?: string;
  documentNumber?: string;
  documentTitle?: string;
  currentRevision?: string;
  originatorName?: string;
  originatorEmail?: string;
  reviewedBy?: string;
  approvedBy?: string;
  rejectedBy?: string;
  reviewApprovalStatus?: string;
  recipientEmails?: string[];
  message?: string;
};

type WorkflowButton = {
  label: string;
  url: string;
  tone: "primary" | "danger";
};

type ControlledFileLink = {
  fileName: string;
  url: string;
};

const STORAGE_BUCKET = "document-files";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMessage(value: string) {
  return escapeHtml(value).replace(/\n/g, "<br/>");
}

function buildSubject(eventType: string, documentNumber: string) {
  const subjectMap: Record<string, string> = {
    submitted_for_review: `${documentNumber} submitted for review`,
    reviewed: `${documentNumber} reviewed and ready for approval`,
    approved: `${documentNumber} approved and now live`,
    rejected: `${documentNumber} rejected`,
    superseded: `${documentNumber} superseded`,
  };

  return subjectMap[eventType] || `${documentNumber} update`;
}

function buildActionButtons(buttons: WorkflowButton[]) {
  if (!buttons.length) return "";

  return `
    <div style="margin: 24px 0; display: flex; gap: 12px; flex-wrap: wrap;">
      ${buttons
        .map((button) => {
          const background = button.tone === "danger" ? "#b91c1c" : "#3A9B98";
          return `
            <a href="${escapeHtml(button.url)}"
               style="display: inline-block; background: ${background}; color: #ffffff; text-decoration: none; border-radius: 10px; padding: 12px 18px; font-weight: 700;">
              ${escapeHtml(button.label)}
            </a>
          `;
        })
        .join("")}
    </div>
    <p style="font-size: 12px; color: #64748b;">
      These links open a secure confirmation page before the workflow is updated. Links are single-use and expire automatically.
    </p>
  `;
}

function buildHtml(
  payload: Required<Pick<NotificationRequest, "eventType" | "documentNumber" | "documentTitle">> &
    Omit<NotificationRequest, "eventType" | "documentNumber" | "documentTitle">,
  buttons: WorkflowButton[] = [],
  controlledFile?: ControlledFileLink | null
) {
  const subject = buildSubject(payload.eventType, payload.documentNumber);

  return `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #0f172a; line-height: 1.5;">
      <h2 style="margin-bottom: 12px;">${escapeHtml(subject)}</h2>
      <p><strong>Document:</strong> ${escapeHtml(payload.documentNumber || "-")}</p>
      <p><strong>Title:</strong> ${escapeHtml(payload.documentTitle || "-")}</p>
      <p><strong>Revision:</strong> ${escapeHtml(payload.currentRevision || "-")}</p>
      <p><strong>Workflow Status:</strong> ${escapeHtml(payload.reviewApprovalStatus || "-")}</p>
      <p><strong>Originator:</strong> ${escapeHtml(payload.originatorName || "-")} (${escapeHtml(
        payload.originatorEmail || "-"
      )})</p>
      ${
        payload.reviewedBy
          ? `<p><strong>Reviewed By:</strong> ${escapeHtml(payload.reviewedBy)}</p>`
          : ""
      }
      ${
        payload.approvedBy
          ? `<p><strong>Approved By:</strong> ${escapeHtml(payload.approvedBy)}</p>`
          : ""
      }
      ${
        payload.rejectedBy
          ? `<p><strong>Rejected By:</strong> ${escapeHtml(payload.rejectedBy)}</p>`
          : ""
      }
      ${
        payload.message
          ? `<p><strong>Message:</strong><br/>${formatMessage(String(payload.message))}</p>`
          : ""
      }
      ${
        controlledFile
          ? `<p><strong>Controlled File:</strong> ${escapeHtml(controlledFile.fileName)}</p>
             <p>
               <a href="${escapeHtml(controlledFile.url)}"
                  style="display: inline-block; background: #e2e8f0; color: #0f172a; text-decoration: none; border-radius: 10px; padding: 10px 14px; font-weight: 700;">
                 Open Controlled File
               </a>
             </p>
             <p style="font-size: 12px; color: #64748b;">File links are secure signed URLs and may expire.</p>`
          : ""
      }
      ${buildActionButtons(buttons)}
      <br/>
      <p>This is an automated notification from the Document Control System.</p>
    </div>
  `;
}

async function requireAuthenticatedUser() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

async function logEmailAttempt(
  body: NotificationRequest,
  recipientEmails: string[],
  success: boolean,
  providerMessageId: string | null,
  errorMessage: string | null
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return;

  try {
    const supabase = createServiceClient(supabaseUrl, serviceRoleKey);

    const logPayload = {
      event_type: body.eventType || "",
      document_number: body.documentNumber || "",
      document_title: body.documentTitle || "",
      current_revision: body.currentRevision || null,
      recipient_emails: recipientEmails,
      review_approval_status: body.reviewApprovalStatus || null,
      originator_name: body.originatorName || null,
      originator_email: body.originatorEmail || null,
      reviewed_by: body.reviewedBy || null,
      approved_by: body.approvedBy || null,
      rejected_by: body.rejectedBy || null,
      provider: "resend",
      provider_message_id: providerMessageId,
      success,
      error_message: errorMessage,
      created_at: new Date().toISOString(),
    };

    await supabase.from("document_email_logs").insert(logPayload);
  } catch (error) {
    console.warn("DOCUMENT EMAIL LOGGING SKIPPED", error);
  }
}

async function createWorkflowButtons(
  body: NotificationRequest,
  recipientEmails: string[],
  request: Request
): Promise<WorkflowButton[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const documentId = body.documentId || "";

  if (!supabaseUrl || !serviceRoleKey || !documentId || !recipientEmails.length) {
    return [];
  }

  const recipientEmail = recipientEmails[0];
  const origin = new URL(request.url).origin;
  const supabase = createServiceClient(supabaseUrl, serviceRoleKey);

  const tokenDefinitions =
    body.eventType === "submitted_for_review"
      ? [
          {
            label: "Accept Review",
            action: "accept_review",
            tone: "primary" as const,
            intendedName: body.reviewedBy || "",
            fromStatus: "Pending Review",
            toStatus: "Reviewed",
          },
          {
            label: "Reject",
            action: "reject_review",
            tone: "danger" as const,
            intendedName: body.reviewedBy || "",
            fromStatus: "Pending Review",
            toStatus: "Rejected",
          },
        ]
      : body.eventType === "reviewed"
      ? [
          {
            label: "Approve Document",
            action: "approve_document",
            tone: "primary" as const,
            intendedName: body.approvedBy || "",
            fromStatus: "Pending Approval",
            toStatus: "Approved",
          },
          {
            label: "Reject",
            action: "reject_approval",
            tone: "danger" as const,
            intendedName: body.approvedBy || "",
            fromStatus: "Pending Approval",
            toStatus: "Rejected",
          },
        ]
      : [];

  const buttons: WorkflowButton[] = [];

  for (const definition of tokenDefinitions) {
    const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
    const { error } = await supabase.from("document_workflow_tokens").insert({
      token,
      document_id: documentId,
      document_number: body.documentNumber || "",
      document_title: body.documentTitle || "",
      action: definition.action,
      intended_name: definition.intendedName || null,
      intended_email: recipientEmail,
      from_status: definition.fromStatus,
      to_status: definition.toStatus,
    });

    if (!error) {
      buttons.push({
        label: definition.label,
        tone: definition.tone,
        url: `${origin}/documents/workflow-action?token=${encodeURIComponent(token)}`,
      });
    }
  }

  return buttons;
}

async function createControlledFileLink(documentId: string): Promise<ControlledFileLink | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey || !documentId) return null;

  const supabase = createServiceClient(supabaseUrl, serviceRoleKey);
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

export async function POST(request: Request) {
  let body: NotificationRequest | null = null;

  try {
    const user = await requireAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.DOCUMENT_NOTIFICATIONS_FROM_EMAIL;

    if (!resendApiKey) {
      return NextResponse.json(
        { error: "Missing RESEND_API_KEY environment variable." },
        { status: 500 }
      );
    }

    if (!fromEmail) {
      return NextResponse.json(
        { error: "Missing DOCUMENT_NOTIFICATIONS_FROM_EMAIL environment variable." },
        { status: 500 }
      );
    }

    const resend = new Resend(resendApiKey);
    body = (await request.json()) as NotificationRequest;

    const recipientEmails = Array.isArray(body.recipientEmails)
      ? Array.from(
          new Set(
            body.recipientEmails
              .map((email) => String(email || "").trim())
              .filter(Boolean)
          )
        )
      : [];

    if (process.env.NODE_ENV !== "production") {
      console.log("EMAIL TRIGGERED", {
        eventType: body.eventType,
        documentNumber: body.documentNumber,
        recipientCount: recipientEmails.length,
        requestedBy: user.email,
      });
    }

    if (!recipientEmails.length) {
      return NextResponse.json({ error: "No recipients provided." }, { status: 400 });
    }

    const documentNumber = body.documentNumber || "Document";
    const documentTitle = body.documentTitle || "-";
    const eventType = body.eventType || "update";
    const workflowButtons = await createWorkflowButtons(body, recipientEmails, request);
    const controlledFile = await createControlledFileLink(body.documentId || "");

    const sendResult = await resend.emails.send({
      from: fromEmail,
      to: recipientEmails,
      subject: buildSubject(eventType, documentNumber),
      html: buildHtml({
        ...body,
        eventType,
        documentNumber,
        documentTitle,
      }, workflowButtons, controlledFile),
    });

    if (process.env.NODE_ENV !== "production") {
      console.log("EMAIL RESULT", sendResult);
    }

    await logEmailAttempt(body, recipientEmails, true, sendResult.data?.id || null, null);

    return NextResponse.json({
      ok: true,
      id: sendResult.data?.id || null,
    });
  } catch (error) {
    console.error("EMAIL ERROR", error);

    await logEmailAttempt(
      body || {},
      Array.isArray(body?.recipientEmails)
        ? body!.recipientEmails
            .map((email) => String(email || "").trim())
            .filter(Boolean)
        : [],
      false,
      null,
      error instanceof Error ? error.message : "Unknown notification error."
    );

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown notification error.",
      },
      { status: 500 }
    );
  }
}

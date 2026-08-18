import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// kind controls which email template is rendered:
//   "assigned"       → sent to the owner when a record is assigned to them
//   "status-changed" → sent to the raiser when an owner updates the status
//   "closed-out"     → sent to the raiser when close-out comments are added
export async function POST(req: NextRequest) {
  const body = await req.json() as {
    recipientEmail: string;
    recipientName?: string;
    kind?: "assigned" | "status-changed" | "closed-out";
    itemType: string;
    itemRef: string;
    itemTitle?: string;
    status?: string;
    dueDate?: string;
    closeOutComments?: string;
    itemUrl?: string;
  };

  const {
    recipientEmail,
    recipientName,
    kind = "assigned",
    itemType,
    itemRef,
    itemTitle,
    status,
    dueDate,
    closeOutComments,
    itemUrl,
  } = body;

  if (!recipientEmail || !itemType || !itemRef) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const from = process.env.DOCUMENT_NOTIFICATIONS_FROM_EMAIL ?? "documents@enshoresubsea.com";

  // --- Subject line ---
  let subject = "";
  if (kind === "assigned") {
    subject = `IMS: You've been assigned ${itemRef}${itemTitle ? ` – ${itemTitle}` : ""}`;
  } else if (kind === "status-changed") {
    subject = `IMS: ${itemRef} status updated${status ? ` to "${status}"` : ""}`;
  } else {
    subject = `IMS: ${itemRef} has been closed out`;
  }

  // --- Headline and intro copy ---
  let headline = "";
  let intro = "";
  if (kind === "assigned") {
    headline = `You have been assigned a ${itemType}`;
    intro = `You have been assigned as the owner of the following ${itemType} in the Enshore IMS.`;
  } else if (kind === "status-changed") {
    headline = `${itemType} status updated`;
    intro = `The status of the following ${itemType} has been updated in the Enshore IMS.`;
  } else {
    headline = `${itemType} closed out`;
    intro = `Close-out comments have been added to the following ${itemType} in the Enshore IMS.`;
  }

  // --- Detail rows ---
  const statusRow = status
    ? `<tr><td style="padding:4px 0;color:#53565A;font-size:14px;white-space:nowrap;"><strong>Status:</strong></td><td style="padding:4px 8px;color:#53565A;font-size:14px;">${status}</td></tr>`
    : "";
  const dueDateRow = dueDate
    ? `<tr><td style="padding:4px 0;color:#53565A;font-size:14px;white-space:nowrap;"><strong>Due Date:</strong></td><td style="padding:4px 8px;color:#53565A;font-size:14px;">${dueDate}</td></tr>`
    : "";
  const commentsRow = closeOutComments
    ? `<tr><td colspan="2" style="padding:8px 0 0;color:#53565A;font-size:14px;"><strong>Close-out comments:</strong><br/><span style="display:block;margin-top:4px;">${closeOutComments.replace(/\n/g, "<br/>")}</span></td></tr>`
    : "";

  const ctaButton = itemUrl
    ? `<p style="margin:20px 0 0;">
        <a href="${itemUrl}" style="display:inline-block;background:#005670;color:#ffffff;font-size:14px;font-weight:bold;padding:12px 24px;border-radius:4px;text-decoration:none;">
          View ${itemType} in IMS →
        </a>
      </p>`
    : "";

  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:6px;overflow:hidden;">
        <tr>
          <td style="background:#005670;padding:20px 28px;">
            <span style="color:#ffffff;font-size:20px;font-weight:bold;">Enshore IMS</span>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;">
            <h2 style="color:#005670;margin:0 0 16px;">${headline}</h2>
            <p style="color:#53565A;font-size:14px;margin:0 0 16px;">Hi ${recipientName ?? "there"},</p>
            <p style="color:#53565A;font-size:14px;margin:0 0 16px;">${intro}</p>
            <table cellpadding="0" cellspacing="0" style="border-left:4px solid #005670;background:#ECECE7;padding:16px;width:100%;box-sizing:border-box;">
              <tr><td style="padding:4px 0;color:#53565A;font-size:14px;white-space:nowrap;"><strong>Reference:</strong></td><td style="padding:4px 8px;color:#53565A;font-size:14px;">${itemRef}</td></tr>
              ${itemTitle ? `<tr><td style="padding:4px 0;color:#53565A;font-size:14px;white-space:nowrap;"><strong>Title:</strong></td><td style="padding:4px 8px;color:#53565A;font-size:14px;">${itemTitle}</td></tr>` : ""}
              ${statusRow}
              ${dueDateRow}
              ${commentsRow}
            </table>
            ${ctaButton}
          </td>
        </tr>
        <tr>
          <td style="background:#ECECE7;padding:12px 28px;text-align:center;font-size:12px;color:#53565A;">
            Enshore Integrated Management System — automated notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    await resend.emails.send({ from, to: [recipientEmail], subject, html });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

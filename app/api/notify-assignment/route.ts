import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Status badge colours — mirrors IMS semantic palette
function statusBadge(status: string): string {
  const s = status.toLowerCase();
  let bg = "#53565A"; // default muted
  if (s === "open") bg = "#FFAD00";
  else if (s === "in progress") bg = "#63B1BC";
  else if (s === "closed") bg = "#005670";
  return `<span style="display:inline-block;background:${bg};color:#ffffff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;letter-spacing:0.04em;text-transform:uppercase;">${status}</span>`;
}

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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  // --- Subject line ---
  let subject = "";
  if (kind === "assigned") {
    subject = `IMS: You've been assigned ${itemRef}${itemTitle ? ` – ${itemTitle}` : ""}`;
  } else if (kind === "status-changed") {
    subject = `IMS: ${itemRef} status updated${status ? ` to "${status}"` : ""}`;
  } else {
    subject = `IMS: ${itemRef} has been closed out`;
  }

  // --- Headline and intro ---
  let headline = "";
  let intro = "";
  if (kind === "assigned") {
    headline = `You have been assigned a ${itemType}`;
    intro = `You have been assigned as the owner of the following ${itemType} in the Enshore IMS. Please log in to review the details and take action.`;
  } else if (kind === "status-changed") {
    headline = `${itemType} status has been updated`;
    intro = `The status of the following ${itemType} has changed in the Enshore IMS.`;
  } else {
    headline = `${itemType} has been closed out`;
    intro = `Close-out comments have been recorded against the following ${itemType} in the Enshore IMS.`;
  }

  // --- Detail rows ---
  const refRow = `
    <tr>
      <td style="padding:6px 0;border-bottom:1px solid #D0D0CE;color:#53565A;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap;width:120px;">Reference</td>
      <td style="padding:6px 8px;border-bottom:1px solid #D0D0CE;color:#000000;font-size:13px;font-weight:700;">${itemRef}</td>
    </tr>`;

  const titleRow = itemTitle
    ? `<tr>
        <td style="padding:6px 0;border-bottom:1px solid #D0D0CE;color:#53565A;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap;">Title</td>
        <td style="padding:6px 8px;border-bottom:1px solid #D0D0CE;color:#000000;font-size:13px;">${itemTitle}</td>
      </tr>`
    : "";

  const statusRow = status
    ? `<tr>
        <td style="padding:6px 0;border-bottom:1px solid #D0D0CE;color:#53565A;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap;">Status</td>
        <td style="padding:6px 8px;border-bottom:1px solid #D0D0CE;">${statusBadge(status)}</td>
      </tr>`
    : "";

  const dueDateRow = dueDate
    ? `<tr>
        <td style="padding:6px 0;border-bottom:1px solid #D0D0CE;color:#53565A;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap;">Due Date</td>
        <td style="padding:6px 8px;border-bottom:1px solid #D0D0CE;color:#000000;font-size:13px;">${dueDate}</td>
      </tr>`
    : "";

  const commentsBlock = closeOutComments
    ? `<tr>
        <td colspan="2" style="padding:10px 0 0;">
          <p style="margin:0 0 4px;color:#53565A;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Close-out Comments</p>
          <p style="margin:0;color:#000000;font-size:13px;line-height:1.55;white-space:pre-wrap;">${closeOutComments.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
        </td>
      </tr>`
    : "";

  const ctaButton = itemUrl
    ? `<table cellpadding="0" cellspacing="0" style="margin-top:24px;">
        <tr>
          <td style="border-radius:10px;background:#005670;">
            <a href="${itemUrl}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
              View ${itemType} in IMS &rarr;
            </a>
          </td>
        </tr>
      </table>`
    : "";

  // Logo URL — use the reverse (white) logo on the dark header
  const logoUrl = siteUrl ? `${siteUrl}/enshore-primary-logo-reverse.svg` : "";
  const logoImg = logoUrl
    ? `<img src="${logoUrl}" alt="Enshore" height="32" style="display:block;height:32px;width:auto;" />`
    : `<span style="color:#ffffff;font-size:16px;font-weight:700;font-family:'Segoe UI',Arial,Helvetica,sans-serif;letter-spacing:0.02em;">Enshore</span>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#ECECE7;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#ECECE7;padding:32px 16px;">
  <tr><td align="center">

    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;">

      <!-- Header -->
      <tr>
        <td style="background:#005670;border-radius:16px 16px 0 0;padding:20px 28px;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td>${logoImg}</td>
              <td align="right" style="color:#63B1BC;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
                Integrated Management System
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Accent bar -->
      <tr><td style="background:#63B1BC;height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>

      <!-- Body -->
      <tr>
        <td style="background:#ffffff;padding:28px 28px 24px;border-left:1px solid #D0D0CE;border-right:1px solid #D0D0CE;">

          <h1 style="margin:0 0 8px;color:#005670;font-size:18px;font-weight:700;line-height:1.2;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">${headline}</h1>
          <p style="margin:0 0 20px;color:#53565A;font-size:13px;line-height:1.55;">${intro}</p>

          <!-- Detail card -->
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
            style="border:1px solid #D0D0CE;border-left:4px solid #005670;border-radius:10px;background:#ffffff;margin-bottom:4px;">
            <tr><td style="padding:14px 16px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                ${refRow}
                ${titleRow}
                ${statusRow}
                ${dueDateRow}
                ${commentsBlock}
              </table>
            </td></tr>
          </table>

          ${ctaButton}

        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#ECECE7;border:1px solid #D0D0CE;border-top:none;border-radius:0 0 16px 16px;padding:14px 28px;text-align:center;">
          <p style="margin:0;color:#53565A;font-size:11px;line-height:1.5;">
            This is an automated notification from the <strong>Enshore Integrated Management System</strong>.<br />
            Please do not reply to this email. For queries, contact your IMS administrator.
          </p>
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

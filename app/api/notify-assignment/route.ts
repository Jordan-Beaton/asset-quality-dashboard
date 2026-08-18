import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function statusBadge(status: string): string {
  const s = status.toLowerCase();
  let bg = "#53565A";
  if (s === "open") bg = "#FFAD00";
  else if (s === "in progress") bg = "#63B1BC";
  else if (s === "closed") bg = "#005670";
  return `<span style="display:inline-block;background:${bg};color:#ffffff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;letter-spacing:0.06em;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">${status}</span>`;
}

function detailRow(label: string, value: string, last = false): string {
  const border = last ? "" : "border-bottom:1px solid #D0D0CE;";
  return `<tr>
    <td style="${border}padding:10px 0;vertical-align:top;width:130px;">
      <span style="font-size:10px;font-weight:700;color:#53565A;text-transform:uppercase;letter-spacing:0.08em;font-family:Arial,Helvetica,sans-serif;">${label}</span>
    </td>
    <td style="${border}padding:10px 0 10px 16px;vertical-align:top;">
      ${value}
    </td>
  </tr>`;
}

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

  // Subject
  let subject = "";
  if (kind === "assigned") {
    subject = `IMS: You've been assigned ${itemRef}${itemTitle ? ` – ${itemTitle}` : ""}`;
  } else if (kind === "status-changed") {
    subject = `IMS: ${itemRef} status updated${status ? ` to "${status}"` : ""}`;
  } else {
    subject = `IMS: ${itemRef} has been closed out`;
  }

  // Headline + intro
  let headline = "";
  let intro = "";
  if (kind === "assigned") {
    headline = `You have been assigned a ${itemType}`;
    intro = `You have been assigned as the owner of the following ${itemType}. Please log in to the Enshore IMS to review the details and take action.`;
  } else if (kind === "status-changed") {
    headline = `${itemType} status has been updated`;
    intro = `The status of the following ${itemType} has been updated. Log in to the Enshore IMS to view the current position.`;
  } else {
    headline = `${itemType} has been closed out`;
    intro = `Close-out comments have been recorded against the following ${itemType} in the Enshore IMS.`;
  }

  // Build detail rows
  const rows: string[] = [];
  rows.push(detailRow("Reference", `<strong style="font-size:13px;color:#000000;font-family:Arial,Helvetica,sans-serif;">${itemRef}</strong>`));
  if (itemTitle) {
    rows.push(detailRow("Title", `<span style="font-size:13px;color:#000000;font-family:Arial,Helvetica,sans-serif;">${itemTitle}</span>`));
  }
  if (status) {
    rows.push(detailRow("Status", statusBadge(status)));
  }
  if (dueDate) {
    rows.push(detailRow("Due Date", `<span style="font-size:13px;color:#000000;font-family:Arial,Helvetica,sans-serif;">${dueDate}</span>`));
  }
  if (closeOutComments) {
    const escaped = closeOutComments.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>");
    rows.push(detailRow("Close-out Comments", `<span style="font-size:13px;color:#000000;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">${escaped}</span>`, true));
  } else if (rows.length > 0) {
    // Mark the last row as last (no bottom border)
    rows[rows.length - 1] = rows[rows.length - 1].replace("border-bottom:1px solid #D0D0CE;padding:10px 0;vertical-align:top;width:130px;", "padding:10px 0;vertical-align:top;width:130px;").replace("border-bottom:1px solid #D0D0CE;padding:10px 0 10px 16px;vertical-align:top;", "padding:10px 0 10px 16px;vertical-align:top;");
  }

  const ctaRow = itemUrl
    ? `<!-- CTA button — VML rounded rect for Outlook, CSS for all others -->
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:28px;">
        <tr>
          <td align="center">
            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
              href="${itemUrl}"
              style="height:48px;v-text-anchor:middle;width:240px;"
              arcsize="18%"
              strokecolor="#005670"
              fillcolor="#005670">
              <w:anchorlock/>
              <center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;">View ${itemType} in IMS &#8594;</center>
            </v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-->
            <table cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="background:#005670;border-radius:10px;">
                  <a href="${itemUrl}"
                    style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;font-family:Arial,Helvetica,sans-serif;letter-spacing:0.01em;">
                    View ${itemType} in IMS &nbsp;&rarr;
                  </a>
                </td>
              </tr>
            </table>
            <!--<![endif]-->
          </td>
        </tr>
      </table>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#ECECE7;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<!--[if mso]><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 0;background:#ECECE7;"><![endif]-->
<table width="100%" cellpadding="0" cellspacing="0" role="presentation"
  style="margin:0;padding:32px 16px;background-color:#ECECE7;border-collapse:collapse;">
  <tr>
    <td align="center" style="padding:0;">

      <!-- Outer card -->
      <table cellpadding="0" cellspacing="0" role="presentation"
        style="width:100%;max-width:580px;border-collapse:collapse;">

        <!-- ── HEADER ── -->
        <tr>
          <td style="background-color:#005670;border-radius:14px 14px 0 0;padding:24px 32px 20px;">
            <p style="margin:0 0 5px;font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:0.06em;text-transform:uppercase;line-height:1;">ENSHORE</p>
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;color:#63B1BC;letter-spacing:0.16em;text-transform:uppercase;line-height:1;">Integrated Management System</p>
          </td>
        </tr>

        <!-- Accent stripe -->
        <tr><td style="background-color:#63B1BC;height:3px;font-size:0;line-height:0;mso-line-height-rule:exactly;">&zwnj;</td></tr>

        <!-- ── BODY ── -->
        <tr>
          <td style="background-color:#ffffff;padding:32px 32px 28px;border-left:1px solid #D0D0CE;border-right:1px solid #D0D0CE;">

            <!-- Headline -->
            <h1 style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;color:#005670;line-height:1.25;">${headline}</h1>

            <!-- Greeting -->
            <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#000000;line-height:1.5;">Hi ${recipientName ?? "there"},</p>

            <!-- Intro -->
            <p style="margin:0 0 24px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#53565A;line-height:1.6;">${intro}</p>

            <!-- Detail card -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
              style="border:1px solid #D0D0CE;border-left:4px solid #005670;border-radius:10px;border-collapse:separate;background-color:#ffffff;">
              <tr>
                <td style="padding:4px 20px 0;">
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;">
                    ${rows.join("\n")}
                  </table>
                </td>
              </tr>
            </table>

            ${ctaRow}

            <!-- Sign-up note -->
            <p style="margin:20px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#53565A;line-height:1.6;text-align:center;">
              Don't have an account yet?&nbsp;<a href="${siteUrl}" style="color:#005670;font-weight:700;text-decoration:none;">Request access to the Enshore IMS</a>&nbsp;to view and manage this item.
            </p>

          </td>
        </tr>

        <!-- ── FOOTER ── -->
        <tr>
          <td style="background-color:#ECECE7;border:1px solid #D0D0CE;border-top:none;border-radius:0 0 14px 14px;padding:16px 32px;text-align:center;">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#53565A;line-height:1.6;">
              This is an automated notification from the <strong>Enshore Integrated Management System</strong>.<br />
              Please do not reply to this email. For queries, contact your IMS administrator.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->

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

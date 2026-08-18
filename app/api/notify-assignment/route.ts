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
    ? `<!-- CTA button -->
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:28px;">
        <tr>
          <td align="center">
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
          <td style="background-color:#005670;border-radius:14px 14px 0 0;padding:20px 28px;">
            <!--[if mso]>
            <table width="100%" cellpadding="0" cellspacing="0"><tr><td valign="middle">
            <p style="margin:0 0 5px;font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:4px;text-transform:uppercase;line-height:1;">ENSHORE</p>
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;color:#63B1BC;letter-spacing:6px;text-transform:uppercase;line-height:1;">INTEGRATED MANAGEMENT SYSTEM</p>
            </td></tr></table>
            <![endif]-->
            <!--[if !mso]><!-->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="vertical-align:middle;">
                  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;color:#63B1BC;letter-spacing:0.16em;text-transform:uppercase;line-height:1;">Integrated Management System</p>
                </td>
                <td style="vertical-align:middle;text-align:right;width:180px;">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 510.24 255.12" style="display:block;width:160px;height:80px;margin-left:auto;" aria-label="Enshore logo">
                    <style>.st0{fill:#63B1BC;}.st1{fill:#FFFFFF;}</style>
                    <g>
                      <path class="st0" d="M297,110.08c0.88-0.42,1.67-0.08,2.12,0.38c0.44,0.46,0.76,1.25,0.32,2.1c-6.75,13.06-18.84,22.38-33.18,25.56c-12.87,2.85-26.08,0.53-37.2-6.56c-8.1-5.16-14.37-12.39-18.29-20.9c0.65,0.6,1.4,1.16,2.14,1.72c0.01,0,0.01,0.01,0.02,0.01c4.59,3.46,10.98,6.02,18.84,7.5c0.02,0,0.03,0.01,0.05,0.01c0.93,0.17,5.17,0.77,5.17,0.77c10.46,1.25,22.64,0.65,35.28-2.15C281.13,116.55,289.45,113.71,297,110.08 M218.82,110.6c0.05,0.02,0.1,0.05,0.14,0.07c1.14,0.57,2.37,1.1,3.65,1.6c0.18,0.07,0.35,0.14,0.54,0.21c1.15,0.43,2.38,0.81,3.64,1.17c0.33,0.1,0.65,0.2,0.99,0.29c1.23,0.33,2.53,0.61,3.85,0.87c0.29,0.06,0.57,0.13,0.86,0.18c-3.4-6.27-6.04-13.44-7.69-20.9c-1.88-8.48-2.42-16.92-1.66-24.71l0,0c0.12-1.26,0.29-2.49,0.48-3.7c0.07-0.45,0.15-0.89,0.23-1.33c0.17-0.97,0.37-1.93,0.58-2.86c0.08-0.33,0.15-0.66,0.23-0.99c0.31-1.25,0.66-2.46,1.04-3.62c0.02-0.07,0.04-0.15,0.06-0.23c0.06-0.17,0.13-0.32,0.19-0.48c0.34-0.99,0.71-1.95,1.11-2.87c0.14-0.32,0.27-0.65,0.41-0.96c0.45-0.99,0.92-1.94,1.43-2.85c0.24-0.42,0.49-0.82,0.73-1.23c0.31-0.5,0.63-1,0.95-1.47c0.3-0.44,0.61-0.89,0.93-1.31c0.52-0.68,1.05-1.32,1.6-1.93c0.12-0.13,0.22-0.28,0.33-0.4c-19.74,9.9-31.06,32.3-26.07,54.81c0.22,1,0.56,1.97,1.01,2.91c0.06,0.12,0.14,0.24,0.2,0.36c0.42,0.84,0.91,1.66,1.49,2.45c0.04,0.05,0.08,0.1,0.12,0.15C212.22,106.43,215.13,108.72,218.82,110.6 M298.01,53.96c-6.11-6.67-13.85-11.42-22.26-13.95c4.53,2.52,7.98,6.08,9.68,10.33c0.02,0.05,0.05,0.1,0.07,0.16c0.22,0.56,0.39,1.13,0.54,1.71c0.03,0.1,0.07,0.2,0.1,0.3c0,0.01,0,0.02,0,0.03c0.02,0.09,0.06,0.17,0.07,0.26c2.67,12.04-13.15,22.22-24.69,29.65c-5.21,3.35-11.69,7.53-11.41,9.23c0.06,0.38,0.88,1.01,2.98,1.55c11.91,3.04,40.45-5.01,48.68-18.6C305.73,68.09,304.46,61.14,298.01,53.96 M231.75,55.63c-0.18,0.47-0.37,0.93-0.54,1.42c-0.49,1.43-0.93,2.92-1.31,4.48c-0.06,0.24-0.1,0.5-0.15,0.74c-0.32,1.41-0.59,2.88-0.81,4.39c-0.02,0.16-0.04,0.31-0.06,0.47c9.26-5.69,20.53-10.1,32.8-12.82c6.25-1.39,12.56-2.26,18.77-2.62c-0.02-0.04-0.02-0.09-0.04-0.13c-0.17-0.45-0.37-0.9-0.58-1.33c-0.05-0.11-0.11-0.22-0.16-0.33c-1.58-3-4.26-5.55-7.63-7.51c-0.4-0.23-0.79-0.47-1.21-0.67c-0.03-0.02-0.06-0.03-0.1-0.05c-5.76-2.85-13.07-3.95-19.84-3.08c-0.16,0.02-0.32,0.03-0.48,0.06c-0.76,0.11-1.51,0.24-2.26,0.4c-0.07,0.02-0.13,0.02-0.2,0.04c0,0,0,0-0.01,0c0,0-0.01,0-0.01,0.01c-1.12,0.25-2.19,0.64-3.23,1.1c-0.28,0.12-0.55,0.27-0.82,0.41c-0.8,0.41-1.59,0.87-2.34,1.4c-0.23,0.16-0.46,0.32-0.69,0.49c-1.92,1.47-3.67,3.33-5.21,5.56c-0.16,0.24-0.31,0.5-0.47,0.75c-0.56,0.87-1.1,1.79-1.6,2.76c-0.22,0.42-0.43,0.85-0.64,1.3C232.5,53.73,232.12,54.67,231.75,55.63"/>
                      <path class="st1" d="M54.26,178.54v6.75h39.71c2.34,0,4.24,1.9,4.24,4.24c0,2.34-1.9,4.24-4.24,4.24H54.26v6.75c0,3.72,3.03,6.75,6.75,6.75h32.97c2.34,0,4.24,1.9,4.24,4.24c0,2.34-1.9,4.24-4.24,4.24H61.01c-8.4,0-15.23-6.83-15.23-15.23v-21.98c0-8.4,6.83-15.23,15.23-15.23h32.97c2.34,0,4.24,1.9,4.24,4.24c0,2.34-1.9,4.24-4.24,4.24H61.01C57.29,171.79,54.26,174.82,54.26,178.54 M460.22,193.77c2.34,0,4.24-1.9,4.24-4.24c0-2.34-1.9-4.24-4.24-4.24H420.5v-6.75c0-3.72,3.03-6.75,6.75-6.75h32.97c2.34,0,4.24-1.9,4.24-4.24c0-2.34-1.9-4.24-4.24-4.24h-32.97c-8.4,0-15.23,6.83-15.23,15.23v21.98c0,8.4,6.83,15.23,15.23,15.23h32.97c2.34,0,4.24-1.9,4.24-4.24c0-2.34-1.9-4.24-4.24-4.24h-32.97c-3.72,0-6.75-3.03-6.75-6.75v-6.75L460.22,193.77L460.22,193.77z M203.59,184.89h-21.98c-3.72,0-6.75-3.03-6.75-6.75s3.03-6.75,6.75-6.75h30.77c2.34,0,4.24-1.9,4.24-4.24c0-2.34-1.9-4.24-4.24-4.24h-30.77c-8.4,0-15.23,6.83-15.23,15.23s6.83,15.23,15.23,15.23h21.98c3.72,0,6.75,3.03,6.75,6.75s-3.03,6.75-6.75,6.75h-30.77c-2.34,0-4.24,1.9-4.24,4.24c0,2.34,1.9,4.24,4.24,4.24h30.77c8.4,0,15.23-6.83,15.23-15.23S211.99,184.89,203.59,184.89 M154.3,163.31c-2.34,0-4.24,1.9-4.24,4.24v33.72l-36.72-36.72c-1.21-1.21-3.04-1.58-4.62-0.92c-1.59,0.66-2.62,2.2-2.62,3.92v43.96c0,2.34,1.9,4.24,4.24,4.24s4.24-1.9,4.24-4.24v-33.72l36.72,36.72c0.81,0.81,1.9,1.24,3,1.24c0.55,0,1.1-0.11,1.62-0.32c1.58-0.66,2.62-2.2,2.62-3.92v-43.96C158.54,165.21,156.65,163.31,154.3,163.31 M361.55,171.79h27.77c3.72,0,6.75,3.03,6.75,6.75s-3.03,6.75-6.75,6.75h-27.77V171.79z M394.73,192.76c5.73-2.19,9.82-7.73,9.82-14.22c0-8.4-6.83-15.23-15.23-15.23H357.8h-0.49c-2.34,0-4.24,1.85-4.24,4.2v43.71c0,2.34,1.9,4.24,4.24,4.24s4.24-1.9,4.24-4.24v-17.44h23.89l11.71,19.51c0.79,1.33,2.2,2.06,3.64,2.06c0.74,0,1.5-0.2,2.18-0.61c2.01-1.21,2.66-3.81,1.46-5.82L394.73,192.76z M274.56,163.05c-2.34,0-4.24,1.9-4.24,4.24v17.75h-35.84v-17.75c0-2.34-1.9-4.24-4.24-4.24c-2.34,0-4.24,1.9-4.24,4.24v43.64c0,2.34,1.9,4.24,4.24,4.24c2.34,0,4.24-1.9,4.24-4.24v-17.41h35.84v17.41c0,2.34,1.9,4.24,4.24,4.24s4.24-1.9,4.24-4.24v-43.64C278.8,164.95,276.9,163.05,274.56,163.05 M315.62,170.29c11.33,0,20.56,8.45,20.56,18.83s-9.22,18.83-20.56,18.83c-11.33,0-20.56-8.45-20.56-18.83C295.07,178.73,304.29,170.29,315.62,170.29 M315.62,216.83c16.24,0,29.45-12.43,29.45-27.72c0-15.28-13.21-27.72-29.45-27.72c-16.24,0-29.45,12.43-29.45,27.72C286.18,204.4,299.39,216.83,315.62,216.83"/>
                    </g>
                  </svg>
                </td>
              </tr>
            </table>
            <!--<![endif]-->
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

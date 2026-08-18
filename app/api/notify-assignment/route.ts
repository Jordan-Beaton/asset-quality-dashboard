import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    recipientEmail: string;
    recipientName?: string;
    itemType: string;
    itemRef: string;
    itemTitle?: string;
    dueDate?: string;
  };

  const { recipientEmail, recipientName, itemType, itemRef, itemTitle, dueDate } = body;

  if (!recipientEmail || !itemType || !itemRef) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const from = process.env.DOCUMENT_NOTIFICATIONS_FROM_EMAIL ?? "documents@enshoresubsea.com";
  const dueDateRow = dueDate
    ? `<tr><td style="padding:4px 0;color:#53565A;font-size:14px;"><strong>Due Date:</strong></td><td style="padding:4px 8px;color:#53565A;font-size:14px;">${dueDate}</td></tr>`
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
            <h2 style="color:#005670;margin:0 0 16px;">You have been assigned a ${itemType}</h2>
            <p style="color:#53565A;font-size:14px;margin:0 0 16px;">Hi ${recipientName ?? "there"},</p>
            <p style="color:#53565A;font-size:14px;margin:0 0 16px;">
              You have been assigned as the owner of the following ${itemType} in the Enshore IMS.
            </p>
            <table cellpadding="0" cellspacing="0" style="border-left:4px solid #005670;background:#ECECE7;padding:16px;margin:16px 0;width:100%;box-sizing:border-box;">
              <tr><td style="padding:4px 0;color:#53565A;font-size:14px;"><strong>Reference:</strong></td><td style="padding:4px 8px;color:#53565A;font-size:14px;">${itemRef}</td></tr>
              ${itemTitle ? `<tr><td style="padding:4px 0;color:#53565A;font-size:14px;"><strong>Title / Description:</strong></td><td style="padding:4px 8px;color:#53565A;font-size:14px;">${itemTitle}</td></tr>` : ""}
              ${dueDateRow}
            </table>
            <p style="color:#53565A;font-size:14px;margin:0;">
              Please log in to the Enshore IMS to view the full details and take action.
            </p>
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
    await resend.emails.send({
      from,
      to: [recipientEmail],
      subject: `IMS: You've been assigned ${itemRef}${itemTitle ? ` – ${itemTitle}` : ""}`,
      html,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

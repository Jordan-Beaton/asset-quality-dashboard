import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { createClient as createServerClient } from "../../../../src/lib/supabase/server";

const STORAGE_BUCKET = "project-documents";

type Recipient = { name: string; email: string };
type PointSnapshot = { id: string; section_number: string; activity_description: string; intervention_type: string };

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Inspection records service is not configured.");
  return createClient(url, key);
}

function e(v: string) {
  return String(v || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

async function requireAuth() {
  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

function buildHtml({
  noiNumber,
  itpNumber,
  itpTitle,
  supplier,
  points,
  notes,
  fileLinks,
}: {
  noiNumber: string;
  itpNumber: string;
  itpTitle: string;
  supplier: string;
  points: PointSnapshot[];
  notes: string | null;
  fileLinks: Array<{ name: string; url: string }>;
}) {
  const pointRows = points
    .map(p => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #D0D0CE;font-size:13px;font-weight:700;color:#005670;white-space:nowrap;">§${e(p.section_number)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #D0D0CE;font-size:13px;">
          <span style="display:inline-block;background:#ECECE7;color:${p.intervention_type === "H" ? "#F93822" : "#005670"};font-size:10px;font-weight:800;padding:2px 7px;border-radius:4px;margin-right:6px;">${e(p.intervention_type)}</span>
          ${e(p.activity_description)}
        </td>
      </tr>`)
    .join("");

  const fileRows = fileLinks
    .map(f => `
      <p style="margin:8px 0;">
        <a href="${e(f.url)}" style="display:inline-block;background:#005670;color:#ffffff;text-decoration:none;border-radius:10px;padding:10px 16px;font-size:13px;font-weight:700;">
          📄 ${e(f.name)}
        </a>
        <span style="font-size:11px;color:#53565A;margin-left:8px;">Link expires in 7 days</span>
      </p>`)
    .join("");

  const notesHtml = notes
    ? `<p style="margin:0;font-size:13px;color:#000000;line-height:1.5;">${e(notes).replace(/\n/g, "<br/>")}</p>`
    : "";

  return `
<div style="font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:#000000;line-height:1.5;max-width:620px;">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#005670 0%,#005670 64%,#63B1BC 160%);border-radius:12px 12px 0 0;padding:22px 28px;margin-bottom:0;">
    <div style="font-size:11px;font-weight:800;letter-spacing:0.08em;color:#63B1BC;text-transform:uppercase;margin-bottom:4px;">Enshore IMS · Inspection Records</div>
    <div style="font-size:20px;font-weight:700;color:#ffffff;">Inspection records available — NOI ${e(noiNumber)}</div>
  </div>

  <!-- Body -->
  <div style="background:#ffffff;border:1px solid #D0D0CE;border-top:none;border-radius:0 0 12px 12px;padding:24px 28px;">

    <!-- Meta row -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr>
        <td style="padding:8px 12px;background:#ECECE7;border-radius:8px 0 0 8px;font-size:11px;font-weight:800;color:#53565A;text-transform:uppercase;letter-spacing:0.05em;white-space:nowrap;width:1%;">NOI Reference</td>
        <td style="padding:8px 12px;background:#ECECE7;border-radius:0 8px 8px 0;font-size:14px;font-weight:700;color:#005670;">NOI-${e(noiNumber)}</td>
      </tr>
    </table>

    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;border:1px solid #D0D0CE;border-radius:8px;overflow:hidden;">
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #D0D0CE;font-size:11px;font-weight:800;color:#53565A;text-transform:uppercase;letter-spacing:0.05em;background:#ECECE7;white-space:nowrap;width:30%;">ITP Reference</td>
        <td style="padding:8px 12px;border-bottom:1px solid #D0D0CE;font-size:13px;font-weight:700;">${e(itpNumber)}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #D0D0CE;font-size:11px;font-weight:800;color:#53565A;text-transform:uppercase;letter-spacing:0.05em;background:#ECECE7;">ITP Title</td>
        <td style="padding:8px 12px;border-bottom:1px solid #D0D0CE;font-size:13px;">${e(itpTitle)}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;font-size:11px;font-weight:800;color:#53565A;text-transform:uppercase;letter-spacing:0.05em;background:#ECECE7;">Supplier</td>
        <td style="padding:8px 12px;font-size:13px;">${e(supplier)}</td>
      </tr>
    </table>

    <!-- ITP points -->
    <div style="font-size:11px;font-weight:800;color:#53565A;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">ITP Points Covered</div>
    <table style="width:100%;border-collapse:collapse;border:1px solid #D0D0CE;border-radius:8px;overflow:hidden;margin-bottom:20px;">
      <thead>
        <tr>
          <th style="padding:8px 12px;background:#005670;color:#ffffff;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.04em;text-align:left;white-space:nowrap;">Section</th>
          <th style="padding:8px 12px;background:#005670;color:#ffffff;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.04em;text-align:left;">Activity</th>
        </tr>
      </thead>
      <tbody>${pointRows}</tbody>
    </table>

    ${notes ? `
    <!-- Notes -->
    <div style="background:#ECECE7;border-radius:8px;padding:12px 14px;margin-bottom:20px;">
      <div style="font-size:11px;font-weight:800;color:#53565A;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">Notes</div>
      ${notesHtml}
    </div>` : ""}

    <!-- Files -->
    <div style="font-size:11px;font-weight:800;color:#53565A;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px;">Inspection Records</div>
    ${fileLinks.length ? fileRows : `<p style="font-size:13px;color:#53565A;">No files are currently attached to this record.</p>`}

    <!-- Footer -->
    <hr style="border:none;border-top:1px solid #D0D0CE;margin:24px 0 16px;"/>
    <p style="font-size:11px;color:#53565A;margin:0;">
      This notification was sent from the <strong>Enshore IMS</strong>. File links are secure signed URLs — they expire after 7 days and cannot be forwarded.
      If you did not expect this email, please disregard it or contact your Enshore project team.
    </p>
  </div>

</div>`;
}

// POST /api/projects/inspection-records
// Body: { action: "notify", recordId: string }
export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const body = await request.json() as { action?: string; recordId?: string };
    const recordId = String(body.recordId || "").trim();
    if (!recordId) return NextResponse.json({ error: "recordId is required." }, { status: 400 });

    const supabase = serviceClient();

    // Load record + files
    const { data: record, error: recErr } = await supabase
      .from("inspection_records")
      .select("*, inspection_record_files(*)")
      .eq("id", recordId)
      .maybeSingle();

    if (recErr || !record) return NextResponse.json({ error: recErr?.message || "Record not found." }, { status: 404 });

    const recipients: Recipient[] = Array.isArray(record.recipients) ? record.recipients : [];
    if (!recipients.length) return NextResponse.json({ error: "No recipients on this record." }, { status: 400 });

    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.DOCUMENT_NOTIFICATIONS_FROM_EMAIL;
    if (!resendApiKey || !fromEmail) return NextResponse.json({ error: "Email delivery is not configured." }, { status: 500 });

    // Resolve ITP info from the first point snapshot's id
    const points: PointSnapshot[] = Array.isArray(record.point_snapshots) ? record.point_snapshots : [];
    let itpNumber = "—";
    let itpTitle = "—";
    let supplier = "—";

    if (points.length > 0) {
      const firstPointId = points[0].id;
      const { data: noi } = await supabase
        .from("project_noi_points")
        .select("itp_id")
        .eq("id", firstPointId)
        .maybeSingle();

      if (noi?.itp_id) {
        const { data: itp } = await supabase
          .from("project_itps")
          .select("document_number, title, supplier")
          .eq("id", noi.itp_id)
          .maybeSingle();

        if (itp) {
          itpNumber = itp.document_number || "—";
          itpTitle = itp.title || "—";
          supplier = itp.supplier || "—";
        }
      }
    }

    // Generate signed URLs
    const files: Array<{ file_name: string; file_path: string }> = record.inspection_record_files || [];
    const fileLinks: Array<{ name: string; url: string }> = [];
    for (const file of files) {
      const { data: signed } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(file.file_path, 60 * 60 * 24 * 7);
      if (signed?.signedUrl) fileLinks.push({ name: file.file_name, url: signed.signedUrl });
    }

    const resend = new Resend(resendApiKey);
    const toEmails = recipients.map(r => r.email).filter(e => e.includes("@"));
    const toNames = recipients.map(r => r.name).filter(Boolean).join(", ");

    const result = await resend.emails.send({
      from: fromEmail,
      to: toEmails,
      subject: `Inspection records — NOI ${record.noi_number} (${itpNumber})`,
      html: buildHtml({
        noiNumber: record.noi_number,
        itpNumber,
        itpTitle,
        supplier,
        points,
        notes: record.notes || null,
        fileLinks,
      }),
    });

    if (result.error) throw new Error(result.error.message);

    await supabase.from("inspection_record_notifications").insert({
      record_id: recordId,
      sent_to: recipients,
      sent_at: new Date().toISOString(),
      resend_message_id: result.data?.id || null,
      sent_by_email: user.email || null,
    });

    await supabase.from("inspection_records").update({
      last_notified_at: new Date().toISOString(),
      last_notified_to: toNames,
    }).eq("id", recordId);

    return NextResponse.json({ ok: true, id: result.data?.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to send notification." },
      { status: 500 }
    );
  }
}

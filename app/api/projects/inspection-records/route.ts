import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { createClient as createServerClient } from "../../../../src/lib/supabase/server";
import { buildPackUrl } from "../../../../src/lib/inspectionPack";
import { buildInspectionEmailHtml } from "../../../../src/lib/inspectionRecordEmail";

const STORAGE_BUCKET = "project-documents";

type Recipient = { name: string; email: string };
type PointSnapshot = { id: string; section_number: string; activity_description: string; intervention_type: string };

export const maxDuration = 60;

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Inspection records service is not configured.");
  return createClient(url, key);
}

async function requireAuth() {
  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
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

    // A signed six-month link to the record's document pack (all files in one ZIP).
    if (body.action === "pack-link") {
      const { count } = await supabase.from("inspection_record_files").select("id", { count: "exact", head: true }).eq("record_id", recordId);
      if (!count) return NextResponse.json({ error: "There are no files on this record yet." }, { status: 404 });
      return NextResponse.json({ url: buildPackUrl(new URL(request.url).origin, recordId) });
    }

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

    // One signed link (valid six months) to every file in a single ZIP, instead of a link per file.
    const files: Array<{ file_name: string; file_size: number | null; uploaded_at?: string | null }> = record.inspection_record_files || [];
    const fileList = files
      .slice()
      .sort((a, b) => String(a.uploaded_at || "").localeCompare(String(b.uploaded_at || "")))
      .map((file) => ({ name: file.file_name, size: file.file_size }));
    const packUrl = files.length ? buildPackUrl(new URL(request.url).origin, recordId) : "";

    const resend = new Resend(resendApiKey);
    const toEmails = recipients.map(r => r.email).filter(e => e.includes("@"));
    const toNames = recipients.map(r => r.name).filter(Boolean).join(", ");

    const result = await resend.emails.send({
      from: fromEmail,
      to: toEmails,
      subject: `Inspection records — NOI ${record.noi_number} (${itpNumber})`,
      html: buildInspectionEmailHtml({
        noiNumber: record.noi_number,
        itpNumber,
        itpTitle,
        supplier,
        points,
        notes: record.notes || null,
        files: fileList,
        packUrl,
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

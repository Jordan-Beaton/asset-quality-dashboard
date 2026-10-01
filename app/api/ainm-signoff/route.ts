import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { createClient as createServerClient } from "../../../src/lib/supabase/server";
import { writeNotification } from "../../../src/lib/notifications";

const ROLES = ["location", "hseq", "project_manager", "smt"] as const;
type Role = (typeof ROLES)[number];

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("AINM sign-off is not configured.");
  return createClient(url, key);
}

function emailClient() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.DOCUMENT_NOTIFICATIONS_FROM_EMAIL;
  if (!apiKey || !from) throw new Error("Email delivery is not configured.");
  return { resend: new Resend(apiKey), from };
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function detailRow(label: string, value: string) {
  if (!value.trim()) return "";
  return `<tr>
    <td style="padding:8px 0;vertical-align:top;width:170px;border-bottom:1px solid #D0D0CE;">
      <span style="font-size:10px;font-weight:700;color:#53565A;text-transform:uppercase;letter-spacing:0.06em;">${label}</span>
    </td>
    <td style="padding:8px 0 8px 14px;vertical-align:top;border-bottom:1px solid #D0D0CE;font-size:13px;color:#000000;">${value}</td>
  </tr>`;
}

export async function POST(request: Request) {
  try {
    const auth = await createServerClient();
    const { data: authData } = await auth.auth.getUser();
    if (!authData.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const body = (await request.json()) as {
      ainmId?: string;
      role?: string;
      rowLabel?: string;
      recipientName?: string;
      recipientEmail?: string;
    };
    const ainmId = clean(body.ainmId);
    const role = clean(body.role) as Role;
    const rowLabel = clean(body.rowLabel) || "AINM Investigation Sign-Off";
    const recipientName = clean(body.recipientName);
    const recipientEmail = clean(body.recipientEmail).toLowerCase();

    if (!ainmId || !ROLES.includes(role)) {
      return NextResponse.json({ error: "Missing or invalid sign-off target." }, { status: 400 });
    }
    if (!recipientName || !recipientEmail.includes("@")) {
      return NextResponse.json({ error: "A recipient name and email are required." }, { status: 400 });
    }

    const supabase = serviceClient();
    const { data: record, error: recordError } = await supabase.from("hse_ainm_records").select("*").eq("id", ainmId).maybeSingle();
    if (recordError || !record) throw recordError || new Error("AINM record not found.");

    // Clear any stale pending request for this exact role so re-sending doesn't
    // leave duplicate pending requests behind.
    const { data: stale } = await supabase
      .from("ainm_signoff_requests")
      .select("id")
      .eq("ainm_id", ainmId)
      .eq("role", role)
      .eq("status", "Pending");
    if (stale?.length) {
      await supabase.from("ainm_signoff_requests").delete().in("id", stale.map((row) => row.id));
    }

    const senderName = authData.user.user_metadata?.full_name || authData.user.user_metadata?.name || null;
    const senderEmail = authData.user.email || null;

    const { data: created, error: createError } = await supabase
      .from("ainm_signoff_requests")
      .insert({
        ainm_id: ainmId,
        role,
        row_label: rowLabel,
        recipient_name: recipientName,
        recipient_email: recipientEmail,
        sender_name: senderName,
        sender_email: senderEmail,
        status: "Pending",
      })
      .select("id")
      .single();
    if (createError || !created) throw createError || new Error("Could not create the sign-off request.");

    const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { error: tokenError } = await supabase.from("ainm_signoff_tokens").insert({ request_id: created.id, token, expires_at: expiresAt });
    if (tokenError) throw tokenError;
    const actionUrl = `${new URL(request.url).origin}/hse/ainm/signoff-action?token=${encodeURIComponent(token)}`;

    const rows = [
      detailRow("AINM Reference", escapeHtml(record.ainm_number || "")),
      detailRow("Title", escapeHtml(record.title || "")),
      detailRow("Project", escapeHtml(record.project || "")),
      detailRow("Location/Site", escapeHtml(record.location_site || "")),
      detailRow("Classification", escapeHtml(record.event_classification || "")),
    ].join("\n");

    const { resend, from } = emailClient();
    const html = `<div style="font-family:'Segoe UI',Arial,sans-serif;color:#000;line-height:1.5">
      <h2>AINM Investigation sign-off request</h2>
      <p>Hi ${escapeHtml(recipientName)},</p>
      <p><strong>${escapeHtml(record.ainm_number || "")}</strong> - ${escapeHtml(record.title || "")}</p>
      <p>You're asked to review the investigation as: <strong>${escapeHtml(rowLabel)}</strong>.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">${rows}</table>
      <p><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#005670;color:#fff;text-decoration:none;border-radius:10px;padding:12px 18px;font-weight:700">Review and decide</a></p>
      <p style="font-size:12px;color:#53565A">Rejecting or leaving Comments requires a short note. Comments do not approve or reject the sign-off, but the person who sent this request will be notified to follow up.</p>
    </div>`;

    const result = await resend.emails.send({
      from,
      to: [recipientEmail],
      subject: `AINM sign-off requested: ${record.ainm_number} - ${record.title}`,
      html,
    });
    if (result.error) throw new Error(result.error.message);

    await writeNotification({
      recipientEmail,
      sourceModule: "HSE / AINM",
      title: `AINM sign-off requested: ${record.ainm_number}`,
      body: `${record.title} - ${rowLabel}`,
      link: `/hse/ainm?ainmId=${encodeURIComponent(ainmId)}`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to send the sign-off request." }, { status: 500 });
  }
}

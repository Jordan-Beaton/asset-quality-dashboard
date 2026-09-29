import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { writeNotification } from "../../../src/lib/notifications";

const TARGET_TABLES = ["moc_review_endorsement_rows", "moc_acceptance_rows", "moc_closeout_rows"] as const;
type TargetTable = (typeof TARGET_TABLES)[number];

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("MOC sign-off is not configured.");
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

function rowLabelForTable(targetTable: string) {
  if (targetTable === "moc_review_endorsement_rows") return "Review & Endorsement";
  if (targetTable === "moc_acceptance_rows") return "MOC Change Acceptance";
  return "MOC Close-Out Verification";
}

async function validToken(token: string) {
  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("moc_signoff_tokens")
    .select("id,expires_at,used_at,request_id,moc_signoff_requests(*)")
    .eq("token", token)
    .maybeSingle();
  if (error || !data) return { supabase, tokenRow: null, request: null, problem: "This sign-off link is not valid." };
  if (data.used_at) return { supabase, tokenRow: data, request: null, problem: "This sign-off link has already been used." };
  if (new Date(data.expires_at).getTime() < Date.now()) return { supabase, tokenRow: data, request: null, problem: "This sign-off link has expired." };
  const requestRow = data.moc_signoff_requests as unknown as Record<string, unknown> | null;
  if (!requestRow) return { supabase, tokenRow: data, request: null, problem: "The associated sign-off request could not be found." };
  return { supabase, tokenRow: data, request: requestRow, problem: "" };
}

export async function GET(request: Request) {
  try {
    const token = clean(new URL(request.url).searchParams.get("token"));
    const { request: signoff, problem } = await validToken(token);
    if (problem || !signoff) return NextResponse.json({ error: problem }, { status: 400 });

    const supabase = serviceClient();
    const { data: report } = await supabase
      .from("moc_reports")
      .select("moc_report_no,moc_report_title")
      .eq("id", signoff.moc_report_id as string)
      .maybeSingle();

    return NextResponse.json({
      status: signoff.status,
      recipientName: signoff.recipient_name,
      rowLabel: signoff.row_label,
      mocReportNo: report?.moc_report_no || "",
      mocReportTitle: report?.moc_report_title || "",
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load the sign-off request." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string; decision?: string; name?: string; note?: string };
    const token = clean(body.token);
    const decision = clean(body.decision);
    const name = clean(body.name);
    const note = clean(body.note);

    if (!["approve", "reject", "comments"].includes(decision)) {
      return NextResponse.json({ error: "Choose Approve, Reject, or Comments." }, { status: 400 });
    }
    if (!name) return NextResponse.json({ error: "Enter your name to confirm this decision." }, { status: 400 });
    if (decision !== "approve" && !note) {
      return NextResponse.json({ error: decision === "reject" ? "A reason is required to reject." : "Enter your comments." }, { status: 400 });
    }

    const { supabase, request: signoff, problem } = await validToken(token);
    if (problem || !signoff) return NextResponse.json({ error: problem }, { status: 400 });

    const status = decision === "approve" ? "Approved" : decision === "reject" ? "Rejected" : "Needs Attention";
    const decidedAt = new Date().toISOString();

    const { data: updatedRequest, error: updateError } = await supabase
      .from("moc_signoff_requests")
      .update({ status, decision_name: name, decision_note: note || null, decided_at: decidedAt, updated_at: decidedAt })
      .eq("id", signoff.id as string)
      .eq("status", "Pending")
      .select("*")
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updatedRequest) return NextResponse.json({ error: "This sign-off has already been decided." }, { status: 409 });

    await supabase.from("moc_signoff_tokens").update({ used_at: decidedAt }).eq("token", token);

    const targetTable = signoff.target_table as TargetTable;
    const mocReportId = signoff.moc_report_id as string;
    const sortOrder = signoff.sort_order as number;
    const recipientEmail = clean(signoff.recipient_email);
    const rowLabel = clean(signoff.row_label) || rowLabelForTable(targetTable);
    const auditLine =
      decision === "approve"
        ? `Approved via email by ${name} (${recipientEmail}) on ${new Date(decidedAt).toLocaleString("en-GB")}`
        : decision === "reject"
        ? `Rejected via email by ${name} (${recipientEmail}) on ${new Date(decidedAt).toLocaleString("en-GB")}`
        : `Comments returned via email by ${name} (${recipientEmail}) on ${new Date(decidedAt).toLocaleString("en-GB")}`;

    const rowPayload: Record<string, unknown> =
      targetTable === "moc_review_endorsement_rows"
        ? {
            approved_value: decision === "approve" ? "Yes" : decision === "reject" ? "No" : "",
            signature: auditLine,
            review_date: decidedAt.slice(0, 10),
            comments: note || null,
          }
        : {
            signature: auditLine,
            signoff_date: decidedAt.slice(0, 10),
            comments: note || null,
          };

    await supabase.from(targetTable).update(rowPayload).eq("moc_report_id", mocReportId).eq("sort_order", sortOrder);

    const { data: report } = await supabase
      .from("moc_reports")
      .select("moc_report_no,moc_report_title,moc_coordinator_name")
      .eq("id", mocReportId)
      .maybeSingle();
    const mocRef = report ? `${report.moc_report_no} - ${report.moc_report_title}` : "the MOC";

    const { resend, from } = emailClient();
    const senderEmail = clean(signoff.sender_email);
    const decisionLabel = decision === "approve" ? "Approved" : decision === "reject" ? "Rejected" : "Comments returned (no decision)";
    const summaryHtml = `<div style="font-family:'Segoe UI',Arial,sans-serif;color:#000;line-height:1.5">
      <h2>MOC sign-off recorded</h2>
      <p><strong>${escapeHtml(mocRef)}</strong> - ${escapeHtml(rowLabel)}</p>
      <p><strong>Decision:</strong> ${escapeHtml(decisionLabel)}</p>
      <p><strong>By:</strong> ${escapeHtml(name)} (${escapeHtml(recipientEmail)})</p>
      ${note ? `<p><strong>Note:</strong> ${escapeHtml(note)}</p>` : ""}
      <p style="font-size:12px;color:#53565A">Recorded ${escapeHtml(new Date(decidedAt).toLocaleString("en-GB"))}</p>
    </div>`;

    const confirmationRecipients = Array.from(new Set([recipientEmail, senderEmail].filter((email) => email.includes("@"))));
    if (confirmationRecipients.length) {
      await resend.emails.send({ from, to: confirmationRecipients, subject: `MOC sign-off recorded: ${mocRef}`, html: summaryHtml });
    }

    if (senderEmail) {
      await writeNotification({
        recipientEmail: senderEmail,
        sourceModule: "Management of Change",
        title: `${decisionLabel}: ${mocRef}`,
        body: `${rowLabel} - ${name}`,
        link: report ? `/moc?search=${encodeURIComponent(report.moc_report_no)}` : undefined,
      });
    }

    // "Comments" doesn't approve or reject anything, so make sure it doesn't
    // just sit quietly on the row — notify the MOC Coordinator to follow up.
    if (decision === "comments" && report?.moc_coordinator_name) {
      const { data: coordinator } = await supabase
        .from("people")
        .select("name,email")
        .ilike("name", clean(report.moc_coordinator_name))
        .maybeSingle();
      const coordinatorEmail = clean(coordinator?.email);
      if (coordinatorEmail && coordinatorEmail !== senderEmail) {
        await resend.emails.send({
          from,
          to: [coordinatorEmail],
          subject: `MOC comments returned - needs your attention: ${mocRef}`,
          html: `<div style="font-family:'Segoe UI',Arial,sans-serif;color:#000;line-height:1.5">
            <h2>Comments returned on an MOC you coordinate</h2>
            <p><strong>${escapeHtml(mocRef)}</strong> - ${escapeHtml(rowLabel)}</p>
            <p><strong>From:</strong> ${escapeHtml(name)} (${escapeHtml(recipientEmail)})</p>
            <p><strong>Comments:</strong> ${escapeHtml(note)}</p>
            <p>This did not approve or reject the change - please review and follow up.</p>
          </div>`,
        });
        await writeNotification({
          recipientEmail: coordinatorEmail,
          sourceModule: "Management of Change",
          title: `Comments need attention: ${mocRef}`,
          body: `${rowLabel} - ${name}: ${note}`,
          link: report ? `/moc?search=${encodeURIComponent(report.moc_report_no)}` : undefined,
        });
      }
    }

    return NextResponse.json({ ok: true, status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to record the decision." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { createClient as createServerClient } from "../../../src/lib/supabase/server";
import { createMocSignoffSummaryPdf } from "../../../src/lib/mocSignoffPdf";
import { writeNotification } from "../../../src/lib/notifications";

const TARGET_TABLES = ["moc_review_endorsement_rows", "moc_acceptance_rows", "moc_closeout_rows"] as const;
type TargetTable = (typeof TARGET_TABLES)[number];
type SendMode = "decision" | "inform";

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

const IMPACT_LABELS: Record<string, string> = {
  impact_health_safety: "Health & Safety",
  impact_environment: "Environment",
  impact_quality: "Quality",
  impact_scm: "Supply Chain / Procurement",
  impact_schedule: "Schedule",
  impact_equipment: "Equipment",
  impact_fabrication_opps: "Fabrication / Operations",
  impact_engineering: "Engineering",
  impact_marine_operations: "Marine Operations",
  impact_organization: "Organisation",
  impact_regulatory: "Regulatory",
  impact_documentation: "Documentation",
  impact_reputation: "Reputation",
  impact_simops: "SIMOPS",
  impact_other: "Other",
};

export async function POST(request: Request) {
  try {
    const auth = await createServerClient();
    const { data: authData } = await auth.auth.getUser();
    if (!authData.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const body = (await request.json()) as {
      mocReportId?: string;
      targetTable?: string;
      sortOrder?: number;
      rowLabel?: string;
      recipientName?: string;
      recipientEmail?: string;
      mode?: string;
    };
    const mocReportId = clean(body.mocReportId);
    const targetTable = clean(body.targetTable) as TargetTable;
    const sortOrder = Number(body.sortOrder);
    const rowLabel = clean(body.rowLabel) || "MOC sign-off";
    const recipientName = clean(body.recipientName);
    const recipientEmail = clean(body.recipientEmail).toLowerCase();
    const mode: SendMode = body.mode === "inform" ? "inform" : "decision";

    if (!mocReportId || !TARGET_TABLES.includes(targetTable) || !Number.isFinite(sortOrder)) {
      return NextResponse.json({ error: "Missing or invalid sign-off target." }, { status: 400 });
    }
    if (!recipientName || !recipientEmail.includes("@")) {
      return NextResponse.json({ error: "A recipient name and email are required." }, { status: 400 });
    }

    const supabase = serviceClient();
    const { data: report, error: reportError } = await supabase.from("moc_reports").select("*").eq("id", mocReportId).maybeSingle();
    if (reportError || !report) throw reportError || new Error("MOC report not found.");

    const { data: actionItemRows } = await supabase
      .from("moc_action_plan_items")
      .select("action_no,description,responsible_person,target_date,status")
      .eq("moc_report_id", mocReportId)
      .order("sort_order", { ascending: true });

    // Clear any stale pending request for this exact row so re-sending
    // doesn't leave duplicate pending requests behind.
    const { data: stale } = await supabase
      .from("moc_signoff_requests")
      .select("id")
      .eq("moc_report_id", mocReportId)
      .eq("target_table", targetTable)
      .eq("sort_order", sortOrder)
      .eq("status", "Pending");
    if (stale?.length) {
      await supabase.from("moc_signoff_requests").delete().in("id", stale.map((row) => row.id));
    }

    const senderName = authData.user.user_metadata?.full_name || authData.user.user_metadata?.name || null;
    const senderEmail = authData.user.email || null;
    const nowIso = new Date().toISOString();

    const { data: created, error: createError } = await supabase
      .from("moc_signoff_requests")
      .insert({
        moc_report_id: mocReportId,
        target_table: targetTable,
        sort_order: sortOrder,
        row_label: rowLabel,
        recipient_name: recipientName,
        recipient_email: recipientEmail,
        sender_name: senderName,
        sender_email: senderEmail,
        status: mode === "inform" ? "Informed" : "Pending",
        decided_at: mode === "inform" ? nowIso : null,
      })
      .select("id")
      .single();
    if (createError || !created) throw createError || new Error("Could not create the sign-off request.");

    let actionUrl = "";
    if (mode === "decision") {
      const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const { error: tokenError } = await supabase.from("moc_signoff_tokens").insert({ request_id: created.id, token, expires_at: expiresAt });
      if (tokenError) throw tokenError;
      actionUrl = `${new URL(request.url).origin}/moc/signoff-action?token=${encodeURIComponent(token)}`;
    } else {
      // Inform-only rows have nothing to decide, so there's no decision link
      // or pending token - record the audit trail on the row immediately.
      await supabase
        .from("moc_review_endorsement_rows")
        .update({ signature: `Informed via email on ${new Date(nowIso).toLocaleDateString("en-GB")}`, review_date: nowIso.slice(0, 10) })
        .eq("moc_report_id", mocReportId)
        .eq("sort_order", sortOrder);
    }

    const impactAreas = Object.entries(IMPACT_LABELS)
      .filter(([key]) => Boolean(report[key]))
      .map(([key, label]) => (key === "impact_other" && report.impact_other_text ? `${label} (${report.impact_other_text})` : label));

    const pdfBytes = createMocSignoffSummaryPdf({
      mocReportNo: report.moc_report_no,
      mocReportTitle: report.moc_report_title,
      projectWorksiteAddress: report.project_worksite_address,
      mocCoordinatorName: report.moc_coordinator_name,
      responsibleManagerName: report.responsible_manager_name,
      changeType: report.change_type,
      temporaryValidFrom: report.temporary_valid_from,
      temporaryValidTo: report.temporary_valid_to,
      reasonForChange: report.reason_for_change,
      proposedChangeDescription: report.proposed_change_description,
      implementationPlan: report.implementation_plan,
      impactAreas,
      actionItems: (actionItemRows || []).map((item) => ({
        actionNo: item.action_no,
        description: item.description,
        responsiblePerson: item.responsible_person,
        targetDate: item.target_date,
        status: item.status,
      })),
      recipientName,
      rowLabel,
    });

    const { resend, from } = emailClient();
    const html =
      mode === "decision"
        ? `<div style="font-family:'Segoe UI',Arial,sans-serif;color:#000;line-height:1.5">
        <h2>Management of Change sign-off request</h2>
        <p>Hi ${escapeHtml(recipientName)},</p>
        <p><strong>${escapeHtml(report.moc_report_no)}</strong> - ${escapeHtml(report.moc_report_title)}</p>
        <p>You're asked to review this as: <strong>${escapeHtml(rowLabel)}</strong>.</p>
        <p>A summary of the MOC is attached for your review. Please Approve, Reject, or leave Comments.</p>
        <p><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#005670;color:#fff;text-decoration:none;border-radius:10px;padding:12px 18px;font-weight:700">Review and decide</a></p>
        <p style="font-size:12px;color:#53565A">Rejecting or leaving Comments requires a short note. Comments do not approve or reject the change, but the MOC Coordinator will be notified to follow up.</p>
      </div>`
        : `<div style="font-family:'Segoe UI',Arial,sans-serif;color:#000;line-height:1.5">
        <h2>Management of Change - for your information</h2>
        <p>Hi ${escapeHtml(recipientName)},</p>
        <p><strong>${escapeHtml(report.moc_report_no)}</strong> - ${escapeHtml(report.moc_report_title)}</p>
        <p>You're being kept informed of this change as: <strong>${escapeHtml(rowLabel)}</strong>. No action or decision is required from you - this is for your awareness only.</p>
        <p>A summary of the MOC is attached for your records.</p>
      </div>`;

    const result = await resend.emails.send({
      from,
      to: [recipientEmail],
      subject:
        mode === "decision"
          ? `MOC sign-off requested: ${report.moc_report_no} - ${report.moc_report_title}`
          : `MOC for your information: ${report.moc_report_no} - ${report.moc_report_title}`,
      html,
      attachments: [{ filename: `${report.moc_report_no}-MOC-Summary.pdf`, content: Buffer.from(pdfBytes) }],
    });
    if (result.error) throw new Error(result.error.message);

    await writeNotification({
      recipientEmail,
      sourceModule: "Management of Change",
      title:
        mode === "decision"
          ? `MOC sign-off requested: ${report.moc_report_no}`
          : `MOC for your information: ${report.moc_report_no}`,
      body: `${report.moc_report_title} - ${rowLabel}`,
      link: `/moc?search=${encodeURIComponent(report.moc_report_no)}`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to send the sign-off request." }, { status: 500 });
  }
}

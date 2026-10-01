import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { writeNotification } from "../../../src/lib/notifications";

const ROLES = ["location", "hseq", "project_manager", "smt"] as const;
type Role = (typeof ROLES)[number];

const ROLE_FIELD_PREFIX: Record<Role, string> = {
  location: "signoff_location",
  hseq: "signoff_hseq",
  project_manager: "signoff_project_manager",
  smt: "signoff_smt",
};

const ROLE_LABEL: Record<Role, string> = {
  location: "Location/Senior Representative",
  hseq: "HSEQ Representative",
  project_manager: "Work/Project Manager",
  smt: "Senior Management Team Representative",
};

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

async function validToken(token: string) {
  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("ainm_signoff_tokens")
    .select("id,expires_at,used_at,request_id,ainm_signoff_requests(*)")
    .eq("token", token)
    .maybeSingle();
  if (error || !data) return { supabase, tokenRow: null, request: null, problem: "This sign-off link is not valid." };
  if (data.used_at) return { supabase, tokenRow: data, request: null, problem: "This sign-off link has already been used." };
  if (new Date(data.expires_at).getTime() < Date.now()) return { supabase, tokenRow: data, request: null, problem: "This sign-off link has expired." };
  const requestRow = data.ainm_signoff_requests as unknown as Record<string, unknown> | null;
  if (!requestRow) return { supabase, tokenRow: data, request: null, problem: "The associated sign-off request could not be found." };
  return { supabase, tokenRow: data, request: requestRow, problem: "" };
}

export async function GET(request: Request) {
  try {
    const token = clean(new URL(request.url).searchParams.get("token"));
    const { request: signoff, problem } = await validToken(token);
    if (problem || !signoff) return NextResponse.json({ error: problem }, { status: 400 });

    const supabase = serviceClient();
    const { data: record } = await supabase
      .from("hse_ainm_records")
      .select(
        "ainm_number,title,project,location_site,event_date,event_time,event_classification,brief_event_details,root_cause_people,root_cause_equipment,root_cause_environment,root_cause_process,investigation_findings_people,investigation_findings_equipment,investigation_findings_environment,investigation_findings_process"
      )
      .eq("id", signoff.ainm_id as string)
      .maybeSingle();

    return NextResponse.json({
      status: signoff.status,
      recipientName: signoff.recipient_name,
      recipientPosition: signoff.decision_position || "",
      rowLabel: signoff.row_label,
      ainmNumber: record?.ainm_number || "",
      title: record?.title || "",
      project: record?.project || "",
      locationSite: record?.location_site || "",
      eventDate: record?.event_date || "",
      eventTime: record?.event_time || "",
      classification: record?.event_classification || "",
      briefEventDetails: record?.brief_event_details || "",
      rootCause: {
        people: record?.root_cause_people || "",
        equipment: record?.root_cause_equipment || "",
        environment: record?.root_cause_environment || "",
        process: record?.root_cause_process || "",
      },
      investigationFindings: {
        people: record?.investigation_findings_people || record?.root_cause_people || "",
        equipment: record?.investigation_findings_equipment || record?.root_cause_equipment || "",
        environment: record?.investigation_findings_environment || record?.root_cause_environment || "",
        process: record?.investigation_findings_process || record?.root_cause_process || "",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load the sign-off request." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string; decision?: string; name?: string; position?: string; note?: string };
    const token = clean(body.token);
    const decision = clean(body.decision);
    const name = clean(body.name);
    const position = clean(body.position);
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
      .from("ainm_signoff_requests")
      .update({ status, decision_name: name, decision_position: position || null, decision_note: note || null, decided_at: decidedAt, updated_at: decidedAt })
      .eq("id", signoff.id as string)
      .eq("status", "Pending")
      .select("*")
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updatedRequest) return NextResponse.json({ error: "This sign-off has already been decided." }, { status: 409 });

    await supabase.from("ainm_signoff_tokens").update({ used_at: decidedAt }).eq("token", token);

    const role = signoff.role as Role;
    const ainmId = signoff.ainm_id as string;
    const recipientEmail = clean(signoff.recipient_email);
    const rowLabel = clean(signoff.row_label) || ROLE_LABEL[role];
    const auditLine =
      decision === "approve"
        ? `Approved via email by ${name} (${recipientEmail}) on ${new Date(decidedAt).toLocaleString("en-GB")}`
        : decision === "reject"
        ? `Rejected via email by ${name} (${recipientEmail}) on ${new Date(decidedAt).toLocaleString("en-GB")}`
        : `Comments returned via email by ${name} (${recipientEmail}) on ${new Date(decidedAt).toLocaleString("en-GB")}`;

    const prefix = ROLE_FIELD_PREFIX[role];
    await supabase
      .from("hse_ainm_records")
      .update({
        [`${prefix}_name`]: auditLine,
        [`${prefix}_position`]: position || null,
        [`${prefix}_date`]: decidedAt.slice(0, 10),
      })
      .eq("id", ainmId);

    const { data: record } = await supabase.from("hse_ainm_records").select("ainm_number,title").eq("id", ainmId).maybeSingle();
    const ainmRef = record ? `${record.ainm_number} - ${record.title}` : "the AINM investigation";

    const { resend, from } = emailClient();
    const senderEmail = clean(signoff.sender_email);
    const decisionLabel = decision === "approve" ? "Approved" : decision === "reject" ? "Rejected" : "Comments returned (no decision)";
    const summaryHtml = `<div style="font-family:'Segoe UI',Arial,sans-serif;color:#000;line-height:1.5">
      <h2>AINM sign-off recorded</h2>
      <p><strong>${escapeHtml(ainmRef)}</strong> - ${escapeHtml(rowLabel)}</p>
      <p><strong>Decision:</strong> ${escapeHtml(decisionLabel)}</p>
      <p><strong>By:</strong> ${escapeHtml(name)} (${escapeHtml(recipientEmail)})</p>
      ${note ? `<p><strong>Note:</strong> ${escapeHtml(note)}</p>` : ""}
      <p style="font-size:12px;color:#53565A">Recorded ${escapeHtml(new Date(decidedAt).toLocaleString("en-GB"))}</p>
    </div>`;

    const confirmationRecipients = Array.from(new Set([recipientEmail, senderEmail].filter((email) => email.includes("@"))));
    if (confirmationRecipients.length) {
      await resend.emails.send({ from, to: confirmationRecipients, subject: `AINM sign-off recorded: ${ainmRef}`, html: summaryHtml });
    }

    if (senderEmail) {
      await writeNotification({
        recipientEmail: senderEmail,
        sourceModule: "HSE / AINM",
        title: `${decisionLabel}: ${ainmRef}`,
        body: `${rowLabel} - ${name}`,
        link: `/hse/ainm?ainmId=${encodeURIComponent(ainmId)}`,
      });
    }

    return NextResponse.json({ ok: true, status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to record the decision." }, { status: 500 });
  }
}

import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { createClient as createServerClient } from "../../../../src/lib/supabase/server";
import { createItpSignOffCertificate } from "../../../../src/lib/itpSignOffCertificate";

const STORAGE_BUCKET = "project-documents";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("ITP sign-off is not configured.");
  return createClient(url, key);
}
function clean(value: unknown) { return String(value || "").trim(); }
function escapeHtml(value: string) { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;"); }
function codeHash(token: string, code: string) { return createHash("sha256").update(`${token}:${code}`).digest("hex"); }
function uniqueEmails(values: unknown[]) { return Array.from(new Set(values.map(clean).filter((value) => value.includes("@")))); }

function emailClient() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.DOCUMENT_NOTIFICATIONS_FROM_EMAIL;
  if (!apiKey || !from) throw new Error("Email delivery is not configured.");
  return { resend: new Resend(apiKey), from };
}

async function validToken(token: string) {
  const supabase = serviceClient();
  const { data, error } = await supabase.from("project_itp_sign_off_tokens").select("id,request_id,expires_at,used_at,project_itp_sign_off_requests(*)").eq("token", token).maybeSingle();
  if (error || !data) return { supabase, tokenRow: null, signoff: null, problem: "This sign-off link is not valid." };
  if (data.used_at) return { supabase, tokenRow: data, signoff: null, problem: "This sign-off link has already been used." };
  if (new Date(data.expires_at).getTime() < Date.now()) return { supabase, tokenRow: data, signoff: null, problem: "This sign-off link has expired." };
  return { supabase, tokenRow: data, signoff: data.project_itp_sign_off_requests as unknown as Record<string, unknown>, problem: "" };
}

export async function POST(request: Request) {
  try {
    const auth = await createServerClient();
    const { data: authData } = await auth.auth.getUser();
    if (!authData.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { requestId } = await request.json() as { requestId?: string };
    const supabase = serviceClient();
    const { data: signoff, error } = await supabase.from("project_itp_sign_off_requests").select("*").eq("id", clean(requestId)).maybeSingle();
    if (error || !signoff) throw error || new Error("Sign-off request not found.");
    const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
    const { error: tokenError } = await supabase.from("project_itp_sign_off_tokens").insert({ request_id: signoff.id, token });
    if (tokenError) throw tokenError;
    const { resend, from } = emailClient();
    const actionUrl = `${new URL(request.url).origin}/projects/itp-sign-off-action?token=${encodeURIComponent(token)}`;
    const items = Array.isArray(signoff.phase_items) ? signoff.phase_items : [];
    const itemRows = items.slice(0, 40).map((item: Record<string, unknown>) => `<li><strong>${escapeHtml(clean(item.taskNumber) || "Item")}</strong> - ${escapeHtml(clean(item.activityDescription))}</li>`).join("");
    const result = await resend.emails.send({
      from, to: [signoff.recipient_email], subject: `ITP sign-off requested: Phase ${signoff.phase_number}`,
      html: `<div style="font-family:'Segoe UI',Arial,sans-serif;color:#000;line-height:1.5"><h2>ITP phase sign-off request</h2><p><strong>Project:</strong> Baltic Power</p><p><strong>ITP:</strong> ${escapeHtml(signoff.document_name)}</p><p><strong>Phase ${escapeHtml(signoff.phase_number)}:</strong> ${escapeHtml(signoff.phase_title)}</p><p>Please review all ${items.length} extracted phase items before approving or rejecting.</p><ol>${itemRows}</ol><p><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#005670;color:#fff;text-decoration:none;border-radius:10px;padding:12px 18px;font-weight:700">Review and decide</a></p><p style="font-size:12px;color:#53565A">The confirmation page requires a one-time code sent to this mailbox. Your verified email, confirmed name, decision, date and time will be retained as documented evidence.</p></div>`,
    });
    if (result.error) throw new Error(result.error.message);
    await supabase.from("project_itp_sign_off_requests").update({ request_email_id: result.data?.id || null }).eq("id", signoff.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to send sign-off request." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const token = clean(new URL(request.url).searchParams.get("token"));
    const { signoff, problem } = await validToken(token);
    if (problem || !signoff) return NextResponse.json({ error: problem }, { status: 400 });
    return NextResponse.json({ request: signoff });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load sign-off." }, { status: 500 }); }
}

export async function PUT(request: Request) {
  try {
    const { token: rawToken } = await request.json() as { token?: string };
    const token = clean(rawToken);
    const { supabase, signoff, problem } = await validToken(token);
    if (problem || !signoff) return NextResponse.json({ error: problem }, { status: 400 });
    const lastSent = clean(signoff.verification_sent_at);
    if (lastSent && Date.now() - new Date(lastSent).getTime() < 60_000) {
      return NextResponse.json({ error: "A verification code was sent recently. Wait one minute before requesting another." }, { status: 429 });
    }
    const code = String(randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
    const { resend, from } = emailClient();
    const result = await resend.emails.send({
      from, to: [clean(signoff.recipient_email)], subject: "Your Baltic Power ITP sign-off verification code",
      html: `<div style="font-family:'Segoe UI',Arial,sans-serif;color:#000;line-height:1.5"><h2>Mailbox verification</h2><p>Your one-time verification code is:</p><div style="font-size:30px;font-weight:800;letter-spacing:8px;color:#005670">${code}</div><p>This code expires in 10 minutes and is valid only for Phase ${escapeHtml(clean(signoff.phase_number))} of ${escapeHtml(clean(signoff.document_name))}.</p><p>If you did not request this code, do not share it or complete the decision.</p></div>`,
    });
    if (result.error) throw new Error(result.error.message);
    const { error } = await supabase.from("project_itp_sign_off_requests").update({ verification_code_hash: codeHash(token, code), verification_expires_at: expiresAt, verification_sent_at: new Date().toISOString(), verification_email_id: result.data?.id || null }).eq("id", clean(signoff.id)).eq("status", "Pending");
    if (error) throw error;
    return NextResponse.json({ ok: true, message: `A verification code was sent to ${clean(signoff.recipient_email)}.` });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to send the verification code." }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as { token?: string; verificationCode?: string; decision?: string; name?: string; note?: string };
    const token = clean(body.token);
    const code = clean(body.verificationCode);
    const decision = clean(body.decision);
    const name = clean(body.name);
    if (!name) return NextResponse.json({ error: "Enter your full name." }, { status: 400 });
    if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: "Enter the six-digit verification code sent to your email." }, { status: 400 });
    if (!["Approved", "Rejected"].includes(decision)) return NextResponse.json({ error: "Choose Approve or Reject." }, { status: 400 });
    if (decision === "Rejected" && !clean(body.note)) return NextResponse.json({ error: "Enter a rejection reason." }, { status: 400 });
    const { supabase, tokenRow, signoff, problem } = await validToken(token);
    if (problem || !tokenRow || !signoff) return NextResponse.json({ error: problem }, { status: 400 });
    if (!clean(signoff.verification_code_hash) || !clean(signoff.verification_expires_at)) return NextResponse.json({ error: "Request a verification code before submitting your decision." }, { status: 400 });
    if (new Date(clean(signoff.verification_expires_at)).getTime() < Date.now()) return NextResponse.json({ error: "The verification code has expired. Request a new code." }, { status: 400 });
    const expected = Buffer.from(clean(signoff.verification_code_hash), "hex");
    const supplied = Buffer.from(codeHash(token, code), "hex");
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return NextResponse.json({ error: "The verification code is incorrect." }, { status: 400 });

    const now = new Date().toISOString();
    const items = Array.isArray(signoff.phase_items) ? signoff.phase_items as Array<{ taskNumber?: string; activityDescription?: string }> : [];
    const certificate = createItpSignOffCertificate({
      requestId: clean(signoff.id), projectName: "Baltic Power", documentName: clean(signoff.document_name), documentPath: clean(signoff.document_path),
      phaseNumber: clean(signoff.phase_number), phaseTitle: clean(signoff.phase_title), items, recipientEmail: clean(signoff.recipient_email),
      senderName: clean(signoff.sender_name), senderEmail: clean(signoff.sender_email), decision, decisionName: name,
      decisionEmail: clean(signoff.recipient_email), decisionNote: clean(body.note), decidedAt: now, verifiedAt: now,
    });
    const certificateHash = createHash("sha256").update(certificate).digest("hex");
    const sourcePath = clean(signoff.document_path);
    const sourceFolder = sourcePath.includes("/") ? sourcePath.slice(0, sourcePath.lastIndexOf("/")) : `baltic-power/itp-sign-offs/${clean(signoff.id)}`;
    const certificateFileName = `ITP-Sign-Off-${clean(signoff.phase_number).replace(/[^a-zA-Z0-9._-]+/g, "-")}-${clean(signoff.id).slice(0, 8)}.pdf`;
    const certificatePath = `${sourceFolder}/evidence/${certificateFileName}`;
    const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(certificatePath, certificate, { contentType: "application/pdf", upsert: false });
    if (uploadError) throw uploadError;

    const update = { status: decision, decision_name: name, decision_email: clean(signoff.recipient_email), decision_note: clean(body.note) || null, decided_at: now, verified_at: now, verification_code_hash: null, verification_expires_at: null, certificate_file_name: certificateFileName, certificate_path: certificatePath, certificate_sha256: certificateHash, updated_at: now };
    const { data: updated, error: updateError } = await supabase.from("project_itp_sign_off_requests").update(update).eq("id", clean(signoff.id)).eq("status", "Pending").select("id").maybeSingle();
    if (updateError || !updated) {
      await supabase.storage.from(STORAGE_BUCKET).remove([certificatePath]);
      throw updateError || new Error("This sign-off request has already been decided.");
    }
    const { error: usedError } = await supabase.from("project_itp_sign_off_tokens").update({ used_at: now }).eq("id", tokenRow.id).is("used_at", null);
    if (usedError) throw usedError;

    let notificationWarning = "";
    let confirmationId: string | null = null;
    try {
      const { resend, from } = emailClient();
      const recipients = uniqueEmails([signoff.recipient_email, signoff.sender_email]);
      const result = await resend.emails.send({
        from, to: recipients, subject: `ITP Phase ${clean(signoff.phase_number)} ${decision}`,
        html: `<div style="font-family:'Segoe UI',Arial,sans-serif;color:#000;line-height:1.5"><h2>ITP sign-off evidence recorded</h2><p><strong>Project:</strong> Baltic Power</p><p><strong>ITP:</strong> ${escapeHtml(clean(signoff.document_name))}</p><p><strong>Phase:</strong> ${escapeHtml(clean(signoff.phase_number))} - ${escapeHtml(clean(signoff.phase_title))}</p><p><strong>Decision:</strong> ${escapeHtml(decision)}</p><p><strong>Decision by:</strong> ${escapeHtml(name)} (${escapeHtml(clean(signoff.recipient_email))})</p><p><strong>Date/time:</strong> ${escapeHtml(new Date(now).toLocaleString("en-GB", { timeZone: "Europe/London" }))} Europe/London</p><p><strong>Evidence SHA-256:</strong> ${certificateHash}</p><p>The attached PDF is the system-generated sign-off certificate retained by the Enshore IMS.</p></div>`,
        attachments: [{ filename: certificateFileName, content: Buffer.from(certificate) }],
      });
      if (result.error) throw new Error(result.error.message);
      confirmationId = result.data?.id || null;
      await supabase.from("project_itp_sign_off_requests").update({ confirmation_email_id: confirmationId }).eq("id", clean(signoff.id));
    } catch (error) {
      notificationWarning = error instanceof Error ? error.message : "Confirmation email could not be sent.";
    }

    return NextResponse.json({ ok: true, message: `ITP phase ${decision.toLowerCase()}. The verified decision and PDF certificate are now recorded in the IMS.${notificationWarning ? ` Warning: ${notificationWarning}` : ""}`, certificatePath, confirmationEmailId: confirmationId });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to record sign-off." }, { status: 500 }); }
}

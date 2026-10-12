import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export const INVITE_VALID_DAYS = 30;
// After the first click the link keeps working for a short retry window, then
// the person is expected to have finished setting up (or to use Forgot password).
export const INVITE_RETRY_WINDOW_HOURS = 24;

export type InviteKind = "invite" | "password";

export function getSiteOrigin(request: Request) {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (configuredSiteUrl) return configuredSiteUrl.replace(/\/+$/, "");
  if (vercelUrl) return vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`;
  return (request.headers.get("origin") || "").replace(/\/+$/, "");
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

type InviteDetails = {
  service: SupabaseClient;
  origin: string;
  email: string;
  name: string;
  role: string;
  department: string;
  personId?: string;
  actorEmail: string;
};

// Creates a fresh token for the person (replacing any earlier ones) and returns
// the emailed link. Nothing is sent to Supabase Auth until the person clicks.
export async function createInviteUrl(details: InviteDetails): Promise<{ url: string; error: null } | { url: ""; error: { message: string } }> {
  if (!details.origin) return { url: "", error: { message: "The site URL is not configured, so an invite link cannot be created." } };

  await details.service.from("ims_invite_tokens").delete().eq("email", details.email);

  const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + INVITE_VALID_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await details.service.from("ims_invite_tokens").insert({
    token,
    email: details.email,
    name: details.name || null,
    system_role: details.role || null,
    department: details.department || null,
    person_id: details.personId || null,
    created_by: details.actorEmail,
    expires_at: expiresAt,
  });
  if (error) {
    const missing = /relation|does not exist|schema cache/i.test(error.message);
    return { url: "", error: { message: missing ? "The invite table is missing. Run scripts/sql/ims_invite_tokens.sql in Supabase." : error.message } };
  }
  return { url: `${details.origin}/invite?token=${encodeURIComponent(token)}`, error: null };
}

export async function sendInviteEmail(args: { to: string; name: string; url: string; kind: InviteKind }): Promise<{ error: null | { message: string } }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.DOCUMENT_NOTIFICATIONS_FROM_EMAIL;
  if (!apiKey || !from) return { error: { message: "Email delivery is not configured." } };

  const isInvite = args.kind === "invite";
  const headline = isInvite ? "You have been invited to the Enshore IMS" : "Set your Enshore IMS password";
  const intro = isInvite
    ? "You have been given access to the Enshore Integrated Management System. Use the button below to create your password and sign in."
    : "Use the button below to set a new password for your Enshore Integrated Management System account.";
  const greetingName = escapeHtml(args.name || "there");
  const safeUrl = escapeHtml(args.url);

  const html = `<div style="font-family:'Segoe UI',Arial,sans-serif;color:#000000;line-height:1.5;max-width:560px">
    <div style="background:#005670;color:#ffffff;padding:18px 24px;border-radius:12px 12px 0 0">
      <div style="font-size:22px;font-weight:700;letter-spacing:0.06em">ENSHORE</div>
      <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;color:#63B1BC;text-transform:uppercase">Integrated Management System</div>
    </div>
    <div style="border:1px solid #D0D0CE;border-top:none;padding:24px;border-radius:0 0 12px 12px">
      <h2 style="margin:0 0 12px;color:#005670;font-size:20px">${escapeHtml(headline)}</h2>
      <p>Hi ${greetingName},</p>
      <p>${escapeHtml(intro)}</p>
      <p style="margin:24px 0"><a href="${safeUrl}" style="display:inline-block;background:#005670;color:#ffffff;text-decoration:none;border-radius:10px;padding:13px 22px;font-weight:700">${isInvite ? "Set up my IMS access" : "Set my password"}</a></p>
      <p style="font-size:13px;color:#53565A">This link is valid for ${INVITE_VALID_DAYS} days. Once you have finished setting up, sign in at any time using your email and password. If the button does not work, copy this address into your browser:</p>
      <p style="font-size:12px;color:#53565A;word-break:break-all">${safeUrl}</p>
    </div>
  </div>`;

  try {
    const result = await new Resend(apiKey).emails.send({
      from,
      to: [args.to],
      subject: isInvite ? "You have been invited to the Enshore IMS" : "Set your Enshore IMS password",
      html,
    });
    if (result.error) return { error: { message: result.error.message } };
    return { error: null };
  } catch (error) {
    return { error: { message: error instanceof Error ? error.message : "The invite email could not be sent." } };
  }
}

// Convenience used by the admin routes: create the long-lived link and email it.
export async function issueInviteEmail(details: InviteDetails & { kind: InviteKind }): Promise<{ error: null | { message: string } }> {
  const created = await createInviteUrl(details);
  if (created.error) return { error: created.error };
  return sendInviteEmail({ to: details.email, name: details.name, url: created.url, kind: details.kind });
}

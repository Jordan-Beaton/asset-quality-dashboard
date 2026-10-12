import { NextResponse } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";
import { getSiteOrigin, INVITE_RETRY_WINDOW_HOURS } from "../../../src/lib/inviteLinks";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Invites are not configured.");
  return createClient(url, key);
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "";
  return `${local.slice(0, 1)}${"*".repeat(Math.max(1, Math.min(local.length - 1, 6)))}@${domain}`;
}

async function loadInvite(token: string) {
  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("ims_invite_tokens")
    .select("id,email,name,system_role,department,expires_at,first_used_at")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) return { supabase, invite: null, problem: "This invite link is not valid. Ask an IMS Admin to send you a new one." };
  if (new Date(data.expires_at).getTime() < Date.now()) {
    return { supabase, invite: null, problem: "This invite link has expired. Ask an IMS Admin to send you a new one." };
  }
  if (data.first_used_at && Date.now() > new Date(data.first_used_at).getTime() + INVITE_RETRY_WINDOW_HOURS * 60 * 60 * 1000) {
    return {
      supabase,
      invite: null,
      problem: "This invite link has already been used. If you finished setting up, sign in with your email and password. If you forgot your password, use Forgot password on the sign-in page, or ask an IMS Admin for a new invite.",
    };
  }
  return { supabase, invite: data, problem: "" };
}

export async function GET(request: Request) {
  try {
    const token = clean(new URL(request.url).searchParams.get("token"));
    if (!token) return NextResponse.json({ error: "This invite link is missing its secure code." }, { status: 400 });
    const { invite, problem } = await loadInvite(token);
    if (problem || !invite) return NextResponse.json({ error: problem }, { status: 400 });
    return NextResponse.json({ name: invite.name || "", maskedEmail: maskEmail(invite.email) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to check this invite link." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string };
    const token = clean(body.token);
    if (!token) return NextResponse.json({ error: "This invite link is missing its secure code." }, { status: 400 });

    const { supabase, invite, problem } = await loadInvite(token);
    if (problem || !invite) return NextResponse.json({ error: problem }, { status: 400 });

    const email = clean(invite.email).toLowerCase();

    const escapedEmail = email.replace(/[\\%_]/g, "\\$&");
    const { data: people } = await supabase.from("people").select("active,access_status").ilike("email", escapedEmail).limit(1);
    const person = people?.[0];
    if (person && (person.active === false || clean(person.access_status).toLowerCase() === "deactivated")) {
      return NextResponse.json({ error: "This IMS account has been deactivated. Contact an IMS Admin." }, { status: 403 });
    }

    const origin = getSiteOrigin(request);
    const redirectTo = origin ? `${origin}/login?mode=invite` : undefined;
    const authUsers = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const authUser = authUsers.data.users.find((user: User) => (user.email || "").toLowerCase() === email);

    const linkResult = authUser
      ? await supabase.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo } })
      : await supabase.auth.admin.generateLink({
          type: "invite",
          email,
          options: { data: { name: invite.name || "", system_role: invite.system_role || "Viewer", department: invite.department || "" }, redirectTo },
        });

    if (linkResult.error) return NextResponse.json({ error: linkResult.error.message }, { status: 400 });
    const properties = (linkResult.data as { properties?: { action_link?: string } } | null)?.properties;
    const actionLink = clean(properties?.action_link);
    if (!actionLink) return NextResponse.json({ error: "A sign-in link could not be created. Ask an IMS Admin to send a new invite." }, { status: 400 });

    if (!invite.first_used_at) {
      await supabase.from("ims_invite_tokens").update({ first_used_at: new Date().toISOString() }).eq("id", invite.id);
    }

    return NextResponse.json({ url: actionLink });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to continue." }, { status: 500 });
  }
}

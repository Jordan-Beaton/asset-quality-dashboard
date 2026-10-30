import { NextResponse, after } from "next/server";
import { getSiteOrigin } from "../../../../src/lib/inviteLinks";
import { keyFingerprint } from "../../../../src/lib/speakUpCrypto";
import {
  SpeakUpError,
  failFrom,
  logAdminAudit,
  notifyHandlers,
  requireImsAdmin,
  requireSameOrigin,
  serviceClient,
  text,
  validPublicKey,
} from "../../../../src/lib/speakUpServer";

export const runtime = "nodejs";
export const preferredRegion = "arn1";
export const maxDuration = 30;

const ROLES = ["handler", "independent"];

type HandlerRecord = {
  id: string;
  email: string;
  name: string;
  roles: string[];
  approved_roles: string[];
  active: boolean;
  public_key: JsonWebKey | null;
  keys_created_at: string | null;
};

function cleanRoles(value: unknown) {
  const roles = Array.isArray(value) ? ROLES.filter((role) => value.includes(role)) : [];
  if (!roles.length) throw new SpeakUpError("Choose at least one role.");
  return roles;
}

// An administrator manages who is on the list, but cannot approve anyone to receive reports: that needs a handler who
// is already approved for the role. Anything an administrator changes starts as "waiting for approval", and every
// handler is emailed about it and can see it in the activity record on their Handlers tab.
export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  try {
    requireSameOrigin(request);
    const supabase = serviceClient();
    const { email: adminEmail } = await requireImsAdmin(supabase);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw new SpeakUpError("The request could not be read.");

    switch (body.action) {
      case "list": {
        const { data, error } = await supabase.from("speak_up_handlers").select("id,email,name,roles,approved_roles,active,public_key,keys_created_at").order("name");
        if (error) failFrom(error);
        const handlers = await Promise.all(((data || []) as HandlerRecord[]).map(async (row) => ({
          id: row.id,
          email: row.email,
          name: row.name,
          roles: row.roles,
          approvedRoles: row.approved_roles,
          active: row.active,
          keySetUp: validPublicKey(row.public_key),
          fingerprint: validPublicKey(row.public_key) ? await keyFingerprint(row.public_key) : null,
          keysCreatedAt: row.keys_created_at,
        })));
        const usable = (role: string) => handlers.filter((entry) => entry.active && entry.keySetUp && entry.roles.includes(role) && entry.approvedRoles.includes(role)).length;
        // the live address of the IMS, so the poster's QR code points at the real site and never at a developer's machine
        return NextResponse.json({ handlers, ready: { handler: usable("handler"), independent: usable("independent") }, siteUrl: getSiteOrigin(request) }, { headers });
      }

      case "add": {
        const name = text(body.name, 80).trim();
        const email = text(body.email, 200).trim().toLowerCase();
        if (name.length < 2) throw new SpeakUpError("Enter the person's name.");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new SpeakUpError("Enter a valid work email address. It must match the address they sign in to the IMS with.");
        const roles = cleanRoles(body.roles);
        const { error } = await supabase.from("speak_up_handlers").insert({ email, name, roles, approved_roles: [], active: true });
        if (error) {
          if (/duplicate|unique/i.test(error.message)) throw new SpeakUpError("That email address is already on the handler list. Reactivate them instead if they were removed.", 409);
          failFrom(error);
        }
        await logAdminAudit(supabase, adminEmail, "handler_added", `${name} (${roles.join(", ")}), waiting for approval`);
        after(() => notifyHandlers(supabase, "Speak Up: a handler has been added", `${name} was added to the Speak Up handler list by ${adminEmail}. They will not receive reports until a current handler approves them.`));
        return NextResponse.json({ ok: true }, { headers });
      }

      case "update-roles": {
        const id = text(body.id, 40);
        const roles = cleanRoles(body.roles);
        const { data: existing } = await supabase.from("speak_up_handlers").select("name,approved_roles").eq("id", id).maybeSingle();
        if (!existing) throw new SpeakUpError("That handler could not be found.", 404);
        // keep approval only for roles they already held and were approved for; any new role must be approved afresh
        const approved = ((existing.approved_roles || []) as string[]).filter((role) => roles.includes(role));
        const { error } = await supabase.from("speak_up_handlers").update({ roles, approved_roles: approved }).eq("id", id);
        if (error) failFrom(error);
        await logAdminAudit(supabase, adminEmail, "handler_roles_changed", `${existing.name}: ${roles.join(", ")}${roles.some((role) => !approved.includes(role)) ? " (waiting for approval)" : ""}`);
        after(() => notifyHandlers(supabase, "Speak Up: a handler's role has changed", `${existing.name}'s Speak Up role was changed by ${adminEmail}. Any new role needs a current handler's approval before it takes effect.`));
        return NextResponse.json({ ok: true }, { headers });
      }

      case "set-active": {
        const id = text(body.id, 40);
        const active = body.active === true;
        const { data: existing } = await supabase.from("speak_up_handlers").select("name").eq("id", id).maybeSingle();
        if (!existing) throw new SpeakUpError("That handler could not be found.", 404);
        if (!active) {
          // never silently strand a case: if this person is the only one who can read it, say so first
          const { data: mine } = await supabase.from("speak_up_case_keys").select("case_id").eq("handler_id", id);
          const caseIds = (mine || []).map((row) => row.case_id as string);
          if (caseIds.length) {
            const { data: holders } = await supabase.from("speak_up_case_keys").select("case_id").in("case_id", caseIds);
            const counts = new Map<string, number>();
            for (const row of holders || []) counts.set(row.case_id as string, (counts.get(row.case_id as string) || 0) + 1);
            const only = caseIds.filter((caseId) => counts.get(caseId) === 1).length;
            if (only && body.force !== true) {
              throw new SpeakUpError(`${existing.name} is the only person who can read ${only} case${only === 1 ? "" : "s"}. If they are removed, nobody will be able to open ${only === 1 ? "it" : "them"}. Ask them to share ${only === 1 ? "it" : "them"} with another handler first, or confirm to remove them anyway.`, 409, "sole-holder");
            }
          }
        }
        // someone brought back after being removed must be approved again, so an old approval cannot be reused
        const { error } = await supabase.from("speak_up_handlers").update(active ? { active, approved_roles: [], approved_by: null, approved_at: null } : { active }).eq("id", id);
        if (error) failFrom(error);
        // a removed handler's cases go back to the unassigned list so another handler picks them up
        if (!active) await supabase.from("speak_up_cases").update({ assigned_to: null, assigned_at: null }).eq("assigned_to", id);
        await logAdminAudit(supabase, adminEmail, active ? "handler_reactivated" : "handler_removed", `${existing.name}${active ? ", waiting for approval" : ""}`);
        after(() => notifyHandlers(supabase, active ? "Speak Up: a handler has been reactivated" : "Speak Up: a handler has been removed", `${existing.name} was ${active ? "reactivated" : "removed from the Speak Up handler list"} by ${adminEmail}.${active ? " They need a current handler's approval before they receive reports." : ""}`));
        return NextResponse.json({ ok: true }, { headers });
      }

      case "reset-key": {
        // For a handler who has lost their passphrase. Their old key is abandoned: they set a new one and need approving again.
        const id = text(body.id, 40);
        const { data: existing } = await supabase.from("speak_up_handlers").select("name,public_key").eq("id", id).maybeSingle();
        if (!existing) throw new SpeakUpError("That handler could not be found.", 404);
        if (!existing.public_key) throw new SpeakUpError("They have not set up a key, so there is nothing to reset.");
        const { data: mine } = await supabase.from("speak_up_case_keys").select("case_id").eq("handler_id", id);
        const caseIds = (mine || []).map((row) => row.case_id as string);
        if (caseIds.length) {
          const { data: holders } = await supabase.from("speak_up_case_keys").select("case_id").in("case_id", caseIds);
          const counts = new Map<string, number>();
          for (const row of holders || []) counts.set(row.case_id as string, (counts.get(row.case_id as string) || 0) + 1);
          const only = caseIds.filter((caseId) => counts.get(caseId) === 1).length;
          if (only && body.force !== true) {
            throw new SpeakUpError(`${existing.name} is the only person who can open ${only} case${only === 1 ? "" : "s"}. Their old key cannot be recovered, so ${only === 1 ? "it" : "they"} will stay locked for good. Confirm to reset anyway.`, 409, "sole-holder");
          }
        }
        const { error } = await supabase.from("speak_up_handlers").update({ public_key: null, encrypted_private_key: null, keys_created_at: null, approved_roles: [], approved_by: null, approved_at: null }).eq("id", id);
        if (error) failFrom(error);
        // the locked copies made for the old key are of no further use to anyone
        await supabase.from("speak_up_case_keys").delete().eq("handler_id", id);
        await supabase.from("speak_up_cases").update({ assigned_to: null, assigned_at: null }).eq("assigned_to", id);
        await logAdminAudit(supabase, adminEmail, "handler_key_reset", `${existing.name}, waiting to set a new key and be approved`);
        after(() => notifyHandlers(supabase, "Speak Up: a handler's key has been reset", `${existing.name}'s Speak Up key was reset by ${adminEmail}. They need to set a new key and be approved again before they receive reports.`));
        return NextResponse.json({ ok: true }, { headers });
      }

      default:
        throw new SpeakUpError("Unknown request.");
    }
  } catch (error) {
    if (error instanceof SpeakUpError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    return NextResponse.json({ error: "The request could not be completed." }, { status: 500 });
  }
}

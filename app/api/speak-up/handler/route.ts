import { NextResponse, after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SPEAK_UP_EVIDENCE_BUCKET,
  SPEAK_UP_RETENTION_MONTHS,
  SPEAK_UP_STATUSES,
  type SpeakUpOutcome,
} from "../../../../src/lib/speakUpConfig";
import { getSiteOrigin } from "../../../../src/lib/inviteLinks";
import { keyFingerprint } from "../../../../src/lib/speakUpCrypto";
import {
  SpeakUpError,
  addMonths,
  b64,
  caseHolderIds,
  failFrom,
  logAudit,
  mailCaseHandlers,
  mfaRequired,
  notifyHandlers,
  recipientsFor,
  requireHandler,
  requireSameOrigin,
  serviceClient,
  text,
  validProtectedKey,
  validPublicKey,
  type HandlerRole,
  type HandlerRow,
} from "../../../../src/lib/speakUpServer";
import { createClient as createServerSupabaseClient } from "../../../../src/lib/supabase/server";

export const runtime = "nodejs";
export const preferredRegion = "arn1";
export const maxDuration = 30;

const CIPHER_MAX = 60_000;
const ROLES: HandlerRole[] = ["handler", "independent"];

type CaseRow = {
  id: string;
  reference: string;
  category: string;
  involves_senior: boolean;
  reporter_mode: string;
  reporter_group: string | null;
  status: string;
  received_at: string;
  acknowledge_by: string;
  feedback_by: string;
  acknowledged_at: string | null;
  outcome_shared_at: string | null;
  closed_at: string | null;
  outcome: string | null;
  retention_until: string | null;
  body_cipher: string;
  body_iv: string;
  contact_cipher: string | null;
  contact_iv: string | null;
  assigned_to: string | null;
  assigned_at: string | null;
};

const CASE_COLUMNS = "id,reference,category,involves_senior,reporter_mode,reporter_group,status,received_at,acknowledge_by,feedback_by,acknowledged_at,outcome_shared_at,closed_at,outcome,retention_until,body_cipher,body_iv,contact_cipher,contact_iv,assigned_to,assigned_at";

function today() {
  return new Date().toISOString().slice(0, 10);
}

// A handler may only act on a case whose key has been wrapped for them, and only while their role still covers it.
async function ownCase(supabase: SupabaseClient, handler: HandlerRow, caseId: unknown) {
  const id = String(caseId || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new SpeakUpError("That case could not be found.", 404);
  const { data: key, error } = await supabase.from("speak_up_case_keys").select("wrapped_key").eq("case_id", id).eq("handler_id", handler.id).maybeSingle();
  if (error) failFrom(error);
  if (!key) throw new SpeakUpError("That case could not be found.", 404);
  const { data: found, error: caseError } = await supabase.from("speak_up_cases").select(CASE_COLUMNS).eq("id", id).maybeSingle();
  if (caseError) failFrom(caseError);
  if (!found) throw new SpeakUpError("That case could not be found.", 404);
  const caseRow = found as CaseRow;
  if (!handler.roles.includes(caseRow.involves_senior ? "independent" : "handler")) throw new SpeakUpError("That case could not be found.", 404);
  return { caseRow, wrappedKey: key.wrapped_key as string };
}

function summary(row: CaseRow, names: Map<string, string>) {
  return {
    assignedTo: row.assigned_to,
    assignedToName: row.assigned_to ? names.get(row.assigned_to) || null : null,
    id: row.id,
    reference: row.reference,
    category: row.category,
    involvesSenior: row.involves_senior,
    mode: row.reporter_mode,
    status: row.status,
    receivedAt: row.received_at,
    acknowledgeBy: row.acknowledge_by,
    feedbackBy: row.feedback_by,
    acknowledgedAt: row.acknowledged_at,
    outcomeSharedAt: row.outcome_shared_at,
    closedAt: row.closed_at,
    outcome: row.outcome,
    retentionUntil: row.retention_until,
  };
}

type Wrap = { handlerId?: string; wrappedKey?: string };

async function activeHandlers(supabase: SupabaseClient) {
  const { data, error } = await supabase.from("speak_up_handlers").select("id,name,roles,approved_roles,public_key").eq("active", true).order("name");
  if (error) failFrom(error);
  return (data || []) as Array<{ id: string; name: string; roles: string[]; approved_roles: string[]; public_key: JsonWebKey | null }>;
}

function checkWraps(wraps: Wrap[], allowedIds: Set<string>) {
  const list = wraps.map((wrap) => ({ handlerId: String(wrap.handlerId), wrappedKey: b64(wrap.wrappedKey, 1000, "key") }));
  if (!list.length || list.some((wrap) => !allowedIds.has(wrap.handlerId))) throw new SpeakUpError("The case could not be shared with those people.");
  return list;
}

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  try {
    requireSameOrigin(request);
    const supabase = serviceClient();
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw new SpeakUpError("The request could not be read.");

    // "me" must work before the second factor is confirmed, so the screen can ask for it. The protected private key is
    // only handed over once that factor has passed, so a stolen IMS password alone cannot be used to attack it.
    if (body.action === "me") {
      const { handler } = await requireHandler(supabase, { skipMfa: true });
      const userClient = await createServerSupabaseClient();
      const { data: level } = await userClient.auth.mfa.getAuthenticatorAssuranceLevel();
      const verified = !mfaRequired() || level?.currentLevel === "aal2";
      return NextResponse.json({
        id: handler.id,
        name: handler.name,
        email: handler.email,
        roles: handler.roles,
        approvedRoles: handler.approved_roles,
        publicKey: handler.public_key,
        encryptedPrivateKey: verified ? handler.encrypted_private_key : null,
        mfaRequired: mfaRequired(),
        mfaLevel: level?.currentLevel || "aal1",
      }, { headers });
    }

    const { handler } = await requireHandler(supabase);

    switch (body.action) {
      case "setup-keys": {
        if (handler.public_key) throw new SpeakUpError("Your key is already set up.");
        if (!validPublicKey(body.publicKey) || !validProtectedKey(body.encryptedPrivateKey)) throw new SpeakUpError("The key details are not valid.");
        // The first person in a group has nobody to approve them, so they are approved automatically.
        // Everyone after that needs a handler already approved for the role.
        const others = await activeHandlers(supabase);
        const approved = handler.roles.filter((role) => !others.some((person) => person.id !== handler.id && person.approved_roles.includes(role)));
        const { error } = await supabase.from("speak_up_handlers").update({
          public_key: body.publicKey,
          encrypted_private_key: body.encryptedPrivateKey,
          keys_created_at: new Date().toISOString(),
          approved_roles: approved,
          approved_by: approved.length ? "first handler in the group" : null,
          approved_at: approved.length ? new Date().toISOString() : null,
        }).eq("id", handler.id);
        if (error) failFrom(error);
        const waiting = handler.roles.filter((role) => !approved.includes(role));
        await logAudit(supabase, { caseId: null, reference: "ADMIN", handler, type: "key_set_up", detail: waiting.length ? `Waiting for approval: ${waiting.join(", ")}` : "Approved automatically as the first in the group" });
        after(() => notifyHandlers(supabase, "Speak Up: a handler has set up their key", `${handler.name} has set up a key for Speak Up${waiting.length ? " and is waiting for approval" : ""}.`));
        return NextResponse.json({ ok: true, waitingForApproval: waiting }, { headers });
      }

      case "handler-keys": {
        const people = await activeHandlers(supabase);
        return NextResponse.json({
          handlers: people.map((person) => ({ id: person.id, name: person.name, roles: person.roles, approvedRoles: person.approved_roles, publicKey: validPublicKey(person.public_key) ? person.public_key : null })),
        }, { headers });
      }

      case "pending": {
        // people waiting to be approved for a role the signed-in handler is themselves approved for
        const people = await activeHandlers(supabase);
        const mine = handler.approved_roles;
        const items = [];
        for (const person of people) {
          if (person.id === handler.id || !validPublicKey(person.public_key)) continue;
          const roles = person.roles.filter((role) => !person.approved_roles.includes(role) && mine.includes(role));
          if (roles.length) items.push({ id: person.id, name: person.name, roles, fingerprint: await keyFingerprint(person.public_key) });
        }
        return NextResponse.json({ pending: items }, { headers });
      }

      case "approve": {
        const role = ROLES.find((entry) => entry === body.role);
        if (!role) throw new SpeakUpError("That role is not valid.");
        if (!handler.approved_roles.includes(role)) throw new SpeakUpError("Only a handler already approved for that role can approve someone for it.", 403);
        const targetId = text(body.handlerId, 40);
        if (targetId === handler.id) throw new SpeakUpError("You cannot approve yourself. Another handler needs to do it.", 403);
        const people = await activeHandlers(supabase);
        const person = people.find((entry) => entry.id === targetId);
        if (!person || !validPublicKey(person.public_key) || !person.roles.includes(role)) throw new SpeakUpError("That person is not waiting for approval for this role.", 404);
        if (person.approved_roles.includes(role)) throw new SpeakUpError("They are already approved for that role.");
        const { error } = await supabase.from("speak_up_handlers").update({ approved_roles: [...person.approved_roles, role], approved_by: handler.name, approved_at: new Date().toISOString() }).eq("id", person.id);
        if (error) failFrom(error);
        await logAudit(supabase, { caseId: null, reference: "ADMIN", handler, type: "handler_approved", detail: `${person.name} approved for ${role === "independent" ? "the independent role" : "the handler role"}` });
        after(() => notifyHandlers(supabase, "Speak Up: a handler has been approved", `${person.name} was approved by ${handler.name} to receive Speak Up reports as ${role === "independent" ? "an independent handler" : "a case handler"}.`));
        return NextResponse.json({ ok: true }, { headers });
      }

      case "admin-log": {
        const { data, error } = await supabase.from("speak_up_audit").select("id,actor_name,event_type,detail,created_at").eq("reference", "ADMIN").order("created_at", { ascending: false }).limit(30);
        if (error) failFrom(error);
        return NextResponse.json({ entries: (data || []).map((row) => ({ id: row.id, actor: row.actor_name, type: row.event_type, detail: row.detail, at: row.created_at })) }, { headers });
      }

      case "list": {
        const { data: keys, error } = await supabase.from("speak_up_case_keys").select("case_id").eq("handler_id", handler.id);
        if (error) failFrom(error);
        const ids = (keys || []).map((row) => row.case_id as string);
        if (!ids.length) return NextResponse.json({ cases: [] }, { headers });
        const { data, error: caseError } = await supabase.from("speak_up_cases").select(CASE_COLUMNS).in("id", ids).order("received_at", { ascending: false });
        if (caseError) failFrom(caseError);
        // whose turn is it: the latest message in each case, so a new reporter reply can be flagged
        const { data: latest, error: messageError } = await supabase.from("speak_up_messages").select("case_id,author_role,created_at").in("case_id", ids).order("created_at", { ascending: true }).limit(20000);
        if (messageError) failFrom(messageError);
        const lastRole = new Map<string, string>();
        for (const entry of latest || []) lastRole.set(entry.case_id as string, entry.author_role as string);
        const visible = ((data || []) as CaseRow[]).filter((row) => handler.roles.includes(row.involves_senior ? "independent" : "handler"));
        const names = new Map((await activeHandlers(supabase)).map((person) => [person.id, person.name] as [string, string]));
        return NextResponse.json({ cases: visible.map((row) => ({ ...summary(row, names), lastMessageRole: lastRole.get(row.id) || null })), today: today() }, { headers });
      }

      case "get": {
        const { caseRow, wrappedKey } = await ownCase(supabase, handler, body.caseId);
        const [{ data: messages }, { data: evidence }, { data: audit }, { data: keyRows }] = await Promise.all([
          supabase.from("speak_up_messages").select("id,author_role,author_handler_id,cipher,iv,created_at").eq("case_id", caseRow.id).order("created_at", { ascending: true }),
          supabase.from("speak_up_evidence").select("id,size_bytes,file_iv,name_cipher,name_iv,created_at").eq("case_id", caseRow.id).order("created_at", { ascending: true }),
          supabase.from("speak_up_audit").select("id,actor_name,event_type,detail,created_at").eq("case_id", caseRow.id).order("created_at", { ascending: true }),
          supabase.from("speak_up_case_keys").select("handler_id").eq("case_id", caseRow.id),
        ]);
        const people = await activeHandlers(supabase);
        const withAccess = new Set((keyRows || []).map((row) => row.handler_id as string));
        const route: HandlerRole = caseRow.involves_senior ? "independent" : "handler";
        const eligible = (await recipientsFor(supabase, route)).filter((person) => !withAccess.has(person.id));
        // note the opening, but not on every refresh
        const recentlyOpened = (audit || []).some((entry) => entry.event_type === "opened" && entry.actor_name === handler.name && Date.now() - new Date(entry.created_at as string).getTime() < 30 * 60 * 1000);
        if (!recentlyOpened) await logAudit(supabase, { caseId: caseRow.id, reference: caseRow.reference, handler, type: "opened" });
        return NextResponse.json({
          case: summary(caseRow, new Map(people.map((person) => [person.id, person.name] as [string, string]))),
          wrappedKey,
          bodyCipher: caseRow.body_cipher,
          bodyIv: caseRow.body_iv,
          contactCipher: caseRow.contact_cipher,
          contactIv: caseRow.contact_iv,
          reporterGroup: caseRow.reporter_group,
          messages: (messages || []).map((m) => ({ id: m.id, authorRole: m.author_role, authorName: people.find((person) => person.id === m.author_handler_id)?.name || null, cipher: m.cipher, iv: m.iv, createdAt: m.created_at })),
          evidence: (evidence || []).map((e) => ({ id: e.id, size: e.size_bytes, fileIv: e.file_iv, nameCipher: e.name_cipher, nameIv: e.name_iv, createdAt: e.created_at })),
          audit: (audit || []).map((a) => ({ id: a.id, actor: a.actor_name, type: a.event_type, detail: a.detail, at: a.created_at })),
          access: people.filter((person) => withAccess.has(person.id)).map((person) => ({ id: person.id, name: person.name })),
          eligible: eligible.map((person) => ({ id: person.id, name: person.name, publicKey: person.jwk })),
        }, { headers });
      }

      case "assign": {
        const { caseRow } = await ownCase(supabase, handler, body.caseId);
        if (caseRow.status === "Closed") throw new SpeakUpError("This case is closed. Reopen it before assigning it.");
        const targetId = body.handlerId ? text(body.handlerId, 40) : null;
        let targetName: string | null = null;
        if (targetId) {
          // only someone who can already open the case can look after it
          const people = await activeHandlers(supabase);
          const person = people.find((entry) => entry.id === targetId);
          const holders = new Set(await caseHolderIds(supabase, caseRow.id));
          if (!person || !holders.has(targetId) || !person.roles.includes(caseRow.involves_senior ? "independent" : "handler")) throw new SpeakUpError("They cannot open this case. Share it with them first.");
          targetName = person.name;
        }
        const { error } = await supabase.from("speak_up_cases").update({ assigned_to: targetId, assigned_at: targetId ? new Date().toISOString() : null }).eq("id", caseRow.id);
        if (error) failFrom(error);
        await logAudit(supabase, { caseId: caseRow.id, reference: caseRow.reference, handler, type: targetId ? "assigned" : "unassigned", detail: targetId ? `Assigned to ${targetName}` : "Returned to the unassigned list" });
        const origin = getSiteOrigin(request);
        const reference = caseRow.reference;
        if (targetId && targetId !== handler.id) {
          after(() => mailCaseHandlers(supabase, [targetId], origin, `Speak Up: ${reference} has been assigned to you`, `${handler.name} has assigned case ${reference} to you.`));
        } else if (!targetId) {
          const caseId = caseRow.id;
          after(async () => mailCaseHandlers(supabase, (await caseHolderIds(supabase, caseId)).filter((id) => id !== handler.id), origin, `Speak Up: ${reference} needs a handler`, `${handler.name} has returned case ${reference} to the unassigned list. Please open Speak Up cases and assign it.`));
        }
        return NextResponse.json({ ok: true }, { headers });
      }

      case "reply": {
        const { caseRow } = await ownCase(supabase, handler, body.caseId);
        if (caseRow.status === "Closed") throw new SpeakUpError("This case is closed. Reopen it to send a message.");
        const { error } = await supabase.from("speak_up_messages").insert({ case_id: caseRow.id, author_role: "handler", author_handler_id: handler.id, cipher: b64(body.cipher, CIPHER_MAX, "message"), iv: b64(body.iv, 40, "message") });
        if (error) failFrom(error);
        const patch: Record<string, unknown> = {};
        if (["Received", "Acknowledged", "Investigating"].includes(caseRow.status)) patch.status = "Awaiting reporter";
        if (!caseRow.acknowledged_at) patch.acknowledged_at = new Date().toISOString();
        if (Object.keys(patch).length) await supabase.from("speak_up_cases").update(patch).eq("id", caseRow.id);
        await logAudit(supabase, { caseId: caseRow.id, reference: caseRow.reference, handler, type: "replied" });
        return NextResponse.json({ ok: true }, { headers });
      }

      case "set-status": {
        const { caseRow } = await ownCase(supabase, handler, body.caseId);
        const status = SPEAK_UP_STATUSES.find((entry) => entry === body.status);
        if (!status) throw new SpeakUpError("That status is not valid.");
        const now = new Date();
        const patch: Record<string, unknown> = { status };
        if (status === "Acknowledged" && !caseRow.acknowledged_at) patch.acknowledged_at = now.toISOString();
        if (status === "Outcome shared") patch.outcome_shared_at = now.toISOString();
        if (status === "Closed") {
          const outcome = body.outcome as SpeakUpOutcome;
          if (typeof outcome !== "string" || !Object.hasOwn(SPEAK_UP_RETENTION_MONTHS, outcome)) throw new SpeakUpError("Say what the outcome was before closing the case.");
          patch.outcome = outcome;
          patch.closed_at = now.toISOString();
          patch.retention_until = addMonths(now, SPEAK_UP_RETENTION_MONTHS[outcome]).toISOString().slice(0, 10);
          if (!caseRow.acknowledged_at) patch.acknowledged_at = now.toISOString();
        } else if (caseRow.status === "Closed") {
          patch.closed_at = null;
          patch.outcome = null;
          patch.retention_until = null;
        }
        const { error } = await supabase.from("speak_up_cases").update(patch).eq("id", caseRow.id);
        if (error) failFrom(error);
        await logAudit(supabase, { caseId: caseRow.id, reference: caseRow.reference, handler, type: caseRow.status === "Closed" && status !== "Closed" ? "reopened" : "status_changed", detail: `${caseRow.status} to ${status}${status === "Closed" ? ` (${patch.outcome})` : ""}` });
        return NextResponse.json({ ok: true, retentionUntil: patch.retention_until || null }, { headers });
      }

      case "grant": {
        const { caseRow } = await ownCase(supabase, handler, body.caseId);
        const route: HandlerRole = caseRow.involves_senior ? "independent" : "handler";
        const { data: holders } = await supabase.from("speak_up_case_keys").select("handler_id").eq("case_id", caseRow.id);
        const holding = new Set((holders || []).map((row) => row.handler_id as string));
        const allowed = (await recipientsFor(supabase, route)).filter((person) => !holding.has(person.id));
        const wraps = checkWraps(Array.isArray(body.wraps) ? (body.wraps as Wrap[]) : [], new Set(allowed.map((person) => person.id)));
        // never overwrite a copy someone already holds
        const { error } = await supabase.from("speak_up_case_keys").upsert(wraps.map((wrap) => ({ case_id: caseRow.id, handler_id: wrap.handlerId, wrapped_key: wrap.wrappedKey })), { onConflict: "case_id,handler_id", ignoreDuplicates: true });
        if (error) failFrom(error);
        await logAudit(supabase, { caseId: caseRow.id, reference: caseRow.reference, handler, type: "access_granted", detail: wraps.map((wrap) => allowed.find((person) => person.id === wrap.handlerId)?.name).join(", ") });
        return NextResponse.json({ ok: true }, { headers });
      }

      case "recuse": {
        const { caseRow } = await ownCase(supabase, handler, body.caseId);
        const reason = text(body.reason, 500).trim();
        if (reason.length < 3) throw new SpeakUpError("Give a reason for passing the case on.");
        const target: HandlerRole = body.target === "independent" ? "independent" : "handler";
        if (handler.roles.includes(target)) throw new SpeakUpError("You are in that group yourself, so passing it there would not remove the conflict.");
        const recipients = await recipientsFor(supabase, target, handler.id);
        if (!recipients.length) throw new SpeakUpError("There is nobody approved in that group with a key set up yet.", 409);
        const wraps = checkWraps(Array.isArray(body.wraps) ? (body.wraps as Wrap[]) : [], new Set(recipients.map((person) => person.id)));
        if (wraps.length !== recipients.length) throw new SpeakUpError("The case must be shared with everyone in that group. Reload and try again.", 409);
        const { error } = await supabase.from("speak_up_case_keys").upsert(wraps.map((wrap) => ({ case_id: caseRow.id, handler_id: wrap.handlerId, wrapped_key: wrap.wrappedKey })), { onConflict: "case_id,handler_id", ignoreDuplicates: true });
        if (error) failFrom(error);
        // everyone who is not in the receiving group loses access, including the person recusing
        const keep = wraps.map((wrap) => wrap.handlerId);
        const { data: current } = await supabase.from("speak_up_case_keys").select("handler_id").eq("case_id", caseRow.id);
        const remove = (current || []).map((row) => row.handler_id as string).filter((id) => !keep.includes(id));
        if (remove.length) await supabase.from("speak_up_case_keys").delete().eq("case_id", caseRow.id).in("handler_id", remove);
        await supabase.from("speak_up_cases").update({ involves_senior: target === "independent", assigned_to: null, assigned_at: null }).eq("id", caseRow.id);
        await logAudit(supabase, { caseId: caseRow.id, reference: caseRow.reference, handler, type: "recused", detail: `Passed to ${target === "independent" ? "the independent handler" : "the handlers"}: ${reason}` });
        const origin = getSiteOrigin(request);
        const reference = caseRow.reference;
        after(() => mailCaseHandlers(supabase, keep, origin, "Speak Up: a case has been passed to you", `Case ${reference} has been passed to ${target === "independent" ? "the independent handler" : "the case handlers"}. It has not been assigned yet. Please open Speak Up cases and assign it.`));
        return NextResponse.json({ ok: true }, { headers });
      }

      case "evidence-url": {
        const { caseRow } = await ownCase(supabase, handler, body.caseId);
        const { data: file } = await supabase.from("speak_up_evidence").select("storage_path").eq("id", String(body.evidenceId || "")).eq("case_id", caseRow.id).maybeSingle();
        if (!file) throw new SpeakUpError("That file could not be found.", 404);
        const { data, error } = await supabase.storage.from(SPEAK_UP_EVIDENCE_BUCKET).createSignedUrl(file.storage_path as string, 300);
        if (error || !data) throw new SpeakUpError("The file could not be opened.", 500);
        await logAudit(supabase, { caseId: caseRow.id, reference: caseRow.reference, handler, type: "evidence_downloaded" });
        return NextResponse.json({ url: data.signedUrl }, { headers });
      }

      case "delete-case": {
        const { caseRow } = await ownCase(supabase, handler, body.caseId);
        if (caseRow.status !== "Closed" || !caseRow.retention_until || caseRow.retention_until > today()) {
          throw new SpeakUpError("A case can only be deleted once it is closed and its retention period has passed.");
        }
        const { data: files } = await supabase.from("speak_up_evidence").select("storage_path").eq("case_id", caseRow.id);
        if (files?.length) await supabase.storage.from(SPEAK_UP_EVIDENCE_BUCKET).remove(files.map((file) => file.storage_path as string));
        const { error } = await supabase.from("speak_up_cases").delete().eq("id", caseRow.id);
        if (error) failFrom(error);
        await logAudit(supabase, { caseId: null, reference: caseRow.reference, handler, type: "deleted", detail: "Deleted after the retention period" });
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

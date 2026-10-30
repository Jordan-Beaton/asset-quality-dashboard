import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { createClient as createServerSupabaseClient } from "./supabase/server";
import { SPEAK_UP_ACKNOWLEDGE_DAYS, SPEAK_UP_FEEDBACK_MONTHS } from "./speakUpConfig";

// Server-side helpers for Speak Up. This code never sees a report in the clear: it stores and relays
// ciphertext, checks who may ask for it, and keeps a log of handler activity that holds no reporter detail.

export class SpeakUpError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 400, code = "error") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function serviceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new SpeakUpError("Speak Up is not configured on this environment.", 500);
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function missingTable(message: string) {
  return (/speak_up_/.test(message) || /approved_(roles|by|at)/.test(message)) && /(does not exist|schema cache|could not find)/i.test(message);
}

export function failFrom(error: { message: string; code?: string }): never {
  if (missingTable(error.message)) {
    throw new SpeakUpError("Speak Up needs its database set-up scripts (scripts/sql/speak_up.sql and speak_up_hardening.sql) to be run first.", 503, "setup");
  }
  // the database's own wording can quote stored values, so only its error code is logged and nothing is sent back
  console.error("speak-up database error", error.code || "unknown");
  throw new SpeakUpError("The request could not be completed. Please try again.", 500);
}

// Signed-in actions must come from this site, not from another page that borrows the visitor's session.
export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  let host = "";
  try {
    host = new URL(origin).host;
  } catch {
    // treated as a mismatch below
  }
  const expected = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  if (!host || host !== expected) throw new SpeakUpError("The request was not accepted.", 403, "origin");
}

export function sha256Hex(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function tokenMatches(token: string, storedHash: string) {
  const supplied = Buffer.from(sha256Hex(String(token || "")));
  const stored = Buffer.from(String(storedHash || ""));
  return supplied.length === stored.length && timingSafeEqual(supplied, stored);
}

function saltSecret() {
  return process.env.SPEAK_UP_SALT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "speak-up";
}

// A reference that does not exist gets a stable, believable salt, so nobody can tell real references from made-up ones.
export function fakeSalt(reference: string) {
  return createHmac("sha256", saltSecret()).update(`salt:${reference}`).digest().subarray(0, 16).toString("base64");
}

export function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function addMonths(date: Date, months: number) {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

export function dueDates(received = new Date()) {
  return { acknowledgeBy: addDays(received, SPEAK_UP_ACKNOWLEDGE_DAYS), feedbackBy: addMonths(received, SPEAK_UP_FEEDBACK_MONTHS) };
}

// ---- rate limiting -------------------------------------------------------------------------
// Network addresses are used only to count requests, held in memory as a one-way hash with a per-process random
// salt, and never written anywhere. (Hosting provider logs sit outside the app.)
const processSalt = Math.random().toString(36).slice(2) + Date.now().toString(36);
const hits = new Map<string, number[]>();

export function rateLimit(request: Request, bucket: string, max: number, windowMs: number) {
  const forwarded = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
  const key = `${bucket}:${createHash("sha256").update(processSalt + forwarded.split(",")[0].trim()).digest("hex").slice(0, 16)}`;
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((time) => now - time < windowMs);
  if (recent.length >= max) throw new SpeakUpError("Too many attempts. Please wait a few minutes and try again.", 429, "rate");
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [name, times] of hits) if (!times.some((time) => now - time < windowMs)) hits.delete(name);
}

// ---- handlers ------------------------------------------------------------------------------

export type HandlerRow = {
  id: string;
  email: string;
  name: string;
  user_id: string | null;
  roles: string[];
  approved_roles: string[];
  public_key: JsonWebKey | null;
  encrypted_private_key: { cipher: string; iv: string; salt: string; iterations: number } | null;
  active: boolean;
};

export type HandlerRole = "handler" | "independent";

// A public key is only used if it is a full-strength RSA key with nothing private in it. One malformed key must not
// be able to stop reports reaching everyone else, and a weak one must never be trusted with a case key.
export function validPublicKey(key: unknown): key is JsonWebKey {
  if (!key || typeof key !== "object") return false;
  const jwk = key as Record<string, unknown>;
  if (jwk.kty !== "RSA" || jwk.e !== "AQAB" || typeof jwk.n !== "string") return false;
  if (jwk.n.length < 512 || jwk.n.length > 600 || !/^[A-Za-z0-9_-]+$/.test(jwk.n)) return false;
  return !["d", "p", "q", "dp", "dq", "qi", "oth", "k"].some((member) => member in jwk);
}

export function validProtectedKey(key: unknown): key is { cipher: string; iv: string; salt: string; iterations: number } {
  if (!key || typeof key !== "object") return false;
  const value = key as Record<string, unknown>;
  const ok = (field: unknown, max: number) => typeof field === "string" && field.length > 0 && field.length <= max && /^[A-Za-z0-9+/=_-]+$/.test(field);
  return ok(value.cipher, 6000) && ok(value.iv, 40) && ok(value.salt, 60) && Number.isInteger(value.iterations) && (value.iterations as number) >= 100_000 && (value.iterations as number) <= 2_000_000;
}

// Active, approved handlers for a role who have a usable key: the only people a report may be locked for.
export async function recipientsFor(supabase: SupabaseClient, role: HandlerRole, exceptId?: string) {
  const { data, error } = await supabase.from("speak_up_handlers").select("id,name,roles,approved_roles,public_key").eq("active", true);
  if (error) failFrom(error);
  return ((data || []) as Array<{ id: string; name: string; roles: string[]; approved_roles: string[]; public_key: JsonWebKey | null }>)
    .filter((row) => row.id !== exceptId && row.roles.includes(role) && row.approved_roles.includes(role) && validPublicKey(row.public_key))
    .map((row) => ({ id: row.id, name: row.name, jwk: row.public_key as JsonWebKey }));
}

// A reporter proves they hold the access code by sending the authenticator derived from it; only its hash is stored.
export async function openCaseByCode(supabase: SupabaseClient, reference: unknown, authToken: unknown) {
  const ref = text(reference, 30).trim().toUpperCase();
  const token = text(authToken, 200);
  const { data, error } = await supabase.from("speak_up_cases").select("*").eq("reference", ref).maybeSingle();
  if (error) failFrom(error);
  if (!data || !tokenMatches(token, data.verifier_hash)) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    throw new SpeakUpError("That reference and access code were not recognised.", 401, "not-recognised");
  }
  return data as Record<string, unknown> & { id: string; reference: string; status: string };
}

// Content-free emails to the handlers when the list of people who can receive reports changes.
export async function notifyHandlers(supabase: SupabaseClient, subject: string, line: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.DOCUMENT_NOTIFICATIONS_FROM_EMAIL;
  if (!key || !from) return;
  try {
    // only people who have joined Speak Up (a key and an approval) are told; someone on the list who has not started yet is not
    const { data } = await supabase.from("speak_up_handlers").select("email,approved_roles,public_key").eq("active", true);
    const to = (data || []).filter((row) => row.public_key && ((row.approved_roles as string[] | null) || []).length > 0).map((row) => String(row.email)).filter(Boolean);
    if (!to.length) return;
    await new Resend(key).emails.send({ from, to, subject, html: "<p>" + line + "</p><p>You can see the change in the IMS under Speak Up, on the Handlers tab. If you were not expecting it, tell HR and the IMS administrator straight away.</p>" });
  } catch {
    // a notice that cannot be sent must not block the change
  }
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Everyone who can currently open a case (a locked copy of its key exists for them).
export async function caseHolderIds(supabase: SupabaseClient, caseId: string) {
  const { data } = await supabase.from("speak_up_case_keys").select("handler_id").eq("case_id", caseId);
  return (data || []).map((row) => row.handler_id as string);
}

// A short email to named handlers about a case. It says that something needs attention and where to look, and never
// contains anything the reporter wrote, so it is safe to arrive in an ordinary mailbox.
export async function mailCaseHandlers(supabase: SupabaseClient, handlerIds: string[], origin: string, subject: string, message: string, caseId?: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.DOCUMENT_NOTIFICATIONS_FROM_EMAIL;
  if (!key || !from || !handlerIds.length) return;
  try {
    const { data } = await supabase.from("speak_up_handlers").select("email").eq("active", true).in("id", handlerIds);
    const to = (data || []).map((row) => String(row.email)).filter(Boolean);
    if (!to.length) return;
    // a link straight to the case when there is one; the page asks for sign-in and the passphrase before showing anything
    const link = origin ? origin + "/speak-up/cases" + (caseId ? "?case=" + encodeURIComponent(caseId) : "") : "";
    const html = "<p>" + escapeHtml(message) + "</p>" + (link ? '<p><a href="' + escapeHtml(link) + '">' + (caseId ? "Open this case" : "Open Speak Up cases") + "</a></p>" : "") + '<p style="color:#53565A">This email contains no details of the report. Sign in to the IMS to read it.</p>';
    await new Resend(key).emails.send({ from, to, subject, html });
  } catch {
    // an email that cannot be sent must never block or reveal a report
  }
}

// One handler's daily summary of cases that need attention: references and dates only, never anything the reporter wrote.
export async function mailHandlerDigest(to: string, origin: string, subject: string, lines: string[]) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.DOCUMENT_NOTIFICATIONS_FROM_EMAIL;
  if (!key || !from || !to || !lines.length) return;
  try {
    const link = origin ? origin + "/speak-up/cases" : "";
    const html = "<p>These Speak Up cases need attention:</p><ul>" + lines.map((line) => "<li>" + escapeHtml(line) + "</li>").join("") + "</ul>" + (link ? '<p><a href="' + escapeHtml(link) + '">Open Speak Up cases</a></p>' : "") + '<p style="color:#53565A">This email contains no details of any report. Sign in to the IMS to read them.</p>';
    await new Resend(key).emails.send({ from, to, subject, html });
  } catch {
    // a reminder that cannot be sent must never block anything else
  }
}

// The public reporter page and its APIs stay closed until this is switched on for the environment. Until then the feature
// can be used by signed-in handlers and administrators only.
export function requirePublicChannelOpen() {
  if (process.env.SPEAK_UP_PUBLIC_ENABLED !== "true") {
    throw new SpeakUpError("Speak Up is not open yet. Please use one of the other ways to raise a concern, such as your manager or HR.", 503, "closed");
  }
}

export function mfaRequired() {
  return process.env.SPEAK_UP_REQUIRE_MFA !== "false";
}

// The signed-in person must be an active handler and (unless switched off for local testing) have passed the
// second sign-in factor.
export async function requireHandler(supabase: SupabaseClient, options: { skipMfa?: boolean } = {}) {
  const userClient = await createServerSupabaseClient();
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user?.email) throw new SpeakUpError("Sign in to the IMS to use Speak Up.", 401, "auth");
  const email = data.user.email.trim().toLowerCase();
  const { data: handler, error: handlerError } = await supabase.from("speak_up_handlers").select("*").eq("email", email).eq("active", true).maybeSingle();
  if (handlerError) failFrom(handlerError);
  if (!handler) throw new SpeakUpError("You are not on the Speak Up handler list.", 403, "not-handler");
  // once a login has been linked to a handler it stays linked, so a re-created or re-assigned account cannot take their place
  if (handler.user_id && handler.user_id !== data.user.id) throw new SpeakUpError("This sign-in does not match the one registered for this handler. Ask the IMS administrator.", 403, "account-mismatch");
  if (!options.skipMfa && mfaRequired()) {
    const { data: level } = await userClient.auth.mfa.getAuthenticatorAssuranceLevel();
    if (level?.currentLevel !== "aal2") throw new SpeakUpError("Confirm your second sign-in factor to continue.", 403, "mfa");
  }
  if (!handler.user_id) await supabase.from("speak_up_handlers").update({ user_id: data.user.id }).eq("id", handler.id);
  return { handler: handler as HandlerRow, userId: data.user.id };
}

const MASTER_ADMIN_EMAIL = "jbeaton@enshoresubsea.com";

// Managing the handler list is an IMS administrator job. Administrators do not need to be handlers themselves, and
// being an administrator never gives access to a report: that needs a handler's own key.
export async function requireImsAdmin(supabase: SupabaseClient) {
  const userClient = await createServerSupabaseClient();
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user?.email) throw new SpeakUpError("Sign in to the IMS to use Speak Up.", 401, "auth");
  const email = data.user.email.trim().toLowerCase();
  if (mfaRequired()) {
    const { data: level } = await userClient.auth.mfa.getAuthenticatorAssuranceLevel();
    if (level?.currentLevel !== "aal2") throw new SpeakUpError("Confirm your second sign-in factor to manage Speak Up handlers. Open Speak Up cases and complete it there first.", 403, "mfa");
  }
  if (email === MASTER_ADMIN_EMAIL) return { email };
  if (/[*%_\\]/.test(email)) throw new SpeakUpError("IMS administrator access is needed to manage Speak Up handlers.", 403, "not-admin");
  const { data: person, error: personError } = await supabase.from("people").select("role,system_role,is_master_admin,active,access_status").ilike("email", email.replace(/[\\%_]/g, "\\$&")).limit(1).maybeSingle();
  if (personError) failFrom(personError);
  const role = String(person?.system_role || person?.role || "").trim();
  const deactivated = person?.active === false || String(person?.access_status || "").toLowerCase() === "deactivated";
  if (!person || deactivated || !(person.is_master_admin || role === "Admin")) throw new SpeakUpError("IMS administrator access is needed to manage Speak Up handlers.", 403, "not-admin");
  return { email };
}

export async function logAdminAudit(supabase: SupabaseClient, adminEmail: string, type: string, detail: string) {
  await supabase.from("speak_up_audit").insert({ case_id: null, reference: "ADMIN", actor_name: adminEmail, event_type: type, detail });
}

export async function logAudit(supabase: SupabaseClient, input: { caseId: string | null; reference: string; handler?: Pick<HandlerRow, "id" | "name"> | null; type: string; detail?: string | null }) {
  await supabase.from("speak_up_audit").insert({
    case_id: input.caseId,
    reference: input.reference,
    actor_handler_id: input.handler?.id || null,
    actor_name: input.handler?.name || null,
    event_type: input.type,
    detail: input.detail || null,
  });
}

// ---- small validators ----------------------------------------------------------------------

export function text(value: unknown, max: number) {
  return String(value ?? "").slice(0, max);
}

export function b64(value: unknown, max: number, label = "value") {
  const raw = String(value ?? "");
  if (!raw || raw.length > max || !/^[A-Za-z0-9+/=_-]+$/.test(raw)) throw new SpeakUpError(`The ${label} is not valid.`);
  return raw;
}

import { NextResponse, after } from "next/server";
import {
  SPEAK_UP_CATEGORIES,
  SPEAK_UP_GLOBAL_CASES_PER_HOUR,
  SPEAK_UP_LIMITS,
  SPEAK_UP_REPORT_MODES,
  SPEAK_UP_REPORTER_GROUPS,
} from "../../../../src/lib/speakUpConfig";
import { getSiteOrigin } from "../../../../src/lib/inviteLinks";
import {
  SpeakUpError,
  b64,
  caseHolderIds,
  dueDates,
  failFrom,
  fakeSalt,
  logAudit,
  mailCaseHandlers,
  openCaseByCode,
  rateLimit,
  recipientsFor,
  requirePublicChannelOpen,
  serviceClient,
  sha256Hex,
  text,
} from "../../../../src/lib/speakUpServer";

export const runtime = "nodejs";
// Keep this channel's processing next to the database (Stockholm) rather than wherever the platform defaults to.
export const preferredRegion = "arn1";
export const maxDuration = 30;

const ITERATIONS_MIN = 100_000;
const ITERATIONS_MAX = 1_000_000;
const CIPHER_MAX = 60_000;

type Supabase = ReturnType<typeof serviceClient>;

async function handlerKeys(supabase: Supabase) {
  const [normal, independent] = await Promise.all([recipientsFor(supabase, "handler"), recipientsFor(supabase, "independent")]);
  return { normal, independent };
}

export async function GET() {
  try {
    requirePublicChannelOpen();
    const supabase = serviceClient();
    const keys = await handlerKeys(supabase);
    return NextResponse.json({
      categories: SPEAK_UP_CATEGORIES,
      reporterGroups: SPEAK_UP_REPORTER_GROUPS,
      limits: SPEAK_UP_LIMITS,
      handlerKeys: { normal: keys.normal.map(({ id, jwk }) => ({ id, jwk })), independent: keys.independent.map(({ id, jwk }) => ({ id, jwk })) },
      available: { normal: keys.normal.length > 0, independent: keys.independent.length > 0 },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SpeakUpError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    return NextResponse.json({ error: "Speak Up is not available right now." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  try {
    requirePublicChannelOpen();
    const supabase = serviceClient();
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw new SpeakUpError("The request could not be read.");

    switch (body.action) {
      case "submit": {
        rateLimit(request, "submit", 8, 60 * 60 * 1000);
        const category = text(body.category, 80);
        if (!SPEAK_UP_CATEGORIES.includes(category)) throw new SpeakUpError("Choose a category.");
        const mode = SPEAK_UP_REPORT_MODES.find((entry) => entry === body.mode);
        if (!mode) throw new SpeakUpError("Choose how you want to report.");
        const involves = body.involvesSenior === true;
        const group = SPEAK_UP_REPORTER_GROUPS.length > 1 ? text(body.reporterGroup, 40) : null;
        if (SPEAK_UP_REPORTER_GROUPS.length > 1 && !SPEAK_UP_REPORTER_GROUPS.includes(group || "")) throw new SpeakUpError("Say who you are.");
        const iterations = Number(body.reporterIterations);
        if (!Number.isInteger(iterations) || iterations < ITERATIONS_MIN || iterations > ITERATIONS_MAX) throw new SpeakUpError("The request is not valid.");

        // A ceiling on new reports per hour for the whole channel. It counts reports, not people, so nothing about
        // any reporter is needed, and it stops anyone flooding the handlers or the alert mailbox.
        const { count: recent, error: countError } = await supabase.from("speak_up_cases").select("id", { count: "exact", head: true }).gte("received_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
        if (countError) failFrom(countError);
        if ((recent || 0) >= SPEAK_UP_GLOBAL_CASES_PER_HOUR) throw new SpeakUpError("Speak Up is very busy just now. Please try again in a little while, or use one of the other ways to raise your concern.", 429, "busy");

        const keys = await handlerKeys(supabase);
        const recipients = involves ? keys.independent : keys.normal;
        if (!recipients.length) throw new SpeakUpError("Reports cannot be accepted just now. Please use one of the other ways to raise your concern.", 503, "unavailable");
        const wraps = Array.isArray(body.wraps) ? (body.wraps as Array<{ handlerId?: string; wrappedKey?: string }>) : [];
        const wrapIds = new Set(wraps.map((wrap) => String(wrap.handlerId)));
        // every recipient must be able to open the case, and no one else may be given the key
        if (wrapIds.size !== wraps.length || wrapIds.size !== recipients.length || recipients.some((recipient) => !wrapIds.has(recipient.id))) {
          throw new SpeakUpError("The report could not be prepared. Reload the page and try again.", 409, "handlers-changed");
        }

        const { acknowledgeBy, feedbackBy } = dueDates();
        const contactCipher = body.contactCipher ? b64(body.contactCipher, 2000, "contact details") : null;
        const { data: created, error } = await supabase.from("speak_up_cases").insert({
          category,
          involves_senior: involves,
          reporter_mode: mode,
          reporter_group: group,
          acknowledge_by: acknowledgeBy.toISOString(),
          feedback_by: feedbackBy.toISOString(),
          body_cipher: b64(body.bodyCipher, CIPHER_MAX, "report"),
          body_iv: b64(body.bodyIv, 40, "report"),
          contact_cipher: contactCipher,
          contact_iv: contactCipher ? b64(body.contactIv, 40, "contact details") : null,
          reporter_salt: b64(body.reporterSalt, 40, "salt"),
          reporter_iterations: iterations,
          reporter_wrapped_key: b64(body.reporterWrappedKey, 400, "key"),
          reporter_wrap_iv: b64(body.reporterWrapIv, 40, "key"),
          verifier_hash: sha256Hex(b64(body.authToken, 100, "code")),
        }).select("id,reference").single();
        if (error || !created) failFrom(error || { message: "The report could not be saved." });

        const { error: keyError } = await supabase.from("speak_up_case_keys").insert(wraps.map((wrap) => ({ case_id: created.id, handler_id: String(wrap.handlerId), wrapped_key: b64(wrap.wrappedKey, 1000, "key") })));
        if (keyError) {
          await supabase.from("speak_up_cases").delete().eq("id", created.id);
          failFrom(keyError);
        }
        await logAudit(supabase, { caseId: created.id, reference: created.reference, type: "received", detail: involves ? "Routed to the independent handler" : "Routed to the handlers" });
        // every handler who can open the case is told the same thing; one of them then assigns it
        const origin = getSiteOrigin(request);
        const recipientIds = wraps.map((wrap) => String(wrap.handlerId));
        after(() => mailCaseHandlers(supabase, recipientIds, origin, "Speak Up: a new report has been received", `A new report (${created.reference}) has been received${involves ? " on the independent route" : ""}. It has not been assigned yet. Please open Speak Up cases and assign it to yourself or to another handler.`));
        return NextResponse.json({ reference: created.reference }, { headers });
      }

      case "salt": {
        rateLimit(request, "lookup", 60, 10 * 60 * 1000);
        const reference = text(body.reference, 30).trim().toUpperCase();
        const { data, error } = await supabase.from("speak_up_cases").select("reporter_salt,reporter_iterations").eq("reference", reference).maybeSingle();
        if (error) failFrom(error);
        return NextResponse.json({ salt: data?.reporter_salt || fakeSalt(reference), iterations: data?.reporter_iterations || 250000 }, { headers });
      }

      case "case": {
        rateLimit(request, "lookup", 60, 10 * 60 * 1000);
        const found = await openCaseByCode(supabase, body.reference, body.authToken);
        const { data: messages } = await supabase.from("speak_up_messages").select("id,author_role,cipher,iv,created_at").eq("case_id", found.id).order("created_at", { ascending: true });
        return NextResponse.json({
          reference: found.reference,
          status: found.status,
          category: found.category,
          receivedAt: found.received_at,
          acknowledgedAt: found.acknowledged_at,
          outcomeSharedAt: found.outcome_shared_at,
          closedAt: found.closed_at,
          outcome: found.outcome,
          reporterWrappedKey: found.reporter_wrapped_key,
          reporterWrapIv: found.reporter_wrap_iv,
          bodyCipher: found.body_cipher,
          bodyIv: found.body_iv,
          messages: (messages || []).map((message) => ({ id: message.id, authorRole: message.author_role, cipher: message.cipher, iv: message.iv, createdAt: message.created_at })),
        }, { headers });
      }

      case "reply": {
        rateLimit(request, "reply", 30, 60 * 60 * 1000);
        const found = await openCaseByCode(supabase, body.reference, body.authToken);
        if (found.status === "Closed") throw new SpeakUpError("This case has been closed, so it cannot take new messages.");
        // only the first reply since a handler last wrote triggers an email, so repeated messages cannot flood a mailbox
        const { data: previous } = await supabase.from("speak_up_messages").select("author_role").eq("case_id", found.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
        const { error } = await supabase.from("speak_up_messages").insert({ case_id: found.id, author_role: "reporter", cipher: b64(body.cipher, CIPHER_MAX, "message"), iv: b64(body.iv, 40, "message") });
        if (error) failFrom(error);
        if (previous?.author_role !== "reporter") {
          // the assigned handler alone is told; an unassigned case tells everyone who holds it
          const assignee = (found.assigned_to as string | null) || null;
          const origin = getSiteOrigin(request);
          const reference = found.reference;
          const caseId = found.id;
          after(async () => mailCaseHandlers(supabase, assignee ? [assignee] : await caseHolderIds(supabase, caseId), origin, `Speak Up: a new message on ${reference}`, `The reporter has added a message to case ${reference}.${assignee ? "" : " The case is not assigned yet."}`));
        }
        if (found.status === "Awaiting reporter") await supabase.from("speak_up_cases").update({ status: "Investigating" }).eq("id", found.id);
        await logAudit(supabase, { caseId: found.id, reference: found.reference, type: "reporter_replied" });
        return NextResponse.json({ ok: true }, { headers });
      }

      default:
        throw new SpeakUpError("Unknown request.");
    }
  } catch (error) {
    if (error instanceof SpeakUpError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getSiteOrigin } from "../../../../src/lib/inviteLinks";
import {
  SpeakUpError,
  failFrom,
  mailHandlerDigest,
  serviceClient,
  sha256Hex,
  tokenMatches,
  validPublicKey,
} from "../../../../src/lib/speakUpServer";

export const runtime = "nodejs";
export const preferredRegion = "arn1";
export const maxDuration = 60;

// Called once a day by the scheduler (see vercel.json). Each handler gets one short email listing the cases that are close to
// a target, or overdue, for them: their own assigned cases, and unassigned cases they can open. The emails hold references and
// dates only, never anything the reporter wrote.

const ACKNOWLEDGE_WARNING_DAYS = 2;
const FEEDBACK_WARNING_DAYS = 14;
const UNASSIGNED_AFTER_HOURS = 24;
const REPLY_WAITING_AFTER_DAYS = 2;

function dateText(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function daysUntil(value: string, now: number) {
  return Math.ceil((new Date(value).getTime() - now) / 86_400_000);
}

export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  try {
    // only the scheduler (or the administrator holding the secret) may run this
    const secret = process.env.CRON_SECRET;
    if (!secret) throw new SpeakUpError("Reminders are not set up on this environment.", 503, "not-configured");
    if (!tokenMatches(request.headers.get("authorization") || "", sha256Hex(`Bearer ${secret}`))) throw new SpeakUpError("Not allowed.", 401, "auth");
    const dryRun = new URL(request.url).searchParams.get("dry") === "1";

    const supabase = serviceClient();
    const now = Date.now();
    const { data: cases, error } = await supabase.from("speak_up_cases").select("id,reference,status,received_at,acknowledge_by,feedback_by,acknowledged_at,assigned_to").neq("status", "Closed");
    if (error) failFrom(error);
    if (!cases?.length) return NextResponse.json({ cases: 0, handlersNotified: 0, dryRun }, { headers });

    const ids = cases.map((row) => row.id as string);
    const [{ data: messages }, { data: keys }, { data: people }] = await Promise.all([
      supabase.from("speak_up_messages").select("case_id,author_role,created_at").in("case_id", ids).order("created_at", { ascending: true }).limit(20000),
      supabase.from("speak_up_case_keys").select("case_id,handler_id").in("case_id", ids),
      supabase.from("speak_up_handlers").select("id,email,approved_roles,public_key").eq("active", true),
    ]);

    const last = new Map<string, { role: string; at: string }>();
    for (const message of messages || []) last.set(message.case_id as string, { role: message.author_role as string, at: message.created_at as string });
    const holders = new Map<string, string[]>();
    for (const key of keys || []) holders.set(key.case_id as string, [...(holders.get(key.case_id as string) || []), key.handler_id as string]);
    // only people who have actually joined Speak Up are written to
    const joined = new Map<string, string>();
    for (const person of people || []) {
      if (validPublicKey(person.public_key) && ((person.approved_roles as string[] | null) || []).length > 0) joined.set(person.id as string, person.email as string);
    }

    const perHandler = new Map<string, Array<{ order: number; line: string }>>();
    for (const item of cases) {
      const reasons: Array<{ order: number; text: string }> = [];
      if (!item.acknowledged_at) {
        const days = daysUntil(item.acknowledge_by as string, now);
        if (days < 0) reasons.push({ order: 0, text: `acknowledgement overdue (was due ${dateText(item.acknowledge_by as string)})` });
        else if (days <= ACKNOWLEDGE_WARNING_DAYS) reasons.push({ order: 2, text: `acknowledgement due ${dateText(item.acknowledge_by as string)}` });
      }
      if (!["Outcome shared", "Closed"].includes(item.status as string)) {
        const days = daysUntil(item.feedback_by as string, now);
        if (days < 0) reasons.push({ order: 1, text: `feedback to the reporter overdue (was due ${dateText(item.feedback_by as string)})` });
        else if (days <= FEEDBACK_WARNING_DAYS) reasons.push({ order: 3, text: `feedback to the reporter due ${dateText(item.feedback_by as string)}` });
      }
      if (!item.assigned_to && now - new Date(item.received_at as string).getTime() > UNASSIGNED_AFTER_HOURS * 3_600_000) reasons.push({ order: 4, text: "not assigned to a handler yet" });
      const latest = last.get(item.id as string);
      if (latest?.role === "reporter" && now - new Date(latest.at).getTime() > REPLY_WAITING_AFTER_DAYS * 86_400_000) reasons.push({ order: 5, text: `a message from the reporter has been waiting since ${dateText(latest.at)}` });
      if (!reasons.length) continue;

      // the assigned handler alone; an unassigned case goes to everyone who can open it
      const recipients = item.assigned_to ? [item.assigned_to as string] : holders.get(item.id as string) || [];
      const entry = { order: Math.min(...reasons.map((reason) => reason.order)), line: `${item.reference}: ${reasons.sort((a, b) => a.order - b.order).map((reason) => reason.text).join("; ")}` };
      for (const recipient of recipients) {
        if (!joined.has(recipient)) continue;
        perHandler.set(recipient, [...(perHandler.get(recipient) || []), entry]);
      }
    }

    const origin = getSiteOrigin(request);
    let sent = 0;
    for (const [handlerId, entries] of perHandler) {
      if (!dryRun) {
        const lines = entries.sort((a, b) => a.order - b.order).map((entry) => entry.line);
        await mailHandlerDigest(joined.get(handlerId) as string, origin, `Speak Up: ${lines.length} case${lines.length === 1 ? "" : "s"} need${lines.length === 1 ? "s" : ""} attention`, lines);
      }
      sent += 1;
    }
    return NextResponse.json({ cases: cases.length, handlersNotified: sent, casesFlagged: new Set([...perHandler.values()].flat().map((entry) => entry.line)).size, dryRun }, { headers });
  } catch (error) {
    if (error instanceof SpeakUpError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    return NextResponse.json({ error: "The reminders could not be run." }, { status: 500 });
  }
}

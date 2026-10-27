import type { SupabaseClient } from "@supabase/supabase-js";
import { reviewCodeOf, type ReviewCandidate } from "./reviewPoints";

// Server-side writes for review points. The browser can read the tables but never writes them:
// every change comes through here, where the signer list is checked and the name, date and
// time of a decision are stamped by the server (never taken from the request).

export type ReviewActor = { userId: string; email: string; name: string };

export class ReviewPointError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const MAX_IDS = 500;

function cleanText(value: unknown, max: number) {
  return String(value ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function checkIds(ids: unknown) {
  const list = Array.isArray(ids) ? ids.map((id) => String(id)).filter((id) => /^[0-9a-f-]{36}$/i.test(id)) : [];
  if (!list.length) throw new ReviewPointError("Select at least one review point.");
  if (list.length > MAX_IDS) throw new ReviewPointError(`Select no more than ${MAX_IDS} review points at a time.`);
  return [...new Set(list)];
}

function tableMissing(message: string) {
  return /project_review_(points|point_events|signers)/.test(message) && /(does not exist|schema cache|could not find)/i.test(message);
}

function fail(error: { message: string }): never {
  if (tableMissing(error.message)) {
    throw new ReviewPointError("Review Points needs its one-off database setup (scripts/sql/project_review_points.sql) to be run first.", 503);
  }
  throw new ReviewPointError(error.message, 500);
}

export async function isSigner(supabase: SupabaseClient, email: string) {
  const { data, error } = await supabase.from("project_review_signers").select("email").eq("email", email.trim().toLowerCase()).eq("active", true).limit(1);
  if (error) fail(error);
  return Boolean(data?.length);
}

async function requireSigner(supabase: SupabaseClient, actor: ReviewActor) {
  if (!(await isSigner(supabase, actor.email))) {
    throw new ReviewPointError("Only authorised signers can accept or fail review points.", 403);
  }
}

export async function importReviewPoints(
  supabase: SupabaseClient,
  actor: ReviewActor,
  input: { projectKey: string; itpId: string; revisionId: string; points: ReviewCandidate[] },
) {
  const { data: revision, error: revisionError } = await supabase
    .from("project_itp_revisions")
    .select("id,itp_id,project_itps!inner(id,project_key)")
    .eq("id", input.revisionId)
    .eq("itp_id", input.itpId)
    .maybeSingle();
  if (revisionError) fail(revisionError);
  const itp = revision?.project_itps as unknown as { project_key: string } | { project_key: string }[] | null | undefined;
  const projectKey = Array.isArray(itp) ? itp[0]?.project_key : itp?.project_key;
  if (!revision || projectKey !== input.projectKey) throw new ReviewPointError("That ITP revision was not found in this project.", 404);

  const rows = (Array.isArray(input.points) ? input.points : []).slice(0, 2000).flatMap((point) => {
    const code = reviewCodeOf(point.code);
    const section = cleanText(point.sectionNumber, 30);
    const description = cleanText(point.activityDescription, 400);
    if (!code || !section || !description) return [];
    return [{
      project_key: input.projectKey,
      itp_id: input.itpId,
      revision_id: input.revisionId,
      section_number: section,
      activity_description: description,
      code,
      source_location: cleanText(point.sourceLocation, 120) || null,
      created_by: actor.userId,
    }];
  });
  // the same point can be found twice on a page; keep one
  const unique = [...new Map(rows.map((row) => [`${row.section_number}|${row.code}|${row.activity_description}`, row])).values()];
  if (!unique.length) return { added: 0, skipped: 0 };

  const { data, error } = await supabase
    .from("project_review_points")
    .upsert(unique, { onConflict: "revision_id,section_number,code,activity_description", ignoreDuplicates: true })
    .select("id");
  if (error) fail(error);
  const added = data || [];
  if (added.length) {
    const { error: eventError } = await supabase.from("project_review_point_events").insert(
      added.map((row) => ({ point_id: row.id, event_type: "added", actor_name: actor.name, actor_email: actor.email, actor_user_id: actor.userId, detail: "Added from the ITP scan" })),
    );
    if (eventError) fail(eventError);
  }
  return { added: added.length, skipped: unique.length - added.length };
}

export async function assignReviewPoints(
  supabase: SupabaseClient,
  actor: ReviewActor,
  input: { ids: unknown; reviewer?: unknown; targetDate?: unknown },
) {
  const ids = checkIds(input.ids);
  const reviewer = input.reviewer === undefined ? undefined : cleanText(input.reviewer, 120);
  const targetDate = input.targetDate === undefined ? undefined : String(input.targetDate || "");
  if (targetDate && !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) throw new ReviewPointError("The target date is not valid.");
  if (reviewer === undefined && targetDate === undefined) throw new ReviewPointError("Choose a reviewer or a target date.");

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (reviewer !== undefined) patch.reviewer = reviewer || null;
  if (targetDate !== undefined) patch.target_date = targetDate || null;
  const { data, error } = await supabase.from("project_review_points").update(patch).in("id", ids).select("id");
  if (error) fail(error);
  const changed = data || [];
  const detail = [reviewer ? `Reviewer ${reviewer}` : "", targetDate ? `target ${targetDate}` : ""].filter(Boolean).join(", ") || "Assignment cleared";
  if (changed.length) {
    const { error: eventError } = await supabase.from("project_review_point_events").insert(
      changed.map((row) => ({ point_id: row.id, event_type: "assigned", actor_name: actor.name, actor_email: actor.email, actor_user_id: actor.userId, detail })),
    );
    if (eventError) fail(eventError);
  }
  return { updated: changed.length };
}

export async function decideReviewPoints(
  supabase: SupabaseClient,
  actor: ReviewActor,
  input: { ids: unknown; decision: unknown; note?: unknown },
) {
  await requireSigner(supabase, actor);
  const ids = checkIds(input.ids);
  const decision = input.decision === "Accepted" ? "Accepted" : input.decision === "Failed" ? "Failed" : null;
  if (!decision) throw new ReviewPointError("The decision must be Accepted or Failed.");
  const note = cleanText(input.note, 1000);
  if (decision === "Failed" && note.length < 3) throw new ReviewPointError("Give a reason for failing a review point.");

  // The date and time are taken here, on the server, at the moment of the decision.
  const decidedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("project_review_points")
    .update({
      status: decision,
      decided_by: actor.name,
      decided_by_email: actor.email,
      decided_by_user_id: actor.userId,
      decided_at: decidedAt,
      decision_note: note || null,
      updated_at: decidedAt,
    })
    .in("id", ids)
    .eq("status", "Pending")
    .select("id");
  if (error) fail(error);
  const changed = data || [];
  if (changed.length) {
    const { error: eventError } = await supabase.from("project_review_point_events").insert(
      changed.map((row) => ({
        point_id: row.id,
        event_type: decision === "Accepted" ? "accepted" : "failed",
        actor_name: actor.name,
        actor_email: actor.email,
        actor_user_id: actor.userId,
        detail: note || null,
        created_at: decidedAt,
      })),
    );
    if (eventError) fail(eventError);
  }
  return { decided: changed.length, skipped: ids.length - changed.length, decidedAt };
}

export async function reopenReviewPoints(supabase: SupabaseClient, actor: ReviewActor, input: { ids: unknown; note?: unknown }) {
  await requireSigner(supabase, actor);
  const ids = checkIds(input.ids);
  const note = cleanText(input.note, 500);
  const { data: current, error: readError } = await supabase.from("project_review_points").select("id,status,decided_by,decided_at").in("id", ids).neq("status", "Pending");
  if (readError) fail(readError);
  const open = current || [];
  if (!open.length) return { reopened: 0 };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("project_review_points")
    .update({ status: "Pending", decided_by: null, decided_by_email: null, decided_by_user_id: null, decided_at: null, decision_note: null, updated_at: now })
    .in("id", open.map((row) => row.id));
  if (error) fail(error);
  const { error: eventError } = await supabase.from("project_review_point_events").insert(
    open.map((row) => ({
      point_id: row.id,
      event_type: "reopened",
      actor_name: actor.name,
      actor_email: actor.email,
      actor_user_id: actor.userId,
      detail: `Was ${String(row.status).toLowerCase()} by ${row.decided_by || "unknown"} on ${row.decided_at ? String(row.decided_at).slice(0, 10) : "unknown date"}${note ? `. ${note}` : ""}`,
    })),
  );
  if (eventError) fail(eventError);
  return { reopened: open.length };
}

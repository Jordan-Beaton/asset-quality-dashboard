import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { createClient as createServerSupabaseClient } from "./supabase/server";
import { writeNotifications } from "./notifications";
import { getProject } from "./projectRegistry";
import {
  GATE_DAYS,
  daysBetween,
  dueDateFrom,
  holderOf,
  isGateOpen,
  masterFieldsFor,
  nextWorkingDay,
  normalisedEmail,
  notifyListOf,
  sameEmail,
  todayLondon,
  type ItpPerson,
  type WorkflowRevision,
  type WorkflowState,
} from "./itpWorkflow";

// Server-side writes for the ITP stage gate. The browser reads the tables but never writes the gate: every change comes
// through here, where the signed-in person is checked against the person named on the gate, and where the name, date and
// time of each decision are stamped by the server (never taken from the request).

export class ItpWorkflowError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export type Actor = { userId: string; email: string; name: string; isAdmin: boolean; isManager: boolean };
export type Ctx = { service: SupabaseClient; actor: Actor; origin: string };

type ItpMasterRow = { id: string; project_key: string; document_number: string; title: string; supplier: string | null; scope: string | null };
export type RevisionRecord = WorkflowRevision & {
  id: string;
  itp_id: string;
  revision: string;
  file_name: string;
  is_current: boolean;
  uploaded_by: string | null;
  project_itps: ItpMasterRow;
};

const SETUP_MESSAGE = "The ITP stage gate needs its one-off database setup (scripts/sql/project_itp_stage_gate.sql) to be run first.";

export function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new ItpWorkflowError("The ITP stage gate is not configured on this environment.", 500);
  return createClient(url, key);
}

function fail(error: { message: string }): never {
  if (/(workflow_state|project_itp_activity|project_itp_comments|reviewer_email|notify_list)/.test(error.message) && /(does not exist|schema cache|could not find)/i.test(error.message)) {
    throw new ItpWorkflowError(SETUP_MESSAGE, 503);
  }
  throw new ItpWorkflowError(error.message, 500);
}

export async function resolveActor(service: SupabaseClient): Promise<Actor> {
  const userClient = await createServerSupabaseClient();
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user || !data.user.email) throw new ItpWorkflowError("Sign in to the IMS to continue.", 401);
  const email = data.user.email.toLowerCase();
  const { data: person } = await service
    .from("people")
    .select("name,system_role,is_master_admin")
    // underscores and percent signs are wildcards in a pattern match, so escape them to match this exact address
    .ilike("email", email.replace(/[\\%_]/g, "\\$&"))
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  const metadata = data.user.user_metadata as { full_name?: string; name?: string } | undefined;
  const role = String(person?.system_role || "");
  return {
    userId: data.user.id,
    email,
    name: person?.name || metadata?.full_name || metadata?.name || email,
    isAdmin: Boolean(person?.is_master_admin) || role === "Admin",
    isManager: role === "Manager",
  };
}

// ---------- small helpers ----------

function cleanLine(value: unknown, max: number) {
  return String(value ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function cleanBody(value: unknown, max: number) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}

export function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function uuidOrThrow(value: unknown, what: string) {
  const text = String(value || "");
  if (!/^[0-9a-f-]{36}$/i.test(text)) throw new ItpWorkflowError(`The ${what} could not be found.`, 404);
  return text;
}

function dedupe(people: Array<ItpPerson | null | undefined>, exclude: string[] = []) {
  const seen = new Set(exclude.map(normalisedEmail));
  const out: ItpPerson[] = [];
  for (const person of people) {
    if (!person || !person.email.includes("@")) continue;
    const key = normalisedEmail(person.email);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: person.name || person.email, email: person.email.trim() });
  }
  return out;
}

async function findPerson(service: SupabaseClient, email: unknown): Promise<ItpPerson> {
  const wanted = normalisedEmail(String(email || ""));
  if (!wanted) throw new ItpWorkflowError("Choose a person from the list.");
  const { data, error } = await service
    .from("people")
    .select("name,email,active")
    .ilike("email", wanted.replace(/[\\%_]/g, "\\$&"))
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  if (error) fail(error);
  if (!data || !data.email) throw new ItpWorkflowError("That person is not an active person in People Management.");
  return { name: String(data.name || data.email), email: String(data.email).trim() };
}

async function findPeople(service: SupabaseClient, emails: unknown): Promise<ItpPerson[]> {
  const list = Array.isArray(emails) ? emails.map((value) => normalisedEmail(String(value))).filter(Boolean) : [];
  const unique = [...new Set(list)].slice(0, 20);
  const found: ItpPerson[] = [];
  for (const email of unique) found.push(await findPerson(service, email));
  return found;
}

export async function loadRevision(service: SupabaseClient, revisionId: unknown): Promise<RevisionRecord> {
  const id = uuidOrThrow(revisionId, "ITP revision");
  const { data, error } = await service
    .from("project_itp_revisions")
    .select("*, project_itps!inner(id,project_key,document_number,title,supplier,scope)")
    .eq("id", id)
    .maybeSingle();
  if (error) fail(error);
  if (!data) throw new ItpWorkflowError("That ITP revision was not found.", 404);
  const row = data as unknown as RevisionRecord & { project_itps: ItpMasterRow | ItpMasterRow[] };
  const master = Array.isArray(row.project_itps) ? row.project_itps[0] : row.project_itps;
  return { ...row, project_itps: master } as RevisionRecord;
}

function canManage(actor: Actor, revision: RevisionRecord) {
  return actor.isAdmin || actor.isManager || revision.uploaded_by === actor.userId || sameEmail(revision.uploader_email, actor.email);
}

// ---------- activity, comments, notifications ----------

async function logActivity(ctx: Ctx, revision: RevisionRecord, kind: string, summary: string, detail?: string | null, actor: Pick<Actor, "name" | "email"> | null = ctx.actor) {
  const { error } = await ctx.service.from("project_itp_activity").insert({
    itp_id: revision.itp_id,
    revision_id: revision.id,
    project_key: revision.project_itps.project_key,
    kind,
    actor_name: actor?.name || null,
    actor_email: actor?.email || null,
    summary,
    detail: detail || null,
  });
  if (error) fail(error);
}

async function addComment(ctx: Ctx, revision: RevisionRecord, input: { kind: "Review note" | "Approval note" | "Supplier comment" | "General"; body: string; ref?: string | null; open?: boolean }) {
  const { error } = await ctx.service.from("project_itp_comments").insert({
    itp_id: revision.itp_id,
    revision_id: revision.id,
    project_key: revision.project_itps.project_key,
    kind: input.kind,
    ref: input.ref || null,
    body: input.body,
    author_name: ctx.actor.name,
    author_email: ctx.actor.email,
    status: input.open ? "Open" : null,
  });
  if (error) fail(error);
}

function recordUrl(origin: string, revision: RevisionRecord) {
  return `${origin.replace(/\/+$/, "")}/projects/${revision.project_itps.project_key}/itp/${revision.itp_id}`;
}

function projectLabel(revision: RevisionRecord) {
  return getProject(revision.project_itps.project_key).label;
}

function itpLabel(revision: RevisionRecord) {
  return `${revision.project_itps.document_number} Rev ${revision.revision}`;
}

// ---------- email ----------

type MailSpec = {
  heading: string;
  intro: string;
  rows: Array<[string, string]>;
  quote?: { by: string; text: string };
  items?: Array<{ ref: string | null; text: string }>;
  button: string;
  url: string;
  footer: string;
};

function renderMail(spec: MailSpec) {
  const rows = spec.rows
    .map(([label, value]) => `<tr><td style="padding:7px 0;border-bottom:1px solid #D0D0CE;color:#53565A;width:34%;vertical-align:top">${escapeHtml(label)}</td><td style="padding:7px 0;border-bottom:1px solid #D0D0CE;font-weight:700;vertical-align:top">${escapeHtml(value)}</td></tr>`)
    .join("");
  const quote = spec.quote
    ? `<div style="border-left:3px solid #63B1BC;background:#F4F8F8;padding:10px 14px;border-radius:0 8px 8px 0;margin:16px 0;font-size:14px"><div style="font-size:12px;font-weight:700;color:#53565A;margin-bottom:3px">${escapeHtml(spec.quote.by)}</div>${escapeHtml(spec.quote.text).replace(/\n/g, "<br>")}</div>`
    : "";
  const items = spec.items && spec.items.length
    ? `<ol style="margin:12px 0;padding-left:20px;font-size:14px">${spec.items.map((item) => `<li style="margin:6px 0">${item.ref ? `<strong>${escapeHtml(item.ref)}</strong> · ` : ""}${escapeHtml(item.text).replace(/\n/g, "<br>")}</li>`).join("")}</ol>`
    : "";
  return `<div style="font-family:'Segoe UI',Arial,sans-serif;color:#000000;line-height:1.5;max-width:640px">
    <div style="background:#005670;color:#ffffff;padding:18px 24px;border-radius:12px 12px 0 0">
      <div style="font-size:22px;font-weight:700;letter-spacing:0.06em">ENSHORE</div>
      <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;color:#63B1BC;text-transform:uppercase">Project Management · ITP Tracker</div>
    </div>
    <div style="border:1px solid #D0D0CE;border-top:none;padding:24px;border-radius:0 0 12px 12px">
      <h2 style="margin:0 0 12px;color:#005670;font-size:20px">${escapeHtml(spec.heading)}</h2>
      <p style="margin:0 0 6px">${escapeHtml(spec.intro)}</p>
      ${quote}${items}
      <table style="border-collapse:collapse;width:100%;font-size:14px;margin:12px 0">${rows}</table>
      <p style="margin:22px 0"><a href="${escapeHtml(spec.url)}" style="display:inline-block;background:#005670;color:#ffffff;text-decoration:none;border-radius:10px;padding:13px 22px;font-weight:700">${escapeHtml(spec.button)}</a></p>
      <p style="font-size:13px;color:#53565A">${escapeHtml(spec.footer)}</p>
      <p style="font-size:12px;color:#53565A;margin-top:16px">You need to be signed in to the IMS. If the button does not work, copy this address into your browser:<br><span style="word-break:break-all">${escapeHtml(spec.url)}</span></p>
    </div>
  </div>`;
}

async function sendMail(args: { to: ItpPerson[]; cc: ItpPerson[]; subject: string; html: string }): Promise<string> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.DOCUMENT_NOTIFICATIONS_FROM_EMAIL;
  if (!args.to.length) return "There was nobody to email.";
  if (!apiKey || !from) return "Email is not configured on this environment.";
  try {
    const result = await new Resend(apiKey).emails.send({
      from,
      to: args.to.map((person) => person.email),
      cc: args.cc.length ? args.cc.map((person) => person.email) : undefined,
      subject: args.subject,
      html: args.html,
    });
    return result.error ? result.error.message || "The email could not be sent." : "";
  } catch (error) {
    return error instanceof Error ? error.message : "The email could not be sent.";
  }
}

function peopleNames(people: ItpPerson[]) {
  return people.map((person) => person.name).join(", ");
}

// Sends one email, records it in the ITP's trail (including a failure), and writes the in-app notification.
async function deliver(
  ctx: Ctx,
  revision: RevisionRecord,
  args: { label: string; to: ItpPerson[]; cc?: Array<ItpPerson | null | undefined>; subject: string; spec: MailSpec; notificationTitle?: string; actorForLog?: Pick<Actor, "name" | "email"> | null },
): Promise<string> {
  const to = dedupe(args.to);
  const cc = dedupe(args.cc || [], to.map((person) => person.email));
  if (!to.length) return "";
  const warning = await sendMail({ to, cc, subject: args.subject, html: renderMail(args.spec) });
  const copied = cc.length ? `, copied to ${peopleNames(cc)}` : "";
  await logActivity(
    ctx,
    revision,
    "email",
    warning ? `${args.label} could not be emailed to ${peopleNames(to)}` : `${args.label} emailed to ${peopleNames(to)}${copied}`,
    warning || null,
    args.actorForLog === undefined ? { name: "IMS", email: "" } : args.actorForLog,
  );
  await writeNotifications(
    to.map((person) => ({
      recipientEmail: person.email,
      sourceModule: "Project Management",
      title: args.notificationTitle || args.subject,
      body: `${projectLabel(revision)} · ${itpLabel(revision)}`,
      link: `/projects/${revision.project_itps.project_key}/itp/${revision.itp_id}`,
    })),
  );
  return warning;
}

function baseRows(revision: RevisionRecord): Array<[string, string]> {
  const master = revision.project_itps;
  return [
    ["Project", projectLabel(revision)],
    ["ITP", `${master.document_number} · ${master.title}`],
    ["Supplier", [master.supplier, master.scope].filter(Boolean).join(" · ") || "-"],
    ["Revision", `Rev ${revision.revision}`],
  ];
}

function longDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function uploaderOf(revision: RevisionRecord): ItpPerson | null {
  return revision.uploader_email ? { name: revision.uploader_name || revision.uploader_email, email: revision.uploader_email } : null;
}

function reviewerOf(revision: RevisionRecord): ItpPerson | null {
  return revision.reviewer_email ? { name: revision.reviewer_name || revision.reviewer_email, email: revision.reviewer_email } : null;
}

function approverOf(revision: RevisionRecord): ItpPerson | null {
  return revision.approver_email ? { name: revision.approver_name || revision.approver_email, email: revision.approver_email } : null;
}

async function emailReviewRequest(ctx: Ctx, revision: RevisionRecord, previousReviewer?: ItpPerson | null) {
  const reviewer = reviewerOf(revision);
  if (!reviewer || !revision.gate_due_date) return "";
  const approver = approverOf(revision);
  const master = revision.project_itps;
  return deliver(ctx, revision, {
    label: "Review request",
    to: [reviewer],
    cc: [approver, previousReviewer, ...notifyListOf(revision)],
    subject: `ITP review requested: ${itpLabel(revision)} (${projectLabel(revision)})`,
    notificationTitle: `ITP review requested: ${itpLabel(revision)}`,
    spec: {
      heading: "ITP review requested",
      intro: `${master.supplier ? `${master.supplier} has issued` : "A new revision of"} ${master.supplier ? "an ITP" : "this ITP is ready"} for Enshore review. You are the reviewer.`,
      rows: [...baseRows(revision), ["Review due", longDate(revision.gate_due_date)], ["Then goes to", approver ? `${approver.name} (approver)` : "An approver chosen when you finish"]],
      button: "Review this ITP",
      url: recordUrl(ctx.origin, revision),
      footer: "Open the ITP, check the document, then record your decision. If you are not the right reviewer, ask the Quality Lead to reassign it.",
    },
  });
}

async function emailApprovalRequest(ctx: Ctx, revision: RevisionRecord, reviewNote: string) {
  const approver = approverOf(revision);
  if (!approver || !revision.gate_due_date) return "";
  return deliver(ctx, revision, {
    label: "Approval request",
    to: [approver],
    cc: [reviewerOf(revision), ...notifyListOf(revision)],
    subject: `ITP approval requested: ${itpLabel(revision)} (${projectLabel(revision)})`,
    notificationTitle: `ITP approval requested: ${itpLabel(revision)}`,
    spec: {
      heading: "ITP approval requested",
      intro: `${revision.reviewed_by_name || "The reviewer"} has finished the review and recommends approval. You are the approver.`,
      quote: reviewNote ? { by: `${revision.reviewed_by_name || "Reviewer"} · review note`, text: reviewNote } : undefined,
      rows: [...baseRows(revision), ["Reviewed by", revision.reviewed_by_name || "-"], ["Approval due", longDate(revision.gate_due_date)]],
      button: "Review and approve",
      url: recordUrl(ctx.origin, revision),
      footer: "Approving makes this revision the controlled revision. You can also return it to the reviewer, or reject it back to the supplier, with a reason.",
    },
  });
}

async function emailApproved(ctx: Ctx, revision: RevisionRecord, note: string) {
  const to = [reviewerOf(revision), uploaderOf(revision)].filter(Boolean) as ItpPerson[];
  return deliver(ctx, revision, {
    label: "Approval notice",
    to,
    cc: [approverOf(revision), ...notifyListOf(revision)],
    subject: `ITP approved: ${itpLabel(revision)} is now the controlled revision`,
    notificationTitle: `ITP approved: ${itpLabel(revision)}`,
    spec: {
      heading: "ITP approved",
      intro: `${revision.approved_by_name || "The approver"} approved Rev ${revision.revision}. It is now the controlled revision.`,
      quote: note ? { by: `${revision.approved_by_name || "Approver"} · approval note`, text: note } : undefined,
      rows: [...baseRows(revision), ["Gate 1 · Review", revision.reviewed_by_name || "-"], ["Gate 2 · Approval", revision.approved_by_name || "-"], ["Next steps", "Scan NOI points, create review points, issue a phase sign-off"]],
      button: "Open the ITP record",
      url: recordUrl(ctx.origin, revision),
      footer: "The complete gate record stays on the ITP and cannot be edited.",
    },
  });
}

async function emailReturned(ctx: Ctx, revision: RevisionRecord, note: string) {
  const reviewer = reviewerOf(revision);
  if (!reviewer || !revision.gate_due_date) return "";
  return deliver(ctx, revision, {
    label: "Return notice",
    to: [reviewer],
    cc: [uploaderOf(revision), ...notifyListOf(revision)],
    subject: `ITP returned to reviewer: ${itpLabel(revision)} (${projectLabel(revision)})`,
    notificationTitle: `ITP returned to you: ${itpLabel(revision)}`,
    spec: {
      heading: "ITP returned to reviewer",
      intro: `${ctx.actor.name} returned this ITP for another look before approving.`,
      quote: { by: `${ctx.actor.name} · reason`, text: note },
      rows: [...baseRows(revision), ["Review due", longDate(revision.gate_due_date)]],
      button: "Reopen the review",
      url: recordUrl(ctx.origin, revision),
      footer: "Gate 1 is open again. The earlier recommendation stays in the ITP's activity trail.",
    },
  });
}

async function emailSupplierComments(ctx: Ctx, revision: RevisionRecord, args: { rejected: boolean; note: string; items: Array<{ ref: string | null; text: string }> }) {
  const uploader = uploaderOf(revision);
  const to = uploader ? [uploader] : [reviewerOf(revision)].filter(Boolean) as ItpPerson[];
  const master = revision.project_itps;
  return deliver(ctx, revision, {
    label: args.rejected ? "Rejection notice" : "Comments",
    to,
    cc: [reviewerOf(revision), approverOf(revision), ...notifyListOf(revision)],
    subject: `ITP ${args.rejected ? "rejected" : "comments issued"}: ${itpLabel(revision)} (${projectLabel(revision)})`,
    notificationTitle: `ITP ${args.rejected ? "rejected" : "comments issued"}: ${itpLabel(revision)}`,
    spec: {
      heading: args.rejected ? "ITP rejected" : "ITP comments issued",
      intro: `${ctx.actor.name} has ${args.rejected ? "rejected" : "issued comments on"} ${master.supplier ? `${master.supplier}'s ITP` : "this ITP"}. Please pass ${args.rejected ? "the reason" : "them"} to the supplier and upload the revised ITP when it arrives.`,
      quote: args.note ? { by: `${ctx.actor.name}`, text: args.note } : undefined,
      items: args.items,
      rows: [...baseRows(revision), ["Status", "With supplier"]],
      button: "Open the ITP record",
      url: recordUrl(ctx.origin, revision),
      footer: "A new revision restarts the review at Gate 1. The comments stay on the ITP, with an Open or Closed marker for each.",
    },
  });
}

async function emailAssignment(ctx: Ctx, revision: RevisionRecord, role: "reviewer" | "approver", person: ItpPerson, previous: ItpPerson | null) {
  if (!revision.gate_due_date) return "";
  const isReviewer = role === "reviewer";
  return deliver(ctx, revision, {
    label: `${isReviewer ? "Reviewer" : "Approver"} assignment`,
    to: [person],
    cc: [previous],
    subject: `You are now the ${role} for ${itpLabel(revision)} (${projectLabel(revision)})`,
    notificationTitle: `You are now the ${role}: ${itpLabel(revision)}`,
    spec: {
      heading: `You are now the ${role}`,
      intro: `${ctx.actor.name} has assigned you as the ${role} for this ITP${previous ? `, in place of ${previous.name}` : ""}. It is waiting for you now.`,
      rows: [...baseRows(revision), [isReviewer ? "Review due" : "Approval due", longDate(revision.gate_due_date)]],
      button: isReviewer ? "Review this ITP" : "Review and approve",
      url: recordUrl(ctx.origin, revision),
      footer: "The due date counts three working days from today.",
    },
  });
}

// ---------- master (register summary) sync ----------

async function syncMaster(ctx: Ctx, revision: RevisionRecord, state: WorkflowState, dueDate: string | null, extra: Record<string, unknown> = {}) {
  const fields = masterFieldsFor(state);
  const { error } = await ctx.service
    .from("project_itps")
    .update({ ...fields, due_date: isGateOpen(state) ? dueDate : null, enshore_reviewer: revision.reviewer_name || null, updated_at: new Date().toISOString(), ...extra })
    .eq("id", revision.itp_id);
  if (error) fail(error);
}

function openGate(state: WorkflowState) {
  const now = new Date();
  return {
    workflow_state: state,
    gate_opened_at: now.toISOString(),
    gate_due_date: dueDateFrom(todayLondon(now)),
    due_reminder_sent: false,
    overdue_reminder_count: 0,
    last_reminder_on: null,
  };
}

async function updateRevision(ctx: Ctx, revision: RevisionRecord, patch: Record<string, unknown>) {
  const { data, error } = await ctx.service.from("project_itp_revisions").update(patch).eq("id", revision.id).select("*, project_itps!inner(id,project_key,document_number,title,supplier,scope)").single();
  if (error) fail(error);
  const row = data as unknown as RevisionRecord & { project_itps: ItpMasterRow | ItpMasterRow[] };
  return { ...row, project_itps: Array.isArray(row.project_itps) ? row.project_itps[0] : row.project_itps } as RevisionRecord;
}

// ---------- actions ----------

export type StartInput = { revisionId: unknown; reviewerEmail?: unknown; approverEmail?: unknown; notifyEmails?: unknown; overrideReason?: unknown };

async function resolveRoles(ctx: Ctx, input: { reviewerEmail?: unknown; approverEmail?: unknown; notifyEmails?: unknown; overrideReason?: unknown }, current: { reviewer: ItpPerson | null; approver: ItpPerson | null; notify: ItpPerson[] }) {
  const reviewer = input.reviewerEmail !== undefined ? (input.reviewerEmail ? await findPerson(ctx.service, input.reviewerEmail) : null) : current.reviewer;
  const approver = input.approverEmail !== undefined ? (input.approverEmail ? await findPerson(ctx.service, input.approverEmail) : null) : current.approver;
  const notifyRaw = input.notifyEmails !== undefined ? await findPeople(ctx.service, input.notifyEmails) : current.notify;
  const notify = dedupe(notifyRaw, [reviewer?.email || "", approver?.email || ""]);
  let override = "";
  if (reviewer && approver && sameEmail(reviewer.email, approver.email)) {
    override = cleanLine(input.overrideReason, 300);
    if (!(ctx.actor.isAdmin && override)) {
      throw new ItpWorkflowError(ctx.actor.isAdmin ? "The reviewer and approver are the same person. Give a reason to override this, or choose someone else." : "The reviewer and approver must be different people.");
    }
  }
  return { reviewer, approver, notify, override };
}

// Called straight after a new revision is uploaded: records who uploaded it, names the people, and opens Gate 1.
export async function startWorkflow(ctx: Ctx, input: StartInput) {
  const revision = await loadRevision(ctx.service, input.revisionId);
  if (!(ctx.actor.isAdmin || ctx.actor.isManager || revision.uploaded_by === ctx.actor.userId)) throw new ItpWorkflowError("Only the person who uploaded this revision, or an administrator, can start its review.", 403);
  if (revision.gate_opened_at) throw new ItpWorkflowError("The review of this revision has already started.");
  if (!revision.is_current) throw new ItpWorkflowError("Only the current revision can be reviewed.");

  const roles = await resolveRoles(ctx, input, { reviewer: null, approver: null, notify: [] });
  const opened = openGate("Awaiting Review");
  const updated = await updateRevision(ctx, revision, {
    ...opened,
    // With nobody to review it the clock has not really started, so there is no due date yet.
    gate_due_date: roles.reviewer ? opened.gate_due_date : null,
    reviewer_name: roles.reviewer?.name || null,
    reviewer_email: roles.reviewer ? normalisedEmail(roles.reviewer.email) : null,
    approver_name: roles.approver?.name || null,
    approver_email: roles.approver ? normalisedEmail(roles.approver.email) : null,
    notify_list: roles.notify,
    uploader_name: ctx.actor.name,
    uploader_email: ctx.actor.email,
    review_outcome: null, reviewed_at: null, reviewed_by_name: null, reviewed_by_email: null,
    approval_outcome: null, approved_at: null, approved_by_name: null, approved_by_email: null,
    legacy_approved: false,
    enshore_decision: "Pending Review",
    enshore_reviewed_at: null,
  });
  await syncMaster(ctx, updated, "Awaiting Review", updated.gate_due_date);
  await logActivity(ctx, updated, "uploaded", `Uploaded Rev ${updated.revision}`, updated.file_name);
  if (roles.override) await logActivity(ctx, updated, "override", "Reviewer and approver set to the same person by an administrator", roles.override);
  if (!roles.reviewer) {
    await logActivity(ctx, updated, "attention", "No reviewer assigned, so the review clock has not started", "Choose a reviewer on the ITP record to open Gate 1 and email them.");
    return { ok: true, state: updated.workflow_state, warning: "" };
  }
  await logActivity(ctx, updated, "assigned", `${roles.reviewer.name} assigned as reviewer${roles.approver ? `, ${roles.approver.name} as approver` : ""}`, `Review due ${longDate(updated.gate_due_date as string)}.`);
  const warning = await emailReviewRequest(ctx, updated);
  return { ok: true, state: updated.workflow_state, warning };
}

export type AssignInput = StartInput;

export async function assignPeople(ctx: Ctx, input: AssignInput) {
  const revision = await loadRevision(ctx.service, input.revisionId);
  const isReviewer = sameEmail(revision.reviewer_email, ctx.actor.email);
  const manager = canManage(ctx.actor, revision);
  if (!manager && !isReviewer) throw new ItpWorkflowError("Only the Quality Lead, an administrator, the uploader or the reviewer can change who is assigned.", 403);
  if (revision.workflow_state === "Approved") throw new ItpWorkflowError("This revision is approved, so its people are locked.");
  if (!revision.is_current) throw new ItpWorkflowError("Only the current revision can be changed.");
  if (!manager && input.reviewerEmail !== undefined && !sameEmail(String(input.reviewerEmail || ""), revision.reviewer_email)) {
    throw new ItpWorkflowError("Only the Quality Lead, an administrator or the uploader can change the reviewer.", 403);
  }

  const currentReviewer = reviewerOf(revision);
  const currentApprover = approverOf(revision);
  const roles = await resolveRoles(ctx, input, { reviewer: currentReviewer, approver: currentApprover, notify: notifyListOf(revision) });

  // Compare addresses directly: two empty values are "no change", which sameEmail() deliberately does not treat as equal.
  const reviewerChanged = normalisedEmail(roles.reviewer?.email) !== normalisedEmail(currentReviewer?.email);
  const approverChanged = normalisedEmail(roles.approver?.email) !== normalisedEmail(currentApprover?.email);
  const notifyChanged = JSON.stringify(roles.notify.map((p) => normalisedEmail(p.email)).sort()) !== JSON.stringify(notifyListOf(revision).map((p) => normalisedEmail(p.email)).sort());
  if (!reviewerChanged && !approverChanged && !notifyChanged) return { ok: true, warning: "", changed: false };
  if (revision.workflow_state === "Awaiting Review" && !roles.reviewer && reviewerChanged) throw new ItpWorkflowError("A review needs a reviewer. Choose another person instead of removing this one.");
  if (revision.workflow_state === "Awaiting Approval" && !roles.approver) throw new ItpWorkflowError("An approval needs an approver. Choose another person instead of removing this one.");

  const patch: Record<string, unknown> = {
    reviewer_name: roles.reviewer?.name || null,
    reviewer_email: roles.reviewer ? normalisedEmail(roles.reviewer.email) : null,
    approver_name: roles.approver?.name || null,
    approver_email: roles.approver ? normalisedEmail(roles.approver.email) : null,
    notify_list: roles.notify,
  };
  // A new person at the gate that is open restarts that gate's three-day clock.
  const gateHolderChanged =
    (revision.workflow_state === "Awaiting Review" && reviewerChanged) || (revision.workflow_state === "Awaiting Approval" && approverChanged);
  const wasUnstarted = revision.workflow_state === "Awaiting Review" && !currentReviewer && Boolean(roles.reviewer);
  if (gateHolderChanged || wasUnstarted) Object.assign(patch, openGate(revision.workflow_state));

  const updated = await updateRevision(ctx, revision, patch);
  await syncMaster(ctx, updated, updated.workflow_state, updated.gate_due_date);

  if (reviewerChanged) await logActivity(ctx, updated, "assigned", currentReviewer ? `Reviewer changed from ${currentReviewer.name} to ${roles.reviewer?.name || "nobody"}` : `${roles.reviewer?.name} assigned as reviewer`);
  if (approverChanged) await logActivity(ctx, updated, "assigned", currentApprover ? `Approver changed from ${currentApprover.name} to ${roles.approver?.name || "nobody"}` : `${roles.approver?.name} assigned as approver`);
  if (notifyChanged) await logActivity(ctx, updated, "assigned", `Also-notify list set to ${roles.notify.length ? peopleNames(roles.notify) : "nobody"}`);
  if (roles.override) await logActivity(ctx, updated, "override", "Reviewer and approver set to the same person by an administrator", roles.override);

  let warning = "";
  if (updated.workflow_state === "Awaiting Review" && roles.reviewer && (reviewerChanged || wasUnstarted)) {
    warning = wasUnstarted ? await emailReviewRequest(ctx, updated) : await emailAssignment(ctx, updated, "reviewer", roles.reviewer, currentReviewer);
  } else if (updated.workflow_state === "Awaiting Approval" && roles.approver && approverChanged) {
    warning = await emailAssignment(ctx, updated, "approver", roles.approver, currentApprover);
  }
  return { ok: true, warning, changed: true };
}

export type ReviewInput = {
  revisionId: unknown;
  decision: unknown;
  note?: unknown;
  comments?: unknown;
  approverEmail?: unknown;
};

function readComments(value: unknown) {
  const raw = Array.isArray(value) ? value : [];
  return raw
    .slice(0, 50)
    .map((item) => ({ ref: cleanLine((item as { ref?: unknown })?.ref, 60) || null, text: cleanBody((item as { text?: unknown })?.text, 2000) }))
    .filter((item) => item.text);
}

// Gate 1: only the named reviewer can decide.
export async function decideReview(ctx: Ctx, input: ReviewInput) {
  const revision = await loadRevision(ctx.service, input.revisionId);
  if (revision.workflow_state !== "Awaiting Review") throw new ItpWorkflowError("This ITP is not waiting for a review any more. Refresh the page to see where it is now.", 409);
  if (!sameEmail(revision.reviewer_email, ctx.actor.email)) throw new ItpWorkflowError(`Only ${revision.reviewer_name || "the assigned reviewer"} can record this review. You are signed in as ${ctx.actor.email}.`, 403);
  const decision = String(input.decision || "");
  const note = cleanBody(input.note, 4000);
  const now = new Date().toISOString();

  if (decision === "recommend") {
    const approver = input.approverEmail ? await findPerson(ctx.service, input.approverEmail) : approverOf(revision);
    if (!approver) throw new ItpWorkflowError("Choose who will approve this ITP before you send it on.");
    if (sameEmail(approver.email, ctx.actor.email)) throw new ItpWorkflowError("The approver cannot be the person who reviewed it. Choose someone else.");
    const updated = await updateRevision(ctx, revision, {
      ...openGate("Awaiting Approval"),
      approver_name: approver.name,
      approver_email: normalisedEmail(approver.email),
      reviewed_at: now,
      reviewed_by_name: ctx.actor.name,
      reviewed_by_email: ctx.actor.email,
      review_outcome: "Recommended",
      enshore_decision: "Pending Review",
    });
    await syncMaster(ctx, updated, "Awaiting Approval", updated.gate_due_date);
    if (note) await addComment(ctx, updated, { kind: "Review note", body: note });
    await logActivity(ctx, updated, "reviewed", "Review complete: recommended for approval", note || null);
    const warning = await emailApprovalRequest(ctx, updated, note);
    return { ok: true, state: updated.workflow_state, warning };
  }

  if (decision === "comments" || decision === "reject") {
    const rejected = decision === "reject";
    const items = rejected ? [] : readComments(input.comments);
    if (rejected && !note) throw new ItpWorkflowError("Give a reason for the rejection.");
    if (!rejected && !items.length) throw new ItpWorkflowError("Add at least one comment for the supplier.");
    const updated = await updateRevision(ctx, revision, {
      workflow_state: "With Supplier",
      gate_due_date: null,
      reviewed_at: now,
      reviewed_by_name: ctx.actor.name,
      reviewed_by_email: ctx.actor.email,
      review_outcome: rejected ? "Rejected" : "Comments Issued",
      enshore_decision: rejected ? "Rejected" : "Comments Issued",
      enshore_reviewed_at: todayLondon(),
    });
    await syncMaster(ctx, updated, "With Supplier", null, rejected ? { overall_status: "Rejected" } : {});
    if (rejected) await addComment(ctx, updated, { kind: "Supplier comment", ref: "Rejection", body: note, open: true });
    else {
      for (const item of items) await addComment(ctx, updated, { kind: "Supplier comment", ref: item.ref, body: item.text, open: true });
      if (note) await addComment(ctx, updated, { kind: "Review note", body: note });
    }
    await logActivity(ctx, updated, rejected ? "rejected" : "comments", rejected ? "Rejected" : `Comments issued to the supplier (${items.length})`, rejected ? note : note || null);
    const warning = await emailSupplierComments(ctx, updated, { rejected, note: rejected ? note : note, items: items.map((item) => ({ ref: item.ref, text: item.text })) });
    return { ok: true, state: updated.workflow_state, warning };
  }

  throw new ItpWorkflowError("Choose a decision.");
}

export type ApprovalInput = { revisionId: unknown; decision: unknown; note?: unknown };

// Gate 2: only the named approver can decide.
export async function decideApproval(ctx: Ctx, input: ApprovalInput) {
  const revision = await loadRevision(ctx.service, input.revisionId);
  if (revision.workflow_state !== "Awaiting Approval") throw new ItpWorkflowError("This ITP is not waiting for approval any more. Refresh the page to see where it is now.", 409);
  if (!sameEmail(revision.approver_email, ctx.actor.email)) throw new ItpWorkflowError(`Only ${revision.approver_name || "the assigned approver"} can record this approval. You are signed in as ${ctx.actor.email}.`, 403);
  const decision = String(input.decision || "");
  const note = cleanBody(input.note, 4000);
  const now = new Date().toISOString();

  if (decision === "approve") {
    const updated = await updateRevision(ctx, revision, {
      workflow_state: "Approved",
      gate_due_date: null,
      approved_at: now,
      approved_by_name: ctx.actor.name,
      approved_by_email: ctx.actor.email,
      approval_outcome: "Approved",
      enshore_decision: "Approved",
      enshore_reviewed_at: todayLondon(),
    });
    await syncMaster(ctx, updated, "Approved", null);
    if (note) await addComment(ctx, updated, { kind: "Approval note", body: note });
    await logActivity(ctx, updated, "approved", `Approved Rev ${updated.revision}. It is now the controlled revision`, note || null);
    const warning = await emailApproved(ctx, updated, note);
    return { ok: true, state: updated.workflow_state, warning };
  }

  if (decision === "return") {
    if (!note) throw new ItpWorkflowError("Give a reason for returning it to the reviewer.");
    const updated = await updateRevision(ctx, revision, {
      ...openGate("Awaiting Review"),
      reviewed_at: null, reviewed_by_name: null, reviewed_by_email: null, review_outcome: null,
      approval_outcome: null,
    });
    await syncMaster(ctx, updated, "Awaiting Review", updated.gate_due_date);
    await addComment(ctx, updated, { kind: "Approval note", body: note });
    await logActivity(ctx, updated, "returned", "Returned to the reviewer", note);
    const warning = await emailReturned(ctx, updated, note);
    return { ok: true, state: updated.workflow_state, warning };
  }

  if (decision === "reject") {
    if (!note) throw new ItpWorkflowError("Give a reason for the rejection.");
    const updated = await updateRevision(ctx, revision, {
      workflow_state: "With Supplier",
      gate_due_date: null,
      approval_outcome: "Rejected",
      enshore_decision: "Rejected",
      enshore_reviewed_at: todayLondon(),
    });
    await syncMaster(ctx, updated, "With Supplier", null, { overall_status: "Rejected" });
    await addComment(ctx, updated, { kind: "Supplier comment", ref: "Rejection", body: note, open: true });
    await logActivity(ctx, updated, "rejected", "Rejected back to the supplier", note);
    const warning = await emailSupplierComments(ctx, updated, { rejected: true, note, items: [] });
    return { ok: true, state: updated.workflow_state, warning };
  }

  throw new ItpWorkflowError("Choose a decision.");
}

export async function postComment(ctx: Ctx, input: { revisionId: unknown; body: unknown; ref?: unknown }) {
  const revision = await loadRevision(ctx.service, input.revisionId);
  const involved = canManage(ctx.actor, revision)
    || sameEmail(revision.reviewer_email, ctx.actor.email)
    || sameEmail(revision.approver_email, ctx.actor.email)
    || notifyListOf(revision).some((person) => sameEmail(person.email, ctx.actor.email));
  if (!involved) throw new ItpWorkflowError("Only the people on this ITP (reviewer, approver, uploader, anyone copied in) or an administrator can add comments.", 403);
  const body = cleanBody(input.body, 4000);
  if (!body) throw new ItpWorkflowError("Write a comment first.");
  const open = false;
  await ctx.service.from("project_itp_comments").insert({
    itp_id: revision.itp_id,
    revision_id: revision.id,
    project_key: revision.project_itps.project_key,
    kind: "General",
    ref: cleanLine(input.ref, 60) || null,
    body,
    author_name: ctx.actor.name,
    author_email: ctx.actor.email,
    status: open ? "Open" : null,
  }).then(({ error }) => { if (error) fail(error); });
  await logActivity(ctx, revision, "comment", "Added a comment", body.length > 200 ? `${body.slice(0, 200)}…` : body);
  return { ok: true };
}

// Opens or closes one supplier comment (for example once a new revision has dealt with it).
export async function setCommentStatus(ctx: Ctx, input: { commentId: unknown; status: unknown }) {
  const id = uuidOrThrow(input.commentId, "comment");
  const status = input.status === "Closed" ? "Closed" : input.status === "Open" ? "Open" : null;
  if (!status) throw new ItpWorkflowError("Choose Open or Closed.");
  const { data: comment, error } = await ctx.service.from("project_itp_comments").select("id,revision_id,kind,ref").eq("id", id).maybeSingle();
  if (error) fail(error);
  if (!comment) throw new ItpWorkflowError("That comment was not found.", 404);
  if (comment.kind !== "Supplier comment") throw new ItpWorkflowError("Only comments for the supplier have an Open or Closed marker.");
  const latest = await loadRevisionForItp(ctx.service, comment.revision_id as string);
  const allowed = ctx.actor.isAdmin || ctx.actor.isManager || sameEmail(latest.reviewer_email, ctx.actor.email) || sameEmail(latest.approver_email, ctx.actor.email) || sameEmail(latest.uploader_email, ctx.actor.email);
  if (!allowed) throw new ItpWorkflowError("Only the reviewer, the approver, the uploader or an administrator can open or close comments.", 403);
  const { error: updateError } = await ctx.service
    .from("project_itp_comments")
    .update({ status, closed_by_name: status === "Closed" ? ctx.actor.name : null, closed_at: status === "Closed" ? new Date().toISOString() : null })
    .eq("id", id);
  if (updateError) fail(updateError);
  await logActivity(ctx, latest, "comment", `${status === "Closed" ? "Closed" : "Reopened"} a supplier comment${comment.ref ? ` (${comment.ref})` : ""}`);
  return { ok: true };
}

async function loadRevisionForItp(service: SupabaseClient, revisionId: string) {
  return loadRevision(service, revisionId);
}

// Sends the person holding the open gate a nudge now. Once a day at most.
export async function remindHolder(ctx: Ctx, input: { revisionId: unknown }) {
  const revision = await loadRevision(ctx.service, input.revisionId);
  if (!canManage(ctx.actor, revision) && !sameEmail(revision.reviewer_email, ctx.actor.email)) throw new ItpWorkflowError("Only the Quality Lead, an administrator, the uploader or the reviewer can send a reminder.", 403);
  if (!isGateOpen(revision.workflow_state)) throw new ItpWorkflowError("Nothing is waiting on anyone for this ITP.");
  const today = todayLondon();
  if (revision.last_reminder_on === today) throw new ItpWorkflowError("A reminder has already gone out today.");
  const holder = holderOf(revision);
  if (!holder) throw new ItpWorkflowError("Nobody is assigned to this gate yet. Choose a person first.");
  const updated = await updateRevision(ctx, revision, { last_reminder_on: today });
  const warning = await sendReminder(ctx, updated, holder, { kind: "manual", daysLate: 0 });
  return { ok: true, warning };
}

// ---------- reminders (used by the daily scheduler and the manual button) ----------

async function sendReminder(ctx: Ctx, revision: RevisionRecord, holder: ItpPerson, args: { kind: "manual" | "due" | "overdue" | "unassigned"; daysLate: number; copy?: ItpPerson[] }) {
  const approval = revision.workflow_state === "Awaiting Approval";
  const what = approval ? "approval" : "review";
  const due = revision.gate_due_date ? longDate(revision.gate_due_date) : "-";
  const subject =
    args.kind === "overdue" ? `Overdue: ITP ${what} for ${itpLabel(revision)} (${args.daysLate} ${args.daysLate === 1 ? "day" : "days"})`
    : args.kind === "due" ? `Reminder: ITP ${what} due tomorrow: ${itpLabel(revision)}`
    : args.kind === "unassigned" ? `ITP needs a reviewer: ${itpLabel(revision)}`
    : `Reminder: ITP ${what} waiting for you: ${itpLabel(revision)}`;
  const intro =
    args.kind === "overdue" ? `This ${what} was due on ${due}. It is now ${args.daysLate} ${args.daysLate === 1 ? "day" : "days"} overdue.`
    : args.kind === "due" ? `This ${what} is due tomorrow, ${due}.`
    : args.kind === "unassigned" ? "This ITP was uploaded but has no reviewer, so the review has not started. Please choose a reviewer."
    : `${ctx.actor.name} asked for a quick look at this ${what}. It was due ${due}.`;
  return deliver(ctx, revision, {
    label: args.kind === "overdue" ? "Overdue reminder" : args.kind === "unassigned" ? "Reviewer reminder" : "Reminder",
    to: [holder],
    cc: args.copy || [],
    subject,
    notificationTitle: subject,
    actorForLog: args.kind === "manual" ? ctx.actor : { name: "IMS", email: "" },
    spec: {
      heading: args.kind === "overdue" ? `ITP ${what} overdue` : args.kind === "unassigned" ? "ITP needs a reviewer" : `ITP ${what} reminder`,
      intro,
      rows: [...baseRows(revision), ["Assigned", holder.name]],
      button: args.kind === "unassigned" ? "Choose a reviewer" : approval ? "Review and approve" : "Review this ITP",
      url: recordUrl(ctx.origin, revision),
      footer: args.kind === "unassigned" ? "Open the ITP record and choose a reviewer. They will be emailed straight away." : "If you cannot do this, ask the Quality Lead to reassign it.",
    },
  });
}

export type ReminderRun = { checked: number; sent: Array<{ itp: string; kind: string; to: string }>; warnings: string[] };

// Runs once a day on weekdays. Due tomorrow: one reminder. Overdue: a daily reminder for three days (the Quality Lead is
// copied on the third), then a weekly one. An ITP with no reviewer prompts whoever uploaded it.
export async function runReminders(service: SupabaseClient, origin: string, dryRun: boolean): Promise<ReminderRun> {
  const today = todayLondon();
  const { data, error } = await service
    .from("project_itp_revisions")
    .select("*, project_itps!inner(id,project_key,document_number,title,supplier,scope)")
    .eq("is_current", true)
    .in("workflow_state", ["Awaiting Review", "Awaiting Approval"]);
  if (error) fail(error);
  const rows = ((data || []) as unknown as Array<RevisionRecord & { project_itps: ItpMasterRow | ItpMasterRow[] }>).map((row) => ({
    ...row,
    project_itps: Array.isArray(row.project_itps) ? row.project_itps[0] : row.project_itps,
  })) as RevisionRecord[];

  const { data: leads } = await service.from("people").select("name,email").eq("active", true).ilike("role", "%quality lead%");
  const qualityLeads = dedupe(((leads || []) as Array<{ name: string; email: string | null }>).map((lead) => (lead.email ? { name: lead.name, email: lead.email } : null)));

  const result: ReminderRun = { checked: rows.length, sent: [], warnings: [] };
  for (const revision of rows) {
    const ctx: Ctx = { service, origin, actor: { userId: "", email: "", name: "IMS", isAdmin: false, isManager: false } };
    const holder = holderOf(revision);
    const dueDate = revision.gate_due_date;
    const opened = revision.gate_opened_at ? revision.gate_opened_at.slice(0, 10) : null;
    if (revision.last_reminder_on === today) continue;

    let plan: { kind: "due" | "overdue" | "unassigned"; daysLate: number; copy: ItpPerson[]; patch: Record<string, unknown>; to: ItpPerson | null } | null = null;

    if (!holder) {
      // No one to remind: nudge the uploader once the gate has been open for a working day, then weekly.
      const uploader = uploaderOf(revision);
      const age = opened ? daysBetween(opened, today) : 0;
      const weeklyDue = !revision.last_reminder_on || daysBetween(revision.last_reminder_on, today) >= 7;
      if (uploader && age >= 1 && weeklyDue) plan = { kind: "unassigned", daysLate: 0, copy: qualityLeads, patch: { last_reminder_on: today }, to: uploader };
    } else if (dueDate && today > dueDate) {
      const late = daysBetween(dueDate, today);
      const count = revision.overdue_reminder_count || 0;
      const weeklyDue = !revision.last_reminder_on || daysBetween(revision.last_reminder_on, today) >= 7;
      if (count < 3 || weeklyDue) {
        const next = count + 1;
        plan = { kind: "overdue", daysLate: late, copy: next >= 3 ? qualityLeads : [], patch: { overdue_reminder_count: next, last_reminder_on: today }, to: holder };
      }
    } else if (dueDate && !revision.due_reminder_sent && nextWorkingDay(today) === dueDate) {
      plan = { kind: "due", daysLate: 0, copy: [], patch: { due_reminder_sent: true, last_reminder_on: today }, to: holder };
    }

    if (!plan || !plan.to) continue;
    result.sent.push({ itp: itpLabel(revision), kind: plan.kind, to: plan.to.name });
    if (dryRun) continue;
    const warning = await sendReminder(ctx, revision, plan.to, { kind: plan.kind, daysLate: plan.daysLate, copy: plan.copy });
    if (warning) result.warnings.push(`${itpLabel(revision)}: ${warning}`);
    const { error: patchError } = await service.from("project_itp_revisions").update(plan.patch).eq("id", revision.id);
    if (patchError) result.warnings.push(`${itpLabel(revision)}: ${patchError.message}`);
  }
  return result;
}

export { GATE_DAYS };

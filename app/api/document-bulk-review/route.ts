import { NextResponse } from "next/server";
import { createClient as createServiceClient, type SupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerSupabaseClient } from "../../../src/lib/supabase/server";
import { writeNotifications } from "../../../src/lib/notifications";
import { getSiteOrigin } from "../../../src/lib/inviteLinks";
import {
  BULK_DOCUMENT_COLUMNS,
  BULK_EXPECTED_STATUS,
  buildCompletionEmail,
  buildDigestEmail,
  bulkReviewUrl,
  createBatch,
  isAwaiting,
  sendHtmlEmail,
  todayIsoDate,
  updateCurrentRevisionSnapshots,
  writeBulkActivity,
  type BulkBatch,
  type BulkDocument,
} from "../../../src/lib/documentBulkReview";

export const maxDuration = 60;

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Bulk review is not configured.");
  return createServiceClient(url, key);
}

async function signedInUser() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email) return null;
  return { email: data.user.email };
}

async function loadBatch(service: SupabaseClient, token: string) {
  const { data: batch, error } = await service.from("document_workflow_batches").select("*").eq("token", token).maybeSingle();
  if (error) throw error;
  if (!batch) return { batch: null, documents: [] as BulkDocument[], problem: "This bulk review link is not valid." };

  const typed = batch as BulkBatch;
  if (new Date(typed.expires_at).getTime() < Date.now()) {
    return { batch: typed, documents: [] as BulkDocument[], problem: "This bulk review link has expired." };
  }

  const { data: documents, error: documentsError } = await service
    .from("documents")
    .select(BULK_DOCUMENT_COLUMNS)
    .in("id", typed.document_ids);
  if (documentsError) throw documentsError;

  return { batch: typed, documents: (documents || []) as BulkDocument[], problem: "" };
}

export async function GET(request: Request) {
  try {
    const user = await signedInUser();
    if (!user) return NextResponse.json({ error: "Sign in to the IMS to use this link." }, { status: 401 });

    const token = new URL(request.url).searchParams.get("token") || "";
    const service = serviceClient();
    const { batch, documents, problem } = await loadBatch(service, token);
    if (problem || !batch) return NextResponse.json({ error: problem }, { status: 400 });

    const awaiting = documents.filter((doc) => isAwaiting(doc, batch)).sort((a, b) => a.document_number.localeCompare(b.document_number));

    return NextResponse.json({
      ok: true,
      kind: batch.kind,
      intendedName: batch.intended_name,
      intendedEmail: batch.intended_email,
      signedInAs: user.email,
      canAct: user.email.toLowerCase() === batch.intended_email.toLowerCase(),
      expiresAt: batch.expires_at,
      total: documents.length,
      doneCount: documents.length - awaiting.length,
      documents: awaiting.map((doc) => ({
        id: doc.id,
        documentNumber: doc.document_number,
        title: doc.title,
        revision: doc.current_revision,
        issueDate: doc.issue_date,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load the bulk review." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await signedInUser();
    if (!user) return NextResponse.json({ error: "Sign in to the IMS to use this link." }, { status: 401 });

    const body = (await request.json()) as { token?: string; documentIds?: string[] };
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const service = serviceClient();
    const { batch, documents, problem } = await loadBatch(service, token);
    if (problem || !batch) return NextResponse.json({ error: problem }, { status: 400 });

    // The link only works for the person it was sent to, so the activity log records who actually confirmed it.
    if (user.email.toLowerCase() !== batch.intended_email.toLowerCase()) {
      return NextResponse.json(
        { error: `This link is for ${batch.intended_name || batch.intended_email}. You are signed in as ${user.email}.` },
        { status: 403 }
      );
    }

    const chosen = Array.isArray(body.documentIds) ? new Set(body.documentIds) : null;
    const actionable = documents.filter((doc) => isAwaiting(doc, batch) && (!chosen || chosen.has(doc.id)));
    if (!actionable.length) {
      return NextResponse.json({ error: "There is nothing left on this link to confirm." }, { status: 400 });
    }

    const today = todayIsoDate();
    const actorName = batch.intended_name || user.email;
    const warnings: string[] = [];
    let message = "";

    if (batch.kind === "review") {
      const withApprover = actionable.filter((doc) => (doc.workflow_approver_email || "").includes("@"));
      const withoutApprover = actionable.filter((doc) => !(doc.workflow_approver_email || "").includes("@"));

      const reviewFields = {
        status: "Under Review",
        review_approval_status: "Reviewed",
        reviewed_by: actorName,
        reviewed_at: today,
        rejected_by: null,
        rejected_at: null,
        rejection_reason: null,
      };

      if (withApprover.length) {
        const { error } = await service
          .from("documents")
          .update({ ...reviewFields, workflow_status: "Pending Approval" })
          .in("id", withApprover.map((doc) => doc.id))
          .eq("workflow_status", BULK_EXPECTED_STATUS.review);
        if (error) throw error;
      }
      if (withoutApprover.length) {
        const { error } = await service
          .from("documents")
          .update({ ...reviewFields, workflow_status: "Reviewed" })
          .in("id", withoutApprover.map((doc) => doc.id))
          .eq("workflow_status", BULK_EXPECTED_STATUS.review);
        if (error) throw error;
      }

      const snapshotError = await updateCurrentRevisionSnapshots(service, actionable, { reviewed_by: actorName, reviewed_at: today });
      if (snapshotError) warnings.push(`Revision history: ${snapshotError}`);

      const reviewedNote = `Review accepted from the bulk review email link by ${actorName}.`;
      const activityError = await writeBulkActivity(service, withApprover, {
        action: "accept_review",
        fromStatus: "Pending Review",
        toStatus: "Pending Approval",
        actorName,
        actorEmail: user.email,
        note: () => reviewedNote,
      });
      const activityError2 = await writeBulkActivity(service, withoutApprover, {
        action: "accept_review",
        fromStatus: "Pending Review",
        toStatus: "Reviewed",
        actorName,
        actorEmail: user.email,
        note: () => reviewedNote,
      });
      if (activityError || activityError2) warnings.push(`Activity log: ${activityError || activityError2}`);

      // Each approver gets their own request covering the documents that are theirs to approve.
      const origin = getSiteOrigin(request) || new URL(request.url).origin;
      const byApprover = new Map<string, BulkDocument[]>();
      for (const doc of withApprover) {
        const key = (doc.workflow_approver_email || "").trim().toLowerCase();
        byApprover.set(key, [...(byApprover.get(key) || []), doc]);
      }

      const forwarded: string[] = [];
      for (const [approverEmail, docs] of byApprover) {
        const approverName = docs[0].workflow_approver_name || approverEmail;
        const created = await createBatch(service, {
          kind: "approval",
          intendedName: approverName,
          intendedEmail: approverEmail,
          documentIds: docs.map((doc) => doc.id),
          createdBy: user.email,
          parentBatchId: batch.id,
        });
        if (!created.batch) {
          warnings.push(`Approver request for ${approverName}: ${created.error}`);
          continue;
        }

        const url = bulkReviewUrl(origin, created.batch.token);
        const email = buildDigestEmail({ kind: "approval", name: approverName, documents: docs, url });
        const emailError = await sendHtmlEmail({ to: [approverEmail], subject: email.subject, html: email.html });
        if (emailError) warnings.push(`Email to ${approverName}: ${emailError}`);

        await writeBulkActivity(service, docs, {
          action: "sent_to_approver",
          fromStatus: "Reviewed",
          toStatus: "Pending Approval",
          actorName,
          actorEmail: user.email,
          note: () => `Approver: ${approverName}`,
        });
        await writeNotifications([
          { recipientEmail: approverEmail, sourceModule: "Document Control", title: `${docs.length} documents ready for your approval`, body: `Reviewed by ${actorName}`, link: `/documents/bulk-review?token=${encodeURIComponent(created.batch.token)}` },
        ]);
        forwarded.push(`${approverName} (${docs.length})`);
      }

      message = forwarded.length
        ? `Review accepted for ${actionable.length} documents. The approver has been emailed: ${forwarded.join(", ")}.`
        : `Review accepted for ${actionable.length} documents.`;
    } else {
      const { error } = await service
        .from("documents")
        .update({
          status: "Live",
          review_approval_status: "Approved",
          workflow_status: "Approved",
          approved_by: actorName,
          approved_at: today,
          rejected_by: null,
          rejected_at: null,
          rejection_reason: null,
        })
        .in("id", actionable.map((doc) => doc.id))
        .eq("workflow_status", BULK_EXPECTED_STATUS.approval);
      if (error) throw error;

      const snapshotError = await updateCurrentRevisionSnapshots(service, actionable, { approved_by: actorName, approved_at: today });
      if (snapshotError) warnings.push(`Revision history: ${snapshotError}`);

      const activityError = await writeBulkActivity(service, actionable, {
        action: "approve_document",
        fromStatus: "Pending Approval",
        toStatus: "Approved",
        actorName,
        actorEmail: user.email,
        note: () => `Document approved from the bulk approval email link by ${actorName}.`,
      });
      if (activityError) warnings.push(`Activity log: ${activityError}`);

      // One summary email to the people who reviewed and approved, not one per document.
      const recipients = Array.from(new Set([user.email, ...actionable.map((doc) => doc.workflow_reviewer_email || "")]));
      const email = buildCompletionEmail({
        actorName,
        documents: actionable,
        nextReviewNote: "The next review date for each has been reset from today using its review cycle.",
      });
      const emailError = await sendHtmlEmail({ to: recipients, subject: email.subject, html: email.html });
      if (emailError) warnings.push(`Confirmation email: ${emailError}`);

      message = `Approved ${actionable.length} documents. They are now live.`;
    }

    // Once nothing on the link is waiting any more, the batch is closed.
    const remaining = documents.filter((doc) => isAwaiting(doc, batch) && !actionable.some((done) => done.id === doc.id));
    if (!remaining.length) {
      await service
        .from("document_workflow_batches")
        .update({ completed_at: new Date().toISOString(), completed_by: user.email, completed_count: documents.length })
        .eq("id", batch.id);
    }

    return NextResponse.json({
      ok: true,
      processed: actionable.length,
      remaining: remaining.length,
      message: warnings.length ? `${message} Warning: ${warnings.join(" ")}` : message,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to complete the bulk review." }, { status: 500 });
  }
}

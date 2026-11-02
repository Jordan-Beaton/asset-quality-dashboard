import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { SPEAK_UP_EVIDENCE_BUCKET, SPEAK_UP_LIMITS } from "../../../../src/lib/speakUpConfig";
import {
  SpeakUpError,
  assertCaseAccess,
  b64,
  failFrom,
  logAudit,
  rateLimit,
  requireHandler,
  requireSameOrigin,
  serviceClient,
} from "../../../../src/lib/speakUpServer";

export const runtime = "nodejs";
export const preferredRegion = "arn1";
export const maxDuration = 30;

// A handler attaches a document to a case. It arrives already locked with the case key, so the server stores it without ever
// being able to read it. One file per request.
export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  try {
    requireSameOrigin(request);
    rateLimit(request, "handler-file", 60, 60 * 60 * 1000);
    const supabase = serviceClient();
    const { handler } = await requireHandler(supabase);
    const { caseRow } = await assertCaseAccess(supabase, handler, request.headers.get("x-speakup-case"));
    if (caseRow.status === "Closed") throw new SpeakUpError("This case is closed. Reopen it before adding a document.");

    const limit = SPEAK_UP_LIMITS.evidenceBytes + 1024;
    if (Number(request.headers.get("content-length") || 0) > limit) throw new SpeakUpError("That file is too large to attach.", 413);
    const data = new Uint8Array(await request.arrayBuffer());
    if (!data.length || data.length > limit) throw new SpeakUpError("That file is too large to attach.", 413);

    const fileIv = b64(request.headers.get("x-speakup-iv"), 40, "file");
    const nameCipher = b64(request.headers.get("x-speakup-name"), 2000, "file name");
    const nameIv = b64(request.headers.get("x-speakup-name-iv"), 40, "file name");

    const { count } = await supabase.from("speak_up_evidence").select("id", { count: "exact", head: true }).eq("case_id", caseRow.id).eq("added_by", "handler");
    if ((count || 0) >= SPEAK_UP_LIMITS.documentFiles) throw new SpeakUpError(`A case can hold up to ${SPEAK_UP_LIMITS.documentFiles} documents from handlers.`);

    const path = `${caseRow.id}/${randomUUID()}`;
    const upload = await supabase.storage.from(SPEAK_UP_EVIDENCE_BUCKET).upload(path, data, { contentType: "application/octet-stream", upsert: false });
    if (upload.error) throw new SpeakUpError("The file could not be saved.", 500);
    const { data: row, error } = await supabase.from("speak_up_evidence").insert({ case_id: caseRow.id, storage_path: path, size_bytes: data.length, file_iv: fileIv, name_cipher: nameCipher, name_iv: nameIv, added_by: "handler", added_by_handler_id: handler.id }).select("id").single();
    if (error || !row) {
      await supabase.storage.from(SPEAK_UP_EVIDENCE_BUCKET).remove([path]);
      failFrom(error || { message: "The file could not be recorded." });
    }
    await logAudit(supabase, { caseId: caseRow.id, reference: caseRow.reference, handler, type: "document_added" });
    return NextResponse.json({ ok: true, id: row.id }, { headers });
  } catch (error) {
    if (error instanceof SpeakUpError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    return NextResponse.json({ error: "The file could not be added." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { SPEAK_UP_EVIDENCE_BUCKET, SPEAK_UP_LIMITS } from "../../../../src/lib/speakUpConfig";
import {
  SpeakUpError,
  b64,
  failFrom,
  logAudit,
  openCaseByCode,
  rateLimit,
  requirePublicChannelOpen,
  serviceClient,
} from "../../../../src/lib/speakUpServer";

export const runtime = "nodejs";
export const preferredRegion = "arn1";
export const maxDuration = 30;

// Photos come here already encrypted and are passed on to storage by the server, so the reporter's own device never
// contacts the storage service directly and its network address is never seen there. One file per request.
export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  try {
    requirePublicChannelOpen();
    rateLimit(request, "evidence", 30, 60 * 60 * 1000);
    const supabase = serviceClient();
    const found = await openCaseByCode(supabase, request.headers.get("x-speakup-reference"), request.headers.get("x-speakup-token"));
    if (found.status === "Closed") throw new SpeakUpError("This case has been closed.");

    const declared = Number(request.headers.get("content-length") || 0);
    const limit = SPEAK_UP_LIMITS.evidenceBytes + 1024;
    if (declared > limit) throw new SpeakUpError("That photo is too large.", 413);
    const data = new Uint8Array(await request.arrayBuffer());
    if (!data.length || data.length > limit) throw new SpeakUpError("That photo is too large.", 413);

    const fileIv = b64(request.headers.get("x-speakup-iv"), 40, "file");
    const nameCipher = b64(request.headers.get("x-speakup-name"), 2000, "file name");
    const nameIv = b64(request.headers.get("x-speakup-name-iv"), 40, "file name");

    const { count } = await supabase.from("speak_up_evidence").select("id", { count: "exact", head: true }).eq("case_id", found.id);
    if ((count || 0) >= SPEAK_UP_LIMITS.evidenceFiles) throw new SpeakUpError(`A case can hold up to ${SPEAK_UP_LIMITS.evidenceFiles} files.`);

    const path = `${found.id}/${randomUUID()}`;
    const upload = await supabase.storage.from(SPEAK_UP_EVIDENCE_BUCKET).upload(path, data, { contentType: "application/octet-stream", upsert: false });
    if (upload.error) throw new SpeakUpError("The file could not be saved.", 500);
    const { error } = await supabase.from("speak_up_evidence").insert({ case_id: found.id, storage_path: path, size_bytes: data.length, file_iv: fileIv, name_cipher: nameCipher, name_iv: nameIv });
    if (error) {
      await supabase.storage.from(SPEAK_UP_EVIDENCE_BUCKET).remove([path]);
      failFrom(error);
    }
    await logAudit(supabase, { caseId: found.id, reference: found.reference, type: "evidence_added" });
    return NextResponse.json({ ok: true }, { headers });
  } catch (error) {
    if (error instanceof SpeakUpError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

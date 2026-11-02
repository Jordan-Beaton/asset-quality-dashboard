import { NextResponse } from "next/server";
import { SPEAK_UP_EVIDENCE_BUCKET } from "../../../../../src/lib/speakUpConfig";
import {
  SpeakUpError,
  failFrom,
  openCaseByCode,
  rateLimit,
  requirePublicChannelOpen,
  serviceClient,
  text,
} from "../../../../../src/lib/speakUpServer";

export const runtime = "nodejs";
export const preferredRegion = "arn1";
export const maxDuration = 30;

// A reporter downloads a document a handler attached to their case. The server fetches the still-locked file and passes it on,
// so the reporter's device never contacts the storage service and its network address is never seen there. The file is
// unlocked in the reporter's browser.
export async function POST(request: Request) {
  try {
    requirePublicChannelOpen();
    rateLimit(request, "evidence-download", 60, 60 * 60 * 1000);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw new SpeakUpError("The request could not be read.");
    const supabase = serviceClient();
    const found = await openCaseByCode(supabase, body.reference, body.authToken);
    const { data: file, error } = await supabase.from("speak_up_evidence").select("storage_path").eq("id", text(body.evidenceId, 40)).eq("case_id", found.id).eq("added_by", "handler").maybeSingle();
    if (error) failFrom(error);
    if (!file) throw new SpeakUpError("That document could not be found.", 404);
    const download = await supabase.storage.from(SPEAK_UP_EVIDENCE_BUCKET).download(file.storage_path as string);
    if (download.error || !download.data) throw new SpeakUpError("The document could not be opened.", 500);
    return new Response(await download.data.arrayBuffer(), { status: 200, headers: { "Content-Type": "application/octet-stream", "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SpeakUpError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    return NextResponse.json({ error: "The document could not be opened." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "../../../../src/lib/supabase/server";
import { extractLessonDocument, extractLessonDocumentWithAi } from "../../../../src/lib/lessonDocumentExtraction";
import { lessonsBusinessApiKey } from "../../../../src/lib/lessonsPreventionServer";

export const runtime = "nodejs";
export const maxDuration = 300;
const MAX_REVIEW_FILE_BYTES = 50 * 1024 * 1024;

export async function POST(request: Request) {
  let storagePath = "";
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const body = await request.json() as { storagePath?: unknown; fileName?: unknown; fileSize?: unknown };
    storagePath = typeof body.storagePath === "string" ? body.storagePath : "";
    const fileName = typeof body.fileName === "string" ? body.fileName : "";
    const fileSize = Number(body.fileSize || 0);
    if (!storagePath || !fileName) return NextResponse.json({ error: "Choose a Word or PDF document to review." }, { status: 400 });
    if (fileSize > MAX_REVIEW_FILE_BYTES) return NextResponse.json({ error: "The document exceeds the 50 MB review limit." }, { status: 413 });
    if (!/\.(pdf|doc|docx|txt)$/i.test(fileName)) return NextResponse.json({ error: "Upload a PDF, Word (.doc or .docx), or text document." }, { status: 415 });
    const { data: storedFile, error: downloadError } = await supabase.storage.from("lessons-learned-evidence").download(storagePath);
    if (downloadError || !storedFile) throw new Error(downloadError?.message || "The uploaded document could not be opened.");
    const buffer = Buffer.from(await storedFile.arrayBuffer());
    let documentText = "";
    try { documentText = (await extractLessonDocument(buffer, fileName)).replace(/\s+/g, " ").trim(); } catch { /* AI-native fallback below. */ }
    if (documentText.length < 100) {
      const apiKey = lessonsBusinessApiKey();
      if (!apiKey) return NextResponse.json({ error: "Prevention Intelligence is awaiting the Enshore business API key." }, { status: 503 });
      documentText = (await extractLessonDocumentWithAi(apiKey, buffer, fileName)).replace(/\s+/g, " ").trim();
    }
    if (documentText.length < 100) return NextResponse.json({ error: "The document could not be read. It may be encrypted, password protected, corrupt, or contain no readable content." }, { status: 422 });
    const extractedPath = `${storagePath}.extracted.txt`;
    const { error: uploadError } = await supabase.storage.from("lessons-learned-evidence").upload(extractedPath, new Blob([documentText], { type: "text/plain" }), { contentType: "text/plain", upsert: true });
    if (uploadError) throw uploadError;
    return NextResponse.json({ extractedPath, characters: documentText.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Document extraction failed." }, { status: 500 });
  } finally {
    if (storagePath) {
      try { const supabase = await createClient(); await supabase.storage.from("lessons-learned-evidence").remove([storagePath]); } catch { /* The review client also performs cleanup. */ }
    }
  }
}

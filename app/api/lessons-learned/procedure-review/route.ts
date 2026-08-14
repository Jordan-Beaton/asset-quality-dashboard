import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { createClient } from "../../../../src/lib/supabase/server";
import { generatePreventionBrief, lessonsBusinessApiKey, loadAllPreventionLessons, retrievePreventionEvidence } from "../../../../src/lib/lessonsPreventionServer";

export const runtime = "nodejs";
export const maxDuration = 300;

async function extractDocument(buffer: Buffer, fileName: string) {
  const name = fileName.toLowerCase();
  if (name.endsWith(".docx")) return (await mammoth.extractRawText({ buffer })).value;
  if (name.endsWith(".pdf")) {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try { return (await parser.getText()).text; } finally { await parser.destroy(); }
  }
  if (name.endsWith(".txt")) return buffer.toString("utf8");
  throw new Error("Upload a PDF, Word (.docx), or text procedure.");
}

async function extractDocumentWithAi(apiKey: string, buffer: Buffer, fileName: string) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_LESSONS_MODEL || "gpt-5-mini",
      input: [{ role: "user", content: [
        { type: "input_text", text: "Extract the operationally meaningful content from this document as plain text. Preserve requirements, controls, hazards, responsibilities, checks, hold points and tables. Do not analyse or add information." },
        { type: "input_file", filename: fileName, file_data: buffer.toString("base64") },
      ] }],
      reasoning: { effort: "low" }, max_output_tokens: 12000, store: false,
    }),
    signal: AbortSignal.timeout(120000),
  });
  const payload = await response.json() as { error?: { message?: string }; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  if (!response.ok) throw new Error(payload.error?.message || "AI document extraction failed.");
  return (payload.output || []).flatMap((item) => item.content || []).filter((item) => item.type === "output_text").map((item) => item.text || "").join("\n");
}

export async function POST(request: Request) {
  let cleanupPath = "";
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const apiKey = lessonsBusinessApiKey();
    if (!apiKey) return NextResponse.json({ error: "Prevention Intelligence is awaiting the Enshore business API key." }, { status: 503 });
    const body = await request.json() as { question?: unknown; storagePath?: unknown; fileName?: unknown; contentType?: unknown; fileSize?: unknown };
    const storagePath = typeof body.storagePath === "string" ? body.storagePath : "";
    cleanupPath = storagePath;
    const fileName = typeof body.fileName === "string" ? body.fileName : "";
    const fileSize = Number(body.fileSize || 0);
    if (!storagePath || !fileName) return NextResponse.json({ error: "Choose a Word or PDF document to review." }, { status: 400 });
    if (fileSize > 20 * 1024 * 1024) return NextResponse.json({ error: "The document exceeds the 20 MB review limit." }, { status: 413 });
    if (!/\.(pdf|doc|docx|txt)$/i.test(fileName)) return NextResponse.json({ error: "Upload a PDF, Word (.doc or .docx), or text document." }, { status: 415 });
    const { data: storedFile, error: downloadError } = await supabase.storage.from("lessons-learned-evidence").download(storagePath);
    if (downloadError || !storedFile) throw new Error(downloadError?.message || "The uploaded document could not be opened.");
    const buffer = Buffer.from(await storedFile.arrayBuffer());
    const questionValue = body.question;
    const question = typeof questionValue === "string" && questionValue.trim()
      ? questionValue.trim()
      : `Review ${fileName} against historic failure lessons and identify the most important controls or cautions that should be considered.`;
    let documentText = "";
    try { documentText = (await extractDocument(buffer, fileName)).replace(/\s+/g, " ").trim(); } catch { /* AI-native extraction handles unsupported internal structures. */ }
    if (documentText.length < 100) documentText = (await extractDocumentWithAi(apiKey, buffer, fileName)).replace(/\s+/g, " ").trim();
    if (documentText.length < 100) return NextResponse.json({ error: "The document could not be read. It may be encrypted, password protected, corrupt, or contain no readable content." }, { status: 422 });
    const lessons = await loadAllPreventionLessons(supabase);
    const retrievalQuery = `${question}\nProcedure content: ${documentText.slice(0, 12000)}`;
    const retrieval = await retrievePreventionEvidence(supabase, apiKey, retrievalQuery, lessons);
    const procedureCandidates = retrieval.candidates.slice(0, 80);
    const result = await generatePreventionBrief(apiKey, question, procedureCandidates, { name: fileName, text: documentText });
    result.evidence_count = procedureCandidates.length;
    result.screened_count = retrieval.screenedCount;
    result.retrieval_mode = retrieval.mode;
    result.sources = procedureCandidates.filter((lesson) => result.matched_lesson_ids.includes(lesson.id)).map((lesson) => ({ id: lesson.id, lesson_number: lesson.lesson_number, subject: lesson.subject, project: [lesson.project_code, lesson.project_name].filter(Boolean).join(" · ") }));
    const { data: audit } = await supabase.from("lessons_learned_ai_analyses").insert({
      analysis_type: "procedure_review",
      question,
      document_name: fileName,
      result,
      supporting_lesson_ids: result.matched_lesson_ids,
      retrieval_mode: retrieval.mode,
      model: process.env.OPENAI_LESSONS_MODEL || "gpt-5-mini",
      created_by: auth.user.id,
    }).select("id").maybeSingle();
    if (audit?.id) result.analysis_id = audit.id;
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The procedure review failed." }, { status: 500 });
  } finally {
    if (cleanupPath) {
      try { const supabase = await createClient(); await supabase.storage.from("lessons-learned-evidence").remove([cleanupPath]); } catch { /* Temporary uploads expire from the active workflow even if cleanup is deferred. */ }
    }
  }
}

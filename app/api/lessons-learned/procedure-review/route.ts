import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { createClient } from "../../../../src/lib/supabase/server";
import { generatePreventionBrief, lessonsBusinessApiKey, loadAllPreventionLessons, retrievePreventionEvidence } from "../../../../src/lib/lessonsPreventionServer";

export const runtime = "nodejs";
export const maxDuration = 300;

async function extractDocument(file: File) {
  if (file.size > 20 * 1024 * 1024) throw new Error("The procedure exceeds the 20 MB review limit.");
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  if (name.endsWith(".docx")) return (await mammoth.extractRawText({ buffer })).value;
  if (name.endsWith(".pdf")) {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try { return (await parser.getText()).text; } finally { await parser.destroy(); }
  }
  if (name.endsWith(".txt")) return buffer.toString("utf8");
  throw new Error("Upload a PDF, Word (.docx), or text procedure.");
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const apiKey = lessonsBusinessApiKey();
    if (!apiKey) return NextResponse.json({ error: "Prevention Intelligence is awaiting the Enshore business API key." }, { status: 503 });
    const form = await request.formData();
    const file = form.get("file");
    const questionValue = form.get("question");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a procedure to review." }, { status: 400 });
    const question = typeof questionValue === "string" && questionValue.trim()
      ? questionValue.trim()
      : `Review ${file.name} against historic failure lessons and identify the most important controls or cautions that should be considered.`;
    const documentText = (await extractDocument(file)).replace(/\s+/g, " ").trim();
    if (documentText.length < 100) return NextResponse.json({ error: "The uploaded procedure did not contain enough readable text." }, { status: 422 });
    const lessons = await loadAllPreventionLessons(supabase);
    const retrievalQuery = `${question}\nProcedure content: ${documentText.slice(0, 12000)}`;
    const retrieval = await retrievePreventionEvidence(supabase, apiKey, retrievalQuery, lessons);
    const result = await generatePreventionBrief(apiKey, question, retrieval.candidates, { name: file.name, text: documentText });
    result.evidence_count = retrieval.candidates.length;
    result.retrieval_mode = retrieval.mode;
    result.sources = retrieval.candidates.filter((lesson) => result.matched_lesson_ids.includes(lesson.id)).map((lesson) => ({ id: lesson.id, lesson_number: lesson.lesson_number, subject: lesson.subject, project: [lesson.project_code, lesson.project_name].filter(Boolean).join(" · ") }));
    const { data: audit } = await supabase.from("lessons_learned_ai_analyses").insert({
      analysis_type: "procedure_review",
      question,
      document_name: file.name,
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
  }
}

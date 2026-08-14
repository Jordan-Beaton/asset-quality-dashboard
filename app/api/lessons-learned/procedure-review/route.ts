import { NextResponse } from "next/server";
import { createClient } from "../../../../src/lib/supabase/server";
import { generatePreventionBrief, lessonsBusinessApiKey, loadAllPreventionLessons, retrievePreventionEvidence } from "../../../../src/lib/lessonsPreventionServer";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  let cleanupPath = "";
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const apiKey = lessonsBusinessApiKey();
    if (!apiKey) return NextResponse.json({ error: "Prevention Intelligence is awaiting the Enshore business API key." }, { status: 503 });
    const body = await request.json() as { question?: unknown; extractedPath?: unknown; fileName?: unknown };
    const extractedPath = typeof body.extractedPath === "string" ? body.extractedPath : "";
    cleanupPath = extractedPath;
    const fileName = typeof body.fileName === "string" ? body.fileName : "";
    if (!extractedPath || !fileName) return NextResponse.json({ error: "Extract the selected document before review." }, { status: 400 });
    const { data: storedFile, error: downloadError } = await supabase.storage.from("lessons-learned-evidence").download(extractedPath);
    if (downloadError || !storedFile) throw new Error(downloadError?.message || "The uploaded document could not be opened.");
    const documentText = (await storedFile.text()).trim();
    const questionValue = body.question;
    const question = typeof questionValue === "string" && questionValue.trim()
      ? questionValue.trim()
      : `Review ${fileName} against historic failure lessons and identify the most important controls or cautions that should be considered.`;
    if (documentText.length < 100) return NextResponse.json({ error: "The document could not be read. It may be encrypted, password protected, corrupt, or contain no readable content." }, { status: 422 });
    const lessons = await loadAllPreventionLessons(supabase);
    const retrievalQuery = `${question}\nProcedure content: ${documentText.slice(0, 12000)}`;
    const retrieval = await retrievePreventionEvidence(supabase, apiKey, retrievalQuery, lessons);
    const procedureCandidates = retrieval.candidates.slice(0, 40);
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

import { NextResponse } from "next/server";
import { createClient } from "../../../../src/lib/supabase/server";
import { generatePreventionBrief, lessonsBusinessApiKey, loadAllPreventionLessons, retrievePreventionEvidence } from "../../../../src/lib/lessonsPreventionServer";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const apiKey = lessonsBusinessApiKey();
    if (!apiKey) return NextResponse.json({ error: "Prevention Intelligence is awaiting the Enshore business API key." }, { status: 503 });
    const body = await request.json() as { question?: unknown };
    const question = typeof body.question === "string" ? body.question.trim() : "";
    if (question.length < 8) return NextResponse.json({ error: "Enter a specific activity, risk, operation, or prevention question." }, { status: 400 });
    if (question.length > 2000) return NextResponse.json({ error: "Keep the question below 2,000 characters." }, { status: 400 });
    const lessons = await loadAllPreventionLessons(supabase);
    const retrieval = await retrievePreventionEvidence(supabase, apiKey, question, lessons);
    const result = await generatePreventionBrief(apiKey, question, retrieval.candidates);
    result.evidence_count = retrieval.candidates.length;
    result.screened_count = retrieval.screenedCount;
    result.retrieval_mode = retrieval.mode;
    result.sources = retrieval.candidates.map((lesson) => ({
      id: lesson.id,
      lesson_number: lesson.lesson_number,
      subject: lesson.subject,
      project: [lesson.project_code, lesson.project_name].filter(Boolean).join(" · "),
      issue_description: lesson.issue_description,
      lesson_learned: lesson.lesson_learned,
      recommended_action: lesson.recommended_action || "",
    }));
    const { data: audit } = await supabase.from("lessons_learned_ai_analyses").insert({
      analysis_type: "question",
      question,
      result,
      supporting_lesson_ids: result.matched_lesson_ids,
      retrieval_mode: retrieval.mode,
      model: process.env.OPENAI_LESSONS_MODEL || "gpt-5-mini",
      created_by: auth.user.id,
    }).select("id").maybeSingle();
    if (audit?.id) result.analysis_id = audit.id;
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Prevention analysis failed." }, { status: 500 });
  }
}

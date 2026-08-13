import { NextResponse } from "next/server";
import { createClient } from "../../../../src/lib/supabase/server";
import { embedLessonBatch, lessonsBusinessApiKey, loadAllPreventionLessons } from "../../../../src/lib/lessonsPreventionServer";

export const runtime = "nodejs";
export const maxDuration = 300;

async function context() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

export async function GET() {
  const { supabase, user } = await context();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { count: total } = await supabase.from("lessons_learned").select("id", { count: "exact", head: true }).eq("outcome_type", "Failure");
  const { count: indexed, error } = await supabase.from("lessons_learned_ai_index").select("lesson_id", { count: "exact", head: true });
  return NextResponse.json({ configured: Boolean(lessonsBusinessApiKey()), migration_required: Boolean(error), total: total || 0, indexed: error ? 0 : indexed || 0 });
}

export async function POST() {
  try {
    const { supabase, user } = await context();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const email = (user.email || "").toLowerCase();
    const { data: person } = await supabase.from("people").select("is_master_admin").ilike("email", email).maybeSingle();
    if (email !== "jbeaton@enshoresubsea.com" && !person?.is_master_admin) return NextResponse.json({ error: "Master Admin access is required to rebuild the semantic index." }, { status: 403 });
    const apiKey = lessonsBusinessApiKey();
    if (!apiKey) return NextResponse.json({ error: "Add OPENAI_BUSINESS_API_KEY before building the semantic index." }, { status: 503 });
    const lessons = await loadAllPreventionLessons(supabase);
    const { data: indexed, error } = await supabase.from("lessons_learned_ai_index").select("lesson_id,content_hash");
    if (error) return NextResponse.json({ error: "Apply scripts/sql/lessons_learned_prevention_ai.sql in Supabase first." }, { status: 409 });
    const current = new Map((indexed || []).map((row) => [row.lesson_id, row.content_hash]));
    const pending = lessons.filter((lesson) => current.get(lesson.id) !== `${lesson.updated_at || ""}:${[lesson.project_code, lesson.project_name, lesson.department, lesson.assets, lesson.stage_phase, lesson.criticality, lesson.subject, lesson.issue_description, lesson.root_cause, lesson.lesson_learned, lesson.recommended_action].filter(Boolean).join("\n").slice(0, 12000).length}`);
    const batch = pending.slice(0, 50);
    const processed = await embedLessonBatch(supabase, apiKey, batch);
    return NextResponse.json({ processed, remaining: Math.max(0, pending.length - processed), indexed: lessons.length - pending.length + processed, total: lessons.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Semantic indexing failed." }, { status: 500 });
  }
}

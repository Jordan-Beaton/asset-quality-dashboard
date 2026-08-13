import { NextResponse } from "next/server";
import { createClient } from "../../../../src/lib/supabase/server";
import { embedLessonBatch, lessonsBusinessApiKey, loadAllPreventionLessons, loadPreventionLessonsByIds } from "../../../../src/lib/lessonsPreventionServer";

export const runtime = "nodejs";
export const maxDuration = 300;

async function context() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

async function loadIndexedRows(supabase: Awaited<ReturnType<typeof createClient>>) {
  const rows: Array<{ lesson_id: string; content_hash: string }> = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("lessons_learned_ai_index").select("lesson_id,content_hash").order("lesson_id").range(from, from + 999);
    if (error) throw error;
    const page = (data || []) as Array<{ lesson_id: string; content_hash: string }>;
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

export async function GET() {
  const { supabase, user } = await context();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { count: total } = await supabase.from("lessons_learned").select("id", { count: "exact", head: true }).eq("outcome_type", "Failure");
  const { count: indexed, error } = await supabase.from("lessons_learned_ai_index").select("lesson_id", { count: "exact", head: true });
  return NextResponse.json({ configured: Boolean(lessonsBusinessApiKey()), migration_required: Boolean(error), total: total || 0, indexed: error ? 0 : indexed || 0 });
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await context();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const payload = await request.json().catch(() => ({})) as { lessonIds?: unknown };
    const lessonIds = Array.isArray(payload.lessonIds) ? [...new Set(payload.lessonIds.filter((id): id is string => typeof id === "string" && id.length > 0))].slice(0, 20) : [];
    const isIncremental = lessonIds.length > 0;
    const email = (user.email || "").toLowerCase();
    const { data: person } = await supabase.from("people").select("is_master_admin").ilike("email", email).maybeSingle();
    if (!isIncremental && email !== "jbeaton@enshoresubsea.com" && !person?.is_master_admin) return NextResponse.json({ error: "Master Admin access is required to rebuild the semantic index." }, { status: 403 });
    const apiKey = lessonsBusinessApiKey();
    if (!apiKey) return NextResponse.json({ error: "Add OPENAI_BUSINESS_API_KEY before building the semantic index." }, { status: 503 });
    if (isIncremental) {
      const lessons = await loadPreventionLessonsByIds(supabase, lessonIds);
      const failureIds = new Set(lessons.map((lesson) => lesson.id));
      const removedIds = lessonIds.filter((id) => !failureIds.has(id));
      if (removedIds.length) {
        const { error: deleteError } = await supabase.from("lessons_learned_ai_index").delete().in("lesson_id", removedIds);
        if (deleteError) throw deleteError;
      }
      const processed = await embedLessonBatch(supabase, apiKey, lessons);
      return NextResponse.json({ processed, removed: removedIds.length, automatic: true });
    }
    const lessons = await loadAllPreventionLessons(supabase);
    let indexed: Array<{ lesson_id: string; content_hash: string }>;
    try { indexed = await loadIndexedRows(supabase); }
    catch { return NextResponse.json({ error: "Apply scripts/sql/lessons_learned_prevention_ai.sql in Supabase first." }, { status: 409 }); }
    const current = new Map(indexed.map((row) => [row.lesson_id, row.content_hash]));
    const pending = lessons.filter((lesson) => current.get(lesson.id) !== `${lesson.updated_at || ""}:${[lesson.project_code, lesson.project_name, lesson.department, lesson.assets, lesson.stage_phase, lesson.criticality, lesson.subject, lesson.issue_description, lesson.root_cause, lesson.lesson_learned, lesson.recommended_action].filter(Boolean).join("\n").slice(0, 12000).length}`)
      .sort((left, right) => Number(current.has(left.id)) - Number(current.has(right.id)));
    const batch = pending.slice(0, 20);
    const processed = await embedLessonBatch(supabase, apiKey, batch);
    const { count: indexedCount, error: countError } = await supabase.from("lessons_learned_ai_index").select("lesson_id", { count: "exact", head: true });
    if (countError) throw countError;
    return NextResponse.json({ processed, remaining: Math.max(0, pending.length - processed), indexed: indexedCount || 0, total: lessons.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Semantic indexing failed." }, { status: 500 });
  }
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { extractOpenAiText, keywordCandidates, lessonSearchText, preventionResponseSchema, type PreventionLesson, type PreventionResult } from "./lessonsPrevention";

const LESSON_FIELDS = "id,lesson_number,project_code,project_name,report_date,department,assets,stage_phase,criticality,subject,issue_description,root_cause,lesson_learned,recommended_action,updated_at";

export function lessonsBusinessApiKey() {
  return process.env.OPENAI_BUSINESS_API_KEY?.trim() || "";
}

export async function loadAllPreventionLessons(supabase: SupabaseClient) {
  const rows: PreventionLesson[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("lessons_learned").select(LESSON_FIELDS).eq("outcome_type", "Failure").range(from, from + 999);
    if (error) throw error;
    const page = (data || []) as PreventionLesson[];
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

export async function loadPreventionLessonsByIds(supabase: SupabaseClient, lessonIds: string[]) {
  if (!lessonIds.length) return [];
  const { data, error } = await supabase.from("lessons_learned").select(LESSON_FIELDS).eq("outcome_type", "Failure").in("id", lessonIds);
  if (error) throw error;
  return (data || []) as PreventionLesson[];
}

async function createEmbedding(apiKey: string, input: string) {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: process.env.OPENAI_LESSONS_EMBEDDING_MODEL || "text-embedding-3-small", input: input.slice(0, 24000) }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message || "Embedding request failed.");
  return payload?.data?.[0]?.embedding as number[] | undefined;
}

export async function retrievePreventionEvidence(supabase: SupabaseClient, apiKey: string, question: string, lessons: PreventionLesson[]) {
  const keywordMatches = keywordCandidates(lessons, question, 250);
  try {
    const embedding = await createEmbedding(apiKey, question);
    if (embedding?.length) {
      const { data, error } = await supabase.rpc("match_lessons_learned_prevention", { query_embedding: embedding, match_count: 200, minimum_similarity: 0.3 });
      if (!error && Array.isArray(data) && data.length) {
        const byId = new Map(lessons.map((lesson) => [lesson.id, lesson]));
        const matches = data.map((row: { lesson_id?: string }) => row.lesson_id ? byId.get(row.lesson_id) : undefined).filter(Boolean) as PreventionLesson[];
        if (matches.length) {
          const combined = new Map([...keywordMatches, ...matches].map((lesson) => [lesson.id, lesson]));
          return { candidates: [...combined.values()].slice(0, 250), mode: "semantic" as const, screenedCount: lessons.length };
        }
      }
    }
  } catch {
    // The keyword fallback keeps the assistant operational before the optional semantic migration/index is applied.
  }
  return { candidates: keywordMatches, mode: "keyword" as const, screenedCount: lessons.length };
}

export async function generatePreventionBrief(apiKey: string, question: string, candidates: PreventionLesson[], document?: { name: string; text: string }) {
  if (!candidates.length) throw new Error("No relevant failure records were found. Try a broader activity, equipment, phase, or risk description.");
  const buildEvidence = (rows: PreventionLesson[], characterLimit: number) => rows.map((lesson) => ({
    id: lesson.id,
    lesson_number: lesson.lesson_number,
    project: [lesson.project_code, lesson.project_name].filter(Boolean).join(" · "),
    date: lesson.report_date,
    department: lesson.department,
    asset: lesson.assets,
    phase: lesson.stage_phase,
    criticality: lesson.criticality,
    evidence: lessonSearchText(lesson).slice(0, characterLimit),
  }));
  const system = [
    "You are Enshore Subsea's blame-free Lessons Learned prevention analyst.",
    "Use ONLY the supplied historic failure evidence and, when provided, the uploaded procedure text.",
    "Do not dump or paraphrase every record. Consolidate repeated evidence into 3-8 prioritised operational cautions.",
    "Explain what not to repeat and the concrete control, check, hold point, responsibility, verification, or communication step that should be considered.",
    "Never invent events, causes, requirements, people, procedure clauses, or lesson identifiers.",
    "Every caution must cite one or more supplied lesson UUIDs. Confidence is High only when several clear records support the same pattern, Medium when evidence is smaller or mixed, and Low when historic wording is weak.",
    "Procedure review is advisory: identify apparent coverage and gaps without declaring the document approved or compliant.",
  ].join(" ");
  async function requestBrief(rows: PreventionLesson[], evidenceCharacterLimit: number, documentCharacterLimit: number) {
    const evidence = buildEvidence(rows, evidenceCharacterLimit);
    const user = [
      `User question: ${question}`,
      document ? `Uploaded document: ${document.name}\nDocument text:\n${document.text.slice(0, documentCharacterLimit)}` : "No procedure was uploaded.",
      `Retrieved failure evidence (${evidence.length} records):\n${JSON.stringify(evidence)}`,
      "Return a short management-ready summary, the analysed scope, 3-6 consolidated cautions, practical preventive controls, limitations, and the overall set of relevant lesson UUIDs.",
    ].join("\n\n");
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_LESSONS_MODEL || "gpt-5-mini",
        input: [{ role: "system", content: system }, { role: "user", content: user }],
        reasoning: { effort: "low" },
        text: { format: { type: "json_schema", name: "lessons_prevention_brief", strict: true, schema: preventionResponseSchema } },
        max_output_tokens: 8000,
        store: false,
      }),
      signal: AbortSignal.timeout(120000),
    });
    const payload = await response.json() as Record<string, unknown> & { error?: { message?: string }; status?: string; incomplete_details?: { reason?: string } };
    if (!response.ok) throw new Error(payload.error?.message || "The prevention analysis request failed.");
    const text = extractOpenAiText(payload);
    if (!text) throw new Error(payload.status === "incomplete" ? `The AI response was incomplete (${payload.incomplete_details?.reason || "output limit"}).` : "The AI service returned no prevention briefing.");
    try {
      return JSON.parse(text) as PreventionResult;
    } catch {
      throw new Error(payload.status === "incomplete" ? "The AI response reached its output limit before completing the prevention briefing." : "The AI returned an invalid prevention briefing format.");
    }
  }
  async function synthesiseBrief(partials: PreventionResult[]) {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_LESSONS_MODEL || "gpt-5-mini",
        input: [{ role: "system", content: system }, { role: "user", content: [
          `User question: ${question}`,
          `The relevance-ranked candidate population was analysed in ${partials.length} evidence batches. Consolidate these batch findings without losing recurring themes or inventing evidence. Do not describe the candidate count as an exact total of every related lesson unless the evidence explicitly supports that claim.`,
          JSON.stringify(partials.map((item) => ({ summary: item.summary, scope: item.scope, cautions: item.cautions, limitations: item.limitations, matched_lesson_ids: item.matched_lesson_ids }))),
          "Return one management-ready brief with 3-6 prioritised cautions. Retain supporting UUIDs from the batch findings only.",
        ].join("\n\n") }],
        reasoning: { effort: "low" },
        text: { format: { type: "json_schema", name: "lessons_prevention_brief", strict: true, schema: preventionResponseSchema } },
        max_output_tokens: 8000, store: false,
      }),
      signal: AbortSignal.timeout(120000),
    });
    const payload = await response.json() as Record<string, unknown> & { error?: { message?: string } };
    if (!response.ok) throw new Error(payload.error?.message || "The prevention synthesis request failed.");
    const text = extractOpenAiText(payload);
    if (!text) throw new Error("The AI service returned no consolidated prevention briefing.");
    return JSON.parse(text) as PreventionResult;
  }
  let result: PreventionResult;
  if (candidates.length > 40) {
    const batches: PreventionLesson[][] = [];
    for (let index = 0; index < candidates.length; index += 35) batches.push(candidates.slice(index, index + 35));
    const partials: PreventionResult[] = new Array(batches.length);
    let nextBatch = 0;
    async function analyseBatches() {
      while (nextBatch < batches.length) {
        const index = nextBatch++;
        partials[index] = await requestBrief(batches[index], 1200, document ? 12000 : 0);
      }
    }
    await Promise.all(Array.from({ length: Math.min(3, batches.length) }, () => analyseBatches()));
    result = await synthesiseBrief(partials);
  } else {
    try {
      result = await requestBrief(candidates, 1800, 40000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!/incomplete|output limit|invalid prevention briefing format/i.test(message)) throw error;
      result = await requestBrief(candidates.slice(0, 24), 1200, 24000);
    }
  }
  const allowedIds = new Set(candidates.map((lesson) => lesson.id));
  result.cautions = (result.cautions || []).map((caution) => ({ ...caution, lesson_ids: caution.lesson_ids.filter((id) => allowedIds.has(id)) })).filter((caution) => caution.lesson_ids.length);
  result.matched_lesson_ids = [...new Set((result.matched_lesson_ids || []).filter((id) => allowedIds.has(id)))];
  if (!result.matched_lesson_ids.length) result.matched_lesson_ids = [...new Set(result.cautions.flatMap((caution) => caution.lesson_ids))];
  return result;
}

export async function embedLessonBatch(supabase: SupabaseClient, apiKey: string, lessons: PreventionLesson[]) {
  if (!lessons.length) return 0;
  const inputs = lessons.map((lesson) => lessonSearchText(lesson).slice(0, 12000));
  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.OPENAI_LESSONS_EMBEDDING_MODEL || "text-embedding-3-small", input: inputs }),
      signal: AbortSignal.timeout(45000),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) throw new Error("The embedding service timed out. The batch is safe to retry.");
    throw error;
  }
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message || "Embedding batch failed.");
  const rows = lessons.map((lesson, index) => ({ lesson_id: lesson.id, content_hash: `${lesson.updated_at || ""}:${inputs[index].length}`, embedding: payload.data[index].embedding, embedded_at: new Date().toISOString() }));
  const { error } = await supabase.from("lessons_learned_ai_index").upsert(rows, { onConflict: "lesson_id" });
  if (error) throw error;
  return rows.length;
}

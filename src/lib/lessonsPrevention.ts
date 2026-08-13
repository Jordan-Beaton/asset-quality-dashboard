export type PreventionLesson = {
  id: string;
  lesson_number: string;
  project_code: string | null;
  project_name: string;
  report_date: string | null;
  department: string | null;
  assets: string | null;
  stage_phase: string | null;
  criticality: string;
  subject: string;
  issue_description: string;
  root_cause: string | null;
  lesson_learned: string;
  recommended_action: string | null;
  updated_at: string;
};

export type PreventionCaution = {
  title: string;
  what_failed: string;
  why_it_matters: string;
  prevention_controls: string[];
  lesson_ids: string[];
  confidence: "High" | "Medium" | "Low";
};

export type PreventionResult = {
  summary: string;
  scope: string;
  cautions: PreventionCaution[];
  limitations: string[];
  matched_lesson_ids: string[];
  evidence_count: number;
  retrieval_mode: "semantic" | "keyword";
  sources?: Array<{ id: string; lesson_number: string; subject: string; project: string }>;
  analysis_id?: string;
};

export const preventionResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "scope", "cautions", "limitations", "matched_lesson_ids"],
  properties: {
    summary: { type: "string" },
    scope: { type: "string" },
    cautions: {
      type: "array",
      minItems: 1,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "what_failed", "why_it_matters", "prevention_controls", "lesson_ids", "confidence"],
        properties: {
          title: { type: "string" },
          what_failed: { type: "string" },
          why_it_matters: { type: "string" },
          prevention_controls: { type: "array", minItems: 1, maxItems: 5, items: { type: "string" } },
          lesson_ids: { type: "array", minItems: 1, maxItems: 15, items: { type: "string" } },
          confidence: { type: "string", enum: ["High", "Medium", "Low"] },
        },
      },
    },
    limitations: { type: "array", maxItems: 5, items: { type: "string" } },
    matched_lesson_ids: { type: "array", maxItems: 80, items: { type: "string" } },
  },
} as const;

export function lessonSearchText(lesson: PreventionLesson) {
  return [
    lesson.project_code,
    lesson.project_name,
    lesson.department,
    lesson.assets,
    lesson.stage_phase,
    lesson.criticality,
    lesson.subject,
    lesson.issue_description,
    lesson.root_cause,
    lesson.lesson_learned,
    lesson.recommended_action,
  ].filter(Boolean).join("\n").slice(0, 12000);
}

function tokens(value: string) {
  const stop = new Set(["about", "after", "again", "against", "apply", "could", "from", "have", "into", "lessons", "learnt", "learned", "procedure", "should", "tell", "that", "their", "there", "these", "they", "this", "what", "when", "where", "which", "with", "would", "your"]);
  return [...new Set(value.toLowerCase().match(/[a-z0-9]{3,}/g) || [])].filter((token) => !stop.has(token));
}

export function keywordCandidates(lessons: PreventionLesson[], query: string, limit = 70) {
  const queryTokens = tokens(query);
  return lessons.map((lesson) => {
    const subject = lesson.subject.toLowerCase();
    const body = lessonSearchText(lesson).toLowerCase();
    let score = 0;
    for (const token of queryTokens) {
      if (subject.includes(token)) score += 8;
      if ((lesson.stage_phase || "").toLowerCase().includes(token)) score += 6;
      if ((lesson.assets || "").toLowerCase().includes(token)) score += 5;
      const matches = body.split(token).length - 1;
      score += Math.min(matches, 6);
    }
    if (["High", "Critical"].includes(lesson.criticality)) score += 0.5;
    return { lesson, score };
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map((item) => item.lesson);
}

export function extractOpenAiText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === "string") return payload.output_text.trim();
  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as { content?: unknown }).content) ? (item as { content: unknown[] }).content : [];
    for (const block of content) {
      if (block && typeof block === "object" && typeof (block as { text?: unknown }).text === "string") return (block as { text: string }).text.trim();
    }
  }
  return "";
}

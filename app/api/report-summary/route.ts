import { NextResponse } from "next/server";
import { createClient as createServerSupabaseClient } from "../../../src/lib/supabase/server";

export const runtime = "nodejs";

type ReportSummaryRequest = {
  monthLabel?: string;
  year?: number;
  metrics?: Record<string, unknown>;
};

function extractTextFromResponse(data: Record<string, unknown>) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const output = Array.isArray(data.output) ? data.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const contentValue = (item as { content?: unknown }).content;
    const content = Array.isArray(contentValue)
      ? contentValue
      : [];
    for (const block of content) {
      if (!block || typeof block !== "object") continue;
      const text =
        typeof (block as { text?: unknown }).text === "string"
          ? (block as { text: string }).text
          : typeof (block as { output_text?: unknown }).output_text === "string"
            ? (block as { output_text: string }).output_text
            : "";
      if (text.trim()) return text.trim();
    }
  }

  return "";
}

async function requireAuthenticatedUser() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

export async function POST(request: Request) {
  const user = await requireAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
  }

  let body: ReportSummaryRequest;
  try {
    body = (await request.json()) as ReportSummaryRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const monthLabel = typeof body.monthLabel === "string" ? body.monthLabel.trim() : "";
  const metrics = body.metrics && typeof body.metrics === "object" ? body.metrics : null;

  if (!monthLabel || !metrics) {
    return NextResponse.json({ error: "monthLabel and metrics are required." }, { status: 400 });
  }

  const systemPrompt =
    "You draft concise executive summaries for a monthly Quality Management report. " +
    "Use only the metrics provided. Do not invent facts, names, events, or causes not present in the input. " +
    "Write plain editable prose only, no markdown, no bullets, no tables. " +
    "Keep it professional, balanced, and concise, roughly 120 to 180 words. " +
    "Call out meaningful positives and key concerns such as overdue actions, open NCRs, pending CAPA effectiveness, temporary/open MOCs, and overdue documents only when supported by the metrics.";

  const userPrompt = [
    `Draft an executive summary for the Monthly Management Report for ${monthLabel}.`,
    "",
    "Use these verified metrics only:",
    JSON.stringify(metrics, null, 2),
    "",
    "Instructions:",
    "1. Summarize the most important quality activity for the period.",
    "2. Mention notable NCR/CAPA position, actions, MOCs, audits, and documents only if supported by the data.",
    "3. Highlight concerns where the metrics indicate backlog, overdue items, pending effectiveness, or open issues.",
    "4. Keep the wording suitable for management review.",
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      text: {
        format: { type: "text" },
        verbosity: "medium",
      },
      max_output_tokens: 260,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: `OpenAI request failed: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ""}` },
      { status: 502 }
    );
  }

  const data = (await response.json()) as Record<string, unknown>;
  const summary = extractTextFromResponse(data);

  if (!summary) {
    return NextResponse.json({ error: "No summary text was returned by the AI service." }, { status: 502 });
  }

  return NextResponse.json({ summary });
}

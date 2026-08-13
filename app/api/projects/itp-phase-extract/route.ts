import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

type ExtractedItem = {
  taskNumber: string;
  activityDescription: string;
};

const extractionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    phases: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          phaseNumber: { type: "string" },
          phaseTitle: { type: "string" },
          items: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                taskNumber: { type: "string" },
                activityDescription: { type: "string" },
              },
              required: ["taskNumber", "activityDescription"],
            },
          },
        },
        required: ["phaseNumber", "phaseTitle", "items"],
      },
    },
  },
  required: ["phases"],
};

function outputText(payload: { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> }) {
  return payload.output_text || payload.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text || "";
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "ITP extraction is not configured." }, { status: 500 });
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose an ITP file." }, { status: 400 });
    if (file.size > 25 * 1024 * 1024) return NextResponse.json({ error: "The ITP exceeds the 25 MB extraction limit." }, { status: 413 });
    const buffer = Buffer.from(await file.arrayBuffer());
    const prompt = `Inspect this complete internal Inspection and Test Plan (ITP) from beginning to end.

Identify EVERY numbered phase heading. The standard template normally presents a standalone number followed by an uppercase heading immediately above a table, such as the visual pattern "6." followed by "DESIGN VERIFICATION PHASE". Headings vary, so do not search for a particular number, title, project, activity wording, or fixed set of columns. Use typography, numbering, position above a table, and document structure. Include tables continuing across pages.

For each heading, extract every activity row through to the next phase heading. Return ONLY the printed task ID/number and activity description for each row. Ignore all other table columns, including responsible party, controlling documents, acceptance criteria, verifying deliverables, surveillance, intervention, and inspection-authority columns.

Do not treat the document title, table headers, repeated page headers, legends, notes, signature blocks, or numbered activity rows as phase headings. Return only the fields required by the supplied response schema.`;
    const fileContent = file.type.startsWith("image/")
      ? { type: "input_image", image_url: `data:${file.type};base64,${buffer.toString("base64")}` }
      : { type: "input_file", filename: file.name, file_data: `data:${file.type || "application/octet-stream"};base64,${buffer.toString("base64")}` };
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-5-mini",
        input: [{ role: "user", content: [{ type: "input_text", text: prompt }, fileContent] }],
        reasoning: { effort: "low" },
        text: { format: { type: "json_schema", name: "itp_phase_extraction", strict: true, schema: extractionSchema } },
        max_output_tokens: 12000,
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error?.message || "ITP extraction failed.");
    if (payload.status === "incomplete") {
      throw new Error("The ITP extraction reached its output limit before completing. Please retry; if this continues, split the ITP into smaller controlled sections.");
    }
    const json = outputText(payload).replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    let parsed: { phases?: Array<{ phaseNumber: string; phaseTitle: string; items: ExtractedItem[] }> };
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error("The ITP extraction response was incomplete. Please retry the upload.");
    }
    return NextResponse.json({ phases: parsed.phases || [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The ITP could not be extracted." }, { status: 422 });
  }
}

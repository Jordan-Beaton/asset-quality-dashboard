import { NextResponse } from "next/server";
import { createClient as createServerSupabaseClient } from "../../../../src/lib/supabase/server";
import { downloadStoredItp } from "../../../../src/lib/itpStorage";

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
    // A tracked ITP is read by the server from its stored file, so no request-size limit
    // applies; an uploaded file is still accepted.
    let buffer: Buffer;
    let fileName: string;
    let mimeType: string;
    const filePath = String(form.get("filePath") || "").trim();
    if (filePath) {
      const userClient = await createServerSupabaseClient();
      const { data: authData } = await userClient.auth.getUser();
      if (!authData.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
      const stored = await downloadStoredItp(userClient, filePath);
      if (!stored.ok) return NextResponse.json({ error: stored.error }, { status: stored.status });
      buffer = stored.buffer;
      fileName = stored.fileName;
      mimeType = "";
    } else {
      const file = form.get("file");
      if (!(file instanceof File)) return NextResponse.json({ error: "Choose an ITP file." }, { status: 400 });
      buffer = Buffer.from(await file.arrayBuffer());
      fileName = file.name;
      mimeType = file.type;
    }
    if (buffer.length > 25 * 1024 * 1024) return NextResponse.json({ error: "The ITP exceeds the 25 MB extraction limit." }, { status: 413 });
    const extension = fileName.split(".").pop()?.toLowerCase() || "";
    const knownTypes: Record<string, string> = {
      pdf: "application/pdf",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
    };
    mimeType = mimeType || knownTypes[extension] || "application/octet-stream";
    const prompt = `Inspect this complete internal Inspection and Test Plan (ITP) from beginning to end.

Identify EVERY phase heading. A phase heading groups the activity rows beneath it. Two kinds exist:
- Numbered: a standalone number followed by an uppercase heading immediately above a table, such as the visual pattern "6." followed by "DESIGN VERIFICATION PHASE".
- Unnumbered: a full-width band or row of uppercase text inside the table with no other cells filled in, such as "CONTRACT REVIEW", "APPROVALS", "NON-CONFORMING PRODUCTS" or "PURCHASED PARTS".
Headings vary, so do not search for a particular number, title, project, activity wording, or fixed set of columns. Use typography, numbering, position, and document structure. Include tables continuing across pages (a heading is not repeated just because its table continues on the next page).

If the plan has no phase headings at all (one continuous table of activity rows, as in a simple quality control plan), return ONE phase: phaseNumber "1" and phaseTitle taken from the document title or the plan name, containing every activity row.

If the headings carry no printed numbers, set phaseNumber to their order in the document: "1", "2", "3" and so on.

For each heading, extract every activity row through to the next phase heading. Return ONLY the task ID/number and activity description for each row. If the rows carry a printed number, use it exactly. If the rows are not numbered, number them within their phase using the phase number and the row's order, for example "3.1", "3.2". A description that wraps onto several lines, or a row that continues on the next page, is still one row. Ignore all other table columns, including responsible party, procedure references, controlling documents, acceptance criteria, verifying deliverables, surveillance, intervention, and inspection-authority columns.

Do not treat the document title, column header rows, repeated page headers, legends, notes, document change registers, signature blocks, or activity rows as phase headings. Return only the fields required by the supplied response schema.`;
    const fileContent = mimeType.startsWith("image/")
      ? { type: "input_image", image_url: `data:${mimeType};base64,${buffer.toString("base64")}` }
      : { type: "input_file", filename: fileName, file_data: `data:${mimeType};base64,${buffer.toString("base64")}` };
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

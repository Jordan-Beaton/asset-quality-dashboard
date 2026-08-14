import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { extractOpenAiText } from "./lessonsPrevention";

export async function extractLessonDocument(buffer: Buffer, fileName: string) {
  const name = fileName.toLowerCase();
  if (name.endsWith(".docx")) return (await mammoth.extractRawText({ buffer })).value;
  if (name.endsWith(".pdf")) {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try { return (await parser.getText()).text; } finally { await parser.destroy(); }
  }
  if (name.endsWith(".txt")) return buffer.toString("utf8");
  throw new Error("AI-native extraction required.");
}

export async function extractLessonDocumentWithAi(apiKey: string, buffer: Buffer, fileName: string) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_LESSONS_MODEL || "gpt-5-mini",
      input: [{ role: "user", content: [
        { type: "input_text", text: "Extract the operationally meaningful content from this document as plain text. Preserve requirements, controls, hazards, responsibilities, checks, hold points and tables. Do not analyse or add information." },
        { type: "input_file", filename: fileName, file_data: buffer.toString("base64") },
      ] }],
      reasoning: { effort: "low" }, max_output_tokens: 12000, store: false,
    }),
    signal: AbortSignal.timeout(120000),
  });
  const payload = await response.json() as Record<string, unknown> & { error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message || "AI document extraction failed.");
  return extractOpenAiText(payload);
}

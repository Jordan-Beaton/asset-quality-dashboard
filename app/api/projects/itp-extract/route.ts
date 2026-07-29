import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export const runtime = "nodejs";

function clean(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function valueAfterLabel(text: string, labels: string[]) {
  for (const label of labels) {
    const pattern = new RegExp(`(?:^|\\n)\\s*${label}\\s*(?:[:#-]|\\s{2,}|\\t)\\s*([^\\n|]{1,140})`, "im");
    const match = text.match(pattern);
    if (match?.[1]) return clean(match[1]);
  }
  return "";
}

function extractMetadata(text: string) {
  const documentNumber = valueAfterLabel(text, [
    "document\\s*(?:no\\.?|number|reference)",
    "itp\\s*(?:no\\.?|number|reference)",
    "reference",
  ]);
  const title = valueAfterLabel(text, ["document\\s*title", "itp\\s*(?:title|description)", "title"]);
  const revision = valueAfterLabel(text, ["revision\\s*(?:no\\.?|number)?", "rev\\.?"]);
  const revisionDate = valueAfterLabel(text, ["revision\\s*date", "date\\s*of\\s*issue", "issue\\s*date"]);
  const supplier = valueAfterLabel(text, ["supplier", "vendor", "contractor"]);
  const packageName = valueAfterLabel(text, ["package", "purchase\\s*order", "po\\s*(?:no\\.?|number)"]);
  const discipline = valueAfterLabel(text, ["discipline"]);
  const scopeMatch = text.match(/\b(trencher|barge)\b/i);
  const found = [documentNumber, title, revision, supplier].filter(Boolean).length;
  return {
    documentNumber,
    title,
    revision,
    revisionDate,
    supplier,
    packageName,
    discipline,
    scope: scopeMatch ? `${scopeMatch[1][0].toUpperCase()}${scopeMatch[1].slice(1).toLowerCase()}` : "",
    confidence: found >= 3 ? "High" : found >= 1 ? "Medium" : "Low",
  };
}

export async function POST(request: Request) {
  let parser: PDFParse | null = null;
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "No document supplied." }, { status: 400 });
    if (file.size > 30 * 1024 * 1024) return NextResponse.json({ error: "The document exceeds the 30 MB intake limit." }, { status: 413 });
    const buffer = Buffer.from(await file.arrayBuffer());
    const extension = file.name.split(".").pop()?.toLowerCase();
    let text = "";
    if (extension === "docx") {
      text = (await mammoth.extractRawText({ buffer })).value;
    } else if (extension === "pdf") {
      parser = new PDFParse({ data: new Uint8Array(buffer) });
      text = (await parser.getText({ first: 8 })).text;
    } else if (["xlsx", "xls", "xlsm"].includes(extension || "")) {
      const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
      text = workbook.SheetNames.slice(0, 6).map((name) =>
        XLSX.utils.sheet_to_csv(workbook.Sheets[name], { blankrows: false }).slice(0, 50000),
      ).join("\n");
    } else {
      return NextResponse.json({ error: "Use an Excel, Word, or PDF ITP." }, { status: 415 });
    }
    return NextResponse.json({ ...extractMetadata(text.slice(0, 250000)), charactersRead: text.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The document could not be read." }, { status: 422 });
  } finally {
    if (parser) await parser.destroy().catch(() => undefined);
  }
}

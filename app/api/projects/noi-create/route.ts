import { readFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";

export const runtime = "nodejs";

type Attendee = { name?: string; company?: string; contact?: string; email?: string };
type NoiPayload = {
  noiNumber?: string;
  projectDetails?: string;
  activities?: string[];
  interventionTypes?: string[];
  inspectionDate?: string;
  duration?: string;
  location?: string;
  itpReference?: string;
  taskNumbers?: string[];
  attendees?: Attendee[];
  hostName?: string;
  hostTelephone?: string;
  hostPosition?: string;
  hostEmail?: string;
};

function clean(value: unknown, max = 500) {
  return String(value ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().slice(0, max);
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function contentParagraph(value: string) {
  const parts = clean(value).split("\n");
  return parts.map((part) => `<w:p><w:pPr><w:jc w:val="left"/><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">${escapeXml(part)}</w:t></w:r></w:p>`).join("");
}

function xmlBlocks(xml: string, tag: string) {
  const expression = new RegExp(`<w:${tag}(?:\\s[^>]*)?>[\\s\\S]*?<\\/w:${tag}>`, "g");
  return [...xml.matchAll(expression)].map((match) => ({ index: match.index!, value: match[0] }));
}

function replaceCell(xml: string, tableIndex: number, rowIndex: number, cellIndex: number, value: string) {
  const tables = xmlBlocks(xml, "tbl");
  const table = tables[tableIndex];
  if (!table) throw new Error(`Template table ${tableIndex + 1} was not found.`);
  const rows = xmlBlocks(table.value, "tr");
  const row = rows[rowIndex];
  if (!row) throw new Error(`Template row ${rowIndex + 1} was not found.`);
  const cells = xmlBlocks(row.value, "tc");
  const cell = cells[cellIndex];
  if (!cell) throw new Error(`Template cell ${cellIndex + 1} was not found.`);
  const properties = cell.value.match(/<w:tcPr(?:\s[^>]*)?>[\s\S]*?<\/w:tcPr>/)?.[0] || "";
  const nextCell = cell.value.replace(/<w:tc(?:\s[^>]*)?>[\s\S]*<\/w:tc>/, `<w:tc>${properties}${contentParagraph(value)}</w:tc>`);
  const nextRow = `${row.value.slice(0, cell.index)}${nextCell}${row.value.slice(cell.index + cell.value.length)}`;
  const nextTable = `${table.value.slice(0, row.index)}${nextRow}${table.value.slice(row.index + row.value.length)}`;
  return `${xml.slice(0, table.index)}${nextTable}${xml.slice(table.index + table.value.length)}`;
}

function formattedDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as NoiPayload;
    const noiNumber = clean(payload.noiNumber, 20);
    const activities = (payload.activities || []).map((value) => clean(value, 300)).filter(Boolean);
    const types = (payload.interventionTypes || []).map((value) => clean(value, 30)).filter(Boolean);
    const tasks = (payload.taskNumbers || []).map((value) => clean(value, 40)).filter(Boolean);
    if (!noiNumber || !activities.length) return Response.json({ error: "NOI number and at least one inspection activity are required." }, { status: 400 });

    const templatePath = path.join(process.cwd(), "assets", "templates", "ENS-HSEQ-FRM-074-Notice-of-Inspection.docx");
    const template = await readFile(templatePath);
    const archive = await JSZip.loadAsync(template);
    const documentPart = archive.file("word/document.xml");
    if (!documentPart) throw new Error("The controlled NOI template document body is missing.");
    let xml = await documentPart.async("string");

    xml = replaceCell(xml, 0, 0, 1, clean(payload.projectDetails, 500));
    xml = replaceCell(xml, 0, 1, 1, noiNumber.padStart(3, "0"));
    xml = replaceCell(xml, 1, 1, 1, activities.join("\n"));
    xml = replaceCell(xml, 1, 2, 1, types.join("\n"));
    xml = replaceCell(xml, 1, 3, 1, formattedDate(clean(payload.inspectionDate, 30)));
    xml = replaceCell(xml, 1, 3, 3, clean(payload.duration, 100));
    xml = replaceCell(xml, 1, 4, 1, clean(payload.location, 500));
    xml = replaceCell(xml, 1, 5, 1, clean(payload.itpReference, 200));
    xml = replaceCell(xml, 1, 5, 3, tasks.join("\n"));

    const attendees = (payload.attendees || []).slice(0, 5);
    for (let index = 0; index < 5; index += 1) {
      const attendee = attendees[index] || {};
      xml = replaceCell(xml, 1, 7 + index, 1, [clean(attendee.name, 100), clean(attendee.company, 100)].join("\n"));
      xml = replaceCell(xml, 1, 7 + index, 3, [clean(attendee.contact, 100), clean(attendee.email, 150)].join("\n"));
    }
    xml = replaceCell(xml, 2, 1, 1, clean(payload.hostName, 120));
    xml = replaceCell(xml, 2, 1, 3, clean(payload.hostTelephone, 100));
    xml = replaceCell(xml, 2, 2, 1, clean(payload.hostPosition, 120));
    xml = replaceCell(xml, 2, 2, 3, clean(payload.hostEmail, 150));

    archive.file("word/document.xml", xml);
    const output = await archive.generateAsync({ type: "uint8array", compression: "DEFLATE" });
    const body = output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength) as ArrayBuffer;
    return new Response(body, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="Wadden-Sea-NOI-${noiNumber.padStart(3, "0")}.docx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "The NOI document could not be generated." }, { status: 422 });
  }
}

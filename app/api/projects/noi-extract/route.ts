import { NextResponse } from "next/server";
import { createClient as createServerSupabaseClient } from "../../../../src/lib/supabase/server";
import { downloadStoredItp } from "../../../../src/lib/itpStorage";
import { ensurePdfNodeSupport } from "../../../../src/lib/pdfNodeSupport";
import {
  addVisualChunks,
  buildPageGrid,
  buildTableGrids,
  isCodeText,
  mergePageGrids,
  parseLegend,
  parseVisualGridChunk,
  relabelPageGrids,
  type GridResult,
  type PageGrid,
  type PageInput,
  type RuleLine,
  type TableInput,
} from "../../../../src/lib/noiColumnGrid";

export const runtime = "nodejs";
export const maxDuration = 300;

function clean(value: unknown) {
  return String(value ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim();
}

type PositionedText = { text: string; x: number; y: number; width: number };

// Reads the lines of text drawn by annotations (for example FreeText boxes) with their
// real page positions, in the same coordinate convention as the page text items.
async function readAnnotationTextItems(
  pdfjs: typeof import("pdfjs-dist/legacy/build/pdf.mjs"),
  page: import("pdfjs-dist/legacy/build/pdf.mjs").PDFPageProxy,
  viewport: import("pdfjs-dist/legacy/build/pdf.mjs").PageViewport,
): Promise<{ items: PositionedText[]; largeImage: boolean }> {
  try {
    const operators = await page.getOperatorList({ annotationMode: pdfjs.AnnotationMode.ENABLE });
    const names = new Map<number, string>(Object.entries(pdfjs.OPS).map(([name, code]) => [code as number, name]));
    const result: PositionedText[] = [];
    let largeImage = false;
    let annotation: { rect: number[]; matrix: number[] } | null = null;
    let lineX = 0;
    let lineY = 0;
    for (let index = 0; index < operators.fnArray.length; index += 1) {
      const name = names.get(operators.fnArray[index]);
      const args = operators.argsArray[index] as unknown[];
      if (name === "paintImageXObject" || name === "paintInlineImageXObject") {
        // A page-sized image means the page is a scan with an OCR text layer.
        const width = Number((args as number[])[1]) || 0;
        const height = Number((args as number[])[2]) || 0;
        if (width * height >= 1_000_000) largeImage = true;
      } else if (name === "beginAnnotation") {
        annotation = { rect: args[1] as number[], matrix: args[2] as number[] };
        lineX = 0;
        lineY = 0;
      } else if (name === "endAnnotation") {
        annotation = null;
      } else if (annotation && name === "setTextMatrix") {
        lineX = Number((args as number[])[4]) || 0;
        lineY = Number((args as number[])[5]) || 0;
      } else if (annotation && name === "moveText") {
        lineX += Number((args as number[])[0]) || 0;
        lineY += Number((args as number[])[1]) || 0;
      } else if (annotation && name === "showText") {
        const glyphs = (args[0] as Array<{ unicode?: string }>) || [];
        const text = clean(glyphs.map((glyph) => glyph?.unicode || "").join(""));
        if (!text) continue;
        const [a, b, c, d, e, f] = annotation.matrix;
        const pageX = a * lineX + c * lineY + e;
        const pageY = b * lineX + d * lineY + f;
        const [viewX, viewY] = viewport.convertToViewportPoint(pageX, pageY);
        const left = Math.min(annotation.rect[0], annotation.rect[2]);
        const right = Math.max(annotation.rect[0], annotation.rect[2]);
        const [rectLeft] = viewport.convertToViewportPoint(left, pageY);
        const [rectRight] = viewport.convertToViewportPoint(right, pageY);
        const x = Math.min(rectLeft, rectRight);
        result.push({ text, x: Number.isFinite(x) ? x : viewX, y: -viewY, width: Math.abs(rectRight - rectLeft) });
      }
    }
    return { items: result, largeImage };
  } catch {
    return { items: [], largeImage: false };
  }
}

function parsePageList(value: FormDataEntryValue | null) {
  try {
    const parsed = JSON.parse(typeof value === "string" ? value : "[]") as unknown;
    return Array.isArray(parsed) ? parsed.map(Number).filter((page) => Number.isInteger(page) && page > 0).slice(0, 2000) : [];
  } catch {
    return [];
  }
}

// Word tables with merged (colspan) cells expanded so every row lines up by column.
function expandedHtmlTables(html: string): string[][][] {
  return [...html.matchAll(/<table[\s\S]*?<\/table>/gi)].map((table) =>
    [...table[0].matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((row) =>
      [...row[0].matchAll(/<t[dh]([^>]*)>([\s\S]*?)<\/t[dh]>/gi)].flatMap((cell) => {
        const span = Math.min(12, Number(/colspan="(\d+)"/i.exec(cell[1])?.[1] || 1));
        return Array.from({ length: span }, () => clean(cell[2]));
      }),
    ),
  );
}

// The tables of a Word ITP, plus what its repeating page header says: the column
// headings that Word repeats on every page, and legend entries such as "Contr = Contractor [Enshore]".
async function readWordTables(buffer: Buffer) {
  const mammothModule = await import("mammoth");
  const mammoth = (mammothModule as unknown as { default?: typeof mammothModule }).default || mammothModule;
  const html = (await mammoth.convertToHtml({ buffer })).value;
  const bodyTables = expandedHtmlTables(html);

  const JSZip = (await import("jszip")).default;
  const archive = await JSZip.loadAsync(buffer);
  const headerNames = Object.keys(archive.files).filter((name) => /^word\/(?:header|footer)\d*\.xml$/i.test(name));
  const cellTexts: string[] = [];
  let headerLabels: string[] = [];
  let bestFilled = 0;
  for (const name of headerNames) {
    const xml = (await archive.file(name)?.async("string")) || "";
    for (const table of xml.matchAll(/<w:tbl>[\s\S]*?<\/w:tbl>/g)) {
      const rows = [...table[0].matchAll(/<w:tr[ >][\s\S]*?<\/w:tr>/g)].map((row) =>
        [...row[0].matchAll(/<w:tc>[\s\S]*?<\/w:tc>/g)].map((cell) => clean([...cell[0].matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((text) => text[1]).join(""))),
      );
      rows.forEach((row) => cellTexts.push(...row));
      const last = rows[rows.length - 1] || [];
      const filled = last.filter(Boolean).length;
      // the last row of a repeating header table holds the column names
      if (name.includes("header") && last.length >= 4 && filled >= 1 && filled >= bestFilled) {
        headerLabels = last;
        bestFilled = filled;
      }
    }
  }
  bodyTables.forEach((rows) => rows.forEach((row) => cellTexts.push(...row)));
  return { tables: bodyTables, headerLabels, legend: parseLegend(cellTexts) };
}

// Excel sheets as tables, with horizontally merged heading cells filled across their span.
async function readWorkbookTables(buffer: Buffer): Promise<TableInput[]> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  return workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: "" }).map((row) => row.map((cell) => clean(cell)));
    const origin = sheet["!ref"] ? XLSX.utils.decode_range(sheet["!ref"]).s : { r: 0, c: 0 };
    for (const merge of sheet["!merges"] || []) {
      if (merge.s.r !== merge.e.r || merge.e.c <= merge.s.c) continue;
      const row = rows[merge.s.r - origin.r];
      const value = row?.[merge.s.c - origin.c];
      if (!row || !value) continue;
      for (let column = merge.s.c + 1; column <= merge.e.c; column += 1) {
        const index = column - origin.c;
        if (index >= 0 && !row[index]) row[index] = value;
      }
    }
    return { name: `Sheet ${name}`, rows };
  });
}

function legendFromPages(pages: PageInput[]) {
  return parseLegend(pages.flatMap((page) => page.items.map((item) => item.text)));
}

// Horizontal table lines of a page (cell borders drawn as thin rectangles or as lines), in the
// same top-down page coordinates as the text items.
async function readRuleLines(
  pdfjs: typeof import("pdfjs-dist/legacy/build/pdf.mjs"),
  page: Awaited<ReturnType<Awaited<ReturnType<typeof import("pdfjs-dist/legacy/build/pdf.mjs").getDocument>["promise"]>["getPage"]>>,
  viewport: { transform: number[]; width: number; height: number },
): Promise<RuleLine[]> {
  try {
    const list = await page.getOperatorList();
    const OPS = pdfjs.OPS;
    const painting = new Set<number>([OPS.stroke, OPS.closeStroke, OPS.fill, OPS.eoFill, OPS.fillStroke, OPS.eoFillStroke, OPS.closeFillStroke, OPS.closeEOFillStroke]);
    let matrix = [1, 0, 0, 1, 0, 0];
    const stack: number[][] = [];
    const rules: RuleLine[] = [];
    const addSubpath = (points: Array<[number, number]>) => {
      if (points.length < 2) return;
      const xs = points.map((point) => point[0]);
      const ys = points.map((point) => point[1]);
      const x0 = Math.min(...xs);
      const x1 = Math.max(...xs);
      const y0 = Math.min(...ys);
      const y1 = Math.max(...ys);
      if (x1 - x0 < 20) return;
      if (y1 - y0 <= 2.5) rules.push({ y: (y0 + y1) / 2, x0, x1 });
      else if (points.length >= 4 && y1 - y0 < viewport.height * 0.8) rules.push({ y: y0, x0, x1 }, { y: y1, x0, x1 });
    };
    for (let index = 0; index < list.fnArray.length; index += 1) {
      const fn = list.fnArray[index];
      const args = list.argsArray[index] as unknown[];
      if (fn === OPS.save) stack.push(matrix);
      else if (fn === OPS.restore) matrix = stack.pop() || matrix;
      else if (fn === OPS.transform) matrix = pdfjs.Util.transform(matrix, args as number[]);
      else if (fn === OPS.constructPath && painting.has(Number(args[0]))) {
        const data = Array.from((args[1] as ArrayLike<number>[])?.[0] || []) as number[];
        const full = pdfjs.Util.transform(viewport.transform, matrix);
        let subpath: Array<[number, number]> = [];
        for (let at = 0; at < data.length;) {
          const code = data[at];
          if (code === 0) {
            addSubpath(subpath);
            subpath = [];
          }
          if (code === 0 || code === 1) {
            subpath.push([full[0] * data[at + 1] + full[2] * data[at + 2] + full[4], full[1] * data[at + 1] + full[3] * data[at + 2] + full[5]]);
            at += 3;
          } else if (code === 2) at += 7;
          else at += 1;
        }
        addSubpath(subpath);
      }
    }
    return rules.slice(0, 4000);
  } catch {
    return [];
  }
}

// Reads every page of a PDF with real positions (page text plus annotation text) and
// whether the page is a scan (a page-sized image under an OCR text layer).
async function readPdfPages(buffer: Buffer): Promise<PageInput[]> {
  ensurePdfNodeSupport();
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const document = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  const pages: PageInput[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= Math.min(document.numPages, 400); pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const items = content.items.flatMap((raw) => {
        if (!("str" in raw) || !clean(raw.str)) return [];
        const transform = pdfjs.Util.transform(viewport.transform, raw.transform);
        return [{ text: clean(raw.str), x: transform[4], y: -transform[5], width: raw.width }];
      });
      const annotationRead = await readAnnotationTextItems(pdfjs, page, viewport);
      pages.push({
        pageNumber,
        width: viewport.width,
        height: viewport.height,
        items: [...items, ...annotationRead.items],
        scanned: annotationRead.largeImage,
        rules: annotationRead.largeImage ? [] : await readRuleLines(pdfjs, page, viewport),
      });
    }
  } finally {
    await document.cleanup();
  }
  return pages;
}

async function excerptPages(buffer: Buffer, pageNumbers: number[]) {
  const { PDFDocument } = await import("pdf-lib");
  const source = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const indices = [...new Set(pageNumbers)].filter((page) => page >= 1 && page <= source.getPageCount()).map((page) => page - 1);
  if (!indices.length) throw new Error("None of the requested pages exist in this ITP.");
  const excerpt = await PDFDocument.create();
  const copied = await excerpt.copyPages(source, indices);
  copied.forEach((page) => excerpt.addPage(page));
  return Buffer.from(await excerpt.save({ useObjectStreams: false }));
}

function visualGridPrompt(pageNumbers: number[], supplierName: string) {
  const supplier = supplierName ? `The supplier is "${supplierName}". ` : "";
  return `This is an excerpt of an Inspection and Test Plan (ITP). It contains original document pages ${pageNumbers.join(", ")}. ${supplier}Transcribe its inspection involvement columns exactly as printed.

1. Find every column whose cells hold short inspection codes such as H, W, R, M, A, V, P, S or combinations such as W/H, R/W, A/V. They usually sit under a group heading such as "Inspection", "Inspection Authority" or "Involvement level". Include EVERY such column: the supplier's own, the client's or Enshore's, third parties, and columns that are empty in every row.
2. Give each column's heading exactly as printed, joining the group heading and any sub-heading above or below it (for example "Supplier STALKON", "Client Enshore", "3rd party", "KR", "ENS", "BV", "HSG"). Keep the columns in left-to-right order.
3. List EVERY row of the table (not only W or H rows) with: page (the original page number), section (the item number exactly as printed, such as 3.10; if rows are not numbered, use the procedure or reference shown for the row, or leave it empty), activity (a short description) and cells (the code printed in each column, in the same order as "columns"; use "" when the cell is blank or only a dash).

Rules: read each cell from its own column only and never copy a code across from a neighbouring column. A blank cell stays "". Keep composite codes exactly as printed. A cell that shows both W and H must be written "W/H". Ignore legends, headings, signature blocks and the column-number row.

Return JSON only, in exactly this shape:
{"columns":["Supplier STALKON","Client Enshore"],"rows":[{"page":2,"section":"1.1","activity":"Contract review","cells":["H",""]}]}`;
}

async function askVisionJson(prompt: string, pdf: Buffer, fileName: string, maxOutputTokens: number) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OCR is not configured on this environment.");
  if (pdf.length > 30 * 1024 * 1024) throw new Error("These pages are too image-heavy to send to the visual reader in one batch (over 30 MB).");
  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-5-mini",
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_file", filename: fileName, file_data: `data:application/pdf;base64,${pdf.toString("base64")}` },
          ],
        }],
        max_output_tokens: maxOutputTokens,
      }),
      signal: AbortSignal.timeout(150_000),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new Error("The visual reader took too long and was stopped.");
    }
    throw error;
  }
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message || "Visual reading failed.");
  const outputText = payload.output_text
    || payload.output?.flatMap((item: { content?: Array<{ type?: string; text?: string }> }) => item.content || []).find((item: { type?: string }) => item.type === "output_text")?.text
    || "";
  const jsonText = String(outputText).replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    return JSON.parse(jsonText) as unknown;
  } catch {
    throw new Error("The visual reader returned an unreadable table. Please retry.");
  }
}

function parseJsonField(value: FormDataEntryValue | null): unknown {
  try {
    return JSON.parse(typeof value === "string" ? value : "null");
  } catch {
    return null;
  }
}

function acceptGrid(value: unknown): GridResult | null {
  const grid = value as Partial<GridResult> | null;
  if (!grid || !Array.isArray(grid.columns) || !Array.isArray(grid.rows)) return null;
  return {
    columns: grid.columns.slice(0, 24).map((column) => ({
      id: String(column.id || ""),
      label: clean(column.label).slice(0, 80),
      pages: Array.isArray(column.pages) ? column.pages.map(Number).filter(Number.isFinite).slice(0, 400) : [],
      supplierLike: Boolean(column.supplierLike),
      suggested: Boolean(column.suggested),
      marks: Number(column.marks) || 0,
      counts: { W: 0, H: 0, WH: 0, other: 0 },
    })).filter((column) => column.id),
    rows: grid.rows.slice(0, 5000).map((row) => ({
      page: Number(row.page) || 0,
      section: clean(row.section).slice(0, 12),
      description: clean(row.description).slice(0, 220),
      cells: Object.fromEntries(Object.entries(row.cells || {}).slice(0, 24).map(([key, cell]) => [String(key), clean(cell).slice(0, 9)])),
      via: row.via === "visual" ? "visual" : "position",
    })),
    fingerprint: clean(grid.fingerprint),
    pageCount: Number(grid.pageCount) || 0,
    scannedPages: Array.isArray(grid.scannedPages) ? grid.scannedPages.map(Number).filter(Number.isFinite).slice(0, 400) : [],
  };
}


// The scan runs as short, separate requests so no single request can outlive the
// host's time limit (which returns an HTML error page instead of JSON):
//   phase "grid"              - reads every inspection column of the ITP (PDF, Word or Excel)
//   phase "visual-grid-chunk" - visual reading of a few scanned PDF pages (one AI call)
//   phase "grid-merge"        - adds the visual pages to the grid (no file, no AI)
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const phase = clean(form.get("phase")) || "grid";
    const supplierName = clean(form.get("supplierName"));

    if (phase === "grid-merge") {
      const chunksRaw = parseJsonField(form.get("chunks"));
      const chunks = (Array.isArray(chunksRaw) ? chunksRaw : []).slice(0, 200).map(parseVisualGridChunk);
      const grid = addVisualChunks(
        acceptGrid(parseJsonField(form.get("grid"))),
        chunks,
        supplierName,
        Number(form.get("pageCount")) || 0,
        parsePageList(form.get("scannedPages")),
      );
      return NextResponse.json({ grid });
    }

    // A stored ITP is read by the server from its file reference, so the browser never
    // uploads it again and no request-size limit applies. A direct upload is still
    // accepted for files that are not stored yet.
    let buffer: Buffer;
    let fileName: string;
    const filePath = clean(form.get("filePath"));
    if (filePath) {
      const userClient = await createServerSupabaseClient();
      const { data: authData } = await userClient.auth.getUser();
      if (!authData.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
      const stored = await downloadStoredItp(userClient, filePath);
      if (!stored.ok) return NextResponse.json({ error: stored.error }, { status: stored.status });
      buffer = stored.buffer;
      fileName = stored.fileName;
    } else {
      const file = form.get("file");
      if (!(file instanceof File)) return NextResponse.json({ error: "No ITP supplied." }, { status: 400 });
      buffer = Buffer.from(await file.arrayBuffer());
      fileName = file.name;
    }
    // Memory safeguard only: far above any real ITP, but a runaway file would otherwise
    // crash the function with an unreadable error.
    if (buffer.length > 400 * 1024 * 1024) return NextResponse.json({ error: "This file is too large for the scanner to hold in memory (over 400 MB). Split it and retry." }, { status: 413 });
    const extension = fileName.split(".").pop()?.toLowerCase();

    if (phase === "grid") {
      if (extension === "docx") {
        const word = await readWordTables(buffer);
        const tables = word.tables.map((rows, index) => ({ name: `Table ${index + 1}`, rows }));
        const tableGrids = buildTableGrids(tables, { headerLabels: word.headerLabels, legend: word.legend });
        const grid = tableGrids.length ? mergePageGrids(tableGrids, supplierName, tables.length, []) : null;
        if (grid) Object.assign(grid, { unit: "Table", locationLabels: tables.map((table) => table.name) });
        return NextResponse.json({ grid, pageCount: tables.length, scannedPages: [], unreadPages: [] });
      }
      if (["xlsx", "xls", "xlsm"].includes(extension || "")) {
        const sheets = await readWorkbookTables(buffer);
        const legend = parseLegend(sheets.flatMap((sheet) => sheet.rows.flat()));
        const sheetGrids = buildTableGrids(sheets, { legend });
        const grid = sheetGrids.length ? mergePageGrids(sheetGrids, supplierName, sheets.length, []) : null;
        if (grid) Object.assign(grid, { unit: "Sheet", locationLabels: sheets.map((sheet) => sheet.name) });
        return NextResponse.json({ grid, pageCount: sheets.length, scannedPages: [], unreadPages: [] });
      }
      if (extension !== "pdf") return NextResponse.json({ error: "Use an Excel, Word, or PDF ITP." }, { status: 415 });
      const pages = await readPdfPages(buffer);
      const pageGrids = relabelPageGrids(
        pages.map(buildPageGrid).filter((grid): grid is PageGrid => grid !== null),
        legendFromPages(pages),
      );
      const scannedPages = pages.filter((page) => page.scanned).map((page) => page.pageNumber);
      const grid = pageGrids.length ? mergePageGrids(pageGrids, supplierName, pages.length, scannedPages) : null;
      // Pages with code-like marks but no table the reader could follow (unnumbered rows,
      // an unusual layout): these are offered to the visual reader rather than skipped.
      const gridPages = new Set(pageGrids.map((pageGrid) => pageGrid.pageNumber));
      const unreadPages = pages
        .filter((page) => !page.scanned && !gridPages.has(page.pageNumber) && page.items.filter((item) => isCodeText(item.text) && item.x > 150).length >= 3)
        .map((page) => page.pageNumber);
      return NextResponse.json({ grid, pageCount: pages.length, scannedPages, unreadPages });
    }

    if (phase === "visual-grid-chunk") {
      if (extension !== "pdf") return NextResponse.json({ error: "Visual reading applies to PDF files only." }, { status: 415 });
      const pageNumbers = parsePageList(form.get("pages")).slice(0, 6);
      if (!pageNumbers.length) return NextResponse.json({ error: "A page list is required." }, { status: 400 });
      const excerpt = await excerptPages(buffer, pageNumbers);
      const result = await askVisionJson(
        visualGridPrompt(pageNumbers, supplierName),
        excerpt,
        `${fileName.replace(/\.pdf$/i, "")}-pages-${pageNumbers.join("-")}.pdf`,
        9000,
      );
      return NextResponse.json({ chunk: parseVisualGridChunk(result) });
    }

    return NextResponse.json({ error: "Unknown scan phase." }, { status: 400 });
  } catch (error) {
    // Library loading and parsing failures are reported as readable JSON (with the
    // first lines of the stack) so a production-only problem names its own cause.
    const detail = error instanceof Error ? (error.stack || "").split("\n").slice(0, 4).join(" | ").slice(0, 600) : "";
    return NextResponse.json({ error: error instanceof Error ? error.message : "The ITP could not be scanned.", detail }, { status: 422 });
  }
}

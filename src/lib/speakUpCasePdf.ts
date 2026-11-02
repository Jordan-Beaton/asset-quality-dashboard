import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";

// Builds a copy of a Speak Up case as a PDF, in the handler's browser: that is the only place the case is readable, because it
// is locked everywhere else. Images and PDFs attached to the case are placed inside the PDF. Other file types (Word, Excel and
// so on) cannot be placed inside a PDF, so when there are any, the PDF and every original file go together in a ZIP.

export type CasePdfFile = { id: string; name: string; addedBy: string; addedAt: string; bytes: Uint8Array };

export type CasePdfInput = {
  reference: string;
  category: string;
  route: string;
  reporterMode: string;
  reporterGroup: string | null;
  receivedAt: string;
  acknowledgeBy: string;
  feedbackBy: string;
  acknowledgedAt: string | null;
  status: string;
  assignedTo: string | null;
  outcome: string | null;
  closedAt: string | null;
  body: string;
  contact: string | null;
  messages: Array<{ from: string; at: string; text: string }>;
  activity: Array<{ at: string; text: string }>;
  files: CasePdfFile[];
  generatedBy: string;
  generatedAt: string;
};

// Draws wrapped text on a canvas for characters the standard PDF fonts cannot show (for example Polish letters).
export type RenderText = (text: string, widthPt: number, sizePt: number, bold: boolean) => Promise<{ png: Uint8Array; heightPt: number }>;
export type PdfDeps = { renderText?: RenderText };

const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = 48;
const CONTENT = PAGE.width - MARGIN * 2;
const BRAND = rgb(0, 0.337, 0.439);
const MUTED = rgb(0.325, 0.337, 0.353);
const INK = rgb(0, 0, 0);
const RULE = rgb(0.816, 0.816, 0.808);

// what the standard PDF fonts can draw: Latin-1, plus the common typographic punctuation
const SAFE = /^[\t\n\r -~ -ÿ–—‘’“”•…€]*$/;
const isSafe = (text: string) => SAFE.test(text);
const flatten = (text: string) => text.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^\t\n\r -~ -ÿ–—‘’“”•…€]/g, "?");

function when(value: string | null) {
  return value ? new Date(value).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
}
function day(value: string | null) {
  return value ? new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";
}
function size(bytes: number) {
  return bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1000))} KB`;
}

const startsWith = (bytes: Uint8Array, signature: number[]) => signature.every((value, index) => bytes[index] === value);
const isJpeg = (bytes: Uint8Array) => startsWith(bytes, [0xff, 0xd8]);
const isPng = (bytes: Uint8Array) => startsWith(bytes, [0x89, 0x50, 0x4e, 0x47]);
const isPdf = (bytes: Uint8Array) => startsWith(bytes, [0x25, 0x50, 0x44, 0x46]);

// the default way to draw text the PDF fonts cannot: onto a canvas in the browser
const browserRenderText: RenderText = async (text, widthPt, sizePt, bold) => {
  const scale = 2;
  const canvas = document.createElement("canvas");
  const measure = canvas.getContext("2d");
  if (!measure) throw new Error("This browser cannot draw the text.");
  const font = `${bold ? "700 " : ""}${sizePt * scale}px "Segoe UI", Arial, Helvetica, sans-serif`;
  measure.font = font;
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/(\s+)/)) {
      const attempt = line + word;
      if (line && measure.measureText(attempt).width > widthPt * scale) {
        lines.push(line.trimEnd());
        line = word.trimStart();
      } else {
        line = attempt;
      }
    }
    lines.push(line.trimEnd());
  }
  const lineHeight = sizePt * 1.35 * scale;
  canvas.width = Math.ceil(widthPt * scale);
  canvas.height = Math.ceil(lines.length * lineHeight + 4);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot draw the text.");
  context.font = font;
  context.fillStyle = "#000000";
  context.textBaseline = "top";
  lines.forEach((line, index) => context.fillText(line, 0, index * lineHeight));
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("The text could not be drawn.");
  return { png: new Uint8Array(await blob.arrayBuffer()), heightPt: canvas.height / scale };
};

class Writer {
  doc: PDFDocument;
  page!: PDFPage;
  y = 0;
  regular!: PDFFont;
  bold!: PDFFont;
  own: PDFPage[] = [];
  deps: PdfDeps;

  constructor(doc: PDFDocument, deps: PdfDeps) {
    this.doc = doc;
    this.deps = deps;
  }

  async init() {
    this.regular = await this.doc.embedFont(StandardFonts.Helvetica);
    this.bold = await this.doc.embedFont(StandardFonts.HelveticaBold);
    this.newPage();
    return this;
  }

  newPage() {
    this.page = this.doc.addPage([PAGE.width, PAGE.height]);
    this.own.push(this.page);
    this.y = PAGE.height - MARGIN;
  }

  ensure(height: number) {
    if (this.y - height < MARGIN + 24) this.newPage();
  }

  gap(points: number) {
    this.y -= points;
  }

  rule() {
    this.ensure(10);
    this.page.drawLine({ start: { x: MARGIN, y: this.y }, end: { x: PAGE.width - MARGIN, y: this.y }, thickness: 0.6, color: RULE });
    this.y -= 10;
  }

  // a short line of text (labels, headings): anything the fonts cannot draw is simplified rather than lost
  line(text: string, options: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; x?: number } = {}) {
    const fontSize = options.size || 10;
    this.ensure(fontSize * 1.5);
    this.y -= fontSize;
    this.page.drawText(flatten(text), { x: options.x ?? MARGIN, y: this.y, size: fontSize, font: options.bold ? this.bold : this.regular, color: options.color || INK });
    this.y -= fontSize * 0.5;
  }

  heading(text: string) {
    this.gap(10);
    this.ensure(40);
    this.line(text, { size: 13, bold: true, color: BRAND });
    this.gap(2);
    this.rule();
  }

  private wrap(text: string, fontSize: number, font: PDFFont, width: number) {
    const lines: string[] = [];
    for (const paragraph of text.replace(/\t/g, "    ").split("\n")) {
      let current = "";
      for (const word of paragraph.split(" ")) {
        const attempt = current ? `${current} ${word}` : word;
        if (current && font.widthOfTextAtSize(attempt, fontSize) > width) {
          lines.push(current);
          current = word;
        } else {
          current = attempt;
        }
        // a single very long word is broken so it never runs off the page
        while (font.widthOfTextAtSize(current, fontSize) > width && current.length > 1) {
          let cut = current.length - 1;
          while (cut > 1 && font.widthOfTextAtSize(current.slice(0, cut), fontSize) > width) cut -= 1;
          lines.push(current.slice(0, cut));
          current = current.slice(cut);
        }
      }
      lines.push(current);
    }
    return lines;
  }

  // body text of any length: drawn as real text when the fonts can show it, otherwise drawn as an image so nothing is lost
  async paragraph(text: string, options: { size?: number; bold?: boolean; x?: number; width?: number } = {}) {
    const fontSize = options.size || 10;
    const x = options.x ?? MARGIN;
    const width = options.width ?? CONTENT - (x - MARGIN);
    const value = text.trim() ? text : "(empty)";
    if (isSafe(value)) {
      const font = options.bold ? this.bold : this.regular;
      for (const line of this.wrap(value, fontSize, font, width)) {
        this.ensure(fontSize * 1.4);
        this.y -= fontSize * 1.3;
        if (line) this.page.drawText(line, { x, y: this.y, size: fontSize, font, color: INK });
      }
      this.y -= 4;
      return;
    }
    const render = this.deps.renderText || browserRenderText;
    // long text is drawn in pieces, so a piece never taller than a page
    const pieces: string[] = [];
    let rest = value;
    while (rest.length > 1400) {
      let cut = rest.lastIndexOf("\n", 1400);
      if (cut < 400) cut = rest.lastIndexOf(" ", 1400);
      if (cut < 400) cut = 1400;
      pieces.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    pieces.push(rest);
    for (const piece of pieces) {
      const drawn = await render(piece, width, fontSize, Boolean(options.bold));
      this.ensure(drawn.heightPt + 4);
      const image = await this.doc.embedPng(drawn.png);
      this.y -= drawn.heightPt;
      this.page.drawImage(image, { x, y: this.y, width, height: drawn.heightPt });
      this.y -= 4;
    }
  }

  async facts(rows: Array<[string, string]>) {
    for (const [label, value] of rows) {
      if (!value) continue;
      this.ensure(16);
      const top = this.y;
      this.line(label, { size: 9, bold: true, color: MUTED });
      const after = this.y;
      this.y = top;
      await this.paragraph(value, { size: 10, x: MARGIN + 130, width: CONTENT - 130 });
      this.y = Math.min(this.y, after) - 2;
    }
  }
}

type Attachment =
  | { kind: "image"; file: CasePdfFile; image: PDFImage }
  | { kind: "pdf"; file: CasePdfFile; source: PDFDocument }
  | { kind: "loose"; file: CasePdfFile };

export async function buildCasePdf(input: CasePdfInput, deps: PdfDeps = {}): Promise<{ pdf: Uint8Array; loose: CasePdfFile[] }> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Speak Up case ${input.reference}`);
  doc.setSubject("Confidential: contains personal information");
  doc.setCreator("Enshore IMS, Speak Up");
  const w = await new Writer(doc, deps).init();

  w.line("Speak Up case", { size: 10, bold: true, color: MUTED });
  w.line(input.reference, { size: 26, bold: true, color: BRAND });
  w.line(`Confidential. Contains personal information. Prepared by ${input.generatedBy} on ${when(input.generatedAt)}.`, { size: 9, color: MUTED });
  w.gap(6);
  w.rule();

  w.heading("Case details");
  await w.facts([
    ["Category", input.category],
    ["Route", input.route],
    ["Reporter chose", input.reporterMode + (input.reporterGroup ? `, ${input.reporterGroup}` : "")],
    ["Received", when(input.receivedAt)],
    ["Acknowledged", input.acknowledgedAt ? when(input.acknowledgedAt) : `Not yet (due ${day(input.acknowledgeBy)})`],
    ["Feedback due", day(input.feedbackBy)],
    ["Status", input.status],
    ["Handled by", input.assignedTo || "Not assigned"],
    ["Outcome", input.outcome || ""],
    ["Closed", when(input.closedAt)],
  ]);

  w.heading("Report");
  await w.paragraph(input.body);
  if (input.contact) {
    w.gap(4);
    await w.facts([["Contact details given", input.contact]]);
  }

  w.heading(`Messages (${input.messages.length})`);
  if (!input.messages.length) await w.paragraph("No messages.");
  for (const message of input.messages) {
    w.gap(4);
    w.line(`${message.from}, ${when(message.at)}`, { size: 9, bold: true, color: MUTED });
    await w.paragraph(message.text);
  }

  w.heading("Activity log");
  if (!input.activity.length) await w.paragraph("No activity recorded.");
  for (const entry of input.activity) await w.paragraph(`${when(entry.at)}. ${entry.text}`, { size: 9 });

  // decide, file by file, what can go inside the PDF and what has to travel beside it
  const attachments: Attachment[] = [];
  for (const file of input.files) {
    try {
      if (isJpeg(file.bytes)) attachments.push({ kind: "image", file, image: await doc.embedJpg(file.bytes) });
      else if (isPng(file.bytes)) attachments.push({ kind: "image", file, image: await doc.embedPng(file.bytes) });
      else if (isPdf(file.bytes)) attachments.push({ kind: "pdf", file, source: await PDFDocument.load(file.bytes, { ignoreEncryption: true }) });
      else attachments.push({ kind: "loose", file });
    } catch {
      attachments.push({ kind: "loose", file });
    }
  }

  w.heading(`Attachments (${input.files.length})`);
  if (!attachments.length) await w.paragraph("No files were attached.");
  for (const item of attachments) {
    await w.paragraph(`${item.file.name} (${size(item.file.bytes.length)}, added by ${item.file.addedBy}, ${when(item.file.addedAt)}). ${item.kind === "loose" ? "Not shown in this PDF: supplied separately in the ZIP file." : "Included at the end of this PDF."}`, { size: 9 });
  }

  for (const item of attachments) {
    if (item.kind === "image") {
      w.newPage();
      await w.paragraph(`Attachment: ${item.file.name}`, { size: 11, bold: true });
      w.line(`Added by ${item.file.addedBy}, ${when(item.file.addedAt)}`, { size: 9, color: MUTED });
      w.gap(8);
      const room = w.y - MARGIN - 24;
      const scale = Math.min(CONTENT / item.image.width, room / item.image.height, 1);
      const width = item.image.width * scale;
      const height = item.image.height * scale;
      w.page.drawImage(item.image, { x: MARGIN, y: w.y - height, width, height });
    } else if (item.kind === "pdf") {
      w.newPage();
      await w.paragraph(`Attachment: ${item.file.name}`, { size: 11, bold: true });
      w.line(`Added by ${item.file.addedBy}, ${when(item.file.addedAt)}. The attached PDF follows on the next pages.`, { size: 9, color: MUTED });
      for (const page of await doc.copyPages(item.source, item.source.getPageIndices())) doc.addPage(page);
    }
  }

  // a footer on the pages this document wrote (not on pages copied from attached PDFs)
  const all = doc.getPages();
  for (const page of w.own) {
    page.drawText(flatten(`Speak Up ${input.reference}. Confidential. Page ${all.indexOf(page) + 1} of ${all.length}`), { x: MARGIN, y: 24, size: 8, font: w.regular, color: MUTED });
  }

  return { pdf: await doc.save(), loose: attachments.filter((item) => item.kind === "loose").map((item) => item.file) };
}

export function bundleName(reference: string, extension: "pdf" | "zip") {
  return `Speak-Up-${reference}.${extension}`;
}

const safeName = (name: string) => name.replace(/[\\/:*?"<>|]/g, "_").trim() || "file";

// The one download for a case: just the PDF when everything attached fits inside it, otherwise a ZIP holding the PDF and
// every original file.
export async function buildCaseDownload(input: CasePdfInput, deps: PdfDeps = {}): Promise<{ name: string; bytes: Uint8Array; mime: string; kind: "pdf" | "zip" }> {
  const { pdf, loose } = await buildCasePdf(input, deps);
  if (!loose.length) return { name: bundleName(input.reference, "pdf"), bytes: pdf, mime: "application/pdf", kind: "pdf" };
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  zip.file(bundleName(input.reference, "pdf"), pdf);
  const used = new Set<string>();
  for (const file of input.files) {
    let name = safeName(file.name);
    for (let n = 2; used.has(name.toLowerCase()); n += 1) name = `${n}-${safeName(file.name)}`;
    used.add(name.toLowerCase());
    zip.file(`Attachments/${name}`, file.bytes);
  }
  return { name: bundleName(input.reference, "zip"), bytes: await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" }), mime: "application/zip", kind: "zip" };
}

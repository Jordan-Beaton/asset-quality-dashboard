import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";

// Builds a copy of a Speak Up case as a PDF, in the handler's browser: that is the only place the case is readable, because it
// is locked everywhere else. Images and PDFs attached to the case are placed inside the PDF. Other file types (Word, Excel and
// so on) cannot be placed inside a PDF, so when there are any, the PDF and every original file go together in a ZIP.
//
// The look follows the IMS: the Enshore teal header band with the logo, section bars like the ones on screen, the same soft
// greys and tints, and only the approved palette.

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
// The Enshore logo as PNG bytes: the white version for the teal band, the colour version for the white pages.
export type PdfLogos = { reverse: Uint8Array; colour: Uint8Array };
export type PdfDeps = { renderText?: RenderText; logos?: PdfLogos };

const W = 595.28;
const H = 841.89;
const M = 48;
const CONTENT = W - M * 2;
const FOOTER = 52;

const hex = (value: string) => rgb(parseInt(value.slice(1, 3), 16) / 255, parseInt(value.slice(3, 5), 16) / 255, parseInt(value.slice(5, 7), 16) / 255);
const BRAND = hex("#005670");
const ACCENT = hex("#63B1BC");
const SOFT = hex("#ECECE7");
const TINT = hex("#EEF7F8");
const PANEL = hex("#F4F8F8");
const RULE = hex("#D0D0CE");
const MUTED = hex("#53565A");
const INK = hex("#000000");
const WHITE = hex("#FFFFFF");
const WARN = hex("#FFAD00");
type Colour = ReturnType<typeof rgb>;

// what the standard PDF fonts can draw: Latin-1, plus the common typographic punctuation
const SAFE = /^[\t\n\r -~ -ÿ–—‘’“”•…€]*$/;
const isSafe = (text: string) => SAFE.test(text);
const LOOKALIKES: Record<string, string> = { ł: "l", Ł: "L", đ: "d", Đ: "D", ø: "o", Ø: "O", æ: "ae", Æ: "AE", œ: "oe", Œ: "OE", ß: "ss" };
// short labels, names and file names are simplified (Ł becomes L) rather than lost; body text is drawn exactly, see paragraph()
const flatten = (text: string) =>
  text.replace(/[łŁđĐøØæÆœŒß]/g, (letter) => LOOKALIKES[letter] || letter).normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^\t\n\r -~ -ÿ–—‘’“”•…€]/g, "?");

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
  const lineHeight = sizePt * 1.4 * scale;
  canvas.width = Math.ceil(widthPt * scale);
  canvas.height = Math.ceil(lines.length * lineHeight + 4);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot draw the text.");
  context.font = font;
  context.fillStyle = "#000000";
  context.textBaseline = "top";
  lines.forEach((line, index) => context.fillText(line, 0, index * lineHeight + (lineHeight - sizePt * scale) / 2));
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("The text could not be drawn.");
  return { png: new Uint8Array(await blob.arrayBuffer()), heightPt: canvas.height / scale };
};

type Block = { height: number; draw: (page: PDFPage, x: number, top: number) => void };

class Writer {
  doc: PDFDocument;
  page!: PDFPage;
  y = 0;
  regular!: PDFFont;
  bold!: PDFFont;
  own: PDFPage[] = [];
  deps: PdfDeps;
  reference: string;
  logoReverse: PDFImage | null = null;
  logoColour: PDFImage | null = null;

  constructor(doc: PDFDocument, deps: PdfDeps, reference: string) {
    this.doc = doc;
    this.deps = deps;
    this.reference = reference;
  }

  async init() {
    this.regular = await this.doc.embedFont(StandardFonts.Helvetica);
    this.bold = await this.doc.embedFont(StandardFonts.HelveticaBold);
    if (this.deps.logos) {
      try {
        this.logoReverse = await this.doc.embedPng(this.deps.logos.reverse);
        this.logoColour = await this.doc.embedPng(this.deps.logos.colour);
      } catch {
        // the document is still complete without the logo
      }
    }
    this.newPage(true);
    return this;
  }

  // ---- pages --------------------------------------------------------------------------------------------------------------

  newPage(first = false) {
    this.page = this.doc.addPage([W, H]);
    this.own.push(this.page);
    if (first) this.coverBand();
    else this.runningHeader();
  }

  private coverBand() {
    const band = 96;
    this.page.drawRectangle({ x: 0, y: H - band, width: W, height: band, color: BRAND });
    this.page.drawRectangle({ x: 0, y: H - band - 5, width: W, height: 5, color: ACCENT });
    if (this.logoReverse) {
      const height = 52;
      this.page.drawImage(this.logoReverse, { x: M - 8, y: H - band + (band - height) / 2, width: height * (this.logoReverse.width / this.logoReverse.height), height });
    } else {
      this.page.drawText("ENSHORE", { x: M, y: H - 58, size: 20, font: this.bold, color: WHITE });
    }
    this.right("Speak Up", W - M, H - 50, 20, true, WHITE);
    this.right("Case file. Confidential.", W - M, H - 68, 9.5, false, SOFT);
    this.y = H - band - 5 - 30;
  }

  private runningHeader() {
    if (this.logoColour) {
      const height = 36;
      this.page.drawImage(this.logoColour, { x: M - 7, y: H - 16 - height, width: height * (this.logoColour.width / this.logoColour.height), height });
    }
    this.right(`Speak Up case ${this.reference}`, W - M, H - 38, 9.5, true, BRAND);
    this.page.drawRectangle({ x: M, y: H - 54, width: CONTENT, height: 1.4, color: ACCENT });
    this.y = H - 54 - 24;
  }

  ensure(height: number) {
    if (this.y - height < FOOTER) this.newPage();
  }

  gap(points: number) {
    this.y -= points;
  }

  // ---- text ---------------------------------------------------------------------------------------------------------------

  private font(bold: boolean) {
    return bold ? this.bold : this.regular;
  }

  text(value: string, x: number, y: number, fontSize: number, bold = false, color: Colour = INK, page: PDFPage = this.page) {
    page.drawText(flatten(value), { x, y, size: fontSize, font: this.font(bold), color });
  }

  right(value: string, xRight: number, y: number, fontSize: number, bold = false, color: Colour = INK) {
    const clean = flatten(value);
    this.page.drawText(clean, { x: xRight - this.font(bold).widthOfTextAtSize(clean, fontSize), y, size: fontSize, font: this.font(bold), color });
  }

  // a single line cut to a width, ending in an ellipsis if it does not fit
  fit(value: string, fontSize: number, bold: boolean, width: number) {
    const font = this.font(bold);
    let clean = flatten(value).replace(/\s+/g, " ").trim();
    if (font.widthOfTextAtSize(clean, fontSize) <= width) return clean;
    while (clean.length > 1 && font.widthOfTextAtSize(`${clean}…`, fontSize) > width) clean = clean.slice(0, -1);
    return `${clean.trimEnd()}…`;
  }

  wrap(text: string, fontSize: number, bold: boolean, width: number) {
    const font = this.font(bold);
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

  // Text of any length, measured before it is drawn so it can sit inside a card. Drawn as real text when the fonts can show it,
  // otherwise as an image, so that no character is ever lost.
  async prepare(text: string, fontSize: number, width: number, bold = false): Promise<Block> {
    const value = text.trim() ? text : "(empty)";
    const lineHeight = fontSize * 1.42;
    if (isSafe(value)) {
      const lines = this.wrap(value, fontSize, bold, width);
      const font = this.font(bold);
      return {
        height: lines.length * lineHeight,
        draw: (page, x, top) => lines.forEach((line, index) => { if (line) page.drawText(line, { x, y: top - fontSize * 1.08 - index * lineHeight, size: fontSize, font, color: INK }); }),
      };
    }
    const render = this.deps.renderText || browserRenderText;
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
    const drawn: Array<{ image: PDFImage; height: number }> = [];
    for (const piece of pieces) {
      const result = await render(piece, width, fontSize, bold);
      drawn.push({ image: await this.doc.embedPng(result.png), height: result.heightPt });
    }
    return {
      height: drawn.reduce((total, item) => total + item.height + 2, 0),
      draw: (page, x, top) => {
        let y = top;
        for (const item of drawn) {
          y -= item.height;
          page.drawImage(item.image, { x, y, width, height: item.height });
          y -= 2;
        }
      },
    };
  }

  // Long body text that may run over several pages (the report itself).
  async flow(text: string, fontSize = 10.5) {
    const value = text.trim() ? text : "(empty)";
    if (isSafe(value)) {
      const lineHeight = fontSize * 1.45;
      for (const line of this.wrap(value, fontSize, false, CONTENT)) {
        this.ensure(lineHeight);
        this.y -= lineHeight;
        if (line) this.page.drawText(line, { x: M, y: this.y + lineHeight * 0.25, size: fontSize, font: this.regular, color: INK });
      }
      return;
    }
    const render = this.deps.renderText || browserRenderText;
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
      const drawn = await render(piece, CONTENT, fontSize, false);
      this.ensure(drawn.heightPt + 4);
      const image = await this.doc.embedPng(drawn.png);
      this.y -= drawn.heightPt;
      this.page.drawImage(image, { x: M, y: this.y, width: CONTENT, height: drawn.heightPt });
      this.y -= 4;
    }
  }

  // ---- components ---------------------------------------------------------------------------------------------------------

  // a filled bar, like the section headers in the IMS
  section(title: string) {
    this.ensure(52);
    this.gap(12);
    this.page.drawRectangle({ x: M, y: this.y - 20, width: CONTENT, height: 20, color: BRAND });
    this.text(title, M + 10, this.y - 14, 10.5, true, WHITE);
    this.y -= 20 + 10;
  }

  pill(label: string, x: number, top: number, options: { fill: Colour; border?: Colour; color: Colour }) {
    const clean = flatten(label);
    const width = this.bold.widthOfTextAtSize(clean, 8.5) + 16;
    this.page.drawRectangle({ x, y: top - 16, width, height: 16, color: options.fill, borderColor: options.border, borderWidth: options.border ? 0.8 : 0 });
    this.page.drawText(clean, { x: x + 8, y: top - 11.5, size: 8.5, font: this.bold, color: options.color });
    return width;
  }

  // label and value pairs in a soft panel, two across
  details(rows: Array<[string, string]>) {
    const items = rows.filter((row) => row[1]);
    const rowHeight = 36;
    const height = Math.ceil(items.length / 2) * rowHeight + 10;
    this.ensure(height + 8);
    const top = this.y;
    this.page.drawRectangle({ x: M, y: top - height, width: CONTENT, height, color: PANEL, borderColor: RULE, borderWidth: 0.6 });
    const cell = CONTENT / 2;
    items.forEach(([label, value], index) => {
      const x = M + 14 + (index % 2) * cell;
      const cellTop = top - 8 - Math.floor(index / 2) * rowHeight;
      this.text(label.toUpperCase(), x, cellTop - 10, 7, true, MUTED);
      this.page.drawText(this.fit(value, 10.5, false, cell - 26), { x, y: cellTop - 25, size: 10.5, font: this.regular, color: INK });
    });
    this.y = top - height - 6;
  }

  // a message or note on a tinted card with a coloured edge
  async card(label: string, at: string | null, text: string, tone: "handler" | "reporter") {
    const inner = CONTENT - 28;
    const body = await this.prepare(text, 10, inner);
    const height = 9 + 13 + 4 + body.height + 9;
    this.ensure(height + 8);
    const top = this.y;
    const edge = tone === "handler" ? BRAND : MUTED;
    this.page.drawRectangle({ x: M, y: top - height, width: CONTENT, height, color: tone === "handler" ? TINT : PANEL, borderColor: RULE, borderWidth: 0.5 });
    this.page.drawRectangle({ x: M, y: top - height, width: 3.5, height, color: edge });
    this.text(label, M + 15, top - 9 - 9, 9.5, true, edge);
    if (at) this.right(when(at), M + CONTENT - 10, top - 9 - 9, 8.5, false, MUTED);
    body.draw(this.page, M + 15, top - 9 - 13 - 4);
    this.y = top - height - 7;
  }

  // a simple table with a shaded header and striped rows; cell text wraps
  table(columns: Array<{ label: string; width: number }>, rows: string[][]) {
    const fontSize = 8.5;
    const lineHeight = 11.5;
    const headerHeight = 18;
    const drawHeader = () => {
      this.ensure(headerHeight + 30);
      this.page.drawRectangle({ x: M, y: this.y - headerHeight, width: CONTENT, height: headerHeight, color: SOFT });
      let x = M + 8;
      for (const column of columns) {
        this.text(column.label.toUpperCase(), x, this.y - 12, 7, true, BRAND);
        x += column.width;
      }
      this.y -= headerHeight;
    };
    drawHeader();
    rows.forEach((row, index) => {
      const cells = row.map((cell, column) => this.wrap(flatten(cell), fontSize, false, columns[column].width - 14));
      const height = Math.max(...cells.map((lines) => lines.length)) * lineHeight + 8;
      if (this.y - height < FOOTER) {
        this.newPage();
        drawHeader();
      }
      if (index % 2 === 1) this.page.drawRectangle({ x: M, y: this.y - height, width: CONTENT, height, color: PANEL });
      this.page.drawRectangle({ x: M, y: this.y - height, width: CONTENT, height: 0.4, color: RULE });
      let x = M + 8;
      cells.forEach((lines, column) => {
        lines.forEach((line, lineIndex) => this.page.drawText(line, { x, y: this.y - 4 - fontSize - lineIndex * lineHeight + 1, size: fontSize, font: this.regular, color: INK }));
        x += columns[column].width;
      });
      this.y -= height;
    });
    this.gap(6);
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
  doc.setAuthor("Enshore");
  const w = await new Writer(doc, deps, input.reference).init();

  // ---- title -------------------------------------------------------------------------------------------------------------
  w.text("SPEAK UP CASE", M, w.y - 8, 8.5, true, ACCENT);
  w.y -= 12;
  w.text(input.reference, M, w.y - 26, 28, true, BRAND);
  w.y -= 34;
  w.text(`${input.category}  |  ${input.route}`, M, w.y - 10, 11, false, MUTED);
  w.y -= 22;
  let x = M;
  x += w.pill(input.status, x, w.y, { fill: input.status === "Closed" ? BRAND : TINT, border: input.status === "Closed" ? undefined : ACCENT, color: input.status === "Closed" ? WHITE : BRAND }) + 6;
  x += w.pill(input.assignedTo ? `Handled by ${input.assignedTo}` : "Not assigned", x, w.y, input.assignedTo ? { fill: TINT, border: ACCENT, color: BRAND } : { fill: WHITE, border: WARN, color: INK }) + 6;
  if (input.outcome) w.pill(`Outcome: ${input.outcome}`, x, w.y, { fill: TINT, border: ACCENT, color: BRAND });
  w.y -= 26;
  w.text(`Prepared by ${input.generatedBy} on ${when(input.generatedAt)}. Contains personal information: handle in line with Enshore's whistleblowing procedure.`, M, w.y - 8, 8, false, MUTED);
  w.y -= 18;

  // ---- case details ------------------------------------------------------------------------------------------------------
  w.section("Case details");
  w.details([
    ["Received", when(input.receivedAt)],
    ["Reporter chose", input.reporterMode + (input.reporterGroup ? `, ${input.reporterGroup}` : "")],
    ["Acknowledged", input.acknowledgedAt ? when(input.acknowledgedAt) : `Not yet (due ${day(input.acknowledgeBy)})`],
    ["Feedback due", day(input.feedbackBy)],
    ["Closed", when(input.closedAt)],
    ["Outcome", input.outcome || ""],
  ]);

  // ---- the report --------------------------------------------------------------------------------------------------------
  w.section("Report");
  await w.flow(input.body);
  if (input.contact) {
    w.gap(8);
    await w.card("Contact details given by the reporter", null, input.contact, "handler");
  }

  // ---- messages ----------------------------------------------------------------------------------------------------------
  w.section(`Messages (${input.messages.length})`);
  if (!input.messages.length) await w.flow("No messages.", 10);
  for (const message of input.messages) await w.card(message.from, message.at, message.text, message.from === "Reporter" ? "reporter" : "handler");

  // ---- activity ----------------------------------------------------------------------------------------------------------
  w.section("Activity log");
  if (!input.activity.length) await w.flow("No activity recorded.", 10);
  else w.table([{ label: "When", width: 108 }, { label: "Activity", width: CONTENT - 108 }], input.activity.map((entry) => [when(entry.at), entry.text]));

  // ---- attachments: decide, file by file, what can go inside the PDF and what has to travel beside it ----------------
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

  w.section(`Attachments (${input.files.length})`);
  if (!attachments.length) await w.flow("No files were attached.", 10);
  else {
    w.table(
      [{ label: "File", width: 190 }, { label: "Added by", width: 92 }, { label: "Added", width: 92 }, { label: "Size", width: 52 }, { label: "Where", width: CONTENT - 426 }],
      attachments.map((item) => [item.file.name, item.file.addedBy, when(item.file.addedAt), size(item.file.bytes.length), item.kind === "loose" ? "In the ZIP" : "In this PDF"]),
    );
    if (attachments.some((item) => item.kind === "loose")) {
      await w.flow("Files marked In the ZIP, such as Word or Excel documents, cannot be shown inside a PDF and are supplied alongside it.", 9);
    }
  }

  for (const item of attachments) {
    if (item.kind === "loose") continue;
    w.newPage();
    w.section(`Attachment: ${w.fit(item.file.name, 10.5, true, CONTENT - 120)}`);
    w.text(`Added by ${item.file.addedBy}, ${when(item.file.addedAt)}${item.kind === "pdf" ? ". The attached PDF follows on the next pages." : ""}`, M, w.y - 8, 9, false, MUTED);
    w.y -= 22;
    if (item.kind === "image") {
      const room = w.y - FOOTER;
      const scale = Math.min(CONTENT / item.image.width, room / item.image.height, 1);
      const width = item.image.width * scale;
      const height = item.image.height * scale;
      w.page.drawRectangle({ x: M - 3, y: w.y - height - 3, width: width + 6, height: height + 6, borderColor: RULE, borderWidth: 0.8 });
      w.page.drawImage(item.image, { x: M, y: w.y - height, width, height });
    } else {
      for (const page of await doc.copyPages(item.source, item.source.getPageIndices())) doc.addPage(page);
    }
  }

  // ---- footer on every page this document wrote (not on pages copied from attached PDFs) -------------------------------------
  const all = doc.getPages();
  for (const page of w.own) {
    page.drawRectangle({ x: M, y: 38, width: CONTENT, height: 0.6, color: RULE });
    page.drawText(flatten(`Speak Up case ${input.reference}  |  Confidential: contains personal information`), { x: M, y: 25, size: 7.5, font: w.regular, color: MUTED });
    const label = `Page ${all.indexOf(page) + 1} of ${all.length}`;
    page.drawText(label, { x: W - M - w.bold.widthOfTextAtSize(label, 7.5), y: 25, size: 7.5, font: w.bold, color: BRAND });
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

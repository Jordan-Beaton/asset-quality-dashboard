import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  AlignmentType,
  BorderStyle,
  Document as WordDocument,
  Footer,
  PageOrientation,
  Paragraph,
  SimpleField,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { actionsText, formatDate, implementationPeriod, nextStepText, type Annex } from "./mocRegister";

// The Word and PDF annexes follow the house style of the Project Reports annexes:
// landscape A4, Calibri, teal header row with white bold text, grey banded rows, project title block, page footer.
// Cost is never included, and neither are the internal notes in the workbook.

const TEAL = "005670";
const GREY = "ECECE7";
const LINE = "D0D0CE";
const MUTED = "53565A";

const REGISTER_HEAD = ["MOC No.", "Title", "Applies to", "Type", "Coordinator", "Implementation period", "Status", "Actions closed", "Next step"];
const REGISTER_WIDTHS = [1000, 3100, 900, 950, 1400, 1800, 1500, 900, 3500];
const ACTION_HEAD = ["MOC No.", "No.", "Action", "Responsible", "Target", "Status"];
const ACTION_WIDTHS = [1100, 600, 6600, 2400, 2000, 1200];

function generated() {
  return new Date().toLocaleString("en-GB");
}

function summaryLine(annex: Annex) {
  const { counts } = annex;
  return `${counts.total} MOC${counts.total === 1 ? "" : "s"} | ${counts.open} open | ${counts.finished} closed or not implemented | ${counts.openActions} open action${counts.openActions === 1 ? "" : "s"} | Position at ${formatDate(annex.reportDate)} | Generated ${generated()}`;
}

function registerBody(annex: Annex) {
  return annex.rows.map((row) => [row.mocNo, row.title || "-", row.appliesTo || "All", row.type || "-", row.coordinator || "-", implementationPeriod(row), row.status || "-", actionsText(row), nextStepText(row)]);
}

function actionBody(annex: Annex) {
  return annex.openActions.map((action) => [action.mocNo, action.no || "-", action.description, action.responsible || "-", action.target ? formatDate(action.target) : "-", action.status || "Open"]);
}

export function mocFileName(annex: Annex, extension: "docx" | "pdf") {
  const label = annex.projectLabel.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "Project";
  return `${label}-MOC-Register${annex.project ? `-${annex.project}` : ""}-${annex.reportDate}.${extension}`;
}

export function buildMocWord(annex: Annex): WordDocument {
  const border = { style: BorderStyle.SINGLE, size: 2, color: LINE };
  const borders = { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };
  const cell = (value: string, width: number, options: { header?: boolean; fill?: string } = {}) =>
    new TableCell({
      width: { size: width, type: WidthType.DXA },
      margins: { top: 70, bottom: 70, left: 90, right: 90 },
      shading: options.header ? { fill: TEAL } : options.fill ? { fill: options.fill } : undefined,
      children: String(value || "-").split("\n").map(
        (line) => new Paragraph({ children: [new TextRun({ text: line, font: "Calibri", bold: options.header, color: options.header ? "FFFFFF" : "000000", size: options.header ? 15 : 14 })] }),
      ),
    });
  const table = (head: string[], widths: number[], rows: string[][]) =>
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      columnWidths: widths,
      borders,
      rows: [
        new TableRow({ tableHeader: true, children: head.map((value, index) => cell(value, widths[index], { header: true })) }),
        ...rows.map((row, rowIndex) => new TableRow({ cantSplit: true, children: row.map((value, index) => cell(value, widths[index], { fill: rowIndex % 2 === 0 ? GREY : undefined })) })),
      ],
    });
  const title = `MOC Register - ${annex.project || annex.projectLabel}`;
  const note = (text: string) => new Paragraph({ spacing: { before: 80, after: 80 }, children: [new TextRun({ text, font: "Calibri", size: 15, color: MUTED })] });
  const actionRows = actionBody(annex);
  return new WordDocument({
    styles: { default: { document: { run: { font: "Calibri", size: 17, color: "000000" } } } },
    sections: [{
      properties: { page: { size: { orientation: PageOrientation.LANDSCAPE }, margin: { top: 540, right: 540, bottom: 720, left: 540, footer: 300 } } },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${annex.projectLabel} | ${title} | Page `, font: "Calibri", size: 15, color: MUTED }), new SimpleField("PAGE"), new TextRun({ text: " of ", font: "Calibri", size: 15, color: MUTED }), new SimpleField("NUMPAGES")] })] }) },
      children: [
        new Paragraph({ spacing: { after: 50 }, children: [new TextRun({ text: `${annex.projectLabel.toUpperCase()} PROJECT`, font: "Calibri", bold: true, size: 32, color: TEAL })] }),
        new Paragraph({ spacing: { after: 70 }, children: [new TextRun({ text: title, font: "Calibri", bold: true, size: 26 })] }),
        new Paragraph({ spacing: { after: 170 }, children: [new TextRun({ text: summaryLine(annex), font: "Calibri", size: 16, color: MUTED })] }),
        annex.rows.length ? table(REGISTER_HEAD, REGISTER_WIDTHS, registerBody(annex)) : note("No MOCs apply to this project at the reporting date."),
        new Paragraph({ spacing: { before: 280, after: 70 }, pageBreakBefore: false, children: [new TextRun({ text: "Open actions", font: "Calibri", bold: true, size: 24 })] }),
        actionRows.length ? table(ACTION_HEAD, ACTION_WIDTHS, actionRows) : note("No open actions are recorded against these MOCs."),
      ],
    }],
  });
}

export function buildMocPdf(annex: Annex): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const title = `MOC Register - ${annex.project || annex.projectLabel}`;
  doc.setFillColor(0, 86, 112);
  doc.rect(0, 0, width, 24, "F");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(17);
  doc.text(`${annex.projectLabel.toUpperCase()} PROJECT`, 10, 11);
  doc.setFontSize(10);
  doc.text(title, 10, 18);
  doc.setTextColor(83, 86, 90);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(summaryLine(annex), 10, 29);
  const styles = { fontSize: 7.5, cellPadding: 2, textColor: [0, 0, 0] as [number, number, number], lineColor: [208, 208, 206] as [number, number, number], lineWidth: 0.2, valign: "middle" as const, overflow: "linebreak" as const };
  const headStyles = { fillColor: [0, 86, 112] as [number, number, number], textColor: [255, 255, 255] as [number, number, number], fontStyle: "bold" as const };
  const alternateRowStyles = { fillColor: [236, 236, 231] as [number, number, number] };
  let nextY = 33;
  if (annex.rows.length) {
    autoTable(doc, { startY: nextY, theme: "grid", margin: { left: 10, right: 10, bottom: 15 }, head: [REGISTER_HEAD], body: registerBody(annex), headStyles, styles, alternateRowStyles, columnStyles: { 1: { cellWidth: 62 }, 8: { cellWidth: 62 } } });
    nextY = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? nextY) + 10;
  } else {
    doc.text("No MOCs apply to this project at the reporting date.", 10, nextY + 4);
    nextY += 14;
  }
  if (nextY > height - 40) { doc.addPage(); nextY = 16; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text("Open actions", 10, nextY);
  const actionRows = actionBody(annex);
  if (actionRows.length) autoTable(doc, { startY: nextY + 3, theme: "grid", margin: { left: 10, right: 10, bottom: 15 }, head: [ACTION_HEAD], body: actionRows, headStyles, styles, alternateRowStyles, columnStyles: { 2: { cellWidth: 120 } } });
  else { doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(83, 86, 90); doc.text("No open actions are recorded against these MOCs.", 10, nextY + 7); }
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(83, 86, 90);
    doc.text(`${annex.projectLabel} | ${title}`, 10, height - 6);
    doc.text(`Page ${page} of ${pages}`, width - 10, height - 6, { align: "right" });
  }
  return doc;
}

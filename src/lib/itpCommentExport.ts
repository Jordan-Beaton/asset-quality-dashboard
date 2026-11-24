import { saveBlobAsFile } from "./fileOpen";
// Takes the comments the reviewer ticked and turns them into a file or clipboard text, for their own email to the supplier.
// Browser only: the libraries load when a button is pressed, so the ITP page itself stays light.

export type ExportComment = { ref: string | null; text: string; author: string | null; date: string };

type Head = { documentNumber: string; title: string; revision: string; supplier: string | null; showNames: boolean };

function fileStem(head: Head) {
  return `${head.documentNumber}-Rev-${head.revision}-comments`.replace(/[^A-Za-z0-9._-]+/g, "-");
}

function saveBlob(blob: Blob, name: string) {
  saveBlobAsFile(blob, name);
}

export async function downloadCommentsExcel(head: Head, items: ExportComment[]) {
  const XLSX = await import("xlsx");
  const header = ["No.", "Section / ref", "Comment", ...(head.showNames ? ["Raised by"] : []), "Supplier response"];
  const rows = items.map((item, index) => [index + 1, item.ref || "", item.text, ...(head.showNames ? [item.author || ""] : []), ""]);
  const sheet = XLSX.utils.aoa_to_sheet([
    [`${head.documentNumber} ${head.title}`],
    [`Rev ${head.revision}${head.supplier ? ` · ${head.supplier}` : ""} · Enshore review comments`],
    [],
    header,
    ...rows,
  ]);
  sheet["!cols"] = [{ wch: 5 }, { wch: 20 }, { wch: 80 }, ...(head.showNames ? [{ wch: 22 }] : []), { wch: 36 }];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Comments");
  XLSX.writeFile(book, `${fileStem(head)}.xlsx`);
}

export async function downloadCommentsWord(head: Head, items: ExportComment[]) {
  const { AlignmentType, BorderStyle, Document, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType } = await import("docx");
  const widths = head.showNames ? [600, 1700, 4700, 1500, 1500] : [600, 1900, 5600, 1700];
  const total = widths.reduce((sum, width) => sum + width, 0);
  const border = { style: BorderStyle.SINGLE, size: 4, color: "D0D0CE" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const cell = (text: string, width: number, bold = false, fill?: string) =>
    new TableCell({
      width: { size: width, type: WidthType.DXA },
      borders,
      margins: { top: 70, bottom: 70, left: 100, right: 100 },
      shading: fill ? { type: ShadingType.CLEAR, color: "auto", fill } : undefined,
      children: text.split("\n").map((line) => new Paragraph({ children: [new TextRun({ text: line, bold, size: 20, font: "Segoe UI", color: fill ? "FFFFFF" : "000000" })] })),
    });
  const headerRow = new TableRow({
    tableHeader: true,
    children: [cell("No.", widths[0], true, "005670"), cell("Section / ref", widths[1], true, "005670"), cell("Comment", widths[2], true, "005670"), ...(head.showNames ? [cell("Raised by", widths[3], true, "005670")] : []), cell("Supplier response", widths[widths.length - 1], true, "005670")],
  });
  const body = items.map((item, index) => new TableRow({
    children: [cell(String(index + 1), widths[0]), cell(item.ref || "", widths[1]), cell(item.text, widths[2]), ...(head.showNames ? [cell(item.author || "", widths[3])] : []), cell("", widths[widths.length - 1])],
  }));
  const doc = new Document({
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } },
      children: [
        new Paragraph({ children: [new TextRun({ text: "Enshore Subsea · ITP review comments", bold: true, size: 30, font: "Segoe UI", color: "005670" })] }),
        new Paragraph({ spacing: { before: 80 }, children: [new TextRun({ text: `${head.documentNumber} · ${head.title}`, bold: true, size: 22, font: "Segoe UI" })] }),
        new Paragraph({ spacing: { after: 200 }, alignment: AlignmentType.LEFT, children: [new TextRun({ text: `Rev ${head.revision}${head.supplier ? ` · ${head.supplier}` : ""}`, size: 20, font: "Segoe UI", color: "53565A" })] }),
        new Table({ width: { size: total, type: WidthType.DXA }, columnWidths: widths, rows: [headerRow, ...body] }),
      ],
    }],
  });
  saveBlob(await Packer.toBlob(doc), `${fileStem(head)}.docx`);
}

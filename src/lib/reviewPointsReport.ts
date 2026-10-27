import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import XLSXStyle from "xlsx-js-style";
import { exportRgb } from "./exportTheme";
import { printable } from "./observationReportPdf";
import { formatDay, formatDayTime, type ReviewPoint } from "./reviewPoints";

export type ReviewReportVersion = "internal" | "client";
export type ReviewReportGroup = "itp" | "project";

export type ReviewReportItp = { document_number: string; supplier: string | null; project_key: string };

export type ReviewReportOptions = {
  version: ReviewReportVersion;
  group: ReviewReportGroup;
  // Plain-language description of the filters behind the rows, printed under the title.
  filters: string[];
  generatedBy?: string;
  projectLabel: (projectKey: string) => string;
  logo?: string;
};

export const CLIENT_FAILED_LABEL = "Pending - resubmission required";

export type ReportRow = {
  group: string;
  itp: string;
  project: string;
  section: string;
  text: string;
  code: string;
  status: string;
  reviewer: string;
  target: string;
  signedOff: string;
  note: string;
  bucket: "Accepted" | "Pending" | "Failed";
};

// The client version never shows a failure, its reason, who is reviewing or when it is due: a failed
// point reads as "Pending - resubmission required", and counts as pending.
export function buildReportRows(points: ReviewPoint[], itps: Map<string, ReviewReportItp>, options: ReviewReportOptions): ReportRow[] {
  const client = options.version === "client";
  return points.map((point) => {
    const itp = itps.get(point.itp_id);
    const failedForClient = client && point.status === "Failed";
    const status = failedForClient ? CLIENT_FAILED_LABEL : point.status;
    const signed = point.status === "Pending" || failedForClient
      ? ""
      : `${point.status} by ${point.decided_by || "unknown"} on ${formatDay(point.decided_at)}`;
    const project = options.projectLabel(point.project_key);
    const itpLabel = `${itp?.document_number || "Unknown ITP"}${itp?.supplier ? ` · ${itp.supplier}` : ""}`;
    return {
      group: options.group === "itp" ? itpLabel : project,
      itp: itpLabel,
      project,
      section: point.section_number,
      text: point.activity_description,
      code: point.code,
      status,
      reviewer: client ? "" : point.reviewer || "",
      target: client ? "" : formatDay(point.target_date),
      signedOff: signed,
      note: !client && point.status === "Failed" ? point.decision_note || "" : "",
      bucket: failedForClient ? "Pending" : point.status,
    };
  });
}

function summary(rows: ReportRow[]) {
  const accepted = rows.filter((row) => row.bucket === "Accepted").length;
  const pending = rows.filter((row) => row.bucket === "Pending").length;
  const failed = rows.filter((row) => row.bucket === "Failed").length;
  return { total: rows.length, accepted, pending, failed };
}

function groupRows(rows: ReportRow[]) {
  const groups = new Map<string, ReportRow[]>();
  rows.forEach((row) => groups.set(row.group, [...(groups.get(row.group) || []), row]));
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], "en", { numeric: true, sensitivity: "base" }));
}

export function createReviewPointsPdf(rows: ReportRow[], options: ReviewReportOptions) {
  const client = options.version === "client";
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  const generatedAt = new Date().toLocaleString("en-GB", { timeZone: "Europe/London", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const filterText = options.filters.length ? options.filters.map(printable).join("   |   ") : "No filters applied";

  // Header: Enshore logo left, title centred, brand rule underneath
  if (options.logo) {
    try {
      pdf.addImage(options.logo, "PNG", margin, 7, 30, 15);
    } catch {
      // a logo that cannot be drawn must not stop the report
    }
  } else {
    pdf.setTextColor(...exportRgb.brand);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text("ENSHORE", margin, 16);
  }
  pdf.setTextColor(...exportRgb.ink);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(17);
  pdf.text(client ? "ITP Review Points - Client Report" : "ITP Review Points Report", pageWidth / 2, 14, { align: "center" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(...exportRgb.muted);
  pdf.text(`Generated: ${generatedAt}${options.generatedBy && !client ? ` by ${printable(options.generatedBy)}` : ""}`, pageWidth / 2, 20, { align: "center" });
  pdf.setDrawColor(...exportRgb.brand);
  pdf.setLineWidth(0.8);
  pdf.line(margin, 26, pageWidth - margin, 26);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.text("FILTERS", margin, 33);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(...exportRgb.ink);
  const filterLines = pdf.splitTextToSize(filterText, contentWidth - 18) as string[];
  pdf.text(filterLines, margin + 17, 33);
  let y = 33 + filterLines.length * 4 + 2;

  // Summary strip
  const totals = summary(rows);
  const cells: Array<[string, string, boolean]> = client
    ? [["Review points", String(totals.total), false], ["Accepted", String(totals.accepted), false], ["Pending", String(totals.pending), false], ["Complete", `${totals.total ? Math.round((totals.accepted / totals.total) * 100) : 0}%`, false]]
    : [["Review points", String(totals.total), false], ["Accepted", String(totals.accepted), false], ["Pending", String(totals.pending), false], ["Failed", String(totals.failed), totals.failed > 0]];
  const cellWidth = contentWidth / cells.length;
  pdf.setDrawColor(...exportRgb.border);
  pdf.setLineWidth(0.25);
  pdf.roundedRect(margin, y, contentWidth, 13, 1.5, 1.5, "S");
  cells.forEach(([label, value, alert], index) => {
    const x = margin + index * cellWidth;
    if (index) pdf.line(x, y, x, y + 13);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    if (alert) pdf.setTextColor(...exportRgb.danger);
    else pdf.setTextColor(...exportRgb.brand);
    pdf.text(value, x + 4, y + 7);
    pdf.setFontSize(6.5);
    pdf.setTextColor(...exportRgb.muted);
    pdf.text(label.toUpperCase(), x + 4, y + 11);
  });
  y += 19;

  const columnStyles: Record<string, { cellWidth: number; fontStyle?: "bold"; textColor?: [number, number, number] }> = client
    ? {
        0: { cellWidth: 18, fontStyle: "bold" as const, textColor: [...exportRgb.brand] as [number, number, number] },
        1: { cellWidth: contentWidth - 18 - 16 - 52 - 70 },
        2: { cellWidth: 16 },
        3: { cellWidth: 52 },
        4: { cellWidth: 70 },
      }
    : {
        0: { cellWidth: 16, fontStyle: "bold" as const, textColor: [...exportRgb.brand] as [number, number, number] },
        1: { cellWidth: contentWidth - 16 - 14 - 34 - 20 - 26 - 70 },
        2: { cellWidth: 14 },
        3: { cellWidth: 34 },
        4: { cellWidth: 20 },
        5: { cellWidth: 26 },
        6: { cellWidth: 70 },
      };
  const columnCount = client ? 5 : 7;

  groupRows(rows).forEach(([name, list]) => {
    const accepted = list.filter((row) => row.bucket === "Accepted").length;
    if (y > pageHeight - 48) {
      pdf.addPage();
      y = 16;
    }
    autoTable(pdf, {
      startY: y,
      margin: { left: margin, right: margin, top: 16, bottom: 14 },
      theme: "grid",
      showHead: "everyPage",
      rowPageBreak: "avoid",
      head: [
        [{
          content: `${printable(name)}    -    ${accepted} of ${list.length} accepted`,
          colSpan: columnCount,
          styles: { fillColor: [...exportRgb.brand], textColor: [...exportRgb.white], fontSize: 9, fontStyle: "bold", halign: "left", cellPadding: { top: 1.8, bottom: 1.8, left: 2.5, right: 2.5 } },
        }],
        client ? ["Section", "Review point", "Code", "Status", "Signed off"] : ["Section", "Review point", "Code", "Reviewer", "Target", "Status", "Signed off"],
      ],
      body: list.map((row) => client
        ? [printable(row.section), printable(row.text), row.code, row.status, printable(row.signedOff) || "-"]
        : [printable(row.section), printable(row.text), row.code, printable(row.reviewer) || "-", row.target || "-", row.status, [printable(row.signedOff), row.note ? `Reason: ${printable(row.note)}` : ""].filter(Boolean).join("\n") || "-"]),
      styles: { font: "helvetica", fontSize: 7.8, cellPadding: 1.8, textColor: [...exportRgb.ink], lineColor: [...exportRgb.border], lineWidth: 0.15, valign: "top", overflow: "linebreak" },
      headStyles: { fillColor: [...exportRgb.page], textColor: [...exportRgb.muted], fontStyle: "bold", fontSize: 6.8 },
      columnStyles,
      didParseCell: (data) => {
        if (data.section !== "body") return;
        const statusColumn = client ? 3 : 5;
        if (data.column.index !== statusColumn) return;
        const value = String(data.cell.raw || "");
        if (value === "Accepted") {
          data.cell.styles.fillColor = [227, 238, 241];
          data.cell.styles.textColor = [...exportRgb.brand];
          data.cell.styles.fontStyle = "bold";
        } else if (value === "Failed") {
          data.cell.styles.textColor = [...exportRgb.danger];
          data.cell.styles.fontStyle = "bold";
        } else {
          data.cell.styles.fillColor = [255, 241, 209];
        }
      },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(7.5);
          pdf.setTextColor(...exportRgb.muted);
          pdf.text(`ITP Review Points  |  ${filterText}`, margin, 9, { maxWidth: contentWidth });
        }
      },
    });
    y = ((pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y) + 6;
  });

  if (!rows.length) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(...exportRgb.muted);
    pdf.text("No review points match the selected filters.", margin, y + 6);
  }

  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(...exportRgb.border);
    pdf.setLineWidth(0.25);
    pdf.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(...exportRgb.muted);
    pdf.text(`Enshore IMS - ITP review points${client ? " - client version" : " - internal"} - generated ${generatedAt}`, margin, pageHeight - 6);
    pdf.text(`Page ${page} of ${pages}`, pageWidth - margin, pageHeight - 6, { align: "right" });
  }
  return pdf;
}

export function createReviewPointsWorkbook(rows: ReportRow[], options: ReviewReportOptions) {
  const client = options.version === "client";
  const header = client
    ? ["Project", "ITP", "Section", "Review point", "Code", "Status", "Signed off"]
    : ["Project", "ITP", "Section", "Review point", "Code", "Reviewer", "Target date", "Status", "Signed off", "Failure reason"];
  const data = rows.map((row) => client
    ? [row.project, row.itp, row.section, row.text, row.code, row.status, row.signedOff]
    : [row.project, row.itp, row.section, row.text, row.code, row.reviewer, row.target, row.status, row.signedOff, row.note]);
  const sheet = XLSXStyle.utils.aoa_to_sheet([header, ...data]);
  header.forEach((_, index) => {
    const cell = sheet[XLSXStyle.utils.encode_cell({ r: 0, c: index })];
    if (cell) cell.s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "005670" } } };
  });
  sheet["!cols"] = header.map((name) => ({ wch: name === "Review point" ? 60 : name === "Signed off" || name === "Failure reason" ? 40 : name === "ITP" ? 28 : 16 }));
  sheet["!autofilter"] = { ref: XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(1, data.length), c: header.length - 1 } }) };
  const info = XLSXStyle.utils.aoa_to_sheet([
    ["ITP Review Points" + (client ? " - client version" : " - internal")],
    ["Generated", formatDayTime(new Date().toISOString()) + (options.generatedBy && !client ? ` by ${options.generatedBy}` : "")],
    ["Filters", options.filters.join(" | ")],
  ]);
  info["!cols"] = [{ wch: 20 }, { wch: 90 }];
  const workbook = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(workbook, sheet, "Review points");
  XLSXStyle.utils.book_append_sheet(workbook, info, "About");
  return workbook;
}

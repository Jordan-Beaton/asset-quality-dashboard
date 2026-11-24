import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { exportRgb } from "./exportTheme";
import { printable } from "./observationReportPdf";

// Same layout as the HSE Observations report: logos and title across the top, the filters that
// produced the list, a summary strip, then one table per project.

export type AinmReportRecord = {
  ainm_number: string;
  title: string;
  project: string | null;
  location_site: string | null;
  event_date: string | null;
  event_classification: string | null;
  brief_event_details: string | null;
  notification_status: string;
  part1_status: string;
  part2_status: string;
  overall_status: string;
  owner: string | null;
};

export type AinmReportOptions = {
  // Plain-language filter descriptions printed under the title, for example "Status: Open".
  filters: string[];
  generatedBy?: string;
  includeDetails: boolean;
  // Logos as data URLs. Either can be left out and the header still renders.
  logos?: { enshore?: string; threeRs?: string };
};

const ENSHORE_LOGO_RATIO = 2040 / 1020;
const THREE_RS_LOGO_RATIO = 1889 / 712;
const MARGIN = 10;

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return printable(value) || "-";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function sortTime(record: AinmReportRecord) {
  const time = new Date(record.event_date || "").getTime();
  return Number.isNaN(time) ? 0 : time;
}

function isClosed(record: AinmReportRecord) {
  return record.overall_status.trim().toLowerCase() === "closed";
}

function typeLabel(record: AinmReportRecord) {
  const number = record.ainm_number.trim().toUpperCase();
  if (number.startsWith("AR")) return "Accident";
  if (number.startsWith("IR")) return "Incident";
  return "Other";
}

export function ainmReportFileName(projectLabel: string, date = new Date()) {
  const stamp = date.toISOString().slice(0, 10);
  const project = projectLabel.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `HSE-AINM-Register-${project ? `${project}-` : ""}${stamp}.pdf`;
}

export function createAinmReportPdf(records: AinmReportRecord[], options: AinmReportOptions) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN * 2;
  const generatedAt = new Date().toLocaleString("en-GB", { timeZone: "Europe/London", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const filterText = options.filters.length ? options.filters.map(printable).join("   |   ") : "No filters applied";

  const logoRow = 7;
  const logoHeight = 15;
  const addLogo = (dataUrl: string | undefined, x: number, ratio: number, align: "left" | "right") => {
    if (!dataUrl) return;
    const width = logoHeight * ratio;
    const format = dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
    try {
      pdf.addImage(dataUrl, format, align === "left" ? x : x - width, logoRow, width, logoHeight);
    } catch {
      // a logo that cannot be drawn must not stop the report
    }
  };
  addLogo(options.logos?.enshore, MARGIN, ENSHORE_LOGO_RATIO, "left");
  addLogo(options.logos?.threeRs, pageWidth - MARGIN, THREE_RS_LOGO_RATIO, "right");
  if (!options.logos?.enshore) {
    pdf.setTextColor(...exportRgb.brand);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text("ENSHORE", MARGIN, logoRow + 9);
  }
  pdf.setTextColor(...exportRgb.ink);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(17);
  pdf.text("HSE AINM Register Report", pageWidth / 2, logoRow + 7, { align: "center" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(...exportRgb.muted);
  pdf.text(`Generated: ${generatedAt}${options.generatedBy ? ` by ${printable(options.generatedBy)}` : ""}`, pageWidth / 2, logoRow + 13, { align: "center" });
  pdf.setDrawColor(...exportRgb.brand);
  pdf.setLineWidth(0.8);
  pdf.line(MARGIN, logoRow + logoHeight + 4, pageWidth - MARGIN, logoRow + logoHeight + 4);

  const filtersTop = logoRow + logoHeight + 11;
  pdf.setTextColor(...exportRgb.muted);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.text("FILTERS", MARGIN, filtersTop);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(...exportRgb.ink);
  const filterLines = pdf.splitTextToSize(filterText, contentWidth - 18) as string[];
  pdf.text(filterLines, MARGIN + 17, filtersTop);
  let y = filtersTop + filterLines.length * 4 + 2;

  const open = records.filter((record) => !isClosed(record)).length;
  const incidents = records.filter((record) => typeLabel(record) === "Incident").length;
  const accidents = records.filter((record) => typeLabel(record) === "Accident").length;
  // Stage statuses arrive as display labels ("Completed") or stored values ("Complete").
  const stageDone = (status: string) => /^complete/i.test(status.trim());
  const part1Due = records.filter((record) => !stageDone(record.part1_status)).length;
  const part2Due = records.filter((record) => !stageDone(record.part2_status)).length;
  const cells: Array<[string, number, boolean]> = [
    ["AINMs", records.length, false],
    ["Open", open, false],
    ["Incidents", incidents, false],
    ["Accidents", accidents, accidents > 0],
    ["Part 1 due", part1Due, false],
    ["Part 2 due", part2Due, false],
    ["Closed", records.length - open, false],
  ];
  const cellWidth = contentWidth / cells.length;
  pdf.setDrawColor(...exportRgb.border);
  pdf.setLineWidth(0.25);
  pdf.roundedRect(MARGIN, y, contentWidth, 13, 1.5, 1.5, "S");
  cells.forEach(([label, value, alert], index) => {
    const x = MARGIN + index * cellWidth;
    if (index) pdf.line(x, y, x, y + 13);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    if (alert) pdf.setTextColor(...exportRgb.danger);
    else pdf.setTextColor(...exportRgb.brand);
    pdf.text(String(value), x + 4, y + 7);
    pdf.setFontSize(6.5);
    pdf.setTextColor(...exportRgb.muted);
    pdf.text(label.toUpperCase(), x + 4, y + 11);
  });
  y += 19;

  const groups = new Map<string, AinmReportRecord[]>();
  records.forEach((record) => {
    const key = printable(record.project) || "No project";
    groups.set(key, [...(groups.get(key) || []), record]);
  });
  const names = [...groups.keys()].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base", numeric: true }));

  const widths = [19, 18, 20, 30, 22, 17, 17, 17, 22];
  const columnStyles: Record<number, { cellWidth: number; fontStyle?: "bold"; textColor?: [number, number, number] }> = {
    0: { cellWidth: widths[0], fontStyle: "bold", textColor: [...exportRgb.brand] as [number, number, number] },
  };
  widths.slice(1).forEach((width, index) => { columnStyles[index + 1] = { cellWidth: width }; });
  columnStyles[9] = { cellWidth: contentWidth - widths.reduce((sum, width) => sum + width, 0) };

  const stageColumns = new Set([5, 6, 7, 8]);

  names.forEach((name) => {
    const list = [...(groups.get(name) || [])].sort((a, b) => sortTime(b) - sortTime(a) || b.ainm_number.localeCompare(a.ainm_number, "en", { numeric: true }));
    const openCount = list.filter((record) => !isClosed(record)).length;
    if (y > pageHeight - 48) {
      pdf.addPage();
      y = 16;
    }
    autoTable(pdf, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN, top: 16, bottom: 14 },
      theme: "grid",
      showHead: "everyPage",
      rowPageBreak: "avoid",
      head: [
        [{
          content: `${name}    -    ${list.length} AINM${list.length === 1 ? "" : "s"}, ${openCount} open`,
          colSpan: 10,
          styles: { fillColor: [...exportRgb.brand], textColor: [...exportRgb.white], fontSize: 9, fontStyle: "bold", halign: "left", cellPadding: { top: 1.8, bottom: 1.8, left: 2.5, right: 2.5 } },
        }],
        ["AINM No.", "Event date", "Type", "Classification", "Location", "Notification", "Part 1", "Part 2", "Status", options.includeDetails ? "Title / details" : "Title"],
      ],
      body: list.map((record) => {
        const details = options.includeDetails && printable(record.brief_event_details)
          ? `${printable(record.title) || "-"}\n${printable(record.brief_event_details)}`
          : printable(record.title) || "-";
        return [
          printable(record.ainm_number),
          formatDate(record.event_date),
          typeLabel(record),
          printable(record.event_classification) || "-",
          printable(record.location_site) || "-",
          printable(record.notification_status) || "-",
          printable(record.part1_status) || "-",
          printable(record.part2_status) || "-",
          printable(record.overall_status) || "Open",
          details,
        ];
      }),
      styles: { font: "helvetica", fontSize: 7.6, cellPadding: 1.8, textColor: [...exportRgb.ink], lineColor: [...exportRgb.border], lineWidth: 0.15, valign: "top", overflow: "linebreak" },
      headStyles: { fillColor: [...exportRgb.page], textColor: [...exportRgb.muted], fontStyle: "bold", fontSize: 6.8 },
      columnStyles,
      didParseCell: (data) => {
        if (data.section !== "body") return;
        const value = String(data.cell.raw || "").toLowerCase();
        if (data.column.index === 2 && value === "accident") {
          data.cell.styles.textColor = [...exportRgb.danger];
          data.cell.styles.fontStyle = "bold";
        }
        if (stageColumns.has(data.column.index)) {
          if (value === "complete" || value === "closed") {
            data.cell.styles.textColor = [...exportRgb.muted];
          } else if (value === "open" || value === "in progress" || value === "draft" || value === "issued") {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.textColor = [...exportRgb.brand];
          }
        }
      },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(7.5);
          pdf.setTextColor(...exportRgb.muted);
          pdf.text(`HSE AINM Register Report  |  ${filterText}`, MARGIN, 9, { maxWidth: contentWidth });
        }
      },
    });
    y = ((pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y) + 6;
  });

  if (!records.length) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(...exportRgb.muted);
    pdf.text("No AINMs match the selected filters.", MARGIN, y + 6);
  }

  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(...exportRgb.border);
    pdf.setLineWidth(0.25);
    pdf.line(MARGIN, pageHeight - 10, pageWidth - MARGIN, pageHeight - 10);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(...exportRgb.muted);
    pdf.text(`Enshore IMS - HSE AINM Register - generated ${generatedAt}`, MARGIN, pageHeight - 6);
    pdf.text(`Page ${page} of ${pages}`, pageWidth - MARGIN, pageHeight - 6, { align: "right" });
  }
  return pdf;
}

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { exportRgb } from "./exportTheme";

export type ObservationReportRecord = {
  observation_number: string;
  observation_date: string | null;
  created_at: string | null;
  observation_type: string | null;
  project: string | null;
  site_location: string | null;
  risk_level: string | null;
  status: string | null;
  title: string | null;
  description: string | null;
  immediate_action: string | null;
  suggested_action: string | null;
  assigned_to: string | null;
  closeout_notes: string | null;
};

export type ObservationReportGroup = "project" | "type" | "risk" | "none";
export type ObservationReportSort = "newest" | "oldest" | "risk";

export type ObservationReportOptions = {
  group: ObservationReportGroup;
  sort: ObservationReportSort;
  includeImmediateAction: boolean;
  includeSuggestedAction: boolean;
  includeAssignedTo: boolean;
  includeCloseout: boolean;
  // Plain-language filter descriptions printed under the title, for example "Status: New".
  filters: string[];
  generatedBy?: string;
};

const MARGIN = 10;
const RISK_RANK: Record<string, number> = { "immediate attention": 4, high: 3, medium: 2, low: 1 };

// jsPDF's built-in fonts cover Western European text only. Typographic punctuation is
// mapped to plain equivalents and anything else outside that range is dropped, so a stray
// emoji or symbol in a free-text description cannot corrupt the line it sits in.
function printable(value: unknown) {
  return String(value ?? "")
    .replace(/[‘’‚]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/…/g, "...")
    .replace(/[   ]/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[^\n\x20-\x7E\xA1-\xFF]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return printable(value) || "-";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function sortTime(record: ObservationReportRecord) {
  const time = new Date(record.observation_date || record.created_at || "").getTime();
  return Number.isNaN(time) ? 0 : time;
}

function riskRank(record: ObservationReportRecord) {
  return RISK_RANK[(record.risk_level || "").trim().toLowerCase()] || 0;
}

function isClosed(record: ObservationReportRecord) {
  return (record.status || "").trim().toLowerCase() === "closed";
}

function isHigh(record: ObservationReportRecord) {
  return riskRank(record) >= 3;
}

function compareRecords(sort: ObservationReportSort) {
  return (a: ObservationReportRecord, b: ObservationReportRecord) => {
    if (sort === "oldest") return sortTime(a) - sortTime(b) || a.observation_number.localeCompare(b.observation_number, "en", { numeric: true });
    if (sort === "risk") return riskRank(b) - riskRank(a) || sortTime(b) - sortTime(a);
    return sortTime(b) - sortTime(a) || b.observation_number.localeCompare(a.observation_number, "en", { numeric: true });
  };
}

function groupKey(record: ObservationReportRecord, group: ObservationReportGroup) {
  if (group === "project") return printable(record.project) || "No project";
  if (group === "type") return printable(record.observation_type) || "No type";
  if (group === "risk") return printable(record.risk_level) || "No risk level";
  return "All observations";
}

export function observationReportFileName(projectLabel: string, date = new Date()) {
  const stamp = date.toISOString().slice(0, 10);
  const project = projectLabel.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `HSE-Observations-${project ? `${project}-` : ""}${stamp}.pdf`;
}

export function createObservationReportPdf(records: ObservationReportRecord[], options: ObservationReportOptions) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN * 2;
  const generatedAt = new Date().toLocaleString("en-GB", { timeZone: "Europe/London", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const filterText = options.filters.length ? options.filters.map(printable).join("   |   ") : "No filters applied";

  // Title band
  pdf.setFillColor(...exportRgb.brand);
  pdf.rect(0, 0, pageWidth, 22, "F");
  pdf.setTextColor(...exportRgb.white);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("HSE OBSERVATIONS REPORT", MARGIN, 12);
  pdf.setFontSize(8);
  pdf.text("ENSHORE SUBSEA - INTEGRATED MANAGEMENT SYSTEM", pageWidth - MARGIN, 11, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.text(`Generated ${generatedAt}${options.generatedBy ? ` by ${printable(options.generatedBy)}` : ""}`, MARGIN, 18);

  // Filters
  pdf.setTextColor(...exportRgb.muted);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.text("FILTERS", MARGIN, 29);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(...exportRgb.ink);
  const filterLines = pdf.splitTextToSize(filterText, contentWidth - 18) as string[];
  pdf.text(filterLines, MARGIN + 17, 29);
  let y = 29 + filterLines.length * 4 + 2;

  // Summary strip
  const open = records.filter((record) => !isClosed(record)).length;
  const fresh = records.filter((record) => (record.status || "").trim().toLowerCase() === "new").length;
  const high = records.filter(isHigh).length;
  const cells: Array<[string, number, boolean]> = [
    ["Observations", records.length, false],
    ["Open", open, false],
    ["New", fresh, false],
    ["High / immediate attention", high, high > 0],
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
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.5);
    pdf.setTextColor(...exportRgb.muted);
    pdf.text(label.toUpperCase(), x + 4, y + 11);
  });
  y += 19;

  // Groups
  const groups = new Map<string, ObservationReportRecord[]>();
  records.forEach((record) => {
    const key = groupKey(record, options.group);
    groups.set(key, [...(groups.get(key) || []), record]);
  });
  const names = [...groups.keys()];
  if (options.group === "risk") {
    names.sort((a, b) => (RISK_RANK[a.toLowerCase()] ? -RISK_RANK[a.toLowerCase()] : 0) - (RISK_RANK[b.toLowerCase()] ? -RISK_RANK[b.toLowerCase()] : 0));
  } else {
    names.sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base", numeric: true }));
  }

  const showProjectInLocation = options.group !== "project";
  const columnStyles = {
    0: { cellWidth: 19, fontStyle: "bold" as const, textColor: [...exportRgb.brand] as [number, number, number] },
    1: { cellWidth: 18 },
    2: { cellWidth: 25 },
    3: { cellWidth: 26 },
    4: { cellWidth: 19 },
    5: { cellWidth: 22 },
    6: { cellWidth: 44, fontStyle: "bold" as const },
    7: { cellWidth: contentWidth - (19 + 18 + 25 + 26 + 19 + 22 + 44) },
  };

  names.forEach((name) => {
    const list = [...(groups.get(name) || [])].sort(compareRecords(options.sort));
    const openCount = list.filter((record) => !isClosed(record)).length;
    if (y > pageHeight - 48) {
      pdf.addPage();
      y = 16;
    }
    const groupLabel = options.group === "none"
      ? "All observations"
      : `${name}`;
    autoTable(pdf, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN, top: 16, bottom: 14 },
      theme: "grid",
      showHead: "everyPage",
      rowPageBreak: "avoid",
      head: [
        [{
          content: `${groupLabel}    -    ${list.length} observation${list.length === 1 ? "" : "s"}, ${openCount} open`,
          colSpan: 8,
          styles: { fillColor: [...exportRgb.brand], textColor: [...exportRgb.white], fontSize: 9, fontStyle: "bold", halign: "left", cellPadding: { top: 1.8, bottom: 1.8, left: 2.5, right: 2.5 } },
        }],
        ["No.", "Date", "Type", showProjectInLocation ? "Project / Location" : "Location", "Risk", "Status", "Title", "Description"],
      ],
      body: list.map((record) => {
        const description = [
          printable(record.description) || "-",
          options.includeImmediateAction && printable(record.immediate_action) ? `Immediate action: ${printable(record.immediate_action)}` : "",
          options.includeSuggestedAction && printable(record.suggested_action) ? `Suggested action: ${printable(record.suggested_action)}` : "",
          options.includeAssignedTo && printable(record.assigned_to) ? `Assigned to: ${printable(record.assigned_to)}` : "",
          options.includeCloseout && printable(record.closeout_notes) ? `Close-out: ${printable(record.closeout_notes)}` : "",
        ].filter(Boolean).join("\n");
        return [
          printable(record.observation_number),
          formatDate(record.observation_date || record.created_at),
          printable(record.observation_type) || "-",
          showProjectInLocation ? [printable(record.project), printable(record.site_location)].filter(Boolean).join("\n") || "-" : printable(record.site_location) || "-",
          printable(record.risk_level) || "-",
          printable(record.status) || "New",
          printable(record.title) || "-",
          description,
        ];
      }),
      styles: { font: "helvetica", fontSize: 7.6, cellPadding: 1.8, textColor: [...exportRgb.ink], lineColor: [...exportRgb.border], lineWidth: 0.15, valign: "top", overflow: "linebreak" },
      headStyles: { fillColor: [...exportRgb.page], textColor: [...exportRgb.muted], fontStyle: "bold", fontSize: 6.8 },
      columnStyles,
      didParseCell: (data) => {
        if (data.section !== "body") return;
        const value = String(data.cell.raw || "").toLowerCase();
        if (data.column.index === 4) {
          if (value === "immediate attention") {
            data.cell.styles.fillColor = [...exportRgb.danger];
            data.cell.styles.textColor = [...exportRgb.white];
            data.cell.styles.fontStyle = "bold";
          } else if (value === "high") {
            data.cell.styles.textColor = [...exportRgb.danger];
            data.cell.styles.fontStyle = "bold";
          } else if (value === "medium") {
            data.cell.styles.fontStyle = "bold";
          }
        }
        if (data.column.index === 5) {
          if (value === "action required") {
            data.cell.styles.textColor = [...exportRgb.danger];
            data.cell.styles.fontStyle = "bold";
          } else if (value === "new") {
            data.cell.styles.fillColor = [227, 238, 241];
            data.cell.styles.textColor = [...exportRgb.brand];
            data.cell.styles.fontStyle = "bold";
          } else if (value === "closed") {
            data.cell.styles.textColor = [...exportRgb.muted];
          }
        }
      },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(7.5);
          pdf.setTextColor(...exportRgb.muted);
          pdf.text(`HSE Observations Report  |  ${filterText}`, MARGIN, 9, { maxWidth: contentWidth });
        }
      },
    });
    y = ((pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y) + 6;
  });

  if (!records.length) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(...exportRgb.muted);
    pdf.text("No observations match the selected filters.", MARGIN, y + 6);
  }

  // Footer on every page
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(...exportRgb.border);
    pdf.setLineWidth(0.25);
    pdf.line(MARGIN, pageHeight - 10, pageWidth - MARGIN, pageHeight - 10);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(...exportRgb.muted);
    pdf.text(`Enshore IMS - HSE Observations - generated ${generatedAt}`, MARGIN, pageHeight - 6);
    pdf.text(`Page ${page} of ${pages}`, pageWidth - MARGIN, pageHeight - 6, { align: "right" });
  }
  return pdf;
}

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { PreventionResult } from "./lessonsPrevention";
import { exportRgb } from "./exportTheme";

const MARGIN = 15;
const PAGE_BOTTOM = 278;

function printable(value: unknown) {
  return String(value ?? "")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/\u00b7/g, "-")
    .trim();
}

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
}

export function createLessonsPreventionPdf(result: PreventionResult) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN * 2;
  const citedIds = new Set(result.cautions.flatMap((caution) => caution.lesson_ids));
  const sourceById = new Map((result.sources || []).map((source) => [source.id, source]));
  const additionalSources = (result.sources || []).filter((source) => !citedIds.has(source.id));
  const generatedAt = new Date().toLocaleString("en-GB", { timeZone: "Europe/London" });

  function addPage() {
    pdf.addPage();
    return 20;
  }

  function ensureSpace(y: number, needed: number) {
    return y + needed > PAGE_BOTTOM ? addPage() : y;
  }

  function writeWrapped(text: string, y: number, options?: { bold?: boolean; size?: number; indent?: number }) {
    const indent = options?.indent || 0;
    pdf.setFont("helvetica", options?.bold ? "bold" : "normal");
    pdf.setFontSize(options?.size || 9);
    pdf.setTextColor(...exportRgb.ink);
    const lines = pdf.splitTextToSize(printable(text) || "-", contentWidth - indent);
    y = ensureSpace(y, lines.length * 4.2 + 2);
    pdf.text(lines, MARGIN + indent, y);
    return y + lines.length * 4.2;
  }

  function sectionLabel(label: string, y: number) {
    y = ensureSpace(y, 10);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9.5);
    pdf.setTextColor(...exportRgb.brand);
    pdf.text(label, MARGIN, y);
    return y + 5;
  }

  function wrappedLineCount(text: string, width = contentWidth) {
    return pdf.splitTextToSize(printable(text) || "-", width).length;
  }

  function estimatedCautionHeight(caution: PreventionResult["cautions"][number]) {
    const titleHeight = Math.max(12, wrappedLineCount(caution.title, contentWidth - 14) * 5 + 3);
    const narrativeHeight = (wrappedLineCount(caution.what_failed) + wrappedLineCount(caution.why_it_matters)) * 4.2;
    const controlsHeight = caution.prevention_controls.reduce((total, control) => total + wrappedLineCount(`- ${control}`, contentWidth - 2) * 4.2 + 1, 0);
    const references = caution.lesson_ids.map((id) => sourceById.get(id)?.lesson_number || id).join(", ");
    const referenceHeight = Math.max(10, wrappedLineCount(`Supporting lessons: ${references}`, contentWidth - 8) * 3.8 + 5);
    return titleHeight + narrativeHeight + controlsHeight + referenceHeight + 49;
  }

  pdf.setFillColor(...exportRgb.brand);
  pdf.rect(0, 0, pageWidth, 31, "F");
  pdf.setTextColor(...exportRgb.white);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(17);
  pdf.text("ENSHORE IMS - PREVENTION BRIEF", MARGIN, 13);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.text(`Generated ${generatedAt} Europe/London`, MARGIN, 21);
  if (result.analysis_id) pdf.text(`Analysis reference: ${printable(result.analysis_id)}`, MARGIN, 26);

  let y = 41;
  y = sectionLabel("Scope", y);
  y = writeWrapped(result.scope, y) + 3;
  y = sectionLabel("Management summary", y);
  y = writeWrapped(result.summary, y) + 4;

  autoTable(pdf, {
    startY: y,
    theme: "grid",
    head: [["Records screened", "Candidates analysed", "Prioritised cautions", "Strongest records cited"]],
    body: [[
      (result.screened_count || result.evidence_count).toLocaleString(),
      result.evidence_count.toLocaleString(),
      result.cautions.length.toLocaleString(),
      citedIds.size.toLocaleString(),
    ]],
    headStyles: { fillColor: [...exportRgb.brand], textColor: [...exportRgb.white], fontStyle: "bold", font: "helvetica", fontSize: 7.5 },
    bodyStyles: { textColor: [...exportRgb.ink], lineColor: [...exportRgb.border], font: "helvetica", fontSize: 9, halign: "center" },
    margin: { left: MARGIN, right: MARGIN },
  });
  y = ((pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y + 20) + 8;

  result.cautions.forEach((caution, index) => {
    y = ensureSpace(y, Math.min(estimatedCautionHeight(caution), PAGE_BOTTOM - 20));
    pdf.setFillColor(...exportRgb.brand);
    pdf.roundedRect(MARGIN, y, 9, 9, 2, 2, "F");
    pdf.setTextColor(...exportRgb.white);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(String(index + 1), MARGIN + 4.5, y + 6.2, { align: "center" });
    pdf.setTextColor(...exportRgb.ink);
    pdf.setFontSize(12);
    const titleLines = pdf.splitTextToSize(printable(caution.title), contentWidth - 14);
    pdf.text(titleLines, MARGIN + 13, y + 4.5);
    y += Math.max(12, titleLines.length * 5 + 3);
    pdf.setFontSize(8);
    pdf.setTextColor(...exportRgb.muted);
    pdf.text(`${caution.confidence} confidence - ${caution.lesson_ids.length} cited lessons`, MARGIN, y);
    y += 7;

    y = sectionLabel("What failed", y);
    y = writeWrapped(caution.what_failed, y) + 3;
    y = sectionLabel("Why it matters", y);
    y = writeWrapped(caution.why_it_matters, y) + 3;
    y = sectionLabel("Controls to consider", y);
    caution.prevention_controls.forEach((control) => {
      y = writeWrapped(`- ${control}`, y, { indent: 2 }) + 1;
    });

    const references = caution.lesson_ids
      .map((id) => sourceById.get(id)?.lesson_number || id)
      .filter(Boolean)
      .join(", ");
    y = ensureSpace(y + 2, 13);
    pdf.setFillColor(...exportRgb.page);
    const referenceLines = pdf.splitTextToSize(`Supporting lessons: ${printable(references)}`, contentWidth - 8);
    const boxHeight = Math.max(10, referenceLines.length * 3.8 + 5);
    pdf.roundedRect(MARGIN, y, contentWidth, boxHeight, 2, 2, "F");
    pdf.setTextColor(...exportRgb.muted);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.text(referenceLines, MARGIN + 4, y + 5);
    y += boxHeight + 8;
  });

  if (additionalSources.length) {
    y = ensureSpace(y, 28);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(...exportRgb.brand);
    pdf.text("Additional relevant lessons", MARGIN, y);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(...exportRgb.muted);
    pdf.text("Relevant evidence considered by the analysis but not repeated in the prioritised caution summaries.", MARGIN, y + 5);
    autoTable(pdf, {
      startY: y + 9,
      theme: "grid",
      head: [["Lesson", "Project", "Subject"]],
      body: additionalSources.map((source) => [printable(source.lesson_number), printable(source.project), printable(source.subject)]),
      headStyles: { fillColor: [...exportRgb.brand], textColor: [...exportRgb.white], fontStyle: "bold", font: "helvetica", fontSize: 8 },
      bodyStyles: { textColor: [...exportRgb.ink], lineColor: [...exportRgb.border], font: "helvetica", fontSize: 7.5, cellPadding: 2, overflow: "linebreak" },
      alternateRowStyles: { fillColor: [...exportRgb.page] },
      columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 58 }, 2: { cellWidth: 97 } },
      margin: { left: MARGIN, right: MARGIN, bottom: 20 },
    });
    y = ((pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y + 20) + 8;
  }

  if (result.limitations.length) {
    y = ensureSpace(y, 22);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(...exportRgb.brand);
    pdf.text("Evidence limitations", MARGIN, y);
    y += 6;
    result.limitations.forEach((limitation) => {
      y = writeWrapped(`- ${limitation}`, y, { size: 8.5, indent: 2 }) + 1;
    });
  }

  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(...exportRgb.border);
    pdf.line(MARGIN, 284, pageWidth - MARGIN, 284);
    pdf.setTextColor(...exportRgb.muted);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.text("Enshore IMS - Lessons Learned Prevention Intelligence", MARGIN, 289);
    pdf.text(`Page ${page} of ${pages}`, pageWidth - MARGIN, 289, { align: "right" });
  }

  return pdf;
}

export function downloadLessonsPreventionPdf(result: PreventionResult) {
  const pdf = createLessonsPreventionPdf(result);
  const scope = printable(result.scope).slice(0, 48) || "prevention-brief";
  pdf.save(`${safeFileName(`Enshore-Prevention-Brief-${scope}`)}.pdf`);
}

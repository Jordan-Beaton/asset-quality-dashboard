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
  const relevantSources = result.sources || [];
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

  function writeContentBox(label: string, content: string | string[], y: number) {
    const paragraphs = Array.isArray(content) ? content.map((item) => `- ${item}`) : [content];
    const lines = paragraphs.flatMap((paragraph) => pdf.splitTextToSize(printable(paragraph) || "-", contentWidth - 12));
    const height = 12 + lines.length * 4.1;
    y = ensureSpace(y, height + 3);
    pdf.setFillColor(...exportRgb.page);
    pdf.setDrawColor(...exportRgb.border);
    pdf.roundedRect(MARGIN, y, contentWidth, height, 2.5, 2.5, "FD");
    pdf.setFillColor(...exportRgb.accent);
    pdf.roundedRect(MARGIN, y, 3, height, 1.5, 1.5, "F");
    pdf.setTextColor(...exportRgb.brand);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9.5);
    pdf.text(label, MARGIN + 6, y + 6);
    pdf.setTextColor(...exportRgb.ink);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.8);
    pdf.text(lines, MARGIN + 6, y + 11);
    return y + height + 4;
  }

  function wrappedLineCount(text: string, width = contentWidth) {
    return pdf.splitTextToSize(printable(text) || "-", width).length;
  }

  function estimatedCautionHeight(caution: PreventionResult["cautions"][number]) {
    const titleHeight = Math.max(12, wrappedLineCount(caution.title, contentWidth - 14) * 5 + 3);
    const narrativeHeight = (wrappedLineCount(caution.what_failed, contentWidth - 12) + wrappedLineCount(caution.why_it_matters, contentWidth - 12)) * 4.2;
    const controlsHeight = caution.prevention_controls.reduce((total, control) => total + wrappedLineCount(`- ${control}`, contentWidth - 2) * 4.2 + 1, 0);
    const references = caution.lesson_ids.map((id) => sourceById.get(id)?.lesson_number || id).join(", ");
    const referenceHeight = Math.max(10, wrappedLineCount(`Supporting lessons: ${references}`, contentWidth - 8) * 3.8 + 5);
    return titleHeight + narrativeHeight + controlsHeight + referenceHeight + 63;
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

    y = writeContentBox("What failed", caution.what_failed, y);
    y = writeContentBox("Why it matters", caution.why_it_matters, y);
    y = writeContentBox("Controls to consider", caution.prevention_controls, y);

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

  if (relevantSources.length) {
    pdf.addPage("a4", "landscape");
    const appendixWidth = pdf.internal.pageSize.getWidth();
    y = 20;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(...exportRgb.brand);
    pdf.text("Relevant Lessons Appendix", MARGIN, y);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(...exportRgb.muted);
    pdf.text(`All ${relevantSources.length} historic lessons retrieved as relevant evidence for this prevention brief, including the strongest records cited in the prioritised cautions.`, MARGIN, y + 5);
    autoTable(pdf, {
      startY: y + 9,
      theme: "grid",
      head: [["LL number", "Title / project", "Historic description and learning", "Controls / recommended action"]],
      body: relevantSources.map((source) => [
        printable(source.lesson_number),
        [printable(source.subject), printable(source.project)].filter(Boolean).join("\n"),
        [printable(source.issue_description), printable(source.lesson_learned)].filter(Boolean).join("\n\n"),
        printable(source.recommended_action) || "No specific historic action recorded - apply the prioritised controls in this brief.",
      ]),
      headStyles: { fillColor: [...exportRgb.brand], textColor: [...exportRgb.white], fontStyle: "bold", font: "helvetica", fontSize: 7.5, valign: "middle" },
      bodyStyles: { textColor: [...exportRgb.ink], lineColor: [...exportRgb.border], font: "helvetica", fontSize: 6.8, cellPadding: 2, overflow: "linebreak", valign: "top" },
      alternateRowStyles: { fillColor: [...exportRgb.page] },
      rowPageBreak: "avoid",
      columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 52 }, 2: { cellWidth: 100 }, 3: { cellWidth: appendixWidth - MARGIN * 2 - 174 } },
      margin: { left: MARGIN, right: MARGIN, bottom: 20 },
    });
  }

  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    const currentPageWidth = pdf.internal.pageSize.getWidth();
    const currentPageHeight = pdf.internal.pageSize.getHeight();
    const footerLineY = currentPageHeight - 13;
    const footerTextY = currentPageHeight - 8;
    pdf.setDrawColor(...exportRgb.border);
    pdf.line(MARGIN, footerLineY, currentPageWidth - MARGIN, footerLineY);
    pdf.setTextColor(...exportRgb.muted);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.text("Enshore IMS - Lessons Learned Prevention Intelligence", MARGIN, footerTextY);
    pdf.text(`Page ${page} of ${pages}`, currentPageWidth - MARGIN, footerTextY, { align: "right" });
  }

  return pdf;
}

export function downloadLessonsPreventionPdf(result: PreventionResult) {
  const pdf = createLessonsPreventionPdf(result);
  const scope = printable(result.scope).slice(0, 48) || "prevention-brief";
  pdf.save(`${safeFileName(`Enshore-Prevention-Brief-${scope}`)}.pdf`);
}

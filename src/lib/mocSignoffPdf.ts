import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export type MocSignoffPdfData = {
  mocReportNo: string;
  mocReportTitle: string;
  projectWorksiteAddress?: string | null;
  mocCoordinatorName?: string | null;
  responsibleManagerName?: string | null;
  changeType: string;
  temporaryValidFrom?: string | null;
  temporaryValidTo?: string | null;
  reasonForChange?: string | null;
  proposedChangeDescription?: string | null;
  implementationPlan?: string | null;
  impactAreas: string[];
  actionItems: Array<{ actionNo?: string; description?: string; responsiblePerson?: string; targetDate?: string; status?: string }>;
  recipientName: string;
  rowLabel: string;
};

function printable(value: unknown) {
  return String(value ?? "").replace(/[‐-―]/g, "-").trim() || "-";
}

/**
 * A purpose-built summary PDF attached to an MOC sign-off email — not a
 * replica of the full, exhaustive controlled export MOC page already
 * generates client-side (which also includes HIRA, risk mitigations, the
 * full review/acceptance/closeout tables, and affected/risk documents).
 * This gives a reviewer enough to make an informed Approve/Reject/Comments
 * decision without a login.
 */
export function createMocSignoffSummaryPdf(data: MocSignoffPdfData): Uint8Array {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 15;

  pdf.setFillColor(0, 86, 112);
  pdf.rect(0, 0, pageWidth, 27, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("ENSHORE IMS - MANAGEMENT OF CHANGE SUMMARY", margin, 12);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Sent to ${printable(data.recipientName)} for: ${printable(data.rowLabel)}`, margin, 19);
  pdf.text(`Generated ${new Date().toLocaleString("en-GB")}`, margin, 24);

  let y = 36;
  pdf.setTextColor(0, 0, 0);

  autoTable(pdf, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "grid",
    styles: { font: "helvetica", fontSize: 9, cellPadding: 2.5, textColor: [0, 0, 0], lineColor: [208, 208, 206] },
    columnStyles: { 0: { cellWidth: 45, fontStyle: "bold", fillColor: [236, 236, 231] }, 1: { cellWidth: pageWidth - margin * 2 - 45 } },
    body: [
      ["MOC Number", printable(data.mocReportNo)],
      ["Title", printable(data.mocReportTitle)],
      ["Project / Worksite", printable(data.projectWorksiteAddress)],
      ["MOC Coordinator", printable(data.mocCoordinatorName)],
      ["Responsible Manager", printable(data.responsibleManagerName)],
      [
        "Change Type",
        data.changeType === "Temporary"
          ? `Temporary (${printable(data.temporaryValidFrom)} to ${printable(data.temporaryValidTo)})`
          : printable(data.changeType),
      ],
    ],
  });
  y = (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;

  const section = (title: string, body: string) => {
    if (y > 260) {
      pdf.addPage();
      y = 18;
    }
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(0, 86, 112);
    pdf.text(title, margin, y + 8);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    pdf.setTextColor(0, 0, 0);
    const lines = pdf.splitTextToSize(printable(body), pageWidth - margin * 2);
    pdf.text(lines, margin, y + 14);
    y += 14 + lines.length * 4.6;
  };

  section("Reason for Change", data.reasonForChange || "");
  section("Proposed Change Description", data.proposedChangeDescription || "");
  section("Implementation Plan", data.implementationPlan || "");
  section("Impact Areas", data.impactAreas.length ? data.impactAreas.join(", ") : "None flagged");

  if (data.actionItems.length) {
    if (y > 240) {
      pdf.addPage();
      y = 18;
    }
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(0, 86, 112);
    pdf.text("Action Plan", margin, y + 8);
    autoTable(pdf, {
      startY: y + 12,
      margin: { left: margin, right: margin },
      theme: "grid",
      styles: { font: "helvetica", fontSize: 8.5, cellPadding: 2.2, textColor: [0, 0, 0], lineColor: [208, 208, 206] },
      headStyles: { fillColor: [0, 86, 112], textColor: [255, 255, 255], fontStyle: "bold" },
      head: [["No.", "Description", "Responsible", "Target Date", "Status"]],
      body: data.actionItems.map((item) => [
        printable(item.actionNo),
        printable(item.description),
        printable(item.responsiblePerson),
        printable(item.targetDate),
        printable(item.status),
      ]),
    });
  }

  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(83, 86, 90);
    pdf.text(`Enshore IMS | MOC ${printable(data.mocReportNo)} | Page ${page} of ${pageCount}`, margin, pdf.internal.pageSize.getHeight() - 8);
  }

  return pdf.output("arraybuffer") as unknown as Uint8Array;
}

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export type ItpSignOffCertificateData = {
  requestId: string;
  projectName: string;
  documentName: string;
  documentPath: string;
  phaseNumber: string;
  phaseTitle: string;
  items: Array<{ taskNumber?: string; activityDescription?: string }>;
  recipientEmail: string;
  senderName?: string | null;
  senderEmail?: string | null;
  decision: string;
  decisionName: string;
  decisionEmail: string;
  decisionNote?: string | null;
  decidedAt: string;
  verifiedAt: string;
};

function printable(value: unknown) {
  return String(value ?? "").replace(/[\u2010-\u2015]/g, "-").trim() || "-";
}

export function createItpSignOffCertificate(data: ItpSignOffCertificateData) {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 15;
  const decisionColour: [number, number, number] = data.decision === "Rejected" ? [249, 56, 34] : [0, 86, 112];

  pdf.setFillColor(0, 86, 112);
  pdf.rect(0, 0, pageWidth, 27, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("ENSHORE IMS - ITP SIGN-OFF CERTIFICATE", margin, 12);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Evidence record ${printable(data.requestId)}`, margin, 19);

  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text(`${printable(data.projectName)} - Phase ${printable(data.phaseNumber)}`, margin, 38);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  const phaseLines = pdf.splitTextToSize(printable(data.phaseTitle), pageWidth - margin * 2);
  pdf.text(phaseLines, margin, 44);

  const detailsY = 50 + Math.max(0, phaseLines.length - 1) * 4;
  autoTable(pdf, {
    startY: detailsY,
    theme: "grid",
    styles: { font: "helvetica", fontSize: 8.5, cellPadding: 2.4, textColor: [0, 0, 0], lineColor: [208, 208, 206] },
    columnStyles: { 0: { fontStyle: "bold", fillColor: [236, 236, 231], cellWidth: 40 }, 1: { cellWidth: 140 } },
    body: [
      ["ITP title", printable(data.documentName)],
      ["Source reference", printable(data.documentPath)],
      ["Issued by", `${printable(data.senderName)} (${printable(data.senderEmail)})`],
      ["Intended recipient", printable(data.recipientEmail)],
      ["Mailbox verified", `${printable(data.decisionEmail)} at ${new Date(data.verifiedAt).toLocaleString("en-GB", { timeZone: "Europe/London" })}`],
    ],
    margin: { left: margin, right: margin },
  });

  const afterDetails = (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || detailsY + 35;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("Items presented for decision", margin, afterDetails + 8);
  autoTable(pdf, {
    startY: afterDetails + 11,
    head: [["Task ID", "Activity description"]],
    body: data.items.map((item) => [printable(item.taskNumber), printable(item.activityDescription)]),
    theme: "grid",
    headStyles: { fillColor: [0, 86, 112], textColor: [255, 255, 255], fontStyle: "bold" },
    styles: { font: "helvetica", fontSize: 8, cellPadding: 2.2, lineColor: [208, 208, 206], overflow: "linebreak" },
    columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 152 } },
    margin: { left: margin, right: margin, bottom: 22 },
  });

  let decisionY = ((pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || afterDetails + 35) + 10;
  if (decisionY > 245) { pdf.addPage(); decisionY = 25; }
  pdf.setDrawColor(...decisionColour);
  pdf.setLineWidth(0.7);
  pdf.roundedRect(margin, decisionY, pageWidth - margin * 2, 37, 3, 3, "S");
  pdf.setTextColor(...decisionColour);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text(printable(data.decision).toUpperCase(), margin + 5, decisionY + 9);
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(9);
  pdf.text(`Decision by: ${printable(data.decisionName)} (${printable(data.decisionEmail)})`, margin + 5, decisionY + 17);
  pdf.text(`Decision date/time: ${new Date(data.decidedAt).toLocaleString("en-GB", { timeZone: "Europe/London" })} Europe/London`, margin + 5, decisionY + 23);
  pdf.setFont("helvetica", "normal");
  const note = pdf.splitTextToSize(`Comments: ${printable(data.decisionNote)}`, pageWidth - margin * 2 - 10);
  pdf.text(note.slice(0, 2), margin + 5, decisionY + 30);

  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(208, 208, 206);
    pdf.line(margin, 284, pageWidth - margin, 284);
    pdf.setTextColor(83, 86, 90);
    pdf.setFontSize(7.5);
    pdf.text("System-generated documented evidence. No drawn signature was requested or captured.", margin, 289);
    pdf.text(`Page ${page} of ${pages}`, pageWidth - margin, 289, { align: "right" });
  }

  return new Uint8Array(pdf.output("arraybuffer"));
}

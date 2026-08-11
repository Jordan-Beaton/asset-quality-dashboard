/**
 * Enshore Brand Guidelines 2026 tokens for generated PDF and Word outputs.
 *
 * PDF generators use jsPDF's built-in Helvetica as the safe portable fallback
 * until a licensed Azo Sans font file is supplied for embedding. Word outputs
 * request Azo Sans and allow the host Office installation to substitute it.
 */
export const exportColours = {
  brand: "005670",
  accent: "63B1BC",
  warning: "FFAD00",
  danger: "F93822",
  page: "ECECE7",
  border: "D0D0CE",
  muted: "53565A",
  ink: "000000",
  white: "FFFFFF",
} as const;

export const exportRgb = {
  brand: [0, 86, 112] as const,
  accent: [99, 177, 188] as const,
  warning: [255, 173, 0] as const,
  danger: [249, 56, 34] as const,
  page: [236, 236, 231] as const,
  border: [208, 208, 206] as const,
  muted: [83, 86, 90] as const,
  ink: [0, 0, 0] as const,
  white: [255, 255, 255] as const,
} as const;

export const exportTypography = {
  pdfFont: "helvetica",
  wordFont: "Azo Sans",
  titlePt: 18,
  headingPt: 13,
  subheadingPt: 11,
  bodyPt: 9,
  tablePt: 8,
  captionPt: 8,
} as const;

export const exportPdfTableTheme = {
  headStyles: {
    fillColor: exportRgb.brand,
    textColor: exportRgb.white,
    fontStyle: "bold" as const,
  },
  bodyStyles: {
    textColor: exportRgb.ink,
    lineColor: exportRgb.border,
  },
  alternateRowStyles: {
    fillColor: exportRgb.page,
  },
} as const;

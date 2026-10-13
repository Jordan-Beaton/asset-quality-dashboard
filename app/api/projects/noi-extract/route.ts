import { NextResponse } from "next/server";
import type { PDFParse } from "pdf-parse";
import { createClient as createServerSupabaseClient } from "../../../../src/lib/supabase/server";
import { downloadStoredItp } from "../../../../src/lib/itpStorage";
import { ensurePdfNodeSupport } from "../../../../src/lib/pdfNodeSupport";
import {
  buildExtractionDiagnostics,
  emptyExtractionMapping,
  isActivityHeading,
  isCoordinateTargetAuthorityHeading,
  isExcludedAuthorityHeading,
  isIdentifierHeading,
  isTargetAuthorityHeading,
  type ExtractionMapping,
} from "../../../../src/lib/noiExtractionRules";

export const runtime = "nodejs";
export const maxDuration = 300;

type Candidate = {
  sectionNumber: string;
  activityDescription: string;
  interventionType: string;
  partyHeading: string;
  confidence: "High" | "Medium" | "Low";
  sourceLocation: string;
};

function clean(value: unknown) {
  return String(value ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim();
}

function validSectionNumber(value: unknown) {
  const section = clean(value);
  return /^(?:[A-Z]{0,4}[-.]?)?\d+(?:\.\d+)*(?:[A-Z])?$/i.test(section) ? section : "";
}

function intervention(value: unknown) {
  const normalised = clean(value).toUpperCase().replace(/\s+/g, "").replace(/[|\\-]+/g, "/");
  if (!/^[A-Z](?:\/[A-Z])*$/.test(normalised)) return null;
  const parts = normalised.split("/");
  if (!parts.includes("W") && !parts.includes("H")) return null;
  return normalised === "H/W" ? "W/H" : normalised;
}

function findColumn(rows: unknown[][], headerRow: number, patterns: Array<{ test(value: string): boolean }>) {
  for (let row = headerRow; row >= Math.max(0, headerRow - 3); row -= 1) {
    for (let column = 0; column < (rows[row]?.length || 0); column += 1) {
      if (patterns.some((pattern) => pattern.test(clean(rows[row][column])))) return column;
    }
  }
  return -1;
}

function targetColumnsForHeader(rows: unknown[][], headerRow: number, supplierName = "", mapping: ExtractionMapping = emptyExtractionMapping()) {
  const row = rows[headerRow] || [];
  const direct = row.map((cell, index) => {
    const heading = clean(cell);
    return isTargetAuthorityHeading(heading, mapping.authorityHeadings) && !isExcludedAuthorityHeading(heading, supplierName) ? { column: index, heading } : null;
  }).filter(Boolean) as Array<{ column: number; heading: string }>;
  const hierarchical: Array<{ column: number; heading: string }> = [];
  row.forEach((cell, column) => {
    if (!/\bintervention\b/i.test(clean(cell))) return;
    for (let parentRow = headerRow - 1; parentRow >= Math.max(0, headerRow - 3); parentRow -= 1) {
      const parentCells = rows[parentRow] || [];
      const candidates = [column, column - 1, column - 2].filter((candidate) => candidate >= 0);
      const parent = candidates.map((candidate) => clean(parentCells[candidate]))
        .find((heading) => isTargetAuthorityHeading(heading, mapping.authorityHeadings) && !isExcludedAuthorityHeading(heading, supplierName));
      if (parent) {
        hierarchical.push({ column, heading: `${parent} — Intervention` });
        break;
      }
    }
  });
  const merged = [...direct, ...hierarchical];
  return merged.filter((target, index) => merged.findIndex((candidate) => candidate.column === target.column) === index);
}

function extractFromRows(rows: unknown[][], source: string, supplierName = "", mapping: ExtractionMapping = emptyExtractionMapping()) {
  const candidates: Candidate[] = [];
  for (let headerRow = 0; headerRow < Math.min(rows.length, 80); headerRow += 1) {
    const row = rows[headerRow] || [];
    const targets = targetColumnsForHeader(rows, headerRow, supplierName, mapping);
    if (!targets.length) continue;
    const sectionColumn = findColumn(rows, headerRow, [{ test: (value: string) => isIdentifierHeading(value, mapping.identifierHeadings) }]);
    const activityColumn = findColumn(rows, headerRow, [{ test: (value: string) => isActivityHeading(value, mapping.activityHeadings) }]);
    const componentColumn = findColumn(rows, headerRow, [/component|assembly|operation|description|work\s*step/i]);
    let carriedSection = "";
    for (let dataRow = headerRow + 1; dataRow < rows.length; dataRow += 1) {
      const data = rows[dataRow] || [];
      const targetValues = targets.map((target) => ({ ...target, type: intervention(data[target.column]) })).filter((item) => item.type);
      if (!targetValues.length) {
        continue;
      }
      const rawSection = sectionColumn >= 0 ? validSectionNumber(data[sectionColumn]) : "";
      if (rawSection) carriedSection = rawSection;
      const sectionNumber = rawSection || carriedSection;
      if (!sectionNumber) continue;
      const activity = activityColumn >= 0 ? clean(data[activityColumn]) : "";
      const component = componentColumn >= 0 ? clean(data[componentColumn]) : "";
      const description = [component, activity].filter((value, index, list) => value && list.indexOf(value) === index).join(" — ")
        || data.map(clean).filter((value) => value && !/^[WH-]$/i.test(value)).slice(1, 4).join(" — ");
      for (const target of targetValues) {
        candidates.push({
          sectionNumber,
          activityDescription: description.slice(0, 300) || `Inspection point ${sectionNumber}`,
          interventionType: target.type!,
          partyHeading: target.heading || clean(row[target.column]) || "Client / Enshore / Contractor / Customer",
          confidence: sectionColumn >= 0 && (activityColumn >= 0 || componentColumn >= 0) ? "High" : "Medium",
          sourceLocation: `${source} · row ${dataRow + 1}`,
        });
      }
    }
  }
  return candidates;
}

function htmlTables(html: string) {
  return [...html.matchAll(/<table[\s\S]*?<\/table>/gi)].map((table) =>
    [...table[0].matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((row) =>
      [...row[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => clean(cell[1])),
    ),
  );
}

async function extractDocxCandidates(buffer: Buffer, supplierName = "", mapping: ExtractionMapping = emptyExtractionMapping()) {
  const mammothModule = await import("mammoth");
  const mammoth = (mammothModule as unknown as { default?: typeof mammothModule }).default || mammothModule;
  const html = (await mammoth.convertToHtml({ buffer })).value;
  const tables = htmlTables(html);
  const candidates = tables.flatMap((rows, index) => extractFromRows(rows, `Table ${index + 1}`, supplierName, mapping));

  const JSZip = (await import("jszip")).default;
  const archive = await JSZip.loadAsync(buffer);
  const headerFiles = Object.keys(archive.files).filter((name) => /^word\/header\d+\.xml$/i.test(name));
  const headerXml = (await Promise.all(headerFiles.map((name) => archive.file(name)?.async("string") || ""))).join("\n");
  const headerText = clean(headerXml);
  const contractorIsEnshore = /\bContr\s*=\s*Contractor\s*\[\s*Enshore\s*\]/i.test(headerText)
    || /\bContractor\s*\[\s*Enshore\s*\]/i.test(headerText);

  if (contractorIsEnshore) {
    for (let index = 0; index < tables.length; index += 1) {
      const rows = tables[index];
      const width = Math.max(0, ...rows.map((row) => row.length));
      const openingRowsContainAuthorityHeader = rows
        .slice(0, 3)
        .some((row) => row.some((cell) => isTargetAuthorityHeading(clean(cell), mapping.authorityHeadings)));
      if (width < 4 || openingRowsContainAuthorityHeader) continue;
      const syntheticHeader = Array.from({ length: width }, () => "");
      syntheticHeader[0] = "Section";
      syntheticHeader[1] = "Process / operation description";
      syntheticHeader[width - 2] = "Contractor [Enshore]";
      candidates.push(...extractFromRows([syntheticHeader, ...rows], `Table ${index + 1} · Word repeating header`, supplierName, mapping));
    }
  }

  return { candidates: deduplicate(candidates), tables };
}

function deduplicate(candidates: Candidate[]) {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const sourcePage = candidate.sourceLocation.match(/\bPage\s+(\d+)/i)?.[1] || "";
    const key = [sourcePage, candidate.sectionNumber, candidate.activityDescription.toLowerCase(), candidate.interventionType].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function meaningfulWords(value: string) {
  return new Set(value.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 3));
}

function sameActivity(left: Candidate, right: Candidate) {
  if (left.interventionType !== right.interventionType) return false;
  if (left.sectionNumber !== right.sectionNumber) return false;
  const leftPage = left.sourceLocation.match(/\bPage\s+(\d+)/i)?.[1];
  const rightPage = right.sourceLocation.match(/\bPage\s+(\d+)/i)?.[1];
  if (leftPage && rightPage && leftPage !== rightPage) return false;
  const leftWords = meaningfulWords(left.activityDescription);
  const rightWords = meaningfulWords(right.activityDescription);
  const common = [...leftWords].filter((word) => rightWords.has(word)).length;
  return common >= 2 && common / Math.max(1, Math.min(leftWords.size, rightWords.size)) >= 0.4;
}

function reconcilePdfCandidates(structured: Candidate[], visual: Candidate[]) {
  const result = [...visual];
  for (const candidate of structured) {
    if (!result.some((existing) => sameActivity(candidate, existing))) result.push(candidate);
  }
  return deduplicate(result);
}

function applyCoordinateAuthority(candidates: Candidate[], coordinateCandidates: Candidate[]) {
  if (!coordinateCandidates.length) return candidates;
  const authoritativePages = new Set(
    coordinateCandidates
      .map((candidate) => candidate.sourceLocation.match(/\bPage\s+(\d+)/i)?.[1])
      .filter((page): page is string => Boolean(page)),
  );
  const candidatesFromOtherPages = candidates.filter((candidate) => {
    const page = candidate.sourceLocation.match(/\bPage\s+(\d+)/i)?.[1];
    return !page || !authoritativePages.has(page);
  });
  return deduplicate([...candidatesFromOtherPages, ...coordinateCandidates]);
}

async function extractPdfCoordinateCandidates(buffer: Buffer, supplierName = "", mapping: ExtractionMapping = emptyExtractionMapping()) {
  ensurePdfNodeSupport();
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const document = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  const candidates: Candidate[] = [];
  let carriedTargetHeaders: Array<{ text: string; x: number; y: number; width: number }> = [];
  let carriedPageSignature = "";
  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const items = content.items.flatMap((raw) => {
        if (!("str" in raw) || !clean(raw.str)) return [];
        // Normalise every page into its displayed orientation. Some supplier ITPs
        // store landscape tables as rotated portrait pages; raw PDF coordinates
        // otherwise make adjacent authority columns look like separate rows.
        const displayTransform = pdfjs.Util.transform(viewport.transform, raw.transform);
        return [{
          text: clean(raw.str),
          x: displayTransform[4],
          y: -displayTransform[5],
          width: raw.width,
        }];
      });
      const detectedTargetHeaders = items.filter((item) =>
        isCoordinateTargetAuthorityHeading(item.text, mapping.authorityHeadings) && !isExcludedAuthorityHeading(item.text, supplierName)
      );
      const pageSignature = `${page.rotate}:${Math.round(viewport.width)}:${Math.round(viewport.height)}`;
      const targetHeaders = detectedTargetHeaders.length
        ? detectedTargetHeaders
        : pageSignature === carriedPageSignature ? carriedTargetHeaders : [];
      if (detectedTargetHeaders.length) {
        carriedTargetHeaders = detectedTargetHeaders;
        carriedPageSignature = pageSignature;
      } else if (pageSignature !== carriedPageSignature) {
        carriedTargetHeaders = [];
        carriedPageSignature = "";
      }
      const sections = items
        .map((item) => ({ ...item, section: validSectionNumber(item.text) }))
        .filter((item) => item.section);
      const componentHeader = items.find((item) =>
        /\bcomponent\s*\/?\s*assembly\b/i.test(item.text)
        || /\binspection\s*\/?\s*test\s*description\b/i.test(item.text)
        || /\bprocess\s*\/?\s*operation\s*description\b/i.test(item.text)
      );
      const phaseHeader = items.find((item) => /\bphase\b.*\bactivity\b/i.test(item.text));

      for (const header of targetHeaders) {
        const headerCentre = header.x + header.width / 2;
        const marks = items.filter((item) => {
          const itemCentre = item.x + item.width / 2;
          return item.y < header.y - 2
            && Math.abs(itemCentre - headerCentre) <= 24
            && Boolean(intervention(item.text));
        });
        for (const mark of marks) {
          const section = sections
            .filter((item) => item.x < header.x - 80)
            .sort((left, right) =>
              Math.abs(left.y - mark.y) - Math.abs(right.y - mark.y)
              || left.x - right.x
            )[0];
          if (!section || Math.abs(section.y - mark.y) > 24) continue;
          const sameTableSections = sections
            .filter((item) => Math.abs(item.x - section.x) < 20)
            .sort((left, right) => right.y - left.y);
          const sectionIndex = sameTableSections.findIndex((item) => item === section);
          const upperY = sectionIndex > 0 ? (sameTableSections[sectionIndex - 1].y + section.y) / 2 : section.y + 35;
          const lowerY = sectionIndex >= 0 && sectionIndex < sameTableSections.length - 1
            ? (section.y + sameTableSections[sectionIndex + 1].y) / 2
            : section.y - 35;
          const descriptionStart = componentHeader ? componentHeader.x - 15 : section.x + 12;
          const descriptionEnd = phaseHeader && phaseHeader.x > descriptionStart
            ? phaseHeader.x - 5
            : header.x - 80;
          const description = items
            .filter((item) =>
              item.x >= descriptionStart
              && item.x < descriptionEnd
              && item.y <= upperY
              && item.y >= lowerY
              && item !== section
            )
            .sort((left, right) => right.y - left.y || left.x - right.x)
            .map((item) => item.text)
            .join(" ")
            .slice(0, 300);
          const type = intervention(mark.text);
          if (!type || description.length < 4) continue;
          candidates.push({
            sectionNumber: section.section,
            activityDescription: description,
            interventionType: type,
            partyHeading: header.text,
            confidence: "High",
            sourceLocation: `PDF column geometry · Page ${pageNumber}`,
          });
        }
      }
    }
  } finally {
    await document.cleanup();
  }
  return deduplicate(candidates);
}

async function extractPdfVisualChunk(
  buffer: Buffer,
  fileName: string,
  supplierName: string,
  firstOriginalPage: number,
  lastOriginalPage: number,
  extractedText: string,
  mapping: ExtractionMapping,
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OCR is not configured on this environment.");
  // This is the few-page excerpt sent to the AI service (which accepts roughly 32 MB
  // per file), not the whole ITP, so ordinary large ITPs are unaffected.
  if (buffer.length > 30 * 1024 * 1024) throw new Error(`Pages ${firstOriginalPage}-${lastOriginalPage} are too image-heavy to send to the visual check in one batch (over 30 MB).`);
  const supplierInstruction = supplierName
    ? `The ITP supplier is "${supplierName}". Any column headed with that supplier's name is supplier-side and MUST be ignored.`
    : "Any column headed with the supplier's name is supplier-side and MUST be ignored.";
  const configuredAuthorities = mapping.authorityHeadings.length ? ` Additional confirmed client-side authority headings are: ${mapping.authorityHeadings.join(", ")}.` : "";
  const configuredIdentifiers = mapping.identifierHeadings.length ? ` Confirmed task/item identifier headings include: ${mapping.identifierHeadings.join(", ")}.` : "";
  const prompt = `Perform a page-by-page completeness audit of this excerpt from an Inspection and Test Plan (ITP). This excerpt contains original document pages ${firstOriginalPage}-${lastOriginalPage}. Visually inspect every supplied page image and every table even when the PDF also contains searchable text. Return pageNumber using the ORIGINAL document page number in that ${firstOriginalPage}-${lastOriginalPage} range.

Find ONLY rows where the customer's involvement code contains W (Witness) or H (Hold), either alone or as part of a slash-separated code. Examples to capture include W, H, W/H, R/W, M/W, W/R, and H/R. Relevant layouts include:
- a column headed Client, Enshore, Contractor, Employer, Employer Surveillance, Customer, Purchaser, Buyer, or Owner;
- an "Inspection Authority" group with a standalone "Contr" sub-column, where Contr means Contractor;
- a grouped parent heading such as "Customer Evaluation" with W/H values beneath its "Intervention" sub-column.

Treat those customer-side labels as the same relevant party.${configuredAuthorities}${configuredIdentifiers} ${supplierInstruction}

Authority ownership is decisive. When an Inspection Authority group contains columns such as the supplier name, Nominated Supplier, and Enshore Subsea, read ONLY the Enshore Subsea column. Never copy a W or H horizontally from another authority column into the client column. In other Inspection Authority tables, read only the client/contractor column and ignore Sub and TPI.

Preserve the exact printed composite code as one point; never split R/W, M/W, W/H, or similar codes into separate rows. Do not read values from a neighbouring "Approval" sub-column. Ignore standalone codes that contain neither W nor H, including R or M, and ignore all marks under supplier, nominated supplier, HSG, Class, third party, vendor, or subcontractor columns.

The coloured key or legend (for example "R=DOCUMENT REVIEW", "M=MONITOR", "W=WITNESS", "H=HOLD POINT") is never an inspection point. Exclude legends, inspection-level labels, headers, signature blocks, and any item without both a genuine printed step/item/section number and a meaningful process/activity description.

For every applicable row return:
- sectionNumber: the inspection point, item, or section number exactly as printed, such as 1.4
- activityDescription: a concise description using the component/assembly and inspection activity
- interventionType: the exact printed code containing W or H, such as W, H, W/H, R/W, or M/W
- partyHeading: the exact relevant column heading
- pageNumber: the one-based PDF page number
- confidence: High, Medium, or Low

Before answering, check every page a second time and ensure no qualifying row has been skipped when a table continues across a page break or repeats its headings differently. Do not infer missing W/H marks. Do not include headings or blank rows. Return JSON only in this exact shape:
{"points":[{"sectionNumber":"1.4","activityDescription":"Final inspection of compartments and systems","interventionType":"W","partyHeading":"Client","pageNumber":1,"confidence":"High"}]}

The following mechanically extracted text is a SECONDARY completeness cross-check. Its reading order may be scrambled, so use the page image to determine row ownership. If it shows a Client/Enshore W or H that is not in your visual result, re-check that page and add the missing row:
--- EXTRACTED TEXT START ---
${extractedText.slice(0, 30000)}
--- EXTRACTED TEXT END ---`;
  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-5-mini",
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: prompt },
          { type: "input_file", filename: fileName, file_data: `data:application/pdf;base64,${buffer.toString("base64")}` },
        ],
      }],
      max_output_tokens: 5000,
    }),
    signal: AbortSignal.timeout(150_000),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new Error("The visual check took too long and was stopped.");
    }
    throw error;
  }
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message || "OCR processing failed.");
  const outputText = payload.output_text
    || payload.output?.flatMap((item: { content?: Array<{ type?: string; text?: string }> }) => item.content || []).find((item: { type?: string }) => item.type === "output_text")?.text
    || "";
  const jsonText = String(outputText).replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const parsed = JSON.parse(jsonText) as { points?: Array<Record<string, unknown>> };
  return (parsed.points || []).flatMap((point): Candidate[] => {
    const type = intervention(point.interventionType);
    const party = clean(point.partyHeading);
    const sectionNumber = validSectionNumber(point.sectionNumber);
    const description = clean(point.activityDescription).slice(0, 300);
    if (!type || !isTargetAuthorityHeading(party, mapping.authorityHeadings) || isExcludedAuthorityHeading(party, supplierName) || !sectionNumber || description.length < 4) return [];
    const confidence = clean(point.confidence);
    const page = Number(point.pageNumber);
    return [{
      sectionNumber,
      activityDescription: description,
      interventionType: type,
      partyHeading: party,
      confidence: confidence === "High" || confidence === "Medium" ? confidence : "Low",
      sourceLocation: `Visual/OCR audit · Page ${Number.isFinite(page) && page > 0 ? page : "unknown"}`,
    }];
  });
}

async function extractPdfVisualPages(
  buffer: Buffer,
  fileName: string,
  supplierName: string,
  firstPage: number,
  lastPage: number,
  pageTexts: Array<{ num: number; text: string }>,
  mapping: ExtractionMapping,
) {
  const { PDFDocument } = await import("pdf-lib");
  const source = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const pageCount = source.getPageCount();
  const start = Math.max(0, firstPage - 1);
  const end = Math.min(pageCount, lastPage);
  if (start >= end) return [];

  const excerpt = await PDFDocument.create();
  const pages = await excerpt.copyPages(source, Array.from({ length: end - start }, (_, index) => start + index));
  pages.forEach((page) => excerpt.addPage(page));
  const bytes = await excerpt.save({ useObjectStreams: false });
  const extractedText = pageTexts
    .filter((page) => page.num >= start + 1 && page.num <= end)
    .map((page) => `[Original page ${page.num}]\n${page.text}`)
    .join("\n\n");

  return extractPdfVisualChunk(
    Buffer.from(bytes),
    `${fileName.replace(/\.pdf$/i, "")}-pages-${start + 1}-${end}.pdf`,
    supplierName,
    start + 1,
    end,
    extractedText,
    mapping,
  );
}

function parseCandidateList(value: FormDataEntryValue | null): Candidate[] {
  try {
    const parsed = JSON.parse(typeof value === "string" ? value : "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item): Candidate[] => {
      const row = item as Record<string, unknown>;
      const type = intervention(row.interventionType);
      const sectionNumber = validSectionNumber(row.sectionNumber);
      const description = clean(row.activityDescription).slice(0, 300);
      if (!type || !sectionNumber || description.length < 4) return [];
      const confidence = clean(row.confidence);
      return [{
        sectionNumber,
        activityDescription: description,
        interventionType: type,
        partyHeading: clean(row.partyHeading),
        confidence: confidence === "High" || confidence === "Medium" ? confidence : "Low",
        sourceLocation: clean(row.sourceLocation),
      }];
    });
  } catch {
    return [];
  }
}

function parseStringList(value: FormDataEntryValue | null) {
  try {
    const parsed = JSON.parse(typeof value === "string" ? value : "[]") as unknown;
    return Array.isArray(parsed) ? parsed.map(clean).filter(Boolean).slice(0, 50) : [];
  } catch {
    return [];
  }
}

function composeScanResult(args: {
  structured: Candidate[];
  coordinate: Candidate[];
  visual: Candidate[] | null;
  visualWarnings: string[];
  isPdf: boolean;
  explanation: string[];
}) {
  let candidates = args.structured;
  let extractionMode: "Structured" | "Visual" | "Hybrid" = "Structured";
  let ocrWarning: string | null = null;
  if (args.isPdf && args.visual) {
    candidates = reconcilePdfCandidates(candidates, args.visual);
    extractionMode = args.visual.length && candidates.length > args.visual.length ? "Hybrid" : "Visual";
    if (args.visualWarnings.length) ocrWarning = `Visual audit incomplete: ${args.visualWarnings.join(" | ")}`;
  } else if (args.isPdf) {
    ocrWarning = "Visual/OCR completeness audit was not authorised for this scan.";
  }
  if (args.isPdf && args.coordinate.length) {
    candidates = applyCoordinateAuthority(candidates, args.coordinate);
  }
  const unique = deduplicate(candidates);
  return {
    candidates: unique,
    extractionMode,
    summary: {
      points: unique.length,
      witness: unique.filter((point) => point.interventionType.split("/").includes("W")).length,
      hold: unique.filter((point) => point.interventionType.split("/").includes("H")).length,
      combined: unique.filter((point) => {
        const parts = point.interventionType.split("/");
        return parts.includes("W") && parts.includes("H");
      }).length,
    },
    warning: unique.length
      ? extractionMode === "Visual" || extractionMode === "Hybrid"
        ? ocrWarning || "Every PDF page was visually audited and reconciled with structured extraction. Confirm every extracted point before saving."
        : ocrWarning ? `Structured results were found, but the visual completeness audit could not run: ${ocrWarning}` : null
      : ocrWarning || `No qualifying W/H points were identified. ${args.explanation.join(" ")}`,
  };
}

// The scan runs as short, separate requests so no single request can outlive the
// host's time limit (which returns an HTML error page instead of JSON):
//   phase "structured"   - local table/text extraction, returns the page count
//   phase "visual-chunk" - visual check of a few pages (one AI call)
//   phase "merge"        - reconciles structured and visual results (no file, no AI)
export async function POST(request: Request) {
  let parser: PDFParse | null = null;
  try {
    const form = await request.formData();
    const phase = clean(form.get("phase")) || "structured";

    if (phase === "merge") {
      const result = composeScanResult({
        structured: parseCandidateList(form.get("structuredCandidates")),
        coordinate: parseCandidateList(form.get("coordinateCandidates")),
        visual: parseCandidateList(form.get("visualCandidates")),
        visualWarnings: parseStringList(form.get("visualWarnings")),
        isPdf: true,
        explanation: parseStringList(form.get("explanation")),
      });
      return NextResponse.json(result);
    }

    const supplierName = clean(form.get("supplierName"));
    let mapping = emptyExtractionMapping();
    try {
      const supplied = JSON.parse(clean(form.get("extractionMapping")) || "{}") as Partial<ExtractionMapping>;
      mapping = {
        authorityHeadings: Array.isArray(supplied.authorityHeadings) ? supplied.authorityHeadings.map(clean).filter(Boolean).slice(0, 20) : [],
        identifierHeadings: Array.isArray(supplied.identifierHeadings) ? supplied.identifierHeadings.map(clean).filter(Boolean).slice(0, 20) : [],
        activityHeadings: Array.isArray(supplied.activityHeadings) ? supplied.activityHeadings.map(clean).filter(Boolean).slice(0, 20) : [],
      };
    } catch {
      return NextResponse.json({ error: "The saved extraction mapping is invalid." }, { status: 400 });
    }
    // A stored ITP is read by the server from its file reference, so the browser never
    // uploads it again and no request-size limit applies. A direct upload is still
    // accepted for files that are not stored yet.
    let buffer: Buffer;
    let fileName: string;
    const filePath = clean(form.get("filePath"));
    if (filePath) {
      const userClient = await createServerSupabaseClient();
      const { data: authData } = await userClient.auth.getUser();
      if (!authData.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
      const stored = await downloadStoredItp(userClient, filePath);
      if (!stored.ok) return NextResponse.json({ error: stored.error }, { status: stored.status });
      buffer = stored.buffer;
      fileName = stored.fileName;
    } else {
      const file = form.get("file");
      if (!(file instanceof File)) return NextResponse.json({ error: "No ITP supplied." }, { status: 400 });
      buffer = Buffer.from(await file.arrayBuffer());
      fileName = file.name;
    }
    // Memory safeguard only: far above any real ITP, but a runaway file would otherwise
    // crash the function with an unreadable error.
    if (buffer.length > 400 * 1024 * 1024) return NextResponse.json({ error: "This file is too large for the scanner to hold in memory (over 400 MB). Split it and retry." }, { status: 413 });
    const extension = fileName.split(".").pop()?.toLowerCase();

    if (phase === "visual-chunk") {
      if (extension !== "pdf") return NextResponse.json({ error: "Visual audit applies to PDF files only." }, { status: 415 });
      const firstPage = Math.floor(Number(form.get("firstPage")));
      const lastPage = Math.floor(Number(form.get("lastPage")));
      if (!Number.isFinite(firstPage) || !Number.isFinite(lastPage) || firstPage < 1 || lastPage < firstPage || lastPage - firstPage > 5) {
        return NextResponse.json({ error: "A valid page range is required." }, { status: 400 });
      }
      const pages = Array.from({ length: lastPage - firstPage + 1 }, (_, index) => firstPage + index);
      ensurePdfNodeSupport();
      const { PDFParse: PdfParser } = await import("pdf-parse");
      parser = new PdfParser({ data: new Uint8Array(buffer) });
      const text = await parser.getText({ partial: pages });
      const pageTexts = text.pages.map((page) => ({ num: page.num, text: page.text }));
      const candidates = await extractPdfVisualPages(buffer, fileName, supplierName, firstPage, lastPage, pageTexts, mapping);
      return NextResponse.json({ candidates });
    }

    let candidates: Candidate[] = [];
    const diagnosticTables: unknown[][][] = [];
    let pdfCoordinateCandidates: Candidate[] = [];
    let pageCount = 0;
    if (["xlsx", "xls", "xlsm"].includes(extension || "")) {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
      candidates = workbook.SheetNames.flatMap((name) => {
        const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], { header: 1, raw: false, defval: "" });
        diagnosticTables.push(rows);
        return extractFromRows(rows, `Sheet ${name}`, supplierName, mapping);
      });
    } else if (extension === "docx") {
      const word = await extractDocxCandidates(buffer, supplierName, mapping);
      candidates = word.candidates;
      diagnosticTables.push(...word.tables);
    } else if (extension === "pdf") {
      ensurePdfNodeSupport();
      const { PDFParse: PdfParser } = await import("pdf-parse");
      parser = new PdfParser({ data: new Uint8Array(buffer) });
      const tables = await parser.getTable({ first: 30 });
      for (const page of tables.pages) {
        for (let index = 0; index < page.tables.length; index += 1) {
          const rows = page.tables[index] as unknown[][];
          diagnosticTables.push(rows);
          candidates.push(...extractFromRows(rows, `Page ${page.num}, table ${index + 1}`, supplierName, mapping));
        }
      }
      pdfCoordinateCandidates = await extractPdfCoordinateCandidates(buffer, supplierName, mapping);
      candidates = applyCoordinateAuthority(candidates, pdfCoordinateCandidates);
      const { PDFDocument } = await import("pdf-lib");
      pageCount = (await PDFDocument.load(buffer, { ignoreEncryption: true })).getPageCount();
    } else {
      return NextResponse.json({ error: "Use an Excel, Word, or searchable PDF ITP." }, { status: 415 });
    }

    const diagnostics = buildExtractionDiagnostics(diagnosticTables, supplierName, mapping);
    const result = composeScanResult({
      structured: candidates,
      coordinate: pdfCoordinateCandidates,
      visual: null,
      visualWarnings: [],
      isPdf: extension === "pdf",
      explanation: diagnostics.explanation,
    });
    return NextResponse.json({ ...result, diagnostics, pageCount, coordinateCandidates: pdfCoordinateCandidates });
  } catch (error) {
    // Library loading and parsing failures are reported as readable JSON (with the
    // first lines of the stack) so a production-only problem names its own cause.
    const detail = error instanceof Error ? (error.stack || "").split("\n").slice(0, 4).join(" | ").slice(0, 600) : "";
    return NextResponse.json({ error: error instanceof Error ? error.message : "The ITP could not be scanned.", detail }, { status: 422 });
  } finally {
    if (parser) await parser.destroy().catch(() => undefined);
  }
}

export type ExtractionMapping = {
  authorityHeadings: string[];
  identifierHeadings: string[];
  activityHeadings: string[];
};

export type ExtractionDiagnostics = {
  templateFingerprint: string;
  detectedHeadings: string[];
  targetAuthorityHeadings: string[];
  excludedAuthorityHeadings: string[];
  unresolvedAuthorityHeadings: string[];
  identifierHeadings: string[];
  activityHeadings: string[];
  explanation: string[];
};

export const emptyExtractionMapping = (): ExtractionMapping => ({ authorityHeadings: [], identifierHeadings: [], activityHeadings: [] });

export function normaliseHeading(value: unknown) {
  return String(value ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim();
}

function canonical(value: unknown) {
  return normaliseHeading(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function exactAlias(value: unknown, aliases: string[]) {
  const key = canonical(value);
  return Boolean(key) && aliases.some((alias) => canonical(alias) === key);
}

export function isTargetAuthorityHeading(value: unknown, aliases: string[] = []) {
  const heading = normaliseHeading(value);
  return exactAlias(heading, aliases)
    || /^(?:contr|contr\.?)$/i.test(heading)
    || /^(?:client|enshore(?:\s+subsea(?:\s+limited)?)?|contractor|employer|purchaser|buyer|owner)(?:\s+(?:surveillance|inspection|involvement|evaluation|authority))?$/i.test(heading)
    || /^customer(?:\s+(?:evaluation|inspection|involvement|surveillance|authority))?$/i.test(heading)
    || /^contractor\s*\[\s*enshore\s*\]$/i.test(heading);
}

export function isCoordinateTargetAuthorityHeading(value: unknown, aliases: string[] = []) {
  const heading = normaliseHeading(value);
  return exactAlias(heading, aliases)
    || /^(?:client|enshore(?:\s+subsea(?:\s+limited)?)?|contractor|employer(?:\s+surveillance)?|customer(?:\s+(?:evaluation|inspection|involvement))?|purchaser|buyer|owner|contr\.?)\s*:?\s*$/i.test(heading);
}

export function isExcludedAuthorityHeading(value: unknown, supplierName = "") {
  const heading = normaliseHeading(value);
  const supplier = normaliseHeading(supplierName);
  return /\b(nominated\s+supplier|supplier|vendor|subcontractor|third\s*party|tpi|class|hsg|mws)\b/i.test(heading)
    || Boolean(supplier && heading.toLowerCase().includes(supplier.toLowerCase()));
}

export function isIdentifierHeading(value: unknown, aliases: string[] = []) {
  const heading = normaliseHeading(value);
  return exactAlias(heading, aliases)
    || /^(?:task|step|item|point|section)(?:\s*(?:no\.?|number|#))?$/i.test(heading)
    || /^#$/i.test(heading)
    || /insp(?:ection)?\s*(?:point)?\s*(?:no\.?|number|#)?/i.test(heading);
}

export function isActivityHeading(value: unknown, aliases: string[] = []) {
  const heading = normaliseHeading(value);
  return exactAlias(heading, aliases)
    || /^(?:activity|activity\s+description|description|process\s*\/\s*operation\s+description|work\s*step)$/i.test(heading)
    || /inspection\s*activity|phase.*activity|component|assembly|operation/i.test(heading);
}

function looksLikeAuthority(value: string) {
  return /\b(surveillance|authority|involvement|evaluation|intervention|client|customer|employer|contractor|enshore|purchaser|buyer|owner|supplier|vendor|subcontractor|tpi|class|hsg|mws)\b/i.test(value);
}

function looksLikeHeader(value: string) {
  return looksLikeAuthority(value) || isIdentifierHeading(value) || isActivityHeading(value)
    || /\b(responsible|document|standard|acceptance|criteria|approval|frequency|record)\b/i.test(value);
}

function fingerprint(values: string[]) {
  let hash = 2166136261;
  for (const character of values.join("|").toLowerCase()) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `itp-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function buildExtractionDiagnostics(tables: unknown[][][], supplierName = "", mapping: ExtractionMapping = emptyExtractionMapping()): ExtractionDiagnostics {
  const headings = [...new Set(tables.flatMap((rows) => rows.slice(0, 80).flatMap((row) => {
    const cells = row.map(normaliseHeading).filter((cell) => cell && cell.length <= 100 && looksLikeHeader(cell));
    return cells.length >= 2 ? cells : [];
  })))]
    .sort((left, right) => left.localeCompare(right));
  const authority = headings.filter(looksLikeAuthority);
  const targets = authority.filter((heading) => isTargetAuthorityHeading(heading, mapping.authorityHeadings) && !isExcludedAuthorityHeading(heading, supplierName));
  const excluded = authority.filter((heading) => isExcludedAuthorityHeading(heading, supplierName));
  const unresolved = authority.filter((heading) => !targets.includes(heading) && !excluded.includes(heading) && !/\bintervention\b/i.test(heading));
  const identifiers = headings.filter((heading) => isIdentifierHeading(heading, mapping.identifierHeadings));
  const activities = headings.filter((heading) => isActivityHeading(heading, mapping.activityHeadings));
  const explanation = [
    targets.length ? `NOI authority: ${targets.join(", ")}` : "No recognised NOI authority column.",
    identifiers.length ? `Row identifier: ${identifiers.join(", ")}` : "No recognised task, item or section column.",
    activities.length ? `Activity description: ${activities.join(", ")}` : "No recognised activity-description column.",
    excluded.length ? `Ignored supplier/third-party authority: ${excluded.join(", ")}` : "No supplier or third-party authority columns identified.",
  ];
  return { templateFingerprint: fingerprint(headings), detectedHeadings: headings, targetAuthorityHeadings: targets, excludedAuthorityHeadings: excluded, unresolvedAuthorityHeadings: unresolved, identifierHeadings: identifiers, activityHeadings: activities, explanation };
}

export function detectTableRoles(rows: unknown[][], supplierName = "", mapping: ExtractionMapping = emptyExtractionMapping()) {
  for (let rowIndex = 0; rowIndex < Math.min(rows.length, 80); rowIndex += 1) {
    const row = rows[rowIndex] || [];
    const authorityColumns = row.flatMap((cell, column) => isTargetAuthorityHeading(cell, mapping.authorityHeadings) && !isExcludedAuthorityHeading(cell, supplierName) ? [{ column, heading: normaliseHeading(cell) }] : []);
    if (!authorityColumns.length) continue;
    const searchRows = rows.slice(Math.max(0, rowIndex - 3), rowIndex + 1);
    const find = (predicate: (value: unknown) => boolean) => {
      for (let relative = searchRows.length - 1; relative >= 0; relative -= 1) {
        const column = searchRows[relative].findIndex(predicate);
        if (column >= 0) return { column, heading: normaliseHeading(searchRows[relative][column]) };
      }
      return null;
    };
    return {
      headerRow: rowIndex,
      authorityColumns,
      identifierColumn: find((value) => isIdentifierHeading(value, mapping.identifierHeadings)),
      activityColumn: find((value) => isActivityHeading(value, mapping.activityHeadings)),
    };
  }
  return null;
}

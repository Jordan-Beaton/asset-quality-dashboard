// Column grid for the NOI Tracker scanner.
//
// Instead of guessing which column belongs to Enshore, the scanner reads EVERY inspection
// column of an ITP (heading, and the code in each row), the person chooses Enshore's
// column, and the W/H points are then taken from that column only.
//
// Everything here is pure (no Node or browser APIs) so the server builds the grid and the
// browser derives the points from the chosen column with the same rules.

export type PositionedItem = { text: string; x: number; y: number; width: number };

// A horizontal table line (a cell border) with its vertical position and horizontal extent.
export type RuleLine = { y: number; x0: number; x1: number };

export type PageInput = {
  pageNumber: number;
  width: number;
  height: number;
  items: PositionedItem[];
  scanned: boolean;
  // Horizontal table lines drawn on the page, when they could be read.
  rules?: RuleLine[];
};

export type GridColumn = {
  id: string;
  label: string;
  pages: number[];
  supplierLike: boolean;
  suggested: boolean;
  marks: number;
  counts: { W: number; H: number; WH: number; other: number };
};

export type GridRow = {
  page: number;
  section: string;
  description: string;
  cells: Record<string, string>;
  via: "position" | "visual";
};

export type GridResult = {
  columns: GridColumn[];
  rows: GridRow[];
  fingerprint: string;
  pageCount: number;
  scannedPages: number[];
  // What GridRow.page counts: "Page" (PDF, the default), or "Table" / "Sheet" for Word and Excel.
  unit?: string;
  // Names of the tables or sheets (index = page number - 1), used in each point's source.
  locationLabels?: string[];
};

export type GridCandidate = {
  sectionNumber: string;
  activityDescription: string;
  interventionType: string;
  partyHeading: string;
  confidence: "High" | "Medium" | "Low";
  sourceLocation: string;
};

const SECTION = /^(?:[A-Z]{0,4}[-.]?)?\d+(?:\.\d+)*(?:[A-Z])?$/i;
const CODE = /^[A-Z](?:\s*[,/]\s*[A-Z])*$/i;
const GROUP_WORDS = /^(?:inspection|inspection\s+involvement\s+level|involvement\s+level|involvement|level|authority|inspection\s+authority|inspection\s+level|surveillance)$/i;
const AUTHORITY_WORDS = /^(?:client|customer|owner|contractor|employer|purchaser|buyer|enshore|ens|supplier|vendor|subcontractor|3rd\s*party|third\s*party|tpi|class|bv)$/i;
const SUPPLIER_WORDS = /\b(?:supplier|vendor|subcontractor|nominated|third\s*party|3rd\s*party|tpi|class|hsg|mws|bv)\b/i;
const ENSHORE_WORDS = /\b(?:ens|enshore(?:\s+subsea(?:\s+limited)?)?)\b|contractor\s*\[\s*enshore\s*\]/i;
const GENERIC_CLIENT_WORDS = /^(?:client|customer|contractor|employer|owner|purchaser|buyer)(?:\s|$)/i;

export function cleanText(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function sectionOf(text: string) {
  // Some ITPs (and OCR of scanned ones) write 5,10. for section 5.10
  const section = cleanText(text).replace(/^(\d+),(\d+)/, "$1.$2").replace(/\.$/, "");
  return section.length <= 10 && SECTION.test(section) ? section : "";
}

export function isCodeText(text: string) {
  const trimmed = text.trim();
  return trimmed.length > 0 && trimmed.length <= 9 && CODE.test(trimmed);
}

// "A, W" -> "A/W", "h/w" -> "H/W"
export function normaliseCode(text: string) {
  return text.toUpperCase().replace(/\s+/g, "").split(/[,/|\\-]+/).filter(Boolean).join("/");
}

// The intervention type a cell represents, or null when it holds no W or H.
// A cell that is both a Witness and a Hold point is always reported as "W/H".
export function cellType(text: string): string | null {
  const code = normaliseCode(text);
  if (!/^[A-Z](?:\/[A-Z])*$/.test(code)) return null;
  const parts = code.split("/");
  const hasW = parts.includes("W");
  const hasH = parts.includes("H");
  if (!hasW && !hasH) return null;
  if (hasW && hasH && parts.length === 2) return "W/H";
  return code;
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function normaliseLabel(label: string) {
  return cleanText(label).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function labelTokens(label: string) {
  return new Set(normaliseLabel(label).split(" ").filter(Boolean));
}

// "Client Enshore" and "Enshore" describe the same column.
export function sameColumnLabel(left: string, right: string) {
  const a = labelTokens(left);
  const b = labelTokens(right);
  if (!a.size || !b.size) return false;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  return [...small].every((token) => large.has(token));
}

function isGenericLabel(label: string) {
  return /^column \d+$/i.test(label);
}

type Cluster = { centre: number; items: Array<{ text: string; top: number; x: number; width: number }> };

export type PageGrid = {
  pageNumber: number;
  pageSignature: string;
  columns: Array<{ key: string; label: string; centre: number }>;
  rows: Array<{ section: string; description: string; cells: Record<string, string> }>;
};

// Builds one page's grid from positioned text (page text plus annotation text).
// Returns null when the page has no table of numbered rows with code columns.
export function buildPageGrid(page: PageInput): PageGrid | null {
  if (page.scanned) return null;
  const items = page.items
    .map((item) => ({ text: cleanText(item.text), x: item.x, width: item.width, top: -item.y }))
    .filter((item) => item.text);

  const numbered = items.filter((item) => sectionOf(item.text));
  if (numbered.length < 2) return null;

  // Row numbers form one vertical line: take the most common left position.
  const buckets = new Map<number, number>();
  numbered.forEach((item) => buckets.set(Math.round(item.x / 12), (buckets.get(Math.round(item.x / 12)) || 0) + 1));
  const modalBucket = [...buckets.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const modalX = median(numbered.filter((item) => Math.round(item.x / 12) === modalBucket).map((item) => item.x));
  const anchors = numbered
    .filter((item) => Math.abs(item.x - modalX) <= 24)
    .sort((a, b) => a.top - b.top);
  if (anchors.length < 2) return null;
  const firstTop = anchors[0].top;
  const lastTop = anchors[anchors.length - 1].top;

  const codeItems = items.filter((item) =>
    isCodeText(item.text)
    && !sectionOf(item.text)
    && item.x > modalX + 120
    && item.top >= firstTop - 20
    && item.top <= lastTop + 40
  );
  // sectionOf() also accepts single letters? No - sections need digits. Plain digits are not codes.
  if (!codeItems.length) return null;

  const sortedCodes = [...codeItems].sort((a, b) => (a.x + a.width / 2) - (b.x + b.width / 2));
  const clusters: Cluster[] = [];
  for (const item of sortedCodes) {
    const centre = item.x + item.width / 2;
    const last = clusters[clusters.length - 1];
    if (last && Math.abs(centre - last.centre) <= 12) {
      last.items.push(item);
      last.centre = median(last.items.map((entry) => entry.x + entry.width / 2));
    } else {
      clusters.push({ centre, items: [item] });
    }
  }
  const minItems = anchors.length <= 3 ? 1 : 2;
  const columnsFound = clusters.filter((cluster) => cluster.items.length >= minItems);
  if (!columnsFound.length) return null;

  // Header band: just above the first row, below any title block.
  const headerLabel = items
    .filter((item) => /^(?:item|no\.?|#|task|step|point)$/i.test(item.text) && item.top < firstTop)
    .sort((a, b) => a.top - b.top)[0];
  const bandTop = headerLabel ? headerLabel.top - 14 : firstTop - 90;
  const band = items.filter((item) => item.top >= bandTop && item.top < firstTop - 2 && item.x > modalX + 60);

  const spacing = (index: number) => {
    const neighbours = columnsFound
      .map((cluster, other) => (other === index ? Infinity : Math.abs(cluster.centre - columnsFound[index].centre)))
      .filter(Number.isFinite);
    return neighbours.length ? Math.min(...neighbours) : 60;
  };
  const labelFor = (centre: number, reach: number) => {
    const words = band
      .filter((item) =>
        !/^\d+$/.test(item.text)
        && !GROUP_WORDS.test(item.text)
        // legends ("H = Hold Point ...") and addresses are not column names
        && !item.text.includes("=")
        && item.text.length <= 24
        && item.width <= reach * 3
        && Math.abs(item.x + item.width / 2 - centre) <= reach
      )
      .sort((a, b) => a.top - b.top || a.x - b.x)
      .map((item) => item.text);
    return cleanText([...new Set(words)].join(" ")).slice(0, 60);
  };

  const columns: PageGrid["columns"] = columnsFound.map((cluster, index) => ({
    key: `c${index}`,
    centre: cluster.centre,
    label: labelFor(cluster.centre, Math.max(16, Math.min(spacing(index) * 0.7, 40))) || `Column ${index + 1}`,
  }));

  // Headed columns with no marks on this page (for example a blank "3rd party" column).
  band.filter((item) => AUTHORITY_WORDS.test(item.text)).forEach((item) => {
    const centre = item.x + item.width / 2;
    if (columns.some((column) => Math.abs(column.centre - centre) <= 16)) return;
    columns.push({ key: `e${columns.length}`, centre, label: labelFor(centre, 18) || item.text });
  });
  columns.sort((a, b) => a.centre - b.centre);

  const leftBound = Math.min(...columns.map((column) => column.centre)) - 18;
  // Where the activity description sits: from the activity heading to the next heading.
  const descriptionRange = (headerItems: typeof band) => {
    const heading = headerItems
      .filter((item) => /activity|description|component|assembly|operation|process/i.test(item.text) && item.x < leftBound)
      .sort((a, b) => a.x - b.x)[0];
    if (!heading) return null;
    const starts = headerItems.filter((item) => item.x < leftBound).map((item) => item.x).sort((a, b) => a - b);
    const centre = heading.x + heading.width / 2;
    const next = starts.find((start) => start > heading.x + heading.width + 4);
    return { from: Math.max(modalX + 8, heading.x - 40), to: next ? Math.max(centre + 20, next - 6) : centre + 90 };
  };
  const fraction = { from: modalX + 8, to: modalX + (leftBound - modalX) * 0.28 };
  const defaultRange = fraction;
  // The activity heading often sits close to the row-number column, outside the band used for
  // the code-column headings, so a wider band is tried when that one has no activity heading.
  const wideBand = items.filter((item) => item.top >= bandTop && item.top < firstTop - 2 && item.x > modalX + 12);

  // Lowest line of the column headings: only the lines level with the "No." / "Item" label
  // count, so a first row whose text starts above its number is not mistaken for a heading.
  const headerBottom = headerLabel
    ? Math.max(-Infinity, ...wideBand.filter((item) => item.top <= headerLabel.top + 25).map((item) => item.top))
    : -Infinity;

  const joinItems = (list: Array<{ text: string; x: number; width: number; top: number }>) =>
    cleanText(
      [...list]
        .sort((a, b) => a.top - b.top || a.x - b.x)
        .reduce((text, item, position, all) => {
          if (!position) return item.text;
          const previous = all[position - 1];
          // pieces of one word on the same line (a drop capital, a split run) are joined without a space
          const gap = item.x - (previous.x + previous.width);
          const sameWord = Math.abs(item.top - previous.top) < 2.5 && gap > -1.5 && gap < 1 && (previous.text.length <= 3 || item.text.length <= 3);
          return text + (sameWord ? "" : " ") + item.text;
        }, ""),
    ).slice(0, 220);

  // The description of each row. Cell text is not always level with its row number (numbers
  // can sit at the top or the middle of a tall row), so lines of description are grouped into
  // blocks wherever the vertical gap is larger than the normal line spacing, and each block
  // belongs to the row number that falls within it. Where a block holds several row numbers (rows
  // set tightly together) each line goes to the nearest row number instead.
  // Rows are bounded by the table's own horizontal lines when they were drawn: every row number
  // must then sit in a band of its own, otherwise the lines are not a usable row grid.
  const descriptionsByRules = (range: { from: number; to: number }) => {
    const width = Math.max(1, range.to - range.from);
    const ys = (page.rules || [])
      .filter((rule) => rule.x0 <= range.from + width * 0.5 && rule.x1 >= range.to - width * 0.5)
      .map((rule) => rule.y)
      .sort((a, b) => a - b)
      .filter((y, index, list) => !index || y - list[index - 1] > 1.5);
    if (ys.length < 2) return null;
    const bandOf = (top: number) => {
      let band = -1;
      ys.forEach((y, index) => { if (y <= top) band = index; });
      return band >= 0 && band < ys.length - 1 ? band : -1;
    };
    // only row numbers that carry marks become rows (a legend or notes below the table also
    // has numbered lines, with no lines drawn between them)
    const live = anchors.map((anchor) => codeItems.some((code) => Math.abs(code.top - anchor.top) <= 24));
    const anchorBands = anchors.map((anchor, index) => (live[index] ? bandOf(anchor.top) : -2));
    const liveBands = anchorBands.filter((band, index) => live[index]);
    if (!liveBands.length || liveBands.some((band) => band < 0) || new Set(liveBands).size !== liveBands.length) return null;
    const owned: Array<typeof items> = anchors.map(() => []);
    items.forEach((item) => {
      if (anchors.includes(item) || item.x < range.from || item.x + item.width / 2 > range.to) return;
      if (columns.some((column) => isCodeText(item.text) && Math.abs(item.x + item.width / 2 - column.centre) <= 16)) return;
      const band = bandOf(item.top);
      const index = band >= 0 ? anchorBands.indexOf(band) : -1;
      if (index >= 0) owned[index].push(item);
    });
    return owned;
  };

  const descriptionsFor = (range: { from: number; to: number }) => {
    const byRules = descriptionsByRules(range);
    if (byRules) return byRules.map((list) => joinItems(list));
    const first = Math.max(anchors[0].top - 22, headerBottom + 3);
    const last = anchors[anchors.length - 1].top + 40;
    const pieces = items
      .filter((item) =>
        !anchors.includes(item)
        && item.top >= first
        && item.top <= last
        && item.x >= range.from
        && item.x + item.width / 2 <= range.to
        // a lone letter inside the description column is part of a word ("P" of "Pressure"),
        // but a code printed in a code column is not description
        && !columns.some((column) => isCodeText(item.text) && Math.abs(item.x + item.width / 2 - column.centre) <= 16)
      )
      .sort((a, b) => a.top - b.top || a.x - b.x);
    const lines: Array<{ top: number; items: typeof pieces }> = [];
    pieces.forEach((item) => {
      const line = lines[lines.length - 1];
      if (line && Math.abs(item.top - line.top) < 2.5) line.items.push(item);
      else lines.push({ top: item.top, items: [item] });
    });
    const steps = lines.slice(1).map((line, index) => line.top - lines[index].top).filter((step) => step > 3 && step < 14);
    const pitch = median(steps) || 9;
    const blocks: Array<typeof lines> = [];
    lines.forEach((line, index) => {
      if (index && line.top - lines[index - 1].top <= pitch * 1.6) blocks[blocks.length - 1].push(line);
      else blocks.push([line]);
    });
    const nearest = (top: number) => anchors.reduce((best, anchor, index) => (Math.abs(anchor.top - top) < Math.abs(anchors[best].top - top) ? index : best), 0);
    const owned: Array<typeof pieces> = anchors.map(() => []);
    blocks.forEach((block) => {
      const top = block[0].top;
      const bottom = block[block.length - 1].top;
      const inside = anchors.map((anchor, index) => (anchor.top >= top - 6 && anchor.top <= bottom + 6 ? index : -1)).filter((index) => index >= 0);
      if (inside.length === 1) block.forEach((line) => owned[inside[0]].push(...line.items));
      else block.forEach((line) => owned[nearest(line.top)].push(...line.items));
    });
    return owned.map((list) => joinItems(list));
  };

  const buildRows = (range: { from: number; to: number }) => {
    const built: PageGrid["rows"] = [];
    const descriptions = descriptionsFor(range);
    anchors.forEach((anchor, index) => {
      // the first row starts below the column headings, so heading text is never read as description
      const upper = index > 0 ? (anchors[index - 1].top + anchor.top) / 2 : Math.max(anchor.top - 22, headerBottom + 3);
      const lower = index < anchors.length - 1 ? (anchor.top + anchors[index + 1].top) / 2 : anchor.top + 40;
      const cells: Record<string, string> = {};
      columns.forEach((column) => {
        const hit = codeItems
          .filter((item) =>
            Math.abs(item.x + item.width / 2 - column.centre) <= 16
            && item.top >= upper - 2
            && item.top <= lower + 2
            && Math.abs(item.top - anchor.top) <= 24
          )
          .sort((a, b) => Math.abs(a.top - anchor.top) - Math.abs(b.top - anchor.top))[0];
        if (hit) cells[column.key] = normaliseCode(hit.text);
      });
      if (!Object.keys(cells).length) return;
      const description = descriptions[index];
      built.push({ section: sectionOf(anchor.text), description, cells });
    });
    return built;
  };

  let rows = buildRows(descriptionRange(band) || defaultRange);
  if (!descriptionRange(band)) {
    const wide = descriptionRange(wideBand);
    if (wide) {
      const blankShare = rows.filter((row) => !row.description).length / Math.max(1, rows.length);
      // use the heading-based range when it is tighter than the guess, or the guess found nothing
      if (wide.to <= fraction.to || blankShare > 0.5) rows = buildRows(wide);
    }
  }
  if (!rows.length) return null;

  return {
    pageNumber: page.pageNumber,
    pageSignature: `${Math.round(page.width)}x${Math.round(page.height)}`,
    columns,
    rows,
  };
}

// ---- Abbreviation legends ("Contr = Contractor [Enshore]") ------------------------------

const BLANK_CELL = /^(?:n\/?a|-+|–|—|\/|\.+)$/i;

// Reads legend entries such as "Contr = Contractor [Enshore]" from pieces of text (one
// legend entry per piece, or several in a line when the definition is in brackets).
export function parseLegend(texts: string[]): Record<string, string> {
  const legend: Record<string, string> = {};
  const add = (key: string, definition: string) => {
    const name = key.toLowerCase();
    const meaning = cleanText(definition).replace(/[;,.]+$/, "").slice(0, 60);
    if (name.length >= 2 && meaning.length >= 3 && !legend[name]) legend[name] = meaning;
  };
  for (const text of texts) {
    const whole = cleanText(text);
    const single = whole.match(/^([A-Za-z]{2,10})\s*=\s*(.{3,60})$/);
    if (single) add(single[1], single[2]);
    for (const match of whole.matchAll(/\b([A-Za-z]{2,10})\s*=\s*((?:[A-Za-z]+\s+){0,2}\[[^\]]{2,30}\])/g)) add(match[1], match[2]);
  }
  return legend;
}

// A column headed only by an abbreviation takes the legend's wording, so "Contr" becomes
// "Contractor [Enshore]". Ambiguous headings are left unchanged.
export function expandWithLegend(label: string, legend: Record<string, string>) {
  const keys = [...new Set(normaliseLabel(label).split(" ").filter((token) => legend[token]))];
  return keys.length === 1 ? legend[keys[0]] : label;
}

function relabelPageGrid(pageGrid: PageGrid, legend: Record<string, string>): PageGrid {
  if (!Object.keys(legend).length) return pageGrid;
  const proposed = pageGrid.columns.map((column) => expandWithLegend(column.label, legend));
  const columns = pageGrid.columns.map((column, index) => {
    const duplicated = proposed.filter((label) => label === proposed[index]).length > 1;
    return duplicated ? column : { ...column, label: proposed[index] };
  });
  return { ...pageGrid, columns };
}

export function relabelPageGrids(pageGrids: PageGrid[], legend: Record<string, string>) {
  return pageGrids.map((pageGrid) => relabelPageGrid(pageGrid, legend));
}

// ---- Word and Excel tables -----------------------------------------------------------------

export type TableInput = { name: string; rows: string[][] };

// Reads each table's inspection columns the same way the PDF reader does: a column of
// short inspection codes is a column, its heading comes from the rows above the first data
// row (or from the document's repeating page header), and each row's code is its cell.
export function buildTableGrids(tables: TableInput[], options: { headerLabels?: string[]; legend?: Record<string, string> } = {}): PageGrid[] {
  const grids: PageGrid[] = [];
  const labelsByWidth = new Map<number, Record<number, string>>();

  tables.forEach((table, tableIndex) => {
    const rows = table.rows.map((row) => row.map((cell) => cleanText(cell)));
    const width = Math.max(0, ...rows.map((row) => row.length));
    if (rows.length < 3 || width < 4) return;
    const textOf = (row: string[], column: number) => (BLANK_CELL.test(row[column] || "") ? "" : row[column] || "");

    const isInspection: boolean[] = [];
    for (let column = 0; column < width; column += 1) {
      let codes = 0;
      let others = 0;
      rows.forEach((row) => {
        const text = textOf(row, column);
        if (!text) return;
        if (isCodeText(text) && !sectionOf(text)) codes += 1;
        else others += 1;
      });
      isInspection[column] = codes >= (rows.length <= 4 ? 1 : 2) && codes >= others;
    }
    const inspectionColumns = isInspection.map((flag, column) => (flag ? column : -1)).filter((column) => column >= 0);
    if (!inspectionColumns.length) return;

    const firstData = rows.findIndex((row) => inspectionColumns.some((column) => isCodeText(textOf(row, column)) && !sectionOf(textOf(row, column))));
    if (firstData < 0) return;
    const headerRows = rows.slice(Math.max(0, firstData - 3), firstData);

    // A heading repeated across many columns is a title bar, not a column name.
    const repeats = new Map<string, number>();
    headerRows.forEach((row) => new Set(row.map((cell) => cell.toLowerCase())).forEach((cell) => repeats.set(cell, (repeats.get(cell) || 0) + row.filter((value) => value.toLowerCase() === cell).length)));
    const inherited = labelsByWidth.get(width) || {};
    const labelFor = (column: number) => {
      const words = headerRows
        .map((row) => row[column] || "")
        .filter((text) => text
          && !/^\d+$/.test(text)
          && !GROUP_WORDS.test(text)
          && !text.includes("=")
          && text.length <= 30
          && (repeats.get(text.toLowerCase()) || 0) <= Math.max(3, width * 0.4));
      let label = cleanText([...new Set(words)].join(" ")).slice(0, 60);
      if (!label && options.headerLabels?.length) {
        const index = options.headerLabels.length - (width - column);
        const fromHeader = index >= 0 ? cleanText(options.headerLabels[index]) : "";
        if (fromHeader && fromHeader.length <= 30 && !fromHeader.includes("=")) label = fromHeader;
      }
      if (!label) label = inherited[column] || "";
      return expandWithLegend(label, options.legend || {}) || `Column ${column + 1}`;
    };

    const labels: Record<number, string> = {};
    const columns = inspectionColumns.map((column) => {
      labels[column] = labelFor(column);
      return { key: `c${column}`, label: labels[column], centre: column * 100 };
    });
    labelsByWidth.set(width, { ...inherited, ...Object.fromEntries(Object.entries(labels).filter(([, label]) => !isGenericLabel(label)).map(([column, label]) => [Number(column), label])) });

    const activityColumn = (() => {
      for (const row of headerRows) {
        const column = row.findIndex((cell, index) => index < inspectionColumns[0] && /activity|description|component|assembly|operation|process/i.test(cell));
        if (column >= 0) return column;
      }
      return -1;
    })();

    const gridRows: PageGrid["rows"] = [];
    let carried = "";
    rows.forEach((row, rowIndex) => {
      const leftColumns = Array.from({ length: Math.min(inspectionColumns[0], width) }, (_, column) => column);
      const sectionColumn = leftColumns.slice(0, 3).find((column) => sectionOf(row[column] || ""));
      const section = sectionColumn === undefined ? "" : sectionOf(row[sectionColumn]);
      if (section) carried = section;
      if (rowIndex < firstData) return;
      const cells: Record<string, string> = {};
      inspectionColumns.forEach((column) => {
        const text = textOf(row, column);
        if (text && isCodeText(text) && !sectionOf(text)) cells[`c${column}`] = normaliseCode(text);
      });
      if (!Object.keys(cells).length) return;
      const description = (activityColumn >= 0 ? row[activityColumn] : "")
        || leftColumns.filter((column) => column !== sectionColumn).map((column) => row[column] || "").find((text) => text.length >= 4 && !BLANK_CELL.test(text))
        || "";
      gridRows.push({ section: section || carried || "n/a", description: cleanText(description).slice(0, 220), cells });
    });
    if (!gridRows.length) return;

    grids.push({ pageNumber: tableIndex + 1, pageSignature: `w${width}`, columns, rows: gridRows });
  });

  return relabelPageGrids(grids, options.legend || {});
}

function fingerprintOf(labels: string[]) {
  let hash = 2166136261;
  for (const character of labels.map(normaliseLabel).sort().join("|")) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `cols-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function supplierLikeLabel(label: string, supplierName: string) {
  if (ENSHORE_WORDS.test(label)) return false;
  if (SUPPLIER_WORDS.test(label)) return true;
  const supplier = normaliseLabel(supplierName);
  if (!supplier) return false;
  const tokens = labelTokens(label);
  if (normaliseLabel(label).includes(supplier)) return true;
  // an abbreviation of the supplier's name, e.g. KR for Kraaijeveld
  return [...tokens].some((token) => token.length >= 2 && token.length <= 4 && supplier.startsWith(token));
}

type Accumulator = {
  id: string;
  labels: Map<string, number>;
  pages: Set<number>;
  signatures: Map<string, number>;
};

// Joins the per-page grids of one document into one grid with one entry per column.
export function mergePageGrids(
  pageGrids: PageGrid[],
  supplierName: string,
  pageCount: number,
  scannedPages: number[],
): GridResult {
  const accumulators: Accumulator[] = [];
  const known: Array<{ id: string; centre: number; signature: string; label: string }> = [];
  const rows: GridRow[] = [];

  for (const pageGrid of pageGrids) {
    const mapping = new Map<string, string>();
    for (const column of pageGrid.columns) {
      let match = known.find((entry) =>
        entry.signature === pageGrid.pageSignature
        && Math.abs(entry.centre - column.centre) <= 12
        && (isGenericLabel(column.label) || isGenericLabel(entry.label) || sameColumnLabel(entry.label, column.label))
      );
      if (!match) {
        match = known.find((entry) => !isGenericLabel(column.label) && !isGenericLabel(entry.label) && sameColumnLabel(entry.label, column.label));
      }
      if (!match) {
        match = { id: `col${known.length + 1}`, centre: column.centre, signature: pageGrid.pageSignature, label: column.label };
        known.push(match);
        accumulators.push({ id: match.id, labels: new Map(), pages: new Set(), signatures: new Map() });
      }
      if (isGenericLabel(match.label) && !isGenericLabel(column.label)) match.label = column.label;
      const accumulator = accumulators.find((entry) => entry.id === match!.id)!;
      accumulator.labels.set(column.label, (accumulator.labels.get(column.label) || 0) + 1);
      accumulator.pages.add(pageGrid.pageNumber);
      mapping.set(column.key, match.id);
    }
    for (const row of pageGrid.rows) {
      const cells: Record<string, string> = {};
      Object.entries(row.cells).forEach(([key, value]) => {
        const id = mapping.get(key);
        if (id) cells[id] = value;
      });
      rows.push({ page: pageGrid.pageNumber, section: row.section, description: row.description, cells, via: "position" });
    }
  }

  return finaliseGrid(accumulators, rows, supplierName, pageCount, scannedPages);
}

function finaliseGrid(accumulators: Accumulator[], rows: GridRow[], supplierName: string, pageCount: number, scannedPages: number[]): GridResult {
  const columns: GridColumn[] = accumulators.map((accumulator) => {
    const label = [...accumulator.labels.entries()]
      .filter(([text]) => !isGenericLabel(text))
      .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)[0]?.[0]
      || [...accumulator.labels.keys()][0]
      || accumulator.id;
    const counts = { W: 0, H: 0, WH: 0, other: 0 };
    rows.forEach((row) => {
      const type = row.cells[accumulator.id] ? cellType(row.cells[accumulator.id]) : null;
      if (!type) return;
      if (type === "W") counts.W += 1;
      else if (type === "H") counts.H += 1;
      else if (type === "W/H") counts.WH += 1;
      else counts.other += 1;
    });
    return {
      id: accumulator.id,
      label,
      pages: [...accumulator.pages].sort((a, b) => a - b),
      supplierLike: supplierLikeLabel(label, supplierName),
      suggested: false,
      marks: counts.W + counts.H + counts.WH + counts.other,
      counts,
    };
  });

  // Only a column that actually holds marks can be suggested.
  const explicit = columns.filter((column) => ENSHORE_WORDS.test(column.label) && !column.supplierLike && column.marks > 0);
  // When a separate Client / Employer column also holds marks it is unclear whose column is
  // wanted, so nothing is suggested and the person chooses.
  const otherClient = columns.filter((column) => GENERIC_CLIENT_WORDS.test(column.label) && !ENSHORE_WORDS.test(column.label) && !column.supplierLike && column.marks > 0);
  if (explicit.length === 1 && !otherClient.length) explicit[0].suggested = true;
  else if (explicit.length === 1) { /* ambiguous: no suggestion */ }
  else if (!explicit.length) {
    const generic = columns.filter((column) => GENERIC_CLIENT_WORDS.test(column.label) && !column.supplierLike && column.marks > 0);
    if (generic.length === 1) generic[0].suggested = true;
  }

  return {
    columns,
    rows,
    fingerprint: fingerprintOf(columns.map((column) => column.label)),
    pageCount,
    scannedPages,
  };
}

// One visual transcription of a few pages: the column headings in left-to-right order and,
// per row, the code in each column.
export type VisualGridChunk = {
  columns: string[];
  rows: Array<{ page: number; section: string; activity: string; cells: string[] }>;
};

export function parseVisualGridChunk(value: unknown): VisualGridChunk {
  const source = (value ?? {}) as { columns?: unknown; rows?: unknown };
  const columns = Array.isArray(source.columns) ? source.columns.map((column) => cleanText(typeof column === "string" ? column : (column as { heading?: string })?.heading)).slice(0, 12) : [];
  const rows = Array.isArray(source.rows)
    ? source.rows.flatMap((raw) => {
        const row = raw as { page?: unknown; section?: unknown; activity?: unknown; cells?: unknown };
        // Rows without a printed number keep whatever reference the page shows.
        const section = sectionOf(cleanText(row.section)) || cleanText(row.section).slice(0, 20) || "n/a";
        const cells = Array.isArray(row.cells) ? row.cells.map((cell) => cleanText(cell)).slice(0, columns.length) : [];
        const page = Number(row.page);
        if (!cells.length) return [];
        return [{ page: Number.isFinite(page) && page > 0 ? page : 0, section, activity: cleanText(row.activity).slice(0, 220), cells }];
      })
    : [];
  return { columns, rows };
}

// Adds visually transcribed pages (scanned pages, or a document with no readable text
// layer) to a grid, matching columns to the position-read ones by heading.
export function addVisualChunks(base: GridResult | null, chunks: VisualGridChunk[], supplierName: string, pageCount: number, scannedPages: number[]): GridResult {
  const accumulators: Accumulator[] = [];
  const rows: GridRow[] = base ? base.rows.map((row) => ({ ...row })) : [];
  const known: Array<{ id: string; label: string }> = [];

  base?.columns.forEach((column) => {
    known.push({ id: column.id, label: column.label });
    accumulators.push({ id: column.id, labels: new Map([[column.label, 1]]), pages: new Set(column.pages), signatures: new Map() });
  });

  for (const chunk of chunks) {
    const ids = chunk.columns.map((heading, index) => {
      const label = heading || `Column ${index + 1}`;
      let match = known.find((entry) => sameColumnLabel(entry.label, label));
      if (!match) {
        match = { id: `col${known.length + 1}`, label };
        known.push(match);
        accumulators.push({ id: match.id, labels: new Map(), pages: new Set(), signatures: new Map() });
      }
      const accumulator = accumulators.find((entry) => entry.id === match!.id)!;
      accumulator.labels.set(label, (accumulator.labels.get(label) || 0) + 1);
      return match.id;
    });
    for (const row of chunk.rows) {
      const cells: Record<string, string> = {};
      row.cells.forEach((cell, index) => {
        const code = normaliseCode(cell);
        if (code && ids[index] && /^[A-Z](?:\/[A-Z])*$/.test(code)) {
          cells[ids[index]] = code;
          accumulators.find((entry) => entry.id === ids[index])?.pages.add(row.page);
        }
      });
      if (Object.keys(cells).length) rows.push({ page: row.page, section: row.section, description: row.activity, cells, via: "visual" });
    }
  }
  return finaliseGrid(accumulators, rows, supplierName, pageCount, scannedPages);
}

// File name (without extension) used to remember the chosen column for a column layout.
export function addColumnChoicePrefix(fingerprint: string) {
  return `column-choice-${fingerprint}`;
}

// The review (R) and approval (A) points in the chosen column: the second list offered with the W/H points.
export type ReviewCandidate = { sectionNumber: string; activityDescription: string; code: string; sourceLocation: string };

export function reviewCandidatesForColumn(grid: GridResult, columnId: string): ReviewCandidate[] {
  const column = grid.columns.find((entry) => entry.id === columnId);
  if (!column) return [];
  const seen = new Set<string>();
  return grid.rows.flatMap((row): ReviewCandidate[] => {
    const cell = row.cells[columnId];
    if (!cell) return [];
    const code = normaliseCode(cell);
    const parts = code.split("/");
    // R, R/A, A, A/V, M/R; never W or H (NOI points) or N/A
    if (!/^[A-Z](?:\/[A-Z])*$/.test(code) || parts.includes("W") || parts.includes("H") || parts.includes("N") || !(parts.includes("R") || parts.includes("A"))) return [];
    const key = `${row.section}|${code}|${row.description}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{
      sectionNumber: row.section,
      activityDescription: row.description || `Item ${row.section}`,
      code,
      sourceLocation: `${row.via === "position" ? "Column position" : "Visual reading"} · ${grid.locationLabels?.[row.page - 1] || `${grid.unit || "Page"} ${row.page || "?"}`}`,
    }];
  });
}

// The W/H points in the chosen column, ready for review.
export function candidatesForColumn(grid: GridResult, columnId: string): GridCandidate[] {
  const column = grid.columns.find((entry) => entry.id === columnId);
  if (!column) return [];
  return grid.rows.flatMap((row): GridCandidate[] => {
    const cell = row.cells[columnId];
    const type = cell ? cellType(cell) : null;
    if (!type) return [];
    return [{
      sectionNumber: row.section,
      activityDescription: row.description || `Item ${row.section}`,
      interventionType: type,
      partyHeading: column.label,
      confidence: row.via === "position" ? "High" : "Medium",
      sourceLocation: `${row.via === "position" ? "Column position" : "Visual reading"} · ${grid.locationLabels?.[row.page - 1] || `${grid.unit || "Page"} ${row.page || "?"}`}`,
    }];
  });
}

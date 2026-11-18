import * as XLSX from "xlsx";

// Prepares the client MOC register annex for one project, or for one part of a project (for example BA3).
// Records come from the live MOC register, or from an uploaded register workbook (read in the browser; nothing is stored).

// A part of a project, such as "BA3". An empty string means the whole project (projects without parts).
export type MocProject = string;

export const MOC_STATUSES = ["Draft", "Under review", "Approved - implementing", "Implemented - close-out pending", "Closed", "Not implemented", "To confirm"];

export type MocRecord = {
  mocNo: string;
  title: string;
  appliesTo: string;
  type: string;
  coordinator: string;
  manager: string;
  implFrom: string;
  implTo: string;
  status: string;
  nextStep: string;
  nextOwner: string;
  nextDue: string;
  notes: string;
};

export type MocAction = { mocNo: string; no: string; description: string; responsible: string; target: string; status: string };

export type MocWorkbook = { mocs: MocRecord[]; actions: MocAction[]; warnings: string[] };

export type AnnexRow = MocRecord & { actionsTotal: number; actionsClosed: number };
export type AnnexAction = MocAction & { title: string };
export type Annex = {
  project: MocProject;
  projectLabel: string;
  reportDate: string;
  rows: AnnexRow[];
  openActions: AnnexAction[];
  counts: { total: number; open: number; finished: number; toConfirm: number; openActions: number; pastEnd: number };
};

function clean(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function norm(value: unknown) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

// A date cell can arrive as an Excel serial number, a Date, or typed text. Return YYYY-MM-DD when it is a real date,
// otherwise the text as typed (for example "TBC").
export function toIsoDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  if (typeof value === "number" && Number.isFinite(value) && value > 59) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y}-${pad(parsed.m)}-${pad(parsed.d)}`;
  }
  const text = clean(value);
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const match = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (match) {
    const year = match[3].length === 2 ? `20${match[3]}` : match[3];
    return `${year}-${pad(Number(match[2]))}-${pad(Number(match[1]))}`;
  }
  return text;
}

export function formatDate(value: string) {
  if (!value) return "-";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function isFinished(status: string) {
  return /^(closed|not implemented)/i.test(clean(status));
}

export function isActionComplete(status: string) {
  return /^(complete|completed|closed|done)$/i.test(clean(status));
}

export function isToConfirm(status: string) {
  return /^to confirm/i.test(clean(status)) || !clean(status);
}

// "All" applies to every part. Otherwise the cell lists one or more parts ("BA3 & LW2", "BA3, LW4"). With no part chosen
// (a project without parts) every MOC applies.
export function appliesToProject(appliesTo: string, project: MocProject) {
  if (!project) return true;
  const tokens = clean(appliesTo).toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
  if (!tokens.length) return true;
  return tokens.includes("ALL") || tokens.includes(project);
}

type Sheet = XLSX.WorkSheet;

function rowsOf(sheet: Sheet) {
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "" });
}

function findSheet(workbook: XLSX.WorkBook, name: string) {
  const match = workbook.SheetNames.find((candidate) => norm(candidate) === norm(name));
  return match ? workbook.Sheets[match] : undefined;
}

function headerMap(rows: unknown[][], required: string[]) {
  for (let index = 0; index < Math.min(rows.length, 30); index += 1) {
    const cells = rows[index].map(norm);
    if (required.every((label) => cells.includes(label))) return { index, cells };
  }
  return null;
}

function pick(row: unknown[], cells: string[], names: string[]) {
  for (const name of names) {
    const column = cells.indexOf(name);
    if (column >= 0) return row[column];
  }
  return "";
}

export function parseMocWorkbook(data: ArrayBuffer): MocWorkbook {
  const workbook = XLSX.read(data, { type: "array" });
  const warnings: string[] = [];
  const registerSheet = findSheet(workbook, "Register");
  if (!registerSheet) throw new Error("This workbook has no sheet called Register. Upload the MOC register workbook from SharePoint.");
  const registerRows = rowsOf(registerSheet);
  const header = headerMap(registerRows, ["moc no", "title"]);
  if (!header) throw new Error("The Register sheet has no header row containing MOC No and Title.");

  const mocs: MocRecord[] = [];
  for (const row of registerRows.slice(header.index + 1)) {
    const mocNo = clean(pick(row, header.cells, ["moc no", "moc number"]));
    if (!mocNo) continue;
    mocs.push({
      mocNo,
      title: clean(pick(row, header.cells, ["title"])),
      appliesTo: clean(pick(row, header.cells, ["applies to", "project"])),
      type: clean(pick(row, header.cells, ["type"])),
      coordinator: clean(pick(row, header.cells, ["moc coordinator", "coordinator"])),
      manager: clean(pick(row, header.cells, ["responsible manager"])),
      implFrom: toIsoDate(pick(row, header.cells, ["implementation from"])),
      implTo: toIsoDate(pick(row, header.cells, ["implementation to"])),
      status: clean(pick(row, header.cells, ["status"])),
      nextStep: clean(pick(row, header.cells, ["next step"])),
      nextOwner: clean(pick(row, header.cells, ["next step owner"])),
      nextDue: toIsoDate(pick(row, header.cells, ["next step due"])),
      notes: clean(pick(row, header.cells, ["notes for report"])),
    });
  }
  const seen = new Set<string>();
  for (const moc of mocs) {
    if (seen.has(moc.mocNo.toLowerCase())) warnings.push(`${moc.mocNo} appears more than once on the Register sheet.`);
    seen.add(moc.mocNo.toLowerCase());
  }

  const actions: MocAction[] = [];
  const actionSheet = findSheet(workbook, "Actions");
  if (actionSheet) {
    const actionRows = rowsOf(actionSheet);
    const actionHeader = headerMap(actionRows, ["moc no", "description"]);
    if (!actionHeader) warnings.push("The Actions sheet has no header row containing MOC No and Description, so no actions were read.");
    else {
      for (const row of actionRows.slice(actionHeader.index + 1)) {
        const mocNo = clean(pick(row, actionHeader.cells, ["moc no"]));
        const description = clean(pick(row, actionHeader.cells, ["description"]));
        if (!mocNo || !description) continue;
        actions.push({
          mocNo,
          no: clean(pick(row, actionHeader.cells, ["action no", "no"])),
          description,
          responsible: clean(pick(row, actionHeader.cells, ["responsible"])),
          target: toIsoDate(pick(row, actionHeader.cells, ["target"])),
          status: clean(pick(row, actionHeader.cells, ["status"])),
        });
      }
    }
  } else warnings.push("There is no Actions sheet, so action counts will show as nil.");

  const known = new Set(mocs.map((moc) => moc.mocNo.toLowerCase()));
  const strays = [...new Set(actions.filter((action) => !known.has(action.mocNo.toLowerCase())).map((action) => action.mocNo))];
  if (strays.length) warnings.push(`Actions refer to MOCs that are not on the Register sheet: ${strays.join(", ")}.`);
  return { mocs, actions, warnings };
}

export function buildAnnex(source: MocWorkbook, project: MocProject, options: { includeFinished: boolean; reportDate: string; projectLabel?: string }): Annex {
  const today = options.reportDate;
  const rows: AnnexRow[] = source.mocs
    .filter((moc) => appliesToProject(moc.appliesTo, project) && (options.includeFinished || !isFinished(moc.status)))
    .map((moc) => {
      const own = source.actions.filter((action) => action.mocNo.toLowerCase() === moc.mocNo.toLowerCase());
      return { ...moc, actionsTotal: own.length, actionsClosed: own.filter((action) => isActionComplete(action.status)).length };
    });
  const shown = new Set(rows.map((row) => row.mocNo.toLowerCase()));
  const openActions: AnnexAction[] = source.actions
    .filter((action) => shown.has(action.mocNo.toLowerCase()) && !isActionComplete(action.status))
    .map((action) => ({ ...action, title: rows.find((row) => row.mocNo.toLowerCase() === action.mocNo.toLowerCase())?.title || "" }));
  return {
    project,
    projectLabel: options.projectLabel || "Project",
    reportDate: today,
    rows,
    openActions,
    counts: {
      total: rows.length,
      open: rows.filter((row) => !isFinished(row.status)).length,
      finished: rows.filter((row) => isFinished(row.status)).length,
      toConfirm: rows.filter((row) => isToConfirm(row.status)).length,
      openActions: openActions.length,
      pastEnd: rows.filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.implTo) && row.implTo < today && !isFinished(row.status)).length,
    },
  };
}

export function isPastEnd(row: Pick<MocRecord, "implTo" | "status">, today: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(row.implTo) && row.implTo < today && !isFinished(row.status);
}

export function implementationPeriod(row: Pick<MocRecord, "implFrom" | "implTo">) {
  if (!row.implFrom && !row.implTo) return "-";
  return `${formatDate(row.implFrom)} to ${formatDate(row.implTo)}`;
}

export function nextStepText(row: Pick<MocRecord, "nextStep" | "nextOwner" | "nextDue">) {
  if (!row.nextStep && !row.nextOwner && !row.nextDue) return "-";
  const detail = [row.nextOwner ? `Owner: ${row.nextOwner}` : "", row.nextDue ? `Due: ${formatDate(row.nextDue)}` : ""].filter(Boolean).join(" | ");
  return [row.nextStep, detail].filter(Boolean).join("\n");
}

export function actionsText(row: Pick<AnnexRow, "actionsTotal" | "actionsClosed">) {
  return row.actionsTotal ? `${row.actionsClosed} of ${row.actionsTotal}` : "-";
}

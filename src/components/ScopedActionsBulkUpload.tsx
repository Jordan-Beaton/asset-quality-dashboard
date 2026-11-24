"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

// Excel bulk upload for the Create view of a module Actions page (used by HSE Actions through ScopedActionsPage).
// It reads the first sheet of an .xlsx tracker, shows a preview, and creates central Action Management records.
// The reading, checking and saving rules are the ones the HSE Actions page used before this was split out.

type XlsxModule = typeof import("xlsx");

type PersonLite = { name: string; email: string | null };
type NumberedOption = { id: string; number: string };
type NcrCapaLite = { type: "NCR" | "CAPA"; id: string; number: string };
type HseInspectionLite = { id: string; inspection_number: string };

type ImportRow = {
  rowNumber: number;
  title: string;
  description: string;
  department: string;
  project: string;
  owner: string;
  priority: string;
  status: string;
  due_date: string;
  source: string;
  linkedReference: string;
  errors: string[];
  skipReasons: string[];
  personWillBeCreated: boolean;
};

type LinkedImportFields = {
  linked_ainm_id?: string | null;
  linked_ainm_number?: string | null;
  linked_hse_inspection_id?: string | null;
  linked_hse_inspection_number?: string | null;
  linked_ncr_id?: string | null;
  linked_ncr_number?: string | null;
  linked_capa_id?: string | null;
  linked_capa_number?: string | null;
  linked_moc_id?: string | null;
  linked_moc_number?: string | null;
};

type Props = {
  canCreateAction: boolean;
  people: PersonLite[];
  ainmOptions: NumberedOption[];
  hseInspectionOptions: HseInspectionLite[];
  ncrCapaOptions: NcrCapaLite[];
  mocOptions: NumberedOption[];
  /** The Source values a row may use. Anything else becomes "HSE". */
  sourceOptions: string[];
  setMessage: (message: string) => void;
  /** Called after a successful import so the page can reload its register. */
  onImported: () => Promise<void>;
};

const priorityOptions = ["Low", "Medium", "High"];

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function extractActionNumber(value: string | null | undefined) {
  const match = (value || "").match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function normalizeImportHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeLookupValue(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function getImportCell(row: Record<string, unknown>, candidates: string[]) {
  const normalizedCandidates = candidates.map(normalizeImportHeader);
  const entry = Object.entries(row).find(([key]) => normalizedCandidates.includes(normalizeImportHeader(key)));
  const value = entry?.[1];
  return value === null || value === undefined ? "" : String(value).trim();
}

function normalizeImportDate(XLSX: XlsxModule, value: unknown) {
  if (value === null || value === undefined || value === "") return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const month = String(parsed.m).padStart(2, "0");
      const day = String(parsed.d).padStart(2, "0");
      return `${parsed.y}-${month}-${day}`;
    }
  }
  const text = String(value).trim();
  if (!text) return "";
  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;
  const ukMatch = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (ukMatch) {
    const year = ukMatch[3].length === 2 ? `20${ukMatch[3]}` : ukMatch[3];
    return `${year}-${ukMatch[2].padStart(2, "0")}-${ukMatch[1].padStart(2, "0")}`;
  }
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function getRawDateCell(row: Record<string, unknown>, candidates: string[]) {
  const normalizedCandidates = candidates.map(normalizeImportHeader);
  const entry = Object.entries(row).find(([key]) => normalizedCandidates.includes(normalizeImportHeader(key)));
  return entry?.[1] ?? "";
}

function titleCaseName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((part) => (part ? `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}` : part))
    .join(" ");
}

function generateEmailFromName(name: string) {
  const clean = titleCaseName(name).replace(/[^a-zA-Z\s'-]/g, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return "";
  const firstInitial = parts[0].charAt(0).toLowerCase();
  const surname = parts[parts.length - 1].replace(/[^a-zA-Z]/g, "").toLowerCase();
  return firstInitial && surname ? `${firstInitial}${surname}@enshoresubsea.com` : "";
}

function normalizeImportPriority(value: string) {
  const match = priorityOptions.find((option) => option.toLowerCase() === value.trim().toLowerCase());
  return match || "Medium";
}

function normalizeImportStatus(value: string) {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return "Open";
  if (["closed", "complete", "completed"].includes(trimmed)) return "Closed";
  if (["in progress", "progress", "ongoing"].includes(trimmed)) return "In Progress";
  return "Open";
}

function normalizeImportDepartment(value: string) {
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "quality" || trimmed === "qa" || trimmed === "qc") return "Quality";
  if (trimmed === "hse" || trimmed === "h&s" || trimmed === "health safety environment") return "HSE";
  if (trimmed === "hseq") return "HSE";
  return "HSE";
}

export function ScopedActionsBulkUpload({
  canCreateAction,
  people,
  ainmOptions,
  hseInspectionOptions,
  ncrCapaOptions,
  mocOptions,
  sourceOptions,
  setMessage,
  onImported,
}: Props) {
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [isImportingActions, setIsImportingActions] = useState(false);

  const importableRows = useMemo(() => importRows.filter((row) => row.errors.length === 0 && row.skipReasons.length === 0), [importRows]);
  const skippedImportRows = useMemo(() => importRows.filter((row) => row.errors.length > 0 || row.skipReasons.length > 0), [importRows]);

  function normalizeImportSource(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return "HSE";
    const matched = sourceOptions.find((option) => option.toLowerCase() === trimmed.toLowerCase());
    return matched || "HSE";
  }

  async function handleImportFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (!canCreateAction) {
      event.target.value = "";
      setMessage("Read-only access: you do not have permission to import HSE actions.");
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImportRows([]);
    setMessage(`Reading ${file.name}...`);

    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        setMessage("Import failed: workbook does not contain any sheets.");
        return;
      }

      const sheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
        raw: true,
      });

      if (!rawRows.length) {
        setMessage("Import failed: first sheet has no action rows.");
        return;
      }

      const existingPeople = new Set(people.map((person) => normalizeLookupValue(person.name)).filter(Boolean));
      const existingEmails = new Set(people.map((person) => normalizeLookupValue(person.email)).filter(Boolean));
      const uploadKeys = new Set<string>();
      const uploadPeople = new Set<string>();

      const parsedRows = rawRows.map((row, index): ImportRow => {
        const title = getImportCell(row, ["Title", "Action Title", "Action", "Action Required"]);
        const descriptionParts = [
          getImportCell(row, ["Description", "Action Description", "Details"]),
          getImportCell(row, ["Comments", "Comment", "Notes"]),
        ].filter(Boolean);
        const project = getImportCell(row, ["Project", "Project / Work Scope", "Work Scope", "Project Work Scope"]);
        const department = normalizeImportDepartment(getImportCell(row, ["Department", "Allocation", "Action Department", "Function"]));
        const rawOwner = getImportCell(row, ["Owner", "Assigned", "Assigned To", "Action Owner", "Responsible Person"]);
        const owner = rawOwner ? titleCaseName(rawOwner) : "";
        const priority = normalizeImportPriority(getImportCell(row, ["Priority"]));
        const status = normalizeImportStatus(getImportCell(row, ["Status"]));
        const dueDate = normalizeImportDate(XLSX, getRawDateCell(row, ["Due Date", "Target Date", "Target Response Date"]));
        const source = normalizeImportSource(getImportCell(row, ["Source", "Source Type", "Module"]));
        const linkedReference = getImportCell(row, ["Linked Record", "Linked Reference", "AINM No", "AINM Number", "Inspection No", "Inspection Number", "NCR No", "NCR Number"]);
        const errors: string[] = [];
        const skipReasons: string[] = [];
        const rowKey = normalizeLookupValue(`${title}|${project}|${owner}|${dueDate}|${descriptionParts.join(" ")}`);
        const normalizedOwner = normalizeLookupValue(owner);
        const ownerEmail = owner ? generateEmailFromName(owner) : "";
        const personWillBeCreated = Boolean(owner && !existingPeople.has(normalizedOwner));

        if (!title) errors.push("Title/Action is required.");
        if (owner && !ownerEmail && !existingPeople.has(normalizedOwner)) {
          errors.push("Owner needs a first name and surname to create People record.");
        }
        if (ownerEmail && existingEmails.has(normalizeLookupValue(ownerEmail)) && !existingPeople.has(normalizedOwner)) {
          skipReasons.push("Generated owner email already exists for another person.");
        }
        if (rowKey && uploadKeys.has(rowKey)) skipReasons.push("Duplicate action in uploaded file.");
        if (rowKey) uploadKeys.add(rowKey);
        if (normalizedOwner && uploadPeople.has(normalizedOwner) && personWillBeCreated) {
          // Only the first row needs to create the person. Later rows can still import against the same new owner.
        } else if (normalizedOwner && personWillBeCreated) {
          uploadPeople.add(normalizedOwner);
        }

        return {
          rowNumber: index + 2,
          title,
          description: descriptionParts.join("\n\n"),
          department,
          project,
          owner,
          priority,
          status,
          due_date: dueDate,
          source,
          linkedReference,
          errors,
          skipReasons,
          personWillBeCreated,
        };
      });

      setImportRows(parsedRows);
      setMessage(`Preview ready: ${parsedRows.length} action row${parsedRows.length === 1 ? "" : "s"} loaded from ${file.name}.`);
    } catch (error) {
      setMessage(`Import preview failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      event.target.value = "";
    }
  }

  function buildLinkedImportFields(row: ImportRow) {
    const reference = row.linkedReference.trim();
    const payload: LinkedImportFields = {};
    if (!reference) return payload;

    const normalizedSource = row.source.toLowerCase();
    if (normalizedSource === "ainm" || /^a?r?\d+/i.test(reference)) {
      const matched = ainmOptions.find((option) => option.number.toLowerCase() === reference.toLowerCase());
      payload.linked_ainm_id = matched?.id || null;
      payload.linked_ainm_number = matched?.number || reference;
      return payload;
    }

    if (normalizedSource === "hse inspection" || /^hse-ins-/i.test(reference)) {
      const matched = hseInspectionOptions.find((option) => option.inspection_number.toLowerCase() === reference.toLowerCase());
      payload.linked_hse_inspection_id = matched?.id || null;
      payload.linked_hse_inspection_number = matched?.inspection_number || reference;
      return payload;
    }

    if (normalizedSource === "ncr/capa" || /^ncr-/i.test(reference)) {
      const matched = ncrCapaOptions.find((option) => option.number.toLowerCase() === reference.toLowerCase());
      if (matched?.type === "NCR") {
        payload.linked_ncr_id = matched.id;
        payload.linked_ncr_number = matched.number;
      } else if (matched?.type === "CAPA") {
        payload.linked_capa_id = matched.id;
        payload.linked_capa_number = matched.number;
      } else {
        payload.linked_ncr_number = reference;
      }
      return payload;
    }

    if (normalizedSource === "moc") {
      const matched = mocOptions.find((option) => option.number.toLowerCase() === reference.toLowerCase());
      payload.linked_moc_id = matched?.id || null;
      payload.linked_moc_number = matched?.number || reference;
      return payload;
    }

    return payload;
  }

  async function importPreviewedActions() {
    if (!canCreateAction) {
      setMessage("Read-only access: you do not have permission to import HSE actions.");
      return;
    }

    if (!importRows.length) {
      setMessage("Select an Excel file before importing HSE/Quality actions.");
      return;
    }
    if (!importableRows.length) {
      setMessage("No valid HSE/Quality action rows are available to import.");
      return;
    }

    setIsImportingActions(true);
    try {
      const existingPeople = new Set(people.map((person) => normalizeLookupValue(person.name)).filter(Boolean));
      const missingPeople = Array.from(
        new Map(
          importableRows
            .filter((row) => row.owner && row.personWillBeCreated && !existingPeople.has(normalizeLookupValue(row.owner)))
            .map((row) => [normalizeLookupValue(row.owner), { name: row.owner, department: row.department || "HSE" }])
        ).values()
      );

      if (missingPeople.length) {
        const peopleRows = missingPeople.map((person) => ({
          name: person.name,
          email: generateEmailFromName(person.name) || null,
          role: null,
          department: person.department,
          active: true,
        }));
        const { error: peopleError } = await supabase.from("people").insert(peopleRows);
        if (peopleError) throw new Error(`People import failed: ${peopleError.message}`);
      }

      const { data: allActionNumbers, error: numbersError } = await supabase.from("actions").select("action_number");
      if (numbersError) throw new Error(`Could not allocate action numbers: ${numbersError.message}`);
      const existingActions = (allActionNumbers || []) as Array<{ action_number: string | null }>;
      const highest = existingActions.reduce((max, action) => Math.max(max, extractActionNumber(action.action_number) || 0), 0);

      const actionRows = importableRows.map((row, index) => ({
        action_number: `ACT-${String(highest + index + 1).padStart(3, "0")}`,
        title: row.title.trim(),
        description: row.description.trim() || null,
        department: row.department || "HSE",
        project: row.project.trim() || null,
        owner: row.owner.trim() || null,
        priority: row.priority,
        status: row.status,
        due_date: row.due_date || null,
        source: row.source || "HSE",
        ...buildLinkedImportFields(row),
      }));

      const { error: actionError } = await supabase.from("actions").insert(actionRows);
      if (actionError) throw new Error(`Action import failed: ${actionError.message}`);

      setMessage(`Imported ${actionRows.length} HSE/Quality action${actionRows.length === 1 ? "" : "s"} from ${importFileName}.`);
      setImportRows([]);
      setImportFileName("");
      setShowImportPanel(false);
      await onImported();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "HSE/Quality action import failed.");
    } finally {
      setIsImportingActions(false);
    }
  }

  return (
    <>
      <div style={importToggleRowStyle}>
        <button type="button" style={showImportPanel ? secondaryButtonStyle : primaryButtonStyle} onClick={() => setShowImportPanel((current) => !current)}>
          {showImportPanel ? "Hide Bulk Upload" : "Bulk Upload HSE / Quality Actions"}
        </button>
        <span style={emptyTextStyle}>Upload an Excel action tracker and preview rows before creating central Action Management records.</span>
      </div>

      {showImportPanel ? (
        <div style={importPanelStyle}>
          <div style={importControlRowStyle}>
            <input type="file" accept=".xlsx" onChange={(event) => void handleImportFileChange(event)} style={fileInputStyle} disabled={!canCreateAction} />
            <button type="button" style={primaryButtonStyle} disabled={!importableRows.length || isImportingActions || !canCreateAction} onClick={() => void importPreviewedActions()}>
              {isImportingActions ? "Importing..." : `Import ${importableRows.length} Actions`}
            </button>
            <button
              type="button"
              style={secondaryButtonStyle}
              onClick={() => {
                setImportRows([]);
                setImportFileName("");
              }}
            >
              Clear Preview
            </button>
          </div>

          {importRows.length ? (
            <>
              <div style={tableInfoStyle}>
                Previewing {importRows.length} row{importRows.length === 1 ? "" : "s"} from {importFileName || "selected workbook"}.{" "}
                <strong>{importableRows.length}</strong> ready, <strong>{skippedImportRows.length}</strong> requiring attention/skipped.
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={importTableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Row</th>
                      <th style={thStyle}>Title</th>
                      <th style={thStyle}>Owner</th>
                      <th style={thStyle}>Department</th>
                      <th style={thStyle}>Project</th>
                      <th style={thStyle}>Source</th>
                      <th style={thStyle}>Due Date</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Import Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.slice(0, 60).map((row) => {
                      const issues = [...row.errors, ...row.skipReasons];
                      return (
                        <tr key={`${row.rowNumber}-${row.title}`} style={issues.length ? importWarningRowStyle : undefined}>
                          <td style={tdStrongStyle}>{row.rowNumber}</td>
                          <td style={tdStyle}>{row.title || "-"}</td>
                          <td style={tdStyle}>
                            {row.owner || "-"}
                            {row.personWillBeCreated && !issues.length ? <div style={mutedTextStyle}>Will add to People Management</div> : null}
                          </td>
                          <td style={tdStyle}>{row.department || "HSE"}</td>
                          <td style={tdStyle}>{row.project || "-"}</td>
                          <td style={tdStyle}>{row.source || "HSE"}</td>
                          <td style={tdStyle}>{row.due_date ? formatDate(row.due_date) : "-"}</td>
                          <td style={tdStyle}>{row.status}</td>
                          <td style={tdStyle}>{issues.length ? issues.join(" ") : "Ready"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {importRows.length > 60 ? <p style={emptyTextStyle}>Showing first 60 preview rows only. All valid rows will import.</p> : null}
            </>
          ) : (
            <div style={emptyBoxStyle}>Choose an Excel workbook to preview HSE/Quality action rows before import.</div>
          )}
        </div>
      ) : null}
    </>
  );
}

const emptyTextStyle: CSSProperties = { color: "#53565A", margin: 0, lineHeight: 1.55, fontSize: 13 };
const importToggleRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "14px" };
const importPanelStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
  padding: "14px",
  border: "1px solid #D0D0CE",
  borderRadius: "16px",
  background: "rgba(248,250,252,0.92)",
  marginBottom: "18px",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
};
const importControlRowStyle: CSSProperties = { display: "grid", gridTemplateColumns: "minmax(220px, 1fr) auto auto", gap: "10px", alignItems: "center" };
const fileInputStyle: CSSProperties = {
  width: "100%",
  minHeight: 42,
  border: "1px solid #D0D0CE",
  borderRadius: 10,
  padding: "9px 12px",
  fontSize: 14,
  boxSizing: "border-box",
  color: "#000000",
  background: "white",
};
const importTableStyle: CSSProperties = { width: "100%", borderCollapse: "collapse", background: "#ffffff", minWidth: 1040, fontSize: "13px" };
const importWarningRowStyle: CSSProperties = { background: "#ECECE7" };
const secondaryButtonStyle: CSSProperties = { border: "1px solid #D0D0CE", background: "#D0D0CE", color: "#000000", borderRadius: 10, padding: "10px 13px", fontWeight: 800, cursor: "pointer" };
const primaryButtonStyle: CSSProperties = { border: "none", background: "#005670", color: "white", borderRadius: 10, padding: "11px 14px", fontWeight: 900, cursor: "pointer" };
const tableInfoStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: "4px",
  flexWrap: "wrap",
  color: "#53565A",
  fontSize: "13px",
  fontWeight: 700,
  margin: "12px 0",
};
const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "13px 14px",
  background: "#ECECE7",
  color: "#53565A",
  fontSize: "12px",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  borderBottom: "1px solid #D0D0CE",
  whiteSpace: "nowrap",
};
const tdStyle: CSSProperties = { padding: "13px 14px", borderBottom: "1px solid #ECECE7", color: "#000000", verticalAlign: "middle", fontSize: "13px", lineHeight: 1.45 };
const tdStrongStyle: CSSProperties = { ...tdStyle, fontWeight: 900, color: "#005670" };
const mutedTextStyle: CSSProperties = { color: "#53565A", fontSize: 12, marginTop: 4 };
const emptyBoxStyle: CSSProperties = { border: "1px dashed #D0D0CE", borderRadius: 12, padding: 16, color: "#53565A", background: "white" };

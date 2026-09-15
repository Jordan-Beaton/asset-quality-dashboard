"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import * as XLSX from "xlsx";
import { QualityPageHero } from "../../src/components/QualityPageHero";
import { imsBackLinkStyle } from "../../src/components/imsTheme";
import { supabase } from "../../src/lib/supabase";

export const dynamic = "force-dynamic";

const DEPARTMENTS = [
  "Assets",
  "Commercial",
  "Crewing",
  "Engineering",
  "Finance",
  "Human Resources",
  "Logistics",
  "Marketing",
  "Operations",
  "Procurement",
  "Project",
  "Quality",
  "Survey",
  "HSE",
  "HSEQ",
] as const;

type Department = (typeof DEPARTMENTS)[number];

type PersonRecord = {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  department: string | null;
  active: boolean;
  created_at: string | null;
};

type PersonForm = {
  name: string;
  email: string;
  role: string;
  department: Department | "";
  active: boolean;
};

type PeopleImportRow = {
  rowNumber: number;
  name: string;
  email: string;
  role: string;
  department: string;
  active: boolean;
  skipped: boolean;
  errors: string[];
  skipReasons: string[];
};

const emptyPersonForm: PersonForm = {
  name: "",
  email: "",
  role: "",
  department: "",
  active: true,
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusTone(active: boolean) {
  return active
    ? { bg: "#ECECE7", text: "#005670", border: "#ECECE7" }
    : { bg: "#ECECE7", text: "#F93822", border: "#ECECE7" };
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
  const entry = Object.entries(row).find(([key]) =>
    normalizedCandidates.includes(normalizeImportHeader(key))
  );
  const value = entry?.[1];
  return value === null || value === undefined ? "" : String(value).trim();
}

function normalizeImportedDepartment(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const matched = DEPARTMENTS.find((department) => department.toLowerCase() === trimmed.toLowerCase());
  return matched || "";
}

function normalizeImportedActive(value: string) {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return true;
  if (["false", "no", "n", "inactive", "0"].includes(trimmed)) return false;
  return true;
}

function PeoplePageContent() {
  const [people, setPeople] = useState<PersonRecord[]>([]);
  const [message, setMessage] = useState("Loading people...");
  const [lastRefreshed, setLastRefreshed] = useState("");
  const [newPerson, setNewPerson] = useState<PersonForm>(emptyPersonForm);
  const [detailForm, setDetailForm] = useState<PersonForm>(emptyPersonForm);
  const [departmentFilter, setDepartmentFilter] = useState<"" | Department>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [search, setSearch] = useState("");
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingDetail, setIsSavingDetail] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [importRows, setImportRows] = useState<PeopleImportRow[]>([]);
  const [isImportingPeople, setIsImportingPeople] = useState(false);

  useEffect(() => {
    void loadPeople();
  }, []);

  async function loadPeople() {
    const { data, error } = await supabase
      .from("people")
      .select("id,name,email,role,department,active,created_at")
      .order("name", { ascending: true });

    if (error) {
      setMessage(`Load failed: ${error.message}`);
      return;
    }

    setPeople((data || []) as PersonRecord[]);
    setLastRefreshed(new Date().toLocaleString("en-GB"));
    setMessage("People list loaded.");
  }

  const filteredPeople = useMemo(() => {
    return people.filter((person) => {
      const matchesDepartment = !departmentFilter || person.department === departmentFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && person.active) ||
        (statusFilter === "inactive" && !person.active);

      const searchText = search.trim().toLowerCase();
      const haystack = `${person.name} ${person.email || ""} ${person.role || ""}`.toLowerCase();
      const matchesSearch = !searchText || haystack.includes(searchText);

      return matchesDepartment && matchesStatus && matchesSearch;
    });
  }, [departmentFilter, people, search, statusFilter]);

  const selectedPerson = useMemo(
    () => people.find((person) => person.id === selectedPersonId) || null,
    [people, selectedPersonId]
  );

  const activeCount = people.filter((person) => person.active).length;
  const inactiveCount = people.length - activeCount;
  const departmentsRepresented = useMemo(() => {
    return new Set(people.map((person) => person.department).filter(Boolean)).size;
  }, [people]);
  const importableRows = importRows.filter((row) => !row.skipped && row.errors.length === 0);
  const skippedImportRows = importRows.filter((row) => row.skipped || row.errors.length > 0);

  async function handlePeopleImportFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImportRows([]);
    setMessage(`Reading ${file.name}...`);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        setMessage("Import failed: workbook does not contain any sheets.");
        return;
      }

      const sheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
        raw: true,
      });

      if (rows.length === 0) {
        setMessage("Import failed: first sheet has no data rows.");
        return;
      }

      const existingNames = new Set(people.map((person) => normalizeLookupValue(person.name)).filter(Boolean));
      const existingEmails = new Set(
        people.map((person) => normalizeLookupValue(person.email)).filter(Boolean)
      );
      const uploadNames = new Set<string>();
      const uploadEmails = new Set<string>();

      const parsedRows = rows.map((row, index): PeopleImportRow => {
        const name = getImportCell(row, ["Name", "Full Name", "Person"]);
        const email = getImportCell(row, ["Email", "Email Address"]);
        const role = getImportCell(row, ["Role", "Job Title", "Position"]);
        const department = normalizeImportedDepartment(getImportCell(row, ["Department"]));
        const active = normalizeImportedActive(getImportCell(row, ["Active", "Status"]));
        const normalizedName = normalizeLookupValue(name);
        const normalizedEmail = normalizeLookupValue(email);
        const errors: string[] = [];
        const skipReasons: string[] = [];

        if (!name) errors.push("Name is required.");

        if (normalizedName && existingNames.has(normalizedName)) {
          skipReasons.push("Duplicate name already exists.");
        }

        if (normalizedEmail && existingEmails.has(normalizedEmail)) {
          skipReasons.push("Duplicate email already exists.");
        }

        if (normalizedName && uploadNames.has(normalizedName)) {
          skipReasons.push("Duplicate name in uploaded file.");
        }

        if (normalizedEmail && uploadEmails.has(normalizedEmail)) {
          skipReasons.push("Duplicate email in uploaded file.");
        }

        if (normalizedName && !uploadNames.has(normalizedName)) uploadNames.add(normalizedName);
        if (normalizedEmail && !uploadEmails.has(normalizedEmail)) uploadEmails.add(normalizedEmail);

        return {
          rowNumber: index + 2,
          name,
          email,
          role,
          department,
          active,
          skipped: skipReasons.length > 0,
          errors,
          skipReasons,
        };
      });

      setImportRows(parsedRows);
      setMessage(
        `Preview ready: ${parsedRows.length} row${parsedRows.length === 1 ? "" : "s"} loaded from ${file.name}.`
      );
    } catch (error) {
      setMessage(`Import preview failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      event.target.value = "";
    }
  }

  async function importPreviewedPeople() {
    if (!importRows.length) {
      setMessage("Select an Excel file before importing.");
      return;
    }

    if (!importableRows.length) {
      setMessage("No valid new people rows are available to import.");
      return;
    }

    try {
      setIsImportingPeople(true);

      const insertRows = importableRows.map((row) => ({
        name: row.name.trim(),
        email: row.email.trim() || null,
        role: row.role.trim() || null,
        department: row.department || null,
        active: row.active,
      }));

      const { error } = await supabase.from("people").insert(insertRows);
      if (error) throw new Error(error.message);

      setMessage(
        `Imported ${insertRows.length} people record${insertRows.length === 1 ? "" : "s"} from ${importFileName}.`
      );
      setImportRows([]);
      setImportFileName("");
      await loadPeople();
    } catch (error) {
      const err = error as Error;
      setMessage(`Import failed: ${err.message}`);
    } finally {
      setIsImportingPeople(false);
    }
  }

  async function createPerson(e: React.FormEvent) {
    e.preventDefault();

    if (!newPerson.name.trim()) {
      setMessage("Name is required.");
      return;
    }

    try {
      setIsSaving(true);
      const { error } = await supabase.from("people").insert([
        {
          name: newPerson.name.trim(),
          email: newPerson.email.trim() || null,
          role: newPerson.role.trim() || null,
          department: newPerson.department || null,
          active: true,
        },
      ]);

      if (error) throw new Error(error.message);

      setNewPerson(emptyPersonForm);
      setIsAddingNew(false);
      setMessage("Person added.");
      await loadPeople();
    } catch (error) {
      const err = error as Error;
      setMessage(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function saveDetail() {
    if (!selectedPerson) return;

    if (!detailForm.name.trim()) {
      setMessage("Name is required.");
      return;
    }

    try {
      setIsSavingDetail(true);
      const { error } = await supabase
        .from("people")
        .update({
          name: detailForm.name.trim(),
          email: detailForm.email.trim() || null,
          role: detailForm.role.trim() || null,
          department: detailForm.department || null,
          active: detailForm.active,
        })
        .eq("id", selectedPerson.id);

      if (error) throw new Error(error.message);

      setMessage(`Updated ${detailForm.name.trim()}.`);
      await loadPeople();
    } catch (error) {
      const err = error as Error;
      setMessage(`Update failed: ${err.message}`);
    } finally {
      setIsSavingDetail(false);
    }
  }

  async function toggleSelectedPerson(active: boolean) {
    if (!selectedPerson) return;

    try {
      setIsToggling(true);
      const { error } = await supabase.from("people").update({ active }).eq("id", selectedPerson.id);
      if (error) throw new Error(error.message);

      setDetailForm((prev) => ({ ...prev, active }));
      setMessage(`${selectedPerson.name} marked as ${active ? "active" : "inactive"}.`);
      await loadPeople();
    } catch (error) {
      const err = error as Error;
      setMessage(`Status update failed: ${err.message}`);
    } finally {
      setIsToggling(false);
    }
  }

  async function deleteSelectedPerson() {
    if (!selectedPerson) return;

    const confirmed = window.confirm(
      `Delete ${selectedPerson.name} from the shared people directory? This removes the record from future selector lists.`
    );

    if (!confirmed) return;

    try {
      setIsDeleting(true);
      const { error } = await supabase.from("people").delete().eq("id", selectedPerson.id);
      if (error) throw new Error(error.message);

      setSelectedPersonId("");
      setDetailForm(emptyPersonForm);
      setMessage(`${selectedPerson.name} deleted.`);
      await loadPeople();
    } catch (error) {
      const err = error as Error;
      setMessage(`Delete failed: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <main>
      <QualityPageHero
        label="SYSTEM MANAGEMENT"
        title="People"
        description="Manage the shared people directory used across departments, while preserving inactive historic records and preparing future email-linked workflows."
      />

      <div className="ims-top-meta-row" style={topMetaRowStyle}>
        <Link href="/home" style={imsBackLinkStyle}>&larr; Back to IMS Home</Link>
        <div style={statusBannerStyle}>
          <strong>Status:</strong> {message}
        </div>
      </div>

      <div style={statsStripStyle}>
        <div style={statChipStyle}><strong>{people.length}</strong> total</div>
        <div style={statChipStyle}><strong>{activeCount}</strong> active</div>
        <div style={statChipStyle}><strong>{inactiveCount}</strong> inactive</div>
        <div style={statChipStyle}><strong>{departmentsRepresented}</strong> departments</div>
        {lastRefreshed ? <div style={statChipMutedStyle}>Refreshed {lastRefreshed}</div> : null}
      </div>

      <section style={stackedGridStyle}>
        <SectionCard
          title="Import People from Excel"
          subtitle="Bulk-create shared people records from the first worksheet while skipping duplicates and allowing blank departments."
        >
          <div style={importPanelStyle}>
            <Field label="Excel File">
              <input
                type="file"
                accept=".xlsx"
                style={inputStyle}
                onChange={(event) => void handlePeopleImportFileChange(event)}
              />
            </Field>

            <div style={importActionsStyle}>
              <button
                type="button"
                style={primaryButtonStyle}
                onClick={() => void importPreviewedPeople()}
                disabled={!importableRows.length || isImportingPeople}
              >
                {isImportingPeople ? "Importing..." : `Import ${importableRows.length} People`}
              </button>
              <button
                type="button"
                style={secondaryButtonStyle}
                onClick={() => {
                  setImportRows([]);
                  setImportFileName("");
                  setMessage("People import preview cleared.");
                }}
                disabled={!importRows.length}
              >
                Clear Preview
              </button>
            </div>
          </div>

          {importRows.length ? (
            <div style={importPreviewWrapStyle}>
              <div style={importSummaryStyle}>
                Previewing <strong>{importRows.length}</strong> row{importRows.length === 1 ? "" : "s"}
                {importFileName ? (
                  <>
                    {" "}
                    from <strong>{importFileName}</strong>
                  </>
                ) : null}
                . Ready to import: <strong>{importableRows.length}</strong>. Skipped/errors:{" "}
                <strong>{skippedImportRows.length}</strong>.
              </div>

              <div style={peopleImportTableWrapStyle}>
                <table style={peopleImportTableStyle}>
                  <thead>
                    <tr>
                      <th style={peopleRegisterHeaderCellStyle}>Row</th>
                      <th style={peopleRegisterHeaderCellStyle}>Name</th>
                      <th style={peopleRegisterHeaderCellStyle}>Email</th>
                      <th style={peopleRegisterHeaderCellStyle}>Role</th>
                      <th style={peopleRegisterHeaderCellStyle}>Department</th>
                      <th style={peopleRegisterHeaderCellStyle}>Active</th>
                      <th style={peopleRegisterHeaderCellStyle}>Import Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.map((row) => {
                      const messages = [...row.errors, ...row.skipReasons];
                      return (
                        <tr
                          key={`${row.rowNumber}-${row.name}-${row.email}`}
                          style={{
                            background: row.errors.length ? "#ECECE7" : row.skipped ? "#ECECE7" : "#ffffff",
                          }}
                        >
                          <td style={peopleRegisterCellStyle}>{row.rowNumber}</td>
                          <td style={peopleRegisterPrimaryCellStyle}>{row.name || "-"}</td>
                          <td style={peopleRegisterCellStyle}>{row.email || "-"}</td>
                          <td style={peopleRegisterCellStyle}>{row.role || "-"}</td>
                          <td style={peopleRegisterCellStyle}>{row.department || "-"}</td>
                          <td style={peopleRegisterCellStyle}>{row.active ? "Yes" : "No"}</td>
                          <td
                            style={{
                              ...peopleRegisterCellStyle,
                              color: row.errors.length ? "#F93822" : row.skipped ? "#000000" : "#005670",
                              fontWeight: 800,
                            }}
                          >
                            {messages.length ? messages.join(" ") : "Ready"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </SectionCard>

      </section>

      <div style={splitContainerStyle}>
        <div style={listPanelStyle}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={inputStyle}
            placeholder="Search name, email, or role"
          />

          <div style={filterChipsRowStyle}>
            {(["all", "active", "inactive"] as const).map((value) => (
              <button
                key={value}
                type="button"
                style={statusFilter === value ? filterChipActiveStyle : filterChipStyle}
                onClick={() => setStatusFilter(value)}
              >
                {value === "all" ? "All" : value === "active" ? "Active" : "Inactive"}
              </button>
            ))}
          </div>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value as "" | Department)}
            style={inputStyle}
          >
            <option value="">All departments</option>
            {DEPARTMENTS.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>

          {(search || departmentFilter || statusFilter !== "all") ? (
            <button
              type="button"
              style={secondaryButtonStyle}
              onClick={() => {
                setSearch("");
                setDepartmentFilter("");
                setStatusFilter("all");
              }}
            >
              Clear filters
            </button>
          ) : null}

          <button
            type="button"
            style={addPersonButtonStyle}
            onClick={() => {
              setIsAddingNew(true);
              setSelectedPersonId("");
            }}
          >
            + Add Person
          </button>

          <div style={listScrollStyle}>
            {filteredPeople.length === 0 ? (
              <div style={emptyStateStyle}>No people match the current filters.</div>
            ) : (
              filteredPeople.map((person) => {
                const selected = selectedPersonId === person.id;
                return (
                  <button
                    key={person.id}
                    type="button"
                    style={selected ? personRowSelectedStyle : personRowStyle}
                    onClick={() => {
                      setIsAddingNew(false);
                      setSelectedPersonId(person.id);
                      setDetailForm({
                        name: person.name,
                        email: person.email || "",
                        role: person.role || "",
                        department: (person.department as Department) || "",
                        active: person.active,
                      });
                    }}
                  >
                    <span style={{ ...statusDotStyle, background: person.active ? "#005670" : "#53565A" }} />
                    <span style={personRowInfoStyle}>
                      <span style={personRowNameStyle}>{person.name}</span>
                      <span style={personRowMetaStyle}>{person.department || "No department"} &middot; {person.role || "No role"}</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div style={isAddingNew || selectedPerson ? detailPanelPersistentStyle : detailPanelEmptyStyle}>
          {isAddingNew ? (
            <form onSubmit={createPerson} style={{ display: "grid", gap: "16px" }}>
              <div style={detailHeaderRowStyle}>
                <div>
                  <span style={detailKickerStyle}>New Record</span>
                  <h2 style={detailTitleStyle}>Add Person</h2>
                </div>
                <button type="button" style={secondaryButtonStyle} onClick={() => setIsAddingNew(false)}>
                  Cancel
                </button>
              </div>
              <p style={helperTextStyle}>
                Create shared people records for department-wide reuse across actions, audits, assets, calibration, inspection, maintenance, and future reviewer workflows.
              </p>
              <PersonFormFields
                form={newPerson}
                onChange={(changes) => setNewPerson((prev) => ({ ...prev, ...changes }))}
              />
              <div style={detailFooterBarStyle}>
                <div style={helperTextStyle}>New people are created as Active.</div>
                <button type="submit" style={primaryButtonStyle} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Add Person"}
                </button>
              </div>
            </form>
          ) : selectedPerson ? (
            <div style={{ display: "grid", gap: "16px" }}>
              <div style={detailHeaderRowStyle}>
                <div>
                  <span style={detailKickerStyle}>Person Detail</span>
                  <h2 style={detailTitleStyle}>{selectedPerson.name}</h2>
                </div>
                <span
                  style={{
                    ...pillStyle,
                    background: statusTone(selectedPerson.active).bg,
                    color: statusTone(selectedPerson.active).text,
                  }}
                >
                  {selectedPerson.active ? "Active" : "Inactive"}
                </span>
              </div>

              <PersonFormFields
                form={detailForm}
                onChange={(changes) => setDetailForm((prev) => ({ ...prev, ...changes }))}
              />

              <div style={detailFooterBarStyle}>
                <div style={helperTextStyle}>
                  Created {formatDateTime(selectedPerson.created_at)}. Shared people records stay reusable across modules while inactive people remain visible on historical records.
                </div>
                <div style={buttonRowStyleTight}>
                  <button
                    type="button"
                    style={detailForm.active ? dangerButtonStyle : miniButtonStyle}
                    onClick={() => void toggleSelectedPerson(!detailForm.active)}
                    disabled={isToggling}
                  >
                    {isToggling ? "Updating..." : detailForm.active ? "Deactivate" : "Reactivate"}
                  </button>
                  <button
                    type="button"
                    style={deleteButtonStyle}
                    onClick={() => void deleteSelectedPerson()}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Delete Person"}
                  </button>
                  <button
                    type="button"
                    style={primaryButtonStyle}
                    onClick={() => void saveDetail()}
                    disabled={isSavingDetail}
                  >
                    {isSavingDetail ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={emptyDetailContentStyle}>Select a person from the list, or add a new one.</div>
          )}
        </div>
      </div>
    </main>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
  id,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} style={panelStyle}>
      <div style={sectionHeaderRowStyle}>
        <div>
          <h2 style={sectionTitleStyle}>{title}</h2>
          {subtitle ? <p style={sectionSubtitleStyle}>{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={fieldWrapStyle}>
      <span style={fieldLabelStyle}>{label}</span>
      {children}
    </div>
  );
}

function PersonFormFields({
  form,
  onChange,
}: {
  form: PersonForm;
  onChange: (changes: Partial<PersonForm>) => void;
}) {
  return (
    <div style={formGridStyle}>
      <Field label="Name">
        <input value={form.name} onChange={(e) => onChange({ name: e.target.value })} style={inputStyle} placeholder="Full name" />
      </Field>

      <Field label="Email">
        <input
          type="email"
          value={form.email}
          onChange={(e) => onChange({ email: e.target.value })}
          style={inputStyle}
          placeholder="Email address"
        />
      </Field>

      <Field label="Role">
        <input
          value={form.role}
          onChange={(e) => onChange({ role: e.target.value })}
          style={inputStyle}
          placeholder="Role (optional)"
        />
      </Field>

      <Field label="Department">
        <select
          value={form.department}
          onChange={(e) => onChange({ department: e.target.value as Department | "" })}
          style={inputStyle}
        >
          <option value="">Select department</option>
          {DEPARTMENTS.map((department) => (
            <option key={department} value={department}>
              {department}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}

export default function PeoplePage() {
  return (
    <Suspense fallback={<main style={{ padding: "24px" }}>Loading people...</main>}>
      <PeoplePageContent />
    </Suspense>
  );
}

const topMetaRowStyle: CSSProperties = {
  marginBottom: 20,
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "center",
  background: "rgba(255,255,255,0.92)",
  border: "1px solid #D0D0CE",
  borderRadius: "16px",
  padding: "12px 14px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
};

const statusBannerStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #D0D0CE",
  color: "#000000",
  padding: "10px 14px",
  borderRadius: "14px",
  fontSize: "14px",
};

const stackedGridStyle: CSSProperties = {
  display: "grid",
  gap: "20px",
};

const statsStripStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginBottom: "20px",
};

const statChipStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #D0D0CE",
  borderRadius: "999px",
  padding: "7px 14px",
  fontSize: "13px",
  color: "#53565A",
};

const statChipMutedStyle: CSSProperties = {
  ...statChipStyle,
  background: "#ECECE7",
  border: "1px solid #ECECE7",
  fontSize: "12px",
};

const splitContainerStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "360px minmax(0, 1fr)",
  gap: "18px",
  alignItems: "start",
};

const listPanelStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #D0D0CE",
  borderRadius: "18px",
  padding: "16px",
  display: "grid",
  gap: "10px",
  boxShadow: "0 14px 28px rgba(15, 23, 42, 0.06)",
};

const filterChipsRowStyle: CSSProperties = {
  display: "flex",
  gap: "6px",
};

const filterChipStyle: CSSProperties = {
  flex: 1,
  border: "1px solid #D0D0CE",
  background: "#ECECE7",
  borderRadius: "8px",
  padding: "7px 8px",
  fontSize: "12px",
  fontWeight: 700,
  color: "#53565A",
  cursor: "pointer",
};

const filterChipActiveStyle: CSSProperties = {
  ...filterChipStyle,
  background: "#005670",
  color: "#ffffff",
  border: "1px solid #005670",
};

const addPersonButtonStyle: CSSProperties = {
  background: "#005670",
  color: "#ffffff",
  border: "none",
  borderRadius: "10px",
  padding: "10px 12px",
  fontWeight: 800,
  fontSize: "13px",
  cursor: "pointer",
  width: "100%",
};

const listScrollStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  maxHeight: "620px",
  overflowY: "auto",
  borderTop: "1px solid #ECECE7",
};

const personRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "10px 8px",
  borderBottom: "1px solid #ECECE7",
  borderLeft: "3px solid transparent",
  background: "none",
  border: "none",
  borderBottomWidth: "1px",
  cursor: "pointer",
  textAlign: "left",
  width: "100%",
};

const personRowSelectedStyle: CSSProperties = {
  ...personRowStyle,
  background: "#ECECE7",
  borderLeft: "3px solid #005670",
};

const statusDotStyle: CSSProperties = {
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  flexShrink: 0,
};

const personRowInfoStyle: CSSProperties = {
  minWidth: 0,
  display: "grid",
  gap: "2px",
};

const personRowNameStyle: CSSProperties = {
  fontWeight: 700,
  fontSize: "13.5px",
  color: "#000000",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const personRowMetaStyle: CSSProperties = {
  fontSize: "11.5px",
  color: "#53565A",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const detailPanelPersistentStyle: CSSProperties = {
  background: "linear-gradient(180deg, #ffffff 0%, #ECECE7 100%)",
  border: "1px solid #D0D0CE",
  borderRadius: "18px",
  padding: "22px",
  minHeight: "620px",
};

const detailPanelEmptyStyle: CSSProperties = {
  ...detailPanelPersistentStyle,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const detailHeaderRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
};

const detailKickerStyle: CSSProperties = {
  color: "#005670",
  fontSize: "11px",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: ".08em",
};

const detailTitleStyle: CSSProperties = {
  margin: "4px 0 0",
  color: "#000000",
  fontSize: "20px",
};

const emptyDetailContentStyle: CSSProperties = {
  color: "#53565A",
  fontSize: "13.5px",
  textAlign: "center",
};

const panelStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: "18px",
  border: "1px solid #D0D0CE",
  boxShadow: "0 14px 28px rgba(15, 23, 42, 0.06)",
  padding: "22px",
};

const sectionHeaderRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
  marginBottom: "18px",
  flexWrap: "wrap",
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "20px",
  color: "#000000",
};

const sectionSubtitleStyle: CSSProperties = {
  margin: "6px 0 0",
  color: "#53565A",
  fontSize: "14px",
  lineHeight: 1.55,
};

const formGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "12px",
};

const fieldWrapStyle: CSSProperties = {
  display: "grid",
  gap: "6px",
};

const fieldLabelStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 700,
  color: "#53565A",
};

const inputStyle: CSSProperties = {
  width: "100%",
  height: "46px",
  borderRadius: "10px",
  border: "1px solid #D0D0CE",
  padding: "10px 12px",
  fontSize: "14px",
  background: "#ffffff",
  color: "#000000",
  boxSizing: "border-box",
};

const readOnlyInputStyle: CSSProperties = {
  ...inputStyle,
  background: "#ECECE7",
  color: "#53565A",
};

const buttonRowStyle: CSSProperties = {
  marginTop: "14px",
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
  alignItems: "center",
};

const buttonRowStyleTight: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  alignItems: "center",
};

const primaryButtonStyle: CSSProperties = {
  background: "#005670",
  color: "#ffffff",
  border: "none",
  borderRadius: "10px",
  padding: "10px 16px",
  fontWeight: 800,
  fontSize: "13px",
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  background: "#D0D0CE",
  color: "#000000",
  border: "none",
  borderRadius: "10px",
  padding: "9px 12px",
  fontWeight: 700,
  fontSize: "12px",
  cursor: "pointer",
};

const miniButtonStyle: CSSProperties = {
  background: "#005670",
  color: "#ffffff",
  border: "none",
  borderRadius: "10px",
  padding: "9px 12px",
  fontWeight: 700,
  fontSize: "12px",
  cursor: "pointer",
};

const dangerButtonStyle: CSSProperties = {
  background: "#ECECE7",
  color: "#F93822",
  border: "1px solid #ECECE7",
  borderRadius: "10px",
  padding: "9px 12px",
  fontWeight: 700,
  fontSize: "12px",
  cursor: "pointer",
};

const deleteButtonStyle: CSSProperties = {
  background: "#F93822",
  color: "#ffffff",
  border: "1px solid #F93822",
  borderRadius: "10px",
  padding: "9px 12px",
  fontWeight: 700,
  fontSize: "12px",
  cursor: "pointer",
};

const importPanelStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: "16px",
  alignItems: "end",
};

const importActionsStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const importPreviewWrapStyle: CSSProperties = {
  marginTop: "18px",
};

const importSummaryStyle: CSSProperties = {
  marginBottom: "12px",
  color: "#53565A",
  fontSize: "14px",
};

const peopleImportTableWrapStyle: CSSProperties = {
  overflowX: "auto",
  border: "1px solid #D0D0CE",
  borderRadius: "14px",
  background: "#ffffff",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
};

const peopleImportTableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  background: "#ffffff",
  minWidth: 960,
  fontSize: "13px",
};

const peopleRegisterHeaderCellStyle: CSSProperties = {
  padding: "12px 14px",
  fontSize: "12px",
  fontWeight: 800,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "#53565A",
  background: "#ECECE7",
  borderBottom: "1px solid #D0D0CE",
  textAlign: "left",
  whiteSpace: "nowrap",
};

const peopleRegisterPrimaryCellStyle: CSSProperties = {
  padding: "14px",
  fontSize: "14px",
  fontWeight: 800,
  color: "#000000",
  borderBottom: "1px solid #ECECE7",
  verticalAlign: "middle",
  whiteSpace: "nowrap",
};

const peopleRegisterCellStyle: CSSProperties = {
  padding: "14px",
  color: "#53565A",
  fontSize: "13px",
  borderBottom: "1px solid #ECECE7",
  verticalAlign: "middle",
};

const pillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "12px",
  fontWeight: 700,
};

const detailFooterBarStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  alignItems: "center",
  borderTop: "1px solid #D0D0CE",
  paddingTop: "16px",
};

const helperTextStyle: CSSProperties = {
  fontSize: "13px",
  color: "#53565A",
  lineHeight: 1.5,
};

const emptyStateStyle: CSSProperties = {
  borderRadius: "14px",
  border: "1px dashed #D0D0CE",
  background: "#ECECE7",
  color: "#53565A",
  padding: "18px",
  fontSize: "14px",
};

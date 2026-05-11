"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { QualityPageHero } from "../../src/components/QualityPageHero";
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
  "Survey",
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
  department: Department;
  active: boolean;
};

const emptyPersonForm: PersonForm = {
  name: "",
  email: "",
  role: "",
  department: "Assets",
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
    ? { bg: "#dcfce7", text: "#166534", border: "#bbf7d0" }
    : { bg: "#fee2e2", text: "#991b1b", border: "#fecaca" };
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
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingDetail, setIsSavingDetail] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
  const latestPerson = people[0] || null;

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
          department: newPerson.department,
          active: true,
        },
      ]);

      if (error) throw new Error(error.message);

      setNewPerson(emptyPersonForm);
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
          department: detailForm.department,
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
        contextCards={[
          { label: "Last Refreshed", value: lastRefreshed || "-" },
          { label: "Active People", value: activeCount },
          { label: "Inactive People", value: inactiveCount },
          { label: "Latest Person", value: latestPerson?.name || "No people yet" },
        ]}
      />

      <div style={topMetaRowStyle}>
        <div style={statusBannerStyle}>
          <strong>Status:</strong> {message}
        </div>
      </div>

      <section style={stackedGridStyle}>
        <SectionCard
          title="Add Person"
          subtitle="Create shared people records for department-wide reuse across actions, audits, assets, calibration, inspection, maintenance, and future reviewer workflows."
        >
          <form onSubmit={createPerson}>
            <div style={formGridStyle}>
              <Field label="Name">
                <input
                  value={newPerson.name}
                  onChange={(e) => setNewPerson((prev) => ({ ...prev, name: e.target.value }))}
                  style={inputStyle}
                  placeholder="Full name"
                />
              </Field>

              <Field label="Email">
                <input
                  type="email"
                  value={newPerson.email}
                  onChange={(e) => setNewPerson((prev) => ({ ...prev, email: e.target.value }))}
                  style={inputStyle}
                  placeholder="Email address"
                />
              </Field>

              <Field label="Role">
                <input
                  value={newPerson.role}
                  onChange={(e) => setNewPerson((prev) => ({ ...prev, role: e.target.value }))}
                  style={inputStyle}
                  placeholder="Role (optional)"
                />
              </Field>

              <Field label="Department">
                <select
                  value={newPerson.department}
                  onChange={(e) =>
                    setNewPerson((prev) => ({
                      ...prev,
                      department: e.target.value as Department,
                    }))
                  }
                  style={inputStyle}
                >
                  {DEPARTMENTS.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Status">
                <input value="Active on save" readOnly style={readOnlyInputStyle} />
              </Field>
            </div>

            <div style={buttonRowStyle}>
              <button type="submit" style={primaryButtonStyle} disabled={isSaving}>
                {isSaving ? "Saving..." : "Add Person"}
              </button>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title="People Register"
          subtitle="Filter the full people directory by department, status, and text search while keeping inactive records available for historical traceability."
        >
          <div style={filterGridStyle}>
            <Field label="Search">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={inputStyle}
                placeholder="Search name, email, or role"
              />
            </Field>

            <Field label="Department Filter">
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
            </Field>

            <Field label="Status Filter">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
                style={inputStyle}
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
          </div>

          <div style={buttonRowStyle}>
            <button
              type="button"
              style={secondaryButtonStyle}
              onClick={() => {
                setSearch("");
                setDepartmentFilter("");
                setStatusFilter("all");
              }}
            >
              Clear Filters
            </button>
          </div>

          <div style={registerListStyle}>
            {filteredPeople.length === 0 ? (
              <div style={emptyStateStyle}>No people match the current filters.</div>
            ) : (
              filteredPeople.map((person) => {
                const tone = statusTone(person.active);
                const selected = selectedPersonId === person.id;

                return (
                  <div
                    key={person.id}
                    style={{
                      ...registerCardStyle,
                      cursor: "pointer",
                      borderColor: selected ? "#93c5fd" : "#dbe7f3",
                      boxShadow: selected ? "0 0 0 2px rgba(37,99,235,0.15)" : "none",
                    }}
                    onClick={() => {
                      setSelectedPersonId(person.id);
                      setDetailForm({
                        name: person.name,
                        email: person.email || "",
                        role: person.role || "",
                        department: (person.department as Department) || "Assets",
                        active: person.active,
                      });
                    }}
                  >
                    <div style={registerHeaderStyle}>
                      <div>
                        <div style={registerTitleStyle}>{person.name}</div>
                        <div style={registerMetaStyle}>{person.email || "No email set"}</div>
                      </div>
                      <span
                        style={{
                          ...pillStyle,
                          background: tone.bg,
                          color: tone.text,
                          border: `1px solid ${tone.border}`,
                        }}
                      >
                        {person.active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div style={registerTableStyle}>
                      <div><strong>Role</strong></div>
                      <div><strong>Department</strong></div>
                      <div><strong>Created</strong></div>
                      <div>{person.role || "-"}</div>
                      <div>{person.department || "-"}</div>
                      <div>{formatDateTime(person.created_at)}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SectionCard>

        <SectionCard
          title={selectedPerson ? `Person Detail - ${selectedPerson.name}` : "Person Detail"}
          subtitle={
            selectedPerson
              ? "Edit the selected shared person record or change active status without deleting historic references."
              : "Click a person in the register to open the full detail and edit panel."
          }
        >
          {!selectedPerson ? (
            <div style={emptyStateStyle}>No person selected.</div>
          ) : (
            <div style={detailPanelStyle}>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  style={secondaryButtonStyle}
                  onClick={() => {
                    setSelectedPersonId("");
                    setDetailForm(emptyPersonForm);
                  }}
                >
                  Hide Panel
                </button>
              </div>

              <div style={detailSummaryRowStyle}>
                <SummaryTile label="Name" value={selectedPerson.name} />
                <SummaryTile label="Department" value={selectedPerson.department || "-"} />
                <SummaryTile label="Status" value={selectedPerson.active ? "Active" : "Inactive"} />
                <SummaryTile label="Created" value={formatDateTime(selectedPerson.created_at)} />
              </div>

              <div style={formGridStyle}>
                <Field label="Name">
                  <input
                    value={detailForm.name}
                    onChange={(e) => setDetailForm((prev) => ({ ...prev, name: e.target.value }))}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Email">
                  <input
                    type="email"
                    value={detailForm.email}
                    onChange={(e) => setDetailForm((prev) => ({ ...prev, email: e.target.value }))}
                    style={inputStyle}
                    placeholder="Email address"
                  />
                </Field>

                <Field label="Role">
                  <input
                    value={detailForm.role}
                    onChange={(e) => setDetailForm((prev) => ({ ...prev, role: e.target.value }))}
                    style={inputStyle}
                    placeholder="Role (optional)"
                  />
                </Field>

                <Field label="Department">
                  <select
                    value={detailForm.department}
                    onChange={(e) =>
                      setDetailForm((prev) => ({
                        ...prev,
                        department: e.target.value as Department,
                      }))
                    }
                    style={inputStyle}
                  >
                    {DEPARTMENTS.map((department) => (
                      <option key={department} value={department}>
                        {department}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Status">
                  <input value={detailForm.active ? "Active" : "Inactive"} readOnly style={readOnlyInputStyle} />
                </Field>
              </div>

              <div style={detailFooterBarStyle}>
                <div style={helperTextStyle}>
                  Shared people records stay reusable across modules while inactive people remain visible on historical records.
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
          )}
        </SectionCard>
      </section>
    </main>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section style={panelStyle}>
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

function SummaryTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={summaryTileStyle}>
      <div style={summaryTileLabelStyle}>{label}</div>
      <div style={summaryTileValueStyle}>{value}</div>
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
  marginBottom: "20px",
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  alignItems: "center",
};

const statusBannerStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe7f3",
  color: "#0f172a",
  padding: "10px 14px",
  borderRadius: "14px",
  fontSize: "14px",
};

const stackedGridStyle: CSSProperties = {
  display: "grid",
  gap: "20px",
};

const panelStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: "18px",
  border: "1px solid #dbe7f3",
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
  color: "#0f172a",
};

const sectionSubtitleStyle: CSSProperties = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: "14px",
  lineHeight: 1.55,
};

const formGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "12px",
};

const filterGridStyle: CSSProperties = {
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
  color: "#475569",
};

const inputStyle: CSSProperties = {
  width: "100%",
  height: "46px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  padding: "10px 12px",
  fontSize: "14px",
  background: "#ffffff",
  color: "#0f172a",
  boxSizing: "border-box",
};

const readOnlyInputStyle: CSSProperties = {
  ...inputStyle,
  background: "#f8fafc",
  color: "#334155",
  fontWeight: 700,
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
  background: "#2563eb",
  color: "#ffffff",
  border: "none",
  borderRadius: "10px",
  padding: "10px 16px",
  fontWeight: 800,
  fontSize: "13px",
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  background: "#e2e8f0",
  color: "#0f172a",
  border: "none",
  borderRadius: "10px",
  padding: "9px 12px",
  fontWeight: 700,
  fontSize: "12px",
  cursor: "pointer",
};

const miniButtonStyle: CSSProperties = {
  background: "#0f766e",
  color: "#ffffff",
  border: "none",
  borderRadius: "10px",
  padding: "9px 12px",
  fontWeight: 700,
  fontSize: "12px",
  cursor: "pointer",
};

const dangerButtonStyle: CSSProperties = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  borderRadius: "10px",
  padding: "9px 12px",
  fontWeight: 700,
  fontSize: "12px",
  cursor: "pointer",
};

const deleteButtonStyle: CSSProperties = {
  background: "#dc2626",
  color: "#ffffff",
  border: "1px solid #b91c1c",
  borderRadius: "10px",
  padding: "9px 12px",
  fontWeight: 700,
  fontSize: "12px",
  cursor: "pointer",
};

const registerListStyle: CSSProperties = {
  display: "grid",
  gap: "14px",
  marginTop: "18px",
};

const registerCardStyle: CSSProperties = {
  borderRadius: "16px",
  border: "1px solid #dbe7f3",
  background: "#f8fafc",
  padding: "16px",
  display: "grid",
  gap: "12px",
};

const registerHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  alignItems: "flex-start",
};

const registerTitleStyle: CSSProperties = {
  fontSize: "15px",
  fontWeight: 800,
  color: "#0f172a",
};

const registerMetaStyle: CSSProperties = {
  marginTop: "4px",
  fontSize: "13px",
  color: "#64748b",
  lineHeight: 1.5,
};

const registerTableStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "8px 16px",
  color: "#334155",
  fontSize: "14px",
  alignItems: "start",
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

const detailPanelStyle: CSSProperties = {
  display: "grid",
  gap: "18px",
};

const detailSummaryRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
};

const summaryTileStyle: CSSProperties = {
  borderRadius: "14px",
  border: "1px solid #dbe7f3",
  background: "#f8fafc",
  padding: "14px 16px",
  minHeight: "96px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
};

const summaryTileLabelStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "#64748b",
  marginBottom: "6px",
};

const summaryTileValueStyle: CSSProperties = {
  fontSize: "16px",
  fontWeight: 800,
  color: "#0f172a",
  wordBreak: "break-word",
};

const detailFooterBarStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  alignItems: "center",
  borderTop: "1px solid #e2e8f0",
  paddingTop: "16px",
};

const helperTextStyle: CSSProperties = {
  fontSize: "13px",
  color: "#64748b",
  lineHeight: 1.5,
};

const emptyStateStyle: CSSProperties = {
  borderRadius: "14px",
  border: "1px dashed #cbd5e1",
  background: "#f8fafc",
  color: "#64748b",
  padding: "18px",
  fontSize: "14px",
};

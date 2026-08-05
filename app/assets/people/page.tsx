"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useImsPermissions } from "../../../src/components/ImsPermissions";
import { ImsButton, ImsFilterPanel, ImsPanel, ImsTopMetaRow } from "../../../src/components/ImsPrimitives";
import { QualityPageHero } from "../../../src/components/QualityPageHero";
import {
  imsInputStyle,
  imsTableCellStyle,
  imsTableHeadStyle,
  imsTableInfoRowStyle,
  imsTableStyle,
} from "../../../src/components/imsTheme";
import { supabase } from "../../../src/lib/supabase";

export const dynamic = "force-dynamic";

type AssetPerson = {
  id: string;
  name: string;
  role: string | null;
  department: string | null;
  active: boolean;
  created_at: string | null;
};

type PersonForm = {
  name: string;
  role: string;
  active: boolean;
};

const emptyPersonForm: PersonForm = {
  name: "",
  role: "",
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
    : { bg: "#fee2e2", text: "#F93822", border: "#fecaca" };
}

function PeoplePageContent() {
  const imsPermissions = useImsPermissions();
  const [people, setPeople] = useState<AssetPerson[]>([]);
  const [message, setMessage] = useState("Loading people...");
  const [lastRefreshed, setLastRefreshed] = useState("");
  const [newPerson, setNewPerson] = useState<PersonForm>(emptyPersonForm);
  const [detailForm, setDetailForm] = useState<PersonForm>(emptyPersonForm);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [search, setSearch] = useState("");
  const [showRegisterFilters, setShowRegisterFilters] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingDetail, setIsSavingDetail] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    void loadPeople();
  }, []);

  async function loadPeople() {
    const { data, error } = await supabase
      .from("people")
      .select("id,name,role,department,active,created_at")
      .eq("department", "Assets")
      .order("name", { ascending: true });

    if (error) {
      setMessage(`Load failed: ${error.message}`);
      return;
    }

    setPeople((data || []) as AssetPerson[]);
    setLastRefreshed(new Date().toLocaleString("en-GB"));
    setMessage("People list loaded.");
  }

  const filteredPeople = useMemo(() => {
    return people.filter((person) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && person.active) ||
        (statusFilter === "inactive" && !person.active);

      const searchText = search.trim().toLowerCase();
      const haystack = `${person.name} ${person.role || ""}`.toLowerCase();
      const matchesSearch = !searchText || haystack.includes(searchText);

      return matchesStatus && matchesSearch;
    });
  }, [people, search, statusFilter]);

  const selectedPerson = useMemo(
    () => people.find((person) => person.id === selectedPersonId) || null,
    [people, selectedPersonId]
  );

  const activeCount = people.filter((person) => person.active).length;
  const inactiveCount = people.length - activeCount;
  const latestPerson = people[0] || null;

  function hasCreateAccess() {
    return imsPermissions.loaded && (imsPermissions.isMasterAdmin || imsPermissions.fullAccess || imsPermissions.canCreate);
  }

  function hasEditAccess() {
    return imsPermissions.loaded && (imsPermissions.isMasterAdmin || imsPermissions.fullAccess || imsPermissions.canEdit);
  }

  function requireCreateAccess(actionLabel: string) {
    if (hasCreateAccess()) return true;
    setMessage(`Permission required: create access is needed to ${actionLabel}.`);
    return false;
  }

  function requireEditAccess(actionLabel: string) {
    if (hasEditAccess()) return true;
    setMessage(`Permission required: edit access is needed to ${actionLabel}.`);
    return false;
  }

  async function createPerson(e: React.FormEvent) {
    e.preventDefault();

    if (!requireCreateAccess("add Asset people")) return;

    if (!newPerson.name.trim()) {
      setMessage("Name is required.");
      return;
    }

    try {
      setIsSaving(true);
      const { error } = await supabase.from("people").insert([
        {
          name: newPerson.name.trim(),
          role: newPerson.role.trim() || null,
          department: "Assets",
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
    if (!requireEditAccess("update Asset people")) return;

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
          role: detailForm.role.trim() || null,
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
    if (!requireEditAccess("change Asset people status")) return;

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

  return (
    <main>
      <QualityPageHero
        label="ASSET MANAGEMENT"
        title="People"
        description="Manage the active and historic people list used across asset ownership, calibration, inspection, maintenance, and future asset action workflows."
        contextCards={[
          { label: "Last Refreshed", value: lastRefreshed || "-" },
          { label: "Active People", value: activeCount },
          { label: "Inactive People", value: inactiveCount },
          { label: "Latest Person", value: latestPerson?.name || "No people yet" },
        ]}
      />

      <ImsTopMetaRow
        backHref="/assets"
        backLabel="Back to Assets"
        status={<><strong>Status:</strong> {message}</>}
      />

      <section style={stackedGridStyle}>
        <SectionCard
          title="Add Person"
          subtitle="Keep the asset people list current so active people appear in dropdowns, while inactive people remain preserved on historical records."
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

              <Field label="Role">
                <input
                  value={newPerson.role}
                  onChange={(e) => setNewPerson((prev) => ({ ...prev, role: e.target.value }))}
                  style={inputStyle}
                  placeholder="Role (optional)"
                />
              </Field>

              <Field label="Status">
                <input value="Active on save" readOnly style={readOnlyInputStyle} />
              </Field>
            </div>

            <div style={buttonRowStyle}>
              <button type="submit" style={primaryButtonStyle} disabled={isSaving || !hasCreateAccess()}>
                {isSaving ? "Saving..." : "Add Person"}
              </button>
            </div>
          </form>
        </SectionCard>

        <ImsPanel
          title="People Register"
          subtitle="Review active and inactive people, with inactive records retained so historic asset records still show the correct names."
        >
          <ImsFilterPanel
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search name or role"
            showFilters={showRegisterFilters}
            onToggleFilters={() => setShowRegisterFilters((current) => !current)}
            actions={
              <ImsButton
                variant="secondary"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
              >
                Clear Filters
              </ImsButton>
            }
          >
            <Field label="Status Filter">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
                style={imsInputStyle}
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
          </ImsFilterPanel>

          <div style={imsTableInfoRowStyle}>Showing <strong>{filteredPeople.length}</strong> of <strong>{people.length}</strong> Asset people</div>

          <div style={compactTableWrapStyle}>
            <table style={{ ...imsTableStyle, minWidth: 760 }}>
              <thead>
                <tr>
                  <th style={imsTableHeadStyle}>Name</th>
                  <th style={imsTableHeadStyle}>Role</th>
                  <th style={imsTableHeadStyle}>Status</th>
                  <th style={imsTableHeadStyle}>Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredPeople.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={emptyTableCellStyle}>No people match the current filters.</td>
                  </tr>
                ) : (
                  filteredPeople.map((person) => {
                    const tone = statusTone(person.active);
                    const selected = selectedPersonId === person.id;

                    return (
                      <tr
                        key={person.id}
                        style={selected ? selectedTableRowStyle : registerTableRowStyle}
                        onClick={() => {
                          setSelectedPersonId(person.id);
                          setDetailForm({
                            name: person.name,
                            role: person.role || "",
                            active: person.active,
                          });
                        }}
                      >
                        <td style={{ ...imsTableCellStyle, fontWeight: 900, color: "#005670" }}>{person.name}</td>
                        <td style={imsTableCellStyle}>{person.role || "No role set"}</td>
                        <td style={imsTableCellStyle}>
                          <span style={{ ...pillStyle, background: tone.bg, color: tone.text, border: `1px solid ${tone.border}` }}>
                            {person.active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td style={imsTableCellStyle}>{formatDateTime(person.created_at)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </ImsPanel>

        <SectionCard
          title={selectedPerson ? `Person Detail - ${selectedPerson.name}` : "Person Detail"}
          subtitle={
            selectedPerson
              ? "Edit person details or change active status without deleting records needed for historical asset activity."
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

                <Field label="Role">
                  <input
                    value={detailForm.role}
                    onChange={(e) => setDetailForm((prev) => ({ ...prev, role: e.target.value }))}
                    style={inputStyle}
                    placeholder="Role (optional)"
                  />
                </Field>

                <Field label="Status">
                  <input value={detailForm.active ? "Active" : "Inactive"} readOnly style={readOnlyInputStyle} />
                </Field>
              </div>

              <div style={detailFooterBarStyle}>
                <div style={helperTextStyle}>
                  Active people remain selectable in new asset forms. Inactive people remain visible on historic records.
                </div>
                <div style={buttonRowStyleTight}>
                  <button
                    type="button"
                    style={detailForm.active ? dangerButtonStyle : miniButtonStyle}
                    onClick={() => void toggleSelectedPerson(!detailForm.active)}
                    disabled={isToggling || !hasEditAccess()}
                  >
                    {isToggling ? "Updating..." : detailForm.active ? "Deactivate" : "Reactivate"}
                  </button>
                  <button
                    type="button"
                    style={primaryButtonStyle}
                    onClick={() => void saveDetail()}
                    disabled={isSavingDetail || !hasEditAccess()}
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

export default function AssetPeoplePage() {
  return (
    <Suspense fallback={<main style={{ padding: "24px" }}>Loading people...</main>}>
      <PeoplePageContent />
    </Suspense>
  );
}

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
  background: "#fee2e2",
  color: "#F93822",
  border: "1px solid #fecaca",
  borderRadius: "10px",
  padding: "9px 12px",
  fontWeight: 700,
  fontSize: "12px",
  cursor: "pointer",
};

const compactTableWrapStyle: CSSProperties = {
  overflowX: "auto",
  border: "1px solid #dbe3ef",
  borderRadius: "16px",
  background: "#ffffff",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
};

const registerTableRowStyle: CSSProperties = {
  cursor: "pointer",
};

const selectedTableRowStyle: CSSProperties = {
  cursor: "pointer",
  background: "#eff6ff",
  boxShadow: "inset 4px 0 0 #005670",
};

const emptyTableCellStyle: CSSProperties = {
  padding: "26px 14px",
  textAlign: "center",
  color: "#64748b",
  background: "#f8fafc",
  borderBottom: "1px dashed #cbd5e1",
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
  border: "1px solid #dbe3ef",
  borderRadius: "18px",
  padding: "18px",
  background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
  width: "100%",
  boxSizing: "border-box",
  minWidth: 0,
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

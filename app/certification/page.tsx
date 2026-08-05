"use client";

import { useEffect, useMemo, useState } from "react";
import { QualityKpiCard } from "../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../src/components/QualityPageHero";
import {
  ImsButton,
  ImsFilterPanel,
  ImsPanel,
  ImsTabs,
  ImsTopMetaRow,
} from "../../src/components/ImsPrimitives";
import {
  imsButtonBaseStyle,
  imsInputStyle,
  imsTableCellStyle,
  imsTableHeadStyle,
  imsTableInfoRowStyle,
  imsTableStyle,
  imsColours,
} from "../../src/components/imsTheme";
import { supabase } from "../../src/lib/supabase";
import type { CSSProperties } from "react";

type CertificationView = "dashboard" | "register" | "upload";

type CertificationRow = {
  id: string;
  certificate_number: string | null;
  title: string | null;
  standard: string | null;
  issuing_body: string | null;
  certificate_scope: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  status: string | null;
  file_name: string | null;
  file_path: string | null;
  file_size: number | null;
  uploaded_at: string | null;
  notes: string | null;
  created_at: string | null;
};

type CertificationForm = {
  certificateNumber: string;
  title: string;
  standard: string;
  issuingBody: string;
  certificateScope: string;
  issueDate: string;
  expiryDate: string;
  status: string;
  notes: string;
  file: File | null;
};

const STORAGE_BUCKET = "document-files";

const emptyForm: CertificationForm = {
  certificateNumber: "",
  title: "",
  standard: "ISO 9001:2015",
  issuingBody: "",
  certificateScope: "",
  issueDate: "",
  expiryDate: "",
  status: "Active",
  notes: "",
  file: null,
};

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

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

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getDaysUntil(value: string | null | undefined) {
  if (!value) return null;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getExpiryState(row: CertificationRow) {
  if ((row.status || "").toLowerCase() === "archived") return "Archived";
  const days = getDaysUntil(row.expiry_date);
  if (days === null) return "No Expiry";
  if (days < 0) return "Expired";
  if (days <= 90) return "Due Soon";
  return "In Date";
}

function getFileSize(size: number | null | undefined) {
  if (!size) return "-";
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return "Unknown error";
}

export default function CertificationPage() {
  const [rows, setRows] = useState<CertificationRow[]>([]);
  const [activeView, setActiveView] = useState<CertificationView>("dashboard");
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState<CertificationForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [standardFilter, setStandardFilter] = useState("All Standards");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [showFilters, setShowFilters] = useState(false);
  const [message, setMessage] = useState("Loading certification register...");
  const [lastRefreshed, setLastRefreshed] = useState("");
  const [saving, setSaving] = useState(false);
  const [openingId, setOpeningId] = useState("");
  const [deletingId, setDeletingId] = useState("");

  const selectedRow = rows.find((row) => row.id === selectedId) || null;

  async function loadCertifications(showLoadedMessage = true) {
    const { data, error } = await supabase
      .from("certifications")
      .select("*")
      .order("expiry_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(`Load failed: ${error.message}`);
      return;
    }

    const nextRows = (data || []) as CertificationRow[];
    setRows(nextRows);
    setLastRefreshed(new Date().toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" }));
    if (!selectedId && nextRows[0]) setSelectedId(nextRows[0].id);
    if (showLoadedMessage) setMessage(`Loaded ${nextRows.length} certification record${nextRows.length === 1 ? "" : "s"}.`);
  }

  useEffect(() => {
    void loadCertifications();
  }, []);

  const standards = useMemo(() => {
    return ["All Standards", ...Array.from(new Set(rows.map((row) => row.standard || "").filter(Boolean))).sort()];
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch =
        !query ||
        [
          row.certificate_number,
          row.title,
          row.standard,
          row.issuing_body,
          row.certificate_scope,
          row.notes,
        ].some((value) => String(value || "").toLowerCase().includes(query));
      const matchesStandard = standardFilter === "All Standards" || row.standard === standardFilter;
      const state = getExpiryState(row);
      const matchesStatus =
        statusFilter === "All Statuses" ||
        row.status === statusFilter ||
        state === statusFilter;
      return matchesSearch && matchesStandard && matchesStatus;
    });
  }, [rows, search, standardFilter, statusFilter]);

  const kpis = useMemo(() => {
    const active = rows.filter((row) => (row.status || "Active") === "Active").length;
    const expired = rows.filter((row) => getExpiryState(row) === "Expired").length;
    const dueSoon = rows.filter((row) => getExpiryState(row) === "Due Soon").length;
    const withFiles = rows.filter((row) => Boolean(row.file_path)).length;
    return { active, expired, dueSoon, withFiles };
  }, [rows]);

  const latestLabel = useMemo(() => {
    const latest = [...rows].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0];
    return latest?.title || "No certificates";
  }, [rows]);

  async function saveCertificate(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim() || !form.standard.trim()) {
      setMessage("Title and standard are required.");
      return;
    }

    setSaving(true);
    let uploadedPath = "";
    try {
      let filePayload: Partial<CertificationRow> = {};
      if (form.file) {
        const fileName = sanitizeFileName(form.file.name);
        const path = `certification/${Date.now()}-${fileName}`;
        const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(path, form.file, {
          cacheControl: "3600",
          upsert: false,
        });
        if (uploadError) throw uploadError;
        uploadedPath = path;
        filePayload = {
          file_name: form.file.name,
          file_path: path,
          file_size: form.file.size,
          uploaded_at: new Date().toISOString(),
        };
      }

      const { error } = await supabase.from("certifications").insert({
        certificate_number: form.certificateNumber.trim() || null,
        title: form.title.trim(),
        standard: form.standard.trim(),
        issuing_body: form.issuingBody.trim() || null,
        certificate_scope: form.certificateScope.trim() || null,
        issue_date: form.issueDate || null,
        expiry_date: form.expiryDate || null,
        status: form.status,
        notes: form.notes.trim() || null,
        ...filePayload,
      });

      if (error) throw error;
      uploadedPath = "";
      setForm(emptyForm);
      setActiveView("register");
      setMessage("Certificate uploaded successfully.");
      await loadCertifications(false);
    } catch (error) {
      console.error(error);
      if (uploadedPath) {
        await supabase.storage.from(STORAGE_BUCKET).remove([uploadedPath]);
      }
      setMessage(`Save failed: ${getErrorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  }

  async function openCertificate(row: CertificationRow) {
    if (!row.file_path) {
      setMessage("No certificate file has been uploaded for this record.");
      return;
    }

    setOpeningId(row.id);
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(row.file_path, 60 * 10);
    setOpeningId("");

    if (error || !data?.signedUrl) {
      setMessage(`Could not open certificate: ${error?.message || "No signed URL returned."}`);
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function deleteCertificate(row: CertificationRow) {
    if (!window.confirm(`Delete ${row.title || "this certificate"}?`)) return;
    setDeletingId(row.id);
    try {
      const { error } = await supabase.from("certifications").delete().eq("id", row.id);
      if (error) throw error;
      if (row.file_path) {
        await supabase.storage.from(STORAGE_BUCKET).remove([row.file_path]);
      }
      setMessage("Certificate deleted.");
      if (selectedId === row.id) setSelectedId("");
      await loadCertifications(false);
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? `Delete failed: ${error.message}` : "Delete failed.");
    } finally {
      setDeletingId("");
    }
  }

  function applyExpiryFilter(value: string) {
    setStatusFilter(value);
    setShowFilters(true);
    setActiveView("register");
  }

  return (
    <main>
      <QualityPageHero
        label="QUALITY MANAGEMENT"
        title="Certification"
        description="Upload, track, and review ISO-style certificates from one controlled Document Control register."
        contextCards={[
          { label: "Last Refreshed", value: lastRefreshed || "-" },
          { label: "Latest Certificate", value: latestLabel },
        ]}
      />

      <ImsTopMetaRow status={<><strong>Status:</strong> {message}</>} />

      <ImsTabs<CertificationView>
        tabs={[
          { value: "dashboard", label: "Dashboard" },
          { value: "register", label: "Certificate Register" },
          { value: "upload", label: "Upload Certificate" },
        ]}
        active={activeView}
        onChange={setActiveView}
        ariaLabel="Certification views"
      />

      {activeView === "dashboard" ? (
        <>
          <section style={kpiGridStyle}>
            <QualityKpiCard title="Active Certificates" value={kpis.active} accent={imsColours.brand} onClick={() => applyExpiryFilter("Active")} />
            <QualityKpiCard title="Expiring in 90 Days" value={kpis.dueSoon} accent={imsColours.warning} onClick={() => applyExpiryFilter("Due Soon")} />
            <QualityKpiCard title="Expired" value={kpis.expired} accent={imsColours.dangerBright} onClick={() => applyExpiryFilter("Expired")} />
            <QualityKpiCard title="Files Uploaded" value={kpis.withFiles} accent={imsColours.purple} onClick={() => setActiveView("register")} />
          </section>

          <section style={dashboardGridStyle}>
            <ImsPanel title="Certification Focus" subtitle="Simple Quality Management register for ISO and external certification evidence.">
              <div style={focusListStyle}>
                <div style={focusItemStyle}><strong>Primary use:</strong> upload current ISO-style certificates.</div>
                <div style={focusItemStyle}><strong>Expiry control:</strong> expired and due-soon cards drill into the register.</div>
                <div style={focusItemStyle}><strong>Storage:</strong> files are stored under the existing document-files bucket.</div>
              </div>
            </ImsPanel>

            <ImsPanel title="Upcoming Expiry Watch" subtitle="Certificates nearest expiry appear first.">
              <div style={watchListStyle}>
                {rows.filter((row) => getExpiryState(row) !== "Archived").slice(0, 5).map((row) => (
                  <button key={row.id} type="button" style={watchItemStyle} onClick={() => { setSelectedId(row.id); setActiveView("register"); }}>
                    <span style={watchTitleStyle}>{row.title || "Untitled certificate"}</span>
                    <span style={watchMetaStyle}>{row.standard || "-"} · {getExpiryState(row)} · {formatDate(row.expiry_date)}</span>
                  </button>
                ))}
                {rows.length === 0 ? <div style={emptyStateStyle}>No certificates uploaded yet.</div> : null}
              </div>
            </ImsPanel>
          </section>
        </>
      ) : null}

      {activeView === "upload" ? (
        <ImsPanel title="Upload Certificate" subtitle="Add the certificate metadata and upload the controlled copy.">
          <form onSubmit={saveCertificate}>
            <div style={formGridStyle}>
              <Field label="Certificate Title">
                <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} style={imsInputStyle} placeholder="e.g. ISO 9001 Certificate" />
              </Field>
              <Field label="Certificate Number">
                <input value={form.certificateNumber} onChange={(event) => setForm({ ...form, certificateNumber: event.target.value })} style={imsInputStyle} placeholder="Optional certificate/reference number" />
              </Field>
              <Field label="Standard">
                <select value={form.standard} onChange={(event) => setForm({ ...form, standard: event.target.value })} style={imsInputStyle}>
                  <option>ISO 9001:2015</option>
                  <option>ISO 14001:2015</option>
                  <option>ISO 45001:2018</option>
                  <option>Other</option>
                </select>
              </Field>
              <Field label="Issuing Body">
                <input value={form.issuingBody} onChange={(event) => setForm({ ...form, issuingBody: event.target.value })} style={imsInputStyle} placeholder="e.g. LRQA, DNV, BSI" />
              </Field>
              <Field label="Issue Date">
                <input type="date" value={form.issueDate} onChange={(event) => setForm({ ...form, issueDate: event.target.value })} style={imsInputStyle} />
              </Field>
              <Field label="Expiry Date">
                <input type="date" value={form.expiryDate} onChange={(event) => setForm({ ...form, expiryDate: event.target.value })} style={imsInputStyle} />
              </Field>
              <Field label="Status">
                <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} style={imsInputStyle}>
                  <option>Active</option>
                  <option>Pending</option>
                  <option>Archived</option>
                </select>
              </Field>
              <Field label="Certificate File">
                <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={(event) => setForm({ ...form, file: event.target.files?.[0] || null })} style={fileInputStyle} />
              </Field>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Scope">
                  <textarea value={form.certificateScope} onChange={(event) => setForm({ ...form, certificateScope: event.target.value })} style={textareaStyle} placeholder="Certificate scope or coverage statement" />
                </Field>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Notes">
                  <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} style={textareaStyle} placeholder="Optional notes" />
                </Field>
              </div>
            </div>
            <div style={buttonRowStyle}>
              <ImsButton type="submit" disabled={saving}>{saving ? "Saving..." : "Save Certificate"}</ImsButton>
              <ImsButton variant="secondary" onClick={() => setForm(emptyForm)}>Clear Form</ImsButton>
            </div>
          </form>
        </ImsPanel>
      ) : null}

      {activeView === "register" ? (
        <ImsPanel title="Certificate Register" subtitle="Search, filter, open, and manage uploaded certification records.">
          <ImsFilterPanel
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search certificate title, standard, body or notes"
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters((current) => !current)}
            actions={
              showFilters ? (
                <ImsButton
                  variant="secondary"
                  onClick={() => {
                    setSearch("");
                    setStandardFilter("All Standards");
                    setStatusFilter("All Statuses");
                  }}
                >
                  Clear Filters
                </ImsButton>
              ) : null
            }
          >
            <Field label="Standard">
              <select value={standardFilter} onChange={(event) => setStandardFilter(event.target.value)} style={imsInputStyle}>
                {standards.map((standard) => <option key={standard}>{standard}</option>)}
              </select>
            </Field>
            <Field label="Status / Expiry">
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={imsInputStyle}>
                <option>All Statuses</option>
                <option>Active</option>
                <option>Pending</option>
                <option>Archived</option>
                <option>In Date</option>
                <option>Due Soon</option>
                <option>Expired</option>
                <option>No Expiry</option>
              </select>
            </Field>
          </ImsFilterPanel>

          <div style={imsTableInfoRowStyle}>Showing <strong>{filteredRows.length}</strong> of <strong>{rows.length}</strong> certificates</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ ...imsTableStyle, minWidth: 980 }}>
              <thead>
                <tr>
                  <th style={imsTableHeadStyle}>Certificate</th>
                  <th style={imsTableHeadStyle}>Standard</th>
                  <th style={imsTableHeadStyle}>Issuing Body</th>
                  <th style={imsTableHeadStyle}>Issue Date</th>
                  <th style={imsTableHeadStyle}>Expiry</th>
                  <th style={imsTableHeadStyle}>File</th>
                  <th style={imsTableHeadStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr><td colSpan={7} style={emptyCellStyle}>No certificates match the current filters.</td></tr>
                ) : (
                  filteredRows.map((row) => {
                    const expiry = getExpiryState(row);
                    return (
                      <tr key={row.id} style={selectedId === row.id ? selectedRowStyle : undefined} onClick={() => setSelectedId(row.id)}>
                        <td style={imsTableCellStyle}>
                          <strong>{row.title || "Untitled certificate"}</strong>
                          <div style={mutedTextStyle}>{row.certificate_number || "No certificate number"}</div>
                        </td>
                        <td style={imsTableCellStyle}>{row.standard || "-"}</td>
                        <td style={imsTableCellStyle}>{row.issuing_body || "-"}</td>
                        <td style={imsTableCellStyle}>{formatDate(row.issue_date)}</td>
                        <td style={imsTableCellStyle}>
                          <span style={getExpiryBadgeStyle(expiry)}>{expiry}</span>
                          <div style={mutedTextStyle}>{formatDate(row.expiry_date)}</div>
                        </td>
                        <td style={imsTableCellStyle}>
                          <div>{row.file_name || "No file uploaded"}</div>
                          <div style={mutedTextStyle}>{getFileSize(row.file_size)} · {formatDateTime(row.uploaded_at)}</div>
                        </td>
                        <td style={imsTableCellStyle}>
                          <div style={rowActionsStyle}>
                            <ImsButton variant="secondary" disabled={!row.file_path || openingId === row.id} onClick={() => void openCertificate(row)}>
                              {openingId === row.id ? "Opening..." : "Open"}
                            </ImsButton>
                            <ImsButton variant="danger" disabled={deletingId === row.id} onClick={() => void deleteCertificate(row)}>
                              {deletingId === row.id ? "Deleting..." : "Delete"}
                            </ImsButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {selectedRow ? (
            <div style={detailPanelStyle}>
              <div>
                <div style={detailEyebrowStyle}>Selected Certificate</div>
                <h2 style={detailTitleStyle}>{selectedRow.title || "Untitled certificate"}</h2>
                <p style={detailTextStyle}>{selectedRow.certificate_scope || "No scope recorded."}</p>
              </div>
              <div style={detailGridStyle}>
                <Detail label="Standard" value={selectedRow.standard} />
                <Detail label="Issuing Body" value={selectedRow.issuing_body} />
                <Detail label="Issue Date" value={formatDate(selectedRow.issue_date)} />
                <Detail label="Expiry Date" value={formatDate(selectedRow.expiry_date)} />
                <Detail label="Status" value={selectedRow.status} />
                <Detail label="File" value={selectedRow.file_name || "No file uploaded"} />
              </div>
            </div>
          ) : null}
        </ImsPanel>
      ) : null}
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={fieldWrapStyle}>
      <span style={fieldLabelStyle}>{label}</span>
      {children}
    </label>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={detailItemStyle}>
      <div style={detailItemLabelStyle}>{label}</div>
      <div style={detailItemValueStyle}>{value || "-"}</div>
    </div>
  );
}

function getExpiryBadgeStyle(state: string): CSSProperties {
  const palette =
    state === "Expired"
      ? { background: "#fee2e2", color: "#F93822" }
      : state === "Due Soon"
        ? { background: "#fef3c7", color: "#92400e" }
        : state === "Archived"
          ? { background: "#f1f5f9", color: "#475569" }
          : { background: "#dcfce7", color: "#166534" };

  return {
    ...palette,
    display: "inline-flex",
    alignItems: "center",
    borderRadius: "999px",
    padding: "6px 10px",
    fontSize: "12px",
    fontWeight: 900,
  };
}

const kpiGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: "14px",
  marginBottom: "18px",
};

const dashboardGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "16px",
};

const focusListStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
};

const focusItemStyle: CSSProperties = {
  padding: "12px",
  borderRadius: "12px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#334155",
  fontSize: "14px",
};

const watchListStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
};

const watchItemStyle: CSSProperties = {
  border: "1px solid #dbe7f3",
  borderRadius: "12px",
  background: "#ffffff",
  padding: "12px",
  textAlign: "left",
  cursor: "pointer",
};

const watchTitleStyle: CSSProperties = {
  display: "block",
  fontWeight: 900,
  color: "#0f172a",
};

const watchMetaStyle: CSSProperties = {
  display: "block",
  marginTop: "5px",
  color: "#64748b",
  fontSize: "12px",
};

const formGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "12px",
};

const fieldWrapStyle: CSSProperties = {
  display: "grid",
  gap: "6px",
};

const fieldLabelStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 900,
  color: "#334155",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const textareaStyle: CSSProperties = {
  ...imsInputStyle,
  minHeight: "96px",
  resize: "vertical",
  fontFamily: "inherit",
};

const fileInputStyle: CSSProperties = {
  ...imsInputStyle,
  padding: "9px 12px",
};

const buttonRowStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  marginTop: "14px",
  flexWrap: "wrap",
};

const emptyStateStyle: CSSProperties = {
  padding: "14px",
  borderRadius: "12px",
  border: "1px dashed #cbd5e1",
  background: "#f8fafc",
  color: "#64748b",
};

const emptyCellStyle: CSSProperties = {
  ...imsTableCellStyle,
  textAlign: "center",
  color: "#64748b",
  padding: "24px",
};

const selectedRowStyle: CSSProperties = {
  background: "#ECECE7",
};

const mutedTextStyle: CSSProperties = {
  color: "#64748b",
  fontSize: "12px",
  marginTop: "4px",
};

const rowActionsStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const detailPanelStyle: CSSProperties = {
  marginTop: "16px",
  borderRadius: "16px",
  border: "1px solid #dbe7f3",
  background: "#f8fafc",
  padding: "16px",
  display: "grid",
  gap: "14px",
};

const detailEyebrowStyle: CSSProperties = {
  color: imsColours.brandDark,
  fontSize: "12px",
  fontWeight: 900,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
};

const detailTitleStyle: CSSProperties = {
  margin: "4px 0 0",
  color: "#0f172a",
  fontSize: "22px",
};

const detailTextStyle: CSSProperties = {
  margin: "8px 0 0",
  color: "#475569",
  lineHeight: 1.55,
};

const detailGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "10px",
};

const detailItemStyle: CSSProperties = {
  borderRadius: "12px",
  border: "1px solid #dbe7f3",
  background: "#ffffff",
  padding: "12px",
};

const detailItemLabelStyle: CSSProperties = {
  color: "#64748b",
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const detailItemValueStyle: CSSProperties = {
  color: "#0f172a",
  fontWeight: 800,
  marginTop: "5px",
};

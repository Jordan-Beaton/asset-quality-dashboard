"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import { QualityPageHero } from "./QualityPageHero";
import { ImsTopMetaRow } from "./ImsPrimitives";
import { ProjectWorkspaceNav } from "./ProjectWorkspaceNav";
import { QualityKpiCard } from "./QualityKpiCard";
import { supabase } from "../lib/supabase";
import {
  imsColours, imsPanelStyle, imsTableStyle,
  imsTableHeadStyle, imsTableCellStyle, imsPrimaryButtonStyle,
  imsSecondaryButtonStyle, imsGhostButtonStyle,
  imsInputStyle, imsTextareaStyle, imsLabelStyle, imsFieldStyle,
} from "./imsTheme";

const STORAGE_BUCKET = "project-documents";

// ── Types ─────────────────────────────────────────────────────────────────────

type Recipient = { name: string; email: string };

type NoiPoint = {
  id: string;
  section_number: string;
  activity_description: string;
  intervention_type: string;
  noi_number: string;
  status: string;
};

type RecordFile = {
  id: string;
  record_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  uploaded_at: string;
};

type Notification = {
  id: string;
  sent_at: string;
  sent_to: Recipient[];
};

type InspectionRecord = {
  id: string;
  project_key: string;
  noi_number: string;
  noi_description: string | null;
  point_snapshots: NoiPoint[];
  recipients: Recipient[];
  notes: string | null;
  last_notified_at: string | null;
  last_notified_to: string | null;
  uploaded_by_name: string | null;
  created_at: string;
  inspection_record_files: RecordFile[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtSize(bytes: number | null | undefined) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function Pill({ status }: { status: "complete" | "pending" }) {
  const s: CSSProperties = {
    display: "inline-block", fontSize: "10px", fontWeight: 800,
    padding: "2px 9px", borderRadius: "999px",
    background: status === "complete" ? "#e8f5e9" : "#fff8e1",
    color: status === "complete" ? "#2E7D32" : "#7a5500",
  };
  return <span style={s}>{status === "complete" ? "Complete" : "Pending records"}</span>;
}

// ── Styles matching the rest of the platform ──────────────────────────────────

const page: CSSProperties = { display: "grid", gap: 16 };

const metricsGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 16,
  marginBottom: 4,
};

const surface: CSSProperties = {
  ...imsPanelStyle,
  padding: 0,
  overflow: "hidden",
};

const toolbar: CSSProperties = {
  display: "flex", alignItems: "center", gap: 8,
  padding: "12px 16px", borderBottom: `1px solid ${imsColours.border}`, flexWrap: "wrap",
};

const filterSel: CSSProperties = {
  ...imsInputStyle, width: "auto", minHeight: 38, fontSize: 13, padding: "6px 10px",
};

const tagStyle = (type: string): CSSProperties => ({
  display: "inline-block", fontSize: 10, fontWeight: 800,
  padding: "2px 6px", borderRadius: 4, marginRight: 3, marginBottom: 2,
  background: type.includes("H") ? "#fdecea" : "#fff8e1",
  color: type.includes("H") ? imsColours.danger : "#7a5500",
});

const recipChip: CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11,
  background: imsColours.page, border: `1px solid ${imsColours.border}`,
  borderRadius: 999, padding: "2px 9px", marginRight: 3,
};

const emptyState: CSSProperties = {
  padding: "48px 20px", textAlign: "center", color: imsColours.muted,
};

// Modal
const overlay: CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 200, padding: 20,
};
const modal = (maxW = 680): CSSProperties => ({
  background: "#fff", borderRadius: 14, width: "100%", maxWidth: maxW,
  maxHeight: "90vh", display: "flex", flexDirection: "column",
  boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
});
const modalHeader: CSSProperties = {
  background: imsColours.brand, color: "#fff", padding: "14px 18px",
  borderRadius: "14px 14px 0 0",
  display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
};
const modalBody: CSSProperties = {
  overflow: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 14, flex: 1,
};
const modalFooter: CSSProperties = {
  padding: "12px 18px", borderTop: `1px solid ${imsColours.border}`,
  display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0,
};
const sectionTitle: CSSProperties = {
  fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" as const,
  color: imsColours.muted, paddingBottom: 6, borderBottom: `1px solid ${imsColours.border}`, marginBottom: 4,
};
const pointRow = (checked: boolean): CSSProperties => ({
  display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 12px",
  border: `1px solid ${checked ? imsColours.brandAccent : imsColours.border}`,
  borderRadius: 8, background: checked ? "#d6eef1" : imsColours.page,
  cursor: "pointer",
});
const uploadZone: CSSProperties = {
  border: `2px dashed ${imsColours.border}`, borderRadius: 8,
  padding: 20, textAlign: "center" as const, color: imsColours.muted, fontSize: 13, cursor: "pointer",
};
const evMetaBox: CSSProperties = {
  background: imsColours.page, border: `1px solid ${imsColours.border}`,
  borderRadius: 8, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6,
};
const evRow: CSSProperties = { display: "flex", gap: 10, fontSize: 12 };
const evLbl: CSSProperties = { color: imsColours.muted, minWidth: 120, flexShrink: 0 };
const evVal: CSSProperties = { fontWeight: 600, color: imsColours.ink };
const fileRow: CSSProperties = {
  display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
  border: `1px solid ${imsColours.border}`, borderRadius: 8, background: imsColours.page,
};
const fileIcon: CSSProperties = {
  width: 32, height: 32, background: "#d6eef1", borderRadius: 6,
  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0,
};
const notifBanner: CSSProperties = {
  display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
  background: "#e8f5e9", border: "1px solid #a5d6a7", borderRadius: 8,
  fontSize: 12, color: "#2E7D32", fontWeight: 600,
};
const msgStyle = (type: "ok" | "err"): CSSProperties => ({
  position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
  background: type === "err" ? imsColours.danger : imsColours.brand,
  color: "#fff", padding: "10px 20px", borderRadius: 10, fontWeight: 700,
  fontSize: 13, zIndex: 300, boxShadow: "0 4px 16px rgba(0,0,0,0.2)", pointerEvents: "none",
});

// ── Component ─────────────────────────────────────────────────────────────────

export function InspectionRecordsPage({ projectKey }: { projectKey: string }) {
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"ok" | "err">("ok");

  const [noiNumbers, setNoiNumbers] = useState<string[]>([]);
  const [noiPoints, setNoiPoints] = useState<NoiPoint[]>([]);
  const [loadingPoints, setLoadingPoints] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [addNoi, setAddNoi] = useState("");
  const [addPoints, setAddPoints] = useState<Set<string>>(new Set());
  const [addRecipients, setAddRecipients] = useState<Recipient[]>([]);
  const [addRecipName, setAddRecipName] = useState("");
  const [addRecipEmail, setAddRecipEmail] = useState("");
  const [addNotes, setAddNotes] = useState("");
  const [addFiles, setAddFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [evidenceRecord, setEvidenceRecord] = useState<InspectionRecord | null>(null);
  const [evidenceNotifs, setEvidenceNotifs] = useState<Notification[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [uploadingMore, setUploadingMore] = useState(false);
  const moreFileRef = useRef<HTMLInputElement>(null);

  const [filterStatus, setFilterStatus] = useState<"all" | "complete" | "pending">("all");

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadRecords = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("inspection_records")
      .select("*, inspection_record_files(*)")
      .eq("project_key", projectKey)
      .order("created_at", { ascending: false });
    if (!error && data) setRecords(data as InspectionRecord[]);
    setLoading(false);
  }, [projectKey]);

  const loadNoiNumbers = useCallback(async () => {
    const { data } = await supabase
      .from("project_noi_points")
      .select("noi_number")
      .eq("project_key", projectKey)
      .not("noi_number", "is", null)
      .order("noi_number", { ascending: false });
    if (data) {
      const unique = Array.from(new Set(
        data.map((r: { noi_number: string }) => r.noi_number).filter(Boolean)
      ));
      setNoiNumbers(unique);
    }
  }, [projectKey]);

  useEffect(() => { loadRecords(); loadNoiNumbers(); }, [loadRecords, loadNoiNumbers]);

  useEffect(() => {
    if (!addNoi) { setNoiPoints([]); setAddPoints(new Set()); return; }
    setLoadingPoints(true);
    supabase
      .from("project_noi_points")
      .select("id, section_number, activity_description, intervention_type, noi_number, status")
      .eq("project_key", projectKey)
      .eq("noi_number", addNoi)
      .order("section_number")
      .then(({ data }) => {
        if (data) {
          setNoiPoints(data as NoiPoint[]);
          setAddPoints(new Set((data as NoiPoint[]).map(p => p.id)));
        }
        setLoadingPoints(false);
      });
  }, [addNoi, projectKey]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function showMsg(text: string, type: "ok" | "err" = "ok") {
    setMessage(text); setMessageType(type);
    setTimeout(() => setMessage(""), 5000);
  }

  // ── Evidence modal ────────────────────────────────────────────────────────

  async function openEvidence(record: InspectionRecord) {
    setEvidenceRecord(record); setEvidenceNotifs([]); setSignedUrls({});
    const { data: notifs } = await supabase
      .from("inspection_record_notifications")
      .select("id, sent_at, sent_to")
      .eq("record_id", record.id)
      .order("sent_at", { ascending: false });
    if (notifs) setEvidenceNotifs(notifs as Notification[]);
    const urls: Record<string, string> = {};
    for (const f of record.inspection_record_files) {
      const { data: signed } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(f.file_path, 60 * 60 * 24 * 7);
      if (signed?.signedUrl) urls[f.id] = signed.signedUrl;
    }
    setSignedUrls(urls);
  }

  function closeEvidence() { setEvidenceRecord(null); setEvidenceNotifs([]); setSignedUrls({}); }

  // ── Add modal ─────────────────────────────────────────────────────────────

  function openAdd(prefillNoi?: string) {
    setAddNoi(prefillNoi || ""); setAddPoints(new Set()); setAddRecipients([]);
    setAddRecipName(""); setAddRecipEmail(""); setAddNotes(""); setAddFiles([]); setShowAdd(true);
  }

  function togglePoint(id: string) {
    setAddPoints(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function addRecipient() {
    const name = addRecipName.trim(); const email = addRecipEmail.trim();
    if (!email.includes("@")) return;
    setAddRecipients(prev => [...prev, { name, email }]);
    setAddRecipName(""); setAddRecipEmail("");
  }

  async function saveRecord() {
    if (!addNoi) { showMsg("Select an NOI reference.", "err"); return; }
    if (addPoints.size === 0) { showMsg("Select at least one ITP point.", "err"); return; }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userName = user?.user_metadata?.full_name || user?.email || "Unknown";
      const selectedPoints = noiPoints.filter(p => addPoints.has(p.id));
      const pointSnapshots = selectedPoints.map(p => ({
        id: p.id, section_number: p.section_number,
        activity_description: p.activity_description, intervention_type: p.intervention_type,
      }));
      const noiDesc = selectedPoints.map(p => p.activity_description).join("; ").slice(0, 200) || null;

      const { data: newRecord, error: insertErr } = await supabase
        .from("inspection_records")
        .insert({
          project_key: projectKey, noi_number: addNoi, noi_description: noiDesc,
          point_snapshots: pointSnapshots, recipients: addRecipients,
          notes: addNotes.trim() || null, uploaded_by_name: userName,
        })
        .select().single();
      if (insertErr || !newRecord) throw insertErr || new Error("Insert failed.");

      for (const file of addFiles) {
        const path = `${projectKey}/inspection-records/${newRecord.id}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file);
        if (upErr) throw upErr;
        await supabase.from("inspection_record_files").insert({
          record_id: newRecord.id, file_name: file.name, file_path: path, file_size: file.size,
        });
      }

      if (addRecipients.length > 0 && addFiles.length > 0) {
        await fetch("/api/projects/inspection-records", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "notify", recordId: newRecord.id }),
        });
      }
      showMsg(`Record saved${addRecipients.length > 0 && addFiles.length > 0 ? " and notification sent." : "."}`);
      setShowAdd(false); loadRecords();
    } catch (err) {
      showMsg(err instanceof Error ? err.message : "Save failed.", "err");
    } finally {
      setSaving(false);
    }
  }

  async function sendNotification() {
    if (!evidenceRecord) return;
    setSending(true);
    try {
      const res = await fetch("/api/projects/inspection-records", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "notify", recordId: evidenceRecord.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Send failed.");
      showMsg("Notification sent.");
      await loadRecords();
      const { data: refreshed } = await supabase.from("inspection_records").select("*, inspection_record_files(*)").eq("id", evidenceRecord.id).single();
      if (refreshed) setEvidenceRecord(refreshed as InspectionRecord);
      const { data: notifs } = await supabase.from("inspection_record_notifications").select("id, sent_at, sent_to").eq("record_id", evidenceRecord.id).order("sent_at", { ascending: false });
      if (notifs) setEvidenceNotifs(notifs as Notification[]);
    } catch (err) {
      showMsg(err instanceof Error ? err.message : "Send failed.", "err");
    } finally { setSending(false); }
  }

  async function uploadMoreFiles(e: ChangeEvent<HTMLInputElement>) {
    if (!evidenceRecord || !e.target.files?.length) return;
    setUploadingMore(true);
    try {
      for (const file of Array.from(e.target.files)) {
        const path = `${projectKey}/inspection-records/${evidenceRecord.id}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file);
        if (upErr) throw upErr;
        await supabase.from("inspection_record_files").insert({ record_id: evidenceRecord.id, file_name: file.name, file_path: path, file_size: file.size });
      }
      showMsg("Files uploaded.");
      const { data: refreshed } = await supabase.from("inspection_records").select("*, inspection_record_files(*)").eq("id", evidenceRecord.id).single();
      if (refreshed) {
        setEvidenceRecord(refreshed as InspectionRecord);
        const urls = { ...signedUrls };
        for (const f of (refreshed as InspectionRecord).inspection_record_files) {
          if (!urls[f.id]) {
            const { data: signed } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(f.file_path, 60 * 60 * 24 * 7);
            if (signed?.signedUrl) urls[f.id] = signed.signedUrl;
          }
        }
        setSignedUrls(urls);
      }
      loadRecords();
    } catch (err) {
      showMsg(err instanceof Error ? err.message : "Upload failed.", "err");
    } finally { setUploadingMore(false); if (moreFileRef.current) moreFileRef.current.value = ""; }
  }

  // ── Derived values ────────────────────────────────────────────────────────

  const totalComplete = records.filter(r => r.inspection_record_files.length > 0).length;
  const totalPending = records.length - totalComplete;
  const filtered = records.filter(r => {
    if (filterStatus === "all") return true;
    const hasFiles = r.inspection_record_files.length > 0;
    return filterStatus === "complete" ? hasFiles : !hasFiles;
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main style={page}>
      <QualityPageHero title="Inspection Records" />
      <ImsTopMetaRow status={<><strong>Status:</strong> {message || "Link completed inspection documentation to NOIs and notify recipients."}</>} />
      <ProjectWorkspaceNav projectKey={projectKey} active="inspection-records" />

      <section style={metricsGrid}>
        <QualityKpiCard title="Total Records" value={records.length} accent={imsColours.brand} />
        <QualityKpiCard title="Complete" value={totalComplete} accent="#2E7D32" />
        <QualityKpiCard title="Pending Records" value={totalPending} accent={imsColours.warning} />
      </section>

      <section style={surface}>
        <div style={toolbar}>
          <button style={imsPrimaryButtonStyle} onClick={() => openAdd()}>＋ Add Inspection Record</button>
          <select style={filterSel} value={filterStatus} onChange={e => setFilterStatus(e.target.value as "all" | "complete" | "pending")}>
            <option value="all">Status: All</option>
            <option value="complete">Complete</option>
            <option value="pending">Pending records</option>
          </select>
        </div>

        {loading ? (
          <div style={emptyState}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={emptyState}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>No inspection records yet</div>
            <div style={{ fontSize: 13 }}>Click "＋ Add Inspection Record" to link completed documentation to an NOI.</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={imsTableStyle}>
              <thead>
                <tr>
                  {["NOI Ref", "ITP Points", "Description", "Recipients", "Files", "Uploaded", "Status", ""].map(h => (
                    <th key={h} style={imsTableHeadStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(record => {
                  const hasFiles = record.inspection_record_files.length > 0;
                  const points: NoiPoint[] = Array.isArray(record.point_snapshots) ? record.point_snapshots : [];
                  const recipients: Recipient[] = Array.isArray(record.recipients) ? record.recipients : [];
                  return (
                    <tr key={record.id}>
                      <td style={{ ...imsTableCellStyle, fontWeight: 800, color: imsColours.brand, whiteSpace: "nowrap" }}>
                        NOI-{record.noi_number}
                      </td>
                      <td style={imsTableCellStyle}>
                        {points.slice(0, 4).map((p, i) => (
                          <span key={i} style={tagStyle(p.intervention_type)}>§{p.section_number} {p.intervention_type}</span>
                        ))}
                        {points.length > 4 && <span style={{ fontSize: 10, color: imsColours.muted }}>+{points.length - 4} more</span>}
                      </td>
                      <td style={{ ...imsTableCellStyle, maxWidth: 220 }}>
                        <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {record.noi_description || "—"}
                        </span>
                      </td>
                      <td style={imsTableCellStyle}>
                        {recipients.length === 0 ? <span style={{ color: imsColours.muted }}>—</span> : (
                          <>
                            {recipients.slice(0, 2).map((r, i) => (
                              <span key={i} style={recipChip} title={r.email}>{r.name || r.email}</span>
                            ))}
                            {recipients.length > 2 && <span style={{ fontSize: 11, color: imsColours.muted }}>+{recipients.length - 2}</span>}
                          </>
                        )}
                      </td>
                      <td style={{ ...imsTableCellStyle, textAlign: "center" }}>
                        {hasFiles ? record.inspection_record_files.length : "—"}
                      </td>
                      <td style={{ ...imsTableCellStyle, whiteSpace: "nowrap" }}>{fmtDate(record.created_at)}</td>
                      <td style={imsTableCellStyle}><Pill status={hasFiles ? "complete" : "pending"} /></td>
                      <td style={{ ...imsTableCellStyle, whiteSpace: "nowrap" }}>
                        {hasFiles ? (
                          <button style={{ ...imsGhostButtonStyle, fontSize: 11, padding: "5px 10px", minHeight: 0 }} onClick={() => openEvidence(record)}>
                            📎 Open Evidence
                          </button>
                        ) : (
                          <button style={{ ...imsSecondaryButtonStyle, fontSize: 11, padding: "5px 10px", minHeight: 0 }} onClick={() => openAdd(record.noi_number)}>
                            ＋ Add Records
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── ADD RECORD MODAL ── */}
      {showAdd && (
        <div style={overlay} onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div style={modal(700)}>
            <div style={modalHeader}>
              <span style={{ fontWeight: 800, fontSize: 14 }}>Add Inspection Record</span>
              <button onClick={() => setShowAdd(false)} style={{ background: "none", border: "none", color: "#fff", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
            </div>
            <div style={modalBody}>
              <div style={imsFieldStyle}>
                <label style={{ ...imsLabelStyle, fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>NOI Reference</label>
                <select style={imsInputStyle} value={addNoi} onChange={e => setAddNoi(e.target.value)}>
                  <option value="">— Select NOI —</option>
                  {noiNumbers.map(n => <option key={n} value={n}>NOI-{n}</option>)}
                </select>
              </div>

              {addNoi && (
                <div>
                  <div style={sectionTitle}>ITP Points Called Up — tick which this record covers</div>
                  {loadingPoints ? (
                    <p style={{ color: imsColours.muted, fontSize: 13 }}>Loading points…</p>
                  ) : noiPoints.length === 0 ? (
                    <p style={{ color: imsColours.muted, fontSize: 13 }}>No W/H points found for this NOI.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {noiPoints.map(point => {
                        const checked = addPoints.has(point.id);
                        return (
                          <div key={point.id} style={pointRow(checked)} onClick={() => togglePoint(point.id)}>
                            <input type="checkbox" checked={checked} onChange={() => togglePoint(point.id)}
                              style={{ marginTop: 2, accentColor: imsColours.brand, width: 14, height: 14, flexShrink: 0, cursor: "pointer" }}
                              onClick={e => e.stopPropagation()} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 10, fontWeight: 800, color: imsColours.muted, marginBottom: 2 }}>
                                §{point.section_number} <span style={tagStyle(point.intervention_type)}>{point.intervention_type}</span>
                              </div>
                              <div style={{ fontSize: 12 }}>{point.activity_description}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div>
                <div style={sectionTitle}>Recipients</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8, minHeight: 24 }}>
                  {addRecipients.map((r, i) => (
                    <span key={i} style={recipChip}>
                      {r.name ? `${r.name} <${r.email}>` : r.email}
                      <button onClick={() => setAddRecipients(prev => prev.filter((_, j) => j !== i))}
                        style={{ background: "none", border: "none", cursor: "pointer", color: imsColours.muted, fontSize: 13, padding: "0 0 0 3px", lineHeight: 1 }}>✕</button>
                    </span>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <input style={{ ...imsInputStyle, flex: "0 1 160px", minHeight: 38, fontSize: 12 }} placeholder="Name"
                    value={addRecipName} onChange={e => setAddRecipName(e.target.value)} />
                  <input style={{ ...imsInputStyle, flex: "1 1 200px", minHeight: 38, fontSize: 12 }} type="email" placeholder="Email address"
                    value={addRecipEmail} onChange={e => setAddRecipEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && addRecipient()} />
                  <button style={{ ...imsGhostButtonStyle, minHeight: 38, fontSize: 12, padding: "6px 12px" }} onClick={addRecipient}>Add</button>
                </div>
              </div>

              <div style={imsFieldStyle}>
                <label style={{ ...imsLabelStyle, fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Attach Records</label>
                <div style={uploadZone} onClick={() => fileInputRef.current?.click()}>
                  📁 Click to select files
                  {addFiles.length > 0 && (
                    <div style={{ marginTop: 8, fontSize: 12 }}>
                      {addFiles.map((f, i) => <div key={i} style={{ color: imsColours.brand, fontWeight: 600 }}>{f.name}</div>)}
                    </div>
                  )}
                </div>
                <input ref={fileInputRef} type="file" multiple style={{ display: "none" }}
                  onChange={e => e.target.files && setAddFiles(Array.from(e.target.files))} />
              </div>

              <div style={imsFieldStyle}>
                <label style={{ ...imsLabelStyle, fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Notes (optional)</label>
                <textarea style={imsTextareaStyle} placeholder="Any additional context for the recipient…"
                  value={addNotes} onChange={e => setAddNotes(e.target.value)} />
              </div>
            </div>
            <div style={modalFooter}>
              <button style={imsGhostButtonStyle} onClick={() => setShowAdd(false)} disabled={saving}>Cancel</button>
              <button style={imsPrimaryButtonStyle} onClick={saveRecord} disabled={saving}>
                {saving ? "Saving…" : addRecipients.length > 0 ? "Save & Send Notification" : "Save Record"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EVIDENCE MODAL ── */}
      {evidenceRecord && (
        <div style={overlay} onClick={e => e.target === e.currentTarget && closeEvidence()}>
          <div style={modal(560)}>
            <div style={modalHeader}>
              <span style={{ fontWeight: 800, fontSize: 14 }}>Inspection Evidence — NOI-{evidenceRecord.noi_number}</span>
              <button onClick={closeEvidence} style={{ background: "none", border: "none", color: "#fff", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
            </div>
            <div style={modalBody}>
              <div style={evMetaBox}>
                <div style={evRow}><span style={evLbl}>NOI Reference</span><span style={evVal}>NOI-{evidenceRecord.noi_number}</span></div>
                {evidenceRecord.noi_description && (
                  <div style={evRow}><span style={evLbl}>Description</span><span style={evVal}>{evidenceRecord.noi_description}</span></div>
                )}
                <div style={evRow}>
                  <span style={evLbl}>ITP Points</span>
                  <span style={evVal}>
                    {(Array.isArray(evidenceRecord.point_snapshots) ? evidenceRecord.point_snapshots : []).map((p, i) => (
                      <span key={i} style={tagStyle(p.intervention_type)}>§{p.section_number} {p.intervention_type}</span>
                    ))}
                  </span>
                </div>
                <div style={evRow}><span style={evLbl}>Uploaded by</span><span style={evVal}>{evidenceRecord.uploaded_by_name || "—"} · {fmtDate(evidenceRecord.created_at)}</span></div>
                <div style={evRow}>
                  <span style={evLbl}>Recipients</span>
                  <span style={evVal}>{(Array.isArray(evidenceRecord.recipients) ? evidenceRecord.recipients : []).map(r => r.name || r.email).join(", ") || "—"}</span>
                </div>
              </div>

              {evidenceNotifs.length > 0 && (
                <div style={notifBanner}>✅ Last notified {fmtDate(evidenceNotifs[0].sent_at)} — {evidenceNotifs.length} notification{evidenceNotifs.length > 1 ? "s" : ""} sent</div>
              )}

              <div style={sectionTitle}>Attached Files</div>
              {evidenceRecord.inspection_record_files.length === 0 ? (
                <p style={{ color: imsColours.muted, fontSize: 13 }}>No files attached yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {evidenceRecord.inspection_record_files.map(f => (
                    <div key={f.id} style={fileRow}>
                      <div style={fileIcon}>📄</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{f.file_name}</div>
                        <div style={{ fontSize: 11, color: imsColours.muted }}>{fmtSize(f.file_size)} · {fmtDate(f.uploaded_at)}</div>
                      </div>
                      {signedUrls[f.id] && (
                        <a href={signedUrls[f.id]} target="_blank" rel="noreferrer"
                          style={{ fontSize: 12, fontWeight: 700, color: imsColours.brand, textDecoration: "underline" }}>
                          Open ↗
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ ...uploadZone, padding: 12, fontSize: 12 }} onClick={() => moreFileRef.current?.click()}>
                {uploadingMore ? "Uploading…" : "＋ Upload additional files to this record"}
              </div>
              <input ref={moreFileRef} type="file" multiple style={{ display: "none" }} onChange={uploadMoreFiles} />

              {evidenceRecord.notes && (
                <>
                  <div style={sectionTitle}>Notes</div>
                  <p style={{ fontSize: 13 }}>{evidenceRecord.notes}</p>
                </>
              )}
            </div>
            <div style={modalFooter}>
              <button style={imsGhostButtonStyle} onClick={closeEvidence}>Close</button>
              <button
                style={{ ...imsPrimaryButtonStyle, background: imsColours.brandAccent }}
                onClick={sendNotification}
                disabled={sending || !(Array.isArray(evidenceRecord.recipients) && evidenceRecord.recipients.length > 0)}
              >
                {sending ? "Sending…" : evidenceNotifs.length > 0 ? "Resend Notification" : "Send Notification"}
              </button>
            </div>
          </div>
        </div>
      )}

      {message && <div style={msgStyle(messageType)}>{message}</div>}
    </main>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import { BalticPowerWorkspaceNav } from "../../../../src/components/BalticPowerWorkspaceNav";
import { ImsButton, ImsPanel, ImsTopMetaRow } from "../../../../src/components/ImsPrimitives";
import { QualityKpiCard } from "../../../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../../../src/components/QualityPageHero";
import { supabase } from "../../../../src/lib/supabase";

type PhaseItem = { taskNumber?: string; activityDescription?: string };
type Phase = { phaseNumber: string; phaseTitle: string; items: PhaseItem[] };
type SignOff = { id: string; document_name: string; document_path: string; phase_number: string; phase_title: string; phase_items: PhaseItem[]; recipient_email: string; status: string; decision_name: string | null; decision_email: string | null; decision_note: string | null; decided_at: string | null; sent_at: string; certificate_path: string | null; certificate_sha256: string | null };

const PROJECT_KEY = "baltic-power";
const STORAGE_BUCKET = "project-documents";

function decisionDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value)) : "-";
}

function decisionTime(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(value)) : "-";
}

function decisionStatusStyle(status: string): CSSProperties {
  if (status === "Approved") return { color: "green", fontWeight: 900 };
  if (status === "Rejected") return { color: "#F93822", fontWeight: 900 };
  return {};
}

export default function BalticPowerItpSignOffPage() {
  const [message, setMessage] = useState("Loading ITP sign-off register...");
  const [records, setRecords] = useState<SignOff[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("project_itp_sign_off_requests").select("*").eq("project_key", PROJECT_KEY).order("created_at", { ascending: false });
    if (error) { setMessage(error.message.includes("project_itp_sign_off_requests") ? "ITP sign-off database setup is required before requests can be issued." : error.message); return; }
    setRecords((data || []) as SignOff[]);
    setMessage(`Loaded ${data?.length || 0} sign-off request${data?.length === 1 ? "" : "s"}.`);
  }, []);

  useEffect(() => { void load(); }, [load]);
  const selectedPhases = selectedIndexes.map((index) => phases[index]).filter(Boolean);
  const pending = records.filter((row) => row.status === "Pending").length;
  const approved = records.filter((row) => row.status === "Approved").length;
  const rejected = records.filter((row) => row.status === "Rejected").length;

  async function extract(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] || null;
    setFile(selected); setPhases([]); setSelectedIndexes([]);
    if (!selected) return;
    setExtracting(true); setMessage("Detecting numbered phase headings and extracting their activity rows...");
    try {
      const form = new FormData(); form.append("file", selected);
      const response = await fetch("/api/projects/itp-phase-extract", { method: "POST", body: form });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Unable to extract the ITP.");
      const found = (payload.phases || []) as Phase[];
      setPhases(found);
      setMessage(found.length ? `Detected ${found.length} phase heading${found.length === 1 ? "" : "s"}. Select the phases appropriate for this sign-off.` : "No numbered phase headings were identified. Check the file and try again.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to extract the ITP."); }
    finally { setExtracting(false); }
  }

  function togglePhase(index: number) {
    setSelectedIndexes((current) => current.includes(index) ? current.filter((value) => value !== index) : [...current, index]);
  }

  async function send() {
    if (!file || !selectedPhases.length || !recipientEmail.trim()) { setMessage("Choose an ITP, select at least one phase heading, and enter the recipient email."); return; }
    setSending(true); setMessage(`Sending ${selectedPhases.length} phase sign-off request${selectedPhases.length === 1 ? "" : "s"}...`);
    let path = "";
    const requestIds: string[] = [];
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("You must be signed in to issue a sign-off request.");
      path = `${PROJECT_KEY}/itp-sign-offs/${crypto.randomUUID()}/${file.name.replace(/[^a-zA-Z0-9._-]+/g, "-")}`;
      const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { contentType: file.type || undefined });
      if (uploadError) throw uploadError;
      const rows = selectedPhases.map((phase) => ({ project_key: PROJECT_KEY, document_name: file.name, document_path: path, phase_number: phase.phaseNumber, phase_title: phase.phaseTitle, phase_items: phase.items, recipient_email: recipientEmail.trim().toLowerCase(), sender_name: auth.user.user_metadata?.full_name || auth.user.user_metadata?.name || null, sender_email: auth.user.email || null, created_by: auth.user.id }));
      const { data, error } = await supabase.from("project_itp_sign_off_requests").insert(rows).select("id");
      if (error) throw error;
      requestIds.push(...(data || []).map((row) => row.id));
      for (const requestId of requestIds) {
        const response = await fetch("/api/projects/itp-sign-off", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId }) });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || "An email could not be sent.");
      }
      const count = selectedPhases.length;
      setFile(null); setPhases([]); setSelectedIndexes([]); setRecipientEmail("");
      await load();
      setMessage(`${count} phase sign-off request${count === 1 ? "" : "s"} sent to ${recipientEmail.trim()}.`);
    } catch (error) {
      if (requestIds.length) await supabase.from("project_itp_sign_off_requests").delete().in("id", requestIds);
      if (path) await supabase.storage.from(STORAGE_BUCKET).remove([path]);
      setMessage(error instanceof Error ? error.message : "Unable to send the sign-off request.");
    } finally { setSending(false); }
  }

  async function openSource(path: string) {
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) { setMessage(error?.message || "Unable to open the source ITP."); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function openCertificate(path: string | null) {
    if (!path) { setMessage("No sign-off certificate is available for this record."); return; }
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) { setMessage(error?.message || "Unable to open the sign-off certificate."); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  return <main style={page}>
    <QualityPageHero label="Baltic Power · Documented evidence" title="ITP Sign-Off" description="Select complete ITP phases for external approval or rejection without collecting a drawn signature." />
    <ImsTopMetaRow backHref="/home" backLabel="Back to IMS Home" status={<><strong>Status:</strong> {message}</>} />
    <BalticPowerWorkspaceNav active="itp-sign-off" />
    <section style={metrics}>
      <QualityKpiCard title="Requests" value={records.length} accent="#005670" /><QualityKpiCard title="Pending" value={pending} accent="#FFAD00" /><QualityKpiCard title="Approved" value={approved} accent="#63B1BC" /><QualityKpiCard title="Rejected" value={rejected} accent="#F93822" />
    </section>
    <ImsPanel style={containedPanel} title="Create sign-off request" subtitle="Upload the complete ITP, then select the numbered phase headings appropriate for this sign-off.">
      <div style={formGrid}>
        <label style={field}><span>Internal ITP</span><input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={extract} disabled={extracting || sending} /></label>
        <label style={field}><span>Recipient email</span><input type="email" value={recipientEmail} onChange={(event) => setRecipientEmail(event.target.value)} placeholder="recipient@example.com" /></label>
      </div>
      {extracting ? <p style={notice}>Reading the complete ITP and locating its numbered heading structure...</p> : null}
      {phases.length ? <div style={phaseChoices}>
        <div style={choiceHeader}><strong>Detected phase headings</strong><span style={muted}>Select only what is appropriate. Each selected phase receives its own auditable decision.</span></div>
        {phases.map((phase, index) => {
          const checked = selectedIndexes.includes(index);
          return <div key={`${phase.phaseNumber}-${index}`} style={phaseChoice}>
            <label style={phaseCheck}><input type="checkbox" checked={checked} onChange={() => togglePhase(index)} /><span><strong>Phase {phase.phaseNumber}</strong><br/>{phase.phaseTitle}</span><span style={itemCount}>{phase.items.length} items</span></label>
            {checked ? <PhaseTable phase={phase} /> : null}
          </div>;
        })}
      </div> : null}
      <div style={actions}><ImsButton onClick={() => void send()} disabled={sending || extracting || !selectedPhases.length}>{sending ? "Sending..." : selectedPhases.length ? `Send ${selectedPhases.length} for approval` : "Send for approval"}</ImsButton></div>
    </ImsPanel>
    <ImsPanel style={containedPanel} title="Sign-off evidence register" subtitle="The decision record stores the recipient email, confirmed name, decision, and exact date/time.">
      <div style={tableWrap}><table className="ims-data-table" style={table}><colgroup><col style={{ width: "23%" }} /><col style={{ width: "14%" }} /><col style={{ width: "4%" }} /><col style={{ width: "12%" }} /><col style={{ width: "7%" }} /><col style={{ width: "12%" }} /><col style={{ width: "8%" }} /><col style={{ width: "8%" }} /><col style={{ width: "12%" }} /></colgroup><thead><tr><th>ITP title</th><th>Phase</th><th>Items</th><th>Recipient</th><th>Status</th><th>Decision evidence</th><th>Decision date</th><th>Decision time</th><th style={sourceColumn}>Documents</th></tr></thead><tbody>{records.map((row) => <tr key={row.id}><td><strong>{row.document_name}</strong></td><td><strong>Phase {row.phase_number}</strong><br/>{row.phase_title}</td><td>{row.phase_items?.length || 0}</td><td>{row.recipient_email}<br/><span style={muted}>Sent {new Date(row.sent_at).toLocaleString()}</span></td><td><span data-status={row.status} style={decisionStatusStyle(row.status)}>{row.status}</span></td><td>{row.decided_at ? <>{row.decision_name}<br/>{row.decision_email}{row.decision_note ? <><br/>{row.decision_note}</> : null}{row.certificate_sha256 ? <><br/><span style={hashText}>SHA-256: {row.certificate_sha256}</span></> : null}</> : "Awaiting response"}</td><td>{decisionDate(row.decided_at)}</td><td>{decisionTime(row.decided_at)}</td><td style={sourceColumn}><div style={documentLinks}><button style={linkButton} onClick={() => void openSource(row.document_path)}>Open ITP</button>{row.certificate_path ? <button style={linkButton} onClick={() => void openCertificate(row.certificate_path)}>Certificate PDF</button> : null}</div></td></tr>)}</tbody></table>{!records.length ? <div style={empty}>No sign-off requests have been issued.</div> : null}</div>
    </ImsPanel>
  </main>;
}

function PhaseTable({ phase }: { phase: Phase }) {
  return <div style={preview}><div style={tableWrap}><table className="ims-data-table" style={table}><colgroup><col style={{ width: "120px" }} /><col /></colgroup><thead><tr><th>Task ID</th><th>Activity description</th></tr></thead><tbody>{phase.items.map((item, index) => <tr key={`${item.taskNumber}-${index}`}><td>{item.taskNumber || "-"}</td><td>{item.activityDescription || "-"}</td></tr>)}</tbody></table></div></div>;
}

const page: CSSProperties = { display: "grid", gap: 18, width: "100%", maxWidth: "100%", minWidth: 0 };
const metrics: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 16, minWidth: 0 };
const containedPanel: CSSProperties = { width: "100%", maxWidth: "100%", minWidth: 0, overflow: "hidden", boxSizing: "border-box" };
const formGrid: CSSProperties = { display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 12 };
const field: CSSProperties = { display: "grid", gap: 6, color: "#53565A", fontSize: 13, fontWeight: 800 };
const notice: CSSProperties = { padding: 12, borderRadius: 10, background: "#ECECE7", color: "#005670" };
const phaseChoices: CSSProperties = { display: "grid", gap: 10, marginTop: 16, minWidth: 0 };
const choiceHeader: CSSProperties = { display: "grid", gap: 3 };
const phaseChoice: CSSProperties = { border: "1px solid #D0D0CE", borderRadius: 12, padding: 12, background: "#fff", minWidth: 0, overflow: "hidden" };
const phaseCheck: CSSProperties = { display: "grid", gridTemplateColumns: "auto minmax(0,1fr) auto", alignItems: "center", gap: 12, color: "#53565A", cursor: "pointer" };
const itemCount: CSSProperties = { padding: "5px 9px", borderRadius: 999, background: "#ECECE7", color: "#005670", fontSize: 11, fontWeight: 900, whiteSpace: "nowrap" };
const preview: CSSProperties = { display: "grid", gap: 12, marginTop: 12, minWidth: 0 };
const tableWrap: CSSProperties = { width: "100%", maxWidth: "100%", minWidth: 0, overflowX: "auto", boxSizing: "border-box" };
const table: CSSProperties = { width: "100%", maxWidth: "100%", tableLayout: "fixed", borderCollapse: "collapse", fontSize: 12, overflowWrap: "anywhere", wordBreak: "break-word" };
const muted: CSSProperties = { color: "#53565A", fontSize: 11 };
const actions: CSSProperties = { display: "flex", justifyContent: "flex-end", marginTop: 16 };
const linkButton: CSSProperties = { border: 0, background: "transparent", color: "#005670", fontWeight: 900, cursor: "pointer", whiteSpace: "nowrap", padding: 0 };
const sourceColumn: CSSProperties = { borderLeft: "1px solid #D0D0CE", paddingLeft: 14 };
const documentLinks: CSSProperties = { display: "grid", justifyItems: "start", gap: 8 };
const hashText: CSSProperties = { ...muted, display: "block", marginTop: 4, fontFamily: "monospace" };
const empty: CSSProperties = { padding: 28, textAlign: "center", color: "#53565A" };

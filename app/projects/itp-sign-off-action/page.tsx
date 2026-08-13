"use client";

import Image from "next/image";
import { Suspense, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useSearchParams } from "next/navigation";

type Item = { taskNumber?: string; activityDescription?: string };
type RequestDetails = { document_name: string; phase_number: string; phase_title: string; phase_items: Item[]; recipient_email: string };

function ActionContent() {
  const token = useSearchParams().get("token") || "";
  const [details, setDetails] = useState<RequestDetails | null>(null);
  const [name, setName] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("Loading sign-off request...");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [submittedDecision, setSubmittedDecision] = useState<"Approved" | "Rejected" | null>(null);

  async function sendVerificationCode() {
    setBusy(true); setMessage("Sending a verification code to the intended recipient email...");
    try { const response = await fetch("/api/projects/itp-sign-off", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload?.error); setMessage(payload.message); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to send the verification code."); }
    finally { setBusy(false); }
  }

  useEffect(() => { (async () => {
    try { const response = await fetch(`/api/projects/itp-sign-off?token=${encodeURIComponent(token)}`); const payload = await response.json(); if (!response.ok) throw new Error(payload?.error); setDetails(payload.request); setMessage("Review the complete phase below, then approve or reject."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load sign-off request."); }
  })(); }, [token]);

  async function decide(decision: "Approved" | "Rejected") {
    setSubmittedDecision(decision); setBusy(true); setMessage(`Recording ${decision.toLowerCase()} decision and generating the evidence certificate...`);
    try { const response = await fetch("/api/projects/itp-sign-off", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, verificationCode, decision, name, note }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload?.error); setComplete(true); setMessage(payload.message); }
    catch (error) { setSubmittedDecision(null); setMessage(error instanceof Error ? error.message : "Unable to record the decision."); }
    finally { setBusy(false); }
  }

  return <main style={page}><section style={card}>
    <header style={header}><Image src="/enshore-primary-logo-colour.svg" alt="Enshore" width={170} height={84} style={{ width: 170, height: "auto" }} /><div><div style={kicker}>Baltic Power</div><h1 style={title}>ITP Phase Sign-Off</h1><p style={subtitle}>Documented approval evidence — no drawn signature is required.</p></div></header>
    <div style={status}><strong>Status:</strong> {message}</div>
    {details ? <>
      <section style={summary}><div><span style={label}>ITP</span><strong>{details.document_name}</strong></div><div><span style={label}>Phase</span><strong>{details.phase_number}: {details.phase_title}</strong></div><div><span style={label}>Recipient email</span><strong>{details.recipient_email}</strong></div><div><span style={label}>Items included</span><strong>{details.phase_items.length}</strong></div></section>
      <div style={tableWrap}><table style={table}><thead><tr><th>Task ID</th><th>Activity description</th></tr></thead><tbody>{details.phase_items.map((item, index) => <tr key={`${item.taskNumber}-${index}`}><td>{item.taskNumber || "-"}</td><td>{item.activityDescription || "-"}</td></tr>)}</tbody></table></div>
      <label style={field}><span>Your full name</span><input value={name} onChange={(event) => setName(event.target.value)} disabled={complete} placeholder="Enter the name to retain with this decision" /></label>
      <div style={verificationGrid}><label style={field}><span>Email verification code</span><input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))} disabled={complete} placeholder="Six-digit code" /></label><button style={verifyButton} disabled={busy || complete} onClick={() => void sendVerificationCode()}>Send code to {details.recipient_email}</button></div>
      <label style={field}><span>Comments / rejection reason</span><textarea value={note} onChange={(event) => setNote(event.target.value)} disabled={complete} placeholder="Required when rejecting; optional when approving" /></label>
      {complete ? <div role="status" aria-live="polite" style={completedDecision}><strong>{submittedDecision === "Rejected" ? "Phase rejected" : "Phase approved"}</strong><span>Your verified decision has been recorded. The evidence certificate has been generated and this sign-off link cannot be used again.</span></div> : <div style={actions}><button style={{ ...approve, opacity: busy ? 0.65 : 1 }} disabled={busy} onClick={() => void decide("Approved")}>{submittedDecision === "Approved" && busy ? "Approving and generating certificate..." : "Approve phase"}</button><button style={{ ...reject, opacity: busy ? 0.65 : 1 }} disabled={busy} onClick={() => void decide("Rejected")}>{submittedDecision === "Rejected" && busy ? "Rejecting and generating certificate..." : "Reject phase"}</button></div>}
    </> : null}
  </section></main>;
}

export default function ItpSignOffActionPage() { return <Suspense fallback={<main style={page}>Loading...</main>}><ActionContent /></Suspense>; }

const page: CSSProperties = { minHeight: "100vh", background: "#ECECE7", padding: "32px 16px", fontFamily: "'Segoe UI',Arial,sans-serif" };
const card: CSSProperties = { width: "min(1180px,100%)", margin: "0 auto", boxSizing: "border-box", background: "#fff", border: "1px solid #D0D0CE", borderRadius: 22, padding: 24, display: "grid", gap: 18 };
const header: CSSProperties = { display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" };
const kicker: CSSProperties = { color: "#005670", fontWeight: 900, fontSize: 12, textTransform: "uppercase", letterSpacing: ".08em" };
const title: CSSProperties = { margin: "4px 0", color: "#000" };
const subtitle: CSSProperties = { margin: 0, color: "#53565A" };
const status: CSSProperties = { padding: 13, border: "1px solid #D0D0CE", borderRadius: 12, background: "#ECECE7" };
const summary: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 };
const label: CSSProperties = { display: "block", color: "#53565A", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 4 };
const tableWrap: CSSProperties = { overflowX: "auto" };
const table: CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 12 };
const field: CSSProperties = { display: "grid", gap: 6, color: "#53565A", fontWeight: 800 };
const verificationGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12, alignItems: "end" };
const actions: CSSProperties = { display: "flex", gap: 12, flexWrap: "wrap" };
const approve: CSSProperties = { border: 0, borderRadius: 10, padding: "12px 18px", background: "#005670", color: "#fff", fontWeight: 800, cursor: "pointer" };
const reject: CSSProperties = { ...approve, background: "#F93822" };
const verifyButton: CSSProperties = { ...approve, background: "#ECECE7", color: "#005670", border: "1px solid #D0D0CE" };
const completedDecision: CSSProperties = { display: "grid", gap: 5, padding: "14px 16px", border: "2px solid #005670", borderRadius: 12, background: "#EEF7F8", color: "#005670" };

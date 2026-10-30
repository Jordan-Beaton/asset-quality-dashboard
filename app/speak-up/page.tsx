"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { imsColours, imsInputStyle } from "../../src/components/imsTheme";
import { SPEAK_UP_REPORTER_GROUPS, type SpeakUpReportMode } from "../../src/lib/speakUpConfig";
import {
  ACCESS_CODE_ITERATIONS,
  decryptText,
  deriveFromAccessCode,
  encryptBytes,
  encryptText,
  generateAccessCode,
  generateCaseKey,
  newReporterSalt,
  normaliseAccessCode,
  unwrapCaseKeyForReporter,
  wrapCaseKeyForHandler,
  wrapCaseKeyForReporter,
} from "../../src/lib/speakUpCrypto";

type Stage = "landing" | "mode" | "form" | "sending" | "done" | "lookup" | "case";

type Config = {
  categories: string[];
  reporterGroups: string[];
  limits: { bodyChars: number; messageChars: number; contactChars: number; evidenceFiles: number; evidenceBytes: number };
  handlerKeys: { normal: Array<{ id: string; jwk: JsonWebKey }>; independent: Array<{ id: string; jwk: JsonWebKey }> };
  available: { normal: boolean; independent: boolean };
};

type CaseMessage = { id: string; authorRole: string; text: string; createdAt: string };

type OpenCase = {
  reference: string;
  status: string;
  category: string;
  receivedAt: string;
  acknowledgedAt: string | null;
  outcomeSharedAt: string | null;
  closedAt: string | null;
  outcome: string | null;
  body: string;
  messages: CaseMessage[];
};

const MODES: Array<{ value: SpeakUpReportMode; title: string; text: string }> = [
  { value: "anonymous", title: "Anonymous", text: "Nothing about you is collected. We can only reply through your reference and access code." },
  { value: "confidential", title: "Confidential", text: "You give contact details. Only the people handling your report can see them, and they will not share them without your agreement." },
  { value: "named", title: "In my name", text: "You give your name and contact details so we can talk to you directly. Your report is still handled in confidence." },
];

const STATUS_TEXT: Record<string, string> = {
  Received: "Your report has been received and is waiting to be picked up.",
  Acknowledged: "Your report has been acknowledged and is being looked at.",
  Investigating: "Your report is being looked into.",
  "Awaiting reporter": "The case handler has asked you something. Please reply below.",
  "Outcome shared": "An outcome has been shared. See the messages below.",
  Closed: "This case is closed.",
};

const OUTCOME_TEXT: Record<string, string> = {
  action_taken: "Action has been taken as a result of your report.",
  no_action: "After looking into it, no further action was needed.",
};

const page: CSSProperties = { minHeight: "100vh", background: imsColours.page, color: imsColours.ink, padding: "20px 16px 48px", boxSizing: "border-box" };
const column: CSSProperties = { maxWidth: "640px", margin: "0 auto", display: "grid", gap: "16px" };
const card: CSSProperties = { background: imsColours.panel, border: `1px solid ${imsColours.border}`, borderRadius: "16px", padding: "20px", display: "grid", gap: "14px" };
const heading: CSSProperties = { margin: 0, fontSize: "26px", lineHeight: 1.2, color: imsColours.brand };
const subheading: CSSProperties = { margin: 0, fontSize: "18px", lineHeight: 1.3, color: imsColours.ink };
const para: CSSProperties = { margin: 0, fontSize: "15px", lineHeight: 1.55, color: imsColours.ink };
const small: CSSProperties = { margin: 0, fontSize: "13px", lineHeight: 1.5, color: imsColours.muted };
const label: CSSProperties = { display: "grid", gap: "6px", fontSize: "14px", fontWeight: 700 };
const primary: CSSProperties = { minHeight: "48px", padding: "0 20px", border: 0, borderRadius: "12px", background: imsColours.brand, color: "#ffffff", fontSize: "16px", fontWeight: 700, cursor: "pointer" };
const secondary: CSSProperties = { minHeight: "48px", padding: "0 20px", border: `1px solid ${imsColours.brand}`, borderRadius: "12px", background: "transparent", color: imsColours.brand, fontSize: "16px", fontWeight: 700, cursor: "pointer" };
const warning: CSSProperties = { ...para, padding: "12px 14px", borderRadius: "12px", border: `1px solid ${imsColours.warning}`, background: "rgba(255, 173, 0, 0.12)" };
const errorBox: CSSProperties = { ...para, padding: "12px 14px", borderRadius: "12px", border: `1px solid ${imsColours.danger}`, background: "rgba(249, 56, 34, 0.08)" };
const field: CSSProperties = { ...imsInputStyle, width: "100%", minHeight: "48px", fontSize: "16px", boxSizing: "border-box" };

async function postJson<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/speak-up/public", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = (await response.json().catch(() => ({}))) as { error?: string; code?: string } & T;
  if (!response.ok) throw Object.assign(new Error(result.error || "Something went wrong. Please try again."), { code: result.code });
  return result;
}

// Photos are redrawn onto a canvas and saved again, which drops EXIF data (location, device, time) and gives the file a neutral name.
async function cleanImage(file: File, maxBytes: number): Promise<Uint8Array> {
  if (!file.type.startsWith("image/")) throw new Error("Only photos and screenshots can be attached.");
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot prepare the photo.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  // photos travel through the server, which accepts a limited size, so quality is lowered until it fits
  let blob: Blob | null = null;
  for (const quality of [0.85, 0.7, 0.55, 0.4]) {
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob && blob.size <= maxBytes) break;
  }
  if (!blob) throw new Error("The photo could not be prepared.");
  if (blob.size > maxBytes) throw new Error("A photo is too large to send.");
  return new Uint8Array(await blob.arrayBuffer());
}

// The dashes are put in as people type, so nobody has to wonder whether to enter them (pasting with or without them works too).
function formatAccessCode(input: string) {
  const letters = normaliseAccessCode(input).slice(0, 20);
  return (letters.match(/.{1,5}/g) || []).join("-");
}

// "WB-" is always there; people type only the year and number. A pasted full reference still works.
const REFERENCE_PREFIX = "WB-";

function formatReference(input: string) {
  const digits = input.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^WB/, "").replace(/D/g, "");
  const year = digits.slice(0, 4);
  const number = digits.slice(4, 10);
  return REFERENCE_PREFIX + [year, number].filter(Boolean).join("-");
}

function formatDate(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function SpeakUpPage() {
  const [stage, setStage] = useState<Stage>("landing");
  const [config, setConfig] = useState<Config | null>(null);
  const [loadError, setLoadError] = useState("");
  const [mode, setMode] = useState<SpeakUpReportMode>("anonymous");
  const [category, setCategory] = useState("");
  const [reporterGroup, setReporterGroup] = useState("");
  const [body, setBody] = useState("");
  const [involvesSenior, setInvolvesSenior] = useState(false);
  const [contact, setContact] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ reference: string; code: string; evidenceNote: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState("");
  const [lookupReference, setLookupReference] = useState(REFERENCE_PREFIX);
  const [lookupCode, setLookupCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [openCase, setOpenCase] = useState<OpenCase | null>(null);
  const [reply, setReply] = useState("");
  // what is needed to carry on a conversation; held only in memory and cleared on leaving
  const session = useRef<{ reference: string; authToken: string; caseKey: CryptoKey } | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/speak-up/public", { cache: "no-store" });
        const data = (await response.json()) as Config & { error?: string };
        if (!response.ok) throw new Error(data.error || "Speak Up is not available right now.");
        setConfig(data);
      } catch (problem) {
        setLoadError(problem instanceof Error ? problem.message : "Speak Up is not available right now.");
      }
    })();
  }, []);

  const needsGroup = SPEAK_UP_REPORTER_GROUPS.length > 1;

  function leave() {
    session.current = null;
    setResult(null);
    setOpenCase(null);
    setBody("");
    setContact("");
    setFiles([]);
    setCategory("");
    setReporterGroup("");
    setInvolvesSenior(false);
    setLookupReference(REFERENCE_PREFIX);
    setLookupCode("");
    setReply("");
    setSaved(false);
    setError("");
    setProgress("");
    setStage("landing");
  }

  async function copy(value: string, name: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(name);
      window.setTimeout(() => setCopied(""), 2000);
    } catch {
      setError("Copying did not work on this device. Please write it down or take a screenshot.");
    }
  }

  async function submit() {
    if (!config) return;
    setError("");
    if (!category) return setError("Choose a category.");
    if (body.trim().length < 10) return setError("Please describe your concern in a little more detail.");
    if (needsGroup && !reporterGroup) return setError("Say who you are.");
    if (mode !== "anonymous" && contact.trim().length < 3) return setError("Add your name and how to reach you, or go back and choose Anonymous.");
    setStage("sending");
    try {
      setProgress("Securing your report on this device");
      // always use the current list of handlers, so nobody who has left, or newly joined, is missed
      const fresh = await fetch("/api/speak-up/public", { cache: "no-store" }).then((response) => response.json() as Promise<Config & { error?: string }>);
      if (!fresh.handlerKeys) throw new Error(fresh.error || "Speak Up is not available right now.");
      const recipients = involvesSenior ? fresh.handlerKeys.independent : fresh.handlerKeys.normal;
      if (!recipients.length) throw new Error("Reports cannot be accepted just now. Please use one of the other ways to raise your concern.");

      const caseKey = await generateCaseKey();
      const code = generateAccessCode();
      const salt = newReporterSalt();
      const { wrapKey, authToken } = await deriveFromAccessCode(code, salt, ACCESS_CODE_ITERATIONS);
      const wrappedForReporter = await wrapCaseKeyForReporter(caseKey, wrapKey);
      const encryptedBody = await encryptText(caseKey, body.trim());
      const encryptedContact = mode !== "anonymous" ? await encryptText(caseKey, contact.trim()) : null;
      const wraps = await Promise.all(recipients.map(async (recipient) => ({ handlerId: recipient.id, wrappedKey: await wrapCaseKeyForHandler(caseKey, recipient.jwk) })));

      setProgress("Sending your report");
      const { reference } = await postJson<{ reference: string }>({
        action: "submit",
        category,
        mode,
        involvesSenior,
        reporterGroup: needsGroup ? reporterGroup : undefined,
        reporterIterations: ACCESS_CODE_ITERATIONS,
        reporterSalt: salt,
        reporterWrappedKey: wrappedForReporter.wrapped,
        reporterWrapIv: wrappedForReporter.iv,
        authToken,
        bodyCipher: encryptedBody.cipher,
        bodyIv: encryptedBody.iv,
        contactCipher: encryptedContact?.cipher,
        contactIv: encryptedContact?.iv,
        wraps,
      });

      // show the reference straight away so it is never lost, then add any photos
      let evidenceNote = "";
      if (files.length) {
        let added = 0;
        for (const [index, file] of files.entries()) {
          try {
            setProgress(`Adding photo ${index + 1} of ${files.length}`);
            const clean = await cleanImage(file, config.limits.evidenceBytes);
            const encrypted = await encryptBytes(caseKey, clean);
            const encryptedName = await encryptText(caseKey, `photo-${index + 1}.jpg`);
            // the file is already locked; the server stores it, so this device never contacts the storage service itself
            const response = await fetch("/api/speak-up/evidence", {
              method: "POST",
              headers: {
                "Content-Type": "application/octet-stream",
                "x-speakup-reference": reference,
                "x-speakup-token": authToken,
                "x-speakup-iv": encrypted.iv,
                "x-speakup-name": encryptedName.cipher,
                "x-speakup-name-iv": encryptedName.iv,
              },
              body: new Blob([encrypted.cipher as BlobPart]),
            });
            if (!response.ok) throw new Error("The photo could not be added.");
            added += 1;
          } catch {
            // the report itself has been sent; a photo that fails is reported below
          }
        }
        if (added < files.length) evidenceNote = `${files.length - added} of your photos could not be added. Your report was sent. You can mention this when you check your case.`;
      }

      session.current = { reference, authToken, caseKey };
      setResult({ reference, code, evidenceNote });
      setSaved(false);
      setBody("");
      setContact("");
      setFiles([]);
      setStage("done");
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Your report could not be sent. Nothing has been saved. Please try again.");
      setStage("form");
    } finally {
      setProgress("");
    }
  }

  async function loadCase(reference: string, code: string) {
    const { salt, iterations } = await postJson<{ salt: string; iterations: number }>({ action: "salt", reference });
    const { wrapKey, authToken } = await deriveFromAccessCode(code, salt, iterations);
    const data = await postJson<{
      reference: string; status: string; category: string; receivedAt: string; acknowledgedAt: string | null; outcomeSharedAt: string | null; closedAt: string | null; outcome: string | null;
      reporterWrappedKey: string; reporterWrapIv: string; bodyCipher: string; bodyIv: string;
      messages: Array<{ id: string; authorRole: string; cipher: string; iv: string; createdAt: string }>;
    }>({ action: "case", reference, authToken });
    const caseKey = await unwrapCaseKeyForReporter(wrapKey, data.reporterWrappedKey, data.reporterWrapIv);
    session.current = { reference: data.reference, authToken, caseKey };
    const messages = await Promise.all(data.messages.map(async (message) => ({
      id: message.id,
      authorRole: message.authorRole,
      createdAt: message.createdAt,
      text: await decryptText(caseKey, message.cipher, message.iv).catch(() => "(This message could not be read.)"),
    })));
    setOpenCase({
      reference: data.reference,
      status: data.status,
      category: data.category,
      receivedAt: data.receivedAt,
      acknowledgedAt: data.acknowledgedAt,
      outcomeSharedAt: data.outcomeSharedAt,
      closedAt: data.closedAt,
      outcome: data.outcome,
      body: await decryptText(caseKey, data.bodyCipher, data.bodyIv),
      messages,
    });
  }

  async function openFromForm() {
    setError("");
    const reference = lookupReference.trim().toUpperCase();
    if (reference === REFERENCE_PREFIX || !lookupCode.trim()) return setError("Enter your reference and access code.");
    setBusy(true);
    try {
      await loadCase(reference, lookupCode);
      setLookupCode("");
      setStage("case");
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "That reference and access code were not recognised.");
    } finally {
      setBusy(false);
    }
  }

  async function refreshCase() {
    // the access code itself is never kept, so a refresh reuses the key and token held in memory
    const current = session.current;
    if (!current) return;
    setBusy(true);
    setError("");
    try {
      const data = await postJson<{
        status: string; acknowledgedAt: string | null; outcomeSharedAt: string | null; closedAt: string | null; outcome: string | null;
        messages: Array<{ id: string; authorRole: string; cipher: string; iv: string; createdAt: string }>;
      }>({ action: "case", reference: current.reference, authToken: current.authToken });
      const messages = await Promise.all(data.messages.map(async (message) => ({
        id: message.id,
        authorRole: message.authorRole,
        createdAt: message.createdAt,
        text: await decryptText(current.caseKey, message.cipher, message.iv).catch(() => "(This message could not be read.)"),
      })));
      setOpenCase((existing) => (existing ? { ...existing, status: data.status, acknowledgedAt: data.acknowledgedAt, outcomeSharedAt: data.outcomeSharedAt, closedAt: data.closedAt, outcome: data.outcome, messages } : existing));
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "The case could not be refreshed.");
    } finally {
      setBusy(false);
    }
  }

  async function sendReply() {
    const current = session.current;
    if (!current || !config) return;
    const message = reply.trim();
    if (!message) return;
    setBusy(true);
    setError("");
    try {
      const encrypted = await encryptText(current.caseKey, message.slice(0, config.limits.messageChars));
      await postJson({ action: "reply", reference: current.reference, authToken: current.authToken, cipher: encrypted.cipher, iv: encrypted.iv });
      setReply("");
      await refreshCase();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Your message could not be sent.");
      setBusy(false);
    }
  }

  const unavailable = loadError || (config && !config.available.normal);

  return (
    <main style={page}>
      <div style={column}>
        {stage === "landing" ? (
          <>
            <section style={card}>
              <h1 style={heading}>Speak Up</h1>
              <p style={para}>If something at Enshore is not right, you can tell us here. It could be a safety risk, a quality or inspection problem, fraud, bullying, or anything else you think we should know about.</p>
              <p style={para}>You can stay anonymous. Your report is locked on your own phone or computer before it is sent, so nobody in IT or the IMS administration can read it. Only the case handlers can.</p>
              <div style={warning}><strong>If someone is in danger now,</strong> do not use this page. Call 999 or follow the site emergency procedure.</div>
              {unavailable ? <div style={errorBox}>{loadError || "Reports cannot be accepted just now. Please use one of the other ways to raise your concern."}</div> : null}
              <button type="button" style={{ ...primary, opacity: unavailable || !config ? 0.5 : 1 }} disabled={Boolean(unavailable) || !config} onClick={() => { setError(""); setStage("mode"); }}>Make a report</button>
              <button type="button" style={secondary} onClick={() => { setError(""); setStage("lookup"); }}>Check or reply to a report</button>
            </section>
            <section style={card}>
              <h2 style={subheading}>Other ways to raise a concern</h2>
              <p style={para}>You can also speak to your line manager, to HR, or to the HSE and Quality team. If you would rather use an outside route, the Protect whistleblowing helpline (0203 117 2520) gives free, confidential advice.</p>
              <p style={small}>This page does not use cookies, tracking or analytics, and does not record who you are. Closing the page clears everything it was holding.</p>
            </section>
          </>
        ) : null}

        {stage === "mode" ? (
          <section style={card}>
            <h1 style={heading}>How do you want to report?</h1>
            <p style={para}>You choose how much we know about you. You can change nothing about this later, so pick what you are comfortable with.</p>
            {MODES.map((option) => (
              <button key={option.value} type="button" onClick={() => { setMode(option.value); setError(""); setStage("form"); }} style={{ textAlign: "left", padding: "16px", borderRadius: "14px", border: `1px solid ${imsColours.border}`, background: imsColours.page, color: imsColours.ink, cursor: "pointer", display: "grid", gap: "4px" }}>
                <strong style={{ fontSize: "17px", color: imsColours.brand }}>{option.title}</strong>
                <span style={{ fontSize: "14px", lineHeight: 1.5 }}>{option.text}</span>
              </button>
            ))}
            <button type="button" style={secondary} onClick={() => setStage("landing")}>Back</button>
          </section>
        ) : null}

        {stage === "form" || stage === "sending" ? (
          <section style={card}>
            <h1 style={heading}>Your report</h1>
            <p style={small}>Reporting: {MODES.find((option) => option.value === mode)?.title.toLowerCase()}. <button type="button" onClick={() => setStage("mode")} disabled={stage === "sending"} style={{ border: 0, background: "none", padding: 0, color: imsColours.brand, textDecoration: "underline", cursor: "pointer", fontSize: "13px" }}>Change</button></p>
            {mode === "anonymous" ? <div style={warning}>Please leave out names, job numbers or details that would identify you unless they are needed to explain the concern.</div> : null}
            <label style={label}>
              What is this about?
              <select id="speak-up-category" style={field} value={category} onChange={(event) => setCategory(event.target.value)} disabled={stage === "sending"}>
                <option value="">Choose one</option>
                {(config?.categories || []).map((entry) => <option key={entry} value={entry}>{entry}</option>)}
              </select>
            </label>
            {needsGroup ? (
              <label style={label}>
                I am a
                <select id="speak-up-group" style={field} value={reporterGroup} onChange={(event) => setReporterGroup(event.target.value)} disabled={stage === "sending"}>
                  <option value="">Choose one</option>
                  {SPEAK_UP_REPORTER_GROUPS.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
                </select>
              </label>
            ) : null}
            <label style={label}>
              What happened, or what are you worried about?
              <textarea id="speak-up-body" spellCheck={false} autoComplete="off" autoCorrect="off" style={{ ...field, minHeight: "180px", padding: "12px", resize: "vertical", fontWeight: 400 }} value={body} maxLength={config?.limits.bodyChars} onChange={(event) => setBody(event.target.value)} disabled={stage === "sending"} placeholder="Where, when, who was involved, and anything that backs this up." />
              <span style={small}>{body.length} / {config?.limits.bodyChars}</span>
            </label>
            <label style={{ display: "flex", gap: "12px", alignItems: "flex-start", fontSize: "14px", lineHeight: 1.5 }}>
              <input id="speak-up-senior" type="checkbox" checked={involvesSenior} onChange={(event) => setInvolvesSenior(event.target.checked)} disabled={stage === "sending"} style={{ width: "22px", height: "22px", marginTop: "2px", flex: "0 0 auto" }} />
              <span>This involves someone in HR, management or IT. <span style={{ color: imsColours.muted }}>It will then go to an independent person instead of the usual case handlers.</span></span>
            </label>
            {mode !== "anonymous" ? (
              <label style={label}>
                Your name and how to reach you
                <input id="speak-up-contact" spellCheck={false} autoComplete="off" autoCorrect="off" style={field} value={contact} maxLength={config?.limits.contactChars} onChange={(event) => setContact(event.target.value)} disabled={stage === "sending"} placeholder="Name, and a phone number or personal email" />
              </label>
            ) : null}
            <label style={label}>
              Photos or screenshots (optional)
              <input id="speak-up-files" type="file" accept="image/*" multiple disabled={stage === "sending"} onChange={(event) => setFiles(Array.from(event.target.files || []).slice(0, config?.limits.evidenceFiles || 5))} style={{ fontSize: "14px", fontWeight: 400 }} />
              <span style={small}>Up to {config?.limits.evidenceFiles} images. Location and device details are removed from photos before they leave your device.</span>
            </label>
            {error ? <div style={errorBox} role="alert">{error}</div> : null}
            {stage === "sending" ? <div style={{ ...para, fontWeight: 700 }} role="status">{progress || "Working"}…</div> : null}
            <button type="button" style={{ ...primary, opacity: stage === "sending" ? 0.6 : 1 }} disabled={stage === "sending"} onClick={() => void submit()}>Send report</button>
            <button type="button" style={secondary} disabled={stage === "sending"} onClick={() => setStage("landing")}>Cancel</button>
          </section>
        ) : null}

        {stage === "done" && result ? (
          <section style={card}>
            <h1 style={heading}>Your report has been sent</h1>
            <p style={para}>Keep these two things. They are the only way back into your case to see replies or add more. We cannot recover them for you, and we do not know who you are.</p>
            <div style={{ display: "grid", gap: "6px" }}>
              <span style={small}>Reference</span>
              <strong style={{ fontSize: "24px", fontFamily: "ui-monospace, Menlo, Consolas, monospace", letterSpacing: "0.04em" }}>{result.reference}</strong>
              <button type="button" style={secondary} onClick={() => void copy(result.reference, "ref")}>{copied === "ref" ? "Copied" : "Copy reference"}</button>
            </div>
            <div style={{ display: "grid", gap: "6px" }}>
              <span style={small}>Access code</span>
              <strong style={{ fontSize: "24px", fontFamily: "ui-monospace, Menlo, Consolas, monospace", letterSpacing: "0.04em", wordBreak: "break-all" }}>{result.code}</strong>
              <button type="button" style={secondary} onClick={() => void copy(result.code, "code")}>{copied === "code" ? "Copied" : "Copy access code"}</button>
            </div>
            <div style={warning}>Save them somewhere private that is not shared with others, such as a password manager. This code is shown only once.</div>
            {result.evidenceNote ? <div style={errorBox}>{result.evidenceNote}</div> : null}
            {error ? <div style={errorBox} role="alert">{error}</div> : null}
            <label style={{ display: "flex", gap: "12px", alignItems: "flex-start", fontSize: "14px", lineHeight: 1.5 }}>
              <input id="speak-up-saved" type="checkbox" checked={saved} onChange={(event) => setSaved(event.target.checked)} style={{ width: "22px", height: "22px", marginTop: "2px", flex: "0 0 auto" }} />
              <span>I have saved my reference and access code.</span>
            </label>
            <p style={small}>We aim to acknowledge your report within 7 days and to tell you what has happened within 3 months.</p>
            <button type="button" style={{ ...primary, opacity: saved ? 1 : 0.5 }} disabled={!saved} onClick={leave}>Finish and clear this page</button>
          </section>
        ) : null}

        {stage === "lookup" ? (
          <section style={card}>
            <h1 style={heading}>Check or reply to a report</h1>
            <p style={para}>Enter the reference and access code you were given when you sent your report.</p>
            <label style={label}>
              Reference
              <input id="speak-up-reference" style={{ ...field, textTransform: "uppercase" }} value={lookupReference} onChange={(event) => setLookupReference(formatReference(event.target.value))} autoCapitalize="characters" autoComplete="off" autoCorrect="off" spellCheck={false} maxLength={14} inputMode="numeric" placeholder="WB-2026-001" />
            </label>
            <label style={label}>
              Access code
              <input id="speak-up-code" style={{ ...field, textTransform: "uppercase", fontFamily: "ui-monospace, Menlo, Consolas, monospace", letterSpacing: "0.04em" }} value={lookupCode} onChange={(event) => setLookupCode(formatAccessCode(event.target.value))} autoComplete="off" autoCapitalize="characters" autoCorrect="off" spellCheck={false} maxLength={23} placeholder="XXXXX-XXXXX-XXXXX-XXXXX" />
            </label>
            {error ? <div style={errorBox} role="alert">{error}</div> : null}
            {busy ? <div style={{ ...para, fontWeight: 700 }} role="status">Checking…</div> : null}
            <button type="button" style={{ ...primary, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={() => void openFromForm()}>Open my case</button>
            <button type="button" style={secondary} onClick={leave}>Back</button>
          </section>
        ) : null}

        {stage === "case" && openCase ? (
          <>
            <section style={card}>
              <h1 style={heading}>{openCase.reference}</h1>
              <p style={para}><strong>{openCase.status}.</strong> {STATUS_TEXT[openCase.status] || ""}</p>
              {openCase.outcome ? <p style={para}><strong>Outcome:</strong> {OUTCOME_TEXT[openCase.outcome] || openCase.outcome}</p> : null}
              <p style={small}>{openCase.category}. Received {formatDate(openCase.receivedAt)}{openCase.acknowledgedAt ? `. Acknowledged ${formatDate(openCase.acknowledgedAt)}` : ""}{openCase.outcomeSharedAt ? `. Outcome shared ${formatDate(openCase.outcomeSharedAt)}` : ""}{openCase.closedAt ? `. Closed ${formatDate(openCase.closedAt)}` : ""}.</p>
              <button type="button" style={secondary} disabled={busy} onClick={() => void refreshCase()}>{busy ? "Checking…" : "Check for updates"}</button>
            </section>
            <section style={card}>
              <h2 style={subheading}>Your report</h2>
              <p style={{ ...para, whiteSpace: "pre-wrap" }}>{openCase.body}</p>
            </section>
            <section style={card}>
              <h2 style={subheading}>Messages</h2>
              {openCase.messages.length === 0 ? <p style={small}>No messages yet. Check back later, or add something below.</p> : null}
              {openCase.messages.map((message) => (
                <div key={message.id} style={{ padding: "12px 14px", borderRadius: "12px", background: message.authorRole === "handler" ? "rgba(0, 86, 112, 0.08)" : imsColours.page, border: `1px solid ${imsColours.border}`, display: "grid", gap: "4px" }}>
                  <span style={small}>{message.authorRole === "handler" ? "Case handler" : "You"}, {formatDate(message.createdAt)}</span>
                  <span style={{ ...para, whiteSpace: "pre-wrap" }}>{message.text}</span>
                </div>
              ))}
              {openCase.status !== "Closed" ? (
                <>
                  <label style={label}>
                    Reply or add more
                    <textarea id="speak-up-reply" spellCheck={false} autoComplete="off" autoCorrect="off" style={{ ...field, minHeight: "110px", padding: "12px", resize: "vertical", fontWeight: 400 }} value={reply} maxLength={config?.limits.messageChars} onChange={(event) => setReply(event.target.value)} />
                  </label>
                  {error ? <div style={errorBox} role="alert">{error}</div> : null}
                  <button type="button" style={{ ...primary, opacity: busy || !reply.trim() ? 0.5 : 1 }} disabled={busy || !reply.trim()} onClick={() => void sendReply()}>Send message</button>
                </>
              ) : <p style={small}>This case is closed, so it cannot take new messages. You can make a new report if something else comes up.</p>}
              <button type="button" style={secondary} onClick={leave}>Leave and clear this page</button>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

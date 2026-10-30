"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { supabase } from "../../lib/supabase";
import { ImsButton, ImsFilterPanel, ImsPanel, ImsTabs, ImsTopMetaRow } from "../ImsPrimitives";
import { QualityKpiCard } from "../QualityKpiCard";
import { QualityPageHero } from "../QualityPageHero";
import {
  imsColours,
  imsFieldStyle,
  imsFormGridStyle,
  imsInputStyle,
  imsLabelStyle,
  imsTextareaStyle,
} from "../imsTheme";
import {
  SPEAK_UP_OUTCOME_LABELS,
  SPEAK_UP_STATUSES,
  type SpeakUpOutcome,
} from "../../lib/speakUpConfig";
import {
  decryptBytes,
  decryptText,
  encryptText,
  generateCaseKey,
  generateHandlerKeyPair,
  keyFingerprint,
  passphraseProblem,
  protectPrivateKey,
  unlockPrivateKey,
  unwrapCaseKey,
  wrapCaseKeyForHandler,
  type ProtectedPrivateKey,
} from "../../lib/speakUpCrypto";

type Me = {
  id: string;
  name: string;
  email: string;
  roles: string[];
  approvedRoles: string[];
  publicKey: JsonWebKey | null;
  encryptedPrivateKey: ProtectedPrivateKey | null;
  mfaRequired: boolean;
  mfaLevel: string;
};

type CaseSummary = {
  id: string;
  reference: string;
  category: string;
  involvesSenior: boolean;
  mode: string;
  status: string;
  receivedAt: string;
  acknowledgeBy: string;
  feedbackBy: string;
  acknowledgedAt: string | null;
  outcomeSharedAt: string | null;
  closedAt: string | null;
  outcome: string | null;
  retentionUntil: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  lastMessageRole?: string | null;
};

type Person = { id: string; name: string; publicKey?: JsonWebKey | null; roles?: string[] };

type CaseDetailRaw = {
  case: CaseSummary;
  wrappedKey: string;
  bodyCipher: string;
  bodyIv: string;
  contactCipher: string | null;
  contactIv: string | null;
  reporterGroup: string | null;
  messages: Array<{ id: string; authorRole: string; authorName: string | null; cipher: string; iv: string; createdAt: string }>;
  evidence: Array<{ id: string; size: number; fileIv: string; nameCipher: string; nameIv: string; createdAt: string }>;
  audit: Array<{ id: string; actor: string | null; type: string; detail: string | null; at: string }>;
  access: Person[];
  eligible: Person[];
};

type CaseDetail = {
  raw: CaseDetailRaw;
  caseKey: CryptoKey;
  body: string;
  contact: string | null;
  messages: Array<{ id: string; authorRole: string; authorName: string | null; text: string; createdAt: string }>;
  evidence: Array<{ id: string; name: string; size: number; fileIv: string }>;
};

type Tab = "cases" | "retention" | "team";

const AUTO_LOCK_MS = 15 * 60 * 1000;

const stackStyle: CSSProperties = { display: "grid", gap: "16px" };
const narrowStyle: CSSProperties = { display: "grid", gap: "14px", maxWidth: "560px" };
const paraStyle: CSSProperties = { margin: 0, fontSize: "14px", lineHeight: 1.55, color: imsColours.ink };
const smallStyle: CSSProperties = { margin: 0, fontSize: "13px", lineHeight: 1.5, color: imsColours.muted };
const subheadingStyle: CSSProperties = { margin: 0, fontSize: "16px", fontWeight: 800, color: imsColours.ink };
const noticeStyle: CSSProperties = { ...paraStyle, padding: "10px 12px", borderRadius: "10px", border: `1px solid ${imsColours.warning}`, background: imsColours.page };
const errorStyle: CSSProperties = { ...paraStyle, padding: "10px 12px", borderRadius: "10px", border: `1px solid ${imsColours.danger}`, background: imsColours.page };
const kpiGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" };
const rowStyle: CSSProperties = { display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" };
const itemStyle: CSSProperties = { padding: "10px 12px", borderRadius: "12px", border: `1px solid ${imsColours.border}`, background: imsColours.page, display: "grid", gap: "4px" };

class ApiError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

async function api<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/speak-up/handler", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = (await response.json().catch(() => ({}))) as { error?: string; code?: string } & T;
  if (!response.ok) throw new ApiError(result.error || "The request could not be completed.", result.code);
  return result;
}

function dateText(value: string | null) {
  return value ? new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
}

function dateTimeText(value: string) {
  return new Date(value).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function daysUntil(value: string) {
  return Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000);
}

function slaChips(item: CaseSummary) {
  const chips: Array<{ text: string; tone: "bad" | "warn" }> = [];
  if (item.status !== "Closed" && item.lastMessageRole === "reporter") chips.push({ text: "New reply from reporter", tone: "warn" });
  if (item.status === "Received" && !item.acknowledgedAt) {
    const days = daysUntil(item.acknowledgeBy);
    if (days < 0) chips.push({ text: "Acknowledgement overdue", tone: "bad" });
    else if (days <= 2) chips.push({ text: `Acknowledge by ${dateText(item.acknowledgeBy)}`, tone: "warn" });
  }
  if (!["Outcome shared", "Closed"].includes(item.status)) {
    const days = daysUntil(item.feedbackBy);
    if (days < 0) chips.push({ text: "Feedback overdue", tone: "bad" });
    else if (days <= 14) chips.push({ text: `Feedback due ${dateText(item.feedbackBy)}`, tone: "warn" });
  }
  return chips;
}

function isDueForDeletion(item: CaseSummary) {
  return item.status === "Closed" && Boolean(item.retentionUntil) && item.retentionUntil! <= new Date().toISOString().slice(0, 10);
}

function Chip({ text, tone = "plain" }: { text: string; tone?: "bad" | "warn" | "plain" }) {
  const colour = tone === "bad" ? imsColours.danger : tone === "warn" ? imsColours.warning : imsColours.brand;
  return <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "999px", border: `1px solid ${colour}`, color: imsColours.ink, fontSize: "11px", fontWeight: 800, whiteSpace: "nowrap" }}>{text}</span>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={imsFieldStyle}>
      <span style={imsLabelStyle}>{label}</span>
      {children}
    </label>
  );
}

export default function HandlerConsole() {
  const [me, setMe] = useState<Me | null>(null);
  const [problem, setProblem] = useState("");
  const [loading, setLoading] = useState(true);
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [passphraseAgain, setPassphraseAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<Tab>("cases");
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [casesLoaded, setCasesLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [routeFilter, setRouteFilter] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState("");
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [team, setTeam] = useState<Array<Person & { roles: string[]; approvedRoles: string[]; fingerprint?: string | null }>>([]);
  const [pending, setPending] = useState<Array<{ id: string; name: string; roles: string[]; fingerprint: string }>>([]);
  const [changes, setChanges] = useState<Array<{ id: string; actor: string | null; type: string; detail: string | null; at: string }>>([]);
  const lastActive = useRef(Date.now());
  const detailRef = useRef<HTMLDivElement | null>(null);

  const [mfaCode, setMfaCode] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaEnrol, setMfaEnrol] = useState<{ qr: string; secret: string } | null>(null);

  const loadMe = useCallback(async () => {
    setLoading(true);
    setProblem("");
    try {
      setMe(await api<Me>({ action: "me" }));
    } catch (failure) {
      setMe(null);
      setProblem(failure instanceof Error ? failure.message : "Speak Up could not be opened.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  const lock = useCallback(() => {
    setPrivateKey(null);
    setDetail(null);
    setPassphrase("");
    setPassphraseAgain("");
    setCases([]);
    setCasesLoaded(false);
    setMessage("Locked. Enter your passphrase to read cases.");
  }, []);

  // lock again after a quiet spell, so an unattended screen does not stay open
  useEffect(() => {
    if (!privateKey) return;
    const touch = () => { lastActive.current = Date.now(); };
    const events = ["pointerdown", "keydown", "scroll"] as const;
    events.forEach((name) => window.addEventListener(name, touch));
    const timer = window.setInterval(() => {
      if (Date.now() - lastActive.current > AUTO_LOCK_MS) lock();
    }, 20_000);
    return () => {
      events.forEach((name) => window.removeEventListener(name, touch));
      window.clearInterval(timer);
    };
  }, [privateKey, lock]);

  const loadCases = useCallback(async () => {
    const data = await api<{ cases: CaseSummary[] }>({ action: "list" });
    setCases(data.cases);
    setCasesLoaded(true);
    setMessage(`Loaded ${data.cases.length} case${data.cases.length === 1 ? "" : "s"}.`);
  }, []);

  useEffect(() => {
    if (!privateKey) return;
    setMessage("Loading cases...");
    void loadCases().catch((failure) => setError(failure instanceof Error ? failure.message : "The cases could not be loaded."));
  }, [privateKey, loadCases]);

  // ---- second factor --------------------------------------------------------------------------

  const needsMfa = Boolean(me?.mfaRequired && me.mfaLevel !== "aal2");

  useEffect(() => {
    if (!needsMfa) return;
    void (async () => {
      const { data } = await supabase.auth.mfa.listFactors();
      const verified = data?.totp?.find((factor) => factor.status === "verified");
      if (verified) {
        setMfaFactorId(verified.id);
        setMfaEnrol(null);
        return;
      }
      // clear out an abandoned set-up before starting again
      for (const factor of data?.all || []) if (factor.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: factor.id });
      const enrolled = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Speak Up" });
      if (enrolled.error || !enrolled.data) {
        setError(enrolled.error?.message || "Two-step sign-in could not be set up. Check that MFA (TOTP) is switched on in Supabase.");
        return;
      }
      setMfaFactorId(enrolled.data.id);
      setMfaEnrol({ qr: enrolled.data.totp.qr_code, secret: enrolled.data.totp.secret });
    })();
  }, [needsMfa]);

  async function confirmMfa() {
    setBusy(true);
    setError("");
    try {
      const { error: failure } = await supabase.auth.mfa.challengeAndVerify({ factorId: mfaFactorId, code: mfaCode.trim() });
      if (failure) throw new Error(failure.message);
      setMfaCode("");
      await loadMe();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "That code was not accepted.");
    } finally {
      setBusy(false);
    }
  }

  // ---- keys -----------------------------------------------------------------------------------

  // Before any case is opened: the public key the IMS holds for this handler must really belong to their private key
  // (otherwise someone has swapped it), and must be the same key this device saw when it was set up.
  async function checkOwnKey(key: CryptoKey) {
    if (!me?.publicKey) return;
    const probe = await generateCaseKey();
    let matches = false;
    try {
      const back = await unwrapCaseKey(key, await wrapCaseKeyForHandler(probe, me.publicKey));
      const first = new Uint8Array(await crypto.subtle.exportKey("raw", probe));
      const second = new Uint8Array(await crypto.subtle.exportKey("raw", back));
      matches = first.length === second.length && first.every((value, index) => value === second[index]);
    } catch {
      matches = false;
    }
    if (!matches) throw new Error("The key the IMS holds for you does not match your passphrase-protected key. Do not open any cases. Tell HR and the IMS administrator straight away.");
    const fingerprint = await keyFingerprint(me.publicKey);
    let pinned: string | null = null;
    try {
      pinned = window.localStorage.getItem(`speak-up-key-${me.id}`);
    } catch {
      pinned = null;
    }
    if (pinned && pinned !== fingerprint) throw new Error("Your Speak Up key has changed since you set it up on this device. Do not open any cases. Tell HR and the IMS administrator straight away.");
    try {
      if (!pinned) window.localStorage.setItem(`speak-up-key-${me.id}`, fingerprint);
    } catch {
      // the check above still applies without a saved copy
    }
  }

  async function createKeys() {
    setError("");
    const issue = passphraseProblem(passphrase);
    if (issue) return setError(issue);
    if (passphrase !== passphraseAgain) return setError("The two passphrases do not match.");
    setBusy(true);
    setMessage("Creating your key...");
    try {
      const pair = await generateHandlerKeyPair();
      const protectedKey = await protectPrivateKey(pair.privateKey, passphrase);
      await api({ action: "setup-keys", publicKey: pair.publicKey, encryptedPrivateKey: protectedKey });
      try {
        if (me) window.localStorage.setItem(`speak-up-key-${me.id}`, await keyFingerprint(pair.publicKey));
      } catch {
        // the fingerprint is also checked against the IMS record each time
      }
      setPrivateKey(await unlockPrivateKey(protectedKey, passphrase));
      setPassphrase("");
      setPassphraseAgain("");
      lastActive.current = Date.now();
      await loadMe();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Your key could not be created.");
    } finally {
      setBusy(false);
    }
  }

  async function unlock() {
    if (!me?.encryptedPrivateKey) return;
    setBusy(true);
    setError("");
    try {
      const unlocked = await unlockPrivateKey(me.encryptedPrivateKey, passphrase);
      await checkOwnKey(unlocked);
      setPrivateKey(unlocked);
      setPassphrase("");
      lastActive.current = Date.now();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "That passphrase is not right.");
    } finally {
      setBusy(false);
    }
  }

  // ---- cases ----------------------------------------------------------------------------------

  async function openCase(caseId: string) {
    if (!privateKey) return;
    setBusy(true);
    setError("");
    setMessage("Opening case...");
    try {
      const raw = await api<CaseDetailRaw>({ action: "get", caseId });
      const caseKey = await unwrapCaseKey(privateKey, raw.wrappedKey);
      const read = (cipher: string, iv: string) => decryptText(caseKey, cipher, iv).catch(() => "(could not be read)");
      setDetail({
        raw,
        caseKey,
        body: await read(raw.bodyCipher, raw.bodyIv),
        contact: raw.contactCipher && raw.contactIv ? await read(raw.contactCipher, raw.contactIv) : null,
        messages: await Promise.all(raw.messages.map(async (entry) => ({ id: entry.id, authorRole: entry.authorRole, authorName: entry.authorName, createdAt: entry.createdAt, text: await read(entry.cipher, entry.iv) }))),
        evidence: await Promise.all(raw.evidence.map(async (file) => ({ id: file.id, name: await read(file.nameCipher, file.nameIv), size: file.size, fileIv: file.fileIv }))),
      });
      setMessage(`Opened ${raw.case.reference}.`);
      window.setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The case could not be opened.");
    } finally {
      setBusy(false);
    }
  }

  async function afterChange(note: string) {
    if (detail) await openCase(detail.raw.case.id);
    await loadCases();
    setMessage(note);
  }

  async function loadTeam() {
    const [data, waiting, log] = await Promise.all([
      api<{ handlers: Array<{ id: string; name: string; roles: string[]; approvedRoles: string[]; publicKey: JsonWebKey | null }> }>({ action: "handler-keys" }),
      api<{ pending: Array<{ id: string; name: string; roles: string[]; fingerprint: string }> }>({ action: "pending" }),
      api<{ entries: Array<{ id: string; actor: string | null; type: string; detail: string | null; at: string }> }>({ action: "admin-log" }),
    ]);
    setTeam(await Promise.all(data.handlers.map(async (person) => ({ ...person, fingerprint: person.publicKey ? await keyFingerprint(person.publicKey) : null }))));
    setPending(waiting.pending);
    setChanges(log.entries);
  }

  async function approve(person: { id: string; name: string }, role: string) {
    if (!window.confirm(`Approve ${person.name} to receive Speak Up reports as ${role === "independent" ? "an independent handler" : "a case handler"}?\n\nFirst ask them to read out the fingerprint shown on their own Handlers tab, and check it matches the one shown here.`)) return;
    setBusy(true);
    setError("");
    try {
      await api({ action: "approve", handlerId: person.id, role });
      await loadTeam();
      setMessage(`${person.name} was approved.`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The approval did not work.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (privateKey) void loadTeam().catch((failure) => setError(failure instanceof Error ? failure.message : "The handlers could not be loaded."));
  }, [privateKey, tab]);

  async function deleteCase(item: CaseSummary) {
    if (!window.confirm(`Permanently delete ${item.reference} and its files? This cannot be undone.`)) return;
    setBusy(true);
    setError("");
    try {
      await api({ action: "delete-case", caseId: item.id });
      await loadCases();
      setMessage(`${item.reference} was deleted.`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The case could not be deleted.");
    } finally {
      setBusy(false);
    }
  }

  // An emailed link (/speak-up/cases?case=...) opens that case once the handler has signed in and unlocked.
  const deepLink = useRef<string | null>(null);
  useEffect(() => {
    deepLink.current = new URLSearchParams(window.location.search).get("case");
  }, []);
  useEffect(() => {
    const target = deepLink.current;
    if (!target || !privateKey || !casesLoaded) return;
    deepLink.current = null;
    window.history.replaceState(null, "", window.location.pathname);
    if (cases.some((item) => item.id === target)) void openCase(target);
     
  }, [privateKey, casesLoaded, cases]);

  // ---- render ---------------------------------------------------------------------------------

  const statusLine = error ? <><strong>Status:</strong> {error}</> : <><strong>Status:</strong> {message || (loading ? "Loading..." : "Ready.")}</>;

  const shell = (title: string, content: ReactNode, actions?: ReactNode) => (
    <main>
      <QualityPageHero label="SPEAK UP" title={title} description="Confidential reports from staff, read only by the named case handlers." />
      <ImsTopMetaRow status={statusLine} actions={actions} />
      {content}
    </main>
  );

  if (loading) return shell("Speak Up Cases", <ImsPanel title="Speak Up"><p style={paraStyle}>Loading Speak Up...</p></ImsPanel>);

  if (!me) {
    return shell("Speak Up Cases", <ImsPanel title="Speak Up"><div style={errorStyle}>{problem}</div></ImsPanel>);
  }

  if (needsMfa) {
    return shell("Confirm it is you", (
      <ImsPanel title="Second sign-in step" subtitle="Reports are confidential, so Speak Up asks for a code from an authenticator app such as Microsoft Authenticator.">
        <div style={narrowStyle}>
          {mfaEnrol ? (
            <>
              <p style={paraStyle}>First time: scan this code with the app, then enter the 6-digit number it shows.</p>
              { }
              <img src={mfaEnrol.qr} alt="Authenticator set-up code" width={180} height={180} style={{ background: imsColours.panel, padding: "8px", borderRadius: "10px", border: `1px solid ${imsColours.border}` }} />
              <p style={smallStyle}>Cannot scan it? Enter this key in the app: {mfaEnrol.secret}</p>
            </>
          ) : <p style={paraStyle}>Enter the 6-digit number from your authenticator app.</p>}
          <Field label="6-digit code">
            <input id="speak-up-mfa" style={imsInputStyle} inputMode="numeric" autoComplete="one-time-code" value={mfaCode} onChange={(event) => setMfaCode(event.target.value)} />
          </Field>
          <div style={rowStyle}><ImsButton disabled={busy || mfaCode.trim().length < 6 || !mfaFactorId} onClick={() => void confirmMfa()}>Confirm</ImsButton></div>
        </div>
      </ImsPanel>
    ));
  }

  if (!me.publicKey) {
    return shell("Set up your case key", (
      <ImsPanel title="Your case key" subtitle={`Hello ${me.name}. Reports are locked so that only handlers can read them.`}>
        <div style={narrowStyle}>
          <div style={noticeStyle}><strong>Nobody can recover this passphrase, including the IMS administrator.</strong> If you forget it you will lose access to existing cases until another handler is given them again. Store it in your password manager.</div>
          <Field label="Passphrase (at least 14 characters)">
            <input id="speak-up-pass" type="password" style={imsInputStyle} autoComplete="new-password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} />
          </Field>
          <Field label="Repeat passphrase">
            <input id="speak-up-pass-again" type="password" style={imsInputStyle} autoComplete="new-password" value={passphraseAgain} onChange={(event) => setPassphraseAgain(event.target.value)} />
          </Field>
          <div style={rowStyle}><ImsButton disabled={busy} onClick={() => void createKeys()}>{busy ? "Creating your key..." : "Create my key"}</ImsButton></div>
        </div>
      </ImsPanel>
    ));
  }

  if (!privateKey) {
    return shell("Unlock Speak Up", (
      <ImsPanel title="Unlock" subtitle="Your passphrase stays on this device. The screen locks again after 15 quiet minutes.">
        <div style={narrowStyle}>
          <Field label="Passphrase">
            <input id="speak-up-unlock" type="password" style={imsInputStyle} autoComplete="current-password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void unlock(); }} />
          </Field>
          <div style={rowStyle}><ImsButton disabled={busy || !passphrase} onClick={() => void unlock()}>{busy ? "Unlocking..." : "Unlock"}</ImsButton></div>
        </div>
      </ImsPanel>
    ));
  }

  const openCases = cases.filter((item) => item.status !== "Closed");
  const attention = openCases.filter((item) => slaChips(item).some((chip) => chip.tone === "bad"));
  const unassigned = openCases.filter((item) => !item.assignedTo);
  const dueForDeletion = cases.filter(isDueForDeletion);
  const query = search.trim().toLowerCase();
  const visible = cases.filter((item) => {
    if (!showClosed && !statusFilter && item.status === "Closed") return false;
    if (statusFilter && item.status !== statusFilter) return false;
    if (routeFilter === "independent" && !item.involvesSenior) return false;
    if (routeFilter === "normal" && item.involvesSenior) return false;
    if (assignmentFilter === "mine" && item.assignedTo !== me.id) return false;
    if (assignmentFilter === "unassigned" && item.assignedTo) return false;
    if (attentionOnly && !slaChips(item).length) return false;
    if (query && !`${item.reference} ${item.category} ${item.status}`.toLowerCase().includes(query)) return false;
    return true;
  });

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setRouteFilter("");
    setAssignmentFilter("");
    setAttentionOnly(false);
    setShowClosed(false);
  };

  return (
    <main>
      <QualityPageHero label="SPEAK UP" title="Speak Up Cases" description="Confidential reports from staff, read only by the named case handlers." />
      <ImsTopMetaRow
        status={statusLine}
        actions={<ImsButton variant="secondary" onClick={lock}>Lock now</ImsButton>}
      />
      {team.some((person) => person.id === me.id && person.roles.some((role) => !person.approvedRoles.includes(role))) ? (
        <div style={{ ...noticeStyle, marginBottom: "16px" }}>You are waiting for approval from another handler, so you will not receive new reports yet. You can still open any cases already shared with you.</div>
      ) : null}
      {pending.length ? (
        <div style={{ ...noticeStyle, marginBottom: "16px" }}>{pending.length === 1 ? "One person is" : `${pending.length} people are`} waiting for your approval. Open the Handlers tab to review.</div>
      ) : null}
      <ImsTabs
        tabs={[{ value: "cases", label: "Cases" }, { value: "retention", label: "Due for deletion" }, { value: "team", label: "Handlers" }]}
        active={tab}
        onChange={(value) => { setTab(value); setError(""); }}
        ariaLabel="Speak Up views"
      />

      {tab === "cases" ? (
        <div style={stackStyle}>
          <section style={kpiGridStyle}>
            <QualityKpiCard title="Open cases" value={openCases.length} accent={imsColours.brand} onClick={() => { clearFilters(); }} />
            <QualityKpiCard title="Overdue" value={attention.length} accent={imsColours.danger} onClick={() => { clearFilters(); setAttentionOnly(true); }} active={attentionOnly} />
            <QualityKpiCard title="Unassigned" value={unassigned.length} accent={imsColours.warning} onClick={() => { clearFilters(); setAssignmentFilter("unassigned"); }} active={assignmentFilter === "unassigned"} />
            <QualityKpiCard title="Due for deletion" value={dueForDeletion.length} accent={imsColours.muted} onClick={() => setTab("retention")} />
          </section>

          <ImsFilterPanel search={search} onSearchChange={setSearch} searchPlaceholder="Search reference, category or status" showFilters={showFilters} onToggleFilters={() => setShowFilters((value) => !value)} actions={<ImsButton variant="secondary" onClick={clearFilters}>Clear Filters</ImsButton>}>
            <div style={imsFormGridStyle}>
              <Field label="Status">
                <select id="speak-up-filter-status" style={imsInputStyle} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="">All open</option>
                  {SPEAK_UP_STATUSES.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
                </select>
              </Field>
              <Field label="Assignment">
                <select id="speak-up-filter-assignment" style={imsInputStyle} value={assignmentFilter} onChange={(event) => setAssignmentFilter(event.target.value)}>
                  <option value="">All</option>
                  <option value="mine">Assigned to me</option>
                  <option value="unassigned">Unassigned</option>
                </select>
              </Field>
              <Field label="Route">
                <select id="speak-up-filter-route" style={imsInputStyle} value={routeFilter} onChange={(event) => setRouteFilter(event.target.value)}>
                  <option value="">All</option>
                  <option value="normal">Case handlers</option>
                  <option value="independent">Independent handler</option>
                </select>
              </Field>
              <Field label="Closed cases">
                <select id="speak-up-filter-closed" style={imsInputStyle} value={showClosed ? "show" : "hide"} onChange={(event) => setShowClosed(event.target.value === "show")}>
                  <option value="hide">Hide closed</option>
                  <option value="show">Include closed</option>
                </select>
              </Field>
            </div>
          </ImsFilterPanel>

          <ImsPanel title="Case register" subtitle="Click a case to open it.">
            <div style={{ overflowX: "auto" }}>
              <table className="ims-data-table" style={{ width: "100%" }}>
                <thead>
                  <tr><th>Reference</th><th>Category</th><th>Status</th><th>Assigned to</th><th>Route</th><th>Reporter</th><th>Received</th><th>Outcome</th><th>Keep until</th><th>Deadlines</th></tr>
                </thead>
                <tbody>
                  {visible.length === 0 ? <tr><td colSpan={10}>{casesLoaded ? "No cases match." : "Loading..."}</td></tr> : null}
                  {visible.map((item) => (
                    <tr key={item.id} onClick={() => void openCase(item.id)} style={{ cursor: "pointer" }} data-selected={detail?.raw.case.id === item.id ? "true" : undefined}>
                      <td><strong>{item.reference}</strong></td>
                      <td>{item.category}</td>
                      <td><Chip text={item.status} /></td>
                      <td>{item.assignedTo ? (item.assignedToName || "Another handler") : item.status === "Closed" ? "-" : <Chip text="Unassigned" tone="warn" />}</td>
                      <td>{item.involvesSenior ? "Independent" : "Case handlers"}</td>
                      <td>{item.mode === "anonymous" ? "Anonymous" : item.mode === "confidential" ? "Confidential" : "Named"}</td>
                      <td>{dateText(item.receivedAt)}</td>
                      <td>{item.outcome ? SPEAK_UP_OUTCOME_LABELS[item.outcome as SpeakUpOutcome] || item.outcome : "-"}</td>
                      <td>{item.retentionUntil ? dateText(item.retentionUntil) : "-"}</td>
                      <td><span style={rowStyle}>{slaChips(item).length ? slaChips(item).map((chip) => <Chip key={chip.text} text={chip.text} tone={chip.tone} />) : "-"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ImsPanel>

          <div ref={detailRef}>
            {detail ? (
              <CaseView
                key={detail.raw.case.id}
                detail={detail}
                me={me}
                busy={busy}
                setBusy={setBusy}
                setError={setError}
                onClose={() => setDetail(null)}
                onChanged={(note) => void afterChange(note)}
                onPassedOn={() => { setDetail(null); void loadCases().then(() => setMessage("The case was passed on and you no longer have access to it.")); }}
              />
            ) : <ImsPanel title="Case detail"><p style={smallStyle}>Click a case in the register to open the full detail panel.</p></ImsPanel>}
          </div>
        </div>
      ) : null}

      {tab === "retention" ? (
        <ImsPanel title="Closed cases past their retention date" subtitle="Closed cases are kept for 12 months when no further action was taken and 6 years when action was taken (to be confirmed by HR and legal).">
          {dueForDeletion.length === 0 ? <p style={paraStyle}>Nothing is due for deletion.</p> : (
            <div style={{ overflowX: "auto" }}>
              <table className="ims-data-table" style={{ width: "100%" }}>
                <thead><tr><th>Reference</th><th>Closed</th><th>Keep until</th><th>Outcome</th><th>Action</th></tr></thead>
                <tbody>
                  {dueForDeletion.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.reference}</strong></td>
                      <td>{dateText(item.closedAt)}</td>
                      <td>{dateText(item.retentionUntil)}</td>
                      <td>{SPEAK_UP_OUTCOME_LABELS[item.outcome as SpeakUpOutcome] || "-"}</td>
                      <td><ImsButton variant="danger" disabled={busy} onClick={() => void deleteCase(item)}>Delete permanently</ImsButton></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ImsPanel>
      ) : null}

      {tab === "team" ? (
        <div style={stackStyle}>
        {pending.length ? (
          <ImsPanel title="Waiting for your approval" subtitle="These people have been added by the IMS administrator and have set up a key, but they will not receive reports until a current handler approves them. This stops anyone being added without HR knowing.">
            <div style={stackStyle}>
              <div style={noticeStyle}>Before you approve someone, ask them to read out the fingerprint shown on their own Handlers tab, in person or by phone, and check it matches the one below.</div>
              <div style={{ overflowX: "auto" }}>
                <table className="ims-data-table" style={{ width: "100%" }}>
                  <thead><tr><th>Name</th><th>Role</th><th>Fingerprint</th><th>Action</th></tr></thead>
                  <tbody>
                    {pending.flatMap((person) => person.roles.map((role) => (
                      <tr key={`${person.id}-${role}`}>
                        <td><strong>{person.name}</strong></td>
                        <td>{role === "independent" ? "Independent handler" : "Case handler"}</td>
                        <td>{person.fingerprint}</td>
                        <td><ImsButton disabled={busy} onClick={() => void approve(person, role)}>Approve</ImsButton></td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>
            </div>
          </ImsPanel>
        ) : null}
        <ImsPanel title="Handlers" subtitle="Handlers deal with ordinary reports. The independent handler receives reports that involve HR, management or IT. The IMS administrator adds or removes people, but cannot approve them: a person only receives reports once a current handler has approved them, and can only read a case once they have a key and have been given that case. Check that your own fingerprint here matches the one the administrator sees. If it ever changes without you creating a new key, tell the administrator and HR straight away.">
          <div style={{ overflowX: "auto" }}>
            <table className="ims-data-table" style={{ width: "100%" }}>
              <thead><tr><th>Name</th><th>Role</th><th>Approval</th><th>Key fingerprint</th></tr></thead>
              <tbody>
                {team.map((person) => (
                  <tr key={person.id}>
                    <td><strong>{person.name}</strong></td>
                    <td><span style={rowStyle}>{person.roles.map((role) => <Chip key={role} text={role === "independent" ? "Independent" : "Handler"} />)}</span></td>
                    <td><span style={rowStyle}>{person.roles.map((role) => <Chip key={role} text={person.approvedRoles.includes(role) ? "Approved" : "Waiting"} tone={person.approvedRoles.includes(role) ? "plain" : "warn"} />)}</span></td>
                    <td>{person.publicKey ? <span style={{ display: "grid", gap: "4px", justifyItems: "start" }}><Chip text={person.id === me.id ? "Set up (you)" : "Set up"} /><span style={smallStyle}>{person.fingerprint}</span></span> : <Chip text="Not set up yet" tone="warn" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ImsPanel>
        <ImsPanel title="Recent changes to the handler list" subtitle="Everything done to the list of handlers, by the administrator or by handlers. Each change is also emailed to every handler.">
          {changes.length === 0 ? <p style={smallStyle}>No changes recorded yet.</p> : (
            <div style={stackStyle}>
              {changes.map((entry) => (
                <p key={entry.id} style={paraStyle}>{dateTimeText(entry.at)}. {entry.actor || "System"}: {entry.type.replace(/_/g, " ")}{entry.detail ? ` (${entry.detail})` : ""}</p>
              ))}
            </div>
          )}
        </ImsPanel>
        </div>
      ) : null}
    </main>
  );
}

// ---- one case -------------------------------------------------------------------------------------

function CaseView(props: {
  detail: CaseDetail;
  me: Me;
  busy: boolean;
  setBusy: (value: boolean) => void;
  setError: (value: string) => void;
  onClose: () => void;
  onChanged: (note: string) => void;
  onPassedOn: () => void;
}) {
  const { detail, me, busy, setBusy, setError, onClose, onChanged, onPassedOn } = props;
  const item = detail.raw.case;
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState(item.status);
  const [outcome, setOutcome] = useState<SpeakUpOutcome | "">((item.outcome as SpeakUpOutcome) || "");
  const [reason, setReason] = useState("");
  const [showRecuse, setShowRecuse] = useState(false);
  const [grantId, setGrantId] = useState("");
  const [assignId, setAssignId] = useState("");
  const [preview, setPreview] = useState<{ id: string; url: string } | null>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  };

  const sendReply = () => run(async () => {
    const encrypted = await encryptText(detail.caseKey, reply.trim());
    await api({ action: "reply", caseId: item.id, cipher: encrypted.cipher, iv: encrypted.iv });
    setReply("");
    onChanged("Message sent to the reporter.");
  });

  const updateStatus = () => run(async () => {
    await api({ action: "set-status", caseId: item.id, status, outcome: status === "Closed" ? outcome : undefined });
    onChanged(`Status updated to ${status}.`);
  });

  const assign = (handlerId: string | null) => run(async () => {
    await api({ action: "assign", caseId: item.id, handlerId });
    setAssignId("");
    onChanged(handlerId ? (handlerId === me.id ? "The case is now assigned to you." : "The case was assigned.") : "The case was returned to the unassigned list.");
  });

  const grant = () => run(async () => {
    const person = detail.raw.eligible.find((entry) => entry.id === grantId);
    if (!person?.publicKey) throw new Error("Choose who to share the case with.");
    await api({ action: "grant", caseId: item.id, wraps: [{ handlerId: person.id, wrappedKey: await wrapCaseKeyForHandler(detail.caseKey, person.publicKey) }] });
    setGrantId("");
    onChanged(`Case shared with ${person.name}.`);
  });

  // Passing a case on: the other group is the one this handler does not belong to.
  const target: "handler" | "independent" = item.involvesSenior ? "handler" : "independent";
  const targetLabel = target === "independent" ? "the independent handler" : "the case handlers";
  const canRecuse = !me.roles.includes(target);

  const recuse = () => run(async () => {
    const { handlers } = await api<{ handlers: Array<{ id: string; roles: string[]; approvedRoles: string[]; publicKey: JsonWebKey | null }> }>({ action: "handler-keys" });
    const recipients = handlers.filter((entry) => entry.publicKey && entry.roles.includes(target) && entry.approvedRoles.includes(target) && entry.id !== me.id);
    if (!recipients.length) throw new Error("Nobody approved in that group has set up a key yet.");
    const wraps = await Promise.all(recipients.map(async (entry) => ({ handlerId: entry.id, wrappedKey: await wrapCaseKeyForHandler(detail.caseKey, entry.publicKey!) })));
    await api({ action: "recuse", caseId: item.id, reason, target, wraps });
    onPassedOn();
  });

  const showFile = (file: CaseDetail["evidence"][number]) => run(async () => {
    const { url } = await api<{ url: string }>({ action: "evidence-url", caseId: item.id, evidenceId: file.id });
    const response = await fetch(url);
    if (!response.ok) throw new Error("The file could not be downloaded.");
    const plain = await decryptBytes(detail.caseKey, new Uint8Array(await response.arrayBuffer()), file.fileIv);
    setPreview({ id: file.id, url: URL.createObjectURL(new Blob([plain as BlobPart], { type: "image/jpeg" })) });
  });

  return (
    <div style={stackStyle}>
      <ImsPanel title={item.reference} subtitle={`${item.category}. Received ${dateText(item.receivedAt)}.`} actions={<ImsButton variant="secondary" onClick={onClose}>Close</ImsButton>}>
        <div style={stackStyle}>
          <span style={rowStyle}>
            <Chip text={item.status} />
            {item.involvesSenior ? <Chip text="Independent route" /> : null}
            {item.assignedTo ? <Chip text={`Assigned to ${item.assignedToName || "a handler"}`} /> : item.status !== "Closed" ? <Chip text="Unassigned" tone="warn" /> : null}
            {item.outcome ? <Chip text={`Outcome: ${SPEAK_UP_OUTCOME_LABELS[item.outcome as SpeakUpOutcome] || item.outcome}`} /> : null}
            {item.retentionUntil ? <Chip text={`Keep until ${dateText(item.retentionUntil)}`} /> : null}
            {slaChips(item).map((chip) => <Chip key={chip.text} text={chip.text} tone={chip.tone} />)}
          </span>
          <p style={smallStyle}>Acknowledge by {dateText(item.acknowledgeBy)}. Feedback by {dateText(item.feedbackBy)}.{detail.raw.reporterGroup ? ` Reporter: ${detail.raw.reporterGroup}.` : ""}</p>
          <h3 style={subheadingStyle}>Report</h3>
          <p style={{ ...paraStyle, whiteSpace: "pre-wrap" }}>{detail.body}</p>
          {detail.contact ? <p style={paraStyle}><strong>Contact given:</strong> {detail.contact}</p> : <p style={smallStyle}>The reporter chose to stay anonymous. Reply below and they will see it when they check their case.</p>}
        </div>
      </ImsPanel>

      {detail.evidence.length ? (
        <ImsPanel title="Photos and screenshots">
          <div style={stackStyle}>
            {detail.evidence.map((file) => (
              <div key={file.id} style={{ display: "grid", gap: "8px" }}>
                <div style={rowStyle}>
                  <span style={paraStyle}>{file.name} ({Math.round(file.size / 1024)} KB)</span>
                  <ImsButton variant="secondary" disabled={busy} onClick={() => void showFile(file)}>View</ImsButton>
                </div>
                { }
                {preview?.id === file.id ? <img src={preview.url} alt={file.name} style={{ maxWidth: "100%", borderRadius: "10px", border: `1px solid ${imsColours.border}` }} /> : null}
              </div>
            ))}
          </div>
        </ImsPanel>
      ) : null}

      <ImsPanel title="Assigned to" subtitle="One handler looks after each case and is the only person emailed when the reporter writes back. Everyone who can open the case can still see it.">
        <div style={stackStyle}>
          <p style={paraStyle}>{item.assignedTo ? (item.assignedToName || "Another handler") : "Nobody yet. Every handler was emailed when this report arrived."}</p>
          {item.status !== "Closed" ? (
            <>
              <div style={rowStyle}>
                {item.assignedTo !== me.id ? <ImsButton disabled={busy} onClick={() => void assign(me.id)}>Assign to me</ImsButton> : null}
                {item.assignedTo ? <ImsButton variant="secondary" disabled={busy} onClick={() => void assign(null)}>Return to unassigned</ImsButton> : null}
              </div>
              {detail.raw.access.filter((person) => person.id !== me.id && person.id !== item.assignedTo).length ? (
                <div style={imsFormGridStyle}>
                  <Field label="Assign to another handler">
                    <select id="speak-up-assign" style={imsInputStyle} value={assignId} onChange={(event) => setAssignId(event.target.value)}>
                      <option value="">Choose a handler</option>
                      {detail.raw.access.filter((person) => person.id !== me.id && person.id !== item.assignedTo).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                    </select>
                  </Field>
                </div>
              ) : (
                <p style={smallStyle}>{detail.raw.eligible.length ? "To assign this case to a colleague, first share it with them under Who can see this case, below." : "No other approved handler can open this case yet, so it can only be assigned to you. Once a colleague has joined Speak Up and been approved, share the case with them and then assign it."}</p>
              )}
              {assignId ? <div style={rowStyle}><ImsButton variant="secondary" disabled={busy} onClick={() => void assign(assignId)}>Assign</ImsButton></div> : null}
            </>
          ) : null}
        </div>
      </ImsPanel>

      <ImsPanel title="Messages" subtitle="Conversation with the reporter. They see replies when they check their case.">
        <div style={stackStyle}>
          {detail.messages.length === 0 ? <p style={smallStyle}>No messages yet.</p> : null}
          {detail.messages.map((entry) => (
            <div key={entry.id} style={itemStyle}>
              <span style={smallStyle}>{entry.authorRole === "handler" ? entry.authorName || "Handler" : "Reporter"}, {dateTimeText(entry.createdAt)}</span>
              <span style={{ ...paraStyle, whiteSpace: "pre-wrap" }}>{entry.text}</span>
            </div>
          ))}
          {item.status !== "Closed" ? (
            <>
              <Field label="Message to the reporter">
                <textarea id="speak-up-handler-reply" style={imsTextareaStyle} value={reply} onChange={(event) => setReply(event.target.value)} />
              </Field>
              <p style={smallStyle}>Never ask for details the reporter has chosen not to give.</p>
              <div style={rowStyle}><ImsButton disabled={busy || !reply.trim()} onClick={() => void sendReply()}>Send message</ImsButton></div>
            </>
          ) : null}
        </div>
      </ImsPanel>

      <ImsPanel title="Status" subtitle="Closing a case sets its retention date. The reporter can still see the status, but not add messages.">
        <div style={imsFormGridStyle}>
          <Field label="Status">
            <select id="speak-up-status" style={imsInputStyle} value={status} onChange={(event) => setStatus(event.target.value)}>
              {SPEAK_UP_STATUSES.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
            </select>
          </Field>
          {status === "Closed" ? (
            <Field label="Outcome">
              <select id="speak-up-outcome" style={imsInputStyle} value={outcome} onChange={(event) => setOutcome(event.target.value as SpeakUpOutcome)}>
                <option value="">Choose one</option>
                {(Object.keys(SPEAK_UP_OUTCOME_LABELS) as SpeakUpOutcome[]).map((entry) => <option key={entry} value={entry}>{SPEAK_UP_OUTCOME_LABELS[entry]}</option>)}
              </select>
            </Field>
          ) : null}
        </div>
        <div style={{ ...rowStyle, marginTop: "12px" }}>
          <ImsButton disabled={busy || status === item.status || (status === "Closed" && !outcome)} onClick={() => void updateStatus()}>Update status</ImsButton>
        </div>
      </ImsPanel>

      <ImsPanel title="Who can see this case">
        <div style={stackStyle}>
          <p style={paraStyle}>{detail.raw.access.map((person) => person.name).join(", ") || "Nobody"}</p>
          {detail.raw.eligible.length ? (
            <div style={imsFormGridStyle}>
              <Field label="Share with">
                <select id="speak-up-grant" style={imsInputStyle} value={grantId} onChange={(event) => setGrantId(event.target.value)}>
                  <option value="">Choose a handler</option>
                  {detail.raw.eligible.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                </select>
              </Field>
            </div>
          ) : null}
          {detail.raw.eligible.length ? <div style={rowStyle}><ImsButton variant="secondary" disabled={busy || !grantId} onClick={() => void grant()}>Share</ImsButton></div> : null}
          {canRecuse ? (
            showRecuse ? (
              <div style={stackStyle}>
                <div style={noticeStyle}>If you have a conflict of interest, pass this case to {targetLabel}. You will lose access to it straight away.</div>
                <Field label="Reason">
                  <input id="speak-up-reason" style={imsInputStyle} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="For example: the report concerns a colleague I work with closely" />
                </Field>
                <div style={rowStyle}>
                  <ImsButton variant="danger" disabled={busy || reason.trim().length < 3} onClick={() => void recuse()}>Pass to {targetLabel}</ImsButton>
                  <ImsButton variant="secondary" onClick={() => setShowRecuse(false)}>Cancel</ImsButton>
                </div>
              </div>
            ) : <div style={rowStyle}><ImsButton variant="secondary" onClick={() => setShowRecuse(true)}>I have a conflict of interest</ImsButton></div>
          ) : null}
        </div>
      </ImsPanel>

      <ImsPanel title="Activity log" subtitle="Records who did what and when. It never contains anything the reporter wrote.">
        <div style={stackStyle}>
          {detail.raw.audit.map((entry) => (
            <p key={entry.id} style={paraStyle}>{dateTimeText(entry.at)}. {entry.actor || "Reporter or system"}: {entry.type.replace(/_/g, " ")}{entry.detail ? ` (${entry.detail})` : ""}</p>
          ))}
        </div>
      </ImsPanel>
    </div>
  );
}

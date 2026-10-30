"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { downloadSpeakUpPoster } from "../../lib/speakUpPoster";
import { ImsButton, ImsPanel } from "../ImsPrimitives";
import { imsColours, imsFieldStyle, imsFormGridStyle, imsInputStyle, imsLabelStyle } from "../imsTheme";

type AdminHandler = {
  id: string;
  email: string;
  name: string;
  roles: string[];
  approvedRoles: string[];
  active: boolean;
  keySetUp: boolean;
  fingerprint: string | null;
};

type RoleChoice = "handler" | "independent" | "both";

const stackStyle: CSSProperties = { display: "grid", gap: "14px" };
const paraStyle: CSSProperties = { margin: 0, fontSize: "14px", lineHeight: 1.55, color: imsColours.ink };
const smallStyle: CSSProperties = { margin: 0, fontSize: "13px", lineHeight: 1.5, color: imsColours.muted };
const noticeStyle: CSSProperties = { ...paraStyle, padding: "10px 12px", borderRadius: "10px", border: `1px solid ${imsColours.warning}`, background: imsColours.page };
const rowStyle: CSSProperties = { display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" };

function roleChoice(roles: string[]): RoleChoice {
  if (roles.includes("handler") && roles.includes("independent")) return "both";
  return roles.includes("independent") ? "independent" : "handler";
}

function rolesFor(choice: RoleChoice) {
  return choice === "both" ? ["handler", "independent"] : [choice];
}

async function api<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/speak-up/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = (await response.json().catch(() => ({}))) as { error?: string; code?: string } & T;
  if (!response.ok) throw Object.assign(new Error(result.error || "The request could not be completed."), { code: result.code });
  return result;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={imsFieldStyle}>
      <span style={imsLabelStyle}>{label}</span>
      {children}
    </label>
  );
}

function Chip({ text, tone = "plain" }: { text: string; tone?: "warn" | "plain" }) {
  const colour = tone === "warn" ? imsColours.warning : imsColours.brand;
  return <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "999px", border: `1px solid ${colour}`, color: imsColours.ink, fontSize: "11px", fontWeight: 800, whiteSpace: "nowrap" }}>{text}</span>;
}

export default function SpeakUpAdminPanel() {
  const [handlers, setHandlers] = useState<AdminHandler[]>([]);
  const [ready, setReady] = useState({ handler: 0, independent: 0 });
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [choice, setChoice] = useState<RoleChoice>("handler");
  const [address, setAddress] = useState("");

  const load = useCallback(async () => {
    const data = await api<{ handlers: AdminHandler[]; ready: { handler: number; independent: number }; siteUrl?: string }>({ action: "list" });
    setHandlers(data.handlers);
    setReady(data.ready);
    // start from the IMS's configured live address; a person who has already edited the box keeps their own
    setAddress((current) => current || `${data.siteUrl || window.location.origin}/speak-up`);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void load().catch((failure) => setError(failure instanceof Error ? failure.message : "The handler list could not be loaded."));
  }, [load]);

  const run = async (action: () => Promise<void>, done: string) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      await load();
      setMessage(done);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  };

  const addHandler = () => run(async () => {
    await api({ action: "add", name, email, roles: rolesFor(choice) });
    setName("");
    setEmail("");
    setChoice("handler");
  }, "Handler added. They need to sign in to the IMS and set up their key, and then a current handler has to approve them, before they receive reports. Every handler has been emailed.");

  const changeRole = (handler: AdminHandler, next: RoleChoice) => run(async () => {
    await api({ action: "update-roles", id: handler.id, roles: rolesFor(next) });
  }, `${handler.name}'s role was updated.`);

  const setActive = async (handler: AdminHandler, active: boolean) => {
    if (!active && !window.confirm(`Remove ${handler.name} from the handler list? They will no longer receive new reports or be able to open Speak Up.`)) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      try {
        await api({ action: "set-active", id: handler.id, active });
      } catch (failure) {
        if ((failure as { code?: string }).code !== "sole-holder") throw failure;
        if (!window.confirm(`${(failure as Error).message}\n\nRemove them anyway?`)) return;
        await api({ action: "set-active", id: handler.id, active, force: true });
      }
      await load();
      setMessage(active ? `${handler.name} was reactivated.` : `${handler.name} was removed from the handler list.`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  };

  const makePoster = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await downloadSpeakUpPoster(address.trim());
      setMessage("The poster was downloaded.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The poster could not be made.");
    } finally {
      setBusy(false);
    }
  };

  // a developer's machine or an office network address would not open on anyone's phone
  const isLocal = /localhost|127\.0\.0\.1|\[::1\]|^https?:\/\/(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(address.trim());

  return (
    <div style={stackStyle}>
      {error ? <div style={{ ...paraStyle, padding: "10px 12px", borderRadius: "10px", border: `1px solid ${imsColours.danger}`, background: imsColours.page }} role="alert">{error}</div> : null}
      {message ? <div style={{ ...paraStyle, padding: "10px 12px", borderRadius: "10px", border: `1px solid ${imsColours.border}`, background: imsColours.page }} role="status">{message}</div> : null}

      <ImsPanel title="Speak Up handlers" subtitle="Who can receive reports. You manage the list, but you cannot approve anyone: a new handler, a new role or a reactivated handler waits until a current handler approves them. Being on the list never gives access to a report by itself.">
        <div style={stackStyle}>
          {loaded && (ready.handler === 0 || ready.independent === 0) ? (
            <div style={noticeStyle}>
              {ready.handler === 0 ? "No approved case handler has a key yet, so ordinary reports cannot be accepted. " : ""}
              {ready.independent === 0 ? "No approved independent handler has a key yet, so reports that involve HR, management or IT cannot be accepted. " : ""}
              A person sets up their key the first time they open Speak Up in the IMS. The first person in each group is approved automatically; everyone after that needs a current handler to approve them.
            </div>
          ) : null}
          <div style={{ overflowX: "auto" }}>
            <table className="ims-data-table" style={{ width: "100%" }}>
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Approval</th><th>Key</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {!loaded ? <tr><td colSpan={7}>Loading...</td></tr> : null}
                {loaded && handlers.length === 0 ? <tr><td colSpan={7}>No handlers yet.</td></tr> : null}
                {handlers.map((handler) => (
                  <tr key={handler.id}>
                    <td><strong>{handler.name}</strong></td>
                    <td>{handler.email}</td>
                    <td>
                      <select id={`speak-up-role-${handler.id}`} aria-label={`Role for ${handler.name}`} style={imsInputStyle} value={roleChoice(handler.roles)} disabled={busy || !handler.active} onChange={(event) => void changeRole(handler, event.target.value as RoleChoice)}>
                        <option value="handler">Case handler</option>
                        <option value="independent">Independent handler</option>
                        <option value="both">Both</option>
                      </select>
                    </td>
                    <td><span style={rowStyle}>{handler.roles.map((role) => <Chip key={role} text={handler.approvedRoles.includes(role) ? "Approved" : "Waiting"} tone={handler.approvedRoles.includes(role) ? "plain" : "warn"} />)}</span></td>
                    <td>{handler.keySetUp ? <span style={{ display: "grid", gap: "4px" }}><Chip text="Set up" /><span style={smallStyle}>{handler.fingerprint}</span></span> : <Chip text="Not set up yet" tone="warn" />}</td>
                    <td><Chip text={handler.active ? "Active" : "Removed"} tone={handler.active ? "plain" : "warn"} /></td>
                    <td>
                      {handler.active
                        ? <ImsButton variant="danger" disabled={busy} onClick={() => void setActive(handler, false)}>Remove</ImsButton>
                        : <ImsButton variant="secondary" disabled={busy} onClick={() => void setActive(handler, true)}>Reactivate</ImsButton>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={smallStyle}>The key code under each name is a fingerprint. Each handler can see their own on their Handlers tab. If it ever differs from what they see, tell them straight away, because it means someone has changed their key.</p>
        </div>
      </ImsPanel>

      <ImsPanel title="Add a handler" subtitle="Use the work email address the person signs in to the IMS with.">
        <div style={stackStyle}>
          <div style={imsFormGridStyle}>
            <Field label="Name"><input id="speak-up-add-name" style={imsInputStyle} value={name} onChange={(event) => setName(event.target.value)} /></Field>
            <Field label="Work email"><input id="speak-up-add-email" style={imsInputStyle} type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
            <Field label="Role">
              <select id="speak-up-add-role" style={imsInputStyle} value={choice} onChange={(event) => setChoice(event.target.value as RoleChoice)}>
                <option value="handler">Case handler</option>
                <option value="independent">Independent handler (reports about HR, management or IT)</option>
                <option value="both">Both</option>
              </select>
            </Field>
          </div>
          <div style={rowStyle}><ImsButton disabled={busy || !name.trim() || !email.trim()} onClick={() => void addHandler()}>Add handler</ImsButton></div>
        </div>
      </ImsPanel>

      <ImsPanel title="Site poster" subtitle="An A4 poster with a QR code that opens the Speak Up page on a phone.">
        <div style={stackStyle}>
          <Field label="Address the QR code opens">
            <input id="speak-up-poster-address" style={imsInputStyle} value={address} onChange={(event) => setAddress(event.target.value)} />
          </Field>
          {isLocal ? <div style={noticeStyle}>This is a local address, which would not work on a phone, so the poster cannot be made from it. Open the IMS at its live address to make the poster, or type the live address above.</div> : null}
          <p style={smallStyle}>Use one shared address on every poster. Do not add a site name to it, because that would show which site a report came from and could narrow down who wrote it. Place posters out of camera view, and keep them separate from the Observation Card QR codes. The Dutch and Polish wording should be checked by a native speaker before printing.</p>
          <div style={rowStyle}><ImsButton disabled={busy || !address.trim() || isLocal} onClick={() => void makePoster()}>Download poster (PDF)</ImsButton></div>
        </div>
      </ImsPanel>
    </div>
  );
}

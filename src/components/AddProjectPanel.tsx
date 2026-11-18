"use client";

// Adds a project to the shared project list (admins only; the server enforces it). The project and its MOC numbering
// series are created together, so it is immediately available in Project Management, Create MOC and the client MOC report.

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { ImsButton, ImsPanel } from "./ImsPrimitives";
import { refreshProjectRegistry, useProjectRegistry } from "../lib/useProjectRegistry";
import { cleanParts } from "../lib/projectList";

export function AddProjectPanel({ onAdded }: { onAdded?: (name: string) => void }) {
  const { projects } = useProjectRegistry();
  const [name, setName] = useState("");
  const [prefix, setPrefix] = useState("");
  const [parts, setParts] = useState<string[]>([]);
  const [partInput, setPartInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const cleanPrefix = prefix.trim().toUpperCase();
  const problem = useMemo(() => {
    if (cleanPrefix && !/^[A-Z]{3,4}$/.test(cleanPrefix)) return "The prefix must be 3 or 4 letters.";
    const clashPrefix = projects.find((project) => project.mocPrefix === cleanPrefix);
    if (cleanPrefix && clashPrefix) return `The prefix ${cleanPrefix} is already used by ${clashPrefix.name}.`;
    const trimmed = name.trim().toLowerCase();
    if (trimmed && projects.some((project) => project.name.toLowerCase() === trimmed)) return "A project with that name already exists.";
    return "";
  }, [cleanPrefix, name, projects]);
  const ready = name.trim().length >= 2 && /^[A-Z]{3,4}$/.test(cleanPrefix) && !problem && !saving;

  function commitPart() {
    const next = cleanParts([...parts, partInput]);
    setParts(next);
    setPartInput("");
  }

  async function add() {
    if (!ready) return;
    setSaving(true);
    setError("");
    setDone("");
    try {
      const response = await fetch("/api/project-registry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, prefix: cleanPrefix, parts: partInput.trim() ? cleanParts([...parts, partInput]) : parts }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Could not add the project.");
      await refreshProjectRegistry();
      setDone(`${payload.project.name} added. Its MOC numbers start at ${cleanPrefix}-MOC-001, and it is already available in Create MOC and in the project menu.`);
      onAdded?.(payload.project.name);
      setName("");
      setPrefix("");
      setParts([]);
      setPartInput("");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not add the project.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ImsPanel title="Add a project" subtitle="Add a project once and it appears everywhere, with its own MOC numbering. Admins only.">
      <div style={grid}>
        <label style={field}>
          <span style={label}>Project name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="For example: Baltic Power" autoComplete="off" />
        </label>
        <label style={field}>
          <span style={label}>MOC prefix</span>
          <input
            value={prefix}
            onChange={(event) => setPrefix(event.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4))}
            placeholder="3 to 4 letters"
            autoComplete="off"
            maxLength={4}
          />
          <span style={help}>Starts every MOC number for this project. It cannot be changed once the first MOC is raised.</span>
        </label>
        <div style={{ ...field, gridColumn: "1 / -1" }}>
          <span style={label}>Parts or sections (optional)</span>
          <div style={chipBox}>
            {parts.map((part) => (
              <span key={part} style={chip}>
                {part}
                <button type="button" aria-label={`Remove ${part}`} onClick={() => setParts(parts.filter((item) => item !== part))} style={chipRemove}>
                  ×
                </button>
              </span>
            ))}
            <input
              className="ims-bare-input"
              value={partInput}
              onChange={(event) => setPartInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === ",") {
                  event.preventDefault();
                  commitPart();
                } else if (event.key === "Backspace" && !partInput && parts.length) {
                  setParts(parts.slice(0, -1));
                }
              }}
              onBlur={() => partInput.trim() && commitPart()}
              placeholder={parts.length ? "" : "Type a part, press Enter"}
              aria-label="Add a part"
              style={chipInput}
            />
          </div>
          <span style={help}>If the project has parts (Wadden Sea has BA3, LW2 and LW4), people are asked which ones a MOC applies to. Leave this empty and that question never appears.</span>
        </div>
      </div>
      <div style={preview}>
        First MOC number will be <strong style={{ color: "#005670" }}>{/^[A-Z]{3,4}$/.test(cleanPrefix) ? `${cleanPrefix}-MOC-001` : "-"}</strong>
      </div>
      {problem || error ? <div role="alert" style={errorText}>{problem || error}</div> : null}
      {done ? <div style={success}>{done}</div> : null}
      <div>
        <ImsButton onClick={() => void add()} disabled={!ready}>
          {saving ? "Adding..." : "Add project"}
        </ImsButton>
      </div>
    </ImsPanel>
  );
}

const grid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: 12, alignItems: "start" };
const field: CSSProperties = { display: "grid", gap: 6, alignContent: "start" };
const label: CSSProperties = { fontSize: 13, fontWeight: 800, color: "#53565A" };
const help: CSSProperties = { fontSize: 12, fontWeight: 600, color: "#53565A" };
const chipBox: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", border: "1px solid #D0D0CE", borderRadius: 10, padding: "5px 8px", minHeight: 42, background: "#ffffff" };
const chip: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 4, background: "#EEF7F8", border: "1px solid #63B1BC", borderRadius: 99, padding: "2px 4px 2px 10px", fontWeight: 700, fontSize: 12.5, color: "#005670" };
const chipRemove: CSSProperties = { border: 0, background: "transparent", color: "#53565A", fontSize: 15, lineHeight: 1, padding: "0 5px", cursor: "pointer" };
const chipInput: CSSProperties = { border: 0, outline: 0, background: "transparent", flex: 1, minWidth: 100, height: 28, minHeight: 28, padding: 0, boxShadow: "none" };
const preview: CSSProperties = { background: "#F4F8F8", border: "1px dashed #D0D0CE", borderRadius: 10, padding: "10px 12px", color: "#53565A", fontWeight: 600 };
const errorText: CSSProperties = { fontSize: 13, fontWeight: 700, color: "#F93822" };
const success: CSSProperties = { background: "#EEF7F8", border: "1px solid #63B1BC", borderRadius: 10, padding: "10px 12px", fontWeight: 600 };

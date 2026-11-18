"use client";

import { useMemo, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import { Packer } from "docx";
import { QualityKpiCard } from "./QualityKpiCard";
import { imsColours } from "./imsTheme";
import { useUrlFlag, useUrlState } from "../lib/useUrlState";
import {
  MOC_PROJECTS,
  buildAnnex,
  actionsText,
  formatDate,
  implementationPeriod,
  isPastEnd,
  isToConfirm,
  nextStepText,
  parseMocWorkbook,
  type MocProject,
  type MocWorkbook,
} from "../lib/mocRegister";
import { buildMocPdf, buildMocWord, mocFileName } from "../lib/mocRegisterDocs";

// MOC Register annex. The register itself lives in a SharePoint workbook that the MOC coordinators keep up to date.
// Nothing is stored here: the workbook is read in the browser and turned into the Word / PDF annex for one project.

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function WaddenSeaMocRegister() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [workbook, setWorkbook] = useState<MocWorkbook | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [project, setProject] = useUrlState<MocProject>("moc_project", "BA3", [...MOC_PROJECTS]);
  const [reportDate, setReportDate] = useState(todayIso());
  const [hideClosed, setHideClosed] = useUrlFlag("moc_hide_closed");
  const [hideActions, setHideActions] = useUrlFlag("moc_hide_actions");

  const annex = useMemo(() => (workbook ? buildAnnex(workbook, project, { includeFinished: !hideClosed, reportDate }) : null), [workbook, project, hideClosed, reportDate]);
  const shownAnnex = annex && hideActions ? { ...annex, openActions: [], counts: { ...annex.counts, openActions: 0 } } : annex;

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    try {
      const parsed = parseMocWorkbook(await file.arrayBuffer());
      if (!parsed.mocs.length) throw new Error("No MOCs were found on the Register sheet.");
      setWorkbook(parsed);
      setFileName(file.name);
    } catch (problem) {
      setWorkbook(null);
      setFileName("");
      setError(problem instanceof Error ? problem.message : "The workbook could not be read.");
    }
  }

  async function makeWord() {
    if (!shownAnnex) return;
    setBusy(true);
    try {
      download(await Packer.toBlob(buildMocWord(shownAnnex)), mocFileName(shownAnnex, "docx"));
    } finally {
      setBusy(false);
    }
  }

  function makePdf() {
    if (!shownAnnex) return;
    download(buildMocPdf(shownAnnex).output("blob"), mocFileName(shownAnnex, "pdf"));
  }

  const toConfirm = shownAnnex?.rows.filter((row) => isToConfirm(row.status)) ?? [];
  const pastEnd = shownAnnex?.rows.filter((row) => isPastEnd(row, reportDate)) ?? [];

  return (
    <section style={shell} aria-label="MOC Register">
      <div style={panel}>
        <h2 style={heading}>MOC Register annex</h2>
        <p style={help}>
          Upload the MOC register workbook from SharePoint, choose the project and the report date, then check the preview and generate the annex. The workbook is read in your browser and is not stored here.
          Cost and the internal notes column are never included.
        </p>
        <div style={controls}>
          <label style={field}>
            <span>Register workbook (.xlsx)</span>
            <input ref={fileInput} id="moc-workbook" type="file" accept=".xlsx,.xlsm" onChange={(event) => void onFile(event)} style={input} />
          </label>
          <label style={field}>
            <span>Project</span>
            <select id="moc-project" style={input} value={project} onChange={(event) => setProject(event.target.value as MocProject)}>
              {MOC_PROJECTS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label style={field}>
            <span>Position at</span>
            <input id="moc-report-date" type="date" style={input} value={reportDate} onChange={(event) => setReportDate(event.target.value || todayIso())} />
          </label>
        </div>
        <div style={checks}>
          <label style={check}><input id="moc-hide-closed" type="checkbox" checked={hideClosed} onChange={(event) => setHideClosed(event.target.checked)} /> Hide closed and not implemented MOCs</label>
          <label style={check}><input id="moc-hide-actions" type="checkbox" checked={hideActions} onChange={(event) => setHideActions(event.target.checked)} /> Leave out the open actions table</label>
        </div>
        {fileName ? <p style={loaded}>Loaded {fileName}: {workbook?.mocs.length} MOCs and {workbook?.actions.length} actions.</p> : null}
        {error ? <p role="alert" style={errorText}>{error}</p> : null}
        {workbook?.warnings.map((warning) => <p key={warning} style={warn}>{warning}</p>)}
      </div>

      {!shownAnnex ? (
        <div style={empty}>No workbook loaded yet. Upload the register to see the {project} annex.</div>
      ) : (
        <>
          <div style={kpis}>
            <QualityKpiCard title={`MOCs on ${project}`} value={shownAnnex.counts.total} accent={imsColours.brand} />
            <QualityKpiCard title="Open" value={shownAnnex.counts.open} accent={imsColours.brandAccent} />
            <QualityKpiCard title="Closed / not implemented" value={shownAnnex.counts.finished} accent={imsColours.muted} />
            <QualityKpiCard title="Status to confirm" value={shownAnnex.counts.toConfirm} accent={imsColours.warning} />
            <QualityKpiCard title="Past implementation end" value={shownAnnex.counts.pastEnd} accent={imsColours.danger} />
            <QualityKpiCard title="Open actions" value={shownAnnex.counts.openActions} accent={imsColours.warning} />
          </div>

          {toConfirm.length || pastEnd.length ? (
            <div style={callout} role="note">
              <strong>Check before this goes in the monthly report</strong>
              {toConfirm.length ? <span>Status still to confirm: {toConfirm.map((row) => row.mocNo).join(", ")}.</span> : null}
              {pastEnd.length ? <span>Implementation end date has passed but the MOC is not closed: {pastEnd.map((row) => row.mocNo).join(", ")}.</span> : null}
            </div>
          ) : null}

          <div style={panel}>
            <div style={previewHead}>
              <h2 style={heading}>Preview: MOC Register - {project}</h2>
              <div style={buttons}>
                <button type="button" style={primary} disabled={busy} onClick={() => void makeWord()}>{busy ? "Preparing..." : "Generate Word"}</button>
                <button type="button" style={secondary} onClick={makePdf}>Generate PDF</button>
              </div>
            </div>
            {shownAnnex.rows.length ? (
              <div style={tableWrap}>
                <table style={table}>
                  <thead>
                    <tr>{["MOC No.", "Title", "Applies to", "Type", "Coordinator", "Implementation period", "Status", "Actions closed", "Next step"].map((label) => <th key={label} style={th}>{label}</th>)}</tr>
                  </thead>
                  <tbody>
                    {shownAnnex.rows.map((row) => (
                      <tr key={row.mocNo}>
                        <td style={tdStrong}>{row.mocNo}</td>
                        <td style={td}>{row.title || "-"}</td>
                        <td style={td}>{row.appliesTo || "All"}</td>
                        <td style={td}>{row.type || "-"}</td>
                        <td style={td}>{row.coordinator || "-"}</td>
                        <td style={td}>{implementationPeriod(row)}{isPastEnd(row, reportDate) ? <span style={flag}> Past end</span> : null}</td>
                        <td style={td}>{isToConfirm(row.status) ? <span style={flag}>{row.status || "To confirm"}</span> : row.status}</td>
                        <td style={td}>{actionsText(row)}</td>
                        <td style={{ ...td, whiteSpace: "pre-line" }}>{nextStepText(row)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={empty}>No MOCs apply to {project} with the current options.</div>
            )}

            {!hideActions ? (
              <>
                <h3 style={subheading}>Open actions ({shownAnnex.openActions.length})</h3>
                {shownAnnex.openActions.length ? (
                  <div style={tableWrap}>
                    <table style={table}>
                      <thead>
                        <tr>{["MOC No.", "No.", "Action", "Responsible", "Target", "Status"].map((label) => <th key={label} style={th}>{label}</th>)}</tr>
                      </thead>
                      <tbody>
                        {shownAnnex.openActions.map((action) => (
                          <tr key={`${action.mocNo}-${action.no}-${action.description.slice(0, 24)}`}>
                            <td style={tdStrong}>{action.mocNo}</td>
                            <td style={td}>{action.no || "-"}</td>
                            <td style={td}>{action.description}</td>
                            <td style={td}>{action.responsible || "-"}</td>
                            <td style={td}>{action.target ? formatDate(action.target) : "-"}</td>
                            <td style={td}>{action.status || "Open"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={empty}>No open actions are recorded against these MOCs.</div>
                )}
              </>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}

const shell: CSSProperties = { display: "grid", gap: 16 };
const panel: CSSProperties = { minWidth: 0, padding: 20, background: imsColours.panel, border: `1px solid ${imsColours.border}`, borderRadius: 16, color: imsColours.ink };
const heading: CSSProperties = { margin: "0 0 8px", fontSize: 18, color: imsColours.ink };
const subheading: CSSProperties = { margin: "20px 0 10px", fontSize: 15, color: imsColours.ink };
const help: CSSProperties = { margin: "0 0 14px", color: imsColours.muted, fontSize: 13, lineHeight: 1.5, maxWidth: 820 };
const controls: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 230px), 1fr))", gap: 12 };
const field: CSSProperties = { display: "grid", minWidth: 0, gap: 6, fontSize: 12, fontWeight: 800, color: imsColours.muted };
const input: CSSProperties = { width: "100%", minWidth: 0, minHeight: 40, padding: "9px 11px", border: `1px solid ${imsColours.border}`, borderRadius: 9, background: imsColours.panel, color: imsColours.ink, font: "inherit", boxSizing: "border-box" };
const checks: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 18, marginTop: 12 };
const check: CSSProperties = { display: "inline-flex", gap: 7, alignItems: "center", fontSize: 13, fontWeight: 700, color: imsColours.ink };
const loaded: CSSProperties = { margin: "12px 0 0", color: imsColours.brand, fontSize: 13, fontWeight: 700 };
const errorText: CSSProperties = { margin: "12px 0 0", color: imsColours.danger, fontSize: 13, fontWeight: 700 };
const warn: CSSProperties = { margin: "8px 0 0", color: imsColours.muted, fontSize: 13 };
const kpis: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 12 };
const callout: CSSProperties = { display: "grid", gap: 4, padding: "12px 16px", border: `1px solid ${imsColours.warning}`, borderLeft: `4px solid ${imsColours.warning}`, borderRadius: 12, background: imsColours.panel, color: imsColours.ink, fontSize: 13, lineHeight: 1.5 };
const previewHead: CSSProperties = { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 };
const buttons: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 10 };
const primary: CSSProperties = { border: `1px solid ${imsColours.brand}`, borderRadius: 9, padding: "10px 16px", background: imsColours.brand, color: "#ffffff", fontWeight: 800, cursor: "pointer" };
const secondary: CSSProperties = { border: `1px solid ${imsColours.brand}`, borderRadius: 9, padding: "10px 16px", background: imsColours.panel, color: imsColours.brand, fontWeight: 800, cursor: "pointer" };
const tableWrap: CSSProperties = { overflowX: "auto", width: "100%" };
const table: CSSProperties = { width: "100%", minWidth: 980, borderCollapse: "collapse", fontSize: 13 };
const th: CSSProperties = { padding: "10px 12px", background: imsColours.brand, color: "#ffffff", fontSize: 12, fontWeight: 800, textAlign: "left", whiteSpace: "nowrap" };
const td: CSSProperties = { padding: "10px 12px", borderBottom: `1px solid ${imsColours.border}`, color: imsColours.ink, lineHeight: 1.45, verticalAlign: "top", overflowWrap: "anywhere" };
const tdStrong: CSSProperties = { ...td, fontWeight: 800, whiteSpace: "nowrap" };
const flag: CSSProperties = { display: "inline-block", padding: "2px 7px", borderRadius: 999, border: `1px solid ${imsColours.warning}`, color: imsColours.ink, fontSize: 11, fontWeight: 800 };
const empty: CSSProperties = { padding: 24, border: `1px dashed ${imsColours.border}`, borderRadius: 12, color: imsColours.muted, textAlign: "center" };

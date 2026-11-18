"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import { Packer } from "docx";
import { QualityKpiCard } from "./QualityKpiCard";
import { imsColours } from "./imsTheme";
import { useUrlFlag, useUrlState } from "../lib/useUrlState";
import { supabase } from "../lib/supabase";
import {
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

// Client MOC register annex for any project. The register is that project's MOC list in the IMS (MOC module), read live.
// A workbook can still be uploaded instead, for example an old SharePoint register; nothing is stored from it.

const DB_STATUS_LABEL: Record<string, string> = { Draft: "Draft", "In Review": "In review", Approved: "Approved", Closed: "Closed" };

async function loadFromIms(projectKey: string): Promise<MocWorkbook> {
  const mocResult = await supabase
    .from("moc_reports")
    .select("id,moc_report_no,series_number,moc_report_title,applies_to,change_type,moc_coordinator_name,responsible_manager_name,implementation_from,implementation_to,status,status_to_confirm,next_step,next_step_owner,next_step_due")
    .eq("project_key", projectKey)
    .order("series_number", { ascending: true });
  if (mocResult.error) throw new Error(mocResult.error.message);
  const rows = mocResult.data || [];
  const ids = rows.map((row) => String(row.id));
  const actionResult = ids.length
    ? await supabase.from("moc_action_plan_items").select("moc_report_id,sort_order,action_no,description,responsible_person,target_date,status").in("moc_report_id", ids).order("sort_order", { ascending: true })
    : { data: [], error: null };
  if (actionResult.error) throw new Error(actionResult.error.message);
  const numberById = new Map(rows.map((row) => [String(row.id), String(row.moc_report_no)]));
  const text = (value: unknown) => String(value ?? "").trim();
  return {
    warnings: [],
    mocs: rows.map((row) => {
      const parts = Array.isArray(row.applies_to) ? (row.applies_to as string[]) : [];
      return {
        mocNo: text(row.moc_report_no),
        title: text(row.moc_report_title),
        appliesTo: parts.join(" & ") || "All",
        type: text(row.change_type),
        coordinator: text(row.moc_coordinator_name),
        manager: text(row.responsible_manager_name),
        implFrom: text(row.implementation_from),
        implTo: text(row.implementation_to),
        status: row.status_to_confirm ? "To confirm" : DB_STATUS_LABEL[text(row.status)] || text(row.status),
        nextStep: text(row.next_step),
        nextOwner: text(row.next_step_owner),
        nextDue: text(row.next_step_due),
        notes: "",
      };
    }),
    actions: (actionResult.data || []).map((item) => ({
      mocNo: numberById.get(String(item.moc_report_id)) || "",
      no: text(item.action_no),
      description: text(item.description),
      responsible: text(item.responsible_person),
      target: text(item.target_date),
      status: text(item.status),
    })),
  };
}

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

export function MocRegisterAnnex({ projectKey }: { projectKey: string }) {
  const [label, setLabel] = useState("Project");
  const [parts, setParts] = useState<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const [source, setSource] = useUrlState<"ims" | "workbook">("moc_source", "ims", ["ims", "workbook"]);
  const [imsBook, setImsBook] = useState<MocWorkbook | null>(null);
  const [imsLoading, setImsLoading] = useState(false);
  const [fileBook, setFileBook] = useState<MocWorkbook | null>(null);
  const workbook = source === "ims" ? imsBook : fileBook;
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [partParam, setPartParam] = useUrlState<string>("moc_project", "");
  // The part (for example BA3) the annex is for. Projects without parts produce one annex for the whole project.
  const project: MocProject = parts.includes(partParam) ? partParam : parts[0] || "";
  const setProject = setPartParam;
  const [reportDate, setReportDate] = useState(todayIso());
  const [hideClosed, setHideClosed] = useUrlFlag("moc_hide_closed");
  const [hideActions, setHideActions] = useUrlFlag("moc_hide_actions");

  // The project's name and parts come from its numbering series, so a new project needs nothing here.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let result = await supabase.from("moc_series").select("label,parts").eq("project_key", projectKey).maybeSingle();
      if (result.error) result = await supabase.from("moc_series").select("label").eq("project_key", projectKey).maybeSingle() as typeof result;
      if (cancelled) return;
      const row = result.data as { label?: string; parts?: string[] | null } | null;
      setLabel(row?.label || projectKey.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
      setParts(Array.isArray(row?.parts) ? (row?.parts as string[]) : projectKey === "wadden-sea" ? ["BA3", "LW2", "LW4"] : []);
      setImsBook(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectKey]);

  const refreshIms = useCallback(async () => {
    setImsLoading(true);
    setError("");
    try {
      setImsBook(await loadFromIms(projectKey));
    } catch (problem) {
      setImsBook(null);
      setError(problem instanceof Error ? problem.message : "The MOC register could not be loaded.");
    } finally {
      setImsLoading(false);
    }
  }, [projectKey]);

  useEffect(() => {
    if (source === "ims" && !imsBook) void refreshIms();
  }, [source, imsBook, refreshIms]);

  const annex = useMemo(() => (workbook ? buildAnnex(workbook, project, { includeFinished: !hideClosed, reportDate, projectLabel: label }) : null), [workbook, project, hideClosed, reportDate, label]);
  const shownAnnex = annex && hideActions ? { ...annex, openActions: [], counts: { ...annex.counts, openActions: 0 } } : annex;

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    try {
      const parsed = parseMocWorkbook(await file.arrayBuffer());
      if (!parsed.mocs.length) throw new Error("No MOCs were found on the Register sheet.");
      setFileBook(parsed);
      setFileName(file.name);
    } catch (problem) {
      setFileBook(null);
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
        <h2 style={heading}>{label} MOC register report</h2>
        <p style={help}>
          Choose the report date, check the preview, then generate the report. By default it reads the live {label} MOC register in the IMS, so update a MOC there and refresh this page.
          Cost and internal notes are never included.
        </p>
        <div style={controls}>
          <label style={field}>
            <span>Read the register from</span>
            <select id="moc-source" style={input} value={source} onChange={(event) => { setError(""); setSource(event.target.value as "ims" | "workbook"); }}>
              <option value="ims">The IMS MOC register (live)</option>
              <option value="workbook">An uploaded workbook (.xlsx)</option>
            </select>
          </label>
          {source === "workbook" ? (
            <label style={field}>
              <span>Register workbook (.xlsx)</span>
              <input ref={fileInput} id="moc-workbook" type="file" accept=".xlsx,.xlsm" onChange={(event) => void onFile(event)} style={input} />
            </label>
          ) : (
            <div style={field}>
              <span>Register</span>
              <button type="button" style={secondary} disabled={imsLoading} onClick={() => void refreshIms()}>{imsLoading ? "Loading..." : "Refresh from the IMS"}</button>
            </div>
          )}
          {parts.length ? (
            <label style={field}>
              <span>Part</span>
              <select id="moc-project" style={input} value={project} onChange={(event) => setProject(event.target.value)}>
                {parts.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          ) : null}
          <label style={field}>
            <span>Position at</span>
            <input id="moc-report-date" type="date" style={input} value={reportDate} onChange={(event) => setReportDate(event.target.value || todayIso())} />
          </label>
        </div>
        <div style={checks}>
          <label style={check}><input id="moc-hide-closed" type="checkbox" checked={hideClosed} onChange={(event) => setHideClosed(event.target.checked)} /> Hide closed and not implemented MOCs</label>
          <label style={check}><input id="moc-hide-actions" type="checkbox" checked={hideActions} onChange={(event) => setHideActions(event.target.checked)} /> Leave out the open actions table</label>
        </div>
        {source === "workbook" && fileName ? <p style={loaded}>Loaded {fileName}: {workbook?.mocs.length} MOCs and {workbook?.actions.length} actions.</p> : null}
        {source === "ims" && imsBook ? <p style={loaded}>Read from the IMS: {imsBook.mocs.length} {label} MOCs and {imsBook.actions.length} actions.</p> : null}
        {error ? <p role="alert" style={errorText}>{error}</p> : null}
        {workbook?.warnings.map((warning) => <p key={warning} style={warn}>{warning}</p>)}
      </div>

      {!shownAnnex ? (
        <div style={empty}>
          {source === "ims"
            ? imsLoading ? "Loading the MOC register..." : "No MOC register loaded."
            : `No workbook loaded yet. Upload the register to see the ${project || label} report.`}
        </div>
      ) : (
        <>
          <div style={kpis}>
            <QualityKpiCard title={project ? `MOCs on ${project}` : "MOCs"} value={shownAnnex.counts.total} accent={imsColours.brand} />
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
              <h2 style={heading}>Preview: MOC Register - {project || label}</h2>
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
              <div style={empty}>No MOCs apply to {project || label} with the current options.</div>
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

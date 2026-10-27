"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import XLSXStyle from "xlsx-js-style";
import { supabase } from "../lib/supabase";
import { useImsPermissions } from "./ImsPermissions";
import { getProject } from "../lib/projectRegistry";
import { findReviewPoints, type ReviewScanResult } from "../lib/noiScanClient";
import { daysUntil, formatDay, formatDayTime, isPastTarget, todayIso, type ReviewEvent, type ReviewPoint } from "../lib/reviewPoints";
import {
  buildReportRows,
  createReviewPointsPdf,
  createReviewPointsWorkbook,
  type ReviewReportGroup,
  type ReviewReportOptions,
  type ReviewReportVersion,
} from "../lib/reviewPointsReport";

type RevisionRow = { id: string; revision: string; file_name: string; file_path: string; is_current: boolean; uploaded_at: string };
type ItpRow = { id: string; project_key: string; document_number: string; title: string; supplier: string | null; project_itp_revisions?: RevisionRow[] };
type View = "register" | "itp";
type StatusFilter = "all" | "Pending" | "Accepted" | "Failed";
type DialogState =
  | { kind: "accept" | "fail" | "assign"; ids: string[] }
  | null;
type ScanRow = { itp: ItpRow; revision: RevisionRow; result?: ReviewScanResult; newCount?: number };

function currentRevision(itp: ItpRow) {
  return (itp.project_itp_revisions || []).find((revision) => revision.is_current)
    || [...(itp.project_itp_revisions || [])].sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at))[0];
}

async function logoDataUrl() {
  try {
    const response = await fetch("/enshore-primary-logo-colour.png");
    if (!response.ok) return undefined;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

// The review (R) and approval (A) points tracker. With a project key it is that project's page;
// without one it is the all-projects view used for resource planning.
export function ReviewPointsPanel({ projectKey }: { projectKey?: string }) {
  const permissions = useImsPermissions();
  const [points, setPoints] = useState<ReviewPoint[]>([]);
  const [itps, setItps] = useState<ItpRow[]>([]);
  const [people, setPeople] = useState<string[]>([]);
  const [myEmail, setMyEmail] = useState("");
  const [myName, setMyName] = useState("");
  const [isSigner, setIsSigner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const [view, setView] = useState<View>("register");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [projectFilter, setProjectFilter] = useState("");
  const [itpFilter, setItpFilter] = useState("");
  const [reviewerFilter, setReviewerFilter] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const [dialog, setDialog] = useState<DialogState>(null);
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [assignReviewer, setAssignReviewer] = useState("");
  const [assignDate, setAssignDate] = useState("");
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [events, setEvents] = useState<ReviewEvent[]>([]);

  const [showReport, setShowReport] = useState(false);
  const [reportVersion, setReportVersion] = useState<ReviewReportVersion>("internal");
  const [reportScope, setReportScope] = useState<"all" | "open" | "Pending" | "Accepted" | "Failed">("all");
  const [reportGroup, setReportGroup] = useState<ReviewReportGroup>("itp");

  const [showScan, setShowScan] = useState(false);
  const [scanRows, setScanRows] = useState<ScanRow[]>([]);
  const [scanning, setScanning] = useState(false);

  const canEdit = permissions.loaded && (permissions.isMasterAdmin || permissions.fullAccess || permissions.canEdit);
  const today = todayIso();

  const load = useCallback(async () => {
    setLoading(true);
    let pointQuery = supabase.from("project_review_points").select("*").order("created_at", { ascending: true });
    let itpQuery = supabase.from("project_itps").select("id,project_key,document_number,title,supplier,project_itp_revisions(id,revision,file_name,file_path,is_current,uploaded_at)").order("document_number");
    if (projectKey) {
      pointQuery = pointQuery.eq("project_key", projectKey);
      itpQuery = itpQuery.eq("project_key", projectKey);
    }
    const [pointResult, itpResult, peopleResult, authResult] = await Promise.all([
      pointQuery,
      itpQuery,
      supabase.from("people").select("name").eq("active", true).order("name"),
      supabase.auth.getUser(),
    ]);
    if (pointResult.error) {
      const missing = /project_review_points/.test(pointResult.error.message) && /(does not exist|schema cache|could not find)/i.test(pointResult.error.message);
      setSetupNeeded(missing);
      setMessage(missing ? "" : pointResult.error.message);
      setPoints([]);
      setLoading(false);
      return;
    }
    setSetupNeeded(false);
    setPoints((pointResult.data || []) as ReviewPoint[]);
    setItps((itpResult.data || []) as ItpRow[]);
    setPeople(((peopleResult.data || []) as Array<{ name: string }>).map((person) => person.name).filter(Boolean));
    const email = (authResult.data.user?.email || "").toLowerCase();
    setMyEmail(email);
    if (email) {
      const [signer, person] = await Promise.all([
        supabase.from("project_review_signers").select("email").eq("email", email).eq("active", true).limit(1),
        supabase.from("people").select("name").ilike("email", email.replace(/[\\%_]/g, "\\$&")).limit(1),
      ]);
      setIsSigner(Boolean(signer.data?.length));
      setMyName(((person.data || [])[0] as { name?: string } | undefined)?.name || email);
    }
    setLoading(false);
  }, [projectKey]);

  useEffect(() => { void load(); }, [load]);

  const itpById = useMemo(() => new Map(itps.map((itp) => [itp.id, itp])), [itps]);
  const projectLabel = useCallback((key: string) => getProject(key).label, []);

  const baseFiltered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return points.filter((point) => {
      const itp = itpById.get(point.itp_id);
      if (projectFilter && point.project_key !== projectFilter) return false;
      if (itpFilter && point.itp_id !== itpFilter) return false;
      if (reviewerFilter === "__none" && point.reviewer) return false;
      if (reviewerFilter && reviewerFilter !== "__none" && point.reviewer !== reviewerFilter) return false;
      if (needle && ![point.section_number, point.activity_description, itp?.document_number, itp?.supplier, point.reviewer].some((value) => (value || "").toLowerCase().includes(needle))) return false;
      return true;
    });
  }, [points, query, projectFilter, itpFilter, reviewerFilter, itpById]);
  const rows = useMemo(() => baseFiltered.filter((point) => statusFilter === "all" || point.status === statusFilter), [baseFiltered, statusFilter]);

  const counts = useMemo(() => ({
    all: baseFiltered.length,
    Pending: baseFiltered.filter((point) => point.status === "Pending").length,
    Accepted: baseFiltered.filter((point) => point.status === "Accepted").length,
    Failed: baseFiltered.filter((point) => point.status === "Failed").length,
    past: baseFiltered.filter((point) => isPastTarget(point, today)).length,
  }), [baseFiltered, today]);

  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected]);
  const projectOptions = useMemo(() => [...new Set(points.map((point) => point.project_key))].sort(), [points]);
  const itpOptions = useMemo(() => [...new Map(points.map((point) => [point.itp_id, itpById.get(point.itp_id)])).entries()].filter(([, itp]) => itp).map(([id, itp]) => ({ id, label: `${itp!.document_number}${itp!.supplier ? ` · ${itp!.supplier}` : ""}` })).sort((a, b) => a.label.localeCompare(b.label)), [points, itpById]);

  const planning = useMemo(() => {
    const open = points.filter((point) => point.status !== "Accepted");
    const byReviewer = new Map<string, { open: number; late: number }>();
    const byProject = new Map<string, { open: number; late: number; unassigned: number }>();
    open.forEach((point) => {
      const reviewer = point.reviewer || "Unassigned";
      const late = isPastTarget(point, today);
      const r = byReviewer.get(reviewer) || { open: 0, late: 0 };
      r.open += 1;
      if (late) r.late += 1;
      byReviewer.set(reviewer, r);
      const p = byProject.get(point.project_key) || { open: 0, late: 0, unassigned: 0 };
      p.open += 1;
      if (late) p.late += 1;
      if (!point.reviewer) p.unassigned += 1;
      byProject.set(point.project_key, p);
    });
    return { byReviewer: [...byReviewer.entries()].sort((a, b) => b[1].open - a[1].open), byProject: [...byProject.entries()].sort((a, b) => a[0].localeCompare(b[0])) };
  }, [points, today]);

  function say(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage((current) => (current === text ? "" : current)), 6000);
  }

  async function send(body: Record<string, unknown>) {
    const response = await fetch("/api/projects/review-points", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) throw new Error(String(result.error || "The change could not be saved."));
    return result;
  }

  function closeDialog() {
    setDialog(null);
    setNote("");
    setConfirmed(false);
    setAssignReviewer("");
    setAssignDate("");
  }

  async function submitDialog() {
    if (!dialog) return;
    setBusy(true);
    try {
      if (dialog.kind === "assign") {
        await send({ action: "assign", ids: dialog.ids, ...(assignReviewer ? { reviewer: assignReviewer } : {}), ...(assignDate ? { targetDate: assignDate } : {}) });
        say("Assignment saved.");
      } else {
        const result = await send({ action: "decide", ids: dialog.ids, decision: dialog.kind === "accept" ? "Accepted" : "Failed", note });
        const decided = Number(result.decided || 0);
        say(`${dialog.kind === "accept" ? "Accepted" : "Failed"} by ${myName || "you"} on ${formatDay(String(result.decidedAt || new Date().toISOString()))}${decided > 1 ? ` (${decided} points)` : ""}.`);
      }
      setSelected({});
      closeDialog();
      await load();
    } catch (error) {
      say(error instanceof Error ? error.message : "The change could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function reopen(id: string) {
    setBusy(true);
    try {
      await send({ action: "reopen", ids: [id] });
      say("Reopened and logged.");
      await load();
      if (historyId === id) await openHistory(id, true);
    } catch (error) {
      say(error instanceof Error ? error.message : "The point could not be reopened.");
    } finally {
      setBusy(false);
    }
  }

  async function openHistory(id: string, keepOpen = false) {
    if (historyId === id && !keepOpen) {
      setHistoryId(null);
      return;
    }
    setHistoryId(id);
    const { data } = await supabase.from("project_review_point_events").select("id,point_id,event_type,actor_name,detail,created_at").eq("point_id", id).order("created_at", { ascending: true });
    setEvents((data || []) as ReviewEvent[]);
  }

  // ---- scan the project's ITPs ------------------------------------------------------------
  async function startScan() {
    if (!projectKey) return;
    setShowScan(true);
    setScanning(true);
    const candidates: ScanRow[] = itps.flatMap((itp) => {
      const revision = currentRevision(itp);
      return revision ? [{ itp, revision }] : [];
    });
    setScanRows(candidates);
    const existing = new Set(points.map((point) => `${point.revision_id}|${point.section_number}|${point.code}|${point.activity_description}`));
    for (let index = 0; index < candidates.length; index += 1) {
      const { itp, revision } = candidates[index];
      const result = await findReviewPoints(projectKey, revision.file_path, itp.supplier || "");
      const newCount = result.points.filter((point) => !existing.has(`${revision.id}|${point.sectionNumber}|${point.code}|${point.activityDescription}`)).length;
      setScanRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, result, newCount } : row)));
    }
    setScanning(false);
  }

  async function addScanned() {
    if (!projectKey) return;
    setBusy(true);
    let added = 0;
    try {
      for (const row of scanRows) {
        if (!row.result || row.result.status !== "ready" || !row.newCount) continue;
        const result = await send({ action: "import", projectKey, itpId: row.itp.id, revisionId: row.revision.id, points: row.result.points });
        added += Number(result.added || 0);
      }
      say(`${added} review point${added === 1 ? "" : "s"} added as Pending.`);
      setShowScan(false);
      setScanRows([]);
      await load();
    } catch (error) {
      say(error instanceof Error ? error.message : "The review points could not be added.");
    } finally {
      setBusy(false);
    }
  }

  // ---- reports ----------------------------------------------------------------------------
  function reportOptions(): ReviewReportOptions {
    const filters = [
      projectKey ? `Project: ${projectLabel(projectKey)}` : `Project: ${projectFilter ? projectLabel(projectFilter) : "All projects"}`,
      ...(itpFilter ? [`ITP: ${itpOptions.find((option) => option.id === itpFilter)?.label || ""}`] : []),
      ...(reviewerFilter && reportVersion === "internal" ? [`Reviewer: ${reviewerFilter === "__none" ? "Unassigned" : reviewerFilter}`] : []),
      ...(query.trim() ? [`Search: "${query.trim()}"`] : []),
      `Include: ${{ all: "All statuses", open: "Not yet accepted", Pending: "Pending only", Accepted: "Accepted only", Failed: "Failed only" }[reportScope]}`,
    ];
    return { version: reportVersion, group: reportGroup, filters, generatedBy: myName, projectLabel };
  }

  function reportPoints() {
    return baseFiltered.filter((point) => reportScope === "all" || (reportScope === "open" ? point.status !== "Accepted" : point.status === reportScope));
  }

  async function downloadPdf() {
    const options = reportOptions();
    const reportRows = buildReportRows(reportPoints(), itpById as never, options);
    const pdf = createReviewPointsPdf(reportRows, { ...options, logo: await logoDataUrl() });
    pdf.save(`ITP-Review-Points${reportVersion === "client" ? "-Client" : ""}-${today}.pdf`);
  }

  function downloadExcel() {
    const options = reportOptions();
    const workbook = createReviewPointsWorkbook(buildReportRows(reportPoints(), itpById as never, options), options);
    XLSXStyle.writeFile(workbook, `ITP-Review-Points${reportVersion === "client" ? "-Client" : ""}-${today}.xlsx`);
  }

  // ---- rendering --------------------------------------------------------------------------
  function targetCell(point: ReviewPoint) {
    if (!point.target_date) return <span style={mutedText}>No target</span>;
    if (point.status === "Accepted") return <span>{formatDay(point.target_date)}</span>;
    const days = daysUntil(point.target_date, today);
    const note = days < 0 ? `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue` : days === 0 ? "Due today" : days <= 7 ? `Due in ${days} day${days === 1 ? "" : "s"}` : "";
    return <span>{formatDay(point.target_date)}{note ? <small style={{ display: "block", fontWeight: 800, color: days < 0 ? "#F93822" : "#000000" }}>{note}</small> : null}</span>;
  }

  function pill(status: ReviewPoint["status"]) {
    return <span style={{ ...pillBase, ...(status === "Accepted" ? pillAccepted : status === "Failed" ? pillFailed : pillPending) }}>{status}</span>;
  }

  function signOff(point: ReviewPoint) {
    if (point.status === "Pending") return <span style={mutedText}>Awaiting review</span>;
    return <span style={{ fontSize: 12, color: "#53565A" }}><strong style={{ color: "#000000" }}>{point.status} by {point.decided_by}</strong> on {formatDayTime(point.decided_at)}{point.decision_note ? <><br />{point.decision_note}</> : null}</span>;
  }

  function actions(point: ReviewPoint) {
    if (point.status === "Pending") {
      return (
        <div style={actionRow}>
          <button type="button" style={okButton} disabled={!isSigner || busy} title={isSigner ? "" : "Only authorised signers can sign off"} onClick={() => setDialog({ kind: "accept", ids: [point.id] })}>Accept</button>
          <button type="button" style={badButton} disabled={!isSigner || busy} title={isSigner ? "" : "Only authorised signers can sign off"} onClick={() => setDialog({ kind: "fail", ids: [point.id] })}>Fail</button>
        </div>
      );
    }
    return (
      <div style={actionRow}>
        <button type="button" style={ghostButton} onClick={() => void openHistory(point.id)}>History</button>
        <button type="button" style={ghostButton} disabled={!isSigner || busy} onClick={() => void reopen(point.id)}>Reopen</button>
      </div>
    );
  }

  function historyBlock() {
    return (
      <div style={{ display: "grid", gap: 3, fontSize: 12, color: "#53565A" }}>
        {events.length === 0 ? <span>No history yet.</span> : events.map((event) => (
          <div key={event.id}><strong style={{ color: "#000000" }}>{event.event_type[0].toUpperCase() + event.event_type.slice(1)}</strong> by {event.actor_name || "unknown"} on {formatDayTime(event.created_at)}{event.detail ? ` · ${event.detail}` : ""}</div>
        ))}
      </div>
    );
  }

  const selectionBar = selectedIds.length ? (
    <div style={selectionBarStyle}>
      <strong>{selectedIds.length} selected</strong>
      <span style={{ display: "inline-flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" style={barButton} disabled={!canEdit || busy} onClick={() => setDialog({ kind: "assign", ids: selectedIds })}>Assign reviewer and date...</button>
        <button type="button" style={barButton} disabled={!isSigner || busy} title={isSigner ? "" : "Only authorised signers can sign off"} onClick={() => setDialog({ kind: "accept", ids: selectedIds })}>Sign off selected...</button>
        <button type="button" style={barButton} onClick={() => setSelected({})}>Clear</button>
      </span>
    </div>
  ) : null;

  if (setupNeeded) {
    return (
      <section style={surface}>
        <div style={noticeStyle}><strong>One-off setup needed.</strong> Run <code>scripts/sql/project_review_points.sql</code> in the Supabase SQL editor to switch Review Points on. Nothing else changes until then.</div>
      </section>
    );
  }

  const dialogPoints = dialog ? points.filter((point) => dialog.ids.includes(point.id) && (dialog.kind === "assign" || point.status === "Pending")) : [];
  const grouped = (() => {
    const map = new Map<string, ReviewPoint[]>();
    rows.forEach((point) => map.set(point.itp_id, [...(map.get(point.itp_id) || []), point]));
    return [...map.entries()].sort((a, b) => (itpById.get(a[0])?.document_number || "").localeCompare(itpById.get(b[0])?.document_number || "", "en", { numeric: true }));
  })();

  return (
    <>
      <style>{".review-points button:disabled { opacity: 0.5; cursor: not-allowed; }"}</style>
      <section className="review-points" style={surface}>
        <div style={bannerStyle}>
          <strong>{projectKey ? `Review Points · ${projectLabel(projectKey)}` : "Review Points · all projects"}</strong>
          <span>{projectKey ? "Every review (R) and approval (A) point in this project's ITPs. Accept or fail each one with your sign-off." : "Every review and approval point across the projects, for planning who reviews what and when."}</span>
        </div>
        {message ? <div style={noticeStyle}>{message}</div> : null}
        {!isSigner && !loading ? <div style={noticeStyle}>You can view review points{canEdit ? " and assign reviewers and target dates" : ""}, but only authorised signers can accept or fail them.</div> : null}

        {!projectKey ? (
          <div style={planGrid}>
            <div style={planCard}>
              <strong>Open review points by reviewer</strong>
              {planning.byReviewer.length === 0 ? <span style={mutedText}>Nothing open.</span> : planning.byReviewer.map(([name, value]) => (
                <div key={name} style={barRow}>
                  <span style={{ fontStyle: name === "Unassigned" ? "italic" : "normal" }}>{name}</span>
                  <div style={barTrack}><i style={{ ...barFill, background: "#F93822", width: `${(value.late / (planning.byReviewer[0][1].open || 1)) * 100}%` }} /><i style={{ ...barFill, background: "#FFAD00", width: `${((value.open - value.late) / (planning.byReviewer[0][1].open || 1)) * 100}%` }} /></div>
                  <b>{value.open}</b>
                </div>
              ))}
              <small style={mutedText}>Orange: on time · Red: past the target date</small>
            </div>
            <div style={planCard}>
              <strong>Open review points by project</strong>
              <table style={miniTable}>
                <thead><tr><th style={miniTh}>Project</th><th style={miniTh}>Open</th><th style={miniTh}>Past target</th><th style={miniTh}>Unassigned</th></tr></thead>
                <tbody>{planning.byProject.map(([key, value]) => <tr key={key}><td style={miniTd}><strong>{projectLabel(key)}</strong></td><td style={miniTd}>{value.open}</td><td style={{ ...miniTd, color: value.late ? "#F93822" : "#000000", fontWeight: value.late ? 800 : 400 }}>{value.late}</td><td style={miniTd}>{value.unassigned}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div style={kpiGrid}>
          {([["all", "All review points"], ["Pending", "Pending"], ["Accepted", "Accepted"], ["Failed", "Failed"]] as Array<[StatusFilter, string]>).map(([key, label]) => (
            <button key={key} type="button" aria-pressed={statusFilter === key} style={{ ...kpiCard, ...(statusFilter === key ? kpiActive : null), borderTopColor: key === "Pending" ? "#FFAD00" : key === "Failed" ? "#F93822" : key === "Accepted" ? "#005670" : "#53565A" }} onClick={() => setStatusFilter(key)}>
              <b style={{ fontSize: 24 }}>{counts[key]}</b><span style={kpiLabel}>{label}</span>
            </button>
          ))}
          <div style={{ ...kpiCard, cursor: "default", borderTopColor: "#F93822" }}><b style={{ fontSize: 24 }}>{counts.past}</b><span style={kpiLabel}>Past target date</span></div>
        </div>

        <div style={filterBar}>
          <label style={fieldStyle}><span style={labelStyle}>Search</span><input style={inputStyle} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ITP, supplier, review point..." /></label>
          {!projectKey ? <label style={fieldStyle}><span style={labelStyle}>Project</span><select style={inputStyle} value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}><option value="">All projects</option>{projectOptions.map((key) => <option key={key} value={key}>{projectLabel(key)}</option>)}</select></label> : null}
          <label style={fieldStyle}><span style={labelStyle}>ITP</span><select style={inputStyle} value={itpFilter} onChange={(event) => setItpFilter(event.target.value)}><option value="">All ITPs</option>{itpOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Reviewer</span><select style={inputStyle} value={reviewerFilter} onChange={(event) => setReviewerFilter(event.target.value)}><option value="">All reviewers</option><option value="__none">Unassigned</option>{people.map((name) => <option key={name}>{name}</option>)}</select></label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
            <div style={segStyle} role="group" aria-label="View">
              <button type="button" aria-pressed={view === "register"} style={view === "register" ? segActive : segButton} onClick={() => setView("register")}>Register</button>
              <button type="button" aria-pressed={view === "itp"} style={view === "itp" ? segActive : segButton} onClick={() => setView("itp")}>By ITP</button>
            </div>
            <button type="button" style={secondaryButton} onClick={() => { setQuery(""); setProjectFilter(""); setItpFilter(""); setReviewerFilter(""); setStatusFilter("all"); }}>Clear filters</button>
            {projectKey && canEdit ? <button type="button" style={secondaryButton} disabled={scanning || busy} onClick={() => void startScan()}>Scan ITPs for review points</button> : null}
            <button type="button" style={primaryButton} onClick={() => setShowReport((value) => !value)}>{showReport ? "Hide report" : "Report"}</button>
          </div>
        </div>

        {showScan ? (
          <div style={subPanel}>
            <div><strong>Scan this project&apos;s ITPs for review points</strong><p style={{ margin: "2px 0 0", color: "#53565A", fontSize: 12 }}>Uses the Enshore column already remembered or suggested for each ITP. ITPs that need a column chosen, or that are scanned, are listed for you to do from the NOI Tracker.</p></div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ ...tableStyle, minWidth: 700 }}>
                <thead><tr>{["ITP", "Column used", "How chosen", "Review points", "New", ""].map((heading) => <th key={heading} style={th}>{heading}</th>)}</tr></thead>
                <tbody>
                  {scanRows.map((row) => (
                    <tr key={row.itp.id}>
                      <td style={td}><strong style={{ color: "#005670" }}>{row.itp.document_number}</strong><small style={subText}>{row.itp.supplier || "No supplier"}</small></td>
                      <td style={td}>{row.result?.columnLabel || "-"}</td>
                      <td style={td}>{row.result?.how || "-"}</td>
                      <td style={td}>{row.result ? row.result.points.length : "…"}</td>
                      <td style={td}>{row.result ? row.newCount : "…"}</td>
                      <td style={td}>{row.result ? <span style={{ ...pillBase, ...(row.result.status === "ready" ? pillAccepted : pillPending) }} title={row.result.note}>{row.result.status === "ready" ? "Ready" : row.result.status === "needs-column" ? "Pick a column" : row.result.status === "scanned" ? "Scanned PDF" : row.result.status === "no-table" ? "No table found" : "Error"}</span> : <span style={mutedText}>Reading…</span>}{row.result?.note ? <small style={subText}>{row.result.note}</small> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={actionRow}>
              <button type="button" style={primaryButton} disabled={scanning || busy || !scanRows.some((row) => row.newCount)} onClick={() => void addScanned()}>
                {scanning ? "Reading ITPs..." : `Add ${scanRows.reduce((total, row) => total + (row.result?.status === "ready" ? row.newCount || 0 : 0), 0)} new review points`}
              </button>
              <button type="button" style={secondaryButton} onClick={() => { setShowScan(false); setScanRows([]); }}>Close</button>
            </div>
          </div>
        ) : null}

        {showReport ? (
          <div style={subPanel}>
            <div style={filterBar}>
              <div style={fieldStyle}><span style={labelStyle}>Version</span><div style={segStyle} role="group" aria-label="Report version"><button type="button" aria-pressed={reportVersion === "internal"} style={reportVersion === "internal" ? segActive : segButton} onClick={() => setReportVersion("internal")}>Internal</button><button type="button" aria-pressed={reportVersion === "client"} style={reportVersion === "client" ? segActive : segButton} onClick={() => setReportVersion("client")}>Client</button></div></div>
              <label style={fieldStyle}><span style={labelStyle}>Include</span><select style={inputStyle} value={reportScope} onChange={(event) => setReportScope(event.target.value as typeof reportScope)}><option value="all">All statuses</option><option value="open">Not yet accepted</option><option value="Pending">Pending only</option><option value="Accepted">Accepted only</option><option value="Failed">Failed only</option></select></label>
              <label style={fieldStyle}><span style={labelStyle}>Group by</span><select style={inputStyle} value={reportGroup} onChange={(event) => setReportGroup(event.target.value as ReviewReportGroup)}><option value="itp">ITP</option><option value="project">Project</option></select></label>
              <div style={actionRow}><button type="button" style={secondaryButton} disabled={!reportPoints().length} onClick={downloadExcel}>Download Excel</button><button type="button" style={primaryButton} disabled={!reportPoints().length} onClick={() => void downloadPdf()}>Download PDF</button></div>
            </div>
            <div style={noticeStyle}>
              {reportVersion === "client"
                ? <><strong>Client version.</strong> Failed points show as &quot;Pending - resubmission required&quot; with no failure reason. Reviewer names and target dates are left out. Accepted points keep their sign-off.</>
                : <><strong>Internal version.</strong> Includes failure reasons, reviewers and target dates. Not for sharing with the client.</>}
              {" "}{reportPoints().length} review point{reportPoints().length === 1 ? "" : "s"} in this report, following the filters above.
            </div>
          </div>
        ) : null}

        <div style={{ fontSize: 12, color: "#53565A" }}>Showing <strong>{rows.length}</strong> of <strong>{points.length}</strong> review points</div>

        {loading ? <div style={emptyStyle}>Loading review points...</div> : rows.length === 0 ? (
          <div style={emptyStyle}>{points.length === 0 ? (projectKey ? "No review points yet. Scan an ITP in the NOI Tracker, or use Scan ITPs for review points above." : "No review points yet.") : "No review points match the current filters."}</div>
        ) : view === "register" ? (
          <div style={{ overflowX: "auto", border: "1px solid #D0D0CE", borderRadius: 12 }}>
            <table style={tableStyle}>
              <thead><tr><th style={th} aria-label="Select" />{["ITP", "Section", "Review point", "Code", "Reviewer", "Target date", "Status", "Sign-off", ""].map((heading) => <th key={heading} style={th}>{heading}</th>)}</tr></thead>
              <tbody>
                {rows.map((point) => {
                  const itp = itpById.get(point.itp_id);
                  return (
                    <Fragment key={point.id}>
                      <tr>
                        <td style={td}><input type="checkbox" aria-label={`Select ${point.section_number}`} checked={Boolean(selected[point.id])} onChange={(event) => setSelected((current) => ({ ...current, [point.id]: event.target.checked }))} /></td>
                        <td style={td}><strong style={{ color: "#005670", whiteSpace: "nowrap" }}>{itp?.document_number || "-"}</strong><small style={subText}>{itp?.supplier || ""}{!projectKey ? ` · ${projectLabel(point.project_key)}` : ""}</small></td>
                        <td style={{ ...td, fontWeight: 800, color: "#005670" }}>{point.section_number}</td>
                        <td style={td}>{point.activity_description}</td>
                        <td style={td}><span style={codeChip}>{point.code}</span></td>
                        <td style={td}>{point.reviewer || <span style={{ ...mutedText, fontStyle: "italic" }}>Unassigned</span>}</td>
                        <td style={{ ...td, whiteSpace: "nowrap" }}>{targetCell(point)}</td>
                        <td style={td}>{pill(point.status)}</td>
                        <td style={td}>{signOff(point)}</td>
                        <td style={td}>{actions(point)}</td>
                      </tr>
                      {historyId === point.id ? <tr><td colSpan={10} style={{ ...td, background: "#EEF7F8" }}>{historyBlock()}</td></tr> : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {grouped.map(([itpId, list]) => {
              const itp = itpById.get(itpId);
              const full = baseFiltered.filter((point) => point.itp_id === itpId);
              const accepted = full.filter((point) => point.status === "Accepted").length;
              const failed = full.filter((point) => point.status === "Failed").length;
              const pendingIds = list.filter((point) => point.status === "Pending").map((point) => point.id);
              return (
                <div key={itpId} style={itpCard}>
                  <div style={itpHead}>
                    <div><strong style={{ color: "#005670" }}>{itp?.document_number || "Unknown ITP"}</strong><small style={subText}>{itp?.supplier || "No supplier"} · {projectLabel(list[0].project_key)}</small></div>
                    <div style={{ flex: "1 1 180px", display: "grid", gap: 4, minWidth: 160 }}>
                      <div style={{ height: 8, borderRadius: 99, background: "#D0D0CE", overflow: "hidden", display: "flex" }}><i style={{ ...barFill, background: "#005670", width: `${(accepted / full.length) * 100}%` }} /><i style={{ ...barFill, background: "#F93822", width: `${(failed / full.length) * 100}%` }} /></div>
                      <small>{accepted} of {full.length} accepted{failed ? ` · ${failed} failed` : ""} · {full.filter((point) => point.status === "Pending").length} pending</small>
                    </div>
                    {pendingIds.length ? <button type="button" style={secondaryButton} onClick={() => setSelected((current) => ({ ...current, ...Object.fromEntries(pendingIds.map((id) => [id, true])) }))}>Select all {pendingIds.length} pending</button> : null}
                  </div>
                  {list.map((point) => (
                    <div key={point.id}>
                      <div style={itpRow}>
                        <input type="checkbox" aria-label={`Select ${point.section_number}`} checked={Boolean(selected[point.id])} onChange={(event) => setSelected((current) => ({ ...current, [point.id]: event.target.checked }))} />
                        <strong style={{ color: "#005670" }}>{point.section_number}</strong>
                        <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{point.activity_description} <span style={codeChip}>{point.code}</span><br />{signOff(point)}</span>
                        <span>{point.reviewer || <span style={{ ...mutedText, fontStyle: "italic" }}>Unassigned</span>}</span>
                        <span style={{ whiteSpace: "nowrap" }}>{targetCell(point)}</span>
                        {pill(point.status)}
                        {actions(point)}
                      </div>
                      {historyId === point.id ? <div style={{ padding: "8px 14px", background: "#EEF7F8" }}>{historyBlock()}</div> : null}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
        {selectionBar}
      </section>

      {dialog ? (
        <div className="review-points" style={scrim} onClick={(event) => { if (event.target === event.currentTarget && !busy) closeDialog(); }}>
          <div style={dialogStyle} role="dialog" aria-modal="true" aria-label={dialog.kind === "assign" ? "Assign review points" : "Sign off review points"}>
            <h2 style={{ margin: 0, fontSize: 18 }}>{dialog.kind === "assign" ? `Assign ${dialogPoints.length} review point${dialogPoints.length === 1 ? "" : "s"}` : `${dialog.kind === "accept" ? "Accept" : "Fail"} ${dialogPoints.length} review point${dialogPoints.length === 1 ? "" : "s"}`}</h2>
            <div style={{ display: "grid", gap: 6, maxHeight: 180, overflow: "auto" }}>
              {dialogPoints.map((point) => <div key={point.id} style={{ borderLeft: "3px solid #005670", padding: "4px 10px", fontSize: 13 }}><strong>{itpById.get(point.itp_id)?.document_number} · {point.section_number}</strong> {point.activity_description}</div>)}
            </div>
            {dialog.kind === "assign" ? (
              <>
                <label style={fieldStyle}><span style={labelStyle}>Reviewer</span><select style={inputStyle} value={assignReviewer} onChange={(event) => setAssignReviewer(event.target.value)}><option value="">Keep as is</option>{people.map((name) => <option key={name}>{name}</option>)}</select></label>
                <label style={fieldStyle}><span style={labelStyle}>Target date</span><input type="date" style={inputStyle} value={assignDate} onChange={(event) => setAssignDate(event.target.value)} /></label>
                <div style={actionRow}><button type="button" style={secondaryButton} onClick={closeDialog} disabled={busy}>Cancel</button><button type="button" style={primaryButton} disabled={busy || (!assignReviewer && !assignDate)} onClick={() => void submitDialog()}>{busy ? "Saving..." : "Save"}</button></div>
              </>
            ) : (
              <>
                <div style={whoStyle}>Signing as <strong style={{ color: "#005670" }}>{myName || myEmail}</strong>. The date and time are recorded by the server when you sign, against your name{dialogPoints.length > 1 ? ", one entry per point," : ""} and cannot be edited later.</div>
                <label style={fieldStyle}><span style={labelStyle}>{dialog.kind === "fail" ? "Reason for failing (required)" : "Comment (optional)"}</span><textarea style={{ ...inputStyle, minHeight: 72, resize: "vertical" }} value={note} onChange={(event) => setNote(event.target.value)} placeholder={dialog.kind === "fail" ? "What needs to be corrected or resubmitted?" : "Add a note if useful"} /></label>
                <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, cursor: "pointer" }}><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />I confirm that I have reviewed {dialogPoints.length > 1 ? "these points" : "this point"} and my decision is to {dialog.kind === "accept" ? "accept" : "fail"} {dialogPoints.length > 1 ? "them" : "it"}.</label>
                <div style={actionRow}><button type="button" style={secondaryButton} onClick={closeDialog} disabled={busy}>Cancel</button><button type="button" style={dialog.kind === "accept" ? primaryButton : { ...secondaryButton, color: "#F93822", borderColor: "#F93822" }} disabled={busy || !confirmed || dialogPoints.length === 0 || (dialog.kind === "fail" && note.trim().length < 3)} onClick={() => void submitDialog()}>{busy ? "Signing..." : dialog.kind === "accept" ? `Sign and accept${dialogPoints.length > 1 ? ` (${dialogPoints.length})` : ""}` : `Sign and fail${dialogPoints.length > 1 ? ` (${dialogPoints.length})` : ""}`}</button></div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

const surface: CSSProperties = { background: "#FFFFFF", border: "1px solid #D0D0CE", borderRadius: 18, padding: 18, display: "grid", gap: 14, minWidth: 0 };
const bannerStyle: CSSProperties = { background: "#005670", color: "#FFFFFF", borderRadius: 12, padding: "12px 16px", display: "grid", gap: 2 };
const noticeStyle: CSSProperties = { background: "#EEF7F8", border: "1px solid #63B1BC", borderRadius: 10, padding: "8px 12px", fontSize: 13, color: "#000000" };
const subPanel: CSSProperties = { border: "1px solid #005670", borderRadius: 14, background: "#ECECE7", padding: 14, display: "grid", gap: 12 };
const kpiGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 };
const kpiCard: CSSProperties = { textAlign: "left", font: "inherit", color: "#000000", background: "#FFFFFF", border: "1px solid #D0D0CE", borderTop: "3px solid #D0D0CE", borderRadius: 12, padding: "10px 14px", cursor: "pointer", display: "grid", gap: 2 };
const kpiActive: CSSProperties = { background: "#EEF7F8", borderColor: "#005670" };
const kpiLabel: CSSProperties = { fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "#53565A", fontWeight: 800 };
const filterBar: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 10, alignItems: "end" };
const fieldStyle: CSSProperties = { display: "grid", gap: 4, minWidth: 0 };
const labelStyle: CSSProperties = { fontSize: 12, fontWeight: 800, color: "#53565A" };
const inputStyle: CSSProperties = { font: "inherit", fontSize: 13, color: "#000000", background: "#FFFFFF", border: "1px solid #D0D0CE", borderRadius: 10, padding: "8px 10px", minWidth: 150 };
const primaryButton: CSSProperties = { font: "inherit", fontSize: 13, fontWeight: 800, borderRadius: 10, padding: "8px 14px", cursor: "pointer", border: "1px solid #005670", background: "#005670", color: "#FFFFFF" };
const secondaryButton: CSSProperties = { ...primaryButton, border: "1px solid #D0D0CE", background: "#FFFFFF", color: "#000000" };
const okButton: CSSProperties = { ...primaryButton, padding: "5px 11px", fontSize: 12 };
const badButton: CSSProperties = { ...secondaryButton, padding: "5px 11px", fontSize: 12, color: "#F93822", borderColor: "#F93822" };
const ghostButton: CSSProperties = { ...secondaryButton, padding: "5px 10px", fontSize: 12, color: "#53565A" };
const barButton: CSSProperties = { ...secondaryButton, color: "#005670" };
const actionRow: CSSProperties = { display: "flex", gap: 6, flexWrap: "wrap" };
const segStyle: CSSProperties = { display: "inline-flex", border: "1px solid #D0D0CE", borderRadius: 10, overflow: "hidden" };
const segButton: CSSProperties = { font: "inherit", fontSize: 12, fontWeight: 800, padding: "8px 12px", border: 0, background: "#FFFFFF", color: "#000000", cursor: "pointer" };
const segActive: CSSProperties = { ...segButton, background: "#005670", color: "#FFFFFF" };
const tableStyle: CSSProperties = { width: "100%", borderCollapse: "collapse", minWidth: 1040 };
const th: CSSProperties = { textAlign: "left", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", background: "#005670", color: "#FFFFFF", padding: "9px 12px", whiteSpace: "nowrap" };
const td: CSSProperties = { padding: "10px 12px", borderBottom: "1px solid #D0D0CE", verticalAlign: "top", fontSize: 13 };
const subText: CSSProperties = { display: "block", color: "#53565A", fontWeight: 400, fontSize: 12 };
const mutedText: CSSProperties = { color: "#53565A", fontSize: 12 };
const codeChip: CSSProperties = { display: "inline-block", fontSize: 11, fontWeight: 900, padding: "2px 8px", borderRadius: 6, background: "#EEF7F8", color: "#005670" };
const pillBase: CSSProperties = { display: "inline-block", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 900, whiteSpace: "nowrap" };
const pillPending: CSSProperties = { background: "#ECECE7", color: "#000000", boxShadow: "inset 0 0 0 1px #FFAD00" };
const pillAccepted: CSSProperties = { background: "#EEF7F8", color: "#005670" };
const pillFailed: CSSProperties = { background: "#ECECE7", color: "#F93822" };
const emptyStyle: CSSProperties = { padding: 28, textAlign: "center", color: "#53565A", background: "#ECECE7", borderRadius: 12 };
const selectionBarStyle: CSSProperties = { position: "sticky", bottom: 12, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between", background: "#005670", color: "#FFFFFF", padding: "10px 14px", borderRadius: 12, zIndex: 4 };
const planGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 };
const planCard: CSSProperties = { border: "1px solid #D0D0CE", borderRadius: 14, padding: "14px 16px", display: "grid", gap: 10, alignContent: "start", minWidth: 0 };
const barRow: CSSProperties = { display: "grid", gridTemplateColumns: "minmax(90px, 140px) 1fr 36px", gap: 10, alignItems: "center", fontSize: 13 };
const barTrack: CSSProperties = { height: 12, borderRadius: 99, background: "#D0D0CE", overflow: "hidden", display: "flex" };
const barFill: CSSProperties = { display: "block", height: "100%" };
const miniTable: CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 12 };
const miniTh: CSSProperties = { textAlign: "left", padding: "6px 8px", background: "#EEF7F8", color: "#53565A" };
const miniTd: CSSProperties = { padding: "6px 8px", borderBottom: "1px solid #D0D0CE" };
const itpCard: CSSProperties = { border: "1px solid #D0D0CE", borderRadius: 14, overflow: "hidden", background: "#FFFFFF" };
const itpHead: CSSProperties = { display: "flex", flexWrap: "wrap", gap: "10px 16px", alignItems: "center", padding: "12px 14px", background: "#EEF7F8" };
const itpRow: CSSProperties = { display: "grid", gridTemplateColumns: "24px 56px minmax(0, 1fr) 150px 110px 90px 170px", gap: 10, alignItems: "center", padding: "10px 14px", borderTop: "1px solid #D0D0CE", fontSize: 13 };
const scrim: CSSProperties = { position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.45)", display: "grid", placeItems: "center", padding: 16, zIndex: 50 };
const dialogStyle: CSSProperties = { width: "min(540px, 100%)", background: "#FFFFFF", borderRadius: 16, padding: 20, display: "grid", gap: 14, maxHeight: "90vh", overflow: "auto" };
const whoStyle: CSSProperties = { background: "#EEF7F8", borderRadius: 10, padding: "10px 12px", fontSize: 13 };

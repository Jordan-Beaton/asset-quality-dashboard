"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { AlignmentType, BorderStyle, Document as WordDocument, Footer, Packer, PageOrientation, Paragraph, SimpleField, Table, TableCell, TableLayoutType, TableRow, TextRun, WidthType } from "docx";
import { QualityKpiCard } from "./QualityKpiCard";
import { ImsButton, ImsFilterPanel, ImsPanel } from "./ImsPrimitives";
import { useImsPermissions } from "./ImsPermissions";
import { supabase } from "../lib/supabase";

type View = "dashboard" | "register" | "create" | "settings";
type Severity = "Critical" | "Major" | "Minor";
type PointStatus = "Draft" | "Open" | "In Progress" | "Ready for Verification" | "Employer Review" | "Closed" | "Converted to NCR" | "Unable to Correct" | "Formal Employer Close-out";
type OpenPoint = {
  id: string; project_key: string; open_point_number: string; title: string; description: string; identified_date: string; source_type: string; raised_by: string | null; raised_by_person_id: string | null;
  responsible_company: string | null; owner: string | null; owner_person_id: string | null; severity: Severity; status: PointStatus; physical_component: string | null; location: string | null;
  inspection_test_reference: string; itp_id: string | null; itp_reference: string | null; noi_point_id: string | null; noi_reference: string | null; sbs_reference: string | null; wbs_reference: string | null;
  project_phase: string | null; phase_end_date: string | null; taking_over_date: string | null; target_closure_date: string | null; employer_extension_agreed: boolean; employer_extension_date: string | null;
  employer_extension_reference: string | null; toc_inclusion_agreed: boolean; toc_reference: string | null; risk_id: string | null; risk_reference: string | null; ncr_id: string | null; ncr_reference: string | null;
  resolution_action: string | null; verification_method: string | null; verified_by: string | null; verified_at: string | null; employer_verification_status: string; employer_verified_by: string | null;
  employer_verified_at: string | null; closure_date: string | null; closure_report_reference: string | null; unable_to_correct_reason: string | null; formal_closeout_reference: string | null;
  cde_registration_due: string | null; cde_registered_at: string | null; cde_mirrored_at: string | null; cde_submission_reference: string | null; cde_uploaded_by: string | null; notes: string | null;
  created_at: string; updated_at: string;
};
type Evidence = { id: string; open_point_id: string; evidence_type: string; file_name: string; file_path: string; file_size: number | null; notes: string | null; uploaded_at: string };
type Option = { id: string; label: string; meta?: string };
type Settings = { taking_over_date: string; phase_milestones: Array<{ name: string; date: string }>; sbs_options: string[]; wbs_options: string[]; cde_mirror_weekday: number };

const statuses: PointStatus[] = ["Draft", "Open", "In Progress", "Ready for Verification", "Employer Review", "Closed", "Converted to NCR", "Unable to Correct", "Formal Employer Close-out"];
const severities: Severity[] = ["Critical", "Major", "Minor"];
const emptyForm = {
  title: "", description: "", identified_date: new Date().toISOString().slice(0, 10), source_type: "Enshore", raised_by: "", raised_by_person_id: "", responsible_company: "Enshore Subsea", owner: "", owner_person_id: "",
  severity: "Minor" as Severity, status: "Open" as PointStatus, physical_component: "", location: "", inspection_test_reference: "", itp_id: "", itp_reference: "", noi_point_id: "", noi_reference: "",
  sbs_reference: "", wbs_reference: "", project_phase: "", phase_end_date: "", taking_over_date: "", target_closure_date: "", employer_extension_agreed: false, employer_extension_date: "",
  employer_extension_reference: "", toc_inclusion_agreed: false, toc_reference: "", risk_id: "", risk_reference: "", ncr_id: "", ncr_reference: "", resolution_action: "", verification_method: "",
  verified_by: "", verified_at: "", employer_verification_status: "Not Submitted", employer_verified_by: "", employer_verified_at: "", closure_date: "", closure_report_reference: "",
  unable_to_correct_reason: "", formal_closeout_reference: "", cde_registration_due: "", cde_registered_at: "", cde_mirrored_at: "", cde_submission_reference: "", cde_uploaded_by: "", notes: "",
};

function clean(value: unknown) { return String(value ?? "").trim(); }
function addDays(value: string, days: number) { const date = new Date(`${value}T00:00:00`); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); }
function isClosed(point: OpenPoint) { return ["Closed", "Formal Employer Close-out", "Converted to NCR"].includes(point.status); }
function effectiveDue(point: OpenPoint) { if (point.employer_extension_agreed && point.employer_extension_date) return point.employer_extension_date; if (point.severity === "Minor" && point.toc_inclusion_agreed && point.target_closure_date) return point.target_closure_date; const contractual = point.severity === "Minor" ? point.taking_over_date : point.phase_end_date; return [point.target_closure_date, contractual].filter(Boolean).sort()[0] || ""; }
function isOverdue(point: OpenPoint) { const due = effectiveDue(point); return !isClosed(point) && Boolean(due) && due < new Date().toISOString().slice(0, 10); }
function mirrorOverdue(point: OpenPoint) { if (isClosed(point)) return false; const baseline = point.cde_mirrored_at || point.created_at || point.identified_date; return Date.now() - new Date(baseline).getTime() > 7 * 86400000; }
function fmt(value: string | null | undefined) { if (!value) return "-"; const date = new Date(value.length === 10 ? `${value}T00:00:00` : value); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
function download(blob: Blob, name: string) { const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url); }

export function WaddenSeaOpenPoints() {
  const permission = useImsPermissions();
  const [view, setView] = useState<View>("dashboard"); const [points, setPoints] = useState<OpenPoint[]>([]); const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [people, setPeople] = useState<Option[]>([]); const [ncrs, setNcrs] = useState<Option[]>([]);
  const [settings, setSettings] = useState<Settings>({ taking_over_date: "", phase_milestones: [], sbs_options: [], wbs_options: [], cde_mirror_weekday: 5 });
  const [form, setForm] = useState(emptyForm); const [selected, setSelected] = useState<OpenPoint | null>(null); const [message, setMessage] = useState("Loading Open Points..."); const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState(""); const [statusFilter, setStatusFilter] = useState("All"); const [severityFilter, setSeverityFilter] = useState("All"); const [ownerFilter, setOwnerFilter] = useState("All"); const [sourceFilter, setSourceFilter] = useState("All");
  const [showRegisterFilters, setShowRegisterFilters] = useState(false);
  const [showOnlyOverdue, setShowOnlyOverdue] = useState(false); const [evidenceType, setEvidenceType] = useState("Supporting Evidence"); const [evidenceNote, setEvidenceNote] = useState("");
  const [settingsDraft, setSettingsDraft] = useState({ takingOver: "", phases: "", sbs: "", wbs: "" });

  const canEdit = permission.isMasterAdmin || permission.fullAccess || permission.canEdit || permission.canCreate;
  async function load() {
    const [pointResult, evidenceResult, settingsResult, peopleResult, ncrResult] = await Promise.all([
      supabase.from("project_open_points").select("*").eq("project_key", "wadden-sea").order("created_at", { ascending: false }),
      supabase.from("project_open_point_evidence").select("*").order("uploaded_at", { ascending: false }),
      supabase.from("project_open_point_settings").select("*").eq("project_key", "wadden-sea").maybeSingle(),
      supabase.from("people").select("id,name,role").eq("active", true).order("name"),
      supabase.from("ncrs").select("id,ncr_number,title,status,project").order("ncr_number"),
    ]);
    if (pointResult.error) { setMessage(pointResult.error.message.includes("project_open_points") ? "Open Points database is not live yet. Apply scripts/sql/project_open_points.sql in Supabase." : pointResult.error.message); return; }
    setPoints((pointResult.data || []) as OpenPoint[]); setEvidence((evidenceResult.data || []) as Evidence[]);
    setPeople((peopleResult.data || []).map((x) => ({ id: String(x.id), label: clean(x.name), meta: clean(x.role) })));
    setNcrs((ncrResult.data || []).map((x) => ({ id: String(x.id), label: clean(x.ncr_number), meta: [clean(x.project), clean(x.title)].filter(Boolean).join(" - ") })));
    if (settingsResult.data) { const next = settingsResult.data as Settings; setSettings(next); setSettingsDraft({ takingOver: next.taking_over_date || "", phases: (next.phase_milestones || []).map((x) => `${x.name}|${x.date}`).join("\n"), sbs: (next.sbs_options || []).join(", "), wbs: (next.wbs_options || []).join(", ") }); }
    setMessage(`${(pointResult.data || []).length} Open Points loaded.`);
  }
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => points.filter((point) => {
    const text = [point.open_point_number, point.title, point.description, point.owner, point.responsible_company, point.itp_reference, point.noi_reference, point.sbs_reference, point.wbs_reference, point.project_phase].join(" ").toLowerCase();
    return (!search || text.includes(search.toLowerCase())) && (statusFilter === "All" || point.status === statusFilter) && (severityFilter === "All" || point.severity === severityFilter) && (ownerFilter === "All" || point.owner === ownerFilter) && (sourceFilter === "All" || point.source_type === sourceFilter) && (!showOnlyOverdue || isOverdue(point));
  }), [points, search, statusFilter, severityFilter, ownerFilter, sourceFilter, showOnlyOverdue]);
  const owners = useMemo(() => [...new Set(points.map((x) => x.owner).filter(Boolean) as string[])].sort(), [points]);
  const metrics = useMemo(() => ({ open: points.filter((x) => !isClosed(x)).length, critical: points.filter((x) => !isClosed(x) && x.severity === "Critical").length, major: points.filter((x) => !isClosed(x) && x.severity === "Major").length, minor: points.filter((x) => !isClosed(x) && x.severity === "Minor").length, overdue: points.filter(isOverdue).length, employer: points.filter((x) => !isClosed(x) && x.source_type === "Employer").length, verification: points.filter((x) => x.status === "Ready for Verification" || x.status === "Employer Review").length, mirror: points.filter(mirrorOverdue).length }), [points]);

  function resetForm() { setSelected(null); setForm({ ...emptyForm, taking_over_date: settings.taking_over_date || "" }); setView("create"); }
  function openPoint(point: OpenPoint) { const values = Object.fromEntries(Object.keys(emptyForm).map((key) => [key, point[key as keyof OpenPoint] ?? emptyForm[key as keyof typeof emptyForm]])) as typeof emptyForm; setSelected(point); setForm(values); setView("create"); }
  function update<K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) { setForm((current) => ({ ...current, [key]: value })); }
  function selectNcr(id: string) { const item = ncrs.find((x) => x.id === id); setForm((current) => ({ ...current, ncr_id: id, ncr_reference: item?.label || "" })); }

  async function addProjectPhase() {
    if (!canEdit) { setMessage("Edit permission is required to add a project phase."); return; }
    const name = window.prompt("New project phase name"); if (!name?.trim()) return;
    const date = window.prompt("Phase end date (YYYY-MM-DD)"); if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) { setMessage("Enter the phase end date as YYYY-MM-DD."); return; }
    const phases = [...settings.phase_milestones.filter((phase) => phase.name.toLowerCase() !== name.trim().toLowerCase()), { name: name.trim(), date }].sort((a, b) => a.date.localeCompare(b.date));
    const { error } = await supabase.from("project_open_point_settings").upsert({ project_key: "wadden-sea", phase_milestones: phases });
    if (error) { setMessage(`Project phase could not be added: ${error.message}`); return; }
    await load(); setForm((current) => ({ ...current, project_phase: name.trim(), phase_end_date: date })); setMessage(`Project phase ${name.trim()} added and selected. Its change history has been retained.`);
  }

  async function savePoint() {
    if (!canEdit) { setMessage("Edit permission is required."); return; }
    if (!form.title.trim() || !form.description.trim()) { setMessage("Title and outstanding-work description are required."); return; }
    const closureEvidence = selected ? evidence.some((x) => x.open_point_id === selected.id && ["Closure Evidence", "Employer Acceptance", "Joint Inspection", "Formal Close-out"].includes(x.evidence_type)) : false;
    if (["Closed", "Formal Employer Close-out"].includes(form.status) && (!form.resolution_action || !form.verified_by || !form.verified_at || !form.closure_date || !closureEvidence)) { setMessage("Closure requires a resolution, verifier, verification date, closure date and closure/Employer evidence."); return; }
    if (form.status === "Formal Employer Close-out" && !form.formal_closeout_reference) { setMessage("Formal Employer Close-out requires the Employer close-out reference."); return; }
    if (form.status === "Converted to NCR" && !form.ncr_reference) { setMessage("Select the NCR before marking an Open Point as converted."); return; }
    if (form.status === "Unable to Correct" && !form.unable_to_correct_reason) { setMessage("Record why this Open Point cannot be corrected."); return; }
    setSaving(true); const { data: auth } = await supabase.auth.getUser();
    const phase = settings.phase_milestones.find((x) => x.name === form.project_phase);
    const payload = { ...form, inspection_test_reference: form.inspection_test_reference || "General inspection / project review", project_key: "wadden-sea", phase_end_date: form.phase_end_date || phase?.date || null, taking_over_date: form.taking_over_date || settings.taking_over_date || null,
      cde_registration_due: form.source_type === "Employer" ? form.cde_registration_due || addDays(form.identified_date, 7) : form.cde_registration_due || null,
      raised_by_person_id: form.raised_by_person_id || null, owner_person_id: form.owner_person_id || null, itp_id: form.itp_id || null, noi_point_id: form.noi_point_id || null, risk_id: form.risk_id || null, ncr_id: form.ncr_id || null,
      target_closure_date: form.target_closure_date || null, employer_extension_date: form.employer_extension_date || null, employer_verified_at: form.employer_verified_at || null, closure_date: form.closure_date || null,
      cde_registered_at: form.cde_registered_at || null, cde_mirrored_at: form.cde_mirrored_at || null, verified_at: form.verified_at || null, ...(selected ? {} : { created_by: auth.user?.id }), updated_by: auth.user?.id };
    const result = selected ? await supabase.from("project_open_points").update(payload).eq("id", selected.id) : await supabase.from("project_open_points").insert(payload);
    setSaving(false); if (result.error) { setMessage(`Open Point save failed: ${result.error.message}`); return; } await load(); setView("register"); setSelected(null); setForm(emptyForm); setMessage(selected ? "Open Point updated." : "Open Point created.");
  }
  async function removePoint() { if (!selected || !canEdit || !window.confirm(`Delete ${selected.open_point_number}?`)) return; const { error } = await supabase.from("project_open_points").delete().eq("id", selected.id); if (error) { setMessage(error.message); return; } await load(); resetForm(); }

  async function uploadEvidence(event: ChangeEvent<HTMLInputElement>) {
    if (!selected || !canEdit) { event.target.value = ""; return; } const files = Array.from(event.target.files || []); event.target.value = ""; if (!files.length) return;
    const { data: auth } = await supabase.auth.getUser();
    for (const file of files) { const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "-"); const path = `wadden-sea/open-points/${selected.open_point_number}/${Date.now()}-${safe}`; const uploaded = await supabase.storage.from("project-documents").upload(path, file); if (uploaded.error) { setMessage(uploaded.error.message); return; } const row = await supabase.from("project_open_point_evidence").insert({ open_point_id: selected.id, evidence_type: evidenceType, file_name: file.name, file_path: path, file_size: file.size, content_type: file.type, notes: evidenceNote || null, uploaded_by: auth.user?.id }); if (row.error) { setMessage(row.error.message); return; } }
    setEvidenceNote(""); await load(); setMessage(`${files.length} evidence file(s) uploaded.`);
  }
  async function openEvidence(item: Evidence) { const { data, error } = await supabase.storage.from("project-documents").createSignedUrl(item.file_path, 300); if (error || !data?.signedUrl) { setMessage(error?.message || "Evidence could not be opened."); return; } window.open(data.signedUrl, "_blank", "noopener,noreferrer"); }
  async function markMirrored(point: OpenPoint) { const reference = window.prompt("CDE submission / transmittal reference"); if (!reference) return; const uploader = window.prompt("Uploaded by", point.owner || "") || point.owner; const { error } = await supabase.from("project_open_points").update({ cde_mirrored_at: new Date().toISOString(), cde_registered_at: point.cde_registered_at || new Date().toISOString(), cde_submission_reference: reference, cde_uploaded_by: uploader }).eq("id", point.id); if (error) setMessage(error.message); else { await load(); setMessage(`${point.open_point_number} marked as mirrored to the Employer CDE.`); } }

  async function saveSettings() { if (!canEdit) return; const phases = settingsDraft.phases.split("\n").map((line) => line.split("|").map(clean)).filter((x) => x[0] && /^\d{4}-\d{2}-\d{2}$/.test(x[1])).map(([name, date]) => ({ name, date })); const next = { project_key: "wadden-sea", taking_over_date: settingsDraft.takingOver || null, phase_milestones: phases, sbs_options: settingsDraft.sbs.split(",").map(clean).filter(Boolean), wbs_options: settingsDraft.wbs.split(",").map(clean).filter(Boolean) }; const { error } = await supabase.from("project_open_point_settings").upsert(next); if (error) setMessage(error.message); else { await load(); setMessage("Open Points control settings saved."); } }

  function exportRows() { return filtered.map((p) => ({ ID: p.open_point_number, Description: p.description, Identified: p.identified_date, Source: p.source_type, "Raised By": p.raised_by, Company: p.responsible_company, Owner: p.owner, Severity: p.severity, Status: p.status, Component: p.physical_component, Location: p.location, SBS: p.sbs_reference, WBS: p.wbs_reference, Phase: p.project_phase, "Target Closure": effectiveDue(p), NCR: p.ncr_reference, Resolution: p.resolution_action, "Client Copy Date": p.cde_mirrored_at, "Closure Date": p.closure_date })); }
  function exportExcel() {
    const headers = ["ID", "Title / Description", "Severity", "Status", "Owner", "Phase", "Due", "NCR"];
    const rows = filtered.map((p) => [p.open_point_number, `${p.title}\n${p.description}`, p.severity, p.status, p.owner || "-", p.project_phase || "-", effectiveDue(p), p.ncr_reference || "-"]);
    const ws = XLSX.utils.aoa_to_sheet([["WADDEN SEA PROJECT"], ["OPEN POINTS REGISTER"], [`Generated ${new Date().toLocaleString("en-GB")} | ${filtered.length} records`], [], headers, ...rows]);
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } }, { s: { r: 2, c: 0 }, e: { r: 2, c: headers.length - 1 } }];
    ws["!cols"] = [14, 58, 12, 20, 22, 20, 14, 16].map((wch) => ({ wch }));
    ws["!autofilter"] = { ref: `A5:H${Math.max(5, rows.length + 5)}` };
    ws["!freeze"] = { xSplit: 0, ySplit: 5 };
    const wb = XLSX.utils.book_new(); wb.Props = { Title: "Wadden Sea Open Points Register", Subject: "Controlled project register", Company: "Enshore Subsea" }; XLSX.utils.book_append_sheet(wb, ws, "Open Points Register"); XLSX.writeFile(wb, `Wadden-Sea-Open-Points-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }
  function exportPdf() {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" }); const width = doc.internal.pageSize.getWidth(); const height = doc.internal.pageSize.getHeight();
    doc.setFillColor(15, 118, 110); doc.rect(0, 0, width, 24, "F"); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255); doc.setFontSize(17); doc.text("WADDEN SEA PROJECT", 10, 11); doc.setFontSize(10); doc.text("Open Points Register", 10, 18);
    doc.setTextColor(100, 116, 139); doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text(`Generated ${new Date().toLocaleString("en-GB")} | ${filtered.length} controlled records`, 10, 29);
    autoTable(doc, { startY: 33, theme: "grid", margin: { left: 10, right: 10, bottom: 15 }, head: [["ID", "Title / Description", "Severity", "Status", "Owner", "Phase", "Due", "NCR"]], body: filtered.map((p) => [p.open_point_number, `${p.title}\n${p.description}`, p.severity, p.status, p.owner || "-", p.project_phase || "-", fmt(effectiveDue(p)), p.ncr_reference || "-"]), headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255], fontStyle: "bold" }, styles: { fontSize: 7.5, cellPadding: 2, textColor: [15, 23, 42], lineColor: [226, 232, 240], lineWidth: 0.2, valign: "middle", overflow: "linebreak" }, alternateRowStyles: { fillColor: [248, 250, 252] }, columnStyles: { 1: { cellWidth: 85 } } });
    const pages = doc.getNumberOfPages(); for (let page = 1; page <= pages; page += 1) { doc.setPage(page); doc.setTextColor(100, 116, 139); doc.setFontSize(8); doc.text("Wadden Sea | Open Points Register", 10, height - 6); doc.text(`Page ${page} of ${pages}`, width - 10, height - 6, { align: "right" }); } doc.save(`Wadden-Sea-Open-Points-${new Date().toISOString().slice(0, 10)}.pdf`);
  }
  async function exportWord(rows = filtered, closureOnly = false) {
    const borders = { top: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" }, bottom: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" }, left: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" }, right: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" }, insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" }, insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" } };
    const makeCell = (value: string, header = false, fill?: string) => new TableCell({ margins: { top: 90, bottom: 90, left: 100, right: 100 }, shading: header ? { fill: "0F766E" } : fill ? { fill } : undefined, children: [new Paragraph({ children: [new TextRun({ text: value || "-", font: "Arial", bold: header, color: header ? "FFFFFF" : "0F172A", size: header ? 16 : 15 })] })] });
    const title = closureOnly && rows[0] ? `${rows[0].open_point_number} - Closure Report` : "Open Points Register";
    const registerTable = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED, borders, columnWidths: [900, 3300, 900, 1050, 1200, 1050, 850, 900], rows: [new TableRow({ tableHeader: true, children: ["ID", "Title / Description", "Severity", "Status", "Owner", "Phase", "Due", "NCR"].map((value) => makeCell(value, true)) }), ...rows.map((p, index) => new TableRow({ cantSplit: true, children: [p.open_point_number, `${p.title}\n${p.description}`, p.severity, p.status, p.owner || "-", p.project_phase || "-", fmt(effectiveDue(p)), p.ncr_reference || "-"].map((value) => makeCell(value, false, index % 2 === 0 ? "F8FAFC" : undefined)) }))] });
    const closureContent = rows[0] ? [["Outstanding Work", rows[0].description], ["Severity / Status", `${rows[0].severity} / ${rows[0].status}`], ["Owner", rows[0].owner || "-"], ["Linked NCR", rows[0].ncr_reference || "-"], ["Resolution", rows[0].resolution_action || "-"], ["Verification", `${rows[0].verification_method || "-"} | ${rows[0].verified_by || "-"} | ${fmt(rows[0].verified_at)}`], ["Client Verification", rows[0].employer_verification_status], ["Closure", `${fmt(rows[0].closure_date)} | ${rows[0].closure_report_reference || "-"}`]].map(([label, value], index) => new TableRow({ children: [makeCell(label, false, index % 2 === 0 ? "F8FAFC" : undefined), makeCell(value, false, index % 2 === 0 ? "F8FAFC" : undefined)] })) : [];
    const body = closureOnly ? [new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED, borders, columnWidths: [1900, 8100], rows: closureContent })] : [registerTable];
    const doc = new WordDocument({ styles: { default: { document: { run: { font: "Arial", size: 17, color: "0F172A" } } } }, sections: [{ properties: { page: { size: { orientation: PageOrientation.LANDSCAPE }, margin: { top: 540, right: 540, bottom: 720, left: 540, footer: 300 } } }, footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Wadden Sea | ${title} | Page `, font: "Arial", size: 15, color: "64748B" }), new SimpleField("PAGE"), new TextRun({ text: " of ", font: "Arial", size: 15, color: "64748B" }), new SimpleField("NUMPAGES")] })] }) }, children: [new Paragraph({ spacing: { after: 50 }, children: [new TextRun({ text: "WADDEN SEA PROJECT", font: "Arial", bold: true, size: 32, color: "0F766E" })] }), new Paragraph({ spacing: { after: 70 }, children: [new TextRun({ text: title, font: "Arial", bold: true, size: 26 })] }), new Paragraph({ spacing: { after: 170 }, children: [new TextRun({ text: `${rows.length} controlled record${rows.length === 1 ? "" : "s"} | Generated ${new Date().toLocaleString("en-GB")}`, font: "Arial", size: 16, color: "64748B" })] }), ...body] }] });
    const blob = await Packer.toBlob(doc); download(blob, closureOnly ? `${rows[0].open_point_number}-Closure-Report.docx` : `Wadden-Sea-Open-Points-${new Date().toISOString().slice(0, 10)}.docx`);
  }

  return <section style={shell}>
    <nav style={tabs}>{(["dashboard", "register", "create", "settings"] as View[]).map((item) => <button key={item} style={view === item ? activeTab : tab} onClick={() => item === "create" ? resetForm() : setView(item)}>{item === "create" ? "Raise Open Point" : item[0].toUpperCase() + item.slice(1)}</button>)}</nav>
    <div style={statusBar}><strong>Open Points:</strong> {message}<span>Wadden Sea controlled register</span></div>
    {view === "dashboard" && <><div style={kpis}><QualityKpiCard title="Total Open" value={metrics.open} accent="#0f766e" onClick={() => { setStatusFilter("All"); setView("register"); }} /><QualityKpiCard title="Critical" value={metrics.critical} accent="#991b1b" onClick={() => { setSeverityFilter("Critical"); setView("register"); }} /><QualityKpiCard title="Major" value={metrics.major} accent="#c2410c" onClick={() => { setSeverityFilter("Major"); setView("register"); }} /><QualityKpiCard title="Minor" value={metrics.minor} accent="#2563eb" onClick={() => { setSeverityFilter("Minor"); setView("register"); }} /><QualityKpiCard title="Overdue" value={metrics.overdue} accent="#dc2626" onClick={() => { setShowOnlyOverdue(true); setView("register"); }} /><QualityKpiCard title="Employer Raised" value={metrics.employer} accent="#7c3aed" onClick={() => { setSourceFilter("Employer"); setView("register"); }} /><QualityKpiCard title="Awaiting Verification" value={metrics.verification} accent="#d97706" onClick={() => setView("register")} /><QualityKpiCard title="CDE Mirror Due" value={metrics.mirror} accent="#ea580c" onClick={() => setView("register")} /></div><div style={twoCol}><Panel title="ADM Compliance Monitor"><Compliance label="Electronic register" ok /><Compliance label="Weekly CDE visibility" ok={metrics.mirror === 0} detail={`${metrics.mirror} require mirroring`} /><Compliance label="Employer points registered in 7 days" ok={!points.some((p) => p.source_type === "Employer" && !p.cde_registered_at && Boolean(p.cde_registration_due) && p.cde_registration_due! < new Date().toISOString().slice(0, 10))} /><Compliance label="Severity assigned" ok={!points.some((p) => !p.severity)} /><Compliance label="Closure evidence and verification" ok={!points.some((p) => isClosed(p) && !evidence.some((e) => e.open_point_id === p.id && e.evidence_type !== "Supporting Evidence"))} /></Panel><Panel title="Immediate Attention"><div style={attention}>{points.filter((p) => isOverdue(p) || mirrorOverdue(p)).slice(0, 12).map((p) => <button key={p.id} style={attentionRow} onClick={() => openPoint(p)}><span><strong>{p.open_point_number}</strong><small>{p.title}</small></span><b>{isOverdue(p) ? "Overdue" : "CDE due"}</b></button>)}{!points.length && <p>No Open Points recorded.</p>}</div></Panel></div></>}
    {view === "register" && <ImsPanel
      title="Open Points Register"
      subtitle="Select a row to open its full detail and edit panel."
      actions={<div style={compactActions}><ImsButton variant="secondary" onClick={exportExcel}>Excel</ImsButton><ImsButton variant="secondary" onClick={() => void exportWord()}>Word</ImsButton><ImsButton onClick={exportPdf}>PDF</ImsButton></div>}
    >
      <ImsFilterPanel
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search ID, title, owner, phase or NCR"
        showFilters={showRegisterFilters}
        onToggleFilters={() => setShowRegisterFilters((current) => !current)}
        actions={<ImsButton variant="secondary" onClick={() => { setSearch(""); setStatusFilter("All"); setSeverityFilter("All"); setSourceFilter("All"); setOwnerFilter("All"); setShowOnlyOverdue(false); }}>Clear Filters</ImsButton>}
      >
        <Field label="Status"><Select value={statusFilter} set={setStatusFilter} options={["All", ...statuses]} /></Field>
        <Field label="Severity"><Select value={severityFilter} set={setSeverityFilter} options={["All", ...severities]} /></Field>
        <Field label="Source"><Select value={sourceFilter} set={setSourceFilter} options={["All", "Enshore", "Employer", "Subcontractor", "Supplier"]} /></Field>
        <Field label="Owner"><Select value={ownerFilter} set={setOwnerFilter} options={["All", ...owners]} /></Field>
        <Field label="Deadline"><label style={check}><input type="checkbox" checked={showOnlyOverdue} onChange={(e) => setShowOnlyOverdue(e.target.checked)} /> Overdue only</label></Field>
      </ImsFilterPanel>
      <p style={registerCount}>Showing {filtered.length} of {points.length} Open Points</p>
      <div style={tableWrap}><table style={table}><colgroup>{[115, 330, 100, 150, 180, 155, 125, 120, 95].map((x, i) => <col key={i} style={{ width: x }} />)}</colgroup><thead><tr>{["ID", "Open Point", "Severity", "Status", "Owner / Company", "Phase", "Due", "Client Copy", "Evidence"].map((x) => <th key={x} style={tableHeader}>{x}</th>)}</tr></thead><tbody>{filtered.map((p) => <tr key={p.id} onClick={() => openPoint(p)} style={tableRow}><td style={tableCell}><strong>{p.open_point_number}</strong></td><td style={tableCell}><strong>{p.title}</strong><small style={cellDetail}>{p.description}</small></td><td style={tableCell}><Badge text={p.severity} danger={p.severity === "Critical"} /></td><td style={tableCell}>{p.status}</td><td style={tableCell}>{p.owner || "-"}<small style={cellDetail}>{p.responsible_company}</small></td><td style={tableCell}>{p.project_phase || "-"}</td><td style={{ ...tableCell, color: isOverdue(p) ? "#b91c1c" : undefined, fontWeight: isOverdue(p) ? 800 : undefined }}>{fmt(effectiveDue(p))}</td><td style={tableCell}><button style={linkButton} onClick={(e) => { e.stopPropagation(); void markMirrored(p); }}>{mirrorOverdue(p) ? "Copy due" : fmt(p.cde_mirrored_at)}</button></td><td style={tableCell}>{evidence.filter((x) => x.open_point_id === p.id).length}</td></tr>)}</tbody></table></div>
      {!filtered.length && <div style={emptyRegister}>No Open Points match the current filters.</div>}
    </ImsPanel>}
    {view === "create" && <Panel title={selected ? `${selected.open_point_number} - Edit Open Point` : "Raise Open Point"}>
      <p style={formHelp}>Record the issue in plain language. The project-control and client-document fields are available below only when needed.</p>
      <div style={formGrid}>
        <Field label="Title"><input style={input} value={form.title} onChange={(e) => update("title", e.target.value)} /></Field>
        <Field label="Date Identified"><input type="date" style={input} value={form.identified_date} onChange={(e) => update("identified_date", e.target.value)} /></Field>
        <Field label="Source"><select style={input} value={form.source_type} onChange={(e) => update("source_type", e.target.value)}>{["Enshore", "Employer", "Subcontractor", "Supplier"].map((x) => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Raised By"><select style={input} value={form.raised_by_person_id} onChange={(e) => { const item = people.find((x) => x.id === e.target.value); setForm((c) => ({ ...c, raised_by_person_id: e.target.value, raised_by: item?.label || "" })); }}><option value="">Select from People</option>{people.map((x) => <option key={x.id} value={x.id}>{x.label}{x.meta ? ` - ${x.meta}` : ""}</option>)}</select></Field>
        <Field label="Owner"><select style={input} value={form.owner_person_id} onChange={(e) => { const item = people.find((x) => x.id === e.target.value); setForm((c) => ({ ...c, owner_person_id: e.target.value, owner: item?.label || "" })); }}><option value="">Select from People</option>{people.map((x) => <option key={x.id} value={x.id}>{x.label}{x.meta ? ` - ${x.meta}` : ""}</option>)}</select></Field>
        <Field label="Severity"><select style={input} value={form.severity} onChange={(e) => update("severity", e.target.value as Severity)}>{severities.map((x) => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Status"><select style={input} value={form.status} onChange={(e) => update("status", e.target.value as PointStatus)}>{statuses.map((x) => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Component / Equipment"><input style={input} value={form.physical_component} onChange={(e) => update("physical_component", e.target.value)} /></Field>
        <Field label="Location"><input style={input} value={form.location} onChange={(e) => update("location", e.target.value)} /></Field>
        <Field label="Project Phase"><div style={inlineControl}><select style={input} value={form.project_phase} onChange={(e) => { const phase = settings.phase_milestones.find((x) => x.name === e.target.value); setForm((c) => ({ ...c, project_phase: e.target.value, phase_end_date: phase?.date || c.phase_end_date })); }}><option value="">Select phase</option>{settings.phase_milestones.map((x) => <option key={x.name}>{x.name}</option>)}</select><button type="button" style={miniButton} onClick={() => void addProjectPhase()}>Add New</button></div></Field>
        <Field label="Target Closure"><input type="date" style={input} value={form.target_closure_date} onChange={(e) => update("target_closure_date", e.target.value)} /></Field>
        <Field wide label="What is outstanding?"><textarea style={textarea} value={form.description} onChange={(e) => update("description", e.target.value)} /></Field>

        <details style={detailsPanel}>
          <summary style={detailsSummary}>Additional project links</summary>
          <div style={formGrid}>
            <Field label="Responsible Company"><input style={input} value={form.responsible_company} onChange={(e) => update("responsible_company", e.target.value)} /></Field>
            <Field label="Inspection / Test Reference"><input style={input} value={form.inspection_test_reference} onChange={(e) => update("inspection_test_reference", e.target.value)} placeholder="Inspection, test or walkdown" /></Field>
            <Field label="SBS"><DatalistInput value={form.sbs_reference} set={(v) => update("sbs_reference", v)} options={settings.sbs_options} id="op-sbs" /></Field>
            <Field label="WBS"><DatalistInput value={form.wbs_reference} set={(v) => update("wbs_reference", v)} options={settings.wbs_options} id="op-wbs" /></Field>
            <Field label="Linked NCR"><LinkSelect value={form.ncr_id} set={selectNcr} options={ncrs} /></Field>
            <Field wide label="Notes"><textarea style={textarea} value={form.notes} onChange={(e) => update("notes", e.target.value)} /></Field>
          </div>
        </details>

        {(selected || !["Draft", "Open", "In Progress"].includes(form.status)) && <details style={detailsPanel} open={!['Draft', 'Open', 'In Progress'].includes(form.status)}>
          <summary style={detailsSummary}>Resolution and closure</summary>
          <div style={formGrid}>
            <Field wide label="Resolution Action"><textarea style={textarea} value={form.resolution_action} onChange={(e) => update("resolution_action", e.target.value)} /></Field>
            <Field wide label="Verification Method"><textarea style={textarea} value={form.verification_method} onChange={(e) => update("verification_method", e.target.value)} /></Field>
            <Field label="Verified By"><input style={input} value={form.verified_by} onChange={(e) => update("verified_by", e.target.value)} /></Field>
            <Field label="Verified At"><input type="datetime-local" style={input} value={form.verified_at?.slice(0, 16) || ""} onChange={(e) => update("verified_at", e.target.value)} /></Field>
            <Field label="Closure Date"><input type="date" style={input} value={form.closure_date} onChange={(e) => update("closure_date", e.target.value)} /></Field>
            <Field label="Closure Report Reference"><input style={input} value={form.closure_report_reference} onChange={(e) => update("closure_report_reference", e.target.value)} /></Field>
            {form.status === "Unable to Correct" && <Field wide label="Why it cannot be corrected"><textarea style={textarea} value={form.unable_to_correct_reason} onChange={(e) => update("unable_to_correct_reason", e.target.value)} /></Field>}
            {form.status === "Formal Employer Close-out" && <Field label="Formal Employer Close-out Reference"><input style={input} value={form.formal_closeout_reference} onChange={(e) => update("formal_closeout_reference", e.target.value)} /></Field>}
          </div>
        </details>}

        {selected && <details style={detailsPanel}>
          <summary style={detailsSummary}>Client document system and contractual controls</summary>
          <p style={formHelp}>The Common Data Environment (CDE) is the client&apos;s controlled document-sharing system. These fields are normally maintained by project quality staff.</p>
          <div style={formGrid}>
            <Field label="Client Verification"><select style={input} value={form.employer_verification_status} onChange={(e) => update("employer_verification_status", e.target.value)}>{["Not Submitted", "Submitted", "Joint Inspection Planned", "Accepted", "Rejected", "Formal Close-out"].map((x) => <option key={x}>{x}</option>)}</select></Field>
            <Field label="Registered in Client System"><input type="datetime-local" style={input} value={form.cde_registered_at?.slice(0, 16) || ""} onChange={(e) => update("cde_registered_at", e.target.value)} /></Field>
            <Field label="Last Weekly Copy"><input type="datetime-local" style={input} value={form.cde_mirrored_at?.slice(0, 16) || ""} onChange={(e) => update("cde_mirrored_at", e.target.value)} /></Field>
            <Field label="Submission / Transmittal Reference"><input style={input} value={form.cde_submission_reference} onChange={(e) => update("cde_submission_reference", e.target.value)} /></Field>
            <Field label="Phase End"><input type="date" style={input} value={form.phase_end_date} onChange={(e) => update("phase_end_date", e.target.value)} /></Field>
            <Field label="Taking-Over Date"><input type="date" style={input} value={form.taking_over_date} onChange={(e) => update("taking_over_date", e.target.value)} /></Field>
            <Field label="Employer Extension"><label style={check}><input type="checkbox" checked={form.employer_extension_agreed} onChange={(e) => update("employer_extension_agreed", e.target.checked)} /> Agreed</label></Field>
            {form.employer_extension_agreed && <><Field label="Extended Date"><input type="date" style={input} value={form.employer_extension_date} onChange={(e) => update("employer_extension_date", e.target.value)} /></Field><Field label="Extension Reference"><input style={input} value={form.employer_extension_reference} onChange={(e) => update("employer_extension_reference", e.target.value)} /></Field></>}
            <Field label="Taking-Over Inclusion"><label style={check}><input type="checkbox" checked={form.toc_inclusion_agreed} onChange={(e) => update("toc_inclusion_agreed", e.target.checked)} /> Employer agreed</label></Field>
            {form.toc_inclusion_agreed && <Field label="Agreement Reference"><input style={input} value={form.toc_reference} onChange={(e) => update("toc_reference", e.target.value)} /></Field>}
          </div>
        </details>}
      </div>
      <div style={actions}><button style={primary} disabled={saving || !canEdit} onClick={() => void savePoint()}>{saving ? "Saving..." : "Save Open Point"}</button>{selected && <><button style={button} onClick={() => void exportWord([selected], true)}>Generate Closure Report</button><button style={danger} onClick={() => void removePoint()}>Delete</button></>}</div>
      {selected && <div style={evidencePanel}><h3>Evidence and Closure Records</h3><div style={filters}><select style={input} value={evidenceType} onChange={(e) => setEvidenceType(e.target.value)}>{["Supporting Evidence", "Closure Evidence", "CDE Submission", "Employer Acceptance", "Joint Inspection", "Formal Close-out"].map((x) => <option key={x}>{x}</option>)}</select><input style={input} value={evidenceNote} onChange={(e) => setEvidenceNote(e.target.value)} placeholder="Evidence note" /><label style={primary}>Upload files<input type="file" multiple style={{ display: "none" }} onChange={(e) => void uploadEvidence(e)} /></label></div><div style={evidenceList}>{evidence.filter((x) => x.open_point_id === selected.id).map((x) => <button key={x.id} style={evidenceRow} onClick={() => void openEvidence(x)}><strong>{x.evidence_type}</strong><span>{x.file_name}</span><small>{fmt(x.uploaded_at)}</small></button>)}</div></div>}
    </Panel>}
    {view === "settings" && <Panel title="Controlled Project References"><p>These dates drive contractual deadline warnings. Enter one phase per line as <code>Phase name|YYYY-MM-DD</code>.</p><div style={formGrid}><Field label="Taking-Over Date"><input type="date" style={input} value={settingsDraft.takingOver} onChange={(e) => setSettingsDraft((c) => ({ ...c, takingOver: e.target.value }))} /></Field><Field wide label="Project Phases"><textarea style={textarea} value={settingsDraft.phases} onChange={(e) => setSettingsDraft((c) => ({ ...c, phases: e.target.value }))} placeholder="Manufacturing|2026-12-31" /></Field><Field wide label="SBS References"><textarea style={textarea} value={settingsDraft.sbs} onChange={(e) => setSettingsDraft((c) => ({ ...c, sbs: e.target.value }))} placeholder="Comma-separated controlled values" /></Field><Field wide label="WBS References"><textarea style={textarea} value={settingsDraft.wbs} onChange={(e) => setSettingsDraft((c) => ({ ...c, wbs: e.target.value }))} placeholder="Comma-separated controlled values" /></Field></div><button style={primary} onClick={() => void saveSettings()} disabled={!canEdit}>Save Controlled References</button></Panel>}
  </section>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <section style={panel}><h2>{title}</h2>{children}</section>; }
function Compliance({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) { return <div style={compliance}><span>{ok ? "✓" : "!"}</span><strong>{label}</strong><small>{detail || (ok ? "Control satisfied" : "Attention required")}</small></div>; }
function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) { return <label style={{ ...field, gridColumn: wide ? "1 / -1" : undefined }}><span>{label}</span>{children}</label>; }
function Select({ value, set, options }: { value: string; set: (v: string) => void; options: string[] }) { return <select style={input} value={value} onChange={(e) => set(e.target.value)}>{options.map((x) => <option key={x}>{x}</option>)}</select>; }
function LinkSelect({ value, set, options }: { value: string; set: (v: string) => void; options: Option[] }) { return <select style={input} value={value} onChange={(e) => set(e.target.value)}><option value="">None</option>{options.map((x) => <option key={x.id} value={x.id}>{x.label}{x.meta ? ` - ${x.meta}` : ""}</option>)}</select>; }
function DatalistInput({ value, set, options, id }: { value: string; set: (v: string) => void; options: string[]; id: string }) { return <><input list={id} style={input} value={value} onChange={(e) => set(e.target.value)} /><datalist id={id}>{options.map((x) => <option key={x} value={x} />)}</datalist></>; }
function Badge({ text, danger }: { text: string; danger?: boolean }) { return <span style={{ ...badge, color: danger ? "#991b1b" : "#334155", background: danger ? "#fee2e2" : "#e2e8f0" }}>{text}</span>; }

const shell: CSSProperties = { display: "grid", gap: 16 };
const tabs: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 8, padding: 6, borderRadius: 14, background: "#e8eef7" };
const tab: CSSProperties = { border: 0, borderRadius: 10, padding: "10px 15px", background: "transparent", color: "#334155", fontWeight: 800, cursor: "pointer" };
const activeTab: CSSProperties = { ...tab, color: "#ffffff", background: "#0f766e" };
const statusBar: CSSProperties = { display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, padding: "11px 14px", border: "1px solid #99d7d3", borderRadius: 12, background: "#f0fdfa", color: "#134e4a", fontSize: 13 };
const kpis: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 12 };
const twoCol: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16 };
const panel: CSSProperties = { minWidth: 0, overflow: "hidden", padding: 20, background: "#ffffff", border: "1px solid #dbe7f3", borderRadius: 16, boxShadow: "0 8px 22px rgba(15,23,42,.05)" };
const compliance: CSSProperties = { display: "grid", gridTemplateColumns: "28px 1fr auto", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #e2e8f0" };
const attention: CSSProperties = { display: "grid", gap: 8 };
const attentionRow: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, padding: 12, border: "1px solid #fed7aa", borderRadius: 10, background: "#fff7ed", textAlign: "left", cursor: "pointer" };
const filters: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 14 };
const actions: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 10, margin: "14px 0" };
const input: CSSProperties = { width: "100%", minWidth: 0, maxWidth: "100%", minHeight: 40, padding: "9px 11px", border: "1px solid #cbd5e1", borderRadius: 9, background: "#fff", color: "#0f172a", font: "inherit", boxSizing: "border-box" };
const textarea: CSSProperties = { ...input, minHeight: 95, resize: "vertical", width: "100%" };
const formGrid: CSSProperties = { display: "grid", width: "100%", minWidth: 0, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 230px), 1fr))", gap: 12 };
const field: CSSProperties = { display: "grid", minWidth: 0, gap: 6, fontSize: 12, fontWeight: 800, color: "#475569" };
const formHelp: CSSProperties = { margin: "0 0 14px", color: "#64748b", fontSize: 13, lineHeight: 1.5 };
const detailsPanel: CSSProperties = { gridColumn: "1 / -1", minWidth: 0, padding: 14, border: "1px solid #dbe7f3", borderRadius: 12, background: "#f8fafc" };
const detailsSummary: CSSProperties = { cursor: "pointer", color: "#0f766e", fontSize: 14, fontWeight: 900, marginBottom: 12 };
const inlineControl: CSSProperties = { display: "grid", minWidth: 0, gridTemplateColumns: "minmax(0, 1fr) auto", gap: 8 };
const check: CSSProperties = { display: "inline-flex", gap: 7, alignItems: "center", fontSize: 13, fontWeight: 700 };
const button: CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 9, padding: "10px 14px", background: "#e8eef7", color: "#0f172a", fontWeight: 800, cursor: "pointer" };
const miniButton: CSSProperties = { ...button, minHeight: 40, padding: "8px 11px", whiteSpace: "nowrap" };
const primary: CSSProperties = { ...button, borderColor: "#0f766e", background: "#0f766e", color: "#ffffff" };
const danger: CSSProperties = { ...button, borderColor: "#b91c1c", background: "#b91c1c", color: "#ffffff" };
const ghost: CSSProperties = { ...button, background: "#ffffff" };
const linkButton: CSSProperties = { border: 0, background: "transparent", color: "#0f766e", fontWeight: 800, cursor: "pointer", padding: 0 };
const tableWrap: CSSProperties = { overflowX: "auto", width: "100%" };
const table: CSSProperties = { width: "100%", minWidth: 1370, tableLayout: "fixed", borderCollapse: "collapse", background: "#ffffff", fontSize: 13 };
const tableHeader: CSSProperties = { padding: "12px 14px", background: "#f8fafc", borderBottom: "1px solid #dbe7f3", color: "#334155", fontSize: 12, fontWeight: 900, letterSpacing: "0.04em", textAlign: "left", textTransform: "uppercase" };
const tableCell: CSSProperties = { padding: "12px 14px", borderBottom: "1px solid #edf2f7", color: "#0f172a", lineHeight: 1.45, verticalAlign: "top", overflowWrap: "anywhere" };
const tableRow: CSSProperties = { cursor: "pointer" };
const cellDetail: CSSProperties = { display: "block", marginTop: 3, color: "#64748b", fontSize: 12, fontWeight: 400, lineHeight: 1.4 };
const registerCount: CSSProperties = { margin: "12px 0", color: "#475569", fontSize: 13, fontWeight: 700 };
const compactActions: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 8 };
const emptyRegister: CSSProperties = { padding: 24, border: "1px dashed #cbd5e1", borderRadius: 12, color: "#64748b", textAlign: "center" };
const badge: CSSProperties = { display: "inline-block", padding: "4px 7px", borderRadius: 999, fontWeight: 800, fontSize: 11 };
const evidencePanel: CSSProperties = { marginTop: 20, paddingTop: 14, borderTop: "1px solid #dbe7f3" };
const evidenceList: CSSProperties = { display: "grid", gap: 8 };
const evidenceRow: CSSProperties = { display: "grid", gridTemplateColumns: "180px 1fr auto", gap: 10, padding: 11, border: "1px solid #dbe7f3", borderRadius: 10, background: "#f8fafc", textAlign: "left", cursor: "pointer" };

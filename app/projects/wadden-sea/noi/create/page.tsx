"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ImsTopMetaRow } from "../../../../../src/components/ImsPrimitives";
import { QualityKpiCard } from "../../../../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../../../../src/components/QualityPageHero";
import { WaddenSeaWorkspaceNav } from "../../../../../src/components/WaddenSeaWorkspaceNav";
import { supabase } from "../../../../../src/lib/supabase";

type Itp = { id: string; document_number: string; title: string; supplier: string | null; scope: string | null };
type NoiPoint = { id: string; itp_id: string; section_number: string; activity_description: string; intervention_type: string; planned_date: string | null; noi_number: string | null; status: string };
type Attendee = { name: string; company: string; contact: string; email: string };
type SavedNoi = { supplier?: string; pointIds?: string[]; projectDetails?: string; inspectionDate?: string; duration?: string; location?: string; attendees?: Attendee[]; hostName?: string; hostTelephone?: string; hostPosition?: string; hostEmail?: string };

const STORAGE_BUCKET = "project-documents";

const blankAttendee = (): Attendee => ({ name: "", company: "", contact: "", email: "" });

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function displayDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function linkedItpSupplier(points: NoiPoint[], itps: Itp[]) {
  return itps.find((itp) => itp.id === points[0]?.itp_id)?.supplier || "";
}

async function imageData(url: string) {
  const response = await fetch(url);
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export default function NoiCreatorPage() {
  const [itps, setItps] = useState<Itp[]>([]);
  const [points, setPoints] = useState<NoiPoint[]>([]);
  const [supplier, setSupplier] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState("Loading NOI requirements…");
  const [busy, setBusy] = useState(false);
  const [projectDetails, setProjectDetails] = useState("Wadden Sea Project");
  const [inspectionDate, setInspectionDate] = useState("");
  const [duration, setDuration] = useState("");
  const [location, setLocation] = useState("");
  const [hostName, setHostName] = useState("");
  const [hostTelephone, setHostTelephone] = useState("");
  const [hostPosition, setHostPosition] = useState("");
  const [hostEmail, setHostEmail] = useState("");
  const [attendees, setAttendees] = useState<Attendee[]>([blankAttendee(), blankAttendee()]);
  const [editingNumber, setEditingNumber] = useState("");

  useEffect(() => {
    void (async () => {
      const [itpResult, pointResult] = await Promise.all([
        supabase.from("project_itps").select("id,document_number,title,supplier,scope").eq("project_key", "wadden-sea").order("supplier"),
        supabase.from("project_noi_points").select("id,itp_id,section_number,activity_description,intervention_type,planned_date,noi_number,status").eq("project_key", "wadden-sea").order("planned_date"),
      ]);
      if (itpResult.error || pointResult.error) {
        setMessage(itpResult.error?.message || pointResult.error?.message || "NOI data could not be loaded.");
        return;
      }
      setItps((itpResult.data || []) as Itp[]);
      const loadedPoints = (pointResult.data || []) as NoiPoint[];
      setPoints(loadedPoints);
      const requestedNoi = new URLSearchParams(window.location.search).get("noi")?.trim() || "";
      if (!requestedNoi) { setMessage("Select a supplier and one or more inspection points."); return; }
      setEditingNumber(requestedNoi);
      const linked = loadedPoints.filter((point) => point.noi_number === requestedNoi);
      const linkedDates = [...new Set(linked.map((point) => point.planned_date).filter(Boolean) as string[])];
      if (linked.length) {
        const linkedItp = ((itpResult.data || []) as Itp[]).find((itp) => itp.id === linked[0].itp_id);
        setSupplier(linkedItp?.supplier || "");
        setSelectedIds(linked.map((point) => point.id));
        if (linkedDates.length === 1) setInspectionDate(linkedDates[0]);
      }
      const saved = await supabase.storage.from(STORAGE_BUCKET).download(`wadden-sea/nois/${requestedNoi}/noi.json`);
      if (!saved.error) {
        const details = JSON.parse(await saved.data.text()) as SavedNoi;
        setSupplier(details.supplier || linkedItpSupplier(linked, (itpResult.data || []) as Itp[]));
        setSelectedIds(details.pointIds?.filter((id) => loadedPoints.some((point) => point.id === id)) || linked.map((point) => point.id));
        setProjectDetails(details.projectDetails || "Wadden Sea Project"); setInspectionDate(linkedDates.length === 1 ? linkedDates[0] : details.inspectionDate || ""); setDuration(details.duration || ""); setLocation(details.location || "");
        setAttendees(details.attendees?.length ? details.attendees : [blankAttendee(), blankAttendee()]); setHostName(details.hostName || ""); setHostTelephone(details.hostTelephone || ""); setHostPosition(details.hostPosition || ""); setHostEmail(details.hostEmail || "");
        setMessage(`NOI ${requestedNoi} loaded. Edit the details and regenerate when ready.`);
      } else setMessage(`NOI ${requestedNoi} points loaded. This NOI predates saved editable details, so complete any blank fields before regenerating.`);
    })();
  }, []);

  const itpById = useMemo(() => new Map(itps.map((itp) => [itp.id, itp])), [itps]);
  const suppliers = useMemo(() => [...new Set(itps.map((itp) => itp.supplier).filter(Boolean) as string[])].sort(), [itps]);
  const supplierPoints = useMemo(() => points.filter((point) => itpById.get(point.itp_id)?.supplier === supplier), [itpById, points, supplier]);
  const selected = useMemo(() => supplierPoints.filter((point) => selectedIds.includes(point.id)), [selectedIds, supplierPoints]);
  const nextSequence = useMemo(() => {
    const used = points.map((point) => Number(String(point.noi_number || "").match(/\d+/)?.[0])).filter(Number.isFinite);
    return String(Math.max(3, ...used) + 1).padStart(3, "0");
  }, [points]);
  const noiNumber = editingNumber || nextSequence;
  const selectedItps = useMemo(() => [...new Set(selected.map((point) => itpById.get(point.itp_id)?.document_number).filter(Boolean) as string[])], [itpById, selected]);
  const selectedDates = useMemo(() => [...new Set(selected.map((point) => point.planned_date).filter(Boolean) as string[])], [selected]);

  useEffect(() => {
    if (selectedDates.length === 1) setInspectionDate(selectedDates[0]);
  }, [selectedDates]);
  useEffect(() => {
    if (supplier && !editingNumber) setProjectDetails(`Wadden Sea Project - ${supplier}`);
  }, [editingNumber, supplier]);

  function toggle(point: NoiPoint) {
    setSelectedIds((current) => current.includes(point.id) ? current.filter((id) => id !== point.id) : [...current, point.id]);
  }

  function updateAttendee(index: number, changes: Partial<Attendee>) {
    setAttendees((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item));
  }

  async function downloadSaved(format: "docx" | "pdf") {
    const fileName = `Wadden-Sea-NOI-${noiNumber}.${format}`;
    const result = await supabase.storage.from(STORAGE_BUCKET).download(`wadden-sea/nois/${noiNumber}/${fileName}`);
    if (result.error) { setMessage(`The saved ${format.toUpperCase()} is not available yet. Save this NOI once to create it.`); return; }
    download(result.data, fileName);
  }

  async function deleteNoi() {
    if (!editingNumber) return;
    if (!window.confirm(`Delete NOI ${editingNumber}?\n\nIts saved Word, PDF and editable details will be removed. Linked inspection points will return to Planned.`)) return;
    setBusy(true);
    setMessage(`Deleting NOI ${editingNumber}…`);
    try {
      const linkedIds = points.filter((point) => point.noi_number === editingNumber).map((point) => point.id);
      if (linkedIds.length) {
        const reset = await supabase.from("project_noi_points").update({ noi_number: null, status: "Planned", updated_at: new Date().toISOString() }).in("id", linkedIds);
        if (reset.error) throw reset.error;
      }
      const folder = `wadden-sea/nois/${editingNumber}`;
      const listed = await supabase.storage.from(STORAGE_BUCKET).list(folder);
      if (listed.error) throw listed.error;
      const paths = (listed.data || []).map((file) => `${folder}/${file.name}`);
      if (paths.length) {
        const removed = await supabase.storage.from(STORAGE_BUCKET).remove(paths);
        if (removed.error) throw removed.error;
      }
      const deletedNumber = editingNumber;
      setPoints((current) => current.map((point) => point.noi_number === deletedNumber ? { ...point, noi_number: null, status: "Planned" } : point));
      setEditingNumber(""); setSelectedIds([]);
      window.history.replaceState({}, "", "/projects/wadden-sea/noi/create");
      setMessage(`NOI ${deletedNumber} deleted. Its inspection points are available again and the next number has been recalculated.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The NOI could not be deleted.");
    } finally { setBusy(false); }
  }

  async function generatePdf() {
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    try { doc.addImage(await imageData("/enshore-primary-logo-colour.png"), "PNG", 112, 12, 48, 24); } catch { /* retain text header if logo loading fails */ }
    doc.setFont("helvetica", "bold"); doc.setTextColor(0, 86, 112); doc.setFontSize(21); doc.text("Notice Of Inspection", 20, 27);
    doc.setDrawColor(99, 177, 188); doc.line(20, 34, 190, 34);
    const common = { theme: "grid" as const, margin: { left: 20, right: 20 }, styles: { font: "helvetica", fontSize: 8, cellPadding: 2.2, lineColor: [40, 40, 40] as [number, number, number], lineWidth: 0.15 }, headStyles: { fillColor: [190, 190, 190] as [number, number, number], textColor: 0, fontStyle: "bold" as const } };
    autoTable(doc, { ...common, startY: 40, body: [["Project Details:", projectDetails], ["NOI Number:", noiNumber]], columnStyles: { 0: { cellWidth: 40, fontStyle: "bold", fillColor: [210, 210, 210] }, 1: { cellWidth: 130 } } });
    const firstEnd = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 58;
    autoTable(doc, { ...common, startY: firstEnd + 4, head: [[{ content: "Inspection Details (to be completed in full)", colSpan: 4 }]], body: [
      ["Inspection Activity:", { content: selected.map((point) => point.activity_description).join("\n"), colSpan: 3 }],
      ["Witness/Hold Point:", { content: selected.map((point) => point.intervention_type).join("\n"), colSpan: 3 }],
      ["Inspection Date:", displayDate(inspectionDate), "Duration (start time/hours):", duration],
      ["Inspection Location:", { content: location, colSpan: 3 }],
      ["ITP Reference No:", selectedItps.join("\n"), "ITP Task Number:", selected.map((point) => point.section_number).join("\n")],
      [{ content: "Attendees' Details", colSpan: 4, styles: { fillColor: [190, 190, 190], fontStyle: "bold" } }],
      ...attendees.map((person) => ["Contact Name:\nCompany:", `${person.name}\n${person.company}`, "Contact Number:\nE-mail:", `${person.contact}\n${person.email}`]),
    ], columnStyles: { 0: { cellWidth: 40, fontStyle: "bold" }, 1: { cellWidth: 45 }, 2: { cellWidth: 40, fontStyle: "bold" }, 3: { cellWidth: 45 } } });
    const detailsEnd = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 175;
    autoTable(doc, { ...common, startY: detailsEnd + 4, head: [[{ content: "Hosts Contact Details", colSpan: 4 }]], body: [["Name:", hostName, "Telephone Number:", hostTelephone], ["Position:", hostPosition, "Email:", hostEmail]], columnStyles: { 0: { cellWidth: 40, fontStyle: "bold" }, 1: { cellWidth: 45 }, 2: { cellWidth: 40, fontStyle: "bold" }, 3: { cellWidth: 45 } } });
    const hostEnd = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 201;
    autoTable(doc, {
      ...common,
      startY: hostEnd + 4,
      head: [[{ content: "Response", colSpan: 2, styles: { halign: "center" } }]],
      body: [
        [{ content: "", colSpan: 2, styles: { minCellHeight: 11 } }],
        [{ content: "Reason for Waiver (Insert reason for waiver of inspection point if attendance declined)", colSpan: 2, styles: { fillColor: [190, 190, 190], fontStyle: "bold", halign: "center", minCellHeight: 7 } }],
        [{ content: "", colSpan: 2, styles: { minCellHeight: 20 } }],
        [{ content: "Contact/Representative", styles: { fillColor: [190, 190, 190], fontStyle: "bold", halign: "center" } }, { content: "On Behalf of (if applicable)", styles: { fillColor: [190, 190, 190], fontStyle: "bold", halign: "center" } }],
        [{ content: "(Name)", styles: { halign: "center", fontStyle: "italic", minCellHeight: 13 } }, { content: "(Client Name)", styles: { halign: "center", fontStyle: "italic", minCellHeight: 13 } }],
      ],
      columnStyles: { 0: { cellWidth: 85 }, 1: { cellWidth: 85 } },
      styles: { ...common.styles, fontSize: 7, cellPadding: 1.5 },
      headStyles: { ...common.headStyles, halign: "center", fontSize: 7 },
      pageBreak: "avoid",
      didDrawCell: (data) => {
        if (data.section !== "body" || data.row.index !== 0 || data.column.index !== 0) return;
        const pieces = [
          { text: "I will ", color: [20, 20, 20] as [number, number, number], style: "bold" as const },
          { text: "attend / not attend", color: [255, 0, 0] as [number, number, number], style: "bold" as const },
          { text: " (delete as appropriate) this Inspection Point", color: [20, 20, 20] as [number, number, number], style: "normal" as const },
        ];
        doc.setFontSize(7);
        const widths = pieces.map((piece) => { doc.setFont("helvetica", piece.style); return doc.getTextWidth(piece.text); });
        let x = data.cell.x + (data.cell.width - widths.reduce((total, width) => total + width, 0)) / 2;
        const y = data.cell.y + data.cell.height / 2 + 0.9;
        pieces.forEach((piece, index) => { doc.setFont("helvetica", piece.style); doc.setTextColor(...piece.color); doc.text(piece.text, x, y); x += widths[index]; });
      },
    });
    doc.setFontSize(6.5); doc.setTextColor(40);
    doc.text("Doc. ID", 20, 280); doc.text(":", 43, 280); doc.text("ENS-HSEQ-FRM-074", 48, 280);
    doc.text("Doc. Title", 20, 284); doc.text(":", 43, 284); doc.text("Notice Of Inspection", 48, 284);
    doc.text("Parent Doc.", 20, 288); doc.text(":", 43, 288); doc.text("N/A", 48, 288);
    doc.text("Rev", 151, 280); doc.text(":", 164, 280); doc.text("B", 170, 280);
    doc.text("Date", 151, 284); doc.text(":", 164, 284); doc.text("6-Mar-26", 170, 284);
    doc.text("Page", 151, 288); doc.text(":", 164, 288); doc.text("1 of 1", 170, 288);
    return doc.output("blob");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected.length) { setMessage("Select at least one inspection point."); return; }
    if (!projectDetails || !inspectionDate || !duration || !location) { setMessage("Complete the project details, inspection date, time/duration and location."); return; }
    setBusy(true);
    setMessage(`${editingNumber ? "Updating" : "Generating"} NOI ${noiNumber}…`);
    const payload = {
      noiNumber,
      projectDetails,
      activities: selected.map((point) => point.activity_description),
      interventionTypes: selected.map((point) => point.intervention_type),
      inspectionDate,
      duration,
      location,
      itpReference: selectedItps.join("\n"),
      taskNumbers: selected.map((point) => point.section_number),
      attendees,
      hostName, hostTelephone, hostPosition, hostEmail,
    };
    try {
      const response = await fetch("/api/projects/noi-create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error((await response.json()).error || "Word generation failed.");
      const wordBlob = await response.blob();
      const pdfBlob = await generatePdf();
      const savedDetails = { supplier, pointIds: selected.map((point) => point.id), projectDetails, inspectionDate, duration, location, attendees, hostName, hostTelephone, hostPosition, hostEmail };
      const storagePath = `wadden-sea/nois/${noiNumber}`;
      const uploads = await Promise.all([
        supabase.storage.from(STORAGE_BUCKET).upload(`${storagePath}/noi.json`, new Blob([JSON.stringify(savedDetails)], { type: "application/json" }), { upsert: true, contentType: "application/json" }),
        supabase.storage.from(STORAGE_BUCKET).upload(`${storagePath}/Wadden-Sea-NOI-${noiNumber}.docx`, wordBlob, { upsert: true, contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }),
        supabase.storage.from(STORAGE_BUCKET).upload(`${storagePath}/Wadden-Sea-NOI-${noiNumber}.pdf`, pdfBlob, { upsert: true, contentType: "application/pdf" }),
      ]);
      const storageError = uploads.find((item) => item.error)?.error;
      if (storageError) throw storageError;
      const update = await supabase.from("project_noi_points").update({ noi_number: noiNumber, planned_date: inspectionDate, status: "NOI Issued", updated_at: new Date().toISOString() }).in("id", selected.map((point) => point.id));
      if (update.error) throw update.error;
      const removed = points.filter((point) => point.noi_number === noiNumber && !selectedIds.includes(point.id)).map((point) => point.id);
      if (removed.length) {
        const cleared = await supabase.from("project_noi_points").update({ noi_number: null, status: "Planned", updated_at: new Date().toISOString() }).in("id", removed);
        if (cleared.error) throw cleared.error;
      }
      download(wordBlob, `Wadden-Sea-NOI-${noiNumber}.docx`);
      download(pdfBlob, `Wadden-Sea-NOI-${noiNumber}.pdf`);
      setPoints((current) => current.map((point) => selectedIds.includes(point.id) ? { ...point, noi_number: noiNumber, planned_date: inspectionDate, status: "NOI Issued" } : point));
      setEditingNumber(noiNumber);
      setMessage(`NOI ${noiNumber} saved and generated in Word and PDF. Its tracker date is now ${displayDate(inspectionDate)}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The NOI could not be generated.");
    } finally { setBusy(false); }
  }

  return (
    <main style={page}>
      <QualityPageHero label="Wadden Sea · Inspection control" title="NOI Creator" description="Create controlled Notices of Inspection directly from the Project NOI requirements register." />
      <ImsTopMetaRow backHref="/projects/wadden-sea" backLabel="Back to Wadden Sea" status={<><strong>Status:</strong> {message}</>} />
      <WaddenSeaWorkspaceNav active="noi-creator" />
      <section style={metrics} className="quality-kpi-grid">
        <QualityKpiCard title={editingNumber ? "Editing NOI" : "Next NOI Number"} value={noiNumber} accent="#005670" />
        <QualityKpiCard title="Supplier Points" value={supplierPoints.length} accent="#63B1BC" />
        <QualityKpiCard title="Selected Points" value={selected.length} accent="#53565A" />
        <QualityKpiCard title="Selected ITPs" value={selectedItps.length} accent="#FFAD00" />
      </section>

      <section style={panel}>
        <div style={panelHeader}><div><span style={kicker}>Step 1</span><h2 style={heading}>Select inspection points</h2></div></div>
        <div style={supplierBar}><label style={field}><span>Supplier</span><select style={input} value={supplier} onChange={(event) => { setSupplier(event.target.value); setSelectedIds([]); }}><option value="">Select supplier</option>{suppliers.map((value) => <option key={value}>{value}</option>)}</select></label></div>
        <div style={pointList}>{supplierPoints.map((point) => {
          const itp = itpById.get(point.itp_id);
          const checked = selectedIds.includes(point.id);
          return <label key={point.id} style={{ ...pointRow, borderColor: checked ? "#005670" : "#dbe4ef", background: checked ? "#ECECE7" : "#fff" }}><input type="checkbox" checked={checked} onChange={() => toggle(point)} /><span style={pointIdentity}><strong>{point.section_number} · {point.activity_description}</strong><small>{itp?.document_number} · {point.planned_date ? displayDate(point.planned_date) : "Date TBC"}</small></span><span style={codeBadge}>{point.intervention_type}</span><span style={statusBadge}>{point.noi_number ? `NOI ${point.noi_number}` : point.status}</span></label>;
        })}{supplier && !supplierPoints.length ? <div style={empty}>No NOI requirements are registered for this supplier.</div> : null}</div>
      </section>

      <form onSubmit={submit} style={panel}>
        <div style={panelHeader}><div><span style={kicker}>Step 2</span><h2 style={heading}>Complete NOI details</h2></div><span style={numberPill}>NOI {noiNumber}</span></div>
        <div style={formGrid}>
          <Field label="Project details"><input style={input} value={projectDetails} onChange={(event) => setProjectDetails(event.target.value)} /></Field>
          <Field label="Inspection date"><input style={input} type="date" value={inspectionDate} onChange={(event) => setInspectionDate(event.target.value)} /></Field>
          <Field label="Start time / duration"><input style={input} value={duration} onChange={(event) => setDuration(event.target.value)} placeholder="e.g. 09:00 / 4 hours" /></Field>
          <Field label="Inspection location" wide><input style={input} value={location} onChange={(event) => setLocation(event.target.value)} /></Field>
          <Field label="Host name"><input style={input} value={hostName} onChange={(event) => setHostName(event.target.value)} /></Field>
          <Field label="Host telephone"><input style={input} value={hostTelephone} onChange={(event) => setHostTelephone(event.target.value)} /></Field>
          <Field label="Host position"><input style={input} value={hostPosition} onChange={(event) => setHostPosition(event.target.value)} /></Field>
          <Field label="Host email"><input style={input} type="email" value={hostEmail} onChange={(event) => setHostEmail(event.target.value)} /></Field>
        </div>
        <div style={attendeeHeader}><div style={attendeeTitle}><span style={kicker}>Attendees</span><span style={attendeeHint}>Add up to five Enshore or client representatives</span></div>{attendees.length < 5 ? <button type="button" style={secondaryButton} onClick={() => setAttendees((current) => [...current, blankAttendee()])}>Add attendee</button> : null}</div>
        <div style={attendeeList}>{attendees.map((person, index) => <div key={index} style={attendeeRow}><input style={input} value={person.name} onChange={(event) => updateAttendee(index, { name: event.target.value })} placeholder="Contact name" /><input style={input} value={person.company} onChange={(event) => updateAttendee(index, { company: event.target.value })} placeholder="Company" /><input style={input} value={person.contact} onChange={(event) => updateAttendee(index, { contact: event.target.value })} placeholder="Contact number" /><input style={input} type="email" value={person.email} onChange={(event) => updateAttendee(index, { email: event.target.value })} placeholder="Email" /></div>)}</div>
        <div style={actions}>{editingNumber ? <><button type="button" style={deleteNoiButton} disabled={busy} onClick={() => void deleteNoi()}>Delete NOI</button><button type="button" style={secondaryButton} disabled={busy} onClick={() => void downloadSaved("docx")}>Open saved Word</button><button type="button" style={secondaryButton} disabled={busy} onClick={() => void downloadSaved("pdf")}>Open saved PDF</button></> : null}<button type="submit" style={primaryButton} disabled={busy || !selected.length}>{busy ? "Working…" : `${editingNumber ? "Save changes to" : "Generate"} NOI ${noiNumber} · Word & PDF`}</button></div>
      </form>
    </main>
  );
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) { return <label style={{ ...field, gridColumn: wide ? "1 / -1" : undefined }}><span>{label}</span>{children}</label>; }

const page: CSSProperties = { display: "grid", gap: 18 };
const metrics: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 16 };
const panel: CSSProperties = { background: "#fff", border: "1px solid #dbe4ef", borderRadius: 18, overflow: "hidden", boxShadow: "0 1px 3px rgba(15,23,42,.07)" };
const panelHeader: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "16px 18px", borderBottom: "1px solid #e5ebf1" };
const kicker: CSSProperties = { color: "#005670", fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".1em" };
const heading: CSSProperties = { margin: "3px 0 0", color: "#14263a", fontSize: 20 };
const supplierBar: CSSProperties = { padding: "14px 18px", maxWidth: 420 };
const field: CSSProperties = { display: "grid", gap: 6, color: "#475569", fontSize: 12, fontWeight: 800 };
const input: CSSProperties = { width: "100%", minWidth: 0, boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: 10, padding: "10px 12px", background: "#fff", color: "#0f172a", font: "inherit" };
const pointList: CSSProperties = { display: "grid", gap: 8, padding: "0 18px 18px", maxHeight: 460, overflowY: "auto" };
const pointRow: CSSProperties = { display: "grid", gridTemplateColumns: "22px minmax(280px,1fr) 70px 110px", gap: 10, alignItems: "center", padding: 11, border: "1px solid #dbe4ef", borderRadius: 11, cursor: "pointer" };
const pointIdentity: CSSProperties = { display: "grid", gap: 3, color: "#334155", fontSize: 12 };
const codeBadge: CSSProperties = { padding: "5px 8px", borderRadius: 999, background: "#fef3c7", color: "#92400e", textAlign: "center", fontWeight: 900, fontSize: 11 };
const statusBadge: CSSProperties = { ...codeBadge, background: "#ECECE7", color: "#005670" };
const empty: CSSProperties = { padding: 28, textAlign: "center", color: "#64748b" };
const formGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12, padding: 18 };
const numberPill: CSSProperties = { padding: "7px 11px", borderRadius: 999, background: "#ECECE7", color: "#005670", fontWeight: 900 };
const attendeeHeader: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "0 18px 10px" };
const attendeeTitle: CSSProperties = { display: "grid", gap: 5 };
const attendeeHint: CSSProperties = { color: "#475569", fontSize: 13, fontWeight: 700 };
const attendeeList: CSSProperties = { display: "grid", gap: 8, padding: "0 18px 18px" };
const attendeeRow: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8 };
const actions: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap", padding: 16, borderTop: "1px solid #e5ebf1" };
const primaryButton: CSSProperties = { border: 0, borderRadius: 10, padding: "12px 17px", background: "#005670", color: "#fff", fontWeight: 900, cursor: "pointer" };
const secondaryButton: CSSProperties = { ...primaryButton, padding: "8px 12px", background: "#e2e8f0", color: "#0f172a" };
const deleteNoiButton: CSSProperties = { ...secondaryButton, background: "#fff1f2", color: "#b42318", border: "1px solid #fecaca" };

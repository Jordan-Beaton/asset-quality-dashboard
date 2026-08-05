"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ImsTopMetaRow } from "../../../../src/components/ImsPrimitives";
import { QualityKpiCard } from "../../../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../../../src/components/QualityPageHero";
import { WaddenSeaWorkspaceNav } from "../../../../src/components/WaddenSeaWorkspaceNav";
import { supabase } from "../../../../src/lib/supabase";

const PROJECT_KEY = "wadden-sea";
const STORAGE_BUCKET = "project-documents";

type Revision = { id: string; revision: string; file_name: string; file_path: string; is_current: boolean; uploaded_at: string };
type Itp = { id: string; document_number: string; title: string; supplier: string | null; scope: string | null; project_itp_revisions?: Revision[] };
type InterventionType = string;
type Candidate = { sectionNumber: string; activityDescription: string; interventionType: InterventionType; partyHeading: string; confidence: string; sourceLocation: string; selected: boolean };
type NoiPoint = {
  id: string; itp_id: string; revision_id: string; section_number: string; activity_description: string;
  intervention_type: InterventionType; party_heading: string; extraction_confidence: string; source_location: string | null;
  status: string; planned_date: string | null; noi_number: string | null; notes: string | null; manually_confirmed: boolean;
};

const statuses = ["Planned", "NOI Required", "NOI Issued", "Completed", "Cancelled"];
const emptyManualPoint = {
  sectionNumber: "",
  activityDescription: "",
  interventionType: "W",
  partyHeading: "Enshore / Contractor",
  sourceReference: "",
  plannedDate: "",
  noiNumber: "",
  status: "Planned",
  notes: "",
};

function currentRevision(itp: Itp) {
  return (itp.project_itp_revisions || []).find((revision) => revision.is_current)
    || [...(itp.project_itp_revisions || [])].sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at))[0];
}

function typeTone(type: InterventionType) {
  if (type.includes("/")) return { background: "#ede9fe", color: "#5b21b6" };
  if (type === "H") return { background: "#fee2e2", color: "#F93822" };
  return { background: "#dbeafe", color: "#1e40af" };
}

function validIntervention(value: string) {
  const normalised = value.toUpperCase().replace(/\s+/g, "");
  return /^[A-Z](?:\/[A-Z])*$/.test(normalised) && normalised.split("/").some((part) => part === "W" || part === "H");
}

export default function NoiTrackerPage() {
  const [itps, setItps] = useState<Itp[]>([]);
  const [points, setPoints] = useState<NoiPoint[]>([]);
  const [selectedItpId, setSelectedItpId] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [itpNumberFilter, setItpNumberFilter] = useState("All");
  const [itpTitleFilter, setItpTitleFilter] = useState("All");
  const [supplierFilter, setSupplierFilter] = useState("All");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualPoint, setManualPoint] = useState(emptyManualPoint);

  const load = useCallback(async () => {
    const [itpResult, pointResult] = await Promise.all([
      supabase.from("project_itps").select("id,document_number,title,supplier,scope,project_itp_revisions(id,revision,file_name,file_path,is_current,uploaded_at)").eq("project_key", PROJECT_KEY).order("document_number"),
      supabase.from("project_noi_points").select("*").eq("project_key", PROJECT_KEY).order("created_at"),
    ]);
    if (itpResult.error) setMessage(itpResult.error.message);
    else {
      const rows = (itpResult.data || []) as Itp[];
      setItps(rows);
      setSelectedItpId((current) => current || rows[0]?.id || "");
    }
    if (pointResult.error) setMessage(pointResult.error.message.includes("project_noi_points") ? "The NOI register database setup is not live yet. Apply scripts/sql/project_itp_tracker.sql in Supabase." : pointResult.error.message);
    else setPoints((pointResult.data || []) as NoiPoint[]);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const selectedItp = itps.find((itp) => itp.id === selectedItpId);
  const pointRows = useMemo(() => points.map((point) => ({ point, itp: itps.find((itp) => itp.id === point.itp_id) })).filter(({ point, itp }) => {
    const haystack = [itp?.document_number, itp?.title, itp?.supplier, point.section_number, point.activity_description, point.noi_number].join(" ").toLowerCase();
    return (!query || haystack.includes(query.toLowerCase()))
      && (typeFilter === "All" || point.intervention_type === typeFilter)
      && (statusFilter === "All" || point.status === statusFilter)
      && (itpNumberFilter === "All" || itp?.document_number === itpNumberFilter)
      && (itpTitleFilter === "All" || itp?.title === itpTitleFilter)
      && (supplierFilter === "All" || (itp?.supplier || "No supplier") === supplierFilter);
  }), [points, itps, query, typeFilter, statusFilter, itpNumberFilter, itpTitleFilter, supplierFilter]);
  const metrics = useMemo(() => ({
    total: points.length,
    witness: points.filter((point) => point.intervention_type.split("/").includes("W")).length,
    hold: points.filter((point) => point.intervention_type.split("/").includes("H")).length,
    combined: points.filter((point) => point.intervention_type.includes("/")).length,
    outstanding: points.filter((point) => !["Completed", "Cancelled"].includes(point.status)).length,
  }), [points]);

  async function scanSelectedItp() {
    if (!selectedItp) return;
    const revision = currentRevision(selectedItp);
    if (!revision) {
      setMessage("This ITP has no current source document.");
      return;
    }
    setBusy(true);
    setCandidates([]);
    setMessage(`Reading ${revision.file_name}… Structured tables will be checked first; scanned pages will use OCR automatically.`);
    try {
      const signed = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(revision.file_path, 300);
      if (signed.error) throw signed.error;
      const fileResponse = await fetch(signed.data.signedUrl);
      if (!fileResponse.ok) throw new Error("The stored ITP could not be downloaded for scanning.");
      const blob = await fileResponse.blob();
      const file = new File([blob], revision.file_name, { type: blob.type });
      const form = new FormData();
      form.append("file", file);
      form.append("supplierName", selectedItp.supplier || "");
      const isPdf = revision.file_name.toLowerCase().endsWith(".pdf");
      const allowVisualAudit = !isPdf || window.confirm(
        "For a complete page-by-page visual/OCR audit, this ITP PDF will be securely sent to the configured OpenAI vision service for document analysis. Continue with visual audit?\n\nChoose Cancel to run local structured extraction only.",
      );
      form.append("allowVisualAudit", String(allowVisualAudit));
      const response = await fetch("/api/projects/noi-extract", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The ITP could not be scanned.");
      setCandidates((result.candidates || []).map((candidate: Omit<Candidate, "selected">) => ({ ...candidate, selected: true })));
      setMessage(result.warning || `${result.summary.points} Client/Enshore/Contractor W/H point${result.summary.points === 1 ? "" : "s"} found using ${String(result.extractionMode || "structured").toLowerCase()} extraction. Review before adding them.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The ITP could not be scanned.");
    } finally {
      setBusy(false);
    }
  }

  async function saveCandidates() {
    if (!selectedItp) return;
    const revision = currentRevision(selectedItp);
    const selected = candidates.filter((candidate) => candidate.selected);
    if (!revision || !selected.length) {
      setMessage("Select at least one extracted point.");
      return;
    }
    const invalid = selected.find((candidate) => !validIntervention(candidate.interventionType));
    if (invalid) {
      setMessage(`"${invalid.interventionType}" is not a valid intervention code. The code must contain W or H.`);
      return;
    }
    setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    const payload = selected.map((candidate) => ({
      project_key: PROJECT_KEY,
      itp_id: selectedItp.id,
      revision_id: revision.id,
      section_number: candidate.sectionNumber.trim(),
      activity_description: candidate.activityDescription.trim(),
      intervention_type: candidate.interventionType,
      party_heading: candidate.partyHeading,
      extraction_confidence: candidate.confidence,
      source_location: candidate.sourceLocation,
      status: "Planned",
      manually_confirmed: true,
      created_by: auth.user?.id,
      updated_at: new Date().toISOString(),
    }));
    const result = await supabase.from("project_noi_points").upsert(payload, { onConflict: "revision_id,section_number,intervention_type,activity_description", ignoreDuplicates: true });
    if (result.error) setMessage(result.error.message);
    else {
      setMessage(`${selected.length} confirmed point${selected.length === 1 ? "" : "s"} added. Existing matches were not duplicated.`);
      setCandidates([]);
      await load();
    }
    setBusy(false);
  }

  async function saveManualPoint(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedItp) return;
    const revision = currentRevision(selectedItp);
    const sectionNumber = manualPoint.sectionNumber.trim();
    const activityDescription = manualPoint.activityDescription.trim();
    const interventionType = manualPoint.interventionType.toUpperCase().replace(/\s+/g, "");
    if (!revision) {
      setMessage("The selected ITP has no current revision.");
      return;
    }
    if (!sectionNumber || !activityDescription) {
      setMessage("Enter the section/item number and activity description.");
      return;
    }
    if (!validIntervention(interventionType)) {
      setMessage("Manual intervention codes must contain W or H, for example W, H, R/W, M/W, or W/H.");
      return;
    }
    setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    const sourceReference = manualPoint.sourceReference.trim();
    const payload = {
      project_key: PROJECT_KEY,
      itp_id: selectedItp.id,
      revision_id: revision.id,
      section_number: sectionNumber,
      activity_description: activityDescription,
      intervention_type: interventionType,
      party_heading: manualPoint.partyHeading.trim() || "Enshore / Contractor",
      extraction_confidence: "Manual",
      source_location: sourceReference ? `Manual entry · ${sourceReference}` : "Manual entry",
      status: manualPoint.status,
      planned_date: manualPoint.plannedDate || null,
      noi_number: manualPoint.noiNumber.trim() || null,
      notes: manualPoint.notes.trim() || null,
      manually_confirmed: true,
      created_by: auth.user?.id,
      updated_at: new Date().toISOString(),
    };
    const result = await supabase.from("project_noi_points").upsert(payload, {
      onConflict: "revision_id,section_number,intervention_type,activity_description",
      ignoreDuplicates: true,
    });
    if (result.error) setMessage(result.error.message);
    else {
      setMessage(`Manual ${interventionType} point ${sectionNumber} added to ${selectedItp.document_number}.`);
      setManualPoint(emptyManualPoint);
      setShowManualEntry(false);
      await load();
    }
    setBusy(false);
  }

  async function updatePoint(point: NoiPoint, changes: Partial<NoiPoint>) {
    setSavingId(point.id);
    setPoints((current) => current.map((item) => item.id === point.id ? { ...item, ...changes } : item));
    const { error } = await supabase.from("project_noi_points").update({ ...changes, updated_at: new Date().toISOString() }).eq("id", point.id);
    if (error) {
      setMessage(error.message);
      await load();
    }
    setSavingId(null);
  }

  async function deletePoint(point: NoiPoint) {
    if (!window.confirm(`Delete section ${point.section_number} — ${point.activity_description}?`)) return;
    const { error } = await supabase.from("project_noi_points").delete().eq("id", point.id);
    if (error) setMessage(error.message);
    else setPoints((current) => current.filter((item) => item.id !== point.id));
  }

  function exportPdf() {
    if (!pointRows.length) {
      setMessage("There are no NOI requirements in the current filtered view to export.");
      return;
    }
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const generatedAt = new Date();
    doc.setFillColor(31, 48, 67);
    doc.rect(0, 0, 297, 24, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("WADDEN SEA PROJECT · NOI REQUIREMENTS", 10, 10);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated ${generatedAt.toLocaleDateString("en-GB")} · ${pointRows.length} requirement${pointRows.length === 1 ? "" : "s"}`, 10, 17);
    doc.setTextColor(40, 55, 70);
    doc.setFontSize(8);
    const activeFilters = [
      itpNumberFilter !== "All" ? `ITP: ${itpNumberFilter}` : "",
      itpTitleFilter !== "All" ? `Title: ${itpTitleFilter}` : "",
      supplierFilter !== "All" ? `Supplier: ${supplierFilter}` : "",
      typeFilter !== "All" ? `Point: ${typeFilter}` : "",
      statusFilter !== "All" ? `Status: ${statusFilter}` : "",
    ].filter(Boolean).join(" · ") || "All project NOI requirements";
    doc.text(activeFilters, 10, 29);
    autoTable(doc, {
      startY: 34,
      head: [["ITP number / revision", "Title", "Supplier / scope", "Section", "Activity", "Code", "Party / source", "Planned", "NOI number", "Status", "Notes"]],
      body: pointRows.map(({ point, itp }) => {
        const revision = itp?.project_itp_revisions?.find((item) => item.id === point.revision_id);
        return [
          `${itp?.document_number || "Unknown"}\nRev ${revision?.revision || "—"}`,
          itp?.title || "—",
          `${itp?.supplier || "—"}\n${itp?.scope || "No scope"}`,
          point.section_number,
          point.activity_description,
          point.intervention_type,
          `${point.party_heading}\n${point.source_location || "Manual"}`,
          point.planned_date ? new Date(`${point.planned_date}T00:00:00`).toLocaleDateString("en-GB") : "TBC",
          point.noi_number || "TBC",
          point.status,
          point.notes || "",
        ];
      }),
      theme: "grid",
      styles: { font: "helvetica", fontSize: 6.5, cellPadding: 1.8, valign: "top", lineColor: [205, 216, 226], lineWidth: 0.15 },
      headStyles: { fillColor: [0, 86, 112], textColor: 255, fontStyle: "bold", fontSize: 6.5 },
      columnStyles: {
        0: { cellWidth: 27 }, 1: { cellWidth: 31 }, 2: { cellWidth: 25 }, 3: { cellWidth: 14 },
        4: { cellWidth: 52 }, 5: { cellWidth: 12 }, 6: { cellWidth: 35 }, 7: { cellWidth: 18 },
        8: { cellWidth: 20 }, 9: { cellWidth: 20 }, 10: { cellWidth: 27 },
      },
      margin: { left: 8, right: 8, bottom: 12 },
    });
    const pageCount = doc.getNumberOfPages();
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      doc.setPage(pageNumber);
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(`Wadden Sea · Project NOI Requirements · Page ${pageNumber} of ${pageCount}`, 10, 204);
    }
    doc.save(`wadden-sea-noi-requirements-${generatedAt.toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <main style={page}>
      <QualityPageHero label="Wadden Sea · Inspection intelligence" title="NOI Tracker" description="Controlled witness and hold-point register extracted from current Supplier ITP revisions." />
      <ImsTopMetaRow backHref="/projects/wadden-sea" backLabel="Back to Wadden Sea" status={<><strong>Status:</strong> {message || "Client, Enshore and Contractor W/H requirements loaded."}</>} />
      <WaddenSeaWorkspaceNav active="noi" />

      <section className="quality-kpi-grid" style={metricsGrid}>
        <QualityKpiCard title="Total Points" value={metrics.total} accent="#005670" />
        <QualityKpiCard title="Contains W" value={metrics.witness} accent="#63B1BC" />
        <QualityKpiCard title="Contains H" value={metrics.hold} accent="#F93822" />
        <QualityKpiCard title="Composite Codes" value={metrics.combined} accent="#53565A" />
        <QualityKpiCard title="Outstanding" value={metrics.outstanding} accent="#FFAD00" />
      </section>

      <section style={surface}>
        <div style={sectionHeader}><div><div style={kicker}>ITP scanner</div><h2 style={title}>Extract W/H involvement points</h2></div></div>
        <div style={scanner}>
          <label style={field}><span>Current ITP</span><select style={input} value={selectedItpId} onChange={(event) => { setSelectedItpId(event.target.value); setCandidates([]); }}>{itps.map((itp) => {
            const revision = currentRevision(itp);
            return <option key={itp.id} value={itp.id}>{itp.document_number} · Rev {revision?.revision || "—"} · {itp.supplier || "No supplier"}</option>;
          })}</select></label>
          <button style={primaryButton} disabled={busy || !selectedItp} onClick={() => void scanSelectedItp()}>{busy ? "Scanning…" : "Scan current revision"}</button>
          <button style={secondaryButton} disabled={busy || !selectedItp} onClick={() => setShowManualEntry((current) => !current)}>{showManualEntry ? "Close manual entry" : "Add manual point"}</button>
        </div>
        {message && <div style={notice}>{message}</div>}
        {showManualEntry && <form style={manualPanel} onSubmit={(event) => void saveManualPoint(event)}>
          <div style={candidateHeader}><strong>Add manual NOI point</strong><span>Saved against the selected current ITP revision and labelled as a manual entry.</span></div>
          <div style={manualGrid}>
            <label style={field}><span>Section / item *</span><input style={input} value={manualPoint.sectionNumber} onChange={(event) => setManualPoint((current) => ({ ...current, sectionNumber: event.target.value }))} placeholder="e.g. 4.5" /></label>
            <label style={{ ...field, gridColumn: "span 2" }}><span>Activity description *</span><input style={input} value={manualPoint.activityDescription} onChange={(event) => setManualPoint((current) => ({ ...current, activityDescription: event.target.value }))} placeholder="Inspection or test activity" /></label>
            <label style={field}><span>W/H code *</span><input list="noi-intervention-codes" style={input} value={manualPoint.interventionType} onChange={(event) => setManualPoint((current) => ({ ...current, interventionType: event.target.value.toUpperCase() }))} /></label>
            <label style={field}><span>Relevant party</span><input style={input} value={manualPoint.partyHeading} onChange={(event) => setManualPoint((current) => ({ ...current, partyHeading: event.target.value }))} /></label>
            <label style={field}><span>Source page / reference</span><input style={input} value={manualPoint.sourceReference} onChange={(event) => setManualPoint((current) => ({ ...current, sourceReference: event.target.value }))} placeholder="e.g. Page 6" /></label>
            <label style={field}><span>Planned date</span><input style={input} type="date" value={manualPoint.plannedDate} onChange={(event) => setManualPoint((current) => ({ ...current, plannedDate: event.target.value }))} /></label>
            <label style={field}><span>NOI number</span><input style={input} value={manualPoint.noiNumber} onChange={(event) => setManualPoint((current) => ({ ...current, noiNumber: event.target.value }))} placeholder="TBC" /></label>
            <label style={field}><span>Status</span><select style={input} value={manualPoint.status} onChange={(event) => setManualPoint((current) => ({ ...current, status: event.target.value }))}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
            <label style={{ ...field, gridColumn: "span 2" }}><span>Notes</span><input style={input} value={manualPoint.notes} onChange={(event) => setManualPoint((current) => ({ ...current, notes: event.target.value }))} placeholder="Reason for manual entry or supporting note" /></label>
          </div>
          <div style={candidateActions}><button type="button" style={secondaryButton} onClick={() => { setManualPoint(emptyManualPoint); setShowManualEntry(false); }}>Cancel</button><button type="submit" style={primaryButton} disabled={busy}>{busy ? "Saving…" : "Add point to register"}</button></div>
        </form>}
        {candidates.length > 0 && <div style={candidatePanel}>
          <div style={candidateHeader}><strong>Review extracted points</strong><span>Untick anything that is not applicable and edit the description if needed.</span></div>
          {candidates.map((candidate, index) => <div key={`${candidate.sectionNumber}-${index}`} style={candidateRow}>
            <input type="checkbox" checked={candidate.selected} onChange={(event) => setCandidates((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, selected: event.target.checked } : item))} />
            <input style={compactInput} value={candidate.sectionNumber} onChange={(event) => setCandidates((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, sectionNumber: event.target.value } : item))} />
            <input style={wideInput} value={candidate.activityDescription} onChange={(event) => setCandidates((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, activityDescription: event.target.value } : item))} />
            <input list="noi-intervention-codes" style={{ ...compactInput, ...typeTone(candidate.interventionType) }} value={candidate.interventionType} onChange={(event) => setCandidates((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, interventionType: event.target.value.toUpperCase() } : item))} />
            <span style={source}><strong>{candidate.partyHeading}</strong><small>{candidate.sourceLocation} · {candidate.confidence}</small></span>
          </div>)}
          <div style={candidateActions}><button style={secondaryButton} onClick={() => setCandidates([])}>Discard</button><button style={primaryButton} disabled={busy} onClick={() => void saveCandidates()}>Add selected points to register</button></div>
        </div>}
      </section>

      <section style={surface}>
        <div style={sectionHeader}><div><div style={kicker}>Controlled register</div><h2 style={title}>Project NOI requirements</h2></div><button style={primaryButton} onClick={exportPdf}>Download PDF</button></div>
        <datalist id="noi-intervention-codes"><option value="W" /><option value="H" /><option value="W/H" /><option value="R/W" /><option value="M/W" /><option value="H/R" /></datalist>
        <div style={filterGrid}>
          <input style={input} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search section, activity, NOI or notes…" />
          <select aria-label="Filter by ITP number" style={input} value={itpNumberFilter} onChange={(event) => setItpNumberFilter(event.target.value)}><option value="All">All ITP numbers</option>{[...new Set(itps.map((itp) => itp.document_number))].sort().map((value) => <option key={value}>{value}</option>)}</select>
          <select aria-label="Filter by ITP title" style={input} value={itpTitleFilter} onChange={(event) => setItpTitleFilter(event.target.value)}><option value="All">All ITP titles</option>{[...new Set(itps.map((itp) => itp.title))].sort().map((value) => <option key={value}>{value}</option>)}</select>
          <select aria-label="Filter by supplier" style={input} value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)}><option value="All">All suppliers</option>{[...new Set(itps.map((itp) => itp.supplier || "No supplier"))].sort().map((value) => <option key={value}>{value}</option>)}</select>
          <select aria-label="Filter by point type" style={input} value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="All">All point types</option>{[...new Set(points.map((point) => point.intervention_type))].sort().map((type) => <option key={type}>{type}</option>)}</select>
          <select aria-label="Filter by status" style={input} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="All">All statuses</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select>
        </div>
        <div style={tableWrap}><table style={table}><thead><tr>{["ITP / supplier", "Section", "Activity", "Point", "Planned date", "NOI number", "Status", "Notes", ""].map((heading) => <th key={heading} style={th}>{heading}</th>)}</tr></thead><tbody>
          {pointRows.map(({ point, itp }) => <tr key={point.id}>
            <td style={td}><strong style={teal}>{itp?.document_number || "Unknown ITP"}</strong><small style={small}>{itp?.supplier || "—"} · {itp?.scope || "No scope"}</small></td>
            <td style={td}><strong>{point.section_number}</strong><small style={small}>{point.source_location || point.party_heading}</small></td>
            <td style={td}><input style={wideInput} value={point.activity_description} onChange={(event) => setPoints((current) => current.map((item) => item.id === point.id ? { ...item, activity_description: event.target.value } : item))} onBlur={(event) => void updatePoint(point, { activity_description: event.target.value })} /></td>
            <td style={td}><input list="noi-intervention-codes" style={{ ...compactInput, ...typeTone(point.intervention_type) }} value={point.intervention_type} onChange={(event) => setPoints((current) => current.map((item) => item.id === point.id ? { ...item, intervention_type: event.target.value.toUpperCase() } : item))} onBlur={(event) => {
              const value = event.target.value.toUpperCase().replace(/\s+/g, "");
              if (validIntervention(value)) void updatePoint(point, { intervention_type: value });
              else { setMessage("Intervention codes must contain W or H, for example W, H, R/W, M/W, or W/H."); void load(); }
            }} /></td>
            <td style={td}><input style={compactInput} type="date" value={point.planned_date || ""} onChange={(event) => void updatePoint(point, { planned_date: event.target.value || null })} /></td>
            <td style={td}><input style={compactInput} value={point.noi_number || ""} placeholder="TBC" onChange={(event) => setPoints((current) => current.map((item) => item.id === point.id ? { ...item, noi_number: event.target.value } : item))} onBlur={(event) => void updatePoint(point, { noi_number: event.target.value || null })} /></td>
            <td style={td}><select style={compactInput} value={point.status} onChange={(event) => void updatePoint(point, { status: event.target.value })}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></td>
            <td style={td}><input style={wideInput} value={point.notes || ""} placeholder="Notes" onChange={(event) => setPoints((current) => current.map((item) => item.id === point.id ? { ...item, notes: event.target.value } : item))} onBlur={(event) => void updatePoint(point, { notes: event.target.value || null })} /></td>
            <td style={td}><div style={rowActions}>{point.noi_number ? <Link style={noiButton} href={`/projects/wadden-sea/noi/create?noi=${encodeURIComponent(point.noi_number)}`}>NOI</Link> : null}<button style={deleteButton} disabled={savingId === point.id} onClick={() => void deletePoint(point)}>{savingId === point.id ? "…" : "Delete"}</button></div></td>
          </tr>)}
          {pointRows.length === 0 && <tr><td colSpan={9} style={empty}>No NOI points match the current filters.</td></tr>}
        </tbody></table></div>
      </section>
    </main>
  );
}

const page: CSSProperties = { display: "grid", gap: 16 };
const metricsGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 16, marginBottom: 4 };
const surface: CSSProperties = { background: "#fff", border: "1px solid #d8e2eb", borderRadius: 18, overflow: "hidden" };
const sectionHeader: CSSProperties = { padding: "16px 18px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 };
const kicker: CSSProperties = { color: "#005670", fontWeight: 900, fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase" };
const title: CSSProperties = { margin: "3px 0 0", color: "#14263a", fontSize: 20 };
const scanner: CSSProperties = { padding: "4px 18px 14px", display: "grid", gridTemplateColumns: "1fr auto auto", alignItems: "end", gap: 10 };
const field: CSSProperties = { display: "grid", gap: 5, color: "#526477", fontWeight: 800, fontSize: 11 };
const input: CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #cad7e3", borderRadius: 9, background: "#fff", padding: "9px 10px", color: "#26384b", font: "inherit" };
const primaryButton: CSSProperties = { border: 0, borderRadius: 9, background: "#005670", color: "#fff", padding: "10px 14px", fontWeight: 900, cursor: "pointer" };
const secondaryButton: CSSProperties = { ...primaryButton, background: "#e8eef3", color: "#3b4c5f" };
const notice: CSSProperties = { margin: "0 18px 14px", padding: "10px 12px", borderRadius: 9, background: "#fff7d6", color: "#774b00", fontSize: 12 };
const candidatePanel: CSSProperties = { borderTop: "1px solid #e2e8f0", background: "#f7fafc", padding: 16, display: "grid", gap: 7 };
const manualPanel: CSSProperties = { ...candidatePanel, background: "#ECECE7" };
const manualGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4,minmax(130px,1fr))", gap: 9 };
const candidateHeader: CSSProperties = { display: "flex", justifyContent: "space-between", color: "#5d6e80", fontSize: 11, marginBottom: 3 };
const candidateRow: CSSProperties = { display: "grid", gridTemplateColumns: "22px 75px 1fr 60px 190px", gap: 7, alignItems: "center", background: "#fff", border: "1px solid #dbe5ee", borderRadius: 8, padding: 7 };
const compactInput: CSSProperties = { ...input, padding: "6px 7px", borderRadius: 6, fontSize: 10 };
const wideInput: CSSProperties = { ...compactInput, width: "100%" };
const source: CSSProperties = { display: "grid", gap: 2, color: "#45576a", fontSize: 10 };
const candidateActions: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 5 };
const filterGrid: CSSProperties = { display: "grid", gridTemplateColumns: "minmax(220px,1.4fr) repeat(5,minmax(120px,1fr))", gap: 8, padding: "3px 18px 14px" };
const tableWrap: CSSProperties = { width: "100%", overflowX: "auto", borderTop: "1px solid #e2e8f0" };
const table: CSSProperties = { width: "100%", minWidth: 1200, borderCollapse: "collapse", tableLayout: "fixed", fontSize: 10 };
const th: CSSProperties = { textAlign: "left", background: "#1f3043", color: "#fff", padding: "9px 7px", fontSize: 9, textTransform: "uppercase" };
const td: CSSProperties = { borderBottom: "1px solid #e4eaf0", padding: "7px", verticalAlign: "top", color: "#2b3c4f" };
const teal: CSSProperties = { color: "#005670", display: "block" };
const small: CSSProperties = { display: "block", color: "#718096", marginTop: 3, lineHeight: 1.25 };
const deleteButton: CSSProperties = { border: "1px solid #fecaca", borderRadius: 6, background: "#fff1f2", color: "#b42318", padding: "5px 7px", fontWeight: 900, fontSize: 9, cursor: "pointer" };
const rowActions: CSSProperties = { display: "flex", gap: 5, alignItems: "center" };
const noiButton: CSSProperties = { borderRadius: 6, background: "#ECECE7", color: "#005670", padding: "6px 8px", fontWeight: 900, fontSize: 10, textDecoration: "none" };
const empty: CSSProperties = { padding: 30, textAlign: "center", color: "#64748b" };

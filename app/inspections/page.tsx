"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, FormEvent } from "react";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { ImsButton, ImsPanel, ImsTabs, ImsTopMetaRow } from "../../src/components/ImsPrimitives";
import { QualityKpiCard } from "../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../src/components/QualityPageHero";
import { imsColours, imsFieldStyle, imsFilterGridStyle, imsInputStyle, imsLabelStyle, imsTableCellStyle, imsTableHeadStyle, imsTableStyle } from "../../src/components/imsTheme";
import { useImsPermissions } from "../../src/components/ImsPermissions";
import { supabase } from "../../src/lib/supabase";
import { projects as projectRegistry, getProject } from "../../src/lib/projectRegistry";
import { exportPdfTableTheme, exportRgb, exportTypography } from "../../src/lib/exportTheme";

type Attendee = { name: string; company: string; contact: string; email: string };

type InspectionAttachment = { id: string; file_name: string; file_path: string; uploaded_at: string };

type InspectionEvent = {
  id: string;
  source: "NOI" | "Manual";
  projectKey: string;
  projectLabel: string;
  date: string | null;
  title: string;
  itpReference: string;
  supplier: string;
  manualSupplier: string;
  sectionNumber: string;
  interventionType: string;
  status: string;
  noiNumber: string | null;
  location: string;
  duration: string;
  attendees: Attendee[];
  clientVisible: boolean;
  notes: string;
  editHref?: string;
  manualId?: string;
};

type ManualFormState = {
  projectKey: string;
  newProjectLabel: string;
  title: string;
  description: string;
  itpReference: string;
  supplier: string;
  interventionType: string;
  inspectionDate: string;
  duration: string;
  location: string;
  status: string;
  clientVisible: boolean;
  notes: string;
  attendees: Attendee[];
};

const STATUS_OPTIONS = ["Planned", "Confirmed", "Completed", "Cancelled"];
const WEEK_COUNT = 8;

const blankAttendee = (): Attendee => ({ name: "", company: "", contact: "", email: "" });

const blankForm = (): ManualFormState => ({
  projectKey: "",
  newProjectLabel: "",
  title: "",
  description: "",
  itpReference: "",
  supplier: "",
  interventionType: "",
  inspectionDate: "",
  duration: "",
  location: "",
  status: "Planned",
  clientVisible: true,
  notes: "",
  attendees: [blankAttendee()],
});

function atLocalMidnight(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function startOfIsoWeek(date: Date) {
  const result = atLocalMidnight(date);
  const day = result.getDay() || 7;
  return addDays(result, 1 - day);
}

function formatInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(value: string | null) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function displayDate(value: string | null) {
  const date = parseDate(value);
  if (!date) return "Date TBC";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "project";
}

function attendeeSummary(attendees: Attendee[]) {
  return attendees.filter((person) => person.name.trim()).map((person) => person.name.trim());
}

// Some ITP-scanned activity text comes out with runs of extra whitespace
// (e.g. spaced between individual letters) depending on how the source PDF
// encodes its text layer. That renders fine as a plain string, but jsPDF's
// autoTable can mis-measure it and stretch it into oddly letter-spaced,
// truncated text. Collapsing whitespace before it reaches the PDF avoids
// that regardless of how the text got that way.
function cleanPdfText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function chipMetaLabel(event: InspectionEvent) {
  const typeLabel = event.interventionType || (event.source === "Manual" ? "" : event.source);
  const dateLabel = event.date ? parseDate(event.date)?.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "";
  return [typeLabel, dateLabel].filter(Boolean).join(" · ");
}

function sortByProjectThenDate(events: InspectionEvent[]) {
  return [...events].sort((a, b) => {
    const projectCompare = a.projectLabel.localeCompare(b.projectLabel);
    if (projectCompare !== 0) return projectCompare;
    const dateA = parseDate(a.date);
    const dateB = parseDate(b.date);
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    return dateA.getTime() - dateB.getTime();
  });
}

export default function OverallInspectionsPage() {
  const permissions = useImsPermissions();
  const [events, setEvents] = useState<InspectionEvent[]>([]);
  const [message, setMessage] = useState("Loading inspections...");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"lookahead" | "register">("lookahead");

  const [projectFilter, setProjectFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState<"All" | "NOI" | "Manual">("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState<"All" | "W" | "H">("All");
  const [clientVisibleOnly, setClientVisibleOnly] = useState(false);
  const [attendeeSearch, setAttendeeSearch] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<InspectionEvent | null>(null);
  const [detailEdit, setDetailEdit] = useState<{ date: string; location: string; duration: string; notes: string; attendees: Attendee[] } | null>(null);
  const [savingDetail, setSavingDetail] = useState(false);
  const [detailAttachments, setDetailAttachments] = useState<InspectionAttachment[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const formAttachmentInputRef = useRef<HTMLInputElement>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingManualId, setEditingManualId] = useState<string | null>(null);
  const [form, setForm] = useState<ManualFormState>(blankForm());
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [people, setPeople] = useState<{ id: string; name: string; email: string }[]>([]);
  const [allItps, setAllItps] = useState<{ project_key: string; document_number: string; supplier: string }[]>([]);

  useEffect(() => {
    void loadAll();
    void (async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUserEmail(data.user?.email || "");
    })();
    void (async () => {
      const { data } = await supabase.from("people").select("id,name,email").eq("active", true).order("name");
      setPeople((data || []) as { id: string; name: string; email: string }[]);
    })();
  }, []);

  async function loadAll() {
    setMessage("Loading inspections...");
    const [pointsResult, itpsResult, attendeesResult, manualResult] = await Promise.all([
      supabase.from("project_noi_points").select("id,project_key,itp_id,section_number,activity_description,intervention_type,planned_date,noi_number,status"),
      supabase.from("project_itps").select("id,project_key,document_number,supplier"),
      supabase.from("project_noi_attendees").select("point_id,attendees,location,duration,notes"),
      supabase.from("project_manual_inspections").select("*").order("inspection_date"),
    ]);
    if (pointsResult.error || itpsResult.error) {
      setMessage(pointsResult.error?.message || itpsResult.error?.message || "Inspections could not be loaded.");
      return;
    }
    const setupNeeded = Boolean(attendeesResult.error || manualResult.error);
    setAllItps((itpsResult.data || []).map((itp) => ({ project_key: itp.project_key as string, document_number: itp.document_number as string, supplier: (itp.supplier as string | null) || "" })));
    const itpById = new Map((itpsResult.data || []).map((itp) => [itp.id as string, itp as { document_number: string; supplier: string | null }]));
    // Manual entries store their ITP reference as the ITP's document number
    // (the "ITP reference" dropdown on the manual form is built from these
    // same document numbers), so a manual entry can resolve its supplier by
    // matching on this, the same way an ITP/NOI-derived row resolves it via
    // itp_id.
    const supplierByDocNumber = new Map(
      (itpsResult.data || []).map((itp) => [(itp.document_number as string).trim().toLowerCase(), (itp.supplier as string | null) || ""])
    );
    const attendeeMeta = new Map(
      (attendeesResult.data || []).map((row) => [
        row.point_id as string,
        row as { attendees: Attendee[] | null; location: string | null; duration: string | null; notes: string | null },
      ])
    );

    const noiEvents: InspectionEvent[] = (pointsResult.data || []).map((point) => {
      const itp = itpById.get(point.itp_id as string);
      const meta = attendeeMeta.get(point.id as string);
      return {
        id: `noi-${point.id}`,
        source: "NOI",
        projectKey: point.project_key as string,
        projectLabel: getProject(point.project_key as string).label,
        date: point.planned_date as string | null,
        title: point.activity_description as string,
        itpReference: itp?.document_number || "",
        supplier: itp?.supplier || "",
        manualSupplier: "",
        sectionNumber: point.section_number as string,
        interventionType: point.intervention_type as string,
        status: point.status as string,
        noiNumber: point.noi_number as string | null,
        location: meta?.location || "",
        duration: meta?.duration || "",
        attendees: meta?.attendees || [],
        clientVisible: true,
        notes: meta?.notes || "",
        editHref: point.noi_number ? `/projects/${point.project_key}/noi/create?noi=${point.noi_number}` : undefined,
      };
    });

    const manualEvents: InspectionEvent[] = (manualResult.data || []).map((row) => {
      const itpReference = (row.itp_reference as string | null) || "";
      const manualSupplier = (row.supplier as string | null) || "";
      const resolvedItpSupplier = itpReference ? supplierByDocNumber.get(itpReference.trim().toLowerCase()) : undefined;
      return {
      id: `manual-${row.id}`,
      source: "Manual",
      projectKey: row.project_key as string,
      projectLabel: row.project_label as string,
      date: row.inspection_date as string | null,
      title: row.title as string,
      itpReference,
      // An ITP reference that matches a known ITP always wins — it's the
      // live, authoritative supplier for that ITP. The manually-entered
      // value is only used as a fallback when there's no ITP to resolve
      // from (or the reference doesn't match one).
      supplier: resolvedItpSupplier || manualSupplier,
      manualSupplier,
      sectionNumber: "",
      interventionType: (row.intervention_type as string | null) || "",
      status: row.status as string,
      noiNumber: (row.noi_number as string | null) || null,
      location: (row.location as string | null) || "",
      duration: (row.duration as string | null) || "",
      attendees: (row.attendees as Attendee[] | null) || [],
      clientVisible: row.client_visible as boolean,
      notes: (row.notes as string | null) || "",
      editHref: `/projects/${row.project_key}/noi/create?manual=${row.id}`,
      manualId: row.id as string,
      };
    });

    setEvents([...noiEvents, ...manualEvents]);
    setMessage(
      setupNeeded
        ? "Showing ITP/NOI inspections only. Run scripts/sql/project_inspections.sql in Supabase to enable attendees and manual entries."
        : `${noiEvents.length + manualEvents.length} inspection${noiEvents.length + manualEvents.length === 1 ? "" : "s"} loaded.`
    );
  }

  const knownProjects = useMemo(() => {
    const map = new Map<string, string>();
    Object.entries(projectRegistry).forEach(([key, config]) => map.set(key, config.label));
    events.forEach((event) => { if (!map.has(event.projectKey)) map.set(event.projectKey, event.projectLabel); });
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [events]);

  const itpOptionsForForm = useMemo(() => {
    const matchingProject = allItps.filter((itp) => itp.project_key === form.projectKey);
    const source = form.projectKey && matchingProject.length ? matchingProject : allItps;
    return [...new Set(source.map((itp) => itp.document_number))].sort();
  }, [allItps, form.projectKey]);

  const supplierByItpReference = useMemo(
    () => new Map(allItps.map((itp) => [itp.document_number.trim().toLowerCase(), itp.supplier])),
    [allItps]
  );
  const formResolvedSupplier = form.itpReference ? supplierByItpReference.get(form.itpReference.trim().toLowerCase()) || "" : "";

  const weekStarts = useMemo(() => {
    const start = startOfIsoWeek(new Date());
    return Array.from({ length: WEEK_COUNT }, (_, index) => addDays(start, index * 7));
  }, []);
  const lookaheadEnd = useMemo(() => addDays(weekStarts[weekStarts.length - 1], 7), [weekStarts]);
  const lookaheadStart = weekStarts[0];

  const filteredEvents = useMemo(() => {
    const search = attendeeSearch.trim().toLowerCase();
    const matches = events.filter((event) => {
      if (projectFilter !== "All" && event.projectKey !== projectFilter) return false;
      if (sourceFilter !== "All" && event.source !== sourceFilter) return false;
      if (statusFilter !== "All" && event.status !== statusFilter) return false;
      if (typeFilter !== "All" && !event.interventionType.split("/").includes(typeFilter)) return false;
      if (clientVisibleOnly && !event.clientVisible) return false;
      if (search && !event.attendees.some((person) => person.name.toLowerCase().includes(search) || person.company.toLowerCase().includes(search))) return false;
      if (view === "lookahead") {
        const date = parseDate(event.date);
        if (!date || date < lookaheadStart || date >= lookaheadEnd) return false;
      }
      return true;
    });
    return sortByProjectThenDate(matches);
  }, [events, projectFilter, sourceFilter, statusFilter, typeFilter, clientVisibleOnly, attendeeSearch, view, lookaheadStart, lookaheadEnd]);

  const gridProjects = useMemo(() => {
    const keys = new Set<string>(knownProjects.map(([key]) => key));
    return [...keys].sort((a, b) => (getProject(a).label || a).localeCompare(getProject(b).label || b));
  }, [knownProjects]);

  const gridEvents = useMemo(() => {
    return events.filter((event) => {
      if (sourceFilter !== "All" && event.source !== sourceFilter) return false;
      if (statusFilter !== "All" && event.status !== statusFilter) return false;
      if (typeFilter !== "All" && !event.interventionType.split("/").includes(typeFilter)) return false;
      if (clientVisibleOnly && !event.clientVisible) return false;
      const date = parseDate(event.date);
      return date && date >= lookaheadStart && date < lookaheadEnd;
    });
  }, [events, sourceFilter, statusFilter, typeFilter, clientVisibleOnly, lookaheadStart, lookaheadEnd]);

  function eventsFor(projectKey: string, weekStart: Date) {
    const weekEnd = addDays(weekStart, 7);
    return gridEvents.filter((event) => {
      if (event.projectKey !== projectKey) return false;
      const date = parseDate(event.date);
      return date && date >= weekStart && date < weekEnd;
    });
  }

  function updateFormAttendee(index: number, changes: Partial<Attendee>) {
    setForm((current) => ({ ...current, attendees: current.attendees.map((item, itemIndex) => (itemIndex === index ? { ...item, ...changes } : item)) }));
  }

  function openCreateForm(prefillProjectKey?: string) {
    setEditingManualId(null);
    setForm({ ...blankForm(), projectKey: prefillProjectKey || "" });
    setPendingFiles([]);
    setDetailAttachments([]);
    setShowForm(true);
  }

  function openDetail(event: InspectionEvent) {
    setSelectedEvent(event);
    setDetailEdit({
      date: event.date || "",
      location: event.location,
      duration: event.duration,
      notes: event.notes,
      attendees: event.attendees.length ? event.attendees : [blankAttendee()],
    });
    void loadAttachments(event.id);
  }

  async function loadAttachments(inspectionId: string) {
    const { data } = await supabase
      .from("project_inspection_attachments")
      .select("id,file_name,file_path,uploaded_at")
      .eq("inspection_id", inspectionId)
      .order("uploaded_at", { ascending: false });
    setDetailAttachments((data || []) as InspectionAttachment[]);
  }

  async function uploadFileAsAttachment(file: File, inspectionId: string, projectKey: string) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${projectKey}/inspection-attachments/${inspectionId}/${Date.now()}-${safeName}`;
    const uploaded = await supabase.storage.from("project-documents").upload(path, file);
    if (uploaded.error) throw uploaded.error;
    const { error } = await supabase.from("project_inspection_attachments").insert({
      inspection_id: inspectionId,
      project_key: projectKey,
      file_name: file.name,
      file_path: path,
      file_size: file.size,
      content_type: file.type || null,
      uploaded_by_email: currentUserEmail || null,
    });
    if (error) throw error;
  }

  async function uploadAttachment(changeEvent: ChangeEvent<HTMLInputElement>) {
    const file = changeEvent.target.files?.[0];
    changeEvent.target.value = "";
    if (!file || !selectedEvent) return;
    setUploadingAttachment(true);
    try {
      await uploadFileAsAttachment(file, selectedEvent.id, selectedEvent.projectKey);
      await loadAttachments(selectedEvent.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The attachment could not be uploaded.");
    } finally {
      setUploadingAttachment(false);
    }
  }

  function queueAttachment(changeEvent: ChangeEvent<HTMLInputElement>) {
    const file = changeEvent.target.files?.[0];
    changeEvent.target.value = "";
    if (!file) return;
    setPendingFiles((current) => [...current, file]);
  }

  function removePendingFile(index: number) {
    setPendingFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function openAttachment(attachment: InspectionAttachment) {
    const { data, error } = await supabase.storage.from("project-documents").createSignedUrl(attachment.file_path, 60 * 60 * 24 * 180);
    if (error || !data?.signedUrl) {
      setMessage(error?.message || "The attachment could not be opened.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  function updateDetailAttendee(index: number, changes: Partial<Attendee>) {
    setDetailEdit((current) => current ? { ...current, attendees: current.attendees.map((item, itemIndex) => (itemIndex === index ? { ...item, ...changes } : item)) } : current);
  }

  async function saveDetailEdit() {
    if (!selectedEvent || !detailEdit) return;
    setSavingDetail(true);
    const cleanAttendees = detailEdit.attendees.filter((person) => person.name.trim());
    try {
      if (selectedEvent.source === "Manual" && selectedEvent.manualId) {
        const { error } = await supabase
          .from("project_manual_inspections")
          .update({
            inspection_date: detailEdit.date,
            location: detailEdit.location.trim() || null,
            duration: detailEdit.duration.trim() || null,
            notes: detailEdit.notes.trim() || null,
            attendees: cleanAttendees,
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedEvent.manualId);
        if (error) throw error;
      } else {
        const pointId = selectedEvent.id.replace(/^noi-/, "");
        const { error: pointError } = await supabase
          .from("project_noi_points")
          .update({ planned_date: detailEdit.date || null, updated_at: new Date().toISOString() })
          .eq("id", pointId);
        if (pointError) throw pointError;
        const { error: attendeeError } = await supabase.from("project_noi_attendees").upsert(
          {
            point_id: pointId,
            project_key: selectedEvent.projectKey,
            noi_number: selectedEvent.noiNumber,
            attendees: cleanAttendees,
            location: detailEdit.location.trim() || null,
            duration: detailEdit.duration.trim() || null,
            notes: detailEdit.notes.trim() || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "point_id" }
        );
        if (attendeeError) throw attendeeError;
      }
      setMessage("Inspection updated.");
      setSelectedEvent(null);
      setDetailEdit(null);
      await loadAll();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The inspection could not be updated.");
    } finally {
      setSavingDetail(false);
    }
  }

  function openEditForm(event: InspectionEvent) {
    if (event.source !== "Manual" || !event.manualId) return;
    setEditingManualId(event.manualId);
    setForm({
      projectKey: event.projectKey,
      newProjectLabel: "",
      title: event.title,
      description: "",
      itpReference: event.itpReference,
      supplier: event.manualSupplier,
      interventionType: event.interventionType,
      inspectionDate: event.date || "",
      duration: event.duration,
      location: event.location,
      status: event.status,
      clientVisible: event.clientVisible,
      notes: event.notes,
      attendees: event.attendees.length ? event.attendees : [blankAttendee()],
    });
    setPendingFiles([]);
    void loadAttachments(event.id);
    setSelectedEvent(null);
    setShowForm(true);
  }

  async function submitForm(formEvent: FormEvent) {
    formEvent.preventDefault();
    const isNewProject = form.projectKey === "__new__";
    const projectLabel = isNewProject ? form.newProjectLabel.trim() : (knownProjects.find(([key]) => key === form.projectKey)?.[1] || getProject(form.projectKey).label);
    const projectKey = isNewProject ? slugify(form.newProjectLabel) : form.projectKey;
    if (!projectKey || (isNewProject && !projectLabel) || !form.title.trim() || !form.inspectionDate) {
      setMessage("Complete the project, title, and inspection date before saving.");
      return;
    }
    setBusy(true);
    const payload = {
      project_key: projectKey,
      project_label: projectLabel,
      title: form.title.trim(),
      description: form.description.trim() || null,
      itp_reference: form.itpReference.trim() || null,
      // Only store the manual fallback when there's no ITP to resolve a
      // supplier from — with an ITP reference, the app always reads that
      // ITP's own (live) supplier instead, so persisting a value here would
      // just be a stale duplicate.
      supplier: form.itpReference.trim() ? null : form.supplier.trim() || null,
      intervention_type: form.interventionType.trim() || null,
      inspection_date: form.inspectionDate,
      duration: form.duration.trim() || null,
      location: form.location.trim() || null,
      status: form.status,
      attendees: form.attendees.filter((person) => person.name.trim()),
      client_visible: form.clientVisible,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };
    try {
      let manualId = editingManualId;
      if (editingManualId) {
        const { error } = await supabase.from("project_manual_inspections").update(payload).eq("id", editingManualId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("project_manual_inspections").insert({ ...payload, created_by_email: currentUserEmail || null }).select("id").single();
        if (error) throw error;
        manualId = data.id as string;
      }
      if (pendingFiles.length && manualId) {
        for (const file of pendingFiles) {
          await uploadFileAsAttachment(file, `manual-${manualId}`, projectKey);
        }
      }
      setMessage(editingManualId ? "Manual inspection updated." : "Manual inspection added.");
      setShowForm(false);
      setEditingManualId(null);
      setForm(blankForm());
      setPendingFiles([]);
      await loadAll();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The manual inspection could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteManual(event: InspectionEvent) {
    if (event.source !== "Manual" || !event.manualId) return;
    if (!window.confirm(`Delete "${event.title}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("project_manual_inspections").delete().eq("id", event.manualId);
      if (error) throw error;
      setSelectedEvent(null);
      setMessage("Manual inspection deleted.");
      await loadAll();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The manual inspection could not be deleted.");
    } finally {
      setBusy(false);
    }
  }

  function exportExcel() {
    const rows = filteredEvents.map((event) => ({
      Project: event.projectLabel,
      Date: displayDate(event.date),
      Reference: event.noiNumber || event.sectionNumber || "-",
      Activity: event.title,
      "ITP Reference": event.itpReference || "-",
      Supplier: event.supplier || "-",
      Type: event.interventionType || "-",
      Attendees: attendeeSummary(event.attendees).join(", ") || "-",
      Status: event.status,
      Source: event.source,
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Inspections");
    XLSX.writeFile(workbook, `Overall-Inspections-${formatInputDate(new Date())}.xlsx`);
  }

  async function exportPdf() {
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;

    try {
      const logoResponse = await fetch("/enshore-primary-logo-colour.png");
      if (logoResponse.ok) {
        const logoBlob = await logoResponse.blob();
        const logoDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(String(reader.result || ""));
          reader.onerror = reject;
          reader.readAsDataURL(logoBlob);
        });
        if (logoDataUrl) doc.addImage(logoDataUrl, "PNG", margin, 9, 42, 21);
      }
    } catch {
      // Keep export available if the logo cannot be loaded.
    }

    doc.setFont(exportTypography.pdfFont, "bold");
    doc.setTextColor(...exportRgb.ink);
    doc.setFontSize(exportTypography.titlePt);
    doc.text("Overall Inspections", pageWidth - margin, 17, { align: "right" });
    doc.setFont(exportTypography.pdfFont, "normal");
    doc.setFontSize(exportTypography.bodyPt);
    doc.setTextColor(...exportRgb.muted);
    doc.text(`Generated: ${new Date().toLocaleString("en-GB")}`, pageWidth - margin, 24, { align: "right" });
    doc.text(
      view === "lookahead" ? `8-week lookahead: ${displayDate(formatInputDate(lookaheadStart))} - ${displayDate(formatInputDate(addDays(lookaheadEnd, -1)))}` : "Full register",
      pageWidth - margin,
      30,
      { align: "right" }
    );
    doc.setDrawColor(...exportRgb.brand);
    doc.setLineWidth(0.7);
    doc.line(margin, 34, pageWidth - margin, 34);

    const sortedEvents = filteredEvents;
    const eventRow = (event: InspectionEvent) => [
      cleanPdfText(event.projectLabel),
      displayDate(event.date),
      cleanPdfText(event.noiNumber || event.sectionNumber || "-"),
      cleanPdfText(event.title),
      cleanPdfText(event.itpReference || "-"),
      cleanPdfText(event.supplier || "-"),
      event.interventionType || "-",
      attendeeSummary(event.attendees).join(", ") || "-",
      event.status,
      event.source,
    ];
    const weekBandRow = (label: string) => [
      {
        content: label,
        colSpan: 10,
        styles: {
          fillColor: [exportRgb.page[0], exportRgb.page[1], exportRgb.page[2]] as [number, number, number],
          textColor: [exportRgb.brand[0], exportRgb.brand[1], exportRgb.brand[2]] as [number, number, number],
          fontStyle: "bold" as const,
          halign: "left" as const,
        },
      },
    ];

    const body: (ReturnType<typeof eventRow> | ReturnType<typeof weekBandRow>)[] = [];
    if (view === "lookahead") {
      weekStarts.forEach((weekStart) => {
        const weekEnd = addDays(weekStart, 7);
        const weekEvents = sortedEvents.filter((event) => {
          const date = parseDate(event.date);
          return date && date >= weekStart && date < weekEnd;
        });
        if (!weekEvents.length) return;
        body.push(weekBandRow(`Week Commencing ${weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`));
        weekEvents.forEach((event) => body.push(eventRow(event)));
      });
      const undated = sortedEvents.filter((event) => !parseDate(event.date));
      if (undated.length) {
        body.push(weekBandRow("Date Not Yet Confirmed"));
        undated.forEach((event) => body.push(eventRow(event)));
      }
    } else {
      sortedEvents.forEach((event) => body.push(eventRow(event)));
    }

    autoTable(doc, {
      startY: 40,
      margin: { left: margin, right: margin },
      theme: "grid",
      styles: { font: exportTypography.pdfFont, fontSize: exportTypography.tablePt, cellPadding: 2.2, overflow: "linebreak", lineColor: [...exportRgb.border], textColor: [...exportRgb.ink], fillColor: [255, 255, 255] },
      headStyles: { fillColor: [...exportPdfTableTheme.headStyles.fillColor], textColor: [...exportPdfTableTheme.headStyles.textColor], fontStyle: exportPdfTableTheme.headStyles.fontStyle },
      head: [["Project", "Date", "Reference", "Activity", "ITP Ref", "Supplier", "Type", "Attendees", "Status", "Source"]],
      body,
    });

    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      doc.setFont(exportTypography.pdfFont, "normal");
      doc.setFontSize(exportTypography.captionPt);
      doc.setTextColor(...exportRgb.muted);
      doc.text("Enshore | Overall Inspections", margin, pageHeight - 8);
      doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: "right" });
    }

    doc.save(`Overall-Inspections-${formatInputDate(new Date())}.pdf`);
  }

  const canWrite = permissions.canCreate;
  const canEditManual = permissions.canEdit;

  return (
    <main>
      <QualityPageHero label="Project Management" title="Overall Inspections" description="Cross-project 8-week lookahead of every inspection, ITP-driven or manually entered, fully filterable for client-ready exports." />
      <ImsTopMetaRow
        backHref="/projects"
        backLabel="Back to Project Management"
        status={<><strong>Status:</strong> {message}</>}
      />

      <ImsTabs
        tabs={[{ value: "lookahead", label: "8-Week Lookahead" }, { value: "register", label: "Full Register" }]}
        active={view}
        onChange={setView}
        ariaLabel="Overall Inspections views"
      />

      <section style={metrics} className="quality-kpi-grid">
        <QualityKpiCard title="In 8-Week Window" value={gridEvents.length} accent="#005670" />
        <QualityKpiCard title="Projects Tracked" value={gridProjects.length} accent="#63B1BC" />
        <QualityKpiCard title="Manual Entries" value={events.filter((event) => event.source === "Manual").length} accent="#FFAD00" />
        <QualityKpiCard title="Filtered Results" value={filteredEvents.length} accent="#53565A" />
      </section>

      <ImsPanel title="Filters" style={panelSpacingStyle}>
        <div style={imsFilterGridStyle}>
          <label style={imsFieldStyle}>
            <span style={imsLabelStyle}>Project</span>
            <select style={imsInputStyle} value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
              <option value="All">All projects</option>
              {knownProjects.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <label style={imsFieldStyle}>
            <span style={imsLabelStyle}>Source</span>
            <select style={imsInputStyle} value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as "All" | "NOI" | "Manual")}>
              <option value="All">All sources</option>
              <option value="NOI">ITP / NOI</option>
              <option value="Manual">Manual entry</option>
            </select>
          </label>
          <label style={imsFieldStyle}>
            <span style={imsLabelStyle}>Status</span>
            <select style={imsInputStyle} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="All">All statuses</option>
              {[...new Set(events.map((event) => event.status))].sort().map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label style={imsFieldStyle}>
            <span style={imsLabelStyle}>Witness / Hold</span>
            <select style={imsInputStyle} value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as "All" | "W" | "H")}>
              <option value="All">All types</option>
              <option value="W">Witness</option>
              <option value="H">Hold</option>
            </select>
          </label>
          <label style={imsFieldStyle}>
            <span style={imsLabelStyle}>Attendee / company</span>
            <input style={imsInputStyle} value={attendeeSearch} onChange={(event) => setAttendeeSearch(event.target.value)} placeholder="Search attendees" />
          </label>
          <label style={{ ...imsFieldStyle, flexDirection: "row", alignItems: "center", gap: 8, display: "flex" }}>
            <input type="checkbox" checked={clientVisibleOnly} onChange={(event) => setClientVisibleOnly(event.target.checked)} />
            <span style={imsLabelStyle}>Client-visible only</span>
          </label>
        </div>
      </ImsPanel>

      {view === "lookahead" ? (
        <ImsPanel title="8-Week Lookahead by Project" subtitle={`${displayDate(formatInputDate(lookaheadStart))} - ${displayDate(formatInputDate(addDays(lookaheadEnd, -1)))}`} style={panelSpacingStyle}>
          <div style={gridScrollStyle}>
            <div style={{ ...gridRowStyle, ...gridHeaderRowStyle }}>
              <div style={gridProjectHeaderCell}>Project</div>
              {weekStarts.map((weekStart) => (
                <div key={weekStart.toISOString()} style={gridWeekHeaderCell}>W/C {weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>
              ))}
            </div>
            {gridProjects.map((projectKey) => (
              <div key={projectKey} style={gridRowStyle}>
                <div style={gridProjectCell}>{getProject(projectKey).label}</div>
                {weekStarts.map((weekStart) => {
                  const cellEvents = eventsFor(projectKey, weekStart);
                  const visibleEvents = cellEvents.slice(0, 2);
                  return (
                    <div key={weekStart.toISOString()} style={gridWeekCell}>
                      {visibleEvents.map((event) => (
                        <button
                          key={event.id}
                          type="button"
                          style={{ ...chipStyle, background: imsColours.brandSoft, color: imsColours.brand }}
                          onClick={() => openDetail(event)}
                          title={event.title}
                        >
                          <span style={chipMetaStyle}>{chipMetaLabel(event)}</span>
                          <span style={chipTitleStyle}>{event.title}</span>
                        </button>
                      ))}
                      {cellEvents.length > visibleEvents.length ? (
                        <button type="button" style={moreChipStyle} onClick={() => { setProjectFilter(projectKey); setView("register"); }}>+{cellEvents.length - visibleEvents.length} more</button>
                      ) : null}
                      {!cellEvents.length ? <span style={emptyCellStyle}>-</span> : null}
                    </div>
                  );
                })}
              </div>
            ))}
            {!gridProjects.length ? <div style={emptyCellStyle}>No projects yet.</div> : null}
          </div>
        </ImsPanel>
      ) : null}

      <ImsPanel
        title={view === "lookahead" ? "8-Week Lookahead Register" : "Full Inspection Register"}
        subtitle={`${filteredEvents.length} matching inspection${filteredEvents.length === 1 ? "" : "s"}`}
        actions={
          <>
            <ImsButton variant="secondary" onClick={exportExcel}>Export Excel</ImsButton>
            <ImsButton variant="secondary" onClick={() => void exportPdf()}>Export PDF</ImsButton>
            {canWrite ? <ImsButton variant="secondary" onClick={() => openCreateForm()}>New Manual Inspection</ImsButton> : null}
          </>
        }
      >
        <div style={{ overflowX: "auto" }}>
          <table style={registerTableStyle}>
            <thead>
              <tr>
                <th style={{ ...imsTableHeadStyle, ...projectColumnStyle }}>Project</th>
                <th style={{ ...imsTableHeadStyle, ...dateColumnStyle }}>Date</th>
                <th style={{ ...imsTableHeadStyle, ...referenceColumnStyle }}>Reference</th>
                <th style={{ ...imsTableHeadStyle, ...activityColumnStyle }}>Activity</th>
                <th style={{ ...imsTableHeadStyle, ...itpRefColumnStyle }}>ITP Ref</th>
                <th style={{ ...imsTableHeadStyle, ...supplierColumnStyle }}>Supplier</th>
                <th style={{ ...imsTableHeadStyle, ...typeColumnStyle }}>Type</th>
                <th style={{ ...imsTableHeadStyle, ...attendeesColumnStyle }}>Attendees</th>
                <th style={{ ...imsTableHeadStyle, ...statusColumnStyle }}>Status</th>
                <th style={{ ...imsTableHeadStyle, ...sourceColumnStyle }}>Source</th>
                <th style={{ ...imsTableHeadStyle, ...actionColumnStyle }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((event) => (
                <tr key={event.id}>
                  <td style={{ ...imsTableCellStyle, ...projectColumnStyle }} title={event.projectLabel}><span style={truncatedCellTextStyle}>{event.projectLabel}</span></td>
                  <td style={{ ...imsTableCellStyle, ...dateColumnStyle }}>{displayDate(event.date)}</td>
                  <td style={{ ...imsTableCellStyle, ...referenceColumnStyle }} title={event.noiNumber || event.sectionNumber || ""}><span style={truncatedCellTextStyle}>{event.noiNumber || event.sectionNumber || "-"}</span></td>
                  <td style={{ ...imsTableCellStyle, ...activityColumnStyle }} title={event.title}><span style={truncatedCellTextStyle}>{event.title}</span></td>
                  <td style={{ ...imsTableCellStyle, ...itpRefColumnStyle }} title={event.itpReference}><span style={truncatedCellTextStyle}>{event.itpReference || "-"}</span></td>
                  <td style={{ ...imsTableCellStyle, ...supplierColumnStyle }} title={event.supplier}><span style={truncatedCellTextStyle}>{event.supplier || "-"}</span></td>
                  <td style={{ ...imsTableCellStyle, ...typeColumnStyle }}>{event.interventionType || "-"}</td>
                  <td style={{ ...imsTableCellStyle, ...attendeesColumnStyle }} title={attendeeSummary(event.attendees).join(", ")}>{attendeeSummary(event.attendees).length || "-"}</td>
                  <td style={{ ...imsTableCellStyle, ...statusColumnStyle }}>{event.status}</td>
                  <td style={{ ...imsTableCellStyle, ...sourceColumnStyle }}>{event.source}</td>
                  <td style={{ ...imsTableCellStyle, ...actionColumnStyle }}><button type="button" style={linkButtonStyle} onClick={() => openDetail(event)}>View</button></td>
                </tr>
              ))}
              {!filteredEvents.length ? <tr><td style={imsTableCellStyle} colSpan={11}>No inspections match the current filters.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </ImsPanel>

      {selectedEvent && detailEdit ? (
        <div style={overlayStyle} onClick={() => { setSelectedEvent(null); setDetailEdit(null); }}>
          <div style={detailPanelStyle} onClick={(clickEvent) => clickEvent.stopPropagation()}>
            <div style={detailHeaderStyle}>
              <div>
                <span style={detailKicker}>{selectedEvent.projectLabel} · {selectedEvent.source === "Manual" ? "Manual entry" : "ITP / NOI"}</span>
                <h3 style={detailTitle}>{selectedEvent.title}</h3>
              </div>
              <button type="button" style={closeButtonStyle} onClick={() => { setSelectedEvent(null); setDetailEdit(null); }}>Close</button>
            </div>
            <div style={detailGridStyle}>
              <Detail label="Reference" value={selectedEvent.noiNumber || selectedEvent.sectionNumber || "-"} />
              <Detail label="ITP Reference" value={selectedEvent.itpReference || "-"} />
              <Detail label="Type" value={selectedEvent.interventionType || "-"} />
              <Detail label="Status" value={selectedEvent.status} />
              <Detail label="Client visible" value={selectedEvent.clientVisible ? "Yes" : "No"} />
            </div>

            <div style={editableSectionStyle}>
              <span style={detailKicker}>{canEditManual ? "Update inspection" : "Inspection schedule"}</span>
              <div style={editableGridStyle}>
                <label style={imsFieldStyle}>
                  <span style={detailLabelStyle}>Date</span>
                  <input style={imsInputStyle} type="date" value={detailEdit.date} disabled={!canEditManual} onChange={(event) => setDetailEdit((current) => current && { ...current, date: event.target.value })} />
                </label>
                <label style={imsFieldStyle}>
                  <span style={detailLabelStyle}>Location</span>
                  <input style={imsInputStyle} value={detailEdit.location} disabled={!canEditManual} onChange={(event) => setDetailEdit((current) => current && { ...current, location: event.target.value })} />
                </label>
                <label style={imsFieldStyle}>
                  <span style={detailLabelStyle}>Duration</span>
                  <input style={imsInputStyle} value={detailEdit.duration} disabled={!canEditManual} onChange={(event) => setDetailEdit((current) => current && { ...current, duration: event.target.value })} />
                </label>
              </div>
            </div>
            <div>
              <span style={detailKicker}>Attendees</span>
              {detailEdit.attendees.map((person, index) => {
                const selectedPersonId = people.find((candidate) => candidate.name === person.name && candidate.email === person.email)?.id || "";
                return (
                  <div key={index} style={attendeeSelectRowStyle}>
                    {person.name.trim() && !selectedPersonId ? (
                      <div style={freeTextAttendeeStyle}>
                        {person.name}{person.company ? ` · ${person.company}` : ""}
                        <span style={freeTextAttendeeHintStyle}>Not in People Management - entered via the NOI creator</span>
                      </div>
                    ) : null}
                    <select
                      style={imsInputStyle}
                      value={selectedPersonId}
                      disabled={!canEditManual}
                      onChange={(event) => {
                        const selectedPerson = people.find((candidate) => candidate.id === event.target.value);
                        updateDetailAttendee(index, { name: selectedPerson?.name || "", email: selectedPerson?.email || "" });
                      }}
                    >
                      <option value="">{person.name.trim() && !selectedPersonId ? "Reassign to a People Management contact..." : "Select..."}</option>
                      {people.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}
                    </select>
                  </div>
                );
              })}
              {canEditManual && detailEdit.attendees.length < 6 ? (
                <button type="button" style={linkButtonStyle} onClick={() => setDetailEdit((current) => current && { ...current, attendees: [...current.attendees, blankAttendee()] })}>Add attendee</button>
              ) : null}
            </div>
            <label style={imsFieldStyle}>
              <span style={detailLabelStyle}>Internal notes (not exported)</span>
              <textarea style={{ ...imsInputStyle, minHeight: 72 }} value={detailEdit.notes} disabled={!canEditManual} onChange={(event) => setDetailEdit((current) => current && { ...current, notes: event.target.value })} />
            </label>
            <div>
              <div style={attendeeHeaderStyle}>
                <span style={detailKicker}>Attachments</span>
                {canEditManual ? (
                  <button type="button" style={linkButtonStyle} disabled={uploadingAttachment} onClick={() => attachmentInputRef.current?.click()}>
                    {uploadingAttachment ? "Uploading..." : "Add attachment"}
                  </button>
                ) : null}
                <input ref={attachmentInputRef} type="file" style={{ display: "none" }} onChange={(event) => void uploadAttachment(event)} />
              </div>
              {detailAttachments.length ? (
                <ul style={attendeeListStyle}>
                  {detailAttachments.map((attachment) => (
                    <li key={attachment.id}>
                      <button type="button" style={linkButtonStyle} onClick={() => void openAttachment(attachment)}>{attachment.file_name}</button>
                    </li>
                  ))}
                </ul>
              ) : <p style={detailEmptyStyle}>No attachments yet.</p>}
            </div>
            <div style={detailActionsStyle}>
              {selectedEvent.editHref ? <Link href={selectedEvent.editHref} style={linkButtonPillStyle}>Open in NOI Creator</Link> : null}
              {canEditManual ? <ImsButton onClick={() => void saveDetailEdit()} disabled={savingDetail}>{savingDetail ? "Saving..." : "Save changes"}</ImsButton> : null}
              {selectedEvent.source === "Manual" && canEditManual ? <ImsButton variant="secondary" onClick={() => openEditForm(selectedEvent)}>Edit full details</ImsButton> : null}
              {selectedEvent.source === "Manual" && canEditManual ? <ImsButton variant="danger" onClick={() => void deleteManual(selectedEvent)}>Delete</ImsButton> : null}
            </div>
          </div>
        </div>
      ) : null}

      {showForm ? (
        <div style={overlayStyle} onClick={() => setShowForm(false)}>
          <form style={formPanelStyle} onClick={(clickEvent) => clickEvent.stopPropagation()} onSubmit={submitForm}>
            <div style={detailHeaderStyle}>
              <h3 style={detailTitle}>{editingManualId ? "Edit Manual Inspection" : "New Manual Inspection"}</h3>
              <button type="button" style={closeButtonStyle} onClick={() => setShowForm(false)}>Close</button>
            </div>
            <div style={formGridStyle}>
              <label style={imsFieldStyle}>
                <span style={imsLabelStyle}>Project</span>
                <select style={imsInputStyle} value={form.projectKey} onChange={(event) => setForm((current) => ({ ...current, projectKey: event.target.value }))} required>
                  <option value="">Select project</option>
                  {knownProjects.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  <option value="__new__">+ Add new project</option>
                </select>
              </label>
              {form.projectKey === "__new__" ? (
                <label style={imsFieldStyle}>
                  <span style={imsLabelStyle}>New project name</span>
                  <input style={imsInputStyle} value={form.newProjectLabel} onChange={(event) => setForm((current) => ({ ...current, newProjectLabel: event.target.value }))} required />
                </label>
              ) : null}
              <label style={imsFieldStyle}>
                <span style={imsLabelStyle}>Title / activity</span>
                <input style={imsInputStyle} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required />
              </label>
              <label style={imsFieldStyle}>
                <span style={imsLabelStyle}>Inspection date</span>
                <input style={imsInputStyle} type="date" value={form.inspectionDate} onChange={(event) => setForm((current) => ({ ...current, inspectionDate: event.target.value }))} required />
              </label>
              <label style={imsFieldStyle}>
                <span style={imsLabelStyle}>Duration</span>
                <input style={imsInputStyle} value={form.duration} onChange={(event) => setForm((current) => ({ ...current, duration: event.target.value }))} placeholder="e.g. 09:00 / 2 hours" />
              </label>
              <label style={imsFieldStyle}>
                <span style={imsLabelStyle}>Location</span>
                <input style={imsInputStyle} value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} />
              </label>
              <label style={imsFieldStyle}>
                <span style={imsLabelStyle}>ITP reference (optional)</span>
                <select style={imsInputStyle} value={form.itpReference} onChange={(event) => setForm((current) => ({ ...current, itpReference: event.target.value }))}>
                  <option value="">No ITP reference</option>
                  {itpOptionsForForm.map((documentNumber) => <option key={documentNumber} value={documentNumber}>{documentNumber}</option>)}
                </select>
              </label>
              <label style={imsFieldStyle}>
                <span style={imsLabelStyle}>Supplier{form.itpReference ? " (from ITP)" : ""}</span>
                {form.itpReference ? (
                  <input style={{ ...imsInputStyle, opacity: 0.7 }} value={formResolvedSupplier || "No supplier on that ITP"} disabled readOnly />
                ) : (
                  <input style={imsInputStyle} value={form.supplier} onChange={(event) => setForm((current) => ({ ...current, supplier: event.target.value }))} placeholder="e.g. Parkburn" />
                )}
              </label>
              <label style={imsFieldStyle}>
                <span style={imsLabelStyle}>Witness / Hold (optional)</span>
                <input style={imsInputStyle} value={form.interventionType} onChange={(event) => setForm((current) => ({ ...current, interventionType: event.target.value }))} placeholder="W, H, or W/H" />
              </label>
              <label style={imsFieldStyle}>
                <span style={imsLabelStyle}>Status</span>
                <select style={imsInputStyle} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                  {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
              <label style={{ ...imsFieldStyle, flexDirection: "row", alignItems: "center", gap: 8, display: "flex" }}>
                <input type="checkbox" checked={form.clientVisible} onChange={(event) => setForm((current) => ({ ...current, clientVisible: event.target.checked }))} />
                <span style={imsLabelStyle}>Show to client in exports</span>
              </label>
            </div>
            <label style={imsFieldStyle}>
              <span style={imsLabelStyle}>Internal notes (not exported)</span>
              <textarea style={{ ...imsInputStyle, minHeight: 72 }} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
            </label>
            <div>
              <div style={attendeeHeaderStyle}>
                <span style={detailKicker}>Attendees</span>
                {form.attendees.length < 6 ? <button type="button" style={linkButtonStyle} onClick={() => setForm((current) => ({ ...current, attendees: [...current.attendees, blankAttendee()] }))}>Add attendee</button> : null}
              </div>
              {form.attendees.map((person, index) => {
                const selectedPersonId = people.find((candidate) => candidate.name === person.name && candidate.email === person.email)?.id || "";
                return (
                  <div key={index} style={attendeeSelectRowStyle}>
                    {person.name.trim() && !selectedPersonId ? (
                      <div style={freeTextAttendeeStyle}>
                        {person.name}{person.company ? ` · ${person.company}` : ""}
                        <span style={freeTextAttendeeHintStyle}>Not in People Management - entered via the NOI creator</span>
                      </div>
                    ) : null}
                    <select
                      style={imsInputStyle}
                      value={selectedPersonId}
                      onChange={(event) => {
                        const selected = people.find((candidate) => candidate.id === event.target.value);
                        updateFormAttendee(index, { name: selected?.name || "", email: selected?.email || "" });
                      }}
                    >
                      <option value="">{person.name.trim() && !selectedPersonId ? "Reassign to a People Management contact..." : "Select..."}</option>
                      {people.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>
            <div>
              <div style={attendeeHeaderStyle}>
                <span style={detailKicker}>Attachments</span>
                <button type="button" style={linkButtonStyle} onClick={() => formAttachmentInputRef.current?.click()}>Add attachment</button>
                <input ref={formAttachmentInputRef} type="file" style={{ display: "none" }} onChange={queueAttachment} />
              </div>
              {detailAttachments.length ? (
                <ul style={attendeeListStyle}>
                  {detailAttachments.map((attachment) => (
                    <li key={attachment.id}>
                      <button type="button" style={linkButtonStyle} onClick={() => void openAttachment(attachment)}>{attachment.file_name}</button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {pendingFiles.length ? (
                <ul style={attendeeListStyle}>
                  {pendingFiles.map((file, index) => (
                    <li key={`${file.name}-${index}`}>
                      {file.name}{" "}
                      <button type="button" style={linkButtonStyle} onClick={() => removePendingFile(index)}>Remove</button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {!detailAttachments.length && !pendingFiles.length ? <p style={detailEmptyStyle}>No attachments yet.</p> : null}
            </div>
            <div style={detailActionsStyle}>
              <ImsButton type="submit" disabled={busy}>{busy ? "Saving..." : editingManualId ? "Save changes" : "Add inspection"}</ImsButton>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={detailLabelStyle}>{label}</span>
      <div style={detailValueStyle}>{value}</div>
    </div>
  );
}

const metrics: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 16, marginBottom: "20px" };
const panelSpacingStyle: CSSProperties = { marginBottom: "20px" };

const gridScrollStyle: CSSProperties = { overflowX: "auto" };
const gridRowStyle: CSSProperties = { display: "grid", gridTemplateColumns: `180px repeat(${WEEK_COUNT}, minmax(120px,1fr))`, gap: 6, alignItems: "stretch", padding: "4px 0" };
const gridHeaderRowStyle: CSSProperties = { borderBottom: `2px solid ${imsColours.border}`, paddingBottom: 8, marginBottom: 4 };
const gridProjectHeaderCell: CSSProperties = { fontWeight: 900, color: imsColours.brand, fontSize: 12, textTransform: "uppercase", letterSpacing: ".04em" };
const gridWeekHeaderCell: CSSProperties = { fontWeight: 800, color: imsColours.muted, fontSize: 11, textAlign: "center" };
const gridProjectCell: CSSProperties = { fontWeight: 800, color: imsColours.ink, fontSize: 13, display: "flex", alignItems: "center" };
const gridWeekCell: CSSProperties = { display: "flex", flexDirection: "column", gap: 4, padding: 6, background: imsColours.page, borderRadius: 10, height: 124, overflow: "hidden", boxSizing: "border-box" };
const chipStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: 2, border: "none", borderRadius: 8, padding: "5px 7px", textAlign: "left", cursor: "pointer", boxSizing: "border-box" };
const chipMetaStyle: CSSProperties = { fontSize: 9.5, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".03em", opacity: 0.85 };
const chipTitleStyle: CSSProperties = { fontSize: 12, fontWeight: 700, lineHeight: 1.25, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" };
const moreChipStyle: CSSProperties = { border: "none", background: "transparent", color: imsColours.brand, fontSize: 11, fontWeight: 800, cursor: "pointer", textAlign: "left", padding: 0 };
const emptyCellStyle: CSSProperties = { color: imsColours.muted, fontSize: 11, textAlign: "center", padding: "8px 0" };

const registerTableStyle: CSSProperties = { ...imsTableStyle, minWidth: 0, tableLayout: "fixed" };
const projectColumnStyle: CSSProperties = { width: "10%" };
const dateColumnStyle: CSSProperties = { width: "8%" };
const referenceColumnStyle: CSSProperties = { width: "8%" };
const activityColumnStyle: CSSProperties = { width: "22%" };
const itpRefColumnStyle: CSSProperties = { width: "8%" };
const supplierColumnStyle: CSSProperties = { width: "9%" };
const typeColumnStyle: CSSProperties = { width: "5%", overflow: "hidden" };
const attendeesColumnStyle: CSSProperties = { width: "8%" };
const statusColumnStyle: CSSProperties = { width: "8%", overflow: "hidden" };
const sourceColumnStyle: CSSProperties = { width: "6%", overflow: "hidden" };
const actionColumnStyle: CSSProperties = { width: "8%", overflow: "hidden" };
const truncatedCellTextStyle: CSSProperties = { display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };

const linkButtonStyle: CSSProperties = { border: "none", background: "transparent", color: imsColours.brand, fontWeight: 800, cursor: "pointer", padding: 0, fontSize: 12 };
const linkButtonPillStyle: CSSProperties = { textDecoration: "none", color: imsColours.brand, fontWeight: 800, fontSize: 13, border: `1px solid ${imsColours.border}`, borderRadius: 10, padding: "9px 14px", display: "inline-flex", alignItems: "center" };

const overlayStyle: CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto", zIndex: 1000 };
const detailPanelStyle: CSSProperties = { background: "#fff", borderRadius: 18, padding: 22, maxWidth: 640, width: "100%", display: "grid", gap: 16, boxShadow: "0 24px 44px rgba(0,0,0,.25)" };
const formPanelStyle: CSSProperties = { background: "#fff", borderRadius: 18, padding: 22, maxWidth: 720, width: "100%", display: "grid", gap: 16, boxShadow: "0 24px 44px rgba(0,0,0,.25)" };
const detailHeaderStyle: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 };
const detailKicker: CSSProperties = { color: imsColours.brand, fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".08em" };
const detailTitle: CSSProperties = { margin: "4px 0 0", color: imsColours.ink, fontSize: 19 };
const closeButtonStyle: CSSProperties = { border: `1px solid ${imsColours.border}`, background: "#fff", borderRadius: 10, padding: "6px 12px", fontWeight: 800, cursor: "pointer" };
const detailGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 };
const editableSectionStyle: CSSProperties = { background: imsColours.page, border: `1px solid ${imsColours.border}`, borderRadius: 14, padding: 14, display: "grid", gap: 10 };
const editableGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 };
const detailLabelStyle: CSSProperties = { color: imsColours.muted, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em" };
const detailValueStyle: CSSProperties = { color: imsColours.ink, fontSize: 14, fontWeight: 700 };
const detailEmptyStyle: CSSProperties = { color: imsColours.muted, fontSize: 13, margin: "4px 0 0" };
const attendeeListStyle: CSSProperties = { margin: "6px 0 0", paddingLeft: 18, color: imsColours.ink, fontSize: 13, lineHeight: 1.7 };
const freeTextAttendeeStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: 2, color: imsColours.ink, fontSize: 13, fontWeight: 700, marginBottom: 4 };
const freeTextAttendeeHintStyle: CSSProperties = { color: imsColours.muted, fontSize: 11, fontWeight: 600 };
const detailActionsStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" };
const formGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 };
const attendeeHeaderStyle: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 };
const attendeeSelectRowStyle: CSSProperties = { marginBottom: 8 };

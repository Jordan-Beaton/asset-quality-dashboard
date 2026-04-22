"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { supabase } from "../../src/lib/supabase";

export const dynamic = "force-dynamic";

type Ncr = {
  id: string;
  ncr_number: string | null;
  title: string | null;
  description: string | null;
  severity: string | null;
  status: string | null;
  owner: string | null;
  area: string | null;
  due_date: string | null;
  created_at: string | null;
  project: string | null;
  source_type: string | null;
};

type Capa = {
  id: string;
  capa_number: string | null;
  title: string | null;
  description: string | null;
  status: string | null;
  owner: string | null;
  due_date: string | null;
  created_at: string | null;
  linked_to: string | null;
  project: string | null;
};

type EvidenceFile = {
  id: string;
  record_type: "NCR" | "CAPA" | "ACTION";
  record_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  content_type: string | null;
  notes: string | null;
  uploaded_at: string;
};

type LinkedOption = {
  id: string;
  label: string;
};

type CombinedRow = {
  type: "NCR" | "CAPA";
  id: string;
  number: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  owner: string;
  area: string;
  due_date: string;
  created_at: string;
  project: string;
  source_type: string;
  linked_to: string;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB");
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFileSize(bytes: number | null | undefined) {
  if (!bytes || bytes <= 0) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size >= 10 || unitIndex === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[unitIndex]}`;
}

function dueState(date: string | null | undefined) {
  if (!date) return "none";
  const today = new Date();
  const due = new Date(date);
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "overdue";
  if (diff <= 7) return "soon";
  return "ok";
}

function getStatusTone(status: string) {
  const value = (status || "").toLowerCase();
  if (value.includes("open")) return { bg: "#fee2e2", color: "#991b1b" };
  if (value.includes("progress")) return { bg: "#fef3c7", color: "#92400e" };
  if (value.includes("hold")) return { bg: "#ede9fe", color: "#5b21b6" };
  if (value.includes("closed")) return { bg: "#dcfce7", color: "#166534" };
  if (value.includes("complete")) return { bg: "#dcfce7", color: "#166534" };
  return { bg: "#e2e8f0", color: "#334155" };
}

function getSeverityTone(severity: string) {
  const value = (severity || "").toLowerCase();
  if (value.includes("high") || value.includes("major") || value.includes("critical")) {
    return { bg: "#fee2e2", color: "#991b1b" };
  }
  if (value.includes("medium")) return { bg: "#fef3c7", color: "#92400e" };
  if (value.includes("low") || value.includes("minor")) return { bg: "#dcfce7", color: "#166534" };
  return { bg: "#e2e8f0", color: "#334155" };
}

function getTypeTone(type: "NCR" | "CAPA") {
  return type === "NCR"
    ? { bg: "#dbeafe", color: "#1d4ed8", border: "#93c5fd" }
    : { bg: "#ede9fe", color: "#6d28d9", border: "#c4b5fd" };
}

function buildNextNumber(prefix: string, values: (string | null)[]) {
  const used = new Set<number>();

  values.forEach((value) => {
    if (!value) return;
    const match = value.match(/(\d+)$/);
    if (!match) return;
    used.add(Number(match[1]));
  });

  let next = 1;
  while (used.has(next)) next += 1;

  return `${prefix}-${String(next).padStart(3, "0")}`;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function unknownArrayToOptions(
  data: unknown,
  primaryKeys: string[],
  secondaryKeys: string[]
): LinkedOption[] {
  if (!Array.isArray(data)) return [];

  return (data as unknown[])
    .map((row) => {
      if (typeof row !== "object" || row === null) return null;

      const obj = row as Record<string, unknown>;
      const fallbackId = String(obj["id"] ?? "").trim();

      const primary =
        primaryKeys.map((key) => String(obj[key] ?? "").trim()).find(Boolean) || fallbackId;

      const secondary =
        secondaryKeys.map((key) => String(obj[key] ?? "").trim()).find(Boolean) || "";

      return {
        id: primary || fallbackId,
        label: secondary ? `${primary} - ${secondary}` : primary || fallbackId,
      };
    })
    .filter((item): item is LinkedOption => Boolean(item?.id));
}

async function tryLoadNcrOptions(): Promise<LinkedOption[]> {
  const attempts = [
    { table: "ncrs", columns: "id,ncr_number,title" },
    { table: "ncrs", columns: "id,ncr_number,description" },
    { table: "ncrs", columns: "id,reference,title" },
    { table: "ncrs", columns: "id,reference,description" },
    { table: "ncr_capa", columns: "id,ncr_number,title" },
    { table: "ncr_capa", columns: "id,reference,title" },
  ];

  for (const attempt of attempts) {
    const result = await supabase.from(attempt.table).select(attempt.columns).limit(500);
    if (result.error) continue;

    const mapped = unknownArrayToOptions(
      result.data as unknown,
      ["ncr_number", "reference", "id"],
      ["title", "description"]
    );

    if (mapped.length > 0) return mapped;
  }

  return [];
}

function NcrCapaPageContent() {
  const searchParams = useSearchParams();
  const linkedSearch = searchParams.get("search")?.trim() || "";
  const linkedType = searchParams.get("type")?.trim() || "All";
  const linkedStatus = searchParams.get("status")?.trim() || "All";
  const linkedSeverity = searchParams.get("severity")?.trim() || "All";
  const linkedSource = searchParams.get("source")?.trim() || "All";
  const linkedProject = searchParams.get("project")?.trim() || "All";
  const linkedOverdueOnly = searchParams.get("overdue") === "1";

  const [ncrs, setNcrs] = useState<Ncr[]>([]);
  const [capas, setCapas] = useState<Capa[]>([]);
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [activeCreateTab, setActiveCreateTab] = useState<"NCR" | "CAPA">("NCR");
  const [showCreatePanel, setShowCreatePanel] = useState(true);
  const [selectedRow, setSelectedRow] = useState<CombinedRow | null>(null);
  const [refreshStamp, setRefreshStamp] = useState<string>("");
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState(linkedSearch);
  const [typeFilter, setTypeFilter] = useState(linkedType);
  const [statusFilter, setStatusFilter] = useState(linkedStatus);
  const [severityFilter, setSeverityFilter] = useState(linkedSeverity);
  const [sourceFilter, setSourceFilter] = useState(linkedSource);
  const [projectFilter, setProjectFilter] = useState(linkedProject);
  const [showAttentionOnly, setShowAttentionOnly] = useState(false);

  const [ncrOptions, setNcrOptions] = useState<LinkedOption[]>([]);
  const [newLinkedNcrToAdd, setNewLinkedNcrToAdd] = useState("");
  const [editLinkedNcrToAdd, setEditLinkedNcrToAdd] = useState("");

  const [newNcr, setNewNcr] = useState({
    title: "",
    description: "",
    severity: "Medium",
    status: "Open",
    owner: "",
    area: "",
    due_date: "",
    project: "",
    source_type: "Internal",
  });

  const [newCapa, setNewCapa] = useState({
    title: "",
    description: "",
    status: "Open",
    owner: "",
    due_date: "",
    linked_to: "",
    project: "",
  });

  const [createNcrFiles, setCreateNcrFiles] = useState<File[]>([]);
  const [createNcrEvidenceNotes, setCreateNcrEvidenceNotes] = useState("");
  const [createCapaFiles, setCreateCapaFiles] = useState<File[]>([]);
  const [createCapaEvidenceNotes, setCreateCapaEvidenceNotes] = useState("");

  const [editRow, setEditRow] = useState<CombinedRow | null>(null);
  const [selectedEvidenceFiles, setSelectedEvidenceFiles] = useState<File[]>([]);
  const [selectedEvidenceNotes, setSelectedEvidenceNotes] = useState("");

  async function loadData() {
    setLoading(true);

    const [
      { data: ncrData, error: ncrError },
      { data: capaData, error: capaError },
      { data: evidenceData, error: evidenceError },
    ] = await Promise.all([
      supabase.from("ncrs").select("*").order("created_at", { ascending: false }),
      supabase.from("capas").select("*").order("created_at", { ascending: false }),
      supabase
        .from("evidence_files")
        .select("*")
        .in("record_type", ["NCR", "CAPA"])
        .order("uploaded_at", { ascending: false }),
    ]);

    if (ncrError) console.error("Error loading NCRs:", ncrError.message);
    if (capaError) console.error("Error loading CAPAs:", capaError.message);
    if (evidenceError) console.error("Error loading evidence:", evidenceError.message);

    setNcrs((ncrData as Ncr[]) || []);
    setCapas((capaData as Capa[]) || []);
    setEvidenceFiles((evidenceData as EvidenceFile[]) || []);
    setRefreshStamp(new Date().toLocaleString("en-GB"));
    setLoading(false);
  }

  async function loadNcrOptions() {
    const options = await tryLoadNcrOptions();
    setNcrOptions(options);
  }

  useEffect(() => {
    void loadData();
    void loadNcrOptions();
  }, []);

  useEffect(() => {
    setEditRow(selectedRow);
    setSelectedEvidenceFiles([]);
    setSelectedEvidenceNotes("");
    setEditLinkedNcrToAdd("");
  }, [selectedRow]);

  const combinedRows = useMemo<CombinedRow[]>(() => {
    const mappedNcrs: CombinedRow[] = ncrs.map((n) => ({
      type: "NCR",
      id: n.id,
      number: n.ncr_number || "NCR-???",
      title: n.title || "",
      description: n.description || "",
      severity: n.severity || "—",
      status: n.status || "Open",
      owner: n.owner || "",
      area: n.area || "",
      due_date: n.due_date || "",
      created_at: n.created_at || "",
      project: n.project || "",
      source_type: n.source_type || "Internal",
      linked_to: "",
    }));

    const mappedCapas: CombinedRow[] = capas.map((c) => ({
      type: "CAPA",
      id: c.id,
      number: c.capa_number || "CAPA-???",
      title: c.title || "",
      description: c.description || "",
      severity: "—",
      status: c.status || "Open",
      owner: c.owner || "",
      area: "",
      due_date: c.due_date || "",
      created_at: c.created_at || "",
      project: c.project || "",
      source_type: "",
      linked_to: c.linked_to || "",
    }));

    return [...mappedNcrs, ...mappedCapas].sort((a, b) => {
      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();
      return bTime - aTime;
    });
  }, [ncrs, capas]);

  useEffect(() => {
    if (!linkedSearch || combinedRows.length === 0) return;

    const value = linkedSearch.toLowerCase();
    const match = combinedRows.find(
      (row) =>
        row.number.toLowerCase() === value ||
        row.title.toLowerCase().includes(value) ||
        row.linked_to.toLowerCase().includes(value)
    );

    if (match) {
      setSelectedRow((current) => (current?.id === match.id ? current : match));
    }
  }, [linkedSearch, combinedRows]);

  const evidenceCountMap = useMemo(() => {
    const map = new Map<string, number>();
    evidenceFiles.forEach((file) => {
      const key = `${file.record_type}-${file.record_id}`;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [evidenceFiles]);

  const selectedRowEvidence = useMemo(() => {
    if (!selectedRow) return [];
    return evidenceFiles.filter(
      (file) => file.record_type === selectedRow.type && file.record_id === selectedRow.id
    );
  }, [evidenceFiles, selectedRow]);

  const projectOptions = useMemo(() => {
    const values = new Set<string>();
    combinedRows.forEach((row) => {
      if (row.project?.trim()) values.add(row.project.trim());
    });
    return ["All", ...Array.from(values).sort()];
  }, [combinedRows]);

  const filteredRows = useMemo(() => {
    return combinedRows.filter((row) => {
      const q = search.trim().toLowerCase();

      const matchesSearch =
        !q ||
        row.number.toLowerCase().includes(q) ||
        row.title.toLowerCase().includes(q) ||
        row.description.toLowerCase().includes(q) ||
        row.owner.toLowerCase().includes(q) ||
        row.project.toLowerCase().includes(q) ||
        row.linked_to.toLowerCase().includes(q);

      const matchesType = typeFilter === "All" || row.type === typeFilter;
      const matchesStatus = statusFilter === "All" || row.status === statusFilter;
      const matchesSeverity = severityFilter === "All" || row.severity === severityFilter;
      const matchesSource = sourceFilter === "All" || (row.type === "NCR" && row.source_type === sourceFilter);
      const matchesProject = projectFilter === "All" || row.project === projectFilter;
      const matchesOverdueOnly = !linkedOverdueOnly || dueState(row.due_date) === "overdue";

      const attention = dueState(row.due_date) === "overdue" || row.status === "Open";
      const matchesAttention = !showAttentionOnly || attention;

      return (
        matchesSearch &&
        matchesType &&
        matchesStatus &&
        matchesSeverity &&
        matchesSource &&
        matchesProject &&
        matchesOverdueOnly &&
        matchesAttention
      );
    });
  }, [
    combinedRows,
    search,
    typeFilter,
    statusFilter,
    severityFilter,
    sourceFilter,
    projectFilter,
    linkedOverdueOnly,
    showAttentionOnly,
  ]);

  const kpis = useMemo(() => {
    const totalNcrs = ncrs.length;
    const totalCapas = capas.length;
    const openNcrsCount = ncrs.filter((n) => (n.status || "").toLowerCase() === "open").length;
    const openCapasCount = capas.filter((c) => (c.status || "").toLowerCase() === "open").length;
    const overdue = combinedRows.filter((row) => dueState(row.due_date) === "overdue").length;
    const dueSoon = combinedRows.filter((row) => dueState(row.due_date) === "soon").length;

    return {
      totalNcrs,
      totalCapas,
      openItems: openNcrsCount + openCapasCount,
      overdue,
      dueSoon,
      evidenceCount: evidenceFiles.length,
    };
  }, [ncrs, capas, combinedRows, evidenceFiles]);

  const attentionItems = useMemo(() => {
    return combinedRows
      .filter((row) => {
        const state = dueState(row.due_date);
        return state === "overdue" || state === "soon" || row.status === "Open";
      })
      .sort((a, b) => {
        const aState = dueState(a.due_date);
        const bState = dueState(b.due_date);
        const aRank = aState === "overdue" ? 0 : aState === "soon" ? 1 : 2;
        const bRank = bState === "overdue" ? 0 : bState === "soon" ? 1 : 2;
        return aRank - bRank;
      })
      .slice(0, 6);
  }, [combinedRows]);

  const newCapaLinkedItems = useMemo(() => {
    return newCapa.linked_to
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }, [newCapa.linked_to]);

  const editCapaLinkedItems = useMemo(() => {
    if (!editRow || editRow.type !== "CAPA") return [];
    return editRow.linked_to
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }, [editRow]);

  function handleCreateNcrFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setCreateNcrFiles(Array.from(event.target.files || []));
  }

  function handleCreateCapaFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setCreateCapaFiles(Array.from(event.target.files || []));
  }

  function handleSelectedEvidenceFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setSelectedEvidenceFiles(Array.from(event.target.files || []));
  }

  async function uploadEvidenceForRecord(
    recordType: "NCR" | "CAPA",
    recordId: string,
    files: File[],
    notes: string
  ) {
    if (!files.length) return { ok: true as const };

    const metadataRows: Array<{
      record_type: "NCR" | "CAPA";
      record_id: string;
      file_name: string;
      file_path: string;
      file_size: number;
      content_type: string;
      notes: string | null;
    }> = [];

    for (const file of files) {
      const safeName = sanitizeFileName(file.name);
      const filePath = `${recordType}/${recordId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("quality-evidence")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        return { ok: false as const, message: uploadError.message };
      }

      metadataRows.push({
        record_type: recordType,
        record_id: recordId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        content_type: file.type || "application/octet-stream",
        notes: notes.trim() || null,
      });
    }

    const { error: metadataError } = await supabase.from("evidence_files").insert(metadataRows);
    if (metadataError) return { ok: false as const, message: metadataError.message };

    return { ok: true as const };
  }

  function addLinkedNcrToNewCapa() {
    if (!newLinkedNcrToAdd) return;

    setNewCapa((prev) => {
      const existing = prev.linked_to
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      if (existing.includes(newLinkedNcrToAdd)) {
        return prev;
      }

      return {
        ...prev,
        linked_to: [...existing, newLinkedNcrToAdd].join(", "),
      };
    });

    setNewLinkedNcrToAdd("");
  }

  function removeLinkedNcrFromNewCapa(reference: string) {
    setNewCapa((prev) => {
      const next = prev.linked_to
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .filter((item) => item !== reference);

      return {
        ...prev,
        linked_to: next.join(", "),
      };
    });
  }

  function addLinkedNcrToEditCapa() {
    if (!editLinkedNcrToAdd || !editRow || editRow.type !== "CAPA") return;

    const existing = editRow.linked_to
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (existing.includes(editLinkedNcrToAdd)) {
      setEditLinkedNcrToAdd("");
      return;
    }

    setEditRow({
      ...editRow,
      linked_to: [...existing, editLinkedNcrToAdd].join(", "),
    });
    setEditLinkedNcrToAdd("");
  }

  function removeLinkedNcrFromEditCapa(reference: string) {
    if (!editRow || editRow.type !== "CAPA") return;

    const next = editRow.linked_to
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((item) => item !== reference);

    setEditRow({
      ...editRow,
      linked_to: next.join(", "),
    });
  }

  async function createNcr() {
    if (!newNcr.title.trim()) {
      alert("Please enter an NCR title.");
      return;
    }

    setSaving(true);

    const nextNumber = buildNextNumber("NCR", ncrs.map((n) => n.ncr_number));

    const { data, error } = await supabase
      .from("ncrs")
      .insert([
        {
          ncr_number: nextNumber,
          title: newNcr.title.trim(),
          description: newNcr.description.trim() || null,
          severity: newNcr.severity,
          status: newNcr.status,
          owner: newNcr.owner.trim() || null,
          area: newNcr.area.trim() || null,
          due_date: newNcr.due_date || null,
          project: newNcr.project.trim() || null,
          source_type: newNcr.source_type,
        },
      ])
      .select("*")
      .single();

    if (error || !data) {
      setSaving(false);
      alert(`Error creating NCR: ${error?.message || "Unknown error"}`);
      return;
    }

    if (createNcrFiles.length > 0) {
      const uploadResult = await uploadEvidenceForRecord(
        "NCR",
        data.id,
        createNcrFiles,
        createNcrEvidenceNotes
      );

      if (!uploadResult.ok) {
        setSaving(false);
        setMessage(`NCR created, but evidence upload failed: ${uploadResult.message}`);
        await loadData();
        return;
      }
    }

    setNewNcr({
      title: "",
      description: "",
      severity: "Medium",
      status: "Open",
      owner: "",
      area: "",
      due_date: "",
      project: "",
      source_type: "Internal",
    });
    setCreateNcrFiles([]);
    setCreateNcrEvidenceNotes("");
    setSaving(false);
    setMessage(`${nextNumber} created successfully.`);
    await loadData();
    await loadNcrOptions();
  }

  async function createCapa() {
    if (!newCapa.title.trim()) {
      alert("Please enter a CAPA title.");
      return;
    }

    setSaving(true);

    const nextNumber = buildNextNumber("CAPA", capas.map((c) => c.capa_number));
    const cleanedLinkedTo = newCapa.linked_to
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .join(", ");

    const { data, error } = await supabase
      .from("capas")
      .insert([
        {
          capa_number: nextNumber,
          title: newCapa.title.trim(),
          description: newCapa.description.trim() || null,
          status: newCapa.status,
          owner: newCapa.owner.trim() || null,
          due_date: newCapa.due_date || null,
          linked_to: cleanedLinkedTo || null,
          project: newCapa.project.trim() || null,
        },
      ])
      .select("*")
      .single();

    if (error || !data) {
      setSaving(false);
      alert(`Error creating CAPA: ${error?.message || "Unknown error"}`);
      return;
    }

    if (createCapaFiles.length > 0) {
      const uploadResult = await uploadEvidenceForRecord(
        "CAPA",
        data.id,
        createCapaFiles,
        createCapaEvidenceNotes
      );

      if (!uploadResult.ok) {
        setSaving(false);
        setMessage(`CAPA created, but evidence upload failed: ${uploadResult.message}`);
        await loadData();
        return;
      }
    }

    setNewCapa({
      title: "",
      description: "",
      status: "Open",
      owner: "",
      due_date: "",
      linked_to: "",
      project: "",
    });
    setCreateCapaFiles([]);
    setCreateCapaEvidenceNotes("");
    setNewLinkedNcrToAdd("");
    setSaving(false);
    setMessage(`${nextNumber} created successfully.`);
    await loadData();
  }

  async function saveEdit() {
    if (!editRow) return;

    setSaving(true);

    if (editRow.type === "NCR") {
      const { error } = await supabase
        .from("ncrs")
        .update({
          title: editRow.title || null,
          description: editRow.description || null,
          severity: editRow.severity || null,
          status: editRow.status || null,
          owner: editRow.owner || null,
          area: editRow.area || null,
          due_date: editRow.due_date || null,
          project: editRow.project || null,
          source_type: editRow.source_type || "Internal",
        })
        .eq("id", editRow.id);

      if (error) {
        setSaving(false);
        alert(`Error saving NCR: ${error.message}`);
        return;
      }
    } else {
      const cleanedLinkedTo = editRow.linked_to
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .join(", ");

      const { error } = await supabase
        .from("capas")
        .update({
          title: editRow.title || null,
          description: editRow.description || null,
          status: editRow.status || null,
          owner: editRow.owner || null,
          due_date: editRow.due_date || null,
          linked_to: cleanedLinkedTo || null,
          project: editRow.project || null,
        })
        .eq("id", editRow.id);

      if (error) {
        setSaving(false);
        alert(`Error saving CAPA: ${error.message}`);
        return;
      }
    }

    setSaving(false);
    setMessage(`${editRow.number} updated successfully.`);
    await loadData();
    await loadNcrOptions();
  }

  async function deleteSelected() {
    if (!selectedRow) return;

    const confirmed = window.confirm(
      `Delete ${selectedRow.number}? This does not automatically delete evidence files.`
    );
    if (!confirmed) return;

    setSaving(true);

    const table = selectedRow.type === "NCR" ? "ncrs" : "capas";
    const { error } = await supabase.from(table).delete().eq("id", selectedRow.id);

    setSaving(false);

    if (error) {
      alert(`Error deleting record: ${error.message}`);
      return;
    }

    setSelectedRow(null);
    setEditRow(null);
    setMessage("Record deleted successfully.");
    await loadData();
    await loadNcrOptions();
  }

  async function uploadEvidenceToSelected() {
    if (!selectedRow) {
      setMessage("Select a record first.");
      return;
    }

    if (!selectedEvidenceFiles.length) {
      setMessage("Select at least one evidence file to upload.");
      return;
    }

    setUploadingEvidence(true);

    const uploadResult = await uploadEvidenceForRecord(
      selectedRow.type,
      selectedRow.id,
      selectedEvidenceFiles,
      selectedEvidenceNotes
    );

    setUploadingEvidence(false);

    if (!uploadResult.ok) {
      setMessage(`Evidence upload failed: ${uploadResult.message}`);
      return;
    }

    setSelectedEvidenceFiles([]);
    setSelectedEvidenceNotes("");
    setMessage("Evidence uploaded successfully.");
    await loadData();
  }

  async function openEvidence(file: EvidenceFile) {
    const { data, error } = await supabase.storage
      .from("quality-evidence")
      .createSignedUrl(file.file_path, 300);

    if (error || !data?.signedUrl) {
      setMessage(`Could not open file: ${error?.message || "Unknown error"}`);
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function deleteEvidence(file: EvidenceFile) {
    const confirmed = window.confirm(`Delete evidence file "${file.file_name}"?`);
    if (!confirmed) return;

    const { error: storageError } = await supabase.storage
      .from("quality-evidence")
      .remove([file.file_path]);

    if (storageError) {
      setMessage(`File delete failed: ${storageError.message}`);
      return;
    }

    const { error: metadataError } = await supabase
      .from("evidence_files")
      .delete()
      .eq("id", file.id);

    if (metadataError) {
      setMessage(`Evidence record delete failed: ${metadataError.message}`);
      return;
    }

    setMessage("Evidence deleted successfully.");
    await loadData();
  }

  const statusOptions = ["Open", "In Progress", "On Hold", "Closed"];
  const severityOptions = ["Low", "Medium", "High"];
  const sourceOptions = ["Internal", "Supplier", "External"];

  return (
    <main>
      <section style={heroStyle}>
        <div style={{ flex: "1 1 680px" }}>
          <div style={eyebrowStyle}>Quality Command Centre</div>
          <h1 style={heroTitleStyle}>NCR / CAPA Register</h1>
          <p style={heroSubtitleStyle}>
            Joined-up working register for non-conformances and corrective actions, with evidence
            attached directly to each NCR or CAPA.
          </p>

          <div style={heroPillGridStyle}>
            <HeroPill label="Open Items" value={kpis.openItems} tone="amber" />
            <HeroPill label="Overdue" value={kpis.overdue} tone="red" />
            <HeroPill label="Due in 7 Days" value={kpis.dueSoon} tone="green" />
            <HeroPill label="Evidence Files" value={kpis.evidenceCount} tone="blue" />
          </div>
        </div>

        <div style={heroMetaWrapStyle}>
          <HeroMetaCard label="NCRs" value={kpis.totalNcrs} />
          <HeroMetaCard label="CAPAs" value={kpis.totalCapas} />
          <HeroMetaCard label="Selected Record" value={selectedRow?.number || "None"} compact />
          <HeroMetaCard label="Last Refreshed" value={refreshStamp || "-"} compact />
        </div>
      </section>

      <div style={topMetaRowStyle}>
        <Link href="/" style={backLinkStyle}>
          ← Back to Dashboard
        </Link>

        <div style={topMetaActionsStyle}>
          <button type="button" style={secondaryButton} onClick={() => setShowCreatePanel((prev) => !prev)}>
            {showCreatePanel ? "Hide create panel" : "Show create panel"}
          </button>
          <button type="button" style={secondaryButton} onClick={() => void loadData()}>
            Refresh
          </button>
          <div style={statusBannerStyle}>
            <strong>Status:</strong> {message || "Ready"}
          </div>
        </div>
      </div>

      <section style={statsGridStyle}>
        <StatCard title="Open Items" value={kpis.openItems} accent="#f59e0b" />
        <StatCard title="Overdue" value={kpis.overdue} accent="#ef4444" />
        <StatCard title="Due in 7 Days" value={kpis.dueSoon} accent="#22c55e" />
        <StatCard title="NCRs" value={kpis.totalNcrs} accent="#60a5fa" />
        <StatCard title="CAPAs" value={kpis.totalCapas} accent="#c084fc" />
        <StatCard title="Evidence Files" value={kpis.evidenceCount} accent="#f472b6" />
      </section>

      <section style={topGridStyle}>
        <SectionCard title="Attention Board" subtitle="Items needing eyes on first.">
          {attentionItems.length === 0 ? (
            <div style={emptyBoardStyle}>No immediate attention items.</div>
          ) : (
            <div style={attentionGridStyle}>
              {attentionItems.map((item) => {
                const state = dueState(item.due_date);
                const typeTone = getTypeTone(item.type);
                const evidenceCount = evidenceCountMap.get(`${item.type}-${item.id}`) || 0;
                const isActive = selectedRow?.id === item.id && selectedRow?.type === item.type;

                return (
                  <button
                    key={`${item.type}-${item.id}`}
                    type="button"
                    onClick={() => setSelectedRow(item)}
                    style={{
                      ...attentionCardStyle,
                      border: state === "overdue" ? "1px solid #fca5a5" : state === "soon" ? "1px solid #fcd34d" : "1px solid #dbe3ec",
                      background:
                        state === "overdue"
                          ? "#fff1f2"
                          : state === "soon"
                          ? "#fff7ed"
                          : isActive
                          ? "#eff6ff"
                          : "#ffffff",
                    }}
                  >
                    <div style={attentionHeaderStyle}>
                      <span
                        style={{
                          ...miniTagStyle,
                          background: typeTone.bg,
                          color: typeTone.color,
                          border: `1px solid ${typeTone.border}`,
                        }}
                      >
                        {item.type}
                      </span>

                      <span style={{ ...miniTagStyle, background: "#ede9fe", color: "#6d28d9" }}>
                        {evidenceCount} file{evidenceCount === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div style={attentionNumberStyle}>{item.number}</div>
                    <div style={attentionTitleStyle}>{item.title || "Untitled"}</div>
                    <div style={attentionMetaRowStyle}>
                      <span>{item.project ? `Project: ${item.project}` : "No project"}</span>
                    </div>
                    <div style={attentionMetaFooterStyle}>
                      <span>{item.owner || "No owner"}</span>
                      <span>{formatDate(item.due_date)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </SectionCard>

        {showCreatePanel && (
          <SectionCard title="Add Quality Record" subtitle="Create a new NCR or CAPA.">
            <div style={createTabWrapStyle}>
              <button
                type="button"
                onClick={() => setActiveCreateTab("NCR")}
                style={{
                  ...createTabButtonStyle,
                  background: activeCreateTab === "NCR" ? "#2563eb" : "transparent",
                  color: activeCreateTab === "NCR" ? "#ffffff" : "#1e3a8a",
                }}
              >
                New NCR
              </button>
              <button
                type="button"
                onClick={() => setActiveCreateTab("CAPA")}
                style={{
                  ...createTabButtonStyle,
                  background: activeCreateTab === "CAPA" ? "#7c3aed" : "transparent",
                  color: activeCreateTab === "CAPA" ? "#ffffff" : "#5b21b6",
                }}
              >
                New CAPA
              </button>
            </div>

            {activeCreateTab === "NCR" ? (
              <div style={createPanelNcrStyle}>
                <div style={detailFormGridStyle}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Title</label>
                    <input
                      style={inputStyle}
                      value={newNcr.title}
                      onChange={(e) => setNewNcr({ ...newNcr, title: e.target.value })}
                      placeholder="e.g. Weld record incomplete"
                    />
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Description</label>
                    <textarea
                      style={textareaStyle}
                      value={newNcr.description}
                      onChange={(e) => setNewNcr({ ...newNcr, description: e.target.value })}
                      placeholder="Add details, evidence, impact, or context"
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Project</label>
                    <input
                      style={inputStyle}
                      value={newNcr.project}
                      onChange={(e) => setNewNcr({ ...newNcr, project: e.target.value })}
                      placeholder="Project name"
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Owner</label>
                    <input
                      style={inputStyle}
                      value={newNcr.owner}
                      onChange={(e) => setNewNcr({ ...newNcr, owner: e.target.value })}
                      placeholder="Owner"
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Severity</label>
                    <select
                      style={inputStyle}
                      value={newNcr.severity}
                      onChange={(e) => setNewNcr({ ...newNcr, severity: e.target.value })}
                    >
                      {severityOptions.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Status</label>
                    <select
                      style={inputStyle}
                      value={newNcr.status}
                      onChange={(e) => setNewNcr({ ...newNcr, status: e.target.value })}
                    >
                      {statusOptions.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Source Type</label>
                    <select
                      style={inputStyle}
                      value={newNcr.source_type}
                      onChange={(e) => setNewNcr({ ...newNcr, source_type: e.target.value })}
                    >
                      {sourceOptions.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Area</label>
                    <input
                      style={inputStyle}
                      value={newNcr.area}
                      onChange={(e) => setNewNcr({ ...newNcr, area: e.target.value })}
                      placeholder="Area / department"
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Due Date</label>
                    <input
                      type="date"
                      style={inputStyle}
                      value={newNcr.due_date}
                      onChange={(e) => setNewNcr({ ...newNcr, due_date: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Evidence Files (optional)</label>
                    <input type="file" multiple style={inputStyle} onChange={handleCreateNcrFileChange} />
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Evidence Notes (optional)</label>
                    <textarea
                      style={textareaStyle}
                      value={createNcrEvidenceNotes}
                      onChange={(e) => setCreateNcrEvidenceNotes(e.target.value)}
                      placeholder="Add a note for the uploaded evidence"
                    />
                  </div>
                </div>

                <SelectedFilesList files={createNcrFiles} />

                <div style={buttonRowStyle}>
                  <button type="button" style={primaryButton} onClick={() => void createNcr()} disabled={saving}>
                    {saving ? "Saving..." : "Create NCR"}
                  </button>
                  <button
                    type="button"
                    style={secondaryButton}
                    onClick={() => {
                      setNewNcr({
                        title: "",
                        description: "",
                        severity: "Medium",
                        status: "Open",
                        owner: "",
                        area: "",
                        due_date: "",
                        project: "",
                        source_type: "Internal",
                      });
                      setCreateNcrFiles([]);
                      setCreateNcrEvidenceNotes("");
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            ) : (
              <div style={createPanelCapaStyle}>
                <div style={detailFormGridStyle}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Title</label>
                    <input
                      style={inputStyle}
                      value={newCapa.title}
                      onChange={(e) => setNewCapa({ ...newCapa, title: e.target.value })}
                      placeholder="e.g. Update inspection sign-off workflow"
                    />
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Description</label>
                    <textarea
                      style={textareaStyle}
                      value={newCapa.description}
                      onChange={(e) => setNewCapa({ ...newCapa, description: e.target.value })}
                      placeholder="Add corrective / preventive action details"
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Project</label>
                    <input
                      style={inputStyle}
                      value={newCapa.project}
                      onChange={(e) => setNewCapa({ ...newCapa, project: e.target.value })}
                      placeholder="Project name"
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Owner</label>
                    <input
                      style={inputStyle}
                      value={newCapa.owner}
                      onChange={(e) => setNewCapa({ ...newCapa, owner: e.target.value })}
                      placeholder="Owner"
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Status</label>
                    <select
                      style={inputStyle}
                      value={newCapa.status}
                      onChange={(e) => setNewCapa({ ...newCapa, status: e.target.value })}
                    >
                      {statusOptions.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Due Date</label>
                    <input
                      type="date"
                      style={inputStyle}
                      value={newCapa.due_date}
                      onChange={(e) => setNewCapa({ ...newCapa, due_date: e.target.value })}
                    />
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Add Linked NCR</label>
                    <div style={pickerRowStyle}>
                      <select
                        style={inputStyle}
                        value={newLinkedNcrToAdd}
                        onChange={(e) => setNewLinkedNcrToAdd(e.target.value)}
                      >
                        <option value="">Select NCR</option>
                        {ncrOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <button type="button" style={secondaryButton} onClick={addLinkedNcrToNewCapa}>
                        + Add
                      </button>
                    </div>
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Linked NCRs</label>
                    <div style={linkWrapStyle}>
                      {newCapaLinkedItems.length === 0 ? (
                        <span style={mutedTextStyle}>None linked</span>
                      ) : (
                        newCapaLinkedItems.map((item) => (
                          <span key={item} style={editablePillWrapStyle}>
                            <Link href={`/ncr-capa?search=${encodeURIComponent(item)}`} style={linkPillStyle}>
                              {item}
                            </Link>
                            <button
                              type="button"
                              style={pillRemoveButtonStyle}
                              onClick={() => removeLinkedNcrFromNewCapa(item)}
                            >
                              ×
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Evidence Files (optional)</label>
                    <input type="file" multiple style={inputStyle} onChange={handleCreateCapaFileChange} />
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Evidence Notes (optional)</label>
                    <textarea
                      style={textareaStyle}
                      value={createCapaEvidenceNotes}
                      onChange={(e) => setCreateCapaEvidenceNotes(e.target.value)}
                      placeholder="Add a note for the uploaded evidence"
                    />
                  </div>
                </div>

                <SelectedFilesList files={createCapaFiles} />

                <div style={buttonRowStyle}>
                  <button
                    type="button"
                    style={{ ...primaryButton, background: "#7c3aed" }}
                    onClick={() => void createCapa()}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Create CAPA"}
                  </button>
                  <button
                    type="button"
                    style={secondaryButton}
                    onClick={() => {
                      setNewCapa({
                        title: "",
                        description: "",
                        status: "Open",
                        owner: "",
                        due_date: "",
                        linked_to: "",
                        project: "",
                      });
                      setCreateCapaFiles([]);
                      setCreateCapaEvidenceNotes("");
                      setNewLinkedNcrToAdd("");
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </SectionCard>
        )}
      </section>

      <section style={workspaceGridStyle}>
        <SectionCard title="Combined Working Register" subtitle="Search, filter and select any NCR or CAPA.">
          <div style={toolbarStyle}>
            <input
              style={toolbarSearchStyle}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search number, title, owner, project, linked NCR..."
            />

            <div style={toolbarFiltersStyle}>
              <select style={toolbarSelectStyle} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option>All</option>
                <option>NCR</option>
                <option>CAPA</option>
              </select>

              <select style={toolbarSelectStyle} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option>All</option>
                {statusOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>

              <select style={toolbarSelectStyle} value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
                <option>All</option>
                {severityOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>

              <select style={toolbarSelectStyle} value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
                <option>All</option>
                {sourceOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>

              <select style={toolbarSelectStyle} value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
                {projectOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>

              <button
                type="button"
                style={{
                  ...secondaryButton,
                  background: showAttentionOnly ? "#0f172a" : "#ffffff",
                  color: showAttentionOnly ? "#ffffff" : "#0f172a",
                }}
                onClick={() => setShowAttentionOnly((prev) => !prev)}
              >
                {showAttentionOnly ? "Attention only" : "Focus attention"}
              </button>
            </div>
          </div>

          <div style={tableInfoRowStyle}>
            Showing <strong>{filteredRows.length}</strong> of <strong>{combinedRows.length}</strong> records
          </div>

          {loading ? (
            <div style={emptyBoardStyle}>Loading NCR / CAPA records...</div>
          ) : filteredRows.length === 0 ? (
            <div style={emptyBoardStyle}>No matching records found.</div>
          ) : (
            <div style={registerTableWrapStyle}>
              <div style={registerHeadStyle}>
                <div>Record</div>
                <div>Status</div>
                <div>Priority</div>
                <div>Owner</div>
                <div>Project</div>
                <div>Due</div>
                <div>Files</div>
              </div>

              <div style={registerBodyStyle}>
                {filteredRows.map((row) => {
                  const typeTone = getTypeTone(row.type);
                  const statusTone = getStatusTone(row.status);
                  const severityTone = getSeverityTone(row.severity);
                  const dueTone = dueState(row.due_date);
                  const active = selectedRow?.id === row.id && selectedRow?.type === row.type;
                  const evidenceCount = evidenceCountMap.get(`${row.type}-${row.id}`) || 0;

                  return (
                    <button
                      key={`${row.type}-${row.id}`}
                      type="button"
                      onClick={() => setSelectedRow(row)}
                      style={{
                        ...registerRowStyle,
                        background: active ? "#eff6ff" : "#ffffff",
                        borderLeft: active ? "4px solid #0f766e" : "4px solid transparent",
                      }}
                    >
                      <div>
                        <div style={registerRecordTagRowStyle}>
                          <span
                            style={{
                              ...registerTagStyle,
                              background: typeTone.bg,
                              color: typeTone.color,
                              border: `1px solid ${typeTone.border}`,
                            }}
                          >
                            {row.type}
                          </span>
                          <span style={registerRecordNumberStyle}>{row.number}</span>
                        </div>
                        <div style={registerTitleStyle}>{row.title || "Untitled"}</div>
                        <div style={registerDescriptionStyle}>{row.description || "No description"}</div>
                        <div style={registerMetaStyle}>
                          {row.type === "NCR" && <span>Source: {row.source_type || "Internal"}</span>}
                          {row.type === "NCR" && row.area && <span>Area: {row.area}</span>}
                          {row.type === "CAPA" && row.linked_to && <span>Linked to: {row.linked_to}</span>}
                          <span>Created: {formatDate(row.created_at)}</span>
                        </div>
                      </div>

                      <div>
                        <span
                          style={{
                            ...badgeStyle,
                            background: statusTone.bg,
                            color: statusTone.color,
                          }}
                        >
                          {row.status}
                        </span>
                      </div>

                      <div>
                        {row.type === "NCR" ? (
                          <span
                            style={{
                              ...badgeStyle,
                              background: severityTone.bg,
                              color: severityTone.color,
                            }}
                          >
                            {row.severity}
                          </span>
                        ) : (
                          <span style={mutedTextStyle}>—</span>
                        )}
                      </div>

                      <div style={registerSimpleTextStyle}>{row.owner || "—"}</div>
                      <div style={registerSimpleTextStyle}>{row.project || "—"}</div>

                      <div
                        style={{
                          ...registerSimpleTextStyle,
                          color:
                            dueTone === "overdue"
                              ? "#b91c1c"
                              : dueTone === "soon"
                              ? "#a16207"
                              : "#0f172a",
                        }}
                      >
                        {formatDate(row.due_date)}
                      </div>

                      <div>
                        <span style={fileCountBadgeStyle}>{evidenceCount}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </SectionCard>

        <div style={sidePanelStackStyle}>
          <SectionCard title="Edit Panel" subtitle="Review and update the selected record.">
            {!selectedRow || !editRow ? (
              <div style={emptyBoardStyle}>Select a record from the register to edit it here.</div>
            ) : (
              <div>
                <div style={editHeaderStyle}>
                  <div>
                    <div style={detailRecordNumberStyle}>{editRow.number}</div>
                    <h3 style={detailRecordTitleStyle}>{editRow.title || "Untitled"}</h3>
                  </div>
                  <span
                    style={{
                      ...registerTagStyle,
                      background: getTypeTone(editRow.type).bg,
                      color: getTypeTone(editRow.type).color,
                      border: `1px solid ${getTypeTone(editRow.type).border}`,
                    }}
                  >
                    {editRow.type}
                  </span>
                </div>

                <div style={detailFormGridStyle}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Title</label>
                    <input
                      style={inputStyle}
                      value={editRow.title}
                      onChange={(e) => setEditRow({ ...editRow, title: e.target.value })}
                    />
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Description</label>
                    <textarea
                      style={textareaStyle}
                      value={editRow.description}
                      onChange={(e) => setEditRow({ ...editRow, description: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Status</label>
                    <select
                      style={inputStyle}
                      value={editRow.status}
                      onChange={(e) => setEditRow({ ...editRow, status: e.target.value })}
                    >
                      {statusOptions.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Owner</label>
                    <input
                      style={inputStyle}
                      value={editRow.owner}
                      onChange={(e) => setEditRow({ ...editRow, owner: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Project</label>
                    <input
                      style={inputStyle}
                      value={editRow.project}
                      onChange={(e) => setEditRow({ ...editRow, project: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Due Date</label>
                    <input
                      type="date"
                      style={inputStyle}
                      value={editRow.due_date ? editRow.due_date.slice(0, 10) : ""}
                      onChange={(e) => setEditRow({ ...editRow, due_date: e.target.value })}
                    />
                  </div>

                  {editRow.type === "NCR" && (
                    <>
                      <div>
                        <label style={labelStyle}>Severity</label>
                        <select
                          style={inputStyle}
                          value={editRow.severity}
                          onChange={(e) => setEditRow({ ...editRow, severity: e.target.value })}
                        >
                          {severityOptions.map((option) => (
                            <option key={option}>{option}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={labelStyle}>Source Type</label>
                        <select
                          style={inputStyle}
                          value={editRow.source_type}
                          onChange={(e) => setEditRow({ ...editRow, source_type: e.target.value })}
                        >
                          {sourceOptions.map((option) => (
                            <option key={option}>{option}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ gridColumn: "1 / -1" }}>
                        <label style={labelStyle}>Area</label>
                        <input
                          style={inputStyle}
                          value={editRow.area}
                          onChange={(e) => setEditRow({ ...editRow, area: e.target.value })}
                        />
                      </div>
                    </>
                  )}

                  {editRow.type === "CAPA" && (
                    <>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <label style={labelStyle}>Add Linked NCR</label>
                        <div style={pickerRowStyle}>
                          <select
                            style={inputStyle}
                            value={editLinkedNcrToAdd}
                            onChange={(e) => setEditLinkedNcrToAdd(e.target.value)}
                          >
                            <option value="">Select NCR</option>
                            {ncrOptions.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <button type="button" style={secondaryButton} onClick={addLinkedNcrToEditCapa}>
                            + Add
                          </button>
                        </div>
                      </div>

                      <div style={{ gridColumn: "1 / -1" }}>
                        <label style={labelStyle}>Linked NCRs</label>
                        <div style={linkWrapStyle}>
                          {editCapaLinkedItems.length === 0 ? (
                            <span style={mutedTextStyle}>None linked</span>
                          ) : (
                            editCapaLinkedItems.map((item) => (
                              <span key={item} style={editablePillWrapStyle}>
                                <Link href={`/ncr-capa?search=${encodeURIComponent(item)}`} style={linkPillStyle}>
                                  {item}
                                </Link>
                                <button
                                  type="button"
                                  style={pillRemoveButtonStyle}
                                  onClick={() => removeLinkedNcrFromEditCapa(item)}
                                >
                                  ×
                                </button>
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div style={buttonRowStyle}>
                  <button type="button" style={primaryButton} onClick={() => void saveEdit()} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    style={secondaryButton}
                    onClick={() => {
                      setSelectedRow(null);
                      setEditRow(null);
                    }}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    style={{
                      ...secondaryButton,
                      border: "1px solid #fecaca",
                      color: "#b91c1c",
                      background: "#fff5f5",
                    }}
                    onClick={() => void deleteSelected()}
                    disabled={saving}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Evidence Manager" subtitle="Upload, preview or remove evidence for the selected record.">
            {!selectedRow ? (
              <div style={emptyBoardStyle}>Select a record to manage evidence.</div>
            ) : (
              <div>
                <div style={editHeaderStyle}>
                  <div>
                    <div style={detailRecordNumberStyle}>{selectedRow.number}</div>
                    <h3 style={detailRecordTitleStyle}>{selectedRow.title || "Untitled"}</h3>
                  </div>
                  <span
                    style={{
                      ...registerTagStyle,
                      background: getTypeTone(selectedRow.type).bg,
                      color: getTypeTone(selectedRow.type).color,
                      border: `1px solid ${getTypeTone(selectedRow.type).border}`,
                    }}
                  >
                    {selectedRow.type}
                  </span>
                </div>

                <div style={detailFormGridStyle}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Select Files</label>
                    <input type="file" multiple style={inputStyle} onChange={handleSelectedEvidenceFileChange} />
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Evidence Notes (optional)</label>
                    <textarea
                      style={textareaStyle}
                      value={selectedEvidenceNotes}
                      onChange={(e) => setSelectedEvidenceNotes(e.target.value)}
                      placeholder="Add a note for the uploaded evidence"
                    />
                  </div>
                </div>

                <SelectedFilesList files={selectedEvidenceFiles} />

                <div style={buttonRowStyle}>
                  <button
                    type="button"
                    style={{ ...primaryButton, background: "#7c3aed" }}
                    onClick={() => void uploadEvidenceToSelected()}
                    disabled={uploadingEvidence}
                  >
                    {uploadingEvidence ? "Uploading..." : "Upload Evidence"}
                  </button>
                </div>

                <div style={evidenceListStyle}>
                  {selectedRowEvidence.length === 0 ? (
                    <div style={emptyBoardStyle}>No evidence attached yet.</div>
                  ) : (
                    selectedRowEvidence.map((file) => (
                      <div key={file.id} style={evidenceItemStyle}>
                        <div style={{ minWidth: 0 }}>
                          <div style={evidenceFileNameStyle}>{file.file_name}</div>
                          <div style={evidenceMetaTextStyle}>
                            {formatFileSize(file.file_size)} · {file.content_type || "Unknown type"} · Uploaded{" "}
                            {formatDateTime(file.uploaded_at)}
                          </div>
                          {file.notes ? <div style={evidenceNoteStyle}>Note: {file.notes}</div> : null}
                        </div>

                        <div style={actionButtonsWrapStyle}>
                          <button type="button" style={secondaryButtonSmall} onClick={() => void openEvidence(file)}>
                            Open
                          </button>
                          <button
                            type="button"
                            style={{
                              ...secondaryButtonSmall,
                              border: "1px solid #fecaca",
                              color: "#b91c1c",
                              background: "#fff5f5",
                            }}
                            onClick={() => void deleteEvidence(file)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      </section>
    </main>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section style={panelStyle}>
      <div style={sectionHeaderStyle}>
        <h2 style={sectionTitleStyle}>{title}</h2>
        {subtitle ? <p style={sectionSubtitleStyle}>{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function HeroPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "amber" | "red" | "blue";
}) {
  const tones = {
    green: { bg: "rgba(220,252,231,0.15)", border: "rgba(220,252,231,0.26)", text: "#dcfce7" },
    amber: { bg: "rgba(254,243,199,0.15)", border: "rgba(254,243,199,0.28)", text: "#fef3c7" },
    red: { bg: "rgba(254,226,226,0.15)", border: "rgba(254,226,226,0.28)", text: "#fee2e2" },
    blue: { bg: "rgba(219,234,254,0.15)", border: "rgba(219,234,254,0.28)", text: "#dbeafe" },
  };

  const colours = tones[tone];

  return (
    <div style={{ ...heroPillStyle, background: colours.bg, border: `1px solid ${colours.border}` }}>
      <div style={heroPillLabelStyle}>{label}</div>
      <div style={{ ...heroPillValueStyle, color: colours.text }}>{value}</div>
    </div>
  );
}

function HeroMetaCard({
  label,
  value,
  compact,
}: {
  label: string;
  value: string | number;
  compact?: boolean;
}) {
  return (
    <div style={heroMetaCardStyle}>
      <div style={heroMetaLabelStyle}>{label}</div>
      <div style={compact ? heroMetaCompactValueStyle : heroMetaValueStyle}>{value}</div>
    </div>
  );
}

function StatCard({
  title,
  value,
  accent,
}: {
  title: string;
  value: number;
  accent: string;
}) {
  return (
    <div style={{ ...statCardStyle, borderTop: `4px solid ${accent}` }}>
      <div style={statCardLabelStyle}>{title}</div>
      <div style={statCardValueStyle}>{value}</div>
    </div>
  );
}

function SelectedFilesList({ files }: { files: File[] }) {
  if (files.length === 0) {
    return <div style={{ marginTop: 12, fontSize: 13, color: "#64748b" }}>No files selected.</div>;
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
      {files.map((file, index) => (
        <div
          key={`${file.name}-${index}`}
          style={{
            display: "inline-flex",
            gap: 8,
            alignItems: "center",
            padding: "8px 10px",
            borderRadius: 999,
            background: "#eef2ff",
            color: "#3730a3",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <span>{file.name}</span>
          <span style={{ opacity: 0.8 }}>{formatFileSize(file.size)}</span>
        </div>
      ))}
    </div>
  );
}

const heroStyle: CSSProperties = {
  background: "linear-gradient(135deg, #0f766e 0%, #115e59 100%)",
  color: "white",
  borderRadius: "20px",
  padding: "28px 30px",
  marginBottom: "24px",
  boxShadow: "0 10px 30px rgba(15, 118, 110, 0.14)",
  display: "flex",
  justifyContent: "space-between",
  gap: "24px",
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const eyebrowStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  opacity: 0.82,
  marginBottom: "10px",
};

const heroTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "34px",
  lineHeight: 1.08,
};

const heroSubtitleStyle: CSSProperties = {
  marginTop: "10px",
  marginBottom: 0,
  fontSize: "16px",
  maxWidth: "760px",
  color: "rgba(255,255,255,0.92)",
};

const heroPillGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "12px",
  marginTop: "18px",
};

const heroPillStyle: CSSProperties = {
  borderRadius: "14px",
  padding: "12px 14px",
  minHeight: "82px",
};

const heroPillLabelStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  color: "rgba(255,255,255,0.88)",
  marginBottom: "8px",
};

const heroPillValueStyle: CSSProperties = {
  fontSize: "26px",
  fontWeight: 800,
};

const heroMetaWrapStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(180px, 1fr))",
  gap: "12px",
  minWidth: "340px",
  flex: "1 1 340px",
};

const heroMetaCardStyle: CSSProperties = {
  background: "rgba(255,255,255,0.10)",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: "14px",
  padding: "14px 16px",
};

const heroMetaLabelStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  opacity: 0.82,
  marginBottom: "6px",
};

const heroMetaValueStyle: CSSProperties = {
  fontSize: "18px",
  fontWeight: 700,
};

const heroMetaCompactValueStyle: CSSProperties = {
  fontSize: "15px",
  fontWeight: 700,
  lineHeight: 1.35,
};

const topMetaRowStyle: CSSProperties = {
  marginBottom: 20,
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
};

const topMetaActionsStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  alignItems: "center",
};

const backLinkStyle: CSSProperties = {
  color: "#0f766e",
  fontWeight: 700,
  textDecoration: "none",
};

const statusBannerStyle: CSSProperties = {
  background: "white",
  borderRadius: "12px",
  padding: "12px 16px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
  color: "#0f172a",
};

const statsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: "16px",
  marginBottom: "20px",
};

const statCardStyle: CSSProperties = {
  background: "white",
  borderRadius: "16px",
  padding: "18px 20px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
};

const statCardLabelStyle: CSSProperties = {
  fontSize: "13px",
  color: "#64748b",
  fontWeight: 600,
};

const statCardValueStyle: CSSProperties = {
  fontSize: "34px",
  fontWeight: 700,
  color: "#0f172a",
  marginTop: "8px",
};

const topGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.05fr 0.95fr",
  gap: "20px",
  marginBottom: "20px",
};

const workspaceGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.45fr 0.95fr",
  gap: "20px",
  alignItems: "start",
};

const sidePanelStackStyle: CSSProperties = {
  display: "grid",
  gap: "20px",
  alignSelf: "start",
};

const panelStyle: CSSProperties = {
  background: "white",
  borderRadius: "18px",
  padding: "20px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
};

const sectionHeaderStyle: CSSProperties = {
  marginBottom: "16px",
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "20px",
  color: "#0f172a",
};

const sectionSubtitleStyle: CSSProperties = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: "14px",
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  outline: "none",
  fontSize: 14,
  color: "#0f172a",
  boxSizing: "border-box",
};

const toolbarSearchStyle: CSSProperties = {
  ...inputStyle,
  maxWidth: "460px",
  flex: "1 1 320px",
};

const toolbarSelectStyle: CSSProperties = {
  ...inputStyle,
  minWidth: "150px",
};

const textareaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: 100,
  resize: "vertical",
  fontFamily: "inherit",
};

const labelStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#475569",
  marginBottom: 6,
  display: "block",
  letterSpacing: 0.2,
  textTransform: "uppercase",
};

const primaryButton: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "none",
  background: "#2563eb",
  color: "#ffffff",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButton: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButtonSmall: CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  fontWeight: 700,
  cursor: "pointer",
};

const buttonRowStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "16px",
};

const attentionGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "14px",
};

const attentionCardStyle: CSSProperties = {
  textAlign: "left",
  padding: 16,
  borderRadius: 16,
  cursor: "pointer",
};

const attentionHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  alignItems: "center",
  marginBottom: 10,
};

const miniTagStyle: CSSProperties = {
  padding: "6px 10px",
  borderRadius: 999,
  fontWeight: 800,
  fontSize: 12,
  display: "inline-block",
};

const attentionNumberStyle: CSSProperties = {
  fontSize: 13,
  color: "#64748b",
  fontWeight: 800,
  marginBottom: 8,
};

const attentionTitleStyle: CSSProperties = {
  fontSize: 16,
  fontWeight: 800,
  color: "#0f172a",
  marginBottom: 8,
};

const attentionMetaRowStyle: CSSProperties = {
  fontSize: 13,
  color: "#475569",
  lineHeight: 1.5,
};

const attentionMetaFooterStyle: CSSProperties = {
  marginTop: 10,
  fontSize: 13,
  color: "#475569",
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
};

const emptyBoardStyle: CSSProperties = {
  padding: 18,
  borderRadius: 16,
  background: "#ffffff",
  border: "1px dashed #cbd5e1",
  color: "#475569",
};

const createTabWrapStyle: CSSProperties = {
  display: "inline-flex",
  background: "#e9eef5",
  borderRadius: 14,
  padding: 4,
  border: "1px solid #d3dce8",
  marginBottom: 16,
};

const createTabButtonStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "none",
  cursor: "pointer",
  fontWeight: 800,
};

const createPanelNcrStyle: CSSProperties = {
  padding: 18,
  borderRadius: 18,
  background: "#eef4fb",
  border: "1px solid #d3dfef",
};

const createPanelCapaStyle: CSSProperties = {
  padding: 18,
  borderRadius: 18,
  background: "#f3efff",
  border: "1px solid #ddd6fe",
};

const detailFormGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "12px",
};

const pickerRowStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  alignItems: "center",
};

const linkWrapStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const mutedTextStyle: CSSProperties = {
  color: "#94a3b8",
  fontSize: "13px",
};

const editablePillWrapStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  background: "#dbeafe",
  borderRadius: "999px",
  paddingRight: "6px",
};

const linkPillStyle: CSSProperties = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: "999px",
  background: "#dbeafe",
  color: "#1d4ed8",
  fontSize: "12px",
  fontWeight: 800,
  textDecoration: "none",
};

const pillRemoveButtonStyle: CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#1d4ed8",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: "14px",
  lineHeight: 1,
};

const toolbarStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "center",
  flexWrap: "wrap",
  marginBottom: "12px",
};

const toolbarFiltersStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const tableInfoRowStyle: CSSProperties = {
  marginBottom: "12px",
  color: "#475569",
  fontSize: "14px",
};

const registerTableWrapStyle: CSSProperties = {
  border: "1px solid #d7dee7",
  borderRadius: "18px",
  overflow: "hidden",
};

const registerHeadStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.7fr 0.9fr 0.9fr 1fr 1fr 0.8fr 0.7fr",
  gap: "12px",
  padding: "14px 16px",
  background: "#f8fafc",
  borderBottom: "1px solid #e5e7eb",
  fontSize: "12px",
  fontWeight: 800,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: 0.3,
  alignItems: "center",
};

const registerBodyStyle: CSSProperties = {
  maxHeight: "760px",
  overflowY: "auto",
};

const registerRowStyle: CSSProperties = {
  width: "100%",
  textAlign: "left",
  display: "grid",
  gridTemplateColumns: "1.7fr 0.9fr 0.9fr 1fr 1fr 0.8fr 0.7fr",
  gap: "12px",
  padding: "16px",
  border: "none",
  borderBottom: "1px solid #eef2f7",
  cursor: "pointer",
  alignItems: "start",
};

const registerRecordTagRowStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  alignItems: "center",
  flexWrap: "wrap",
  marginBottom: "8px",
};

const registerTagStyle: CSSProperties = {
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 800,
  display: "inline-block",
};

const registerRecordNumberStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 800,
  color: "#64748b",
};

const registerTitleStyle: CSSProperties = {
  fontSize: "15px",
  fontWeight: 800,
  color: "#0f172a",
  marginBottom: "6px",
  lineHeight: 1.35,
};

const registerDescriptionStyle: CSSProperties = {
  fontSize: "13px",
  color: "#475569",
  lineHeight: 1.45,
};

const registerMetaStyle: CSSProperties = {
  display: "flex",
  gap: "14px",
  flexWrap: "wrap",
  marginTop: "10px",
  fontSize: "12px",
  color: "#64748b",
};

const registerSimpleTextStyle: CSSProperties = {
  fontSize: "13px",
  color: "#0f172a",
  fontWeight: 700,
};

const fileCountBadgeStyle: CSSProperties = {
  display: "inline-block",
  minWidth: 32,
  textAlign: "center",
  padding: "6px 10px",
  borderRadius: 999,
  background: "#ede9fe",
  color: "#6d28d9",
  fontSize: 12,
  fontWeight: 800,
};

const editHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  alignItems: "center",
  flexWrap: "wrap",
  marginBottom: "14px",
};

const detailRecordNumberStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 800,
  color: "#64748b",
};

const detailRecordTitleStyle: CSSProperties = {
  margin: "4px 0 0 0",
  fontSize: "20px",
  color: "#0f172a",
};

const evidenceListStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
  marginTop: "16px",
};

const evidenceItemStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
  padding: "14px",
  borderRadius: "12px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
};

const evidenceFileNameStyle: CSSProperties = {
  fontWeight: 700,
  color: "#0f172a",
  wordBreak: "break-word",
};

const evidenceMetaTextStyle: CSSProperties = {
  fontSize: "12px",
  color: "#64748b",
  marginTop: "4px",
  lineHeight: 1.45,
};

const evidenceNoteStyle: CSSProperties = {
  fontSize: "12px",
  color: "#475569",
  marginTop: "6px",
};

const actionButtonsWrapStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const badgeStyle: CSSProperties = {
  padding: "5px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 700,
  display: "inline-block",
  whiteSpace: "nowrap",
};
export default function NcrCapaPage() {
  return (
    <Suspense fallback={<main style={{ padding: "24px" }}>Loading NCR / CAPA...</main>}>
      <NcrCapaPageContent />
    </Suspense>
  );
}

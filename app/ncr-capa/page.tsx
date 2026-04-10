"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { supabase } from "../../src/lib/supabase";

type Ncr = {
  id: string;
  ncr_number: string | null;
  title: string | null;
  severity: string | null;
  status: string | null;
  owner: string | null;
  area: string | null;
  due_date: string | null;
  project?: string | null;
  source_type?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type Capa = {
  id: string;
  capa_number: string | null;
  title: string | null;
  status: string | null;
  owner: string | null;
  linked_to: string | null;
  due_date: string | null;
  project?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type CombinedRecord = {
  id: string;
  recordType: "NCR" | "CAPA";
  recordNumber: string;
  title: string;
  project: string | null;
  owner: string | null;
  status: string | null;
  dueDate: string | null;
  updatedAt: string | null;
  sourceType: string | null;
  severity: string | null;
  linkedTo: string | null;
};

type NcrForm = {
  title: string;
  severity: string;
  status: string;
  owner: string;
  area: string;
  due_date: string;
  project: string;
  source_type: string;
};

type CapaForm = {
  title: string;
  status: string;
  owner: string;
  linked_to: string;
  due_date: string;
  project: string;
};

const emptyNcrForm: NcrForm = {
  title: "",
  severity: "Minor",
  status: "Open",
  owner: "",
  area: "",
  due_date: "",
  project: "",
  source_type: "Internal",
};

const emptyCapaForm: CapaForm = {
  title: "",
  status: "Open",
  owner: "",
  linked_to: "",
  due_date: "",
  project: "",
};

function normaliseStatus(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function isClosedLikeStatus(value: string | null | undefined) {
  const status = normaliseStatus(value);
  return status === "closed" || status === "complete" || status === "completed";
}

function extractNumber(value: string | null | undefined) {
  if (!value) return null;
  const match = value.match(/(\d+)/);
  if (!match) return null;

  const num = Number(match[1]);
  return Number.isNaN(num) ? null : num;
}

function getNextAvailableNumber(values: Array<string | null | undefined>, prefix: "NCR" | "CAPA") {
  const used = new Set(
    values
      .map((value) => extractNumber(value))
      .filter((num): num is number => num !== null && num > 0)
  );

  let next = 1;
  while (used.has(next)) {
    next += 1;
  }

  return `${prefix}-${String(next).padStart(3, "0")}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDaysFromToday(value: string | null | undefined) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const today = new Date();
  date.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffMs = date.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function getDueLabel(value: string | null | undefined, status: string | null | undefined) {
  if (!value) return "-";
  if (isClosedLikeStatus(status)) return "Closed";

  const days = getDaysFromToday(value);

  if (days === null) return "-";
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

function isOverdue(dueDate: string | null | undefined, status: string | null | undefined) {
  if (!dueDate) return false;
  if (isClosedLikeStatus(status)) return false;

  const days = getDaysFromToday(dueDate);
  return days !== null && days < 0;
}

function sortByPrefixedNumber(a: string | null | undefined, b: string | null | undefined) {
  const aNum = extractNumber(a);
  const bNum = extractNumber(b);

  if (aNum !== null && bNum !== null) return aNum - bNum;
  if (aNum !== null) return -1;
  if (bNum !== null) return 1;

  return (a || "").localeCompare(b || "");
}

export default function NcrCapaPage() {
  const [ncrs, setNcrs] = useState<Ncr[]>([]);
  const [capas, setCapas] = useState<Capa[]>([]);
  const [message, setMessage] = useState("Loading NCR / CAPA data...");
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const [ncrForm, setNcrForm] = useState<NcrForm>(emptyNcrForm);
  const [capaForm, setCapaForm] = useState<CapaForm>(emptyCapaForm);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");

  const [editingNcrId, setEditingNcrId] = useState<string | null>(null);
  const [editingCapaId, setEditingCapaId] = useState<string | null>(null);

  const [editNcrForm, setEditNcrForm] = useState<NcrForm>(emptyNcrForm);
  const [editCapaForm, setEditCapaForm] = useState<CapaForm>(emptyCapaForm);

  async function loadData(showLoadedMessage = true) {
    setIsLoading(true);

    const [ncrRes, capaRes] = await Promise.all([
      supabase.from("ncrs").select("*"),
      supabase.from("capas").select("*"),
    ]);

    if (ncrRes.error || capaRes.error) {
      setMessage(`Error: ${ncrRes.error?.message || capaRes.error?.message || "Unknown error"}`);
      setIsLoading(false);
      return;
    }

    const sortedNcrs = [...(ncrRes.data || [])].sort((a, b) =>
      sortByPrefixedNumber(a.ncr_number, b.ncr_number)
    );

    const sortedCapas = [...(capaRes.data || [])].sort((a, b) =>
      sortByPrefixedNumber(a.capa_number, b.capa_number)
    );

    setNcrs(sortedNcrs);
    setCapas(sortedCapas);
    setLastRefreshed(new Date());
    setIsLoading(false);

    if (showLoadedMessage) {
      setMessage("NCR / CAPA data loaded successfully.");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const nextNcrNumber = useMemo(() => {
    return getNextAvailableNumber(ncrs.map((x) => x.ncr_number), "NCR");
  }, [ncrs]);

  const nextCapaNumber = useMemo(() => {
    return getNextAvailableNumber(capas.map((x) => x.capa_number), "CAPA");
  }, [capas]);

  const openNcrs = ncrs.filter((n) => !isClosedLikeStatus(n.status)).length;
  const closedNcrs = ncrs.filter((n) => isClosedLikeStatus(n.status)).length;
  const openCapas = capas.filter((c) => !isClosedLikeStatus(c.status)).length;
  const closedCapas = capas.filter((c) => isClosedLikeStatus(c.status)).length;

  const majorOpenNcrs = ncrs.filter(
    (n) =>
      (n.severity || "").toLowerCase() === "major" &&
      !isClosedLikeStatus(n.status)
  ).length;

  const internalNcrs = ncrs.filter(
    (n) => (n.source_type || "").toLowerCase() === "internal"
  ).length;

  const supplierNcrs = ncrs.filter(
    (n) => (n.source_type || "").toLowerCase() === "supplier"
  ).length;

  const externalNcrs = ncrs.filter(
    (n) => (n.source_type || "").toLowerCase() === "external"
  ).length;

  const overdueRecords = [
    ...ncrs.filter((n) => isOverdue(n.due_date, n.status)),
    ...capas.filter((c) => isOverdue(c.due_date, c.status)),
  ].length;

  const dueThisWeek = [
    ...ncrs.filter((n) => {
      if (!n.due_date || isClosedLikeStatus(n.status)) return false;
      const days = getDaysFromToday(n.due_date);
      return days !== null && days >= 0 && days <= 7;
    }),
    ...capas.filter((c) => {
      if (!c.due_date || isClosedLikeStatus(c.status)) return false;
      const days = getDaysFromToday(c.due_date);
      return days !== null && days >= 0 && days <= 7;
    }),
  ].length;

  const ncrLookup = useMemo(() => {
    return new Map(
      ncrs.map((ncr) => [ncr.ncr_number || "", ncr])
    );
  }, [ncrs]);

  const combinedRecords = useMemo<CombinedRecord[]>(() => {
    const mappedNcrs: CombinedRecord[] = ncrs.map((ncr) => ({
      id: ncr.id,
      recordType: "NCR",
      recordNumber: ncr.ncr_number || "-",
      title: ncr.title || "-",
      project: ncr.project || null,
      owner: ncr.owner || null,
      status: ncr.status || null,
      dueDate: ncr.due_date || null,
      updatedAt: ncr.updated_at || ncr.created_at || null,
      sourceType: ncr.source_type || null,
      severity: ncr.severity || null,
      linkedTo: null,
    }));

    const mappedCapas: CombinedRecord[] = capas.map((capa) => {
      const linkedNcr = capa.linked_to ? ncrLookup.get(capa.linked_to) : null;

      return {
        id: capa.id,
        recordType: "CAPA",
        recordNumber: capa.capa_number || "-",
        title: capa.title || "-",
        project: capa.project || linkedNcr?.project || null,
        owner: capa.owner || null,
        status: capa.status || null,
        dueDate: capa.due_date || null,
        updatedAt: capa.updated_at || capa.created_at || null,
        sourceType: linkedNcr?.source_type || null,
        severity: null,
        linkedTo: capa.linked_to || null,
      };
    });

    return [...mappedNcrs, ...mappedCapas].sort((a, b) => {
      if (a.recordType !== b.recordType) {
        return a.recordType === "NCR" ? -1 : 1;
      }

      return sortByPrefixedNumber(a.recordNumber, b.recordNumber);
    });
  }, [ncrs, capas, ncrLookup]);

  const filteredRecords = useMemo(() => {
    const lower = search.toLowerCase();

    return combinedRecords.filter((record) => {
      const matchesSearch =
        !search ||
        record.recordNumber.toLowerCase().includes(lower) ||
        (record.title || "").toLowerCase().includes(lower) ||
        (record.project || "").toLowerCase().includes(lower) ||
        (record.owner || "").toLowerCase().includes(lower) ||
        (record.sourceType || "").toLowerCase().includes(lower) ||
        (record.linkedTo || "").toLowerCase().includes(lower);

      const matchesType = !typeFilter || record.recordType === typeFilter;
      const matchesStatus = !statusFilter || (record.status || "") === statusFilter;
      const matchesSource = !sourceFilter || (record.sourceType || "") === sourceFilter;
      const matchesProject = !projectFilter || (record.project || "") === projectFilter;

      return matchesSearch && matchesType && matchesStatus && matchesSource && matchesProject;
    });
  }, [combinedRecords, search, typeFilter, statusFilter, sourceFilter, projectFilter]);

  const priorityViewItems = useMemo(() => {
    return combinedRecords
      .filter((record) => isOverdue(record.dueDate, record.status))
      .sort((a, b) => {
        const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      })
      .slice(0, 5);
  }, [combinedRecords]);

  const dueSoonItems = useMemo(() => {
    return combinedRecords
      .filter((record) => {
        if (!record.dueDate || isClosedLikeStatus(record.status)) return false;
        const days = getDaysFromToday(record.dueDate);
        return days !== null && days >= 0 && days <= 7;
      })
      .sort((a, b) => {
        const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      })
      .slice(0, 5);
  }, [combinedRecords]);

  const uniqueProjects = useMemo(() => {
    return [...new Set(combinedRecords.map((r) => r.project).filter(Boolean))].sort();
  }, [combinedRecords]);

  async function addNcr(e: React.FormEvent) {
    e.preventDefault();

    if (!ncrForm.title.trim()) {
      setMessage("NCR title is required.");
      return;
    }

    const ncrNumberToUse = getNextAvailableNumber(ncrs.map((x) => x.ncr_number), "NCR");

    const { error } = await supabase.from("ncrs").insert([
      {
        ncr_number: ncrNumberToUse,
        title: ncrForm.title.trim(),
        severity: ncrForm.severity,
        status: ncrForm.status,
        owner: ncrForm.owner.trim() || null,
        area: ncrForm.area.trim() || null,
        due_date: ncrForm.due_date || null,
        project: ncrForm.project.trim() || null,
        source_type: ncrForm.source_type,
      },
    ]);

    if (error) {
      setMessage(`Add NCR failed: ${error.message}`);
      return;
    }

    setNcrForm(emptyNcrForm);
    setMessage(`${ncrNumberToUse} added successfully.`);
    await loadData(false);
  }

  async function addCapa(e: React.FormEvent) {
    e.preventDefault();

    if (!capaForm.title.trim()) {
      setMessage("CAPA title is required.");
      return;
    }

    const capaNumberToUse = getNextAvailableNumber(capas.map((x) => x.capa_number), "CAPA");

    const { error } = await supabase.from("capas").insert([
      {
        capa_number: capaNumberToUse,
        title: capaForm.title.trim(),
        status: capaForm.status,
        owner: capaForm.owner.trim() || null,
        linked_to: capaForm.linked_to.trim() || null,
        due_date: capaForm.due_date || null,
        project: capaForm.project.trim() || null,
      },
    ]);

    if (error) {
      setMessage(`Add CAPA failed: ${error.message}`);
      return;
    }

    setCapaForm(emptyCapaForm);
    setMessage(`${capaNumberToUse} added successfully.`);
    await loadData(false);
  }

  function startEditNcr(ncr: Ncr) {
    setEditingCapaId(null);
    setEditingNcrId(ncr.id);
    setEditNcrForm({
      title: ncr.title || "",
      severity: ncr.severity || "Minor",
      status: ncr.status || "Open",
      owner: ncr.owner || "",
      area: ncr.area || "",
      due_date: ncr.due_date || "",
      project: ncr.project || "",
      source_type: ncr.source_type || "Internal",
    });
  }

  function startEditCapa(capa: Capa) {
    setEditingNcrId(null);
    setEditingCapaId(capa.id);
    setEditCapaForm({
      title: capa.title || "",
      status: capa.status || "Open",
      owner: capa.owner || "",
      linked_to: capa.linked_to || "",
      due_date: capa.due_date || "",
      project: capa.project || "",
    });
  }

  async function saveNcr(id: string) {
    if (!editNcrForm.title.trim()) {
      setMessage("NCR title is required.");
      return;
    }

    const { error } = await supabase
      .from("ncrs")
      .update({
        title: editNcrForm.title.trim(),
        severity: editNcrForm.severity,
        status: editNcrForm.status,
        owner: editNcrForm.owner.trim() || null,
        area: editNcrForm.area.trim() || null,
        due_date: editNcrForm.due_date || null,
        project: editNcrForm.project.trim() || null,
        source_type: editNcrForm.source_type,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      setMessage(`Update NCR failed: ${error.message}`);
      return;
    }

    setEditingNcrId(null);
    setMessage("NCR updated successfully.");
    await loadData(false);
  }

  async function saveCapa(id: string) {
    if (!editCapaForm.title.trim()) {
      setMessage("CAPA title is required.");
      return;
    }

    const { error } = await supabase
      .from("capas")
      .update({
        title: editCapaForm.title.trim(),
        status: editCapaForm.status,
        owner: editCapaForm.owner.trim() || null,
        linked_to: editCapaForm.linked_to.trim() || null,
        due_date: editCapaForm.due_date || null,
        project: editCapaForm.project.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      setMessage(`Update CAPA failed: ${error.message}`);
      return;
    }

    setEditingCapaId(null);
    setMessage("CAPA updated successfully.");
    await loadData(false);
  }

  async function deleteNcr(id: string) {
    if (!window.confirm("Delete this NCR?")) return;

    const { error } = await supabase.from("ncrs").delete().eq("id", id);

    if (error) {
      setMessage(`Delete NCR failed: ${error.message}`);
      return;
    }

    setMessage("NCR deleted successfully.");
    await loadData(false);
  }

  async function deleteCapa(id: string) {
    if (!window.confirm("Delete this CAPA?")) return;

    const { error } = await supabase.from("capas").delete().eq("id", id);

    if (error) {
      setMessage(`Delete CAPA failed: ${error.message}`);
      return;
    }

    setMessage("CAPA deleted successfully.");
    await loadData(false);
  }

  function clearFilters() {
    setSearch("");
    setTypeFilter("");
    setStatusFilter("");
    setSourceFilter("");
    setProjectFilter("");
  }

  return (
    <main>
      <section style={heroStyle}>
        <div style={{ flex: "1 1 620px" }}>
          <div style={eyebrowStyle}>Quality Register</div>
          <h1 style={heroTitleStyle}>NCR / CAPA</h1>
          <p style={heroSubtitleStyle}>
            One joined-up quality view, while keeping NCRs and CAPAs properly separate behind the scenes.
          </p>

          <div style={priorityStripStyle}>
            <HeroPill label="Open NCRs" value={openNcrs} tone={openNcrs > 0 ? "red" : "green"} />
            <HeroPill label="Open CAPAs" value={openCapas} tone={openCapas > 0 ? "amber" : "green"} />
            <HeroPill label="Major Open NCRs" value={majorOpenNcrs} tone={majorOpenNcrs > 0 ? "red" : "green"} />
            <HeroPill label="Overdue Items" value={overdueRecords} tone={overdueRecords > 0 ? "red" : "green"} />
          </div>
        </div>

        <div style={heroMetaWrapStyle}>
          <div style={heroMetaCardStyle}>
            <div style={heroMetaLabelStyle}>Next NCR Number</div>
            <div style={heroMetaValueStyle}>{nextNcrNumber}</div>
          </div>

          <div style={heroMetaCardStyle}>
            <div style={heroMetaLabelStyle}>Next CAPA Number</div>
            <div style={heroMetaValueStyle}>{nextCapaNumber}</div>
          </div>

          <div style={heroMetaCardStyle}>
            <div style={heroMetaLabelStyle}>Due This Week</div>
            <div style={heroMetaValueStyle}>{dueThisWeek}</div>
          </div>

          <div style={heroMetaCardStyle}>
            <div style={heroMetaLabelStyle}>Last Refreshed</div>
            <div style={heroMetaValueStyleSmall}>
              {isLoading ? "Loading..." : formatDateTime(lastRefreshed?.toISOString())}
            </div>
          </div>
        </div>
      </section>

      <div style={topUtilityRowStyle}>
        <Link href="/" style={backLinkStyle}>
          ← Back to Dashboard
        </Link>

        <div style={statusBannerInlineStyle}>
          <strong>Status:</strong> {message}
        </div>
      </div>

      <section style={statsGridStyle}>
        <StatCard title="Internal NCRs" value={internalNcrs} accent="#2563eb" />
        <StatCard title="Supplier NCRs" value={supplierNcrs} accent="#f59e0b" />
        <StatCard title="External NCRs" value={externalNcrs} accent="#0f766e" />
        <StatCard title="Closed NCRs" value={closedNcrs} accent="#16a34a" />
        <StatCard title="Closed CAPAs" value={closedCapas} accent="#64748b" />
      </section>

      <section style={twoColumnGridStyle}>
        <SectionCard
          title="Create NCR"
          subtitle="Log the issue properly first, including source and project."
        >
          <form onSubmit={addNcr}>
            <div style={formGridStyle}>
              <Field label="NCR Number">
                <input value={nextNcrNumber} readOnly style={readOnlyInputStyle} />
              </Field>

              <Field label="Source Type">
                <select
                  value={ncrForm.source_type}
                  onChange={(e) => setNcrForm({ ...ncrForm, source_type: e.target.value })}
                  style={inputStyle}
                >
                  <option value="Internal">Internal</option>
                  <option value="Supplier">Supplier</option>
                  <option value="External">External</option>
                </select>
              </Field>

              <Field label="Project">
                <input
                  placeholder="e.g. Wadden Sea"
                  value={ncrForm.project}
                  onChange={(e) => setNcrForm({ ...ncrForm, project: e.target.value })}
                  style={inputStyle}
                />
              </Field>

              <Field label="Title">
                <input
                  placeholder="Enter NCR title"
                  value={ncrForm.title}
                  onChange={(e) => setNcrForm({ ...ncrForm, title: e.target.value })}
                  style={inputStyle}
                />
              </Field>

              <Field label="Severity">
                <select
                  value={ncrForm.severity}
                  onChange={(e) => setNcrForm({ ...ncrForm, severity: e.target.value })}
                  style={inputStyle}
                >
                  <option value="Minor">Minor</option>
                  <option value="Major">Major</option>
                </select>
              </Field>

              <Field label="Status">
                <select
                  value={ncrForm.status}
                  onChange={(e) => setNcrForm({ ...ncrForm, status: e.target.value })}
                  style={inputStyle}
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Closed">Closed</option>
                </select>
              </Field>

              <Field label="Owner">
                <input
                  placeholder="Enter owner"
                  value={ncrForm.owner}
                  onChange={(e) => setNcrForm({ ...ncrForm, owner: e.target.value })}
                  style={inputStyle}
                />
              </Field>

              <Field label="Area">
                <input
                  placeholder="Enter area"
                  value={ncrForm.area}
                  onChange={(e) => setNcrForm({ ...ncrForm, area: e.target.value })}
                  style={inputStyle}
                />
              </Field>

              <Field label="Due Date">
                <input
                  type="date"
                  value={ncrForm.due_date}
                  onChange={(e) => setNcrForm({ ...ncrForm, due_date: e.target.value })}
                  style={inputStyle}
                />
              </Field>
            </div>

            <div style={formFooterStyle}>
              <button type="submit" style={primaryButtonStyle}>
                Add NCR
              </button>
              <span style={helperTextStyle}>
                NCR numbering fills the next available slot automatically.
              </span>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title="Create CAPA"
          subtitle="Raise the response record separately, with its own numbering."
        >
          <form onSubmit={addCapa}>
            <div style={formGridStyle}>
              <Field label="CAPA Number">
                <input value={nextCapaNumber} readOnly style={readOnlyInputStyle} />
              </Field>

              <Field label="Linked NCR">
                <input
                  placeholder="e.g. NCR-001"
                  value={capaForm.linked_to}
                  onChange={(e) => setCapaForm({ ...capaForm, linked_to: e.target.value })}
                  style={inputStyle}
                />
              </Field>

              <Field label="Project">
                <input
                  placeholder="e.g. Wadden Sea"
                  value={capaForm.project}
                  onChange={(e) => setCapaForm({ ...capaForm, project: e.target.value })}
                  style={inputStyle}
                />
              </Field>

              <Field label="Title">
                <input
                  placeholder="Enter CAPA title"
                  value={capaForm.title}
                  onChange={(e) => setCapaForm({ ...capaForm, title: e.target.value })}
                  style={inputStyle}
                />
              </Field>

              <Field label="Status">
                <select
                  value={capaForm.status}
                  onChange={(e) => setCapaForm({ ...capaForm, status: e.target.value })}
                  style={inputStyle}
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Closed">Closed</option>
                  <option value="Complete">Complete</option>
                </select>
              </Field>

              <Field label="Owner">
                <input
                  placeholder="Enter owner"
                  value={capaForm.owner}
                  onChange={(e) => setCapaForm({ ...capaForm, owner: e.target.value })}
                  style={inputStyle}
                />
              </Field>

              <Field label="Due Date">
                <input
                  type="date"
                  value={capaForm.due_date}
                  onChange={(e) => setCapaForm({ ...capaForm, due_date: e.target.value })}
                  style={inputStyle}
                />
              </Field>
            </div>

            <div style={formFooterStyle}>
              <button type="submit" style={primaryButtonStyle}>
                Add CAPA
              </button>
              <span style={helperTextStyle}>
                CAPA numbering is separate from NCR numbering.
              </span>
            </div>
          </form>
        </SectionCard>
      </section>

      <section style={twoColumnGridStyle}>
        <SectionCard
          title="Priority View"
          subtitle="What needs chasing right now."
        >
          <MiniListCard
            title="Overdue First"
            emptyText="No overdue NCRs or CAPAs."
            items={priorityViewItems.map((record) => ({
              id: record.id,
              line1: `${record.recordNumber} — ${record.title}`,
              line2: `${record.recordType} · ${record.project || "No project"} · ${record.owner || "No owner"} · ${getDueLabel(record.dueDate, record.status)}`,
              tone: "red" as const,
            }))}
          />
        </SectionCard>

        <SectionCard
          title="Due This Week"
          subtitle="Items approaching their due date."
        >
          <MiniListCard
            title="Upcoming"
            emptyText="No open NCRs or CAPAs due this week."
            items={dueSoonItems.map((record) => ({
              id: record.id,
              line1: `${record.recordNumber} — ${record.title}`,
              line2: `${record.recordType} · ${record.project || "No project"} · ${record.owner || "No owner"} · ${getDueLabel(record.dueDate, record.status)}`,
              tone: "amber" as const,
            }))}
          />
        </SectionCard>
      </section>

      <SectionCard
        title="Combined Quality Register"
        subtitle="Single working register for NCRs and CAPAs, while keeping separate numbering and record logic."
        action={
          <button type="button" onClick={clearFilters} style={secondaryButtonStyle}>
            Clear Filters
          </button>
        }
      >
        <div style={filterBarStyle}>
          <input
            placeholder="Search number / title / project / owner / source / linked NCR"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={inputStyle}
          />

          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={inputStyle}>
            <option value="">All Types</option>
            <option value="NCR">NCR</option>
            <option value="CAPA">CAPA</option>
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
            <option value="">All Status</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Closed">Closed</option>
            <option value="Complete">Complete</option>
          </select>

          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} style={inputStyle}>
            <option value="">All Sources</option>
            <option value="Internal">Internal</option>
            <option value="Supplier">Supplier</option>
            <option value="External">External</option>
          </select>

          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} style={inputStyle}>
            <option value="">All Projects</option>
            {uniqueProjects.map((project) => (
              <option key={String(project)} value={String(project)}>
                {String(project)}
              </option>
            ))}
          </select>
        </div>

        <div style={tableInfoRowStyle}>
          <span>
            Showing <strong>{filteredRecords.length}</strong> of <strong>{combinedRecords.length}</strong> records
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={tableHeadStyle}>Record No.</th>
                <th style={tableHeadStyle}>Type</th>
                <th style={tableHeadStyle}>Source</th>
                <th style={tableHeadStyle}>Project</th>
                <th style={tableHeadStyle}>Title</th>
                <th style={tableHeadStyle}>Owner</th>
                <th style={tableHeadStyle}>Severity</th>
                <th style={tableHeadStyle}>Status</th>
                <th style={tableHeadStyle}>Due Date</th>
                <th style={tableHeadStyle}>Linked NCR</th>
                <th style={tableHeadStyle}>Updated</th>
                <th style={tableHeadStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={12} style={emptyTableCellStyle}>
                    No records match the current filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const overdue = isOverdue(record.dueDate, record.status);

                  if (record.recordType === "NCR") {
                    const ncr = ncrs.find((x) => x.id === record.id);
                    if (!ncr) return null;

                    return (
                      <tr
                        key={`${record.recordType}-${record.id}`}
                        style={{
                          ...tableRowStyle,
                          background: overdue ? "#fff7f7" : "white",
                        }}
                      >
                        {editingNcrId === ncr.id ? (
                          <>
                            <td style={tableCellStyle}>
                              <div style={readOnlyTableCellStyle}>{ncr.ncr_number || "-"}</div>
                            </td>
                            <td style={tableCellStyle}>
                              <RecordTypeBadge value="NCR" />
                            </td>
                            <td style={tableCellStyle}>
                              <select
                                value={editNcrForm.source_type}
                                onChange={(e) => setEditNcrForm({ ...editNcrForm, source_type: e.target.value })}
                                style={smallInputStyle}
                              >
                                <option value="Internal">Internal</option>
                                <option value="Supplier">Supplier</option>
                                <option value="External">External</option>
                              </select>
                            </td>
                            <td style={tableCellStyle}>
                              <input
                                value={editNcrForm.project}
                                onChange={(e) => setEditNcrForm({ ...editNcrForm, project: e.target.value })}
                                style={smallInputStyle}
                              />
                            </td>
                            <td style={tableCellStyle}>
                              <input
                                value={editNcrForm.title}
                                onChange={(e) => setEditNcrForm({ ...editNcrForm, title: e.target.value })}
                                style={smallInputStyle}
                              />
                            </td>
                            <td style={tableCellStyle}>
                              <input
                                value={editNcrForm.owner}
                                onChange={(e) => setEditNcrForm({ ...editNcrForm, owner: e.target.value })}
                                style={smallInputStyle}
                              />
                            </td>
                            <td style={tableCellStyle}>
                              <select
                                value={editNcrForm.severity}
                                onChange={(e) => setEditNcrForm({ ...editNcrForm, severity: e.target.value })}
                                style={smallInputStyle}
                              >
                                <option value="Minor">Minor</option>
                                <option value="Major">Major</option>
                              </select>
                            </td>
                            <td style={tableCellStyle}>
                              <select
                                value={editNcrForm.status}
                                onChange={(e) => setEditNcrForm({ ...editNcrForm, status: e.target.value })}
                                style={smallInputStyle}
                              >
                                <option value="Open">Open</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Closed">Closed</option>
                              </select>
                            </td>
                            <td style={tableCellStyle}>
                              <input
                                type="date"
                                value={editNcrForm.due_date}
                                onChange={(e) => setEditNcrForm({ ...editNcrForm, due_date: e.target.value })}
                                style={smallInputStyle}
                              />
                            </td>
                            <td style={tableCellStyle}>-</td>
                            <td style={tableCellStyle}>{formatDateTime(ncr.updated_at || ncr.created_at)}</td>
                            <td style={tableCellStyle}>
                              <div style={actionButtonsWrapStyle}>
                                <button type="button" onClick={() => saveNcr(ncr.id)} style={miniButtonStyle}>
                                  Save
                                </button>
                                <button type="button" onClick={() => setEditingNcrId(null)} style={miniButtonGreyStyle}>
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td style={tableCellStyle}>
                              <div style={recordNumberStyle}>{ncr.ncr_number || "-"}</div>
                            </td>
                            <td style={tableCellStyle}>
                              <RecordTypeBadge value="NCR" />
                            </td>
                            <td style={tableCellStyle}>
                              <SourceBadge value={ncr.source_type || "Unknown"} />
                            </td>
                            <td style={tableCellStyle}>{ncr.project || "-"}</td>
                            <td style={tableCellStyle}>
                              <div style={primaryCellTextStyle}>{ncr.title || "-"}</div>
                              <div style={secondaryCellTextStyle}>{ncr.area || " "}</div>
                            </td>
                            <td style={tableCellStyle}>{ncr.owner || "-"}</td>
                            <td style={tableCellStyle}>
                              <SeverityBadge value={ncr.severity || "Unknown"} />
                            </td>
                            <td style={tableCellStyle}>
                              <StatusBadge value={ncr.status || "Unknown"} />
                            </td>
                            <td style={tableCellStyle}>
                              <div style={primaryCellTextStyle}>{formatDate(ncr.due_date)}</div>
                              <div
                                style={{
                                  ...secondaryCellTextStyle,
                                  color: overdue ? "#b91c1c" : "#64748b",
                                  fontWeight: overdue ? 700 : 500,
                                }}
                              >
                                {getDueLabel(ncr.due_date, ncr.status)}
                              </div>
                            </td>
                            <td style={tableCellStyle}>-</td>
                            <td style={tableCellStyle}>{formatDateTime(ncr.updated_at || ncr.created_at)}</td>
                            <td style={tableCellStyle}>
                              <div style={actionButtonsWrapStyle}>
                                <button type="button" onClick={() => startEditNcr(ncr)} style={miniButtonStyle}>
                                  Edit
                                </button>
                                <button type="button" onClick={() => deleteNcr(ncr.id)} style={miniButtonDeleteStyle}>
                                  Delete
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  }

                  const capa = capas.find((x) => x.id === record.id);
                  if (!capa) return null;

                  return (
                    <tr
                      key={`${record.recordType}-${record.id}`}
                      style={{
                        ...tableRowStyle,
                        background: overdue ? "#fff7f7" : "white",
                      }}
                    >
                      {editingCapaId === capa.id ? (
                        <>
                          <td style={tableCellStyle}>
                            <div style={readOnlyTableCellStyle}>{capa.capa_number || "-"}</div>
                          </td>
                          <td style={tableCellStyle}>
                            <RecordTypeBadge value="CAPA" />
                          </td>
                          <td style={tableCellStyle}>
                            {record.sourceType ? <SourceBadge value={record.sourceType} /> : "-"}
                          </td>
                          <td style={tableCellStyle}>
                            <input
                              value={editCapaForm.project}
                              onChange={(e) => setEditCapaForm({ ...editCapaForm, project: e.target.value })}
                              style={smallInputStyle}
                            />
                          </td>
                          <td style={tableCellStyle}>
                            <input
                              value={editCapaForm.title}
                              onChange={(e) => setEditCapaForm({ ...editCapaForm, title: e.target.value })}
                              style={smallInputStyle}
                            />
                          </td>
                          <td style={tableCellStyle}>
                            <input
                              value={editCapaForm.owner}
                              onChange={(e) => setEditCapaForm({ ...editCapaForm, owner: e.target.value })}
                              style={smallInputStyle}
                            />
                          </td>
                          <td style={tableCellStyle}>-</td>
                          <td style={tableCellStyle}>
                            <select
                              value={editCapaForm.status}
                              onChange={(e) => setEditCapaForm({ ...editCapaForm, status: e.target.value })}
                              style={smallInputStyle}
                            >
                              <option value="Open">Open</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Closed">Closed</option>
                              <option value="Complete">Complete</option>
                            </select>
                          </td>
                          <td style={tableCellStyle}>
                            <input
                              type="date"
                              value={editCapaForm.due_date}
                              onChange={(e) => setEditCapaForm({ ...editCapaForm, due_date: e.target.value })}
                              style={smallInputStyle}
                            />
                          </td>
                          <td style={tableCellStyle}>
                            <input
                              value={editCapaForm.linked_to}
                              onChange={(e) => setEditCapaForm({ ...editCapaForm, linked_to: e.target.value })}
                              style={smallInputStyle}
                            />
                          </td>
                          <td style={tableCellStyle}>{formatDateTime(capa.updated_at || capa.created_at)}</td>
                          <td style={tableCellStyle}>
                            <div style={actionButtonsWrapStyle}>
                              <button type="button" onClick={() => saveCapa(capa.id)} style={miniButtonStyle}>
                                Save
                              </button>
                              <button type="button" onClick={() => setEditingCapaId(null)} style={miniButtonGreyStyle}>
                                Cancel
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={tableCellStyle}>
                            <div style={recordNumberStyle}>{capa.capa_number || "-"}</div>
                          </td>
                          <td style={tableCellStyle}>
                            <RecordTypeBadge value="CAPA" />
                          </td>
                          <td style={tableCellStyle}>
                            {record.sourceType ? <SourceBadge value={record.sourceType} /> : "-"}
                          </td>
                          <td style={tableCellStyle}>{capa.project || record.project || "-"}</td>
                          <td style={tableCellStyle}>
                            <div style={primaryCellTextStyle}>{capa.title || "-"}</div>
                            <div style={secondaryCellTextStyle}>
                              {capa.linked_to ? `Linked to ${capa.linked_to}` : "Not linked"}
                            </div>
                          </td>
                          <td style={tableCellStyle}>{capa.owner || "-"}</td>
                          <td style={tableCellStyle}>-</td>
                          <td style={tableCellStyle}>
                            <StatusBadge value={capa.status || "Unknown"} />
                          </td>
                          <td style={tableCellStyle}>
                            <div style={primaryCellTextStyle}>{formatDate(capa.due_date)}</div>
                            <div
                              style={{
                                ...secondaryCellTextStyle,
                                color: overdue ? "#b91c1c" : "#64748b",
                                fontWeight: overdue ? 700 : 500,
                              }}
                            >
                              {getDueLabel(capa.due_date, capa.status)}
                            </div>
                          </td>
                          <td style={tableCellStyle}>{capa.linked_to || "-"}</td>
                          <td style={tableCellStyle}>{formatDateTime(capa.updated_at || capa.created_at)}</td>
                          <td style={tableCellStyle}>
                            <div style={actionButtonsWrapStyle}>
                              <button type="button" onClick={() => startEditCapa(capa)} style={miniButtonStyle}>
                                Edit
                              </button>
                              <button type="button" onClick={() => deleteCapa(capa.id)} style={miniButtonDeleteStyle}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label style={fieldWrapStyle}>
      <span style={fieldLabelStyle}>{label}</span>
      {children}
    </label>
  );
}

function SectionCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section style={panelStyle}>
      <div style={sectionHeaderRowStyle}>
        <div>
          <h2 style={sectionTitleStyle}>{title}</h2>
          {subtitle ? <p style={sectionSubtitleStyle}>{subtitle}</p> : null}
        </div>
        {action || null}
      </div>
      {children}
    </section>
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
    <div
      style={{
        ...statCardStyle,
        borderTop: `4px solid ${accent}`,
      }}
    >
      <div style={statCardLabelStyle}>{title}</div>
      <div style={statCardValueStyle}>{value}</div>
    </div>
  );
}

function HeroPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "amber" | "red";
}) {
  const tones = {
    green: { bg: "rgba(220,252,231,0.15)", border: "rgba(220,252,231,0.26)", text: "#dcfce7" },
    amber: { bg: "rgba(254,243,199,0.15)", border: "rgba(254,243,199,0.28)", text: "#fef3c7" },
    red: { bg: "rgba(254,226,226,0.15)", border: "rgba(254,226,226,0.28)", text: "#fee2e2" },
  };

  const colours = tones[tone];

  return (
    <div
      style={{
        ...heroPillStyle,
        background: colours.bg,
        border: `1px solid ${colours.border}`,
      }}
    >
      <div style={heroPillLabelStyle}>{label}</div>
      <div style={{ ...heroPillValueStyle, color: colours.text }}>{value}</div>
    </div>
  );
}

function MiniListCard({
  title,
  emptyText,
  items,
}: {
  title: string;
  emptyText: string;
  items: Array<{
    id: string;
    line1: string;
    line2: string;
    tone: "red" | "amber";
  }>;
}) {
  return (
    <div style={miniListCardStyle}>
      <h3 style={miniListTitleStyle}>{title}</h3>

      {items.length === 0 ? (
        <p style={emptyTextStyle}>{emptyText}</p>
      ) : (
        <div style={miniListWrapStyle}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                ...miniListItemStyle,
                borderLeft: item.tone === "red" ? "4px solid #dc2626" : "4px solid #f59e0b",
                background: item.tone === "red" ? "#fef2f2" : "#fffbeb",
              }}
            >
              <div style={miniListLine1Style}>{item.line1}</div>
              <div style={miniListLine2Style}>{item.line2}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecordTypeBadge({ value }: { value: string }) {
  const styles =
    value === "NCR"
      ? { background: "#fee2e2", color: "#991b1b" }
      : { background: "#dbeafe", color: "#1d4ed8" };

  return <span style={{ ...badgeStyle, ...styles }}>{value}</span>;
}

function SourceBadge({ value }: { value: string }) {
  const lower = value.toLowerCase();

  const styles =
    lower === "internal"
      ? { background: "#dbeafe", color: "#1d4ed8" }
      : lower === "supplier"
      ? { background: "#fef3c7", color: "#92400e" }
      : lower === "external"
      ? { background: "#dcfce7", color: "#166534" }
      : { background: "#e5e7eb", color: "#374151" };

  return <span style={{ ...badgeStyle, ...styles }}>{value}</span>;
}

function StatusBadge({ value }: { value: string }) {
  const lower = value.toLowerCase();

  const styles =
    lower === "closed" || lower === "complete" || lower === "completed"
      ? { background: "#dcfce7", color: "#166534" }
      : lower === "open"
      ? { background: "#dbeafe", color: "#1d4ed8" }
      : lower === "in progress"
      ? { background: "#fef3c7", color: "#92400e" }
      : { background: "#e5e7eb", color: "#374151" };

  return <span style={{ ...badgeStyle, ...styles }}>{value}</span>;
}

function SeverityBadge({ value }: { value: string }) {
  const lower = value.toLowerCase();

  const styles =
    lower === "major"
      ? { background: "#fee2e2", color: "#991b1b" }
      : lower === "minor"
      ? { background: "#fef3c7", color: "#92400e" }
      : { background: "#e5e7eb", color: "#374151" };

  return <span style={{ ...badgeStyle, ...styles }}>{value}</span>;
}

const heroStyle: CSSProperties = {
  background: "linear-gradient(135deg, #0f766e 0%, #115e59 100%)",
  color: "white",
  borderRadius: "22px",
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
  opacity: 0.8,
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

const priorityStripStyle: CSSProperties = {
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

const heroMetaValueStyleSmall: CSSProperties = {
  fontSize: "15px",
  fontWeight: 700,
  lineHeight: 1.4,
};

const topUtilityRowStyle: CSSProperties = {
  marginBottom: "20px",
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
};

const backLinkStyle: CSSProperties = {
  color: "#0f766e",
  fontWeight: 700,
  textDecoration: "none",
};

const statusBannerInlineStyle: CSSProperties = {
  background: "white",
  borderRadius: "12px",
  padding: "12px 16px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
  color: "#0f172a",
};

const statsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
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

const twoColumnGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "20px",
  marginBottom: "20px",
};

const panelStyle: CSSProperties = {
  background: "white",
  borderRadius: "18px",
  padding: "20px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
  marginBottom: "20px",
};

const sectionHeaderRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  marginBottom: "16px",
  flexWrap: "wrap",
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

const fieldWrapStyle: CSSProperties = {
  display: "grid",
  gap: "6px",
};

const fieldLabelStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 700,
  color: "#334155",
};

const formGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "14px",
};

const inputStyle: CSSProperties = {
  padding: "11px 12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  background: "white",
  color: "#0f172a",
  width: "100%",
};

const readOnlyInputStyle: CSSProperties = {
  padding: "11px 12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  background: "#f8fafc",
  color: "#334155",
  width: "100%",
  fontWeight: 700,
};

const smallInputStyle: CSSProperties = {
  padding: "8px 10px",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  width: "100%",
  background: "white",
  color: "#0f172a",
};

const formFooterStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
  marginTop: "16px",
};

const helperTextStyle: CSSProperties = {
  color: "#64748b",
  fontSize: "13px",
};

const primaryButtonStyle: CSSProperties = {
  background: "#0f766e",
  color: "white",
  border: "none",
  padding: "11px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 700,
};

const secondaryButtonStyle: CSSProperties = {
  background: "#e2e8f0",
  color: "#0f172a",
  border: "none",
  padding: "10px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 700,
};

const miniButtonStyle: CSSProperties = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};

const miniButtonGreyStyle: CSSProperties = {
  background: "#64748b",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};

const miniButtonDeleteStyle: CSSProperties = {
  background: "#dc2626",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};

const filterBarStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
  gap: "12px",
  marginBottom: "16px",
};

const tableInfoRowStyle: CSSProperties = {
  marginBottom: "12px",
  color: "#475569",
  fontSize: "14px",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const tableHeadStyle: CSSProperties = {
  textAlign: "left",
  padding: "12px 10px",
  borderBottom: "1px solid #e2e8f0",
  color: "#475569",
  fontSize: "13px",
  whiteSpace: "nowrap",
};

const tableRowStyle: CSSProperties = {
  transition: "background 0.2s ease",
};

const tableCellStyle: CSSProperties = {
  padding: "14px 10px",
  borderBottom: "1px solid #f1f5f9",
  color: "#0f172a",
  verticalAlign: "middle",
};

const readOnlyTableCellStyle: CSSProperties = {
  padding: "8px 10px",
  borderRadius: "8px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  fontWeight: 700,
  color: "#334155",
};

const primaryCellTextStyle: CSSProperties = {
  fontWeight: 600,
  color: "#0f172a",
};

const secondaryCellTextStyle: CSSProperties = {
  fontSize: "12px",
  color: "#64748b",
  marginTop: "4px",
};

const recordNumberStyle: CSSProperties = {
  fontWeight: 800,
  color: "#0f766e",
  whiteSpace: "nowrap",
};

const emptyTableCellStyle: CSSProperties = {
  padding: "24px 10px",
  textAlign: "center",
  color: "#64748b",
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

const miniListCardStyle: CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  padding: "14px",
};

const miniListTitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: "12px",
  fontSize: "16px",
  color: "#0f172a",
};

const miniListWrapStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
};

const miniListItemStyle: CSSProperties = {
  borderRadius: "12px",
  padding: "12px 14px",
};

const miniListLine1Style: CSSProperties = {
  fontWeight: 700,
  color: "#0f172a",
  fontSize: "14px",
};

const miniListLine2Style: CSSProperties = {
  color: "#64748b",
  fontSize: "13px",
  marginTop: "4px",
  lineHeight: 1.45,
};

const emptyTextStyle: CSSProperties = {
  color: "#64748b",
  margin: 0,
};
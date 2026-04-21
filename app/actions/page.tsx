"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { supabase } from "../../src/lib/supabase";

type ActionItem = {
  id: string;
  action_number: string | null;
  title: string | null;
  project: string | null;
  owner: string | null;
  priority: string | null;
  status: string | null;
  due_date: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type EvidenceFile = {
  id: string;
  record_type: "ACTION" | "NCR" | "CAPA";
  record_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  content_type: string | null;
  notes: string | null;
  uploaded_at: string;
};

type ActionForm = {
  title: string;
  project: string;
  owner: string;
  priority: string;
  status: string;
  due_date: string;
};

const emptyForm: ActionForm = {
  title: "",
  project: "",
  owner: "",
  priority: "Medium",
  status: "Open",
  due_date: "",
};

function normaliseStatus(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function isClosedLikeStatus(value: string | null | undefined) {
  const status = normaliseStatus(value);
  return status === "closed" || status === "complete" || status === "completed";
}

function extractActionNumber(value: string | null | undefined) {
  if (!value) return null;

  const match = value.match(/(\d+)/);
  if (!match) return null;

  const num = Number(match[1]);
  return Number.isNaN(num) ? null : num;
}

function formatActionNumber(num: number) {
  return `ACT-${String(num).padStart(3, "0")}`;
}

function getNextAvailableActionNumber(actions: ActionItem[]) {
  const used = new Set(
    actions
      .map((action) => extractActionNumber(action.action_number))
      .filter((num): num is number => num !== null && num > 0)
  );

  let next = 1;
  while (used.has(next)) {
    next += 1;
  }

  return formatActionNumber(next);
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

function getDaysFromToday(value: string | null | undefined) {
  if (!value) return null;

  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return null;

  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffMs = due.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function isOverdue(action: ActionItem) {
  if (!action.due_date) return false;
  if (isClosedLikeStatus(action.status)) return false;

  const days = getDaysFromToday(action.due_date);
  return days !== null && days < 0;
}

function getDueLabel(value: string | null | undefined) {
  const days = getDaysFromToday(value);

  if (days === null) return "-";
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function matchesSearchTerm(action: ActionItem, query: string) {
  const lower = query.trim().toLowerCase();
  if (!lower) return true;

  return (
    (action.action_number || "").toLowerCase().includes(lower) ||
    (action.title || "").toLowerCase().includes(lower) ||
    (action.project || "").toLowerCase().includes(lower) ||
    (action.owner || "").toLowerCase().includes(lower) ||
    (action.priority || "").toLowerCase().includes(lower) ||
    (action.status || "").toLowerCase().includes(lower)
  );
}

function ActionsPageContent() {
  const searchParams = useSearchParams();

  const [actions, setActions] = useState<ActionItem[]>([]);
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [message, setMessage] = useState("Loading actions...");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const [form, setForm] = useState<ActionForm>(emptyForm);
  const [createFiles, setCreateFiles] = useState<File[]>([]);
  const [createEvidenceNotes, setCreateEvidenceNotes] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ActionForm>(emptyForm);

  const [selectedEvidenceAction, setSelectedEvidenceAction] = useState<ActionItem | null>(null);
  const [selectedEvidenceFiles, setSelectedEvidenceFiles] = useState<File[]>([]);
  const [selectedEvidenceNotes, setSelectedEvidenceNotes] = useState("");

  async function loadActions(showLoadedMessage = true) {
    setIsLoading(true);

    const [{ data: actionsData, error: actionsError }, { data: evidenceData, error: evidenceError }] =
      await Promise.all([
        supabase.from("actions").select("*"),
        supabase
          .from("evidence_files")
          .select("*")
          .eq("record_type", "ACTION")
          .order("uploaded_at", { ascending: false }),
      ]);

    if (actionsError) {
      setMessage(`Error: ${actionsError.message}`);
      setIsLoading(false);
      return;
    }

    if (evidenceError) {
      setMessage(`Evidence load failed: ${evidenceError.message}`);
      setIsLoading(false);
      return;
    }

    const sorted = [...((actionsData || []) as ActionItem[])].sort((a, b) => {
      const aNum = extractActionNumber(a.action_number);
      const bNum = extractActionNumber(b.action_number);

      if (aNum !== null && bNum !== null) return aNum - bNum;
      if (aNum !== null) return -1;
      if (bNum !== null) return 1;

      return (a.action_number || "").localeCompare(b.action_number || "");
    });

    setActions(sorted);
    setEvidenceFiles((evidenceData as EvidenceFile[]) || []);
    setLastRefreshed(new Date());
    setIsLoading(false);

    if (showLoadedMessage) {
      setMessage(`Loaded ${sorted.length} action${sorted.length === 1 ? "" : "s"} successfully.`);
    }
  }

  useEffect(() => {
    void loadActions();
  }, []);

  useEffect(() => {
    const linkedSearch = searchParams.get("search") || "";
    if (linkedSearch.trim()) {
      setSearch(linkedSearch.trim());
    }
  }, [searchParams]);

  const nextActionNumber = useMemo(() => {
    return getNextAvailableActionNumber(actions);
  }, [actions]);

  const evidenceCountMap = useMemo(() => {
    const map = new Map<string, number>();
    evidenceFiles.forEach((file) => {
      map.set(file.record_id, (map.get(file.record_id) || 0) + 1);
    });
    return map;
  }, [evidenceFiles]);

  const selectedActionEvidence = useMemo(() => {
    if (!selectedEvidenceAction) return [];
    return evidenceFiles.filter((file) => file.record_id === selectedEvidenceAction.id);
  }, [evidenceFiles, selectedEvidenceAction]);

  const openActions = actions.filter((a) => !isClosedLikeStatus(a.status)).length;
  const closedActions = actions.filter((a) => isClosedLikeStatus(a.status)).length;
  const overdueActions = actions.filter((a) => isOverdue(a)).length;
  const highPriorityOpen = actions.filter(
    (a) => (a.priority || "").toLowerCase() === "high" && !isClosedLikeStatus(a.status)
  ).length;

  const dueThisWeek = actions.filter((a) => {
    if (!a.due_date) return false;
    if (isClosedLikeStatus(a.status)) return false;

    const days = getDaysFromToday(a.due_date);
    return days !== null && days >= 0 && days <= 7;
  }).length;

  const filteredActions = useMemo(() => {
    return actions.filter((action) => {
      const matchesSearch = matchesSearchTerm(action, search);
      const matchesStatus = !statusFilter || (action.status || "") === statusFilter;
      const matchesPriority = !priorityFilter || (action.priority || "") === priorityFilter;
      const matchesOwner = !ownerFilter || (action.owner || "") === ownerFilter;
      const matchesProject = !projectFilter || (action.project || "") === projectFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesOwner && matchesProject;
    });
  }, [actions, search, statusFilter, priorityFilter, ownerFilter, projectFilter]);

  const overdueList = useMemo(() => {
    return [...actions]
      .filter((action) => isOverdue(action))
      .sort((a, b) => {
        const aDate = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        const bDate = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
      })
      .slice(0, 5);
  }, [actions]);

  const dueSoonList = useMemo(() => {
    return [...actions]
      .filter((action) => {
        if (!action.due_date) return false;
        if (isClosedLikeStatus(action.status)) return false;

        const days = getDaysFromToday(action.due_date);
        return days !== null && days >= 0 && days <= 7;
      })
      .sort((a, b) => {
        const aDate = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        const bDate = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
      })
      .slice(0, 5);
  }, [actions]);

  const linkedAction = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return null;

    return (
      filteredActions.find(
        (action) => (action.action_number || "").trim().toLowerCase() === query
      ) || null
    );
  }, [filteredActions, search]);

  useEffect(() => {
    if (!linkedAction) return;
    setSelectedEvidenceAction((current) => current?.id === linkedAction.id ? current : linkedAction);
  }, [linkedAction]);

  const uniqueOwners = useMemo(() => {
    return [...new Set(actions.map((a) => a.owner).filter(Boolean))].sort();
  }, [actions]);

  const uniqueProjects = useMemo(() => {
    return [...new Set(actions.map((a) => a.project).filter(Boolean))].sort();
  }, [actions]);

  function handleCreateFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    setCreateFiles(files);
  }

  function handleSelectedEvidenceFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    setSelectedEvidenceFiles(files);
  }

  async function uploadEvidenceForRecord(recordId: string, files: File[], notes: string) {
    if (!files.length) return { ok: true as const };

    const metadataRows: Array<{
      record_type: "ACTION";
      record_id: string;
      file_name: string;
      file_path: string;
      file_size: number;
      content_type: string;
      notes: string | null;
    }> = [];

    for (const file of files) {
      const safeName = sanitizeFileName(file.name);
      const filePath = `ACTION/${recordId}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}-${safeName}`;

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
        record_type: "ACTION",
        record_id: recordId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        content_type: file.type || "application/octet-stream",
        notes: notes.trim() || null,
      });
    }

    const { error: metadataError } = await supabase.from("evidence_files").insert(metadataRows);

    if (metadataError) {
      return { ok: false as const, message: metadataError.message };
    }

    return { ok: true as const };
  }

  async function addAction(e: React.FormEvent) {
    e.preventDefault();

    if (!form.title.trim()) {
      setMessage("Title is required.");
      return;
    }

    setIsSaving(true);

    const actionNumberToUse = getNextAvailableActionNumber(actions);

    const { data, error } = await supabase
      .from("actions")
      .insert([
        {
          action_number: actionNumberToUse,
          title: form.title.trim(),
          project: form.project.trim() || null,
          owner: form.owner.trim() || null,
          priority: form.priority,
          status: form.status,
          due_date: form.due_date || null,
        },
      ])
      .select("*")
      .single();

    if (error || !data) {
      setIsSaving(false);
      setMessage(`Add action failed: ${error?.message || "Unknown error"}`);
      return;
    }

    if (createFiles.length > 0) {
      const uploadResult = await uploadEvidenceForRecord(data.id, createFiles, createEvidenceNotes);

      if (!uploadResult.ok) {
        setIsSaving(false);
        setMessage(`Action created, but evidence upload failed: ${uploadResult.message}`);
        await loadActions(false);
        return;
      }
    }

    setForm(emptyForm);
    setCreateFiles([]);
    setCreateEvidenceNotes("");
    setIsSaving(false);
    setMessage(`Action ${actionNumberToUse} added successfully.`);
    await loadActions(false);
  }

  function startEdit(action: ActionItem) {
    setEditingId(action.id);
    setEditForm({
      title: action.title || "",
      project: action.project || "",
      owner: action.owner || "",
      priority: action.priority || "Medium",
      status: action.status || "Open",
      due_date: action.due_date || "",
    });
  }

  async function saveEdit(id: string) {
    if (!editForm.title.trim()) {
      setMessage("Title is required.");
      return;
    }

    setIsSaving(true);

    const { error } = await supabase
      .from("actions")
      .update({
        title: editForm.title.trim(),
        project: editForm.project.trim() || null,
        owner: editForm.owner.trim() || null,
        priority: editForm.priority,
        status: editForm.status,
        due_date: editForm.due_date || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    setIsSaving(false);

    if (error) {
      setMessage(`Update failed: ${error.message}`);
      return;
    }

    setEditingId(null);
    setMessage("Action updated successfully.");
    await loadActions(false);
  }

  async function deleteAction(id: string) {
    if (!window.confirm("Delete this action? This does not automatically delete evidence files.")) {
      return;
    }

    const { error } = await supabase.from("actions").delete().eq("id", id);

    if (error) {
      setMessage(`Delete failed: ${error.message}`);
      return;
    }

    if (selectedEvidenceAction?.id === id) {
      setSelectedEvidenceAction(null);
      setSelectedEvidenceFiles([]);
      setSelectedEvidenceNotes("");
    }

    setMessage("Action deleted successfully.");
    await loadActions(false);
  }

  async function uploadEvidenceToSelectedAction() {
    if (!selectedEvidenceAction) {
      setMessage("Select an action first.");
      return;
    }

    if (selectedEvidenceFiles.length === 0) {
      setMessage("Select at least one evidence file to upload.");
      return;
    }

    setIsUploadingEvidence(true);

    const uploadResult = await uploadEvidenceForRecord(
      selectedEvidenceAction.id,
      selectedEvidenceFiles,
      selectedEvidenceNotes
    );

    setIsUploadingEvidence(false);

    if (!uploadResult.ok) {
      setMessage(`Evidence upload failed: ${uploadResult.message}`);
      return;
    }

    setSelectedEvidenceFiles([]);
    setSelectedEvidenceNotes("");
    setMessage("Evidence uploaded successfully.");
    await loadActions(false);
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
    await loadActions(false);
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("");
    setPriorityFilter("");
    setOwnerFilter("");
    setProjectFilter("");
    setSelectedEvidenceAction(null);
  }

  return (
    <main>
      <section style={heroStyle}>
        <div style={{ flex: "1 1 620px" }}>
          <div style={eyebrowStyle}>Action Register</div>
          <h1 style={heroTitleStyle}>Actions</h1>
          <p style={heroSubtitleStyle}>
            Track ownership, due dates, priorities, progress and supporting evidence in one place.
            Linked actions can be opened directly from other modules using the action number.
          </p>

          <div style={priorityStripStyle}>
            <HeroPill label="Open" value={openActions} tone={openActions > 0 ? "blue" : "neutral"} />
            <HeroPill label="Overdue" value={overdueActions} tone={overdueActions > 0 ? "red" : "green"} />
            <HeroPill label="Due This Week" value={dueThisWeek} tone={dueThisWeek > 0 ? "amber" : "green"} />
            <HeroPill
              label="High Priority Open"
              value={highPriorityOpen}
              tone={highPriorityOpen > 0 ? "red" : "green"}
            />
          </div>
        </div>

        <div style={heroMetaWrapStyle}>
          <div style={heroMetaCardStyle}>
            <div style={heroMetaLabelStyle}>Next Action Number</div>
            <div style={heroMetaValueStyle}>{nextActionNumber}</div>
          </div>

          <div style={heroMetaCardStyle}>
            <div style={heroMetaLabelStyle}>Last Refreshed</div>
            <div style={heroMetaValueStyleSmall}>
              {isLoading ? "Loading..." : formatDateTime(lastRefreshed?.toISOString())}
            </div>
          </div>

          <div style={heroMetaCardStyle}>
            <div style={heroMetaLabelStyle}>Current View</div>
            <div style={heroMetaValueStyleSmall}>
              {filteredActions.length} shown / {actions.length} total
            </div>
          </div>

          <div style={heroMetaCardStyle}>
            <div style={heroMetaLabelStyle}>Evidence Files</div>
            <div style={heroMetaValueStyleSmall}>{evidenceFiles.length}</div>
          </div>
        </div>
      </section>

      <div
        style={{
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <Link href="/" style={backLinkStyle}>
          ← Back to Dashboard
        </Link>

        <div style={statusBannerStyleInline}>
          <strong>Status:</strong> {message}
        </div>
      </div>

      <section style={statsGridStyle}>
        <StatCard title="Open Actions" value={openActions} accent="#2563eb" />
        <StatCard title="Closed / Complete" value={closedActions} accent="#16a34a" />
        <StatCard title="Overdue Actions" value={overdueActions} accent="#dc2626" />
        <StatCard title="Evidence Files" value={evidenceFiles.length} accent="#7c3aed" />
      </section>

      <section style={twoColumnGridStyle}>
        <SectionCard
          title="Create Action"
          subtitle="Add a new action with automatic numbering, project tracking and optional evidence upload."
        >
          <form onSubmit={addAction}>
            <div style={formGridStyle}>
              <Field label="Action Number">
                <input value={nextActionNumber} readOnly style={readOnlyInputStyle} />
              </Field>

              <Field label="Project">
                <input
                  placeholder="e.g. Wadden Sea"
                  value={form.project}
                  onChange={(e) => setForm({ ...form, project: e.target.value })}
                  style={inputStyle}
                />
              </Field>

              <Field label="Title">
                <input
                  placeholder="Enter action title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  style={inputStyle}
                />
              </Field>

              <Field label="Owner">
                <input
                  placeholder="Enter owner"
                  value={form.owner}
                  onChange={(e) => setForm({ ...form, owner: e.target.value })}
                  style={inputStyle}
                />
              </Field>

              <Field label="Priority">
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  style={inputStyle}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </Field>

              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  style={inputStyle}
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Closed">Closed</option>
                  <option value="Complete">Complete</option>
                </select>
              </Field>

              <Field label="Due Date">
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  style={inputStyle}
                />
              </Field>

              <Field label="Evidence Files (optional)">
                <input type="file" multiple onChange={handleCreateFileChange} style={inputStyle} />
              </Field>

              <Field label="Evidence Notes (optional)">
                <textarea
                  placeholder="Add a note for the uploaded evidence"
                  value={createEvidenceNotes}
                  onChange={(e) => setCreateEvidenceNotes(e.target.value)}
                  style={textAreaStyle}
                />
              </Field>
            </div>

            <SelectedFilesList files={createFiles} />

            <div style={formFooterStyle}>
              <button type="submit" style={primaryButtonStyle} disabled={isSaving}>
                {isSaving ? "Saving..." : "Add Action"}
              </button>
              <span style={helperTextStyle}>
                Numbering fills the next available slot automatically. Evidence uploads after the action is created.
              </span>
            </div>
          </form>
        </SectionCard>

        <SectionCard title="Priority View" subtitle="What needs chasing right now.">
          <div style={listGridStyle}>
            <MiniListCard
              title="Overdue First"
              emptyText="No overdue open actions."
              items={overdueList.map((action) => ({
                id: action.id,
                line1: `${action.action_number || "-"} — ${action.title || "Untitled action"}`,
                line2: `${action.project || "No project"} · ${action.owner || "No owner"} · ${getDueLabel(
                  action.due_date
                )}`,
                tone: "red" as const,
              }))}
            />

            <MiniListCard
              title="Due This Week"
              emptyText="No open actions due this week."
              items={dueSoonList.map((action) => ({
                id: action.id,
                line1: `${action.action_number || "-"} — ${action.title || "Untitled action"}`,
                line2: `${action.project || "No project"} · ${action.owner || "No owner"} · ${getDueLabel(
                  action.due_date
                )}`,
                tone: "amber" as const,
              }))}
            />
          </div>
        </SectionCard>
      </section>

      <SectionCard
        title="Search and Filter"
        subtitle="Narrow the register by text, status, priority, owner or project."
        action={
          <button type="button" onClick={clearFilters} style={secondaryButtonStyle}>
            Clear Filters
          </button>
        }
      >
        <div style={filterBarStyle}>
          <input
            placeholder="Search action no. / title / project / owner"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={inputStyle}
          />

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
            <option value="">All Status</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Closed">Closed</option>
            <option value="Complete">Complete</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={inputStyle}
          >
            <option value="">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>

          <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} style={inputStyle}>
            <option value="">All Owners</option>
            {uniqueOwners.map((owner) => (
              <option key={String(owner)} value={String(owner)}>
                {String(owner)}
              </option>
            ))}
          </select>

          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            style={inputStyle}
          >
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
            Showing <strong>{filteredActions.length}</strong> of <strong>{actions.length}</strong> actions
          </span>
          {linkedAction ? (
            <span style={linkedSearchHintStyle}>
              Linked match found: <strong>{linkedAction.action_number}</strong>
            </span>
          ) : null}
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={tableHeadStyle}>Action No.</th>
                <th style={tableHeadStyle}>Title</th>
                <th style={tableHeadStyle}>Project</th>
                <th style={tableHeadStyle}>Owner</th>
                <th style={tableHeadStyle}>Priority</th>
                <th style={tableHeadStyle}>Status</th>
                <th style={tableHeadStyle}>Due Date</th>
                <th style={tableHeadStyle}>Evidence</th>
                <th style={tableHeadStyle}>Updated</th>
                <th style={tableHeadStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredActions.length === 0 ? (
                <tr>
                  <td colSpan={10} style={emptyTableCellStyle}>
                    No actions match the current filters.
                  </td>
                </tr>
              ) : (
                filteredActions.map((action) => {
                  const overdue = isOverdue(action);
                  const evidenceCount = evidenceCountMap.get(action.id) || 0;
                  const evidenceActive = selectedEvidenceAction?.id === action.id;
                  const linkedMatch =
                    search.trim() &&
                    (action.action_number || "").trim().toLowerCase() === search.trim().toLowerCase();

                  return (
                    <tr
                      key={action.id}
                      style={{
                        ...tableRowStyle,
                        background: overdue
                          ? "#fff7f7"
                          : evidenceActive
                          ? "#f5f3ff"
                          : linkedMatch
                          ? "#eff6ff"
                          : "white",
                      }}
                    >
                      {editingId === action.id ? (
                        <>
                          <td style={tableCellStyle}>
                            <div style={readOnlyTableCellStyle}>{action.action_number || "-"}</div>
                          </td>
                          <td style={tableCellStyle}>
                            <input
                              value={editForm.title}
                              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                              style={smallInputStyle}
                            />
                          </td>
                          <td style={tableCellStyle}>
                            <input
                              value={editForm.project}
                              onChange={(e) => setEditForm({ ...editForm, project: e.target.value })}
                              style={smallInputStyle}
                            />
                          </td>
                          <td style={tableCellStyle}>
                            <input
                              value={editForm.owner}
                              onChange={(e) => setEditForm({ ...editForm, owner: e.target.value })}
                              style={smallInputStyle}
                            />
                          </td>
                          <td style={tableCellStyle}>
                            <select
                              value={editForm.priority}
                              onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                              style={smallInputStyle}
                            >
                              <option value="Low">Low</option>
                              <option value="Medium">Medium</option>
                              <option value="High">High</option>
                            </select>
                          </td>
                          <td style={tableCellStyle}>
                            <select
                              value={editForm.status}
                              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
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
                              value={editForm.due_date}
                              onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                              style={smallInputStyle}
                            />
                          </td>
                          <td style={tableCellStyle}>
                            <span style={evidenceCountBadgeStyle}>{evidenceCount}</span>
                          </td>
                          <td style={tableCellStyle}>
                            {formatDateTime(action.updated_at || action.created_at)}
                          </td>
                          <td style={tableCellStyle}>
                            <div style={actionButtonsWrapStyle}>
                              <button
                                type="button"
                                onClick={() => saveEdit(action.id)}
                                style={miniButtonStyle}
                                disabled={isSaving}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                style={miniButtonGreyStyle}
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={tableCellStyle}>
                            <div style={actionNumberCellStyle}>{action.action_number || "-"}</div>
                          </td>
                          <td style={tableCellStyle}>
                            <div style={primaryCellTextStyle}>{action.title || "-"}</div>
                            <div style={secondaryCellTextStyle}>
                              {overdue ? getDueLabel(action.due_date) : " "}
                            </div>
                          </td>
                          <td style={tableCellStyle}>{action.project || "-"}</td>
                          <td style={tableCellStyle}>{action.owner || "-"}</td>
                          <td style={tableCellStyle}>
                            <PriorityBadge value={action.priority || "Unknown"} />
                          </td>
                          <td style={tableCellStyle}>
                            <StatusBadge value={action.status || "Unknown"} />
                          </td>
                          <td style={tableCellStyle}>
                            <div style={primaryCellTextStyle}>{formatDate(action.due_date)}</div>
                            <div
                              style={{
                                ...secondaryCellTextStyle,
                                color: overdue ? "#b91c1c" : "#64748b",
                                fontWeight: overdue ? 700 : 500,
                              }}
                            >
                              {getDueLabel(action.due_date)}
                            </div>
                          </td>
                          <td style={tableCellStyle}>
                            <span style={evidenceCountBadgeStyle}>{evidenceCount}</span>
                          </td>
                          <td style={tableCellStyle}>
                            {formatDateTime(action.updated_at || action.created_at)}
                          </td>
                          <td style={tableCellStyle}>
                            <div style={actionButtonsWrapStyle}>
                              <button type="button" onClick={() => startEdit(action)} style={miniButtonStyle}>
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedEvidenceAction(action)}
                                style={miniButtonPurpleStyle}
                              >
                                Evidence
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteAction(action.id)}
                                style={miniButtonDeleteStyle}
                              >
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

      <SectionCard
        title={
          selectedEvidenceAction
            ? `Evidence Manager — ${selectedEvidenceAction.action_number || "Action"}`
            : "Evidence Manager"
        }
        subtitle={
          selectedEvidenceAction
            ? "Upload follow-up evidence, preview files and remove anything no longer needed."
            : "Select the Evidence button on any action to manage files."
        }
        action={
          selectedEvidenceAction ? (
            <button
              type="button"
              onClick={() => {
                setSelectedEvidenceAction(null);
                setSelectedEvidenceFiles([]);
                setSelectedEvidenceNotes("");
              }}
              style={secondaryButtonStyle}
            >
              Close Evidence Panel
            </button>
          ) : null
        }
      >
        {!selectedEvidenceAction ? (
          <div style={emptyEvidencePanelStyle}>No action selected for evidence management.</div>
        ) : (
          <div style={evidencePanelGridStyle}>
            <div style={evidenceUploadCardStyle}>
              <div style={evidencePanelHeadingStyle}>Upload Evidence</div>
              <div style={evidenceMetaTextStyle}>
                Add one or more files against{" "}
                <strong>{selectedEvidenceAction.action_number || "this action"}</strong>.
              </div>

              <div style={evidenceFieldWrapStyle}>
                <label style={fieldLabelStyle}>Select files</label>
                <input type="file" multiple onChange={handleSelectedEvidenceFileChange} style={inputStyle} />
              </div>

              <div style={evidenceFieldWrapStyle}>
                <label style={fieldLabelStyle}>Evidence Notes (optional)</label>
                <textarea
                  placeholder="Add a note for the uploaded evidence"
                  value={selectedEvidenceNotes}
                  onChange={(e) => setSelectedEvidenceNotes(e.target.value)}
                  style={textAreaStyle}
                />
              </div>

              <SelectedFilesList files={selectedEvidenceFiles} />

              <div style={formFooterStyle}>
                <button
                  type="button"
                  onClick={uploadEvidenceToSelectedAction}
                  style={primaryButtonStyle}
                  disabled={isUploadingEvidence}
                >
                  {isUploadingEvidence ? "Uploading..." : "Upload Evidence"}
                </button>
              </div>
            </div>

            <div style={evidenceListCardStyle}>
              <div style={evidencePanelHeadingStyle}>Attached Files</div>

              {selectedActionEvidence.length === 0 ? (
                <p style={emptyTextStyle}>No evidence attached to this action yet.</p>
              ) : (
                <div style={evidenceListWrapStyle}>
                  {selectedActionEvidence.map((file) => (
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
                        <button type="button" onClick={() => openEvidence(file)} style={miniButtonStyle}>
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteEvidence(file)}
                          style={miniButtonDeleteStyle}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SectionCard>
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
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

function StatCard({ title, value, accent }: { title: string; value: number; accent: string }) {
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
  tone: "green" | "amber" | "red" | "blue" | "neutral";
}) {
  const tones = {
    green: { bg: "rgba(220,252,231,0.15)", border: "rgba(220,252,231,0.26)", text: "#dcfce7" },
    amber: { bg: "rgba(254,243,199,0.15)", border: "rgba(254,243,199,0.28)", text: "#fef3c7" },
    red: { bg: "rgba(254,226,226,0.15)", border: "rgba(254,226,226,0.28)", text: "#fee2e2" },
    blue: { bg: "rgba(219,234,254,0.15)", border: "rgba(219,234,254,0.28)", text: "#dbeafe" },
    neutral: { bg: "rgba(255,255,255,0.12)", border: "rgba(255,255,255,0.20)", text: "#ffffff" },
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

function SelectedFilesList({ files }: { files: File[] }) {
  if (files.length === 0) {
    return <div style={selectedFilesEmptyStyle}>No files selected.</div>;
  }

  return (
    <div style={selectedFilesWrapStyle}>
      {files.map((file, index) => (
        <div key={`${file.name}-${index}`} style={selectedFileChipStyle}>
          <span>{file.name}</span>
          <span style={selectedFileMetaStyle}>{formatFileSize(file.size)}</span>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  const lower = normaliseStatus(value);

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

function PriorityBadge({ value }: { value: string }) {
  const lower = value.toLowerCase();

  const styles =
    lower === "high"
      ? { background: "#fee2e2", color: "#991b1b" }
      : lower === "medium"
      ? { background: "#fef3c7", color: "#92400e" }
      : lower === "low"
      ? { background: "#dcfce7", color: "#166534" }
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

const backLinkStyle: CSSProperties = {
  color: "#0f766e",
  fontWeight: 700,
  textDecoration: "none",
};

const statusBannerStyleInline: CSSProperties = {
  background: "white",
  borderRadius: "12px",
  padding: "12px 16px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
  color: "#0f172a",
};

const statsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
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
  gridTemplateColumns: "1.15fr 0.85fr",
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
  boxSizing: "border-box",
};

const textAreaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: "92px",
  resize: "vertical",
  fontFamily: "Arial, Helvetica, sans-serif",
};

const readOnlyInputStyle: CSSProperties = {
  padding: "11px 12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  background: "#f8fafc",
  color: "#334155",
  width: "100%",
  fontWeight: 700,
  boxSizing: "border-box",
};

const smallInputStyle: CSSProperties = {
  padding: "8px 10px",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  width: "100%",
  background: "white",
  color: "#0f172a",
  boxSizing: "border-box",
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

const miniButtonPurpleStyle: CSSProperties = {
  background: "#7c3aed",
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

const listGridStyle: CSSProperties = {
  display: "grid",
  gap: "16px",
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
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
};

const linkedSearchHintStyle: CSSProperties = {
  color: "#1d4ed8",
  fontWeight: 600,
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

const primaryCellTextStyle: CSSProperties = {
  fontWeight: 600,
  color: "#0f172a",
};

const secondaryCellTextStyle: CSSProperties = {
  fontSize: "12px",
  color: "#64748b",
  marginTop: "4px",
};

const actionNumberCellStyle: CSSProperties = {
  fontWeight: 800,
  color: "#0f766e",
  whiteSpace: "nowrap",
};

const readOnlyTableCellStyle: CSSProperties = {
  padding: "8px 10px",
  borderRadius: "8px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  fontWeight: 700,
  color: "#334155",
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

const emptyTextStyle: CSSProperties = {
  color: "#64748b",
  margin: 0,
};

const selectedFilesWrapStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginTop: "14px",
};

const selectedFileChipStyle: CSSProperties = {
  display: "inline-flex",
  gap: "8px",
  alignItems: "center",
  padding: "8px 10px",
  borderRadius: "999px",
  background: "#eef2ff",
  color: "#3730a3",
  fontSize: "12px",
  fontWeight: 700,
};

const selectedFileMetaStyle: CSSProperties = {
  opacity: 0.8,
};

const selectedFilesEmptyStyle: CSSProperties = {
  marginTop: "14px",
  fontSize: "13px",
  color: "#64748b",
};

const evidenceCountBadgeStyle: CSSProperties = {
  display: "inline-block",
  minWidth: "32px",
  textAlign: "center",
  padding: "5px 10px",
  borderRadius: "999px",
  background: "#ede9fe",
  color: "#6d28d9",
  fontWeight: 800,
  fontSize: "12px",
};

const emptyEvidencePanelStyle: CSSProperties = {
  padding: "18px",
  borderRadius: "14px",
  background: "#f8fafc",
  border: "1px dashed #cbd5e1",
  color: "#64748b",
};

const evidencePanelGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "0.95fr 1.05fr",
  gap: "18px",
};

const evidenceUploadCardStyle: CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  padding: "16px",
};

const evidenceListCardStyle: CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  padding: "16px",
};

const evidencePanelHeadingStyle: CSSProperties = {
  fontSize: "16px",
  fontWeight: 700,
  color: "#0f172a",
  marginBottom: "10px",
};

const evidenceMetaTextStyle: CSSProperties = {
  fontSize: "13px",
  color: "#64748b",
  lineHeight: 1.45,
};

const evidenceFieldWrapStyle: CSSProperties = {
  display: "grid",
  gap: "6px",
  marginTop: "14px",
};

const evidenceListWrapStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
};

const evidenceItemStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "14px",
  padding: "14px",
  borderRadius: "12px",
  background: "white",
  border: "1px solid #e2e8f0",
};

const evidenceFileNameStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 700,
  color: "#0f172a",
  wordBreak: "break-word",
};

const evidenceNoteStyle: CSSProperties = {
  marginTop: "6px",
  fontSize: "13px",
  color: "#475569",
  lineHeight: 1.45,
};
export default function ActionsPage() {
  return (
    <Suspense fallback={<main style={{ padding: "24px" }}>Loading actions...</main>}>
      <ActionsPageContent />
    </Suspense>
  );
}
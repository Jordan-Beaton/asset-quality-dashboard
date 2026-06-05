"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { QualityKpiCard } from "../../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../../src/components/QualityPageHero";
import { supabase } from "../../../src/lib/supabase";

export const dynamic = "force-dynamic";

type Asset = {
  id: string;
  asset_code: string | null;
  name: string | null;
  description: string | null;
  owner: string | null;
  location: string | null;
  status: string | null;
};

type AssetMaintenanceRecord = {
  id: string;
  asset_id: string;
  maintenance_number: string | null;
  maintenance_date: string | null;
  maintenance_type: string | null;
  carried_out_by: string | null;
  action_required: boolean | null;
  description: string | null;
  next_maintenance_due: string | null;
  file_name: string | null;
  file_path: string | null;
  created_at: string | null;
};

type AssetPerson = {
  id: string;
  name: string;
  role: string | null;
  active: boolean;
};

type NewMaintenanceForm = {
  asset_id: string;
  maintenance_date: string;
  carried_out_by: string;
  maintenance_type: "Preventative" | "Corrective";
  description: string;
  next_maintenance_due: string;
  action_required: boolean;
  file: File | null;
};

type DueStatus = "Overdue" | "Due Soon" | "In Date" | "Not Set";

const STORAGE_BUCKET = "asset-files";

const emptyNewMaintenance: NewMaintenanceForm = {
  asset_id: "",
  maintenance_date: "",
  carried_out_by: "",
  maintenance_type: "Preventative",
  description: "",
  next_maintenance_due: "",
  action_required: false,
  file: null,
};

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

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getDaysRemaining(value: string | null | undefined) {
  if (!value) return null;
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getDueStatus(value: string | null | undefined): DueStatus {
  const days = getDaysRemaining(value);
  if (days === null) return "Not Set";
  if (days < 0) return "Overdue";
  if (days <= 30) return "Due Soon";
  return "In Date";
}

function getStatusTone(status: DueStatus) {
  if (status === "Overdue") return { bg: "#fee2e2", text: "#991b1b", border: "#fecaca" };
  if (status === "Due Soon") return { bg: "#fef3c7", text: "#92400e", border: "#fde68a" };
  if (status === "In Date") return { bg: "#dcfce7", text: "#166534", border: "#bbf7d0" };
  return { bg: "#e2e8f0", text: "#334155", border: "#cbd5e1" };
}

function getStatusRank(status: DueStatus) {
  if (status === "Overdue") return 0;
  if (status === "Due Soon") return 1;
  if (status === "In Date") return 2;
  return 3;
}

function getTypeTone(type: string | null | undefined) {
  const value = (type || "").toLowerCase();
  if (value === "corrective") return { bg: "#fee2e2", text: "#991b1b" };
  if (value === "preventative") return { bg: "#dbeafe", text: "#1d4ed8" };
  return { bg: "#e2e8f0", text: "#334155" };
}

function extractMaintenanceNumber(value: string | null | undefined) {
  const match = (value || "").match(/MNT-(\d+)/i);
  return match ? Number(match[1]) : null;
}

function formatMaintenanceNumber(num: number) {
  return `MNT-${String(num).padStart(3, "0")}`;
}

function buildMaintenanceForm(record: AssetMaintenanceRecord): NewMaintenanceForm {
  return {
    asset_id: record.asset_id,
    maintenance_date: record.maintenance_date || "",
    carried_out_by: record.carried_out_by || "",
    maintenance_type: (record.maintenance_type as NewMaintenanceForm["maintenance_type"]) || "Preventative",
    description: record.description || "",
    next_maintenance_due: record.next_maintenance_due || "",
    action_required: Boolean(record.action_required),
    file: null,
  };
}

async function createSignedFileUrl(path: string) {
  if (!path) return "";
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return "";
  return data.signedUrl;
}

async function uploadMaintenanceFile(assetId: string, file: File) {
  const safeName = sanitizeFileName(file.name);
  const path = `Maintenance/${assetId}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(error.message);
  return path;
}

function MaintenancePageContent() {
  const searchParams = useSearchParams();
  const linkedAssetParam = searchParams.get("asset")?.trim() || "";
  const isFieldMode = Boolean(linkedAssetParam);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [people, setPeople] = useState<AssetPerson[]>([]);
  const [records, setRecords] = useState<AssetMaintenanceRecord[]>([]);
  const [message, setMessage] = useState("Loading maintenance log...");
  const [lastRefreshed, setLastRefreshed] = useState("");
  const [newMaintenance, setNewMaintenance] = useState<NewMaintenanceForm>(emptyNewMaintenance);
  const [detailForm, setDetailForm] = useState<NewMaintenanceForm>(emptyNewMaintenance);
  const [assetFilter, setAssetFilter] = useState(linkedAssetParam);
  const [typeFilter, setTypeFilter] = useState("");
  const [showRegisterFilters, setShowRegisterFilters] = useState(Boolean(linkedAssetParam));
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingDetail, setIsSavingDetail] = useState(false);
  const [openingId, setOpeningId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [selectedRecordId, setSelectedRecordId] = useState("");

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (!linkedAssetParam || assets.length === 0) return;

    const match = assets.find(
      (asset) =>
        (asset.asset_code || "").toLowerCase() === linkedAssetParam.toLowerCase() ||
        asset.id.toLowerCase() === linkedAssetParam.toLowerCase()
    );

    if (!match) return;

    setNewMaintenance((prev) => (prev.asset_id ? prev : { ...prev, asset_id: match.id }));
    setAssetFilter(linkedAssetParam);
  }, [assets, linkedAssetParam]);

  async function loadData() {
    const [assetsRes, maintenanceRes, peopleRes] = await Promise.all([
      supabase.from("assets").select("*").order("name", { ascending: true }),
      supabase.from("asset_maintenance_records").select("*").order("maintenance_date", { ascending: false }),
      supabase
        .from("people")
        .select("id,name,role,active")
        .eq("active", true)
        .order("name", { ascending: true }),
    ]);

    if (assetsRes.error || maintenanceRes.error || peopleRes.error) {
      setMessage(
        `Load failed: ${assetsRes.error?.message || maintenanceRes.error?.message || peopleRes.error?.message || "Unknown error"}`
      );
      return;
    }

    setAssets((assetsRes.data || []) as Asset[]);
    setRecords((maintenanceRes.data || []) as AssetMaintenanceRecord[]);
    setPeople((peopleRes.data || []) as AssetPerson[]);
    setLastRefreshed(new Date().toLocaleString("en-GB"));
    setMessage("Maintenance log loaded.");
  }

  const peopleOptions = useMemo(
    () =>
      people
        .map((person) => person.name.trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
    [people]
  );

  const createPeopleOptions = useMemo(() => {
    if (!newMaintenance.carried_out_by || peopleOptions.includes(newMaintenance.carried_out_by)) return peopleOptions;
    return [newMaintenance.carried_out_by, ...peopleOptions];
  }, [newMaintenance.carried_out_by, peopleOptions]);

  const detailPeopleOptions = useMemo(() => {
    if (!detailForm.carried_out_by || peopleOptions.includes(detailForm.carried_out_by)) return peopleOptions;
    return [detailForm.carried_out_by, ...peopleOptions];
  }, [detailForm.carried_out_by, peopleOptions]);

  const assetMap = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);
  const selectedRecord = useMemo(
    () => records.find((record) => record.id === selectedRecordId) || null,
    [records, selectedRecordId]
  );
  const fieldAsset = useMemo(
    () => (newMaintenance.asset_id ? assetMap.get(newMaintenance.asset_id) || null : null),
    [assetMap, newMaintenance.asset_id]
  );

  async function getNextMaintenanceNumber() {
    const { data, error } = await supabase.from("asset_maintenance_records").select("maintenance_number");
    if (error) throw new Error(error.message);

    const maxUsed = ((data || []) as Array<{ maintenance_number?: string | null }>).reduce((highest, row) => {
      const current = extractMaintenanceNumber(row.maintenance_number);
      return current && current > highest ? current : highest;
    }, 0);

    return formatMaintenanceNumber(maxUsed + 1);
  }

  const filteredRecords = useMemo(() => {
    return records
      .map((record) => {
        const asset = assetMap.get(record.asset_id) || null;
        return {
          record,
          asset,
          status: getDueStatus(record.next_maintenance_due),
        };
      })
      .filter(({ record, asset }) => {
        const matchesAsset =
          !assetFilter ||
          (asset?.asset_code || "").toLowerCase() === assetFilter.toLowerCase() ||
          record.asset_id.toLowerCase() === assetFilter.toLowerCase();
        const matchesType = !typeFilter || (record.maintenance_type || "") === typeFilter;
        return matchesAsset && matchesType && Boolean(asset);
      })
      .sort((a, b) => {
        const rankDiff = getStatusRank(a.status) - getStatusRank(b.status);
        if (rankDiff !== 0) return rankDiff;

        const aDue = a.record.next_maintenance_due ? new Date(a.record.next_maintenance_due).getTime() : Number.MAX_SAFE_INTEGER;
        const bDue = b.record.next_maintenance_due ? new Date(b.record.next_maintenance_due).getTime() : Number.MAX_SAFE_INTEGER;
        if (aDue !== bDue) return aDue - bDue;

        const aDate = a.record.maintenance_date ? new Date(a.record.maintenance_date).getTime() : 0;
        const bDate = b.record.maintenance_date ? new Date(b.record.maintenance_date).getTime() : 0;
        return bDate - aDate;
      });
  }, [assetFilter, assetMap, records, typeFilter]);

  const overdueCount = filteredRecords.filter((item) => item.status === "Overdue").length;
  const dueSoonCount = filteredRecords.filter((item) => item.status === "Due Soon").length;
  const latestRecord = filteredRecords[0] || null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    console.log("[maintenance save check]", newMaintenance);

    if (
      !newMaintenance.asset_id ||
      !newMaintenance.maintenance_date ||
      !newMaintenance.carried_out_by ||
      !newMaintenance.description.trim()
    ) {
      setMessage("Please complete: Asset, Maintenance Date, Carried Out By, and Work Completed / Description.");
      return;
    }

    try {
      setIsSaving(true);

      let fileName: string | null = null;
      let filePath: string | null = null;

      if (newMaintenance.file) {
        filePath = await uploadMaintenanceFile(newMaintenance.asset_id, newMaintenance.file);
        fileName = newMaintenance.file.name;
      }

      const maintenanceNumber = await getNextMaintenanceNumber();

      const { error } = await supabase.from("asset_maintenance_records").insert([
        {
          asset_id: newMaintenance.asset_id,
          maintenance_number: maintenanceNumber,
          maintenance_date: newMaintenance.maintenance_date,
          maintenance_type: newMaintenance.maintenance_type,
          carried_out_by: newMaintenance.carried_out_by,
          action_required: newMaintenance.action_required,
          description: newMaintenance.description.trim(),
          next_maintenance_due: newMaintenance.next_maintenance_due || null,
          file_name: fileName,
          file_path: filePath,
        },
      ]);

      if (error) throw new Error(error.message);

      if (newMaintenance.next_maintenance_due) {
        await supabase
          .from("assets")
          .update({ maintenance_due_date: newMaintenance.next_maintenance_due })
          .eq("id", newMaintenance.asset_id);
      }

      setNewMaintenance({
        ...emptyNewMaintenance,
        asset_id: newMaintenance.asset_id,
      });
      setMessage(`Maintenance record ${maintenanceNumber} added successfully.`);
      await loadData();
    } catch (error) {
      const err = error as Error;
      setMessage(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function openFile(record: AssetMaintenanceRecord) {
    if (!record.file_path) {
      setMessage("No maintenance file stored on this record.");
      return;
    }

    try {
      setOpeningId(record.id);
      const url = await createSignedFileUrl(record.file_path);
      if (!url) {
        setMessage("Unable to open maintenance file.");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
      setMessage("Maintenance file opened.");
    } finally {
      setOpeningId("");
    }
  }

  async function removeRecord(record: AssetMaintenanceRecord) {
    const confirmed = window.confirm("Remove this maintenance record?");
    if (!confirmed) return;

    try {
      setDeletingId(record.id);
      if (record.file_path) {
        await supabase.storage.from(STORAGE_BUCKET).remove([record.file_path]);
      }
      const { error } = await supabase.from("asset_maintenance_records").delete().eq("id", record.id);
      if (error) throw new Error(error.message);
      setMessage("Maintenance record removed.");
      await loadData();
    } catch (error) {
      const err = error as Error;
      setMessage(`Remove failed: ${err.message}`);
    } finally {
      setDeletingId("");
    }
  }

  function generateActionFromMaintenance(record: AssetMaintenanceRecord) {
    const asset = assetMap.get(record.asset_id) || null;
    const assetLabel = asset?.asset_code || asset?.name || "Asset maintenance";
    const title = `Maintenance follow-up - ${record.maintenance_number || assetLabel}`;
    const query = new URLSearchParams({
      prefill_source: "Asset Maintenance",
      prefill_department: "Assets",
      prefill_title: title,
      prefill_description: record.description || title,
      linked_asset_id: record.asset_id,
      linked_asset_code: asset?.asset_code || "",
      linked_maintenance_id: record.id,
      linked_maintenance_number: record.maintenance_number || "",
    });
    window.location.href = `/actions?${query.toString()}`;
  }

  async function saveRecordDetail() {
    if (!selectedRecord) return;

    if (!detailForm.asset_id || !detailForm.maintenance_date || !detailForm.carried_out_by.trim() || !detailForm.description.trim()) {
      setMessage("Please complete: Asset, Maintenance Date, Carried Out By, and Work Completed / Description.");
      return;
    }

    try {
      setIsSavingDetail(true);
      const { error } = await supabase
        .from("asset_maintenance_records")
        .update({
          asset_id: detailForm.asset_id,
          maintenance_date: detailForm.maintenance_date,
          maintenance_type: detailForm.maintenance_type,
          carried_out_by: detailForm.carried_out_by.trim(),
          action_required: detailForm.action_required,
          description: detailForm.description.trim(),
          next_maintenance_due: detailForm.next_maintenance_due || null,
        })
        .eq("id", selectedRecord.id);

      if (error) throw new Error(error.message);

      if (detailForm.next_maintenance_due) {
        await supabase.from("assets").update({ maintenance_due_date: detailForm.next_maintenance_due }).eq("id", detailForm.asset_id);
      }

      setMessage(`Maintenance record ${selectedRecord.maintenance_number || ""} updated.`);
      await loadData();
    } catch (error) {
      const err = error as Error;
      setMessage(`Update failed: ${err.message}`);
    } finally {
      setIsSavingDetail(false);
    }
  }

  return (
    <main style={isFieldMode ? fieldModeMainStyle : undefined}>
      {isFieldMode ? (
        <section style={fieldModeHeaderStyle}>
          <div style={fieldModeHeaderTopStyle}>
            <Link href={`/assets/field?asset=${encodeURIComponent(linkedAssetParam)}`} style={backLinkStyle}>
              Back to Field Access
            </Link>
            <div style={fieldModeEyebrowStyle}>Asset Maintenance</div>
          </div>
          <div style={fieldModeTitleStyle}>
            {fieldAsset?.asset_code || linkedAssetParam}
            {fieldAsset?.name ? ` - ${fieldAsset.name}` : ""}
          </div>
          <div style={statusBannerStyle}>
            <strong>Status:</strong> {message}
          </div>
        </section>
      ) : (
        <>
      <QualityPageHero
        label="ASSET MANAGEMENT"
        title="Maintenance Log"
        description="Track preventative and corrective maintenance in a phone-friendly workflow with one saved history row per maintenance event."
        contextCards={[
          { label: "Last Refreshed", value: lastRefreshed || "-" },
          { label: "Latest Maintenance", value: latestRecord?.asset?.asset_code || "No maintenance logged" },
        ]}
      />

      <div style={topMetaRowStyle}>
        <Link href="/assets/dashboard" style={backLinkStyle}>
          ← Back to Dashboard
        </Link>
        <div style={desktopStatusBannerStyle}>
          <strong>Status:</strong> {message}
        </div>
      </div>

      <section style={attentionGridStyle}>
        <QualityKpiCard title="Overdue" value={overdueCount} accent="#dc2626" />
        <QualityKpiCard title="Due Soon" value={dueSoonCount} accent="#f59e0b" />
        <QualityKpiCard title="Coverage" value={filteredRecords.length} accent="#2563eb" />
      </section>
        </>
      )}

      <section style={isFieldMode ? fieldModeStackedGridStyle : stackedGridStyle}>
        <SectionCard
          title="Add Maintenance Record"
          subtitle={
            isFieldMode
              ? "Focused field maintenance entry for the selected asset."
              : "Compact maintenance entry with clear field alignment, direct people management, and one saved history row per maintenance event."
          }
        >
          <form onSubmit={handleSubmit}>
            <div style={mobileFormGridStyle}>
              <Field label="Maintenance Number">
                <input value="Assigned on save" readOnly style={readOnlyInputStyle} />
              </Field>

              <Field label="Asset">
                <select
                  value={newMaintenance.asset_id}
                  onChange={(e) =>
                    setNewMaintenance((prev) => ({
                      ...prev,
                      asset_id: e.target.value,
                    }))
                  }
                  style={inputStyle}
                >
                  <option value="">Select asset</option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {(asset.asset_code || "No Code") + " - " + (asset.name || "Unnamed Asset")}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Carried Out By">
                <select
                  value={newMaintenance.carried_out_by}
                  onChange={(e) =>
                    setNewMaintenance((prev) => ({
                      ...prev,
                      carried_out_by: e.target.value,
                    }))
                  }
                  style={inputStyle}
                >
                  <option value="">Select person</option>
                  {createPeopleOptions.map((person) => (
                    <option key={person} value={person}>
                      {person}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Maintenance Date">
                <input
                  type="date"
                  value={newMaintenance.maintenance_date}
                  onChange={(e) =>
                    setNewMaintenance((prev) => ({
                      ...prev,
                      maintenance_date: e.target.value,
                    }))
                  }
                  style={inputStyle}
                />
              </Field>

              <Field label="Maintenance Type">
                <select
                  value={newMaintenance.maintenance_type}
                  onChange={(e) =>
                    setNewMaintenance((prev) => ({
                      ...prev,
                      maintenance_type: e.target.value as NewMaintenanceForm["maintenance_type"],
                    }))
                  }
                  style={inputStyle}
                >
                  <option value="Preventative">Preventative</option>
                  <option value="Corrective">Corrective</option>
                </select>
              </Field>

              <Field label="Next Maintenance Due">
                <input
                  type="date"
                  value={newMaintenance.next_maintenance_due}
                  onChange={(e) =>
                    setNewMaintenance((prev) => ({
                      ...prev,
                      next_maintenance_due: e.target.value,
                    }))
                  }
                  style={inputStyle}
                />
              </Field>

              <Field label="Action Required">
                <select
                  value={newMaintenance.action_required ? "Yes" : "No"}
                  onChange={(e) =>
                    setNewMaintenance((prev) => ({
                      ...prev,
                      action_required: e.target.value === "Yes",
                    }))
                  }
                  style={inputStyle}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </Field>

              <Field label="Upload Photos / Documents">
                <div style={uploadControlWrapStyle}>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                    onChange={(e) =>
                      setNewMaintenance((prev) => ({
                        ...prev,
                        file: e.target.files?.[0] || null,
                      }))
                    }
                    style={fileInputStyle}
                  />
                  <div style={helperTextStyle}>{newMaintenance.file ? newMaintenance.file.name : "No file selected"}</div>
                </div>
              </Field>

              <div style={fullSpanStyle}>
                <Field label="Work Completed / Description">
                  <textarea
                    id="maintenance-create-description"
                    value={newMaintenance.description}
                    onChange={(event) => {
                      const value = event.target.value;
                      setNewMaintenance((prev) => ({
                        ...prev,
                        description: value,
                      }));
                    }}
                    placeholder="Describe the maintenance carried out"
                    style={textareaStyle}
                  />
                </Field>
              </div>
            </div>

            <div style={buttonRowStyle}>
              <button type="submit" style={primaryButtonStyle} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Maintenance Record"}
              </button>
            </div>
          </form>
        </SectionCard>

        {!isFieldMode ? (
          <>
        <SectionCard
          title="Filters & History"
          subtitle="Review one asset's maintenance history or the full log, with overdue work shown first."
        >
          <div style={buttonRowStyle}>
            <button
              type="button"
              style={showRegisterFilters ? secondaryButtonStyle : primaryButtonStyle}
              onClick={() => setShowRegisterFilters((prev) => !prev)}
            >
              {showRegisterFilters ? "Hide Filters" : "Show Filters"}
            </button>
            {showRegisterFilters ? (
            <button
              type="button"
              style={secondaryButtonStyle}
              onClick={() => {
                setAssetFilter("");
                setTypeFilter("");
              }}
            >
              Clear Filters
            </button>
            ) : null}
          </div>

          {showRegisterFilters ? (
            <div style={filterGridStyle}>
              <Field label="Asset Filter">
                <select value={assetFilter} onChange={(e) => setAssetFilter(e.target.value)} style={inputStyle}>
                  <option value="">All assets</option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.asset_code || asset.id}>
                      {(asset.asset_code || asset.id) + " - " + (asset.name || "Unnamed Asset")}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Maintenance Type Filter">
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={inputStyle}>
                  <option value="">All types</option>
                  <option value="Preventative">Preventative</option>
                  <option value="Corrective">Corrective</option>
                </select>
              </Field>
            </div>
          ) : null}

          <div style={historyListStyle}>
            {filteredRecords.length === 0 ? (
              <div style={emptyStateStyle}>No maintenance records match the current filters.</div>
            ) : (
              filteredRecords.map(({ record, asset, status }) => {
                const statusTone = getStatusTone(status);
                const typeTone = getTypeTone(record.maintenance_type);
                const daysRemaining = getDaysRemaining(record.next_maintenance_due);
                const selected = selectedRecordId === record.id;

                return (
                  <div
                    key={record.id}
                    style={{
                      ...historyCardStyle,
                      cursor: "pointer",
                      borderColor: selected ? "#93c5fd" : "#dbe7f3",
                      boxShadow: selected ? "0 0 0 2px rgba(37,99,235,0.15)" : "none",
                    }}
                    onClick={() => {
                      setSelectedRecordId(record.id);
                      setDetailForm(buildMaintenanceForm(record));
                    }}
                  >
                    <div style={historyHeaderStyle}>
                      <div>
                        <div style={historyTitleStyle}>{record.maintenance_number || "Maintenance Record"}</div>
                        <div style={historyMetaStyle}>{asset?.name || "Unknown asset"}</div>
                        <div style={historyMetaStyle}>{asset?.asset_code || asset?.id || "-"}</div>
                      </div>
                      <div style={historyBadgeRowStyle}>
                        <span
                          style={{
                            ...pillStyle,
                            background: typeTone.bg,
                            color: typeTone.text,
                          }}
                        >
                          {record.maintenance_type || "Not Set"}
                        </span>
                        <span
                          style={{
                            ...pillStyle,
                            background: statusTone.bg,
                            color: statusTone.text,
                            border: `1px solid ${statusTone.border}`,
                          }}
                        >
                          {status}
                        </span>
                      </div>
                    </div>

                    <div style={historyGridStyle}>
                      <div>
                        <strong>Maintenance Date:</strong> {formatDate(record.maintenance_date)}
                      </div>
                      <div>
                        <strong>Carried Out By:</strong> {record.carried_out_by || "-"}
                      </div>
                      <div>
                        <strong>Next Due:</strong> {formatDate(record.next_maintenance_due)}
                      </div>
                      <div>
                        <strong>Action Required:</strong> {record.action_required ? "Yes" : "No"}
                      </div>
                      <div>
                        <strong>Due Window:</strong>{" "}
                        {daysRemaining === null
                          ? "Not set"
                          : daysRemaining < 0
                            ? `${Math.abs(daysRemaining)} days overdue`
                            : `${daysRemaining} days remaining`}
                      </div>
                    </div>

                    <div style={historyBodyStyle}>
                      <div>
                        <strong>Description:</strong> {record.description || "-"}
                      </div>
                    </div>

                    <div style={historyFooterStyle}>
                      <span>{record.file_name || "No file attached"}</span>
                      <span>{formatDateTime(record.created_at)}</span>
                    </div>

                    <div style={buttonRowStyle}>
                      {record.action_required ? (
                        <button
                          type="button"
                          style={actionLinkButtonStyle}
                          onClick={(event) => {
                            event.stopPropagation();
                            generateActionFromMaintenance(record);
                          }}
                        >
                          Generate Action
                        </button>
                      ) : null}
                      {record.file_path ? (
                        <button
                          type="button"
                          style={miniButtonStyle}
                          onClick={(event) => {
                            event.stopPropagation();
                            void openFile(record);
                          }}
                          disabled={openingId === record.id}
                        >
                          {openingId === record.id ? "Opening..." : "Open File"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        style={dangerButtonStyle}
                        onClick={(event) => {
                          event.stopPropagation();
                          void removeRecord(record);
                        }}
                        disabled={deletingId === record.id}
                      >
                        {deletingId === record.id ? "Removing..." : "Remove"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SectionCard>

        <SectionCard
          title={selectedRecord ? `Maintenance Detail - ${selectedRecord.maintenance_number || "Record"}` : "Maintenance Detail"}
          subtitle={
            selectedRecord
              ? "Edit the selected maintenance record, preserve its history row, and generate an action only when the user decides to."
              : "Click a maintenance record to open the full detail and edit panel."
          }
        >
          {!selectedRecord ? (
            <div style={emptyStateStyle}>No maintenance record selected.</div>
          ) : (
            <div style={detailPanelStyle}>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  style={secondaryButtonStyle}
                  onClick={() => {
                    setSelectedRecordId("");
                    setDetailForm(emptyNewMaintenance);
                  }}
                >
                  Hide Panel
                </button>
              </div>

              <div style={detailSummaryRowStyle}>
                <SummaryTile label="Maintenance Number" value={selectedRecord.maintenance_number || "-"} />
                <SummaryTile label="Asset" value={assetMap.get(selectedRecord.asset_id)?.asset_code || "-"} />
                <SummaryTile label="Created" value={formatDateTime(selectedRecord.created_at)} />
              </div>

              <div style={mobileFormGridStyle}>
                <Field label="Maintenance Number">
                  <input value={selectedRecord.maintenance_number || ""} readOnly style={readOnlyInputStyle} />
                </Field>

                <Field label="Asset">
                  <select
                    value={detailForm.asset_id}
                    onChange={(e) => setDetailForm((prev) => ({ ...prev, asset_id: e.target.value }))}
                    style={inputStyle}
                  >
                    <option value="">Select asset</option>
                    {assets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {(asset.asset_code || "No Code") + " - " + (asset.name || "Unnamed Asset")}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Carried Out By">
                  <select
                    value={detailForm.carried_out_by}
                    onChange={(e) => setDetailForm((prev) => ({ ...prev, carried_out_by: e.target.value }))}
                    style={inputStyle}
                  >
                    <option value="">Select person</option>
                    {detailPeopleOptions.map((person) => (
                      <option key={person} value={person}>
                        {person}
                      </option>
                      ))}
                    </select>
                  </Field>

                <Field label="Maintenance Date">
                  <input
                    type="date"
                    value={detailForm.maintenance_date}
                    onChange={(e) => setDetailForm((prev) => ({ ...prev, maintenance_date: e.target.value }))}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Maintenance Type">
                  <select
                    value={detailForm.maintenance_type}
                    onChange={(e) =>
                      setDetailForm((prev) => ({
                        ...prev,
                        maintenance_type: e.target.value as NewMaintenanceForm["maintenance_type"],
                      }))
                    }
                    style={inputStyle}
                  >
                    <option value="Preventative">Preventative</option>
                    <option value="Corrective">Corrective</option>
                  </select>
                </Field>

                <Field label="Next Maintenance Due">
                  <input
                    type="date"
                    value={detailForm.next_maintenance_due}
                    onChange={(e) => setDetailForm((prev) => ({ ...prev, next_maintenance_due: e.target.value }))}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Action Required">
                  <select
                    value={detailForm.action_required ? "Yes" : "No"}
                    onChange={(e) =>
                      setDetailForm((prev) => ({
                        ...prev,
                        action_required: e.target.value === "Yes",
                      }))
                    }
                    style={inputStyle}
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </Field>

                <div style={{ gridColumn: "1 / -1" }}>
                  <Field label="Work Completed / Description">
                    <textarea
                      rows={5}
                      value={detailForm.description}
                      onChange={(e) => setDetailForm((prev) => ({ ...prev, description: e.target.value }))}
                      style={textareaStyle}
                    />
                  </Field>
                </div>
              </div>

              <div style={detailFooterBarStyle}>
                <div style={helperTextStyle}>
                  Attached file: <strong>{selectedRecord.file_name || "No file attached"}</strong>
                </div>
                <div style={buttonRowStyleTight}>
                  {detailForm.action_required ? (
                    <button
                      type="button"
                      style={actionLinkButtonStyle}
                      onClick={() => generateActionFromMaintenance(selectedRecord)}
                    >
                      Generate Action
                    </button>
                  ) : null}
                  {selectedRecord.file_path ? (
                    <button type="button" style={miniButtonStyle} onClick={() => void openFile(selectedRecord)}>
                      Open File
                    </button>
                  ) : null}
                  <button
                    type="button"
                    style={dangerButtonStyle}
                    onClick={() => void removeRecord(selectedRecord)}
                    disabled={deletingId === selectedRecord.id}
                  >
                    {deletingId === selectedRecord.id ? "Removing..." : "Remove"}
                  </button>
                  <button
                    type="button"
                    style={primaryButtonStyle}
                    onClick={() => void saveRecordDetail()}
                    disabled={isSavingDetail}
                  >
                    {isSavingDetail ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </SectionCard>
          </>
        ) : null}
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
      <div style={sectionHeaderRowStyle}>
        <div>
          <h2 style={sectionTitleStyle}>{title}</h2>
          {subtitle ? <p style={sectionSubtitleStyle}>{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={fieldWrapStyle}>
      <span style={fieldLabelStyle}>{label}</span>
      {children}
    </div>
  );
}

function AttentionCard({
  title,
  summary,
  detail,
  tone,
}: {
  title: string;
  summary: string;
  detail: string;
  tone: "red" | "amber" | "blue";
}) {
  const tones = {
    red: { bg: "#fff1f2", border: "#fecdd3", title: "#991b1b", summary: "#7f1d1d" },
    amber: { bg: "#fffbeb", border: "#fde68a", title: "#92400e", summary: "#78350f" },
    blue: { bg: "#eff6ff", border: "#bfdbfe", title: "#1d4ed8", summary: "#1e3a8a" },
  };
  const colours = tones[tone];

  return (
    <div
      style={{
        ...attentionCardStyle,
        background: colours.bg,
        border: `1px solid ${colours.border}`,
      }}
    >
      <div style={{ ...attentionCardTitleStyle, color: colours.title }}>{title}</div>
      <div style={{ ...attentionCardSummaryStyle, color: colours.summary }}>{summary}</div>
      <div style={attentionCardDetailStyle}>{detail}</div>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={summaryTileStyle}>
      <div style={summaryTileLabelStyle}>{label}</div>
      <div style={summaryTileValueStyle}>{value}</div>
    </div>
  );
}

export default function AssetMaintenancePage() {
  return (
    <Suspense fallback={<main style={{ padding: "24px" }}>Loading maintenance log...</main>}>
      <MaintenancePageContent />
    </Suspense>
  );
}

const fieldModeMainStyle: CSSProperties = {
  maxWidth: "760px",
  margin: "0 auto",
  display: "grid",
  gap: "14px",
};

const fieldModeStackedGridStyle: CSSProperties = {
  display: "grid",
  gap: "14px",
};

const fieldModeHeaderStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
  marginBottom: "6px",
};

const fieldModeHeaderTopStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  alignItems: "center",
  flexWrap: "wrap",
};

const fieldModeEyebrowStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 800,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "#3A9B98",
};

const fieldModeTitleStyle: CSSProperties = {
  fontSize: "20px",
  fontWeight: 800,
  color: "#0f172a",
  lineHeight: 1.3,
  overflowWrap: "anywhere",
};

const topMetaRowStyle: CSSProperties = {
  marginBottom: 20,
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "center",
  background: "rgba(255,255,255,0.92)",
  border: "1px solid #dbe3ef",
  borderRadius: "16px",
  padding: "12px 14px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
};

const backLinkStyle: CSSProperties = {
  color: "#3A9B98",
  fontWeight: 700,
  textDecoration: "none",
};

const statusBannerStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe7f3",
  color: "#0f172a",
  padding: "10px 14px",
  borderRadius: "14px",
  fontSize: "14px",
};

const desktopStatusBannerStyle: CSSProperties = {
  background: "white",
  borderRadius: "12px",
  padding: "12px 16px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
  color: "#0f172a",
};

const attentionGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "16px",
  marginBottom: "20px",
};

const stackedGridStyle: CSSProperties = {
  display: "grid",
  gap: "20px",
};

const panelStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: "18px",
  border: "1px solid #dbe7f3",
  boxShadow: "0 14px 28px rgba(15, 23, 42, 0.06)",
  padding: "22px",
};

const sectionHeaderRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
  marginBottom: "18px",
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
  lineHeight: 1.55,
};

const mobileFormGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "12px",
  alignItems: "start",
};

const filterGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
  alignItems: "end",
  marginBottom: "14px",
  padding: "12px",
  border: "1px solid #dbe3ef",
  borderRadius: "16px",
  background: "rgba(248,250,252,0.92)",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
};

const fieldWrapStyle: CSSProperties = {
  display: "grid",
  gap: "6px",
};

const fieldLabelStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 700,
  color: "#475569",
};

const inputStyle: CSSProperties = {
  width: "100%",
  height: "46px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  padding: "10px 12px",
  fontSize: "14px",
  background: "#ffffff",
  color: "#0f172a",
  boxSizing: "border-box",
};

const textareaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: "120px",
  height: "120px",
  resize: "vertical",
};

const fullSpanStyle: CSSProperties = {
  gridColumn: "1 / -1",
};

const helperTextStyle: CSSProperties = {
  fontSize: "13px",
  color: "#64748b",
  lineHeight: 1.5,
};

const readOnlyInputStyle: CSSProperties = {
  ...inputStyle,
  background: "#f8fafc",
  color: "#334155",
  fontWeight: 700,
};

const fileInputStyle: CSSProperties = {
  ...inputStyle,
  padding: "9px 12px",
};

const uploadControlWrapStyle: CSSProperties = {
  display: "grid",
  gap: "6px",
};

const buttonRowStyle: CSSProperties = {
  marginTop: "14px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
  alignItems: "stretch",
};

const buttonRowStyleTight: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "10px",
  alignItems: "stretch",
};

const primaryButtonStyle: CSSProperties = {
  background: "#3A9B98",
  color: "#ffffff",
  border: "none",
  borderRadius: "10px",
  padding: "10px 16px",
  fontWeight: 800,
  fontSize: "13px",
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  background: "#e2e8f0",
  color: "#0f172a",
  border: "none",
  borderRadius: "10px",
  padding: "9px 12px",
  fontWeight: 700,
  fontSize: "12px",
  cursor: "pointer",
};

const miniButtonStyle: CSSProperties = {
  background: "#3A9B98",
  color: "#ffffff",
  border: "none",
  borderRadius: "10px",
  padding: "9px 12px",
  fontWeight: 700,
  fontSize: "12px",
  cursor: "pointer",
};

const actionLinkButtonStyle: CSSProperties = {
  background: "#3A9B98",
  color: "#ffffff",
  border: "none",
  borderRadius: "10px",
  padding: "9px 12px",
  fontWeight: 700,
  fontSize: "12px",
  cursor: "pointer",
};

const dangerButtonStyle: CSSProperties = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  borderRadius: "10px",
  padding: "9px 12px",
  fontWeight: 700,
  fontSize: "12px",
  cursor: "pointer",
};

const attentionCardStyle: CSSProperties = {
  borderRadius: "18px",
  padding: "18px 20px",
  display: "grid",
  gap: "8px",
  boxShadow: "0 10px 22px rgba(15, 23, 42, 0.04)",
};

const attentionCardTitleStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const attentionCardSummaryStyle: CSSProperties = {
  fontSize: "24px",
  fontWeight: 800,
  lineHeight: 1.1,
};

const attentionCardDetailStyle: CSSProperties = {
  fontSize: "13px",
  color: "#475569",
  lineHeight: 1.5,
};

const historyListStyle: CSSProperties = {
  display: "grid",
  gap: "14px",
  marginTop: "18px",
};

const historyCardStyle: CSSProperties = {
  borderRadius: "16px",
  border: "1px solid #dbe7f3",
  background: "#f8fafc",
  padding: "16px",
  display: "grid",
  gap: "12px",
};

const detailPanelStyle: CSSProperties = {
  display: "grid",
  gap: "18px",
  border: "1px solid #dbe3ef",
  borderRadius: "18px",
  padding: "18px",
  background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
  width: "100%",
  boxSizing: "border-box",
  minWidth: 0,
};

const detailSummaryRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
};

const summaryTileStyle: CSSProperties = {
  borderRadius: "14px",
  border: "1px solid #dbe7f3",
  background: "#f8fafc",
  padding: "14px 16px",
};

const summaryTileLabelStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "#64748b",
  marginBottom: "6px",
};

const summaryTileValueStyle: CSSProperties = {
  fontSize: "16px",
  fontWeight: 800,
  color: "#0f172a",
  wordBreak: "break-word",
};

const detailFooterBarStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  alignItems: "center",
  borderTop: "1px solid #e2e8f0",
  paddingTop: "16px",
};

const historyHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  alignItems: "flex-start",
};

const historyTitleStyle: CSSProperties = {
  fontSize: "15px",
  fontWeight: 800,
  color: "#0f172a",
};

const historyMetaStyle: CSSProperties = {
  marginTop: "4px",
  fontSize: "13px",
  color: "#64748b",
  lineHeight: 1.5,
};

const historyBadgeRowStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const pillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "12px",
  fontWeight: 700,
};

const historyGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "10px 16px",
  color: "#334155",
  fontSize: "14px",
};

const historyBodyStyle: CSSProperties = {
  display: "grid",
  gap: "8px",
  color: "#334155",
  fontSize: "14px",
  lineHeight: 1.6,
};

const historyFooterStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  color: "#64748b",
  fontSize: "12px",
};

const emptyStateStyle: CSSProperties = {
  borderRadius: "14px",
  border: "1px dashed #cbd5e1",
  background: "#f8fafc",
  color: "#64748b",
  padding: "18px",
  fontSize: "14px",
};

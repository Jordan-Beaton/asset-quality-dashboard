"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
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

type AssetInspectionRecord = {
  id: string;
  asset_id: string;
  inspection_number: string | null;
  reference: string | null;
  file_name: string | null;
  file_path: string | null;
  notes: string | null;
  uploaded_at: string | null;
  inspection_date: string | null;
  inspector: string | null;
  result: string | null;
  findings: string | null;
  action_required: boolean | null;
  actions_required: string | null;
  next_inspection_due: string | null;
  created_at: string | null;
};

type AssetPerson = {
  id: string;
  name: string;
  role: string | null;
  active: boolean;
};

type InspectionForm = {
  assetId: string;
  inspectionDate: string;
  inspector: string;
  result: "Pass" | "Fail" | "Pass with Observations";
  findings: string;
  actionsRequired: string;
  nextInspectionDue: string;
  actionRequired: boolean;
};

type InspectionStatus = "Overdue" | "Due Soon" | "In Date" | "Not Set";

const STORAGE_BUCKET = "asset-files";

const emptyForm: InspectionForm = {
  assetId: "",
  inspectionDate: "",
  inspector: "",
  result: "Pass",
  findings: "",
  actionsRequired: "",
  nextInspectionDue: "",
  actionRequired: false,
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

function getInspectionStatus(value: string | null | undefined): InspectionStatus {
  const days = getDaysRemaining(value);
  if (days === null) return "Not Set";
  if (days < 0) return "Overdue";
  if (days <= 30) return "Due Soon";
  return "In Date";
}

function getStatusTone(status: InspectionStatus) {
  if (status === "Overdue") return { bg: "#fee2e2", text: "#991b1b", border: "#fecaca" };
  if (status === "Due Soon") return { bg: "#fef3c7", text: "#92400e", border: "#fde68a" };
  if (status === "In Date") return { bg: "#dcfce7", text: "#166534", border: "#bbf7d0" };
  return { bg: "#e2e8f0", text: "#334155", border: "#cbd5e1" };
}

function getStatusRank(status: InspectionStatus) {
  if (status === "Overdue") return 0;
  if (status === "Due Soon") return 1;
  if (status === "In Date") return 2;
  return 3;
}

function getResultTone(result: string | null | undefined) {
  const value = (result || "").toLowerCase();
  if (value === "pass") return { bg: "#dcfce7", text: "#166534" };
  if (value === "fail") return { bg: "#fee2e2", text: "#991b1b" };
  if (value.includes("observation")) return { bg: "#fef3c7", text: "#92400e" };
  return { bg: "#e2e8f0", text: "#334155" };
}

function extractInspectionNumber(value: string | null | undefined) {
  const match = (value || "").match(/INS-(\d+)/i);
  return match ? Number(match[1]) : null;
}

function formatInspectionNumber(num: number) {
  return `INS-${String(num).padStart(3, "0")}`;
}

function buildInspectionForm(record: AssetInspectionRecord): InspectionForm {
  return {
    assetId: record.asset_id,
    inspectionDate: record.inspection_date || "",
    inspector: record.inspector || "",
    result: (record.result as InspectionForm["result"]) || "Pass",
    findings: record.findings || "",
    actionsRequired: record.actions_required || "",
    nextInspectionDue: record.next_inspection_due || "",
    actionRequired: Boolean(record.action_required),
  };
}

async function createSignedFileUrl(path: string) {
  if (!path) return "";
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return "";
  return data.signedUrl;
}

async function uploadInspectionFile(assetId: string, file: File) {
  const safeName = sanitizeFileName(file.name);
  const path = `Inspection/${assetId}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(error.message);
  return path;
}

function InspectionPageContent() {
  const searchParams = useSearchParams();
  const linkedAssetParam = searchParams.get("asset")?.trim() || "";
  const isFieldMode = Boolean(linkedAssetParam);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [people, setPeople] = useState<AssetPerson[]>([]);
  const [records, setRecords] = useState<AssetInspectionRecord[]>([]);
  const [message, setMessage] = useState("Loading inspection log...");
  const [lastRefreshed, setLastRefreshed] = useState("");
  const [form, setForm] = useState<InspectionForm>(emptyForm);
  const [detailForm, setDetailForm] = useState<InspectionForm>(emptyForm);
  const [assetFilter, setAssetFilter] = useState(linkedAssetParam);
  const [resultFilter, setResultFilter] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingDetail, setIsSavingDetail] = useState(false);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
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

    setForm((prev) => (prev.assetId ? prev : { ...prev, assetId: match.id }));
    setAssetFilter(linkedAssetParam);
  }, [assets, linkedAssetParam]);

  async function loadData() {
    const [assetsRes, inspectionsRes, peopleRes] = await Promise.all([
      supabase.from("assets").select("*").order("name", { ascending: true }),
      supabase.from("asset_inspection_records").select("*").order("inspection_date", { ascending: false }),
      supabase
        .from("people")
        .select("id,name,role,active")
        .eq("active", true)
        .eq("department", "Assets")
        .order("name", { ascending: true }),
    ]);

    if (assetsRes.error || inspectionsRes.error || peopleRes.error) {
      setMessage(
        `Load failed: ${assetsRes.error?.message || inspectionsRes.error?.message || peopleRes.error?.message || "Unknown error"}`
      );
      return;
    }

    setAssets((assetsRes.data || []) as Asset[]);
    setRecords((inspectionsRes.data || []) as AssetInspectionRecord[]);
    setPeople((peopleRes.data || []) as AssetPerson[]);
    setLastRefreshed(new Date().toLocaleString("en-GB"));
    setMessage("Inspection log loaded.");
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
    if (!form.inspector || peopleOptions.includes(form.inspector)) return peopleOptions;
    return [form.inspector, ...peopleOptions];
  }, [form.inspector, peopleOptions]);

  const detailPeopleOptions = useMemo(() => {
    if (!detailForm.inspector || peopleOptions.includes(detailForm.inspector)) return peopleOptions;
    return [detailForm.inspector, ...peopleOptions];
  }, [detailForm.inspector, peopleOptions]);

  const assetMap = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);
  const selectedRecord = useMemo(
    () => records.find((record) => record.id === selectedRecordId) || null,
    [records, selectedRecordId]
  );
  const fieldAsset = useMemo(() => (form.assetId ? assetMap.get(form.assetId) || null : null), [assetMap, form.assetId]);

  async function getNextInspectionNumber() {
    const { data, error } = await supabase.from("asset_inspection_records").select("inspection_number");
    if (error) {
      throw new Error(error.message);
    }

    const maxUsed = ((data || []) as Array<{ inspection_number?: string | null }>).reduce((highest, row) => {
      const current = extractInspectionNumber(row.inspection_number);
      return current && current > highest ? current : highest;
    }, 0);

    return formatInspectionNumber(maxUsed + 1);
  }

  const filteredRecords = useMemo(() => {
    return records
      .map((record) => {
        const asset = assetMap.get(record.asset_id) || null;
        return {
          record,
          asset,
          status: getInspectionStatus(record.next_inspection_due),
        };
      })
      .filter(({ record, asset, status }) => {
        const matchesAsset =
          !assetFilter ||
          (asset?.asset_code || "").toLowerCase() === assetFilter.toLowerCase() ||
          record.asset_id.toLowerCase() === assetFilter.toLowerCase();
        const matchesResult = !resultFilter || (record.result || "") === resultFilter;
        return matchesAsset && matchesResult && Boolean(asset);
      })
      .sort((a, b) => {
        const rankDiff = getStatusRank(a.status) - getStatusRank(b.status);
        if (rankDiff !== 0) return rankDiff;

        const aDue = a.record.next_inspection_due ? new Date(a.record.next_inspection_due).getTime() : Number.MAX_SAFE_INTEGER;
        const bDue = b.record.next_inspection_due ? new Date(b.record.next_inspection_due).getTime() : Number.MAX_SAFE_INTEGER;
        if (aDue !== bDue) return aDue - bDue;

        const aDate = a.record.inspection_date ? new Date(a.record.inspection_date).getTime() : 0;
        const bDate = b.record.inspection_date ? new Date(b.record.inspection_date).getTime() : 0;
        return bDate - aDate;
      });
  }, [assetFilter, assetMap, records, resultFilter]);

  const overdueCount = filteredRecords.filter((item) => item.status === "Overdue").length;
  const dueSoonCount = filteredRecords.filter((item) => item.status === "Due Soon").length;
  const latestRecord = filteredRecords[0] || null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.assetId || !form.inspectionDate || !form.inspector.trim()) {
      setMessage("Please complete: Asset, Inspection Date, and Inspector.");
      return;
    }

    try {
      setIsSaving(true);

      let fileName: string | null = null;
      let filePath: string | null = null;

      if (certificateFile) {
        filePath = await uploadInspectionFile(form.assetId, certificateFile);
        fileName = certificateFile.name;
      }

      const inspectionNumber = await getNextInspectionNumber();

      const { error } = await supabase.from("asset_inspection_records").insert([
        {
          asset_id: form.assetId,
          inspection_number: inspectionNumber,
          reference: inspectionNumber,
          file_name: fileName,
          file_path: filePath,
          notes: form.findings.trim() || null,
          uploaded_at: filePath ? new Date().toISOString() : null,
          inspection_date: form.inspectionDate,
          inspector: form.inspector.trim(),
          result: form.result,
          findings: form.findings.trim() || null,
          action_required: form.actionRequired,
          actions_required: form.actionsRequired.trim() || null,
          next_inspection_due: form.nextInspectionDue || null,
        },
      ]);

      if (error) throw new Error(error.message);

      if (form.nextInspectionDue) {
        await supabase.from("assets").update({ inspection_due_date: form.nextInspectionDue }).eq("id", form.assetId);
      }

      setForm({
        ...emptyForm,
        assetId: form.assetId,
      });
      setCertificateFile(null);
      setMessage(`Inspection record ${inspectionNumber} added successfully.`);
      await loadData();
    } catch (error) {
      const err = error as Error;
      setMessage(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function openFile(record: AssetInspectionRecord) {
    if (!record.file_path) {
      setMessage("No inspection file stored on this record.");
      return;
    }

    try {
      setOpeningId(record.id);
      const url = await createSignedFileUrl(record.file_path);
      if (!url) {
        setMessage("Unable to open inspection file.");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
      setMessage("Inspection file opened.");
    } finally {
      setOpeningId("");
    }
  }

  async function removeRecord(record: AssetInspectionRecord) {
    const confirmed = window.confirm("Remove this inspection record?");
    if (!confirmed) return;

    try {
      setDeletingId(record.id);
      if (record.file_path) {
        await supabase.storage.from(STORAGE_BUCKET).remove([record.file_path]);
      }
      const { error } = await supabase.from("asset_inspection_records").delete().eq("id", record.id);
      if (error) throw new Error(error.message);
      setMessage("Inspection record removed.");
      await loadData();
    } catch (error) {
      const err = error as Error;
      setMessage(`Remove failed: ${err.message}`);
    } finally {
      setDeletingId("");
    }
  }

  function generateActionFromInspection(record: AssetInspectionRecord) {
    const asset = assetMap.get(record.asset_id) || null;
    const assetLabel = asset?.asset_code || asset?.name || "Asset inspection";
    const title = `Inspection follow-up - ${record.inspection_number || assetLabel}`;
    const descriptionParts = [
      record.findings ? `Findings: ${record.findings}` : "",
      record.actions_required ? `Actions required: ${record.actions_required}` : "",
    ].filter(Boolean);
    const query = new URLSearchParams({
      prefill_source: "Asset Inspection",
      prefill_department: "Assets",
      prefill_title: title,
      prefill_description: descriptionParts.join("\n\n") || title,
      linked_asset_id: record.asset_id,
      linked_asset_code: asset?.asset_code || "",
      linked_inspection_id: record.id,
      linked_inspection_number: record.inspection_number || "",
    });
    window.location.href = `/actions?${query.toString()}`;
  }

  async function saveRecordDetail() {
    if (!selectedRecord) return;
    if (!detailForm.assetId || !detailForm.inspectionDate || !detailForm.inspector.trim()) {
      setMessage("Please complete: Asset, Inspection Date, and Inspector.");
      return;
    }

    try {
      setIsSavingDetail(true);
      const { error } = await supabase
        .from("asset_inspection_records")
        .update({
          asset_id: detailForm.assetId,
          inspection_date: detailForm.inspectionDate,
          inspector: detailForm.inspector.trim(),
          result: detailForm.result,
          findings: detailForm.findings.trim() || null,
          notes: detailForm.findings.trim() || null,
          action_required: detailForm.actionRequired,
          actions_required: detailForm.actionsRequired.trim() || null,
          next_inspection_due: detailForm.nextInspectionDue || null,
        })
        .eq("id", selectedRecord.id);

      if (error) throw new Error(error.message);

      if (detailForm.nextInspectionDue) {
        await supabase.from("assets").update({ inspection_due_date: detailForm.nextInspectionDue }).eq("id", detailForm.assetId);
      }

      setMessage(`Inspection record ${selectedRecord.inspection_number || selectedRecord.reference || ""} updated.`);
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
            <div style={fieldModeEyebrowStyle}>Asset Inspection</div>
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
        title="Inspection Log"
        description="Capture one inspection event per row with mobile-friendly fields, live evidence upload, and a clear inspection history for each asset."
        contextCards={[
          { label: "Last Refreshed", value: lastRefreshed || "-" },
          { label: "Overdue", value: overdueCount },
          { label: "Due Soon", value: dueSoonCount },
          { label: "Latest Record", value: latestRecord?.asset?.asset_code || "No inspections logged" },
        ]}
      />

      <div style={topMetaRowStyle}>
        <Link href="/assets" style={backLinkStyle}>
          ← Back to Assets
        </Link>
        <div style={statusBannerStyle}>
          <strong>Status:</strong> {message}
        </div>
      </div>

      <section style={attentionGridStyle}>
        <AttentionCard
          title="Overdue"
          summary={`${overdueCount} assets overdue`}
          detail="These inspection follow-ups should be prioritized first in the field."
          tone="red"
        />
        <AttentionCard
          title="Due Soon"
          summary={`${dueSoonCount} due within 30 days`}
          detail="Use this to plan the next inspection workload before items slip overdue."
          tone="amber"
        />
        <AttentionCard
          title="Coverage"
          summary={`${filteredRecords.length} visible inspection records`}
          detail="Filter by asset or result and keep the full inspection history attached to the asset."
          tone="blue"
        />
      </section>
        </>
      )}

      <section style={isFieldMode ? fieldModeStackedGridStyle : stackedGridStyle}>
        <SectionCard
          title="Add Inspection Record"
          subtitle={
            isFieldMode
              ? "Focused field inspection entry for the selected asset."
              : "Compact inspection entry with clear field alignment, direct people management, and one saved history row per inspection event."
          }
        >
          <form onSubmit={handleSubmit}>
            <div style={mobileFormGridStyle}>
              <Field label="Inspection Number">
                <input value="Assigned on save" readOnly style={readOnlyInputStyle} />
              </Field>

              <Field label="Asset">
                <select
                  value={form.assetId}
                  onChange={(e) => {
                    setForm((prev) => ({
                      ...prev,
                      assetId: e.target.value,
                    }));
                  }}
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

              <Field label="Inspector">
                <select
                  value={form.inspector}
                  onChange={(e) => setForm((prev) => ({ ...prev, inspector: e.target.value }))}
                  style={inputStyle}
                >
                  <option value="">Select inspector</option>
                  {createPeopleOptions.map((person) => (
                    <option key={person} value={person}>
                      {person}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Inspection Date">
                <input
                  type="date"
                  value={form.inspectionDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, inspectionDate: e.target.value }))}
                  style={inputStyle}
                />
              </Field>

              <Field label="Result">
                <select
                  value={form.result}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      result: e.target.value as InspectionForm["result"],
                    }))
                  }
                  style={inputStyle}
                >
                  <option value="Pass">Pass</option>
                  <option value="Fail">Fail</option>
                  <option value="Pass with Observations">Pass with Observations</option>
                </select>
              </Field>

              <Field label="Next Inspection Due">
                <input
                  type="date"
                  value={form.nextInspectionDue}
                  onChange={(e) => setForm((prev) => ({ ...prev, nextInspectionDue: e.target.value }))}
                  style={inputStyle}
                />
              </Field>

              <Field label="Action Required">
                <select
                  value={form.actionRequired ? "Yes" : "No"}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, actionRequired: e.target.value === "Yes" }))
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
                    onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
                    style={{
                      ...inputStyle,
                      padding: "9px 12px",
                    }}
                  />
                  <div style={helperTextStyle}>
                    {certificateFile ? certificateFile.name : "No file selected"}
                  </div>
                </div>
              </Field>

              <div style={fullSpanStyle}>
              <Field label="Findings">
                <textarea
                  rows={4}
                  value={form.findings}
                  onChange={(e) => setForm((prev) => ({ ...prev, findings: e.target.value }))}
                  style={textareaStyle}
                  placeholder="Inspection findings or observations"
                />
              </Field>
              </div>

              <div style={fullSpanStyle}>
              <Field label="Actions Required">
                <textarea
                  rows={4}
                  value={form.actionsRequired}
                  onChange={(e) => setForm((prev) => ({ ...prev, actionsRequired: e.target.value }))}
                  style={textareaStyle}
                  placeholder="Follow-up actions required"
                />
              </Field>
              </div>
            </div>

            <div style={buttonRowStyle}>
              <button type="submit" style={primaryButtonStyle} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Inspection Record"}
              </button>
            </div>
          </form>
        </SectionCard>

        {!isFieldMode ? (
          <>
        <SectionCard
          title="Filters & History"
          subtitle="Filter by asset or result to review one asset's full inspection history over time."
        >
          <div style={mobileFormGridStyle}>
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

            <Field label="Result Filter">
              <select value={resultFilter} onChange={(e) => setResultFilter(e.target.value)} style={inputStyle}>
                <option value="">All results</option>
                <option value="Pass">Pass</option>
                <option value="Fail">Fail</option>
                <option value="Pass with Observations">Pass with Observations</option>
              </select>
            </Field>
          </div>

          <div style={buttonRowStyle}>
            <button
              type="button"
              style={secondaryButtonStyle}
              onClick={() => {
                setAssetFilter("");
                setResultFilter("");
              }}
            >
              Clear Filters
            </button>
          </div>

          <div style={historyListStyle}>
            {filteredRecords.length === 0 ? (
              <div style={emptyStateStyle}>No inspection records match the current filters.</div>
            ) : (
              filteredRecords.map(({ record, asset, status }) => {
                const statusTone = getStatusTone(status);
                const resultTone = getResultTone(record.result);
                const daysRemaining = getDaysRemaining(record.next_inspection_due);
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
                      setDetailForm(buildInspectionForm(record));
                    }}
                  >
                    <div style={historyHeaderStyle}>
                      <div>
                        <div style={historyTitleStyle}>{record.inspection_number || record.reference || "Inspection Record"}</div>
                        <div style={historyMetaStyle}>{asset?.name || "Unknown asset"}</div>
                        <div style={historyMetaStyle}>{asset?.asset_code || asset?.id || "-"}</div>
                      </div>
                      <div style={historyBadgeRowStyle}>
                        <span
                          style={{
                            ...pillStyle,
                            background: resultTone.bg,
                            color: resultTone.text,
                          }}
                        >
                          {record.result || "Not Set"}
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
                        <strong>Inspection Date:</strong> {formatDate(record.inspection_date)}
                      </div>
                      <div>
                        <strong>Inspector:</strong> {record.inspector || "-"}
                      </div>
                      <div>
                        <strong>Next Due:</strong> {formatDate(record.next_inspection_due)}
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
                        <strong>Findings:</strong> {record.findings || record.notes || "-"}
                      </div>
                      <div>
                        <strong>Actions Required:</strong> {record.actions_required || "-"}
                      </div>
                    </div>

                    <div style={historyFooterStyle}>
                      <span>{record.file_name || "No file attached"}</span>
                      <span>{formatDateTime(record.created_at || record.uploaded_at)}</span>
                    </div>

                    <div style={buttonRowStyle}>
                      {record.action_required ? (
                        <button
                          type="button"
                          style={actionLinkButtonStyle}
                          onClick={(event) => {
                            event.stopPropagation();
                            generateActionFromInspection(record);
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
          title={selectedRecord ? `Inspection Detail - ${selectedRecord.inspection_number || selectedRecord.reference || "Record"}` : "Inspection Detail"}
          subtitle={
            selectedRecord
              ? "Edit the selected inspection record, keep the history intact, and trigger action generation only when required."
              : "Click an inspection record to open the full detail and edit panel."
          }
        >
          {!selectedRecord ? (
            <div style={emptyStateStyle}>No inspection record selected.</div>
          ) : (
            <div style={detailPanelStyle}>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  style={secondaryButtonStyle}
                  onClick={() => {
                    setSelectedRecordId("");
                    setDetailForm(emptyForm);
                  }}
                >
                  Hide Panel
                </button>
              </div>

              <div style={detailSummaryRowStyle}>
                <SummaryTile label="Inspection Number" value={selectedRecord.inspection_number || selectedRecord.reference || "-"} />
                <SummaryTile label="Asset" value={assetMap.get(selectedRecord.asset_id)?.asset_code || "-"} />
                <SummaryTile label="Created" value={formatDateTime(selectedRecord.created_at || selectedRecord.uploaded_at)} />
              </div>

              <div style={mobileFormGridStyle}>
                <Field label="Inspection Number">
                  <input value={selectedRecord.inspection_number || selectedRecord.reference || ""} readOnly style={readOnlyInputStyle} />
                </Field>

                <Field label="Asset">
                  <select
                    value={detailForm.assetId}
                    onChange={(e) => setDetailForm((prev) => ({ ...prev, assetId: e.target.value }))}
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

              <Field label="Inspector">
                <select
                  value={detailForm.inspector}
                  onChange={(e) => setDetailForm((prev) => ({ ...prev, inspector: e.target.value }))}
                  style={inputStyle}
                  >
                    <option value="">Select inspector</option>
                    {detailPeopleOptions.map((person) => (
                      <option key={person} value={person}>
                        {person}
                    </option>
                  ))}
                </select>
              </Field>

                <Field label="Inspection Date">
                  <input
                    type="date"
                    value={detailForm.inspectionDate}
                    onChange={(e) => setDetailForm((prev) => ({ ...prev, inspectionDate: e.target.value }))}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Result">
                  <select
                    value={detailForm.result}
                    onChange={(e) =>
                      setDetailForm((prev) => ({
                        ...prev,
                        result: e.target.value as InspectionForm["result"],
                      }))
                    }
                    style={inputStyle}
                  >
                    <option value="Pass">Pass</option>
                    <option value="Fail">Fail</option>
                    <option value="Pass with Observations">Pass with Observations</option>
                  </select>
                </Field>

                <Field label="Next Inspection Due">
                  <input
                    type="date"
                    value={detailForm.nextInspectionDue}
                    onChange={(e) => setDetailForm((prev) => ({ ...prev, nextInspectionDue: e.target.value }))}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Action Required?">
                  <select
                    value={detailForm.actionRequired ? "Yes" : "No"}
                    onChange={(e) =>
                      setDetailForm((prev) => ({ ...prev, actionRequired: e.target.value === "Yes" }))
                    }
                    style={inputStyle}
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </Field>

                <div style={fullSpanStyle}>
                  <Field label="Findings">
                    <textarea
                      rows={4}
                      value={detailForm.findings}
                      onChange={(e) => setDetailForm((prev) => ({ ...prev, findings: e.target.value }))}
                      style={textareaStyle}
                    />
                  </Field>
                </div>

                <div style={fullSpanStyle}>
                  <Field label="Actions Required / Notes">
                    <textarea
                      rows={4}
                      value={detailForm.actionsRequired}
                      onChange={(e) => setDetailForm((prev) => ({ ...prev, actionsRequired: e.target.value }))}
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
                  {detailForm.actionRequired ? (
                    <button
                      type="button"
                      style={actionLinkButtonStyle}
                      onClick={() => generateActionFromInspection(selectedRecord)}
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
    <label style={fieldWrapStyle}>
      <span style={fieldLabelStyle}>{label}</span>
      {children}
    </label>
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

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div style={summaryTileStyle}>
      <div style={summaryTileLabelStyle}>{label}</div>
      <div style={summaryTileValueStyle}>{value}</div>
    </div>
  );
}

export default function AssetInspectionPage() {
  return (
    <Suspense fallback={<main style={{ padding: "24px" }}>Loading inspection log...</main>}>
      <InspectionPageContent />
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
  color: "#0f766e",
};

const fieldModeTitleStyle: CSSProperties = {
  fontSize: "20px",
  fontWeight: 800,
  color: "#0f172a",
  lineHeight: 1.3,
  overflowWrap: "anywhere",
};

const topMetaRowStyle: CSSProperties = {
  marginBottom: "20px",
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  alignItems: "center",
};

const backLinkStyle: CSSProperties = {
  color: "#0f766e",
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

const attentionGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
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
  background: "#2563eb",
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
  background: "#0f766e",
  color: "#ffffff",
  border: "none",
  borderRadius: "10px",
  padding: "9px 12px",
  fontWeight: 700,
  fontSize: "12px",
  cursor: "pointer",
};

const actionLinkButtonStyle: CSSProperties = {
  background: "#2563eb",
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

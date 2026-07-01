"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { ImsTabs, ImsTopMetaRow } from "../../../src/components/ImsPrimitives";
import { useImsPermissions } from "../../../src/components/ImsPermissions";
import { QualityKpiCard } from "../../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../../src/components/QualityPageHero";
import { supabase } from "../../../src/lib/supabase";

export const dynamic = "force-dynamic";

type Asset = {
  id: string;
  asset_code: string | null;
  name: string | null;
  description: string | null;
  serial_number: string | null;
  location: string | null;
  owner: string | null;
  status: string | null;
};

type AssetPerson = {
  id: string;
  name: string;
  role: string | null;
  active: boolean;
};

type CalibrationType = "Internal" | "External";
type CalibrationStatus = "Overdue" | "Due Soon" | "In Date" | "Not Set";
type CalibrationWorkspaceView = "dashboard" | "register" | "create";

type AssetCalibrationRecord = {
  id: string;
  asset_id: string | null;
  reference: string | null;
  file_name: string | null;
  file_path: string | null;
  file_size: number | null;
  notes: string | null;
  uploaded_at: string | null;
  calibration_date: string | null;
  calibration_due_date: string | null;
  calibration_type: string | null;
  calibrated_by: string | null;
  certificate_number: string | null;
  serial_number: string | null;
  frequency_years: number | null;
  certificate_file_size: number | null;
  created_at: string | null;
};

type CalibrationForm = {
  assetId: string;
  serialNumber: string;
  calibrationDate: string;
  calibrationDueDate: string;
  calibrationType: CalibrationType;
  frequencyYears: string;
  calibratedBy: string;
  certificateNumber: string;
  notes: string;
};

type CalibrationRow = {
  id: string;
  asset: Asset | null;
  record: AssetCalibrationRecord;
  assetFilterKey: string;
  status: CalibrationStatus;
  daysRemaining: number | null;
};

const STORAGE_BUCKET = "asset-files";
const calibrationTypes: CalibrationType[] = ["Internal", "External"];

const emptyForm: CalibrationForm = {
  assetId: "",
  serialNumber: "",
  calibrationDate: "",
  calibrationDueDate: "",
  calibrationType: "External",
  frequencyYears: "1",
  calibratedBy: "",
  certificateNumber: "",
  notes: "",
};

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
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

function formatFileSize(value: number | null | undefined) {
  if (!value || value <= 0) return "-";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
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

function getCalibrationStatus(value: string | null | undefined): CalibrationStatus {
  const days = getDaysRemaining(value);
  if (days === null) return "Not Set";
  if (days < 0) return "Overdue";
  if (days <= 30) return "Due Soon";
  return "In Date";
}

function getStatusRank(status: CalibrationStatus) {
  if (status === "Overdue") return 0;
  if (status === "Due Soon") return 1;
  if (status === "In Date") return 2;
  return 3;
}

function getStatusTone(status: CalibrationStatus) {
  if (status === "Overdue") return { bg: "#fee2e2", text: "#991b1b", border: "#fecaca" };
  if (status === "Due Soon") return { bg: "#fef3c7", text: "#92400e", border: "#fde68a" };
  if (status === "In Date") return { bg: "#dcfce7", text: "#166534", border: "#bbf7d0" };
  return { bg: "#e2e8f0", text: "#334155", border: "#cbd5e1" };
}

function buildAssetFilterKey(asset: Asset | null) {
  return (asset?.asset_code || asset?.id || "").trim();
}

function addYearsToDate(value: string, years: number) {
  if (!value || !years) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  date.setFullYear(date.getFullYear() + years);
  return date.toISOString().slice(0, 10);
}

function buildCalibrationSearchText(row: CalibrationRow) {
  return [
    row.asset?.asset_code || "",
    row.asset?.name || "",
    row.asset?.description || "",
    row.record.serial_number || "",
    row.record.certificate_number || "",
    row.record.reference || "",
  ]
    .join(" ")
    .toLowerCase();
}

function buildCalibrationSubject(row: CalibrationRow) {
  if (row.asset?.asset_code || row.asset?.name) {
    return {
      title: row.asset?.asset_code || "Linked asset",
      subtitle: row.asset?.name || row.asset?.description || "Asset-linked calibration record",
    };
  }

  if (row.record.serial_number) {
    return {
      title: row.record.serial_number,
      subtitle: "Unassigned spare / standalone calibration item",
    };
  }

  return {
    title: row.record.certificate_number || row.record.reference || "Unassigned record",
    subtitle: "No linked asset recorded",
  };
}

async function createSignedFileUrl(path: string) {
  if (!path) return "";
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return "";
  return data.signedUrl;
}

async function uploadCertificate(assetId: string | null, file: File) {
  const safeName = sanitizeFileName(file.name);
  const folderKey = assetId || "unassigned";
  const path = `Calibration/${folderKey}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(error.message);
  return path;
}

function CalibrationPageContent() {
  const imsPermissions = useImsPermissions();
  const searchParams = useSearchParams();
  const linkedAsset = searchParams.get("asset")?.trim() || "";

  const [assets, setAssets] = useState<Asset[]>([]);
  const [people, setPeople] = useState<AssetPerson[]>([]);
  const [records, setRecords] = useState<AssetCalibrationRecord[]>([]);
  const [message, setMessage] = useState("Loading calibration register...");
  const [lastRefreshed, setLastRefreshed] = useState("");
  const [form, setForm] = useState<CalibrationForm>(emptyForm);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [assetFilter, setAssetFilter] = useState(linkedAsset);
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | CalibrationStatus>("");
  const [showRegisterFilters, setShowRegisterFilters] = useState(Boolean(linkedAsset));
  const [activeView, setActiveView] = useState<CalibrationWorkspaceView>("dashboard");
  const [isSaving, setIsSaving] = useState(false);
  const [isOpeningId, setIsOpeningId] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string>("");
  const [lastSuggestedDueDate, setLastSuggestedDueDate] = useState("");

  async function loadData() {
    const [assetsRes, calibrationsRes, peopleRes] = await Promise.all([
      supabase.from("assets").select("*").order("name", { ascending: true }),
      supabase
        .from("asset_calibration_records")
        .select("*")
        .order("calibration_due_date", { ascending: true, nullsFirst: false }),
      supabase
        .from("people")
        .select("id,name,role,active")
        .eq("active", true)
        .eq("department", "Assets")
        .order("name", { ascending: true }),
    ]);

    if (assetsRes.error || calibrationsRes.error || peopleRes.error) {
      setMessage(
        `Load failed: ${assetsRes.error?.message || calibrationsRes.error?.message || peopleRes.error?.message || "Unknown error"}`
      );
      return;
    }

    setAssets((assetsRes.data || []) as Asset[]);
    setRecords((calibrationsRes.data || []) as AssetCalibrationRecord[]);
    setPeople((peopleRes.data || []) as AssetPerson[]);
    setLastRefreshed(new Date().toLocaleString("en-GB"));
    setMessage("Calibration register loaded.");
  }

  useEffect(() => {
    void loadData();
  }, []);

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === form.assetId) || null,
    [assets, form.assetId]
  );

  const peopleOptions = useMemo(
    () =>
      people
        .map((person) => person.name.trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
    [people]
  );

  useEffect(() => {
    if (!selectedAsset?.serial_number) return;

    setForm((prev) => {
      if (prev.serialNumber.trim()) return prev;
      return { ...prev, serialNumber: selectedAsset.serial_number || "" };
    });
  }, [selectedAsset]);

  useEffect(() => {
    const years = Number(form.frequencyYears || "0");
    const suggested = addYearsToDate(form.calibrationDate, years);
    if (!suggested) return;

    setForm((prev) => {
      if (!prev.calibrationDueDate || prev.calibrationDueDate === lastSuggestedDueDate) {
        return { ...prev, calibrationDueDate: suggested };
      }
      return prev;
    });

    setLastSuggestedDueDate(suggested);
  }, [form.calibrationDate, form.frequencyYears, lastSuggestedDueDate]);

  const calibrationRows = useMemo<CalibrationRow[]>(() => {
    const assetMap = new Map(assets.map((asset) => [asset.id, asset]));
    return records
      .map((record) => {
        const asset = record.asset_id ? assetMap.get(record.asset_id) || null : null;
        const status = getCalibrationStatus(record.calibration_due_date);
        const daysRemaining = getDaysRemaining(record.calibration_due_date);
        return {
          id: record.id,
          asset,
          record,
          assetFilterKey: buildAssetFilterKey(asset),
          status,
          daysRemaining,
        };
      })
      .filter((row) => {
        const normalizedAssetFilter = assetFilter.toLowerCase();
        const matchesAsset =
          !assetFilter ||
          (assetFilter === "__UNASSIGNED__"
            ? !row.record.asset_id
            : row.assetFilterKey.toLowerCase() === normalizedAssetFilter);
        const matchesStatus = !statusFilter || row.status === statusFilter;
        const matchesSearch =
          !searchFilter.trim() || buildCalibrationSearchText(row).includes(searchFilter.trim().toLowerCase());
        return matchesAsset && matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        const rankDiff = getStatusRank(a.status) - getStatusRank(b.status);
        if (rankDiff !== 0) return rankDiff;

        const aDue = a.record.calibration_due_date ? new Date(a.record.calibration_due_date).getTime() : Number.MAX_SAFE_INTEGER;
        const bDue = b.record.calibration_due_date ? new Date(b.record.calibration_due_date).getTime() : Number.MAX_SAFE_INTEGER;
        if (aDue !== bDue) return aDue - bDue;

        const aName = a.asset?.name || a.asset?.asset_code || "";
        const bName = b.asset?.name || b.asset?.asset_code || "";
        return aName.localeCompare(bName, undefined, { numeric: true, sensitivity: "base" });
      });
  }, [assetFilter, assets, records, searchFilter, statusFilter]);

  const heroCounts = useMemo(() => {
    const statusRows = records.map((record) => getCalibrationStatus(record.calibration_due_date));
    return {
      overdue: statusRows.filter((status) => status === "Overdue").length,
      dueSoon: statusRows.filter((status) => status === "Due Soon").length,
      inDate: statusRows.filter((status) => status === "In Date").length,
      total: records.length,
    };
  }, [records]);
  const latestCalibrationLabel = useMemo(() => {
    const latest = [...records].sort((a, b) => {
      const aTime = new Date(a.calibration_date || a.created_at || 0).getTime();
      const bTime = new Date(b.calibration_date || b.created_at || 0).getTime();
      return bTime - aTime;
    })[0];

    if (!latest) return "No calibrations logged";
    const asset = latest.asset_id ? assets.find((item) => item.id === latest.asset_id) : null;
    return latest.certificate_number || latest.reference || asset?.asset_code || asset?.name || "Calibration record";
  }, [assets, records]);
  const overdueRows = calibrationRows.filter((row) => row.status === "Overdue").slice(0, 5);
  const dueSoonRows = calibrationRows.filter((row) => row.status === "Due Soon").slice(0, 5);

  function applyCalibrationKpiFilter(status: "" | CalibrationStatus) {
    setActiveView("register");
    setShowRegisterFilters(true);
    setAssetFilter("");
    setSearchFilter("");
    setStatusFilter(status);
  }

  function hasCreateAccess() {
    return imsPermissions.loaded && (imsPermissions.isMasterAdmin || imsPermissions.fullAccess || imsPermissions.canCreate);
  }

  function hasEditAccess() {
    return imsPermissions.loaded && (imsPermissions.isMasterAdmin || imsPermissions.fullAccess || imsPermissions.canEdit);
  }

  function requireCreateAccess(actionLabel: string) {
    if (hasCreateAccess()) return true;
    setMessage(`Permission required: create access is needed to ${actionLabel}.`);
    return false;
  }

  function requireEditAccess(actionLabel: string) {
    if (hasEditAccess()) return true;
    setMessage(`Permission required: edit access is needed to ${actionLabel}.`);
    return false;
  }

  async function handleAddCalibration(e: React.FormEvent) {
    e.preventDefault();

    if (!requireCreateAccess("create calibration records")) return;

    if (!form.calibrationDate || !form.calibrationDueDate) {
      setMessage("Calibration date and due date are required.");
      return;
    }

    try {
      setIsSaving(true);
      let filePath: string | null = null;
      let fileName: string | null = null;
      let fileSize: number | null = null;
      const selectedAssetId = form.assetId || null;

      if (certificateFile) {
        filePath = await uploadCertificate(selectedAssetId, certificateFile);
        fileName = certificateFile.name;
        fileSize = certificateFile.size;
      }

      const reference =
        form.certificateNumber.trim() || `CAL-${new Date(form.calibrationDate).toISOString().slice(0, 10)}`;

      const { error } = await supabase.from("asset_calibration_records").insert([
        {
          asset_id: selectedAssetId,
          reference,
          file_name: fileName,
          file_path: filePath,
          file_size: fileSize,
          notes: form.notes.trim() || null,
          uploaded_at: filePath ? new Date().toISOString() : null,
          calibration_date: form.calibrationDate,
          calibration_due_date: form.calibrationDueDate,
          calibration_type: form.calibrationType,
          calibrated_by: form.calibratedBy.trim() || null,
          certificate_number: form.certificateNumber.trim() || null,
          serial_number: form.serialNumber.trim() || null,
          frequency_years: Number(form.frequencyYears || "0") || null,
          certificate_file_size: fileSize,
        },
      ]);

      if (error) throw new Error(error.message);

      setForm(emptyForm);
      setLastSuggestedDueDate("");
      setCertificateFile(null);
      setMessage("Calibration record added successfully.");
      await loadData();
    } catch (error) {
      const err = error as Error;
      setMessage(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function openCertificate(record: AssetCalibrationRecord) {
    if (!record.file_path) {
      setMessage("No certificate file is stored for this calibration record.");
      return;
    }

    try {
      setIsOpeningId(record.id);
      const url = await createSignedFileUrl(record.file_path);
      if (!url) {
        setMessage("Unable to open certificate.");
        return;
      }

      window.open(url, "_blank", "noopener,noreferrer");
      setMessage("Certificate opened.");
    } finally {
      setIsOpeningId("");
    }
  }

  async function removeCalibration(row: CalibrationRow) {
    if (!requireEditAccess("remove calibration records")) return;

    const confirmed = window.confirm("Remove this calibration record?");
    if (!confirmed) return;

    try {
      setDeletingId(row.id);
      if (row.record.file_path) {
        await supabase.storage.from(STORAGE_BUCKET).remove([row.record.file_path]);
      }

      const { error } = await supabase.from("asset_calibration_records").delete().eq("id", row.id);
      if (error) throw new Error(error.message);

      setMessage("Calibration record removed.");
      await loadData();
    } catch (error) {
      const err = error as Error;
      setMessage(`Remove failed: ${err.message}`);
    } finally {
      setDeletingId("");
    }
  }

  function generateActionFromCalibration(row: CalibrationRow) {
    if (!requireCreateAccess("generate linked Asset actions")) return;

    const subject = buildCalibrationSubject(row);
    const reference = row.record.certificate_number || row.record.reference || subject.title;
    const title = `Calibration follow-up - ${reference}`;
    const descriptionParts = [
      `Calibration item: ${subject.title}`,
      row.record.calibration_due_date ? `Due date: ${formatDate(row.record.calibration_due_date)}` : "",
      row.record.notes ? `Notes: ${row.record.notes}` : "",
    ].filter(Boolean);
    const query = new URLSearchParams({
      prefill_source: "Asset Calibration",
      prefill_department: "Assets",
      prefill_title: title,
      prefill_description: descriptionParts.join("\n\n") || title,
      prefill_due_date: row.record.calibration_due_date || "",
      linked_asset_id: row.record.asset_id || "",
      linked_asset_code: row.asset?.asset_code || "",
      linked_calibration_id: row.record.id,
    });

    window.location.href = `/actions?${query.toString()}`;
  }

  return (
    <main>
      <QualityPageHero
        label="ASSET MANAGEMENT"
        title="Calibration"
        description="Combined calibration log across all assets, with certificate storage, due-date visibility, and simple asset-based history filtering."
        contextCards={[
          { label: "Last Refreshed", value: lastRefreshed || "-" },
          { label: "Latest Calibration", value: latestCalibrationLabel },
        ]}
      />

      <ImsTopMetaRow
        backHref="/assets/dashboard"
        backLabel="Back to Dashboard"
        status={
          <>
            <strong>Status:</strong> {message}
          </>
        }
      />

      <ImsTabs<CalibrationWorkspaceView>
        tabs={[
          { value: "dashboard", label: "Dashboard" },
          { value: "register", label: "Calibration Register" },
          { value: "create", label: "Create Calibration" },
        ]}
        active={activeView}
        onChange={setActiveView}
        ariaLabel="Asset calibration workspace views"
      />

      {activeView === "dashboard" ? (
      <>
      <section style={attentionGridStyle}>
        <QualityKpiCard
          title="Overdue"
          value={heroCounts.overdue}
          accent="#dc2626"
          onClick={() => applyCalibrationKpiFilter("Overdue")}
        />
        <QualityKpiCard
          title="Due Soon"
          value={heroCounts.dueSoon}
          accent="#f59e0b"
          onClick={() => applyCalibrationKpiFilter("Due Soon")}
        />
        <QualityKpiCard
          title="Coverage"
          value={heroCounts.total}
          accent="#2563eb"
          onClick={() => applyCalibrationKpiFilter("")}
        />
      </section>
      <section style={twoColumnGridStyle}>
        <SectionCard
          title="Overdue Watchlist"
          subtitle="Urgent calibration items that need immediate attention."
        >
          {overdueRows.length === 0 ? (
            <div style={helperTextStyle}>No overdue calibration items.</div>
          ) : (
            overdueRows.map((row) => (
              <div key={row.id} style={watchlistItemStyle}>
                <div style={watchlistItemTitleStyle}>{row.asset?.asset_code || "Unassigned"}</div>
                <div style={watchlistItemMetaStyle}>
                  {row.asset?.name || row.record.serial_number || "Unknown item"} • Due{" "}
                  {formatDate(row.record.calibration_due_date)}
                </div>
              </div>
            ))
          )}
        </SectionCard>

        <SectionCard
          title="Due Soon"
          subtitle="Calibration records coming due in the next 30 days."
        >
          {dueSoonRows.length === 0 ? (
            <div style={helperTextStyle}>No due-soon calibration items.</div>
          ) : (
            dueSoonRows.map((row) => (
              <div key={row.id} style={watchlistItemStyle}>
                <div style={watchlistItemTitleStyle}>{row.asset?.asset_code || "Unassigned"}</div>
                <div style={watchlistItemMetaStyle}>
                  {row.asset?.name || row.record.serial_number || "Unknown item"} • Due{" "}
                  {formatDate(row.record.calibration_due_date)}
                </div>
              </div>
            ))
          )}
        </SectionCard>
      </section>
      </>
      ) : null}

      {activeView === "create" ? (
      <section style={twoColumnGridStyle}>
        <SectionCard
          title="Add Calibration Record"
          subtitle="Add a calibration event for a linked asset or an unassigned spare item, while keeping one certificate and one history row per event."
        >
          <form onSubmit={handleAddCalibration}>
            <div style={formGridStyle}>
              <Field label="Asset">
                <select
                  value={form.assetId}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      assetId: e.target.value,
                      serialNumber:
                        e.target.value === ""
                          ? prev.serialNumber
                          : assets.find((asset) => asset.id === e.target.value)?.serial_number ||
                            prev.serialNumber,
                    }))
                  }
                  style={inputStyle}
                >
                  <option value="">Unassigned / spare item</option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {(asset.asset_code || "No Code") + " - " + (asset.name || "Unnamed Asset")}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Calibration Type">
                <select
                  value={form.calibrationType}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, calibrationType: e.target.value as CalibrationType }))
                  }
                  style={inputStyle}
                >
                  {calibrationTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Serial Number">
                <input
                  value={form.serialNumber}
                  onChange={(e) => setForm((prev) => ({ ...prev, serialNumber: e.target.value }))}
                  style={inputStyle}
                  placeholder="Serial number or spare item ID"
                />
              </Field>

              <Field label="Frequency">
                <select
                  value={form.frequencyYears}
                  onChange={(e) => setForm((prev) => ({ ...prev, frequencyYears: e.target.value }))}
                  style={inputStyle}
                >
                  <option value="1">1 year</option>
                  <option value="2">2 years</option>
                  <option value="3">3 years</option>
                  <option value="4">4 years</option>
                  <option value="5">5 years</option>
                </select>
              </Field>

              <Field label="Calibration Date">
                <input
                  type="date"
                  value={form.calibrationDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, calibrationDate: e.target.value }))}
                  style={inputStyle}
                />
              </Field>

              <Field label="Calibration Due Date">
                <input
                  type="date"
                  value={form.calibrationDueDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, calibrationDueDate: e.target.value }))}
                  style={inputStyle}
                />
              </Field>

              <Field label="Calibrated By">
                <select
                  value={form.calibratedBy}
                  onChange={(e) => setForm((prev) => ({ ...prev, calibratedBy: e.target.value }))}
                  style={inputStyle}
                >
                  <option value="">Select person</option>
                  {peopleOptions.map((person) => (
                    <option key={person} value={person}>
                      {person}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Certificate Number">
                <input
                  value={form.certificateNumber}
                  onChange={(e) => setForm((prev) => ({ ...prev, certificateNumber: e.target.value }))}
                  style={inputStyle}
                  placeholder="Certificate reference"
                />
              </Field>
            </div>

            <div style={assetInfoCardStyle}>
              <div style={assetInfoTitleStyle}>Selected Asset Details</div>
              {selectedAsset ? (
                <div style={assetInfoGridStyle}>
                  <div>
                    <strong>Asset Code:</strong> {selectedAsset.asset_code || "-"}
                  </div>
                  <div>
                    <strong>Item:</strong> {selectedAsset.name || "-"}
                  </div>
                  <div>
                    <strong>Description:</strong> {selectedAsset.description || "-"}
                  </div>
                  <div>
                    <strong>Location:</strong> {selectedAsset.location || "-"}
                  </div>
                  <div>
                    <strong>Owner:</strong> {selectedAsset.owner || "-"}
                  </div>
                  <div>
                    <strong>Serial Number:</strong> {selectedAsset.serial_number || "-"}
                  </div>
                </div>
              ) : (
                <div style={helperTextStyle}>
                  Leave the asset blank for a spare or standalone calibration item. Serial number and certificate
                  details will still identify the record.
                </div>
              )}
            </div>

            <div style={fieldStackStyle}>
              <Field label="Upload Certificate">
                <div style={uploadRowStyle}>
                  <label style={uploadButtonStyle}>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      style={{ display: "none" }}
                      onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
                    />
                    {certificateFile ? "Replace Certificate" : "Upload Certificate"}
                  </label>
                  <span style={helperTextStyle}>
                    {certificateFile ? `${certificateFile.name} • ${formatFileSize(certificateFile.size)}` : "No file selected"}
                  </span>
                </div>
              </Field>

              <Field label="Notes">
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={4}
                  style={textareaStyle}
                  placeholder="Optional calibration notes"
                />
              </Field>
            </div>

            <div style={buttonRowStyle}>
              <button type="submit" style={primaryButtonStyle} disabled={isSaving}>
                {isSaving ? "Saving..." : "Add Calibration Record"}
              </button>
            </div>
          </form>
        </SectionCard>
      </section>
      ) : null}

      {activeView === "register" ? (
      <>
        <SectionCard
          title="Calibration Register Filters"
          subtitle="Review urgent calibration items first, then narrow the combined log by asset, serial number, certificate number, or calibration status."
        >
          <div style={watchlistWrapStyle}>
            <div>
              <div style={watchlistTitleStyle}>Overdue Watchlist</div>
              {overdueRows.length === 0 ? (
                <div style={helperTextStyle}>No overdue calibration items.</div>
              ) : (
                overdueRows.map((row) => (
                  <div key={row.id} style={watchlistItemStyle}>
                    <div style={watchlistItemTitleStyle}>{row.asset?.asset_code || "-"}</div>
                    <div style={watchlistItemMetaStyle}>
                      {row.asset?.name || "Unknown asset"} • Due {formatDate(row.record.calibration_due_date)}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div>
              <div style={watchlistTitleStyle}>Due Soon</div>
              {dueSoonRows.length === 0 ? (
                <div style={helperTextStyle}>No due-soon calibration items.</div>
              ) : (
                dueSoonRows.map((row) => (
                  <div key={row.id} style={watchlistItemStyle}>
                    <div style={watchlistItemTitleStyle}>{row.asset?.asset_code || "-"}</div>
                    <div style={watchlistItemMetaStyle}>
                      {row.asset?.name || "Unknown asset"} • Due {formatDate(row.record.calibration_due_date)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={filterGridStyle}>
            <Field label="Search Serial / Certificate">
              <input
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                style={inputStyle}
                placeholder="Search serial number or certificate number"
              />
            </Field>
            <button
              type="button"
              style={showRegisterFilters ? secondaryButtonStyle : miniButtonStyle}
              onClick={() => setShowRegisterFilters((prev) => !prev)}
            >
              {showRegisterFilters ? "Hide Filters" : "Show Filters"}
            </button>
          </div>

          {showRegisterFilters ? (
            <div style={formGridStyle}>
            <Field label="Asset">
              <select value={assetFilter} onChange={(e) => setAssetFilter(e.target.value)} style={inputStyle}>
                <option value="">All assets</option>
                <option value="__UNASSIGNED__">Unassigned / spare items</option>
                {assets.map((asset) => {
                  const value = buildAssetFilterKey(asset);
                  return (
                    <option key={asset.id} value={value}>
                      {(asset.asset_code || asset.id) + " - " + (asset.name || "Unnamed Asset")}
                    </option>
                  );
                })}
              </select>
            </Field>

            <Field label="Calibration Status">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter((e.target.value || "") as "" | CalibrationStatus)}
                style={inputStyle}
              >
                <option value="">All statuses</option>
                <option value="Overdue">Overdue</option>
                <option value="Due Soon">Due Soon</option>
                <option value="In Date">In Date</option>
                <option value="Not Set">Not Set</option>
              </select>
            </Field>
            </div>
          ) : null}

          <div style={buttonRowStyle}>
            {showRegisterFilters ? (
              <button
                type="button"
                style={secondaryButtonStyle}
                onClick={() => {
                  setAssetFilter("");
                  setSearchFilter("");
                  setStatusFilter("");
                }}
              >
                Clear Filters
              </button>
            ) : null}
            <div style={registerCountStyle}>
              Showing <strong>{calibrationRows.length}</strong> records
            </div>
          </div>
        </SectionCard>

      <SectionCard
        title="Calibration Register"
        subtitle="Combined log across all assets, sorted with overdue items first, then due soon, then nearest due date."
      >
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={tableHeadStyle}>Status</th>
                <th style={tableHeadStyle}>Asset No. / Code</th>
                <th style={tableHeadStyle}>Asset / Description</th>
                <th style={tableHeadStyle}>Serial Number</th>
                <th style={tableHeadStyle}>Calibration Date</th>
                <th style={tableHeadStyle}>Due Date</th>
                <th style={tableHeadStyle}>Days Remaining</th>
                <th style={tableHeadStyle}>Certificate No.</th>
                <th style={tableHeadStyle}>Certificate</th>
                <th style={tableHeadStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {calibrationRows.length === 0 ? (
                <tr>
                  <td colSpan={10} style={emptyCellStyle}>
                    No calibration records match the current filters.
                  </td>
                </tr>
              ) : (
                calibrationRows.map((row) => {
                  const tone = getStatusTone(row.status);
                  const subject = buildCalibrationSubject(row);
                  return (
                    <tr key={row.id} style={{ background: tone.bg }}>
                      <td style={tableCellStyle}>
                        <StatusBadge value={row.status} />
                      </td>
                      <td style={tableCellStyle}>{row.asset?.asset_code || "Unassigned"}</td>
                      <td style={tableCellStyle}>
                        <div style={cellTitleStyle}>{subject.title}</div>
                        <div style={cellMetaStyle}>{subject.subtitle}</div>
                      </td>
                      <td style={tableCellStyle}>{row.record.serial_number || "-"}</td>
                      <td style={tableCellStyle}>{formatDate(row.record.calibration_date)}</td>
                      <td style={tableCellStyle}>{formatDate(row.record.calibration_due_date)}</td>
                      <td style={tableCellStyle}>
                        {row.daysRemaining === null
                          ? "-"
                          : row.daysRemaining < 0
                            ? `${Math.abs(row.daysRemaining)} overdue`
                            : `${row.daysRemaining} days`}
                      </td>
                      <td style={tableCellStyle}>
                        {row.record.certificate_number || row.record.reference || "-"}
                      </td>
                      <td style={tableCellStyle}>
                        {row.record.file_path ? (
                          <button
                            type="button"
                            style={miniButtonStyle}
                            onClick={() => void openCertificate(row.record)}
                            disabled={isOpeningId === row.id}
                          >
                            {isOpeningId === row.id ? "Opening..." : "Open"}
                          </button>
                        ) : (
                          <span style={cellMetaStyle}>No file</span>
                        )}
                      </td>
                      <td style={tableCellStyle}>
                        <div style={rowActionStackStyle}>
                          <button
                            type="button"
                            style={miniButtonStyle}
                            onClick={() => generateActionFromCalibration(row)}
                          >
                            Generate Action
                          </button>
                          <button
                            type="button"
                            style={dangerButtonStyle}
                            onClick={() => void removeCalibration(row)}
                            disabled={deletingId === row.id}
                          >
                            {deletingId === row.id ? "Removing..." : "Remove"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
      </>
      ) : null}
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

function StatusBadge({ value }: { value: CalibrationStatus }) {
  const tone = getStatusTone(value);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "999px",
        padding: "6px 10px",
        fontSize: "12px",
        fontWeight: 700,
        background: tone.bg,
        color: tone.text,
        border: `1px solid ${tone.border}`,
      }}
    >
      {value}
    </span>
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

export default function AssetCalibrationPage() {
  return (
    <Suspense fallback={<main style={{ padding: "24px" }}>Loading calibration register...</main>}>
      <CalibrationPageContent />
    </Suspense>
  );
}

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

const twoColumnGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.08fr) minmax(340px, 0.92fr)",
  gap: "20px",
  marginBottom: "20px",
};

const panelStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: "18px",
  border: "1px solid #dbe7f3",
  boxShadow: "0 14px 28px rgba(15, 23, 42, 0.06)",
  padding: "22px",
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

const sectionHeaderRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
  marginBottom: "18px",
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

const formGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "14px",
};

const filterGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
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
  borderRadius: "12px",
  border: "1px solid #cbd5e1",
  padding: "10px 12px",
  fontSize: "14px",
  background: "#ffffff",
  color: "#0f172a",
};

const textareaStyle: CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  minHeight: "96px",
};

const assetInfoCardStyle: CSSProperties = {
  marginTop: "16px",
  borderRadius: "16px",
  border: "1px solid #dbe7f3",
  background: "#f8fafc",
  padding: "16px",
};

const assetInfoTitleStyle: CSSProperties = {
  fontWeight: 800,
  color: "#0f172a",
  marginBottom: "10px",
};

const assetInfoGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "10px 16px",
  color: "#334155",
  fontSize: "14px",
};

const helperTextStyle: CSSProperties = {
  fontSize: "13px",
  color: "#64748b",
};

const fieldStackStyle: CSSProperties = {
  display: "grid",
  gap: "14px",
  marginTop: "16px",
};

const watchlistWrapStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "14px",
  marginBottom: "16px",
};

const watchlistTitleStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 800,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginBottom: "8px",
};

const watchlistItemStyle: CSSProperties = {
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  padding: "10px 12px",
  marginBottom: "8px",
};

const watchlistItemTitleStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 800,
  color: "#0f172a",
};

const watchlistItemMetaStyle: CSSProperties = {
  marginTop: "4px",
  fontSize: "12px",
  color: "#64748b",
  lineHeight: 1.45,
};

const uploadRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
};

const uploadButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "10px",
  background: "#3A9B98",
  color: "#ffffff",
  padding: "10px 14px",
  fontWeight: 700,
  fontSize: "13px",
  cursor: "pointer",
};

const buttonRowStyle: CSSProperties = {
  marginTop: "18px",
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  alignItems: "center",
};

const primaryButtonStyle: CSSProperties = {
  background: "#3A9B98",
  color: "#ffffff",
  border: "none",
  borderRadius: "12px",
  padding: "11px 16px",
  fontWeight: 800,
  fontSize: "14px",
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  background: "#e2e8f0",
  color: "#0f172a",
  border: "none",
  borderRadius: "12px",
  padding: "10px 14px",
  fontWeight: 700,
  fontSize: "13px",
  cursor: "pointer",
};

const registerCountStyle: CSSProperties = {
  fontSize: "14px",
  color: "#475569",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  background: "#ffffff",
  minWidth: 960,
  fontSize: "13px",
};

const tableHeadStyle: CSSProperties = {
  textAlign: "left",
  padding: "13px 14px",
  background: "#f8fafc",
  color: "#334155",
  fontSize: "12px",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  borderBottom: "1px solid #dbe3ef",
  whiteSpace: "nowrap",
};

const tableCellStyle: CSSProperties = {
  padding: "13px 14px",
  borderBottom: "1px solid #edf2f7",
  color: "#0f172a",
  verticalAlign: "middle",
  fontSize: "13px",
  lineHeight: 1.45,
};

const emptyCellStyle: CSSProperties = {
  padding: "26px 14px",
  textAlign: "center",
  color: "#64748b",
  background: "#f8fafc",
  borderBottom: "1px dashed #cbd5e1",
};

const cellTitleStyle: CSSProperties = {
  fontWeight: 700,
  color: "#0f172a",
  marginBottom: "4px",
};

const cellMetaStyle: CSSProperties = {
  color: "#64748b",
  fontSize: "12px",
  lineHeight: 1.5,
};

const miniButtonStyle: CSSProperties = {
  background: "#3A9B98",
  color: "#ffffff",
  border: "none",
  borderRadius: "10px",
  padding: "8px 12px",
  fontWeight: 700,
  fontSize: "12px",
  cursor: "pointer",
};

const rowActionStackStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  alignItems: "center",
};

const dangerButtonStyle: CSSProperties = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  borderRadius: "10px",
  padding: "8px 12px",
  fontWeight: 700,
  fontSize: "12px",
  cursor: "pointer",
};


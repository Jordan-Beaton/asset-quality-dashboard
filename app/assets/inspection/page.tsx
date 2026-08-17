"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { ImsButton, ImsFilterPanel, ImsPanel, ImsTabs, ImsTopMetaRow } from "../../../src/components/ImsPrimitives";
import { useImsPermissions } from "../../../src/components/ImsPermissions";
import { QualityKpiCard } from "../../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../../src/components/QualityPageHero";
import {
  imsColours,
  imsInputStyle,
  imsTableCellStyle,
  imsTableHeadStyle,
  imsTableInfoRowStyle,
  imsTableStyle,
} from "../../../src/components/imsTheme";
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
type InspectionWorkspaceView = "dashboard" | "register" | "create";

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
  if (status === "Overdue") return { bg: "#ECECE7", text: "#F93822", border: "#ECECE7" };
  if (status === "Due Soon") return { bg: "#ECECE7", text: "#000000", border: "#ECECE7" };
  if (status === "In Date") return { bg: "#ECECE7", text: "#005670", border: "#ECECE7" };
  return { bg: "#D0D0CE", text: "#53565A", border: "#D0D0CE" };
}

function getStatusRank(status: InspectionStatus) {
  if (status === "Overdue") return 0;
  if (status === "Due Soon") return 1;
  if (status === "In Date") return 2;
  return 3;
}

function getResultTone(result: string | null | undefined) {
  const value = (result || "").toLowerCase();
  if (value === "pass") return { bg: "#ECECE7", text: "#005670" };
  if (value === "fail") return { bg: "#ECECE7", text: "#F93822" };
  if (value.includes("observation")) return { bg: "#ECECE7", text: "#000000" };
  return { bg: "#D0D0CE", text: "#53565A" };
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
  const imsPermissions = useImsPermissions();
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
  const [dueStatusFilter, setDueStatusFilter] = useState<"" | InspectionStatus>("");
  const [registerSearch, setRegisterSearch] = useState("");
  const [showRegisterFilters, setShowRegisterFilters] = useState(Boolean(linkedAssetParam));
  const [activeView, setActiveView] = useState<InspectionWorkspaceView>("dashboard");
  const [fieldQrDataUrl, setFieldQrDataUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingDetail, setIsSavingDetail] = useState(false);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [openingId, setOpeningId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [selectedRecordId, setSelectedRecordId] = useState("");
  const detailPanelRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    const requestedView = searchParams.get("view");
    if (requestedView === "create" || requestedView === "register" || requestedView === "dashboard") {
      setActiveView(requestedView);
    }
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/assets/inspection/field`;
    QRCode.toDataURL(url, { margin: 1, width: 220, color: { dark: "#005670", light: "#ffffff" } })
      .then(setFieldQrDataUrl)
      .catch(() => setFieldQrDataUrl(""));
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
        const search = registerSearch.trim().toLowerCase();
        const matchesSearch =
          !search ||
          [
            record.inspection_number,
            record.reference,
            record.inspector,
            record.result,
            record.findings,
            record.actions_required,
            record.notes,
            asset?.asset_code,
            asset?.name,
            asset?.description,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(search));
        const matchesAsset =
          !assetFilter ||
          (asset?.asset_code || "").toLowerCase() === assetFilter.toLowerCase() ||
          record.asset_id.toLowerCase() === assetFilter.toLowerCase();
        const matchesResult = !resultFilter || (record.result || "") === resultFilter;
        const matchesDueStatus = !dueStatusFilter || status === dueStatusFilter;
        return matchesSearch && matchesAsset && matchesResult && matchesDueStatus && Boolean(asset);
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
  }, [assetFilter, assetMap, dueStatusFilter, records, registerSearch, resultFilter]);

  const overdueCount = filteredRecords.filter((item) => item.status === "Overdue").length;
  const dueSoonCount = filteredRecords.filter((item) => item.status === "Due Soon").length;
  const latestRecord = filteredRecords[0] || null;

  function scrollToDetailPanel() {
    setTimeout(() => {
      detailPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  }

  function applyInspectionKpiFilter(status: "" | InspectionStatus) {
    setActiveView("register");
    setShowRegisterFilters(true);
    setDueStatusFilter(status);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!requireCreateAccess("create inspection records")) return;

    if (!form.assetId || !form.inspectionDate || !form.inspector.trim()) {
      setMessage("Please complete: Asset, Inspection Date, and Carried Out By.");
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
    if (!requireEditAccess("remove inspection records")) return;

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
    if (!requireCreateAccess("generate linked Asset actions")) return;

    const asset = assetMap.get(record.asset_id) || null;
    const query = new URLSearchParams({
      prefill_source: "Asset Inspection",
      prefill_department: "Assets",
      linked_asset_id: record.asset_id,
      linked_asset_code: asset?.asset_code || "",
      linked_inspection_id: record.id,
      linked_inspection_number: record.inspection_number || "",
    });
    window.location.href = `/actions?${query.toString()}`;
  }

  async function saveRecordDetail() {
    if (!selectedRecord) return;
    if (!requireEditAccess("update inspection records")) return;

    if (!detailForm.assetId || !detailForm.inspectionDate || !detailForm.inspector.trim()) {
      setMessage("Please complete: Asset, Inspection Date, and Carried Out By.");
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
          { label: "Latest Inspection", value: latestRecord?.asset?.asset_code || "No inspections logged" },
        ]}
      />

      <ImsTopMetaRow
        backHref="/home"
        backLabel="Back to IMS Home"
        status={
          <>
            <strong>Status:</strong> {message}
          </>
        }
      />

      <ImsTabs<InspectionWorkspaceView>
        tabs={[
          { value: "dashboard", label: "Dashboard" },
          { value: "register", label: "Inspection Register" },
          { value: "create", label: "Create Inspection" },
        ]}
        active={activeView}
        onChange={setActiveView}
        ariaLabel="Asset inspection workspace views"
      />

      {activeView === "dashboard" ? (
      <>
      <section className="quality-kpi-grid" style={attentionGridStyle}>
        <QualityKpiCard
          title="Overdue"
          value={overdueCount}
          accent="#F93822"
          onClick={() => applyInspectionKpiFilter("Overdue")}
        />
        <QualityKpiCard
          title="Due Soon"
          value={dueSoonCount}
          accent="#FFAD00"
          onClick={() => applyInspectionKpiFilter("Due Soon")}
        />
        <QualityKpiCard
          title="Coverage"
          value={records.length}
          accent="#63B1BC"
          onClick={() => applyInspectionKpiFilter("")}
        />
      </section>

      <section style={dashboardPanelGridStyle}>
        <SectionCard
          title="Mobile QR Access"
          subtitle="Scan to open the mobile Asset Inspection page, choose an asset, and complete the field inspection at point of use."
        >
          <div style={qrPanelBodyStyle}>
            {fieldQrDataUrl ? (
              <img src={fieldQrDataUrl} alt="Asset inspection field access QR code" style={qrImageStyle} />
            ) : (
              <div style={qrPlaceholderStyle}>Generating QR code...</div>
            )}
            <div style={qrCopyStackStyle}>
              <div style={qrTitleStyle}>Field inspection entry</div>
              <div style={helperTextStyle}>
                The mobile route uses the same Asset Inspection save flow and keeps the inspection history against the selected asset.
              </div>
              <Link href="/assets/inspection/field" style={secondaryLinkButtonStyle}>
                Open mobile inspection page
              </Link>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Register Standard"
          subtitle="Inspection rows drill into the detail panel, with due status, results, evidence links, and linked action generation in the same operational rhythm as HSE."
        >
          <div style={dashboardFeatureGridStyle}>
            <SummaryTile label="Current Records" value={String(records.length)} />
            <SummaryTile label="Overdue" value={String(overdueCount)} />
            <SummaryTile label="Due Soon" value={String(dueSoonCount)} />
          </div>
        </SectionCard>
      </section>
      </>
      ) : null}
        </>
      )}

      {(isFieldMode || activeView === "create") ? (
      <section style={isFieldMode ? fieldModeStackedGridStyle : fullWidthSectionStyle}>
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

              <Field label="Carried Out By">
                <select
                  value={form.inspector}
                  onChange={(e) => setForm((prev) => ({ ...prev, inspector: e.target.value }))}
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
              <button type="submit" style={primaryButtonStyle} disabled={isSaving || !hasCreateAccess()}>
                {isSaving ? "Saving..." : "Save Inspection Record"}
              </button>
            </div>
          </form>
        </SectionCard>
      </section>
      ) : null}

        {!isFieldMode && activeView === "register" ? (
          <>
        <ImsPanel
          title="Inspection Register"
          subtitle="Filter, scan, and open inspection records in the same register pattern used across HSE."
        >
          <ImsFilterPanel
            search={registerSearch}
            onSearchChange={setRegisterSearch}
            searchPlaceholder="Search inspection, asset, inspector, finding..."
            showFilters={showRegisterFilters}
            onToggleFilters={() => setShowRegisterFilters((prev) => !prev)}
            actions={
              <div style={filterActionRowStyle}>
                <ImsButton
                  variant="primary"
                  onClick={() => {
                    setActiveView("create");
                  }}
                  disabled={!hasCreateAccess()}
                >
                  Create Inspection
                </ImsButton>
                <ImsButton
                  variant="secondary"
                  onClick={() => {
                    setRegisterSearch("");
                    setAssetFilter("");
                    setResultFilter("");
                    setDueStatusFilter("");
                  }}
                >
                  Clear Filters
                </ImsButton>
              </div>
            }
          >
            <Field label="Asset Filter">
              <select value={assetFilter} onChange={(e) => setAssetFilter(e.target.value)} style={imsInputStyle}>
                <option value="">All assets</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.asset_code || asset.id}>
                    {(asset.asset_code || asset.id) + " - " + (asset.name || "Unnamed Asset")}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Result Filter">
              <select value={resultFilter} onChange={(e) => setResultFilter(e.target.value)} style={imsInputStyle}>
                <option value="">All results</option>
                <option value="Pass">Pass</option>
                <option value="Fail">Fail</option>
                <option value="Pass with Observations">Pass with Observations</option>
              </select>
            </Field>

            <Field label="Due Status">
              <select
                value={dueStatusFilter}
                onChange={(e) => setDueStatusFilter((e.target.value || "") as "" | InspectionStatus)}
                style={imsInputStyle}
              >
                <option value="">All due statuses</option>
                <option value="Overdue">Overdue</option>
                <option value="Due Soon">Due Soon</option>
                <option value="In Date">In Date</option>
                <option value="Not Set">Not Set</option>
              </select>
            </Field>
          </ImsFilterPanel>

          <div style={imsTableInfoRowStyle}>
            Showing <strong>{filteredRecords.length}</strong> of <strong>{records.length}</strong> inspection records
          </div>

          <div style={compactTableWrapStyle}>
            <table style={{ ...imsTableStyle, minWidth: 900 }}>
              <thead>
                <tr>
                  <th style={imsTableHeadStyle}>Inspection</th>
                  <th style={imsTableHeadStyle}>Asset</th>
                  <th style={imsTableHeadStyle}>Date</th>
                  <th style={imsTableHeadStyle}>Inspector</th>
                  <th style={imsTableHeadStyle}>Result</th>
                  <th style={imsTableHeadStyle}>Next Due</th>
                  <th style={imsTableHeadStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={emptyTableCellStyle}>
                      No inspection records match the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map(({ record, asset, status }) => {
                    const statusTone = getStatusTone(status);
                    const resultTone = getResultTone(record.result);
                    const daysRemaining = getDaysRemaining(record.next_inspection_due);
                    const selected = selectedRecordId === record.id;

                    return (
                      <tr
                        key={record.id}
                        aria-selected={selected}
                        data-selected={selected ? "true" : "false"}
                        style={selected ? selectedRegisterRowStyle : registerRowStyle}
                        onClick={() => {
                          setSelectedRecordId(record.id);
                          setDetailForm(buildInspectionForm(record));
                          scrollToDetailPanel();
                        }}
                      >
                        <td style={primaryTableCellStyle}>
                          <div>{record.inspection_number || record.reference || "Inspection Record"}</div>
                          <div style={tableSubTextStyle}>{record.file_name || "No file attached"}</div>
                        </td>
                        <td style={imsTableCellStyle}>
                          <strong>{asset?.asset_code || asset?.id || "-"}</strong>
                          <div style={tableSubTextStyle}>{asset?.name || "Unknown asset"}</div>
                        </td>
                        <td style={imsTableCellStyle}>{formatDate(record.inspection_date)}</td>
                        <td style={imsTableCellStyle}>{record.inspector || "-"}</td>
                        <td style={imsTableCellStyle}>
                          <span style={{ ...pillStyle, background: resultTone.bg, color: resultTone.text }}>
                            {record.result || "Not Set"}
                          </span>
                        </td>
                        <td style={imsTableCellStyle}>
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
                          <div style={tableSubTextStyle}>
                            {daysRemaining === null
                              ? formatDate(record.next_inspection_due)
                              : daysRemaining < 0
                                ? `${Math.abs(daysRemaining)} days overdue`
                                : `${daysRemaining} days remaining`}
                          </div>
                        </td>
                        <td style={imsTableCellStyle}>{record.action_required ? "Required" : "No"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </ImsPanel>

        <section ref={detailPanelRef} style={fullWidthSectionStyle}>
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

                <Field label="Carried Out By">
                  <select
                    value={detailForm.inspector}
                    onChange={(e) => setDetailForm((prev) => ({ ...prev, inspector: e.target.value }))}
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
                      disabled={!hasCreateAccess()}
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
                    disabled={deletingId === selectedRecord.id || !hasEditAccess()}
                  >
                    {deletingId === selectedRecord.id ? "Removing..." : "Remove"}
                  </button>
                  <button
                    type="button"
                    style={primaryButtonStyle}
                    onClick={() => void saveRecordDetail()}
                    disabled={isSavingDetail || !hasEditAccess()}
                  >
                    {isSavingDetail ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </SectionCard>
        </section>
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
    red: { bg: "#ECECE7", border: "#ECECE7", title: "#F93822", summary: "#F93822" },
    amber: { bg: "#ECECE7", border: "#ECECE7", title: "#000000", summary: "#000000" },
    blue: { bg: "#ECECE7", border: "#ECECE7", title: "#005670", summary: "#005670" },
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
  color: "#005670",
};

const fieldModeTitleStyle: CSSProperties = {
  fontSize: "20px",
  fontWeight: 800,
  color: "#000000",
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
  border: "1px solid #D0D0CE",
  borderRadius: "16px",
  padding: "12px 14px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
};

const backLinkStyle: CSSProperties = {
  color: "#005670",
  fontWeight: 700,
  textDecoration: "none",
};

const statusBannerStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #D0D0CE",
  color: "#000000",
  padding: "10px 14px",
  borderRadius: "14px",
  fontSize: "14px",
};

const desktopStatusBannerStyle: CSSProperties = {
  background: "white",
  borderRadius: "12px",
  padding: "12px 16px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
  color: "#000000",
};

const attentionGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "16px",
  marginBottom: "20px",
};

const dashboardPanelGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(300px, 0.95fr) minmax(300px, 1.05fr)",
  gap: "16px",
  alignItems: "stretch",
  marginBottom: "20px",
};

const qrPanelBodyStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "180px minmax(0, 1fr)",
  gap: "18px",
  alignItems: "center",
};

const qrImageStyle: CSSProperties = {
  width: "170px",
  height: "170px",
  border: "1px solid #D0D0CE",
  borderRadius: "14px",
  padding: "8px",
  background: "#ffffff",
};

const qrPlaceholderStyle: CSSProperties = {
  width: "170px",
  height: "170px",
  border: "1px dashed #D0D0CE",
  borderRadius: "14px",
  background: "#ECECE7",
  color: "#53565A",
  display: "grid",
  placeItems: "center",
  textAlign: "center",
  fontSize: "13px",
  fontWeight: 700,
};

const qrCopyStackStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
};

const qrTitleStyle: CSSProperties = {
  fontSize: "18px",
  fontWeight: 900,
  color: "#000000",
};

const secondaryLinkButtonStyle: CSSProperties = {
  display: "inline-flex",
  width: "fit-content",
  minHeight: "42px",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "10px",
  background: "#D0D0CE",
  color: "#000000",
  textDecoration: "none",
  fontSize: "14px",
  fontWeight: 800,
  padding: "10px 14px",
};

const dashboardFeatureGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "12px",
};

const filterActionRowStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  alignItems: "center",
};

const fullWidthSectionStyle: CSSProperties = {
  marginBottom: "20px",
};

const stackedGridStyle: CSSProperties = {
  display: "grid",
  gap: "20px",
};

const panelStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: "18px",
  border: "1px solid #D0D0CE",
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
  color: "#000000",
};

const sectionSubtitleStyle: CSSProperties = {
  margin: "6px 0 0",
  color: "#53565A",
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
  color: "#53565A",
};

const inputStyle: CSSProperties = {
  width: "100%",
  height: "46px",
  borderRadius: "10px",
  border: "1px solid #D0D0CE",
  padding: "10px 12px",
  fontSize: "14px",
  background: "#ffffff",
  color: "#000000",
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
  color: "#53565A",
  lineHeight: 1.5,
};

const readOnlyInputStyle: CSSProperties = {
  ...inputStyle,
  background: "#ECECE7",
  color: "#53565A",
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
  display: "flex",
  gap: "10px",
  alignItems: "center",
  justifyContent: "flex-end",
  flexWrap: "wrap",
};

const primaryButtonStyle: CSSProperties = {
  background: "#005670",
  color: "#ffffff",
  border: "none",
  borderRadius: "10px",
  padding: "10px 16px",
  fontWeight: 800,
  fontSize: "13px",
  cursor: "pointer",
  minHeight: "40px",
  whiteSpace: "nowrap",
};

const secondaryButtonStyle: CSSProperties = {
  background: "#D0D0CE",
  color: "#000000",
  border: "none",
  borderRadius: "10px",
  padding: "9px 12px",
  fontWeight: 700,
  fontSize: "12px",
  cursor: "pointer",
  minHeight: "38px",
  whiteSpace: "nowrap",
};

const miniButtonStyle: CSSProperties = {
  background: "#005670",
  color: "#ffffff",
  border: "none",
  borderRadius: "10px",
  padding: "9px 12px",
  fontWeight: 700,
  fontSize: "12px",
  cursor: "pointer",
  minHeight: "38px",
  whiteSpace: "nowrap",
};

const actionLinkButtonStyle: CSSProperties = {
  background: "#005670",
  color: "#ffffff",
  border: "none",
  borderRadius: "10px",
  padding: "9px 12px",
  fontWeight: 700,
  fontSize: "12px",
  cursor: "pointer",
  minHeight: "38px",
  whiteSpace: "nowrap",
};

const dangerButtonStyle: CSSProperties = {
  background: "#ECECE7",
  color: "#F93822",
  border: "1px solid #ECECE7",
  borderRadius: "10px",
  padding: "9px 12px",
  fontWeight: 700,
  fontSize: "12px",
  cursor: "pointer",
  minHeight: "38px",
  whiteSpace: "nowrap",
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
  color: "#53565A",
  lineHeight: 1.5,
};

const historyListStyle: CSSProperties = {
  display: "grid",
  gap: "14px",
  marginTop: "18px",
};

const historyCardStyle: CSSProperties = {
  borderRadius: "16px",
  border: "1px solid #D0D0CE",
  background: "#ECECE7",
  padding: "16px",
  display: "grid",
  gap: "12px",
};

const compactTableWrapStyle: CSSProperties = {
  overflowX: "auto",
  border: "1px solid #D0D0CE",
  borderRadius: "14px",
  background: "#ffffff",
};

const registerRowStyle: CSSProperties = {
  cursor: "pointer",
};

const selectedRegisterRowStyle: CSSProperties = {
  cursor: "pointer",
  background: imsColours.brandSoft,
};

const primaryTableCellStyle: CSSProperties = {
  ...imsTableCellStyle,
  fontWeight: 900,
  color: imsColours.brandDark,
};

const actionTableCellStyle: CSSProperties = {
  ...imsTableCellStyle,
  minWidth: "250px",
};

const tableActionRowStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  alignItems: "center",
};

const tableSubTextStyle: CSSProperties = {
  marginTop: "3px",
  color: imsColours.muted,
  fontSize: "12px",
  fontWeight: 600,
};

const emptyTableCellStyle: CSSProperties = {
  ...imsTableCellStyle,
  color: imsColours.muted,
  textAlign: "center",
  padding: "22px 14px",
};

const detailPanelStyle: CSSProperties = {
  display: "grid",
  gap: "18px",
  border: "1px solid #D0D0CE",
  borderRadius: "18px",
  padding: "18px",
  background: "linear-gradient(180deg, #ffffff 0%, #ECECE7 100%)",
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
  border: "1px solid #D0D0CE",
  background: "#ECECE7",
  padding: "14px 16px",
};

const summaryTileLabelStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "#53565A",
  marginBottom: "6px",
};

const summaryTileValueStyle: CSSProperties = {
  fontSize: "16px",
  fontWeight: 800,
  color: "#000000",
  wordBreak: "break-word",
};

const detailFooterBarStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  alignItems: "flex-end",
  borderTop: "1px solid #D0D0CE",
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
  color: "#000000",
};

const historyMetaStyle: CSSProperties = {
  marginTop: "4px",
  fontSize: "13px",
  color: "#53565A",
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
  color: "#53565A",
  fontSize: "14px",
};

const historyBodyStyle: CSSProperties = {
  display: "grid",
  gap: "8px",
  color: "#53565A",
  fontSize: "14px",
  lineHeight: 1.6,
};

const historyFooterStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  color: "#53565A",
  fontSize: "12px",
};

const emptyStateStyle: CSSProperties = {
  borderRadius: "14px",
  border: "1px dashed #D0D0CE",
  background: "#ECECE7",
  color: "#53565A",
  padding: "18px",
  fontSize: "14px",
};


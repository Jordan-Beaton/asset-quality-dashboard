"use client";

import * as XLSX from "xlsx";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { ImsButton, ImsFilterPanel, ImsPanel, ImsTabs, ImsTopMetaRow } from "../../../src/components/ImsPrimitives";
import { useImsPermissions } from "../../../src/components/ImsPermissions";
import { QualityKpiCard } from "../../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../../src/components/QualityPageHero";
import {
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
type CalibrationItemStatus = "In Use" | "Not In Use" | "Damaged" | "Missing / Lost" | "Historic";
type CalibrationItemStatusFilter = "active" | "all" | CalibrationItemStatus;
type CalibrationWorkspaceView = "dashboard" | "register" | "create" | "bulk";

type AssetCalibrationRecord = {
  id: string;
  asset_id: string | null;
  reference: string | null;
  file_name: string | null;
  file_path: string | null;
  notes: string | null;
  uploaded_at: string | null;
  calibration_date: string | null;
  calibration_due_date: string | null;
  calibration_type: string | null;
  calibrated_by: string | null;
  certificate_number: string | null;
  serial_number: string | null;
  frequency_years: number | null;
  item_status: CalibrationItemStatus | null;
  certificate_file_size: number | null;
  created_at: string | null;
};

type CalibrationForm = {
  itemDescription: string;
  assetId: string;
  serialNumber: string;
  calibrationDate: string;
  dateIssued: string;
  calibrationDueDate: string;
  calibrationType: CalibrationType;
  frequencyYears: string;
  calibratedBy: string;
  otherCalibrationSupplier: string;
  certificateNumber: string;
  itemStatus: CalibrationItemStatus;
  notes: string;
};

type CalibrationEditForm = {
  id: string;
  itemDescription: string;
  serialNumber: string;
  calibrationDate: string;
  dateIssued: string;
  calibrationDueDate: string;
  frequencyYears: string;
  certificateNumber: string;
  itemStatus: CalibrationItemStatus;
};

type CalibrationImportRow = {
  rowNumber: number;
  itemDescription: string;
  serialNumber: string;
  certificateNumber: string;
  calibrationDate: string;
  dateIssued: string;
  frequencyYears: string;
  calibrationDueDate: string;
  supplier: string;
  errors: string[];
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
const calibrationItemStatuses: CalibrationItemStatus[] = ["In Use", "Not In Use", "Damaged", "Missing / Lost", "Historic"];
const defaultItemStatusFilter: CalibrationItemStatusFilter = "active";
const OTHER_SUPPLIER_VALUE = "__OTHER_SUPPLIER__";
const CUSTOM_SUPPLIERS_STORAGE_KEY = "asset-calibration-custom-suppliers";
const defaultExternalCalibrationSuppliers = ["PASS Ltd", "Northern Balance"];

const emptyForm: CalibrationForm = {
  itemDescription: "",
  assetId: "",
  serialNumber: "",
  calibrationDate: "",
  dateIssued: "",
  calibrationDueDate: "",
  calibrationType: "External",
  frequencyYears: "1",
  calibratedBy: "",
  otherCalibrationSupplier: "",
  certificateNumber: "",
  itemStatus: "In Use",
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

function getItemStatus(value: string | null | undefined): CalibrationItemStatus {
  if (value === "Missing" || value === "Lost") return "Missing / Lost";
  return calibrationItemStatuses.includes(value as CalibrationItemStatus)
    ? (value as CalibrationItemStatus)
    : "In Use";
}

function getItemStatusTone(status: CalibrationItemStatus) {
  if (status === "In Use") return { bg: "#dcfce7", text: "#166534", border: "#bbf7d0" };
  if (status === "Not In Use") return { bg: "#e2e8f0", text: "#334155", border: "#cbd5e1" };
  if (status === "Damaged") return { bg: "#ffedd5", text: "#9a3412", border: "#fed7aa" };
  if (status === "Missing / Lost") return { bg: "#fee2e2", text: "#991b1b", border: "#fecaca" };
  return { bg: "#ede9fe", text: "#6d28d9", border: "#ddd6fe" };
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

function normalizeImportHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getImportCell(row: Record<string, unknown>, candidates: string[]) {
  const normalizedCandidates = candidates.map(normalizeImportHeader);
  const entry = Object.entries(row).find(([key]) => normalizedCandidates.includes(normalizeImportHeader(key)));
  const value = entry?.[1];
  return value === null || value === undefined ? "" : String(value).trim();
}

function getRawImportCell(row: Record<string, unknown>, candidates: string[]) {
  const normalizedCandidates = candidates.map(normalizeImportHeader);
  const entry = Object.entries(row).find(([key]) => normalizedCandidates.includes(normalizeImportHeader(key)));
  return entry?.[1] ?? "";
}

function normalizeImportDate(value: unknown) {
  if (value === null || value === undefined || value === "") return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
  }

  const text = String(value).trim();
  if (!text) return "";
  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;
  const ukMatch = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (ukMatch) {
    const year = ukMatch[3].length === 2 ? `20${ukMatch[3]}` : ukMatch[3];
    return `${year}-${ukMatch[2].padStart(2, "0")}-${ukMatch[1].padStart(2, "0")}`;
  }
  const parsedDate = new Date(text);
  return Number.isNaN(parsedDate.getTime()) ? "" : parsedDate.toISOString().slice(0, 10);
}

function normalizeFrequencyYears(value: string) {
  const match = value.match(/\d+/);
  return match?.[0] || "1";
}

function buildCalibrationSearchText(row: CalibrationRow) {
  return [
    getCalibrationItemDescription(row.record),
    row.asset?.asset_code || "",
    row.asset?.name || "",
    row.asset?.description || "",
    row.record.serial_number || "",
    row.record.certificate_number || "",
    row.record.reference || "",
    row.record.calibrated_by || "",
    getItemStatus(row.record.item_status),
  ]
    .join(" ")
    .toLowerCase();
}

function buildCalibrationNotes(itemDescription: string, dateIssued: string, notes: string) {
  const description = itemDescription.trim();
  const issued = dateIssued.trim();
  const noteText = notes.trim();
  const sections = [];
  if (description) sections.push(`Item Description: ${description}`);
  if (issued) sections.push(`Date Issued: ${issued}`);
  if (noteText) sections.push(`Notes: ${noteText}`);
  return sections.join("\n\n");
}

function getCalibrationItemDescription(record: AssetCalibrationRecord) {
  const notes = record.notes || "";
  const match = notes.match(/^Item Description:\s*(.+?)(?:\n\nDate Issued:|\n\nNotes:|\n|$)/);
  if (match?.[1]) return match[1].trim();
  return notes.trim();
}

function getCalibrationDateIssued(record: AssetCalibrationRecord) {
  const notes = record.notes || "";
  const match = notes.match(/(?:^|\n\n)Date Issued:\s*([^\n]+)/);
  return match?.[1]?.trim() || record.calibration_date || "";
}

function getCalibrationFreeNotes(record: AssetCalibrationRecord) {
  const notes = record.notes || "";
  const match = notes.match(/(?:^|\n\n)Notes:\s*([\s\S]*)/);
  return match?.[1]?.trim() || "";
}

function normalizeCalibrationKeyPart(value: string | null | undefined) {
  return (value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function getCalibrationItemKey(row: CalibrationRow) {
  if (row.record.asset_id) return `asset:${row.record.asset_id}`;
  const description = normalizeCalibrationKeyPart(getCalibrationItemDescription(row.record));
  const serial = normalizeCalibrationKeyPart(row.record.serial_number);
  return `standalone:${description}|${serial}`;
}

function buildCalibrationSubject(row: CalibrationRow) {
  const itemDescription = getCalibrationItemDescription(row.record);

  if (row.asset?.asset_code || row.asset?.name) {
    return {
      title: row.asset?.asset_code || "Linked asset",
      subtitle: itemDescription || row.asset?.name || row.asset?.description || "Asset-linked calibration record",
    };
  }

  if (itemDescription) {
    return {
      title: itemDescription,
      subtitle: row.record.serial_number || "Unassigned spare / standalone calibration item",
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
  const detailPanelRef = useRef<HTMLDivElement | null>(null);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [people, setPeople] = useState<AssetPerson[]>([]);
  const [records, setRecords] = useState<AssetCalibrationRecord[]>([]);
  const [message, setMessage] = useState("Loading calibration register...");
  const [lastRefreshed, setLastRefreshed] = useState("");
  const [form, setForm] = useState<CalibrationForm>(emptyForm);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [renewalCertificateFile, setRenewalCertificateFile] = useState<File | null>(null);
  const [assetFilter, setAssetFilter] = useState(linkedAsset);
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | CalibrationStatus>("");
  const [itemStatusFilter, setItemStatusFilter] = useState<CalibrationItemStatusFilter>(defaultItemStatusFilter);
  const [showRegisterFilters, setShowRegisterFilters] = useState(Boolean(linkedAsset));
  const [activeView, setActiveView] = useState<CalibrationWorkspaceView>("dashboard");
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isOpeningId, setIsOpeningId] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string>("");
  const [lastSuggestedDueDate, setLastSuggestedDueDate] = useState("");
  const [editForm, setEditForm] = useState<CalibrationEditForm | null>(null);
  const [lastSuggestedEditDueDate, setLastSuggestedEditDueDate] = useState("");
  const [customCalibrationSuppliers, setCustomCalibrationSuppliers] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [importRows, setImportRows] = useState<CalibrationImportRow[]>([]);
  const [isImportingCalibration, setIsImportingCalibration] = useState(false);
  const [attachmentCertificateFile, setAttachmentCertificateFile] = useState<File | null>(null);

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

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(CUSTOM_SUPPLIERS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        setCustomCalibrationSuppliers(parsed.filter((item): item is string => typeof item === "string" && Boolean(item.trim())));
      }
    } catch {
      setCustomCalibrationSuppliers([]);
    }
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

  const externalSupplierOptions = useMemo(() => {
    const suppliers = new Set<string>();
    defaultExternalCalibrationSuppliers.forEach((supplier) => suppliers.add(supplier));
    customCalibrationSuppliers.forEach((supplier) => {
      if (supplier.trim()) suppliers.add(supplier.trim());
    });
    records.forEach((record) => {
      if (record.calibration_type !== "External") return;
      const supplier = (record.calibrated_by || "").trim();
      if (supplier) suppliers.add(supplier);
    });
    return [...suppliers].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [customCalibrationSuppliers, records]);

  useEffect(() => {
    if (!selectedAsset?.serial_number) return;

    setForm((prev) => {
      if (prev.serialNumber.trim()) return prev;
      return { ...prev, serialNumber: selectedAsset.serial_number || "" };
    });
  }, [selectedAsset]);

  useEffect(() => {
    const years = Number(form.frequencyYears || "0");
    const suggested = addYearsToDate(form.dateIssued, years);
    if (!suggested) return;

    setForm((prev) => {
      if (!prev.calibrationDueDate || prev.calibrationDueDate === lastSuggestedDueDate) {
        return { ...prev, calibrationDueDate: suggested };
      }
      return prev;
    });

    setLastSuggestedDueDate(suggested);
  }, [form.dateIssued, form.frequencyYears, lastSuggestedDueDate]);

  useEffect(() => {
    if (!editForm) return;

    const years = Number(editForm.frequencyYears || "0");
    const suggested = addYearsToDate(editForm.dateIssued, years);
    if (!suggested) return;

    setEditForm((prev) => {
      if (!prev) return prev;
      if (!prev.calibrationDueDate || prev.calibrationDueDate === lastSuggestedEditDueDate) {
        return { ...prev, calibrationDueDate: suggested };
      }
      return prev;
    });

    setLastSuggestedEditDueDate(suggested);
  }, [editForm?.dateIssued, editForm?.frequencyYears, lastSuggestedEditDueDate]);

  const allCalibrationRows = useMemo<CalibrationRow[]>(() => {
    const assetMap = new Map(assets.map((asset) => [asset.id, asset]));
    return records.map((record) => {
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
    });
  }, [assets, records]);

  const currentCalibrationRows = useMemo<CalibrationRow[]>(() => {
    const latestByItem = new Map<string, CalibrationRow>();
    allCalibrationRows.forEach((row) => {
      const key = getCalibrationItemKey(row);
      const current = latestByItem.get(key);
      const rowTime = new Date(row.record.calibration_date || row.record.created_at || 0).getTime();
      const currentTime = current ? new Date(current.record.calibration_date || current.record.created_at || 0).getTime() : -1;
      if (!current || rowTime >= currentTime) latestByItem.set(key, row);
    });
    return [...latestByItem.values()];
  }, [allCalibrationRows]);

  const calibrationRows = useMemo<CalibrationRow[]>(() => {
    return currentCalibrationRows
      .filter((row) => {
        const normalizedAssetFilter = assetFilter.toLowerCase();
        const matchesAsset =
          !assetFilter ||
          (assetFilter === "__UNASSIGNED__"
            ? !row.record.asset_id
            : row.assetFilterKey.toLowerCase() === normalizedAssetFilter);
        const matchesStatus = !statusFilter || row.status === statusFilter;
        const itemStatus = getItemStatus(row.record.item_status);
        const matchesItemStatus =
          itemStatusFilter === "all" ||
          (itemStatusFilter === "active" ? itemStatus !== "Historic" : itemStatus === itemStatusFilter);
        const matchesSearch =
          !searchFilter.trim() || buildCalibrationSearchText(row).includes(searchFilter.trim().toLowerCase());
        return matchesAsset && matchesStatus && matchesItemStatus && matchesSearch;
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
  }, [assetFilter, currentCalibrationRows, itemStatusFilter, searchFilter, statusFilter]);

  const heroCounts = useMemo(() => {
    const statusRows = currentCalibrationRows.map((row) => row.status);
    return {
      overdue: statusRows.filter((status) => status === "Overdue").length,
      dueSoon: statusRows.filter((status) => status === "Due Soon").length,
      inDate: statusRows.filter((status) => status === "In Date").length,
      total: currentCalibrationRows.length,
    };
  }, [currentCalibrationRows]);
  const calibrationControlRows = useMemo(
    () => currentCalibrationRows.filter((row) => getItemStatus(row.record.item_status) === "In Use"),
    [currentCalibrationRows]
  );
  const excludedCalibrationRows = useMemo(
    () => currentCalibrationRows.filter((row) => getItemStatus(row.record.item_status) !== "In Use"),
    [currentCalibrationRows]
  );
  const dashboardCounts = useMemo(() => {
    const statusRows = calibrationControlRows.map((row) => row.status);
    return {
      overdue: statusRows.filter((status) => status === "Overdue").length,
      dueSoon: statusRows.filter((status) => status === "Due Soon").length,
      inDate: statusRows.filter((status) => status === "In Date").length,
      notSet: statusRows.filter((status) => status === "Not Set").length,
      total: calibrationControlRows.length,
    };
  }, [calibrationControlRows]);
  const availabilityStatusRows = useMemo(() => {
    const colours: Record<CalibrationItemStatus, { color: string; bg: string }> = {
      "In Use": { color: "#16a34a", bg: "#dcfce7" },
      "Not In Use": { color: "#64748b", bg: "#f1f5f9" },
      Damaged: { color: "#f59e0b", bg: "#fef3c7" },
      "Missing / Lost": { color: "#dc2626", bg: "#fee2e2" },
      Historic: { color: "#7c3aed", bg: "#ede9fe" },
    };

    return calibrationItemStatuses.map((status) => ({
      label: status,
      value: currentCalibrationRows.filter((row) => getItemStatus(row.record.item_status) === status).length,
      tone: colours[status].color,
      bg: colours[status].bg,
    }));
  }, [currentCalibrationRows]);
  const availabilityMetrics = useMemo(() => {
    const damaged = availabilityStatusRows.find((row) => row.label === "Damaged")?.value || 0;
    const missingLost = availabilityStatusRows.find((row) => row.label === "Missing / Lost")?.value || 0;
    const notInUse = availabilityStatusRows.find((row) => row.label === "Not In Use")?.value || 0;
    const historic = availabilityStatusRows.find((row) => row.label === "Historic")?.value || 0;
    return {
      excluded: excludedCalibrationRows.length,
      unavailable: damaged + missingLost,
      parked: notInUse + historic,
    };
  }, [availabilityStatusRows, excludedCalibrationRows.length]);
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
  const dashboardMetrics = useMemo(() => {
    const total = calibrationControlRows.length;
    const withCertificates = calibrationControlRows.filter((row) => Boolean(row.record.file_path)).length;
    const missingCertificates = total - withCertificates;
    const dueRisk = calibrationControlRows.filter((row) => row.status === "Overdue" || row.status === "Due Soon").length;
    const certificateCoverage = total ? Math.round((withCertificates / total) * 100) : 0;
    const inDateCoverage = total ? Math.round((dashboardCounts.inDate / total) * 100) : 0;
    return {
      total,
      withCertificates,
      missingCertificates,
      dueRisk,
      certificateCoverage,
      inDateCoverage,
    };
  }, [calibrationControlRows, dashboardCounts.inDate]);
  const dashboardRiskRows = useMemo(() => {
    return [...calibrationControlRows]
      .filter((row) => row.status === "Overdue" || row.status === "Due Soon")
      .sort((a, b) => {
        const aDue = a.record.calibration_due_date ? new Date(a.record.calibration_due_date).getTime() : Number.MAX_SAFE_INTEGER;
        const bDue = b.record.calibration_due_date ? new Date(b.record.calibration_due_date).getTime() : Number.MAX_SAFE_INTEGER;
        return aDue - bDue;
      })
      .slice(0, 6);
  }, [calibrationControlRows]);
  const supplierDashboardRows = useMemo(() => {
    const suppliers = new Map<string, { name: string; total: number; missingCertificates: number }>();
    calibrationControlRows.forEach((row) => {
      const name = (row.record.calibrated_by || "Supplier not set").trim();
      const current = suppliers.get(name) || { name, total: 0, missingCertificates: 0 };
      current.total += 1;
      if (!row.record.file_path) current.missingCertificates += 1;
      suppliers.set(name, current);
    });
    return [...suppliers.values()]
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
      .slice(0, 5);
  }, [calibrationControlRows]);
  const dashboardDueBuckets = useMemo(() => {
    const buckets = [
      { label: "Overdue", value: 0, tone: "#dc2626", bg: "#fee2e2" },
      { label: "Next 7 Days", value: 0, tone: "#f59e0b", bg: "#fef3c7" },
      { label: "8-30 Days", value: 0, tone: "#2563eb", bg: "#dbeafe" },
      { label: "31+ Days", value: 0, tone: "#16a34a", bg: "#dcfce7" },
      { label: "Not Set", value: 0, tone: "#64748b", bg: "#f1f5f9" },
    ];

    calibrationControlRows.forEach((row) => {
      if (row.daysRemaining === null) {
        buckets[4].value += 1;
      } else if (row.daysRemaining < 0) {
        buckets[0].value += 1;
      } else if (row.daysRemaining <= 7) {
        buckets[1].value += 1;
      } else if (row.daysRemaining <= 30) {
        buckets[2].value += 1;
      } else {
        buckets[3].value += 1;
      }
    });

    return buckets;
  }, [calibrationControlRows]);
  const dashboardStatusSegments = useMemo(
    () => [
      { label: "Overdue", value: dashboardCounts.overdue, color: "#dc2626" },
      { label: "Due Soon", value: dashboardCounts.dueSoon, color: "#f59e0b" },
      { label: "In Date", value: dashboardCounts.inDate, color: "#16a34a" },
      {
        label: "Not Set",
        value: dashboardCounts.notSet,
        color: "#94a3b8",
      },
    ],
    [dashboardCounts.dueSoon, dashboardCounts.inDate, dashboardCounts.notSet, dashboardCounts.overdue]
  );
  const activeRegisterFilterLabel = useMemo(() => {
    const labels = [];
    if (assetFilter) {
      const assetLabel =
        assetFilter === "__UNASSIGNED__"
          ? "Standalone / spare items"
          : assets.find((asset) => buildAssetFilterKey(asset) === assetFilter)?.asset_code ||
            assets.find((asset) => buildAssetFilterKey(asset) === assetFilter)?.name ||
            assetFilter;
      labels.push(assetLabel);
    }
    if (statusFilter) labels.push(statusFilter);
    if (itemStatusFilter === "active") labels.push("Active items");
    if (itemStatusFilter !== "active" && itemStatusFilter !== "all") labels.push(itemStatusFilter);
    if (itemStatusFilter === "all") labels.push("All item statuses");
    if (searchFilter.trim()) labels.push(`"${searchFilter.trim()}"`);
    return labels.join(" / ");
  }, [assetFilter, assets, itemStatusFilter, searchFilter, statusFilter]);
  const selectedCalibrationRow = useMemo(() => {
    if (!editForm) return null;
    return allCalibrationRows.find((row) => row.id === editForm.id) || null;
  }, [allCalibrationRows, editForm]);
  const selectedCalibrationHistoryRows = useMemo(() => {
    if (!selectedCalibrationRow) return [];
    const key = getCalibrationItemKey(selectedCalibrationRow);
    return allCalibrationRows
      .filter((row) => getCalibrationItemKey(row) === key)
      .sort((a, b) => {
        const aTime = new Date(a.record.calibration_date || a.record.created_at || 0).getTime();
        const bTime = new Date(b.record.calibration_date || b.record.created_at || 0).getTime();
        return bTime - aTime;
      });
  }, [allCalibrationRows, selectedCalibrationRow]);
  const importableRows = useMemo(() => importRows.filter((row) => row.errors.length === 0), [importRows]);
  const skippedImportRows = useMemo(() => importRows.filter((row) => row.errors.length > 0), [importRows]);

  function applyCalibrationKpiFilter(status: "" | CalibrationStatus) {
    setActiveView("register");
    setShowRegisterFilters(true);
    setAssetFilter("");
    setSearchFilter("");
    setStatusFilter(status);
    setItemStatusFilter("In Use");
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

    if (!form.itemDescription.trim()) {
      setMessage("Item description is required.");
      return;
    }

    if (!form.calibrationDate || !form.dateIssued || !form.calibrationDueDate) {
      setMessage("Calibration date, date issued, and calibration due date are required.");
      return;
    }

    const calibratedByValue =
      form.calibrationType === "External" && form.calibratedBy === OTHER_SUPPLIER_VALUE
        ? form.otherCalibrationSupplier.trim()
        : form.calibratedBy.trim();

    if (!calibratedByValue) {
      setMessage(
        form.calibrationType === "External"
          ? "Calibration supplier is required."
          : "Internal calibrated by person is required."
      );
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
          notes: buildCalibrationNotes(form.itemDescription, form.dateIssued, form.notes) || null,
          uploaded_at: filePath ? new Date().toISOString() : null,
          calibration_date: form.calibrationDate,
          calibration_due_date: form.calibrationDueDate,
          calibration_type: form.calibrationType,
          calibrated_by: calibratedByValue,
          certificate_number: form.certificateNumber.trim() || null,
          serial_number: form.serialNumber.trim() || null,
          frequency_years: Number(form.frequencyYears || "0") || null,
          item_status: form.itemStatus,
          certificate_file_size: fileSize,
        },
      ]);

      if (error) throw new Error(error.message);

      if (form.calibrationType === "External" && form.calibratedBy === OTHER_SUPPLIER_VALUE) {
        const nextSuppliers = Array.from(new Set([...customCalibrationSuppliers, calibratedByValue])).sort((a, b) =>
          a.localeCompare(b, undefined, { sensitivity: "base" })
        );
        setCustomCalibrationSuppliers(nextSuppliers);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(CUSTOM_SUPPLIERS_STORAGE_KEY, JSON.stringify(nextSuppliers));
        }
      }

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

  async function handleCalibrationImportFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    try {
      setImportFileName(file.name);
      setImportRows([]);
      setMessage("Reading calibration import file...");

      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = firstSheetName ? workbook.Sheets[firstSheetName] : null;

      if (!worksheet) {
        setMessage("Import failed: no worksheet found in the selected file.");
        return;
      }

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });
      const parsedRows = rows
        .map((row, index): CalibrationImportRow => {
          const itemDescription = getImportCell(row, ["Description", "Item Description", "Item", "Equipment"]);
          const serialNumber = getImportCell(row, ["Serial Number", "Serial No", "Serial"]);
          const certificateNumber = getImportCell(row, [
            "Certificate Number",
            "Certificate No",
            "Cert Number",
            "Cert No",
          ]);
          const calibrationDate = normalizeImportDate(getRawImportCell(row, ["Calibration Date", "Cal Date"]));
          const dateIssued = normalizeImportDate(getRawImportCell(row, ["Date of Issue", "Date Issued", "Issue Date"]));
          const frequencyYears = normalizeFrequencyYears(getImportCell(row, ["Frequency", "Calibration Frequency"]));
          const calibrationDueDate = normalizeImportDate(
            getRawImportCell(row, ["Calibration Due", "Calibration Due Date", "Due Date", "Cal Due"])
          );
          const supplier = getImportCell(row, ["Supplier", "Calibration Supplier", "Calibrated By"]);
          const errors = [];

          if (!itemDescription) errors.push("Description missing");
          if (!serialNumber) errors.push("Serial number missing");
          if (!certificateNumber) errors.push("Certificate number missing");
          if (!calibrationDate) errors.push("Calibration date missing or invalid");
          if (!dateIssued) errors.push("Date of issue missing or invalid");
          if (!calibrationDueDate) errors.push("Calibration due date missing or invalid");
          if (!supplier) errors.push("Supplier missing");

          return {
            rowNumber: index + 2,
            itemDescription,
            serialNumber,
            certificateNumber,
            calibrationDate,
            dateIssued,
            frequencyYears,
            calibrationDueDate,
            supplier,
            errors,
          };
        })
        .filter((row) =>
          [
            row.itemDescription,
            row.serialNumber,
            row.certificateNumber,
            row.calibrationDate,
            row.dateIssued,
            row.calibrationDueDate,
            row.supplier,
          ].some(Boolean)
        );

      setImportRows(parsedRows);
      setMessage(
        parsedRows.length
          ? `Previewing ${parsedRows.length} calibration row${parsedRows.length === 1 ? "" : "s"} from ${file.name}.`
          : "No calibration rows were found in the selected file."
      );
    } catch (error) {
      const err = error as Error;
      setMessage(`Import preview failed: ${err.message}`);
    }
  }

  async function importCalibrationRows() {
    if (!requireCreateAccess("import calibration records")) return;
    if (importableRows.length === 0) {
      setMessage("No valid calibration rows are ready to import.");
      return;
    }

    try {
      setIsImportingCalibration(true);
      const payload = importableRows.map((row) => ({
        asset_id: null,
        reference: row.certificateNumber || null,
        file_name: null,
        file_path: null,
        notes: buildCalibrationNotes(row.itemDescription, row.dateIssued, "") || null,
        uploaded_at: null,
        calibration_date: row.calibrationDate,
        calibration_due_date: row.calibrationDueDate,
        calibration_type: "External",
        calibrated_by: row.supplier || null,
        certificate_number: row.certificateNumber || null,
        serial_number: row.serialNumber || null,
        frequency_years: Number(row.frequencyYears || "1") || 1,
        item_status: "In Use",
        certificate_file_size: null,
      }));

      const { error } = await supabase.from("asset_calibration_records").insert(payload);
      if (error) throw new Error(error.message);

      const nextSuppliers = Array.from(
        new Set([
          ...customCalibrationSuppliers,
          ...importableRows.map((row) => row.supplier.trim()).filter(Boolean),
        ])
      ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
      setCustomCalibrationSuppliers(nextSuppliers);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(CUSTOM_SUPPLIERS_STORAGE_KEY, JSON.stringify(nextSuppliers));
      }

      setImportRows([]);
      setImportFileName("");
      setActiveView("register");
      setMessage(
        `Imported ${payload.length} calibration record${payload.length === 1 ? "" : "s"}. Attach certificates from each record detail.`
      );
      await loadData();
    } catch (error) {
      const err = error as Error;
      setMessage(`Import failed: ${err.message}`);
    } finally {
      setIsImportingCalibration(false);
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

  function openEditCalibration(row: CalibrationRow) {
    setEditForm({
      id: row.id,
      itemDescription: getCalibrationItemDescription(row.record) || buildCalibrationSubject(row).title,
      serialNumber: row.record.serial_number || "",
      calibrationDate: row.record.calibration_date || "",
      dateIssued: getCalibrationDateIssued(row.record),
      calibrationDueDate: row.record.calibration_due_date || "",
      frequencyYears: String(row.record.frequency_years || 1),
      certificateNumber: row.record.certificate_number || row.record.reference || "",
      itemStatus: getItemStatus(row.record.item_status),
    });
    setLastSuggestedEditDueDate("");
    setRenewalCertificateFile(null);
    setAttachmentCertificateFile(null);
    setShowHistory(false);
    setMessage("Calibration record ready to edit. Item description and serial number are locked.");
    setTimeout(() => {
      detailPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  async function updateCalibrationRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!editForm) return;
    if (!requireCreateAccess("create calibration history records")) return;

    const sourceRow = selectedCalibrationRow;
    if (!sourceRow) {
      setMessage("Select a calibration record before saving a new history entry.");
      return;
    }

    if (!editForm.calibrationDate || !editForm.dateIssued || !editForm.calibrationDueDate) {
      setMessage("Calibration date, date issued, and calibration due date are required before saving.");
      return;
    }

    try {
      setIsUpdating(true);
      const certificateNumber = editForm.certificateNumber.trim();
      let filePath: string | null = null;
      let fileName: string | null = null;
      let fileSize: number | null = null;

      if (renewalCertificateFile) {
        filePath = await uploadCertificate(sourceRow.record.asset_id || null, renewalCertificateFile);
        fileName = renewalCertificateFile.name;
        fileSize = renewalCertificateFile.size;
      }

      const { error } = await supabase.from("asset_calibration_records").insert([
        {
          asset_id: sourceRow.record.asset_id || null,
          reference: certificateNumber || null,
          file_name: fileName,
          file_path: filePath,
          calibration_date: editForm.calibrationDate,
          calibration_due_date: editForm.calibrationDueDate,
          calibration_type: sourceRow.record.calibration_type || "External",
          calibrated_by: sourceRow.record.calibrated_by || null,
          certificate_number: certificateNumber || null,
          serial_number: editForm.serialNumber || sourceRow.record.serial_number || null,
          frequency_years: Number(editForm.frequencyYears || "0") || null,
          item_status: editForm.itemStatus,
          notes: buildCalibrationNotes(editForm.itemDescription, editForm.dateIssued, getCalibrationFreeNotes(sourceRow.record)) || null,
          uploaded_at: filePath ? new Date().toISOString() : null,
          certificate_file_size: fileSize,
        },
      ]);

      if (error) throw new Error(error.message);

      setMessage("New calibration history record saved. Previous record retained for traceability.");
      setRenewalCertificateFile(null);
      setEditForm(null);
      setShowHistory(false);
      await loadData();
    } catch (error) {
      const err = error as Error;
      setMessage(`History save failed: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  }

  async function saveSelectedItemStatus() {
    if (!editForm || !selectedCalibrationRow) return;
    if (!requireEditAccess("update calibration item status")) return;

    try {
      setIsUpdating(true);
      const { error } = await supabase
        .from("asset_calibration_records")
        .update({ item_status: editForm.itemStatus })
        .eq("id", selectedCalibrationRow.id);

      if (error) throw new Error(error.message);

      setMessage(`Item status updated to ${editForm.itemStatus}.`);
      await loadData();
    } catch (error) {
      const err = error as Error;
      setMessage(`Item status update failed: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  }

  async function attachCertificateToSelectedRecord() {
    if (!selectedCalibrationRow) return;
    if (!requireEditAccess("attach calibration certificates")) return;
    if (!attachmentCertificateFile) {
      setMessage("Choose a certificate file before attaching it to the selected calibration record.");
      return;
    }

    try {
      setIsUpdating(true);
      const filePath = await uploadCertificate(selectedCalibrationRow.record.asset_id || null, attachmentCertificateFile);
      const { error } = await supabase
        .from("asset_calibration_records")
        .update({
          file_name: attachmentCertificateFile.name,
          file_path: filePath,
          uploaded_at: new Date().toISOString(),
          certificate_file_size: attachmentCertificateFile.size,
        })
        .eq("id", selectedCalibrationRow.id);

      if (error) throw new Error(error.message);

      setMessage("Certificate attached to the selected calibration record.");
      setAttachmentCertificateFile(null);
      await loadData();
    } catch (error) {
      const err = error as Error;
      setMessage(`Certificate attach failed: ${err.message}`);
    } finally {
      setIsUpdating(false);
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
    const itemDescription = getCalibrationItemDescription(row.record);
    const reference = row.record.certificate_number || row.record.reference || subject.title;
    const title = `Calibration follow-up - ${reference}`;
    const descriptionParts = [
      `Calibration item: ${subject.title}`,
      itemDescription && itemDescription !== subject.title ? `Description: ${itemDescription}` : "",
      row.record.calibration_due_date ? `Due date: ${formatDate(row.record.calibration_due_date)}` : "",
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
          { value: "bulk", label: "Bulk Upload" },
        ]}
        active={activeView}
        onChange={setActiveView}
        ariaLabel="Asset calibration workspace views"
      />

      {activeView === "dashboard" ? (
      <>
      <section style={calibrationCommandGridStyle}>
        <div style={calibrationCommandPanelStyle}>
          <div style={dashboardEyebrowStyle}>Calibration Control</div>
          <h2 style={dashboardHeroTitleStyle}>
            {dashboardMetrics.total === 0 ? "No in-use items" : `${dashboardMetrics.inDateCoverage}% in date`}
          </h2>
          <p style={dashboardHeroCopyStyle}>
            {dashboardMetrics.total === 0
              ? "There are no in-use calibration items included in the compliance score."
              : dashboardMetrics.dueRisk === 0
              ? "All in-use calibration items are clear of the 30-day due window."
              : `${dashboardMetrics.dueRisk} in-use item${dashboardMetrics.dueRisk === 1 ? "" : "s"} need attention now or within 30 days.`}
            {availabilityMetrics.excluded
              ? ` ${availabilityMetrics.excluded} item${availabilityMetrics.excluded === 1 ? " is" : "s are"} excluded because not in use.`
              : ""}
          </p>
          <div style={commandMetricGridStyle}>
            <CommandMetric label="In Use" value={dashboardMetrics.total} detail="Included in figures" tone="#1d4ed8" />
            <CommandMetric label="Excluded" value={availabilityMetrics.excluded} detail="Not in calibration score" tone="#7c3aed" />
            <CommandMetric label="Overdue" value={dashboardCounts.overdue} detail="Past due date" tone="#991b1b" />
            <CommandMetric label="Due Soon" value={dashboardCounts.dueSoon} detail="Within 30 days" tone="#92400e" />
          </div>
        </div>

        <div style={statusGraphicPanelStyle}>
          <PanelMiniHeader title="Status Split" subtitle="Current calibration state" />
          <DashboardDonut
            segments={dashboardStatusSegments}
            total={dashboardMetrics.total}
            centerLabel={dashboardMetrics.total === 0 ? "-" : `${dashboardMetrics.inDateCoverage}%`}
            centerSubLabel="In date"
          />
        </div>

        <div style={graphicPanelStyle}>
          <PanelMiniHeader title="Due Windows" subtitle="Deadline pressure by time band" />
          <div style={barChartStackStyle}>
            {dashboardDueBuckets.map((bucket) => (
              <DashboardBarRow
                key={bucket.label}
                label={bucket.label}
                value={bucket.value}
                max={Math.max(1, dashboardMetrics.total)}
                color={bucket.tone}
                bg={bucket.bg}
              />
            ))}
          </div>
        </div>
      </section>

      <section style={dashboardKpiGridStyle}>
        <QualityKpiCard title="Overdue In Use" value={dashboardCounts.overdue} accent="#dc2626" onClick={() => applyCalibrationKpiFilter("Overdue")} />
        <QualityKpiCard title="Due Soon In Use" value={dashboardCounts.dueSoon} accent="#f59e0b" onClick={() => applyCalibrationKpiFilter("Due Soon")} />
        <QualityKpiCard title="In Date In Use" value={dashboardCounts.inDate} accent="#16a34a" onClick={() => applyCalibrationKpiFilter("In Date")} />
        <QualityKpiCard
          title="Excluded Items"
          value={availabilityMetrics.excluded}
          accent="#7c3aed"
          onClick={() => {
            setActiveView("register");
            setShowRegisterFilters(true);
            setAssetFilter("");
            setSearchFilter("");
            setStatusFilter("");
            setItemStatusFilter("all");
          }}
        />
        <QualityKpiCard
          title="Missing Certs"
          value={dashboardMetrics.missingCertificates}
          accent="#2563eb"
          onClick={() => {
            setActiveView("register");
            setShowRegisterFilters(true);
            setAssetFilter("");
            setSearchFilter("");
            setStatusFilter("");
            setItemStatusFilter("In Use");
          }}
        />
      </section>

      <section style={calibrationWorkGridStyle}>
        <ImsPanel title="Due Risk" subtitle="Priority calibration items ordered by due date.">
          {dashboardRiskRows.length === 0 ? (
            <div style={dashboardEmptyStateStyle}>No overdue or due-soon calibration items.</div>
          ) : (
            <div style={denseRiskGridStyle}>
              {dashboardRiskRows.map((row) => (
                <DashboardRiskItem key={row.id} row={row} onOpen={() => openEditCalibration(row)} compact />
              ))}
            </div>
          )}
        </ImsPanel>

        <div style={sideInsightStackStyle}>
          <ImsPanel title="Availability / Exclusions" subtitle="Items not in use are visible here but excluded from calibration compliance figures.">
            <div style={availabilitySummaryGridStyle}>
              <div style={availabilitySummaryCardStyle}>
                <span>Unavailable</span>
                <strong>{availabilityMetrics.unavailable}</strong>
                <small>Damaged or missing / lost</small>
              </div>
              <div style={availabilitySummaryCardStyle}>
                <span>Parked</span>
                <strong>{availabilityMetrics.parked}</strong>
                <small>Not in use or historic</small>
              </div>
            </div>
            <div style={barChartStackStyle}>
              {availabilityStatusRows.map((bucket) => (
                <DashboardBarRow
                  key={bucket.label}
                  label={bucket.label}
                  value={bucket.value}
                  max={Math.max(1, currentCalibrationRows.length)}
                  color={bucket.tone}
                  bg={bucket.bg}
                />
              ))}
            </div>
          </ImsPanel>

          <ImsPanel title="Certificate Health" subtitle="Attachment coverage and outstanding uploads.">
            <div style={certificateGaugeStyle}>
              <div style={certificateGaugeHeaderStyle}>
                <span>Attached</span>
                <strong>{dashboardMetrics.certificateCoverage}%</strong>
              </div>
              <div style={certificateGaugeTrackStyle}>
                <div style={{ ...certificateGaugeFillStyle, width: `${dashboardMetrics.certificateCoverage}%` }} />
              </div>
              <div style={certificateGaugeMetaStyle}>
                {dashboardMetrics.withCertificates} complete, {dashboardMetrics.missingCertificates} waiting for upload
              </div>
            </div>
          </ImsPanel>

          <ImsPanel title="Supplier Mix" subtitle="Current calibration ownership.">
            {supplierDashboardRows.length === 0 ? (
              <div style={dashboardEmptyStateStyle}>No supplier data recorded yet.</div>
            ) : (
              <div style={supplierStackStyle}>
                {supplierDashboardRows.map((supplier) => (
                  <SupplierBar
                    key={supplier.name}
                    name={supplier.name}
                    value={supplier.total}
                    max={Math.max(...supplierDashboardRows.map((item) => item.total))}
                    missingCertificates={supplier.missingCertificates}
                  />
                ))}
              </div>
            )}
          </ImsPanel>

        </div>
      </section>
      {dashboardMetrics.total < 0 ? (
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
                  {row.asset?.name || row.record.serial_number || "Calibration item"} • Due{" "}
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
                  {row.asset?.name || row.record.serial_number || "Calibration item"} • Due{" "}
                  {formatDate(row.record.calibration_due_date)}
                </div>
              </div>
            ))
          )}
        </SectionCard>
      </section>
      ) : null}
      </>
      ) : null}

      {activeView === "create" ? (
      <section style={createWorkspaceStyle}>
        <ImsPanel
          title="Add Calibration Record"
          subtitle="Create a controlled calibration record for a linked asset, unassigned spare item, or standalone calibrated item."
        >
          <form onSubmit={handleAddCalibration}>
            <div style={formGridStyle}>
              <div style={wideFieldStyle}>
                <Field label="Item Description">
                  <input
                    value={form.itemDescription}
                    onChange={(e) => setForm((prev) => ({ ...prev, itemDescription: e.target.value }))}
                    style={inputStyle}
                    placeholder="Describe the calibrated item, equipment, tool, or spare"
                  />
                </Field>
              </div>

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
                    setForm((prev) => ({
                      ...prev,
                      calibrationType: e.target.value as CalibrationType,
                      calibratedBy: "",
                      otherCalibrationSupplier: "",
                    }))
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

              <Field label="Item Status">
                <select
                  value={form.itemStatus}
                  onChange={(e) => setForm((prev) => ({ ...prev, itemStatus: e.target.value as CalibrationItemStatus }))}
                  style={inputStyle}
                >
                  {calibrationItemStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
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

              <Field label="Date Issued">
                <input
                  type="date"
                  value={form.dateIssued}
                  onChange={(e) => setForm((prev) => ({ ...prev, dateIssued: e.target.value }))}
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

              <Field label={form.calibrationType === "External" ? "Calibration Supplier" : "Calibrated By"}>
                <select
                  value={form.calibratedBy}
                  onChange={(e) => setForm((prev) => ({ ...prev, calibratedBy: e.target.value }))}
                  style={inputStyle}
                >
                  {form.calibrationType === "External" ? (
                    <>
                      <option value="">Select supplier</option>
                      {externalSupplierOptions.map((supplier) => (
                        <option key={supplier} value={supplier}>
                          {supplier}
                        </option>
                      ))}
                      <option value={OTHER_SUPPLIER_VALUE}>Other supplier</option>
                    </>
                  ) : (
                    <>
                      <option value="">Select person from People Management</option>
                      {peopleOptions.map((person) => (
                        <option key={person} value={person}>
                          {person}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </Field>

              {form.calibrationType === "External" && form.calibratedBy === OTHER_SUPPLIER_VALUE ? (
                <Field label="Other Supplier">
                  <input
                    value={form.otherCalibrationSupplier}
                    onChange={(e) => setForm((prev) => ({ ...prev, otherCalibrationSupplier: e.target.value }))}
                    style={inputStyle}
                    placeholder="Enter calibration supplier name"
                  />
                </Field>
              ) : null}

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
                  placeholder="Optional notes, certificate comments, limitations, or follow-up detail"
                />
              </Field>
            </div>

            <div style={buttonRowStyle}>
              <button type="submit" style={primaryButtonStyle} disabled={isSaving}>
                {isSaving ? "Saving..." : "Add Calibration Record"}
              </button>
            </div>
          </form>
        </ImsPanel>
      </section>
      ) : null}

      {activeView === "bulk" ? (
        <ImsPanel
          title="Bulk Upload Calibration Register"
          subtitle="Upload the current calibration log, preview the rows, then import them as current records. Certificates can be attached to each item after import."
        >
          <div style={importIntroGridStyle}>
            <div style={importDropzoneStyle}>
              <div style={importDropzoneTitleStyle}>Upload calibration log</div>
              <div style={helperTextStyle}>
                Accepted formats: Excel workbook or CSV. The first sheet will be used.
              </div>
              <div style={uploadRowStyle}>
                <label style={uploadButtonStyle}>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    style={{ display: "none" }}
                    onChange={(event) => void handleCalibrationImportFileChange(event)}
                  />
                  Choose File
                </label>
                <span style={helperTextStyle}>{importFileName || "No file selected"}</span>
              </div>
            </div>

            <div style={importHeaderCardStyle}>
              <div style={importDropzoneTitleStyle}>Expected headers</div>
              <div style={importHeaderListStyle}>
                {[
                  "Description",
                  "Serial Number",
                  "Certificate Number",
                  "Calibration Date",
                  "Date of Issue",
                  "Frequency",
                  "Calibration Due",
                  "Supplier",
                ].map((header) => (
                  <span key={header} style={importHeaderPillStyle}>
                    {header}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div style={buttonRowStyle}>
            <div style={helperTextStyle}>
              {importRows.length
                ? `${importableRows.length} ready to import, ${skippedImportRows.length} needing review.`
                : "Upload a register to preview it before saving anything."}
            </div>
            <div style={rowActionStackStyle}>
              <button
                type="button"
                style={secondaryButtonStyle}
                onClick={() => {
                  setImportRows([]);
                  setImportFileName("");
                  setMessage("Calibration import preview cleared.");
                }}
                disabled={importRows.length === 0 || isImportingCalibration}
              >
                Clear Preview
              </button>
              <button
                type="button"
                style={primaryButtonStyle}
                onClick={() => void importCalibrationRows()}
                disabled={importableRows.length === 0 || isImportingCalibration}
              >
                {isImportingCalibration ? "Importing..." : `Import ${importableRows.length} Records`}
              </button>
            </div>
          </div>

          <div style={{ ...imsTableInfoRowStyle, marginTop: 16 }}>
            Previewing <strong>{importRows.length}</strong> rows from the selected register
          </div>

          <div style={compactTableWrapStyle}>
            <table style={{ ...imsTableStyle, minWidth: 1080 }}>
              <thead>
                <tr>
                  <th style={imsTableHeadStyle}>Row</th>
                  <th style={imsTableHeadStyle}>Import Status</th>
                  <th style={imsTableHeadStyle}>Description</th>
                  <th style={imsTableHeadStyle}>Serial Number</th>
                  <th style={imsTableHeadStyle}>Certificate Number</th>
                  <th style={imsTableHeadStyle}>Calibration Date</th>
                  <th style={imsTableHeadStyle}>Date Issued</th>
                  <th style={imsTableHeadStyle}>Due Date</th>
                  <th style={imsTableHeadStyle}>Frequency</th>
                  <th style={imsTableHeadStyle}>Supplier</th>
                </tr>
              </thead>
              <tbody>
                {importRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={emptyCellStyle}>
                      Upload your calibration register to show the import preview.
                    </td>
                  </tr>
                ) : (
                  importRows.map((row) => (
                    <tr key={`${row.rowNumber}-${row.serialNumber}-${row.certificateNumber}`} style={calibrationTableRowStyle}>
                      <td style={imsTableCellStyle}>{row.rowNumber}</td>
                      <td style={imsTableCellStyle}>
                        {row.errors.length === 0 ? (
                          <span style={validImportBadgeStyle}>Ready</span>
                        ) : (
                          <div>
                            <span style={invalidImportBadgeStyle}>Review</span>
                            <div style={cellMetaStyle}>{row.errors.join(", ")}</div>
                          </div>
                        )}
                      </td>
                      <td style={imsTableCellStyle}>{row.itemDescription || "-"}</td>
                      <td style={imsTableCellStyle}>{row.serialNumber || "-"}</td>
                      <td style={imsTableCellStyle}>{row.certificateNumber || "-"}</td>
                      <td style={imsTableCellStyle}>{formatDate(row.calibrationDate)}</td>
                      <td style={imsTableCellStyle}>{formatDate(row.dateIssued)}</td>
                      <td style={imsTableCellStyle}>{formatDate(row.calibrationDueDate)}</td>
                      <td style={imsTableCellStyle}>{row.frequencyYears ? `${row.frequencyYears} year` : "-"}</td>
                      <td style={imsTableCellStyle}>{row.supplier || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </ImsPanel>
      ) : null}

      {activeView === "register" ? (
      <>
      <ImsPanel
        title="Calibration Register"
        subtitle="Search and maintain calibration records by item, serial number, certificate, supplier, status, and due date."
      >
          <div style={registerSummaryGridStyle}>
            <CalibrationSummaryCard label="Overdue" value={heroCounts.overdue} tone="#991b1b" bg="#fff1f2" />
            <CalibrationSummaryCard label="Due Soon" value={heroCounts.dueSoon} tone="#92400e" bg="#fffbeb" />
            <CalibrationSummaryCard label="In Date" value={heroCounts.inDate} tone="#166534" bg="#f0fdf4" />
            <CalibrationSummaryCard label="Total Records" value={heroCounts.total} tone="#1d4ed8" bg="#eff6ff" />
          </div>

          <div style={hiddenRegisterWatchlistStyle}>
            <div>
              <div style={watchlistTitleStyle}>Overdue Watchlist</div>
              {overdueRows.length === 0 ? (
                <div style={helperTextStyle}>No overdue calibration items.</div>
              ) : (
                overdueRows.map((row) => (
                  <div key={row.id} style={watchlistItemStyle}>
                    <div style={watchlistItemTitleStyle}>{row.asset?.asset_code || "-"}</div>
                    <div style={watchlistItemMetaStyle}>
                      {row.asset?.name || "Calibration item"} • Due {formatDate(row.record.calibration_due_date)}
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
                      {row.asset?.name || "Calibration item"} • Due {formatDate(row.record.calibration_due_date)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <ImsFilterPanel
            search={searchFilter}
            onSearchChange={setSearchFilter}
            searchPlaceholder="Search item description, asset, serial number, certificate, or supplier"
            showFilters={showRegisterFilters}
            onToggleFilters={() => setShowRegisterFilters((prev) => !prev)}
            actions={
              <ImsButton
                variant="secondary"
                onClick={() => {
                  setAssetFilter("");
                  setSearchFilter("");
                  setStatusFilter("");
                  setItemStatusFilter(defaultItemStatusFilter);
                }}
              >
                Clear Filters
              </ImsButton>
            }
          >
            <Field label="Asset">
              <select value={assetFilter} onChange={(e) => setAssetFilter(e.target.value)} style={imsInputStyle}>
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
                style={imsInputStyle}
              >
                <option value="">All statuses</option>
                <option value="Overdue">Overdue</option>
                <option value="Due Soon">Due Soon</option>
                <option value="In Date">In Date</option>
                <option value="Not Set">Not Set</option>
              </select>
            </Field>

            <Field label="Item Status">
              <select
                value={itemStatusFilter}
                onChange={(e) => setItemStatusFilter(e.target.value as CalibrationItemStatusFilter)}
                style={imsInputStyle}
              >
                <option value="active">Active items (hide Historic)</option>
                <option value="all">All item statuses</option>
                {calibrationItemStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </Field>
          </ImsFilterPanel>

          <div style={imsTableInfoRowStyle}>
            Showing <strong>{calibrationRows.length}</strong> current items from <strong>{records.length}</strong> retained calibration history records
            {activeRegisterFilterLabel ? (
              <span style={activeFilterChipStyle}>Filter: {activeRegisterFilterLabel}</span>
            ) : null}
          </div>

        <div style={compactTableWrapStyle}>
          <table style={{ ...imsTableStyle, minWidth: 1020 }}>
            <thead>
              <tr>
                <th style={imsTableHeadStyle}>Status</th>
                <th style={imsTableHeadStyle}>Item Status</th>
                <th style={imsTableHeadStyle}>Item / Description</th>
                <th style={imsTableHeadStyle}>Serial Number</th>
                <th style={imsTableHeadStyle}>Calibration Date</th>
                <th style={imsTableHeadStyle}>Date Issued</th>
                <th style={imsTableHeadStyle}>Due Date</th>
                <th style={imsTableHeadStyle}>Certificate</th>
                <th style={imsTableHeadStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {calibrationRows.length === 0 ? (
                <tr>
                  <td colSpan={9} style={emptyCellStyle}>
                    No calibration records match the current filters.
                  </td>
                </tr>
              ) : (
                calibrationRows.map((row) => {
                  const subject = buildCalibrationSubject(row);
                  return (
                    <tr
                      key={row.id}
                      style={editForm?.id === row.id ? selectedCalibrationTableRowStyle : calibrationTableRowStyle}
                      onClick={() => openEditCalibration(row)}
                    >
                      <td style={imsTableCellStyle}>
                        <StatusBadge value={row.status} />
                      </td>
                      <td style={imsTableCellStyle}>
                        <ItemStatusBadge value={getItemStatus(row.record.item_status)} />
                      </td>
                      <td style={imsTableCellStyle}>
                        <div style={cellTitleStyle}>{subject.title}</div>
                        <div style={cellMetaStyle}>
                          {subject.subtitle}
                          {row.asset?.asset_code ? ` | Asset ${row.asset.asset_code}` : ""}
                        </div>
                      </td>
                      <td style={imsTableCellStyle}>{row.record.serial_number || "-"}</td>
                      <td style={imsTableCellStyle}>{formatDate(row.record.calibration_date)}</td>
                      <td style={imsTableCellStyle}>
                        <div style={issuedDateStyle}>{formatDate(getCalibrationDateIssued(row.record))}</div>
                      </td>
                      <td style={imsTableCellStyle}>
                        <div style={{ ...dueDateTitleStyle, color: getStatusTone(row.status).text }}>
                          {formatDate(row.record.calibration_due_date)}
                        </div>
                        <div style={dueDateMetaStyle}>
                          {row.daysRemaining === null
                            ? "No due date set"
                            : row.daysRemaining < 0
                              ? `${Math.abs(row.daysRemaining)} days overdue`
                              : `${row.daysRemaining} days remaining`}
                        </div>
                      </td>
                      <td style={imsTableCellStyle}>
                        <div style={cellTitleStyle}>{row.record.certificate_number || row.record.reference || "-"}</div>
                        <div style={cellMetaStyle}>{row.record.file_path ? "Certificate attached" : "No file"}</div>
                      </td>
                      <td style={imsTableCellStyle}>
                        <div style={rowActionInlineStyle}>
                          <button
                            type="button"
                            style={miniButtonStyle}
                            onClick={(event) => {
                              event.stopPropagation();
                              openEditCalibration(row);
                            }}
                          >
                            Open
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
      </ImsPanel>

      {editForm ? (
        <ImsPanel
          title="Calibration Record Detail"
          subtitle="Review the selected record, open the historic certificate, and save a new calibration history entry for the next certificate cycle."
          style={editPanelStyle}
        >
          <div ref={detailPanelRef} />
          {selectedCalibrationRow ? (
            <div style={detailSummaryGridStyle}>
              <SummaryPill label="Status" value={selectedCalibrationRow.status} />
              <SummaryPill label="Item Status" value={getItemStatus(selectedCalibrationRow.record.item_status)} />
              <SummaryPill label="Asset" value={selectedCalibrationRow.asset?.asset_code || "Unassigned"} />
              <SummaryPill label="Supplier / Person" value={selectedCalibrationRow.record.calibrated_by || "-"} />
              <SummaryPill label="Certificate" value={selectedCalibrationRow.record.certificate_number || selectedCalibrationRow.record.reference || "-"} />
            </div>
          ) : null}

          <form onSubmit={updateCalibrationRecord}>
            <div style={lockedSummaryGridStyle}>
              <div style={lockedSummaryItemStyle}>
                <div style={lockedSummaryLabelStyle}>Item Description</div>
                <div style={lockedSummaryValueStyle}>{editForm.itemDescription || "-"}</div>
              </div>
              <div style={lockedSummaryItemStyle}>
                <div style={lockedSummaryLabelStyle}>Serial Number</div>
                <div style={lockedSummaryValueStyle}>{editForm.serialNumber || "-"}</div>
              </div>
            </div>

            <div style={formGridStyle}>
              <Field label="Certificate Number">
                <input
                  value={editForm.certificateNumber}
                  onChange={(e) => setEditForm((prev) => (prev ? { ...prev, certificateNumber: e.target.value } : prev))}
                  style={inputStyle}
                  placeholder="Certificate reference"
                />
              </Field>

              <Field label="Calibration Date">
                <input
                  type="date"
                  value={editForm.calibrationDate}
                  onChange={(e) => setEditForm((prev) => (prev ? { ...prev, calibrationDate: e.target.value } : prev))}
                  style={inputStyle}
                />
              </Field>

              <Field label="Date Issued">
                <input
                  type="date"
                  value={editForm.dateIssued}
                  onChange={(e) => setEditForm((prev) => (prev ? { ...prev, dateIssued: e.target.value } : prev))}
                  style={inputStyle}
                />
              </Field>

              <Field label="Frequency">
                <select
                  value={editForm.frequencyYears}
                  onChange={(e) => setEditForm((prev) => (prev ? { ...prev, frequencyYears: e.target.value } : prev))}
                  style={inputStyle}
                >
                  <option value="1">1 year</option>
                  <option value="2">2 years</option>
                  <option value="3">3 years</option>
                  <option value="4">4 years</option>
                  <option value="5">5 years</option>
                </select>
              </Field>

              <Field label="Item Status">
                <select
                  value={editForm.itemStatus}
                  onChange={(e) => setEditForm((prev) => (prev ? { ...prev, itemStatus: e.target.value as CalibrationItemStatus } : prev))}
                  style={inputStyle}
                >
                  {calibrationItemStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Calibration Due Date">
                <input
                  type="date"
                  value={editForm.calibrationDueDate}
                  onChange={(e) => setEditForm((prev) => (prev ? { ...prev, calibrationDueDate: e.target.value } : prev))}
                  style={inputStyle}
                />
              </Field>

              <div style={wideFieldStyle}>
                <Field label="New Certificate File">
                  <div style={uploadRowStyle}>
                    <label style={uploadButtonStyle}>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                        style={{ display: "none" }}
                        onChange={(e) => setRenewalCertificateFile(e.target.files?.[0] || null)}
                      />
                      {renewalCertificateFile ? "Replace New Certificate" : "Upload New Certificate"}
                    </label>
                    <span style={helperTextStyle}>
                      {renewalCertificateFile
                        ? `${renewalCertificateFile.name} - ${formatFileSize(renewalCertificateFile.size)}`
                        : "Optional, but recommended for certificate traceability"}
                    </span>
                  </div>
                </Field>
              </div>
            </div>

            {selectedCalibrationRow && !selectedCalibrationRow.record.file_path ? (
              <div style={attachCertificatePanelStyle}>
                <Field label="Attach Certificate To This Record">
                  <div style={uploadRowStyle}>
                    <label style={uploadButtonStyle}>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                        style={{ display: "none" }}
                        onChange={(e) => setAttachmentCertificateFile(e.target.files?.[0] || null)}
                      />
                      {attachmentCertificateFile ? "Replace Selected File" : "Choose Certificate"}
                    </label>
                    <span style={helperTextStyle}>
                      {attachmentCertificateFile
                        ? `${attachmentCertificateFile.name} - ${formatFileSize(attachmentCertificateFile.size)}`
                        : "Attach the certificate to this imported record without creating a new history entry."}
                    </span>
                    <button
                      type="button"
                      style={secondaryButtonStyle}
                      onClick={() => void attachCertificateToSelectedRecord()}
                      disabled={!attachmentCertificateFile || isUpdating}
                    >
                      Attach Certificate
                    </button>
                  </div>
                </Field>
              </div>
            ) : null}

            <div style={detailActionRowStyle}>
              <button type="submit" style={primaryButtonStyle} disabled={isUpdating}>
                {isUpdating ? "Saving..." : "Save New History Record"}
              </button>
              {selectedCalibrationRow?.record.file_path ? (
                <button
                  type="button"
                  style={secondaryButtonStyle}
                  onClick={() => void openCertificate(selectedCalibrationRow.record)}
                  disabled={isOpeningId === selectedCalibrationRow.id}
                >
                  {isOpeningId === selectedCalibrationRow.id ? "Opening..." : "Open Certificate"}
                </button>
              ) : null}
              {selectedCalibrationRow ? (
                <button type="button" style={secondaryButtonStyle} onClick={() => void saveSelectedItemStatus()} disabled={isUpdating}>
                  Save Item Status
                </button>
              ) : null}
              {selectedCalibrationRow ? (
                <button type="button" style={secondaryButtonStyle} onClick={() => generateActionFromCalibration(selectedCalibrationRow)}>
                  Generate Action
                </button>
              ) : null}
              {selectedCalibrationRow ? (
                <button type="button" style={secondaryButtonStyle} onClick={() => setShowHistory((current) => !current)}>
                  {showHistory ? "Hide Historic" : "Historic"}
                </button>
              ) : null}
              <button
                type="button"
                style={secondaryButtonStyle}
                onClick={() => {
                  setEditForm(null);
                  setShowHistory(false);
                  setAttachmentCertificateFile(null);
                }}
              >
                Close
              </button>
              {selectedCalibrationRow ? (
                <button
                  type="button"
                  style={dangerButtonStyle}
                  onClick={() => void removeCalibration(selectedCalibrationRow)}
                  disabled={deletingId === selectedCalibrationRow.id}
                >
                  {deletingId === selectedCalibrationRow.id ? "Removing..." : "Remove Record"}
                </button>
              ) : null}
            </div>
          </form>

          {showHistory && selectedCalibrationRow ? (
            <div style={historyPanelStyle}>
              <div style={historyHeaderStyle}>
                <div>
                  <div style={historyTitleStyle}>Historic Calibration Register</div>
                  <div style={historySubtitleStyle}>
                    {selectedCalibrationHistoryRows.length} retained record
                    {selectedCalibrationHistoryRows.length === 1 ? "" : "s"} for this item.
                  </div>
                </div>
              </div>
              <div style={compactTableWrapStyle}>
                <table style={{ ...imsTableStyle, minWidth: 1000 }}>
                  <thead>
                    <tr>
                      <th style={imsTableHeadStyle}>Status</th>
                      <th style={imsTableHeadStyle}>Item Status</th>
                      <th style={imsTableHeadStyle}>Calibration Date</th>
                      <th style={imsTableHeadStyle}>Date Issued</th>
                      <th style={imsTableHeadStyle}>Due Date</th>
                      <th style={imsTableHeadStyle}>Certificate</th>
                      <th style={imsTableHeadStyle}>Calibrated By</th>
                      <th style={imsTableHeadStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCalibrationHistoryRows.map((row) => (
                      <tr key={row.id} style={calibrationTableRowStyle}>
                        <td style={imsTableCellStyle}>
                          <StatusBadge value={row.status} />
                        </td>
                        <td style={imsTableCellStyle}>
                          <ItemStatusBadge value={getItemStatus(row.record.item_status)} />
                        </td>
                        <td style={imsTableCellStyle}>{formatDate(row.record.calibration_date)}</td>
                        <td style={imsTableCellStyle}>{formatDate(getCalibrationDateIssued(row.record))}</td>
                        <td style={imsTableCellStyle}>{formatDate(row.record.calibration_due_date)}</td>
                        <td style={imsTableCellStyle}>
                          <div style={cellTitleStyle}>{row.record.certificate_number || row.record.reference || "-"}</div>
                          <div style={cellMetaStyle}>{row.record.file_name || (row.record.file_path ? "Certificate attached" : "No file")}</div>
                        </td>
                        <td style={imsTableCellStyle}>
                          <div style={cellTitleStyle}>{row.record.calibrated_by || "-"}</div>
                          <div style={cellMetaStyle}>{row.record.calibration_type || "External"}</div>
                        </td>
                        <td style={imsTableCellStyle}>
                          {row.record.file_path ? (
                            <button
                              type="button"
                              style={miniButtonStyle}
                              onClick={() => void openCertificate(row.record)}
                              disabled={isOpeningId === row.id}
                            >
                              {isOpeningId === row.id ? "Opening..." : "Open Certificate"}
                            </button>
                          ) : (
                            <span style={cellMetaStyle}>No certificate</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </ImsPanel>
      ) : null}
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

function CalibrationSummaryCard({
  label,
  value,
  tone,
  bg,
}: {
  label: string;
  value: number;
  tone: string;
  bg: string;
}) {
  return (
    <div style={{ ...registerSummaryCardStyle, background: bg }}>
      <div style={{ ...registerSummaryLabelStyle, color: tone }}>{label}</div>
      <div style={{ ...registerSummaryValueStyle, color: tone }}>{value}</div>
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div style={summaryPillStyle}>
      <div style={summaryPillLabelStyle}>{label}</div>
      <div style={summaryPillValueStyle}>{value}</div>
    </div>
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

function ItemStatusBadge({ value }: { value: CalibrationItemStatus }) {
  const tone = getItemStatusTone(value);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "999px",
        padding: "6px 10px",
        fontSize: "12px",
        fontWeight: 800,
        background: tone.bg,
        color: tone.text,
        border: `1px solid ${tone.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {value}
    </span>
  );
}

function DashboardMetricTile({
  label,
  value,
  detail,
  tone,
  onClick,
}: {
  label: string;
  value: string | number;
  detail: string;
  tone: "blue" | "green" | "amber";
  onClick: () => void;
}) {
  const tones = {
    blue: { bg: "#eff6ff", border: "#bfdbfe", label: "#1d4ed8", value: "#1e3a8a" },
    green: { bg: "#ecfdf5", border: "#bbf7d0", label: "#15803d", value: "#14532d" },
    amber: { bg: "#fffbeb", border: "#fde68a", label: "#b45309", value: "#78350f" },
  };
  const colours = tones[tone];

  return (
    <button
      type="button"
      style={{
        ...dashboardMetricTileStyle,
        background: colours.bg,
        border: `1px solid ${colours.border}`,
      }}
      onClick={onClick}
    >
      <span style={{ ...dashboardMetricLabelStyle, color: colours.label }}>{label}</span>
      <strong style={{ ...dashboardMetricValueStyle, color: colours.value }}>{value}</strong>
      <span style={dashboardMetricDetailStyle}>{detail}</span>
    </button>
  );
}

function CommandMetric({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string | number;
  detail: string;
  tone: string;
}) {
  return (
    <div style={commandMetricStyle}>
      <div style={{ ...commandMetricLabelStyle, color: tone }}>{label}</div>
      <div style={{ ...commandMetricValueStyle, color: tone }}>{value}</div>
      <div style={commandMetricDetailStyle}>{detail}</div>
    </div>
  );
}

function PanelMiniHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={panelMiniHeaderStyle}>
      <div style={panelMiniTitleStyle}>{title}</div>
      <div style={panelMiniSubtitleStyle}>{subtitle}</div>
    </div>
  );
}

function DashboardDonut({
  segments,
  total,
  centerLabel,
  centerSubLabel,
}: {
  segments: Array<{ label: string; value: number; color: string }>;
  total: number;
  centerLabel: string;
  centerSubLabel: string;
}) {
  let start = 0;
  const gradient =
    total > 0
      ? segments
          .filter((segment) => segment.value > 0)
          .map((segment) => {
            const end = start + (segment.value / total) * 100;
            const slice = `${segment.color} ${start}% ${end}%`;
            start = end;
            return slice;
          })
          .join(", ")
      : "#e2e8f0 0% 100%";

  return (
    <div style={donutWrapStyle}>
      <div style={{ ...donutChartStyle, background: `conic-gradient(${gradient})` }}>
        <div style={donutCenterStyle}>
          <strong>{centerLabel}</strong>
          <span>{centerSubLabel}</span>
        </div>
      </div>
      <div style={donutLegendStyle}>
        {segments.map((segment) => (
          <div key={segment.label} style={donutLegendItemStyle}>
            <span style={{ ...donutLegendSwatchStyle, background: segment.color }} />
            <span>{segment.label}</span>
            <strong>{segment.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardBarRow({
  label,
  value,
  max,
  color,
  bg,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  bg: string;
}) {
  const width = max ? Math.max(value > 0 ? 8 : 0, Math.round((value / max) * 100)) : 0;

  return (
    <div style={barRowStyle}>
      <div style={barRowHeaderStyle}>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div style={{ ...barTrackStyle, background: bg }}>
        <div style={{ ...barFillStyle, width: `${width}%`, background: color }} />
      </div>
    </div>
  );
}

function DashboardRiskItem({
  row,
  onOpen,
  compact = false,
}: {
  row: CalibrationRow;
  onOpen: () => void;
  compact?: boolean;
}) {
  const subject = buildCalibrationSubject(row);
  const days =
    row.daysRemaining === null
      ? "No due date"
      : row.daysRemaining < 0
        ? `${Math.abs(row.daysRemaining)} days overdue`
        : `${row.daysRemaining} days remaining`;

  return (
    <button type="button" style={compact ? dashboardRiskItemCompactStyle : dashboardRiskItemStyle} onClick={onOpen}>
      <div style={dashboardRiskTopLineStyle}>
        <StatusBadge value={row.status} />
        <span style={dashboardRiskDateStyle}>{formatDate(row.record.calibration_due_date)}</span>
      </div>
      <div style={dashboardRiskTitleStyle}>{subject.title}</div>
      <div style={dashboardRiskMetaStyle}>
        {subject.subtitle}
        {row.record.serial_number ? ` | Serial ${row.record.serial_number}` : ""}
      </div>
      <div style={dashboardRiskFooterStyle}>
        <span>{days}</span>
        <span>{row.record.file_path ? "Certificate attached" : "Certificate needed"}</span>
      </div>
    </button>
  );
}

function SupplierBar({
  name,
  value,
  max,
  missingCertificates,
}: {
  name: string;
  value: number;
  max: number;
  missingCertificates: number;
}) {
  const width = max ? Math.max(8, Math.round((value / max) * 100)) : 0;

  return (
    <div style={supplierBarStyle}>
      <div style={supplierBarHeaderStyle}>
        <strong>{name}</strong>
        <span>{value}</span>
      </div>
      <div style={supplierBarTrackStyle}>
        <div style={{ ...supplierBarFillStyle, width: `${width}%` }} />
      </div>
      <div style={supplierBarMetaStyle}>
        {missingCertificates === 0 ? "Certificates complete" : `${missingCertificates} certificate upload${missingCertificates === 1 ? "" : "s"} outstanding`}
      </div>
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

const dashboardHeroPanelStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "18px",
  alignItems: "stretch",
  borderRadius: "22px",
  border: "1px solid #bfe5e3",
  background: "linear-gradient(135deg, #ffffff 0%, #eef8f7 48%, #eff6ff 100%)",
  padding: "22px",
  boxShadow: "0 18px 34px rgba(15, 23, 42, 0.08)",
  marginBottom: "16px",
};

const dashboardEyebrowStyle: CSSProperties = {
  color: "#2f7f7d",
  fontSize: "12px",
  fontWeight: 900,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  marginBottom: "8px",
};

const dashboardHeroTitleStyle: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: "30px",
  lineHeight: 1.15,
  fontWeight: 900,
};

const dashboardHeroCopyStyle: CSSProperties = {
  margin: "10px 0 0",
  color: "#475569",
  fontSize: "14px",
  lineHeight: 1.55,
  maxWidth: "620px",
};

const calibrationCommandGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(360px, 1.1fr) minmax(280px, 0.75fr) minmax(280px, 0.85fr)",
  gap: "14px",
  alignItems: "stretch",
  marginBottom: "16px",
};

const calibrationCommandPanelStyle: CSSProperties = {
  border: "1px solid #bfe5e3",
  borderRadius: "18px",
  background: "linear-gradient(135deg, #ffffff 0%, #eef8f7 55%, #eff6ff 100%)",
  padding: "18px",
  boxShadow: "0 12px 24px rgba(15, 23, 42, 0.07)",
  minHeight: "222px",
  display: "grid",
  alignContent: "space-between",
  boxSizing: "border-box",
};

const graphicPanelStyle: CSSProperties = {
  border: "1px solid #dbe7f3",
  borderRadius: "18px",
  background: "#ffffff",
  padding: "16px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
  minHeight: "222px",
  display: "grid",
  alignContent: "start",
  boxSizing: "border-box",
};

const statusGraphicPanelStyle: CSSProperties = {
  ...graphicPanelStyle,
  alignContent: "start",
  gap: "8px",
};

const panelMiniHeaderStyle: CSSProperties = {
  marginBottom: "12px",
};

const panelMiniTitleStyle: CSSProperties = {
  fontSize: "15px",
  fontWeight: 900,
  color: "#0f172a",
};

const panelMiniSubtitleStyle: CSSProperties = {
  marginTop: "3px",
  fontSize: "12px",
  color: "#64748b",
  fontWeight: 700,
};

const commandMetricGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "10px",
  marginTop: "16px",
  alignItems: "stretch",
};

const commandMetricStyle: CSSProperties = {
  border: "1px solid rgba(148, 163, 184, 0.24)",
  borderRadius: "14px",
  background: "rgba(255,255,255,0.78)",
  padding: "10px",
  display: "grid",
  gap: "5px",
  minHeight: "84px",
  boxSizing: "border-box",
  minWidth: 0,
};

const commandMetricLabelStyle: CSSProperties = {
  fontSize: "10px",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.02em",
  overflowWrap: "anywhere",
};

const commandMetricValueStyle: CSSProperties = {
  fontSize: "24px",
  fontWeight: 900,
  lineHeight: 1,
};

const commandMetricDetailStyle: CSSProperties = {
  color: "#64748b",
  fontSize: "12px",
  lineHeight: 1.35,
  fontWeight: 700,
  overflowWrap: "anywhere",
};

const donutWrapStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "11px",
  justifyItems: "center",
  alignItems: "start",
};

const donutChartStyle: CSSProperties = {
  width: "156px",
  height: "156px",
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  boxShadow: "inset 0 0 0 1px rgba(15, 23, 42, 0.08)",
};

const donutCenterStyle: CSSProperties = {
  width: "92px",
  height: "92px",
  borderRadius: "50%",
  background: "#ffffff",
  display: "grid",
  placeItems: "center",
  alignContent: "center",
  color: "#0f172a",
  boxShadow: "0 1px 5px rgba(15, 23, 42, 0.12)",
};

const donutLegendStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "7px 10px",
  width: "100%",
};

const donutLegendItemStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "10px minmax(0, 1fr) auto",
  gap: "8px",
  alignItems: "center",
  color: "#334155",
  fontSize: "11px",
  fontWeight: 800,
};

const donutLegendSwatchStyle: CSSProperties = {
  width: "10px",
  height: "10px",
  borderRadius: "999px",
};

const barChartStackStyle: CSSProperties = {
  display: "grid",
  gap: "11px",
};

const barRowStyle: CSSProperties = {
  display: "grid",
  gap: "6px",
};

const barRowHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  fontSize: "12px",
  fontWeight: 900,
  color: "#334155",
};

const barTrackStyle: CSSProperties = {
  height: "11px",
  borderRadius: "999px",
  overflow: "hidden",
};

const barFillStyle: CSSProperties = {
  height: "100%",
  borderRadius: "999px",
};

const dashboardHeroStatsStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: "10px",
};

const dashboardMetricTileStyle: CSSProperties = {
  borderRadius: "16px",
  padding: "14px",
  textAlign: "left",
  display: "grid",
  gap: "7px",
  cursor: "pointer",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
};

const dashboardMetricLabelStyle: CSSProperties = {
  fontSize: "11px",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const dashboardMetricValueStyle: CSSProperties = {
  fontSize: "28px",
  lineHeight: 1,
  fontWeight: 900,
};

const dashboardMetricDetailStyle: CSSProperties = {
  color: "#475569",
  fontSize: "12px",
  lineHeight: 1.35,
};

const dashboardKpiGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "12px",
  marginBottom: "16px",
};

const dashboardMainGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: "16px",
  alignItems: "start",
  marginBottom: "16px",
};

const dashboardSecondaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: "16px",
  alignItems: "start",
  marginBottom: "20px",
};

const calibrationWorkGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.35fr) minmax(340px, 0.9fr)",
  gap: "16px",
  alignItems: "stretch",
  marginBottom: "16px",
};

const denseRiskGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "10px",
};

const sideInsightStackStyle: CSSProperties = {
  display: "grid",
  gap: "16px",
  gridTemplateRows: "repeat(3, minmax(0, auto))",
  height: "100%",
};

const availabilitySummaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "10px",
  marginBottom: "14px",
};

const availabilitySummaryCardStyle: CSSProperties = {
  border: "1px solid #dbe7f3",
  borderRadius: "14px",
  background: "#f8fafc",
  padding: "12px",
  display: "grid",
  gap: "5px",
  color: "#475569",
  fontSize: "11px",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.03em",
};

const dashboardListStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
};

const dashboardRiskItemStyle: CSSProperties = {
  width: "100%",
  border: "1px solid #dbe7f3",
  borderRadius: "16px",
  background: "#ffffff",
  padding: "13px 14px",
  textAlign: "left",
  cursor: "pointer",
  display: "grid",
  gap: "8px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
  minHeight: "116px",
  boxSizing: "border-box",
};

const dashboardRiskItemCompactStyle: CSSProperties = {
  ...dashboardRiskItemStyle,
  padding: "11px 12px",
  minHeight: "108px",
};

const dashboardRiskTopLineStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  alignItems: "center",
};

const dashboardRiskDateStyle: CSSProperties = {
  color: "#475569",
  fontSize: "12px",
  fontWeight: 800,
};

const dashboardRiskTitleStyle: CSSProperties = {
  color: "#0f172a",
  fontSize: "14px",
  fontWeight: 900,
  lineHeight: 1.35,
};

const dashboardRiskMetaStyle: CSSProperties = {
  color: "#64748b",
  fontSize: "12px",
  lineHeight: 1.45,
};

const dashboardRiskFooterStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  flexWrap: "wrap",
  color: "#334155",
  fontSize: "12px",
  fontWeight: 800,
};

const dashboardEmptyStateStyle: CSSProperties = {
  border: "1px dashed #cbd5e1",
  borderRadius: "14px",
  background: "#f8fafc",
  padding: "18px",
  color: "#64748b",
  fontSize: "13px",
  fontWeight: 700,
  textAlign: "center",
};

const certificateGaugeStyle: CSSProperties = {
  border: "1px solid #dbe7f3",
  borderRadius: "16px",
  background: "#f8fafc",
  padding: "16px",
  display: "grid",
  gap: "10px",
};

const certificateGaugeHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  color: "#0f172a",
  fontSize: "13px",
  fontWeight: 900,
};

const certificateGaugeTrackStyle: CSSProperties = {
  width: "100%",
  height: "12px",
  borderRadius: "999px",
  background: "#e2e8f0",
  overflow: "hidden",
};

const certificateGaugeFillStyle: CSSProperties = {
  height: "100%",
  borderRadius: "999px",
  background: "linear-gradient(90deg, #3A9B98 0%, #2563eb 100%)",
};

const certificateGaugeMetaStyle: CSSProperties = {
  color: "#64748b",
  fontSize: "12px",
  fontWeight: 700,
};

const dashboardMiniStatGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "10px",
  marginTop: "12px",
};

const dashboardMiniStatStyle: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  background: "#ffffff",
  padding: "12px",
  display: "grid",
  gap: "6px",
  color: "#64748b",
  fontSize: "12px",
  fontWeight: 800,
};

const supplierStackStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
};

const supplierBarStyle: CSSProperties = {
  display: "grid",
  gap: "7px",
};

const supplierBarHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  color: "#0f172a",
  fontSize: "13px",
};

const supplierBarTrackStyle: CSSProperties = {
  height: "10px",
  borderRadius: "999px",
  background: "#e2e8f0",
  overflow: "hidden",
};

const supplierBarFillStyle: CSSProperties = {
  height: "100%",
  borderRadius: "999px",
  background: "#3A9B98",
};

const supplierBarMetaStyle: CSSProperties = {
  color: "#64748b",
  fontSize: "12px",
  lineHeight: 1.35,
};

const attentionGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "16px",
  marginBottom: "20px",
};

const twoColumnGridStyle: CSSProperties = {
  display: "none",
  gridTemplateColumns: "minmax(0, 1.08fr) minmax(340px, 0.92fr)",
  gap: "20px",
  marginBottom: "20px",
};

const createWorkspaceStyle: CSSProperties = {
  marginBottom: "20px",
};

const importIntroGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 0.95fr) minmax(320px, 1.05fr)",
  gap: "14px",
  marginBottom: "16px",
};

const importDropzoneStyle: CSSProperties = {
  border: "1px dashed #9ccfcc",
  borderRadius: "16px",
  background: "#f8fafc",
  padding: "16px",
  display: "grid",
  gap: "12px",
};

const importHeaderCardStyle: CSSProperties = {
  border: "1px solid #dbe7f3",
  borderRadius: "16px",
  background: "#ffffff",
  padding: "16px",
  display: "grid",
  gap: "12px",
};

const importDropzoneTitleStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 900,
  color: "#0f172a",
};

const importHeaderListStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const importHeaderPillStyle: CSSProperties = {
  display: "inline-flex",
  borderRadius: "999px",
  background: "#eef8f7",
  border: "1px solid #bfe5e3",
  color: "#2f7f7d",
  padding: "6px 10px",
  fontSize: "12px",
  fontWeight: 800,
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
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "14px",
};

const wideFieldStyle: CSSProperties = {
  gridColumn: "1 / -1",
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
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "10px 16px",
  color: "#334155",
  fontSize: "14px",
};

const helperTextStyle: CSSProperties = {
  fontSize: "13px",
  color: "#64748b",
};

const activeFilterChipStyle: CSSProperties = {
  marginLeft: "8px",
  borderRadius: "999px",
  padding: "5px 9px",
  background: "#eef8f7",
  color: "#2f7f7d",
  border: "1px solid #bfe5e3",
  fontSize: "12px",
  fontWeight: 900,
};

const fieldStackStyle: CSSProperties = {
  display: "grid",
  gap: "14px",
  marginTop: "16px",
};

const registerSummaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "12px",
  marginBottom: "14px",
};

const registerSummaryCardStyle: CSSProperties = {
  border: "1px solid rgba(148, 163, 184, 0.22)",
  borderRadius: "14px",
  padding: "12px 14px",
  minHeight: "82px",
  display: "grid",
  alignContent: "space-between",
};

const registerSummaryLabelStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const registerSummaryValueStyle: CSSProperties = {
  fontSize: "26px",
  fontWeight: 900,
  lineHeight: 1,
};

const hiddenRegisterWatchlistStyle: CSSProperties = {
  display: "none",
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

const detailActionRowStyle: CSSProperties = {
  marginTop: "18px",
  display: "flex",
  justifyContent: "flex-start",
  gap: "10px",
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

const compactTableWrapStyle: CSSProperties = {
  overflowX: "auto",
  border: "1px solid #dbe3ef",
  borderRadius: "16px",
  background: "#ffffff",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
};

const calibrationTableRowStyle: CSSProperties = {
  background: "#ffffff",
  verticalAlign: "top",
  cursor: "pointer",
};

const selectedCalibrationTableRowStyle: CSSProperties = {
  ...calibrationTableRowStyle,
  background: "#eff6ff",
  boxShadow: "inset 4px 0 0 #3A9B98",
};

const editPanelStyle: CSSProperties = {
  marginTop: "20px",
};

const detailSummaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "10px",
  marginBottom: "16px",
};

const summaryPillStyle: CSSProperties = {
  border: "1px solid #dbe7f3",
  borderRadius: "14px",
  background: "#f8fafc",
  padding: "10px 12px",
};

const summaryPillLabelStyle: CSSProperties = {
  fontSize: "11px",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "#64748b",
  marginBottom: "5px",
};

const summaryPillValueStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 800,
  color: "#0f172a",
  overflowWrap: "anywhere",
};

const historyPanelStyle: CSSProperties = {
  marginTop: "18px",
  borderTop: "1px solid #e2e8f0",
  paddingTop: "18px",
};

const historyHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
  flexWrap: "wrap",
  marginBottom: "12px",
};

const historyTitleStyle: CSSProperties = {
  fontSize: "16px",
  fontWeight: 900,
  color: "#0f172a",
};

const historySubtitleStyle: CSSProperties = {
  marginTop: "4px",
  fontSize: "13px",
  color: "#64748b",
  fontWeight: 700,
};

const lockedSummaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "12px",
  marginBottom: "16px",
};

const lockedSummaryItemStyle: CSSProperties = {
  border: "1px solid #dbe7f3",
  borderRadius: "14px",
  background: "#f8fafc",
  padding: "12px 14px",
};

const lockedSummaryLabelStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 900,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginBottom: "6px",
};

const lockedSummaryValueStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 800,
  color: "#0f172a",
  lineHeight: 1.35,
};

const attachCertificatePanelStyle: CSSProperties = {
  marginTop: "16px",
  border: "1px solid #dbe7f3",
  borderRadius: "14px",
  background: "#f8fafc",
  padding: "14px",
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

const issuedDateStyle: CSSProperties = {
  color: "#475569",
  fontSize: "13px",
  fontWeight: 700,
};

const dueDateTitleStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 900,
  marginBottom: "4px",
};

const dueDateMetaStyle: CSSProperties = {
  color: "#475569",
  fontSize: "12px",
  fontWeight: 800,
  lineHeight: 1.4,
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

const rowActionInlineStyle: CSSProperties = {
  display: "inline-flex",
  gap: "8px",
  alignItems: "center",
  whiteSpace: "nowrap",
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

const validImportBadgeStyle: CSSProperties = {
  display: "inline-flex",
  borderRadius: "999px",
  padding: "5px 9px",
  background: "#dcfce7",
  color: "#166534",
  border: "1px solid #bbf7d0",
  fontSize: "12px",
  fontWeight: 800,
};

const invalidImportBadgeStyle: CSSProperties = {
  ...validImportBadgeStyle,
  background: "#fef3c7",
  color: "#92400e",
  border: "1px solid #fde68a",
};



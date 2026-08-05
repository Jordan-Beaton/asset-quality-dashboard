"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import QRCode from "qrcode";
import { ModuleSectionHeader } from "../../src/components/ModuleSectionHeader";
import { ImsButton, ImsFilterPanel, ImsPanel, ImsTabs, ImsTopMetaRow } from "../../src/components/ImsPrimitives";
import { useImsPermissions } from "../../src/components/ImsPermissions";
import { QualityKpiCard } from "../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../src/components/QualityPageHero";
import {
  imsInputStyle,
  imsTableCellStyle,
  imsTableHeadStyle,
  imsTableInfoRowStyle,
  imsTableStyle,
} from "../../src/components/imsTheme";
import { supabase } from "../../src/lib/supabase";

export const dynamic = "force-dynamic";
type AssetStatus = "Active" | "Inactive" | "Quarantine" | "Under Maintenance";
type AssetWorkspaceView = "dashboard" | "register" | "create" | "reports";

type Asset = {
  id: string;
  asset_code: string | null;
  document_id_code: string | null;
  name: string | null;
  description: string | null;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  category: string | null;
  subcategory: string | null;
  condition: string | null;
  location: string | null;
  owner: string | null;
  purchase_date: string | null;
  maintenance_due_date: string | null;
  inspection_due_date: string | null;
  status: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type AssetForm = {
  name: string;
  document_id_code: string;
  description: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  category: string;
  subcategory: string;
  condition: string;
  location: string;
  owner: string;
  purchase_date: string;
  maintenance_due_date: string;
  inspection_due_date: string;
  status: AssetStatus;
};

type LinkedOption = {
  id: string;
  label: string;
};

type UploadedRecord = {
  id: string;
  reference: string;
  file_name: string;
  file_size: number | null;
  uploaded_at: string;
  file_path: string;
  notes: string;
};

type AssetQualityRecord = {
  linked_ncrs: string[];
  linked_actions: string[];
  calibration_records: UploadedRecord[];
  inspection_records: UploadedRecord[];
  quality_notes: string;
  last_quality_review: string;
  image_name: string;
  image_size: number | null;
  image_uploaded_at: string;
  image_path: string;
};

type QualityDraft = {
  linked_ncrs: string[];
  linked_actions: string[];
  selectedNcrToAdd: string;
  selectedActionToAdd: string;
  calibration_records: UploadedRecord[];
  inspection_records: UploadedRecord[];
  quality_notes: string;
  last_quality_review: string;
};

type AssetQualityRow = {
  id: string;
  asset_id: string;
  quality_notes: string | null;
  last_quality_review: string | null;
};

type AssetNcrLinkRow = {
  id: string;
  asset_id: string;
  ncr_reference: string;
};

type AssetActionLinkRow = {
  id: string;
  asset_id: string;
  action_reference: string;
};

type AssetCalibrationRow = {
  id: string;
  asset_id: string;
  reference: string;
  file_name: string | null;
  file_path: string | null;
  notes: string | null;
  uploaded_at: string | null;
  calibration_date: string | null;
  calibration_due_date: string | null;
  calibration_type: string | null;
  calibrated_by: string | null;
  certificate_number: string | null;
};

type AssetInspectionRow = {
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
  actions_required: string | null;
  next_inspection_due: string | null;
  created_at: string | null;
};

type AssetMaintenanceRow = {
  id: string;
  asset_id: string;
  maintenance_number: string | null;
  maintenance_date: string | null;
  maintenance_type: string | null;
  carried_out_by: string | null;
  description: string | null;
  next_maintenance_due: string | null;
  file_name: string | null;
  file_path: string | null;
  created_at: string | null;
};

type AssetFileRow = {
  id: string;
  asset_id: string;
  file_type: "image" | "calibration" | "inspection" | "other";
  reference: string | null;
  file_name: string;
  file_path: string;
  file_size: number | null;
  uploaded_at: string;
};

type AssetActionRow = {
  id: string;
  action_number: string | null;
  title: string | null;
  description: string | null;
  status: string | null;
  linked_asset_id: string | null;
  linked_asset_code: string | null;
  created_at: string | null;
  due_date: string | null;
};

type AssetTimelineEntry = {
  id: string;
  type: "File" | "Calibration" | "Inspection" | "Maintenance" | "Action";
  date: string | null;
  title: string;
  description: string;
  status: string;
  file_path: string | null;
  file_label: string;
  sortTime: number;
};

const STORAGE_BUCKET = "asset-files";
const PUBLIC_APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://asset-quality-dashboard.vercel.app";

const emptyForm: AssetForm = {
  name: "",
  document_id_code: "",
  description: "",
  manufacturer: "",
  model: "",
  serial_number: "",
  category: "",
  subcategory: "",
  condition: "",
  location: "",
  owner: "",
  purchase_date: "",
  maintenance_due_date: "",
  inspection_due_date: "",
  status: "Active",
};

function createDefaultQualityRecord(): AssetQualityRecord {
  return {
    linked_ncrs: [],
    linked_actions: [],
    calibration_records: [],
    inspection_records: [],
    quality_notes: "",
    last_quality_review: "",
    image_name: "",
    image_size: null,
    image_uploaded_at: "",
    image_path: "",
  };
}

function createQualityDraft(record: AssetQualityRecord): QualityDraft {
  return {
    linked_ncrs: [...record.linked_ncrs],
    linked_actions: [...record.linked_actions],
    selectedNcrToAdd: "",
    selectedActionToAdd: "",
    calibration_records: record.calibration_records.map((item) => ({ ...item })),
    inspection_records: record.inspection_records.map((item) => ({ ...item })),
    quality_notes: record.quality_notes,
    last_quality_review: record.last_quality_review,
  };
}

function createEmptyUploadedRecord(prefix: string): UploadedRecord {
  return {
    id: `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    reference: "",
    file_name: "",
    file_size: null,
    uploaded_at: "",
    file_path: "",
    notes: "",
  };
}

function formatDateTime(value: string) {
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

function formatFileSize(value: number | null) {
  if (!value || value <= 0) return "-";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function getTimestampValue(value: string | null | undefined) {
  if (!value) return Number.NEGATIVE_INFINITY;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
}

function getStatusTone(status: string) {
  const value = status.toLowerCase();

  if (value === "active") return { bg: "#dcfce7", color: "#166534" };
  if (value === "inactive") return { bg: "#e5e7eb", color: "#374151" };
  if (value.includes("quarantine")) return { bg: "#fee2e2", color: "#F93822" };
  if (value.includes("maintenance")) return { bg: "#fef3c7", color: "#92400e" };

  return { bg: "#e2e8f0", color: "#334155" };
}

function countQualityLinks(record: AssetQualityRecord) {
  return (
    record.linked_ncrs.length +
    record.linked_actions.length +
    record.calibration_records.length +
    record.inspection_records.length
  );
}

function compareText(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function generateHiddenAssetCode(name: string) {
  const cleaned = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 6);

  const now = new Date();
  const stamp = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}${String(now.getDate()).padStart(2, "0")}${String(now.getHours()).padStart(
    2,
    "0"
  )}${String(now.getMinutes()).padStart(2, "0")}`;

  return `AST-${cleaned || "GEN"}-${stamp}`;
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function unknownArrayToOptions(
  data: unknown,
  primaryKeys: string[],
  secondaryKeys: string[]
): LinkedOption[] {
  if (!Array.isArray(data)) return [];

  const rows = data as unknown[];

  return rows
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
    .filter((item): item is LinkedOption => Boolean(item && item.id));
}

async function tryLoadNcrOptions(): Promise<LinkedOption[]> {
  const attempts = [
    { table: "ncr_capa", columns: "id,ncr_number,title" },
    { table: "ncr_capa", columns: "id,reference,title" },
    { table: "ncr_capa", columns: "id,ncr_number,description" },
    { table: "ncrs", columns: "id,ncr_number,title" },
    { table: "ncrs", columns: "id,reference,title" },
    { table: "ncrs", columns: "id,reference,description" },
  ];

  for (const attempt of attempts) {
    const result = await supabase.from(attempt.table).select(attempt.columns).limit(200);

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

async function tryLoadActionOptions(): Promise<LinkedOption[]> {
  const attempts = [
    { table: "actions", columns: "id,action_number,title" },
    { table: "actions", columns: "id,action_id,title" },
    { table: "actions", columns: "id,reference,title" },
    { table: "actions", columns: "id,action_number,description" },
    { table: "actions", columns: "id,action_id,description" },
    { table: "actions", columns: "id,reference,description" },
  ];

  for (const attempt of attempts) {
    const result = await supabase.from(attempt.table).select(attempt.columns).limit(200);

    if (result.error) continue;

    const mapped = unknownArrayToOptions(
      result.data as unknown,
      ["action_number", "action_id", "reference", "id"],
      ["title", "description"]
    );

    if (mapped.length > 0) return mapped;
  }

  return [];
}

async function createSignedFileUrl(path: string) {
  if (!path) return "";

  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, 3600);

  if (error || !data?.signedUrl) return "";
  return data.signedUrl;
}

function AssetsPageContent() {
  const imsPermissions = useImsPermissions();
  const searchParams = useSearchParams();
  const linkedSearch = searchParams.get("search")?.trim() || "";
  const linkedStatus = searchParams.get("status")?.trim() || "";
  const linkedLocation = searchParams.get("location")?.trim() || "";
  const linkedOwner = searchParams.get("owner")?.trim() || "";
  const qualityLinkedOnly = searchParams.get("qualityLinked") === "1";
  const linkedAssetCode = searchParams.get("asset")?.trim() || "";
  const linkedAssetId = searchParams.get("assetId")?.trim() || "";

  const [assets, setAssets] = useState<Asset[]>([]);
  const [message, setMessage] = useState("Loading assets...");
  const [lastRefreshed, setLastRefreshed] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [qualityLinkedFilter, setQualityLinkedFilter] = useState(false);
  const [activeView, setActiveView] = useState<AssetWorkspaceView>("dashboard");
  const [showRegisterFilters, setShowRegisterFilters] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(true);
  const [qualityLinkedAssetIds, setQualityLinkedAssetIds] = useState<string[]>([]);

  const [form, setForm] = useState<AssetForm>(emptyForm);
  const [detailForm, setDetailForm] = useState<AssetForm>(emptyForm);
  const [qualityDraft, setQualityDraft] = useState<QualityDraft>(
    createQualityDraft(createDefaultQualityRecord())
  );

  const [ncrOptions, setNcrOptions] = useState<LinkedOption[]>([]);
  const [actionOptions, setActionOptions] = useState<LinkedOption[]>([]);

  const [qualityByAssetId, setQualityByAssetId] = useState<Record<string, AssetQualityRecord>>({});
  const [calibrationHistoryByAssetId, setCalibrationHistoryByAssetId] = useState<
    Record<string, AssetCalibrationRow[]>
  >({});
  const [inspectionHistoryByAssetId, setInspectionHistoryByAssetId] = useState<
    Record<string, AssetInspectionRow[]>
  >({});
  const [maintenanceHistoryByAssetId, setMaintenanceHistoryByAssetId] = useState<
    Record<string, AssetMaintenanceRow[]>
  >({});
  const [fileHistoryByAssetId, setFileHistoryByAssetId] = useState<Record<string, AssetFileRow[]>>({});
  const [actionHistoryByAssetId, setActionHistoryByAssetId] = useState<Record<string, AssetActionRow[]>>({});
  const [isSavingQuality, setIsSavingQuality] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState("");
  const [showQrCard, setShowQrCard] = useState(false);
  const [selectedAssetQrDataUrl, setSelectedAssetQrDataUrl] = useState("");
  const [hasHandledDeepLinkScroll, setHasHandledDeepLinkScroll] = useState(false);
  const detailPanelRef = useRef<HTMLElement | null>(null);

  async function loadAssets() {
    const { data, error } = await supabase.from("assets").select("*").order("name", {
      ascending: true,
    });

    if (error) {
      setMessage(`Error: ${error.message}`);
      return;
    }

    const loaded = (data || []) as Asset[];
    setAssets(loaded);
    setSelectedAssetId((current) => current || loaded[0]?.id || "");
    setLastRefreshed(new Date().toLocaleString("en-GB"));
    setMessage(`Loaded ${loaded.length} assets successfully.`);
  }

  async function loadLinkOptions() {
    const [loadedNcrs, loadedActions] = await Promise.all([
      tryLoadNcrOptions(),
      tryLoadActionOptions(),
    ]);

    setNcrOptions(loadedNcrs);
    setActionOptions(loadedActions);
  }

  async function loadQualityData(assetIds: string[]) {
    if (assetIds.length === 0) {
      setQualityByAssetId({});
      setCalibrationHistoryByAssetId({});
      setInspectionHistoryByAssetId({});
      setMaintenanceHistoryByAssetId({});
      setFileHistoryByAssetId({});
      setActionHistoryByAssetId({});
      return;
    }

    const assetCodeById = new Map(
      assets.map((asset) => [asset.id, asset.asset_code?.trim() || ""] as const)
    );

    const [qualityRes, ncrRes, actionRes, calibrationRes, inspectionRes, maintenanceRes, filesRes, actionTimelineRes] =
      await Promise.all([
      supabase
        .from("asset_quality")
        .select("id,asset_id,quality_notes,last_quality_review")
        .in("asset_id", assetIds),
      supabase
        .from("asset_ncr_links")
        .select("id,asset_id,ncr_reference")
        .in("asset_id", assetIds),
      supabase
        .from("asset_action_links")
        .select("id,asset_id,action_reference")
        .in("asset_id", assetIds),
      supabase
        .from("asset_calibration_records")
        .select(
          "id,asset_id,reference,file_name,file_path,notes,uploaded_at,calibration_date,calibration_due_date,calibration_type,calibrated_by,certificate_number"
        )
        .in("asset_id", assetIds),
      supabase
        .from("asset_inspection_records")
        .select(
          "id,asset_id,inspection_number,reference,file_name,file_path,notes,uploaded_at,inspection_date,inspector,result,findings,actions_required,next_inspection_due,created_at"
        )
        .in("asset_id", assetIds),
      supabase
        .from("asset_maintenance_records")
        .select(
          "id,asset_id,maintenance_number,maintenance_date,maintenance_type,carried_out_by,description,next_maintenance_due,file_name,file_path,created_at"
        )
        .in("asset_id", assetIds),
      supabase
        .from("asset_files")
        .select("id,asset_id,file_type,reference,file_name,file_path,file_size,uploaded_at")
        .in("asset_id", assetIds),
      supabase
        .from("actions")
        .select(
          "id,action_number,title,description,status,linked_asset_id,linked_asset_code,created_at,due_date"
        )
        .limit(1000),
    ]);

    const next: Record<string, AssetQualityRecord> = {};
    const nextCalibrationHistory: Record<string, AssetCalibrationRow[]> = {};
    const nextInspectionHistory: Record<string, AssetInspectionRow[]> = {};
    const nextMaintenanceHistory: Record<string, AssetMaintenanceRow[]> = {};
    const nextFileHistory: Record<string, AssetFileRow[]> = {};
    const nextActionHistory: Record<string, AssetActionRow[]> = {};

    assetIds.forEach((assetId) => {
      next[assetId] = createDefaultQualityRecord();
      nextCalibrationHistory[assetId] = [];
      nextInspectionHistory[assetId] = [];
      nextMaintenanceHistory[assetId] = [];
      nextFileHistory[assetId] = [];
      nextActionHistory[assetId] = [];
    });

    if (!qualityRes.error) {
      setQualityLinkedAssetIds(
        ((qualityRes.data as AssetQualityRow[] | null) || []).map((row) => row.asset_id)
      );
      (qualityRes.data as AssetQualityRow[] | null)?.forEach((row) => {
        next[row.asset_id] = {
          ...(next[row.asset_id] || createDefaultQualityRecord()),
          quality_notes: row.quality_notes || "",
          last_quality_review: row.last_quality_review || "",
        };
      });
    }

    if (!ncrRes.error) {
      (ncrRes.data as AssetNcrLinkRow[] | null)?.forEach((row) => {
        next[row.asset_id] = next[row.asset_id] || createDefaultQualityRecord();
        next[row.asset_id].linked_ncrs.push(row.ncr_reference);
      });
    }

    if (!actionRes.error) {
      (actionRes.data as AssetActionLinkRow[] | null)?.forEach((row) => {
        next[row.asset_id] = next[row.asset_id] || createDefaultQualityRecord();
        next[row.asset_id].linked_actions.push(row.action_reference);
      });
    }

    if (!calibrationRes.error) {
      (calibrationRes.data as AssetCalibrationRow[] | null)?.forEach((row) => {
        nextCalibrationHistory[row.asset_id] = nextCalibrationHistory[row.asset_id] || [];
        nextCalibrationHistory[row.asset_id].push(row);
        next[row.asset_id] = next[row.asset_id] || createDefaultQualityRecord();
        next[row.asset_id].calibration_records.push({
          id: row.id,
          reference: row.reference,
          file_name: row.file_name || "",
          file_size: null,
          uploaded_at: row.uploaded_at || "",
          file_path: row.file_path || "",
          notes: row.notes || "",
        });
      });
    }

    if (!inspectionRes.error) {
      (inspectionRes.data as AssetInspectionRow[] | null)?.forEach((row) => {
        nextInspectionHistory[row.asset_id] = nextInspectionHistory[row.asset_id] || [];
        nextInspectionHistory[row.asset_id].push(row);

        const isDetailedInspectionRecord = Boolean(
          row.inspection_date ||
            row.inspector ||
            row.result ||
            row.findings ||
            row.actions_required ||
            row.next_inspection_due
        );

        if (!isDetailedInspectionRecord) {
          next[row.asset_id] = next[row.asset_id] || createDefaultQualityRecord();
          next[row.asset_id].inspection_records.push({
            id: row.id,
            reference: row.reference || "",
            file_name: row.file_name || "",
            file_size: null,
            uploaded_at: row.uploaded_at || "",
            file_path: row.file_path || "",
            notes: row.notes || "",
          });
        }
      });
    }

    if (!maintenanceRes.error) {
      (maintenanceRes.data as AssetMaintenanceRow[] | null)?.forEach((row) => {
        nextMaintenanceHistory[row.asset_id] = nextMaintenanceHistory[row.asset_id] || [];
        nextMaintenanceHistory[row.asset_id].push(row);
      });
    }

    if (!filesRes.error) {
      const files = (filesRes.data as AssetFileRow[] | null) || [];
      files.forEach((fileRow) => {
        next[fileRow.asset_id] = next[fileRow.asset_id] || createDefaultQualityRecord();
        if (fileRow.file_type === "image" || fileRow.file_type === "other") {
          nextFileHistory[fileRow.asset_id] = nextFileHistory[fileRow.asset_id] || [];
          nextFileHistory[fileRow.asset_id].push(fileRow);
        }

        if (fileRow.file_type === "image") {
          next[fileRow.asset_id].image_name = fileRow.file_name;
          next[fileRow.asset_id].image_size = fileRow.file_size || null;
          next[fileRow.asset_id].image_uploaded_at = fileRow.uploaded_at;
          next[fileRow.asset_id].image_path = fileRow.file_path;
        }
      });
    }

    if (!actionTimelineRes.error) {
      ((actionTimelineRes.data as AssetActionRow[] | null) || []).forEach((row) => {
        const linkedAssetId = row.linked_asset_id?.trim() || "";
        if (linkedAssetId && nextActionHistory[linkedAssetId]) {
          nextActionHistory[linkedAssetId].push(row);
          return;
        }

        const linkedAssetCode = row.linked_asset_code?.trim() || "";
        if (!linkedAssetCode) return;

        const matchedAssetId = assetIds.find((assetId) => assetCodeById.get(assetId) === linkedAssetCode);
        if (matchedAssetId) {
          nextActionHistory[matchedAssetId] = nextActionHistory[matchedAssetId] || [];
          nextActionHistory[matchedAssetId].push(row);
        }
      });
    }

    setQualityByAssetId(next);
    setCalibrationHistoryByAssetId(nextCalibrationHistory);
    setInspectionHistoryByAssetId(nextInspectionHistory);
    setMaintenanceHistoryByAssetId(nextMaintenanceHistory);
    setFileHistoryByAssetId(nextFileHistory);
    setActionHistoryByAssetId(nextActionHistory);
  }

  useEffect(() => {
    void (async () => {
      await Promise.all([loadAssets(), loadLinkOptions()]);
    })();
  }, []);

  useEffect(() => {
    if (assets.length === 0) return;
    void loadQualityData(assets.map((asset) => asset.id));
  }, [assets]);

  useEffect(() => {
    setSearch(linkedSearch);
    setStatusFilter(linkedStatus);
    setLocationFilter(linkedLocation);
    setOwnerFilter(linkedOwner);

    if (linkedSearch || linkedStatus || linkedLocation || linkedOwner || qualityLinkedOnly) {
      setActiveView("register");
      setShowRegisterFilters(true);
    }
  }, [linkedSearch, linkedStatus, linkedLocation, linkedOwner, qualityLinkedOnly]);

  useEffect(() => {
    if (assets.length === 0) return;
    if (!linkedAssetCode && !linkedAssetId) return;

    const matchedAsset =
      assets.find(
        (asset) =>
          Boolean(linkedAssetCode) &&
          (asset.asset_code || "").trim().toLowerCase() === linkedAssetCode.toLowerCase()
      ) ||
      assets.find((asset) => Boolean(linkedAssetId) && asset.id === linkedAssetId);

    if (matchedAsset) {
      setActiveView("register");
      setSelectedAssetId(matchedAsset.id);
      setIsDetailPanelOpen(true);
    }
  }, [assets, linkedAssetCode, linkedAssetId]);

  useEffect(() => {
    setHasHandledDeepLinkScroll(false);
  }, [linkedAssetCode, linkedAssetId]);

  useEffect(() => {
    const imagePath = selectedAssetId ? qualityByAssetId[selectedAssetId]?.image_path || "" : "";

    if (!imagePath) {
      setSelectedImageUrl("");
      return;
    }

    void (async () => {
      const url = await createSignedFileUrl(imagePath);
      setSelectedImageUrl(url ? `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}` : "");
    })();
  }, [selectedAssetId, qualityByAssetId]);

  const filteredAssets = useMemo(() => {
    let result = [...assets];

    if (search.trim()) {
      const lower = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.asset_code?.toLowerCase().includes(lower) ||
          a.name?.toLowerCase().includes(lower) ||
          a.description?.toLowerCase().includes(lower) ||
          a.manufacturer?.toLowerCase().includes(lower) ||
          a.model?.toLowerCase().includes(lower) ||
          a.serial_number?.toLowerCase().includes(lower) ||
          a.category?.toLowerCase().includes(lower) ||
          a.subcategory?.toLowerCase().includes(lower) ||
          a.condition?.toLowerCase().includes(lower) ||
          a.location?.toLowerCase().includes(lower) ||
          a.owner?.toLowerCase().includes(lower)
      );
    }

    if (statusFilter) {
      result = result.filter((a) => a.status === statusFilter);
    }

    if (locationFilter) {
      result = result.filter((a) => a.location === locationFilter);
    }

    if (ownerFilter) {
      result = result.filter((a) => a.owner === ownerFilter);
    }

    if (qualityLinkedOnly || qualityLinkedFilter) {
      const linkedIds = new Set(qualityLinkedAssetIds);
      result = result.filter((asset) => linkedIds.has(asset.id));
    }

    return result;
  }, [
    assets,
    search,
    statusFilter,
    locationFilter,
    ownerFilter,
    qualityLinkedOnly,
    qualityLinkedFilter,
    qualityLinkedAssetIds,
  ]);

  const deepLinkedAssetId = useMemo(() => {
    if (!assets.length) return "";
    if (linkedAssetCode) {
      const matchedByCode = assets.find(
        (asset) => (asset.asset_code || "").trim().toLowerCase() === linkedAssetCode.toLowerCase()
      );
      if (matchedByCode) return matchedByCode.id;
    }

    if (linkedAssetId) {
      const matchedById = assets.find((asset) => asset.id === linkedAssetId);
      if (matchedById) return matchedById.id;
    }

    return "";
  }, [assets, linkedAssetCode, linkedAssetId]);

  useEffect(() => {
    if (filteredAssets.length === 0) {
      setSelectedAssetId("");
      setIsDetailPanelOpen(false);
      return;
    }

    if (deepLinkedAssetId && filteredAssets.some((asset) => asset.id === deepLinkedAssetId)) {
      if (selectedAssetId !== deepLinkedAssetId || !isDetailPanelOpen) {
        setSelectedAssetId(deepLinkedAssetId);
        setIsDetailPanelOpen(true);
      }
      return;
    }

    if (!filteredAssets.some((asset) => asset.id === selectedAssetId)) {
      setSelectedAssetId(filteredAssets[0].id);
      setIsDetailPanelOpen(true);
    }
  }, [deepLinkedAssetId, filteredAssets, isDetailPanelOpen, selectedAssetId]);

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedAssetId) || null,
    [assets, selectedAssetId]
  );

  useEffect(() => {
    if (!deepLinkedAssetId || !selectedAsset || selectedAsset.id !== deepLinkedAssetId) return;
    if (!isDetailPanelOpen || hasHandledDeepLinkScroll) return;

    const timer = window.setTimeout(() => {
      detailPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      setHasHandledDeepLinkScroll(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [deepLinkedAssetId, hasHandledDeepLinkScroll, isDetailPanelOpen, selectedAsset]);

  const selectedAssetQrUrl = useMemo(() => {
    if (!selectedAsset) return "";

    const relativeUrl = selectedAsset.asset_code?.trim()
      ? `/assets/field?asset=${encodeURIComponent(selectedAsset.asset_code.trim())}`
      : `/assets/field?assetId=${encodeURIComponent(selectedAsset.id)}`;

    return `${PUBLIC_APP_URL}${relativeUrl}`;
  }, [selectedAsset]);

  const selectedAssetRouteValue = useMemo(() => {
    if (!selectedAsset) return "";
    return selectedAsset.asset_code?.trim() || selectedAsset.id;
  }, [selectedAsset]);

  const selectedAssetActionUrl = useMemo(() => {
    if (!selectedAsset) return "/actions";

    const params = new URLSearchParams({
      source: "Asset",
      prefill_department: "Assets",
      linked_asset_id: selectedAsset.id,
      linked_asset_code: selectedAsset.asset_code?.trim() || "",
      prefill_title: selectedAsset.asset_code?.trim()
        ? `Asset action - ${selectedAsset.asset_code.trim()}`
        : `Asset action - ${selectedAsset.name || selectedAsset.id}`,
      prefill_description: selectedAsset.name
        ? `Raised from asset record ${selectedAsset.name}.`
        : "Raised from asset record.",
    });

    return `/actions?${params.toString()}`;
  }, [selectedAsset]);

  const selectedQuality = useMemo(() => {
    if (!selectedAssetId) return createDefaultQualityRecord();
    return qualityByAssetId[selectedAssetId] || createDefaultQualityRecord();
  }, [qualityByAssetId, selectedAssetId]);

  const selectedInspectionHistory = useMemo(() => {
    const rows = selectedAssetId ? inspectionHistoryByAssetId[selectedAssetId] || [] : [];
    return [...rows].sort((a, b) => {
      const aTime = getTimestampValue(a.inspection_date || a.created_at || a.uploaded_at);
      const bTime = getTimestampValue(b.inspection_date || b.created_at || b.uploaded_at);
      return bTime - aTime;
    });
  }, [inspectionHistoryByAssetId, selectedAssetId]);

  const selectedMaintenanceHistory = useMemo(() => {
    const rows = selectedAssetId ? maintenanceHistoryByAssetId[selectedAssetId] || [] : [];
    return [...rows].sort((a, b) => {
      const aTime = getTimestampValue(a.maintenance_date || a.created_at);
      const bTime = getTimestampValue(b.maintenance_date || b.created_at);
      return bTime - aTime;
    });
  }, [maintenanceHistoryByAssetId, selectedAssetId]);

  const selectedTimelineEntries = useMemo(() => {
    const calibrationRows = selectedAssetId ? calibrationHistoryByAssetId[selectedAssetId] || [] : [];
    const inspectionRows = selectedAssetId ? inspectionHistoryByAssetId[selectedAssetId] || [] : [];
    const maintenanceRows = selectedAssetId ? maintenanceHistoryByAssetId[selectedAssetId] || [] : [];
    const fileRows = selectedAssetId ? fileHistoryByAssetId[selectedAssetId] || [] : [];
    const actionRows = selectedAssetId ? actionHistoryByAssetId[selectedAssetId] || [] : [];

    const entries: AssetTimelineEntry[] = [
      ...fileRows.map((row) => ({
        id: `file-${row.id}`,
        type: "File" as const,
        date: row.uploaded_at || null,
        title: row.file_name || row.reference || "Asset file",
        description: row.reference || `${row.file_type === "image" ? "Asset image" : "Asset file"} uploaded`,
        status: row.file_type === "image" ? "Image" : "File",
        file_path: row.file_path || null,
        file_label: "Open file",
        sortTime: getTimestampValue(row.uploaded_at),
      })),
      ...calibrationRows.map((row) => ({
        id: `cal-${row.id}`,
        type: "Calibration" as const,
        date: row.calibration_date || row.uploaded_at || null,
        title: row.certificate_number || row.reference || "Calibration record",
        description:
          row.notes ||
          [row.calibration_type, row.calibrated_by].filter(Boolean).join(" • ") ||
          "Calibration event recorded",
        status: row.calibration_due_date ? `Due ${formatDate(row.calibration_due_date)}` : "Recorded",
        file_path: row.file_path || null,
        file_label: row.file_path ? "Open certificate" : "",
        sortTime: getTimestampValue(row.calibration_date || row.uploaded_at),
      })),
      ...inspectionRows.map((row) => ({
        id: `insp-${row.id}`,
        type: "Inspection" as const,
        date: row.inspection_date || row.created_at || row.uploaded_at || null,
        title: row.inspection_number || row.reference || "Inspection record",
        description: row.findings || row.actions_required || row.notes || row.inspector || "Inspection recorded",
        status: row.result || "Recorded",
        file_path: row.file_path || null,
        file_label: row.file_path ? "Open file" : "",
        sortTime: getTimestampValue(row.inspection_date || row.created_at || row.uploaded_at),
      })),
      ...maintenanceRows.map((row) => ({
        id: `mnt-${row.id}`,
        type: "Maintenance" as const,
        date: row.maintenance_date || row.created_at || null,
        title: row.maintenance_number || row.maintenance_type || "Maintenance record",
        description: row.description || row.carried_out_by || "Maintenance recorded",
        status: row.maintenance_type || "Recorded",
        file_path: row.file_path || null,
        file_label: row.file_path ? "Open file" : "",
        sortTime: getTimestampValue(row.maintenance_date || row.created_at),
      })),
      ...actionRows.map((row) => ({
        id: `action-${row.id}`,
        type: "Action" as const,
        date: row.created_at || row.due_date || null,
        title: row.action_number || row.title || "Linked action",
        description: row.description || row.title || "Action linked to asset",
        status: row.status || "Open",
        file_path: null,
        file_label: "",
        sortTime: getTimestampValue(row.created_at || row.due_date),
      })),
    ];

    return entries.sort((a, b) => b.sortTime - a.sortTime);
  }, [
    actionHistoryByAssetId,
    calibrationHistoryByAssetId,
    fileHistoryByAssetId,
    inspectionHistoryByAssetId,
    maintenanceHistoryByAssetId,
    selectedAssetId,
  ]);

  useEffect(() => {
    if (!selectedAsset) return;

    setShowQrCard(false);
    setSelectedAssetQrDataUrl("");

    setDetailForm({
      name: selectedAsset.name || "",
      document_id_code: selectedAsset.document_id_code || "",
      description: selectedAsset.description || "",
      manufacturer: selectedAsset.manufacturer || "",
      model: selectedAsset.model || "",
      serial_number: selectedAsset.serial_number || "",
      category: selectedAsset.category || "",
      subcategory: selectedAsset.subcategory || "",
      condition: selectedAsset.condition || "",
      location: selectedAsset.location || "",
      owner: selectedAsset.owner || "",
      purchase_date: selectedAsset.purchase_date || "",
      maintenance_due_date: selectedAsset.maintenance_due_date || "",
      inspection_due_date: selectedAsset.inspection_due_date || "",
      status: (selectedAsset.status as AssetStatus) || "Active",
    });

    const record = qualityByAssetId[selectedAsset.id] || createDefaultQualityRecord();
    setQualityDraft(createQualityDraft(record));
  }, [selectedAsset, qualityByAssetId]);

  useEffect(() => {
    let isActive = true;

    if (!showQrCard || !selectedAssetQrUrl) {
      setSelectedAssetQrDataUrl("");
      return () => {
        isActive = false;
      };
    }

    void QRCode.toDataURL(selectedAssetQrUrl, {
      width: 280,
      margin: 1,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then((url) => {
        if (isActive) setSelectedAssetQrDataUrl(url);
      })
      .catch(() => {
        if (!isActive) return;
        setSelectedAssetQrDataUrl("");
        setMessage("Could not generate QR code.");
      });

    return () => {
      isActive = false;
    };
  }, [showQrCard, selectedAssetQrUrl]);

  const totalAssets = assets.length;
  const activeAssets = assets.filter((a) => (a.status || "").toLowerCase() === "active").length;
  const inactiveAssets = assets.filter((a) => (a.status || "").toLowerCase() === "inactive").length;
  const underMaintenanceAssets = assets.filter((a) =>
    (a.status || "").toLowerCase().includes("maintenance")
  ).length;
  const qualityLinkedAssets = assets.filter((asset) => {
    const record = qualityByAssetId[asset.id];
    return record ? countQualityLinks(record) > 0 : false;
  }).length;
  const dueSoonInspectionAssets = assets.filter((asset) => {
    const days = getDaysUntil(asset.inspection_due_date);
    return days !== null && days >= 0 && days <= 30;
  }).length;
  const overdueInspectionAssets = assets.filter((asset) => {
    const days = getDaysUntil(asset.inspection_due_date);
    return days !== null && days < 0;
  }).length;
  const dueSoonMaintenanceAssets = assets.filter((asset) => {
    const days = getDaysUntil(asset.maintenance_due_date);
    return days !== null && days >= 0 && days <= 30;
  }).length;
  const overdueMaintenanceAssets = assets.filter((asset) => {
    const days = getDaysUntil(asset.maintenance_due_date);
    return days !== null && days < 0;
  }).length;
  const assetsWithImages = assets.filter((asset) => qualityByAssetId[asset.id]?.image_name).length;
  const latestAssetLabel = useMemo(() => {
    const latest = [...assets].sort((a, b) => {
      const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
      const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
      return bTime - aTime;
    })[0];

    if (!latest) return "No assets loaded";
    return latest.asset_code || latest.name || "Unnamed asset";
  }, [assets]);

  const qualitySnapshotData = useMemo(() => {
    const counts = {
      NCRs: 0,
      Actions: 0,
      Calibration: 0,
      Inspection: 0,
    };

    Object.values(qualityByAssetId).forEach((record) => {
      counts.NCRs += record.linked_ncrs.length;
      counts.Actions += record.linked_actions.length;
      counts.Calibration += record.calibration_records.length;
      counts.Inspection += record.inspection_records.length;
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [qualityByAssetId]);

  const uniqueLocations = [...new Set(assets.map((a) => a.location).filter(Boolean))];
  const uniqueOwners = [...new Set(assets.map((a) => a.owner).filter(Boolean))];

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

  async function addAsset(e: React.FormEvent) {
    e.preventDefault();

    if (!requireCreateAccess("create assets")) return;

    if (!form.name.trim()) {
      setMessage("Asset name is required.");
      return;
    }

    const generatedAssetCode = generateHiddenAssetCode(form.name);

    const { data, error } = await supabase
      .from("assets")
      .insert([
        {
          asset_code: generatedAssetCode,
          name: form.name.trim(),
          document_id_code: form.document_id_code.trim() || null,
          description: form.description || null,
          manufacturer: form.manufacturer || null,
          model: form.model || null,
          serial_number: form.serial_number || null,
          category: form.category || null,
          subcategory: form.subcategory || null,
          condition: form.condition || null,
          location: form.location || null,
          owner: form.owner || null,
          purchase_date: form.purchase_date || null,
          maintenance_due_date: form.maintenance_due_date || null,
          inspection_due_date: form.inspection_due_date || null,
          status: form.status || "Active",
        },
      ])
      .select()
      .single();

    if (error) {
      setMessage(`Add asset failed: ${error.message}`);
      return;
    }

    const newAsset = data as Asset;

    setAssets((prev) => [...prev, newAsset].sort((a, b) => compareText(a.name || "", b.name || "")));
    setActiveView("register");
    setSelectedAssetId(newAsset.id);
    setIsDetailPanelOpen(true);
    setForm(emptyForm);

    const { error: qualityError } = await supabase.from("asset_quality").upsert(
      {
        asset_id: newAsset.id,
        quality_notes: null,
        last_quality_review: null,
      },
      {
        onConflict: "asset_id",
      }
    );

    if (qualityError) {
      setMessage(`Asset added, but quality row failed: ${qualityError.message}`);
      return;
    }

    setMessage("Asset added successfully.");
  }

  async function saveAssetDetail() {
    if (!selectedAsset) {
      setMessage("Select an asset first.");
      return;
    }

    if (!requireEditAccess("update assets")) return;

    if (!detailForm.name.trim()) {
      setMessage("Asset name is required.");
      return;
    }

    const assetCodeToUse = selectedAsset.asset_code || generateHiddenAssetCode(detailForm.name);

    const { error } = await supabase
      .from("assets")
      .update({
        asset_code: assetCodeToUse,
        name: detailForm.name.trim(),
        document_id_code: detailForm.document_id_code.trim() || null,
        description: detailForm.description || null,
        manufacturer: detailForm.manufacturer || null,
        model: detailForm.model || null,
        serial_number: detailForm.serial_number || null,
        category: detailForm.category || null,
        subcategory: detailForm.subcategory || null,
        condition: detailForm.condition || null,
        location: detailForm.location || null,
        owner: detailForm.owner || null,
        purchase_date: detailForm.purchase_date || null,
        maintenance_due_date: detailForm.maintenance_due_date || null,
        inspection_due_date: detailForm.inspection_due_date || null,
        status: detailForm.status || "Active",
      })
      .eq("id", selectedAsset.id);

    if (error) {
      setMessage(`Update failed: ${error.message}`);
      return;
    }

    setAssets((prev) =>
      prev
        .map((asset) =>
          asset.id === selectedAsset.id
            ? {
                ...asset,
                asset_code: assetCodeToUse,
                name: detailForm.name.trim(),
                document_id_code: detailForm.document_id_code.trim() || null,
                description: detailForm.description || null,
                manufacturer: detailForm.manufacturer || null,
                model: detailForm.model || null,
                serial_number: detailForm.serial_number || null,
                category: detailForm.category || null,
                subcategory: detailForm.subcategory || null,
                condition: detailForm.condition || null,
                location: detailForm.location || null,
                owner: detailForm.owner || null,
                purchase_date: detailForm.purchase_date || null,
                maintenance_due_date: detailForm.maintenance_due_date || null,
                inspection_due_date: detailForm.inspection_due_date || null,
                status: detailForm.status,
              }
            : asset
        )
        .sort((a, b) => compareText(a.name || "", b.name || ""))
    );

    setMessage("Asset updated successfully.");
  }

  async function deleteSelectedAsset() {
    if (!selectedAsset) {
      setMessage("Select an asset first.");
      return;
    }

    if (!requireEditAccess("delete assets")) return;

    const confirmDelete = window.confirm("Delete this asset?");
    if (!confirmDelete) return;

    const qualityRecord = qualityByAssetId[selectedAsset.id];
    const filePaths: string[] = [];

    if (qualityRecord?.image_path) filePaths.push(qualityRecord.image_path);
    qualityRecord?.calibration_records.forEach((record) => {
      if (record.file_path) filePaths.push(record.file_path);
    });
    qualityRecord?.inspection_records.forEach((record) => {
      if (record.file_path) filePaths.push(record.file_path);
    });

    if (filePaths.length > 0) {
      await supabase.storage.from(STORAGE_BUCKET).remove(filePaths);
    }

    const { error } = await supabase.from("assets").delete().eq("id", selectedAsset.id);

    if (error) {
      setMessage(`Delete failed: ${error.message}`);
      return;
    }

    const remainingAssets = assets.filter((asset) => asset.id !== selectedAsset.id);
    setAssets(remainingAssets);
    setSelectedAssetId(remainingAssets[0]?.id || "");
    setSelectedImageUrl("");

    setMessage("Asset deleted successfully.");
  }

  async function uploadFileToStorage(assetId: string, folder: string, file: File) {
    const safeName = sanitizeFileName(file.name);
    const path = `assets/${assetId}/${folder}/${Date.now()}-${safeName}`;

    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
      upsert: true,
      contentType: file.type || undefined,
    });

    if (error) {
      throw new Error(error.message);
    }

    return path;
  }

  async function upsertAssetImageRecord(assetId: string, file: File, path: string) {
    const { error: deleteOldError } = await supabase
      .from("asset_files")
      .delete()
      .eq("asset_id", assetId)
      .eq("file_type", "image");

    if (deleteOldError) {
      throw new Error(deleteOldError.message);
    }

    const { error } = await supabase.from("asset_files").insert({
      asset_id: assetId,
      file_type: "image",
      reference: null,
      file_name: file.name,
      file_path: path,
      file_size: file.size,
      uploaded_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    if (!requireEditAccess("upload asset images")) {
      event.target.value = "";
      return;
    }

    if (!selectedAsset) {
      setMessage("Select an asset first.");
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    const isValidImage =
      file.type.startsWith("image/") ||
      /\.(png|jpg|jpeg|webp|gif|bmp)$/i.test(file.name);

    if (!isValidImage) {
      setMessage("Please upload a valid image file.");
      event.target.value = "";
      return;
    }

    setIsUploadingImage(true);

    try {
      const oldPath = selectedQuality.image_path;
      const path = await uploadFileToStorage(selectedAsset.id, "image", file);
      await upsertAssetImageRecord(selectedAsset.id, file, path);

      if (oldPath && oldPath !== path) {
        await supabase.storage.from(STORAGE_BUCKET).remove([oldPath]);
      }

      await loadQualityData(assets.map((asset) => asset.id));

      const refreshedUrl = await createSignedFileUrl(path);
      setSelectedImageUrl(
        refreshedUrl ? `${refreshedUrl}${refreshedUrl.includes("?") ? "&" : "?"}t=${Date.now()}` : ""
      );

      setMessage("Asset image uploaded.");
    } catch (error) {
      const err = error as Error;
      setMessage(`Image upload failed: ${err.message}`);
    } finally {
      setIsUploadingImage(false);
      event.target.value = "";
    }
  }

  async function removeImage() {
    if (!selectedAsset) {
      setMessage("Select an asset first.");
      return;
    }

    if (!requireEditAccess("remove asset images")) return;

    try {
      if (selectedQuality.image_path) {
        await supabase.storage.from(STORAGE_BUCKET).remove([selectedQuality.image_path]);
      }

      const { error } = await supabase
        .from("asset_files")
        .delete()
        .eq("asset_id", selectedAsset.id)
        .eq("file_type", "image");

      if (error) {
        setMessage(`Remove image failed: ${error.message}`);
        return;
      }

      setSelectedImageUrl("");
      await loadQualityData(assets.map((asset) => asset.id));
      setMessage("Asset image removed.");
    } catch (error) {
      const err = error as Error;
      setMessage(`Remove image failed: ${err.message}`);
    }
  }

  function addLinkedNcr() {
    if (!requireEditAccess("change asset quality links")) return;
    if (!qualityDraft.selectedNcrToAdd) return;

    setQualityDraft((prev) => {
      if (prev.linked_ncrs.includes(prev.selectedNcrToAdd)) {
        return { ...prev, selectedNcrToAdd: "" };
      }

      return {
        ...prev,
        linked_ncrs: [...prev.linked_ncrs, prev.selectedNcrToAdd],
        selectedNcrToAdd: "",
      };
    });
  }

  function addLinkedAction() {
    if (!requireEditAccess("change asset quality links")) return;
    if (!qualityDraft.selectedActionToAdd) return;

    setQualityDraft((prev) => {
      if (prev.linked_actions.includes(prev.selectedActionToAdd)) {
        return { ...prev, selectedActionToAdd: "" };
      }

      return {
        ...prev,
        linked_actions: [...prev.linked_actions, prev.selectedActionToAdd],
        selectedActionToAdd: "",
      };
    });
  }

  function removeLinkedNcr(id: string) {
    if (!requireEditAccess("change asset quality links")) return;

    setQualityDraft((prev) => ({
      ...prev,
      linked_ncrs: prev.linked_ncrs.filter((item) => item !== id),
    }));
  }

  function removeLinkedAction(id: string) {
    if (!requireEditAccess("change asset quality links")) return;

    setQualityDraft((prev) => ({
      ...prev,
      linked_actions: prev.linked_actions.filter((item) => item !== id),
    }));
  }

  function addCalibrationRecord() {
    if (!requireEditAccess("change asset calibration references")) return;

    setQualityDraft((prev) => ({
      ...prev,
      calibration_records: [...prev.calibration_records, createEmptyUploadedRecord("cal")],
    }));
  }

  function addInspectionRecord() {
    if (!requireEditAccess("change asset inspection references")) return;

    setQualityDraft((prev) => ({
      ...prev,
      inspection_records: [...prev.inspection_records, createEmptyUploadedRecord("insp")],
    }));
  }

  function updateCalibrationField(id: string, field: keyof UploadedRecord, value: string | number | null) {
    setQualityDraft((prev) => ({
      ...prev,
      calibration_records: prev.calibration_records.map((record) =>
        record.id === id ? { ...record, [field]: value } : record
      ),
    }));
  }

  function updateInspectionField(id: string, field: keyof UploadedRecord, value: string | number | null) {
    setQualityDraft((prev) => ({
      ...prev,
      inspection_records: prev.inspection_records.map((record) =>
        record.id === id ? { ...record, [field]: value } : record
      ),
    }));
  }

  async function handleCalibrationFileUpload(recordId: string, event: React.ChangeEvent<HTMLInputElement>) {
    if (!requireEditAccess("upload calibration files")) {
      event.target.value = "";
      return;
    }

    if (!selectedAsset) {
      setMessage("Select an asset first.");
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const path = await uploadFileToStorage(selectedAsset.id, "calibration", file);

      setQualityDraft((prev) => ({
        ...prev,
        calibration_records: prev.calibration_records.map((record) => {
          if (record.id !== recordId) return record;

          return {
            ...record,
            file_name: file.name,
            file_size: file.size,
            uploaded_at: new Date().toISOString(),
            file_path: path,
          };
        }),
      }));

      setMessage("Calibration file uploaded. Save Quality Section to commit it.");
    } catch (error) {
      const err = error as Error;
      setMessage(`Calibration upload failed: ${err.message}`);
    } finally {
      event.target.value = "";
    }
  }

  async function handleInspectionFileUpload(recordId: string, event: React.ChangeEvent<HTMLInputElement>) {
    if (!requireEditAccess("upload inspection files")) {
      event.target.value = "";
      return;
    }

    if (!selectedAsset) {
      setMessage("Select an asset first.");
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const path = await uploadFileToStorage(selectedAsset.id, "inspection", file);

      setQualityDraft((prev) => ({
        ...prev,
        inspection_records: prev.inspection_records.map((record) => {
          if (record.id !== recordId) return record;

          return {
            ...record,
            file_name: file.name,
            file_size: file.size,
            uploaded_at: new Date().toISOString(),
            file_path: path,
          };
        }),
      }));

      setMessage("Inspection file uploaded. Save Quality Section to commit it.");
    } catch (error) {
      const err = error as Error;
      setMessage(`Inspection upload failed: ${err.message}`);
    } finally {
      event.target.value = "";
    }
  }

  async function openStoredFile(path: string) {
    if (!path) {
      setMessage("No file path available.");
      return;
    }

    const signedUrl = await createSignedFileUrl(path);

    if (!signedUrl) {
      setMessage("Could not open file.");
      return;
    }

    window.open(signedUrl, "_blank", "noopener,noreferrer");
  }

  function printSelectedAssetQrCode() {
    if (!selectedAssetQrDataUrl || !selectedAsset) return;

    const printWindow = window.open("", "_blank", "width=520,height=680");
    if (!printWindow) {
      setMessage("Pop-up blocked. Allow pop-ups to print the QR code.");
      return;
    }

    const assetLabel = selectedAsset.asset_code || selectedAsset.name || "Asset";

    printWindow.document.write(`
      <html>
        <head>
          <title>${assetLabel} QR Code</title>
          <style>
            body {
              font-family: Arial, Helvetica, sans-serif;
              display: grid;
              place-items: center;
              padding: 32px;
              color: #0f172a;
            }
            .wrap {
              text-align: center;
            }
            img {
              width: 280px;
              height: 280px;
              display: block;
              margin: 0 auto 18px;
            }
            .title {
              font-size: 22px;
              font-weight: 800;
              margin-bottom: 8px;
            }
            .meta {
              font-size: 14px;
              color: #475569;
              word-break: break-word;
            }
          </style>
        </head>
        <body>
          <div class="wrap">
            <img src="${selectedAssetQrDataUrl}" alt="Asset QR Code" />
            <div class="title">${assetLabel}</div>
            <div class="meta">${selectedAssetQrUrl}</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  async function copySelectedAssetQrLink() {
    if (!selectedAssetQrUrl) return;

    if (!navigator.clipboard?.writeText) {
      setMessage("Clipboard access is not available in this browser.");
      return;
    }

    try {
      await navigator.clipboard.writeText(selectedAssetQrUrl);
      setMessage("Asset field access link copied.");
    } catch {
      setMessage("Could not copy asset link.");
    }
  }

  function removeCalibrationRecord(id: string) {
    if (!requireEditAccess("change asset calibration references")) return;

    setQualityDraft((prev) => ({
      ...prev,
      calibration_records: prev.calibration_records.filter((record) => record.id !== id),
    }));
  }

  function removeInspectionRecord(id: string) {
    if (!requireEditAccess("change asset inspection references")) return;

    setQualityDraft((prev) => ({
      ...prev,
      inspection_records: prev.inspection_records.filter((record) => record.id !== id),
    }));
  }

  async function saveQualitySection() {
    if (!selectedAsset) {
      setMessage("Select an asset first.");
      return;
    }

    if (!requireEditAccess("save asset quality details")) return;

    const asset = selectedAsset;
    setIsSavingQuality(true);

    try {
      const { error: qualityError } = await supabase
        .from("asset_quality")
        .upsert(
          {
            asset_id: asset.id,
            quality_notes: qualityDraft.quality_notes.trim() || null,
            last_quality_review: qualityDraft.last_quality_review || null,
          },
          {
            onConflict: "asset_id",
          }
        );

      if (qualityError) {
        throw new Error(qualityError.message);
      }

      const { error: deleteNcrError } = await supabase
        .from("asset_ncr_links")
        .delete()
        .eq("asset_id", asset.id);

      if (deleteNcrError) {
        throw new Error(deleteNcrError.message);
      }

      if (qualityDraft.linked_ncrs.length > 0) {
        const { error: insertNcrError } = await supabase.from("asset_ncr_links").insert(
          qualityDraft.linked_ncrs.map((reference) => ({
            asset_id: asset.id,
            ncr_reference: reference,
          }))
        );

        if (insertNcrError) {
          throw new Error(insertNcrError.message);
        }
      }

      const { error: deleteActionError } = await supabase
        .from("asset_action_links")
        .delete()
        .eq("asset_id", asset.id);

      if (deleteActionError) {
        throw new Error(deleteActionError.message);
      }

      if (qualityDraft.linked_actions.length > 0) {
        const { error: insertActionError } = await supabase.from("asset_action_links").insert(
          qualityDraft.linked_actions.map((reference) => ({
            asset_id: asset.id,
            action_reference: reference,
          }))
        );

        if (insertActionError) {
          throw new Error(insertActionError.message);
        }
      }

      const existingQuality = qualityByAssetId[asset.id] || createDefaultQualityRecord();

      const existingCalibrationPaths = existingQuality.calibration_records
        .map((record) => record.file_path)
        .filter(Boolean);

      const existingInspectionPaths = existingQuality.inspection_records
        .map((record) => record.file_path)
        .filter(Boolean);

      const nextCalibrationPaths = qualityDraft.calibration_records
        .map((record) => record.file_path)
        .filter(Boolean);

      const nextInspectionPaths = qualityDraft.inspection_records
        .map((record) => record.file_path)
        .filter(Boolean);

      const calibrationPathsToRemove = existingCalibrationPaths.filter(
        (path) => !nextCalibrationPaths.includes(path)
      );

      const inspectionPathsToRemove = existingInspectionPaths.filter(
        (path) => !nextInspectionPaths.includes(path)
      );

      const { error: deleteCalError } = await supabase
        .from("asset_calibration_records")
        .delete()
        .eq("asset_id", asset.id);

      if (deleteCalError) {
        throw new Error(deleteCalError.message);
      }

      const { error: deleteCalFilesError } = await supabase
        .from("asset_files")
        .delete()
        .eq("asset_id", asset.id)
        .eq("file_type", "calibration");

      if (deleteCalFilesError) {
        throw new Error(deleteCalFilesError.message);
      }

      if (qualityDraft.calibration_records.length > 0) {
        const calibrationRows = qualityDraft.calibration_records.map((record) => ({
          asset_id: asset.id,
          reference: record.reference || "Unreferenced",
          file_name: record.file_name || null,
          file_path: record.file_path || null,
          notes: record.notes || null,
          uploaded_at: record.uploaded_at || null,
        }));

        const { error: insertCalError } = await supabase
          .from("asset_calibration_records")
          .insert(calibrationRows);

        if (insertCalError) {
          throw new Error(insertCalError.message);
        }

        const calibrationFileRows = qualityDraft.calibration_records
          .filter((record) => record.file_path && record.file_name)
          .map((record) => ({
            asset_id: asset.id,
            file_type: "calibration",
            reference: record.reference || null,
            file_name: record.file_name,
            file_path: record.file_path,
            file_size: record.file_size || null,
            uploaded_at: record.uploaded_at || new Date().toISOString(),
          }));

        if (calibrationFileRows.length > 0) {
          const { error: insertCalFileError } = await supabase
            .from("asset_files")
            .insert(calibrationFileRows);

          if (insertCalFileError) {
            throw new Error(insertCalFileError.message);
          }
        }
      }

      const { error: deleteInspError } = await supabase
        .from("asset_inspection_records")
        .delete()
        .eq("asset_id", asset.id);

      if (deleteInspError) {
        throw new Error(deleteInspError.message);
      }

      const { error: deleteInspFilesError } = await supabase
        .from("asset_files")
        .delete()
        .eq("asset_id", asset.id)
        .eq("file_type", "inspection");

      if (deleteInspFilesError) {
        throw new Error(deleteInspFilesError.message);
      }

      if (qualityDraft.inspection_records.length > 0) {
        const inspectionRows = qualityDraft.inspection_records.map((record) => ({
          asset_id: asset.id,
          reference: record.reference || "Unreferenced",
          file_name: record.file_name || null,
          file_path: record.file_path || null,
          notes: record.notes || null,
          uploaded_at: record.uploaded_at || null,
        }));

        const { error: insertInspError } = await supabase
          .from("asset_inspection_records")
          .insert(inspectionRows);

        if (insertInspError) {
          throw new Error(insertInspError.message);
        }

        const inspectionFileRows = qualityDraft.inspection_records
          .filter((record) => record.file_path && record.file_name)
          .map((record) => ({
            asset_id: asset.id,
            file_type: "inspection",
            reference: record.reference || null,
            file_name: record.file_name,
            file_path: record.file_path,
            file_size: record.file_size || null,
            uploaded_at: record.uploaded_at || new Date().toISOString(),
          }));

        if (inspectionFileRows.length > 0) {
          const { error: insertInspFileError } = await supabase
            .from("asset_files")
            .insert(inspectionFileRows);

          if (insertInspFileError) {
            throw new Error(insertInspFileError.message);
          }
        }
      }

      const storageRemovals = [...calibrationPathsToRemove, ...inspectionPathsToRemove];

      if (storageRemovals.length > 0) {
        await supabase.storage.from(STORAGE_BUCKET).remove(storageRemovals);
      }

      await loadQualityData(assets.map((assetItem) => assetItem.id));
      setMessage("Asset quality section updated.");
    } catch (error) {
      const err = error as Error;
      setMessage(`Save quality failed: ${err.message}`);
    } finally {
      setIsSavingQuality(false);
    }
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("");
    setLocationFilter("");
    setOwnerFilter("");
    setQualityLinkedFilter(false);
  }

  function applyAssetKpiFilter(next: { status?: string; qualityLinked?: boolean }) {
    setActiveView("register");
    setShowRegisterFilters(true);
    setSearch("");
    setLocationFilter("");
    setOwnerFilter("");
    setStatusFilter(next.status || "");
    setQualityLinkedFilter(Boolean(next.qualityLinked));
  }

  return (
    <main>
      <QualityPageHero
        label="ASSET MANAGEMENT"
        title="Assets"
        description="Operational asset register with a dedicated master-data and quality workspace, image upload, and direct linking to NCRs, actions, calibrations and inspections."
        contextCards={[
          { label: "Last Refreshed", value: lastRefreshed || "-" },
          { label: "Latest Asset", value: latestAssetLabel },
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

      <ImsTabs<AssetWorkspaceView>
        tabs={[
          { value: "dashboard", label: "Dashboard" },
          { value: "register", label: "Asset Register" },
          { value: "create", label: "Create Asset" },
          { value: "reports", label: "Reports" },
        ]}
        active={activeView}
        onChange={setActiveView}
        ariaLabel="Asset workspace views"
      />

      {activeView === "dashboard" ? (
        <>
          <section style={dashboardKpiGridStyle}>
            <QualityKpiCard
              title="Total Assets"
              value={totalAssets}
              accent="#005670"
              onClick={() => applyAssetKpiFilter({})}
            />
            <QualityKpiCard
              title="Active Assets"
              value={activeAssets}
              accent="#005670"
              onClick={() => applyAssetKpiFilter({ status: "Active" })}
            />
            <QualityKpiCard
              title="Under Maintenance"
              value={underMaintenanceAssets}
              accent="#d97706"
              onClick={() => applyAssetKpiFilter({ status: "Under Maintenance" })}
            />
            <QualityKpiCard
              title="Quality Linked"
              value={qualityLinkedAssets}
              accent="#63B1BC"
              onClick={() => applyAssetKpiFilter({ qualityLinked: true })}
            />
            <QualityKpiCard
              title="Action Needed"
              value={overdueInspectionAssets + overdueMaintenanceAssets}
              accent="#F93822"
              onClick={() => {
                setActiveView("dashboard");
                setTimeout(() => {
                  document.getElementById("asset-workload-panel")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }, 80);
              }}
            />
          </section>

          <section style={dashboardPanelGridStyle}>
            <ImsPanel
              title="Due Watch"
              subtitle="Inspection and maintenance pressure across the live register."
            >
              <div id="asset-workload-panel" style={dashboardMetricGridStyle}>
                <DashboardMetricCard
                  label="Inspection Overdue"
                  value={overdueInspectionAssets}
                  hint={`${dueSoonInspectionAssets} due soon`}
                  tone="#F93822"
                  bg="#fff1f2"
                />
                <DashboardMetricCard
                  label="Inspection Due Soon"
                  value={dueSoonInspectionAssets}
                  hint="Next 30 days"
                  tone="#92400e"
                  bg="#fffbeb"
                />
                <DashboardMetricCard
                  label="Maintenance Overdue"
                  value={overdueMaintenanceAssets}
                  hint={`${dueSoonMaintenanceAssets} due soon`}
                  tone="#F93822"
                  bg="#fff1f2"
                />
                <DashboardMetricCard
                  label="Maintenance Due Soon"
                  value={dueSoonMaintenanceAssets}
                  hint="Next 30 days"
                  tone="#92400e"
                  bg="#fffbeb"
                />
              </div>
            </ImsPanel>

            <ImsPanel
              title="Quality Links"
              subtitle="How strongly asset records are connected to controlled IMS evidence."
            >
              <div style={dashboardMetricGridStyle}>
                <DashboardMetricCard
                  label="Linked NCRs"
                  value={qualitySnapshotData.find((item) => item.name === "NCRs")?.value || 0}
                  hint="Quality records"
                  tone="#F93822"
                  bg="#fff1f2"
                />
                <DashboardMetricCard
                  label="Linked Actions"
                  value={qualitySnapshotData.find((item) => item.name === "Actions")?.value || 0}
                  hint="Central action links"
                  tone="#1d4ed8"
                  bg="#eff6ff"
                />
                <DashboardMetricCard
                  label="Calibration Links"
                  value={qualitySnapshotData.find((item) => item.name === "Calibration")?.value || 0}
                  hint="Calibration evidence"
                  tone="#92400e"
                  bg="#fffbeb"
                />
                <DashboardMetricCard
                  label="Inspection Links"
                  value={qualitySnapshotData.find((item) => item.name === "Inspection")?.value || 0}
                  hint="Inspection evidence"
                  tone="#166534"
                  bg="#f0fdf4"
                />
              </div>
            </ImsPanel>

            <ImsPanel
              title="Register Health"
              subtitle="Master-data coverage and current asset status at a glance."
            >
              <div style={dashboardMetricGridStyle}>
                <DashboardMetricCard
                  label="With Images"
                  value={assetsWithImages}
                  hint="Image/file references"
                  tone="#005670"
                  bg="#ECECE7"
                />
                <DashboardMetricCard
                  label="Inactive"
                  value={inactiveAssets}
                  hint="Inactive or parked"
                  tone="#475569"
                  bg="#f8fafc"
                />
                <DashboardMetricCard
                  label="Active Share"
                  value={totalAssets > 0 ? Math.round((activeAssets / totalAssets) * 100) : 0}
                  suffix="%"
                  hint="Active assets"
                  tone="#166534"
                  bg="#f0fdf4"
                />
                <DashboardMetricCard
                  label="Quality Coverage"
                  value={totalAssets > 0 ? Math.round((qualityLinkedAssets / totalAssets) * 100) : 0}
                  suffix="%"
                  hint="Linked assets"
                  tone="#1d4ed8"
                  bg="#eff6ff"
                />
              </div>
            </ImsPanel>
          </section>
        </>
      ) : null}

      {activeView === "create" ? (
      <section style={fullWidthSectionStyle}>
        <SectionCard
          title="Add Asset"
          subtitle="Create one asset record directly into the live register without leaving the module workspace."
        >
          <form onSubmit={addAsset}>
            <div style={formGridStyle}>
              <Field label="Category">
                <input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  style={inputStyle}
                  placeholder="Asset category"
                />
              </Field>

              <Field label="Subcategory">
                <input
                  value={form.subcategory}
                  onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
                  style={inputStyle}
                  placeholder="Asset subcategory"
                />
              </Field>

              <Field label="Name">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={inputStyle}
                  placeholder="Asset name"
                />
              </Field>

              <Field label="Document ID Code">
                <input
                  value={form.document_id_code}
                  onChange={(e) => setForm({ ...form, document_id_code: e.target.value })}
                  style={inputStyle}
                  placeholder="e.g. 1100, C4, RG"
                />
              </Field>

              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as AssetStatus })}
                  style={inputStyle}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Quarantine">Quarantine</option>
                  <option value="Under Maintenance">Under Maintenance</option>
                </select>
              </Field>

              <Field label="Description">
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  style={inputStyle}
                  placeholder="Description"
                />
              </Field>

              <Field label="Manufacturer">
                <input
                  value={form.manufacturer}
                  onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                  style={inputStyle}
                  placeholder="Manufacturer"
                />
              </Field>

              <Field label="Model">
                <input
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  style={inputStyle}
                  placeholder="Model"
                />
              </Field>

              <Field label="Serial Number">
                <input
                  value={form.serial_number}
                  onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
                  style={inputStyle}
                  placeholder="Serial number"
                />
              </Field>

              <Field label="Condition">
                <input
                  value={form.condition}
                  onChange={(e) => setForm({ ...form, condition: e.target.value })}
                  style={inputStyle}
                  placeholder="Condition"
                />
              </Field>

              <Field label="Responsible Person">
                <input
                  value={form.owner}
                  onChange={(e) => setForm({ ...form, owner: e.target.value })}
                  style={inputStyle}
                  placeholder="Responsible person"
                />
              </Field>

              <Field label="Location">
                <input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  style={inputStyle}
                  placeholder="Location"
                />
              </Field>

              <Field label="Purchase Date">
                <input
                  type="date"
                  value={form.purchase_date}
                  onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
                  style={inputStyle}
                />
              </Field>

              <Field label="Maintenance Due Date">
                <input
                  type="date"
                  value={form.maintenance_due_date}
                  onChange={(e) => setForm({ ...form, maintenance_due_date: e.target.value })}
                  style={inputStyle}
                />
              </Field>

              <Field label="Inspection Due Date">
                <input
                  type="date"
                  value={form.inspection_due_date}
                  onChange={(e) => setForm({ ...form, inspection_due_date: e.target.value })}
                  style={inputStyle}
                />
              </Field>
            </div>

            <div style={buttonRowStyle}>
              <button type="submit" style={primaryButtonStyle}>
                Add Asset
              </button>
            </div>
          </form>
        </SectionCard>
      </section>
      ) : null}

      {activeView === "register" ? (
      <section style={fullWidthSectionStyle}>
        <ImsPanel
          title="Asset Register"
          subtitle="Click any row to open the selected asset workspace underneath, with full-width space for editing, files, links, and history."
        >
          <ImsFilterPanel
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search asset code, name, category, serial, location, or responsible person"
            showFilters={showRegisterFilters}
            onToggleFilters={() => setShowRegisterFilters((current) => !current)}
            actions={
              <ImsButton variant="secondary" onClick={clearFilters}>
                Clear Filters
              </ImsButton>
            }
          >
            <Field label="Status">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={imsInputStyle}
              >
                <option value="">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Quarantine">Quarantine</option>
                <option value="Under Maintenance">Under Maintenance</option>
              </select>
            </Field>

            <Field label="Location">
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                style={imsInputStyle}
              >
                <option value="">All Locations</option>
                {uniqueLocations.map((location) => (
                  <option key={String(location)} value={String(location)}>
                    {String(location)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Responsible Person">
              <select
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                style={imsInputStyle}
              >
                <option value="">All Responsible Persons</option>
                {uniqueOwners.map((owner) => (
                  <option key={String(owner)} value={String(owner)}>
                    {String(owner)}
                  </option>
                ))}
              </select>
            </Field>
          </ImsFilterPanel>

          <div style={imsTableInfoRowStyle}>
            <span>
              Showing <strong>{filteredAssets.length}</strong> of <strong>{assets.length}</strong> assets
            </span>
            {selectedAsset ? (
              <ImsButton
                variant="secondary"
                onClick={() => setIsDetailPanelOpen((current) => !current)}
              >
                {isDetailPanelOpen ? "Hide Panel" : "Open Panel"}
              </ImsButton>
            ) : null}
          </div>

          <div style={compactTableWrapStyle}>
            <table style={{ ...imsTableStyle, minWidth: 1080 }}>
              <thead>
                <tr>
                  <th style={imsTableHeadStyle}>Asset No. / Code</th>
                  <th style={imsTableHeadStyle}>Name / Title</th>
                  <th style={imsTableHeadStyle}>Category</th>
                  <th style={imsTableHeadStyle}>Condition</th>
                  <th style={imsTableHeadStyle}>Responsible Person</th>
                  <th style={imsTableHeadStyle}>Location</th>
                  <th style={imsTableHeadStyle}>Inspection Due</th>
                  <th style={imsTableHeadStyle}>Maintenance Due</th>
                </tr>
              </thead>
              <tbody>
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={8} style={emptyTableCellStyle}>No assets match the current filters.</td>
                </tr>
              ) : (
                filteredAssets.map((asset) => (
                  <tr
                    key={asset.id}
                    onClick={() => {
                      setSelectedAssetId(asset.id);
                      setIsDetailPanelOpen(true);
                      setTimeout(() => {
                        detailPanelRef.current?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                      }, 80);
                    }}
                    style={{
                      ...registerTableRowStyle,
                      background: selectedAssetId === asset.id ? "#eff6ff" : "#ffffff",
                      boxShadow: selectedAssetId === asset.id ? "inset 4px 0 0 #005670" : "inset 4px 0 0 transparent",
                    }}
                  >
                    <td style={{ ...imsTableCellStyle, fontWeight: 900, color: "#005670" }}>{asset.asset_code || "-"}</td>
                    <td style={imsTableCellStyle}>
                      <strong>{asset.name || "-"}</strong>
                      <div style={tableSubTextStyle}>{asset.description || "No description recorded"}</div>
                    </td>
                    <td style={imsTableCellStyle}>{asset.category || "-"}</td>
                    <td style={imsTableCellStyle}>
                      {asset.condition ? (
                        <span
                          style={{
                            ...badgeStyle,
                            background: getConditionTone(asset.condition).bg,
                            color: getConditionTone(asset.condition).color,
                          }}
                        >
                          {asset.condition}
                        </span>
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                    <td style={imsTableCellStyle}>{asset.owner || "-"}</td>
                    <td style={imsTableCellStyle}>{asset.location || "-"}</td>
                    <td style={imsTableCellStyle}>{formatDate(asset.inspection_due_date)}</td>
                    <td style={imsTableCellStyle}>{formatDate(asset.maintenance_due_date)}</td>
                  </tr>
                ))
              )}
              </tbody>
            </table>
          </div>
        </ImsPanel>
      </section>
      ) : null}

      {activeView === "register" && isDetailPanelOpen ? (
        <section ref={detailPanelRef} style={detailPanelSectionStyle}>
          <SectionCard
            title="Asset Detail"
            subtitle="Selected asset workspace with grouped master data, files, quality links, and live inspection or maintenance history."
          >
            {!selectedAsset ? (
              <div style={emptyDetailStyle}>Select an asset from the register to open it here.</div>
            ) : (
              <div style={detailWorkspaceStyle}>
              <div style={detailSectionStyle}>
                <ModuleSectionHeader title="Asset Identity / Status" />

                <div style={detailTopBarStyle}>
                  <div>
                    <div style={detailEyebrowStyle}>Asset Detail</div>
                    <h3 style={detailTitleStyle}>{selectedAsset.name || "Unnamed asset"}</h3>
                  </div>

                  <div style={detailBadgeRowStyle}>
                    <span
                      style={{
                        ...badgeStyle,
                        background: getStatusTone(selectedAsset.status || "Unknown").bg,
                        color: getStatusTone(selectedAsset.status || "Unknown").color,
                      }}
                    >
                      {selectedAsset.status || "Unknown"}
                    </span>
                    {detailForm.condition ? (
                      <span
                        style={{
                          ...badgeStyle,
                          background: getConditionTone(detailForm.condition).bg,
                          color: getConditionTone(detailForm.condition).color,
                        }}
                      >
                        {detailForm.condition}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div style={assetSummaryStripStyle}>
                  <SummaryPill label="Asset Code" value={selectedAsset.asset_code || "-"} />
                  <SummaryPill label="Document ID Code" value={detailForm.document_id_code || "-"} />
                  <SummaryPill label="Category" value={detailForm.category || "-"} />
                  <SummaryPill label="Responsible" value={detailForm.owner || "-"} />
                  <SummaryPill label="Location" value={detailForm.location || "-"} />
                  <SummaryPill
                    label="Inspection Due"
                    value={formatDate(detailForm.inspection_due_date)}
                    tone={getDueWindowTone(getDaysUntil(detailForm.inspection_due_date))}
                  />
                  <SummaryPill
                    label="Maintenance Due"
                    value={formatDate(detailForm.maintenance_due_date)}
                    tone={getDueWindowTone(getDaysUntil(detailForm.maintenance_due_date))}
                  />
                </div>
              </div>

              <div style={detailSectionStyle}>
                <ModuleSectionHeader title="Files / Image" />

                <div style={imageStripStyle}>
                <div style={imagePreviewWrapStyle}>
                  {selectedImageUrl ? (
                    <img
                      src={selectedImageUrl}
                      alt={selectedQuality.image_name || "Asset"}
                      style={imagePreviewStyle}
                    />
                  ) : (
                    <div style={imagePlaceholderStyle}>No image uploaded</div>
                  )}
                </div>

                <div style={imageMetaWrapStyle}>
                  <div style={imageMetaTitleStyle}>Asset image</div>
                  <div style={imageMetaFileStyle}>{selectedQuality.image_name || "Not set"}</div>
                  <div style={imageMetaSubStyle}>
                    {selectedQuality.image_name
                      ? `${formatFileSize(selectedQuality.image_size)} • Uploaded ${formatDateTime(
                          selectedQuality.image_uploaded_at
                        )}`
                      : "Upload a visual reference for the asset."}
                  </div>

                  <div style={buttonRowStyle}>
                    <label style={{ ...uploadButtonStyle, opacity: isUploadingImage ? 0.7 : 1 }}>
                      {isUploadingImage ? "Uploading..." : "Upload image"}
                      <input
                        type="file"
                        accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.bmp"
                        onChange={handleImageUpload}
                        style={{ display: "none" }}
                        disabled={isUploadingImage}
                      />
                    </label>

                    {selectedQuality.image_path ? (
                      <button
                        type="button"
                        onClick={() => void openStoredFile(selectedQuality.image_path)}
                        style={reportLinkButtonStyle}
                      >
                        Open image
                      </button>
                    ) : null}

                    {selectedQuality.image_name ? (
                      <button type="button" style={secondaryButtonStyle} onClick={removeImage}>
                        Remove image
                      </button>
                    ) : null}
                  </div>
                </div>
                </div>
              </div>

              <div style={detailSectionStyle}>
                <ModuleSectionHeader title="Asset QR / Field Access" />

                <div style={detailSectionIntroStyle}>
                  Scan this QR code to open the mobile field page for this asset.
                </div>

                <div style={quickActionRowStyle}>
                  <button
                    type="button"
                    style={secondaryButtonStyle}
                    onClick={() => setShowQrCard((current) => !current)}
                  >
                    {showQrCard ? "Hide QR Code" : "Generate / View QR Code"}
                  </button>
                  <Link
                    href={`/assets/inspection?asset=${encodeURIComponent(selectedAssetRouteValue)}`}
                    style={reportLinkButtonStyle}
                  >
                    Start Inspection
                  </Link>
                  <Link
                    href={`/assets/maintenance?asset=${encodeURIComponent(selectedAssetRouteValue)}`}
                    style={reportLinkButtonStyle}
                  >
                    Start Maintenance
                  </Link>
                  <Link
                    href={`/assets/calibration?asset=${encodeURIComponent(selectedAssetRouteValue)}`}
                    style={reportLinkButtonStyle}
                  >
                    View Calibration
                  </Link>
                  <Link href={selectedAssetActionUrl} style={reportLinkButtonStyle}>
                    Raise Action
                  </Link>
                </div>

                {showQrCard ? (
                  <div style={qrCardStyle}>
                    <div style={qrPreviewWrapStyle}>
                      {selectedAssetQrDataUrl ? (
                        <img
                          src={selectedAssetQrDataUrl}
                          alt={`${selectedAsset.asset_code || selectedAsset.name || "Asset"} QR code`}
                          style={qrImageStyle}
                        />
                      ) : (
                        <div style={qrLoadingStyle}>Generating QR code...</div>
                      )}
                    </div>

                    <div style={qrDetailsStyle}>
                      <div style={qrCardTitleStyle}>Asset QR Code</div>
                      <div style={qrCardMetaStyle}>
                        Scanning opens the live asset field page so field users can continue straight into
                        inspection, maintenance, calibration, or linked action workflows.
                      </div>
                      <div style={qrTargetLabelStyle}>Encoded URL</div>
                      <div style={qrTargetValueStyle}>{selectedAssetQrUrl}</div>

                      <div style={buttonRowStyle}>
                        {selectedAssetQrDataUrl ? (
                          <a
                            href={selectedAssetQrDataUrl}
                            download={`${selectedAsset.asset_code || selectedAsset.id}-qr.png`}
                            style={reportLinkButtonStyle}
                          >
                            Download QR
                          </a>
                        ) : null}
                        {selectedAssetQrDataUrl ? (
                          <button
                            type="button"
                            style={secondaryButtonStyle}
                            onClick={printSelectedAssetQrCode}
                          >
                            Print QR
                          </button>
                        ) : null}
                        <button type="button" style={secondaryButtonStyle} onClick={() => void copySelectedAssetQrLink()}>
                          Copy Link
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div style={detailSectionStyle}>
                <ModuleSectionHeader title="Master Data" />

                <div style={detailFormGridStyle}>
                  <Field label="Asset Code">
                    <input value={selectedAsset.asset_code || "-"} style={readonlyInputStyle} readOnly />
                  </Field>

                  <Field label="Name">
                    <input
                      value={detailForm.name}
                      onChange={(e) => setDetailForm({ ...detailForm, name: e.target.value })}
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Document ID Code">
                    <input
                      value={detailForm.document_id_code}
                      onChange={(e) => setDetailForm({ ...detailForm, document_id_code: e.target.value })}
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Status">
                    <select
                      value={detailForm.status}
                      onChange={(e) => setDetailForm({ ...detailForm, status: e.target.value as AssetStatus })}
                      style={inputStyle}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Quarantine">Quarantine</option>
                      <option value="Under Maintenance">Under Maintenance</option>
                    </select>
                  </Field>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <Field label="Description">
                      <textarea
                        value={detailForm.description}
                        onChange={(e) => setDetailForm({ ...detailForm, description: e.target.value })}
                        style={textareaStyle}
                        rows={4}
                      />
                    </Field>
                  </div>

                  <Field label="Category">
                    <input
                      value={detailForm.category}
                      onChange={(e) => setDetailForm({ ...detailForm, category: e.target.value })}
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Subcategory">
                    <input
                      value={detailForm.subcategory}
                      onChange={(e) => setDetailForm({ ...detailForm, subcategory: e.target.value })}
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Manufacturer">
                    <input
                      value={detailForm.manufacturer}
                      onChange={(e) => setDetailForm({ ...detailForm, manufacturer: e.target.value })}
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Model">
                    <input
                      value={detailForm.model}
                      onChange={(e) => setDetailForm({ ...detailForm, model: e.target.value })}
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Serial Number">
                    <input
                      value={detailForm.serial_number}
                      onChange={(e) => setDetailForm({ ...detailForm, serial_number: e.target.value })}
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Condition">
                    <input
                      value={detailForm.condition}
                      onChange={(e) => setDetailForm({ ...detailForm, condition: e.target.value })}
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Responsible Person">
                    <input
                      value={detailForm.owner}
                      onChange={(e) => setDetailForm({ ...detailForm, owner: e.target.value })}
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Location">
                    <input
                      value={detailForm.location}
                      onChange={(e) => setDetailForm({ ...detailForm, location: e.target.value })}
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Purchase Date">
                    <input
                      type="date"
                      value={detailForm.purchase_date}
                      onChange={(e) => setDetailForm({ ...detailForm, purchase_date: e.target.value })}
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Maintenance Due Date">
                    <input
                      type="date"
                      value={detailForm.maintenance_due_date}
                      onChange={(e) =>
                        setDetailForm({ ...detailForm, maintenance_due_date: e.target.value })
                      }
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Inspection Due Date">
                    <input
                      type="date"
                      value={detailForm.inspection_due_date}
                      onChange={(e) =>
                        setDetailForm({ ...detailForm, inspection_due_date: e.target.value })
                      }
                      style={inputStyle}
                    />
                  </Field>
                </div>

                <div style={buttonRowStyle}>
                  <button type="button" style={primaryButtonStyle} onClick={saveAssetDetail}>
                    Save Asset Changes
                  </button>
                  <button type="button" style={dangerButtonStyle} onClick={deleteSelectedAsset}>
                    Delete Asset
                  </button>
                </div>
              </div>

              <div style={detailSectionStyle}>
                <ModuleSectionHeader title="Inspection / Maintenance History" />

                <div style={detailSectionIntroStyle}>
                  Use the dedicated mobile logs to add live field records, then review the saved history here against
                  the selected asset.
                </div>

                <div style={historyWorkspaceGridStyle}>
                  <div style={historyPanelStyle}>
                    <div style={recordsHeaderStyle}>
                      <div style={recordsTitleStyle}>Inspection History</div>
                      <span style={historyCountStyle}>{selectedInspectionHistory.length} records</span>
                    </div>

                    {selectedInspectionHistory.length === 0 ? (
                      <div style={emptyRecordStyle}>No inspection history logged for this asset yet.</div>
                    ) : (
                      <div style={recordsListStyle}>
                        {selectedInspectionHistory.slice(0, 6).map((record) => (
                          <div key={record.id} style={historyRecordCardStyle}>
                            <div style={historyRecordHeaderStyle}>
                              <div>
                                <div style={historyRecordTitleStyle}>
                                  {record.result || record.reference || "Inspection record"}
                                </div>
                                <div style={historyRecordMetaStyle}>
                                  {formatDate(record.inspection_date)} • {record.inspector || "Inspector not set"}
                                </div>
                              </div>
                              <span
                                style={{
                                  ...badgeStyle,
                                  background: getInspectionResultTone(record.result || "").bg,
                                  color: getInspectionResultTone(record.result || "").color,
                                }}
                              >
                                {record.result || "Not set"}
                              </span>
                            </div>

                            <div style={historyInfoGridStyle}>
                              <span>
                                <strong>Next Due:</strong> {formatDate(record.next_inspection_due)}
                              </span>
                              <span>
                                <strong>Logged:</strong>{" "}
                                {(() => {
                                  const loggedAt = record.created_at || record.uploaded_at;
                                  return loggedAt ? formatDateTime(loggedAt) : "-";
                                })()}
                              </span>
                            </div>

                            <div style={historyBodyTextStyle}>
                              <strong>Findings:</strong> {record.findings || record.notes || "-"}
                            </div>
                            <div style={historyBodyTextStyle}>
                              <strong>Actions Required:</strong> {record.actions_required || "-"}
                            </div>

                            <div style={buttonRowStyle}>
                              {record.file_path ? (
                                <button
                                  type="button"
                                  style={reportLinkButtonStyle}
                                  onClick={() => void openStoredFile(record.file_path || "")}
                                >
                                  Open file
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={historyPanelStyle}>
                    <div style={recordsHeaderStyle}>
                      <div style={recordsTitleStyle}>Maintenance History</div>
                      <span style={historyCountStyle}>{selectedMaintenanceHistory.length} records</span>
                    </div>

                    {selectedMaintenanceHistory.length === 0 ? (
                      <div style={emptyRecordStyle}>No maintenance history logged for this asset yet.</div>
                    ) : (
                      <div style={recordsListStyle}>
                        {selectedMaintenanceHistory.slice(0, 6).map((record) => (
                          <div key={record.id} style={historyRecordCardStyle}>
                            <div style={historyRecordHeaderStyle}>
                              <div>
                                <div style={historyRecordTitleStyle}>
                                  {record.maintenance_type || "Maintenance record"}
                                </div>
                                <div style={historyRecordMetaStyle}>
                                  {formatDate(record.maintenance_date)} • {record.carried_out_by || "Responsible person not set"}
                                </div>
                              </div>
                              <span
                                style={{
                                  ...badgeStyle,
                                  background: getMaintenanceTypeTone(record.maintenance_type || "").bg,
                                  color: getMaintenanceTypeTone(record.maintenance_type || "").color,
                                }}
                              >
                                {record.maintenance_type || "Not set"}
                              </span>
                            </div>

                            <div style={historyInfoGridStyle}>
                              <span>
                                <strong>Next Due:</strong> {formatDate(record.next_maintenance_due)}
                              </span>
                              <span>
                                <strong>Logged:</strong> {record.created_at ? formatDateTime(record.created_at) : "-"}
                              </span>
                            </div>

                            <div style={historyBodyTextStyle}>
                              <strong>Description:</strong> {record.description || "-"}
                            </div>

                            <div style={buttonRowStyle}>
                              {record.file_path ? (
                                <button
                                  type="button"
                                  style={reportLinkButtonStyle}
                                  onClick={() => void openStoredFile(record.file_path || "")}
                                >
                                  Open file
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={detailSectionStyle}>
                <ModuleSectionHeader title="Asset History Timeline" />

                <div style={detailSectionIntroStyle}>
                  Combined operational history for this asset across files, calibration, inspection, maintenance,
                  and linked actions.
                </div>

                {selectedTimelineEntries.length === 0 ? (
                  <div style={emptyRecordStyle}>No asset history records available yet.</div>
                ) : (
                  <div style={timelineListStyle}>
                    {selectedTimelineEntries.map((entry) => (
                      <div key={entry.id} style={timelineCardStyle}>
                        <div style={timelineHeaderStyle}>
                          <div style={timelineTitleWrapStyle}>
                            <span
                              style={{
                                ...badgeStyle,
                                background: getTimelineTypeTone(entry.type).bg,
                                color: getTimelineTypeTone(entry.type).color,
                              }}
                            >
                              {entry.type}
                            </span>
                            <div>
                              <div style={timelineTitleStyle}>{entry.title || "-"}</div>
                              <div style={timelineMetaStyle}>{entry.date ? formatDateTime(entry.date) : "-"}</div>
                            </div>
                          </div>

                          {entry.status ? <span style={timelineStatusStyle}>{entry.status}</span> : null}
                        </div>

                        <div style={timelineDescriptionStyle}>{entry.description || "-"}</div>

                        {entry.file_path ? (
                          <div style={buttonRowStyle}>
                            <button
                              type="button"
                              style={reportLinkButtonStyle}
                              onClick={() => void openStoredFile(entry.file_path || "")}
                            >
                              {entry.file_label || "Open file"}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={detailSectionStyle}>
                <ModuleSectionHeader title="Quality Links" />

                <div style={qualityMiniGridStyle}>
                  <MiniMetricCard label="NCRs" value={qualityDraft.linked_ncrs.length} tone="#F93822" bg="#fee2e2" />
                  <MiniMetricCard label="Actions" value={qualityDraft.linked_actions.length} tone="#1d4ed8" bg="#dbeafe" />
                  <MiniMetricCard
                    label="Calibration"
                    value={qualityDraft.calibration_records.length}
                    tone="#92400e"
                    bg="#fef3c7"
                  />
                  <MiniMetricCard
                    label="Inspection"
                    value={qualityDraft.inspection_records.length}
                    tone="#166534"
                    bg="#dcfce7"
                  />
                </div>

                <div style={linkPickerGridStyle}>
                  <Field label="Add Linked NCR">
                    <div style={pickerRowStyle}>
                      <select
                        value={qualityDraft.selectedNcrToAdd}
                        onChange={(e) => setQualityDraft({ ...qualityDraft, selectedNcrToAdd: e.target.value })}
                        style={inputStyle}
                      >
                        <option value="">Select NCR</option>
                        {ncrOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <button type="button" style={secondaryButtonStyle} onClick={addLinkedNcr}>
                        + Add
                      </button>
                    </div>
                  </Field>

                  <Field label="Add Linked Action">
                    <div style={pickerRowStyle}>
                      <select
                        value={qualityDraft.selectedActionToAdd}
                        onChange={(e) => setQualityDraft({ ...qualityDraft, selectedActionToAdd: e.target.value })}
                        style={inputStyle}
                      >
                        <option value="">Select Action</option>
                        {actionOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <button type="button" style={secondaryButtonStyle} onClick={addLinkedAction}>
                        + Add
                      </button>
                    </div>
                  </Field>
                </div>

                <div style={linkedBlocksGridStyle}>
                  <EditableLinkGroup
                    title="Linked NCRs"
                    items={qualityDraft.linked_ncrs}
                    hrefBuilder={(item) => `/ncr-capa?search=${encodeURIComponent(item)}`}
                    onRemove={removeLinkedNcr}
                  />
                  <EditableLinkGroup
                    title="Linked Actions"
                    items={qualityDraft.linked_actions}
                    hrefBuilder={(item) => `/actions?search=${encodeURIComponent(item)}`}
                    onRemove={removeLinkedAction}
                  />
                </div>

                <div style={detailSubsectionTitleStyle}>Calibration / Inspection References</div>

                <div style={recordsSectionStyle}>
                  <div style={recordsHeaderStyle}>
                    <div style={recordsTitleStyle}>Calibration Records</div>
                    <button type="button" style={secondaryButtonStyle} onClick={addCalibrationRecord}>
                      + Add Calibration Record
                    </button>
                  </div>

                  {qualityDraft.calibration_records.length === 0 ? (
                    <div style={emptyRecordStyle}>No calibration records added.</div>
                  ) : (
                    <div style={recordsListStyle}>
                      {qualityDraft.calibration_records.map((record) => (
                        <div key={record.id} style={recordCardStyle}>
                          <div style={recordGridStyle}>
                            <Field label="Reference">
                              <input
                                value={record.reference}
                                onChange={(e) => updateCalibrationField(record.id, "reference", e.target.value)}
                                style={inputStyle}
                                placeholder="e.g. CAL-002"
                              />
                            </Field>

                            <Field label="Certificate Upload">
                              <div style={pickerRowStyle}>
                                <label style={uploadButtonStyle}>
                                  Upload cert
                                  <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                    onChange={(e) => handleCalibrationFileUpload(record.id, e)}
                                    style={{ display: "none" }}
                                  />
                                </label>

                                {record.file_path ? (
                                  <button
                                    type="button"
                                    style={reportLinkButtonStyle as CSSProperties}
                                    onClick={() => void openStoredFile(record.file_path || "")}
                                  >
                                    Open file
                                  </button>
                                ) : null}
                              </div>
                            </Field>

                            <div style={{ gridColumn: "1 / -1" }}>
                              <Field label="Notes">
                                <textarea
                                  value={record.notes}
                                  onChange={(e) => updateCalibrationField(record.id, "notes", e.target.value)}
                                  style={textareaStyle}
                                  placeholder="Calibration notes"
                                />
                              </Field>
                            </div>
                          </div>

                          <div style={recordMetaStyle}>
                            <span>
                              <strong>File:</strong> {record.file_name || "-"}
                            </span>
                            <span>
                              <strong>Size:</strong> {formatFileSize(record.file_size)}
                            </span>
                            <span>
                              <strong>Uploaded:</strong> {formatDateTime(record.uploaded_at)}
                            </span>
                          </div>

                          <div style={buttonRowStyle}>
                            <button
                              type="button"
                              style={dangerMiniButtonStyle}
                              onClick={() => removeCalibrationRecord(record.id)}
                            >
                              Remove Record
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={recordsSectionStyle}>
                  <div style={recordsHeaderStyle}>
                    <div style={recordsTitleStyle}>Inspection Records</div>
                    <button type="button" style={secondaryButtonStyle} onClick={addInspectionRecord}>
                      + Add Inspection Record
                    </button>
                  </div>

                  {qualityDraft.inspection_records.length === 0 ? (
                    <div style={emptyRecordStyle}>No inspection records added.</div>
                  ) : (
                    <div style={recordsListStyle}>
                      {qualityDraft.inspection_records.map((record) => (
                        <div key={record.id} style={recordCardStyle}>
                          <div style={recordGridStyle}>
                            <Field label="Reference">
                              <input
                                value={record.reference}
                                onChange={(e) => updateInspectionField(record.id, "reference", e.target.value)}
                                style={inputStyle}
                                placeholder="e.g. INSP-011"
                              />
                            </Field>

                            <Field label="Inspection Upload">
                              <div style={pickerRowStyle}>
                                <label style={uploadButtonStyle}>
                                  Upload record
                                  <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                    onChange={(e) => handleInspectionFileUpload(record.id, e)}
                                    style={{ display: "none" }}
                                  />
                                </label>

                                {record.file_path ? (
                                  <button
                                    type="button"
                                    style={reportLinkButtonStyle as CSSProperties}
                                    onClick={() => void openStoredFile(record.file_path || "")}
                                  >
                                    Open file
                                  </button>
                                ) : null}
                              </div>
                            </Field>

                            <div style={{ gridColumn: "1 / -1" }}>
                              <Field label="Notes">
                                <textarea
                                  value={record.notes}
                                  onChange={(e) => updateInspectionField(record.id, "notes", e.target.value)}
                                  style={textareaStyle}
                                  placeholder="Inspection notes"
                                />
                              </Field>
                            </div>
                          </div>

                          <div style={recordMetaStyle}>
                            <span>
                              <strong>File:</strong> {record.file_name || "-"}
                            </span>
                            <span>
                              <strong>Size:</strong> {formatFileSize(record.file_size)}
                            </span>
                            <span>
                              <strong>Uploaded:</strong> {formatDateTime(record.uploaded_at)}
                            </span>
                          </div>

                          <div style={buttonRowStyle}>
                            <button
                              type="button"
                              style={dangerMiniButtonStyle}
                              onClick={() => removeInspectionRecord(record.id)}
                            >
                              Remove Record
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={detailSubsectionTitleStyle}>Quality Review Notes</div>

                <div style={detailFormGridStyle}>
                  <Field label="Last Quality Review">
                    <input
                      type="date"
                      value={qualityDraft.last_quality_review}
                      onChange={(e) =>
                        setQualityDraft({ ...qualityDraft, last_quality_review: e.target.value })
                      }
                      style={inputStyle}
                    />
                  </Field>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <Field label="Quality Notes">
                      <textarea
                        value={qualityDraft.quality_notes}
                        onChange={(e) => setQualityDraft({ ...qualityDraft, quality_notes: e.target.value })}
                        style={textareaStyle}
                        placeholder="Notes covering quality history, issues, evidence expectations, or record linkage."
                      />
                    </Field>
                  </div>
                </div>

                <div style={buttonRowStyle}>
                  <button
                    type="button"
                    style={primaryButtonStyle}
                    onClick={saveQualitySection}
                    disabled={isSavingQuality}
                  >
                    {isSavingQuality ? "Saving..." : "Save Quality Section"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </SectionCard>
        </section>
      ) : null}

      {activeView === "reports" ? (
        <section style={fullWidthSectionStyle}>
          <SectionCard
            title="Asset Reports"
            subtitle="Asset reporting outputs are kept separate from the live register workspace."
          >
            <div style={reportsGridStyle}>
              <MiniMetricCard
                label="Assets in Register"
                value={totalAssets}
                tone="#005670"
                bg="#ECECE7"
              />
              <MiniMetricCard
                label="Inspection Watch"
                value={overdueInspectionAssets + dueSoonInspectionAssets}
                tone="#F93822"
                bg="#fee2e2"
              />
              <MiniMetricCard
                label="Maintenance Watch"
                value={overdueMaintenanceAssets + dueSoonMaintenanceAssets}
                tone="#92400e"
                bg="#fef3c7"
              />
              <MiniMetricCard
                label="Linked Actions"
                value={qualitySnapshotData.find((item) => item.name === "Actions")?.value || 0}
                tone="#1d4ed8"
                bg="#dbeafe"
              />
            </div>

            <div style={qualityIntroBoxStyle}>
              Monthly asset management reporting remains available from the dedicated Asset Reports area.
              This tab keeps the main asset workspace aligned with the Quality and HSE module layout while
              avoiding changes to existing report generation.
            </div>

            <div style={buttonRowStyle}>
              <Link href="/assets/reports" style={reportLinkButtonStyle}>
                Open Asset Reports
              </Link>
            </div>
          </SectionCard>
        </section>
      ) : null}
    </main>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
  id,
  }: {
    title: string;
    subtitle?: string;
    children: ReactNode;
    id?: string;
  }) {
    return (
      <section id={id} style={panelStyle}>
        <ModuleSectionHeader title={title} subtitle={subtitle} />
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

function SummaryPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: { bg: string; color: string };
}) {
  return (
    <div
      style={{
        ...summaryPillStyle,
        background: tone?.bg || "#f8fafc",
        color: tone?.color || "#0f172a",
        border: `1px solid ${tone ? "transparent" : "#e2e8f0"}`,
      }}
    >
      <div style={summaryPillLabelStyle}>{label}</div>
      <div style={summaryPillValueStyle}>{value}</div>
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

function DashboardMetricCard({
  label,
  value,
  suffix = "",
  hint,
  tone,
  bg,
}: {
  label: string;
  value: number;
  suffix?: string;
  hint: string;
  tone: string;
  bg: string;
}) {
  return (
    <div style={{ ...dashboardMetricCardStyle, background: bg }}>
      <div style={{ ...dashboardMetricLabelStyle, color: tone }}>{label}</div>
      <div style={{ ...dashboardMetricValueStyle, color: tone }}>
        {value}
        {suffix}
      </div>
      <div style={dashboardMetricHintStyle}>{hint}</div>
    </div>
  );
}

function MiniMetricCard({
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
    <div style={{ ...miniMetricCardStyle, background: bg }}>
      <div style={{ ...miniMetricLabelStyle, color: tone }}>{label}</div>
      <div style={{ ...miniMetricValueStyle, color: tone }}>{value}</div>
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  const tone = getStatusTone(value);

  return (
    <span
      style={{
        padding: "5px 10px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 700,
        display: "inline-block",
        background: tone.bg,
        color: tone.color,
      }}
    >
      {value}
    </span>
  );
}

function EditableLinkGroup({
  title,
  items,
  hrefBuilder,
  onRemove,
}: {
  title: string;
  items: string[];
  hrefBuilder: (item: string) => string;
  onRemove: (item: string) => void;
}) {
  return (
    <div style={linkGroupStyle}>
      <div style={linkGroupTitleStyle}>{title}</div>
      <div style={linkWrapStyle}>
        {items.length === 0 ? (
          <span style={mutedTextStyle}>None linked</span>
        ) : (
          items.map((item) => (
            <span key={item} style={editablePillWrapStyle}>
              <Link href={hrefBuilder(item)} style={linkPillStyle}>
                {item}
              </Link>
              <button type="button" style={pillRemoveButtonStyle} onClick={() => onRemove(item)}>
                ×
              </button>
            </span>
          ))
        )}
      </div>
    </div>
  );
}

const heroStyle: CSSProperties = {
  background: "linear-gradient(135deg, #005670 0%, #005670 64%, #63B1BC 160%)",
  color: "white",
  borderRadius: "20px",
  padding: "28px 30px",
  marginBottom: "24px",
  boxShadow: "0 10px 30px rgba(0, 86, 112, 0.14)",
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
  opacity: 0.78,
  marginBottom: "10px",
};

const heroTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "34px",
  lineHeight: 1.1,
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

const dashboardKpiGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
  marginBottom: "20px",
};

const dashboardPanelGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: "16px",
  alignItems: "start",
  marginBottom: "20px",
};

const dashboardMetricGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "10px",
};

const dashboardMetricCardStyle: CSSProperties = {
  minHeight: "104px",
  borderRadius: "14px",
  padding: "14px",
  border: "1px solid rgba(148, 163, 184, 0.24)",
  display: "grid",
  alignContent: "space-between",
  gap: "6px",
};

const dashboardMetricLabelStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const dashboardMetricValueStyle: CSSProperties = {
  fontSize: "30px",
  fontWeight: 900,
  lineHeight: 1,
};

const dashboardMetricHintStyle: CSSProperties = {
  fontSize: "12px",
  color: "#64748b",
  fontWeight: 700,
  lineHeight: 1.35,
};

const fullWidthSectionStyle: CSSProperties = {
  marginBottom: "20px",
};

const reportsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "12px",
  marginBottom: "14px",
};

const detailPanelSectionStyle: CSSProperties = {
  marginBottom: "20px",
};

const panelStyle: CSSProperties = {
  background: "white",
  borderRadius: "18px",
  padding: "22px",
  border: "1px solid #dbe7f3",
  boxShadow: "0 14px 28px rgba(15, 23, 42, 0.06)",
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

const formGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "12px",
};

const detailFormGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(240px, 1fr))",
  gap: "14px",
};

const fieldWrapStyle: CSSProperties = {
  display: "grid",
  gap: "6px",
  minWidth: 0,
};

const fieldLabelStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 700,
  color: "#334155",
};

const inputStyle: CSSProperties = {
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  background: "white",
  color: "#0f172a",
  width: "100%",
  boxSizing: "border-box",
  minWidth: 0,
};

const readonlyInputStyle: CSSProperties = {
  ...inputStyle,
  background: "#f8fafc",
  color: "#475569",
};

const textareaStyle: CSSProperties = {
  width: "100%",
  minHeight: "96px",
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  background: "white",
  color: "#0f172a",
  resize: "vertical",
  fontFamily: "Arial, Helvetica, sans-serif",
  boxSizing: "border-box",
  lineHeight: 1.5,
  minWidth: 0,
};

const buttonRowStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "14px",
};

const quickActionRowStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginBottom: "14px",
};

const primaryButtonStyle: CSSProperties = {
  background: "#005670",
  color: "white",
  border: "none",
  padding: "10px 16px",
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

const dangerButtonStyle: CSSProperties = {
  background: "#F93822",
  color: "white",
  border: "none",
  padding: "10px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 700,
};

const dangerMiniButtonStyle: CSSProperties = {
  background: "#F93822",
  color: "#ffffff",
  border: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};

const uploadButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#005670",
  color: "#ffffff",
  borderRadius: "10px",
  padding: "10px 16px",
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const reportLinkButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#dbeafe",
  color: "#1d4ed8",
  borderRadius: "10px",
  padding: "10px 16px",
  fontWeight: 700,
  textDecoration: "none",
  whiteSpace: "nowrap",
  border: "none",
  cursor: "pointer",
};

const qualityIntroBoxStyle: CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "14px",
  color: "#334155",
  lineHeight: 1.5,
};

const miniMetricCardStyle: CSSProperties = {
  borderRadius: "12px",
  padding: "12px",
};

const miniMetricLabelStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 800,
  marginBottom: "4px",
};

const miniMetricValueStyle: CSSProperties = {
  fontSize: "24px",
  fontWeight: 800,
};

const compactTableWrapStyle: CSSProperties = {
  overflowX: "auto",
  border: "1px solid #dbe3ef",
  borderRadius: "16px",
  background: "#ffffff",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
};

const registerTableRowStyle: CSSProperties = {
  cursor: "pointer",
  transition: "background 160ms ease, box-shadow 160ms ease",
};

const tableSubTextStyle: CSSProperties = {
  marginTop: "4px",
  fontSize: "12px",
  color: "#64748b",
  lineHeight: 1.45,
  wordBreak: "break-word",
};

const emptyTableCellStyle: CSSProperties = {
  padding: "24px 14px",
  color: "#64748b",
  textAlign: "center",
  background: "#f8fafc",
};

const assetSummaryStripStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(220px, 1fr))",
  gap: "12px",
};

const emptyDetailStyle: CSSProperties = {
  border: "1px dashed #cbd5e1",
  borderRadius: "16px",
  padding: "24px",
  color: "#64748b",
  background: "#f8fafc",
};

const detailWorkspaceStyle: CSSProperties = {
  display: "grid",
  gap: "18px",
  minWidth: 0,
};

const detailTopBarStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const detailBadgeRowStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  alignItems: "center",
};

const detailEyebrowStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 800,
  color: "#64748b",
  textTransform: "uppercase",
  marginBottom: "6px",
};

const detailTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "22px",
  color: "#0f172a",
  lineHeight: 1.25,
  overflowWrap: "anywhere",
};

const imageStripStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "180px minmax(0, 1fr)",
  gap: "18px",
  border: "1px solid #ECECE7",
  background: "linear-gradient(180deg, #ECECE7 0%, #ECECE7 100%)",
  borderRadius: "16px",
  padding: "16px",
  alignItems: "center",
};

const imagePreviewWrapStyle: CSSProperties = {
  width: "160px",
  height: "160px",
  borderRadius: "14px",
  overflow: "hidden",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
};

const imagePreviewStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const imagePlaceholderStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#64748b",
  fontWeight: 700,
  fontSize: "13px",
  textAlign: "center",
  padding: "10px",
};

const imageMetaWrapStyle: CSSProperties = {
  display: "grid",
  gap: "6px",
  minWidth: 0,
};

const qrCardStyle: CSSProperties = {
  marginTop: "16px",
  border: "1px solid #dbe7f3",
  borderRadius: "16px",
  padding: "16px",
  background: "#f8fafc",
  display: "grid",
  gridTemplateColumns: "minmax(160px, 200px) minmax(0, 1fr)",
  gap: "16px",
  alignItems: "center",
};

const qrPreviewWrapStyle: CSSProperties = {
  width: "100%",
  maxWidth: "200px",
  aspectRatio: "1 / 1",
  borderRadius: "14px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
};

const qrImageStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
  display: "block",
};

const qrLoadingStyle: CSSProperties = {
  fontSize: "13px",
  color: "#64748b",
  textAlign: "center",
  padding: "16px",
};

const qrDetailsStyle: CSSProperties = {
  display: "grid",
  gap: "8px",
  minWidth: 0,
};

const qrCardTitleStyle: CSSProperties = {
  fontSize: "16px",
  fontWeight: 800,
  color: "#0f172a",
};

const qrCardMetaStyle: CSSProperties = {
  fontSize: "13px",
  color: "#475569",
  lineHeight: 1.45,
};

const qrTargetLabelStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 800,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginTop: "4px",
};

const qrTargetValueStyle: CSSProperties = {
  fontSize: "13px",
  color: "#0f172a",
  lineHeight: 1.45,
  overflowWrap: "anywhere",
};

const imageMetaTitleStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 800,
  color: "#64748b",
  textTransform: "uppercase",
};

const imageMetaFileStyle: CSSProperties = {
  fontSize: "16px",
  fontWeight: 800,
  color: "#0f172a",
  wordBreak: "break-word",
  overflowWrap: "anywhere",
};

const imageMetaSubStyle: CSSProperties = {
  fontSize: "13px",
  color: "#475569",
  lineHeight: 1.45,
  overflowWrap: "anywhere",
};

const detailSectionStyle: CSSProperties = {
  border: "1px solid #dbe3ef",
  borderRadius: "18px",
  padding: "18px",
  background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
  minWidth: 0,
};

const detailSectionIntroStyle: CSSProperties = {
  marginBottom: "14px",
  color: "#475569",
  fontSize: "14px",
  lineHeight: 1.6,
};

const summaryPillStyle: CSSProperties = {
  borderRadius: "14px",
  padding: "12px 14px",
  minHeight: "76px",
  display: "grid",
  gap: "6px",
  alignContent: "start",
};

const summaryPillLabelStyle: CSSProperties = {
  fontSize: "11px",
  fontWeight: 800,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const summaryPillValueStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 700,
  lineHeight: 1.35,
  wordBreak: "break-word",
  overflowWrap: "anywhere",
};

const detailSectionTitleStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 900,
  color: "#005670",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginBottom: "12px",
};

const detailSubsectionTitleStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 800,
  color: "#475569",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginTop: "18px",
  marginBottom: "10px",
};

const qualityMiniGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "10px",
  marginBottom: "14px",
};

const linkPickerGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
  marginBottom: "14px",
};

const pickerRowStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  alignItems: "center",
};

const linkedBlocksGridStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
  marginTop: "16px",
};

const linkGroupStyle: CSSProperties = {
  display: "grid",
  gap: "8px",
};

const linkGroupTitleStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 800,
  color: "#64748b",
  textTransform: "uppercase",
};

const linkWrapStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
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

const editablePillWrapStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  background: "#dbeafe",
  borderRadius: "999px",
  paddingRight: "6px",
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

const recordsSectionStyle: CSSProperties = {
  marginTop: "18px",
  borderTop: "1px solid #e2e8f0",
  paddingTop: "16px",
};

const recordsHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  alignItems: "center",
  marginBottom: "12px",
};

const recordsTitleStyle: CSSProperties = {
  fontSize: "15px",
  fontWeight: 800,
  color: "#0f172a",
};

const recordsListStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
};

const historyWorkspaceGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "16px",
  marginTop: "16px",
};

const historyPanelStyle: CSSProperties = {
  border: "1px solid #dbe7f3",
  borderRadius: "16px",
  padding: "16px",
  background: "#f8fafc",
  minWidth: 0,
};

const timelineListStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
  marginTop: "14px",
};

const timelineCardStyle: CSSProperties = {
  border: "1px solid #dbe7f3",
  borderRadius: "14px",
  padding: "14px 16px",
  background: "#f8fafc",
  display: "grid",
  gap: "10px",
};

const timelineHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const timelineTitleWrapStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const timelineTitleStyle: CSSProperties = {
  fontSize: "15px",
  fontWeight: 800,
  color: "#0f172a",
  lineHeight: 1.35,
};

const timelineMetaStyle: CSSProperties = {
  fontSize: "12px",
  color: "#64748b",
  marginTop: "4px",
};

const timelineStatusStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  color: "#334155",
  background: "#e2e8f0",
  borderRadius: "999px",
  padding: "5px 10px",
  whiteSpace: "nowrap",
};

const timelineDescriptionStyle: CSSProperties = {
  fontSize: "13px",
  color: "#475569",
  lineHeight: 1.5,
  overflowWrap: "anywhere",
};

const historyCountStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  color: "#64748b",
};

const recordCardStyle: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  padding: "14px",
  background: "#f8fafc",
};

const historyRecordCardStyle: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  padding: "14px",
  background: "#ffffff",
  display: "grid",
  gap: "10px",
  minWidth: 0,
};

const historyRecordHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const historyRecordTitleStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 800,
  color: "#0f172a",
  lineHeight: 1.4,
  overflowWrap: "anywhere",
};

const historyRecordMetaStyle: CSSProperties = {
  marginTop: "4px",
  fontSize: "12px",
  color: "#64748b",
  lineHeight: 1.5,
  overflowWrap: "anywhere",
};

const historyInfoGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "8px 12px",
  color: "#475569",
  fontSize: "13px",
  lineHeight: 1.5,
};

const historyBodyTextStyle: CSSProperties = {
  color: "#334155",
  fontSize: "13px",
  lineHeight: 1.6,
  overflowWrap: "anywhere",
};

const recordGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
};

const recordMetaStyle: CSSProperties = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
  fontSize: "13px",
  color: "#475569",
  marginTop: "10px",
};

const emptyRecordStyle: CSSProperties = {
  border: "1px dashed #cbd5e1",
  borderRadius: "12px",
  padding: "14px",
  color: "#64748b",
  background: "#f8fafc",
};

const mutedTextStyle: CSSProperties = {
  color: "#94a3b8",
  fontSize: "13px",
};

const badgeStyle: CSSProperties = {
  padding: "5px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 700,
  display: "inline-block",
  whiteSpace: "nowrap",
};
export default function AssetsPage() {
  return (
    <Suspense fallback={<main style={{ padding: "24px" }}>Loading assets...</main>}>
      <AssetsPageContent />
    </Suspense>
  );
}

function getConditionTone(condition: string | null) {
  const value = (condition || "").toLowerCase();

  if (!value) return { bg: "#e2e8f0", color: "#334155" };
  if (value.includes("excellent") || value.includes("good")) {
    return { bg: "#dcfce7", color: "#166534" };
  }
  if (value.includes("fair") || value.includes("service")) {
    return { bg: "#fef3c7", color: "#92400e" };
  }
  if (value.includes("poor") || value.includes("damage") || value.includes("fail")) {
    return { bg: "#fee2e2", color: "#F93822" };
  }

  return { bg: "#dbeafe", color: "#1d4ed8" };
}

function getInspectionResultTone(result: string) {
  const value = result.toLowerCase();

  if (value === "pass") return { bg: "#dcfce7", color: "#166534" };
  if (value === "fail") return { bg: "#fee2e2", color: "#F93822" };
  if (value.includes("observation")) return { bg: "#fef3c7", color: "#92400e" };

  return { bg: "#e2e8f0", color: "#334155" };
}

function getTimelineTypeTone(type: AssetTimelineEntry["type"]) {
  if (type === "File") return { bg: "#dbeafe", color: "#1d4ed8" };
  if (type === "Calibration") return { bg: "#fef3c7", color: "#92400e" };
  if (type === "Inspection") return { bg: "#dcfce7", color: "#166534" };
  if (type === "Maintenance") return { bg: "#ede9fe", color: "#6d28d9" };
  return { bg: "#fee2e2", color: "#F93822" };
}

function getMaintenanceTypeTone(type: string) {
  const value = type.toLowerCase();

  if (value === "corrective") return { bg: "#fee2e2", color: "#F93822" };
  if (value === "preventative") return { bg: "#dbeafe", color: "#1d4ed8" };

  return { bg: "#e2e8f0", color: "#334155" };
}

function getDueWindowTone(days: number | null) {
  if (days === null) return { bg: "#e2e8f0", color: "#334155" };
  if (days < 0) return { bg: "#fee2e2", color: "#F93822" };
  if (days <= 30) return { bg: "#fef3c7", color: "#92400e" };
  return { bg: "#dcfce7", color: "#166534" };
}

function getDaysUntil(value: string | null) {
  if (!value) return null;
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

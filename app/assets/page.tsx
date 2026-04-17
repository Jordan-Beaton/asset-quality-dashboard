"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { supabase } from "../../src/lib/supabase";

type AssetStatus = "Active" | "Inactive" | "Quarantine" | "Under Maintenance";

type Asset = {
  id: string;
  asset_code: string | null;
  name: string | null;
  description: string | null;
  location: string | null;
  owner: string | null;
  status: string | null;
};

type AssetForm = {
  name: string;
  description: string;
  location: string;
  owner: string;
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
};

type AssetInspectionRow = {
  id: string;
  asset_id: string;
  reference: string;
  file_name: string | null;
  file_path: string | null;
  notes: string | null;
  uploaded_at: string | null;
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

const chartColors = ["#0f766e", "#16a34a", "#dc2626", "#ea580c", "#2563eb", "#7c3aed"];
const STORAGE_BUCKET = "asset-files";

const emptyForm: AssetForm = {
  name: "",
  description: "",
  location: "",
  owner: "",
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

function getStatusTone(status: string) {
  const value = status.toLowerCase();

  if (value === "active") return { bg: "#dcfce7", color: "#166534" };
  if (value === "inactive") return { bg: "#e5e7eb", color: "#374151" };
  if (value.includes("quarantine")) return { bg: "#fee2e2", color: "#991b1b" };
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

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [message, setMessage] = useState("Loading assets...");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");

  const [form, setForm] = useState<AssetForm>(emptyForm);
  const [detailForm, setDetailForm] = useState<AssetForm>(emptyForm);
  const [qualityDraft, setQualityDraft] = useState<QualityDraft>(
    createQualityDraft(createDefaultQualityRecord())
  );

  const [ncrOptions, setNcrOptions] = useState<LinkedOption[]>([]);
  const [actionOptions, setActionOptions] = useState<LinkedOption[]>([]);

  const [qualityByAssetId, setQualityByAssetId] = useState<Record<string, AssetQualityRecord>>({});
  const [isSavingQuality, setIsSavingQuality] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState("");

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
      return;
    }

    const [qualityRes, ncrRes, actionRes, calibrationRes, inspectionRes, filesRes] = await Promise.all([
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
        .select("id,asset_id,reference,file_name,file_path,notes,uploaded_at")
        .in("asset_id", assetIds),
      supabase
        .from("asset_inspection_records")
        .select("id,asset_id,reference,file_name,file_path,notes,uploaded_at")
        .in("asset_id", assetIds),
      supabase
        .from("asset_files")
        .select("id,asset_id,file_type,reference,file_name,file_path,file_size,uploaded_at")
        .in("asset_id", assetIds),
    ]);

    const next: Record<string, AssetQualityRecord> = {};

    assetIds.forEach((assetId) => {
      next[assetId] = createDefaultQualityRecord();
    });

    if (!qualityRes.error) {
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
        next[row.asset_id] = next[row.asset_id] || createDefaultQualityRecord();
        next[row.asset_id].inspection_records.push({
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

    if (!filesRes.error) {
      const files = (filesRes.data as AssetFileRow[] | null) || [];
      files.forEach((fileRow) => {
        next[fileRow.asset_id] = next[fileRow.asset_id] || createDefaultQualityRecord();

        if (fileRow.file_type === "image") {
          next[fileRow.asset_id].image_name = fileRow.file_name;
          next[fileRow.asset_id].image_size = fileRow.file_size || null;
          next[fileRow.asset_id].image_uploaded_at = fileRow.uploaded_at;
          next[fileRow.asset_id].image_path = fileRow.file_path;
        }
      });
    }

    setQualityByAssetId(next);
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
          a.name?.toLowerCase().includes(lower) ||
          a.description?.toLowerCase().includes(lower) ||
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

    return result;
  }, [assets, search, statusFilter, locationFilter, ownerFilter]);

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedAssetId) || null,
    [assets, selectedAssetId]
  );

  const selectedQuality = useMemo(() => {
    if (!selectedAssetId) return createDefaultQualityRecord();
    return qualityByAssetId[selectedAssetId] || createDefaultQualityRecord();
  }, [qualityByAssetId, selectedAssetId]);

  useEffect(() => {
    if (!selectedAsset) return;

    setDetailForm({
      name: selectedAsset.name || "",
      description: selectedAsset.description || "",
      location: selectedAsset.location || "",
      owner: selectedAsset.owner || "",
      status: (selectedAsset.status as AssetStatus) || "Active",
    });

    const record = qualityByAssetId[selectedAsset.id] || createDefaultQualityRecord();
    setQualityDraft(createQualityDraft(record));
  }, [selectedAsset, qualityByAssetId]);

  const totalAssets = assets.length;
  const activeAssets = assets.filter((a) => (a.status || "").toLowerCase() === "active").length;
  const inactiveAssets = assets.filter((a) => (a.status || "").toLowerCase() === "inactive").length;
  const qualityLinkedAssets = assets.filter((asset) => {
    const record = qualityByAssetId[asset.id];
    return record ? countQualityLinks(record) > 0 : false;
  }).length;

  const statusChartData = useMemo(() => {
    const groups = assets.reduce<Record<string, number>>((acc, asset) => {
      const key = asset.status || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [assets]);

  const locationChartData = useMemo(() => {
    const groups = assets.reduce<Record<string, number>>((acc, asset) => {
      const key = asset.location || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [assets]);

  const descriptionChartData = useMemo(() => {
    const groups = assets.reduce<Record<string, number>>((acc, asset) => {
      const key = asset.description || asset.name || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(groups)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
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

  async function addAsset(e: React.FormEvent) {
    e.preventDefault();

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
          description: form.description || null,
          location: form.location || null,
          owner: form.owner || null,
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
    setSelectedAssetId(newAsset.id);
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
        description: detailForm.description || null,
        location: detailForm.location || null,
        owner: detailForm.owner || null,
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
                description: detailForm.description || null,
                location: detailForm.location || null,
                owner: detailForm.owner || null,
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
    setQualityDraft((prev) => ({
      ...prev,
      linked_ncrs: prev.linked_ncrs.filter((item) => item !== id),
    }));
  }

  function removeLinkedAction(id: string) {
    setQualityDraft((prev) => ({
      ...prev,
      linked_actions: prev.linked_actions.filter((item) => item !== id),
    }));
  }

  function addCalibrationRecord() {
    setQualityDraft((prev) => ({
      ...prev,
      calibration_records: [...prev.calibration_records, createEmptyUploadedRecord("cal")],
    }));
  }

  function addInspectionRecord() {
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

  function removeCalibrationRecord(id: string) {
    setQualityDraft((prev) => ({
      ...prev,
      calibration_records: prev.calibration_records.filter((record) => record.id !== id),
    }));
  }

  function removeInspectionRecord(id: string) {
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
  }

  return (
    <main>
      <section style={heroStyle}>
        <div style={{ flex: "1 1 680px" }}>
          <div style={eyebrowStyle}>Asset Register</div>
          <h1 style={heroTitleStyle}>Assets</h1>
          <p style={heroSubtitleStyle}>
            Live asset register with a dedicated quality workspace, image upload, and direct linking
            to NCRs, actions, calibrations and inspections.
          </p>

          <div style={heroPillGridStyle}>
            <HeroPill label="Total Assets" value={totalAssets} tone="neutral" />
            <HeroPill label="Active" value={activeAssets} tone="green" />
            <HeroPill label="Inactive" value={inactiveAssets} tone="red" />
            <HeroPill label="Quality Linked" value={qualityLinkedAssets} tone="blue" />
          </div>
        </div>

        <div style={heroMetaWrapStyle}>
          <HeroMetaCard label="Filtered Results" value={filteredAssets.length} />
          <HeroMetaCard label="Current Selection" value={selectedAsset?.name || "None"} compact />
          <HeroMetaCard
            label="Quality Links"
            value={selectedAsset ? countQualityLinks(selectedQuality) : 0}
          />
          <HeroMetaCard label="Image" value={selectedQuality.image_name ? "Uploaded" : "Not set"} compact />
        </div>
      </section>

      <div style={topMetaRowStyle}>
        <Link href="/" style={backLinkStyle}>
          ← Back to Dashboard
        </Link>

        <div style={statusBannerStyle}>
          <strong>Status:</strong> {message}
        </div>
      </div>

      <section style={statsGridStyle}>
        <StatCard title="Total Assets" value={totalAssets} accent="#0f766e" />
        <StatCard title="Active Assets" value={activeAssets} accent="#16a34a" />
        <StatCard title="Inactive Assets" value={inactiveAssets} accent="#dc2626" />
        <StatCard title="Quality Linked" value={qualityLinkedAssets} accent="#2563eb" />
      </section>

      <section style={topGridStyle}>
        <SectionCard
          title="Add Asset"
          subtitle="Create one asset record directly into the live register."
        >
          <form onSubmit={addAsset}>
            <div style={formGridStyle}>
              <Field label="Name">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={inputStyle}
                  placeholder="Asset name"
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

              <Field label="Location">
                <input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  style={inputStyle}
                  placeholder="Location"
                />
              </Field>

              <Field label="Owner">
                <input
                  value={form.owner}
                  onChange={(e) => setForm({ ...form, owner: e.target.value })}
                  style={inputStyle}
                  placeholder="Owner / department"
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

        <SectionCard
          title="Quality Overview"
          subtitle="Top-level view of how asset quality records are currently linked."
        >
          <div style={qualityOverviewGridStyle}>
            <MiniMetricCard
              label="Linked NCRs"
              value={qualitySnapshotData.find((item) => item.name === "NCRs")?.value || 0}
              tone="#991b1b"
              bg="#fee2e2"
            />
            <MiniMetricCard
              label="Linked Actions"
              value={qualitySnapshotData.find((item) => item.name === "Actions")?.value || 0}
              tone="#1d4ed8"
              bg="#dbeafe"
            />
            <MiniMetricCard
              label="Calibration Links"
              value={qualitySnapshotData.find((item) => item.name === "Calibration")?.value || 0}
              tone="#92400e"
              bg="#fef3c7"
            />
            <MiniMetricCard
              label="Inspection Links"
              value={qualitySnapshotData.find((item) => item.name === "Inspection")?.value || 0}
              tone="#166534"
              bg="#dcfce7"
            />
          </div>

          <div style={qualityIntroBoxStyle}>
            Use the <strong>Quality</strong> section in the asset detail panel to connect each
            asset to NCRs, actions, calibration records and inspections without oversimplifying
            complex assemblies.
          </div>
        </SectionCard>
      </section>

      <section style={chartGridStyle}>
        <SectionCard title="Assets by Status" subtitle="Current status split across the register.">
          <div style={chartWrapStyle}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={statusChartData} dataKey="value" nameKey="name" outerRadius={90} label>
                  {statusChartData.map((_, index) => (
                    <Cell key={index} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Assets by Location" subtitle="Location distribution across the asset register.">
          <div style={chartWrapStyle}>
            <ResponsiveContainer>
              <BarChart data={locationChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#0f766e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Assets by Description" subtitle="Top description groupings in the register.">
          <div style={chartWrapStyle}>
            <ResponsiveContainer>
              <BarChart data={descriptionChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </section>

      <section style={workspaceGridStyle}>
        <SectionCard
          title="Asset Register"
          subtitle="Click any asset to open its detail and quality workspace on the right."
        >
          <div style={toolbarStyle}>
            <input
              placeholder="Search name, description, location or owner"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={toolbarSearchStyle}
            />

            <div style={toolbarFiltersStyle}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={toolbarSelectStyle}
              >
                <option value="">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Quarantine">Quarantine</option>
                <option value="Under Maintenance">Under Maintenance</option>
              </select>

              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                style={toolbarSelectStyle}
              >
                <option value="">All Locations</option>
                {uniqueLocations.map((location) => (
                  <option key={String(location)} value={String(location)}>
                    {String(location)}
                  </option>
                ))}
              </select>

              <select
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                style={toolbarSelectStyle}
              >
                <option value="">All Owners</option>
                {uniqueOwners.map((owner) => (
                  <option key={String(owner)} value={String(owner)}>
                    {String(owner)}
                  </option>
                ))}
              </select>

              <button type="button" onClick={clearFilters} style={secondaryButtonStyle}>
                Clear Filters
              </button>
            </div>
          </div>

          <div style={tableInfoRowStyle}>
            Showing <strong>{filteredAssets.length}</strong> of <strong>{assets.length}</strong> assets
          </div>

          <div style={registerTableWrapStyle}>
            <div style={registerHeadStyle}>
              <div>Name</div>
              <div>Description</div>
              <div>Location</div>
              <div>Owner</div>
              <div>Status</div>
            </div>

            <div style={registerBodyStyle}>
              {filteredAssets.length === 0 ? (
                <div style={emptyRegisterStyle}>No assets match the current filters.</div>
              ) : (
                filteredAssets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => setSelectedAssetId(asset.id)}
                    style={{
                      ...registerRowStyle,
                      background: selectedAssetId === asset.id ? "#eff6ff" : "#ffffff",
                      borderLeft:
                        selectedAssetId === asset.id ? "4px solid #0f766e" : "4px solid transparent",
                    }}
                  >
                    <div style={registerPrimaryStyle}>{asset.name || "-"}</div>
                    <div style={registerCellTextStyle}>{asset.description || "-"}</div>
                    <div style={registerCellTextStyle}>{asset.location || "-"}</div>
                    <div style={registerCellTextStyle}>{asset.owner || "-"}</div>
                    <div>
                      <StatusBadge value={asset.status || "Unknown"} />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Asset Detail"
          subtitle="Single workspace for core details, image and quality links."
        >
          {!selectedAsset ? (
            <div style={emptyDetailStyle}>Select an asset from the register to open it here.</div>
          ) : (
            <div style={detailWorkspaceStyle}>
              <div style={detailTopBarStyle}>
                <div>
                  <div style={detailEyebrowStyle}>Asset Detail</div>
                  <h3 style={detailTitleStyle}>{selectedAsset.name || "Unnamed asset"}</h3>
                </div>

                <span
                  style={{
                    ...badgeStyle,
                    background: getStatusTone(selectedAsset.status || "Unknown").bg,
                    color: getStatusTone(selectedAsset.status || "Unknown").color,
                  }}
                >
                  {selectedAsset.status || "Unknown"}
                </span>
              </div>

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

                    {selectedImageUrl ? (
                      <a
                        href={selectedImageUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={reportLinkButtonStyle}
                      >
                        Open image
                      </a>
                    ) : null}

                    {selectedQuality.image_name ? (
                      <button type="button" style={secondaryButtonStyle} onClick={removeImage}>
                        Remove image
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              <div style={detailSectionStyle}>
                <div style={detailSectionTitleStyle}>Core Asset Record</div>

                <div style={detailFormGridStyle}>
                  <Field label="Name">
                    <input
                      value={detailForm.name}
                      onChange={(e) => setDetailForm({ ...detailForm, name: e.target.value })}
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

                  <Field label="Description">
                    <input
                      value={detailForm.description}
                      onChange={(e) => setDetailForm({ ...detailForm, description: e.target.value })}
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

                  <Field label="Owner">
                    <input
                      value={detailForm.owner}
                      onChange={(e) => setDetailForm({ ...detailForm, owner: e.target.value })}
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
                <div style={detailSectionTitleStyle}>Quality</div>

                <div style={qualityMiniGridStyle}>
                  <MiniMetricCard label="NCRs" value={qualityDraft.linked_ncrs.length} tone="#991b1b" bg="#fee2e2" />
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
                                    onClick={() => void openStoredFile(record.file_path)}
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
                                    onClick={() => void openStoredFile(record.file_path)}
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={fieldWrapStyle}>
      <span style={fieldLabelStyle}>{label}</span>
      {children}
    </label>
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
        background: "white",
        borderRadius: "16px",
        padding: "18px 20px",
        borderLeft: `5px solid ${accent}`,
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
      }}
    >
      <div style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: "34px", fontWeight: 700, color: "#0f172a", marginTop: "8px" }}>
        {value}
      </div>
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

const topMetaRowStyle: CSSProperties = {
  marginBottom: 20,
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
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
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "16px",
  marginBottom: "20px",
};

const topGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.05fr 0.95fr",
  gap: "20px",
  marginBottom: "20px",
};

const chartGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "20px",
  marginBottom: "20px",
};

const workspaceGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.2fr 0.95fr",
  gap: "20px",
  alignItems: "start",
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

const formGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "12px",
};

const detailFormGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "12px",
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

const inputStyle: CSSProperties = {
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  background: "white",
  color: "#0f172a",
  width: "100%",
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
};

const buttonRowStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "14px",
};

const primaryButtonStyle: CSSProperties = {
  background: "#0f766e",
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
  background: "#dc2626",
  color: "white",
  border: "none",
  padding: "10px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 700,
};

const dangerMiniButtonStyle: CSSProperties = {
  background: "#991b1b",
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
  background: "#0f766e",
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

const qualityOverviewGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "12px",
  marginBottom: "14px",
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

const chartWrapStyle: CSSProperties = {
  width: "100%",
  height: 300,
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
  gridTemplateColumns: "1.4fr 1.6fr 1fr 1fr 0.8fr",
  gap: "12px",
  padding: "14px 16px",
  background: "#f8fafc",
  borderBottom: "1px solid #e5e7eb",
  fontSize: "12px",
  fontWeight: 800,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: 0.25,
  alignItems: "center",
};

const registerBodyStyle: CSSProperties = {
  maxHeight: "980px",
  overflowY: "auto",
};

const registerRowStyle: CSSProperties = {
  width: "100%",
  textAlign: "left",
  display: "grid",
  gridTemplateColumns: "1.4fr 1.6fr 1fr 1fr 0.8fr",
  gap: "12px",
  padding: "14px 16px",
  border: "none",
  borderBottom: "1px solid #eef2f7",
  borderLeft: "4px solid transparent",
  cursor: "pointer",
  alignItems: "center",
};

const registerPrimaryStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 800,
  color: "#0f172a",
  lineHeight: 1.35,
  wordBreak: "break-word",
};

const registerCellTextStyle: CSSProperties = {
  fontSize: "13px",
  color: "#475569",
  lineHeight: 1.45,
  wordBreak: "break-word",
};

const emptyRegisterStyle: CSSProperties = {
  padding: "24px 16px",
  color: "#64748b",
  textAlign: "center",
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
  gap: "16px",
  maxHeight: "1320px",
  overflowY: "auto",
  paddingRight: "4px",
};

const detailTopBarStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  alignItems: "flex-start",
  flexWrap: "wrap",
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
};

const imageStripStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "160px 1fr",
  gap: "16px",
  border: "1px solid #cfe8e5",
  background: "linear-gradient(180deg, #f7fffd 0%, #eefbf8 100%)",
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
};

const detailSectionStyle: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  padding: "16px",
  background: "#ffffff",
};

const detailSectionTitleStyle: CSSProperties = {
  fontSize: "16px",
  fontWeight: 800,
  color: "#0f172a",
  marginBottom: "12px",
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

const recordCardStyle: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  padding: "14px",
  background: "#f8fafc",
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
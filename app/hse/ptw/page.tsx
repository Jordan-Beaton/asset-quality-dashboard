"use client";

import type { ChangeEvent, CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  AlignmentType,
  BorderStyle,
  Document as WordDocument,
  ExternalHyperlink,
  Footer,
  HeightRule,
  ImageRun,
  Packer,
  Paragraph,
  SimpleField,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import { ImsButton, ImsPanel, ImsTabs, ImsTopMetaRow } from "../../../src/components/ImsPrimitives";
import { imsColours, imsPanelStyle, imsTableCellStyle, imsTableHeadStyle, imsTableStyle } from "../../../src/components/imsTheme";
import { QualityKpiCard } from "../../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../../src/components/QualityPageHero";
import { supabase } from "../../../src/lib/supabase";

type PtwView = "dashboard" | "register" | "create" | "template";
type YesNo = "" | "Yes" | "No";

type PersonBlock = {
  name: string;
  position: string;
  company: string;
  date: string;
};

type SignatureBlock = PersonBlock & {
  signature: string;
};

type PtwForm = {
  id?: string;
  ptwNumber: string;
  status: string;
  workTypes: string[];
  otherWorkType: string;
  descriptionOfWork: string;
  equipmentTools: string;
  exactLocation: string;
  riskAssessment: string;
  liftPlan: string;
  isolationRequired: YesNo;
  electricalIsolation: YesNo;
  mechanicalIsolation: YesNo;
  pressureIsolation: YesNo;
  isolationDescription: string;
  precautions: string[];
  otherPrecaution: string;
  checklistUsed: YesNo;
  pteCondition: string;
  issuingAuthorityHours: string;
  startTime: string;
  startDate: string;
  endTime: string;
  endDate: string;
  issuedBy: SignatureBlock;
  acceptedBy: SignatureBlock;
  extensions: ExtensionBlock[];
  closurePerson: SignatureBlock;
  closureAuthority: SignatureBlock;
  attachments: string[];
  notes: string;
};

type ExtensionBlock = {
  id: string;
  label: string;
  extendedToTime: string;
  extendedToDate: string;
  extensionBy: SignatureBlock;
  acceptedBy: SignatureBlock;
};

type PeopleOption = {
  id: string;
  name: string;
  role: string | null;
  department: string | null;
  active: boolean | null;
};

type HsePtwRecord = {
  id: string;
  ptw_number: string;
  status: string | null;
  work_types: string[] | null;
  other_work_type: string | null;
  description_of_work: string | null;
  equipment_tools: string | null;
  exact_location: string | null;
  risk_assessment: string | null;
  lift_plan: string | null;
  isolation_required: YesNo | null;
  electrical_isolation: YesNo | null;
  mechanical_isolation: YesNo | null;
  pressure_isolation: YesNo | null;
  isolation_description: string | null;
  precautions: string[] | null;
  other_precaution: string | null;
  checklist_used: YesNo | null;
  pte_condition: string | null;
  issuing_authority_hours: string | null;
  start_time: string | null;
  start_date: string | null;
  end_time: string | null;
  end_date: string | null;
  issued_by: SignatureBlock | null;
  accepted_by: SignatureBlock | null;
  extensions: ExtensionBlock[] | null;
  closure_person: SignatureBlock | null;
  closure_authority: SignatureBlock | null;
  attachments: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type PtwAttachment = {
  id: string;
  ptw_id: string;
  attachment_type: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  content_type: string | null;
  uploaded_at: string;
};

type PendingAttachment = {
  id: string;
  attachmentType: string;
  file: File;
};

type AttachmentWithUrl = {
  attachmentType: string;
  fileName: string;
  fileSize: number | null;
  uploadedAt: string;
  url: string;
};

const evidenceBucket = "quality-evidence";
const pdfBrand: [number, number, number] = [58, 155, 152];
const pdfPale: [number, number, number] = [241, 245, 249];
const pdfLine: [number, number, number] = [203, 213, 225];
const pdfInk: [number, number, number] = [15, 23, 42];

const viewTabs: Array<{ value: PtwView; label: string }> = [
  { value: "dashboard", label: "Dashboard" },
  { value: "register", label: "PTW Register" },
  { value: "create", label: "Create PTW" },
  { value: "template", label: "Template Layout" },
];

const workTypeOptions = [
  "General Work",
  "Hot Work",
  "Electrical",
  "High Voltage Isolation",
  "Pressure Testing",
  "Work at Height",
  "Lifting Operations",
  "Entry & Confined Space Work",
  "Other",
];

const precautionOptions = [
  "Safety Lines",
  "Hearing Protection",
  "Warning Signs",
  "Draining / Emptying",
  "Eye Protection",
  "Extinguisher",
  "Life Vest",
  "Radio / Comms",
  "Safety Helmet",
  "Fire Blanket",
  "Barriers",
  "WAH Rescue Plan",
  "Hand Protection",
  "Protective Clothing",
  "Toolbox Talk Attached",
  "Other",
];

const attachmentOptions = [
  "Risk Assessment",
  "Lift Plan",
  "Isolation Certificate",
  "Toolbox Talk",
  "Task Plan / Method Statement",
  "Equipment Certificates",
  "Photographs",
  "Other supporting evidence",
];

const blankSignature: SignatureBlock = {
  name: "",
  position: "",
  company: "",
  signature: "",
  date: "",
};

const blankExtension = (label: string): ExtensionBlock => ({
  id: label,
  label,
  extendedToTime: "",
  extendedToDate: "",
  extensionBy: { ...blankSignature },
  acceptedBy: { ...blankSignature },
});

const emptyForm: PtwForm = {
  id: "",
  ptwNumber: "PTW-001",
  status: "Draft",
  workTypes: [],
  otherWorkType: "",
  descriptionOfWork: "",
  equipmentTools: "",
  exactLocation: "",
  riskAssessment: "",
  liftPlan: "",
  isolationRequired: "",
  electricalIsolation: "",
  mechanicalIsolation: "",
  pressureIsolation: "",
  isolationDescription: "",
  precautions: [],
  otherPrecaution: "",
  checklistUsed: "",
  pteCondition: "",
  issuingAuthorityHours: "",
  startTime: "",
  startDate: "",
  endTime: "",
  endDate: "",
  issuedBy: { ...blankSignature },
  acceptedBy: { ...blankSignature },
  extensions: ["5A", "5B", "5C", "5D"].map(blankExtension),
  closurePerson: { ...blankSignature },
  closureAuthority: { ...blankSignature },
  attachments: [],
  notes: "",
};

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function clean(value: string | null | undefined) {
  return (value || "").trim();
}

function displayDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function displayDateTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatFileSize(size: number | null | undefined) {
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function sanitizeFileName(value: string) {
  return value.replace(/[^a-z0-9-_]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "PTW";
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function formatDateForReport(value: string) {
  return value ? displayDate(value) : "";
}

function signatureSummary(block: SignatureBlock) {
  return [
    ["Name", block.name],
    ["Position", block.position],
    ["Company", block.company],
    ["Date", formatDateForReport(block.date)],
    ["Signature / Confirmation", block.signature],
  ];
}

function checkboxMark(isChecked: boolean) {
  return isChecked ? "[X]" : "[ ]";
}

function selectedAnswer(value: YesNo) {
  return value || "";
}

const WORD_TABLE_WIDTH = 11160;

function chunkItems(values: string[], size: number) {
  const chunks: string[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

async function getLogoDataUrl() {
  const response = await fetch("/enshore-logo.png");
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function getLogoBytes() {
  const response = await fetch("/enshore-logo.png");
  return new Uint8Array(await response.arrayBuffer());
}

function nextPtwNumber(records: HsePtwRecord[]) {
  const highest = records.reduce((max, record) => {
    const match = (record.ptw_number || "").match(/PTW-(\d+)/i);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `PTW-${String(highest + 1).padStart(3, "0")}`;
}

function hydrateRecord(record: HsePtwRecord): PtwForm {
  return {
    id: record.id,
    ptwNumber: record.ptw_number || "",
    status: record.status || "Draft",
    workTypes: record.work_types || [],
    otherWorkType: record.other_work_type || "",
    descriptionOfWork: record.description_of_work || "",
    equipmentTools: record.equipment_tools || "",
    exactLocation: record.exact_location || "",
    riskAssessment: record.risk_assessment || "",
    liftPlan: record.lift_plan || "",
    isolationRequired: record.isolation_required || "",
    electricalIsolation: record.electrical_isolation || "",
    mechanicalIsolation: record.mechanical_isolation || "",
    pressureIsolation: record.pressure_isolation || "",
    isolationDescription: record.isolation_description || "",
    precautions: record.precautions || [],
    otherPrecaution: record.other_precaution || "",
    checklistUsed: record.checklist_used || "",
    pteCondition: record.pte_condition || "",
    issuingAuthorityHours: record.issuing_authority_hours || "",
    startTime: record.start_time || "",
    startDate: record.start_date || "",
    endTime: record.end_time || "",
    endDate: record.end_date || "",
    issuedBy: { ...blankSignature, ...(record.issued_by || {}) },
    acceptedBy: { ...blankSignature, ...(record.accepted_by || {}) },
    extensions: record.extensions?.length ? record.extensions.map((extension) => ({
      ...blankExtension(extension.label || extension.id || "5A"),
      ...extension,
      extensionBy: { ...blankSignature, ...(extension.extensionBy || {}) },
      acceptedBy: { ...blankSignature, ...(extension.acceptedBy || {}) },
    })) : ["5A", "5B", "5C", "5D"].map(blankExtension),
    closurePerson: { ...blankSignature, ...(record.closure_person || {}) },
    closureAuthority: { ...blankSignature, ...(record.closure_authority || {}) },
    attachments: record.attachments || [],
    notes: record.notes || "",
  };
}

export default function HsePermitToWorkPage() {
  const [activeView, setActiveView] = useState<PtwView>("dashboard");
  const [draft, setDraft] = useState<PtwForm>(emptyForm);
  const [records, setRecords] = useState<HsePtwRecord[]>([]);
  const [attachments, setAttachments] = useState<PtwAttachment[]>([]);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [peopleOptions, setPeopleOptions] = useState<PeopleOption[]>([]);
  const [statusMessage, setStatusMessage] = useState("Loading PTW records...");
  const [registerSearch, setRegisterSearch] = useState("");
  const [registerStatusFilter, setRegisterStatusFilter] = useState("");
  const [registerWorkTypeFilter, setRegisterWorkTypeFilter] = useState("");
  const [showRegisterFilters, setShowRegisterFilters] = useState(false);

  const selectedWorkTypes = useMemo(() => draft.workTypes.length || "0", [draft.workTypes.length]);
  const selectedPrecautions = useMemo(() => draft.precautions.length || "0", [draft.precautions.length]);
  const selectedRecord = useMemo(() => records.find((record) => record.id === selectedId) || null, [records, selectedId]);
  const openCount = records.filter((record) => !["Closed"].includes(record.status || "")).length;
  const issuedCount = records.filter((record) => ["Issued", "Extended"].includes(record.status || "")).length;
  const awaitingIssueCount = records.filter((record) => record.status === "Awaiting Issue").length;
  const closedCount = records.filter((record) => record.status === "Closed").length;
  const extensionCount = records.filter((record) => (record.extensions || []).some((extension) => clean(extension.extendedToDate) || clean(extension.extendedToTime))).length;
  const registerWorkTypeOptions = useMemo(() => {
    return Array.from(new Set(records.flatMap((record) => record.work_types || []).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [records]);
  const filteredRecords = useMemo(() => {
    const query = registerSearch.trim().toLowerCase();
    return records.filter((record) => {
      const searchable = [
        record.ptw_number,
        record.status,
        record.description_of_work,
        record.exact_location,
        record.issued_by?.name,
        record.accepted_by?.name,
        ...(record.work_types || []),
      ].filter(Boolean).join(" ").toLowerCase();
      const matchesSearch = !query || searchable.includes(query);
      const matchesStatus = !registerStatusFilter || record.status === registerStatusFilter;
      const matchesWorkType = !registerWorkTypeFilter || (record.work_types || []).includes(registerWorkTypeFilter);
      return matchesSearch && matchesStatus && matchesWorkType;
    });
  }, [records, registerSearch, registerStatusFilter, registerWorkTypeFilter]);
  const selectedAttachments = useMemo(() => {
    const currentId = selectedId || draft.id || "";
    return attachments.filter((attachment) => attachment.ptw_id === currentId);
  }, [attachments, draft.id, selectedId]);

  useEffect(() => {
    void loadRecords();
    void loadPeopleOptions();
  }, []);

  async function loadRecords() {
    const [recordRes, attachmentRes] = await Promise.all([
      supabase
        .from("hse_ptw_records")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("hse_ptw_attachments")
        .select("*")
        .order("uploaded_at", { ascending: false }),
    ]);

    if (recordRes.error) {
      setStatusMessage(`PTW table not ready: ${recordRes.error.message}. Run scripts/sql/hse_ptw.sql in Supabase.`);
      return;
    }

    if (attachmentRes.error) {
      setStatusMessage(`PTW attachments table not ready: ${attachmentRes.error.message}. Re-run scripts/sql/hse_ptw.sql in Supabase.`);
    } else {
      setAttachments((attachmentRes.data || []) as PtwAttachment[]);
    }

    const nextRecords = (recordRes.data || []) as HsePtwRecord[];
    setRecords(nextRecords);
    setStatusMessage(`Loaded ${nextRecords.length} PTW record${nextRecords.length === 1 ? "" : "s"} successfully.`);

    if (!selectedId && !draft.id) {
      setDraft((current) => ({ ...current, ptwNumber: nextPtwNumber(nextRecords) }));
    }
  }

  async function loadPeopleOptions() {
    const { data, error } = await supabase
      .from("people")
      .select("id,name,role,department,active")
      .eq("active", true)
      .order("name", { ascending: true });

    if (error) {
      setStatusMessage(`People selector warning: ${error.message}`);
      return;
    }

    setPeopleOptions((data || []) as PeopleOption[]);
  }

  function update<K extends keyof PtwForm>(key: K, value: PtwForm[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateSignature(block: "issuedBy" | "acceptedBy" | "closurePerson" | "closureAuthority", key: keyof SignatureBlock, value: string) {
    setDraft((current) => ({ ...current, [block]: { ...current[block], [key]: value } }));
  }

  function selectSignaturePerson(block: "issuedBy" | "acceptedBy" | "closurePerson" | "closureAuthority", personIdOrName: string) {
    const person = peopleOptions.find((item) => item.id === personIdOrName || item.name === personIdOrName);
    setDraft((current) => ({
      ...current,
      [block]: {
        ...current[block],
        name: person?.name || personIdOrName,
        position: person?.role || current[block].position || "",
      },
    }));
  }

  function updateExtension(index: number, block: "extensionBy" | "acceptedBy", key: keyof SignatureBlock, value: string) {
    setDraft((current) => ({
      ...current,
      extensions: current.extensions.map((extension, extensionIndex) =>
        extensionIndex === index ? { ...extension, [block]: { ...extension[block], [key]: value } } : extension,
      ),
    }));
  }

  function selectExtensionPerson(index: number, block: "extensionBy" | "acceptedBy", personIdOrName: string) {
    const person = peopleOptions.find((item) => item.id === personIdOrName || item.name === personIdOrName);
    setDraft((current) => ({
      ...current,
      extensions: current.extensions.map((extension, extensionIndex) =>
        extensionIndex === index
          ? {
              ...extension,
              [block]: {
                ...extension[block],
                name: person?.name || personIdOrName,
                position: person?.role || extension[block].position || "",
              },
            }
          : extension,
      ),
    }));
  }

  function updateExtensionMeta(index: number, key: "extendedToTime" | "extendedToDate", value: string) {
    setDraft((current) => ({
      ...current,
      extensions: current.extensions.map((extension, extensionIndex) =>
        extensionIndex === index ? { ...extension, [key]: value } : extension,
      ),
    }));
  }

  function buildPayload(record: PtwForm) {
    return {
      ptw_number: clean(record.ptwNumber) || nextPtwNumber(records),
      status: record.status,
      work_types: record.workTypes,
      other_work_type: clean(record.otherWorkType) || null,
      description_of_work: clean(record.descriptionOfWork) || null,
      equipment_tools: clean(record.equipmentTools) || null,
      exact_location: clean(record.exactLocation) || null,
      risk_assessment: clean(record.riskAssessment) || null,
      lift_plan: clean(record.liftPlan) || null,
      isolation_required: record.isolationRequired || null,
      electrical_isolation: record.electricalIsolation || null,
      mechanical_isolation: record.mechanicalIsolation || null,
      pressure_isolation: record.pressureIsolation || null,
      isolation_description: clean(record.isolationDescription) || null,
      precautions: record.precautions,
      other_precaution: clean(record.otherPrecaution) || null,
      checklist_used: record.checklistUsed || null,
      pte_condition: clean(record.pteCondition) || null,
      issuing_authority_hours: clean(record.issuingAuthorityHours) || null,
      start_time: clean(record.startTime) || null,
      start_date: clean(record.startDate) || null,
      end_time: clean(record.endTime) || null,
      end_date: clean(record.endDate) || null,
      issued_by: record.issuedBy,
      accepted_by: record.acceptedBy,
      extensions: record.extensions,
      closure_person: record.closurePerson,
      closure_authority: record.closureAuthority,
      attachments: record.attachments,
      notes: clean(record.notes) || null,
      updated_at: new Date().toISOString(),
    };
  }

  async function savePtw() {
    const payload = buildPayload({ ...draft, ptwNumber: clean(draft.ptwNumber) || nextPtwNumber(records) });

    if (selectedId || draft.id) {
      const targetId = selectedId || draft.id;
      const { error } = await supabase.from("hse_ptw_records").update(payload).eq("id", targetId);
      if (error) {
        setStatusMessage(`PTW update failed: ${error.message}`);
        return;
      }
      if (targetId && pendingAttachments.length) {
        await uploadPendingAttachments(targetId);
      }
      setStatusMessage(`${payload.ptw_number} updated successfully.`);
      await loadRecords();
      return;
    }

    const { data, error } = await supabase.from("hse_ptw_records").insert([payload]).select("*").single();
    if (error) {
      setStatusMessage(`PTW save failed: ${error.message}`);
      return;
    }

    const created = data as HsePtwRecord;
    setSelectedId(created.id);
    setDraft(hydrateRecord(created));
    if (pendingAttachments.length) {
      await uploadPendingAttachments(created.id);
    }
    setActiveView("create");
    setStatusMessage(`${created.ptw_number} saved successfully.`);
    await loadRecords();
  }

  async function deletePtw() {
    if (!selectedRecord) return;
    const confirmed = window.confirm(`Delete ${selectedRecord.ptw_number}? This removes the saved PTW record.`);
    if (!confirmed) return;

    const { error } = await supabase.from("hse_ptw_records").delete().eq("id", selectedRecord.id);
    if (error) {
      setStatusMessage(`PTW delete failed: ${error.message}`);
      return;
    }

    setSelectedId("");
    setDraft({ ...emptyForm, ptwNumber: nextPtwNumber(records.filter((record) => record.id !== selectedRecord.id)) });
    setStatusMessage(`${selectedRecord.ptw_number} deleted.`);
    await loadRecords();
  }

  function selectRecord(record: HsePtwRecord) {
    setSelectedId(record.id);
    setDraft(hydrateRecord(record));
    setPendingAttachments([]);
    setActiveView("create");
    setStatusMessage(`${record.ptw_number} loaded for edit.`);
  }

  function startNewPtw() {
    setSelectedId("");
    setDraft({ ...emptyForm, ptwNumber: nextPtwNumber(records) });
    setPendingAttachments([]);
    setActiveView("create");
    setStatusMessage("New PTW draft ready.");
  }

  async function uploadAttachmentFiles(ptwId: string, files: Array<{ file: File; attachmentType: string }>) {
    for (const item of files) {
      const safeName = `${Date.now()}-${sanitizeFileName(item.file.name)}`;
      const path = `hse-ptw/${ptwId}/${safeName}`;
      const upload = await supabase.storage.from(evidenceBucket).upload(path, item.file, { upsert: false, contentType: item.file.type || undefined });
      if (upload.error) {
        setStatusMessage(`PTW attachment upload failed: ${upload.error.message}`);
        return false;
      }
      const insert = await supabase.from("hse_ptw_attachments").insert([{
        ptw_id: ptwId,
        attachment_type: item.attachmentType,
        file_name: item.file.name,
        file_path: path,
        file_size: item.file.size,
        content_type: item.file.type || null,
      }]);
      if (insert.error) {
        setStatusMessage(`PTW attachment record failed: ${insert.error.message}`);
        return false;
      }
    }
    return true;
  }

  async function uploadPendingAttachments(ptwId: string) {
    const ok = await uploadAttachmentFiles(ptwId, pendingAttachments.map((item) => ({ file: item.file, attachmentType: item.attachmentType })));
    if (ok) setPendingAttachments([]);
  }

  async function handleAttachmentUpload(attachmentType: string, event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;

    const ptwId = selectedId || draft.id || "";
    if (!ptwId) {
      setPendingAttachments((current) => [
        ...current,
        ...files.map((file) => ({ id: `${attachmentType}-${file.name}-${Date.now()}-${Math.random()}`, attachmentType, file })),
      ]);
      setStatusMessage(`${files.length} attachment file${files.length === 1 ? "" : "s"} queued. Save PTW to upload.`);
      return;
    }

    setUploadingAttachment(attachmentType);
    const ok = await uploadAttachmentFiles(ptwId, files.map((file) => ({ file, attachmentType })));
    setUploadingAttachment("");
    if (ok) {
      setStatusMessage(`${files.length} attachment file${files.length === 1 ? "" : "s"} uploaded for ${attachmentType}.`);
      await loadRecords();
    }
  }

  async function deleteAttachment(attachment: PtwAttachment) {
    const confirmed = window.confirm(`Delete ${attachment.file_name}?`);
    if (!confirmed) return;
    await supabase.storage.from(evidenceBucket).remove([attachment.file_path]);
    const { error } = await supabase.from("hse_ptw_attachments").delete().eq("id", attachment.id);
    if (error) {
      setStatusMessage(`Attachment delete failed: ${error.message}`);
      return;
    }
    await loadRecords();
    setStatusMessage("PTW attachment deleted.");
  }

  async function createSignedAttachmentLinks() {
    const rows = await Promise.all(
      selectedAttachments.map(async (attachment) => {
        const { data } = await supabase.storage.from(evidenceBucket).createSignedUrl(attachment.file_path, 3600);
        return {
          attachmentType: attachment.attachment_type,
          fileName: attachment.file_name,
          fileSize: attachment.file_size,
          uploadedAt: attachment.uploaded_at,
          url: data?.signedUrl || "",
        };
      }),
    );
    return rows;
  }

  function reportRows(record: PtwForm) {
    return {
      details: [
        ["PTW No.", record.ptwNumber],
        ["Status", record.status],
        ["Start", [formatDateForReport(record.startDate), record.startTime].filter(Boolean).join(" ")],
        ["End", [formatDateForReport(record.endDate), record.endTime].filter(Boolean).join(" ")],
      ],
      description: [
        ["Description of Work", record.descriptionOfWork],
        ["Equipment / Tools to be Used", record.equipmentTools],
        ["Exact Location / System", record.exactLocation],
      ],
      precautions: [
        ["Risk Assessment", record.riskAssessment],
        ["Lift Plan", record.liftPlan],
        ["Isolation Required", record.isolationRequired],
        ["Electrical Isolation", record.electricalIsolation],
        ["Mechanical Isolation", record.mechanicalIsolation],
        ["Pressure Isolation", record.pressureIsolation],
        ["Description of Isolation", record.isolationDescription],
        ["Other Precaution", record.otherPrecaution],
        ["Checklist Used", record.checklistUsed],
        ["Condition of PTE", record.pteCondition],
        ["Hours by Issuing Authority", record.issuingAuthorityHours],
      ],
      issue: [
        ...signatureSummary(record.issuedBy).map(([field, value]) => [`Issued by - ${field}`, value]),
        ...signatureSummary(record.acceptedBy).map(([field, value]) => [`Accepted by - ${field}`, value]),
      ],
      closure: [
        ...signatureSummary(record.closurePerson).map(([field, value]) => [`Person performing work - ${field}`, value]),
        ...signatureSummary(record.closureAuthority).map(([field, value]) => [`PTW issuing authority - ${field}`, value]),
      ],
      attachments: [
        ["Attachments", record.attachments.join(", ")],
        ["Notes / Evidence References", record.notes],
      ],
    };
  }

  function addPdfTable(doc: jsPDF, y: number, title: string, rows: string[][]) {
    doc.setFillColor(...pdfBrand);
    doc.rect(14, y, 182, 9, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(title, 17, y + 6);

    autoTable(doc, {
      startY: y + 12,
      head: [["Field", "Details"]],
      body: rows.map(([field, value]) => [field, value || ""]),
      theme: "grid",
      styles: { fontSize: 8.5, cellPadding: 2.4, lineColor: pdfLine, lineWidth: 0.2, valign: "middle", textColor: pdfInk },
      headStyles: { fillColor: pdfPale, textColor: pdfInk, fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 54, fontStyle: "bold", fillColor: pdfPale }, 1: { cellWidth: 128, fillColor: [255, 255, 255] } },
      margin: { left: 14, right: 14 },
    });
    return ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y + 28) + 10;
  }

  function addPdfCheckboxGrid(doc: jsPDF, y: number, title: string, values: string[], selected: string[], columns = 3) {
    doc.setFillColor(...pdfBrand);
    doc.rect(14, y, 182, 9, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(title, 17, y + 6);

    const checkWidth = 12;
    const labelWidth = (182 / columns) - checkWidth;
    const columnStyles = Array.from({ length: columns * 2 }).reduce<Record<number, { cellWidth: number; halign?: "center"; fontStyle?: "bold" }>>((styles, _item, index) => {
      const isCheckColumn = index % 2 === 0;
      styles[index] = isCheckColumn
        ? { cellWidth: checkWidth, halign: "center" }
        : { cellWidth: labelWidth };
      return styles;
    }, {});

    const body = chunkItems(values, columns).map((row) => {
      const cells = [...row];
      while (cells.length < columns) cells.push("");
      return cells.flatMap((item) => (item ? [checkboxMark(selected.includes(item)), item] : ["", ""]));
    });

    autoTable(doc, {
      startY: y + 12,
      body,
      theme: "grid",
      styles: { fontSize: 8.5, cellPadding: 2.5, lineColor: pdfLine, lineWidth: 0.2, valign: "middle", textColor: pdfInk },
      bodyStyles: { fillColor: [255, 255, 255], textColor: pdfInk },
      columnStyles,
      didParseCell: (data) => {
        if (data.section === "body" && data.cell.raw === "[X]") {
          data.cell.styles.fontStyle = "bold";
        }
      },
      margin: { left: 14, right: 14 },
    });

    return ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y + 28) + 10;
  }

  function addPdfSection3(doc: jsPDF, y: number) {
    doc.setFillColor(...pdfBrand);
    doc.rect(14, y, 182, 9, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Section 3 - Preparation and Precautions to be Undertaken", 17, y + 6);

    const precautionRows = chunkItems(precautionOptions, 3).map((row) => {
      const cells = [...row];
      while (cells.length < 3) cells.push("");
      return cells.flatMap((item) => (item ? [checkboxMark(draft.precautions.includes(item)), item] : ["", ""]));
    });

    autoTable(doc, {
      startY: y + 12,
      body: [
        [{ content: "Risk Assessment", colSpan: 2, styles: { fillColor: pdfPale, fontStyle: "bold" } }, { content: draft.riskAssessment || "", colSpan: 4, styles: { fillColor: [255, 255, 255] } }],
        [{ content: "Lift Plan", colSpan: 2, styles: { fillColor: pdfPale, fontStyle: "bold" } }, { content: draft.liftPlan || "", colSpan: 4, styles: { fillColor: [255, 255, 255] } }],
        [{ content: "Isolation Required", colSpan: 2, styles: { fillColor: pdfPale, fontStyle: "bold" } }, selectedAnswer(draft.isolationRequired), { content: "Electrical", colSpan: 2, styles: { fillColor: pdfPale, fontStyle: "bold" } }, selectedAnswer(draft.electricalIsolation)],
        [{ content: "Mechanical", colSpan: 2, styles: { fillColor: pdfPale, fontStyle: "bold" } }, selectedAnswer(draft.mechanicalIsolation), { content: "Pressure", colSpan: 2, styles: { fillColor: pdfPale, fontStyle: "bold" } }, selectedAnswer(draft.pressureIsolation)],
        [{ content: "Description of Isolation", colSpan: 2, styles: { fillColor: pdfPale, fontStyle: "bold" } }, { content: draft.isolationDescription || "", colSpan: 4, styles: { fillColor: [255, 255, 255] } }],
        ...precautionRows,
        [checkboxMark(draft.precautions.includes("Other")), "Other (Please State)", { content: draft.otherPrecaution || "", colSpan: 4 }],
        [
          { content: "Check List Used?", styles: { fillColor: pdfPale, fontStyle: "bold" } },
          selectedAnswer(draft.checklistUsed),
          { content: "Condition of PTE to be Inspected", styles: { fillColor: pdfPale, fontStyle: "bold" } },
          draft.pteCondition || "",
          { content: "Hrs. by Issuing Authority", styles: { fillColor: pdfPale, fontStyle: "bold" } },
          draft.issuingAuthorityHours || "",
        ],
      ],
      theme: "grid",
      styles: { fontSize: 8.2, cellPadding: 2.3, lineColor: pdfLine, lineWidth: 0.2, valign: "middle", textColor: pdfInk, fillColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 30, fontStyle: "bold", fillColor: pdfPale },
        1: { cellWidth: 31 },
        2: { cellWidth: 30, fontStyle: "bold", fillColor: pdfPale },
        3: { cellWidth: 31 },
        4: { cellWidth: 30, fontStyle: "bold", fillColor: pdfPale },
        5: { cellWidth: 30 },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.cell.raw === "[X]") {
          data.cell.styles.fontStyle = "bold";
        }
        if (data.section === "body" && (data.cell.raw === "Yes" || data.cell.raw === "No")) {
          data.cell.styles.fontStyle = "bold";
        }
        if (data.section === "body" && (data.column.index === 0 || data.column.index === 2 || data.column.index === 4) && data.cell.raw === "[ ]") {
          data.cell.styles.fontStyle = "normal";
          data.cell.styles.halign = "center";
        }
        if (data.section === "body" && (data.cell.raw === "[X]" || data.cell.raw === "[ ]")) {
          data.cell.styles.halign = "center";
          data.cell.styles.fillColor = [255, 255, 255];
        }
      },
      margin: { left: 14, right: 14 },
    });

    return ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y + 28) + 10;
  }

  function addPdfSection4(doc: jsPDF, y: number) {
    doc.setFillColor(...pdfBrand);
    doc.rect(14, y, 182, 9, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Section 4 - Permit to Work Issue / Acceptance", 17, y + 6);

    autoTable(doc, {
      startY: y + 12,
      body: [
        ["Start Time / Date", [draft.startTime, formatDateForReport(draft.startDate)].filter(Boolean).join(" "), "End Time / Date", [draft.endTime, formatDateForReport(draft.endDate)].filter(Boolean).join(" ")],
      ],
      theme: "grid",
      styles: { fontSize: 8.5, cellPadding: 2.3, lineColor: pdfLine, lineWidth: 0.2, valign: "middle", textColor: pdfInk },
      columnStyles: { 0: { cellWidth: 45, fontStyle: "bold", fillColor: pdfPale }, 1: { cellWidth: 46 }, 2: { cellWidth: 45, fontStyle: "bold", fillColor: pdfPale }, 3: { cellWidth: 46 } },
      margin: { left: 14, right: 14 },
    });

    autoTable(doc, {
      startY: ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y + 28) + 3,
      head: [["Role", "Name", "Signature / Confirmation", "Position", "Date"]],
      body: [
        ["Permit Issued by Authorised Person", draft.issuedBy.name, draft.issuedBy.signature, draft.issuedBy.position, formatDateForReport(draft.issuedBy.date)],
        ["Permit Accepted By", draft.acceptedBy.name, draft.acceptedBy.signature, draft.acceptedBy.position, formatDateForReport(draft.acceptedBy.date)],
      ],
      theme: "grid",
      styles: { fontSize: 8.2, cellPadding: 2.3, lineColor: pdfLine, lineWidth: 0.2, valign: "middle", textColor: pdfInk },
      headStyles: { fillColor: pdfPale, textColor: pdfInk, fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 48, fontStyle: "bold" }, 1: { cellWidth: 36 }, 2: { cellWidth: 48 }, 3: { cellWidth: 30 }, 4: { cellWidth: 20 } },
      margin: { left: 14, right: 14 },
    });

    return ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y + 50) + 10;
  }

  function addPdfExtensionSection(doc: jsPDF, y: number, extension: ExtensionBlock) {
    doc.setFillColor(...pdfBrand);
    doc.rect(14, y, 182, 9, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`Section ${extension.label} - Permit Extension`, 17, y + 6);

    autoTable(doc, {
      startY: y + 12,
      body: [["PTW Extended To", [extension.extendedToTime, formatDateForReport(extension.extendedToDate)].filter(Boolean).join(" ")]],
      theme: "grid",
      styles: { fontSize: 8.5, cellPadding: 2.3, lineColor: pdfLine, lineWidth: 0.2, valign: "middle", textColor: pdfInk },
      columnStyles: { 0: { cellWidth: 45, fontStyle: "bold", fillColor: pdfPale }, 1: { cellWidth: 137 } },
      margin: { left: 14, right: 14 },
    });

    autoTable(doc, {
      startY: ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y + 26) + 3,
      head: [["Role", "Name", "Position", "Company", "Signature"]],
      body: [
        ["Permit Extension by Authorised Person", extension.extensionBy.name, extension.extensionBy.position, extension.extensionBy.company, extension.extensionBy.signature],
        ["Permit Accepted By", extension.acceptedBy.name, extension.acceptedBy.position, extension.acceptedBy.company, extension.acceptedBy.signature],
      ],
      theme: "grid",
      styles: { fontSize: 8.2, cellPadding: 2.3, lineColor: pdfLine, lineWidth: 0.2, valign: "middle", textColor: pdfInk },
      headStyles: { fillColor: pdfPale, textColor: pdfInk, fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 52, fontStyle: "bold" }, 1: { cellWidth: 34 }, 2: { cellWidth: 34 }, 3: { cellWidth: 30 }, 4: { cellWidth: 32 } },
      margin: { left: 14, right: 14 },
    });

    return ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y + 48) + 10;
  }

  function addPdfSection5Closure(doc: jsPDF, y: number) {
    doc.setFillColor(...pdfBrand);
    doc.rect(14, y, 182, 9, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Section 5E - Permit Closure by Site Manager / Designate", 17, y + 6);

    autoTable(doc, {
      startY: y + 12,
      body: [["Closure Confirmation", "All work complete / suspended, tags and key returned, and area checked as safe and tidy."]],
      theme: "grid",
      styles: { fontSize: 8.5, cellPadding: 2.3, lineColor: pdfLine, lineWidth: 0.2, valign: "middle", textColor: pdfInk },
      columnStyles: { 0: { cellWidth: 45, fontStyle: "bold", fillColor: pdfPale }, 1: { cellWidth: 137 } },
      margin: { left: 14, right: 14 },
    });

    autoTable(doc, {
      startY: ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y + 26) + 3,
      head: [["Role", "Name", "Position", "Date", "Signature"]],
      body: [
        ["Person Performing the Work", draft.closurePerson.name, draft.closurePerson.position, formatDateForReport(draft.closurePerson.date), draft.closurePerson.signature],
        ["PTW Issuing Authority", draft.closureAuthority.name, draft.closureAuthority.position, formatDateForReport(draft.closureAuthority.date), draft.closureAuthority.signature],
      ],
      theme: "grid",
      styles: { fontSize: 8.2, cellPadding: 2.3, lineColor: pdfLine, lineWidth: 0.2, valign: "middle", textColor: pdfInk },
      headStyles: { fillColor: pdfPale, textColor: pdfInk, fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 52, fontStyle: "bold" }, 1: { cellWidth: 34 }, 2: { cellWidth: 40 }, 3: { cellWidth: 24 }, 4: { cellWidth: 32 } },
      margin: { left: 14, right: 14 },
    });

    return ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y + 50) + 10;
  }

  function addPdfAttachmentsDistribution(doc: jsPDF, y: number, attachmentLinks: AttachmentWithUrl[]) {
    const attachmentRows = draft.attachments.length
      ? draft.attachments.flatMap((attachmentType) => {
          const files = attachmentLinks.filter((item) => item.attachmentType === attachmentType);
          if (!files.length) return [{ label: attachmentType, detail: "No uploaded document", url: "" }];
          return files.map((file) => ({
            label: attachmentType,
            detail: `${file.fileName}${file.fileSize ? ` (${formatFileSize(file.fileSize)})` : ""}${file.uploadedAt ? ` - Uploaded ${displayDateTime(file.uploadedAt)}` : ""}`,
            url: file.url,
          }));
        })
      : [{ label: "Attachments", detail: "No attachments selected", url: "" }];
    const rows = [
      ...attachmentRows,
      { label: "Notes / Evidence References", detail: draft.notes || "", url: "" },
    ];
    doc.setFillColor(...pdfBrand);
    doc.rect(14, y, 182, 9, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Attachments and Distribution", 17, y + 6);

    autoTable(doc, {
      startY: y + 12,
      head: [["Attachment / Distribution", "Uploaded Document / Details", "Link"]],
      body: [
        ...rows.map((row) => [row.label, row.detail, row.url ? "Open document" : ""]),
        [{ content: "PTW Distribution: Original - Issuing Authority; 1st Copy - Displayed at Work Location; 2nd Copy - At Isolation Point.\nChecklists to be attached to Original PTW.\nAll Copies to be returned to Issuing Authority on completion.", colSpan: 3 }],
      ],
      theme: "grid",
      styles: { fontSize: 8.2, cellPadding: 2.3, lineColor: pdfLine, lineWidth: 0.2, valign: "middle", overflow: "linebreak", textColor: pdfInk },
      headStyles: { fillColor: pdfPale, textColor: pdfInk, fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 48, fontStyle: "bold" }, 1: { cellWidth: 96 }, 2: { cellWidth: 38, textColor: [37, 99, 235], fontStyle: "bold" } },
      margin: { left: 14, right: 14 },
      didDrawCell: (data) => {
        if (data.section !== "body" || data.column.index !== 2) return;
        const row = rows[data.row.index];
        if (!row?.url) return;
        doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: row.url });
      },
    });

    return ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y + 30) + 10;
  }

  async function generatePdf() {
    const rows = reportRows(draft);
    const attachmentLinks = await createSignedAttachmentLinks();
    const logoDataUrl = await getLogoDataUrl();
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    doc.addImage(logoDataUrl, "PNG", 14, 10, 32, 17);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(draft.ptwNumber || "PTW", 178, 18, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }), 178, 25, { align: "right" });
    doc.setDrawColor(58, 155, 152);
    doc.setLineWidth(0.7);
    doc.line(14, 33, 196, 33);

    let y = 40;
    y = addPdfTable(doc, y, "Permit Details", rows.details);
    y = addPdfCheckboxGrid(doc, y, "Section 1 - Work Type (tick as applicable)", workTypeOptions, draft.workTypes, 3);
    if (draft.workTypes.includes("Other") && clean(draft.otherWorkType)) {
      y = addPdfTable(doc, y, "Section 1 - Other Work Type", [["Other Work Type", draft.otherWorkType]]);
    }
    y = addPdfTable(doc, y, "Section 2 - Description of Work", rows.description);
    y = addPdfSection3(doc, y);
    y = addPdfSection4(doc, y);

    draft.extensions.forEach((extension) => {
      const hasExtension = clean(extension.extendedToDate) || clean(extension.extendedToTime) || clean(extension.extensionBy.name) || clean(extension.acceptedBy.name);
      if (!hasExtension) return;
      if (y > 246) {
        doc.addPage();
        y = 18;
      }
      y = addPdfExtensionSection(doc, y, extension);
    });

    if (y > 220) {
      doc.addPage();
      y = 18;
    }
    y = addPdfSection5Closure(doc, y);
    if (y > 236) {
      doc.addPage();
      y = 18;
    }
    addPdfAttachmentsDistribution(doc, y, attachmentLinks);

    const pages = doc.getNumberOfPages();
    for (let page = 1; page <= pages; page += 1) {
      doc.setPage(page);
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("ENS-HSEQ-FRM-010", 14, 287);
      doc.text(`Page ${page} of ${pages}`, 181, 287);
    }

    doc.save(`${sanitizeFileName(draft.ptwNumber || "PTW")}-permit-to-work.pdf`);
    setStatusMessage(`Generated PDF for ${draft.ptwNumber || "PTW"}.`);
  }

  function wordRun(text: string, options: { bold?: boolean; color?: string; size?: number } = {}) {
    return new TextRun({
      text,
      bold: options.bold,
      color: options.color || "0F172A",
      size: options.size || 20,
      font: "Calibri",
    });
  }

  function wordCell(text: string, options: { bold?: boolean; fill?: string; color?: string; width?: number; columnSpan?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) {
    return new TableCell({
      width: options.width ? { size: options.width, type: WidthType.DXA } : undefined,
      columnSpan: options.columnSpan,
      verticalAlign: VerticalAlign.CENTER,
      shading: options.fill ? { fill: options.fill } : undefined,
      margins: { top: 120, bottom: 120, left: 140, right: 140 },
      borders: {
        top: { style: BorderStyle.SINGLE, color: "CBD5E1", size: 2 },
        bottom: { style: BorderStyle.SINGLE, color: "CBD5E1", size: 2 },
        left: { style: BorderStyle.SINGLE, color: "CBD5E1", size: 2 },
        right: { style: BorderStyle.SINGLE, color: "CBD5E1", size: 2 },
      },
      children: [
        new Paragraph({
          alignment: options.align,
          spacing: { before: 0, after: 0 },
          children: [wordRun(text || "", { bold: options.bold, color: options.color, size: options.fill === "3A9B98" ? 22 : 19 })],
        }),
      ],
    });
  }

  function wordTitleTable(logoBytes: Uint8Array) {
    return new Table({
      width: { size: WORD_TABLE_WIDTH, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      alignment: AlignmentType.CENTER,
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE },
      },
      rows: [
        new TableRow({
          height: { value: 900, rule: HeightRule.ATLEAST },
          children: [
            new TableCell({
              width: { size: 2400, type: WidthType.DXA },
              borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
              children: [
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: logoBytes,
                      transformation: { width: 104, height: 54 },
                      type: "png",
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: WORD_TABLE_WIDTH - 4800, type: WidthType.DXA },
              borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 80 },
                  children: [wordRun("", { bold: true, color: "0F172A", size: 20 })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 2400, type: WidthType.DXA },
              borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
              children: [
                new Paragraph({ alignment: AlignmentType.RIGHT, children: [wordRun(draft.ptwNumber || "PTW", { color: "64748B", size: 18 })] }),
                new Paragraph({ alignment: AlignmentType.RIGHT, children: [wordRun(new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }), { color: "64748B", size: 18 })] }),
              ],
            }),
          ],
        }),
        new TableRow({
          height: { value: 18, rule: HeightRule.EXACT },
          children: [
            new TableCell({
              width: { size: WORD_TABLE_WIDTH, type: WidthType.DXA },
              columnSpan: 3,
              shading: { fill: "3A9B98" },
              margins: { top: 0, bottom: 0, left: 0, right: 0 },
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
              },
              children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [wordRun(" ", { color: "3A9B98", size: 1 })] })],
            }),
          ],
        }),
      ],
    });
  }

  function wordSection(title: string, rows: string[][]) {
    return [
      new Table({
        width: { size: WORD_TABLE_WIDTH, type: WidthType.DXA },
        layout: TableLayoutType.FIXED,
        rows: [
          new TableRow({
            children: [wordCell(title, { bold: true, fill: "3A9B98", color: "FFFFFF", width: WORD_TABLE_WIDTH, columnSpan: 2 })],
          }),
          new TableRow({
            children: [
              wordCell("Field", { bold: true, fill: "F1F5F9", width: 3000 }),
              wordCell("Details", { bold: true, fill: "F1F5F9", width: 7440 }),
            ],
          }),
          ...rows.map(([field, value]) => new TableRow({ children: [wordCell(field, { bold: true, width: 3000 }), wordCell(value || "", { width: 7440 })] })),
        ],
      }),
      new Paragraph({ spacing: { after: 160 }, children: [] }),
    ];
  }

  function wordAttachmentsDistributionSection(attachmentLinks: AttachmentWithUrl[]) {
    const attachmentRows = draft.attachments.length
      ? draft.attachments.flatMap((attachmentType) => {
          const files = attachmentLinks.filter((item) => item.attachmentType === attachmentType);
          if (!files.length) return [{ label: attachmentType, detail: "No uploaded document", url: "" }];
          return files.map((file) => ({
            label: attachmentType,
            detail: `${file.fileName}${file.fileSize ? ` (${formatFileSize(file.fileSize)})` : ""}${file.uploadedAt ? ` - Uploaded ${displayDateTime(file.uploadedAt)}` : ""}`,
            url: file.url,
          }));
        })
      : [{ label: "Attachments", detail: "No attachments selected", url: "" }];
    const rows = [
      ...attachmentRows,
      { label: "Notes / Evidence References", detail: draft.notes || "", url: "" },
    ];
    return [
      new Table({
        width: { size: WORD_TABLE_WIDTH, type: WidthType.DXA },
        layout: TableLayoutType.FIXED,
        rows: [
          new TableRow({ children: [wordCell("Attachments and Distribution", { bold: true, fill: "3A9B98", color: "FFFFFF", width: WORD_TABLE_WIDTH, columnSpan: 3 })] }),
          new TableRow({
            children: [
              wordCell("Attachment / Distribution", { bold: true, fill: "F1F5F9", width: 2800 }),
              wordCell("Uploaded Document / Details", { bold: true, fill: "F1F5F9", width: 5600 }),
              wordCell("Link", { bold: true, fill: "F1F5F9", width: 2040 }),
            ],
          }),
          ...rows.map((item) => new TableRow({
                children: [
                  wordCell(item.label, { bold: true, width: 2800 }),
                  wordCell(item.detail, { width: 5600 }),
                  new TableCell({
                    width: { size: 2040, type: WidthType.DXA },
                    verticalAlign: VerticalAlign.CENTER,
                    margins: { top: 120, bottom: 120, left: 140, right: 140 },
                    borders: {
                      top: { style: BorderStyle.SINGLE, color: "CBD5E1", size: 2 },
                      bottom: { style: BorderStyle.SINGLE, color: "CBD5E1", size: 2 },
                      left: { style: BorderStyle.SINGLE, color: "CBD5E1", size: 2 },
                      right: { style: BorderStyle.SINGLE, color: "CBD5E1", size: 2 },
                    },
                    children: [
                      new Paragraph({
                        children: item.url
                          ? [new ExternalHyperlink({ link: item.url, children: [wordRun("Open document", { bold: true, color: "2563EB", size: 18 })] })]
                          : [wordRun("", { size: 18 })],
                      }),
                    ],
                  }),
                ],
              })),
          new TableRow({
            children: [
              wordCell(
                "PTW Distribution: Original - Issuing Authority; 1st Copy - Displayed at Work Location; 2nd Copy - At Isolation Point.\nChecklists to be attached to Original PTW.\nAll Copies to be returned to Issuing Authority on completion.",
                { fill: "E2E8F0", width: WORD_TABLE_WIDTH, columnSpan: 3 },
              ),
            ],
          }),
        ],
      }),
      new Paragraph({ spacing: { after: 160 }, children: [] }),
    ];
  }

  function wordCheckboxSection(title: string, values: string[], selected: string[], columns = 3) {
    const checkboxWidth = 620;
    const labelWidth = Math.floor((WORD_TABLE_WIDTH - (checkboxWidth * columns)) / columns);
    return [
      new Table({
        width: { size: WORD_TABLE_WIDTH, type: WidthType.DXA },
        layout: TableLayoutType.FIXED,
        rows: [
          new TableRow({
            children: [wordCell(title, { bold: true, fill: "3A9B98", color: "FFFFFF", width: WORD_TABLE_WIDTH, columnSpan: columns * 2 })],
          }),
          ...chunkItems(values, columns).map((row) => {
            const cells = [...row];
            while (cells.length < columns) cells.push("");
            return new TableRow({
              children: cells.flatMap((item) => {
                const checked = selected.includes(item);
                return [
                  wordCell(item ? checkboxMark(checked) : "", { width: checkboxWidth, align: AlignmentType.CENTER, bold: checked }),
                  wordCell(item, { width: labelWidth }),
                ];
              }),
            });
          }),
        ],
      }),
      new Paragraph({ spacing: { after: 160 }, children: [] }),
    ];
  }

  function wordSection3() {
    const checkboxWidth = 520;
    const labelWidth = 2960;
    const rows: TableRow[] = [
      new TableRow({ children: [wordCell("Section 3 - Preparation and Precautions to be Undertaken", { bold: true, fill: "3A9B98", color: "FFFFFF", width: WORD_TABLE_WIDTH, columnSpan: 6 })] }),
      new TableRow({
        children: [
          wordCell("Risk Assessment", { bold: true, fill: "F1F5F9", width: 3000, columnSpan: 2 }),
          wordCell(draft.riskAssessment || "", { width: 7440, columnSpan: 4 }),
        ],
      }),
      new TableRow({
        children: [
          wordCell("Lift Plan", { bold: true, fill: "F1F5F9", width: 3000, columnSpan: 2 }),
          wordCell(draft.liftPlan || "", { width: 7440, columnSpan: 4 }),
        ],
      }),
      new TableRow({
        children: [
          wordCell("Isolation Required", { bold: true, fill: "F1F5F9", width: 3000, columnSpan: 2 }),
          wordCell(selectedAnswer(draft.isolationRequired), { bold: Boolean(draft.isolationRequired), width: 2220 }),
          wordCell("Electrical", { bold: true, fill: "F1F5F9", width: 3000, columnSpan: 2 }),
          wordCell(selectedAnswer(draft.electricalIsolation), { bold: Boolean(draft.electricalIsolation), width: 2220 }),
        ],
      }),
      new TableRow({
        children: [
          wordCell("Mechanical", { bold: true, fill: "F1F5F9", width: 3000, columnSpan: 2 }),
          wordCell(selectedAnswer(draft.mechanicalIsolation), { bold: Boolean(draft.mechanicalIsolation), width: 2220 }),
          wordCell("Pressure", { bold: true, fill: "F1F5F9", width: 3000, columnSpan: 2 }),
          wordCell(selectedAnswer(draft.pressureIsolation), { bold: Boolean(draft.pressureIsolation), width: 2220 }),
        ],
      }),
      new TableRow({
        children: [
          wordCell("Description of Isolation", { bold: true, fill: "F1F5F9", width: 3000, columnSpan: 2 }),
          wordCell(draft.isolationDescription || "", { width: 7440, columnSpan: 4 }),
        ],
      }),
    ];

    chunkItems(precautionOptions.filter((item) => item !== "Other"), 3).forEach((row) => {
      const cells = [...row];
      while (cells.length < 3) cells.push("");
      rows.push(
        new TableRow({
          children: cells.flatMap((item) => [
            wordCell(item ? checkboxMark(draft.precautions.includes(item)) : "", { width: checkboxWidth, align: AlignmentType.CENTER, bold: draft.precautions.includes(item) }),
            wordCell(item, { width: labelWidth }),
          ]),
        }),
      );
    });

    rows.push(
      new TableRow({
        children: [
          wordCell(checkboxMark(draft.precautions.includes("Other")), { width: checkboxWidth, align: AlignmentType.CENTER, bold: draft.precautions.includes("Other") }),
          wordCell("Other (Please State)", { bold: true, width: labelWidth }),
          wordCell(draft.otherPrecaution || "", { width: 6960, columnSpan: 4 }),
        ],
      }),
      new TableRow({
        children: [
          wordCell("Check List Used?", { bold: true, fill: "F1F5F9", width: 1760 }),
          wordCell(selectedAnswer(draft.checklistUsed), { bold: Boolean(draft.checklistUsed), width: 1180 }),
          wordCell("Condition of PTE to be Inspected", { bold: true, fill: "F1F5F9", width: 3060 }),
          wordCell(draft.pteCondition || "", { width: 1700 }),
          wordCell("Hrs. by Issuing Authority", { bold: true, fill: "F1F5F9", width: 2500 }),
          wordCell(draft.issuingAuthorityHours || "", { width: 960 }),
        ],
      }),
    );

    return [
      new Table({
        width: { size: WORD_TABLE_WIDTH, type: WidthType.DXA },
        layout: TableLayoutType.FIXED,
        rows,
      }),
      new Paragraph({ spacing: { after: 160 }, children: [] }),
    ];
  }

  function wordSection4() {
    return [
      new Table({
        width: { size: WORD_TABLE_WIDTH, type: WidthType.DXA },
        layout: TableLayoutType.FIXED,
        rows: [
          new TableRow({ children: [wordCell("Section 4 - Permit to Work Issue / Acceptance (maximum 12 hours or to shift change)", { bold: true, fill: "3A9B98", color: "FFFFFF", width: WORD_TABLE_WIDTH, columnSpan: 5 })] }),
          new TableRow({
            children: [
              wordCell("Start Time / Date", { bold: true, fill: "F1F5F9", width: 2200 }),
              wordCell([draft.startTime, formatDateForReport(draft.startDate)].filter(Boolean).join(" "), { width: 2480 }),
              wordCell("End Time / Date", { bold: true, fill: "F1F5F9", width: 2200 }),
              wordCell([draft.endTime, formatDateForReport(draft.endDate)].filter(Boolean).join(" "), { width: 2480, columnSpan: 2 }),
            ],
          }),
          new TableRow({
            children: [
              wordCell("Role", { bold: true, fill: "F1F5F9", width: 2500 }),
              wordCell("Name", { bold: true, fill: "F1F5F9", width: 1900 }),
              wordCell("Signature / Confirmation", { bold: true, fill: "F1F5F9", width: 2500 }),
              wordCell("Position", { bold: true, fill: "F1F5F9", width: 1600 }),
              wordCell("Date", { bold: true, fill: "F1F5F9", width: 860 }),
            ],
          }),
          new TableRow({
            children: [
              wordCell("Permit Issued by Authorised Person", { bold: true, width: 2500 }),
              wordCell(draft.issuedBy.name, { width: 1900 }),
              wordCell(draft.issuedBy.signature, { width: 2500 }),
              wordCell(draft.issuedBy.position, { width: 1600 }),
              wordCell(formatDateForReport(draft.issuedBy.date), { width: 860 }),
            ],
          }),
          new TableRow({
            children: [
              wordCell("Permit Accepted By", { bold: true, width: 2500 }),
              wordCell(draft.acceptedBy.name, { width: 1900 }),
              wordCell(draft.acceptedBy.signature, { width: 2500 }),
              wordCell(draft.acceptedBy.position, { width: 1600 }),
              wordCell(formatDateForReport(draft.acceptedBy.date), { width: 860 }),
            ],
          }),
        ],
      }),
      new Paragraph({ spacing: { after: 160 }, children: [] }),
    ];
  }

  function wordExtensionSection(extension: ExtensionBlock) {
    return [
      new Table({
        width: { size: WORD_TABLE_WIDTH, type: WidthType.DXA },
        layout: TableLayoutType.FIXED,
        rows: [
          new TableRow({ children: [wordCell(`Section ${extension.label} - Permit Extension (only if conditions of PTW have not changed)`, { bold: true, fill: "3A9B98", color: "FFFFFF", width: WORD_TABLE_WIDTH, columnSpan: 5 })] }),
          new TableRow({
            children: [
              wordCell("PTW Extended To", { bold: true, fill: "F1F5F9", width: 2200 }),
              wordCell([extension.extendedToTime, formatDateForReport(extension.extendedToDate)].filter(Boolean).join(" "), { width: 7160, columnSpan: 4 }),
            ],
          }),
          new TableRow({
            children: [
              wordCell("Role", { bold: true, fill: "F1F5F9", width: 2700 }),
              wordCell("Name", { bold: true, fill: "F1F5F9", width: 1700 }),
              wordCell("Position", { bold: true, fill: "F1F5F9", width: 1900 }),
              wordCell("Company", { bold: true, fill: "F1F5F9", width: 1500 }),
              wordCell("Signature", { bold: true, fill: "F1F5F9", width: 1560 }),
            ],
          }),
          new TableRow({
            children: [
              wordCell("Permit Extension by Authorised Person", { bold: true, width: 2700 }),
              wordCell(extension.extensionBy.name, { width: 1700 }),
              wordCell(extension.extensionBy.position, { width: 1900 }),
              wordCell(extension.extensionBy.company, { width: 1500 }),
              wordCell(extension.extensionBy.signature, { width: 1560 }),
            ],
          }),
          new TableRow({
            children: [
              wordCell("Permit Accepted By", { bold: true, width: 2700 }),
              wordCell(extension.acceptedBy.name, { width: 1700 }),
              wordCell(extension.acceptedBy.position, { width: 1900 }),
              wordCell(extension.acceptedBy.company, { width: 1500 }),
              wordCell(extension.acceptedBy.signature, { width: 1560 }),
            ],
          }),
        ],
      }),
      new Paragraph({ spacing: { after: 160 }, children: [] }),
    ];
  }

  function wordSection5Closure() {
    return [
      new Table({
        width: { size: WORD_TABLE_WIDTH, type: WidthType.DXA },
        layout: TableLayoutType.FIXED,
        rows: [
          new TableRow({ children: [wordCell("Section 5E - Permit Closure by Site Manager / Designate", { bold: true, fill: "3A9B98", color: "FFFFFF", width: WORD_TABLE_WIDTH, columnSpan: 5 })] }),
          new TableRow({
            children: [
              wordCell("Closure Confirmation", { bold: true, fill: "F1F5F9", width: 2400 }),
              wordCell("All work completed / suspended. Tags and key returned. Area checked as safe and tidy.", { width: 6960, columnSpan: 4 }),
            ],
          }),
          new TableRow({
            children: [
              wordCell("Role", { bold: true, fill: "F1F5F9", width: 2700 }),
              wordCell("Name", { bold: true, fill: "F1F5F9", width: 1800 }),
              wordCell("Position", { bold: true, fill: "F1F5F9", width: 2100 }),
              wordCell("Date", { bold: true, fill: "F1F5F9", width: 1200 }),
              wordCell("Signature", { bold: true, fill: "F1F5F9", width: 1560 }),
            ],
          }),
          new TableRow({
            children: [
              wordCell("Person Performing the Work", { bold: true, width: 2700 }),
              wordCell(draft.closurePerson.name, { width: 1800 }),
              wordCell(draft.closurePerson.position, { width: 2100 }),
              wordCell(formatDateForReport(draft.closurePerson.date), { width: 1200 }),
              wordCell(draft.closurePerson.signature, { width: 1560 }),
            ],
          }),
          new TableRow({
            children: [
              wordCell("PTW Issuing Authority", { bold: true, width: 2700 }),
              wordCell(draft.closureAuthority.name, { width: 1800 }),
              wordCell(draft.closureAuthority.position, { width: 2100 }),
              wordCell(formatDateForReport(draft.closureAuthority.date), { width: 1200 }),
              wordCell(draft.closureAuthority.signature, { width: 1560 }),
            ],
          }),
        ],
      }),
      new Paragraph({ spacing: { after: 160 }, children: [] }),
    ];
  }

  function wordFooter() {
    return new Footer({
      children: [
        new Paragraph({ border: { top: { style: BorderStyle.SINGLE, color: "3A9B98", size: 4 } }, spacing: { before: 80 } }),
        new Table({
          width: { size: WORD_TABLE_WIDTH, type: WidthType.DXA },
          layout: TableLayoutType.FIXED,
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
            insideHorizontal: { style: BorderStyle.NONE },
            insideVertical: { style: BorderStyle.NONE },
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: WORD_TABLE_WIDTH / 2, type: WidthType.DXA },
                  borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                  children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [wordRun("ENS-HSEQ-FRM-010", { color: "64748B", size: 16 })] })],
                }),
                new TableCell({
                  width: { size: WORD_TABLE_WIDTH / 2, type: WidthType.DXA },
                  borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                  children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [wordRun("Page ", { color: "64748B", size: 16 }), new SimpleField("PAGE"), wordRun(" of ", { color: "64748B", size: 16 }), new SimpleField("NUMPAGES")] })],
                }),
              ],
            }),
          ],
        }),
      ],
    });
  }

  async function generateWord() {
    const rows = reportRows(draft);
    const attachmentLinks = await createSignedAttachmentLinks();
    const logoBytes = await getLogoBytes();
    const extensionBlocks = draft.extensions.flatMap((extension) => {
      const hasExtension = clean(extension.extendedToDate) || clean(extension.extendedToTime) || clean(extension.extensionBy.name) || clean(extension.acceptedBy.name);
      if (!hasExtension) return [];
      return wordExtensionSection(extension);
    });
    const document = new WordDocument({
      sections: [
        {
          properties: { page: { margin: { top: 360, right: 360, bottom: 720, left: 360 } } },
          footers: { default: wordFooter() },
          children: [
            wordTitleTable(logoBytes),
            new Paragraph({
              spacing: { before: 140, after: 160 },
              children: [wordRun(`${draft.ptwNumber || "PTW"} - Permit to Work`, { bold: true, size: 28 })],
            }),
            ...wordSection("Permit Details", rows.details),
            ...wordCheckboxSection("Section 1 - Work Type (to be completed by PTW Applicant - tick as applicable)", workTypeOptions, draft.workTypes, 3),
            ...(draft.workTypes.includes("Other") && clean(draft.otherWorkType) ? wordSection("Section 1 - Other Work Type", [["Other Work Type", draft.otherWorkType]]) : []),
            ...wordSection("Section 2 - Description of Work", rows.description),
            ...wordSection3(),
            ...wordSection4(),
            ...extensionBlocks,
            ...wordSection5Closure(),
            ...wordAttachmentsDistributionSection(attachmentLinks),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(document);
    downloadBlob(blob, `${sanitizeFileName(draft.ptwNumber || "PTW")}-permit-to-work.docx`);
    setStatusMessage(`Generated Word report for ${draft.ptwNumber || "PTW"}.`);
  }

  return (
    <main>
      <QualityPageHero
        label="HSE MANAGEMENT"
        title="Permit to Work"
        description="Controlled Permit to Work workspace for planning, issuing, extending, closing, and later generating ENS-HSEQ-FRM-010 outputs."
        contextCards={[
          { label: "Last Refreshed", value: "Layout build" },
          { label: "Template", value: "ENS-HSEQ-FRM-010" },
        ]}
      />

      <ImsTopMetaRow
        backHref="/hse"
        status={<><strong>Status:</strong> {statusMessage}</>}
        actions={<ImsButton onClick={startNewPtw}>New PTW</ImsButton>}
      />

      <ImsTabs tabs={viewTabs} active={activeView} onChange={setActiveView} ariaLabel="Permit to Work views" />

      {activeView === "dashboard" ? (
        <div style={{ display: "grid", gap: "20px" }}>
          <section style={kpiGridStyle}>
            <QualityKpiCard title="Open PTWs" value={openCount} accent={imsColours.blue} onClick={() => setActiveView("register")} />
            <QualityKpiCard title="Awaiting Issue" value={awaitingIssueCount} accent={imsColours.warning} onClick={() => setActiveView("register")} />
            <QualityKpiCard title="Active Work" value={issuedCount} accent={imsColours.brand} onClick={() => setActiveView("register")} />
            <QualityKpiCard title="Extensions" value={extensionCount} accent={imsColours.purple} onClick={() => setActiveView("register")} />
            <QualityKpiCard title="Closed PTWs" value={closedCount} accent={imsColours.success} onClick={() => setActiveView("register")} />
            <QualityKpiCard title="Reports Ready" value="Pending" accent={imsColours.slate} onClick={() => setActiveView("template")} />
          </section>

          <section style={dashboardGridStyle}>
            <ImsPanel title="PTW Workflow" subtitle="Screen structure mirrors ENS-HSEQ-FRM-010 before database and report generation are wired.">
              <div style={workflowGridStyle}>
                {["Work type", "Description", "Precautions", "Issue / acceptance", "Extensions", "Closure"].map((step, index) => (
                  <div key={step} style={workflowStepStyle}>
                    <span>{index + 1}</span>
                    <strong>{step}</strong>
                  </div>
                ))}
              </div>
            </ImsPanel>
            <ImsPanel title="Mobile Readiness" subtitle="The create form uses stacked cards and touch-friendly controls for field completion.">
              <div style={noticeStyle}>
                Once the layout is approved, the next pass can add Supabase persistence, evidence upload, then Word and PDF generation from the same captured fields.
              </div>
            </ImsPanel>
          </section>
        </div>
      ) : null}

      {activeView === "register" ? (
        <ImsPanel title="PTW Register" subtitle="Saved permits. Click a row to open the PTW form for edit.">
          <div style={registerToolbarStyle}>
            <input
              style={registerSearchStyle}
              value={registerSearch}
              onChange={(event) => setRegisterSearch(event.target.value)}
              placeholder="Search PTW no., location, work type, issuer..."
            />
            <button type="button" style={showRegisterFilters ? registerSecondaryButtonStyle : registerPrimaryButtonStyle} onClick={() => setShowRegisterFilters((current) => !current)}>
              {showRegisterFilters ? "Hide Filters" : "Show Filters"}
            </button>
          </div>
          {showRegisterFilters ? (
            <div style={registerToolbarStyle}>
              <select style={registerFilterStyle} value={registerStatusFilter} onChange={(event) => setRegisterStatusFilter(event.target.value)}>
                <option value="">All Statuses</option>
                {["Draft", "Awaiting Issue", "Issued", "Extended", "Closed"].map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
              <select style={registerFilterStyle} value={registerWorkTypeFilter} onChange={(event) => setRegisterWorkTypeFilter(event.target.value)}>
                <option value="">All Work Types</option>
                {registerWorkTypeOptions.map((workType) => <option key={workType} value={workType}>{workType}</option>)}
              </select>
              <button
                type="button"
                style={registerSecondaryButtonStyle}
                onClick={() => {
                  setRegisterSearch("");
                  setRegisterStatusFilter("");
                  setRegisterWorkTypeFilter("");
                }}
              >
                Clear Filters
              </button>
            </div>
          ) : null}
          <div style={registerCountStyle}>Showing {filteredRecords.length} of {records.length} PTWs</div>
          {!records.length ? (
            <div style={emptyStateStyle}>No PTWs logged yet. Use Create PTW to start the first permit.</div>
          ) : (
            <div style={tableWrapStyle}>
              <table style={imsTableStyle}>
                <thead>
                  <tr>
                    <th style={imsTableHeadStyle}>PTW No.</th>
                    <th style={imsTableHeadStyle}>Status</th>
                    <th style={imsTableHeadStyle}>Work Type</th>
                    <th style={imsTableHeadStyle}>Location / System</th>
                    <th style={imsTableHeadStyle}>Start</th>
                    <th style={imsTableHeadStyle}>End</th>
                    <th style={imsTableHeadStyle}>Issued By</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr key={record.id} onClick={() => selectRecord(record)} style={{ cursor: "pointer", background: record.id === selectedId ? "#ecfeff" : "#ffffff" }}>
                      <td style={{ ...imsTableCellStyle, fontWeight: 900, color: imsColours.brandDark }}>{record.ptw_number}</td>
                      <td style={imsTableCellStyle}>{record.status || "-"}</td>
                      <td style={imsTableCellStyle}>{record.work_types?.join(", ") || "-"}</td>
                      <td style={imsTableCellStyle}>{record.exact_location || "-"}</td>
                      <td style={imsTableCellStyle}>{displayDate(record.start_date)}</td>
                      <td style={imsTableCellStyle}>{displayDate(record.end_date)}</td>
                      <td style={imsTableCellStyle}>{record.issued_by?.name || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filteredRecords.length ? <div style={emptyStateStyle}>No PTWs match the current filters.</div> : null}
            </div>
          )}
        </ImsPanel>
      ) : null}

      {activeView === "template" ? (
        <ImsPanel title="ENS-HSEQ-FRM-010 Template Layout" subtitle="Reference structure extracted from the supplied Permit to Work document.">
          <div style={templateGridStyle}>
            {[
              "Section 1 - Work Type",
              "Section 2 - Description of Work",
              "Section 3 - Preparation and Precautions",
              "Section 4 - Permit Issue / Acceptance",
              "Section 5A-D - Permit Extensions",
              "Section 5E - Permit Closure",
            ].map((item) => <div key={item} style={templateTileStyle}>{item}</div>)}
          </div>
        </ImsPanel>
      ) : null}

      {activeView === "create" ? (
        <div style={detailSectionStyle}>
          <div style={recordHeaderStyle}>
            <div>
              <h2 style={recordTitleStyle}>{draft.ptwNumber} - Permit to Work</h2>
              <p style={recordSubtitleStyle}>ENS-HSEQ-FRM-010 Permit to Work Form. Screen layout only; save/report generation will be wired after approval.</p>
            </div>
            <span style={statusPillStyle}>{draft.status}</span>
          </div>

          <section style={formGridStyle}>
            <Field label="PTW No.">
              <input style={inputStyle} value={draft.ptwNumber} onChange={(event) => update("ptwNumber", event.target.value)} />
            </Field>
            <Field label="Status">
              <select style={inputStyle} value={draft.status} onChange={(event) => update("status", event.target.value)}>
                <option>Draft</option>
                <option>Awaiting Issue</option>
                <option>Issued</option>
                <option>Extended</option>
                <option>Closed</option>
              </select>
            </Field>
          </section>

          <PtwSection title="Section 1 - Work Type" subtitle="To be completed by PTW Applicant. Tick as applicable.">
            <CheckGrid values={workTypeOptions} selected={draft.workTypes} onToggle={(value) => update("workTypes", toggleValue(draft.workTypes, value))} />
            {draft.workTypes.includes("Other") ? (
              <Field label="Other Work Type">
                <input style={inputStyle} value={draft.otherWorkType} onChange={(event) => update("otherWorkType", event.target.value)} />
              </Field>
            ) : null}
          </PtwSection>

          <PtwSection title="Section 2 - Description of Work">
            <TextAreaField label="Description of Work" value={draft.descriptionOfWork} onChange={(value) => update("descriptionOfWork", value)} />
            <TextAreaField label="Equipment / Tools to be Used" value={draft.equipmentTools} onChange={(value) => update("equipmentTools", value)} />
            <TextAreaField label="Exact Location of Work / System to be Worked On" value={draft.exactLocation} onChange={(value) => update("exactLocation", value)} />
          </PtwSection>

          <PtwSection title="Section 3 - Preparation and Precautions to be Undertaken">
            <section style={formGridStyle}>
              <TextAreaField label="Risk Assessment" value={draft.riskAssessment} onChange={(value) => update("riskAssessment", value)} />
              <TextAreaField label="Lift Plan" value={draft.liftPlan} onChange={(value) => update("liftPlan", value)} />
              <YesNoField label="Isolation Required" value={draft.isolationRequired} onChange={(value) => update("isolationRequired", value)} />
              <YesNoField label="Electrical" value={draft.electricalIsolation} onChange={(value) => update("electricalIsolation", value)} />
              <YesNoField label="Mechanical" value={draft.mechanicalIsolation} onChange={(value) => update("mechanicalIsolation", value)} />
              <YesNoField label="Pressure" value={draft.pressureIsolation} onChange={(value) => update("pressureIsolation", value)} />
            </section>
            <TextAreaField label="Description of Isolation" value={draft.isolationDescription} onChange={(value) => update("isolationDescription", value)} />
            <CheckGrid values={precautionOptions} selected={draft.precautions} onToggle={(value) => update("precautions", toggleValue(draft.precautions, value))} />
            {draft.precautions.includes("Other") ? (
              <Field label="Other Precaution">
                <input style={inputStyle} value={draft.otherPrecaution} onChange={(event) => update("otherPrecaution", event.target.value)} />
              </Field>
            ) : null}
            <section style={formGridStyle}>
              <YesNoField label="Check List Used?" value={draft.checklistUsed} onChange={(value) => update("checklistUsed", value)} />
              <Field label="Condition of PTE to be Inspected">
                <input style={inputStyle} value={draft.pteCondition} onChange={(event) => update("pteCondition", event.target.value)} />
              </Field>
              <Field label="Hrs. by Issuing Authority">
                <input type="number" min="0" style={inputStyle} value={draft.issuingAuthorityHours} onChange={(event) => update("issuingAuthorityHours", event.target.value)} />
              </Field>
            </section>
          </PtwSection>

          <PtwSection title="Section 4 - Permit to Work Issue / Acceptance" subtitle="Maximum 12 hours or to shift change.">
            <section style={formGridStyle}>
              <Field label="Start Time"><input type="time" style={inputStyle} value={draft.startTime} onChange={(event) => update("startTime", event.target.value)} /></Field>
              <Field label="Start Date"><input type="date" style={inputStyle} value={draft.startDate} onChange={(event) => update("startDate", event.target.value)} /></Field>
              <Field label="End Time"><input type="time" style={inputStyle} value={draft.endTime} onChange={(event) => update("endTime", event.target.value)} /></Field>
              <Field label="End Date"><input type="date" style={inputStyle} value={draft.endDate} onChange={(event) => update("endDate", event.target.value)} /></Field>
            </section>
            <SignatureFields
              title="Permit Issued by Authorised Person"
              value={draft.issuedBy}
              peopleOptions={peopleOptions}
              onSelectPerson={(value) => selectSignaturePerson("issuedBy", value)}
              onChange={(key, value) => updateSignature("issuedBy", key, value)}
            />
            <SignatureFields
              title="Permit Accepted By"
              value={draft.acceptedBy}
              peopleOptions={peopleOptions}
              onSelectPerson={(value) => selectSignaturePerson("acceptedBy", value)}
              onChange={(key, value) => updateSignature("acceptedBy", key, value)}
            />
          </PtwSection>

          <PtwSection title="Section 5A-D - Permit Extensions" subtitle="Only if conditions of PTW have not changed.">
            {draft.extensions.map((extension, index) => (
              <div key={extension.id} style={extensionCardStyle}>
                <h3 style={smallHeadingStyle}>Section {extension.label}</h3>
                <section style={formGridStyle}>
                  <Field label="PTW Extended To (Time)">
                    <input type="time" style={inputStyle} value={extension.extendedToTime} onChange={(event) => updateExtensionMeta(index, "extendedToTime", event.target.value)} />
                  </Field>
                  <Field label="Date">
                    <input type="date" style={inputStyle} value={extension.extendedToDate} onChange={(event) => updateExtensionMeta(index, "extendedToDate", event.target.value)} />
                  </Field>
                </section>
                <SignatureFields
                  title="Permit Extension by Authorised Person"
                  value={extension.extensionBy}
                  peopleOptions={peopleOptions}
                  onSelectPerson={(value) => selectExtensionPerson(index, "extensionBy", value)}
                  onChange={(key, value) => updateExtension(index, "extensionBy", key, value)}
                />
                <SignatureFields
                  title="Permit Accepted By"
                  value={extension.acceptedBy}
                  peopleOptions={peopleOptions}
                  onSelectPerson={(value) => selectExtensionPerson(index, "acceptedBy", value)}
                  onChange={(key, value) => updateExtension(index, "acceptedBy", key, value)}
                />
              </div>
            ))}
          </PtwSection>

          <PtwSection title="Section 5E - Permit Closure by Site Manager / Designate" subtitle="All work completed / suspended. Tags and key returned and area checked as safe and tidy.">
            <SignatureFields
              title="Person Performing the Work"
              value={draft.closurePerson}
              peopleOptions={peopleOptions}
              onSelectPerson={(value) => selectSignaturePerson("closurePerson", value)}
              onChange={(key, value) => updateSignature("closurePerson", key, value)}
            />
            <SignatureFields
              title="PTW Issuing Authority"
              value={draft.closureAuthority}
              peopleOptions={peopleOptions}
              onSelectPerson={(value) => selectSignaturePerson("closureAuthority", value)}
              onChange={(key, value) => updateSignature("closureAuthority", key, value)}
            />
          </PtwSection>

          <PtwSection title="Attachments and Distribution" subtitle="Checklists to be attached to original PTW. All copies returned to Issuing Authority on completion.">
            <CheckGrid values={attachmentOptions} selected={draft.attachments} onToggle={(value) => update("attachments", toggleValue(draft.attachments, value))} />
            {draft.attachments.length ? (
              <div style={attachmentUploadGridStyle}>
                {draft.attachments.map((attachmentType) => {
                  const uploadedFiles = selectedAttachments.filter((attachment) => attachment.attachment_type === attachmentType);
                  const queuedFiles = pendingAttachments.filter((attachment) => attachment.attachmentType === attachmentType);
                  return (
                    <section key={attachmentType} style={attachmentUploadCardStyle}>
                      <div style={attachmentUploadHeaderStyle}>
                        <div>
                          <strong>{attachmentType}</strong>
                          <p style={attachmentHintStyle}>Upload the matching document so it is listed in the generated Word/PDF report.</p>
                        </div>
                        <label style={attachmentUploadButtonStyle}>
                          {uploadingAttachment === attachmentType ? "Uploading..." : "Upload"}
                          <input
                            type="file"
                            multiple
                            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                            style={{ display: "none" }}
                            disabled={uploadingAttachment === attachmentType}
                            onChange={(event) => void handleAttachmentUpload(attachmentType, event)}
                          />
                        </label>
                      </div>
                      {!uploadedFiles.length && !queuedFiles.length ? <p style={attachmentEmptyStyle}>No file attached yet.</p> : null}
                      {queuedFiles.map((attachment) => (
                        <div key={attachment.id} style={attachmentFileRowStyle}>
                          <span>Queued: {attachment.file.name}</span>
                          <span>{formatFileSize(attachment.file.size)}</span>
                        </div>
                      ))}
                      {uploadedFiles.map((attachment) => (
                        <div key={attachment.id} style={attachmentFileRowStyle}>
                          <span>{attachment.file_name}</span>
                          <span>{formatFileSize(attachment.file_size)}</span>
                          <button type="button" style={attachmentRemoveButtonStyle} onClick={() => void deleteAttachment(attachment)}>
                            Remove
                          </button>
                        </div>
                      ))}
                    </section>
                  );
                })}
              </div>
            ) : null}
            <TextAreaField label="Notes / Supporting Evidence References" value={draft.notes} onChange={(value) => update("notes", value)} />
            <div style={distributionStyle}>
              PTW Distribution: Original - Issuing Authority, 1st Copy - Displayed at Work Location, 2nd Copy - At Isolation Point.
            </div>
          </PtwSection>

          <div style={actionRowStyle}>
            <ImsButton onClick={() => void savePtw()}>Save PTW</ImsButton>
            <ImsButton variant="secondary" onClick={startNewPtw}>New PTW</ImsButton>
            <ImsButton variant="secondary" onClick={() => setDraft(selectedRecord ? hydrateRecord(selectedRecord) : { ...emptyForm, ptwNumber: nextPtwNumber(records) })}>Reset Form</ImsButton>
            <ImsButton variant="danger" disabled={!selectedRecord} onClick={() => void deletePtw()}>Delete PTW</ImsButton>
            <ImsButton variant="secondary" onClick={() => void generateWord()}>Generate Word</ImsButton>
            <ImsButton variant="secondary" onClick={() => void generatePdf()}>Generate PDF</ImsButton>
          </div>

          <section style={mobileSummaryStyle}>
            <strong>Current PTW setup:</strong> {selectedWorkTypes} work type(s), {selectedPrecautions} precaution(s), status {draft.status}.
          </section>
        </div>
      ) : null}
    </main>
  );
}

function PtwSection({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section style={{ display: "grid", gap: "12px" }}>
      <div style={inlineSectionTitleStyle}>
        <h3 style={inlineSectionHeadingStyle}>{title}</h3>
        {subtitle ? <p style={inlineSectionSubtitleStyle}>{subtitle}</p> : null}
      </div>
      <div style={{ display: "grid", gap: "14px" }}>{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "grid", gap: "6px" }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </label>
  );
}

function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <Field label={label}>
      <textarea style={textareaStyle} value={value} onChange={(event) => onChange(event.target.value)} />
    </Field>
  );
}

function YesNoField({ label, value, onChange }: { label: string; value: YesNo; onChange: (value: YesNo) => void }) {
  return (
    <Field label={label}>
      <div style={yesNoGridStyle}>
        {(["Yes", "No"] as YesNo[]).map((option) => (
          <button key={option} type="button" style={value === option ? selectedChoiceStyle : choiceStyle} onClick={() => onChange(value === option ? "" : option)}>
            {option}
          </button>
        ))}
      </div>
    </Field>
  );
}

function CheckGrid({ values, selected, onToggle }: { values: string[]; selected: string[]; onToggle: (value: string) => void }) {
  return (
    <div style={checkGridStyle}>
      {values.map((value) => (
        <button key={value} type="button" style={selected.includes(value) ? selectedCheckStyle : checkStyle} onClick={() => onToggle(value)}>
          <span>{selected.includes(value) ? "X" : ""}</span>
          {value}
        </button>
      ))}
    </div>
  );
}

function SignatureFields({
  title,
  value,
  peopleOptions,
  onSelectPerson,
  onChange,
}: {
  title: string;
  value: SignatureBlock;
  peopleOptions: PeopleOption[];
  onSelectPerson: (value: string) => void;
  onChange: (key: keyof SignatureBlock, value: string) => void;
}) {
  return (
    <section style={signatureCardStyle}>
      <h3 style={smallHeadingStyle}>{title}</h3>
      <div style={signatureGridStyle}>
        <Field label="Name">
          <select style={inputStyle} value={peopleOptions.find((person) => person.name === value.name)?.id || value.name || ""} onChange={(event) => onSelectPerson(event.target.value)}>
            <option value="">Select person</option>
            {value.name && !peopleOptions.some((person) => person.name === value.name) ? <option value={value.name}>{value.name} (saved value)</option> : null}
            {peopleOptions.map((person) => (
              <option key={person.id} value={person.id}>
                {[person.name, person.role].filter(Boolean).join(" - ")}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Position"><input style={inputStyle} value={value.position} onChange={(event) => onChange("position", event.target.value)} /></Field>
        <Field label="Company"><input style={inputStyle} value={value.company} onChange={(event) => onChange("company", event.target.value)} /></Field>
        <Field label="Date"><input type="date" style={inputStyle} value={value.date} onChange={(event) => onChange("date", event.target.value)} /></Field>
        <Field label="Signature / Confirmation"><input style={inputStyle} value={value.signature} onChange={(event) => onChange("signature", event.target.value)} /></Field>
      </div>
    </section>
  );
}

const kpiGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px" };
const dashboardGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" };
const detailSectionStyle: CSSProperties = {
  border: "1px solid #dbe3ef",
  borderRadius: "18px",
  background: "#f8fafc",
  padding: "20px",
  display: "grid",
  gap: "16px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
};
const recordHeaderStyle: CSSProperties = {
  background: imsColours.brand,
  color: "#ffffff",
  borderRadius: "12px",
  padding: "14px 16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
};
const recordTitleStyle: CSSProperties = { margin: 0, fontSize: "18px", fontWeight: 800, lineHeight: 1.25 };
const recordSubtitleStyle: CSSProperties = { margin: "4px 0 0", color: "rgba(255,255,255,0.88)", fontSize: "12px", lineHeight: 1.4, fontWeight: 700 };
const statusPillStyle: CSSProperties = { borderRadius: "999px", background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.28)", padding: "7px 10px", fontSize: "12px", fontWeight: 900 };
const formGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "14px" };
const signatureGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" };
const labelStyle: CSSProperties = { color: "#334155", fontSize: "12px", fontWeight: 900, lineHeight: 1.2 };
const inputStyle: CSSProperties = { width: "100%", minHeight: "42px", border: "1px solid #cbd5e1", borderRadius: "10px", padding: "10px 12px", fontSize: "14px", lineHeight: 1.35, boxSizing: "border-box", color: imsColours.ink, background: "#ffffff" };
const textareaStyle: CSSProperties = { ...inputStyle, minHeight: "96px", lineHeight: 1.45, resize: "vertical" };
const inlineSectionTitleStyle: CSSProperties = { background: imsColours.brand, color: "#ffffff", borderRadius: "10px", padding: "11px 14px" };
const inlineSectionHeadingStyle: CSSProperties = { margin: 0, fontSize: "16px", fontWeight: 800, lineHeight: 1.25 };
const inlineSectionSubtitleStyle: CSSProperties = { margin: "4px 0 0", color: "rgba(255,255,255,0.84)", fontSize: "12px", lineHeight: 1.4, fontWeight: 700 };
const checkGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "10px" };
const checkStyle: CSSProperties = { minHeight: "42px", border: "1px solid #dbe3ef", borderRadius: "10px", background: "#ffffff", color: imsColours.ink, display: "grid", gridTemplateColumns: "24px 1fr", gap: "8px", alignItems: "center", padding: "9px 11px", textAlign: "left", fontWeight: 800, fontSize: "13px", lineHeight: 1.3, cursor: "pointer" };
const selectedCheckStyle: CSSProperties = { ...checkStyle, borderColor: imsColours.brandBorder, background: imsColours.brandSoft, color: imsColours.brandDark };
const yesNoGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" };
const choiceStyle: CSSProperties = { minHeight: "42px", border: "1px solid #dbe3ef", borderRadius: "10px", background: "#ffffff", color: imsColours.ink, fontWeight: 900, fontSize: "14px", cursor: "pointer" };
const selectedChoiceStyle: CSSProperties = { ...choiceStyle, borderColor: imsColours.brandBorder, background: imsColours.brandSoft, color: imsColours.brandDark };
const signatureCardStyle: CSSProperties = { border: "1px solid #dbe3ef", borderRadius: "12px", background: "#ffffff", padding: "14px", display: "grid", gap: "12px" };
const extensionCardStyle: CSSProperties = { border: "1px solid #dbe3ef", borderRadius: "14px", background: "#ffffff", padding: "14px", display: "grid", gap: "12px" };
const smallHeadingStyle: CSSProperties = { margin: 0, color: imsColours.ink, fontSize: "15px", fontWeight: 900 };
const actionRowStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "10px", flexWrap: "wrap" };
const emptyStateStyle: CSSProperties = { border: "1px dashed #cbd5e1", borderRadius: "14px", padding: "18px", background: "#f8fafc", color: imsColours.slate };
const noticeStyle: CSSProperties = { ...emptyStateStyle, borderStyle: "solid", lineHeight: 1.55 };
const workflowGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" };
const workflowStepStyle: CSSProperties = { ...imsPanelStyle, padding: "14px", display: "grid", gap: "8px" };
const templateGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" };
const templateTileStyle: CSSProperties = { border: "1px solid #dbe3ef", borderRadius: "14px", padding: "16px", background: "#f8fafc", color: imsColours.ink, fontWeight: 900 };
const registerToolbarStyle: CSSProperties = { border: "1px solid #dbe3ef", borderRadius: "14px", background: "#ffffff", padding: "10px", display: "grid", gridTemplateColumns: "minmax(220px, 1fr) minmax(180px, 420px)", gap: "12px", alignItems: "center", marginBottom: "12px" };
const registerSearchStyle: CSSProperties = { width: "100%", minHeight: "42px", border: "1px solid #cbd5e1", borderRadius: "10px", padding: "10px 12px", fontSize: "14px", lineHeight: 1.35, boxSizing: "border-box", color: imsColours.ink, background: "#ffffff" };
const registerFilterStyle: CSSProperties = { ...registerSearchStyle };
const registerPrimaryButtonStyle: CSSProperties = { minHeight: "42px", border: `1px solid ${imsColours.brandBorder}`, borderRadius: "10px", background: imsColours.brand, color: "#ffffff", fontWeight: 900, fontSize: "14px", cursor: "pointer", padding: "9px 14px" };
const registerSecondaryButtonStyle: CSSProperties = { minHeight: "42px", border: "1px solid #dbe3ef", borderRadius: "10px", background: "#e8eef6", color: imsColours.ink, fontWeight: 900, fontSize: "14px", cursor: "pointer", padding: "9px 14px" };
const registerCountStyle: CSSProperties = { color: imsColours.ink, fontSize: "12px", fontWeight: 800, lineHeight: 1.4, margin: "0 0 10px" };
const distributionStyle: CSSProperties = { border: "1px solid #dbe3ef", borderRadius: "14px", padding: "14px", background: imsColours.brandSoft, color: imsColours.brandDark, fontWeight: 800, lineHeight: 1.45 };
const attachmentUploadGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" };
const attachmentUploadCardStyle: CSSProperties = { border: "1px solid #dbe3ef", borderRadius: "14px", background: "#ffffff", padding: "14px", display: "grid", gap: "10px", boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)" };
const attachmentUploadHeaderStyle: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" };
const attachmentUploadButtonStyle: CSSProperties = { border: `1px solid ${imsColours.brandBorder}`, borderRadius: "10px", background: imsColours.brandSoft, color: imsColours.brandDark, minHeight: "36px", padding: "8px 12px", fontSize: "12px", fontWeight: 900, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", whiteSpace: "nowrap" };
const attachmentHintStyle: CSSProperties = { margin: "4px 0 0", color: imsColours.slate, fontSize: "12px", lineHeight: 1.35, fontWeight: 700 };
const attachmentEmptyStyle: CSSProperties = { margin: 0, color: imsColours.slate, fontSize: "12px", lineHeight: 1.35 };
const attachmentFileRowStyle: CSSProperties = { border: "1px solid #e2e8f0", borderRadius: "10px", background: "#f8fafc", padding: "8px 10px", display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto auto", alignItems: "center", gap: "10px", color: imsColours.ink, fontSize: "12px", fontWeight: 800, lineHeight: 1.35 };
const attachmentRemoveButtonStyle: CSSProperties = { border: "1px solid #fecaca", borderRadius: "8px", background: "#fff1f2", color: "#991b1b", minHeight: "28px", padding: "5px 8px", fontSize: "11px", fontWeight: 900, cursor: "pointer" };
const mobileSummaryStyle: CSSProperties = { border: "1px solid #dbe3ef", borderRadius: "14px", padding: "14px", background: "#ffffff", color: imsColours.ink };
const tableWrapStyle: CSSProperties = { border: "1px solid #dbe3ef", borderRadius: "14px", overflowX: "auto", background: "#ffffff" };

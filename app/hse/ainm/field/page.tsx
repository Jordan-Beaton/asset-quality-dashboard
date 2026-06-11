"use client";

import Link from "next/link";
import { ChangeEvent, CSSProperties, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../../src/lib/supabase";

type StageStatus = "Not Started" | "Draft" | "Issued" | "Complete";
type OverallStatus = "Open" | "In Progress" | "Closed";
type AINMType = "Incident" | "Accident";

type AINMRecord = {
  id: string;
  ainm_number: string;
  title: string;
  project: string | null;
  location_site: string | null;
  event_date: string | null;
  event_time: string | null;
  event_classification: string | null;
  company_in_control: string | null;
  brief_event_details: string | null;
  injury_release_damage_details: string | null;
  casualty_management: string | null;
  site_management: string | null;
  initial_cause: string | null;
  additional_information: string | null;
  notification_status: StageStatus;
  notification_sent_at: string | null;
  part1_status: StageStatus;
  part2_status: StageStatus;
  overall_status: OverallStatus;
  owner: string | null;
  comments: string | null;
  created_at: string;
  updated_at: string;
};

type AINMEvidence = {
  id: string;
  ainm_id: string;
  stage: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  content_type: string | null;
  notes: string | null;
  uploaded_at: string;
};

type FieldMode = "home" | "new" | "continue";

const evidenceBucket = "quality-evidence";
const typePrefixes: Record<AINMType, string> = { Incident: "IR", Accident: "AR" };

const emptyRecord: AINMRecord = {
  id: "",
  ainm_number: "",
  title: "",
  project: "",
  location_site: "",
  event_date: "",
  event_time: "",
  event_classification: "Near Miss",
  company_in_control: "",
  brief_event_details: "",
  injury_release_damage_details: "",
  casualty_management: "",
  site_management: "",
  initial_cause: "",
  additional_information: "",
  notification_status: "Draft",
  notification_sent_at: "",
  part1_status: "Not Started",
  part2_status: "Not Started",
  overall_status: "Open",
  owner: "",
  comments: "",
  created_at: "",
  updated_at: "",
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function sanitizeFileName(name: string) {
  return clean(name).replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
}

function formatFileSize(value: number | null) {
  if (!value) return "-";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function nowTime() {
  return new Date().toTimeString().slice(0, 5);
}

function getNextAinmNumber(records: AINMRecord[], type: AINMType) {
  const prefix = typePrefixes[type];
  const max = records.reduce((highest, record) => {
    const match = clean(record.ainm_number).toUpperCase().match(new RegExp(`^${prefix}(\\d+)$`));
    if (!match) return highest;
    return Math.max(highest, Number(match[1]) || 0);
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

function createDraft(records: AINMRecord[], type: AINMType): AINMRecord {
  const classification = type === "Accident" ? "First Aid Case" : "Near Miss";
  return {
    ...emptyRecord,
    ainm_number: getNextAinmNumber(records, type),
    event_classification: classification,
    event_date: todayDate(),
    event_time: nowTime(),
  };
}

function buildPayload(record: AINMRecord) {
  return {
    ainm_number: clean(record.ainm_number),
    title: clean(record.title),
    project: clean(record.project) || null,
    location_site: clean(record.location_site) || null,
    event_date: clean(record.event_date) || null,
    event_time: clean(record.event_time) || null,
    event_classification: clean(record.event_classification) || null,
    company_in_control: clean(record.company_in_control) || null,
    report_ref: clean(record.ainm_number) || null,
    brief_event_details: clean(record.brief_event_details) || null,
    injury_release_damage_details: clean(record.injury_release_damage_details) || null,
    casualty_management: clean(record.casualty_management) || null,
    site_management: clean(record.site_management) || null,
    initial_cause: clean(record.initial_cause) || null,
    additional_information: clean(record.additional_information) || null,
    notification_status: record.notification_status,
    notification_sent_at: record.notification_status === "Issued" || record.notification_status === "Complete"
      ? record.notification_sent_at || new Date().toISOString()
      : null,
    part1_status: record.part1_status || "Not Started",
    part2_status: record.part2_status || "Not Started",
    overall_status: record.overall_status || "Open",
    owner: clean(record.owner) || null,
    comments: clean(record.comments) || null,
    updated_at: new Date().toISOString(),
  };
}

export default function HseAinmFieldPage() {
  const [mode, setMode] = useState<FieldMode>("home");
  const [records, setRecords] = useState<AINMRecord[]>([]);
  const [evidence, setEvidence] = useState<AINMEvidence[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [ainmType, setAinmType] = useState<AINMType>("Incident");
  const [draft, setDraft] = useState<AINMRecord>(emptyRecord);
  const [message, setMessage] = useState("Loading AINM field entry...");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");

  const selectedEvidence = useMemo(() => evidence.filter((file) => file.ainm_id === draft.id), [draft.id, evidence]);
  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records
      .filter((record) => {
        if (!query) return true;
        return [record.ainm_number, record.title, record.project, record.location_site, record.event_classification]
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .slice(0, 20);
  }, [records, search]);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [recordRes, evidenceRes] = await Promise.all([
      supabase.from("hse_ainm_records").select("*").order("event_date", { ascending: false }).order("ainm_number", { ascending: false }),
      supabase.from("hse_ainm_evidence").select("*").order("uploaded_at", { ascending: false }),
    ]);
    setLoading(false);

    if (recordRes.error) {
      setMessage(`AINM load failed: ${recordRes.error.message}`);
      return;
    }

    setRecords((recordRes.data || []) as AINMRecord[]);
    setEvidence(evidenceRes.error ? [] : ((evidenceRes.data || []) as AINMEvidence[]));
    setMessage("AINM field entry ready.");
  }

  function startNew(type: AINMType) {
    setAinmType(type);
    setSelectedId("");
    setDraft(createDraft(records, type));
    setMode("new");
    setMessage("New AINM notification started.");
  }

  function continueRecord(record: AINMRecord) {
    setSelectedId(record.id);
    setDraft({
      ...emptyRecord,
      ...record,
      event_date: record.event_date || "",
      event_time: record.event_time || "",
    });
    setAinmType(clean(record.ainm_number).toUpperCase().startsWith("AR") ? "Accident" : "Incident");
    setMode("continue");
    setMessage(`Opened ${record.ainm_number}.`);
  }

  function updateDraft<K extends keyof AINMRecord>(key: K, value: AINMRecord[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function saveNotification(nextStatus?: StageStatus) {
    if (!clean(draft.ainm_number) || !clean(draft.title)) {
      setMessage("AINM No. and title are required.");
      return;
    }

    const recordForSave: AINMRecord = {
      ...draft,
      notification_status: nextStatus || draft.notification_status || "Draft",
      overall_status: draft.overall_status || "Open",
    };

    setSaving(true);
    if (selectedId || draft.id) {
      const id = selectedId || draft.id;
      const { error } = await supabase.from("hse_ainm_records").update(buildPayload(recordForSave)).eq("id", id);
      setSaving(false);
      if (error) {
        setMessage(`Save failed: ${error.message}`);
        return;
      }
      setDraft({ ...recordForSave, id });
      setSelectedId(id);
      setMessage(`Saved ${recordForSave.ainm_number}.`);
      await loadData();
      return;
    }

    const { data, error } = await supabase
      .from("hse_ainm_records")
      .insert([{ ...buildPayload(recordForSave), created_at: new Date().toISOString() }])
      .select("*")
      .single();
    setSaving(false);

    if (error) {
      setMessage(`Create failed: ${error.message}`);
      return;
    }

    const saved = data as AINMRecord;
    setDraft(saved);
    setSelectedId(saved.id);
    setMode("continue");
    setMessage(`Created ${saved.ainm_number}. You can now upload evidence.`);
    await loadData();
  }

  async function uploadEvidence(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    if (!draft.id && !selectedId) {
      setMessage("Save the AINM before uploading evidence.");
      event.target.value = "";
      return;
    }

    const recordId = draft.id || selectedId;
    setUploading(true);
    for (const file of files) {
      const path = `HSE/AINM/${recordId}/${Date.now()}-${sanitizeFileName(file.name)}`;
      const upload = await supabase.storage.from(evidenceBucket).upload(path, file, { upsert: false });
      if (upload.error) {
        setUploading(false);
        setMessage(`Evidence upload failed: ${upload.error.message}`);
        event.target.value = "";
        return;
      }
      const insert = await supabase.from("hse_ainm_evidence").insert([{
        ainm_id: recordId,
        stage: "Notification",
        file_name: file.name,
        file_path: path,
        file_size: file.size,
        content_type: file.type || null,
        notes: "Uploaded from mobile AINM field entry",
      }]);
      if (insert.error) {
        setUploading(false);
        setMessage(`Evidence record failed: ${insert.error.message}`);
        event.target.value = "";
        return;
      }
    }
    setUploading(false);
    event.target.value = "";
    setMessage(`Uploaded ${files.length} evidence file${files.length === 1 ? "" : "s"}.`);
    await loadData();
  }

  async function openEvidence(file: AINMEvidence) {
    const { data, error } = await supabase.storage.from(evidenceBucket).createSignedUrl(file.file_path, 3600);
    if (error || !data?.signedUrl) {
      setMessage(`Open evidence failed: ${error?.message || "Unable to create link"}`);
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <main style={pageWrapStyle}>
      <section style={shellStyle}>
        <div style={brandBarStyle}>HSE AINM Field Entry</div>
        <section style={summaryCardStyle}>
          <div style={eyebrowStyle}>Accident / Incident / Near Miss</div>
          <h1 style={titleStyle}>{mode === "home" ? "AINM Mobile" : draft.ainm_number || "AINM"}</h1>
          <p style={introStyle}>
            Capture the initial notification at point of contact. Part 1 and Part 2 can continue from the desktop AINM register.
          </p>
          <div style={statusStyle}><strong>Status:</strong> {loading ? "Loading..." : message}</div>
        </section>

        {mode === "home" ? (
          <>
            <section style={panelStyle}>
              <h2 style={panelTitleStyle}>Start New AINM</h2>
              <div style={actionGridStyle}>
                <button type="button" style={primaryButtonStyle} onClick={() => startNew("Incident")}>Incident / Near Miss</button>
                <button type="button" style={secondaryButtonStyle} onClick={() => startNew("Accident")}>Accident</button>
              </div>
            </section>

            <section style={panelStyle}>
              <h2 style={panelTitleStyle}>Continue Existing</h2>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search AINM no., title, project..."
                style={inputStyle}
              />
              <div style={recordListStyle}>
                {filteredRecords.length ? filteredRecords.map((record) => (
                  <button key={record.id} type="button" style={recordCardStyle} onClick={() => continueRecord(record)}>
                    <strong>{record.ainm_number} - {record.title}</strong>
                    <span>{record.project || "No project"} • {record.event_date || "No date"}</span>
                    <span style={pillStyle}>{record.notification_status}</span>
                  </button>
                )) : <div style={emptyStyle}>No AINMs found.</div>}
              </div>
            </section>
          </>
        ) : (
          <section style={panelStyle}>
            <div style={formHeaderStyle}>
              <div>
                <h2 style={panelTitleStyle}>Initial Notification</h2>
                <p style={helperTextStyle}>AINM number is generated from the selected report type.</p>
              </div>
              <button type="button" style={textButtonStyle} onClick={() => setMode("home")}>Change</button>
            </div>

            <div style={toggleRowStyle}>
              {(["Incident", "Accident"] as AINMType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  style={ainmType === type ? selectedToggleStyle : toggleButtonStyle}
                  onClick={() => {
                    setAinmType(type);
                    if (!draft.id) setDraft(createDraft(records, type));
                  }}
                  disabled={Boolean(draft.id)}
                >
                  {type}
                </button>
              ))}
            </div>

            <Field label="AINM No.">
              <input value={draft.ainm_number} readOnly style={inputStyle} />
            </Field>
            <Field label="Title">
              <input value={draft.title || ""} onChange={(event) => updateDraft("title", event.target.value)} style={inputStyle} placeholder="e.g. Dropped object near miss" />
            </Field>
            <Field label="Project / Work Title">
              <input value={draft.project || ""} onChange={(event) => updateDraft("project", event.target.value)} style={inputStyle} placeholder="Project, vessel or work scope" />
            </Field>
            <Field label="Location / Site">
              <input value={draft.location_site || ""} onChange={(event) => updateDraft("location_site", event.target.value)} style={inputStyle} placeholder="Site, vessel, base, area" />
            </Field>
            <div style={twoColumnStyle}>
              <Field label="Date of Event">
                <input type="date" value={draft.event_date || ""} onChange={(event) => updateDraft("event_date", event.target.value)} style={inputStyle} />
              </Field>
              <Field label="Time of Event">
                <input type="time" value={draft.event_time || ""} onChange={(event) => updateDraft("event_time", event.target.value)} style={inputStyle} />
              </Field>
            </div>
            <Field label="Classification">
              <select value={draft.event_classification || ""} onChange={(event) => updateDraft("event_classification", event.target.value)} style={inputStyle}>
                <option value="">Select classification</option>
                <option>Near Miss</option>
                <option>First Aid Case</option>
                <option>Lost Time Injury</option>
                <option>Restricted Work Case</option>
                <option>Medical Treatment Case</option>
                <option>Environmental Release</option>
                <option>Equipment Damage</option>
                <option>Property Damage</option>
                <option>Other</option>
              </select>
            </Field>
            <Field label="Brief details of the event" hint="Please avoid names - use job title or term IP (Injured Person).">
              <textarea value={draft.brief_event_details || ""} onChange={(event) => updateDraft("brief_event_details", event.target.value)} style={textareaStyle} />
            </Field>
            <Field label="Brief details of injury / release / damage">
              <textarea value={draft.injury_release_damage_details || ""} onChange={(event) => updateDraft("injury_release_damage_details", event.target.value)} style={textareaStyle} />
            </Field>

            <div style={sectionHeaderStyle}>Brief details of the initial response</div>
            <Field label="Casualty Management">
              <textarea value={draft.casualty_management || ""} onChange={(event) => updateDraft("casualty_management", event.target.value)} style={textareaStyle} />
            </Field>
            <Field label="Site / Location Management">
              <textarea value={draft.site_management || ""} onChange={(event) => updateDraft("site_management", event.target.value)} style={textareaStyle} />
            </Field>
            <Field label="Cause Identification">
              <textarea value={draft.initial_cause || ""} onChange={(event) => updateDraft("initial_cause", event.target.value)} style={textareaStyle} />
            </Field>
            <Field label="Additional Information">
              <textarea value={draft.additional_information || ""} onChange={(event) => updateDraft("additional_information", event.target.value)} style={textareaStyle} />
            </Field>
            <Field label="Notification Status">
              <select value={draft.notification_status} onChange={(event) => updateDraft("notification_status", event.target.value as StageStatus)} style={inputStyle}>
                <option>Draft</option>
                <option>Issued</option>
                <option>Complete</option>
              </select>
            </Field>

            <div style={actionButtonsStyle}>
              <button type="button" style={secondaryButtonStyle} onClick={() => void saveNotification("Draft")} disabled={saving}>
                {saving ? "Saving..." : "Save AINM Notification"}
              </button>
              <button type="button" style={primaryButtonStyle} onClick={() => void saveNotification("Issued")} disabled={saving}>
                Mark as Issued
              </button>
            </div>

            <section style={evidenceBoxStyle}>
              <h3 style={smallTitleStyle}>Notification Evidence</h3>
              <label style={uploadButtonStyle}>
                {uploading ? "Uploading..." : "Upload Evidence"}
                <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" onChange={uploadEvidence} style={{ display: "none" }} />
              </label>
              <div style={recordListStyle}>
                {selectedEvidence.length ? selectedEvidence.map((file) => (
                  <button key={file.id} type="button" style={evidenceRowStyle} onClick={() => void openEvidence(file)}>
                    <strong>{file.file_name}</strong>
                    <span>{file.stage} • {formatFileSize(file.file_size)}</span>
                  </button>
                )) : <div style={emptyStyle}>Save the AINM, then upload photos or supporting files.</div>}
              </div>
            </section>
          </section>
        )}

        <Link href="/hse/ainm" style={backLinkStyle}>Back to AINM Register</Link>
      </section>
    </main>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label style={fieldStyle}>
      <span style={labelStyle}>{label}</span>
      {hint ? <span style={hintStyle}>{hint}</span> : null}
      {children}
    </label>
  );
}

const brand = "#3A9B98";
const brandDark = "#2F7F7D";

const pageWrapStyle: CSSProperties = {
  width: "100%",
  padding: "14px 12px 96px",
  display: "flex",
  justifyContent: "center",
  background: "linear-gradient(180deg, #eef8f7 0%, #f8fafc 100%)",
};

const shellStyle: CSSProperties = {
  width: "100%",
  maxWidth: "520px",
  display: "grid",
  gap: "12px",
};

const brandBarStyle: CSSProperties = {
  background: `linear-gradient(135deg, ${brand} 0%, ${brandDark} 100%)`,
  color: "#ffffff",
  borderRadius: "18px",
  padding: "13px 16px",
  fontSize: "13px",
  fontWeight: 900,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  boxShadow: "0 14px 26px rgba(58, 155, 152, 0.18)",
};

const summaryCardStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe7f3",
  borderRadius: "18px",
  padding: "16px",
  display: "grid",
  gap: "8px",
  boxShadow: "0 14px 28px rgba(15, 23, 42, 0.06)",
};

const eyebrowStyle: CSSProperties = {
  color: brand,
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: "28px",
  lineHeight: 1.08,
  color: "#0f172a",
};

const introStyle: CSSProperties = {
  margin: 0,
  color: "#475569",
  fontSize: "13px",
  lineHeight: 1.45,
};

const statusStyle: CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "10px",
  fontSize: "12px",
  color: "#334155",
};

const panelStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe7f3",
  borderRadius: "18px",
  padding: "14px",
  display: "grid",
  gap: "12px",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
};

const panelTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "18px",
  color: "#0f172a",
};

const actionGridStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
  gridTemplateColumns: "1fr",
};

const fieldStyle: CSSProperties = {
  display: "grid",
  gap: "6px",
};

const labelStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 900,
  color: "#334155",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const hintStyle: CSSProperties = {
  fontSize: "12px",
  color: "#64748b",
  fontStyle: "italic",
};

const inputStyle: CSSProperties = {
  width: "100%",
  minHeight: "46px",
  border: "1px solid #cbd5e1",
  borderRadius: "12px",
  padding: "11px 12px",
  fontSize: "16px",
  boxSizing: "border-box",
  background: "#ffffff",
};

const textareaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: "104px",
  resize: "vertical",
  fontFamily: "inherit",
};

const twoColumnStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const primaryButtonStyle: CSSProperties = {
  border: 0,
  borderRadius: "12px",
  padding: "13px 14px",
  background: brand,
  color: "#ffffff",
  fontWeight: 900,
  fontSize: "15px",
};

const secondaryButtonStyle: CSSProperties = {
  ...primaryButtonStyle,
  background: "#e2e8f0",
  color: "#0f172a",
};

const textButtonStyle: CSSProperties = {
  border: 0,
  background: "transparent",
  color: brand,
  fontWeight: 900,
  padding: "6px",
};

const toggleRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "8px",
};

const toggleButtonStyle: CSSProperties = {
  ...secondaryButtonStyle,
  background: "#f8fafc",
  border: "1px solid #cbd5e1",
};

const selectedToggleStyle: CSSProperties = {
  ...primaryButtonStyle,
  border: `1px solid ${brand}`,
};

const sectionHeaderStyle: CSSProperties = {
  background: brand,
  color: "#ffffff",
  borderRadius: "12px",
  padding: "12px",
  fontWeight: 900,
};

const actionButtonsStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "8px",
  background: "#ffffff",
  border: "1px solid #dbe7f3",
  borderRadius: "16px",
  padding: "8px",
  boxShadow: "0 8px 18px rgba(15, 23, 42, 0.06)",
};

const formHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "8px",
  alignItems: "flex-start",
};

const helperTextStyle: CSSProperties = {
  margin: "4px 0 0",
  color: "#64748b",
  fontSize: "12px",
};

const evidenceBoxStyle: CSSProperties = {
  border: "1px solid #dbe7f3",
  borderRadius: "16px",
  padding: "12px",
  background: "#f8fafc",
  display: "grid",
  gap: "10px",
};

const smallTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "15px",
  color: "#0f172a",
};

const uploadButtonStyle: CSSProperties = {
  ...primaryButtonStyle,
  textAlign: "center",
  display: "block",
};

const recordListStyle: CSSProperties = {
  display: "grid",
  gap: "8px",
};

const recordCardStyle: CSSProperties = {
  border: "1px solid #dbe7f3",
  background: "#ffffff",
  borderRadius: "14px",
  padding: "12px",
  textAlign: "left",
  color: "#0f172a",
  display: "grid",
  gap: "6px",
};

const evidenceRowStyle: CSSProperties = {
  ...recordCardStyle,
  cursor: "pointer",
};

const pillStyle: CSSProperties = {
  width: "fit-content",
  borderRadius: "999px",
  padding: "5px 9px",
  background: "#dcfce7",
  color: "#166534",
  fontSize: "12px",
  fontWeight: 900,
};

const emptyStyle: CSSProperties = {
  border: "1px dashed #cbd5e1",
  borderRadius: "12px",
  padding: "12px",
  color: "#64748b",
  fontSize: "13px",
};

const backLinkStyle: CSSProperties = {
  color: brand,
  fontWeight: 900,
  textDecoration: "none",
  textAlign: "center",
  padding: "8px",
};

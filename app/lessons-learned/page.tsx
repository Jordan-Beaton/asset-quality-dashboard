"use client";

import type { CSSProperties, ChangeEvent } from "react";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ImsButton, ImsFilterPanel, ImsPanel, ImsTabs, ImsTopMetaRow } from "../../src/components/ImsPrimitives";
import { useImsPermissions } from "../../src/components/ImsPermissions";
import { QualityKpiCard } from "../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../src/components/QualityPageHero";
import { imsColours, imsInputStyle } from "../../src/components/imsTheme";
import { supabase } from "../../src/lib/supabase";

type View = "dashboard" | "register" | "create" | "import" | "trends";
type AnalysisFilter = "all" | "open-actions" | "high-critical" | "repeat-lessons" | "unowned-actions" | "cross-project-repeats" | "with-evidence" | "missing-root-cause";
type ChartSelection = { activeLabel?: string | number } | null | undefined;
type Lesson = {
  id: string; lesson_number: string; legacy_number: number | null; project_code: string | null; project_name: string;
  report_date: string | null; incident_date: string | null; vessel_office: string | null; assets: string | null;
  department: string | null; originator: string | null; line_manager: string | null; stage_phase: string | null;
  outcome_type: string; status: string; criticality: string; impact_rating: string; subject: string;
  issue_description: string; root_cause: string | null; action_taken: string | null; lesson_learned: string;
  recommended_action: string | null; action_owner: string | null; target_date: string | null; completion_date: string | null;
  keywords: string[]; repeat_group: string | null; source_file: string | null; created_at: string; updated_at: string;
};
type Evidence = { id: string; record_id: string; file_name: string; file_path: string; file_size: number | null; notes: string | null };
type ImportRow = Omit<Lesson, "id" | "created_at" | "updated_at"> & { rowNumber: number; errors: string[]; warnings: string[] };
type ProjectOption = { id: string; code: string; name: string; source: "reference" | "historic" };
type PersonOption = { id: string; name: string; role: string | null };
type AssetOption = { id: string; name: string; code: string };
type ReferenceContextValue = { projects: ProjectOption[]; people: PersonOption[]; assets: AssetOption[]; onSelectProject: (id: string) => void; showNewProject: boolean; setShowNewProject: (value: boolean) => void; newProjectCode: string; setNewProjectCode: (value: string) => void; newProjectName: string; setNewProjectName: (value: string) => void; onAddProject: () => void };
const ReferenceContext = createContext<ReferenceContextValue | null>(null);

const tabs: Array<{ value: View; label: string }> = [
  { value: "dashboard", label: "Dashboard" }, { value: "register", label: "Register" },
  { value: "create", label: "Create" }, { value: "import", label: "Import" }, { value: "trends", label: "Trend Analysis" },
];
const emptyForm = {
  project_code: "", project_name: "", report_date: "", incident_date: "", vessel_office: "", assets: "", department: "",
  originator: "", line_manager: "", stage_phase: "", outcome_type: "Failure", status: "Open", criticality: "Medium",
  impact_rating: "Medium", subject: "", issue_description: "", root_cause: "", action_taken: "", lesson_learned: "",
  recommended_action: "", action_owner: "", target_date: "", completion_date: "", keywords: "", repeat_group: "", source_file: "",
};

function clean(value: unknown) { return String(value ?? "").trim(); }
function header(value: string) { return value.toLowerCase().replace(/[^a-z0-9]/g, ""); }
function cell(row: Record<string, unknown>, name: string) {
  const key = Object.keys(row).find((item) => header(item) === header(name));
  return key ? row[key] : "";
}
function excelDate(value: unknown) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    return parsed ? `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}` : null;
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}
function normaliseChoice(value: unknown, choices: string[], fallback: string) {
  const match = choices.find((choice) => choice.toLowerCase() === clean(value).toLowerCase());
  return match || fallback;
}
function lessonNo(value: number) { return `LL-${String(value).padStart(5, "0")}`; }
function safeFileName(value: string) { return value.replace(/[^a-zA-Z0-9._-]/g, "-"); }
function textArray(value: string) { return value.split(",").map((item) => item.trim()).filter(Boolean); }
function topCounts(values: string[], limit = 8) {
  const counts = new Map<string, number>(); values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([name, count]) => ({ name, count }));
}
function outcomeColour(value: string) { return value === "Success" ? imsColours.success : value === "Opportunity" ? imsColours.blue : imsColours.danger; }
function lessonHasAction(item: Lesson) { return Boolean(clean(item.recommended_action) || clean(item.action_taken)); }
function lessonHasOpenAction(item: Lesson) { return lessonHasAction(item) && !["Closed", "Implemented"].includes(item.status); }
function meaningfulText(value: string | null | undefined) {
  const text = clean(value);
  return text.length >= 30 && !/^(n\/?a|none|unknown|not available|tbc|tbd|-+)$/i.test(text);
}

export default function LessonsLearnedPage() {
  const permission = useImsPermissions();
  const [view, setView] = useState<View>("dashboard"); const [lessons, setLessons] = useState<Lesson[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]); const [selected, setSelected] = useState<Lesson | null>(null);
  const [form, setForm] = useState(emptyForm); const [message, setMessage] = useState("Loading lessons learned...");
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false); const [projectFilter, setProjectFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState(""); const [statusFilter, setStatusFilter] = useState("");
  const [criticalityFilter, setCriticalityFilter] = useState(""); const [outcomeFilter, setOutcomeFilter] = useState("");
  const [analysisFilter, setAnalysisFilter] = useState<AnalysisFilter>("all"); const [analysisLabel, setAnalysisLabel] = useState("All lessons");
  const [repeatGroupFilter, setRepeatGroupFilter] = useState("");
  const [yearFilter, setYearFilter] = useState(""); const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importName, setImportName] = useState(""); const [importing, setImporting] = useState(false); const [files, setFiles] = useState<File[]>([]);
  const [evidenceNotes, setEvidenceNotes] = useState(""); const detailRef = useRef<HTMLElement | null>(null);
  const [learningIndex, setLearningIndex] = useState(0); const [learningPaused, setLearningPaused] = useState(false);
  const [referenceProjects, setReferenceProjects] = useState<ProjectOption[]>([]);
  const [peopleOptions, setPeopleOptions] = useState<PersonOption[]>([]); const [assetOptions, setAssetOptions] = useState<AssetOption[]>([]);
  const [showNewProject, setShowNewProject] = useState(false); const [newProjectCode, setNewProjectCode] = useState(""); const [newProjectName, setNewProjectName] = useState("");

  async function loadAllLessons() {
    const pageSize = 1000;
    const rows: Lesson[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from("lessons_learned")
        .select("*")
        .order("report_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      const page = (data || []) as Lesson[];
      rows.push(...page);
      if (page.length < pageSize) return rows;
    }
  }

  async function loadAllLessonEvidence() {
    const pageSize = 1000;
    const rows: Evidence[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from("evidence_files")
        .select("id,record_id,file_name,file_path,file_size,notes")
        .eq("record_type", "LESSON")
        .order("id", { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      const page = (data || []) as Evidence[];
      rows.push(...page);
      if (page.length < pageSize) return rows;
    }
  }

  async function loadData() {
    setLoading(true);
    try {
      const [allLessons, allEvidence, projectResult, peopleResult, assetResult] = await Promise.all([
        loadAllLessons(), loadAllLessonEvidence(),
        supabase.from("ims_reference_projects").select("*").eq("active", true).order("name"),
        supabase.from("people").select("id,name,role").eq("active", true).order("name"),
        supabase.from("assets").select("id,name,asset_code,document_id_code,status").order("name"),
      ]);
      setLessons(allLessons);
      setEvidence(allEvidence);
      const historic = new Map<string, ProjectOption>();
      allLessons.forEach((item) => { const key = `${clean(item.project_code).toLowerCase()}|${clean(item.project_name).toLowerCase()}`; if (!historic.has(key)) historic.set(key, { id: key, code: clean(item.project_code), name: clean(item.project_name), source: "historic" }); });
      const refs = ((projectResult.data || []) as Array<{ id: string; code?: string | null; name: string }>).map((item) => ({ id: item.id, code: clean(item.code), name: item.name, source: "reference" as const }));
      refs.forEach((item) => historic.delete(`${item.code.toLowerCase()}|${item.name.toLowerCase()}`));
      setReferenceProjects([...refs, ...historic.values()].sort((a, b) => a.name.localeCompare(b.name)));
      setPeopleOptions(((peopleResult.data || []) as Array<{ id: string; name: string; role: string | null }>).filter((item) => clean(item.name)));
      setAssetOptions(((assetResult.data || []) as Array<{ id: string; name: string; asset_code: string | null; document_id_code: string | null; status: string | null }>).filter((item) => clean(item.name) && clean(item.status).toLowerCase() !== "disposed").map((item) => ({ id: item.id, name: item.name, code: clean(item.asset_code) || clean(item.document_id_code) })));
      setMessage(`Loaded ${allLessons.length.toLocaleString()} lessons from the central repository.`);
    } catch (error) {
      setMessage(`Lessons Learned load failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void loadData(); }, []);

  const departments = useMemo(() => [...new Set(lessons.map((item) => item.department).filter(Boolean) as string[])].sort(), [lessons]);
  const years = useMemo(() => [...new Set(lessons.map((item) => item.report_date?.slice(0, 4)).filter(Boolean) as string[])].sort().reverse(), [lessons]);
  const evidenceCounts = useMemo(() => { const map = new Map<string, number>(); evidence.forEach((item) => map.set(item.record_id, (map.get(item.record_id) || 0) + 1)); return map; }, [evidence]);
  const repeatedGroups = useMemo(() => {
    const map = new Map<string, Lesson[]>(); lessons.forEach((item) => { const key = clean(item.repeat_group).toLowerCase(); if (key) map.set(key, [...(map.get(key) || []), item]); });
    return [...map.entries()].filter(([, items]) => items.length > 1).sort((a, b) => b[1].length - a[1].length);
  }, [lessons]);
  const repeatedLessonIds = useMemo(() => new Set(repeatedGroups.flatMap(([, rows]) => rows.map((item) => item.id))), [repeatedGroups]);
  const crossProjectGroups = useMemo(() => repeatedGroups.filter(([, rows]) => new Set(rows.map((item) => item.project_name)).size > 1), [repeatedGroups]);
  const crossProjectLessonIds = useMemo(() => new Set(crossProjectGroups.flatMap(([, rows]) => rows.map((item) => item.id))), [crossProjectGroups]);
  const availableProjects = useMemo(() => [...new Set(lessons.filter((item) => {
    const haystack = [item.lesson_number, item.project_code, item.project_name, item.department, item.subject, item.issue_description, item.root_cause, item.lesson_learned, item.recommended_action, item.keywords?.join(" ")].join(" ").toLowerCase();
    const matchesAnalysis = analysisFilter === "all" ||
      (analysisFilter === "open-actions" && lessonHasOpenAction(item)) ||
      (analysisFilter === "high-critical" && ["High", "Critical"].includes(item.criticality)) ||
      (analysisFilter === "repeat-lessons" && repeatedLessonIds.has(item.id)) ||
      (analysisFilter === "cross-project-repeats" && crossProjectLessonIds.has(item.id)) ||
      (analysisFilter === "unowned-actions" && lessonHasOpenAction(item) && !clean(item.action_owner)) ||
      (analysisFilter === "with-evidence" && (evidenceCounts.get(item.id) || 0) > 0) ||
      (analysisFilter === "missing-root-cause" && !clean(item.root_cause));
    return (!search || haystack.includes(search.toLowerCase())) && (!departmentFilter || (departmentFilter === "Unassigned" ? !clean(item.department) : item.department === departmentFilter)) && (!statusFilter || item.status === statusFilter) && (!criticalityFilter || item.criticality === criticalityFilter) && (!outcomeFilter || item.outcome_type === outcomeFilter) && (!yearFilter || item.report_date?.startsWith(yearFilter)) && (!repeatGroupFilter || clean(item.repeat_group).toLowerCase() === repeatGroupFilter.toLowerCase()) && matchesAnalysis;
  }).map((item) => item.project_name).filter(Boolean))].sort(), [lessons, search, departmentFilter, statusFilter, criticalityFilter, outcomeFilter, yearFilter, repeatGroupFilter, analysisFilter, repeatedLessonIds, crossProjectLessonIds, evidenceCounts]);
  useEffect(() => { if (projectFilter && !availableProjects.includes(projectFilter)) setProjectFilter(""); }, [availableProjects, projectFilter]);
  const filtered = useMemo(() => lessons.filter((item) => {
    const haystack = [item.lesson_number, item.project_code, item.project_name, item.department, item.subject, item.issue_description, item.root_cause, item.lesson_learned, item.recommended_action, item.keywords?.join(" ")].join(" ").toLowerCase();
    const matchesAnalysis = analysisFilter === "all" ||
      (analysisFilter === "open-actions" && lessonHasOpenAction(item)) ||
      (analysisFilter === "high-critical" && ["High", "Critical"].includes(item.criticality)) ||
      (analysisFilter === "repeat-lessons" && repeatedLessonIds.has(item.id)) ||
      (analysisFilter === "cross-project-repeats" && crossProjectLessonIds.has(item.id)) ||
      (analysisFilter === "unowned-actions" && lessonHasOpenAction(item) && !clean(item.action_owner)) ||
      (analysisFilter === "with-evidence" && (evidenceCounts.get(item.id) || 0) > 0) ||
      (analysisFilter === "missing-root-cause" && !clean(item.root_cause));
    return (!search || haystack.includes(search.toLowerCase())) && (!projectFilter || item.project_name === projectFilter) &&
      (!departmentFilter || (departmentFilter === "Unassigned" ? !clean(item.department) : item.department === departmentFilter)) && (!statusFilter || item.status === statusFilter) &&
      (!criticalityFilter || item.criticality === criticalityFilter) && (!outcomeFilter || item.outcome_type === outcomeFilter) &&
      (!yearFilter || item.report_date?.startsWith(yearFilter)) && (!repeatGroupFilter || clean(item.repeat_group).toLowerCase() === repeatGroupFilter.toLowerCase()) && matchesAnalysis;
  }), [lessons, search, projectFilter, departmentFilter, statusFilter, criticalityFilter, outcomeFilter, yearFilter, repeatGroupFilter, analysisFilter, repeatedLessonIds, crossProjectLessonIds, evidenceCounts]);
  const kpis = useMemo(() => ({ total: lessons.length, open: lessons.filter(lessonHasOpenAction).length,
    high: lessons.filter((x) => ["High", "Critical"].includes(x.criticality)).length, repeats: repeatedLessonIds.size,
    unowned: lessons.filter((x) => lessonHasOpenAction(x) && !clean(x.action_owner)).length, crossProject: crossProjectLessonIds.size,
    evidence: lessons.filter((x) => (evidenceCounts.get(x.id) || 0) > 0).length, missingRootCause: lessons.filter((x) => !clean(x.root_cause)).length }),
  [lessons, repeatedLessonIds, crossProjectLessonIds, evidenceCounts]);
  const departmentTrend = useMemo(() => topCounts(lessons.filter((x) => x.outcome_type === "Failure").map((x) => x.department || "Unassigned")), [lessons]);
  const subjectTrend = useMemo(() => topCounts(lessons.map((x) => x.repeat_group || x.subject || "Uncategorised"), 10), [lessons]);
  const projectTrend = useMemo(() => topCounts(lessons.filter((x) => x.outcome_type === "Failure").map((x) => x.project_name), 10), [lessons]);
  const statusTrend = useMemo(() => topCounts(lessons.filter(lessonHasAction).map((x) => x.status), 10), [lessons]);
  const criticalityTrend = useMemo(() => ["Critical", "High", "Medium", "Low"].map((name) => ({ name, count: lessons.filter((x) => x.criticality === name).length })), [lessons]);
  const outcomeTrend = useMemo(() => ["Failure", "Success", "Opportunity"].map((name) => ({ name, count: lessons.filter((x) => x.outcome_type === name).length })), [lessons]);
  const departmentRisk = useMemo(() => departments.map((name) => {
    const rows = lessons.filter((x) => x.department === name);
    return { name, Critical: rows.filter((x) => x.criticality === "Critical").length, High: rows.filter((x) => x.criticality === "High").length, Medium: rows.filter((x) => x.criticality === "Medium").length, Low: rows.filter((x) => x.criticality === "Low").length };
  }).sort((a, b) => (b.Critical + b.High) - (a.Critical + a.High)).slice(0, 10), [departments, lessons]);
  const paretoThemes = useMemo(() => {
    const rows = repeatedGroups.slice(0, 12).map(([key, items]) => ({ name: items[0].repeat_group || key, count: items.length }));
    const total = rows.reduce((sum, row) => sum + row.count, 0); let running = 0;
    return rows.map((row) => { running += row.count; return { ...row, cumulative: total ? Math.round((running / total) * 100) : 0 }; });
  }, [repeatedGroups]);
  const yearTrend = useMemo(() => {
    const map = new Map<string, { year: string; failure: number; success: number; opportunity: number }>();
    lessons.forEach((item) => { const year = item.report_date?.slice(0, 4) || "Undated"; const row = map.get(year) || { year, failure: 0, success: 0, opportunity: 0 };
      if (item.outcome_type === "Success") row.success += 1; else if (item.outcome_type === "Opportunity") row.opportunity += 1; else row.failure += 1; map.set(year, row); });
    return [...map.values()].filter((x) => x.year !== "Undated").sort((a, b) => a.year.localeCompare(b.year));
  }, [lessons]);
  const learnedFindings = useMemo(() => lessons.filter((item) => item.outcome_type === "Failure" && meaningfulText(item.lesson_learned) && clean(item.lesson_learned).toLowerCase() !== clean(item.issue_description).toLowerCase())
    .map((item) => {
      const repeatCount = item.repeat_group ? (repeatedGroups.find(([key]) => key === clean(item.repeat_group).toLowerCase())?.[1].length || 1) : 1;
      const score = (["Critical", "High"].includes(item.criticality) ? 3 : 0) + (meaningfulText(item.root_cause) ? 2 : 0) + (meaningfulText(item.recommended_action) ? 2 : 0) + (repeatCount > 1 ? Math.min(4, repeatCount) : 0) + (lessonHasAction(item) ? 1 : 0);
      return { item, repeatCount, score };
    }).sort((a, b) => b.score - a.score || b.repeatCount - a.repeatCount).filter((entry, index, rows) => rows.findIndex((other) => clean(other.item.lesson_learned).toLowerCase() === clean(entry.item.lesson_learned).toLowerCase()) === index).slice(0, 15), [lessons, repeatedGroups]);
  useEffect(() => { if (learningIndex >= learnedFindings.length) setLearningIndex(0); }, [learnedFindings.length, learningIndex]);
  useEffect(() => {
    if (learningPaused || learnedFindings.length < 2) return;
    const timer = window.setInterval(() => setLearningIndex((current) => (current + 1) % learnedFindings.length), 5000);
    return () => window.clearInterval(timer);
  }, [learnedFindings.length, learningPaused]);

  function clearAllFilters() {
    setSearch(""); setProjectFilter(""); setDepartmentFilter(""); setStatusFilter(""); setCriticalityFilter("");
    setOutcomeFilter(""); setYearFilter(""); setRepeatGroupFilter(""); setAnalysisFilter("all"); setAnalysisLabel("All lessons");
  }
  function openAnalysis(filter: AnalysisFilter, label: string) {
    setAnalysisFilter(filter); setAnalysisLabel((current) => current === "All lessons" ? label : `${current} · ${label}`); setView("register");
  }
  function selectDepartment(selection: ChartSelection) {
    const value = clean(selection?.activeLabel); if (!value) return; setDepartmentFilter(value); setAnalysisLabel((current) => current === "All lessons" ? `Department: ${value}` : `${current} · Department: ${value}`); setView("register");
  }
  function selectProject(selection: ChartSelection) {
    const value = clean(selection?.activeLabel); if (!value) return; setProjectFilter(value); setAnalysisLabel((current) => current === "All lessons" ? `Project: ${value}` : `${current} · Project: ${value}`); setView("register");
  }
  function selectYear(selection: ChartSelection) {
    const value = clean(selection?.activeLabel); if (!value) return; setYearFilter(value); setAnalysisLabel((current) => current === "All lessons" ? `Report year: ${value}` : `${current} · Report year: ${value}`); setView("register");
  }
  function selectStatus(selection: ChartSelection) {
    const value = clean(selection?.activeLabel); if (!value) return; setStatusFilter(value); setAnalysisLabel((current) => current === "All lessons" ? `Action status: ${value}` : `${current} · Action status: ${value}`); setView("register");
  }
  function selectCriticality(selection: ChartSelection) {
    const value = clean(selection?.activeLabel); if (!value) return; setCriticalityFilter(value); setAnalysisLabel((current) => current === "All lessons" ? `Criticality: ${value}` : `${current} · Criticality: ${value}`); setView("register");
  }
  function selectOutcome(selection: ChartSelection) {
    const value = clean(selection?.activeLabel); if (!value) return; setOutcomeFilter(value); setAnalysisLabel((current) => current === "All lessons" ? `Outcome: ${value}` : `${current} · Outcome: ${value}`); setView("register");
  }
  function selectTheme(selection: ChartSelection | string) {
    const value = typeof selection === "string" ? selection : clean(selection?.activeLabel); if (!value) return; setRepeatGroupFilter(value); setAnalysisLabel((current) => current === "All lessons" ? `Repeat theme: ${value}` : `${current} · Repeat theme: ${value}`); setView("register");
  }

  function requireCreate(action: string) { if (permission.canCreate || permission.fullAccess || permission.isMasterAdmin) return true; setMessage(`Read-only access: you cannot ${action}.`); return false; }
  function requireEdit(action: string) { if (permission.canEdit || permission.fullAccess || permission.isMasterAdmin) return true; setMessage(`Read-only access: you cannot ${action}.`); return false; }
  function update(name: keyof typeof emptyForm, value: string) { setForm((current) => ({ ...current, [name]: value })); }
  function selectProjectReference(id: string) {
    if (id === "__add_new__") { setShowNewProject(true); return; }
    const project = referenceProjects.find((item) => item.id === id); if (!project) return;
    setForm((current) => ({ ...current, project_code: project.code, project_name: project.name })); setShowNewProject(false);
  }
  async function addProjectReference() {
    if (!requireCreate("add project references")) return;
    const code = clean(newProjectCode); const name = clean(newProjectName);
    if (!code || !name) { setMessage("Project code and project name are both required."); return; }
    const { data, error } = await supabase.from("ims_reference_projects").insert({ code, name, type: "Project", active: true }).select("*").single();
    if (error) { setMessage(`Project could not be added: ${error.message}`); return; }
    const project = { id: data.id as string, code, name, source: "reference" as const };
    setReferenceProjects((current) => [...current.filter((item) => !(item.code.toLowerCase() === code.toLowerCase() && item.name.toLowerCase() === name.toLowerCase())), project].sort((a, b) => a.name.localeCompare(b.name)));
    setForm((current) => ({ ...current, project_code: code, project_name: name })); setNewProjectCode(""); setNewProjectName(""); setShowNewProject(false); setMessage(`${code} · ${name} added to the project register.`);
  }
  function openLesson(item: Lesson) {
    setSelected(item); setView("register"); setForm({
      project_code: item.project_code || "", project_name: item.project_name, report_date: item.report_date || "", incident_date: item.incident_date || "",
      vessel_office: item.vessel_office || "", assets: item.assets || "", department: item.department || "", originator: item.originator || "",
      line_manager: item.line_manager || "", stage_phase: item.stage_phase || "", outcome_type: item.outcome_type, status: item.status,
      criticality: item.criticality, impact_rating: item.impact_rating, subject: item.subject, issue_description: item.issue_description,
      root_cause: item.root_cause || "", action_taken: item.action_taken || "", lesson_learned: item.lesson_learned,
      recommended_action: item.recommended_action || "", action_owner: item.action_owner || "", target_date: item.target_date || "",
      completion_date: item.completion_date || "", keywords: item.keywords?.join(", ") || "", repeat_group: item.repeat_group || "", source_file: item.source_file || "",
    });
    setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }
  function payload() {
    return { ...form, report_date: form.report_date || null, incident_date: form.incident_date || null, target_date: form.target_date || null,
      completion_date: form.completion_date || null, project_code: form.project_code || null, vessel_office: form.vessel_office || null, assets: form.assets || null,
      department: form.department || null, originator: form.originator || null, line_manager: form.line_manager || null, stage_phase: form.stage_phase || null,
      root_cause: form.root_cause || null, action_taken: form.action_taken || null, recommended_action: form.recommended_action || null,
      action_owner: form.action_owner || null, keywords: textArray(form.keywords), repeat_group: form.repeat_group || null, source_file: form.source_file || null };
  }
  async function uploadEvidence(recordId: string) {
    if (!files.length) return null;
    for (const file of files) {
      const path = `LESSON/${recordId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeFileName(file.name)}`;
      const { error } = await supabase.storage.from("lessons-learned-evidence").upload(path, file, { upsert: false }); if (error) return error.message;
      const { error: metaError } = await supabase.from("evidence_files").insert({ record_type: "LESSON", record_id: recordId, file_name: file.name, file_path: path, file_size: file.size, content_type: file.type || "application/octet-stream", notes: evidenceNotes || null });
      if (metaError) return metaError.message;
    } return null;
  }
  async function saveLesson() {
    if (selected ? !requireEdit("update lessons") : !requireCreate("create lessons")) return;
    if (!form.project_name.trim() || !form.subject.trim() || !form.issue_description.trim() || !form.lesson_learned.trim()) { setMessage("Project, subject, what happened, and lesson learned are required."); return; }
    setSaving(true); let recordId = selected?.id || "";
    if (selected) { const { error } = await supabase.from("lessons_learned").update(payload()).eq("id", selected.id); if (error) { setMessage(`Update failed: ${error.message}`); setSaving(false); return; } }
    else { const next = Math.max(0, ...lessons.map((x) => Number(x.lesson_number.replace(/\D/g, "")) || 0)) + 1; const { data, error } = await supabase.from("lessons_learned").insert({ ...payload(), lesson_number: lessonNo(next) }).select("id").single(); if (error) { setMessage(`Create failed: ${error.message}`); setSaving(false); return; } recordId = data.id; }
    const uploadError = await uploadEvidence(recordId); setMessage(uploadError ? `Lesson saved, but evidence failed: ${uploadError}` : "Lesson saved to the central repository.");
    setSaving(false); setFiles([]); setEvidenceNotes(""); setForm(emptyForm); setSelected(null); await loadData(); setView("register");
  }
  async function deleteLesson() { if (!selected || !requireEdit("delete lessons") || !window.confirm(`Delete ${selected.lesson_number}?`)) return; const { error } = await supabase.from("lessons_learned").delete().eq("id", selected.id); setMessage(error ? `Delete failed: ${error.message}` : `${selected.lesson_number} deleted.`); if (!error) { setSelected(null); setForm(emptyForm); await loadData(); } }
  async function openEvidence(item: Evidence) { const { data, error } = await supabase.storage.from("lessons-learned-evidence").createSignedUrl(item.file_path, 300); if (error) setMessage(`Evidence open failed: ${error.message}`); else window.open(data.signedUrl, "_blank", "noopener,noreferrer"); }

  function previewImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file || !requireCreate("import lessons")) return; setImportName(file.name); setMessage(`Reading ${file.name}...`);
    void file.arrayBuffer().then((buffer) => {
      const book = XLSX.read(buffer, { type: "array", cellDates: true }); const sheet = book.Sheets[book.SheetNames.find((name) => header(name).includes("masterlessonslearntlog")) || book.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: true }); const existing = new Set(lessons.map((x) => [x.project_code, x.subject, x.issue_description].map(clean).join("|").toLowerCase()));
      const start = Math.max(0, ...lessons.map((x) => Number(x.lesson_number.replace(/\D/g, "")) || 0));
      const parsed = rows.map((row, index): ImportRow => {
        const projectName = clean(cell(row, "Project Name"));
        const projectCode = clean(cell(row, "Project Code"));
        const department = clean(cell(row, "Department"));
        const stagePhase = clean(cell(row, "Stage / Phase"));
        const rawSubject = clean(cell(row, "Subject"));
        const rawIssue = clean(cell(row, "Issue"));
        const rawAction = clean(cell(row, "Action Taken"));
        const rawLesson = clean(cell(row, "Lesson Learnt"));
        const legacyNumber = Number(cell(row, "LL No")) || null;
        const subject = rawSubject || stagePhase || department || `Imported lesson ${legacyNumber || index + 1}`;
        const issue = rawIssue || rawLesson || rawAction || subject;
        const lesson = rawLesson || rawAction || rawIssue || subject;
        const rawStatus = clean(cell(row, "Status"));
        const workflowStatus = normaliseChoice(rawStatus, ["Open", "In Progress", "Implemented", "Shared", "Closed"], "Open");
        const duplicate = existing.has([projectCode, subject, issue].map(clean).join("|").toLowerCase());
        const errors: string[] = [];
        const warnings: string[] = [];
        if (!projectName) errors.push("Project Name is required");
        if (duplicate) errors.push("Already exists");
        if (!rawSubject) warnings.push("Subject mapped from phase/department");
        if (!rawIssue) warnings.push("Issue mapped from lesson/action");
        if (!rawLesson) warnings.push("Lesson mapped from action/issue");
        return { rowNumber: index + 2, errors, warnings, lesson_number: lessonNo(start + index + 1), legacy_number: legacyNumber, project_code: projectCode || null, project_name: projectName,
          report_date: excelDate(cell(row, "Report Date")), incident_date: excelDate(cell(row, "Date of Incident")), vessel_office: clean(cell(row, "Vessel / Office")) || null, assets: clean(cell(row, "Asset(s)")) || null,
          department: department || null, originator: clean(cell(row, "Originator")) || null, line_manager: clean(cell(row, "Line Manager")) || null, stage_phase: stagePhase || null,
          outcome_type: normaliseChoice(rawStatus, ["Failure", "Success", "Opportunity"], "Failure"), status: workflowStatus, criticality: normaliseChoice(cell(row, "Criticality"), ["Low", "Medium", "High", "Critical"], "Medium"), impact_rating: normaliseChoice(cell(row, "Criticality"), ["Low", "Medium", "High", "Critical"], "Medium"), subject, issue_description: issue,
          root_cause: null, action_taken: rawAction || null, lesson_learned: lesson, recommended_action: rawAction || null, action_owner: null, target_date: null, completion_date: null,
          keywords: [department, subject].filter(Boolean), repeat_group: subject || null, source_file: clean(cell(row, "Source File")) || file.name };
      });
      const readyCount = parsed.filter((x) => !x.errors.length).length;
      const mappedCount = parsed.filter((x) => !x.errors.length && x.warnings.length).length;
      setImportRows(parsed);
      setMessage(`Preview ready: ${parsed.length.toLocaleString()} rows; ${readyCount.toLocaleString()} ready to import (${mappedCount.toLocaleString()} retained using controlled field mapping).`);
    }).catch((error) => setMessage(`Import preview failed: ${error instanceof Error ? error.message : "Unknown error"}`)); event.target.value = "";
  }
  async function runImport() {
    if (!requireCreate("import lessons")) return; const valid = importRows.filter((x) => !x.errors.length); if (!valid.length) { setMessage("No valid rows are ready to import."); return; }
    setImporting(true); let imported = 0;
    for (let index = 0; index < valid.length; index += 200) { const batch = valid.slice(index, index + 200).map(({ rowNumber, errors, warnings, ...row }) => row); const { error } = await supabase.from("lessons_learned").insert(batch); if (error) { setMessage(`Import stopped after ${imported.toLocaleString()} rows: ${error.message}`); setImporting(false); return; } imported += batch.length; setMessage(`Importing ${imported.toLocaleString()} of ${valid.length.toLocaleString()} lessons...`); }
    setImporting(false); setImportRows([]); setImportName(""); setMessage(`Imported ${imported.toLocaleString()} lessons from ${importName}.`); await loadData(); setView("dashboard");
  }

  const chartTooltip = { contentStyle: { borderRadius: 12, border: "1px solid #dbe7f3", fontSize: 12 } };
  return <ReferenceContext.Provider value={{ projects: referenceProjects, people: peopleOptions, assets: assetOptions, onSelectProject: selectProjectReference, showNewProject, setShowNewProject, newProjectCode, setNewProjectCode, newProjectName, setNewProjectName, onAddProject: addProjectReference }}><main>
    <QualityPageHero label="LESSONS LEARNED" title="Lessons Learned" description="Central repository for searchable project knowledge, repeat-failure prevention, evidence, actions, and trend analysis." />
    <ImsTopMetaRow backHref="/home" backLabel="Back to IMS Home" actions={<ImsButton variant="secondary" onClick={() => void loadData()}>Refresh</ImsButton>} status={<><strong>Status:</strong> {message}</>} />
    <ImsTabs tabs={tabs} active={view} onChange={(next) => { setView(next); if (next === "create") { setSelected(null); setForm(emptyForm); } }} ariaLabel="Lessons Learned views" />
    <section style={kpiGrid}>
      <QualityKpiCard title="Total Lessons" value={kpis.total} accent={imsColours.brand} active={analysisFilter === "all" && analysisLabel === "All lessons"} onClick={() => { clearAllFilters(); setView("register"); }} />
      <QualityKpiCard title="Open Actions" value={kpis.open} accent={imsColours.warning} active={analysisFilter === "open-actions"} onClick={() => openAnalysis("open-actions", "Open actions requiring follow-up")} />
      <QualityKpiCard title="High / Critical" value={kpis.high} accent={imsColours.danger} active={analysisFilter === "high-critical"} onClick={() => openAnalysis("high-critical", "High and critical lessons")} />
      <QualityKpiCard title="Repeated Lessons" value={kpis.repeats} accent={imsColours.purple} active={analysisFilter === "repeat-lessons"} onClick={() => openAnalysis("repeat-lessons", "Lessons in repeated themes")} />
      <QualityKpiCard title="Unowned Actions" value={kpis.unowned} accent={imsColours.blue} active={analysisFilter === "unowned-actions"} onClick={() => openAnalysis("unowned-actions", "Open actions without an owner")} />
      <QualityKpiCard title="Cross-Project Repeats" value={kpis.crossProject} accent={imsColours.success} active={analysisFilter === "cross-project-repeats"} onClick={() => openAnalysis("cross-project-repeats", "Repeat lessons affecting multiple projects")} />
    </section>

    {view === "dashboard" && <div style={twoColumn}>
      <ImsPanel title="What We’ve Learned" subtitle="Clear, reusable takeaways from sufficiently complete failure records. Weak and duplicated historic wording is excluded." style={{ gridColumn: "1 / -1" }}>
        {learnedFindings.length ? (() => { const { item, repeatCount } = learnedFindings[learningIndex] || learnedFindings[0]; return <div style={learningSpotlightWrap} onMouseEnter={() => setLearningPaused(true)} onMouseLeave={() => setLearningPaused(false)}><button type="button" style={learningSpotlightCard} onClick={() => repeatCount > 1 && item.repeat_group ? selectTheme(item.repeat_group) : openLesson(item)}><span style={learningEyebrow}>{item.project_code || item.project_name} · {item.department || "Unassigned"}</span><strong style={learningTitleStyle}>{item.subject}</strong><p style={learningTextStyle}>{item.lesson_learned}</p><small>{item.criticality} criticality{repeatCount > 1 ? ` · linked to ${repeatCount} repeat records · open linked dataset` : " · open source record"}</small></button><div style={learningControlsStyle}><button type="button" style={learningControlButtonStyle} aria-label="Previous learning" onClick={() => setLearningIndex((current) => (current - 1 + learnedFindings.length) % learnedFindings.length)}>‹</button><span>{learningIndex + 1} of {learnedFindings.length}{learningPaused ? " · Paused" : " · Rotates every 5 seconds"}</span><button type="button" style={learningControlButtonStyle} aria-label="Next learning" onClick={() => setLearningIndex((current) => (current + 1) % learnedFindings.length)}>›</button></div></div>; })() : <p style={muted}>No failure records currently meet the quality threshold. Complete the Lesson Learned field with a clear, reusable takeaway to populate this panel.</p>}
      </ImsPanel>
      <ImsPanel title="Failure Concentration by Department" subtitle="Where failures are recorded most often. Click a bar to inspect that department."><ChartFrame><BarChart data={departmentTrend} layout="vertical" margin={{ left: 24, right: 12 }} onClick={(state) => selectDepartment(state as ChartSelection)} style={{ cursor: "pointer" }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11 }} /><Tooltip {...chartTooltip} /><Bar dataKey="count" name="Failures" fill={imsColours.brand} radius={[0, 6, 6, 0]} /></BarChart></ChartFrame></ImsPanel>
      <ImsPanel title="High-Risk Mix by Department" subtitle="Criticality concentration shows where controls need strengthening. Click a department to drill down."><ChartFrame height={340}><BarChart data={departmentRisk} margin={{ left: 4, right: 12, bottom: 70 }} onClick={(state) => selectDepartment(state as ChartSelection)} style={{ cursor: "pointer" }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} height={90} tick={{ fontSize: 10 }} /><YAxis /><Tooltip {...chartTooltip} /><Legend /><Bar dataKey="Critical" stackId="risk" fill={imsColours.danger} /><Bar dataKey="High" stackId="risk" fill={imsColours.warning} /><Bar dataKey="Medium" stackId="risk" fill={imsColours.blue} /><Bar dataKey="Low" stackId="risk" fill={imsColours.brand} /></BarChart></ChartFrame></ImsPanel>
      <ImsPanel title="Failure Concentration by Project" subtitle="Projects with the greatest volume of recorded failures. Click a bar to inspect the project."><ChartFrame><BarChart data={projectTrend} layout="vertical" margin={{ left: 40, right: 12 }} onClick={(state) => selectProject(state as ChartSelection)} style={{ cursor: "pointer" }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="name" type="category" width={145} tick={{ fontSize: 10 }} /><Tooltip {...chartTooltip} /><Bar dataKey="count" name="Failures" fill={imsColours.dangerBright} radius={[0, 6, 6, 0]} /></BarChart></ChartFrame></ImsPanel>
      <ImsPanel title="Outcome Mix" subtitle="Balance of failures, successes and improvement opportunities. Click a bar to isolate the outcome."><ChartFrame><BarChart data={outcomeTrend} onClick={(state) => selectOutcome(state as ChartSelection)} style={{ cursor: "pointer" }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip {...chartTooltip} /><Bar dataKey="count" name="Lessons" fill={imsColours.brandDark} radius={[6, 6, 0, 0]} /></BarChart></ChartFrame></ImsPanel>
      <ImsPanel title="Recurring Themes" subtitle="Systemic issues appearing more than once. Click a theme to open only its linked lessons." style={{ gridColumn: "1 / -1" }}><div style={repeatGrid}>{repeatedGroups.slice(0, 12).map(([group, rows]) => <button key={group} style={repeatCard} onClick={() => selectTheme(rows[0].repeat_group || group)}><strong>{rows[0].repeat_group}</strong><span>{rows.length} linked lessons · {new Set(rows.map((x) => x.project_name)).size} projects</span></button>)}{!repeatedGroups.length && <p style={muted}>Repeat groups will appear as lessons are categorised or imported.</p>}</div></ImsPanel>
    </div>}

    {view === "trends" && <div style={twoColumn}>
      <ImsPanel title="Lessons Over Time" subtitle="Failures, successes and opportunities by report year. Click a year to inspect its records." style={{ gridColumn: "1 / -1" }}><ChartFrame height={330}><LineChart data={yearTrend} onClick={(state) => selectYear(state as ChartSelection)} style={{ cursor: "pointer" }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="year" /><YAxis /><Tooltip {...chartTooltip} /><Legend /><Line type="monotone" dataKey="failure" name="Failures" stroke={imsColours.danger} strokeWidth={3} activeDot={{ r: 7 }} /><Line type="monotone" dataKey="success" name="Successes" stroke={imsColours.success} strokeWidth={3} activeDot={{ r: 7 }} /><Line type="monotone" dataKey="opportunity" name="Opportunities" stroke={imsColours.blue} strokeWidth={3} activeDot={{ r: 7 }} /></LineChart></ChartFrame></ImsPanel>
      <ImsPanel title="Repeat-Theme Pareto" subtitle="Largest recurring themes and cumulative concentration. Click a theme to inspect every linked lesson." style={{ gridColumn: "1 / -1" }}><ChartFrame height={390}><ComposedChart data={paretoThemes} margin={{ left: 8, right: 18, bottom: 105 }} onClick={(state) => selectTheme(state as ChartSelection)} style={{ cursor: "pointer" }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" angle={-40} textAnchor="end" interval={0} height={120} tick={{ fontSize: 10 }} /><YAxis yAxisId="count" /><YAxis yAxisId="percent" orientation="right" domain={[0, 100]} unit="%" /><Tooltip {...chartTooltip} /><Legend /><Bar yAxisId="count" dataKey="count" name="Lessons" fill={imsColours.dangerBright} radius={[5, 5, 0, 0]} /><Line yAxisId="percent" type="monotone" dataKey="cumulative" name="Cumulative share" stroke={imsColours.ink} strokeWidth={3} dot={{ r: 4 }} /></ComposedChart></ChartFrame></ImsPanel>
      <ImsPanel title="Action Status" subtitle="Implementation progress for lessons with an action. Click a status to open its records."><ChartFrame><BarChart data={statusTrend} onClick={(state) => selectStatus(state as ChartSelection)} style={{ cursor: "pointer" }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip {...chartTooltip} /><Bar dataKey="count" name="Actions" fill={imsColours.blue} radius={[6, 6, 0, 0]} /></BarChart></ChartFrame></ImsPanel>
      <ImsPanel title="Criticality Distribution" subtitle="Risk profile of captured lessons. Click a level to isolate it."><ChartFrame><BarChart data={criticalityTrend} onClick={(state) => selectCriticality(state as ChartSelection)} style={{ cursor: "pointer" }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip {...chartTooltip} /><Bar dataKey="count" name="Lessons" fill={imsColours.warning} radius={[6, 6, 0, 0]} /></BarChart></ChartFrame></ImsPanel>
      <ImsPanel title="Continuous Failings" subtitle="Most common repeat groups across the repository. Click a bar to isolate the theme."><ChartFrame><BarChart data={subjectTrend} layout="vertical" margin={{ left: 40, right: 12 }} onClick={(state) => selectTheme(state as ChartSelection)} style={{ cursor: "pointer" }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="name" type="category" width={145} tick={{ fontSize: 10 }} /><Tooltip {...chartTooltip} /><Bar dataKey="count" name="Lessons" fill={imsColours.danger} radius={[0, 6, 6, 0]} /></BarChart></ChartFrame></ImsPanel>
      <ImsPanel title="Repeat-Failure Watchlist" subtitle="Themes affecting multiple projects. Click a row to open the underlying records."><div style={watchList}>{crossProjectGroups.slice(0, 15).map(([group, rows]) => <button key={group} style={watchRow} onClick={() => selectTheme(rows[0].repeat_group || group)}><span><strong>{rows[0].repeat_group}</strong><small>{new Set(rows.map((x) => x.project_name)).size} projects</small></span><b>{rows.length}</b></button>)}</div></ImsPanel>
    </div>}

    {view === "register" && <>
      <ImsPanel title="Lessons Learned Register" subtitle="Search the full knowledge base by project, department, subject, issue, lesson, root cause, owner, or keyword.">
        <div style={activeAnalysisStyle}><span><strong>Active dataset:</strong> {analysisLabel}</span><span>{filtered.length.toLocaleString()} matching lessons</span><ImsButton variant="ghost" onClick={clearAllFilters}>Reset Dataset</ImsButton></div>
        <ImsFilterPanel search={search} onSearchChange={setSearch} searchPlaceholder="Search within the active dataset" showFilters={showFilters} onToggleFilters={() => setShowFilters((x) => !x)} actions={<ImsButton variant="secondary" onClick={clearAllFilters}>Clear Filters</ImsButton>}>
          <Select label="Project" value={projectFilter} onChange={setProjectFilter} options={availableProjects} /><Select label="Department" value={departmentFilter} onChange={setDepartmentFilter} options={["Unassigned", ...departments]} />
          <Select label="Status" value={statusFilter} onChange={setStatusFilter} options={["Open", "In Progress", "Implemented", "Shared", "Closed"]} /><Select label="Criticality" value={criticalityFilter} onChange={setCriticalityFilter} options={["Low", "Medium", "High", "Critical"]} />
          <Select label="Outcome" value={outcomeFilter} onChange={setOutcomeFilter} options={["Failure", "Success", "Opportunity"]} /><Select label="Year" value={yearFilter} onChange={setYearFilter} options={years} />
        </ImsFilterPanel>
        <div style={infoRow}>Showing {filtered.length.toLocaleString()} of {lessons.length.toLocaleString()} lessons</div>
        <div style={tableWrap}><table style={table}><thead><tr>{["ID", "Project", "Date", "Department", "Subject", "Outcome", "Criticality", "Status", "Repeat", "Evidence"].map((x) => <th key={x} style={th}>{x}</th>)}</tr></thead><tbody>{filtered.slice(0, 500).map((item) => <tr key={item.id} onClick={() => openLesson(item)} style={{ cursor: "pointer", background: selected?.id === item.id ? imsColours.brandSoft : "white" }}><td style={td}><strong>{item.lesson_number}</strong></td><td style={td}>{item.project_code ? `${item.project_code} · ` : ""}{item.project_name}</td><td style={td}>{item.report_date || "—"}</td><td style={td}>{item.department || "—"}</td><td style={td}>{item.subject}</td><td style={td}><Pill text={item.outcome_type} colour={outcomeColour(item.outcome_type)} /></td><td style={td}>{item.criticality}</td><td style={td}>{item.status}</td><td style={td}>{item.repeat_group ? repeatedGroups.find(([key]) => key === item.repeat_group?.toLowerCase())?.[1].length || 1 : "—"}</td><td style={td}>{evidenceCounts.get(item.id) || 0}</td></tr>)}</tbody></table></div>
        {filtered.length > 500 && <p style={muted}>Showing the first 500 matches. Narrow the filters to reach a specific record.</p>}
      </ImsPanel>
      <section ref={detailRef}>{selected ? <LessonForm title={`${selected.lesson_number} · ${selected.subject}`} subtitle="Review the full learning record, update ownership and repeat grouping, and add photo evidence." form={form} update={update} files={files} setFiles={setFiles} evidenceNotes={evidenceNotes} setEvidenceNotes={setEvidenceNotes} saving={saving} onSave={saveLesson} onDelete={deleteLesson} onClose={() => { setSelected(null); setForm(emptyForm); }} evidence={evidence.filter((x) => x.record_id === selected.id)} onOpenEvidence={openEvidence} /> : <ImsPanel><p style={muted}>Click a row to open the full detail and edit panel.</p></ImsPanel>}</section>
    </>}

    {view === "create" && <LessonForm title="Create a New Lesson" subtitle="Capture what happened without blame, why it happened, what should change, who owns the action, and how teams can find it." form={form} update={update} files={files} setFiles={setFiles} evidenceNotes={evidenceNotes} setEvidenceNotes={setEvidenceNotes} saving={saving} onSave={saveLesson} evidence={[]} onOpenEvidence={openEvidence} />}

    {view === "import" && <ImsPanel title="Master Lessons Learned Excel Import" subtitle="Maps the supplied 18-column master workbook into the central repository. Existing project/subject/issue matches are flagged before import.">
      <div style={formGrid}><Field label="Excel File"><input type="file" accept=".xlsx,.xls" onChange={previewImport} style={imsInputStyle} /></Field><div style={importSummary}><strong>{importName || "No workbook selected"}</strong><span>{importRows.length ? `${importRows.length.toLocaleString()} rows · ${importRows.filter((x) => !x.errors.length).length.toLocaleString()} ready · ${importRows.filter((x) => !x.errors.length && x.warnings.length).length.toLocaleString()} mapped · ${importRows.filter((x) => x.errors.length).length.toLocaleString()} blocked` : "Select the Enshore master workbook to validate it."}</span></div></div>
      {importRows.length > 0 && <><div style={tableWrap}><table style={table}><thead><tr>{["Row", "ID", "Project", "Subject", "Date", "Result"].map((x) => <th key={x} style={th}>{x}</th>)}</tr></thead><tbody>{importRows.slice(0, 100).map((row) => <tr key={row.rowNumber}><td style={td}>{row.rowNumber}</td><td style={td}>{row.lesson_number}</td><td style={td}>{row.project_code} · {row.project_name}</td><td style={td}>{row.subject}</td><td style={td}>{row.report_date || "—"}</td><td style={td}>{row.errors.length ? <span style={{ color: imsColours.danger }}>{row.errors.join("; ")}</span> : row.warnings.length ? <span style={{ color: imsColours.warning }}>Ready · {row.warnings.join("; ")}</span> : <span style={{ color: imsColours.success }}>Ready</span>}</td></tr>)}</tbody></table></div><div style={actionRow}><ImsButton onClick={() => void runImport()} disabled={importing}>{importing ? "Importing..." : `Import ${importRows.filter((x) => !x.errors.length).length.toLocaleString()} Lessons`}</ImsButton><ImsButton variant="secondary" onClick={() => { setImportRows([]); setImportName(""); }}>Clear Preview</ImsButton></div></>}
    </ImsPanel>}
    {loading && <div style={loadingOverlay}>Loading central knowledge repository...</div>}
  </main></ReferenceContext.Provider>;
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) { return <label style={{ ...field, gridColumn: wide ? "1 / -1" : undefined }}><span style={labelStyle}>{label}</span>{children}</label>; }
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) { return <Field label={label}><select value={value} onChange={(e) => onChange(e.target.value)} style={imsInputStyle}><option value="">All</option>{options.map((x) => <option key={x}>{x}</option>)}</select></Field>; }
function Input({ value, onChange, type = "text", placeholder }: { value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) { return <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={imsInputStyle} />; }
function ControlledSelect({ value, onChange, placeholder, options }: { value: string; onChange: (value: string) => void; placeholder: string; options: Array<{ value: string; label: string }> }) {
  const exists = options.some((item) => item.value === value);
  return <select value={value} onChange={(event) => onChange(event.target.value)} style={imsInputStyle}><option value="">{placeholder}</option>{value && !exists && <option value={value}>{value} · Historic value</option>}{options.map((item) => <option key={`${item.value}-${item.label}`} value={item.value}>{item.label}</option>)}</select>;
}
function Textarea({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder?: string }) { return <textarea value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={{ ...imsInputStyle, minHeight: 104, resize: "vertical" }} />; }
function Pill({ text, colour }: { text: string; colour: string }) { return <span style={{ background: `${colour}18`, color: colour, border: `1px solid ${colour}44`, borderRadius: 999, padding: "4px 8px", fontSize: 11, fontWeight: 800 }}>{text}</span>; }
function ChartFrame({ children, height = 300 }: { children: React.ReactNode; height?: number }) { return <div style={{ width: "100%", minWidth: 0, height }}><ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>{children}</ResponsiveContainer></div>; }
function LessonForm({ title, subtitle, form, update, files, setFiles, evidenceNotes, setEvidenceNotes, saving, onSave, onDelete, onClose, evidence, onOpenEvidence }: { title: string; subtitle: string; form: typeof emptyForm; update: (name: keyof typeof emptyForm, value: string) => void; files: File[]; setFiles: (files: File[]) => void; evidenceNotes: string; setEvidenceNotes: (value: string) => void; saving: boolean; onSave: () => void; onDelete?: () => void; onClose?: () => void; evidence: Evidence[]; onOpenEvidence: (item: Evidence) => void }) {
  const references = useContext(ReferenceContext);
  if (!references) return null;
  const { projects, people, assets, onSelectProject, showNewProject, setShowNewProject, newProjectCode, setNewProjectCode, newProjectName, setNewProjectName, onAddProject } = references;
  const selectedProjectId = projects.find((item) => item.code === form.project_code && item.name === form.project_name)?.id || "";
  return <ImsPanel title={title} subtitle={subtitle}><div style={formGrid}>
    <Field label="Project Code"><select value={selectedProjectId} onChange={(e) => onSelectProject(e.target.value)} style={imsInputStyle}><option value="">Select project code</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.code || "No code"}</option>)}<option value="__add_new__">+ Add New Project</option></select></Field><Field label="Project Name"><select value={selectedProjectId} onChange={(e) => onSelectProject(e.target.value)} style={imsInputStyle}><option value="">Select project name</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}<option value="__add_new__">+ Add New Project</option></select></Field>
    {showNewProject && <div style={newProjectPanel}><Field label="New Project Code"><Input value={newProjectCode} onChange={setNewProjectCode} placeholder="e.g. ENS26-001" /></Field><Field label="New Project Name"><Input value={newProjectName} onChange={setNewProjectName} placeholder="Official project name" /></Field><div style={actionRow}><ImsButton onClick={() => void onAddProject()}>Add Project</ImsButton><ImsButton variant="secondary" onClick={() => setShowNewProject(false)}>Cancel</ImsButton></div></div>}
    <Field label="Report Date"><Input type="date" value={form.report_date} onChange={(x) => update("report_date", x)} /></Field><Field label="Date of Incident"><Input type="date" value={form.incident_date} onChange={(x) => update("incident_date", x)} /></Field>
    <Field label="Vessel / Office"><Input value={form.vessel_office} onChange={(x) => update("vessel_office", x)} /></Field><Field label="Asset"><ControlledSelect value={form.assets} onChange={(x) => update("assets", x)} placeholder="Select asset" options={assets.map((item) => ({ value: item.name, label: item.code ? `${item.code} · ${item.name}` : item.name }))} /></Field>
    <Field label="Department"><Input value={form.department} onChange={(x) => update("department", x)} /></Field><Field label="Stage / Phase"><Input value={form.stage_phase} onChange={(x) => update("stage_phase", x)} /></Field>
    <Field label="Originator"><ControlledSelect value={form.originator} onChange={(x) => update("originator", x)} placeholder="Select from People Management" options={people.map((item) => ({ value: item.name, label: item.role ? `${item.name} · ${item.role}` : item.name }))} /></Field><Field label="Line Manager"><ControlledSelect value={form.line_manager} onChange={(x) => update("line_manager", x)} placeholder="Select from People Management" options={people.map((item) => ({ value: item.name, label: item.role ? `${item.name} · ${item.role}` : item.name }))} /></Field>
    <Field label="Outcome"><select value={form.outcome_type} onChange={(e) => update("outcome_type", e.target.value)} style={imsInputStyle}>{["Failure", "Success", "Opportunity"].map((x) => <option key={x}>{x}</option>)}</select></Field>
    <Field label="Status"><select value={form.status} onChange={(e) => update("status", e.target.value)} style={imsInputStyle}>{["Open", "In Progress", "Implemented", "Shared", "Closed"].map((x) => <option key={x}>{x}</option>)}</select></Field>
    <Field label="Criticality"><select value={form.criticality} onChange={(e) => update("criticality", e.target.value)} style={imsInputStyle}>{["Low", "Medium", "High", "Critical"].map((x) => <option key={x}>{x}</option>)}</select></Field>
    <Field label="Impact Rating"><select value={form.impact_rating} onChange={(e) => update("impact_rating", e.target.value)} style={imsInputStyle}>{["Low", "Medium", "High", "Critical"].map((x) => <option key={x}>{x}</option>)}</select></Field>
    <Field label="Subject" wide><Input value={form.subject} onChange={(x) => update("subject", x)} placeholder="Clear, searchable subject" /></Field>
    <Field label="What Happened?" wide><Textarea value={form.issue_description} onChange={(x) => update("issue_description", x)} placeholder="Describe the event and its operational context without attributing blame." /></Field>
    <Field label="Root Cause / Contributing Factors" wide><Textarea value={form.root_cause} onChange={(x) => update("root_cause", x)} placeholder="Focus on systems, planning, interfaces, controls, information, equipment, or process conditions." /></Field>
    <Field label="Action Taken" wide><Textarea value={form.action_taken} onChange={(x) => update("action_taken", x)} /></Field><Field label="Lesson Learned" wide><Textarea value={form.lesson_learned} onChange={(x) => update("lesson_learned", x)} /></Field>
    <Field label="Recommended Action" wide><Textarea value={form.recommended_action} onChange={(x) => update("recommended_action", x)} /></Field>
    <Field label="Action Owner"><Input value={form.action_owner} onChange={(x) => update("action_owner", x)} /></Field><Field label="Target Date"><Input type="date" value={form.target_date} onChange={(x) => update("target_date", x)} /></Field>
    <Field label="Completion Date"><Input type="date" value={form.completion_date} onChange={(x) => update("completion_date", x)} /></Field><Field label="Repeat Group"><Input value={form.repeat_group} onChange={(x) => update("repeat_group", x)} placeholder="e.g. Document control at mobilisation" /></Field>
    <Field label="Keywords" wide><Input value={form.keywords} onChange={(x) => update("keywords", x)} placeholder="Comma-separated: mobilisation, cable handling, document control" /></Field>
    <Field label="Source File"><Input value={form.source_file} onChange={(x) => update("source_file", x)} /></Field><Field label="Photo / File Evidence"><input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xlsx" onChange={(e) => setFiles(Array.from(e.target.files || []))} style={imsInputStyle} /></Field>
    <Field label="Evidence Note" wide><Input value={evidenceNotes} onChange={setEvidenceNotes} placeholder={files.length ? `${files.length} file(s) selected` : "Describe the evidence"} /></Field>
  </div>
  {evidence.length > 0 && <div style={evidenceGrid}>{evidence.map((item) => <button key={item.id} style={evidenceCard} onClick={() => void onOpenEvidence(item)}><strong>{item.file_name}</strong><span>{item.notes || "Open evidence"}</span></button>)}</div>}
  <div style={actionRow}><ImsButton onClick={() => void onSave()} disabled={saving}>{saving ? "Saving..." : "Save Lesson"}</ImsButton>{onClose && <ImsButton variant="secondary" onClick={onClose}>Close</ImsButton>}{onDelete && <ImsButton variant="danger" onClick={() => void onDelete()}>Delete</ImsButton>}</div></ImsPanel>;
}

const kpiGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 };
const twoColumn: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 18 };
const repeatGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 };
const repeatCard: CSSProperties = { display: "grid", gap: 7, textAlign: "left", padding: 14, borderRadius: 14, border: `1px solid ${imsColours.brandBorder}`, background: imsColours.brandSoft, color: imsColours.ink, cursor: "pointer" };
const learningSpotlightWrap: CSSProperties = { display: "grid", gap: 10 };
const learningSpotlightCard: CSSProperties = { width: "100%", display: "grid", alignContent: "center", gap: 10, minHeight: 220, padding: "24px clamp(20px, 4vw, 48px)", borderRadius: 16, border: `1px solid ${imsColours.brandBorder}`, background: "linear-gradient(135deg, #ffffff 0%, #effaf8 58%, #e0f4f1 100%)", color: imsColours.ink, textAlign: "left", font: "inherit", cursor: "pointer" };
const learningEyebrow: CSSProperties = { color: imsColours.brandDark, fontSize: 11, fontWeight: 900, letterSpacing: ".05em", textTransform: "uppercase" };
const learningTitleStyle: CSSProperties = { fontSize: 22, lineHeight: 1.2 };
const learningTextStyle: CSSProperties = { maxWidth: 980, margin: 0, fontSize: 16, lineHeight: 1.65 };
const learningControlsStyle: CSSProperties = { display: "flex", justifyContent: "center", alignItems: "center", gap: 12, color: imsColours.slate, fontSize: 12, fontWeight: 800 };
const learningControlButtonStyle: CSSProperties = { width: 34, height: 34, borderRadius: 999, border: `1px solid ${imsColours.brandBorder}`, background: "#ffffff", color: imsColours.brandDark, fontSize: 22, lineHeight: 1, cursor: "pointer" };
const newProjectPanel: CSSProperties = { gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, padding: 14, borderRadius: 12, border: `1px solid ${imsColours.brandBorder}`, background: imsColours.brandSoft };
const watchList: CSSProperties = { display: "grid", gap: 8 };
const watchRow: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "11px 12px", borderRadius: 12, border: `1px solid ${imsColours.borderSoft}`, background: imsColours.panelAlt, textAlign: "left", cursor: "pointer" };
const formGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 13 };
const field: CSSProperties = { display: "grid", gap: 6, alignContent: "start" }; const labelStyle: CSSProperties = { color: imsColours.slate, fontSize: 12, fontWeight: 800 };
const tableWrap: CSSProperties = { width: "100%", overflowX: "auto" }; const table: CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 13 };
const th: CSSProperties = { background: imsColours.panelAlt, color: "#334155", fontSize: 12, fontWeight: 900, letterSpacing: ".04em", textTransform: "uppercase", textAlign: "left", padding: "12px 14px", whiteSpace: "nowrap" };
const td: CSSProperties = { padding: "12px 14px", borderBottom: `1px solid ${imsColours.borderSoft}`, verticalAlign: "top", lineHeight: 1.45, maxWidth: 280 };
const infoRow: CSSProperties = { color: imsColours.slate, fontSize: 13, fontWeight: 700, margin: "12px 0" }; const muted: CSSProperties = { color: imsColours.muted, fontSize: 13, lineHeight: 1.5 };
const actionRow: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }; const evidenceGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 16 };
const evidenceCard: CSSProperties = { display: "grid", gap: 5, padding: 12, textAlign: "left", background: imsColours.brandSoft, border: `1px solid ${imsColours.brandBorder}`, borderRadius: 12, cursor: "pointer" };
const importSummary: CSSProperties = { display: "grid", gap: 7, alignContent: "center", padding: 12, background: imsColours.panelAlt, borderRadius: 12, color: imsColours.slate };
const activeAnalysisStyle: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 12, padding: "10px 12px", borderRadius: 12, background: imsColours.brandSoft, border: `1px solid ${imsColours.brandBorder}`, color: imsColours.brandDark, fontSize: 13 };
const loadingOverlay: CSSProperties = { position: "fixed", right: 24, bottom: 24, padding: "12px 16px", background: imsColours.ink, color: "white", borderRadius: 12, boxShadow: "0 14px 28px rgba(15,23,42,.2)", zIndex: 20 };

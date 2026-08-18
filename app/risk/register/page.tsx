"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ImsPermissionNotice, useImsPermissions } from "../../../src/components/ImsPermissions";
import { QualityKpiCard } from "../../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../../src/components/QualityPageHero";
import { supabase } from "../../../src/lib/supabase";

type RiskRating = "Low" | "Medium" | "High" | "Critical";

type RiskRow = {
  id: string;
  risk_number: string | null;
  title: string | null;
  description: string | null;
  category: string | null;
  department: string | null;
  project: string | null;
  project_phase: string | null;
  impacted_activities: string | null;
  milestones_impacted: string | null;
  owner: string | null;
  owner_person_id: string | null;
  likelihood: number | null;
  consequence: number | null;
  initial_score: number | null;
  initial_rating: RiskRating | null;
  existing_controls: string | null;
  response_strategy: string | null;
  target_response_date: string | null;
  response_status: string | null;
  procedure_number: string | null;
  residual_likelihood: number | null;
  residual_consequence: number | null;
  residual_score: number | null;
  residual_rating: RiskRating | null;
  quality_fit_for_purpose: boolean | null;
  operation: boolean | null;
  financial: boolean | null;
  schedule: boolean | null;
  estimated_financial_impact: string | null;
  status: string | null;
  review_date: string | null;
  next_review_due: string | null;
  date_closed: string | null;
  closed_by: string | null;
  comments: string | null;
  lesson_learned: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type PersonOption = {
  id: string;
  name: string;
};

type RiskForm = {
  title: string;
  description: string;
  category: string;
  department: string;
  project: string;
  project_phase: string;
  impacted_activities: string;
  milestones_impacted: string;
  owner: string;
  likelihood: number;
  consequence: number;
  existing_controls: string;
  response_strategy: string;
  target_response_date: string;
  response_status: string;
  procedure_number: string;
  residual_likelihood: number;
  residual_consequence: number;
  quality_fit_for_purpose: boolean;
  operation: boolean;
  financial: boolean;
  schedule: boolean;
  estimated_financial_impact: string;
  status: string;
  review_date: string;
  next_review_due: string;
  date_closed: string;
  closed_by: string;
  comments: string;
  lesson_learned: string;
};

const emptyForm: RiskForm = {
  title: "",
  description: "",
  category: "",
  department: "",
  project: "",
  project_phase: "",
  impacted_activities: "",
  milestones_impacted: "",
  owner: "",
  likelihood: 1,
  consequence: 1,
  existing_controls: "",
  response_strategy: "",
  target_response_date: "",
  response_status: "",
  procedure_number: "",
  residual_likelihood: 1,
  residual_consequence: 1,
  quality_fit_for_purpose: false,
  operation: false,
  financial: false,
  schedule: false,
  estimated_financial_impact: "",
  status: "Open",
  review_date: "",
  next_review_due: "",
  date_closed: "",
  closed_by: "",
  comments: "",
  lesson_learned: "",
};

const departmentOptions = [
  "Assets",
  "Commercial",
  "Crewing",
  "Engineering",
  "Finance",
  "Human Resources",
  "Logistics",
  "Marketing",
  "Operations",
  "Procurement",
  "Project",
  "Survey",
  "HSEQ",
] as const;

const categoryOptions = [
  "Operational",
  "Project",
  "Compliance",
  "Commercial",
  "Financial",
  "HSEQ",
  "People",
  "Supply Chain",
  "Technical",
] as const;

const phaseOptions = ["Tender", "Planning", "Engineering", "Procurement", "Execution", "Closeout", "Operations"] as const;
const statusOptions = ["Open", "Under Review", "Treatment Required", "Accepted", "Closed", "Archived"] as const;
const responseStatusOptions = ["Not Started", "In Progress", "Complete", "Overdue", "On Hold"] as const;
const responseStrategyOptions = ["Avoid", "Reduce", "Transfer", "Accept", "Exploit", "Share", "Enhance"] as const;
const ratingOptions: RiskRating[] = ["Low", "Medium", "High", "Critical"];
const scoreOptions = [1, 2, 3, 4, 5];

function getRiskRating(score: number): RiskRating {
  if (score <= 4) return "Low";
  if (score <= 9) return "Medium";
  if (score <= 16) return "High";
  return "Critical";
}

function getRiskScore(probability: number, impact: number) {
  return probability * impact;
}

function extractRiskNumber(value: string | null | undefined) {
  const match = value?.match(/(\d+)/);
  if (!match) return null;
  const number = Number(match[1]);
  return Number.isNaN(number) ? null : number;
}

function formatRiskNumber(number: number) {
  return `RSK-${String(number).padStart(3, "0")}`;
}

function getNextRiskNumber(risks: RiskRow[]) {
  const used = new Set(
    risks
      .map((risk) => extractRiskNumber(risk.risk_number))
      .filter((number): number is number => number !== null && number > 0)
  );
  let next = 1;
  while (used.has(next)) next += 1;
  return formatRiskNumber(next);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
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

function getDaysFromToday(value: string | null | undefined) {
  if (!value) return null;
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function isClosedStatus(status: string | null | undefined) {
  const normalised = (status || "").trim().toLowerCase();
  return normalised === "closed" || normalised === "archived";
}

function isOverdueReview(risk: RiskRow) {
  if (isClosedStatus(risk.status)) return false;
  const days = getDaysFromToday(risk.next_review_due);
  return days !== null && days < 0;
}

function getRatingBadgeStyle(rating: RiskRating | null | undefined): CSSProperties {
  if (rating === "Critical") return { ...badgeStyle, background: "#ECECE7", color: "#F93822" };
  if (rating === "High") return { ...badgeStyle, background: "#ECECE7", color: "#000000" };
  if (rating === "Medium") return { ...badgeStyle, background: "#ECECE7", color: "#000000" };
  return { ...badgeStyle, background: "#ECECE7", color: "#005670" };
}

function getStatusBadgeStyle(status: string | null | undefined): CSSProperties {
  const normalised = (status || "").trim().toLowerCase();
  if (normalised === "closed" || normalised === "accepted") return { ...badgeStyle, background: "#ECECE7", color: "#005670" };
  if (normalised === "treatment required") return { ...badgeStyle, background: "#ECECE7", color: "#F93822" };
  if (normalised === "under review") return { ...badgeStyle, background: "#ECECE7", color: "#53565A" };
  if (normalised === "archived") return { ...badgeStyle, background: "#D0D0CE", color: "#53565A" };
  return { ...badgeStyle, background: "#ECECE7", color: "#005670" };
}

function buildFormFromRisk(risk: RiskRow): RiskForm {
  return {
    title: risk.title || "",
    description: risk.description || "",
    category: risk.category || "",
    department: risk.department || "",
    project: risk.project || "",
    project_phase: risk.project_phase || "",
    impacted_activities: risk.impacted_activities || "",
    milestones_impacted: risk.milestones_impacted || "",
    owner: risk.owner || "",
    likelihood: risk.likelihood || 1,
    consequence: risk.consequence || 1,
    existing_controls: risk.existing_controls || "",
    response_strategy: risk.response_strategy || "",
    target_response_date: risk.target_response_date || "",
    response_status: risk.response_status || "",
    procedure_number: risk.procedure_number || "",
    residual_likelihood: risk.residual_likelihood || 1,
    residual_consequence: risk.residual_consequence || 1,
    quality_fit_for_purpose: Boolean(risk.quality_fit_for_purpose),
    operation: Boolean(risk.operation),
    financial: Boolean(risk.financial),
    schedule: Boolean(risk.schedule),
    estimated_financial_impact: risk.estimated_financial_impact || "",
    status: risk.status || "Open",
    review_date: risk.review_date || "",
    next_review_due: risk.next_review_due || "",
    date_closed: risk.date_closed || "",
    closed_by: risk.closed_by || "",
    comments: risk.comments || "",
    lesson_learned: risk.lesson_learned || "",
  };
}

function buildRiskPayload(form: RiskForm) {
  const initialScore = getRiskScore(form.likelihood, form.consequence);
  const residualScore = getRiskScore(form.residual_likelihood, form.residual_consequence);

  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    category: form.category || null,
    department: form.department || null,
    project: form.project.trim() || null,
    project_phase: form.project_phase || null,
    impacted_activities: form.impacted_activities.trim() || null,
    milestones_impacted: form.milestones_impacted.trim() || null,
    owner: form.owner.trim() || null,
    likelihood: form.likelihood,
    consequence: form.consequence,
    initial_score: initialScore,
    initial_rating: getRiskRating(initialScore),
    existing_controls: form.existing_controls.trim() || null,
    response_strategy: form.response_strategy || null,
    target_response_date: form.target_response_date || null,
    response_status: form.response_status || null,
    procedure_number: form.procedure_number.trim() || null,
    residual_likelihood: form.residual_likelihood,
    residual_consequence: form.residual_consequence,
    residual_score: residualScore,
    residual_rating: getRiskRating(residualScore),
    quality_fit_for_purpose: form.quality_fit_for_purpose,
    operation: form.operation,
    financial: form.financial,
    schedule: form.schedule,
    estimated_financial_impact: form.estimated_financial_impact.trim() || null,
    status: form.status || "Open",
    review_date: form.review_date || null,
    next_review_due: form.next_review_due || null,
    date_closed: form.date_closed || null,
    closed_by: form.closed_by.trim() || null,
    comments: form.comments.trim() || null,
    lesson_learned: form.lesson_learned.trim() || null,
    updated_at: new Date().toISOString(),
  };
}

export default function RiskRegisterPage() {
  const imsPermissions = useImsPermissions();
  const [risks, setRisks] = useState<RiskRow[]>([]);
  const [people, setPeople] = useState<PersonOption[]>([]);
  const [form, setForm] = useState<RiskForm>(emptyForm);
  const [editForm, setEditForm] = useState<RiskForm>(emptyForm);
  const [selectedRiskId, setSelectedRiskId] = useState("");
  const [showCreateRisk, setShowCreateRisk] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [message, setMessage] = useState("Loading risk register...");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const [statusFilter, setStatusFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [showRegisterFilters, setShowRegisterFilters] = useState(false);

  async function loadData(showLoadedMessage = true) {
    setIsLoading(true);
    const [riskRes, peopleRes] = await Promise.all([
      supabase.from("risks").select("*").order("risk_number", { ascending: true }),
      supabase.from("people").select("id,name").eq("active", true).order("name", { ascending: true }),
    ]);

    if (riskRes.error) {
      setMessage(`Risk register load failed: ${riskRes.error.message}`);
      setIsLoading(false);
      return;
    }

    if (peopleRes.error) {
      setMessage(`People load failed: ${peopleRes.error.message}`);
      setIsLoading(false);
      return;
    }

    const sorted = [...((riskRes.data || []) as RiskRow[])].sort((a, b) => {
      const aNumber = extractRiskNumber(a.risk_number);
      const bNumber = extractRiskNumber(b.risk_number);
      if (aNumber !== null && bNumber !== null) return aNumber - bNumber;
      if (aNumber !== null) return -1;
      if (bNumber !== null) return 1;
      return (a.risk_number || "").localeCompare(b.risk_number || "");
    });

    setRisks(sorted);
    setPeople(
      ((peopleRes.data || []) as Array<Record<string, unknown>>)
        .map((row) => ({ id: String(row.id || ""), name: String(row.name || "").trim() }))
        .filter((person) => person.id && person.name)
    );
    setLastRefreshed(new Date());
    setIsLoading(false);

    if (showLoadedMessage) {
      setMessage(`Loaded ${sorted.length} risk${sorted.length === 1 ? "" : "s"} successfully.`);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const selectedRisk = useMemo(
    () => risks.find((risk) => risk.id === selectedRiskId) || null,
    [risks, selectedRiskId]
  );

  useEffect(() => {
    if (!selectedRisk) {
      setEditForm(emptyForm);
      return;
    }
    setEditForm(buildFormFromRisk(selectedRisk));
  }, [selectedRisk]);

  const peopleOptions = useMemo(() => {
    return [...new Set(people.map((person) => person.name).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [people]);

  const createOwnerOptions = useMemo(() => {
    const currentOwner = form.owner.trim();
    if (!currentOwner || peopleOptions.includes(currentOwner)) return peopleOptions;
    return [currentOwner, ...peopleOptions];
  }, [form.owner, peopleOptions]);

  const createClosedByOptions = useMemo(() => {
    const currentClosedBy = form.closed_by.trim();
    if (!currentClosedBy || peopleOptions.includes(currentClosedBy)) return peopleOptions;
    return [currentClosedBy, ...peopleOptions];
  }, [form.closed_by, peopleOptions]);

  const editOwnerOptions = useMemo(() => {
    const currentOwner = editForm.owner.trim();
    if (!currentOwner || peopleOptions.includes(currentOwner)) return peopleOptions;
    return [currentOwner, ...peopleOptions];
  }, [editForm.owner, peopleOptions]);

  const editClosedByOptions = useMemo(() => {
    const currentClosedBy = editForm.closed_by.trim();
    if (!currentClosedBy || peopleOptions.includes(currentClosedBy)) return peopleOptions;
    return [currentClosedBy, ...peopleOptions];
  }, [editForm.closed_by, peopleOptions]);

  const uniqueOwners = useMemo(() => [...new Set(risks.map((risk) => risk.owner).filter(Boolean))].sort(), [risks]);
  const uniqueProjects = useMemo(
    () => [...new Set(risks.map((risk) => risk.project).filter(Boolean))].sort(),
    [risks]
  );

  const filteredRisks = useMemo(() => {
    return risks.filter((risk) => {
      return (
        (!statusFilter || risk.status === statusFilter) &&
        (!ratingFilter || risk.residual_rating === ratingFilter) &&
        (!departmentFilter || risk.department === departmentFilter) &&
        (!ownerFilter || risk.owner === ownerFilter) &&
        (!categoryFilter || risk.category === categoryFilter) &&
        (!projectFilter || risk.project === projectFilter)
      );
    });
  }, [categoryFilter, departmentFilter, ownerFilter, projectFilter, ratingFilter, risks, statusFilter]);

  const openRisks = risks.filter((risk) => !isClosedStatus(risk.status)).length;
  const highCriticalRisks = risks.filter((risk) => risk.residual_rating === "High" || risk.residual_rating === "Critical").length;
  const overdueReviews = risks.filter(isOverdueReview).length;
  const latestRiskLabel = risks[risks.length - 1]
    ? `${risks[risks.length - 1].risk_number || "Risk"} - ${risks[risks.length - 1].title || "Untitled"}`
    : "No risks loaded";
  const canCreateRisk = imsPermissions.loaded && (imsPermissions.isMasterAdmin || imsPermissions.fullAccess || imsPermissions.canCreate);
  const canEditRisk = imsPermissions.loaded && (imsPermissions.isMasterAdmin || imsPermissions.fullAccess || imsPermissions.canEdit);

  function requireCreatePermission(action: string) {
    if (canCreateRisk) return true;
    setMessage(`Read-only access: you do not have permission to ${action}.`);
    return false;
  }

  function requireEditPermission(action: string) {
    if (canEditRisk) return true;
    setMessage(`Read-only access: you do not have permission to ${action}.`);
    return false;
  }

  async function createRisk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requireCreatePermission("create risks")) return;
    if (!form.title.trim()) {
      setMessage("Risk title is required.");
      return;
    }

    setIsSaving(true);
    const nextRiskNumber = getNextRiskNumber(risks);
    const { error } = await supabase.from("risks").insert([{ risk_number: nextRiskNumber, ...buildRiskPayload(form) }]);

    if (error) {
      setMessage(`Risk create failed: ${error.message}`);
      setIsSaving(false);
      return;
    }

    setForm(emptyForm);
    setShowCreateRisk(false);
    setMessage(`Risk ${nextRiskNumber} created successfully.`);
    setIsSaving(false);
    await loadData(false);
  }

  async function updateRisk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requireEditPermission("edit risks")) return;
    if (!selectedRisk) return;
    if (!editForm.title.trim()) {
      setMessage("Risk title is required.");
      return;
    }

    setIsSaving(true);
    const { error } = await supabase.from("risks").update(buildRiskPayload(editForm)).eq("id", selectedRisk.id);

    if (error) {
      setMessage(`Risk update failed: ${error.message}`);
      setIsSaving(false);
      return;
    }

    setMessage(`${selectedRisk.risk_number || "Risk"} updated successfully.`);
    setIsSaving(false);
    await loadData(false);
  }

  async function deleteRisk() {
    if (!requireEditPermission("delete risks")) return;
    if (!selectedRisk) return;
    const confirmed = window.confirm(`Delete ${selectedRisk.risk_number || "this risk"}?`);
    if (!confirmed) return;

    const { error } = await supabase.from("risks").delete().eq("id", selectedRisk.id);

    if (error) {
      setMessage(`Risk delete failed: ${error.message}`);
      return;
    }

    setSelectedRiskId("");
    setShowDetails(false);
    setMessage(`${selectedRisk.risk_number || "Risk"} deleted successfully.`);
    await loadData(false);
  }

  function selectRisk(risk: RiskRow) {
    setSelectedRiskId(risk.id);
    setShowDetails(true);
  }

  function clearFilters() {
    setStatusFilter("");
    setRatingFilter("");
    setDepartmentFilter("");
    setOwnerFilter("");
    setCategoryFilter("");
    setProjectFilter("");
  }

  async function generateRiskRegisterPdf() {
    if (filteredRisks.length === 0) {
      setMessage("No risks match the current filters for PDF export.");
      return;
    }

    try {
      setIsGeneratingPdf(true);

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      const generatedAt = new Date().toLocaleString("en-GB");

      try {
        const logoResponse = await fetch("/enshore-primary-logo-colour.png");
        if (logoResponse.ok) {
          const logoBlob = await logoResponse.blob();
          const logoDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(String(reader.result || ""));
            reader.onerror = () => reject(new Error("Could not convert logo to data URL."));
            reader.readAsDataURL(logoBlob);
          });
          doc.addImage(logoDataUrl, "PNG", margin, 8, 42, 21);
        }
      } catch {
        // Keep PDF generation resilient if the logo cannot be loaded.
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(17);
      doc.setTextColor(0, 0, 0);
      doc.text("Risk Register Report", pageWidth / 2, 16, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(83, 86, 90);
      doc.text("Filtered Enshore project risk register for project risk review meetings.", pageWidth / 2, 22, {
        align: "center",
      });
      doc.text(`Generated: ${generatedAt}`, pageWidth - margin, 16, { align: "right" });
      doc.text(`Risks exported: ${filteredRisks.length}`, pageWidth - margin, 22, { align: "right" });

      doc.setDrawColor(0, 86, 112);
      doc.setLineWidth(0.7);
      doc.line(margin, 30, pageWidth - margin, 30);

      const filterSummary = [
        `Status: ${statusFilter || "All"}`,
        `Rating: ${ratingFilter || "All"}`,
        `Department: ${departmentFilter || "All"}`,
        `Owner: ${ownerFilter || "All"}`,
        `Category: ${categoryFilter || "All"}`,
        `Project: ${projectFilter || "All Projects"}`,
      ].join("  |  ");

      doc.setFontSize(8.2);
      doc.setTextColor(83, 86, 90);
      doc.text(filterSummary, margin, 35, { maxWidth: pageWidth - margin * 2 });

      const reportRows = filteredRisks.map((risk) => ({
        risk_id: risk.risk_number || "-",
        project: risk.project || "-",
        phase: risk.project_phase || "-",
        activities: risk.impacted_activities || "-",
        description: risk.description || risk.title || "-",
        probability: risk.likelihood ? String(risk.likelihood) : "-",
        impact: risk.consequence ? String(risk.consequence) : "-",
        score: [risk.initial_score || "-", risk.initial_rating || ""].filter(Boolean).join(" "),
        response_strategy: risk.response_strategy || "-",
        mitigation: risk.existing_controls || "-",
        target_date: formatDate(risk.target_response_date),
        response_status: risk.response_status || "-",
        residual_probability: risk.residual_likelihood ? String(risk.residual_likelihood) : "-",
        residual_impact: risk.residual_consequence ? String(risk.residual_consequence) : "-",
        residual_score: [risk.residual_score || "-", risk.residual_rating || ""].filter(Boolean).join(" "),
        owner: risk.owner || "-",
        status: risk.status || "-",
        residual_rating: risk.residual_rating,
      }));

      autoTable(doc, {
        startY: 40,
        theme: "grid",
        margin: { left: margin, right: margin, bottom: 14 },
        tableWidth: "auto",
        columns: [
          { header: "Risk ID", dataKey: "risk_id" },
          { header: "Project", dataKey: "project" },
          { header: "Phase", dataKey: "phase" },
          { header: "Activities", dataKey: "activities" },
          { header: "Description of Risk", dataKey: "description" },
          { header: "Prob", dataKey: "probability" },
          { header: "Impact", dataKey: "impact" },
          { header: "Score", dataKey: "score" },
          { header: "Strategy", dataKey: "response_strategy" },
          { header: "Mitigation / Controls", dataKey: "mitigation" },
          { header: "Target", dataKey: "target_date" },
          { header: "Response", dataKey: "response_status" },
          { header: "Res Prob", dataKey: "residual_probability" },
          { header: "Res Impact", dataKey: "residual_impact" },
          { header: "Res Score", dataKey: "residual_score" },
          { header: "Owner", dataKey: "owner" },
          { header: "Status", dataKey: "status" },
        ],
        body: reportRows,
        styles: {
          font: "helvetica",
          fontSize: 6.2,
          cellPadding: 1.1,
          lineColor: [208, 208, 206],
          lineWidth: 0.15,
          textColor: [0, 0, 0],
          overflow: "linebreak",
          valign: "top",
        },
        headStyles: {
          fillColor: [0, 0, 0],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        columnStyles: {
          risk_id: { cellWidth: 13 },
          project: { cellWidth: 16 },
          phase: { cellWidth: 14 },
          activities: { cellWidth: 20 },
          description: { cellWidth: 28 },
          probability: { cellWidth: 8, halign: "center" },
          impact: { cellWidth: 9, halign: "center" },
          score: { cellWidth: 13 },
          response_strategy: { cellWidth: 13 },
          mitigation: { cellWidth: 31 },
          target_date: { cellWidth: 14 },
          response_status: { cellWidth: 16 },
          residual_probability: { cellWidth: 9, halign: "center" },
          residual_impact: { cellWidth: 10, halign: "center" },
          residual_score: { cellWidth: 14 },
          owner: { cellWidth: 16 },
          status: { cellWidth: 14 },
        },
        didParseCell: (data) => {
          if (data.section !== "body") return;
          const row = data.row.raw as (typeof reportRows)[number];
          if (data.column.dataKey === "residual_score") {
            if (row.residual_rating === "Critical") {
              data.cell.styles.fillColor = [254, 226, 226];
              data.cell.styles.textColor = [153, 27, 27];
              data.cell.styles.fontStyle = "bold";
            }
            if (row.residual_rating === "High") {
              data.cell.styles.fillColor = [255, 237, 213];
              data.cell.styles.textColor = [154, 52, 18];
              data.cell.styles.fontStyle = "bold";
            }
          }
        },
        didDrawPage: () => {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(83, 86, 90);
          doc.text("Enshore Risk Management System", margin, pageHeight - 6);
          doc.text(
            `Page ${doc.getCurrentPageInfo().pageNumber} of ${doc.getNumberOfPages()}`,
            pageWidth - margin,
            pageHeight - 6,
            { align: "right" }
          );
        },
      });

      doc.save(`risk-register-${new Date().toISOString().slice(0, 10)}.pdf`);
      setMessage("Risk Register PDF generated successfully.");
    } catch (error) {
      console.error(error);
      setMessage("Risk Register PDF generation failed.");
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  return (
    <main>
      <ImsPermissionNotice />
      <QualityPageHero
        label="RISK MANAGEMENT"
        title="Risk Register"
        description="Create, edit, score, review, and maintain the Enshore project risk register."
        contextCards={[
          { label: "Last Refreshed", value: formatDateTime(lastRefreshed?.toISOString()) },
          { label: "Latest Risk", value: latestRiskLabel },
        ]}
      />

      <div className="ims-top-meta-row" style={topMetaRowStyle}>
        <Link href="/home" style={backLinkStyle}>
          ← Back to IMS Home
        </Link>

        <div style={statusBannerStyle}>
          <strong>Status:</strong> {message}
        </div>
      </div>
      <section style={statsGridStyle}>
        <QualityKpiCard title="Total Risks" value={risks.length} accent="#005670" />
        <QualityKpiCard title="Open Risks" value={openRisks} accent="#63B1BC" />
        <QualityKpiCard title="High / Critical" value={highCriticalRisks} accent="#F93822" />
        <QualityKpiCard title="Overdue Reviews" value={overdueReviews} accent="#FFAD00" />
      </section>

      <SectionCard title="Risk Register" subtitle="Filter and select a risk. Details open below the register.">
        <div style={registerActionRowStyle}>
          <button type="button" style={primaryButtonStyle} onClick={() => setShowCreateRisk((current) => !current)} disabled={!canCreateRisk}>
            {showCreateRisk ? "Hide Create Risk" : "Create Risk"}
          </button>
          <button
            type="button"
            style={secondaryButtonStyle}
            onClick={() => void generateRiskRegisterPdf()}
            disabled={isGeneratingPdf}
          >
            {isGeneratingPdf ? "Generating PDF..." : "Generate Risk Register PDF"}
          </button>
        </div>

        <div className="ims-filter-panel" style={filterGridStyle}>
          <button
            type="button"
            style={showRegisterFilters ? secondaryButtonStyle : primaryButtonStyle}
            onClick={() => setShowRegisterFilters((current) => !current)}
          >
            {showRegisterFilters ? "Hide Filters" : "Show Filters"}
          </button>
        </div>

        {showRegisterFilters ? (
        <div className="ims-filter-panel" style={filterGridStyle}>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={inputStyle}>
            <option value="">All statuses</option>
            {statusOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <select value={ratingFilter} onChange={(event) => setRatingFilter(event.target.value)} style={inputStyle}>
            <option value="">All residual ratings</option>
            {ratingOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} style={inputStyle}>
            <option value="">All departments</option>
            {departmentOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)} style={inputStyle}>
            <option value="">All owners</option>
            {uniqueOwners.map((owner) => (
              <option key={String(owner)} value={String(owner)}>{String(owner)}</option>
            ))}
          </select>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} style={inputStyle}>
            <option value="">All categories</option>
            {categoryOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} style={inputStyle}>
            <option value="">All Projects</option>
            {uniqueProjects.map((project) => (
              <option key={String(project)} value={String(project)}>{String(project)}</option>
            ))}
          </select>
          <button type="button" style={secondaryButtonStyle} onClick={clearFilters}>Clear Filters</button>
        </div>
        ) : null}

        <div style={filterSummaryStyle}>
          Showing {filteredRisks.length} of {risks.length} risk{risks.length === 1 ? "" : "s"}.
        </div>

        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={tableHeadStyle}>Risk ID</th>
                <th style={tableHeadStyle}>Risk</th>
                <th style={tableHeadStyle}>Phase</th>
                <th style={tableHeadStyle}>Owner</th>
                <th style={tableHeadStyle}>Initial</th>
                <th style={tableHeadStyle}>Residual</th>
                <th style={tableHeadStyle}>Response</th>
                <th style={tableHeadStyle}>Status</th>
                <th style={tableHeadStyle}>Target / Review</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} style={emptyTableCellStyle}>Loading risks...</td></tr>
              ) : filteredRisks.length === 0 ? (
                <tr><td colSpan={9} style={emptyTableCellStyle}>No risks match the current filters.</td></tr>
              ) : (
                filteredRisks.map((risk) => {
                  const active = selectedRisk?.id === risk.id;
                  return (
                    <tr
                      key={risk.id}
                      aria-selected={active}
                      data-selected={active ? "true" : "false"}
                      onClick={() => selectRisk(risk)}
                      style={{ ...tableRowStyle, background: active ? "#eef7f8" : "#ffffff" }}
                    >
                      <td style={tableCellStyle}><div style={riskNumberStyle}>{risk.risk_number || "-"}</div></td>
                      <td style={tableCellStyle}>
                        <div style={primaryCellTextStyle}>{risk.title || "-"}</div>
                        <div style={secondaryCellTextStyle}>{risk.category || "No category"} · {risk.department || "No department"}</div>
                      </td>
                      <td style={tableCellStyle}>{risk.project_phase || "-"}</td>
                      <td style={tableCellStyle}>{risk.owner || "-"}</td>
                      <td style={tableCellStyle}><span style={getRatingBadgeStyle(risk.initial_rating)}>{risk.initial_score || "-"} {risk.initial_rating || ""}</span></td>
                      <td style={tableCellStyle}><span style={getRatingBadgeStyle(risk.residual_rating)}>{risk.residual_score || "-"} {risk.residual_rating || ""}</span></td>
                      <td style={tableCellStyle}>{risk.response_status || "-"}</td>
                      <td style={tableCellStyle}><span style={getStatusBadgeStyle(risk.status)}>{risk.status || "Open"}</span></td>
                      <td style={tableCellStyle}>
                        <div>{formatDate(risk.target_response_date)}</div>
                        <div style={secondaryCellTextStyle}>Review {formatDate(risk.next_review_due)}</div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {showCreateRisk ? (
        <SectionCard title="Create Risk" subtitle={`Next risk number: ${getNextRiskNumber(risks)}`}>
          <RiskFormFields
            form={form}
            setForm={setForm}
            ownerOptions={createOwnerOptions}
            closedByOptions={createClosedByOptions}
            onSubmit={createRisk}
            submitText={isSaving ? "Saving..." : "Create Risk"}
            disabled={isSaving || !canCreateRisk}
          />
        </SectionCard>
      ) : null}

      {selectedRisk ? (
        <SectionCard
          title={`${selectedRisk.risk_number || "Risk"} Details`}
          subtitle="Open or hide the selected risk detail panel."
          action={
            <button type="button" style={secondaryButtonStyle} onClick={() => setShowDetails((current) => !current)}>
              {showDetails ? "Hide Details" : "Show Details"}
            </button>
          }
        >
          {showDetails ? (
            <form onSubmit={updateRisk}>
              <div style={detailHeaderStyle}>
                <div>
                  <div style={riskNumberStyle}>{selectedRisk.risk_number || "-"}</div>
                  <div style={detailTitleStyle}>{selectedRisk.title || "Untitled risk"}</div>
                </div>
                <button type="button" style={deleteButtonStyle} onClick={() => void deleteRisk()} disabled={!canEditRisk}>
                  Delete Risk
                </button>
              </div>

              <RiskFormFields
                form={editForm}
                setForm={setEditForm}
                ownerOptions={editOwnerOptions}
                closedByOptions={editClosedByOptions}
                submitText={isSaving ? "Saving..." : "Save Changes"}
                disabled={isSaving || !canEditRisk}
                hideFormTag
              />

              <div style={formFooterStyle}>
                <button type="submit" style={primaryButtonStyle} disabled={isSaving || !canEditRisk}>
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
                <span style={helperTextStyle}>
                  Created {formatDate(selectedRisk.created_at)} · Last updated {formatDateTime(selectedRisk.updated_at)}
                </span>
              </div>
            </form>
          ) : (
            <p style={emptyTextStyle}>Details are hidden. Use Show Details to edit or delete the selected risk.</p>
          )}
        </SectionCard>
      ) : null}
    </main>
  );
}

function RiskFormFields({
  form,
  setForm,
  ownerOptions,
  closedByOptions,
  onSubmit,
  submitText,
  disabled,
  hideFormTag = false,
}: {
  form: RiskForm;
  setForm: (form: RiskForm) => void;
  ownerOptions: string[];
  closedByOptions: string[];
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  submitText: string;
  disabled: boolean;
  hideFormTag?: boolean;
}) {
  const initialScore = getRiskScore(form.likelihood, form.consequence);
  const residualScore = getRiskScore(form.residual_likelihood, form.residual_consequence);

  const content = (
    <>
      <FormSection title="A. Core Details">
        <Field label="Risk Title">
          <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} style={inputStyle} placeholder="Risk title" />
        </Field>
        <Field label="Category">
          <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} style={inputStyle}>
            <option value="">Select category</option>
            {categoryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </Field>
        <Field label="Department">
          <select value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} style={inputStyle}>
            <option value="">Select department</option>
            {departmentOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </Field>
        <Field label="Risk Owner">
          <select value={form.owner} onChange={(event) => setForm({ ...form, owner: event.target.value })} style={inputStyle}>
            <option value="">Select owner</option>
            {ownerOptions.map((owner) => <option key={owner} value={owner}>{owner}</option>)}
          </select>
        </Field>
        <Field label="Project">
          <input value={form.project} onChange={(event) => setForm({ ...form, project: event.target.value })} style={inputStyle} />
        </Field>
        <Field label="Project Phase">
          <select value={form.project_phase} onChange={(event) => setForm({ ...form, project_phase: event.target.value })} style={inputStyle}>
            <option value="">Select phase</option>
            {phaseOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </Field>
      </FormSection>

      <FormSection title="B. Description and Impacted Work">
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Description of Risk">
            <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} style={largeTextAreaStyle} />
          </Field>
        </div>
        <Field label="Impacted Activities">
          <textarea value={form.impacted_activities} onChange={(event) => setForm({ ...form, impacted_activities: event.target.value })} style={textAreaStyle} />
        </Field>
        <Field label="Milestones Impacted">
          <textarea value={form.milestones_impacted} onChange={(event) => setForm({ ...form, milestones_impacted: event.target.value })} style={textAreaStyle} />
        </Field>
      </FormSection>

      <FormSection title="C. Initial Assessment">
        <ScoreFields
          probability={form.likelihood}
          impact={form.consequence}
          score={initialScore}
          rating={getRiskRating(initialScore)}
          probabilityLabel="Probability"
          impactLabel="Impact"
          onProbabilityChange={(value) => setForm({ ...form, likelihood: value })}
          onImpactChange={(value) => setForm({ ...form, consequence: value })}
        />
      </FormSection>

      <FormSection title="D. Response / Mitigation">
        <Field label="Response Strategy">
          <select value={form.response_strategy} onChange={(event) => setForm({ ...form, response_strategy: event.target.value })} style={inputStyle}>
            <option value="">Select strategy</option>
            {responseStrategyOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </Field>
        <Field label="Response Status">
          <select value={form.response_status} onChange={(event) => setForm({ ...form, response_status: event.target.value })} style={inputStyle}>
            <option value="">Select response status</option>
            {responseStatusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </Field>
        <Field label="Target Response Date">
          <input type="date" value={form.target_response_date} onChange={(event) => setForm({ ...form, target_response_date: event.target.value })} style={inputStyle} />
        </Field>
        <Field label="Procedure Number">
          <input value={form.procedure_number} onChange={(event) => setForm({ ...form, procedure_number: event.target.value })} style={inputStyle} />
        </Field>
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Mitigation Action / Controls / Window of Opportunity">
            <textarea value={form.existing_controls} onChange={(event) => setForm({ ...form, existing_controls: event.target.value })} style={largeTextAreaStyle} />
          </Field>
        </div>
      </FormSection>

      <FormSection title="E. Impact Areas">
        <ImpactCheckbox label="Quality / Fit for Purpose" checked={form.quality_fit_for_purpose} onChange={(checked) => setForm({ ...form, quality_fit_for_purpose: checked })} />
        <ImpactCheckbox label="Operation" checked={form.operation} onChange={(checked) => setForm({ ...form, operation: checked })} />
        <ImpactCheckbox label="Financial" checked={form.financial} onChange={(checked) => setForm({ ...form, financial: checked })} />
        <ImpactCheckbox label="Schedule" checked={form.schedule} onChange={(checked) => setForm({ ...form, schedule: checked })} />
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Estimated Financial Impact">
            <input value={form.estimated_financial_impact} onChange={(event) => setForm({ ...form, estimated_financial_impact: event.target.value })} style={inputStyle} />
          </Field>
        </div>
      </FormSection>

      <FormSection title="F. Residual Assessment">
        <ScoreFields
          probability={form.residual_likelihood}
          impact={form.residual_consequence}
          score={residualScore}
          rating={getRiskRating(residualScore)}
          probabilityLabel="Residual Probability"
          impactLabel="Residual Impact"
          onProbabilityChange={(value) => setForm({ ...form, residual_likelihood: value })}
          onImpactChange={(value) => setForm({ ...form, residual_consequence: value })}
        />
      </FormSection>

      <FormSection title="G. Status / Closure / Learning">
        <Field label="Status">
          <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} style={inputStyle}>
            {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </Field>
        <Field label="Review Date">
          <input type="date" value={form.review_date} onChange={(event) => setForm({ ...form, review_date: event.target.value })} style={inputStyle} />
        </Field>
        <Field label="Next Review Due">
          <input type="date" value={form.next_review_due} onChange={(event) => setForm({ ...form, next_review_due: event.target.value })} style={inputStyle} />
        </Field>
        <Field label="Date Closed">
          <input type="date" value={form.date_closed} onChange={(event) => setForm({ ...form, date_closed: event.target.value })} style={inputStyle} />
        </Field>
        <Field label="Closed By">
          <select value={form.closed_by} onChange={(event) => setForm({ ...form, closed_by: event.target.value })} style={inputStyle}>
            <option value="">Select person</option>
            {closedByOptions.map((person) => <option key={person} value={person}>{person}</option>)}
          </select>
        </Field>
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Comments">
            <textarea value={form.comments} onChange={(event) => setForm({ ...form, comments: event.target.value })} style={textAreaStyle} />
          </Field>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Lesson Learnt">
            <textarea value={form.lesson_learned} onChange={(event) => setForm({ ...form, lesson_learned: event.target.value })} style={textAreaStyle} />
          </Field>
        </div>
      </FormSection>

      {!hideFormTag ? (
        <div style={formFooterStyle}>
          <button type="submit" style={primaryButtonStyle} disabled={disabled}>{submitText}</button>
          <span style={helperTextStyle}>
            Initial: {initialScore} {getRiskRating(initialScore)} · Residual: {residualScore} {getRiskRating(residualScore)}
          </span>
        </div>
      ) : null}
    </>
  );

  if (hideFormTag) return content;
  return <form onSubmit={onSubmit}>{content}</form>;
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={formSectionStyle}>
      <h3 style={formSectionTitleStyle}>{title}</h3>
      <div style={formGridStyle}>{children}</div>
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

function ImpactCheckbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label style={checkboxCardStyle}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function ScoreFields({
  probability,
  impact,
  score,
  rating,
  probabilityLabel,
  impactLabel,
  onProbabilityChange,
  onImpactChange,
}: {
  probability: number;
  impact: number;
  score: number;
  rating: RiskRating;
  probabilityLabel: string;
  impactLabel: string;
  onProbabilityChange: (value: number) => void;
  onImpactChange: (value: number) => void;
}) {
  return (
    <>
      <Field label={probabilityLabel}>
        <select value={probability} onChange={(event) => onProbabilityChange(Number(event.target.value))} style={inputStyle}>
          {scoreOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </Field>
      <Field label={impactLabel}>
        <select value={impact} onChange={(event) => onImpactChange(Number(event.target.value))} style={inputStyle}>
          {scoreOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </Field>
      <div style={scoreCardStyle}><span style={scoreLabelStyle}>Score</span><strong style={scoreValueStyle}>{score}</strong></div>
      <div style={scoreCardStyle}><span style={scoreLabelStyle}>Rating</span><span style={getRatingBadgeStyle(rating)}>{rating}</span></div>
    </>
  );
}

function SectionCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section style={panelStyle}>
      <div style={sectionHeaderRowStyle}>
        <div>
          <h2 style={sectionTitleStyle}>{title}</h2>
          {subtitle ? <p style={sectionSubtitleStyle}>{subtitle}</p> : null}
        </div>
        {action || null}
      </div>
      {children}
    </section>
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
  border: "1px solid #D0D0CE",
  borderRadius: "14px",
  padding: "12px 14px",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
};
const topMetaActionsStyle: CSSProperties = { display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" };
const backLinkStyle: CSSProperties = { color: "#005670", fontWeight: 700, textDecoration: "none" };
const statusBannerStyle: CSSProperties = { background: "white", borderRadius: "12px", padding: "12px 16px", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)", color: "#000000" };
const statsGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "16px", marginBottom: "20px" };
const panelStyle: CSSProperties = { background: "white", borderRadius: "18px", padding: "20px", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)", marginBottom: "20px" };
const sectionHeaderRowStyle: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "16px", flexWrap: "wrap" };
const sectionTitleStyle: CSSProperties = { margin: 0, fontSize: "20px", color: "#000000" };
const sectionSubtitleStyle: CSSProperties = { margin: "6px 0 0", color: "#53565A", fontSize: "14px", lineHeight: 1.45 };
const registerActionRowStyle: CSSProperties = { display: "flex", justifyContent: "flex-start", marginBottom: "14px" };
const formSectionStyle: CSSProperties = { border: "1px solid #D0D0CE", borderRadius: "16px", padding: "16px", marginBottom: "16px", background: "#ffffff" };
const formSectionTitleStyle: CSSProperties = { margin: "0 0 14px", color: "#000000", fontSize: "16px" };
const formGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "14px" };
const fieldWrapStyle: CSSProperties = { display: "grid", gap: "6px" };
const fieldLabelStyle: CSSProperties = { fontSize: "13px", fontWeight: 700, color: "#53565A" };
const inputStyle: CSSProperties = { padding: "11px 12px", borderRadius: "10px", border: "1px solid #D0D0CE", background: "white", color: "#000000", width: "100%", boxSizing: "border-box" };
const textAreaStyle: CSSProperties = { ...inputStyle, minHeight: "96px", resize: "vertical", fontFamily: "\"Azo Sans\", \"Segoe UI\", Arial, Helvetica, sans-serif" };
const largeTextAreaStyle: CSSProperties = { ...textAreaStyle, minHeight: "124px" };
const scoreCardStyle: CSSProperties = { borderRadius: "12px", border: "1px solid #D0D0CE", background: "#ECECE7", padding: "10px 12px", minHeight: "68px", display: "flex", flexDirection: "column", justifyContent: "space-between" };
const scoreLabelStyle: CSSProperties = { color: "#53565A", fontSize: "12px", fontWeight: 800 };
const scoreValueStyle: CSSProperties = { color: "#000000", fontSize: "24px", lineHeight: 1 };
const checkboxCardStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "10px", border: "1px solid #D0D0CE", borderRadius: "12px", padding: "12px 14px", background: "#ECECE7", color: "#53565A", fontWeight: 700 };
const formFooterStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginTop: "16px" };
const helperTextStyle: CSSProperties = { color: "#53565A", fontSize: "13px" };
const primaryButtonStyle: CSSProperties = { background: "#005670", color: "white", border: "none", padding: "11px 16px", borderRadius: "10px", cursor: "pointer", fontWeight: 700 };
const secondaryButtonStyle: CSSProperties = { background: "#D0D0CE", color: "#000000", border: "none", padding: "10px 16px", borderRadius: "10px", cursor: "pointer", fontWeight: 700 };
const deleteButtonStyle: CSSProperties = { background: "#F93822", color: "white", border: "none", padding: "10px 16px", borderRadius: "10px", cursor: "pointer", fontWeight: 700 };
const filterGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
  alignItems: "end",
  marginBottom: "14px",
  padding: "12px",
  border: "1px solid #D0D0CE",
  borderRadius: "16px",
  background: "rgba(248,250,252,0.92)",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
};
const filterSummaryStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: "4px",
  flexWrap: "wrap",
  color: "#53565A",
  fontSize: "13px",
  fontWeight: 700,
  margin: "12px 0",
};
const tableWrapStyle: CSSProperties = {
  overflowX: "auto",
  border: "1px solid #D0D0CE",
  borderRadius: "14px",
  background: "#ffffff",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
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
  background: "#ECECE7",
  color: "#53565A",
  fontSize: "12px",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  borderBottom: "1px solid #D0D0CE",
  whiteSpace: "nowrap",
};
const tableRowStyle: CSSProperties = {
  cursor: "pointer",
  transition: "background 140ms ease",
};
const tableCellStyle: CSSProperties = {
  padding: "13px 14px",
  borderBottom: "1px solid #ECECE7",
  color: "#000000",
  verticalAlign: "middle",
  fontSize: "13px",
  lineHeight: 1.45,
};
const emptyTableCellStyle: CSSProperties = {
  padding: "26px 14px",
  textAlign: "center",
  color: "#53565A",
  background: "#ECECE7",
  borderBottom: "1px dashed #D0D0CE",
};
const riskNumberStyle: CSSProperties = { fontSize: "12px", fontWeight: 800, color: "#005670", whiteSpace: "nowrap" };
const primaryCellTextStyle: CSSProperties = { fontWeight: 700, color: "#000000" };
const secondaryCellTextStyle: CSSProperties = { fontSize: "12px", color: "#53565A", marginTop: "4px" };
const badgeStyle: CSSProperties = { padding: "5px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 800, display: "inline-block", whiteSpace: "nowrap" };
const detailHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "14px",
  alignItems: "center",
  flexWrap: "wrap",
  paddingBottom: "14px",
  marginBottom: "18px",
  borderBottom: "1px solid #D0D0CE",
};
const detailTitleStyle: CSSProperties = { marginTop: "4px", fontSize: "22px", fontWeight: 800, color: "#000000" };
const emptyTextStyle: CSSProperties = { color: "#53565A", margin: 0 };

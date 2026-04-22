"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../src/lib/supabase";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Asset = {
  id: string;
  asset_code: string | null;
  name: string | null;
  description: string | null;
  location: string | null;
  owner: string | null;
  status: string | null;
};

type Ncr = {
  id: string;
  ncr_number: string | null;
  title: string | null;
  severity: string | null;
  status: string | null;
  owner: string | null;
  area: string | null;
};

type Capa = {
  id: string;
  capa_number: string | null;
  title: string | null;
  status: string | null;
  owner: string | null;
  linked_to: string | null;
};

type ActionItem = {
  id: string;
  action_number: string | null;
  title: string | null;
  owner: string | null;
  priority: string | null;
  status: string | null;
  due_date: string | null;
};

type AuditRecord = {
  id: string;
  audit_number: string | null;
  title: string | null;
  audit_type: string | null;
  auditee: string | null;
  lead_auditor: string | null;
  audit_date: string | null;
  audit_month: string | null;
  status: string | null;
  location: string | null;
};

type AuditFinding = {
  id: string;
  audit_id: string;
  reference: string | null;
  clause: string | null;
  category: string | null;
  description: string | null;
  owner: string | null;
  status: string | null;
  due_date: string | null;
  closure_date: string | null;
};

type MonthlyReport = {
  id: string;
  month_label: string;
  summary: string | null;
  wins: string | null;
  risks: string | null;
  next_steps: string | null;
  snapshot_json: Record<string, unknown> | null;
  created_at: string | null;
};

const emptyForm = {
  month_label: "",
  summary: "",
  wins: "",
  risks: "",
  next_steps: "",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAuditMonth(value: string | null | undefined) {
  if (!value) return "-";
  const [year, month] = value.split("-");
  if (!year || !month) return value;

  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function isClosedStatus(value: string | null | undefined) {
  const normal = (value || "").trim().toLowerCase();
  return normal === "closed" || normal === "complete" || normal === "completed";
}

function getDaysFromToday(value: string | null | undefined) {
  if (!value) return null;

  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return null;

  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffMs = due.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function toDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getAuditStatusTone(status: string | null | undefined) {
  const value = (status || "").toLowerCase();
  if (value.includes("overdue")) return { bg: "#fee2e2", color: "#991b1b" };
  if (value.includes("progress")) return { bg: "#fef3c7", color: "#92400e" };
  if (value.includes("planned")) return { bg: "#dbeafe", color: "#1d4ed8" };
  if (value.includes("completed") || value.includes("closed")) return { bg: "#dcfce7", color: "#166534" };
  if (value.includes("cancelled")) return { bg: "#e2e8f0", color: "#334155" };
  return { bg: "#e2e8f0", color: "#334155" };
}

export default function ReportsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [ncrs, setNcrs] = useState<Ncr[]>([]);
  const [capas, setCapas] = useState<Capa[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [auditFindings, setAuditFindings] = useState<AuditFinding[]>([]);
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [message, setMessage] = useState("Loading reports dashboard...");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [logoFileName, setLogoFileName] = useState("/enshore-logo.png");
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  const [form, setForm] = useState(emptyForm);

  async function loadData() {
    const [assetsRes, ncrsRes, capasRes, actionsRes, auditsRes, findingsRes, reportsRes] =
      await Promise.all([
        supabase.from("assets").select("*"),
        supabase.from("ncrs").select("*"),
        supabase.from("capas").select("*"),
        supabase.from("actions").select("*"),
        supabase.from("audits").select("*"),
        supabase.from("audit_findings").select("*"),
        supabase.from("monthly_reports").select("*").order("created_at", { ascending: false }),
      ]);

    if (
      assetsRes.error ||
      ncrsRes.error ||
      capasRes.error ||
      actionsRes.error ||
      auditsRes.error ||
      findingsRes.error ||
      reportsRes.error
    ) {
      setMessage(
        `Error: ${
          assetsRes.error?.message ||
          ncrsRes.error?.message ||
          capasRes.error?.message ||
          actionsRes.error?.message ||
          auditsRes.error?.message ||
          findingsRes.error?.message ||
          reportsRes.error?.message
        }`
      );
      return;
    }

    setAssets((assetsRes.data || []) as Asset[]);
    setNcrs((ncrsRes.data || []) as Ncr[]);
    setCapas((capasRes.data || []) as Capa[]);
    setActions((actionsRes.data || []) as ActionItem[]);
    setAudits((auditsRes.data || []) as AuditRecord[]);
    setAuditFindings((findingsRes.data || []) as AuditFinding[]);
    setReports((reportsRes.data || []) as MonthlyReport[]);
    setLastRefreshed(new Date().toLocaleString("en-GB"));
    setMessage("Reports dashboard loaded successfully.");
  }

  useEffect(() => {
    void loadData();
  }, []);

  const totalAssets = assets.length;
  const openNcrs = ncrs.filter((n) => !isClosedStatus(n.status)).length;
  const openCapas = capas.filter((c) => !isClosedStatus(c.status)).length;
  const openActions = actions.filter((a) => !isClosedStatus(a.status)).length;
  const totalAudits = audits.length;
  const openAuditFindings = auditFindings.filter((finding) => !isClosedStatus(finding.status)).length;

  const overdueActions = actions.filter((action) => {
    if (!action.due_date) return false;
    if (isClosedStatus(action.status)) return false;

    const due = new Date(action.due_date);
    const today = new Date();
    due.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    return due < today;
  }).length;

  const majorOpenNcrs = ncrs.filter(
    (n) => (n.severity || "").toLowerCase() === "major" && !isClosedStatus(n.status)
  ).length;

  const overdueAudits = audits.filter((audit) => (audit.status || "").toLowerCase() === "overdue").length;

  const majorOpenAuditFindings = auditFindings.filter(
    (finding) =>
      (finding.category || "").toLowerCase() === "major" && !isClosedStatus(finding.status)
  ).length;

  const ncrStatusChart = useMemo(() => {
    const groups = ncrs.reduce<Record<string, number>>((acc, ncr) => {
      const key = ncr.status || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [ncrs]);

  const capaStatusChart = useMemo(() => {
    const groups = capas.reduce<Record<string, number>>((acc, capa) => {
      const key = capa.status || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [capas]);

  const actionStatusChart = useMemo(() => {
    const groups = actions.reduce<Record<string, number>>((acc, action) => {
      const key = action.status || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [actions]);

  const assetLocationChart = useMemo(() => {
    const groups = assets.reduce<Record<string, number>>((acc, asset) => {
      const key = asset.location || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [assets]);

  const auditStatusChart = useMemo(() => {
    const groups = audits.reduce<Record<string, number>>((acc, audit) => {
      const key = audit.status || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [audits]);

  const auditTypeChart = useMemo(() => {
    const groups = audits.reduce<Record<string, number>>((acc, audit) => {
      const key = audit.audit_type || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [audits]);

  const openNcrRows = useMemo(
    () =>
      ncrs
        .filter((n) => !isClosedStatus(n.status))
        .map((n) => [
          n.ncr_number || "-",
          n.title || "-",
          n.severity || "-",
          n.status || "-",
          n.owner || "-",
          n.area || "-",
        ]),
    [ncrs]
  );

  const openCapaRows = useMemo(
    () =>
      capas
        .filter((c) => !isClosedStatus(c.status))
        .map((c) => [
          c.capa_number || "-",
          c.title || "-",
          c.status || "-",
          c.owner || "-",
          c.linked_to || "-",
        ]),
    [capas]
  );

  const openActionRows = useMemo(
    () =>
      actions
        .filter((a) => !isClosedStatus(a.status))
        .map((a) => [
          a.action_number || "-",
          a.title || "-",
          a.priority || "-",
          a.status || "-",
          a.owner || "-",
          formatDate(a.due_date),
        ]),
    [actions]
  );

  const auditRows = useMemo(
    () =>
      audits.map((audit) => [
        audit.audit_number || "-",
        audit.title || "-",
        audit.audit_type || "-",
        audit.status || "-",
        formatAuditMonth(audit.audit_month),
        formatDate(audit.audit_date),
      ]),
    [audits]
  );

  const auditFindingRows = useMemo(
    () =>
      auditFindings
        .filter((finding) => !isClosedStatus(finding.status))
        .map((finding) => {
          const parentAudit = audits.find((audit) => audit.id === finding.audit_id);
          return [
            parentAudit?.audit_number || "-",
            finding.reference || "-",
            finding.category || "-",
            finding.status || "-",
            finding.owner || "-",
            formatDate(finding.due_date),
          ];
        }),
    [auditFindings, audits]
  );

  const auditAttentionList = useMemo(() => {
    return [...audits]
      .filter((audit) => {
        const status = (audit.status || "").toLowerCase();
        return status === "overdue" || status === "planned" || status === "in progress";
      })
      .sort((a, b) => {
        const aStatus = (a.status || "").toLowerCase();
        const bStatus = (b.status || "").toLowerCase();
        const aRank = aStatus === "overdue" ? 0 : aStatus === "in progress" ? 1 : 2;
        const bRank = bStatus === "overdue" ? 0 : bStatus === "in progress" ? 1 : 2;

        if (aRank !== bRank) return aRank - bRank;

        const aDate = a.audit_date ? new Date(a.audit_date).getTime() : Number.MAX_SAFE_INTEGER;
        const bDate = b.audit_date ? new Date(b.audit_date).getTime() : Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
      })
      .slice(0, 6);
  }, [audits]);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function handleEdit(report: MonthlyReport) {
    setEditingId(report.id);
    setForm({
      month_label: report.month_label || "",
      summary: report.summary || "",
      wins: report.wins || "",
      risks: report.risks || "",
      next_steps: report.next_steps || "",
    });
    setMessage(`Editing report: ${report.month_label}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Are you sure you want to delete this report?");
    if (!confirmed) return;

    const { error } = await supabase.from("monthly_reports").delete().eq("id", id);

    if (error) {
      setMessage(`Delete failed: ${error.message}`);
      return;
    }

    if (editingId === id) {
      resetForm();
    }

    setMessage("Monthly report deleted successfully.");
    await loadData();
  }

  async function saveMonthlyReport(e: React.FormEvent) {
    e.preventDefault();

    if (!form.month_label.trim()) {
      setMessage("Month label is required.");
      return;
    }

    const snapshot = {
      total_assets: totalAssets,
      open_ncrs: openNcrs,
      open_capas: openCapas,
      open_actions: openActions,
      overdue_actions: overdueActions,
      major_open_ncrs: majorOpenNcrs,
      total_audits: totalAudits,
      overdue_audits: overdueAudits,
      open_audit_findings: openAuditFindings,
      major_open_audit_findings: majorOpenAuditFindings,
    };

    if (editingId) {
      const { error } = await supabase
        .from("monthly_reports")
        .update({
          month_label: form.month_label,
          summary: form.summary || null,
          wins: form.wins || null,
          risks: form.risks || null,
          next_steps: form.next_steps || null,
          snapshot_json: snapshot,
        })
        .eq("id", editingId);

      if (error) {
        setMessage(`Update report failed: ${error.message}`);
        return;
      }

      setMessage("Monthly report updated successfully.");
    } else {
      const { error } = await supabase.from("monthly_reports").insert([
        {
          month_label: form.month_label,
          summary: form.summary || null,
          wins: form.wins || null,
          risks: form.risks || null,
          next_steps: form.next_steps || null,
          snapshot_json: snapshot,
        },
      ]);

      if (error) {
        setMessage(`Save report failed: ${error.message}`);
        return;
      }

      setMessage("Monthly report saved successfully.");
    }

    resetForm();
    await loadData();
  }

  async function generatePdfReport(sourceReport?: MonthlyReport) {
    try {
      setIsGeneratingPdf(true);

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      const reportSource = sourceReport || null;
      const reportTitle =
        reportSource?.month_label?.trim() ||
        form.month_label?.trim() ||
        `Management Report - ${new Date().toLocaleDateString("en-GB")}`;
      const generatedAt = new Date().toLocaleString("en-GB");

      try {
        const logoResponse = await fetch(logoFileName);
        if (logoResponse.ok) {
          const logoBlob = await logoResponse.blob();
          const logoFile = new File([logoBlob], "enshore-logo.png", {
            type: logoBlob.type || "image/png",
          });
          const logoDataUrl = await toDataUrl(logoFile);
          doc.addImage(logoDataUrl, "PNG", margin, 10, 48, 22);
        }
      } catch {
        // Ignore logo fetch errors so the PDF still generates.
      }

      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(20);
      doc.text("Quality Management Report", pageWidth - margin, 18, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(71, 85, 105);
      doc.text(reportTitle, pageWidth - margin, 25, { align: "right" });
      doc.text(`Generated: ${generatedAt}`, pageWidth - margin, 31, { align: "right" });

      doc.setDrawColor(15, 118, 110);
      doc.setLineWidth(0.7);
      doc.line(margin, 37, pageWidth - margin, 37);

      let y = 45;

      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(13);
      doc.text("Executive Summary", margin, y);
      y += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(51, 65, 85);

      const summaryText = reportSource?.summary?.trim()
        ? reportSource.summary.trim()
        : form.summary?.trim()
        ? form.summary.trim()
        : "This report provides a live snapshot of assets, NCRs, CAPAs, audits and actions across the quality dashboard.";
      const summaryLines = doc.splitTextToSize(summaryText, pageWidth - margin * 2);
      doc.text(summaryLines, margin, y);
      y += summaryLines.length * 4.7 + 5;

      const kpiRows = [
        ["Total Assets", String(totalAssets), "Open NCRs", String(openNcrs)],
        ["Open CAPAs", String(openCapas), "Open Actions", String(openActions)],
        ["Overdue Actions", String(overdueActions), "Major Open NCRs", String(majorOpenNcrs)],
        ["Total Audits", String(totalAudits), "Overdue Audits", String(overdueAudits)],
        ["Open Audit Findings", String(openAuditFindings), "Major Open Findings", String(majorOpenAuditFindings)],
      ];

      autoTable(doc, {
        startY: y,
        theme: "grid",
        body: kpiRows,
        styles: {
          fontSize: 10,
          cellPadding: 3.5,
          textColor: [15, 23, 42],
          lineColor: [203, 213, 225],
          lineWidth: 0.2,
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { fontStyle: "bold", fillColor: [240, 249, 255] },
          1: { halign: "center", fontStyle: "bold" },
          2: { fontStyle: "bold", fillColor: [240, 249, 255] },
          3: { halign: "center", fontStyle: "bold" },
        },
        margin: { left: margin, right: margin },
      });

      y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y;
      y += 8;

      const sectionText = (label: string, text: string | null, fallback: string) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text(label, margin, y);
        y += 5;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10.3);
        doc.setTextColor(71, 85, 105);
        const lines = doc.splitTextToSize(text?.trim() || fallback, pageWidth - margin * 2);
        doc.text(lines, margin, y);
        y += lines.length * 4.5 + 6;
      };

      sectionText("Wins", reportSource?.wins || form.wins, "No wins recorded for this report.");
      sectionText("Risks", reportSource?.risks || form.risks, "No risks recorded for this report.");
      sectionText("Next Steps", reportSource?.next_steps || form.next_steps, "No next steps recorded for this report.");

      const ensurePageSpace = (neededHeight: number) => {
        if (y + neededHeight > pageHeight - 18) {
          doc.addPage();
          y = 18;
        }
      };

      ensurePageSpace(18);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text("Open NCR Register", margin, y);
      y += 4;

      autoTable(doc, {
        startY: y + 2,
        head: [["NCR No.", "Title", "Severity", "Status", "Owner", "Area"]],
        body: openNcrRows.length ? openNcrRows : [["-", "No open NCRs", "-", "-", "-", "-"]],
        theme: "grid",
        headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255], fontStyle: "bold" },
        styles: { fontSize: 9, cellPadding: 2.8, lineColor: [226, 232, 240], lineWidth: 0.2 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: margin, right: margin },
      });

      y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y) + 10;
      ensurePageSpace(18);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Open CAPA Register", margin, y);
      y += 4;

      autoTable(doc, {
        startY: y + 2,
        head: [["CAPA No.", "Title", "Status", "Owner", "Linked NCR"]],
        body: openCapaRows.length ? openCapaRows : [["-", "No open CAPAs", "-", "-", "-"]],
        theme: "grid",
        headStyles: { fillColor: [124, 58, 237], textColor: [255, 255, 255], fontStyle: "bold" },
        styles: { fontSize: 9, cellPadding: 2.8, lineColor: [226, 232, 240], lineWidth: 0.2 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: margin, right: margin },
      });

      y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y) + 10;
      ensurePageSpace(18);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Open Actions Register", margin, y);
      y += 4;

      autoTable(doc, {
        startY: y + 2,
        head: [["Action No.", "Title", "Priority", "Status", "Owner", "Due Date"]],
        body: openActionRows.length ? openActionRows : [["-", "No open actions", "-", "-", "-", "-"]],
        theme: "grid",
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: "bold" },
        styles: { fontSize: 9, cellPadding: 2.8, lineColor: [226, 232, 240], lineWidth: 0.2 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: margin, right: margin },
      });

      y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y) + 10;
      ensurePageSpace(18);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Audit Programme Register", margin, y);
      y += 4;

      autoTable(doc, {
        startY: y + 2,
        head: [["Audit No.", "Title", "Type", "Status", "Month", "Audit Date"]],
        body: auditRows.length ? auditRows : [["-", "No audits", "-", "-", "-", "-"]],
        theme: "grid",
        headStyles: { fillColor: [8, 145, 178], textColor: [255, 255, 255], fontStyle: "bold" },
        styles: { fontSize: 9, cellPadding: 2.8, lineColor: [226, 232, 240], lineWidth: 0.2 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: margin, right: margin },
      });

      y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y) + 10;
      ensurePageSpace(18);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Open Audit Findings", margin, y);
      y += 4;

      autoTable(doc, {
        startY: y + 2,
        head: [["Audit No.", "Ref", "Category", "Status", "Owner", "Due Date"]],
        body: auditFindingRows.length
          ? auditFindingRows
          : [["-", "-", "No open audit findings", "-", "-", "-"]],
        theme: "grid",
        headStyles: { fillColor: [124, 58, 237], textColor: [255, 255, 255], fontStyle: "bold" },
        styles: { fontSize: 9, cellPadding: 2.8, lineColor: [226, 232, 240], lineWidth: 0.2 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: margin, right: margin },
      });

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i += 1) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`Enshore Subsea · ${reportTitle}`, margin, pageHeight - 8);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 8, {
          align: "right",
        });
      }

      const pdfBlob = doc.output("blob");
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, "_blank", "noopener,noreferrer");
      doc.save(`${reportTitle.replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "-")}.pdf`);
      setMessage("PDF generated successfully.");
    } catch (error) {
      console.error(error);
      setMessage("PDF generation failed.");
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  return (
    <main>
      <section style={heroStyle}>
        <div>
          <div style={eyebrowStyle}>Management Reporting</div>
          <h1 style={heroTitleStyle}>Reports</h1>
          <p style={heroSubtitleStyle}>
            Build monthly management summaries using the current live system data,
            now including audits and audit findings as part of the reporting pack.
          </p>
        </div>

        <div style={heroMetaWrapStyle}>
          <div style={heroMetaCardStyle}>
            <div style={heroMetaLabelStyle}>Saved Reports</div>
            <div style={heroMetaValueStyle}>{reports.length}</div>
          </div>
          <div style={heroMetaCardStyle}>
            <div style={heroMetaLabelStyle}>Open Items</div>
            <div style={heroMetaValueStyle}>{openNcrs + openCapas + openActions + openAuditFindings}</div>
          </div>
          <div style={heroMetaCardStyle}>
            <div style={heroMetaLabelStyle}>Audit Programme</div>
            <div style={heroMetaValueStyle}>{totalAudits}</div>
          </div>
          <div style={heroMetaCardStyle}>
            <div style={heroMetaLabelStyle}>Last Refreshed</div>
            <div style={heroMetaValueStyle}>{lastRefreshed || "-"}</div>
          </div>
        </div>
      </section>

      <div
        style={{
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <Link href="/" style={backLinkStyle}>
          ← Back to Dashboard
        </Link>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            style={secondaryButtonStyle}
            onClick={() => setLogoFileName("/enshore-logo.png")}
          >
            Use /enshore-logo.png
          </button>
          <button
            type="button"
            style={pdfButtonStyle}
            onClick={() => void generatePdfReport()}
            disabled={isGeneratingPdf}
          >
            {isGeneratingPdf ? "Generating PDF..." : "Generate PDF Report"}
          </button>
        </div>
      </div>

      <section style={statsGridStyle}>
        <StatCard title="Total Assets" value={totalAssets} accent="#0f766e" />
        <StatCard title="Open NCRs" value={openNcrs} accent="#dc2626" />
        <StatCard title="Open CAPAs" value={openCapas} accent="#f59e0b" />
        <StatCard title="Open Actions" value={openActions} accent="#2563eb" />
        <StatCard title="Overdue Actions" value={overdueActions} accent="#b91c1c" />
        <StatCard title="Overdue Audits" value={overdueAudits} accent="#7c3aed" />
      </section>

      <section style={statusBannerStyle}>
        <strong>Status:</strong> {message}
      </section>

      <section style={twoColumnGridStyle}>
        <div style={panelStyle}>
          <div style={sectionHeaderRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>
                {editingId ? "Edit Monthly Report" : "Create Monthly Report"}
              </h2>
              <p style={sectionSubtitleStyle}>
                Build an executive summary using live asset, NCR, CAPA, audit and action data.
              </p>
            </div>
          </div>

          <form onSubmit={saveMonthlyReport}>
            <div style={{ display: "grid", gap: "12px" }}>
              <input
                placeholder="Month Label (e.g. April 2026)"
                value={form.month_label}
                onChange={(e) => setForm({ ...form, month_label: e.target.value })}
                style={inputStyle}
              />
              <textarea
                placeholder="Summary"
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                rows={4}
                style={textareaStyle}
              />
              <textarea
                placeholder="Wins"
                value={form.wins}
                onChange={(e) => setForm({ ...form, wins: e.target.value })}
                rows={4}
                style={textareaStyle}
              />
              <textarea
                placeholder="Risks"
                value={form.risks}
                onChange={(e) => setForm({ ...form, risks: e.target.value })}
                rows={4}
                style={textareaStyle}
              />
              <textarea
                placeholder="Next Steps"
                value={form.next_steps}
                onChange={(e) => setForm({ ...form, next_steps: e.target.value })}
                rows={4}
                style={textareaStyle}
              />
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "12px", flexWrap: "wrap" }}>
              <button type="submit" style={primaryButtonStyle}>
                {editingId ? "Update Monthly Report" : "Save Monthly Report"}
              </button>

              {editingId && (
                <button type="button" style={secondaryButtonStyle} onClick={resetForm}>
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </div>

        <div style={panelStyle}>
          <div style={sectionHeaderRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Executive Snapshot</h2>
              <p style={sectionSubtitleStyle}>
                Current live headline metrics for the management summary.
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gap: "12px" }}>
            <SnapshotRow label="Total Assets" value={totalAssets} />
            <SnapshotRow label="Open NCRs" value={openNcrs} />
            <SnapshotRow label="Major Open NCRs" value={majorOpenNcrs} />
            <SnapshotRow label="Open CAPAs" value={openCapas} />
            <SnapshotRow label="Open Actions" value={openActions} />
            <SnapshotRow label="Overdue Actions" value={overdueActions} />
            <SnapshotRow label="Total Audits" value={totalAudits} />
            <SnapshotRow label="Overdue Audits" value={overdueAudits} />
            <SnapshotRow label="Open Audit Findings" value={openAuditFindings} />
            <SnapshotRow label="Major Open Findings" value={majorOpenAuditFindings} />
          </div>
        </div>
      </section>

      <section style={twoColumnGridStyle}>
        <div style={panelStyle}>
          <div style={sectionHeaderRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Audit Attention</h2>
              <p style={sectionSubtitleStyle}>
                Current audits that are overdue, in progress, or still planned.
              </p>
            </div>
          </div>

          {auditAttentionList.length === 0 ? (
            <p style={emptyTextStyle}>No audits currently flagged for attention.</p>
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
              {auditAttentionList.map((audit) => {
                const tone = getAuditStatusTone(audit.status);
                return (
                  <div key={audit.id} style={auditAttentionCardStyle}>
                    <div style={auditAttentionTopStyle}>
                      <div>
                        <div style={auditAttentionNumberStyle}>{audit.audit_number || "-"}</div>
                        <div style={auditAttentionTitleStyle}>{audit.title || "-"}</div>
                      </div>
                      <span
                        style={{
                          ...statusBadgeStyle,
                          background: tone.bg,
                          color: tone.color,
                        }}
                      >
                        {audit.status || "Unknown"}
                      </span>
                    </div>

                    <div style={auditAttentionMetaGridStyle}>
                      <span><strong>Type:</strong> {audit.audit_type || "-"}</span>
                      <span><strong>Month:</strong> {formatAuditMonth(audit.audit_month)}</span>
                      <span><strong>Date:</strong> {formatDate(audit.audit_date)}</span>
                      <span><strong>Auditee:</strong> {audit.auditee || "-"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={panelStyle}>
          <div style={sectionHeaderRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Open Registers Snapshot</h2>
              <p style={sectionSubtitleStyle}>
                Quick live position across the main modules.
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gap: "12px" }}>
            <SnapshotRow label="Open NCRs" value={openNcrs} />
            <SnapshotRow label="Open CAPAs" value={openCapas} />
            <SnapshotRow label="Open Actions" value={openActions} />
            <SnapshotRow label="Open Audit Findings" value={openAuditFindings} />
            <SnapshotRow label="Overdue Actions" value={overdueActions} />
            <SnapshotRow label="Overdue Audits" value={overdueAudits} />
          </div>
        </div>
      </section>

      <section style={chartGridStyle}>
        <div style={panelStyle}>
          <div style={sectionHeaderRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>NCR Status</h2>
              <p style={sectionSubtitleStyle}>Current status split across NCR records.</p>
            </div>
          </div>

          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={ncrStatusChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#dc2626" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={panelStyle}>
          <div style={sectionHeaderRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>CAPA Status</h2>
              <p style={sectionSubtitleStyle}>Current status split across CAPA records.</p>
            </div>
          </div>

          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={capaStatusChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={panelStyle}>
          <div style={sectionHeaderRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Actions Status</h2>
              <p style={sectionSubtitleStyle}>Current status split across action records.</p>
            </div>
          </div>

          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={actionStatusChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={panelStyle}>
          <div style={sectionHeaderRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Assets by Location</h2>
              <p style={sectionSubtitleStyle}>Distribution of assets across locations.</p>
            </div>
          </div>

          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={assetLocationChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#0f766e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={panelStyle}>
          <div style={sectionHeaderRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Audit Status</h2>
              <p style={sectionSubtitleStyle}>Current audit programme status split.</p>
            </div>
          </div>

          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={auditStatusChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#7c3aed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={panelStyle}>
          <div style={sectionHeaderRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Audit Type Split</h2>
              <p style={sectionSubtitleStyle}>Internal, external and supplier audit view.</p>
            </div>
          </div>

          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={auditTypeChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#0891b2" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section style={panelStyle}>
        <div style={sectionHeaderRowStyle}>
          <div>
            <h2 style={sectionTitleStyle}>Saved Monthly Reports</h2>
            <p style={sectionSubtitleStyle}>
              Review previously saved management reports and update them where needed.
            </p>
          </div>
          <div style={registerCountStyle}>{reports.length} reports</div>
        </div>

        {reports.length === 0 ? (
          <p style={emptyTextStyle}>No monthly reports saved yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={tableHeadStyle}>Month</th>
                  <th style={tableHeadStyle}>Summary</th>
                  <th style={tableHeadStyle}>Wins</th>
                  <th style={tableHeadStyle}>Risks</th>
                  <th style={tableHeadStyle}>Next Steps</th>
                  <th style={tableHeadStyle}>Created</th>
                  <th style={tableHeadStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td style={tableCellStyle}>{report.month_label}</td>
                    <td style={tableCellStyle}>{report.summary || "-"}</td>
                    <td style={tableCellStyle}>{report.wins || "-"}</td>
                    <td style={tableCellStyle}>{report.risks || "-"}</td>
                    <td style={tableCellStyle}>{report.next_steps || "-"}</td>
                    <td style={tableCellStyle}>{formatDateTime(report.created_at)}</td>
                    <td style={tableCellStyle}>
                      <div style={actionButtonsWrapStyle}>
                        <button type="button" style={miniButtonStyle} onClick={() => void generatePdfReport(report)}>
                          PDF
                        </button>
                        <button type="button" style={miniButtonStyle} onClick={() => handleEdit(report)}>
                          Edit
                        </button>
                        <button type="button" style={miniButtonDeleteStyle} onClick={() => void handleDelete(report.id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function StatCard({ title, value, accent }: { title: string; value: number; accent: string }) {
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

function SnapshotRow({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: "10px",
        padding: "12px 14px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span style={{ color: "#334155", fontWeight: 600 }}>{label}</span>
      <strong style={{ color: "#0f172a" }}>{value}</strong>
    </div>
  );
}

const heroStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #0f766e 0%, #115e59 100%)",
  color: "white",
  borderRadius: "20px",
  padding: "28px 30px",
  marginBottom: "24px",
  boxShadow: "0 10px 30px rgba(15, 118, 110, 0.14)",
  display: "flex",
  justifyContent: "space-between",
  gap: "20px",
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  opacity: 0.78,
  marginBottom: "10px",
};

const heroTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "34px",
  lineHeight: 1.1,
};

const heroSubtitleStyle: React.CSSProperties = {
  marginTop: "10px",
  marginBottom: 0,
  fontSize: "16px",
  maxWidth: "720px",
  color: "rgba(255,255,255,0.92)",
};

const heroMetaWrapStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(180px, 1fr))",
  gap: "12px",
  minWidth: "320px",
  flex: "1 1 320px",
};

const heroMetaCardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.10)",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: "14px",
  padding: "14px 16px",
};

const heroMetaLabelStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  opacity: 0.82,
  marginBottom: "6px",
};

const heroMetaValueStyle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 700,
};

const backLinkStyle: React.CSSProperties = {
  color: "#0f766e",
  fontWeight: 700,
  textDecoration: "none",
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: "16px",
  marginBottom: "20px",
};

const statusBannerStyle: React.CSSProperties = {
  background: "white",
  borderRadius: "14px",
  padding: "14px 18px",
  marginBottom: "24px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
};

const twoColumnGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.1fr 0.9fr",
  gap: "20px",
  marginBottom: "20px",
};

const chartGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "20px",
  marginBottom: "20px",
};

const panelStyle: React.CSSProperties = {
  background: "white",
  borderRadius: "18px",
  padding: "20px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
};

const sectionHeaderRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  marginBottom: "16px",
  flexWrap: "wrap",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "20px",
  color: "#0f172a",
};

const sectionSubtitleStyle: React.CSSProperties = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: "14px",
};

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  minWidth: "180px",
  background: "white",
  color: "#0f172a",
};

const textareaStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  resize: "vertical",
  fontFamily: "Arial, sans-serif",
  background: "white",
  color: "#0f172a",
};

const primaryButtonStyle: React.CSSProperties = {
  background: "#0f766e",
  color: "white",
  border: "none",
  padding: "10px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 700,
};

const secondaryButtonStyle: React.CSSProperties = {
  background: "#e2e8f0",
  color: "#0f172a",
  border: "none",
  padding: "10px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 700,
};

const pdfButtonStyle: React.CSSProperties = {
  background: "#1d4ed8",
  color: "white",
  border: "none",
  padding: "10px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 700,
};

const miniButtonStyle: React.CSSProperties = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};

const miniButtonDeleteStyle: React.CSSProperties = {
  background: "#dc2626",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};

const registerCountStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#64748b",
  fontWeight: 700,
};

const emptyTextStyle: React.CSSProperties = {
  color: "#64748b",
  margin: 0,
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const tableHeadStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 10px",
  borderBottom: "1px solid #e2e8f0",
  color: "#475569",
  fontSize: "13px",
};

const tableCellStyle: React.CSSProperties = {
  padding: "14px 10px",
  borderBottom: "1px solid #f1f5f9",
  color: "#0f172a",
  verticalAlign: "top",
};

const actionButtonsWrapStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const auditAttentionCardStyle: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  padding: "14px",
  background: "#f8fafc",
};

const auditAttentionTopStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
  flexWrap: "wrap",
  marginBottom: "10px",
};

const auditAttentionNumberStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#64748b",
  fontWeight: 800,
  marginBottom: "4px",
};

const auditAttentionTitleStyle: React.CSSProperties = {
  fontSize: "16px",
  color: "#0f172a",
  fontWeight: 700,
};

const auditAttentionMetaGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "8px 12px",
  fontSize: "13px",
  color: "#475569",
};

const statusBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 800,
  whiteSpace: "nowrap",
};

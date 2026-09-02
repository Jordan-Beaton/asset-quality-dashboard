"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ImsButton, ImsTabs, ImsTopMetaRow } from "../../src/components/ImsPrimitives";
import { imsColours, imsShadows } from "../../src/components/imsTheme";
import { QualityKpiCard } from "../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../src/components/QualityPageHero";
import { supabase } from "../../src/lib/supabase";

type Ncr = {
  id: string;
  ncr_number: string | null;
  title: string | null;
  severity: string | null;
  status: string | null;
  owner: string | null;
  area: string | null;
  due_date?: string | null;
  created_at?: string | null;
};

type Capa = {
  id: string;
  capa_number: string | null;
  title: string | null;
  status: string | null;
  owner: string | null;
  linked_to: string | null;
  due_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ActionItem = {
  id: string;
  action_number: string | null;
  title: string | null;
  department: string | null;
  source?: string | null;
  owner: string | null;
  priority: string | null;
  status: string | null;
  due_date: string | null;
  created_at?: string | null;
  updated_at?: string | null;
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
  created_at?: string | null;
};

type AuditFindingRow = {
  id: string;
  audit_id: string;
  category: string | null;
  status: string | null;
  description?: string | null;
  clause?: string | null;
  reference?: string | null;
};

type DocumentSummary = {
  id: string;
  status: string | null;
  review_approval_status: string | null;
  next_review_date: string | null;
  department_owner: string | null;
};

type MocRecord = {
  id: string;
  moc_report_no: string | null;
  moc_report_title: string | null;
  change_type: string | null;
  status: string | null;
  temporary_valid_to: string | null;
  created_at: string | null;
  updated_at?: string | null;
};

function normaliseStatus(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function isClosedLikeStatus(value: string | null | undefined) {
  const status = normaliseStatus(value);
  return status === "closed" || status === "complete" || status === "completed";
}

function isQualityAction(item: ActionItem) {
  const department = normaliseStatus(item.department);
  const source = normaliseStatus(item.source);
  const qualitySources = new Set(["ncr/capa", "audit finding", "moc", "quality", "manual"]);
  const hseSources = new Set(["hse", "ainm", "hse inspection", "observation", "ptw"]);

  if (department === "quality") return true;
  if (department === "hse") return false;
  if (hseSources.has(source)) return false;
  if (department === "hseq" && qualitySources.has(source)) return true;
  return qualitySources.has(source);
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

function formatDateTime(value: Date | null) {
  if (!value) return "-";

  return value.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getLatestTimestamp(value: string | null | undefined) {
  const time = new Date(value || 0).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function formatAuditMonth(value: string | null | undefined) {
  if (!value) return "-";

  const [year, month] = value.split("-");
  if (!year || !month) return value;

  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    month: "short",
    year: "2-digit",
  });
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

function buildHref(path: string, params?: Record<string, string | number | null | undefined>) {
  if (!params) return path;

  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    search.set(key, String(value));
  });

  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

function monthKey(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-");
  if (!year || !month) return key;
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return key;
  return date.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

function dateMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getAuditMonthKey(audit: AuditRecord) {
  if (audit.audit_month && /^\d{4}-\d{2}$/.test(audit.audit_month)) {
    return audit.audit_month;
  }

  return monthKey(audit.audit_date);
}

function getPriorityRank(value: string | null | undefined) {
  const priority = normaliseStatus(value);
  if (priority === "critical") return 0;
  if (priority === "high") return 1;
  if (priority === "medium") return 2;
  if (priority === "low") return 3;
  return 4;
}

function buildFindingRepeatKey(finding: AuditFindingRow) {
  const description = (finding.description || "").trim().toLowerCase().replace(/\s+/g, " ");
  const clause = (finding.clause || "").trim().toLowerCase().replace(/\s+/g, " ");
  const reference = (finding.reference || "").trim().toLowerCase();
  return description || clause || reference;
}

function getRiskFrequency(score: number, totalAudits: number) {
  if (score <= 10) {
    return totalAudits > 1 ? "Reduce" : "Maintain";
  }
  if (score <= 20) {
    return "Maintain";
  }
  return "Increase";
}

function getDocumentBucket(document: DocumentSummary) {
  const status = normaliseStatus(document.status);
  const approval = normaliseStatus(document.review_approval_status);
  const reviewDays = getDaysFromToday(document.next_review_date);

  if (reviewDays !== null && reviewDays < 0) return "Overdue";
  if (approval === "approved" || status === "live" || status === "approved") return "Approved";
  if (status === "under review" || approval === "pending review" || approval === "reviewed") {
    return "Under Review";
  }
  return "Draft";
}

function isExpiredTemporaryMoc(record: MocRecord) {
  if ((record.change_type || "") !== "Temporary") return false;
  if (normaliseStatus(record.status) === "closed") return false;
  const days = getDaysFromToday(record.temporary_valid_to);
  return days !== null && days < 0;
}

function isNearingTemporaryMoc(record: MocRecord) {
  if ((record.change_type || "") !== "Temporary") return false;
  if (normaliseStatus(record.status) === "closed") return false;
  const days = getDaysFromToday(record.temporary_valid_to);
  return days !== null && days >= 0 && days <= 7;
}

function percentage(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getChartPayloadName(data: unknown) {
  if (typeof data !== "object" || data === null) return "";
  if ("name" in data && typeof (data as { name?: unknown }).name === "string") {
    return (data as { name: string }).name;
  }
  if (
    "payload" in data &&
    typeof (data as { payload?: { name?: unknown } }).payload?.name === "string"
  ) {
    return (data as { payload: { name: string } }).payload.name;
  }
  return "";
}

export default function Home() {
  const router = useRouter();
  const [ncrs, setNcrs] = useState<Ncr[]>([]);
  const [capas, setCapas] = useState<Capa[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [auditFindings, setAuditFindings] = useState<AuditFindingRow[]>([]);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const hseqDocuments = useMemo(
    () => documents.filter((document) => (document.department_owner || "").trim() === "HSEQ"),
    [documents]
  );
  const [mocs, setMocs] = useState<MocRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));
  const [dashboardView, setDashboardView] = useState<"overview" | "analytics" | "planning">("overview");

  async function fetchDashboardData() {
    setIsLoading(true);
    setError(null);

    const [
      assetRes,
      ncrRes,
      capaRes,
      actionRes,
      auditRes,
      findingRes,
      assetQualityRes,
      documentRes,
      mocRes,
    ] = await Promise.all([
      supabase.from("assets").select("*"),
      supabase.from("ncrs").select("*"),
      supabase.from("capas").select("*"),
      supabase.from("actions").select("*"),
      supabase.from("audits").select("*"),
      supabase.from("audit_findings").select("*"),
      supabase.from("asset_quality").select("id,asset_id"),
      supabase.from("documents").select("id,status,review_approval_status,next_review_date,department_owner"),
      supabase
        .from("moc_reports")
        .select("id,moc_report_no,moc_report_title,change_type,status,temporary_valid_to,created_at,updated_at"),
    ]);

    if (
      assetRes.error ||
      ncrRes.error ||
      capaRes.error ||
      actionRes.error ||
      auditRes.error ||
      findingRes.error ||
      assetQualityRes.error ||
      documentRes.error ||
      mocRes.error
    ) {
      setError(
        assetRes.error?.message ||
          ncrRes.error?.message ||
          capaRes.error?.message ||
          actionRes.error?.message ||
          auditRes.error?.message ||
          findingRes.error?.message ||
          assetQualityRes.error?.message ||
          documentRes.error?.message ||
          mocRes.error?.message ||
          "Failed to load dashboard data."
      );
      setIsLoading(false);
      return;
    }

    setNcrs((ncrRes.data || []) as Ncr[]);
    setCapas((capaRes.data || []) as Capa[]);
    setActions((actionRes.data || []) as ActionItem[]);
    setAudits((auditRes.data || []) as AuditRecord[]);
    setAuditFindings((findingRes.data || []) as AuditFindingRow[]);
    setDocuments((documentRes.data || []) as DocumentSummary[]);
    setMocs((mocRes.data || []) as MocRecord[]);
    setLastRefreshed(new Date());
    setIsLoading(false);
  }

  useEffect(() => {
    void fetchDashboardData();
  }, []);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    [
      ...ncrs.map((item) => item.created_at),
      ...actions.map((item) => item.created_at || item.due_date),
      ...audits.map((item) => item.audit_date || (item.audit_month ? `${item.audit_month}-01` : "")),
      ...mocs.map((item) => item.created_at || item.updated_at),
    ].forEach((value) => {
      if (!value) return;
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) years.add(String(date.getFullYear()));
    });
    years.add(String(new Date().getFullYear()));
    return [...years].sort((a, b) => Number(b) - Number(a));
  }, [actions, audits, mocs, ncrs]);

  const yearNcrs = useMemo(
    () => ncrs.filter((item) => !item.created_at || String(new Date(item.created_at).getFullYear()) === yearFilter),
    [ncrs, yearFilter],
  );
  const yearActions = useMemo(
    () => actions.filter((item) => {
      const value = item.created_at || item.due_date;
      if (!value) return true;
      return String(new Date(value).getFullYear()) === yearFilter;
    }),
    [actions, yearFilter],
  );
  const yearAudits = useMemo(
    () => audits.filter((item) => {
      const value = item.audit_date || (item.audit_month ? `${item.audit_month}-01` : item.created_at);
      if (!value) return true;
      return String(new Date(value).getFullYear()) === yearFilter;
    }),
    [audits, yearFilter],
  );
  const yearAuditIds = useMemo(() => new Set(yearAudits.map((audit) => audit.id)), [yearAudits]);
  const yearAuditFindings = useMemo(
    () => auditFindings.filter((finding) => yearAuditIds.has(finding.audit_id)),
    [auditFindings, yearAuditIds],
  );
  const yearMocs = useMemo(
    () => mocs.filter((item) => {
      const value = item.created_at || item.updated_at;
      if (!value) return true;
      return String(new Date(value).getFullYear()) === yearFilter;
    }),
    [mocs, yearFilter],
  );

  const openNcrs = yearNcrs.filter((item) => !isClosedLikeStatus(item.status)).length;
  const openAuditFindings = yearAuditFindings.filter((item) => !isClosedLikeStatus(item.status)).length;
  const openMocs = yearMocs.filter((item) => normaliseStatus(item.status) !== "closed").length;
  const temporaryMocs = yearMocs.filter((item) => (item.change_type || "") === "Temporary").length;
  const inReviewMocs = yearMocs.filter((item) => normaliseStatus(item.status) === "in review").length;
  const qualityActions = yearActions.filter(isQualityAction);
  const openQualityActions = qualityActions.filter((item) => !isClosedLikeStatus(item.status)).length;

  const overdueQualityActions = qualityActions.filter((action) => {
    if (isClosedLikeStatus(action.status)) return false;
    const days = getDaysFromToday(action.due_date);
    return days !== null && days < 0;
  }).length;

  const overdueDocuments = hseqDocuments.filter((doc) => getDocumentBucket(doc) === "Overdue").length;
  const expiredTemporaryMocs = yearMocs.filter((item) => isExpiredTemporaryMoc(item)).length;
  const nearingTemporaryMocs = yearMocs.filter((item) => isNearingTemporaryMoc(item)).length;

  const overdueNcrs = yearNcrs.filter((item) => {
    if (isClosedLikeStatus(item.status)) return false;
    const days = getDaysFromToday(item.due_date || null);
    return days !== null && days < 0;
  }).length;

  const dueSoonNcrs = yearNcrs.filter((item) => {
    if (isClosedLikeStatus(item.status)) return false;
    const days = getDaysFromToday(item.due_date || null);
    return days !== null && days >= 0 && days <= 7;
  }).length;

  const ncrStatusData = useMemo(
    () => [
      {
        name: "Open",
        value: yearNcrs.filter((item) => !isClosedLikeStatus(item.status)).length,
        fill: "#F93822",
      },
      {
        name: "Closed",
        value: yearNcrs.filter((item) => isClosedLikeStatus(item.status)).length,
        fill: "#005670",
      },
    ],
    [yearNcrs]
  );

  const ncrTrendData = useMemo(() => {
    const keys = new Set<string>();
    const openedMap: Record<string, number> = {};
    const closedMap: Record<string, number> = {};

    yearNcrs.forEach((ncr) => {
      const openedKey = monthKey(ncr.created_at);
      if (openedKey) {
        keys.add(openedKey);
        openedMap[openedKey] = (openedMap[openedKey] || 0) + 1;
      }

      if (isClosedLikeStatus(ncr.status)) {
        const closedKey = monthKey(ncr.created_at);
        if (closedKey) {
          keys.add(closedKey);
          closedMap[closedKey] = (closedMap[closedKey] || 0) + 1;
        }
      }
    });

    return [...keys]
      .sort()
      .slice(-6)
      .map((key) => ({
        month: monthLabel(key),
        rawMonth: key,
        Raised: openedMap[key] || 0,
        Closed: closedMap[key] || 0,
      }));
  }, [yearNcrs]);

  const actionsTrendData = useMemo(() => {
    const keys = new Set<string>();
    const openedMap: Record<string, number> = {};
    const closedMap: Record<string, number> = {};

    qualityActions.forEach((action) => {
      const openedKey = monthKey(action.created_at);
      if (openedKey) {
        keys.add(openedKey);
        openedMap[openedKey] = (openedMap[openedKey] || 0) + 1;
      }

      if (isClosedLikeStatus(action.status)) {
        const closedKey = monthKey(action.updated_at || action.created_at);
        if (closedKey) {
          keys.add(closedKey);
          closedMap[closedKey] = (closedMap[closedKey] || 0) + 1;
        }
      }
    });

    return [...keys]
      .sort()
      .slice(-6)
      .map((key) => ({
        month: monthLabel(key),
        rawMonth: key,
        Opened: openedMap[key] || 0,
        Closed: closedMap[key] || 0,
      }));
  }, [qualityActions]);

  const documentStatusData = useMemo(() => {
    const counts = {
      Draft: 0,
      "Under Review": 0,
      Approved: 0,
      Overdue: 0,
    };

    documents.forEach((document) => {
      counts[getDocumentBucket(document)] += 1;
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [documents]);

  const auditFindingMixData = useMemo(() => {
    const counts = {
      Major: 0,
      Minor: 0,
      OFI: 0,
      OBS: 0,
    };

    yearAuditFindings.forEach((finding) => {
      const category = (finding.category || "").trim();
      if (category === "Major" || category === "Minor" || category === "OFI" || category === "OBS") {
        counts[category] += 1;
      }
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [yearAuditFindings]);

  const mocStatusData = useMemo(() => {
    const counts = {
      Draft: 0,
      "In Review": 0,
      Approved: 0,
      Closed: 0,
    };

    yearMocs.forEach((moc) => {
      const status = moc.status || "Draft";
      if (status === "Draft" || status === "In Review" || status === "Approved" || status === "Closed") {
        counts[status] += 1;
      }
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [yearMocs]);

  const mocChangeTypeData = useMemo(() => {
    const counts = {
      Permanent: 0,
      Temporary: 0,
    };

    yearMocs.forEach((moc) => {
      const type = moc.change_type || "Permanent";
      if (type === "Permanent" || type === "Temporary") {
        counts[type] += 1;
      }
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [yearMocs]);

  const qualityActionDuePressureData = useMemo(() => {
    const open = qualityActions.filter((action) => !isClosedLikeStatus(action.status));
    const overdue = open.filter((action) => {
      const days = getDaysFromToday(action.due_date);
      return days !== null && days < 0;
    }).length;
    const due7 = open.filter((action) => {
      const days = getDaysFromToday(action.due_date);
      return days !== null && days >= 0 && days <= 7;
    }).length;
    const due30 = open.filter((action) => {
      const days = getDaysFromToday(action.due_date);
      return days !== null && days > 7 && days <= 30;
    }).length;
    const noDueDate = open.filter((action) => !action.due_date).length;

    return [
      { name: "Overdue", value: overdue, fill: "#F93822" },
      { name: "Due 7 Days", value: due7, fill: "#FFAD00" },
      { name: "Due 30 Days", value: due30, fill: "#63B1BC" },
      { name: "No Due Date", value: noDueDate, fill: "#53565A" },
    ];
  }, [qualityActions]);

  const auditStatusData = useMemo(() => {
    const counts = {
      Planned: 0,
      "In Progress": 0,
      Overdue: 0,
      Completed: 0,
    };

    yearAudits.forEach((audit) => {
      const status = audit.status || "Planned";
      if (status === "Completed") {
        counts.Completed += 1;
      } else if (status === "In Progress") {
        counts["In Progress"] += 1;
      } else {
        const auditKey = getAuditMonthKey(audit);
        counts[auditKey && auditKey < dateMonthKey(new Date()) ? "Overdue" : "Planned"] += 1;
      }
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [yearAudits]);

  const qualityHealthData = useMemo(() => {
    const totalNcrs = yearNcrs.length;
    const closedNcrs = yearNcrs.filter((item) => isClosedLikeStatus(item.status)).length;
    const totalFindings = yearAuditFindings.length;
    const closedFindings = yearAuditFindings.filter((item) => isClosedLikeStatus(item.status)).length;
    const totalDocs = hseqDocuments.length;
    const docsInDate = hseqDocuments.filter((document) => getDocumentBucket(document) !== "Overdue").length;
    const totalMocs = yearMocs.length;
    const closedMocs = yearMocs.filter((item) => normaliseStatus(item.status) === "closed").length;

    return [
      { name: "NCR Closure", value: percentage(closedNcrs, totalNcrs), fill: "#005670", href: "/ncr-capa" },
      {
        name: "Finding Closure",
        value: percentage(closedFindings, totalFindings),
        fill: "#53565A",
        href: buildHref("/audits", { view: "findings" }),
      },
      {
        name: "HSEQ Docs In Date",
        value: percentage(docsInDate, totalDocs),
        fill: "#63B1BC",
        href: buildHref("/documents", { view: "dashboard" }),
      },
      { name: "MOC Closure", value: percentage(closedMocs, totalMocs), fill: "#005670", href: "/moc" },
    ];
  }, [hseqDocuments, yearAuditFindings, yearMocs, yearNcrs]);

  const qualityPulse = useMemo(() => {
    const totalNcrs = yearNcrs.length;
    const closedNcrs = yearNcrs.filter((item) => isClosedLikeStatus(item.status)).length;
    const totalFindings = yearAuditFindings.length;
    const closedFindings = yearAuditFindings.filter((item) => isClosedLikeStatus(item.status)).length;
    const totalDocs = hseqDocuments.length;
    const docsInDate = hseqDocuments.filter((document) => getDocumentBucket(document) !== "Overdue").length;
    const totalMocs = yearMocs.length;
    const closedMocs = yearMocs.filter((item) => normaliseStatus(item.status) === "closed").length;
    const openActions = qualityActions.filter((item) => !isClosedLikeStatus(item.status)).length;
    const actionPressureScore = openActions ? percentage(Math.max(openActions - overdueQualityActions, 0), openActions) : 100;

    const ncrClosure = percentage(closedNcrs, totalNcrs);
    const findingClosure = percentage(closedFindings, totalFindings);
    const documentHealth = percentage(docsInDate, totalDocs);
    const mocClosure = percentage(closedMocs, totalMocs);
    const score = clampPercent((ncrClosure * 0.24) + (findingClosure * 0.24) + (documentHealth * 0.22) + (mocClosure * 0.15) + (actionPressureScore * 0.15));

    return {
      score,
      ncrClosure,
      findingClosure,
      documentHealth,
      mocClosure,
      actionPressureScore,
      openWorkload: openNcrs + openAuditFindings + openMocs + openQualityActions,
      criticalItems: overdueNcrs + overdueQualityActions + overdueDocuments + expiredTemporaryMocs,
      warningItems: dueSoonNcrs + nearingTemporaryMocs,
    };
  }, [
    hseqDocuments,
    dueSoonNcrs,
    expiredTemporaryMocs,
    qualityActions,
    nearingTemporaryMocs,
    openAuditFindings,
    openQualityActions,
    openMocs,
    openNcrs,
    overdueDocuments,
    overdueQualityActions,
    overdueNcrs,
    yearAuditFindings,
    yearMocs,
    yearNcrs,
  ]);

  const operationalPressureData = useMemo(
    () => [
      { name: "NCRs", value: openNcrs, fill: "#F93822", href: buildHref("/ncr-capa", { view: "register", status: "Open" }) },
      { name: "Findings", value: openAuditFindings, fill: "#FFAD00", href: buildHref("/audits", { view: "findings", findingStatus: "Open" }) },
      { name: "MOCs", value: openMocs, fill: "#005670", href: buildHref("/moc", { attention: "open" }) },
      { name: "Actions", value: openQualityActions, fill: "#63B1BC", href: buildHref("/actions", { view: "register", department: "Quality", status: "Open" }) },
      { name: "Docs", value: overdueDocuments, fill: "#FFAD00", href: buildHref("/documents", { review: "Overdue" }) },
    ],
    [openAuditFindings, openQualityActions, openMocs, openNcrs, overdueDocuments],
  );

  const managementFocusItems = useMemo(
    () => [
      {
        label: "Overdue NCRs",
        value: overdueNcrs,
        href: buildHref("/ncr-capa", { view: "register", status: "Open" }),
        tone: "critical" as const,
      },
      {
        label: "NCRs Due in 7 Days",
        value: dueSoonNcrs,
        href: buildHref("/ncr-capa", { view: "register", dueWindow: 7 }),
        tone: "warning" as const,
      },
      {
        label: "Overdue Quality Actions",
        value: overdueQualityActions,
        href: buildHref("/actions", { view: "register", department: "Quality", overdue: 1 }),
        tone: "critical" as const,
      },
      {
        label: "Document Reviews Overdue",
        value: overdueDocuments,
        href: buildHref("/documents", { review: "Overdue" }),
        tone: "critical" as const,
      },
      {
        label: "Temporary MOCs Near Expiry",
        value: nearingTemporaryMocs,
        href: buildHref("/moc", { attention: "expiry-soon" }),
        tone: "warning" as const,
      },
      {
        label: "Expired Temporary MOCs",
        value: expiredTemporaryMocs,
        href: buildHref("/moc", { attention: "expired-temporary" }),
        tone: "critical" as const,
      },
    ],
    [dueSoonNcrs, expiredTemporaryMocs, nearingTemporaryMocs, overdueDocuments, overdueQualityActions, overdueNcrs]
  );

  const topProblemAreas = useMemo(() => {
    const repeatCounts = auditFindings.reduce<Record<string, number>>((acc, finding) => {
      const key = buildFindingRepeatKey(finding);
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const grouped = new Map<
      string,
      {
        label: string;
        auditNumbers: string[];
        totalAudits: number;
        major: number;
        minor: number;
        ofiObs: number;
        totalFindings: number;
        repeatFindings: number;
        riskScore: number;
        frequency: "Reduce" | "Maintain" | "Increase";
      }
    >();

    audits.forEach((audit) => {
      const label = (audit.title || audit.auditee || audit.audit_number || "Untitled Audit").trim();
      if (!grouped.has(label)) {
        grouped.set(label, {
          label,
          auditNumbers: [],
          totalAudits: 0,
          major: 0,
          minor: 0,
          ofiObs: 0,
          totalFindings: 0,
          repeatFindings: 0,
          riskScore: 0,
          frequency: "Maintain",
        });
      }

      const current = grouped.get(label)!;
      current.totalAudits += 1;
      current.auditNumbers.push(audit.audit_number || "-");
    });

    auditFindings.forEach((finding) => {
      const parent = audits.find((audit) => audit.id === finding.audit_id);
      if (!parent) return;

      const label = (parent.title || parent.auditee || parent.audit_number || "Untitled Audit").trim();
      const current = grouped.get(label);
      if (!current) return;

      const category = normaliseStatus(finding.category);
      if (category === "major") current.major += 1;
      else if (category === "minor") current.minor += 1;
      else if (category === "ofi" || category === "obs") current.ofiObs += 1;

      current.totalFindings += 1;
      const key = buildFindingRepeatKey(finding);
      if (key && (repeatCounts[key] || 0) > 1) {
        current.repeatFindings += 1;
      }
    });

    return [...grouped.values()]
      .map((item) => {
        const riskScore =
          item.totalAudits * 1 +
          item.major * 5 +
          item.minor * 3 +
          item.ofiObs * 1 +
          item.repeatFindings * 2;

        return {
          ...item,
          riskScore,
          frequency: getRiskFrequency(riskScore, item.totalAudits),
        };
      })
      .sort((a, b) => {
        if (b.totalFindings !== a.totalFindings) return b.totalFindings - a.totalFindings;
        if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore;
        return a.label.localeCompare(b.label);
      })
      .slice(0, 5);
  }, [audits, auditFindings]);

  const priorityActions = useMemo(() => {
    return [...qualityActions]
      .filter((action) => !isClosedLikeStatus(action.status))
      .sort((a, b) => {
        const aDays = getDaysFromToday(a.due_date);
        const bDays = getDaysFromToday(b.due_date);
        const aOverdueRank = aDays !== null && aDays < 0 ? 0 : 1;
        const bOverdueRank = bDays !== null && bDays < 0 ? 0 : 1;
        if (aOverdueRank !== bOverdueRank) return aOverdueRank - bOverdueRank;

        const priorityRank = getPriorityRank(a.priority) - getPriorityRank(b.priority);
        if (priorityRank !== 0) return priorityRank;

        const aDate = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        const bDate = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
      })
      .slice(0, 5);
  }, [qualityActions]);

  const currentMonthAuditKey = useMemo(() => dateMonthKey(new Date()), []);

  const nextMonthAuditKey = useMemo(() => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return dateMonthKey(nextMonth);
  }, []);

  const currentMonthAudits = useMemo(() => {
    return [...audits]
      .filter((audit) => getAuditMonthKey(audit) === currentMonthAuditKey)
      .sort((a, b) => {
        const aDate = a.audit_date ? new Date(a.audit_date).getTime() : Number.MAX_SAFE_INTEGER;
        const bDate = b.audit_date ? new Date(b.audit_date).getTime() : Number.MAX_SAFE_INTEGER;
        if (aDate !== bDate) return aDate - bDate;
        return (a.audit_number || a.title || "").localeCompare(b.audit_number || b.title || "");
      });
  }, [audits, currentMonthAuditKey]);

  const nextMonthAudits = useMemo(() => {
    return [...audits]
      .filter((audit) => getAuditMonthKey(audit) === nextMonthAuditKey)
      .sort((a, b) => {
        const aDate = a.audit_date ? new Date(a.audit_date).getTime() : Number.MAX_SAFE_INTEGER;
        const bDate = b.audit_date ? new Date(b.audit_date).getTime() : Number.MAX_SAFE_INTEGER;
        if (aDate !== bDate) return aDate - bDate;
        return (a.audit_number || a.title || "").localeCompare(b.audit_number || b.title || "");
      });
  }, [audits, nextMonthAuditKey]);

  const currentMonthCompletedAudits = useMemo(() => {
    return currentMonthAudits.filter((audit) => normaliseStatus(audit.status) === "completed").length;
  }, [currentMonthAudits]);

  const latestRecordSummary = useMemo(() => {
    const candidates = [
      ...ncrs.map((item) => ({
        label: item.ncr_number || item.title || "NCR",
        time: getLatestTimestamp(item.created_at),
      })),
      ...actions.map((item) => ({
        label: item.action_number || item.title || "Action",
        time: getLatestTimestamp(item.updated_at || item.created_at),
      })),
      ...audits.map((item) => ({
        label: item.audit_number || item.title || "Audit",
        time: getLatestTimestamp(item.created_at || item.audit_date),
      })),
      ...mocs.map((item) => ({
        label: item.moc_report_no || item.moc_report_title || "MOC",
        time: getLatestTimestamp(item.updated_at || item.created_at),
      })),
    ]
      .filter((item) => item.time > 0)
      .sort((a, b) => b.time - a.time);

    return candidates[0]?.label || "No live records";
  }, [actions, audits, documents, mocs, ncrs]);

  const currentMonthOutstandingAudits = currentMonthAudits.length - currentMonthCompletedAudits;
  const currentMonthCompletionRate = currentMonthAudits.length
    ? Math.round((currentMonthCompletedAudits / currentMonthAudits.length) * 100)
    : 0;

  const executiveSignalItems = useMemo(
    () => [
      {
        label: "Critical pressure",
        value: qualityPulse.criticalItems,
        detail: "Overdue NCRs, actions, documents, and expired temporary MOCs",
        href: qualityPulse.criticalItems ? buildHref("/management-review") : buildHref("/quality"),
        accent: "#F93822",
      },
      {
        label: "Open workload",
        value: qualityPulse.openWorkload,
        detail: "Open NCRs, findings, MOCs, and Quality actions",
        href: buildHref("/actions", { view: "register", department: "Quality" }),
        accent: "#63B1BC",
      },
      {
        label: "This month audits",
        value: currentMonthAudits.length,
        detail: `${currentMonthOutstandingAudits} outstanding / ${currentMonthCompletedAudits} complete`,
        href: buildHref("/audits", { month: currentMonthAuditKey }),
        accent: "#53565A",
      },
      {
        label: "Reviews overdue",
        value: overdueDocuments,
        detail: "Document control items past next review date",
        href: buildHref("/documents", { review: "Overdue" }),
        accent: "#005670",
      },
    ],
    [
      currentMonthAuditKey,
      currentMonthAudits.length,
      currentMonthCompletedAudits,
      currentMonthOutstandingAudits,
      overdueDocuments,
      qualityPulse.criticalItems,
      qualityPulse.openWorkload,
    ],
  );

  const kpis = [
    {
      label: "Open NCRs",
      value: openNcrs,
      accent: "#F93822",
      href: buildHref("/ncr-capa", { view: "register", status: "Open" }),
    },
    {
      label: "Quality Open Actions",
      value: openQualityActions,
      accent: "#63B1BC",
      href: buildHref("/actions", { view: "register", department: "Quality", status: "Open" }),
    },
    {
      label: "Open Audit Findings",
      value: openAuditFindings,
      accent: "#53565A",
      href: buildHref("/audits", { view: "findings", findingStatus: "Open" }),
    },
    {
      label: "Open MOCs",
      value: openMocs,
      accent: "#005670",
      href: buildHref("/moc", { attention: "open" }),
    },
    {
      label: "Temporary MOCs",
      value: temporaryMocs,
      accent: "#63B1BC",
      href: buildHref("/moc", { change_type: "Temporary" }),
    },
    {
      label: "MOCs In Review",
      value: inReviewMocs,
      accent: "#53565A",
      href: buildHref("/moc", { status: "In Review" }),
    },
    {
      label: "Quality Overdue Actions",
      value: overdueQualityActions,
      accent: "#F93822",
      href: buildHref("/actions", { view: "register", department: "Quality", overdue: 1 }),
    },
    {
      label: "Overdue Documents",
      value: overdueDocuments,
      accent: "#005670",
      href: buildHref("/documents", { review: "Overdue" }),
    },
  ];

  function openDocumentStatusBucket(bucket: string) {
    if (bucket === "Draft") {
      router.push(buildHref("/documents", { status: "Draft" }));
      return;
    }
    if (bucket === "Under Review") {
      router.push(buildHref("/documents", { status: "Under Review" }));
      return;
    }
    if (bucket === "Approved") {
      router.push(buildHref("/documents", { approval: "Approved" }));
      return;
    }
    router.push(buildHref("/documents", { review: "Overdue" }));
  }

  function openMocStatusBucket(bucket: string) {
    router.push(buildHref("/moc", { status: bucket === "Closed" ? "Closed" : bucket }));
  }

  return (
    <main>
      <style>{`
        .quality-command-score::before {
          content: "";
          position: absolute;
          inset: -40%;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.22), transparent 34%),
            radial-gradient(circle at 78% 70%, rgba(191,229,227,0.22), transparent 32%);
          animation: qualityPulseDrift 10s ease-in-out infinite alternate;
          pointer-events: none;
        }
        .quality-score-orb {
          transition: transform 180ms ease, filter 180ms ease;
        }
        .quality-score-orb:hover {
          transform: scale(1.04);
          filter: brightness(1.08);
        }
        .quality-signal-card,
        .quality-health-card,
        .quality-work-item {
          transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
        }
        .quality-signal-card:hover,
        .quality-health-card:hover,
        .quality-work-item:hover {
          transform: translateY(-3px);
          box-shadow: 0 18px 34px rgba(15, 23, 42, 0.11);
          border-color: #D0D0CE;
        }
        .quality-live-pill {
          animation: qualityLiveGlow 1.8s ease-in-out infinite alternate;
        }
        .quality-view-command {
          margin-bottom: 18px;
          border: 1px solid #D0D0CE;
          border-radius: 16px;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 10px 12px;
        }
        .quality-view-command .ims-tabs {
          margin-bottom: 0 !important;
        }
        .quality-view-panel {
          animation: qualityViewEnter 220ms ease-out;
        }
        .quality-analytics-cockpit {
          display: grid;
          grid-template-columns: minmax(0, 1.65fr) minmax(300px, 0.75fr);
          gap: 18px;
          margin-bottom: 22px;
          align-items: stretch;
        }
        @keyframes qualityViewEnter {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes qualityPulseDrift {
          from { transform: rotate(0deg) scale(1); }
          to { transform: rotate(8deg) scale(1.05); }
        }
        @keyframes qualityLiveGlow {
          from { box-shadow: 0 0 0 rgba(187,247,208,0); }
          to { box-shadow: 0 0 18px rgba(187,247,208,0.32); }
        }
        @media (max-width: 1100px) {
          .quality-command-deck {
            grid-template-columns: 1fr !important;
          }
          .quality-kpi-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          .quality-analytics-cockpit {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 760px) {
          .quality-kpi-grid,
          .quality-signal-grid,
          .quality-health-grid,
          .quality-chart-grid,
          .quality-insight-grid,
          .quality-bottom-grid {
            grid-template-columns: 1fr !important;
          }
          .quality-view-command {
            align-items: stretch;
            flex-direction: column;
          }
          .quality-view-command .ims-tabs {
            overflow-x: auto;
            flex-wrap: nowrap !important;
          }
        }
      `}</style>
      <QualityPageHero
        label="QUALITY MANAGEMENT"
        title="Dashboard"
        description="Management view of Quality performance across NCRs, audits, MOCs, document control, and Quality-owned actions, built for fast drill-down into the items that need attention."
        contextCards={[
          {
            label: "Last Refreshed",
            value: isLoading ? "Loading..." : formatDateTime(lastRefreshed),
          },
          {
            label: "Latest Record",
            value: latestRecordSummary,
          },
        ]}
      />

      <ImsTopMetaRow
        backHref="/home"
        backLabel="Back to IMS Home"
        status={
          <>
            <strong>Status:</strong> {isLoading ? "Loading..." : error ? `Loaded with warning: ${error}` : `Loaded ${yearFilter} quality dashboard successfully.`}
          </>
        }
      />

      <div className="quality-view-command">
        <ImsTabs
          tabs={[
            { value: "overview", label: "Overview" },
            { value: "analytics", label: "Analytics" },
            { value: "planning", label: "Actions & Audits" },
          ]}
          active={dashboardView}
          onChange={setDashboardView}
          ariaLabel="Quality dashboard views"
        />
        <label style={yearFilterStyle}>
          <span>Reporting year</span>
          <select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}>
            {availableYears.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <section style={errorBannerStyle}>
          <strong style={{ display: "block", marginBottom: "4px" }}>Dashboard error</strong>
          <span>{error}</span>
        </section>
      ) : null}

      {dashboardView === "overview" ? <div className="quality-view-panel" role="tabpanel">
      <section className="quality-command-deck" style={{ ...commandDeckStyle, gridTemplateColumns: "minmax(300px, 1.05fr) minmax(420px, 1.45fr)" }}>
        <div className="quality-command-score" style={commandScorePanelStyle}>
          <div style={commandScoreCopyStyle}>
            <span style={commandEyebrowStyle}>Live Quality Pulse</span>
            <h2 style={commandTitleStyle}>Operational control score</h2>
            <p style={commandTextStyle}>
              Weighted from NCR closure, audit finding closure, document review health, MOC closure, and Quality action pressure.
            </p>
          </div>
          <Link
            href="/management-review"
            className="quality-score-orb"
            style={{
              ...scoreOrbStyle,
              background: `conic-gradient(${qualityPulse.score >= 75 ? "#005670" : qualityPulse.score >= 50 ? "#FFAD00" : "#F93822"} ${qualityPulse.score * 3.6}deg, rgba(255,255,255,0.16) 0deg)`,
            }}
          >
            <span style={scoreOrbInnerStyle}>
              <strong style={scoreValueStyle}>{isLoading ? "-" : qualityPulse.score}</strong>
              <small style={scoreSubLabelStyle}>/ 100</small>
            </span>
          </Link>
        </div>

        <div className="quality-signal-grid" style={signalGridStyle}>
          {executiveSignalItems.map((item) => (
            <Link key={item.label} href={item.href} className="quality-signal-card" style={{ ...signalCardStyle, borderTopColor: item.accent }}>
              <span style={signalLabelStyle}>{item.label}</span>
              <strong style={signalValueStyle}>{isLoading ? "-" : item.value}</strong>
              <span style={signalDetailStyle}>{item.detail}</span>
            </Link>
          ))}
        </div>

      </section>

      <section className="quality-insight-grid" style={insightGridStyle}>
        <SectionCard title="Management Focus" subtitle="The current pressure points a manager should see first.">
          <div style={focusGridStyle}>
            {managementFocusItems.map((item) => (
              <SummaryRow
                key={item.label}
                label={item.label}
                value={item.value}
                href={item.href}
                isLoading={isLoading}
                tone={item.tone}
              />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Top Problem Areas" subtitle="Current highest-finding audit areas using the existing risk scoring approach.">
          {isLoading ? (
            <p style={emptyTextStyle}>Loading insight...</p>
          ) : topProblemAreas.length === 0 ? (
            <p style={emptyTextStyle}>No audit findings available yet.</p>
          ) : (
            <div style={topProblemAreasStackStyle}>
              {topProblemAreas.map((item, index) => (
                <Link key={item.label} href={buildHref("/audits", { search: item.label })} style={topProblemAreaLinkStyle}>
                  <div style={topProblemAreaRankStyle}>#{index + 1}</div>
                  <div style={compactInsightBodyStyle}>
                    <div style={compactInsightTitleStyle}>{item.label}</div>
                    <div style={compactInsightMetaStyle}>
                      <span>{item.totalFindings} findings</span>
                      <span>Risk {item.riskScore}</span>
                      <span>{item.auditNumbers.join(", ")}</span>
                    </div>
                  </div>
                  <span style={getFrequencyBadgeStyle(item.frequency as "Reduce" | "Maintain" | "Increase")}>{item.frequency}</span>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </section>
      </div> : null}

      {dashboardView === "analytics" ? <div className="quality-view-panel" role="tabpanel">
        <section className="quality-analytics-cockpit">
        <div style={pressurePanelStyle}>
          <div style={pressureHeaderStyle}>
            <div>
              <h2 style={pressureTitleStyle}>Operational Pressure</h2>
              <p style={pressureSubtitleStyle}>Click any bar to drill into the live source records.</p>
            </div>
            <span className="quality-live-pill" style={livePillStyle}>Live data</span>
          </div>
          <div style={pressureChartWrapStyle}>
            <ResponsiveContainer width="100%" height={158}>
              <BarChart data={operationalPressureData} layout="vertical" margin={{ left: 4, right: 42, top: 6, bottom: 6 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#D0D0CE" />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={72} tick={{ fill: "#000000", fontSize: 12, fontWeight: 800 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #D0D0CE", background: "#ffffff", color: "#000000" }}
                  cursor={{ fill: "#ECECE7" }}
                />
                <Bar
                  dataKey="value"
                  radius={[0, 10, 10, 0]}
                  cursor="pointer"
                  onClick={(data: unknown) => {
                    const payload =
                      typeof data === "object" && data !== null && "payload" in data
                        ? (data as { payload?: { href?: string } }).payload
                        : (data as { href?: string });
                    if (payload?.href) router.push(payload.href);
                  }}
                >
                  {operationalPressureData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                  <LabelList dataKey="value" position="right" fill="#000000" fontSize={12} fontWeight={900} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <section style={analyticsHealthPanelStyle}>
          <div style={analyticsHealthHeaderStyle}>
            <div>
              <h2 style={{ ...sectionTitleStyle, color: "#ffffff" }}>Control Health</h2>
              <p style={{ ...sectionSubtitleStyle, color: "rgba(255,255,255,0.78)" }}>Closure strength across the core controls.</p>
            </div>
            <span style={healthAveragePillStyle}>
              {isLoading ? "-" : `${Math.round(qualityHealthData.reduce((sum, item) => sum + item.value, 0) / Math.max(qualityHealthData.length, 1))}% avg`}
            </span>
          </div>
          <div style={analyticsHealthListStyle}>
            {qualityHealthData.map((item) => (
              <Link key={item.name} href={item.href} className="quality-health-card" style={analyticsHealthRowStyle}>
                <div style={analyticsHealthRowTopStyle}>
                  <span>{item.name}</span>
                  <strong>{isLoading ? "-" : `${item.value}%`}</strong>
                </div>
                <div style={healthGaugeTrackStyle}>
                  <div style={{ ...healthGaugeFillStyle, width: `${item.value}%`, background: item.fill }} />
                </div>
              </Link>
            ))}
          </div>
        </section>
        </section>

      <section className="quality-kpi-grid" style={kpiGridStyle}>
        {kpis.map((item) => (
          <QualityKpiCard
            key={item.label}
            title={item.label}
            value={isLoading ? "-" : item.value}
            accent={item.accent}
            href={item.href}
          />
        ))}
      </section>

      <section className="quality-chart-grid" style={chartGridStyle}>
        <SectionCard title="Quality Health Snapshot" subtitle="Percentage view of core Quality controls.">
          {isLoading ? (
            <p style={emptyTextStyle}>Loading chart...</p>
          ) : (
            <div style={chartWrapStyle}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={qualityHealthData} layout="vertical" margin={{ left: 18, right: 18 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                  <YAxis type="category" dataKey="name" width={98} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Bar
                    dataKey="value"
                    radius={[0, 8, 8, 0]}
                    cursor="pointer"
                    onClick={(data: unknown) => {
                      const name = getChartPayloadName(data);
                      const target = qualityHealthData.find((item) => item.name === name);
                      if (target) router.push(target.href);
                    }}
                  >
                    {qualityHealthData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard title="NCR Closure Mix" subtitle="Open versus closed NCR records.">
          {isLoading ? (
            <p style={emptyTextStyle}>Loading chart...</p>
          ) : (
            <div style={chartWrapStyle}>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Tooltip />
                  <Pie
                    data={ncrStatusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={72}
                    outerRadius={108}
                    paddingAngle={4}
                    cursor="pointer"
                    onClick={(data: unknown) =>
                      router.push(buildHref("/ncr-capa", { view: "register", status: getChartPayloadName(data) }))
                    }
                  >
                    {ncrStatusData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard title="NCR Trend" subtitle="Monthly raised versus closed NCRs.">
          {isLoading ? (
            <p style={emptyTextStyle}>Loading chart...</p>
          ) : (
            <div style={chartWrapStyle}>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={ncrTrendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="Raised"
                    stroke="#F93822"
                    strokeWidth={3}
                    dot={{ r: 4, cursor: "pointer" }}
                    activeDot={{ r: 5, cursor: "pointer" }}
                    onClick={(data: unknown) =>
                      router.push(
                        buildHref("/ncr-capa", {
                          view: "register",
                          createdMonth:
                            typeof data === "object" &&
                            data !== null &&
                            "payload" in data &&
                            typeof (data as { payload?: { rawMonth?: string } }).payload?.rawMonth === "string"
                              ? (data as { payload?: { rawMonth?: string } }).payload?.rawMonth || ""
                              : "",
                        })
                      )
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="Closed"
                    stroke="#005670"
                    strokeWidth={3}
                    dot={{ r: 4, cursor: "pointer" }}
                    activeDot={{ r: 5, cursor: "pointer" }}
                    onClick={(data: unknown) =>
                      router.push(
                        buildHref("/ncr-capa", {
                          view: "register",
                          status: "Closed",
                          closedMonth:
                            typeof data === "object" &&
                            data !== null &&
                            "payload" in data &&
                            typeof (data as { payload?: { rawMonth?: string } }).payload?.rawMonth === "string"
                              ? (data as { payload?: { rawMonth?: string } }).payload?.rawMonth || ""
                              : "",
                        })
                      )
                    }
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Audit Programme Status" subtitle="Planned, in progress, overdue, and completed audits.">
          {isLoading ? (
            <p style={emptyTextStyle}>Loading chart...</p>
          ) : (
            <div style={chartWrapStyle}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={auditStatusData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar
                    dataKey="value"
                    radius={[6, 6, 0, 0]}
                    cursor="pointer"
                    onClick={(data: { name?: string }) =>
                      router.push(buildHref("/audits", { status: data?.name || "" }))
                    }
                  >
                    {auditStatusData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={
                          entry.name === "Completed"
                            ? "#005670"
                            : entry.name === "Overdue"
                              ? "#F93822"
                              : entry.name === "In Progress"
                                ? "#53565A"
                                : "#63B1BC"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Audit Finding Mix" subtitle="Major, Minor, OFI and OBS finding split.">
          {isLoading ? (
            <p style={emptyTextStyle}>Loading chart...</p>
          ) : (
            <div style={chartWrapStyle}>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Tooltip />
                  <Pie
                    data={auditFindingMixData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={66}
                    outerRadius={104}
                    paddingAngle={3}
                    cursor="pointer"
                    onClick={(data: unknown) =>
                      router.push(buildHref("/audits", { view: "findings", findingCategory: getChartPayloadName(data) }))
                    }
                  >
                    {auditFindingMixData.map((entry) => (
                      <Cell key={entry.name} fill={getFindingCategoryColour(entry.name)} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Document Control Health" subtitle="Draft, under review, approved, and overdue review positions.">
          {isLoading ? (
            <p style={emptyTextStyle}>Loading chart...</p>
          ) : (
            <div style={chartWrapStyle}>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Tooltip />
                  <Pie
                    data={documentStatusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={66}
                    outerRadius={104}
                    paddingAngle={3}
                    cursor="pointer"
                    onClick={(data: unknown) => openDocumentStatusBucket(getChartPayloadName(data))}
                  >
                    {documentStatusData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={
                          entry.name === "Overdue"
                            ? "#F93822"
                            : entry.name === "Draft"
                              ? "#53565A"
                              : entry.name === "Under Review"
                                ? "#FFAD00"
                                : "#005670"
                        }
                      />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard title="MOC Control" subtitle="Draft, in review, approved, and closed MOC positions.">
          {isLoading ? (
            <p style={emptyTextStyle}>Loading chart...</p>
          ) : (
            <div style={chartWrapStyle}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={mocStatusData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar
                    dataKey="value"
                    fill="#005670"
                    radius={[6, 6, 0, 0]}
                    cursor="pointer"
                    onClick={(data: { name?: string }) => openMocStatusBucket(data?.name || "")}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard title="MOC Type Split" subtitle="Permanent versus temporary change records.">
          {isLoading ? (
            <p style={emptyTextStyle}>Loading chart...</p>
          ) : (
            <div style={chartWrapStyle}>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Tooltip />
                  <Pie
                    data={mocChangeTypeData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={66}
                    outerRadius={104}
                    paddingAngle={4}
                    cursor="pointer"
                    onClick={(data: unknown) =>
                      router.push(buildHref("/moc", { change_type: getChartPayloadName(data) }))
                    }
                  >
                    {mocChangeTypeData.map((entry) => (
                      <Cell key={entry.name} fill={entry.name === "Temporary" ? "#FFAD00" : "#63B1BC"} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Quality Action Trend" subtitle="Quality-owned actions opened versus closed.">
          {isLoading ? (
            <p style={emptyTextStyle}>Loading chart...</p>
          ) : (
            <div style={chartWrapStyle}>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={actionsTrendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="Opened"
                    stroke="#63B1BC"
                    strokeWidth={3}
                    dot={{ r: 4, cursor: "pointer" }}
                    onClick={() => router.push(buildHref("/actions", { view: "register", department: "Quality" }))}
                  />
                  <Line
                    type="monotone"
                    dataKey="Closed"
                    stroke="#005670"
                    strokeWidth={3}
                    dot={{ r: 4, cursor: "pointer" }}
                    onClick={() =>
                      router.push(buildHref("/actions", { view: "register", department: "Quality", status: "Closed" }))
                    }
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Quality Action Due Pressure" subtitle="Open Quality actions by due-date pressure.">
          {isLoading ? (
            <p style={emptyTextStyle}>Loading chart...</p>
          ) : (
            <div style={chartWrapStyle}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={qualityActionDuePressureData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar
                    dataKey="value"
                    radius={[6, 6, 0, 0]}
                    cursor="pointer"
                    onClick={(data: { name?: string }) => {
                      const name = data?.name || "";
                      if (name === "Overdue") {
                        router.push(buildHref("/actions", { view: "register", department: "Quality", overdue: 1 }));
                        return;
                      }
                      if (name === "Due 7 Days") {
                        router.push(buildHref("/actions", { view: "register", department: "Quality", dueWindow: 7 }));
                        return;
                      }
                      if (name === "Due 30 Days") {
                        router.push(buildHref("/actions", { view: "register", department: "Quality", dueWindow: 30 }));
                        return;
                      }
                      router.push(buildHref("/actions", { view: "register", department: "Quality" }));
                    }}
                  >
                    {qualityActionDuePressureData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
      </section>
      </div> : null}

      {dashboardView === "planning" ? <div className="quality-view-panel" role="tabpanel">
      <section className="quality-bottom-grid" style={bottomGridStyle}>
        <SectionCard
          title="Quality Priority Actions"
          subtitle="Top five overdue or high-priority Quality-owned actions."
          action={
            <Link href={buildHref("/actions", { view: "register", department: "Quality" })} style={sectionLinkStyle}>
              Open actions {"->"}
            </Link>
          }
        >
          {isLoading ? (
            <p style={emptyTextStyle}>Loading priority actions...</p>
          ) : priorityActions.length === 0 ? (
            <p style={emptyTextStyle}>No open actions currently requiring attention.</p>
          ) : (
            <div style={stackCompactStyle}>
              {priorityActions.map((action) => {
                const days = getDaysFromToday(action.due_date);
                const overdue = days !== null && days < 0;
                return (
                  <Link
                    key={action.id}
                    href={buildHref("/actions", { search: action.action_number || "" })}
                    className="quality-work-item"
                    style={{
                      ...workItemStyle,
                      background: overdue ? "#ECECE7" : "#ECECE7",
                    }}
                  >
                    <div style={workItemTopStyle}>
                      <div style={workItemNumberStyle}>{action.action_number || "-"}</div>
                      <StatusBadge value={action.status || "Unknown"} />
                    </div>
                    <div style={workItemTitleStyle}>{action.title || "-"}</div>
                    <div style={workItemMetaStyle}>
                      <span>{action.owner || "-"}</span>
                      <span>{action.priority || "Unrated"}</span>
                      <span>
                        {days === null
                          ? "No due date"
                          : days < 0
                          ? `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`
                          : days === 0
                          ? "Due today"
                          : `Due in ${days} day${days === 1 ? "" : "s"}`}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Current Month Planned Audits"
          subtitle={`Live view for ${monthLabel(currentMonthAuditKey)} showing planned, completed, and outstanding audits.`}
          action={
            <Link href={buildHref("/audits", { month: currentMonthAuditKey })} style={sectionLinkStyle}>
              Open audits {"->"}
            </Link>
          }
        >
          {isLoading ? (
            <p style={emptyTextStyle}>Loading audits...</p>
          ) : (
            <div style={stackCompactStyle}>
              <div style={auditMonthSummaryGridStyle}>
                <Link href={buildHref("/audits", { month: currentMonthAuditKey })} style={summaryMetricCardStyle}>
                  <span style={summaryMetricLabelStyle}>Planned This Month</span>
                  <strong style={summaryMetricValueStyle}>{currentMonthAudits.length}</strong>
                </Link>
                <Link
                  href={buildHref("/audits", { month: currentMonthAuditKey, status: "Completed" })}
                  style={summaryMetricCardStyle}
                >
                  <span style={summaryMetricLabelStyle}>Completed</span>
                  <strong style={summaryMetricValueStyle}>{currentMonthCompletedAudits}</strong>
                </Link>
                <Link href={buildHref("/audits", { month: currentMonthAuditKey })} style={summaryMetricCardStyle}>
                  <span style={summaryMetricLabelStyle}>Outstanding</span>
                  <strong style={summaryMetricValueStyle}>{currentMonthOutstandingAudits}</strong>
                </Link>
                <Link href={buildHref("/audits", { month: currentMonthAuditKey })} style={summaryMetricCardStyle}>
                  <span style={summaryMetricLabelStyle}>Completion Rate</span>
                  <strong style={summaryMetricValueStyle}>{currentMonthCompletionRate}%</strong>
                </Link>
              </div>

              {currentMonthAudits.length === 0 ? (
                <p style={emptyTextStyle}>No audits are planned for {monthLabel(currentMonthAuditKey)}.</p>
              ) : (
                <div style={stackCompactStyle}>
                  {currentMonthAudits.map((audit) => (
                    <Link
                      key={audit.id}
                      href={buildHref("/audits", {
                        search: audit.audit_number || audit.title || "",
                        month: currentMonthAuditKey,
                      })}
                      className="quality-work-item"
                      style={workItemStyle}
                    >
                      <div style={workItemTopStyle}>
                        <div style={workItemNumberStyle}>{audit.audit_number || "-"}</div>
                        <StatusBadge value={audit.status || "Unknown"} />
                      </div>
                      <div style={workItemTitleStyle}>{audit.title || "-"}</div>
                      <div style={workItemMetaStyle}>
                        <span>{audit.audit_type || "-"}</span>
                        <span>{formatAuditMonth(getAuditMonthKey(audit))}</span>
                        <span>{formatDate(audit.audit_date)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              <div style={nextMonthPreviewStyle}>
                <div style={nextMonthPreviewHeaderStyle}>
                  <span style={nextMonthPreviewLabelStyle}>Next Month Planned</span>
                  <Link href={buildHref("/audits", { month: nextMonthAuditKey })} style={sectionLinkStyle}>
                    View {monthLabel(nextMonthAuditKey)} {"->"}
                  </Link>
                </div>
                <div style={nextMonthPreviewCountStyle}>
                  {nextMonthAudits.length} planned for {monthLabel(nextMonthAuditKey)}
                </div>
                {nextMonthAudits.length > 0 ? (
                  <div style={nextMonthSnippetListStyle}>
                    {nextMonthAudits.slice(0, 3).map((audit) => (
                      <Link
                        key={audit.id}
                        href={buildHref("/audits", {
                          search: audit.audit_number || audit.title || "",
                          month: nextMonthAuditKey,
                        })}
                        className="quality-work-item"
                        style={nextMonthSnippetItemStyle}
                      >
                        <span style={nextMonthSnippetNumberStyle}>{audit.audit_number || "-"}</span>
                        <span style={nextMonthSnippetTitleStyle}>{audit.title || "-"}</span>
                        <StatusBadge value={audit.status || "Unknown"} />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p style={emptyTextStyle}>No audits are planned for {monthLabel(nextMonthAuditKey)}.</p>
                )}
              </div>
            </div>
          )}
        </SectionCard>
      </section>
      </div> : null}
    </main>
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

function SummaryRow({
  label,
  value,
  href,
  isLoading,
  tone = "default",
}: {
  label: string;
  value: number;
  href?: string;
  isLoading?: boolean;
  tone?: "default" | "warning" | "critical";
}) {
  const toneStyles =
    tone === "critical"
      ? { background: "#ECECE7", borderColor: "#ECECE7" }
      : tone === "warning"
      ? { background: "#ECECE7", borderColor: "#ECECE7" }
      : null;

  const content = (
    <div style={{ ...summaryRowStyle, ...(toneStyles || {}) }}>
      <span style={summaryRowLabelStyle}>{label}</span>
      <strong style={summaryRowValueStyle}>{isLoading ? "-" : value}</strong>
    </div>
  );

  return href ? (
    <Link href={href} style={{ textDecoration: "none" }}>
      {content}
    </Link>
  ) : (
    content
  );
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={metaChipStyle}>
      <div style={metaChipLabelStyle}>{label}</div>
      <div style={metaChipValueStyle}>{value}</div>
    </div>
  );
}

function getFindingCategoryColour(name: string) {
  if (name === "Major") return "#F93822";
  if (name === "Minor") return "#FFAD00";
  if (name === "OFI") return "#005670";
  return "#63B1BC";
}

function StatusBadge({ value }: { value: string }) {
  const lower = normaliseStatus(value);

  const styles =
    lower === "closed" || lower === "complete" || lower === "completed"
      ? { background: "#ECECE7", color: "#005670" }
      : lower === "open"
      ? { background: "#ECECE7", color: "#005670" }
      : lower === "in review"
      ? { background: "#ECECE7", color: "#53565A" }
      : lower === "in progress"
      ? { background: "#ECECE7", color: "#000000" }
      : lower === "planned"
      ? { background: "#ECECE7", color: "#005670" }
      : lower === "overdue"
      ? { background: "#ECECE7", color: "#F93822" }
      : { background: "#D0D0CE", color: "#53565A" };

  return (
    <span
      style={{
        padding: "6px 10px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 700,
        display: "inline-block",
        whiteSpace: "nowrap",
        ...styles,
      }}
    >
      {value}
    </span>
  );
}

function getFrequencyBadgeStyle(frequency: "Reduce" | "Maintain" | "Increase"): CSSProperties {
  if (frequency === "Increase") {
    return { ...badgeStyle, background: "#ECECE7", color: "#F93822" };
  }
  if (frequency === "Reduce") {
    return { ...badgeStyle, background: "#ECECE7", color: "#005670" };
  }
  return { ...badgeStyle, background: "#ECECE7", color: "#000000" };
}

const heroStyle: CSSProperties = {
  background: "linear-gradient(135deg, #005670 0%, #005670 64%, #63B1BC 160%)",
  color: "white",
  borderRadius: "20px",
  padding: "22px 24px",
  marginBottom: "18px",
  boxShadow: "0 10px 24px rgba(0, 86, 112, 0.14)",
  display: "grid",
  gap: "16px",
};

const heroCopyStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
};

const eyebrowStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  opacity: 0.82,
};

const heroTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "30px",
  lineHeight: 1.1,
  maxWidth: "960px",
};

const heroSubtitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "15px",
  maxWidth: "860px",
  color: "rgba(255,255,255,0.92)",
  lineHeight: 1.5,
};

const heroMetaRowStyle: CSSProperties = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
  alignItems: "flex-start",
};

const metaChipStyle: CSSProperties = {
  background: "rgba(255,255,255,0.1)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "14px",
  padding: "12px 14px",
  flex: "0 1 220px",
};

const metaChipLabelStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  opacity: 0.8,
  marginBottom: "6px",
};

const metaChipValueStyle: CSSProperties = {
  fontSize: "15px",
  fontWeight: 700,
  lineHeight: 1.4,
};

const errorBannerStyle: CSSProperties = {
  background: "#ECECE7",
  color: "#F93822",
  border: "1px solid #ECECE7",
  borderRadius: "14px",
  padding: "14px 16px",
  marginBottom: "18px",
};

const commandDeckStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(300px, 1.05fr) minmax(340px, 1.1fr) minmax(320px, 0.95fr)",
  gap: "16px",
  marginBottom: "18px",
  alignItems: "stretch",
};

const commandScorePanelStyle: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  borderRadius: "22px",
  padding: "22px",
  minHeight: "226px",
  color: "#ffffff",
  background: "linear-gradient(135deg, #005670 0%, #005670 64%, #63B1BC 160%)",
  boxShadow: "0 22px 42px rgba(15, 23, 42, 0.16)",
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: "18px",
  alignItems: "center",
};

const commandScoreCopyStyle: CSSProperties = {
  position: "relative",
  zIndex: 1,
  display: "grid",
  gap: "8px",
};

const commandEyebrowStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 900,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.78)",
};

const commandTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "26px",
  lineHeight: 1.08,
};

const commandTextStyle: CSSProperties = {
  margin: 0,
  color: "rgba(255,255,255,0.84)",
  fontSize: "13px",
  lineHeight: 1.55,
};

const scoreOrbStyle: CSSProperties = {
  width: "128px",
  height: "128px",
  borderRadius: "999px",
  padding: "8px",
  textDecoration: "none",
  boxShadow: "0 0 40px rgba(255,255,255,0.18), inset 0 0 0 1px rgba(255,255,255,0.18)",
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
};

const scoreOrbInnerStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  borderRadius: "999px",
  background: "rgba(15, 23, 42, 0.48)",
  border: "1px solid rgba(255,255,255,0.18)",
  display: "grid",
  placeItems: "center",
  alignContent: "center",
  color: "#ffffff",
};

const scoreValueStyle: CSSProperties = {
  fontSize: "36px",
  lineHeight: 1,
  letterSpacing: "-0.03em",
};

const scoreSubLabelStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 900,
  color: "rgba(255,255,255,0.72)",
  marginTop: "4px",
};

const signalGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "12px",
};

const signalCardStyle: CSSProperties = {
  minHeight: "104px",
  textDecoration: "none",
  color: imsColours.ink,
  background: "linear-gradient(180deg, #ffffff 0%, #ECECE7 100%)",
  border: `1px solid ${imsColours.border}`,
  borderTop: "4px solid #005670",
  borderRadius: "18px",
  boxShadow: imsShadows.card,
  padding: "14px 15px",
  display: "grid",
  gap: "6px",
  alignContent: "start",
};

const signalLabelStyle: CSSProperties = {
  color: imsColours.muted,
  fontSize: "12px",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const signalValueStyle: CSSProperties = {
  fontSize: "28px",
  lineHeight: 1,
  color: imsColours.ink,
};

const signalDetailStyle: CSSProperties = {
  color: imsColours.slate,
  fontSize: "12px",
  lineHeight: 1.35,
};

const pressurePanelStyle: CSSProperties = {
  borderRadius: "22px",
  padding: "20px",
  color: "#000000",
  background: "linear-gradient(145deg, #ffffff 0%, #ECECE7 100%)",
  border: "1px solid #D0D0CE",
  boxShadow: "0 14px 30px rgba(15, 23, 42, 0.08)",
  display: "grid",
  gap: "12px",
  minHeight: "226px",
};

const pressureHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
};

const pressureTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "20px",
  lineHeight: 1.15,
  color: "#000000",
};

const pressureSubtitleStyle: CSSProperties = {
  margin: "5px 0 0",
  color: "#53565A",
  fontSize: "12px",
};

const livePillStyle: CSSProperties = {
  borderRadius: "999px",
  padding: "7px 10px",
  background: "#005670",
  border: "1px solid #005670",
  color: "#ffffff",
  fontSize: "11px",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  whiteSpace: "nowrap",
};

const pressureChartWrapStyle: CSSProperties = {
  width: "100%",
  height: "158px",
  minHeight: "158px",
};

const kpiGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "12px",
  marginBottom: "22px",
  alignItems: "stretch",
};

const analyticsHealthPanelStyle: CSSProperties = {
  borderRadius: "22px",
  padding: "20px",
  color: "#ffffff",
  background: "linear-gradient(145deg, #005670 0%, #005670 66%, #63B1BC 170%)",
  boxShadow: "0 18px 36px rgba(0, 86, 112, 0.18)",
  display: "grid",
  alignContent: "start",
  gap: "18px",
};

const analyticsHealthHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
};

const healthAveragePillStyle: CSSProperties = {
  padding: "7px 10px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.24)",
  color: "#ffffff",
  fontSize: "11px",
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const analyticsHealthListStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
};

const analyticsHealthRowStyle: CSSProperties = {
  textDecoration: "none",
  color: "#ffffff",
  display: "grid",
  gap: "7px",
  padding: "9px 10px",
  borderRadius: "12px",
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.14)",
};

const analyticsHealthRowTopStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  fontSize: "12px",
  fontWeight: 800,
};

const healthGaugeTrackStyle: CSSProperties = {
  height: "10px",
  borderRadius: "999px",
  background: "#D0D0CE",
  overflow: "hidden",
};

const healthGaugeFillStyle: CSSProperties = {
  height: "100%",
  borderRadius: "999px",
};

const chartGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "18px",
  marginBottom: "18px",
};

const insightGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "18px",
  marginBottom: "18px",
};

const focusGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "12px",
  alignItems: "stretch",
};

const bottomGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "18px",
};

const panelStyle: CSSProperties = {
  background: "linear-gradient(180deg, #ffffff 0%, #ECECE7 100%)",
  borderRadius: "18px",
  padding: "18px",
  border: "1px solid #D0D0CE",
  boxShadow: "0 14px 30px rgba(15, 23, 42, 0.06)",
};

const sectionHeaderRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  marginBottom: "14px",
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
  lineHeight: 1.45,
};

const sectionLinkStyle: CSSProperties = {
  textDecoration: "none",
  color: "#005670",
  fontWeight: 700,
  fontSize: "14px",
};

const chartWrapStyle: CSSProperties = {
  width: "100%",
  minHeight: "300px",
  height: "320px",
};

const emptyTextStyle: CSSProperties = {
  color: "#53565A",
  margin: 0,
};

const stackCompactStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
};

const topProblemAreasStackStyle: CSSProperties = {
  display: "grid",
  gap: "8px",
};

const compactInsightLinkStyle: CSSProperties = {
  textDecoration: "none",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "10px 12px",
  borderRadius: "14px",
  border: "1px solid #D0D0CE",
  background: "#ECECE7",
  color: "#000000",
};

const topProblemAreaLinkStyle: CSSProperties = {
  ...compactInsightLinkStyle,
  padding: "8px 10px",
  gap: "10px",
};

const compactInsightRankStyle: CSSProperties = {
  width: "30px",
  height: "30px",
  borderRadius: "999px",
  background: "#ECECE7",
  color: "#005670",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  fontWeight: 800,
  flexShrink: 0,
};

const topProblemAreaRankStyle: CSSProperties = {
  ...compactInsightRankStyle,
  width: "28px",
  height: "28px",
};

const compactInsightBodyStyle: CSSProperties = {
  minWidth: 0,
  flex: 1,
};

const compactInsightTitleStyle: CSSProperties = {
  fontWeight: 800,
  fontSize: "13px",
  color: "#000000",
  marginBottom: "2px",
};

const compactInsightMetaStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  fontSize: "11px",
  color: "#53565A",
  lineHeight: 1.4,
};

const auditMonthSummaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "10px",
};

const summaryMetricCardStyle: CSSProperties = {
  textDecoration: "none",
  background: "#ECECE7",
  border: "1px solid #D0D0CE",
  borderRadius: "12px",
  padding: "10px 12px",
  display: "grid",
  gap: "4px",
  color: "#000000",
};

const summaryMetricLabelStyle: CSSProperties = {
  fontSize: "11px",
  fontWeight: 700,
  color: "#53565A",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
};

const summaryMetricValueStyle: CSSProperties = {
  fontSize: "22px",
  lineHeight: 1.1,
  color: "#000000",
};

const nextMonthPreviewStyle: CSSProperties = {
  borderTop: "1px solid #D0D0CE",
  paddingTop: "12px",
  display: "grid",
  gap: "8px",
};

const nextMonthPreviewHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
};

const nextMonthPreviewLabelStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 800,
  color: "#000000",
};

const nextMonthPreviewCountStyle: CSSProperties = {
  fontSize: "13px",
  color: "#53565A",
};

const nextMonthSnippetListStyle: CSSProperties = {
  display: "grid",
  gap: "8px",
};

const nextMonthSnippetItemStyle: CSSProperties = {
  textDecoration: "none",
  color: "#000000",
  display: "grid",
  gridTemplateColumns: "auto 1fr auto",
  alignItems: "center",
  gap: "10px",
  padding: "8px 10px",
  borderRadius: "10px",
  background: "#ECECE7",
  border: "1px solid #D0D0CE",
};

const nextMonthSnippetNumberStyle: CSSProperties = {
  fontSize: "11px",
  fontWeight: 800,
  color: "#53565A",
  whiteSpace: "nowrap",
};

const nextMonthSnippetTitleStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: "#000000",
  minWidth: 0,
};

const summaryRowStyle: CSSProperties = {
  background: "#ECECE7",
  border: "1px solid #D0D0CE",
  borderRadius: "12px",
  padding: "12px 14px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  color: "#000000",
  minHeight: "58px",
  boxSizing: "border-box",
};

const summaryRowLabelStyle: CSSProperties = {
  color: "#53565A",
  fontWeight: 800,
  lineHeight: 1.25,
  minWidth: 0,
};

const summaryRowValueStyle: CSSProperties = {
  color: "#000000",
  fontSize: "17px",
  flex: "0 0 auto",
};

const workItemStyle: CSSProperties = {
  textDecoration: "none",
  background: "#ECECE7",
  border: "1px solid #D0D0CE",
  borderRadius: "14px",
  padding: "14px 16px",
  color: "#000000",
  display: "grid",
  gap: "8px",
};

const workItemTopStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "center",
  flexWrap: "wrap",
};

const workItemNumberStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 800,
  color: "#53565A",
};

const workItemTitleStyle: CSSProperties = {
  fontSize: "15px",
  fontWeight: 700,
  color: "#000000",
  lineHeight: 1.4,
};

const workItemMetaStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  fontSize: "12px",
  color: "#53565A",
};

const badgeStyle: CSSProperties = {
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  whiteSpace: "nowrap",
};

const yearFilterStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  minHeight: "42px",
  padding: "0 10px",
  borderRadius: "10px",
  background: "#ffffff",
  border: "1px solid #D0D0CE",
  color: imsColours.ink,
  fontWeight: 900,
};


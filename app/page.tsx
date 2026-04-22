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
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "../src/lib/supabase";

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
};

function normaliseStatus(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function isClosedLikeStatus(value: string | null | undefined) {
  const status = normaliseStatus(value);
  return status === "closed" || status === "complete" || status === "completed";
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

export default function Home() {
  const router = useRouter();
  const [ncrs, setNcrs] = useState<Ncr[]>([]);
  const [capas, setCapas] = useState<Capa[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [auditFindings, setAuditFindings] = useState<AuditFindingRow[]>([]);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  useEffect(() => {
    const fetchData = async () => {
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
      ] = await Promise.all([
        supabase.from("assets").select("*"),
        supabase.from("ncrs").select("*"),
        supabase.from("capas").select("*"),
        supabase.from("actions").select("*"),
        supabase.from("audits").select("*"),
        supabase.from("audit_findings").select("*"),
        supabase.from("asset_quality").select("id,asset_id"),
        supabase.from("documents").select("id,status,review_approval_status,next_review_date"),
      ]);

      if (
        assetRes.error ||
        ncrRes.error ||
        capaRes.error ||
        actionRes.error ||
        auditRes.error ||
        findingRes.error ||
        assetQualityRes.error ||
        documentRes.error
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
      setLastRefreshed(new Date());
      setIsLoading(false);
    };

    void fetchData();
  }, []);

  const openNcrs = ncrs.filter((item) => !isClosedLikeStatus(item.status)).length;
  const openCapas = capas.filter((item) => !isClosedLikeStatus(item.status)).length;
  const openActions = actions.filter((item) => !isClosedLikeStatus(item.status)).length;
  const openAuditFindings = auditFindings.filter((item) => !isClosedLikeStatus(item.status)).length;

  const overdueActions = actions.filter((action) => {
    if (isClosedLikeStatus(action.status)) return false;
    const days = getDaysFromToday(action.due_date);
    return days !== null && days < 0;
  }).length;

  const overdueDocuments = documents.filter((doc) => getDocumentBucket(doc) === "Overdue").length;

  const overdueNcrCapas = [...ncrs, ...capas].filter((item) => {
    if (isClosedLikeStatus(item.status)) return false;
    const days = getDaysFromToday(item.due_date || null);
    return days !== null && days < 0;
  }).length;

  const ncrCapaStatusData = useMemo(
    () => [
      {
        name: "NCR",
        Open: ncrs.filter((item) => !isClosedLikeStatus(item.status)).length,
        Closed: ncrs.filter((item) => isClosedLikeStatus(item.status)).length,
      },
      {
        name: "CAPA",
        Open: capas.filter((item) => !isClosedLikeStatus(item.status)).length,
        Closed: capas.filter((item) => isClosedLikeStatus(item.status)).length,
      },
    ],
    [ncrs, capas]
  );

  const actionsTrendData = useMemo(() => {
    const keys = new Set<string>();
    const openedMap: Record<string, number> = {};
    const closedMap: Record<string, number> = {};

    actions.forEach((action) => {
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
  }, [actions]);

  const findingsBreakdownData = useMemo(() => {
    const counts = {
      Major: 0,
      Minor: 0,
      OFI: 0,
      OBS: 0,
    };

    auditFindings.forEach((finding) => {
      const category = (finding.category || "").trim();
      if (category === "Major" || category === "Minor" || category === "OFI" || category === "OBS") {
        counts[category] += 1;
      }
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [auditFindings]);

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
    return [...actions]
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
  }, [actions]);

  const upcomingAudits = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const future = audits
      .filter((audit) => {
        if (!audit.audit_date) return false;
        const date = new Date(audit.audit_date);
        if (Number.isNaN(date.getTime())) return false;
        date.setHours(0, 0, 0, 0);
        return date >= today && normaliseStatus(audit.status) !== "completed";
      })
      .sort((a, b) => new Date(a.audit_date || "").getTime() - new Date(b.audit_date || "").getTime())
      .slice(0, 5);

    if (future.length > 0) return future;

    return [...audits]
      .sort((a, b) => {
        const aDate = a.audit_date ? new Date(a.audit_date).getTime() : Number.MAX_SAFE_INTEGER;
        const bDate = b.audit_date ? new Date(b.audit_date).getTime() : Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
      })
      .slice(0, 5);
  }, [audits]);

  const kpis = [
    {
      label: "Open NCRs",
      value: openNcrs,
      accent: "#dc2626",
      href: buildHref("/ncr-capa", { type: "NCR", status: "Open" }),
    },
    {
      label: "Open CAPAs",
      value: openCapas,
      accent: "#f59e0b",
      href: buildHref("/ncr-capa", { type: "CAPA", status: "Open" }),
    },
    {
      label: "Open Actions",
      value: openActions,
      accent: "#2563eb",
      href: buildHref("/actions", { status: "Open" }),
    },
    {
      label: "Open Audit Findings",
      value: openAuditFindings,
      accent: "#7c3aed",
      href: buildHref("/audits", { findingStatus: "Open" }),
    },
    {
      label: "Overdue Actions",
      value: overdueActions,
      accent: "#b91c1c",
      href: buildHref("/actions", { overdue: 1 }),
    },
    {
      label: "Overdue Documents",
      value: overdueDocuments,
      accent: "#0f766e",
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

  return (
    <main>
      <section style={heroStyle}>
        <div style={heroCopyStyle}>
          <div style={eyebrowStyle}>Quality Dashboard</div>
          <h1 style={heroTitleStyle}>Operational quality view across MOCs, NCRs, CAPAs, audits, actions, and documents</h1>
          <p style={heroSubtitleStyle}>
            Compact management view for launch monitoring, built around live workloads, trends, and the next items that need follow-up.
          </p>
        </div>

        <div style={heroMetaRowStyle}>
          <MetaChip label="System" value={error ? "Issue" : isLoading ? "Loading" : "Connected"} />
          <MetaChip label="Last Refreshed" value={isLoading ? "Loading..." : formatDateTime(lastRefreshed)} />
        </div>
      </section>

      {error ? (
        <section style={errorBannerStyle}>
          <strong style={{ display: "block", marginBottom: "4px" }}>Dashboard error</strong>
          <span>{error}</span>
        </section>
      ) : null}

      <section style={kpiGridStyle}>
        {kpis.map((item) => (
          <StatCard
            key={item.label}
            title={item.label}
            value={item.value}
            accent={item.accent}
            isLoading={isLoading}
            href={item.href}
          />
        ))}
      </section>

      <section style={chartGridStyle}>
        <SectionCard title="NCR/CAPA Status" subtitle="Open versus closed by record type.">
          {isLoading ? (
            <p style={emptyTextStyle}>Loading chart...</p>
          ) : (
            <div style={chartWrapStyle}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ncrCapaStatusData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="Open"
                    stackId="status"
                    fill="#dc2626"
                    radius={[6, 6, 0, 0]}
                    cursor="pointer"
                    onClick={(data: { name?: string }) =>
                      router.push(buildHref("/ncr-capa", { type: data?.name || "", status: "Open" }))
                    }
                  />
                  <Bar
                    dataKey="Closed"
                    stackId="status"
                    fill="#16a34a"
                    radius={[6, 6, 0, 0]}
                    cursor="pointer"
                    onClick={(data: { name?: string }) =>
                      router.push(buildHref("/ncr-capa", { type: data?.name || "", status: "Closed" }))
                    }
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Actions Trend" subtitle="Monthly opened versus closed actions.">
          {isLoading ? (
            <p style={emptyTextStyle}>Loading chart...</p>
          ) : (
            <div style={chartWrapStyle}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={actionsTrendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="Opened"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ r: 4, cursor: "pointer" }}
                    activeDot={{ r: 5, cursor: "pointer" }}
                    onClick={(data: unknown) =>
                      router.push(
                        buildHref("/actions", {
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
                    stroke="#16a34a"
                    strokeWidth={3}
                    dot={{ r: 4, cursor: "pointer" }}
                    activeDot={{ r: 5, cursor: "pointer" }}
                    onClick={(data: unknown) =>
                      router.push(
                        buildHref("/actions", {
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

        <SectionCard title="Audit Findings Breakdown" subtitle="Major, Minor, OFI and OBS totals.">
          {isLoading ? (
            <p style={emptyTextStyle}>Loading chart...</p>
          ) : (
            <div style={chartWrapStyle}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={findingsBreakdownData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar
                    dataKey="value"
                    radius={[6, 6, 0, 0]}
                    cursor="pointer"
                    onClick={(data: { name?: string }) =>
                      router.push(buildHref("/audits", { findingCategory: data?.name || "" }))
                    }
                  >
                    {findingsBreakdownData.map((entry) => (
                      <Cell key={entry.name} fill={getFindingBarColor(entry.name)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Document Status" subtitle="Draft, under review, approved, and overdue review positions.">
          {isLoading ? (
            <p style={emptyTextStyle}>Loading chart...</p>
          ) : (
            <div style={chartWrapStyle}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={documentStatusData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar
                    dataKey="value"
                    fill="#0f766e"
                    radius={[6, 6, 0, 0]}
                    cursor="pointer"
                    onClick={(data: { name?: string }) => openDocumentStatusBucket(data?.name || "")}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
      </section>

      <section style={insightGridStyle}>
        <SectionCard title="Top Problem Areas" subtitle="Current highest-finding audit areas using the existing risk scoring approach.">
          {isLoading ? (
            <p style={emptyTextStyle}>Loading insight...</p>
          ) : topProblemAreas.length === 0 ? (
            <p style={emptyTextStyle}>No audit findings available yet.</p>
          ) : (
            <div style={stackCompactStyle}>
              {topProblemAreas.map((item, index) => (
                <Link
                  key={item.label}
                  href={buildHref("/audits", { search: item.label })}
                  style={compactInsightLinkStyle}
                >
                  <div style={compactInsightRankStyle}>#{index + 1}</div>
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

        <SectionCard title="Overdue Work" subtitle="Current overdue workload across actions, NCR/CAPA, and documents.">
          <div style={stackCompactStyle}>
            <SummaryRow
              label="Overdue Actions"
              value={overdueActions}
              href={buildHref("/actions", { overdue: 1 })}
              isLoading={isLoading}
            />
            <SummaryRow
              label="Overdue NCR/CAPA"
              value={overdueNcrCapas}
              href={buildHref("/ncr-capa", { status: "Open" })}
              isLoading={isLoading}
            />
            <SummaryRow
              label="Overdue Documents"
              value={overdueDocuments}
              href={buildHref("/documents", { status: "Overdue" })}
              isLoading={isLoading}
            />
          </div>
        </SectionCard>
      </section>

      <section style={bottomGridStyle}>
        <SectionCard
          title="Priority Actions"
          subtitle="Top five overdue or high-priority actions."
          action={
            <Link href="/actions" style={sectionLinkStyle}>
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
                    style={{
                      ...workItemStyle,
                      background: overdue ? "#fff7f7" : "#f8fafc",
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
          title="Upcoming Audits"
          subtitle="Next five scheduled audits."
          action={
            <Link href="/audits" style={sectionLinkStyle}>
              Open audits {"->"}
            </Link>
          }
        >
          {isLoading ? (
            <p style={emptyTextStyle}>Loading audits...</p>
          ) : upcomingAudits.length === 0 ? (
            <p style={emptyTextStyle}>No audits found.</p>
          ) : (
            <div style={stackCompactStyle}>
              {upcomingAudits.map((audit) => (
                <Link
                  key={audit.id}
                  href={buildHref("/audits", { search: audit.audit_number || audit.title || "" })}
                  style={workItemStyle}
                >
                  <div style={workItemTopStyle}>
                    <div style={workItemNumberStyle}>{audit.audit_number || "-"}</div>
                    <StatusBadge value={audit.status || "Unknown"} />
                  </div>
                  <div style={workItemTitleStyle}>{audit.title || "-"}</div>
                  <div style={workItemMetaStyle}>
                    <span>{audit.audit_type || "-"}</span>
                    <span>{formatAuditMonth(audit.audit_month)}</span>
                    <span>{formatDate(audit.audit_date)}</span>
                  </div>
                </Link>
              ))}
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

function StatCard({
  title,
  value,
  accent,
  isLoading,
  href,
}: {
  title: string;
  value: number;
  accent: string;
  isLoading?: boolean;
  href?: string;
}) {
  const content = (
    <div
      style={{
        ...statCardStyle,
        borderTop: `4px solid ${accent}`,
      }}
    >
      <div style={statCardLabelStyle}>{title}</div>
      <div style={statCardValueStyle}>{isLoading ? "-" : value}</div>
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

function SummaryRow({
  label,
  value,
  href,
  isLoading,
}: {
  label: string;
  value: number;
  href?: string;
  isLoading?: boolean;
}) {
  const content = (
    <div style={summaryRowStyle}>
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

function getFindingBarColor(name: string) {
  if (name === "Major") return "#b91c1c";
  if (name === "Minor") return "#f59e0b";
  if (name === "OFI") return "#16a34a";
  return "#2563eb";
}

function StatusBadge({ value }: { value: string }) {
  const lower = normaliseStatus(value);

  const styles =
    lower === "closed" || lower === "complete" || lower === "completed"
      ? { background: "#dcfce7", color: "#166534" }
      : lower === "open"
      ? { background: "#dbeafe", color: "#1d4ed8" }
      : lower === "in progress"
      ? { background: "#fef3c7", color: "#92400e" }
      : lower === "planned"
      ? { background: "#dbeafe", color: "#1d4ed8" }
      : lower === "overdue"
      ? { background: "#fee2e2", color: "#991b1b" }
      : { background: "#e5e7eb", color: "#374151" };

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
    return { ...badgeStyle, background: "#fee2e2", color: "#991b1b" };
  }
  if (frequency === "Reduce") {
    return { ...badgeStyle, background: "#dcfce7", color: "#166534" };
  }
  return { ...badgeStyle, background: "#fef3c7", color: "#92400e" };
}

const heroStyle: CSSProperties = {
  background: "linear-gradient(135deg, #0f766e 0%, #115e59 100%)",
  color: "white",
  borderRadius: "20px",
  padding: "22px 24px",
  marginBottom: "18px",
  boxShadow: "0 10px 24px rgba(15, 118, 110, 0.14)",
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
  background: "#fef2f2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  borderRadius: "14px",
  padding: "14px 16px",
  marginBottom: "18px",
};

const kpiGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: "12px",
  marginBottom: "18px",
};

const statCardStyle: CSSProperties = {
  background: "white",
  borderRadius: "16px",
  padding: "16px 18px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
  minHeight: "104px",
};

const statCardLabelStyle: CSSProperties = {
  fontSize: "13px",
  color: "#64748b",
  fontWeight: 600,
  lineHeight: 1.4,
};

const statCardValueStyle: CSSProperties = {
  fontSize: "30px",
  fontWeight: 700,
  color: "#0f172a",
  marginTop: "10px",
};

const chartGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "18px",
  marginBottom: "18px",
};

const insightGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.2fr 0.8fr",
  gap: "18px",
  marginBottom: "18px",
};

const bottomGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "18px",
};

const panelStyle: CSSProperties = {
  background: "white",
  borderRadius: "18px",
  padding: "18px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
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
  color: "#0f172a",
};

const sectionSubtitleStyle: CSSProperties = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: "14px",
  lineHeight: 1.45,
};

const sectionLinkStyle: CSSProperties = {
  textDecoration: "none",
  color: "#0f766e",
  fontWeight: 700,
  fontSize: "14px",
};

const chartWrapStyle: CSSProperties = {
  width: "100%",
  minHeight: "300px",
  height: "320px",
};

const emptyTextStyle: CSSProperties = {
  color: "#64748b",
  margin: 0,
};

const stackCompactStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
};

const compactInsightLinkStyle: CSSProperties = {
  textDecoration: "none",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "12px 14px",
  borderRadius: "14px",
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  color: "#0f172a",
};

const compactInsightRankStyle: CSSProperties = {
  width: "34px",
  height: "34px",
  borderRadius: "999px",
  background: "#dbeafe",
  color: "#1d4ed8",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  fontWeight: 800,
  flexShrink: 0,
};

const compactInsightBodyStyle: CSSProperties = {
  minWidth: 0,
  flex: 1,
};

const compactInsightTitleStyle: CSSProperties = {
  fontWeight: 800,
  fontSize: "14px",
  color: "#0f172a",
  marginBottom: "4px",
};

const compactInsightMetaStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  fontSize: "12px",
  color: "#64748b",
  lineHeight: 1.4,
};

const summaryRowStyle: CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "12px 14px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  color: "#0f172a",
};

const summaryRowLabelStyle: CSSProperties = {
  color: "#334155",
  fontWeight: 600,
};

const summaryRowValueStyle: CSSProperties = {
  color: "#0f172a",
};

const workItemStyle: CSSProperties = {
  textDecoration: "none",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  padding: "14px 16px",
  color: "#0f172a",
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
  color: "#64748b",
};

const workItemTitleStyle: CSSProperties = {
  fontSize: "15px",
  fontWeight: 700,
  color: "#0f172a",
  lineHeight: 1.4,
};

const workItemMetaStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  fontSize: "12px",
  color: "#64748b",
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

"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

type BulkDocumentRow = {
  id: string;
  documentNumber: string;
  title: string | null;
  revision: string | null;
};

type BulkDetails = {
  kind: "review" | "approval";
  intendedName: string | null;
  intendedEmail: string;
  signedInAs: string;
  canAct: boolean;
  total: number;
  doneCount: number;
  documents: BulkDocumentRow[];
};

function BulkReviewContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [details, setDetails] = useState<BulkDetails | null>(null);
  const [message, setMessage] = useState("Loading documents...");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState("");

  const load = useCallback(async () => {
    if (!token) {
      setMessage("This link is missing its secure token.");
      return;
    }

    try {
      const response = await fetch(`/api/document-bulk-review?token=${encodeURIComponent(token)}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Unable to load this bulk review.");

      const loaded = payload as BulkDetails;
      setDetails(loaded);
      setSelected(new Set(loaded.documents.map((doc) => doc.id)));
      setMessage(
        loaded.documents.length
          ? "Check the documents below, then confirm."
          : "Nothing is waiting on this link. Every document on it has already been dealt with."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load this bulk review.");
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const isReview = details?.kind === "review";
  const verb = isReview ? "Accept review" : "Approve";
  const count = selected.size;
  const allSelected = useMemo(() => Boolean(details?.documents.length) && count === details?.documents.length, [details, count]);

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (!details) return;
    setSelected(allSelected ? new Set() : new Set(details.documents.map((doc) => doc.id)));
  }

  async function confirm() {
    if (!details || !count) return;

    setIsSubmitting(true);
    setMessage("Updating documents...");

    try {
      const response = await fetch("/api/document-bulk-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, documentIds: Array.from(selected) }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Unable to complete the bulk review.");

      setResult(payload?.message || "Done.");
      setMessage("Completed.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to complete the bulk review.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <div style={headerStyle}>
          <Image src="/enshore-primary-logo-colour.svg" alt="Enshore" width={180} height={90} style={{ width: "180px", height: "auto", objectFit: "contain" }} />
          <div>
            <div style={eyebrowStyle}>Document Control</div>
            <h1 style={titleStyle}>{details ? (isReview ? "Bulk review" : "Bulk approval") : "Bulk review"}</h1>
            <p style={subtitleStyle}>
              {details
                ? isReview
                  ? "Accept the review of several documents at once. The approver is sent the same request automatically."
                  : "Approve several reviewed documents at once. They go live straight away."
                : "Secure confirmation page for review and approval."}
            </p>
          </div>
        </div>

        <div style={statusStyle}>
          <strong>Status:</strong> {message}
        </div>

        {result ? <div style={resultStyle}>{result}</div> : null}

        {details && !details.canAct ? (
          <div style={warningStyle}>
            This link is for <strong>{details.intendedName || details.intendedEmail}</strong>. You are signed in as <strong>{details.signedInAs}</strong>, so you can look but not confirm. Sign in as the named person to continue.
          </div>
        ) : null}

        {details && details.documents.length ? (
          <div style={contentStyle}>
            <div style={summaryGridStyle}>
              <div style={summaryItemStyle}>
                <span style={summaryLabelStyle}>Action for</span>
                <strong>{details.intendedName || details.intendedEmail}</strong>
              </div>
              <div style={summaryItemStyle}>
                <span style={summaryLabelStyle}>Waiting</span>
                <strong>{details.documents.length} documents</strong>
              </div>
              <div style={summaryItemStyle}>
                <span style={summaryLabelStyle}>Already done</span>
                <strong>{details.doneCount}</strong>
              </div>
            </div>

            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width: "44px" }}>
                      <input type="checkbox" id="bulk-select-all" checked={allSelected} onChange={toggleAll} aria-label="Select all documents" disabled={!details.canAct || isSubmitting} />
                    </th>
                    <th style={thStyle}>Document</th>
                    <th style={thStyle}>Title</th>
                    <th style={{ ...thStyle, textAlign: "center" }}>Rev</th>
                  </tr>
                </thead>
                <tbody>
                  {details.documents.map((doc) => (
                    <tr key={doc.id}>
                      <td style={tdStyle}>
                        <input
                          type="checkbox"
                          id={`bulk-doc-${doc.id}`}
                          checked={selected.has(doc.id)}
                          onChange={() => toggle(doc.id)}
                          aria-label={`Select ${doc.documentNumber}`}
                          disabled={!details.canAct || isSubmitting}
                        />
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 800, whiteSpace: "nowrap" }}>{doc.documentNumber}</td>
                      <td style={tdStyle}>{doc.title || "-"}</td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>{doc.revision || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p style={noteStyle}>
              Each document is recorded individually in its own activity log, with your name and today&apos;s date. Anything you untick stays where it is and can still be dealt with from its own page.
            </p>

            <button
              type="button"
              style={{ ...buttonStyle, opacity: isSubmitting || !count || !details.canAct ? 0.55 : 1 }}
              onClick={confirm}
              disabled={isSubmitting || !count || !details.canAct}
            >
              {isSubmitting ? "Updating..." : `${verb} for ${count} document${count === 1 ? "" : "s"}`}
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default function BulkReviewPage() {
  return (
    <Suspense fallback={<main style={pageStyle}>Loading documents...</main>}>
      <BulkReviewContent />
    </Suspense>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background: "#ECECE7",
  padding: "32px 16px",
  display: "grid",
  placeItems: "start center",
  fontFamily: "\"Azo Sans\", \"Segoe UI\", Arial, Helvetica, sans-serif",
};

const cardStyle: CSSProperties = {
  width: "min(920px, 100%)",
  background: "#ffffff",
  border: "1px solid #D0D0CE",
  borderRadius: "22px",
  boxShadow: "0 12px 34px rgba(15, 23, 42, 0.1)",
  padding: "24px",
  display: "grid",
  gap: "18px",
};

const headerStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr)",
  gap: "20px",
  alignItems: "center",
};

const eyebrowStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 800,
  color: "#005670",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const titleStyle: CSSProperties = {
  margin: "4px 0",
  color: "#000000",
  fontSize: "34px",
  lineHeight: 1.05,
};

const subtitleStyle: CSSProperties = {
  margin: 0,
  color: "#53565A",
  fontSize: "15px",
};

const statusStyle: CSSProperties = {
  border: "1px solid #D0D0CE",
  borderRadius: "14px",
  padding: "13px 15px",
  color: "#000000",
  background: "#ECECE7",
};

const resultStyle: CSSProperties = {
  border: "1px solid #63B1BC",
  borderRadius: "14px",
  padding: "13px 15px",
  color: "#000000",
  background: "#EEF7F8",
  fontWeight: 700,
};

const warningStyle: CSSProperties = {
  border: "1px solid #FFAD00",
  borderRadius: "14px",
  padding: "13px 15px",
  color: "#000000",
  background: "#ECECE7",
};

const contentStyle: CSSProperties = {
  display: "grid",
  gap: "16px",
};

const summaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "12px",
};

const summaryItemStyle: CSSProperties = {
  border: "1px solid #D0D0CE",
  background: "#ECECE7",
  borderRadius: "14px",
  padding: "13px",
  display: "grid",
  gap: "5px",
};

const summaryLabelStyle: CSSProperties = {
  color: "#53565A",
  fontSize: "11px",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const tableWrapStyle: CSSProperties = {
  border: "1px solid #D0D0CE",
  borderRadius: "14px",
  overflowX: "auto",
  maxHeight: "460px",
  overflowY: "auto",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "14px",
};

const thStyle: CSSProperties = {
  position: "sticky",
  top: 0,
  background: "#ECECE7",
  color: "#53565A",
  fontSize: "11px",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  textAlign: "left",
  padding: "10px 12px",
  borderBottom: "1px solid #D0D0CE",
};

const tdStyle: CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid #D0D0CE",
  color: "#000000",
};

const noteStyle: CSSProperties = {
  margin: 0,
  color: "#53565A",
  fontSize: "13px",
};

const buttonStyle: CSSProperties = {
  border: "none",
  borderRadius: "12px",
  background: "#005670",
  color: "#ffffff",
  fontWeight: 800,
  padding: "13px 18px",
  cursor: "pointer",
  justifySelf: "start",
};

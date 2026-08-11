"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

type WorkflowActionDetails = {
  action: string;
  intendedName: string | null;
  intendedEmail: string | null;
  document: {
    documentNumber: string;
    title: string | null;
    revision: string | null;
    workflowStatus: string | null;
  };
};

function getActionLabel(action: string) {
  if (action === "accept_review") return "Accept Review";
  if (action === "approve_document") return "Approve Document";
  if (action === "reject_review" || action === "reject_approval") return "Reject Document";
  return "Confirm Action";
}

function isRejectAction(action: string) {
  return action === "reject_review" || action === "reject_approval";
}

function WorkflowActionContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [details, setDetails] = useState<WorkflowActionDetails | null>(null);
  const [message, setMessage] = useState("Loading workflow action...");
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const actionLabel = useMemo(() => getActionLabel(details?.action || ""), [details?.action]);
  const requiresReason = isRejectAction(details?.action || "");

  useEffect(() => {
    let isMounted = true;

    async function loadDetails() {
      if (!token) {
        setMessage("This workflow link is missing its secure token.");
        return;
      }

      try {
        const response = await fetch(`/api/document-workflow-action?token=${encodeURIComponent(token)}`);
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || "Unable to load workflow action.");
        }

        if (!isMounted) return;
        setDetails(payload as WorkflowActionDetails);
        setMessage("Review the details below before confirming.");
      } catch (error) {
        if (!isMounted) return;
        setMessage(error instanceof Error ? error.message : "Unable to load workflow action.");
      }
    }

    void loadDetails();

    return () => {
      isMounted = false;
    };
  }, [token]);

  async function submitAction() {
    if (!token || !details) return;

    if (requiresReason && !rejectionReason.trim()) {
      setMessage("Enter a rejection reason before confirming.");
      return;
    }

    setIsSubmitting(true);
    setMessage("Submitting workflow action...");

    try {
      const response = await fetch("/api/document-workflow-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, rejectionReason }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to complete workflow action.");
      }

      setIsComplete(true);
      setMessage(payload?.message || "Workflow action completed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to complete workflow action.");
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
            <h1 style={titleStyle}>Workflow Confirmation</h1>
            <p style={subtitleStyle}>Secure confirmation page for review and approval actions.</p>
          </div>
        </div>

        <div style={statusStyle}>
          <strong>Status:</strong> {message}
        </div>

        {details ? (
          <div style={contentStyle}>
            <div style={summaryGridStyle}>
              <div style={summaryItemStyle}>
                <span style={summaryLabelStyle}>Document</span>
                <strong>{details.document.documentNumber}</strong>
              </div>
              <div style={summaryItemStyle}>
                <span style={summaryLabelStyle}>Title</span>
                <strong>{details.document.title || "-"}</strong>
              </div>
              <div style={summaryItemStyle}>
                <span style={summaryLabelStyle}>Revision</span>
                <strong>{details.document.revision || "-"}</strong>
              </div>
              <div style={summaryItemStyle}>
                <span style={summaryLabelStyle}>Current Status</span>
                <strong>{details.document.workflowStatus || "-"}</strong>
              </div>
              <div style={summaryItemStyle}>
                <span style={summaryLabelStyle}>Action For</span>
                <strong>{details.intendedName || details.intendedEmail || "-"}</strong>
              </div>
              <div style={summaryItemStyle}>
                <span style={summaryLabelStyle}>Action</span>
                <strong>{actionLabel}</strong>
              </div>
            </div>

            {requiresReason ? (
              <label style={fieldStyle}>
                <span style={labelStyle}>Rejection Reason</span>
                <textarea
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                  style={textareaStyle}
                  placeholder="Enter the reason so the originator knows what needs to change"
                  disabled={isComplete}
                />
              </label>
            ) : null}

            <button
              type="button"
              style={{
                ...buttonStyle,
                background: requiresReason ? "#F93822" : "#005670",
                opacity: isSubmitting || isComplete ? 0.65 : 1,
              }}
              onClick={submitAction}
              disabled={isSubmitting || isComplete}
            >
              {isSubmitting ? "Submitting..." : isComplete ? "Completed" : `Confirm ${actionLabel}`}
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default function WorkflowActionPage() {
  return (
    <Suspense fallback={<main style={pageStyle}>Loading workflow action...</main>}>
      <WorkflowActionContent />
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
  width: "min(860px, 100%)",
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

const contentStyle: CSSProperties = {
  display: "grid",
  gap: "16px",
};

const summaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
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

const fieldStyle: CSSProperties = {
  display: "grid",
  gap: "7px",
};

const labelStyle: CSSProperties = {
  color: "#000000",
  fontSize: "13px",
  fontWeight: 800,
  textTransform: "uppercase",
};

const textareaStyle: CSSProperties = {
  width: "100%",
  minHeight: "120px",
  borderRadius: "14px",
  border: "1px solid #D0D0CE",
  padding: "12px",
  font: "inherit",
  resize: "vertical",
};

const buttonStyle: CSSProperties = {
  border: "none",
  borderRadius: "12px",
  color: "#ffffff",
  fontWeight: 800,
  padding: "13px 18px",
  cursor: "pointer",
  justifySelf: "start",
};

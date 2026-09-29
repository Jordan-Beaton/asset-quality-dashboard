"use client";

import { Suspense, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

type SignoffDetails = {
  status: string;
  recipientName: string;
  rowLabel: string;
  mocReportNo: string;
  mocReportTitle: string;
};

type Decision = "approve" | "reject" | "comments";

function decisionLabel(decision: Decision) {
  if (decision === "approve") return "Approve";
  if (decision === "reject") return "Reject";
  return "Comments";
}

function MocSignoffActionContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [details, setDetails] = useState<SignoffDetails | null>(null);
  const [message, setMessage] = useState("Loading sign-off request...");
  const [name, setName] = useState("");
  const [decision, setDecision] = useState<Decision | null>(null);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadDetails() {
      if (!token) {
        setMessage("This sign-off link is missing its secure token.");
        return;
      }
      try {
        const response = await fetch(`/api/moc-signoff-action?token=${encodeURIComponent(token)}`);
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || "Unable to load the sign-off request.");
        if (!isMounted) return;
        setDetails(payload as SignoffDetails);
        setName((payload as SignoffDetails).recipientName || "");
        if ((payload as SignoffDetails).status !== "Pending") {
          setMessage(`This sign-off has already been decided (${(payload as SignoffDetails).status}).`);
          setIsComplete(true);
        } else {
          setMessage("Review the attached MOC summary, then choose your decision below.");
        }
      } catch (error) {
        if (!isMounted) return;
        setMessage(error instanceof Error ? error.message : "Unable to load the sign-off request.");
      }
    }

    void loadDetails();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const requiresNote = decision === "reject" || decision === "comments";

  async function submitDecision() {
    if (!token || !details || !decision) return;
    if (!name.trim()) {
      setMessage("Enter your name to confirm this decision.");
      return;
    }
    if (requiresNote && !note.trim()) {
      setMessage(decision === "reject" ? "Enter a reason to reject." : "Enter your comments.");
      return;
    }

    setIsSubmitting(true);
    setMessage("Submitting your decision...");
    try {
      const response = await fetch("/api/moc-signoff-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, decision, name, note }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Unable to record your decision.");
      setIsComplete(true);
      setMessage(
        decision === "comments"
          ? "Your comments have been recorded and the MOC Coordinator has been notified to follow up."
          : `Your decision (${decisionLabel(decision)}) has been recorded.`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to record your decision.");
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
            <div style={eyebrowStyle}>Management of Change</div>
            <h1 style={titleStyle}>MOC Sign-Off</h1>
            <p style={subtitleStyle}>Secure sign-off page - no IMS login required.</p>
          </div>
        </div>

        <div style={statusStyle}>
          <strong>Status:</strong> {message}
        </div>

        {details && !isComplete ? (
          <div style={contentStyle}>
            <div style={summaryGridStyle}>
              <div style={summaryItemStyle}>
                <span style={summaryLabelStyle}>MOC Number</span>
                <strong>{details.mocReportNo || "-"}</strong>
              </div>
              <div style={summaryItemStyle}>
                <span style={summaryLabelStyle}>Title</span>
                <strong>{details.mocReportTitle || "-"}</strong>
              </div>
              <div style={summaryItemStyle}>
                <span style={summaryLabelStyle}>Reviewing As</span>
                <strong>{details.rowLabel || "-"}</strong>
              </div>
            </div>

            <p style={subtitleStyle}>A summary PDF of this MOC was attached to the email that brought you here.</p>

            <label style={fieldStyle}>
              <span style={labelStyle}>Your Name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} style={inputStyle} disabled={isSubmitting} placeholder="Type your full name to confirm this decision" />
            </label>

            <div style={decisionRowStyle}>
              <button type="button" style={{ ...decisionButtonStyle, ...(decision === "approve" ? decisionButtonActiveApprove : {}) }} onClick={() => setDecision("approve")} disabled={isSubmitting}>
                Approve
              </button>
              <button type="button" style={{ ...decisionButtonStyle, ...(decision === "reject" ? decisionButtonActiveReject : {}) }} onClick={() => setDecision("reject")} disabled={isSubmitting}>
                Reject
              </button>
              <button type="button" style={{ ...decisionButtonStyle, ...(decision === "comments" ? decisionButtonActiveComments : {}) }} onClick={() => setDecision("comments")} disabled={isSubmitting}>
                Comments
              </button>
            </div>

            {requiresNote ? (
              <label style={fieldStyle}>
                <span style={labelStyle}>{decision === "reject" ? "Reason for Rejection" : "Your Comments"}</span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  style={textareaStyle}
                  placeholder={decision === "reject" ? "Explain why this change is rejected" : "Comments do not approve or reject the change - the MOC Coordinator will be notified to follow up"}
                  disabled={isSubmitting}
                />
              </label>
            ) : null}

            <button
              type="button"
              style={{
                ...submitButtonStyle,
                background: decision === "reject" ? "#F93822" : decision === "comments" ? "#FFAD00" : "#005670",
                color: decision === "comments" ? "#000000" : "#ffffff",
                opacity: !decision || isSubmitting ? 0.55 : 1,
                cursor: !decision || isSubmitting ? "not-allowed" : "pointer",
              }}
              onClick={submitDecision}
              disabled={!decision || isSubmitting}
            >
              {isSubmitting ? "Submitting..." : decision ? `Confirm ${decisionLabel(decision)}` : "Choose a decision above"}
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default function MocSignoffActionPage() {
  return (
    <Suspense fallback={<main style={pageStyle}>Loading sign-off request...</main>}>
      <MocSignoffActionContent />
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

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  borderRadius: "12px",
  border: "1px solid #D0D0CE",
  padding: "12px",
  font: "inherit",
};

const textareaStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: "120px",
  borderRadius: "14px",
  border: "1px solid #D0D0CE",
  padding: "12px",
  font: "inherit",
  resize: "vertical",
};

const decisionRowStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const decisionButtonStyle: CSSProperties = {
  flex: "1 1 140px",
  border: "1px solid #D0D0CE",
  borderRadius: "12px",
  padding: "13px 16px",
  fontWeight: 800,
  cursor: "pointer",
  background: "#ECECE7",
  color: "#000000",
};

const decisionButtonActiveApprove: CSSProperties = { background: "#005670", color: "#ffffff", borderColor: "#005670" };
const decisionButtonActiveReject: CSSProperties = { background: "#F93822", color: "#ffffff", borderColor: "#F93822" };
const decisionButtonActiveComments: CSSProperties = { background: "#FFAD00", color: "#000000", borderColor: "#FFAD00" };

const submitButtonStyle: CSSProperties = {
  border: "none",
  borderRadius: "12px",
  color: "#ffffff",
  fontWeight: 800,
  padding: "13px 18px",
  justifySelf: "start",
};

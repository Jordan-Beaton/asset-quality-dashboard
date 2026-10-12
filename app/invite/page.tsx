"use client";

import { Suspense, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

type InviteDetails = { name: string; maskedEmail: string };

function InviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [details, setDetails] = useState<InviteDetails | null>(null);
  const [message, setMessage] = useState("Checking your invite...");
  const [problem, setProblem] = useState(false);
  const [continuing, setContinuing] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadDetails() {
      if (!token) {
        setProblem(true);
        setMessage("This invite link is missing its secure code. Open the link from your invite email again.");
        return;
      }
      try {
        const response = await fetch(`/api/invite-link?token=${encodeURIComponent(token)}`);
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || "Unable to check this invite link.");
        if (!isMounted) return;
        setDetails(payload as InviteDetails);
        setMessage("Your invite is ready. Select the button below to continue.");
      } catch (error) {
        if (!isMounted) return;
        setProblem(true);
        setMessage(error instanceof Error ? error.message : "Unable to check this invite link.");
      }
    }

    void loadDetails();
    return () => {
      isMounted = false;
    };
  }, [token]);

  async function continueToSetup() {
    setContinuing(true);
    setMessage("Preparing your secure sign-in...");
    try {
      const response = await fetch("/api/invite-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.url) throw new Error(payload?.error || "Unable to continue.");
      window.location.assign(payload.url as string);
    } catch (error) {
      setProblem(true);
      setContinuing(false);
      setMessage(error instanceof Error ? error.message : "Unable to continue.");
    }
  }

  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <div style={headerStyle}>
          <Image src="/enshore-primary-logo-colour.svg" alt="Enshore" width={180} height={90} style={{ width: "180px", height: "auto", objectFit: "contain" }} />
          <div>
            <div style={eyebrowStyle}>Integrated Management System</div>
            <h1 style={titleStyle}>Set up your IMS access</h1>
          </div>
        </div>

        <div style={statusStyle}>{message}</div>

        {details && !problem ? (
          <div style={contentStyle}>
            <div style={summaryItemStyle}>
              <span style={summaryLabelStyle}>Invite for</span>
              <strong>{details.name || "Enshore team member"}</strong>
              <span style={mutedStyle}>{details.maskedEmail}</span>
            </div>
            <button type="button" style={{ ...buttonStyle, opacity: continuing ? 0.6 : 1, cursor: continuing ? "not-allowed" : "pointer" }} onClick={() => void continueToSetup()} disabled={continuing}>
              {continuing ? "Please wait..." : "Set up my IMS access"}
            </button>
            <p style={mutedStyle}>You will be taken to a page to create your password. After that you can sign in at any time.</p>
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<main style={pageStyle}>Checking your invite...</main>}>
      <InviteContent />
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
  width: "min(640px, 100%)",
  background: "#ffffff",
  border: "1px solid #D0D0CE",
  borderRadius: "22px",
  boxShadow: "0 12px 34px rgba(15, 23, 42, 0.1)",
  padding: "24px",
  display: "grid",
  gap: "18px",
  boxSizing: "border-box",
};

const headerStyle: CSSProperties = { display: "grid", gridTemplateColumns: "auto minmax(0, 1fr)", gap: "20px", alignItems: "center" };
const eyebrowStyle: CSSProperties = { fontSize: "12px", fontWeight: 800, color: "#005670", letterSpacing: "0.08em", textTransform: "uppercase" };
const titleStyle: CSSProperties = { margin: "4px 0", color: "#000000", fontSize: "30px", lineHeight: 1.1 };
const statusStyle: CSSProperties = { border: "1px solid #D0D0CE", borderRadius: "14px", padding: "13px 15px", color: "#000000", background: "#ECECE7", lineHeight: 1.5 };
const contentStyle: CSSProperties = { display: "grid", gap: "16px" };
const summaryItemStyle: CSSProperties = { border: "1px solid #D0D0CE", background: "#ECECE7", borderRadius: "14px", padding: "13px", display: "grid", gap: "5px" };
const summaryLabelStyle: CSSProperties = { color: "#53565A", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em" };
const mutedStyle: CSSProperties = { margin: 0, color: "#53565A", fontSize: "13px", lineHeight: 1.5 };
const buttonStyle: CSSProperties = { border: "none", borderRadius: "12px", background: "#005670", color: "#ffffff", fontWeight: 800, fontSize: "15px", padding: "14px 18px", justifySelf: "start", minHeight: "44px" };

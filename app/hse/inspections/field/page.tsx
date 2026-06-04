"use client";

import type { CSSProperties } from "react";
import Link from "next/link";

const inspectionTemplates = [
  { id: "vessel-pre-sail", number: "ENS-HSEQ-FRM-046", title: "Vessel Pre-Sail Inspection", ready: false },
  { id: "workplace-office", number: "ENS-HSEQ-FRM-041", title: "Workplace Inspection - Office", ready: true },
  { id: "workplace-offshore", number: "ENS-HSEQ-FRM-042", title: "Workplace Inspection - Offshore", ready: false },
  { id: "workplace-mobilisation", number: "ENS-HSEQ-FRM-043", title: "Workplace Inspection - Mobilisation", ready: false },
  { id: "workplace-base-site", number: "ENS-HSEQ-FRM-044", title: "Workplace Inspection - Base and Site", ready: true },
  { id: "dropped-objects", number: "ENS-HSEQ-FRM-045", title: "Workplace Inspection - Dropped Objects", ready: false },
];

export default function HseInspectionFieldPage() {
  return (
    <main style={pageWrapStyle}>
      <section style={shellStyle}>
        <div style={brandBarStyle}>HSE Field Inspection</div>
        <section style={summaryCardStyle}>
          <div style={eyebrowStyle}>Inspection Type</div>
          <h1 style={titleStyle}>Choose Inspection</h1>
          <p style={introStyle}>Select the inspection form you want to carry out. FRM-041 and FRM-044 are live, with the remaining forms queued for rollout.</p>
        </section>

        <section style={templateListStyle}>
          {inspectionTemplates.map((template) => (
            template.ready ? (
              <Link key={template.id} href={`/hse/inspections?view=create&type=${template.id}`} style={templateCardStyle}>
                <span style={docNumberStyle}>{template.number}</span>
                <strong>{template.title}</strong>
                <span style={readyPillStyle}>Ready</span>
              </Link>
            ) : (
              <div key={template.id} style={{ ...templateCardStyle, opacity: 0.72 }}>
                <span style={docNumberStyle}>{template.number}</span>
                <strong>{template.title}</strong>
                <span style={queuedPillStyle}>Queued</span>
              </div>
            )
          ))}
        </section>

        <Link href="/hse/inspections" style={backLinkStyle}>Back to HSE Inspections</Link>
      </section>
    </main>
  );
}

const pageWrapStyle: CSSProperties = {
  width: "100%",
  padding: "20px 16px 32px",
  display: "flex",
  justifyContent: "center",
};

const shellStyle: CSSProperties = {
  width: "100%",
  maxWidth: "460px",
  display: "grid",
  gap: "14px",
};

const brandBarStyle: CSSProperties = {
  background: "linear-gradient(135deg, #0f766e 0%, #115e59 100%)",
  color: "#ffffff",
  borderRadius: "18px",
  padding: "14px 18px",
  fontSize: "14px",
  fontWeight: 800,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  boxShadow: "0 16px 28px rgba(15, 118, 110, 0.18)",
};

const summaryCardStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe7f3",
  borderRadius: "18px",
  padding: "18px",
  display: "grid",
  gap: "10px",
  boxShadow: "0 14px 28px rgba(15, 23, 42, 0.06)",
};

const eyebrowStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 800,
  color: "#0f766e",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: "28px",
  lineHeight: 1.15,
  fontWeight: 800,
  color: "#0f172a",
};

const introStyle: CSSProperties = {
  margin: 0,
  color: "#475569",
  fontSize: "14px",
  lineHeight: 1.45,
};

const templateListStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
};

const templateCardStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe7f3",
  borderRadius: "16px",
  padding: "16px",
  display: "grid",
  gap: "8px",
  textDecoration: "none",
  color: "#0f172a",
  boxShadow: "0 10px 22px rgba(15, 23, 42, 0.05)",
};

const docNumberStyle: CSSProperties = {
  color: "#0f766e",
  fontWeight: 900,
  fontSize: "12px",
  letterSpacing: "0.04em",
};

const readyPillStyle: CSSProperties = {
  width: "fit-content",
  background: "#dcfce7",
  color: "#166534",
  borderRadius: "999px",
  padding: "6px 10px",
  fontWeight: 800,
  fontSize: "12px",
};

const queuedPillStyle: CSSProperties = {
  width: "fit-content",
  background: "#e2e8f0",
  color: "#475569",
  borderRadius: "999px",
  padding: "6px 10px",
  fontWeight: 800,
  fontSize: "12px",
};

const backLinkStyle: CSSProperties = {
  color: "#0f766e",
  fontWeight: 800,
  textDecoration: "none",
  textAlign: "center",
  padding: "10px",
};

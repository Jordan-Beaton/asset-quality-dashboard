import type { CSSProperties } from "react";

export default function AssetDashboardPlaceholderPage() {
  return (
    <main style={pageStyle}>
      <section style={heroStyle}>
        <div style={eyebrowStyle}>Asset Management</div>
        <h1 style={titleStyle}>Asset Management Dashboard</h1>
        <p style={subtitleStyle}>
          Dashboard under development. Use the Assets register for the active operational view.
        </p>
      </section>
    </main>
  );
}

const pageStyle: CSSProperties = {
  display: "grid",
  gap: "20px",
};

const heroStyle: CSSProperties = {
  borderRadius: "24px",
  background: "#ffffff",
  border: "1px solid #dbe7f3",
  boxShadow: "0 16px 28px rgba(15, 23, 42, 0.08)",
  padding: "28px",
};

const eyebrowStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#2563eb",
};

const titleStyle: CSSProperties = {
  margin: "8px 0 0",
  fontSize: "32px",
  lineHeight: 1.08,
  letterSpacing: "-0.03em",
  color: "#0f172a",
};

const subtitleStyle: CSSProperties = {
  margin: "12px 0 0",
  maxWidth: "640px",
  fontSize: "14px",
  lineHeight: 1.7,
  color: "#475569",
};

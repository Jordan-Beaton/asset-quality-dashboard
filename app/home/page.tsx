import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

const moduleCards = [
  {
    title: "Quality Management",
    description: "NCR/CAPA, Audits, Documents, MOC, Reports, and quality workflow controls.",
    href: "/",
    status: "Active",
    accent: "#0f766e",
    cta: "Open Quality",
  },
  {
    title: "HSE Management",
    description: "Coming soon. This area will expand into wider HSE workflow and reporting.",
    href: "",
    status: "Coming Soon",
    accent: "#475569",
    cta: "Coming Soon",
  },
  {
    title: "Asset Management",
    description: "Asset register, calibration records, inspection controls, and supporting files.",
    href: "/assets",
    status: "Available",
    accent: "#2563eb",
    cta: "Open Assets",
  },
  {
    title: "Risk Management",
    description: "Risk register, reviews, controls, opportunities, actions, and risk reporting.",
    href: "/risk",
    status: "Available",
    accent: "#7c3aed",
    cta: "Open Risk",
  },
  {
    title: "Action Management",
    description: "Central action register for Quality, Assets, Risk, MOC, HSE, audits, owners, and evidence.",
    href: "/actions",
    status: "Available",
    accent: "#2563eb",
    cta: "Open Actions",
  },
  {
    title: "People Management",
    description:
      "Shared personnel directory for originators, reviewers, approvers, owners, and asset-assigned people.",
    href: "/people",
    status: "Available",
    accent: "#0f766e",
    cta: "Open People",
  },
] as const;

export default function HomePage() {
  return (
    <main style={pageStyle}>
      <section style={heroStyle}>
        <div style={heroBrandRowStyle}>
          <Image
            src="/enshore-logo.png"
            alt="Enshore"
            width={156}
            height={40}
            priority
            style={{ width: "156px", height: "auto", objectFit: "contain" }}
          />
          <div style={heroBrandTextWrapStyle}>
            <div style={eyebrowStyle}>Module Selection</div>
            <h1 style={heroTitleStyle}>Choose a Management Area</h1>
            <p style={heroSubtitleStyle}>
              Start in the active Quality system now, while HSE and broader platform areas are
              phased in safely.
            </p>
          </div>
        </div>
      </section>

      <section style={gridStyle}>
        {moduleCards.map((card) => {
          const content = (
            <div
              style={{
                ...cardStyle,
                borderTop: `4px solid ${card.accent}`,
                opacity: card.href ? 1 : 0.82,
              }}
            >
              <div style={cardTopStyle}>
                <span
                  style={{
                    ...statusPillStyle,
                    background: card.href ? "rgba(15,118,110,0.10)" : "rgba(71,85,105,0.10)",
                    color: card.href ? "#0f766e" : "#475569",
                  }}
                >
                  {card.status}
                </span>
              </div>

              <div style={cardContentStackStyle}>
                <div style={cardTitleWrapStyle}>
                  <div style={cardTitleStyle}>{card.title}</div>
                </div>
                <div style={cardDescriptionWrapStyle}>
                  <p style={cardDescriptionStyle}>{card.description}</p>
                </div>
              </div>

              <div style={cardActionRowStyle}>
                <span
                  style={{
                    ...ctaStyle,
                    color: card.href ? card.accent : "#64748b",
                    borderColor: card.href ? "rgba(15,118,110,0.16)" : "#cbd5e1",
                    background: card.href ? "#f8fffd" : "#f8fafc",
                  }}
                >
                  {card.cta}
                </span>
              </div>
            </div>
          );

          return card.href ? (
            <Link key={card.title} href={card.href} style={cardShellStyle}>
              {content}
            </Link>
          ) : (
            <div key={card.title} style={cardShellStyle}>
              {content}
            </div>
          );
        })}
      </section>
    </main>
  );
}

const pageStyle: CSSProperties = {
  display: "grid",
  gap: "24px",
};

const heroStyle: CSSProperties = {
  borderRadius: "28px",
  background: "linear-gradient(135deg, #0f766e 0%, #0f172a 88%)",
  padding: "28px",
  boxShadow: "0 24px 40px rgba(15, 23, 42, 0.12)",
};

const heroBrandRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "18px",
  flexWrap: "wrap",
};

const heroBrandTextWrapStyle: CSSProperties = {
  display: "grid",
  gap: "6px",
  minWidth: 0,
};

const eyebrowStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.72)",
};

const heroTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "34px",
  lineHeight: 1.05,
  letterSpacing: "-0.03em",
  color: "#ffffff",
};

const heroSubtitleStyle: CSSProperties = {
  margin: 0,
  maxWidth: "720px",
  fontSize: "14.5px",
  lineHeight: 1.65,
  color: "rgba(255,255,255,0.84)",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "18px",
};

const cardShellStyle: CSSProperties = {
  display: "flex",
  height: "100%",
  textDecoration: "none",
};

const cardStyle: CSSProperties = {
  minHeight: "240px",
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  padding: "22px",
  borderRadius: "24px",
  background: "#ffffff",
  border: "1px solid #dbe7f3",
  boxShadow: "0 16px 28px rgba(15, 23, 42, 0.08)",
};

const cardContentStackStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
  flex: 1,
};

const cardTopStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const cardTitleWrapStyle: CSSProperties = {
  minHeight: "58px",
  display: "flex",
  alignItems: "flex-start",
};

const cardDescriptionWrapStyle: CSSProperties = {
  minHeight: "72px",
};

const statusPillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "11px",
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const cardTitleStyle: CSSProperties = {
  fontSize: "24px",
  fontWeight: 800,
  color: "#0f172a",
  letterSpacing: "-0.02em",
};

const cardDescriptionStyle: CSSProperties = {
  margin: 0,
  fontSize: "14px",
  lineHeight: 1.65,
  color: "#475569",
};

const cardActionRowStyle: CSSProperties = {
  marginTop: "auto",
  paddingTop: "4px",
};

const ctaStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: "12px",
  border: "1px solid transparent",
  padding: "10px 14px",
  fontSize: "13px",
  fontWeight: 700,
};

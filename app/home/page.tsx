"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useImsPermissions } from "../../src/components/ImsPermissions";

const moduleCards = [
  {
    title: "Quality Management",
    short: "Quality",
    icon: "quality",
    description: "NCR, audits, MOC, reporting, and HSEQ workflow control.",
    href: "/quality",
    moduleKey: "quality",
    status: "Live",
    group: "Core IMS",
    cta: "Enter",
  },
  {
    title: "HSE Management",
    short: "HSE",
    icon: "hse",
    description: "AINM, inspections, evidence capture, HSE actions, and report packs.",
    href: "/hse",
    moduleKey: "hse",
    status: "Live",
    group: "Operations",
    cta: "Enter",
  },
  {
    title: "Asset Management",
    short: "Assets",
    icon: "assets",
    description: "Asset register, calibration, inspection, maintenance, and linked actions.",
    href: "/assets",
    moduleKey: "assets",
    status: "Live",
    group: "Operations",
    cta: "Enter",
  },
  {
    title: "Document Control",
    short: "Docs",
    icon: "documents",
    description: "Controlled files, register status, reviews, approvals, archive, and reports.",
    href: "/documents",
    moduleKey: "documents",
    status: "Live",
    group: "Control",
    cta: "Open",
  },
  {
    title: "Action Management",
    short: "Actions",
    icon: "actions",
    description: "Central follow-up register linking Quality, HSE, Assets, Risk, MOC, and evidence.",
    href: "/actions",
    moduleKey: "actions",
    status: "Live",
    group: "Control",
    cta: "Open",
  },
  {
    title: "Risk Management",
    short: "Risk",
    icon: "risk",
    description: "Risk register foundation, reviews, controls, opportunities, and reporting shell.",
    href: "/risk",
    moduleKey: "risk",
    status: "Ready",
    group: "Governance",
    cta: "Open",
  },
  {
    title: "Management Review",
    short: "Review",
    icon: "review",
    description: "Read-only management pack view across system health, actions, risk, documents, and assets.",
    href: "/management-review",
    moduleKey: "management-review",
    status: "Ready",
    group: "Governance",
    cta: "Review",
  },
  {
    title: "People Management",
    short: "People",
    icon: "people",
    description: "Shared people source for owners, inspectors, originators, reviewers, approvers, and roles.",
    href: "/people",
    moduleKey: "people",
    status: "Ready",
    group: "Master Data",
    cta: "Open",
  },
  {
    title: "Admin / Settings",
    short: "Admin",
    icon: "admin",
    description: "System configuration shell for master data, roles, numbering, and module settings.",
    href: "/admin",
    moduleKey: "admin",
    status: "Shell",
    group: "Master Data",
    cta: "Configure",
  },
] as const;

const orbitLabels = ["Quality", "HSE", "Assets", "Documents", "Actions", "Risk"] as const;
type ModuleIcon = (typeof moduleCards)[number]["icon"];

function ModuleIconGlyph({ icon }: { icon: ModuleIcon }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (icon === "quality") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" style={iconSvgStyle}>
        <path {...common} d="M8 4h8l1 3h2v13H5V7h2z" />
        <path {...common} d="m8.5 13 2.2 2.2 4.8-5" />
      </svg>
    );
  }

  if (icon === "hse") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" style={iconSvgStyle}>
        <path {...common} d="M12 3 20 6v6c0 5-3.4 7.7-8 9-4.6-1.3-8-4-8-9V6z" />
        <path {...common} d="M12 8v7M8.5 11.5h7" />
      </svg>
    );
  }

  if (icon === "assets") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" style={iconSvgStyle}>
        <path {...common} d="M12 3 4.5 7.2v8.6L12 20l7.5-4.2V7.2z" />
        <path {...common} d="M4.8 7.4 12 11.5l7.2-4.1M12 11.5V20" />
      </svg>
    );
  }

  if (icon === "documents") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" style={iconSvgStyle}>
        <path {...common} d="M7 3h7l4 4v14H7z" />
        <path {...common} d="M14 3v5h5M9.5 12h6M9.5 16h6" />
      </svg>
    );
  }

  if (icon === "actions") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" style={iconSvgStyle}>
        <path {...common} d="M4 6h12M4 12h9M4 18h7" />
        <path {...common} d="m16 15 2 2 3-4" />
      </svg>
    );
  }

  if (icon === "risk") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" style={iconSvgStyle}>
        <path {...common} d="M12 3 21 20H3z" />
        <path {...common} d="M12 9v5M12 17h.01" />
      </svg>
    );
  }

  if (icon === "review") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" style={iconSvgStyle}>
        <path {...common} d="M4 19V5M4 19h16" />
        <path {...common} d="M8 15v-4M12 15V8M16 15v-6" />
      </svg>
    );
  }

  if (icon === "people") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" style={iconSvgStyle}>
        <path {...common} d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
        <path {...common} d="M3.5 20a5 5 0 0 1 9 0M13.5 19a4 4 0 0 1 7 0" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={iconSvgStyle}>
      <path {...common} d="M5 7h14M5 12h14M5 17h14" />
      <path {...common} d="M9 7v0M15 12v0M11 17v0" />
    </svg>
  );
}

export default function HomePage() {
  const permissions = useImsPermissions();
  const isModuleAccessible = (moduleKey: (typeof moduleCards)[number]["moduleKey"]) => {
    if (!permissions.loaded) return true;
    if (moduleKey === "management-review") {
      return (
        permissions.canAccessModule("quality") ||
        permissions.canAccessModule("hse") ||
        permissions.canAccessModule("documents") ||
        permissions.canAccessModule("assets") ||
        permissions.canAccessModule("risk")
      );
    }
    return permissions.canAccessModule(moduleKey);
  };

  return (
    <main style={pageStyle}>
      <style>
        {`
          @keyframes imsOrbitSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          @keyframes imsOrbitCounterSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(-360deg); }
          }

          .home-module-card {
            transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
          }

          .home-module-card:hover {
            transform: translateY(-6px) scale(1.025);
            box-shadow: 0 22px 38px rgba(15, 23, 42, 0.13);
            border-color: #BFE5E3;
          }

        `}
      </style>
      <section style={heroStyle}>
        <div style={heroCopyStyle}>
          <div style={eyebrowStyle}>Enshore IMS Hub</div>
          <h1 style={heroTitleStyle}>Your IMS command hub.</h1>
          <p style={heroSubtitleStyle}>
            Navigate the management system from one connected workspace. Each module feeds the
            same operational picture without feeling like a separate system.
          </p>
        </div>

        <div style={orbitStyle} aria-hidden="true">
          <div style={orbitRingOuterStyle} />
          <div style={orbitRingInnerStyle} />
          <div style={orbitCoreStyle}>
            <span style={orbitCoreLabelStyle}>IMS</span>
            <span style={orbitCoreSubStyle}>Connected</span>
          </div>
          <div style={orbitSpinLayerStyle}>
            {orbitLabels.map((label, index) => {
              const angle = (index / orbitLabels.length) * Math.PI * 2 - Math.PI / 2;
              const radius = 122;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              return (
                <span
                  key={label}
                  style={{
                    ...orbitNodePositionStyle,
                    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                  }}
                >
                  <span style={orbitNodeTextStyle}>
                    <span style={orbitNodeStyle}>{label}</span>
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      </section>

      <section style={commandSurfaceStyle} aria-label="Management modules">
        <div style={surfaceHeaderStyle}>
          <div>
            <div style={surfaceEyebrowStyle}>Workspace Map</div>
            <h2 style={surfaceTitleStyle}>Management Areas</h2>
          </div>
          <p style={surfaceHintStyle}>Select a module tile to enter the live workspace.</p>
        </div>

        <div style={moduleGridStyle}>
          {moduleCards.map((card) => {
            const hasAccess = isModuleAccessible(card.moduleKey);
            const status = hasAccess ? card.status : "No Access";
            const shellStyle = {
              ...cardShellStyle,
              cursor: hasAccess ? "pointer" : "not-allowed",
            };
            const cardContent = (
              <article
                className={hasAccess ? "home-module-card" : undefined}
                style={{
                  ...cardStyle,
                  opacity: hasAccess ? 1 : 0.64,
                  filter: hasAccess ? "none" : "grayscale(0.18)",
                }}
              >
                <span aria-hidden="true" style={cardGlowStyle} />
                <div style={cardTopLineStyle}>
                  <span style={moduleIconStyle}>
                    <ModuleIconGlyph icon={card.icon} />
                  </span>
                  <span
                    style={{
                      ...statusPillStyle,
                      background: hasAccess
                        ? card.status === "Shell"
                          ? "#eef2f6"
                          : "#DFF5F3"
                        : "#fee2e2",
                      color: hasAccess
                        ? card.status === "Shell"
                          ? "#475569"
                          : "#2F7F7D"
                        : "#991b1b",
                    }}
                  >
                    {status}
                  </span>
                </div>

                <div style={cardBodyStyle}>
                  <div>
                    <div style={groupStyle}>{card.group}</div>
                    <h3 style={cardTitleStyle}>{card.title}</h3>
                  </div>
                  <p style={cardDescriptionStyle}>{card.description}</p>
                </div>

                <div style={cardFooterStyle}>
                  <span
                    style={{
                      ...cardShortStyle,
                      color: hasAccess ? "#2F7F7D" : "#64748b",
                    }}
                  >
                    <span
                      style={{
                        ...connectorDotStyle,
                        background: hasAccess ? "#3A9B98" : "#94a3b8",
                        boxShadow: hasAccess ? "0 0 0 5px rgba(58,155,152,0.12)" : "none",
                      }}
                    />
                    {card.short}
                  </span>
                  <span
                    style={{
                      ...ctaStyle,
                      background: hasAccess ? "#EEF8F7" : "#eef2f6",
                      color: hasAccess ? "#2F7F7D" : "#64748b",
                    }}
                  >
                    {hasAccess ? card.cta : "Restricted"}
                  </span>
                </div>
              </article>
            );

            if (!hasAccess) {
              return (
                <div
                  key={card.title}
                  style={shellStyle}
                  aria-disabled="true"
                  title="No access assigned for this module."
                >
                  {cardContent}
                </div>
              );
            }

            return (
              <Link key={card.title} href={card.href} style={shellStyle}>
                {cardContent}
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}

const pageStyle: CSSProperties = {
  display: "grid",
  gap: "22px",
};

const heroStyle: CSSProperties = {
  position: "relative",
  minHeight: "286px",
  borderRadius: "24px",
  padding: "34px",
  boxSizing: "border-box",
  overflow: "hidden",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 360px",
  gap: "28px",
  alignItems: "center",
  background:
    "radial-gradient(circle at 82% 42%, rgba(255,255,255,0.23), transparent 0 15%, transparent 34%), linear-gradient(135deg, #3A9B98 0%, #2F7F7D 48%, #111827 128%)",
  color: "#ffffff",
  boxShadow: "0 22px 44px rgba(15, 23, 42, 0.14)",
};

const heroCopyStyle: CSSProperties = {
  maxWidth: "780px",
  position: "relative",
  zIndex: 2,
};

const eyebrowStyle: CSSProperties = {
  color: "rgba(255,255,255,0.78)",
  fontSize: "13px",
  fontWeight: 900,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  marginBottom: "14px",
};

const heroTitleStyle: CSSProperties = {
  margin: 0,
  maxWidth: "760px",
  fontSize: "50px",
  lineHeight: 1,
  letterSpacing: "-0.03em",
};

const heroSubtitleStyle: CSSProperties = {
  margin: "18px 0 0",
  maxWidth: "700px",
  color: "rgba(255,255,255,0.9)",
  fontSize: "17px",
  lineHeight: 1.62,
};

const orbitStyle: CSSProperties = {
  position: "relative",
  width: "320px",
  height: "260px",
  justifySelf: "end",
};

const orbitRingOuterStyle: CSSProperties = {
  position: "absolute",
  inset: "0",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.24)",
  boxShadow: "inset 0 0 48px rgba(255,255,255,0.08)",
};

const orbitRingInnerStyle: CSSProperties = {
  position: "absolute",
  inset: "52px 62px",
  borderRadius: "999px",
  border: "1px dashed rgba(255,255,255,0.28)",
};

const orbitCoreStyle: CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "50%",
  transform: "translate(-50%, -50%)",
  width: "122px",
  height: "122px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.16)",
  border: "1px solid rgba(255,255,255,0.26)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  backdropFilter: "blur(14px)",
};

const orbitCoreLabelStyle: CSSProperties = {
  fontSize: "30px",
  fontWeight: 900,
  letterSpacing: "-0.03em",
};

const orbitCoreSubStyle: CSSProperties = {
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.72)",
};

const orbitSpinLayerStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  transformOrigin: "50% 50%",
  animation: "imsOrbitSpin 28s linear infinite",
};

const orbitNodePositionStyle: CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "50%",
};

const orbitNodeTextStyle: CSSProperties = {
  display: "inline-flex",
  animation: "imsOrbitCounterSpin 28s linear infinite",
};

const orbitNodeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "72px",
  minHeight: "34px",
  padding: "6px 10px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.16)",
  border: "1px solid rgba(255,255,255,0.24)",
  color: "#ffffff",
  fontSize: "11px",
  fontWeight: 900,
  backdropFilter: "blur(10px)",
};

const commandSurfaceStyle: CSSProperties = {
  borderRadius: "24px",
  border: "1px solid #dbe7f3",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,251,252,0.98) 100%), linear-gradient(90deg, rgba(58,155,152,0.08) 1px, transparent 1px)",
  backgroundSize: "auto, 36px 36px",
  padding: "20px",
  boxShadow: "0 16px 34px rgba(15, 23, 42, 0.08)",
};


const surfaceHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: "18px",
  marginBottom: "16px",
  flexWrap: "wrap",
};

const surfaceEyebrowStyle: CSSProperties = {
  color: "#3A9B98",
  fontSize: "12px",
  fontWeight: 900,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const surfaceTitleStyle: CSSProperties = {
  margin: "4px 0 0",
  color: "#0f172a",
  fontSize: "26px",
  lineHeight: 1.12,
};

const surfaceHintStyle: CSSProperties = {
  margin: 0,
  maxWidth: "460px",
  color: "#64748b",
  fontSize: "13px",
  lineHeight: 1.5,
};

const moduleGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(255px, 1fr))",
  gap: "14px",
};

const cardShellStyle: CSSProperties = {
  display: "flex",
  minWidth: 0,
  textDecoration: "none",
};

const cardStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  minHeight: "214px",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  padding: "18px",
  borderRadius: "18px",
  background: "linear-gradient(180deg, #ffffff 0%, #f9fcfd 100%)",
  border: "1px solid #d7e6ee",
  boxShadow: "0 10px 22px rgba(15, 23, 42, 0.055)",
  boxSizing: "border-box",
  overflow: "hidden",
};

const cardGlowStyle: CSSProperties = {
  position: "absolute",
  top: "-46px",
  right: "-42px",
  width: "110px",
  height: "110px",
  borderRadius: "999px",
  background: "radial-gradient(circle, rgba(58,155,152,0.18), transparent 66%)",
  pointerEvents: "none",
};

const cardTopLineStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
};

const moduleIconStyle: CSSProperties = {
  width: "42px",
  height: "42px",
  borderRadius: "14px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#EEF8F7",
  border: "1px solid #BFE5E3",
  color: "#2F7F7D",
};

const iconSvgStyle: CSSProperties = {
  width: "22px",
  height: "22px",
};

const statusPillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const cardBodyStyle: CSSProperties = {
  display: "grid",
  gap: "11px",
  flex: 1,
};

const groupStyle: CSSProperties = {
  color: "#64748b",
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  marginBottom: "7px",
};

const cardTitleStyle: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: "22px",
  lineHeight: 1.14,
};

const cardDescriptionStyle: CSSProperties = {
  margin: 0,
  color: "#475569",
  fontSize: "14px",
  lineHeight: 1.55,
};

const cardFooterStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  borderTop: "1px solid #edf2f7",
  paddingTop: "13px",
};

const cardShortStyle: CSSProperties = {
  color: "#2F7F7D",
  fontSize: "13px",
  fontWeight: 900,
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
};

const connectorDotStyle: CSSProperties = {
  width: "9px",
  height: "9px",
  borderRadius: "999px",
  background: "#3A9B98",
  boxShadow: "0 0 0 5px rgba(58,155,152,0.12)",
};

const ctaStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "34px",
  borderRadius: "10px",
  padding: "8px 12px",
  background: "#EEF8F7",
  color: "#2F7F7D",
  fontSize: "12px",
  fontWeight: 900,
  whiteSpace: "nowrap",
};

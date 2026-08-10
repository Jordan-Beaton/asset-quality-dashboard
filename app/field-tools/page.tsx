"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ImsTopMetaRow } from "../../src/components/ImsPrimitives";
import { useImsPermissions } from "../../src/components/ImsPermissions";
import { QualityPageHero } from "../../src/components/QualityPageHero";

type FieldTool = {
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
  note?: string;
};

const hseTools: FieldTool[] = [
  {
    title: "Site Inspection",
    description: "Complete an HSE inspection and add evidence.",
    href: "/hse/inspections/field",
    icon: <ClipboardIcon />,
  },
  {
    title: "Report an Incident",
    description: "Raise or continue an AINM notification.",
    href: "/hse/ainm/field",
    icon: <AlertIcon />,
  },
  {
    title: "Observation Card",
    description: "Submit a safety observation quickly.",
    href: "/observe",
    icon: <ObservationIcon />,
    note: "No sign-in required",
  },
];

const assetTools: FieldTool[] = [
  {
    title: "Asset Inspection",
    description: "Choose an asset and record an inspection.",
    href: "/assets/inspection/field",
    icon: <ClipboardIcon />,
  },
  {
    title: "Asset Maintenance",
    description: "Choose an asset and record maintenance.",
    href: "/assets/maintenance/field",
    icon: <ToolIcon />,
  },
];

export default function FieldToolsPage() {
  const permissions = useImsPermissions();
  const showHse = !permissions.loaded || permissions.canAccessModule("hse");
  const showAssets = !permissions.loaded || permissions.canAccessModule("assets");

  return (
    <main style={pageStyle}>
      <style>{`
        .field-tools-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 14px; }
        .field-tool-link { transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease; }
        .field-tool-link:hover { transform: translateY(-3px); border-color: #63B1BC !important; box-shadow: 0 14px 28px rgba(15,23,42,.075); }
        .field-tool-link:focus-visible { outline: 3px solid rgba(99,177,188,.45); outline-offset: 3px; }
        @media (max-width: 620px) {
          .field-tools-grid { grid-template-columns: 1fr; }
          .field-tool-link { min-height: 112px !important; padding: 16px !important; }
        }
      `}</style>

      <QualityPageHero label="IMS" title="Field Tools" description="Mobile field access" />
      <ImsTopMetaRow backHref="/home" backLabel="Back to IMS Home" status="Choose a field task" />

      <section style={introStyle}>
        <div style={introIconStyle}><PhoneIcon /></div>
        <div>
          <h2 style={introTitleStyle}>What do you need to do?</h2>
          <p style={introTextStyle}>Select a task below. Each tool is designed for quick use on a phone.</p>
        </div>
      </section>

      {showHse ? <ToolSection title="HSE" tools={hseTools} /> : null}
      {showAssets ? <ToolSection title="Assets" tools={assetTools} /> : null}

      {!showHse && !showAssets ? (
        <section style={emptyStyle}>
          <strong>No field tools are assigned to your account.</strong>
          <span>Ask an IMS administrator to review your HSE or Asset permissions.</span>
        </section>
      ) : null}
    </main>
  );
}

function ToolSection({ title, tools }: { title: string; tools: FieldTool[] }) {
  return (
    <section style={sectionStyle}>
      <h2 style={sectionTitleStyle}>{title}</h2>
      <div className="field-tools-grid">
        {tools.map((tool) => (
          <Link key={tool.href} href={tool.href} className="field-tool-link" style={toolCardStyle}>
            <span style={toolIconStyle}>{tool.icon}</span>
            <span style={toolCopyStyle}>
              <span style={toolTitleStyle}>{tool.title}</span>
              <span style={toolDescriptionStyle}>{tool.description}</span>
              {tool.note ? <span style={noteStyle}>{tool.note}</span> : null}
            </span>
            <span aria-hidden="true" style={arrowStyle}>→</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

const iconProps = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const iconStyle: CSSProperties = { width: 27, height: 27 };

function PhoneIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true" style={iconStyle}><rect {...iconProps} x="7" y="2.5" width="10" height="19" rx="2" /><path {...iconProps} d="M10 6h4M10 17h4" /></svg>; }
function ClipboardIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true" style={iconStyle}><path {...iconProps} d="M8 4h8l1 3h2v14H5V7h2z" /><path {...iconProps} d="m8.5 14 2 2 5-6" /></svg>; }
function AlertIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true" style={iconStyle}><path {...iconProps} d="M12 3 21 20H3zM12 9v5M12 17h.01" /></svg>; }
function ObservationIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true" style={iconStyle}><path {...iconProps} d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" /><circle {...iconProps} cx="12" cy="12" r="2.5" /></svg>; }
function ToolIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true" style={iconStyle}><path {...iconProps} d="M14 6a4 4 0 0 0-5 5L3.5 16.5l4 4L13 15a4 4 0 0 0 5-5l-3 2-3-3z" /></svg>; }

const pageStyle: CSSProperties = { display: "grid", gap: 20 };
const introStyle: CSSProperties = { display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", border: "1px solid #dbe7f3", borderRadius: 18, background: "#ffffff" };
const introIconStyle: CSSProperties = { flex: "0 0 auto", width: 48, height: 48, borderRadius: 14, display: "grid", placeItems: "center", background: "#ECECE7", color: "#005670" };
const introTitleStyle: CSSProperties = { margin: "0 0 4px", color: "#000000", fontSize: 19, fontWeight: 800 };
const introTextStyle: CSSProperties = { margin: 0, color: "#53565A", fontSize: 14, lineHeight: 1.45 };
const sectionStyle: CSSProperties = { padding: 18, border: "1px solid #dbe7f3", borderRadius: 18, background: "#ffffff", boxShadow: "0 1px 3px rgba(15,23,42,.08)" };
const sectionTitleStyle: CSSProperties = { margin: "0 0 14px", color: "#005670", fontSize: 17, fontWeight: 900 };
const toolCardStyle: CSSProperties = { minHeight: 126, padding: 18, boxSizing: "border-box", display: "grid", gridTemplateColumns: "48px minmax(0, 1fr) 22px", gap: 13, alignItems: "center", color: "inherit", textDecoration: "none", background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)", border: "1px solid #D0D0CE", borderRadius: 16 };
const toolIconStyle: CSSProperties = { width: 48, height: 48, display: "grid", placeItems: "center", borderRadius: 14, background: "#005670", color: "#ffffff" };
const toolCopyStyle: CSSProperties = { minWidth: 0, display: "grid", gap: 5 };
const toolTitleStyle: CSSProperties = { color: "#000000", fontSize: 17, fontWeight: 900 };
const toolDescriptionStyle: CSSProperties = { color: "#53565A", fontSize: 13, lineHeight: 1.4 };
const noteStyle: CSSProperties = { width: "fit-content", marginTop: 2, padding: "4px 8px", borderRadius: 999, color: "#005670", background: "#ECECE7", fontSize: 11, fontWeight: 800 };
const arrowStyle: CSSProperties = { color: "#005670", fontSize: 24, fontWeight: 800 };
const emptyStyle: CSSProperties = { display: "grid", gap: 6, padding: 20, border: "1px solid #D0D0CE", borderRadius: 18, background: "#ffffff", color: "#53565A", fontSize: 14 };

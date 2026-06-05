"use client";

import type { CSSProperties, ReactNode } from "react";
import { imsHeroStyle, imsRadii } from "./imsTheme";

type HeroContextCard = {
  label: string;
  value: ReactNode;
};

type QualityPageHeroProps = {
  label: string;
  title: string;
  description: string;
  contextCards?: HeroContextCard[];
  actions?: ReactNode;
};

const heroStyle: CSSProperties = {
  ...imsHeroStyle,
};

const copyStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  gap: "12px",
  minWidth: 0,
};

const labelStyle: CSSProperties = {
  fontSize: "0.88rem",
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.85)",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: "3.05rem",
  lineHeight: 1.06,
  fontWeight: 500,
  letterSpacing: "-0.03em",
};

const descriptionStyle: CSSProperties = {
  margin: 0,
  maxWidth: "860px",
  fontSize: "0.98rem",
  lineHeight: 1.55,
  color: "rgba(255,255,255,0.96)",
  overflow: "hidden",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
};

const metaGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(160px, 1fr))",
  gap: "12px",
  alignContent: "center",
};

const rightColumnStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
  alignContent: "center",
  minWidth: 0,
};

const actionsWrapStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
};

const metaCardStyle: CSSProperties = {
  height: "88px",
  padding: "16px 18px",
  borderRadius: imsRadii.card,
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.16)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  gap: "10px",
  boxSizing: "border-box",
  backdropFilter: "blur(4px)",
};

const metaLabelStyle: CSSProperties = {
  fontSize: "0.92rem",
  fontWeight: 700,
  color: "rgba(255,255,255,0.84)",
};

const metaValueStyle: CSSProperties = {
  fontSize: "1.05rem",
  lineHeight: 1.35,
  fontWeight: 700,
  color: "#ffffff",
  overflow: "hidden",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  wordBreak: "break-word",
};

export function QualityPageHero({
  label,
  title,
  description,
  contextCards = [],
  actions,
}: QualityPageHeroProps) {
  return (
    <section style={heroStyle}>
      <div style={copyStyle}>
        <div style={labelStyle}>{label}</div>
        <h1 style={titleStyle}>{title}</h1>
        <p style={descriptionStyle}>{description}</p>
      </div>

      <div style={rightColumnStyle}>
        {actions ? <div style={actionsWrapStyle}>{actions}</div> : null}
        {contextCards.length > 0 ? (
          <div style={metaGridStyle}>
            {contextCards.slice(0, 4).map((card) => (
              <div key={card.label} style={metaCardStyle}>
                <div style={metaLabelStyle}>{card.label}</div>
                <div style={metaValueStyle}>{card.value}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

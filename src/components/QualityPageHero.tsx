"use client";

import type { CSSProperties, ReactNode } from "react";
import { imsHeroStyle } from "./imsTheme";

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

const innerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  minWidth: 0,
  width: "100%",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: "1.15rem",
  lineHeight: 1.2,
  fontWeight: 700,
  letterSpacing: "-0.01em",
  whiteSpace: "nowrap",
  color: "#ffffff",
};

export function QualityPageHero({
  title,
}: QualityPageHeroProps) {
  return (
    <section className="ims-page-hero" style={heroStyle}>
      <div style={innerStyle}>
        <h1 className="ims-page-hero-title" style={titleStyle}>{title}</h1>
      </div>
    </section>
  );
}

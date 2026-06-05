"use client";

import type { CSSProperties, ReactNode } from "react";
import { imsColours } from "./imsTheme";

type ModuleSectionHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

const headerStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  flexWrap: "wrap",
  background: imsColours.brand,
  color: "#ffffff",
  borderRadius: "12px",
  padding: "10px 14px",
  marginBottom: "14px",
};

const copyStyle: CSSProperties = {
  minWidth: 0,
  flex: "1 1 220px",
  display: "grid",
  gap: "4px",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: "16px",
  fontWeight: 800,
  lineHeight: 1.2,
  color: "#ffffff",
};

const subtitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "13px",
  lineHeight: 1.4,
  color: "rgba(255, 255, 255, 0.92)",
};

const actionsStyle: CSSProperties = {
  flex: "0 0 auto",
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: "8px",
};

export function ModuleSectionHeader({ title, subtitle, actions }: ModuleSectionHeaderProps) {
  return (
    <div style={headerStyle}>
      <div style={copyStyle}>
        <h2 style={titleStyle}>{title}</h2>
        {subtitle ? <p style={subtitleStyle}>{subtitle}</p> : null}
      </div>
      {actions ? <div style={actionsStyle}>{actions}</div> : null}
    </div>
  );
}

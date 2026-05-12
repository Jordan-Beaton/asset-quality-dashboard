"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

type QualityKpiCardProps = {
  title: string;
  value: ReactNode;
  accent: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
};

const cardShellStyle: CSSProperties = {
  width: "100%",
  minHeight: "92px",
  display: "flex",
};

const cardBaseStyle: CSSProperties = {
  width: "100%",
  minHeight: "92px",
  background: "#ffffff",
  borderRadius: "16px",
  padding: "14px 16px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  gap: "10px",
  textAlign: "left",
  boxSizing: "border-box",
};

const labelStyle: CSSProperties = {
  color: "#64748b",
  fontSize: "12px",
  fontWeight: 700,
  lineHeight: 1.35,
};

const valueStyle: CSSProperties = {
  color: "#0f172a",
  fontSize: "26px",
  fontWeight: 800,
  lineHeight: 1.1,
};

export function QualityKpiCard({
  title,
  value,
  accent,
  href,
  onClick,
  active = false,
}: QualityKpiCardProps) {
  const cardStyle: CSSProperties = {
    ...cardBaseStyle,
    border: active ? "1px solid #0f766e" : cardBaseStyle.border,
    borderTop: `4px solid ${accent}`,
    boxShadow: active ? "0 0 0 2px rgba(15, 118, 110, 0.16)" : cardBaseStyle.boxShadow,
    cursor: href || onClick ? "pointer" : "default",
  };

  const content = (
    <div style={cardStyle}>
      <div style={labelStyle}>{title}</div>
      <div style={valueStyle}>{value}</div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} style={{ ...cardShellStyle, textDecoration: "none" }}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={{
          ...cardShellStyle,
          padding: 0,
          border: "none",
          background: "transparent",
          appearance: "none",
          WebkitAppearance: "none",
        }}
      >
        {content}
      </button>
    );
  }

  return <div style={cardShellStyle}>{content}</div>;
}

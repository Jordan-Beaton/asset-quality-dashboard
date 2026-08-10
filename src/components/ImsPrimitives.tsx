"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ModuleSectionHeader } from "./ModuleSectionHeader";
import {
  imsActiveTabButtonStyle,
  imsBackLinkStyle,
  imsDangerButtonStyle,
  imsFilterActionRowStyle,
  imsFilterGridStyle,
  imsFilterPanelStyle,
  imsGhostButtonStyle,
  imsInputStyle,
  imsPanelStyle,
  imsPrimaryButtonStyle,
  imsSecondaryButtonStyle,
  imsStatusBannerStyle,
  imsTabButtonStyle,
  imsTabListStyle,
  imsTopMetaRowStyle,
} from "./imsTheme";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

type ImsButtonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  disabled?: boolean;
  style?: CSSProperties;
  title?: string;
};

function getButtonStyle(variant: ButtonVariant): CSSProperties {
  if (variant === "secondary") return imsSecondaryButtonStyle;
  if (variant === "danger") return imsDangerButtonStyle;
  if (variant === "ghost") return imsGhostButtonStyle;
  return imsPrimaryButtonStyle;
}

export function ImsButton({
  children,
  variant = "primary",
  type = "button",
  onClick,
  disabled = false,
  style,
  title,
}: ImsButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        ...getButtonStyle(variant),
        opacity: disabled ? 0.65 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function ImsLinkButton({
  children,
  href,
  variant = "primary",
  style,
}: {
  children: ReactNode;
  href: string;
  variant?: ButtonVariant;
  style?: CSSProperties;
}) {
  return (
    <Link href={href} style={{ ...getButtonStyle(variant), textDecoration: "none", display: "inline-flex", alignItems: "center", ...style }}>
      {children}
    </Link>
  );
}

export function ImsTopMetaRow({
  backHref = "/",
  backLabel = "Back to Dashboard",
  status,
  actions,
}: {
  backHref?: string;
  backLabel?: string;
  status?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="ims-top-meta-row" style={imsTopMetaRowStyle}>
      <Link href={backHref} style={imsBackLinkStyle}>
        ← {backLabel}
      </Link>
      <div className="ims-top-meta-actions" style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px", flexWrap: "wrap" }}>
        {actions}
        {status ? <div style={imsStatusBannerStyle}>{status}</div> : null}
      </div>
    </div>
  );
}

export function ImsTabs<T extends string>({
  tabs,
  active,
  onChange,
  ariaLabel = "Workspace views",
}: {
  tabs: Array<{ value: T; label: string }>;
  active: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
}) {
  return (
    <nav className="ims-tabs" style={imsTabListStyle} aria-label={ariaLabel}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          style={active === tab.value ? imsActiveTabButtonStyle : imsTabButtonStyle}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

export function ImsPanel({
  title,
  subtitle,
  actions,
  children,
  style,
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <section className="ims-panel" style={{ ...imsPanelStyle, ...style }}>
      {title ? <ModuleSectionHeader title={title} subtitle={subtitle} actions={actions} /> : null}
      {children}
    </section>
  );
}

export function ImsFilterPanel({
  search,
  onSearchChange,
  searchPlaceholder = "Search",
  showFilters,
  onToggleFilters,
  children,
  actions,
}: {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  showFilters: boolean;
  onToggleFilters: () => void;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="ims-filter-panel" style={imsFilterPanelStyle}>
      <div className="ims-filter-action-row" style={imsFilterActionRowStyle}>
        {onSearchChange ? (
          <input
            value={search || ""}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            style={imsInputStyle}
          />
        ) : (
          <div />
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          {actions}
          <ImsButton
            variant={showFilters ? "secondary" : "primary"}
            onClick={onToggleFilters}
            style={{ minWidth: "132px" }}
          >
            {showFilters ? "Hide Filters" : "Show Filters"}
          </ImsButton>
        </div>
      </div>
      {showFilters ? <div className="ims-filter-grid" style={imsFilterGridStyle}>{children}</div> : null}
    </div>
  );
}

"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { imsActiveTabButtonStyle, imsTabButtonStyle, imsTabListStyle } from "./imsTheme";

type BalticPowerView = "dashboard" | "itp" | "noi" | "noi-creator" | "itp-sign-off";

const tabs: Array<{ view: BalticPowerView; href: string; label: string }> = [
  { view: "dashboard", href: "/projects/baltic-power", label: "Dashboard" },
  { view: "itp", href: "/projects/baltic-power/itp", label: "ITP Tracker" },
  { view: "noi", href: "/projects/baltic-power/noi", label: "NOI Tracker" },
  { view: "noi-creator", href: "/projects/baltic-power/noi/create", label: "NOI Creator" },
  { view: "itp-sign-off", href: "/projects/baltic-power/itp-sign-off", label: "ITP Sign-Off" },
];

export function BalticPowerWorkspaceNav({ active }: { active: BalticPowerView }) {
  return (
    <nav className="ims-tabs" style={nav} aria-label="Baltic Power workspace" role="tablist">
      {tabs.map((tab) => (
        <Link key={tab.view} href={tab.href} role="tab" aria-selected={tab.view === active} data-active={tab.view === active ? "true" : "false"} style={tab.view === active ? activeTab : tabStyle}>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

const nav: CSSProperties = { ...imsTabListStyle };
const tabStyle: CSSProperties = { ...imsTabButtonStyle, display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none", boxSizing: "border-box" };
const activeTab: CSSProperties = { ...tabStyle, ...imsActiveTabButtonStyle };

"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { imsActiveTabButtonStyle, imsTabButtonStyle, imsTabListStyle } from "./imsTheme";

type WaddenSeaView = "dashboard" | "itp" | "noi" | "noi-creator" | "reports" | "itp-sign-off";

const tabs: Array<{ view: WaddenSeaView; href: string; label: string }> = [
  { view: "dashboard", href: "/projects/wadden-sea", label: "Dashboard" },
  { view: "itp", href: "/projects/wadden-sea/itp", label: "ITP Tracker" },
  { view: "noi", href: "/projects/wadden-sea/noi", label: "NOI Tracker" },
  { view: "noi-creator", href: "/projects/wadden-sea/noi/create", label: "NOI Creator" },
  { view: "reports", href: "/projects/wadden-sea/reports", label: "Project Reports" },
  { view: "itp-sign-off", href: "/projects/wadden-sea/itp-sign-off", label: "ITP Sign-Off" },
];

export function WaddenSeaWorkspaceNav({ active }: { active: WaddenSeaView }) {
  return (
    <nav className="ims-tabs" style={nav} aria-label="Wadden Sea workspace" role="tablist">
      {tabs.map((tab) => (
        <Link key={tab.view} href={tab.href} role="tab" aria-selected={tab.view === active} data-active={tab.view === active ? "true" : "false"} style={tab.view === active ? activeTab : tabStyle}>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

const nav: CSSProperties = { ...imsTabListStyle };
const tabStyle: CSSProperties = {
  ...imsTabButtonStyle,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  boxSizing: "border-box",
};
const activeTab: CSSProperties = { ...tabStyle, ...imsActiveTabButtonStyle };

"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { imsActiveTabButtonStyle, imsTabButtonStyle, imsTabListStyle } from "./imsTheme";
import { getProject } from "../lib/projectRegistry";

export type ProjectTab = "dashboard" | "itp" | "noi" | "noi-creator" | "inspection-records" | "reports" | "itp-sign-off";

const TAB_LABELS: Record<ProjectTab, string> = {
  dashboard: "Dashboard",
  itp: "ITP Tracker",
  noi: "NOI Tracker",
  "noi-creator": "NOI Creator",
  "inspection-records": "Inspection Records",
  reports: "Project Reports",
  "itp-sign-off": "ITP Sign-Off",
};

function tabHref(projectKey: string, tab: ProjectTab): string {
  if (tab === "dashboard") return `/projects/${projectKey}`;
  if (tab === "noi-creator") return `/projects/${projectKey}/noi/create`;
  return `/projects/${projectKey}/${tab}`;
}

export function ProjectWorkspaceNav({ projectKey, active }: { projectKey: string; active: ProjectTab }) {
  const config = getProject(projectKey);
  return (
    <nav className="ims-tabs" style={nav} aria-label={`${config.label} workspace`} role="tablist">
      {config.tabs.map((tab) => (
        <Link
          key={tab}
          href={tabHref(projectKey, tab)}
          role="tab"
          aria-selected={tab === active}
          data-active={tab === active ? "true" : "false"}
          style={tab === active ? activeTab : tabStyle}
        >
          {TAB_LABELS[tab]}
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

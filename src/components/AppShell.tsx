"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { FormEvent, MouseEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { ImsPermissionNotice, ImsPermissionProvider, type ImsPermissionValue } from "./ImsPermissions";
import { supabase } from "../lib/supabase";
import { getPermissionTargetFromPath } from "../lib/imsPermissionRegistry";

type AppShellProps = {
  children: ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  icon: NavIconKey;
};

type SystemRole =
  | "Admin"
  | "Manager"
  | "HSE Officer"
  | "Quality Engineer"
  | "Document Controller"
  | "Asset Manager"
  | "Viewer"
  | "Contractor"
  | "";

type ModuleAccess = {
  quality?: string | null;
  hse?: string | null;
  assets?: string | null;
  risk?: string | null;
  documents?: string | null;
  actions?: string | null;
  people?: string | null;
  managementReview?: string | null;
  admin?: string | null;
};

type TabPermissionRecord = {
  module_key?: string | null;
  area_key?: string | null;
  can_view?: boolean | null;
  can_create?: boolean | null;
  can_edit?: boolean | null;
  full_access?: boolean | null;
};

type PermissionTarget = { moduleKey: string; areaKey: string };

type PeopleAccessRecord = {
  name?: string | null;
  email?: string | null;
  role?: string | null;
  system_role?: string | null;
  is_master_admin?: boolean | null;
  active?: boolean | null;
  access_status?: string | null;
  quality_access?: string | null;
  hse_access?: string | null;
  asset_access?: string | null;
  risk_access?: string | null;
  document_access?: string | null;
  action_access?: string | null;
  people_access?: string | null;
  management_review_access?: string | null;
  admin_access?: string | null;
};

type AccessArea = "public" | "login" | "home" | "people" | "quality" | "lessons" | "documents" | "hse" | "assets" | "risk" | "actions" | "management-review" | "projects" | "admin";

type NavIconKey =
  | "home"
  | "dashboard"
  | "documents"
  | "certification"
  | "moc"
  | "ncr"
  | "audits"
  | "actions"
  | "reports"
  | "calendar"
  | "ptw"
  | "assets"
  | "calibration"
  | "inspection"
  | "maintenance"
  | "risk"
  | "reviews"
  | "controls"
  | "opportunities"
  | "people"
  | "departments"
  | "system"
  | "ainm"
  | "observations"
  | "lessons";

const projectNavItems: NavItem[] = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/projects", label: "Projects", icon: "dashboard" },
  { href: "/projects/wadden-sea", label: "Wadden Sea", icon: "assets" },
];

const qualityNavItems: NavItem[] = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/quality", label: "Dashboard", icon: "dashboard" },
  { href: "/quality/calendar", label: "Calendar", icon: "calendar" },
  { href: "/moc", label: "MOC", icon: "moc" },
  { href: "/ncr-capa", label: "NCR", icon: "ncr" },
  { href: "/audits", label: "Audits", icon: "audits" },
  { href: "/quality/actions", label: "Actions", icon: "actions" },
  { href: "/reports", label: "Reports", icon: "reports" },
];

const lessonsNavItems: NavItem[] = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/lessons-learned", label: "Lessons Learned", icon: "lessons" },
];

const documentNavItems: NavItem[] = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/documents", label: "Document Control", icon: "documents" },
  { href: "/certification", label: "Certification", icon: "certification" },
];

const assetNavItems: NavItem[] = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/assets/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/assets", label: "Assets", icon: "assets" },
  { href: "/assets/calibration", label: "Calibration", icon: "calibration" },
  { href: "/assets/inspection", label: "Inspection", icon: "inspection" },
  { href: "/assets/maintenance", label: "Maintenance", icon: "maintenance" },
  { href: "/assets/actions", label: "Actions", icon: "actions" },
  { href: "/assets/reports", label: "Reports", icon: "reports" },
];

const riskNavItems: NavItem[] = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/risk", label: "Dashboard", icon: "dashboard" },
  { href: "/risk/register", label: "Register", icon: "risk" },
  { href: "/risk/reviews", label: "Reviews", icon: "reviews" },
  { href: "/risk/controls", label: "Controls", icon: "controls" },
  { href: "/risk/opportunities", label: "Opportunities", icon: "opportunities" },
  { href: "/risk/actions", label: "Actions", icon: "actions" },
  { href: "/risk/reports", label: "Reports", icon: "reports" },
];

const hseNavItems: NavItem[] = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/hse", label: "Dashboard", icon: "dashboard" },
  { href: "/hse/calendar", label: "Calendar", icon: "calendar" },
  { href: "/hse/ainm", label: "AINM", icon: "ainm" },
  { href: "/hse/observations", label: "Observations", icon: "observations" },
  { href: "/hse/ptw", label: "PTW", icon: "ptw" },
  { href: "/hse/inspections", label: "Inspections", icon: "inspection" },
  { href: "/hse/actions", label: "Actions", icon: "actions" },
  { href: "/hse/reports", label: "Reports", icon: "reports" },
];

const adminNavItems: NavItem[] = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/admin", label: "Admin Console", icon: "system" },
];

const peopleNavItems: NavItem[] = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/people", label: "People", icon: "people" },
];

const actionNavItems: NavItem[] = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/actions", label: "Actions", icon: "actions" },
];

function normaliseSystemRole(role: string | null | undefined): SystemRole {
  const cleanRole = (role || "").trim().toLowerCase();
  if (cleanRole === "admin") return "Admin";
  if (cleanRole === "manager") return "Manager";
  if (cleanRole === "hse officer" || cleanRole === "hse manager") return "HSE Officer";
  if (cleanRole === "quality engineer" || cleanRole === "quality manager") return "Quality Engineer";
  if (cleanRole === "document controller") return "Document Controller";
  if (cleanRole === "asset manager") return "Asset Manager";
  if (cleanRole === "viewer") return "Viewer";
  if (cleanRole === "contractor") return "Contractor";
  return "";
}

function getAllowedModuleKeys(role: SystemRole) {
  if (role === "Admin") return new Set(["home", "quality", "documents", "hse", "assets", "risk", "actions", "management-review", "people", "admin"]);
  if (role === "Manager") return new Set(["home", "quality", "documents", "hse", "assets", "risk", "actions", "management-review", "people"]);
  if (role === "HSE Officer") return new Set(["home", "hse", "actions", "people"]);
  if (role === "Quality Engineer") return new Set(["home", "quality", "actions", "people"]);
  if (role === "Document Controller") return new Set(["home", "documents", "actions", "people"]);
  if (role === "Asset Manager") return new Set(["home", "assets", "actions", "people"]);
  if (role === "Viewer") return new Set(["home", "quality", "documents", "hse", "assets", "risk", "actions", "people"]);
  if (role === "Contractor") return new Set(["home"]);
  return new Set(["home"]);
}

function getAccessAreaFromHref(href: string): AccessArea {
  if (href === "/home" || href === "/") return "home";
  if (href === "/actions") return "actions";
  if (href === "/people") return "people";
  if (href === "/management-review") return "management-review";
  if (href.startsWith("/admin")) return "admin";
  if (href.startsWith("/projects")) return "projects";
  if (href.startsWith("/lessons-learned")) return "lessons";
  if (href.startsWith("/hse")) return "hse";
  if (href.startsWith("/assets")) return "assets";
  if (href.startsWith("/risk")) return "risk";
  if (href === "/documents" || href.startsWith("/documents") || href === "/certification" || href.startsWith("/certification")) return "documents";
  return "quality";
}

function hasExplicitAccess(value: string | null | undefined) {
  const cleanValue = (value || "").trim().toLowerCase();
  return Boolean(cleanValue && cleanValue !== "role default" && cleanValue !== "none");
}

function isExplicitNone(value: string | null | undefined) {
  return (value || "").trim().toLowerCase() === "none";
}

function isPartAccess(value: string | null | undefined) {
  return (value || "").trim().toLowerCase() === "part access";
}

function getNormalisedAccess(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function getModuleAccessValue(moduleKey: string, moduleAccess: ModuleAccess) {
  if (moduleKey === "quality") return moduleAccess.quality;
  if (moduleKey === "documents") return moduleAccess.documents;
  if (moduleKey === "hse") return moduleAccess.hse;
  if (moduleKey === "assets") return moduleAccess.assets;
  if (moduleKey === "risk") return moduleAccess.risk;
  if (moduleKey === "actions") return moduleAccess.actions;
  if (moduleKey === "people") return moduleAccess.people;
  if (moduleKey === "management-review") return moduleAccess.managementReview;
  if (moduleKey === "admin") return moduleAccess.admin;
  return null;
}

function getPermissionTargetFromHref(href: string): PermissionTarget | null {
  const registered = getPermissionTargetFromPath(href);
  if (registered) return { moduleKey: registered.moduleKey, areaKey: registered.areaKey };
  if (href.startsWith("/lessons-learned")) return { moduleKey: "quality", areaKey: "lessons" };
  if (href.startsWith("/projects")) return { moduleKey: "quality", areaKey: "reports" };
  if (href === "/quality") return { moduleKey: "quality", areaKey: "dashboard" };
  if (href === "/quality/calendar") return { moduleKey: "quality", areaKey: "calendar" };
  if (href === "/moc") return { moduleKey: "quality", areaKey: "moc" };
  if (href === "/ncr-capa") return { moduleKey: "quality", areaKey: "ncr" };
  if (href === "/audits") return { moduleKey: "quality", areaKey: "audits" };
  if (href === "/quality/actions") return { moduleKey: "quality", areaKey: "actions" };
  if (href === "/reports" || href.startsWith("/reports/")) return { moduleKey: "quality", areaKey: "reports" };

  if (href === "/documents") return { moduleKey: "documents", areaKey: "document-control" };
  if (href === "/certification") return { moduleKey: "documents", areaKey: "certification" };

  if (href === "/hse") return { moduleKey: "hse", areaKey: "dashboard" };
  if (href === "/hse/calendar") return { moduleKey: "hse", areaKey: "calendar" };
  if (href.startsWith("/hse/ainm")) return { moduleKey: "hse", areaKey: "ainm" };
  if (href === "/hse/observations") return { moduleKey: "hse", areaKey: "observations" };
  if (href === "/hse/ptw") return { moduleKey: "hse", areaKey: "ptw" };
  if (href.startsWith("/hse/inspections")) return { moduleKey: "hse", areaKey: "inspections" };
  if (href === "/hse/actions") return { moduleKey: "hse", areaKey: "actions" };
  if (href === "/hse/reports") return { moduleKey: "hse", areaKey: "reports" };

  if (href === "/assets/dashboard") return { moduleKey: "assets", areaKey: "dashboard" };
  if (href === "/assets") return { moduleKey: "assets", areaKey: "register" };
  if (href === "/assets/calibration") return { moduleKey: "assets", areaKey: "calibration" };
  if (href.startsWith("/assets/inspection")) return { moduleKey: "assets", areaKey: "inspection" };
  if (href.startsWith("/assets/maintenance")) return { moduleKey: "assets", areaKey: "maintenance" };
  if (href === "/assets/actions") return { moduleKey: "assets", areaKey: "actions" };
  if (href === "/assets/reports") return { moduleKey: "assets", areaKey: "reports" };

  if (href === "/risk") return { moduleKey: "risk", areaKey: "dashboard" };
  if (href === "/risk/register") return { moduleKey: "risk", areaKey: "register" };
  if (href === "/risk/reviews") return { moduleKey: "risk", areaKey: "reviews" };
  if (href === "/risk/controls") return { moduleKey: "risk", areaKey: "controls" };
  if (href === "/risk/opportunities") return { moduleKey: "risk", areaKey: "opportunities" };
  if (href === "/risk/actions") return { moduleKey: "risk", areaKey: "actions" };
  if (href === "/risk/reports") return { moduleKey: "risk", areaKey: "reports" };

  if (href === "/actions") return { moduleKey: "actions", areaKey: "register" };
  if (href === "/people") return { moduleKey: "people", areaKey: "register" };
  if (href === "/management-review") return { moduleKey: "management-review", areaKey: "dashboard" };
  if (href.startsWith("/admin")) return { moduleKey: "admin", areaKey: href === "/admin" ? "users" : href.replace("/admin/", "") };
  return null;
}

function getRoleDefaultPermission(role: SystemRole, target: PermissionTarget): Pick<ImsPermissionValue, "canView" | "canCreate" | "canEdit" | "fullAccess"> {
  if (role === "Admin") return { canView: true, canCreate: true, canEdit: true, fullAccess: true };
  if (role === "Viewer") return { canView: true, canCreate: false, canEdit: false, fullAccess: false };
  if (role === "Contractor") return { canView: target.moduleKey === "hse", canCreate: target.moduleKey === "hse", canEdit: false, fullAccess: false };
  if (role === "Manager") return { canView: true, canCreate: true, canEdit: true, fullAccess: false };
  if (role === "HSE Officer" && target.moduleKey === "hse") return { canView: true, canCreate: true, canEdit: true, fullAccess: false };
  if (role === "Quality Engineer" && target.moduleKey === "quality") return { canView: true, canCreate: true, canEdit: true, fullAccess: false };
  if (role === "Document Controller" && target.moduleKey === "documents") return { canView: true, canCreate: true, canEdit: true, fullAccess: false };
  if (role === "Asset Manager" && target.moduleKey === "assets") return { canView: true, canCreate: true, canEdit: true, fullAccess: false };
  return { canView: true, canCreate: false, canEdit: false, fullAccess: false };
}

function getAccessValuePermission(value: string | null | undefined) {
  const access = getNormalisedAccess(value);
  if (access === "full" || access === "edit" || access === "approve" || access === "documents") {
    return { canView: true, canCreate: true, canEdit: true, fullAccess: access === "full" };
  }
  if (access === "read") return { canView: true, canCreate: false, canEdit: false, fullAccess: false };
  if (access === "observe") return { canView: true, canCreate: true, canEdit: false, fullAccess: false };
  if (access === "none") return { canView: false, canCreate: false, canEdit: false, fullAccess: false };
  return null;
}

function getActivePermissionValue({
  loaded,
  target,
  role,
  moduleAccess,
  tabPermissions,
  isMasterAdmin,
}: {
  loaded: boolean;
  target: PermissionTarget | null;
  role: SystemRole;
  moduleAccess: ModuleAccess;
  tabPermissions: TabPermissionRecord[];
  isMasterAdmin: boolean;
}): ImsPermissionValue {
  const canAccessModule = (moduleKey: string) => {
    if (moduleKey === "home") return true;
    if (isMasterAdmin) return true;
    const moduleAccessValue = getEffectiveModuleAccess(moduleKey, moduleAccess, tabPermissions);
    if (isExplicitNone(moduleAccessValue)) return false;
    if (isPartAccess(moduleAccessValue)) return hasAnyModuleTabPermission(tabPermissions, moduleKey);
    if (hasExplicitAccess(moduleAccessValue)) return true;
    return getAllowedModuleKeys(role).has(moduleKey);
  };

  if (!target) {
    return {
      loaded,
      moduleKey: null,
      areaKey: null,
      canView: true,
      canCreate: true,
      canEdit: true,
      fullAccess: true,
      isMasterAdmin,
      canAccessModule,
    };
  }

  if (isMasterAdmin) {
    return {
      loaded,
      moduleKey: target.moduleKey,
      areaKey: target.areaKey,
      canView: true,
      canCreate: true,
      canEdit: true,
      fullAccess: true,
      isMasterAdmin: true,
      canAccessModule,
    };
  }

  const moduleAccessValue = getEffectiveModuleAccess(target.moduleKey, moduleAccess, tabPermissions);
  if (isPartAccess(moduleAccessValue)) {
    const tabPermission = getTabPermission(tabPermissions, target.moduleKey, target.areaKey);
    const fullAccess = Boolean(tabPermission?.full_access);
    return {
      loaded,
      moduleKey: target.moduleKey,
      areaKey: target.areaKey,
      canView: fullAccess || Boolean(tabPermission?.can_view || tabPermission?.can_create || tabPermission?.can_edit),
      canCreate: fullAccess || Boolean(tabPermission?.can_create),
      canEdit: fullAccess || Boolean(tabPermission?.can_edit),
      fullAccess,
      isMasterAdmin: false,
      canAccessModule,
    };
  }

  const explicitPermission = getAccessValuePermission(moduleAccessValue);
  const permission = explicitPermission || getRoleDefaultPermission(role, target);
  return {
    loaded,
    moduleKey: target.moduleKey,
    areaKey: target.areaKey,
    ...permission,
    isMasterAdmin: false,
    canAccessModule,
  };
}

const createActionWords = [
  "create",
  "add",
  "new",
  "import",
  "bulk upload",
  "generate",
  "draft",
  "issue",
  "invite",
];

const editActionWords = [
  "save",
  "update",
  "edit",
  "delete",
  "remove",
  "upload",
  "submit",
  "send",
  "approve",
  "reject",
  "close",
  "reopen",
  "up-rev",
  "supersede",
  "reset",
  "deactivate",
  "activate",
];

const safeActionWords = [
  "open",
  "view",
  "download",
  "preview",
  "hide",
  "show",
  "clear filters",
  "refresh",
  "back",
  "copy",
  "search",
  "filter",
  "sign out",
];

function getElementActionLabel(element: HTMLElement) {
  return [
    element.getAttribute("data-ims-action"),
    element.getAttribute("aria-label"),
    element.getAttribute("title"),
    element.textContent,
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getRestrictedAction(label: string): "create" | "edit" | null {
  if (!label) return null;
  if (safeActionWords.some((word) => label.includes(word))) return null;
  if (editActionWords.some((word) => label.includes(word))) return "edit";
  if (createActionWords.some((word) => label.includes(word))) return "create";
  return null;
}

function hasTabPermission(tabPermissions: TabPermissionRecord[], moduleKey: string, areaKey: string) {
  return tabPermissions.some((permission) => {
    return (
      (permission.module_key || "").trim() === moduleKey &&
      (permission.area_key || "").trim() === areaKey &&
      (permission.full_access || permission.can_view || permission.can_create || permission.can_edit)
    );
  });
}

function hasAnyModuleTabPermission(tabPermissions: TabPermissionRecord[], moduleKey: string) {
  return tabPermissions.some((permission) => {
    return (
      (permission.module_key || "").trim() === moduleKey &&
      (permission.full_access || permission.can_view || permission.can_create || permission.can_edit)
    );
  });
}

function getTabPermission(tabPermissions: TabPermissionRecord[], moduleKey: string, areaKey: string) {
  return tabPermissions.find((permission) => {
    return (permission.module_key || "").trim() === moduleKey && (permission.area_key || "").trim() === areaKey;
  });
}

function getEffectiveModuleAccess(moduleKey: string, moduleAccess: ModuleAccess, tabPermissions: TabPermissionRecord[]) {
  const rows = tabPermissions.filter((permission) => (permission.module_key || "").trim() === moduleKey);
  if (rows.length) {
    if (rows.every((permission) => permission.full_access)) return "Full";
    if (rows.some((permission) => permission.full_access || permission.can_view || permission.can_create || permission.can_edit)) return "Part Access";
    return "None";
  }
  if (moduleKey === "lessons" || moduleKey === "projects") return moduleAccess.quality;
  return getModuleAccessValue(moduleKey, moduleAccess);
}

function filterNavItemsForRole(items: NavItem[], role: SystemRole, moduleAccess: ModuleAccess, tabPermissions: TabPermissionRecord[]) {
  return items.filter((item) => {
    if (item.href === "/home" || item.href === "/") return true;
    const target = getPermissionTargetFromHref(item.href);
    if (target && isPartAccess(getEffectiveModuleAccess(target.moduleKey, moduleAccess, tabPermissions))) {
      return hasTabPermission(tabPermissions, target.moduleKey, target.areaKey);
    }
    return isAreaAllowed(getAccessAreaFromHref(item.href), role, moduleAccess);
  });
}

function isAreaAllowed(area: AccessArea, role: SystemRole, moduleAccess: ModuleAccess) {
  if (area === "public" || area === "login") return true;
  if (area === "home") return true;
  if (area === "people") return !isExplicitNone(moduleAccess.people) && (hasExplicitAccess(moduleAccess.people) || role === "Admin" || role === "Manager" || role === "HSE Officer" || role === "Quality Engineer" || role === "Document Controller" || role === "Asset Manager" || role === "Viewer");
  if (area === "quality") return !isExplicitNone(moduleAccess.quality) && (hasExplicitAccess(moduleAccess.quality) || role === "Admin" || role === "Manager" || role === "Quality Engineer" || role === "Viewer");
  if (area === "lessons") return !isExplicitNone(moduleAccess.quality) && (hasExplicitAccess(moduleAccess.quality) || role === "Admin" || role === "Manager" || role === "Quality Engineer" || role === "Viewer");
  if (area === "documents") return !isExplicitNone(moduleAccess.documents) && (hasExplicitAccess(moduleAccess.documents) || role === "Admin" || role === "Manager" || role === "Quality Engineer" || role === "Document Controller" || role === "Viewer");
  if (area === "hse") return !isExplicitNone(moduleAccess.hse) && (hasExplicitAccess(moduleAccess.hse) || role === "Admin" || role === "Manager" || role === "HSE Officer" || role === "Viewer");
  if (area === "assets") return !isExplicitNone(moduleAccess.assets) && (hasExplicitAccess(moduleAccess.assets) || role === "Admin" || role === "Manager" || role === "Asset Manager" || role === "Viewer");
  if (area === "risk") return !isExplicitNone(moduleAccess.risk) && (hasExplicitAccess(moduleAccess.risk) || role === "Admin" || role === "Manager" || role === "Viewer");
  if (area === "actions") return !isExplicitNone(moduleAccess.actions) && (hasExplicitAccess(moduleAccess.actions) || role === "Admin" || role === "Manager" || role === "HSE Officer" || role === "Quality Engineer" || role === "Document Controller" || role === "Asset Manager" || role === "Viewer");
  if (area === "management-review") return !isExplicitNone(moduleAccess.managementReview) && (hasExplicitAccess(moduleAccess.managementReview) || role === "Admin" || role === "Manager" || role === "Viewer");
  if (area === "projects") return !isExplicitNone(moduleAccess.quality) && (hasExplicitAccess(moduleAccess.quality) || role === "Admin" || role === "Manager" || role === "Quality Engineer" || role === "Viewer");
  if (area === "admin") return !isExplicitNone(moduleAccess.admin) && (hasExplicitAccess(moduleAccess.admin) || role === "Admin");
  return false;
}

function RailIcon({ icon }: { icon: NavIconKey }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (icon === "home") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 19, height: 19 }}>
        <path {...common} d="M4 11.5 12 5l8 6.5" />
        <path {...common} d="M6.5 10.5V20h11v-9.5" />
        <path {...common} d="M10 20v-5h4v5" />
      </svg>
    );
  }

  if (icon === "dashboard") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 19, height: 19 }}>
        <path {...common} d="M4 5h7v7H4zM13 5h7v4h-7zM13 11h7v8h-7zM4 14h7v5H4z" />
      </svg>
    );
  }

  if (icon === "documents" || icon === "reports" || icon === "certification") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 19, height: 19 }}>
        <path {...common} d="M7 3h7l4 4v14H7z" />
        {icon === "certification" ? (
          <>
            <path {...common} d="M14 3v5h5M9 12h6" />
            <path {...common} d="m9 16 1.5 1.5L15 13" />
          </>
        ) : (
          <path {...common} d="M14 3v5h5M9.5 12h6M9.5 16h6" />
        )}
      </svg>
    );
  }

  if (icon === "actions" || icon === "audits" || icon === "inspection" || icon === "reviews") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 19, height: 19 }}>
        <path {...common} d="M8 4h8l1 3h2v14H5V7h2z" />
        <path {...common} d="m8.5 13 2.2 2.2 4.8-5" />
      </svg>
    );
  }

  if (icon === "calendar") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 19, height: 19 }}>
        <path {...common} d="M7 3v4M17 3v4M4 8h16" />
        <path {...common} d="M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1z" />
        <path {...common} d="M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01" />
      </svg>
    );
  }

  if (icon === "assets" || icon === "maintenance" || icon === "calibration") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 19, height: 19 }}>
        <path {...common} d="M12 3 4.5 7.2v8.6L12 20l7.5-4.2V7.2z" />
        <path {...common} d="M4.8 7.4 12 11.5l7.2-4.1M12 11.5V20" />
      </svg>
    );
  }

  if (icon === "risk" || icon === "ncr" || icon === "ainm") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 19, height: 19 }}>
        <path {...common} d="M12 3 21 20H3z" />
        <path {...common} d="M12 9v5M12 17h.01" />
      </svg>
    );
  }

  if (icon === "observations") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 19, height: 19 }}>
        <path {...common} d="M4 5h16v12H8l-4 4z" />
        <path {...common} d="M8 9h8M8 13h5" />
      </svg>
    );
  }

  if (icon === "lessons") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 19, height: 19 }}>
        <path {...common} d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" />
        <path {...common} d="M8 4v16M11 9h5M11 13h5" />
      </svg>
    );
  }

  if (icon === "ptw") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 19, height: 19 }}>
        <path {...common} d="M7 3h7l4 4v14H7z" />
        <path {...common} d="M14 3v5h5" />
        <path {...common} d="M9 12h6M9 16h3" />
        <path {...common} d="m14 17 1.4 1.4L19 14.5" />
      </svg>
    );
  }

  if (icon === "people" || icon === "departments") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 19, height: 19 }}>
        <path {...common} d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
        <path {...common} d="M3.5 20a5 5 0 0 1 9 0M13.5 19a4 4 0 0 1 7 0" />
      </svg>
    );
  }

  if (icon === "controls" || icon === "system") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 19, height: 19 }}>
        <path {...common} d="M5 7h14M5 12h14M5 17h14" />
        <path {...common} d="M9 7v0M15 12v0M11 17v0" />
      </svg>
    );
  }

  if (icon === "opportunities") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 19, height: 19 }}>
        <path {...common} d="M4 16 9 11l4 4 7-8" />
        <path {...common} d="M15 7h5v5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 19, height: 19 }}>
      <path {...common} d="M12 3v18M3 12h18" />
    </svg>
  );
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [isFieldInspectionMode, setIsFieldInspectionMode] = useState(false);
  const [isRailExpanded, setIsRailExpanded] = useState(false);
  const [isRailPinned, setIsRailPinned] = useState(false);
  const [signedInName, setSignedInName] = useState("");
  const [signedInRole, setSignedInRole] = useState<SystemRole>("");
  const [signedInModuleAccess, setSignedInModuleAccess] = useState<ModuleAccess>({});
  const [signedInTabPermissions, setSignedInTabPermissions] = useState<TabPermissionRecord[]>([]);
  const [signedInIsMasterAdmin, setSignedInIsMasterAdmin] = useState(false);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const isLoginPage = pathname === "/login";
  const isPublicObservationPage = pathname === "/observe";
  const isHomePage = pathname === "/home";
  const isAssetModule = pathname.startsWith("/assets");
  const isRiskModule = pathname.startsWith("/risk");
  const isHseModule = pathname.startsWith("/hse");
  const isDocumentModule = pathname.startsWith("/documents") || pathname.startsWith("/certification");
  const isAdminModule = pathname.startsWith("/admin");
  const isPeopleModule = pathname.startsWith("/people");
  const isActionModule = pathname === "/actions";
  const isProjectModule = pathname.startsWith("/projects");
  const isLessonsModule = pathname.startsWith("/lessons-learned");
  const isAinmFieldMode = pathname === "/hse/ainm/field";
  const isAssetInspectionFieldMode = pathname === "/assets/inspection/field";
  const isAssetMaintenanceFieldMode = pathname === "/assets/maintenance/field";
  const fieldModeTitle = isAinmFieldMode
    ? "HSE AINM Field Entry"
    : isAssetInspectionFieldMode
      ? "Asset Field Inspection"
      : isAssetMaintenanceFieldMode
        ? "Asset Field Maintenance"
      : "HSE Field Inspection";
  const showLogo = !isLoginPage && !isPublicObservationPage;
  const moduleTitle = isHomePage
    ? "Enshore Management System"
    : isActionModule
    ? "Action Management"
    : isLessonsModule
    ? "Lessons Learned"
    : isProjectModule
    ? "Project Management"
    : isDocumentModule
    ? "Document Control"
    : isAssetModule
    ? "Asset Management"
    : isRiskModule
    ? "Risk Management"
    : isHseModule
    ? "HSE Management"
    : isAdminModule
    ? "Admin / Settings"
    : isPeopleModule
    ? "People Management"
    : "Quality Management";
  const moduleSubtitle = isHomePage
    ? ""
    : isActionModule
    ? "Central action register and follow-up control"
    : isLessonsModule
    ? "Central project knowledge, repeat-failure prevention, and operational learning"
    : isProjectModule
    ? "Project registers, controls, documents, and reporting"
    : isDocumentModule
    ? "Controlled documents, certification, reviews, approvals, and revision history"
    : isAssetModule
    ? "Asset register and control system"
    : isRiskModule
    ? "Risk register, controls, opportunities, and reporting"
    : isHseModule
    ? "Health, safety and environment system"
    : isAdminModule
    ? "Master data and system configuration"
    : isPeopleModule
    ? "Shared people directory and status management"
    : "Quality management system";
  const baseNavItems = isAssetModule
    ? assetNavItems
    : isDocumentModule
    ? documentNavItems
    : isRiskModule
    ? riskNavItems
    : isHseModule
    ? hseNavItems
    : isAdminModule
    ? adminNavItems
    : isPeopleModule
    ? peopleNavItems
    : isActionModule
    ? actionNavItems
    : isProjectModule
    ? projectNavItems
    : isLessonsModule
    ? lessonsNavItems
    : qualityNavItems;
  const navItems = filterNavItemsForRole(baseNavItems, signedInRole, signedInModuleAccess, signedInTabPermissions);
  const showSideRail = !isLoginPage && !isPublicObservationPage && !isHomePage && !isFieldInspectionMode;
  const railOpen = isRailExpanded || isRailPinned;
  const currentAccessArea: AccessArea = isLoginPage
    ? "login"
    : isPublicObservationPage
    ? "public"
    : isHomePage
    ? "home"
    : getAccessAreaFromHref(pathname);
  const currentPermissionTarget = getPermissionTargetFromHref(pathname);
  const activePermission = getActivePermissionValue({
    loaded: permissionsLoaded,
    target: currentPermissionTarget,
    role: signedInRole,
    moduleAccess: signedInModuleAccess,
    tabPermissions: signedInTabPermissions,
    isMasterAdmin: signedInIsMasterAdmin,
  });
  const pageAccessAllowed =
    isLoginPage ||
    isPublicObservationPage ||
    !permissionsLoaded ||
    (currentPermissionTarget ? activePermission.canView : isAreaAllowed(currentAccessArea, signedInRole, signedInModuleAccess));

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateFieldInspectionMode = () => {
      const params = new URLSearchParams(window.location.search);
      setIsFieldInspectionMode(
        pathname === "/hse/ainm/field" ||
        pathname === "/hse/inspections/field" ||
        pathname === "/assets/inspection/field" ||
        pathname === "/assets/maintenance/field" ||
        (pathname === "/assets/inspection" &&
          window.innerWidth <= 720 &&
          params.get("view") === "create") ||
        (pathname === "/assets/maintenance" &&
          window.innerWidth <= 720 &&
          params.get("view") === "create") ||
        (pathname === "/hse/inspections" &&
          window.innerWidth <= 720 &&
          params.get("view") === "create"),
      );
    };
    updateFieldInspectionMode();
    window.addEventListener("resize", updateFieldInspectionMode);
    window.addEventListener("popstate", updateFieldInspectionMode);
    return () => {
      window.removeEventListener("resize", updateFieldInspectionMode);
      window.removeEventListener("popstate", updateFieldInspectionMode);
    };
  }, [pathname]);

  useEffect(() => {
    let isMounted = true;

    async function loadSignedInName() {
      setPermissionsLoaded(false);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted || !user) {
        if (isMounted) {
          setSignedInName("");
          setSignedInRole("");
          setSignedInModuleAccess({});
          setSignedInTabPermissions([]);
          setSignedInIsMasterAdmin(false);
          setPermissionsLoaded(true);
        }
        return;
      }

      const email = user.email || "";
      if (email) {
        const normalisedEmail = email.trim().toLowerCase();
        const { data: peopleMatches } = await supabase
          .from("people")
          .select("*")
          .ilike("email", email.trim())
          .limit(10);

        if (!isMounted) return;
        const matchedPeople = (peopleMatches || []) as PeopleAccessRecord[];
        const person =
          matchedPeople.find((item) => item.active !== false && (item.email || "").trim().toLowerCase() === normalisedEmail) ||
          matchedPeople.find((item) => (item.email || "").trim().toLowerCase() === normalisedEmail) ||
          matchedPeople.find((item) => item.active !== false) ||
          matchedPeople[0] ||
          null;
        const isMasterAdmin =
          normalisedEmail === "jbeaton@enshoresubsea.com" ||
          person?.is_master_admin ||
          (person?.name || "").trim().toLowerCase() === "jordan beaton";
        const isPersonDeactivated =
          !isMasterAdmin &&
          (person?.active === false || (person?.access_status || "").trim().toLowerCase() === "deactivated");

        if (isPersonDeactivated) {
          setSignedInName(person?.name || user.user_metadata?.name || email);
          setSignedInRole("");
          setSignedInModuleAccess({});
          setSignedInTabPermissions([]);
          setSignedInIsMasterAdmin(false);
          setPermissionsLoaded(true);
          return;
        }

        const roleSource = person?.system_role || person?.role;
        const resolvedRole = isMasterAdmin ? "Admin" : normaliseSystemRole(roleSource);
        const { data: roleDefaults } = roleSource
          ? await supabase
              .from("ims_roles")
              .select("*")
              .eq("role_name", resolvedRole || roleSource)
              .maybeSingle()
          : { data: null };

        const { data: tabPermissions } = await supabase
          .from("ims_tab_permissions")
          .select("module_key,area_key,can_view,can_create,can_edit,full_access")
          .ilike("email", email.trim());

        if (!isMounted) return;
        setSignedInName(person?.name || user.user_metadata?.name || email);
        setSignedInRole(resolvedRole);
        setSignedInIsMasterAdmin(Boolean(isMasterAdmin));
        setSignedInModuleAccess({
          quality: person?.quality_access || roleDefaults?.quality_access,
          hse: person?.hse_access || roleDefaults?.hse_access,
          assets: person?.asset_access || roleDefaults?.asset_access,
          risk: person?.risk_access || roleDefaults?.risk_access,
          documents: person?.document_access || roleDefaults?.document_access,
          actions: person?.action_access || roleDefaults?.action_access,
          people: person?.people_access || roleDefaults?.people_access,
          managementReview: person?.management_review_access || roleDefaults?.management_review_access,
          admin: person?.admin_access || roleDefaults?.admin_access,
        });
        setSignedInTabPermissions((tabPermissions || []) as TabPermissionRecord[]);
        setPermissionsLoaded(true);
        return;
      }

      if (isMounted) {
        setSignedInName(user.user_metadata?.name || "");
        setSignedInRole("");
        setSignedInModuleAccess({});
        setSignedInTabPermissions([]);
        setSignedInIsMasterAdmin(false);
        setPermissionsLoaded(true);
      }
    }

    void loadSignedInName();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const showPermissionBlock = (message: string) => {
    if (typeof window === "undefined") return;
    window.alert(message);
  };

  const handlePermissionClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!permissionsLoaded || activePermission.fullAccess || activePermission.isMasterAdmin || isLoginPage || isPublicObservationPage) return;
    const target = event.target as HTMLElement | null;
    const actionElement = target?.closest("button, a, input[type='button'], input[type='submit']") as HTMLElement | null;
    if (!actionElement) return;
    const label = getElementActionLabel(actionElement);
    const restrictedAction = getRestrictedAction(label);
    if (!restrictedAction) return;
    const allowed = restrictedAction === "create" ? activePermission.canCreate : activePermission.canEdit;
    if (allowed) return;
    event.preventDefault();
    event.stopPropagation();
    showPermissionBlock(
      restrictedAction === "create"
        ? "Your current IMS permissions allow you to view this area, but not create new records here."
        : "Your current IMS permissions allow you to view this area, but not edit, upload, approve, or delete records here.",
    );
  };

  const handlePermissionSubmitCapture = (event: FormEvent<HTMLDivElement>) => {
    if (!permissionsLoaded || activePermission.fullAccess || activePermission.isMasterAdmin || activePermission.canCreate || activePermission.canEdit) return;
    event.preventDefault();
    event.stopPropagation();
    showPermissionBlock("Your current IMS permissions are read-only for this area, so form submissions are blocked.");
  };

  const handlePermissionChangeCapture = (event: FormEvent<HTMLDivElement>) => {
    if (!permissionsLoaded || activePermission.fullAccess || activePermission.isMasterAdmin || activePermission.canCreate || activePermission.canEdit) return;
    const target = event.target as HTMLInputElement | null;
    if (target?.type !== "file") return;
    event.preventDefault();
    event.stopPropagation();
    target.value = "";
    showPermissionBlock("Your current IMS permissions are read-only for this area, so file uploads are blocked.");
  };

  return (
    <ImsPermissionProvider value={activePermission}>
    <div
      style={{ minHeight: "100vh", background: "#f1f5f9", scrollbarGutter: "stable" }}
      onClickCapture={handlePermissionClickCapture}
      onSubmitCapture={handlePermissionSubmitCapture}
      onChangeCapture={handlePermissionChangeCapture}
    >
      {!isPublicObservationPage ? <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 1000,
          background: "#ffffff",
          borderBottom: "1px solid #dbe3ef",
          boxShadow: "0 6px 20px rgba(15, 23, 42, 0.08)",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            padding: isFieldInspectionMode ? "8px 12px" : 0,
            boxSizing: "border-box",
            display: isFieldInspectionMode ? "flex" : "grid",
            gridTemplateColumns: isFieldInspectionMode ? undefined : "1fr",
            alignItems: "center",
            gap: isFieldInspectionMode ? "8px" : 0,
            minHeight: isFieldInspectionMode ? undefined : "76px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              gap: isFieldInspectionMode ? "8px" : "14px",
              flexWrap: isFieldInspectionMode ? "wrap" : "nowrap",
              minWidth: 0,
              position: isFieldInspectionMode ? undefined : "absolute",
              left: isFieldInspectionMode ? undefined : "20px",
              top: isFieldInspectionMode ? undefined : "50%",
              transform: isFieldInspectionMode ? undefined : "translateY(-50%)",
              zIndex: 2,
            }}
          >
            {showLogo ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: isFieldInspectionMode ? "124px" : "202px",
                  height: isFieldInspectionMode ? "38px" : "52px",
                  boxSizing: "border-box",
                  flex: "0 0 auto",
                }}
              >
                <Image
                  src="/enshore-primary-logo-colour.svg"
                  alt="Enshore"
                  width={isFieldInspectionMode ? 124 : 202}
                  height={isFieldInspectionMode ? 62 : 101}
                  priority
                  style={{ width: "auto", height: "100%", maxWidth: "100%", objectFit: "contain" }}
                />
              </span>
            ) : null}
          </div>

          <div
            style={{
              width: "100%",
              maxWidth: "1320px",
              margin: "0 auto",
              padding: isFieldInspectionMode ? 0 : "12px 24px 12px 240px",
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "18px",
              minWidth: 0,
              minHeight: isFieldInspectionMode ? undefined : "76px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <div
                style={{
                  color: "#0f172a",
                  fontWeight: 700,
                  fontSize: isFieldInspectionMode ? "15px" : "20px",
                  letterSpacing: "-0.01em",
                  whiteSpace: isFieldInspectionMode ? undefined : "nowrap",
                }}
              >
                {isFieldInspectionMode ? fieldModeTitle : moduleTitle}
              </div>
              {moduleSubtitle && !isFieldInspectionMode ? (
                <div
                  style={{
                    color: "#64748b",
                    fontSize: "12px",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                  }}
                >
                  {moduleSubtitle}
                </div>
              ) : null}
            </div>

            {!isLoginPage && !isFieldInspectionMode ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  flexWrap: "nowrap",
                  justifyContent: "flex-end",
                  minWidth: 0,
                }}
              >
              <button
                onClick={handleLogout}
                style={{
                  background: "#ffffff",
                  color: "#005670",
                  border: "1px solid #D0D0CE",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  fontWeight: 700,
                  fontSize: "13.5px",
                  cursor: "pointer",
                  height: "38px",
                  boxSizing: "border-box",
                  whiteSpace: "nowrap",
                  lineHeight: 1,
                }}
              >
                Sign out
              </button>
              {signedInName ? (
                <div
                  title={signedInName}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    minHeight: "38px",
                    maxWidth: "210px",
                    color: "#0f172a",
                    fontSize: "13px",
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "999px",
                      background: "#ECECE7",
                      color: "#005670",
                      border: "1px solid #D0D0CE",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "11px",
                      fontWeight: 900,
                      flex: "0 0 auto",
                    }}
                  >
                    {signedInName
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")
                      .toUpperCase()}
                  </span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{signedInName}</span>
                </div>
              ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </header> : null}

      {showSideRail ? (
        <aside
          onMouseEnter={() => setIsRailExpanded(true)}
          onMouseLeave={() => setIsRailExpanded(false)}
          onFocus={() => setIsRailExpanded(true)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setIsRailExpanded(false);
            }
          }}
          style={{
            position: "fixed",
            top: "77px",
            left: 0,
            bottom: 0,
            zIndex: 900,
            width: railOpen ? "236px" : "74px",
            background: "rgba(255,255,255,0.96)",
            borderRight: "1px solid #dbe3ef",
            boxShadow: "10px 0 28px rgba(15, 23, 42, 0.08)",
            padding: "14px 10px",
            boxSizing: "border-box",
            transition: "width 180ms ease",
            overflow: "hidden",
          }}
          aria-label={`${moduleTitle} navigation`}
        >
          <div
            style={{
              color: "#64748b",
              fontSize: "10px",
              fontWeight: 900,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              padding: railOpen ? "0 10px 8px" : "0 0 8px",
              textAlign: railOpen ? "left" : "center",
              whiteSpace: "nowrap",
            }}
          >
            {railOpen ? "Workspace" : "IMS"}
          </div>

          <button
            type="button"
            onClick={() => setIsRailPinned((value) => !value)}
            title={isRailPinned ? "Unpin navigation" : "Pin navigation open"}
            style={{
              width: "100%",
              minHeight: "34px",
              marginBottom: "10px",
              borderRadius: "11px",
              border: "1px solid #dbe3ef",
              background: isRailPinned ? "#ECECE7" : "#ffffff",
              color: isRailPinned ? "#005670" : "#475569",
              cursor: "pointer",
              display: "grid",
              gridTemplateColumns: "42px minmax(0, 1fr)",
              alignItems: "center",
              gap: "10px",
              padding: "3px",
              boxSizing: "border-box",
              fontWeight: 900,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "9px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                justifySelf: "center",
                background: isRailPinned ? "#D0D0CE" : "#eef4f6",
                fontSize: "12px",
                lineHeight: 1,
              }}
            >
              {isRailPinned ? "●" : "○"}
            </span>
            <span
              style={{
                opacity: railOpen ? 1 : 0,
                transform: railOpen ? "translateX(0)" : "translateX(-6px)",
                transition: "opacity 150ms ease, transform 150ms ease",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontSize: "12px",
              }}
            >
              {isRailPinned ? "Navigation pinned" : "Pin navigation"}
            </span>
          </button>

          <nav style={{ display: "grid", gap: "8px" }}>
            {navItems.map((item) => {
              const isActive =
                item.href === "/" ||
                item.href === "/quality" ||
                item.href === "/home" ||
                item.href === "/assets" ||
                item.href === "/risk" ||
                item.href === "/hse" ||
                item.href === "/admin"
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={isActive ? "ims-rail-link ims-rail-link--active" : "ims-rail-link"}
                  style={{
                    position: "relative",
                    display: "grid",
                    gridTemplateColumns: "42px minmax(0, 1fr)",
                    alignItems: "center",
                    gap: "10px",
                    minHeight: "44px",
                    borderRadius: "13px",
                    padding: "4px",
                    boxSizing: "border-box",
                    textDecoration: "none",
                    background: isActive ? "#005670" : "transparent",
                    color: isActive ? "#ffffff" : "#0f172a",
                    border: isActive ? "1px solid #005670" : "1px solid transparent",
                    transition: "background 180ms ease, color 180ms ease, border-color 180ms ease, transform 180ms ease, box-shadow 180ms ease",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      left: "-7px",
                      top: "9px",
                      bottom: "9px",
                      width: "4px",
                      borderRadius: "999px",
                      background: "#005670",
                      opacity: isActive ? 1 : 0,
                      transform: isActive ? "scaleY(1)" : "scaleY(0.4)",
                      transition: "opacity 160ms ease, transform 160ms ease",
                    }}
                  />
                  <span
                    className={isActive ? "ims-rail-icon ims-rail-icon--active" : "ims-rail-icon"}
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "11px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: isActive ? "rgba(255,255,255,0.18)" : "#eef4f6",
                      color: isActive ? "#ffffff" : "#005670",
                      fontSize: "11px",
                      fontWeight: 900,
                      letterSpacing: "0.02em",
                      boxSizing: "border-box",
                      transition: "background 180ms ease, color 180ms ease, transform 180ms ease",
                    }}
                  >
                    <RailIcon icon={item.icon} />
                  </span>
                  <span
                    style={{
                      opacity: railOpen ? 1 : 0,
                      transform: railOpen ? "translateX(0)" : "translateX(-6px)",
                      transition: "opacity 150ms ease, transform 150ms ease",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      fontSize: "14px",
                      fontWeight: 800,
                    }}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>
      ) : null}

      <main>
        <div
          style={{
            maxWidth: "1320px",
            width: "100%",
            margin: "0 auto",
            padding: isFieldInspectionMode
              ? "12px 10px 28px"
              : showSideRail
              ? "28px 24px 36px 98px"
              : "28px 24px 36px",
            boxSizing: "border-box",
          }}
        >
          {pageAccessAllowed ? (
            <>
              {!isHomePage && !isFieldInspectionMode ? <ImsPermissionNotice /> : null}
              {children}
            </>
          ) : (
            <section
              style={{
                background: "#ffffff",
                border: "1px solid #dbe3ef",
                borderRadius: "18px",
                padding: "24px",
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
                display: "grid",
                gap: "14px",
                maxWidth: "760px",
              }}
            >
              <div
                style={{
                  background: "linear-gradient(135deg, #005670 0%, #005670 64%, #63B1BC 160%)",
                  color: "#ffffff",
                  borderRadius: "14px",
                  padding: "18px 20px",
                }}
              >
                <div style={{ fontSize: "12px", fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                  Access Restricted
                </div>
                <h1 style={{ margin: "8px 0 0", fontSize: "28px", lineHeight: 1.1 }}>You do not currently have access to this area.</h1>
              </div>
              <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
                Your current role or individual permissions do not include the {moduleTitle} workspace. If this looks wrong, ask an Admin to review your role or permission override in Admin / Settings.
              </p>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <Link
                  href="/home"
                  style={{
                    background: "#005670",
                    color: "#ffffff",
                    textDecoration: "none",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    fontWeight: 800,
                  }}
                >
                  Back to Home
                </Link>
                {signedInName ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      borderRadius: "10px",
                      padding: "12px 14px",
                      background: "#eef4f6",
                      color: "#334155",
                      fontWeight: 800,
                    }}
                  >
                    Signed in as {signedInName}
                  </span>
                ) : null}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
    </ImsPermissionProvider>
  );
}

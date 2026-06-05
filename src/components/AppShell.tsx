"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type AppShellProps = {
  children: React.ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  icon: NavIconKey;
};

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
  | "ainm";

const qualityNavItems: NavItem[] = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/quality", label: "Dashboard", icon: "dashboard" },
  { href: "/documents", label: "Documents", icon: "documents" },
  { href: "/certification", label: "Certification", icon: "certification" },
  { href: "/moc", label: "MOC", icon: "moc" },
  { href: "/ncr-capa", label: "NCR / CAPA", icon: "ncr" },
  { href: "/audits", label: "Audits", icon: "audits" },
  { href: "/quality/actions", label: "Actions", icon: "actions" },
  { href: "/reports", label: "Reports", icon: "reports" },
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
  { href: "/hse/inspections", label: "Inspections", icon: "inspection" },
  { href: "/hse/actions", label: "Actions", icon: "actions" },
  { href: "/hse/reports", label: "Reports", icon: "reports" },
];

const adminNavItems: NavItem[] = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/admin", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/departments", label: "Depts", icon: "departments" },
  { href: "/admin/people-roles", label: "People", icon: "people" },
  { href: "/admin/document-control", label: "Documents", icon: "documents" },
  { href: "/admin/assets", label: "Assets", icon: "assets" },
  { href: "/admin/risk", label: "Risk", icon: "risk" },
  { href: "/admin/actions", label: "Actions", icon: "actions" },
  { href: "/admin/system", label: "System", icon: "system" },
];

const peopleNavItems: NavItem[] = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/people", label: "People", icon: "people" },
];

const actionNavItems: NavItem[] = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/actions", label: "Actions", icon: "actions" },
];

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
  const isLoginPage = pathname === "/login";
  const isHomePage = pathname === "/home";
  const isAssetModule = pathname.startsWith("/assets");
  const isRiskModule = pathname.startsWith("/risk");
  const isHseModule = pathname.startsWith("/hse");
  const isAdminModule = pathname.startsWith("/admin");
  const isPeopleModule = pathname.startsWith("/people");
  const isActionModule = pathname === "/actions";
  const showLogo = !isLoginPage;
  const moduleTitle = isHomePage
    ? "Enshore Management System"
    : isActionModule
    ? "Action Management"
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
  const navItems = isAssetModule
    ? assetNavItems
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
    : qualityNavItems;
  const showSideRail = !isLoginPage && !isHomePage && !isFieldInspectionMode;
  const railOpen = isRailExpanded || isRailPinned;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateFieldInspectionMode = () => {
      const params = new URLSearchParams(window.location.search);
      setIsFieldInspectionMode(
        pathname === "/hse/inspections" &&
        window.innerWidth <= 720 &&
        params.get("view") === "create",
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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted || !user) {
        if (isMounted) setSignedInName("");
        return;
      }

      const email = user.email || "";
      if (email) {
        const { data: person } = await supabase
          .from("people")
          .select("name,email")
          .eq("email", email)
          .maybeSingle();

        if (!isMounted) return;
        setSignedInName(person?.name || user.user_metadata?.name || email);
        return;
      }

      if (isMounted) {
        setSignedInName(user.user_metadata?.name || "");
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

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", scrollbarGutter: "stable" }}>
      <header
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
                  src="/enshore-header-logo.png"
                  alt="Enshore"
                  width={isFieldInspectionMode ? 124 : 202}
                  height={isFieldInspectionMode ? 32 : 52}
                  priority
                  style={{ width: "100%", height: "auto", objectFit: "contain" }}
                />
              </span>
            ) : null}
          </div>

          <div
            style={{
              width: "100%",
              maxWidth: "1320px",
              margin: "0 auto",
              padding: isFieldInspectionMode ? 0 : "12px 24px 12px 98px",
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
                {isFieldInspectionMode ? "HSE Field Inspection" : moduleTitle}
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
                  color: "#2F7F7D",
                  border: "1px solid #BFE5E3",
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
                      background: "#EEF8F7",
                      color: "#2F7F7D",
                      border: "1px solid #BFE5E3",
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
      </header>

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
              background: isRailPinned ? "#EEF8F7" : "#ffffff",
              color: isRailPinned ? "#2F7F7D" : "#475569",
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
                background: isRailPinned ? "#D7EFEE" : "#eef4f6",
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
                    background: isActive ? "#3A9B98" : "transparent",
                    color: isActive ? "#ffffff" : "#0f172a",
                    border: isActive ? "1px solid #3A9B98" : "1px solid transparent",
                    transition: "background 160ms ease, color 160ms ease, border-color 160ms ease",
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
                      background: "#3A9B98",
                      opacity: isActive ? 1 : 0,
                      transform: isActive ? "scaleY(1)" : "scaleY(0.4)",
                      transition: "opacity 160ms ease, transform 160ms ease",
                    }}
                  />
                  <span
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "11px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: isActive ? "rgba(255,255,255,0.18)" : "#eef4f6",
                      color: isActive ? "#ffffff" : "#2F7F7D",
                      fontSize: "11px",
                      fontWeight: 900,
                      letterSpacing: "0.02em",
                      boxSizing: "border-box",
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
          {children}
        </div>
      </main>
    </div>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type AppShellProps = {
  children: React.ReactNode;
};

const qualityNavItems = [
  { href: "/home", label: "Home" },
  { href: "/", label: "Dashboard" },
  { href: "/documents", label: "Documents" },
  { href: "/moc", label: "MOC" },
  { href: "/ncr-capa", label: "NCR / CAPA" },
  { href: "/audits", label: "Audits" },
  { href: "/quality/actions", label: "Actions" },
  { href: "/reports", label: "Reports" },
];

const assetNavItems = [
  { href: "/home", label: "Home" },
  { href: "/assets/dashboard", label: "Dashboard" },
  { href: "/assets", label: "Assets" },
  { href: "/assets/calibration", label: "Calibration" },
  { href: "/assets/inspection", label: "Inspection" },
  { href: "/assets/maintenance", label: "Maintenance" },
  { href: "/assets/actions", label: "Actions" },
  { href: "/assets/reports", label: "Reports" },
];

const riskNavItems = [
  { href: "/home", label: "Home" },
  { href: "/risk", label: "Dashboard" },
  { href: "/risk/register", label: "Register" },
  { href: "/risk/reviews", label: "Reviews" },
  { href: "/risk/controls", label: "Controls" },
  { href: "/risk/opportunities", label: "Opportunities" },
  { href: "/risk/actions", label: "Actions" },
  { href: "/risk/reports", label: "Reports" },
];

const hseNavItems = [
  { href: "/home", label: "Home" },
  { href: "/hse", label: "Dashboard" },
  { href: "/hse/ainm", label: "AINM" },
  { href: "/hse/incidents", label: "Incidents" },
  { href: "/hse/inspections", label: "Inspections" },
  { href: "/hse/risk-assessments", label: "Risk Assess." },
  { href: "/hse/environmental", label: "Enviro" },
  { href: "/hse/actions", label: "Actions" },
  { href: "/hse/reports", label: "Reports" },
];

const adminNavItems = [
  { href: "/home", label: "Home" },
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/departments", label: "Depts" },
  { href: "/admin/people-roles", label: "People" },
  { href: "/admin/document-control", label: "Documents" },
  { href: "/admin/assets", label: "Assets" },
  { href: "/admin/risk", label: "Risk" },
  { href: "/admin/actions", label: "Actions" },
  { href: "/admin/system", label: "System" },
];

const peopleNavItems = [
  { href: "/home", label: "Home" },
  { href: "/people", label: "People" },
];

const actionNavItems = [
  { href: "/home", label: "Home" },
  { href: "/actions", label: "Actions" },
];

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [isFieldInspectionMode, setIsFieldInspectionMode] = useState(false);
  const isLoginPage = pathname === "/login";
  const isHomePage = pathname === "/home";
  const isAssetModule = pathname.startsWith("/assets");
  const isRiskModule = pathname.startsWith("/risk");
  const isHseModule = pathname.startsWith("/hse");
  const isAdminModule = pathname.startsWith("/admin");
  const isPeopleModule = pathname.startsWith("/people");
  const isActionModule = pathname === "/actions";
  const showLogo = !isHomePage;
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 1000,
          background: "#0f766e",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 4px 16px rgba(15, 23, 42, 0.10)",
        }}
      >
        <div
          style={{
            maxWidth: "1320px",
            margin: "0 auto",
            padding: isFieldInspectionMode ? "8px 12px" : "14px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: isFieldInspectionMode ? "8px" : "20px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: isFieldInspectionMode ? "8px" : "14px", flexWrap: "wrap" }}>
            {showLogo ? (
              <Image
                src="/enshore-logo.png"
                alt="Enshore"
                width={isFieldInspectionMode ? 84 : 128}
                height={32}
                priority
                style={{ width: isFieldInspectionMode ? "84px" : "128px", height: "auto", objectFit: "contain" }}
              />
            ) : null}

            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <div
                style={{
                  color: "white",
                  fontWeight: 700,
                  fontSize: isFieldInspectionMode ? "15px" : "20px",
                  letterSpacing: "-0.01em",
                }}
              >
                {isFieldInspectionMode ? "HSE Field Inspection" : moduleTitle}
              </div>
              {moduleSubtitle && !isFieldInspectionMode ? (
                <div
                  style={{
                    color: "rgba(255,255,255,0.75)",
                    fontSize: "12px",
                    fontWeight: 500,
                  }}
                >
                  {moduleSubtitle}
                </div>
              ) : null}
            </div>
          </div>

          {!isLoginPage && !isFieldInspectionMode && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              {!isHomePage ? (
                <nav
                  style={{
                    display: "flex",
                    gap: "8px",
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  {navItems.map((item) => {
                    const isActive =
                      item.href === "/" ||
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
                        style={{
                          color: "white",
                          textDecoration: "none",
                          fontWeight: 600,
                          fontSize: "13.5px",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          background: isActive
                            ? "rgba(255,255,255,0.20)"
                            : "rgba(255,255,255,0.08)",
                          border: isActive
                            ? "1px solid rgba(255,255,255,0.18)"
                            : "1px solid transparent",
                        }}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              ) : null}

              <button
                onClick={handleLogout}
                style={{
                  background: "rgba(255,255,255,0.12)",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  fontWeight: 700,
                  fontSize: "13.5px",
                  cursor: "pointer",
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      <main>
        <div
          style={{
            maxWidth: "1320px",
            margin: "0 auto",
            padding: isFieldInspectionMode ? "12px 10px 28px" : "28px 24px 36px",
          }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}

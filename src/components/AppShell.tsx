"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  { href: "/actions", label: "Actions" },
  { href: "/reports", label: "Reports" },
];

const assetNavItems = [
  { href: "/home", label: "Home" },
  { href: "/assets/dashboard", label: "Dashboard" },
  { href: "/assets", label: "Assets" },
  { href: "/assets/calibration", label: "Calibration" },
  { href: "/assets/inspection", label: "Inspection" },
  { href: "/assets/maintenance", label: "Maintenance" },
];

const peopleNavItems = [
  { href: "/home", label: "Home" },
  { href: "/people", label: "People" },
];

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const isHomePage = pathname === "/home";
  const isAssetModule = pathname.startsWith("/assets");
  const isPeopleModule = pathname.startsWith("/people");
  const showLogo = !isHomePage;
  const moduleTitle = isHomePage
    ? "Enshore Management System"
    : isAssetModule
    ? "Asset Management"
    : isPeopleModule
    ? "People Management"
    : pathname.startsWith("/hse")
    ? "HSE Management"
    : "Quality Management";
  const moduleSubtitle = isHomePage
    ? ""
    : isAssetModule
    ? "Asset register and control system"
    : isPeopleModule
    ? "Shared people directory and status management"
    : pathname.startsWith("/hse")
    ? "Health, safety and environment system"
    : "Quality management system";
  const navItems = isAssetModule ? assetNavItems : isPeopleModule ? peopleNavItems : qualityNavItems;

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
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
            {showLogo ? (
              <Image
                src="/enshore-logo.png"
                alt="Enshore"
                width={128}
                height={32}
                priority
                style={{ width: "128px", height: "auto", objectFit: "contain" }}
              />
            ) : null}

            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <div
                style={{
                  color: "white",
                  fontWeight: 700,
                  fontSize: "20px",
                  letterSpacing: "-0.01em",
                }}
              >
                {moduleTitle}
              </div>
              {moduleSubtitle ? (
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

          {!isLoginPage && (
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
                      item.href === "/" || item.href === "/home" || item.href === "/assets"
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
            padding: "28px 24px 36px",
          }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}

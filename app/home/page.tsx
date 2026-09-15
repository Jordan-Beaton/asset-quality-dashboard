"use client";

import Link from "next/link";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useImsPermissions } from "../../src/components/ImsPermissions";

const moduleCards = [
  {
    title: "Field Tools",
    short: "Field",
    icon: "field",
    description: "Simple mobile access to inspections, reports, observations, and asset field records.",
    href: "/field-tools",
    moduleKey: "field-tools",
    status: "Live",
    group: "Operations",
    cta: "Open",
  },
  {
    title: "Project Management",
    short: "Projects",
    icon: "projects",
    description: "Project workspaces for ITP control, delivery registers, quality annexes, and reporting.",
    href: "/projects",
    moduleKey: "projects",
    status: "Live",
    group: "Projects",
    cta: "Enter",
  },
  {
    title: "Quality Management",
    short: "Quality",
    icon: "quality",
    description: "NCR, audits, MOC, reporting, and HSEQ workflow control.",
    href: "/quality",
    moduleKey: "quality",
    status: "Live",
    group: "Core IMS",
    cta: "Enter",
  },
  {
    title: "Lessons Learnt",
    short: "Lessons",
    icon: "lessons",
    description: "Searchable project knowledge, repeat-failure links, photo evidence, action ownership, and trend analysis.",
    href: "/lessons-learned",
    moduleKey: "lessons",
    status: "Live",
    group: "Core IMS",
    cta: "Explore",
  },
  {
    title: "HSE Management",
    short: "HSE",
    icon: "hse",
    description: "AINM, inspections, evidence capture, HSE actions, and report packs.",
    href: "/hse",
    moduleKey: "hse",
    status: "Live",
    group: "Operations",
    cta: "Enter",
  },
  {
    title: "Asset Management",
    short: "Assets",
    icon: "assets",
    description: "Asset register, calibration, inspection, maintenance, and linked actions.",
    href: "/assets",
    moduleKey: "assets",
    status: "Live",
    group: "Operations",
    cta: "Enter",
  },
  {
    title: "Document Control",
    short: "Docs",
    icon: "documents",
    description: "Controlled files, register status, reviews, approvals, archive, and reports.",
    href: "/documents",
    moduleKey: "documents",
    status: "Live",
    group: "Control",
    cta: "Open",
  },
  {
    title: "Action Management",
    short: "Actions",
    icon: "actions",
    description: "Central follow-up register linking Quality, HSE, Assets, Risk, MOC, and evidence.",
    href: "/actions",
    moduleKey: "actions",
    status: "Live",
    group: "Control",
    cta: "Open",
  },
  {
    title: "Risk Management",
    short: "Risk",
    icon: "risk",
    description: "Risk register foundation, reviews, controls, opportunities, and reporting shell.",
    href: "/risk",
    moduleKey: "risk",
    status: "Ready",
    group: "Governance",
    cta: "Open",
  },
  {
    title: "Management Review",
    short: "Review",
    icon: "review",
    description: "Read-only management pack view across system health, actions, risk, documents, and assets.",
    href: "/management-review",
    moduleKey: "management-review",
    status: "Ready",
    group: "Governance",
    cta: "Review",
  },
  {
    title: "People Management",
    short: "People",
    icon: "people",
    description: "Shared people source for owners, inspectors, originators, reviewers, approvers, and roles.",
    href: "/people",
    moduleKey: "people",
    status: "Ready",
    group: "Master Data",
    cta: "Open",
  },
  {
    title: "Admin / Settings",
    short: "Admin",
    icon: "admin",
    description: "System configuration shell for master data, roles, numbering, and module settings.",
    href: "/admin",
    moduleKey: "admin",
    status: "Shell",
    group: "Master Data",
    cta: "Configure",
  },
] as const;

type ModuleIcon = (typeof moduleCards)[number]["icon"];
type ModuleCard = (typeof moduleCards)[number];
type HomeView = "grid" | "compact" | "hub" | "mission" | "constellation" | "holodeck" | "list";

const homeViews: Array<{ id: HomeView; label: string }> = [
  { id: "grid", label: "Card grid" },
  { id: "compact", label: "Compact tiles" },
  { id: "hub", label: "IMS hub" },
  { id: "mission", label: "Mission Control" },
  { id: "constellation", label: "Constellation" },
  { id: "holodeck", label: "Holo Deck" },
];

type StatusTone = "live" | "ready" | "shell";

function getStatusTone(status: ModuleCard["status"]): StatusTone {
  if (status === "Live") return "live";
  if (status === "Ready") return "ready";
  return "shell";
}

function getModuleInitials(title: string) {
  return title
    .split(/[\s/]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

const STATUS_TONE_LABEL: Record<StatusTone, string> = {
  live: "Connected",
  ready: "Ready",
  shell: "In Build",
};

const GROUP_POSITIONS: Record<string, [number, number]> = {
  Operations: [18, 22],
  "Core IMS": [50, 12],
  Control: [82, 22],
  Projects: [85, 62],
  Governance: [50, 88],
  "Master Data": [15, 62],
};

const CONSTELLATION_GROUP_ORDER = ["Operations", "Core IMS", "Control", "Projects", "Governance", "Master Data"];

function ModuleIconGlyph({ icon }: { icon: ModuleIcon }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (icon === "field") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" style={iconSvgStyle}>
        <rect {...common} x="7" y="2.5" width="10" height="19" rx="2" />
        <path {...common} d="M10 6h4M10 17h4M12 12h.01" />
      </svg>
    );
  }

  if (icon === "quality") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" style={iconSvgStyle}>
        <path {...common} d="M8 4h8l1 3h2v13H5V7h2z" />
        <path {...common} d="m8.5 13 2.2 2.2 4.8-5" />
      </svg>
    );
  }

  if (icon === "projects") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" style={iconSvgStyle}>
        <path {...common} d="M3 7h7l2 2h9v11H3z" />
        <path {...common} d="M3 7V4h7l2 3M8 14h8M12 11v6" />
      </svg>
    );
  }

  if (icon === "lessons") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" style={iconSvgStyle}>
        <path {...common} d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" />
        <path {...common} d="M8 4v16M11 9h5M11 13h5" />
      </svg>
    );
  }

  if (icon === "hse") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" style={iconSvgStyle}>
        <path {...common} d="M12 3 20 6v6c0 5-3.4 7.7-8 9-4.6-1.3-8-4-8-9V6z" />
        <path {...common} d="M12 8v7M8.5 11.5h7" />
      </svg>
    );
  }

  if (icon === "assets") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" style={iconSvgStyle}>
        <path {...common} d="M12 3 4.5 7.2v8.6L12 20l7.5-4.2V7.2z" />
        <path {...common} d="M4.8 7.4 12 11.5l7.2-4.1M12 11.5V20" />
      </svg>
    );
  }

  if (icon === "documents") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" style={iconSvgStyle}>
        <path {...common} d="M7 3h7l4 4v14H7z" />
        <path {...common} d="M14 3v5h5M9.5 12h6M9.5 16h6" />
      </svg>
    );
  }

  if (icon === "actions") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" style={iconSvgStyle}>
        <path {...common} d="M4 6h12M4 12h9M4 18h7" />
        <path {...common} d="m16 15 2 2 3-4" />
      </svg>
    );
  }

  if (icon === "risk") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" style={iconSvgStyle}>
        <path {...common} d="M12 3 21 20H3z" />
        <path {...common} d="M12 9v5M12 17h.01" />
      </svg>
    );
  }

  if (icon === "review") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" style={iconSvgStyle}>
        <path {...common} d="M4 19V5M4 19h16" />
        <path {...common} d="M8 15v-4M12 15V8M16 15v-6" />
      </svg>
    );
  }

  if (icon === "people") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" style={iconSvgStyle}>
        <path {...common} d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
        <path {...common} d="M3.5 20a5 5 0 0 1 9 0M13.5 19a4 4 0 0 1 7 0" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={iconSvgStyle}>
      <path {...common} d="M5 7h14M5 12h14M5 17h14" />
      <path {...common} d="M9 7v0M15 12v0M11 17v0" />
    </svg>
  );
}

export default function HomePage() {
  const permissions = useImsPermissions();
  const [pendingRequests, setPendingRequests] = useState<Array<{ id: string; first_name: string; last_name: string; email: string; department: string; requested_modules: string[]; submitted_at: string }>>([]);
  const [heroTilt, setHeroTilt] = useState({ x: 0, y: 0 });
  const [homeView, setHomeView] = useState<HomeView>("grid");
  const [isMobileHome, setIsMobileHome] = useState(false);
  const [viewPreferenceLoaded, setViewPreferenceLoaded] = useState(false);
  const [missionClock, setMissionClock] = useState("--:--:--");
  const [holoParticles, setHoloParticles] = useState<Array<{ left: number; duration: number; delay: number }>>([]);
  const [holoTilts, setHoloTilts] = useState<Record<string, { x: number; y: number }>>({});
  const [constellationSize, setConstellationSize] = useState({ width: 0, height: 0 });
  const headerVideoRef = useRef<HTMLVideoElement>(null);
  const hubVideoRef = useRef<HTMLVideoElement>(null);
  const constellationRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 720px)");
    const update = () => setIsMobileHome(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => { if (!permissions.loaded || !permissions.isAdmin) return; void fetch("/api/admin-settings", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((json) => setPendingRequests((json?.accessRequests || []).filter((request: { status: string }) => request.status === "Pending"))).catch(() => undefined); }, [permissions.isAdmin, permissions.loaded]);
  useEffect(() => {
    const savedView = window.localStorage.getItem("enshore-ims-home-view");
    if (savedView && homeViews.some((view) => view.id === savedView)) setHomeView(savedView as HomeView);
    setViewPreferenceLoaded(true);
  }, []);
  useEffect(() => {
    if (!viewPreferenceLoaded) return;
    window.localStorage.setItem("enshore-ims-home-view", homeView);
  }, [homeView, viewPreferenceLoaded]);
  const effectiveHomeView: HomeView = isMobileHome ? "list" : homeView;
  useEffect(() => {
    if (effectiveHomeView !== "hub") return;
    const master = headerVideoRef.current;
    const follower = hubVideoRef.current;
    if (!master || !follower) return;
    const synchronize = () => {
      if (!Number.isFinite(master.duration) || master.duration <= 0 || follower.readyState < 1) return;
      const targetTime = master.currentTime % master.duration;
      if (Math.abs(follower.currentTime - targetTime) > 0.08) follower.currentTime = targetTime;
      if (master.paused) follower.pause();
      else if (follower.paused) void follower.play().catch(() => undefined);
    };
    synchronize();
    const timer = window.setInterval(synchronize, 400);
    return () => window.clearInterval(timer);
  }, [effectiveHomeView]);
  useEffect(() => {
    if (effectiveHomeView !== "mission") return;
    const update = () => setMissionClock(new Date().toLocaleTimeString("en-GB", { hour12: false }));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [effectiveHomeView]);
  useEffect(() => {
    if (effectiveHomeView !== "holodeck") return;
    setHoloParticles(
      Array.from({ length: 22 }).map(() => ({
        left: Math.random() * 100,
        duration: 8 + Math.random() * 10,
        delay: Math.random() * -18,
      }))
    );
  }, [effectiveHomeView]);
  useEffect(() => {
    if (effectiveHomeView !== "constellation") return;
    const el = constellationRef.current;
    if (!el) return;
    const update = () => setConstellationSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [effectiveHomeView]);
  const isModuleAccessible = (moduleKey: (typeof moduleCards)[number]["moduleKey"]) => {
    if (!permissions.loaded) return true;
    if (moduleKey === "field-tools") {
      return permissions.canAccessModule("hse") || permissions.canAccessModule("assets");
    }
    return permissions.canAccessModule(moduleKey);
  };
  const renderModuleCard = (card: ModuleCard, cardIndex: number, variant: "standard" | "compact" | "list" | "hub" = "standard") => {
    const hasAccess = isModuleAccessible(card.moduleKey);
    const shellStyle = {
      ...cardShellStyle,
      cursor: hasAccess ? "pointer" : "not-allowed",
    };
    const cardContent = (
      <article
        className={`${hasAccess ? "home-module-card" : ""} module-card-${variant}`}
        style={{
          ...cardStyle,
          animationDelay: `${Math.min(cardIndex, 7) * 55}ms`,
          opacity: hasAccess ? 1 : 0.64,
          filter: hasAccess ? "none" : "grayscale(0.18)",
        }}
      >
        <span className="card-glow" aria-hidden="true" style={cardGlowStyle} />
        <div style={cardTopLineStyle}>
          <span className="module-icon" style={moduleIconStyle}><ModuleIconGlyph icon={card.icon} /></span>
          <span className="module-launch-arrow" aria-hidden="true">{hasAccess ? "↗" : "—"}</span>
        </div>
        <div style={cardBodyStyle}>
          <h3 style={cardTitleStyle}>{card.title}</h3>
          <span className="module-access-label">{hasAccess ? "Open workspace" : "Access not assigned"}</span>
        </div>
        <div style={cardFooterStyle}>
          <span style={{ ...cardShortStyle, color: hasAccess ? "#005670" : "#53565A" }}>
            <span style={{ ...connectorDotStyle, background: hasAccess ? "#005670" : "#D0D0CE", boxShadow: hasAccess ? "0 0 0 5px rgba(0,86,112,0.12)" : "none" }} />
            {card.short}
          </span>
          <span className={hasAccess ? "module-connection live" : "module-connection"}>{hasAccess ? "Connected" : "Restricted"}</span>
        </div>
      </article>
    );
    if (!hasAccess) return <div key={card.title} style={shellStyle} aria-disabled="true" title="No access assigned for this module.">{cardContent}</div>;
    return <Link key={card.title} href={card.href} style={shellStyle}>{cardContent}</Link>;
  };

  const renderMissionTile = (card: ModuleCard, index: number) => {
    const hasAccess = isModuleAccessible(card.moduleKey);
    const tone: StatusTone = hasAccess ? getStatusTone(card.status) : "shell";
    const label = hasAccess ? STATUS_TONE_LABEL[tone].toUpperCase() : "NO ACCESS";
    const inner = (
      <>
        <div className="mc-tile-top">
          <span className="mc-icon">{getModuleInitials(card.title)}</span>
          <span className={`mc-dot mc-dot-${tone}`} aria-hidden="true" />
        </div>
        <h3 className="mc-title">{card.title}</h3>
        <div className="mc-group">{card.group}</div>
        <div className="mc-stat">
          <span className="mc-stat-k">Status</span>
          <span className={`mc-stat-v mc-stat-v-${tone}`}>{label}</span>
        </div>
      </>
    );
    if (!hasAccess) {
      return (
        <div
          key={card.title}
          className="mc-tile mc-tile-disabled"
          style={{ animationDelay: `${(index % 6) * -1}s` }}
          aria-disabled="true"
          title="No access assigned for this module."
        >
          {inner}
        </div>
      );
    }
    return (
      <Link key={card.title} href={card.href} className="mc-tile" style={{ animationDelay: `${(index % 6) * -1}s` }}>
        {inner}
      </Link>
    );
  };

  const renderConstellationNode = (card: ModuleCard) => {
    const hasAccess = isModuleAccessible(card.moduleKey);
    const tone: StatusTone = hasAccess ? getStatusTone(card.status) : "shell";
    const inner = (
      <span className="cn-name">
        <span className={`cn-dot cn-dot-${tone}`} aria-hidden="true" />
        {card.title}
      </span>
    );
    if (!hasAccess) {
      return (
        <div key={card.title} className="cn-node cn-node-disabled" aria-disabled="true" title="No access assigned for this module.">
          {inner}
        </div>
      );
    }
    return (
      <Link key={card.title} href={card.href} className="cn-node">
        {inner}
      </Link>
    );
  };

  const renderHoloCard = (card: ModuleCard, index: number) => {
    const hasAccess = isModuleAccessible(card.moduleKey);
    const tone: StatusTone = hasAccess ? getStatusTone(card.status) : "shell";
    const label = hasAccess ? STATUS_TONE_LABEL[tone] : "No access";
    const tilt = holoTilts[card.title];
    const transform = tilt ? `rotateY(${tilt.x * 14}deg) rotateX(${tilt.y * -14}deg) translateZ(6px)` : undefined;
    const handleMove = (event: ReactMouseEvent<HTMLElement>) => {
      const bounds = event.currentTarget.getBoundingClientRect();
      setHoloTilts((current) => ({
        ...current,
        [card.title]: {
          x: (event.clientX - bounds.left) / bounds.width - 0.5,
          y: (event.clientY - bounds.top) / bounds.height - 0.5,
        },
      }));
    };
    const handleLeave = () => {
      setHoloTilts((current) => {
        const next = { ...current };
        delete next[card.title];
        return next;
      });
    };
    const inner = (
      <>
        <span className="holo-sheen" aria-hidden="true" />
        <span className="holo-icon">{getModuleInitials(card.title)}</span>
        <h3 className="holo-title">{card.title}</h3>
        <div className="holo-group">{card.group}</div>
        <div className="holo-footer">
          <span className={`holo-pill holo-pill-${tone}`}>{label}</span>
          {hasAccess ? <span className="holo-cta">Open &rarr;</span> : null}
        </div>
      </>
    );
    const sharedProps = {
      className: `holo-card${hasAccess ? "" : " holo-card-disabled"}`,
      style: { animationDelay: `${-(index % 5)}s`, transform },
      onMouseMove: handleMove,
      onMouseLeave: handleLeave,
    };
    if (!hasAccess) {
      return (
        <div key={card.title} {...sharedProps} aria-disabled="true" title="No access assigned for this module.">
          {inner}
        </div>
      );
    }
    return (
      <Link key={card.title} {...sharedProps} href={card.href}>
        {inner}
      </Link>
    );
  };

  const constellationClusters = CONSTELLATION_GROUP_ORDER.map((group) => ({
    group,
    pos: GROUP_POSITIONS[group] || [50, 50],
    cards: moduleCards.filter((card) => card.group === group),
  })).filter((cluster) => cluster.cards.length > 0);

  return (
    <main className="ims-home-page" style={pageStyle}>
      <style>
        {`
          @keyframes imsOrbitSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          @keyframes imsOrbitCounterSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(-360deg); }
          }

          @keyframes imsOrbitSpinReverse {
            from { transform: rotate(360deg); }
            to { transform: rotate(0deg); }
          }

          @keyframes imsOrbitCounterSpinReverse {
            from { transform: rotate(-360deg); }
            to { transform: rotate(0deg); }
          }

          @keyframes imsCenteredSpin {
            from { transform: translate(-50%, -50%) rotate(0deg); }
            to { transform: translate(-50%, -50%) rotate(360deg); }
          }

          @keyframes imsCenteredSpinReverse {
            from { transform: translate(-50%, -50%) rotate(360deg); }
            to { transform: translate(-50%, -50%) rotate(0deg); }
          }

          @keyframes imsHeroScan {
            0% { transform: translateY(-140%); opacity: 0; }
            18% { opacity: 0.55; }
            70% { opacity: 0.18; }
            100% { transform: translateY(520%); opacity: 0; }
          }

          @keyframes imsSignalPulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(99,177,188,0.65); }
            50% { box-shadow: 0 0 0 7px rgba(99,177,188,0); }
          }

          @keyframes imsCardReveal {
            from { opacity: 0; transform: translateY(14px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .home-ims-hero {
            transition: transform 220ms ease-out, box-shadow 220ms ease-out;
            transform-style: preserve-3d;
          }

          .hero-grid {
            position: absolute;
            inset: 0;
            opacity: 0.2;
            background-image: linear-gradient(rgba(255,255,255,.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.14) 1px, transparent 1px);
            background-size: 34px 34px;
            mask-image: radial-gradient(circle at 72% 50%, rgba(0,0,0,.9), transparent 72%);
            pointer-events: none;
          }

          .hero-scan {
            position: absolute;
            left: 0;
            right: 38%;
            top: 0;
            height: 76px;
            background: linear-gradient(180deg, transparent, rgba(99,177,188,.13), transparent);
            animation: imsHeroScan 8s ease-in-out infinite;
            pointer-events: none;
          }

          .ambient-ring { position: absolute; left: 50%; top: 50%; border-radius: 50%; border: 1px solid rgba(255,255,255,.16); transform: translate(-50%, -50%); }
          .ambient-ring-one { width: 142px; height: 142px; border-color: rgba(99,177,188,.62); box-shadow: 0 0 42px rgba(99,177,188,.2); }
          .ambient-ring-two { width: 205px; height: 205px; border-style: dashed; border-color: rgba(255,255,255,.2); animation: imsCenteredSpin 32s linear infinite; }
          .ambient-ring-three { width: 270px; height: 270px; border-color: rgba(255,255,255,.1); animation: imsCenteredSpinReverse 48s linear infinite; }
          .ambient-node { position: absolute; width: 8px; height: 8px; border-radius: 50%; background: #63B1BC; box-shadow: 0 0 0 5px rgba(99,177,188,.1), 0 0 22px rgba(99,177,188,.75); }
          .node-one { left: 50%; top: 6px; }
          .node-two { right: 26px; top: 50%; }
          .node-three { left: 20%; bottom: 36px; width: 5px; height: 5px; }
          .node-four { left: 15px; top: 35%; width: 4px; height: 4px; opacity: .6; }
          .module-launch-arrow { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border: 1px solid #D0D0CE; border-radius: 50%; color: #005670; background: rgba(255,255,255,.76); font-size: 17px; font-weight: 800; transition: 180ms ease; }
          .home-module-card:hover .module-launch-arrow { transform: translate(2px, -2px); background: #005670; border-color: #005670; color: white; }
          .module-access-label { color: #53565A; font-size: 12px; font-weight: 700; }
          .module-connection { display: inline-flex; align-items: center; gap: 6px; color: #53565A; font-size: 10px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
          .module-connection::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: #D0D0CE; }
          .module-connection.live { color: #005670; }
          .module-connection.live::before { background: #63B1BC; box-shadow: 0 0 0 4px rgba(99,177,188,.15); }
          .workspace-view-tools { display: flex; align-items: flex-end; gap: 14px; flex-wrap: wrap; justify-content: flex-end; }
          .workspace-view-select { display: inline-flex; align-items: center; gap: 8px; min-height: 40px; padding: 5px 6px 5px 12px; border: 1px solid #D0D0CE; border-radius: 12px; background: white; color: #005670; box-shadow: 0 6px 16px rgba(15,23,42,.06); font-size: 12px; font-weight: 900; }
          .workspace-view-select select { min-height: 30px; border: 0; border-radius: 8px; outline: 0; background: #ECECE7; color: #005670; padding: 4px 28px 4px 9px; font: inherit; cursor: pointer; }
          .module-compact-view { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
          .module-card-compact { height: 154px !important; min-height: 154px !important; padding: 14px !important; }
          .module-card-compact > div:last-child { display: none !important; }
          .module-card-compact h3 { font-size: 17px !important; }
          .module-list-view { display: grid; gap: 10px; }
          .module-list-view > a, .module-list-view > div { width: 100%; }
          .module-card-list { height: 104px !important; min-height: 104px !important; display: grid !important; grid-template-columns: 82px minmax(0, 1fr) minmax(150px, auto); align-items: center; gap: 16px !important; padding: 14px 18px !important; }
          .module-card-list > div:first-of-type .module-launch-arrow { display: none; }
          .module-card-list > div:last-child { border-top: 0 !important; padding-top: 0 !important; }
          .module-card-list h3 { font-size: 18px !important; }
          .module-hub-view { position: relative; min-height: 680px; overflow: hidden; border: 1px solid rgba(0,86,112,.12); border-radius: 20px; background: radial-gradient(circle at 50% 50%, rgba(99,177,188,.14) 0 15%, transparent 36%), linear-gradient(rgba(0,86,112,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(0,86,112,.035) 1px, transparent 1px), #ECECE7; background-size: auto, 32px 32px, 32px 32px, auto; }
          .hub-connection-ring { position: absolute; left: 50%; top: 50%; width: 74%; height: 76%; transform: translate(-50%, -50%); border: 1px dashed rgba(0,86,112,.2); border-radius: 50%; box-shadow: inset 0 0 70px rgba(99,177,188,.07); animation: imsCenteredSpin 70s linear infinite; }
          .hub-video-core { position: absolute; left: 50%; top: 50%; width: 222px; height: 222px; padding: 10px; transform: translate(-50%, -50%); border: 1px solid rgba(255,255,255,.35); border-radius: 50%; background: #005670; box-shadow: 0 24px 54px rgba(0,86,112,.28), 0 0 0 18px rgba(99,177,188,.1), 0 0 0 19px rgba(0,86,112,.12); box-sizing: border-box; overflow: hidden; z-index: 2; }
          .hub-video-core video { display: block; width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
          .hub-module-position { position: absolute; width: 166px; transform: translate(-50%, -50%); z-index: 3; }
          .hub-module-position > a, .hub-module-position > div { width: 100%; }
          .module-card-hub { height: 92px !important; min-height: 92px !important; padding: 12px !important; gap: 8px !important; box-shadow: 0 10px 24px rgba(15,23,42,.1) !important; }
          .module-card-hub > div:first-of-type { align-items: center; }
          .module-card-hub .module-icon { width: 32px !important; height: 32px !important; border-radius: 10px !important; }
          .module-card-hub .module-launch-arrow { width: 27px !important; height: 27px !important; font-size: 13px !important; }
          .module-card-hub > div:nth-of-type(2) { align-content: start !important; }
          .module-card-hub h3 { font-size: 13px !important; line-height: 1.05 !important; }
          .module-card-hub .module-access-label, .module-card-hub > div:last-child { display: none !important; }

          @keyframes mcDrift { from { background-position: 0 0, 0 0; } to { background-position: 34px 68px, 34px 68px; } }
          @keyframes mcScan { 0% { top: -120px; } 100% { top: 100%; } }
          @keyframes mcFloat { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(30px, 20px); } }
          @keyframes mcShimmer { 0% { background-position: 120% 0; } 100% { background-position: -20% 0; } }
          @keyframes cnHeartbeat { 0%, 100% { box-shadow: 0 0 0 8px rgba(0,86,112,.08), 0 12px 24px rgba(0,86,112,.25); } 50% { box-shadow: 0 0 0 14px rgba(0,86,112,.14), 0 16px 30px rgba(0,86,112,.3); } }
          @keyframes cnFlow { to { stroke-dashoffset: -22; } }
          @keyframes holoAurora { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 50% { transform: translate(3%, -2%) rotate(4deg); } }
          @keyframes holoRise { 0% { transform: translateY(0); opacity: 0; } 10% { opacity: 1; } 90% { opacity: .6; } 100% { transform: translateY(-620px); opacity: 0; } }
          @keyframes holoBreathe { 0%, 100% { box-shadow: 0 10px 24px rgba(0,0,0,.25); } 50% { box-shadow: 0 10px 24px rgba(0,0,0,.25), 0 0 0 1px rgba(99,177,188,.35); } }

          .mc-console { position: relative; overflow: hidden; border-radius: 22px; padding: 26px 24px; background: radial-gradient(ellipse at 50% -10%, rgba(0,0,0,.05) 0%, rgba(0,0,0,.5) 55%, rgba(0,0,0,.7) 100%), #005670; box-shadow: 0 30px 60px rgba(0,0,0,.35); }
          .mc-drift-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(99,177,188,.09) 1px, transparent 1px), linear-gradient(90deg, rgba(99,177,188,.09) 1px, transparent 1px); background-size: 34px 34px; animation: mcDrift 18s linear infinite; pointer-events: none; }
          .mc-scanline { position: absolute; left: 0; right: 0; height: 120px; background: linear-gradient(180deg, transparent, rgba(99,177,188,.16) 45%, transparent); animation: mcScan 7s ease-in-out infinite; pointer-events: none; }
          .mc-glow-orb { position: absolute; width: 340px; height: 340px; border-radius: 50%; background: radial-gradient(circle, rgba(99,177,188,.16), transparent 70%); filter: blur(4px); animation: mcFloat 14s ease-in-out infinite; pointer-events: none; }
          .mc-glow-orb-a { top: -80px; left: -60px; }
          .mc-glow-orb-b { bottom: -100px; right: -40px; animation-delay: -7s; }
          .mc-head { position: relative; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
          .mc-head-title { color: #FFFFFF; font-weight: 800; font-size: 15px; letter-spacing: .04em; }
          .mc-head-title span { color: #63B1BC; font-family: ui-monospace, SFMono-Regular, "Courier New", monospace; font-weight: 700; font-size: 11px; letter-spacing: .1em; display: block; margin-top: 2px; }
          .mc-clock { font-family: ui-monospace, SFMono-Regular, "Courier New", monospace; color: #63B1BC; font-size: 13px; letter-spacing: .05em; display: flex; align-items: center; gap: 8px; }
          .mc-live-dot { width: 7px; height: 7px; border-radius: 50%; background: #63B1BC; animation: imsSignalPulse 1.8s ease-in-out infinite; }
          .mc-grid { position: relative; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
          .mc-tile { position: relative; overflow: hidden; display: block; text-decoration: none; background: rgba(255,255,255,.03); border: 1px solid rgba(99,177,188,.25); border-radius: 14px; padding: 14px; cursor: pointer; transition: border-color 150ms ease, background 150ms ease; }
          .mc-tile::after { content: ""; position: absolute; inset: 0; background: linear-gradient(120deg, transparent 40%, rgba(99,177,188,.08) 50%, transparent 60%); background-size: 220% 220%; animation: mcShimmer 6s linear infinite; pointer-events: none; }
          .mc-tile:hover { border-color: #63B1BC; background: rgba(99,177,188,.08); }
          .mc-tile-disabled { cursor: not-allowed; }
          .mc-tile-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; position: relative; }
          .mc-icon { width: 34px; height: 34px; border-radius: 9px; background: rgba(99,177,188,.15); display: flex; align-items: center; justify-content: center; color: #63B1BC; font-weight: 800; font-size: 13px; }
          .mc-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 4px; }
          .mc-dot-live { background: #63B1BC; animation: imsSignalPulse 1.8s ease-in-out infinite; }
          .mc-dot-ready { background: #FFAD00; }
          .mc-dot-shell { background: rgba(255,255,255,.35); }
          .mc-title { position: relative; color: #FFFFFF; font-size: 13.5px; font-weight: 700; margin: 10px 0 2px; }
          .mc-group { position: relative; color: rgba(255,255,255,.5); font-size: 10.5px; text-transform: uppercase; letter-spacing: .06em; font-family: ui-monospace, SFMono-Regular, "Courier New", monospace; }
          .mc-stat { position: relative; margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(99,177,188,.18); display: flex; justify-content: space-between; align-items: center; font-family: ui-monospace, SFMono-Regular, "Courier New", monospace; font-size: 10px; }
          .mc-stat-k { color: rgba(255,255,255,.45); }
          .mc-stat-v-live { color: #63B1BC; }
          .mc-stat-v-ready { color: #FFAD00; }
          .mc-stat-v-shell { color: rgba(255,255,255,.5); }

          .cn-canvas-wrap { background: #FFFFFF; border: 1px solid #D0D0CE; border-radius: 22px; padding: 20px; box-shadow: 0 20px 40px rgba(15,23,42,.06); }
          .cn-canvas { position: relative; width: 100%; height: 560px; }
          .cn-lines { position: absolute; inset: 0; width: 100%; height: 100%; }
          .cn-flow-line { stroke: #63B1BC; stroke-width: 1.5; opacity: .55; stroke-dasharray: 4 7; animation: cnFlow 1.6s linear infinite; }
          .cn-pulse-dot { fill: #63B1BC; filter: drop-shadow(0 0 3px rgba(99,177,188,.9)); }
          .cn-cluster { position: absolute; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; gap: 10px; }
          .cn-cluster-label { background: #005670; color: #FFFFFF; font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; padding: 6px 12px; border-radius: 999px; white-space: nowrap; }
          .cn-cluster-nodes { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; max-width: 230px; }
          .cn-node { display: block; background: #FFFFFF; border: 1.5px solid #63B1BC; border-radius: 12px; padding: 8px 10px; cursor: pointer; text-align: center; min-width: 96px; text-decoration: none; transition: transform 120ms ease, box-shadow 120ms ease; }
          .cn-node:hover { transform: translateY(-2px); box-shadow: 0 8px 18px rgba(0,86,112,.18); border-color: #005670; }
          .cn-node-disabled { cursor: not-allowed; opacity: .6; }
          .cn-name { font-size: 11.5px; font-weight: 800; color: #000000; line-height: 1.25; }
          .cn-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; margin-right: 5px; }
          .cn-dot-live { background: #63B1BC; }
          .cn-dot-ready { background: #FFAD00; }
          .cn-dot-shell { background: #53565A; }
          .cn-core { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 78px; height: 78px; border-radius: 50%; background: radial-gradient(circle, #005670 0%, #000000 140%); display: flex; align-items: center; justify-content: center; color: #FFFFFF; font-weight: 900; font-size: 20px; z-index: 2; animation: cnHeartbeat 2.6s ease-in-out infinite; }

          .holo-deck { position: relative; overflow: hidden; border-radius: 22px; padding: 28px 24px; background: linear-gradient(160deg, #005670 0%, #000000 155%); box-shadow: 0 30px 60px rgba(0,0,0,.3); }
          .holo-aurora { position: absolute; inset: -20%; pointer-events: none; background: radial-gradient(circle at 20% 20%, rgba(99,177,188,.3), transparent 40%), radial-gradient(circle at 80% 30%, rgba(99,177,188,.22), transparent 45%), radial-gradient(circle at 50% 90%, rgba(99,177,188,.2), transparent 45%); animation: holoAurora 16s ease-in-out infinite; }
          .holo-particles { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
          .holo-particle { position: absolute; bottom: -10px; width: 3px; height: 3px; border-radius: 50%; background: rgba(255,255,255,.55); box-shadow: 0 0 6px rgba(99,177,188,.9); animation: holoRise linear infinite; }
          .holo-head { position: relative; color: #FFFFFF; margin-bottom: 20px; }
          .holo-eyebrow { font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: #63B1BC; }
          .holo-heading { margin: 4px 0 0; font-size: 19px; font-weight: 800; color: #FFFFFF; }
          .holo-grid { position: relative; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; perspective: 1200px; }
          .holo-card { position: relative; display: block; overflow: hidden; text-decoration: none; border-radius: 16px; padding: 16px; cursor: pointer; transform-style: preserve-3d; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.16); transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease; box-shadow: 0 10px 24px rgba(0,0,0,.25); animation: holoBreathe 5s ease-in-out infinite; }
          .holo-card:hover { border-color: rgba(99,177,188,.65); box-shadow: 0 18px 34px rgba(0,0,0,.4); }
          .holo-card-disabled { cursor: not-allowed; }
          .holo-sheen { position: absolute; inset: 0; border-radius: 16px; background: linear-gradient(115deg, rgba(255,255,255,.18), transparent 40%); pointer-events: none; opacity: .8; }
          .holo-icon { position: relative; display: flex; width: 36px; height: 36px; border-radius: 10px; background: rgba(99,177,188,.2); align-items: center; justify-content: center; color: #FFFFFF; font-weight: 800; font-size: 13px; margin-bottom: 12px; }
          .holo-title { position: relative; color: #FFFFFF; font-size: 13.5px; font-weight: 700; margin: 0 0 4px; }
          .holo-group { position: relative; color: rgba(255,255,255,.55); font-size: 10.5px; text-transform: uppercase; letter-spacing: .05em; }
          .holo-footer { position: relative; margin-top: 14px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,.14); display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; }
          .holo-pill { padding: 3px 8px; border-radius: 999px; font-weight: 800; font-size: 9.5px; text-transform: uppercase; letter-spacing: .04em; }
          .holo-pill-live { background: rgba(99,177,188,.22); color: #63B1BC; }
          .holo-pill-ready { background: rgba(255,173,0,.2); color: #FFAD00; }
          .holo-pill-shell { background: rgba(255,255,255,.12); color: rgba(255,255,255,.6); }
          .holo-cta { color: #63B1BC; font-weight: 700; }

          @media (prefers-reduced-motion: reduce) {
            .ambient-ring,
            .hero-scan,
            .home-module-card {
              animation-play-state: paused !important;
            }
            .home-ims-hero { transform: none !important; }
          }

          @media (max-width: 960px) {
            .home-ims-hero {
              grid-template-columns: minmax(0, 1fr) !important;
            }

            .home-ims-orbit {
              justify-self: center !important;
              transform: scale(0.9);
              margin: -12px -20px;
            }
            .module-hub-view { min-height: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; padding: 230px 14px 14px; overflow: visible; }
            .hub-video-core { top: 112px; width: 170px; height: 170px; }
            .hub-connection-ring { top: 112px; width: 220px; height: 220px; }
            .hub-module-position { position: static; width: auto; transform: none; }
            .module-card-hub { height: 110px !important; min-height: 110px !important; }
            .mc-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .holo-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .cn-canvas { height: 720px; }
          }

          @media (max-width: 560px) {
            .home-ims-hero {
              min-height: 0 !important;
              padding: 24px 20px !important;
            }

            .home-ims-orbit {
              transform: scale(0.72);
              margin: -36px -54px;
            }
            .workspace-view-tools { justify-content: flex-start; }
            .module-hub-view { grid-template-columns: 1fr; }
            .module-card-list { grid-template-columns: 64px minmax(0, 1fr); }
            .module-card-list > div:last-child { display: none !important; }
            .mc-grid { grid-template-columns: 1fr; }
            .holo-grid { grid-template-columns: 1fr; }
          }

          .home-module-card {
            position: relative;
            z-index: 1;
            transition: transform 220ms cubic-bezier(.2,.8,.2,1), box-shadow 220ms ease, border-color 220ms ease, background 220ms ease;
            animation: imsCardReveal 420ms backwards;
          }

          .home-module-card:hover {
            z-index: 5;
            transform: translateY(-11px) scale(1.035);
            box-shadow: 0 28px 54px rgba(0, 86, 112, 0.2), 0 8px 18px rgba(15,23,42,.09);
            border-color: #63B1BC;
            background: linear-gradient(160deg, #ffffff 0%, #ECECE7 100%);
          }

          .module-icon { transition: transform 220ms cubic-bezier(.2,.8,.2,1), background 220ms ease, color 220ms ease, box-shadow 220ms ease; }
          .home-module-card:hover .module-icon { transform: translateY(-3px) scale(1.12) rotate(-3deg); background: #005670 !important; color: white !important; box-shadow: 0 12px 24px rgba(0,86,112,.24); }
          .card-glow { transition: transform 260ms ease, opacity 260ms ease; }
          .home-module-card:hover .card-glow { transform: scale(1.7); opacity: .9; }

        `}
      </style>
      <section
        className="home-ims-hero"
        style={{
          ...heroStyle,
          transform: `perspective(1400px) rotateX(${heroTilt.y * -1.2}deg) rotateY(${heroTilt.x * 1.2}deg)`,
        }}
        onPointerMove={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          setHeroTilt({
            x: (event.clientX - bounds.left) / bounds.width - 0.5,
            y: (event.clientY - bounds.top) / bounds.height - 0.5,
          });
        }}
        onPointerLeave={() => setHeroTilt({ x: 0, y: 0 })}
      >
        <span className="hero-grid" aria-hidden="true" />
        <span className="hero-scan" aria-hidden="true" />
        <div style={heroCopyStyle}>
          <div style={eyebrowStyle}>Enshore Integrated Management System</div>
          <h1 style={heroTitleStyle}>Everything connected.<br />One place to begin.</h1>
          <p style={heroSubtitleStyle}>
            Choose your workspace below.
          </p>
        </div>

        <div className="home-ims-orbit" style={orbitStyle} aria-hidden="true">
          <span className="ambient-ring ambient-ring-one" />
          <span className="ambient-ring ambient-ring-two" />
          <span className="ambient-ring ambient-ring-three" />
          <span className="ambient-node node-one" />
          <span className="ambient-node node-two" />
          <span className="ambient-node node-three" />
          <span className="ambient-node node-four" />
          <div style={orbitCoreStyle}>
            <video
              ref={headerVideoRef}
              style={orbitVideoStyle}
              className="ims-orbit-video"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              tabIndex={-1}
            >
              <source src="/enshore-e-outline-loop.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </section>

      {permissions.isAdmin && pendingRequests.length ? <section style={adminRequestPanel}><div><div style={surfaceEyebrowStyle}>ADMIN ATTENTION</div><h2 style={adminRequestTitle}>{pendingRequests.length} access request{pendingRequests.length === 1 ? "" : "s"} awaiting review</h2><p style={surfaceHintStyle}>{pendingRequests.slice(0, 3).map((request) => `${request.first_name} ${request.last_name} · ${request.department}`).join(" | ")}</p></div><Link href="/admin" style={adminRequestLink}>Review Requests</Link></section> : null}

      <section style={commandSurfaceStyle} aria-label="Management modules">
        <div style={surfaceHeaderStyle}>
          <div>
            <div style={surfaceEyebrowStyle}>Your workspaces</div>
            <h2 style={surfaceTitleStyle}>Where would you like to go?</h2>
          </div>
          <div className="workspace-view-tools">
            <label className="workspace-view-select">
              <span>View</span>
              <select value={homeView} onChange={(event) => setHomeView(event.target.value as HomeView)}>
                {homeViews.map((view) => <option key={view.id} value={view.id}>{view.label}</option>)}
              </select>
            </label>
          </div>
        </div>

        {effectiveHomeView === "grid" ? <div style={moduleGridStyle}>{moduleCards.map((card, index) => renderModuleCard(card, index))}</div> : null}

        {effectiveHomeView === "compact" ? <div className="module-compact-view">{moduleCards.map((card, index) => renderModuleCard(card, index, "compact"))}</div> : null}
        {effectiveHomeView === "list" ? <div className="module-list-view">{moduleCards.map((card, index) => renderModuleCard(card, index, "list"))}</div> : null}
        {effectiveHomeView === "hub" ? (
          <div className="module-hub-view">
            <div className="hub-connection-ring" aria-hidden="true" />
            <div className="hub-video-core" aria-hidden="true">
              <video ref={hubVideoRef} autoPlay muted loop playsInline preload="auto" tabIndex={-1}>
                <source src="/enshore-e-outline-loop.mp4" type="video/mp4" />
              </video>
            </div>
            {moduleCards.map((card, index) => {
              const angle = (index / moduleCards.length) * Math.PI * 2 - Math.PI / 2;
              return (
                <div
                  className="hub-module-position"
                  key={card.title}
                  style={{
                    left: `${50 + Math.cos(angle) * 42}%`,
                    top: `${50 + Math.sin(angle) * 40}%`,
                  }}
                >
                  {renderModuleCard(card, index, "hub")}
                </div>
              );
            })}
          </div>
        ) : null}

        {effectiveHomeView === "mission" ? (
          <div className="mc-console">
            <div className="mc-glow-orb mc-glow-orb-a" aria-hidden="true" />
            <div className="mc-glow-orb mc-glow-orb-b" aria-hidden="true" />
            <div className="mc-scanline" aria-hidden="true" />
            <div className="mc-drift-grid" aria-hidden="true" />
            <div className="mc-head">
              <div className="mc-head-title">
                Enshore IMS
                <span>Workspace status &middot; {moduleCards.length} systems</span>
              </div>
              <div className="mc-clock"><span className="mc-live-dot" aria-hidden="true" />{missionClock}</div>
            </div>
            <div className="mc-grid">{moduleCards.map((card, index) => renderMissionTile(card, index))}</div>
          </div>
        ) : null}

        {effectiveHomeView === "constellation" ? (
          <div className="cn-canvas-wrap">
            <div className="cn-canvas" ref={constellationRef}>
              <svg className="cn-lines" aria-hidden="true">
                {constellationClusters.map((cluster, i) => {
                  const cx = constellationSize.width / 2;
                  const cy = constellationSize.height / 2;
                  const x = (cluster.pos[0] / 100) * constellationSize.width;
                  const y = (cluster.pos[1] / 100) * constellationSize.height;
                  const path = `M ${cx} ${cy} L ${x} ${y}`;
                  return (
                    <g key={cluster.group}>
                      <line className="cn-flow-line" x1={cx} y1={cy} x2={x} y2={y} style={{ animationDelay: `${-i * 0.25}s` }} />
                      <circle className="cn-pulse-dot" r={3}>
                        <animateMotion dur={`${2.4 + i * 0.2}s`} repeatCount="indefinite" path={path} />
                      </circle>
                    </g>
                  );
                })}
              </svg>
              <div className="cn-core">IMS</div>
              {constellationClusters.map((cluster) => (
                <div key={cluster.group} className="cn-cluster" style={{ left: `${cluster.pos[0]}%`, top: `${cluster.pos[1]}%` }}>
                  <div className="cn-cluster-label">{cluster.group}</div>
                  <div className="cn-cluster-nodes">{cluster.cards.map((card) => renderConstellationNode(card))}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {effectiveHomeView === "holodeck" ? (
          <div className="holo-deck">
            <div className="holo-aurora" aria-hidden="true" />
            <div className="holo-particles" aria-hidden="true">
              {holoParticles.map((particle, index) => (
                <span
                  key={index}
                  className="holo-particle"
                  style={{ left: `${particle.left}%`, animationDuration: `${particle.duration}s`, animationDelay: `${particle.delay}s` }}
                />
              ))}
            </div>
            <div className="holo-head">
              <div className="holo-eyebrow">Enshore IMS</div>
              <h2 className="holo-heading">Holo Deck &middot; {moduleCards.length} workspaces</h2>
            </div>
            <div className="holo-grid">{moduleCards.map((card, index) => renderHoloCard(card, index))}</div>
          </div>
        ) : null}
      </section>
    </main>
  );
}

const pageStyle: CSSProperties = {
  display: "grid",
  gap: "22px",
};

const heroStyle: CSSProperties = {
  position: "relative",
  minHeight: "252px",
  borderRadius: "24px",
  padding: "26px 32px",
  boxSizing: "border-box",
  overflow: "hidden",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 310px",
  gap: "22px",
  alignItems: "center",
  background:
    "radial-gradient(circle at 84% 42%, rgba(99,177,188,.28) 0 8%, transparent 31%), radial-gradient(circle at 10% 120%, rgba(99,177,188,.14), transparent 38%), linear-gradient(135deg, #005670 0%, #005670 58%, #005670 100%)",
  color: "#ffffff",
  border: "1px solid rgba(255,255,255,.12)",
  boxShadow: "0 18px 38px rgba(0,86,112,.18), inset 0 1px 0 rgba(255,255,255,.12)",
};

const heroCopyStyle: CSSProperties = {
  maxWidth: "780px",
  position: "relative",
  zIndex: 2,
};

const eyebrowStyle: CSSProperties = {
  color: "rgba(255,255,255,.76)",
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  marginBottom: "10px",
};

const heroTitleStyle: CSSProperties = {
  margin: 0,
  maxWidth: "760px",
  fontSize: "40px",
  lineHeight: 1.02,
  letterSpacing: "-0.03em",
};

const heroSubtitleStyle: CSSProperties = {
  margin: "12px 0 0",
  maxWidth: "700px",
  color: "rgba(255,255,255,.78)",
  fontSize: "14px",
  lineHeight: 1.62,
};

const orbitStyle: CSSProperties = {
  position: "relative",
  width: "290px",
  height: "230px",
  justifySelf: "end",
};

const orbitCoreStyle: CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "50%",
  transform: "translate(-50%, -50%)",
  width: "132px",
  height: "132px",
  borderRadius: "999px",
  padding: "8px",
  background: "#005670",
  border: "1px solid rgba(255,255,255,0.34)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backdropFilter: "blur(14px)",
  boxShadow: "0 14px 34px rgba(0,0,0,0.24), inset 0 0 0 7px rgba(255,255,255,0.06)",
  overflow: "hidden",
  zIndex: 4,
  boxSizing: "border-box",
};

const orbitVideoStyle: CSSProperties = {
  display: "block",
  width: "100%",
  height: "100%",
  borderRadius: "999px",
  objectFit: "cover",
  background: "#005670",
};

const commandSurfaceStyle: CSSProperties = {
  borderRadius: "24px",
  border: "1px solid #D0D0CE",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,251,252,0.98) 100%), linear-gradient(90deg, rgba(0,86,112,0.08) 1px, transparent 1px)",
  backgroundSize: "auto, 36px 36px",
  padding: "20px",
  boxShadow: "0 16px 34px rgba(15, 23, 42, 0.08)",
};


const surfaceHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: "18px",
  marginBottom: "16px",
  flexWrap: "wrap",
};

const surfaceEyebrowStyle: CSSProperties = {
  color: "#005670",
  fontSize: "12px",
  fontWeight: 900,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const surfaceTitleStyle: CSSProperties = {
  margin: "4px 0 0",
  color: "#000000",
  fontSize: "26px",
  lineHeight: 1.12,
};

const surfaceHintStyle: CSSProperties = {
  margin: 0,
  maxWidth: "460px",
  color: "#53565A",
  fontSize: "13px",
  lineHeight: 1.5,
};

const moduleGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gridAutoRows: "216px",
  gap: "14px",
};

const cardShellStyle: CSSProperties = {
  display: "flex",
  minWidth: 0,
  textDecoration: "none",
};

const cardStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "216px",
  minHeight: "216px",
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  padding: "18px",
  borderRadius: "18px",
  background: "linear-gradient(180deg, #ffffff 0%, #ECECE7 100%)",
  border: "1px solid #D0D0CE",
  boxShadow: "0 10px 22px rgba(15, 23, 42, 0.055)",
  boxSizing: "border-box",
  overflow: "hidden",
};

const cardGlowStyle: CSSProperties = {
  position: "absolute",
  top: "-46px",
  right: "-42px",
  width: "110px",
  height: "110px",
  borderRadius: "999px",
  background: "radial-gradient(circle, rgba(0,86,112,0.18), transparent 66%)",
  pointerEvents: "none",
};

const cardTopLineStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
};

const moduleIconStyle: CSSProperties = {
  width: "42px",
  height: "42px",
  borderRadius: "14px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#ECECE7",
  border: "1px solid #D0D0CE",
  color: "#005670",
};

const iconSvgStyle: CSSProperties = {
  width: "22px",
  height: "22px",
};

const cardBodyStyle: CSSProperties = {
  display: "grid",
  alignContent: "center",
  gap: "7px",
  flex: 1,
};

const cardTitleStyle: CSSProperties = {
  margin: 0,
  color: "#000000",
  fontSize: "22px",
  lineHeight: 1.14,
};

const cardFooterStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  borderTop: "1px solid #ECECE7",
  paddingTop: "13px",
};

const cardShortStyle: CSSProperties = {
  color: "#005670",
  fontSize: "13px",
  fontWeight: 900,
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
};

const connectorDotStyle: CSSProperties = {
  width: "9px",
  height: "9px",
  borderRadius: "999px",
  background: "#005670",
  boxShadow: "0 0 0 5px rgba(0,86,112,0.12)",
};

const adminRequestPanel: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, margin: "0 auto 20px", maxWidth: 1320, padding: "16px 18px", border: "1px solid #ECECE7", borderRadius: 16, background: "#ECECE7", boxShadow: "0 8px 20px rgba(154,52,18,.08)" };
const adminRequestTitle: CSSProperties = { margin: "3px 0 5px", color: "#000000", fontSize: 19 };
const adminRequestLink: CSSProperties = { flex: "0 0 auto", display: "inline-flex", alignItems: "center", minHeight: 42, padding: "10px 14px", borderRadius: 10, background: "#005670", color: "#ffffff", textDecoration: "none", fontSize: 14, fontWeight: 900 };

"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { QualityPageHero } from "../../src/components/QualityPageHero";
import { ImsTopMetaRow } from "../../src/components/ImsPrimitives";
import { documentControlGuide } from "../../src/components/guides/documentControlGuideContent";
import { ncrGuide } from "../../src/components/guides/ncrGuideContent";
import { mocGuide } from "../../src/components/guides/mocGuideContent";
import { ainmGuide } from "../../src/components/guides/ainmGuideContent";
import { reviewPointsGuide } from "../../src/components/guides/reviewPointsGuideContent";
import { speakUpGuide } from "../../src/components/guides/speakUpGuideContent";
import { actionsGuide } from "../../src/components/guides/actionsGuideContent";
import { observationsGuide } from "../../src/components/guides/observationsGuideContent";
import { inspectionsGuide } from "../../src/components/guides/inspectionsGuideContent";
import { ptwGuide } from "../../src/components/guides/ptwGuideContent";
import { auditsGuide } from "../../src/components/guides/auditsGuideContent";
import { assetsGuide } from "../../src/components/guides/assetsGuideContent";
import { lessonsGuide } from "../../src/components/guides/lessonsGuideContent";
import { certificationGuide } from "../../src/components/guides/certificationGuideContent";
import { projectsGuide } from "../../src/components/guides/projectsGuideContent";
import { adminGuide } from "../../src/components/guides/adminGuideContent";
import { phoneGuide } from "../../src/components/guides/phoneGuideContent";
import { reportsGuide } from "../../src/components/guides/reportsGuideContent";
import { useImsPermissions } from "../../src/components/ImsPermissions";
import { page, guideSwitchBar, guideSwitchBtn, navBar, navGroup, navBtn, content } from "../../src/components/guides/guideKit";
import type { GuideDefinition } from "../../src/components/guides/guideKit";

const allGuides: GuideDefinition[] = [
  phoneGuide,
  documentControlGuide,
  actionsGuide,
  ncrGuide,
  mocGuide,
  auditsGuide,
  ainmGuide,
  observationsGuide,
  inspectionsGuide,
  ptwGuide,
  assetsGuide,
  // riskGuide and managementReviewGuide are hidden while those modules are hidden (see app/home/page.tsx). The guide files are kept: src/components/guides/riskGuideContent.tsx and managementReviewGuideContent.tsx.
  lessonsGuide,
  certificationGuide,
  projectsGuide,
  reviewPointsGuide,
  reportsGuide,
  adminGuide,
  speakUpGuide,
];

function GuidesPageContent() {
  const searchParams = useSearchParams();
  // The Speak Up guide shows for Administrators and for people on the handler list, so nobody else learns of it from here.
  const permissions = useImsPermissions();
  const [speakUpHandler, setSpeakUpHandler] = useState(false);
  useEffect(() => {
    void fetch("/api/speak-up/handler", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "access" }) })
      .then((response) => (response.ok ? response.json() : null))
      .then((json) => setSpeakUpHandler(Boolean(json?.handler)))
      .catch(() => undefined);
  }, []);
  const guides = useMemo(() => allGuides.filter((guide) => (guide.id !== speakUpGuide.id || permissions.isAdmin || speakUpHandler) && (guide.id !== adminGuide.id || permissions.isAdmin)), [permissions.isAdmin, speakUpHandler]);
  const linkedGuide = searchParams.get("guide")?.trim() || "";

  const initialGuide = guides.find((g) => g.id === linkedGuide) || documentControlGuide;
  const [activeGuideId, setActiveGuideId] = useState(initialGuide.id);
  const [active, setActive] = useState(initialGuide.defaultSection);

  useEffect(() => {
    const matched = guides.find((g) => g.id === linkedGuide);
    if (matched) {
      setActiveGuideId(matched.id);
      setActive(matched.defaultSection);
    }
  }, [linkedGuide]);

  const activeGuide = guides.find((g) => g.id === activeGuideId) || documentControlGuide;
  const groups = useMemo(() => Array.from(new Set(activeGuide.sections.map((s) => s.group))), [activeGuide]);
  const ActiveSection = activeGuide.sectionComponents[active] || activeGuide.sectionComponents[activeGuide.defaultSection];

  function selectGuide(guide: GuideDefinition) {
    setActiveGuideId(guide.id);
    setActive(guide.defaultSection);
  }

  return (
    <main style={page}>
      <QualityPageHero
        label="Enshore IMS · Process Guides"
        title="Process Guides"
        description="Step-by-step guides for every IMS process."
      />
      <ImsTopMetaRow
        status={<><strong>Guide:</strong> {activeGuide.guideLabel}</>}
      />

      {/* Guide switcher */}
      <select
        className="guide-switch-select"
        aria-label="Choose a process guide"
        value={activeGuideId}
        onChange={(event) => {
          const next = guides.find((guide) => guide.id === event.target.value);
          if (next) selectGuide(next);
        }}
      >
        {guides.map((guide) => <option key={guide.id} value={guide.id}>{guide.navLabel}</option>)}
      </select>
      <div className="guide-switch-bar" style={guideSwitchBar}>
        {guides.map((guide) => (
          <button
            key={guide.id}
            style={guideSwitchBtn(activeGuideId === guide.id)}
            onClick={() => selectGuide(guide)}
          >
            {guide.navLabel}
          </button>
        ))}
      </div>

      {/* Section nav */}
      <select
        className="guide-section-select"
        aria-label="Choose a section of this guide"
        value={active}
        onChange={(event) => setActive(event.target.value)}
      >
        {groups.map((group) => (
          <optgroup key={group} label={group}>
            {activeGuide.sections.filter((s) => s.group === group).map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </optgroup>
        ))}
      </select>
      <div className="guide-section-bar" style={navBar}>
        {groups.map(group => (
          <div key={group} style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
            <span style={navGroup}>{group}</span>
            {activeGuide.sections.filter(s => s.group === group).map(s => (
              <button
                key={s.key}
                style={navBtn(active === s.key)}
                onClick={() => setActive(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="guide-content" style={content}>
        {ActiveSection ? <ActiveSection /> : null}
      </div>
    </main>
  );
}

export default function GuidesPage() {
  return (
    <Suspense fallback={<main style={{ padding: "24px" }}>Loading process guides...</main>}>
      <GuidesPageContent />
    </Suspense>
  );
}

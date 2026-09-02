"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { QualityPageHero } from "../../src/components/QualityPageHero";
import { ImsTopMetaRow } from "../../src/components/ImsPrimitives";
import { documentControlGuide } from "../../src/components/guides/documentControlGuideContent";
import { ncrGuide } from "../../src/components/guides/ncrGuideContent";
import { mocGuide } from "../../src/components/guides/mocGuideContent";
import { ainmGuide } from "../../src/components/guides/ainmGuideContent";
import { page, guideSwitchBar, guideSwitchBtn, navBar, navGroup, navBtn, content } from "../../src/components/guides/guideKit";
import type { GuideDefinition } from "../../src/components/guides/guideKit";

const guides: GuideDefinition[] = [documentControlGuide, ncrGuide, mocGuide, ainmGuide];

function GuidesPageContent() {
  const searchParams = useSearchParams();
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
      <div style={guideSwitchBar}>
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
      <div style={navBar}>
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
      <div style={content}>
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

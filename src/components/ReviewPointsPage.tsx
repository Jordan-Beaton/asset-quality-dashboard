"use client";

import { ImsTopMetaRow } from "./ImsPrimitives";
import { QualityPageHero } from "./QualityPageHero";
import { ProjectWorkspaceNav } from "./ProjectWorkspaceNav";
import { ReviewPointsPanel } from "./ReviewPointsPanel";

export function ReviewPointsPage({ projectKey }: { projectKey: string }) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <QualityPageHero
        label="Project Management · Review Points"
        title="Review Points"
        description="Track every review and approval point in the project ITPs, with a simple accept or fail decision and a digital sign-off."
      />
      <ImsTopMetaRow status={<><strong>Status:</strong> Review and approval points from the ITPs, signed off by authorised reviewers.</>} />
      <ProjectWorkspaceNav projectKey={projectKey} active="review-points" />
      <ReviewPointsPanel projectKey={projectKey} />
    </div>
  );
}

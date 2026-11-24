import { ScopedActionsPage } from "../../../src/components/ScopedActionsPage";
import type { ScopedActionsScope } from "../../../src/components/ScopedActionsPage";

export const dynamic = "force-dynamic";

// Quality Actions is the shared Actions register (src/components/ScopedActionsPage.tsx) scoped to department Quality.
const qualityScope: ScopedActionsScope = {
  slug: "quality",
  moduleLabel: "QUALITY MANAGEMENT",
  pageTitle: "Quality Actions",
  departmentName: "Quality",
  article: "a",
  centralHref: "/actions?department=Quality",
  createSources: [
    "Manual",
    "Audit",
    "Audit Finding",
    "Asset Inspection",
    "Asset Maintenance",
    "Asset Calibration",
    "NCR/CAPA",
    "MOC",
    "AINM",
    "Risk",
    "HSE",
    "Other",
  ],
};

export default function QualityActionsPage() {
  return <ScopedActionsPage scope={qualityScope} />;
}

import { ScopedActionsPage } from "../../../src/components/ScopedActionsPage";
import type { ScopedActionsScope } from "../../../src/components/ScopedActionsPage";

export const dynamic = "force-dynamic";

// HSE Actions is the shared Actions register (src/components/ScopedActionsPage.tsx) scoped to department HSE.
// It also keeps the Excel bulk upload and the address pre-fill used by the HSE inspection page.
const hseScope: ScopedActionsScope = {
  slug: "hse",
  moduleLabel: "HSE MANAGEMENT",
  pageTitle: "HSE Actions",
  departmentName: "HSE",
  article: "an",
  centralHref: "/actions?department=HSE",
  createSources: [
    "Manual",
    "Audit Finding",
    "Asset Inspection",
    "Asset Maintenance",
    "Asset Calibration",
    "NCR/CAPA",
    "MOC",
    "AINM",
    "HSE Inspection",
    "Risk",
    "HSE",
    "Other",
  ],
  bulkUpload: true,
  prefillFromUrl: true,
};

export default function HseActionsPage() {
  return <ScopedActionsPage scope={hseScope} />;
}

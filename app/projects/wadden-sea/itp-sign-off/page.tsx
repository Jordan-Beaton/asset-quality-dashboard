"use client";

import { WaddenSeaWorkspaceNav } from "../../../../src/components/WaddenSeaWorkspaceNav";
import { ItpSignOffPage } from "../../../../src/components/ItpSignOffPage";

export default function WaddenSeaItpSignOffPage() {
  return <ItpSignOffPage projectKey="wadden-sea" projectLabel="Wadden Sea" nav={<WaddenSeaWorkspaceNav active="itp-sign-off" />} />;
}

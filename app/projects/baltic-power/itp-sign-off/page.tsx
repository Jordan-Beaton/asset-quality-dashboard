"use client";

import { BalticPowerWorkspaceNav } from "../../../../src/components/BalticPowerWorkspaceNav";
import { ItpSignOffPage } from "../../../../src/components/ItpSignOffPage";

export default function BalticPowerItpSignOffPage() {
  return <ItpSignOffPage projectKey="baltic-power" projectLabel="Baltic Power" nav={<BalticPowerWorkspaceNav active="itp-sign-off" />} />;
}

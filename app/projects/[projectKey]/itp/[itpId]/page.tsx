import { ItpRecordPage } from "../../../../../src/components/ItpRecordPage";

export default async function Page({ params }: { params: Promise<{ projectKey: string; itpId: string }> }) {
  const { projectKey, itpId } = await params;
  return <ItpRecordPage projectKey={projectKey} itpId={itpId} />;
}

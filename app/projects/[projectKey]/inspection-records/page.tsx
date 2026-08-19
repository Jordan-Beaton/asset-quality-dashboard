import { InspectionRecordsPage } from "../../../../src/components/InspectionRecordsPage";

export default async function Page({ params }: { params: Promise<{ projectKey: string }> }) {
  const { projectKey } = await params;
  return <InspectionRecordsPage projectKey={projectKey} />;
}

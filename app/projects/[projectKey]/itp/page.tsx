import { ItpTrackerPage } from "../../../../src/components/ItpTrackerPage";

export default async function Page({ params }: { params: Promise<{ projectKey: string }> }) {
  const { projectKey } = await params;
  return <ItpTrackerPage projectKey={projectKey} />;
}

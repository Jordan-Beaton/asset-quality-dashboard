import { NoiTrackerPage } from "../../../../src/components/NoiTrackerPage";

export default async function Page({ params }: { params: Promise<{ projectKey: string }> }) {
  const { projectKey } = await params;
  return <NoiTrackerPage projectKey={projectKey} />;
}

import { NoiCreatorPage } from "../../../../../src/components/NoiCreatorPage";

export default async function Page({ params }: { params: Promise<{ projectKey: string }> }) {
  const { projectKey } = await params;
  return <NoiCreatorPage projectKey={projectKey} />;
}

import { ProjectDashboardPage } from "../../../src/components/ProjectDashboardPage";

export default async function Page({ params }: { params: Promise<{ projectKey: string }> }) {
  const { projectKey } = await params;
  return <ProjectDashboardPage projectKey={projectKey} />;
}

import { ItpSignOffPage } from "../../../../src/components/ItpSignOffPage";
import { ProjectWorkspaceNav } from "../../../../src/components/ProjectWorkspaceNav";
import { getProject } from "../../../../src/lib/projectRegistry";

export default async function Page({ params }: { params: Promise<{ projectKey: string }> }) {
  const { projectKey } = await params;
  const config = getProject(projectKey);
  return (
    <ItpSignOffPage
      projectKey={projectKey}
      projectLabel={config.label}
      nav={<ProjectWorkspaceNav projectKey={projectKey} active="itp-sign-off" />}
    />
  );
}

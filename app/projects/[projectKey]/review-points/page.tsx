import { ReviewPointsPage } from "../../../../src/components/ReviewPointsPage";

export default async function Page({ params }: { params: Promise<{ projectKey: string }> }) {
  const { projectKey } = await params;
  return <ReviewPointsPage projectKey={projectKey} />;
}

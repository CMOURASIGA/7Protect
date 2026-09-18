import { ProposalPresentationWorkspace } from "@/components/reporting-workspace";

export default async function ProposalPresentationPage({ params }: { params: Promise<{ proposalId: string }> }) {
  const { proposalId } = await params;
  return <ProposalPresentationWorkspace proposalId={proposalId} />;
}

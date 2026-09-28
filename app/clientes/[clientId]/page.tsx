import { ClientDashboardWorkspace } from "@/components/reporting-workspace";

export default async function ClientDashboardPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  return <ClientDashboardWorkspace clientId={clientId} />;
}

import { ReportSnapshotWorkspace } from "@/components/report-snapshot-workspace";

export default async function Page({ params }: { params: Promise<{ snapshotId: string }> }) { const { snapshotId } = await params; return <ReportSnapshotWorkspace snapshotId={snapshotId} />; }

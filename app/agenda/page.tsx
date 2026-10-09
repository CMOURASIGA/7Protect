import { OperationalWorkspace } from "@/components/operational-workspace";
import { Placeholder } from "@/components/page-content";
import { isCommercialV2Mode } from "@/lib/domain-mode";
export default function Page() { return isCommercialV2Mode() ? <OperationalWorkspace /> : <Placeholder title="Agenda operacional" />; }

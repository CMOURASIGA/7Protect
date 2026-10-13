import { OperationalWorkspace } from "@/components/operational-workspace";
import { Suspense } from "react";
import { Placeholder } from "@/components/page-content";
import { isCommercialV2Mode } from "@/lib/domain-mode";
export default function Page() { return isCommercialV2Mode() ? <Suspense fallback={<p>Carregando Agenda...</p>}><OperationalWorkspace /></Suspense> : <Placeholder title="Agenda operacional" />; }

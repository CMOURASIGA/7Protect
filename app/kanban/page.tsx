import { Suspense } from "react";
import { KanbanWorkspace } from "@/components/crm-workspace";

export default function Page() {
  return <Suspense fallback={<div className="page"><section className="empty"><h2>Carregando Kanban...</h2></section></div>}><KanbanWorkspace /></Suspense>;
}

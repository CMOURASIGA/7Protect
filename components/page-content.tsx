"use client";
import { BrokerDashboardWorkspace } from "@/components/reporting-workspace";
export function Dashboard() { return <BrokerDashboardWorkspace />; }
export function Placeholder({ title }: { title: string }) { return <div className="page"><section className="empty"><p className="eyebrow">ESTRUTURA PREPARADA</p><h2>{title}</h2><p>Este módulo será desenvolvido em uma SPEC posterior.</p></section></div>; }

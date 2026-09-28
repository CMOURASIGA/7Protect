import type { Diagnostic, PlanningCycle, ProposalVersion } from "@/domains/core/entities";

export const planningStatusLabel: Record<PlanningCycle["status"], string> = { draft: "Rascunho", active: "Em andamento", closed: "Encerrado", cancelled: "Cancelado" };
export const diagnosticStatusLabel: Record<Diagnostic["status"], string> = { draft: "Rascunho", completed: "Concluído", reopened: "Reaberto" };
export const proposalStatusLabel: Record<ProposalVersion["status"], string> = { draft: "Rascunho", presented: "Apresentada", accepted: "Aceita", superseded: "Substituída" };
export const clientStatusLabel = (status: "active" | "inactive") => status === "active" ? "Ativo" : "Inativo";

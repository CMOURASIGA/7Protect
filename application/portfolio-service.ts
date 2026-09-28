"use client";

import { getFoundation } from "@/application/foundation-service";
import { createPlanningCycle } from "@/application/planning-service";
import type { PlanningType } from "@/domains/core/entities";
import { getRepositoryProvider } from "@/repositories/providers";

const provider = () => getRepositoryProvider();

async function tenantId() {
  const foundation = await getFoundation();
  if (!foundation.tenant) throw new Error("A corretora ainda não foi configurada.");
  return foundation.tenant.id;
}

export type PortfolioEntry = {
  id: string;
  clientId: string;
  clientName: string;
  clientStatus: "active" | "inactive";
  planningId: string;
  planningName: string;
  proposalId: string;
  proposalNumber: number;
  monthlyPremium: number;
  annualPremium: number;
  protectedCapital: number;
  contractedAt: string;
  suggestedReviewAt?: string;
  insurers: string[];
  products: string[];
  coverageLabels: string[];
  terms: string[];
};

export async function listPortfolioEntries(): Promise<PortfolioEntry[]> {
  const id = await tenantId(); const p = provider();
  const [clients, cycles, proposals, coverages, closings, insurers, products] = await Promise.all([p.clients.list(id), p.planningCycles.list(id), p.proposalVersions.list(id), p.coverages.list(id), p.closings.list(id), p.insurers.list(id), p.insuranceProducts.list(id)]);
  const clientById = new Map(clients.map((item) => [item.id, item])); const cycleById = new Map(cycles.map((item) => [item.id, item])); const proposalById = new Map(proposals.map((item) => [item.id, item])); const insurerById = new Map(insurers.map((item) => [item.id, item.name])); const productById = new Map(products.map((item) => [item.id, item.name]));
  return closings.flatMap((closing) => {
    const client = clientById.get(closing.clientId); const planning = cycleById.get(closing.planningCycleId); const proposal = proposalById.get(closing.proposalVersionId);
    if (!client || !planning || !proposal || proposal.status !== "accepted" || proposal.clientId !== client.id || proposal.planningCycleId !== planning.id) return [];
    const rows = coverages.filter((coverage) => coverage.proposalVersionId === proposal.id);
    return [{ id: closing.id, clientId: client.id, clientName: client.name, clientStatus: client.status, planningId: planning.id, planningName: planning.name, proposalId: proposal.id, proposalNumber: proposal.number, monthlyPremium: proposal.totalMonthly, annualPremium: proposal.totalAnnual, protectedCapital: proposal.totalProtectedCapital, contractedAt: closing.closedAt, suggestedReviewAt: closing.suggestedReviewAt, insurers: [...new Set(rows.map((item) => item.insurerId ? insurerById.get(item.insurerId) : undefined).filter((item): item is string => Boolean(item)))], products: [...new Set(rows.map((item) => item.productId ? productById.get(item.productId) : undefined).filter((item): item is string => Boolean(item)))], coverageLabels: rows.map((item) => item.label), terms: [...new Set(rows.map((item) => item.term).filter((item): item is string => Boolean(item)))] }];
  }).sort((a, b) => b.contractedAt.localeCompare(a.contractedAt));
}

export async function startPortfolioReview(entry: PortfolioEntry, type: Extract<PlanningType, "review" | "replanning">) {
  const referenceDate = new Date().toISOString().slice(0, 10);
  const label = type === "review" ? "Revisão" : "Replanejamento";
  return createPlanningCycle({ clientId: entry.clientId, name: `${label} · ${entry.planningName}`, type, referenceDate, observation: `Iniciado a partir da proposta aceita v${entry.proposalNumber}.` });
}

"use client";

import { getFoundation } from "@/application/foundation-service";
import type { BrandSettings, BrokerAnalysis, Client, Diagnostic, PlanningCycle, ReportSnapshot } from "@/domains/core/entities";
import { timestamps } from "@/domains/shared/entity";
import { getRepositoryProvider } from "@/repositories/providers";

const provider = () => getRepositoryProvider();

export type DiagnosticReportPayload = {
  brand: Pick<BrandSettings, "clientName" | "logoUrl" | "primaryColor" | "highlightColor" | "phone" | "email" | "address">;
  client: Pick<Client, "id" | "name">;
  planning: Pick<PlanningCycle, "id" | "name" | "referenceDate">;
  diagnostic: Record<string, unknown>;
  analysis: Pick<BrokerAnalysis, "summary" | "priorities" | "hypotheses" | "estimatedNeed" | "timeframe" | "calculationNotes" | "recommendations" | "pendingQuestions" | "internalNotes"> | null;
  mode: "client" | "internal";
  generatedAt: string;
  templateVersion: string;
};

async function tenantId() {
  const foundation = await getFoundation();
  if (!foundation.tenant) throw new Error("A corretora ainda não foi configurada.");
  return foundation.tenant.id;
}

export async function ensureDiagnosticReportSnapshot(input: { client: Client | null; planning: PlanningCycle; diagnostic: Diagnostic; analysis: BrokerAnalysis | null; mode: "client" | "internal" }) {
  const id = await tenantId();
  const existing = (await provider().reportSnapshots.list(id)).find((item) => item.planningCycleId === input.planning.id && item.type === `diagnostic_${input.mode}`);
  if (existing) return existing;
  const foundation = await getFoundation();
  if (!foundation.settings || !input.client) throw new Error("Não foi possível preparar o documento de diagnóstico.");
  const generatedAt = new Date().toISOString();
  const payload: DiagnosticReportPayload = {
    brand: foundation.settings,
    client: { id: input.client.id, name: input.client.name },
    planning: { id: input.planning.id, name: input.planning.name, referenceDate: input.planning.referenceDate },
    diagnostic: input.diagnostic.declaredData,
    analysis: input.mode === "internal" && input.analysis ? { summary: input.analysis.summary, priorities: input.analysis.priorities, hypotheses: input.analysis.hypotheses, estimatedNeed: input.analysis.estimatedNeed, timeframe: input.analysis.timeframe, calculationNotes: input.analysis.calculationNotes, recommendations: input.analysis.recommendations, pendingQuestions: input.analysis.pendingQuestions, internalNotes: input.analysis.internalNotes } : null,
    mode: input.mode,
    generatedAt,
    templateVersion: "spec-06-v1",
  };
  return provider().reportSnapshots.create({ ...timestamps(), tenantId: id, clientId: input.client.id, planningCycleId: input.planning.id, type: `diagnostic_${input.mode}`, generatedAt, templateVersion: payload.templateVersion, payload: payload as unknown as Record<string, unknown> });
}

export async function listHistoricalReports() {
  const id = await tenantId();
  return (await provider().reportSnapshots.list(id)).sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
}

export async function historicalReportById(snapshotId: string): Promise<ReportSnapshot | null> {
  const snapshot = await provider().reportSnapshots.findById(snapshotId);
  if (!snapshot) return null;
  const id = await tenantId();
  return snapshot.tenantId === id ? snapshot : null;
}

export async function listHistoricalReportRows() {
  const id = await tenantId(); const p = provider();
  const [snapshots, clients, cycles, proposals] = await Promise.all([p.reportSnapshots.list(id), p.clients.list(id), p.planningCycles.list(id), p.proposalVersions.list(id)]);
  const clientById = new Map(clients.map((item) => [item.id, item.name])); const cycleById = new Map(cycles.map((item) => [item.id, item.name])); const proposalById = new Map(proposals.map((item) => [item.id, item]));
  return snapshots.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt)).map((snapshot) => ({ snapshot, clientName: clientById.get(snapshot.clientId) ?? "Cliente histórico", planningName: cycleById.get(snapshot.planningCycleId) ?? "Planejamento histórico", proposalNumber: snapshot.proposalVersionId ? proposalById.get(snapshot.proposalVersionId)?.number : undefined }));
}

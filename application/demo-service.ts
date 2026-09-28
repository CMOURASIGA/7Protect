"use client";

import type { AiAnalysis, BrandSettings, BrokerAnalysis, Client, ClosingRecord, Coverage, CoverageType, Diagnostic, Insurer, InsuranceProduct, PipelineHistory, PlanningCycle, PlanningEvent, ProposalVersion, ReportSnapshot, Task, Tenant } from "@/domains/core/entities";
import { replaceDatabaseContents, selectDatabase } from "@/repositories/local/database";
import { demoDatabaseName, isDemoMode } from "@/lib/demo-mode";

const tenantId = "00000000-0000-4000-8000-000000000001";
const clientId = "00000000-0000-4000-8000-000000000010";
const historicalPlanningId = "00000000-0000-4000-8000-000000000020";
const metisPlanningId = "00000000-0000-4000-8000-000000000021";
const historicalProposalId = "00000000-0000-4000-8000-000000000030";
const metisProposalId = "00000000-0000-4000-8000-000000000031";
const insurerId = "00000000-0000-4000-8000-000000000040";
const productId = "00000000-0000-4000-8000-000000000041";
const coverageTypeIds = ["00000000-0000-4000-8000-000000000050", "00000000-0000-4000-8000-000000000051", "00000000-0000-4000-8000-000000000052", "00000000-0000-4000-8000-000000000053", "00000000-0000-4000-8000-000000000054"];
const createdAt = "2026-09-18T10:00:00.000Z";
const updatedAt = "2026-09-18T11:00:00.000Z";
const metadata = (id: string) => ({ id, tenantId, createdAt, updatedAt, version: 1, deletedAt: null });
const goals = "Possibilidade de deixar legado para Letícia Vitória ou possuir alternativa de resgate/diversificação patrimonial; manutenção do padrão de vida da família em caso de invalidez; manutenção do padrão de vida em caso de doença grave; garantir a escolaridade de Letícia até o final do Ensino Médio.";

const tenant: Tenant = { ...metadata(tenantId), tenantId: "root", name: "Corretora Demonstração" };
const settings: BrandSettings = { ...metadata("00000000-0000-4000-8000-000000000002"), clientName: "Corretora Demonstração", primaryColor: "#173f6b", highlightColor: "#4fc3a1", phone: "", email: "" };
const rafael: Client = { ...metadata(clientId), name: "Rafael", status: "active", pipelineStage: "closed", notes: "Registro fictício para demonstração. Não contém dados pessoais adicionais." };
const historicalPlanning: PlanningCycle = { ...metadata(historicalPlanningId), clientId, name: "Rafael — Proteção Familiar", type: "initial", referenceDate: "2026-09-18", observation: "Caso demonstrativo concluído. Dados fictícios.", status: "closed", startedAt: createdAt, acceptedProposalVersionId: historicalProposalId, suggestedReviewAt: "2027-09-18" };
const metisPlanning: PlanningCycle = { ...metadata(metisPlanningId), clientId, name: "Rafael — Revisão Metis (pré-análise)", type: "review", referenceDate: "2026-09-24", observation: "Contexto demonstrativo em rascunho para executar a Metis do zero.", status: "active", startedAt: "2026-09-24T10:00:00.000Z" };
const declaredData = { goals, family: "Composição familiar não detalhada no caso demonstrativo.", workIncome: "Não informado.", expenses: "Não informado.", assets: "Não informado.", reserves: "Alternativa de resgate/diversificação patrimonial a avaliar.", pensions: "Não informado.", debts: "Não informado.", existingInsurance: "Não informado.", health: "Não informado.", review: "Caso fictício de demonstração; validar fatos antes de uso profissional." };
const diagnostics: Diagnostic[] = [
  { ...metadata("00000000-0000-4000-8000-000000000060"), clientId, planningCycleId: historicalPlanningId, planningCycle: historicalPlanning.name, status: "completed", declaredData, completedAt: "2026-09-18T10:30:00.000Z" },
  { ...metadata("00000000-0000-4000-8000-000000000061"), clientId, planningCycleId: metisPlanningId, planningCycle: metisPlanning.name, status: "completed", declaredData, completedAt: "2026-09-24T10:30:00.000Z" },
];
const analysis: BrokerAnalysis = { ...metadata("00000000-0000-4000-8000-000000000070"), clientId, planningCycleId: historicalPlanningId, summary: "Caso demonstrativo de proteção familiar.", priorities: "Legado, continuidade do padrão de vida, doença grave, invalidez e escolaridade.", hypotheses: "Avaliar aderência das coberturas aos objetivos declarados.", estimatedNeed: 1410000, timeframe: "Conforme vigências registradas.", calculationNotes: "Valores apresentados no material de referência.", recommendations: "Revisão profissional obrigatória antes de qualquer orientação.", pendingQuestions: "Confirmar informações que não constam do material.", internalNotes: "Dados fictícios de demonstração." };
const insurer: Insurer = { ...metadata(insurerId), name: "MetLife", active: true };
const product: InsuranceProduct = { ...metadata(productId), insurerId, name: "Proteção Familiar", category: "Seguro de vida", active: true };
const coverageTypes: CoverageType[] = ["Vida", "Morte", "Doenças graves", "Invalidez", "Assistência"].map((name, index) => ({ ...metadata(coverageTypeIds[index]), name, active: true }));
const historicalProposal: ProposalVersion = { ...metadata(historicalProposalId), clientId, planningCycleId: historicalPlanningId, number: 1, status: "accepted", revisionReason: "Proposta aceita no caso demonstrativo.", generalNote: "Valores comerciais de referência do caso Rafael.", presentedAt: "2026-09-18T11:00:00.000Z", totalMonthly: 373.6, totalAnnual: 4483.2, totalProtectedCapital: 1410000, incomeCommitment: 0 };
const metisProposal: ProposalVersion = { ...metadata(metisProposalId), clientId, planningCycleId: metisPlanningId, number: 1, status: "draft", revisionReason: "Versão inicial para revisão da Metis.", generalNote: "Rascunho demonstrativo. Nenhuma análise Metis foi gerada.", totalMonthly: 373.6, totalAnnual: 4483.2, totalProtectedCapital: 1410000, incomeCommitment: 0 };
const coverageRows = [
  ["Vida Total (20 anos) - Vitalício", 60000, 170.67, "Vitalício", "Legado ou alternativa de resgate/diversificação patrimonial", "Vida"],
  ["Temporário por Morte", 250000, 64.07, "20 anos", "Manutenção do padrão de vida da família", "Morte"],
  ["Doenças Graves + Proteção (32 doenças) - 5 anos", 100000, 74.26, "5 anos", "Manutenção do padrão de vida em caso de doença grave", "Doenças graves"],
  ["Invalidez Acidental Majorada - 5 anos", 1000000, 64.6, "5 anos", "Manutenção do padrão de vida em caso de invalidez", "Invalidez"],
  ["Assistência Médica e Multidisciplinar - Einstein", 0, 0, "Conforme condições comerciais", "Apoio complementar", "Assistência"],
] as const;
const coverages = ([historicalProposal, metisProposal].flatMap((proposal, proposalIndex) => coverageRows.map(([label, insuredCapital, monthlyPremium, term, objective, coverageType], index): Coverage => ({ ...metadata(`00000000-0000-4000-8000-000000000${(120 + proposalIndex * 10 + index).toString().padStart(3, "0")}`), proposalVersionId: proposal.id, insurerId, productId, coverageType, label, name: label, objective, insuredCapital, monthlyPremium, term, description: monthlyPremium === 0 ? "Cortesia." : undefined, brokerNote: "Caso demonstrativo Rafael.", displayOrder: index + 1 }))));
const closing: ClosingRecord = { ...metadata("00000000-0000-4000-8000-000000000080"), clientId, planningCycleId: historicalPlanningId, proposalVersionId: historicalProposalId, closedAt: "2026-09-18T12:00:00.000Z", suggestedReviewAt: "2027-09-18" };
const events: PlanningEvent[] = [
  [historicalPlanningId, "planning_created", "Planejamento histórico demonstrativo criado.", createdAt], [historicalPlanningId, "diagnostic_completed", "Diagnóstico histórico concluído.", "2026-09-18T10:30:00.000Z"], [historicalPlanningId, "proposal_presented", "Proposta v1 apresentada.", "2026-09-18T11:00:00.000Z"], [historicalPlanningId, "proposal_accepted", "Proposta v1 aceita.", "2026-09-18T12:00:00.000Z"], [historicalPlanningId, "planning_closed", "Planejamento encerrado com histórico preservado.", "2026-09-18T12:00:00.000Z"], [metisPlanningId, "planning_created", "Contexto pré-Metis criado para demonstração.", "2026-09-24T10:00:00.000Z"], [metisPlanningId, "diagnostic_completed", "Diagnóstico demonstrativo concluído e pronto para análise.", "2026-09-24T10:30:00.000Z"], [metisPlanningId, "proposal_created", "Proposta v1 em rascunho criada para revisão.", "2026-09-24T10:40:00.000Z"],
].map(([planningCycleId, type, description, occurredAt], index) => ({ ...metadata(`00000000-0000-4000-8000-00000000009${index}`), clientId, planningCycleId: String(planningCycleId), type: type as PlanningEvent["type"], description: String(description), occurredAt: String(occurredAt) }));
const history: PipelineHistory = { ...metadata("00000000-0000-4000-8000-000000000100"), clientId, toStage: "closed", changedAt: "2026-09-18T12:00:00.000Z", reason: "Proposta aceita no caso demonstrativo.", eventType: "closed" };
const snapshotBase = (id: string, type: ReportSnapshot["type"], payload: Record<string, unknown>, proposalVersionId?: string): ReportSnapshot => ({ ...metadata(id), clientId, planningCycleId: historicalPlanningId, proposalVersionId, type, generatedAt: "2026-09-18T12:15:00.000Z", templateVersion: type === "commercial_proposal" ? "spec-04-v1" : "spec-06-v1", payload });
const reports: ReportSnapshot[] = [
  snapshotBase("00000000-0000-4000-8000-000000000110", "diagnostic_client", { brand: settings, client: { id: clientId, name: "Rafael" }, planning: { id: historicalPlanningId, name: historicalPlanning.name, referenceDate: historicalPlanning.referenceDate }, diagnostic: declaredData, analysis: null, mode: "client", generatedAt: "2026-09-18T12:15:00.000Z", templateVersion: "spec-06-v1" }),
  snapshotBase("00000000-0000-4000-8000-000000000111", "diagnostic_internal", { brand: settings, client: { id: clientId, name: "Rafael" }, planning: { id: historicalPlanningId, name: historicalPlanning.name, referenceDate: historicalPlanning.referenceDate }, diagnostic: declaredData, analysis, mode: "internal", generatedAt: "2026-09-18T12:16:00.000Z", templateVersion: "spec-06-v1" }),
  snapshotBase("00000000-0000-4000-8000-000000000112", "commercial_proposal", { brand: { origin: "templateStatic", value: settings }, client: { origin: "clientProvided", value: { id: clientId, name: "Rafael", status: "active" } }, planning: { origin: "clientProvided", value: historicalPlanning }, diagnosis: { origin: "clientProvided", value: declaredData }, analysis: { origin: "brokerAnalysis", value: analysis }, proposal: { origin: "brokerAnalysis", value: historicalProposal }, coverages: { origin: "brokerAnalysis", value: coverages.filter((item) => item.proposalVersionId === historicalProposalId) }, generated: { origin: "templateStatic", value: { generatedAt: "2026-09-18T12:17:00.000Z", templateVersion: "spec-04-v1" } } }, historicalProposalId),
];

const seed = () => ({ tenants: [tenant], settings: [settings], leads: [], clients: [rafael], householdMembers: [], diagnostics, planningCycles: [historicalPlanning, metisPlanning], planningEvents: events, brokerAnalyses: [analysis], insurers: [insurer], insuranceProducts: [product], coverageTypes, tasks: [] as Task[], pipelineHistory: [history], proposalVersions: [historicalProposal, metisProposal], coverages, closings: [closing], aiAnalyses: [] as AiAnalysis[], reportSnapshots: reports });

export async function initializeDemo() {
  if (!isDemoMode()) return false;
  const databaseName = demoDatabaseName();
  if (!databaseName) return false;
  selectDatabase(databaseName);
  const existing = await import("@/application/foundation-service").then(({ getFoundation }) => getFoundation());
  if (!existing.tenant) await replaceDatabaseContents(seed());
  return true;
}

export async function resetDemo() {
  if (!isDemoMode()) throw new Error("O reset está disponível somente no ambiente de demonstração.");
  const databaseName = demoDatabaseName();
  if (!databaseName) throw new Error("Não foi possível identificar a sessão de demonstração.");
  selectDatabase(databaseName);
  await replaceDatabaseContents(seed());
}

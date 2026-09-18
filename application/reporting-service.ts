"use client";

import { ensureCrmDemoData, listPipeline, STAGE_LABEL, type PipelineCard } from "@/application/crm-service";
import { ensurePlanningDemo } from "@/application/planning-service";
import { getFoundation } from "@/application/foundation-service";
import type { BrandSettings, BrokerAnalysis, Client, ClosingRecord, Coverage, Diagnostic, PipelineHistory, PipelineStage, PlanningCycle, PlanningEvent, ProposalVersion, ReportDataOrigin, ReportSnapshot } from "@/domains/core/entities";
import { PIPELINE_STAGES } from "@/domains/core/entities";
import { timestamps } from "@/domains/shared/entity";
import { getRepositoryProvider } from "@/repositories/providers";

const provider = () => getRepositoryProvider();
const moneyValue = (value: unknown) => Number(value) || 0;
const DAY = 86400000;
const monthKey = (value: string) => value.slice(0, 7);
const monthLabel = (value: string) => new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${value}-01T12:00:00Z`)).replace(".", "");
const stageOrder: PipelineStage[] = ["new", "form", "calculation", "in_progress", "ready", "presented", "waiting", "closed", "lost"];
export type ReportBlock<T = unknown> = { origin: ReportDataOrigin; value: T };
export type CommercialReportPayload = {
  brand: ReportBlock<Pick<BrandSettings, "clientName" | "logoUrl" | "primaryColor" | "highlightColor" | "phone" | "email" | "address">>;
  client: ReportBlock<Pick<Client, "id" | "name" | "email" | "phone" | "profession" | "status">>;
  planning: ReportBlock<Pick<PlanningCycle, "id" | "name" | "type" | "referenceDate" | "observation">>;
  diagnosis: ReportBlock<Record<string, unknown>>;
  analysis: ReportBlock<Pick<BrokerAnalysis, "summary" | "priorities" | "recommendations" | "estimatedNeed" | "timeframe"> | null>;
  proposal: ReportBlock<Pick<ProposalVersion, "id" | "number" | "status" | "generalNote" | "totalMonthly" | "totalAnnual" | "totalProtectedCapital" | "incomeCommitment" | "presentedAt">>;
  coverages: ReportBlock<Array<Pick<Coverage, "label" | "objective" | "insuredCapital" | "term" | "monthlyPremium" | "description">>>;
  generated: ReportBlock<{ generatedAt: string; templateVersion: string }>;
};

async function tenantId() {
  const foundation = await getFoundation();
  if (!foundation.tenant) throw new Error("A corretora ainda não foi configurada.");
  return foundation.tenant.id;
}

function startOfPeriod(months: number) {
  const date = new Date();
  date.setUTCDate(1); date.setUTCHours(0, 0, 0, 0); date.setUTCMonth(date.getUTCMonth() - (months - 1));
  return date.toISOString();
}

function averageDays(items: Array<{ start: string; end?: string }>) {
  const values = items.filter((item) => item.end).map((item) => (new Date(item.end!).getTime() - new Date(item.start).getTime()) / DAY).filter((value) => value >= 0);
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
}

export async function ensureReportingDemoData() {
  const foundation = await getFoundation();
  if (!foundation.tenant) return;
  await ensureCrmDemoData(); await ensurePlanningDemo();
  const p = provider(); const histories = await p.pipelineHistory.list(foundation.tenant.id);
  if (histories.some((item) => item.reason === "Histórico demonstrativo SPEC 04")) return;
  const cards = await listPipeline(); const now = new Date();
  for (const [index, card] of cards.slice(0, 7).entries()) {
    const stages = stageOrder.slice(0, Math.max(1, stageOrder.indexOf(card.stage) + 1));
    for (const [stageIndex, toStage] of stages.entries()) {
      const changed = new Date(now); changed.setUTCMonth(changed.getUTCMonth() - Math.min(5, index + stageIndex)); changed.setUTCDate(Math.max(1, 4 + index * 3 + stageIndex));
      await p.pipelineHistory.create({ ...timestamps(), tenantId: foundation.tenant.id, leadId: card.kind === "lead" ? card.id : undefined, clientId: card.kind === "client" ? card.id : undefined, fromStage: stageIndex ? stages[stageIndex - 1] : undefined, toStage, changedAt: changed.toISOString(), eventType: stageIndex ? "moved" : "created", reason: "Histórico demonstrativo SPEC 04" });
    }
  }
}

export type BrokerDashboard = {
  cards: PipelineCard[];
  counts: Record<PipelineStage, number>;
  metrics: { key: string; label: string; value: number; suffix?: string; stage?: PipelineStage; records: { id: string; label: string; detail: string; href: string }[]; detail: string }[];
  funnel: { stage: PipelineStage; label: string; count: number; topPercent: number }[];
  aging: { label: string; count: number; cards: PipelineCard[]; urgent: boolean }[];
  evolution: { month: string; label: string; leads: number; proposals: number; closings: number; monthlyPremium: number; protectedCapital: number }[];
};

export async function brokerDashboard(months = 6): Promise<BrokerDashboard> {
  await ensureReportingDemoData();
  const id = await tenantId(); const p = provider();
  const [cards, clients, histories, diagnostics, cycles, proposals, closings] = await Promise.all([listPipeline(), p.clients.list(id), p.pipelineHistory.list(id), p.diagnostics.list(id), p.planningCycles.list(id), p.proposalVersions.list(id), p.closings.list(id)]);
  const since = startOfPeriod(months); const inPeriod = (date?: string) => Boolean(date && date >= since);
  const counts = Object.fromEntries(PIPELINE_STAGES.map((stage) => [stage, cards.filter((card) => card.stage === stage).length])) as Record<PipelineStage, number>;
  const clientById = new Map(clients.map((client) => [client.id, client])); const cycleById = new Map(cycles.map((cycle) => [cycle.id, cycle])); const proposalById = new Map(proposals.map((proposal) => [proposal.id, proposal]));
  const validClosings = closings.flatMap((closing) => { const proposal = proposalById.get(closing.proposalVersionId); const client = clientById.get(closing.clientId); const cycle = cycleById.get(closing.planningCycleId); return proposal && client && cycle && proposal.status === "accepted" && proposal.clientId === closing.clientId && proposal.planningCycleId === closing.planningCycleId ? [{ closing, proposal, client, cycle }] : []; });
  const closedInPeriod = validClosings.filter(({ closing }) => inPeriod(closing.closedAt)); const closingRecords = (items: typeof validClosings) => items.map(({ closing, proposal, client }) => ({ id: closing.id, label: client.name, detail: `Proposta v${proposal.number} · ${proposal.totalMonthly.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/mês`, href: `/clientes/${client.id}` }));
  const cardRecords = (items: PipelineCard[]) => items.map((card) => ({ id: card.id, label: card.name, detail: STAGE_LABEL[card.stage], href: `/kanban?stage=${card.stage}` }));
  const clientRecords = (ids: string[], detail: string) => [...new Set(ids)].flatMap((clientId) => { const client = clientById.get(clientId); return client ? [{ id: clientId, label: client.name, detail, href: `/clientes/${clientId}` }] : []; });
  const top = Math.max(1, counts.new + counts.form + counts.calculation + counts.in_progress + counts.ready + counts.presented + counts.waiting + counts.closed + counts.lost);
  const clientCycle = (clientId: string) => cycles.filter((cycle) => cycle.clientId === clientId).sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  const metrics = [
    { key: "new", label: "Leads novos", value: cards.filter((card) => card.kind === "lead" && inPeriod(card.createdAt)).length, stage: "new" as PipelineStage, records: cardRecords(cards.filter((card) => card.kind === "lead" && inPeriod(card.createdAt))), detail: "Criados no período" },
    { key: "diagnostics", label: "Diagnósticos concluídos", value: diagnostics.filter((item) => item.status === "completed" && inPeriod(item.completedAt)).length, records: clientRecords(diagnostics.filter((item) => item.status === "completed" && inPeriod(item.completedAt)).map((item) => item.clientId), "Diagnóstico concluído"), detail: "Concluídos no período" },
    ...(["calculation", "in_progress", "ready", "presented", "waiting", "closed", "lost"] as PipelineStage[]).map((stage) => ({ key: stage, label: STAGE_LABEL[stage], value: counts[stage], stage, records: cardRecords(cards.filter((card) => card.stage === stage)), detail: "Registros atuais nesta etapa" })),
    { key: "conversion", label: "Taxa de conversão", value: Math.round((validClosings.length / top) * 100), suffix: "%", records: closingRecords(validClosings), detail: "Fechamentos válidos em relação à carteira atual" },
    { key: "proposal-time", label: "Tempo até proposta", value: averageDays(proposals.filter((proposal, index, list) => list.findIndex((item) => item.planningCycleId === proposal.planningCycleId) === index).map((proposal) => ({ start: cycleById.get(proposal.planningCycleId)?.startedAt ?? proposal.createdAt, end: proposal.createdAt }))) ?? 0, suffix: " dias", records: clientRecords(proposals.map((proposal) => proposal.clientId), "Possui proposta criada"), detail: "Média entre planejamento e primeira proposta" },
    { key: "closing-time", label: "Tempo até fechamento", value: averageDays(closedInPeriod.map(({ closing }) => ({ start: clientCycle(closing.clientId)?.startedAt ?? closing.createdAt, end: closing.closedAt }))) ?? 0, suffix: " dias", records: closingRecords(closedInPeriod), detail: "Média dos fechamentos válidos no período" },
    { key: "premium", label: "Prêmio mensal contratado", value: closedInPeriod.reduce((sum, item) => sum + item.proposal.totalMonthly, 0), suffix: " BRL", records: closingRecords(closedInPeriod), detail: "Fechamentos válidos que compõem o valor" },
    { key: "capital", label: "Capital total protegido", value: closedInPeriod.reduce((sum, item) => sum + item.proposal.totalProtectedCapital, 0), suffix: " BRL", records: closingRecords(closedInPeriod), detail: "Fechamentos válidos que compõem o valor" },
    { key: "ticket", label: "Ticket médio de prêmio", value: closedInPeriod.length ? Math.round(closedInPeriod.reduce((sum, item) => sum + item.proposal.totalMonthly, 0) / closedInPeriod.length) : 0, suffix: " BRL", records: closingRecords(closedInPeriod), detail: "Média dos fechamentos válidos no período" },
    { key: "portfolio", label: "Carteira ativa", value: new Set(validClosings.filter(({ client }) => client.status === "active").map(({ client }) => client.id)).size, records: closingRecords(validClosings.filter(({ client }) => client.status === "active")), detail: "Clientes ativos com fechamento válido" },
  ];
  const funnel = stageOrder.map((stage) => ({ stage, label: STAGE_LABEL[stage], count: counts[stage], topPercent: Math.round((counts[stage] / top) * 100) }));
  const ageOf = (card: PipelineCard) => Math.floor((Date.now() - new Date(card.updatedAt).getTime()) / DAY);
  const buckets = [["0 a 3 dias", 0, 3, false], ["4 a 7 dias", 4, 7, false], ["8 a 14 dias", 8, 14, true], ["Acima de 14 dias", 15, Infinity, true]] as const;
  const aging = buckets.map(([label, min, max, urgent]) => ({ label, urgent, cards: cards.filter((card) => ageOf(card) >= min && ageOf(card) <= max && card.stage !== "closed" && card.stage !== "lost"), count: cards.filter((card) => ageOf(card) >= min && ageOf(card) <= max && card.stage !== "closed" && card.stage !== "lost").length }));
  const monthKeys = Array.from({ length: months }, (_, index) => { const date = new Date(); date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() - (months - 1 - index)); return date.toISOString().slice(0, 7); });
  const evolution = monthKeys.map((month) => { const monthlyClosings = validClosings.filter(({ closing }) => monthKey(closing.closedAt) === month); const monthlyProposals = proposals.filter((item) => monthKey(item.createdAt) === month); return { month, label: monthLabel(month), leads: histories.filter((item) => item.eventType === "created" && item.leadId && monthKey(item.changedAt) === month).length, proposals: monthlyProposals.length, closings: monthlyClosings.length, monthlyPremium: monthlyClosings.reduce((sum, item) => sum + item.proposal.totalMonthly, 0), protectedCapital: monthlyClosings.reduce((sum, item) => sum + item.proposal.totalProtectedCapital, 0) }; });
  return { cards, counts, metrics, funnel, aging, evolution };
}

export async function clientDashboard(clientId: string) {
  const id = await tenantId(); const p = provider();
  const [client, cycles, diagnostics, analyses, proposals, coverages, closings, events, histories, snapshots] = await Promise.all([p.clients.findById(clientId), p.planningCycles.list(id), p.diagnostics.list(id), p.brokerAnalyses.list(id), p.proposalVersions.list(id), p.coverages.list(id), p.closings.list(id), p.planningEvents.list(id), p.pipelineHistory.list(id), p.reportSnapshots.list(id)]);
  if (!client) return null;
  const clientCycles = cycles.filter((item) => item.clientId === clientId).sort((a, b) => b.referenceDate.localeCompare(a.referenceDate)); const current = clientCycles.find((item) => item.status !== "closed") ?? clientCycles[0] ?? null;
  const diagnostic = current ? diagnostics.find((item) => item.planningCycleId === current.id) ?? null : null; const analysis = current ? analyses.find((item) => item.planningCycleId === current.id) ?? null : null;
  const clientProposals = proposals.filter((item) => item.clientId === clientId).sort((a, b) => b.number - a.number); const presented = clientProposals.filter((item) => item.presentedAt).sort((a, b) => (b.presentedAt ?? "").localeCompare(a.presentedAt ?? ""))[0] ?? null; const closing = closings.filter((item) => item.clientId === clientId).sort((a, b) => b.closedAt.localeCompare(a.closedAt))[0] ?? null; const accepted = closing ? clientProposals.find((item) => item.id === closing.proposalVersionId && item.status === "accepted") ?? null : null;
  const chosen = accepted ?? presented; const chosenCoverages = chosen ? coverages.filter((item) => item.proposalVersionId === chosen.id) : [];
  const declared = diagnostic?.declaredData ?? {}; const eventRows = events.filter((item) => item.clientId === clientId).map((item) => ({ at: item.occurredAt, label: item.description, kind: "Planejamento" })).concat(histories.filter((item) => item.clientId === clientId).map((item) => ({ at: item.changedAt, label: `Kanban: ${STAGE_LABEL[item.toStage]}`, kind: "CRM" }))).sort((a, b) => b.at.localeCompare(a.at));
  return { client, current, diagnostic, analysis, proposals: clientProposals, presented, accepted, closing, coverages: chosenCoverages, snapshots: snapshots.filter((item) => item.clientId === clientId), timeline: eventRows, finance: { familyIncome: moneyValue(declared.familyIncome), monthlyExpense: moneyValue(declared.monthlyExpense), assets: String(declared.assets ?? "Não informado"), reserves: String(declared.reserves ?? "Não informado"), debts: String(declared.debts ?? "Não informado"), commitment: chosen?.incomeCommitment ?? 0 }, protection: { monthly: chosen?.totalMonthly ?? 0, annual: chosen?.totalAnnual ?? 0, capital: chosen?.totalProtectedCapital ?? 0, coverages: chosenCoverages, objectives: chosenCoverages.map((item) => item.objective).filter(Boolean) } };
}

export async function ensureCommercialReportSnapshot(proposalVersionId: string) {
  const id = await tenantId(); const p = provider(); const existing = (await p.reportSnapshots.list(id)).find((item) => item.proposalVersionId === proposalVersionId && item.type === "commercial_proposal"); if (existing) return existing;
  const [proposal, foundation] = await Promise.all([p.proposalVersions.findById(proposalVersionId), getFoundation()]); if (!proposal || !foundation.settings) throw new Error("Não foi possível localizar os dados da proposta para apresentação.");
  const [client, cycle, diagnostics, analyses, coverages] = await Promise.all([p.clients.findById(proposal.clientId), p.planningCycles.findById(proposal.planningCycleId), p.diagnostics.list(id), p.brokerAnalyses.list(id), p.coverages.list(id)]);
  if (!client || !cycle) throw new Error("Cliente ou planejamento não encontrado.");
  const diagnostic = diagnostics.find((item) => item.planningCycleId === cycle.id); const analysis = analyses.find((item) => item.planningCycleId === cycle.id) ?? null; const generatedAt = new Date().toISOString();
  const payload: CommercialReportPayload = { brand: { origin: "templateStatic", value: foundation.settings }, client: { origin: "clientProvided", value: { id: client.id, name: client.name, email: client.email, phone: client.phone, profession: client.profession, status: client.status } }, planning: { origin: "clientProvided", value: { id: cycle.id, name: cycle.name, type: cycle.type, referenceDate: cycle.referenceDate, observation: cycle.observation } }, diagnosis: { origin: "clientProvided", value: diagnostic?.declaredData ?? {} }, analysis: { origin: "brokerAnalysis", value: analysis ? { summary: analysis.summary, priorities: analysis.priorities, recommendations: analysis.recommendations, estimatedNeed: analysis.estimatedNeed, timeframe: analysis.timeframe } : null }, proposal: { origin: "brokerAnalysis", value: { id: proposal.id, number: proposal.number, status: proposal.status, generalNote: proposal.generalNote, totalMonthly: proposal.totalMonthly, totalAnnual: proposal.totalAnnual, totalProtectedCapital: proposal.totalProtectedCapital, incomeCommitment: proposal.incomeCommitment, presentedAt: proposal.presentedAt } }, coverages: { origin: "brokerAnalysis", value: coverages.filter((item) => item.proposalVersionId === proposal.id).map((item) => ({ label: item.label, objective: item.objective, insuredCapital: item.insuredCapital, term: item.term, monthlyPremium: item.monthlyPremium, description: item.description })) }, generated: { origin: "templateStatic", value: { generatedAt, templateVersion: "spec-04-v1" } } };
  const snapshot: ReportSnapshot = { ...timestamps(), tenantId: id, clientId: client.id, planningCycleId: cycle.id, proposalVersionId, type: "commercial_proposal", generatedAt, templateVersion: "spec-04-v1", payload: payload as unknown as Record<string, unknown> };
  return p.reportSnapshots.create(snapshot);
}

export async function commercialReport(proposalVersionId: string): Promise<{ snapshot: ReportSnapshot; report: CommercialReportPayload }> {
  const snapshot = await ensureCommercialReportSnapshot(proposalVersionId);
  return { snapshot, report: snapshot.payload as unknown as CommercialReportPayload };
}

"use client";

import { sanitizeAegisPayload, type SanitizedAegisContext } from "@/application/aegis-sanitizer";
import { fakeAegisProvider, selectAegisProvider, type AegisAiProvider } from "@/application/aegis-providers";
import { validateAegisResult } from "@/application/aegis-schema";
import { getFoundation } from "@/application/foundation-service";
import type { AegisAnalysisType, AiAnalysis, ProposalVersion } from "@/domains/core/entities";
import { timestamps } from "@/domains/shared/entity";
import { getRepositoryProvider } from "@/repositories/providers";

const provider = () => getRepositoryProvider();
const stable = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  return JSON.stringify(value);
};
const fingerprint = (value: unknown) => {
  let hash = 2166136261;
  for (const character of stable(value)) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return `fnv1a-${(hash >>> 0).toString(16)}`;
};

async function currentContext(clientId: string, analysisType: AegisAnalysisType, proposalVersionId?: string) {
  const foundation = await getFoundation();
  if (!foundation.tenant) throw new Error("Configure a corretora antes de usar a Aegis.");
  const p = provider(); const tenantId = foundation.tenant.id;
  const [client, cycles, diagnostics, analyses, proposals, coverages] = await Promise.all([p.clients.findById(clientId), p.planningCycles.list(tenantId), p.diagnostics.list(tenantId), p.brokerAnalyses.list(tenantId), p.proposalVersions.list(tenantId), p.coverages.list(tenantId)]);
  if (!client) throw new Error("Cliente não encontrado.");
  const cycle = cycles.filter((item) => item.clientId === clientId).sort((a, b) => b.referenceDate.localeCompare(a.referenceDate))[0];
  if (!cycle) throw new Error("Crie um planejamento antes de usar a Aegis.");
  const diagnostic = diagnostics.find((item) => item.planningCycleId === cycle.id);
  if (!diagnostic) throw new Error("O planejamento ainda não possui diagnóstico.");
  const brokerAnalysis = analyses.find((item) => item.planningCycleId === cycle.id) ?? null;
  const candidate = proposalVersionId ? proposals.find((item) => item.id === proposalVersionId) : proposals.filter((item) => item.planningCycleId === cycle.id).sort((a, b) => b.number - a.number)[0];
  if (analysisType === "proposal_review" && !candidate) throw new Error("Crie uma proposta antes de solicitar a revisão da Aegis.");
  const context = sanitizeAegisPayload({ analysisType, diagnostic, birthDate: client.birthDate, brokerAnalysis, proposal: candidate, coverages: candidate ? coverages.filter((item) => item.proposalVersionId === candidate.id) : [] });
  return { tenantId, cycle, proposal: candidate, context };
}

export async function analyzeWithAegis(clientId: string, analysisType: AegisAnalysisType, proposalVersionId?: string, aiProvider: AegisAiProvider = selectAegisProvider()) {
  if (process.env.NEXT_PUBLIC_AEGIS_ENABLED === "false") throw new Error("A Aegis está desabilitada para esta corretora.");
  const { tenantId, cycle, proposal, context } = await currentContext(clientId, analysisType, proposalVersionId);
  const inputFingerprint = fingerprint(context); const p = provider();
  try {
    const structuredResult = validateAegisResult(await aiProvider.analyze(context));
    const saved: AiAnalysis = { ...timestamps(), tenantId, clientId, planningCycleId: cycle.id, proposalVersionId: proposal?.id, analysisType, inputFingerprint, provider: aiProvider.name, model: aiProvider.model, status: "complete", structuredResult };
    return await p.aiAnalyses.create(saved);
  } catch (reason) {
    const failed: AiAnalysis = { ...timestamps(), tenantId, clientId, planningCycleId: cycle.id, proposalVersionId: proposal?.id, analysisType, inputFingerprint, provider: aiProvider.name, model: aiProvider.model, status: "failed", errorMessage: reason instanceof Error ? reason.message : "Falha ao processar a Aegis." };
    await p.aiAnalyses.create(failed);
    throw reason;
  }
}

export async function listAegisAnalyses(clientId: string) {
  const foundation = await getFoundation();
  if (!foundation.tenant) return [];
  return (await provider().aiAnalyses.list(foundation.tenant.id)).filter((item) => item.clientId === clientId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function ensureAegisDemo(clientId: string) {
  const current = await listAegisAnalyses(clientId);
  const p = provider(); const foundation = await getFoundation();
  if (!foundation.tenant) return;
  const proposals = (await p.proposalVersions.list(foundation.tenant.id)).filter((item) => item.clientId === clientId).sort((a, b) => a.number - b.number);
  const actions: Array<{ type: AegisAnalysisType; proposalVersionId?: string }> = [
    { type: "diagnostic" },
    { type: "meeting_questions" },
    { type: "proposal_review", proposalVersionId: proposals.find((item) => item.number === 1)?.id },
  ];
  for (const action of actions) {
    const exists = current.some((item) => item.status === "complete" && item.analysisType === action.type && (action.type !== "proposal_review" || item.proposalVersionId === action.proposalVersionId));
    if (!exists) await analyzeWithAegis(clientId, action.type, action.proposalVersionId, fakeProviderForDemo);
  }
}

const fakeProviderForDemo = fakeAegisProvider;

export async function sanitizedAegisContext(clientId: string, analysisType: AegisAnalysisType, proposalVersionId?: string): Promise<SanitizedAegisContext> {
  return (await currentContext(clientId, analysisType, proposalVersionId)).context;
}

export function hasPersonalIdentifiers(payload: SanitizedAegisContext) {
  const serialized = stable(payload).toLowerCase();
  return ["cpf", "email", "telefone", "endereço", "endereco", "apólice", "apolice", "clientid", "planningcycleid"].some((term) => serialized.includes(term));
}

export type AegisUsage = { diagnostic: number; proposal_review: number; meeting_questions: number };
export async function aegisUsage(): Promise<AegisUsage> {
  const foundation = await getFoundation(); const empty: AegisUsage = { diagnostic: 0, proposal_review: 0, meeting_questions: 0 };
  if (!foundation.tenant) return empty;
  return (await provider().aiAnalyses.list(foundation.tenant.id)).filter((item) => item.status === "complete").reduce((total, item) => ({ ...total, [item.analysisType]: total[item.analysisType] + 1 }), empty);
}

export const proposalForAegis = (proposal?: ProposalVersion) => proposal?.id;

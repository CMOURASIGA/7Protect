import type { MetisAnalysisType, BrokerAnalysis, Coverage, Diagnostic, MetisSanitizationEvidence, ProposalVersion } from "@/domains/core/entities";

export type SanitizedMetisContext = {
  analysisType: MetisAnalysisType;
  diagnosis: {
    age?: number;
    family?: string;
    income?: number;
    expenses?: number;
    assets?: string;
    reserves?: string;
    debts?: string;
    pensions?: string;
    existingInsurance?: string;
    goals?: string;
    healthRelevant?: string;
  };
  brokerAnalysis?: Pick<BrokerAnalysis, "summary" | "priorities" | "hypotheses" | "estimatedNeed" | "timeframe" | "recommendations" | "pendingQuestions">;
  proposal?: { number: number; totalMonthly: number; totalAnnual: number; totalProtectedCapital: number; incomeCommitment: number; coverages: Array<Pick<Coverage, "label" | "objective" | "insuredCapital" | "term" | "monthlyPremium" | "description">> };
};

const text = (value: unknown) => typeof value === "string" ? value.trim() || undefined : undefined;
const numeric = (value: unknown) => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : undefined;
const ageFromBirthDate = (value: unknown) => {
  const birth = text(value);
  if (!birth) return undefined;
  const date = new Date(birth);
  if (Number.isNaN(date.valueOf())) return undefined;
  const now = new Date();
  return now.getFullYear() - date.getFullYear() - (now < new Date(now.getFullYear(), date.getMonth(), date.getDate()) ? 1 : 0);
};

export function sanitizeMetisPayload(input: { analysisType: MetisAnalysisType; diagnostic: Diagnostic; birthDate?: string; brokerAnalysis: BrokerAnalysis | null; proposal?: ProposalVersion; coverages?: Coverage[] }): SanitizedMetisContext {
  const data = input.diagnostic.declaredData;
  const diagnosis = {
    age: ageFromBirthDate(input.birthDate),
    family: text(data.family),
    income: numeric(data.familyIncome),
    expenses: numeric(data.monthlyExpense),
    assets: text(data.assets),
    reserves: text(data.reserves),
    debts: text(data.debts),
    pensions: text(data.pensions),
    existingInsurance: text(data.existingInsurance),
    goals: text(data.goals),
    healthRelevant: input.analysisType === "diagnostic" ? text(data.health) : undefined,
  };
  const brokerAnalysis = input.brokerAnalysis ? {
    summary: input.brokerAnalysis.summary,
    priorities: input.brokerAnalysis.priorities,
    hypotheses: input.brokerAnalysis.hypotheses,
    estimatedNeed: input.brokerAnalysis.estimatedNeed,
    timeframe: input.brokerAnalysis.timeframe,
    recommendations: input.brokerAnalysis.recommendations,
    pendingQuestions: input.brokerAnalysis.pendingQuestions,
  } : undefined;
  const proposal = input.proposal ? {
    number: input.proposal.number,
    totalMonthly: input.proposal.totalMonthly,
    totalAnnual: input.proposal.totalAnnual,
    totalProtectedCapital: input.proposal.totalProtectedCapital,
    incomeCommitment: input.proposal.incomeCommitment,
    coverages: (input.coverages ?? []).map(({ label, objective, insuredCapital, term, monthlyPremium, description }) => ({ label, objective, insuredCapital, term, monthlyPremium, description })),
  } : undefined;
  return { analysisType: input.analysisType, diagnosis, brokerAnalysis, proposal };
}

export function sanitizationEvidence(context: SanitizedMetisContext): MetisSanitizationEvidence {
  const sentSections = ["analysisType", "diagnosis"];
  if (context.brokerAnalysis) sentSections.push("brokerAnalysis");
  if (context.proposal) sentSections.push("proposal", "proposal.coverages");
  return {
    version: "metis-context-v2",
    sentSections,
    excludedCategories: ["nome", "cpf", "telefone", "e-mail", "endereço", "apólice", "ids internos", "tenantId"],
    healthIncluded: Boolean(context.diagnosis.healthRelevant),
  };
}

const allowedDiagnosisKeys = new Set(["age", "family", "income", "expenses", "assets", "reserves", "debts", "pensions", "existingInsurance", "goals", "healthRelevant"]);
const allowedBrokerKeys = new Set(["summary", "priorities", "hypotheses", "estimatedNeed", "timeframe", "recommendations", "pendingQuestions"]);
const allowedProposalKeys = new Set(["number", "totalMonthly", "totalAnnual", "totalProtectedCapital", "incomeCommitment", "coverages"]);
const allowedCoverageKeys = new Set(["label", "objective", "insuredCapital", "term", "monthlyPremium", "description"]);
const hasOnlyAllowedKeys = (value: Record<string, unknown>, allowed: Set<string>) => Object.keys(value).every((key) => allowed.has(key));

export function isSanitizedMetisContext(value: unknown): value is SanitizedMetisContext {
  if (!value || typeof value !== "object") return false;
  const context = value as Record<string, unknown>;
  if (!Object.keys(context).every((key) => ["analysisType", "diagnosis", "brokerAnalysis", "proposal"].includes(key))) return false;
  if (!["diagnostic", "proposal_review", "meeting_questions"].includes(String(context.analysisType))) return false;
  if (!context.diagnosis || typeof context.diagnosis !== "object" || !hasOnlyAllowedKeys(context.diagnosis as Record<string, unknown>, allowedDiagnosisKeys)) return false;
  if (context.brokerAnalysis !== undefined && (!context.brokerAnalysis || typeof context.brokerAnalysis !== "object" || !hasOnlyAllowedKeys(context.brokerAnalysis as Record<string, unknown>, allowedBrokerKeys))) return false;
  if (context.proposal !== undefined) {
    if (!context.proposal || typeof context.proposal !== "object" || !hasOnlyAllowedKeys(context.proposal as Record<string, unknown>, allowedProposalKeys)) return false;
    const coverages = (context.proposal as Record<string, unknown>).coverages;
    if (!Array.isArray(coverages) || !coverages.every((coverage) => coverage && typeof coverage === "object" && hasOnlyAllowedKeys(coverage as Record<string, unknown>, allowedCoverageKeys))) return false;
  }
  return true;
}

export const sanitizedPayloadPreview = (input: SanitizedMetisContext) => JSON.stringify(input, null, 2);

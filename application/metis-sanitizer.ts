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
const knownNonPersonPhrases = new Set(["ensino médio", "doenças graves", "vida total", "proteção financeira"]);
const likelyPersonName = /\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+){1,3}\b/g;

/**
 * Diagnostic and broker notes are free text. They can contain identifiers even
 * when those fields are not part of the context schema, so remove them before
 * the context ever reaches the provider boundary.
 */
const redactFreeText = (value: unknown) => {
  const raw = text(value);
  if (!raw) return undefined;
  return raw
    .replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, "[e-mail removido]")
    .replace(/\b\d{3}\.\d{3}\.\d{3}-?\d{2}\b/g, "[CPF removido]")
    .replace(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\d{4}[-\s]?\d{4}\b/g, "[telefone removido]")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, "[id removido]")
    .replace(/\b(?:rua|avenida|av\.?|travessa|alameda|estrada)\s+[^,;\n]+/gi, "[endereço removido]")
    .replace(/\b(?:apólice|apolice)\s*(?:n[ºo.]?\s*)?[\w-]+/gi, "[apólice removida]")
    .replace(likelyPersonName, (match) => knownNonPersonPhrases.has(match.toLocaleLowerCase("pt-BR")) ? match : "[pessoa citada]")
    .trim() || undefined;
};
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
    family: redactFreeText(data.family),
    income: numeric(data.familyIncome),
    expenses: numeric(data.monthlyExpense),
    assets: redactFreeText(data.assets),
    reserves: redactFreeText(data.reserves),
    debts: redactFreeText(data.debts),
    pensions: redactFreeText(data.pensions),
    existingInsurance: redactFreeText(data.existingInsurance),
    goals: redactFreeText(data.goals),
    healthRelevant: input.analysisType === "diagnostic" ? redactFreeText(data.health) : undefined,
  };
  const brokerAnalysis = input.brokerAnalysis ? {
    summary: redactFreeText(input.brokerAnalysis.summary),
    priorities: redactFreeText(input.brokerAnalysis.priorities),
    hypotheses: redactFreeText(input.brokerAnalysis.hypotheses),
    estimatedNeed: input.brokerAnalysis.estimatedNeed,
    timeframe: redactFreeText(input.brokerAnalysis.timeframe),
    recommendations: redactFreeText(input.brokerAnalysis.recommendations),
    pendingQuestions: redactFreeText(input.brokerAnalysis.pendingQuestions),
  } : undefined;
  const proposal = input.proposal ? {
    number: input.proposal.number,
    totalMonthly: input.proposal.totalMonthly,
    totalAnnual: input.proposal.totalAnnual,
    totalProtectedCapital: input.proposal.totalProtectedCapital,
    incomeCommitment: input.proposal.incomeCommitment,
    coverages: (input.coverages ?? []).map(({ label, objective, insuredCapital, term, monthlyPremium, description }) => ({ label, objective: redactFreeText(objective), insuredCapital, term, monthlyPremium, description: redactFreeText(description) })),
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
const containsDirectIdentifier = (value: string) => /\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b|\b\d{3}\.\d{3}\.\d{3}-?\d{2}\b|(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\d{4}[-\s]?\d{4}\b|\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b|\b(?:rua|avenida|av\.?|travessa|alameda|estrada)\s+/i.test(value);
const textValues = (value: unknown): string[] => value && typeof value === "object" ? Object.values(value as Record<string, unknown>).filter((item): item is string => typeof item === "string") : [];

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
  // This protects the server boundary if a caller bypasses sanitizeMetisPayload.
  const sensitiveText = [...textValues(context.diagnosis), ...textValues(context.brokerAnalysis), ...((context.proposal as Record<string, unknown> | undefined)?.coverages as Array<Record<string, unknown>> | undefined ?? []).flatMap((coverage) => [String(coverage.objective ?? ""), String(coverage.description ?? "")])];
  if (sensitiveText.some(containsDirectIdentifier)) return false;
  return true;
}

export const sanitizedPayloadPreview = (input: SanitizedMetisContext) => JSON.stringify(input, null, 2);

import type { AegisAnalysisType, AegisStructuredResult } from "@/domains/core/entities";
import type { SanitizedAegisContext } from "@/application/aegis-sanitizer";
import { validateAegisResult } from "@/application/aegis-schema";

export interface AegisAiProvider { name: string; model: string; analyze(context: SanitizedAegisContext): Promise<AegisStructuredResult>; }

const disclaimer = "Conteúdo de apoio produzido por IA. Revise os fatos, as inferências e a adequação da proposta antes de qualquer orientação ao cliente. A Aegis não garante aceitação de seguro nem substitui a decisão profissional da corretora.";
const missing = (context: SanitizedAegisContext) => [
  !context.diagnosis.income && "Renda familiar não informada.",
  !context.diagnosis.expenses && "Despesas mensais não informadas.",
  !context.diagnosis.goals && "Objetivos e prioridades não informados.",
  !context.diagnosis.existingInsurance && "Seguros existentes não informados.",
].filter(Boolean) as string[];

export const fakeAegisProvider: AegisAiProvider = {
  name: "fake", model: "aegis-demo-1",
  async analyze(context) {
    if (process.env.NEXT_PUBLIC_AEGIS_SIMULATE_FAILURE === "true") throw new Error("Falha simulada da Aegis. Nenhum dado foi alterado.");
    const incomplete = missing(context);
    const base: AegisStructuredResult = {
      summary: context.diagnosis.family ? `Perfil familiar registrado: ${context.diagnosis.family}` : "Perfil financeiro em consolidação.",
      attentionPoints: [context.diagnosis.debts ? "Há dívidas ou compromissos a considerar na continuidade da renda." : "Confirme compromissos financeiros antes de definir prioridades.", context.diagnosis.existingInsurance ? "Compare as proteções existentes com os objetivos declarados." : "Mapeie as proteções existentes antes de concluir a análise."],
      protectionTopics: ["Continuidade de renda e manutenção do padrão de vida.", "Coberturas compatíveis com os objetivos declarados, sujeitas à análise da corretora."],
      questions: ["Qual compromisso financeiro teria maior impacto para a família em uma ausência de renda?", "Quais objetivos familiares precisam de proteção prioritária nesta fase?"],
      missingInformation: incomplete,
      disclaimer,
    };
    if (context.analysisType === "meeting_questions") base.questions = [...base.questions, "Houve mudança recente em renda, despesas, patrimônio ou dependentes?"];
    if (context.analysisType === "proposal_review") base.proposalReview = {
      alignedItems: context.proposal?.coverages.map((coverage) => `${coverage.label}: finalidade registrada para revisão.`) ?? [],
      reviewItems: ["Confirme se o capital segurado atende aos objetivos sem tratá-lo como rendimento.", ...(incomplete.length ? ["Existem informações incompletas que limitam a aderência da proposta."] : [])],
    };
    return base;
  },
};

export const failingAegisProvider: AegisAiProvider = { name: "fake", model: "aegis-demo-1", async analyze() { throw new Error("Falha simulada da Aegis. Nenhum dado foi alterado."); } };

export const openAiAegisProvider: AegisAiProvider = {
  name: "openai", model: "gpt-4.1-mini",
  async analyze(context) {
    const response = await fetch("/api/aegis", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ context }) });
    const body = await response.json() as { result?: unknown; error?: string; model?: string };
    if (!response.ok) throw new Error(body.error ?? "A Aegis não pôde concluir a análise.");
    const result = validateAegisResult(body.result);
    if (body.model) this.model = body.model;
    return result;
  },
};

export function selectAegisProvider(): AegisAiProvider {
  return process.env.NEXT_PUBLIC_AEGIS_PROVIDER === "openai" ? openAiAegisProvider : fakeAegisProvider;
}

export const analysisLabel: Record<AegisAnalysisType, string> = { diagnostic: "Análise do diagnóstico", proposal_review: "Revisão da proposta", meeting_questions: "Perguntas para reunião" };

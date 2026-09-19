import type { MetisStructuredResult } from "@/domains/core/entities";

const strings = (value: unknown) => Array.isArray(value) && value.every((item) => typeof item === "string");

export function validateMetisResult(input: unknown): MetisStructuredResult {
  if (!input || typeof input !== "object") throw new Error("A Metis retornou uma resposta sem estrutura válida.");
  const value = input as Record<string, unknown>;
  if (typeof value.summary !== "string" || !strings(value.attentionPoints) || !strings(value.protectionTopics) || !strings(value.questions) || !strings(value.missingInformation) || typeof value.disclaimer !== "string") {
    throw new Error("A resposta da Metis não atende ao contrato estruturado.");
  }
  let proposalReview: MetisStructuredResult["proposalReview"];
  if (value.proposalReview !== undefined) {
    if (!value.proposalReview || typeof value.proposalReview !== "object") throw new Error("A revisão da proposta está inválida.");
    const review = value.proposalReview as Record<string, unknown>;
    if (!strings(review.alignedItems) || !strings(review.reviewItems)) throw new Error("A revisão da proposta está inválida.");
    proposalReview = { alignedItems: review.alignedItems, reviewItems: review.reviewItems };
  }
  return { summary: value.summary, attentionPoints: value.attentionPoints, protectionTopics: value.protectionTopics, questions: value.questions, missingInformation: value.missingInformation, proposalReview, disclaimer: value.disclaimer };
}

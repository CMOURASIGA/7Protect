import type { CommercialParameter, CommercialParameterGroup, ProspectQualification } from "@/domains/core/entities";
export const PARAMETER_LABELS: Record<CommercialParameterGroup, string> = {
  source: "Fonte de prospecção", income_band: "Faixa de renda mensal estimada", age_range: "Faixa etária", marital_status: "Estado civil", children: "Filhos", contact_frequency: "Frequência de contato no último ano", approach_ease: "Facilidade de abordagem", referral_potential: "Capacidade de gerar referências",
};
export const QUALIFICATION_FIELDS = [
  ["sourceId", "source"], ["incomeBandId", "income_band"], ["ageRangeId", "age_range"], ["maritalStatusId", "marital_status"], ["childrenId", "children"], ["contactFrequencyId", "contact_frequency"], ["approachEaseId", "approach_ease"], ["referralPotentialId", "referral_potential"],
] as const;
export function qualificationMissing(qualification?: ProspectQualification | null) {
  const missing: string[] = QUALIFICATION_FIELDS.filter(([field]) => !qualification?.[field]).map(([, group]) => PARAMETER_LABELS[group]);
  if (!qualification?.profession?.trim()) missing.push("Profissão");
  if (!originMonth(qualification?.originDate)) missing.push("Data de origem");
  return missing;
}
export function isValidQualification(qualification?: ProspectQualification | null) {
  return Boolean(qualification && !qualification.deletedAt && qualification.status === "qualified" && !qualificationMissing(qualification).length);
}
export function originMonth(date?: string) {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date.slice(0, 7) : null;
}
export function validateQualification(input: ProspectQualification, parameters: CommercialParameter[], previous?: ProspectQualification) {
  if (input.status === "qualified" && !input.deletedAt && qualificationMissing(input).length) throw new Error(`Complete a qualificação: ${qualificationMissing(input).join(", ")}.`);
  if (input.originDate && !originMonth(input.originDate)) throw new Error("Data de origem inválida.");
  if (input.estimatedMonthlyIncome !== undefined && (!Number.isFinite(input.estimatedMonthlyIncome) || input.estimatedMonthlyIncome < 0)) throw new Error("Renda estimada deve ser um valor maior ou igual a zero.");
  for (const [field, group] of QUALIFICATION_FIELDS) {
    const id = input[field]; if (!id) continue;
    const option = parameters.find((item) => item.id === id && item.tenantId === input.tenantId && item.group === group && !item.deletedAt);
    if (!option || (!option.active && previous?.[field] !== id)) throw new Error(`Selecione um parâmetro ativo para ${PARAMETER_LABELS[group]}.`);
  }
}

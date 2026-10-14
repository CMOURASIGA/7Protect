"use client";
import { getFoundation } from "./foundation-service";
import { commercialReportingContacts, INDICATOR_LABEL } from "./commercial-dashboard";
import { DEFAULT_ATTENTION_POLICY, operationalAttention, commercialWeekInterval, expectedWeeklyProduction } from "./commercial-attention";
import { commercialDateParts } from "./commercial-aggregations";
import { getRepositoryProvider } from "@/repositories/providers";
import type { CommercialActivity, CommercialAttentionPolicy, CommercialBenchmark, CommercialParameter, Contact, Hot40Membership, ProspectQualification } from "@/domains/core/entities";

export const COMMERCIAL_QUESTIONS = [
  ["today", "O que preciso fazer hoje?"],
  ["priority", "Quem devo priorizar?"],
  ["stalled", "Quais contatos estão parados?"],
  ["weekly_gap", "Onde estou abaixo da meta?"],
  ["bottleneck", "Qual é meu maior gargalo?"],
  ["contact_attention", "Por que este contato merece atenção?"],
  ["overdue", "Quais atividades estão atrasadas?"],
  ["weekly_performance", "Como está meu desempenho nesta semana?"],
] as const;
export type CommercialQuestion = (typeof COMMERCIAL_QUESTIONS)[number][0];
export function matchCommercialQuestion(text: string, contactContext = false): CommercialQuestion | null {
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  if (contactContext && /(?:esse|este|meu) contato|merece atencao/.test(normalized)) return "contact_attention";
  if (/gargalo|conversao/.test(normalized)) return "bottleneck";
  if (/atrasad|vencid/.test(normalized)) return "overdue";
  if (/parad|sem interacao/.test(normalized)) return "stalled";
  if (/abaixo da meta|abaixo do esperado|deficit|atraso na meta/.test(normalized)) return "weekly_gap";
  if (/desempenho|producao.*semana|semana.*producao/.test(normalized)) return "weekly_performance";
  if (/prioriz|prioridad/.test(normalized)) return "priority";
  if (/hoje|fazer agora/.test(normalized)) return "today";
  return null;
}
export type CommercialEvidence = { ref: string; source: string; label: string; href: string };
export type CommercialAnswerItem = { explanation: string; recommendation?: string; factRefs: string[]; action?: { label: string; href: string } };
export type CommercialAnswer = { questionType: CommercialQuestion; summary: string; asOf: string; scope: { year: number; month: number; week: 1 | 2 | 3 | 4 | 5; timezone: "America/Sao_Paulo" }; items: CommercialAnswerItem[]; evidence: CommercialEvidence[]; limitations: string[] };
export type CommercialMetisInput = { tenantId: string; now: string; contacts: Contact[]; qualifications: ProspectQualification[]; parameters: CommercialParameter[]; memberships: Hot40Membership[]; activities: CommercialActivity[]; benchmarks: CommercialBenchmark[]; policy?: CommercialAttentionPolicy };

// Read every source through repositories. Unlike commercialOverview/operationalOverview,
// a Metis question never reconciles memberships or notifications.
export async function readCommercialMetisInput(now = new Date().toISOString()): Promise<CommercialMetisInput> {
  const { tenant } = await getFoundation();
  if (!tenant) throw new Error("Configure a corretora antes de usar a Metis Comercial.");
  const p = getRepositoryProvider(); const id = tenant.id;
  const [contacts, qualifications, parameters, memberships, activities, benchmarks, policies] = await Promise.all([
    p.contacts.list(id), p.prospectQualifications.list(id), p.commercialParameters.list(id),
    p.hot40Memberships.list(id), p.commercialActivities.list(id), p.commercialBenchmarks.list(id), p.commercialAttentionPolicies.list(id),
  ]);
  return { tenantId: id, now, contacts, qualifications, parameters, memberships, activities, benchmarks, policy: policies[0] };
}

const integer = (value: number) => new Intl.NumberFormat("pt-BR").format(value);
const percent = (value: number) => `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value)}%`;
const date = (value: string) => new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

export function answerCommercialQuestion(input: CommercialMetisInput, question: CommercialQuestion, contactId?: string): CommercialAnswer {
  if (!COMMERCIAL_QUESTIONS.some(([key]) => key === question)) throw new Error("Pergunta não disponível na Metis Comercial.");
  const contacts = commercialReportingContacts(input.contacts.filter((item) => item.tenantId === input.tenantId && !item.deletedAt), input.qualifications.filter((item) => item.tenantId === input.tenantId && !item.deletedAt), input.parameters.filter((item) => item.tenantId === input.tenantId && !item.deletedAt));
  const projection = operationalAttention({ tenantId: input.tenantId, now: input.now, contacts, memberships: input.memberships, activities: input.activities, benchmarks: input.benchmarks, policy: input.policy ?? DEFAULT_ATTENTION_POLICY });
  const { year, month, week } = projection.currentPeriod;
  const answer: CommercialAnswer = { questionType: question, summary: "", asOf: input.now, scope: { year, month, week, timezone: "America/Sao_Paulo" }, items: [], evidence: [], limitations: [] };
  const add = (ref: string, source: string, label: string, href: string, explanation: string, recommendation?: string) => {
    answer.evidence.push({ ref, source, label, href });
    answer.items.push({ explanation, recommendation, factRefs: [ref], action: { label: recommendation || "Abrir", href } });
  };
  const agendaItem = (entry: (typeof projection.agenda.today)[number], label: string) => add(`activity:${entry.activity.id}`, "CommercialActivity", `${entry.contact.fullName} · ${date(entry.activity.scheduledAt!)}`, `/agenda?activity=${entry.activity.id}`, `${entry.contact.fullName}: ${INDICATOR_LABEL[entry.activity.type]}, ${label} ${date(entry.activity.scheduledAt!)}.`, "Abrir atividade");
  if (question === "today" || question === "overdue") {
    const entries = question === "today" ? projection.agenda.today : projection.agenda.overdue;
    entries.forEach((entry) => agendaItem(entry, question === "today" ? "agendada para" : "atrasada desde"));
    answer.summary = entries.length ? `${entries.length} atividade${entries.length === 1 ? "" : "s"} ${question === "today" ? "para hoje" : "atrasada(s)"}.` : question === "today" ? "Nenhuma atividade planejada para o restante de hoje." : "Nenhuma atividade atrasada.";
  } else if (question === "priority" || question === "contact_attention" || question === "stalled") {
    const selected = question === "contact_attention" ? contacts.find((item) => item.id === contactId && item.tenantId === input.tenantId && item.status === "active") : undefined;
    if (question === "contact_attention" && !selected) throw new Error("Contato não encontrado no contexto atual.");
    const causes = projection.attention.filter((cause) => question === "stalled" ? cause.type === "stalled" : question === "contact_attention" ? cause.contactId === selected!.id : true);
    causes.forEach((cause) => add(`cause:${cause.causeKey}`, cause.sourceType!, `${cause.title} · ${cause.type}`, cause.href, `${cause.title}: ${cause.message}${cause.dueAt ? ` Data relacionada: ${date(cause.dueAt)}.` : ""} Severidade: ${{ info: "Informação", attention: "Atenção", critical: "Crítico" }[cause.severity!]}.`, cause.action));
    answer.summary = causes.length ? question === "stalled" ? `${causes.length} contato(s) HOT40 parado(s).` : question === "contact_attention" ? `${selected!.fullName} tem ${causes.length} motivo(s) de atenção.` : `${causes.length} prioridade(s), na ordem da Central de atenção.` : question === "contact_attention" ? `${selected!.fullName} não possui motivo ativo na Central neste momento.` : "Nenhuma prioridade desse tipo agora.";
    if (question === "priority" && causes.length > 0) answer.limitations.push("A ordenação segue a Central de atenção. Ler uma notificação não elimina a causa.");
  } else if (question === "bottleneck") {
    const bottleneck = projection.report.bottleneck;
    if (bottleneck) {
      const href = `/?view=funnel&year=${year}&month=${month}`;
      add(`bottleneck:${bottleneck.period}:${bottleneck.type}`, "Dashboard/Funil", `${bottleneck.period} · ${INDICATOR_LABEL[bottleneck.type]}`, href, `${INDICATOR_LABEL[bottleneck.previousType]} → ${INDICATOR_LABEL[bottleneck.type]}: ${integer(bottleneck.converted)} de ${integer(bottleneck.denominator)} contatos, conversão ${percent(bottleneck.conversion)}.`, "Ver Funil");
      answer.summary = `Maior gargalo: ${INDICATOR_LABEL[bottleneck.type]}.`;
      if (bottleneck.denominator < (input.policy ?? DEFAULT_ATTENTION_POLICY).funnelMinimumContacts) answer.limitations.push("A base ainda é menor que o mínimo para gerar alerta na Central.");
    } else answer.summary = "Sem base para identificar um gargalo no Funil deste mês.";
  } else {
    const rows = projection.report.weekly[week - 1].indicators;
    const interval = commercialWeekInterval(year, month, commercialDateParts(input.now)!.day);
    const chosen = question === "weekly_gap" ? rows.filter((row) => row.target !== null && row.target > 0 && row.actual < expectedWeeklyProduction(row.target, Date.parse(input.now), interval.start, interval.end)) : rows;
    chosen.forEach((row) => {
      const expected = expectedWeeklyProduction(row.target, Date.parse(input.now), interval.start, interval.end);
      add(`weekly:${year}-${month}:${week}:${row.type}`, "Dashboard/CommercialActivity", `${INDICATOR_LABEL[row.type]} · Semana ${week}`, `/?view=week&year=${year}&month=${month}`, `${INDICATOR_LABEL[row.type]}: ${integer(row.actual)} realizado(s), meta ${row.target === null ? "não configurada" : integer(row.target)}, gap ${row.gap === null ? "sem base" : integer(row.gap)}${row.target !== null && row.target > 0 ? `, ${percent(row.attainment!)} de atingimento e ${integer(expected)} esperado(s) até agora` : ", atingimento Sem base"}.`, "Ver atividades e semana");
    });
    answer.summary = question === "weekly_gap" ? chosen.length ? `${chosen.length} indicador(es) abaixo da expectativa proporcional na Semana ${week}.` : `Nenhum indicador abaixo da expectativa proporcional na Semana ${week}.` : `Desempenho da Semana ${week} do mês ${String(month).padStart(2, "0")}/${year}.`;
    answer.limitations.push("Metas ausentes, legadas ou zero não geram alerta. A comparação usa a semana comercial atual sem filtro de consultor ou origem.");
  }
  return answer;
}

import type { CommercialActivity, CommercialAttentionPolicy, CommercialBenchmark, Contact, Hot40Membership, Notification } from "@/domains/core/entities";
import { activityDate, commercialDateParts, commercialMonthWeek } from "./commercial-aggregations";
import { commercialDashboard, INDICATOR_LABEL } from "./commercial-dashboard";

export type AttentionPolicy = Pick<CommercialAttentionPolicy, "stalledDays" | "criticalStalledDays" | "criticalOverdueHours" | "funnelMinimumContacts" | "funnelMaximumConversion">;
export const DEFAULT_ATTENTION_POLICY: AttentionPolicy = { stalledDays: 7, criticalStalledDays: 14, criticalOverdueHours: 48, funnelMinimumContacts: 5, funnelMaximumConversion: 50 };
export type AttentionCause = Pick<Notification, "tenantId" | "contactId" | "title" | "message" | "type" | "severity" | "sourceType" | "sourceId" | "occurrenceKey" | "causeKey"> & { dueAt?: string; priority: number; action: string; href: string };
export type AgendaEntry = { activity: CommercialActivity; contact: Contact; stage?: string; overdueMs: number };

// Convert a São Paulo local midnight to a UTC instant using the timezone's actual offset.
function zonedStart(year: number, month: number, day: number) {
  const probe = new Date(Date.UTC(year, month - 1, day, 12));
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(probe);
  const value = (name: string) => Number(parts.find((part) => part.type === name)?.value);
  const localAsUtc = Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"));
  return Date.UTC(year, month - 1, day) - (localAsUtc - probe.getTime());
}
export function commercialWeekInterval(year: number, month: number, day: number) {
  const week = commercialMonthWeek(day);
  const first = 1 + (week - 1) * 7;
  return { week, start: zonedStart(year, month, first), end: week === 5 ? zonedStart(year, month + 1, 1) : zonedStart(year, month, first + 7) };
}
export function expectedWeeklyProduction(target: number | null, now: number, start: number, end: number) {
  if (!target || target < 0 || end <= start) return 0;
  return Math.floor(target * Math.max(0, Math.min(end - start, now - start)) / (end - start));
}
export function operationalAttention(input: { tenantId: string; now: string; contacts: Contact[]; memberships: Hot40Membership[]; activities: CommercialActivity[]; benchmarks: CommercialBenchmark[]; policy?: AttentionPolicy }) {
  const { tenantId, now, benchmarks } = input;
  const time = Date.parse(now);
  if (Number.isNaN(time)) throw new Error("Data de referência inválida.");
  const policy = input.policy ?? DEFAULT_ATTENTION_POLICY;
  const today = commercialDateParts(now)!;
  const contacts = new Map(input.contacts.filter((item) => item.tenantId === tenantId && item.status === "active" && !item.deletedAt).map((item) => [item.id, item]));
  const activities = input.activities.filter((item) => item.tenantId === tenantId && !item.deletedAt && contacts.has(item.contactId));
  const members = input.memberships.filter((item) => item.tenantId === tenantId && !item.deletedAt && item.status === "active" && contacts.has(item.contactId) && contacts.get(item.contactId)?.commercialStage === "hot40");
  const planned = activities.filter((item) => item.status === "planned" && item.scheduledAt);
  const entries: AgendaEntry[] = planned.map((activity) => ({ activity, contact: contacts.get(activity.contactId)!, stage: members.find((member) => member.contactId === activity.contactId)?.stage, overdueMs: Math.max(0, time - Date.parse(activity.scheduledAt!)) }));
  const byDate = (a: AgendaEntry, b: AgendaEntry) => a.activity.scheduledAt!.localeCompare(b.activity.scheduledAt!);
  const overdue = entries.filter((entry) => Date.parse(entry.activity.scheduledAt!) < time).sort(byDate);
  const todayEntries = entries.filter((entry) => { const parts = commercialDateParts(entry.activity.scheduledAt)!; return Date.parse(entry.activity.scheduledAt!) >= time && parts.period === today.period && parts.day === today.day; }).sort(byDate);
  const upcoming = entries.filter((entry) => { const parts = commercialDateParts(entry.activity.scheduledAt)!; return parts.period > today.period || (parts.period === today.period && parts.day > today.day); }).sort(byDate);
  const noNext = members.filter((member) => !planned.some((item) => item.contactId === member.contactId && Date.parse(item.scheduledAt!) >= time));
  const causes: AttentionCause[] = [];
  const add = (cause: Omit<AttentionCause, "tenantId" | "causeKey">) => causes.push({ ...cause, tenantId, causeKey: `${tenantId}:${cause.type}:${cause.sourceType}:${cause.sourceId}:${cause.occurrenceKey}` });
  for (const entry of overdue) add({ contactId: entry.contact.id, type: "overdue", severity: entry.overdueMs >= policy.criticalOverdueHours * 3600000 ? "critical" : "attention", title: entry.contact.fullName, message: `${INDICATOR_LABEL[entry.activity.type]} atrasada desde ${new Date(entry.activity.scheduledAt!).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}.`, sourceType: "activity", sourceId: entry.activity.id, occurrenceKey: entry.activity.scheduledAt!, dueAt: entry.activity.scheduledAt, priority: 1, action: "Registrar realização ou reagendar", href: `/agenda?activity=${entry.activity.id}` });
  for (const entry of todayEntries) add({ contactId: entry.contact.id, type: "info", severity: "info", title: entry.contact.fullName, message: `${INDICATOR_LABEL[entry.activity.type]} hoje.`, sourceType: "activity", sourceId: entry.activity.id, occurrenceKey: entry.activity.scheduledAt!, dueAt: entry.activity.scheduledAt, priority: 2, action: "Abrir compromisso", href: `/agenda?activity=${entry.activity.id}` });
  for (const member of members) {
    const contact = contacts.get(member.contactId)!;
    const completed = activities.filter((item) => item.contactId === contact.id && item.status === "completed" && item.completedAt).sort((a, b) => b.completedAt!.localeCompare(a.completedAt!));
    const last = completed[0]?.completedAt || member.enteredAt;
    const days = (time - Date.parse(last)) / 86400000;
    if (days >= policy.stalledDays) add({ contactId: contact.id, type: "stalled", severity: days >= policy.criticalStalledDays ? "critical" : "attention", title: contact.fullName, message: `Sem interação realizada há ${Math.floor(days)} dias.`, sourceType: "membership", sourceId: member.id, occurrenceKey: "active", dueAt: last, priority: 3, action: "Abrir contato", href: `/hot40?contact=${contact.id}` });
  }
  for (const member of noNext) { const contact = contacts.get(member.contactId)!; add({ contactId: contact.id, type: "no_next_action", severity: "attention", title: contact.fullName, message: "HOT40 sem próxima ação planejada.", sourceType: "membership", sourceId: member.id, occurrenceKey: "active", priority: 4, action: "Planejar atividade", href: `/hot40?contact=${contact.id}&action=new` }); }
  const report = commercialDashboard(activities, [...contacts.values()], benchmarks.filter((item) => item.tenantId === tenantId), { year: today.year, month: today.month });
  const interval = commercialWeekInterval(today.year, today.month, today.day);
  for (const row of report.weekly[interval.week - 1].indicators) {
    const expected = expectedWeeklyProduction(row.target, time, interval.start, interval.end);
    if (row.target && expected > 0 && row.actual < expected) add({ type: "weekly_gap", severity: "attention", title: INDICATOR_LABEL[row.type], message: `${row.actual} realizadas, ${expected} esperadas até agora na Semana ${interval.week}.`, sourceType: "benchmark", sourceId: row.type, occurrenceKey: `${today.period}:${interval.week}`, priority: 5, action: "Ver visão semanal", href: "/?view=week" });
  }
  const bottleneck = report.bottleneck;
  if (bottleneck) {
    const previous = report.funnel[report.funnel.indexOf(bottleneck) - 1];
    if (previous.contacts >= policy.funnelMinimumContacts && bottleneck.conversion !== null && bottleneck.conversion < policy.funnelMaximumConversion) add({ type: "bottleneck", severity: "info", title: INDICATOR_LABEL[bottleneck.type], message: `Conversão de ${bottleneck.conversion.toFixed(1)}% com base em ${previous.contacts} contatos.`, sourceType: "funnel", sourceId: bottleneck.type, occurrenceKey: today.period, priority: 6, action: "Ver funil", href: "/?view=funnel" });
  }
  causes.sort((a, b) => a.priority - b.priority || ({ critical: 0, attention: 1, info: 2 }[a.severity!] - { critical: 0, attention: 1, info: 2 }[b.severity!]) || (a.dueAt || "").localeCompare(b.dueAt || "") || a.causeKey!.localeCompare(b.causeKey!));
  const overdueContacts = new Set(overdue.map((entry) => entry.contact.id));
  return { agenda: { overdue, today: todayEntries, upcoming, noNext: noNext.map((member) => ({ member, contact: contacts.get(member.contactId)! })) }, causes: causes.filter((item) => item.type !== "info"), attention: causes.filter((item) => item.type !== "no_next_action" || !item.contactId || !overdueContacts.has(item.contactId)), report };
}

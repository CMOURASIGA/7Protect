"use client";
import { getFoundation } from "./foundation-service";
import { commercialOverview, createCommercialActivity } from "./commercial-service";
import { commercialDateParts, commercialLocalDateTimeToIso } from "./commercial-aggregations";
import { isDemoMode } from "@/lib/demo-mode";
import { getRepositoryProvider } from "@/repositories/providers";
import { timestamps } from "@/domains/shared/entity";
import { DEFAULT_ATTENTION_POLICY, operationalAttention, type AttentionPolicy } from "@/application/commercial-attention";
import type { ActivityCycleEvent, Notification } from "@/domains/core/entities";

async function tenantId() { const { tenant } = await getFoundation(); if (!tenant) throw new Error("Configure a corretora."); return tenant.id; }
export async function operationalOverview(now = new Date().toISOString()) {
  const tenant = await tenantId(); const repository = getRepositoryProvider();
  const [data, policies, events] = await Promise.all([commercialOverview(), repository.commercialAttentionPolicies.list(tenant), repository.activityCycleEvents.list(tenant)]);
  const policy = policies[0] || DEFAULT_ATTENTION_POLICY;
  const projection = operationalAttention({ tenantId: tenant, now, contacts: data.contacts, memberships: data.memberships, activities: data.activities, benchmarks: data.benchmarks, policy });
  const desired: Notification[] = projection.causes.map((cause) => ({ ...timestamps(), tenantId: tenant, contactId: cause.contactId, type: cause.type, severity: cause.severity, title: cause.title, message: cause.message, status: "unread", sourceType: cause.sourceType, sourceId: cause.sourceId, occurrenceKey: cause.occurrenceKey, causeKey: cause.causeKey }));
  const notifications = await repository.notifications.reconcile(tenant, desired);
  return { ...projection, notifications, events, policy, data };
}
export async function transitionCommercialActivity(input: { activityId: string; expectedVersion: number; commandKey: string; action: ActivityCycleEvent["action"]; at?: string; reason?: string }) {
  const result = await getRepositoryProvider().commercialActivities.transition({ ...input, at: input.at ? commercialLocalDateTimeToIso(input.at) : undefined, tenantId: await tenantId() });
  await operationalOverview(); return result;
}
export async function markCommercialNotificationRead(id: string) { return getRepositoryProvider().notifications.markRead(await tenantId(), id); }
export async function saveAttentionPolicy(input: AttentionPolicy) {
  if (![input.stalledDays, input.criticalStalledDays, input.criticalOverdueHours, input.funnelMinimumContacts, input.funnelMaximumConversion].every((value) => Number.isSafeInteger(value) && value >= 0) || input.criticalStalledDays < input.stalledDays || input.stalledDays < 1 || input.funnelMinimumContacts < 1 || input.funnelMaximumConversion > 100) throw new Error("Política de atenção inválida.");
  const tenant = await tenantId(); const repository = getRepositoryProvider().commercialAttentionPolicies;
  const existing = (await repository.list(tenant))[0];
  return existing ? repository.update({ ...existing, ...input }) : repository.create({ ...timestamps(), tenantId: tenant, ...input });
}
export async function prepareOperationalDemo(now = new Date().toISOString()) {
  if (!isDemoMode()) throw new Error("Cenário disponível apenas na demonstração.");
  const data = await commercialOverview();
  const members = data.memberships.filter((item) => item.status === "active");
  if (members.length < 2) throw new Error("A demonstração precisa de dois contatos HOT40.");
  const parts = commercialDateParts(now)!;
  const day = (offset: number) => new Date(Date.UTC(parts.year, parts.month - 1, parts.day + offset)).toISOString().slice(0, 10);
  const scenarios = [
    { contactId: members[0].contactId, date: `${day(-2)}T10:00`, notes: "Validação SPEC 05: vencida" },
    { contactId: members[1].contactId, date: `${day(0)}T23:30`, notes: "Validação SPEC 05: hoje" },
    { contactId: members[1].contactId, date: `${day(2)}T10:00`, notes: "Validação SPEC 05: próxima" },
  ];
  for (const item of scenarios) if (!data.activities.some((activity) => activity.notes === item.notes)) await createCommercialActivity({ contactId: item.contactId, type: "ab_phone", status: "planned", scheduledAt: item.date, notes: item.notes });
  return operationalOverview(now);
}

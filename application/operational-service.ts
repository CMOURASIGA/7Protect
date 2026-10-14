"use client";
import { getFoundation } from "./foundation-service";
import { commercialOverview, createCommercialActivity, createCommercialContact, addToHot40 } from "./commercial-service";
import { saveProspectQualification } from "./market-base-service";
import { saveCommercialBenchmark } from "./commercial-benchmark-service";
import { commercialDateParts, commercialLocalDateTimeToIso } from "./commercial-aggregations";
import { isDemoMode } from "@/lib/demo-mode";
import { getRepositoryProvider } from "@/repositories/providers";
import { timestamps } from "@/domains/shared/entity";
import { DEFAULT_ATTENTION_POLICY, operationalAttention, type AttentionPolicy } from "@/application/commercial-attention";
import { commercialReportingContacts, INDICATOR_TYPES } from "@/application/commercial-dashboard";
import type { ActivityCycleEvent, Notification } from "@/domains/core/entities";
import { DEMO_SCENARIO_KEY, markCommercialDemoCreated } from "./commercial-demo-provenance";

async function tenantId() { const { tenant } = await getFoundation(); if (!tenant) throw new Error("Configure a corretora."); return tenant.id; }
export async function operationalOverview(now = new Date().toISOString()) {
  const tenant = await tenantId(); const repository = getRepositoryProvider();
  const [data, policies, events] = await Promise.all([commercialOverview(), repository.commercialAttentionPolicies.list(tenant), repository.activityCycleEvents.list(tenant)]);
  const policy = policies[0] || DEFAULT_ATTENTION_POLICY;
  const projection = operationalAttention({ tenantId: tenant, now, contacts: commercialReportingContacts(data.contacts, data.qualifications, data.parameters), memberships: data.memberships, activities: data.activities, benchmarks: data.benchmarks, policy });
  const desired: Notification[] = projection.causes.map((cause) => ({ ...timestamps(), tenantId: tenant, contactId: cause.contactId, type: cause.type, severity: cause.severity, title: cause.title, message: cause.message, status: "unread", sourceType: cause.sourceType, sourceId: cause.sourceId, occurrenceKey: cause.occurrenceKey, causeKey: cause.causeKey }));
  const notifications = await repository.notifications.reconcile(tenant, desired);
  return { ...projection, tenantId: tenant, notifications, events, policy, data };
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
  const createdContacts = new Set<string>();
  const data = await commercialOverview();
  const options = (group: string) => { const value = data.parameters.find((item) => item.group === group && item.active); if (!value) throw new Error(`Parâmetro ${group} não disponível.`); return value.id; };
  const demoContact = async (key: string, hot40: boolean) => {
    const email = `spec05-${key}@example.test`;
    let contact = data.contacts.find((item) => item.email === email && !item.deletedAt);
    if (contact && (contact as typeof contact & { demoScenarioKey?: string }).demoScenarioKey !== DEMO_SCENARIO_KEY) return contact; // Legacy or manually created record is never adopted for reset.
    const created = !contact;
    if (!contact) { contact = await createCommercialContact({ fullName: `Validação SPEC 05 - ${key}`, email, origin: "Demonstração", consultant: undefined, phone: undefined, notes: "Cenário independente da SPEC 05" }); createdContacts.add(contact.id); await markCommercialDemoCreated("contacts", contact.id, await tenantId()); }
    if (hot40) {
      const qualification = data.qualifications.find((item) => item.contactId === contact!.id && !item.deletedAt);
      if (qualification?.status !== "qualified") { const saved = await saveProspectQualification(contact.id, { status: "qualified", sourceId: options("source"), incomeBandId: options("income_band"), ageRangeId: options("age_range"), maritalStatusId: options("marital_status"), childrenId: options("children"), contactFrequencyId: options("contact_frequency"), approachEaseId: options("approach_ease"), referralPotentialId: options("referral_potential"), profession: "Validação", originDate: commercialDateParts(now)!.period + "-01" }); if (!qualification) await markCommercialDemoCreated("prospectQualifications", saved.id, await tenantId()); }
      const priorMember = data.memberships.find((item) => item.contactId === contact!.id && !item.deletedAt && item.status !== "removed");
      const member = await addToHot40(contact.id);
      if (!priorMember) { await markCommercialDemoCreated("hot40Memberships", member.id, await tenantId()); const event = (await getRepositoryProvider().hot40StageEvents.list(await tenantId())).find((item) => item.membershipId === member.id); if (event) await markCommercialDemoCreated("hot40StageEvents", event.id, await tenantId()); }
    }
    if (created) await markCommercialDemoCreated("contacts", contact.id, await tenantId());
    return contact;
  };
  const parts = commercialDateParts(now)!;
  const day = (offset: number) => new Date(Date.UTC(parts.year, parts.month - 1, parts.day + offset)).toISOString().slice(0, 10);
  const ensureActivity = async (contactId: string, key: string, type: "ab_phone" | "approach_scheduled", status: "planned" | "completed", date: string) => {
    const notes = `Validação SPEC 05: ${key}`;
    if (!(await getRepositoryProvider().commercialActivities.list(await tenantId())).some((item) => item.contactId === contactId && item.notes === notes)) { const activity = await createCommercialActivity({ contactId, type, status, [status === "planned" ? "scheduledAt" : "completedAt"]: date, notes }); await markCommercialDemoCreated("commercialActivities", activity.id, await tenantId()); }
  };
  const overdue = await demoContact("vencida", true);
  const today = await demoContact("hoje", true);
  const upcoming = await demoContact("futura", true);
  await demoContact("sem-proxima-acao", true);
  const stalled = await demoContact("parado", true);
  await ensureActivity(overdue.id, "vencida", "ab_phone", "planned", `${day(-2)}T10:00`);
  await ensureActivity(today.id, "hoje", "ab_phone", "planned", `${day(0)}T23:30`);
  await ensureActivity(upcoming.id, "futura", "ab_phone", "planned", `${day(2)}T10:00`);
  await ensureActivity(stalled.id, "parado-proxima", "ab_phone", "planned", `${day(2)}T11:00`);
  const repository = getRepositoryProvider();
  const membership = (await repository.hot40Memberships.list(await tenantId())).find((item) => item.contactId === stalled.id && item.status === "active");
  const policy = (await repository.commercialAttentionPolicies.list(await tenantId()))[0] || DEFAULT_ATTENTION_POLICY;
  if (membership && Date.parse(membership.enteredAt) > Date.parse(now) - policy.stalledDays * 86400000) { const updated = await repository.hot40Memberships.update({ ...membership, enteredAt: new Date(Date.parse(now) - Math.max(20, policy.criticalStalledDays + 1) * 86400000).toISOString() }); if (createdContacts.has(stalled.id)) { await markCommercialDemoCreated("hot40Memberships", updated.id, await tenantId()); await markCommercialDemoCreated("contacts", stalled.id, await tenantId()); } }
  // Five distinct Contacts establish a funnel denominator without creating ABPhone production.
  for (let index = 1; index <= 5; index++) {
    const contact = await demoContact(`funil-${index}`, false);
    await ensureActivity(contact.id, `funil-${parts.period}-${index}`, "approach_scheduled", "completed", now);
  }
  // Existing user benchmarks are never overwritten; configure an unassigned indicator.
  const fresh = await commercialOverview();
  const currentWeek = Math.min(5, Math.ceil(parts.day / 7));
  const configured = fresh.benchmarks.filter((item) => item.year === parts.year && item.month === parts.month && !item.deletedAt);
  const type = configured.some((item) => (item.weeklyTargets?.[currentWeek - 1] || 0) > 0) ? undefined : INDICATOR_TYPES.find((indicator) => !configured.some((item) => item.activityType === indicator));
  if (type) { const benchmark = await saveCommercialBenchmark({ year: parts.year, month: parts.month, activityType: type, weeklyTargets: ([1, 2, 3, 4, 5] as const).map((week) => week === currentWeek ? 10 : 0) as [number, number, number, number, number] }); await markCommercialDemoCreated("commercialBenchmarks", benchmark.id, await tenantId()); }
  return operationalOverview(now);
}

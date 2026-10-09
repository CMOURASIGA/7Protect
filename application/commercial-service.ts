"use client";
import { listCommercialBenchmarks } from "./commercial-benchmark-service";
import { listCommercialParameters } from "./commercial-parameters-service";
import { saveProspectQualification } from "./market-base-service";
import { getFoundation } from "@/application/foundation-service";
import { aggregateCommercialActivities } from "@/application/commercial-aggregations";
import { COMMERCIAL_ACTIVITY_TYPES } from "@/domains/core/entities";
import type { CommercialActivity, CommercialActivityStatus, CommercialActivityType, CommercialContactStage, Hot40Stage, Contact, Hot40Membership, ProspectQualification } from "@/domains/core/entities";
import { HOT40_STAGES } from "@/domains/core/entities";
import { assertHot40Qualified, assertActivityDate } from "@/domains/commercial/rules";
import { activityDate, commercialLocalDateTimeToIso } from "@/application/commercial-aggregations";
import { timestamps } from "@/domains/shared/entity";
import { getRepositoryProvider } from "@/repositories/providers";

const provider = () => getRepositoryProvider();
async function requireContact(contactId: string, tenantId: string) {
  const contact = await provider().contacts.findById(contactId);
  if (!contact || contact.deletedAt || contact.tenantId !== tenantId) throw new Error("Contato não encontrado no contexto atual.");
  return contact;
}
async function currentTenant() { const foundation = await getFoundation(); if (!foundation.tenant) throw new Error("Configure a corretora antes de usar o domínio comercial V2."); return foundation.tenant.id; }
const normalizedEmail = (value?: string) => value?.trim().toLocaleLowerCase() || "";
const normalizedPhone = (value?: string) => value?.replace(/\D/g, "") || "";
export const ACTIVITY_LABEL: Record<CommercialActivityType, string> = { ab_phone: "ABPhone - Ligação", approach_scheduled: "Abordagem Marcada", approach_completed: "Abordagem Realizada", closing_scheduled: "Fechamento Marcado", closing_completed: "Fechamento Realizado", proposal: "Proposta", recommendation: "Recomendação" };

export async function listCommercialContacts() { const tenantId = await currentTenant(); return (await provider().contacts.list(tenantId)).sort((a, b) => a.fullName.localeCompare(b.fullName)); }
export async function createCommercialContact(input: Pick<Contact, "fullName" | "email" | "phone" | "origin" | "consultant" | "notes">) {
  if (!input.fullName.trim()) throw new Error("Informe o nome do contato.");
  const tenantId = await currentTenant(); const contacts = await provider().contacts.list(tenantId); const email = normalizedEmail(input.email); const phone = normalizedPhone(input.phone);
  const duplicate = contacts.find((item) => (email && normalizedEmail(item.email) === email) || (phone && normalizedPhone(item.phone) === phone));
  if (duplicate) throw new Error("Já existe um contato com este e-mail ou telefone. Use o registro existente para manter a pessoa única.");
  const contact: Contact = { ...timestamps(), tenantId, fullName: input.fullName.trim(), email: input.email?.trim() || undefined, phone: input.phone?.trim() || undefined, origin: input.origin?.trim() || undefined, consultant: input.consultant?.trim() || undefined, notes: input.notes?.trim() || undefined, status: "active", commercialStage: "market_base" };
  return provider().contacts.create(contact);
}
export async function promoteCommercialContact(contactId: string, commercialStage: CommercialContactStage) {
  const tenantId = await currentTenant();
  const contact = await requireContact(contactId, tenantId);
  if (commercialStage === "hot40") assertHot40Qualified(contact, await provider().prospectQualifications.list(tenantId), tenantId);
  if (commercialStage === "client") {
    const memberships = await provider().hot40Memberships.list(tenantId);
    for (const membership of memberships.filter((item) => item.contactId === contactId && ["active", "paused"].includes(item.status))) {
      await provider().hot40Memberships.update({ ...membership, status: "converted" });
    }
  }
  return provider().contacts.update({ ...contact, commercialStage });
}
export async function listQualifications() { const tenantId = await currentTenant(); return provider().prospectQualifications.list(tenantId); }
export async function qualifyContact(contactId: string, status: ProspectQualification["status"], notes?: string) {
  const tenantId = await currentTenant();
  await requireContact(contactId, tenantId);
  const existing = (await provider().prospectQualifications.list(tenantId)).find((item) => item.contactId === contactId);
  const qualification: ProspectQualification = { ...(existing ?? timestamps()), tenantId, contactId, status, notes: notes?.trim() || undefined, qualifiedAt: status === "qualified" ? new Date().toISOString() : undefined };
  return existing ? provider().prospectQualifications.update(qualification) : provider().prospectQualifications.create(qualification);
}
export async function listHot40Memberships() { const tenantId = await currentTenant(); return provider().hot40Memberships.list(tenantId); }
export async function addToHot40(contactId: string, notes?: string) { const tenantId = await currentTenant(); const contact = await requireContact(contactId, tenantId); if (contact.commercialStage === "client") throw new Error("Este contato já é cliente."); assertHot40Qualified(contact, await provider().prospectQualifications.list(tenantId), tenantId); const existing = (await provider().hot40Memberships.list(tenantId)).find((item) => item.contactId === contactId && item.status !== "removed"); if (existing) return existing; const membership: Hot40Membership = { ...timestamps(), tenantId, contactId, enteredAt: new Date().toISOString(), status: "active", stage: "ab_phone", stageChangedAt: new Date().toISOString(), priority: "normal", notes: notes?.trim() || undefined }; const result = await provider().hot40Memberships.create(membership); return result; }
export async function moveHot40Stage(contactId: string, stage: Hot40Stage, notes?: string) {
  if (!HOT40_STAGES.includes(stage)) throw new Error("Etapa comercial inválida.");
  return provider().hot40StageEvents.move(contactId, await currentTenant(), stage, notes);
}
export async function listHot40StageEvents() { return provider().hot40StageEvents.list(await currentTenant()); }
export async function listCommercialActivities() { const tenantId = await currentTenant(); return (await provider().commercialActivities.list(tenantId)).sort((a, b) => (activityDate(b) ?? b.createdAt).localeCompare(activityDate(a) ?? a.createdAt)); }
export async function createCommercialActivity(input: { contactId: string; type: CommercialActivityType; status: CommercialActivityStatus; scheduledAt?: string; completedAt?: string; notes?: string }) { const tenantId = await currentTenant(); await requireContact(input.contactId, tenantId);
  if (input.status === "cancelled") throw new Error("Cancele uma atividade planejada existente.");
  if (!COMMERCIAL_ACTIVITY_TYPES.includes(input.type)) throw new Error("Tipo de atividade inválido.");
  if (!["planned", "completed", "cancelled"].includes(input.status)) throw new Error("Situação da atividade inválida.");
  assertActivityDate(input);
  if (input.status === "completed" && !input.completedAt) throw new Error("Informe a data de realização.");
  if (input.status === "planned" && !input.scheduledAt) throw new Error("Informe a data agendada.");
  for (const value of [input.scheduledAt, input.completedAt]) { if (value && Number.isNaN(new Date(value).getTime())) throw new Error("Data de atividade inválida."); }
  if (!input.scheduledAt && !input.completedAt) throw new Error("Informe a data da atividade. Semana, mês e ano são derivados automaticamente."); const activity: CommercialActivity = { ...timestamps(), tenantId, ...input, scheduledAt: input.scheduledAt ? commercialLocalDateTimeToIso(input.scheduledAt) : undefined, completedAt: input.completedAt ? commercialLocalDateTimeToIso(input.completedAt) : undefined, notes: input.notes?.trim() || undefined }; return provider().commercialActivities.create(activity); }
export async function commercialOverview() { await provider().hot40Memberships.reconcileQualification(await currentTenant()); const [contacts, qualifications, memberships, activities, stageEvents, goals, benchmarks, parameters, cycleEvents] = await Promise.all([listCommercialContacts(), listQualifications(), listHot40Memberships(), listCommercialActivities(), listHot40StageEvents(), currentTenant().then((tenantId) => provider().commercialGoals.list(tenantId)), listCommercialBenchmarks(), listCommercialParameters(), currentTenant().then((tenantId) => provider().activityCycleEvents.list(tenantId))]); const qualificationByContact = new Map(qualifications.map((item) => [item.contactId, item])); const parameterLabels = new Map(parameters.map((item) => [item.id, item.label]));
  return { contacts, qualifications, memberships, activities, stageEvents, goals, benchmarks, parameters, cycleEvents, activityAggregation: aggregateCommercialActivities(activities, contacts.map((contact) => ({ ...contact, origin: parameterLabels.get(qualificationByContact.get(contact.id)?.sourceId || "") || contact.origin }))) }; }
export async function ensureCommercialV2DemoData() { const tenantId = await currentTenant(); if ((await provider().contacts.list(tenantId)).length) return; const now = new Date(); const iso = (offset: number) => new Date(now.getTime() + offset * 86400000).toISOString(); const contacts = await Promise.all([{ fullName: "Ana Martins", email: "ana@example.test", phone: "11988880001", origin: "Indicação" }, { fullName: "Bruno Lima", email: "bruno@example.test", phone: "11988880002", origin: "Evento" }, { fullName: "Carla Souza", email: "carla@example.test", phone: "11988880003", origin: "Mercado base" }].map((input) => createCommercialContact(input)));
  const parameters = await listCommercialParameters();
  const option = (group: string) => parameters.find((item) => item.group === group)!.id;
  for (const contact of contacts.slice(0, 2)) await saveProspectQualification(contact.id, { status: "qualified", sourceId: option("source"), incomeBandId: option("income_band"), ageRangeId: option("age_range"), maritalStatusId: option("marital_status"), childrenId: option("children"), contactFrequencyId: option("contact_frequency"), approachEaseId: option("approach_ease"), referralPotentialId: option("referral_potential"), profession: "Profissional autônomo", originDate: now.toISOString().slice(0, 10) }); await addToHot40(contacts[0].id); await addToHot40(contacts[1].id); await createCommercialActivity({ contactId: contacts[0].id, type: "approach_completed", status: "completed", completedAt: iso(-2), notes: "Primeira abordagem registrada." }); await createCommercialActivity({ contactId: contacts[1].id, type: "ab_phone", status: "planned", scheduledAt: iso(2), notes: "Ligação de qualificação." }); await provider().commercialGoals.create({ ...timestamps(), tenantId, name: "Abordagens qualificadas do mês", target: 40, periodStart: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(), status: "active" });
}

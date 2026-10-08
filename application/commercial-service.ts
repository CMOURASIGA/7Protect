"use client";
import { getFoundation } from "@/application/foundation-service";
import { aggregateCommercialActivities } from "@/application/commercial-aggregations";
import { COMMERCIAL_ACTIVITY_TYPES } from "@/domains/core/entities";
import type { CommercialActivity, CommercialActivityStatus, CommercialActivityType, CommercialContactStage, Contact, Hot40Membership, ProspectQualification } from "@/domains/core/entities";
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
export async function addToHot40(contactId: string, notes?: string) { const tenantId = await currentTenant(); const contact = await requireContact(contactId, tenantId); if (contact.commercialStage === "client") throw new Error("Este contato já é cliente."); const existing = (await provider().hot40Memberships.list(tenantId)).find((item) => item.contactId === contactId && item.status !== "removed"); if (existing) return existing; const membership: Hot40Membership = { ...timestamps(), tenantId, contactId, enteredAt: new Date().toISOString(), status: "active", priority: "normal", notes: notes?.trim() || undefined }; const result = await provider().hot40Memberships.create(membership); await promoteCommercialContact(contactId, "hot40"); return result; }
export async function listCommercialActivities() { const tenantId = await currentTenant(); return (await provider().commercialActivities.list(tenantId)).sort((a, b) => (b.completedAt ?? b.scheduledAt ?? b.createdAt).localeCompare(a.completedAt ?? a.scheduledAt ?? a.createdAt)); }
export async function createCommercialActivity(input: { contactId: string; type: CommercialActivityType; status: CommercialActivityStatus; scheduledAt?: string; completedAt?: string; notes?: string }) { const tenantId = await currentTenant(); await requireContact(input.contactId, tenantId);
  if (!COMMERCIAL_ACTIVITY_TYPES.includes(input.type)) throw new Error("Tipo de atividade inválido.");
  if (!["planned", "completed", "cancelled"].includes(input.status)) throw new Error("Situação da atividade inválida.");
  if (input.status === "completed" && !input.completedAt) throw new Error("Informe a data de realização.");
  if (input.status === "planned" && !input.scheduledAt) throw new Error("Informe a data agendada.");
  for (const value of [input.scheduledAt, input.completedAt]) { if (value && Number.isNaN(new Date(value).getTime())) throw new Error("Data de atividade inválida."); }
  if (!input.scheduledAt && !input.completedAt) throw new Error("Informe a data da atividade. Semana, mês e ano são derivados automaticamente."); const activity: CommercialActivity = { ...timestamps(), tenantId, ...input, scheduledAt: input.scheduledAt ? new Date(input.scheduledAt).toISOString() : undefined, completedAt: input.completedAt ? new Date(input.completedAt).toISOString() : undefined, notes: input.notes?.trim() || undefined }; return provider().commercialActivities.create(activity); }
export async function commercialOverview() { const [contacts, qualifications, memberships, activities, goals] = await Promise.all([listCommercialContacts(), listQualifications(), listHot40Memberships(), listCommercialActivities(), currentTenant().then((tenantId) => provider().commercialGoals.list(tenantId))]); return { contacts, qualifications, memberships, activities, goals, activityAggregation: aggregateCommercialActivities(activities, contacts) }; }
export async function ensureCommercialV2DemoData() { const tenantId = await currentTenant(); if ((await provider().contacts.list(tenantId)).length) return; const now = new Date(); const iso = (offset: number) => new Date(now.getTime() + offset * 86400000).toISOString(); const contacts = await Promise.all([{ fullName: "Ana Martins", email: "ana@example.test", phone: "11988880001", origin: "Indicação" }, { fullName: "Bruno Lima", email: "bruno@example.test", phone: "11988880002", origin: "Evento" }, { fullName: "Carla Souza", email: "carla@example.test", phone: "11988880003", origin: "Mercado base" }].map((input) => createCommercialContact(input)));
  await qualifyContact(contacts[0].id, "qualified", "Perfil aderente ao processo comercial."); await qualifyContact(contacts[1].id, "qualified"); await addToHot40(contacts[0].id); await addToHot40(contacts[1].id); await createCommercialActivity({ contactId: contacts[0].id, type: "approach_completed", status: "completed", completedAt: iso(-2), notes: "Primeira abordagem registrada." }); await createCommercialActivity({ contactId: contacts[1].id, type: "ab_phone", status: "planned", scheduledAt: iso(2), notes: "Ligação de qualificação." }); await provider().commercialGoals.create({ ...timestamps(), tenantId, name: "Abordagens qualificadas do mês", target: 40, periodStart: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(), status: "active" });
}

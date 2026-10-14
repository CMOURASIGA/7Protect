"use client";
import type { Contact, ProspectQualification } from "@/domains/core/entities";
import { getFoundation } from "./foundation-service";
import { getRepositoryProvider } from "@/repositories/providers";
import { timestamps } from "@/domains/shared/entity";
import { listCommercialParameters } from "./commercial-parameters-service";
export type QualificationInput = Pick<ProspectQualification, "status" | "sourceId" | "incomeBandId" | "ageRangeId" | "maritalStatusId" | "childrenId" | "contactFrequencyId" | "approachEaseId" | "referralPotentialId" | "estimatedMonthlyIncome" | "profession" | "originDate" | "notes">;
async function requireContact(id: string) {
  const { tenant } = await getFoundation(); const person = await getRepositoryProvider().contacts.findById(id);
  if (!tenant || !person || person.tenantId !== tenant.id || person.deletedAt) throw new Error("Contato não encontrado."); return person;
}
export async function updateMarketContact(id: string, input: Pick<Contact, "fullName" | "email" | "phone" | "notes">) {
  const person = await requireContact(id);
  return getRepositoryProvider().contacts.update({ ...person, fullName: input.fullName.trim(), email: input.email?.trim() || undefined, phone: input.phone?.trim() || undefined, notes: input.notes?.trim() || undefined });
}
export async function saveProspectQualification(contactId: string, input: QualificationInput) {
  const person = await requireContact(contactId); const p = getRepositoryProvider(); await listCommercialParameters();
  const current = (await p.prospectQualifications.list(person.tenantId)).find((item) => item.contactId === contactId);
  const qualification: ProspectQualification = { ...(current ?? timestamps()), ...input, tenantId: person.tenantId, contactId, profession: input.profession?.trim(), notes: input.notes?.trim(), qualifiedAt: input.status === "qualified" ? new Date().toISOString() : undefined };
  return current ? p.prospectQualifications.update(qualification) : p.prospectQualifications.create(qualification);
}

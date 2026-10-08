import type { CommercialActivity, Contact, ProspectQualification } from "@/domains/core/entities";

export function assertHot40Qualified(contact: Contact | null | undefined, qualifications: ProspectQualification[], tenantId: string) {
  if (!contact || contact.deletedAt || contact.tenantId !== tenantId) throw new Error("Contato não encontrado no contexto atual.");
  if (!qualifications.some((item) => item.contactId === contact.id && item.tenantId === tenantId && !item.deletedAt && item.status === "qualified")) {
    throw new Error("Qualifique o contato antes de adicioná-lo ao HOT40.");
  }
}

export function assertActivityDate(activity: Pick<CommercialActivity, "status" | "scheduledAt" | "completedAt">) {
  if (activity.status === "planned" && (!activity.scheduledAt || activity.completedAt)) throw new Error("Atividade planejada exige Data agendada e não pode ter Data realizada.");
  if (activity.status === "completed" && !activity.completedAt) throw new Error("Informe a Data realizada.");
  if (!activity.scheduledAt && !activity.completedAt) throw new Error("Informe a data da atividade.");
  for (const value of [activity.scheduledAt, activity.completedAt]) {
    if (value && Number.isNaN(new Date(value).getTime())) throw new Error("Data de atividade inválida.");
  }
}

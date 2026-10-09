import type { CommercialActivity, Contact, ProspectQualification } from "@/domains/core/entities";

import { isValidQualification } from "./qualification";

export function assertHot40Qualified(contact: Contact | null | undefined, qualifications: ProspectQualification[], tenantId: string) {
  if (!contact || contact.deletedAt || contact.tenantId !== tenantId) throw new Error("Contato não encontrado no contexto atual.");
  if (!qualifications.some((item) => item.contactId === contact.id && item.tenantId === tenantId && isValidQualification(item))) {
    throw new Error("Qualifique o contato antes de adicioná-lo ao HOT40.");
  }
}

export function assertActivityDate(activity: Pick<CommercialActivity, "status" | "scheduledAt" | "completedAt">) {
  if (activity.status === "planned" && (!activity.scheduledAt || activity.completedAt)) throw new Error("Atividade planejada exige Data agendada e não pode ter Data realizada.");
  if (activity.status === "completed" && !activity.completedAt) throw new Error("Informe a Data realizada.");
  if (activity.status === "cancelled" && (!activity.scheduledAt || activity.completedAt)) throw new Error("Atividade cancelada preserva Data agendada e não possui Data realizada.");
  if (!activity.scheduledAt && !activity.completedAt) throw new Error("Informe a data da atividade.");
  for (const value of [activity.scheduledAt, activity.completedAt]) {
    if (value && Number.isNaN(new Date(value).getTime())) throw new Error("Data de atividade inválida.");
  }
}

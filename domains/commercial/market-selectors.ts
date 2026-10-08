import type { Contact, ProspectQualification, CommercialParameter } from "@/domains/core/entities";
import { isValidQualification, originMonth } from "./qualification";
export type MarketFilters = { search: string; qualification: string; stage: string; sourceId: string; originMonth: string };
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
export function qualificationState(item?: ProspectQualification) {
  return item?.status === "not_qualified" ? "not_qualified" : isValidQualification(item) ? "qualified" : "pending";
}
export function filterMarketContacts(contacts: Contact[], qualifications: ProspectQualification[], parameters: CommercialParameter[], filters: MarketFilters) {
  const byContact = new Map(qualifications.map((item) => [item.contactId, item]));
  const labels = new Map(parameters.map((item) => [item.id, item.label]));
  const search = normalize(filters.search.trim());
  return contacts.filter((contact) => {
    if (contact.deletedAt) return false;
    const q = byContact.get(contact.id);
    const haystack = normalize([contact.fullName, contact.email, contact.phone, q?.profession, labels.get(q?.sourceId || ""), contact.origin].filter(Boolean).join(" "));
    return (!search || haystack.includes(search) || (search.replace(/\D/g, "").length >= 3 && (contact.phone || "").replace(/\D/g, "").includes(search.replace(/\D/g, "")))) && (!filters.qualification || qualificationState(q) === filters.qualification) && (!filters.stage || contact.commercialStage === filters.stage) && (!filters.sourceId || q?.sourceId === filters.sourceId) && (!filters.originMonth || originMonth(q?.originDate) === filters.originMonth);
  }).sort((a, b) => a.fullName.localeCompare(b.fullName, "pt-BR"));
}

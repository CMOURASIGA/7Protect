import type { CommercialActivity, Contact } from "@/domains/core/entities";

export type CommercialDateParts = { day: number; week: number; weekYear: number; month: number; year: number; period: string };

// Commercial reporting uses the operation's calendar, independently of the device timezone.
export function commercialDateParts(value?: string): CommercialDateParts | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "numeric", day: "numeric" }).formatToParts(date);
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value);
  const year = part("year");
  const month = part("month");
  const utc = new Date(Date.UTC(year, month - 1, part("day")));
  utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7));
  const weekYear = utc.getUTCFullYear();
  const yearStart = new Date(Date.UTC(weekYear, 0, 1));
  const week = Math.ceil((((utc.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { day: part("day"), week, weekYear, month, year, period: `${year}-${String(month).padStart(2, "0")}` };
}

export function activityDate(activity: CommercialActivity) {
  return activity.status === "completed" ? activity.completedAt : activity.scheduledAt;
}

// The commercial month always has five slots: days 1-7, 8-14, 15-21, 22-28, 29-end.
// Keep this rule in the domain application layer for reporting, targets and future alerts.
export function commercialMonthWeek(day: number): 1 | 2 | 3 | 4 | 5 {
  if (!Number.isInteger(day) || day < 1 || day > 31) throw new Error("Dia comercial inválido.");
  return Math.min(5, Math.ceil(day / 7)) as 1 | 2 | 3 | 4 | 5;
}

export function commercialActivityMonthWeek(value?: string) {
  const parts = commercialDateParts(value);
  if (!parts) return null;
  return commercialMonthWeek(parts.day);
}
export function groupCommercialActivities(activities: CommercialActivity[], granularity: "week" | "month" | "year") {
  return activities.reduce<Record<string, CommercialActivity[]>>((groups, activity) => {
    if (activity.deletedAt) return groups;
    const parts = commercialDateParts(activityDate(activity));
    if (!parts) return groups;
    const key = granularity === "week" ? `${parts.weekYear}-W${String(parts.week).padStart(2, "0")}` : granularity === "month" ? parts.period : String(parts.year);
    (groups[key] ??= []).push(activity);
    return groups;
  }, {});
}

export function aggregateCommercialActivities(activities: CommercialActivity[], contacts: Contact[] = []) {
  const active = activities.filter((item) => !item.deletedAt);
  const contactById = new Map(contacts.filter((item) => !item.deletedAt).map((item) => [item.id, item]));
  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const byOrigin: Record<string, number> = {};
  const byConsultant: Record<string, number> = {};
  for (const activity of active) {
    byType[activity.type] = (byType[activity.type] ?? 0) + 1;
    byStatus[activity.status] = (byStatus[activity.status] ?? 0) + 1;
    const contact = contactById.get(activity.contactId);
    if (contact && contact.tenantId === activity.tenantId) {
      const origin = contact.origin || "Não informada";
      const consultant = contact.consultant || "Não informado";
      byOrigin[origin] = (byOrigin[origin] ?? 0) + 1;
      byConsultant[consultant] = (byConsultant[consultant] ?? 0) + 1;
    }
  }
  // Conversion counts distinct people, so repeated calls cannot inflate the denominator.
  const stageContacts = (type: CommercialActivity["type"]) => new Set(active.filter((item) => item.type === type && item.status === "completed").map((item) => `${item.tenantId}:${item.contactId}`));
  const transitions = [["ab_phone", "approach_completed"], ["approach_completed", "closing_completed"], ["closing_completed", "proposal"]] as const;
  const conversions = transitions.map(([from, to]) => {
    const source = stageContacts(from);
    const target = stageContacts(to);
    const converted = [...source].filter((id) => target.has(id)).length;
    return { from, to, base: source.size, converted, percentage: source.size ? converted / source.size * 100 : null };
  });
  return { total: active.length, byType, byStatus, byOrigin, byConsultant, byWeek: groupCommercialActivities(active, "week"), byMonth: groupCommercialActivities(active, "month"), byYear: groupCommercialActivities(active, "year"), conversions };
}

import { COMMERCIAL_ACTIVITY_TYPES } from "@/domains/core/entities";
import type { CommercialActivity, CommercialActivityType, CommercialBenchmark, Contact } from "@/domains/core/entities";
import { activityDate, commercialDateParts } from "./commercial-aggregations";

export const INDICATOR_TYPES: CommercialActivityType[] = [...COMMERCIAL_ACTIVITY_TYPES];
export const INDICATOR_LABEL: Record<CommercialActivityType, string> = { ab_phone: "ABPhone - Ligações", approach_scheduled: "Abordagens Marcadas", approach_completed: "Abordagens Realizadas", closing_scheduled: "Fechamentos Marcados", closing_completed: "Fechamentos Realizados", proposal: "Propostas", recommendation: "Recomendações" };
export type DashboardFilters = { year: number; month: number; consultant?: string; origin?: string };
export type IndicatorResult = { type: CommercialActivityType; actual: number; target: number | null; gap: number | null; attainment: number | null; activityIds: string[] };
export type FunnelStep = { type: CommercialActivityType; contacts: number; converted: number | null; conversion: number | null; contactIds: string[] };
export const attainment = (actual: number, target: number | null) => target === null || target === 0 ? null : actual / target * 100;

export function commercialDashboard(activities: CommercialActivity[], contacts: Contact[], benchmarks: CommercialBenchmark[], filters: DashboardFilters) {
  const monthKey = `${filters.year}-${String(filters.month).padStart(2, "0")}`;
  const contactMap = new Map(contacts.filter((item) => !item.deletedAt && (!filters.consultant || (item.consultant || "") === filters.consultant) && (!filters.origin || (item.origin || "") === filters.origin)).map((item) => [item.id, item]));
  const scheduledTypes = new Set<CommercialActivityType>(["approach_scheduled", "closing_scheduled"]);
  const rows = activities.filter((item) => !item.deletedAt && (item.status === "completed" || (item.status === "planned" && scheduledTypes.has(item.type))) && contactMap.get(item.contactId)?.tenantId === item.tenantId && commercialDateParts(activityDate(item))?.period === monthKey);
  // Benchmarks belong to the whole tenant. Filtered production has no comparable target yet.
  const configured = new Map(benchmarks.filter((item) => !item.deletedAt && !filters.consultant && !filters.origin && item.year === filters.year && item.month === filters.month).map((item) => [item.activityType, item]));
  const result = (source: CommercialActivity[], period: "weekly" | "monthly"): IndicatorResult[] => INDICATOR_TYPES.map((type) => {
    const related = source.filter((item) => item.type === type);
    const target = configured.get(type)?.[period === "weekly" ? "weeklyTarget" : "monthlyTarget"] ?? null;
    return { type, actual: related.length, target, gap: target === null ? null : related.length - target, attainment: attainment(related.length, target), activityIds: related.map((item) => item.id) };
  });
  const weeks = [...new Set(rows.map((item) => { const parts = commercialDateParts(activityDate(item))!; return `${parts.weekYear}-W${String(parts.week).padStart(2, "0")}`; }))];
  // Include weeks with no production so a zero result remains visible against a configured target.
  for (let day = 1; day <= new Date(filters.year, filters.month, 0).getDate(); day++) {
    const parts = commercialDateParts(new Date(Date.UTC(filters.year, filters.month - 1, day, 15)).toISOString())!;
    const key = `${parts.weekYear}-W${String(parts.week).padStart(2, "0")}`;
    if (!weeks.includes(key)) weeks.push(key);
  }
  weeks.sort();
  const weekly = weeks.map((key) => ({ key, indicators: result(rows.filter((item) => { const parts = commercialDateParts(activityDate(item))!; return `${parts.weekYear}-W${String(parts.week).padStart(2, "0")}` === key; }), "weekly") }));
  const funnel: FunnelStep[] = INDICATOR_TYPES.map((type, index) => {
    const ids = [...new Set(rows.filter((item) => item.type === type).map((item) => item.contactId))];
    const priorRows = index ? rows.filter((item) => item.type === INDICATOR_TYPES[index - 1]) : null;
    const prior = priorRows ? new Set(priorRows.map((item) => item.contactId)) : null;
    const converted = prior ? ids.filter((id) => rows.some((item) => item.type === type && item.contactId === id && priorRows!.some((previous) => previous.contactId === id && activityDate(previous)! <= activityDate(item)!))).length : null;
    return { type, contacts: ids.length, converted, conversion: prior && prior.size ? converted! / prior.size * 100 : null, contactIds: ids };
  });
  const measured = funnel.slice(1).filter((step) => step.conversion !== null);
  const bottleneck = measured.length ? measured.reduce((lowest, step) => step.conversion! < lowest.conversion! ? step : lowest) : null;
  return { monthKey, monthly: result(rows, "monthly"), weekly, funnel, bottleneck, completed: rows.filter((item) => item.status === "completed").length, planned: rows.filter((item) => item.status === "planned").length, contacts: new Set(rows.map((item) => item.contactId)).size, total: rows.length, activities: rows };
}
